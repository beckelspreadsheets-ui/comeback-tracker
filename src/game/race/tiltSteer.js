// Tilt (gyro) steering maths, kept pure so it can be tested without a phone.
//
// The steering angle is how far the phone's long edge is lifted off level,
// like turning a wheel. The browser reports it as `beta`, but with the phone
// held nearly upright in landscape the Euler angles hit their singularity:
// beta jumps from, say, 10 to 170 for the same physical pose. Read raw, that
// jump slammed the steering to full lock (owner 2026-11-12, first phone test:
// "it turned way too fast with the tilt"). sin(beta) is the same either side
// of the jump, so folding beta back into -90..90 removes it.

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const TILT_DEAD_DEG = 4;
export const TILT_LOCK_DEG = 36;
export const TILT_CURVE = 1.5;
export const TILT_SMOOTH_MS = 70;

export const foldBeta = (beta) => {
  const value = Number.isFinite(beta) ? beta : 0;
  if (value > 90) return 180 - value;
  if (value < -90) return -180 - value;
  return value;
};

// Degrees of wheel turn, positive = steer right.
// angle: screen.orientation.angle (0 portrait, 90 / 270 landscape).
// soft: the web soft-landscape lock (OS reports portrait, phone is held
// landscape), where gamma's sign says which way round it is held.
export const tiltRoll = ({ angle = 0, beta = 0, gamma = 0, soft = false } = {}) => {
  const wheel = foldBeta(beta);
  if (soft) return wheel * (gamma >= 0 ? 1 : -1);
  if (angle === 90) return wheel;
  if (angle === 270 || angle === -90) return -wheel;
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
