// Phase 1 drift & mini-turbo state machine for the V2 three-kart runtime
// (src/game/ComebackCityThreeKartRace.jsx). Pure data + math — no Three.js —
// so the hop/charge/release flow is testable without a renderer.
// Charge thresholds mined from the legacy DRIFT_TUNING.kart sparkChargeTime;
// release durations follow the gameplay-feel plan (~0.5s / 0.9s / 1.4s).

export const DRIFT_FEEL = {
  boostDurations: [0.5, 0.9, 1.4],
  // Immediate speed added on release per tier so the mini-turbo reads as a
  // kick, not just a higher ceiling.
  boostKick: [26, 40, 56],
  // Retuned 2026-08-03 (owner, after playing the preview: "drifting seems a bit
  // harder than it was"). It was, and the cause was the 4x tracks rather than
  // anything in this file — DRIFT_FEEL had not been touched since the original
  // gameplay commit.
  //
  // MEASURED against the shipped layouts. Old 2,897-unit loop: 16 corners in an
  // 11.15s lap, one every 0.70s, so a single held drift carried across several
  // corners and banked tier 2 or 3 routinely. Today: 16 corners in a ~47s lap,
  // one every ~2.97s with a median 1.8s straight between them. Every drift now
  // starts from zero, and against the old 0.55/1.3/2.15 thresholds:
  //
  //   corner duration   CC min 0.43  median 0.74  max 1.00
  //                     PV min 0.30  median 0.61  max 1.12
  //   reachable tier    CC  7 corners reach NOTHING, 9 reach tier 1
  //                     PV  3 reach nothing, 13 reach tier 1
  //   tier 2 (1.3s)     UNREACHABLE on either track, in any corner
  //   tier 3 (2.15s)    unreachable
  //
  // Two thirds of the drift system was dead content. 0.45/0.95/1.6 maps the
  // ladder onto the geometry that actually shipped: tier 1 in a median corner,
  // tier 2 in a good one, and tier 3 only by CHAINING — a chicane is two
  // corners with a 0.17s gap, ~1.65s total, so the top tier stays an
  // achievement rather than becoming routine. The reward is untouched;
  // boostDurations and boostKick are exactly as they were.
  chargeTimes: [0.45, 0.95, 1.6],
  hopDuration: 0.3,
  hopHeight: 2.1,
  minSpeed: 62,
  minSteer: 0.18,
  releaseFlash: 0.4,
  slideAngleBase: 0.32, // ~18° yaw off the velocity direction
  slideAngleMax: 0.5, // ~29° when steering hard into the drift
  // Index 0 is the pre-tier charging color, then tiers 1-3 (blue → orange →
  // purple). Tier 2 shares the boost-pad ember palette so "amber = boost
  // energy" reads as one grammar across pads, flames and sparks.
  sparkColors: ['#F5F8FF', '#00E5FF', '#FFD34F', '#C879FF'],
};

// CLASSIC MINI-TURBOS (?handling=mk64|mix, docs/CLASSIC_HANDLING.md). Assisted
// keeps the time-held charge above; the two Classic versions make you earn it,
// and the owner picks between them.

// Classic 64: MK64's rule, in our own numbers. During the slide, push the
// stick OUT of the corner and hold it there, then bring it back IN: that is
// one rock. The first rock needs a longer push than the rest; two rocks turn
// the sparks amber; letting go then pays one boost. Holding the stick out too
// long throws the charge away. Read on the raw stick, not the smoothed steer,
// so the timing is the player's and not the filter's.
export const ROCK_TURBO = {
  outward: 0.19,
  inward: 0.19,
  firstHold: 0.28,
  nextHold: 0.13,
  overHold: 1.6,
  readyStage: 2,
  maxStage: 3,
  boostDuration: 0.55,
  boostKick: 14,
  boostAccel: 120,
};

// Classic Mix: Crash Team Racing's idea, in our own numbers. A meter fills
// through the slide; press drift AGAIN while it is in the hot zone (the sparks
// turn amber) for a boost on the spot, up to three a slide, each bigger.
// Press early and the meter starts over with nothing; leave it full too long
// and it backfires. The button may come up briefly between presses (a pump)
// without ending the slide.
export const TAP_TURBO = {
  fillTime: 0.8,
  hotFrom: 0.7,
  backfireAfter: 0.2,
  backfireLoss: 12,
  maxBoosts: 3,
  pumpGrace: 0.16,
  boostDurations: [0.4, 0.55, 0.7],
  boostKicks: [10, 16, 22],
  boostAccel: 120,
};

