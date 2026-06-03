import { createDisabledRacePlaytestState } from '../raceRuntimeBaseSetup.js';

export const createRacePlaytestNoopRuntime = () => ({
  applyVisualKartScenarioFrame: () => {},
  createRacePlaytestState: () => createDisabledRacePlaytestState(),
  isVisualBrakingScenario: () => false,
  isVisualRivalCluster: () => false,
  manualVisualScenarioIsActive: () => false,
  manualVisualScenarioIsPrimed: () => false,
  primeVisualKartScenario: () => {},
  publishRacePlaytestResult: () => null,
  recordRacePlaytestEvent: () => null,
  resetRacePlaytestGlobals: () => {},
  resolveRacePlaytestControls: () => null,
  updateRaceAutoplayPlayer: () => null,
  visualScenarioUsesHeadingCamera: () => false,
});
