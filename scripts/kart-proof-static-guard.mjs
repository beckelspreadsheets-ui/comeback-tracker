import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.KART_PROOF_GUARD_PORT || 5294);
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = path.join(root, 'tmp', 'kart-proof-static-guard');
const harnessPath = path.join(outputDir, 'kart-proof-static-guard-harness.html');
const harnessModulePath = path.join(outputDir, 'kart-proof-static-guard-harness.jsx');

const proofDesktopAsset = 'src/assets/game/proof/comeback-city-kart-proof-desktop-v1.png';
const proofMobileAsset = 'src/assets/game/proof/comeback-city-kart-proof-mobile-v1.png';
const forbiddenProofShapeSelectors = [
  'skyline-building',
  'proof-player-kart',
  'kart-proof-district',
  'proof-rival-kart',
  'proof-boost-pad',
];

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

const assertSourceDoesNotContainRejectedProofShapes = async () => {
  const sourceFiles = [
    path.join(root, 'src', 'game', 'comebackCityVisuals.jsx'),
    path.join(root, 'src', 'game', 'comebackCityVisuals.css'),
  ];
  const matches = [];
  for (const file of sourceFiles) {
    const source = await readFile(file, 'utf8');
    for (const token of forbiddenProofShapeSelectors) {
      if (source.includes(token)) matches.push({ file: path.relative(root, file), token });
    }
  }
  if (matches.length) {
    fail('Rejected CSS/HTML proof-shape selectors are present in the proof route source', { matches });
  }
};

const assertManifestIncludesProofAssets = async () => {
  const manifestPath = path.join(root, 'src', 'assets', 'game', 'asset-manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const serialized = JSON.stringify(manifest);
  const missing = [proofDesktopAsset, proofMobileAsset].filter((asset) => !serialized.includes(asset));
  if (missing.length) fail('Proof assets are missing from asset manifest provenance', { missing });
};

const writeProofHarness = async () => {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kart Static Proof Guard</title>
  <script type="module" src="/tmp/kart-proof-static-guard/kart-proof-static-guard-harness.jsx"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>
`;
  await writeFile(harnessPath, html);
  await writeFile(
    harnessModulePath,
    `import React from 'react';
import { createRoot } from 'react-dom/client';
import { ArcadeKartProofScene } from '/src/game/comebackCityVisuals.jsx';

createRoot(document.getElementById('root')).render(React.createElement(ArcadeKartProofScene));
`
  );
};

const captureProof = async (browser, shot) => {
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { height: shot.height, width: shot.width },
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error' && !text.includes('Failed to load resource')) errors.push(text);
  });

  await page.goto(`${baseUrl}/tmp/kart-proof-static-guard/kart-proof-static-guard-harness.html`, {
    waitUntil: 'networkidle',
  });
  await page.waitForFunction(
    () => {
      const img = document.querySelector('[data-visual-section="kart-proof"] img');
      return img?.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
    },
    null,
    { timeout: 15000 }
  );
  await page.waitForTimeout(250);

  const result = await page.evaluate(() => {
    const section = document.querySelector('[data-visual-section="kart-proof"]');
    const picture = section?.querySelector('picture');
    const img = section?.querySelector('img');
    const rect = section?.getBoundingClientRect();
    const canvases = [...document.querySelectorAll('canvas')].map((canvas) => canvas.outerHTML.slice(0, 200));
    const raceSceneMarkers = [
      '[data-testid="race-screen"]',
      '[data-race-scene]',
      '.arcade-touch-controls',
      '.race-track-card',
      '.world-destination-button',
    ].filter((selector) => document.querySelector(selector));
    return {
      canvasCount: canvases.length,
      canvases,
      currentSrc: img?.currentSrc || img?.src || null,
      imageAlt: img?.getAttribute('alt') || '',
      imageComplete: Boolean(img?.complete),
      naturalHeight: img?.naturalHeight || 0,
      naturalWidth: img?.naturalWidth || 0,
      pictureFound: Boolean(picture),
      raceSceneMarkers,
      sectionFound: Boolean(section),
      sectionHeight: rect ? Math.round(rect.height) : 0,
      sectionWidth: rect ? Math.round(rect.width) : 0,
    };
  });

  const expectedAsset = shot.mode === 'mobile' ? proofMobileAsset : proofDesktopAsset;
  if (!result.sectionFound || !result.pictureFound || !result.imageComplete) {
    fail(`${shot.mode} proof route did not render the static picture/image proof`, result);
  }
  if (!result.currentSrc?.includes(expectedAsset)) {
    fail(`${shot.mode} proof route served the wrong proof asset`, {
      currentSrc: result.currentSrc,
      expectedAsset,
    });
  }
  if (result.canvasCount !== 0 || result.raceSceneMarkers.length) {
    fail(`${shot.mode} proof route contains gameplay/procedural scene markers`, result);
  }
  if (result.naturalWidth < 900 || result.naturalHeight < 900) {
    fail(`${shot.mode} proof image resolution is too small for review`, result);
  }
  if (result.sectionWidth !== shot.width || result.sectionHeight !== shot.height) {
    fail(`${shot.mode} proof section does not fill the requested viewport`, {
      expected: { height: shot.height, width: shot.width },
      result,
    });
  }

  const screenshotPath = path.join(outputDir, `${shot.mode}.png`);
  await page.screenshot({ fullPage: false, path: screenshotPath });
  await page.close();

  if (errors.length) fail(`${shot.mode} proof route reported browser errors`, { errors });
  return { ...result, screenshotPath: path.relative(root, screenshotPath), viewport: shot };
};

const run = async () => {
  await rm(outputDir, { force: true, recursive: true });
  await mkdir(outputDir, { recursive: true });
  await assertSourceDoesNotContainRejectedProofShapes();
  await assertManifestIncludesProofAssets();
  await writeProofHarness();

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const server = spawn(npm, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    detached: process.platform !== 'win32',
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
    const captures = [];
    for (const shot of [
      { height: 768, mode: 'desktop', width: 1365 },
      { height: 844, mode: 'mobile', width: 390 },
    ]) {
      captures.push(await captureProof(browser, shot));
    }

    const report = {
      baseUrl,
      captures,
      outputDir: path.relative(root, outputDir),
      passed: true,
      proofAssets: {
        desktop: proofDesktopAsset,
        mobile: proofMobileAsset,
      },
    };
    await writeFile(path.join(outputDir, 'kart-proof-static-guard-report.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    if (serverLog) error.serverLog = serverLog.slice(-4000);
    throw error;
  } finally {
    if (browser) await browser.close();
    stopServer(server);
  }
};

run().catch((error) => {
  console.error(error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  if (error.serverLog) console.error(error.serverLog);
  process.exit(1);
});
