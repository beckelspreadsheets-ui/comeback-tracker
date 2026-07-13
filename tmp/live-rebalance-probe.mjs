// Confirm the rebalanced stats are what the ORIGIN serves: run the two old
// extremes on the live site and check the gap collapsed.
import { chromium } from 'playwright';
const browser = await chromium.launch();
const out = {};
for (const kart of ['iceracer', 'miamicruiser']) {
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  await page.goto(`https://comeback-city-kart.pages.dev/?raceAutoplay=1&kart=${kart}#race`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 60000 });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.finished === true, null, { timeout: 240000 });
  out[kart] = await page.evaluate(() => ({ raceTime: window.__comebackCityKartTelemetry.raceTime, position: window.__comebackCityKartTelemetry.position }));
  console.log(kart, JSON.stringify(out[kart]));
  await page.close();
}
console.log('live gap:', Math.abs(out.iceracer.raceTime - out.miamicruiser.raceTime).toFixed(2), 's');
await browser.close();
