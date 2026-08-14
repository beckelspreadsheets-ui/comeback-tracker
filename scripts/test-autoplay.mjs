// P7 gate — the free-body autoplay driver can actually race.
//
//   node scripts/test-autoplay.mjs
//
// Before this existed, `?freebody=1&playableAutoplay=1` was a rescue loop:
// the lane-space autoplay policy fed a heading-space body and the difficulty
// probe measured 0.19 laps in 190 seconds. This drives the REAL controller
// (src/game/race/autoplayDriver.js — the module the monolith imports, not a
// copy) around both shipped tracks with the real free-body integrator and a
// faithful approximation of the game's speed model, and asserts what the
// probe needs to be true for its measurement to mean anything:
//
//   - a full lap completes
//   - the rescue rule never fires (|lane| > 2.6, or |lane| > 1 && speed < 30,
//     sustained 2.2s — quoted from the monolith like test-off-road does)
//   - the kart essentially never leaves the road
//   - the lap time is a plausible racing lap, not a crawl
//
// Speed model quoted from the monolith frame loop (node cannot import it):
//
//   accel        = throttle ? 118 : -48        (* offroad accelerationMultiplier)
//   brakeDrag    = brake ? -180 : 0
//   steeringDrag = |steer| * (drift ? -8 : -22)
//   offRoad      = |lane| > 1  ->  speed -= 150*dt, steer *= steerMultiplier
//   race.steer   = lerp(steer, target, 1 - 0.001^dt)
//   clamp 0..MAX_SPEED (228; boosts/items excluded — the controller must lap
//   clean without luck)
import { makeSampler, mirrorCheck } from './track-layout-preview.mjs';
import { projectToSpline } from '../src/game/race/splineProjection.js';
import { createFreeBody, stepFreeBody } from '../src/game/race/freeBodyKart.js';
import { SURFACE_TYPES } from '../src/game/race/physics/surfacePhysics.js';
import { CORNER_LOAD_K } from '../src/game/race/rivalRacers.js';
import { autoplayApexLane, freeBodyAutoplayInput } from '../src/game/race/autoplayDriver.js';
import { trackByKey } from '../src/game/race/tracks/index.js';

if (!mirrorCheck().pass) {
  process.stderr.write('FAIL: previewer sampler no longer mirrors the monolith.\n');
  process.exit(1);
}

const DT = 1 / 60;
const MAX_SPEED = 228;
const RESCUE_LANE = 2.6;
const RESCUE_SECONDS = 2.2;
const MAX_SIM_SECONDS = 240;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const lerp = (a, b, t) => a + (b - a) * t;

const cases = [];
const check = (name, actual, expected) => {
  const pass = actual === expected;
  cases.push({ pass });
  process.stdout.write(`  ${pass ? 'ok  ' : 'FAIL'} ${name.padEnd(58)} got ${actual}, want ${expected}\n`);
};

// The monolith's trackCurvatureAt, rebuilt on the previewer sampler (which
// exposes the curve but not tangents/normals): signed curvature over a 3-unit
// baseline, then cornerPushFor — so the controller's apex target is fed the
// same signal in the gate as in the game.
const curvatureAt = (sampler, progress) => {
  const deltaUnits = 3;
  const wrap01 = (v) => ((v % 1) + 1) % 1;
  const a = sampler.curve.getTangentAt(wrap01(progress));
  const b = sampler.curve.getTangentAt(wrap01(progress + deltaUnits / sampler.length));
  // normal = (-tangent.z, tangent.x), same convention as the monolith sampler.
  return ((b.x - a.x) * -a.z + (b.z - a.z) * a.x) / deltaUnits;
};
const cornerPushFor = (kappa, speed) =>
  -Math.sign(kappa) * Math.min(4, Math.pow(Math.abs(kappa), 0.7) * speed * speed * CORNER_LOAD_K);

process.stdout.write('free-body autoplay laps\n');

