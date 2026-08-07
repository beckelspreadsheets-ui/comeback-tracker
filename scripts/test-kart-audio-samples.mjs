// Does the sample-playback path actually play samples?
//
// Until 2026-08-04 `kartAudio.js` had 4 createOscillator calls and ZERO
// decodeAudioData — there was no way to play a recorded sound at all, and the
// docs that said otherwise were pointing at `AudioManager.js`, a file the kart
// build has never loaded. This gate exists so that stays fixed, and so the
// three failure modes below stay INAUDIBLE-BUT-DETECTED:
//
//   1. a cue silently falls back to the synth because its file 404s — the game
//      still makes a noise, so no listening test and no console error catches it;
//   2. a sample plays but bypasses its bus, so the mute button no longer cuts it;
//   3. a bed loops over the whole buffer when the manifest asked for cut points.
//
//   node scripts/test-kart-audio-samples.mjs
//
// Runs in plain Node against a fake AudioContext — no browser, no server, no
// GL, and therefore no sensitivity to machine load. kartAudio.js is kept free
// of Vite-only syntax specifically so this import works; the `import.meta.glob`
// lives in kartAudioAssets.js and the manifest is injected as data.
import { createKartAudio, measureLoopWindow } from '../src/game/race/kartAudio.js';

const cases = [];
const check = (name, actual, expected) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  cases.push({ actual, expected, name, pass });
};

// ── Fake Web Audio ────────────────────────────────────────────────────────
// Records the graph so the test can assert ROUTING, not just that a call was
// made. Every node keeps its outgoing edges; walking them to `destination` is
// how "does mute cut this?" becomes a checkable question.
const makeParam = (value) => ({
  value,
  cancelScheduledValues() {},
  exponentialRampToValueAtTime(v) {
    this.value = v;
  },
  linearRampToValueAtTime(v) {
    this.value = v;
  },
  setTargetAtTime(v) {
    this.target = v;
  },
  setValueAtTime(v) {
    this.value = v;
  },
});

// 25 ms of silence then a tone — what an mp3 decode of the beds looks like.
const DECODED_CHANNEL = (() => {
  const sampleRate = 44100;
  const lead = Math.round(0.025 * sampleRate);
  const data = new Float32Array(sampleRate * 120);
  for (let i = lead; i < data.length; i += 1) data[i] = Math.sin(i * 0.05) * 0.4;
  return data;
})();

const node = (kind, extra = {}) => ({
  kind,
  connections: [],
  connect(target) {
    this.connections.push(target);
    return target;
  },
  disconnect() {},
  ...extra,
});

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 48000;
    this.state = 'suspended';
    this.destination = node('destination');
    this.created = { buffer: [], gain: [], oscillator: [], source: [] };
    this.decodeCalls = 0;
    this.decodeShouldFail = false;
  }
  createGain() {
    const g = node('gain', { gain: makeParam(1) });
    this.created.gain.push(g);
    return g;
  }
  createOscillator() {
    const o = node('oscillator', {
      detune: makeParam(0),
      frequency: makeParam(440),
      type: 'sine',
      start() {},
      stop() {},
    });
    this.created.oscillator.push(o);
    return o;
  }
  createBiquadFilter() {
    return node('filter', { frequency: makeParam(350), Q: makeParam(1), type: 'lowpass' });
  }
  createBufferSource() {
    const s = node('source', {
      buffer: null,
      loop: false,
      loopEnd: 0,
      loopStart: 0,
      // A real AudioBufferSourceNode always carries these; the engine loop is
      // pitch-shifted through playbackRate.
      detune: makeParam(0),
      playbackRate: makeParam(1),
      started: false,
      stopped: false,
      start() {
        this.started = true;
      },
      stop() {
        this.stopped = true;
      },
    });
    this.created.source.push(s);
    return s;
  }
  createBuffer(channels, length) {
    const b = { duration: length / this.sampleRate, getChannelData: () => new Float32Array(length), length };
    this.created.buffer.push(b);
    return b;
  }
  decodeAudioData(raw, ok, bad) {
    this.decodeCalls += 1;
    if (this.decodeShouldFail) return Promise.resolve().then(() => bad(new Error('bad data')));
    // A REALISTIC decoded buffer: 25 ms of encoder-delay silence on the head,
    // then content. Returning a featureless stub here would let the loop-window
    // measurement be skipped entirely and still look green.
    return Promise.resolve().then(() =>
      ok({
        decoded: true,
        duration: 120,
        getChannelData: () => DECODED_CHANNEL,
        raw,
        sampleRate: 44100,
      })
    );
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
}

