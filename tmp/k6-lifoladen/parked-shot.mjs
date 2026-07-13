// Parked close-up: lifoladen on the Miami Cruiser at the start line, no
// autoplay, countdown cleared — the seated-look check the handoff asks for.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
await page.goto('http://localhost:5173/?character=lifoladen&kart=miamicruiser#race', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 45000 });
await page.waitForTimeout(6500);
await page.screenshot({ path: 'tmp/k6-lifoladen/parked-player.png' });
await browser.close();
console.log('wrote parked-player.png');
