// Corner-arcade A/B: owner-approved original vs abstract-neon v2 regen.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5322;
const MODELS = '/tmp/m3-city-lab/corner-arcade-v2-diet.glb,/tmp/m3-city-lab/corner-arcade-v3-diet.glb';

const waitForServer = async (url, timeoutMs = 60000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error('vite not ready');
};

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: path.join(__dirname, '..', '..'),
  stdio: 'ignore',
});
try {
  await waitForServer(`http://127.0.0.1:${PORT}/`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
  await page.goto(`http://127.0.0.1:${PORT}/tmp/m3-city-lab/mesh-bakeoff.html?models=${encodeURIComponent(MODELS)}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => Array.isArray(window.__bakeoffStats), null, { timeout: 60000 });
  await page.waitForTimeout(800);
  const stats = await page.evaluate(() => window.__bakeoffStats);
  await page.screenshot({ path: path.join(__dirname, 'arcade-regen-v3-ab.png') });
  console.log(JSON.stringify(stats));
  await browser.close();
} finally {
  server.kill('SIGTERM');
}
