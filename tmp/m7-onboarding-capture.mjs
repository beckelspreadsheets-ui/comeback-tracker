// M7 evidence: onboarding (intro + select screens) and roster sheet captures.
// Uses --disable-blink-features=AutomationControlled so navigator.webdriver is
// false and the REAL first-session intro/select flow shows (QA skips it).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PORT = 5402;
const OUT = 'tmp/overnight-major-rebuild/evidence/m7-onboarding-roster';
fs.mkdirSync(OUT, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--config', 'vite.config.kart.js', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 2500));

const browser = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
const results = {};

for (const [label, viewport] of [
  ['desktop', { width: 1365, height: 768 }],
  ['mobile', { width: 390, height: 844 }],
]) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/#race`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const introVisible = await page.locator('[data-testid="race-intro-screen"]').isVisible().catch(() => false);
  results[`${label}-intro`] = introVisible ? 'shown' : 'missing';
  if (introVisible) await page.screenshot({ path: `${OUT}/${label}-intro.png` });
  await page.locator('[data-testid="race-intro-start"]').click().catch(() => {});
  await page.waitForTimeout(1200);
  const selectVisible = await page.locator('[data-testid="race-character-select"]').isVisible().catch(() => false);
  results[`${label}-select`] = selectVisible ? 'shown' : 'missing';
  if (selectVisible) await page.screenshot({ path: `${OUT}/${label}-select.png`, fullPage: viewport.width > 500 });
  if (selectVisible) {
    // Roster readability probe: each character card present.
    const characters = await page.locator('[data-testid^="race-character-"]').all();
    results[`${label}-roster-cards`] = characters.length;
    // Start the race from select to prove the first-session path end-to-end.
    await page.locator('[data-testid="race-character-start"]').click().catch(() => {});
    await page.waitForTimeout(4000);
    const racing = await page.evaluate(() => Boolean(window.__comebackCityKartTelemetry));
    results[`${label}-race-started`] = racing ? 'yes' : 'no';
    await page.screenshot({ path: `${OUT}/${label}-first-race.png` });
  }
  await context.close();
}
fs.writeFileSync(`${OUT}/onboarding-report.json`, JSON.stringify(results, null, 2));
await browser.close();
server.kill();
console.log(JSON.stringify(results, null, 2));
