// Renders the three music beds.
//
//   node scripts/render-kart-music.mjs
//
// WHY THESE ARE RENDERED RATHER THAN GENERATED. The plan had the owner making
// them in Suno; he asked for them to be made here instead. Higgsfield cannot:
// `sonilo_music` is marked "Game pipeline only" in both the tool description
// and the model catalog, exactly like `mirelo_text_to_audio` was for the SFX.
// ElevenLabs needs an OAuth that has not been run. So the beds are authored,
// the same way the 20 one-shots and the engine loop were — and swapping in a
// generated bed later is a drop-in, because the manifest is a glob.
//
// THE SEAM IS THE WHOLE PROBLEM. A bed that clicks every 64 seconds is worse
// than no music, and it is heard fifty times a session. Two mechanisms:
//
//   1. NOTE TAILS WRAP. A note starting near the end of the loop continues
//      into the START of the same buffer (writes are modulo the length), so
//      the reverb tail of the last chord is already ringing under the first
//      beat. This is what makes the loop continuous MUSICALLY, not merely
//      click-free — the alternative is a bar of thinning decay before the
//      wrap, which is audible as a loop even when the samples join perfectly.
//   2. THE LENGTH IS AN EXACT NUMBER OF BARS, so the rhythm never drifts.
//
// The remaining risk is mp3: encoder delay and padding are silence baked onto
// each end, which would push the loop point off the beat. Rather than trust
// gapless metadata (Chrome, Firefox and Safari disagree about it), kartAudio.js
// MEASURES the leading silence in the decoded buffer at runtime and sets
// loopStart there, with loopEnd = loopStart + the exact musical duration this
// script writes into the manifest. Self-calibrating, per browser.
//
// Arrangement note, from the plan: these are GROOVES, not arrangements. Suno's
// instinct — intro, build, drop — is exactly what fights a loop. A bed should
// be slightly less interesting than feels right on first listen, because the
// hook that sells it on listen one is the one that grates by lap three. So the
// variation here is deliberately small: filter movement, hat density, an
// octave shift every eight bars. Nothing announces itself.
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src', 'assets', 'game', 'audio', 'music');
const wavDir = path.join(root, 'tmp', 'kart-music');

const mulberry32 = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const midiHz = (midi) => 440 * 2 ** ((midi - 69) / 12);

const wave = (type, phase) => {
  const p = phase - Math.floor(phase);
  if (type === 'sine') return Math.sin(2 * Math.PI * p);
  if (type === 'square') return p < 0.5 ? 1 : -1;
  if (type === 'saw') return 1 - 2 * p;
  if (type === 'triangle') return 2 * Math.abs(2 * p - 1) - 1;
  if (type === 'pulse25') return p < 0.25 ? 1 : -1;
  return 0;
};

const coeffs = (type, f0, Q) => {
  const w0 = (2 * Math.PI * Math.min(Math.max(f0, 20), SR * 0.45)) / SR;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * Q);
  let b0;
  let b1;
  let b2;
  if (type === 'highpass') {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = b0;
  } else if (type === 'bandpass') {
    b0 = alpha;
    b1 = 0;
    b2 = -alpha;
  } else {
    b0 = (1 - cos) / 2;
    b1 = 1 - cos;
    b2 = b0;
  }
  const a0 = 1 + alpha;
  return [b0 / a0, b1 / a0, b2 / a0, (-2 * cos) / a0, (1 - alpha) / a0];
};

