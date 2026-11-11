// A second copy of the player's progress, outside the web view.
//
// Everything the game saves lives in the web view's localStorage, and iOS may
// clear that (low storage, or "Clear website data"). Coins, paints, the Mirror
// unlock and race records are small, so inside the iOS app they are mirrored
// to the app's own preferences (the @capacitor/preferences plugin, which is
// UserDefaults). On launch, a key missing from localStorage is put back from
// that copy before the game reads anything.
//
// Reached through the bridge Capacitor injects, like race/haptics.js, so the web
// build pays nothing for it. On the web this module does nothing.
//
// Ghost replays are left out on purpose: they are large and can be re-driven.
export const BACKUP_KEYS = Object.freeze(['cc-kart-wallet', 'cc-kart-paints', 'cc-kart-mirror-unlocked', 'cc-kart-results']);

const CHECK_MS = 5000;

const nativePreferences = (windowRef = globalThis.window) => {
  const capacitor = windowRef?.Capacitor;
  if (!capacitor?.isNativePlatform?.() || !capacitor.isPluginAvailable?.('Preferences')) return null;
  // The bridge Capacitor injects has no registerPlugin (that comes with the
  // @capacitor/core script, which this bundle does not carry; seen in the
  // simulator 2026-11-11). nativePromise is the bridge's own call.
  if (typeof capacitor.nativePromise !== 'function') return null;
  return {
    get: (options) => capacitor.nativePromise('Preferences', 'get', options),
    set: (options) => capacitor.nativePromise('Preferences', 'set', options),
  };
};

// Put back every backed-up key that localStorage no longer has. localStorage
// always wins when it has a value: it is the copy the game writes first.
export const restoreMissing = async (storage, preferences, keys = BACKUP_KEYS) => {
  const restored = [];
  for (const key of keys) {
    try {
      if (storage.getItem(key) !== null) continue;
      const { value } = await preferences.get({ key });
      if (typeof value === 'string' && value) {
        storage.setItem(key, value);
        restored.push(key);
      }
    } catch {}
  }
  return restored;
};

// Copy every key whose value changed since the last copy. `last` is a Map the
// caller keeps between calls.
export const backupChanged = async (storage, preferences, last, keys = BACKUP_KEYS) => {
  const written = [];
  for (const key of keys) {
    try {
      const value = storage.getItem(key);
      if (value === null || last.get(key) === value) continue;
      await preferences.set({ key, value });
      last.set(key, value);
      written.push(key);
    } catch {}
  }
  return written;
};

// Called once before the first render. Never blocks the launch for long: a
// slow or broken plugin just means this launch runs without the restore.
export const startProgressBackup = async (windowRef = globalThis.window, { timeoutMs = 1500 } = {}) => {
  const preferences = nativePreferences(windowRef);
  let storage = null;
  try {
    storage = windowRef?.localStorage || null;
  } catch {}
  if (!preferences || !storage) return { active: false, restored: [] };
  const restored = await Promise.race([
    restoreMissing(storage, preferences),
    new Promise((resolve) => windowRef.setTimeout(() => resolve([]), timeoutMs)),
  ]);
  const last = new Map();
  const copy = () => backupChanged(storage, preferences, last);
  copy();
  windowRef.setInterval(copy, CHECK_MS);
  // Leaving the app is the last chance before iOS may suspend it.
  windowRef.document?.addEventListener('visibilitychange', () => {
    if (windowRef.document.visibilityState === 'hidden') copy();
  });
  windowRef.addEventListener('pagehide', copy);
  return { active: true, restored };
};
