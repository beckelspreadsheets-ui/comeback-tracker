import { chromium } from 'playwright';
const base = 'https://comeback-city-kart.pages.dev';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`${base}/?track=penguin-village#race`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, { timeout: 25000 });
await page.keyboard.down('ArrowUp');
let shot = 0;
for (let i = 0; i < 400 && shot < 3; i += 1) {
  const p = await page.evaluate(() => window.__comebackCityKartTelemetry?.routeProgress);
  if (p > 0.988 || p < 0.013) { await page.screenshot({ path: `tmp/k8-kart-seats/live-crosser-${shot}.png` }); shot += 1; await wait(320); }
  else await wait(120);
}
await page.keyboard.up('ArrowUp');
await browser.close();
console.log(JSON.stringify({ shots: shot, errors: errors.length }));
if (!shot || errors.length) process.exit(1);
