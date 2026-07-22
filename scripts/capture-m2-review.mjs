// M2 hero-slice review captures (Ordinals rebuild): proves the new Ordinal
// driver + inscription kart read from every angle Seth reviews — select
// screen, rear chase, drift, crest jump, and mobile. Playwright against the
// dev kart server; screenshots to tmp/m2-review/ (copied to docs/evidence/m2
// by the milestone commit).
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.M2_REVIEW_PORT || 5298);
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = path.join(root, 'tmp', 'm2-review');

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
  throw new Error(`server not ready: ${url}`);
};

const stopServer = (server) => {
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    server.kill('SIGTERM');
  }
};

const telemetry = (page) => page.evaluate(() => window.__comebackCityKartTelemetry || null);

const waitRaceActive = async (page) => {
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, { timeout: 60000 });
};

const run = async () => {
  await mkdir(outputDir, { recursive: true });
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const server = spawn(npm, ['run', 'dev:kart', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    detached: process.platform !== 'win32',
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let browser;
  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch({ headless: true });

    // 1) Select screen — new Ordinal portraits. QA contexts skip the intro
    //    via navigator.webdriver, so mask it for this one UX capture.
    const selectContext = await browser.newContext({ viewport: { width: 1365, height: 768 } });
    await selectContext.addInitScript(() =>
      Object.defineProperty(navigator, 'webdriver', { get: () => false })
    );
    const select = await selectContext.newPage();
    await select.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    const introStart = select.locator('[data-testid="race-intro-start"]');
    if (await introStart.count()) await introStart.click();
    await select.waitForSelector('[data-testid="race-character-select"]', { timeout: 15000 });
    await select.screenshot({ path: path.join(outputDir, 'select-screen.png') });
    await select.click('[data-testid="race-character-isethius"]');
    await select.click('[data-testid="race-character-start"]');
    await select.waitForSelector('[data-testid="comeback-city-3d-kart-race"]', { timeout: 20000 });
    await select.waitForTimeout(1200);
    await select.screenshot({ path: path.join(outputDir, 'grid-countdown.png') });
    await select.close();
    await selectContext.close();

    // 2) Rear chase + drift (manual input, hero kart).
    const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    await page.goto(`${baseUrl}/?playableAutoplay=1#race`, { waitUntil: 'networkidle' });
    await waitRaceActive(page);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outputDir, 'chase-start.png') });
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(1600);
    await page.keyboard.down('ArrowRight');
    await page.keyboard.down('Space');
    await page.waitForTimeout(1400);
    await page.screenshot({ path: path.join(outputDir, 'drift.png') });
    await page.keyboard.up('Space');
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('ArrowUp');

    // 3) Crest jump: autoplay reaches the mesa crest (~0.85) on lap 1; poll
    //    telemetry for airtime/elevation and grab the frame.
    let jumpShot = false;
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline && !jumpShot) {
      const t = await telemetry(page);
      if (t && (t.airborne || t.airTime > 0.12) && t.routeProgress > 0.7) {
        await page.screenshot({ path: path.join(outputDir, 'crest-jump.png') });
        jumpShot = true;
        break;
      }
      await page.waitForTimeout(120);
    }
    if (!jumpShot) {
      // Fallback: catch the crest by progress window.
      const t = await telemetry(page);
      await page.screenshot({ path: path.join(outputDir, 'crest-jump.png') });
      console.log('WARN jump frame fell back to timed capture', t?.routeProgress);
    }
    // Front read: rivals ahead of the player show kart fronts/drivers.
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outputDir, 'chase-rivals.png') });
    await page.close();

    // 4) Mobile.
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobile.goto(`${baseUrl}/?playableAutoplay=1#race`, { waitUntil: 'networkidle' });
    await waitRaceActive(mobile);
    await mobile.waitForTimeout(2500);
    await mobile.screenshot({ path: path.join(outputDir, 'mobile-chase.png') });
    await mobile.close();

    console.log('M2 review captures written to', path.relative(root, outputDir));
  } finally {
    if (browser) await browser.close();
    stopServer(server);
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
