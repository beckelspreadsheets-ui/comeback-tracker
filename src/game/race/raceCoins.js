// Collectible ₿ coins — pure math, deterministic (owner concept
// 2026-07-07: "they could actually just be bitcoins you collect that
// would be a super cool concept"). Classic kart-coin rules: coins sit in
// rows flanking the racing line, each carried coin nudges top speed a
// little (capped), a spin-out shakes a few loose, rows respawn every
// lap. Rows are TWO coins at ±laneSpread — no center coin, so cruising
// the middle line collects nothing (owner 2026-07-11: "there should
// only be 2 in a row not 3 ... 3 makes it too easy to get them").
// The visual reuses the shipped CC ₿ item-box mesh at small scale —
// zero new bundle bytes.

const wrap01 = (value) => ((value % 1) + 1) % 1;
const shortDelta = (a, b) => {
  let delta = Math.abs(wrap01(a) - wrap01(b));
  if (delta > 0.5) delta = 1 - delta;
  return delta;
};

export const COIN_FEEL = {
  hitLane: 0.2, // lane distance that counts as a grab
  hitProgress: 8, // world units fore/aft that count as a grab
  laneSpread: 0.3, // rows are two coins at -spread / +spread (center dropped, owner 2026-07-11)
  maxSpeedCoins: 10, // the speed bonus stops growing here
  perCoinSpeedBonus: 0.004, // +0.4% top speed per carried coin
  spinLoss: 3, // coins shaken loose by a spin-out
};

// Row progresses per track, placed clear of every item box, boost pad and
// ramp so pickups never compete for the same moment.
//
// AAA wave 9. The shipped lists were EIGHT rows over an 11 s lap; the 4x
// rebuild kept them and left 8 rows over a 45 s lap, i.e. a quarter of the
// density the owner played. These are 30 rows each, which restores the beat:
// 0.670 / 0.668 rows per second against the shipped 0.717.
//
// Thirty is also what keeps the coin ECONOMY untouched, which is why the count
// is 30 and not "4x of 8". Taking one coin per row, the shipped track fed
// 8/11.15 s = 0.717 coins/s, so COIN_FEEL.maxSpeedCoins (10) capped out after
// ~13.9 s of clean driving; 30 rows over 44.78 s feed 0.670 coins/s and cap
// after ~14.9 s. Same chase, same value for a spin-out's 3-coin loss (~4.5 s of
// re-collecting either way). Multiplying the rows by four instead would have
// capped every racer inside the first quarter-lap and left the +4% coin bonus
// permanently on for the whole field — larger, flat, than the entire +/-3.5%
// top-speed spread that separates the karts.
//
// THE CLEARANCE GUARD IS A WORLD DISTANCE, NOT A FRACTION. The original rule
// read "clear by +/-0.02", which on the 2,897-unit lap it was authored against
// meant 58 units — about 0.22 s at racing speed, which is the quantity that
// actually stops two pickups landing in the same moment. Carried over as a
// FRACTION onto an 11.6k lap it would silently become 233 units / 0.9 s and
// blank out half the road: 13 obstacles x 0.04 of guard is 0.52 of the lap.
// This is the same class of bug as the startOffset 0.03 -> 0.0075 fix in
// comebackCity.js. The gate in race-content-playtest.mjs now measures the real
// separation in units against the tracks' own geometry, so it cannot go stale
// the way the hardcoded marker list it replaced did.
//
// Measured against that 58-unit floor: Comeback City's tightest row sits 116.5
// units off its nearest pickup and Penguin Village's 111.4 — both a touch over
// double the guard. Only one row was moved from the authored sheets (PV 0.77 ->
// 0.775; as authored it sat 55.7 units off the beacon-hairpin ramp at 0.765,
// just inside the floor, and the ramp's +0.5 side is exactly COIN_FEEL.hitLane
// from the +0.3 coin so a kart taking the ramp would clip the row).
export const COIN_ROWS = {
  // Skyline Viaduct. Clear of boost pads 0.09/0.3/0.7/0.965, item boxes
  // 0.03/0.16/0.22/0.38/0.52/0.77/0.905 and ramps 0.45/0.63.
  'comeback-city': [
    0.01, 0.05, 0.08, 0.11, 0.14, 0.18, 0.21, 0.24, 0.28, 0.31, 0.34, 0.37, 0.41, 0.44, 0.47, 0.5, 0.54, 0.57, 0.6,
    0.64, 0.67, 0.71, 0.74, 0.78, 0.81, 0.85, 0.88, 0.92, 0.95, 0.98,
  ],
  // Bayfront Sweep. Clear of boost pads 0.08/0.32/0.55/0.82, item boxes
  // 0.02/0.12/0.47/0.62/0.7/0.885/0.96 and ramps 0.24/0.765.
  'penguin-village': [
    0.01, 0.04, 0.07, 0.1, 0.14, 0.17, 0.2, 0.23, 0.27, 0.3, 0.34, 0.37, 0.4, 0.44, 0.48, 0.51, 0.54, 0.58, 0.61,
    0.64, 0.67, 0.71, 0.74, 0.775, 0.8, 0.84, 0.87, 0.9, 0.93, 0.97,
  ],
};

export const buildCoinField = (trackKey) =>
  (COIN_ROWS[trackKey] || []).flatMap((progress, rowIndex) =>
    [-COIN_FEEL.laneSpread, COIN_FEEL.laneSpread].map((lane, laneIndex) => ({
      collected: false,
      id: rowIndex * 2 + laneIndex,
      lane,
      progress,
    }))
  );

// Marks grabbed coins collected and returns their ids (the caller hides
// the meshes and bumps the counter).
export const collectCoinsForFrame = (coins, progress, lane, trackLength) => {
  const grabbed = [];
  for (const coin of coins) {
    if (coin.collected) continue;
    if (
      shortDelta(progress, coin.progress) * trackLength < COIN_FEEL.hitProgress &&
      Math.abs(lane - coin.lane) < COIN_FEEL.hitLane
    ) {
      coin.collected = true;
      grabbed.push(coin.id);
    }
  }
  return grabbed;
};

export const respawnCoins = (coins) => {
  coins.forEach((coin) => {
    coin.collected = false;
  });
};

// 1.0 at zero coins, +perCoinSpeedBonus per coin up to maxSpeedCoins.
export const coinSpeedMultiplier = (carried) =>
  1 + Math.min(Math.max(carried, 0), COIN_FEEL.maxSpeedCoins) * COIN_FEEL.perCoinSpeedBonus;

// Coins left after a spin-out.
export const coinsAfterSpin = (carried) => Math.max(0, carried - COIN_FEEL.spinLoss);
