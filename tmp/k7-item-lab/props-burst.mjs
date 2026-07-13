// Burst-capture at fire time: when data-held-item transitions away from an
// item, grab 3 rapid frames labeled by what was just thrown. Sardine flies
// AHEAD (visible); blizzard parks at the kart; bones drop behind (skip).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('tmp/k7-item-lab/props-burst', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
const caught = new Set();
for (let race = 0; race < 3 && caught.size < 2; race += 1) {
  await page.goto('http://localhost:5173/?raceAutoplay=1#race', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 45000 });
  let last = 'none';
  const t0 = Date.now();
  while (Date.now() - t0 < 160000) {
    const held = await page.getAttribute('[data-testid="race-held-item"]', 'data-held-item').catch(() => null);
    const fin = await page.evaluate(() => window.__comebackCityKartTelemetry?.finished);
    if (last !== 'none' && held === 'none' && ['sardine', 'blizzard'].includes(last) && !caught.has(last)) {
      for (let burst = 0; burst < 3; burst += 1) {
        await page.screenshot({ path: `tmp/k7-item-lab/props-burst/${last}-${burst}.png` });
        await page.waitForTimeout(350);
      }
      caught.add(last);
      console.log('caught fire burst:', last);
    }
    last = held || 'none';
    if (fin) break;
    await page.waitForTimeout(90);
  }
}
console.log('done, caught:', [...caught].join(',') || 'nothing');
await browser.close();
