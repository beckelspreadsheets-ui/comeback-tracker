// Classic handling — the harder driving model behind the Handling setting.
//
// Assisted (the shipped game) puts the kart on rails: steering moves it across
// the lane and the road carries it round every bend. Measured on the shipped
// tracks, a kart that never steers at all still finishes every lap. Classic
// gives the kart a real nose and real momentum (the free-body path, P2-P6 of
// docs/FREE_BODY_PLAN.md) plus the rules that make Mario Kart 64 demanding:
//
//   - the further you push the stick, the sharper it turns (quadratic), so
//     small corrections are small;
//   - grip runs out at speed: full lock at top speed asks for more cornering
//     force than the tyres have, so the kart washes wide and the slip costs
//     thrust;
//   - thrust fades toward top speed, so every drag — turning, sliding, the
//     run-off — costs top speed instead of being absorbed by a hard cap;
//   - the run-off between the kerb and the barrier is slow (top speed x0.71);
//   - the barrier is a wall: the speed you carry into it bounces back at half
//     strength and a real hit ends a power slide;
//   - the power slide is the controlled way round a corner tighter than grip
//     allows, and it costs speed that the mini-turbo pays back.
//
// Written from a plain-language description of how MK64 behaves
// (docs/CLASSIC_HANDLING.md), not from its code, and tuned in this game's own
// units against these tracks' measured corners (centreline radii 48-147 u,
// road half-width 18-28 u, barrier ~12 u past the road edge).
//
// STEERING SIGN. Positive steer is the player's RIGHT, which on screen is the
// spline normal's +side (the rails path moves lane +). That means positive
// steer DEcreases heading here. stepFreeBody (the August P2 model, still behind
// ?freebody=1) increases it, so a player pressing right there turns left; this
// model does not inherit that.
//
// Pure: no Three.js, no DOM. scripts/test-classic-handling.mjs drives every
// track with it in node.

export const HANDLING_MODES = Object.freeze(['assisted', 'mk64', 'mix']);
export const isClassicHandling = (mode) => mode === 'mk64' || mode === 'mix';