// Filtering a LOOP needs a warm-up lap. A biquad started from zero state emits
// a transient over its first few samples — and for a loop those samples are
// the loop point, so the filter itself manufactures a click exactly where the
// seam must be silent. This is what the seam check caught on the menu and
// Penguin Village beds (5.14x and 1.46x p99) while Comeback City, whose denser
// mix masked it, passed at 0.27x.
//
// The fix uses the thing that makes this signal special: it is periodic. Run
// the filter once around the whole buffer and discard the output, and the
// state is left exactly where it would be if the loop had been playing
// forever. The second lap then produces output that joins itself.
const filterInPlace = (buf, type, freqAt, Q = 0.9) => {
  const input = Float32Array.from(buf);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 0; i < input.length; i += 1) {
      const [b0, b1, b2, a1, a2] = coeffs(type, freqAt(i / input.length), Q);
      const x0 = input[i];
      const y = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = y;
      if (pass === 1) buf[i] = y;
    }
  }
};

// ── the wrap-around write ─────────────────────────────────────────────────
// Every layer writes through this. `i` is allowed to run past the end of the
// buffer; it lands back at the start. That single modulo is what makes a note
// tail cross the loop point instead of being truncated at it.
const addWrapped = (buf, index, value) => {
  const n = buf.length;
  buf[((index % n) + n) % n] += value;
};

// A voice: detunable stacked oscillators with an AD envelope, written wrapped.
const playNote = (buf, { at, decay = 3, detune = 0, dur, gain = 1, midi, sustain = 0, type = 'saw', voices = 1 }) => {
  const start = Math.round(at * SR);
  const total = Math.round((dur + 2.2) * SR); // tail room; it wraps
  const freq = midiHz(midi);
  const attackN = Math.max(1, Math.round(0.008 * SR));
  const holdN = Math.round(dur * SR);
  for (let v = 0; v < voices; v += 1) {
    const ratio = 2 ** (((v - (voices - 1) / 2) * detune) / 1200);
    const step = (freq * ratio) / SR;
    const level = gain / voices;
    let phase = v * 0.13;
    for (let i = 0; i < total; i += 1) {
      let env;
      if (i < attackN) env = i / attackN;
      else if (i < holdN) env = 1 - (1 - sustain) * (1 - Math.exp(-((i - attackN) / SR) * decay));
      else env = (sustain || 1) * Math.exp(-((i - holdN) / SR) * (decay + 2.5));
      // -100 dBFS, not -74: a note tail cut at an audible level is a step at
      // wherever it happens to land, and near the loop point that lands on the
      // seam.
      if (env < 0.00001 && i > holdN) break;
      addWrapped(buf, start + i, wave(type, phase) * env * level);
      phase += step;
    }
  }
};

const playKick = (buf, { at, gain = 1 }) => {
  const start = Math.round(at * SR);
  const n = Math.round(0.42 * SR);
  let phase = 0;
  for (let i = 0; i < n; i += 1) {
    const u = i / n;
    const f = 128 * (0.24 / (0.24 + u * 2.6)) + 42;
    phase += f / SR;
    const env = Math.exp(-u * 7.5) * Math.min(1, i / 40);
    addWrapped(buf, start + i, Math.sin(2 * Math.PI * phase) * env * gain);
  }
};

const playSnare = (buf, { at, gain = 1, rng }) => {
  const start = Math.round(at * SR);
  const n = Math.round(0.3 * SR);
  let z = 0;
  let phase = 0;
  for (let i = 0; i < n; i += 1) {
    const u = i / n;
    const white = rng() * 2 - 1;
    z += 0.45 * (white - z);
    phase += 195 / SR;
    const env = Math.exp(-u * 11) * Math.min(1, i / 25);
    addWrapped(buf, start + i, (z * 1.5 + Math.sin(2 * Math.PI * phase) * 0.35) * env * gain);
  }
};

const playHat = (buf, { at, gain = 1, open = false, rng }) => {
  const start = Math.round(at * SR);
  const n = Math.round((open ? 0.24 : 0.07) * SR);
  let hp = 0;
  let prev = 0;
  for (let i = 0; i < n; i += 1) {
    const u = i / n;
    const white = rng() * 2 - 1;
    hp = 0.86 * (hp + white - prev);
    prev = white;
    // A ~0.5 ms ramp. Without it the first sample of a hat is a full-scale
    // random value — a hard edge on every hat in the bed, and on the downbeat
    // hat that edge IS sample 0, which is what the seam check flagged. Short
    // enough that it still reads as a transient.
    addWrapped(buf, start + i, hp * Math.exp(-u * (open ? 6 : 22)) * gain * Math.min(1, i / 24));
  }
};

