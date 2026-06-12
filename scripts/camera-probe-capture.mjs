// Diagnostic probe: screenshots the live race at specific track progress
// values so camera framing can be inspected per track feature (underpass,
// bridge climb, crest, descent). Not part of CI.
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 5310;
const OUT = process.env.PROBE_OUT || 'tmp/camera-probe';
const QUERY = process.env.PROBE_QUERY || '?playableAutoplay=1';
const TARGETS = [0.1, 0.16, 0.19, 0.22, 0.3, 0.45, 0.55, 0.62, 0.68, 0.73, 0.85, 0.97];

mkdirSync(OUT, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
});
await new Promise((resolve) => setTimeout(resolve, 1800));

const browser = await chromium.launch();
try {
  for (const [label, viewport] of [
    ['desktop', { height: 768, width: 1366 }],
    ['mobile', { height: 844, width: 390 }],
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto(`http://127.0.0.1:${PORT}/${QUERY}#race`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
      timeout: 20000,
    });
    const captured = new Set();
    const deadline = Date.now() + 75000;
    while (captured.size < TARGETS.length && Date.now() < deadline) {
      const telemetry = await page.evaluate(() => ({
        finished: window.__comebackCityKartTelemetry?.finished,
        progress: window.__comebackCityKartTelemetry?.routeProgress ?? -1,
      }));
      if (telemetry.finished) break;
      for (const target of TARGETS) {
        if (captured.has(target)) continue;
        if (Math.abs(telemetry.progress - target) < 0.006) {
          captured.add(target);
          await page.screenshot({ path: `${OUT}/${label}-p${String(target).replace('.', '_')}.png` });
        }
      }
      await page.waitForTimeout(40);
    }
    console.log(`${label}: captured ${captured.size}/${TARGETS.length}`, [...captured].sort((a, b) => a - b));
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
