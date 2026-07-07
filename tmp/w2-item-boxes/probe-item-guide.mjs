// W2 item-guide reachability probe: a RETURNING player (intro already seen)
// reopens the guide from the race-setup button; icons match the HUD map.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const PORT = 5328;
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
  await context.addInitScript(() => {
    Object.defineProperty(Object.getPrototypeOf(navigator), 'webdriver', { get: () => false });
    window.localStorage.setItem('cc-kart-intro-seen', '1'); // returning player
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/#race`, { waitUntil: 'networkidle' });
  await page.getByTestId('race-character-select').waitFor({ timeout: 15000 });
  await page.getByTestId('race-open-item-guide').click();
  await page.getByTestId('race-intro-screen').waitFor({ timeout: 10000 });
  await page.screenshot({ path: 'tmp/w2-item-boxes/item-guide-reopened.png', fullPage: false });
  await page.getByTestId('race-intro-start').click();
  await page.getByTestId('race-character-select').waitFor({ timeout: 10000 });
  console.log('GUIDE REOPEN OK (select -> guide -> select round trip)');
  await browser.close();
} finally { server.kill('SIGTERM'); }
