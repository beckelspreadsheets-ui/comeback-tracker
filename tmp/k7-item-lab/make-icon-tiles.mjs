// K7 icon tiles: center-crop the 1024px concept renders and emit 192px webp
// tiles for the HUD/guide (ITEM_ICON_URLS). Crop keeps the subject oversized
// in-tile — the race-speed readability rule applied to UI. Uses Playwright's
// canvas (sharp is not in this repo's dependency tree).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const OUT = 'src/assets/game/items';
const CROP = 0.78; // subjects are centered with generous margins
const ICONS = [
  ['aurora', 'tmp/k7-item-lab/aurora.png'],
  ['avalanche', 'tmp/k7-item-lab/avalanche.png'],
  ['blizzard', 'tmp/k7-item-lab/blizzard-cloud.png'],
  ['carrot', 'tmp/k7-item-lab/carrot.png'],
  ['cocoa', 'tmp/k7-item-lab/cocoa.png'],
  ['fishbone', 'tmp/k7-item-lab/fish-bone.png'],
  ['iceshard', 'tmp/k7-item-lab/iceshard.png'],
  ['iceshield', 'tmp/k7-item-lab/ice-shield.png'],
  ['march', 'tmp/k7-item-lab/march.png'],
  ['sardine', 'tmp/k7-item-lab/sardine-rocket.png'],
  ['slapfish', 'tmp/k7-item-lab/slapfish.png'],
  ['snowball', 'tmp/k7-item-lab/snowball.png'],
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [key, source] of ICONS) {
  const base64 = (await readFile(source)).toString('base64');
  const dataUrl = await page.evaluate(async ({ b64, crop }) => {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = `data:image/png;base64,${b64}`;
    });
    const side = Math.round(Math.min(image.width, image.height) * crop);
    const left = Math.round((image.width - side) / 2);
    const top = Math.round((image.height - side) / 2);
    const canvas = document.createElement('canvas');
    canvas.width = 192;
    canvas.height = 192;
    canvas.getContext('2d').drawImage(image, left, top, side, side, 0, 0, 192, 192);
    return canvas.toDataURL('image/webp', 0.8);
  }, { b64: base64, crop: CROP });
  const out = `${OUT}/item-${key}.webp`;
  await writeFile(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`wrote ${out}`);
}
await browser.close();
