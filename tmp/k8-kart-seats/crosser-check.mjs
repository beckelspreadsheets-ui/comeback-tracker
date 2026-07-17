// Screenshot the finish-line crosser with his new sign (PV, right after start).
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
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${base}/?track=penguin-village#race`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 20000 });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, { timeout: 20000 });
  // Crosser is on the finish straight (progress 0.015) — dead ahead at start.
  await wait(400);
  await page.screenshot({ path: 'tmp/k8-kart-seats/crosser-sign-start.png' });
  await page.keyboard.down('ArrowUp');
  await wait(1100);
  await page.screenshot({ path: 'tmp/k8-kart-seats/crosser-sign-close.png' });
  await page.keyboard.up('ArrowUp');
  console.log(JSON.stringify({ errors }, null, 1));
  await browser.close();
  if (errors.length) process.exit(1);
} finally { server.kill('SIGTERM'); }
