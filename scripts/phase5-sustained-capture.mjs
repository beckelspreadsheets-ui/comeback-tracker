#!/usr/bin/env node
/**
 * Sustained FPS capture for the SHIPPED kart racer (A2 instrument).
 *
 * Canonical protocol (PRD §4.2 / exec plan "Canonical measurement protocol"):
 * HEADED Chromium against a PRODUCTION build (`npm run build` + vite preview),
 * app-shell route /?raceAutoplay=1&track=<key>#race, reading the
 * frameElapsedMs/frameWorkMs telemetry. Three runs, take the median.
 * Reference hardware: owner's Mac mini (M4, Chrome).
 *
 * Modes (env):
 *   PHASE5_HEADED=1              headed run — REQUIRED for trusted baselines
 *                                (headless Chromium rAF-throttles; the void
 *                                22.7-FPS "crisis" was headless+legacy).
 *   PHASE5_TARGET=shipped        (default) production build via vite preview
 *   PHASE5_TARGET=shipped-dev    dev-server kart-playtest.html harness —
 *                                DIAGNOSTIC ONLY, never a baseline
 *   PHASE5_TARGET=legacy         old ArcadeRace3D race-playtest.html capture
 *   PHASE5_TRACK=<key>           comeback-city (default) | penguin-village
 *   PHASE5_CAPTURE_DURATION_MS   default 20000 (autoplay race lasts minutes;
 *                                20s post-countdown sits inside laps 1-2)
 *   PHASE5_CAPTURE_PORT          default 5195
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PHASE5_CAPTURE_PORT || 5195);
const baseUrl = `http://127.0.0.1:${port}`;
const captureDurationMs = Number(process.env.PHASE5_CAPTURE_DURATION_MS || 20000);
const headed = process.env.PHASE5_HEADED === '1';
const target = process.env.PHASE5_TARGET || 'shipped';
const trackKey = process.env.PHASE5_TRACK || 'comeback-city';
const outDir = path.join(
  root,
  '.agent',
  'runs',
  'kart-racer-production-readiness',
  'evidence',
  `phase5-capture-${new Date().toISOString().replace(/[:.]/g, '-')}`
);

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

const stats = (values) => {
  if (!values.length) return { average: null, max: null, min: null, sampleCount: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    average: Number((sum / values.length).toFixed(2)),
    max: Number(Math.max(...values).toFixed(2)),
    min: Number(Math.min(...values).toFixed(2)),
    sampleCount: values.length,
  };
};

const numericOf = (samples, key, subkey = null) =>
  samples
    .map((s) => (subkey ? s.telemetry?.[key]?.[subkey] : s.telemetry?.[key]))
    .filter(Number.isFinite);

// ---- shipped-racer capture (poll __comebackCityKartTelemetry) --------------

const summarizeShippedSamples = (samples) => {
  const frameElapsedMs = numericOf(samples, 'frameElapsedMs');
  const frameWorkMs = numericOf(samples, 'frameWorkMs');
  const fpsEstimate = numericOf(samples, 'fpsEstimate');
  // FPS derived from the UNCLAMPED rolling elapsed average — the honest
  // number. min FPS = worst polled sample (gates use this, not the mean).
  const derivedFps = frameElapsedMs.filter((ms) => ms > 0).map((ms) => 1000 / ms);
  const drawCalls = numericOf(samples, 'rendererStats', 'drawCalls');
  const triangles = numericOf(samples, 'rendererStats', 'triangles');
  const latest = samples.at(-1)?.telemetry || {};
  const minElapsed = frameElapsedMs.length ? Math.min(...frameElapsedMs) : null;
  return {
    captureWindowSeconds: Number((((samples.at(-1)?.at || 0) - (samples[0]?.at || 0)) / 1000).toFixed(3)),
    derivedFps: stats(derivedFps),
    // Vsync floor estimate: rolling-average floor near 16.7ms => 60Hz panel,
    // near 8.3ms => 120Hz ProMotion. Recorded so runs are comparable.
    displayRefreshEstimateHz: minElapsed ? Number((1000 / minElapsed).toFixed(1)) : null,
    fpsEstimate: stats(fpsEstimate),
    frameElapsedMs: stats(frameElapsedMs),
    frameWorkMs: stats(frameWorkMs),
    lapAtEnd: latest.lap ?? null,
    rendererStats: { drawCalls: stats(drawCalls), triangles: stats(triangles) },
    speed: stats(numericOf(samples, 'speed')),
    bakedBuildings: latest.bakedBuildings ?? null,
    trackVisualsEnabled: latest.trackVisualsEnabled ?? null,
  };
};

const captureShipped = async (page) => {
  const routePath =
    target === 'shipped-dev'
      ? `/kart-playtest.html?raceAutoplay=1&track=${trackKey}`
      : `/?raceAutoplay=1&track=${trackKey}#race`;
  const url = `${baseUrl}${routePath}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.__comebackCityKartTelemetry?.renderer === 'three-kart',
    null,
    { timeout: 30000 }
  );
  // Trusted window starts after the countdown, 2s into the race.
  await page.waitForFunction(
    () => {
      const t = window.__comebackCityKartTelemetry;
      return t && t.countdown === 0 && t.raceTime > 2;
    },
    null,
    { timeout: 45000 }
  );
  const samples = [];
  const started = Date.now();
  while (Date.now() - started < captureDurationMs) {
    const telemetry = await page.evaluate(() => {
      const t = window.__comebackCityKartTelemetry;
      return t
        ? {
            bakedBuildings: t.bakedBuildings,
            fpsEstimate: t.fpsEstimate,
            frameElapsedMs: t.frameElapsedMs,
            frameWorkMs: t.frameWorkMs,
            lap: t.lap,
            rendererStats: t.rendererStats,
            speed: t.speed,
            trackVisualsEnabled: t.trackVisualsEnabled,
          }
        : null;
    });
    if (telemetry) samples.push({ at: Date.now(), telemetry });
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return { samples, summary: summarizeShippedSamples(samples), url };
};

// ---- legacy capture (unchanged behavior, kept for the comparison run) ------

const summarizeLegacySamples = (samples) => ({
  actualFps: stats(numericOf(samples, 'actualFps')),
  captureWindowSeconds: Number((((samples.at(-1)?.at || 0) - (samples[0]?.at || 0))).toFixed(3)),
  deliveredFps: samples.at(-1)?.telemetry?.deliveredFps ?? null,
  frameElapsedMs: stats(numericOf(samples, 'frameElapsedMs')),
  frameWorkMs: stats(numericOf(samples, 'frameWorkMs')),
  renderPhaseMs: stats(samples.map((s) => s.telemetry?.framePhaseMs?.render).filter(Number.isFinite)),
  rendererInfo: samples.at(-1)?.telemetry?.rendererInfo || {},
  sceneBudget: samples.at(-1)?.telemetry?.sceneBudget || {},
  visibleRivals: stats(numericOf(samples, 'race', 'visibleRivals')),
});

const captureLegacy = async (page) => {
  const url = `${baseUrl}/race-playtest.html?raceAutoplay=1&raceTrack=comeback-city&raceMode=free-switch&raceIndex=901&raceNoFinish=1`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(
    () => {
      const telemetry = window.__raceVisualTelemetry;
      const latestSample = (window.__raceVisualTelemetrySamples || []).at(-1);
      return (
        telemetry?.trackKey === 'comeback-city' &&
        latestSample?.at >= 2 &&
        Number.isFinite(telemetry?.actualFps) &&
        Number.isFinite(telemetry?.frameElapsedMs) &&
        Number.isFinite(telemetry?.frameWorkMs)
      );
    },
    null,
    { timeout: 25000 }
  );
  const captureStartedAt = await page.evaluate(
    () => (window.__raceVisualTelemetrySamples || []).at(-1)?.at ?? 0
  );
  await page.waitForTimeout(captureDurationMs);
  const samples = await page.evaluate(
    (startAt) => (window.__raceVisualTelemetrySamples || []).filter((sample) => sample.at >= startAt),
    captureStartedAt
  );
  return { samples, summary: summarizeLegacySamples(samples), url };
};

// ---- run --------------------------------------------------------------------

const run = async () => {
  await mkdir(outDir, { recursive: true });

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const serverArgs =
    target === 'shipped'
      ? ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort']
      : ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'];
  const server = spawn(npm, serverArgs, {
    cwd: root,
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'ignore', 'ignore'],
  });

  let browser;
  try {
    await waitForServer(`${baseUrl}/`);

    browser = await chromium.launch({ headless: !headed });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(message.text());
    });

    const capture = target === 'legacy' ? await captureLegacy(page) : await captureShipped(page);

    const screenshotPath = path.join(outDir, 'sustained-normal-play.png');
    await page.screenshot({ fullPage: false, path: screenshotPath });

    const result = {
      capturedAt: new Date().toISOString(),
      captureDurationMs,
      environment: {
        headed,
        note: headed
          ? 'headed run — eligible as canonical baseline on the reference hardware'
          : 'HEADLESS — diagnostic only, rAF throttling skews numbers; never quote as a baseline',
        serverMode: target === 'shipped' ? 'production build via vite preview' : 'vite dev server',
        target,
        track: target === 'legacy' ? 'comeback-city (legacy ArcadeRace3D)' : trackKey,
        viewport: '1440x900',
      },
      git: {
        branch: (() => {
          try {
            return execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim() || null;
          } catch {
            return null;
          }
        })(),
        commit: (() => {
          try {
            return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() || null;
          } catch {
            return null;
          }
        })(),
      },
      outDir,
      pageErrors,
      routeUrl: capture.url,
      screenshotPath,
      summary: capture.summary,
    };

    await writeFile(path.join(outDir, 'sustained-capture-summary.json'), JSON.stringify(result, null, 2));
    await writeFile(path.join(outDir, 'samples.json'), JSON.stringify(capture.samples, null, 1));
    console.log(JSON.stringify({ environment: result.environment, summary: capture.summary, outDir }, null, 2));
  } catch (error) {
    console.error(error.message);
    if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
};

run();
