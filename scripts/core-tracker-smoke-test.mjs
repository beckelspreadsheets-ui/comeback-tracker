import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  makeDefaultState,
  normalizeState,
  SCHEMA_VERSION,
  STORAGE_KEY,
  SYNC_META_KEY,
} from '../src/hooks/usePersistedState.js';
import { todayKey } from '../src/lib/foodHelpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.CORE_TRACKER_SMOKE_PORT || 5196);
const baseUrl = `http://127.0.0.1:${port}`;
const shouldCleanArtifacts = !process.env.CORE_TRACKER_SMOKE_ARTIFACT_DIR;
const artifactsDir = process.env.CORE_TRACKER_SMOKE_ARTIFACT_DIR
  ? path.resolve(root, process.env.CORE_TRACKER_SMOKE_ARTIFACT_DIR)
  : path.join(root, 'tmp', 'core-tracker-smoke-test');

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

const waitForCondition = async (predicate, label, timeoutMs = 10000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  fail(`Timed out waiting for ${label}`);
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

const waitForStoredState = async (page, predicate, label) => {
  await page.waitForFunction(
    ({ predicateSource, storageKey }) => {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      const state = JSON.parse(raw);
      return Function('state', `return (${predicateSource})(state);`)(state);
    },
    {
      predicateSource: predicate.toString(),
      storageKey: STORAGE_KEY,
    },
    { timeout: 8000 }
  ).catch(async (error) => {
    const stored = await page.evaluate((storageKey) => localStorage.getItem(storageKey), STORAGE_KEY);
    fail(`Timed out waiting for stored state: ${label}`, {
      message: error.message,
      stored: stored?.slice(0, 1000),
    });
  });
};

const waitForSyncStatus = async (page, statusLabel) => {
  const locator = page.locator(`[title="${statusLabel}"]`).first();
  await locator.waitFor({ timeout: 12000 });
  return locator.getAttribute('title');
};

const assertNoErrors = (pageErrors, label, allowedPatterns = []) => {
  const unexpected = pageErrors.filter(
    (error) => !allowedPatterns.some((pattern) => pattern.test(error))
  );
  if (unexpected.length) {
    fail(`Browser console errors during ${label}`, { allowed: pageErrors.length - unexpected.length, errors: unexpected });
  }
};

const attachSyncRoutes = async (page, mode, syncRequests) => {
  await page.route('**/api/sync/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const now = new Date().toISOString();

    syncRequests.push({ method, path: url.pathname, query: url.search });

    if (mode === 'offline') {
      await route.abort('failed');
      return;
    }

    if (url.pathname.endsWith('/me')) {
      if (mode === 'local-only') {
        await route.fulfill({
          body: JSON.stringify({ error: 'not_authenticated' }),
          contentType: 'application/json',
          status: 401,
        });
        return;
      }

      await route.fulfill({
        body: JSON.stringify({
          profiles: [
            {
              displayName: 'Core Smoke',
              hasState: false,
              userId: 'core-smoke',
            },
          ],
          user: {
            canView: ['core-smoke'],
            displayName: 'Core Smoke',
            userId: 'core-smoke',
          },
        }),
        contentType: 'application/json',
        status: 200,
      });
      return;
    }

    if (method === 'PUT') {
      const payload = route.request().postDataJSON();
      if (payload?.state?.schemaVersion !== SCHEMA_VERSION) {
        await route.fulfill({
          body: JSON.stringify({ error: 'schema_mismatch' }),
          contentType: 'application/json',
          status: 400,
        });
        return;
      }
      const rev = syncRequests.filter((request) => request.method === 'PUT').length;
      await route.fulfill({
        body: JSON.stringify({ rev, updatedAt: now, userId: 'core-smoke' }),
        contentType: 'application/json',
        status: 200,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({ rev: null, state: null, updatedAt: null, userId: 'core-smoke' }),
      contentType: 'application/json',
      status: 200,
    });
  });
};

const newSeededPage = async (browser, state, mode = 'synced') => {
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { height: 760, width: 1280 },
  });
  const page = await context.newPage();
  const pageErrors = [];
  const syncRequests = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });

  await attachSyncRoutes(page, mode, syncRequests);
  await page.addInitScript(
    ({ stateJson, storageKey, syncMetaKey }) => {
      localStorage.setItem(storageKey, stateJson);
      localStorage.removeItem(syncMetaKey);
    },
    {
      stateJson: JSON.stringify(state),
      storageKey: STORAGE_KEY,
      syncMetaKey: SYNC_META_KEY,
    }
  );

  return { context, page, pageErrors, syncRequests };
};

