import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { makeDefaultState, normalizeState, STORAGE_KEY, SYNC_META_KEY } from '../src/hooks/usePersistedState.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.LAB_READINESS_PORT || 5199);
const hostName = process.env.LAB_READINESS_HOST || 'lab-readiness.localhost';
const baseUrl = `http://${hostName}:${port}`;
const readinessUrl = `http://127.0.0.1:${port}`;
const shouldCleanArtifacts = !process.env.LAB_READINESS_ARTIFACT_DIR;
const artifactsDir = process.env.LAB_READINESS_ARTIFACT_DIR
  ? path.resolve(root, process.env.LAB_READINESS_ARTIFACT_DIR)
  : path.join(root, 'tmp', 'lab-readiness-smoke-test');
const distIndexPath = path.join(root, 'dist', 'index.html');
const labBaselineThresholds = {
  homeCls: Number(process.env.LAB_BASELINE_HOME_CLS || 0.1),
  homeFcpMs: Number(process.env.LAB_BASELINE_HOME_FCP_MS || 2000),
  homeLcpMs: Number(process.env.LAB_BASELINE_HOME_LCP_MS || 2500),
  homeTotalBlockingTimeProxyMs: Number(process.env.LAB_BASELINE_HOME_TBT_PROXY_MS || 300),
  raceCls: Number(process.env.LAB_BASELINE_RACE_CLS || 0.1),
  raceFcpMs: Number(process.env.LAB_BASELINE_RACE_FCP_MS || 2000),
  raceLcpMs: Number(process.env.LAB_BASELINE_RACE_LCP_MS || 2500),
  raceMaxLongTaskMs: Number(process.env.LAB_BASELINE_RACE_MAX_LONG_TASK_MS || 1000),
  raceTotalBlockingTimeProxyMs: Number(process.env.LAB_BASELINE_RACE_TBT_PROXY_MS || 2500),
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
  fail('Preview server did not become ready', { url });
};

const ensureDist = async () => {
  await access(distIndexPath).catch(() => {
    fail('Built app artifact is missing; run npm run build before npm run test:lab', {
      filePath: distIndexPath,
    });
  });
};

const labObserverScript = () => {
  const vitals = {
    cumulativeLayoutShift: 0,
    firstContentfulPaint: null,
    largestContentfulPaint: null,
    layoutShiftCount: 0,
    longTaskCount: 0,
    maxEventDurationMs: 0,
    maxLongTaskMs: 0,
    observedTypes: {},
    totalBlockingTimeProxyMs: 0,
    totalLongTaskMs: 0,
  };
  window.__labReadinessVitals = vitals;

  const observe = (type, onEntries, options = { type, buffered: true }) => {
    try {
      const observer = new PerformanceObserver((list) => onEntries(list.getEntries()));
      observer.observe(options);
      vitals.observedTypes[type] = true;
    } catch {
      vitals.observedTypes[type] = false;
    }
  };

  observe('paint', (entries) => {
    for (const entry of entries) {
      if (entry.name === 'first-contentful-paint') {
        vitals.firstContentfulPaint = Math.round(entry.startTime);
      }
    }
  });

  observe('largest-contentful-paint', (entries) => {
    const last = entries[entries.length - 1];
    if (last) vitals.largestContentfulPaint = Math.round(last.startTime);
  });

  observe('layout-shift', (entries) => {
    for (const entry of entries) {
      if (!entry.hadRecentInput) {
        vitals.cumulativeLayoutShift = Number((vitals.cumulativeLayoutShift + entry.value).toFixed(4));
        vitals.layoutShiftCount += 1;
      }
    }
  });

  observe('longtask', (entries) => {
    for (const entry of entries) {
      vitals.longTaskCount += 1;
      vitals.totalLongTaskMs = Math.round(vitals.totalLongTaskMs + entry.duration);
      vitals.maxLongTaskMs = Math.max(vitals.maxLongTaskMs, Math.round(entry.duration));
      vitals.totalBlockingTimeProxyMs = Math.round(
        vitals.totalBlockingTimeProxyMs + Math.max(0, entry.duration - 50)
      );
    }
  });

  observe(
    'event',
    (entries) => {
      for (const entry of entries) {
        vitals.maxEventDurationMs = Math.max(vitals.maxEventDurationMs, Math.round(entry.duration || 0));
      }
    },
    { type: 'event', buffered: true, durationThreshold: 16 }
  );
};

