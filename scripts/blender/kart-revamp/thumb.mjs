// Select-screen thumbnail candidate for a kart GLB, made in the same booth
// (select-portraits.html, 480 x 480, transparent) and at the same pose as the
// shipped thumbnails. Writes wherever it is told: it never replaces a file in
// src/assets/game/select.
//   node scripts/blender/kart-revamp/thumb.mjs <repo-relative glb> <out.png> [nose: -x | +x] [fit]
// fit (default 6, the booth's own) is the size the model is scaled to; lower
// it when the default crops the kart.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { chromiumGlArgs } from '../../lib/chromium-gl-args.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const [model, out, nose = '-x', fit = '6'] = process.argv.slice(2);
const PORT = Number(process.env.THUMB_PORT || 5378);
// the poses scripts/select-portraits-capture.mjs uses
const yaw = (nose === '-x' ? Math.PI / 2 : -Math.PI / 2) + 0.55;

const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' });
let browser;
try {
  const end = Date.now() + 30000;
  let up = false;
  while (!up && Date.now() < end) {
    try {
      up = (await fetch(`http://127.0.0.1:${PORT}/select-portraits.html`)).ok;
    } catch {}
    if (!up) await new Promise((resolve) => setTimeout(resolve, 300));
  }
  if (!up) throw new Error('vite dev server not ready');
  browser = await chromium.launch({ args: chromiumGlArgs() });
  const page = await browser.newPage({ viewport: { height: 480, width: 480 } });
  await page.goto(`http://127.0.0.1:${PORT}/select-portraits.html?model=${encodeURIComponent(`/${model}`)}&yaw=${yaw}&fit=${fit}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__portraitReady === true, null, { timeout: 30000 });
  await page.waitForTimeout(400);
  await page.locator('canvas').screenshot({ omitBackground: true, path: path.resolve(out) });
  console.log(`wrote ${out}`);
} finally {
  await browser?.close();
  server.kill();
}
