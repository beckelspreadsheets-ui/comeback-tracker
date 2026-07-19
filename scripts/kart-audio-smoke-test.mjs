// Kart audio smoke — spawns dev:kart, drives the race with trusted keyboard
// input (which doubles as the audio-unlock gesture), and asserts:
//   1. telemetry reports audioRunning after the first gesture
//   2. a full drift + release fires without console errors (cue recipes all
//      execute through the transition detector)
//   3. the HUD mute toggle flips state, persists to localStorage, and survives
//      a reload
// Runs headless with autoplay allowed — the in-page unlock still goes through
// the real gesture listeners.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.KART_AUDIO_SMOKE_PORT || 5303);
const baseUrl = process.env.KART_AUDIO_SMOKE_URL || `http://127.0.0.1:${port}`;
const outputDir = path.join(root, 'tmp', 'kart-audio-smoke');
let serverLog = '';

const fail = (message, detail = {}) => {
  const error = new Error(message);
  error.detail = detail;
  throw error;
};

const stopServer = (server) => {
  if (!server?.pid) return;
  try {
    if (process.platform === 'win32') server.kill('SIGTERM');
    else process.kill(-server.pid, 'SIGTERM');
  } catch {
    server.kill('SIGTERM');
  }
};

const waitForServer = async (url, timeoutMs = 30000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  fail('Vite server did not become ready', { url });
};

const telemetry = (page) => page.evaluate(() => window.__comebackCityKartTelemetry || null);

const pageFacts = (page) =>
  page
    .evaluate(() => ({
      bodyText: document.body.innerText.slice(0, 500),
      kartRaceMounted: Boolean(document.querySelector('[data-testid="comeback-city-3d-kart-race"]')),
      raceScreenMounted: Boolean(document.querySelector('[data-testid="race-screen"]')),
      title: document.title,
      url: window.location.href,
    }))
    .catch(() => null);

const waitForTelemetry = async (page, predicate, label, timeout = 60000) => {
  try {
    await page.waitForFunction(predicate, null, { timeout });
  } catch (error) {
    fail(`${label} timed out`, {
      page: await pageFacts(page),
      serverLog: serverLog.slice(-4000),
      telemetry: await telemetry(page).catch(() => null),
      waitError: String(error),
    });
  }
};

const run = async () => {
  await mkdir(outputDir, { recursive: true });
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const server = process.env.KART_AUDIO_SMOKE_URL
    ? null
    : spawn(npm, ['run', 'dev:kart', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
        cwd: root,
        detached: process.platform !== 'win32',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
  server?.stdout?.on('data', (chunk) => {
    serverLog += chunk.toString();
  });
  server?.stderr?.on('data', (chunk) => {
    serverLog += chunk.toString();
  });
  let browser = null;
  const checks = [];
  const check = (name, ok, detail = null) => {
    checks.push({ name, ok, ...(detail ? { detail } : {}) });
    if (!ok) fail(`check failed: ${name}`, detail || {});
  };
  try {
    if (server) await waitForServer(baseUrl);
    browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    const consoleErrors = [];
    page.on('pageerror', (error) => consoleErrors.push(String(error)));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await page.goto(`${baseUrl}/#race`, { waitUntil: 'domcontentloaded' });
    await waitForTelemetry(
      page,
      () => window.__comebackCityKartTelemetry?.renderer === 'three-kart',
      'three-kart telemetry'
    );

    check('toggle rendered', (await page.locator('[data-testid="race-audio-toggle"]').count()) === 1);
    const before = await telemetry(page);
    check('audio idle before gesture', before.audioRunning === false, { before: before.audioRunning });

    await waitForTelemetry(
      page,
      () => window.__comebackCityKartTelemetry?.countdown <= 0,
      'race countdown'
    );
    // Trusted keyboard input = the unlock gesture AND the drive.
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(1500);
    const running = await telemetry(page);
    check('audio running after gesture', running.audioRunning === true, {
      audioMuted: running.audioMuted,
      audioRunning: running.audioRunning,
    });

    // Full drift chain: start → tier 1-3 chirps → release → mini-turbo cue.
    await page.keyboard.down('ArrowRight');
    await page.keyboard.down('Space');
    try {
      await waitForTelemetry(
        page,
        () => (window.__comebackCityKartTelemetry?.driftTier || 0) >= 3,
        'drift tier 3 charge',
        20000
      );
    } finally {
      await page.keyboard.up('Space');
    }
    await page.waitForTimeout(400);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('ArrowUp');
    const banked = await telemetry(page);
    check('drift chain drove cues', banked.miniTurboTier === 3 || banked.miniTurbo > 0, {
      miniTurbo: banked.miniTurbo,
      miniTurboTier: banked.miniTurboTier,
    });

    // Mute toggle: flips telemetry + attribute, persists across reload.
    await page.click('[data-testid="race-audio-toggle"]');
    await page.waitForTimeout(300);
    const muted = await telemetry(page);
    check('mute toggles telemetry', muted.audioMuted === true, { audioMuted: muted.audioMuted });
    check(
      'mute attribute set',
      (await page.getAttribute('[data-testid="race-audio-toggle"]', 'data-audio-muted')) === '1'
    );
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForTelemetry(
      page,
      () => window.__comebackCityKartTelemetry?.renderer === 'three-kart',
      'three-kart telemetry after reload'
    );
    check(
      'mute persists reload',
      (await page.getAttribute('[data-testid="race-audio-toggle"]', 'data-audio-muted')) === '1'
    );
    await page.click('[data-testid="race-audio-toggle"]');
    check(
      'unmute restores',
      (await page.getAttribute('[data-testid="race-audio-toggle"]', 'data-audio-muted')) === '0'
    );

    check('zero console errors', consoleErrors.length === 0, { consoleErrors });

    const report = { baseUrl, checks, pass: true };
    await writeFile(path.join(outputDir, 'kart-audio-smoke-report.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    const report = { baseUrl, checks, error: String(error), detail: error.detail || null, pass: false };
    await writeFile(path.join(outputDir, 'kart-audio-smoke-report.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } finally {
    await browser?.close();
    stopServer(server);
  }
};

run();
