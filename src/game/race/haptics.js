// Haptics (RELEASE_V1_PLAN Phase 2).
//
// navigator.vibrate does nothing on iOS, so every buzz the race asked for was
// silent on the platform it ships on. Inside the Capacitor app this calls the
// native Haptics plugin (@capacitor/haptics, installed for its native half)
// through the bridge Capacitor injects into the web view, so the web bundle
// pays nothing for @capacitor/core. On the web it falls back to
// navigator.vibrate, which works on Android and is a harmless no-op elsewhere.
//
// Rate-limited: a bump chain or a wall scrape must not become a continuous
// buzz, so at most one pulse per 90 ms.
const MIN_GAP_MS = 90;
const VIBRATE_MS = { HEAVY: 45, LIGHT: 14, MEDIUM: 26 };

let nativeHaptics; // undefined: not looked up yet; null: not available
let lastPulseAt = -Infinity;

const resolveNative = () => {
  if (nativeHaptics !== undefined) return nativeHaptics;
  nativeHaptics = null;
  try {
    const capacitor = typeof window !== 'undefined' ? window.Capacitor : null;
    if (capacitor?.isNativePlatform?.() && capacitor.isPluginAvailable?.('Haptics')) {
      nativeHaptics = capacitor.registerPlugin('Haptics');
    }
  } catch {
    nativeHaptics = null;
  }
  return nativeHaptics;
};

const allowPulse = () => {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - lastPulseAt < MIN_GAP_MS) return false;
  lastPulseAt = now;
  return true;
};

// style: 'LIGHT' | 'MEDIUM' | 'HEAVY' (the plugin's ImpactStyle values).
export const hapticImpact = (style = 'LIGHT') => {
  if (!allowPulse()) return;
  const native = resolveNative();
  if (native) {
    native.impact({ style }).catch?.(() => {});
    return;
  }
  try {
    navigator.vibrate?.(VIBRATE_MS[style] || VIBRATE_MS.LIGHT);
  } catch {}
};

// type: 'SUCCESS' | 'WARNING' | 'ERROR' (the plugin's NotificationType values).
export const hapticNotification = (type = 'SUCCESS') => {
  if (!allowPulse()) return;
  const native = resolveNative();
  if (native) {
    native.notification({ type }).catch?.(() => {});
    return;
  }
  try {
    navigator.vibrate?.(type === 'SUCCESS' ? [20, 60, 30] : [40, 40, 40]);
  } catch {}
};

// The race's sound cues (kartAudio.js cuesForTransition) that are worth
// feeling. Item use is not here: the item button pulses on the press itself.
const CUE_HAPTICS = {
  bump: () => hapticImpact('LIGHT'),
  'coin-loss': () => hapticImpact('MEDIUM'),
  finish: () => hapticNotification('SUCCESS'),
  go: () => hapticImpact('MEDIUM'),
  land: () => hapticImpact('LIGHT'),
  'mini-turbo-1': () => hapticImpact('LIGHT'),
  'mini-turbo-2': () => hapticImpact('MEDIUM'),
  'mini-turbo-3': () => hapticImpact('HEAVY'),
  'spin-out': () => hapticImpact('HEAVY'),
  victory: () => hapticNotification('SUCCESS'),
  wall: () => hapticImpact('MEDIUM'),
};

export const hapticForCue = (cue) => {
  CUE_HAPTICS[cue]?.();
};
