#!/usr/bin/env node
/**
 * Fresh-user 10-second silent clip capture.
 *
 * Records ~10 seconds of the chase-cam race route for the silent fresh-user
 * review. Output is a silent WebM saved to the production-readiness evidence
 * folder with a dated filename.
 */
import { mkdir, copyFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.FRESH_USER_CLIP_PORT || 5196);
const baseUrl = `http://127.0.0.1:${port}`;
const clipDurationMs = Number(process.env.FRESH_USER_CLIP_DURATION_MS || 10000);
const evidenceDir = path.join(
  root,
  '.agent',
  'runs',
  'kart-racer-production-readiness',
  'evidence'
);
const outDir = path.join(evidenceDir, `fresh-user-clip-${new Date().toISOString().replace(/[:.]/g, '-')}`);

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
  let videoPath;
  try {
    await waitForServer(`${baseUrl}/race-playtest.html`);

    browser = await chromium.launch();
    const videoDir = path.join(outDir, 'raw-video');
    await mkdir(videoDir, { recursive: true });

    const context = await browser.newContext({
      recordVideo: {
        dir: videoDir,
        size: { width: 1280, height: 720 },
      },
    });
    const page = await context.newPage({ viewport: { width: 1280, height: 720 } });

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
          telemetry?.sceneBudget?.scene?.objects > 0
        );
      },
      null,
      { timeout: 25000 }
    );

    await page.waitForTimeout(clipDurationMs);
    videoPath = await page.video().path();
    await context.close();

    const finalVideoName = `fresh-user-10s.webm`;
    const finalVideoPath = path.join(outDir, finalVideoName);
    await copyFile(videoPath, finalVideoPath);

    const result = {
      capturedAt: new Date().toISOString(),
      clipDurationMs,
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
      rawVideoPath: videoPath,
      routeUrl: url,
      videoPath: finalVideoPath,
      viewport: { width: 1280, height: 720 },
    };

    await writeFile(path.join(outDir, 'fresh-user-clip-summary.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ videoPath: finalVideoPath, outDir }, null, 2));
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
