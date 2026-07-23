// M5 probe: for each character URL seed, assert the mounted driver rig +
// kart body match the pick (pixel reads at 330px are ambiguous by design).
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = 5305;
const baseUrl = `http://127.0.0.1:${port}`;
const EXPECT = {
  isethius: ['ordinal-driver-isethius', 'inscription-kart-body-orbit-rover'],
  't-clow': ['ordinal-driver-t-clow', 'inscription-kart-body-deck-runner'],
  layer23: ['ordinal-driver-layer23', 'inscription-kart-body-mesa-strider'],
};

const waitForServer = async (url) => {
  const started = Date.now();
  while (Date.now() - started < 30000) {
    try { const r = await fetch(url); if (r.ok) return; } catch { await new Promise((r2) => setTimeout(r2, 350)); }
  }
  throw new Error('server not ready');
};

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const server = spawn(npm, ['run', 'dev:kart', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: root, detached: true, env: { ...process.env, BROWSER: 'none' }, stdio: ['ignore', 'pipe', 'pipe'],
});
let browser;
let failures = 0;
try {
  await waitForServer(baseUrl);
  browser = await chromium.launch({ headless: true });
  for (const [character, kinds] of Object.entries(EXPECT)) {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/?playableAutoplay=1&character=${character}#race`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__comebackCityKartTelemetry, null, { timeout: 60000 });
    const found = await page.evaluate(() => {
      const out = [];
      window.__kartDebugModels?.playerModel?.group?.traverse((node) => {
        if (node.userData?.kind) out.push(node.userData.kind);
      });
      return { character: window.__comebackCityKartTelemetry?.character, kart: window.__comebackCityKartTelemetry?.kart, kinds: out };
    });
    const ok = kinds.every((kind) => found.kinds.includes(kind)) && found.character === character;
    console.log(character, ok ? 'PASS' : 'FAIL', JSON.stringify(found));
    if (!ok) failures += 1;
    await page.close();
  }
} finally {
  if (browser) await browser.close();
  try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill('SIGTERM'); }
}
process.exit(failures ? 1 : 0);
