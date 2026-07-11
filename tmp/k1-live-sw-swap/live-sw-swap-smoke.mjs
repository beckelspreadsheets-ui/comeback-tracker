// K1 post-deploy live check: the fitness→kart SW swap ON THE LIVE ORIGIN.
// The pre-K1 fitness deploy is no longer served, so we seed the "returning
// fitness user" state by intercepting all requests on the REAL origin and
// fulfilling them from the local dist/ (fitness build, K1-verified
// byte-identical to what live served pre-K1). The fitness SW installs and
// controls against https://comeback-city-kart.pages.dev. Then interception
// is dropped and the client talks to the REAL live deploy: its registerSW
// fetches the live /sw.js (kart SW, no-store), installs it, updateSW(true)
// skips waiting, and the page self-reloads into the kart shell.
// Phase B: online race on live, then context.setOffline(true) — replay must
// run entirely from the SW caches.
// Run: PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS=1 node tmp/k1-live-sw-swap/live-sw-swap-smoke.mjs
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ORIGIN = 'https://comeback-city-kart.pages.dev';
const FITNESS_DIST = path.join(process.cwd(), 'dist');
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.webmanifest': 'application/manifest+json', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2',
};
const localFitnessResponse = (url) => {
  const urlPath = decodeURIComponent(new URL(url).pathname);
  let filePath = path.join(FITNESS_DIST, urlPath);
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = path.join(FITNESS_DIST, 'index.html'); // SPA fallback (= _redirects)
  }
  return {
    body: readFileSync(filePath),
    contentType: MIME[path.extname(filePath)] || 'application/octet-stream',
  };
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1365, height: 768 } });
const swFetches = [];

try {
  // --- Phase A: fitness SW installs + controls against the live origin ---
  await context.route(`${ORIGIN}/**`, (route) => {
    const url = route.request().url();
    if (route.request().serviceWorker()) swFetches.push(url);
    const { body, contentType } = localFitnessResponse(url);
    // The real pre-K1 deploy served sw.js/registerSW.js no-store (_headers).
    // Without this, Chrome HTTP-caches the seeded fitness sw.js and later
    // update checks see stale bytes — a seeding artifact, not real behavior.
    const urlPath = new URL(url).pathname;
    const headers = urlPath === '/sw.js' || urlPath === '/registerSW.js'
      ? { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      : undefined;
    return route.fulfill({ status: 200, body, contentType, headers });
  });
  const page = await context.newPage();
  await page.goto(`${ORIGIN}/`);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 30000 })
    .catch(() => page.reload().then(() => page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 30000 })));
  const fitnessTitle = await page.title();
  check(
    'fitness SW installed + controlling on live origin',
    /Comeback/.test(fitnessTitle) && swFetches.length > 0,
    `title="${fitnessTitle}", swPrecacheFetchesIntercepted=${swFetches.length}`
  );

  // --- The K1 deploy "happens" for this client: stop faking, use real live ---
  await context.unroute(`${ORIGIN}/**`);
  page.on('console', (m) => { if (m.type() === 'error') console.log('  [console.error]', m.text().slice(0, 160)); });
  const swState = () => page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return {
      title: document.title,
      installing: reg?.installing?.state ?? null,
      waiting: reg?.waiting?.state ?? null,
      active: reg?.active?.state ?? null,
      controller: Boolean(navigator.serviceWorker.controller),
    };
  });
  // Old fitness SW serves its cached shell. Chrome only FORCES the sw.js
  // update check on navigation when the registration is stale (>24h old) —
  // true for every real returning user, impossible to fake for our
  // seconds-old seeded registration. So: reload once and give the browser a
  // chance to auto-check; if it doesn't, simulate the stale-registration
  // forced check with registration.update() — the exact fetch a real
  // returning user's navigation performs — and require the full swap.
  await page.reload();
  let swapPath = 'auto (navigation update check)';
  let swapped = await page
    .waitForFunction(() => document.title === 'Penguin Kart', null, { timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  if (!swapped) {
    console.log('  [no auto-check on fresh registration]', JSON.stringify(await swState()));
    swapPath = 'forced update() (= stale-registration navigation check)';
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((reg) => reg.update()).catch(() => {}));
    swapped = await page
      .waitForFunction(() => document.title === 'Penguin Kart', null, { timeout: 60000 })
      .then(() => true)
      .catch(() => false);
  }
  if (swapped) await page.waitForSelector('[data-testid="race-screen"]', { timeout: 30000 });
  check(
    'installed fitness client swaps to kart shell from LIVE deploy',
    swapped,
    swapped ? `title="${await page.title()}", via ${swapPath}` : JSON.stringify(await swState())
  );
  await page.close();
  if (!swapped) throw new Error('swap did not complete');

  // --- Phase B: online race on live, then REAL offline via setOffline ---
  const page2 = await context.newPage();
  await page2.goto(`${ORIGIN}/?playableAutoplay=1#race`);
  await page2.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 30000 })
    .catch(() => page2.reload().then(() => page2.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 30000 })));
  await page2.waitForFunction(
    () => window.__comebackCityKartTelemetry?.raceTime > 5 && window.__comebackCityKartTelemetry?.miamiMounts?.failed === 0,
    null, { timeout: 90000 }
  );
  check('online race running through kart SW on live', true);
  await page2.waitForTimeout(2000); // let the CacheFirst runtime route persist GLBs/backdrops

  await context.setOffline(true);
  await page2.goto(`${ORIGIN}/?playableAutoplay=1#race`, { waitUntil: 'domcontentloaded' });
  await page2.waitForSelector('[data-testid="comeback-city-3d-kart-race"]', { timeout: 30000 });
  await page2.waitForFunction(
    () => {
      const t = window.__comebackCityKartTelemetry;
      return t && t.renderer === 'three-kart' && t.raceTime > 3 && t.miamiMounts?.failed === 0 && t.miamiMounts?.mounted === t.miamiMounts?.requested;
    },
    null, { timeout: 60000 }
  );
  const offlineMounts = await page2.evaluate(() => window.__comebackCityKartTelemetry.miamiMounts);
  check('OFFLINE replay on live origin races with all mounts', true, JSON.stringify(offlineMounts));
  await page2.close();
} catch (error) {
  check(`aborted: ${error.message.split('\n')[0]}`, false);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
