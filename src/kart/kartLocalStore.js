// K1: kart-build-local persistence. The standalone kart shell must never
// read or WRITE the fitness atom ('comeback-tracker-v1') — a same-origin
// fitness install would get corrupted. Race results live under their own
// 'cc-kart-*' key family, consistent with the select-flow keys RaceScreen
// already owns (cc-kart-intro-seen / cc-kart-character / cc-kart-kart /
// cc-kart-track), which carry over to this build unchanged.

const RESULTS_KEY = 'cc-kart-results';
const MIGRATED_FLAG_KEY = 'cc-kart-results-migrated';
const LEGACY_ATOM_KEY = 'comeback-tracker-v1';
const REDUCED_MOTION_KEY = 'cc-kart-reduced-motion';

const safeParse = (raw) => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
};

const sanitizeEntry = (entry) => {
  if (!entry || typeof entry !== 'object') return null;
  const clean = {};
  const bestLap = Number(entry.bestLap);
  const bestPlace = Number(entry.bestPlace);
  const bestTime = Number(entry.bestTime);
  clean.bestLap = Number.isFinite(bestLap) && bestLap > 0 ? bestLap : null;
  clean.bestPlace = Number.isFinite(bestPlace) && bestPlace >= 1 ? bestPlace : null;
  clean.bestTime = Number.isFinite(bestTime) && bestTime > 0 ? bestTime : null;
  clean.podiums = Number.isFinite(Number(entry.podiums)) ? Math.max(0, Number(entry.podiums)) : 0;
  clean.runs = Number.isFinite(Number(entry.runs)) ? Math.max(0, Number(entry.runs)) : 0;
  clean.wins = Number.isFinite(Number(entry.wins)) ? Math.max(0, Number(entry.wins)) : 0;
  return clean;
};

export const readRaceResults = () => {
  if (typeof window === 'undefined') return {};
  try {
    return safeParse(window.localStorage?.getItem(RESULTS_KEY)) || {};
  } catch {
    return {};
  }
};

const writeRaceResults = (results) => {
  try {
    window.localStorage?.setItem(RESULTS_KEY, JSON.stringify(results));
  } catch {
    // localStorage unavailable — results just don't persist this session.
  }
};

// One-shot import of best times from a legacy fitness-app atom left on this
// origin (comeback-city-kart.pages.dev served the full fitness build before
// K1). Read-only on the atom; after this the kart build ignores it forever.
export const migrateLegacyRaceResultsOnce = () => {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage?.getItem(MIGRATED_FLAG_KEY) === '1') return;
    const legacy = safeParse(window.localStorage?.getItem(LEGACY_ATOM_KEY));
    const legacyResults = legacy?.game?.raceResults;
    if (legacyResults && typeof legacyResults === 'object') {
      const results = readRaceResults();
      let changed = false;
      for (const [trackKey, entry] of Object.entries(legacyResults)) {
        // Kart-local entries win — migration runs before the first kart-shell
        // race, so in practice this only ever copies.
        if (results[trackKey]) continue;
        const clean = sanitizeEntry(entry);
        if (!clean) continue;
        results[trackKey] = clean;
        changed = true;
      }
      if (changed) writeRaceResults(results);
    }
    window.localStorage?.setItem(MIGRATED_FLAG_KEY, '1');
  } catch {
    // Migration is best-effort; never block the shell on it.
  }
};

// Same merge rules as the fitness RaceScreen handleFinish
// (src/game/RaceScreen.jsx:2149-2182), persisted locally instead of into the
// atom. result = { bestLap, place, time, trackKey } from onFinish.
export const recordRaceFinish = (result) => {
  if (!result || typeof result !== 'object' || !result.trackKey) return;
  const results = readRaceResults();
  const previous = results[result.trackKey] || {};
  const bestTime =
    !previous.bestTime || result.time < previous.bestTime ? result.time : previous.bestTime;
  const bestLap =
    result.bestLap && (!previous.bestLap || result.bestLap < previous.bestLap)
      ? result.bestLap
      : previous.bestLap ?? null;
  results[result.trackKey] = {
    ...previous,
    bestLap,
    bestPlace: previous.bestPlace ? Math.min(previous.bestPlace, result.place) : result.place,
    bestTime,
    podiums: (previous.podiums || 0) + (result.place <= 3 ? 1 : 0),
    runs: (previous.runs || 0) + 1,
    wins: (previous.wins || 0) + (result.place === 1 ? 1 : 0),
  };
  writeRaceResults(results);
};

// Kart-local stand-in for the fitness atom's game.hub.reducedMotion. No UI
// sets it yet (K1 parity — the fitness default is false); flip it manually:
// localStorage.setItem('cc-kart-reduced-motion', '1')
export const readReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage?.getItem(REDUCED_MOTION_KEY) === '1';
  } catch {
    return false;
  }
};

// M5: the select-screen settings toggles write these.
export const writeReducedMotion = (enabled) => {
  try {
    window.localStorage?.setItem(REDUCED_MOTION_KEY, enabled ? '1' : '0');
  } catch {
    // best-effort
  }
};

const GFX_KEY = 'cc-kart-gfx';
export const readGfxPreset = () => {
  if (typeof window === 'undefined') return 'high';
  try {
    const value = window.localStorage?.getItem(GFX_KEY);
    return value === 'low' || value === 'off' ? value : 'high';
  } catch {
    return 'high';
  }
};
export const writeGfxPreset = (preset) => {
  try {
    window.localStorage?.setItem(GFX_KEY, preset === 'low' || preset === 'off' ? preset : 'high');
  } catch {
    // best-effort
  }
};
