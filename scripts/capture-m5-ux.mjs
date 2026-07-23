// M5 UX evidence: new-branded select screen (kart portraits + settings
// toggles), reduced-motion race, low-effects race, and the results panel.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.M5_UX_PORT || 5306);
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = path.join(root, 'tmp', 'm5-ux');

const waitForServer = async (url) => {
  const started = Date.now();
  while (Date.now() - started < 30000) {
    try { const r = await fetch(url); if (r.ok) return; } catch { await new Promise((r2) => setTimeout(r2, 350)); }
  }
  throw new Error('server not ready');
};

const run = async () => {
  await mkdir(outputDir, { recursive: true });
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const server = spawn(npm, ['run', 'dev:kart', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    detached: process.platform !== 'win32',
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let browser;
  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch({ headless: true });

    // 1) Select screen (webdriver masked so the flow actually shows).
    const ctx = await browser.newContext({ viewport: { width: 1365, height: 768 } });
    await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
    const select = await ctx.newPage();
    await select.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    const introStart = select.locator('[data-testid="race-intro-start"]');
    if (await introStart.count()) await introStart.click();
    await select.waitForSelector('[data-testid="race-character-select"]', { timeout: 15000 });
    await select.screenshot({ path: path.join(outputDir, 'select-screen.png') });
    // Intro guide with the new item names/icons.
    await select.click('[data-testid="race-open-item-guide"]');
    await select.waitForSelector('[data-testid="race-intro-screen"]', { timeout: 10000 });
    await select.screenshot({ path: path.join(outputDir, 'item-guide.png') });
    await ctx.close();

    // 2) Reduced-motion race (persisted pref).
    const rm = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    await rm.addInitScript(() => window.localStorage.setItem('cc-kart-reduced-motion', '1'));
    await rm.goto(`${baseUrl}/?playableAutoplay=1#race`, { waitUntil: 'networkidle' });
    await rm.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, { timeout: 60000 });
    await rm.waitForTimeout(4000);
    await rm.screenshot({ path: path.join(outputDir, 'reduced-motion-race.png') });
    await rm.close();

    // 3) Low-effects race (persisted pref).
    const le = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    await le.addInitScript(() => window.localStorage.setItem('cc-kart-gfx', 'low'));
    await le.goto(`${baseUrl}/?playableAutoplay=1#race`, { waitUntil: 'networkidle' });
    await le.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, { timeout: 60000 });
    await le.waitForTimeout(4000);
    await le.screenshot({ path: path.join(outputDir, 'low-effects-race.png') });
    await le.close();

    // 4) Results panel (finish a full autoplay race).
    const fin = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    await fin.goto(`${baseUrl}/?playableAutoplay=1#race`, { waitUntil: 'networkidle' });
    await fin.waitForFunction(() => window.__comebackCityKartTelemetry?.finished === true, null, { timeout: 240000 });
    await fin.waitForTimeout(800);
    await fin.screenshot({ path: path.join(outputDir, 'results-panel.png') });
    await fin.close();

    console.log('M5 UX captures written to', path.relative(root, outputDir));
  } finally {
    if (browser) await browser.close();
    try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill('SIGTERM'); }
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
