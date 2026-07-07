import path from 'node:path';
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
  const context = await browser.newContext();
  await context.addInitScript((variant) => { window.__boostLabOverrides = { variant }; }, 'v1');
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/?playableAutoplay=1&track=comeback-city&boostLab=1#race`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 30000 });
  const facts = await page.evaluate(() => ({
    overrides: window.__boostLabOverrides,
    search: window.location.search,
  }));
  console.log(JSON.stringify(facts));
  await browser.close();
} finally { server.kill('SIGTERM'); }
