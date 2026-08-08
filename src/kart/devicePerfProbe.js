// ?perf=1 — the on-device frame readout.
//
// WHY THIS SHIPS, when kart-playtest.html already has a richer overlay.
//
// Frame timing cannot be measured on the dev machine. It runs at load 8-35,
// this repo's history is full of fps numbers that turned out to measure the
// capture conditions rather than the build, and `audit:renderer` prints its own
// timing as ADVISORY ONLY for exactly that reason. Structure (draw calls,
// triangles, programs) reads the same anywhere; timing does not. So the numbers
// that decide what to optimise next have to come off real hardware — the
// owner's gaming machine and his phone — against the DEPLOYED build.
//
// The playtest overlay cannot do that job: kart-playtest.html is not an input
// to vite.config.kart.js, so it never reaches dist-kart, and a phone has no
// console, no devtools and no repo checkout. This is the shipped subset.
//
// It is opt-in behind ?perf=1 and dynamically imported, so a player who never
// types the flag never downloads the chunk. Against a JS gzip budget with about
// 1.3 KiB of headroom, that mattered.

// ~7s of history at 72Hz, ~3.5s at 144Hz: long enough to contain a corner or an
// item burst, short enough to forget the load screen.
const WINDOW = 512;
// A frame past this is a tab switch, a load hitch or the screen locking. Real
// judder never gets there, and one such sample would own the worst and the p95
// for the rest of the window.
const OUTLIER_MS = 250;
// A 60Hz frame is 16.7ms, so anything past 20 dropped a beat a player can see.
const SPIKE_MS = 20;

export const mountDevicePerfProbe = () => {
  const ring = new Float64Array(WINDOW);
  const sorted = new Float64Array(WINDOW);
  let count = 0;
  let head = 0;
  let previousStamp = 0;
  // The smallest frame this device has actually managed. On a vsync-locked
  // display it converges on the refresh interval, and that is what separates
  // "every frame costs more" from "the browser is handing us every other beat":
  // a 16.7ms p50 against an 8.3ms floor is beat-skipping, not render cost.
  let floor = Infinity;

  const sample = (stamp) => {
    const delta = stamp - previousStamp;
    previousStamp = stamp;
    if (delta > 0 && delta < OUTLIER_MS) {
      if (delta < floor) floor = delta;
      ring[head] = delta;
      head = (head + 1) % WINDOW;
      if (count < WINDOW) count += 1;
    }
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);

  // Sorting 512 doubles costs tens of microseconds and only runs on paint, so
  // it never lands inside the window it is summarising.
  const pace = () => {
    if (!count) return null;
    sorted.set(ring.subarray(0, count));
    const view = sorted.subarray(0, count);
    view.sort();
    let spikes = 0;
    for (let index = 0; index < count; index += 1) if (view[index] > SPIKE_MS) spikes += 1;
    return {
      p50: view[Math.floor(count * 0.5)],
      p95: view[Math.min(count - 1, Math.floor(count * 0.95))],
      worst: view[count - 1],
      samples: count,
      spikes,
    };
  };

  // Which side of the pipeline is paying. This is the whole point of taking the
  // measurement: "it feels slow" cannot be acted on, "the GPU is spiking" and
  // "our own frame work owns the frame" lead to opposite fixes.
  const verdict = (measured, workMs) => {
    if (!measured) return 'collecting…';
    if (Number.isFinite(workMs) && workMs > measured.p50 * 0.6) return 'CPU-BOUND — our frame work owns the frame';
    if (!Number.isFinite(floor)) return '';
    if (measured.p95 <= floor * 1.25) return 'LOCKED — paced by vsync, headroom to spare';
    if (measured.p95 >= floor * 1.8) return 'JUDDER — dropped beats (GPU spike or host contention)';
    return 'SOFT — occasional dropped beat';
  };

  const panel = document.createElement('pre');
  panel.style.cssText = [
    'position:fixed',
    'top:6px',
    'left:6px',
    'z-index:2147483647',
    'margin:0',
    'padding:7px 9px',
    // Bigger than the desktop overlay on purpose: this gets read off a phone
    // screen, and screenshotted rather than copied, because a phone has no
    // console to paste from.
    'font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace',
    'color:#d8f3ff',
    'background:rgba(6,10,18,0.82)',
    'border:1px solid rgba(120,200,255,0.3)',
    'border-radius:8px',
    // Never intercept a touch: on a phone the probe sits directly over the
    // item button and the drag area that steers.
    'pointer-events:none',
    'white-space:pre',
    'max-width:calc(100vw - 12px)',
  ].join(';');

  document.body.appendChild(panel);

  const paint = () => {
    const telemetry = window.__comebackCityKartTelemetry;
    const measured = pace();
    // Drawing-buffer size, NOT css size. A phone's devicePixelRatio squares the
    // fill cost of the post chain, and that is invisible in milliseconds alone —
    // it is the first thing to check when a phone is slower than the desktop by
    // more than the GPU gap explains.
    const canvas = document.querySelector('canvas');
    const buffer = canvas ? `${canvas.width}x${canvas.height}` : '—';
    const stats = telemetry?.rendererStats || {};
    const work = telemetry?.frameWorkMs;
    const ms = (value) => (Number.isFinite(value) ? value.toFixed(1) : '—');
    panel.textContent = [
      `buffer ${buffer}  dpr ${window.devicePixelRatio}`,
      measured
        ? `p50 ${ms(measured.p50)}ms (${(1000 / measured.p50).toFixed(0)} fps)  p95 ${ms(measured.p95)}  worst ${ms(
            measured.worst
          )}`
        : 'pace collecting…',
      `floor ${ms(floor)}ms  >${SPIKE_MS}ms ${measured ? `${measured.spikes}/${measured.samples}` : '—'}  work ${ms(work)}ms`,
      verdict(measured, work),
      telemetry
        ? `${telemetry.track}  draws ${stats.gpuCalls ?? '—'}  tris ${stats.gpuTriangles ?? '—'}  programs ${
            stats.programs ?? '—'
          }`
        : 'waiting for the race…',
    ]
      .filter(Boolean)
      .join('\n');
  };

  // 4Hz. Sampling every frame is free; laying out text is not.
  setInterval(paint, 250);
  paint();
};
