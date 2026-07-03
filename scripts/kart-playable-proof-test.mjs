import { access, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.KART_PLAYABLE_PROOF_PORT || 5297);
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = path.join(root, 'tmp', 'kart-playable-proof-test');

const fail = (message, detail = {}) => {
  const error = new Error(message);
  error.detail = detail;
  throw error;
};

const fileExists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const cropForViewport = (viewport) => {
  if (viewport.width < 760 || viewport.height > viewport.width) {
    return { h: Math.round(viewport.height * 0.56), w: Math.round(viewport.width * 0.9), x: Math.round(viewport.width * 0.05), y: Math.round(viewport.height * 0.27) };
  }
  return { h: Math.round(viewport.height * 0.62), w: Math.round(viewport.width * 0.72), x: Math.round(viewport.width * 0.14), y: Math.round(viewport.height * 0.22) };
};

const averagePixelDiff = (beforeBuffer, afterBuffer, crop) => {
  const before = PNG.sync.read(beforeBuffer);
  const after = PNG.sync.read(afterBuffer);
  const width = Math.min(before.width, after.width);
  const height = Math.min(before.height, after.height);
  const x0 = Math.max(0, Math.min(width - 1, crop.x));
  const y0 = Math.max(0, Math.min(height - 1, crop.y));
  const x1 = Math.max(x0 + 1, Math.min(width, crop.x + crop.w));
  const y1 = Math.max(y0 + 1, Math.min(height, crop.y + crop.h));
  let total = 0;
  let changed = 0;
  let samples = 0;
  for (let y = y0; y < y1; y += 6) {
    for (let x = x0; x < x1; x += 6) {
      const index = (y * width + x) * 4;
      const delta =
        Math.abs(before.data[index] - after.data[index]) +
        Math.abs(before.data[index + 1] - after.data[index + 1]) +
        Math.abs(before.data[index + 2] - after.data[index + 2]);
      total += delta / 3;
      if (delta > 42) changed += 1;
      samples += 1;
    }
  }
  return {
    average: Number((total / Math.max(1, samples)).toFixed(2)),
    changedRatio: Number((changed / Math.max(1, samples)).toFixed(3)),
    crop: { h: y1 - y0, w: x1 - x0, x: x0, y: y0 },
    samples,
  };
};

const assertVisibleMotion = async (page, viewport, label) => {
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, {
    timeout: 15000,
  });
  const before = await page.screenshot({ fullPage: false });
  await page.waitForTimeout(1200);
  const after = await page.screenshot({ fullPage: false });
  const diff = averagePixelDiff(before, after, cropForViewport(viewport));
  if (diff.average < 5.5 || diff.changedRatio < 0.045) {
    fail(`${label} visible gameplay region did not move enough`, diff);
  }
  return diff;
};

const assertControlVisualEffect = async (page, viewport, label) => {
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, {
    timeout: 15000,
  });
  const idleFrame = await page.screenshot({ fullPage: false });
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(900);
  const throttleFrame = await page.screenshot({ fullPage: false });
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('Space');
  await page.waitForTimeout(900);
  const driftFrame = await page.screenshot({ fullPage: false });
  await page.keyboard.up('Space');
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('ArrowUp');
  const throttleDiff = averagePixelDiff(idleFrame, throttleFrame, cropForViewport(viewport));
  const driftDiff = averagePixelDiff(throttleFrame, driftFrame, cropForViewport(viewport));
  if (throttleDiff.average < 6 || throttleDiff.changedRatio < 0.05) {
    fail(`${label} throttle did not create visible scene motion`, throttleDiff);
  }
  if (driftDiff.average < 3.5 || driftDiff.changedRatio < 0.025) {
    fail(`${label} steering/drift did not create visible scene change`, driftDiff);
  }
  return { driftDiff, throttleDiff };
};

