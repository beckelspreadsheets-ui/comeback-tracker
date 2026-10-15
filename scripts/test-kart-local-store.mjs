import assert from 'node:assert/strict';
import { recordRaceFinish, readRaceResults } from '../src/kart/kartLocalStore.js';

const storage = new Map();
globalThis.window = { localStorage: {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
} };

for (const timeTrial of [false, true]) {
  for (const bestLap of [-1, 0, NaN, Infinity, -Infinity, '12']) {
    storage.clear();
    recordRaceFinish({ trackKey: 'test', place: 1, time: 100, bestLap, timeTrial });
    assert.equal(readRaceResults().test.bestLap, null, `reject ${String(bestLap)}, trial=${timeTrial}`);
    recordRaceFinish({ trackKey: 'test', place: 2, time: 110, bestLap: 30, timeTrial });
    assert.equal(readRaceResults().test.bestLap, 30, 'later valid lap can become the best');
    recordRaceFinish({ trackKey: 'test', place: 3, time: 120, bestLap, timeTrial });
    assert.equal(readRaceResults().test.bestLap, 30, 'invalid lap preserves the prior best');
    recordRaceFinish({ trackKey: 'test', place: 1, time: 90, bestLap: 25, timeTrial });
    assert.equal(readRaceResults().test.bestLap, 25, 'valid improvement persists');
    assert.equal(readRaceResults().test.bestTime, 90);
    if (timeTrial) {
      assert.equal(readRaceResults().test.runs, undefined);
      assert.equal(readRaceResults().test.wins, undefined);
    } else {
      assert.equal(readRaceResults().test.runs, 4);
      assert.equal(readRaceResults().test.wins, 2);
    }
  }
}
console.log('PASS: race and time-trial lap validation, recovery, bests, and counters');

for (const timeTrial of [false, true]) {
  for (const savedLap of [-5, 0, null, '12']) {
    storage.clear();
    storage.set('cc-kart-results', JSON.stringify({ test: { bestLap: savedLap, marker: 'preserved' } }));
    recordRaceFinish({ trackKey: 'test', place: 1, time: 100, bestLap: 30, timeTrial });
    assert.equal(readRaceResults().test.bestLap, 30, 'recover a corrupted saved best lap');
    assert.equal(readRaceResults().test.marker, 'preserved');
  }
}
console.log('PASS: previously corrupted lap records recover without losing metadata');
