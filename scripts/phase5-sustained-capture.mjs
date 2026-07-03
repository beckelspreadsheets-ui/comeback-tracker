#!/usr/bin/env node
/**
 * Focused Phase 5 sustained normal-play capture.
 *
 * `npm run test:race:browser` times out in this environment after many
 * sequential captures, but individual sustained runs work reliably. This
 * script captures one sustained window in isolation for before/after FPS
 * comparison during Phase 5 optimization.
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
const captureDurationMs = Number(process.env.PHASE5_CAPTURE_DURATION_MS || 9000);
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

const summarizeSustainedSamples = (samples) => {
  const numeric = (key, subkey = null) =>
    samples
      .map((s) => (subkey ? s.telemetry?.[key]?.[subkey] : s.telemetry?.[key]))
      .filter(Number.isFinite);

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

  const actualFps = numeric('actualFps');
  const frameElapsedMs = numeric('frameElapsedMs');
  const frameWorkMs = numeric('frameWorkMs');
  const renderMs = samples.map((s) => s.telemetry?.framePhaseMs?.render).filter(Number.isFinite);
  const visibleRivals = numeric('race', 'visibleRivals');
  const roadAheadCoverage = numeric('camera', 'roadAheadCoverage');

  const latest = samples.at(-1)?.telemetry || {};
  const rendererInfo = latest.rendererInfo || {};
  const sceneBudget = latest.sceneBudget || {};

  return {
    actualFps: stats(actualFps),
    captureWindowSeconds: Number(((samples.at(-1)?.at || 0) - (samples[0]?.at || 0)).toFixed(3)),
    deliveredFps: latest.deliveredFps ?? null,
    frameElapsedMs: stats(frameElapsedMs),
    frameWorkMs: stats(frameWorkMs),
    renderPhaseMs: stats(renderMs),
    rendererInfo,
    roadAheadCoverage: stats(roadAheadCoverage),
    sceneBudget,
    visibleRivals: stats(visibleRivals),
  };
};

const run = async () => {
  await mkdir(outDir, { recursive: true });

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const server = spawn(
    npm,
    ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd: root,
      env: { ...process.env, BROWSER: 'none' },
      stdio: ['ignore', 'ignore', 'ignore'],
    }
  );

  let browser;
  try {
    await waitForServer(`${baseUrl}/race-playtest.html`);

    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(message.text());
    });

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
          Number.isFinite(telemetry?.frameWorkMs) &&
          Number.isFinite(telemetry?.framePhaseMs?.render) &&
          telemetry?.sceneBudget?.scene?.objects > 0
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
    const telemetry = await page.evaluate(() => window.__raceVisualTelemetry || null);

    const summary = summarizeSustainedSamples(samples);
    const screenshotPath = path.join(outDir, 'sustained-normal-play.png');
    await page.screenshot({ fullPage: false, path: screenshotPath });

    const result = {
      capturedAt: new Date().toISOString(),
      captureDurationMs,
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
      routeUrl: url,
      screenshotPath,
      summary,
      telemetry,
    };

    await writeFile(path.join(outDir, 'sustained-capture-summary.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ summary, outDir, screenshotPath }, null, 2));
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
