// First-race coaching (src/game/race/coaching.js): which prompt shows when,
// completion, the 2-race retirement, touch vs keyboard vs pad wording,
// persistence and corrupt-storage recovery, and the corner/pad readers.
import assert from 'node:assert/strict';
import {
  COACH_PROMPT_IDS,
  COACH_RETIRE_AFTER_RACES,
  COACH_STORAGE_KEY,
  COACH_TUNING,
  coachEligible,
  coachEnabled,
  coachItemName,
  coachLeadUnits,
  coachMessage,
  coachScheme,
  coachStartProgress,
  cornerWindowAt,
  createCoachRace,
  findCorners,
  freshCoachMemory,
  padWindowAt,
  readCoachMemory,
  sanitizeCoachMemory,
  stepCoachRace,
  writeCoachMemory,
} from '../src/game/race/coaching.js';
import { ITEM_KEYS } from '../src/game/race/heldItems.js';

const makeStorage = (seed = {}) => {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    map,
    setItem: (key, value) => map.set(key, String(value)),
  };
};
const throwingStorage = {
  getItem: () => {
    throw new Error('SecurityError: site data blocked');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

// One HUD snapshot's worth of coaching input, racing and idle by default.
const F = (overrides = {}) => ({
  boostHits: 0,
  corner: null,
  countdown: 0,
  drift: false,
  driftTier: 0,
  finished: false,
  heldItem: null,
  lap: 1,
  miniTurboTier: 0,
  pad: null,
  raceTime: 2,
  ttBoosts: null,
  wrongWay: false,
  ...overrides,
});
const CORNER = { distance: 220, index: 0, inside: false };
const PAD = { distance: 150, index: 0 };
const idOf = (result) => result.prompt?.id ?? null;

// ── Persistence ─────────────────────────────────────────────────────────────
{
  const empty = makeStorage();
  assert.deepEqual(readCoachMemory(empty), freshCoachMemory(), 'nothing stored -> fresh record');
  const memory = freshCoachMemory();
  memory.prompts.drift = { done: true, races: 1 };
  memory.prompts.item.races = 2;
  assert.equal(writeCoachMemory(empty, memory), true);
  assert.ok(empty.map.has(COACH_STORAGE_KEY), `persists under ${COACH_STORAGE_KEY}`);
  assert.deepEqual(readCoachMemory(empty), memory, 'round trip');

  for (const raw of ['{not json', 'null', '42', '"drift"', '[]', '{"prompts":[]}', '{"prompts":"x"}', '']) {
    const storage = makeStorage({ [COACH_STORAGE_KEY]: raw });
    assert.deepEqual(readCoachMemory(storage), freshCoachMemory(), `corrupt ${JSON.stringify(raw)} -> fresh`);
  }
  const junk = makeStorage({
    [COACH_STORAGE_KEY]: JSON.stringify({
      prompts: {
        drift: { done: 'yes', races: -4 },
        item: { done: true, races: 2.7 },
        pad: null,
        release: { done: false, races: 'lots' },
        rogue: { done: true, races: 1 },
      },
    }),
  });
  const cleaned = readCoachMemory(junk);
  assert.deepEqual(cleaned.prompts.drift, { done: false, races: 0 }, 'non-boolean done and negative count reset');
  assert.deepEqual(cleaned.prompts.item, { done: true, races: 2 }, 'fractional count floors');
  assert.deepEqual(cleaned.prompts.pad, { done: false, races: 0 }, 'missing entry is fresh');
  assert.deepEqual(cleaned.prompts.release, { done: false, races: 0 }, 'NaN count resets');
  assert.equal(cleaned.prompts.rogue, undefined, 'unknown prompts dropped');
  assert.deepEqual(Object.keys(sanitizeCoachMemory({}).prompts), [...COACH_PROMPT_IDS]);

  // Private mode / blocked site data throws on access: no crash, fresh record.
  assert.deepEqual(readCoachMemory(throwingStorage), freshCoachMemory());
  assert.equal(writeCoachMemory(throwingStorage, memory), false);
  assert.deepEqual(readCoachMemory(null), freshCoachMemory());

  // A corrupt value is replaced by a clean one on the first write.
  const corrupt = makeStorage({ [COACH_STORAGE_KEY]: '{oops' });
  const race = createCoachRace(readCoachMemory(corrupt));
  const result = stepCoachRace(race, F({ corner: CORNER }));
  assert.equal(result.changed, true);
  writeCoachMemory(corrupt, race.memory);
  assert.equal(JSON.parse(corrupt.map.get(COACH_STORAGE_KEY)).prompts.drift.races, 1, 'rewritten as valid JSON');
}
console.log('PASS: persistence round-trips, corrupt or blocked storage resets cleanly');

// ── Gates and wording ───────────────────────────────────────────────────────
{
  assert.equal(coachEnabled({}), true, 'a real player gets coaching');
  assert.equal(coachEnabled({ autoplay: true }), false, 'autoplay: off');
  assert.equal(coachEnabled({ webdriver: true }), false, 'webdriver: off');
  assert.equal(coachEnabled({ autoplay: true, forced: true, webdriver: true }), true, '?coach=1 forces it on');

  assert.equal(coachScheme({ touch: true }), 'touch');
  assert.equal(coachScheme({ lastDevice: 'keys', touch: true }), 'touch', 'a phone never switches to key wording');
  assert.equal(coachScheme({ touch: false }), 'keyboard');
  assert.equal(coachScheme({ lastDevice: 'pointer', touch: false }), 'keyboard', 'a desktop mouse never means touch wording');
  assert.equal(coachScheme({ lastDevice: 'pad', touch: false }), 'pad');
  assert.equal(coachScheme({ lastDevice: 'pad', touch: true }), 'pad', 'a controller on a phone gets pad wording');

  const text = (id, scheme, extra) => coachMessage(id, scheme, extra).text;
  assert.equal(text('drift', 'touch'), 'Flick toward the turn to drift');
  assert.equal(text('drift', 'keyboard'), 'Hold Space to drift');
  assert.equal(text('drift', 'pad'), 'Hold RB to drift');
  assert.deepEqual(coachMessage('drift', 'keyboard').parts, ['Hold ', { key: 'Space' }, ' to drift'], 'key renders as a cap');
  assert.equal(text('release', 'touch'), 'Lift your thumb to boost!');
  assert.equal(text('release', 'keyboard'), 'Let go to boost!');
  assert.equal(text('release', 'pad'), 'Let go to boost!');
  assert.equal(text('item', 'touch', { heldItem: 'snowball', projectileSkin: 'snowball' }), 'Tap to throw your Snowball');
  assert.equal(text('item', 'touch', { heldItem: 'snowball', projectileSkin: 'carrot' }), 'Tap to throw your Carrot');
  assert.equal(text('item', 'touch', { heldItem: 'snowball', projectileSkin: 'iceshard' }), 'Tap to throw your Ice Shard');
  assert.equal(text('item', 'touch', { heldItem: 'sardine' }), 'Tap to throw your Rocket Sardine');
  assert.equal(text('item', 'touch', { heldItem: 'cocoa' }), 'Tap to use your Hot Cocoa', 'nobody throws a cocoa');
  assert.equal(text('item', 'touch', { heldItem: 'fishbone' }), 'Tap to drop your Fish Bone');
  assert.equal(text('item', 'touch', { heldItem: 'slapfish' }), 'Tap to swing your Slap Fish');
  assert.equal(text('item', 'keyboard', { heldItem: 'snowball', projectileSkin: 'snowball' }), 'Press E to use your Snowball');
  assert.equal(text('item', 'keyboard', { heldItem: 'cocoa' }), 'Press E to use your Hot Cocoa');
  assert.equal(text('item', 'pad', { heldItem: 'sardine' }), 'Press LB to use your Rocket Sardine');
  for (const scheme of ['touch', 'keyboard', 'pad']) {
    assert.equal(text('pad', scheme), 'Drive over the arrows for a boost');
  }
  for (const key of ITEM_KEYS) {
    assert.notEqual(coachItemName(key, 'snowball'), 'item', `${key} has a display name`);
  }
  // No scheme ever leaks the other's vocabulary — every prompt, every item.
  const keyWords = /\b(press|space|key|keys|keyboard|click|RB|LB|E)\b/i;
  const touchWords = /\b(tap|flick|thumb|swipe|touch)\b/i;
  for (const id of COACH_PROMPT_IDS) {
    for (const heldItem of [null, ...ITEM_KEYS]) {
      for (const projectileSkin of ['snowball', 'carrot', 'iceshard']) {
        const touch = coachMessage(id, 'touch', { heldItem, projectileSkin });
        assert.ok(!keyWords.test(touch.text), `touch wording leaked a key: "${touch.text}"`);
        assert.ok(touch.parts.every((part) => typeof part === 'string'), 'touch wording has no key caps');
        for (const scheme of ['keyboard', 'pad']) {
          const keyed = coachMessage(id, scheme, { heldItem, projectileSkin });
          assert.ok(!touchWords.test(keyed.text), `${scheme} wording leaked touch: "${keyed.text}"`);
        }
      }
    }
  }
}
console.log('PASS: gates, scheme choice, and touch / keyboard / pad wording never cross');

// ── Track readers ───────────────────────────────────────────────────────────
// A synthetic loop of straights and constant-radius arcs: tangentAt is exact,
// so the detector is measured against known corners.
const arc = (radius, turnDeg) => ({ len: (Math.abs(turnDeg) * Math.PI * radius) / 180, turnDeg });
const straight = (len) => ({ len, turnDeg: 0 });
const makeTrack = (segments) => {
  const length = segments.reduce((sum, seg) => sum + seg.len, 0);
  const headingAt = (units) => {
    let s = ((units % length) + length) % length;
    let heading = 0;
    for (const seg of segments) {
      const turn = (seg.turnDeg * Math.PI) / 180;
      if (s <= seg.len) return heading + turn * (s / seg.len);
      heading += turn;
      s -= seg.len;
    }
    return heading;
  };
  const starts = [];
  segments.reduce((at, seg) => {
    starts.push(at);
    return at + seg.len;
  }, 0);
  return {
    length,
    starts,
    tangentAt: (progress) => {
      const heading = headingAt(progress * length);
      return { x: Math.cos(heading), z: Math.sin(heading) };
    },
  };
};
{
  const segments = [
    straight(600),
    arc(150, 45), // 1: real corner (κ 0.0067)
    straight(300),
    arc(600, 60), // 3: gentle sweeper (κ 0.0017) — steer, don't drift
    straight(300),
    arc(100, 10), // 5: a kink — sharp but only 10°
    straight(300),
    arc(150, 45), // 7: S-bend, left...
    arc(150, -45), // 8: ...then right
    straight(300),
    arc(250, 60), // 10: κ 0.004, steerable at top speed
    straight(400),
    arc(125, 175), // 12: the hairpin that closes the loop (45+60+10+60+175 = 350)...
    straight(200),
    arc(300, 10), // 14: ...plus a 10° nudge to make it 360
    straight(200),
  ];
  const track = makeTrack(segments);
  const corners = findCorners({ length: track.length, startProgress: 0, tangentAt: track.tangentAt });
  assert.equal(corners.length, 4, `four real corners, got ${JSON.stringify(corners)}`);
  assert.deepEqual(
    corners.map((corner) => corner.direction),
    [1, 1, -1, 1],
    'S-bend splits by direction'
  );
  const near = (value, target, tolerance, label) =>
    assert.ok(Math.abs(value - target) <= tolerance, `${label}: ${value} vs ${target}`);
  near(corners[0].entry * track.length, track.starts[1], 30, 'first corner entry');
  near(corners[0].turnDeg, 45, 6, 'first corner turn');
  near(corners[3].turnDeg, 175, 8, 'hairpin turn');
  near(corners[3].entry * track.length, track.starts[12], 30, 'hairpin entry');
  assert.ok(corners.every((corner) => corner.spanUnits > 0));

  // Starting the scan in the middle of a corner must not split it in two.
  const midFirst = (track.starts[1] + segments[1].len / 2) / track.length;
  const seam = findCorners({ length: track.length, startProgress: midFirst, tangentAt: track.tangentAt });
  assert.equal(seam.length, 4, 'seam-straddling corner merged');
  near(seam[seam.length - 1].turnDeg, 45, 6, 'merged corner keeps its full turn');
  assert.deepEqual(findCorners({ length: 0, tangentAt: track.tangentAt }), []);
  assert.deepEqual(findCorners({ length: 100 }), []);

  // Window: lead-in, inside, nearest wins, nothing when the road is clear.
  const at = (units) => units / track.length;
  const entry = corners[0].entry * track.length;
  assert.equal(cornerWindowAt(corners, at(entry - 300), track.length, 200), null, 'too far ahead');
  const lead = cornerWindowAt(corners, at(entry - 150), track.length, 200);
  assert.equal(lead.index, 0);
  assert.equal(lead.inside, false);
  near(lead.distance, 150, 1, 'lead distance');
  const inside = cornerWindowAt(corners, at(entry + 20), track.length, 200);
  assert.equal(inside.inside, true);
  assert.equal(inside.distance, 0);
  assert.equal(cornerWindowAt(corners, at(entry + corners[0].spanUnits + 40), track.length, 200), null, 'past the exit');
  assert.equal(cornerWindowAt([], 0, track.length, 200), null);

  // Lead distance scales with speed above a floor.
  assert.equal(coachLeadUnits(0), COACH_TUNING.cornerLeadMinUnits);
  assert.equal(coachLeadUnits(228), 228 * COACH_TUNING.cornerLeadSeconds);
  assert.equal(coachLeadUnits(10, 'pad'), COACH_TUNING.padLeadMinUnits);

  // Pads: ahead within the lead, just under the kart, then gone.
  const pads = [{ progress: 0.5 }, { progress: 0.9 }];
  assert.equal(padWindowAt(pads, 0.5 - 100 / 10000, 10000, 200).distance.toFixed(0), '100');
  assert.equal(padWindowAt(pads, 0.5 + 20 / 10000, 10000, 200).distance.toFixed(0), '-20');
  assert.equal(padWindowAt(pads, 0.5 + 80 / 10000, 10000, 200), null);
  assert.equal(padWindowAt(pads, 0.2, 10000, 200), null);
  assert.equal(padWindowAt(pads, 0.9 - 50 / 10000, 10000, 200).index, 1);

  assert.equal(coachStartProgress({ course: { startProgress: 0.04 }, startOffset: 0.01 }).toFixed(2), '0.05');
  assert.equal(coachStartProgress({ course: { startProgress: 0.99 }, startOffset: 0.02 }).toFixed(2), '0.01');
}
console.log('PASS: real corners found (gentle sweepers, kinks and steerable bends ignored), windows and pads');

// ── The race: which prompt, when ────────────────────────────────────────────
{
  const memory = freshCoachMemory();
  const race = createCoachRace(memory);
  assert.equal(idOf(stepCoachRace(race, F({ corner: CORNER, countdown: 2.4, raceTime: 0 }))), null, 'never during the countdown');
  assert.equal(idOf(stepCoachRace(race, F({ corner: CORNER, raceTime: 0.4 }))), null, 'GO keeps the screen first');
  let result = stepCoachRace(race, F({ corner: CORNER, raceTime: 1.4 }));
  assert.equal(idOf(result), 'drift', 'corner ahead -> drift prompt');
  assert.equal(result.changed, true, 'first show this race is persisted');
  assert.equal(memory.prompts.drift.races, 1);
  const key = result.prompt.key;
  result = stepCoachRace(race, F({ corner: { ...CORNER, distance: 80 }, raceTime: 1.54 }));
  assert.equal(result.prompt.key, key, 'same appearance while the window stays open');
  assert.equal(result.changed, false);
  result = stepCoachRace(race, F({ corner: { ...CORNER, inside: true, distance: 0 }, drift: true, raceTime: 1.68 }));
  assert.equal(idOf(result), null, 'drifting completes it and clears the slot');
  assert.equal(memory.prompts.drift.done, true);
  assert.equal(result.changed, true);
  result = stepCoachRace(race, F({ drift: true, driftTier: 1, raceTime: 2.16 }));
  assert.equal(idOf(result), null, 'first spark snapshot: not yet (no 0.14s flash for a quick release)');
  result = stepCoachRace(race, F({ drift: true, driftTier: 1, raceTime: 2.3 }));
  assert.equal(idOf(result), 'release', 'sparks holding -> let go');
  result = stepCoachRace(race, F({ drift: true, driftTier: 2, raceTime: 2.44 }));
  assert.equal(idOf(result), 'release', 'still charging');
  result = stepCoachRace(race, F({ drift: false, miniTurboTier: 2, raceTime: 2.58 }));
  assert.equal(idOf(result), null);
  assert.equal(memory.prompts.release.done, true, 'releasing a charged drift completes it');
  // Done is done: later corners and drifts stay quiet.
  assert.equal(idOf(stepCoachRace(race, F({ corner: CORNER, raceTime: 6 }))), null);
  assert.equal(idOf(stepCoachRace(race, F({ drift: true, driftTier: 1, raceTime: 7 }))), null);
}
{
  // A drift that dies without a mini-turbo (too slow, spun) is not a release.
  const memory = freshCoachMemory();
  const race = createCoachRace(memory);
  stepCoachRace(race, F({ drift: true, driftTier: 1, raceTime: 2.86 }));
  assert.equal(idOf(stepCoachRace(race, F({ drift: true, driftTier: 1, raceTime: 3 }))), 'release');
  assert.equal(idOf(stepCoachRace(race, F({ drift: false, miniTurboTier: 0, raceTime: 3.14 }))), null);
  assert.equal(memory.prompts.release.done, false, 'cancelled drift does not count');
  assert.equal(memory.prompts.drift.done, true, 'but it was a drift');
}
{
  // Let go the instant the sparks show: learned, and the prompt never flashed.
  const memory = freshCoachMemory();
  const race = createCoachRace(memory);
  const seen = [];
  seen.push(idOf(stepCoachRace(race, F({ drift: true, raceTime: 3 }))));
  seen.push(idOf(stepCoachRace(race, F({ drift: true, driftTier: 1, raceTime: 3.14 }))));
  seen.push(idOf(stepCoachRace(race, F({ drift: false, miniTurboTier: 1, raceTime: 3.28 }))));
  assert.deepEqual(seen, [null, null, null]);
  assert.equal(memory.prompts.release.done, true);
  assert.equal(memory.prompts.release.races, 0, 'never shown, so never counted as shown');
}
console.log('PASS: drift prompt before the corner, completes on drift; let-go on sparks, completes only on a charged release');

{
  const memory = freshCoachMemory();
  const race = createCoachRace(memory);
  assert.equal(idOf(stepCoachRace(race, F({ heldItem: 'snowball', raceTime: 3 }))), 'item');
  assert.equal(idOf(stepCoachRace(race, F({ heldItem: 'snowball', raceTime: 3.14 }))), 'item');
  assert.equal(idOf(stepCoachRace(race, F({ heldItem: null, raceTime: 3.28 }))), null);
  assert.equal(memory.prompts.item.done, true, 'using the item completes it');
}
{
  // Held but never used: the prompt gives up after itemSeconds on screen.
  const race = createCoachRace(freshCoachMemory());
  let shownUntil = null;
  for (let t = 3; t <= 12; t = Number((t + 0.14).toFixed(2))) {
    if (idOf(stepCoachRace(race, F({ heldItem: 'cocoa', raceTime: t }))) === 'item') shownUntil = t;
  }
  assert.ok(shownUntil >= 3 + COACH_TUNING.itemSeconds - 0.3 && shownUntil <= 3 + COACH_TUNING.itemSeconds, `item prompt ran ${shownUntil - 3}s`);
  assert.equal(race.memory.prompts.item.done, false);
}
{
  // Time trial refills the cocoa instantly; the spare count is the tell.
  const race = createCoachRace(freshCoachMemory());
  assert.equal(idOf(stepCoachRace(race, F({ heldItem: 'cocoa', raceTime: 2, ttBoosts: 2 }))), 'item');
  stepCoachRace(race, F({ heldItem: 'cocoa', raceTime: 2.14, ttBoosts: 1 }));
  assert.equal(race.memory.prompts.item.done, true, 'time-trial cocoa use completes it');
}
{
  // Pads: the rocket-start boost on the first racing frame is not a pad hit.
  const memory = freshCoachMemory();
  const race = createCoachRace(memory);
  stepCoachRace(race, F({ boostHits: 0, countdown: 0.1, raceTime: 0 }));
  stepCoachRace(race, F({ boostHits: 1, raceTime: 0.1 }));
  assert.equal(memory.prompts.pad.done, false, 'rocket start excluded');
  assert.equal(idOf(stepCoachRace(race, F({ boostHits: 1, pad: PAD, raceTime: 4 }))), 'pad');
  assert.equal(idOf(stepCoachRace(race, F({ boostHits: 2, pad: { distance: -10, index: 0 }, raceTime: 4.6 }))), null);
  assert.equal(memory.prompts.pad.done, true, 'hitting a pad completes it');
}
console.log('PASS: item prompt (completion, 6s budget, time-trial refill) and boost-pad prompt');

{
  // One at a time: a corner takes the slot from an item, the item resumes as
  // the SAME appearance after a breath, with its unspent budget.
  const race = createCoachRace(freshCoachMemory());
  assert.equal(idOf(stepCoachRace(race, F({ heldItem: 'snowball', raceTime: 2 }))), 'item');
  assert.equal(idOf(stepCoachRace(race, F({ corner: CORNER, heldItem: 'snowball', raceTime: 3 }))), 'drift', 'drift preempts item');
  assert.equal(idOf(stepCoachRace(race, F({ corner: CORNER, heldItem: 'snowball', raceTime: 4 }))), 'drift');
  assert.equal(idOf(stepCoachRace(race, F({ heldItem: 'snowball', raceTime: 4.2 }))), null, 'a breath between prompts');
  assert.equal(idOf(stepCoachRace(race, F({ heldItem: 'snowball', raceTime: 4.6 }))), null, 'still resting');
  assert.equal(idOf(stepCoachRace(race, F({ heldItem: 'snowball', raceTime: 4.9 }))), 'item', 'item resumes');
  assert.equal(race.appearances.item, 1, 'resuming is not a new appearance');
  assert.ok(race.itemBudget > COACH_TUNING.itemSeconds - 1.2, 'time under the drift prompt was not charged');
  // An item prompt is not interrupted by a pad, and a pad prompt waits.
  assert.equal(idOf(stepCoachRace(race, F({ heldItem: 'snowball', pad: PAD, raceTime: 5.04 }))), 'item');
  // With the slot free, the time-critical pad goes before the patient item.
  const fresh = createCoachRace(freshCoachMemory());
  assert.equal(idOf(stepCoachRace(fresh, F({ heldItem: 'snowball', pad: PAD, raceTime: 2 }))), 'pad');
}
{
  // Never over TURN AROUND, nor over the lap banner; never after the flag.
  const race = createCoachRace(freshCoachMemory());
  assert.equal(idOf(stepCoachRace(race, F({ corner: CORNER, raceTime: 3, wrongWay: true }))), null);
  assert.equal(idOf(stepCoachRace(race, F({ corner: CORNER, lap: 2, raceTime: 40 }))), null, 'lap roll-over quiets the coach');
  assert.equal(idOf(stepCoachRace(race, F({ corner: CORNER, lap: 2, raceTime: 41 }))), null);
  assert.equal(idOf(stepCoachRace(race, F({ corner: CORNER, lap: 2, raceTime: 41.6 }))), 'drift');
  assert.equal(idOf(stepCoachRace(race, F({ corner: CORNER, finished: true, lap: 3, raceTime: 120 }))), null);
}
{
  // Per-race cap: a third corner visit in the same race stays quiet.
  const race = createCoachRace(freshCoachMemory());
  const shown = [];
  let t = 2;
  for (let visit = 0; visit < 3; visit += 1) {
    shown.push(idOf(stepCoachRace(race, F({ corner: CORNER, raceTime: t }))));
    stepCoachRace(race, F({ raceTime: t + 1 }));
    t += 5;
  }
  assert.deepEqual(shown, ['drift', 'drift', null], `${COACH_TUNING.appearancesPerRace} appearances per race`);
  assert.equal(race.memory.prompts.drift.races, 1, 'counted once for the race');
}
console.log('PASS: one prompt at a time, priorities, quiet moments, per-race cap');

{
  // Retirement: shown in two races without being done -> never again.
  const storage = makeStorage();
  const raceOnce = (label) => {
    const race = createCoachRace(readCoachMemory(storage));
    const result = stepCoachRace(race, F({ corner: CORNER, raceTime: 3 }));
    if (result.changed) writeCoachMemory(storage, race.memory);
    return idOf(result);
  };
  assert.equal(raceOnce('race 1'), 'drift');
  assert.equal(raceOnce('race 2'), 'drift');
  assert.equal(readCoachMemory(storage).prompts.drift.races, COACH_RETIRE_AFTER_RACES);
  assert.equal(raceOnce('race 3'), null, 'retired after two races');
  // A retired prompt still records the skill when the player finally does it.
  const late = createCoachRace(readCoachMemory(storage));
  assert.equal(coachEligible(late, 'drift'), false);
  const result = stepCoachRace(late, F({ drift: true, raceTime: 5 }));
  assert.equal(result.changed, true);
  writeCoachMemory(storage, late.memory);
  assert.equal(readCoachMemory(storage).prompts.drift.done, true);

  // Completed on the first race -> the next race never shows it.
  const learned = makeStorage();
  const first = createCoachRace(readCoachMemory(learned));
  stepCoachRace(first, F({ heldItem: 'snowball', raceTime: 3 }));
  stepCoachRace(first, F({ heldItem: null, raceTime: 3.14 }));
  writeCoachMemory(learned, first.memory);
  const second = createCoachRace(readCoachMemory(learned));
  assert.equal(idOf(stepCoachRace(second, F({ heldItem: 'sardine', raceTime: 3 }))), null, 'learned, never shown again');

  // ?coach=1 races start from a fresh record, whatever the device says.
  const forced = createCoachRace(freshCoachMemory());
  assert.equal(idOf(stepCoachRace(forced, F({ heldItem: 'sardine', raceTime: 3 }))), 'item');

  // The second race's prompt can still show twice within that race.
  const twice = makeStorage({ [COACH_STORAGE_KEY]: JSON.stringify({ v: 1, prompts: { drift: { done: false, races: 1 } } }) });
  const raceTwo = createCoachRace(readCoachMemory(twice));
  assert.equal(idOf(stepCoachRace(raceTwo, F({ corner: CORNER, raceTime: 3 }))), 'drift');
  stepCoachRace(raceTwo, F({ raceTime: 4 }));
  assert.equal(raceTwo.memory.prompts.drift.races, 2);
  assert.equal(idOf(stepCoachRace(raceTwo, F({ corner: CORNER, raceTime: 8 }))), 'drift', 'second visit in race 2 still shows');
}
console.log('PASS: retirement after 2 races unlearned, learned prompts never return, ?coach=1 starts fresh');
