// Deterministic verification for the rival value-spread fix (AAA item 8).
// Replicates makeKartPaletteTexture's swatch recolour math EXACTLY (same THREE
// ops, same constants) for both the OLD hsl.l carry and the NEW luma carry, and
// measures the OUTPUT value-spread of each body swatch. No canvas, no browser,
// no pixel A/B — pure math on the shipped PNG, so it is load-independent and
// reproducible. Goal: the orange cell (swatch 1), flat under hsl.l, gains real
// internal spread under luma, while each swatch's MEAN output level is preserved.
import { PNG } from 'pngjs';
import fs from 'node:fs';
import * as THREE from 'three';

const png = PNG.sync.read(fs.readFileSync('src/assets/game/models/toy-car-kit/colormap.png'));
const W = png.width;
const H = png.height;
const data = png.data; // RGBA bytes

// Mirror of KENNEY_BODY_SWATCHES + KENNEY_SWATCH_CONTRAST in the monolith.
const SWATCHES = [
  { name: 'grey-body', lightScale: 1, satScale: 1, u0: 64 / 512, u1: 128 / 512, v0: 384 / 512, v1: 512 / 512 },
  { name: 'kit-orange', lumaCarry: true, lightScale: 1.42, satScale: 0.3, u0: 192 / 512, u1: 256 / 512, v0: 256 / 512, v1: 384 / 512 },
];
const CONTRAST = 2.1;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lumaAt = (i) => (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;

function recolour(bodyHex, mode) {
  const targetHsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(bodyHex).getHSL(targetHsl);
  const probe = new THREE.Color();
  const hsl = { h: 0, s: 0, l: 0 };
  return SWATCHES.map((sw) => {
    const x0 = Math.round(sw.u0 * W), x1 = Math.round(sw.u1 * W);
    const y0 = Math.round(sw.v0 * H), y1 = Math.round(sw.v1 * H);
    // 'old' = hsl.l everywhere; 'new' = luma only where the swatch is flagged
    // lumaCarry (the shipping hybrid), hsl.l otherwise.
    const useLuma = mode === 'new' && sw.lumaCarry;
    const carry = (idx) => {
      if (useLuma) return lumaAt(idx);
      probe.setRGB(data[idx] / 255, data[idx + 1] / 255, data[idx + 2] / 255); probe.getHSL(hsl); return hsl.l;
    };
    // pass 1: mean of the carried value
    let mean = 0, n = 0;
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
      mean += carry((y * W + x) * 4);
      n += 1;
    }
    mean = n ? mean / n : 0.5;
    const level = 0.65 + targetHsl.l * 0.5;
    const saturation = clamp(targetHsl.s * sw.satScale, 0.3 * sw.satScale, 0.55);
    // pass 2: apply expansion, measure OUTPUT luma (bytes the code would emit are probe.r/g/b*255)
    let omin = 1, omax = 0, osum = 0, srcMin = 1, srcMax = 0;
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
      const idx = (y * W + x) * 4;
      const value = carry(idx);
      srcMin = Math.min(srcMin, value); srcMax = Math.max(srcMax, value);
      const spread = clamp(mean + (value - mean) * CONTRAST, 0, 1);
      probe.setHSL(targetHsl.h, saturation, clamp(spread * level * sw.lightScale, 0.04, 0.92));
      const ol = 0.299 * probe.r + 0.587 * probe.g + 0.114 * probe.b;
      omin = Math.min(omin, ol); omax = Math.max(omax, ol); osum += ol;
    }
    return {
      swatch: sw.name,
      srcCarrySpread: +(srcMax - srcMin).toFixed(4),
      mean: +mean.toFixed(4),
      outLumaMean: +(osum / n).toFixed(4),
      outLumaSpread: +(omax - omin).toFixed(4),
    };
  });
}

// KART_CHARACTERS rival hues (violet Seth, orange Mizzle) + a blue for contrast.
const hues = { sethViolet: '#7e35f4', mizzleOrange: '#f28b2e', blueRival: '#3aa0ff' };
for (const [name, hex] of Object.entries(hues)) {
  const oldR = recolour(hex, 'old');
  const newR = recolour(hex, 'new');
  console.log(`\n== ${name} ${hex} ==`);
  for (let i = 0; i < SWATCHES.length; i += 1) {
    console.log(
      `  ${SWATCHES[i].name.padEnd(11)} OLD outSpread ${oldR[i].outLumaSpread.toFixed(3)} (mean ${oldR[i].outLumaMean.toFixed(3)})` +
      `  ->  NEW outSpread ${newR[i].outLumaSpread.toFixed(3)} (mean ${newR[i].outLumaMean.toFixed(3)})` +
      `  | srcCarry old ${oldR[i].srcCarrySpread.toFixed(3)} new ${newR[i].srcCarrySpread.toFixed(3)}`,
    );
  }
}
