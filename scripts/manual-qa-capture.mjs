import { spawn, execFileSync } from 'node:child_process';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { makeDefaultState, normalizeState, STORAGE_KEY, SYNC_META_KEY } from '../src/hooks/usePersistedState.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
let port = Number(process.env.MANUAL_QA_CAPTURE_PORT || 5221);
const suppliedUrl = process.env.MANUAL_QA_CAPTURE_URL?.trim() || '';
let baseUrl = suppliedUrl ? suppliedUrl.replace(/\/+$/, '') : `http://127.0.0.1:${port}`;
const isLocalBuiltPreview = !suppliedUrl;
const shouldCleanArtifacts = !process.env.MANUAL_QA_CAPTURE_ARTIFACT_DIR;
const artifactsDir = process.env.MANUAL_QA_CAPTURE_ARTIFACT_DIR
  ? path.resolve(root, process.env.MANUAL_QA_CAPTURE_ARTIFACT_DIR)
  : path.join(root, 'tmp', 'manual-qa-capture');
const videoDir = path.join(artifactsDir, 'videos');
const distIndexPath = path.join(root, 'dist', 'index.html');
const latestBrowserSummaryPath = process.env.MANUAL_QA_BROWSER_SUMMARY
  ? path.resolve(root, process.env.MANUAL_QA_BROWSER_SUMMARY)
  : path.join(
      root,
      '.agent',
      'runs',
      'kart-racer-production-readiness',
      'evidence',
      'perf-026-20260524T085441Z',
      'race-browser-playtest-summary-after-revert.json'
    );

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
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() || null,
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
  fail('Manual QA capture target did not become ready', { url });
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
  if (process.env.MANUAL_QA_CAPTURE_PORT) {
    if (!(await canListenOnPort(port))) {
      fail('Requested MANUAL_QA_CAPTURE_PORT is already in use', { port });
    }
    return port;
  }
  for (let candidatePort = port; candidatePort < port + 50; candidatePort += 1) {
    if (await canListenOnPort(candidatePort)) return candidatePort;
  }
  fail('No available local manual QA capture preview port found', { startPort: port });
};

const ensureDist = async () => {
  await access(distIndexPath).catch(() => {
    fail('Built app artifact is missing; run npm run build before manual QA capture', {
      filePath: distIndexPath,
    });
  });
};

const routeUrl = (route = '/') => {
  const normalizedRoute = route.startsWith('/') || route.startsWith('#') ? route : `/${route}`;
  if (normalizedRoute.startsWith('#')) return `${baseUrl}/${normalizedRoute}`;
  return `${baseUrl}${normalizedRoute}`;
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

const mockLocalSync = async (context) => {
  await context.route('**/api/sync/**', async (route) => {
    await route.fulfill({
      body: JSON.stringify({ error: 'not_authenticated' }),
      contentType: 'application/json',
      status: 401,
    });
  });
  return { mode: 'mock-unauthenticated-sync' };
};

const isAllowedConsoleError = (message) => /401 \(Unauthorized\)/.test(message) || /\/api\/sync\//.test(message);

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
    fail('Blocking browser errors recorded during manual QA capture', { errors, label });
  }
};

const waitForRaceReady = async (page) => {
  await page.waitForSelector('[data-testid="race-screen"][data-race-track="comeback-city"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="arcade-race-shell"][data-race-track="comeback-city"]', {
    timeout: 15000,
  });
  await page.waitForFunction(
    () => {
      const screen = document.querySelector('[data-testid="race-screen"]');
      const shell = document.querySelector('[data-testid="arcade-race-shell"]');
      const diagnosticReady =
        window.__raceVisualTelemetry?.trackKey === 'comeback-city' &&
        Number.isFinite(window.__raceVisualTelemetry?.actualFps);
      const shellSpeed = Number(shell?.dataset?.raceSpeedRatio);
      return (
        screen?.dataset?.raceTrack === 'comeback-city' &&
        shell?.dataset?.raceTrack === 'comeback-city' &&
        (diagnosticReady || Number.isFinite(shellSpeed))
      );
    },
    null,
    { timeout: 15000 }
  );
};

