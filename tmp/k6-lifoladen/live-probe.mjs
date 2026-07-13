// K6 live probe: lifoladen as player (Miami Cruiser) on the production
// origin — telemetry alive, mounts clean, parked close-up for the record.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
await page.goto('https://comeback-city-kart.pages.dev/?character=lifoladen&kart=miamicruiser#race', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 45000 });
await page.waitForTimeout(6500);
const t = await page.evaluate(() => {
  const w = window.__comebackCityKartTelemetry;
  return { track: w.track, mounts: w.miamiMounts, renderer: w.renderer };
});
await page.screenshot({ path: 'tmp/k6-lifoladen/live-parked.png' });
console.log(JSON.stringify(t));
await browser.close();
