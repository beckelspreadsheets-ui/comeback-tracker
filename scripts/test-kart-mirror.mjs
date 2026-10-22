// Mirror mode: steering inversion, separate records and ghosts, and the
// Grand Prix unlock.
//
//   node scripts/test-kart-mirror.mjs
//
// The picture flips (CSS scaleX(-1) on the race canvas), so the only thing
// that keeps the game playable is that every PLAYER input source is inverted
// exactly once, and autoplay never is. These cases drive the frame loop's own
// steering read: mirrorSteerInput(mergeGamepadInput(readInput(...), pad)),
// then targetSteer = steerAxis ?? (right - left).
import assert from 'node:assert/strict';
import { mergeGamepadInput, pollGamepad } from '../src/game/race/gamepadInput.js';
import { createDriftState, updateDriftFeel } from '../src/game/race/driftFeel.js';
import {
  MIRROR_FLIP_STYLE,
  isMirrorRecordKey,
  mirrorRecordKey,
  mirrorSteerInput,
  recordsForMode,
} from '../src/game/race/mirrorMode.js';
import { readGhost, saveGhostIfBest } from '../src/game/race/replayGhost.js';
import { readRaceResults, recordRaceFinish } from '../src/kart/kartLocalStore.js';
import { applyRaceToCup, createCup } from '../src/kart/cupMode.js';
import {
  MIRROR_CHOICE_KEY,
  MIRROR_UNLOCK_KEY,
  cupUnlocksMirror,
  initialMirrorSetup,
  isMirrorActive,
  mirrorAvailable,
  parseMirrorParam,
  readMirrorChoice,
  readMirrorUnlocked,
  unlockMirror,
  writeMirrorChoice,
} from '../src/kart/mirrorUnlock.js';

const storage = new Map();
const memoryStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  removeItem: (key) => storage.delete(key),
  setItem: (key, value) => storage.set(key, String(value)),
};
globalThis.window = { localStorage: memoryStorage, location: { search: '' } };

let passed = 0;
const ok = (name, fn) => {
  fn();
  passed += 1;
  process.stdout.write(`  ok   ${name}\n`);
};

// The live input object's shape (inputRef in the monolith).
const IDLE = Object.freeze({
  autoThrottle: false,
  brake: false,
  drift: false,
  item: false,
  left: false,
  restart: false,
  right: false,
  steerAxis: null,
  throttle: false,
});
const simSteer = (input) => input.steerAxis ?? ((input.right ? 1 : 0) - (input.left ? 1 : 0));
// The picture is flipped, so a simulation direction shows reversed on screen.
const screenSteer = (input, mirror) => (mirror ? -1 : 1) * simSteer(input);
const framePipeline = (raw, pad, { autoplay = false, mirror }) =>
  mirrorSteerInput(mergeGamepadInput(raw, pad), { autoplay, mirror });

const padWith = ({ axis = 0, down = [] } = {}) => ({
  axes: [axis],
  buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: down.includes(i), value: down.includes(i) ? 1 : 0 })),
  connected: true,
  mapping: 'standard',
});
const pollWith = (pad) => {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [pad] } });
  return pollGamepad();
};

process.stdout.write('steering inversion\n');

ok('mirror off returns the very same input object', () => {
  const input = { ...IDLE, left: true };
  assert.equal(mirrorSteerInput(input, { mirror: false }), input);
  assert.equal(mirrorSteerInput(input), input);
});

ok('autoplay is never inverted, mirror or not', () => {
  const driver = { brake: false, drift: true, item: false, left: true, restart: false, right: false, throttle: true };
  assert.equal(mirrorSteerInput(driver, { autoplay: true, mirror: true }), driver);
  assert.equal(simSteer(framePipeline(driver, null, { autoplay: true, mirror: true })), -1);
});

