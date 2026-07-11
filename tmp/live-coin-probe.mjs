// Live probe: do the ₿ coins exist on live with 2-per-row, and does the
// autoplay bot still collect them? Reads mounts late (raceTime > 20) so
// every lazy request has fired.
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
await page.goto('https://comeback-city-kart.pages.dev/?raceAutoplay=1#race', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 45000 });
await page.waitForFunction(() => window.__comebackCityKartTelemetry?.raceTime > 20, null, { timeout: 90000 });
const t = await page.evaluate(() => {
  const t = window.__comebackCityKartTelemetry;
  return { coins: t.coins, lap: t.lap, mounts: t.miamiMounts, drawCalls: t.rendererStats?.drawCalls, meshCount: t.rendererStats?.meshCount };
});
const badge = await page.getAttribute('[data-testid="race-coins"]', 'data-coins');
console.log(JSON.stringify({ ...t, hudBadge: badge }));
await browser.close();
