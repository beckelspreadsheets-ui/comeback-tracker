import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 480, height: 480 } });
for (const name of ['fishbone', 'snowball', 'avalanche']) {
  await page.goto(`http://localhost:5173/tmp/k4-crosser/orientation.html?glb=/tmp/k7-item-lab/${name}-diet.glb`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__orientationReady === true, null, { timeout: 30000 });
  await page.waitForTimeout(300);
  for (const yaw of [0, 90]) {
    await page.evaluate((d) => window.__setYaw(d), yaw);
    await page.waitForTimeout(120);
    await page.screenshot({ path: `tmp/k7-item-lab/orient-${name}-${yaw}.png` });
  }
  console.log(`${name} captured`);
}
await browser.close();
