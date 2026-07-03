/**
 * Silent, placeholder-ready AudioManager for the race runtime.
 *
 * This module intentionally produces no audible output. It preserves the exact
 * API surface the race runtime expects (`playCue`, `setMuted`, `resume`,
 * `suspend`, `dispose`) so final audio assets can be wired in later without
 * touching gameplay, physics, item, or rival code.
 *
 * To enable real audio later:
 *   1. Add assets to `public/audio/` (`.ogg` + `.mp3`).
 *   2. Build/load an AudioBuffer map and play buffers inside `playCue()` / loops.
 *   3. Keep lifecycle handling (resume/suspend/dispose) autoplay-safe.
 */

export const AUDIO_EVENTS = Object.freeze({
  VEHICLE_SWITCH: 'vehicle-switch',
  ITEM_HIT: 'item-hit',
});

const noop = () => {};

export const createAudioManager = ({
  // Audio is silent and disabled by default. The user explicitly deferred final
  // sound design to the end of the project; this manager exists only to keep
  // event hooks alive and lifecycle handling safe.
  enabled: initialEnabled = false,
  muted: initialMuted = true,
  trackKey = '',
  // `audioWindow` is kept for API symmetry and future Web Audio initialization.
  audioWindow = typeof window === 'undefined' ? null : window,
} = {}) => {
  let enabled = Boolean(initialEnabled);
  let muted = Boolean(initialMuted);

  // Future asset registry: cue/loop name -> { url, buffer, nodes, ... }.
  // Populated later when real assets are added; stays empty for now.
  const sounds = new Map();

  const isEnabled = () => enabled;
  const isMuted = () => muted;

  const setEnabled = (nextEnabled) => {
    enabled = Boolean(nextEnabled);
    return enabled;
  };

  const setMuted = (nextMuted) => {
    muted = Boolean(nextMuted);
    return muted;
  };

  // Silent placeholder for one-shot SFX. The runtime calls this for vehicle
  // switches, item uses, hits, etc. Real implementation will map `name` to a
  // loaded buffer and play it here.
  const playCue = (name, _duration = 0.12) => {
    if (!enabled || muted) return;
    // eslint-disable-next-line no-console
    if (import.meta.env.DEV) console.debug('[AudioManager] cue:', name);
    const sound = sounds.get(name);
    if (!sound) return;
    // Future: play sound.buffer.
  };

  // Silent placeholder for continuous loops (engine, drift, boost, ambience).
  const startLoop = (name) => {
    if (!enabled || muted) return;
    // eslint-disable-next-line no-console
    if (import.meta.env.DEV) console.debug('[AudioManager] startLoop:', name);
  };

  const stopLoop = (name) => {
    // eslint-disable-next-line no-console
    if (import.meta.env.DEV) console.debug('[AudioManager] stopLoop:', name);
  };

  // Lifecycle no-ops. Keeping the methods prevents the runtime from crashing
  // on page visibility/blur/focus/WebGL loss, and gives us a place to suspend
  // a real AudioContext when assets are added later.
  const resume = () => {
    if (!enabled || muted) return;
  };

  const suspend = () => {
    if (!enabled) return;
  };

  const dispose = () => {
    sounds.clear();
  };

  return {
    dispose,
    isEnabled,
    isMuted,
    playCue,
    resume,
    setEnabled,
    setMuted,
    startLoop,
    stopLoop,
    suspend,
    trackKey,
  };
};
