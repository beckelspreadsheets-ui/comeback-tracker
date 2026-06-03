import { spawn, execFileSync } from 'node:child_process';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { makeDefaultState, normalizeState, STORAGE_KEY, SYNC_META_KEY } from '../src/hooks/usePersistedState.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
let port = Number(process.env.CROSS_BROWSER_SMOKE_PORT || 5223);
let baseUrl = `http://127.0.0.1:${port}`;
const shouldCleanArtifacts = !process.env.CROSS_BROWSER_SMOKE_ARTIFACT_DIR;
const artifactsDir = process.env.CROSS_BROWSER_SMOKE_ARTIFACT_DIR
  ? path.resolve(root, process.env.CROSS_BROWSER_SMOKE_ARTIFACT_DIR)
  : path.join(root, 'tmp', 'cross-browser-smoke-test');
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
  fail('Cross-browser smoke preview server did not become ready', { url });
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
  if (process.env.CROSS_BROWSER_SMOKE_PORT) {
    if (!(await canListenOnPort(port))) {
      fail('Requested CROSS_BROWSER_SMOKE_PORT is already in use', { port });
    }
    return port;
  }
  for (let candidatePort = port; candidatePort < port + 50; candidatePort += 1) {
    if (await canListenOnPort(candidatePort)) return candidatePort;
  }
  fail('No available local cross-browser smoke preview port found', { startPort: port });
};

