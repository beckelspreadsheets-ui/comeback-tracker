import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { calcTargets } from '../src/lib/nutrition.js';
import { LIFTS, PROGRAM } from '../src/lib/program.js';
import { todayKey } from '../src/lib/foodHelpers.js';
import { makeDefaultState, STORAGE_KEY, SYNC_META_KEY } from '../src/hooks/usePersistedState.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.HUB_SMOKE_PORT || 5194);
const baseUrl = `http://127.0.0.1:${port}`;
const screenshotsDir = path.join(root, 'tmp', 'hub-smoke-test');
const HUB_PERFORMANCE_BUDGET = {
  drawCalls: Number(process.env.HUB_MAX_DRAW_CALLS || 3200),
  readyMs: Number(process.env.HUB_MAX_READY_MS || 15000),
  sceneMeshCount: Number(process.env.HUB_MAX_SCENE_MESHES || 2600),
  sceneObjectCount: Number(process.env.HUB_MAX_SCENE_OBJECTS || 3500),
  triangles: Number(process.env.HUB_MAX_TRIANGLES || 80000),
};

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

const prescribedSetCount = (exercise) => Math.max(1, Number(exercise?.sets) || 1);

const completedDayLog = (dayData) => ({
  exercises: dayData.exercises.map((exercise) => ({
    joint: 'green',
    note: '',
    sets: Array.from({ length: prescribedSetCount(exercise) }, () => ({
      reps: String(exercise.reps || 10).match(/\d+/)?.[0] || '10',
      wt: '100',
    })),
  })),
});

const completeCurrentWeekWorkouts = (state, { jointWarning = false } = {}) => {
  const currentWeek = Number(state.currentWeek) || 1;
  state.logs = { ...state.logs };
  PROGRAM.forEach((dayData) => {
    state.logs[`w${currentWeek}d${dayData.day}`] = completedDayLog(dayData);
  });
  if (jointWarning) {
    state.logs[`w${currentWeek}d1`].exercises[0].joint = 'red';
  }
};

const completeFoodForToday = (state) => {
  const targets = calcTargets(state.settings, state.food.targets);
  state.food = {
    ...state.food,
    log: {
      ...state.food.log,
      [todayKey()]: {
        breakfast: [
          {
            amount: 1,
            cal: targets.calories,
            c: Math.round(targets.carbs * 0.7),
            f: Math.round(targets.fat * 0.7),
            id: 'hub-smoke-protein',
            name: 'Hub smoke protein meal',
            p: targets.protein,
            unit: 'serving',
          },
        ],
        lunch: [],
        dinner: [],
        snacks: [],
      },
    },
  };
};

const completeCalibration = (state) => {
  state.oneRMs = Object.fromEntries(LIFTS.slice(0, 8).map((lift, index) => [lift.key, 120 + index * 5]));
};

const completeMetrics = (state) => {
  state.metrics = [
    {
      arm: 15,
      bw: 200,
      thigh: 24,
      waist: 34,
      week: Number(state.currentWeek) || 1,
    },
  ];
};

const makeProgressState = () => {
  const state = makeDefaultState();
  const dayOne = PROGRAM.find((day) => day.day === 1) || PROGRAM[0];
  state.logs = { ...state.logs, [`w${state.currentWeek}d1`]: completedDayLog(dayOne) };
  completeFoodForToday(state);
  completeCalibration(state);

  return state;
};

const makeMissionTargetState = (targetKey) => {
  const state = makeDefaultState();
  if (targetKey === 'gym') return state;

  completeCurrentWeekWorkouts(state, { jointWarning: targetKey === 'clinic' });
  if (targetKey === 'food') return state;

  completeFoodForToday(state);
  if (targetKey === 'lab') return state;

  completeCalibration(state);
  if (targetKey === 'clinic') return state;

  if (targetKey === 'home') return state;

  completeMetrics(state);
  return state;
};

const makeRaceResultState = () => {
  const state = makeDefaultState();
  state.game = {
    ...state.game,
    raceResults: {
      'tide-pier': {
        bestLap: 39_200,
        bestPlace: 1,
        bestTime: 124_800,
        podiums: 1,
        runs: 1,
        wins: 1,
      },
    },
  };
  return state;
};

const makeSpawnState = () => {
  const state = makeDefaultState();
  state.game = {
    ...state.game,
    hub: {
      ...state.game.hub,
      lastSpawn: { heading: 0.42, x: 22, z: 0 },
    },
  };
  return state;
};

const makeOnboardedState = () => {
  const state = makeDefaultState();
  state.game = {
    ...state.game,
    hub: {
      ...state.game.hub,
      onboardingSeen: true,
    },
  };
  return state;
};

const makeGarageUpgradeState = () => {
  const state = makeOnboardedState();
  completeCurrentWeekWorkouts(state);
  completeCalibration(state);
  return state;
};

const makeReturnSessionState = () => {
  const state = makeOnboardedState();
  state.game = {
    ...state.game,
    hub: {
      ...state.game.hub,
      metrics: {
        ...state.game.hub.metrics,
        citySessions: 1,
        firstCitySessionAt: '2026-05-17T12:00:00.000Z',
        lastCitySessionAt: '2026-05-17T12:00:00.000Z',
        returnSessions: 0,
      },
    },
  };
  return state;
};

const makePortalSpawnState = (spawn) => {
  const state = makeDefaultState();
  state.game = {
    ...state.game,
    hub: {
      ...state.game.hub,
      lastSpawn: spawn,
    },
  };
  return state;
};

