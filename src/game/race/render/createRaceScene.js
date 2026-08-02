import * as THREE from 'three';

export const RACE_RENDERER_OPTIONS = Object.freeze({
  antialias: true,
  depth: true,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: false,
});

// Shipped-game render scale. Desktop raised 0.58 -> 0.85 (A3, 2026-07-02):
// the 0.58 cut chased a headless-instrument artifact; headed canonical
// captures on the reference hardware hold 144 FPS at 0.85 (worst sample
// 143.5, frameWorkMs ~1.3ms). Mobile untouched (no mobile instrument yet).
//
// AAA wave 6: these are no longer the number the game renders at, they are the
// STARTING RUNG of the ladder below. A fixed cut is wrong in both directions —
// it means a machine that could hold 60 at native resolution never gets to,
// and it means a phone that cannot hold 60 at 0.6 has no way to say so. See
// createAdaptiveRenderScale.
export const RACE_RENDER_SCALE = Object.freeze({
  desktop: 0.85,
  mobile: 0.6,
});

// The dpr floor fitRaceRendererToCanvas has always clamped to. Kept as a named
// constant so the adaptive controller resolves dpr through EXACTLY the same
// expression the fit routine does — if the two ever disagree the controller
// writes one pixel ratio, the next resize writes another, and the composer
// reallocates its buffers on every resize event forever.
export const RACE_MIN_DPR = 0.355;

// The resolution ladder. Rungs, not a continuous scalar, for two reasons:
//   1. every step reallocates the composer's HalfFloat input/output buffers,
//      the depth blit target and each pass's own targets (SMAA keeps two, the
//      bloom keeps a mip chain). A continuous controller would churn that
//      allocation set on every sample; a ladder can only ever produce six
//      distinct buffer sizes per tier, so the driver's allocator settles.
//   2. a rung is a thing you can name in telemetry and a critic can reproduce.
// Index START_RUNG is exactly today's shipped fixed value, so a device that
// never trips either threshold renders byte-identically to the wave-5 build.
export const RACE_SCALE_LADDER = Object.freeze({
  desktop: Object.freeze([0.62, 0.7, 0.78, 0.85, 0.92, 1]),
  mobile: Object.freeze([0.42, 0.5, 0.6, 0.68, 0.76, 0.85]),
});
const START_RUNG = Object.freeze({ desktop: 3, mobile: 2 });

// The SECOND lever, and it is deliberately the second one. Resolution costs
// sharpness, which every critic axis notices but no axis is ABOUT; emission
// costs the drift spray, the wash and the storm — i.e. the art direction the
// rubric scores on vfx and environment. So load is shed by softening the image
// until the ladder bottoms out, and only then by thinning the world. Recovery
// runs the other way round: the art comes back BEFORE the sharpness does.
const EMISSION_LADDER = Object.freeze([0.5, 0.7, 1]);

// The shared quality bus.
//
// Ownership note, because a module-level singleton is otherwise a smell: this
// package owns createRaceScene.js, racePostChain.js and raceParticles.js and
// NOT the monolith that wires them together, so there is no call site through
// which a measured tier could be plumbed from the post chain (which is the only
// one of the three that gets a per-frame dt AND the renderer) to the particle
// system (which is the only one that can act on it). Passing it through the
// monolith is the correct shape and is written up in the handoff; this is the
// shape that is available without editing a file this package does not own.
//
// It is safe as a singleton because exactly one race runs at a time (the React
// effect tears the previous one down before building the next) and because
// every field is an ADVISORY SCALAR — the worst outcome of a stale read is one
// frame emitted at the previous rung's rate.
//
// renderScale === null means "no adaptive controller is running", and that is
// the state the legacy ArcadeRace3D path and every automated capture stay in;
// consumers must fall back to their own fixed table when they see it.
export const raceQuality = {
  emissionScale: 1,
  managed: false,
  mobile: false,
  renderScale: null,
};

const percentile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * q)))];

const nearestRung = (ladder, value) => {
  let best = 0;
  for (let index = 1; index < ladder.length; index += 1) {
    if (Math.abs(ladder[index] - value) < Math.abs(ladder[best] - value)) best = index;
  }
  return best;
};

