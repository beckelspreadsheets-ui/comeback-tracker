import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { makeDefaultState, normalizeState, STORAGE_KEY, SYNC_META_KEY } from '../src/hooks/usePersistedState.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
let port = Number(process.env.RELEASE_SMOKE_PORT || 5201);
const suppliedUrl = process.env.RELEASE_SMOKE_URL?.trim() || '';
const target = process.env.RELEASE_SMOKE_TARGET || (suppliedUrl ? 'external-url' : 'local-built-preview');
let baseUrl = suppliedUrl ? suppliedUrl.replace(/\/+$/, '') : `http://127.0.0.1:${port}`;
const isLocalBuiltPreview = !suppliedUrl;
const shouldCleanArtifacts = !process.env.RELEASE_SMOKE_ARTIFACT_DIR;
const artifactsDir = process.env.RELEASE_SMOKE_ARTIFACT_DIR
  ? path.resolve(root, process.env.RELEASE_SMOKE_ARTIFACT_DIR)
  : path.join(root, 'tmp', 'release-smoke-test');
const distIndexPath = path.join(root, 'dist', 'index.html');
const publicHeadersPath = path.join(root, 'public', '_headers');

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
  fail('Release smoke target did not become ready', { url });
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
  if (process.env.RELEASE_SMOKE_PORT) {
    if (!(await canListenOnPort(port))) {
      fail('Requested RELEASE_SMOKE_PORT is already in use', { port });
    }
    return port;
  }
  for (let candidatePort = port; candidatePort < port + 50; candidatePort += 1) {
    if (await canListenOnPort(candidatePort)) return candidatePort;
  }
  fail('No available local release smoke preview port found', { startPort: port });
};

const ensureDist = async () => {
  await access(distIndexPath).catch(() => {
    fail('Built app artifact is missing; run npm run build before local release smoke', {
      filePath: distIndexPath,
    });
  });
};

const normalizeUrl = (route = '/') => {
  if (route.startsWith('http')) return route;
  const slashRoute = route.startsWith('/') || route.startsWith('#') ? route : `/${route}`;
  if (slashRoute.startsWith('#')) return `${baseUrl}/${slashRoute}`;
  return `${baseUrl}${slashRoute}`;
};

const parseHeaders = (source) => {
  const routes = {};
  let currentRoute = null;
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(rawLine)) {
      currentRoute = line.trim();
      routes[currentRoute] = routes[currentRoute] || {};
      continue;
    }
    if (!currentRoute) continue;
    const [name, ...rest] = line.trim().split(':');
    if (!name || !rest.length) continue;
    routes[currentRoute][name.toLowerCase()] = rest.join(':').trim();
  }
  return routes;
};

const selectedHeaders = (headers) => {
  const keys = [
    'cache-control',
    'cf-cache-status',
    'content-security-policy',
    'content-type',
    'etag',
    'last-modified',
    'permissions-policy',
    'referrer-policy',
    'server',
    'x-content-type-options',
    'x-frame-options',
  ];
  const result = {};
  for (const key of keys) {
    const value = headers.get(key);
    if (value) result[key] = value;
  }
  return result;
};

const fetchProbe = async (label, route, { expectOk = true, parseJson = false } = {}) => {
  const url = normalizeUrl(route);
  const response = await fetch(url, { redirect: 'follow' });
  const headers = selectedHeaders(response.headers);
  let bodySnippet = null;
  let json = null;
  if (parseJson && response.ok) {
    const text = await response.text();
    bodySnippet = text.slice(0, 5000);
    try {
      json = JSON.parse(text);
    } catch {
      fail('Expected JSON response was not valid JSON', { bodySnippet, label, status: response.status, url });
    }
  } else {
    bodySnippet = (await response.text().catch(() => '')).slice(0, 5000);
  }
  if (expectOk && !response.ok) {
    fail('Release smoke fetch probe failed', { bodySnippet, label, status: response.status, url });
  }
  return {
    bodySnippet,
    headers,
    json,
    label,
    ok: response.ok,
    status: response.status,
    url,
  };
};

const assetPathFromHtml = (html) => {
  const match = html.match(/(?:src|href)="([^"]*\/assets\/[^"]+\.(?:js|css))"/);
  return match?.[1] || null;
};

