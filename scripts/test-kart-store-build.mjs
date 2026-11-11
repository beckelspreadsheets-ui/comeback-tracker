// The store build's URL guard (src/game/race/storeBuild.js).
import assert from 'node:assert/strict';
import { applyStoreUrlGuard, DEBUG_HOOKS, STORE_BUILD, storeCleanUrl } from '../src/game/race/storeBuild.js';

// Outside a store build nothing is switched off.
assert.equal(STORE_BUILD, false);
assert.equal(DEBUG_HOOKS, true);

assert.equal(storeCleanUrl('capacitor://localhost/'), null);
assert.equal(storeCleanUrl('https://example.test/'), null);
assert.equal(storeCleanUrl('capacitor://localhost/?giveItem=rocket'), '/');
assert.equal(storeCleanUrl('https://example.test/?playableAutoplay=1&track=penguin-village#race'), '/');
assert.equal(storeCleanUrl('https://example.test/#race'), '/');
assert.equal(storeCleanUrl('https://example.test/privacy.html?x=1'), '/privacy.html');

const fake = (href) => {
  const calls = [];
  return { calls, history: { replaceState: (...args) => calls.push(args), state: { keep: 1 } }, location: { href } };
};

// Off: never touches the address.
let page = fake('https://example.test/?giveItem=rocket');
assert.equal(applyStoreUrlGuard({ enabled: false, history: page.history, location: page.location }), false);
assert.equal(page.calls.length, 0);

// On: one replaceState to the bare path, history state kept.
page = fake('https://example.test/?giveItem=rocket#race');
assert.equal(applyStoreUrlGuard({ enabled: true, history: page.history, location: page.location }), true);
assert.deepEqual(page.calls, [[{ keep: 1 }, '', '/']]);

// On with a clean address: nothing to do.
page = fake('capacitor://localhost/');
assert.equal(applyStoreUrlGuard({ enabled: true, history: page.history, location: page.location }), false);
assert.equal(page.calls.length, 0);

// A replaceState that throws must not take the app down.
assert.equal(
  applyStoreUrlGuard({
    enabled: true,
    history: {
      replaceState: () => {
        throw new Error('blocked');
      },
    },
    location: { href: 'https://example.test/?a=1' },
  }),
  false
);

console.log('kart store build: ok');
