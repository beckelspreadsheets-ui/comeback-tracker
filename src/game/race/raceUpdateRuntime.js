import { VEHICLES } from './physics/kartTuning.js';
import {
  applyRaceTrackHazardEffectForFrame,
  applyRaceVehicleIntegrationForFrame,
  resolveRaceWorldCollisionsForFrame,
  triggerRaceHazardTypeForFrame,
  updateRaceRankingsForFrame,
  updateRaceTrackEventsForFrame,
  updateRaceTrackHazardsForFrame,
} from './raceFrameUpdates.js';
import { updateRacePlayerForFrame } from './racePlayerFrame.js';
import {
  applyLapProgress,
  scoreRacer,
} from './raceProgress.js';
import {
  breakableHitFor,
  updateBreakablesForFrame,
} from './raceBreakables.js';
import {
  applyCrosserHitToRacer,
  crosserHitFor,
  updateCrossersForFrame,
} from './raceCrossers.js';
import { updateRaceRivalsForFrame } from './raceRivals.js';

export const createRaceUpdateRuntime = ({
  addBoost,
  applyHazardEffectFrame = applyRaceTrackHazardEffectForFrame,
  applyItem,
  applyProgress = applyLapProgress,
  applyVehicleIntegrationFrame = applyRaceVehicleIntegrationForFrame,
  bounds,
  buyDoubleSlot,
  buyRareNextPickup,
  collectBalloon,
  collisionCircles,
  compiled,
  defaultVehicle,
  distanceBetween,
  getControls,
  getTouchControls,
  hitPlayer,
  hitRival,
  kartOnly,
  nextVehicleMode,
  playtest,
  profile,
  race,
  recordPlaytest,
  resolveWorldCollisionsFrame = resolveRaceWorldCollisionsForFrame,
  score = scoreRacer,
  setJumpQueued = () => {},
  setVehicleMode,
  triggerHazardTypeFrame = triggerRaceHazardTypeForFrame,
  updateAutoplay = () => null,
  updatePlayerFrame = updateRacePlayerForFrame,
  updateRankingsFrame = updateRaceRankingsForFrame,
  updateRivalsFrame = updateRaceRivalsForFrame,
  updateTrackEventsFrame = updateRaceTrackEventsForFrame,
  updateTrackHazardsFrame = updateRaceTrackHazardsForFrame,
  upgradeHeldItem,
  useVisualRivalCluster = () => false,
  vehicles = VEHICLES,
  visualStats,
} = {}) => {
  const updateLapProgress = (racer, nearest) => {
    const lapProgress = applyProgress({
      nearest,
      racer,
      raceTime: race.time,
      totalLaps: compiled.laps,
      trackLapSplits: racer === race.player,
    });
    if (racer === race.player && lapProgress.finished) race.finished = true;
    return lapProgress;
  };

  const applyVehicleIntegration = (dt) =>
    applyVehicleIntegrationFrame({
      compiled,
      distanceBetween,
      dt,
      hitPlayer,
      kartOnly,
      playtest,
      race,
      setVehicleMode,
    });

  const updateAutoplayPlayer = (dt) =>
    updateAutoplay({
      applyRaceItem: applyItem,
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
    });

  const applyHazardEffect = (racer, hazard, dt) =>
    applyHazardEffectFrame({
      addBoost,
      defaultVehicle,
      dt,
      hazard,
      hitPlayer,
      hitRival,
      nextVehicleMode,
      race,
      racer,
      scoreRacer: score,
      setVehicleMode,
    });

  const updateTrackHazards = (dt) =>
    updateTrackHazardsFrame({
      applyHazardEffect,
      dt,
      race,
    });

  const updateTrackEvents = (dt) =>
    updateTrackEventsFrame({
      compiled,
      dt,
      race,
      scoreRacer: score,
    });

  const resolveWorldCollisions = (racer) => {
    const collisionFrame = resolveWorldCollisionsFrame({
      collisionCircles,
      compiled,
      race,
      racer,
      vehicleMaxSpeed: vehicles.kart.maxSpeed || 1,
      visualStats,
    });
    return collisionFrame.collided;
  };

  const updatePlayer = (dt) => {
    const playerFrame = updatePlayerFrame({
      addBoost,
      applyVehicleIntegration,
      bounds,
      collectBalloon,
      compiled,
      controls: getControls(),
      defaultVehicle,
      distanceBetween,
      dt,
      hitPlayer,
      hitRival,
      race,
      resolveWorldCollisions,
      scoreRacer: score,
      touchControls: getTouchControls(),
      updateLapProgress,
      vehicles,
      visualStats,
    });
    setJumpQueued(playerFrame.jumpQueued);
    return playerFrame;
  };

  const triggerHazardByType = (hazardType, duration = 2.4, message = null) =>
    triggerHazardTypeFrame({
      duration,
      hazardType,
      message,
      race,
    });

  const updateRivals = (dt) =>
    updateRivalsFrame({
      compiled,
      defaultVehicle,
      distanceBetween,
      dt,
      playtest,
      profile,
      race,
      scoreRacer: score,
      setVehicleMode,
      triggerHazardByType,
      useVisualRivalCluster,
      vehicles,
    });

  const updateRankings = () => updateRankingsFrame({ race });

  const updateBreakables = (dt) => {
    if (!race.breakables) return { hit: null, spawnRequests: [] };
    updateBreakablesForFrame({ breakables: race.breakables, dt });
    const hit = breakableHitFor({
      breakables: race.breakables,
      lane: race.player.lane,
      progress: race.player.progress,
      trackLength: compiled.totalLength,
    });
    if (hit?.spawnRequest?.type === 'itemBox' && !race.player.heldItem) {
      race.player.heldItem = 'cocoa';
    }
    return { hit, spawnRequests: race.breakables.spawnRequests };
  };

  const updateCrossers = (dt) => {
    if (!race.crossers) return { crosser: null };
    updateCrossersForFrame({
      crossers: race.crossers,
      dt,
      trackLength: compiled.totalLength,
    });
    const crosser = crosserHitFor({
      crossers: race.crossers,
      lane: race.player.lane,
      progress: race.player.progress,
      trackLength: compiled.totalLength,
    });
    const player = race.player;
    if (
      crosser &&
      player.vehicleMode !== 'plane' &&
      (player.jumpHeight || 0) <= 0.05 &&
      (player.hitTimer || 0) <= 0
    ) {
      applyCrosserHitToRacer({ racer: player, crosser });
    }
    return { crosser };
  };

  return {
    applyHazardEffect,
    applyVehicleIntegration,
    resolveWorldCollisions,
    triggerHazardByType,
    updateAutoplayPlayer,
    updateBreakables,
    updateCrossers,
    updateLapProgress,
    updatePlayer,
    updateRankings,
    updateRivals,
    updateTrackEvents,
    updateTrackHazards,
  };
};
