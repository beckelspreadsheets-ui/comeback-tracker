// Unclean-exit marker (RELEASE_V1_PLAN Phase 2).
//
// When iOS runs out of memory it kills the WKWebView's web process mid-race and
// the app comes back with a reload: no error, no event, nothing the game can
// catch. The only trace is that the race never said goodbye. So a race writes
// a marker while it is on screen and in the foreground, and removes it when it
// closes or the app goes to the background (iOS reclaiming a BACKGROUND app is
// normal and must not count). A marker found at the start of the next race
// means the last one died on screen: that race runs in safe mode (the render
// governor may not climb above its floor) and the count goes up, so a tester's
// perf overlay shows it.
//
// Pure: storage is injected (localStorage in the game, a Map-backed fake in
// scripts/test-kart-session-health.mjs), and every access is guarded because
// storage can be missing or throw in private modes.
export const SESSION_OPEN_KEY = 'cc-kart-race-open';
export const SESSION_UNCLEAN_KEY = 'cc-kart-unclean-exits';

const browserStorage = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

export const beginRaceSession = (storage = browserStorage()) => {
  let safeMode = false;
  let uncleanExits = 0;
  try {
    if (!storage) return { safeMode, uncleanExits };
    safeMode = storage.getItem(SESSION_OPEN_KEY) !== null;
    uncleanExits = Number(storage.getItem(SESSION_UNCLEAN_KEY)) || 0;
    if (safeMode) {
      uncleanExits += 1;
      storage.setItem(SESSION_UNCLEAN_KEY, String(uncleanExits));
    }
    storage.setItem(SESSION_OPEN_KEY, String(Date.now()));
  } catch {
    // Storage refused: no marker, no safe mode. The game must still run.
  }
  return { safeMode, uncleanExits };
};

// The race closed cleanly, or the app left the foreground.
export const suspendRaceSession = (storage = browserStorage()) => {
  try {
    storage?.removeItem(SESSION_OPEN_KEY);
  } catch {}
};

// Back in the foreground with the race still mounted.
export const resumeRaceSession = (storage = browserStorage()) => {
  try {
    storage?.setItem(SESSION_OPEN_KEY, String(Date.now()));
  } catch {}
};