const makeWindow = ({ fetchImpl } = {}) => {
  const listeners = new Map();
  let ctx = null;
  return {
    get ctx() {
      return ctx;
    },
    AudioContext: class extends FakeAudioContext {
      constructor() {
        super();
        ctx = this;
      }
    },
    fetch: fetchImpl || (() => Promise.resolve({ ok: true, status: 200, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) })),
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(handler);
    },
    removeEventListener(type, handler) {
      listeners.get(type)?.delete(handler);
    },
    gesture() {
      listeners.get('pointerdown')?.forEach((handler) => handler());
    },
  };
};

// localStorage stub — setMuted persists, and we do not want a real one.
const storage = (() => {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)) };
})();

// Promises here are all pre-resolved, so a handful of microtask turns is
// enough to settle fetch → arrayBuffer → decode → cache.
const flush = async (turns = 12) => {
  for (let i = 0; i < turns; i += 1) await Promise.resolve();
};

// Walks the recorded edges from `from` to the context destination, returning
// the gain values it passes through. This is what turns "mute cuts everything"
// into an assertion instead of a hope.
const gainsOnPathToDestination = (from, ctx) => {
  const seen = new Set();
  const walk = (current, gains) => {
    if (current === ctx.destination) return gains;
    if (seen.has(current)) return null;
    seen.add(current);
    for (const next of current.connections || []) {
      const carried = current.kind === 'gain' ? [...gains, current] : gains;
      const found = walk(next, carried);
      if (found) return found;
    }
    return null;
  };
  return walk(from, []);
};

const ASSETS = {
  engine: '/audio/engine-loop.wav',
  music: {
    'comeback-city': { loopSeconds: 61.935484, url: '/audio/comeback-city.mp3' },
    // No declared length -> must loop over the whole buffer.
    'penguin-village': { url: '/audio/penguin-village.mp3' },
  },
  sfx: { boost: '/audio/boost.mp3', coin: '/audio/coin.mp3' },
};

const bootUnlocked = async (options = {}) => {
  const audioWindow = makeWindow(options);
  const audio = createKartAudio({ assets: ASSETS, audioWindow, storage, ...(options.audioOptions || {}) });
  audio.attach();
  audioWindow.gesture();
  await flush();
  return { audio, audioWindow };
};

// ── 1. A cue with a file plays the FILE, and routes through the sfx bus ────
{
  const { audio, audioWindow } = await bootUnlocked();
  const ctx = audioWindow.ctx;
  // 3 = two one-shots + the engine loop, which preloads on the same gesture.
  check('preload decoded both one-shots and the engine', audio.loadedSampleCount(), 3);
  const oscBefore = ctx.created.oscillator.length;
  const sourcesBefore = ctx.created.source.length;
  audio.playCue('coin');
  check('sampled cue started a buffer source', ctx.created.source.length, sourcesBefore + 1);
  check('sampled cue did NOT also fire the synth', ctx.created.oscillator.length, oscBefore);

  const played = ctx.created.source[ctx.created.source.length - 1];
  check('sample buffer attached', Boolean(played.buffer), true);
  check('one-shot does not loop', played.loop, false);
  // Sample files are normalised to full scale, so the mix balance lives in
  // CUE_GAIN. If that lookup ever breaks, every cue plays at the same level
  // and the game gets a coin as loud as a finish fanfare — audible, but only
  // once someone plays it. 0.035 is `coin`'s oscillator-recipe peak.
  const cueGain = ctx.created.gain[ctx.created.gain.length - 1];
  check('sampled cue plays at its mapped level', cueGain.gain.value, 0.035);

  const path = gainsOnPathToDestination(played, ctx);
  check('sampled cue reaches the destination', Array.isArray(path), true);
  // 0.9 is the sfx bus trim, 0.5 is master. Both on the path means the mute
  // button (which rides master) cuts sampled cues.
  check('sampled cue routes through sfx bus then master', path?.map((g) => g.gain.value).includes(0.9), true);
  check('sampled cue routes through master', path?.some((g) => g.gain.value === 0.5), true);
}

