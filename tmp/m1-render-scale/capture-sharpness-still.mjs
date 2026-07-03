// A3 sharpness A/B: chase-cam still at a fixed sim position (routeProgress
// 0.10, comeback-city, production build). Run once per built render scale:
//   node tmp/m1-render-scale/capture-sharpness-still.mjs <label>
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const label = process.argv[2] || 'unlabeled';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const PORT = 5311;

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

await mkdir(__dirname, { recursive: true });
const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
});
try {
  await waitForServer(`http://127.0.0.1:${PORT}/`);
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
  await page.goto(`http://127.0.0.1:${PORT}/?raceAutoplay=1#race`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.__comebackCityKartTelemetry?.renderer === 'three-kart',
    null,
    { timeout: 30000 }
  );
  await page.waitForFunction(
    () => (window.__comebackCityKartTelemetry?.routeProgress || 0) >= 0.1,
    null,
    { timeout: 120000 }
  );
  await page.screenshot({ path: path.join(__dirname, `sharpness-p0p10-${label}.png`) });
  const viewportInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas[data-race-renderer="three-kart"]');
    return { height: canvas?.height ?? null, width: canvas?.width ?? null };
  });
  await browser.close();
  console.log(JSON.stringify({ canvasBackingStore: viewportInfo, label }));
} finally {
  server.kill();
}
