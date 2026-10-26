// Classic handling gate (src/game/race/classicHandling.js).
//
//   node scripts/test-classic-handling.mjs [--verbose]
//
// Two parts, both numeric and headless (no frames, so no gaming machine):
//
// 1. The model's promises, each checked in isolation: top speed, the run-off's
//    slowdown, the acceleration tail, grip washing wide at full lock, walls
//    that bounce and cost speed, the power slide's tight arc.
//
// 2. Every track driven for two laps by the Classic autoplay policy (the same
//    function the race's autoplay uses), next to a kart that holds the
//    throttle and never steers. The policy must finish its laps without being
//    rescued; the non-steering kart must NOT finish a lap. That second check is
//    the whole point of Classic: on rails a kart that never steers finished
//    every lap only 6-13 s down.
import { makeSampler, mirrorCheck } from './track-layout-preview.mjs';
import { projectToSpline } from '../src/game/race/splineProjection.js';
import { createFreeBody } from '../src/game/race/freeBodyKart.js';
import { createDriftState, updateDriftFeel, DRIFT_FEEL, ROCK_TURBO, TAP_TURBO } from '../src/game/race/driftFeel.js';
import { classicAutoplayInput } from '../src/game/race/autoplayDriver.js';
import {
  CLASSIC,
  classicSlipStep,
  classicSpeedStep,
  classicSurfaceAt,
  classicWallStep,
  createClassicState,
  MIX,
  stepClassicBody,
} from '../src/game/race/classicHandling.js';
import { roadEdgeSection } from '../src/game/race/render/buildRoadEdgeProfile.js';
import { rocketStartResult, rocketStartReward } from '../src/game/race/rocketStart.js';
import { createAirState, hangTimeBoost, launchAir, MIX_AIR, updateAir } from '../src/game/race/airTricks.js';
import { KART_TRACKS, PREVIEW_TRACKS } from '../src/game/race/tracks/index.js';

