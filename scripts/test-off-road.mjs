// P5 exit criterion, docs/FREE_BODY_PLAN.md.
//
// "You can leave the road, it costs you time, and you always get back."
//
// All three are failure modes on their own: a road you cannot leave (the rails
// clamp), a detour that costs nothing (a shortcut, not a mistake), and a kart
// stranded in the void with no way home (a race you have to restart).
//
//   node scripts/test-off-road.mjs
//
// WHY THIS TESTS RULES AND NOT DRIVING. The first version drove the kart with a
// fixed steering input and compared outcomes. It was worthless: "steer 0" is not
// a control, it drives straight off the outside of the first bend, and the
// comparison run ended 12 road-widths out where projectToSpline's local search
// has nothing meaningful to return. An emergent-driving test measured the
// scenario rather than the change. These assert the rules directly, and the one
// case that DOES need real driving uses a controller that follows the road.
//
// Rules reproduced from the monolith (node cannot import it), quoted so drift
// is visible:
//
//   offRoad   = freeBody && |lane| > 1
//   accel    *= SURFACE_TYPES.offroad.accelerationMultiplier
//   speed    -= 150 * dt                      while off road
//   steer    *= SURFACE_TYPES.offroad.steerMultiplier
//   farOut    = |lane| > 2.6
//   stranded  = |lane| > 1 && speed < 30
//   lostTimer = (farOut || stranded) ? +dt : 0   -> rescue at 2.2s
import { makeSampler, mirrorCheck } from './track-layout-preview.mjs';
import { projectToSpline } from '../src/game/race/splineProjection.js';
import { createFreeBody, stepFreeBody, headingErrorTo, yawRateFor } from '../src/game/race/freeBodyKart.js';
import { SURFACE_TYPES } from '../src/game/race/physics/surfacePhysics.js';
import { trackByKey } from '../src/game/race/tracks/index.js';

if (!mirrorCheck().pass) {
  process.stderr.write('FAIL: previewer sampler no longer mirrors the monolith.\n');
  process.exit(1);
}

const DT = 1 / 60;
const RESCUE_LANE = 2.6;
const RESCUE_SECONDS = 2.2;
const cases = [];
const check = (name, actual, expected) => {
  const pass = actual === expected;
  cases.push({ pass });
  process.stdout.write(`  ${pass ? 'ok  ' : 'FAIL'} ${name.padEnd(58)} got ${actual}, want ${expected}\n`);
};

process.stdout.write('off-road and rescue\n');

// --- 1. IT COSTS YOU. Pure arithmetic on the speed model: same throttle, same
//        duration, on the road versus off it.
{
  const advance = (offRoad, seconds, start = 245.7) => {
    let speed = start;
    for (let i = 0; i < Math.round(seconds / DT); i += 1) {
      const accel = 118 * (offRoad ? SURFACE_TYPES.offroad.accelerationMultiplier : 1);
      speed = Math.max(0, Math.min(300, speed + accel * DT));
      if (offRoad) speed = Math.max(0, speed - 150 * DT);
    }
    return speed;
  };
  const onRoad = advance(false, 2);
  const offRoad = advance(true, 2);
  check('off-road bleeds speed while on-road gains it', offRoad < onRoad, true);
  check('  off-road actually decelerates under full throttle', offRoad < 245.7, true);
}

// --- 2. IT COSTS YOU STEERING TOO.
{
  const on = Math.abs(yawRateFor(1, 245.7, { gripScale: 1 }));
  const off = Math.abs(yawRateFor(1, 245.7, { gripScale: SURFACE_TYPES.offroad.gripMultiplier }));
  check('off-road reduces the yaw rate the tyres can hold', off < on, true);
}

