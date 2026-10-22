// Unlocks & progress (src/game/race/progress.js): earning math, the
// double-count guard, buying, equipping, persistence and recovery from
// missing / corrupt / unavailable storage. Pure node, no browser.
import assert from 'node:assert/strict';
import {
  AWARD_ID_HISTORY,
  CUP_PODIUM_BONUS,
  DEFAULT_PAINT_ID,
  FINISH_BONUS,
  KART_PAINTS,
  PAINTS_KEY,
  PLACE_BONUS,
  WALLET_KEY,
  applyAward,
  awardRaceFinish,
  buyPaint,
  clearUnsavedProgress,
  computeRaceEarnings,
  describeEarnings,
  equipPaint,
  equippedPaintId,
  mergeEarnings,
  purchasePaint,
  racePaintFor,
  readPaints,
  readWallet,
  sanitizePaints,
  sanitizeWallet,
  selectPaint,
} from '../src/game/race/progress.js';

const storage = new Map();
let failWrites = false;
let failReads = false;
globalThis.window = {
  localStorage: {
    getItem: (key) => {
      if (failReads) throw new Error('SecurityError');
      return storage.get(key) ?? null;
    },
    setItem: (key, value) => {
      if (failWrites) throw new Error('QuotaExceededError');
      storage.set(key, String(value));
    },
  },
};
const reset = () => {
  storage.clear();
  failWrites = false;
  failReads = false;
  clearUnsavedProgress();
};
const stored = (key) => JSON.parse(storage.get(key));

// ── Earning math ──────────────────────────────────────────────────────────
assert.deepEqual(PLACE_BONUS, { 1: 10, 2: 6, 3: 4 });
assert.deepEqual(CUP_PODIUM_BONUS, { 1: 15, 2: 10, 3: 5 });
assert.equal(FINISH_BONUS, 1);
for (const [place, bonus] of [[1, 10], [2, 6], [3, 4], [4, 1], [6, 1], [12, 1]]) {
  const earnings = computeRaceEarnings({ coins: 20, place });
  assert.equal(earnings.placeBonus, bonus, `place ${place} bonus`);
  assert.equal(earnings.total, 20 + bonus, `place ${place} total`);
  assert.equal(earnings.cupBonus, 0);
}
// Time trial always reports 1st (it races nobody) — it earns the finish bonus,
// never the winner's, and never a cup bonus.
assert.deepEqual(computeRaceEarnings({ coins: 31, cupPlace: 1, place: 1, timeTrial: true }), {
  coins: 31, cupBonus: 0, cupPlace: null, place: null, placeBonus: 1, timeTrial: true, total: 32,
});
// Grand Prix podium bonus, only on the finish that ends the cup.
assert.equal(computeRaceEarnings({ coins: 12, cupPlace: 1, place: 2 }).total, 12 + 6 + 15);
assert.equal(computeRaceEarnings({ coins: 12, cupPlace: 2, place: 1 }).total, 12 + 10 + 10);
assert.equal(computeRaceEarnings({ coins: 12, cupPlace: 3, place: 4 }).total, 12 + 1 + 5);
assert.equal(computeRaceEarnings({ coins: 12, cupPlace: 4, place: 4 }).total, 12 + 1);
assert.equal(computeRaceEarnings({ coins: 12, cupPlace: null, place: 1 }).cupBonus, 0);
// Garbage in is a finish with no coins, not NaN in the wallet.
for (const coins of [undefined, null, -4, NaN, Infinity, 'lots', {}, []]) {
  const earnings = computeRaceEarnings({ coins, place: 2 });
  assert.equal(earnings.coins, 0, `coins ${String(coins)}`);
  assert.equal(earnings.total, 6);
}
assert.equal(computeRaceEarnings({ coins: 7.9, place: 1 }).coins, 7, 'fractional coins floor');
assert.equal(computeRaceEarnings({ coins: 1e9, place: 1 }).coins, 500, 'absurd coin counts are capped');
assert.equal(computeRaceEarnings({ coins: 5, place: NaN }).placeBonus, 1, 'unknown place is a plain finish');
console.log('PASS: earning math — coins + place bonus, cup podium bonus, time trial, bad input');