const makeMissionPortalState = (targetKey, spawn) => {
  const state = makeMissionTargetState(targetKey);
  state.game = {
    ...state.game,
    hub: {
      ...state.game.hub,
      lastSpawn: spawn,
    },
  };
  return state;
};

const newSeededPage = async (browser, state, pageOptions = {}) => {
  const page = await browser.newPage({
    viewport: { height: 720, width: 1280 },
    ...pageOptions,
  });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });
  await page.route('**/api/sync/**', async (route) => {
    const url = new URL(route.request().url());
    const now = new Date().toISOString();
    if (url.pathname.endsWith('/me')) {
      await route.fulfill({
        body: JSON.stringify({
          profiles: [
            {
              displayName: 'Hub Smoke',
              hasState: false,
              userId: 'hub-smoke',
            },
          ],
          user: {
            canView: ['hub-smoke'],
            displayName: 'Hub Smoke',
            userId: 'hub-smoke',
          },
        }),
        contentType: 'application/json',
        status: 200,
      });
      return;
    }
    if (route.request().method() === 'PUT') {
      await route.fulfill({
        body: JSON.stringify({ rev: 1, updatedAt: now, userId: 'hub-smoke' }),
        contentType: 'application/json',
        status: 200,
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({ rev: null, state: null, updatedAt: null, userId: 'hub-smoke' }),
      contentType: 'application/json',
      status: 200,
    });
  });
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
  return { page, pageErrors };
};

const waitForHub = async (page, label = 'playable hub') => {
  const started = Date.now();
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForSelector('[data-testid="playable-world-home"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="world-scene-canvas"][data-telemetry-ready="true"]', {
      timeout: 15000,
    });
    return { readyMs: Date.now() - started };
  } catch (error) {
    const bodyText = await page.locator('body').textContent().catch(() => '');
    fail(`Timed out waiting for ${label}`, {
      bodyText: bodyText?.slice(0, 1000),
      message: error.message,
      url: page.url(),
    });
  }
};

