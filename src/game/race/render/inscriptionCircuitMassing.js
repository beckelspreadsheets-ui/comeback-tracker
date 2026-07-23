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
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createBasicMaterial } from './createKartModel.js';

// Shared material cache — same color/emissive = same material instance, so
// the end-of-build merge folds the whole district dressing into one mesh per
// material (~15 draw calls for the entire world dressing instead of ~250).
const materialCache = new Map();
const mat = (color, { emissive = null, emissiveIntensity = 0 } = {}) => {
  const key = `${color}|${emissive}|${emissiveIntensity}`;
  if (!materialCache.has(key)) {
    materialCache.set(
      key,
      createBasicMaterial(color, emissive ? { emissive, emissiveIntensity } : {})
    );
  }
  return materialCache.get(key);
};

const box = (w, h, d, x, y, z, material, yaw = 0) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = yaw;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
};

// Merge each prop group's static meshes into one mesh per material, keeping
// the group root so per-prop frustum culling still works (SwiftShader is
// triangle-bound — one world-spanning merged mesh drew EVERY dressing
// triangle EVERY frame and cost ~10 fps headless).
const mergeAddedProps = (world, startIndex) => {
  const roots = world.children.slice(startIndex).filter((child) => !child.userData?.keep);
  world.updateMatrixWorld(true);
  for (const root of roots) {
    const buckets = new Map();
    root.traverse((node) => {
      if (!node.isMesh || node.isInstancedMesh) return;
      // Normalise: box/sphere/cylinder are indexed, polyhedra (octahedron)
      // are not — mergeGeometries refuses mixed buckets.
      const geometry = node.geometry.index ? node.geometry.clone().toNonIndexed() : node.geometry.clone();
      geometry.applyMatrix4(node.matrixWorld);
      const key = node.material.uuid;
      if (!buckets.has(key)) buckets.set(key, { material: node.material, geometries: [] });
      buckets.get(key).geometries.push(geometry);
    });
    world.remove(root);
    for (const { material, geometries } of buckets.values()) {
      const mergedGeometry = mergeGeometries(geometries, false);
      if (!mergedGeometry) continue;
      mergedGeometry.computeBoundingSphere();
      const merged = new THREE.Mesh(mergedGeometry, material);
      merged.castShadow = false;
      merged.receiveShadow = false;
      merged.userData.kind = 'ic-merged-dressing';
      world.add(merged);
    }
  }
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
  const pale = mat('#3a4666');

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

  // The rocket — the spaceport's hero mass on its pad, visible down the
  // whole launch straight.
  const rocketSite = siteAt(sampler, minCenterlineDistance, roadWidth, 0.13, -1, 88);
  if (rocketSite) {
    const g = new THREE.Group();
    g.position.copy(rocketSite.position);
    g.rotation.y = rocketSite.yaw;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 52, 12), pale);
    body.position.y = 30;
    body.castShadow = false;
    g.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(6, 16, 12), orange);
    nose.position.y = 64;
    nose.castShadow = false;
    g.add(nose);
    [0, 1, 2].forEach((i) => {
      const fin = box(2, 14, 10, 0, 9, 0, hull);
      fin.position.set(Math.cos((i * Math.PI * 2) / 3) * 7.4, 9, Math.sin((i * Math.PI * 2) / 3) * 7.4);
      fin.rotation.y = -(i * Math.PI * 2) / 3;
      g.add(fin);
    });
    g.add(box(2.4, 20, 2.4, 12, 30, 0, dark)); // service mast
    g.add(box(30, 1.2, 30, 0, 0.6, 0, dark)); // pad
    g.add(box(9, 1.6, 1.6, 0, 34, 6.2, teal)); // gantry arm light
    world.add(g);
    count += 1;
  }

  // Runway edge strip lights — instanced teal/orange markers hugging both
  // shoulders of the launch straight + opening sweep. The speed-read layer.
  const stripSites = [];
  for (let p = 0.005; p < 0.415; p += 0.0135) {
    [-1, 1].forEach((side) => {
      const { normal, point } = sampler.pointAt(p);
      const pos = point.clone().addScaledVector(normal, side * (sampler.widthAt(p) * 0.5 + 3.2));
      stripSites.push({ p, pos, side });
    });
  }
  const stripGeo = new THREE.BoxGeometry(1.6, 2.6, 1.6);
  const stripMesh = new THREE.InstancedMesh(stripGeo, teal, stripSites.length);
  const m4 = new THREE.Matrix4();
  stripSites.forEach((site, index) => {
    m4.makeTranslation(site.pos.x, site.pos.y + 1.3, site.pos.z);
    stripMesh.setMatrixAt(index, m4);
    stripMesh.setColorAt(index, new THREE.Color(index % 4 < 2 ? '#2ee6c8' : '#ff8b21'));
  });
  stripMesh.instanceMatrix.needsUpdate = true;
  if (stripMesh.instanceColor) stripMesh.instanceColor.needsUpdate = true;
  stripMesh.frustumCulled = false;
  stripMesh.castShadow = false;
  stripMesh.userData.kind = 'launch-strip-lights';
  stripMesh.userData.keep = true;
  world.add(stripMesh);
  count += 1;
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

  // Harbor water: one dark emissive-sheet plane off the OUTSIDE (north) edge
  // of the switchbacks — the wharf reads as a waterfront, not a parking lot.
  const waterSample = sampler.pointAt(0.55, 0);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(620, 420),
    new THREE.MeshBasicMaterial({ color: '#0e2a3a' })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(waterSample.center.x + 40, 0.22, waterSample.center.z - 260);
  water.userData.kind = 'wharf-water';
  water.userData.keep = true;
  world.add(water);
  count += 1;
  // Lantern-lit pier posts marching into the water.
  for (let index = 0; index < 6; index += 1) {
    const post = new THREE.Group();
    post.position.set(waterSample.center.x - 120 + index * 46, 0, waterSample.center.z - 96 - (index % 2) * 18);
    post.add(box(3.4, 14, 3.4, 0, 7, 0, timber));
    post.add(box(2.2, 2.6, 2.2, 0, 15.2, 0, lantern));
    world.add(post);
    count += 1;
  }
  // Rowboats bobbing at anchor.
  [0.5, 0.6].forEach((progress, index) => {
    const site = siteAt(sampler, minCenterlineDistance, roadWidth, progress, 1, 46 + index * 22);
    if (!site) return;
    const g = new THREE.Group();
    g.position.copy(site.position);
    g.rotation.y = site.yaw + index * 0.8;
    g.add(box(16, 4.5, 6.5, 0, 2.2, 0, timber));
    g.add(box(11, 3, 5, 0, 5.4, 0, mat('#3a2416')));
    g.add(box(1.4, 16, 1.4, 2, 10, 0, timber));
    g.add(box(6, 4.5, 0.4, 2, 14, 0, sail));
    world.add(g);
    count += 1;
  });

  // Shipyard crane jib over the boardwalk exit.
  const crane = siteAt(sampler, minCenterlineDistance, roadWidth, 0.615, -1, 40);
  if (crane) {
    const g = new THREE.Group();
    g.position.copy(crane.position);
    g.rotation.y = crane.yaw - 0.4;
    g.add(box(5, 44, 5, 0, 22, 0, timber));
    const jib = box(38, 3, 3, 14, 43, 0, timber);
    jib.rotation.z = 0.22;
    g.add(jib);
    g.add(box(1.2, 14, 1.2, 30, 34, 0, mat('#12100e')));
    g.add(box(6, 6, 6, 30, 26, 0, crate)); // hanging cargo
    g.add(box(2, 2.4, 2, 0, 46, 0, lantern));
    world.add(g);
    count += 1;
  }

  // The cannon — Blackflag's hazard battery aimed across the switchback
  // apex (wired as a live crosser hazard in M4; the prop lands now).
  const cannon = siteAt(sampler, minCenterlineDistance, roadWidth, 0.475, 1, 20);
  if (cannon) {
    const g = new THREE.Group();
    g.position.copy(cannon.position);
    g.rotation.y = cannon.yaw + Math.PI; // muzzle faces the road
    g.add(box(9, 5, 7, 0, 2.5, 0, timber)); // carriage
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.9, 13, 10), mat('#1a1a22'));
    barrel.position.set(0, 6.2, 2.5);
    barrel.rotation.x = Math.PI / 2 - 0.18;
    barrel.castShadow = false;
    g.add(barrel);
    [-1, 1].forEach((side) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 1.2, 10), crate);
      wheel.position.set(side * 5, 2.6, -1);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = false;
      g.add(wheel);
    });
    g.add(box(2.4, 1.4, 2.4, 0, 5.2, -4.2, lantern)); // fuse lantern
    g.userData.kind = 'wharf-cannon';
    world.add(g);
    count += 1;
  }

  // Wharf entry gate: black banner strung between two masts at the district
  // boundary — the clearest possible "you are entering the wharf" cue.
  const banner = (progress, clothMat, lampMat) => {
    const { point, tangent } = sampler.pointAt(progress);
    const g = new THREE.Group();
    g.position.copy(point);
    g.rotation.y = Math.atan2(tangent.x, tangent.z);
    const half = sampler.widthAt(progress) * 0.5 + 7;
    [-1, 1].forEach((side) => {
      g.add(box(2.6, 30, 2.6, side * half, 15, 0, timber));
      g.add(box(2, 2.4, 2, side * half, 31.4, 0, lampMat));
    });
    g.add(box(half * 2, 1.6, 1.6, 0, 29, 0, timber));
    for (let i = -2; i <= 2; i += 1) {
      g.add(box(4.6, 6.5 - Math.abs(i), 0.5, i * (half / 2.6), 24.6, 0, clothMat));
    }
    world.add(g);
    count += 1;
  };
  banner(0.425, sail, lantern);
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

  // The observatory — Layer23's watchtower: domed hut + telescope barrel on
  // the mesa shoulder, aimed at the sky over the crest.
  const observatory = siteAt(sampler, minCenterlineDistance, roadWidth, 0.83, 1, 52);
  if (observatory) {
    const base = sampler.elevationAt(0.83);
    const g = new THREE.Group();
    g.position.copy(observatory.position);
    g.rotation.y = observatory.yaw - 0.6;
    g.add(box(18, 10, 18, 0, base + 5, 0, rock));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(10, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), rockDark);
    dome.position.set(0, base + 10, 0);
    dome.castShadow = false;
    g.add(dome);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 16, 8), mat('#241c2e'));
    scope.position.set(3, base + 16, 0);
    scope.rotation.z = -0.7;
    scope.castShadow = false;
    g.add(scope);
    g.add(box(2.4, 2.4, 2.4, -6, base + 12.5, 6, gold)); // window light
    world.add(g);
    count += 1;
  }

  // Standing-stone circle + violet crystal clusters on the climb — the
  // district's "old inscription" texture at road level.
  for (let index = 0; index < 8; index += 1) {
    const progress = 0.66 + index * 0.032;
    const side = index % 2 === 0 ? -1 : 1;
    const site = siteAt(sampler, minCenterlineDistance, roadWidth, progress, side, 16 + (index % 3) * 9);
    if (!site) continue;
    const base = sampler.elevationAt(progress);
    const g = new THREE.Group();
    g.position.copy(site.position);
    g.rotation.y = site.yaw + index;
    if (index % 2 === 0) {
      const h = 9 + (index % 3) * 4;
      g.add(box(3.2, h, 2.2, 0, base + h / 2, 0, rock, index * 0.4));
      g.add(box(2.2, 1.2, 0.5, 0, base + h - 2, 1.2, gold));
    } else {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(3.2, 0), violet);
      shard.scale.set(0.6, 1.8, 0.6);
      shard.position.set(0, base + 4.4, 0);
      shard.castShadow = false;
      g.add(shard);
      const shard2 = new THREE.Mesh(new THREE.OctahedronGeometry(2.1, 0), violet);
      shard2.scale.set(0.5, 1.5, 0.5);
      shard2.position.set(3.4, base + 2.6, 1.4);
      shard2.castShadow = false;
      g.add(shard2);
      g.add(box(5.5, 1.6, 5.5, 0, base + 0.8, 0, rockDark));
    }
    world.add(g);
    count += 1;
  }

  // Mesa entry gate: stone pylon pair with a gold lintel at 0.645.
  const pylonGate = (progress) => {
    const { point, tangent } = sampler.pointAt(progress);
    const base = sampler.elevationAt(progress);
    const g = new THREE.Group();
    g.position.copy(point);
    g.rotation.y = Math.atan2(tangent.x, tangent.z);
    const half = sampler.widthAt(progress) * 0.5 + 6.5;
    [-1, 1].forEach((side) => {
      g.add(box(4.2, 24, 4.2, side * half, base + 12, 0, rock));
      g.add(box(4.8, 2, 4.8, side * half, base + 25, 0, gold));
    });
    g.add(box(half * 2 + 4.2, 3.2, 5, 0, base + 27.5, 0, rockDark));
    world.add(g);
    count += 1;
  };
  pylonGate(0.645);
  return count;
};

export const buildInscriptionCircuitMassing = ({ world, sampler, trackDef, minCenterlineDistance }) => {
  if (trackDef.key !== 'inscription-circuit') return 0;
  const roadWidth = trackDef.course.mainRoadWidth || 50;
  const startIndex = world.children.length;
  const count =
    buildLaunchYard(world, sampler, minCenterlineDistance, roadWidth) +
    buildBlackflagWharf(world, sampler, minCenterlineDistance, roadWidth) +
    buildLayer23Mesa(world, sampler, minCenterlineDistance, roadWidth);
  // Fold the whole dressing into ~one mesh per material (draw-call diet).
  // Prop telemetry still counts the authored props above.
  mergeAddedProps(world, startIndex);
  return count;
};