ok('keys swap, analog negates, nothing else changes, input not mutated', () => {
  const input = { ...IDLE, brake: true, drift: true, item: true, left: true, throttle: true };
  const before = { ...input };
  const out = mirrorSteerInput(input, { mirror: true });
  assert.notEqual(out, input);
  assert.deepEqual(input, before, 'the live inputRef object must not be mutated');
  assert.deepEqual(out, { ...input, left: false, right: true });
  assert.equal(mirrorSteerInput({ ...IDLE, steerAxis: 0.6 }, { mirror: true }).steerAxis, -0.6);
  assert.ok(Object.is(mirrorSteerInput({ ...IDLE, steerAxis: 0 }, { mirror: true }).steerAxis, 0), 'zero stays +0');
  assert.equal(mirrorSteerInput({ ...IDLE, steerAxis: null }, { mirror: true }).steerAxis, null, 'null keeps keys in charge');
  const twice = mirrorSteerInput(mirrorSteerInput({ ...IDLE, right: true, steerAxis: -0.3 }, { mirror: true }), { mirror: true });
  assert.deepEqual(twice, { ...IDLE, right: true, steerAxis: -0.3 }, 'inverting twice is the identity');
});

const sources = [
  { name: 'keyboard ArrowLeft / A', raw: { ...IDLE, left: true }, pad: null, want: -1 },
  { name: 'keyboard ArrowRight / D', raw: { ...IDLE, right: true }, pad: null, want: 1 },
  { name: 'touch drag left (floating stick)', raw: { ...IDLE, steerAxis: -0.7 }, pad: null, want: -0.7 },
  { name: 'touch drag right, half lock', raw: { ...IDLE, steerAxis: 0.5 }, pad: null, want: 0.5 },
  { name: 'tilt steering, rolled right', raw: { ...IDLE, steerAxis: 0.45 }, pad: null, want: 0.45 },
  { name: 'tilt steering, rolled left', raw: { ...IDLE, steerAxis: -0.2 }, pad: null, want: -0.2 },
  { name: 'gamepad stick full left', raw: IDLE, pad: () => pollWith(padWith({ axis: -1 })), want: -1 },
  { name: 'gamepad d-pad right', raw: IDLE, pad: () => pollWith(padWith({ down: [15] })), want: 1 },
  { name: 'gamepad d-pad left over held D key', raw: { ...IDLE, right: true }, pad: () => pollWith(padWith({ down: [14] })), want: -1 },
];
for (const source of sources) {
  ok(`${source.name}: turns the same way ON SCREEN in both modes`, () => {
    const pad = typeof source.pad === 'function' ? source.pad() : source.pad;
    assert.equal(screenSteer(framePipeline(source.raw, pad, { mirror: false }), false), source.want, 'normal');
    assert.equal(screenSteer(framePipeline(source.raw, pad, { mirror: true }), true), source.want, 'mirror');
    assert.equal(simSteer(framePipeline(source.raw, pad, { mirror: true })), -source.want, 'sim steer is inverted');
  });
}

ok('flick-to-drift drifts toward the flick on screen (drift side comes from the steer)', () => {
  for (const flick of [-0.9, 0.9]) {
    const input = framePipeline({ ...IDLE, drift: true, steerAxis: flick }, null, { mirror: true });
    const drift = createDriftState();
    for (let t = 0; t < 0.5; t += 1 / 60) {
      updateDriftFeel(drift, { dt: 1 / 60, held: input.drift, speed: 140, steer: simSteer(input) });
    }
    assert.equal(drift.active, true);
    assert.equal(-drift.direction, Math.sign(flick), 'on-screen drift side matches the flick');
  }
});

ok('the flip itself is one shared, frozen scaleX(-1)', () => {
  assert.equal(MIRROR_FLIP_STYLE.transform, 'scaleX(-1)');
  assert.ok(Object.isFrozen(MIRROR_FLIP_STYLE));
});

process.stdout.write('records\n');

ok('record keys: normal untouched, mirror suffixed once', () => {
  assert.equal(mirrorRecordKey('comeback-city', false), 'comeback-city');
  assert.equal(mirrorRecordKey('comeback-city', undefined), 'comeback-city');
  assert.equal(mirrorRecordKey('comeback-city', true), 'comeback-city:mirror');
  assert.equal(mirrorRecordKey('comeback-city:mirror', true), 'comeback-city:mirror');
  assert.equal(isMirrorRecordKey('penguin-village:mirror'), true);
  assert.equal(isMirrorRecordKey('penguin-village'), false);
});

