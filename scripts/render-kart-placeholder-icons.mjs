// K1: renders the PLACEHOLDER Penguin Kart PWA icons (public-kart/*.png)
// from public-kart/favicon.svg. Rerun when the owner delivers the real
// name/art:  node scripts/render-kart-placeholder-icons.mjs
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const svg = readFileSync(resolve(root, 'public-kart/favicon.svg'), 'utf8');

// Maskable variant: full-bleed ink background, artwork scaled into the ~80%
// safe zone so launcher masks never clip the wheel.
const maskableSvg = svg
  .replace('rx="96"', 'rx="0"')
  .replace(
    /(<rect width="512" height="512"[^/]*\/>)/,
    '$1<g transform="translate(256 256) scale(0.72) translate(-256 -256)">'
  )
  .replace('</svg>', '</g></svg>');

const targets = [
  { file: 'public-kart/icon-192.png', size: 192, source: svg },
  { file: 'public-kart/icon-512.png', size: 512, source: svg },
  { file: 'public-kart/icon-maskable-512.png', size: 512, source: maskableSvg },
  { file: 'public-kart/apple-touch-icon.png', size: 180, source: maskableSvg },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
for (const { file, size, source } of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0"><img id="icon" width="${size}" height="${size}" src="data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}"></body>`
  );
  await page.locator('#icon').screenshot({ path: resolve(root, file), omitBackground: true });
  console.log(`wrote ${file} (${size}x${size})`);
}
await browser.close();
