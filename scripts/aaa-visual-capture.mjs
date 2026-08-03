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
// THE RACE DEADLINE IS WALL TIME; THE RACE ADVANCES IN GAME TIME.
//
// This is why CI capture reached 2 of 9 marks. The boot budget below and the
// screenshot budget were both widened for software rendering; this one was not,
// and it is the one that bounds the race. Under SwiftShader rAF runs at ~2 fps
// and the engine clamps dt to ~1/24 s per frame, so game time advances at
// roughly 8% of wall time (see scripts/lib/chromium-gl-args.mjs).
//
// The last mark is at progress 0.9 of lap 1. A Comeback City lap is 47.45 s of
// game time (measured, scripts/measure-mean-speed.mjs), so reaching that mark
// costs ~42.7 s of game time = ~510 s of wall time. Against a 150 s deadline the
// loop expires having reached ~12.5 s of game time, i.e. progress ~0.26 — which
// covers marks 0.06, 0.15 and 0.24, and boot overhead eats one of those. Two.
//
// So the earlier hypothesis — "the race ends in game time before later marks
// arrive" — was backwards. The race does not end early; it barely starts. The
// loop exits as soon as every mark is captured, so this only has to cover the
// first 90% of one lap, not a whole race.
const SOFTWARE_RACE_MS = 900000;
const TIMEOUT_MS = Number(arg('timeout', process.env.AAA_CAPTURE_GL === 'swiftshader' ? SOFTWARE_RACE_MS : 150000));
const KEEP = flag('keep');
// Software rasterisation (CI, no GPU) is roughly two orders of magnitude
// slower than a real GPU here, so every browser-side deadline needs widening.
const SOFTWARE_GL = process.env.AAA_CAPTURE_GL === 'swiftshader';
const SHOT_TIMEOUT_MS = SOFTWARE_GL ? 120000 : 30000;

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

  // GPU-less CI runners need software rasterisation. Current Chromium dropped
  // --use-gl=swiftshader; the working combination is ANGLE pointed at the
  // SwiftShader backend, and without --enable-unsafe-swiftshader the context
  // creation fails SILENTLY and the app falls back to its 2D renderer with no
  // console error at all — which is exactly how the first CI run wasted 45s.
  const glArgs =
    process.env.AAA_CAPTURE_GL === 'swiftshader'
      ? [
          '--use-gl=angle',
          '--use-angle=swiftshader',
          '--enable-unsafe-swiftshader',
          '--disable-gpu-sandbox',
          '--no-sandbox',
        ]
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

    // A dead WebGL context makes the app fall back to its 2D renderer WITHOUT
    // logging anything, so waiting on the telemetry just times out with no
    // explanation. Probe the context first and say what is actually wrong.
    const gl = await page.evaluate(() => {
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!context) return { ok: false, reason: 'no webgl context' };
        const info = context.getExtension('WEBGL_debug_renderer_info');
        return {
          ok: true,
          renderer: info ? context.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown',
        };
      } catch (error) {
        return { ok: false, reason: String(error).slice(0, 200) };
      }
    });
    if (!gl.ok) throw new Error(`WebGL unavailable in this browser (${gl.reason}) — the app will fall back to 2D and never report the three-kart renderer`);
    log(`${track}: WebGL via ${gl.renderer}`);

    // Software rasterisation compiles every shader on the CPU and this scene
    // has ~45 programs, so first paint takes minutes rather than seconds. A
    // 45s boot budget is a GPU-machine assumption.
    const bootMs = SOFTWARE_GL ? 300000 : 45000;
    await page.waitForFunction(
      () => window.__comebackCityKartTelemetry?.renderer === 'three-kart',
      null,
      { timeout: bootMs }
    );
    // Let GLBs stream in and the countdown clear before the first frame counts.
    await page.waitForFunction(
      () => (window.__comebackCityKartTelemetry?.countdown ?? 99) <= 0,
      null,
      { timeout: bootMs }
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
      const previousProgress = lastProgress;
      if (telemetry.progress < lastProgress - 0.5) laps += 1;
      lastProgress = telemetry.progress;
      if (telemetry.finished) break;

      for (const target of [...pending]) {
        // Fire on CROSSING the mark, not on landing within an epsilon of it.
        // Under software rendering the frame rate drops far enough that
        // progress steps straight over a narrow window — that is how the first
        // CI run captured 0/9. Compare against the PREVIOUS sample, not the
        // one we just stored, or the test can never be true. previousProgress
        // starts at -1 so the first sample cannot spuriously satisfy it, and a
        // lap wrap (progress jumping back toward 0) fails the < target half.
        const crossed = previousProgress >= 0 && previousProgress < target && telemetry.progress >= target;
        if (crossed || Math.abs(telemetry.progress - target) < 0.008) {
          pending.delete(target);
          const file = `${track}-p${String(target).replace('.', '_')}.png`;
          // Playwright's 30s screenshot default assumes a GPU. Under
          // SwiftShader the page renders at 1-2fps and a single capture can
          // exceed it — that is what killed the second CI run after it had
          // already booted and raced successfully.
          await page.screenshot({ path: path.join(outDir, file), timeout: SHOT_TIMEOUT_MS });
          captured.push({ point: target, file, ...telemetry });
        }
      }
      await page.waitForTimeout(30);
    }

    // Say WHY marks were missed. "MISSED 0.33, 0.45, ..." is indistinguishable
    // between a broken game and a deadline that expired, and that ambiguity is
    // what left the 2-of-9 result unexplained for two waves.
    const ranOut = Date.now() >= deadline;
    manifest.tracks[track] = {
      captured: captured.sort((a, b) => a.point - b.point),
      missed: [...pending],
      laps,
      lastProgress,
      timedOut: ranOut,
      consoleErrors: errors.slice(0, 20),
    };
    manifest.consoleErrors.push(...errors.slice(0, 10).map((text) => `${track}: ${text}`));
    log(`${track}: ${captured.length}/${POINTS.length} captured, ${errors.length} console errors`);
    if (pending.size) {
      log(`${track}: MISSED ${[...pending].join(', ')}`);
      if (ranOut) {
        log(
          `${track}: the ${Math.round(TIMEOUT_MS / 1000)}s WALL-CLOCK deadline expired at progress ` +
            `${lastProgress.toFixed(3)} — the race did not stall, it ran out of real time. ` +
            `Game time advances at ~8% of wall time under software rendering; raise --timeout.`
        );
      }
    }
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
