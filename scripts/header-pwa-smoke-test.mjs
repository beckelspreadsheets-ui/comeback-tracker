import { createServer } from 'node:http';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { makeDefaultState, normalizeState, STORAGE_KEY, SYNC_META_KEY } from '../src/hooks/usePersistedState.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.HEADER_PWA_SMOKE_PORT || 5197);
const hostName = process.env.HEADER_PWA_SMOKE_HOST || 'pwa-smoke.localhost';
const baseUrl = `http://${hostName}:${port}`;
const readinessUrl = `http://127.0.0.1:${port}`;
const shouldCleanArtifacts = !process.env.HEADER_PWA_SMOKE_ARTIFACT_DIR;
const artifactsDir = process.env.HEADER_PWA_SMOKE_ARTIFACT_DIR
  ? path.resolve(root, process.env.HEADER_PWA_SMOKE_ARTIFACT_DIR)
  : path.join(root, 'tmp', 'header-pwa-smoke-test');

const distDir = path.join(root, 'dist');
const publicHeadersPath = path.join(root, 'public', '_headers');
const distHeadersPath = path.join(distDir, '_headers');
const distManifestPath = path.join(distDir, 'manifest.webmanifest');
const distServiceWorkerPath = path.join(distDir, 'sw.js');
const expectedContentSecurityPolicy =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; script-src 'self'; worker-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://images.openfoodfacts.org; connect-src 'self' https://world.openfoodfacts.org https://api.nal.usda.gov; manifest-src 'self'; media-src 'self' blob: data:";

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
  fail('Preview server did not become ready', { url });
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

const assertHeader = (routeHeaders, headerName, expected, routeName) => {
  const actual = routeHeaders?.[headerName.toLowerCase()];
  if (actual !== expected) {
    fail('Header policy mismatch', { actual, expected, headerName, routeName });
  }
  return actual;
};

