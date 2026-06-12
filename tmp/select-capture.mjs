import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '5312', '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1800));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { height: 768, width: 1366 } });
await page.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  window.localStorage.setItem('cc-kart-intro-seen', '1');
});
await page.goto('http://127.0.0.1:5312/#race', { waitUntil: 'networkidle' });
await page.waitForSelector('[data-testid="race-character-select"]', { timeout: 10000 });
await page.click('[data-testid="race-character-mizzle"]');
await page.waitForTimeout(300);
await page.screenshot({ path: 'tmp/character-select/select-screen.png' });
console.log('captured select screen');
await browser.close();
server.kill();
