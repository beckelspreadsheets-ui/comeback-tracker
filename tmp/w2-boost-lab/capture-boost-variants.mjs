// W2 boost-pad clarity lab capture (house pattern: telemetry
// routeProgress-keyed screenshots, PORT 5316). V0 control + 3 candidates,
// each tiled at an APPROACH shot (the "can you read it at speed" test) and
// an AT-PAD shot, on Comeback City's start-boulevard pad (progress 0.055).
// Regen: node tmp/w2-boost-lab/capture-boost-variants.mjs
// Output: tmp/w2-boost-lab/<variant>-<shot>.png + boost-lab.html tiles.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 5316;
const BASE = `http://127.0.0.1:${PORT}`;
const VARIANTS = [
  { key: 'control', label: 'V0 control (shipped)', variant: null },
  { key: 'v1-hot-chevrons', label: 'V1 hot chevrons — amber, 5 oversized sweeps', variant: 'v1' },
  { key: 'v2-raised-slab', label: 'V2 raised ramp slab — 3D wedge + lip bar', variant: 'v2' },
  { key: 'v3-light-gate', label: 'V3 light gate — pylons + glowing crossbar', variant: 'v3' },
];
// bridge-climb-pad progress 0.435, keyed on LAP 2 (full race speed, field
// spread out — lap-1 start-grid shots hid the pad behind rivals and the
// launch decals). far = ~reaction distance at race speed (~120wu), near =
// commit distance (~36wu), at = on the pad.
const SHOTS = [
  { key: 'far', progress: 0.395 },
  { key: 'near', progress: 0.423 },
  { key: 'at-pad', progress: 0.434 },
];

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
  const telemetrySummary = [];
  for (const entry of VARIANTS) {
    const context = await browser.newContext({ viewport: { height: 768, width: 1365 } });
    if (entry.variant) {
      await context.addInitScript((variant) => {
        window.__boostLabOverrides = { variant };
      }, entry.variant);
    }
    const page = await context.newPage();
    const boostParam = entry.variant ? '&boostLab=1' : '';
    await page.goto(`${BASE}/?playableAutoplay=1&track=comeback-city${boostParam}#race`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
      timeout: 30000,
    });
    await page.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, { timeout: 30000 });
    for (const shot of SHOTS) {
      // lap >= 2: screenshot latency can push the kart past a window — the
      // next lap's pass over the same pad is an equally valid tile.
      await page.waitForFunction(
        (target) => {
          const t = window.__comebackCityKartTelemetry;
          return t && !t.finished && t.lap >= 2 && t.routeProgress >= target && t.routeProgress < target + 0.02;
        },
        shot.progress,
        { timeout: 120000 }
      );
      await page.screenshot({ path: path.join(__dirname, `${entry.key}-${shot.key}.png`) });
    }
    const t = await page.evaluate(() => window.__comebackCityKartTelemetry);
    telemetrySummary.push({ boostHits: t.boostHits, key: entry.key, speed: t.speed });
    await context.close();
    console.log(`${entry.key} captured`);
  }
  await browser.close();
  console.log(JSON.stringify(telemetrySummary));
} finally {
  server.kill('SIGTERM');
}
