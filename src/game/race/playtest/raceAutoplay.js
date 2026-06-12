import * as THREE from 'three';
import {
  advanceHeldRaceItemAfterUse,
  createHeldRaceItem,
} from '../../raceItems.js';
import { FLIGHT_ALTITUDE_LIMITS } from '../physics/kartTuning.js';
import { recordBoostSource } from '../raceTelemetry.js';
import { layerOffset } from '../track/trackGeometry.js';

const { cruise: FLIGHT_CRUISE_ALTITUDE } = FLIGHT_ALTITUDE_LIMITS;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrap01 = (value) => ((value % 1) + 1) % 1;
const progressDistance = (a, b) => {
  const gap = Math.abs(wrap01(a) - wrap01(b));
  return Math.min(gap, 1 - gap);
};
const progressInRange = (progress, start, end) =>
  start <= end ? progress >= start && progress <= end : progress >= start || progress <= end;

export const updateRaceAutoplayPlayer = ({
  applyRaceItem,
  applyVehicleIntegration,
  buyDoubleSlot,
  buyRareNextPickup,
  collectBalloon,
  compiled,
  dt,
  playtest,
  race,
  recordPlaytest,
  setVehicleMode,
  upgradeHeldItem,
  visualStats,
} = {}) => {
  const player = race?.player;
  if (!player || !compiled || !playtest?.enabled) return false;
  if (player.finished) return true;

  if (!playtest.started) {
    playtest.started = true;
    player.bananas = 16;
    playtest.bananaMax = player.bananas;
    player.heldItem = createHeldRaceItem(compiled.signatureItem?.key || 'boost', 1);
    player.heldBalloon = player.heldItem;
    recordPlaytest?.('start', { signatureItem: player.heldItem.itemKey });
    upgradeHeldItem?.();
    buyRareNextPickup?.();
    buyDoubleSlot?.();
    playtest.upgrades += 3;
    recordPlaytest?.('banana-upgrades', {
      bananas: player.bananas,
      doubleSlotUses: player.doubleSlotUses,
      heldLevel: player.heldItem?.level || 0,
      rareNextPickup: player.rareNextPickup,
    });

    if (playtest.mode === 'visual-kart') {
      player.bananas = 0;
      player.rareNextPickup = false;
      player.doubleSlotUses = 0;
      player.heldItem = createHeldRaceItem(playtest.visualScenario === 'boost' ? 'boost' : 'shield', 1);
      player.heldBalloon = player.heldItem;
      if (playtest.visualScenario === 'finish-line') {
        player.progress = wrap01((compiled.startProgress || 0.012) - 0.045);
        player.lap = compiled.laps;
        player.lapStartTime = race.time;
      }
    }
  }

  const previousProgress = player.progress;
  const layerKeys = ['ground', 'air', 'hybrid'].filter((key) => compiled.routeLayers?.[key]);
  const visualKartMode = playtest.mode === 'visual-kart';
  const layerKey = visualKartMode
    ? 'ground'
    : layerKeys[Math.floor(race.time / 0.65) % Math.max(1, layerKeys.length)] || 'ground';
  const layer = compiled.routeLayers?.[layerKey] || compiled.routeLayers?.ground || {};
  const requiredVehicle = visualKartMode
    ? 'kart'
    : playtest.mode === 'vehicle-restricted'
    ? layer.vehiclePreference || 'kart'
    : layerKey === 'air'
    ? 'plane'
    : layerKey === 'hybrid'
    ? 'hover'
    : 'kart';
  if (player.vehicleMode !== requiredVehicle) setVehicleMode?.(player, requiredVehicle, { force: true });
  player.layer = layerKey;
  playtest.layers.add(layerKey);
  playtest.vehicles.add(player.vehicleMode);

  const progressRate = visualKartMode
    ? playtest.visualScenario === 'idle'
      ? 0
      : 48 / Math.max(1, compiled.totalLength)
    : playtest.mode === 'vehicle-restricted'
    ? 0.86
    : 0.94;
  player.progress = wrap01(player.progress + dt * progressRate);
  const sample = compiled.pointAt(player.progress);
  const normalAtPoint = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x);
  player.position.copy(sample.point).addScaledVector(normalAtPoint, layerOffset(layerKey, compiled.roadWidth));
  player.heading = Math.atan2(sample.tangent.x, sample.tangent.z);
  player.velocity.copy(sample.tangent).multiplyScalar(player.vehicleMode === 'plane' ? 56 : 48);
  player.flightAltitude = player.vehicleMode === 'plane' ? FLIGHT_CRUISE_ALTITUDE : 0;
  player.flightPitch = player.vehicleMode === 'plane' ? -0.04 : 0;
  player.flightRoll = player.vehicleMode === 'plane' ? Math.sin(race.time * 2.2) * 0.16 : 0;
  player.jumpHeight = player.vehicleMode === 'plane' ? 0 : Math.max(0, Math.sin(race.time * 4) * 0.2);
  player.steerInput = Math.sin(race.time * 1.8) * 0.22;
  player.planeBob += dt * 4;

  if (visualKartMode) {
    if (playtest.visualScenario === 'branch-decision') {
      const checkpoint =
        compiled.cameraCheckpoints.find((entry) => entry.key === 'branch-food') ||
        compiled.cameraCheckpoints.find((entry) => entry.visibleBranchKey);
      const checkpointSample = compiled.pointAt(checkpoint?.progress ?? 0.245);
      player.progress = checkpointSample.progress;
      player.position.copy(checkpointSample.point);
      player.heading = Math.atan2(checkpointSample.tangent.x, checkpointSample.tangent.z);
      player.velocity.copy(checkpointSample.tangent).multiplyScalar(48);
    }

    if (playtest.visualScenario === 'turn-approach') {
      const checkpointSample = compiled.pointAt(0.185);
      player.progress = checkpointSample.progress;
      player.position.copy(checkpointSample.point);
      player.heading = Math.atan2(checkpointSample.tangent.x, checkpointSample.tangent.z);
      player.velocity.copy(checkpointSample.tangent).multiplyScalar(48);
    }

    if (playtest.visualScenario === 'idle') player.velocity.set(0, 0, 0);
    player.jumpHeight = 0;
    player.driftActive = false;
    player.driftCharge = 0;
    player.driftDirection = 0;

    if (playtest.visualScenario === 'turn-approach') {
      player.steerInput = 0.58;
      player.driftActive = true;
      player.driftCharge = 1.42;
      player.driftDirection = 1;
      visualStats.driftStartCount = Math.max(visualStats.driftStartCount, 1);
      visualStats.driftTierSeen = Math.max(visualStats.driftTierSeen, 2);
    }

    if (playtest.visualScenario === 'finish-line') {
      player.steerInput = 0;
    }

    if (playtest.visualScenario === 'drift' || playtest.visualScenario === 'drift-tier-1') {
      player.steerInput = 0.58;
      player.driftActive = true;
      player.driftCharge = playtest.visualScenario === 'drift-tier-1' ? 0.78 : 1.42;
      player.driftDirection = 1;
      visualStats.driftStartCount = Math.max(visualStats.driftStartCount, 1);
      if (playtest.visualScenario === 'drift-tier-1') {
        visualStats.driftTierSeen = Math.max(visualStats.driftTierSeen, 1);
      }
    }

    if (playtest.visualScenario === 'boost') {
      player.boostTimer = Math.max(player.boostTimer, 0.8);
      player.boostTier = Math.max(player.boostTier, 2);
      player.boostSource = 'pad';
      recordBoostSource(visualStats, 'pad');
    }

    if (playtest.visualScenario === 'drift-release') {
      player.steerInput = 0.48;
      player.boostTimer = Math.max(player.boostTimer, 0.9);
      player.boostTier = Math.max(player.boostTier, 2);
      player.boostSource = 'drift';
      visualStats.driftStartCount = Math.max(visualStats.driftStartCount, 1);
      visualStats.driftTierSeen = Math.max(visualStats.driftTierSeen, 2);
      recordBoostSource(visualStats, 'drift');
    }

    if (playtest.visualScenario === 'item-pickup' && !player.heldItem) {
      player.heldItem = createHeldRaceItem('shield', 1);
      player.heldBalloon = player.heldItem;
    }
    if (playtest.visualScenario === 'item-pickup') {
      player.shieldTimer = Math.max(player.shieldTimer || 0, 1.2);
    }
  }

  if (previousProgress > 0.82 && player.progress < 0.18) {
    const lapTime = race.time - (player.lapStartTime || 0);
    player.bestLap = player.bestLap ? Math.min(player.bestLap, lapTime) : lapTime;
    player.lapSplits.push(lapTime);
    player.lap += 1;
    player.lapStartTime = race.time;
    recordPlaytest?.('lap', { lap: player.lap - 1, lapTime });
    if (player.lap > compiled.laps) {
      if (playtest.noFinish) {
        player.lap = 1;
        player.lapStartTime = race.time;
        recordPlaytest?.('loop', { noFinish: true });
        return true;
      }
      player.finished = true;
      player.finishTime = race.time;
      race.finished = true;
      return true;
    }
  }

  if (!visualKartMode && !playtest.signatureUsed && race.time > 0.2) {
    playtest.signatureUsed = applyRaceItem?.(player, player.heldItem, player.heldItem?.level || 1);
    if (playtest.signatureUsed) {
      playtest.itemUses += 1;
      recordPlaytest?.('signature-item', { itemKey: compiled.signatureItem?.key });
      player.heldItem = null;
      player.heldBalloon = null;
    }
  }

  if (!visualKartMode && Math.floor(race.time * 2) % 4 === 0) {
    const balloon = race.balloons.find((entry) => entry.cooldown <= 0);
    if (balloon) {
      collectBalloon?.(balloon);
      playtest.itemBoxesCollected += 1;
      recordPlaytest?.('item-box', { itemKey: player.heldItem?.itemKey || player.secondaryHeldItem?.itemKey });
    }
  }

  if (!visualKartMode && player.heldItem && race.time > 1.2 && playtest.itemUses < 3) {
    const used = applyRaceItem?.(player, player.heldItem, player.heldItem.level || 1);
    if (used) {
      playtest.itemUses += 1;
      recordPlaytest?.('item-use', { itemKey: player.heldItem.itemKey });
      advanceHeldRaceItemAfterUse({ player });
    }
  }

  race.bananas.forEach((banana) => {
    banana.cooldown = Math.max(0, banana.cooldown - dt);
    if (banana.cooldown <= 0 && progressDistance(banana.progress, player.progress) < 0.02) {
      player.bananas = clamp(player.bananas + 1, 0, 99);
      banana.cooldown = 3;
    }
  });
  playtest.bananaMax = Math.max(playtest.bananaMax, player.bananas);

  const playtestProgressWindow = Math.max(0.018, dt * progressRate * 1.35);
  const crossedProgress = (target) =>
    previousProgress <= player.progress
      ? target >= previousProgress && target <= player.progress
      : target >= previousProgress || target <= player.progress;
  const nearHazard = race.trackHazards.find(
    (hazard) => hazard.active !== false && progressDistance(hazard.progress, player.progress) < playtestProgressWindow
  );
  if (nearHazard) playtest.hazardsEncountered += dt;
  if (compiled.vehicleZones.some((zone) => progressDistance(zone.progress, player.progress) < playtestProgressWindow)) {
    playtest.zones += 1;
  }
  if (
    compiled.vehicleLocks.some(
      (lock) =>
        progressInRange(player.progress, lock.start, lock.end) ||
        crossedProgress(lock.start) ||
        crossedProgress(lock.end)
    )
  ) {
    playtest.locks += 1;
  }
  if (race.switchPads.some((pad) => progressDistance(pad.progress, player.progress) < playtestProgressWindow)) {
    playtest.switchPads += 1;
  }

  player.boostTimer = Math.max(0, player.boostTimer - dt);
  if (player.boostTimer <= 0) {
    player.boostTier = 0;
    player.boostSource = null;
  }
  player.blindTimer = Math.max(0, player.blindTimer - dt);
  player.controlFlipTimer = Math.max(0, player.controlFlipTimer - dt);
  player.ghostTimer = Math.max(0, (player.ghostTimer || 0) - dt);
  player.invincibleTimer = Math.max(0, player.invincibleTimer - dt);
  player.liftDisabledTimer = Math.max(0, player.liftDisabledTimer - dt);
  player.lightningRodTimer = Math.max(0, player.lightningRodTimer - dt);
  player.magnetTimer = Math.max(0, player.magnetTimer - dt);
  player.polaritySwapTimer = Math.max(0, player.polaritySwapTimer - dt);
  player.shieldTimer = Math.max(0, player.shieldTimer - dt);
  player.transformTimer = Math.max(0, player.transformTimer - dt);
  player.speed = player.velocity.length();
  applyVehicleIntegration?.(dt);

  return true;
};
