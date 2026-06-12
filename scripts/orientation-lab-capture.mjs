// Captures the orientation lab (orientation-lab.html) — ground truth for
// every model's native facing so rig yaws are authored, never guessed.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const PORT = 5303;
const OUT = path.join(root, 'tmp', 'orientation-lab');

const waitForServer = async (url, timeoutMs = 30000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error('vite dev server not ready');
};

await mkdir(OUT, { recursive: true });
const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
});
try {
  await waitForServer(`http://127.0.0.1:${PORT}/orientation-lab.html`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { height: 1100, width: 1500 } });
  await page.goto(`http://127.0.0.1:${PORT}/orientation-lab.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__labLoaded >= 7, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'lab.png') });
  await browser.close();
  console.log('wrote tmp/orientation-lab/lab.png');
} finally {
  server.kill();
}
