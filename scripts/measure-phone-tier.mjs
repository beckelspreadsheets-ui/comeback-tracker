// Phone-tier perf re-measure (AAA item 6b). Samples the MOBILE render tier
// (scale floor 0.6, governor ceiling 0.8, mobile post-chain reductions active)
// with everything that landed since the phone build was last measured: shadow
// maps, the pmndrs 3-pass post chain, the mid-ground belt, the environment
// probe and the adaptive render-scale governor.
//
//   node scripts/measure-phone-tier.mjs
//
// HONEST CAVEAT: absolute fps here is THIS machine's GPU under the capture GL
// path, NOT a phone's. The PORTABLE signals are:
//   - frameWorkMs   : CPU work per frame (JS runs on the phone CPU) — tier- and
//                     GPU-independent; a phone CPU is slower but this is the
//                     number that says whether the CPU is a bottleneck.
//   - drawCalls / gpuCalls : scene submission cost — a real mobile-GPU lever.
//   - renderScale / postChainEnabled : proves the mobile tier path is active.
// GPU frame time on a real phone is NOT measurable here; the adaptive governor
// self-protects against it (it climbs render scale only under-budget).
//
// A 390x844 portrait viewport gives aspect 0.46 < 0.74 -> mobile render tier.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { chromiumGlArgs } from './lib/chromium-gl-args.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const PORT = Number(process.env.PHONE_TIER_PORT || 5361);
const SECONDS = Number(process.env.PHONE_TIER_SECONDS || 18);

const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
});
const waitUp = async () => {
  for (let i = 0; i < 150; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/`);
      if (r.ok || r.status === 404) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('vite never came up');
};

const sampleTrack = async (browser, track, seconds) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${PORT}/kart-playtest.html?raceAutoplay=1&track=${track}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
    timeout: 60000,
  });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, { timeout: 60000 });
  const samples = [];
  const started = Date.now();
  while (Date.now() - started < seconds * 1000) {
    const t = await page.evaluate(() => {
      const w = window.__comebackCityKartTelemetry;
      if (!w) return null;
      return {
        renderScale: w.renderScale,
        fps: w.fpsEstimate,
        frameWorkMs: w.frameWorkMs,
        frameElapsedMs: w.frameElapsedMs,
        postChainEnabled: w.postChainEnabled,
        propCount: w.propCount,
        raceTime: w.raceTime,
        drawCalls: w.rendererStats?.drawCalls ?? null,
        gpuCalls: w.rendererStats?.gpuCalls ?? null,
        triangles: w.rendererStats?.triangles ?? null,
        gpuTriangles: w.rendererStats?.gpuTriangles ?? null,
        rendererStats: w.rendererStats ?? null,
      };
    });
    if (t) samples.push(t);
    await page.waitForTimeout(300);
  }
  await page.close();
  return samples;
};

const stat = (arr) => {
  const xs = arr.filter((x) => typeof x === 'number' && !Number.isNaN(x)).sort((a, b) => a - b);
  if (!xs.length) return null;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return { n: xs.length, min: xs[0], p50: xs[Math.floor(xs.length * 0.5)], max: xs[xs.length - 1], mean: Math.round(mean * 100) / 100 };
};

(async () => {
  await waitUp();
  const browser = await chromium.launch({ args: chromiumGlArgs() });
  const out = {};
  for (const track of ['comeback-city', 'penguin-village']) {
    const samples = await sampleTrack(browser, track, SECONDS);
    const settled = samples.filter((s) => s.raceTime > 4);
    out[track] = {
      totalSamples: samples.length,
      settledSamples: settled.length,
      firstRenderScale: samples[0]?.renderScale ?? null,
      lastRenderScale: samples[samples.length - 1]?.renderScale ?? null,
      postChainEnabled: samples[samples.length - 1]?.postChainEnabled ?? null,
      propCount: samples[samples.length - 1]?.propCount ?? null,
      renderScale: stat(settled.map((s) => s.renderScale)),
      fps: stat(settled.map((s) => s.fps)),
      frameWorkMs: stat(settled.map((s) => s.frameWorkMs)),
      frameElapsedMs: stat(settled.map((s) => s.frameElapsedMs)),
      drawCalls: stat(settled.map((s) => s.drawCalls)),
      gpuCalls: stat(settled.map((s) => s.gpuCalls)),
      triangles: stat(settled.map((s) => s.triangles)),
      gpuTriangles: stat(settled.map((s) => s.gpuTriangles)),
      rendererStatsSample: samples[samples.length - 1]?.rendererStats ?? null,
    };
  }
  await browser.close();
  server.kill('SIGTERM');
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
})().catch((err) => {
  console.error(err);
  server.kill('SIGTERM');
  process.exit(1);
});
