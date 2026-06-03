import * as THREE from 'three';
import {
  FLIGHT_ALTITUDE_LIMITS,
  VEHICLES,
  VEHICLE_ORDER,
} from './physics/kartTuning.js';
import {
  applyBoost,
  applyVehicleModeChange,
  nextVehicleModeFor,
} from './physics/kartPhysics.js';
import { recordBoostSource } from './raceTelemetry.js';

export const applyRaceBoostRuntime = ({
  defaultVehicle = 'kart',
  impulse = 0,
  race,
  racer,
  seconds = 0,
  source = null,
  stats = null,
  tier = 1,
  vehicles = VEHICLES,
} = {}) => {
  if (!racer) return null;
  const forward = new THREE.Vector3(Math.sin(racer.heading || 0), 0, Math.cos(racer.heading || 0));
  const vehicle = vehicles[racer.vehicleMode || defaultVehicle] || vehicles.kart;
  const boost = applyBoost({
    forward,
    impulse,
    racer,
    seconds,
    source,
    tier,
    vehicle,
  });
  if (racer === race?.player) recordBoostSource(stats, racer.boostSource);
  return boost;
};

export const applyRaceVehicleModeRuntime = ({
  flightAltitudeLimits = FLIGHT_ALTITUDE_LIMITS,
  force = false,
  kartOnly = false,
  nextMode,
  playCue = () => {},
  playerVehicle = null,
  race,
  racer,
  raceTime = race?.time || 0,
  vehicles = VEHICLES,
} = {}) => {
  const modeChange = applyVehicleModeChange({
    flightAltitudeLimits,
    force,
    kartOnly,
    nextMode,
    racer,
    raceTime,
    vehicles,
  });
  if (!modeChange.changed) return modeChange;
  if (racer === race?.player) {
    racer.boostTimer = Math.max(racer.boostTimer || 0, 0.2);
    playerVehicle?.setMode?.(racer.vehicleMode);
    playCue('vehicle-switch', 0.16);
  }
  return modeChange;
};

export const createRaceVehicleRuntime = ({
  defaultVehicle = 'kart',
  flightAltitudeLimits = FLIGHT_ALTITUDE_LIMITS,
  kartOnly = false,
  playCue = () => {},
  playerVehicle = null,
  race,
  vehicleOrder = VEHICLE_ORDER,
  vehicles = VEHICLES,
  visualStats = null,
} = {}) => {
  const addBoost = (racer, seconds, impulse, tier = 1, source = null) =>
    applyRaceBoostRuntime({
      defaultVehicle,
      impulse,
      race,
      racer,
      seconds,
      source,
      stats: visualStats,
      tier,
      vehicles,
    });

  const setVehicleMode = (racer, nextMode, { force = false } = {}) =>
    applyRaceVehicleModeRuntime({
      flightAltitudeLimits,
      force,
      kartOnly,
      nextMode,
      playCue,
      playerVehicle,
      race,
      racer,
      raceTime: race?.time || 0,
      vehicles,
    }).changed;

  const nextVehicleMode = (current) => nextVehicleModeFor(current, vehicleOrder);

  return {
    addBoost,
    nextVehicleMode,
    setVehicleMode,
  };
};
