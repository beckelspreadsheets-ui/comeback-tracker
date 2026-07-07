// W0 hard-diet quality gate: owner-approved diet mesh (row 1) vs the
// ship-diet s2 mesh (row 2) for each of the six Miami assets.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 5324;
const PAIRS = [
  ['deco-hotel-tripo', 'deco-hotel'],
  ['condo-tower', 'condo-tower'],
  ['corner-arcade-v3', 'corner-arcade'],
  ['palm-cluster', 'palm-cluster'],
  ['lifeguard-tower', 'lifeguard-tower'],
  ['retro-diner', 'retro-diner'],
];

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
  for (const [srcName, outName] of PAIRS) {
    const models = `/tmp/m3-city-lab/${srcName}-diet.glb,/tmp/w0-ship/diet512/${srcName}-s2-512.glb`;
    await page.goto(`http://127.0.0.1:${PORT}/tmp/m3-city-lab/mesh-bakeoff.html?models=${encodeURIComponent(models)}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForFunction(() => Array.isArray(window.__bakeoffStats), null, { timeout: 60000 });
    await page.waitForTimeout(600);
    const stats = await page.evaluate(() => window.__bakeoffStats);
    await page.screenshot({ path: path.join(__dirname, `diet-ab-${outName}.png`) });
    console.log(outName, JSON.stringify(stats.map((s) => s.triangles)));
  }
  await browser.close();
} finally {
  server.kill('SIGTERM');
}
