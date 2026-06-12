import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.KART_3D_SPIKE_PORT || 5298);
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = path.join(root, 'tmp', 'kart-3d-spike-test');

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

const averagePixelDiff = (beforeBuffer, afterBuffer) => {
  const before = PNG.sync.read(beforeBuffer);
  const after = PNG.sync.read(afterBuffer);
  const width = Math.min(before.width, after.width);
  const height = Math.min(before.height, after.height);
  let total = 0;
  let changed = 0;
  let samples = 0;
  for (let y = Math.round(height * 0.18); y < Math.round(height * 0.82); y += 7) {
    for (let x = Math.round(width * 0.12); x < Math.round(width * 0.88); x += 7) {
      const index = (y * width + x) * 4;
      const delta =
        Math.abs(before.data[index] - after.data[index]) +
        Math.abs(before.data[index + 1] - after.data[index + 1]) +
        Math.abs(before.data[index + 2] - after.data[index + 2]);
      total += delta / 3;
      if (delta > 36) changed += 1;
      samples += 1;
    }
  }
  return {
    average: Number((total / Math.max(1, samples)).toFixed(2)),
    changedRatio: Number((changed / Math.max(1, samples)).toFixed(3)),
    samples,
  };
};

const captureRoute = async (browser, route, mode, viewport, autoplay = false) => {
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    recordVideo: mode === 'desktop' ? { dir: outputDir, size: viewport } : undefined,
    viewport,
  });
  const page = await context.newPage();
  const video = page.video();
  const params = autoplay ? '?playableAutoplay=1' : '';
  await page.goto(`${baseUrl}/${params}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="comeback-city-3d-kart-race"][data-race-renderer="three-kart"]', {
    timeout: 15000,
  });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
    timeout: 15000,
  });
  await page.waitForFunction(
    () =>
      window.__comebackCityKartTelemetry?.countdown <= 0 &&
      window.__comebackCityKartTelemetry?.fpsEstimate >= 34,
    null,
    { timeout: 20000 }
  );
  await page.waitForTimeout(600);
  const before = await page.screenshot({ fullPage: false, path: path.join(outputDir, `${mode}-${route.slice(1)}-start.png`) });
  if (autoplay) await page.waitForTimeout(1200);
  const after = await page.screenshot({ fullPage: false, path: path.join(outputDir, `${mode}-${route.slice(1)}-motion.png`) });
  // Sample FPS over ~2.5s and judge the median — a single instantaneous
  // sample flakes on GC pauses and capture-harness contention.
  const fpsSamples = [];
  for (let sample = 0; sample < 7; sample += 1) {
    fpsSamples.push(await page.evaluate(() => window.__comebackCityKartTelemetry?.fpsEstimate || 0));
    await page.waitForTimeout(350);
  }
  fpsSamples.sort((a, b) => a - b);
  const telemetry = await page.evaluate(() => window.__comebackCityKartTelemetry || null);
  if (telemetry) telemetry.fpsMedian = fpsSamples[Math.floor(fpsSamples.length / 2)];
  const facts = await page.evaluate(() => ({
    canvasCount: document.querySelectorAll('canvas[data-race-renderer="three-kart"][data-visual-canvas="race"]').length,
    oldArcadeCanvasCount: document.querySelectorAll('.arcade-race-canvas, canvas[data-race-renderer="webgl"]').length,
    pixiCanvasCount: document.querySelectorAll('canvas[data-race-renderer="pixi-kart"]').length,
    propCount: Number(document.querySelector('[data-testid="comeback-city-3d-kart-race"]')?.dataset?.propCount || 0),
    raceRenderer: document.querySelector('[data-testid="race-screen"]')?.dataset?.raceRenderer || '',
  }));
  if (mode === 'desktop') await page.waitForTimeout(8800);
  await page.close();
  await context.close();
  let stableVideoPath = null;
  if (video) {
    const videoPath = await video.path();
    stableVideoPath = path.join(outputDir, `${mode}-${route.slice(1)}-10s.webm`);
    await copyFile(videoPath, stableVideoPath);
  }
  return {
    facts,
    motion: averagePixelDiff(before, after),
    telemetry,
    video: stableVideoPath ? path.relative(root, stableVideoPath) : null,
  };
};

const assertThreeRuntime = (result, label) => {
  const { facts, motion, telemetry } = result;
  if (
    facts.raceRenderer !== 'three-kart' ||
    facts.canvasCount !== 1 ||
    facts.pixiCanvasCount !== 0 ||
    facts.oldArcadeCanvasCount !== 0 ||
    facts.propCount < 20
  ) {
    fail(`${label} did not mount the isolated Three kart runtime`, facts);
  }
  if (telemetry?.visualAssetSet !== 'comeback-city-v2-three-runtime') {
    fail(`${label} telemetry did not expose the V2 Three asset set`, telemetry);
  }
  if ((telemetry?.fpsMedian ?? telemetry?.fpsEstimate) < 34) {
    fail(`${label} FPS median is below target`, telemetry);
  }
  if (motion.average < 1.8 || motion.changedRatio < 0.012) {
    fail(`${label} did not show visible 3D scene motion`, motion);
  }
};

const run = async () => {
  await rm(outputDir, { force: true, recursive: true });
  await mkdir(outputDir, { recursive: true });
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  // Measure the production build (vite preview of dist/), not the dev server:
  // dev-mode rendering runs ~25% slower than what users actually receive, and
  // the FPS gate is meant to guard the shipped experience. Requires `npm run
  // build` to have produced dist/ first (the standard QA sequence).
  const server = spawn(npm, ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
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
  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch({ headless: true });
    const spikeDesktop = await captureRoute(browser, '#race-3d-spike', 'desktop', { width: 1365, height: 768 }, true);
    const spikeMobile = await captureRoute(browser, '#race-3d-spike', 'mobile', { width: 390, height: 844 }, true);
    const promotedDesktop = await captureRoute(browser, '#race', 'desktop', { width: 1365, height: 768 }, true);
    assertThreeRuntime(spikeDesktop, 'desktop spike');
    assertThreeRuntime(spikeMobile, 'mobile spike');
    assertThreeRuntime(promotedDesktop, 'promoted race');
    const report = {
      baseUrl,
      outputDir: path.relative(root, outputDir),
      passed: true,
      promotedDesktop,
      spikeDesktop,
      spikeMobile,
    };
    await writeFile(path.join(outputDir, 'kart-3d-spike-report.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    if (serverLog) error.serverLog = serverLog.slice(-4000);
    throw error;
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
};

run().catch((error) => {
  console.error(error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  if (error.serverLog) console.error(error.serverLog);
  process.exit(1);
});
