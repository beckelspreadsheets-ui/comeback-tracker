// Inscription Circuit graybox massing (M1) — the three districts' landmark
// silhouettes, procedurally placed from the new centerline. This is the
// anti-city/anti-village kit: spaceport gantries + dish farm, a moored
// pirate hull + mast forest, mesa arches + beacon spires. Deliberately
// chunky and unlit so the racing line stays the loudest thing on screen;
// the M3 dressing pass refines materials and adds secondary props.
//
// Rendering only — collision stays road-bound, and every site is rejected
// if it lands near ANY section of the folding centerline (same rule as
// cityMassing/penguinVillageMassing). Returns the prop count for telemetry.
import * as THREE from 'three';

const mat = (color, { emissive = null, emissiveIntensity = 0 } = {}) =>
  new THREE.MeshBasicMaterial({
    color,
    ...(emissive ? { emissive, emissiveIntensity } : {}),
  });

const box = (w, h, d, x, y, z, material, yaw = 0) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = yaw;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
};

// Shared placement helpers ------------------------------------------------
const siteAt = (sampler, minCenterlineDistance, roadWidth, progress, side, setback) => {
  const { normal, point, tangent } = sampler.pointAt(progress);
  const position = point.clone().addScaledVector(normal, side * (sampler.widthAt(progress) * 0.5 + setback));
  if (minCenterlineDistance(sampler, position.x, position.z) < roadWidth * 0.6) return null;
  return { position, yaw: Math.atan2(tangent.x, tangent.z) };
};

// ---- Launch Yard (isethius spaceport) ------------------------------------
const buildLaunchYard = (world, sampler, minCenterlineDistance, roadWidth) => {
  let count = 0;
  const teal = mat('#2ee6c8', { emissive: '#2ee6c8', emissiveIntensity: 0.9 });
  const orange = mat('#ff8b21', { emissive: '#ff8b21', emissiveIntensity: 0.5 });
  const hull = mat('#1c2440');
  const dark = mat('#121a30');

  // Mission-control tower outside the opening sweep.
  const tower = siteAt(sampler, minCenterlineDistance, roadWidth, 0.16, 1, 46);
  if (tower) {
    const g = new THREE.Group();
    g.position.copy(tower.position);
    g.rotation.y = tower.yaw;
    g.add(box(26, 34, 22, 0, 17, 0, hull));
    g.add(box(30, 5, 26, 0, 36.5, 0, dark));
    g.add(box(20, 3, 2, 0, 26, 11.2, teal)); // light band
    g.add(box(2.2, 18, 2.2, 10, 48, 0, orange)); // antenna mast
    world.add(g);
    count += 1;
  }

  // Dish farm: three tilted satellite dishes along the launch straight.
  [0.05, 0.11, 0.2].forEach((progress, index) => {
    const site = siteAt(sampler, minCenterlineDistance, roadWidth, progress, index % 2 === 0 ? -1 : 1, 38 + index * 6);
    if (!site) return;
    const g = new THREE.Group();
    g.position.copy(site.position);
    g.rotation.y = site.yaw + index * 0.6;
    g.add(box(3.4, 12, 3.4, 0, 6, 0, dark));
    const dish = new THREE.Mesh(new THREE.SphereGeometry(9, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), hull);
    dish.position.set(0, 14.5, 0);
    dish.rotation.x = Math.PI * 0.72; // tilted at the dusk sky
    dish.castShadow = false;
    g.add(dish);
    g.add(box(1.4, 6, 1.4, 0, 18, -3.4, teal)); // feed horn
    world.add(g);
    count += 1;
  });

  // Runway gantry frames straddling the straight (no collision — they stand
  // clear of the shoulders; the road passes under the crossbar).
  [0.075, 0.185].forEach((progress) => {
    const { point, tangent } = sampler.pointAt(progress);
    const g = new THREE.Group();
    g.position.copy(point);
    g.rotation.y = Math.atan2(tangent.x, tangent.z);
    const half = sampler.widthAt(progress) * 0.5 + 9;
    [-1, 1].forEach((side) => {
      g.add(box(3, 26, 3, side * half, 13, 0, dark));
      g.add(box(3.6, 2, 3.6, side * half, 25, 0, orange));
    });
    g.add(box(half * 2 + 3, 3.4, 3.4, 0, 27, 0, hull));
    g.add(box(half * 1.2, 1.4, 1.4, 0, 24.6, 0, teal)); // light strip under the bar
    world.add(g);
    count += 1;
  });
  return count;
};