ok('a mirror finish never touches the normal record, and old saves stay valid', () => {
  storage.clear();
  const legacy = { bestLap: 30, bestPlace: 1, bestTime: 100, podiums: 3, runs: 5, wins: 2 };
  storage.set('cc-kart-results', JSON.stringify({ 'comeback-city': legacy }));
  recordRaceFinish({ bestLap: 25, mirror: true, place: 1, time: 90, trackKey: 'comeback-city' });
  let results = readRaceResults();
  assert.deepEqual(results['comeback-city'], legacy, 'faster mirror run leaves the normal entry byte-identical');
  assert.deepEqual(results['comeback-city:mirror'], {
    bestLap: 25,
    bestPlace: 1,
    bestTime: 90,
    podiums: 1,
    runs: 1,
    wins: 1,
  });
  recordRaceFinish({ bestLap: 29, place: 2, time: 95, trackKey: 'comeback-city' });
  recordRaceFinish({ bestLap: 40, mirror: false, place: 4, time: 130, trackKey: 'comeback-city' });
  results = readRaceResults();
  assert.equal(results['comeback-city'].bestTime, 95);
  assert.equal(results['comeback-city'].bestLap, 29);
  assert.equal(results['comeback-city'].runs, 7);
  assert.equal(results['comeback-city:mirror'].bestTime, 90, 'normal runs leave the mirror best alone');
  assert.equal(results['comeback-city:mirror'].runs, 1);
});

ok('mirror time trials set mirror bests only', () => {
  storage.clear();
  recordRaceFinish({ bestLap: 31, time: 101, timeTrial: true, trackKey: 'penguin-village' });
  recordRaceFinish({ bestLap: 28, mirror: true, time: 97, timeTrial: true, trackKey: 'penguin-village' });
  const results = readRaceResults();
  assert.equal(results['penguin-village'].bestTime, 101);
  assert.equal(results['penguin-village:mirror'].bestTime, 97);
  assert.equal(results['penguin-village:mirror'].runs, undefined, 'time trials count no runs');
});

ok('the setup screen sees one mode at a time, keyed by plain track key', () => {
  const saved = {
    'comeback-city': { bestTime: 100 },
    'comeback-city:mirror': { bestTime: 90 },
    'penguin-village': { bestTime: 120 },
  };
  assert.deepEqual(recordsForMode(saved, false), { 'comeback-city': { bestTime: 100 }, 'penguin-village': { bestTime: 120 } });
  assert.deepEqual(recordsForMode(saved, true), { 'comeback-city': { bestTime: 90 } });
  assert.deepEqual(recordsForMode(null, true), {});
});

ok('time-trial ghosts: mirror saves beside the normal ghost, never over it', () => {
  storage.clear();
  const sig = 'comeback-city:11600';
  const run = (time) => ({ character: 'seth-penguin', kart: 'hero', samples: [0, 0, 0, 0.5, 0.1, 0], time });
  // A ghost saved before mirror mode existed, under the original key.
  storage.set('cc-kart-ghost-v2-comeback-city', JSON.stringify({ ...run(100), signature: sig }));
  const mirrorKey = mirrorRecordKey('comeback-city', true);
  assert.equal(readGhost(mirrorKey, sig), null, 'no mirror ghost until a mirror run sets one');
  assert.equal(saveGhostIfBest(mirrorKey, sig, run(80)), true);
  assert.ok(storage.has('cc-kart-ghost-v2-comeback-city:mirror'));
  assert.equal(readGhost('comeback-city', sig).time, 100, 'the faster mirror run did not replace the normal ghost');
  assert.equal(readGhost(mirrorKey, sig).time, 80);
  assert.equal(saveGhostIfBest('comeback-city', sig, run(90)), true);
  assert.equal(readGhost(mirrorKey, sig).time, 80, 'and a normal record leaves the mirror ghost alone');
});

process.stdout.write('unlock\n');

const finish = (cup, order) => applyRaceToCup(cup, order.map((name) => ({ isPlayer: name === 'You', name })));