// Frames per evaluation window. 120 is ~1s at 120 Hz and ~2s at 60 Hz, which is
// long enough that a single GC pause cannot move the median and short enough
// that a real regression is answered inside two seconds.
const HISTORY_FRAMES = 120;
// Evaluate 4x/sec rather than per frame: the check sorts a 120-float copy, and
// doing that 120 times a second to answer a question whose input barely moved
// is exactly the kind of "adaptive quality" that costs more than it saves.
const EVALUATE_EVERY = 30;
// A change reallocates render targets, so the frame that follows one is always
// slow. Measuring it would feed the controller its own hitch.
const CHANGE_COOLDOWN_S = 1.25;
// Shader compiles and texture uploads run for the first seconds of a race — the
// wave-5 artefact critic measured PV programs climbing 47 -> 50 and textures
// 72 -> 80 INSIDE a single run. Without this gate the controller reads those
// compiles as sustained GPU load and crushes the resolution permanently on the
// strength of a transient that is over before the first lap ends.
const WARMUP_S = 2.5;
// A rung that failed is not retried for this long, and the wait DOUBLES every
// time the same rung fails again. Both halves matter, and the second half was
// found by simulation: with a flat memory, a device sitting exactly on a rung
// boundary steps up, misses, steps down, waits out the memory, and steps up
// again — forever. A 12s flat memory produced 13 buffer reallocations in 100
// simulated seconds on a device whose only crime was landing at 19ms. With the
// backoff the same device converges after three retries and then holds.
const FAIL_MEMORY_S = 12;
// Ceiling on the backoff. Longer than any single race, so a rung that has
// failed four times is effectively retired for the session — but not literally
// retired, because a device that has cooled down or a track that is cheaper
// than the last one deserves one more look.
const FAIL_MEMORY_MAX_S = 240;
// Shed below 56 fps, not below 60. ABSOLUTE and refresh-independent on purpose:
// tying the shed threshold to the display's own cadence would make the game
// chase 120 fps on a 120 Hz panel and cut resolution to get there, when 60 is
// the number the frame budget is written against.
const SHED_MS = 1000 / 56;
// Twice the deficit, twice the step. A device that lands at 35 fps does not
// need six seconds of one-rung descents to find its level.
const SHED_HARD_MS = SHED_MS * 1.5;
// How tight the window has to be before an up-step is allowed. See the
// derivation at the call site: this is a JITTER test, and only a vsync-locked
// frame passes it on real hardware.
const VBLANK_SLACK = 1.06;
// ...and only believe a locked frame on a >=58 Hz display. On a 50 Hz panel or
// a throttled background tab, "locked to the refresh" is not evidence of spare
// capacity, it is evidence of a slow refresh.
const VBLANK_MAX_MS = 1000 / 58;

/**
 * Adaptive render-resolution controller with target-fps hysteresis.
 *
 * Contract: the caller hands it a per-frame delta (seconds) and it writes the
 * resolved scale into the shared quality bus and, when the rung changes, into
 * the renderer and the composer. It never allocates during a sample.
 */
