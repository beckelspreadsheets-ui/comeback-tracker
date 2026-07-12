// Phone-size UI sweep: race HUD + results panel + restart across phone
// viewports (portrait soft-locked + landscape). Finishes a race via
// playableAutoplay to reach the results panel.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const server = spawn('npx', ['vite', 'preview', '--config', 'vite.config.kart.js', '--port', '5339', '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch();
for (const [name, viewport] of [['landscape', { width: 844, height: 390 }], ['portrait', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:5339/?playableAutoplay=1&touchControls=1&track=comeback-city#race`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.raceTime > 5, null, { timeout: 60000 });
  await page.screenshot({ path: `tmp/k3-mobile-controls-smoke/sweep-${name}-race.png` });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.finished === true, null, { timeout: 180000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `tmp/k3-mobile-controls-smoke/sweep-${name}-results.png` });
  const results = await page.evaluate(() => {
    const panel = document.querySelector('.three-kart-race__results');
    if (!panel) return { panel: false };
    const r = panel.getBoundingClientRect();
    return { panel: true, top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), winW: window.innerWidth, winH: window.innerHeight };
  });
  console.log(name, 'results panel:', JSON.stringify(results));
  await ctx.close();
}
await browser.close();
server.kill();
