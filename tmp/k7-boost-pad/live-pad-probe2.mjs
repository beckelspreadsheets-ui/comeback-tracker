import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
await page.goto('https://comeback-city-kart.pages.dev/?raceAutoplay=1&track=comeback-city#race', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 60000 });
await page.waitForFunction(() => {
  const w = window.__comebackCityKartTelemetry;
  return w && !w.finished && w.lap >= 2 && w.routeProgress >= 0.421 && w.routeProgress < 0.429;
}, null, { timeout: 240000 });
await page.screenshot({ path: 'tmp/k7-boost-pad/live-comeback-city-near.png' });
console.log('captured');
await browser.close();