const compareDeployedHeaders = async ({ assetPath }) => {
  if (isLocalBuiltPreview) {
    return {
      status: 'local-preview-skipped',
      note: 'Vite preview does not apply Cloudflare Pages _headers; deployed header evidence still requires RELEASE_SMOKE_URL.',
    };
  }

  const expected = parseHeaders(await readFile(publicHeadersPath, 'utf8'));
  const root = await fetchProbe('root headers', '/');
  const manifest = await fetchProbe('manifest headers', '/manifest.webmanifest');
  const serviceWorker = await fetchProbe('service worker headers', '/sw.js');
  const asset = assetPath ? await fetchProbe('asset headers', assetPath) : null;
  const checks = [
    ['root content-security-policy', root.headers['content-security-policy'], expected['/*']?.['content-security-policy']],
    ['root x-frame-options', root.headers['x-frame-options'], expected['/*']?.['x-frame-options']],
    ['root x-content-type-options', root.headers['x-content-type-options'], expected['/*']?.['x-content-type-options']],
    ['root referrer-policy', root.headers['referrer-policy'], expected['/*']?.['referrer-policy']],
    ['root permissions-policy', root.headers['permissions-policy'], expected['/*']?.['permissions-policy']],
    ['manifest cache-control', manifest.headers['cache-control'], expected['/manifest.webmanifest']?.['cache-control']],
    ['service worker cache-control', serviceWorker.headers['cache-control'], expected['/sw.js']?.['cache-control']],
  ];
  if (asset) {
    checks.push(['asset cache-control', asset.headers['cache-control'], expected['/assets/*']?.['cache-control']]);
  }
  const failures = checks
    .filter(([, actual, expectedValue]) => actual !== expectedValue)
    .map(([label, actual, expectedValue]) => ({ actual: actual || null, expected: expectedValue || null, label }));
  if (failures.length) {
    fail('Deployed response headers do not match public/_headers release policy', { failures });
  }
  return {
    asset,
    checks: checks.map(([label, actual, expectedValue]) => ({ actual, expected: expectedValue, label })),
    manifest,
    root,
    serviceWorker,
    status: 'pass',
  };
};

const isAllowedExternalFailure = (url) => /https:\/\/fonts\.(?:googleapis|gstatic)\.com\//.test(url);

const isAllowedConsoleError = (message) =>
  /401 \(Unauthorized\)/.test(message) ||
  /server responded with a status of 401 \(\)/.test(message) ||
  /403 \(Forbidden\)/.test(message) ||
  /\/api\/sync\//.test(message) ||
  /Failed to load resource: net::ERR_FAILED/.test(message);

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
    if (isAllowedExternalFailure(request.url())) return;
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
    fail('Blocking browser errors recorded during release smoke', { errors, label });
  }
};

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

const maybeMockLocalSync = async (context) => {
  const shouldMockSync =
    process.env.RELEASE_SMOKE_MOCK_SYNC === '1' ||
    (isLocalBuiltPreview && process.env.RELEASE_SMOKE_MOCK_SYNC !== '0');
  if (!shouldMockSync) {
    return { mode: 'pass-through' };
  }
  await context.route('**/api/sync/**', async (route) => {
    await route.fulfill({
      body: JSON.stringify({ error: 'not_authenticated' }),
      contentType: 'application/json',
      status: 401,
    });
  });
  return { mode: 'mock-unauthenticated-sync' };
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
        audioMuted: shell?.dataset.raceAudioMuted || null,
        lap: Number(shell?.dataset.raceLap || 0),
        normalizedSpeed: Number(shell?.dataset.raceSpeedRatio || 0),
        place: Number(shell?.dataset.racePlace || 0),
        reducedMotion: shell?.dataset.reducedMotion || null,
        time: Number(shell?.dataset.raceTime || 0),
        trackKey: shell?.dataset.raceTrack || screen?.dataset.raceTrack || null,
      },
      renderer: screen?.getAttribute('data-race-renderer') || null,
      telemetry: window.__raceVisualTelemetry || null,
    };
  });

const waitForRaceReady = async (page) => {
  await page.waitForSelector('[data-testid="race-screen"][data-race-track="comeback-city"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="arcade-race-shell"][data-race-track="comeback-city"]', { timeout: 15000 });
  await page.waitForFunction(
    () => {
      const screen = document.querySelector('[data-testid="race-screen"]');
      const shell = document.querySelector('[data-testid="arcade-race-shell"]');
      const canvas = document.querySelector('canvas[data-visual-canvas="race"]') ||
        document.querySelector('[data-testid="race-fallback-canvas"]');
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
        Boolean(screen?.dataset.raceRenderer) &&
        Number.isFinite(raceTime) &&
        (raceTime > 0.05 || canvasDataUrlLength > 1200 || canvasDataUrlLength === -1)
      );
    },
    null,
    { timeout: 15000 }
  );
};

