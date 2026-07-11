// Diagnose: why doesn't a fitness-SW-controlled client on the live origin
// pick up the kart SW? Seeds phase A exactly like the smoke, then forces
// registration.update() and records every state transition.
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ORIGIN = 'https://comeback-city-kart.pages.dev';
const FITNESS_DIST = path.join(process.cwd(), 'dist');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.webmanifest': 'application/manifest+json', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2',
};
const localFitnessResponse = (url) => {
  const urlPath = decodeURIComponent(new URL(url).pathname);
  let filePath = path.join(FITNESS_DIST, urlPath);
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) filePath = path.join(FITNESS_DIST, 'index.html');
  return { body: readFileSync(filePath), contentType: MIME[path.extname(filePath)] || 'application/octet-stream' };
};

const browser = await chromium.launch();
const context = await browser.newContext();
await context.route(`${ORIGIN}/**`, (route) =>
  route.fulfill({ status: 200, ...localFitnessResponse(route.request().url()) }));
const page = await context.newPage();
page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 200)));
await page.goto(`${ORIGIN}/`);
await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 30000 })
  .catch(() => page.reload().then(() => page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 30000 })));
console.log('seeded: fitness SW controlling, title =', await page.title());

await context.unroute(`${ORIGIN}/**`);

const report = await page.evaluate(async () => {
  const log = [];
  const reg = await navigator.serviceWorker.getRegistration();
  log.push({ event: 'before', active: reg.active?.scriptURL, waiting: !!reg.waiting, installing: !!reg.installing });
  reg.addEventListener('updatefound', () => {
    const w = reg.installing;
    log.push({ event: 'updatefound', state: w?.state });
    w?.addEventListener('statechange', () => log.push({ event: 'statechange', state: w.state }));
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => log.push({ event: 'controllerchange' }));
  try {
    await reg.update();
    log.push({ event: 'update() resolved' });
  } catch (error) {
    log.push({ event: 'update() REJECTED', error: String(error) });
  }
  await new Promise((resolve) => setTimeout(resolve, 30000));
  log.push({
    event: 'final',
    installing: reg.installing?.state ?? null,
    waiting: reg.waiting?.state ?? null,
    active: reg.active?.state ?? null,
    controllerURL: navigator.serviceWorker.controller?.scriptURL ?? null,
  });
  return log;
});
report.forEach((entry) => console.log(JSON.stringify(entry)));
await browser.close();
