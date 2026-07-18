// G2 everything-animates evidence capture: timed in-race screenshots on both
// tracks (webdriver autoplay skips intro/select) plus a manual drift shot for
// the driver-lean read. Serves the CURRENT dist-kart build on 5309.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const port = 5309;
const out = 'tmp/g2-ambient';
const server = spawn(
  'npx',
  ['vite', 'preview', '--outDir', 'dist-kart', '--port', String(port), '--strictPort'],
  { stdio: 'ignore' }
);
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];

const shotAtProgress = async (page, targets, prefix) => {
  for (const target of targets) {
    await page.waitForFunction(
      (t) => {
        const tel = window.__comebackCityKartTelemetry || {};
        return tel.countdown <= 0 && (tel.routeProgress ?? tel.progress ?? 0) >= t;
      },
      target,
      { timeout: 120000 }
    );
    await page.screenshot({ path: `${out}/${prefix}-p${String(target).replace('.', '')}.png` });
  }
};

try {
  for (const [track, targets] of [
    ['comeback-city', [0.05, 0.1, 0.14]],
    ['penguin-village', [0.08, 0.3, 0.6]],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    page.on('pageerror', (e) => errors.push(`${track}: ${e}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`${track}: ${m.text()}`);
    });
    await page.goto(`http://127.0.0.1:${port}/?playableAutoplay=1&track=${track}#race`, {
      waitUntil: 'networkidle',
    });
    await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
      timeout: 30000,
    });
    await shotAtProgress(page, targets, track);
    await page.close();
  }

  // Manual drift on CC: hold a real tier-3 drift and screenshot the lean.
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  page.on('pageerror', (e) => errors.push(`drift: ${e}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`drift: ${m.text()}`);
  });
  await page.goto(`http://127.0.0.1:${port}/#race`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
    timeout: 30000,
  });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, { timeout: 30000 });
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => (window.__comebackCityKartTelemetry?.speed || 0) > 80, null, {
    timeout: 60000,
  });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.down('Space');
  await page.waitForFunction(() => (window.__comebackCityKartTelemetry?.driftTier || 0) >= 1, null, {
    timeout: 30000,
  });
  await page.screenshot({ path: `${out}/drift-lean-tier1.png` });
  await page.waitForFunction(() => (window.__comebackCityKartTelemetry?.driftTier || 0) >= 3, null, {
    timeout: 30000,
  });
  await page.screenshot({ path: `${out}/drift-lean-tier3.png` });
  await page.keyboard.up('Space');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${out}/drift-release-counterlean.png` });
  await page.close();

  console.log(JSON.stringify({ errors, ok: errors.length === 0 }, null, 1));
} finally {
  await browser.close();
  server.kill();
}
