// P4 exit criterion, docs/FREE_BODY_PLAN.md.
//
// The TURN AROUND sign has exactly two ways to be useless: it fails to appear
// when you are genuinely driving backwards, or it flashes during normal racing.
// The second is worse — a sign that strobes mid-drift teaches the player to
// ignore it, and then it is not a sign at all.
//
// So this asserts BOTH directions, including the two false positives that
// actually happen in this game: a full-lock drift, and a spin-out.
//
//   node scripts/test-wrong-way.mjs
//
// The detector is four lines inside a 12.6k-line React component that node
// cannot import, so it is reproduced here and quoted so drift is visible:
//
//   goingBackwards = delta < 0 && speed > 12 && !spinning && !airborne
//   wrongWayTimer  = goingBackwards ? min(1, +dt) : max(0, -dt*3)
//   if (timer > 0.6) wrongWay = true; else if (timer <= 0) wrongWay = false

const DT = 1 / 60;

const createDetector = () => ({ wrongWay: false, wrongWayTimer: 0 });

const step = (d, { delta, speed = 200, spinning = false, airborne = false }) => {
  const goingBackwards = delta < 0 && speed > 12 && !spinning && !airborne;
  d.wrongWayTimer = goingBackwards ? Math.min(1, d.wrongWayTimer + DT) : Math.max(0, d.wrongWayTimer - DT * 3);
  if (d.wrongWayTimer > 0.6) d.wrongWay = true;
  else if (d.wrongWayTimer <= 0) d.wrongWay = false;
  return d;
};

const run = (frames, make) => {
  const d = createDetector();
  let raisedAt = null;
  for (let i = 0; i < frames; i += 1) {
    step(d, make(i));
    if (d.wrongWay && raisedAt === null) raisedAt = i * DT;
  }
  return { detector: d, raisedAt };
};

const cases = [];
const check = (name, actual, expected) => {
  const pass = actual === expected;
  cases.push({ pass });
  process.stdout.write(`  ${pass ? 'ok  ' : 'FAIL'} ${name.padEnd(56)} got ${actual}, want ${expected}\n`);
};

process.stdout.write('wrong-way indicator\n');

// MUST FIRE — sustained reverse.
{
  const { detector, raisedAt } = run(180, () => ({ delta: -0.0003 }));
  check('sustained reverse raises the sign', detector.wrongWay, true);
  check('raises within 1s', raisedAt !== null && raisedAt < 1, true);
}

// MUST NOT FIRE — ordinary forward racing.
{
  const { detector } = run(600, () => ({ delta: 0.00035 }));
  check('normal forward driving never raises', detector.wrongWay, false);
}

// MUST NOT FIRE — a full-lock drift. Progress still advances; the nose is what
// swings, and the detector deliberately does not look at the nose.
{
  const { detector } = run(600, (i) => ({ delta: 0.00028 + Math.sin(i / 9) * 0.00006 }));
  check('full-lock drift never raises', detector.wrongWay, false);
}

// MUST NOT FIRE — a spin-out. Progress genuinely goes backwards for a moment
// here, which is why `spinning` is part of the condition rather than relying on
// the debounce alone.
{
  const { detector } = run(600, (i) => {
    const spinning = i > 120 && i < 240;
    return { delta: spinning ? -0.00008 : 0.00035, spinning };
  });
  check('spin-out never raises', detector.wrongWay, false);
}

// MUST NOT FIRE — airborne over a jump, where progress can jitter.
{
  const { detector } = run(400, (i) => {
    const airborne = i > 100 && i < 200;
    return { delta: airborne ? -0.00005 : 0.0003, airborne };
  });
  check('airborne never raises', detector.wrongWay, false);
}

// MUST NOT FIRE — rolling to a stop. Below the speed floor, direction noise on
// a near-stationary kart must not be read as intent.
{
  const { detector } = run(600, () => ({ delta: -0.000002, speed: 4 }));
  check('crawling below the speed floor never raises', detector.wrongWay, false);
}

// MUST CLEAR PROMPTLY EVEN AFTER A LONG REVERSE. Without the 1s clamp on the
// timer this is the failing case: 30s of reversing banks 30s of timer and the
// sign hangs for ten seconds after the player has already turned round.
{
  const d = createDetector();
  for (let i = 0; i < 60 * 30; i += 1) step(d, { delta: -0.0003 });
  let clearedAt = null;
  for (let i = 0; i < 120; i += 1) {
    step(d, { delta: 0.00035 });
    if (!d.wrongWay && clearedAt === null) clearedAt = i * DT;
  }
  check('clears in under 0.4s even after 30s of reversing', clearedAt !== null && clearedAt < 0.4, true);
}

// MUST CLEAR — and faster than it raised.
{
  const d = createDetector();
  for (let i = 0; i < 120; i += 1) step(d, { delta: -0.0003 });
  const wasRaised = d.wrongWay;
  let clearedAt = null;
  for (let i = 0; i < 120; i += 1) {
    step(d, { delta: 0.00035 });
    if (!d.wrongWay && clearedAt === null) clearedAt = i * DT;
  }
  check('raised before correcting', wasRaised, true);
  check('clears once going forward again', d.wrongWay, false);
  check('clears in under 0.4s (3x decay)', clearedAt !== null && clearedAt < 0.4, true);
}

const failed = cases.filter((c) => !c.pass).length;
process.stdout.write(`\n${cases.length} cases -> ${failed ? `${failed} FAILURES` : 'PASS'}\n`);
if (failed) process.exit(1);
