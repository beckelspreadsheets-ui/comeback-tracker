// K7 props smoke: full autoplay race, frame samples every 1.5s — rivals
// throw bones/sardines/blizzards on their own; eyeball the catches.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('tmp/k7-item-lab/props-smoke', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
await page.goto('http://localhost:5173/?raceAutoplay=1#race', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 45000 });
let shot = 0;
const t0 = Date.now();
while (Date.now() - t0 < 150000) {
  const t = await page.evaluate(() => {
    const w = window.__comebackCityKartTelemetry;
    return w && { finished: w.finished, lap: w.lap };
  });
  await page.screenshot({ path: `tmp/k7-item-lab/props-smoke/f${String(shot).padStart(3, '0')}.png` });
  shot += 1;
  if (t?.finished) break;
  await page.waitForTimeout(1500);
}
console.log('frames:', shot);
await browser.close();
