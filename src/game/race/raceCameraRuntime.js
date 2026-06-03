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