export const createAdaptiveRenderScale = ({
  bus = raceQuality,
  composer = null,
  enabled = true,
  mobile = false,
  nowRef = globalThis.performance,
  renderer = null,
  windowRef = globalThis.window,
} = {}) => {
  const history = new Float32Array(HISTORY_FRAMES);
  const scratch = new Float32Array(HISTORY_FRAMES);
  const sizeScratch = new THREE.Vector2();
  let cursor = 0;
  let filled = 0;
  let sinceEval = 0;
  let elapsed = 0;
  let lastSampleAt = 0;
  let lastChangeAt = -1e6;
  let failedRung = -1;
  let failedAt = -1e6;
  let failStreak = 0;
  let mobileTier = Boolean(mobile);
  let ladder = RACE_SCALE_LADDER[mobileTier ? 'mobile' : 'desktop'];
  // Resume from whatever the previous race on this device settled at rather
  // than from the tier default: it is the same GPU, and re-learning costs the
  // player the first ten seconds of every race.
  let rung =
    typeof bus.renderScale === 'number'
      ? nearestRung(ladder, bus.renderScale)
      : START_RUNG[mobileTier ? 'mobile' : 'desktop'];
  let emissionRung = EMISSION_LADDER.indexOf(bus.emissionScale) >= 0 ? EMISSION_LADDER.indexOf(bus.emissionScale) : EMISSION_LADDER.length - 1;
  let appliedDpr = 0;

  const publish = () => {
    bus.emissionScale = EMISSION_LADDER[emissionRung];
    bus.managed = true;
    bus.mobile = mobileTier;
    bus.renderScale = ladder[rung];
  };

  // Resolve and write the pixel ratio. Deliberately the same expression as
  // fitRaceRendererToCanvas below, so a resize that lands mid-race recomputes
  // the identical dpr from the bus and the two never fight over the canvas.
  const applyToRenderer = () => {
    if (!renderer) return;
    const rawDpr = Math.min(windowRef?.devicePixelRatio || 1, 2);
    const dpr = Math.max(RACE_MIN_DPR, rawDpr * ladder[rung]);
    if (Math.abs(renderer.getPixelRatio() - dpr) > 1e-4) {
      // three's setPixelRatio re-runs setSize(_width, _height, false) itself,
      // so this is what actually resizes the drawing buffer.
      renderer.setPixelRatio(dpr);
      renderer.getSize(sizeScratch);
      // Same CSS size, new drawing buffer: the composer skips renderer.setSize
      // and rebuilds its own targets off getDrawingBufferSize.
      composer?.setSize(sizeScratch.x, sizeScratch.y, false);
    }
    appliedDpr = dpr;
  };

  const commit = () => {
    publish();
    applyToRenderer();
    lastChangeAt = elapsed;
    // The frames straight after a reallocation are not evidence of anything.
    // Zeroing the timestamp as well as the ring discards the reallocation frame
    // itself rather than letting it sit in the next window as a p90 outlier.
    filled = 0;
    cursor = 0;
    sinceEval = 0;
    lastSampleAt = 0;
  };

  const shed = (hard) => {
    if (rung > 0) {
      // Same rung failing again = this device is not borderline, it is over.
      failStreak = rung === failedRung ? failStreak + 1 : 1;
      failedRung = rung;
      failedAt = elapsed;
      rung = Math.max(0, rung - (hard ? 2 : 1));
    } else if (emissionRung > 0) {
      emissionRung -= 1;
    } else {
      return false;
    }
    commit();
    return true;
  };

  const raise = () => {
    if (emissionRung < EMISSION_LADDER.length - 1) {
      emissionRung += 1;
    } else if (rung < ladder.length - 1) {
      // Do not walk straight back into the rung that just failed.
      if (rung + 1 === failedRung) {
        const memory = Math.min(FAIL_MEMORY_MAX_S, FAIL_MEMORY_S * 2 ** (failStreak - 1));
        if (elapsed - failedAt < memory) return false;
      }
      rung += 1;
    } else {
      return false;
    }
    commit();
    return true;
  };

  if (enabled) publish();

  return {
    get emissionScale() {
      return EMISSION_LADDER[emissionRung];
    },
    get renderScale() {
      return ladder[rung];
    },
    /**
     * Read-only snapshot for telemetry / the post lab.
     */
    readout() {
      return {
        emissionScale: EMISSION_LADDER[emissionRung],
        enabled,
        mobile: mobileTier,
        renderScale: ladder[rung],
        rung,
        warm: elapsed >= WARMUP_S,
      };
    },
    /**
     * Call once per rendered frame. Returns true when the rung moved.
     *
     * Takes NO delta on purpose. The race loop's own `dt` is unusable as a
     * performance measurement for two independent reasons, both of which bias
     * it in the direction that hides a problem: it is clamped to 40ms so the
     * sim cannot explode on a throttled frame (which makes 25fps and 5fps
     * indistinguishable), and under reducedMotion it is multiplied by 0.86,
     * which would have this controller read a 52fps device as a comfortable 60.
     * Wall clock, measured here, is the only honest input.
     */
    sample() {
      if (!enabled || !renderer) return false;
      const now = nowRef?.now ? nowRef.now() : Date.now();
      const previous = lastSampleAt;
      lastSampleAt = now;
      if (previous === 0) return false;
      const frameMs = now - previous;
      // Reject the un-representative: the first frame of a race, a tab that
      // was backgrounded, a debugger pause. Anything over 250ms is not a slow
      // frame, it is a gap.
      if (!(frameMs > 0.2 && frameMs < 250)) return false;
      elapsed += frameMs / 1000;
      history[cursor] = frameMs;
      cursor = (cursor + 1) % HISTORY_FRAMES;
      if (filled < HISTORY_FRAMES) filled += 1;
      if (elapsed < WARMUP_S) return false;
      if (elapsed - lastChangeAt < CHANGE_COOLDOWN_S) return false;
      sinceEval += 1;
      if (sinceEval < EVALUATE_EVERY) return false;
      sinceEval = 0;
      if (filled < HISTORY_FRAMES) return false;

      scratch.set(history);
      scratch.sort();
      const p10 = percentile(scratch, 0.1);
      const p50 = percentile(scratch, 0.5);
      const p90 = percentile(scratch, 0.9);

      if (p50 > SHED_MS) return shed(p50 > SHED_HARD_MS);

      // Headroom cannot be measured directly from a frame delta — vsync clamps
      // it from below, so a GPU that finished in 2ms and a GPU that finished in
      // 8ms both report 8.33ms on a 120Hz panel. What CAN be measured is
      // whether the window is tight and entirely inside budget, which is the
      // signature of a frame that is waiting on something other than itself:
      //   p10 <= VBLANK_MAX_MS  the fast end of the window is a plausible
      //                         refresh period, not a 50Hz panel or a
      //                         throttled background tab
      //   p90 <= SHED_MS        NOTHING in the window missed the 56fps budget.
      //                         This is what stops a run alternating 60/30 —
      //                         whose median is a perfectly locked 16.7ms —
      //                         from reading as headroom.
      //   p50 <= p10 * 1.06     the window has almost no jitter. On real
      //                         hardware only a vsync-locked frame is this
      //                         tight; an unlocked GPU running comfortably at
      //                         110fps still varies by more than 6% and will
      //                         not step up. That asymmetry is deliberate —
      //                         stepping up is the direction that can hurt.
      if (p10 > VBLANK_MAX_MS) return false;
      if (p90 > SHED_MS) return false;
      if (p50 > p10 * VBLANK_SLACK) return false;
      return raise();
    },
    /**
     * Orientation change / narrow-window switch. Carries the MEASURED rung
     * across instead of resetting to the new tier's default: it is the same
     * GPU as it was a frame ago, and the ladders overlap.
     */
    setTier(isMobile) {
      const next = Boolean(isMobile);
      // A disabled controller must stay COMPLETELY inert — it may not publish
      // to the bus even once. If it did, an automated capture that happens to
      // fire a resize would flip fitRaceRendererToCanvas from its fixed table
      // onto the ladder mid-run and change the resolution the critics score.
      if (!enabled || next === mobileTier) return;
      mobileTier = next;
      const previousScale = ladder[rung];
      const tierKey = mobileTier ? 'mobile' : 'desktop';
      ladder = RACE_SCALE_LADDER[tierKey];
      // Carry the measurement across, but never UPWARD across a tier boundary.
      // The two ladders overlap at the top (desktop 0.85 is the mobile ladder's
      // ceiling), so a straight nearest-rung carry would answer "this laptop
      // holds 0.85" by asking a phone to render at 0.85 — on a pass set it has
      // never been measured against. Clamping to the new tier's start rung means
      // a flip can only ever make the frame cheaper; the controller climbs back
      // from there if the device earns it.
      rung = Math.min(nearestRung(ladder, previousScale), START_RUNG[tierKey]);
      failedRung = -1;
      failStreak = 0;
      // A tier flip changes the pass set (SMAA and MSAA come or go), so every
      // sample in the window was measured against a different renderer.
      elapsed = 0;
      filled = 0;
      cursor = 0;
      commit();
    },
    /**
     * Hands the bus back. renderScale/emissionScale are deliberately LEFT at
     * the learned values so the next race on this device starts where this one
     * settled; `managed` going false is what tells a consumer nobody is
     * currently driving them.
     */
    dispose() {
      bus.managed = false;
    },
    /**
     * Re-assert the current rung. For a caller that knows something else just
     * wrote the pixel ratio.
     */
    reassert() {
      if (!enabled) return;
      if (Math.abs((renderer?.getPixelRatio() ?? appliedDpr) - appliedDpr) > 1e-4) applyToRenderer();
    },
  };
};

