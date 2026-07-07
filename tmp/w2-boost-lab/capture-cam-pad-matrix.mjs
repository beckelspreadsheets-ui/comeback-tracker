// W2 boost-pad round 2: SMALL CAMERA ADJUSTMENTS × pad treatment, FAR tile
// only (the owner's ask: "seeing it better on the approach so you can hit
// them ... even if small camera adjustments"). Same bridge-climb pad and
// telemetry keying as capture-boost-variants.mjs.
// Regen: node tmp/w2-boost-lab/capture-cam-pad-matrix.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 5316;
const BASE = `http://127.0.0.1:${PORT}`;
const CAMERAS = [
  { key: 'cam-stock', label: 'stock camera (h10.5 / look 30)', overrides: null },
  { key: 'cam-higher', label: 'higher eye (h13.5)', overrides: { height: 13.5 } },
  { key: 'cam-look-further', label: 'look further (look 44 / up 5.5)', overrides: { lookAhead: 44, lookUp: 5.5 } },
  { key: 'cam-combo', label: 'combo (h12.5 / look 40 / up 5)', overrides: { height: 12.5, lookAhead: 40, lookUp: 5 } },
];
const PADS = [
  { key: 'pad-v0', variant: null },
  { key: 'pad-v3', variant: 'v3' },
];
const FAR_PROGRESS = 0.395;

const waitForServer = async (url, timeoutMs = 60000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* retry */
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error('vite not ready');
};

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: path.join(__dirname, '..', '..'),
  stdio: 'ignore',
});
try {
  await waitForServer(BASE);
  const browser = await chromium.launch();
  for (const cam of CAMERAS) {
    for (const pad of PADS) {
      const context = await browser.newContext({ viewport: { height: 768, width: 1365 } });
      await context.addInitScript(
        ({ camera, variant }) => {
          if (camera) window.__camLabOverrides = camera;
          if (variant) window.__boostLabOverrides = { variant };
        },
        { camera: cam.overrides, variant: pad.variant }
      );
      const page = await context.newPage();
      const params = ['playableAutoplay=1', 'track=comeback-city'];
      if (cam.overrides) params.push('camLab=1');
      if (pad.variant) params.push('boostLab=1');
      await page.goto(`${BASE}/?${params.join('&')}#race`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
        timeout: 30000,
      });
      await page.waitForFunction(
        (target) => {
          const t = window.__comebackCityKartTelemetry;
          return t && !t.finished && t.lap >= 2 && t.routeProgress >= target && t.routeProgress < target + 0.02;
        },
        FAR_PROGRESS,
        { timeout: 120000 }
      );
      await page.screenshot({ path: path.join(__dirname, `${cam.key}-${pad.key}-far.png`) });
      await context.close();
      console.log(`${cam.key} × ${pad.key} captured`);
    }
  }
  await browser.close();
} finally {
  server.kill('SIGTERM');
}
