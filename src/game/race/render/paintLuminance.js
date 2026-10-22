// Respray reference for a kart body's albedo map: the mean LINEAR luminance of
// its PAINT texels, picked with the same chroma window the kart shader uses to
// classify paint (KART_SHADING_DESKTOP.paintChroma).
//
// Why a bought paint needs it. The racer tint (setKartPaintTint) is
// luminance-PRESERVING: it rescales the tint to the lit surface's own
// luminance, which is right for identity (the bake keeps its tonal design) and
// wrong for a respray. The Hero Kart is a deep red at linear luminance ~0.19,
// so Ice Cyan came out slate, Satoshi Silver a mauve grey and Midnight Gold
// mustard — every light paint landed at the dark red's brightness. Dividing by
// THIS number instead of by the tint's own luminance keeps each texel's
// brightness RELATIVE to the body's average (panel shading, creases, baked AO
// all survive) while the average itself becomes the paint's.
//
// Measured once per texture on a small thumbnail and cached on
// texture.userData; null when the image cannot be read (no DOM, a tainted or
// compressed image) or the body has almost no paint, and callers then keep the
// luminance-preserving tint.
import { KART_SHADING_DESKTOP } from './kartMaterials.js';

const THUMB = 96;
const SRGB_TO_LINEAR = Array.from({ length: 256 }, (_, index) => {
  const c = index / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});
const smoothstep = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

// Pure: mean paint luminance of an RGBA byte array (sRGB-encoded, as a 2D
// canvas returns it). Exported so the node gate can check the classifier.
export const paintLuminanceOfPixels = (data, chroma = KART_SHADING_DESKTOP.paintChroma) => {
  let weight = 0;
  let sum = 0;
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 8) continue;
    const r = SRGB_TO_LINEAR[data[index]];
    const g = SRGB_TO_LINEAR[data[index + 1]];
    const b = SRGB_TO_LINEAR[data[index + 2]];
    const mask = smoothstep(chroma[0], chroma[1], Math.max(r, g, b) - Math.min(r, g, b));
    if (mask <= 0) continue;
    weight += mask;
    sum += mask * (0.2126 * r + 0.7152 * g + 0.0722 * b);
  }
  // Under 1% paint coverage there is no body colour to respray against.
  return weight > (data.length / 4) * 0.01 ? sum / weight : null;
};

export const measurePaintLuminance = (texture, chroma = KART_SHADING_DESKTOP.paintChroma) => {
  const image = texture?.image;
  if (!image || typeof document === 'undefined') return null;
  const key = `${chroma[0]}:${chroma[1]}`;
  const cache = texture.userData?.kartPaintLuminance || {};
  if (key in cache) return cache[key];
  let result = null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = THUMB;
    canvas.height = THUMB;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, THUMB, THUMB);
    result = paintLuminanceOfPixels(context.getImageData(0, 0, THUMB, THUMB).data, chroma);
  } catch {
    result = null;
  }
  texture.userData = texture.userData || {};
  texture.userData.kartPaintLuminance = { ...cache, [key]: result };
  return result;
};
