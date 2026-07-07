// Mesh bake-off capture: screenshots mesh-bakeoff.html (each candidate GLB
// at 4 yaws) against the running dev server on 5173 (falls back to
// spawning nothing — dev server must be up). Regen:
// node tmp/m3-city-lab/capture-mesh-bakeoff.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS = '/tmp/m3-city-lab/compact-motel-diet.glb,/tmp/m3-city-lab/retro-diner-diet.glb';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
await page.goto(`http://127.0.0.1:5173/tmp/m3-city-lab/mesh-bakeoff.html?models=${encodeURIComponent(MODELS)}`, {
  waitUntil: 'domcontentloaded',
});
await page.waitForFunction(() => Array.isArray(window.__bakeoffStats), null, { timeout: 60000 });
await page.waitForTimeout(800);
const stats = await page.evaluate(() => window.__bakeoffStats);
await page.screenshot({ path: path.join(__dirname, 'motel-replacement-ab.png') });
console.log(JSON.stringify(stats));
await browser.close();
