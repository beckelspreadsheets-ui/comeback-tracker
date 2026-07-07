import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const PORT = 5316;
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
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 30000 });
  for (let second = 0; second < 90; second += 3) {
    const t = await page.evaluate(() => {
      const telemetry = window.__comebackCityKartTelemetry;
      return telemetry ? { countdown: telemetry.countdown, finished: telemetry.finished, lap: telemetry.lap, progress: telemetry.routeProgress, speed: telemetry.speed } : null;
    });
    console.log(second, JSON.stringify(t));
    if (t?.finished) break;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  await browser.close();
} finally { server.kill('SIGTERM'); }
