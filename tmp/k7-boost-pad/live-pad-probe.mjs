// Confirm the rebuilt boost pad is what the ORIGIN serves: at-pad screenshot
// per track on the live site, lap 2+ (field spread).
import { chromium } from 'playwright';
const browser = await chromium.launch();
for (const { track, pad } of [
  { track: 'comeback-city', pad: 0.435 },
  { track: 'penguin-village', pad: 0.33 },
]) {
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  await page.goto(`https://comeback-city-kart.pages.dev/?raceAutoplay=1&track=${track}#race`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 60000 });
  await page.waitForFunction(
    (t) => {
      const w = window.__comebackCityKartTelemetry;
      return w && !w.finished && w.lap >= 2 && w.routeProgress >= t - 0.002 && w.routeProgress < t + 0.01;
    },
    pad,
    { timeout: 240000 }
  );
  await page.screenshot({ path: `tmp/k7-boost-pad/live-${track}-at-pad.png` });
  const hits = await page.evaluate(() => window.__comebackCityKartTelemetry.boostHits);
  console.log(track, 'boostHits:', hits, '— live-' + track + '-at-pad.png');
  await page.close();
}
await browser.close();
