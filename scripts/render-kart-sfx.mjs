// Renders the 20 kart one-shots offline, as real audio files.
//
//   node scripts/render-kart-sfx.mjs
//
// WHY THIS EXISTS. The inventory is fixed — `cuesForTransition` in
// src/game/race/kartAudio.js fires exactly 20 cue names and that list is the
// spec. Six of those twenty are LADDERS (`tier-1..3`, `mini-turbo-1..3`) that
// have to sound like one rising set, which is precisely what a text-to-audio
// model is worst at: ask it three times and you get three unrelated noises.
// Here the ladder is a loop over a parameter, so coherence is structural.
//
// Everything is deterministic: the noise PRNG is seeded from the cue name, so
// re-running this produces byte-identical files and a clean diff.
//
// LEVELS. Each file is normalised to full scale for encoding quality, and the
// per-cue mix level lives in CUE_GAIN in kartAudio.js instead — set to the
// exact peak its oscillator recipe used. So a sample and the synth fallback it
// replaces play at the SAME loudness, which is what makes a missing file
// inaudible as a bug rather than obvious as a volume jump.
//
// FORMAT. mp3, LAME VBR -q:a 2 (~190 kbps) mono. The files are a few KB each
// either way, so the high setting is free, and it buys headroom against the
// two things cheap mp3 does to short percussive sounds: pre-echo smearing the
// attack of the coin/tier chirps, and a dulled top end on the noise whooshes.
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src', 'assets', 'game', 'audio', 'sfx');
const wavDir = path.join(root, 'tmp', 'kart-sfx');

// ── deterministic noise ───────────────────────────────────────────────────
const seedFrom = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const mulberry32 = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ── primitives ────────────────────────────────────────────────────────────
const track = (seconds) => new Float32Array(Math.ceil(seconds * SR));

const wave = (type, phase) => {
  const p = phase % 1;
  if (type === 'sine') return Math.sin(2 * Math.PI * p);
  if (type === 'square') return p < 0.5 ? 1 : -1;
  if (type === 'saw') return 1 - 2 * p;
  if (type === 'triangle') return 2 * Math.abs(2 * p - 1) - 1;
  return 0;
};

// RBJ cookbook biquad, recomputed per sample so a filter can sweep.
const coeffs = (type, f0, Q) => {
  const w0 = (2 * Math.PI * Math.min(Math.max(f0, 20), SR * 0.45)) / SR;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * Q);
  let b0;
  let b1;
  let b2;
  if (type === 'lowpass') {
    b0 = (1 - cos) / 2;
    b1 = 1 - cos;
    b2 = b0;
  } else if (type === 'highpass') {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = b0;
  } else {
    b0 = alpha;
    b1 = 0;
    b2 = -alpha;
  }
  const a0 = 1 + alpha;
  return [b0 / a0, b1 / a0, b2 / a0, (-2 * cos) / a0, (1 - alpha) / a0];
};

const makeFilter = () => ({ x1: 0, x2: 0, y1: 0, y2: 0 });
const stepFilter = (state, input, [b0, b1, b2, a1, a2]) => {
  const y = b0 * input + b1 * state.x1 + b2 * state.x2 - a1 * state.y1 - a2 * state.y2;
  state.x2 = state.x1;
  state.x1 = input;
  state.y2 = state.y1;
  state.y1 = y;
  return y;
};

const glide = (from, to, u) => (to === from ? from : from * (to / from) ** u);

// A pitched layer. `fm` turns it into a 2-operator bell, which is what makes
// the coin and lap chimes read as metal rather than as a test tone.
const addTone = (buf, { at = 0, attackMs = 3, decay = 5, dur, fm = null, from, peak = 1, to = null, type = 'sine' }) => {
  const start = Math.floor(at * SR);
  const n = Math.floor(dur * SR);
  const attackN = Math.max(1, Math.floor((attackMs / 1000) * SR));
  const target = to ?? from;
  let phase = 0;
  let fmPhase = 0;
  for (let i = 0; i < n; i += 1) {
    const idx = start + i;
    if (idx >= buf.length) break;
    const u = i / n;
    const f = glide(from, target, u);
    let sample;
    if (fm) {
      fmPhase += (f * fm.ratio) / SR;
      const index = fm.index * Math.exp(-u * (fm.decay ?? 6));
      sample = Math.sin(2 * Math.PI * phase + index * Math.sin(2 * Math.PI * fmPhase));
    } else {
      sample = wave(type, phase);
    }
    phase += f / SR;
    buf[idx] += sample * Math.exp(-u * decay) * Math.min(1, i / attackN) * peak;
  }
};

