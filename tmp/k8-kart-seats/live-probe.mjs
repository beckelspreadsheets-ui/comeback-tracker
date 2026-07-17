// Origin probe: both K8 karts + audio telemetry on the LIVE deploy.
import { chromium } from 'playwright';
const base = process.env.LIVE_BASE || 'https://comeback-city-kart.pages.dev';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const results = [];
for (const kart of ['iceblock', 'btckart']) {
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${base}/?kart=${kart}#race`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 25000 });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, { timeout: 25000 });
  await page.keyboard.down('ArrowUp');
  await wait(2500);
  await page.screenshot({ path: `tmp/k8-kart-seats/live-${kart}.png` });
  await page.keyboard.up('ArrowUp');
  const t = await page.evaluate(() => window.__comebackCityKartTelemetry);
  results.push({ kart, ranAs: t.kart, speed: t.speed, audioRunning: t.audioRunning, errors: errors.length });
  await page.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 1));
const ok = results.every((r) => r.kart === r.ranAs && r.errors === 0 && r.speed > 50 && r.audioRunning === true);
if (!ok) process.exit(1);