const waitForRaceSpeed = async (page, minimumSpeed = 0.05) => {
  await page.waitForFunction(
    (targetSpeed) => {
      const shell = document.querySelector('[data-testid="arcade-race-shell"]');
      return Number(shell?.dataset.raceSpeedRatio || 0) > targetSpeed;
    },
    minimumSpeed,
    { timeout: 8000 }
  );
};

const smokeRaceDesktop = async (context) => {
  const page = await context.newPage();
  const errors = collectBrowserErrors(page);
  await page.goto(normalizeUrl('/#race'), { waitUntil: 'domcontentloaded' });
  await waitForRaceReady(page);
  const beforeInput = await raceState(page);
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(1400);
  await page.keyboard.up('ArrowUp');
  await waitForRaceSpeed(page);
  const afterInput = await raceState(page);
  if (afterInput.canvasDataUrlLength !== -1 && afterInput.canvasDataUrlLength <= 1200) {
    fail('Race canvas did not produce a nonblank data URL during desktop smoke', { afterInput });
  }
  if (afterInput.race.normalizedSpeed <= beforeInput.race.normalizedSpeed) {
    fail('Keyboard acceleration did not increase race speed state', { afterInput, beforeInput });
  }
  const screenshotPath = path.join(artifactsDir, 'release-smoke-race-desktop.png');
  await page.screenshot({ fullPage: false, path: screenshotPath });
  await page.getByTestId('race-exit-button').click();
  await Promise.race([
    page.waitForSelector('[data-testid="playable-world-home"]', { timeout: 12000 }),
    page.waitForSelector('text=The Comeback', { timeout: 12000 }),
  ]);
  const afterExit = await page.evaluate(() => ({
    hash: window.location.hash,
    raceScreenCount: document.querySelectorAll('[data-testid="race-screen"]').length,
    titleSeen: document.body.innerText.includes('The Comeback'),
    worldHomeVisible: Boolean(document.querySelector('[data-testid="playable-world-home"]')),
  }));
  if (afterExit.hash || afterExit.raceScreenCount !== 0 || (!afterExit.titleSeen && !afterExit.worldHomeVisible)) {
    fail('Race exit path did not return home and clear #race during release smoke', { afterExit });
  }
  assertNoBlockingBrowserErrors('desktop race', errors);
  await page.close();
  return {
    afterExit,
    afterInput,
    beforeInput,
    screenshotPath,
    status: 'pass',
  };
};

const smokeRacePlaytestHooksDisabled = async (context) => {
  const page = await context.newPage();
  const errors = collectBrowserErrors(page);
  const route = '/?raceAutoplay=1&raceMode=visual-kart&raceVisualScenario=acceleration&raceNoFinish=1#race';
  await page.goto(normalizeUrl(route), { waitUntil: 'domcontentloaded' });
  await waitForRaceReady(page);
  await page.waitForTimeout(1400);
  const state = await page.evaluate(() => ({
    hash: window.location.hash,
    hasPlaytestEvents: Object.prototype.hasOwnProperty.call(window, '__racePlaytestEvents'),
    hasPlaytestResult: Object.prototype.hasOwnProperty.call(window, '__racePlaytestResult'),
    hasTelemetry: Object.prototype.hasOwnProperty.call(window, '__raceVisualTelemetry'),
    hasTelemetrySamples: Object.prototype.hasOwnProperty.call(window, '__raceVisualTelemetrySamples'),
    normalizedSpeed: Number(document.querySelector('[data-testid="arcade-race-shell"]')?.dataset.raceSpeedRatio || 0),
    playtestEventsLength: window.__racePlaytestEvents?.length || 0,
    playtestResult: window.__racePlaytestResult || null,
    telemetrySampleLength: window.__raceVisualTelemetrySamples?.length || 0,
    telemetryTrack: window.__raceVisualTelemetry?.trackKey || null,
  }));
  if (
    state.hasPlaytestEvents ||
    state.hasPlaytestResult ||
    state.hasTelemetry ||
    state.hasTelemetrySamples ||
    state.playtestEventsLength !== 0 ||
    state.playtestResult !== null ||
    state.telemetrySampleLength !== 0 ||
    state.normalizedSpeed > 0.02
  ) {
    fail('Production release smoke accepted race playtest/autoplay hooks', { route, state });
  }
  assertNoBlockingBrowserErrors('race playtest hooks disabled', errors);
  await page.close();
  return {
    route,
    state,
    status: 'pass',
  };
};

