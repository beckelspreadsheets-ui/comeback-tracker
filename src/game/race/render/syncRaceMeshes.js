// LEGACY - NOT THE SHIPPED GAME. Editing this file changes nothing the owner
// ever sees. The shipped per-frame mesh sync is inline in the
// ComebackCityThreeKartRace.jsx frame loop.
//
// DO NOT DELETE. Not orphaned: scripts/race-content-playtest.mjs
// (npm run test:race) and src/game/ArcadeRace3D.jsx both import
// syncRaceMeshes, and this file is the only thing keeping ./raceVfx.js
// reachable. See ../raceSceneRuntime.js for the full legacy-stack
// reachability graph and why the leaves cannot go alone.

import {
  DRIFT_TUNING,
  FLIGHT_ALTITUDE_LIMITS,
  VEHICLES,
} from '../physics/kartTuning.js';
import {
  applyDriftSparkGroupFrame,
  applyBoostFlameGroupFrame,
  applyShieldGroupFrame,
  boostPadPresentationFrameFor,
  droppedBananaPresentationFrameFor,
  flightGatePresentationFrameFor,
  itemBoxPresentationFrameFor,
  playerVehiclePresentationFrameFor,
  rivalVehiclePresentationFrameFor,
  switchRingFrameFor,
  switchPadPresentationFrameFor,
  trackBananaPresentationFrameFor,
  trackHazardPresentationFrameFor,
  trapPresentationFrameFor,
} from './raceVfx.js';
import { trackHazardActiveForTime } from '../../raceHazards.js';

