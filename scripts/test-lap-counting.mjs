// P3 exit criterion, docs/FREE_BODY_PLAN.md.
//
// Once the kart can turn round, the old wrap-based lap test
// (`previousProgress > 0.86 && progress < 0.18`) fires on every crossing in
// either direction — so reversing over the start line and re-crossing forwards
// awards a lap every few seconds. This asserts the replacement.
//
//   node scripts/test-lap-counting.mjs
//
// The counter under test is deliberately reproduced here rather than imported:
// it is four lines living inside a 12.6k-line React component that cannot be
// loaded in node. The four lines are quoted in the header of each case so a
// drift between this and the monolith is visible in review.
//
//   let delta = progress - previousProgress
//   if (delta >  0.5) delta -= 1
//   if (delta < -0.5) delta += 1
//   cumulativeProgress += delta
//   if (cumulativeProgress >= lapsAwarded + 1) lapsAwarded += 1

const makeCounter = () => ({
  cumulativeProgress: 0,
  lapsAwarded: 0,
  previousProgress: 0,
  laps: [],
});

const advance = (state, progress) => {
  let delta = progress - state.previousProgress;
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  state.cumulativeProgress += delta;
  state.previousProgress = progress;
  if (state.cumulativeProgress >= state.lapsAwarded + 1) {
    state.lapsAwarded += 1;
    state.laps.push(Number(state.cumulativeProgress.toFixed(3)));
  }
};

// Walk from `from` to `to` in small steps, like a kart.
//
// DIRECTION IS EXPLICIT. An earlier version took the short way round, which
// silently drove a long forward leg (0.25 -> 0.999) BACKWARDS as -0.251 and
// made a legitimate case fail. The counter was right and the harness was wrong;
// a lap test whose own helper picks a direction by magnitude cannot be trusted
// to say which direction the kart went.
const drive = (state, from, to, direction, steps = 600) => {
  let delta = ((to - from) % 1 + 1) % 1; // forward distance from -> to
  if (direction < 0) delta -= 1; // the backward way round the same two points
  for (let i = 1; i <= steps; i += 1) {
    const p = from + (delta * i) / steps;
    advance(state, ((p % 1) + 1) % 1);
  }
};
const driveForward = (state, from, to) => drive(state, from, to, 1);
const driveBackward = (state, from, to) => drive(state, from, to, -1);

const cases = [];
const check = (name, actual, expected) => {
  const pass = actual === expected;
  cases.push({ name, actual, expected, pass });
  process.stdout.write(`  ${pass ? 'ok  ' : 'FAIL'} ${name.padEnd(58)} got ${actual}, want ${expected}\n`);
};

process.stdout.write('lap counting\n');

// 1. A clean lap awards exactly one.
{
  const s = makeCounter();
  driveForward(s, 0, 0.5);
  driveForward(s, 0.5, 0.999);
  driveForward(s, 0.999, 0.02);
  check('one clean forward lap awards 1', s.lapsAwarded, 1);
}

// 2. Three clean laps award exactly three.
{
  const s = makeCounter();
  for (let lap = 0; lap < 3; lap += 1) {
    driveForward(s, 0.02, 0.5);
    driveForward(s, 0.5, 0.999);
    driveForward(s, 0.999, 0.02);
  }
  check('three clean forward laps award 3', s.lapsAwarded, 3);
}

// 3. THE EXPLOIT: reverse over the line and re-cross forward, repeatedly.
//    Under the old wrap test this awarded a lap on every forward crossing.
{
  const s = makeCounter();
  driveBackward(s, 0, 0.98); // reverse from the grid back over the line
  for (let i = 0; i < 10; i += 1) {
    driveForward(s, 0.98, 0.02); // forward over the line
    driveBackward(s, 0.02, 0.98); // back over it again
  }
  check('reversing over the line 10x awards 0', s.lapsAwarded, 0);
}

// 4. Driving backwards from the start never goes negative into a lap.
{
  const s = makeCounter();
  driveBackward(s, 0, 0.9);
  driveBackward(s, 0.9, 0.6);
  check('driving backwards awards 0', s.lapsAwarded, 0);
  check('driving backwards leaves cumulative negative', s.cumulativeProgress < 0, true);
}

// 5. A lap completed AFTER a backwards excursion still awards exactly one, and
//    only once the lost distance has genuinely been made up.
{
  const s = makeCounter();
  driveForward(s, 0, 0.4);
  driveBackward(s, 0.4, 0.25); // lose ground
  driveForward(s, 0.25, 0.999);
  driveForward(s, 0.999, 0.02);
  check('backwards excursion then a full lap awards 1', s.lapsAwarded, 1);
}

// 6. Oscillating mid-lap, nowhere near the line, awards nothing.
{
  const s = makeCounter();
  driveForward(s, 0, 0.5);
  for (let i = 0; i < 20; i += 1) {
    driveForward(s, 0.5, 0.55);
    driveBackward(s, 0.55, 0.5);
  }
  check('oscillating mid-lap awards 0', s.lapsAwarded, 0);
}

const failed = cases.filter((c) => !c.pass).length;
process.stdout.write(`\n${cases.length} cases -> ${failed ? `${failed} FAILURES` : 'PASS'}\n`);
if (failed) process.exit(1);
