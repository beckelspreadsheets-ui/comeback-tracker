// Satoshi Summit horizon — generated at runtime, zero image bytes.
//
// The two shipped tracks hang painted webp plates on the backdrop rings
// (cc-far/near, pv-far/near). The image budget has no room for a third pair, so
// this track paints its own onto canvases at scene build: a far range of snowy
// alpine peaks standing out of a SEA OF CLOUDS, and a nearer row of darker rock
// spires with cloud wisps at their feet. The monolith's ring shader takes them
// exactly like the plates (alpha = mountain, transparent = the dome's sky).
//
// It also builds the AURORA: curtain ribbons on a camera-locked cylinder just
// inside camera.far, BEHIND the far ring (renderOrder below it, so the painted
// peaks cover the curtains' feet, and every world mesh occludes them by depth),
// additive, animated off the shared ambient clock. A continuous glowing hem
// with rays climbing out of it — Penguin Village's wave-4 note records why a
// soft continuous additive SHEET reads as a grey smear instead.
import * as THREE from 'three';
import { AMBIENT_SWAY_TIME } from './toonRimShader.js';

const W = 2048;
const H = 512;
// Deterministic 0..1 hash: the same track must look the same on every boot.
const hash01 = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
};

// One mountain layer: [seed, harmonics, sharpness, top v, base v, crest snow
// depth, rock, rock low, snow lit, snow, snow shade]. The ridge is a sum of
// INTEGER harmonics (so the plate tiles round the ring without a seam) folded
// into alpine ridges; the snow cap deepens with altitude and lights on the
// slopes facing +x; dark gullies run down from the crest.
const paintRange = (ctx, [seed, harmonics, sharp, topV, baseV, crest, rock, rockLow, lit, snow, shade]) => {
  const top = (1 - topV) * H;
  const base = (1 - baseV) * H;
  const terms = [];
  for (let k = 1; k <= harmonics; k += 1) terms.push([k ** -0.85, k, hash01(seed * 31 + k) * Math.PI * 2]);
  const norm = terms.reduce((sum, term) => sum + term[0], 0);
  const heights = new Float32Array(W);
  for (let x = 0; x < W; x += 1) {
    let sum = 0;
    for (const [amp, k, phase] of terms) sum += amp * Math.sin((x / W) * Math.PI * 2 * k + phase);
    const value = sum / norm;
    const ridged = (1 - Math.abs(value)) ** 2;
    heights[x] = top + (1 - (sharp * ridged + (1 - sharp) * (value * 0.5 + 0.5))) * (base - top);
  }
  const body = ctx.createLinearGradient(0, top, 0, H);
  body.addColorStop(0, rock);
  body.addColorStop(1, rockLow);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, H);
  heights.forEach((h, x) => ctx.lineTo(x, h));
  ctx.lineTo(W, H);
  ctx.fill();
  heights.forEach((h, x) => {
    const altitude = 1 - (h - top) / (base - top);
    const slope = heights[(x + 1) % W] - heights[(x + W - 1) % W];
    ctx.fillStyle = slope > 0.15 ? lit : slope < -0.15 ? shade : snow;
    ctx.fillRect(x, h, 1, 4 + altitude * altitude * crest);
  });
  ctx.strokeStyle = rockLow;
  ctx.globalAlpha = 0.55;
  for (let index = 0; index < 160; index += 1) {
    const x = Math.floor(hash01(seed * 97 + index) * W);
    ctx.lineWidth = 1 + hash01(seed + index * 7) * 2;
    ctx.beginPath();
    ctx.moveTo(x, heights[x] + 3);
    ctx.lineTo(x + (hash01(index + seed * 5) - 0.5) * 18, heights[x] + 10 + hash01(seed * 13 + index) * (base - heights[x]) * 0.7);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

// The cloud sea: flat overlapping billows along a band, lit on top, body below;
// each billow is drawn three times across the seam so the ring never shows one.
const paintClouds = (ctx, [seed, topV, bottomV, body, highlight, shade, alpha]) => {
  const top = (1 - topV) * H;
  const rows = (topV - bottomV) * H;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = body;
  ctx.fillRect(0, top + rows * 0.45, W, H);
  for (let index = 0; index < 240; index += 1) {
    const y = top + hash01(seed * 23 + index) * rows * 0.7;
    const radius = 18 + hash01(seed * 29 + index) * 44;
    for (let tile = -1; tile <= 1; tile += 1) {
      const x = hash01(seed * 17 + index) * W + tile * W;
      const gradient = ctx.createRadialGradient(x, y - radius * 0.35, radius * 0.1, x, y, radius);
      gradient.addColorStop(0, highlight);
      gradient.addColorStop(0.55, body);
      gradient.addColorStop(1, shade);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(x, y, radius * 2.8, radius * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
};

const plate = (ranges, clouds) => {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ranges.forEach((range) => paintRange(ctx, range));
  paintClouds(ctx, clouds);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

let cachedStrips = null;
// { far, near } textures for the monolith's backdrop rings, built once per
// session. FAR (ring r780, h380, centre y140 -> world y -50..330): a tall hazy
// range and a lower darker one, peaks topping out at v~0.62 (~14 degrees over
// a valley camera) with the cloud sea filling v 0..0.34, so it meets the
// fogged ground at the horizon from the valley and lies just under eye level
// from the summit. NEAR (r590, h210, y78 -> -27..183): dark rock spires with
// broken half-transparent wisps at their feet.
export const createSummitBackdropStrips = () => {
  if (typeof document === 'undefined') return null;
  if (!cachedStrips) cachedStrips = {
    far: plate(
      [
        [3, 9, 0.72, 0.62, 0.3, 26, '#4b4f8e', '#5b5f9c', '#c9cdf4', '#a9aee4', '#8a8fc9'],
        [11, 12, 0.8, 0.47, 0.26, 18, '#2c2f68', '#3d4180', '#d6d9fb', '#9ca2dc', '#6f74b4'],
      ],
      [5, 0.34, 0.18, '#7b7fbe', '#bcb9e6', '#5d6199', 1]
    ),
    near: plate([[23, 14, 0.86, 0.5, 0.18, 14, '#1d2052', '#2a2d63', '#cfd3f7', '#8e94d2', '#5e63a3']], [
      41,
      0.24,
      0.08,
      '#6d71b0',
      '#b0aee0',
      'rgba(93,97,153,0)',
      0.8,
    ]),
  };
  return cachedStrips;
};

// Curtains: [azimuth start, azimuth span, base y, height, seed, hem wave]. On a
// r1700 cylinder (camera.far is 1800 with the backdrop on); y is relative to
// the camera-locked anchor (world y 0), so ~420-990 is ~14-30 degrees over a
// valley camera — inside the band the chase camera frames.
const CURTAINS = [
  [0.35, 1.1, 430, 560, 1, 80],
  [1.9, 0.9, 500, 510, 2, 62],
  [3.2, 1.3, 400, 600, 3, 96],
  [4.9, 0.8, 520, 460, 4, 54],
];

export const createSummitAurora = ({ mobile = false } = {}) => {
  const group = new THREE.Group();
  CURTAINS.forEach(([start, span, baseY, height, seed, wave]) => {
    const position = [];
    const uv = [];
    const index = [];
    for (let step = 0; step <= 64; step += 1) {
      const t = step / 64;
      const angle = start + span * t;
      const fold = Math.sin(t * Math.PI * 3 + seed) * wave + Math.sin(t * Math.PI * 7 + seed * 2) * wave * 0.35;
      const radius = 1700 + Math.sin(t * Math.PI * 2 + seed) * 70;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      position.push(x, baseY + fold, z, x, baseY + fold + height, z);
      uv.push(t, 0, t, 1);
      if (step) index.push(step * 2 - 2, step * 2 - 1, step * 2, step * 2 - 1, step * 2 + 1, step * 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(index);
    const curtain = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        fragmentShader: /* glsl */ `
uniform vec3 uLow;
uniform vec3 uHigh;
uniform float uOpacity;
uniform float uTime;
uniform float uSeed;
varying vec2 vUv;
void main() {
  float y = vUv.y;
  // The glowing hem along the lower edge, decaying upward; rays climb out of
  // it and drift sideways. Rays only above the hem, so the edge is one line.
  float hem = smoothstep(0.0, 0.035, y) * exp(-y * 5.0);
  float rays = sin(vUv.x * 140.0 + uSeed * 7.0 + uTime * 0.18) * 0.5 + 0.5;
  rays *= rays * (sin(vUv.x * 37.0 - uTime * 0.11 + uSeed) * 0.35 + 0.65);
  float curtain = smoothstep(0.02, 0.12, y) * (1.0 - smoothstep(0.12, 1.0, y)) * rays;
  float ends = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
  float pulse = 0.85 + 0.15 * sin(uTime * 0.29 + uSeed * 3.1 + vUv.x * 6.0);
  gl_FragColor = vec4(mix(uLow, uHigh, smoothstep(0.08, 0.7, y)) * (hem * 0.9 + curtain * 0.55) * ends * pulse * uOpacity, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
        side: THREE.DoubleSide,
        transparent: true,
        uniforms: {
          uHigh: { value: new THREE.Color(seed % 2 ? '#a560ff' : '#ff5fd0') },
          uLow: { value: new THREE.Color(seed % 2 ? '#3dffc4' : '#41e8ff') },
          uOpacity: { value: mobile ? 0.36 : 0.42 },
          uSeed: { value: seed },
          uTime: AMBIENT_SWAY_TIME,
        },
        vertexShader: /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
      })
    );
    // Behind the far ring (-20): the painted peaks cover the curtains' feet.
    curtain.renderOrder = -21;
    curtain.frustumCulled = false;
    group.add(curtain);
  });
  return group;
};
