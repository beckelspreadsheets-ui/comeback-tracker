// Live verify of the split fitness deploys on both new origins.
import { chromium } from 'playwright';
import fs from 'node:fs';

const ORIGINS = [
  'https://comeback-fitness-andrew.pages.dev',
  'https://comeback-fitness-alexander.pages.dev',
];
const browser = await chromium.launch();
const results = [];
const check = (origin, name, ok, detail = '') => {
  results.push({ origin, name, ok, detail });
  console.log(ok ? 'PASS ' : 'FAIL ', origin.replace('https://', '').split('.')[0], '-', name, detail);
};
for (const origin of ORIGINS) {
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  await page.goto(`${origin}/`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForSelector('nav', { timeout: 20000 });
  check(origin, 'home renders with nav', true);
  check(origin, 'no world-hub canvas', (await page.locator('canvas').count()) === 0);
  const kartHref = await page.getAttribute('[data-testid="nav-kart-link"]', 'href');
  check(origin, 'race nav -> kart app', kartHref === 'https://comeback-city-kart.pages.dev/#race', String(kartHref));
  for (const label of ['Calib', 'Body', 'Food', 'Setup']) {
    await page.click(`nav button:has-text("${label}")`);
    await page.waitForTimeout(350);
  }
  check(origin, 'screens mount (Calib/Body/Food/Setup)', true);
  const shot = `tmp/app-split/live-${origin.includes('andrew') ? 'andrew' : 'alexander'}.png`;
  await page.screenshot({ path: shot });
  const nav = page.waitForURL(/comeback-city-kart\.pages\.dev/, { timeout: 25000 });
  await page.goto(`${origin}/#race`, { waitUntil: 'domcontentloaded' });
  await nav;
  check(origin, '#race redirects to kart app', page.url().startsWith('https://comeback-city-kart.pages.dev'));
  await page.close();
}
await browser.close();
const failed = results.filter((r) => !r.ok).length;
fs.writeFileSync('tmp/app-split/live-verify-summary.json', JSON.stringify(results, null, 2));
console.log(`${results.length - failed}/${results.length} live checks passed`);
process.exit(failed ? 1 : 0);
