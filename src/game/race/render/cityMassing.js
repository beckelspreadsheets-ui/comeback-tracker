// Comeback City massing (major rebuild, milestone 3): real chunky near/mid
// ground city geometry so the world stops reading as flat skyline cards.
// Everything is instanced — hundreds of buildings cost ~5 draw calls.
//
// Layers:
//  - near band: art-deco/coastal blocks just behind the barriers (the forms
//    the player actually passes), cream/coral/teal with stepped roofs,
//    vertical window strips and base awnings;
//  - far band: larger desaturated masses that bridge the procedural world
//    into the painted backdrop ring;
//  - landmarks: a few authored hero towers at memorable race beats.
//
// Placement is deterministic (hash-seeded by sample index) so proof captures
// are reproducible. Rendering only — collision stays road-bound, and every
// candidate site is rejected if it lands near ANY section of the folding
// centerline. Comeback City only; Penguin Village gets its own kit.

import * as THREE from 'three';

const fract = (value) => value - Math.floor(value);
const hash = (seed) => fract(Math.sin(seed * 127.1 + 311.7) * 43758.5453);

const BODY_COLORS = ['#efd9b8', '#e0835e', '#6aaaa6', '#eec9a8', '#537a9c', '#e2b48d'];
const ROOF_COLOR = '#204052';
const FAR_BODY_COLORS = ['#333d5e', '#3c4668', '#2c3450', '#434e74'];
const WINDOW_COLOR = '#ffd58a';
const AWNING_COLORS = ['#2f6f73', '#e98f6e', '#f8fbff'];

const composeMatrix = ({ x, y, z, w, h, d, yaw }) => {
  const matrix = new THREE.Matrix4();
  matrix.compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
    new THREE.Vector3(w, h, d)
  );
  return matrix;
};

