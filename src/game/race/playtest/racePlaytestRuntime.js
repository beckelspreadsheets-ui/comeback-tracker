import { updateRaceAutoplayPlayer } from './raceAutoplay.js';
import {
  createRacePlaytestState,
  publishRacePlaytestResult,
  recordRacePlaytestEvent,
  resetRacePlaytestGlobals,
} from './racePlaytestState.js';
import { resolveRacePlaytestControls } from './racePlaytestControls.js';
import {
  applyVisualKartScenarioFrame,
  manualVisualScenarioIsActive,
  manualVisualScenarioIsPrimed,
  primeVisualKartScenario,
  visualKartScenarioMatches,
  visualScenarioUsesHeadingCamera,
} from './raceVisualScenarios.js';

export const createRacePlaytestRuntime = () => ({
  applyVisualKartScenarioFrame,
  createRacePlaytestState,
  isVisualBrakingScenario: (playtest) => visualKartScenarioMatches(playtest, 'braking'),
  isVisualRivalCluster: (playtest) => visualKartScenarioMatches(playtest, 'rival-cluster'),
  manualVisualScenarioIsActive,
  manualVisualScenarioIsPrimed,
  primeVisualKartScenario,
  publishRacePlaytestResult,
  recordRacePlaytestEvent,
  resetRacePlaytestGlobals,
  resolveRacePlaytestControls,
  updateRaceAutoplayPlayer,
  visualScenarioUsesHeadingCamera,
});
