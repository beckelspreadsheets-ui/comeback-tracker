// CC coin item-box pickup probe: drive lap 1-2, log itemPickups/heldItem
// transitions around each box row.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const PORT = 5330;
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
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/?playableAutoplay=1&track=comeback-city#race`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown === 0, null, { timeout: 45000 });
  let last = { held: null, pickups: 0 };
  for (let tick = 0; tick < 120; tick += 1) {
    const t = await page.evaluate(() => {
      const x = window.__comebackCityKartTelemetry;
      return { finished: x.finished, held: x.heldItem, lap: x.lap, pickups: x.itemPickups, progress: x.routeProgress };
    });
    if (t.pickups !== last.pickups || t.held !== last.held) {
      console.log(`lap ${t.lap} p=${t.progress.toFixed(3)} pickups=${t.pickups} held=${t.held}`);
      last = { held: t.held, pickups: t.pickups };
    }
    if (t.finished) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  await browser.close();
} finally { server.kill('SIGTERM'); }
