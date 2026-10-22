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
// buzz, so at most one pulse per 90 ms — unless the newer pulse is STRONGER.
// A spin-out that strips coins raises 'coin-loss' (MEDIUM) on the same frame
// as the hit itself (HEAVY), and under a plain first-come limiter whichever
// fired first won, so the biggest hit in the game could be felt as a medium.
const MIN_GAP_MS = 90;
const VIBRATE_MS = { HEAVY: 45, LIGHT: 14, MEDIUM: 26 };
const STRENGTH = { HEAVY: 3, LIGHT: 1, MEDIUM: 2 };

let nativeHaptics; // undefined: not looked up yet; null: not available
let lastPulseAt = -Infinity;
let lastStrength = 0;

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

const allowPulse = (strength = 1) => {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - lastPulseAt < MIN_GAP_MS && strength <= lastStrength) return false;
  lastPulseAt = now;
  lastStrength = strength;
  return true;
};

// style: 'LIGHT' | 'MEDIUM' | 'HEAVY' (the plugin's ImpactStyle values).
export const hapticImpact = (style = 'LIGHT') => {
  if (!allowPulse(STRENGTH[style] || 1)) return;
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
  if (!allowPulse(3)) return;
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
// Neither are the impacts (bump, wall, spin-out): a cue only knows THAT a hit
// happened, so those are felt through hapticForImpact below, which race/juice.js
// calls with how hard it was.
const CUE_HAPTICS = {
  'coin-loss': () => hapticImpact('MEDIUM'),
  finish: () => hapticNotification('SUCCESS'),
  go: () => hapticImpact('MEDIUM'),
  land: () => hapticImpact('LIGHT'),
  'mini-turbo-1': () => hapticImpact('LIGHT'),
  'mini-turbo-2': () => hapticImpact('MEDIUM'),
  'mini-turbo-3': () => hapticImpact('HEAVY'),
  victory: () => hapticNotification('SUCCESS'),
};

export const hapticForCue = (cue) => {
  CUE_HAPTICS[cue]?.();
};

// Impact events from race/juice.js, severity 0..1. The strongest events get the
// strongest pulse: being spun out is the biggest hit in the game, a full-speed
// wall slam is next, and a lean on the rail or a brush with a rival stays light.
export const hapticForImpact = (kind, severity = 1) => {
  if (kind === 'spin') hapticImpact('HEAVY');
  else if (kind === 'wall') hapticImpact(severity >= 0.8 ? 'HEAVY' : severity >= 0.5 ? 'MEDIUM' : 'LIGHT');
  else if (kind === 'bump') hapticImpact(severity >= 0.9 ? 'MEDIUM' : 'LIGHT');
  else if (kind === 'shield' || kind === 'landed' || kind === 'flood') hapticImpact('MEDIUM');
};