const buildInstanced = (world, entries, material, { colors = null, kind } = {}) => {
  if (!entries.length) return null;
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, entries.length);
  entries.forEach((entry, index) => {
    mesh.setMatrixAt(index, composeMatrix(entry));
    if (colors) mesh.setColorAt(index, new THREE.Color(entry.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  // One shared unit-box bounds would cull the whole field wrongly.
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.kind = kind;
  world.add(mesh);
  return mesh;
};

export const buildCityMassing = ({ world, sampler, trackDef, minCenterlineDistance }) => {
  if (trackDef.key !== 'comeback-city') return 0;
  const roadWidth = trackDef.course.mainRoadWidth || 50;

  const bodies = [];
  const roofs = [];
  const windowStrips = [];
  const awnings = [];
  const farBodies = [];

  const SAMPLES = 160;
  for (let index = 0; index < SAMPLES; index += 1) {
    const progress = index / SAMPLES;
    const { normal, point, tangent } = sampler.pointAt(progress);
    const width = sampler.widthAt(progress);
    const yaw = Math.atan2(tangent.x, tangent.z);
    [-1, 1].forEach((side) => {
      const seed = index * 2.13 + side * 7.77;
      // Gaps keep the skyline varied instead of a solid wall.
      if (hash(seed) < 0.3) return;
      const setback = width * 0.5 + 30 + hash(seed + 1.3) * 40;
      const x = point.x + normal.x * side * setback;
      const z = point.z + normal.z * side * setback;
      // The route folds back on itself — never plant a building on asphalt.
      if (minCenterlineDistance(sampler, x, z) < roadWidth * 0.74) return;
      const w = 13 + hash(seed + 2.1) * 17;
      const d = 11 + hash(seed + 3.2) * 13;
      // Looming walls right on the barrier read as clutter — the tallest
      // masses only appear deeper in the block.
      const heightCap = 24 + (setback - width * 0.5 - 30) * 1.35;
      const h = Math.min(heightCap, 15 + Math.pow(hash(seed + 4.4), 1.55) * 56);
      const color = BODY_COLORS[Math.floor(hash(seed + 5.5) * BODY_COLORS.length)];
      bodies.push({ x, y: h / 2, z, w, h, d, yaw, color });
      // Stepped deco crown on taller masses.
      if (h > 32) {
        roofs.push({ x, y: h + 2.6, z, w: w * 0.64, h: 5.2, d: d * 0.64, yaw, color: ROOF_COLOR });
        if (h > 52) roofs.push({ x, y: h + 7.4, z, w: w * 0.38, h: 4.6, d: d * 0.38, yaw, color: ROOF_COLOR });
      }
      // Vertical window strips on the road-facing facade — the art-deco read.
      const fx = x - normal.x * side * (d / 2 + 0.18);
      const fz = z - normal.z * side * (d / 2 + 0.18);
      const stripCount = h > 32 ? 3 : 2;
      for (let strip = 0; strip < stripCount; strip += 1) {
        const lane = (strip - (stripCount - 1) / 2) * (w / (stripCount + 0.35));
        const lx = fx + tangent.x * lane;
        const lz = fz + tangent.z * lane;
        windowStrips.push({
          x: lx,
          y: h * 0.52,
          z: lz,
          w: 1.15,
          h: h * 0.62,
          d: 0.34,
          yaw,
          color: WINDOW_COLOR,
        });
      }
      // Base awning band — the coastal/boardwalk street wall cue.
      if (hash(seed + 6.6) > 0.42) {
        awnings.push({
          x: fx - normal.x * side * 0.65,
          y: 4.1,
          z: fz - normal.z * side * 0.65,
          w: w * 0.66,
          h: 1.05,
          d: 2.4,
          yaw,
          color: AWNING_COLORS[Math.floor(hash(seed + 7.7) * AWNING_COLORS.length)],
        });
      }
    });

    // Far band: sparse, taller, desaturated — depth behind the near band.
    if (index % 3 === 0) {
      const seed = index * 9.31 + 4.2;
      const side = hash(seed) > 0.5 ? 1 : -1;
      const setback = 120 + hash(seed + 1.1) * 90;
      const x = point.x + normal.x * side * setback;
      const z = point.z + normal.z * side * setback;
      if (minCenterlineDistance(sampler, x, z) >= roadWidth * 1.1) {
        const w = 26 + hash(seed + 2.2) * 30;
        const d = 22 + hash(seed + 3.3) * 22;
        const h = 42 + Math.pow(hash(seed + 4.4), 1.3) * 62;
        farBodies.push({
          x,
          y: h / 2,
          z,
          w,
          h,
          d,
          yaw,
          color: FAR_BODY_COLORS[Math.floor(hash(seed + 5.5) * FAR_BODY_COLORS.length)],
        });
      }
    }
  }

  // Authored landmarks at authored race beats: first-corner reveal, mid lap,
  // final straight. Taller stepped towers in the hero palette.
  [
    { progress: 0.18, side: 1, color: '#6aaaa6', h: 96 },
    { progress: 0.52, side: -1, color: '#e0835e', h: 88 },
    { progress: 0.84, side: 1, color: '#efd9b8', h: 104 },
  ].forEach(({ progress, side, color, h }, landmarkIndex) => {
    const { normal, point } = sampler.pointAt(progress);
    const width = sampler.widthAt(progress);
    const setback = width * 0.5 + 52;
    const x = point.x + normal.x * side * setback;
    const z = point.z + normal.z * side * setback;
    if (minCenterlineDistance(sampler, x, z) < roadWidth * 0.9) return;
    const yaw = Math.atan2(normal.x * side, normal.z * side);
    bodies.push({ x, y: h / 2, z, w: 26, h, d: 26, yaw, color });
    roofs.push({ x, y: h + 3.4, z, w: 17, h: 6.8, d: 17, yaw, color: ROOF_COLOR });
    roofs.push({ x, y: h + 9.4, z, w: 9.5, h: 5.4, d: 9.5, yaw, color: ROOF_COLOR });
    // Crown beacon strip — one restrained warm accent per landmark.
    windowStrips.push({ x, y: h + 13.4, z, w: 2.2, h: 3.2, d: 2.2, yaw, color: WINDOW_COLOR });
    void landmarkIndex;
  });

  const bodyMat = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.04, roughness: 0.82 });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.05, roughness: 0.72 });
  const windowMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const awningMat = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.02, roughness: 0.86 });
  const farMat = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.02, roughness: 0.94 });

  buildInstanced(world, bodies, bodyMat, { colors: true, kind: 'city-massing-near-bodies' });
  buildInstanced(world, roofs, roofMat, { colors: true, kind: 'city-massing-stepped-roofs' });
  buildInstanced(world, windowStrips, windowMat, { colors: true, kind: 'city-massing-window-strips' });
  buildInstanced(world, awnings, awningMat, { colors: true, kind: 'city-massing-awnings' });
  buildInstanced(world, farBodies, farMat, { colors: true, kind: 'city-massing-far-bodies' });

  return bodies.length + farBodies.length;
};
