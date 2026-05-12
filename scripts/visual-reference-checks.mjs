import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.VISUAL_CHECK_PORT || 5190);
const baseUrl = `http://127.0.0.1:${port}`;
const screenshotsDir = path.join(root, 'tmp', 'visual-reference-checks');

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

const assertCanvasNonblank = async (page, label) => {
  await page.waitForSelector('canvas', { timeout: 15000 });
  const dataUrlLength = await page.$eval('canvas', (canvas) => canvas.toDataURL('image/png').length);
  if (dataUrlLength < 1800) fail(`${label} canvas rendered blank`, { dataUrlLength });
};

const assertCanvasFrame = async (page, label, { maxTop = Infinity, minHeight = 1, minWidth = 1 }) => {
  const box = await page.locator('canvas').first().boundingBox();
  if (!box) fail(`${label} canvas is not measurable`);
  if (box.width < minWidth || box.height < minHeight || box.y > maxTop) {
    fail(`${label} canvas is not framed as the primary viewport`, { box, maxTop, minHeight, minWidth });
  }
};

const assertVisible = async (page, selector, label) => {
  const locator = page.locator(selector);
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    if (await locator.nth(index).isVisible()) return;
  }
  fail(`${label} is not visible`, { count, selector });
};

const waitForRaceTelemetry = async (page, label) => {
  await page.waitForFunction(() => window.__raceVisualTelemetry?.trackKey === 'comeback-city', null, {
    timeout: 15000,
  });
  const telemetry = await page.evaluate(() => window.__raceVisualTelemetry);
  if (!telemetry) fail(`${label} race visual telemetry is missing`);
  return telemetry;
};

