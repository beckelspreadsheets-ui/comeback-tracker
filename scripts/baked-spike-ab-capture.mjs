// A/B screenshots for the Blender bake spike: same camera beat on the gym
// sweeper, current procedural look vs ?bakedSpike=1 overlay.
// Requires `npm run build` to have produced dist/ with the runtime flag.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const PORT = 5301;
const OUT = path.join(root, 'tmp', 'baked-spike');
const TARGET = 0.105; // mid gym-sweeper, inside the baked segment (0.055–0.165)

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
  throw new Error('preview server not ready');
};

const captureAt = async (browser, query, file) => {
  const page = await browser.newPage({ viewport: { height: 768, width: 1366 } });
  await page.goto(`http://127.0.0.1:${PORT}/?raceAutoplay=1${query}#race`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
    timeout: 20000,
  });
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const progress = await page.evaluate(() => window.__comebackCityKartTelemetry?.routeProgress ?? -1);
    if (Math.abs(progress - TARGET) < 0.004) {
      await page.screenshot({ path: path.join(OUT, file) });
      await page.close();
      return true;
    }
    await page.waitForTimeout(30);
  }
  await page.close();
  throw new Error(`never reached progress ${TARGET} for ${file}`);
};

await mkdir(OUT, { recursive: true });
const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
});
try {
  await waitForServer(`http://127.0.0.1:${PORT}/`);
  const browser = await chromium.launch();
  try {
    await captureAt(browser, '', 'ab-current.png');
    await captureAt(browser, '&bakedSpike=1', 'ab-baked.png');
    console.log('A/B captures written to tmp/baked-spike/');
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}
