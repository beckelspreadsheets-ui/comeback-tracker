// Free-body kart motion — P2 of docs/FREE_BODY_PLAN.md.
//
// On rails, steering moved `lane` and the kart's yaw was cosmetic. Here the kart
// has a real heading and a real world position, steering rotates it, and
// `progress`/`lane` become a projection of where it ended up. That is what makes
// turning around, going off-map and pit manoeuvres possible at all.
//
// Pure: no Three.js, no DOM, no track object. Callers pass scalars and get
// scalars, so this is testable in node — which scripts/test-free-body.mjs does.
//
// YAW RATE IS THE WHOLE FEEL, so it is modelled rather than tuned by feel:
//
//   steering-limited   w = v * tan(steer * MAX_STEER_ANGLE) / WHEELBASE
//   grip-limited       w = MAX_LATERAL_ACCEL / v
//   actual             w = sign(steer) * min(the two)
//
// Below the crossover the kart turns as sharply as the wheels are pointed; above
// it the tyres cannot hold the corner and the radius opens out. That single
// crossover is why this is "harder to drive overall" — you cannot simply hold
// full lock at 250 km/h any more, which on rails you effectively could.
//
// Sanity of the constants against the shipped tracks: at 245 u/s the grip limit
// gives w = 700/245 = 2.86 rad/s, i.e. a minimum radius of 86 units. Penguin
// Village's tightest authored corner is 94.7 and Comeback City's is 107.5, so
// both remain drivable flat — but only just, and only on a clean line.

export const FREE_BODY = {
  // Radians of road wheel at full stick.
  maxSteerAngle: 0.6,
  // World units between axles. With maxSteerAngle this sets the low-speed
  // turning circle: ~20 units of radius at 60 u/s.
  wheelbase: 14,
  // Lateral acceleration the tyres can hold, world units/s^2. The single most
  // feel-defining number here — raise it and corners tighten everywhere.
  maxLateralAccel: 700,
  // Fraction of sideways velocity killed per second when gripping. Below 1 the
  // kart washes wide on turn-in, which is what makes weight transfer readable.
  lateralGrip: 12,
  // Same, while drifting — deliberately much lower so the back steps out and
  // the kart carries a slip angle.
  lateralGripDrifting: 3.2,
  // Off-road multiplier applied to both grip terms (P5 consumes this).
  offRoadGripScale: 0.45,
};

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// Yaw rate in rad/s for a given steer input and speed. Exported because the
// wrong-way indicator and the tests both want it without running a step.
export const yawRateFor = (steer, speed, { handling = 1, gripScale = 1 } = {}) => {
  const v = Math.max(Math.abs(speed), 1e-3);
  const steerAngle = clamp(steer, -1, 1) * FREE_BODY.maxSteerAngle;
  const steeringLimited = (v * Math.tan(steerAngle)) / FREE_BODY.wheelbase;
  const gripLimited = (FREE_BODY.maxLateralAccel * handling * gripScale) / v;
  const magnitude = Math.min(Math.abs(steeringLimited), gripLimited);
  return Math.sign(steerAngle) * magnitude;
};

export const createFreeBody = ({ x = 0, z = 0, heading = 0 } = {}) => ({
  heading,
  // Sideways velocity in the kart's own frame. Forward speed stays on the race
  // state as `race.speed` because every other system already reads it.
  lateralVel: 0,
  x,
  z,
});

// One integration step. `speed` is forward speed along the heading, owned by the
// caller's existing throttle/brake code — this does not touch it.
//
// Returns the body for chaining; mutates in place, like the rest of the sim.
export const stepFreeBody = (
  body,
  { dt = 0, steer = 0, speed = 0, handling = 1, drifting = false, offRoad = false, steerAuthority = 1 } = {}
) => {
  if (!(dt > 0)) return body;
  const gripScale = offRoad ? FREE_BODY.offRoadGripScale : 1;

  body.heading += yawRateFor(steer * steerAuthority, speed, { handling, gripScale }) * dt;
  // Keep heading in -PI..PI so the wrong-way dot product and any lerp on it stay
  // well conditioned over a long race.
  if (body.heading > Math.PI) body.heading -= Math.PI * 2;
  if (body.heading < -Math.PI) body.heading += Math.PI * 2;

  // Lateral velocity decays toward zero at the grip rate. Drifting decays far
  // slower, so the kart keeps a slip angle and the nose points inside the arc.
  const grip = (drifting ? FREE_BODY.lateralGripDrifting : FREE_BODY.lateralGrip) * gripScale;
  body.lateralVel -= body.lateralVel * Math.min(1, grip * dt);

  // World axes match the rest of the game: +Z is the forward reference, so
  // heading 0 points +Z and heading grows toward +X. This is the same
  // convention the crosser rigs use (atan2(x, z)).
  const forwardX = Math.sin(body.heading);
  const forwardZ = Math.cos(body.heading);
  const rightX = forwardZ;
  const rightZ = -forwardX;

  body.x += (forwardX * speed + rightX * body.lateralVel) * dt;
  body.z += (forwardZ * speed + rightZ * body.lateralVel) * dt;
  return body;
};

// Signed angle from the kart's heading to a world-space direction, in -PI..PI.
// Used by the TURN AROUND indicator (P4) against the spline tangent, and by the
// rescue (P5) to face the kart back down the road.
export const headingErrorTo = (heading, dirX, dirZ) => {
  const target = Math.atan2(dirX, dirZ);
  let delta = target - heading;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
};