export const CLASSIC = Object.freeze({
  // --- speed ---------------------------------------------------------------
  // Thrust from a standstill, u/s^2 (x kart accel stat). It fades as
  // (1 - (v/top)^2), so 0 -> 95% of top takes ~2.8 s (rails: 1.9 s to the
  // cap and no tail). The tail is the point: a drag of D u/s^2 now settles
  // the kart at sqrt(1 - D/150) of top speed.
  accel: 150,
  // Off the throttle.
  coastDrag: 55,
  // Full brake. From top speed to a crawl in ~1.2 s.
  brakeDecel: 190,
  // Steering scrub, u/s^2 per unit of speed at full lock (scaled by steer^2):
  // ~25 at top speed, which settles a kart held at full lock ~8% slower.
  turnDrag: 0.11,
  // While power sliding: settles ~10% slower. The mini-turbo pays it back.
  slideDrag: 30,
  // Thrust lost per radian of slip (~1% per degree), floored so a wild slide
  // still pulls.
  slipThrustLoss: 0.6,
  minSlipThrust: 0.4,
  // The run-off: settles the kart at ~71% of top speed.
  vergeDrag: 75,
  // Spun out.
  spinDrag: 150,
  // Above the cap (a boost ending, a kick on top of top speed) the excess
  // bleeds off at this rate per second rather than snapping to the cap.
  overCapBleed: 2.5,

  // --- steering ------------------------------------------------------------
  // Yaw at full lock: yawLow at a crawl, easing to yawTop at yawTopSpeed
  // (1.55 rad/s ~ 89 deg/s, MK64's full-lock rate). Never tighter than
  // minTurnRadius, which is what stops a parked kart spinning on the spot.
  yawLow: 2.6,
  yawTop: 1.55,
  yawTopSpeed: 228,
  minTurnRadius: 16,
  // At a crawl the kart can still pivot, up to this rate at a standstill and
  // fading out by pivotSpeed. There is no reverse gear, so without it a kart
  // stopped nose-first against a wall could never turn away (found driving
  // the real race with keys, 2026-10-26).
  pivotYaw: 1.4,
  pivotSpeed: 40,
  // yaw = |stick|^steerExponent: half stick is a quarter of the turn.
  steerExponent: 2,
  // Cornering force the tyres hold, u/s^2. Full lock at top speed asks
  // 228 x 1.55 = 353, so it washes wide; ~80% lock at top speed holds.
  // Grip-limited radius at top speed: 228^2 / 280 = 186 u.
  grip: 280,
  // The nose can lead the travel direction by at most this much outside a
  // power slide, so steering alone can never spin the kart.
  maxSlip: 0.35,
  // On the run-off the tyres hold this fraction of `grip`.
  vergeGrip: 0.6,

  // --- power slide -----------------------------------------------------------
  // How fast the slide swings the kart's travel direction, rad/s, by where
  // the stick is: pushed into the corner, centred, pushed out of it. At a
  // slide's ~205 u/s full inward is a ~98 u radius — the tight corners — and
  // pushed out is a gentle ~450 u arc for straightening.
  slideYawIn: 2.1,
  slideYawCentre: 0.95,
  slideYawOut: 0.45,
  // The nose's angle off the travel direction in a slide (inward / centred /
  // outward) and how fast it swings to it.
  slideNoseIn: 0.5,
  slideNoseCentre: 0.36,
  slideNoseOut: 0.22,
  slideNoseRate: 4,

  // --- surfaces and walls ----------------------------------------------------
  // The raised kerb past the road edge drives like road; past it is run-off.
  kerbFreeWidth: 4.8,
  // Half the kart's width: the body touches the barrier this far before its
  // centre would.
  kartHalfWidth: 4.5,
  // The speed carried INTO the wall comes back out at this fraction.
  wallRestitution: 0.5,
  // Friction along the wall, as a share of the push into it: the speed along
  // the wall drops by wallFriction x (1 + restitution) x the speed into it.
  // An 8-degree kiss at top speed keeps ~84%, a 20-degree hit ~58%, a square
  // one stops you. Scaled by the push rather than charged per frame, so a
  // kart grinding along a wall pays for the grind (~300 u/s^2 while it steers
  // into it), not a fixed share of its speed every frame.
  wallFriction: 0.7,
  // Hits squarer than this (~11.5 degrees) and faster than wallHitSpeed into
  // the wall end a power slide and stun; a shallower or slower touch only
  // scrubs speed (a kart resting on the wall must not re-stun every frame).
  wallHitImpact: 0.2,
  wallHitSpeed: 30,
  wallStun: 0.18,

  // --- mistakes --------------------------------------------------------------
  // A spin-out keeps 35% of your speed, lasts 1.4 s and never drops you below a
  // crawl: ~2.1 s lost at top speed, against Assisted's ~1.3 s (x0.5, 0.95 s,
  // floor 46). Measured in scratch sims against classicSpeedStep.
  spinDuration: 1.4,
  spinSpeedScale: 0.35,
  spinFloor: 25,
  // No kart contact for this long after a spin (Assisted: 2.4 s).
  contactImmunity: 1.2,
  // MK64's banana, on our fish bone: running over one wobbles you first, and
  // touching the brake before the wobble runs out saves the spin for a small
  // speed cost. Steering hard when you hit it (past slipHardSteer) means no
  // wobble, straight into the spin.
  slipWobble: 0.55,
  slipSaveSpeedScale: 0.85,
  slipHardSteer: 0.6,
});

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const lerp = (a, b, t) => a + (b - a) * t;

