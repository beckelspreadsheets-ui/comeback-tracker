// M4 evidence captures: original item set visuals + live cannon hazard.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.M4_CAPTURE_PORT || 5303);
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = path.join(root, 'tmp', 'm4-items');

const waitForServer = async (url) => {
  const started = Date.now();
  while (Date.now() - started < 30000) {
    try { const r = await fetch(url); if (r.ok) return; } catch { await new Promise((r2) => setTimeout(r2, 350)); }
  }
  throw new Error('server not ready');
};

const telemetry = (page) => page.evaluate(() => window.__comebackCityKartTelemetry || null);

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

    // 1) Item showcase — parked item visuals near spawn.
    const show = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    await show.goto(`${baseUrl}/?playableAutoplay=1&itemShowcase=1#race`, { waitUntil: 'networkidle' });
    await show.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, { timeout: 60000 });
    await show.waitForTimeout(2500);
    await show.screenshot({ path: path.join(outputDir, 'item-showcase.png') });
    await show.close();

    // 2) Cannon crosser at the wharf apex + 3) held-item HUD with new icon.
    const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    await page.goto(`${baseUrl}/?playableAutoplay=1#race`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, { timeout: 60000 });
    let gotCannon = false;
    let gotHud = false;
    const deadline = Date.now() + 240000;
    while (Date.now() < deadline && !(gotCannon && gotHud)) {
      const t = await telemetry(page);
      if (t) {
        if (!gotHud && t.heldItem) {
          await page.screenshot({ path: path.join(outputDir, 'hud-held-item.png') });
          console.log('captured hud-held-item:', t.heldItem);
          gotHud = true;
        }
        if (!gotCannon && t.routeProgress > 0.44 && t.routeProgress < 0.5) {
          await page.screenshot({ path: path.join(outputDir, 'cannon-crosser.png') });
          console.log('captured cannon-crosser @', t.routeProgress.toFixed(3));
          gotCannon = true;
        }
      }
      await page.waitForTimeout(100);
    }
    await page.close();
    console.log('M4 captures written to', path.relative(root, outputDir));
  } finally {
    if (browser) await browser.close();
    try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill('SIGTERM'); }
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
