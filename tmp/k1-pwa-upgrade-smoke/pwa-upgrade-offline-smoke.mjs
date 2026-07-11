// K1 acceptance smoke: proves the two deploy-shaped criteria BEFORE deploy.
//   A. Installed-PWA upgrade path: a client whose service worker came from the
//      FITNESS build (what comeback-city-kart.pages.dev serves pre-K1)
//      receives the kart shell on its next visit once dist-kart is served —
//      the registerType:'autoUpdate' + registerSW(updateSW(true)) path.
//   B. Offline replay: after one online race on the kart build, a full
//      offline reload still races (SW precache + the K1 glb/webp CacheFirst
//      runtime route). Offline = the server is actually killed, not emulated.
// Serves dist/ then dist-kart/ from a tiny static server on a loopback ALIAS
// (e.g. 127.10.42.67): loopback is a secure context so the SW registers, but
// the hostname is not in main.jsx's localhost skip-list — and unlike the LAN
// IP, the macOS firewall doesn't eat it. If no alias exists:
//   sudo ifconfig lo0 alias 127.10.42.67
// Run: node tmp/k1-pwa-upgrade-smoke/pwa-upgrade-offline-smoke.mjs
import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const PORT = 5327;
const root = process.cwd();
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const skipList = new Set(['127.0.0.1', 'localhost', '::1']);
const hostIp = Object.values(networkInterfaces())
  .flat()
  .find((i) => i && i.family === 'IPv4' && i.address.startsWith('127.') && !skipList.has(i.address))?.address;
if (!hostIp) {
  console.error('No loopback alias found — add one:  sudo ifconfig lo0 alias 127.10.42.67');
  process.exit(2);
}
const BASE = `http://${hostIp}:${PORT}`;
console.log(`serving on ${BASE}`);

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.webmanifest': 'application/manifest+json', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2',
};
let servedDir = path.join(root, 'dist'); // phase A starts on the fitness build
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let filePath = path.join(servedDir, urlPath);
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = path.join(servedDir, 'index.html'); // SPA fallback (= _redirects)
  }
  const ext = path.extname(filePath);
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  if (urlPath === '/sw.js' || urlPath === '/registerSW.js') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // = _headers
  }
  createReadStream(filePath).pipe(res);
});
await new Promise((resolve) => server.listen(PORT, resolve));

const browser = await chromium.launch(); // 127.0.0.0/8 is a secure context by spec

try {
  // --- Phase A: install the FITNESS SW, then swap the served dir to dist-kart ---
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller || navigator.serviceWorker?.ready.then(() => true),
    null, { timeout: 30000 }
  );
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 30000 })
    .catch(() => page.reload().then(() => page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 30000 })));
  const fitnessTitle = await page.title();
  check('fitness SW installed + controlling', true, `title="${fitnessTitle}"`);

  servedDir = path.join(root, 'dist-kart'); // the K1 deploy happens
  await page.reload();
  // Old SW serves the cached fitness shell; its registerSW sees the new
  // /sw.js (no-store), installs it, updateSW(true) skips waiting, and the
  // page self-reloads into the kart shell.
  await page.waitForFunction(() => document.title === 'Penguin Kart', null, { timeout: 60000 });
  await page.waitForSelector('[data-testid="race-screen"]', { timeout: 30000 });
  check('installed fitness SW swaps to kart shell on next visit', true, `title="${await page.title()}"`);
  await ctx.close();

  // --- Phase B: one online race, then REAL offline (server killed) ---
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.goto(`${BASE}/?playableAutoplay=1#race`);
  await page2.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 30000 })
    .catch(() => page2.reload().then(() => page2.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 30000 })));
  await page2.waitForFunction(
    () => window.__comebackCityKartTelemetry?.raceTime > 5 && window.__comebackCityKartTelemetry?.miamiMounts?.failed === 0,
    null, { timeout: 60000 }
  );
  check('online race running through kart SW', true);
  // Let the CacheFirst runtime route finish persisting GLB/backdrop responses.
  await page2.waitForTimeout(2000);

  await new Promise((resolve) => server.close(resolve)); // REAL offline
  await page2.goto(`${BASE}/?playableAutoplay=1#race`, { waitUntil: 'domcontentloaded' });
  await page2.waitForSelector('[data-testid="comeback-city-3d-kart-race"]', { timeout: 30000 });
  await page2.waitForFunction(
    () => {
      const t = window.__comebackCityKartTelemetry;
      return t && t.renderer === 'three-kart' && t.raceTime > 3 && t.miamiMounts?.failed === 0 && t.miamiMounts?.mounted === t.miamiMounts?.requested;
    },
    null, { timeout: 60000 }
  );
  const offlineMounts = await page2.evaluate(() => window.__comebackCityKartTelemetry.miamiMounts);
  check('OFFLINE replay races with all mounts', true, JSON.stringify(offlineMounts));
  await ctx2.close();
} catch (error) {
  check(`aborted: ${error.message.split('\n')[0]}`, false);
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