// ── Double-count guard ────────────────────────────────────────────────────
{
  let wallet = sanitizeWallet(null);
  const first = applyAward(wallet, 'race:a:1:134.2', 30);
  assert.equal(first.applied, true);
  assert.equal(first.wallet.coins, 30);
  wallet = first.wallet;
  const replay = applyAward(wallet, 'race:a:1:134.2', 30);
  assert.equal(replay.applied, false, 'same award id never pays twice');
  assert.equal(replay.wallet.coins, 30);
  const restartFinish = applyAward(wallet, 'race:a:1:137.9', 12);
  assert.equal(restartFinish.applied, true, 'Race again = a new finish = a new id');
  assert.equal(restartFinish.wallet.coins, 42);
  assert.equal(restartFinish.wallet.earned, 42);
  assert.equal(applyAward(wallet, '', 30).applied, false, 'no id, no payout');
  assert.equal(applyAward(wallet, undefined, 30).applied, false);
  // The guard is a ring: it remembers the last AWARD_ID_HISTORY payouts.
  let ring = sanitizeWallet(null);
  for (let index = 0; index < AWARD_ID_HISTORY + 5; index += 1) ring = applyAward(ring, `id-${index}`, 1).wallet;
  assert.equal(ring.awardIds.length, AWARD_ID_HISTORY);
  assert.equal(ring.coins, AWARD_ID_HISTORY + 5);
  assert.equal(applyAward(ring, `id-${AWARD_ID_HISTORY + 4}`, 1).applied, false);
}
// Through storage: the race reports one finish twice (StrictMode / a replayed
// callback / a cup advance re-reading the result) — the wallet moves once.
reset();
{
  const finish = { awardId: 'race:s1:3:140.25', coins: 18, place: 1 };
  const first = awardRaceFinish(finish);
  assert.equal(first.applied, true);
  assert.equal(first.earnings.total, 28);
  assert.equal(readWallet().coins, 28);
  const again = awardRaceFinish(finish);
  assert.equal(again.applied, false);
  assert.equal(readWallet().coins, 28, 'double-reported finish credited once');
  // A cup: race 1 pays coins + place, race 2 ends the cup and adds the podium.
  awardRaceFinish({ awardId: 'race:s1:4:141.0', coins: 10, place: 2 });
  const cupEnd = awardRaceFinish({ awardId: 'race:s1:5:139.5', coins: 9, cupPlace: 1, place: 1 });
  assert.equal(cupEnd.earnings.cupBonus, 15);
  assert.equal(readWallet().coins, 28 + 16 + 34);
  // Advancing past the podium replays nothing.
  awardRaceFinish({ awardId: 'race:s1:5:139.5', coins: 9, cupPlace: 1, place: 1 });
  assert.equal(readWallet().coins, 78);
  assert.equal(readWallet().earned, 78);
}
console.log('PASS: double-count guard — replayed finish ids pay once, restarts and new races pay');