ok('only a finished Grand Prix with the player first overall unlocks', () => {
  const tracks = ['comeback-city', 'penguin-village'];
  assert.equal(cupUnlocksMirror(null), false);
  let cup = finish(createCup(tracks), ['You', 'Blue', 'Red', 'Gold']);
  assert.equal(cupUnlocksMirror(cup), false, 'leading after race 1 is not a cup win');
  assert.equal(cupUnlocksMirror(finish(cup, ['You', 'Blue', 'Red', 'Gold'])), true);
  assert.equal(cupUnlocksMirror(finish(cup, ['Blue', 'Red', 'Gold', 'You'])), false, '15 + 9 trails Blue on 12 + 15');
  cup = finish(createCup(tracks), ['Blue', 'You', 'Red', 'Gold']);
  assert.equal(cupUnlocksMirror(finish(cup, ['You', 'Blue', 'Red', 'Gold'])), true, 'level on 27, the last race breaks the tie');
  assert.equal(cupUnlocksMirror(finish(finish(createCup(tracks), ['You', 'Blue']), ['Blue', 'You'])), false, 'tie lost on the last race');
});

ok('unlock and switch persist under their own keys', () => {
  storage.clear();
  assert.equal(readMirrorUnlocked(), false);
  assert.equal(readMirrorChoice(), false);
  assert.equal(unlockMirror(), true);
  assert.equal(storage.get(MIRROR_UNLOCK_KEY), '1');
  assert.equal(MIRROR_UNLOCK_KEY, 'cc-kart-mirror-unlocked');
  assert.equal(readMirrorUnlocked(), true);
  writeMirrorChoice(true);
  assert.equal(storage.get(MIRROR_CHOICE_KEY), '1');
  assert.equal(MIRROR_CHOICE_KEY, 'cc-kart-mirror');
  assert.equal(readMirrorChoice(), true);
  writeMirrorChoice(false);
  assert.equal(readMirrorChoice(), false);
});

ok('no storage, or storage that throws, reads locked and off without throwing', () => {
  const saved = globalThis.window.localStorage;
  globalThis.window.localStorage = undefined;
  assert.equal(readMirrorUnlocked(), false);
  assert.equal(unlockMirror(), false);
  globalThis.window.localStorage = {
    getItem: () => {
      throw new Error('SecurityError');
    },
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  };
  assert.equal(readMirrorChoice(), false);
  assert.equal(writeMirrorChoice(true), false);
  globalThis.window.localStorage = saved;
});

ok('?mirror=1 forces on even while locked, ?mirror=0 forces off, the switch needs the unlock', () => {
  assert.equal(parseMirrorParam('?mirror=1'), true);
  assert.equal(parseMirrorParam('?track=penguin-village&mirror=0'), false);
  assert.equal(parseMirrorParam('?mirror=yes'), null);
  assert.equal(parseMirrorParam(''), null);
  assert.equal(parseMirrorParam(undefined), null);
  const active = (args) => isMirrorActive(initialMirrorSetup(args));
  assert.equal(active({ choice: false, override: true, unlocked: false }), true);
  assert.equal(mirrorAvailable(initialMirrorSetup({ choice: false, override: true, unlocked: false })), true);
  assert.equal(active({ choice: true, override: false, unlocked: true }), false);
  assert.equal(mirrorAvailable(initialMirrorSetup({ choice: false, override: false, unlocked: false })), false, '=0 unlocks nothing');
  assert.equal(active({ choice: true, override: null, unlocked: true }), true);
  assert.equal(active({ choice: true, override: null, unlocked: false }), false, 'a saved choice alone is not an unlock');
  assert.equal(active({ choice: false, override: null, unlocked: true }), false);
  storage.clear();
  globalThis.window.location.search = '?mirror=1';
  assert.equal(isMirrorActive(initialMirrorSetup()), true, 'defaults read the live URL and storage');
  globalThis.window.location.search = '';
  assert.equal(isMirrorActive(initialMirrorSetup()), false);
});

process.stdout.write(`\n${passed} cases -> PASS\n`);
