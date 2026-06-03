import {
  resolveRaceControls as resolveBaseRaceControls,
} from './raceControlsBase.js';
import { resolveRacePlaytestControls } from './playtest/racePlaytestControls.js';

export * from './raceControlsBase.js';

export const resolveRaceControls = (options = {}) =>
  resolveBaseRaceControls({
    ...options,
    playtestControlsFor: options.playtestControlsFor || resolveRacePlaytestControls,
  });
