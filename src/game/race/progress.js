// Unlocks & progress — earn ₿ coins by FINISHING races, spend them on kart
// paint. V1 has no real money anywhere: coins are only ever earned in a race,
// and nothing here can be bought with anything but them.
//
// Two keys in the kart-local 'cc-kart-*' family (kartLocalStore.js explains
// why the kart build never touches the fitness atom):
//
//   cc-kart-wallet  { coins, earned, awardIds }
//                   earned   = lifetime coins credited (never decreases)
//                   awardIds = the last AWARD_ID_HISTORY payouts, which is the
//                              double-count guard (see applyAward)
//   cc-kart-paints  { owned: [paintId], equipped: { [kartKey]: paintId } }
//                   ownership is GLOBAL (buy Ice Cyan once, it is on every
//                   kart); the equipped paint is chosen PER KART.
//
// Everything above the storage section is pure so scripts/test-kart-progress.mjs
// checks the math in node. Reads survive missing or corrupt storage by falling
// back to a clean default; writes are best-effort, and a write the WebView
// refuses (private mode, quota) is kept for the rest of the session instead of
// silently undoing a purchase.

export const WALLET_KEY = 'cc-kart-wallet';
export const PAINTS_KEY = 'cc-kart-paints';

// ── Earning ───────────────────────────────────────────────────────────────
// A finished race pays: the ₿ coins on the results card (carried at the flag,
// after spin-outs shook some loose) + a place bonus. A Grand Prix pays a
// podium bonus once, on the finish that completes the cup.
export const PLACE_BONUS = Object.freeze({ 1: 10, 2: 6, 3: 4 });
// Every other finish, and a time trial (it races nobody, so it always reports
// 1st — paying the winner's bonus there would make solo laps the best farm).
export const FINISH_BONUS = 1;
export const CUP_PODIUM_BONUS = Object.freeze({ 1: 15, 2: 10, 3: 5 });
// Sanity bounds, not game rules: a three-lap race carries ~90 coins at the very
// most (30 rows a lap, one coin per row). Anything beyond these is corrupt
// input, not a great race.
export const MAX_RACE_COINS = 500;
export const MAX_WALLET_COINS = 999999;
export const AWARD_ID_HISTORY = 32;

const toCount = (value, max) => {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.min(max, Math.floor(number));
};
const toPlace = (value) => (Number.isInteger(value) && value >= 1 ? value : null);

export const placeBonusFor = (place) => PLACE_BONUS[toPlace(place)] ?? FINISH_BONUS;
export const cupBonusFor = (cupPlace) => CUP_PODIUM_BONUS[toPlace(cupPlace)] ?? 0;

// result: { coins, place, timeTrial, cupPlace } — cupPlace only on the finish
// that ends a Grand Prix (the player's place in the final cup standings).
export const computeRaceEarnings = ({ coins, cupPlace = null, place, timeTrial = false } = {}) => {
  const earnedCoins = toCount(coins, MAX_RACE_COINS);
  const finishPlace = timeTrial ? null : toPlace(place);
  const placeBonus = finishPlace ? placeBonusFor(finishPlace) : FINISH_BONUS;
  const podium = timeTrial ? null : toPlace(cupPlace);
  const cupBonus = podium ? cupBonusFor(podium) : 0;
  return {
    coins: earnedCoins,
    cupBonus,
    cupPlace: podium,
    place: finishPlace,
    placeBonus,
    timeTrial: Boolean(timeTrial),
    total: earnedCoins + placeBonus + cupBonus,
  };
};

// ── Wallet ────────────────────────────────────────────────────────────────
export const sanitizeWallet = (raw) => {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const coins = toCount(source.coins, MAX_WALLET_COINS);
  return {
    awardIds: Array.isArray(source.awardIds)
      ? source.awardIds.filter((id) => typeof id === 'string' && id).slice(-AWARD_ID_HISTORY)
      : [],
    coins,
    // A wallet can never hold more than it has ever earned; repairs a hand-
    // edited or half-migrated record rather than trusting it.
    earned: Math.max(coins, toCount(source.earned, Number.MAX_SAFE_INTEGER)),
  };
};

// Idempotent payout. The same awardId is credited at most once, which is the
// whole double-count guard: a duplicated finish callback, a StrictMode double
// effect or a cup advance replaying a result all carry the id they already
// paid under and fall through here unchanged.
export const applyAward = (wallet, awardId, amount) => {
  const clean = sanitizeWallet(wallet);
  if (typeof awardId !== 'string' || !awardId || clean.awardIds.includes(awardId)) {
    return { applied: false, wallet: clean };
  }
  const credit = toCount(amount, MAX_WALLET_COINS);
  return {
    applied: true,
    wallet: {
      awardIds: [...clean.awardIds, awardId].slice(-AWARD_ID_HISTORY),
      coins: Math.min(MAX_WALLET_COINS, clean.coins + credit),
      earned: clean.earned + credit,
    },
  };
};

