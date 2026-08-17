// AAA item 6 capture: the adaptive render-scale governor, verified alone.
//
//   node scripts/test-adaptive-render-scale.mjs
//
// Asserts, on real frame timing (GL flags — headless without them runs rAF at
// ~2fps and would read as a machine with no headroom):
//   1. the race STARTS at the shipped floor (0.85 desktop) — never below;
//   2. on hardware with headroom the scale CLIMBS above the floor;
//   3. it never exceeds RACE_RENDER_SCALE_MAX.desktop;
//   4. with ?adaptiveScale=0 the scale stays pinned at the floor.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { chromiumGlArgs } from './lib/chromium-gl-args.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const PORT = 5351;
const FLOOR = 0.85;
const MAX = 1.0;

const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
});
const waitUp = async () => {
  for (let i = 0; i < 120; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/`);
      if (r.ok || r.status === 404) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('vite never came up');
};

const sampleRace = async (browser, query, seconds) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`http://127.0.0.1:${PORT}/kart-playtest.html?raceAutoplay=1${query}`, {
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
      return w && { renderScale: w.renderScale, fps: w.fpsEstimate, raceTime: w.raceTime };
    });
    if (t && t.renderScale !== null) samples.push(t);
    await page.waitForTimeout(400);
  }
  await page.close();
  return samples;
};

const cases = [];
const check = (name, actual, expected) => {
  const pass = actual === expected;
  cases.push(pass);
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${name.padEnd(58)} got ${actual}, want ${expected}`);
};

let browser = null;
try {
  await waitUp();
  browser = await chromium.launch({ args: chromiumGlArgs() });

  console.log('adaptive render scale (governor ON)');
  const on = await sampleRace(browser, '', 20);
  const scales = on.map((s) => s.renderScale);
  const meanFps = on.reduce((a, s) => a + s.fps, 0) / Math.max(1, on.length);
  console.log(`  samples=${scales.length} first=${scales[0]} last=${scales[scales.length - 1]} meanFps=${Math.round(meanFps)}`);
  check('starts at the shipped floor', scales[0] === FLOOR, true);
  check('never drops below the floor', scales.every((s) => s >= FLOOR - 1e-9), true);
  check('never exceeds the max', scales.every((s) => s <= MAX + 1e-9), true);
  // Headroom climb is only asserted when this machine demonstrably has
  // headroom — a loaded machine legitimately stays at the floor.
  if (meanFps > 55) check('climbs above the floor with headroom', scales[scales.length - 1] > FLOOR, true);
  else console.log('  skip climb assertion — machine has no headroom right now');

  console.log('escape hatch (?adaptiveScale=0)');
  const off = await sampleRace(browser, '&adaptiveScale=0', 8);
  check('stays pinned at the floor', off.every((s) => s.renderScale === FLOOR), true);
} catch (error) {
  console.error('FAILED:', error.message);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
const failures = cases.filter((p) => !p).length;
console.log(`\n${cases.length} cases -> ${failures ? `${failures} FAIL` : 'PASS'}`);
if (failures) process.exitCode = 1;