// ── Buying and equipping ──────────────────────────────────────────────────
assert.ok(KART_PAINTS.length >= 6 && KART_PAINTS.length <= 8, '6-8 swatches');
assert.equal(KART_PAINTS[0].id, DEFAULT_PAINT_ID);
assert.equal(KART_PAINTS[0].price, 0);
assert.equal(KART_PAINTS[0].tint, null, 'Factory keeps the racer colour');
assert.equal(new Set(KART_PAINTS.map((entry) => entry.id)).size, KART_PAINTS.length, 'unique ids');
KART_PAINTS.slice(1).forEach((entry) => {
  assert.match(entry.tint, /^#[0-9a-f]{6}$/i, `${entry.id} tint is a hex setKartPaintTint takes`);
  assert.ok(entry.price >= 25 && entry.price <= 150, `${entry.id} price in range`);
  assert.ok(entry.amount > 0 && entry.amount <= 1, `${entry.id} amount in range`);
  assert.ok(Object.isFrozen(entry), 'palette entries are frozen (stable race prop)');
});
{
  const cyan = KART_PAINTS.find((entry) => entry.id === 'ice-cyan');
  const poor = buyPaint({ paints: null, wallet: { coins: cyan.price - 1 } }, cyan.id, 'hero');
  assert.equal(poor.ok, false);
  assert.equal(poor.reason, 'insufficient');
  assert.equal(poor.wallet.coins, cyan.price - 1, 'a refused buy costs nothing');
  assert.deepEqual(poor.paints.owned, [DEFAULT_PAINT_ID]);

  const bought = buyPaint({ paints: null, wallet: { coins: cyan.price + 5 } }, cyan.id, 'hero');
  assert.equal(bought.ok, true);
  assert.equal(bought.wallet.coins, 5, 'exact price deducted');
  assert.ok(bought.paints.owned.includes(cyan.id));
  assert.equal(equippedPaintId(bought.paints, 'hero'), cyan.id, 'buying equips on the kart it was bought from');
  assert.equal(equippedPaintId(bought.paints, 'icesled'), DEFAULT_PAINT_ID, 'other karts keep their own pick');
  assert.equal(racePaintFor(bought.paints, 'hero'), cyan, 'race prop is the frozen palette entry');
  assert.equal(racePaintFor(bought.paints, 'icesled'), null, 'Factory = null = untouched race');

  const twice = buyPaint({ paints: bought.paints, wallet: { coins: 500 } }, cyan.id, 'hero');
  assert.equal(twice.ok, false);
  assert.equal(twice.reason, 'owned', 'never charged twice for one paint');
  assert.equal(twice.wallet.coins, 500);
  assert.equal(buyPaint({ paints: null, wallet: { coins: 500 } }, 'rainbow', 'hero').reason, 'unknown-paint');
  assert.equal(buyPaint({ paints: null, wallet: { coins: 500 } }, cyan.id, '').reason, 'no-kart');

  // Ownership is global: equip on another kart for free.
  const equipped = equipPaint(bought.paints, 'icesled', cyan.id);
  assert.equal(equipped.ok, true);
  assert.equal(equippedPaintId(equipped.paints, 'icesled'), cyan.id);
  const locked = equipPaint(bought.paints, 'icesled', 'ordinal-orange');
  assert.equal(locked.ok, false);
  assert.equal(locked.reason, 'locked');
  const back = equipPaint(equipped.paints, 'hero', DEFAULT_PAINT_ID);
  assert.equal(back.ok, true);
  assert.equal(equippedPaintId(back.paints, 'hero'), DEFAULT_PAINT_ID, 'Factory is always equippable');
  assert.equal(back.paints.equipped.hero, undefined, 'Factory is the default, not stored');
}
console.log('PASS: buying with and without enough coins, equip, global ownership, per-kart selection');

// ── Persistence through localStorage ──────────────────────────────────────
reset();
{
  awardRaceFinish({ awardId: 'race:p:1:100', coins: 50, place: 1 });
  assert.equal(stored(WALLET_KEY).coins, 60);
  const result = purchasePaint('matrix-green', 'kenney');
  assert.equal(result.ok, true);
  assert.equal(stored(WALLET_KEY).coins, 0);
  assert.deepEqual(stored(PAINTS_KEY).owned, [DEFAULT_PAINT_ID, 'matrix-green']);
  assert.equal(stored(PAINTS_KEY).equipped.kenney, 'matrix-green');
  // A fresh launch reads back exactly what was saved.
  clearUnsavedProgress();
  assert.equal(readWallet().coins, 0);
  assert.equal(equippedPaintId(readPaints(), 'kenney'), 'matrix-green');
  const refused = purchasePaint('ordinal-orange', 'kenney');
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'insufficient');
  assert.deepEqual(stored(PAINTS_KEY).owned, [DEFAULT_PAINT_ID, 'matrix-green'], 'refused buy writes nothing');
  assert.equal(selectPaint('hero', 'matrix-green').ok, true);
  assert.equal(stored(PAINTS_KEY).equipped.hero, 'matrix-green');
  assert.equal(selectPaint('hero', 'ordinal-orange').ok, false);
  assert.equal(stored(PAINTS_KEY).equipped.hero, 'matrix-green', 'locked select leaves the pick alone');
}
console.log('PASS: persistence — wallet and paints round-trip through localStorage');

// ── Corrupt / missing / unavailable storage ───────────────────────────────
reset();
assert.deepEqual(readWallet(), { awardIds: [], coins: 0, earned: 0 }, 'missing wallet = empty wallet');
assert.deepEqual(readPaints(), { equipped: {}, owned: [DEFAULT_PAINT_ID] }, 'missing paints = Factory only');
for (const raw of ['{not json', 'null', '[]', '"120"', '42', JSON.stringify({ coins: -50 }), JSON.stringify({ coins: 'NaN' })]) {
  reset();
  storage.set(WALLET_KEY, raw);
  assert.equal(readWallet().coins, 0, `corrupt wallet ${raw} reads as 0`);
  const award = awardRaceFinish({ awardId: `race:c:${raw}`, coins: 5, place: 3 });
  assert.equal(award.applied, true);
  assert.equal(stored(WALLET_KEY).coins, 9, `corrupt wallet ${raw} is rewritten clean`);
}
reset();
storage.set(WALLET_KEY, JSON.stringify({ awardIds: 'x', coins: '73', earned: 2 }));
assert.deepEqual(readWallet(), { awardIds: [], coins: 73, earned: 73 }, 'salvage what is numeric, repair the rest');
reset();
storage.set(WALLET_KEY, JSON.stringify({ coins: 5e12 }));
assert.equal(readWallet().coins, 999999, 'clamped');
for (const raw of ['{bad', '[]', '7', JSON.stringify({ owned: 'ice-cyan', equipped: [] })]) {
  reset();
  storage.set(PAINTS_KEY, raw);
  assert.deepEqual(readPaints(), { equipped: {}, owned: [DEFAULT_PAINT_ID] }, `corrupt paints ${raw}`);
}
reset();
storage.set(
  PAINTS_KEY,
  JSON.stringify({
    equipped: { hero: 'ice-cyan', icesled: 'ordinal-orange', kenney: 'retired-paint', miamicruiser: 'stock', '': 'ice-cyan' },
    owned: ['ice-cyan', 'ice-cyan', 'retired-paint', 7, null],
  })
);
assert.deepEqual(
  readPaints(),
  { equipped: { hero: 'ice-cyan' }, owned: [DEFAULT_PAINT_ID, 'ice-cyan'] },
  'unknown and unowned paints drop out, owned ones survive'
);
assert.deepEqual(sanitizePaints(undefined), { equipped: {}, owned: [DEFAULT_PAINT_ID] });