const collectLabState = async (page) =>
  page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const navJson = nav?.toJSON ? nav.toJSON() : {};
    const resources = performance.getEntriesByType('resource');
    const responseStatuses = resources
      .filter((entry) => Number.isFinite(entry.responseStatus) && entry.responseStatus >= 400)
      .map((entry) => ({
        name: entry.name,
        responseStatus: entry.responseStatus,
      }));
    const transferSizeBytes = resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0);

    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };
    const textForIdRefs = (refs) =>
      refs
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() || '')
        .filter(Boolean)
        .join(' ')
        .trim();
    const accessibleName = (element) => {
      const labelledBy = element.getAttribute('aria-labelledby');
      if (labelledBy) {
        const label = textForIdRefs(labelledBy);
        if (label) return label;
      }
      const ariaLabel = element.getAttribute('aria-label')?.trim();
      if (ariaLabel) return ariaLabel;
      const title = element.getAttribute('title')?.trim();
      if (title) return title;
      if (element.id) {
        const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`)?.textContent?.trim();
        if (label) return label;
      }
      const wrappedLabel = element.closest('label')?.textContent?.trim();
      if (wrappedLabel) return wrappedLabel;
      const alt = element.getAttribute('alt')?.trim();
      if (alt) return alt;
      return element.textContent?.trim() || '';
    };

    const interactive = Array.from(
      document.querySelectorAll(
        'a[href], button, input, select, textarea, summary, [role="button"], [role="link"], [role="menuitem"], [tabindex]:not([tabindex="-1"])'
      )
    ).filter(isVisible);
    const unlabeledInteractive = interactive
      .filter((element) => !accessibleName(element))
      .map((element) => ({
        tagName: element.tagName.toLowerCase(),
        type: element.getAttribute('type'),
        role: element.getAttribute('role'),
        testId: element.getAttribute('data-testid'),
      }));
    const ids = Array.from(document.querySelectorAll('[id]')).map((element) => element.id);
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    const visibleImagesWithoutAlt = Array.from(document.querySelectorAll('img'))
      .filter(isVisible)
      .filter((image) => !image.hasAttribute('alt'))
      .map((image) => image.currentSrc || image.src || image.getAttribute('src'));
    const headings = Array.from(document.querySelectorAll('h1,h2,h3'))
      .filter(isVisible)
      .map((heading) => ({
        level: heading.tagName.toLowerCase(),
        text: heading.textContent.trim().slice(0, 120),
      }));

    return {
      accessibilitySignals: {
        duplicateIds,
        headingCount: headings.length,
        headings: headings.slice(0, 12),
        htmlLang: document.documentElement.lang || null,
        interactiveCount: interactive.length,
        title: document.title,
        unlabeledInteractive,
        viewportMeta: document.querySelector('meta[name="viewport"]')?.getAttribute('content') || null,
        visibleImagesWithoutAlt,
      },
      bestPracticeSignals: {
        documentVisibilityState: document.visibilityState,
        responseStatuses,
      },
      navigation: {
        domContentLoadedMs: Math.round((navJson.domContentLoadedEventEnd || 0) - (navJson.startTime || 0)),
        loadEventMs: Math.round((navJson.loadEventEnd || 0) - (navJson.startTime || 0)),
        requestStartMs: Math.round(navJson.requestStart || 0),
        responseStartMs: Math.round(navJson.responseStart || 0),
        transferSizeBytes,
      },
      vitals: window.__labReadinessVitals || null,
    };
  });

const assertBasicSignals = (label, state) => {
  const { accessibilitySignals } = state;
  if (accessibilitySignals.htmlLang !== 'en') {
    fail('Lab accessibility signal failed: html lang must be en', { label, accessibilitySignals });
  }
  if (!accessibilitySignals.title) {
    fail('Lab accessibility signal failed: document title is missing', { label, accessibilitySignals });
  }
  if (!accessibilitySignals.viewportMeta?.includes('width=device-width')) {
    fail('Lab accessibility signal failed: viewport meta is missing width=device-width', {
      label,
      accessibilitySignals,
    });
  }
  if (accessibilitySignals.duplicateIds.length) {
    fail('Lab accessibility signal failed: duplicate ids found', { label, accessibilitySignals });
  }
  if (accessibilitySignals.unlabeledInteractive.length) {
    fail('Lab accessibility signal failed: visible interactive elements without accessible names', {
      label,
      unlabeledInteractive: accessibilitySignals.unlabeledInteractive,
    });
  }
  if (accessibilitySignals.visibleImagesWithoutAlt.length) {
    fail('Lab accessibility signal failed: visible images without alt attributes', {
      label,
      visibleImagesWithoutAlt: accessibilitySignals.visibleImagesWithoutAlt,
    });
  }
};

const collectRoute = async ({ context, label, route, settleMs, waitForReady }) => {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const requestFailures = [];
  const httpErrors = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      !/401 \(Unauthorized\)/.test(message.text()) &&
      !/net::ERR_INTERNET_DISCONNECTED/.test(message.text())
    ) {
      consoleErrors.push(message.text());
    }
  });
  page.on('requestfailed', (request) => {
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

  try {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
    await waitForReady(page);
    await page.waitForTimeout(settleMs);
    const screenshotPath = path.join(artifactsDir, `${label}.png`);
    await page.screenshot({ fullPage: false, path: screenshotPath });
    const labState = await collectLabState(page);
    assertBasicSignals(label, labState);

    if (pageErrors.length || consoleErrors.length || requestFailures.length || httpErrors.length) {
      fail('Lab best-practice signal failed: browser errors or failed requests were recorded', {
        consoleErrors,
        httpErrors,
        label,
        pageErrors,
        requestFailures,
      });
    }

    return {
      ...labState,
      artifact: screenshotPath,
      bestPracticeSignals: {
        ...labState.bestPracticeSignals,
        consoleErrors,
        httpErrors,
        pageErrors,
        requestFailures,
      },
      label,
      route,
    };
  } finally {
    await page.close();
  }
};

const collectPwaSignals = async (page) =>
  page.evaluate(async () => {
    const manifestLink = document.querySelector('link[rel="manifest"]')?.getAttribute('href') || null;
    const manifestResponse = manifestLink ? await fetch(manifestLink) : null;
    const manifest = manifestResponse?.ok ? await manifestResponse.json() : null;
    const serviceWorkerSupported = 'serviceWorker' in navigator;
    let serviceWorker = null;
    if (serviceWorkerSupported) {
      const ready = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('service worker ready timed out')), 15000)),
      ]);
      const registrations = await navigator.serviceWorker.getRegistrations();
      serviceWorker = {
        controller: Boolean(navigator.serviceWorker.controller),
        registrationCount: registrations.length,
        registrations: registrations.map((registration) => ({
          activeScriptURL: registration.active?.scriptURL || null,
          activeState: registration.active?.state || null,
          scope: registration.scope,
        })),
        scriptURL: ready.active?.scriptURL || ready.waiting?.scriptURL || ready.installing?.scriptURL || null,
        state: ready.active?.state || null,
      };
    }

    return {
      isSecureContext: window.isSecureContext,
      manifest: manifest
        ? {
            display: manifest.display,
            iconCount: manifest.icons?.length || 0,
            name: manifest.name,
            scope: manifest.scope,
            shortName: manifest.short_name,
            startUrl: manifest.start_url,
          }
        : null,
      manifestFetch: {
        href: manifestLink,
        ok: Boolean(manifestResponse?.ok),
        status: manifestResponse?.status || null,
      },
      serviceWorker,
      serviceWorkerSupported,
    };
  });

const evaluateLabBaseline = ({ home, race }) => {
  const checks = [
    {
      actual: home.vitals?.firstContentfulPaint ?? Number.POSITIVE_INFINITY,
      label: 'home first contentful paint',
      limit: labBaselineThresholds.homeFcpMs,
      route: 'home',
      unit: 'ms',
    },
    {
      actual: home.vitals?.largestContentfulPaint ?? Number.POSITIVE_INFINITY,
      label: 'home largest contentful paint',
      limit: labBaselineThresholds.homeLcpMs,
      route: 'home',
      unit: 'ms',
    },
    {
      actual: home.vitals?.cumulativeLayoutShift ?? Number.POSITIVE_INFINITY,
      label: 'home cumulative layout shift',
      limit: labBaselineThresholds.homeCls,
      route: 'home',
      unit: 'score',
    },
    {
      actual: home.vitals?.totalBlockingTimeProxyMs ?? Number.POSITIVE_INFINITY,
      label: 'home total blocking time proxy',
      limit: labBaselineThresholds.homeTotalBlockingTimeProxyMs,
      route: 'home',
      unit: 'ms',
    },
    {
      actual: race.vitals?.firstContentfulPaint ?? Number.POSITIVE_INFINITY,
      label: 'race first contentful paint',
      limit: labBaselineThresholds.raceFcpMs,
      route: 'race',
      unit: 'ms',
    },
    {
      actual: race.vitals?.largestContentfulPaint ?? Number.POSITIVE_INFINITY,
      label: 'race largest contentful paint',
      limit: labBaselineThresholds.raceLcpMs,
      route: 'race',
      unit: 'ms',
    },
    {
      actual: race.vitals?.cumulativeLayoutShift ?? Number.POSITIVE_INFINITY,
      label: 'race cumulative layout shift',
      limit: labBaselineThresholds.raceCls,
      route: 'race',
      unit: 'score',
    },
    {
      actual: race.vitals?.totalBlockingTimeProxyMs ?? Number.POSITIVE_INFINITY,
      label: 'race total blocking time proxy',
      limit: labBaselineThresholds.raceTotalBlockingTimeProxyMs,
      route: 'race',
      unit: 'ms',
    },
    {
      actual: race.vitals?.maxLongTaskMs ?? Number.POSITIVE_INFINITY,
      label: 'race max long task',
      limit: labBaselineThresholds.raceMaxLongTaskMs,
      route: 'race',
      unit: 'ms',
    },
  ].map((check) => ({
    ...check,
    status: check.actual <= check.limit ? 'pass' : 'fail',
  }));

  return {
    checks,
    failures: checks.filter((check) => check.status === 'fail'),
    note:
      'Owner delegated a conservative V1 lab baseline on 2026-06-01. It uses Web Vitals-style paint and layout thresholds, plus wider WebGL race startup long-task guardrails until deployed Lighthouse/Web Vitals evidence is available.',
    thresholds: labBaselineThresholds,
  };
};

const run = async () => {
  try {
    if (shouldCleanArtifacts) await rm(artifactsDir, { force: true, recursive: true });
    await mkdir(artifactsDir, { recursive: true });
    await ensureDist();

    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const server = spawn(npm, ['run', 'preview', '--', '--host', '0.0.0.0', '--port', String(port), '--strictPort'], {
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
      await waitForServer(readinessUrl);
      browser = await chromium.launch({
        args: [
          `--host-resolver-rules=MAP ${hostName} 127.0.0.1`,
          `--unsafely-treat-insecure-origin-as-secure=${baseUrl}`,
        ],
        headless: true,
      });
      const context = await browser.newContext({
        viewport: { height: 900, width: 1440 },
      });
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
      await context.addInitScript(labObserverScript);
      await context.route('**/api/sync/**', async (route) => {
        await route.fulfill({
          body: JSON.stringify({ error: 'not_authenticated' }),
          contentType: 'application/json',
          status: 401,
        });
      });

      const home = await collectRoute({
        context,
        label: 'home',
        route: '/',
        settleMs: 1600,
        waitForReady: async (page) => {
          await page.waitForSelector('text=The Comeback', { timeout: 12000 });
        },
      });

      const pwaPage = await context.newPage();
      await pwaPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      await pwaPage.waitForSelector('text=The Comeback', { timeout: 12000 });
      const pwa = await collectPwaSignals(pwaPage);
      await pwaPage.close();
      if (!pwa.manifestFetch.ok || !pwa.manifest || !pwa.serviceWorkerSupported || !pwa.serviceWorker?.scriptURL?.endsWith('/sw.js')) {
        fail('Lab PWA signal failed: manifest or service worker signal missing', { pwa });
      }

      const race = await collectRoute({
        context,
        label: 'race',
        route: '/#race',
        settleMs: 2200,
        waitForReady: async (page) => {
          await page.waitForSelector('[data-testid="race-screen"][data-race-track="comeback-city"]', { timeout: 15000 });
          await page.waitForSelector('[data-testid="arcade-race-shell"][data-race-track="comeback-city"]', {
            timeout: 15000,
          });
          await page.waitForFunction(
            () => {
              const screen = document.querySelector('[data-testid="race-screen"]');
              const shell = document.querySelector('[data-testid="arcade-race-shell"]');
              const canvas =
                document.querySelector('canvas[data-visual-canvas="race"]') ||
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
        },
      });

      await context.close();
      const baseline = evaluateLabBaseline({ home, race });
      const summary = {
        artifactsDir,
        baseUrl,
        baseline,
        capturedAt: new Date().toISOString(),
        gateStatus: baseline.failures.length ? 'lab-baseline-fail' : 'lab-baseline-pass',
        git: getGitMetadata(),
        note:
          'This is a local Playwright lab-readiness equivalent for Lighthouse/Web Vitals evidence. It records metrics and basic signals only; production acceptance still requires deployed preview and production evidence against the owner-approved baseline.',
        pwa,
        routes: {
          home,
          race,
        },
        unresolvedReleaseDecisions: [
          'Production deployed URL and response-header evidence',
          'Target browser/device matrix',
          'Monitoring provider or explicit no-monitoring risk acceptance',
        ],
      };
      await writeFile(path.join(artifactsDir, 'lab-readiness-smoke-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
      if (baseline.failures.length) {
        fail('Lab readiness baseline failed', { baseline });
      }
      console.log(JSON.stringify(summary, null, 2));
    } catch (error) {
      if (serverLog) error.detail = { ...(error.detail || {}), serverLog: serverLog.slice(-4000) };
      throw error;
    } finally {
      if (browser) await browser.close();
      server.kill();
    }
  } catch (error) {
    console.error(error.message);
    if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
    process.exitCode = 1;
  }
};

await run();
