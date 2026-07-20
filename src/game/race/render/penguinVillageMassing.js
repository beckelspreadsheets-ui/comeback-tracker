// Penguin Village massing (major rebuild, milestone 5): a visually DISTINCT
// alpine village — A-frame timber cabins with warm windows, snow-dusted
// pines, soft snowbanks, and a jagged far ice ridge — instanced like the
// Comeback City kit so the whole village costs a handful of draw calls.
//
// Identity rules vs Comeback City: cool snow/ice world with SMALL warm
// window accents (CC is warm sunset + neon); cabins/pines/snow drifts
// instead of deco towers/awnings; silhouette test must separate the two
// instantly. Rendering only — same folding-centerline rejection guard.

import * as THREE from 'three';

const fract = (value) => value - Math.floor(value);
const hash = (seed) => fract(Math.sin(seed * 127.1 + 311.7) * 43758.5453);

const TIMBER_COLORS = ['#6b4a2f', '#7a5535', '#5d3f28', '#835f3d'];
const PINE_COLORS = ['#1e4d3f', '#276049', '#1a4437'];
const SNOW_COLOR = '#f2f8ff';
const SNOWBANK_COLORS = ['#e4f0f9', '#dbeaf5', '#eef6fd'];
const RIDGE_COLORS = ['#c9deef', '#b7d2e8', '#d8e9f7'];
const WINDOW_COLOR = '#ffc76a';

const composeMatrix = ({ x, y, z, w, h, d, yaw }) => {
  const matrix = new THREE.Matrix4();
  matrix.compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
    new THREE.Vector3(w, h, d)
  );
  return matrix;
};

