import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { makeDefaultState, normalizeState, STORAGE_KEY, SYNC_META_KEY } from '../src/hooks/usePersistedState.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.RELEASE_ROLLBACK_SMOKE_PORT || 5202);
const baseUrl = `http://127.0.0.1:${port}`;
const shouldCleanArtifacts = !process.env.RELEASE_ROLLBACK_ARTIFACT_DIR;
const artifactsDir = process.env.RELEASE_ROLLBACK_ARTIFACT_DIR
  ? path.resolve(root, process.env.RELEASE_ROLLBACK_ARTIFACT_DIR)
  : path.join(root, 'tmp', 'release-rollback-smoke-test');
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
  fail('Rollback smoke server did not become ready', { url });
};

const ensureDist = async () => {
  for (const filePath of ['index.html', '_headers', 'manifest.webmanifest', 'sw.js']) {
    const absolutePath = path.join(sourceDistDir, filePath);
    await access(absolutePath).catch(() => {
      fail('Built app artifact is missing; run npm run build before npm run test:release:rollback', {
        filePath: absolutePath,
      });
    });
  }
};

const prepareVersion = async ({ label, role }) => {
  const versionDir = path.join(versionRootDir, label);
  await rm(versionDir, { force: true, recursive: true });
  await cp(sourceDistDir, versionDir, { recursive: true });

  const marker = `release-rollback-smoke-${label}`;
  const indexPath = path.join(versionDir, 'index.html');
  const originalIndex = await readFile(indexPath, 'utf8');
  const markedIndex = originalIndex.includes('name="x-release-rollback-smoke"')
    ? originalIndex.replace(
        /<meta name="x-release-rollback-smoke" content="[^"]*">/,
        `<meta name="x-release-rollback-smoke" content="${marker}">`
      )
    : originalIndex.replace('<head>', `<head><meta name="x-release-rollback-smoke" content="${marker}">`);
  await writeFile(indexPath, markedIndex);

  const metadata = {
    git: getGitMetadata(),
    label,
    marker,
    preparedAt: new Date().toISOString(),
    role,
  };
  await writeFile(path.join(versionDir, 'rollback-version.json'), `${JSON.stringify(metadata, null, 2)}\n`);

  return {
    dir: versionDir,
    label,
    marker,
    metadata,
    role,
  };
};

const startRollbackServer = async (initialVersion) => {
  let activeVersion = initialVersion;
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || '/', baseUrl);
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname === '/__rollback-active.json') {
        response.writeHead(200, {
          'cache-control': 'no-store',
          'content-type': 'application/json; charset=utf-8',
          'x-release-rollback-version': activeVersion.label,
        });
        response.end(JSON.stringify({ active: activeVersion.metadata }, null, 2));
        return;
      }
      if (pathname === '/') pathname = '/index.html';
      const requestedPath = path.normalize(path.join(activeVersion.dir, pathname));
      const safeRequestedPath = requestedPath.startsWith(activeVersion.dir)
        ? requestedPath
        : path.join(activeVersion.dir, 'index.html');
      let filePath = safeRequestedPath;
      let body;
      try {
        body = await readFile(filePath);
      } catch {
        filePath = path.join(activeVersion.dir, 'index.html');
        body = await readFile(filePath);
      }
      const ext = path.extname(filePath);
      response.writeHead(200, {
        'cache-control': 'no-store',
        'content-type': contentTypes[ext] || 'application/octet-stream',
        'x-release-rollback-version': activeVersion.label,
      });
      response.end(body);
    } catch (error) {
      response.writeHead(500, {
        'cache-control': 'no-store',
        'content-type': 'application/json; charset=utf-8',
        'x-release-rollback-version': activeVersion.label,
      });
      response.end(JSON.stringify({ error: error.message }));
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });

  return {
    close: () => new Promise((resolve) => server.close(resolve)),
    setActiveVersion: (version) => {
      activeVersion = version;
    },
  };
};

const fetchJson = async (route) => {
  const response = await fetch(`${baseUrl}${route}`);
  const text = await response.text();
  if (!response.ok) fail('Rollback smoke JSON fetch failed', { route, status: response.status, text });
  try {
    return JSON.parse(text);
  } catch {
    fail('Rollback smoke JSON fetch returned invalid JSON', { route, status: response.status, text });
  }
};

const collectBrowserErrors = (page) => {
  const pageErrors = [];
  const consoleErrors = [];
  const requestFailures = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      !/\/api\/sync\//.test(message.text()) &&
      !/401 \(Unauthorized\)/.test(message.text())
    ) {
      consoleErrors.push(message.text());
    }
  });
  page.on('requestfailed', (request) => {
    if (!/\/api\/sync\//.test(request.url())) {
      requestFailures.push({
        failure: request.failure()?.errorText || null,
        method: request.method(),
        url: request.url(),
      });
    }
  });
  return { consoleErrors, pageErrors, requestFailures };
};

