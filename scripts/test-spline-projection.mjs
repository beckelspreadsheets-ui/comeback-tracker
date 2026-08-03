// P1 exit criterion, docs/FREE_BODY_PLAN.md.
//
// projectToSpline is the inverse of pointAt. Free-body stakes everything on
// that: the player's world position is projected back each frame to produce the
// `progress` and `lane` that rival AI, projectile targeting, coin rows, crosser
// hits, lap counting and the camera all read. If the projection is even
// slightly wrong, every one of those goes subtly wrong at once, and it would be
// diagnosed as a physics bug three steps later.
//
// So the round-trip is asserted before anything depends on it:
//
//     projectToSpline(pointAt(p, lane))  ===  (p, lane)
//
// across a full lap of both shipped tracks, at every lane the player can reach.
//
//   node scripts/test-spline-projection.mjs
//
// Uses the previewer's sampler, which mirrors the monolith's and is checked
// against it by mirrorCheck() — the monolith itself cannot be loaded in node.
import { makeSampler, mirrorCheck } from './track-layout-preview.mjs';
import { projectToSpline, DEFAULT_PROJECTION_WINDOW } from '../src/game/race/splineProjection.js';
import { KART_TRACKS } from '../src/game/race/tracks/index.js';

const PROGRESS_TOLERANCE = 0.001;

// LANE TOLERANCE IS LANE-DEPENDENT, AND THAT IS GEOMETRY RATHER THAN A FUDGE.
//
// pointAt offsets along the normal at p by lane * widthAt(p) * 0.44. Projecting
// that point back finds the PERPENDICULAR FOOT, and for any centreline whose
// curvature or width is not locally constant, the foot of a far-offset point is
// not the parameter it was offset from. The gap grows with the offset.
//
// Measured on Penguin Village at p=0.4375 (local radius 2436u, half-width
// 20.3u), which is the worst case across both tracks:
//
//   lane 0.5   dprogress 1.1e-4   dlane 6.8e-4
//   lane 0.95  dprogress 2.8e-4   dlane 6.0e-3
//   lane 1.4   dprogress 4.0e-4   dlane 1.2e-2
//   lane 1.8   dprogress 5.2e-4   dlane 1.7e-2
//
// Linear in lane, bounded, and small in the units that matter: at lane 1.4 that
// is 4.6 units of progress out of an 11,144-unit lap, and 24 cm of lateral
// position on a road 40 m across.
//
// So it is held TIGHT on the road, where every hazard, coin row and rival
// interaction is resolved and correctness actually matters, and allowed to
// degrade off-road, where the only consumer is the off-road grip term and the
// rescue bound. If either number ever exceeds these, the projection has broken
// in a way this scaling does not explain.
const laneToleranceFor = (lane) => (Math.abs(lane) <= 1 ? 0.01 : 0.02);
// Lane -0.95..0.95 is what the rails clamp allows today; free-body will exceed
// it, so the round-trip is checked out to +/-1.4 — past the road edge, where
// off-road and the rescue will live.
const LANES = [-1.4, -0.95, -0.5, -0.1, 0, 0.1, 0.5, 0.95, 1.4];
const SAMPLES_PER_LAP = 400;

const mirror = mirrorCheck();
if (!mirror.pass) {
  process.stderr.write(
    'FAIL: the previewer sampler no longer mirrors the monolith, so this test is\n' +
      'not testing the shipped geometry. Fix that first.\n'
  );
  process.exit(1);
}

let failures = 0;
let worstProgress = 0;
let worstLane = 0;
let checks = 0;

