// Synthesized race audio for the V2 three-kart runtime — zero audio assets,
// everything is WebAudio oscillators + one shared noise buffer, so the bundle
// cost is code only. Designed as an OBSERVER: the runtime calls
// updateFrame({ race, driftState }) once per frame and every one-shot cue is
// derived from state transitions here — no scattered playCue() calls inside
// the 6k-line update loop.
//
// Stage 6 adds an original upbeat arcade-racing music loop synthesized in
// kartMusicLoop.js — no external audio files, no provenance risk.
//
// Autoplay safety: the AudioContext is only created on the first real user
// gesture (attach() wires once-listeners). Webdriver/autoplay proof runs never
// gesture, so tests stay silent and unaffected.

import { createKartMusicLoop } from './kartMusicLoop.js';

const MUTE_STORAGE_KEY = 'cc-kart-audio-muted';

export const readStoredMute = (storage) => {
  try {
    return (storage || globalThis.localStorage)?.getItem(MUTE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

export const writeStoredMute = (muted, storage) => {
  try {
    (storage || globalThis.localStorage)?.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
  } catch {}
};

// Engine pitch curve — low grumble at rest, energetic at top speed, extra
// reach while boosting so boosts SOUND faster even at the speed cap.
export const engineFrequencyFor = (speedRatio = 0, boosting = false) =>
  42 + Math.min(1.4, Math.max(0, speedRatio)) * 118 * (boosting ? 1.3 : 1);

// Pure transition detector — given the previous and current snapshot, list
// the cue names to fire this frame. Exported so it can be unit-tested without
// an AudioContext.
export const cuesForTransition = (prev, next) => {
  const cues = [];
  if (!prev) return cues;
  if (prev.countdownCeil !== next.countdownCeil && next.countdownCeil > 0 && next.countdownCeil <= 3) {
    cues.push(`countdown-${next.countdownCeil}`);
  }
  if (prev.countdownCeil > 0 && next.countdownCeil <= 0) cues.push('go');
  if (next.lap > prev.lap && !next.finished) cues.push('lap');
  if (!prev.finished && next.finished) cues.push('finish');
  if (!prev.heldItem && next.heldItem) cues.push('item-pickup');
  if (prev.heldItem && !next.heldItem && !next.finished) cues.push('item-use');
  if (next.coins > prev.coins) cues.push('coin');
  if (next.coins < prev.coins && next.spin) cues.push('coin-loss');
  if (!prev.spin && next.spin) cues.push('spin-out');
  if (!prev.drift && next.drift) cues.push('drift-start');
  if (next.drift && next.driftTier > prev.driftTier) cues.push(`tier-${Math.min(3, next.driftTier)}`);
  if (!prev.miniTurbo && next.miniTurbo) cues.push(`mini-turbo-${Math.min(3, next.miniTurboTier || 1)}`);
  if (!prev.boost && next.boost && !next.miniTurbo) cues.push('boost');
  if (prev.airborne && !next.airborne) cues.push('land');
  return cues;
};

export const snapshotRaceForAudio = (race, driftState) => ({
  airborne: Boolean(race.airState?.airborne),
  boost: (race.boostTimer || 0) > 0,
  coins: race.coins || 0,
  countdownCeil: Math.ceil(race.countdown || 0),
  drift: Boolean(race.drift),
  driftTier: driftState?.tier || 0,
  finished: Boolean(race.finished),
  heldItem: race.heldItem || null,
  lap: race.lap || 1,
  miniTurbo: (driftState?.miniTurboTimer || 0) > 0,
  miniTurboTier: driftState?.miniTurboTier || 0,
  spin: (race.spinTimer || 0) > 0,
});

export const createKartAudio = ({
  audioWindow = typeof window === 'undefined' ? null : window,
  muted: initialMuted = false,
  storage = null,
} = {}) => {
  let ctx = null;
  let muted = Boolean(initialMuted);
  let master = null;
  let engine = null; // { osc, sub, filter, gain, lfo, lfoGain }
  let driftLoop = null; // { source, filter, gain }
  let musicLoop = null; // { schedule, dispose }
  let noiseBuffer = null;
  let prev = null;
  let detachGesture = null;
  let disposed = false;

  const now = () => ctx?.currentTime || 0;

  const buildNoiseBuffer = () => {
    const seconds = 1;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  };

  const ensureContext = () => {
    if (disposed || !audioWindow) return null;
    if (ctx) return ctx;
    const AudioCtor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioCtor) return null;
    try {
      ctx = new AudioCtor();
    } catch {
      return null;
    }
    noiseBuffer = buildNoiseBuffer();

    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);

    // Engine: saw body + square sub-octave through a speed-tracking lowpass.
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = engineFrequencyFor(0);
    const sub = ctx.createOscillator();
    sub.type = 'square';
    sub.frequency.value = engineFrequencyFor(0) / 2;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.5;
    // Slow wobble keeps the loop from sounding like a test tone.
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 7;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 4;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.detune);
    osc.connect(filter);
    sub.connect(subGain).connect(filter);
    filter.connect(gain).connect(master);
    osc.start();
    sub.start();
    lfo.start();
    engine = { filter, gain, lfo, lfoGain, osc, sub };

    // Drift scrape: looped noise through a bandpass; tier raises the band.
    const driftFilter = ctx.createBiquadFilter();
    driftFilter.type = 'bandpass';
    driftFilter.frequency.value = 900;
    driftFilter.Q.value = 1.1;
    const driftGain = ctx.createGain();
    driftGain.gain.value = 0;
    const driftSource = ctx.createBufferSource();
    driftSource.buffer = noiseBuffer;
    driftSource.loop = true;
    driftSource.connect(driftFilter).connect(driftGain).connect(master);
    driftSource.start();
    driftLoop = { filter: driftFilter, gain: driftGain, source: driftSource };

    // Stage 6: original arcade-racing background loop.
    musicLoop = createKartMusicLoop(ctx, master);

    return ctx;
  };

  const resume = () => {
    if (ctx?.state === 'suspended') ctx.resume?.().catch?.(() => {});
  };
  const suspend = () => {
    if (ctx?.state === 'running') ctx.suspend?.().catch?.(() => {});
  };

  // First real gesture creates + resumes the context. attach() is idempotent.
  const attach = () => {
    if (!audioWindow || detachGesture) return;
    const unlock = () => {
      ensureContext();
      resume();
    };
    const options = { capture: true, passive: true };
    ['pointerdown', 'keydown', 'touchstart'].forEach((type) =>
      audioWindow.addEventListener(type, unlock, options)
    );
    detachGesture = () => {
      ['pointerdown', 'keydown', 'touchstart'].forEach((type) =>
        audioWindow.removeEventListener(type, unlock, options)
      );
    };
  };

  const envGain = (peak, duration, at = now()) => {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    gain.connect(master);
    return gain;
  };

  const tone = ({ at = now(), duration = 0.12, from = 440, peak = 0.07, to = null, type = 'triangle' }) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, at);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, at + duration);
    osc.connect(envGain(peak, duration, at));
    osc.start(at);
    osc.stop(at + duration + 0.03);
  };

  const whoosh = ({ at = now(), duration = 0.3, from = 400, peak = 0.06, q = 1, to = 2600 }) => {
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, at);
    filter.frequency.exponentialRampToValueAtTime(to, at + duration);
    source.connect(filter).connect(envGain(peak, duration, at));
    source.start(at);
    source.stop(at + duration + 0.03);
  };

  const CUE_RECIPES = {
    boost: () => {
      whoosh({ duration: 0.42, from: 320, peak: 0.08, to: 3200 });
      tone({ duration: 0.3, from: 220, peak: 0.05, to: 440, type: 'sawtooth' });
    },
    coin: () => tone({ duration: 0.09, from: 1245, peak: 0.035, to: 1661 }),
    'coin-loss': () => tone({ duration: 0.2, from: 880, peak: 0.04, to: 440, type: 'square' }),
    'countdown-1': () => tone({ duration: 0.14, from: 494, peak: 0.08, type: 'sine' }),
    'countdown-2': () => tone({ duration: 0.14, from: 392, peak: 0.08, type: 'sine' }),
    'countdown-3': () => tone({ duration: 0.14, from: 330, peak: 0.08, type: 'sine' }),
    'drift-start': () => whoosh({ duration: 0.1, from: 700, peak: 0.045, q: 2, to: 1600 }),
    finish: () => {
      [523, 659, 784, 1047].forEach((freq, index) =>
        tone({ at: now() + index * 0.16, duration: index === 3 ? 0.5 : 0.15, from: freq, peak: 0.08 })
      );
    },
    go: () => {
      tone({ duration: 0.4, from: 587, peak: 0.09, type: 'square' });
      tone({ duration: 0.4, from: 880, peak: 0.06, type: 'triangle' });
    },
    'item-pickup': () => {
      tone({ duration: 0.09, from: 660, peak: 0.055 });
      tone({ at: now() + 0.08, duration: 0.12, from: 990, peak: 0.055 });
    },
    'item-use': () => whoosh({ duration: 0.24, from: 500, peak: 0.06, to: 2400 }),
    land: () => tone({ duration: 0.1, from: 140, peak: 0.04, type: 'sine', to: 90 }),
    lap: () => {
      tone({ duration: 0.12, from: 523, peak: 0.07 });
      tone({ at: now() + 0.11, duration: 0.2, from: 784, peak: 0.07 });
    },
    'mini-turbo-1': () => tone({ duration: 0.18, from: 720, peak: 0.08, to: 1080, type: 'square' }),
    'mini-turbo-2': () => {
      tone({ duration: 0.22, from: 720, peak: 0.09, to: 1290, type: 'square' });
      whoosh({ duration: 0.25, from: 600, peak: 0.05, to: 2800 });
    },
    'mini-turbo-3': () => {
      tone({ duration: 0.28, from: 720, peak: 0.1, to: 1560, type: 'square' });
      whoosh({ duration: 0.34, from: 500, peak: 0.06, to: 3400 });
    },
    'spin-out': () => {
      tone({ duration: 0.3, from: 220, peak: 0.07, to: 90, type: 'square' });
      whoosh({ duration: 0.18, from: 900, peak: 0.05, to: 300 });
    },
    'tier-1': () => tone({ duration: 0.11, from: 750, peak: 0.05, to: 900 }),
    'tier-2': () => tone({ duration: 0.11, from: 1000, peak: 0.055, to: 1200 }),
    'tier-3': () => tone({ duration: 0.12, from: 1250, peak: 0.06, to: 1550 }),
  };

  const playCue = (name) => {
    if (!ctx || muted || ctx.state !== 'running') return;
    CUE_RECIPES[name]?.();
  };

  const updateFrame = ({ driftState, race }) => {
    if (disposed || !race) return;
    const next = snapshotRaceForAudio(race, driftState);
    if (ctx && ctx.state === 'running') {
      // Keep the music scheduler fed even while muted so unmuting is seamless.
      musicLoop?.schedule?.(ctx.currentTime);
    }
    if (ctx && ctx.state === 'running' && !muted) {
      const time = ctx.currentTime;
      const speedRatio = Math.max(0, (race.speed || 0) / 240);
      const boosting = next.boost || next.miniTurbo;
      const freq = engineFrequencyFor(speedRatio, boosting);
      engine.osc.frequency.setTargetAtTime(freq, time, 0.06);
      engine.sub.frequency.setTargetAtTime(freq / 2, time, 0.06);
      engine.filter.frequency.setTargetAtTime(500 + speedRatio * 1900, time, 0.08);
      // Engine sits out until the countdown ends, ducks while spun out.
      const engineTarget = next.countdownCeil > 0 ? 0.02 : next.spin ? 0.03 : 0.085 + speedRatio * 0.05;
      engine.gain.gain.setTargetAtTime(engineTarget, time, 0.1);
      const driftTarget = next.drift ? 0.05 + next.driftTier * 0.012 : 0;
      driftLoop.gain.gain.setTargetAtTime(driftTarget, time, 0.05);
      driftLoop.filter.frequency.setTargetAtTime(900 + next.driftTier * 420, time, 0.06);
      cuesForTransition(prev, next).forEach(playCue);
    }
    prev = next;
  };

  const setMuted = (nextMuted) => {
    muted = Boolean(nextMuted);
    writeStoredMute(muted, storage);
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.5, now(), 0.02);
    return muted;
  };

  const dispose = () => {
    disposed = true;
    detachGesture?.();
    detachGesture = null;
    try {
      musicLoop?.dispose?.();
    } catch {}
    try {
      ctx?.close?.();
    } catch {}
    ctx = null;
    engine = null;
    driftLoop = null;
    prev = null;
  };

  return {
    attach,
    dispose,
    isMuted: () => muted,
    isRunning: () => ctx?.state === 'running',
    resume,
    setMuted,
    suspend,
    updateFrame,
  };
};
