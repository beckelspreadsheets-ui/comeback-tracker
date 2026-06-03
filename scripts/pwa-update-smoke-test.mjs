import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { makeDefaultState, normalizeState, STORAGE_KEY, SYNC_META_KEY } from '../src/hooks/usePersistedState.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PWA_UPDATE_SMOKE_PORT || 5198);
const hostName = process.env.PWA_UPDATE_SMOKE_HOST || 'pwa-update.localhost';
const baseUrl = `http://${hostName}:${port}`;
const readinessUrl = `http://127.0.0.1:${port}`;
const shouldCleanArtifacts = !process.env.PWA_UPDATE_SMOKE_ARTIFACT_DIR;
const artifactsDir = process.env.PWA_UPDATE_SMOKE_ARTIFACT_DIR
  ? path.resolve(root, process.env.PWA_UPDATE_SMOKE_ARTIFACT_DIR)
  : path.join(root, 'tmp', 'pwa-update-smoke-test');

const sourceDistDir = path.join(root, 'dist');
const versionRootDir = path.join(artifactsDir, 'served-versions');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff2': 'font/woff2',
};

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

const headerSetForPath = (routes, pathname) => {
  const headers = { ...(routes['/*'] || {}) };
  for (const [routeName, routeHeaders] of Object.entries(routes)) {
    if (routeName === '/*') continue;
    if (routeName.endsWith('/*')) {
      const prefix = routeName.slice(0, -1);
      if (pathname.startsWith(prefix)) Object.assign(headers, routeHeaders);
      continue;
    }
    if (pathname === routeName) Object.assign(headers, routeHeaders);
  }
  return headers;
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
  fail('PWA update smoke server did not become ready', { url });
};

const ensureDist = async () => {
  for (const filePath of ['index.html', '_headers', 'sw.js', 'manifest.webmanifest']) {
    const absolutePath = path.join(sourceDistDir, filePath);
    await access(absolutePath).catch(() => {
      fail('Built PWA artifact is missing; run npm run build before npm run test:pwa:update', {
        filePath: absolutePath,
      });
    });
  }
};

const revisionFor = (label, indexHtml) =>
  createHash('md5').update(`${label}:${indexHtml}`).digest('hex');

const prepareVersion = async (label) => {
  const versionDir = path.join(versionRootDir, label);
  await rm(versionDir, { force: true, recursive: true });
  await cp(sourceDistDir, versionDir, { recursive: true });

  const marker = `pwa-update-smoke-${label}`;
  const indexPath = path.join(versionDir, 'index.html');
  const swPath = path.join(versionDir, 'sw.js');
  const originalIndex = await readFile(indexPath, 'utf8');
  const markedIndex = originalIndex.includes('name="x-pwa-update-smoke"')
    ? originalIndex.replace(
        /<meta name="x-pwa-update-smoke" content="[^"]*">/,
        `<meta name="x-pwa-update-smoke" content="${marker}">`
      )
    : originalIndex.replace('<head>', `<head><meta name="x-pwa-update-smoke" content="${marker}">`);
  await writeFile(indexPath, markedIndex);

  const nextRevision = revisionFor(label, markedIndex);
  const originalSw = await readFile(swPath, 'utf8');
  const updatedSw = originalSw
    .replace(/url:"index\.html",revision:"[^"]+"/, `url:"index.html",revision:"${nextRevision}"`)
    .concat(`\n/* ${marker} */\n`);
  if (updatedSw === originalSw) {
    fail('Could not inject PWA update smoke revision into service worker', { swPath });
  }
  await writeFile(swPath, updatedSw);

  return {
    dir: versionDir,
    marker,
    swRevision: nextRevision,
  };
};

const startVersionedServer = async (initialVersionDir) => {
  let activeDir = initialVersionDir;
  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url || '/', readinessUrl);
    let pathname = decodeURIComponent(requestUrl.pathname);
    if (pathname === '/') pathname = '/index.html';
    const headersPath = path.join(activeDir, '_headers');
    const routes = parseHeaders(await readFile(headersPath, 'utf8'));
    const requestedPath = path.normalize(path.join(activeDir, pathname));
    const safeRequestedPath = requestedPath.startsWith(activeDir) ? requestedPath : path.join(activeDir, 'index.html');
    let filePath = safeRequestedPath;
    let body;
    try {
      body = await readFile(filePath);
    } catch {
      filePath = path.join(activeDir, 'index.html');
      pathname = '/index.html';
      body = await readFile(filePath);
    }

    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
      ...headerSetForPath(routes, pathname),
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    response.end(body);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', resolve);
  });

  return {
    server,
    switchTo(versionDir) {
      activeDir = versionDir;
    },
  };
};

