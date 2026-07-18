import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const port = 5309;
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-kart', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  await page.goto(`http://127.0.0.1:${port}/?playableAutoplay=1#race`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 30000 });
  for (const target of [0.06, 0.085, 0.12]) {
    await page.waitForFunction((t) => {
      const tel = window.__comebackCityKartTelemetry || {};
      return tel.countdown <= 0 && (tel.routeProgress ?? 0) >= t;
    }, target, { timeout: 120000 });
    await page.screenshot({ path: `tmp/g2-ambient/ticker-${String(target).replace('.','')}.png` });
  }
} finally {
  await browser.close();
  server.kill();
}