// A noise layer through a sweeping filter — every whoosh, scrape and thud.
const addNoise = (buf, { at = 0, attackMs = 2, decay = 5, dur, filter = null, peak = 1, seed = 1 }) => {
  const start = Math.floor(at * SR);
  const n = Math.floor(dur * SR);
  const attackN = Math.max(1, Math.floor((attackMs / 1000) * SR));
  const rng = mulberry32(seed);
  const state = makeFilter();
  for (let i = 0; i < n; i += 1) {
    const idx = start + i;
    if (idx >= buf.length) break;
    const u = i / n;
    let sample = rng() * 2 - 1;
    if (filter) {
      const f = glide(filter.from, filter.to ?? filter.from, u);
      sample = stepFilter(state, sample, coeffs(filter.type || 'bandpass', f, filter.q ?? 1));
    }
    buf[idx] += sample * Math.exp(-u * decay) * Math.min(1, i / attackN) * peak;
  }
};

// Cheap arcade sparkle: a few decaying taps. Not a reverb, and not trying to
// be — it just stops short chimes sounding like they were recorded in a box.
const addTail = (buf, { delay = 0.055, feedback = 0.42, mix = 0.3, taps = 5 }) => {
  const source = Float32Array.from(buf);
  for (let tap = 1; tap <= taps; tap += 1) {
    const offset = Math.floor(delay * tap * SR);
    const gain = mix * feedback ** (tap - 1);
    for (let i = 0; i + offset < buf.length; i += 1) buf[i + offset] += source[i] * gain;
  }
};

const softClip = (buf, drive) => {
  const norm = Math.tanh(drive);
  for (let i = 0; i < buf.length; i += 1) buf[i] = Math.tanh(buf[i] * drive) / norm;
};

// Normalise, de-click with short fades, and drop the silent tail so a 0.6s
// buffer holding 0.3s of sound does not ship 0.3s of encoded nothing.
const finalise = (buf, { peak = 0.95, fadeMs = 4 } = {}) => {
  let last = 0;
  let max = 0;
  for (let i = 0; i < buf.length; i += 1) {
    const abs = Math.abs(buf[i]);
    if (abs > max) max = abs;
    if (abs > 2e-4) last = i;
  }
  const out = buf.subarray(0, Math.min(buf.length, last + Math.floor(0.01 * SR)));
  const scale = max > 0 ? peak / max : 1;
  const fadeN = Math.max(1, Math.floor((fadeMs / 1000) * SR));
  for (let i = 0; i < out.length; i += 1) {
    const fadeIn = Math.min(1, i / fadeN);
    const fadeOut = Math.min(1, (out.length - i) / fadeN);
    out[i] *= scale * fadeIn * fadeOut;
  }
  return out;
};

const writeWav = (filePath, samples) => {
  const bytes = samples.length * 2;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + bytes, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(bytes, 40);
  const body = Buffer.alloc(bytes);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    body.writeInt16LE(Math.round(clamped * 32767), i * 2);
  }
  writeFileSync(filePath, Buffer.concat([header, body]));
};

// ── the twenty ────────────────────────────────────────────────────────────
// Pitches deliberately match the oscillator recipes they replace. That keeps
// the ladder relationships the game already implies, and makes each sample
// read as a better-made version of the sound rather than a different game.
const COUNTDOWN_PITCH = { 'countdown-1': 494, 'countdown-2': 392, 'countdown-3': 330 };
const TIER_SWEEP = { 'tier-1': [750, 900], 'tier-2': [1000, 1200], 'tier-3': [1250, 1550] };
const TURBO_TOP = { 'mini-turbo-1': 1080, 'mini-turbo-2': 1290, 'mini-turbo-3': 1560 };

