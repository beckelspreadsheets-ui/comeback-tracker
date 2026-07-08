// W3 in-game verification: screenshot PV at each tribute placement.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const PORT = 5329;
const SPOTS = [
  { key: 'monument', progress: 0.062 },
  { key: 'runestone', progress: 0.362 },
  { key: 'casino-corner', progress: 0.478 },
  { key: 'odds-board', progress: 0.642 },
];
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
  await page.goto(`http://127.0.0.1:${PORT}/?playableAutoplay=1&track=penguin-village#race`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 30000 });
  for (const spot of SPOTS) {
    await page.waitForFunction(
      (target) => {
        const t = window.__comebackCityKartTelemetry;
        return t && !t.finished && t.lap >= 2 && t.routeProgress >= target && t.routeProgress < target + 0.02;
      },
      spot.progress,
      { timeout: 150000 }
    );
    await page.screenshot({ path: `tmp/w3-pv-props/ingame-${spot.key}.png` });
    console.log(`${spot.key} captured`);
  }
  const t = await page.evaluate(() => window.__comebackCityKartTelemetry);
  console.log('mounts:', JSON.stringify(t.miamiMounts));
  await browser.close();
} finally { server.kill('SIGTERM'); }