const serviceWorkerSnapshot = async (page) =>
  page.evaluate(async () => {
    const registrations = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistrations() : [];
    const registration = registrations[0] || null;
    return {
      cacheKeys: 'caches' in window ? await caches.keys() : [],
      controllerScriptURL: navigator.serviceWorker?.controller?.scriptURL || null,
      controllerState: navigator.serviceWorker?.controller?.state || null,
      registrations: registrations.map((entry) => ({
        activeScriptURL: entry.active?.scriptURL || null,
        activeState: entry.active?.state || null,
        installingState: entry.installing?.state || null,
        scope: entry.scope,
        waitingState: entry.waiting?.state || null,
      })),
      supported: 'serviceWorker' in navigator,
      waitingScriptURL: registration?.waiting?.scriptURL || null,
    };
  });

const waitForControlledServiceWorker = async (page) =>
  page.evaluate(async () => {
    const withTimeout = (promise, ms, label) =>
      Promise.race([
        promise,
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`${label} timed out`)), ms);
        }),
      ]);

    if (!('serviceWorker' in navigator)) return { supported: false, isSecureContext: window.isSecureContext };
    const ready = await withTimeout(navigator.serviceWorker.ready, 15000, 'service worker ready');
    if (!navigator.serviceWorker.controller) {
      await withTimeout(
        new Promise((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
        }),
        12000,
        'service worker controllerchange'
      ).catch(() => {});
    }
    return {
      activeScriptURL: ready.active?.scriptURL || null,
      controllerScriptURL: navigator.serviceWorker.controller?.scriptURL || null,
      isSecureContext: window.isSecureContext,
      supported: true,
    };
  });

const updateServiceWorker = async (page) =>
  page.evaluate(async () => {
    const withTimeout = (promise, ms, label) =>
      Promise.race([
        promise,
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`${label} timed out`)), ms);
        }),
      ]);

    const registration = await withTimeout(navigator.serviceWorker.ready, 15000, 'service worker ready before update');
    const previousController = navigator.serviceWorker.controller;
    const events = [];
    const controllerChanged = new Promise((resolve) => {
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => {
          events.push('controllerchange');
          resolve(true);
        },
        { once: true }
      );
    });
    registration.addEventListener('updatefound', () => events.push('updatefound'), { once: true });
    await registration.update();

    await withTimeout(
      Promise.race([
        controllerChanged,
        new Promise((resolve) => {
          const started = Date.now();
          const poll = () => {
            if (navigator.serviceWorker.controller && navigator.serviceWorker.controller !== previousController) {
              events.push('controller-polled');
              resolve(true);
              return;
            }
            if (Date.now() - started > 12000) {
              resolve(false);
              return;
            }
            setTimeout(poll, 200);
          };
          poll();
        }),
      ]),
      15000,
      'service worker update activation'
    );

    return {
      activeScriptURL: registration.active?.scriptURL || null,
      controllerScriptURL: navigator.serviceWorker.controller?.scriptURL || null,
      events,
      waitingScriptURL: registration.waiting?.scriptURL || null,
    };
  });

const readMarker = async (page) =>
  page.evaluate(() => document.querySelector('meta[name="x-pwa-update-smoke"]')?.getAttribute('content') || null);

const reloadAppShell = async (page, options = {}) => {
  try {
    await page.reload({ waitUntil: 'domcontentloaded', ...options });
  } catch (error) {
    if (!/net::ERR_ABORTED|frame was detached/.test(error.message || '')) throw error;
  }
  await page.waitForSelector('text=The Comeback', { timeout: 12000 });
};

