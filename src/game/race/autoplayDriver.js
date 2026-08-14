// Free-body autoplay — the demo driver for `?freebody=1`.
//
// The rails autoplay steers in LANE SPACE: its output is "move the lane number
// left/right", which the rails integrate directly. A free body has no lane to
// move — steering rotates a heading — so feeding it the lane policy produced
// the rescue loop the difficulty probe measured (0.19 laps in 190s). This is
// the heading-space policy: pure pursuit of a point on the spline ahead.
//
// Pure module, same contract as freeBodyKart.js: no THREE, no DOM, testable in
// node — which scripts/test-autoplay.mjs does against the previewer sampler on
// both tracks. The monolith passes its own sampler; both samplers' pointAt
// shapes are accepted ({point:{x,z}} or bare {x,z}).
//
// Geometry: heading 0 faces +Z and grows toward +X (freeBodyKart.js), so the
// signed steering error is headingErrorTo(heading, dx, dz). Pure pursuit gives
// the required arc curvature to the target as k = 2*sin(err)/dist, hence a
// required yaw rate w = speed * k; comparing that against yawRateFor(1, speed)
// — the most the tyres/wheels can deliver — is the brake/drift decision. The
// far probe looks twice as deep so braking starts before the corner, not in it.
import { FREE_BODY, headingErrorTo, yawRateFor } from './freeBodyKart.js';

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export const AUTOPLAY_PURSUIT = {
  // Lookahead is a DISTANCE (world units), speed-scaled — the same lesson the
  // dodge windows learned at wave 8: a reaction distance is a distance. The
  // test-off-road controller's 0.006-of-a-lap only worked at one track size.
  lookaheadSeconds: 0.3,
  minLookaheadUnits: 26,
  maxLookaheadUnits: 96,
  // Proven by test-off-road case 6: err * 2.2 laps both tracks clean.
  steerGain: 2.2,
  // Brake when the far probe demands more yaw than full lock can deliver;
  // drift earlier (0.62 of the limit) so the demo uses the mechanic the way a
  // player would, and never below the drift-engage speed.
  brakeMargin: 1,
  driftMargin: 0.62,
  driftMinSpeed: 80,
};

// The freebody twin of the rails apex rule (readInput's `apexLane`): inside of
// the corner is -sign(cornerPush), 0.45 keeps the demo the conservative driver.
export const autoplayApexLane = (cornerPush) => clamp(-cornerPush * 0.5, -1, 1) * 0.45;

export const freeBodyAutoplayInput = ({
  pointAt,
  trackLength,
  freeBody,
  speed,
  progress,
  targetLane = 0,
  cornerPush = 0,
  heldItem = false,
  airborne = false,
  handling = 1,
  offRoad = false,
}) => {
  const gripScale = offRoad ? FREE_BODY.offRoadGripScale : 1;
  const lookUnits = clamp(
    AUTOPLAY_PURSUIT.lookaheadSeconds * Math.max(speed, 80),
    AUTOPLAY_PURSUIT.minLookaheadUnits,
    AUTOPLAY_PURSUIT.maxLookaheadUnits
  );
  const errTo = (aheadUnits, lane) => {
    const raw = pointAt(progress + aheadUnits / Math.max(1, trackLength), lane);
    const target = raw.point ?? raw;
    const dx = target.x - freeBody.x;
    const dz = target.z - freeBody.z;
    return { dist: Math.max(1, Math.hypot(dx, dz)), err: headingErrorTo(freeBody.heading, dx, dz) };
  };
  const near = errTo(lookUnits, targetLane);
  const far = errTo(lookUnits * 2, targetLane);

  const steerAxis = clamp(near.err * AUTOPLAY_PURSUIT.steerGain, -1, 1);
  // Required yaw rate to make each probe, against the most the kart can do.
  const requiredYaw = (probe) => Math.abs(((2 * Math.sin(probe.err)) / probe.dist) * speed);
  const achievableYaw = Math.abs(yawRateFor(1, speed, { gripScale, handling }));
  const demand = Math.max(requiredYaw(near), requiredYaw(far));
  const brake = demand > achievableYaw * AUTOPLAY_PURSUIT.brakeMargin && speed > 60;
  const drift =
    (demand > achievableYaw * AUTOPLAY_PURSUIT.driftMargin && speed > AUTOPLAY_PURSUIT.driftMinSpeed) ||
    airborne;

  return {
    brake,
    drift,
    // Same item timing as the rails policy: fire held items on straights.
    item: heldItem && Math.abs(cornerPush) < 0.3,
    left: steerAxis < -0.12,
    restart: false,
    right: steerAxis > 0.12,
    steerAxis,
    throttle: true,
  };
};
