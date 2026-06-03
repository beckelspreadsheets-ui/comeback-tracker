import { spawn, execFileSync } from 'node:child_process';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { makeDefaultState, normalizeState, STORAGE_KEY, SYNC_META_KEY } from '../src/hooks/usePersistedState.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
let port = Number(process.env.DEVICE_MATRIX_SMOKE_PORT || 5227);
let baseUrl = `http://127.0.0.1:${port}`;
const shouldCleanArtifacts = !process.env.DEVICE_MATRIX_SMOKE_ARTIFACT_DIR;
const artifactsDir = process.env.DEVICE_MATRIX_SMOKE_ARTIFACT_DIR
  ? path.resolve(root, process.env.DEVICE_MATRIX_SMOKE_ARTIFACT_DIR)
  : path.join(root, 'tmp', 'device-matrix-smoke-test');
const distIndexPath = path.join(root, 'dist', 'index.html');

const fail = (message, detail = {}) => {
  const error = new Error(message);
  error.detail = detail;
  throw error;
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const makeBasicState = () => {
  const state = clone(makeDefaultState());
  state.game = {
    ...state.game,
    homeMode: 'basic',
  };
  return normalizeState(state);
};

const getGitMetadata = () => {
  try {
    return {
      branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim() || null,
      commit: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() || null,
      dirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()),
    };
  } catch {
    return { branch: null, commit: null, dirty: null };
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
  fail('Device matrix smoke preview server did not become ready', { url });
};

const canListenOnPort = (candidatePort) =>
  new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => {
      probe.close(() => resolve(true));
    });
    probe.listen(candidatePort, '127.0.0.1');
  });

const resolveLocalPreviewPort = async () => {
  if (process.env.DEVICE_MATRIX_SMOKE_PORT) {
    if (!(await canListenOnPort(port))) {
      fail('Requested DEVICE_MATRIX_SMOKE_PORT is already in use', { port });
    }
    return port;
  }
  for (let candidatePort = port; candidatePort < port + 50; candidatePort += 1) {
    if (await canListenOnPort(candidatePort)) return candidatePort;
  }
  fail('No available local device matrix smoke preview port found', { startPort: port });
};

const ensureDist = async () => {
  await access(distIndexPath).catch(() => {
    fail('Built app artifact is missing; run npm run build before npm run test:device:matrix', {
      filePath: distIndexPath,
    });
  });
};

const routeUrl = (route = '/') => `${baseUrl}${route}`;

const installSeedState = async (context) => {
  await context.addInitScript(
    ({ stateJson, storageKey, syncMetaKey }) => {
      localStorage.setItem(storageKey, stateJson);
      localStorage.removeItem(syncMetaKey);
    },
    {
      stateJson: JSON.stringify(makeBasicState()),
      storageKey: STORAGE_KEY,
      syncMetaKey: SYNC_META_KEY,
    }
  );
};

const mockLocalSync = async (context) => {
  await context.route('**/api/sync/**', async (route) => {
    await route.fulfill({
      body: JSON.stringify({ error: 'not_authenticated' }),
      contentType: 'application/json',
      status: 401,
    });
  });
};

const isAllowedConsoleError = (message) =>
  /401 \(Unauthorized\)/.test(message) ||
  /403 \(Forbidden\)/.test(message) ||
  /\/api\/sync\//.test(message) ||
  /https:\/\/fonts\.(?:googleapis|gstatic)\.com\//.test(message);

const collectBrowserErrors = (page) => {
  const pageErrors = [];
  const consoleErrors = [];
  const requestFailures = [];
  const httpErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !isAllowedConsoleError(message.text())) {
      consoleErrors.push(message.text());
    }
  });
  page.on('requestfailed', (request) => {
    if (/https:\/\/fonts\.(?:googleapis|gstatic)\.com\//.test(request.url()) || /\/api\/sync\//.test(request.url())) return;
    requestFailures.push({
      failure: request.failure()?.errorText || null,
      method: request.method(),
      url: request.url(),
    });
  });
  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400 && !/\/api\/sync\//.test(response.url())) {
      httpErrors.push({ status, url: response.url() });
    }
  });
  return { consoleErrors, httpErrors, pageErrors, requestFailures };
};

const assertNoBlockingBrowserErrors = (label, errors) => {
  if (errors.pageErrors.length || errors.consoleErrors.length || errors.requestFailures.length || errors.httpErrors.length) {
    fail('Blocking browser errors recorded during device matrix smoke', { errors, label });
  }
};

const waitForHomeReady = async (page) => {
  await Promise.race([
    page.waitForSelector('[data-testid="playable-world-home"]', { timeout: 15000 }),
    page.waitForSelector('text=The Comeback', { timeout: 15000 }),
  ]);
};