const summarizeTelemetry = (telemetry) => ({
  actualFps: telemetry?.actualFps ?? null,
  boostActive: telemetry?.player?.boostActive ?? null,
  boostSource: telemetry?.player?.boostSource ?? null,
  cameraClipCount: telemetry?.camera?.clipCount ?? null,
  driftActive: telemetry?.player?.driftActive ?? null,
  driftTier: telemetry?.player?.driftTier ?? null,
  driftTierSeen: telemetry?.player?.driftTierSeen ?? null,
  frameElapsedMs: telemetry?.frameElapsedMs ?? null,
  heldItemKey: telemetry?.race?.heldItemKey ?? null,
  kartHeightRatio: telemetry?.player?.kartScreenCoverage?.heightRatio ?? null,
  lap: telemetry?.race?.lap ?? null,
  normalizedSpeed: telemetry?.player?.normalizedSpeed ?? null,
  playerProgress: telemetry?.player?.progress ?? null,
  rendererCalls: telemetry?.renderer?.calls ?? null,
  rendererTriangles: telemetry?.renderer?.triangles ?? null,
  roadAheadCoverage: telemetry?.camera?.roadAheadCoverage ?? null,
  routeLookaheadSeconds: telemetry?.camera?.routeLookaheadSeconds ?? null,
  trackKey: telemetry?.trackKey ?? null,
  vehicleMode: telemetry?.player?.vehicleMode ?? null,
  visibleRivals: telemetry?.race?.visibleRivals ?? null,
  visibleRivalsSeen: telemetry?.race?.visibleRivalsSeen ?? null,
});

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
    const raceSpeedRatio = Number(shell?.dataset?.raceSpeedRatio);
    const domTelemetry = {
      actualFps: null,
      player: {
        audioMuted: shell?.dataset?.raceAudioMuted === 'true',
        normalizedSpeed: Number.isFinite(raceSpeedRatio) ? raceSpeedRatio : 0,
      },
      race: {
        lap: Number(shell?.dataset?.raceLap) || null,
        place: Number(shell?.dataset?.racePlace) || null,
        time: Number(shell?.dataset?.raceTime) || null,
      },
      renderer: {
        calls: null,
        triangles: null,
      },
      source: 'production-dom',
      trackKey: screen?.dataset?.raceTrack || shell?.dataset?.raceTrack || null,
    };
    return {
      canvasDataUrlLength,
      hash: window.location.hash,
      renderer: screen?.getAttribute('data-race-renderer') || null,
      telemetry: window.__raceVisualTelemetry || domTelemetry,
      title: document.title,
      url: window.location.href,
      viewport: {
        devicePixelRatio: window.devicePixelRatio,
        height: window.innerHeight,
        width: window.innerWidth,
      },
    };
  });

