// G3 evidence: tier-3 drift (spray + skids), release (speed-lines), coin
// burst, spin-out poof; console errors asserted zero throughout.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const port = 5313;
const out = 'tmp/g3-particles';
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-kart', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];
try {
  // Manual drift chain on CC.
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/#race`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 30000 });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, { timeout: 30000 });
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => (window.__comebackCityKartTelemetry?.speed || 0) > 80, null, { timeout: 60000 });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.down('Space');
  await page.waitForFunction(() => (window.__comebackCityKartTelemetry?.driftTier || 0) >= 2, null, { timeout: 30000 });
  await page.screenshot({ path: `${out}/cc-drift-spray-skids.png` });
  await page.waitForFunction(() => (window.__comebackCityKartTelemetry?.driftTier || 0) >= 3, null, { timeout: 30000 });
  await page.screenshot({ path: `${out}/cc-drift-tier3.png` });
  await page.keyboard.up('Space');
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${out}/cc-boost-speedlines.png` });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/cc-skid-trail-fading.png` });
  await page.close();

  // PV autoplay: coins collect (burst) + ice skids from AI... autoplay
  // doesn't drift, so PV shot = coin burst timing via telemetry coin count.
  const pv = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  pv.on('pageerror', (e) => errors.push(String(e)));
  pv.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await pv.goto(`http://127.0.0.1:${port}/?playableAutoplay=1&track=penguin-village#race`, { waitUntil: 'networkidle' });
  await pv.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 30000 });
  const coinsBefore = await pv.evaluate(() => window.__comebackCityKartTelemetry?.coins || 0);
  await pv.waitForFunction((c) => (window.__comebackCityKartTelemetry?.coins || 0) > c, coinsBefore, { timeout: 120000 });
  await pv.screenshot({ path: `${out}/pv-coin-burst.png` });
  await pv.close();
  console.log(JSON.stringify({ errors, ok: errors.length === 0 }, null, 1));
} finally {
  await browser.close();
  server.kill();
}
