import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
await page.goto('http://localhost:5173/?raceAutoplay=1&touchControls=1#race', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 45000 });
// Freeze the pop mid-animation as soon as it mounts, then screenshot.
await page.evaluate(() => new Promise((resolve) => {
  const observer = new MutationObserver(() => {
    const pop = document.querySelector('[data-testid="race-item-pickup-pop"]');
    if (pop) { pop.style.animationPlayState = 'paused'; observer.disconnect(); resolve(); }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}));
await page.evaluate(() => {
  const pop = document.querySelector('[data-testid="race-item-pickup-pop"]');
  if (pop) { pop.style.animation = 'none'; pop.style.opacity = '1'; }
});
await page.screenshot({ path: 'tmp/k7-item-lab/smoke-pop2.png' });
console.log('frozen pop captured');
await browser.close();