const waitForRaceReady = async (page) => {
  await page.waitForSelector('[data-testid="race-screen"][data-race-track="comeback-city"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="arcade-race-shell"][data-race-track="comeback-city"]', { timeout: 15000 });
  await page.waitForFunction(
    () => {
      const screen = document.querySelector('[data-testid="race-screen"]');
      const shell = document.querySelector('[data-testid="arcade-race-shell"]');
      const visualCanvas = document.querySelector('canvas[data-visual-canvas="race"]');
      const fallbackCanvas = document.querySelector('[data-testid="race-fallback-canvas"]');
      const canvas = visualCanvas || fallbackCanvas;
      let canvasDataUrlLength = 0;
      try {
        canvasDataUrlLength = canvas?.toDataURL('image/png').length || 0;
      } catch {
        canvasDataUrlLength = -1;
      }
      const raceTime = Number(shell?.dataset.raceTime || 0);
      return (
        screen?.dataset.raceTrack === 'comeback-city' &&
        shell?.dataset.raceTrack === 'comeback-city' &&
        Boolean(screen?.getAttribute('data-race-renderer')) &&
        Number.isFinite(raceTime) &&
        (raceTime > 0.05 || canvasDataUrlLength > 1200 || canvasDataUrlLength === -1)
      );
    },
    null,
    { timeout: 15000 }
  );
};

const waitForRaceSpeed = async (page, minimumSpeed) => {
  await page.waitForFunction(
    (targetSpeed) => {
      const shell = document.querySelector('[data-testid="arcade-race-shell"]');
      return Number(shell?.dataset.raceSpeedRatio || 0) > targetSpeed;
    },
    minimumSpeed,
    { timeout: 10000 }
  );
};

const raceState = async (page) =>
  page.evaluate(() => {
    const screen = document.querySelector('[data-testid="race-screen"]');
    const shell = document.querySelector('[data-testid="arcade-race-shell"]');
    const visualCanvas = document.querySelector('canvas[data-visual-canvas="race"]');
    const fallbackCanvas = document.querySelector('[data-testid="race-fallback-canvas"]');
    const canvas = visualCanvas || fallbackCanvas;
    let canvasDataUrlLength = 0;
    try {
      canvasDataUrlLength = canvas?.toDataURL('image/png').length || 0;
    } catch {
      canvasDataUrlLength = -1;
    }
    return {
      canvasDataUrlLength,
      hash: window.location.hash,
      race: {
        lap: Number(shell?.dataset.raceLap || 0),
        normalizedSpeed: Number(shell?.dataset.raceSpeedRatio || 0),
        place: Number(shell?.dataset.racePlace || 0),
        time: Number(shell?.dataset.raceTime || 0),
        trackKey: shell?.dataset.raceTrack || screen?.dataset.raceTrack || null,
      },
      renderer: screen?.getAttribute('data-race-renderer') || null,
    };
  });

const smokeDesktopViewport = async (browser) => {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { height: 900, width: 1440 },
  });
  await installSeedState(context);
  await mockLocalSync(context);
  const page = await context.newPage();
  const errors = collectBrowserErrors(page);
  try {
    await page.goto(routeUrl('/'), { waitUntil: 'domcontentloaded' });
    await waitForHomeReady(page);
    const homeScreenshotPath = path.join(artifactsDir, 'desktop-home.png');
    await page.screenshot({ fullPage: false, path: homeScreenshotPath });

    await page.goto(routeUrl('/#race'), { waitUntil: 'domcontentloaded' });
    await waitForRaceReady(page);
    const beforeInput = await raceState(page);
    await page.keyboard.down('ArrowUp');
    try {
      await page.waitForTimeout(1400);
      await waitForRaceSpeed(page, Math.max(0.04, beforeInput.race.normalizedSpeed + 0.02));
    } finally {
      await page.keyboard.up('ArrowUp').catch(() => {});
    }
    const afterInput = await raceState(page);
    if (afterInput.canvasDataUrlLength !== -1 && afterInput.canvasDataUrlLength <= 1200) {
      fail('Desktop device matrix smoke did not render nonblank race output', { afterInput });
    }
    if (afterInput.race.normalizedSpeed <= beforeInput.race.normalizedSpeed) {
      fail('Desktop keyboard smoke did not increase race speed', { afterInput, beforeInput });
    }
    const raceScreenshotPath = path.join(artifactsDir, 'desktop-race.png');
    await page.screenshot({ fullPage: false, path: raceScreenshotPath });
    assertNoBlockingBrowserErrors('desktop viewport', errors);
    return {
      afterInput,
      beforeInput,
      homeScreenshotPath,
      raceScreenshotPath,
      status: 'pass',
      viewport: { height: 900, width: 1440 },
    };
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
};

