// LEGACY - NOT THE SHIPPED GAME. Editing this file changes nothing the
// owner ever sees. The racer that ships is the ComebackCityThreeKartRace.jsx
// monolith, which imports NONE of this module tree (its only render-layer
// imports are raceParticles / toonRimShader / gltfLoader / createRaceScene
// (renderer+canvas fit only) / createBasicMaterial).
//
// The shipped road, shoulders, boost pads and chevrons are built inline in
// the monolith (~1648+). Kept: npm run test:race imports this directly.

import * as THREE from 'three';
import { SHOULDER_WIDTH } from '../track/trackGeometry.js';
import { configureRaceCanvasTexture, createBillboardText } from './createBillboardText.js';
import { createBasicMaterial } from './createKartModel.js';

export const createTrackRenderMaterials = ({ compiled = {}, theme = {} } = {}) => ({
  apexMat: createBasicMaterial('#ff5b68', { emissive: '#ff5b68', emissiveIntensity: 0.26 }),
  asphaltMat: new THREE.MeshStandardMaterial({
    color: compiled.asphalt || '#3d4450',
    flatShading: true,
    metalness: 0,
    roughness: 0.76,
  }),
  barrierMat: createBasicMaterial('#17324a', { emissive: '#17324a', emissiveIntensity: 0.08 }),
  beaconMat: createBasicMaterial('#46d9ef', { emissive: '#46d9ef', emissiveIntensity: 0.62 }),
  curbAMat: createBasicMaterial(compiled.curbA || '#fff6da'),
  curbBMat: createBasicMaterial(compiled.curbB || compiled.accent || '#2cc8ff'),
  curbRedMat: createBasicMaterial('#e2554f'),
  groundMat: createBasicMaterial(compiled.grass || theme.ground || '#79c96d', {
    roughness: 0.86,
  }),
  lineMat: createBasicMaterial('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 0.12 }),
  mutedLineMat: createBasicMaterial('#9fb0aa'),
  orangeMat: createBasicMaterial('#ffac32', { emissive: '#ffac32', emissiveIntensity: 0.28 }),
  railMat: createBasicMaterial('#eef6ff'),
  railPostMat: createBasicMaterial('#202837'),
  shoulderMat: createBasicMaterial('#586675'),
  whiteLineMat: createBasicMaterial('#f7fbff'),
});

const freezeStaticTransform = (object) => {
  object.updateMatrix();
  object.matrixAutoUpdate = false;
  return object;
};

const CLEAN_TRACK_BOX_BATCH_SEGMENTS = 6;

const signedAngleDelta = (target, current) => {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
};

export const createCleanCourseVisualSegments = (
  segments = [],
  {
    maxHeadingDelta = 0.12,
    maxSegmentsPerChunk = 3,
  } = {}
) => {
  const visualSegments = [];
  let index = 0;
  while (index < segments.length) {
    const first = segments[index];
    let endIndex = index;
    let previousHeading = Math.atan2(first.dz, first.dx);

    while (endIndex + 1 < segments.length && endIndex - index + 1 < maxSegmentsPerChunk) {
      const next = segments[endIndex + 1];
      const nextHeading = Math.atan2(next.dz, next.dx);
      if (Math.abs(signedAngleDelta(nextHeading, previousHeading)) > maxHeadingDelta) break;
      endIndex += 1;
      previousHeading = nextHeading;
    }

    const last = segments[endIndex];
    const dx = last.b.x - first.a.x;
    const dz = last.b.z - first.a.z;
    const length = Math.max(0.001, Math.hypot(dx, dz));
    visualSegments.push({
      a: first.a,
      b: last.b,
      dx,
      dz,
      length,
      sourceCount: endIndex - index + 1,
      tangent: new THREE.Vector3(dx / length, 0, dz / length),
    });
    index = endIndex + 1;
  }
  return visualSegments;
};

export const createBoostPadMesh = ({ compiled = {}, lineMat, world, zipper } = {}) => {
  const group = new THREE.Group();
  group.userData.kind = 'boost-pad-visual';
  group.position.copy(zipper.position);
  group.position.y = 0.42;
  group.rotation.y = -Math.atan2(zipper.tangent.z, zipper.tangent.x);
  const mat = createBasicMaterial('#18e6ff', {
    emissive: '#18e6ff',
    emissiveIntensity: 0.72,
  });
  const stripeMaterial =
    lineMat?.clone?.() || createBasicMaterial('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 0.12 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.34, compiled.roadWidth * 0.58), mat);
  base.userData.kind = 'boost-pad-base';
  freezeStaticTransform(base);
  group.add(base);
  [-1, 1].forEach((side) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(17.6, 0.28, 0.86),
      createBasicMaterial('#fff46a', { emissive: '#ffd34f', emissiveIntensity: 0.42 })
    );
    rail.userData.kind = 'boost-pad-rail';
    rail.position.set(0, 0.4, side * compiled.roadWidth * 0.29);
    freezeStaticTransform(rail);
    group.add(rail);
  });
  [-5.6, 0, 5.6].forEach((x, index) => {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(3.15, 7.6, 3), stripeMaterial);
    arrow.userData.kind = 'boost-pad-chevron';
    arrow.userData.chevronIndex = index;
    arrow.position.set(x, 0.68, 0);
    arrow.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
    arrow.scale.set(1.22, 1, 1);
    freezeStaticTransform(arrow);
    group.add(arrow);
  });
  const centerStripe = new THREE.Mesh(
    new THREE.BoxGeometry(16.6, 0.08, 0.42),
    createBasicMaterial('#f7fbff', { emissive: '#f7fbff', emissiveIntensity: 0.28 })
  );
  centerStripe.userData.kind = 'boost-pad-center-stripe';
  centerStripe.position.set(0, 0.54, 0);
  freezeStaticTransform(centerStripe);
  group.add(centerStripe);

  const signMat = createBasicMaterial('#102a44', { emissive: '#18e6ff', emissiveIntensity: 0.18 });
  const signAccentMat = createBasicMaterial('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 0.52 });
  const postMat = createBasicMaterial('#18e6ff', { emissive: '#18e6ff', emissiveIntensity: 0.48 });
  const signX = -6.9;
  const signWidth = compiled.roadWidth * 0.46;
  [-1, 1].forEach((side) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.42, 3.1, 0.42), postMat);
    post.userData.kind = 'boost-pad-gantry-post';
    post.position.set(signX, 1.88, side * signWidth * 0.5);
    freezeStaticTransform(post);
    group.add(post);
  });
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.58, signWidth), signMat);
  signBoard.userData.kind = 'boost-pad-gantry-board';
  signBoard.position.set(signX, 3.45, 0);
  freezeStaticTransform(signBoard);
  group.add(signBoard);
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, signWidth + 1.2), postMat);
  topBar.userData.kind = 'boost-pad-gantry-top';
  topBar.position.set(signX, 4.36, 0);
  freezeStaticTransform(topBar);
  group.add(topBar);
  [-2.65, 0, 2.65].forEach((z, index) => {
    const arrowMark = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.42, 1.25), signAccentMat);
    arrowMark.userData.kind = 'boost-pad-gantry-chevron';
    arrowMark.userData.chevronIndex = index;
    arrowMark.position.set(signX - 0.28, 3.45, z);
    arrowMark.rotation.x = -0.58;
    freezeStaticTransform(arrowMark);
    group.add(arrowMark);
  });
  freezeStaticTransform(group);
  world.add(group);
  return group;
};