const runBrowserSmoke = async ({ versionOne, versionTwo }) => {
  const { server, switchTo } = await startVersionedServer(versionOne.dir);
  let browser;
  try {
    await waitForServer(readinessUrl);
    browser = await chromium.launch({
      args: [
        `--host-resolver-rules=MAP ${hostName} 127.0.0.1`,
        `--unsafely-treat-insecure-origin-as-secure=${baseUrl}`,
      ],
      headless: true,
    });
    const context = await browser.newContext({
      viewport: { height: 760, width: 1280 },
    });
    await context.route('https://fonts.googleapis.com/**', async (route) => {
      await route.fulfill({
        body: '/* fonts stubbed for deterministic PWA update smoke */',
        contentType: 'text/css',
        status: 200,
      });
    });
    await context.route('**/api/sync/**', async (route) => {
      await route.fulfill({
        body: JSON.stringify({ error: 'not_authenticated' }),
        contentType: 'application/json',
        status: 401,
      });
    });
    const page = await context.newPage();
    const pageErrors = [];
    const requestFailures = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        !/401 \(Unauthorized\)/.test(message.text()) &&
        !/net::ERR_INTERNET_DISCONNECTED/.test(message.text())
      ) {
        pageErrors.push(message.text());
      }
    });
    page.on('requestfailed', (request) => {
      requestFailures.push({
        errorText: request.failure()?.errorText || null,
        url: request.url(),
      });
    });
    await page.addInitScript(
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

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=The Comeback', { timeout: 12000 });
    const versionOneMarkerBeforeReload = await readMarker(page);
    await waitForControlledServiceWorker(page);
    await reloadAppShell(page);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 12000 });
    const versionOneMarker = await readMarker(page);
    const beforeUpdate = await serviceWorkerSnapshot(page);
    await page.screenshot({ fullPage: true, path: path.join(artifactsDir, 'pwa-update-v1.png') });

    switchTo(versionTwo.dir);
    const updateResult = await updateServiceWorker(page);
    await reloadAppShell(page);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 12000 });
    const versionTwoMarker = await readMarker(page);
    const afterUpdate = await serviceWorkerSnapshot(page);
    await page.screenshot({ fullPage: true, path: path.join(artifactsDir, 'pwa-update-v2-online.png') });

    await context.setOffline(true);
    await reloadAppShell(page, { timeout: 15000 });
    const offlineMarker = await readMarker(page);
    await page.screenshot({ fullPage: true, path: path.join(artifactsDir, 'pwa-update-v2-offline.png') });
    await context.setOffline(false);

    if (versionOneMarkerBeforeReload !== versionOne.marker || versionOneMarker !== versionOne.marker) {
      fail('Initial installed PWA shell did not expose version-one marker', {
        expected: versionOne.marker,
        versionOneMarker,
        versionOneMarkerBeforeReload,
      });
    }
    if (versionTwoMarker !== versionTwo.marker) {
      fail('Updated PWA shell did not expose version-two marker after service worker update', {
        expected: versionTwo.marker,
        versionTwoMarker,
        updateResult,
      });
    }
    if (offlineMarker !== versionTwo.marker) {
      fail('Updated PWA shell did not remain available offline', {
        expected: versionTwo.marker,
        offlineMarker,
      });
    }

    const toleratedRequestFailure = (failure) =>
      /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//.test(failure.url) ||
      (failure.url === `${baseUrl}/` && failure.errorText === 'net::ERR_ABORTED') ||
      (/\/api\/sync\//.test(failure.url) && failure.errorText === 'net::ERR_INTERNET_DISCONNECTED');
    const unexpectedRequestFailures = requestFailures.filter((failure) => !toleratedRequestFailure(failure));
    const unexpectedPageErrors = pageErrors.filter(
      (message) =>
        !(
          message === 'Failed to load resource: net::ERR_FAILED' &&
          requestFailures.some((failure) => /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//.test(failure.url))
        )
    );
    if (unexpectedPageErrors.length || unexpectedRequestFailures.length) {
      fail('Browser console errors during PWA update smoke', {
        pageErrors,
        requestFailures,
        unexpectedPageErrors,
        unexpectedRequestFailures,
      });
    }

    await context.close();
    return {
      afterUpdate,
      beforeUpdate,
      markers: {
        offline: offlineMarker,
        versionOne: versionOneMarker,
        versionOneBeforeReload: versionOneMarkerBeforeReload,
        versionTwo: versionTwoMarker,
      },
      toleratedRequestFailures: requestFailures.filter(toleratedRequestFailure),
      updateResult,
    };
  } finally {
    if (browser) await browser.close();
    server.close();
  }
};

const run = async () => {
  try {
    if (shouldCleanArtifacts) await rm(artifactsDir, { force: true, recursive: true });
    await mkdir(versionRootDir, { recursive: true });
    await ensureDist();
    const versionOne = await prepareVersion('v1');
    const versionTwo = await prepareVersion('v2');
    const browser = await runBrowserSmoke({ versionOne, versionTwo });
    if (!process.env.PWA_UPDATE_SMOKE_KEEP_SERVED_VERSIONS) {
      await rm(versionRootDir, { force: true, recursive: true });
    }
    const summary = {
      artifactsDir,
      browser,
      gateStatus: 'local-installed-pwa-update-proven-not-target-browser-or-production-evidence',
      status: 'ok',
      unresolvedReleaseDecisions: [
        'Production URL installed-app update behavior is not proven until deployed preview/production targets are supplied.',
        'Target browser/device installed-app update matrix remains missing.',
        'Release-owner PWA support and rollback policy remains missing.',
      ],
      versions: {
        versionOne: {
          marker: versionOne.marker,
          swRevision: versionOne.swRevision,
        },
        versionTwo: {
          marker: versionTwo.marker,
          swRevision: versionTwo.swRevision,
        },
      },
    };
    await writeFile(path.join(artifactsDir, 'pwa-update-smoke-summary.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error(error.message);
    if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
    process.exitCode = 1;
  }
};

await run();
