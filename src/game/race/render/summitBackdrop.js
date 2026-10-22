// Satoshi Summit horizon — generated at runtime, zero image bytes.
//
// The two shipped tracks hang painted webp plates on the backdrop rings
// (cc-far/near, pv-far/near). The image budget has no room for a third pair, so
// this track draws its own onto canvases at scene build: a far range of snowy
// alpine peaks standing out of a SEA OF CLOUDS, and a nearer row of darker rock
// spires with cloud wisps at their feet. The monolith's ring shader takes them
// exactly like the plates (alpha = mountain, transparent = the dome's sky).
//
// It also builds the AURORA: a few discrete curtain ribbons on a camera-locked
// cylinder BEHIND the far ring (renderOrder below it, so the peaks occlude the
// curtains), additive, animated off the shared ambient clock. Discrete bright
// filaments with dark gaps, not a veil — Penguin Village's wave-4 note records
// why a soft continuous additive sheet reads as a grey smear.
import * as THREE from 'three';
import { AMBIENT_SWAY_TIME } from './toonRimShader.js';

const PLATE_WIDTH = 2048;
const PLATE_HEIGHT = 512;

// Deterministic 0..1 hash — no Math.random anywhere in scene build (house rule:
// the same track must look the same on every boot and in every capture).
const hash01 = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
};

// A periodic ridge profile: integer harmonics only, so the plate tiles around
// the ring without a seam. `sharp` folds the sum into alpine ridges.
const ridgeProfile = ({ seed, harmonics, sharp }) => {
  const terms = [];
  for (let k = 1; k <= harmonics; k += 1) {
    terms.push({ amp: 1 / Math.pow(k, 0.85), k, phase: hash01(seed * 31 + k) * Math.PI * 2 });
  }
  const norm = terms.reduce((sum, term) => sum + term.amp, 0);
  return (x) => {
    let sum = 0;
    for (const term of terms) sum += term.amp * Math.sin((x / PLATE_WIDTH) * Math.PI * 2 * term.k + term.phase);
    const value = sum / norm; // -1..1
    const ridged = 1 - Math.abs(value);
    return sharp * ridged * ridged + (1 - sharp) * (value * 0.5 + 0.5);
  };
};

// One mountain layer: fills below the ridge with a vertical gradient, lays a
// snow cap whose depth grows with altitude, lights the moon-facing slopes and
// cuts dark gullies down from the crest.
const paintRange = (ctx, { base, crest, lit, rock, rockLow, seed, sharp, shadowSnow, snow, top, harmonics }) => {
  const profile = ridgeProfile({ harmonics, seed, sharp });
  const heights = new Float32Array(PLATE_WIDTH);
  for (let x = 0; x < PLATE_WIDTH; x += 1) heights[x] = top + (1 - profile(x)) * (base - top);
  // Rock body.
  const body = ctx.createLinearGradient(0, top, 0, PLATE_HEIGHT);
  body.addColorStop(0, rock);
  body.addColorStop(1, rockLow);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, PLATE_HEIGHT);
  for (let x = 0; x < PLATE_WIDTH; x += 1) ctx.lineTo(x, heights[x]);
  ctx.lineTo(PLATE_WIDTH, PLATE_HEIGHT);
  ctx.closePath();
  ctx.fill();
  // Snow caps, column by column. Depth scales with how high the crest is
  // (peaks carry more snow than saddles); lit when the slope faces +x (the
  // moon's side of every tile), shadowed otherwise.
  for (let x = 0; x < PLATE_WIDTH; x += 1) {
    const h = heights[x];
    const altitude = 1 - (h - top) / Math.max(1, base - top);
    const depth = 4 + altitude * altitude * crest;
    const slope = heights[(x + 1) % PLATE_WIDTH] - heights[(x + PLATE_WIDTH - 1) % PLATE_WIDTH];
    ctx.fillStyle = slope > 0.15 ? lit : slope < -0.15 ? shadowSnow : snow;
    ctx.fillRect(x, h, 1, depth);
  }
  // Gullies: dark strokes running down the slopes from the crest.
  ctx.strokeStyle = rockLow;
  ctx.globalAlpha = 0.55;
  for (let index = 0; index < 160; index += 1) {
    const x = Math.floor(hash01(seed * 97 + index) * PLATE_WIDTH);
    const h = heights[x];
    const length = 10 + hash01(seed * 13 + index) * (base - h) * 0.7;
    ctx.lineWidth = 1 + hash01(seed + index * 7) * 2;
    ctx.beginPath();
    ctx.moveTo(x, h + 3);
    ctx.lineTo(x + (hash01(index + seed * 5) - 0.5) * 18, h + length);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return heights;
};