const VERBOSE = process.argv.includes('--verbose');
const DT = 1 / 60;
const TOP = 228; // MAX_SPEED for the hero kart
const BOOST_TOP = 284; // BOOST_SPEED
const MINI_TURBO_ACCEL = 150;
let failures = 0;
const check = (ok, label, detail) => {
  if (!ok) failures += 1;
  process.stdout.write(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? `  (${detail})` : ''}\n`);
};

if (!mirrorCheck().pass) {
  process.stderr.write('FAIL: previewer sampler no longer mirrors the monolith.\n');
  process.exit(1);
}

// --- 1. the model in isolation ------------------------------------------------
process.stdout.write('Classic model\n');
const settle = (opts, seconds = 12, start = 0) => {
  let v = start;
  for (let t = 0; t < seconds; t += DT) v = classicSpeedStep(v, { dt: DT, throttle: true, top: TOP, ...opts });
  return v;
};
{
  const top = settle({});
  check(Math.abs(top / TOP - 1) < 0.02, 'flat-out settles at top speed', `${top.toFixed(1)} u/s`);
  const verge = settle({ verge: true }, 12, TOP);
  check(verge / TOP > 0.66 && verge / TOP < 0.76, 'run-off settles near 71% of top', `${((verge / TOP) * 100).toFixed(1)}%`);
  let v = 0;
  let t95 = null;
  for (let t = 0; t < 10 && t95 == null; t += DT) {
    v = classicSpeedStep(v, { dt: DT, throttle: true, top: TOP });
    if (v >= TOP * 0.95) t95 = t;
  }
  check(t95 > 2.2 && t95 < 3.5, '0 to 95% takes ~2.8 s (rails: 1.9 s, no tail)', `${t95?.toFixed(2)} s`);
  const slide = settle({ sliding: true }, 12, TOP);
  check(slide / TOP > 0.85 && slide / TOP < 0.95, 'a held slide settles ~10% slower', `${((slide / TOP) * 100).toFixed(1)}%`);
}
{
  // Full lock at top speed asks more than grip holds: the kart washes wide,
  // slips, and the slip costs speed. 80% lock holds.
  const drive = (stick, seconds = 2) => {
    const body = createFreeBody({ heading: 0 });
    let speed = TOP;
    let slip = 0;
    let maxSlip = 0;
    for (let t = 0; t < seconds; t += DT) {
      const out = stepClassicBody(body, { dt: DT, speed, steer: stick });
      slip = out.slip;
      maxSlip = Math.max(maxSlip, Math.abs(slip));
      speed = classicSpeedStep(out.speed, { dt: DT, throttle: true, steer: stick, slip, top: TOP });
    }
    return { maxSlip, speed };
  };
  const full = drive(1);
  check(full.maxSlip > 0.05, 'full lock at top speed washes wide', `slip ${((full.maxSlip * 180) / Math.PI).toFixed(1)} deg`);
  check(full.speed < TOP * 0.93, 'and the slide wide costs speed', `${((full.speed / TOP) * 100).toFixed(1)}% after 2 s`);
  const held = drive(0.75);
  check(held.maxSlip < 0.02, '3/4 lock at top speed holds its line', `slip ${((held.maxSlip * 180) / Math.PI).toFixed(2)} deg`);
}
{
  // Walls: a square hit loses most of the speed, a glancing one keeps most.
  const hit = (angleDeg) => {
    const body = createFreeBody({ heading: (angleDeg * Math.PI) / 180 });
    // Wall along x = 20 (normal +x), kart just past it.
    body.x = 20 - CLASSIC.kartHalfWidth + 0.5;
    const result = classicWallStep(body, {
      barrierOffset: 20,
      distance: body.x,
      normal: { x: 1, z: 0 },
      speed: TOP,
    });
    return { ...result, x: body.x };
  };
  const square = hit(90);
  const glance = hit(8);
  check(square.speed < TOP * 0.2 && square.hit, 'a square wall hit loses most of the speed', `${square.speed.toFixed(1)} u/s left`);
  check(glance.speed > TOP * 0.8 && !glance.hit, 'an 8-degree glance keeps most of it', `${glance.speed.toFixed(1)} u/s left`);
  check(square.x <= 20 - CLASSIC.kartHalfWidth + 1e-6, 'the kart is put back inside the wall line');
  // Stopped nose-first against the wall, throttle and full lock away from it:
  // the kart must pivot off it and drive on, not sit pinned (no reverse gear).
  const body = createFreeBody({ heading: Math.PI / 2 });
  body.x = 20 - CLASSIC.kartHalfWidth;
  let speed = 0;
  let hits = 0;
  let turnedAway = false;
  for (let t = 0; t < 3; t += DT) {
    // Full lock away until the nose points off the wall, then straighten up
    // parallel to it, as a driver would (the test road has walls both sides).
    if (body.heading < -0.3) turnedAway = true;
    const steer = turnedAway ? Math.max(-1, Math.min(1, body.heading * 3)) : 1;
    speed = classicSpeedStep(speed, { dt: DT, steer, throttle: true, top: TOP });
    speed = stepClassicBody(body, { dt: DT, speed, steer }).speed;
    const wall = classicWallStep(body, { barrierOffset: 20, distance: body.x, normal: { x: 1, z: 0 }, speed });
    speed = wall.speed;
    if (wall.hit) hits += 1;
  }
  check(body.x < 20 - CLASSIC.kartHalfWidth - 8 && speed > 120, 'a kart stopped against a wall pivots away and drives off', `${(20 - CLASSIC.kartHalfWidth - body.x).toFixed(0)} u off it at ${speed.toFixed(0)} u/s`);
  check(hits === 0, 'and resting on the wall never counts as a hit', `${hits} hits`);
}
{
  // Power slide, stick fully into the corner at slide speed: a tight arc.
  const body = createFreeBody({ heading: 0 });
  let speed = 205;
  const startX = body.x;
  let minX = 0;
  let maxX = 0;
  for (let t = 0; t < 3; t += DT) {
    speed = stepClassicBody(body, { dt: DT, slideDir: 1, speed, steer: 1 }).speed;
    minX = Math.min(minX, body.x - startX);
    maxX = Math.max(maxX, body.x - startX);
  }
  const diameter = maxX - minX;
  check(diameter > 160 && diameter < 230, 'full-inward slide at 205 u/s is a ~98 u radius', `diameter ${diameter.toFixed(0)} u`);
}

// --- 1b. the Classic mini-turbo rules ----------------------------------------------
process.stdout.write('\nMini-turbo rules\n');
// A slide to the right at 200 u/s, then a script of segments:
// [seconds, { held, stick, press }] — press bumps the fresh-press count once
// at the segment's start. Returns the drift state and every event seen.
const slideScript = (mode, script) => {
  const drift = createDriftState();
  let presses = 1;
  const seen = [];
  const tick = (held, stick) => {
    const events = updateDriftFeel(drift, { dt: DT, held, mode, presses, speed: 200, steer: stick, stick });
    seen.push(events);
  };
  // Press, hop, land steering right: the slide starts.
  for (let t = 0; t < DRIFT_FEEL.hopDuration + 0.05; t += DT) tick(true, 1);
  for (const [seconds, { held = true, stick = 1, press = false }] of script) {
    if (press) presses += 1;
    for (let t = 0; t < seconds - 1e-9; t += DT) tick(held, stick);
  }
  return { drift, seen };
};
const any = (seen, key) => seen.some((events) => events[key]);
{
  const rocked = slideScript('rock', [
    [ROCK_TURBO.firstHold + 0.05, { stick: -1 }],
    [0.1, { stick: 1 }],
    [ROCK_TURBO.nextHold + 0.05, { stick: -1 }],
    [0.1, { stick: 1 }],
  ]);
  check(rocked.drift.active && rocked.drift.stage === 2 && rocked.drift.tier === 2, 'Classic 64: two rocks turn the sparks amber', `stage ${rocked.drift.stage}`);
  const paid = slideScript('rock', [
    [ROCK_TURBO.firstHold + 0.05, { stick: -1 }],
    [0.1, { stick: 1 }],
    [ROCK_TURBO.nextHold + 0.05, { stick: -1 }],
    [0.1, { stick: 1 }],
    [0.05, { held: false }],
  ]);
  const release = paid.seen.find((events) => events.released);
  check(
    release?.released === 2 && release.kick === ROCK_TURBO.boostKick && paid.drift.miniTurboTimer > 0,
    'Classic 64: letting go then pays one boost',
    `kick ${release?.kick}`
  );
  const short = slideScript('rock', [
    [ROCK_TURBO.firstHold - 0.1, { stick: -1 }],
    [0.1, { stick: 1 }],
  ]);
  check(short.drift.stage === 0, 'Classic 64: a first push shorter than the hold does not count');
  const lazy = slideScript('rock', [[2, { stick: 0 }], [0.05, { held: false }]]);
  check(!any(lazy.seen, 'released'), 'Classic 64: holding a slide without rocking pays nothing');
  const over = slideScript('rock', [
    [ROCK_TURBO.firstHold + 0.05, { stick: -1 }],
    [0.1, { stick: 1 }],
    [ROCK_TURBO.overHold + 0.05, { stick: -1 }],
  ]);
  check(over.drift.stage === 0, 'Classic 64: holding the stick out too long throws the charge away');
}
{
  const hot = TAP_TURBO.fillTime * TAP_TURBO.hotFrom;
  const early = slideScript('tap', [[hot * 0.5, {}], [0.02, { press: true }]]);
  check(any(early.seen, 'tapEarly') && !any(early.seen, 'tapBoost'), 'Classic Mix: an early press pays nothing');
  const good = slideScript('tap', [[hot + 0.05, {}], [0.02, { press: true }]]);
  const boost = good.seen.find((events) => events.tapBoost);
  check(boost?.tapBoost === 1 && boost.kick === TAP_TURBO.boostKicks[0] && good.drift.active, 'Classic Mix: a press in the hot zone boosts on the spot, mid-slide');
  const chain = slideScript('tap', [
    [hot + 0.05, {}],
    [0.05, { held: false }],
    [hot, { press: true }],
    [0.05, { held: false }],
    [hot, { press: true }],
    [0.05, { held: false }],
    [hot, { press: true }],
    [hot + 0.1, { press: true }],
  ]);
  const tiers = chain.seen.filter((events) => events.tapBoost).map((events) => events.tapBoost);
  check(tiers.join(',') === '1,2,3' && chain.drift.active, 'Classic Mix: pumped presses chain three bigger boosts, then stop', `tiers ${tiers.join(',') || 'none'}`);
  const backfire = slideScript('tap', [[TAP_TURBO.fillTime + TAP_TURBO.backfireAfter + 0.1, {}]]);
  const fired = backfire.seen.find((events) => events.backfire);
  check(fired?.kick === -TAP_TURBO.backfireLoss, 'Classic Mix: leaving the meter full backfires');
  const ended = slideScript('tap', [[0.3, {}], [TAP_TURBO.pumpGrace + 0.05, { held: false }]]);
  check(!ended.drift.active, 'Classic Mix: letting go for longer than a pump ends the slide');
}
{
  // Assisted is untouched: time held still banks the tier and pays on release.
  const held = slideScript('hold', [[DRIFT_FEEL.chargeTimes[1] + 0.05, {}], [0.02, { held: false }]]);
  const release = held.seen.find((events) => events.released);
  check(release?.released === 2 && release.kick === DRIFT_FEEL.boostKick[1], 'Assisted: the time-held charge is unchanged');
}

// --- 1c. the rocket start --------------------------------------------------------
process.stdout.write('\nRocket start\n');
{
  const classic = { classic: true };
  check(rocketStartResult(1.6) === 'perfect' && rocketStartResult(0.8) === 'good' && rocketStartResult(2.6) === 'flooded', 'Assisted keeps its windows: "2" perfect, later good, "3" floods');
  check(rocketStartResult(0.2, classic) === 'perfect', 'Classic: a fresh press in the last 0.25 s is perfect');
  check(rocketStartResult(0.6, classic) === null && rocketStartResult(1.6, classic) === 'flooded', 'Classic: earlier is nothing, held from over a second out floods');
  // What a start is worth over the first 8 s: the reward used to be a higher
  // cap only, which a kart starting from 0 never reaches (worth +0.00 s).
  const gained = (result, opts) => {
    const reward = rocketStartReward(result, opts);
    const run = (r) => {
      let v = r.kick;
      let boost = r.boost;
      let spin = r.spin;
      let d = 0;
      for (let t = 0; t < 8; t += DT) {
        v = classicSpeedStep(v, { boostTop: BOOST_TOP, boosting: boost > 0, dt: DT, spinning: spin > 0, throttle: true, top: TOP });
        boost = Math.max(0, boost - DT);
        spin = Math.max(0, spin - DT);
        d += v * DT;
      }
      return d;
    };
    return (run(reward) - run({ boost: 0, kick: 0, spin: 0 })) / TOP;
  };
  const perfect = gained('perfect', classic);
  const flooded = gained('flooded', classic);
  check(perfect > 0.4, 'a perfect Classic start is worth real time now', `+${perfect.toFixed(2)} s`);
  check(flooded < -1, 'a Classic flood costs over a second', `${flooded.toFixed(2)} s`);
  check(rocketStartReward('perfect').kick > 0, 'Assisted perfect starts launch too (the cap-only reward was worth nothing)');
}

// --- 1d. mistakes -------------------------------------------------------------------
process.stdout.write('\nMistakes\n');
{
  // Time lost to one spin-out from top speed, over 8 s.
  const lost = (keep, spinFor, floor, model) => {
    let v = TOP * keep;
    let spin = spinFor;
    let d = 0;
    for (let t = 0; t < 8; t += DT) {
      const spinning = spin > 0;
      v = model === 'classic'
        ? classicSpeedStep(v, { dt: DT, spinning, throttle: true, top: TOP })
        : Math.min(TOP, Math.max(0, v + (spinning ? -150 : 118) * DT));
      if (spinning) v = Math.max(floor, v);
      spin = Math.max(0, spin - DT);
      d += v * DT;
    }
    return 8 - d / TOP;
  };
  const assisted = lost(0.5, 0.95, 46, 'assisted');
  const classic = lost(CLASSIC.spinSpeedScale, CLASSIC.spinDuration, CLASSIC.spinFloor, 'classic');
  check(classic > assisted + 0.5 && classic < 2.6, 'a Classic spin-out costs ~2 s (Assisted ~1.3 s)', `${classic.toFixed(2)} s vs ${assisted.toFixed(2)} s`);
  const state = createClassicState();
  state.slipTimer = CLASSIC.slipWobble;
  let result = null;
  for (let t = 0; t < 0.2 && !result; t += DT) result = classicSlipStep(state, { dt: DT });
  result = classicSlipStep(state, { brake: true, dt: DT });
  check(result === 'saved' && state.saves === 1, 'a fish-bone wobble caught with the brake is saved');
  const late = createClassicState();
  late.slipTimer = CLASSIC.slipWobble;
  let outcome = null;
  for (let t = 0; t < 1 && !outcome; t += DT) outcome = classicSlipStep(late, { dt: DT });
  check(outcome === 'spin', 'one left to run out spins you');
}

// --- 1e. Classic Mix extras -------------------------------------------------------
process.stdout.write('\nClassic Mix extras\n');
{
  // A ramp at race speed; the trick press comes `pressAt` s after the lip.
  const jump = (pressAt, trickWindow) => {
    const air = createAirState();
    launchAir(air, TOP);
    let t = 0;
    let events;
    do {
      events = updateAir(air, { actionHeld: t >= pressAt, dt: DT, trickWindow });
      t += DT;
    } while (!events.landed && t < 5);
    return events;
  };
  check(jump(0.5, Infinity).trickTier === 1, 'Assisted and Classic 64 take a trick press any time in the air');
  check(jump(0.1, MIX_AIR.trickWindow).trickTier === 1 && jump(0.5, MIX_AIR.trickWindow).trickTier === 0, 'Mix: the trick only arms off the lip (Mario Kart Wii)');
  const ramp = jump(0, MIX_AIR.trickWindow);
  const hang = hangTimeBoost(ramp.airTime);
  check(Boolean(hang) && ramp.heldLanding && hangTimeBoost(1.2).duration > hang.duration && !hangTimeBoost(0.4), 'Mix: drift held through a jump pays a hang-time boost that grows with air time (CTR)', `${ramp.airTime.toFixed(2)} s in the air -> ${hang?.duration.toFixed(2)} s boost`);
  check(MIX.coinsLostPerHit > 0, 'Mix: a hit spills coins', `${MIX.coinsLostPerHit} a hit`);
}

// --- 2. every track -------------------------------------------------------------
const barrierInset = roadEdgeSection({ curbWidth: 3.2 })[7].u;
const tracks = [...KART_TRACKS, ...(PREVIEW_TRACKS || [])].filter(
  (track, index, list) => list.findIndex((other) => other.key === track.key) === index
);

const drive = (trackDef, policy, { laps = 2, seconds = 170 } = {}) => {
  const sampler = makeSampler(trackDef);
  const startProgress = 0.01;
  const seat = sampler.pointAt(startProgress, 0);
  const ahead = sampler.pointAt(startProgress + 0.001, 0);
  const body = createFreeBody({ heading: Math.atan2(ahead.x - seat.x, ahead.z - seat.z), x: seat.x, z: seat.z });
  const drift = createDriftState();
  let progress = startProgress;
  let cumulative = 0;
  let speed = 0;
  let steer = 0;
  let slip = 0;
  let verge = false;
  let stun = 0;
  let lostTimer = 0;
  const stats = { hits: 0, contactFrames: 0, laps: [], maxSlip: 0, rescues: 0, slideFrames: 0, vergeFrames: 0, frames: 0, distance: 0 };
  let lapStart = 0;
  let lapsDone = 0;
  for (let frame = 0; frame < seconds / DT && lapsDone < laps; frame += 1) {
    const t = frame * DT;
    const input = policy({ body, drift, progress, sampler, speed, verge });
    steer += ((input.steerAxis ?? 0) - steer) * (1 - Math.pow(0.001, DT));
    const events = updateDriftFeel(drift, { dt: DT, held: Boolean(input.drift), speed, steer });
    if (events.released > 0) speed = Math.min(speed + DRIFT_FEEL.boostKick[events.released - 1], BOOST_TOP);
    const boosting = drift.miniTurboTimer > 0;
    stun = Math.max(0, stun - DT);
    speed = classicSpeedStep(speed, {
      accelStat: 1,
      boostAccel: boosting ? MINI_TURBO_ACCEL : 0,
      boostTop: BOOST_TOP,
      boosting,
      brake: Boolean(input.brake),
      dt: DT,
      sliding: drift.active,
      slip,
      steer,
      stunned: stun > 0,
      throttle: input.throttle !== false,
      top: TOP,
      verge,
    });
    const moved = stepClassicBody(body, {
      dt: DT,
      gripScale: verge ? CLASSIC.vergeGrip : 1,
      slideDir: drift.active ? drift.direction : 0,
      speed,
      steer,
    });
    speed = moved.speed;
    slip = moved.slip;
    let solved = projectToSpline(sampler.curve, sampler.widthAt, body.x, body.z, progress);
    const wall = classicWallStep(body, {
      barrierOffset: sampler.widthAt(solved.progress) * 0.44 + barrierInset,
      distance: solved.distance,
      normal: solved.normal,
      speed,
    });
    speed = wall.speed;
    if (wall.contact) stats.contactFrames += 1;
    if (wall.hit) {
      stats.hits += 1;
      stun = CLASSIC.wallStun;
      drift.active = false;
      drift.charge = 0;
      drift.tier = 0;
    }
    if (wall.contact) solved = projectToSpline(sampler.curve, sampler.widthAt, body.x, body.z, progress);
    verge = classicSurfaceAt(solved.distance, sampler.widthAt(solved.progress) * 0.44) === 'verge';
    if (verge) stats.vergeFrames += 1;
    if (drift.active) stats.slideFrames += 1;
    stats.maxSlip = Math.max(stats.maxSlip, Math.abs(slip));
    let delta = solved.progress - progress;
    if (delta > 0.5) delta -= 1;
    if (delta < -0.5) delta += 1;
    cumulative += delta;
    stats.distance += Math.max(0, delta) * sampler.length;
    progress = solved.progress;
    lostTimer = Math.abs(solved.lane) > 2.6 || (Math.abs(solved.lane) > 1 && speed < 30) ? lostTimer + DT : 0;
    if (lostTimer > 2.2) {
      const home = sampler.pointAt(progress, 0);
      const next = sampler.pointAt(progress + 0.001, 0);
      body.x = home.x;
      body.z = home.z;
      body.heading = Math.atan2(next.x - home.x, next.z - home.z);
      body.lateralVel = 0;
      speed = Math.min(speed, 90);
      lostTimer = 0;
      stats.rescues += 1;
    }
    if (cumulative >= lapsDone + 1) {
      stats.laps.push(t - lapStart);
      lapStart = t;
      lapsDone += 1;
    }
    stats.frames = frame + 1;
  }
  stats.seconds = stats.frames * DT;
  stats.meanSpeed = stats.distance / Math.max(1e-6, stats.seconds);
  stats.length = sampler.length;
  return stats;
};

const autoplay = ({ body, drift, progress, sampler, speed, verge }) =>
  classicAutoplayInput({
    drifting: drift.active,
    driftDirection: drift.direction,
    freeBody: body,
    offRoad: verge,
    pointAt: (p, lane) => sampler.pointAt(p, lane),
    progress,
    speed,
    trackLength: sampler.length,
  });
const noSteer = () => ({ steerAxis: 0, throttle: true });

for (const trackDef of tracks) {
  const best = drive(trackDef, autoplay);
  const rails = (best.length / TOP).toFixed(1);
  process.stdout.write(
    `\n${trackDef.key}  (${best.length.toFixed(0)} u; a lap at the rails' top speed is ${rails} s)\n` +
      `  autoplay: laps ${best.laps.map((lap) => `${lap.toFixed(1)}s`).join(' / ') || 'none'}, mean ${best.meanSpeed.toFixed(0)} u/s, ` +
      `wall hits ${best.hits}, wall contact ${(best.contactFrames * DT).toFixed(1)}s, run-off ${(best.vergeFrames * DT).toFixed(1)}s, ` +
      `sliding ${(best.slideFrames * DT).toFixed(1)}s, max slip ${((best.maxSlip * 180) / Math.PI).toFixed(0)} deg, rescues ${best.rescues}\n`
  );
  check(best.laps.length === 2, 'the Classic autoplay finishes two laps');
  check(best.rescues === 0, 'without ever being rescued');
  // Same minute for both: a kart that never steers must cover far less road.
  // (On rails it lost only 6-13 s a lap.)
  const minute = drive(trackDef, autoplay, { laps: 99, seconds: 60 });
  const blind = drive(trackDef, noSteer, { laps: 99, seconds: 60 });
  const share = blind.distance / Math.max(1, minute.distance);
  process.stdout.write(
    `  never steering: ${((blind.distance / blind.length) * 100).toFixed(0)}% of a lap in 60 s ` +
      `(the autoplay: ${((minute.distance / minute.length) * 100).toFixed(0)}%), wall hits ${blind.hits}\n`
  );
  check(share < 0.7, 'a kart that never steers covers under 70% of the road the autoplay does', `${(share * 100).toFixed(0)}%`);
  if (VERBOSE) process.stdout.write(`  ${JSON.stringify({ best, blind })}\n`);
}

process.stdout.write(`\n${failures ? `${failures} FAILURES` : 'PASS'}\n`);
if (failures) process.exit(1);
