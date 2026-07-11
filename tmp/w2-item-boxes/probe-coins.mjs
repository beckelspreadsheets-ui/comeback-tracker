// Coin system probe: autoplay CC, watch the coin counter rise, verify a
// spin-out drops coins, screenshot a coin row.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const PORT = 5331;
const waitForServer = async (url, timeoutMs = 60000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try { if ((await fetch(url)).ok) return; } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error('vite not ready');
};
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: process.cwd(), stdio: 'ignore' });
try {
  await waitForServer(`http://127.0.0.1:${PORT}/`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { height: 768, width: 1365 } });
  await page.goto(`http://127.0.0.1:${PORT}/?playableAutoplay=1&track=comeback-city#race`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown === 0, null, { timeout: 45000 });
  let peak = 0;
  let sawDrop = false;
  let shot = false;
  for (let tick = 0; tick < 150; tick += 1) {
    const t = await page.evaluate(() => {
      const x = window.__comebackCityKartTelemetry;
      return { coins: x.coins, finished: x.finished, lap: x.lap, progress: x.routeProgress, spinOuts: x.spinOuts };
    });
    if (t.coins > peak) peak = t.coins;
    if (t.coins < peak && t.spinOuts > 0) sawDrop = true;
    if (!shot && t.coins > 0 && t.progress > 0.14 && t.progress < 0.2) {
      await page.screenshot({ path: 'tmp/w2-item-boxes/ingame-coins.png' });
      shot = true;
    }
    if (t.finished) break;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  const final = await page.evaluate(() => window.__comebackCityKartTelemetry.coins);
  console.log(JSON.stringify({ finalCoins: final, peak, sawSpinDrop: sawDrop }));
  console.log(peak > 0 ? 'COINS COLLECT OK' : 'COINS NEVER COLLECTED — FAIL');
  await browser.close();
} finally { server.kill('SIGTERM'); }
