// A2: minimal harness mounting the SHIPPED racer for FPS instrumentation.
// No app shell, no router, no cloud sync. ?track/?character/?kart are read
// HERE and passed as props — the shipped component is prop-only since the
// W1 fix (a URL param must never beat a cup-select pick); ?raceAutoplay is
// still read by the component itself.
//
// DEV ONLY. kart-playtest.html is not an input to either vite config
// (vite.config.js takes the default index.html; vite.config.kart.js pins
// index.kart.html), so nothing in this file reaches dist or dist-kart.
import { createRoot } from 'react-dom/client';
import '../index.css';
import { ComebackCityThreeKartRace } from './ComebackCityThreeKartRace.jsx';

const query = new URLSearchParams(window.location.search);

const KartPlaytestHarness = () => (
  <div style={{ height: '100vh', width: '100vw' }}>
    <ComebackCityThreeKartRace
      character={query.get('character') || undefined}
      kart={query.get('kart') || undefined}
      mode="race"
      track={query.get('track') || undefined}
    />
  </div>
);

createRoot(document.getElementById('root')).render(<KartPlaytestHarness />);
window.__kartHarnessReady = true;

// ---------------------------------------------------------------------------
// Live stats overlay.
//
// Why this exists: every graphics package is asked to land inside a frame
// budget, but the only way to see that number used to be running the full
// capture harness — a 2-3 minute round trip that also rebuilds the frames.
// This puts fps / frame work / draw calls / triangles on screen while you
// drive, so a change that costs 200 draw calls is visible the moment you
// make it.
//
// It never runs during a measurement or CI pass. Any autoplay param means
// phase5-sustained-capture.mjs or a smoke test is driving, and those runs must
// stay byte-identical to the ones they are compared against.
//
// It samples on rAF but only paints at 4Hz. The first cut polled everything at
// 4Hz to stay off the main thread; that turned out to be useless for the one
// question the graphics waves actually ask — "did my change add judder?" — as
// 4 samples a second cannot see a spike that happens once in sixty frames.
// Reading one number per frame into a preallocated ring is free; laying out
// text is not, so only the paint stays throttled.
const statsSuppressed =
  query.get('stats') === '0' ||
  query.has('raceAutoplay') ||
  query.has('playableAutoplay');

