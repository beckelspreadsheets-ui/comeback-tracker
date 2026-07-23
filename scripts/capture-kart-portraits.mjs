// M5 kart portraits: captures each Ordinal kart at the race grid and crops
// the centered hero kart into src/assets/game/select/kart-<key>.png —
// replaces the M2 driver-portrait placeholders on the kart picker.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.M5_PORTRAIT_PORT || 5304);
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = path.join(root, 'tmp', 'm5-kart-portraits');

const CHARACTERS = ['isethius', 't-clow', 'layer23'];

const waitForServer = async (url) => {
  const started = Date.now();
  while (Date.now() - started < 30000) {
    try { const r = await fetch(url); if (r.ok) return; } catch { await new Promise((r2) => setTimeout(r2, 350)); }
  }
  throw new Error('server not ready');
};

const run = async () => {
  await mkdir(outputDir, { recursive: true });
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const server = spawn(npm, ['run', 'dev:kart', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    detached: process.platform !== 'win32',
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let browser;
  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch({ headless: true });
    for (const character of CHARACTERS) {
      const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
      await page.goto(`${baseUrl}/?playableAutoplay=1&character=${character}#race`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.__comebackCityKartTelemetry, null, { timeout: 60000 });
      // Grid moment: countdown still up, karts stationary, camera settled.
      await page.waitForTimeout(1200);
      await page.screenshot({
        path: path.join(outputDir, `kart-${character}.png`),
        clip: { x: 520, y: 270, width: 330, height: 300 },
      });
      await page.close();
      console.log('captured kart portrait:', character);
    }
  } finally {
    if (browser) await browser.close();
    try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill('SIGTERM'); }
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
