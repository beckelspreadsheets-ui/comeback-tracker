import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { RACE_TRACKS } from '../src/game/raceTracks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.RACE_PLAYTEST_PORT || 5187);
const baseUrl = `http://127.0.0.1:${port}`;
const screenshotsDir = path.join(root, 'tmp', 'race-playtests');

const fail = (message, detail = {}) => {
  const error = new Error(message);
  error.detail = detail;
  throw error;
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

const run = async () => {
  await mkdir(screenshotsDir, { recursive: true });
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const server = spawn(npm, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverLog = '';
  server.stdout.on('data', (chunk) => {
    serverLog += chunk.toString();
  });
  server.stderr.on('data', (chunk) => {
    serverLog += chunk.toString();
  });

  let browser;
  const results = [];
  try {
    await waitForServer(`${baseUrl}/race-playtest.html`);
    browser = await chromium.launch({
      args: ['--ignore-gpu-blocklist', '--use-gl=swiftshader'],
      headless: true,
    });

    for (const track of RACE_TRACKS) {
      for (const mode of ['free-switch', 'vehicle-restricted']) {
        for (let raceIndex = 1; raceIndex <= 3; raceIndex += 1) {
          const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
          const pageErrors = [];
          page.on('pageerror', (error) => pageErrors.push(error.message));
          page.on('console', (message) => {
            if (message.type() === 'error') pageErrors.push(message.text());
          });

          const url = `${baseUrl}/race-playtest.html?raceAutoplay=1&raceTrack=${track.key}&raceMode=${mode}&raceIndex=${raceIndex}`;
          await page.goto(url, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('canvas', { timeout: 15000 });
          const canvasDataUrlLength = await page.$eval('canvas', (canvas) => canvas.toDataURL('image/png').length);
          if (canvasDataUrlLength < 1200) fail('Race canvas rendered blank', { mode, raceIndex, track: track.key });
          await page.screenshot({
            fullPage: false,
            path: path.join(screenshotsDir, `${track.key}-${mode}-${raceIndex}.png`),
          });
          try {
            await page.waitForFunction(() => window.__raceHarnessFinish || window.__racePlaytestResult, null, {
              timeout: 30000,
            });
          } catch {
            const debugState = await page.evaluate(() => ({
              events: window.__racePlaytestEvents?.slice(-12),
              text: document.body.innerText.slice(0, 700),
            }));
            fail('Race did not finish before browser timeout', { debugState, errors: pageErrors, mode, raceIndex, track: track.key });
          }
          const result = await page.evaluate(() => window.__raceHarnessFinish || window.__racePlaytestResult);
          if (pageErrors.length) fail('Browser console errors during race playtest', { errors: pageErrors, mode, raceIndex, track: track.key });
          if (!result || result.trackKey !== track.key) fail('Race did not report a matching finish result', { mode, raceIndex, result, track: track.key });
          if (!Number.isFinite(result.time) || result.time <= 0) fail('Race finish time was invalid', { mode, raceIndex, result, track: track.key });
          const telemetry = result.playtest || {};
          for (const layer of ['ground', 'air', 'hybrid']) {
            if (!telemetry.layers?.includes(layer)) fail('Autoplay did not exercise all route layers', { layer, mode, raceIndex, telemetry, track: track.key });
          }
          for (const vehicle of ['kart', 'plane']) {
            if (!telemetry.vehicles?.includes(vehicle)) fail('Autoplay did not exercise required vehicles', { mode, raceIndex, telemetry, track: track.key, vehicle });
          }
          if (!telemetry.signatureUsed) fail('Track signature item was not activated', { mode, raceIndex, telemetry, track: track.key });
          if ((telemetry.itemUses || 0) < 1) fail('No item activation was recorded', { mode, raceIndex, telemetry, track: track.key });
          if ((telemetry.itemBoxesCollected || 0) < 1) fail('No item box pickup was recorded', { mode, raceIndex, telemetry, track: track.key });
          if ((telemetry.bananaMax || 0) < 16 || (telemetry.upgrades || 0) < 3) fail('Banana economy upgrades were not exercised', { mode, raceIndex, telemetry, track: track.key });
          if ((track.switchPads || []).length && (telemetry.switchPads || 0) < 1) fail('Switch pads were not crossed', { mode, raceIndex, telemetry, track: track.key });
          if ((track.vehicleZones || []).length && (telemetry.zones || 0) < 1) fail('Vehicle-only zones were not crossed', { mode, raceIndex, telemetry, track: track.key });
          if ((track.vehicleLocks || []).length && (telemetry.locks || 0) < 1) fail('Vehicle-locked sections were not crossed', { mode, raceIndex, telemetry, track: track.key });
          if ((telemetry.hazardsEncountered || 0) <= 0) fail('No active track hazards were encountered', { mode, raceIndex, telemetry, track: track.key });

          results.push({
            bestLap: result.bestLap,
            mode,
            place: result.place,
            raceIndex,
            time: result.time,
            trackKey: track.key,
          });
          await page.close();
        }
      }
    }
  } catch (error) {
    if (serverLog) error.serverLog = serverLog.slice(-4000);
    throw error;
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }

  console.log(JSON.stringify({ races: results.length, results }, null, 2));
};

run().catch((error) => {
  console.error(error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  if (error.serverLog) console.error(error.serverLog);
  process.exit(1);
});
