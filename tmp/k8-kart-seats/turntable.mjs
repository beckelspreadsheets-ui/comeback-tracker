import { chromium } from 'playwright';
const KARTS = ['ice-block-diet-384', 'btc-kart-diet'];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
for (const kart of KARTS) {
  await page.goto(`http://localhost:5173/tmp/k4-crosser/orientation.html?glb=/tmp/k8-kart-seats/${kart}.glb`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__orientationReady === true, null, { timeout: 45000 });
  for (const yaw of [0, 90, 180, 270]) {
    await page.evaluate((y) => window.__setYaw(y), yaw);
    await page.waitForTimeout(200);
    await page.screenshot({ path: `tmp/k8-kart-seats/turn-${kart}-${yaw}.png` });
  }
  console.log('captured', kart);
}
await browser.close();