// Legacy ArcadeRace3D keeps the scale its browser-suite pixel thresholds
// were calibrated at. The legacy route is not shipped; raising its
// resolution just starves the suite's software-GL readiness analysis in
// headless Chromium for zero product benefit.
export const RACE_RENDER_SCALE_LEGACY = Object.freeze({
  desktop: 0.58,
  mobile: 0.6,
});

export const RACE_FOG_NEAR = 210;
export const RACE_FOG_FAR = 580;
export const RACE_CAMERA_FAR = 580;

export const configureRaceRenderer = (renderer) => {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = false;
  return renderer;
};

export const createRaceRenderer = ({
  canvas,
  consoleRef = console,
  onUnavailable = null,
  RendererClass = THREE.WebGLRenderer,
} = {}) => {
  try {
    return configureRaceRenderer(
      new RendererClass({
        ...RACE_RENDERER_OPTIONS,
        canvas,
      })
    );
  } catch (error) {
    consoleRef?.warn?.('Comeback City race WebGL renderer unavailable, using 2D fallback:', error);
    onUnavailable?.(error);
    return null;
  }
};

export const fitRaceRendererToCanvas = ({
  camera,
  canvas,
  raceViewport,
  renderer,
  scaleTable = RACE_RENDER_SCALE,
  windowRef = globalThis.window,
} = {}) => {
  const rect = canvas.getBoundingClientRect();
  // Layout size, NOT the transformed bounding box: under the tilt soft
  // lock the whole game is rotated 90° and the bbox reports swapped dims —
  // the renderer must keep painting the canvas's own (landscape) aspect.
  raceViewport.width = Math.max(1, canvas.clientWidth || rect.width || 1);
  raceViewport.height = Math.max(1, canvas.clientHeight || rect.height || 1);
  raceViewport.mobile = raceViewport.width / raceViewport.height < 0.74;
  const rawDpr = Math.min(windowRef?.devicePixelRatio || 1, 2);
  // The adaptive controller only owns the SHIPPED table. ArcadeRace3D passes
  // RACE_RENDER_SCALE_LEGACY and keeps its calibrated fixed cut, and when no
  // controller is running (automated capture, ?postAdaptiveRes=0, ?post=0)
  // raceQuality.renderScale is null and this resolves to exactly the number it
  // resolved to before wave 6.
  const managedScale = scaleTable === RACE_RENDER_SCALE ? raceQuality.renderScale : null;
  const renderScale = managedScale ?? (raceViewport.mobile ? scaleTable.mobile : scaleTable.desktop);
  const dpr = Math.max(RACE_MIN_DPR, rawDpr * renderScale);
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  const previousDpr = raceViewport.dpr;
  const previousAspect = raceViewport.aspect;
  raceViewport.dpr = dpr;
  raceViewport.rawDpr = rawDpr;
  raceViewport.renderScale = renderScale;
  raceViewport.aspect = Math.max(0.1, rect.width / Math.max(1, rect.height));
  if (previousDpr !== dpr) renderer.setPixelRatio(dpr);
  if (canvas.width !== width || canvas.height !== height) {
    renderer.setSize(rect.width, rect.height, false);
  }
  if (camera.aspect !== raceViewport.aspect || previousAspect !== raceViewport.aspect) {
    camera.aspect = raceViewport.aspect;
    camera.updateProjectionMatrix();
  }
  return rect;
};

export const createRaceSceneShell = ({ theme = {} } = {}) => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(theme.sky || '#59c6ed');
  scene.fog = new THREE.Fog(theme.fog || '#bdf6ff', RACE_FOG_NEAR, RACE_FOG_FAR);

  const camera = new THREE.PerspectiveCamera(76, 1, 0.25, RACE_CAMERA_FAR);

  const skyLight = new THREE.HemisphereLight('#fff8cf', '#2085a4', 3.15);
  scene.add(skyLight);

  const sun = new THREE.DirectionalLight('#fff2b9', 3.55);
  sun.position.set(-64, 98, -54);
  sun.castShadow = false;
  scene.add(sun);

  const rim = new THREE.DirectionalLight('#63e6ff', 1.45);
  rim.position.set(84, 52, 76);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);

  return {
    camera,
    rim,
    scene,
    skyLight,
    sun,
    world,
  };
};