// ── 2. A cue with NO file falls back to the oscillator recipe ──────────────
{
  const { audio, audioWindow } = await bootUnlocked();
  const ctx = audioWindow.ctx;
  const oscBefore = ctx.created.oscillator.length;
  audio.playCue('finish'); // no finish.mp3 in ASSETS
  check('unsampled cue fell back to the synth', ctx.created.oscillator.length > oscBefore, true);
  check('unsampled cue did not count as loaded', audio.loadedSampleCount(), 3);
}

// ── 3. A 404 degrades to the synth, does not throw, and does not re-fetch ──
{
  let calls = 0;
  const { audio, audioWindow } = await bootUnlocked({
    fetchImpl: () => {
      calls += 1;
      return Promise.resolve({ ok: false, status: 404, arrayBuffer: () => Promise.reject(new Error('no body')) });
    },
  });
  const ctx = audioWindow.ctx;
  check('404 loaded nothing', audio.loadedSampleCount(), 0);
  check('404 tombstoned every name', audio.failedSampleCount(), 3);
  const callsAfterPreload = calls;
  const oscBefore = ctx.created.oscillator.length;
  audio.playCue('coin');
  await flush();
  check('404 cue still made a sound', ctx.created.oscillator.length > oscBefore, true);
  check('404 is not retried on every cue', calls, callsAfterPreload);
}

// ── 4. A corrupt file degrades the same way ───────────────────────────────
{
  const audioWindow = makeWindow();
  const audio = createKartAudio({ assets: ASSETS, audioWindow, storage });
  audio.attach();
  audioWindow.gesture();
  audioWindow.ctx.decodeShouldFail = true;
  await flush();
  check('decode failure loaded nothing', audio.loadedSampleCount(), 0);
  check('decode failure tombstoned', audio.failedSampleCount() > 0, true);
  const oscBefore = audioWindow.ctx.created.oscillator.length;
  audio.playCue('coin');
  check('decode failure still made a sound', audioWindow.ctx.created.oscillator.length > oscBefore, true);
}

// ── 5. Mute silences the sample path too ──────────────────────────────────
{
  const { audio, audioWindow } = await bootUnlocked();
  const ctx = audioWindow.ctx;
  audio.setMuted(true);
  const sourcesBefore = ctx.created.source.length;
  const oscBefore = ctx.created.oscillator.length;
  audio.playCue('coin');
  check('muted plays no sample', ctx.created.source.length, sourcesBefore);
  check('muted plays no synth', ctx.created.oscillator.length, oscBefore);
  const master = ctx.created.gain.find((g) => g.connections.includes(ctx.destination));
  check('mute drives master to zero', master.gain.target, 0);
  audio.setMuted(false);
  check('unmute restores master', master.gain.target, 0.5);
}

// ── 6. Music loops, honours cut points, and crossfades ────────────────────
{
  const { audio, audioWindow } = await bootUnlocked();
  const ctx = audioWindow.ctx;
  await audio.playMusic('comeback-city', { fadeMs: 400 });
  await flush();
  check('bed reported as playing', audio.currentMusic(), 'comeback-city');
  const bed = ctx.created.source[ctx.created.source.length - 1];
  check('bed loops', bed.loop, true);
  // Measured off the decoded buffer, not read from the manifest.
  check('bed loopStart is the MEASURED lead-in', Math.abs(bed.loopStart - 0.025) < 0.002, true);
  check(
    'bed loop length is the declared musical length',
    Math.abs(bed.loopEnd - bed.loopStart - 61.935484) < 1e-6,
    true
  );
  const musicPath = gainsOnPathToDestination(bed, ctx);
  check('bed routes through music bus', musicPath?.map((g) => g.gain.value).includes(0.55), true);
  check('bed routes through master (so mute cuts it)', musicPath?.some((g) => g.gain.value === 0.5), true);

  // A bed with no cut points must loop over the whole buffer: loopEnd 0 means
  // "end of buffer" in the spec, and setting it to anything else truncates.
  await audio.playMusic('penguin-village', { fadeMs: 400 });
  await flush();
  check('crossfade stopped the outgoing bed', bed.stopped, true);
  check('crossfade switched the reported bed', audio.currentMusic(), 'penguin-village');
  const second = ctx.created.source[ctx.created.source.length - 1];
  check('uncut bed loops over the whole buffer', second.loopEnd, 0);

  await audio.playMusic(null);
  check('stopping clears the reported bed', audio.currentMusic(), null);
}

