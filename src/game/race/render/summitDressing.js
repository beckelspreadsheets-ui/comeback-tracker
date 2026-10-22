// Satoshi Summit track dressing — everything that makes the third track a
// blue-hour mountain pass rather than a road on a snowfield.
//
//   - the SATOSHI SUMMIT start gantry with a scrolling LED ticker
//   - the HODL HAUS ski lodge on the straight, warm amber windows
//   - the summit station: a steel beacon tower, a giant spinning B coin and a
//     light column, mining-rig containers, an ordinal statue
//   - the crevasse under the bridge: a glowing fissure with ice-block lips
//   - the avalanche gallery over the final corner: open-sided snow shed
//   - snow-capped pines, rock outcrops, ice shards and a ring of big peaks
//   - ordinal-penguin spectators (placements only: no generic stand-ins are
//     built, so the only penguins that ever appear are the roster ordinals
//     swapOrdinalPenguins mounts once their GLBs load)
//
// Art rules this follows: FEWER, BIGGER, chunky shapes; every repeated prop is
// an InstancedMesh; every transparent material is additive glow that never
// writes depth (sky/glow only) — solid things are opaque; nothing is generated
// from Math.random (same track, same look, every boot); all textures are drawn
// at runtime (zero image bytes).
//
// The monolith hands over a few of its own helpers (toon material with the
// track's ramp, glow sprite, instancing, camera-guard exemption) so this file
// never has to import the 14k-line runtime.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createBasicMaterial } from './createKartModel.js';
import { GROUND_BASE_Y } from './groundTerrain.js';
import { AMBIENT_SWAY_TIME } from './toonRimShader.js';

const TAU = Math.PI * 2;
const wrap01 = (value) => ((value % 1) + 1) % 1;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const hash01 = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
};
// The kerb/run-off/barrier profile reaches ~13.6 units past the drivable edge
// (roadEdgeSection with the shipped 3.4 curb); props keep outside it.
const BARRIER_REACH = 14;

// ---------------------------------------------------------------------------
// Road proximity index — one dense centreline table, bucketed, so hundreds of
// placement checks do not each walk the whole lap.
// ---------------------------------------------------------------------------
const createRoadIndex = (sampler) => {
  const count = clamp(Math.round(sampler.length / 8), 400, 2400);
  const xs = new Float32Array(count);
  const zs = new Float32Array(count);
  const ys = new Float32Array(count);
  const reach = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    const progress = index / count;
    const { center } = sampler.pointAt(progress);
    xs[index] = center.x;
    zs[index] = center.z;
    ys[index] = center.y;
    reach[index] = sampler.widthAt(progress) * 0.44 + BARRIER_REACH;
  }
  const CELL = 160;
  const cells = new Map();
  const keyOf = (cx, cz) => `${cx},${cz}`;
  for (let index = 0; index < count; index += 1) {
    const key = keyOf(Math.floor(xs[index] / CELL), Math.floor(zs[index] / CELL));
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(index);
  }
  // Nearest sample within ~CELL; index -1 means "further than that".
  const nearest = (x, z, skip = null) => {
    const cx = Math.floor(x / CELL);
    const cz = Math.floor(z / CELL);
    let best = Infinity;
    let bestIndex = -1;
    for (let ox = -1; ox <= 1; ox += 1) {
      for (let oz = -1; oz <= 1; oz += 1) {
        const bucket = cells.get(keyOf(cx + ox, cz + oz));
        if (!bucket) continue;
        for (const index of bucket) {
          if (skip && skip(index / count)) continue;
          const d = (x - xs[index]) ** 2 + (z - zs[index]) ** 2;
          if (d < best) {
            best = d;
            bestIndex = index;
          }
        }
      }
    }
    return { distance: Math.sqrt(best), index: bestIndex };
  };
  // Distance beyond the barrier's outer face (negative = on the road).
  const clearance = (x, z, skip = null) => {
    const hit = nearest(x, z, skip);
    return hit.index < 0 ? Infinity : hit.distance - reach[hit.index];
  };
  // Exact distance to the centreline, no bucket limit (for the few big sites).
  const farDistance = (x, z) => {
    let best = Infinity;
    for (let index = 0; index < count; index += 2) {
      const d = (x - xs[index]) ** 2 + (z - zs[index]) ** 2;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  };
  return { clearance, count, farDistance, nearest, xs, ys, zs };
};

// Winding test: is (x, z) inside the closed centreline loop?
const insideLoop = (road, x, z) => {
  let inside = false;
  const { count, xs, zs } = road;
  for (let i = 0, j = count - 1; i < count; j = i, i += 1) {
    if (zs[i] > z !== zs[j] > z && x < ((xs[j] - xs[i]) * (z - zs[i])) / (zs[j] - zs[i]) + xs[i]) inside = !inside;
  }
  return inside;
};

// +1 when the road at `progress` bends toward its +normal side (the sampler's
// normal is (-t.z, 0, t.x), lane +1 on that side).
const turnSideAt = (sampler, progress) => {
  const a = sampler.pointAt(wrap01(progress - 0.004)).tangent;
  const b = sampler.pointAt(wrap01(progress + 0.004)).tangent;
  const { normal } = sampler.pointAt(progress);
  return (b.x - a.x) * normal.x + (b.z - a.z) * normal.z >= 0 ? 1 : -1;
};

// ---------------------------------------------------------------------------
// Runtime textures
// ---------------------------------------------------------------------------
const canvasTexture = (canvas, { repeat = false } = {}) => {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) texture.wrapS = THREE.RepeatWrapping;
  return texture;
};

