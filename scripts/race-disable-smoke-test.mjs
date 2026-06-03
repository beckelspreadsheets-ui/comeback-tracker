import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { calcTargets } from '../src/lib/nutrition.js';
import { LIFTS, PROGRAM } from '../src/lib/program.js';
import { todayKey } from '../src/lib/foodHelpers.js';
import { makeDefaultState, STORAGE_KEY, SYNC_META_KEY } from '../src/hooks/usePersistedState.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.RACE_DISABLE_SMOKE_PORT || 5193);
const baseUrl = `http://127.0.0.1:${port}`;

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

const completeCurrentWeekWorkouts = (state) => {
  const currentWeek = Number(state.currentWeek) || 1;
  state.logs = { ...state.logs };
  PROGRAM.forEach((dayData) => {
    state.logs[`w${currentWeek}d${dayData.day}`] = completedDayLog(dayData);
  });
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
            id: 'race-disable-smoke-meal',
            name: 'Race disable smoke meal',
            p: targets.protein,
            unit: 'serving',
          },
        ],
        dinner: [],
        lunch: [],
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

const makeRaceRewardState = () => {
  const state = makeDefaultState();
  completeCurrentWeekWorkouts(state);
  completeFoodForToday(state);
  completeCalibration(state);
  completeMetrics(state);
  state.game = {
    ...state.game,
    raceResults: {
      'tide-pier': {
        bestPlace: 1,
        podiums: 1,
        runs: 1,
        wins: 1,
      },
    },
  };
  return state;
};

const seedTrackerState = async (page, state = makeDefaultState()) => {
  await page.route('**/api/sync/**', async (route) => {
    const url = new URL(route.request().url());
    const now = new Date().toISOString();
    if (url.pathname.endsWith('/me')) {
      await route.fulfill({
        body: JSON.stringify({
          profiles: [
            {
              displayName: 'Race Disable Smoke',
              hasState: false,
              userId: 'race-disable-smoke',
            },
          ],
          user: {
            canView: ['race-disable-smoke'],
            displayName: 'Race Disable Smoke',
            userId: 'race-disable-smoke',
          },
        }),
        contentType: 'application/json',
        status: 200,
      });
      return;
    }
    if (route.request().method() === 'PUT') {
      await route.fulfill({
        body: JSON.stringify({ rev: 1, updatedAt: now, userId: 'race-disable-smoke' }),
        contentType: 'application/json',
        status: 200,
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({ rev: null, state: null, updatedAt: null, userId: 'race-disable-smoke' }),
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
};

const run = async () => {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const server = spawn(npm, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    env: {
      ...process.env,
      BROWSER: 'none',
      VITE_RACE_DISABLED: 'true',
      VITE_RACE_DISABLED_REASON: 'Race disabled smoke test.',
    },
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
    await waitForServer(baseUrl);
    browser = await chromium.launch({
      args: ['--ignore-gpu-blocklist', '--use-gl=swiftshader'],
      headless: true,
    });
    const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(message.text());
    });
    await seedTrackerState(page);

    await page.goto(`${baseUrl}/#race`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="race-disabled-screen"]', { timeout: 15000 });
    const disabledScreenText = await page.getByTestId('race-disabled-screen').textContent();

    const directRaceCanvasCount = await page.locator('canvas[data-visual-canvas="race"]').count();
    const directFallbackCanvasCount = await page.locator('canvas[data-visual-canvas="race-fallback"]').count();
    if (directRaceCanvasCount || directFallbackCanvasCount) {
      fail('Disabled race route mounted a race canvas', {
        directFallbackCanvasCount,
        directRaceCanvasCount,
      });
    }

    await page.getByRole('button', { name: /Back to today/i }).click();
    await page.waitForSelector('[data-testid="playable-world-home"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="world-scene-canvas"][data-telemetry-ready="true"]', {
      timeout: 15000,
    });

    const raceNavCount = await page.getByRole('button', { name: /^Race$/i }).count();
    const raceGpButtonCount = await page.getByRole('button', { name: /Race GP/i }).count();
    const worldDestinationCount = await page.locator('[data-testid="world-destination-raceway"]').count();
    const shellDestinationCount = await page.locator('[data-testid="shell-destination-raceway"]').count();
    const telemetry = await page.locator('[data-testid="world-scene-canvas"]').evaluate((canvas) => ({
      districtFeedback: JSON.parse(canvas.dataset.districtFeedback || '[]'),
      nearbyDestinationKey: canvas.dataset.nearbyDestinationKey || '',
    }));
    const raceFeedbackCount = telemetry.districtFeedback.filter((item) => item.key === 'raceway').length;

    if (raceNavCount || raceGpButtonCount || worldDestinationCount || shellDestinationCount || raceFeedbackCount) {
      fail('Disabled race entry point remained visible', {
        raceFeedbackCount,
        raceGpButtonCount,
        raceNavCount,
        shellDestinationCount,
        worldDestinationCount,
      });
    }

    const rewardPage = await browser.newPage({ viewport: { height: 900, width: 1440 } });
    const rewardPageErrors = [];
    rewardPage.on('pageerror', (error) => rewardPageErrors.push(error.message));
    rewardPage.on('console', (message) => {
      if (message.type() === 'error') rewardPageErrors.push(message.text());
    });
    await seedTrackerState(rewardPage, makeRaceRewardState());
    await rewardPage.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await rewardPage.waitForSelector('[data-testid="playable-world-home"]', { timeout: 15000 });
    await rewardPage.waitForSelector('[data-testid="world-scene-canvas"][data-telemetry-ready="true"]', {
      timeout: 15000,
    });
    const raceRewardTelemetry = await rewardPage.locator('[data-testid="world-scene-canvas"]').evaluate((canvas) => ({
      activeDestinationKey: canvas.dataset.activeDestinationKey || '',
      activeMissionKey: canvas.dataset.activeMissionKey || '',
      districtFeedback: JSON.parse(canvas.dataset.districtFeedback || '[]'),
    }));
    const rewardPulseRaceTargetCount = await rewardPage
      .locator('[data-testid="world-reward-pulse"][data-next-destination-key="raceway"]')
      .count();
    const rewardMissionRaceCount = raceRewardTelemetry.districtFeedback.filter((item) => item.key === 'raceway').length;
    if (
      raceRewardTelemetry.activeDestinationKey === 'raceway' ||
      raceRewardTelemetry.activeMissionKey === 'race-reward' ||
      rewardMissionRaceCount ||
      rewardPulseRaceTargetCount
    ) {
      fail('Disabled race reward state still targeted the raceway', {
        raceRewardTelemetry,
        rewardMissionRaceCount,
        rewardPulseRaceTargetCount,
      });
    }
    if (rewardPageErrors.length) {
      fail('Browser console errors during disabled race reward smoke', { errors: rewardPageErrors });
    }
    await rewardPage.close();
    if (pageErrors.length) fail('Browser console errors during race disable smoke', { errors: pageErrors });

    console.log(
      JSON.stringify(
        {
          disabledReasonVisible: /Race disabled smoke test\./i.test(disabledScreenText || ''),
          directFallbackCanvasCount,
          directRaceCanvasCount,
          raceFeedbackCount,
          raceGpButtonCount,
          raceRewardActiveDestinationKey: raceRewardTelemetry.activeDestinationKey,
          raceRewardActiveMissionKey: raceRewardTelemetry.activeMissionKey,
          rewardMissionRaceCount,
          rewardPulseRaceTargetCount,
          raceNavCount,
          shellDestinationCount,
          status: 'ok',
          worldDestinationCount,
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