const RECIPES = {
  boost: (seed) => {
    const buf = track(0.62);
    addNoise(buf, { decay: 3.4, dur: 0.5, filter: { from: 320, q: 0.9, to: 3400, type: 'bandpass' }, peak: 0.9, seed });
    addTone(buf, { decay: 3, dur: 0.42, from: 220, peak: 0.55, to: 460, type: 'saw' });
    addTone(buf, { decay: 4, dur: 0.3, from: 110, peak: 0.3, to: 230, type: 'square' });
    softClip(buf, 1.7);
    return buf;
  },
  coin: (seed) => {
    const buf = track(0.34);
    addTone(buf, { decay: 9, dur: 0.16, fm: { decay: 7, index: 2.4, ratio: 3.01 }, from: 1245, peak: 0.9, to: 1661 });
    addTone(buf, { at: 0.045, decay: 11, dur: 0.12, from: 2490, peak: 0.22, type: 'triangle' });
    addTail(buf, { delay: 0.038, feedback: 0.3, mix: 0.22, taps: 3 });
    return buf;
  },
  'coin-loss': (seed) => {
    const buf = track(0.36);
    addTone(buf, { decay: 5, dur: 0.26, from: 880, peak: 0.8, to: 415, type: 'square' });
    addTone(buf, { decay: 6, dur: 0.22, from: 440, peak: 0.3, to: 207, type: 'triangle' });
    addNoise(buf, { decay: 12, dur: 0.1, filter: { from: 1800, q: 1.2, to: 600, type: 'bandpass' }, peak: 0.25, seed });
    return buf;
  },
  'drift-start': (seed) => {
    const buf = track(0.2);
    addNoise(buf, { decay: 9, dur: 0.14, filter: { from: 700, q: 2.2, to: 1750, type: 'bandpass' }, peak: 0.95, seed });
    addTone(buf, { decay: 12, dur: 0.09, from: 620, peak: 0.2, to: 980, type: 'triangle' });
    return buf;
  },
  finish: (seed) => {
    const buf = track(1.5);
    [523, 659, 784, 1047].forEach((freq, index) => {
      const last = index === 3;
      addTone(buf, {
        at: index * 0.15,
        decay: last ? 3.2 : 7,
        dur: last ? 0.7 : 0.2,
        fm: { decay: 5, index: 1.9, ratio: 2.01 },
        from: freq,
        peak: last ? 0.95 : 0.7,
      });
    });
    addNoise(buf, { at: 0.45, decay: 4, dur: 0.5, filter: { from: 3000, q: 0.8, to: 7000, type: 'bandpass' }, peak: 0.16, seed });
    addTail(buf, { delay: 0.07, feedback: 0.4, mix: 0.26, taps: 4 });
    return buf;
  },
  go: (seed) => {
    const buf = track(0.8);
    addTone(buf, { decay: 3.6, dur: 0.5, from: 587, peak: 0.85, to: 700, type: 'square' });
    addTone(buf, { decay: 4, dur: 0.45, from: 880, peak: 0.5, to: 1050, type: 'triangle' });
    addTone(buf, { decay: 5, dur: 0.35, from: 293, peak: 0.4, to: 350, type: 'saw' });
    addNoise(buf, { decay: 10, dur: 0.2, filter: { from: 900, q: 0.7, to: 5200, type: 'bandpass' }, peak: 0.4, seed });
    softClip(buf, 1.5);
    addTail(buf, { delay: 0.062, feedback: 0.34, mix: 0.2, taps: 3 });
    return buf;
  },
  'item-pickup': (seed) => {
    const buf = track(0.36);
    addTone(buf, { decay: 10, dur: 0.1, from: 660, peak: 0.75, type: 'triangle' });
    addTone(buf, { at: 0.075, decay: 7, dur: 0.16, fm: { decay: 8, index: 1.6, ratio: 2.01 }, from: 990, peak: 0.9 });
    addTail(buf, { delay: 0.045, feedback: 0.3, mix: 0.2, taps: 3 });
    return buf;
  },
  'item-use': (seed) => {
    const buf = track(0.4);
    addNoise(buf, { decay: 4.5, dur: 0.3, filter: { from: 500, q: 1.1, to: 2600, type: 'bandpass' }, peak: 0.9, seed });
    addTone(buf, { decay: 5, dur: 0.22, from: 330, peak: 0.35, to: 880, type: 'saw' });
    return buf;
  },
  land: (seed) => {
    const buf = track(0.3);
    addTone(buf, { attackMs: 1, decay: 8, dur: 0.22, from: 150, peak: 0.95, to: 78, type: 'sine' });
    addNoise(buf, { attackMs: 1, decay: 26, dur: 0.09, filter: { from: 900, q: 0.7, to: 220, type: 'lowpass' }, peak: 0.5, seed });
    softClip(buf, 1.3);
    return buf;
  },
  lap: (seed) => {
    const buf = track(0.7);
    addTone(buf, { decay: 7, dur: 0.18, fm: { decay: 6, index: 1.8, ratio: 2.01 }, from: 523, peak: 0.8 });
    addTone(buf, { at: 0.105, decay: 4.5, dur: 0.34, fm: { decay: 6, index: 2, ratio: 2.01 }, from: 784, peak: 0.95 });
    addTail(buf, { delay: 0.058, feedback: 0.38, mix: 0.26, taps: 4 });
    return buf;
  },
  'spin-out': (seed) => {
    const buf = track(0.6);
    addTone(buf, { decay: 3.4, dur: 0.42, from: 240, peak: 0.8, to: 82, type: 'square' });
    addTone(buf, { decay: 4, dur: 0.38, from: 120, peak: 0.35, to: 41, type: 'saw' });
    addNoise(buf, { decay: 5, dur: 0.3, filter: { from: 1400, q: 1.4, to: 260, type: 'bandpass' }, peak: 0.5, seed });
    softClip(buf, 1.4);
    return buf;
  },
};

