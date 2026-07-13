// Lifoladen orientation + likeness capture: drives the K4 orientation lab
// on the RUNNING 5173 dev server (never spawn a second vite — dep-cache
// ping-pong) for both the raw and dieted GLBs at yaws 0/90/180/270.
import { chromium } from 'playwright';

const OUT = '/private/tmp/claude-501/-Users-andrewferguson-Downloads-comeback-tracker/35e10574-572b-4920-877d-864f682eeb5f/scratchpad/lifoladen-diet';
const SUBJECTS = [
  { key: 'raw', glb: '/tmp/k6-lifoladen/raw-lifoladen.glb' },
  { key: 'diet', glb: '/tmp/k6-lifoladen/lifoladen-diet.glb' },
];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 640, height: 640 } });
for (const subject of SUBJECTS) {
  await page.goto(`http://localhost:5173/tmp/k4-crosser/orientation.html?glb=${subject.glb}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__orientationReady === true, null, { timeout: 30000 });
  await page.waitForTimeout(400);
  for (const yaw of [0, 90, 180, 270]) {
    await page.evaluate((deg) => window.__setYaw(deg), yaw);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${OUT}/${subject.key}-yaw${yaw}.png` });
  }
  console.log(`${subject.key}: captured 4 yaws`);
}
await browser.close();