export const syncRaceMeshes = ({
  balloonMeshes = [],
  bananaMeshes = [],
  compiled,
  defaultVehicle = 'kart',
  droppedBananaMeshes = [],
  dt,
  flightGateMeshes = [],
  now,
  playerVehicle,
  race,
  rivalModels = [],
  switchPadMeshes = [],
  switchRing,
  trackHazardMeshes = [],
  trapMeshes = [],
  world,
  zipperMeshes = [],
} = {}) => {
  const player = race.player;
  const vehicle = VEHICLES[player.vehicleMode] || VEHICLES.kart;
  const playerFrame = playerVehiclePresentationFrameFor({ dt, player, vehicle });
  playerVehicle.group.position.copy(player.position);
  playerVehicle.group.position.y = playerFrame.y;
  playerVehicle.group.rotation.y = playerFrame.rotationY;
  playerVehicle.group.rotation.z = playerFrame.rotationZ;
  playerVehicle.group.rotation.x = playerFrame.rotationX;
  applyBoostFlameGroupFrame({ group: playerVehicle.boostFlame, now, visible: playerFrame.boostFlameVisible });
  applyShieldGroupFrame({ group: playerVehicle.shieldGroup, now, shieldTimer: player.shieldTimer });

  const switchRingFrame = switchRingFrameFor({ dt, transformTimer: player.transformTimer });
  switchRing.visible = switchRingFrame.visible;
  if (switchRingFrame.visible) {
    switchRing.rotation.z += switchRingFrame.rotationZDelta;
    switchRing.scale.setScalar(switchRingFrame.scale);
    switchRing.material.opacity = switchRingFrame.opacity;
  }

  playerVehicle.wheels.forEach((wheel) => {
    wheel.rotation.x += playerFrame.wheelRotationXDelta;
    if (wheel.userData.front) wheel.rotation.y = playerFrame.frontWheelRotationY;
  });

  applyDriftSparkGroupFrame({
    active: player.driftActive,
    charge: player.driftCharge,
    driftTune: DRIFT_TUNING[player.vehicleMode] || DRIFT_TUNING.kart,
    group: playerVehicle.driftSparkGroup,
    now,
  });

  race.rivals.forEach((rival, index) => {
    const sample = compiled.pointAt(rival.progress + 0.004);
    const model = rivalModels[index];
    const rivalFrame = rivalVehiclePresentationFrameFor({
      defaultVehicle,
      dt,
      flightCruiseAltitude: FLIGHT_ALTITUDE_LIMITS.cruise,
      now,
      rival,
      sample,
    });
    model.setMode(rivalFrame.vehicleMode);
    model.group.position.copy(rival.position);
    model.group.position.y = rivalFrame.y;
    model.group.rotation.y = rivalFrame.rotationY;
    model.group.rotation.z = rivalFrame.rotationZ;
    applyBoostFlameGroupFrame({ group: model.boostFlame, now, visible: rivalFrame.boostFlameVisible });
    model.wheels.forEach((wheel) => {
      wheel.rotation.x += rivalFrame.wheelRotationXDelta;
    });
  });

  race.bananas.forEach((banana, index) => {
    const mesh = bananaMeshes[index];
    const frame = trackBananaPresentationFrameFor({ banana, dt, index, now });
    mesh.visible = frame.visible;
    mesh.rotation.y += frame.rotationYDelta;
    mesh.position.y = frame.y;
  });

  race.balloons.forEach((balloon, index) => {
    const mesh = balloonMeshes[index];
    const frame = itemBoxPresentationFrameFor({ box: balloon, dt, index, now });
    mesh.visible = frame.visible;
    mesh.rotation.y += frame.rotationYDelta;
    mesh.position.y = frame.y;
  });

  race.zippers.forEach((zipper, index) => {
    const mesh = zipperMeshes[index];
    const frame = boostPadPresentationFrameFor({ index, now, zipper });
    mesh.visible = frame.visible;
    mesh.userData.visualActive = Boolean(frame.visualActive);
    mesh.children.forEach((child) => {
      if (child.userData?.kind === 'boost-pad-chevron') {
        child.visible = frame.visualActive;
        child.scale.y = frame.chevronScaleY;
        child.updateMatrix?.();
        if (child.material) {
          child.material.transparent = true;
          child.material.opacity = frame.chevronOpacity;
        }
      } else if (child.userData?.kind === 'boost-pad-center-stripe') {
        child.visible = frame.visualActive;
        if (child.material) {
          child.material.transparent = true;
          child.material.opacity = frame.centerStripeOpacity;
        }
      }
    });
  });

  race.flightGates.forEach((gate, index) => {
    const mesh = flightGateMeshes[index];
    if (!mesh) return;
    const active = player.vehicleMode === 'plane';
    const frame = flightGatePresentationFrameFor({ active, gate, index, now });
    mesh.group.visible = frame.groupVisible;
    mesh.group.position.y = frame.y;
    mesh.group.scale.setScalar(frame.scale);
    mesh.ring.material.opacity = frame.ringOpacity;
    mesh.glow.material.opacity = frame.glowOpacity;
  });

  race.switchPads.forEach((pad, index) => {
    const mesh = switchPadMeshes[index];
    if (!mesh) return;
    const frame = switchPadPresentationFrameFor({ dt, index, now, pad });
    mesh.rotation.y += frame.rotationYDelta;
    mesh.scale.setScalar(frame.scale);
  });

  race.trackHazards.forEach((hazard, index) => {
    const mesh = trackHazardMeshes[index];
    if (!mesh) return;
    const active = trackHazardActiveForTime(hazard, race.time);
    const frame = trackHazardPresentationFrameFor({ active, dt, hazard, index, now });
    mesh.visible = frame.visible;
    mesh.rotation.y += frame.rotationYDelta;
    mesh.scale.setScalar(frame.scale);
    if (mesh.material) mesh.material.opacity = frame.opacity;
  });

  world.userData.cityAnimationHooks?.forEach((group) => {
    group.userData.animate?.(now, dt);
  });

  trapMeshes.forEach((entry) => {
    const frame = trapPresentationFrameFor({ hazard: entry.hazard });
    entry.mesh.visible = frame.visible;
    entry.mesh.material.opacity = frame.opacity;
  });

  droppedBananaMeshes.forEach((entry) => {
    const frame = droppedBananaPresentationFrameFor({ banana: entry.banana, dt, now });
    entry.mesh.visible = frame.visible;
    entry.mesh.position.copy(entry.banana.position);
    entry.mesh.position.y = frame.y;
    entry.mesh.rotation.y += frame.rotationYDelta;
  });
};