const writeContactSheet = async () => {
  const proofCapture = path.join(root, 'tmp', 'kart-proof-static-guard', 'desktop.png');
  const proofDesktop = (await fileExists(proofCapture))
    ? proofCapture
    : path.join(root, 'src', 'assets', 'game', 'proof', 'comeback-city-kart-proof-desktop-v1.png');
  const legacyDesktop = path.join(root, 'tmp', 'race-playtests', 'comeback-city-free-switch-1.png');
  const entries = [
    {
      label: 'Approved static proof',
      path: proofDesktop,
    },
    {
      label: 'Promoted #race Three.js route',
      path: path.join(outputDir, 'desktop-mid.png'),
    },
    {
      label: 'Current #race finish/results',
      path: path.join(outputDir, 'desktop-finish.png'),
    },
  ];
  if (await fileExists(legacyDesktop)) {
    entries.push({
      label: 'Legacy old renderer reference',
      path: legacyDesktop,
    });
  }
  const cards = entries
    .map((entry) => {
      const src = path.relative(outputDir, entry.path).split(path.sep).join('/');
      return `<figure><figcaption>${entry.label}</figcaption><img src="${src}" alt="${entry.label}"></figure>`;
    })
    .join('\n');
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Comeback City Kart Visual Approval Sheet</title>
  <style>
    body { margin: 0; background: #061522; color: #eef8ff; font: 14px system-ui, sans-serif; }
    header { padding: 18px 22px; border-bottom: 1px solid rgba(120,233,255,.28); background: #040c14; }
    h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
    main { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px; padding: 16px; }
    figure { margin: 0; border: 1px solid rgba(120,233,255,.28); background: rgba(5,17,29,.86); }
    figcaption { padding: 10px 12px; font-weight: 800; text-transform: uppercase; }
    img { display: block; width: 100%; height: auto; }
  </style>
</head>
<body>
  <header><h1>Comeback City Kart Visual Approval Sheet</h1></header>
  <main>${cards}</main>
</body>
</html>
`;
  await writeFile(path.join(outputDir, 'kart-visual-approval-sheet.html'), html);
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

const readTelemetry = async (page, label) => {
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
    timeout: 15000,
  });
  const telemetry = await page.evaluate(() => window.__comebackCityKartTelemetry || null);
  if (!telemetry) fail(`Missing Three kart telemetry: ${label}`);
  return telemetry;
};

const waitForRaceActive = async (page) => {
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, {
    timeout: 15000,
  });
};

// The 2026-07-02 incident: /baked-buildings.glb 404'd into a silent empty
// error callback and the shipped track quietly downgraded to procedural
// boxes. The GLB loads async after mount, so wait out 'pending', then require
// 'active' — anything else ('missing', 'loaded-but-empty') fails the proof.
const assertBakedBuildingsActive = async (page, label) => {
  await page.waitForFunction(
    () => {
      const state = window.__comebackCityKartTelemetry?.bakedBuildings;
      return state && state !== 'pending';
    },
    null,
    { timeout: 15000 }
  );
  const state = await page.evaluate(() => window.__comebackCityKartTelemetry?.bakedBuildings || null);
  if (state !== 'active') {
    fail(`${label}: baked buildings are not active (state=${state}) — procedural fallback would ship silently`, {
      bakedBuildings: state,
    });
  }
};

const assertPlayableShell = async (page, mode) => {
  await page.waitForSelector('[data-testid="race-screen"][data-race-renderer="three-kart"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="comeback-city-3d-kart-race"][data-race-renderer="three-kart"]', {
    timeout: 15000,
  });
  const facts = await page.evaluate(() => ({
    oldArcadeCanvasCount: document.querySelectorAll('.arcade-race-canvas, canvas[data-race-renderer="webgl"]').length,
    oldFallbackCanvasCount: document.querySelectorAll('[data-testid="race-fallback-canvas"], .race-canvas').length,
    pixiCanvasCount: document.querySelectorAll('canvas[data-race-renderer="pixi-kart"][data-visual-canvas="race"]').length,
    threeCanvasCount: document.querySelectorAll('canvas[data-race-renderer="three-kart"][data-visual-canvas="race"]').length,
    propCount: Number(document.querySelector('[data-testid="comeback-city-3d-kart-race"]')?.dataset?.propCount || 0),
    raceRenderer: document.querySelector('[data-testid="race-screen"]')?.dataset?.raceRenderer || '',
    resultPanelVisible: Boolean(document.querySelector('.three-kart-race__results')),
    shellVisible: Boolean(document.querySelector('[data-testid="comeback-city-3d-kart-race"]')),
    touchButtonCount: document.querySelectorAll('.three-kart-race__touch button').length,
  }));
  if (
    facts.raceRenderer !== 'three-kart' ||
    facts.threeCanvasCount !== 1 ||
    facts.pixiCanvasCount !== 0 ||
    facts.oldArcadeCanvasCount !== 0 ||
    facts.oldFallbackCanvasCount !== 0 ||
    facts.propCount < 20 ||
    !facts.shellVisible ||
    facts.touchButtonCount < 4
  ) {
    fail(`${mode} Three kart race shell is incomplete or old renderer mounted`, facts);
  }
  return facts;
};

const runManualDesktopControls = async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 }, deviceScaleFactor: 1 });
  await page.goto(`${baseUrl}/#race`, { waitUntil: 'networkidle' });
  const facts = await assertPlayableShell(page, 'desktop');
  await assertBakedBuildingsActive(page, 'desktop manual');
  await waitForRaceActive(page);
  await page.waitForTimeout(300);
  const idle = await readTelemetry(page, 'desktop idle');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(1300);
  const accelerating = await readTelemetry(page, 'desktop accelerating');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(700);
  const steering = await readTelemetry(page, 'desktop steering');
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(700);
  const braking = await readTelemetry(page, 'desktop braking');
  await page.keyboard.up('ArrowDown');
  await page.screenshot({ path: path.join(outputDir, 'desktop-manual-controls.png'), fullPage: false });
  await page.close();

  if (!(accelerating.speed > idle.speed + 40)) fail('Desktop acceleration did not increase speed', { accelerating, idle });
  if (!(steering.steer > 0.18)) fail('Desktop steering did not produce right steer telemetry', { steering });
  if (!(braking.speed < steering.speed)) fail('Desktop braking did not reduce speed', { braking, steering });
  return { accelerating, braking, facts, idle, steering };
};

const runAutoplayEvidence = async (browser, mode, viewport) => {
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    recordVideo: { dir: outputDir, size: viewport },
    viewport,
  });
  const page = await context.newPage();
  const video = page.video();
  await page.goto(`${baseUrl}/?playableAutoplay=1#race`, { waitUntil: 'networkidle' });
  const facts = await assertPlayableShell(page, mode);
  const visibleMotion = await assertVisibleMotion(page, viewport, `${mode} autoplay`);
  await page.waitForTimeout(1200);
  const start = await readTelemetry(page, `${mode} autoplay start`);
  await page.screenshot({ path: path.join(outputDir, `${mode}-start.png`), fullPage: false });
  await page.waitForTimeout(7600);
  const mid = await readTelemetry(page, `${mode} autoplay mid`);
  await page.screenshot({ path: path.join(outputDir, `${mode}-mid.png`), fullPage: false });
  await page.waitForTimeout(7600);
  const end = await readTelemetry(page, `${mode} autoplay end`);
  await page.screenshot({ path: path.join(outputDir, `${mode}-end.png`), fullPage: false });
  let finish = null;
  if (mode === 'desktop') {
    // The 2026-06-12 track upscale (1.35×, owner-requested) makes a full
    // 3-lap race ~47s with cornering slowdowns — budget accordingly.
    await page.waitForFunction(() => window.__comebackCityKartTelemetry?.finished === true, null, {
      timeout: 45000,
    });
    finish = await readTelemetry(page, `${mode} autoplay finish`);
    await page.screenshot({ path: path.join(outputDir, `${mode}-finish.png`), fullPage: false });
    const resultPanelVisible = await page.evaluate(() => Boolean(document.querySelector('.three-kart-race__results')));
    if (!finish.finished || !resultPanelVisible) {
      fail(`${mode} autoplay did not reach the finish/results loop`, { finish, resultPanelVisible });
    }
  }
  await page.close();
  await context.close();
  const videoPath = await video.path();
  const stableVideoPath = path.join(outputDir, `${mode}-10s.webm`);
  await copyFile(videoPath, stableVideoPath);

  // Corners now bleed speed (centrifugal understeer + wall scrape), so a
  // mid-corner sample can legitimately read below the old 170 floor.
  if (!(end.speed >= 140 && (end.lap > start.lap || end.routeProgress > start.routeProgress))) {
    fail(`${mode} autoplay did not sustain race speed and route progress`, { end, start });
  }
  if (!(mid.itemPickups >= 1 || end.itemPickups >= 1)) fail(`${mode} autoplay did not collect an item box`, { end, mid });
  if (!(mid.boostHits >= 1 || end.boostHits >= 1)) fail(`${mode} autoplay did not hit a boost pad`, { end, mid });
  if (end.rivalCount < 3) fail(`${mode} autoplay does not show three rivals in telemetry`, { end, facts });
  return {
    end,
    facts,
    finish,
    mid,
    start,
    video: path.relative(root, stableVideoPath),
    visibleMotion,
  };
};

