// H8 sky lab round 2: in-game composite captures — the picked backdrop
// directions (CC v1 neon metropolis / PV v2 storm front) regenerated as
// production layer strips and mounted as parallax billboard rings behind
// ?skyLab=1 (see the H8 block in ComebackCityThreeKartRace.jsx createScene;
// window.__skyLabOverrides = { far, near } swaps candidate strips).
// Shots are telemetry routeProgress-keyed (never wall-clock) with a
// no-flag control per track. Shipped default is untouched until the owner
// approves the composite and the strips are promoted to
// src/assets/game/generated/ with manifest entries + similarity review.
// HARD RULE: never run concurrently with another vite-spawning suite.
// Output: tmp/m3-sky-lab/composite-<track>-<take>-p0p15|p0p55.png +
// composite-<track>-control-p0p15.png, composite-telemetry.json, and the
// round-2 section data for sky-lab.html.
// Regen: node tmp/m3-sky-lab/capture-sky-composite.mjs
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const PORT = 5316; // 5195 phase5 / 5197 b4 / 5304 portraits / 5313 palette / 5314 rim / 5315 moments

const SHOT_PROGRESS = [
  { key: 'p0p15', progress: 0.15 },
  { key: 'p0p55', progress: 0.55 },
];

// take key -> strip override map (a/b takes of far and near per track).
const RUNS = [
  { key: 'control', overrides: null, skyLab: false, track: 'comeback-city' },
  { key: 'take-a', overrides: null, skyLab: true, track: 'comeback-city' },
  {
    key: 'take-b',
    overrides: { far: '/tmp/m3-sky-lab/production/cc-far-b.webp', near: '/tmp/m3-sky-lab/production/cc-near-b.webp' },
    skyLab: true,
    track: 'comeback-city',
  },
  { key: 'control', overrides: null, skyLab: false, track: 'penguin-village' },
  { key: 'take-a', overrides: null, skyLab: true, track: 'penguin-village' },
  {
    key: 'take-b',
    overrides: { far: '/tmp/m3-sky-lab/production/pv-far-b.webp', near: '/tmp/m3-sky-lab/production/pv-near-b.webp' },
    skyLab: true,
    track: 'penguin-village',
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

const captureRun = async (browser, run) => {
  const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleErrors.push(`[${message.type()}] ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => consoleErrors.push(`[pageerror] ${error.message}`));
  if (run.overrides) {
    await page.addInitScript((overrides) => {
      window.__skyLabOverrides = overrides;
    }, run.overrides);
  }
  const flag = run.skyLab ? '&skyLab=1' : '';
  await page.goto(`http://127.0.0.1:${PORT}/?playableAutoplay=1&track=${run.track}${flag}#race`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
    timeout: 30000,
  });
  const shots = [];
  for (const shot of SHOT_PROGRESS) {
    if (run.key === 'control' && shot.key !== 'p0p15') continue; // one control beat is enough
    await page.waitForFunction(
      (target) => (window.__comebackCityKartTelemetry?.routeProgress || 0) >= target,
      shot.progress,
      { timeout: 120000 }
    );
    const telemetry = await page.evaluate(() => {
      const t = window.__comebackCityKartTelemetry;
      return { fpsEstimate: t.fpsEstimate, frameWorkMs: t.frameWorkMs, routeProgress: t.routeProgress };
    });
    const file = `composite-${run.track}-${run.key}-${shot.key}.png`;
    await page.screenshot({ path: path.join(__dirname, file) });
    shots.push({ file, telemetry });
    console.log(`captured ${file} (routeProgress=${telemetry.routeProgress}, workMs=${telemetry.frameWorkMs?.toFixed?.(2)})`);
  }
  await page.close();
  const shaderErrors = consoleErrors.filter(
    (line) => !line.startsWith('[warning]') && /shader|webgl|glsl|program/i.test(line)
  );
  if (shaderErrors.length) {
    throw new Error(`${run.track}/${run.key}: shader/WebGL console errors:\n${shaderErrors.join('\n')}`);
  }
  return { consoleErrors: consoleErrors.length, run: `${run.track}/${run.key}`, shots };
};

const run = async () => {
  const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  });
  let browser = null;
  const results = [];
  try {
    await waitForServer();
    browser = await chromium.launch();
    for (const entry of RUNS) {
      results.push(await captureRun(browser, entry));
    }
    await writeFile(path.join(__dirname, 'composite-telemetry.json'), `${JSON.stringify(results, null, 2)}\n`);
    console.log('composite captures complete');
  } finally {
    await browser?.close();
    server.kill();
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