const captureDesktop = async (browser) => {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    recordVideo: { dir: videoDir, size: { height: 720, width: 1280 } },
    viewport: { height: 900, width: 1440 },
  });
  await installSeedState(context);
  const sync = await mockLocalSync(context);
  const page = await context.newPage();
  const errors = collectBrowserErrors(page);
  const clipStartedAtMs = Date.now();
  const clipWindowTargetMs = 10500;
  const video = page.video();
  const screenshots = {
    drift: path.join(artifactsDir, 'manual-qa-desktop-drift.png'),
    idle: path.join(artifactsDir, 'manual-qa-desktop-idle.png'),
    speed: path.join(artifactsDir, 'manual-qa-desktop-speed.png'),
  };

  await page.goto(routeUrl('/#race'), { waitUntil: 'domcontentloaded' });
  await waitForRaceReady(page);
  const idle = await raceState(page);
  await page.screenshot({ fullPage: false, path: screenshots.idle });

  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(1600);
  const speed = await raceState(page);
  await page.screenshot({ fullPage: false, path: screenshots.speed });

  await page.keyboard.down('ArrowLeft');
  await page.keyboard.down('Space');
  await page.waitForTimeout(1700);
  const drift = await raceState(page);
  await page.screenshot({ fullPage: false, path: screenshots.drift });
  await page.keyboard.up('Space');
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowUp');

  const elapsedMs = Date.now() - clipStartedAtMs;
  if (elapsedMs < clipWindowTargetMs) {
    await page.waitForTimeout(clipWindowTargetMs - elapsedMs);
  }

  if (speed.canvasDataUrlLength !== -1 && speed.canvasDataUrlLength <= 1200) {
    fail('Desktop race canvas did not produce a nonblank data URL during manual QA capture', { speed });
  }
  if ((speed.telemetry?.player?.normalizedSpeed || 0) <= (idle.telemetry?.player?.normalizedSpeed || 0)) {
    fail('Desktop acceleration did not increase race speed telemetry during manual QA capture', {
      idle: summarizeTelemetry(idle.telemetry),
      speed: summarizeTelemetry(speed.telemetry),
    });
  }
  assertNoBlockingBrowserErrors('desktop manual QA capture', errors);
  await page.close();
  await context.close();

  return {
    clipDurationTargetMs: clipWindowTargetMs,
    clipPath: video ? await video.path() : null,
    inputMethod: 'keyboard: ArrowUp, ArrowLeft, Space',
    routeUrl: routeUrl('/#race'),
    screenshots,
    states: {
      drift: { ...drift, telemetry: summarizeTelemetry(drift.telemetry) },
      idle: { ...idle, telemetry: summarizeTelemetry(idle.telemetry) },
      speed: { ...speed, telemetry: summarizeTelemetry(speed.telemetry) },
    },
    status: 'captured-not-human-scored',
    sync,
    viewport: { height: 900, width: 1440 },
  };
};

const dispatchTouch = async (locator, type) => {
  await locator.dispatchEvent(type, {
    bubbles: true,
    button: 0,
    buttons: type === 'pointerup' ? 0 : 1,
    isPrimary: true,
    pointerId: 1,
    pointerType: 'touch',
  });
};

const captureMobile = async (browser) => {
  const context = await browser.newContext({
    hasTouch: true,
    ignoreHTTPSErrors: true,
    isMobile: true,
    viewport: { height: 844, width: 390 },
  });
  await installSeedState(context);
  const sync = await mockLocalSync(context);
  const page = await context.newPage();
  const errors = collectBrowserErrors(page);
  const screenshotPath = path.join(artifactsDir, 'manual-qa-mobile-driving.png');

  await page.goto(routeUrl('/#race'), { waitUntil: 'domcontentloaded' });
  await waitForRaceReady(page);
  await page.waitForSelector('[data-testid="race-go-button"]', { timeout: 15000 });
  const beforeInput = await raceState(page);
  const goButton = page.getByTestId('race-go-button');
  const box = await goButton.boundingBox();
  if (!box) fail('Mobile Go touch control did not render a clickable box');
  await dispatchTouch(goButton, 'pointerdown');
  await page.waitForTimeout(1400);
  await page.waitForFunction(
    () => {
      const diagnosticSpeed = Number(window.__raceVisualTelemetry?.player?.normalizedSpeed);
      const shellSpeed = Number(
        document.querySelector('[data-testid="arcade-race-shell"]')?.dataset?.raceSpeedRatio
      );
      const normalizedSpeed = Math.max(
        Number.isFinite(diagnosticSpeed) ? diagnosticSpeed : 0,
        Number.isFinite(shellSpeed) ? shellSpeed : 0
      );
      return normalizedSpeed > 0.05;
    },
    null,
    { timeout: 8000 }
  );
  const afterInput = await raceState(page);
  await page.screenshot({ fullPage: false, path: screenshotPath });
  await dispatchTouch(goButton, 'pointerup');

  if (afterInput.canvasDataUrlLength !== -1 && afterInput.canvasDataUrlLength <= 1200) {
    fail('Mobile race canvas did not produce a nonblank data URL during manual QA capture', { afterInput });
  }
  if ((afterInput.telemetry?.player?.normalizedSpeed || 0) <= (beforeInput.telemetry?.player?.normalizedSpeed || 0)) {
    fail('Mobile touch acceleration did not increase race speed telemetry during manual QA capture', {
      afterInput: summarizeTelemetry(afterInput.telemetry),
      beforeInput: summarizeTelemetry(beforeInput.telemetry),
    });
  }
  assertNoBlockingBrowserErrors('mobile manual QA capture', errors);
  await page.close();
  await context.close();

  return {
    goButtonBox: box,
    inputMethod: 'touch: race-go-button pointer events',
    routeUrl: routeUrl('/#race'),
    screenshotPath,
    states: {
      beforeInput: { ...beforeInput, telemetry: summarizeTelemetry(beforeInput.telemetry) },
      driving: { ...afterInput, telemetry: summarizeTelemetry(afterInput.telemetry) },
    },
    status: 'captured-not-human-scored',
    sync,
    viewport: { height: 844, width: 390 },
  };
};

