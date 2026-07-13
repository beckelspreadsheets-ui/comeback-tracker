// K7 icons smoke: autoplay until an item is picked up — catch the B pop
// mid-animation, then the armed smash button + chip with the rendered tile.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
await page.goto('http://localhost:5173/?raceAutoplay=1&touchControls=1#race', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 45000 });
await page.waitForSelector('[data-testid="race-item-pickup-pop"]', { timeout: 90000 });
await page.screenshot({ path: 'tmp/k7-item-lab/smoke-pop.png' });
console.log('pop caught');
await page.waitForTimeout(900);
const held = await page.getAttribute('[data-testid="race-held-item"]', 'data-held-item');
await page.screenshot({ path: 'tmp/k7-item-lab/smoke-armed.png' });
console.log('armed shot, heldItem =', held);
await browser.close();