// ── 7. A bed asked for before the unlock gesture is not lost ──────────────
// The race asks for its track bed on mount, which is long before the player
// touches anything. Requesting must not create a context (that would break the
// autoplay rule the whole module is built on) and must not drop the request.
{
  const audioWindow = makeWindow();
  const audio = createKartAudio({ assets: ASSETS, audioWindow, storage });
  audio.attach();
  await audio.playMusic('comeback-city');
  await flush();
  check('no context constructed before the gesture', Boolean(audioWindow.ctx), false);
  check('nothing playing before the gesture', audio.currentMusic(), null);
  audioWindow.gesture();
  await flush();
  check('the deferred bed starts on the gesture', audio.currentMusic(), 'comeback-city');
}

// ── 8. Muted at boot never downloads the bed; unmuting starts it ──────────
{
  let musicFetches = 0;
  const audioWindow = makeWindow({
    fetchImpl: (url) => {
      if (String(url).includes('comeback-city')) musicFetches += 1;
      return Promise.resolve({ ok: true, status: 200, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });
    },
  });
  const audio = createKartAudio({ assets: ASSETS, audioWindow, muted: true, storage });
  audio.attach();
  audioWindow.gesture();
  await audio.playMusic('comeback-city');
  await flush();
  check('muted boot does not download the bed', musicFetches, 0);
  check('muted boot plays no bed', audio.currentMusic(), null);
  audio.setMuted(false);
  await flush();
  check('unmuting downloads the bed once', musicFetches, 1);
  check('unmuting starts the bed', audio.currentMusic(), 'comeback-city');
}

// ── 9. The sampled engine takes over, and follows the same pitch curve ────
// Owner asked for a real sample here (2026-08-07). The condition under which
// that is an upgrade and not a downgrade is that it stays speed-reactive — a
// static engine loop is worse than the synth it replaced, and it would sound
// completely fine in any test that only asked "is the engine audible?".
{
  const { audio, audioWindow } = await bootUnlocked();
  const ctx = audioWindow.ctx;
  check('engine reports the sample path', audio.engineSource(), 'sample');

  // Selected by DECODED buffer, not by `loop` — the drift scrape is also a
  // looping BufferSource and is created first, so a naive find() picks it up.
  const engineLoop = ctx.created.source.find((source) => source.loop && source.buffer?.decoded);
  check('engine loop is looping', Boolean(engineLoop), true);

  // Drive it at two speeds and assert the pitch ratio matches the shared
  // curve, so the sample and the synth can never diverge.
  const frameAt = (speed) => {
    audio.updateFrame({
      driftState: { miniTurboTimer: 0, tier: 0 },
      race: { airState: {}, coins: 0, countdown: 0, lap: 1, speed },
    });
  };
  frameAt(0);
  frameAt(0);
  const idleRate = engineLoop.playbackRate.target;
  frameAt(240);
  const fastRate = engineLoop.playbackRate.target;
  check('engine pitch rises with speed', fastRate > idleRate, true);
  // engineFrequencyFor(1, false) = 42 + 118 = 160 -> 160/100 = 1.6
  check('engine pitch follows engineFrequencyFor', Number(fastRate.toFixed(4)), 1.6);
  check('engine idle pitch follows the curve', Number(idleRate.toFixed(4)), 0.42);
}

