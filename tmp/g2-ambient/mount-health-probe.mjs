import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const port = 5311;
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-kart', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch();
try {
  const results = {};
  for (const track of ['comeback-city', 'penguin-village']) {
    const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://127.0.0.1:${port}/?playableAutoplay=1&track=${track}#race`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 30000 });
    await page.waitForTimeout(4000);
    results[track] = await page.evaluate(() => {
      const tel = window.__comebackCityKartTelemetry || {};
      const a = window.__g2AmbientDebug || {};
      return {
        miamiMounts: tel.miamiMounts,
        tickers: a.tickers?.length,
        floes: a.floes?.length,
        snow: Boolean(a.snow),
        drawCallsEstimate: tel.rendererStats?.drawCalls,
      };
    });
    results[track].consoleErrors = errors;
    await page.close();
  }
  console.log(JSON.stringify(results, null, 1));
} finally {
  await browser.close();
  server.kill();
}