const run = async () => {
  await rm(outputDir, { force: true, recursive: true });
  await mkdir(outputDir, { recursive: true });

  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  if (packageJson.scripts?.['test:kart-proof'] !== 'node scripts/kart-proof-static-guard.mjs') {
    fail('Phase 1 static proof guard script is missing');
  }

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
  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch({ headless: true });
    const visualQaPage = await browser.newPage({ viewport: { width: 1365, height: 768 }, deviceScaleFactor: 1 });
    await visualQaPage.goto(`${baseUrl}/#race`, { waitUntil: 'networkidle' });
    await assertPlayableShell(visualQaPage, 'desktop visual qa');
    const controlVisual = await assertControlVisualEffect(visualQaPage, { width: 1365, height: 768 }, 'desktop manual');
    await visualQaPage.close();
    const manualDesktop = await runManualDesktopControls(browser);
    const desktopAutoplay = await runAutoplayEvidence(browser, 'desktop', { width: 1365, height: 768 });
    const mobileAutoplay = await runAutoplayEvidence(browser, 'mobile', { width: 390, height: 844 });
    const visibleMotionReport = {
      controlVisual,
      desktopAutoplay: desktopAutoplay.visibleMotion,
      mobileAutoplay: mobileAutoplay.visibleMotion,
    };
    const report = {
      baseUrl,
      contactSheet: path.relative(root, path.join(outputDir, 'kart-visual-approval-sheet.html')),
      desktopAutoplay,
      manualDesktop,
      mobileAutoplay,
      outputDir: path.relative(root, outputDir),
      passed: true,
      visibleMotionReport: path.relative(root, path.join(outputDir, 'visible-motion-report.json')),
    };
    await writeContactSheet();
    await writeFile(path.join(outputDir, 'visible-motion-report.json'), `${JSON.stringify(visibleMotionReport, null, 2)}\n`);
    await writeFile(path.join(outputDir, 'kart-playable-proof-report.json'), `${JSON.stringify(report, null, 2)}\n`);
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
