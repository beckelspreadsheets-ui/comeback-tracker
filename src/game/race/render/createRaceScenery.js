// LEGACY - NOT THE SHIPPED GAME. Editing this file changes nothing the
// owner ever sees. The racer that ships is the ComebackCityThreeKartRace.jsx
// monolith, which imports NONE of this module tree (its only render-layer
// imports are raceParticles / toonRimShader / gltfLoader / createRaceScene
// (renderer+canvas fit only) / createBasicMaterial).
//
// The shipped scenery is built inline in the monolith and from the GLB pools
// in src/game/race/tracks/. Kept: npm run test:race imports createRaceScenery
// directly. NOTE for the midground/parallax work: the procedural Ferris
// wheel inside addCitySkyline (the wheelGroup block, ~1183) is the only bit
// of this file worth salvaging — torus + 10 spokes + 2 legs, zero bytes.

import * as THREE from 'three';

import { createBillboardText } from './createBillboardText.js';
import { createBasicMaterial } from './createKartModel.js';
import { createDefaultRaceCityDistricts } from './raceSceneTheme.js';
import {
  TRACK_SCALE,
  toCourseV2Point,
  toWorldPoint,
} from '../track/trackGeometry.js';

const DEFAULT_VISUAL_PALETTE = Object.freeze({
  clinic: '#ff5b68',
  cyan: '#46d9ef',
  food: '#ffac32',
  garage: '#2cc8ff',
  gym: '#80ff62',
  lab: '#d45cff',
  roadLine: '#ffd34f',
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrap01 = (value) => ((value % 1) + 1) % 1;

export const createRaceScenery = ({
  asphaltMat,
  bounds,
  cleanCityCourse = false,
  collisionCircles = [],
  compiled,
  defaultRaceCityDistricts = null,
  documentRef = globalThis.document,
  railPostMat,
  registerCameraCollider = (object) => object,
  trackCenterX,
  trackCenterZ,
  trackSpanX,
  trackSpanZ,
  visualPalette = DEFAULT_VISUAL_PALETTE,
  world,
} = {}) => {
  const VISUAL_PALETTE = { ...DEFAULT_VISUAL_PALETTE, ...visualPalette };
  const RACE_CITY_DISTRICTS = defaultRaceCityDistricts || createDefaultRaceCityDistricts(VISUAL_PALETTE);
  const districtColors = ['#65c487', '#f28b2e', '#8a53df', '#e64b4b', '#2688ff'];
  const blockMats = districtColors.map((color) => createBasicMaterial(color));
  const roofMats = [createBasicMaterial('#f6fbff'), createBasicMaterial('#153765')];
  const windowMat = createBasicMaterial('#dff7ff', { emissive: '#74f1ff', emissiveIntensity: 0.28 });
  const worldWindowGeometry = new THREE.BoxGeometry(0.9, 1.25, 0.08);
  const worldWindowMatrices = [];
  const instanceObject = new THREE.Object3D();
  const staticBatchLocalObject = new THREE.Object3D();
  const staticBatchWorldMatrix = new THREE.Matrix4();
  const staticDecorationBatches = new Map();
  const animatedTransformObjects = new Set();
  const sceneryGap = compiled.roadWidth * 0.5 + 78;
  const left = bounds.minX - sceneryGap;
  const right = bounds.maxX + sceneryGap;
  const near = bounds.minZ - sceneryGap;
  const far = bounds.maxZ + sceneryGap;

  const freezeStaticTransform = (object) => {
    object.updateMatrix();
    object.matrixAutoUpdate = false;
    return object;
  };

  const freezeStaticTree = (root) => {
    root.traverse((object) => {
      if (!animatedTransformObjects.has(object)) freezeStaticTransform(object);
    });
    return root;
  };

  const markAnimatedTransforms = (...objects) => {
    objects.forEach((object) => {
      if (object) animatedTransformObjects.add(object);
    });
  };

  const addInstanceMatrix = (matrices, { position, rotationY = 0, scale = null }) => {
    instanceObject.position.copy(position);
    instanceObject.rotation.set(0, rotationY, 0);
    if (scale) instanceObject.scale.set(scale.x, scale.y, scale.z);
    else instanceObject.scale.set(1, 1, 1);
    instanceObject.updateMatrix();
    matrices.push(instanceObject.matrix.clone());
  };

  const createInstancedMesh = ({
    castShadow = false,
    frustumCulled = false,
    geometry,
    material,
    matrices,
    parent,
    receiveShadow = false,
  }) => {
    if (!matrices.length) return null;
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = castShadow;
    mesh.frustumCulled = frustumCulled;
    mesh.receiveShadow = receiveShadow;
    freezeStaticTransform(mesh);
    parent.add(mesh);
    return mesh;
  };

  const queueStaticDecorationInstance = ({
    geometry,
    kind,
    material,
    parent,
    position,
    rotation = null,
    scale = null,
  }) => {
    const key = `${kind}:${geometry.uuid}:${material.uuid}`;
    let batch = staticDecorationBatches.get(key);
    if (!batch) {
      batch = { geometry, kind, material, matrices: [] };
      staticDecorationBatches.set(key, batch);
    }

    parent.updateMatrix();
    staticBatchLocalObject.position.copy(position);
    if (rotation) staticBatchLocalObject.rotation.set(rotation.x, rotation.y, rotation.z);
    else staticBatchLocalObject.rotation.set(0, 0, 0);
    if (scale) staticBatchLocalObject.scale.set(scale.x, scale.y, scale.z);
    else staticBatchLocalObject.scale.set(1, 1, 1);
    staticBatchLocalObject.updateMatrix();
    staticBatchWorldMatrix.multiplyMatrices(parent.matrix, staticBatchLocalObject.matrix);
    batch.matrices.push(staticBatchWorldMatrix.clone());
  };

  const flushStaticDecorationBatches = () => {
    staticDecorationBatches.forEach(({ geometry, kind, material, matrices }) => {
      const mesh = createInstancedMesh({
        geometry,
        material,
        matrices,
        parent: world,
        receiveShadow: true,
      });
      if (!mesh) return;
      mesh.userData.kind = kind;
      mesh.userData.instanceCount = matrices.length;
      mesh.userData.sourceKind = 'opening-static-decoration';
    });
    staticDecorationBatches.clear();
  };

  const addWindows = (x, z, w, d, h) => {
    const cols = Math.max(2, Math.floor(w / 3));
    const rows = Math.max(2, Math.floor(h / 4));
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if ((row + col) % 3 === 0) continue;
        const wx = x - w * 0.34 + (w * 0.68 * col) / Math.max(1, cols - 1);
        const wy = 3.6 + row * 3.2;
        [-1, 1].forEach((side) => {
          addInstanceMatrix(worldWindowMatrices, {
            position: new THREE.Vector3(wx, wy, z + side * (d / 2 + 0.06)),
          });
        });
      }
    }
  };

  const addBuilding = (x, z, w, d, h, index) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), blockMats[index % blockMats.length]);
    base.position.set(x, h / 2, z);
    base.castShadow = true;
    base.receiveShadow = true;
    freezeStaticTransform(base);
    world.add(base);
    registerCameraCollider(base);
    collisionCircles.push({ position: new THREE.Vector3(x, 0, z), radius: Math.max(w, d) * 0.68 });
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w + 1.2, 1.4, d + 1.2),
      roofMats[index % roofMats.length]
    );
    roof.position.set(x, h + 0.7, z);
    roof.castShadow = true;
    freezeStaticTransform(roof);
    world.add(roof);
    registerCameraCollider(roof);
    addWindows(x, z, w, d, h);
  };

  const treeMat = createBasicMaterial('#4cae50');
  const trunkMat = createBasicMaterial('#8a5a2f');

  const addLandmarkLabel = (group, label, color) => {
    const sprite = createBillboardText(label, color, { documentRef });
    sprite.position.y = 18;
    sprite.scale.set(12, 3, 1);
    group.add(sprite);
  };

  const addTrackLandmark = (item, index) => {
    const position = toWorldPoint(item);
    const width = Math.max(12, (item.w || 90) * TRACK_SCALE);
    const depth = Math.max(10, (item.h || item.w || 90) * TRACK_SCALE * 0.45);
    const height = Math.max(14, (item.h || 120) * TRACK_SCALE * 0.72);
    const color = item.color || compiled.accent || '#2cc8ff';
    const accentMat = createBasicMaterial(color, { emissive: color, emissiveIntensity: 0.32 });
    const darkMat = createBasicMaterial('#111827');
    const lightMat = createBasicMaterial('#f7fbff', { emissive: '#ffd34f', emissiveIntensity: 0.32 });
    const metalMat = createBasicMaterial('#6b7280', { metalness: 0.18, roughness: 0.48 });
    const group = new THREE.Group();
    group.position.copy(position);

    if (item.kind === 'lighthouse') {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.11, width * 0.16, height, 18), lightMat);
      tower.position.y = height / 2;
      const bandA = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.17, width * 0.17, 2.2, 18), accentMat);
      bandA.position.y = height * 0.32;
      const bandB = bandA.clone();
      bandB.position.y = height * 0.62;
      const lantern = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.2, width * 0.2, 5, 16), accentMat);
      lantern.position.y = height + 3;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(width * 0.24, 6, 16), darkMat);
      roof.position.y = height + 8.4;
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(width * 1.5, 0.45, 5.2),
        new THREE.MeshBasicMaterial({ color: '#fff7b7', opacity: 0.34, transparent: true })
      );
      beam.position.set(width * 0.72, height + 3.1, 0);
      group.add(tower, bandA, bandB, lantern, roof, beam);
      addLandmarkLabel(group, 'LIGHTHOUSE', color);
    } else if (item.kind === 'boats') {
      for (let boat = 0; boat < 5; boat += 1) {
        const boatGroup = new THREE.Group();
        const hull = new THREE.Mesh(new THREE.BoxGeometry(11, 2.4, 4.8), createBasicMaterial(boat % 2 ? '#ef4444' : '#2cc8ff'));
        const bow = new THREE.Mesh(new THREE.ConeGeometry(2.5, 4.2, 4), hull.material);
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 10, 6), darkMat);
        const sail = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 5.6, 3.8),
          new THREE.MeshBasicMaterial({ color: '#fff7da', opacity: 0.82, transparent: true })
        );
        bow.position.z = 4.2;
        bow.rotation.x = Math.PI / 2;
        mast.position.y = 5.5;
        sail.position.set(0.2, 5.2, 1.2);
        boatGroup.add(hull, bow, mast, sail);
        boatGroup.position.set((boat - 2) * 14, 1.5 + Math.sin(boat) * 0.4, (boat % 2) * 8 - 4);
        boatGroup.rotation.y = boat % 2 ? 0.34 : -0.28;
        group.add(boatGroup);
      }
      addLandmarkLabel(group, 'HARBOR', color);
    } else if (item.kind === 'market') {
      for (let stall = 0; stall < 6; stall += 1) {
        const stallGroup = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(9.5, 5.2, 8), blockMats[(stall + index) % blockMats.length]);
        const awning = new THREE.Mesh(new THREE.BoxGeometry(10.6, 1, 8.8), accentMat);
        const laundry = new THREE.Mesh(
          new THREE.BoxGeometry(7, 0.16, 3.5),
          createBasicMaterial(stall % 2 ? '#f7fbff' : '#f45b69')
        );
        body.position.y = 2.6;
        awning.position.y = 5.7;
        laundry.position.set(0, 7.8, 4.8);
        stallGroup.add(body, awning, laundry);
        stallGroup.position.set((stall - 2.5) * 10.5, 0, (stall % 2) * 8 - 4);
        group.add(stallGroup);
      }
      addLandmarkLabel(group, 'FISH MARKET', color);
    } else if (item.kind === 'island') {
      const island = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.55, width * 0.7, 4.5, 24), createBasicMaterial('#d9b66f'));
      const grass = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.5, width * 0.5, 1.1, 24), createBasicMaterial(color));
      island.position.y = 2.2;
      grass.position.y = 5;
      group.add(island, grass);
      [-0.32, 0.28].forEach((offset) => {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.58, 8, 6), trunkMat);
        const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2, 0), treeMat);
        trunk.position.set(offset * width, 9, offset * depth);
        crown.position.set(offset * width, 14, offset * depth);
        group.add(trunk, crown);
      });
      addLandmarkLabel(group, 'ISLAND', color);
    } else if (item.kind === 'spire') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.32, width * 0.42, height * 0.42, 8), darkMat);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(width * 0.28, height, 8), accentMat);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(width * 0.38, 0.7, 8, 32), accentMat);
      base.position.y = height * 0.21;
      spike.position.y = height * 0.86;
      ring.position.y = height * 0.66;
      ring.rotation.x = Math.PI / 2;
      group.add(base, spike, ring);
      addLandmarkLabel(group, 'STORM EYE', color);
    } else if (item.kind === 'mesa') {
      const mesaBase = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.38, width * 0.52, depth, 9), createBasicMaterial('#7c4a2d'));
      const top = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.5, width * 0.48, 4.2, 9), accentMat);
      mesaBase.position.y = depth / 2;
      top.position.y = depth + 2.1;
      group.add(mesaBase, top);
    } else if (item.kind === 'storm') {
      for (let cloud = 0; cloud < 10; cloud += 1) {
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(6 + (cloud % 3) * 1.6, 0), createBasicMaterial('#2f3567'));
        puff.position.set((cloud - 4.5) * 10, 24 + Math.sin(cloud) * 3, Math.cos(cloud) * 10);
        group.add(puff);
      }
      for (let bolt = 0; bolt < 5; bolt += 1) {
        const strike = new THREE.Mesh(new THREE.BoxGeometry(0.8, 22, 0.8), accentMat);
        strike.position.set((bolt - 2) * 18, 10, bolt % 2 ? 8 : -8);
        strike.rotation.z = bolt % 2 ? 0.24 : -0.18;
        group.add(strike);
      }
      addLandmarkLabel(group, 'LIGHTNING', color);
    } else if (item.kind === 'drill') {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.16, width * 0.16, height * 0.6, 14), metalMat);
      const bit = new THREE.Mesh(new THREE.ConeGeometry(width * 0.24, height * 0.48, 14), accentMat);
      const platform = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.5, width * 0.5, 4.4, 18), darkMat);
      platform.position.y = 2.2;
      shaft.position.y = height * 0.34;
      bit.position.y = height * 0.82;
      group.add(platform, shaft, bit);
      addLandmarkLabel(group, 'CENTRAL DRILL', color);
    } else if (item.kind === 'ore') {
      for (let crystal = 0; crystal < 9; crystal += 1) {
        const gem = new THREE.Mesh(new THREE.ConeGeometry(2.2 + (crystal % 3) * 0.5, 8 + (crystal % 4), 5), accentMat);
        gem.position.set((crystal % 3 - 1) * 5, 4 + (crystal % 4), (Math.floor(crystal / 3) - 1) * 5);
        gem.rotation.z = (crystal - 4) * 0.08;
        group.add(gem);
      }
    } else if (item.kind === 'rails') {
      [-3.2, 3.2].forEach((offset) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.55, 0.55), metalMat);
        rail.position.set(0, 0.7, offset);
        group.add(rail);
      });
      for (let sleeper = -Math.floor(width / 8); sleeper <= Math.floor(width / 8); sleeper += 1) {
        const tie = new THREE.Mesh(new THREE.BoxGeometry(1, 0.35, 9.5), darkMat);
        tie.position.set(sleeper * 8, 0.35, 0);
        group.add(tie);
      }
    }

    group.userData.kind = item.kind;
    freezeStaticTree(group);
    world.add(group);
    registerCameraCollider(group);
    collisionCircles.push({
      position: position.clone(),
      radius: Math.max(width, depth) * (item.kind === 'boats' ? 0.48 : 0.62),
    });
  };

  (compiled.scenery || [])
    .filter(
      (item) =>
        !compiled.courseV2 &&
        item.kind !== 'island' &&
        !(cleanCityCourse && ['drill', 'market', 'rails', 'spire'].includes(item.kind))
    )
    .forEach(addTrackLandmark);

  const buildingSpots = [
    [left - 18, near + trackSpanZ * 0.1, 11, 13, 18],
    [left - 30, trackCenterZ + trackSpanZ * 0.12, 12, 13, 23],
    [left - 17, far - trackSpanZ * 0.14, 10, 14, 20],
    [right + 18, near + trackSpanZ * 0.18, 13, 12, 19],
    [right + 30, trackCenterZ - trackSpanZ * 0.08, 12, 12, 26],
    [right + 18, far - trackSpanZ * 0.1, 12, 13, 18],
    [trackCenterX - trackSpanX * 0.24, near - 32, 12, 12, 18],
    [trackCenterX + trackSpanX * 0.24, far + 32, 12, 12, 20],
    [trackCenterX - trackSpanX * 0.06, far + 44, 9, 10, 30],
    [trackCenterX + trackSpanX * 0.05, near - 44, 10, 10, 28],
  ];
  buildingSpots.forEach(([x, z, w, d, h], index) => addBuilding(x, z, w, d, h, index));

  (compiled.collisionZones || []).forEach((zone) => {
    const position = toCourseV2Point(zone.position || zone);
    const radius =
      zone.shape === 'box'
        ? Math.max(zone.size?.w || zone.w || 1, zone.size?.d || zone.d || 1) * 0.64
        : zone.radius || 12;
    collisionCircles.push({
      key: zone.key,
      position,
      radius,
    });
  });

  const streetLampPoleMatrices = [];
  const streetLampBulbMatrices = [];
  const plazaLampPoleMatrices = [];
  const plazaLampCyanBulbMatrices = [];
  const plazaLampYellowBulbMatrices = [];
  const streetLampCount = cleanCityCourse ? 10 : 24;
  for (let i = 0; i < streetLampCount; i += 1) {
    const sample = compiled.pointAt(i / streetLampCount);
    const normal = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x);
    const side = i % 2 === 0 ? -1 : 1;
    const position = sample.point.clone().addScaledVector(normal, side * (compiled.roadWidth / 2 + 9.4));
    addInstanceMatrix(streetLampPoleMatrices, {
      position: new THREE.Vector3(position.x, 3.3, position.z),
    });
    addInstanceMatrix(streetLampBulbMatrices, {
      position: new THREE.Vector3(position.x, 6.8, position.z),
    });
  }
  createInstancedMesh({
    geometry: new THREE.CylinderGeometry(0.18, 0.28, 6.6, 6),
    material: railPostMat,
    matrices: streetLampPoleMatrices,
    parent: world,
  });
  createInstancedMesh({
    geometry: new THREE.SphereGeometry(0.8, 8, 6),
    material: createBasicMaterial('#fff6da', { emissive: '#ffd34f', emissiveIntensity: 0.52 }),
    matrices: streetLampBulbMatrices,
    parent: world,
  });

  const startSample = compiled.pointAt(compiled.startProgress || 0);
  const corridorForward = startSample.tangent.clone().normalize();
  const corridorRight = new THREE.Vector3(corridorForward.z, 0, -corridorForward.x).normalize();
  const corridorOrigin = startSample.point.clone();
  const raceCityMaterials = {
    asphalt: asphaltMat,
    cyan: createBasicMaterial(VISUAL_PALETTE.cyan, {
      emissive: VISUAL_PALETTE.cyan,
      emissiveIntensity: 0.85,
    }),
    dark: createBasicMaterial('#10151d'),
    glass: createBasicMaterial('#dff8ff', {
      emissive: '#74f1ff',
      emissiveIntensity: 0.38,
    }),
    light: createBasicMaterial('#f7fbff'),
    yellow: createBasicMaterial(VISUAL_PALETTE.roadLine, {
      emissive: VISUAL_PALETTE.roadLine,
      emissiveIntensity: 0.18,
    }),
  };
  const openingStorefrontWindowGeometry = new THREE.BoxGeometry(4.2, 3.2, 0.24);
  const openingStorefrontAwningGeometry = new THREE.BoxGeometry(4.9, 0.76, 2.8);
  const openingPennantPostGeometry = new THREE.BoxGeometry(0.55, 13.8, 0.55);
  const openingPennantCordGeometry = new THREE.BoxGeometry(0.32, 0.32, compiled.roadWidth + 15.6);
  const openingPennantFlagGeometry = new THREE.ConeGeometry(1.15, 2.35, 3);
  const openingPennantFlagMaterials = [
    createBasicMaterial(VISUAL_PALETTE.roadLine),
    createBasicMaterial(VISUAL_PALETTE.cyan),
    createBasicMaterial('#ff5b68'),
  ];

  const cityPoint = (forwardDistance, lateral = 0, y = 0) =>
    corridorOrigin
      .clone()
      .addScaledVector(corridorForward, forwardDistance)
      .addScaledVector(corridorRight, lateral)
      .setY(y);

  const faceRoadYaw = (position, target = corridorOrigin) => {
    const direction = target.clone().sub(position).setY(0).normalize();
    return Math.atan2(direction.x, direction.z);
  };

  const addCityWindowGrid = (group, width, height, depth, rows = 4, columns = 4) => {
    const matrices = [];
    const geometry = new THREE.BoxGeometry(1.35, 1.25, 0.14);
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if ((row + column) % 5 === 0) continue;
        addInstanceMatrix(matrices, {
          position: new THREE.Vector3(
            -width * 0.34 + (width * 0.68 * column) / Math.max(1, columns - 1),
            5 + row * (height / (rows + 1)),
            depth / 2 + 0.1
          ),
        });
      }
    }
    createInstancedMesh({
      geometry,
      material: raceCityMaterials.glass,
      matrices,
      parent: group,
    });
  };

  const addDistrictIcon = (group, district, y, z) => {
    const iconGroup = new THREE.Group();
    iconGroup.position.set(0, y, z);
    const iconMat = createBasicMaterial(district.roof, {
      emissive: district.accent,
      emissiveIntensity: 0.42,
    });
    const accentMat = createBasicMaterial(district.accent, {
      emissive: district.accent,
      emissiveIntensity: 0.7,
    });

    if (district.icon === 'dumbbell') {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 8.6, 7), iconMat);
      bar.rotation.z = Math.PI / 2;
      iconGroup.add(bar);
      [-4.3, 4.3].forEach((x) => {
        [-0.52, 0.52].forEach((offset) => {
          const plate = new THREE.Mesh(new THREE.BoxGeometry(0.82, 2.7, 1), accentMat);
          plate.position.x = x + offset;
          iconGroup.add(plate);
        });
      });
    } else if (district.icon === 'utensils') {
      [-1.6, 1.6].forEach((x, index) => {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.48, 7.4, 0.7), iconMat);
        handle.position.x = x;
        handle.rotation.z = index === 0 ? 0.08 : -0.18;
        iconGroup.add(handle);
      });
      [-2.25, -1.6, -0.95].forEach((x) => {
        const tine = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.4, 0.64), accentMat);
        tine.position.set(x, 4, 0);
        iconGroup.add(tine);
      });
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.95, 3.4, 4), accentMat);
      blade.position.set(1.95, 3.7, 0);
      blade.rotation.z = -0.76;
      iconGroup.add(blade);
    } else if (district.icon === 'flask') {
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 4.2, 8), iconMat);
      neck.position.y = 2.7;
      const bulb = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 1.15, 4.6, 8), accentMat);
      bulb.position.y = -1.1;
      const liquid = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.1, 0.9), raceCityMaterials.cyan);
      liquid.position.y = -2.1;
      iconGroup.add(neck, bulb, liquid);
    } else if (district.icon === 'cross') {
      iconGroup.add(new THREE.Mesh(new THREE.BoxGeometry(2.1, 8.4, 0.9), iconMat));
      iconGroup.add(new THREE.Mesh(new THREE.BoxGeometry(7.6, 2.1, 0.95), iconMat));
    } else if (district.icon === 'wrench') {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(1.1, 8.6, 0.8), iconMat);
      handle.rotation.z = -0.65;
      const head = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.35, 6, 16, Math.PI * 1.35), accentMat);
      head.position.set(2.65, 2.85, 0);
      head.rotation.z = 0.92;
      iconGroup.add(handle, head);
    }

    group.add(iconGroup);
    return iconGroup;
  };

  const addDistrictProps = (group, district, width, depth) => {
    const accentMat = createBasicMaterial(district.accent, {
      emissive: district.accent,
      emissiveIntensity: 0.42,
    });
    const baseMat = createBasicMaterial(district.base);
    const darkMat = raceCityMaterials.dark;

    if (district.icon === 'dumbbell') {
      [-0.34, 0.34].forEach((xSide) => {
        const rack = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.2, 1.2), darkMat);
        rack.position.set(xSide * width, 1.2, depth / 2 + 7);
        group.add(rack);
        for (let plate = 0; plate < 3; plate += 1) {
          const weight = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.45, 8), accentMat);
          weight.position.set(xSide * width + plate * 1.1 - 1.1, 2.2, depth / 2 + 7);
          weight.rotation.x = Math.PI / 2;
          group.add(weight);
        }
      });
    } else if (district.icon === 'utensils') {
      [-0.35, 0.35].forEach((xSide) => {
        const stall = new THREE.Mesh(new THREE.BoxGeometry(7.8, 4.6, 5.2), baseMat);
        stall.position.set(xSide * width, 2.3, depth / 2 + 7.2);
        group.add(stall);
        const awning = new THREE.Mesh(new THREE.BoxGeometry(8.6, 1, 6), accentMat);
        awning.position.set(xSide * width, 5.1, depth / 2 + 7.2);
        group.add(awning);
      });
    } else if (district.icon === 'flask') {
      [-0.3, 0.3].forEach((xSide) => {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 10, 10), raceCityMaterials.glass);
        tube.position.set(xSide * width, 6.2, depth * 0.08);
        group.add(tube);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.8, 10), accentMat);
        cap.position.set(xSide * width, 11.5, depth * 0.08);
        group.add(cap);
      });
    } else if (district.icon === 'cross') {
      [-0.42, 0.42].forEach((xSide) => {
        const light = new THREE.Mesh(new THREE.BoxGeometry(3.6, 5.4, 0.5), accentMat);
        light.position.set(xSide * width, 6.5, depth / 2 + 0.55);
        group.add(light);
      });
    } else if (district.icon === 'wrench') {
      [-0.42, 0.42].forEach((xSide) => {
        for (let tire = 0; tire < 3; tire += 1) {
          const stack = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.45, 6, 12), darkMat);
          stack.position.set(xSide * width, 1.4 + tire * 1.25, depth / 2 + 6);
          stack.rotation.x = Math.PI / 2;
          group.add(stack);
        }
      });
    }
  };

  const addRaceDistrict = (district, index) => {
    const sample = compiled.pointAt(district.progress);
    const normal = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x).normalize().multiplyScalar(district.side);
    const position = sample.point
      .clone()
      .addScaledVector(normal, compiled.roadWidth / 2 + (district.setback ?? 98) + (index % 2) * 8);
    const group = new THREE.Group();
    const width = district.label === 'FOOD COURT' ? 26 : district.label === 'GARAGE' ? 28 : 22;
    const depth = district.label === 'LAB' ? 21 : 18;
    const height = district.label === 'LAB' ? 34 : district.label === 'FOOD COURT' ? 22 : 26;
    const baseMat = createBasicMaterial(district.base, {
      emissive: district.base,
      emissiveIntensity: 0.06,
    });
    const darkMat = createBasicMaterial(district.dark);
    const roofMat = createBasicMaterial(district.roof);
    const accentMat = createBasicMaterial(district.accent, {
      emissive: district.accent,
      emissiveIntensity: 0.58,
    });

    group.position.copy(position);
    group.rotation.y = faceRoadYaw(position, sample.point);

    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.82, width * 0.94, 0.38, 8), darkMat);
    plaza.position.set(0, 0.18, depth / 2 + 2.5);
    plaza.scale.z = 0.56;
    plaza.receiveShadow = true;
    group.add(plaza);

    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), baseMat);
    body.position.y = height / 2 + 0.6;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const upper = new THREE.Mesh(new THREE.BoxGeometry(width * 0.74, height * 0.42, depth * 0.76), darkMat);
    upper.position.set(0, height + height * 0.2 + 0.6, -depth * 0.03);
    upper.castShadow = true;
    group.add(upper);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 2.2, 2.2, depth + 2.2), roofMat);
    roof.position.set(0, height + 1.7, 0);
    roof.castShadow = true;
    group.add(roof);

    [-1, 1].forEach((side) => {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(4.2, height * 0.74, depth * 0.52), darkMat);
      tower.position.set(side * (width * 0.44), height * 0.37 + 0.6, depth * 0.02);
      tower.castShadow = true;
      group.add(tower);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.15, height * 0.64, depth * 0.58), accentMat);
      trim.position.set(side * (width * 0.44), height * 0.4 + 0.8, depth * 0.09);
      group.add(trim);
    });

    addCityWindowGrid(group, width, height, depth, district.label === 'LAB' ? 5 : 3, 4);

    const portalY = Math.min(10, height * 0.44);
    const portal = new THREE.Mesh(
      new THREE.CircleGeometry(5.3, 18),
      new THREE.MeshBasicMaterial({
        color: district.accent,
        depthWrite: false,
        opacity: 0.28,
        side: THREE.DoubleSide,
        transparent: true,
      })
    );
    portal.position.set(0, portalY, depth / 2 + 0.8);
    group.add(portal);

    const portalRing = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.5, 5, 16), accentMat);
    portalRing.position.copy(portal.position);
    group.add(portalRing);

    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.18, 4, 12), raceCityMaterials.light);
    innerRing.position.set(0, portalY, depth / 2 + 1.08);
    group.add(innerRing);

    const sign = createBillboardText(district.label, district.accent, { documentRef });
    sign.position.set(0, height + 8.6, depth / 2 + 1.2);
    sign.scale.set(district.label === 'FOOD COURT' ? 20 : 14.8, 4.2, 1);
    group.add(sign);

    addDistrictIcon(group, district, height + 4.2, depth / 2 + 1.6);
    addDistrictProps(group, district, width, depth);

    group.userData.portalRing = portalRing;
    group.userData.innerRing = innerRing;
    group.userData.portal = portal;
    group.userData.phase = index * 0.75;
    markAnimatedTransforms(portalRing, innerRing, portal);
    freezeStaticTree(group);
    collisionCircles.push({
      position: position.clone(),
      radius: Math.max(width, depth) * 0.74,
    });
    animatedCityDistricts.push(group);
    world.add(group);
    registerCameraCollider(group);
  };

  const animatedCityDistricts = [];
  const raceCityDistricts = compiled.districtAnchors || RACE_CITY_DISTRICTS;
  raceCityDistricts.forEach(addRaceDistrict);

  const addRoadDistrictSign = (district, index) => {
    const signProgress = clamp(district.progress - 0.035, 0.02, 0.98);
    const sample = compiled.pointAt(signProgress);
    const normal = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x).normalize().multiplyScalar(district.side);
    const position = sample.point.clone().addScaledVector(normal, compiled.roadWidth / 2 + 18 + (index % 2) * 3);
    const group = new THREE.Group();
    const darkMat = createBasicMaterial('#0b1b2d', {
      emissive: '#0b1b2d',
      emissiveIntensity: 0.12,
    });
    const accentMat = createBasicMaterial(district.accent, {
      emissive: district.accent,
      emissiveIntensity: 0.62,
    });
    const lightMat = createBasicMaterial('#f7fbff');
    group.position.copy(position);
    group.rotation.y = faceRoadYaw(position, sample.point);

    [-1, 1].forEach((side) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.58, 9.8, 0.58), darkMat);
      post.position.set(side * 6.9, 4.9, 0);
      post.castShadow = true;
      group.add(post);
    });

    const board = new THREE.Mesh(new THREE.BoxGeometry(16.4, 4.5, 0.8), darkMat);
    board.position.set(0, 9.2, 0);
    board.castShadow = true;
    group.add(board);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(15.4, 0.5, 1), accentMat);
    stripe.position.set(0, 11.2, 0.05);
    group.add(stripe);

    [-2.8, 0, 2.8].forEach((x) => {
      const arrow = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.32, 0.82), lightMat);
      arrow.position.set(x, 7.1, 0.46);
      arrow.rotation.z = district.side > 0 ? -0.66 : 0.66;
      group.add(arrow);
    });

    const text = createBillboardText(district.label, district.accent, { documentRef });
    text.position.set(0, 9.3, 0.62);
    text.scale.set(district.label === 'FOOD COURT' ? 11.8 : 9.8, 2.5, 1);
    group.add(text);

    freezeStaticTree(group);
    world.add(group);
    registerCameraCollider(group);
  };
  raceCityDistricts.forEach(addRoadDistrictSign);

  const addOpeningStorefront = ({
    accent = VISUAL_PALETTE.roadLine,
    body = '#2778d8',
    label,
    progress,
    side = 1,
  }) => {
    const sample = compiled.pointAt(progress);
    const normal = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x).normalize().multiplyScalar(side);
    const position = sample.point.clone().addScaledVector(normal, compiled.roadWidth / 2 + 24);
    const group = new THREE.Group();
    const bodyMat = createBasicMaterial(body, { emissive: body, emissiveIntensity: 0.1 });
    const accentMat = createBasicMaterial(accent, { emissive: accent, emissiveIntensity: 0.44 });
    const darkMat = raceCityMaterials.dark;

    group.userData.kind = 'arcade-storefront-strip';
    group.userData.label = label;
    group.position.copy(position);
    group.rotation.y = faceRoadYaw(position, sample.point);

    const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(24, 0.32, 7.2), raceCityMaterials.asphalt);
    sidewalk.userData.kind = 'arcade-storefront-sidewalk';
    sidewalk.position.set(0, 0.22, 2.8);
    sidewalk.receiveShadow = true;
    group.add(sidewalk);

    const facade = new THREE.Mesh(new THREE.BoxGeometry(22, 11.5, 3.4), bodyMat);
    facade.userData.kind = 'arcade-storefront-facade';
    facade.position.set(0, 6.1, 0);
    facade.castShadow = true;
    facade.receiveShadow = true;
    group.add(facade);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(23.2, 1.25, 4.3), darkMat);
    roof.userData.kind = 'arcade-storefront-roof';
    roof.position.set(0, 12.35, 0.1);
    roof.castShadow = true;
    group.add(roof);

    const awningLightMat = createBasicMaterial('#fff6da', { emissive: accent, emissiveIntensity: 0.18 });
    [-6.4, 0, 6.4].forEach((x, index) => {
      queueStaticDecorationInstance({
        geometry: openingStorefrontWindowGeometry,
        kind: 'arcade-storefront-window',
        material: raceCityMaterials.glass,
        parent: group,
        position: new THREE.Vector3(x, 6.4, 1.82),
      });

      queueStaticDecorationInstance({
        geometry: openingStorefrontAwningGeometry,
        kind: 'arcade-storefront-awning',
        material: index % 2 ? awningLightMat : accentMat,
        parent: group,
        position: new THREE.Vector3(x, 8.6, 2.45),
      });
    });

    const door = new THREE.Mesh(new THREE.BoxGeometry(3.2, 5.5, 0.28), darkMat);
    door.userData.kind = 'arcade-storefront-door';
    door.position.set(0, 3.1, 1.92);
    group.add(door);

    const sign = createBillboardText(label, accent, { documentRef });
    sign.userData.kind = 'arcade-storefront-label';
    sign.material.depthTest = false;
    sign.position.set(0, 14.25, 2.45);
    sign.scale.set(label.length > 9 ? 13.2 : 11.2, 3.0, 1);
    group.add(sign);

    freezeStaticTree(group);
    world.add(group);
  };

  const addOpeningPennantRun = ({ label, progress }) => {
    const sample = compiled.pointAt(progress);
    const group = new THREE.Group();
    const postOffset = compiled.roadWidth / 2 + 7.4;
    const pennantOffsets = [-14.4, -9.6, -4.8, 0, 4.8, 9.6, 14.4];
    const darkMat = raceCityMaterials.dark;

    group.userData.kind = 'opening-pennant-run';
    group.userData.label = label;
    group.position.copy(sample.point);
    group.rotation.y = -Math.atan2(sample.tangent.z, sample.tangent.x);

    [-1, 1].forEach((side) => {
      queueStaticDecorationInstance({
        geometry: openingPennantPostGeometry,
        kind: 'opening-pennant-post',
        material: darkMat,
        parent: group,
        position: new THREE.Vector3(0, 6.9, side * postOffset),
      });
    });

    queueStaticDecorationInstance({
      geometry: openingPennantCordGeometry,
      kind: 'opening-pennant-cord',
      material: raceCityMaterials.light,
      parent: group,
      position: new THREE.Vector3(0, 13.6, 0),
    });

    pennantOffsets.forEach((z, index) => {
      queueStaticDecorationInstance({
        geometry: openingPennantFlagGeometry,
        kind: 'opening-pennant-flag',
        material: openingPennantFlagMaterials[index % openingPennantFlagMaterials.length],
        parent: group,
        position: new THREE.Vector3(0.15, 12.25, z),
        rotation: new THREE.Vector3(0, 0, Math.PI),
      });
    });

    const banner = createBillboardText(label, VISUAL_PALETTE.roadLine, { documentRef });
    banner.userData.kind = 'opening-pennant-label';
    banner.material.depthTest = false;
    banner.position.set(0.28, 14.85, 0);
    banner.scale.set(15.8, 3.4, 1);
    group.add(banner);

    freezeStaticTree(group);
    world.add(group);
  };

  let openingTreeCount = 0;
  const addOpeningTreeRows = () => {
    const trunkMatrices = [];
    const crownMatrices = [];
    const highlightCrownMatrices = [];
    const treeSpecs = [
      [0.024, -1, 0],
      [0.036, 1, 1],
      [0.052, -1, 1],
      [0.068, 1, 0],
      [0.128, -1, 1],
      [0.148, 1, 0],
    ];
    treeSpecs.forEach(([progress, side, variant], index) => {
      const sample = compiled.pointAt(progress);
      const normal = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x).normalize().multiplyScalar(side);
      const offset = compiled.roadWidth / 2 + 17.2 + variant * 5.8 + (index % 3) * 1.2;
      const position = sample.point.clone().addScaledVector(normal, offset);
      const scale = 0.92 + (index % 4) * 0.08;
      addInstanceMatrix(trunkMatrices, {
        position: new THREE.Vector3(position.x, 3.05 * scale, position.z),
        rotationY: index * 0.37,
        scale: new THREE.Vector3(scale, scale, scale),
      });
      addInstanceMatrix(index % 2 === 0 ? crownMatrices : highlightCrownMatrices, {
        position: new THREE.Vector3(position.x, 7.6 * scale, position.z),
        rotationY: index * 0.53,
        scale: new THREE.Vector3(scale, scale, scale),
      });
      openingTreeCount += 1;
    });

    const trunkMesh = createInstancedMesh({
      castShadow: true,
      geometry: new THREE.CylinderGeometry(0.48, 0.68, 5.6, 6),
      material: trunkMat,
      matrices: trunkMatrices,
      parent: world,
    });
    const crownMesh = createInstancedMesh({
      castShadow: true,
      geometry: new THREE.DodecahedronGeometry(3.45, 0),
      material: createBasicMaterial('#4fc56a', { emissive: '#4fc56a', emissiveIntensity: 0.16 }),
      matrices: crownMatrices,
      parent: world,
    });
    const highlightCrownMesh = createInstancedMesh({
      castShadow: true,
      geometry: new THREE.DodecahedronGeometry(3.2, 0),
      material: createBasicMaterial('#8fe36b', { emissive: '#8fe36b', emissiveIntensity: 0.18 }),
      matrices: highlightCrownMatrices,
      parent: world,
    });
    if (trunkMesh) trunkMesh.userData.kind = 'opening-tree-trunks';
    if (crownMesh) crownMesh.userData.kind = 'opening-tree-crowns';
    if (highlightCrownMesh) highlightCrownMesh.userData.kind = 'opening-tree-highlight-crowns';
  };

  if (cleanCityCourse) {
    [
      { accent: VISUAL_PALETTE.roadLine, body: VISUAL_PALETTE.food, label: 'TURBO MART', progress: 0.062, side: 0.55 },
      { accent: VISUAL_PALETTE.cyan, body: VISUAL_PALETTE.garage, label: 'PIT SHOP', progress: 0.095, side: -1 },
      { accent: VISUAL_PALETTE.food, body: VISUAL_PALETTE.lab, label: 'DRIFT CAFE', progress: 0.165, side: -1 },
    ].forEach(addOpeningStorefront);
    [
      { label: 'COMEBACK CUP', progress: 0.038 },
      { label: 'BOOST ROW', progress: 0.083 },
      { label: 'DRIFT LANE', progress: 0.146 },
    ].forEach(addOpeningPennantRun);
    addOpeningTreeRows();
    flushStaticDecorationBatches();
  }

  const addBranchDecisionSign = (route, index) => {
    const signProgress = wrap01(route.decisionCueProgress ?? route.startProgress - 0.04);
    const sample = compiled.pointAt(signProgress);
    const side = route.entrySide || (index % 2 === 0 ? -1 : 1);
    const normal = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x).normalize().multiplyScalar(side);
    const position = sample.point.clone().addScaledVector(normal, compiled.roadWidth / 2 + 13.5);
    const accent = route.accent || VISUAL_PALETTE.cyan;
    const group = new THREE.Group();
    const darkMat = createBasicMaterial('#07182a', {
      emissive: '#07182a',
      emissiveIntensity: 0.16,
    });
    const accentMat = createBasicMaterial(accent, {
      emissive: accent,
      emissiveIntensity: 0.75,
    });
    const lightMat = createBasicMaterial('#f7fbff');
    group.position.copy(position);
    group.rotation.y = faceRoadYaw(position, sample.point);

    [-1, 1].forEach((postSide) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.54, 8.8, 0.54), darkMat);
      post.position.set(postSide * 7.8, 4.4, 0);
      post.castShadow = true;
      group.add(post);
    });

    const board = new THREE.Mesh(new THREE.BoxGeometry(18.4, 5.2, 0.85), darkMat);
    board.position.set(0, 8.8, 0);
    board.castShadow = true;
    group.add(board);

    const label = createBillboardText(route.label || route.name || 'BRANCH', accent, { documentRef });
    label.position.set(0, 9.05, 0.62);
    label.scale.set(11.4, 2.7, 1);
    group.add(label);

    [-4.4, -1.4, 1.6, 4.6].forEach((x) => {
      const arrow = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.34, 0.82), lightMat);
      arrow.position.set(x, 6.35, 0.52);
      arrow.rotation.z = side > 0 ? -0.62 : 0.62;
      group.add(arrow);
    });

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(17.2, 0.5, 1), accentMat);
    stripe.position.set(0, 11.35, 0.05);
    group.add(stripe);

    group.userData.branchKey = route.key;
    freezeStaticTree(group);
    world.add(group);
    registerCameraCollider(group);
  };
  if (cleanCityCourse) (compiled.branchRoutes || []).forEach(addBranchDecisionSign);

  const addRaceObjectiveMarker = () => {
    const markerGroup = new THREE.Group();
    markerGroup.position.copy(cityPoint(185, 0, 0));
    markerGroup.position.y = 0.5;

    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(9.5, 11.5, 0.35, 16),
      new THREE.MeshBasicMaterial({
        color: VISUAL_PALETTE.cyan,
        opacity: 0.24,
        transparent: true,
      })
    );
    pad.position.y = 0.2;
    markerGroup.add(pad);

    const padRing = new THREE.Mesh(new THREE.TorusGeometry(10, 0.32, 4, 16), raceCityMaterials.cyan);
    padRing.rotation.x = Math.PI / 2;
    padRing.position.y = 0.45;
    markerGroup.add(padRing);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 3.4, 86, 8, 1, true),
      new THREE.MeshBasicMaterial({
        color: VISUAL_PALETTE.cyan,
        depthWrite: false,
        opacity: 0.34,
        transparent: true,
      })
    );
    beam.position.y = 43;
    markerGroup.add(beam);

    const badgeCanvas = documentRef.createElement('canvas');
    badgeCanvas.width = 160;
    badgeCanvas.height = 160;
    const badgeCtx = badgeCanvas.getContext('2d');
    badgeCtx.translate(80, 80);
    badgeCtx.fillStyle = '#073a75';
    badgeCtx.strokeStyle = '#f7fbff';
    badgeCtx.lineWidth = 9;
    badgeCtx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = Math.PI / 8 + (Math.PI * 2 * i) / 8;
      const x = Math.cos(angle) * 62;
      const y = Math.sin(angle) * 62;
      if (i === 0) badgeCtx.moveTo(x, y);
      else badgeCtx.lineTo(x, y);
    }
    badgeCtx.closePath();
    badgeCtx.fill();
    badgeCtx.stroke();
    badgeCtx.strokeStyle = VISUAL_PALETTE.cyan;
    badgeCtx.lineWidth = 8;
    badgeCtx.stroke();
    badgeCtx.fillStyle = '#f7fbff';
    badgeCtx.fillRect(-27, -34, 7, 64);
    badgeCtx.beginPath();
    badgeCtx.moveTo(-19, -31);
    badgeCtx.lineTo(32, -16);
    badgeCtx.lineTo(4, 5);
    badgeCtx.lineTo(32, 23);
    badgeCtx.lineTo(-19, 14);
    badgeCtx.closePath();
    badgeCtx.fill();
    const badgeTexture = new THREE.CanvasTexture(badgeCanvas);
    badgeTexture.colorSpace = THREE.SRGBColorSpace;
    const badge = new THREE.Sprite(
      new THREE.SpriteMaterial({
        depthWrite: false,
        map: badgeTexture,
        transparent: true,
      })
    );
    badge.position.y = 33;
    badge.scale.set(19, 19, 1);
    badge.renderOrder = 5;
    markerGroup.add(badge);

    const flag = new THREE.Mesh(new THREE.BoxGeometry(1.1, 6.4, 0.5), raceCityMaterials.light);
    flag.position.set(-1.3, 33.4, 0.3);
    const flagCloth = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 0.45), raceCityMaterials.cyan);
    flagCloth.position.set(1.7, 35.2, 0.4);
    markerGroup.add(flag, flagCloth);

    markerGroup.userData.beam = beam;
    markerGroup.userData.badge = badge;
    markerGroup.userData.padRing = padRing;
    markAnimatedTransforms(beam, badge, padRing);
    freezeStaticTree(markerGroup);
    world.add(markerGroup);
    animatedCityDistricts.push(markerGroup);
  };
  addRaceObjectiveMarker();

  const addCitySkyline = () => {
    const base = cityPoint(305, 0, 0);
    const skylineMats = [
      createBasicMaterial('#2d76b7'),
      createBasicMaterial('#5a91b2'),
      createBasicMaterial('#315b8d'),
      createBasicMaterial('#e28d47'),
      createBasicMaterial('#8a53df'),
      createBasicMaterial('#f3ece0'),
    ];
    const skylineBlockGeometry = new THREE.BoxGeometry(1, 1, 1);
    const skylineSpireGeometry = new THREE.ConeGeometry(1, 1, 5);
    const skylineBlockMatrices = skylineMats.map(() => []);
    const skylineSpireMatrices = [[], []];
    for (let i = 0; i < 34; i += 1) {
      const lateral = -178 + i * 10.8;
      const depthOffset = (i % 5) * 7 - 12;
      const p = base
        .clone()
        .addScaledVector(corridorRight, lateral)
        .addScaledVector(corridorForward, depthOffset);
      const h = 20 + (i % 8) * 6.4 + (i % 5 === 0 ? 14 : 0);
      const w = 6.8 + (i % 3) * 2.4;
      const d = 8.5 + (i % 4) * 2.2;
      const yaw = faceRoadYaw(new THREE.Vector3(p.x, h / 2, p.z), corridorOrigin) + (i % 3 - 1) * 0.035;
      addInstanceMatrix(skylineBlockMatrices[i % skylineMats.length], {
        position: new THREE.Vector3(p.x, h / 2, p.z),
        rotationY: yaw,
        scale: new THREE.Vector3(w, h, d),
      });
      collisionCircles.push({ position: new THREE.Vector3(p.x, 0, p.z), radius: Math.max(w, d) * 0.72 });
      if (i % 4 === 0) {
        const spireHeight = 9 + (i % 3) * 4;
        addInstanceMatrix(skylineSpireMatrices[i % 2], {
          position: new THREE.Vector3(p.x, h + 4.2, p.z),
          rotationY: yaw,
          scale: new THREE.Vector3(w * 0.36, spireHeight, w * 0.36),
        });
      }
    }
    skylineBlockMatrices.forEach((matrices, index) => {
      createInstancedMesh({
        castShadow: true,
        geometry: skylineBlockGeometry,
        material: skylineMats[index],
        matrices,
        parent: world,
      });
    });
    [raceCityMaterials.light, raceCityMaterials.cyan].forEach((material, index) => {
      createInstancedMesh({
        castShadow: true,
        geometry: skylineSpireGeometry,
        material,
        matrices: skylineSpireMatrices[index],
        parent: world,
      });
    });

    const wheelGroup = new THREE.Group();
    const wheelCenter = base.clone().addScaledVector(corridorRight, -118).addScaledVector(corridorForward, -6);
    wheelGroup.position.set(wheelCenter.x, 28, wheelCenter.z);
    wheelGroup.rotation.y = faceRoadYaw(wheelCenter, corridorOrigin);
    const wheelMat = createBasicMaterial('#f3ece0', {
      emissive: '#ffd34f',
      emissiveIntensity: 0.16,
    });
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(17, 0.38, 4, 18), wheelMat);
    wheelGroup.add(wheel);
    for (let i = 0; i < 10; i += 1) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.34, 17, 0.34), wheelMat);
      spoke.rotation.z = (Math.PI * i) / 10;
      wheelGroup.add(spoke);
    }
    const legA = new THREE.Mesh(new THREE.BoxGeometry(0.7, 34, 0.7), wheelMat);
    legA.position.set(-6.2, -17, 0);
    legA.rotation.z = -0.26;
    const legB = legA.clone();
    legB.position.x = 6.2;
    legB.rotation.z = 0.26;
    wheelGroup.add(legA, legB);
    freezeStaticTree(wheelGroup);
    world.add(wheelGroup);
    registerCameraCollider(wheelGroup);
  };
  addCitySkyline();

  const addPerimeterSkyline = () => {
    const skylineMats = [
      createBasicMaterial('#2d76b7'),
      createBasicMaterial('#5a91b2'),
      createBasicMaterial('#315b8d'),
      createBasicMaterial('#55b957'),
      createBasicMaterial('#f28b2e'),
      createBasicMaterial('#8a53df'),
      createBasicMaterial('#e64b4b'),
    ];
    const windowMat = createBasicMaterial('#dff8ff', {
      emissive: '#74f1ff',
      emissiveIntensity: 0.22,
      opacity: 0.74,
      transparent: true,
    });
    const perimeterBlockGeometry = new THREE.BoxGeometry(1, 1, 1);
    const perimeterRoofGeometry = new THREE.BoxGeometry(1, 1, 1);
    const perimeterBlockMatrices = skylineMats.map(() => []);
    const perimeterRoofMatrices = [[], []];
    const perimeterWindowGeometry = new THREE.BoxGeometry(1.1, 0.9, 0.12);
    const perimeterWindowMatrices = [];
    const placeBlock = (x, z, index, yaw = 0) => {
      const h = 18 + (index % 7) * 5.5 + (index % 6 === 0 ? 12 : 0);
      const w = 7 + (index % 3) * 2.2;
      const d = 8 + (index % 4) * 2.4;
      const blockYaw = yaw + (index % 3 - 1) * 0.035;
      addInstanceMatrix(perimeterBlockMatrices[index % skylineMats.length], {
        position: new THREE.Vector3(x, h / 2 - 0.6, z),
        rotationY: blockYaw,
        scale: new THREE.Vector3(w, h, d),
      });
      collisionCircles.push({ position: new THREE.Vector3(x, 0, z), radius: Math.max(w, d) * 0.72 });

      addInstanceMatrix(perimeterRoofMatrices[index % 2], {
        position: new THREE.Vector3(x, h + 0.1, z),
        rotationY: blockYaw,
        scale: new THREE.Vector3(w + 1.1, 1.4, d + 1.1),
      });

      for (let row = 0; row < Math.min(5, Math.floor(h / 6)); row += 1) {
        [-0.28, 0.28].forEach((side) => {
          addInstanceMatrix(perimeterWindowMatrices, {
            position: new THREE.Vector3(x + side * w, 4.8 + row * 4.8, z - d / 2 - 0.08),
            rotationY: blockYaw,
          });
        });
      }
    };

    const xStart = bounds.minX - 56;
    const xEnd = bounds.maxX + 56;
    const zStart = bounds.minZ - 48;
    const zEnd = bounds.maxZ + 56;
    for (let i = 0; i < 26; i += 1) {
      const t = i / 25;
      const x = xStart + (xEnd - xStart) * t;
      placeBlock(x, bounds.maxZ + 112 + (i % 5) * 7, i, Math.PI);
      placeBlock(x, bounds.minZ - 112 - (i % 4) * 7, i + 31, 0);
    }
    for (let i = 0; i < 17; i += 1) {
      const t = i / 16;
      const z = zStart + (zEnd - zStart) * t;
      placeBlock(bounds.minX - 122 - (i % 4) * 8, z, i + 63, Math.PI / 2);
      placeBlock(bounds.maxX + 122 + (i % 5) * 7, z, i + 91, -Math.PI / 2);
    }
    perimeterBlockMatrices.forEach((matrices, index) => {
      createInstancedMesh({
        castShadow: true,
        geometry: perimeterBlockGeometry,
        material: skylineMats[index],
        matrices,
        parent: world,
        receiveShadow: true,
      });
    });
    [raceCityMaterials.dark, raceCityMaterials.light].forEach((material, index) => {
      createInstancedMesh({
        castShadow: true,
        geometry: perimeterRoofGeometry,
        material,
        matrices: perimeterRoofMatrices[index],
        parent: world,
      });
    });
    createInstancedMesh({
      geometry: perimeterWindowGeometry,
      material: windowMat,
      matrices: perimeterWindowMatrices,
      parent: world,
    });
  };
  addPerimeterSkyline();

  const addMountainsAndClouds = () => {
    [-128, -82, -38, 62, 116, 160].forEach((lateral, index) => {
      const p = cityPoint(456 + (index % 2) * 22, lateral * 1.12, 0);
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(22 + (index % 3) * 5, 42 + (index % 2) * 12, 4),
        createBasicMaterial(index % 2 ? '#9bc2d3' : '#8eb3c8')
      );
      mountain.position.set(p.x, 15.5, p.z);
      mountain.rotation.y = Math.PI / 4;
      freezeStaticTransform(mountain);
      world.add(mountain);

      const snow = new THREE.Mesh(
        new THREE.ConeGeometry(8 + (index % 3) * 1.6, 12, 4),
        raceCityMaterials.light
      );
      snow.position.set(p.x, 39 + (index % 2) * 6, p.z);
      snow.rotation.y = Math.PI / 4;
      freezeStaticTransform(snow);
      world.add(snow);
    });

    const cloudMat = new THREE.MeshBasicMaterial({ color: '#f7fbff', opacity: 0.82, transparent: true });
    const puffGeometry = new THREE.DodecahedronGeometry(1, 0);
    [
      { d: 118, l: -92, y: 84, s: 6.3 },
      { d: 156, l: -12, y: 104, s: 5.1 },
      { d: 140, l: 86, y: 90, s: 6.8 },
      { d: 214, l: 32, y: 118, s: 4.9 },
    ].forEach((cloud, cloudIndex) => {
      const p = cityPoint(cloud.d, cloud.l, cloud.y);
      const group = new THREE.Group();
      group.position.copy(p);
      [-1.7, -0.5, 0.8, 1.9].forEach((offset, puffIndex) => {
        const puff = new THREE.Mesh(puffGeometry, cloudMat);
        puff.position.set(offset * cloud.s, Math.sin(puffIndex) * cloud.s * 0.2, 0);
        puff.scale.set(cloud.s * (0.86 + puffIndex * 0.08), cloud.s * 0.44, cloud.s * 0.34);
        group.add(puff);
      });
      group.userData.cloudSpeed = 0.012 + cloudIndex * 0.003;
      freezeStaticTree(group);
      world.add(group);
    });
  };
  addMountainsAndClouds();

  const addWaterAndBridge = () => {
    const waterCenter = cityPoint(58, 76, 0);
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 92, 1, 1),
      new THREE.MeshBasicMaterial({
        color: '#0ea5c8',
        opacity: 0.64,
        side: THREE.DoubleSide,
        transparent: true,
      })
    );
    water.position.set(waterCenter.x, 0.03, waterCenter.z);
    water.rotation.x = -Math.PI / 2;
    water.rotation.z = Math.atan2(corridorForward.z, corridorForward.x);
    freezeStaticTransform(water);
    world.add(water);

    for (let i = 0; i < 9; i += 1) {
      const ripple = new THREE.Mesh(new THREE.BoxGeometry(16 + (i % 3) * 6, 0.05, 0.32), raceCityMaterials.cyan);
      const p = waterCenter
        .clone()
        .addScaledVector(corridorForward, -36 + i * 9)
        .addScaledVector(corridorRight, -26 + (i % 4) * 13);
      ripple.position.set(p.x, 0.11, p.z);
      ripple.rotation.y = -Math.atan2(corridorForward.z, corridorForward.x);
      freezeStaticTransform(ripple);
      world.add(ripple);
    }

    const bridgeCenter = cityPoint(70, 45, 0);
    const bridgeYaw = -Math.atan2(corridorForward.z, corridorForward.x);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(70, 1.1, 13.5), createBasicMaterial('#65717f'));
    deck.position.set(bridgeCenter.x, 2.3, bridgeCenter.z);
    deck.rotation.y = bridgeYaw;
    deck.castShadow = true;
    freezeStaticTransform(deck);
    world.add(deck);
    registerCameraCollider(deck);
    [-1, 1].forEach((side) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(70, 0.5, 0.45), raceCityMaterials.light);
      rail.position.copy(deck.position);
      rail.position.y += 1.25;
      rail.rotation.y = bridgeYaw;
      rail.translateZ(side * 6.5);
      freezeStaticTransform(rail);
      world.add(rail);
    });
  };
  addWaterAndBridge();

  const plazaLampCount = cleanCityCourse ? 6 : 18;
  for (let i = 0; i < plazaLampCount; i += 1) {
    const sample = compiled.pointAt(0.81 + i * (cleanCityCourse ? 0.018 : 0.008));
    const normal = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x).normalize();
    [-1, 1].forEach((side) => {
      const p = sample.point.clone().addScaledVector(normal, side * (compiled.roadWidth / 2 + 7.6));
      addInstanceMatrix(plazaLampPoleMatrices, {
        position: new THREE.Vector3(p.x, 3.8, p.z),
      });
      addInstanceMatrix(side > 0 ? plazaLampCyanBulbMatrices : plazaLampYellowBulbMatrices, {
        position: new THREE.Vector3(p.x, 7.85, p.z),
      });
    });
  }
  createInstancedMesh({
    geometry: new THREE.CylinderGeometry(0.16, 0.26, 7.6, 6),
    material: railPostMat,
    matrices: plazaLampPoleMatrices,
    parent: world,
  });
  createInstancedMesh({
    geometry: new THREE.SphereGeometry(0.72, 8, 6),
    material: raceCityMaterials.cyan,
    matrices: plazaLampCyanBulbMatrices,
    parent: world,
  });
  createInstancedMesh({
    geometry: new THREE.SphereGeometry(0.72, 8, 6),
    material: raceCityMaterials.yellow,
    matrices: plazaLampYellowBulbMatrices,
    parent: world,
  });

  animatedCityDistricts.forEach((group) => {
    group.userData.animate = (time, dt) => {
      if (group.userData.portalRing) {
        group.userData.portalRing.rotation.z += dt * 0.9;
        group.userData.innerRing.rotation.z -= dt * 1.35;
        group.userData.portal.material.opacity = 0.2 + Math.sin(time / 190 + group.userData.phase) * 0.07;
        const pulse = 1 + Math.sin(time / 180 + group.userData.phase) * 0.035;
        group.userData.portal.scale.setScalar(pulse);
      }
      if (group.userData.beam) {
        group.userData.beam.rotation.y += dt * 0.14;
        group.userData.beam.material.opacity = 0.2 + Math.sin(time / 260) * 0.05;
        group.userData.badge.rotation.y += dt * 1.1;
        group.userData.badge.position.y = 33 + Math.sin(time / 240) * 0.5;
        group.userData.padRing.rotation.z += dt * 0.8;
      }
    };
  });

  createInstancedMesh({
    geometry: worldWindowGeometry,
    material: windowMat,
    matrices: worldWindowMatrices,
    parent: world,
  });

  world.userData.cityAnimationHooks = animatedCityDistricts;

  return {
    animationHooks: animatedCityDistricts,
    collisionCircleCount: collisionCircles.length,
    openingTreeCount,
    worldChildCount: world.children.length,
  };
};