const waitForDebugHub = async (page) => {
  await page.goto(`${baseUrl}/?hubDebug=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="playable-world-home"]', { timeout: 15000 });
  await page.waitForSelector(
    '[data-testid="world-scene-canvas"][data-telemetry-ready="true"][data-debug-overlay-enabled="true"]',
    { timeout: 15000 }
  );
};

const waitForFallbackHub = async (page, label = 'fallback hub', pageErrors = []) => {
  const started = Date.now();
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForSelector('[data-testid="playable-world-home"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="world-fallback-map"][data-telemetry-ready="true"]', {
      timeout: 15000,
    });
    return { readyMs: Date.now() - started };
  } catch (error) {
    const bodyText = await page.locator('body').textContent().catch(() => '');
    fail(`Timed out waiting for ${label}`, {
      bodyText: bodyText?.slice(0, 1000),
      errors: pageErrors,
      message: error.message,
      url: page.url(),
    });
  }
};

const readTelemetry = async (page, label = 'hub telemetry') => {
  const locator = page.locator('[data-testid="world-scene-canvas"]');
  if (!(await locator.count())) {
    fail(`World telemetry canvas missing during ${label}`, { url: page.url() });
  }
  return locator.evaluate((canvas) => {
    const feedback = JSON.parse(canvas.dataset.districtFeedback || '[]');
    return { ...canvas.dataset, districtFeedback: feedback };
  });
};

const waitForFpsTelemetry = async (page, label = 'hub telemetry') => {
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector('[data-testid="world-scene-canvas"]');
      const fps = Number(canvas?.dataset?.fpsEstimate);
      return Number.isFinite(fps) && fps > 0;
    },
    null,
    { timeout: 15000 }
  );
  const telemetry = await readTelemetry(page, label);
  if (!Number.isFinite(Number(telemetry.fpsEstimate)) || Number(telemetry.fpsEstimate) <= 0) {
    fail(`Hub FPS telemetry missing during ${label}`, { telemetry });
  }
  return telemetry;
};

const readRuntimeTelemetry = async (page, label = 'hub runtime telemetry') => {
  const telemetry = await page.evaluate(() => window.__comebackCityHubTelemetry || null);
  if (!telemetry?.ready) fail(`Runtime telemetry missing during ${label}`, { telemetry });
  return telemetry;
};

const captureHubScreenshot = async (page, filename) => {
  const outputPath = path.join(screenshotsDir, filename);
  await page.locator('[data-testid="playable-world-home"]').screenshot({ path: outputPath });
  return outputPath;
};

const assertPerformanceTelemetry = (telemetry, label, timing = null) => {
  const requiredPositiveMetrics = ['drawCalls', 'fpsEstimate', 'triangles', 'sceneObjectCount', 'sceneMeshCount'];
  for (const key of requiredPositiveMetrics) {
    const value = Number(telemetry[key]);
    if (!Number.isFinite(value) || value <= 0) {
      fail(`Hub performance telemetry missing ${key} during ${label}`, { telemetry });
    }
  }
  const budgetMetrics = {
    drawCalls: Number(telemetry.drawCalls),
    sceneMeshCount: Number(telemetry.sceneMeshCount),
    sceneObjectCount: Number(telemetry.sceneObjectCount),
    triangles: Number(telemetry.triangles),
  };
  for (const [key, value] of Object.entries(budgetMetrics)) {
    const limit = HUB_PERFORMANCE_BUDGET[key];
    if (Number.isFinite(limit) && value > limit) {
      fail(`Hub performance budget exceeded for ${key} during ${label}`, {
        budget: HUB_PERFORMANCE_BUDGET,
        observed: budgetMetrics,
      });
    }
  }
  if (timing?.readyMs != null && timing.readyMs > HUB_PERFORMANCE_BUDGET.readyMs) {
    fail(`Hub ready time budget exceeded during ${label}`, {
      budget: HUB_PERFORMANCE_BUDGET,
      readyMs: timing.readyMs,
    });
  }
};

const assertMissionBeacon = async (browser, targetKey, missionKey) => {
  const { page, pageErrors } = await newSeededPage(browser, makeMissionTargetState(targetKey));
  await waitForHub(page, `${targetKey} mission hub`);
  await page.waitForSelector(
    `[data-testid="world-scene-canvas"][data-active-destination-key="${targetKey}"][data-active-mission-key="${missionKey}"]`,
    { timeout: 15000 }
  );
  const telemetry = await readTelemetry(page, `${targetKey} mission`);
  if (telemetry.activeDestinationKey !== targetKey || telemetry.activeMissionKey !== missionKey) {
    fail('Mission beacon pointed to the wrong destination', {
      expected: { missionKey, targetKey },
      telemetry,
    });
  }
  assertNoErrors(pageErrors, `${targetKey} mission`);
  await page.close();
  return { missionKey, targetKey };
};

const holdTouchControl = async (page, locator, durationMs = 700) => {
  const box = await locator.boundingBox();
  if (!box) fail('Touch control is not visible');
  await locator.dispatchEvent('pointerdown', {
    bubbles: true,
    button: 0,
    buttons: 1,
    isPrimary: true,
    pointerId: 1,
    pointerType: 'touch',
  });
  await page.waitForTimeout(durationMs);
  await locator.dispatchEvent('pointerup', {
    bubbles: true,
    button: 0,
    buttons: 0,
    isPrimary: true,
    pointerId: 1,
    pointerType: 'touch',
  });
};

const assertNoErrors = (pageErrors, label) => {
  if (pageErrors.length) fail(`Browser console errors during ${label}`, { errors: pageErrors });
};

const boxesOverlap = (a, b) =>
  a && b && a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

const assertNoElementOverlap = async (page, first, second, label) => {
  const firstBox = await first.boundingBox();
  const secondBox = await second.boundingBox();
  if (!firstBox || !secondBox) fail(`Missing element box during ${label}`, { firstBox, secondBox });
  if (boxesOverlap(firstBox, secondBox)) {
    fail(`Unexpected element overlap during ${label}`, { firstBox, secondBox });
  }
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
    await rm(screenshotsDir, { force: true, recursive: true });
    await mkdir(screenshotsDir, { recursive: true });
    await waitForServer(baseUrl);
    browser = await chromium.launch({
      args: ['--ignore-gpu-blocklist', '--use-gl=swiftshader'],
      headless: true,
    });

    const routeResults = [];
    const defaultState = makeDefaultState();
    const { page: homePage, pageErrors: homeErrors } = await newSeededPage(browser, defaultState);
    const homeReady = await waitForHub(homePage, 'desktop home hub');
    await homePage.waitForSelector('[data-testid="world-control-hints"][data-onboarding-step="drive"]', {
      timeout: 5000,
    });
    const driveHintText = await homePage.getByTestId('world-control-hints').textContent();
    if (!/S\/Down Brake/i.test(driveHintText || '') || !/Space Drift/i.test(driveHintText || '')) {
      fail('Drive onboarding hint did not expose brake and drift controls', { driveHintText });
    }
    const beforeDrive = await waitForFpsTelemetry(homePage, 'desktop before drive');
    const desktopHubScreenshot = await captureHubScreenshot(homePage, 'playable-hub-desktop.png');
    assertPerformanceTelemetry(beforeDrive, 'desktop before drive', homeReady);
    if (beforeDrive.activeDestinationKey !== 'gym' || beforeDrive.activeMissionKey !== 'course') {
      fail('Default mission beacon must point to Gym workout first', { telemetry: beforeDrive });
    }
    if (
      beforeDrive.routeGuideTargetKey !== 'gym' ||
      beforeDrive.routeGuideActiveKey !== 'gym' ||
      Number(beforeDrive.routeGuideIntensity) <= 0.25
    ) {
      fail('Default mission route guide must be visible before arrival', { telemetry: beforeDrive });
    }
    await homePage.keyboard.down('ArrowDown');
    await homePage.waitForTimeout(700);
    const reverseTelemetry = await readTelemetry(homePage, 'desktop brake reverse');
    await homePage.keyboard.up('ArrowDown');
    if (Number(reverseTelemetry.playerForwardSpeed) >= -0.05) {
      fail('Keyboard brake/reverse did not produce reverse forward speed', { reverseTelemetry });
    }
    await homePage.waitForTimeout(250);
    await homePage.keyboard.down('ArrowUp');
    await homePage.waitForTimeout(900);
    await homePage.keyboard.up('ArrowUp');
    await homePage.waitForTimeout(150);
    const afterDrive = await readTelemetry(homePage, 'desktop after drive');
    if (Number(afterDrive.playerSpeed) <= Number(beforeDrive.playerSpeed)) {
      fail('Keyboard driving did not increase player speed', { afterDrive, beforeDrive });
    }
    await homePage.keyboard.down('ArrowUp');
    await homePage.keyboard.down('ArrowRight');
    await homePage.keyboard.down('Space');
    await homePage.waitForTimeout(1100);
    const driftTelemetry = await readTelemetry(homePage, 'desktop space drift');
    await homePage.keyboard.up('Space');
    await homePage.keyboard.up('ArrowRight');
    await homePage.keyboard.up('ArrowUp');
    if (driftTelemetry.playerDriftActive !== 'true' || Number(driftTelemetry.playerDriftCharge) <= 0) {
      fail('Space did not activate hub hop/drift telemetry', { driftTelemetry });
    }
    await homePage.waitForFunction(
      (storageKey) => {
        const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
        const spawn = state?.game?.hub?.lastSpawn;
        return Math.hypot((spawn?.x || 0) - 0, (spawn?.z || 0) - -42) > 1;
      },
      STORAGE_KEY,
      { timeout: 8000 }
    );
    await homePage.waitForSelector('[data-testid="world-control-hints"][data-onboarding-step="portal"]', {
      timeout: 5000,
    });
    const savedSpawn = await homePage.evaluate((storageKey) => {
      const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return state.game?.hub?.lastSpawn;
    }, STORAGE_KEY);
    assertNoErrors(homeErrors, 'home keyboard drive');
    await homePage.close();

    const { page: debugPage, pageErrors: debugErrors } = await newSeededPage(browser, makeOnboardedState());
    await waitForDebugHub(debugPage);
    const debugTelemetry = await readTelemetry(debugPage, 'debug overlay hub');
    if (
      debugTelemetry.debugOverlayEnabled !== 'true' ||
      Number(debugTelemetry.debugCollisionBoxCount) < 2 ||
      Number(debugTelemetry.debugPortalCount) < 7 ||
      Number(debugTelemetry.debugBoostPadCount) < 4
    ) {
      fail('Hub debug overlay did not expose collision, portal, and boost pad telemetry', {
        telemetry: debugTelemetry,
      });
    }
    assertNoErrors(debugErrors, 'hub debug overlay');
    await debugPage.close();

    const { page: metricsPage, pageErrors: metricsErrors } = await newSeededPage(browser, defaultState);
    await waitForHub(metricsPage, 'hub metrics start');
    await metricsPage.waitForFunction(
      (storageKey) => {
        const metrics = JSON.parse(localStorage.getItem(storageKey) || '{}')?.game?.hub?.metrics || {};
        return Number(metrics.citySessions) >= 1;
      },
      STORAGE_KEY,
      { timeout: 8000 }
    );
    await metricsPage.getByTestId('world-destination-food').click();
    await metricsPage.waitForSelector('text=Daily fuel', { timeout: 15000 });
    await metricsPage.waitForFunction(
      (storageKey) => {
        const metrics = JSON.parse(localStorage.getItem(storageKey) || '{}')?.game?.hub?.metrics || {};
        return (
          Number(metrics.districtEntriesFromCity) === 1 &&
          metrics.lastDistrictKey === 'food' &&
          Number(metrics.lastFirstActionMs) > 0
        );
      },
      STORAGE_KEY,
      { timeout: 8000 }
    );
    await metricsPage.getByRole('button', { name: 'City' }).click();
    await metricsPage.waitForSelector('[data-testid="world-scene-canvas"][data-telemetry-ready="true"]', {
      timeout: 15000,
    });
    await metricsPage.getByTestId('world-destination-raceway').click();
    await metricsPage.waitForSelector('canvas[data-visual-canvas="race"]', { timeout: 15000 });
    await metricsPage.waitForFunction(
      (storageKey) => {
        const metrics = JSON.parse(localStorage.getItem(storageKey) || '{}')?.game?.hub?.metrics || {};
        return (
          Number(metrics.districtEntriesFromCity) === 2 &&
          metrics.lastDistrictKey === 'raceway' &&
          Number(metrics.raceStartsFromCity) === 1
        );
      },
      STORAGE_KEY,
      { timeout: 8000 }
    );
    const hubMetrics = await metricsPage.evaluate((storageKey) => {
      const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return state.game?.hub?.metrics || {};
    }, STORAGE_KEY);
    assertNoErrors(metricsErrors, 'hub metrics');
    await metricsPage.close();

    const { page: returnMetricsPage, pageErrors: returnMetricsErrors } = await newSeededPage(
      browser,
      makeReturnSessionState()
    );
    await waitForHub(returnMetricsPage, 'return session metrics hub');
    await returnMetricsPage.waitForFunction(
      (storageKey) => {
        const metrics = JSON.parse(localStorage.getItem(storageKey) || '{}')?.game?.hub?.metrics || {};
        return (
          Number(metrics.citySessions) === 2 &&
          Number(metrics.returnSessions) === 1 &&
          metrics.firstCitySessionAt === '2026-05-17T12:00:00.000Z' &&
          typeof metrics.lastCitySessionAt === 'string' &&
          metrics.lastCitySessionAt !== metrics.firstCitySessionAt
        );
      },
      STORAGE_KEY,
      { timeout: 8000 }
    );
    const returnHubMetrics = await returnMetricsPage.evaluate((storageKey) => {
      const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return state.game?.hub?.metrics || {};
    }, STORAGE_KEY);
    assertNoErrors(returnMetricsErrors, 'hub return-session metrics');
    await returnMetricsPage.close();

    const { page: landmarkPage, pageErrors: landmarkErrors } = await newSeededPage(browser, makeOnboardedState());
    await waitForHub(landmarkPage, '3D landmark click hub');
    await landmarkPage.waitForFunction(() => {
      const point = window.__comebackCityHubTelemetry?.destinationScreenPoints?.food;
      return point?.visible && Number.isFinite(point.x) && Number.isFinite(point.y);
    }, { timeout: 15000 });
    const runtimeTelemetry = await readRuntimeTelemetry(landmarkPage, '3D landmark click');
    const foodPoint = runtimeTelemetry.destinationScreenPoints.food;
    const canvasBox = await landmarkPage.getByTestId('world-scene-canvas').boundingBox();
    if (!canvasBox) fail('World canvas missing before landmark click');
    await landmarkPage.mouse.click(canvasBox.x + foodPoint.x, canvasBox.y + foodPoint.y);
    await landmarkPage.waitForSelector('text=Daily fuel', { timeout: 15000 });
    assertNoErrors(landmarkErrors, '3D landmark click');
    await landmarkPage.close();

    const missionBeaconResults = [
      { missionKey: beforeDrive.activeMissionKey, targetKey: beforeDrive.activeDestinationKey },
    ];
    for (const [targetKey, missionKey] of [
      ['food', 'fuel'],
      ['lab', 'calibration'],
      ['clinic', 'recovery'],
      ['home', 'metrics'],
      ['raceway', 'race-reward'],
    ]) {
      missionBeaconResults.push(await assertMissionBeacon(browser, targetKey, missionKey));
    }

    const { page: spawnPage, pageErrors: spawnErrors } = await newSeededPage(browser, makeSpawnState());
    await waitForHub(spawnPage, 'seeded spawn hub');
    const spawnTelemetry = await readTelemetry(spawnPage, 'seeded spawn');
    if (
      Math.abs(Number(spawnTelemetry.playerX) - 22) > 0.75 ||
      Math.abs(Number(spawnTelemetry.playerZ) - 0) > 0.75 ||
      Math.abs(Number(spawnTelemetry.playerHeading) - 0.42) > 0.08
    ) {
      fail('Hub did not restore persisted player spawn', { telemetry: spawnTelemetry });
    }
    assertNoErrors(spawnErrors, 'seeded spawn');
    await spawnPage.close();

    const { page: nearbyPage, pageErrors: nearbyErrors } = await newSeededPage(
      browser,
      makePortalSpawnState({ heading: 0, x: 34, z: -22 })
    );
    await waitForHub(nearbyPage, 'nearby keyboard hub');
    await nearbyPage.waitForSelector('[data-testid="world-scene-canvas"][data-nearby-destination-key="food"]', {
      timeout: 15000,
    });
    await nearbyPage.waitForSelector('[data-testid="world-control-hints"][data-onboarding-step="enter"]', {
      timeout: 5000,
    });
    await nearbyPage.keyboard.down('KeyE');
    await nearbyPage.keyboard.up('KeyE');
    await nearbyPage.waitForSelector('text=Daily fuel', { timeout: 15000 });
    assertNoErrors(nearbyErrors, 'nearby keyboard enter');
    await nearbyPage.close();

    const { page: routeGuidePage, pageErrors: routeGuideErrors } = await newSeededPage(
      browser,
      makeMissionPortalState('food', { heading: 0, x: 34, z: -22 })
    );
    await waitForHub(routeGuidePage, 'route guide arrival hub');
    await routeGuidePage.waitForSelector(
      '[data-testid="world-scene-canvas"][data-active-destination-key="food"][data-nearby-destination-key="food"][data-route-guide-arrived-key="food"]',
      { timeout: 15000 }
    );
    const routeGuideArrival = await readTelemetry(routeGuidePage, 'route guide arrival');
    if (
      routeGuideArrival.routeGuideTargetKey !== 'food' ||
      routeGuideArrival.routeGuideArrivedKey !== 'food' ||
      routeGuideArrival.routeGuideActiveKey ||
      Number(routeGuideArrival.routeGuideIntensity) > 0.12
    ) {
      fail('Mission route guide did not fade after arrival at the target portal', { routeGuideArrival });
    }
    assertNoErrors(routeGuideErrors, 'route guide arrival');
    await routeGuidePage.close();

    const { page: helpPage, pageErrors: helpErrors } = await newSeededPage(browser, makeOnboardedState());
    await waitForHub(helpPage, 'onboarding help hub');
    if (await helpPage.locator('[data-testid="world-control-hints"]').count()) {
      fail('Onboarding hints should stay hidden after completion', {
        text: await helpPage.locator('[data-testid="world-control-hints"]').textContent().catch(() => ''),
      });
    }
    await helpPage.getByTestId('world-help-button').click();
    await helpPage.waitForSelector('[data-testid="world-control-hints"][data-onboarding-step="drive"]', {
      timeout: 5000,
    });
    await helpPage.waitForFunction(
      (storageKey) => {
        const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
        return state?.game?.hub?.onboardingSeen === false;
      },
      STORAGE_KEY,
      { timeout: 5000 }
    );
    assertNoErrors(helpErrors, 'onboarding help');
    await helpPage.close();

    const { page: cosmeticPage, pageErrors: cosmeticErrors } = await newSeededPage(browser, makeGarageUpgradeState());
    await waitForHub(cosmeticPage, 'garage cosmetic controls hub');
    await cosmeticPage.getByTestId('world-destination-garage').click();
    await cosmeticPage.waitForSelector('text=City Garage', { timeout: 15000 });
    const garageCreditsBefore = Number(await cosmeticPage.getByTestId('garage-race-credits').textContent());
    if (!Number.isFinite(garageCreditsBefore) || garageCreditsBefore < 140) {
      fail('Garage upgrade smoke state did not expose enough race credits', { garageCreditsBefore });
    }
    await cosmeticPage.getByTestId('garage-upgrade-engine').click();
    await cosmeticPage.waitForFunction(
      (storageKey) => {
        const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
        return (
          state?.game?.raceGarage?.upgrades?.engine === 1 &&
          Number(state?.game?.raceGarage?.spentCredits) >= 140
        );
      },
      STORAGE_KEY,
      { timeout: 8000 }
    );
    await cosmeticPage.getByTestId('garage-paint-rift').click();
    await cosmeticPage.getByTestId('garage-trail-purple').click();
    await cosmeticPage.getByTestId('garage-banner-neon').click();
    await cosmeticPage.getByTestId('garage-reduced-motion').check();
    await cosmeticPage.waitForFunction(
      (storageKey) => {
        const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
        const hub = state?.game?.hub || {};
        const cosmetics = state?.game?.hub?.cosmetics || {};
        return (
          hub.reducedMotion === true &&
          cosmetics.kartPaint === 'rift' &&
          cosmetics.trailColor === '#c879ff' &&
          cosmetics.bannerSet === 'neon'
        );
      },
      STORAGE_KEY,
      { timeout: 8000 }
    );
    await cosmeticPage.getByRole('button', { name: 'City' }).click();
    await cosmeticPage.waitForSelector('[data-testid="playable-world-home"]', { timeout: 15000 });
    await cosmeticPage.waitForSelector('[data-testid="world-scene-canvas"][data-telemetry-ready="true"]', {
      timeout: 15000,
    });
    const cosmeticTelemetry = await readTelemetry(cosmeticPage, 'hub cosmetics');
    if (
      cosmeticTelemetry.hubKartPaint !== 'rift' ||
      cosmeticTelemetry.hubKartPaintColor !== '#9b5de5' ||
      cosmeticTelemetry.hubTrailColor !== '#c879ff' ||
      cosmeticTelemetry.hubBannerSet !== 'neon' ||
      cosmeticTelemetry.reducedMotion !== 'true'
    ) {
      fail('Garage cosmetics were not applied to playable world telemetry', { telemetry: cosmeticTelemetry });
    }
    const garageUpgradeState = await cosmeticPage.evaluate((storageKey) => {
      const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return state.game?.raceGarage || {};
    }, STORAGE_KEY);
    assertNoErrors(cosmeticErrors, 'hub cosmetics');
    await cosmeticPage.close();

    const { page: mobilePage, pageErrors: mobileErrors } = await newSeededPage(browser, defaultState, {
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: true,
      viewport: { height: 844, width: 390 },
    });
    await mobilePage.emulateMedia({ reducedMotion: 'reduce' });
    await waitForHub(mobilePage, 'mobile hub');
    await mobilePage.waitForSelector('.world-touch-controls [aria-label="Accelerate"]', { timeout: 10000 });
    const beforeTouch = await waitForFpsTelemetry(mobilePage, 'mobile before touch');
    await assertNoElementOverlap(
      mobilePage,
      mobilePage.getByTestId('world-mission-panel'),
      mobilePage.getByRole('button', { name: /Race GP/i }),
      'mobile mission panel and top route controls'
    );
    const mobileHubScreenshot = await captureHubScreenshot(mobilePage, 'playable-hub-mobile.png');
    if (beforeTouch.reducedMotion !== 'true' || beforeTouch.viewportMobile !== 'true') {
      fail('Mobile hub did not expose reduced-motion mobile telemetry', { telemetry: beforeTouch });
    }
    await holdTouchControl(mobilePage, mobilePage.getByLabel('Accelerate'), 700);
    await mobilePage.waitForTimeout(150);
    const afterTouch = await readTelemetry(mobilePage, 'mobile after touch');
    if (Number(afterTouch.playerSpeed) <= Number(beforeTouch.playerSpeed)) {
      fail('Touch acceleration did not increase player speed', { afterTouch, beforeTouch });
    }
    await holdTouchControl(mobilePage, mobilePage.getByLabel('Brake or reverse'), 800);
    await mobilePage.waitForTimeout(150);
    const afterTouchBrake = await readTelemetry(mobilePage, 'mobile brake reverse');
    if (Number(afterTouchBrake.playerForwardSpeed) >= Number(afterTouch.playerForwardSpeed)) {
      fail('Touch brake/reverse did not reduce forward speed', { afterTouch, afterTouchBrake });
    }
    await mobilePage.locator('.world-mobile-go').click();
    await mobilePage.waitForSelector('text=Heavy Squat Day', { timeout: 15000 });
    assertNoErrors(mobileErrors, 'mobile touch drive');
    await mobilePage.close();

    const { page: mobileNearbyPage, pageErrors: mobileNearbyErrors } = await newSeededPage(
      browser,
      makePortalSpawnState({ heading: 0, x: 34, z: -22 }),
      {
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
        viewport: { height: 844, width: 390 },
      }
    );
    await waitForHub(mobileNearbyPage, 'mobile nearby enter hub');
    await mobileNearbyPage.waitForSelector(
      '[data-testid="world-scene-canvas"][data-nearby-destination-key="food"]',
      { timeout: 15000 }
    );
    await mobileNearbyPage.getByLabel('Enter nearby destination').dispatchEvent('pointerdown', {
      bubbles: true,
      button: 0,
      buttons: 1,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });
    await mobileNearbyPage.waitForSelector('text=Daily fuel', { timeout: 15000 });
    assertNoErrors(mobileNearbyErrors, 'mobile nearby enter');
    await mobileNearbyPage.close();

    const entries = [
      { key: 'gym', selector: 'text=Heavy Squat Day' },
      { key: 'food', selector: 'text=Daily fuel' },
      { key: 'home', selector: '[data-testid="home-base-recap"]' },
      { key: 'lab', selector: 'text=Calibration protocol' },
      { key: 'clinic', selector: 'text=Joint protection' },
      { key: 'garage', selector: 'text=City Garage & Body' },
      { key: 'raceway', selector: 'canvas[data-visual-canvas="race"]' },
    ];
    const fallbackSelectors = new Map([
      ...entries.map((entry) => [entry.key, entry.selector]),
      ['raceway', 'canvas[data-visual-canvas="race-fallback"]'],
    ]);

    for (const entry of entries) {
      const { page, pageErrors } = await newSeededPage(browser, defaultState);
      await waitForHub(page, `${entry.key} entry hub`);
      await page.getByTestId(`world-destination-${entry.key}`).click();
      await page.waitForSelector(entry.selector, { timeout: 15000 });
      if (entry.key !== 'raceway' && (await page.locator('[data-testid="playable-world-home"]').count())) {
        fail('District entry did not leave playable hub', { entry });
      }
      assertNoErrors(pageErrors, `${entry.key} entry`);
      routeResults.push(entry.key);
      await page.close();
    }

    const { page: visualPage, pageErrors: visualErrors } = await newSeededPage(browser, defaultState);
    await visualPage.goto(`${baseUrl}/#visual-plaza`, { waitUntil: 'domcontentloaded' });
    await visualPage.waitForSelector('[data-visual-section="desktop-plaza"]', { timeout: 15000 });
    if (await visualPage.locator('[data-testid="playable-world-home"]').count()) {
      fail('Visual plaza route rendered the playable home');
    }
    assertNoErrors(visualErrors, 'visual reference route');
    await visualPage.close();

    const fallbackResults = [];
    for (const entry of entries) {
      const { page: fallbackPage, pageErrors: fallbackErrors } = await newSeededPage(browser, defaultState);
      await fallbackPage.addInitScript(() => {
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function patchedGetContext(type, ...args) {
          if (['webgl', 'webgl2', 'experimental-webgl'].includes(String(type))) return null;
          return originalGetContext.call(this, type, ...args);
        };
      });
      await waitForFallbackHub(fallbackPage, `${entry.key} forced WebGL fallback hub`, fallbackErrors);
      await fallbackPage.getByTestId(`fallback-destination-${entry.key}`).click();
      await fallbackPage.waitForSelector(fallbackSelectors.get(entry.key), { timeout: 15000 });
      if (entry.key !== 'raceway' && (await fallbackPage.locator('[data-testid="playable-world-home"]').count())) {
        fail('Fallback district entry did not leave playable hub', { entry });
      }
      assertNoErrors(fallbackErrors, `${entry.key} fallback world navigation`);
      fallbackResults.push(entry.key);
      await fallbackPage.close();
    }

    const { page: raceFeedbackPage, pageErrors: raceFeedbackErrors } = await newSeededPage(
      browser,
      makeRaceResultState()
    );
    await waitForHub(raceFeedbackPage, 'race result feedback hub');
    await raceFeedbackPage.waitForSelector('[data-testid="world-reward-pulse"]', { timeout: 15000 });
    const raceFeedbackTelemetry = await readTelemetry(raceFeedbackPage, 'race result feedback');
    const racewayFeedback = raceFeedbackTelemetry.districtFeedback.find((item) => item.key === 'raceway');
    if (!racewayFeedback?.complete || racewayFeedback.progressPct !== 100 || racewayFeedback.state !== 'complete') {
      fail('Race result did not feed back into Raceway district state', {
        feedback: raceFeedbackTelemetry.districtFeedback,
      });
    }
    await raceFeedbackPage.waitForFunction(
      (storageKey) => {
        const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
        return state?.game?.hub?.completedHubActions?.includes('raceway-results-1-1-1');
      },
      STORAGE_KEY,
      { timeout: 15000 }
    );
    assertNoErrors(raceFeedbackErrors, 'race result feedback');
    await raceFeedbackPage.close();

    const { page: progressPage, pageErrors: progressErrors } = await newSeededPage(browser, makeProgressState());
    await waitForHub(progressPage, 'progress feedback hub');
    await progressPage.waitForSelector('[data-testid="world-reward-pulse"]', { timeout: 15000 });
    const rewardPulse = await progressPage.locator('[data-testid="world-reward-pulse"]').evaluate((element) => ({
      actionCount: Number(element.dataset.actionCount || 0),
      nextDestinationKey: element.dataset.nextDestinationKey,
      nextMissionKey: element.dataset.nextMissionKey,
      text: element.textContent,
      xpDelta: Number(element.dataset.xpDelta || 0),
    }));
    if (rewardPulse.xpDelta <= 0 || rewardPulse.actionCount < 3) {
      fail('Return-to-city reward pulse did not summarize tracker progress', { rewardPulse });
    }
    if (
      rewardPulse.nextMissionKey !== 'course' ||
      rewardPulse.nextDestinationKey !== 'gym' ||
      !rewardPulse.text.includes('Next route:')
    ) {
      fail('Daily mission completion sequence did not point to the next route', { rewardPulse });
    }
    const progressTelemetry = await readTelemetry(progressPage, 'tracker feedback');
    const feedback = new Map(progressTelemetry.districtFeedback.map((item) => [item.key, item]));
    for (const key of ['gym', 'food', 'lab']) {
      const item = feedback.get(key);
      if (!item?.complete || item.progressPct !== 100) {
        fail('Tracker progress did not feed back into a district marker', {
          feedback: progressTelemetry.districtFeedback,
          key,
        });
      }
    }
    await progressPage.waitForFunction(
      (storageKey) => {
        const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
        return (
          state?.game?.hub?.cityXp > 0 &&
          ['gym-course-1', 'food-log-1', 'lab-calibration-8'].every((key) =>
            state.game.hub.completedHubActions?.includes(key)
          )
        );
      },
      STORAGE_KEY,
      { timeout: 15000 }
    );
    assertNoErrors(progressErrors, 'tracker feedback telemetry');
    await progressPage.close();

    console.log(
      JSON.stringify(
        {
          districtEntries: routeResults,
          fallbackDistrictEntries: fallbackResults,
          keyboardSpeedBefore: beforeDrive.playerSpeed,
          keyboardSpeedAfter: afterDrive.playerSpeed,
          keyboardReverseForwardSpeed: Number(reverseTelemetry.playerForwardSpeed),
          keyboardSpaceDrift: {
            active: driftTelemetry.playerDriftActive,
            charge: Number(driftTelemetry.playerDriftCharge),
          },
          lastSpawnAfterDrive: savedSpawn,
          hubCosmetics: {
            bannerSet: cosmeticTelemetry.hubBannerSet,
            kartPaint: cosmeticTelemetry.hubKartPaint,
            kartPaintColor: cosmeticTelemetry.hubKartPaintColor,
            trailColor: cosmeticTelemetry.hubTrailColor,
          },
          garageUpgrade: {
            creditsBefore: garageCreditsBefore,
            engineLevel: Number(garageUpgradeState.upgrades?.engine),
            spentCredits: Number(garageUpgradeState.spentCredits),
          },
          inAppReducedMotion: cosmeticTelemetry.reducedMotion,
          debugOverlay: {
            boostPads: Number(debugTelemetry.debugBoostPadCount),
            collisionBoxes: Number(debugTelemetry.debugCollisionBoxCount),
            portals: Number(debugTelemetry.debugPortalCount),
          },
          hubMetrics: {
            citySessions: Number(hubMetrics.citySessions),
            districtEntriesFromCity: Number(hubMetrics.districtEntriesFromCity),
            lastDistrictKey: hubMetrics.lastDistrictKey,
            lastFirstActionMs: Number(hubMetrics.lastFirstActionMs),
            raceStartsFromCity: Number(hubMetrics.raceStartsFromCity),
            returnSessions: Number(returnHubMetrics.returnSessions),
          },
          landmarkClick: 'food',
          nearbyKeyboardEnter: 'food',
          nearbyMobileEnter: 'food',
          mobileTouchSpeedBefore: beforeTouch.playerSpeed,
          mobileTouchSpeedAfter: afterTouch.playerSpeed,
          mobileTouchBrakeForwardSpeed: Number(afterTouchBrake.playerForwardSpeed),
          missionBeacon: {
            destinationKey: beforeDrive.activeDestinationKey,
            missionKey: beforeDrive.activeMissionKey,
          },
          missionBeaconSequence: missionBeaconResults,
          onboarding: 'drive -> portal -> enter; help reopened',
          routeGuide: {
            activeKey: beforeDrive.routeGuideActiveKey,
            arrivedKey: routeGuideArrival.routeGuideArrivedKey,
            intensityAtArrival: Number(routeGuideArrival.routeGuideIntensity),
            intensityBeforeArrival: Number(beforeDrive.routeGuideIntensity),
            targetKey: beforeDrive.routeGuideTargetKey,
          },
          performanceTelemetry: {
            budget: HUB_PERFORMANCE_BUDGET,
            drawCalls: beforeDrive.drawCalls,
            fpsEstimate: beforeDrive.fpsEstimate,
            mobileFpsEstimate: beforeTouch.fpsEstimate,
            readyMs: homeReady.readyMs,
            sceneMeshCount: beforeDrive.sceneMeshCount,
            sceneObjectCount: beforeDrive.sceneObjectCount,
            triangles: beforeDrive.triangles,
          },
          playableHubScreenshots: {
            desktop: desktopHubScreenshot,
            mobile: mobileHubScreenshot,
          },
          reducedMotion: beforeTouch.reducedMotion,
          raceResultFeedback: {
            progressPct: racewayFeedback.progressPct,
            state: racewayFeedback.state,
          },
          rewardPulse: {
            actionCount: rewardPulse.actionCount,
            nextDestinationKey: rewardPulse.nextDestinationKey,
            nextMissionKey: rewardPulse.nextMissionKey,
            xpDelta: rewardPulse.xpDelta,
          },
          webglFallback: 'all district entries, including Raceway Canvas2D fallback',
          trackerFeedbackDistricts: ['gym', 'food', 'lab'],
          visualPlaza: 'reference route rendered',
        },
        null,
        2
      )
    );
  } catch (error) {
    if (serverLog) error.serverLog = serverLog.slice(-4000);
    throw error;
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
};

run().catch((error) => {
  console.error(error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  if (error.serverLog) console.error(error.serverLog);
  process.exit(1);
});
