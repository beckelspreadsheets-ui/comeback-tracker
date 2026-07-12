// Capture the race-select screen at phone sizes (bug: cut off on mobile).
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const server = spawn('npx', ['vite', 'preview', '--config', 'vite.config.kart.js', '--port', '5335', '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch();
for (const [name, viewport] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
  const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5335/#race', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="race-character-select"]', { timeout: 20000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `tmp/k3-mobile-controls-smoke/select-${name}.png` });
  const scroll = await page.evaluate(() => ({
    docH: document.documentElement.scrollHeight,
    winH: window.innerHeight,
    bodyOverflow: getComputedStyle(document.body).overflow,
  }));
  console.log(name, JSON.stringify(scroll));
  await ctx.close();
}
await browser.close();
server.kill();