export const wrapAngle = (angle) => {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

// Yaw rate at full lock, rad/s, at `speed` u/s.
export const classicFullLockYaw = (speed) => {
  const v = Math.abs(speed);
  const bySpeed = lerp(CLASSIC.yawLow, CLASSIC.yawTop, clamp(v / CLASSIC.yawTopSpeed, 0, 1));
  const pivot = CLASSIC.pivotYaw * Math.max(0, 1 - v / CLASSIC.pivotSpeed);
  return Math.max(pivot, Math.min(v / CLASSIC.minTurnRadius, bySpeed));
};

// The most the kart can turn its travel direction without sliding, rad/s:
// what the stick asks at full lock, or what the tyres hold, whichever is less.
export const classicGripYaw = (speed, gripScale = 1) => {
  const v = Math.max(Math.abs(speed), 1e-3);
  return Math.min(classicFullLockYaw(v), (CLASSIC.grip * gripScale) / v);
};

// Travel-direction swing in a power slide, rad/s. `inward` is the stick along
// the slide: +1 pushed into the corner, 0 centred, -1 pushed out of it.
export const classicSlideYaw = (inward, speed) => {
  const i = clamp(inward, -1, 1);
  const rate = i >= 0 ? lerp(CLASSIC.slideYawCentre, CLASSIC.slideYawIn, i) : lerp(CLASSIC.slideYawCentre, CLASSIC.slideYawOut, -i);
  return Math.min(rate, Math.abs(speed) / CLASSIC.minTurnRadius);
};

const slideNoseAngle = (inward) => {
  const i = clamp(inward, -1, 1);
  return i >= 0 ? lerp(CLASSIC.slideNoseCentre, CLASSIC.slideNoseIn, i) : lerp(CLASSIC.slideNoseCentre, CLASSIC.slideNoseOut, -i);
};

// World velocity from the free-body state, in stepFreeBody's frame: forward
// along (sin h, cos h), lateralVel along (cos h, -sin h).
export const classicWorldVelocity = (body, speed) => {
  const fx = Math.sin(body.heading);
  const fz = Math.cos(body.heading);
  return { x: fx * speed + fz * body.lateralVel, z: fz * speed - fx * body.lateralVel };
};

// The inverse: stores the sideways part on the body and returns the forward part.
const storeWorldVelocity = (body, vx, vz) => {
  const fx = Math.sin(body.heading);
  const fz = Math.cos(body.heading);
  body.lateralVel = vx * fz - vz * fx;
  return vx * fx + vz * fz;
};

// One frame of forward speed. Returns the new speed (never negative: the kart
// has no reverse gear).
export const classicSpeedStep = (
  speed,
  {
    dt = 0,
    throttle = false,
    brake = false,
    steer = 0,
    slip = 0,
    sliding = false,
    verge = false,
    top = CLASSIC.yawTopSpeed,
    boostTop = top,
    boosting = false,
    boostAccel = 0,
    accelStat = 1,
    spinning = false,
    stunned = false,
  } = {}
) => {
  if (!(dt > 0)) return speed;
  const cap = boosting ? Math.max(top, boostTop) : top;
  let accel = 0;
  if (spinning) accel -= CLASSIC.spinDrag;
  else if (throttle && !stunned) {
    const x = Math.max(0, speed) / Math.max(1, cap);
    const thrust = CLASSIC.accel * accelStat * Math.max(0, 1 - x * x);
    accel += thrust * Math.max(CLASSIC.minSlipThrust, 1 - CLASSIC.slipThrustLoss * Math.abs(slip));
  } else if (!throttle) accel -= CLASSIC.coastDrag;
  if (boosting) accel += boostAccel;
  if (brake) accel -= CLASSIC.brakeDecel;
  if (sliding) accel -= CLASSIC.slideDrag;
  else accel -= CLASSIC.turnDrag * Math.max(0, speed) * steer * steer;
  if (verge) accel -= CLASSIC.vergeDrag;
  let next = speed + accel * dt;
  if (next > cap) next = Math.max(cap, next - (next - cap) * Math.min(1, CLASSIC.overCapBleed * dt));
  return Math.max(0, next);
};

// One frame of steering and motion. Mutates body (x, z, heading, lateralVel)
// and returns { speed, slip }: the new forward speed and the nose's angle off
// the travel direction (positive = nose to the left of travel).
//
// slideDir is the power slide's side, +1 right / -1 left, 0 when not sliding.
// authority scales the stick (0 in the air, low when spun out). gripScale is
// the surface's share of the tyres' grip; 0 in the air, where nothing turns
// the kart's momentum.
export const stepClassicBody = (
  body,
  { dt = 0, speed = 0, steer = 0, handling = 1, authority = 1, gripScale = 1, slideDir = 0 } = {}
) => {
  if (!(dt > 0)) return { slip: 0, speed };
  const velocity = classicWorldVelocity(body, speed);
  let vx = velocity.x;
  let vz = velocity.z;
  const magnitude = Math.hypot(vx, vz);
  let travel = magnitude > 1e-3 ? Math.atan2(vx, vz) : body.heading;

  if (slideDir !== 0 && authority > 0) {
    // POWER SLIDE: the slide owns the arc. The travel direction swings at the
    // slide's own rate, which is how the kart gets round a corner tighter than
    // grip alone allows; the nose leads it into the corner.
    const inward = clamp(steer * slideDir, -1, 1);
    travel -= slideDir * classicSlideYaw(inward, magnitude) * authority * dt;
    const targetNose = travel - slideDir * slideNoseAngle(inward);
    const error = wrapAngle(targetNose - body.heading);
    body.heading += clamp(error, -CLASSIC.slideNoseRate * dt, CLASSIC.slideNoseRate * dt);
  } else {
    const stick = clamp(steer, -1, 1) * authority;
    const yaw = Math.sign(stick) * Math.abs(stick) ** CLASSIC.steerExponent * classicFullLockYaw(magnitude) * handling;
    body.heading -= yaw * dt;
    // Grip swings the travel direction toward the nose, but only as far as
    // the cornering force allows. Asking for more than that leaves the nose
    // pointing inside the kart's actual path: it washes wide.
    if (magnitude > 1e-3) {
      const maxSwing = ((CLASSIC.grip * gripScale) / magnitude) * dt;
      travel += clamp(wrapAngle(body.heading - travel), -maxSwing, maxSwing);
      const slip = wrapAngle(body.heading - travel);
      if (Math.abs(slip) > CLASSIC.maxSlip) body.heading = travel + Math.sign(slip) * CLASSIC.maxSlip;
    }
  }
  body.heading = wrapAngle(body.heading);
  vx = Math.sin(travel) * magnitude;
  vz = Math.cos(travel) * magnitude;
  const forward = storeWorldVelocity(body, vx, vz);
  body.x += vx * dt;
  body.z += vz * dt;
  return { slip: wrapAngle(body.heading - travel), speed: Math.max(0, forward) };
};

// Which surface the kart's centre is on, from its signed distance off the
// centreline and the road's half-width there.
export const classicSurfaceAt = (distance, roadHalfWidth) => {
  const out = Math.abs(distance) - roadHalfWidth;
  if (out <= 0) return 'road';
  return out <= CLASSIC.kerbFreeWidth ? 'kerb' : 'verge';
};

// Resolves contact with the barrier on the side the kart is on. `distance`
// and `normal` come from the spline projection; `barrierOffset` is how far the
// barrier's inner face sits from the centreline there. Mutates the body's
// position and sideways velocity; returns the new forward speed and what
// happened: impact is the sine of the hit angle (0 glancing, 1 head-on).
export const classicWallStep = (body, { speed = 0, distance = 0, normal = { x: 0, z: 0 }, barrierOffset = Infinity } = {}) => {
  const limit = barrierOffset - CLASSIC.kartHalfWidth;
  const over = Math.abs(distance) - limit;
  if (!(over > 0)) return { contact: false, hit: false, impact: 0, speed };
  const side = Math.sign(distance) || 1;
  const nx = normal.x * side;
  const nz = normal.z * side;
  body.x -= nx * over;
  body.z -= nz * over;
  const velocity = classicWorldVelocity(body, speed);
  const magnitude = Math.hypot(velocity.x, velocity.z);
  const into = velocity.x * nx + velocity.z * nz;
  if (!(into > 0)) return { contact: true, hit: false, impact: 0, speed };
  const impact = into / Math.max(1, magnitude);
  const tx = velocity.x - into * nx;
  const tz = velocity.z - into * nz;
  const along = Math.hypot(tx, tz);
  const friction = Math.min(along, CLASSIC.wallFriction * (1 + CLASSIC.wallRestitution) * into);
  const keepAlong = along > 1e-6 ? (along - friction) / along : 0;
  const vx = tx * keepAlong - CLASSIC.wallRestitution * into * nx;
  const vz = tz * keepAlong - CLASSIC.wallRestitution * into * nz;
  const forward = storeWorldVelocity(body, vx, vz);
  return {
    contact: true,
    hit: impact > CLASSIC.wallHitImpact && into > CLASSIC.wallHitSpeed,
    impact,
    speed: Math.max(0, forward),
  };
};

// RIVALS on Classic (docs/CLASSIC_HANDLING.md step 5). The class sets the
// speed of the whole field, the player's included (raceClasses.js
// classicSpeed). `pace` trims the field against what a Classic driver can do,
// which is less than the rails let anyone do (measured with the difficulty
// probe). The band is MK64's idea in our numbers: a rival that falls behind
// you chases hard, and one well clear eases off; on Assisted the band only
// wakes up 3 s back.
export const CLASSIC_RIVALS = Object.freeze({
  pace: 1,
  rubberBand: Object.freeze({
    aheadMaxSeconds: 6,
    behindMaxSeconds: 1.5,
    catchUpBoost: 1.09,
    finalLapCatchUp: 1.09,
    slowDown: 0.98,
  }),
});

// Classic Mix only: ideas from the owner's decomp list that are not MK64's.
// Air rules (timed tricks, hang time) live in airTricks.js MIX_AIR.
export const MIX = Object.freeze({
  // Diddy Kong Racing / Super Mario Kart: a spin-out spills coins, and coins
  // are top speed (coinSpeedMultiplier) and the money at the finish, so one
  // mistake keeps costing.
  coinsLostPerHit: 3,
});

// Per-race Classic state on `race.classic` (null on Assisted).
export const createClassicState = () => ({
  // Seconds since the last real wall hit, counting down: no thrust while > 0.
  stun: 0,
  // The nose's angle off the travel direction, from the last step.
  slip: 0,
  // On the run-off this frame (set after the wall pass, read next frame).
  verge: false,
  wallContact: false,
  wallHits: 0,
  // Mini-turbos banked and Classic Mix backfires, for telemetry and probes.
  turbos: 0,
  backfires: 0,
  // Seconds left in a fish-bone wobble (brake to save); saves made.
  slipTimer: 0,
  saves: 0,
  // Classic Mix: hang-time boosts landed, coins spilled by hits.
  hangBoosts: 0,
  coinsLost: 0,
});

// The barrier's inner face, in world units from the centreline, by progress —
// read off the same rings the barrier mesh is extruded from, so the wall the
// kart hits is the wall the player sees. frames: [{ progress, width, section }]
// sorted by progress, where section is roadEdgeSection's output (index 7 is
// the inner face, measured out from the road edge at width * 0.44).
export const makeBarrierOffsetLookup = (frames) => {
  const progress = Float64Array.from(frames, (frame) => frame.progress);
  const offset = Float64Array.from(frames, (frame) => frame.width * 0.44 + frame.section[7].u);
  const count = progress.length;
  return (p) => {
    const q = p - Math.floor(p);
    let lo = 0;
    let hi = count - 1;
    if (q <= progress[0]) return offset[0];
    if (q >= progress[hi]) return offset[hi];
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (progress[mid] <= q) lo = mid;
      else hi = mid;
    }
    const span = progress[hi] - progress[lo];
    return span > 0 ? offset[lo] + ((offset[hi] - offset[lo]) * (q - progress[lo])) / span : offset[lo];
  };
};

// One frame of the fish-bone wobble on race.classic. Returns 'saved' when the
// brake catches it, 'spin' when the wobble runs out, else null.
export const classicSlipStep = (classic, { dt = 0, brake = false } = {}) => {
  if (!(classic.slipTimer > 0)) return null;
  classic.slipTimer = Math.max(0, classic.slipTimer - dt);
  if (brake) {
    classic.slipTimer = 0;
    classic.saves += 1;
    return 'saved';
  }
  return classic.slipTimer <= 0 ? 'spin' : null;
};
