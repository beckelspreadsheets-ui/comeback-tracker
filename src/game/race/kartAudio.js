// Race audio for the V2 three-kart runtime. Designed as an OBSERVER: the
// runtime calls updateFrame({ race, driftState }) once per frame and every
// one-shot cue is derived from state transitions here — no scattered
// playCue() calls inside the 6k-line update loop.
//
// TWO SOURCES, one entry point. Every cue name resolves to a recorded sample
// if one has been loaded, and to the oscillator recipe below if it has not.
// The synth is NOT legacy — it is the fallback that keeps a typo'd path or a
// 404 from being a SILENT regression, which is the failure mode you would
// never notice in a gate. So the recipes stay, and `playCue` is still the only
// way to make a noise.
//
// Bus layout, all under `master` so mute cuts everything with one gain:
//   master ─┬─ musicBus  (looping beds, crossfaded)
//           ├─ sfxBus    (one-shots, sampled OR synthesised — same bus, so a
//           │             fallback cue sits at the same level as its sample)
//           └─ engine + drift synth (speed-reactive, never sampled — see A6)
//
// Autoplay safety: the AudioContext is only created on the first real user
// gesture (attach() wires once-listeners). Webdriver/autoplay proof runs never
// gesture, so tests stay silent and unaffected. That first gesture is also
// when samples preload, so the countdown is already sampled by the time it
// runs.
//
// This module is deliberately free of Vite-only syntax so it can be imported
// and driven by plain Node against a fake AudioContext — see
// scripts/test-kart-audio-samples.mjs. File URLs arrive as the `assets`
// option, shaped by src/game/race/kartAudioAssets.js.

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

// ── Engine mix ────────────────────────────────────────────────────────────
// Retuned 2026-08-07 on owner feedback: "the car sound is horrible ... its too
// loud to hear the whole time".
//
// The level was only half of it. The engine is the one sound that NEVER STOPS,
// so it is judged by fatigue over four minutes rather than by impact, and it
// was built like a cue: a sawtooth against a SQUARE sub-octave, opened up to
// 2.4 kHz of lowpass, with 7 Hz of detune wobble on top. A square at 21-100 Hz
// is a rattle, a saw that bright is a buzz, and wobble that fast reads as a
// test tone rather than an engine. All four are addressed together — halving
// the gain alone would have left a quieter version of the same bad sound.
//
// Kept as named constants because this is the number most likely to need
// another pass once music is under it.
const ENGINE_GAIN_IDLE = 0.038; // was 0.085
const ENGINE_GAIN_PER_SPEED = 0.042; // was 0.05
const ENGINE_GAIN_COUNTDOWN = 0.012; // was 0.02
const ENGINE_GAIN_SPIN = 0.018; // was 0.03
const ENGINE_FILTER_BASE = 320; // was 500
const ENGINE_FILTER_PER_SPEED = 1250; // was 1900
const ENGINE_SUB_GAIN = 0.32; // was 0.5
const ENGINE_WOBBLE_HZ = 4.2; // was 7
const ENGINE_WOBBLE_CENTS = 2.5; // was 4

// The fundamental the engine loop was RENDERED at. playbackRate is the ratio
// of the frequency the game wants to this, so the sampled engine follows the
// exact same engineFrequencyFor curve the synth does — which is the whole
// condition under which a sampled engine is an upgrade rather than a
// downgrade. Must match BASE_HZ in scripts/render-kart-engine.mjs.
const ENGINE_SAMPLE_BASE_HZ = 100;

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

// Bus trims, applied under `master` (which is 0.5 when unmuted). Music sits
// well below the sfx so a cue still reads over the top of a bed.
const MUSIC_BUS_GAIN = 0.55;
const SFX_BUS_GAIN = 0.9;

// Per-cue playback level for SAMPLES. Sample files are normalised to full
// scale (that is the right call for encoding quality), so the mix balance has
// to live here instead — and each value is the exact `peak` its oscillator
// recipe below uses. Two consequences worth keeping:
//   · a cue and its synth fallback play at the same loudness, so a file that
//     fails to load is inaudible as a bug rather than an obvious volume jump;
//   · the balance is the one the game already shipped and the owner has
//     already lived with, so swapping in samples changes timbre, not mix.
// A cue missing from this map plays at 0.07, the median of the set.
const CUE_GAIN = {
  boost: 0.08,
  coin: 0.035,
  'coin-loss': 0.04,
  'countdown-1': 0.08,
  'countdown-2': 0.08,
  'countdown-3': 0.08,
  'drift-start': 0.045,
  finish: 0.08,
  go: 0.09,
  'item-pickup': 0.055,
  'item-use': 0.06,
  land: 0.04,
  lap: 0.07,
  'mini-turbo-1': 0.08,
  'mini-turbo-2': 0.09,
  'mini-turbo-3': 0.1,
  'spin-out': 0.07,
  'tier-1': 0.05,
  'tier-2': 0.055,
  'tier-3': 0.06,
};

