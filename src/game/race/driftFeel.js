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
  chargeTimes: [0.55, 1.3, 2.15],
  hopDuration: 0.3,
  hopHeight: 2.1,
  minSpeed: 62,
  minSteer: 0.18,
  releaseFlash: 0.4,
  slideAngleBase: 0.32, // ~18° yaw off the velocity direction
  slideAngleMax: 0.5, // ~29° when steering hard into the drift
  // Index 0 is the pre-tier charging color, then tiers 1-3 (plan: blue →
  // orange → purple).
  sparkColors: ['#f7fbff', '#46d9ef', '#ff9a2e', '#c879ff'],
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
