// K5: capture 4-yaw turntables for the five raw kart lifts (served by the
// owner's running vite dev server on 5173, which serves tmp/ + node_modules).
import { chromium } from 'playwright';
const KARTS = ['cyber-lowrider', 'ice-racer', 'gold-gp', 'miami-cruiser', 'stealth-speedster'];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
for (const kart of KARTS) {
  await page.goto(`http://localhost:5173/tmp/k4-crosser/orientation.html?glb=/tmp/w4-kart-lab/raw-${kart}.glb`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__orientationReady === true, null, { timeout: 45000 });
  for (const yaw of [30, 120, 210, 300]) {
    await page.evaluate((y) => window.__setYaw(y), yaw);
    await page.waitForTimeout(200);
    await page.screenshot({ path: `tmp/w4-kart-lab/turn-${kart}-${yaw}.png` });
  }
  console.log('captured', kart);
}
await browser.close();
