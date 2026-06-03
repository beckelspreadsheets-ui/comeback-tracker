import {
  createRaceRuntimeBaseSetup,
  defaultRaceVehicleFor,
  racePlaytestHooksEnabledForEnv,
} from './raceRuntimeBaseSetup.js';
import { createRacePlaytestState } from './playtest/racePlaytestState.js';

export {
  defaultRaceVehicleFor,
  racePlaytestHooksEnabledForEnv,
} from './raceRuntimeBaseSetup.js';

export const createRaceRuntimeSetup = ({
  playtestHooksEnabled = racePlaytestHooksEnabledForEnv(),
  profile,
  search = '',
  track,
} = {}) => {
  const playtest = createRacePlaytestState(search, { hooksEnabled: playtestHooksEnabled });
  return createRaceRuntimeBaseSetup({
    playtest,
    profile,
    track,
  });
};