const assertCspDirectives = (policy) => {
  const directives = Object.fromEntries(
    policy.split(';').map((part) => {
      const [name, ...tokens] = part.trim().split(/\s+/);
      return [name, tokens];
    })
  );
  const required = {
    'base-uri': ["'self'"],
    'connect-src': ["'self'", 'https://world.openfoodfacts.org', 'https://api.nal.usda.gov'],
    'default-src': ["'self'"],
    'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
    'form-action': ["'self'"],
    'frame-ancestors': ["'self'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https://images.openfoodfacts.org'],
    'manifest-src': ["'self'"],
    'media-src': ["'self'", 'blob:', 'data:'],
    'object-src': ["'none'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'worker-src': ["'self'"],
  };
  const failures = [];
  for (const [name, tokens] of Object.entries(required)) {
    const actual = directives[name] || [];
    for (const token of tokens) {
      if (!actual.includes(token)) failures.push({ directive: name, expectedToken: token, actual });
    }
  }
  if (failures.length) fail('Content-Security-Policy directive mismatch', { failures, policy });
  return {
    directiveCount: Object.keys(directives).length,
    directives: Object.fromEntries(Object.entries(directives).map(([key, value]) => [key, value.join(' ')])),
  };
};

const analyzeHeaders = async () => {
  const publicHeaders = await readFile(publicHeadersPath, 'utf8');
  const distHeaders = await readFile(distHeadersPath, 'utf8');
  if (publicHeaders !== distHeaders) {
    fail('Built _headers file does not match public/_headers');
  }

  const routes = parseHeaders(publicHeaders);
  const rootHeaders = routes['/*'];
  const assetHeaders = routes['/assets/*'];
  const swHeaders = routes['/sw.js'];
  const registerHeaders = routes['/registerSW.js'];
  const manifestHeaders = routes['/manifest.webmanifest'];
  const permissionsPolicy = assertHeader(
    rootHeaders,
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
    '/*'
  );
  const contentSecurityPolicy = assertHeader(
    rootHeaders,
    'Content-Security-Policy',
    expectedContentSecurityPolicy,
    '/*'
  );

  return {
    assetCacheControl: assertHeader(assetHeaders, 'Cache-Control', 'public, max-age=31536000, immutable', '/assets/*'),
    contentSecurityPolicy,
    contentSecurityPolicyDirectives: assertCspDirectives(contentSecurityPolicy),
    contentSecurityPolicyPresent: true,
    frameOptions: assertHeader(rootHeaders, 'X-Frame-Options', 'SAMEORIGIN', '/*'),
    manifestCacheControl: assertHeader(manifestHeaders, 'Cache-Control', 'public, max-age=3600', '/manifest.webmanifest'),
    permissionsPolicy,
    permissionsPolicyCamera: permissionsPolicy.includes('camera=()') ? 'denied' : 'not-denied',
    referrerPolicy: assertHeader(rootHeaders, 'Referrer-Policy', 'strict-origin-when-cross-origin', '/*'),
    registerSwCacheControl: assertHeader(registerHeaders, 'Cache-Control', 'no-cache, no-store, must-revalidate', '/registerSW.js'),
    serviceWorkerCacheControl: assertHeader(swHeaders, 'Cache-Control', 'no-cache, no-store, must-revalidate', '/sw.js'),
    xContentTypeOptions: assertHeader(rootHeaders, 'X-Content-Type-Options', 'nosniff', '/*'),
  };
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

const startHeaderAwareServer = async () => {
  const routes = parseHeaders(await readFile(distHeadersPath, 'utf8'));
  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url || '/', readinessUrl);
    let pathname = decodeURIComponent(requestUrl.pathname);
    if (pathname === '/') pathname = '/index.html';
    const requestedPath = path.normalize(path.join(distDir, pathname));
    const safeRequestedPath = requestedPath.startsWith(distDir) ? requestedPath : path.join(distDir, 'index.html');
    let filePath = safeRequestedPath;
    let body;
    try {
      body = await readFile(filePath);
    } catch {
      filePath = path.join(distDir, 'index.html');
      pathname = '/index.html';
      body = await readFile(filePath);
    }

    const headers = {
      'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
      ...headerSetForPath(routes, pathname),
    };
    response.writeHead(200, headers);
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
  return server;
};

const analyzeManifest = async () => {
  const manifest = JSON.parse(await readFile(distManifestPath, 'utf8'));
  const iconSizes = new Set((manifest.icons || []).map((icon) => icon.sizes));
  if (
    manifest.name !== 'Comeback Tracker' ||
    manifest.short_name !== 'Comeback' ||
    manifest.display !== 'standalone' ||
    manifest.scope !== '/' ||
    manifest.start_url !== '/' ||
    !iconSizes.has('192x192') ||
    !iconSizes.has('512x512')
  ) {
    fail('Manifest does not match expected PWA install metadata', { manifest });
  }
  return {
    display: manifest.display,
    iconCount: manifest.icons.length,
    name: manifest.name,
    scope: manifest.scope,
    shortName: manifest.short_name,
    startUrl: manifest.start_url,
  };
};

const ensureDist = async () => {
  const required = [
    path.join(distDir, 'index.html'),
    distHeadersPath,
    distManifestPath,
    distServiceWorkerPath,
  ];
  for (const filePath of required) {
    await access(filePath).catch(() => {
      fail('Built PWA artifact is missing; run npm run build before npm run test:pwa', { filePath });
    });
  }
};

const installAndReadServiceWorker = async (page) =>
  page.evaluate(async () => {
    const withTimeout = (promise, ms, label) =>
      Promise.race([
        promise,
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`${label} timed out`)), ms);
        }),
      ]);

    if (!('serviceWorker' in navigator)) {
      return { supported: false, isSecureContext: window.isSecureContext };
    }

    const ready = await withTimeout(navigator.serviceWorker.ready, 15000, 'service worker ready');
    await ready.update().catch(() => {});
    const registrations = await navigator.serviceWorker.getRegistrations();
    const cacheKeys = 'caches' in window ? await caches.keys() : [];
    return {
      cacheKeys,
      controller: Boolean(navigator.serviceWorker.controller),
      isSecureContext: window.isSecureContext,
      registrations: registrations.map((registration) => ({
        activeScriptURL: registration.active?.scriptURL || null,
        activeState: registration.active?.state || null,
        scope: registration.scope,
        waitingScriptURL: registration.waiting?.scriptURL || null,
      })),
      scriptURL: ready.active?.scriptURL || ready.waiting?.scriptURL || ready.installing?.scriptURL || null,
      state: ready.active?.state || null,
      supported: true,
    };
  });