// Neon lettering on a dark LED panel. Text only from the basic latin set, so
// no glyph ever falls back to a tofu box on a device without the bundled font.
const makeNeonPanelTexture = (text, { accent = '#ff4fd8', glow = '#36e2ff', height = 192, width = 1024 } = {}) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const panel = ctx.createLinearGradient(0, 0, 0, height);
  panel.addColorStop(0, '#0b0a24');
  panel.addColorStop(1, '#151338');
  ctx.fillStyle = panel;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = glow;
  ctx.lineWidth = 6;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 18;
  ctx.strokeRect(14, 14, width - 28, height - 28);
  ctx.font = `900 italic ${Math.round(height * 0.5)}px "Trebuchet MS", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = accent;
  ctx.shadowBlur = 34;
  ctx.fillStyle = accent;
  ctx.fillText(text, width / 2, height / 2 + 4);
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffe3f8';
  ctx.fillText(text, width / 2, height / 2 + 4);
  // LED lattice.
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (let x = 0; x < width; x += 4) ctx.fillRect(x, 0, 1, height);
  for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);
  return canvasTexture(canvas);
};

const makeTickerTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#07061a';
  ctx.fillRect(0, 0, 1024, 64);
  ctx.font = '900 34px "Arial Black", "Helvetica Neue", Arial, sans-serif';
  ctx.textBaseline = 'middle';
  const words = ['STACK SATS', 'HODL', 'GM', 'WAGMI', 'NUMBER GO UP', 'LFG'];
  const colors = ['#ffd34f', '#36e2ff', '#ff4fd8', '#a7f542'];
  let x = 12;
  let index = 0;
  while (x < 1024) {
    const word = `${words[index % words.length]}  +  `;
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillText(word, x, 34);
    x += ctx.measureText(word).width;
    index += 1;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  for (let px = 0; px < 1024; px += 3) ctx.fillRect(px, 0, 1, 64);
  return canvasTexture(canvas, { repeat: true });
};

// The coin face: a gold disc with the bitcoin mark drawn from primitives (a
// tilted B with its two strokes), so it never depends on a font having U+20BF.
const makeCoinTexture = () => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const disc = ctx.createRadialGradient(c * 0.8, c * 0.7, 20, c, c, c);
  disc.addColorStop(0, '#ffe7a3');
  disc.addColorStop(0.55, '#ffb42e');
  disc.addColorStop(1, '#d9761a');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(c, c, c - 4, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 22;
  ctx.strokeStyle = '#fff1c9';
  ctx.beginPath();
  ctx.arc(c, c, c - 34, 0, TAU);
  ctx.stroke();
  ctx.save();
  ctx.translate(c, c);
  ctx.rotate(0.24);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 300px "Arial Black", "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('B', 8, 14);
  // The two strokes through the top and bottom of the B.
  [-38, 26].forEach((x) => {
    ctx.fillRect(x, -168, 26, 48);
    ctx.fillRect(x, 116, 26, 48);
  });
  ctx.restore();
  return canvasTexture(canvas);
};

const makeWindowTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2a1a22';
  ctx.fillRect(0, 0, 512, 256);
  // Board-and-batten grain.
  ctx.fillStyle = 'rgba(255,190,140,0.06)';
  for (let x = 0; x < 512; x += 16) ctx.fillRect(x, 0, 3, 256);
  const cols = 7;
  const rows = 2;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = 22 + col * 70;
      const y = 40 + row * 110;
      const lit = hash01(row * 13 + col * 7) > 0.18;
      const glass = ctx.createLinearGradient(0, y, 0, y + 70);
      glass.addColorStop(0, lit ? '#ffd58a' : '#3b2c48');
      glass.addColorStop(1, lit ? '#ff9a3c' : '#241a33');
      ctx.fillStyle = glass;
      ctx.fillRect(x, y, 48, 70);
      ctx.fillStyle = '#2a1a22';
      ctx.fillRect(x + 22, y, 4, 70);
      ctx.fillRect(x, y + 33, 48, 4);
    }
  }
  return canvasTexture(canvas, { repeat: true });
};

const makeHazardTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#120f2c';
  ctx.fillRect(0, 0, 256, 32);
  ctx.fillStyle = '#ff4fd8';
  for (let x = -32; x < 256; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 32);
    ctx.lineTo(x + 16, 32);
    ctx.lineTo(x + 32, 0);
    ctx.lineTo(x + 16, 0);
    ctx.closePath();
    ctx.fill();
  }
  return canvasTexture(canvas, { repeat: true });
};

// Spin a mesh about its own Y axis on the shared ambient clock (zero CPU per
// frame; reducedMotion freezes the clock, so it freezes this too).
const spinOnAmbientClock = (material, rate) => {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSpinTime = AMBIENT_SWAY_TIME;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uSpinTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
  float spinA = uSpinTime * ${rate.toFixed(3)};
  mat2 spinR = mat2(cos(spinA), -sin(spinA), sin(spinA), cos(spinA));
  transformed.xz = spinR * transformed.xz;`
      );
  };
  material.customProgramCacheKey = () => `summit-spin-${rate}`;
  return material;
};

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
// A box beam from a to b (world-ish local coordinates), as a geometry.
const beamBetween = (a, b, thickness) => {
  const delta = new THREE.Vector3().subVectors(b, a);
  const length = delta.length();
  const geometry = new THREE.BoxGeometry(thickness, length, thickness);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  geometry.applyQuaternion(quaternion);
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  geometry.translate(mid.x, mid.y, mid.z);
  return geometry;
};

const stripMesh = (positions, indices, material, colors = null) => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (colors) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
};

// Rock with a flat-ish bottom, a jittered silhouette and a snow cap baked into
// its vertex colours. Jitter is keyed on the vertex POSITION, so the duplicated
// vertices of a non-indexed polyhedron move together and the shell stays closed.
const makeRockGeometry = (seed, { snowLine = 0.2, stretch = [1.3, 0.85, 1] } = {}) => {
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const rock = new THREE.Color('#3e4173');
  const rockDark = new THREE.Color('#2b2d58');
  const snow = new THREE.Color('#e3e9ff');
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const key = Math.round(x * 97) * 7 + Math.round(y * 97) * 131 + Math.round(z * 97) * 1913 + seed * 7919;
    const jitter = 0.78 + hash01(key) * 0.42;
    const nx = x * jitter * stretch[0];
    const ny = Math.max(-0.38, y * jitter * stretch[1]);
    const nz = z * jitter * stretch[2];
    position.setXYZ(index, nx, ny, nz);
    const color = ny > snowLine + (hash01(key + 3) - 0.5) * 0.18 ? snow : hash01(key + 5) > 0.5 ? rock : rockDark;
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
};

