// Post-deploy probe for a Cloudflare Pages deploy of the kart game (preview or
// production): every track on desktop (Satoshi Summit is a preview track,
// reached by ?track=) plus one forced-touch landscape phone
// run. Fails on CSP refusals (blob: textures, meshopt WASM), failed GLB mounts,
// page errors, or a race that never starts. Also checks the store pages.
//
//   node scripts/verify-preview-deploy.mjs https://<hash>.comeback-city-kart.pages.dev [outDir]
//
// Probe the UNIQUE deployment URL wrangler prints, not the branch alias: the
// alias can serve the previous deploy for ~30-60 s after "Deployment complete".
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { chromiumGlArgs } from './lib/chromium-gl-args.mjs';

const BASE = (process.argv[2] || '').replace(/\/$/, '');
const OUT = path.resolve(process.argv[3] || 'tmp/preview-check');
if (!BASE) {
  console.error('usage: node scripts/verify-preview-deploy.mjs <deploy url> [outDir]');
  process.exit(2);
}
mkdirSync(OUT, { recursive: true });
const runs = [
  { name: 'cc-desktop', query: '&track=comeback-city', viewport: { width: 1365, height: 768 } },
  { name: 'pv-desktop', query: '&track=penguin-village', viewport: { width: 1365, height: 768 } },
  { name: 'ss-desktop', query: '&track=satoshi-summit', viewport: { width: 1365, height: 768 } },
  { name: 'cc-phone', phone: true, query: '&track=comeback-city&touchControls=1', viewport: { width: 844, height: 390 } },
];
const browser = await chromium.launch({ args: chromiumGlArgs() });
let failed = false;
for (const run of runs) {
  const context = await browser.newContext({
    deviceScaleFactor: run.phone ? 2 : 1,
    hasTouch: Boolean(run.phone),
    isMobile: Boolean(run.phone),
    viewport: run.viewport,
  });
  const page = await context.newPage();
  const cspErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    const text = message.text();
    if (/Content Security Policy|Couldn't load texture blob:|WebAssembly/i.test(text)) cspErrors.push(text.slice(0, 160));
  });
  page.on('pageerror', (error) => pageErrors.push(String(error).slice(0, 160)));
  try {
    await page.goto(`${BASE}/?playableAutoplay=1${run.query}#race`, { timeout: 90000, waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 90000 });
    await page.waitForFunction(() => window.__comebackCityKartTelemetry?.raceTime > 5, null, { timeout: 120000 });
    const t = await page.evaluate(() => window.__comebackCityKartTelemetry);
    await page.screenshot({ path: path.join(OUT, `${run.name}.png`) });
    const ok = cspErrors.length === 0 && pageErrors.length === 0 && (t.miamiMounts?.failed ?? 0) === 0;
    console.log(
      run.name,
      JSON.stringify({ cspErrors: cspErrors.length, miamiMounts: t.miamiMounts, pageErrors: pageErrors.length, renderScale: t.renderScale, track: t.track }),
      ok ? 'OK' : 'FAIL'
    );
    if (!ok) {
      failed = true;
      [...cspErrors, ...pageErrors].slice(0, 4).forEach((line) => console.error('  ', line));
    }
  } catch (error) {
    failed = true;
    console.log(run.name, 'FAIL', String(error).slice(0, 200));
  }
  await context.close();
}
// The App Store support and privacy URLs must answer with the pages, not the game.
for (const page of ['privacy', 'support']) {
  try {
    const response = await fetch(`${BASE}/${page}.html`, { redirect: 'follow' });
    const body = await response.text();
    const ok = response.ok && /Penguin Kart/i.test(body) && !/id="root"/.test(body);
    console.log(`${page}.html`, response.status, ok ? 'OK' : 'FAIL');
    if (!ok) failed = true;
  } catch (error) {
    failed = true;
    console.log(`${page}.html`, 'FAIL', String(error).slice(0, 120));
  }
}
await browser.close();
console.log(failed ? 'DEPLOY VERIFY FAILED' : 'DEPLOY VERIFIED');
process.exitCode = failed ? 1 : 0;
