#!/usr/bin/env node
// Graphics-comparison capture harness (Hermes graphics overhaul).
// Spawns the kart preview server (dist-kart) on a throwaway port, drives the
// shipped autoplay race in headless Chromium, and saves a set of labeled
// screenshots per track for before/after comparison. Pure read-only capture —
// touches no game code, no physics. Screenshots land in graphics-comparison/.
//
// Usage:
//   node scripts/graphics-capture.mjs <label>            # e.g. before | after-p1
//   GRAPHICS_CAPTURE_PORT=5417 node scripts/graphics-capture.mjs before
//
// NOTE: headless FPS is never quotable (SwiftShader) — this is a LOOK
// comparison harness, not a perf gate. Perf stays with the headed phase5 pair.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.GRAPHICS_CAPTURE_PORT || 5417);
const baseUrl = `http://127.0.0.1:${port}`;
const label = process.argv[2] || 'shot';
const outDir = path.join(root, 'graphics-comparison');

const waitForServer = async (url, timeoutMs = 45000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  throw new Error(`Server did not become ready: ${url}`);
};

const TRACKS = [
  { key: 'comeback-city', short: 'cc' },
  { key: 'penguin-village', short: 'pv' },
];

// Progress waypoints (fraction of lap) to pause autoplay and photograph. The
// autoplay drives at race pace; we sample telemetry until routeProgress enters
// each window, freeze via screenshot. Waypoints chosen to cover: start
// straight, a corner, the bridge/crest, and a boost-pad straight.
const SHOTS = [
  { name: 'start', min: 0.055, max: 0.09 },
  { name: 'corner', min: 0.2, max: 0.26 },
  { name: 'mid', min: 0.46, max: 0.52 },
  { name: 'boost', min: 0.66, max: 0.72 },
];

const captureTrack = async (browser, track) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));
  const url = `${baseUrl}/?track=${track.key}&playableAutoplay=1#race`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // NOTE the explicit `undefined` second arg: waitForFunction's signature is
  // (pageFunction, arg, options) — passing options as arg silently drops the
  // timeout override and the call dies at the 30s default (SwiftShader boots
  // the WebGL context slowly and the kart/avatar GLBs stream in over HTTP, so
  // the dt-dilated countdown needs ~40s before the kart moves; 120s is safe).
  await page.waitForFunction(
    () => window.__comebackCityKartTelemetry && window.__comebackCityKartTelemetry.raceTime > 0.5,
    undefined,
    { timeout: 120000, polling: 250 }
  );
  const taken = new Set();
  const deadline = Date.now() + 90000;
  while (taken.size < SHOTS.length && Date.now() < deadline) {
    const progress = await page.evaluate(() => window.__comebackCityKartTelemetry?.routeProgress ?? 0);
    for (const shot of SHOTS) {
      if (taken.has(shot.name)) continue;
      // routeProgress wraps 0..1 per lap; sample when inside the window.
      if (progress >= shot.min && progress <= shot.max) {
        taken.add(shot.name);
        const file = path.join(outDir, `${label}-${track.short}-${shot.name}.png`);
        await page.screenshot({ path: file });
        console.log(`captured ${file}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 90));
  }
  await page.close();
  return { consoleErrors, taken: [...taken] };
};

const main = async () => {
  await mkdir(outDir, { recursive: true });
  const server = spawn('npm', ['run', 'preview:kart', '--', '--port', String(port), '--strictPort'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverLog = '';
  server.stdout.on('data', (d) => (serverLog += d));
  server.stderr.on('data', (d) => (serverLog += d));
  try {
    await waitForServer(`${baseUrl}/index.kart.html`);
    const browser = await chromium.launch({
      args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
    });
    const summary = {};
    for (const track of TRACKS) {
      summary[track.key] = await captureTrack(browser, track);
    }
    await browser.close();
    const anyErrors = Object.values(summary).flatMap((s) => s.consoleErrors);
    console.log(JSON.stringify({ label, summary, consoleErrorCount: anyErrors.length }, null, 2));
    if (anyErrors.length) {
      console.error('CONSOLE ERRORS:\n' + anyErrors.slice(0, 10).join('\n'));
    }
  } finally {
    server.kill('SIGTERM');
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