// A big mountain: an irregular cone whose snow line wanders.
const makePeakGeometry = (radius, height, seed) => {
  const radial = 10;
  const rings = 5;
  const positions = [];
  const colors = [];
  const rock = new THREE.Color('#22244c');
  const rockLight = new THREE.Color('#383c74');
  const snow = new THREE.Color('#eef1ff');
  const snowShade = new THREE.Color('#a3abde');
  const vertexAt = (ring, step) => {
    if (ring === rings) return new THREE.Vector3(0, height, 0);
    const t = ring / rings;
    const angle = (step / radial) * TAU + seed;
    // Alternate steps pulled in: a star cross-section, i.e. ridges and gullies.
    const wobble = (step % 2 ? 0.66 : 1) * (0.8 + hash01(seed * 31 + ring * 7 + step) * 0.35);
    const r = radius * (1 - t) * wobble;
    return new THREE.Vector3(Math.cos(angle) * r, height * t * (0.9 + hash01(seed + ring * 3 + step) * 0.2), Math.sin(angle) * r);
  };
  const grid = [];
  for (let ring = 0; ring <= rings; ring += 1) {
    grid.push([]);
    for (let step = 0; step < radial; step += 1) grid[ring].push(vertexAt(ring, step));
  }
  const push = (v, ring, step, lit) => {
    positions.push(v.x, v.y - height * 0.04, v.z);
    const snowy = v.y > height * (0.4 + hash01(seed * 5 + step) * 0.16);
    const color = snowy ? (lit ? snow : snowShade) : lit ? rockLight : rock;
    colors.push(color.r, color.g, color.b);
  };
  for (let ring = 0; ring < rings; ring += 1) {
    for (let step = 0; step < radial; step += 1) {
      const next = (step + 1) % radial;
      const a = grid[ring][step];
      const b = grid[ring][next];
      const c = grid[ring + 1][step];
      const d = grid[ring + 1][next];
      const lit = hash01(seed * 17 + step) > 0.45;
      push(a, ring, step, lit);
      push(c, ring + 1, step, lit);
      push(b, ring, next, lit);
      if (ring + 1 < rings) {
        push(b, ring, next, !lit);
        push(c, ring + 1, step, !lit);
        push(d, ring + 1, next, !lit);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
};

// ---------------------------------------------------------------------------
// The dressing
// ---------------------------------------------------------------------------
export const addSatoshiSummitDressing = (world, sampler, trackDef, ambient, helpers) => {
  const { addGlowSprite, createToonMaterial, instanceTemplateField, markCameraExempt, setFlatTransform } = helpers;
  const toon = (color, options) => createToonMaterial(color, options);
  const road = createRoadIndex(sampler);
  const terrain = world.userData?.groundTerrain || null;
  const groundAt = (x, z) => GROUND_BASE_Y + (terrain ? terrain.solve(x, z).terrainLift : 0);
  const frameAt = (progress) => sampler.pointAt(wrap01(progress));
  const band = trackDef.elevation?.bridgeBand || null;
  const crestProgress = band ? (band.from + band.to) / 2 : null;
  // Loop centroid: which side of the road is the "outside" at a given point.
  let centroidX = 0;
  let centroidZ = 0;
  for (let index = 0; index < road.count; index += 1) {
    centroidX += road.xs[index];
    centroidZ += road.zs[index];
  }
  centroidX /= road.count;
  centroidZ /= road.count;
  const outsideSign = (progress) => {
    const { normal, point } = frameAt(progress);
    return (point.x - centroidX) * normal.x + (point.z - centroidZ) * normal.z >= 0 ? 1 : -1;
  };
  const exclusions = [];
  const excluded = (x, z) => exclusions.some((zone) => (x - zone.x) ** 2 + (z - zone.z) ** 2 < zone.r * zone.r);
  let propCount = 0;

  // ---- Summit station site: the pole of inaccessibility inside the carousel.
  // The carousel is the road from the top of the climb, round the U and back
  // down; closing it with a straight chord gives a polygon whose interior is
  // the summit plateau. The station goes at its pole of inaccessibility.
  const stationSite = (() => {
    const ring = [];
    for (let p = 0.615; p <= 0.735; p += 0.003) ring.push(frameAt(p).center);
    const xs = ring.map((point) => point.x);
    const zs = ring.map((point) => point.z);
    const polygon = { count: ring.length, xs, zs };
    let best = { d: -1, x: xs.reduce((a, b) => a + b, 0) / xs.length, z: zs.reduce((a, b) => a + b, 0) / zs.length };
    for (let x = Math.min(...xs); x <= Math.max(...xs); x += 10) {
      for (let z = Math.min(...zs); z <= Math.max(...zs); z += 10) {
        if (!insideLoop(polygon, x, z)) continue;
        const d = road.farDistance(x, z);
        if (d > best.d) best = { d, x, z };
      }
    }
    return best;
  })();
  exclusions.push({ r: Math.min(stationSite.d - 40, 120), x: stationSite.x, z: stationSite.z });

  // ---- Crevasse frame (at the bridge crest), reserved before trees go down.
  // Three quarters along the deck, not at the crest: the launch is at the
  // crest, so this is the stretch the kart is FLYING over, in front of the
  // chase camera, instead of the ground hidden behind the ramp's barriers.
  let crevasse = null;
  if (crestProgress !== null) {
    const progress = band.from + (band.to - band.from) * 0.74;
    const { center, normal, tangent } = frameAt(progress);
    crevasse = { center: center.clone(), normal: normal.clone(), progress, tangent: tangent.clone() };
  }
  const onCrevasse = (x, z) => {
    if (!crevasse) return false;
    const dx = x - crevasse.center.x;
    const dz = z - crevasse.center.z;
    const along = dx * crevasse.normal.x + dz * crevasse.normal.z;
    const across = dx * crevasse.tangent.x + dz * crevasse.tangent.z;
    return Math.abs(along) < 420 && Math.abs(across) < 56;
  };

  // ---- Start gantry (over the lap line, progress 0, where the default gate
  // stands) + lodge sites.
  const startProgress = 0;
  const lodgeProgress = 0.045;
  const lodgeSide = outsideSign(lodgeProgress);
  {
    const { normal, point } = frameAt(lodgeProgress);
    const offset = sampler.widthAt(lodgeProgress) * 0.44 + BARRIER_REACH + 36;
    exclusions.push({ r: 70, x: point.x + normal.x * lodgeSide * offset, z: point.z + normal.z * lodgeSide * offset });
  }

  // ---- Gallery span (final corner) — computed now so trees keep out of it.
  const galleryFrom = 0.957;
  const galleryTo = 0.992;
  const galleryInside = turnSideAt(sampler, (galleryFrom + galleryTo) / 2);
  const inGallerySpan = (progress) => {
    const p = wrap01(progress);
    return p > galleryFrom - 0.006 && p < galleryTo + 0.006;
  };

  // =========================================================================
  // 1. START GANTRY — two steel towers, the SATOSHI SUMMIT board, a ticker.
  // =========================================================================
  {
    const { point, tangent } = frameAt(startProgress);
    const half = sampler.widthAt(startProgress) * 0.44 + BARRIER_REACH + 3;
    const gantry = new THREE.Group();
    gantry.position.copy(point);
    gantry.rotation.y = Math.atan2(tangent.x, tangent.z);
    const steel = toon('#2c2f5e', { emissive: '#14123a', emissiveIntensity: 0.4 });
    const boardBottom = 23;
    const boardHeight = 12;
    [-1, 1].forEach((side) => {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(6, boardBottom + boardHeight + 6, 6), steel);
      tower.position.set(side * half, (boardBottom + boardHeight + 6) / 2 - 1, 0);
      gantry.add(tower);
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(7.5, 2.2, 7.5),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(side > 0 ? '#ff4fd8' : '#36e2ff').multiplyScalar(1.6) })
      );
      cap.position.set(side * half, boardBottom + boardHeight + 6, 0);
      gantry.add(cap);
      addGlowSprite(gantry, side > 0 ? '#ff4fd8' : '#36e2ff', 24, 0.4, boardBottom + boardHeight + 6).position.x = side * half;
    });
    const truss = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 6, 3, 4), steel);
    truss.position.set(0, boardBottom + boardHeight + 2, 0);
    gantry.add(truss);
    // The board: two faces so it reads from both directions of the lap.
    const boardWidth = half * 2 - 4;
    [
      { face: 1, text: 'SATOSHI SUMMIT' },
      { face: -1, text: 'STACK SATS' },
    ].forEach(({ face, text }) => {
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(boardWidth, boardHeight),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.5, 1.5), map: makeNeonPanelTexture(text) })
      );
      panel.position.set(0, boardBottom + boardHeight / 2, face * 1.4);
      panel.rotation.y = face > 0 ? Math.PI : 0;
      gantry.add(panel);
    });
    const backing = new THREE.Mesh(new THREE.BoxGeometry(boardWidth + 2, boardHeight + 2, 2.4), steel);
    backing.position.set(0, boardBottom + boardHeight / 2, 0);
    gantry.add(backing);
    // Scrolling LED ticker under the board (ambient.tickers scrolls it).
    const tickerTexture = makeTickerTexture();
    tickerTexture.repeat.set(2, 1);
    [1, -1].forEach((face) => {
      const ticker = new THREE.Mesh(
        new THREE.PlaneGeometry(boardWidth, 3.2),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(1.45, 1.45, 1.45), map: tickerTexture })
      );
      ticker.position.set(0, boardBottom - 2.2, face * 1.25);
      ticker.rotation.y = face > 0 ? Math.PI : 0;
      gantry.add(ticker);
    });
    const tickerBar = new THREE.Mesh(new THREE.BoxGeometry(boardWidth, 4, 2.2), steel);
    tickerBar.position.set(0, boardBottom - 2.2, 0);
    gantry.add(tickerBar);
    ambient?.tickers.push({ rate: 0.06, texture: tickerTexture });
    gantry.traverse((node) => {
      node.castShadow = false;
    });
    world.add(gantry);
    propCount += 1;
  }

  // =========================================================================
  // 2. HODL HAUS — the ski lodge on the outside of the straight.
  // =========================================================================
  {
    const { normal, point } = frameAt(lodgeProgress);
    const offset = sampler.widthAt(lodgeProgress) * 0.44 + BARRIER_REACH + 36;
    const x = point.x + normal.x * lodgeSide * offset;
    const z = point.z + normal.z * lodgeSide * offset;
    const base = groundAt(x, z);
    const lodge = new THREE.Group();
    lodge.position.set(x, base, z);
    // Local +z faces the road.
    lodge.rotation.y = Math.atan2(point.x - x, point.z - z);
    const stone = toon('#3a3b62');
    const timber = toon('#4d3140');
    const snow = toon('#e7ecff');
    const windows = makeWindowTexture();
    windows.repeat.set(1, 1);
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#ffffff',
      emissiveIntensity: 1.25,
      emissiveMap: windows,
      map: windows,
      roughness: 0.85,
    });
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(96, 8, 50), stone);
    plinth.position.y = 2;
    lodge.add(plinth);
    // Front face (+z, index 4) carries the windows; the rest is timber.
    const body = new THREE.Mesh(new THREE.BoxGeometry(88, 22, 44), [timber, timber, timber, timber, windowMaterial, timber]);
    body.position.y = 17;
    lodge.add(body);
    // Gabled roof, ridge along x, deep overhang, heavy snow.
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-58, 0);
    roofShape.lineTo(58, 0);
    roofShape.lineTo(0, 30);
    roofShape.closePath();
    const roofGeometry = new THREE.ExtrudeGeometry(roofShape, { bevelEnabled: false, depth: 56 });
    roofGeometry.translate(0, 0, -28);
    const roof = new THREE.Mesh(roofGeometry, snow);
    roof.position.y = 28;
    lodge.add(roof);
    const fasciaShape = new THREE.Shape();
    fasciaShape.moveTo(-60, -2);
    fasciaShape.lineTo(60, -2);
    fasciaShape.lineTo(0, 30);
    fasciaShape.closePath();
    const fasciaGeometry = new THREE.ExtrudeGeometry(fasciaShape, { bevelEnabled: false, depth: 2 });
    [-29.5, 27.5].forEach((zOffset) => {
      const fascia = new THREE.Mesh(fasciaGeometry, timber);
      fascia.position.set(0, 28, zOffset);
      fascia.scale.set(1, 1, 1);
      lodge.add(fascia);
    });
    // Big round gable window, warm.
    const gable = new THREE.Mesh(
      new THREE.CircleGeometry(8, 24),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb04a').multiplyScalar(1.5) })
    );
    gable.position.set(0, 40, 30.2);
    lodge.add(gable);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(8, 22, 8), stone);
    chimney.position.set(26, 44, -6);
    lodge.add(chimney);
    addGlowSprite(lodge, '#ffb04a', 70, 0.32, 20).position.z = 30;
    // HODL HAUS sign over the door.
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 7.5),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(1.5, 1.5, 1.5),
        map: makeNeonPanelTexture('HODL HAUS', { accent: '#ffb04a', glow: '#ff4fd8', height: 192 }),
      })
    );
    sign.position.set(0, 30.5, 30.4);
    lodge.add(sign);
    lodge.traverse((node) => {
      node.castShadow = false;
      node.receiveShadow = true;
    });
    world.add(setFlatTransform(lodge));
    propCount += 1;
  }

  // =========================================================================
  // 3. SUMMIT STATION — beacon tower, the B coin, light column, mining rigs.
  // =========================================================================
  {
    const { x, z } = stationSite;
    const base = groundAt(x, z);
    const station = new THREE.Group();
    station.userData.kind = 'summit-station';
    station.position.set(x, base, z);
    // Face the climb road (local +z toward the nearest road point).
    const nearestRoad = road.nearest(x, z);
    if (nearestRoad.index >= 0) {
      station.rotation.y = Math.atan2(road.xs[nearestRoad.index] - x, road.zs[nearestRoad.index] - z);
    }
    const padRadius = clamp(stationSite.d - 70, 50, 82);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(padRadius, padRadius + 6, 10, 10), toon('#33365f'));
    pad.position.y = -3;
    station.add(pad);
    const padRim = new THREE.Mesh(
      new THREE.TorusGeometry(padRadius + 0.6, 0.9, 6, 40),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#36e2ff').multiplyScalar(1.4) })
    );
    padRim.rotation.x = Math.PI / 2;
    padRim.position.y = 2.1;
    station.add(padRim);

    // Tower: four raked legs and X-braced bays, one merged mesh.
    const TOWER = 118;
    const footHalf = 15;
    const topHalf = 5;
    const halfAt = (y) => footHalf + (topHalf - footHalf) * (y / TOWER);
    const pieces = [];
    const corners = [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1],
    ];
    corners.forEach(([sx, sz]) => {
      pieces.push(
        beamBetween(new THREE.Vector3(sx * footHalf, 2, sz * footHalf), new THREE.Vector3(sx * topHalf, TOWER, sz * topHalf), 2.6)
      );
    });
    for (let y = 14; y < TOWER; y += 20) {
      const h0 = halfAt(y);
      const y1 = Math.min(TOWER, y + 20);
      const h1 = halfAt(y1);
      corners.forEach(([sx, sz], index) => {
        const [tx, tz] = corners[(index + 1) % 4];
        pieces.push(beamBetween(new THREE.Vector3(sx * h0, y, sz * h0), new THREE.Vector3(tx * h0, y, tz * h0), 1.2));
        pieces.push(beamBetween(new THREE.Vector3(sx * h0, y, sz * h0), new THREE.Vector3(tx * h1, y1, tz * h1), 0.9));
      });
    }
    const tower = new THREE.Mesh(mergeGeometries(pieces), toon('#3b4178', { emissive: '#120f36', emissiveIntensity: 0.5 }));
    station.add(tower);
    // LED strips up the four legs.
    const strips = corners.map(([sx, sz]) =>
      beamBetween(
        new THREE.Vector3(sx * (footHalf + 1.5), 4, sz * (footHalf + 1.5)),
        new THREE.Vector3(sx * (topHalf + 1.5), TOWER - 2, sz * (topHalf + 1.5)),
        0.7
      )
    );
    station.add(
      new THREE.Mesh(mergeGeometries(strips), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff4fd8').multiplyScalar(1.6) }))
    );
    const deck = new THREE.Mesh(new THREE.BoxGeometry(18, 2.4, 18), toon('#3b4178'));
    deck.position.y = TOWER;
    station.add(deck);

    // The coin: 26 units across, edge-on to nothing — it spins.
    const COIN_Y = TOWER + 26;
    const coinFace = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 1.2, 1.15), fog: false, map: makeCoinTexture() });
    const coinEdge = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb42e').multiplyScalar(1.35), fog: false });
    spinOnAmbientClock(coinFace, 0.55);
    spinOnAmbientClock(coinEdge, 0.55);
    const coinGeometry = new THREE.CylinderGeometry(22, 22, 4, 48);
    // Cylinder axis Y -> the coin's faces must look sideways: rotate the
    // geometry (not the mesh) so the shader spin stays about world Y.
    coinGeometry.rotateX(Math.PI / 2);
    const coin = new THREE.Mesh(coinGeometry, [coinEdge, coinFace, coinFace]);
    coin.position.y = COIN_Y;
    station.add(coin);
    addGlowSprite(station, '#ffb42e', 120, 0.34, COIN_Y);
    // Light column above the coin, visible from anywhere on the lap.
    const beamMaterial = new THREE.ShaderMaterial({
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          float fade = (1.0 - vUv.y) * (1.0 - vUv.y);
          float core = 0.55 + 0.45 * sin(vUv.x * 6.2831 * 3.0);
          vec3 col = mix(vec3(1.0, 0.62, 0.18), vec3(1.0, 0.31, 0.85), vUv.y);
          gl_FragColor = vec4(col * fade * core * 0.42, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      side: THREE.DoubleSide,
      transparent: true,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
    });
    const column = new THREE.Mesh(new THREE.CylinderGeometry(9, 4, 460, 16, 1, true), beamMaterial);
    column.position.y = COIN_Y + 24 + 230;
    station.add(column);

    // Mining rigs: six containers round the tower foot, two LED colours.
    const rigRadius = Math.min(padRadius - 16, 46);
    ['#36e2ff', '#ff4fd8'].forEach((ledColor, colorIndex) => {
      const template = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.BoxGeometry(28, 12, 12), toon('#24274f'));
      shell.position.y = 6;
      template.add(shell);
      const led = new THREE.Mesh(new THREE.BoxGeometry(28.4, 1.1, 12.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(ledColor).multiplyScalar(1.5) }));
      led.position.y = 8.6;
      template.add(led);
      const fanGeometry = mergeGeometries(
        [-8, 0, 8].map((fx) => new THREE.CylinderGeometry(3.2, 3.2, 1.6, 10).translate(fx, 12.8, 0))
      );
      const fans = new THREE.Mesh(fanGeometry, toon('#151735'));
      template.add(fans);
      const instances = [];
      for (let k = colorIndex; k < 6; k += 2) {
        const angle = (k / 6) * TAU + 0.3;
        instances.push({
          position: new THREE.Vector3(Math.cos(angle) * rigRadius, 1.5, Math.sin(angle) * rigRadius),
          rotationY: -angle,
          scale: 1,
        });
      }
      instanceTemplateField(template, instances).forEach((field) => station.add(field));
    });

    // Ordinal statue on the station's road-facing edge (figure mounted by
    // swapOrdinalPenguins; the plinth is 0.4 of the statue's height, which is
    // where that function seats the figure).
    if (ambient) {
      const statueHeight = 34;
      const statue = new THREE.Group();
      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(statueHeight * 0.26, statueHeight * 0.32, statueHeight * 0.4, 8),
        toon('#3b3d66', { emissive: '#1a1840', emissiveIntensity: 0.4 })
      );
      plinth.position.y = statueHeight * 0.2;
      statue.add(plinth);
      const trim = new THREE.Mesh(
        new THREE.TorusGeometry(statueHeight * 0.27, 0.6, 6, 24),
        new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb42e').multiplyScalar(1.3) })
      );
      trim.rotation.x = Math.PI / 2;
      trim.position.y = statueHeight * 0.4;
      statue.add(trim);
      statue.userData.figure = null;
      statue.userData.statueHeight = statueHeight;
      statue.position.set(0, 2, padRadius - 14);
      statue.rotation.y = 0; // local +z faces the road; figures face +z
      station.add(statue);
      ambient.ordinalStatues.push(statue);
    }
    station.traverse((node) => {
      node.castShadow = false;
    });
    world.add(station);
    propCount += 1;
  }

  // =========================================================================
  // 4. CREVASSE — the glowing fissure the bridge jumps.
  // =========================================================================
  if (crevasse) {
    const { center, normal, tangent } = crevasse;
    const HALF_LENGTH = 460;
    // The deck over the fissure: anything rising out of the crevasse stays
    // under its skirts (6.9 deep) where the road passes over.
    const deckClear = sampler.elevationAt(crevasse.progress) - 8;
    const STEP = 10;
    // Shorten either arm where it would reach another stretch of road.
    const nearBridge = (progress) => Math.abs(progress - crestProgress) < 0.05;
    const armLength = (direction) => {
      for (let s = 60; s <= HALF_LENGTH; s += STEP) {
        const x = center.x + normal.x * s * direction;
        const z = center.z + normal.z * s * direction;
        if (road.clearance(x, z, nearBridge) < 30) return s - STEP * 2;
      }
      return HALF_LENGTH;
    };
    const reachA = armLength(-1);
    const reachB = armLength(1);
    const across = [1, 0.55, 0, -0.55, -1];
    const lip = new THREE.Color('#d4f1ff');
    const wall = new THREE.Color('#152457');
    const deep = new THREE.Color('#070a24');
    const shade = [lip, wall, deep, wall, lip];
    const positions = [];
    const colors = [];
    const indices = [];
    const glowPositions = [];
    const glowColors = [];
    const glowIndices = [];
    const lipPoints = [];
    let row = 0;
    for (let s = -reachA; s <= reachB; s += STEP) {
      const t = Math.abs(s) / Math.max(reachA, reachB);
      const reachFraction = Math.min(1, Math.abs(s) / (s < 0 ? reachA : reachB));
      const halfWidth = 6 + 28 * (1 - Math.max(0, (reachFraction - 0.62) / 0.38) ** 2);
      const jag = Math.sin(s * 0.031) * 9 + Math.sin(s * 0.083 + 1.3) * 4;
      const cx = center.x + normal.x * s + tangent.x * jag;
      const cz = center.z + normal.z * s + tangent.z * jag;
      const y = groundAt(cx, cz) + 0.42;
      across.forEach((k, column) => {
        const w = halfWidth * k * (column === 1 || column === 3 ? 1 + 0.08 * Math.sin(s * 0.2 + column) : 1);
        positions.push(cx + tangent.x * w, y, cz + tangent.z * w);
        const c = shade[column];
        colors.push(c.r, c.g, c.b);
      });
      if (row > 0) {
        const a = (row - 1) * 5;
        const b = row * 5;
        for (let column = 0; column < 4; column += 1) {
          indices.push(a + column, b + column, a + column + 1, a + column + 1, b + column, b + column + 1);
        }
      }
      // Light welling up out of the crevasse: a vertical sheet along its
      // centreline, cyan at the floor fading to nothing (additive, so black is
      // transparent) — the read from the chase camera, which cannot see the
      // floor past the deck's barriers. Kept under the deck where it passes.
      const rise = Math.abs(s) < 56 ? Math.max(0, Math.min(24, deckClear)) : 24 * (1 - t * 0.5);
      glowPositions.push(cx, y, cz, cx, y + rise, cz);
      glowColors.push(0.27, 0.9, 1, 0, 0, 0);
      if (row > 0) {
        const a = (row - 1) * 2;
        glowIndices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
      if (row % 2 === 0) {
        lipPoints.push({ s, x: cx + tangent.x * (halfWidth + 3), y, z: cz + tangent.z * (halfWidth + 3) });
        lipPoints.push({ s, x: cx - tangent.x * (halfWidth + 3), y, z: cz - tangent.z * (halfWidth + 3) });
      }
      row += 1;
    }
    const fissure = stripMesh(
      positions,
      indices,
      new THREE.MeshBasicMaterial({
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        side: THREE.DoubleSide,
        vertexColors: true,
      }),
      colors
    );
    fissure.userData.kind = 'summit-crevasse';
    world.add(setFlatTransform(fissure));
    const glow = stripMesh(
      glowPositions,
      glowIndices,
      new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color(1.5, 1.5, 1.5),
        depthWrite: false,
        side: THREE.DoubleSide,
        transparent: true,
        vertexColors: true,
      }),
      glowColors
    );
    glow.renderOrder = 2;
    world.add(setFlatTransform(glow));
    // Ice-block lips: chunky crystals along both edges.
    const shardGeometry = new THREE.OctahedronGeometry(1, 0);
    shardGeometry.scale(0.9, 1.7, 0.9);
    const shards = new THREE.InstancedMesh(
      shardGeometry,
      createBasicMaterial('#9fe9ff', { emissive: '#2fb8ff', emissiveIntensity: 0.55 }),
      lipPoints.length
    );
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const euler = new THREE.Euler();
    lipPoints.forEach((point, index) => {
      // The spires either side of the bridge are the biggest: they stand
      // above the deck's barriers and frame the jump.
      const size = (Math.abs(point.s) < 120 ? 10 : 4.5) + hash01(index * 3.7) * 7.5;
      euler.set((hash01(index) - 0.5) * 0.7, hash01(index * 1.3) * TAU, (hash01(index * 2.1) - 0.5) * 0.7);
      quaternion.setFromEuler(euler);
      scale.set(size, size * (0.8 + hash01(index * 5.1) * 0.6), size);
      matrix.compose(new THREE.Vector3(point.x, point.y + size * 0.6, point.z), quaternion, scale);
      shards.setMatrixAt(index, matrix);
    });
    shards.instanceMatrix.needsUpdate = true;
    shards.computeBoundingSphere();
    world.add(setFlatTransform(shards));
    propCount += 2;
  }

  // =========================================================================
  // 5. AVALANCHE GALLERY — open-sided snow shed over the final corner.
  // =========================================================================
  {
    const ROOF_UNDER = 19.5;
    const ROOF_TOP = 23;
    const spanUnits = (galleryTo - galleryFrom) * sampler.length;
    const steps = Math.max(12, Math.round(spanUnits / 6));
    const under = [];
    const top = [];
    const edge = [];
    const wallFace = [];
    const ledStrip = [];
    const pillarSpots = [];
    const lampSpots = [];
    const indicesFor = (count) => {
      const list = [];
      for (let index = 0; index < count - 1; index += 1) {
        const a = index * 2;
        list.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
      return list;
    };
    let arc = 0;
    let lastPoint = null;
    for (let step = 0; step <= steps; step += 1) {
      const progress = galleryFrom + ((galleryTo - galleryFrom) * step) / steps;
      const { center, normal } = frameAt(progress);
      const edgeOffset = sampler.widthAt(progress) * 0.44 + BARRIER_REACH;
      const inner = edgeOffset + 3; // wall face, inside of the corner
      const outer = edgeOffset + 4; // pillar line, outside
      const ix = center.x + normal.x * galleryInside * inner;
      const iz = center.z + normal.z * galleryInside * inner;
      const ox = center.x - normal.x * galleryInside * outer;
      const oz = center.z - normal.z * galleryInside * outer;
      const roofInX = center.x + normal.x * galleryInside * (inner + 7);
      const roofInZ = center.z + normal.z * galleryInside * (inner + 7);
      const roofOutX = center.x - normal.x * galleryInside * (outer + 6);
      const roofOutZ = center.z - normal.z * galleryInside * (outer + 6);
      const y = center.y;
      under.push(roofInX, y + ROOF_UNDER, roofInZ, roofOutX, y + ROOF_UNDER, roofOutZ);
      // Snow on top bulges in the middle; the outer edge drops to the fascia.
      top.push(roofInX, y + ROOF_TOP + 2.5, roofInZ, roofOutX, y + ROOF_TOP, roofOutZ);
      edge.push(roofOutX, y + ROOF_TOP, roofOutZ, roofOutX, y + ROOF_UNDER, roofOutZ);
      wallFace.push(ix, y - 2, iz, ix, y + ROOF_UNDER + 0.5, iz);
      const ledHalf = 0.32;
      ledStrip.push(
        center.x + normal.x * ledHalf,
        y + ROOF_UNDER - 0.08,
        center.z + normal.z * ledHalf,
        center.x - normal.x * ledHalf,
        y + ROOF_UNDER - 0.08,
        center.z - normal.z * ledHalf
      );
      if (lastPoint) arc += Math.hypot(center.x - lastPoint.x, center.z - lastPoint.z);
      lastPoint = center;
      if (step === 0 || step === steps || Math.floor(arc / 24) !== Math.floor((arc - 6) / 24)) {
        pillarSpots.push({ x: ox, y, z: oz });
      }
      if (step % 5 === 2) {
        lampSpots.push({
          x: ix - normal.x * galleryInside * 0.9,
          y: y + 12,
          z: iz - normal.z * galleryInside * 0.9,
        });
      }
    }
    const count = steps + 1;
    const gallery = new THREE.Group();
    gallery.userData.kind = 'summit-avalanche-gallery';
    const roofUnderside = stripMesh(under, indicesFor(count), toon('#25284f', { side: THREE.DoubleSide }));
    const roofSnow = stripMesh(top, indicesFor(count), toon('#e8eeff', { side: THREE.DoubleSide }));
    const roofEdge = stripMesh(edge, indicesFor(count), toon('#3b3f70', { side: THREE.DoubleSide }));
    const wall = stripMesh(wallFace, indicesFor(count), toon('#454877', { side: THREE.DoubleSide }));
    const led = stripMesh(
      ledStrip,
      indicesFor(count),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#36e2ff').multiplyScalar(1.15), side: THREE.DoubleSide })
    );
    [roofUnderside, roofSnow, roofEdge, wall, led].forEach((mesh) => gallery.add(mesh));
    // Pillars on the open (valley) side.
    const pillarHeight = ROOF_UNDER + 2.5;
    const pillarGeometry = new THREE.BoxGeometry(3.8, pillarHeight, 3.8);
    pillarGeometry.translate(0, pillarHeight / 2 - 2, 0);
    const pillars = new THREE.InstancedMesh(pillarGeometry, toon('#565a8c'), pillarSpots.length);
    const capGeometry = new THREE.BoxGeometry(4.4, 1.2, 4.4);
    capGeometry.translate(0, ROOF_UNDER - 1.6, 0);
    const caps = new THREE.InstancedMesh(
      capGeometry,
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff4fd8').multiplyScalar(1.5) }),
      pillarSpots.length
    );
    const matrix = new THREE.Matrix4();
    pillarSpots.forEach((spot, index) => {
      matrix.makeTranslation(spot.x, spot.y, spot.z);
      pillars.setMatrixAt(index, matrix);
      caps.setMatrixAt(index, matrix);
    });
    [pillars, caps].forEach((field) => {
      field.instanceMatrix.needsUpdate = true;
      field.computeBoundingSphere();
      gallery.add(field);
    });
    // Warm work-lamps on the wall face.
    const lamps = new THREE.InstancedMesh(
      new THREE.BoxGeometry(2.6, 1.6, 2.6),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb04a').multiplyScalar(1.7) }),
      lampSpots.length
    );
    lampSpots.forEach((spot, index) => {
      matrix.makeTranslation(spot.x, spot.y, spot.z);
      lamps.setMatrixAt(index, matrix);
    });
    lamps.instanceMatrix.needsUpdate = true;
    lamps.computeBoundingSphere();
    gallery.add(lamps);
    // Portal fascias at both ends, magenta hazard chevrons.
    const hazard = makeHazardTexture();
    hazard.repeat.set(6, 1);
    [galleryFrom, galleryTo].forEach((progress) => {
      const { center, normal, tangent } = frameAt(progress);
      const edgeOffset = sampler.widthAt(progress) * 0.44 + BARRIER_REACH;
      const span = edgeOffset * 2 + 20;
      // Local x across the road (rotation aligns local +z with the tangent);
      // 19 -> 26 closes the gap between the roof's underside and its snow.
      const fascia = new THREE.Mesh(
        new THREE.BoxGeometry(span, 7, 2.4),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(1.35, 1.35, 1.35), map: hazard })
      );
      const shift = galleryInside * 1.5;
      fascia.position.set(center.x + normal.x * shift, center.y + ROOF_UNDER + 3, center.z + normal.z * shift);
      fascia.rotation.y = Math.atan2(tangent.x, tangent.z);
      gallery.add(fascia);
    });
    gallery.traverse((node) => {
      node.castShadow = false;
      node.receiveShadow = true;
    });
    // The roof spans the road at 19.5 over the deck, above the chase camera's
    // 10-12.5 eye, so the guard must never treat it as something to dodge:
    // exempt the whole structure.
    markCameraExempt(gallery);
    world.add(gallery);
    propCount += 1;
  }

  // =========================================================================
  // 6. PEAKS — fewer, bigger: one massif in the infield, a ring outside.
  // =========================================================================
  {
    const sites = [];
    // Infield: the point inside the loop furthest from any road.
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let index = 0; index < road.count; index += 1) {
      minX = Math.min(minX, road.xs[index]);
      maxX = Math.max(maxX, road.xs[index]);
      minZ = Math.min(minZ, road.zs[index]);
      maxZ = Math.max(maxZ, road.zs[index]);
    }
    let infield = { d: 0 };
    for (let x = minX; x <= maxX; x += 30) {
      for (let z = minZ; z <= maxZ; z += 30) {
        if (!insideLoop(road, x, z)) continue;
        if ((x - stationSite.x) ** 2 + (z - stationSite.z) ** 2 < 400 * 400) continue;
        const d = road.farDistance(x, z);
        if (d > infield.d) infield = { d, x, z };
      }
    }
    if (infield.d > 260) {
      const radius = Math.min(420, infield.d - 120);
      sites.push({ height: radius * 1.25, radius, seed: 1.7, x: infield.x, z: infield.z });
    }
    // Outer ring, anchored to the loop's centre, pushed out until clear.
    const centreX = (minX + maxX) / 2;
    const centreZ = (minZ + maxZ) / 2;
    const extent = Math.max(maxX - minX, maxZ - minZ) / 2;
    for (let k = 0; k < 9; k += 1) {
      const angle = (k / 9) * TAU + 0.4;
      const radius = 240 + hash01(k * 3.3) * 200;
      let distance = extent * 0.7 + 200;
      let x = 0;
      let z = 0;
      for (let attempt = 0; attempt < 24; attempt += 1) {
        x = centreX + Math.cos(angle) * distance;
        z = centreZ + Math.sin(angle) * distance;
        if (road.farDistance(x, z) > radius + 220) break;
        distance += 60;
      }
      sites.push({ height: radius * (1.2 + hash01(k * 7.7) * 0.6), radius, seed: k + 3.1, x, z });
    }
    const geometries = sites.map((site) => {
      const geometry = makePeakGeometry(site.radius, site.height, site.seed);
      geometry.translate(site.x, groundAt(site.x, site.z) - 6, site.z);
      return geometry;
    });
    const peaks = new THREE.Mesh(
      mergeGeometries(geometries),
      createBasicMaterial('#ffffff', { flatShading: true, roughness: 0.95, vertexColors: true })
    );
    peaks.userData.kind = 'summit-peaks';
    peaks.castShadow = false;
    peaks.receiveShadow = false;
    world.add(setFlatTransform(peaks));
    sites.forEach((site) => exclusions.push({ r: site.radius * 0.9, x: site.x, z: site.z }));
    propCount += sites.length;
  }

  // =========================================================================
  // 7. PINES + ROCKS — clustered, big, instanced.
  // =========================================================================
  {
    // Pine template at unit height (instance scale = tree height).
    const pine = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.2, 6).translate(0, 0.1, 0), toon('#3a2a3e'));
    const tiers = [
      { h: 0.44, r: 0.33, y: 0.12 },
      { h: 0.37, r: 0.25, y: 0.38 },
      { h: 0.31, r: 0.17, y: 0.62 },
    ];
    const needles = new THREE.Mesh(
      mergeGeometries(tiers.map(({ h, r, y }) => new THREE.ConeGeometry(r, h, 7).translate(0, y + h / 2, 0))),
      toon('#1c4552')
    );
    const snowCaps = new THREE.Mesh(
      mergeGeometries(
        tiers.map(({ h, r, y }) => {
          const capHeight = h * 0.5 + 0.014;
          return new THREE.ConeGeometry(r * 0.5 * 1.1, capHeight, 7, 1, false, Math.PI / 7).translate(0, y + h - capHeight / 2 + 0.014, 0);
        })
      ),
      toon('#e2e8ff')
    );
    pine.add(trunk, needles, snowCaps);
    const pines = [];
    const rocks = [[], [], []];
    const clusterCount = Math.round(sampler.length / 115);
    for (let cluster = 0; cluster < clusterCount; cluster += 1) {
      const progress = wrap01((cluster + 0.37) / clusterCount + (hash01(cluster * 3.1) - 0.5) * 0.004);
      if (inGallerySpan(progress)) continue;
      const side = hash01(cluster * 7.7) > 0.5 ? 1 : -1;
      const { center, normal } = frameAt(progress);
      const offset = sampler.widthAt(progress) * 0.5 + 44 + hash01(cluster * 11.3) * 160;
      const cx = center.x + normal.x * side * offset;
      const cz = center.z + normal.z * side * offset;
      const trees = 2 + Math.floor(hash01(cluster * 5.9) * 4);
      for (let tree = 0; tree < trees; tree += 1) {
        const angle = hash01(cluster * 13 + tree * 1.7) * TAU;
        const radius = 6 + hash01(cluster * 19 + tree * 2.9) * 34;
        const x = cx + Math.cos(angle) * radius;
        const z = cz + Math.sin(angle) * radius;
        const height = 16 + hash01(cluster * 17 + tree * 2.3) * 28;
        if (road.clearance(x, z) < height * 0.3 + 6) continue;
        if (excluded(x, z) || onCrevasse(x, z)) continue;
        pines.push({
          position: new THREE.Vector3(x, groundAt(x, z) - 0.8, z),
          rotationY: hash01(cluster * 23 + tree) * TAU,
          scale: height,
        });
      }
      // Every third cluster also gets a rock outcrop.
      if (cluster % 3 === 0) {
        const size = 7 + hash01(cluster * 29) * 16;
        const x = cx + normal.x * side * 20;
        const z = cz + normal.z * side * 20;
        if (road.clearance(x, z) > size * 1.4 + 4 && !excluded(x, z) && !onCrevasse(x, z)) {
          rocks[Math.floor(hash01(cluster) * 3)].push({
            position: new THREE.Vector3(x, groundAt(x, z) - size * 0.25, z),
            rotationY: hash01(cluster * 31) * TAU,
            scale: size,
          });
        }
      }
    }
    // Crags round the summit and behind the gallery wall: the biggest rocks.
    const crag = (progress, sideSign, out, size) => {
      const { center, normal } = frameAt(progress);
      const x = center.x + normal.x * sideSign * out;
      const z = center.z + normal.z * sideSign * out;
      if (road.clearance(x, z) < size * 1.2) return;
      rocks[Math.floor(hash01(progress * 1000) * 3)].push({
        position: new THREE.Vector3(x, groundAt(x, z) - size * 0.3, z),
        rotationY: hash01(progress * 977) * TAU,
        scale: size,
      });
    };
    [0.645, 0.66, 0.675, 0.69, 0.705].forEach((progress, index) => crag(progress, -turnSideAt(sampler, progress), 70 + (index % 2) * 22, 24 + (index % 3) * 9));
    for (let progress = galleryFrom; progress <= galleryTo; progress += 0.007) {
      crag(progress, galleryInside, sampler.widthAt(progress) * 0.44 + BARRIER_REACH + 26, 20 + hash01(progress * 313) * 12);
    }
    if (pines.length) instanceTemplateField(pine, pines).forEach((field) => world.add(field));
    const rockMaterial = createBasicMaterial('#ffffff', { flatShading: true, roughness: 0.9, vertexColors: true });
    rocks.forEach((list, variant) => {
      if (!list.length) return;
      const template = new THREE.Group();
      template.add(new THREE.Mesh(makeRockGeometry(variant + 1), rockMaterial));
      instanceTemplateField(template, list).forEach((field) => world.add(field));
    });
    propCount += pines.length + rocks.reduce((sum, list) => sum + list.length, 0);
  }

  // =========================================================================
  // 8. ORDINAL SPECTATORS — placements only; swapOrdinalPenguins mounts the
  // roster figures. No stand-in mesh exists, so nothing generic ever shows.
  // =========================================================================
  if (ambient) {
    const placements = [];
    const crowd = (progresses, sideOf, lateral) => {
      progresses.forEach((progress, index) => {
        const side = sideOf(progress);
        const { center, normal, point } = frameAt(progress);
        const out = sampler.widthAt(progress) * 0.44 + BARRIER_REACH + lateral + (index % 2) * 3;
        const x = center.x + normal.x * side * out;
        const z = center.z + normal.z * side * out;
        if (road.clearance(x, z) < 2) return;
        placements.push({
          // Inside the flat band the ground IS the road's height.
          position: new THREE.Vector3(x, groundAt(x, z) - 0.15, z),
          rotationY: Math.atan2(point.x - x, point.z - z),
        });
      });
    };
    crowd([0.011, 0.015, 0.019, 0.023, 0.027, 0.031], outsideSign, 3);
    crowd([0.652, 0.662, 0.672, 0.682, 0.692], (p) => turnSideAt(sampler, p), 4);
    crowd([0.869, 0.873, 0.877, 0.881], outsideSign, 4);
    crowd([0.212, 0.216], outsideSign, 4);
    ambient.spectators = { fields: [], placements };
  }

  return propCount;
};
