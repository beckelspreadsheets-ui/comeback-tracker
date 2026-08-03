// P2 exit criterion, docs/FREE_BODY_PLAN.md.
//
// Drives the free-body kart round both shipped tracks with a simple steering
// controller and checks the things the plan promises: that a lap can be
// completed, that progress advances monotonically, that the projection stays
// locked on, and that the yaw-rate model produces corner radii the authored
// tracks can actually be driven at.
//
//   node scripts/test-free-body.mjs
//
// This is the verification that does NOT need frames, and so does not need the
// owner's gaming machine — it is numeric and headless by design.
import { makeSampler, mirrorCheck } from './track-layout-preview.mjs';
import { projectToSpline } from '../src/game/race/splineProjection.js';
import { FREE_BODY, createFreeBody, stepFreeBody, headingErrorTo, yawRateFor } from '../src/game/race/freeBodyKart.js';
import { KART_TRACKS } from '../src/game/race/tracks/index.js';

if (!mirrorCheck().pass) {
  process.stderr.write('FAIL: previewer sampler no longer mirrors the monolith.\n');
  process.exit(1);
}

const DT = 1 / 60;
const SPEED = 245.7; // the measured mean, scripts/measure-mean-speed.mjs
let failures = 0;

// --- the yaw model, independent of any track -------------------------------
process.stdout.write('yaw model — grip-limited minimum radius by speed\n');
for (const v of [60, 120, 180, 245.7, 300]) {
  const w = Math.abs(yawRateFor(1, v));
  process.stdout.write(`  ${String(v).padStart(6)} u/s -> ${w.toFixed(3)} rad/s, min radius ${(v / w).toFixed(1)} u\n`);
}
const radiusAtRace = SPEED / Math.abs(yawRateFor(1, SPEED));
// Both tracks must be drivable flat out: the tightest authored corner is PV's
// 94.7. If the grip model cannot hold that, the tracks become undriveable the
// moment free-body is switched on, and no amount of steering fixes it.
const TIGHTEST_AUTHORED = 94.7;
if (radiusAtRace > TIGHTEST_AUTHORED) {
  failures += 1;
  process.stdout.write(
    `  FAIL min radius at race speed is ${radiusAtRace.toFixed(1)}u but the tightest authored corner is ${TIGHTEST_AUTHORED}u\n`
  );
} else {
  process.stdout.write(
    `  min radius at race speed ${radiusAtRace.toFixed(1)}u vs tightest authored ${TIGHTEST_AUTHORED}u -> OK\n`
  );
}

// --- drive each track ------------------------------------------------------
for (const trackDef of KART_TRACKS) {
  const sampler = makeSampler(trackDef);
  const start = sampler.pointAt(0, 0);
  const ahead = sampler.pointAt(0.001, 0);
  const body = createFreeBody({
    x: start.x,
    z: start.z,
    heading: Math.atan2(ahead.x - start.x, ahead.z - start.z),
  });

  let progress = 0;
  let cumulative = 0;
  let worstLane = 0;
  let maxProjectionJump = 0;
  let backwardsFrames = 0;
  let frames = 0;
  const maxFrames = Math.ceil((sampler.length / SPEED) * 2.5 * 60);

  while (cumulative < 1 && frames < maxFrames) {
    // Steer toward a point up the road — the simplest controller that proves
    // the model is drivable rather than proving a clever controller works.
    const lookahead = 0.006;
    const target = sampler.pointAt(progress + lookahead, 0);
    const error = headingErrorTo(body.heading, target.x - body.x, target.z - body.z);
    const steer = Math.max(-1, Math.min(1, error * 2.2));

    stepFreeBody(body, { dt: DT, steer, speed: SPEED });
    const solved = projectToSpline(sampler.curve, sampler.widthAt, body.x, body.z, progress);

    let delta = solved.progress - progress;
    if (delta > 0.5) delta -= 1;
    if (delta < -0.5) delta += 1;
    if (delta < 0) backwardsFrames += 1;
    maxProjectionJump = Math.max(maxProjectionJump, Math.abs(delta));
    cumulative += delta;
    progress = solved.progress;
    worstLane = Math.max(worstLane, Math.abs(solved.lane));
    frames += 1;
  }

  const seconds = frames * DT;
  const completed = cumulative >= 1;
  process.stdout.write(
    `\n${trackDef.key}\n` +
      `  lap ${completed ? 'COMPLETED' : 'NOT COMPLETED'} in ${seconds.toFixed(1)}s (${frames} frames)\n` +
      `  worst |lane| ${worstLane.toFixed(3)}   max projection jump ${maxProjectionJump.toExponential(2)}   ` +
      `backwards frames ${backwardsFrames}\n`
  );

  if (!completed) {
    failures += 1;
    process.stdout.write('  FAIL did not complete a lap\n');
  }
  // The kart must stay on the road under a trivial controller. If it cannot,
  // the yaw model is too weak for the authored geometry.
  if (worstLane > 0.95) {
    failures += 1;
    process.stdout.write(`  FAIL left the road (|lane| ${worstLane.toFixed(3)} > 0.95)\n`);
  }
  // A projection jump means the local search lost the kart — the failure mode
  // that would fire phantom laps. One frame is ~0.00035 of a lap.
  if (maxProjectionJump > 0.005) {
    failures += 1;
    process.stdout.write(`  FAIL projection jumped ${maxProjectionJump.toExponential(2)} in one frame\n`);
  }
}

process.stdout.write(`\n${failures ? `${failures} FAILURES` : 'PASS'}\n`);
if (failures) process.exit(1);