export const createTrackMesh = ({ compiled, documentRef = globalThis.document, theme = {}, world } = {}) => {
  const bounds = compiled.bounds;
  const trackSpanX = bounds.maxX - bounds.minX;
  const trackSpanZ = bounds.maxZ - bounds.minZ;
  const trackCenterX = (bounds.minX + bounds.maxX) / 2;
  const trackCenterZ = (bounds.minZ + bounds.maxZ) / 2;
  const cleanCityCourse = compiled.key === 'comeback-city';
  const materials = createTrackRenderMaterials({ compiled, theme });
  const {
    asphaltMat,
    apexMat,
    barrierMat,
    beaconMat,
    curbAMat,
    curbBMat,
    curbRedMat,
    groundMat,
    lineMat,
    mutedLineMat,
    orangeMat,
    railMat,
    railPostMat,
    shoulderMat,
    whiteLineMat,
  } = materials;
  const unitBoxGeometry = cleanCityCourse ? new THREE.BoxGeometry(1, 1, 1) : null;
  const instanceObject = new THREE.Object3D();
  let cleanTrackBoxBatch = null;
  let cleanTrackBoxBatchSegments = 0;
  let instancedTrackMeshCount = 0;

  const createCleanTrackBoxBatch = () => ({
    apexCurb: { castShadow: true, material: apexMat, matrices: [], receiveShadow: true },
    asphalt: { castShadow: false, material: asphaltMat, matrices: [], receiveShadow: true },
    curbA: { castShadow: true, material: curbAMat, matrices: [], receiveShadow: true },
    curbB: { castShadow: true, material: curbBMat, matrices: [], receiveShadow: true },
    line: { castShadow: false, material: lineMat, matrices: [], receiveShadow: true },
    mutedLine: { castShadow: false, material: mutedLineMat, matrices: [], receiveShadow: true },
    shoulder: { castShadow: false, material: shoulderMat, matrices: [], receiveShadow: true },
  });

  const ensureCleanTrackBoxBatch = () => {
    if (!cleanTrackBoxBatch) cleanTrackBoxBatch = createCleanTrackBoxBatch();
    return cleanTrackBoxBatch;
  };

  const flushCleanTrackBoxBatch = () => {
    if (!cleanTrackBoxBatch) return;
    Object.values(cleanTrackBoxBatch).forEach(({ castShadow, material, matrices, receiveShadow }) => {
      if (!matrices.length) return;
      const mesh = new THREE.InstancedMesh(unitBoxGeometry, material, matrices.length);
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      mesh.computeBoundingBox?.();
      mesh.computeBoundingSphere?.();
      freezeStaticTransform(mesh);
      world.add(mesh);
      instancedTrackMeshCount += 1;
    });
    cleanTrackBoxBatch = null;
    cleanTrackBoxBatchSegments = 0;
  };

  const queueCleanTrackBox = ({
    batchKey,
    depth,
    height,
    position,
    rotationY,
    width,
    xOffset = 0,
    y,
    zOffset = 0,
  }) => {
    const batch = ensureCleanTrackBoxBatch();
    instanceObject.position.copy(position);
    instanceObject.position.y = y;
    instanceObject.rotation.set(0, rotationY, 0);
    instanceObject.scale.set(1, 1, 1);
    instanceObject.translateX(xOffset);
    instanceObject.translateZ(zOffset);
    instanceObject.scale.set(width, height, depth);
    instanceObject.updateMatrix();
    batch[batchKey].matrices.push(instanceObject.matrix.clone());
  };

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.max(500, trackSpanX + 210), Math.max(460, trackSpanZ + 220), 24, 24),
    groundMat
  );
  ground.position.set(trackCenterX, 0, trackCenterZ);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  freezeStaticTransform(ground);
  world.add(ground);

  const addTrackSegment = (segment, options = {}) => {
    const roadWidth = options.roadWidth || compiled.roadWidth;
    const shoulderWidth = options.shoulderWidth || SHOULDER_WIDTH;
    const cleanRoad = options.clean ?? cleanCityCourse;
    const railMode = options.railMode ?? (cleanRoad ? 'none' : 'full');
    const showCurbs = options.showCurbs ?? true;
    const showLines = options.showLines ?? true;
    const center = new THREE.Vector3(
      (segment.a.x + segment.b.x) / 2,
      0.08,
      (segment.a.z + segment.b.z) / 2
    );
    const yaw = -Math.atan2(segment.dz, segment.dx);
    if (cleanRoad) cleanTrackBoxBatchSegments += 1;
    const placeBox = ({
      batchKey,
      castShadow = false,
      depth,
      height,
      material,
      position,
      rotationY = yaw,
      width,
      xOffset = 0,
      y,
      zOffset = 0,
    }) => {
      if (cleanRoad && batchKey) {
        queueCleanTrackBox({
          batchKey,
          depth,
          height,
          position,
          rotationY,
          width,
          xOffset,
          y,
          zOffset,
        });
        return null;
      }
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.rotation.y = rotationY;
      mesh.translateX(xOffset);
      mesh.translateZ(zOffset);
      mesh.position.y = y;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      freezeStaticTransform(mesh);
      world.add(mesh);
      return mesh;
    };

    [-1, 1].forEach((side) => {
      placeBox({
        batchKey: 'shoulder',
        depth: shoulderWidth,
        height: 0.16,
        material: shoulderMat,
        position: center,
        width: segment.length + 0.9,
        zOffset: side * (roadWidth / 2 + shoulderWidth / 2 + 0.9),
        y: 0.14,
      });
    });

    placeBox({
      batchKey: 'asphalt',
      depth: roadWidth,
      height: 0.24,
      material: asphaltMat,
      position: center,
      width: segment.length + 1.1,
      y: 0.08,
    });

    if (showLines) {
      [-1, 1].forEach((side) => {
        placeBox({
          batchKey: cleanRoad ? 'mutedLine' : null,
          depth: cleanRoad ? 0.14 : 0.34,
          height: 0.14,
          material: cleanRoad ? mutedLineMat : whiteLineMat,
          position: center,
          width: segment.length + 0.9,
          zOffset: side * (roadWidth / 2 - (cleanRoad ? 0.9 : 1.25)),
          y: 0.35,
        });
      });
    }

    if (showCurbs) {
      const curbStep = cleanRoad ? 24 : 7;
      for (let offset = cleanRoad ? 8 : 3.5; offset < segment.length; offset += curbStep) {
        const t = offset / segment.length;
        [-1, 1].forEach((side) => {
          const useCurbB = Math.floor(offset / curbStep + (side > 0 ? 0 : 1)) % 2 === 0;
          const material = cleanRoad
            ? useCurbB
              ? curbBMat
              : curbAMat
            : Math.floor(offset / 7 + (side > 0 ? 0 : 1)) % 2 === 0
              ? curbAMat
              : curbRedMat;
          placeBox({
            batchKey: cleanRoad ? (useCurbB ? 'curbB' : 'curbA') : null,
            castShadow: true,
            depth: cleanRoad ? 0.46 : 1.04,
            height: cleanRoad ? 0.24 : 0.36,
            material,
            position: new THREE.Vector3(segment.a.x + segment.dx * t, 0.38, segment.a.z + segment.dz * t),
            width: cleanRoad ? 5.8 : 4.4,
            zOffset: side * (roadWidth / 2 + (cleanRoad ? 0.28 : 0.52)),
            y: 0.38,
          });
        });
      }
    }

    const dashStep = cleanRoad ? 30 : 14;
    if (showLines) {
      for (let offset = cleanRoad ? 14 : 7; offset < segment.length; offset += dashStep) {
        const t = offset / segment.length;
        if (cleanRoad) {
          placeBox({
            batchKey: 'line',
            depth: 0.42,
            height: 0.08,
            material: lineMat,
            position: new THREE.Vector3(segment.a.x + segment.dx * t, 0.39, segment.a.z + segment.dz * t),
            width: 8.8,
            y: 0.39,
          });
        } else {
          [-0.58, 0.58].forEach((laneOffset) => {
            placeBox({
              depth: 0.18,
              height: 0.09,
              material: lineMat,
              position: new THREE.Vector3(segment.a.x + segment.dx * t, 0.39, segment.a.z + segment.dz * t),
              width: 5.4,
              zOffset: laneOffset,
              y: 0.39,
            });
          });

          [-roadWidth * 0.24, roadWidth * 0.24].forEach((laneOffset) => {
            placeBox({
              depth: 0.22,
              height: 0.08,
              material: whiteLineMat,
              position: new THREE.Vector3(segment.a.x + segment.dx * t, 0.38, segment.a.z + segment.dz * t),
              width: 4.2,
              zOffset: laneOffset,
              y: 0.38,
            });
          });
        }
      }
    }

    if (cleanRoad && cleanTrackBoxBatchSegments >= CLEAN_TRACK_BOX_BATCH_SEGMENTS) {
      flushCleanTrackBoxBatch();
    }

    if (railMode === 'none') return;
    [-1, 1].forEach((side) => {
      const railZ = side * (roadWidth / 2 + shoulderWidth + 1.2);
      placeBox({
        castShadow: true,
        depth: 0.28,
        height: 0.34,
        material: railMat,
        position: center,
        width: segment.length + 0.8,
        zOffset: railZ,
        y: 1.35,
      });
      if (railMode === 'full') {
        placeBox({
          castShadow: true,
          depth: 0.22,
          height: 0.28,
          material: railMat,
          position: center,
          width: segment.length + 0.8,
          zOffset: railZ,
          y: 2.15,
        });
      }
      for (let offset = 5; offset < segment.length; offset += 18) {
        placeBox({
          castShadow: true,
          depth: 0.62,
          height: 2.2,
          material: railPostMat,
          position: center,
          width: 0.62,
          xOffset: offset - segment.length / 2,
          zOffset: railZ,
          y: 1.1,
        });
      }
    });
  };

  const addTrackCaps = (pointsToCap, roadWidth, shoulderWidth, showRings = true) => {
    if (cleanCityCourse) {
      const capMeshes = [
        {
          geometry: new THREE.CylinderGeometry(
            roadWidth / 2 + shoulderWidth + 0.9,
            roadWidth / 2 + shoulderWidth + 0.9,
            0.14,
            8
          ),
          material: shoulderMat,
          y: 0.08,
        },
        {
          geometry: new THREE.CylinderGeometry(roadWidth / 2, roadWidth / 2, 0.2, 8),
          material: asphaltMat,
          y: 0.1,
        },
      ];
      const matrix = new THREE.Matrix4();
      capMeshes.forEach(({ geometry, material, y }) => {
        const mesh = new THREE.InstancedMesh(geometry, material, pointsToCap.length);
        mesh.receiveShadow = true;
        pointsToCap.forEach((point, index) => {
          matrix.makeTranslation(point.x, y, point.z);
          mesh.setMatrixAt(index, matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingBox?.();
        mesh.computeBoundingSphere?.();
        freezeStaticTransform(mesh);
        world.add(mesh);
        instancedTrackMeshCount += 1;
      });
      return;
    }

    pointsToCap.forEach((point, index) => {
      const shoulderCap = new THREE.Mesh(
        new THREE.CylinderGeometry(
          roadWidth / 2 + shoulderWidth + 0.9,
          roadWidth / 2 + shoulderWidth + 0.9,
          0.14,
          28
        ),
        shoulderMat
      );
      shoulderCap.position.set(point.x, 0.08, point.z);
      shoulderCap.receiveShadow = true;
      freezeStaticTransform(shoulderCap);
      world.add(shoulderCap);

      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(roadWidth / 2, roadWidth / 2, 0.2, 24),
        asphaltMat
      );
      cap.position.set(point.x, 0.1, point.z);
      cap.receiveShadow = true;
      freezeStaticTransform(cap);
      world.add(cap);

      if (showRings && index % 2 === 0) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(roadWidth / 2 + 0.42, 0.2, 4, 24),
          index % 4 === 0 ? curbAMat : curbBMat
        );
        ring.position.set(point.x, 0.31, point.z);
        ring.rotation.x = Math.PI / 2;
        freezeStaticTransform(ring);
        world.add(ring);
      }
    });
  };

  let openingApexCurbCount = 0;
  const addOpeningSweeperPaintedCurbs = () => {
    if (!cleanCityCourse) return;
    [0.142, 0.153, 0.164, 0.175, 0.186, 0.197, 0.208, 0.219].forEach((progress, index) => {
      const sample = compiled.pointAt(progress);
      const yaw = -Math.atan2(sample.tangent.z, sample.tangent.x);
      [-1, 1].forEach((side) => {
        queueCleanTrackBox({
          batchKey: index % 2 === 0 ? 'apexCurb' : 'curbA',
          depth: 1.38,
          height: 0.34,
          position: sample.point,
          rotationY: yaw,
          width: 7.2,
          zOffset: side * (compiled.roadWidth / 2 + 0.68),
          y: 0.52,
        });
        openingApexCurbCount += 1;
      });
    });
  };

  const mainVisualSegments = cleanCityCourse
    ? createCleanCourseVisualSegments(compiled.segments)
    : compiled.segments;
  mainVisualSegments.forEach((segment) =>
    addTrackSegment(segment, {
      clean: cleanCityCourse,
      railMode: cleanCityCourse ? 'none' : 'full',
    })
  );
  addOpeningSweeperPaintedCurbs();
  flushCleanTrackBoxBatch();
  addTrackCaps(compiled.points, compiled.roadWidth, SHOULDER_WIDTH, !cleanCityCourse);
  let branchVisualSegmentCount = 0;
  (compiled.branchRoutes || []).forEach((route) => {
    const routeVisualSegments = cleanCityCourse
      ? createCleanCourseVisualSegments(route.segments)
      : route.segments;
    branchVisualSegmentCount += routeVisualSegments.length;
    routeVisualSegments.forEach((segment) =>
      addTrackSegment(segment, {
        clean: cleanCityCourse,
        railMode: cleanCityCourse || route.rails === false ? 'none' : 'low',
        roadWidth: route.roadWidth,
        shoulderWidth: route.shoulderWidth,
        showCurbs: !cleanCityCourse,
        showLines: true,
      })
    );
    flushCleanTrackBoxBatch();
    if (!cleanCityCourse) addTrackCaps(route.points, route.roadWidth, route.shoulderWidth, false);
  });

  const startSample = compiled.pointAt(compiled.startProgress || 0);
  const startYaw = -Math.atan2(startSample.tangent.z, startSample.tangent.x);
  const startTiles = [];
  let finishCelebrationCueCount = 0;
  let openingLaunchDecalCount = 0;
  let openingLaunchPaintCount = 0;
  let openingSweeperDriftPaintCount = 0;

  const addRacePropGroup = (sample, localOffsetX = 0) => {
    const group = new THREE.Group();
    group.position.copy(sample.point);
    group.rotation.y = -Math.atan2(sample.tangent.z, sample.tangent.x);
    group.translateX(localOffsetX);
    world.add(group);
    return group;
  };

  const addStartFinishSet = () => {
    const group = addRacePropGroup(startSample);
    group.userData.kind = 'start-finish-gate';
    const tileRows = 4;
    const tileCols = 6;
    const tileWidth = 4.6;
    const tileDepth = compiled.roadWidth / tileCols;
    for (let row = 0; row < tileRows; row += 1) {
      for (let col = 0; col < tileCols; col += 1) {
        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(tileWidth, 0.12, tileDepth - 0.18),
          (row + col) % 2 === 0 ? whiteLineMat : barrierMat
        );
        tile.position.set((row - 2.8) * tileWidth, 0.38, (col - (tileCols - 1) / 2) * tileDepth);
        tile.receiveShadow = true;
        freezeStaticTransform(tile);
        group.add(tile);
        startTiles.push(tile);
      }
    }

    [-1, 1].forEach((side) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(1.8, 18, 1.8), barrierMat);
      post.position.set(1.2, 9, side * (compiled.roadWidth / 2 + 6.2));
      post.castShadow = true;
      freezeStaticTransform(post);
      group.add(post);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.1, 3.4), side > 0 ? curbBMat : orangeMat);
      cap.position.set(1.2, 18.8, side * (compiled.roadWidth / 2 + 6.2));
      cap.castShadow = true;
      freezeStaticTransform(cap);
      group.add(cap);
    });

    const beam = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, compiled.roadWidth + 15), barrierMat);
    beam.userData.kind = 'start-finish-gate-beam';
    beam.position.set(1.2, 18.4, 0);
    beam.castShadow = true;
    freezeStaticTransform(beam);
    group.add(beam);

    const banner = createBillboardText('START / FINISH', '#ffd34f', { documentRef });
    banner.userData.kind = 'start-finish-gate-banner';
    banner.material.depthTest = false;
    banner.position.set(3.45, 18.95, 0);
    banner.scale.set(25.5, 6.4, 1);
    group.add(banner);

    for (let i = 0; i < 10; i += 1) {
      const checker = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 1.65, 3.0),
        i % 2 === 0 ? whiteLineMat : curbBMat
      );
      checker.position.set(2.98, 18.4, -compiled.roadWidth / 2 - 6.6 + i * ((compiled.roadWidth + 13.2) / 9));
      freezeStaticTransform(checker);
      group.add(checker);
    }

    [-1, 1].forEach((side) => {
      [-1.45, 1.45].forEach((yOffset, index) => {
        const flag = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 2.45, 3.8),
          (index + (side > 0 ? 0 : 1)) % 2 === 0 ? whiteLineMat : curbBMat
        );
        flag.userData.kind = 'start-finish-gate-side-flag';
        flag.position.set(3.35, 16.1 + yOffset, side * (compiled.roadWidth / 2 + 7.55));
        freezeStaticTransform(flag);
        group.add(flag);
      });
    });

    [-1, 0, 1].forEach((offset, index) => {
      const light = new THREE.Mesh(new THREE.SphereGeometry(1.35, 14, 10), index === 1 ? orangeMat : beaconMat);
      light.position.set(3.1, 15.4, offset * 4.8);
      freezeStaticTransform(light);
      group.add(light);
    });

    const finishPad = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.08, compiled.roadWidth * 0.82),
      createBasicMaterial('#f7fbff', { emissive: '#46d9ef', emissiveIntensity: 0.08 })
    );
    finishPad.userData.kind = 'finish-celebration-pad';
    finishPad.position.set(10.2, 0.41, 0);
    finishPad.receiveShadow = true;
    freezeStaticTransform(finishPad);
    group.add(finishPad);

  };

  const addFinishSprintRoadPaint = () => {
    const finishApproachProgress = ((compiled.startProgress || 0) + 0.972) % 1;
    const sample = compiled.pointAt(finishApproachProgress);
    const group = addRacePropGroup(sample);
    group.userData.kind = 'finish-celebration-road-decal';
    group.userData.label = 'FINISH!';
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(25.5, 8.8), createRoadPaintMaterial('FINISH!', '#ff5b68'));
    decal.userData.kind = 'finish-celebration-road-decal-plane';
    decal.position.set(0, 0.56, 0);
    decal.rotation.x = -Math.PI / 2;
    freezeStaticTransform(decal);
    group.add(decal);
    freezeStaticTransform(group);
    finishCelebrationCueCount += 1;
  };

  const addRoadChevron = (progress, colorMat = lineMat, laneOffset = 0) => {
    const sample = compiled.pointAt(progress);
    const group = addRacePropGroup(sample);
    group.translateZ(laneOffset);
    [-2.5, 2.5].forEach((zSide) => {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.1, 1.15), colorMat);
      stripe.position.set(0, 0.43, zSide);
      stripe.rotation.y = zSide > 0 ? -0.58 : 0.58;
      stripe.receiveShadow = true;
      freezeStaticTransform(stripe);
      group.add(stripe);
    });
  };

  const addApexMarker = (progress, side = 1, colorMat = apexMat) => {
    const sample = compiled.pointAt(progress);
    const group = addRacePropGroup(sample);
    group.translateZ(side * (compiled.roadWidth / 2 + 4.4));

    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 0.55, 3), colorMat);
    base.position.set(0, 0.55, 0);
    base.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    base.castShadow = true;
    freezeStaticTransform(base);
    group.add(base);

    const board = new THREE.Mesh(new THREE.BoxGeometry(0.72, 5.6, 6.8), barrierMat);
    board.position.set(0, 3.4, 0);
    board.castShadow = true;
    freezeStaticTransform(board);
    group.add(board);

    [-1.7, 0, 1.7].forEach((z) => {
      const arrow = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.54, 1.65), whiteLineMat);
      arrow.position.set(0.54, 3.5, z);
      arrow.rotation.x = side > 0 ? -0.62 : 0.62;
      freezeStaticTransform(arrow);
      group.add(arrow);
    });
  };

  const addCornerCoachingSign = (progress, side = 1, label = 'DRIFT BOOST') => {
    const sample = compiled.pointAt(progress);
    const group = addRacePropGroup(sample);
    group.userData.kind = 'corner-coaching-sign';
    group.userData.label = label;
    group.translateZ(side * (compiled.roadWidth / 2 + 8.4));

    const post = new THREE.Mesh(new THREE.BoxGeometry(0.54, 4.2, 0.54), barrierMat);
    post.userData.kind = 'corner-coaching-sign-post';
    post.position.set(0, 2.2, 0);
    post.castShadow = true;
    freezeStaticTransform(post);
    group.add(post);

    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 7.4), side > 0 ? curbBMat : orangeMat);
    marker.userData.kind = 'corner-coaching-sign-marker';
    marker.position.set(0, 4.6, 0);
    marker.castShadow = true;
    freezeStaticTransform(marker);
    group.add(marker);

    const sign = createBillboardText(label, side > 0 ? '#46d9ef' : '#ffd34f', { documentRef });
    sign.userData.kind = 'corner-coaching-sign-label';
    sign.material.depthTest = false;
    sign.position.set(0, 5.4, 0);
    sign.scale.set(13.8, 3.6, 1);
    group.add(sign);
  };

  const addDriftZoneCueSet = () => {
    [
      [0.545, -4.2, orangeMat],
      [0.565, 0, lineMat],
      [0.585, 4.2, orangeMat],
    ].forEach(([progress, laneOffset, material]) => addRoadChevron(progress, material, laneOffset));
  };

  const createRoadPaintMaterial = (label, accent = '#ffd34f') => {
    const textureWidth = 384;
    const textureHeight = 144;
    const canvas = documentRef.createElement('canvas');
    canvas.width = textureWidth;
    canvas.height = textureHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f7fbff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#102a44';
    for (let x = -36; x < canvas.width; x += 48) {
      ctx.fillRect(x, 0, 26, 22);
      ctx.fillRect(x + 24, canvas.height - 22, 26, 22);
    }
    ctx.fillStyle = accent;
    ctx.fillRect(0, 24, canvas.width, 9);
    ctx.fillRect(0, canvas.height - 33, canvas.width, 9);
    ctx.fillStyle = 'rgba(16, 42, 68, 0.1)';
    ctx.fillRect(18, 41, canvas.width - 36, canvas.height - 82);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 15;
    ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);
    ctx.strokeStyle = '#102a44';
    ctx.lineWidth = 6;
    ctx.strokeRect(26, 38, canvas.width - 52, canvas.height - 76);
    ctx.fillStyle = '#102a44';
    ctx.font = '900 78px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 4);
    const texture = configureRaceCanvasTexture(new THREE.CanvasTexture(canvas));
    return new THREE.MeshBasicMaterial({
      depthWrite: false,
      map: texture,
      transparent: false,
    });
  };

  const addRoadPaintDecal = ({
    accent,
    groupKind = 'opening-launch-road-decal',
    height = 8,
    label,
    laneOffset = 0,
    planeKind = 'opening-launch-road-decal-plane',
    progress,
    width = 22,
  }) => {
    const sample = compiled.pointAt(progress);
    const group = addRacePropGroup(sample);
    group.translateZ(laneOffset);
    group.userData.kind = groupKind;
    group.userData.label = label;
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(width, height), createRoadPaintMaterial(label, accent));
    decal.userData.kind = planeKind;
    decal.position.set(0, 0.53, 0);
    decal.rotation.x = -Math.PI / 2;
    freezeStaticTransform(decal);
    group.add(decal);
    freezeStaticTransform(group);
    openingLaunchDecalCount += 1;
  };

  const addOpeningLaunchPaint = () => {
    const paintSpecs = [
      [0.018, 0, lineMat],
      [0.042, -1, curbBMat],
      [0.066, 1, orangeMat],
      [0.09, -1, curbBMat],
      [0.114, 1, lineMat],
      [0.138, 0, orangeMat],
    ];
    const paintBatches = new Map();
    const paintParentObject = new THREE.Object3D();
    const paintLocalObject = new THREE.Object3D();
    const paintGeometries = {
      chevron: new THREE.BoxGeometry(8.6, 0.1, 1.08),
      stripeNarrow: new THREE.BoxGeometry(13.6, 0.09, 0.78),
      stripeWide: new THREE.BoxGeometry(13.6, 0.09, 1.18),
    };
    const queuePaintInstance = ({ geometry, kind, material, position, rotationY = 0, sample }) => {
      const key = `${kind}:${geometry.uuid}:${material.uuid}`;
      let batch = paintBatches.get(key);
      if (!batch) {
        batch = { geometry, kind, material, matrices: [] };
        paintBatches.set(key, batch);
      }
      paintParentObject.position.copy(sample.point);
      paintParentObject.rotation.set(0, -Math.atan2(sample.tangent.z, sample.tangent.x), 0);
      paintParentObject.scale.set(1, 1, 1);
      paintParentObject.updateMatrix();

      paintLocalObject.position.copy(position);
      paintLocalObject.rotation.set(0, rotationY, 0);
      paintLocalObject.scale.set(1, 1, 1);
      paintLocalObject.updateMatrix();
      batch.matrices.push(paintParentObject.matrix.clone().multiply(paintLocalObject.matrix));
      openingLaunchPaintCount += 1;
    };

    paintSpecs.forEach(([progress, sideBias, material], index) => {
      const sample = compiled.pointAt(progress);
      const outerOffset = compiled.roadWidth * 0.31;
      const centerOffset = compiled.roadWidth * 0.15;
      const laneOffsets =
        sideBias === 0
          ? [-centerOffset, centerOffset]
          : [sideBias * centerOffset, sideBias * outerOffset];

      laneOffsets.forEach((laneOffset, laneIndex) => {
        queuePaintInstance({
          geometry: laneIndex === 0 ? paintGeometries.stripeNarrow : paintGeometries.stripeWide,
          kind: 'opening-launch-paint-stripe',
          material,
          position: new THREE.Vector3(0, 0.46 + index * 0.002, laneOffset),
          sample,
        });
      });
      [-2.2, 2.2].forEach((zSide) => {
        queuePaintInstance({
          geometry: paintGeometries.chevron,
          kind: 'opening-launch-paint-chevron',
          material,
          position: new THREE.Vector3(0.4, 0.49 + index * 0.002, zSide),
          rotationY: zSide > 0 ? -0.58 : 0.58,
          sample,
        });
      });
    });

    paintBatches.forEach(({ geometry, kind, material, matrices }) => {
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      mesh.userData.kind = kind;
      mesh.userData.instanceCount = matrices.length;
      mesh.userData.sourceKind = 'opening-launch-paint';
      matrices.forEach((matrix, instanceIndex) => mesh.setMatrixAt(instanceIndex, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.receiveShadow = true;
      mesh.computeBoundingBox?.();
      mesh.computeBoundingSphere?.();
      freezeStaticTransform(mesh);
      world.add(mesh);
    });
  };

  const addOpeningSweeperDriftPaint = () => {
    const paintSpecs = [0.154, 0.174, 0.194, 0.214];
    const paintBatches = new Map();
    const paintParentObject = new THREE.Object3D();
    const paintLocalObject = new THREE.Object3D();
    const paintGeometries = {
      chevron: new THREE.BoxGeometry(10.4, 0.11, 1.22),
      guideStripe: new THREE.BoxGeometry(15.8, 0.09, 0.86),
    };
    const queuePaintInstance = ({ geometry, kind, material, position, rotationY = 0, sample }) => {
      const key = `${kind}:${geometry.uuid}:${material.uuid}`;
      let batch = paintBatches.get(key);
      if (!batch) {
        batch = { geometry, kind, material, matrices: [] };
        paintBatches.set(key, batch);
      }
      paintParentObject.position.copy(sample.point);
      paintParentObject.rotation.set(0, -Math.atan2(sample.tangent.z, sample.tangent.x), 0);
      paintParentObject.scale.set(1, 1, 1);
      paintParentObject.updateMatrix();

      paintLocalObject.position.copy(position);
      paintLocalObject.rotation.set(0, rotationY, 0);
      paintLocalObject.scale.set(1, 1, 1);
      paintLocalObject.updateMatrix();
      batch.matrices.push(paintParentObject.matrix.clone().multiply(paintLocalObject.matrix));
      openingSweeperDriftPaintCount += 1;
    };

    paintSpecs.forEach((progress, index) => {
      const sample = compiled.pointAt(progress);
      [-2.75, 2.75].forEach((zSide) => {
        queuePaintInstance({
          geometry: paintGeometries.chevron,
          kind: 'opening-sweeper-drift-paint-chevron',
          material: curbBMat,
          position: new THREE.Vector3(0.35, 0.515 + index * 0.002, zSide),
          rotationY: zSide > 0 ? -0.6 : 0.6,
          sample,
        });
      });
      [-compiled.roadWidth * 0.18, compiled.roadWidth * 0.18].forEach((laneOffset) => {
        queuePaintInstance({
          geometry: paintGeometries.guideStripe,
          kind: 'opening-sweeper-drift-paint-stripe',
          material: orangeMat,
          position: new THREE.Vector3(-1.2, 0.49 + index * 0.002, laneOffset),
          sample,
        });
      });
    });

    paintBatches.forEach(({ geometry, kind, material, matrices }) => {
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      mesh.userData.kind = kind;
      mesh.userData.instanceCount = matrices.length;
      mesh.userData.sourceKind = 'opening-sweeper-drift-paint';
      matrices.forEach((matrix, instanceIndex) => mesh.setMatrixAt(instanceIndex, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.receiveShadow = true;
      mesh.computeBoundingBox?.();
      mesh.computeBoundingSphere?.();
      freezeStaticTransform(mesh);
      world.add(mesh);
    });
  };

  const addEdgeBollards = () => {
    const bollardGeometry = new THREE.CylinderGeometry(0.42, 0.52, 2.7, 8);
    const bollardMatrices = [];
    const beaconGeometry = new THREE.SphereGeometry(0.62, 10, 8);
    const beaconMatrices = [];
    for (let i = 0; i < 24; i += 1) {
      const sample = compiled.pointAt(i / 24);
      const normal = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x).normalize();
      [-1, 1].forEach((side) => {
        const p = sample.point.clone().addScaledVector(normal, side * (compiled.roadWidth / 2 + 5.6));
        instanceObject.position.set(p.x, 1.35, p.z);
        instanceObject.rotation.set(0, 0, 0);
        instanceObject.scale.set(1, 1, 1);
        instanceObject.updateMatrix();
        bollardMatrices.push(instanceObject.matrix.clone());
        instanceObject.position.set(p.x, 2.95, p.z);
        instanceObject.updateMatrix();
        beaconMatrices.push(instanceObject.matrix.clone());
      });
    }
    [
      { geometry: bollardGeometry, material: barrierMat, matrices: bollardMatrices },
      { geometry: beaconGeometry, material: beaconMat, matrices: beaconMatrices },
    ].forEach(({ geometry, material, matrices }) => {
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      freezeStaticTransform(mesh);
      world.add(mesh);
    });
  };

  if (cleanCityCourse) {
    addStartFinishSet();
    addFinishSprintRoadPaint();
    [
      { accent: '#ffd34f', label: 'GO!', progress: 0.032 },
      { accent: '#46d9ef', label: 'BOOST', progress: 0.108 },
    ].forEach(addRoadPaintDecal);
    addOpeningLaunchPaint();
    addOpeningSweeperDriftPaint();
    [0.07, 0.18, 0.31, 0.48, 0.62, 0.75, 0.88].forEach((progress, index) =>
      addRoadChevron(progress, index % 3 === 0 ? curbBMat : lineMat, index % 2 === 0 ? -5 : 5)
    );
    [
      [0.14, -1],
      [0.24, 1],
      [0.39, -1],
      [0.55, 1],
      [0.72, -1],
      [0.86, 1],
    ].forEach(([progress, side], index) => addApexMarker(progress, side, index % 2 === 0 ? apexMat : orangeMat));
    [
      [0.055, 0.45],
      [0.18, -1],
    ].forEach(([progress, side]) => addCornerCoachingSign(progress, side));
    addDriftZoneCueSet();
    addEdgeBollards();
  } else {
    for (let lane = -2; lane <= 2; lane += 1) {
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.1, compiled.roadWidth / 5),
        createBasicMaterial(lane % 2 === 0 ? '#f7fbff' : '#10151d')
      );
      tile.position.copy(startSample.point);
      tile.position.y = 0.36;
      tile.rotation.y = startYaw;
      tile.translateX(lane * 2.5);
      freezeStaticTransform(tile);
      world.add(tile);
      startTiles.push(tile);
    }
  }

  return {
    cleanCityCourse,
    dimensions: {
      bounds,
      trackCenterX,
      trackCenterZ,
      trackSpanX,
      trackSpanZ,
    },
    ground,
    materials,
    finishCelebrationCueCount,
    instancedTrackMeshCount,
    openingApexCurbCount,
    openingLaunchDecalCount,
    openingLaunchPaintCount,
    openingSweeperDriftPaintCount,
    startTiles,
    visualSegmentCount: mainVisualSegments.length + branchVisualSegmentCount,
  };
};
