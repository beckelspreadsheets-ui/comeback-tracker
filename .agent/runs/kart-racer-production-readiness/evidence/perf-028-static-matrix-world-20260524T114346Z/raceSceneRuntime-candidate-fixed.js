import * as THREE from 'three';
import {
  createRaceRenderer,
  createRaceSceneShell,
} from './render/createRaceScene.js';
import {
  createBoostPadMesh,
  createTrackMesh,
} from './render/createTrackMesh.js';
import { createRacePickupMeshes } from './render/createRacePickups.js';
import { createRaceScenery } from './render/createRaceScenery.js';
import { createRaceVehicleMeshes } from './render/createRaceVehicles.js';
import { TRACK_THEME } from './render/raceSceneTheme.js';

const rounded = (value, digits = 2) => (Number.isFinite(value) ? Number(value.toFixed(digits)) : null);

const geometryTriangleCount = (geometry) => {
  if (!geometry) return 0;
  const vertexCount = geometry.index?.count ?? geometry.attributes?.position?.count ?? 0;
  return Number.isFinite(vertexCount) ? Math.floor(vertexCount / 3) : 0;
};

const materialListFor = (material) => {
  if (!material) return [];
  return Array.isArray(material) ? material.filter(Boolean) : [material];
};

export const summarizeRaceSceneObjectBudget = (roots = []) => {
  const geometryIds = new Set();
  const materialIds = new Set();
  const summary = {
    geometries: 0,
    groups: 0,
    instancedMeshes: 0,
    lights: 0,
    materials: 0,
    meshes: 0,
    objects: 0,
    rootCount: roots.filter(Boolean).length,
    triangles: 0,
  };

  roots.filter(Boolean).forEach((root) => {
    root.traverse?.((object) => {
      summary.objects += 1;
      if (object.isGroup) summary.groups += 1;
      if (object.isLight) summary.lights += 1;
      if (object.isInstancedMesh) summary.instancedMeshes += 1;
      if (object.isMesh) {
        summary.meshes += 1;
        if (object.geometry?.uuid) geometryIds.add(object.geometry.uuid);
        const instanceCount = object.isInstancedMesh && Number.isFinite(object.count) ? object.count : 1;
        summary.triangles += geometryTriangleCount(object.geometry) * instanceCount;
      }
      materialListFor(object.material).forEach((material) => {
        if (material.uuid) materialIds.add(material.uuid);
      });
    });
  });

  summary.geometries = geometryIds.size;
  summary.materials = materialIds.size;
  summary.triangles = rounded(summary.triangles, 0);
  return summary;
};

export const buildRaceSceneBudget = ({
  pickupRoots = [],
  scene = null,
  sceneryRoots = [],
  trackMesh = null,
  trackRoots = [],
  vehicleRoots = [],
  vfxRoots = [],
} = {}) => ({
  categories: {
    pickups: summarizeRaceSceneObjectBudget(pickupRoots),
    rivalsAndPlayer: summarizeRaceSceneObjectBudget(vehicleRoots),
    scenery: summarizeRaceSceneObjectBudget(sceneryRoots),
    track: {
      ...summarizeRaceSceneObjectBudget(trackRoots),
      instancedTrackMeshCount: trackMesh?.instancedTrackMeshCount ?? null,
      visualSegmentCount: trackMesh?.visualSegmentCount ?? null,
    },
    vfx: summarizeRaceSceneObjectBudget(vfxRoots),
  },
  scene: summarizeRaceSceneObjectBudget(scene ? [scene] : []),
});

export const lockStaticMatrixWorldUpdates = (roots = [], { exclude = [] } = {}) => {
  const excluded = new Set(exclude.filter(Boolean));
  let lockedObjects = 0;

  const lockTree = (object) => {
    if (!object || excluded.has(object)) return;
    if ('matrixWorldAutoUpdate' in object && object.matrixWorldAutoUpdate !== false) {
      object.matrixWorldAutoUpdate = false;
      lockedObjects += 1;
    }
    object.children?.forEach(lockTree);
  };

  roots.filter(Boolean).forEach((root) => {
    if (excluded.has(root)) return;
    root.updateMatrixWorld?.(true);
    lockTree(root);
  });

  return lockedObjects;
};

