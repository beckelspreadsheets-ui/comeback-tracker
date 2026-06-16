import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'tmp', 'penguin-vfx-phase2');

const baseUrl = process.env.PENGUIN_VFX_URL || 'http://127.0.0.1:5174';
const taskName = process.env.PENGUIN_VFX_TASK || 'task1';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const screenshotPath = (name) => path.join(outDir, `${taskName}-${name}.png`);

const captureBoost = async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const url = `${baseUrl}/?playableAutoplay=1&track=penguin-village&giveItem=cocoa#race`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 30000 });

  // Let the race begin and autoplay pick up some speed.
  await wait(5000);

  // Fire the cocoa boost item.
  await page.keyboard.down('Enter');
  await wait(100);
  await page.keyboard.up('Enter');
  await wait(300);

  const file = screenshotPath('boost');
  await page.screenshot({ path: file, fullPage: false });
  console.log(`Screenshot saved: ${file}`);
  await page.close();
};

const captureDrift = async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const url = `${baseUrl}/?playableAutoplay=1&track=penguin-village#race`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await wait(5000);

  await page.keyboard.down('ArrowUp');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('Space');
  await wait(2000);

  const activeFile = screenshotPath('drift-active');
  await page.screenshot({ path: activeFile, fullPage: false });
  console.log(`Screenshot saved: ${activeFile}`);

  await page.keyboard.up('Space');
  await page.keyboard.up('ArrowRight');
  await wait(200);

  const releaseFile = screenshotPath('drift-release');
  await page.screenshot({ path: releaseFile, fullPage: false });
  console.log(`Screenshot saved: ${releaseFile}`);

  await page.keyboard.up('ArrowUp');
  await page.close();
};

const captureItemShowcase = async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const url = `${baseUrl}/?itemShowcase=1&track=penguin-village#race`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await wait(5000);

  const file = screenshotPath('showcase');
  await page.screenshot({ path: file, fullPage: false });
  console.log(`Screenshot saved: ${file}`);
  await page.close();
};

const captureBaseline = async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const url = `${baseUrl}/?playableAutoplay=1&track=penguin-village#race`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await wait(5000);

  const file = screenshotPath('baseline');
  await page.screenshot({ path: file, fullPage: false });
  console.log(`Screenshot saved: ${file}`);
  await page.close();
};

(async () => {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    if (taskName === 'baseline') {
      await captureBaseline(browser);
    } else if (taskName === 'boost') {
      await captureBoost(browser);
    } else if (taskName === 'showcase') {
      await captureItemShowcase(browser);
    } else {
      await captureDrift(browser);
    }
  } finally {
    await browser.close();
  }
})();
