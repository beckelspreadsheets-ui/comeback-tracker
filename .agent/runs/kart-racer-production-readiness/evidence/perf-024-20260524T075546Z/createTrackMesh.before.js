import * as THREE from 'three';
import { SHOULDER_WIDTH } from '../track/trackGeometry.js';
import { createBasicMaterial } from './createKartModel.js';

export const createTrackRenderMaterials = ({ compiled = {}, theme = {} } = {}) => ({
  asphaltMat: new THREE.MeshStandardMaterial({
    color: compiled.asphalt || '#3d4450',
    flatShading: true,
    metalness: 0,
    roughness: 0.76,
  }),
  curbAMat: createBasicMaterial(compiled.curbA || '#fff6da'),
  curbBMat: createBasicMaterial(compiled.curbB || compiled.accent || '#2cc8ff'),
  curbRedMat: createBasicMaterial('#e2554f'),
  groundMat: createBasicMaterial(compiled.grass || theme.ground || '#79c96d', {
    roughness: 0.86,
  }),
  lineMat: createBasicMaterial('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 0.12 }),
  mutedLineMat: createBasicMaterial('#9fb0aa'),
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
  group.position.copy(zipper.position);
  group.position.y = 0.42;
  group.rotation.y = -Math.atan2(zipper.tangent.z, zipper.tangent.x);
  const mat = createBasicMaterial(compiled.accent || '#2cc8ff', {
    emissive: compiled.accent || '#2cc8ff',
    emissiveIntensity: 0.4,
  });
  const stripeMaterial = lineMat || createBasicMaterial('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 0.12 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.28, compiled.roadWidth * 0.38), mat);
  freezeStaticTransform(base);
  group.add(base);
  [-3, -1, 1, 3].forEach((x) => {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.12, compiled.roadWidth * 0.26), stripeMaterial);
    stripe.position.set(x, 0.23, 0);
    stripe.rotation.z = 0.55;
    freezeStaticTransform(stripe);
    group.add(stripe);
  });
  freezeStaticTransform(group);
  world.add(group);
  return group;
};

export const createTrackMesh = ({ compiled, theme = {}, world } = {}) => {
  const bounds = compiled.bounds;
  const trackSpanX = bounds.maxX - bounds.minX;
  const trackSpanZ = bounds.maxZ - bounds.minZ;
  const trackCenterX = (bounds.minX + bounds.maxX) / 2;
  const trackCenterZ = (bounds.minZ + bounds.maxZ) / 2;
  const cleanCityCourse = compiled.key === 'comeback-city';
  const materials = createTrackRenderMaterials({ compiled, theme });
  const {
    asphaltMat,
    curbAMat,
    curbBMat,
    curbRedMat,
    groundMat,
    lineMat,
    mutedLineMat,
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

  const mainVisualSegments = cleanCityCourse
    ? createCleanCourseVisualSegments(compiled.segments)
    : compiled.segments;
  mainVisualSegments.forEach((segment) =>
    addTrackSegment(segment, {
      clean: cleanCityCourse,
      railMode: cleanCityCourse ? 'none' : 'full',
    })
  );
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
  const startTiles = [];
  for (let lane = -2; lane <= 2; lane += 1) {
    const tile = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.1, compiled.roadWidth / 5),
      createBasicMaterial(lane % 2 === 0 ? '#f7fbff' : '#10151d')
    );
    tile.position.copy(startSample.point);
    tile.position.y = 0.36;
    tile.rotation.y = -Math.atan2(startSample.tangent.z, startSample.tangent.x);
    tile.translateX(lane * 2.5);
    freezeStaticTransform(tile);
    world.add(tile);
    startTiles.push(tile);
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
    instancedTrackMeshCount,
    startTiles,
    visualSegmentCount: mainVisualSegments.length + branchVisualSegmentCount,
  };
};