// ── 10. No engine file: the synth still runs the engine ───────────────────
{
  const audioWindow = makeWindow();
  const audio = createKartAudio({
    assets: { ...ASSETS, engine: null },
    audioWindow,
    storage,
  });
  audio.attach();
  audioWindow.gesture();
  await flush();
  check('no engine file falls back to the synth', audio.engineSource(), 'synth');
  check('synth engine oscillators exist', audioWindow.ctx.created.oscillator.length >= 3, true);
}

// ── 11. The loop window is MEASURED off the decoded buffer ────────────────
// mp3 encoder delay is silence on the head of the decoded buffer, and browsers
// disagree about stripping it. Hard-coding loopStart is right on one browser
// and a beat late on another — every lap, for the whole race. So the lead-in
// is measured, and this is where that measurement is pinned down.
{
  const sampleRate = 44100;
  const makeBuffer = (leadSeconds, musicSeconds) => {
    const lead = Math.round(leadSeconds * sampleRate);
    const data = new Float32Array(lead + Math.round(musicSeconds * sampleRate));
    for (let i = lead; i < data.length; i += 1) data[i] = Math.sin(i * 0.05) * 0.5;
    return data;
  };

  // Chrome-like: ~25 ms of encoder delay left on the front.
  const withDelay = makeBuffer(0.025, 61.94);
  const measured = measureLoopWindow(withDelay, sampleRate, 61.935484, withDelay.length / sampleRate);
  check('lead-in detected', Math.abs(measured.loopStart - 0.025) < 0.002, true);
  check(
    'loop length is the musical length, not the file length',
    Math.abs(measured.loopEnd - measured.loopStart - 61.935484) < 1e-6,
    true
  );

  // Firefox-like: delay already stripped, music starts at sample 0.
  const noDelay = makeBuffer(0, 61.94);
  const stripped = measureLoopWindow(noDelay, sampleRate, 61.935484, noDelay.length / sampleRate);
  // Within a sample of zero: the synthetic tone's own sample 0 is a zero
  // crossing, so one sample of lead is the correct answer, not a miss.
  check('no lead-in still measures cleanly', stripped.loopStart < 0.001, true);

  // A bed that fades in from silence would give a bogus offset — better to
  // loop the whole buffer than to trust it.
  const fadeIn = new Float32Array(Math.round(0.5 * sampleRate));
  check('an all-quiet head falls back to whole-buffer looping', measureLoopWindow(fadeIn, sampleRate, 0.4, 0.5), null);

  // Numbers that disagree with the file must not loop past its end.
  check(
    'a loop longer than the buffer falls back',
    measureLoopWindow(withDelay, sampleRate, 900, withDelay.length / sampleRate),
    null
  );
  check('no declared length means no window', measureLoopWindow(withDelay, sampleRate, 0, 1), null);
}

// ── 12. A bed starts AT the music, not at the file ────────────────────────
{
  const { audio, audioWindow } = await bootUnlocked({
    audioOptions: {
      assets: {
        engine: null,
        music: { menu: { loopSeconds: 2, url: '/audio/menu.mp3' } },
        sfx: {},
      },
    },
  });
  await audio.playMusic('menu');
  await flush();
  check('menu bed plays', audio.currentMusic(), 'menu');
  const bed = audioWindow.ctx.created.source[audioWindow.ctx.created.source.length - 1];
  check('bed loops', bed.loop, true);
}

// ── report ────────────────────────────────────────────────────────────────
const failed = cases.filter((c) => !c.pass);
cases.forEach((c) => {
  process.stdout.write(
    `${c.pass ? 'ok  ' : 'FAIL'} ${c.name}${c.pass ? '' : ` — expected ${JSON.stringify(c.expected)}, got ${JSON.stringify(c.actual)}`}\n`
  );
});
process.stdout.write(`\n${cases.length - failed.length}/${cases.length} checks passed\n`);
if (failed.length) {
  process.stderr.write(`FAIL: kart audio sample path — ${failed.length} check(s) failed.\n`);
  process.exit(1);
}
process.stdout.write('PASS: kart audio sample path.\n');
