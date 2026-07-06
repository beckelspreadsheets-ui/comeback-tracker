// B2 wrap-seam probe: records a webm of the V2 "journey" candidate crossing
// the finish line (lap 1 -> lap 2) so the 0.95 -> 0.05 seam can be checked
// frame-by-frame — the wrap segment must converge on the 0.02 anchor with
// no color pop. A moment-less CONTROL lap is recorded the same way and the
// two runs' post-warm-up frameWorkMs medians are compared as the
// lerps-are-live perf gate: Playwright's screencast inflates absolute
// frame work (the first probe draft failed a 5ms absolute gate at 45ms —
// recording overhead, not the moments hook; the no-video lab captures
// showed 1.0-1.4ms for control AND candidates alike), so only the A/B
// delta under identical overhead is meaningful.
// The candidate values mirror v2-journey in capture-moments-variants.mjs
// (hemi pre-normalized with its matchLuma against the V8 base) — the
// capture script is the authoring source of truth; this probe only needs A
// representative live set.
// HARD RULE: never run concurrently with another vite-spawning suite.
// Output: tmp/m2-moments-lab/seam-lap-control.webm, seam-lap-v2-journey.webm,
// seam-probe.json. Regen: node tmp/m2-moments-lab/probe-wrap-seam.mjs
import { spawn } from 'node:child_process';
import { rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const PORT = 5315; // same slot as the moments-lab capture (never concurrent)
const WARMUP_SAMPLES = 15;

const JOURNEY_MOMENTS = [
  { progress: 0.02 },
  {
    progress: 0.3,
    fog: { color: '#5d8290', near: 170, far: 800 },
    hemi: { sky: '#5aa8c4', ground: '#0f2b3d' },
    sun: { color: '#dccfb2' },
    rim: '#00e5ff',
  },
  {
    progress: 0.55,
    fog: { color: '#5f6472', near: 140 },
    hemi: { sky: '#7e93ae', ground: '#1f2436' },
    sun: { color: '#f2b579', intensity: 2.85 },
    rim: '#22c9e8',
  },
  {
    progress: 0.84,
    fog: { color: '#3f566e', near: 122, far: 640 },
    hemi: { sky: '#5c86ba', ground: '#0d2036' },
    sun: { color: '#d8b795', intensity: 2.3 },
    rim: '#2be2ff',
  },
];

const waitForServer = async () => {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/`);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('vite dev not ready');
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : NaN;
};

// One recorded lap: start -> across the lap-1/lap-2 seam -> pond sweep.
const recordSeamLap = async (browser, { key, moments }) => {
  const context = await browser.newContext({
    recordVideo: { dir: __dirname, size: { height: 900, width: 1440 } },
    viewport: { height: 900, width: 1440 },
  });
  const page = await context.newPage();
  if (moments) {
    await page.addInitScript((overrides) => {
      window.__momentsLabOverrides = overrides;
    }, moments);
  }
  const momentsQuery = moments ? '&momentsLab=1' : '&momentsLab=0';
  await page.goto(`http://127.0.0.1:${PORT}/?playableAutoplay=1&track=penguin-village${momentsQuery}#race`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
    timeout: 30000,
  });
  const samples = [];
  const sampleTimer = setInterval(async () => {
    try {
      samples.push(
        await page.evaluate(() => {
          const t = window.__comebackCityKartTelemetry;
          return {
            frameWorkMs: t.frameWorkMs,
            lap: t.lap,
            paletteMomentsEnabled: t.paletteMomentsEnabled,
            routeProgress: t.routeProgress,
          };
        })
      );
    } catch {
      // page mid-close
    }
  }, 150);
  await page.waitForFunction(() => (window.__comebackCityKartTelemetry?.routeProgress || 0) >= 0.9, null, {
    timeout: 120000,
  });
  await page.waitForFunction(
    () => {
      const t = window.__comebackCityKartTelemetry;
      return t?.lap >= 2 && t.routeProgress >= 0.3 && t.routeProgress < 0.5;
    },
    null,
    { timeout: 120000 }
  );
  clearInterval(sampleTimer);
  const expectMoments = Boolean(moments);
  if (!samples.length || !samples.every((s) => s.paletteMomentsEnabled === expectMoments)) {
    throw new Error(`${key}: paletteMomentsEnabled was not steadily ${expectMoments} through the lap`);
  }
  const works = samples
    .slice(WARMUP_SAMPLES)
    .map((s) => s.frameWorkMs)
    .filter((v) => Number.isFinite(v));
  const video = page.video();
  await page.close();
  await context.close();
  const finalPath = path.join(__dirname, `seam-lap-${key}.webm`);
  await rename(await video.path(), finalPath);
  console.log(`recorded seam-lap-${key}.webm (samples=${samples.length}, workMedianMs=${median(works).toFixed(2)})`);
  return { key, samples, workMedianMs: median(works) };
};

const run = async () => {
  const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  });
  let browser = null;
  try {
    await waitForServer();
    browser = await chromium.launch();
    const control = await recordSeamLap(browser, { key: 'control', moments: null });
    const journey = await recordSeamLap(browser, { key: 'v2-journey', moments: JOURNEY_MOMENTS });
    // A/B perf gate under identical screencast overhead: a handful of lerps
    // must not move the median; 1.5x + 0.5ms only alarms on order-of-
    // magnitude regressions, not sampling noise.
    if (!(journey.workMedianMs <= control.workMedianMs * 1.5 + 0.5)) {
      throw new Error(
        `moments-on median frameWorkMs ${journey.workMedianMs} vs control ${control.workMedianMs} — lerp cost is not free`
      );
    }
    await writeFile(
      path.join(__dirname, 'seam-probe.json'),
      `${JSON.stringify(
        {
          controlWorkMedianMs: control.workMedianMs,
          journeyWorkMedianMs: journey.workMedianMs,
          runs: [control, journey],
          videos: ['seam-lap-control.webm', 'seam-lap-v2-journey.webm'],
        },
        null,
        2
      )}\n`
    );
    console.log(
      `seam probe ok: control median ${control.workMedianMs.toFixed(2)}ms vs moments-on ${journey.workMedianMs.toFixed(2)}ms`
    );
  } finally {
    await browser?.close();
    server.kill();
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