const ensureDist = async () => {
  await access(distIndexPath).catch(() => {
    fail('Built app artifact is missing; run npm run build before npm run test:cross-browser', {
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

const isAllowedExternalFailure = (url) => /https:\/\/fonts\.(?:googleapis|gstatic)\.com\//.test(url);

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
    if (isAllowedExternalFailure(request.url()) || /\/api\/sync\//.test(request.url())) return;
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
    fail('Blocking browser errors recorded during cross-browser smoke', { errors, label });
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

const launchTargetBrowser = async (target) => {
  if (target.channel) {
    return chromium.launch({ channel: target.channel, headless: true });
  }
  return target.browserType.launch({ headless: true });
};

const smokeBrowserTarget = async (target) => {
  let browser = null;
  let context = null;
  let page = null;
  const startedAt = new Date().toISOString();
  try {
    browser = await launchTargetBrowser(target);
  } catch (error) {
    return {
      id: target.id,
      label: target.label,
      notes: target.notes,
      required: target.required,
      startedAt,
      status: 'unavailable',
      unavailableReason: error.message.split('\n')[0],
    };
  }

  try {
    context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { height: 900, width: 1440 },
    });
    await installSeedState(context);
    await mockLocalSync(context);
    page = await context.newPage();
    const errors = collectBrowserErrors(page);

    await page.goto(routeUrl('/'), { waitUntil: 'domcontentloaded' });
    await waitForHomeReady(page);
    const homeState = await page.evaluate(() => ({
      hash: window.location.hash,
      homeVisible: Boolean(document.querySelector('[data-testid="playable-world-home"]')),
      textSeen: document.body.innerText.includes('The Comeback'),
      title: document.title,
    }));
    const homeScreenshotPath = path.join(artifactsDir, `${target.id}-home.png`);
    await page.screenshot({ fullPage: false, path: homeScreenshotPath });

    await page.goto(routeUrl('/#race'), { waitUntil: 'domcontentloaded' });
    await waitForRaceReady(page);
    await page.locator('[data-testid="arcade-race-shell"]').click({ position: { x: 24, y: 24 }, timeout: 3000 }).catch(() => {});
    const beforeInput = await raceState(page);
    await page.keyboard.down('ArrowUp');
    try {
      await page.waitForTimeout(1500);
      await waitForRaceSpeed(page, Math.max(0.04, beforeInput.race.normalizedSpeed + 0.02));
    } finally {
      await page.keyboard.up('ArrowUp').catch(() => {});
    }
    const afterInput = await raceState(page);
    if (afterInput.canvasDataUrlLength !== -1 && afterInput.canvasDataUrlLength <= 1200) {
      fail('Race canvas did not produce a nonblank data URL during cross-browser smoke', {
        afterInput,
        target: target.id,
      });
    }
    if (afterInput.race.normalizedSpeed <= beforeInput.race.normalizedSpeed) {
      fail('Keyboard acceleration did not increase race speed state during cross-browser smoke', {
        afterInput,
        beforeInput,
        target: target.id,
      });
    }
    const raceScreenshotPath = path.join(artifactsDir, `${target.id}-race.png`);
    await page.screenshot({ fullPage: false, path: raceScreenshotPath });

    await page.getByTestId('race-exit-button').click();
    await waitForHomeReady(page);
    const afterExit = await page.evaluate(() => ({
      hash: window.location.hash,
      homeVisible: Boolean(document.querySelector('[data-testid="playable-world-home"]')),
      raceScreenCount: document.querySelectorAll('[data-testid="race-screen"]').length,
      textSeen: document.body.innerText.includes('The Comeback'),
    }));
    if (afterExit.hash || afterExit.raceScreenCount !== 0 || (!afterExit.textSeen && !afterExit.homeVisible)) {
      fail('Race exit path did not return home and clear #race during cross-browser smoke', {
        afterExit,
        target: target.id,
      });
    }

    assertNoBlockingBrowserErrors(target.id, errors);
    return {
      afterExit,
      afterInput,
      beforeInput,
      finishedAt: new Date().toISOString(),
      homeScreenshotPath,
      homeState,
      id: target.id,
      label: target.label,
      notes: target.notes,
      raceScreenshotPath,
      required: target.required,
      startedAt,
      status: 'pass',
    };
  } catch (error) {
    return {
      detail: error.detail || null,
      finishedAt: new Date().toISOString(),
      id: target.id,
      label: target.label,
      message: error.message,
      notes: target.notes,
      required: target.required,
      startedAt,
      status: 'fail',
    };
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
};

const summarizeCoverage = (targets) => {
  const byId = Object.fromEntries(targets.map((target) => [target.id, target.status]));
  return {
    actualChrome: byId.chrome || 'not-run',
    actualEdge: byId.edge || 'not-run',
    actualSafari: 'not-automated',
    playwrightChromium: byId.chromium || 'not-run',
    playwrightFirefox: byId.firefox || 'not-run',
    playwrightWebKit: byId.webkit === 'pass' ? 'pass-engine-proxy-not-actual-safari-signoff' : byId.webkit || 'not-run',
  };
};

const unresolvedCoverage = (targets) => {
  const byId = Object.fromEntries(targets.map((target) => [target.id, target]));
  const unresolved = [
    'Actual Safari desktop is not automated by this local harness; Playwright WebKit is recorded only as an engine proxy.',
    'Human target-browser/device sign-off remains required before the P1 cross-browser matrix can close.',
  ];
  if (byId.edge?.status !== 'pass') {
    unresolved.push('Microsoft Edge was not proven by this local harness.');
  }
  if (byId.chrome?.status !== 'pass') {
    unresolved.push('Actual Chrome channel was not proven by this local harness.');
  }
  return unresolved;
};

const run = async () => {
  if (shouldCleanArtifacts) await rm(artifactsDir, { force: true, recursive: true });
  await mkdir(artifactsDir, { recursive: true });
  await ensureDist();
  port = await resolveLocalPreviewPort();
  baseUrl = `http://127.0.0.1:${port}`;

  const targets = [
    {
      browserType: chromium,
      id: 'chromium',
      label: 'Playwright Chromium',
      notes: 'Bundled Playwright Chromium engine.',
      required: true,
    },
    {
      browserType: firefox,
      id: 'firefox',
      label: 'Playwright Firefox',
      notes: 'Bundled Playwright Firefox engine.',
      required: true,
    },
    {
      browserType: webkit,
      id: 'webkit',
      label: 'Playwright WebKit',
      notes: 'WebKit engine proxy only; this is not actual Safari sign-off.',
      required: true,
    },
    {
      channel: 'chrome',
      id: 'chrome',
      label: 'Google Chrome channel',
      notes: 'Installed local Chrome channel when available.',
      required: false,
    },
    {
      channel: 'msedge',
      id: 'edge',
      label: 'Microsoft Edge channel',
      notes: 'Installed local Edge channel when available.',
      required: false,
    },
  ];

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

  try {
    await waitForServer(baseUrl);
    const results = [];
    for (const target of targets) {
      results.push(await smokeBrowserTarget(target));
    }

    const blockingFailures = results.filter((target) => target.status === 'fail' || (target.required && target.status !== 'pass'));
    const summary = {
      artifactsDir,
      baseUrl,
      capturedAt: new Date().toISOString(),
      coverage: summarizeCoverage(results),
      gateStatus: blockingFailures.length
        ? 'local-cross-browser-smoke-failed'
        : 'local-cross-browser-smoke-partial-not-target-signoff',
      git: getGitMetadata(),
      note:
        'This local smoke proves installed engine behavior only. It does not infer actual Safari, unavailable Edge, human device coverage, or release-owner sign-off.',
      targets: results,
      unresolved: unresolvedCoverage(results),
    };
    await writeFile(path.join(artifactsDir, 'cross-browser-smoke-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    await writeFile(path.join(artifactsDir, 'preview-server.log'), serverLog);
    console.log(JSON.stringify(summary, null, 2));

    if (blockingFailures.length) {
      process.exitCode = 1;
    }
  } catch (error) {
    await writeFile(path.join(artifactsDir, 'preview-server.log'), serverLog).catch(() => {});
    throw error;
  } finally {
    server.kill('SIGTERM');
  }
};

run().catch((error) => {
  console.error(error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  process.exit(1);
});