// Which charge rule a handling uses.
export const driftModeForHandling = (handling) => (handling === 'mk64' ? 'rock' : handling === 'mix' ? 'tap' : 'hold');

// The mini-turbo's extra thrust, u/s^2, by charge rule.
export const turboAccelForMode = (mode) =>
  mode === 'rock' ? ROCK_TURBO.boostAccel : mode === 'tap' ? TAP_TURBO.boostAccel : 150;

export const driftTierForCharge = (charge) =>
  DRIFT_FEEL.chargeTimes.reduce((tier, time, index) => (charge >= time ? index + 1 : tier), 0);

export const createDriftState = () => ({
  active: false,
  charge: 0,
  direction: 0,
  hopTimer: 0,
  miniTurboTier: 0,
  miniTurboTimer: 0,
  releaseFlashTimer: 0,
  slideYaw: 0,
  tier: 0,
  wasHeld: false,
  // Classic charge state (ROCK_TURBO / TAP_TURBO); idle on Assisted.
  lastPresses: 0,
  meter: 0,
  meterFull: 0,
  pumpTimer: 0,
  rockOut: 0,
  stage: 0,
  tapBoosts: 0,
});

const resetClassicCharge = (drift) => {
  drift.meter = 0;
  drift.meterFull = 0;
  drift.pumpTimer = 0;
  drift.rockOut = 0;
  drift.stage = 0;
  drift.tapBoosts = 0;
};

const stepRockCharge = (drift, stick, dt, events) => {
  const along = Math.max(-1, Math.min(1, stick * drift.direction));
  if (along <= -ROCK_TURBO.outward) {
    drift.rockOut += dt;
    if (drift.rockOut >= ROCK_TURBO.overHold) {
      drift.stage = 0;
      drift.rockOut = 0;
    }
  } else if (along >= ROCK_TURBO.inward && drift.rockOut > 0) {
    const need = drift.stage === 0 ? ROCK_TURBO.firstHold : ROCK_TURBO.nextHold;
    if (drift.rockOut >= need && drift.stage < ROCK_TURBO.maxStage) {
      drift.stage += 1;
      events.stageUp = drift.stage;
    }
    drift.rockOut = 0;
  }
  // Sparks: white, then blue after one rock, amber once a release pays.
  drift.tier = drift.stage >= ROCK_TURBO.readyStage ? 2 : drift.stage;
};

const stepTapCharge = (drift, freshPress, dt, events) => {
  if (drift.tapBoosts >= TAP_TURBO.maxBoosts) {
    drift.meter = 0;
    drift.tier = 0;
    return;
  }
  drift.meter = Math.min(1, drift.meter + dt / TAP_TURBO.fillTime);
  drift.meterFull = drift.meter >= 1 ? drift.meterFull + dt : 0;
  if (freshPress) {
    if (drift.meter >= TAP_TURBO.hotFrom) {
      drift.tapBoosts += 1;
      const tier = drift.tapBoosts;
      drift.miniTurboTier = tier;
      drift.miniTurboTimer = TAP_TURBO.boostDurations[tier - 1];
      drift.releaseFlashTimer = DRIFT_FEEL.releaseFlash;
      events.tapBoost = tier;
      events.kick = TAP_TURBO.boostKicks[tier - 1];
    } else {
      events.tapEarly = true;
    }
    drift.meter = 0;
    drift.meterFull = 0;
  } else if (drift.meterFull > TAP_TURBO.backfireAfter) {
    events.backfire = true;
    events.kick = -TAP_TURBO.backfireLoss;
    drift.meter = 0;
    drift.meterFull = 0;
  }
  // Amber = press now.
  drift.tier = drift.meter >= TAP_TURBO.hotFrom ? 2 : 0;
};