export const createRaceRuntimeScene = ({
  canvas,
  compiled,
  createBoostPad = createBoostPadMesh,
  createPickups = createRacePickupMeshes,
  createRenderer = createRaceRenderer,
  createSceneShell = createRaceSceneShell,
  createScenery = createRaceScenery,
  createTrack = createTrackMesh,
  createVehicles = createRaceVehicleMeshes,
  defaultVehicle = 'kart',
  onWebGLUnavailable = null,
  profile = {},
  race,
  themeByTrack = TRACK_THEME,
  visualPalette = null,
} = {}) => {
  const theme = themeByTrack?.[compiled?.key] || {};
  const { camera, scene, world } = createSceneShell({ theme });
  const renderer = createRenderer({
    canvas,
    onUnavailable: onWebGLUnavailable,
  });
  if (!renderer) {
    return {
      camera,
      renderer,
      scene,
      theme,
      world,
    };
  }

  const collisionCircles = [];
  const cameraCollisionObjects = [];
  const cameraColliderBox = new THREE.Box3();
  const cameraColliderSphere = new THREE.Sphere();
  const registerCameraCollider = (object) => {
    if (object) {
      if (object.isObject3D) {
        object.updateMatrixWorld(true);
        cameraColliderBox.setFromObject(object);
        if (!cameraColliderBox.isEmpty()) {
          cameraColliderBox.getBoundingSphere(cameraColliderSphere);
          object.userData.raceCameraCollider = {
            center: cameraColliderSphere.center.clone(),
            radius: Math.max(1, cameraColliderSphere.radius),
          };
        }
      }
      cameraCollisionObjects.push(object);
    }
    return object;
  };

  const worldChildren = () => (Array.isArray(world?.children) ? world.children : []);
  const worldChildCount = () => worldChildren().length;
  const worldRootsSince = (startIndex) => worldChildren().slice(startIndex);

  const trackStartIndex = worldChildCount();
  const trackMesh = createTrack({ compiled, theme, world });
  const trackRoots = worldRootsSince(trackStartIndex);
  const { cleanCityCourse } = trackMesh;
  const {
    bounds,
    trackCenterX,
    trackCenterZ,
    trackSpanX,
    trackSpanZ,
  } = trackMesh.dimensions;
  const {
    asphaltMat,
    lineMat,
    railPostMat,
  } = trackMesh.materials;
  const zipperStartIndex = worldChildCount();
  const zipperMeshes = race.zippers.map((zipper) =>
    createBoostPad({
      compiled,
      lineMat,
      world,
      zipper,
    })
  );
  const zipperRoots = worldRootsSince(zipperStartIndex);
  const pickupStartIndex = worldChildCount();
  const pickupMeshes = createPickups({
    cleanCityCourse,
    compiled,
    defaultVehicle,
    race,
    world,
  });
  const pickupRoots = [...zipperRoots, ...worldRootsSince(pickupStartIndex)];
  const {
    balloonMeshes,
    bananaMeshes,
    flightGateMeshes,
    switchPadMeshes,
    trackHazardMeshes,
  } = pickupMeshes;

  const sceneryStartIndex = worldChildCount();
  createScenery({
    asphaltMat,
    bounds,
    cleanCityCourse,
    collisionCircles,
    compiled,
    railPostMat,
    registerCameraCollider,
    trackCenterX,
    trackCenterZ,
    trackSpanX,
    trackSpanZ,
    visualPalette,
    world,
  });
  const sceneryRoots = worldRootsSince(sceneryStartIndex);
  const cityAnimationHooks = world.userData?.cityAnimationHooks || [];
  const staticMatrixWorldLockedObjects = lockStaticMatrixWorldUpdates([...trackRoots, ...sceneryRoots], {
    exclude: cityAnimationHooks,
  });

  const vehicleStartIndex = worldChildCount();
  const vehicleMeshes = createVehicles({
    defaultVehicle,
    profile,
    race,
    world,
  });
  const vehicleRoots = worldRootsSince(vehicleStartIndex);
  const { playerVehicle, rivalModels, switchRing } = vehicleMeshes;
  const vfxRoots = [
    playerVehicle?.boostFlame,
    playerVehicle?.driftSparkGroup,
    switchRing,
    ...rivalModels.map((model) => model.boostFlame),
  ].filter(Boolean);
  const sceneBudget = buildRaceSceneBudget({
    pickupRoots,
    scene,
    sceneryRoots,
    trackMesh,
    trackRoots,
    vehicleRoots,
    vfxRoots,
  });
  sceneBudget.optimizations = {
    staticMatrixWorldExcludedRoots: cityAnimationHooks.length,
    staticMatrixWorldLockedObjects,
  };

  return {
    balloonMeshes,
    bananaMeshes,
    bounds,
    camera,
    cameraCollisionObjects,
    cleanCityCourse,
    collisionCircles,
    flightGateMeshes,
    playerVehicle,
    renderer,
    rivalModels,
    scene,
    sceneBudget,
    switchPadMeshes,
    switchRing,
    theme,
    trackHazardMeshes,
    trackMesh,
    world,
    zipperMeshes,
  };
};