// ── Paint palette ─────────────────────────────────────────────────────────
// Neon-dusk livery. `tint` is a hex fed to setKartPaintTint
// (race/render/toonRimShader.js), which recolours only the body's PAINT
// texels — tyres, glass, trim and chrome keep their bake — so a paint is a
// change of hue on the panels the kart was painted with, and it keeps that
// kart's tonal design. `amount` is the tint's mix: the racer tints rivals
// carry run at KART_PAINT_TINT_AMOUNT (0.55), which is identity, not a respray;
// a bought paint has to read as a respray at chase-cam distance, so it runs
// harder. `null` tint = Factory: the racer's own colour, exactly as before.
//
// Prices climb with how loud the paint is; the bitcoin orange is the trophy.
const PLAYER_PAINT_AMOUNT = 0.9;
const paint = (id, name, price, tint) => Object.freeze({ amount: tint ? PLAYER_PAINT_AMOUNT : 0, id, name, price, tint });
export const DEFAULT_PAINT_ID = 'stock';
export const KART_PAINTS = Object.freeze([
  paint(DEFAULT_PAINT_ID, 'Factory', 0, null),
  paint('sunset-orange', 'Sunset Orange', 25, '#ff6a2b'),
  paint('ice-cyan', 'Ice Cyan', 40, '#36e2ff'),
  paint('matrix-green', 'Matrix Green', 60, '#2cff6a'),
  paint('magenta-neon', 'Magenta Neon', 80, '#ff2bd0'),
  paint('satoshi-silver', 'Satoshi Silver', 100, '#d0d9e6'),
  paint('midnight-gold', 'Midnight Gold', 120, '#ffc72e'),
  paint('ordinal-orange', 'Ordinal Orange', 150, '#f7931a'),
]);
const PAINT_BY_ID = new Map(KART_PAINTS.map((entry) => [entry.id, entry]));

export const paintById = (paintId) => PAINT_BY_ID.get(paintId) || null;

export const sanitizePaints = (raw) => {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const owned = [DEFAULT_PAINT_ID];
  if (Array.isArray(source.owned)) {
    source.owned.forEach((id) => {
      // Unknown ids (a paint removed in a later build, junk) drop out here.
      if (PAINT_BY_ID.has(id) && !owned.includes(id)) owned.push(id);
    });
  }
  const equipped = {};
  if (source.equipped && typeof source.equipped === 'object' && !Array.isArray(source.equipped)) {
    Object.entries(source.equipped).forEach(([kartKey, paintId]) => {
      // Only an OWNED paint can be equipped; anything else falls back to
      // Factory by being absent. Factory itself is the default, not stored.
      if (kartKey && paintId !== DEFAULT_PAINT_ID && owned.includes(paintId)) equipped[kartKey] = paintId;
    });
  }
  return { equipped, owned };
};

export const isPaintOwned = (paints, paintId) => sanitizePaints(paints).owned.includes(paintId);

export const equippedPaintId = (paints, kartKey) => sanitizePaints(paints).equipped[kartKey] || DEFAULT_PAINT_ID;

// What the race gets for the PLAYER's kart: the palette entry (frozen, so the
// prop is referentially stable across renders) or null for Factory.
export const racePaintFor = (paints, kartKey) => {
  const entry = paintById(equippedPaintId(paints, kartKey));
  return entry?.tint ? entry : null;
};

export const equipPaint = (paints, kartKey, paintId) => {
  const clean = sanitizePaints(paints);
  if (!kartKey || typeof kartKey !== 'string') return { ok: false, paints: clean, reason: 'no-kart' };
  if (!PAINT_BY_ID.has(paintId)) return { ok: false, paints: clean, reason: 'unknown-paint' };
  if (!clean.owned.includes(paintId)) return { ok: false, paints: clean, reason: 'locked' };
  const equipped = { ...clean.equipped };
  if (paintId === DEFAULT_PAINT_ID) delete equipped[kartKey];
  else equipped[kartKey] = paintId;
  return { ok: true, paints: { equipped, owned: clean.owned } };
};

// Buy AND equip on the kart it was bought from (the confirm is "buy this
// paint for this kart"); ownership itself is global.
export const buyPaint = ({ paints, wallet } = {}, paintId, kartKey) => {
  const cleanPaints = sanitizePaints(paints);
  const cleanWallet = sanitizeWallet(wallet);
  const fail = (reason) => ({ ok: false, paints: cleanPaints, reason, wallet: cleanWallet });
  const entry = paintById(paintId);
  if (!entry) return fail('unknown-paint');
  if (!kartKey || typeof kartKey !== 'string') return fail('no-kart');
  if (cleanPaints.owned.includes(paintId)) return fail('owned');
  if (cleanWallet.coins < entry.price) return fail('insufficient');
  const owned = { equipped: cleanPaints.equipped, owned: [...cleanPaints.owned, paintId] };
  return {
    ok: true,
    paints: equipPaint(owned, kartKey, paintId).paints,
    reason: null,
    wallet: { ...cleanWallet, coins: cleanWallet.coins - entry.price },
  };
};

