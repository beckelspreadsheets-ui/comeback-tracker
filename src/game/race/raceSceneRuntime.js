// LEGACY - NOT THE SHIPPED GAME. Editing this file changes nothing the owner
// ever sees. It assembles the legacy scene from the modules below it; the
// shipped racer (ComebackCityThreeKartRace.jsx) assembles its scene inline.
//
// CANONICAL REACHABILITY NOTE for the legacy runtime tree — raceSceneRuntime,
// raceCameraRuntime, render/syncRaceMeshes, render/raceVfx, camera/chaseCamera.
// Audits keep re-flagging these five as orphans because the monolith does not
// import them. That check is too narrow — DO NOT DELETE THEM. Two live
// consumers reach every one:
//   1. scripts/race-content-playtest.mjs (npm run test:race) imports
//      createRaceRuntimeScene, createRaceCameraRuntime, syncRaceMeshes and
//      chaseCamera's helpers directly, by name.
//   2. src/game/ArcadeRace3D.jsx, mounted by race-playtest.html through
//      RacePlaytestHarness.jsx, which four scripts navigate to by URL:
//      check-race-route.mjs, phase5-sustained-capture.mjs (PHASE5_TARGET=legacy),
//      page-lifecycle-audio-smoke-test.mjs and fresh-user-clip-capture.mjs.
// raceVfx is reached transitively via syncRaceMeshes. So the leaves cannot be
// removed on their own: retiring this stack means retiring ArcadeRace3D.jsx,
// RacePlaytestHarness.jsx, race-playtest.html and those scripts in one change.
//
// Shipped-bundle cost is already zero, so deleting them saves no bytes:
// vite.config.kart.js builds from index.kart.html alone (rollupOptions.input),
// and race-playtest.html is not an input, so none of this tree reaches
// dist-kart. That zero is enforced, not incidental —
// scripts/release-artifact-safety-test.mjs FAILS the release if a
// race-playtest/RacePlaytestHarness artifact ever appears in the build output.
// A byte-saving argument for deleting these five is therefore always wrong.
//
// Scope note: "legacy" means these five files, NOT race/render/ as a whole. The
// monolith does share other modules in that folder (raceParticles, toonRimShader,
// kartMaterials, gltfLoader, createSkyDome, createMidGroundBelt, racePostChain,
// buildRoadEdgeProfile, createRaceScene, createKartModel).
//
// registerCameraCollider below caches a bounding sphere onto
// userData.raceCameraCollider for the legacy camera's broadphase. It is NOT a
// gap the shipped game still has: the monolith collects its own camera blockers
// and occluders once at assembly (grep "Camera occluders, collected ONCE"),
// using world-space AABBs precisely because the sphere baked here proved too
// conservative on tall ice geometry. See camera/chaseCamera.js before salvaging.

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