export const createKartAudio = ({
  assets = null,
  audioWindow = typeof window === 'undefined' ? null : window,
  muted: initialMuted = false,
  storage = null,
} = {}) => {
  let ctx = null;
  let muted = Boolean(initialMuted);
  let master = null;
  let musicBus = null;
  let sfxBus = null;
  let engine = null; // { osc, sub, filter, gain, lfo, lfoGain }
  let driftLoop = null; // { source, filter, gain }
  let noiseBuffer = null;
  let prev = null;
  let detachGesture = null;
  let disposed = false;
  // Sample state. `failed` is a tombstone set: one 404 or decode error retires
  // that name for the session rather than re-fetching it on every cue.
  const sampleBuffers = new Map();
  const samplePending = new Map();
  const sampleFailed = new Set();
  // Sampled engine, if a loop file exists. When it does the oscillator engine
  // is held at zero rather than torn down — the synth is still the fallback if
  // the file 404s, and it also has to stay alive because it was started once
  // and an OscillatorNode cannot be restarted.
  let engineSample = null; // { filter, gain, source }
  let music = null; // { gain, name, source }
  // What the game LAST ASKED FOR, which is not the same as what is playing:
  // a bed requested while muted is never fetched (a 2 MB download nobody can
  // hear), and a bed requested while a previous one is still decoding must not
  // be overtaken by it. Both cases are resolved against this.
  let requestedMusic = null;

  const sfxUrlFor = (name) => assets?.sfx?.[name] || null;
  const musicEntryFor = (name) => assets?.music?.[name] || null;

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

    musicBus = ctx.createGain();
    musicBus.gain.value = MUSIC_BUS_GAIN;
    musicBus.connect(master);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = SFX_BUS_GAIN;
    sfxBus.connect(master);

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
    // Triangle, not square: at 21-100 Hz a square is a rattle, and it was the
    // single biggest contributor to the engine reading as harsh.
    sub.type = 'triangle';
    sub.frequency.value = engineFrequencyFor(0) / 2;
    const subGain = ctx.createGain();
    subGain.gain.value = ENGINE_SUB_GAIN;
    // Slow wobble keeps the loop from sounding like a test tone — but too fast
    // and it becomes one. 4.2 Hz reads as an idle; 7 Hz read as vibrato.
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = ENGINE_WOBBLE_HZ;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = ENGINE_WOBBLE_CENTS;
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

    // The unlock gesture is also the preload trigger: the one-shots are small,
    // and the alternative is the countdown firing synth because its sample was
    // still in flight. Any bed requested before the context existed starts here.
    preloadSfx();
    startEngineSample();
    startRequestedMusic();

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

  // ── Sample path ─────────────────────────────────────────────────────────
  // Safari shipped the callback form of decodeAudioData long before the
  // promise form and still resolves neither reliably on a malformed buffer, so
  // both are wired and whichever settles first wins.
  const decodeAudio = (raw) =>
    new Promise((resolve, reject) => {
      let settled = false;
      const ok = (buffer) => {
        if (settled) return;
        settled = true;
        if (buffer) resolve(buffer);
        else reject(new Error('decodeAudioData returned nothing'));
      };
      const bad = (error) => {
        if (settled) return;
        settled = true;
        reject(error instanceof Error ? error : new Error('decodeAudioData failed'));
      };
      try {
        const maybePromise = ctx.decodeAudioData(raw, ok, bad);
        if (maybePromise?.then) maybePromise.then(ok, bad);
      } catch (error) {
        bad(error);
      }
    });

  // Resolves to an AudioBuffer, or to null if this name has no file / the
  // fetch or decode failed. Never rejects: a missing sound must degrade to the
  // synth, not throw inside a render frame.
  const loadSample = (key, url) => {
    if (!ctx || !url || sampleFailed.has(key)) return Promise.resolve(null);
    if (sampleBuffers.has(key)) return Promise.resolve(sampleBuffers.get(key));
    if (samplePending.has(key)) return samplePending.get(key);
    const fetchImpl = audioWindow?.fetch ? audioWindow.fetch.bind(audioWindow) : null;
    if (!fetchImpl) {
      sampleFailed.add(key);
      return Promise.resolve(null);
    }
    const pending = fetchImpl(url)
      .then((response) => {
        if (!response?.ok) throw new Error(`audio fetch ${response?.status} for ${url}`);
        return response.arrayBuffer();
      })
      .then((raw) => decodeAudio(raw))
      .then((buffer) => {
        sampleBuffers.set(key, buffer);
        samplePending.delete(key);
        return buffer;
      })
      .catch(() => {
        // Deliberately silent and deliberately permanent. The cue still fires
        // through CUE_RECIPES, so the game is audibly fine; loudly failing a
        // frame-rate-critical path over a missing decoration is worse.
        sampleFailed.add(key);
        samplePending.delete(key);
        return null;
      });
    samplePending.set(key, pending);
    return pending;
  };

  const preloadSfx = () => {
    Object.keys(assets?.sfx || {}).forEach((name) => loadSample(name, sfxUrlFor(name)));
  };

  // Swaps the oscillator engine for the looping sample, once it decodes. The
  // synth keeps running at zero gain: it is the fallback if this never
  // resolves, and an OscillatorNode that has been stopped cannot be restarted.
  const startEngineSample = () => {
    if (!assets?.engine || engineSample) return;
    loadSample('engine', assets.engine).then((buffer) => {
      if (!buffer || disposed || !ctx || engineSample) return;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = ENGINE_FILTER_BASE;
      filter.Q.value = 0.7;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(filter).connect(gain).connect(master);
      source.start();
      engineSample = { filter, gain, source };
      // Hand over: the synth engine goes silent the moment the sample is live.
      engine?.gain.gain.setTargetAtTime(0, now(), 0.05);
    });
  };

  const playSample = (key, { at = now(), bus = null, peak = 1 } = {}) => {
    const buffer = sampleBuffers.get(key);
    if (!buffer) return false;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = peak;
    source.connect(gain).connect(bus || sfxBus);
    source.start(at);
    return true;
  };

  const fadeOutMusic = (handle, fadeSeconds) => {
    if (!handle) return;
    const at = now();
    const end = at + fadeSeconds;
    try {
      handle.gain.gain.cancelScheduledValues?.(at);
      handle.gain.gain.setValueAtTime(handle.gain.gain.value, at);
      handle.gain.gain.linearRampToValueAtTime(0.0001, end);
      handle.source.stop(end + 0.05);
    } catch {}
  };

  const startMusicSource = (name, buffer, entry, fadeSeconds) => {
    const at = now();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(entry.gain ?? 1, at + fadeSeconds);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    // loopEnd of 0 means "to the end of the buffer" in the Web Audio spec, so
    // only override when the bed actually carries cut points. A bed cut at a
    // zero crossing on a bar line needs neither.
    if (entry.loopEnd) {
      source.loopStart = entry.loopStart || 0;
      source.loopEnd = entry.loopEnd;
    }
    source.connect(gain).connect(musicBus);
    source.start(at);
    music = { gain, name, source };
  };

  // Crossfades to `name`, or to silence when name is null. Returns whether a
  // bed is now playing, so a caller can tell "no such bed" from "playing".
  const playMusic = async (name, { fadeMs = 800 } = {}) => {
    requestedMusic = name || null;
    if (!name) {
      fadeOutMusic(music, fadeMs / 1000);
      music = null;
      return false;
    }
    if (music?.name === name) return true;
    const entry = musicEntryFor(name);
    if (!entry) return false;
    // Muted: remember the request and skip the download entirely. setMuted
    // starts it if the player ever unmutes.
    if (muted) return false;
    // Deliberately does NOT ensureContext(). Creating the context here would
    // break the gesture-only rule this module is built around — and the race
    // asks for its bed on mount, long before the player has touched anything.
    // The request is already recorded; ensureContext starts it on unlock.
    if (!ctx) return false;
    const buffer = await loadSample(`music:${name}`, entry.url);
    // A slow decode must not stomp a bed chosen while it was in flight.
    if (!buffer || disposed || requestedMusic !== name || music?.name === name) return false;
    const fadeSeconds = Math.max(0.01, fadeMs / 1000);
    fadeOutMusic(music, fadeSeconds);
    startMusicSource(name, buffer, entry, fadeSeconds);
    return true;
  };

  const stopMusic = ({ fadeMs = 600 } = {}) => {
    requestedMusic = null;
    fadeOutMusic(music, Math.max(0.01, fadeMs / 1000));
    music = null;
  };

  const startRequestedMusic = () => {
    if (requestedMusic && !music && !muted) playMusic(requestedMusic);
  };

  const envGain = (peak, duration, at = now()) => {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    gain.connect(sfxBus || master);
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

  // The ONE entry point for a one-shot. Sample if we have it, synth if we do
  // not — and either way kick off the load so the next occurrence is sampled.
  const playCue = (name) => {
    if (!ctx || muted || ctx.state !== 'running') return;
    if (playSample(name, { peak: CUE_GAIN[name] ?? 0.07 })) return;
    loadSample(name, sfxUrlFor(name));
    CUE_RECIPES[name]?.();
  };

  const updateFrame = ({ driftState, race }) => {
    if (disposed || !race) return;
    const next = snapshotRaceForAudio(race, driftState);
    if (ctx && ctx.state === 'running' && !muted) {
      const time = ctx.currentTime;
      const speedRatio = Math.max(0, (race.speed || 0) / 240);
      const boosting = next.boost || next.miniTurbo;
      const freq = engineFrequencyFor(speedRatio, boosting);
      const cutoff = ENGINE_FILTER_BASE + speedRatio * ENGINE_FILTER_PER_SPEED;
      engine.osc.frequency.setTargetAtTime(freq, time, 0.06);
      engine.sub.frequency.setTargetAtTime(freq / 2, time, 0.06);
      engine.filter.frequency.setTargetAtTime(cutoff, time, 0.08);
      if (engineSample) {
        // Same curve, expressed as a resampling ratio. setTargetAtTime rather
        // than a hard write so a speed spike glides instead of chirping.
        engineSample.source.playbackRate.setTargetAtTime(freq / ENGINE_SAMPLE_BASE_HZ, time, 0.06);
        engineSample.filter.frequency.setTargetAtTime(cutoff, time, 0.08);
      }
      // Engine sits out until the countdown ends, ducks while spun out.
      const engineTarget =
        next.countdownCeil > 0
          ? ENGINE_GAIN_COUNTDOWN
          : next.spin
            ? ENGINE_GAIN_SPIN
            : ENGINE_GAIN_IDLE + speedRatio * ENGINE_GAIN_PER_SPEED;
      // Whichever engine is live takes the envelope; the other stays at zero.
      if (engineSample) {
        engineSample.gain.gain.setTargetAtTime(engineTarget, time, 0.1);
        engine.gain.gain.setTargetAtTime(0, time, 0.1);
      } else {
        engine.gain.gain.setTargetAtTime(engineTarget, time, 0.1);
      }
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
    // Unmuting is the moment a bed that was skipped while muted gets fetched.
    if (!muted) startRequestedMusic();
    return muted;
  };

  const dispose = () => {
    disposed = true;
    detachGesture?.();
    detachGesture = null;
    try {
      music?.source.stop();
    } catch {}
    try {
      engineSample?.source.stop();
    } catch {}
    engineSample = null;
    try {
      ctx?.close?.();
    } catch {}
    ctx = null;
    engine = null;
    driftLoop = null;
    music = null;
    requestedMusic = null;
    prev = null;
    sampleBuffers.clear();
    samplePending.clear();
    sampleFailed.clear();
  };

  return {
    attach,
    currentMusic: () => music?.name || null,
    dispose,
    isMuted: () => muted,
    isRunning: () => ctx?.state === 'running',
    // Sample counts are published as telemetry so a headless gate can tell
    // "the sample path ran" from "the synth covered for it" — the distinction
    // is inaudible to a test and is exactly what regresses silently.
    loadedSampleCount: () => sampleBuffers.size,
    failedSampleCount: () => sampleFailed.size,
    // Which engine is actually making noise. Without this a gate cannot tell a
    // sampled engine from the synth quietly standing in for it.
    engineSource: () => (engineSample ? 'sample' : 'synth'),
    playCue,
    playMusic,
    resume,
    setMuted,
    stopMusic,
    suspend,
    updateFrame,
  };
};