// Advances the drift state machine one frame. Mutates `drift` and returns the
// frame's events: { hopped, landed, released, kick, ... } — released is the
// banked tier (0 = none/cancel) and kick the speed to add this frame.
//
// mode: 'hold' (Assisted, time-held charge), 'rock' (Classic 64) or 'tap'
// (Classic Mix). stick is the raw steering input (the rock rule reads it);
// presses counts fresh drift presses from every input source (the tap rule
// reads it).
export const updateDriftFeel = (drift, { dt, held, speed, steer, mode = 'hold', stick = steer, presses = 0 }) => {
  const events = {
    backfire: false,
    hopped: false,
    kick: 0,
    landed: false,
    released: 0,
    stageUp: 0,
    tapBoost: 0,
    tapEarly: false,
  };
  const freshPress = presses !== drift.lastPresses;
  drift.lastPresses = presses;
  // Classic Mix pumps the button between taps: a short gap keeps the slide.
  let holding = held;
  if (mode === 'tap' && drift.active) {
    drift.pumpTimer = held ? 0 : drift.pumpTimer + dt;
    holding = held || drift.pumpTimer < TAP_TURBO.pumpGrace;
  }

  // Tap drift → hop. The drift itself only starts on landing, and only if
  // the player is steering — matching the MK hop-commit rhythm.
  if (held && !drift.wasHeld && !drift.active && drift.hopTimer <= 0 && speed > DRIFT_FEEL.minSpeed) {
    drift.hopTimer = DRIFT_FEEL.hopDuration;
    events.hopped = true;
  }

  if (drift.hopTimer > 0) {
    drift.hopTimer -= dt;
    if (drift.hopTimer <= 0) {
      events.landed = true;
      if (held && Math.abs(steer) > DRIFT_FEEL.minSteer && speed > DRIFT_FEEL.minSpeed) {
        drift.active = true;
        drift.direction = steer > 0 ? 1 : -1;
        drift.charge = 0;
        drift.tier = 0;
        resetClassicCharge(drift);
      }
    }
  }

  if (drift.active) {
    if (!holding || speed < DRIFT_FEEL.minSpeed * 0.6) {
      // Releasing the button banks the mini-turbo; dropping too slow while
      // still holding cancels the drift without one. Classic Mix pays its
      // boosts mid-slide, so letting go there pays nothing more.
      let releasedTier = 0;
      if (!holding) {
        if (mode === 'hold') releasedTier = drift.tier;
        else if (mode === 'rock') releasedTier = drift.stage >= ROCK_TURBO.readyStage ? 2 : 0;
      }
      if (releasedTier > 0) {
        const rock = mode === 'rock';
        drift.miniTurboTier = releasedTier;
        drift.miniTurboTimer = rock ? ROCK_TURBO.boostDuration : DRIFT_FEEL.boostDurations[releasedTier - 1];
        drift.releaseFlashTimer = DRIFT_FEEL.releaseFlash;
        events.released = releasedTier;
        events.kick = rock ? ROCK_TURBO.boostKick : DRIFT_FEEL.boostKick[releasedTier - 1];
      }
      drift.active = false;
      drift.charge = 0;
      drift.tier = 0;
      resetClassicCharge(drift);
    } else {
      drift.charge = Math.min(drift.charge + dt, DRIFT_FEEL.chargeTimes[2] + 0.6);
      if (mode === 'rock') stepRockCharge(drift, stick, dt, events);
      else if (mode === 'tap') stepTapCharge(drift, freshPress, dt, events);
      else drift.tier = driftTierForCharge(drift.charge);
    }
  }

  drift.miniTurboTimer = Math.max(0, drift.miniTurboTimer - dt);
  if (drift.miniTurboTimer <= 0) drift.miniTurboTier = 0;
  drift.releaseFlashTimer = Math.max(0, drift.releaseFlashTimer - dt);

  // Visible slide angle, eased so drift entry/exit reads as a slide instead
  // of a snap; steering into the drift deepens the angle.
  const steerInDrift = drift.active ? steer * drift.direction : 0;
  const targetYaw = drift.active
    ? drift.direction *
      (DRIFT_FEEL.slideAngleBase +
        (DRIFT_FEEL.slideAngleMax - DRIFT_FEEL.slideAngleBase) * Math.max(0, steerInDrift))
    : 0;
  drift.slideYaw += (targetYaw - drift.slideYaw) * (1 - Math.pow(0.002, dt));

  drift.wasHeld = held;
  return events;
};

// Lane-velocity factor while drifting: direction is locked at drift start;
// steering into the drift tightens the arc (up to 1.0), counter-steering
// widens it (down to 0.08) but never flips sides.
export const driftLaneRate = (drift, steer) => {
  const steerInDrift = Math.min(1, Math.max(-1, steer * drift.direction));
  return drift.direction * (0.54 + 0.46 * steerInDrift);
};

// Hop height curve over the hop's lifetime (sine arc, 0 when grounded).
export const hopHeightFor = (hopTimer) => {
  if (hopTimer <= 0) return 0;
  const t = Math.min(1, Math.max(0, 1 - hopTimer / DRIFT_FEEL.hopDuration));
  return Math.sin(Math.PI * t) * DRIFT_FEEL.hopHeight;
};
