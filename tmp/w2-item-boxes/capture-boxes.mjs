// W2 item-box candidates turntable (mesh-bakeoff pattern).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 5326;
const MODELS = process.env.BOX_MODELS || '/tmp/w2-item-boxes/box-ice-gift-diet.glb,/tmp/w2-item-boxes/box-aurora-gem-diet.glb,/tmp/w2-item-boxes/box-snow-lantern-diet.glb';
const waitForServer = async (url, timeoutMs = 60000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try { if ((await fetch(url)).ok) return; } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error('vite not ready');
};
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: path.join(__dirname, '..', '..'), stdio: 'ignore' });
try {
  await waitForServer(`http://127.0.0.1:${PORT}/`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
  await page.goto(`http://127.0.0.1:${PORT}/tmp/m3-city-lab/mesh-bakeoff.html?models=${encodeURIComponent(MODELS)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Array.isArray(window.__bakeoffStats), null, { timeout: 60000 });
  await page.waitForTimeout(800);
  console.log(JSON.stringify(await page.evaluate(() => window.__bakeoffStats)));
  await page.screenshot({ path: path.join(__dirname, process.env.BOX_OUT || 'item-box-candidates.png') });
  await browser.close();
} finally { server.kill('SIGTERM'); }
