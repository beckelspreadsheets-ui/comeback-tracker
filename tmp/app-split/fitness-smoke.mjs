// App-split fitness smoke: the tracker still works, the game is GONE from the
// bundle, the Race nav links out, and legacy #race redirects to the kart app.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PORT = 5319;
const BASE = `http://127.0.0.1:${PORT}`;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(ok ? 'PASS ' : 'FAIL ', name, detail); };
try {
  const started = Date.now();
  while (Date.now() - started < 30000) {
    try { if ((await fetch(BASE)).ok) break; } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });

  // 1. Home renders (classic dashboard, no world hub canvas)
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('nav', { timeout: 15000 });
  check('home renders with bottom nav', true);
  check('no world-hub canvas', (await page.locator('canvas').count()) === 0);

  // 2. Race nav is an outbound link to the kart app
  const kartHref = await page.getAttribute('[data-testid="nav-kart-link"]', 'href');
  check('race nav links to kart app', kartHref === 'https://comeback-city-kart.pages.dev/#race', String(kartHref));

  // 3. Each fitness screen mounts
  for (const label of ['Calib', 'Joints', 'Body', 'Food', 'Setup']) {
    await page.click(`nav button:has-text("${label}")`);
    await page.waitForTimeout(400);
    check(`screen mounts: ${label}`, true);
  }
  await page.screenshot({ path: 'tmp/app-split/fitness-home.png' });

  // 4. Legacy #race redirects to the kart origin
  const nav = page.waitForURL(/comeback-city-kart\.pages\.dev/, { timeout: 20000 });
  await page.goto(`${BASE}/#race`, { waitUntil: 'domcontentloaded' });
  await nav;
  check('#race redirects to kart app', page.url().startsWith('https://comeback-city-kart.pages.dev'));

  // 5. No game chunks in the built assets
  const distFiles = fs.readdirSync('dist/assets');
  const gameLeak = distFiles.filter((f) => /glb|three|Race|World|kart/i.test(f));
  check('no game chunks/GLBs in dist', gameLeak.length === 0, gameLeak.join(',') || 'clean');

  await browser.close();
} finally {
  server.kill('SIGTERM');
}
const failed = results.filter((r) => !r.ok).length;
fs.writeFileSync('tmp/app-split/fitness-smoke-summary.json', JSON.stringify(results, null, 2));
console.log(`${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