for (const key of ['comeback-city', 'penguin-village']) {
  const sampler = makeSampler(trackByKey(key));
  const seat = sampler.pointAt(0, 0);
  const ahead = sampler.pointAt(0.001, 0);
  const body = createFreeBody({
    heading: Math.atan2(ahead.x - seat.x, ahead.z - seat.z),
    x: seat.x,
    z: seat.z,
  });

  let speed = 0;
  let steer = 0;
  let progress = 0;
  let lane = 0;
  let cumulative = 0;
  let lostTimer = 0;
  let rescues = 0;
  let offRoadFrames = 0;
  let brakeFrames = 0;
  let worstLane = 0;
  let minSpeedAfterLaunch = Infinity;
  let time = 0;

  while (cumulative < 1 && time < MAX_SIM_SECONDS) {
    const offRoad = Math.abs(lane) > 1;
    const cornerPush = cornerPushFor(curvatureAt(sampler, progress), speed);
    const input = freeBodyAutoplayInput({
      cornerPush,
      freeBody: body,
      offRoad,
      pointAt: (p, l) => sampler.pointAt(p, l),
      progress,
      speed,
      targetLane: autoplayApexLane(cornerPush),
      trackLength: sampler.length,
    });

    // Speed model (quoted above).
    const accel = (input.throttle ? 118 : -48) * (offRoad ? SURFACE_TYPES.offroad.accelerationMultiplier : 1);
    const brakeDrag = input.brake ? -180 : 0;
    const steeringDrag = Math.abs(steer) * (input.drift ? -8 : -22);
    speed = clamp(speed + (accel + brakeDrag + steeringDrag) * DT, 0, MAX_SPEED);
    if (offRoad) speed = Math.max(0, speed - 150 * DT);
    if (input.brake) brakeFrames += 1;

    steer = lerp(steer, input.steerAxis, 1 - Math.pow(0.001, DT));
    stepFreeBody(body, {
      dt: DT,
      drifting: input.drift,
      offRoad,
      speed,
      steer,
      steerAuthority: offRoad ? SURFACE_TYPES.offroad.steerMultiplier : 1,
    });

    const solved = projectToSpline(sampler.curve, sampler.widthAt, body.x, body.z, progress);
    let d = solved.progress - progress;
    if (d > 0.5) d -= 1;
    if (d < -0.5) d += 1;
    cumulative += d;
    progress = solved.progress;
    lane = solved.lane;
    worstLane = Math.max(worstLane, Math.abs(lane));
    if (Math.abs(lane) > 1) offRoadFrames += 1;
    if (time > 4) minSpeedAfterLaunch = Math.min(minSpeedAfterLaunch, speed);

    // The rescue rule, quoted from the monolith. It must never fire, but if it
    // does, replace on the centreline like the game so the sim keeps counting
    // instead of diverging into the void.
    const farOut = Math.abs(lane) > RESCUE_LANE;
    const stranded = Math.abs(lane) > 1 && speed < 30;
    lostTimer = farOut || stranded ? lostTimer + DT : 0;
    if (lostTimer > RESCUE_SECONDS) {
      rescues += 1;
      lostTimer = 0;
      const home = sampler.pointAt(progress, 0);
      const next = sampler.pointAt(progress + 0.001, 0);
      body.x = home.x;
      body.z = home.z;
      body.heading = Math.atan2(next.x - home.x, next.z - home.z);
      body.lateralVel = 0;
      lane = 0;
      speed = Math.min(speed, 90);
    }

    time += DT;
  }

  process.stdout.write(
    `${key}: lap ${cumulative >= 1 ? 'done' : 'INCOMPLETE'} in ${time.toFixed(1)}s, ` +
      `worst |lane| ${worstLane.toFixed(2)}, off-road ${(offRoadFrames * DT).toFixed(2)}s, ` +
      `braking ${(brakeFrames * DT).toFixed(1)}s, slowest ${minSpeedAfterLaunch.toFixed(0)}\n`
  );
  check(`${key}: completes a full lap`, cumulative >= 1, true);
  check(`${key}: never rescued`, rescues, 0);
  // A wheel on the kerb for a frame or two is racing; time spent off the road
  // is a driving failure. Half a second over a ~2-minute lap is the bar.
  check(`${key}: off-road under 0.5s`, offRoadFrames * DT < 0.5, true);
  check(`${key}: never even near the rescue bound`, worstLane < 1.8, true);
  // Plausible lap: the 4x tracks race ~134s over the event; a single clean lap
  // at racing speed must land well inside 40..120s — outside that either the
  // sim broke or the driver is crawling.
  check(`${key}: lap time plausible (40..120s)`, time > 40 && time < 120, true);
  // "Varying speeds" is the point of the gate: the controller must actually
  // slow for something, and must not be limping. Comeback City is calibrated
  // drivable near-flat (freeBodyKart.js's radius note: tightest corner 107.5
  // vs an 86-unit grip radius), so the bar is "measurably off the cap" —
  // steering drag and corner demand together — not a hard braking quota.
  check(`${key}: speed actually varies (>= 4 u/s off the cap)`, minSpeedAfterLaunch <= MAX_SPEED - 4, true);
  check(`${key}: sustains racing speed (slowest > 60)`, minSpeedAfterLaunch > 60, true);
}

const failed = cases.filter((c) => !c.pass).length;
process.stdout.write(`\n${cases.length} cases -> ${failed ? `${failed} FAILURES` : 'PASS'}\n`);
if (failed) process.exit(1);
