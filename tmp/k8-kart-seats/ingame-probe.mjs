// In-game probe: each new kart seeded via ?kart=, verify telemetry runs it,
// zero console errors, and capture a rolling shot for the likeness record.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const port = 5306;
const base = `http://127.0.0.1:${port}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('npm', ['run', 'dev:kart', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
const results = [];
try {
  for (let i = 0; i < 60; i += 1) {
    try { const r = await fetch(base); if (r.ok) break; } catch {}
    await wait(500);
  }
  const browser = await chromium.launch();
  for (const kart of ['iceblock', 'btckart']) {
    const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${base}/?kart=${kart}#race`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 20000 });
    await page.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, { timeout: 20000 });
    await page.keyboard.down('ArrowUp');
    await wait(2500);
    await page.screenshot({ path: `tmp/k8-kart-seats/ingame-${kart}.png` });
    await page.keyboard.up('ArrowUp');
    const t = await page.evaluate(() => window.__comebackCityKartTelemetry);
    results.push({ kart, ranAs: t.kart, speed: t.speed, errors: errors.length });
    await page.close();
  }
  await browser.close();
} finally {
  server.kill('SIGTERM');
}
console.log(JSON.stringify(results, null, 1));
if (!results.every((r) => r.kart === r.ranAs && r.errors === 0 && r.speed > 50)) process.exit(1);