const readLatestBrowserContext = async () => {
  try {
    const summary = JSON.parse(await readFile(latestBrowserSummaryPath, 'utf8'));
    const representativeVisuals = (summary.visualChecks || [])
      .filter((entry) =>
        ['idle', 'driving', 'drift', 'drift-release', 'boost', 'boost-pad-mechanics', 'rival-cluster'].includes(
          entry.scenario
        )
      )
      .slice(0, 8)
      .map((entry) => ({
        actualFps: entry.summary?.actualFps ?? null,
        boostSource: entry.summary?.boostSource ?? null,
        cameraClipCount: entry.summary?.cameraClipCount ?? null,
        driftTier: entry.summary?.driftTier ?? null,
        kartHeightRatio: entry.summary?.kartHeightRatio ?? null,
        name: entry.name,
        roadAheadCoverage: entry.summary?.roadAheadCoverage ?? null,
        scenario: entry.scenario,
        screenshotPath: entry.screenshotPath,
        visibleRivalsSeen: entry.summary?.visibleRivalsSeen ?? null,
      }));
    return {
      capturedAt: summary.capturedAt || null,
      path: latestBrowserSummaryPath,
      raceCount: summary.raceCount ?? null,
      representativeVisuals,
      status: 'read',
      sustainedNormalPlay: summary.sustainedNormalPlay
        ? {
            actualFps: summary.sustainedNormalPlay.summary?.actualFps ?? null,
            cameraClipCount: summary.sustainedNormalPlay.summary?.latest?.cameraClipCount ?? null,
            captureWindowSeconds: summary.sustainedNormalPlay.summary?.captureWindowSeconds ?? null,
            kartHeightRatio: summary.sustainedNormalPlay.summary?.latest?.kartHeightRatio ?? null,
            roadAheadCoverage: summary.sustainedNormalPlay.summary?.latest?.roadAheadCoverage ?? null,
            screenshotPath: summary.sustainedNormalPlay.screenshotPath || null,
            visibleRivalsSeen: summary.sustainedNormalPlay.summary?.latest?.visibleRivalsSeen ?? null,
          }
        : null,
      visualCheckCount: summary.visualCheckCount ?? null,
    };
  } catch (error) {
    return {
      error: error.message,
      path: latestBrowserSummaryPath,
      status: 'missing-or-unreadable',
    };
  }
};