// ---- Blackflag Wharf (t clow pirate harbor) ------------------------------
const buildBlackflagWharf = (world, sampler, minCenterlineDistance, roadWidth) => {
  let count = 0;
  const timber = mat('#2a1a12');
  const sail = mat('#171019');
  const flag = mat('#d43a2e', { emissive: '#d43a2e', emissiveIntensity: 0.35 });
  const lantern = mat('#ffb23e', { emissive: '#ffb23e', emissiveIntensity: 1.1 });
  const crate = mat('#4a3220');

  // The Blackflag — one big moored pirate hull inside the switchback dent.
  const ship = siteAt(sampler, minCenterlineDistance, roadWidth, 0.5, -1, 64);
  if (ship) {
    const g = new THREE.Group();
    g.position.copy(ship.position);
    g.rotation.y = ship.yaw + 0.35;
    g.add(box(58, 12, 20, 0, 6, 0, timber)); // hull
    g.add(box(46, 6, 16, 0, 14, 0, mat('#3a2416'))); // deck rise
    [-14, 4, 18].forEach((x, i) => {
      g.add(box(2.2, 44 - i * 6, 2.2, x, 22, 0, timber)); // masts
      const s = box(16 - i * 2, 12 - i, 0.6, x, 34 - i * 4, 0, sail); // black sails
      g.add(s);
    });
    g.add(box(5, 3, 0.6, 20, 46, 0, flag)); // the red flag
    g.add(box(10, 3, 3, 0, 8, 10.4, lantern)); // stern lantern row
    world.add(g);
    count += 1;
  }

  // Mast-and-crate rhythm along the wharf edges (the district's vertical
  // signature at racing speed).
  for (let index = 0; index < 10; index += 1) {
    const progress = 0.43 + index * 0.021;
    const side = index % 2 === 0 ? 1 : -1;
    const site = siteAt(sampler, minCenterlineDistance, roadWidth, progress, side, 18 + (index % 3) * 8);
    if (!site) continue;
    const g = new THREE.Group();
    g.position.copy(site.position);
    g.rotation.y = site.yaw;
    if (index % 3 === 2) {
      // Crate stack with a lantern on top.
      g.add(box(7, 7, 7, 0, 3.5, 0, crate, 0.2));
      g.add(box(5.4, 5.4, 5.4, 1.2, 9.6, -0.8, crate, -0.15));
      g.add(box(2, 2.4, 2, -0.6, 13.4, 0.4, lantern));
    } else {
      const height = 26 + (index % 4) * 5;
      g.add(box(1.8, height, 1.8, 0, height / 2, 0, timber));
      g.add(box(10, 7, 0.5, 0, height - 6, 0, sail));
      g.add(box(1.6, 2, 1.6, 0, height + 1, 0, lantern));
    }
    world.add(g);
    count += 1;
  }
  return count;
};