const buildInstanced = (world, geometry, entries, material, { colors = null, kind } = {}) => {
  if (!entries.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
  entries.forEach((entry, index) => {
    mesh.setMatrixAt(index, composeMatrix(entry));
    if (colors) mesh.setColorAt(index, new THREE.Color(entry.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.kind = kind;
  world.add(mesh);
  return mesh;
};

// Unit A-frame prism: triangular cross-section (base 1, height 1), depth 1,
// origin at floor center. Shared by cabin bodies and their snow roof caps.
const makeAFrameGeometry = () => {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  shape.lineTo(0, 1);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, depth: 1 });
  geometry.translate(0, 0, -0.5);
  return geometry;
};

export const buildPenguinVillageMassing = ({ world, sampler, trackDef, minCenterlineDistance }) => {
  if (trackDef.key !== 'penguin-village') return 0;
  const roadWidth = trackDef.course.mainRoadWidth || 56;

  const cabins = [];
  const roofs = [];
  const windows = [];
  const trunks = [];
  const pineLower = [];
  const pineUpper = [];
  const snowbanks = [];
  const ridge = [];

  const SAMPLES = 140;
  for (let index = 0; index < SAMPLES; index += 1) {
    const progress = index / SAMPLES;
    const { normal, point, tangent } = sampler.pointAt(progress);
    const width = sampler.widthAt(progress);
    const yaw = Math.atan2(tangent.x, tangent.z);

    // Village clusters at three race beats: opening straight, mid lap,
    // final run — cabins gather near the road there, thin elsewhere.
    const cluster = [0.12, 0.5, 0.86].some(
      (center) => Math.abs(progress - center) < 0.06 || Math.abs(progress - center) > 0.94
    );
    [-1, 1].forEach((side) => {
      const seed = index * 3.71 + side * 13.3;
      const roll = hash(seed);
      // Cabins: dense in clusters, rare outside them.
      if (roll < (cluster ? 0.62 : 0.1)) {
        const setback = width * 0.5 + 22 + hash(seed + 1.2) * 26;
        const x = point.x + normal.x * side * setback;
        const z = point.z + normal.z * side * setback;
        if (minCenterlineDistance(sampler, x, z) >= roadWidth * 0.72) {
          const w = 11 + hash(seed + 2.3) * 6;
          const d = 10 + hash(seed + 3.4) * 6;
          const h = 8 + hash(seed + 4.5) * 5;
          const faceYaw = yaw + (side > 0 ? Math.PI : 0);
          cabins.push({
            x,
            y: 0,
            z,
            w,
            h,
            d,
            yaw: faceYaw,
            color: TIMBER_COLORS[Math.floor(hash(seed + 5.6) * TIMBER_COLORS.length)],
          });
          // Snow cap: same prism, slightly wider, sitting on the slope line.
          roofs.push({ x, y: h * 0.34, z, w: w * 1.14, h: h * 0.72, d: d * 1.08, yaw: faceYaw, color: SNOW_COLOR });
          // One warm window on the road-facing gable — the alpine accent.
          windows.push({
            x: x - normal.x * side * (d / 2 + 0.22),
            y: h * 0.32,
            z: z - normal.z * side * (d / 2 + 0.22),
            w: 1.8,
            h: 2.1,
            d: 0.3,
            yaw,
            color: WINDOW_COLOR,
          });
          // Stone chimney on the back slope — silhouette detail.
          windows.push({
            x: x + normal.x * side * (d * 0.18),
            y: h * 0.72,
            z: z + normal.z * side * (d * 0.18),
            w: 1.1,
            h: 3.2,
            d: 1.1,
            yaw,
            color: '#8a97a5',
          });
        }
      }
      // Pines: the village forest band, denser away from cabins clusters.
      if (roll >= 0.42 && roll < 0.72) {
        const setback = width * 0.5 + 20 + hash(seed + 6.7) * 56;
        const x = point.x + normal.x * side * setback;
        const z = point.z + normal.z * side * setback;
        if (minCenterlineDistance(sampler, x, z) >= roadWidth * 0.68) {
          const h = 9 + hash(seed + 7.8) * 9;
          const r = 2.6 + hash(seed + 8.9) * 1.8;
          const color = PINE_COLORS[Math.floor(hash(seed + 9.1) * PINE_COLORS.length)];
          trunks.push({ x, y: 0, z, w: 0.9, h: h * 0.28, d: 0.9, yaw, color: '#4a3421' });
          pineLower.push({ x, y: h * 0.16, z, w: r * 2, h: h * 0.52, d: r * 2, yaw, color });
          // Snow-dusted upper cone — the alpine read.
          pineUpper.push({ x, y: h * 0.52, z, w: r * 1.34, h: h * 0.44, d: r * 1.34, yaw, color: SNOW_COLOR });
        }
      }
      // Snowbanks: soft low drifts just past the barrier.
      if (roll >= 0.72 && roll < 0.9) {
        const setback = width * 0.5 + 13 + hash(seed + 10.2) * 14;
        const x = point.x + normal.x * side * setback;
        const z = point.z + normal.z * side * setback;
        if (minCenterlineDistance(sampler, x, z) >= roadWidth * 0.6) {
          snowbanks.push({
            x,
            y: 0,
            z,
            w: 6 + hash(seed + 11.3) * 8,
            h: 1.6 + hash(seed + 12.4) * 2.2,
            d: 4 + hash(seed + 13.5) * 6,
            yaw,
            color: SNOWBANK_COLORS[Math.floor(hash(seed + 14.6) * SNOWBANK_COLORS.length)],
          });
        }
      }
    });

    // Far ice ridge: jagged pale peaks ringing the village.
    if (index % 2 === 0) {
      const seed = index * 5.19 + 8.4;
      const side = hash(seed) > 0.5 ? 1 : -1;
      const setback = 110 + hash(seed + 1.1) * 90;
      const x = point.x + normal.x * side * setback;
      const z = point.z + normal.z * side * setback;
      if (minCenterlineDistance(sampler, x, z) >= roadWidth * 1.05) {
        ridge.push({
          x,
          y: 0,
          z,
          w: 20 + hash(seed + 2.2) * 26,
          h: 30 + Math.pow(hash(seed + 3.3), 1.2) * 46,
          d: 20 + hash(seed + 4.4) * 22,
          yaw: hash(seed + 5.5) * Math.PI,
          color: RIDGE_COLORS[Math.floor(hash(seed + 6.6) * RIDGE_COLORS.length)],
        });
      }
    }
  }

  const aFrameGeometry = makeAFrameGeometry();
  const coneGeometry = new THREE.ConeGeometry(0.5, 1, 7);
  coneGeometry.translate(0, 0.5, 0);
  const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.62, 1, 6);
  trunkGeometry.translate(0, 0.5, 0);
  const snowbankGeometry = new THREE.IcosahedronGeometry(0.5, 1);
  snowbankGeometry.translate(0, 0.18, 0);
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const ridgeGeometry = new THREE.ConeGeometry(0.5, 1, 5);
  ridgeGeometry.translate(0, 0.5, 0);

  // Lambert, not Standard: the village fills big screen areas and the PBR
  // env-probe path costs real fill on weak GPUs (headless gate host included).
  const lambert = () => new THREE.MeshLambertMaterial({ color: '#ffffff' });

  buildInstanced(world, aFrameGeometry, cabins, lambert(), { colors: true, kind: 'pv-massing-cabins' });
  buildInstanced(world, aFrameGeometry, roofs, lambert(), { colors: true, kind: 'pv-massing-snow-roofs' });
  buildInstanced(world, boxGeometry, windows, new THREE.MeshBasicMaterial({ color: '#ffffff' }), {
    colors: true,
    kind: 'pv-massing-warm-windows',
  });
  buildInstanced(world, trunkGeometry, trunks, lambert(), { colors: true, kind: 'pv-massing-pine-trunks' });
  buildInstanced(world, coneGeometry, pineLower, lambert(), { colors: true, kind: 'pv-massing-pines' });
  buildInstanced(world, coneGeometry, pineUpper, lambert(), { colors: true, kind: 'pv-massing-pine-snow' });
  buildInstanced(world, snowbankGeometry, snowbanks, lambert(), { colors: true, kind: 'pv-massing-snowbanks' });
  buildInstanced(world, ridgeGeometry, ridge, lambert(), { colors: true, kind: 'pv-massing-ice-ridge' });

  return cabins.length + trunks.length + snowbanks.length + ridge.length;
};
