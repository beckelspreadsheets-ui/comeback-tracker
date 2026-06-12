// Phase 3.5 air & tricks — pure math. Ramps (and the bridge crest) launch a
// ballistic arc; pressing the action button mid-air arms a trick (visual
// spin) that banks a mini-turbo on landing, MK-style. Forgiving: a trick
// armed but not fully spun still pays out.

export const TRICK_FEEL = {
  gravity: 58,
  launchLift: 0.155, // vertical velocity = speed * lift
  minLaunchSpeed: 90,
  rampHitLane: 0.22,
  rampHitProgress: 9, // world units
  trickSpinRate: 8.5, // rad/s of visual yaw spin
};

// Ramps live on the straights, off the center line so they're a deliberate
// line choice; the bridge crest is a free natural launch.
export const RAMPS = [
  { progress: 0.075, side: -0.35 },
  { progress: 0.685, side: 0.35 },
];

// Shortcut dare-ramp: jump the entire south carousel from the inside line.
// Only sticks if you arrive ABOVE natural top speed (boost/mini-turbo/trick
// required — that's the commit); case it slow and you crash-land mid-corner
// with a long spin-out at crawl speed. Risk ≈ 4-5s lost, reward ≈ 2-3s won.
export const SHORTCUT = {
  failFlightTime: 0.85,
  failLandProgress: 0.272,
  failSpeed: 40,
  failSpin: 1.8,
  flightTime: 1.55,
  landProgress: 0.365,
  launchProgress: 0.212,
  minSpeed: 232,
  peakHeight: 26,
  side: -0.7,
};

export const createShortcutState = () => ({
  active: false,
  failed: false,
  fromLane: 0,
  fromProgress: 0,
  styled: false,
  t: 0,
});

export const launchShortcut = (shortcut, speed, progress, lane) => {
  if (shortcut.active) return false;
  shortcut.active = true;
  shortcut.failed = speed < SHORTCUT.minSpeed;
  shortcut.fromLane = lane;
  shortcut.fromProgress = progress;
  shortcut.styled = false;
  shortcut.t = 0;
  return true;
};

// Advances flight; returns { landed, failed }.
export const updateShortcut = (shortcut, dt) => {
  if (!shortcut.active) return { failed: false, landed: false };
  const duration = shortcut.failed ? SHORTCUT.failFlightTime : SHORTCUT.flightTime;
  shortcut.t = Math.min(1, shortcut.t + dt / duration);
  if (shortcut.t >= 1) {
    shortcut.active = false;
    return { failed: shortcut.failed, landed: true };
  }
  return { failed: false, landed: false };
};

export const shortcutArcHeight = (shortcut) =>
  Math.sin(Math.PI * Math.min(1, shortcut.t)) * (shortcut.failed ? 12 : SHORTCUT.peakHeight);

export const createAirState = () => ({
  airborne: false,
  big: false,
  height: 0,
  spin: 0,
  trickArmed: false,
  trickDone: false,
  verticalVel: 0,
  wasAction: false,
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
  return true;
};

// Nose-up while rising, nose-down into the landing — what sells the jump.
export const airPitchFor = (air) =>
  air.airborne ? Math.min(0.5, Math.max(-0.42, air.verticalVel * 0.018)) : 0;

// Shortcut arc pitch: derived from the sine flight path.
export const shortcutPitchFor = (shortcut) =>
  shortcut.active ? Math.cos(Math.PI * Math.min(1, shortcut.t)) * 0.42 : 0;

// Advances the air state one frame; returns { landed, trickTier } where
// trickTier is 0 (no trick), 1 (ramp trick) or 2 (big/bridge trick).
export const updateAir = (air, { actionHeld, dt }) => {
  const events = { landed: false, trickTier: 0 };
  if (!air.airborne) {
    air.wasAction = actionHeld;
    return events;
  }
  air.verticalVel -= TRICK_FEEL.gravity * dt;
  air.height = Math.max(0, air.height + air.verticalVel * dt);
  if (actionHeld && !air.wasAction) air.trickArmed = true;
  if (air.trickArmed && !air.trickDone) {
    air.spin = Math.min(Math.PI * 2, air.spin + TRICK_FEEL.trickSpinRate * dt);
    if (air.spin >= Math.PI * 2) air.trickDone = true;
  }
  if (air.height <= 0 && air.verticalVel < 0) {
    air.airborne = false;
    air.height = 0;
    events.landed = true;
    if (air.trickArmed) events.trickTier = air.big ? 2 : 1;
    air.spin = 0;
    air.trickArmed = false;
  }
  air.wasAction = actionHeld;
  return events;
};