const smokeRaceMobile = async (context) => {
  const page = await context.newPage();
  const errors = collectBrowserErrors(page);
  await page.goto(normalizeUrl('/#race'), { waitUntil: 'domcontentloaded' });
  await waitForRaceReady(page);
  await page.waitForSelector('[data-testid="race-go-button"]', { timeout: 15000 });
  const beforeInput = await raceState(page);
  const goButton = page.getByTestId('race-go-button');
  const box = await goButton.boundingBox();
  if (!box) fail('Mobile Go touch control did not render a clickable box');
  await goButton.dispatchEvent('pointerdown', {
    bubbles: true,
    button: 0,
    buttons: 1,
    isPrimary: true,
    pointerId: 1,
    pointerType: 'touch',
  });
  await page.waitForTimeout(1200);
  await goButton.dispatchEvent('pointerup', {
    bubbles: true,
    button: 0,
    buttons: 0,
    isPrimary: true,
    pointerId: 1,
    pointerType: 'touch',
  });
  await waitForRaceSpeed(page);
  const afterInput = await raceState(page);
  if (afterInput.canvasDataUrlLength !== -1 && afterInput.canvasDataUrlLength <= 1200) {
    fail('Race canvas did not produce a nonblank data URL during mobile smoke', { afterInput });
  }
  if (afterInput.race.normalizedSpeed <= beforeInput.race.normalizedSpeed) {
    fail('Touch acceleration did not increase race speed state', { afterInput, beforeInput });
  }
  const screenshotPath = path.join(artifactsDir, 'release-smoke-race-mobile.png');
  await page.screenshot({ fullPage: false, path: screenshotPath });
  assertNoBlockingBrowserErrors('mobile race', errors);
  await page.close();
  return {
    afterInput,
    beforeInput,
    goButtonBox: box,
    screenshotPath,
    status: 'pass',
  };
};

const smokeCoreTracker = async (context) => {
  const page = await context.newPage();
  const errors = collectBrowserErrors(page);
  await page.goto(normalizeUrl('/'), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=The Comeback', { timeout: 12000 });
  const homeScreenshotPath = path.join(artifactsDir, 'release-smoke-home.png');
  await page.screenshot({ fullPage: false, path: homeScreenshotPath });
  await page.getByRole('button', { name: /^Food$/i }).click();
  await page.waitForSelector('text=Daily fuel', { timeout: 12000 });
  await page.getByRole('button', { name: /^Setup$/i }).click();
  await page.waitForSelector('text=Body & Program', { timeout: 12000 });
  await page.getByRole('button', { name: /^Today$/i }).click();
  await page.waitForSelector('text=The Comeback', { timeout: 12000 });
  const finalState = await page.evaluate(() => ({
    hash: window.location.hash,
    text: document.body.innerText.slice(0, 500),
    title: document.title,
  }));
  assertNoBlockingBrowserErrors('core tracker navigation', errors);
  await page.close();
  return {
    finalState,
    navigation: ['home', 'food', 'settings', 'home'],
    screenshotPath: homeScreenshotPath,
    status: 'pass',
  };
};

const runBrowserSmoke = async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const desktopContext = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { height: 900, width: 1440 },
    });
    await installSeedState(desktopContext);
    const desktopSync = await maybeMockLocalSync(desktopContext);
    const coreTracker = await smokeCoreTracker(desktopContext);
    const playtestHooks = await smokeRacePlaytestHooksDisabled(desktopContext);
    const raceDesktop = await smokeRaceDesktop(desktopContext);
    await desktopContext.close();

    const mobileContext = await browser.newContext({
      hasTouch: true,
      ignoreHTTPSErrors: true,
      isMobile: true,
      viewport: { height: 844, width: 390 },
    });
    await installSeedState(mobileContext);
    const mobileSync = await maybeMockLocalSync(mobileContext);
    const raceMobile = await smokeRaceMobile(mobileContext);
    await mobileContext.close();

    return {
      coreTracker,
      playtestHooks,
      raceDesktop,
      raceMobile,
      sync: {
        desktop: desktopSync,
        mobile: mobileSync,
      },
    };
  } finally {
    await browser.close();
  }
};

