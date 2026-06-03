export const resolveRacePlaytestControls = ({ playtest = {}, visualStats = {} } = {}) => {
  const visualScenario = playtest.visualScenario;

  if (
    !playtest.enabled ||
    playtest.mode !== 'visual-kart' ||
    (visualScenario !== 'acceleration' &&
      visualScenario !== 'boost-pad-mechanics' &&
      visualScenario !== 'braking' &&
      visualScenario !== 'collision-mechanics' &&
      visualScenario !== 'drift-mechanics' &&
      visualScenario !== 'offroad-slowdown' &&
      visualScenario !== 'item-box-mechanics' &&
      visualScenario !== 'reverse' &&
      visualScenario !== 'steering-low-speed' &&
      visualScenario !== 'steering-high-speed' &&
      visualScenario !== 'stuck-recovery')
  ) {
    return null;
  }

  const brakingComplete = visualScenario === 'braking' && visualStats.timeFromTopSpeedTo25 !== null;
  const driftMechanicsScenario = visualScenario === 'drift-mechanics';
  const driftMechanicsReleased = driftMechanicsScenario && Boolean(visualStats.boostSourcesSeen?.drift);
  const steeringScenario = visualScenario === 'steering-low-speed' || visualScenario === 'steering-high-speed';
  const steeringComplete = steeringScenario && visualStats.steeringTurn90Time !== null;

  return {
    brake: visualScenario === 'braking' && !brakingComplete ? 1 : 0,
    drift: driftMechanicsScenario && !driftMechanicsReleased && visualStats.driftTierSeen < 2,
    jump: false,
    steer:
      steeringScenario && !steeringComplete
        ? 1
        : driftMechanicsScenario && !driftMechanicsReleased
        ? 1
        : 0,
    throttle:
      visualScenario === 'braking'
        ? brakingComplete
          ? 0
          : -0.9
        : visualScenario === 'reverse'
        ? -0.9
        : steeringScenario ||
          driftMechanicsScenario ||
          visualScenario === 'boost-pad-mechanics' ||
          visualScenario === 'collision-mechanics' ||
          visualScenario === 'item-box-mechanics' ||
          visualScenario === 'offroad-slowdown'
        ? 0
        : 1,
  };
};