if (!statsSuppressed) {
  // The GLB failure path in the monolith warns rather than errors, so a clean
  // console-error list is NOT evidence the models loaded — a capture can come
  // back green with the untextured procedural fallback kart on screen. Mirror
  // warns here so the fallback is impossible to miss while playtesting.
  const loadWarnings = [];
  const nativeWarn = console.warn.bind(console);
  console.warn = (...args) => {
    const text = args.map((value) => String(value)).join(' ');
    if (/glb|gltf|model|texture|load|mount/i.test(text) && !loadWarnings.includes(text)) {
      loadWarnings.push(text.slice(0, 160));
    }
    nativeWarn(...args);
  };

  const panel = document.createElement('pre');
  panel.style.cssText = [
    'position:fixed',
    'top:8px',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:2147483647',
    'margin:0',
    'padding:6px 10px',
    'font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace',
    'color:#d8f3ff',
    'background:rgba(6,10,18,0.78)',
    'border:1px solid rgba(120,200,255,0.28)',
    'border-radius:8px',
    'pointer-events:none',
    'white-space:pre',
    'text-align:left',
  ].join(';');
  document.body.appendChild(panel);

  // Smallest frame the tab has actually managed. On a vsync-locked display
  // this converges on the refresh interval, which is what separates "we are
  // GPU bound" from "the browser is handing us every other beat" — a 16.7ms
  // average against an 8.3ms floor is beat-skipping, not render cost.
  let floorElapsedMs = Infinity;

  // Rolling window of presented-frame intervals. 512 samples is ~7s at 72fps
  // and ~3.5s at 144 — long enough that a corner or an item burst is inside
  // the window, short enough that it forgets the load screen.
  //
  // The interval is timed off this rAF rather than read from
  // telemetry.frameElapsedMs for two reasons: the telemetry value is only
  // written when the race loop runs (menus and pauses would freeze the
  // window), and every callback registered for the same animation frame fires
  // in that one frame, so this delta IS the presented interval — unquantised,
  // and it needs no "has the game stepped?" dedup. raceTime cannot serve as
  // that dedup key anyway: it is rounded to 0.01s, so above 100fps consecutive
  // frames share a value and the fast frames get thrown away, which biases the
  // percentiles the wrong way.
  const WINDOW = 512;
  const elapsedRing = new Float64Array(WINDOW);
  let ringCount = 0;
  let ringHead = 0;
  let lastFrameStamp = 0;

  const sample = (stamp) => {
    const delta = stamp - lastFrameStamp;
    lastFrameStamp = stamp;
    // Anything past a quarter second is a tab switch, a load hitch or the
    // devtools being opened — real judder never gets there, and one such
    // sample would own the worst/p95 for the next seven seconds.
    if (delta > 0 && delta < 250) {
      floorElapsedMs = Math.min(floorElapsedMs, delta);
      elapsedRing[ringHead] = delta;
      ringHead = (ringHead + 1) % WINDOW;
      if (ringCount < WINDOW) ringCount += 1;
    }
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);

  // Sorting 512 doubles at 4Hz is ~30µs and only runs on paint, so it never
  // lands inside the window it is summarising.
  const sorted = new Float64Array(WINDOW);
  const percentiles = () => {
    if (!ringCount) return null;
    sorted.set(elapsedRing.subarray(0, ringCount));
    const view = sorted.subarray(0, ringCount);
    view.sort();
    let spikes = 0;
    // 20ms is the "a player can see it" line: a 60fps frame is 16.7ms, so
    // anything past 20 dropped a beat.
    for (let index = 0; index < ringCount; index += 1) if (view[index] > 20) spikes += 1;
    return {
      p50: view[Math.floor(ringCount * 0.5)],
      p95: view[Math.min(ringCount - 1, Math.floor(ringCount * 0.95))],
      worst: view[ringCount - 1],
      spikes,
      samples: ringCount,
    };
  };

  // Which side of the pipeline is paying. Every graphics wave gets told "you
  // have 14ms of headroom"; when a capture comes back slower the argument is
  // always whether the change cost it or the machine was busy. floor answers
  // that: if the floor is unchanged the display still hits its refresh, so a
  // high p95 is dropped beats (GPU spikes or host contention), not a uniformly
  // more expensive frame.
  const verdictOf = (pace, workMs) => {
    if (!pace) return '';
    if (Number.isFinite(workMs) && workMs > pace.p50 * 0.6) return 'CPU-BOUND — frame work owns the frame';
    if (!Number.isFinite(floorElapsedMs)) return '';
    if (pace.p95 <= floorElapsedMs * 1.25) return 'LOCKED — paced by vsync, headroom to spare';
    if (pace.p95 >= floorElapsedMs * 1.8) return 'JUDDER — dropped beats (GPU spike or host contention, not CPU)';
    return 'SOFT — occasional dropped beat';
  };

  // Press ` to freeze a reference point, then keep editing: the overlay shows
  // the delta. This is the before/after number every package has to land, and
  // it costs nothing to take. Shift+` clears it. Backquote is deliberately
  // outside the monolith's keyMap, and nothing here preventDefaults, so the
  // kart never sees these.
  let mark = null;
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Backquote') return;
    if (event.shiftKey) {
      mark = null;
      return;
    }
    const telemetry = window.__comebackCityKartTelemetry;
    const pace = percentiles();
    if (!telemetry || !pace) return;
    const stats = telemetry.rendererStats || {};
    // gpuCalls/gpuTriangles, not calls/triangles. `calls` has never existed on
    // rendererStats (estimateSceneRenderStats returns drawCalls/gpuCalls), so
    // this guard could never pass and the mark feature was dead — the draws
    // line above rendered a dash for the same reason. The GPU pair is also the
    // right one: it is post-cull and includes the shadow and post passes, which
    // is what the audit judges and what a frame actually costs.
    if (!Number.isFinite(stats.gpuCalls)) return;
    mark = { calls: stats.gpuCalls, p50: pace.p50, triangles: stats.gpuTriangles };
  });

  const signed = (value) => (value > 0 ? `+${value}` : `${value}`);

  const readout = () => {
    const telemetry = window.__comebackCityKartTelemetry;
    if (!telemetry) {
      panel.textContent = 'kart telemetry: waiting…';
      return;
    }
    const stats = telemetry.rendererStats || {};
    const elapsed = telemetry.frameElapsedMs;
    const work = telemetry.frameWorkMs;
    const pace = percentiles();
    const gap = Number.isFinite(elapsed) && Number.isFinite(work) ? (elapsed - work).toFixed(2) : '—';
    const floor = Number.isFinite(floorElapsedMs) ? floorElapsedMs.toFixed(2) : '—';
    const mounts = telemetry.miamiMounts;
    const mountLine = mounts
      ? `mounts  ${mounts.mounted ?? '?'}/${mounts.requested ?? '?'}  failed ${mounts.failed ?? '?'}`
      : 'mounts  n/a';
    // Drawing-buffer size, not CSS size: a package that changes pixel ratio
    // changes GPU cost by its square, and that is invisible in ms alone.
    const canvas = document.querySelector('canvas');
    const buffer = canvas ? `${canvas.width}×${canvas.height}` : '—';

    panel.textContent = [
      `${telemetry.track}  ·  ${telemetry.character}/${telemetry.kart}  ·  lap ${telemetry.lap}  ${telemetry.speed} km/h  ·  buffer ${buffer}`,
      `fps ${telemetry.fpsEstimate}   elapsed ${elapsed ?? '—'}ms   work ${work ?? '—'}ms   idle ${gap}ms   floor ${floor}ms`,
      pace
        ? `pace  p50 ${pace.p50.toFixed(2)}ms   p95 ${pace.p95.toFixed(2)}ms   worst ${pace.worst.toFixed(
            2
          )}ms   >20ms ${pace.spikes}/${pace.samples}`
        : 'pace  collecting…',
      verdictOf(pace, work),
      `draws ${stats.gpuCalls ?? '—'}   tris ${stats.gpuTriangles ?? '—'}   programs ${stats.programs ?? '—'}   props ${telemetry.propCount ?? '—'}`,
      mark && pace
        ? `vs mark  draws ${signed((stats.gpuCalls ?? 0) - mark.calls)}   tris ${signed(
            (stats.gpuTriangles ?? 0) - mark.triangles
          )}   p50 ${signed(Number((pace.p50 - mark.p50).toFixed(2)))}ms`
        : '` = mark   shift+` = clear',
      mountLine,
      loadWarnings.length ? `ASSET WARNINGS (${loadWarnings.length}):\n  ${loadWarnings.slice(-4).join('\n  ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  };

  setInterval(readout, 250);
  readout();
}
