// Quick telemetry sampler — why isn't autoplay routeProgress advancing?
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = 5302;
const baseUrl = `http://127.0.0.1:${port}`;

const waitForServer = async (url) => {
  const started = Date.now();
  while (Date.now() - started < 30000) {
    try { const r = await fetch(url); if (r.ok) return; } catch { await new Promise((r2) => setTimeout(r2, 350)); }
  }
  throw new Error('server not ready');
};

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const server = spawn(npm, ['run', 'dev:kart', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: root, detached: true, env: { ...process.env, BROWSER: 'none' }, stdio: ['ignore', 'pipe', 'pipe'],
});
let browser;
try {
  await waitForServer(baseUrl);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('console', (msg) => { if (msg.type() === 'error') console.log('CONSOLE_ERR', msg.text().slice(0, 200)); });
  page.on('pageerror', (err) => console.log('PAGE_ERR', String(err).slice(0, 300)));
  await page.goto(`${baseUrl}/${process.env.PROBE_QUERY || '?playableAutoplay=1'}#race`, { waitUntil: 'networkidle' });
  for (let i = 0; i < 14; i += 1) {
    await page.waitForTimeout(3000);
    const t = await page.evaluate(() => {
      const x = window.__comebackCityKartTelemetry;
      const canvas = document.querySelector('canvas[data-race-renderer="three-kart"]');
      return x ? { countdown: x.countdown, fps: x.fpsEstimate ?? x.fps, frameElapsedMs: x.frameElapsedMs, frameWorkMs: x.frameWorkMs, lap: x.lap, rp: x.routeProgress, speed: x.speed, canvasW: canvas?.width, canvasH: canvas?.height } : null;
    });
    console.log(i, JSON.stringify(t));
  }
} finally {
  if (browser) await browser.close();
  try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill('SIGTERM'); }
}
