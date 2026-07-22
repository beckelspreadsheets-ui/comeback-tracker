// Ordinal drivers (Ordinals rebuild, M2) — procedural seated drivers built
// from the three supplied inscription portraits (asset-intake/ordinals/):
//   isethius — astronaut: navy hood + teal visor + orange flight suit
//   t-clow   — pirate cat: black tricorn, red band, ear tufts, charcoal coat
//   layer23  — wide-brim hat: brown brim, red band, purple hoodie
// Silhouette + palette are lifted straight from the pixel art so each driver
// reads as THEIR ordinal at chase distance. No old game GLBs involved.
//
// The builder is material-factory injected (kit.createToonMaterial) so the
// rigs share the race renderer's toon gradient + hero rim pipeline.
import * as THREE from 'three';

const addMesh = (parent, geometry, material, { position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] } = {}) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
};

const sphere = (r, w = 12, h = 9) => new THREE.SphereGeometry(r, w, h);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 10) => new THREE.CylinderGeometry(rt, rb, h, s);
const cone = (r, h, s = 8) => new THREE.ConeGeometry(r, h, s);

// Shared seated body: hips + torso + head + face + feet, arms reaching the
// wheel. Suit/hood/headgear come from the variant builders below.
const buildSeatedBase = (rig, { suitMat, bodyMat, faceMat, beakMat, accentMat }) => {
  addMesh(rig, sphere(1.28), suitMat, { position: [0, 1.0, -0.18], scale: [1.05, 0.82, 0.92] }); // hips
  addMesh(rig, sphere(1.55, 14, 10), suitMat, { position: [0, 2.25, -0.1], scale: [0.92, 1.2, 0.72] }); // torso
  addMesh(rig, sphere(1.12, 12, 8), faceMat, { position: [0, 2.12, 0.92], scale: [0.78, 1.05, 0.28] }); // chest patch
  addMesh(rig, sphere(1.34, 14, 10), bodyMat, { position: [0, 3.98, 0.12], scale: [1.02, 0.96, 0.92] }); // head
  addMesh(rig, sphere(0.92, 12, 8), faceMat, { position: [0, 4.02, 1.13], scale: [0.78, 0.76, 0.22] }); // face
  addMesh(rig, cone(0.26, 0.66, 4), beakMat, { position: [0, 3.98, 1.5], rotation: [Math.PI / 2, 0, 0] }); // beak
  [-1, 1].forEach((side) => {
    addMesh(rig, sphere(0.46, 8, 6), suitMat, {
      position: [side * 1.35, 2.45, 0.42],
      rotation: [0.42, 0, side * 0.62],
      scale: [0.42, 1.18, 0.24],
    }); // arm
    addMesh(rig, sphere(0.22, 8, 5), accentMat, { position: [side * 0.78, 2.58, 1.34] }); // hand
    addMesh(rig, sphere(0.38, 8, 5), beakMat, { position: [side * 0.48, 0.32, 0.64], scale: [1.25, 0.32, 0.78] }); // foot
  });
};

// isethius — astronaut. Navy hood wrapped over the head, glowing teal visor
// bar, orange flight suit, navy life-support pack.
const buildIsethius = (kit) => {
  const rig = new THREE.Group();
  rig.userData.kind = 'ordinal-driver-isethius';
  const suitMat = kit.createToonMaterial('#ff8b21', { emissive: '#ff8b21', emissiveIntensity: 0.1 });
  const navyMat = kit.createToonMaterial('#1c2440');
  const faceMat = kit.createToonMaterial('#f3f7ff');
  const beakMat = kit.createToonMaterial('#f1a33a');
  const visorMat = kit.createToonMaterial('#2ee6c8', { emissive: '#2ee6c8', emissiveIntensity: 0.9 });
  buildSeatedBase(rig, { suitMat, bodyMat: navyMat, faceMat, beakMat, accentMat: visorMat });
  // Hood: a slightly larger shell over the back of the head.
  addMesh(rig, sphere(1.48, 14, 10), navyMat, { position: [0, 4.02, -0.12], scale: [1.05, 1.0, 0.95] });
  // Teal visor bar across the eyes — isethius's signature.
  addMesh(rig, box(1.5, 0.34, 0.3), visorMat, { position: [0, 4.2, 1.28] });
  // Life-support backpack.
  addMesh(rig, box(1.7, 1.9, 0.8), navyMat, { position: [0, 2.6, -1.15] });
  addMesh(rig, box(1.2, 0.3, 0.2), visorMat, { position: [0, 3.1, -1.58] });
  return rig;
};

