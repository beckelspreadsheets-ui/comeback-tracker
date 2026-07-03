import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const root = '/Users/andrewferguson/Downloads/comeback-tracker';
const port = 5205;
const outDir = `${root}/.agent/runs/kart-racer-production-readiness/evidence/phase5-automation-2026-06-17/route-check`;
await mkdir(outDir, { recursive: true });

const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
});

const waitForServer = async (url, timeoutMs = 30000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('server not ready');
};

try {
  await waitForServer(`http://127.0.0.1:${port}/`);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    recordVideo: { dir: outDir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (msg) => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));

  // Check /#race
  await page.goto(`http://127.0.0.1:${port}/#race`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${outDir}/race-hash-landing.png`, fullPage: false });

  // Check /race-playtest.html
  await page.goto(`http://127.0.0.1:${port}/race-playtest.html?raceAutoplay=1&raceTrack=comeback-city&raceMode=free-switch&raceIndex=901&raceNoFinish=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${outDir}/race-playtest.png`, fullPage: false });

  await context.close();
  await browser.close();
  console.log('Screenshots saved to', outDir);
} finally {
  server.kill('SIGTERM');
}
