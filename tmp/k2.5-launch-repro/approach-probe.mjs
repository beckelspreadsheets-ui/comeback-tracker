import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const server = spawn('npx', ['vite', 'preview', '--config', 'vite.config.kart.js', '--port', '5333', '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
await page.goto('http://localhost:5333/?raceAutoplay=1&track=comeback-city#race', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 45000 });
const shots = [
  { key: 'under-bridge', window: [0.178, 0.195] },
  { key: 'crest-flight', window: [0.475, 0.5] },
  { key: 'bridge-side-view', window: [0.375, 0.395] },
];
const done = new Set();
const t0 = Date.now();
while (done.size < shots.length && Date.now() - t0 < 120000) {
  const p = await page.evaluate(() => window.__comebackCityKartTelemetry?.routeProgress ?? -1);
  for (const s of shots) {
    if (!done.has(s.key) && p >= s.window[0] && p <= s.window[1]) {
      await page.screenshot({ path: `tmp/k2.5-launch-repro/after-${s.key}.png` });
      done.add(s.key);
      console.log('shot', s.key, 'at', p);
    }
  }
  await page.waitForTimeout(40);
}
await browser.close();
server.kill();
console.log('done:', [...done].join(', '));