// ---- Layer23 Mesa (wide-brim observatory) --------------------------------
const buildLayer23Mesa = (world, sampler, minCenterlineDistance, roadWidth) => {
  let count = 0;
  const rock = mat('#3a2c4e');
  const rockDark = mat('#2a1f3c');
  const gold = mat('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 1.0 });
  const violet = mat('#b08aff', { emissive: '#b08aff', emissiveIntensity: 0.7 });

  // The mesa mass itself: big stepped blocks outside the climb so the
  // elevation band reads as climbing INTO something.
  [
    { progress: 0.68, side: -1, setback: 60, w: 90, h: 46, d: 70 },
    { progress: 0.74, side: -1, setback: 74, w: 110, h: 62, d: 84 },
    { progress: 0.87, side: 1, setback: 66, w: 96, h: 40, d: 76 },
  ].forEach(({ progress, side, setback, w, h, d }) => {
    const site = siteAt(sampler, minCenterlineDistance, roadWidth, progress, side, setback);
    if (!site) return;
    const base = sampler.elevationAt(progress);
    const g = new THREE.Group();
    g.position.copy(site.position);
    g.rotation.y = site.yaw;
    g.add(box(w, h, d, 0, base + h / 2 - 4, 0, rock));
    g.add(box(w * 0.7, h * 0.5, d * 0.7, 0, base + h + h * 0.25 - 4, 0, rockDark));
    world.add(g);
    count += 1;
  });

  // Stone arch straddling the road at the climb's gate (~0.70).
  const arch = (progress) => {
    const { point, tangent } = sampler.pointAt(progress);
    const base = sampler.elevationAt(progress);
    const g = new THREE.Group();
    g.position.copy(point);
    g.rotation.y = Math.atan2(tangent.x, tangent.z);
    const half = sampler.widthAt(progress) * 0.5 + 7;
    [-1, 1].forEach((side) => {
      g.add(box(5.5, 30, 5.5, side * half, base + 15, 0, rock));
    });
    g.add(box(half * 2 + 5.5, 6.5, 7, 0, base + 33, 0, rockDark));
    g.add(box(3, 3, 3, 0, base + 38.5, 0, gold)); // keystone light
    world.add(g);
    count += 1;
  };
  arch(0.7);
  arch(0.9);

  // Signal beacon spires — the crest one is the jump aim point, visible from
  // most of the lap.
  [
    { progress: 0.79, side: 1, setback: 30, height: 58 },
    { progress: 0.856, side: -1, setback: 34, height: 72 }, // crest beacon
  ].forEach(({ progress, side, setback, height }) => {
    const site = siteAt(sampler, minCenterlineDistance, roadWidth, progress, side, setback);
    if (!site) return;
    const base = sampler.elevationAt(progress);
    const g = new THREE.Group();
    g.position.copy(site.position);
    g.add(box(4, height, 4, 0, base + height / 2, 0, rockDark));
    g.add(box(6, 4, 6, 0, base + height + 2, 0, gold));
    g.add(box(2, 10, 2, 0, base + height * 0.6, 0, violet));
    world.add(g);
    count += 1;
  });

  // The Inscription slab — glowing carved stone marking the shortcut mouth.
  const slab = siteAt(sampler, minCenterlineDistance, roadWidth, 0.945, -1, 26);
  if (slab) {
    const g = new THREE.Group();
    g.position.copy(slab.position);
    g.rotation.y = slab.yaw + 0.5;
    g.add(box(16, 22, 3.5, 0, 11, 0, rockDark));
    g.add(box(12, 2.2, 0.6, 0, 15, 2, gold));
    g.add(box(8, 2.2, 0.6, 0, 10, 2, violet));
    g.add(box(12, 2.2, 0.6, 0, 5, 2, gold));
    world.add(g);
    count += 1;
  }
  return count;
};

export const buildInscriptionCircuitMassing = ({ world, sampler, trackDef, minCenterlineDistance }) => {
  if (trackDef.key !== 'inscription-circuit') return 0;
  const roadWidth = trackDef.course.mainRoadWidth || 50;
  return (
    buildLaunchYard(world, sampler, minCenterlineDistance, roadWidth) +
    buildBlackflagWharf(world, sampler, minCenterlineDistance, roadWidth) +
    buildLayer23Mesa(world, sampler, minCenterlineDistance, roadWidth)
  );
};