const smokeEmulatedPhoneViewport = async (browser) => {
  const context = await browser.newContext({
    hasTouch: true,
    ignoreHTTPSErrors: true,
    isMobile: true,
    viewport: { height: 844, width: 390 },
  });
  await installSeedState(context);
  await mockLocalSync(context);
  const page = await context.newPage();
  const errors = collectBrowserErrors(page);
  try {
    await page.goto(routeUrl('/'), { waitUntil: 'domcontentloaded' });
    await waitForHomeReady(page);
    const homeScreenshotPath = path.join(artifactsDir, 'emulated-phone-home.png');
    await page.screenshot({ fullPage: false, path: homeScreenshotPath });

    await page.goto(routeUrl('/#race'), { waitUntil: 'domcontentloaded' });
    await waitForRaceReady(page);
    await page.waitForSelector('[data-testid="race-go-button"]', { timeout: 15000 });
    const beforeInput = await raceState(page);
    const goButton = page.getByTestId('race-go-button');
    const goButtonBox = await goButton.boundingBox();
    if (!goButtonBox) fail('Mobile Go touch control did not render a clickable box');
    await goButton.dispatchEvent('pointerdown', {
      bubbles: true,
      button: 0,
      buttons: 1,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });
    try {
      await page.waitForTimeout(1300);
      await waitForRaceSpeed(page, Math.max(0.04, beforeInput.race.normalizedSpeed + 0.02));
    } finally {
      await goButton.dispatchEvent('pointerup', {
        bubbles: true,
        button: 0,
        buttons: 0,
        isPrimary: true,
        pointerId: 1,
        pointerType: 'touch',
      }).catch(() => {});
    }
    const afterInput = await raceState(page);
    if (afterInput.canvasDataUrlLength !== -1 && afterInput.canvasDataUrlLength <= 1200) {
      fail('Emulated phone matrix smoke did not render nonblank race output', { afterInput });
    }
    if (afterInput.race.normalizedSpeed <= beforeInput.race.normalizedSpeed) {
      fail('Emulated phone touch smoke did not increase race speed', { afterInput, beforeInput });
    }
    const raceScreenshotPath = path.join(artifactsDir, 'emulated-phone-race.png');
    await page.screenshot({ fullPage: false, path: raceScreenshotPath });
    assertNoBlockingBrowserErrors('emulated phone viewport', errors);
    return {
      afterInput,
      beforeInput,
      goButtonBox,
      homeScreenshotPath,
      raceScreenshotPath,
      status: 'pass',
      viewport: { height: 844, width: 390 },
    };
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
};

const run = async () => {
  if (shouldCleanArtifacts) await rm(artifactsDir, { force: true, recursive: true });
  await mkdir(artifactsDir, { recursive: true });
  await ensureDist();
  port = await resolveLocalPreviewPort();
  baseUrl = `http://127.0.0.1:${port}`;

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
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

  let browser = null;
  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch({ headless: true });
    const desktop = await smokeDesktopViewport(browser);
    const emulatedPhone = await smokeEmulatedPhoneViewport(browser);
    const summary = {
      artifactsDir,
      baseUrl,
      capturedAt: new Date().toISOString(),
      coverage: {
        emulatedPhoneViewport: emulatedPhone.status,
        humanDesktopPlaythrough: 'not-run',
        humanPhonePlaythrough: 'not-run',
        localDesktopViewport: desktop.status,
        physicalLaptop: 'not-run',
        physicalPhone: 'not-run',
      },
      desktop,
      emulatedPhone,
      gateStatus: 'local-device-matrix-smoke-partial-not-physical-device-signoff',
      git: getGitMetadata(),
      note:
        'This smoke records local desktop viewport and emulated phone viewport behavior only. It does not replace the required physical laptop, physical phone, human playthrough, or release-owner sign-off.',
      unresolved: [
        'No physical laptop manual playthrough is recorded.',
        'No physical modern phone manual playthrough is recorded.',
        'No release-owner device matrix acceptance or dated exception is recorded.',
      ],
    };
    await writeFile(path.join(artifactsDir, 'device-matrix-smoke-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    await writeFile(path.join(artifactsDir, 'preview-server.log'), serverLog);
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    await writeFile(path.join(artifactsDir, 'preview-server.log'), serverLog).catch(() => {});
    throw error;
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill('SIGTERM');
  }
};

run().catch((error) => {
  console.error(error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  process.exit(1);
});