// ── arrangement ───────────────────────────────────────────────────────────
// Four-chord loops, eight times over 32 bars. Chords are [root midi, quality].
const CHORD_TONES = { maj: [0, 4, 7, 11], min: [0, 3, 7, 10], sus: [0, 5, 7, 10] };

const BEDS = {
  // Menu: no drums at all for the first half of each cycle, low energy, the
  // player is reading. It has to survive being left open.
  menu: {
    bars: 32,
    bpm: 96,
    seed: 101,
    progression: [
      [57, 'min'],
      [53, 'maj'],
      [60, 'maj'],
      [55, 'maj'],
    ],
    tone: { arpGain: 0.2, bassGain: 0.42, cutoffHi: 2600, cutoffLo: 620, padGain: 0.3 },
    drums: 'sparse',
    padType: 'saw',
    arpType: 'triangle',
  },
  // Comeback City: neon dusk Miami. Warm, driving, four-on-the-floor.
  'comeback-city': {
    bars: 32,
    bpm: 124,
    seed: 202,
    progression: [
      [57, 'min'],
      [64, 'min'],
      [53, 'maj'],
      [55, 'maj'],
    ],
    tone: { arpGain: 0.26, bassGain: 0.62, cutoffHi: 3600, cutoffLo: 700, padGain: 0.26 },
    drums: 'four',
    padType: 'saw',
    arpType: 'pulse25',
  },
  // Penguin Village: arctic sunset. Colder and brighter — the pad sits an
  // octave up and the bass is softer, so the top of the mix carries it.
  'penguin-village': {
    bars: 32,
    bpm: 112,
    seed: 303,
    progression: [
      [59, 'min'],
      [55, 'maj'],
      [62, 'min'],
      [57, 'sus'],
    ],
    tone: { arpGain: 0.3, bassGain: 0.5, cutoffHi: 4200, cutoffLo: 900, padGain: 0.34 },
    drums: 'half',
    padType: 'triangle',
    arpType: 'triangle',
  },
};

