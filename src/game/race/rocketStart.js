// Rocket start: the countdown boost.
//
// The press is timed by the countdown seconds still to go when the player
// started holding (gas on keyboard/pad; Drift on touch, where the throttle is
// automatic), held through GO. Letting go re-arms it, so a nervous early tap
// can be taken back.
//
// THE REWARD USED TO DO NOTHING. A good start only raised the speed CAP for a
// moment, and a kart starting from 0 cannot reach even the normal cap in that
// time, so a perfect start finished level with a lazy one (measured in a sim,
// 2026-10-26: +0.00 s). The reward is now a launch: an instant kick plus the
// boost window. Worth ~0.6 s on both handlings.
//
// Assisted keeps its wide window: press on the "2" (1.9-1.3 s to go) for a
// perfect start, later for a good one; mashing during "3" floods the engine.
//
// Classic is MK64's rule in our numbers: one FRESH press in the last moment
// before GO (0.25 s; MK64 allows ~0.13, phones need the slack), held through
// GO. Holding the gas from more than a second out floods the engine, and on
// Classic a flood costs real time (~1.4 s). There is no "good" start.
export const ROCKET_START = Object.freeze({
  floodBefore: 2.45,
  floodSpin: 0.7,
  goodBoost: 0.7,
  goodFrom: 1.3,
  goodKick: 45,
  goodTo: 0.35,
  perfectBoost: 1.3,
  perfectFrom: 1.9,
  perfectKick: 90,
});

export const CLASSIC_ROCKET_START = Object.freeze({
  floodBefore: 1,
  floodSpin: 1.4,
  perfectBoost: 1.1,
  perfectKick: 95,
  perfectWindow: 0.25,
});

// pressAt: countdown seconds remaining when the held press began (null = no
// press held at GO). Returns 'perfect' | 'good' | 'flooded' | 'early' | null.
export const rocketStartResult = (pressAt, { classic = false } = {}) => {
  if (pressAt == null) return null;
  if (classic) {
    if (pressAt > CLASSIC_ROCKET_START.floodBefore) return 'flooded';
    return pressAt <= CLASSIC_ROCKET_START.perfectWindow ? 'perfect' : null;
  }
  if (pressAt > ROCKET_START.floodBefore) return 'flooded';
  if (pressAt <= ROCKET_START.perfectFrom && pressAt > ROCKET_START.goodFrom) return 'perfect';
  if (pressAt <= ROCKET_START.goodFrom && pressAt >= ROCKET_START.goodTo) return 'good';
  if (pressAt > ROCKET_START.perfectFrom) return 'early';
  return null;
};

// What a result gives at GO: { kick (u/s added now), boost (s of boost
// window), spin (s spun out) }.
export const rocketStartReward = (result, { classic = false } = {}) => {
  if (result === 'perfect') {
    return classic
      ? { boost: CLASSIC_ROCKET_START.perfectBoost, kick: CLASSIC_ROCKET_START.perfectKick, spin: 0 }
      : { boost: ROCKET_START.perfectBoost, kick: ROCKET_START.perfectKick, spin: 0 };
  }
  if (result === 'good' && !classic) return { boost: ROCKET_START.goodBoost, kick: ROCKET_START.goodKick, spin: 0 };
  if (result === 'flooded') {
    return { boost: 0, kick: 0, spin: classic ? CLASSIC_ROCKET_START.floodSpin : ROCKET_START.floodSpin };
  }
  return { boost: 0, kick: 0, spin: 0 };
};
