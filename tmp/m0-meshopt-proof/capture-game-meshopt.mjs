// P0-2/P0-3a evidence: meshopt-compressed GLBs (mizzle avatar + ice-sled kart,
// tclow/layer23 as rivals) render textured in the shipped game (#race) with
// zero console errors. One-off probe; pattern from orientation-lab-capture.mjs.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const PORT = 5304;
const OUT = path.join(root, 'tmp', 'm0-meshopt-proof');

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
  await waitForServer(`http://127.0.0.1:${PORT}/`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
  // /api/sync/* is a Cloudflare Pages Function — absent on bare vite dev, so
  // its 404 (and the generic console line it triggers) is environmental noise,
  // not a renderer/loader error.
  const consoleErrors = [];
  let syncNoise = 0;
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    if (msg.text().includes('Failed to load resource') && syncNoise > 0) {
      syncNoise -= 1;
      return;
    }
    consoleErrors.push(msg.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));
  page.on('response', (response) => {
    if (response.status() < 400) return;
    if (new URL(response.url()).pathname.startsWith('/api/sync/')) {
      syncNoise += 1;
      return;
    }
    consoleErrors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(
    `http://127.0.0.1:${PORT}/?character=mizzle&kart=icesled&raceAutoplay=1#race`,
    { waitUntil: 'networkidle' }
  );
  await page.waitForFunction(
    () => window.__comebackCityKartTelemetry?.renderer === 'three-kart',
    null,
    { timeout: 30000 }
  );
  // Ride through the countdown into open play so avatars + karts are on screen.
  await page.waitForTimeout(9000);
  await page.screenshot({ path: path.join(OUT, 'game-mizzle-icesled-meshopt.png') });
  const telemetry = await page.evaluate(() => window.__comebackCityKartTelemetry);
  await browser.close();
  console.log(JSON.stringify({
    consoleErrors,
    raceTime: telemetry?.raceTime ?? null,
    renderer: telemetry?.renderer ?? null,
  }, null, 2));
  if (consoleErrors.length) {
    console.error('FAIL: console errors present');
    process.exit(1);
  }
  console.log('wrote tmp/m0-meshopt-proof/game-mizzle-icesled-meshopt.png (zero console errors)');
} finally {
  server.kill();
}
