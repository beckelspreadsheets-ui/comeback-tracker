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
  hitProgress: 8, // world units fore/aft that counts as a grab
  hitRadius: 5.5, // world-space 3D grab radius when using TrackSurfaceAnchor positions
  laneSpread: 0.3, // rows are two coins at -spread / +spread (center dropped, owner 2026-07-11)
  maxSpeedCoins: 10, // the speed bonus stops growing here
  perCoinSpeedBonus: 0.004, // +0.4% top speed per carried coin
  spinLoss: 3, // coins shaken loose by a spin-out
};

// Row progresses per track. Comeback City's rows come from the authored
// custom-map module (courseV2Authored.js, generator-validated clear of
// every item-box row and boost pad); Penguin Village keeps its hand-placed
// rows (clear of its own pads/boxes by construction).
import { COMEBACK_CITY_AUTHORED } from '../courseV2Authored.js';

export const COIN_ROWS = {
  'comeback-city': COMEBACK_CITY_AUTHORED.coinRows,
  'penguin-village': [0.025, 0.09, 0.24, 0.4, 0.52, 0.66, 0.79, 0.92],
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
// Stage 5: when a sampler is supplied, use the shared TrackSurfaceAnchor
// world positions for the hit test so visual and collision transforms match.
export const collectCoinsForFrame = (coins, progress, lane, samplerOrLength) => {
  const grabbed = [];
  const useWorld = samplerOrLength && typeof samplerOrLength.pointAt === 'function';
  const kartPos = useWorld ? samplerOrLength.pointAt(progress, lane).point : null;
  for (const coin of coins) {
    if (coin.collected) continue;
    let hit = false;
    if (useWorld && coin.worldPosition) {
      hit = kartPos.distanceTo(coin.worldPosition) < COIN_FEEL.hitRadius;
    } else {
      const trackLength = samplerOrLength;
      hit =
        shortDelta(progress, coin.progress) * trackLength < COIN_FEEL.hitProgress &&
        Math.abs(lane - coin.lane) < COIN_FEEL.hitLane;
    }
    if (hit) {
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
