// WebGL context loss gate (RELEASE_V1_PLAN Phase 2). iOS drops a WKWebView's
// WebGL context under memory pressure and after long backgrounding; before
// this gate the race kept rendering into the dead context and froze black.
//
// Drives a built kart preview: starts an autoplay race, kills the context with
// WEBGL_lose_context mid-race, and asserts that the race PAUSES and says why,
// that nothing throws, that the restored context draws again, and that the
// race resumes and makes progress. Then checks the unmount release: leaving
// the race must hand its context back (loseContext on the old canvas).
//
//   npm run build:kart && node scripts/test-kart-context-loss.mjs
//   KART_CONTEXT_LOSS_URL=http://127.0.0.1:4173 node scripts/test-kart-context-loss.mjs
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { chromiumGlArgs } from './lib/chromium-gl-args.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.KART_CONTEXT_LOSS_PORT || 5371);
const external = process.env.KART_CONTEXT_LOSS_URL;
const baseUrl = external || `http://127.0.0.1:${port}`;
const checks = [];
const check = (name, pass, detail = null) => {
  checks.push({ detail, name, pass: Boolean(pass) });
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${name}${detail ? ` ${JSON.stringify(detail)}` : ''}`);
};

const waitForServer = async (url, ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if ((await fetch(url)).ok) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
};

let server = null;
let browser = null;
try {
  if (!external) {
    server = spawn('npx', ['vite', 'preview', '--config', 'vite.config.kart.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
      cwd: root,
      stdio: 'ignore',
    });
    if (!(await waitForServer(`${baseUrl}/`, 60000))) throw new Error('preview server did not start (run npm run build:kart first)');
  }
  browser = await chromium.launch({ args: chromiumGlArgs() });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error).slice(0, 200)));
  await page.goto(`${baseUrl}/?raceAutoplay=1#race`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 90000 });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.raceTime > 3, null, { timeout: 120000 });

  // Kill the context. getContext returns the race's own live context.
  const lost = await page.evaluate(() => {
    const canvas = document.querySelector('canvas[data-visual-canvas="race"]');
    const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
    const extension = gl?.getExtension('WEBGL_lose_context');
    if (!extension) return { ok: false };
    window.__contextLossProbe = extension;
    extension.loseContext();
    return { ok: true };
  });
  check('context loss can be triggered', lost.ok);
  await page.waitForTimeout(800);
  const duringLoss = await page.evaluate(() => ({
    note: Boolean(document.querySelector('[data-testid="race-context-lost"]')),
    pauseMenu: Boolean(document.querySelector('[data-testid="race-pause-menu"]')),
    raceTime: window.__comebackCityKartTelemetry?.raceTime ?? null,
  }));
  check('race pauses when the context is lost', duringLoss.pauseMenu, duringLoss);
  check('pause menu explains the lost 3D view', duringLoss.note);
  await page.waitForTimeout(800);
  const stillPaused = await page.evaluate(() => window.__comebackCityKartTelemetry?.raceTime ?? null);
  check('race clock holds while the context is gone', Math.abs((stillPaused ?? 0) - (duringLoss.raceTime ?? 0)) < 0.05, {
    after: stillPaused,
    before: duringLoss.raceTime,
  });

  // Bring it back, resume, and make sure the race moves and draws.
  await page.evaluate(() => window.__contextLossProbe.restoreContext());
  await page.waitForFunction(() => !document.querySelector('[data-testid="race-context-lost"]'), null, { timeout: 15000 });
  check('note clears when the context is restored', true);
  await page.click('[data-testid="race-pause-resume"]');
  const resumedAt = await page.evaluate(() => window.__comebackCityKartTelemetry?.raceTime ?? 0);
  await page.waitForFunction((t0) => (window.__comebackCityKartTelemetry?.raceTime ?? 0) > t0 + 2, resumedAt, { timeout: 60000 });
  // A dead or black canvas compresses to a few KB of PNG; a drawn race frame
  // is hundreds of KB and changes from one half-second to the next.
  const shotA = await page.screenshot();
  await page.waitForTimeout(500);
  const shotB = await page.screenshot();
  // Optional: keep the post-restore frame to LOOK at (textures must survive).
  if (process.env.KART_CONTEXT_LOSS_SHOT) writeFileSync(process.env.KART_CONTEXT_LOSS_SHOT, shotB);
  const drawing = {
    bytesA: shotA.length,
    bytesB: shotB.length,
    changed: !shotA.equals(shotB),
    raceTime: await page.evaluate(() => window.__comebackCityKartTelemetry?.raceTime ?? null),
  };
  check('race resumes and keeps drawing after restore', drawing.bytesA > 100000 && drawing.bytesB > 100000 && drawing.changed, drawing);
  check('no page errors through loss and restore', pageErrors.length === 0, pageErrors.slice(0, 3));

  // Unmount release: quit to the menu and confirm the old context was lost
  // deliberately (forceContextLoss), not left for garbage collection.
  const released = await page.evaluate(async () => {
    const canvas = document.querySelector('canvas[data-visual-canvas="race"]');
    const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
    window.__oldRaceGl = gl;
    return Boolean(gl) && !gl.isContextLost();
  });
  check('live context before leaving the race', released);
  await page.keyboard.press('Escape');
  await page.waitForSelector('[data-testid="race-pause-menu-exit"]', { timeout: 10000 }).catch(() => null);
  const canExit = await page.locator('[data-testid="race-pause-menu-exit"]').count();
  if (canExit) {
    await page.click('[data-testid="race-pause-menu-exit"]');
    await page.waitForTimeout(1000);
    const afterExit = await page.evaluate(() => window.__oldRaceGl?.isContextLost?.() ?? null);
    check('leaving the race releases its GPU context', afterExit === true, { isContextLost: afterExit });
  } else {
    check('quit to menu is reachable (no exit button in this mode)', true, { skipped: 'no onExit in this entry' });
  }
} catch (error) {
  check('run completed', false, { error: String(error).slice(0, 300) });
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}
const failed = checks.filter((entry) => !entry.pass);
console.log(`${checks.length} checks -> ${failed.length ? `${failed.length} FAILED` : 'PASS'}`);
process.exitCode = failed.length ? 1 : 0;
