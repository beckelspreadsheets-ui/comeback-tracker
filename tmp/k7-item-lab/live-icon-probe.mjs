// Icons on the origin: autoplay until a pickup, catch the pop + armed chip.
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
await page.goto('https://comeback-city-kart.pages.dev/?raceAutoplay=1&touchControls=1#race', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 60000 });
await page.waitForSelector('[data-testid="race-item-pickup-pop"]', { timeout: 90000 });
await page.evaluate(() => {
  const pop = document.querySelector('[data-testid="race-item-pickup-pop"]');
  if (pop) pop.style.animation = 'none';
});
await page.screenshot({ path: 'tmp/k7-item-lab/live-pop.png' });
const held = await page.getAttribute('[data-testid="race-held-item"]', 'data-held-item');
console.log('live pop caught, heldItem =', held);
await browser.close();
