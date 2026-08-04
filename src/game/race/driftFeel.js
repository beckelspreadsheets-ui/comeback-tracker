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
});

// Advances the drift state machine one frame. Mutates `drift` and returns the
// frame's events: { hopped, landed, released } — released is the banked tier
// (0 = none/cancel).
export const updateDriftFeel = (drift, { dt, held, speed, steer }) => {
  const events = { hopped: false, landed: false, released: 0 };

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
      }
    }
  }

  if (drift.active) {
    if (!held || speed < DRIFT_FEEL.minSpeed * 0.6) {
      // Releasing the button banks the mini-turbo; dropping too slow while
      // still holding cancels the drift without one.
      const releasedTier = held ? 0 : drift.tier;
      if (releasedTier > 0) {
        drift.miniTurboTier = releasedTier;
        drift.miniTurboTimer = DRIFT_FEEL.boostDurations[releasedTier - 1];
        drift.releaseFlashTimer = DRIFT_FEEL.releaseFlash;
        events.released = releasedTier;
      }
      drift.active = false;
      drift.charge = 0;
      drift.tier = 0;
    } else {
      drift.charge = Math.min(drift.charge + dt, DRIFT_FEEL.chargeTimes[2] + 0.6);
      drift.tier = driftTierForCharge(drift.charge);
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
