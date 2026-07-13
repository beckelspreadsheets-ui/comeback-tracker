import { chromium } from 'playwright';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1365, height: 768 } });
await context.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
const page = await context.newPage();
await page.goto('http://localhost:5173/#race', { waitUntil: 'domcontentloaded' });
const intro = page.locator('[data-testid="race-intro-start"], [data-testid="race-intro-continue"], button:has-text("Start")').first();
try { await intro.click({ timeout: 8000 }); } catch {}
await page.waitForSelector('[data-testid="race-open-item-guide"]', { timeout: 30000 });
await page.click('[data-testid="race-open-item-guide"]');
await page.waitForTimeout(600);
await page.screenshot({ path: 'tmp/k7-item-lab/smoke-guide.png' });
console.log('guide captured');
await browser.close();
