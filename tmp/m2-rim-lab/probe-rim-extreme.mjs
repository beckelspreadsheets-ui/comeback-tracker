// One-shot sanity probe (not a gate tile): absurd rim values — if the
// injection reaches the GPU, every hero silhouette screams magenta. Proves
// the ?rimLab=1 + __rimLabOverrides path end-to-end before trusting the
// subtle candidate tiles. Output: probe-extreme-crop.png / probe-off-crop.png.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const PORT = 5314;
const CROP = { height: 270, width: 480, x: 560, y: 330 };

const waitForServer = async () => {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/`);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('vite dev not ready');
};

const shoot = async (browser, key, overrides) => {
  const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
  if (overrides) {
    await page.addInitScript((value) => {
      window.__rimLabOverrides = value;
    }, overrides);
  }
  const rimQuery = overrides ? '&rimLab=1' : '';
  await page.goto(`http://127.0.0.1:${PORT}/?playableAutoplay=1&track=comeback-city${rimQuery}#race`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
    timeout: 30000,
  });
  await page.waitForFunction(() => (window.__comebackCityKartTelemetry?.routeProgress || 0) >= 0.3, null, {
    timeout: 120000,
  });
  await page.screenshot({ clip: CROP, path: path.join(__dirname, `${key}-crop.png`) });
  await page.close();
};

const run = async () => {
  const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  });
  let browser = null;
  try {
    await waitForServer();
    browser = await chromium.launch();
    await shoot(browser, 'probe-off', null);
    await shoot(browser, 'probe-extreme', { power: 1.0, strength: 4.0, tint: '#ff00ff' });
    console.log('probe captures written');
  } finally {
    await browser?.close();
    server.kill();
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
