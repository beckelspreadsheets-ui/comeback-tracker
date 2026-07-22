// M2 probe: reads telemetry to confirm the player's character/kart identity
// and counts driver rigs by kind inside the live scene (via a one-off
// THREE devtools walk on the WebGL canvas's __threeRoot if exposed).
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = 5299;
const baseUrl = `http://127.0.0.1:${port}`;

const waitForServer = async (url) => {
  const started = Date.now();
  while (Date.now() - started < 30000) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch { await new Promise((r2) => setTimeout(r2, 350)); }
  }
  throw new Error('server not ready');
};

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const server = spawn(npm, ['run', 'dev:kart', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: root,
  detached: true,
  env: { ...process.env, BROWSER: 'none' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let browser;
try {
  await waitForServer(baseUrl);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/?playableAutoplay=1#race`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, { timeout: 60000 });
  const telemetry = await page.evaluate(() => window.__comebackCityKartTelemetry || null);
  console.log(JSON.stringify({ character: telemetry?.character, kart: telemetry?.kart, track: telemetry?.track, rivalCount: telemetry?.rivalCount }));
  const rigs = await page.evaluate(() => {
    const models = window.__kartDebugModels;
    if (!models?.playerModel) return { error: 'no debug models' };
    const kinds = [];
    models.playerModel.group.traverse((node) => {
      if (node.userData?.kind) kinds.push(node.userData.kind);
    });
    return { kinds };
  });
  console.log(JSON.stringify(rigs, null, 1));
  if (rigs.error || !rigs.kinds.includes('ordinal-driver-isethius') || !rigs.kinds.includes('inscription-kart-body-orbit-rover')) {
    console.error('FAIL: player model does not carry the isethius driver + orbit-rover body');
    process.exit(1);
  }
  if (telemetry?.character !== 'isethius') {
    console.error('FAIL: default character is not isethius');
    process.exit(1);
  }
  console.log('M2 identity probe PASS');
  // Isolate the player kart: hide every other kart, screenshot, restore.
  await page.evaluate(() => {
    const models = window.__kartDebugModels;
    const scene = models.playerModel.group.parent;
    scene.traverse((node) => {
      if (node.userData?.kind === 'grounded-rival-kart') node.visible = false;
    });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/player-only.png' });
  await page.evaluate(() => {
    const models = window.__kartDebugModels;
    const scene = models.playerModel.group.parent;
    scene.traverse((node) => {
      if (node.userData?.kind === 'grounded-rival-kart') node.visible = true;
    });
  });
} finally {
  if (browser) await browser.close();
  try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill('SIGTERM'); }
}
