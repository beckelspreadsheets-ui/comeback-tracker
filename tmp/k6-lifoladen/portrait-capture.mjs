// One-off lifoladen portrait via the RUNNING 5173 dev server (never spawn a
// second vite — dep-cache ping-pong). Lab-verified +Z front → hero pose 0.55
// (the Tripo pose minus the -π/2 facing correction Tripo rigs need).
import { chromium } from 'playwright';

const OUT = 'src/assets/game/select/char-lifoladen.png';
const YAW = 0.55;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { height: 480, width: 480 } });
await page.goto(
  `http://localhost:5173/select-portraits.html?model=${encodeURIComponent('/src/assets/game/models/avatars/lifoladen.glb')}&yaw=${YAW}`,
  { waitUntil: 'networkidle' }
);
await page.waitForFunction(() => window.__portraitReady === true, null, { timeout: 30000 });
await page.waitForTimeout(400);
await page.locator('canvas').screenshot({ omitBackground: true, path: OUT });
await browser.close();
console.log(`wrote ${OUT}`);