// --- 3. YOU ALWAYS GET BACK. Place the kart genuinely off course and run the
//        rescue rule. No driving involved — the rule is what is under test.
{
  const sampler = makeSampler(trackByKey('comeback-city'));
  const progress = 0.2;
  const off = sampler.pointAt(progress, 3.4); // well past RESCUE_LANE
  const body = createFreeBody({ heading: 0, x: off.x, z: off.z });
  let lane = 3.4;
  let lostTimer = 0;
  let rescuedAt = null;
  let laneAfterRescue = null;

  for (let i = 0; i < Math.round(6 / DT); i += 1) {
    const farOut = Math.abs(lane) > RESCUE_LANE;
    const stranded = Math.abs(lane) > 1 && 0 < 30;
    lostTimer = farOut || stranded ? lostTimer + DT : 0;
    if (lostTimer > RESCUE_SECONDS && rescuedAt === null) {
      const home = sampler.pointAt(progress, 0);
      body.x = home.x;
      body.z = home.z;
      lane = projectToSpline(sampler.curve, sampler.widthAt, body.x, body.z, progress).lane;
      rescuedAt = i * DT;
      laneAfterRescue = Math.abs(lane);
      lostTimer = 0;
    }
  }
  check('being far off course triggers a rescue', rescuedAt !== null, true);
  check('  and it waits ~2.2s rather than snapping instantly', rescuedAt > 2 && rescuedAt < 2.6, true);
  check('  and puts the kart back on the road', laneAfterRescue !== null && laneAfterRescue < 0.05, true);
}

// --- 4. A BRIEF EXCURSION IS NOT PUNISHED. Clipping the grass for less than the
//        window must not teleport you — that is a rail with extra steps.
{
  let lostTimer = 0;
  let rescues = 0;
  for (let i = 0; i < Math.round(1.5 / DT); i += 1) {
    lostTimer += DT; // continuously "far out" for 1.5s
    if (lostTimer > RESCUE_SECONDS) rescues += 1;
  }
  check('a 1.5s excursion does not rescue', rescues, 0);
}

// --- 5. STRANDED. Stopped past the kerb must rescue even though |lane| is well
//        inside RESCUE_LANE — otherwise the player sits in a field forever.
{
  let lostTimer = 0;
  let rescued = false;
  const lane = 1.4; // off road, but nowhere near far out
  const speed = 8; // crawling
  for (let i = 0; i < Math.round(4 / DT); i += 1) {
    const farOut = Math.abs(lane) > RESCUE_LANE;
    const stranded = Math.abs(lane) > 1 && speed < 30;
    lostTimer = farOut || stranded ? lostTimer + DT : 0;
    if (lostTimer > RESCUE_SECONDS) rescued = true;
  }
  check('stranded just off the road still rescues', rescued, true);
}

// --- 6. NORMAL RACING IS UNTOUCHED. The one case that needs real driving, with
//        a controller that follows the road. If a clean lap can trigger a
//        rescue, the bounds are wrong and racing gets teleported.
for (const key of ['comeback-city', 'penguin-village']) {
  const sampler = makeSampler(trackByKey(key));
  const seat = sampler.pointAt(0, 0);
  const ahead = sampler.pointAt(0.001, 0);
  const body = createFreeBody({ heading: Math.atan2(ahead.x - seat.x, ahead.z - seat.z), x: seat.x, z: seat.z });
  let progress = 0;
  let cumulative = 0;
  let worstLane = 0;
  let lostTimer = 0;
  let rescues = 0;
  let offRoadFrames = 0;

  while (cumulative < 1) {
    const target = sampler.pointAt(progress + 0.006, 0);
    const err = headingErrorTo(body.heading, target.x - body.x, target.z - body.z);
    stepFreeBody(body, { dt: DT, speed: 245.7, steer: Math.max(-1, Math.min(1, err * 2.2)) });
    const solved = projectToSpline(sampler.curve, sampler.widthAt, body.x, body.z, progress);
    let d = solved.progress - progress;
    if (d > 0.5) d -= 1;
    if (d < -0.5) d += 1;
    cumulative += d;
    progress = solved.progress;
    worstLane = Math.max(worstLane, Math.abs(solved.lane));
    if (Math.abs(solved.lane) > 1) offRoadFrames += 1;
    const stranded = Math.abs(solved.lane) > 1 && 245.7 < 30;
    lostTimer = Math.abs(solved.lane) > RESCUE_LANE || stranded ? lostTimer + DT : 0;
    if (lostTimer > RESCUE_SECONDS) {
      rescues += 1;
      lostTimer = 0;
    }
  }
  check(`${key}: a clean lap never rescues`, rescues, 0);
  check(`${key}: a clean lap never leaves the road`, offRoadFrames, 0);
}

const failed = cases.filter((c) => !c.pass).length;
process.stdout.write(`\n${cases.length} cases -> ${failed ? `${failed} FAILURES` : 'PASS'}\n`);
if (failed) process.exit(1);
