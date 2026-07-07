import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (message) => {
  const text = message.text();
  if (/miami|glb|gltf|meshopt|error|failed|refus/i.test(text)) console.log(`[${message.type()}]`, text.slice(0, 220));
});
page.on('pageerror', (error) => console.log('[pageerror]', String(error).slice(0, 220)));
await page.goto('https://comeback-city-kart.pages.dev/?playableAutoplay=1&track=comeback-city#race', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__comebackCityKartTelemetry?.raceTime > 3, null, { timeout: 60000 }).catch(() => {});
console.log('mounts:', JSON.stringify(await page.evaluate(() => window.__comebackCityKartTelemetry?.miamiMounts)));
await browser.close();