const run = async () => {
  if (shouldCleanArtifacts) await rm(artifactsDir, { force: true, recursive: true });
  await mkdir(artifactsDir, { recursive: true });
  if (isLocalBuiltPreview) {
    await ensureDist();
    port = await resolveLocalPreviewPort();
    baseUrl = `http://127.0.0.1:${port}`;
  }

  let server = null;
  let serverLog = '';
  try {
    if (isLocalBuiltPreview) {
      const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      server = spawn(npm, ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
        cwd: root,
        env: { ...process.env, BROWSER: 'none' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      server.stdout.on('data', (chunk) => {
        serverLog += chunk.toString();
      });
      server.stderr.on('data', (chunk) => {
        serverLog += chunk.toString();
      });
    }

    await waitForServer(baseUrl);
    const rootProbe = await fetchProbe('app root', '/');
    const assetPath = assetPathFromHtml(rootProbe.bodySnippet);
    const manifestProbe = await fetchProbe('manifest', '/manifest.webmanifest', { parseJson: true });
    const serviceWorkerProbe = await fetchProbe('service worker', '/sw.js');
    const apiProbes = {
      fatSecretShortQuery: await fetchProbe('fatsecret short query', '/api/fatsecret/search?q=a', { expectOk: false }),
      syncMe: await fetchProbe('sync me', '/api/sync/me', { expectOk: false }),
    };
    const failingApiProbes = Object.values(apiProbes).filter((probe) => probe.status >= 500);
    if (failingApiProbes.length) {
      fail('Release smoke API safe-status probes returned server errors', { failingApiProbes });
    }
    const deployedHeaders = await compareDeployedHeaders({ assetPath });
    const browser = await runBrowserSmoke();
    const summary = {
      apiProbes,
      apiProbeStatus: isLocalBuiltPreview
        ? 'local-vite-fallback-only-not-functions-evidence'
        : 'safe-status-probed-not-authenticated-d1-proof',
      artifactFiles: [
        path.join(artifactsDir, 'release-smoke-home.png'),
        path.join(artifactsDir, 'release-smoke-race-desktop.png'),
        path.join(artifactsDir, 'release-smoke-race-mobile.png'),
        path.join(artifactsDir, 'release-smoke-summary.json'),
      ],
      artifactsDir,
      baseUrl,
      browser,
      capturedAt: new Date().toISOString(),
      deployedHeaders,
      gateStatus: isLocalBuiltPreview ? 'local-smoke-script-proven-not-deploy-evidence' : 'url-smoke-pass-needs-owner-signoff',
      git: getGitMetadata(),
      manifestProbe: {
        display: manifestProbe.json?.display || null,
        iconCount: manifestProbe.json?.icons?.length || 0,
        name: manifestProbe.json?.name || null,
        ok: manifestProbe.ok,
        shortName: manifestProbe.json?.short_name || null,
        status: manifestProbe.status,
        url: manifestProbe.url,
      },
      rootProbe: {
        assetPath,
        headers: rootProbe.headers,
        ok: rootProbe.ok,
        status: rootProbe.status,
        url: rootProbe.url,
      },
      serviceWorkerProbe: {
        headers: serviceWorkerProbe.headers,
        ok: serviceWorkerProbe.ok,
        status: serviceWorkerProbe.status,
        url: serviceWorkerProbe.url,
      },
      target,
      unresolvedReleaseDecisions: [
        'Preview deployment URL, deployment ID, and release-owner sign-off',
        'Production deployment URL, deployment ID, and release-owner sign-off',
        'Authenticated D1 sync, backups, and FatSecret production binding evidence if those routes ship',
        'Rollback target/drill evidence and monitoring/support owner decision',
      ],
    };
    await writeFile(path.join(artifactsDir, 'release-smoke-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    if (serverLog) error.detail = { ...(error.detail || {}), serverLog: serverLog.slice(-4000) };
    throw error;
  } finally {
    if (server) server.kill('SIGTERM');
  }
};

run().catch((error) => {
  console.error(error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  process.exit(1);
});
