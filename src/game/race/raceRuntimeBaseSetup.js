import {
  DEFAULT_VEHICLE_BY_STYLE,
} from './physics/kartTuning.js';
import { RACE_RELEVANT_KEY_CODES } from './raceControlsBase.js';
import { createRaceTelemetryStats } from './raceTelemetry.js';
import { createRaceState } from './raceState.js';
import { compileTrack3D } from './track/trackGeometry.js';

export const defaultRaceVehicleFor = ({ compiled, track } = {}) => {
  const kartOnly = Boolean(compiled?.kartOnly || compiled?.courseV2?.kartOnly);
  return kartOnly ? 'kart' : DEFAULT_VEHICLE_BY_STYLE[compiled?.raceStyle || track?.raceStyle] || 'kart';
};

export const racePlaytestHooksEnabledForEnv = (env = import.meta.env) => {
  if (!env) return true;
  if (env.DEV) return true;
  return String(env.VITE_RACE_PLAYTEST_HOOKS || '').trim().toLowerCase() === 'true';
};

export const createDisabledRacePlaytestState = () => ({
  bananaMax: 0,
  enabled: false,
  hazardsEncountered: 0,
  itemBoxesCollected: 0,
  itemUses: 0,
  layers: new Set(),
  locks: 0,
  mode: 'disabled',
  noFinish: false,
  raceIndex: 0,
  signatureUsed: false,
  started: false,
  switchPads: 0,
  upgrades: 0,
  vehicles: new Set(),
  visualScenario: 'driving',
  zones: 0,
});

export const createRaceRuntimeBaseSetup = ({
  playtest = createDisabledRacePlaytestState(),
  profile,
  track,
} = {}) => {
  const compiled = compileTrack3D(track);
  const kartOnly = Boolean(compiled.kartOnly || compiled.courseV2?.kartOnly);
  const defaultVehicle = defaultRaceVehicleFor({ compiled, track });
  const race = createRaceState(compiled, profile, defaultVehicle);

  return {
    compiled,
    defaultVehicle,
    kartOnly,
    keys: new Set(),
    playtest,
    race,
    relevantKeys: new Set(RACE_RELEVANT_KEY_CODES),
    visualStats: createRaceTelemetryStats(),
  };
};