const assertNoBlockingBrowserErrors = (label, errors) => {
  if (errors.pageErrors.length || errors.consoleErrors.length || errors.requestFailures.length) {
    fail('Blocking browser errors recorded during rollback smoke', { errors, label });
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

const mockLocalApis = async (context) => {
  await context.route('**/api/sync/**', async (route) => {
    await route.fulfill({
      body: JSON.stringify({ error: 'not_authenticated' }),
      contentType: 'application/json',
      status: 401,
    });
  });
  await context.route('**/api/fatsecret/**', async (route) => {
    await route.fulfill({
      body: JSON.stringify({ error: 'missing_credentials' }),
      contentType: 'application/json',
      status: 503,
    });
  });
};

const browserCheck = async ({ browser, label, route, screenshotName, version }) => {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    serviceWorkers: 'block',
    viewport: { height: 900, width: 1440 },
  });
  await installSeedState(context);
  await mockLocalApis(context);
  const page = await context.newPage();
  const errors = collectBrowserErrors(page);
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  if (!response?.ok()) fail('Rollback browser navigation failed', { label, route, status: response?.status() || null });
  const metaMarker = await page.locator('meta[name="x-release-rollback-smoke"]').getAttribute('content');
  if (metaMarker !== version.marker) {
    fail('Rollback browser loaded the wrong deployment marker', {
      expected: version.marker,
      label,
      metaMarker,
      route,
    });
  }

  if (route.includes('#race')) {
    await page.waitForSelector('[data-testid="race-screen"][data-race-track="comeback-city"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="arcade-race-shell"][data-race-track="comeback-city"]', { timeout: 15000 });
    await page.waitForFunction(
      () => {
        const shell = document.querySelector('[data-testid="arcade-race-shell"]');
        const time = Number(shell?.dataset.raceTime || 0);
        return shell?.dataset.raceTrack === 'comeback-city' && Number.isFinite(time) && time > 0.05;
      },
      null,
      { timeout: 15000 }
    );
  } else {
    await page.waitForSelector('text=The Comeback', { timeout: 12000 });
  }

  const state = await page.evaluate(() => ({
    bodyText: document.body.innerText.slice(0, 500),
    hash: window.location.hash,
    raceRenderer: document.querySelector('[data-testid="race-screen"]')?.getAttribute('data-race-renderer') || null,
    raceTrack: document.querySelector('[data-testid="arcade-race-shell"]')?.dataset.raceTrack ||
      document.querySelector('[data-testid="race-screen"]')?.dataset.raceTrack ||
      null,
    title: document.title,
  }));
  const screenshotPath = path.join(artifactsDir, screenshotName);
  await page.screenshot({ fullPage: false, path: screenshotPath });
  assertNoBlockingBrowserErrors(label, errors);
  await context.close();
  return {
    label,
    metaMarker,
    route,
    screenshotPath,
    state,
    status: 'pass',
  };
};

const run = async () => {
  if (shouldCleanArtifacts) await rm(artifactsDir, { force: true, recursive: true });
  await mkdir(artifactsDir, { recursive: true });
  await ensureDist();
  await rm(versionRootDir, { force: true, recursive: true });
  await mkdir(versionRootDir, { recursive: true });

  const knownGood = await prepareVersion({ label: 'known-good', role: 'rollback-target' });
  const current = await prepareVersion({ label: 'current-candidate', role: 'pre-rollback-current' });
  const server = await startRollbackServer(current);
  await waitForServer(`${baseUrl}/__rollback-active.json`);

  const browser = await chromium.launch({ headless: true });
  try {
    const currentActive = await fetchJson('/__rollback-active.json');
    const currentMarker = await fetchJson('/rollback-version.json');
    if (currentActive.active.label !== current.label || currentMarker.label !== current.label) {
      fail('Rollback smoke did not start on the current candidate deployment', { currentActive, currentMarker });
    }
    const currentHome = await browserCheck({
      browser,
      label: 'current candidate home',
      route: '/',
      screenshotName: 'rollback-current-home.png',
      version: current,
    });

    server.setActiveVersion(knownGood);
    const rollbackActive = await fetchJson('/__rollback-active.json');
    const rollbackMarker = await fetchJson('/rollback-version.json');
    if (rollbackActive.active.label !== knownGood.label || rollbackMarker.label !== knownGood.label) {
      fail('Rollback smoke did not switch to the known-good deployment', { rollbackActive, rollbackMarker });
    }
    const rolledBackRace = await browserCheck({
      browser,
      label: 'known-good race after rollback',
      route: '/#race',
      screenshotName: 'rollback-known-good-race.png',
      version: knownGood,
    });

    const summary = {
      artifactsDir,
      baseUrl,
      capturedAt: new Date().toISOString(),
      currentCandidate: {
        marker: currentMarker,
        smoke: currentHome,
      },
      gateStatus: 'local-rollback-drill-proven-not-production-rollback-signoff',
      git: getGitMetadata(),
      knownGoodRollbackTarget: {
        marker: rollbackMarker,
        smoke: rolledBackRace,
      },
      rollbackSwitch: {
        after: rollbackActive.active,
        before: currentActive.active,
        status: 'pass',
      },
      unresolvedReleaseDecisions: [
        'Production Cloudflare Pages project/domain, deployment IDs, and rollback owner are not supplied.',
        'This local drill uses copied dist roots and a switchable local server; it is not Cloudflare production rollback evidence.',
        'Production smoke after rollback, deployed headers, monitoring/support, D1 rollback compatibility, and release-owner sign-off remain required.',
      ],
      versions: {
        currentCandidate: current.metadata,
        knownGood: knownGood.metadata,
      },
    };
    await writeFile(path.join(artifactsDir, 'release-rollback-smoke-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
    await server.close();
  }
};

run().catch((error) => {
  console.error(error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  process.exit(1);
});
