import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const port = 5309;
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-kart', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  const errors = [];
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
  const samples = [];
  for (let i = 0; i < 40; i += 1) {
    await page.waitForTimeout(500);
    const t = await page.evaluate(() => {
      const tel = window.__comebackCityKartTelemetry || {};
      return { drift: tel.drift, tier: tel.driftTier, speed: Math.round(tel.speed || 0), fps: tel.fps, raceTime: tel.raceTime };
    });
    samples.push(t);
    if (t.tier >= 3) break;
  }
  console.log(JSON.stringify({ errors, samples }, null, 1));
} finally {
  await browser.close();
  server.kill();
}
