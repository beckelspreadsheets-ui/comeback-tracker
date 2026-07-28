// AAA visual capture harness.
//
// The shared eye for the AAA overhaul: boots the KART app, drives an autoplay
// race, and screenshots at fixed routeProgress marks so any two builds can be
// compared frame-for-frame. Every implementer and every critic uses THIS
// script, so "before" and "after" are captured under identical conditions.
//
//   node scripts/aaa-visual-capture.mjs --label baseline
//   node scripts/aaa-visual-capture.mjs --label lighting-v3 --track penguin-village
//   node scripts/aaa-visual-capture.mjs --label x --points 0.12,0.44,0.71 --query "&post=0"
//
// Output: tmp/aaa-visual/<label>/<track>-p<progress>.png  + capture-manifest.json
//
// Notes:
//  - navigator.webdriver skips intro/select, so ?track= deep-links straight
//    into the race (see KartApp.jsx).
//  - dev:kart is the default server (fast iteration). Pass --server preview:kart
//    to shoot the real production build instead (requires `npm run build:kart`).
//  - The port is deliberately off the owner's 5173/5174 dev servers.
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1] !== undefined) return argv[index + 1];
  return fallback;
};
const flag = (name) => argv.includes(`--${name}`);

const LABEL = arg('label', 'scratch');
const SERVER_MODE = arg('server', 'dev:kart');
const PORT = Number(arg('port', process.env.AAA_CAPTURE_PORT || 5411));
const WIDTH = Number(arg('width', 1600));
const HEIGHT = Number(arg('height', 900));
const EXTRA_QUERY = arg('query', '');
const OUT_ROOT = arg('out', path.join(root, 'tmp', 'aaa-visual'));
const TIMEOUT_MS = Number(arg('timeout', 150000));
const KEEP = flag('keep');

// Progress marks chosen to cover every visual system on both tracks:
// start pack, straight, corner + curb, elevated/bridge section, item boxes,
// crest/launch, descent, final approach.
const DEFAULT_POINTS = [0.06, 0.15, 0.24, 0.33, 0.45, 0.56, 0.67, 0.78, 0.9];
const POINTS = arg('points')
  ? arg('points').split(',').map((value) => Number(value.trim())).filter((value) => Number.isFinite(value))
  : DEFAULT_POINTS;

const TRACKS = arg('track') ? arg('track').split(',').map((t) => t.trim()) : ['comeback-city', 'penguin-village'];

const outDir = path.join(OUT_ROOT, LABEL);
if (existsSync(outDir) && !KEEP) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const log = (...args) => console.log('[aaa-capture]', ...args);

const waitForServer = async (url, deadlineMs) => {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok || response.status === 404) return true;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  return false;
};

const server = spawn(
  'npm',
  ['run', SERVER_MODE, '--', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
  { cwd: root, stdio: 'ignore' }
);

const manifest = {
  label: LABEL,
  server: SERVER_MODE,
  viewport: { width: WIDTH, height: HEIGHT },
  points: POINTS,
  tracks: {},
  consoleErrors: [],
  capturedAt: new Date().toISOString(),
};

let exitCode = 0;
let browser = null;

try {
  const up = await waitForServer(`http://127.0.0.1:${PORT}/`, 60000);
  if (!up) throw new Error(`server ${SERVER_MODE} never came up on port ${PORT}`);

  // GPU-less CI runners have no ANGLE backend to fall back from, so the GL
  // flags are overridable: AAA_CAPTURE_GL=swiftshader on GitHub Actions.
  const glArgs =
    process.env.AAA_CAPTURE_GL === 'swiftshader'
      ? ['--use-gl=swiftshader', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
      : ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'];
  browser = await chromium.launch({ args: glArgs });

  for (const track of TRACKS) {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text().slice(0, 300));
    });
    page.on('pageerror', (error) => errors.push(`pageerror: ${String(error).slice(0, 300)}`));

    const url = `http://127.0.0.1:${PORT}/?playableAutoplay=1&track=${track}${EXTRA_QUERY}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => window.__comebackCityKartTelemetry?.renderer === 'three-kart',
      null,
      { timeout: 45000 }
    );
    // Let GLBs stream in and the countdown clear before the first frame counts.
    await page.waitForFunction(
      () => (window.__comebackCityKartTelemetry?.countdown ?? 99) <= 0,
      null,
      { timeout: 45000 }
    );
    await page.waitForTimeout(600);

    const captured = [];
    const pending = new Set(POINTS);
    const deadline = Date.now() + TIMEOUT_MS;
    let lastProgress = -1;
    let laps = 0;

    while (pending.size && Date.now() < deadline) {
      const telemetry = await page.evaluate(() => {
        const t = window.__comebackCityKartTelemetry || {};
        // Field names come from publishTelemetry in ComebackCityThreeKartRace.jsx:
        // fps is `fpsEstimate`, and draw calls / triangles live under
        // `rendererStats`. Reading `t.fps` / `t.drawCalls` silently yields null,
        // which is what made the first baseline capture unmeasurable.
        const stats = t.rendererStats || {};
        return {
          finished: Boolean(t.finished),
          progress: t.routeProgress ?? -1,
          fps: t.fpsEstimate ?? null,
          frameWorkMs: t.frameWorkMs ?? null,
          frameElapsedMs: t.frameElapsedMs ?? null,
          drawCalls: stats.calls ?? stats.drawCalls ?? null,
          triangles: stats.triangles ?? null,
          programs: stats.programs ?? null,
          geometries: stats.geometries ?? null,
          textures: stats.textures ?? null,
          speed: t.speed ?? null,
        };
      });
      if (telemetry.progress < lastProgress - 0.5) laps += 1;
      lastProgress = telemetry.progress;
      if (telemetry.finished) break;

      for (const target of [...pending]) {
        if (Math.abs(telemetry.progress - target) < 0.008) {
          pending.delete(target);
          const file = `${track}-p${String(target).replace('.', '_')}.png`;
          await page.screenshot({ path: path.join(outDir, file) });
          captured.push({ point: target, file, ...telemetry });
        }
      }
      await page.waitForTimeout(30);
    }

    manifest.tracks[track] = {
      captured: captured.sort((a, b) => a.point - b.point),
      missed: [...pending],
      laps,
      consoleErrors: errors.slice(0, 20),
    };
    manifest.consoleErrors.push(...errors.slice(0, 10).map((text) => `${track}: ${text}`));
    log(`${track}: ${captured.length}/${POINTS.length} captured, ${errors.length} console errors`);
    if (pending.size) log(`${track}: MISSED ${[...pending].join(', ')}`);
    await page.close();
  }
} catch (error) {
  exitCode = 1;
  manifest.error = String(error?.message || error);
  log('FAILED:', manifest.error);
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  setTimeout(() => server.kill('SIGKILL'), 2500).unref?.();
  writeFileSync(path.join(outDir, 'capture-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  log(`manifest → ${path.relative(root, path.join(outDir, 'capture-manifest.json'))}`);
}

process.exit(exitCode);