const navigateHome = async (page) => {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=The Comeback', { timeout: 12000 });
};

const runMainTrackerSmoke = async (browser) => {
  const { context, page, pageErrors, syncRequests } = await newSeededPage(browser, makeBasicState(), 'synced');
  const dateKey = todayKey();
  const exportPath = path.join(artifactsDir, 'core-tracker-export.json');
  const importPath = path.join(artifactsDir, 'core-tracker-import.json');

  await navigateHome(page);
  const initialSync = await waitForSyncStatus(page, 'Synced');
  await page.screenshot({ fullPage: true, path: path.join(artifactsDir, 'core-tracker-home.png') });

  await page.getByRole('button', { name: /^Food$/i }).click();
  await page.waitForSelector('text=Daily fuel', { timeout: 12000 });
  await page.getByRole('button', { name: /Add food/i }).first().click();
  await page.waitForSelector('text=Add to Breakfast', { timeout: 12000 });
  await page.getByRole('button', { name: /^Manual$/i }).click();
  await page.locator('input[placeholder="e.g. Chicken breast"]').fill('Core smoke tofu bowl');
  await page.locator('input[placeholder="e.g. 4oz or 1 cup"]').fill('1 bowl');
  const manualMacroInputs = page.locator('input[type="number"]:visible');
  await manualMacroInputs.nth(0).fill('520');
  await manualMacroInputs.nth(1).fill('42');
  await manualMacroInputs.nth(2).fill('54');
  await manualMacroInputs.nth(3).fill('18');
  await page.getByRole('button', { name: /^Continue$/i }).click();
  await page.waitForSelector('text=Core smoke tofu bowl', { timeout: 12000 });
  await page.getByRole('button', { name: /^Add to Breakfast$/i }).click();
  await page.waitForSelector('text=Core smoke tofu bowl', { timeout: 12000 });
  await waitForStoredState(
    page,
    (state) =>
      Object.values(state.food?.log || {}).some((day) =>
        Object.values(day || {}).some((entries) =>
          Array.isArray(entries) && entries.some((entry) => entry.name === 'Core smoke tofu bowl')
        )
      ),
    'manual food entry persisted'
  );
  await waitForCondition(
    () => syncRequests.some((request) => request.method === 'PUT'),
    'sync PUT after meaningful food data',
    7000
  );
  await waitForSyncStatus(page, 'Synced');

  await page.getByRole('button', { name: /Add food/i }).first().click();
  await page.getByRole('button', { name: /^Scan$/i }).click();
  await page.waitForSelector('text=Point your camera at a product barcode.', { timeout: 12000 });
  await page.getByRole('button', { name: /^Close$/i }).last().click();
  await page.getByRole('button', { name: /^Close$/i }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForSelector('text=Add to Breakfast', { state: 'detached', timeout: 5000 }).catch(() => {});
  await page.screenshot({ fullPage: true, path: path.join(artifactsDir, 'core-tracker-food.png') });

  await page.getByRole('button', { name: /^Setup$/i }).click();
  await page.waitForSelector('text=Body & Program', { timeout: 12000 });
  const currentBwInput = page
    .locator('label:has-text("Current BW")')
    .locator('xpath=..')
    .locator('input')
    .first();
  await currentBwInput.fill('211');
  await waitForStoredState(page, (state) => Number(state.settings?.currentBW) === 211, 'settings currentBW persisted');
  await page.screenshot({ fullPage: true, path: path.join(artifactsDir, 'core-tracker-settings.png') });

  const downloadPromise = page.waitForEvent('download');
  await page.getByLabel('Export JSON backup').click();
  const download = await downloadPromise;
  await download.saveAs(exportPath);
  const exported = JSON.parse(await readFile(exportPath, 'utf8'));
  if (exported.schemaVersion !== SCHEMA_VERSION || Number(exported.settings?.currentBW) !== 211) {
    fail('Exported backup did not preserve current app schema and settings state', {
      currentBW: exported.settings?.currentBW,
      schemaVersion: exported.schemaVersion,
    });
  }

  const importState = normalizeState({
    ...exported,
    settings: {
      ...exported.settings,
      currentBW: 199,
    },
    food: {
      ...exported.food,
      library: [
        ...(exported.food?.library || []),
        {
          id: 'core-smoke-import-food',
          name: 'Core smoke import meal',
          cal: 333,
          p: 31,
          c: 22,
          f: 11,
          servingDesc: '1 tray',
          unit: 'serving',
          lastUsedAt: Date.now(),
          usageCount: 1,
        },
      ],
    },
    game: {
      ...(exported.game || {}),
      homeMode: 'basic',
    },
  });
  await writeFile(importPath, JSON.stringify(importState, null, 2));
  page.once('dialog', async (dialog) => {
    if (dialog.type() === 'confirm') {
      await dialog.accept();
      return;
    }
    await dialog.dismiss();
  });
  await page.locator('input[type="file"]').setInputFiles(importPath);
  await waitForStoredState(
    page,
    (state) =>
      Number(state.settings?.currentBW) === 199 &&
      state.food?.library?.some((item) => item.id === 'core-smoke-import-food'),
    'imported backup persisted'
  );

  await page.getByRole('button', { name: /^Today$/i }).click();
  await page.waitForSelector('text=The Comeback', { timeout: 12000 });
  await page.getByRole('button', { name: /Heavy Squat/i }).first().click();
  await page.locator('h1').filter({ hasText: /Heavy Squat/i }).waitFor({ timeout: 12000 });
  await page.getByRole('button', { name: /^Back$/i }).click();
  await page.waitForSelector('text=The Comeback', { timeout: 12000 });

  assertNoErrors(pageErrors, 'core tracker synced flow');
  await context.close();

  return {
    barcodeScannerSurface: 'scan tab reachable without requesting camera in smoke',
    export: {
      currentBW: exported.settings.currentBW,
      path: exportPath,
      schemaVersion: exported.schemaVersion,
    },
    foodEntryDate: dateKey,
    import: {
      currentBW: importState.settings.currentBW,
      libraryItem: 'Core smoke import meal',
      path: importPath,
    },
    navigation: ['home', 'food', 'scan-tab', 'settings', 'export', 'import', 'day-1', 'home'],
    sync: {
      initialStatus: initialSync,
      putCount: syncRequests.filter((request) => request.method === 'PUT').length,
      requestCount: syncRequests.length,
    },
  };
};

const runStatusSmoke = async (browser, mode, expectedStatus, allowedConsolePatterns = []) => {
  const { context, page, pageErrors } = await newSeededPage(browser, makeBasicState(), mode);
  await navigateHome(page);
  const status = await waitForSyncStatus(page, expectedStatus);
  assertNoErrors(pageErrors, `${mode} sync status`, allowedConsolePatterns);
  await context.close();
  return status;
};

const run = async () => {
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
    if (shouldCleanArtifacts) await rm(artifactsDir, { force: true, recursive: true });
    await mkdir(artifactsDir, { recursive: true });
    await waitForServer(baseUrl);
    browser = await chromium.launch({ headless: true });

    const main = await runMainTrackerSmoke(browser);
    const localOnlyStatus = await runStatusSmoke(browser, 'local-only', 'Local only', [
      /401 \(Unauthorized\)/,
    ]);
    const offlineStatus = await runStatusSmoke(browser, 'offline', 'Offline / local changes', [
      /net::ERR_FAILED/,
      /Failed to load resource/,
    ]);

    const summary = {
      artifactsDir,
      status: 'ok',
      main,
      syncStates: {
        localOnly: localOnlyStatus,
        offline: offlineStatus,
      },
    };
    await writeFile(path.join(artifactsDir, 'core-tracker-smoke-summary.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error(error.message);
    if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
    if (serverLog) console.error(serverLog.slice(-4000));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
};

await run();
