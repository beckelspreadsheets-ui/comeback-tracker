import assert from 'node:assert/strict';
import { readGhost, saveGhostIfBest, ghostStateAt } from '../src/game/race/replayGhost.js';
const data = new Map();
globalThis.window = { localStorage: { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v) } };
const key = 'cc-kart-ghost-v2-test';
const valid = { signature: 'v1', time: 10, samples: [0, 0, 0, 1, 2, 4] };
for (const bad of [
  { time: -1 }, { time: 0 }, { samples: [] }, { samples: [0, 0, 0, 1] },
  { samples: [0, 0, 0, 1, null, 0] }, { samples: [0, 0, 0, 1, '2', 0] },
]) {
  data.set(key, JSON.stringify({ ...valid, ...bad }));
  assert.equal(readGhost('test', 'v1'), null, 'reject corrupt saved replay');
  assert.equal(saveGhostIfBest('test', 'v1', valid), true, 'valid run replaces corrupt replay');
}
data.clear();
for (const samples of [undefined, [], [0, 0, 0, 1], [0, 0, 0, NaN, 0, 0], [0, 0, 0, Infinity, 0, 0]]) {
  assert.equal(saveGhostIfBest('test', 'v1', { ...valid, samples }), false);
  assert.equal(data.size, 0);
}
assert.equal(saveGhostIfBest('test', 'v1', valid), true);
assert.equal(saveGhostIfBest('test', 'v1', { ...valid, time: 11 }), false);
assert.equal(saveGhostIfBest('test', 'v1', { ...valid, time: 9 }), true);
assert.equal(readGhost('test', 'v2'), null);
assert.deepEqual(ghostStateAt(readGhost('test', 'v1'), 0.025), { air: 2, cum: 0.5, done: false, lane: 1 });
data.clear();
assert.equal(saveGhostIfBest('test', 'v1', { ...valid, time: 10.0006 }), true);
assert.equal(saveGhostIfBest('test', 'v1', { ...valid, time: 10.0007 }), false, 'slower sub-millisecond run must not replace best');
assert.equal(saveGhostIfBest('test', 'v1', { ...valid, time: 10.0005 }), true, 'faster sub-millisecond run must replace best');
assert.equal(readGhost('test', 'v1').time, 10.0005);
window.localStorage = undefined;
assert.equal(saveGhostIfBest('test', 'v1', valid), false, 'missing storage is not a successful save');
console.log('PASS: replay validation, corrupt-save recovery, best selection, interpolation and missing storage');
