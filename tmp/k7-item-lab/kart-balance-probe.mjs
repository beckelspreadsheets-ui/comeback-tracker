// Kart rebalance probe: identical autoplay race per kart, finish time each.
// The spread IS the balance check (rivals pace against hero baseline).
import { chromium } from 'playwright';
const browser = await chromium.launch();
const results = {};
for (const kart of ['hero', 'iceracer', 'miamicruiser', 'kenney', 'icesled']) {
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  await page.goto(`http://localhost:5173/?raceAutoplay=1&kart=${kart}#race`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 45000 });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.finished === true, null, { timeout: 240000 });
  const t = await page.evaluate(() => {
    const w = window.__comebackCityKartTelemetry;
    return { raceTime: w.raceTime, position: w.position };
  });
  results[kart] = t;
  console.log(kart, JSON.stringify(t));
  await page.close();
}
const times = Object.values(results).map((r) => r.raceTime);
console.log('spread:', (Math.max(...times) - Math.min(...times)).toFixed(2), 's over', Math.min(...times).toFixed(1), 's race');
await browser.close();
