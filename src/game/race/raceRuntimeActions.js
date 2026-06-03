import {
  advanceHeldRaceItemAfterUse,
  applyRaceItemUse,
  buyRaceDoubleSlotForPlayer,
  buyRareRacePickupForPlayer,
  collectRaceItemBoxForPlayer,
  upgradeHeldRaceItemForPlayer,
} from '../raceItems.js';
import {
  triggerNearestRemoteHazard,
} from '../raceHazards.js';
import {
  FLIGHT_ALTITUDE_LIMITS,
} from './physics/kartTuning.js';
import { createRaceDropRuntime } from './raceDropRuntime.js';
import { createRaceHitRuntime } from './raceHitRuntime.js';

const {
  cruise: FLIGHT_CRUISE_ALTITUDE,
} = FLIGHT_ALTITUDE_LIMITS;

export const createRaceRuntimeActions = ({
  addBoost,
  compiled,
  defaultVehicle = 'kart',
  distanceBetween,
  droppedBananaMat,
  droppedBananaMeshes,
  inventoryRef,
  kartOnly = false,
  nextVehicleMode,
  onInventoryUseRef,
  playCue = () => {},
  playerVehicle,
  race,
  scoreRacer,
  setVehicleMode,
  trapMeshes,
  visualStats,
  world,
} = {}) => {
  const {
    dropTrap,
    scatterBananas,
    spawnDroppedBanana,
  } = createRaceDropRuntime({
    droppedBananaMat,
    droppedBananaMeshes,
    race,
    trapMeshes,
    world,
  });

  const { hitPlayer, hitRival } = createRaceHitRuntime({
    playCue,
    race,
    scatterBananas,
  });

  const cycleVehicle = () => {
    if (kartOnly) return false;
    return setVehicleMode(race.player, nextVehicleMode(race.player.vehicleMode));
  };

  const triggerRemoteHazard = (strength = 1) => {
    const remoteHazard = triggerNearestRemoteHazard({
      hazards: race.trackHazards,
      playerPosition: race.player.position,
      strength,
    });
    race.eventMessages.push(remoteHazard.message);
    return remoteHazard;
  };

  const applyRaceItem = (racer, itemLike, level = 1) => {
    const itemUse = applyRaceItemUse({
      addBoost,
      defaultVehicle,
      distanceBetween,
      dropTrap,
      getNextVehicleMode: nextVehicleMode,
      hitRival,
      itemLike,
      level,
      onAllowed: (cue) => {
        if (racer === race.player) playCue(cue, 0.12);
      },
      racer,
      requireVehicleAllowed: racer === race.player,
      rivals: race.rivals,
      raceTime: race.time,
      scoreRacer,
      setVehicleMode,
      trackKey: compiled.key,
      vehicleMode: racer.vehicleMode,
      triggerRemoteHazard,
    });
    return itemUse.applied;
  };

  const collectBalloon = (balloon) => {
    const pickup = collectRaceItemBoxForPlayer({
      box: balloon,
      player: race.player,
      signatureItemKey: compiled.signatureItem?.key,
      trackKey: compiled.key,
      vehicleMode: race.player.vehicleMode,
    });
    if (visualStats.itemBoxPickupTime === null) {
      visualStats.itemBoxPickupTime = Number(race.time.toFixed(3));
      visualStats.itemBoxPickupDelay = Number(
        (race.time - (visualStats.itemBoxProbeStartTime ?? race.time)).toFixed(3)
      );
      visualStats.itemBoxPickupKey = pickup.item?.itemKey || pickup.item?.key || pickup.itemKey;
      visualStats.itemBoxSourceType = pickup.itemBoxSourceType;
    }
    return pickup;
  };

  const useHeldBalloon = () => {
    const held = race.player.heldItem || race.player.heldBalloon;
    if (!held) return false;
    if (!applyRaceItem(race.player, held, held.level || 1)) return false;
    advanceHeldRaceItemAfterUse({ player: race.player });
    return true;
  };

  const useBankedItem = (type) => {
    if ((inventoryRef.current?.[type] || 0) <= 0) return false;
    const used = applyRaceItem(race.player, type, 2);
    if (used) onInventoryUseRef.current?.(type);
    return used;
  };

  const upgradeHeldItem = () => upgradeHeldRaceItemForPlayer({ player: race.player });

  const buyRareNextPickup = () => buyRareRacePickupForPlayer({ player: race.player });

  const buyDoubleSlot = () => buyRaceDoubleSlotForPlayer({ player: race.player });

  const resetPlayer = () => {
    const sample = compiled.pointAt(race.player.progress);
    race.player.position.copy(sample.point);
    race.player.velocity.set(0, 0, 0);
    race.player.heading = Math.atan2(sample.tangent.x, sample.tangent.z);
    race.player.flightAltitude = race.player.vehicleMode === 'plane' ? FLIGHT_CRUISE_ALTITUDE : 0;
    race.player.flightPitch = 0;
    race.player.flightRoll = 0;
    race.player.flightVerticalVelocity = 0;
    race.player.jumpHeight = 0;
    race.player.jumpVelocity = 0;
    playerVehicle?.setMode?.(race.player.vehicleMode);
    return true;
  };

  return {
    applyRaceItem,
    buyDoubleSlot,
    buyRareNextPickup,
    collectBalloon,
    cycleVehicle,
    dropTrap,
    hitPlayer,
    hitRival,
    resetPlayer,
    scatterBananas,
    spawnDroppedBanana,
    triggerRemoteHazard,
    upgradeHeldItem,
    useBankedItem,
    useHeldBalloon,
  };
};