const assertHudDoesNotCoverRouteCenter = async (page, label) => {
  const result = await page.evaluate(() => {
    const viewport = { height: window.innerHeight, width: window.innerWidth };
    const protectedRect = {
      bottom: viewport.height * 0.72,
      left: viewport.width * 0.32,
      right: viewport.width * 0.68,
      top: viewport.height * 0.32,
    };
    const selectors = ['.race-objective-card', '.currency-stack', '.race-minimap', '.arcade-go-button'];
    const overlaps = selectors.flatMap((selector) =>
      [...document.querySelectorAll(selector)]
        .filter((node) => {
          const style = window.getComputedStyle(node);
          if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return false;
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map((node) => {
          const rect = node.getBoundingClientRect();
          const overlap = !(
            rect.right < protectedRect.left ||
            rect.left > protectedRect.right ||
            rect.bottom < protectedRect.top ||
            rect.top > protectedRect.bottom
          );
          return { overlap, rect: { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top }, selector };
        })
        .filter((entry) => entry.overlap)
    );
    return { overlaps, protectedRect, viewport };
  });
  if (result.overlaps.length) fail(`${label} HUD overlaps the protected route center`, result);
};

const assertRaceVisualTelemetry = async (page, label, {
  expectBranch = false,
  expectDrift = false,
  expectOffroad = false,
  profile,
} = {}) => {
  const telemetry = await waitForRaceTelemetry(page, label);
  if (telemetry.assetLoadState?.state !== 'procedural-ready') {
    fail(`${label} asset load state is not ready`, { assetLoadState: telemetry.assetLoadState });
  }
  if (!telemetry.kartOnly) fail(`${label} did not report kart-only V2 telemetry`, telemetry);
  if ((telemetry.cameraClipCount || 0) !== 0) fail(`${label} camera clipping was detected`, telemetry);
  if ((telemetry.roadAheadCoverage?.value || 0) < 0.24) fail(`${label} road-ahead coverage is too low`, telemetry);
  if (!Number.isFinite(telemetry.nearestCollisionDistance) || telemetry.nearestCollisionDistance <= 0) {
    fail(`${label} kart entered or touched a collision zone`, telemetry);
  }
  if (expectBranch && !telemetry.branchVisibleSeen && (telemetry.visibleBranchCount || 0) < 1) {
    fail(`${label} did not expose a visible upcoming branch`, telemetry);
  }
  if (expectOffroad && !telemetry.offroadSlowdownSeen) fail(`${label} did not record off-road slowdown`, telemetry);
  if (
    expectDrift &&
    (telemetry.driftTier || telemetry.driftTierSeen || 0) < 1 &&
    (telemetry.boostTimer || 0) <= 0 &&
    !telemetry.boostSeen
  ) {
    fail(`${label} did not record drift charge or release boost`, telemetry);
  }
  if (profile) {
    const coverage = telemetry.kartScreenCoverage?.heightRatio;
    const centerY = telemetry.kartScreenCoverage?.centerYRatio;
    const target = profile === 'mobile' ? [0.24, 0.33] : [0.14, 0.22];
    if (!Number.isFinite(coverage) || coverage < target[0] || coverage > target[1] || centerY < 0.58) {
      fail(`${label} kart framing is outside the ${profile} target`, { centerY, coverage, target, telemetry });
    }
  }
  await assertHudDoesNotCoverRouteCenter(page, label);
  return telemetry;
};

const assertNoForbiddenBackdropUsage = async () => {
  const sceneFiles = [
    path.join(root, 'src/game/ArcadeRace3D.jsx'),
    path.join(root, 'src/game/WorldScene.jsx'),
  ];
  for (const file of sceneFiles) {
    const source = await readFile(file, 'utf8');
    const forbidden = [
      'comeback-city-race-backdrop',
      'city-skyline-backdrop',
      'raceBackdrop',
      'citySkylineBackdrop',
      'PlaneGeometry(720, 232)',
      'PlaneGeometry(382, 215)',
    ].filter((pattern) => source.includes(pattern));
    if (forbidden.length) {
      fail('Forbidden large backdrop usage is present in a live scene file', {
        file: path.relative(root, file),
        forbidden,
      });
    }
  }
};

const screenshotPage = async (browser, {
  name,
  pathName,
  setup,
  url,
  viewport,
}) => {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error' && !text.includes('the server responded with a status of 404')) {
      errors.push(text);
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await setup?.(page);
  await page.waitForTimeout(1000);
  await page.screenshot({
    fullPage: false,
    path: path.join(screenshotsDir, pathName),
  });
  if (errors.length) fail(`${name} reported browser errors`, { errors });
  await page.close();
};

const run = async () => {
  await mkdir(screenshotsDir, { recursive: true });
  await assertNoForbiddenBackdropUsage();

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
    await waitForServer(baseUrl);
    browser = await chromium.launch({
      args: ['--ignore-gpu-blocklist', '--use-gl=swiftshader'],
      headless: true,
    });

    await screenshotPage(browser, {
      name: 'desktop plaza',
      pathName: 'desktop-plaza-1440x900.png',
      url: `${baseUrl}/`,
      viewport: { height: 900, width: 1440 },
      setup: async (page) => {
        await assertCanvasNonblank(page, 'desktop plaza');
        await assertCanvasFrame(page, 'desktop plaza', { maxTop: 180, minHeight: 560, minWidth: 1280 });
        await assertVisible(page, '[data-visual-section="district-closeups"]', 'district closeup strip');
        await assertVisible(page, '.world-destination-button', 'district route HUD');
      },
    });

    await screenshotPage(browser, {
      name: 'mobile game',
      pathName: 'mobile-race-start-390x844.png',
      url: `${baseUrl}/#race`,
      viewport: { height: 844, isMobile: true, width: 390 },
      setup: async (page) => {
        await assertCanvasNonblank(page, 'mobile game');
        await assertCanvasFrame(page, 'mobile game', { maxTop: 180, minHeight: 760, minWidth: 380 });
        await assertVisible(page, '.race-objective-card', 'mobile objective card');
        await assertVisible(page, '.currency-stack', 'mobile currency stack');
        await assertVisible(page, '.race-minimap', 'mobile minimap');
        await assertVisible(page, '.arcade-go-button', 'mobile GO button');
        await assertRaceVisualTelemetry(page, 'mobile race start', { profile: 'mobile' });
      },
    });

    await screenshotPage(browser, {
      name: 'mobile race after movement',
      pathName: 'mobile-race-moving-390x844.png',
      url: `${baseUrl}/#race`,
      viewport: { height: 844, isMobile: true, width: 390 },
      setup: async (page) => {
        await assertCanvasNonblank(page, 'mobile game after movement');
        await assertCanvasFrame(page, 'mobile game after movement', { maxTop: 40, minHeight: 820, minWidth: 380 });
        await page.keyboard.down('ArrowUp');
        await page.waitForTimeout(3600);
        await page.keyboard.down('ArrowRight');
        await page.waitForTimeout(4200);
        await page.keyboard.up('ArrowRight');
        await page.waitForTimeout(3400);
        await page.keyboard.down('ArrowRight');
        await page.waitForTimeout(2800);
        await page.keyboard.up('ArrowRight');
        await page.waitForTimeout(5200);
        await page.keyboard.down('ArrowRight');
        await page.waitForTimeout(3800);
        await page.keyboard.up('ArrowRight');
        await page.keyboard.up('ArrowUp');
        await assertVisible(page, '.race-objective-card', 'mobile objective card after movement');
        await assertVisible(page, '.race-minimap', 'mobile minimap after movement');
        await assertVisible(page, '.arcade-go-button', 'mobile GO button after movement');
        await assertRaceVisualTelemetry(page, 'mobile race after movement', {
          expectBranch: true,
          expectOffroad: true,
          profile: 'mobile',
        });
      },
    });

    await screenshotPage(browser, {
      name: 'desktop race',
      pathName: 'desktop-race-start-1440x900.png',
      url: `${baseUrl}/#race`,
      viewport: { height: 900, width: 1440 },
      setup: async (page) => {
        await assertCanvasNonblank(page, 'desktop game');
        await assertCanvasFrame(page, 'desktop game', { maxTop: 180, minHeight: 760, minWidth: 1280 });
        await assertVisible(page, '.arcade-go-button', 'desktop GO button');
        await assertRaceVisualTelemetry(page, 'desktop race start', { profile: 'desktop' });
      },
    });

    await screenshotPage(browser, {
      name: 'desktop race after movement',
      pathName: 'desktop-race-moving-1440x900.png',
      url: `${baseUrl}/#race`,
      viewport: { height: 900, width: 1440 },
      setup: async (page) => {
        await assertCanvasNonblank(page, 'desktop game after movement');
        await assertCanvasFrame(page, 'desktop game after movement', { maxTop: 180, minHeight: 760, minWidth: 1280 });
        await page.keyboard.down('ArrowUp');
        await page.waitForTimeout(3600);
        await page.keyboard.down('ArrowRight');
        await page.waitForTimeout(4200);
        await page.keyboard.up('ArrowRight');
        await page.waitForTimeout(3400);
        await page.keyboard.down('ArrowRight');
        await page.waitForTimeout(2800);
        await page.keyboard.up('ArrowRight');
        await page.waitForTimeout(5200);
        await page.keyboard.up('ArrowUp');
        await assertRaceVisualTelemetry(page, 'desktop race after movement', {
          profile: 'desktop',
        });
      },
    });

    await screenshotPage(browser, {
      name: 'mobile race during drift',
      pathName: 'mobile-race-drifting-390x844.png',
      url: `${baseUrl}/#race`,
      viewport: { height: 844, isMobile: true, width: 390 },
      setup: async (page) => {
        await assertCanvasNonblank(page, 'mobile race during drift');
        await assertCanvasFrame(page, 'mobile race during drift', { maxTop: 40, minHeight: 820, minWidth: 380 });
        await page.keyboard.down('ArrowUp');
        await page.waitForTimeout(1800);
        await page.keyboard.down('ArrowRight');
        await page.keyboard.down('ShiftLeft');
        await page.waitForTimeout(3200);
        await page.keyboard.up('ShiftLeft');
        await page.waitForTimeout(600);
        await page.keyboard.up('ArrowRight');
        await page.keyboard.up('ArrowUp');
        await assertVisible(page, '.arcade-go-button', 'mobile GO button after drift');
        await assertRaceVisualTelemetry(page, 'mobile race during drift', {
          expectDrift: true,
        });
      },
    });

    await screenshotPage(browser, {
      name: 'district closeups',
      pathName: 'district-closeups-1440x900.png',
      url: `${baseUrl}/`,
      viewport: { height: 900, width: 1440 },
      setup: async (page) => {
        await page.locator('[data-visual-section="district-closeups"]').scrollIntoViewIfNeeded();
        await assertVisible(page, '[title="Gym"]', 'Gym closeup');
        await assertVisible(page, '[title="Food Court"]', 'Food Court closeup');
        await assertVisible(page, '[title="Lab"]', 'Lab closeup');
        await assertVisible(page, '[title="Clinic"]', 'Clinic closeup');
        await assertVisible(page, '[title="Garage"]', 'Garage closeup');
      },
    });

    await screenshotPage(browser, {
      name: 'garage kart sheet',
      pathName: 'garage-kart-sheet-1440x900.png',
      url: `${baseUrl}/#race`,
      viewport: { height: 900, width: 1440 },
      setup: async (page) => {
        await page.locator('[data-visual-section="garage-sheet"]').scrollIntoViewIfNeeded();
        await assertVisible(page, '[data-visual-section="garage-sheet"]', 'garage kart sheet');
        await assertVisible(page, 'text=Built to comeback', 'kart tagline');
      },
    });
  } catch (error) {
    if (serverLog) error.serverLog = serverLog.slice(-4000);
    throw error;
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }

  console.log(JSON.stringify({
    screenshotsDir,
    screenshots: [
      'desktop-plaza-1440x900.png',
      'mobile-race-start-390x844.png',
      'mobile-race-moving-390x844.png',
      'mobile-race-drifting-390x844.png',
      'desktop-race-start-1440x900.png',
      'desktop-race-moving-1440x900.png',
      'district-closeups-1440x900.png',
      'garage-kart-sheet-1440x900.png',
    ],
  }, null, 2));
};

run().catch((error) => {
  console.error(error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  if (error.serverLog) console.error(error.serverLog);
  process.exit(1);
});
