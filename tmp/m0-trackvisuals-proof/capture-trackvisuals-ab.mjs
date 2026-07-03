// P0-3b A/B evidence: ?trackVisuals=1 vs default, comeback-city, top proof
// camera, screenshots keyed on telemetry routeProgress (deterministic sim
// position, not wall clock). Checkpoints: opening district run (~0.10) and
// the return-bend leg (~0.84).
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const PORT = 5309;
const OUT = __dirname;
const CHECKPOINTS = [
  { key: 'opening-0p10', progress: 0.1 },
  { key: 'return-bend-0p84', progress: 0.84 },
];
const VARIANTS = [
  { key: 'flag-off', query: '' },
  { key: 'flag-on', query: '&trackVisuals=1' },
];

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
  throw new Error('vite preview not ready');
};

await mkdir(OUT, { recursive: true });
const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
});
try {
  await waitForServer(`http://127.0.0.1:${PORT}/`);
  const browser = await chromium.launch();
  const summary = {};
  for (const variant of VARIANTS) {
    const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
    await page.goto(
      `http://127.0.0.1:${PORT}/?playableAutoplay=1&proofCamera=top${variant.query}#race`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForFunction(
      () => window.__comebackCityKartTelemetry?.renderer === 'three-kart',
      null,
      { timeout: 30000 }
    );
    for (const checkpoint of CHECKPOINTS) {
      await page.waitForFunction(
        (target) => {
          const t = window.__comebackCityKartTelemetry;
          return t && (t.routeProgress || 0) >= target;
        },
        checkpoint.progress,
        { timeout: 120000 }
      );
      await page.screenshot({ path: path.join(OUT, `${checkpoint.key}-${variant.key}.png`) });
    }
    summary[variant.key] = await page.evaluate(() => {
      const t = window.__comebackCityKartTelemetry;
      return {
        drawCalls: t.rendererStats?.drawCalls ?? null,
        propCount: t.propCount ?? null,
        trackVisualsEnabled: t.trackVisualsEnabled,
        triangles: t.rendererStats?.triangles ?? null,
      };
    });
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(summary, null, 2));
} finally {
  server.kill();
}
