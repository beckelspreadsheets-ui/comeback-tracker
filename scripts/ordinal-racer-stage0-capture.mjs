#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const root = process.cwd();
const out = path.join(root, 'tmp/ordinal-racer-prototype/stage0/gameplay');
const base = 'http://127.0.0.1:5338';
const server = spawn('npm', ['run', 'preview:kart', '--', '--host', '127.0.0.1', '--port', '5338', '--strictPort'], { cwd: root, stdio: 'ignore' });
const captures = [];
const waitServer = async () => {
  for (let i = 0; i < 100; i += 1) {
    try { if ((await fetch(base)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('preview server did not become ready');
};
await mkdir(out, { recursive: true });
try {
  await waitServer();
  const browser = await chromium.launch();
  for (const character of ['seth-penguin', 'layer23']) {
    for (const preset of [{ key: 'desktop', viewport: { width: 1440, height: 900 } }, { key: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true }]) {
      const context = await browser.newContext({ viewport: preset.viewport, isMobile: preset.isMobile });
      await context.addInitScript(() => {
        Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false });
        localStorage.setItem('cc-kart-intro-seen', '1');
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${base}/index.kart.html?character=${character}&kart=kenney&track=comeback-city`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="race-character-select"]');
      const selectName = `${character}__${preset.key}__character-select.png`;
      await page.screenshot({ path: path.join(out, selectName) });
      captures.push({ character, preset: preset.key, view: 'character-select', path: selectName, errors: [...errors] });
      await page.getByTestId('race-character-start').click();
      await page.waitForSelector('[data-testid="comeback-city-3d-kart-race"][data-race-renderer="three-kart"]', { timeout: 30000 });
      await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 30000 });
      await page.waitForTimeout(2500);
      const raceName = `${character}__${preset.key}__chase-race-seated-kart.png`;
      await page.screenshot({ path: path.join(out, raceName) });
      captures.push({ character, preset: preset.key, view: 'chase-race-seated-kart', path: raceName, errors: [...errors], telemetry: await page.evaluate(() => window.__comebackCityKartTelemetry || null) });
      await context.close();
    }
  }
  await browser.close();
  await writeFile(path.join(out, 'capture-report.json'), `${JSON.stringify({ generatedAtUtc: new Date().toISOString(), captures }, null, 2)}\n`);
  console.log(`wrote ${path.relative(root, out)} (${captures.length} captures)`);
} finally {
  server.kill('SIGTERM');
}