// t-clow — pirate cat. Black tricorn with a red band (his pixel-art hat),
// charcoal coat, red sash, small ear tufts peeking under the brim.
const buildTClow = (kit) => {
  const rig = new THREE.Group();
  rig.userData.kind = 'ordinal-driver-t-clow';
  const coatMat = kit.createToonMaterial('#23202c');
  const faceMat = kit.createToonMaterial('#f3f7ff');
  const beakMat = kit.createToonMaterial('#f1a33a');
  const hatMat = kit.createToonMaterial('#121016');
  const bandMat = kit.createToonMaterial('#d43a2e', { emissive: '#d43a2e', emissiveIntensity: 0.3 });
  buildSeatedBase(rig, { suitMat: coatMat, bodyMat: coatMat, faceMat, beakMat, accentMat: bandMat });
  // Ear tufts.
  [-1, 1].forEach((side) => {
    addMesh(rig, cone(0.3, 0.7, 4), coatMat, { position: [side * 0.72, 5.05, 0.1], rotation: [0, 0, side * -0.28] });
  });
  // Tricorn: wide upturned brim + domed crown + red band + tiny gold pin.
  addMesh(rig, cyl(1.85, 2.05, 0.32, 12), hatMat, { position: [0, 5.06, 0.05], rotation: [0.06, 0, 0] });
  addMesh(rig, sphere(0.95, 12, 8), hatMat, { position: [0, 5.42, 0.0], scale: [1, 0.72, 1] });
  addMesh(rig, cyl(0.98, 1.02, 0.26, 12), bandMat, { position: [0, 5.2, 0.02] });
  addMesh(rig, sphere(0.14, 8, 6), kit.createToonMaterial('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 0.8 }), {
    position: [0, 5.2, 1.02],
  });
  // Red sash across the coat.
  addMesh(rig, box(0.5, 2.2, 0.2), bandMat, { position: [0.3, 2.3, 1.05], rotation: [0, 0, 0.5] });
  return rig;
};

// Layer23 — wide-brim hat. Big flat brown brim, low crown, red band, purple
// hoodie with gold drawstrings.
const buildLayer23 = (kit) => {
  const rig = new THREE.Group();
  rig.userData.kind = 'ordinal-driver-layer23';
  const hoodieMat = kit.createToonMaterial('#5a3f9f', { emissive: '#5a3f9f', emissiveIntensity: 0.08 });
  const faceMat = kit.createToonMaterial('#f3f7ff');
  const beakMat = kit.createToonMaterial('#f1a33a');
  const hatMat = kit.createToonMaterial('#7a5230');
  const bandMat = kit.createToonMaterial('#d43a2e', { emissive: '#d43a2e', emissiveIntensity: 0.3 });
  const goldMat = kit.createToonMaterial('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 0.6 });
  buildSeatedBase(rig, { suitMat: hoodieMat, bodyMat: hoodieMat, faceMat, beakMat, accentMat: goldMat });
  // Wide-brim hat: the silhouette IS the character.
  addMesh(rig, cyl(2.15, 2.3, 0.22, 14), hatMat, { position: [0, 5.0, 0.05], rotation: [0.08, 0, 0.04] });
  addMesh(rig, cyl(0.85, 1.0, 0.85, 12), hatMat, { position: [0, 5.45, 0.0] });
  addMesh(rig, cyl(1.02, 1.05, 0.22, 12), bandMat, { position: [0, 5.12, 0.0] });
  // Hood collar + gold drawstrings.
  addMesh(rig, sphere(1.0, 12, 8), hoodieMat, { position: [0, 3.35, -0.3], scale: [1.1, 0.5, 0.9] });
  [-1, 1].forEach((side) => {
    addMesh(rig, box(0.12, 0.7, 0.12), goldMat, { position: [side * 0.3, 2.9, 1.05] });
  });
  return rig;
};

const BUILDERS = {
  isethius: buildIsethius,
  't-clow': buildTClow,
  layer23: buildLayer23,
};

// kit: { createToonMaterial } from the race component (shares the toon
// gradient + rim pipeline). Unknown keys fall back to isethius.
export const createOrdinalDriver = ({ key = 'isethius', kit }) => {
  const rig = (BUILDERS[key] || buildIsethius)(kit);
  rig.rotation.x = -0.08;
  return rig;
};

export const ORDINAL_DRIVER_KEYS = Object.keys(BUILDERS);
