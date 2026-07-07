import { chromium } from 'playwright';
const shots = [
  ['cc', 'http://127.0.0.1:5173/?playableAutoplay=1&track=comeback-city&skyLab=1#race'],
  ['pv', 'http://127.0.0.1:5173/?playableAutoplay=1&track=penguin-village&skyLab=1#race'],
];
const browser = await chromium.launch();
for (const [key, url] of shots) {
  const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 30000 });
  await page.waitForFunction(() => (window.__comebackCityKartTelemetry?.routeProgress || 0) >= 0.15, null, { timeout: 120000 });
  const t = await page.evaluate(() => ({ track: window.__comebackCityKartTelemetry.track }));
  await page.screenshot({ path: `/private/tmp/claude-501/-Users-andrewferguson-Downloads-comeback-tracker/62595f13-e075-4483-ac17-d884765f5566/scratchpad/probe-5173-${key}.png` });
  console.log(key, JSON.stringify(t));
  await page.close();
}
await browser.close();
