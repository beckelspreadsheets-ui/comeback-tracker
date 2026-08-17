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
export const RACE_RENDER_SCALE = Object.freeze({
  desktop: 0.85,
  mobile: 0.6,
});

// Adaptive ceiling (AAA item 6, 2026-08-17). The fixed table above is now the
// FLOOR: hardware that holds its refresh rate with headroom climbs toward
// these, hardware that misses frames falls back to the floor. A fixed 0.85
// meant the game never rendered at native resolution even on machines that
// hold 144 fps with ~1.3 ms of frame work.
export const RACE_RENDER_SCALE_MAX = Object.freeze({
  desktop: 1.0,
  mobile: 0.8,
});

// Render-scale governor. Deliberately dumb and slow-moving, judged against a
// FIXED 60 fps budget rather than a detected refresh interval — the first cut
// estimated vsync as the rolling minimum frame gap and it broke immediately
// on uncapped rAF (headless capture, and any machine with vsync off): gaps
// jitter, the minimum reads low, and every ordinary frame counts as "missed".
// The budget model behaves the same on vsynced and uncapped displays:
//
//  - Every 750 ms window: mean frame gap and mean frame work.
//  - STRUGGLING (mean gap > 1.25x budget, i.e. under ~48 fps) -> step DOWN
//    0.08.
//  - HEADROOM (mean gap < 1.05x budget AND mean CPU work < 45% of budget)
//    -> step UP 0.06, only after 4 s of uptime so shader warmup never reads
//    as load.
//  - Steps are cooldown-gated (down 2 s, up 3.5 s) and clamped to
//    [floor, max]. Down moves faster than up, and the floor is the shipped
//    table — the governor can only ever make things sharper than today,
//    never blurrier.
//
// One render change, verified alone, per the wave-6 rule
// (scripts/test-adaptive-render-scale.mjs).
const GOVERNOR_BUDGET_MS = 1000 / 60;

export const createRenderScaleGovernor = () => ({
  cooldownUntil: 0,
  elapsedSumMs: 0,
  frames: 0,
  scale: null,
  startedAt: null,
  windowStartedAt: null,
  workSumMs: 0,
});

export const updateRenderScaleGovernor = (
  governor,
  { floor, frameElapsedMs, frameWorkMs, max, nowMs }
) => {
  if (!Number.isFinite(frameElapsedMs) || frameElapsedMs <= 0) return false;
  if (governor.scale === null) governor.scale = floor;
  if (governor.startedAt === null) governor.startedAt = nowMs;
  if (governor.windowStartedAt === null) governor.windowStartedAt = nowMs;

  governor.frames += 1;
  governor.elapsedSumMs += frameElapsedMs;
  governor.workSumMs += Math.max(0, frameWorkMs || 0);

  if (nowMs - governor.windowStartedAt < 750) return false;
  const meanElapsedMs = governor.elapsedSumMs / Math.max(1, governor.frames);
  const meanWorkMs = governor.workSumMs / Math.max(1, governor.frames);
  const warmedUp = nowMs - governor.startedAt > 4000;
  governor.frames = 0;
  governor.elapsedSumMs = 0;
  governor.workSumMs = 0;
  governor.windowStartedAt = nowMs;

  const previous = governor.scale;
  if (nowMs >= governor.cooldownUntil) {
    if (meanElapsedMs > GOVERNOR_BUDGET_MS * 1.25 && governor.scale > floor) {
      governor.scale = Math.max(floor, governor.scale - 0.08);
      governor.cooldownUntil = nowMs + 2000;
    } else if (
      warmedUp &&
      meanElapsedMs < GOVERNOR_BUDGET_MS * 1.05 &&
      meanWorkMs < GOVERNOR_BUDGET_MS * 0.45 &&
      governor.scale < max
    ) {
      governor.scale = Math.min(max, governor.scale + 0.06);
      governor.cooldownUntil = nowMs + 3500;
    }
  }
  governor.scale = Math.min(max, Math.max(floor, governor.scale));
  return governor.scale !== previous;
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
  // The governor's live scale (clamped to [floor, max] where it is updated)
  // overrides the static table when present; the table remains the floor.
  const renderScale =
    raceViewport.adaptiveScale ?? (raceViewport.mobile ? scaleTable.mobile : scaleTable.desktop);
  const dpr = Math.max(0.355, rawDpr * renderScale);
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