for (const trackDef of KART_TRACKS) {
  const sampler = makeSampler(trackDef);
  let trackWorstProgress = 0;
  let trackWorstLane = 0;

  for (let i = 0; i < SAMPLES_PER_LAP; i += 1) {
    const progress = i / SAMPLES_PER_LAP;
    for (const lane of LANES) {
      const point = sampler.pointAt(progress, lane);
      // The hint is deliberately OFFSET from the true answer — a hint equal to
      // the answer would let a broken search pass by doing nothing. This is the
      // "a check that could not have failed is not a check" rule: the hint is
      // put half a window away so the search has to actually converge.
      const hint = progress - DEFAULT_PROJECTION_WINDOW * 0.5;
      const solved = projectToSpline(sampler.curve, sampler.widthAt, point.x, point.z, hint);

      // Wrapped difference — 0.999 and 0.001 are 0.002 apart, not 0.998.
      let dProgress = Math.abs(solved.progress - progress);
      if (dProgress > 0.5) dProgress = 1 - dProgress;
      const dLane = Math.abs(solved.lane - lane);
      const laneTolerance = laneToleranceFor(lane);

      // IS THE ANSWER ACTUALLY A LOCAL MINIMUM?
      //
      // The round-trip above cannot see this. Negative-testing found that
      // crippling the refine — leaving only the 24-step coarse pass — still
      // PASSED, because a coarse step of 0.00167 lands within half a step of
      // the truth and the progress tolerance is 0.001. The refine was doing
      // real work that no assertion covered, which is the same shape of hole as
      // a gate that duplicates the data it checks.
      //
      // So the solver is tested on its own terms: nudge the answer either way
      // and the squared distance must not improve. A coarse-only result fails
      // this immediately; a converged one cannot.
      const sqDistAt = (q) => {
        const c = sampler.curve.getPointAt(((q % 1) + 1) % 1);
        return (point.x - c.x) ** 2 + (point.z - c.z) ** 2;
      };
      const here = sqDistAt(solved.progress);
      const nudge = 2e-4;
      const better = Math.min(sqDistAt(solved.progress - nudge), sqDistAt(solved.progress + nudge));
      if (better < here * (1 - 1e-9)) {
        failures += 1;
        if (failures <= 5) {
          process.stdout.write(
            `  FAIL ${trackDef.key} p=${progress.toFixed(4)} lane=${lane}: solved progress is ` +
              `NOT a local minimum — nudging improves squared distance ${here.toFixed(4)} -> ${better.toFixed(4)}\n`
          );
        }
      }

      checks += 1;
      if (dProgress > trackWorstProgress) trackWorstProgress = dProgress;
      if (dLane > trackWorstLane) trackWorstLane = dLane;
      if (dProgress > PROGRESS_TOLERANCE || dLane > laneTolerance) {
        failures += 1;
        if (failures <= 5) {
          process.stdout.write(
            `  FAIL ${trackDef.key} p=${progress.toFixed(4)} lane=${lane}: ` +
              `got p=${solved.progress.toFixed(4)} lane=${solved.lane.toFixed(4)} ` +
              `(dp=${dProgress.toExponential(2)} dl=${dLane.toExponential(2)})\n`
          );
        }
      }
    }
  }

  worstProgress = Math.max(worstProgress, trackWorstProgress);
  worstLane = Math.max(worstLane, trackWorstLane);
  process.stdout.write(
    `${trackDef.key.padEnd(18)} worst dprogress ${trackWorstProgress.toExponential(2)} ` +
      `(tol ${PROGRESS_TOLERANCE}), worst dlane ${trackWorstLane.toExponential(2)} ` +
      `(tol 0.01 on-road / 0.02 off-road)\n`
  );
}

process.stdout.write(
  `\n${checks} round-trips across ${KART_TRACKS.length} tracks x ${SAMPLES_PER_LAP} progress x ${LANES.length} lanes\n` +
    `worst dprogress ${worstProgress.toExponential(2)}, worst dlane ${worstLane.toExponential(2)} -> ` +
    `${failures ? `${failures} FAILURES` : 'PASS'}\n`
);

if (failures) {
  process.stderr.write(
    '\nFAIL: projectToSpline does not invert pointAt. Do NOT build free-body on\n' +
      'this — every derived progress and lane in the race would be wrong.\n'
  );
  process.exit(1);
}
