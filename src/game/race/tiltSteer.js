// Tilt (gyro) steering maths, kept pure so it can be tested without a phone.
//
// The steering angle is how far the phone is turned like a wheel: rotation
// about the line coming straight out of the screen.
//
// Two things went wrong reading that from the browser's Euler angles:
//
// 1. With the phone held nearly upright in landscape the angles hit their
//    singularity: beta jumps from, say, 10 to 170 for the same physical pose.
//    Read raw, that jump slammed the steering to full lock (owner 2026-11-12,
//    first phone test: "it turned way too fast with the tilt").
// 2. beta alone is how far the long edge is lifted off level, and that is the
//    wheel angle only while the screen is vertical. Nobody holds a phone like
//    that: leaned back 50 degrees, a 25 degree wheel turn reads as 16. With
//    the gentle curve of the time that was about a sixth of full steer
//    (owner 2026-11-25, on the phone: "the tilt barely works to control the
//    cart even at 50CC").
//
// Both go away by working from where "up" points in the phone's own frame
// (sin and cos of the angles, which do not jump), and measuring the wheel
// angle inside the screen plane, so leaning the phone back changes nothing.

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Full lock at 30 degrees of wheel, a 3 degree dead zone, and a mild curve: a
// 15 degree turn is about a third of full steer, 20 degrees a little over
// half. (36 / 4 / 1.5 before 2026-11-25, tuned against the under-read above.)
export const TILT_DEAD_DEG = 3;
export const TILT_LOCK_DEG = 30;
export const TILT_CURVE = 1.3;
export const TILT_SMOOTH_MS = 70;

export const foldBeta = (beta) => {
  const value = Number.isFinite(beta) ? beta : 0;
  if (value > 90) return 180 - value;
  if (value < -90) return -180 - value;
  return value;
};

const RAD = Math.PI / 180;

// Degrees the phone is turned like a wheel, always the same sign as the lift
// of its long edge (foldBeta). "Up" in the phone's frame is
// (-cos(beta) sin(gamma), sin(beta), cos(beta) cos(gamma)): x across the
// short edge, y along the long edge, z out of the screen. The wheel angle is
// the angle of its x-y part. That is only the right reading while the phone
// is held up like a wheel. Held nearly flat (screen to the sky) people steer
// by dipping one end instead, and there the plain lift of the long edge IS
// the tilt, while the x-y angle would call a 15 degree dip full lock. `across`
// says which it is: it is large while the short edge points up and near zero
// when the phone is flat, so the reading fades from wheel to lift with it
// (all wheel up to about 60 degrees of lean, all lift past about 78).
export const wheelAngle = (beta, gamma) => {
  const b = (Number.isFinite(beta) ? beta : 0) * RAD;
  const g = (Number.isFinite(gamma) ? gamma : 0) * RAD;
  const across = Math.abs(Math.cos(b) * Math.sin(g));
  const along = Math.sin(b);
  const trust = clamp((across - 0.2) / 0.2, 0, 1);
  const lift = Math.asin(clamp(along, -1, 1)) / RAD;
  const wheel = Math.atan2(along, across) / RAD;
  return lift + (wheel - lift) * trust;
};

// Degrees of wheel turn, positive = steer right.
// angle: screen.orientation.angle (0 portrait, 90 / 270 landscape).
// soft: the web soft-landscape lock (OS reports portrait, phone is held
// landscape), where gamma's sign says which way round it is held.
export const tiltRoll = ({ angle = 0, beta = 0, gamma = 0, soft = false } = {}) => {
  if (soft) return wheelAngle(beta, gamma) * (gamma >= 0 ? 1 : -1);
  if (angle === 90) return wheelAngle(beta, gamma);
  if (angle === 270 || angle === -90) return -wheelAngle(beta, gamma);
  return Number.isFinite(gamma) ? gamma : 0;
};

// Roll in degrees to a -1..1 steer axis: nothing inside the dead zone, then a
// smooth curve so small tilts steer gently, full lock at TILT_LOCK_DEG.
export const tiltAxis = (roll, { curve = TILT_CURVE, dead = TILT_DEAD_DEG, lock = TILT_LOCK_DEG } = {}) => {
  const mag = clamp((Math.abs(roll) - dead) / (lock - dead), 0, 1);
  return mag === 0 ? 0 : Math.sign(roll) * Math.pow(mag, curve);
};

// Low-pass between sensor readings so hand shake does not reach the wheels.
export const smoothTiltAxis = (previous, next, dtMs, tauMs = TILT_SMOOTH_MS) => {
  if (!Number.isFinite(previous) || !(dtMs > 0)) return next;
  const blend = 1 - Math.exp(-dtMs / tauMs);
  return previous + (next - previous) * blend;
};