const renderBed = (name, spec) => {
  const beatSeconds = 60 / spec.bpm;
  const loopSeconds = spec.bars * 4 * beatSeconds;
  const length = Math.round(loopSeconds * SR);
  const rng = mulberry32(spec.seed);

  const bass = new Float32Array(length);
  const pad = new Float32Array(length);
  const arp = new Float32Array(length);
  const drums = new Float32Array(length);

  for (let bar = 0; bar < spec.bars; bar += 1) {
    const [root, quality] = spec.progression[bar % spec.progression.length];
    const tones = CHORD_TONES[quality];
    const barAt = bar * 4 * beatSeconds;
    const cycle = Math.floor(bar / spec.progression.length); // 0..7

    // Bass: root on 1 and 3, a fifth on the 'and' of 4. Octave down.
    playNote(bass, { at: barAt, decay: 2.4, dur: beatSeconds * 1.7, gain: 1, midi: root - 24, sustain: 0.55, type: 'saw', voices: 2, detune: 9 });
    playNote(bass, { at: barAt + beatSeconds * 2, decay: 2.4, dur: beatSeconds * 1.2, gain: 0.9, midi: root - 24, sustain: 0.5, type: 'saw', voices: 2, detune: 9 });
    playNote(bass, { at: barAt + beatSeconds * 3.5, decay: 3, dur: beatSeconds * 0.4, gain: 0.7, midi: root - 17, sustain: 0.4, type: 'saw', voices: 2, detune: 9 });

    // Pad: the chord, held the whole bar, wide and detuned.
    tones.forEach((interval, index) => {
      playNote(pad, {
        at: barAt,
        decay: 1.1,
        dur: beatSeconds * 3.9,
        gain: index === 0 ? 0.8 : 0.62,
        midi: root + interval,
        sustain: 0.72,
        type: spec.padType,
        voices: 3,
        detune: 14,
      });
    });

    // Arp: eighth notes through the chord. The octave lifts every other
    // four-bar cycle — the only "movement" in the whole bed, and it is meant
    // to be noticed only if you are listening for it.
    const octave = cycle % 2 === 1 ? 12 : 0;
    for (let step = 0; step < 8; step += 1) {
      const interval = tones[step % tones.length];
      playNote(arp, {
        at: barAt + step * beatSeconds * 0.5,
        decay: 6,
        dur: beatSeconds * 0.42,
        gain: step % 2 === 0 ? 1 : 0.62,
        midi: root + interval + 12 + octave,
        sustain: 0.25,
        type: spec.arpType,
        voices: 1,
      });
    }

    // Drums.
    if (spec.drums === 'four') {
      for (let beat = 0; beat < 4; beat += 1) playKick(drums, { at: barAt + beat * beatSeconds, gain: 0.95 });
      playSnare(drums, { at: barAt + beatSeconds, gain: 0.5, rng });
      playSnare(drums, { at: barAt + beatSeconds * 3, gain: 0.5, rng });
      for (let step = 0; step < 8; step += 1) {
        playHat(drums, { at: barAt + step * beatSeconds * 0.5, gain: step % 2 ? 0.16 : 0.28, open: step === 7, rng });
      }
    } else if (spec.drums === 'half') {
      playKick(drums, { at: barAt, gain: 0.85 });
      playKick(drums, { at: barAt + beatSeconds * 2.5, gain: 0.6 });
      playSnare(drums, { at: barAt + beatSeconds * 2, gain: 0.4, rng });
      for (let step = 0; step < 4; step += 1) {
        playHat(drums, { at: barAt + step * beatSeconds, gain: 0.2, open: step === 3, rng });
      }
    } else if (bar % 4 >= 2) {
      // Menu: drums only on the back half of each four-bar cycle.
      playKick(drums, { at: barAt, gain: 0.55 });
      playHat(drums, { at: barAt + beatSeconds * 2, gain: 0.14, rng });
    }
  }

  // Slow filter breathing on the pad and arp — one full cycle across the loop,
  // so it too joins seamlessly at the wrap.
  const breath = (u) => {
    const lfo = (1 - Math.cos(2 * Math.PI * u)) / 2;
    return spec.tone.cutoffLo + lfo * (spec.tone.cutoffHi - spec.tone.cutoffLo);
  };
  filterInPlace(pad, 'lowpass', breath, 0.8);
  filterInPlace(arp, 'lowpass', (u) => breath(u) * 1.3, 0.9);
  filterInPlace(bass, 'lowpass', () => 340, 0.9);

  // Mix to stereo. Width comes from panning, plus a short wrapped delay on the
  // arp — the classic synthwave ping, and it wraps like everything else.
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  const place = (layer, gain, pan) => {
    const l = Math.cos(((pan + 1) * Math.PI) / 4);
    const r = Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = 0; i < length; i += 1) {
      left[i] += layer[i] * gain * l;
      right[i] += layer[i] * gain * r;
    }
  };
  place(bass, spec.tone.bassGain, 0);
  place(pad, spec.tone.padGain, -0.35);
  place(arp, spec.tone.arpGain, 0.4);
  place(drums, 0.5, 0);
  const delaySamples = Math.round(beatSeconds * 0.75 * SR);
  for (let i = 0; i < length; i += 1) {
    const tap = arp[((i - delaySamples) % length + length) % length];
    left[i] += tap * spec.tone.arpGain * 0.3;
    right[i] += arp[((i - delaySamples * 2) % length + length) % length] * spec.tone.arpGain * 0.2;
  }

  // Soft-clip and normalise. NO fades — a fade would destroy the seam.
  let peak = 0;
  for (let i = 0; i < length; i += 1) {
    left[i] = Math.tanh(left[i] * 1.1) / Math.tanh(1.1);
    right[i] = Math.tanh(right[i] * 1.1) / Math.tanh(1.1);
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  const scale = 0.89 / peak;
  for (let i = 0; i < length; i += 1) {
    left[i] *= scale;
    right[i] *= scale;
  }

  if (process.env.MUSIC_SEAM_DEBUG) {
    [
      ['bass', bass],
      ['pad', pad],
      ['arp', arp],
      ['drums', drums],
    ].forEach(([label, layer]) => {
      const s = Math.abs(layer[0] - layer[length - 1]);
      let mean = 0;
      for (let i = 1; i < length; i += 1) mean += Math.abs(layer[i] - layer[i - 1]);
      mean /= length - 1;
      process.stdout.write(`   ${name}/${label.padEnd(6)} seam ${s.toExponential(2)} mean ${(mean).toExponential(2)}\n`);
    });
  }

  // Seam report, same test the engine loop uses: the wrap must not be an
  // outlier step. Music is denser than the engine tone, so this is the check
  // that would catch a truncated tail rather than a DC jump.
  const steps = new Float64Array(length - 1);
  for (let i = 1; i < length; i += 1) steps[i - 1] = Math.abs(left[i] - left[i - 1]);
  const sorted = Float64Array.from(steps).sort();
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const seam = Math.abs(left[0] - left[length - 1]);

  return { left, length, loopSeconds, p99, right, seam };
};

