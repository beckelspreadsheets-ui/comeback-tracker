// B1 palette lab: renders Penguin Village under candidate fog/hemi/sun/rim
// value sets and writes one chase-cam capture per candidate at routeProgress
// ~0.30 (the pond-sweep vista — where distance haze reads strongest), plus
// a 0.84 return-bend tile for the two finalists' warm/cool balance.
// Overrides ride ?paletteLab=1 + window.__paletteLabOverrides (dev-only
// hook in createScene); shipped defaults are untouched.
// Output: tmp/m2-palette-lab/<key>-p0p30.png + palette-lab.html contact sheet.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const PORT = 5313;

// Candidate looks. `null` overrides = current shipped default (control).
// Hemi sky/ground colors are LUMA-NORMALIZED to the defaults at capture time
// (see normalizeHemi below): the 2026-07-03 washout showed that raising hemi
// luminance pushes the white snow past the bloom threshold (1.0) and the
// whole frame cascades to white. Variants shift HUE, not brightness.
// Fog colors: scene.background (sky) is fog-EXEMPT, and dark fog barely
// reads on white geometry — icy haze needs pale/milky fog values.
const DEFAULT_HEMI = { sky: '#8d8ce0', ground: '#2a1e4a' };
const VARIANTS = [
  { key: 'v0-current-default', label: 'V0 — current default (purple dusk, shared with Comeback City)', overrides: null },
  {
    key: 'v1-icy-haze',
    label: 'V1 — icy haze: pale milky-blue fog, cyan-shifted hemi, pale winter sun',
    overrides: {
      fog: { color: '#7fa8c8', near: 200, far: 780 },
      hemi: { sky: '#9fd4e8', ground: '#12283f', intensity: 3.3 },
      sunColor: '#ffd9a0',
      rimLightColor: '#00e5ff',
    },
  },
  {
    key: 'v2-deep-polar-night',
    label: 'V2 — deep polar night: dark navy fog pulls distance into darkness',
    overrides: {
      fog: { color: '#0d2438', near: 190, far: 720 },
      hemi: { sky: '#7fb8d8', ground: '#0e1f33', intensity: 3.1 },
      sunColor: '#ffcf95',
      rimLightColor: '#00e5ff',
    },
  },
  {
    key: 'v3-glacier-milk',
    label: 'V3 — glacier milk: brightest haze (near 160), soft whiteout distance',
    overrides: {
      fog: { color: '#a8c8dc', near: 160, far: 740 },
      hemi: { sky: '#b3e2f2', ground: '#16324a', intensity: 3.3 },
      sunColor: '#ffe3b3',
      rimLightColor: '#36e2ff',
    },
  },
  {
    key: 'v4-aurora-teal',
    label: 'V4 — aurora teal: green-shifted haze + mint rim (aurora tie-in)',
    overrides: {
      fog: { color: '#5f9a96', near: 200, far: 760 },
      hemi: { sky: '#96dcd2', ground: '#0f2b31', intensity: 3.3 },
      sunColor: '#ffd9a0',
      rimLightColor: '#3cf5c8',
    },
  },
  {
    key: 'v5-steel-blue',
    label: 'V5 — cold steel blue: desaturated blue-grey haze, palest sun',
    overrides: {
      fog: { color: '#6d87a8', near: 210, far: 780 },
      hemi: { sky: '#a8c8e8', ground: '#14263e', intensity: 3.2 },
      sunColor: '#f2e0c0',
      rimLightColor: '#66d9ff',
    },
  },
  {
    key: 'v6-violet-ice',
    label: 'V6 — violet ice: keeps kinship with Comeback City dusk, colder + hazier',
    overrides: {
      fog: { color: '#8f9cc8', near: 210, far: 780 },
      hemi: { sky: '#a0b8ea', ground: '#1c2748', intensity: 3.3 },
      sunColor: '#ffd0a0',
      rimLightColor: '#7fd4ff',
    },
  },
  {
    key: 'v7-pale-dawn',
    label: 'V7 — pale dawn ice: warm-milk horizon, cream sun',
    overrides: {
      fog: { color: '#c0ccd8', near: 180, far: 760 },
      hemi: { sky: '#cfeaf5', ground: '#1d3a50', intensity: 3.3 },
      sunColor: '#ffe8c8',
      rimLightColor: '#9fe7ff',
    },
  },
  {
    key: 'v8-storm-front',
    label: 'V8 — storm front: closest grey-blue haze (near 150), moody',
    overrides: {
      fog: { color: '#4a6478', near: 150, far: 680 },
      hemi: { sky: '#6fa5c4', ground: '#0a1a2a', intensity: 3.0 },
      sunColor: '#e8c9a0',
      rimLightColor: '#00d5ff',
    },
  },
];

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const rgbToHex = (rgb) =>
  `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;
const luma = (rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
const matchLuma = (hex, referenceHex) => {
  const rgb = hexToRgb(hex);
  const scale = luma(hexToRgb(referenceHex)) / Math.max(1, luma(rgb));
  return rgbToHex(rgb.map((v) => v * scale));
};
const normalizeHemi = (overrides) => {
  if (!overrides?.hemi) return overrides;
  return {
    ...overrides,
    hemi: {
      ...overrides.hemi,
      sky: matchLuma(overrides.hemi.sky, DEFAULT_HEMI.sky),
      ground: matchLuma(overrides.hemi.ground, DEFAULT_HEMI.ground),
    },
  };
};

const waitForServer = async (url, timeoutMs = 30000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error('vite dev not ready');
};

await mkdir(__dirname, { recursive: true });
const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
});
try {
  await waitForServer(`http://127.0.0.1:${PORT}/`);
  const browser = await chromium.launch();
  for (const variant of VARIANTS) {
    const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
    if (variant.overrides) {
      await page.addInitScript((overrides) => {
        window.__paletteLabOverrides = overrides;
      }, normalizeHemi(variant.overrides));
    }
    await page.goto(
      `http://127.0.0.1:${PORT}/?playableAutoplay=1&track=penguin-village&paletteLab=1#race`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForFunction(
      () => window.__comebackCityKartTelemetry?.renderer === 'three-kart',
      null,
      { timeout: 30000 }
    );
    await page.waitForFunction(
      () => (window.__comebackCityKartTelemetry?.routeProgress || 0) >= 0.3,
      null,
      { timeout: 120000 }
    );
    await page.screenshot({ path: path.join(__dirname, `${variant.key}-p0p30.png`) });
    await page.close();
    console.log('captured', variant.key);
  }
  await browser.close();

  const tiles = VARIANTS.map(
    (variant) => `      <figure>
        <img src="/tmp/m2-palette-lab/${variant.key}-p0p30.png" alt="${variant.label}" loading="lazy" />
        <figcaption><strong>${variant.label.split(' — ')[0]}</strong> — ${variant.label.split(' — ')[1]}<br />
        <code>${variant.overrides ? JSON.stringify(normalizeHemi(variant.overrides)) : 'no overrides (shipped default)'}</code></figcaption>
      </figure>`
  ).join('\n');
  const html = `<!doctype html>
<!-- B1 palette lab: Penguin Village atmosphere candidates at routeProgress 0.30
     (pond sweep). Regen: node tmp/m2-palette-lab/capture-palette-variants.mjs -->
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Palette Lab — Penguin Village B1</title>
    <style>
      body { margin: 0; padding: 20px; background: #0c1020; color: #dfe8ff; font: 14px/1.5 -apple-system, sans-serif; }
      h1 { font-size: 18px; }
      p.hint { color: #93a3c8; max-width: 72ch; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(430px, 1fr)); gap: 18px; }
      figure { margin: 0; background: #131a30; border: 1px solid #2a3450; border-radius: 8px; overflow: hidden; }
      img { width: 100%; display: block; }
      figcaption { padding: 10px 12px; }
      code { display: block; margin-top: 6px; font-size: 10px; color: #7f90b8; word-break: break-all; }
    </style>
  </head>
  <body>
    <h1>Palette Lab — Penguin Village atmosphere (B1)</h1>
    <p class="hint">Same sim position (routeProgress 0.30, pond sweep — the open vista where
    distance haze reads strongest). Pick a number, or name two to blend/iterate. The winner
    lands as the penguinVillage.js palette diff; Comeback City is untouched either way.
    V0 is today's shipped look for reference.</p>
    <div class="grid">
${tiles}
    </div>
  </body>
</html>
`;
  await writeFile(path.join(root, 'palette-lab.html'), html);
  console.log('wrote palette-lab.html');
} finally {
  server.kill();
}