// The cloud sea: overlapping soft billows along a band, lit on top, body below.
// Periodic in x (billows wrap) so the tiled ring has no seam.
const paintCloudSea = (ctx, { body, highlight, rows, seed, shade, top }) => {
  ctx.fillStyle = body;
  ctx.fillRect(0, top + rows * 0.45, PLATE_WIDTH, PLATE_HEIGHT - top);
  const count = 240;
  for (let index = 0; index < count; index += 1) {
    const x = hash01(seed * 17 + index) * PLATE_WIDTH;
    const y = top + hash01(seed * 23 + index) * rows * 0.7;
    const radius = 18 + hash01(seed * 29 + index) * 44;
    [x - PLATE_WIDTH, x, x + PLATE_WIDTH].forEach((cx) => {
      const gradient = ctx.createRadialGradient(cx, y - radius * 0.35, radius * 0.1, cx, y, radius);
      gradient.addColorStop(0, highlight);
      gradient.addColorStop(0.55, body);
      gradient.addColorStop(1, shade);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(cx, y, radius * 2.8, radius * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }
};

const canvasTexture = (canvas) => {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

// FAR PLATE (ring r780, h380, centre y140 -> world y -50..330). Peaks top out
// at v~0.62 (~14 degrees over a valley camera), the top fades to the dome, and
// the cloud sea fills v 0..0.32 so it meets the fogged ground at the horizon
// from the valley floor and lies just under eye level from the summit.
const buildFarPlate = () => {
  const canvas = document.createElement('canvas');
  canvas.width = PLATE_WIDTH;
  canvas.height = PLATE_HEIGHT;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, PLATE_WIDTH, PLATE_HEIGHT);
  const row = (v) => (1 - v) * PLATE_HEIGHT;
  // Back range: tall, hazy, pale.
  paintRange(ctx, {
    base: row(0.3),
    crest: 26,
    harmonics: 9,
    lit: '#c9cdf4',
    rock: '#4b4f8e',
    rockLow: '#5b5f9c',
    seed: 3,
    shadowSnow: '#8a8fc9',
    sharp: 0.72,
    snow: '#a9aee4',
    top: row(0.62),
  });
  // Front range: lower, darker, sharper.
  paintRange(ctx, {
    base: row(0.26),
    crest: 18,
    harmonics: 12,
    lit: '#d6d9fb',
    rock: '#2c2f68',
    rockLow: '#3d4180',
    seed: 11,
    shadowSnow: '#6f74b4',
    sharp: 0.8,
    snow: '#9ca2dc',
    top: row(0.47),
  });
  paintCloudSea(ctx, {
    body: '#7b7fbe',
    highlight: '#bcb9e6',
    rows: row(0.18) - row(0.34),
    seed: 5,
    shade: '#5d6199',
    top: row(0.34),
  });
  return canvasTexture(canvas);
};

// NEAR PLATE (ring r590, h210, centre y78 -> world y -27..183): dark rock
// spires closer in, wisps of cloud round their feet, transparent sky above.
const buildNearPlate = () => {
  const canvas = document.createElement('canvas');
  canvas.width = PLATE_WIDTH;
  canvas.height = PLATE_HEIGHT;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, PLATE_WIDTH, PLATE_HEIGHT);
  const row = (v) => (1 - v) * PLATE_HEIGHT;
  paintRange(ctx, {
    base: row(0.18),
    crest: 14,
    harmonics: 14,
    lit: '#cfd3f7',
    rock: '#1d2052',
    rockLow: '#2a2d63',
    seed: 23,
    shadowSnow: '#5e63a3',
    sharp: 0.86,
    snow: '#8e94d2',
    top: row(0.5),
  });
  // Wisps: low, broken, half-transparent so the far sea shows between them.
  ctx.globalAlpha = 0.8;
  paintCloudSea(ctx, {
    body: '#6d71b0',
    highlight: '#b0aee0',
    rows: row(0.08) - row(0.24),
    seed: 41,
    shade: 'rgba(93,97,153,0)',
    top: row(0.24),
  });
  ctx.globalAlpha = 1;
  return canvasTexture(canvas);
};

let cachedStrips = null;
// { far, near } textures for the monolith's backdrop rings. Built once per
// session (canvas + upload ~2 x 4 MB of texels on the GPU, nothing on disk).
export const createSummitBackdropStrips = () => {
  if (typeof document === 'undefined') return null;
  if (!cachedStrips) cachedStrips = { far: buildFarPlate(), near: buildNearPlate() };
  return cachedStrips;
};

const AURORA_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const AURORA_FRAGMENT = /* glsl */ `
uniform vec3 uLow;
uniform vec3 uHigh;
uniform float uOpacity;
uniform float uTime;
uniform float uSeed;
varying vec2 vUv;
void main() {
  float y = vUv.y;
  // A continuous glowing hem along the curtain's lower edge with a soft decay
  // upward — the ribbon itself — and rays climbing out of it that drift
  // sideways. Rays only above the hem, so the edge reads as one bright line.
  float hem = smoothstep(0.0, 0.035, y) * exp(-y * 5.0);
  float rays = sin(vUv.x * 140.0 + uSeed * 7.0 + uTime * 0.18) * 0.5 + 0.5;
  rays = rays * rays * (sin(vUv.x * 37.0 - uTime * 0.11 + uSeed) * 0.35 + 0.65);
  float curtain = smoothstep(0.02, 0.12, y) * (1.0 - smoothstep(0.12, 1.0, y)) * rays;
  // Soft ends so a ribbon never stops on a hard vertical edge.
  float ends = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
  float pulse = 0.85 + 0.15 * sin(uTime * 0.29 + uSeed * 3.1 + vUv.x * 6.0);
  vec3 col = mix(uLow, uHigh, smoothstep(0.08, 0.7, y));
  float alpha = (hem * 0.9 + curtain * 0.55) * ends * pulse * uOpacity;
  gl_FragColor = vec4(col * alpha, 1.0);
  // Same output tail the dome and rings use, so the curtains grade with them.
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// Curtains: [azimuth start, azimuth span, base elevation y, height, seed, wave].
// Placed on a r1700 cylinder, just inside camera.far (1800 with the backdrop
// on): every world mesh nearer than that — the peaks included — occludes the
// curtains by depth, the rings paint over them by draw order, and y ~420-990
// is ~14-30 degrees over a valley camera, inside the band the chase camera
// frames. y is relative to the camera-locked anchor (world y 0).
const AURORA_CURTAINS = [
  [0.35, 1.1, 430, 560, 1, 80],
  [1.9, 0.9, 500, 510, 2, 62],
  [3.2, 1.3, 400, 600, 3, 96],
  [4.9, 0.8, 520, 460, 4, 54],
];
const AURORA_RADIUS = 1700;
const AURORA_SEGMENTS = 64;

export const createSummitAurora = ({ mobile = false } = {}) => {
  const group = new THREE.Group();
  group.name = 'summit-aurora';
  AURORA_CURTAINS.forEach(([start, span, baseY, height, seed, wave]) => {
    const positions = [];
    const uvs = [];
    const indices = [];
    for (let step = 0; step <= AURORA_SEGMENTS; step += 1) {
      const t = step / AURORA_SEGMENTS;
      const angle = start + span * t;
      // The hem undulates: two slow sine folds give the curtain its drape.
      const fold = Math.sin(t * Math.PI * 3 + seed) * wave + Math.sin(t * Math.PI * 7 + seed * 2) * wave * 0.35;
      const radius = AURORA_RADIUS + Math.sin(t * Math.PI * 2 + seed) * 70;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      positions.push(x, baseY + fold, z, x, baseY + fold + height, z);
      uvs.push(t, 0, t, 1);
      if (step < AURORA_SEGMENTS) {
        const a = step * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    const material = new THREE.ShaderMaterial({
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      fragmentShader: AURORA_FRAGMENT,
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        uHigh: { value: new THREE.Color(seed % 2 ? '#a560ff' : '#ff5fd0') },
        uLow: { value: new THREE.Color(seed % 2 ? '#3dffc4' : '#41e8ff') },
        uOpacity: { value: mobile ? 0.36 : 0.42 },
        uSeed: { value: seed },
        uTime: AMBIENT_SWAY_TIME,
      },
      vertexShader: AURORA_VERTEX,
    });
    const curtain = new THREE.Mesh(geometry, material);
    // Behind the far ring (-20): the peaks paint over the curtains' feet.
    curtain.renderOrder = -21;
    curtain.frustumCulled = false;
    group.add(curtain);
  });
  return group;
};
