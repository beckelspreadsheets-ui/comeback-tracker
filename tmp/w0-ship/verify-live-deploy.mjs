// Post-deploy live check: miami mode on the production URL, no CSP
// texture refusals, mounts healthy, screenshot both tracks.
import { chromium } from 'playwright';

const BASE = 'https://comeback-city-kart.pages.dev';
const browser = await chromium.launch();
let failed = false;
for (const track of ['comeback-city', 'penguin-village']) {
  const context = await browser.newContext({ viewport: { width: 1365, height: 768 } });
  const page = await context.newPage();
  const cspErrors = [];
  page.on('console', (message) => {
    const text = message.text();
    if (/Content Security Policy|Couldn't load texture blob:/i.test(text)) cspErrors.push(text.slice(0, 120));
  });
  await page.goto(`${BASE}/?playableAutoplay=1&track=${track}#race`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 45000 });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.raceTime > 4, null, { timeout: 60000 });
  const t = await page.evaluate(() => window.__comebackCityKartTelemetry);
  await page.screenshot({ path: `tmp/w0-ship/live-${track}.png` });
  const ok = t.track === track && cspErrors.length === 0 && (t.miamiMounts?.failed ?? 1) === 0;
  console.log(track, JSON.stringify({ track: t.track, speed: t.speed, miamiMounts: t.miamiMounts, cspErrors: cspErrors.length, postChain: t.postChainEnabled }), ok ? 'OK' : 'FAIL');
  if (!ok) { failed = true; cspErrors.slice(0, 3).forEach((error) => console.error('  CSP:', error)); }
  await context.close();
}
await browser.close();
console.log(failed ? 'LIVE VERIFY FAILED' : 'LIVE DEPLOY VERIFIED');
process.exitCode = failed ? 1 : 0;
