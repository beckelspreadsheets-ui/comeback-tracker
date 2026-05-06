import { mkdir } from 'node:fs/promises';
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
      pathName: 'mobile-game-390x844.png',
      url: `${baseUrl}/#race`,
      viewport: { height: 844, isMobile: true, width: 390 },
      setup: async (page) => {
        await assertCanvasNonblank(page, 'mobile game');
        await assertCanvasFrame(page, 'mobile game', { maxTop: 180, minHeight: 760, minWidth: 380 });
        await assertVisible(page, '.race-objective-card', 'mobile objective card');
        await assertVisible(page, '.currency-stack', 'mobile currency stack');
        await assertVisible(page, '.race-minimap', 'mobile minimap');
        await assertVisible(page, '.arcade-go-button', 'mobile GO button');
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
      'mobile-game-390x844.png',
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
