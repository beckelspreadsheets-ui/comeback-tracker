// M2 hero-slice capture: effects-off (?gfx=off) and default frames, desktop + mobile.
// Serves dist-kart via vite preview, waits for telemetry, grabs timed frames.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PORT = 5401;
const OUT = 'tmp/overnight-major-rebuild/evidence/m2-hero-slice';
fs.mkdirSync(OUT, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--config', 'vite.config.kart.js', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 2500));

const browser = await chromium.launch();
const shots = [
  { name: 'desktop-gfx-off', w: 1365, h: 768, url: `http://127.0.0.1:${PORT}/?playableAutoplay=1&gfx=off#race`, wait: 9000 },
  { name: 'desktop-default', w: 1365, h: 768, url: `http://127.0.0.1:${PORT}/?playableAutoplay=1#race`, wait: 9000 },
  { name: 'mobile-gfx-off', w: 390, h: 844, url: `http://127.0.0.1:${PORT}/?playableAutoplay=1&gfx=off#race`, wait: 9000 },
  { name: 'pv-desktop-default', w: 1365, h: 768, url: `http://127.0.0.1:${PORT}/?playableAutoplay=1&track=penguin-village#race`, wait: 9000 },
];
const results = {};
for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: shot.w, height: shot.h } });
  await page.goto(shot.url, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForFunction(() => window.__comebackCityKartTelemetry, { timeout: 30000 });
  } catch {
    results[shot.name] = 'telemetry-timeout';
  }
  await page.waitForTimeout(shot.wait);
  const telemetry = await page.evaluate(() => {
    const t = window.__comebackCityKartTelemetry || {};
    return {
      drawCalls: t.rendererStats?.drawCalls,
      triangles: t.rendererStats?.triangles,
      fpsEstimate: t.fpsEstimate,
      frameWorkMs: t.frameWorkMs,
      speed: t.speed,
      lap: t.lap,
    };
  });
  results[shot.name] = telemetry;
  await page.screenshot({ path: `${OUT}/${shot.name}.png` });
  await page.close();
}
fs.writeFileSync(`${OUT}/capture-telemetry.json`, JSON.stringify(results, null, 2));
await browser.close();
server.kill();
console.log(JSON.stringify(results, null, 2));
