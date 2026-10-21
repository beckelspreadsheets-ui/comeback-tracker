// App Store screenshot capture (RELEASE_V1_PLAN Phase 4).
//
// App Store Connect wants exact pixel sizes per device class. Penguin Kart is
// landscape-only and ships for iPhone and iPad, so this captures LANDSCAPE
// sets for:
//   iphone-6.9  2868 x 1320  (956 x 440 CSS at 3x — the 6.9" class; Apple
//                             scales it down for smaller iPhones)
//   ipad-13     2752 x 2064  (1376 x 1032 CSS at 2x — the 13" class)
// Scenes: the race setup screen with a character on the stage, the start grid,
// a drift on Comeback City, Penguin Village, and the item showcase. Output:
// tmp/app-store/<device>/<NN-scene>.png. The owner picks the final 3-10 per
// device; nothing is uploaded from here.
//
//   npm run build:kart && node scripts/app-store-screenshots.mjs
//   APP_STORE_SHOTS_URL=https://aaa-preview.comeback-city-kart.pages.dev node scripts/app-store-screenshots.mjs
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { chromiumGlArgs } from './lib/chromium-gl-args.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.APP_STORE_SHOTS_PORT || 5381);
const external = process.env.APP_STORE_SHOTS_URL;
const baseUrl = external || `http://127.0.0.1:${port}`;
const outRoot = path.join(root, 'tmp', 'app-store');

const DEVICES = [
  { dsf: 3, height: 440, name: 'iphone-6.9', touch: true, width: 956 },
  { dsf: 2, height: 1032, name: 'ipad-13', touch: true, width: 1376 },
];

// Race scenes: query, then the race time (seconds) to shoot at.
const RACE_SCENES = [
  { at: 'grid', name: '02-start-grid', query: '&track=comeback-city&character=seth-penguin' },
  { at: 9, name: '03-comeback-city', query: '&track=comeback-city&character=mizzle' },
  { at: 12, name: '04-penguin-village', query: '&track=penguin-village&character=layer23' },
  { at: 5, name: '05-items', query: '&track=comeback-city&itemShowcase=1&character=lifoladen' },
];

const waitForServer = async (url, ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if ((await fetch(url)).ok) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
};

let server = null;
let browser = null;
const written = [];
try {
  if (!external) {
    server = spawn('npx', ['vite', 'preview', '--config', 'vite.config.kart.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
      cwd: root,
      stdio: 'ignore',
    });
    if (!(await waitForServer(`${baseUrl}/`, 60000))) throw new Error('preview server did not start (run npm run build:kart first)');
  }
  browser = await chromium.launch({ args: chromiumGlArgs() });
  for (const device of DEVICES) {
    const dir = path.join(outRoot, device.name);
    mkdirSync(dir, { recursive: true });
    const contextOptions = {
      deviceScaleFactor: device.dsf,
      hasTouch: device.touch,
      isMobile: device.touch,
      viewport: { height: device.height, width: device.width },
    };

    // 01: the race setup screen (the real menu: webdriver masked so the QA
    // skip does not fire, intro marked as seen).
    {
      const context = await browser.newContext(contextOptions);
      await context.addInitScript(() => {
        Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false });
        try {
          window.localStorage.setItem('cc-kart-intro-seen', '1');
        } catch {}
      });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/?character=seth-penguin`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(6000);
      const file = path.join(dir, '01-race-setup.png');
      await page.screenshot({ path: file });
      written.push(file);
      await context.close();
    }

    for (const scene of RACE_SCENES) {
      const context = await browser.newContext(contextOptions);
      const page = await context.newPage();
      await page.goto(`${baseUrl}/?playableAutoplay=1&touchControls=1${scene.query}#race`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 90000 });
      if (scene.at === 'grid') {
        await page.waitForFunction(
          () => {
            const t = window.__comebackCityKartTelemetry;
            return t?.countdown > 0 && t.countdown < 1.6;
          },
          null,
          { timeout: 90000 }
        );
      } else {
        await page.waitForFunction((at) => (window.__comebackCityKartTelemetry?.raceTime ?? 0) >= at, scene.at, {
          timeout: 180000,
        });
      }
      const file = path.join(dir, `${scene.name}.png`);
      await page.screenshot({ path: file });
      written.push(file);
      await context.close();
    }
  }
} catch (error) {
  console.error('screenshot run failed:', String(error).slice(0, 300));
  process.exitCode = 1;
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}
written.forEach((file) => console.log(path.relative(root, file)));
