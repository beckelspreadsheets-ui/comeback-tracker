// Phase 3.5 air & tricks — pure math. Ramps (and the bridge crest) launch a
// ballistic arc; pressing the action button mid-air arms a trick (visual
// spin) that banks a mini-turbo on landing, MK-style. Forgiving: a trick
// armed but not fully spun still pays out.

export const TRICK_FEEL = {
  gravity: 58,
  // K2.5 owner pick (e) 2026-07-11 ("option C and E"): 0.155 threw ~330
  // world units over 1.3-1.7 s — the ramp left the frame instantly and the
  // whole flight read as unexplained floating. 0.105 lands ~0.9 s / ~225
  // units at race speed (crest big launch ~1.2 s); a full trick spin
  // (2π at 8.5 rad/s = 0.74 s) still completes on a normal launch.
  launchLift: 0.105, // vertical velocity = speed * lift
  minLaunchSpeed: 90,
  rampHitLane: 0.22,
  rampHitProgress: 9, // world units
  trickSpinRate: 8.5, // rad/s of visual yaw spin
};

// Classic Mix's air rules (docs/CLASSIC_HANDLING.md step 6), from two of the
// owner's picks off the decomp list, in our own numbers:
//   - TIMED TRICKS (Mario Kart Wii): the trick only arms if the press comes
//     within trickWindow of leaving the ramp. Assisted takes a press any time
//     in the air.
//   - HANG-TIME BOOST (Crash Team Racing): keep drift held through a long
//     jump and the landing pays a boost that grows with the time in the air.
export const MIX_AIR = {
  trickWindow: 0.22,
  hangMin: 0.5,
  // Landing boost = (airTime - hangMin) x these, capped.
  hangBoostPerSecond: 1.1,
  hangBoostMax: 0.85,
  hangKickPerSecond: 34,
  hangKickMax: 24,
};

// What a landing after `airTime` seconds pays with drift held: { duration,
// kick }, or null when the jump was too short.
export const hangTimeBoost = (airTime) => {
  const over = airTime - MIX_AIR.hangMin;
  if (!(over > 0)) return null;
  return {
    duration: Math.min(MIX_AIR.hangBoostMax, over * MIX_AIR.hangBoostPerSecond),
    kick: Math.min(MIX_AIR.hangKickMax, over * MIX_AIR.hangKickPerSecond),
  };
};

// Ramp placements and the dare-shortcut parameters are TRACK DATA — they
// live in each TrackDefinition (src/game/race/tracks/). These functions take
// the track's shortcut def so the math works for every track.

export const createShortcutState = () => ({
  active: false,
  failed: false,
  fromLane: 0,
  fromProgress: 0,
  styled: false,
  t: 0,
});

export const launchShortcut = (shortcut, def, speed, progress, lane) => {
  if (shortcut.active) return false;
  shortcut.active = true;
  shortcut.failed = speed < def.minSpeed;
  shortcut.fromLane = lane;
  shortcut.fromProgress = progress;
  shortcut.styled = false;
  shortcut.t = 0;
  return true;
};

// Advances flight; returns { landed, failed }.
export const updateShortcut = (shortcut, def, dt) => {
  if (!shortcut.active) return { failed: false, landed: false };
  const duration = shortcut.failed ? def.failFlightTime : def.flightTime;
  shortcut.t = Math.min(1, shortcut.t + dt / duration);
  if (shortcut.t >= 1) {
    shortcut.active = false;
    return { failed: shortcut.failed, landed: true };
  }
  return { failed: false, landed: false };
};

export const shortcutArcHeight = (shortcut, def) =>
  Math.sin(Math.PI * Math.min(1, shortcut.t)) * (shortcut.failed ? 12 : def.peakHeight);

export const createAirState = () => ({
  airborne: false,
  big: false,
  height: 0,
  spin: 0,
  trickArmed: false,
  trickDone: false,
  verticalVel: 0,
  wasAction: false,
  // Seconds since leaving the ramp (Classic Mix times tricks and hang time).
  airTime: 0,
});

export const launchAir = (air, speed, { big = false } = {}) => {
  if (air.airborne || speed < TRICK_FEEL.minLaunchSpeed) return false;
  air.airborne = true;
  air.big = big;
  // Pop off the lip, not the asphalt — the launch starts at lip height.
  air.height = big ? 0.4 : 2.2;
  air.verticalVel = speed * TRICK_FEEL.launchLift * (big ? 1.3 : 1);
  air.spin = 0;
  air.trickArmed = false;
  air.trickDone = false;
  air.airTime = 0;
  return true;
};

// Nose-up while rising, nose-down into the landing — what sells the jump.
export const airPitchFor = (air) =>
  air.airborne ? Math.min(0.5, Math.max(-0.42, air.verticalVel * 0.018)) : 0;

// Shortcut arc pitch: derived from the sine flight path.
export const shortcutPitchFor = (shortcut) =>
  shortcut.active ? Math.cos(Math.PI * Math.min(1, shortcut.t)) * 0.42 : 0;

// Advances the air state one frame; returns { landed, trickTier, airTime,
// heldLanding } where trickTier is 0 (no trick), 1 (ramp trick) or 2
// (big/bridge trick), airTime the flight's length on the landing frame and
// heldLanding whether the action was still held as it landed. trickWindow
// (Classic Mix) limits when a press can arm the trick; Infinity = any time.
export const updateAir = (air, { actionHeld, dt, trickWindow = Infinity }) => {
  const events = { airTime: 0, heldLanding: false, landed: false, trickTier: 0 };
  if (!air.airborne) {
    air.wasAction = actionHeld;
    return events;
  }
  air.verticalVel -= TRICK_FEEL.gravity * dt;
  air.height = Math.max(0, air.height + air.verticalVel * dt);
  air.airTime += dt;
  if (actionHeld && !air.wasAction && air.airTime <= trickWindow) air.trickArmed = true;
  if (air.trickArmed && !air.trickDone) {
    air.spin = Math.min(Math.PI * 2, air.spin + TRICK_FEEL.trickSpinRate * dt);
    if (air.spin >= Math.PI * 2) air.trickDone = true;
  }
  if (air.height <= 0 && air.verticalVel < 0) {
    air.airborne = false;
    air.height = 0;
    events.landed = true;
    events.airTime = air.airTime;
    events.heldLanding = Boolean(actionHeld);
    if (air.trickArmed) events.trickTier = air.big ? 2 : 1;
    air.spin = 0;
    air.trickArmed = false;
  }
  air.wasAction = actionHeld;
  return events;
};
