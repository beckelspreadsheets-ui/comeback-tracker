import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const port = 5307;
const base = `http://127.0.0.1:${port}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('npm', ['run', 'dev:kart', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
try {
  for (let i = 0; i < 60; i += 1) { try { const r = await fetch(base); if (r.ok) break; } catch {} await wait(500); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  await page.goto(`${base}/?track=penguin-village#race`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, { timeout: 25000 });
  await page.keyboard.down('ArrowUp');
  // Lap 2 approach so he's mid-walk: shoot every frame window near 0.995-0.015.
  let shot = 0;
  for (let i = 0; i < 400 && shot < 4; i += 1) {
    const t = await page.evaluate(() => ({ p: window.__comebackCityKartTelemetry?.routeProgress, lap: window.__comebackCityKartTelemetry?.lap }));
    if ((t.p > 0.988 || t.p < 0.013)) {
      await page.screenshot({ path: `tmp/k8-kart-seats/crosser-near-${shot}.png` });
      shot += 1;
      await wait(320);
    } else await wait(120);
  }
  await page.keyboard.up('ArrowUp');
  await browser.close();
  console.log('shots:', shot);
} finally { server.kill('SIGTERM'); }
