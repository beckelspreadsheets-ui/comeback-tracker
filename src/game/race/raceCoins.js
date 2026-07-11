// Collectible ₿ coins — pure math, deterministic (owner concept
// 2026-07-07: "they could actually just be bitcoins you collect that
// would be a super cool concept"). Classic kart-coin rules: coins sit in
// rows on the racing line, each carried coin nudges top speed a little
// (capped), a spin-out shakes a few loose, rows respawn every lap.
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
  laneSpread: 0.3, // rows are three coins at -spread / 0 / +spread
  maxSpeedCoins: 10, // the speed bonus stops growing here
  perCoinSpeedBonus: 0.004, // +0.4% top speed per carried coin
  spinLoss: 3, // coins shaken loose by a spin-out
};

// Row progresses per track, hand-placed clear of every item-box row and
// boost pad (±0.02) so pickups never compete for the same moment.
export const COIN_ROWS = {
  'comeback-city': [0.08, 0.165, 0.3, 0.405, 0.55, 0.67, 0.8, 0.93],
  'penguin-village': [0.025, 0.09, 0.24, 0.4, 0.52, 0.66, 0.79, 0.92],
};

export const buildCoinField = (trackKey) =>
  (COIN_ROWS[trackKey] || []).flatMap((progress, rowIndex) =>
    [-COIN_FEEL.laneSpread, 0, COIN_FEEL.laneSpread].map((lane, laneIndex) => ({
      collected: false,
      id: rowIndex * 3 + laneIndex,
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
