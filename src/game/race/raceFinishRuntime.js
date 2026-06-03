export const buildRaceFinishResult = ({
  compiled,
  playtest = {},
  race,
} = {}) => {
  const result = {
    bestLap: race.player.bestLap,
    place: race.player.rank,
    time: race.player.finishTime,
    trackKey: compiled.key,
  };

  if (playtest.enabled) {
    result.playtest = {
      bananaMax: playtest.bananaMax,
      hazardsEncountered: Number(playtest.hazardsEncountered.toFixed(2)),
      itemBoxesCollected: playtest.itemBoxesCollected,
      itemUses: playtest.itemUses,
      layers: Array.from(playtest.layers),
      locks: playtest.locks,
      mode: playtest.mode,
      raceIndex: playtest.raceIndex,
      signatureUsed: playtest.signatureUsed,
      switchPads: playtest.switchPads,
      upgrades: playtest.upgrades,
      vehicles: Array.from(playtest.vehicles),
      zones: playtest.zones,
    };
  }

  return result;
};

export const publishRaceFinishResult = ({
  compiled,
  onFinishRef,
  playtest = {},
  publishPlaytestResult = () => null,
  race,
  recordPlaytest = () => {},
} = {}) => {
  const result = buildRaceFinishResult({ compiled, playtest, race });
  if (playtest.enabled) {
    publishPlaytestResult(result);
    recordPlaytest('finish', result);
  }
  onFinishRef?.current?.(result);
  return result;
};
