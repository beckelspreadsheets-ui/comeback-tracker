// Project a world position back onto the track spline.
//
// P1 of docs/FREE_BODY_PLAN.md. Free-body makes WORLD POSITION authoritative for
// the player, but every other system in the race — rival AI, projectile
// targeting, coin rows, crosser hits, lap counting, the camera — speaks
// `progress` + `lane`. So the player's world position is projected back onto the
// spline every frame and those two numbers become derived rather than driven.
// That is what lets the player go free-body while rivals stay on rails and every
// item and hazard keeps working untouched.
//
// This lives in its own pure module rather than inside the monolith's sampler
// because scripts/track-layout-preview.mjs needs the same function and the
// monolith cannot be imported in node. The last time geometry was duplicated
// between those two files it drifted for two waves and produced a corner defect
// that did not exist — see the mirror check in the previewer.
//
// Three.js-free by contract: takes anything with getPointAt/getTangentAt.

const wrap01 = (value) => ((value % 1) + 1) % 1;

// Coarse samples across the search window, then a ternary refine.
const COARSE_STEPS = 24;
const REFINE_ITERATIONS = 18;

// Default half-window, in progress units. At 245 u/s and 60 fps the kart travels
// ~4 units a frame — about 0.00035 of an 11.6k lap — so 0.02 is ~57 frames of
// headroom and still narrow enough to never jump the road to itself.
export const DEFAULT_PROJECTION_WINDOW = 0.02;

// LOCAL SEARCH, NOT GLOBAL, and that is a correctness property rather than an
// optimisation. Both shipped tracks pass close to themselves — Comeback City's
// twin hairpins, Penguin Village's shore — and a global nearest-point search
// snaps to whichever pass is momentarily closer, which teleports progress
// across half a lap and fires a spurious lap count. Searching a window around
// last frame's answer cannot do that.
export const projectToSpline = (
  curve,
  widthAt,
  worldX,
  worldZ,
  hint = 0,
  window = DEFAULT_PROJECTION_WINDOW
) => {
  const sqDistanceAt = (p) => {
    const c = curve.getPointAt(wrap01(p));
    const dx = worldX - c.x;
    const dz = worldZ - c.z;
    return dx * dx + dz * dz;
  };

  let best = hint;
  let bestDistance = Infinity;
  for (let i = 0; i <= COARSE_STEPS; i += 1) {
    const p = hint - window + (2 * window * i) / COARSE_STEPS;
    const d = sqDistanceAt(p);
    if (d < bestDistance) {
      bestDistance = d;
      best = p;
    }
  }

  const step = (2 * window) / COARSE_STEPS;
  let lo = best - step;
  let hi = best + step;
  for (let i = 0; i < REFINE_ITERATIONS; i += 1) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    if (sqDistanceAt(m1) < sqDistanceAt(m2)) hi = m2;
    else lo = m1;
  }

  const progress = wrap01((lo + hi) / 2);
  const center = curve.getPointAt(progress);
  const tangent = curve.getTangentAt(progress);
  // Flatten to the driving plane. Lane is a ground-plane quantity; leaving the
  // tangent's Y in would tilt the normal on the bridge and skew lane there.
  const tangentLength = Math.hypot(tangent.x, tangent.z) || 1;
  const tx = tangent.x / tangentLength;
  const tz = tangent.z / tangentLength;
  const nx = -tz;
  const nz = tx;

  // Signed lane, divided by the same half-width pointAt multiplies by, so that
  // projectToSpline(pointAt(p, l)) round-trips to (p, l). That identity is what
  // scripts/test-spline-projection.mjs asserts.
  const signedDistance = (worldX - center.x) * nx + (worldZ - center.z) * nz;
  const half = widthAt(progress) * 0.44;

  return {
    distance: signedDistance,
    lane: half > 1e-6 ? signedDistance / half : 0,
    normal: { x: nx, z: nz },
    progress,
    tangent: { x: tx, z: tz },
  };
};
