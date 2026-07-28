// LEGACY - NOT THE SHIPPED GAME. Editing this file changes nothing the owner
// ever sees. The shipped chase camera is inline in
// ComebackCityThreeKartRace.jsx (grep "Arcade chase camera: low, close").
//
// DO NOT DELETE. Not orphaned: scripts/race-content-playtest.mjs
// (npm run test:race) and src/game/ArcadeRace3D.jsx both import
// createRaceCameraRuntime. See ./raceSceneRuntime.js for the full
// legacy-stack reachability graph and why the leaves cannot go alone.

import * as THREE from 'three';
import { updateChaseCameraFrame } from './camera/chaseCamera.js';
import { VEHICLES } from './physics/kartTuning.js';

export const createRaceCameraRuntime = ({
  camera,
  cameraCollisionObjects = [],
  compiled,
  createRaycaster = () => new THREE.Raycaster(),
  getMobile = () => false,
  getReducedMotion = () => false,
  mobilePreset = null,
  playtest,
  race,
  updateFrame = updateChaseCameraFrame,
  useHeadingCameraFor = () => false,
  vehicles = VEHICLES,
  visualStats,
} = {}) => {
  const raycaster = createRaycaster();
  if (raycaster) raycaster.camera = camera;
  let cameraInitialized = false;
  let routeLookahead = null;

  const updateCamera = (dt) => {
    const frame = updateFrame({
      camera,
      cameraCollisionObjects,
      cameraInitialized,
      collisionStats: visualStats,
      compiled,
      dt,
      mobile: getMobile(),
      mobilePreset,
      player: race.player,
      race,
      raycaster,
      reducedMotion: getReducedMotion(),
      useHeadingCamera: useHeadingCameraFor(playtest),
      vehicle: vehicles[race.player.vehicleMode] || vehicles.kart,
    });
    cameraInitialized = frame.cameraInitialized;
    routeLookahead = frame.routeLookahead;
    return frame;
  };

  return {
    getCameraInitialized: () => cameraInitialized,
    getRouteLookahead: () => routeLookahead,
    raycaster,
    updateCamera,
  };
};
