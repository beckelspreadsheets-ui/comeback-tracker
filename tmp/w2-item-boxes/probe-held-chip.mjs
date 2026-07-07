// W2 held-item chip probe: give the player a fish bone, confirm the chip +
// armed throw button render, screenshot for the evidence trail.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const PORT = 5327;
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
  const page = await browser.newPage({ viewport: { height: 844, width: 390 } }); // mobile-ish
  await page.goto(`http://127.0.0.1:${PORT}/?playableAutoplay=1&giveItem=fishbone&track=comeback-city#race`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.heldItem === 'fishbone', null, { timeout: 45000 });
  await page.getByTestId('race-held-item-chip').waitFor({ timeout: 10000 });
  const chipText = await page.getByTestId('race-held-item-chip').textContent();
  await page.screenshot({ path: 'tmp/w2-item-boxes/held-chip-mobile.png' });
  console.log('chip:', chipText);
  console.log(chipText === 'FISH BONE' ? 'CHIP OK' : 'CHIP TEXT UNEXPECTED');
  await browser.close();
} finally { server.kill('SIGTERM'); }