// Storage that throws on every write (private-mode WebView, quota): progress
// still holds for the session, and the next good write persists it.
reset();
failWrites = true;
assert.equal(awardRaceFinish({ awardId: 'race:q:1:1', coins: 40, place: 1 }).applied, true);
assert.equal(readWallet().coins, 50, 'session keeps the payout');
assert.equal(purchasePaint('ice-cyan', 'hero').ok, true);
assert.equal(readWallet().coins, 10, 'session keeps the purchase');
assert.equal(equippedPaintId(readPaints(), 'hero'), 'ice-cyan');
assert.equal(storage.size, 0, 'nothing reached the throwing storage');
failWrites = false;
awardRaceFinish({ awardId: 'race:q:1:2', coins: 3, place: 4 });
assert.equal(stored(WALLET_KEY).coins, 14, 'next good write carries the session balance');
// Storage that throws on read: a clean default, never an exception.
reset();
failReads = true;
assert.equal(readWallet().coins, 0);
assert.deepEqual(readPaints().owned, [DEFAULT_PAINT_ID]);
// No window at all (SSR / node): defaults, no throw.
reset();
const savedWindow = globalThis.window;
delete globalThis.window;
assert.equal(readWallet().coins, 0);
assert.equal(awardRaceFinish({ awardId: 'race:n:1', coins: 2, place: 1 }).applied, true);
globalThis.window = savedWindow;
console.log('PASS: corrupt, missing and unavailable storage recover cleanly');

// ── Respray reference (race/render/paintLuminance.js) ─────────────────────
// A bought paint lands at its own brightness by dividing by the body's mean
// PAINT luminance; neutrals (tyres, trim, glass) must not count toward it.
{
  const { paintLuminanceOfPixels } = await import('../src/game/race/render/paintLuminance.js');
  const image = (pixels) => Uint8ClampedArray.from(pixels.flatMap(([r, g, b, a = 255]) => [r, g, b, a]));
  const linear = (c) => ((c / 255) <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
  const redLum = 0.2126 * linear(0xe8) + 0.7152 * linear(0x26) + 0.0722 * linear(0x1d);
  const red = [0xe8, 0x26, 0x1d];
  const tyre = [18, 18, 20];
  const chrome = [235, 238, 240];
  assert.equal(paintLuminanceOfPixels(image([tyre, chrome, tyre, chrome])), null, 'no paint, no reference');
  assert.ok(Math.abs(paintLuminanceOfPixels(image([red, red, red, red])) - redLum) < 1e-9, 'all-paint body');
  assert.ok(
    Math.abs(paintLuminanceOfPixels(image([red, tyre, chrome, red, tyre, tyre])) - redLum) < 1e-9,
    'tyres and chrome are not paint'
  );
  assert.equal(paintLuminanceOfPixels(image([[...red, 0], tyre])), null, 'transparent texels are skipped');
}
console.log('PASS: respray reference — mean paint luminance ignores neutrals and transparency');

// ── Menu toast summary ────────────────────────────────────────────────────
{
  const one = mergeEarnings(null, computeRaceEarnings({ coins: 18, place: 1 }));
  assert.deepEqual(describeEarnings(one), { parts: ['18 coins', '1st place +10'], total: 28 });
  const fourth = mergeEarnings(null, computeRaceEarnings({ coins: 1, place: 4 }));
  assert.deepEqual(describeEarnings(fourth), { parts: ['1 coin', 'Finish +1'], total: 2 });
  const cup = mergeEarnings(
    mergeEarnings(null, computeRaceEarnings({ coins: 10, place: 2 })),
    computeRaceEarnings({ coins: 9, cupPlace: 1, place: 1 })
  );
  assert.equal(cup.races, 2);
  assert.equal(cup.total, 16 + 19 + 15);
  assert.deepEqual(describeEarnings(cup).parts, ['2 races', '19 coins', 'Finishes +16', 'Grand Prix 1st +15']);
  assert.deepEqual(describeEarnings(null), { parts: [], total: 0 });
  assert.equal(mergeEarnings(cup, null), cup);
}
console.log('PASS: menu toast summary — single race, multi-race and cup breakdowns');