// ── Menu toast ────────────────────────────────────────────────────────────
// Earnings pile up between menu visits (Race again, Next track, a whole cup)
// and the menu shows the sum once, when the player gets back to it.
export const mergeEarnings = (summary, earnings) => {
  if (!earnings) return summary || null;
  const base = summary || { coins: 0, cupBonus: 0, cupPlace: null, place: null, placeBonus: 0, races: 0, total: 0 };
  return {
    coins: base.coins + earnings.coins,
    cupBonus: base.cupBonus + earnings.cupBonus,
    cupPlace: earnings.cupPlace ?? base.cupPlace,
    place: earnings.place,
    placeBonus: base.placeBonus + earnings.placeBonus,
    races: base.races + 1,
    total: base.total + earnings.total,
  };
};

export const ordinalPlace = (place) => {
  const tens = place % 100;
  if (tens >= 11 && tens <= 13) return `${place}th`;
  return `${place}${({ 1: 'st', 2: 'nd', 3: 'rd' })[place % 10] || 'th'}`;
};

// The breakdown line under "+N ₿": what the player did, then what it paid.
export const describeEarnings = (summary) => {
  if (!summary || !(summary.total > 0)) return { parts: [], total: 0 };
  const parts = [`${summary.coins} ${summary.coins === 1 ? 'coin' : 'coins'}`];
  if (summary.races > 1) parts.unshift(`${summary.races} races`);
  if (summary.races === 1 && summary.place && PLACE_BONUS[summary.place]) {
    parts.push(`${ordinalPlace(summary.place)} place +${summary.placeBonus}`);
  } else if (summary.placeBonus) {
    parts.push(`${summary.races > 1 ? 'Finishes' : 'Finish'} +${summary.placeBonus}`);
  }
  if (summary.cupBonus) parts.push(`Grand Prix ${ordinalPlace(summary.cupPlace)} +${summary.cupBonus}`);
  return { parts, total: summary.total };
};

// ── Storage ───────────────────────────────────────────────────────────────
// A write the WebView refused is held here for the rest of the session, so a
// coin earned or a paint bought in a no-storage context still exists until
// the app closes. A later successful write clears it.
const unsaved = new Map();

const readJson = (key) => {
  let raw = unsaved.has(key) ? unsaved.get(key) : null;
  if (!unsaved.has(key)) {
    try {
      raw = globalThis.window?.localStorage?.getItem(key) ?? null;
    } catch {
      raw = null;
    }
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeJson = (key, value) => {
  const raw = JSON.stringify(value);
  try {
    const storage = globalThis.window?.localStorage;
    if (!storage) throw new Error('localStorage unavailable');
    storage.setItem(key, raw);
    unsaved.delete(key);
    return true;
  } catch {
    unsaved.set(key, raw);
    return false;
  }
};

// Test hook: forget session-held writes (a fresh app launch).
export const clearUnsavedProgress = () => unsaved.clear();

export const readWallet = () => sanitizeWallet(readJson(WALLET_KEY));
export const writeWallet = (wallet) => writeJson(WALLET_KEY, sanitizeWallet(wallet));
export const readPaints = () => sanitizePaints(readJson(PAINTS_KEY));
export const writePaints = (paints) => writeJson(PAINTS_KEY, sanitizePaints(paints));

// Credit one finished race (plus the cup podium when this finish ends a cup).
// Reads the stored wallet rather than any in-memory copy, so a stale React
// state can never overwrite a balance another code path just changed.
export const awardRaceFinish = ({ awardId, coins, cupPlace = null, place, timeTrial = false } = {}) => {
  const earnings = computeRaceEarnings({ coins, cupPlace, place, timeTrial });
  const { applied, wallet } = applyAward(readWallet(), awardId, earnings.total);
  if (applied) writeWallet(wallet);
  return { applied, earnings, wallet };
};

// Paints are written BEFORE the wallet: if the app dies between the two
// writes the player keeps a paint they did not pay for, never the reverse.
export const purchasePaint = (paintId, kartKey) => {
  const result = buyPaint({ paints: readPaints(), wallet: readWallet() }, paintId, kartKey);
  if (result.ok) {
    writePaints(result.paints);
    writeWallet(result.wallet);
  }
  return result;
};

export const selectPaint = (kartKey, paintId) => {
  const result = equipPaint(readPaints(), kartKey, paintId);
  if (result.ok) writePaints(result.paints);
  return result;
};
