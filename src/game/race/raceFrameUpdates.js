import {
  applyRaceHazardEffect,
  applyRaceTrackEvent,
  resolveRaceTrackEventsForFrame,
  resolveRaceTrackHazardContactsForFrame,
  triggerRaceHazardByType,
} from '../raceHazards.js';
import {
  resolveVehicleIntegrationForFrame,
  resolveWorldCollisionContactsForFrame,
} from './physics/kartPhysics.js';
import { applyRaceRankings } from './raceProgress.js';
import { normalizedSpeedFor } from './raceTelemetry.js';

export const applyRaceVehicleIntegrationForFrame = ({
  compiled,
  distanceBetween,
  dt = 0,
  hitPlayer,
  kartOnly = false,
  playtest = {},
  race,
  setVehicleMode,
} = {}) =>
  resolveVehicleIntegrationForFrame({
    distanceBetween,
    dt,
    hitPlayer,
    player: race?.player,
    pointAt: compiled?.pointAt,
    raceTime: race?.time || 0,
    setVehicleMode,
    shouldSkip: kartOnly || (compiled?.key === 'comeback-city' && !playtest.enabled),
    switchPads: race?.switchPads || [],
    vehicleLocks: compiled?.vehicleLocks || [],
    vehicleZones: compiled?.vehicleZones || [],
  });

export const applyRaceTrackHazardEffectForFrame = ({
  addBoost,
  defaultVehicle = 'kart',
  dt = 0,
  hazard,
  hitPlayer,
  hitRival,
  nextVehicleMode,
  race,
  racer,
  scoreRacer,
  setVehicleMode,
} = {}) =>
  applyRaceHazardEffect({
    addBoost,
    defaultVehicle,
    dt,
    getNextVehicleMode: nextVehicleMode,
    hazard,
    hitPlayer,
    hitRival,
    isPlayer: racer === race?.player,
    lightningRedirectTarget: () => [...(race?.rivals || [])].sort((a, b) => scoreRacer(b) - scoreRacer(a))[0] || null,
    raceTime: race?.time || 0,
    racer,
    setVehicleMode,
  });

export const updateRaceTrackHazardsForFrame = ({
  applyHazardEffect = () => null,
  dt = 0,
  race,
} = {}) => {
  const contacts = resolveRaceTrackHazardContactsForFrame({
    dt,
    raceTime: race?.time || 0,
    racers: [race?.player, ...(race?.rivals || [])].filter(Boolean),
    trackHazards: race?.trackHazards || [],
  });
  const effects = contacts.map(({ hazard, racer }) => applyHazardEffect(racer, hazard, dt));
  return {
    contacts,
    effects,
  };
};

export const triggerRaceHazardTypeForFrame = ({
  duration = 2.4,
  hazardType,
  message = null,
  race,
} = {}) => {
  const hazardTrigger = triggerRaceHazardByType({
    duration,
    hazardType,
    message,
    trackHazards: race?.trackHazards || [],
  });
  if (hazardTrigger.message && race?.eventMessages) race.eventMessages.push(hazardTrigger.message);
  return hazardTrigger;
};

export const runRaceTrackEventForFrame = ({
  compiled,
  event,
  race,
} = {}) => {
  const trackEvent = applyRaceTrackEvent({
    event,
    eventFlags: race?.eventFlags || {},
    player: race?.player,
    raceTime: race?.time || 0,
    trackHazards: race?.trackHazards || [],
    vehicleZones: compiled?.vehicleZones || [],
  });
  if (trackEvent.message && race?.eventMessages) race.eventMessages.push(trackEvent.message);
  return trackEvent;
};

export const updateRaceTrackEventsForFrame = ({
  compiled,
  dt = 0,
  race,
  scoreRacer,
} = {}) => {
  const trackEvents = [];
  const eventFrame = resolveRaceTrackEventsForFrame({
    applyEvent: (event, triggeredEvent) => {
      const trackEvent = runRaceTrackEventForFrame({ compiled, event, race });
      trackEvents.push({ ...triggeredEvent, trackEvent });
      return trackEvent;
    },
    dt,
    eventCooldowns: race?.eventCooldowns || {},
    eventFlags: race?.eventFlags || {},
    eventMessages: race?.eventMessages || [],
    events: compiled?.events || [],
    player: race?.player,
    raceTime: race?.time || 0,
    rivals: race?.rivals || [],
    scoreRacer,
  });
  if (race) race.eventMessages = eventFrame.eventMessages;
  return {
    ...eventFrame,
    trackEvents,
  };
};

export const resolveRaceWorldCollisionsForFrame = ({
  collisionCircles = [],
  compiled,
  race,
  racer,
  vehicleMaxSpeed = 1,
  visualStats,
} = {}) => {
  const collisionFrame = resolveWorldCollisionContactsForFrame({
    collisionCircles,
    defaultRoadWidth: compiled?.roadWidth,
    nearestRoadForPosition: compiled?.nearest,
    racer,
  });
  collisionFrame.contacts.forEach(({ collision }) => {
    if (racer === race?.player && visualStats) {
      visualStats.collisionCount = (visualStats.collisionCount || 0) + 1;
      if (visualStats.collisionImpactTime === null) {
        visualStats.collisionImpactTime = Number((race?.time || 0).toFixed(3));
        visualStats.collisionSpeedBefore = normalizedSpeedFor(collision.speedBefore, vehicleMaxSpeed || 1);
        visualStats.collisionSpeedAfter = normalizedSpeedFor(collision.speedAfter, vehicleMaxSpeed || 1);
        visualStats.collisionSpeedLossRatio =
          collision.speedLossRatio !== null ? Number(collision.speedLossRatio.toFixed(3)) : null;
      }
    }
  });
  return collisionFrame;
};

export const updateRaceRankingsForFrame = ({ race } = {}) => {
  const rankingFrame = applyRaceRankings({
    lastPlayerRank: race?.lastPlayerRank,
    player: race?.player,
    rivals: race?.rivals || [],
  });
  if (race) {
    if (rankingFrame.positionNotice) race.positionNotice = rankingFrame.positionNotice;
    race.lastPlayerRank = rankingFrame.lastPlayerRank;
  }
  return rankingFrame;
};