const runBrowserSmoke = async () => {
  const server = await startHeaderAwareServer();

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
        body: '/* fonts stubbed for deterministic CSP/PWA smoke */',
        contentType: 'text/css',
        status: 200,
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
    await page.route('**/api/sync/**', async (route) => {
      await route.fulfill({
        body: JSON.stringify({ error: 'not_authenticated' }),
        contentType: 'application/json',
        status: 401,
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

    const rootResponse = await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    const deliveredCsp = rootResponse?.headers()?.['content-security-policy'] || null;
    if (deliveredCsp !== expectedContentSecurityPolicy) {
      fail('Header-aware local server did not deliver expected Content-Security-Policy', {
        actual: deliveredCsp,
        expected: expectedContentSecurityPolicy,
      });
    }
    await page.waitForSelector('text=The Comeback', { timeout: 12000 });
    const manifestFetch = await page.evaluate(async () => {
      const response = await fetch('/manifest.webmanifest');
      return {
        contentType: response.headers.get('content-type'),
        ok: response.ok,
        status: response.status,
        text: await response.text(),
      };
    });
    if (!manifestFetch.ok) fail('Manifest fetch failed in preview browser', manifestFetch);
    await page.screenshot({ fullPage: true, path: path.join(artifactsDir, 'pwa-online-home.png') });

    const firstServiceWorker = await installAndReadServiceWorker(page);
    if (!firstServiceWorker.supported || !firstServiceWorker.isSecureContext || !firstServiceWorker.scriptURL?.endsWith('/sw.js')) {
      fail('Service worker did not install from built preview route', firstServiceWorker);
    }

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=The Comeback', { timeout: 12000 });
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 12000 });
    const controlledServiceWorker = await installAndReadServiceWorker(page);

    await page.unroute('**/api/sync/**');
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('text=The Comeback', { timeout: 12000 });
    await waitForSyncStatus(page, 'Offline / local changes');
    await page.screenshot({ fullPage: true, path: path.join(artifactsDir, 'pwa-offline-home.png') });
    await context.setOffline(false);

    const toleratedRequestFailure = (failure) =>
      /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//.test(failure.url) ||
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
      fail('Browser console errors during PWA smoke', {
        pageErrors,
        requestFailures,
        unexpectedPageErrors,
        unexpectedRequestFailures,
      });
    }
    await context.close();
    return {
      controlledServiceWorker,
      deliveredHeaders: {
        contentSecurityPolicy: deliveredCsp,
        rootCacheControl: rootResponse?.headers()?.['cache-control'] || null,
        xContentTypeOptions: rootResponse?.headers()?.['x-content-type-options'] || null,
      },
      firstServiceWorker,
      manifestFetch: {
        contentType: manifestFetch.contentType,
        parsedName: JSON.parse(manifestFetch.text).name,
        status: manifestFetch.status,
      },
      offlineShell: 'served app shell while browser context was offline',
      toleratedRequestFailures: requestFailures.filter(toleratedRequestFailure),
    };
  } catch (error) {
    throw error;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
};

const waitForSyncStatus = async (page, statusLabel) => {
  const locator = page.locator(`[title="${statusLabel}"]`).first();
  await locator.waitFor({ timeout: 12000 });
  return locator.getAttribute('title');
};

const run = async () => {
  try {
    if (shouldCleanArtifacts) await rm(artifactsDir, { force: true, recursive: true });
    await mkdir(artifactsDir, { recursive: true });
    await ensureDist();
    const headers = await analyzeHeaders();
    const manifest = await analyzeManifest();
    const browser = await runBrowserSmoke();
    const summary = {
      artifactsDir,
      status: 'ok',
      headers,
      manifest,
      browser,
      unresolvedReleaseDecisions: {
        cameraPolicy: headers.permissionsPolicyCamera === 'denied'
          ? 'public/_headers denies camera; barcode scanner production scope still needs owner/release decision'
          : 'camera policy is not denied by current header',
        csp: headers.contentSecurityPolicyPresent
          ? 'Content-Security-Policy present'
          : 'Content-Security-Policy not present; production CSP decision still required',
      },
    };
    await writeFile(path.join(artifactsDir, 'header-pwa-smoke-summary.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error(error.message);
    if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
    process.exitCode = 1;
  }
};

await run();
