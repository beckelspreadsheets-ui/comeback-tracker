// Split a 4-view ordinal turnaround sheet into individual view PNGs for a
// Meshy multi_image_to_3d lift.
//
//   node scripts/ordinal-sheet-crop.mjs tmp/ordinal-roster/ak47-sheet.png ak47
//
// Writes tmp/ordinal-roster/<slug>-{front,left,back,right}.png.
//
// sharp is not a dependency of this repo, so the crop goes through a Playwright
// canvas — the same trick make-icon-tiles used. Views are assumed evenly spaced
// in one row, which is what the sheet prompt asks for; each crop is trimmed to
// its own content bounds afterwards so a slightly off-centre subject still
// lands centred (Meshy is sensitive to that).
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const [sheetArg, slugArg] = process.argv.slice(2);
if (!sheetArg || !slugArg) {
  console.error('usage: node scripts/ordinal-sheet-crop.mjs <sheet.png> <slug> [viewCount]');
  process.exit(2);
}
const VIEWS = Number(process.argv[4] || 4);
const NAMES = ['front', 'left', 'back', 'right'].slice(0, VIEWS);

const sheetPath = path.resolve(root, sheetArg);
if (!existsSync(sheetPath)) {
  console.error(`sheet not found: ${sheetPath}`);
  process.exit(2);
}
const outDir = path.dirname(sheetPath);
mkdirSync(outDir, { recursive: true });

const dataUrl = `data:image/png;base64,${readFileSync(sheetPath).toString('base64')}`;

const browser = await chromium.launch();
const page = await browser.newPage();
try {
  const crops = await page.evaluate(
    async ([url, views]) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const W = image.naturalWidth;
      const H = image.naturalHeight;

      const full = document.createElement('canvas');
      full.width = W;
      full.height = H;
      const fctx = full.getContext('2d', { willReadFrequently: true });
      fctx.drawImage(image, 0, 0);
      const { data } = fctx.getImageData(0, 0, W, H);

      // The sheet background is a flat light grey. Anything more than a small
      // distance from the corner sample counts as subject.
      const bg = [data[0], data[1], data[2]];
      const isSubject = (x, y) => {
        const i = (y * W + x) * 4;
        return (
          Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) > 34
        );
      };

      const sliceW = Math.floor(W / views);
      const out = [];
      for (let v = 0; v < views; v += 1) {
        const x0 = v * sliceW;
        const x1 = v === views - 1 ? W : x0 + sliceW;
        let minX = x1;
        let maxX = x0;
        let minY = H;
        let maxY = 0;
        for (let y = 0; y < H; y += 1) {
          for (let x = x0; x < x1; x += 1) {
            if (!isSubject(x, y)) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
        if (maxX <= minX || maxY <= minY) {
          out.push(null);
          continue;
        }
        // Square, padded crop keeps proportions consistent between views, which
        // is what lets the multi-view lift agree with itself.
        const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.12);
        const side = Math.max(maxX - minX, maxY - minY) + pad * 2;
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = side;
        canvas.height = side;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
        ctx.fillRect(0, 0, side, side);
        ctx.drawImage(image, cx - side / 2, cy - side / 2, side, side, 0, 0, side, side);
        out.push({ dataUrl: canvas.toDataURL('image/png'), side, bounds: { minX, maxX, minY, maxY } });
      }
      return out;
    },
    [dataUrl, VIEWS]
  );

  crops.forEach((crop, index) => {
    if (!crop) {
      console.log(`[crop] ${NAMES[index]}: EMPTY slice — sheet may not have ${VIEWS} evenly spaced views`);
      return;
    }
    const file = path.join(outDir, `${slugArg}-${NAMES[index]}.png`);
    writeFileSync(file, Buffer.from(crop.dataUrl.split(',')[1], 'base64'));
    console.log(`[crop] ${NAMES[index]}: ${crop.side}x${crop.side} → ${path.relative(root, file)}`);
  });
} finally {
  await browser.close();
}
