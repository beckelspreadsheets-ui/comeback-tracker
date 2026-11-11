// App Store screenshot capture (RELEASE_V1_PLAN Phase 4).
//
// App Store Connect wants exact pixel sizes per device class. Penguin Kart is
// landscape-only and V1 ships for iPhone only (owner 2026-11-10), so this
// captures one LANDSCAPE set:
//   iphone-6.9  2868 x 1320  (956 x 440 CSS at 3x — the 6.9" class; Apple
//                             scales it down for smaller iPhones)
// The iPad set (ipad-13, 2752 x 2064) comes back with the iPad update.
// Scenes: the race setup screen with a character on the stage, the racer
// roster, the start grid, Comeback City, Penguin Village, the item showcase,
// plus alternates (launch, drift sparks, a Penguin Village pack shot). Output:
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
// APP_STORE_SHOTS_ONLY=07,08 re-shoots just those scenes (prefix match).
const ONLY = (process.env.APP_STORE_SHOTS_ONLY || '').split(',').filter(Boolean);
const wanted = (name) => !ONLY.length || ONLY.some((prefix) => name.startsWith(prefix));

const DEVICES = [
  { dsf: 3, height: 440, name: 'iphone-6.9', touch: true, width: 956 },
];

// Race scenes: query, then the race time (seconds) to shoot at.
const RACE_SCENES = [
  { at: 'grid', name: '02-start-grid', query: '&track=comeback-city&character=seth-penguin' },
  { at: 9, name: '03-comeback-city', query: '&track=comeback-city&character=mizzle' },
  { at: 12, name: '04-penguin-village', query: '&track=penguin-village&character=layer23' },
  { at: 5, name: '05-items', query: '&track=comeback-city&itemShowcase=1&character=lifoladen' },
  // Alternates, so the owner picks from more than one take of each idea.
  { at: 1.1, name: '06-launch', query: '&track=comeback-city&character=crrt-bunny' },
  { at: 'drift', name: '07-drift-sparks', query: '&track=comeback-city&character=lifoladen' },
  { at: 32, name: '08-penguin-village-pack', query: '&track=penguin-village&character=seth-penguin' },
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
    if (wanted('01')) {
      const context = await browser.newContext(contextOptions);
      await context.addInitScript(() => {
        Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false });
        try {
          window.localStorage.setItem('cc-kart-intro-seen', '1');
        } catch {}
      });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/?character=seth-penguin`, { waitUntil: 'networkidle' });
      // The page is taller than a landscape phone and Start is pinned to the
      // bottom of the screen, so at scroll 0 Start sits on top of the kart.
      // Scroll the stage to the top of the screen: it then ends above Start.
      await page.waitForSelector('[data-testid="race-select-stage"] canvas', { timeout: 30000 });
      await page.evaluate(() => {
        const stage = document.querySelector('[data-testid="race-select-stage"]');
        const scroller = stage?.closest('.overflow-y-auto');
        if (scroller) scroller.scrollTop += stage.getBoundingClientRect().top - 8;
      });
      // ~3 s into the turntable the kart is front three-quarter on.
      await page.waitForTimeout(3000);
      const file = path.join(dir, '01-race-setup.png');
      await page.screenshot({ path: file });
      written.push(file);
      // 01b: the same screen scrolled to the racer picker — the roster of
      // ordinal characters is the thing the group will recognise.
      // Heading at the top, both rows of racers below it. The pinned Start
      // lands on the empty tiles of the second row.
      await page.evaluate(() => {
        const first = document.querySelector('[data-testid="race-character-crrt-bunny"]');
        const scroller = first?.closest('.overflow-y-auto');
        if (scroller) scroller.scrollTop += first.getBoundingClientRect().top - 92;
      });
      await page.waitForTimeout(1200);
      const roster = path.join(dir, '01b-roster.png');
      await page.screenshot({ path: roster });
      written.push(roster);
      await context.close();
    }

    for (const scene of RACE_SCENES.filter((entry) => wanted(entry.name))) {
      const context = await browser.newContext(contextOptions);
      const page = await context.newPage();
      // The drift shot is stepped frame by frame (see below), which needs
      // Playwright's clock in place before the page loads.
      if (scene.at === 'drift') await page.clock.install();
      await page.goto(`${baseUrl}/?playableAutoplay=1&touchControls=1${scene.query}#race`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 90000 });
      if (scene.at === 'drift') {
        // The autoplay driver lets go the instant a drift banks tier 1, and
        // the sparks while charging are faint, so a shot taken "when the
        // tier is 1" always missed. Instead: stop the clock when a drift
        // starts, step 33 ms at a time until the tier banks, then step
        // another quarter second to the release flash and mini-turbo.
        // Not every drift banks (some corners are too short), so try each
        // drift in turn until one does.
        let banked = false;
        for (let attempt = 0; attempt < 12 && !banked; attempt += 1) {
          await page.waitForFunction(
            () => {
              const t = window.__comebackCityKartTelemetry;
              return t?.raceTime > 4 && t.drift && t.driftCharge < 0.2;
            },
            null,
            { polling: 30, timeout: 180000 }
          );
          await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 50));
          let drifting = true;
          for (let step = 0; step < 150 && drifting && !banked; step += 1) {
            await page.clock.runFor(33);
            ({ banked, drifting } = await page.evaluate(() => {
              const t = window.__comebackCityKartTelemetry;
              return { banked: t.driftTier >= 1, drifting: t.drift };
            }));
          }
          if (!banked) await page.clock.resume();
        }
        if (!banked) throw new Error('drift scene: no drift banked a tier');
        for (let step = 0; step < 8; step += 1) await page.clock.runFor(33);
      } else if (scene.at === 'grid') {
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
