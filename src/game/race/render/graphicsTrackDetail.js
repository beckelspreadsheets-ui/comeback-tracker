// Graphics overhaul — Phase 3 procedural detail maps (track surface).
// Canvas-generated, deterministic (seeded, no Math.random) normal + roughness
// detail maps that give the road asphalt micro-surface: the flat speckle
// texture alone reads as printed plastic at speed; a detail normal breaks the
// sun/bloom specular into believable aggregate, and a varying roughness map
// keeps the wet sheen from looking uniformly airbrushed.
//
// Zero asset bytes (all canvas). Pure builders — the caller assigns them to
// materials. Tiling matches the road's color texture repeat so the detail
// tracks the existing speckle scale.
import * as THREE from 'three';

// Shared deterministic PRNG (same LCG as makeNoiseTexture so the detail
// correlates with the shipped speckle pattern).
const makeRng = (seedStart = 1234567) => {
  let seed = seedStart;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
};

// Grayscale height field of random aggregate blobs, then Sobel -> normal map.
// Resolution kept modest (128) — the road tiles it heavily, so fine detail
// comes from tiling, not texture res. Returns a THREE.CanvasTexture.
export const makeAsphaltDetailNormalMap = ({ size = 128, repeat = 8 } = {}) => {
  const rng = makeRng(777);
  const height = new Float32Array(size * size);
  // Scatter soft height blobs (aggregate stones + cracks).
  for (let blob = 0; blob < 900; blob += 1) {
    const cx = rng() * size;
    const cy = rng() * size;
    const r = 1 + rng() * 3;
    const amp = (rng() - 0.5) * 1.6;
    for (let y = -4; y <= 4; y += 1) {
      for (let x = -4; x <= 4; x += 1) {
        const d = Math.sqrt(x * x + y * y);
        if (d > r) continue;
        const px = (Math.round(cx + x) + size) % size;
        const py = (Math.round(cy + y) + size) % size;
        height[py * size + px] += amp * (1 - d / r);
      }
    }
  }
  // Sobel gradient -> tangent-space normal (Z up-ish, asphalt is near-flat).
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const strength = 2.2;
  const sample = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (sample(x + 1, y) - sample(x - 1, y)) * strength;
      const dy = (sample(x, y + 1) - sample(x, y - 1)) * strength;
      // Normal = normalize(-dx, -dy, 1).
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const nx = -dx * inv;
      const ny = -dy * inv;
      const nz = inv;
      const i = (y * size + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 4;
  return texture;
};

// Varying roughness so the wet sheen pools and breaks like real worn asphalt
// (darker = smoother/shinier patches where the traffic polish is).
export const makeAsphaltRoughnessMap = ({ size = 128, repeat = 8, base = 0.5, variance = 0.4 } = {}) => {
  const rng = makeRng(4242);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  // Low-frequency blotches (polished traffic lines) + high-frequency grain.
  const blotch = [];
  for (let b = 0; b < 24; b += 1) blotch.push({ x: rng() * size, y: rng() * size, r: 12 + rng() * 30, v: rng() });
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let v = 0;
      blotch.forEach((b) => {
        const d = Math.hypot(x - b.x, y - b.y);
        v += b.v * Math.max(0, 1 - d / b.r);
      });
      v = v / blotch.length + rng() * 0.08;
      const rough = Math.min(1, Math.max(0, base + (v - 0.5) * variance));
      const g = rough * 255;
      const i = (y * size + x) * 4;
      img.data[i] = g;
      img.data[i + 1] = g;
      img.data[i + 2] = g;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 4;
  return texture;
};