const writeQaPrepTemplate = async (summary) => {
  const templatePath = path.join(artifactsDir, 'manual-qa-prep-result-template.md');
  const lines = [
    '# Race Manual QA Prep Capture',
    '',
    'Status: Evidence prep only. Human QA scores remain `Not run` until a real manual run is completed.',
    '',
    `Captured at: ${summary.capturedAt}`,
    `Route: ${summary.routeUrl}`,
    `Artifacts directory: ${summary.artifactsDir}`,
    '',
    '## Prepared Evidence',
    '',
    '| Field | Prepared value |',
    '| --- | --- |',
    `| Desktop idle capture | \`${summary.captures.desktop.screenshots.idle}\` |`,
    `| Desktop speed capture | \`${summary.captures.desktop.screenshots.speed}\` |`,
    `| Desktop drift capture | \`${summary.captures.desktop.screenshots.drift}\` |`,
    `| Mobile driving capture | \`${summary.captures.mobile.screenshotPath}\` |`,
    `| Fresh-user clip candidate | \`${summary.captures.desktop.clipPath}\` |`,
    `| Desktop viewport | \`${summary.captures.desktop.viewport.width}x${summary.captures.desktop.viewport.height}\` |`,
    `| Mobile viewport | \`${summary.captures.mobile.viewport.width}x${summary.captures.mobile.viewport.height}\` |`,
    `| Browser telemetry context | \`${summary.automatedContext.path}\` |`,
    '',
    '## Human Fields Still Required',
    '',
    '| Field | Value |',
    '| --- | --- |',
    '| QA run status | Not run |',
    '| Tester | Not run |',
    '| Date/time | Not run |',
    '| Desktop manual route result | Not run |',
    '| Mobile manual route result | Not run |',
    '| Fresh-user reviewer and answer | Not run |',
    '| Manual QA category scores | Not run |',
    '| Release-owner acceptance | Not run |',
  ];
  await writeFile(templatePath, `${lines.join('\n')}\n`);
  return templatePath;
};

const runBrowserCapture = async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await captureDesktop(browser);
    const mobile = await captureMobile(browser);
    return { desktop, mobile };
  } finally {
    await browser.close();
  }
};

const run = async () => {
  if (shouldCleanArtifacts) await rm(artifactsDir, { force: true, recursive: true });
  await mkdir(videoDir, { recursive: true });
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
    const automatedContext = await readLatestBrowserContext();
    const captures = await runBrowserCapture();
    const summary = {
      artifactsDir,
      automatedContext,
      baseUrl,
      capturedAt: new Date().toISOString(),
      captures,
      caveats: [
        'This capture proves only reproducible evidence collection for manual QA.',
        'It does not score RACE-009 and must not be used as a substitute for human desktop, mobile, or fresh-user review.',
        'Preview/prod URL smoke, Cloudflare rollback, monitoring/support activation, and release sign-offs remain separate gates.',
      ],
      gateStatus: 'manual-qa-evidence-prepared-human-scoring-required',
      git: getGitMetadata(),
      routeUrl: routeUrl('/#race'),
      serverLog,
      target: suppliedUrl ? 'external-url' : 'local-built-preview',
    };
    summary.qaPrepTemplatePath = await writeQaPrepTemplate(summary);
    summary.artifactFiles = [
      captures.desktop.screenshots.idle,
      captures.desktop.screenshots.speed,
      captures.desktop.screenshots.drift,
      captures.desktop.clipPath,
      captures.mobile.screenshotPath,
      summary.qaPrepTemplatePath,
      path.join(artifactsDir, 'manual-qa-capture-summary.json'),
    ].filter(Boolean);
    await writeFile(path.join(artifactsDir, 'manual-qa-capture-summary.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    const failure = {
      artifactsDir,
      baseUrl,
      capturedAt: new Date().toISOString(),
      detail: error.detail || null,
      error: error.message,
      gateStatus: 'manual-qa-capture-failed',
      serverLog,
      stack: error.stack,
    };
    await writeFile(path.join(artifactsDir, 'manual-qa-capture-summary.json'), JSON.stringify(failure, null, 2));
    console.error(JSON.stringify(failure, null, 2));
    process.exitCode = 1;
  } finally {
    if (server) server.kill('SIGTERM');
  }
};

await run();