const writeWavStereo = (filePath, left, right) => {
  const frames = left.length;
  const bytes = frames * 4;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + bytes, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(bytes, 40);
  const body = Buffer.alloc(bytes);
  for (let i = 0; i < frames; i += 1) {
    body.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), i * 4);
    body.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), i * 4 + 2);
  }
  writeFileSync(filePath, Buffer.concat([header, body]));
};

mkdirSync(outDir, { recursive: true });
mkdirSync(wavDir, { recursive: true });
if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) {
  process.stderr.write('FAIL: ffmpeg not on PATH.\n');
  process.exit(1);
}

const manifest = {};
let failed = false;
for (const [name, spec] of Object.entries(BEDS)) {
  const bed = renderBed(name, spec);
  const wavPath = path.join(wavDir, `${name}.wav`);
  const mp3Path = path.join(outDir, `${name}.mp3`);
  writeWavStereo(wavPath, bed.left, bed.right);
  const encode = spawnSync(
    'ffmpeg',
    ['-y', '-i', wavPath, '-codec:a', 'libmp3lame', '-b:a', '128k', '-joint_stereo', '1', mp3Path],
    { stdio: 'ignore' }
  );
  if (encode.status !== 0) {
    process.stderr.write(`FAIL: could not encode ${name}\n`);
    process.exit(1);
  }
  const ok = bed.seam <= bed.p99;
  if (!ok) failed = true;
  manifest[name] = Number(bed.loopSeconds.toFixed(6));
  process.stdout.write(
    `${name.padEnd(16)} ${spec.bpm} bpm  ${bed.loopSeconds.toFixed(2)}s  ` +
      `${String((statSync(mp3Path).size / 1024).toFixed(0)).padStart(5)} KiB  ` +
      `seam ${bed.seam.toExponential(2)}  p99 ${bed.p99.toExponential(2)}  ` +
      `ratio ${(bed.seam / bed.p99).toFixed(3)} ${ok ? 'ok' : 'FAIL'}\n`
  );
}

process.stdout.write(`\nMUSIC_LOOP_SECONDS for kartAudioAssets.js:\n${JSON.stringify(manifest, null, 2)}\n`);
if (failed) {
  process.stderr.write('FAIL: a bed has an outlier seam step.\n');
  process.exit(1);
}
