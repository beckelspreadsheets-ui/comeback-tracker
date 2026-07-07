// W0: ?skyLab=0 diagnostic escape hatch must still race clean (bare
// districts, no rings, no miami mounts, camera.far 860).
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const PORT = 5325;
const BASE = `http://127.0.0.1:${PORT}`;
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
  await waitForServer(BASE);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`${BASE}/?skyLab=0&playableAutoplay=1#race`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 30000 });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.raceTime > 3, null, { timeout: 45000 });
  const t = await page.evaluate(() => window.__comebackCityKartTelemetry);
  console.log('escape hatch:', JSON.stringify({ track: t.track, speed: t.speed, miamiMounts: t.miamiMounts, pageErrors: errors.length }));
  if (errors.length || t.miamiMounts?.requested !== 0) { console.error('FAIL', errors.slice(0, 2)); process.exitCode = 1; }
  else console.log('ESCAPE HATCH OK');
  await browser.close();
} finally { server.kill('SIGTERM'); }
