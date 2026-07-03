// Isolate which palette component causes the washout: fog-only, hemi-only,
// sun-only against the V1 values.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const PORT = 5313;
const CASES = [
  { key: 'iso-fog-extreme', overrides: { fog: { color: '#ff0000', near: 10, far: 100 } } },
];

const waitForServer = async (url) => {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('server');
};

const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
});
try {
  await waitForServer(`http://127.0.0.1:${PORT}/`);
  const browser = await chromium.launch();
  for (const c of CASES) {
    const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
    await page.addInitScript((o) => {
      window.__paletteLabOverrides = o;
    }, c.overrides);
    await page.goto(`http://127.0.0.1:${PORT}/?playableAutoplay=1&track=penguin-village&paletteLab=1#race`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
      timeout: 30000,
    });
    await page.waitForFunction(() => (window.__comebackCityKartTelemetry?.routeProgress || 0) >= 0.3, null, {
      timeout: 120000,
    });
    await page.screenshot({ path: path.join(__dirname, `${c.key}.png`) });
    await page.close();
    console.log('captured', c.key);
  }
  await browser.close();
} finally {
  server.kill();
}
