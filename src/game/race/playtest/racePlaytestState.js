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

export const createRacePlaytestState = (search = '', { hooksEnabled = true } = {}) => {
  if (!hooksEnabled) return createDisabledRacePlaytestState();

  const query = search instanceof URLSearchParams ? search : new URLSearchParams(search);

  return {
    bananaMax: 0,
    enabled: query.get('raceAutoplay') === '1',
    hazardsEncountered: 0,
    itemBoxesCollected: 0,
    itemUses: 0,
    layers: new Set(),
    locks: 0,
    mode: query.get('raceMode') || 'free-switch',
    noFinish: query.get('raceNoFinish') === '1',
    raceIndex: Number(query.get('raceIndex') || 1),
    signatureUsed: false,
    started: false,
    switchPads: 0,
    upgrades: 0,
    vehicles: new Set(),
    visualScenario: query.get('raceVisualScenario') || 'driving',
    zones: 0,
  };
};

export const resetRacePlaytestGlobals = ({ playtest, windowRef = globalThis.window } = {}) => {
  if (!windowRef) return;
  if (playtest?.enabled) {
    windowRef.__racePlaytestEvents = [];
    windowRef.__racePlaytestResult = null;
    windowRef.__raceVisualTelemetrySamples = [];
  }
  windowRef.__raceVisualTelemetry = null;
};

export const recordRacePlaytestEvent = ({
  compiled,
  detail = {},
  playtest,
  race,
  type,
  windowRef = globalThis.window,
} = {}) => {
  if (!playtest?.enabled || !windowRef?.__racePlaytestEvents) return null;
  const event = {
    mode: playtest.mode,
    raceIndex: playtest.raceIndex,
    time: race?.time || 0,
    trackKey: compiled?.key,
    type,
    ...detail,
  };
  windowRef.__racePlaytestEvents.push(event);
  return event;
};

export const publishRacePlaytestResult = ({
  result,
  windowRef = globalThis.window,
} = {}) => {
  if (windowRef) windowRef.__racePlaytestResult = result;
  return result;
};