// The two ladders, built as loops. Same timbre, rising pitch, rising
// brightness and rising length — the three cues that tell a player "this one
// is worth more" without them having to learn a new sound.
Object.entries(TIER_SWEEP).forEach(([name, [from, to]], index) => {
  RECIPES[name] = (seed) => {
    const buf = track(0.24);
    const dur = 0.1 + index * 0.018;
    addTone(buf, { decay: 9 - index, dur, from, peak: 0.85, to, type: 'triangle' });
    addTone(buf, { decay: 11, dur: dur * 0.8, from: from * 2, peak: 0.16 + index * 0.06, to: to * 2, type: 'sine' });
    addNoise(buf, {
      decay: 14,
      dur: dur * 0.6,
      filter: { from: from * 1.6, q: 2.4, to: to * 2.2, type: 'bandpass' },
      peak: 0.22 + index * 0.07,
      seed,
    });
    return buf;
  };
});

Object.entries(TURBO_TOP).forEach(([name, top], index) => {
  RECIPES[name] = (seed) => {
    const buf = track(0.6);
    const dur = 0.22 + index * 0.08;
    addTone(buf, { decay: 4.5 - index * 0.6, dur, from: 720, peak: 0.8, to: top, type: 'square' });
    addTone(buf, { decay: 5, dur: dur * 0.9, from: 360, peak: 0.3 + index * 0.08, to: top / 2, type: 'saw' });
    addNoise(buf, {
      decay: 4,
      dur: dur * 1.15,
      filter: { from: 600 - index * 60, q: 1, to: 2800 + index * 700, type: 'bandpass' },
      peak: 0.35 + index * 0.14,
      seed,
    });
    if (index > 0) softClip(buf, 1.3 + index * 0.35);
    if (index === 2) addTail(buf, { delay: 0.05, feedback: 0.3, mix: 0.18, taps: 3 });
    return buf;
  };
});

Object.entries(COUNTDOWN_PITCH).forEach(([name, freq]) => {
  RECIPES[name] = () => {
    const buf = track(0.5);
    addTone(buf, { decay: 6, dur: 0.3, fm: { decay: 7, index: 1.2, ratio: 2.01 }, from: freq, peak: 0.9 });
    addTone(buf, { decay: 8, dur: 0.22, from: freq * 2, peak: 0.2, type: 'sine' });
    addTail(buf, { delay: 0.06, feedback: 0.32, mix: 0.2, taps: 3 });
    return buf;
  };
});

// ── render ────────────────────────────────────────────────────────────────
mkdirSync(outDir, { recursive: true });
mkdirSync(wavDir, { recursive: true });

if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) {
  process.stderr.write('FAIL: ffmpeg not on PATH — needed to encode the mp3s.\n');
  process.exit(1);
}

const rows = [];
Object.keys(RECIPES)
  .sort()
  .forEach((name) => {
    const rendered = finalise(RECIPES[name](seedFrom(name)));
    const wavPath = path.join(wavDir, `${name}.wav`);
    const mp3Path = path.join(outDir, `${name}.mp3`);
    writeWav(wavPath, rendered);
    const encode = spawnSync(
      'ffmpeg',
      ['-y', '-i', wavPath, '-codec:a', 'libmp3lame', '-q:a', '2', '-ac', '1', mp3Path],
      { stdio: 'ignore' }
    );
    if (encode.status !== 0) {
      process.stderr.write(`FAIL: ffmpeg could not encode ${name}\n`);
      process.exit(1);
    }
    rows.push({ bytes: statSync(mp3Path).size, name, seconds: Number((rendered.length / SR).toFixed(3)) });
  });

const totalBytes = rows.reduce((sum, row) => sum + row.bytes, 0);
rows.forEach((row) =>
  process.stdout.write(`${row.name.padEnd(14)} ${String(row.seconds).padStart(6)}s  ${String(row.bytes).padStart(6)} B\n`)
);
process.stdout.write(`\n${rows.length} cues, ${(totalBytes / 1024).toFixed(1)} KiB total\n`);
