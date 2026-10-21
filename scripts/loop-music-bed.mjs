// Turns a generated music track into a seamless race/menu bed.
//
//   node scripts/loop-music-bed.mjs <input audio> <bed name> --bpm 124 [options]
//     --bars 32,24,40,16   loop lengths to try, in bars of 4 beats (default)
//     --min-start 4        seconds of intro to skip before the loop may start
//     --xfade-beats 2      crossfade length at the seam
//     --lufs -12.7         loudness the bed is normalised to (see below)
//     --out <file.mp3>     default src/assets/game/audio/music/<bed name>.mp3
//     --dry                analyse only, write nothing
//
// WHY A GENERATED TRACK NEEDS THIS. scripts/render-kart-music.mjs authors its
// beds as exact numbers of bars with note tails written modulo the length, so
// they loop by construction. A track from a music model does not: it has an
// intro, it drifts a little off its nominal tempo, and its last bar is not
// written to lead into its first. kartAudio.js loops a bed by DURATION
// (MUSIC_LOOP_SECONDS, measured from the decoded lead-in on each browser), so
// what this has to produce is one stretch of the track that can repeat
// forever, plus that stretch's exact length.
//
// HOW THE STRETCH IS CHOSEN. For every beat S in the allowed range and every
// candidate length (whole bars at the measured tempo), compare what follows S
// with what follows S+T: chroma (which chord), band energy (which instruments)
// and onset envelope (where the hits land). The best match is a pair of points
// that are the same place in the music — same chord, same part of the phrase,
// same groove. T is then refined to the millisecond by cross-correlating the
// onset envelopes, which absorbs the model's tempo drift so the drums land on
// the seam instead of flamming.
//
// THE SEAM. The bed is in[S .. S+T). Its first X seconds are crossfaded with
// in[S+T .. S+T+X), the music that really followed the loop's last sample. So
// at the wrap the player hears in[S+T-1] then (in effect) in[S+T]: the true
// continuation, fading over X into the loop's own start. Equal-gain fade,
// because after the alignment the two layers are close to coherent and an
// equal-power fade would bump the level by up to 3 dB.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const positional = [];
const opts = {};
for (let i = 0; i < args.length; i += 1) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    const next = args[i + 1];
    if (next === undefined || next.startsWith('--')) opts[key] = true;
    else {
      opts[key] = next;
      i += 1;
    }
  } else positional.push(args[i]);
}
const [input, bedName] = positional;
if (!input || !bedName || !opts.bpm) {
  console.error('usage: node scripts/loop-music-bed.mjs <input audio> <bed name> --bpm <n> [--bars 32,24] [--min-start s] [--xfade-beats n] [--lufs n] [--out f.mp3] [--dry]');
  process.exit(2);
}
const BPM_HINT = Number(opts.bpm);
const BAR_CHOICES = String(opts.bars || '32,24,40,16').split(',').map(Number);
const MIN_START = Number(opts['min-start'] ?? 4);
const XFADE_BEATS = Number(opts['xfade-beats'] ?? 2);
// The self-rendered beds measure -12.6 to -12.9 LUFS integrated, and the
// music bus, ducking and SFX levels in kartAudio.js were balanced against
// them — so a new bed matches them rather than some broadcast target.
const TARGET_LUFS = Number(opts.lufs ?? -12.7);
const OUT = path.resolve(opts.out || path.join(root, 'src/assets/game/audio/music', `${bedName}.mp3`));

const SR = 44100;
const ASR = 22050;
const FFT = 2048;
const HOP = 256;
const FRAME_S = HOP / ASR;

const decode = (file, rate, channels) => {
  const result = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', String(channels), '-ar', String(rate), '-'], {
    maxBuffer: 1 << 30,
  });
  if (result.status !== 0) throw new Error(`ffmpeg decode failed: ${result.stderr}`);
  const bytes = result.stdout;
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
};

// ── analysis ───────────────────────────────────────────────────────────────
const fftInPlace = (re, im) => {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const ar = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const ai = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k + len / 2] = re[i + k] - ar;
        im[i + k + len / 2] = im[i + k] - ai;
        re[i + k] += ar;
        im[i + k] += ai;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
};

const BANDS = 24;
const analyse = (mono) => {
  const frames = Math.floor((mono.length - FFT) / HOP);
  const window = new Float64Array(FFT).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FFT));
  const bandEdges = Array.from({ length: BANDS + 1 }, (_, b) => 60 * (8000 / 60) ** (b / BANDS));
  const binHz = ASR / FFT;
  const bandOf = new Int16Array(FFT / 2).fill(-1);
  const chromaOf = new Int16Array(FFT / 2).fill(-1);
  for (let k = 1; k < FFT / 2; k += 1) {
    const hz = k * binHz;
    for (let b = 0; b < BANDS; b += 1) if (hz >= bandEdges[b] && hz < bandEdges[b + 1]) bandOf[k] = b;
    if (hz >= 100 && hz <= 4000) chromaOf[k] = ((Math.round(12 * Math.log2(hz / 440)) % 12) + 12) % 12;
  }
  const flux = new Float32Array(frames);
  const bands = new Float32Array(frames * BANDS);
  const chroma = new Float32Array(frames * 12);
  const re = new Float64Array(FFT);
  const im = new Float64Array(FFT);
  let prev = new Float64Array(FFT / 2);
  let mag = new Float64Array(FFT / 2);
  for (let f = 0; f < frames; f += 1) {
    const off = f * HOP;
    for (let i = 0; i < FFT; i += 1) {
      re[i] = mono[off + i] * window[i];
      im[i] = 0;
    }
    fftInPlace(re, im);
    let sum = 0;
    for (let k = 1; k < FFT / 2; k += 1) {
      const m = Math.log1p(1000 * Math.hypot(re[k], im[k]));
      mag[k] = m;
      const d = m - prev[k];
      if (d > 0) sum += d;
      if (bandOf[k] >= 0) bands[f * BANDS + bandOf[k]] += m;
      if (chromaOf[k] >= 0) chroma[f * 12 + chromaOf[k]] += m;
    }
    flux[f] = sum;
    [prev, mag] = [mag, prev];
  }
  // Onset envelope: flux minus its local mean, half-wave rectified.
  const onset = new Float32Array(frames);
  const half = Math.round(0.25 / FRAME_S);
  let acc = 0;
  for (let f = 0; f < frames; f += 1) {
    acc += flux[f];
    if (f - 2 * half - 1 >= 0) acc -= flux[f - 2 * half - 1];
    const centre = f - half;
    if (centre >= 0) onset[centre] = Math.max(0, flux[centre] - acc / Math.min(f + 1, 2 * half + 1));
  }
  return { bands, chroma, frames, onset };
};

// Tempo near the hint, to a fraction of a percent: the comb over the whole
// track is what pins it, because a 0.5% error is most of a beat by bar 32.
const measureTempo = (onset) => {
  const score = (period) => {
    let best = 0;
    let bestPhase = 0;
    for (let phase = 0; phase < period; phase += 0.5) {
      let sum = 0;
      for (let t = phase; t < onset.length - 1; t += period) {
        const i = Math.floor(t);
        const frac = t - i;
        sum += onset[i] * (1 - frac) + onset[i + 1] * frac;
      }
      if (sum > best) {
        best = sum;
        bestPhase = phase;
      }
    }
    return { phase: bestPhase, score: best / (onset.length / period) };
  };
  const hintPeriod = 60 / BPM_HINT / FRAME_S;
  let best = { period: hintPeriod, score: -1, phase: 0 };
  for (let p = hintPeriod * 0.94; p <= hintPeriod * 1.06; p += hintPeriod * 0.002) {
    const s = score(p);
    if (s.score > best.score) best = { period: p, ...s };
  }
  for (let p = best.period * 0.997; p <= best.period * 1.003; p += best.period * 0.0002) {
    const s = score(p);
    if (s.score > best.score) best = { period: p, ...s };
  }
  return { bpm: 60 / (best.period * FRAME_S), periodFrames: best.period, phaseFrames: best.phase };
};

const windowVector = (data, width, start, length) => {
  const out = new Float64Array(length * width);
  for (let f = 0; f < length; f += 1) for (let c = 0; c < width; c += 1) out[f * width + c] = data[(start + f) * width + c] || 0;
  return out;
};
const cosine = (a, b) => {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na * nb) || 1);
};
const centred = (data, width, frames) => {
  const mean = new Float64Array(width);
  for (let f = 0; f < frames; f += 1) for (let c = 0; c < width; c += 1) mean[c] += data[f * width + c] / frames;
  const out = new Float32Array(data.length);
  for (let f = 0; f < frames; f += 1) for (let c = 0; c < width; c += 1) out[f * width + c] = data[f * width + c] - mean[c];
  return out;
};

// ── main ───────────────────────────────────────────────────────────────────
const stereo = decode(input, SR, 2);
const mono = decode(input, ASR, 1);
const durationS = stereo.length / 2 / SR;
const { bands, chroma, frames, onset } = analyse(mono);
const tempo = measureTempo(onset);
const beatS = (tempo.periodFrames * FRAME_S);
const xfadeS = XFADE_BEATS * beatS;
const bandsC = centred(bands, BANDS, frames);
const chromaC = centred(chroma, 12, frames);
console.log(`${path.basename(input)}: ${durationS.toFixed(2)} s, tempo ${tempo.bpm.toFixed(3)} bpm (hint ${BPM_HINT}), beat ${beatS.toFixed(4)} s`);

const simWindow = Math.round((8 * beatS) / FRAME_S); // two bars after each point
const onsetWindow = Math.round((16 * beatS) / FRAME_S);
const candidates = [];
for (const bars of BAR_CHOICES) {
  const nominal = bars * 4 * beatS;
  for (let k = 0; ; k += 1) {
    const startS = (tempo.phaseFrames + k * tempo.periodFrames) * FRAME_S;
    if (startS < MIN_START) continue;
    const latest = startS + nominal + xfadeS + 16 * beatS;
    if (latest > durationS - 0.5) break;
    const s0 = Math.round(startS / FRAME_S);
    // Refine T by onset cross-correlation, ±60 ms around the nominal length.
    const a = windowVector(onset, 1, s0, onsetWindow);
    let bestT = nominal;
    let bestCorr = -1;
    const span = Math.round(0.06 / FRAME_S);
    const n0 = Math.round(nominal / FRAME_S);
    for (let d = -span; d <= span; d += 1) {
      const c = cosine(a, windowVector(onset, 1, s0 + n0 + d, onsetWindow));
      if (c > bestCorr) {
        bestCorr = c;
        bestT = (n0 + d) * FRAME_S;
      }
    }
    const s1 = Math.round((startS + bestT) / FRAME_S);
    const chromaSim = cosine(windowVector(chromaC, 12, s0, simWindow), windowVector(chromaC, 12, s1, simWindow));
    const bandSim = cosine(windowVector(bandsC, BANDS, s0, simWindow), windowVector(bandsC, BANDS, s1, simWindow));
    const score = 0.45 * chromaSim + 0.3 * bandSim + 0.25 * bestCorr;
    candidates.push({ bandSim, bars, chromaSim, onsetCorr: bestCorr, score, startS, loopS: bestT });
  }
}
if (!candidates.length) {
  console.error('FAIL: the track is too short for any candidate loop; generate a longer one or pass shorter --bars.');
  process.exit(1);
}
candidates.sort((a, b) => b.score - a.score);
const top = candidates[0];
console.log('best candidates:');
candidates.slice(0, 6).forEach((c) =>
  console.log(
    `  ${String(c.bars).padStart(2)} bars  start ${c.startS.toFixed(3)} s  loop ${c.loopS.toFixed(4)} s  score ${c.score.toFixed(3)}  (chroma ${c.chromaSim.toFixed(3)}, bands ${c.bandSim.toFixed(3)}, onsets ${c.onsetCorr.toFixed(3)})`
  )
);
if (top.score < 0.7) console.warn(`WARN: best seam score ${top.score.toFixed(3)} is low — listen to the seam before shipping.`);
// ── sample-accurate length ─────────────────────────────────────────────────
// The analysis hop is 11.6 ms, which is a flam at the seam. Refine T to the
// sample on the transient envelope (|first difference|, ~0.7 ms smoothing)
// of two bars after S versus after S+T, within one hop either way.
const transientEnvelope = (from, length) => {
  const env = new Float32Array(length);
  let acc = 0;
  const SMOOTH = 32;
  const ring = new Float32Array(SMOOTH);
  for (let i = 0; i < length; i += 1) {
    const j = from + i;
    const x = (stereo[j * 2] + stereo[j * 2 + 1]) * 0.5;
    const p = j > 0 ? (stereo[(j - 1) * 2] + stereo[(j - 1) * 2 + 1]) * 0.5 : x;
    const v = Math.abs(x - p);
    acc += v - ring[i % SMOOTH];
    ring[i % SMOOTH] = v;
    env[i] = acc;
  }
  return env;
};
const startSample = Math.round(top.startS * SR);
const refineLength = Math.round(8 * beatS * SR);
const refSpan = Math.round(FRAME_S * SR);
const headEnv = transientEnvelope(startSample, refineLength);
const coarse = Math.round(top.loopS * SR);
const tailEnv = transientEnvelope(startSample + coarse - refSpan, refineLength + 2 * refSpan);
let bestShift = 0;
let bestDot = -Infinity;
for (let d = -refSpan; d <= refSpan; d += 1) {
  let dot = 0;
  for (let i = 0; i < refineLength; i += 4) dot += headEnv[i] * tailEnv[i + d + refSpan];
  if (dot > bestDot) {
    bestDot = dot;
    bestShift = d;
  }
}
console.log(`sample refinement: ${bestShift >= 0 ? '+' : ''}${bestShift} samples (${((bestShift / SR) * 1000).toFixed(2)} ms)`);

const loopSamples = coarse + bestShift;
console.log(`loop ${loopSamples} samples = ${(loopSamples / SR).toFixed(6)} s`);
if (opts.dry) process.exit(0);

// ── render ─────────────────────────────────────────────────────────────────
const xfadeSamples = Math.round(xfadeS * SR);
const out = new Float32Array(loopSamples * 2);
for (let i = 0; i < loopSamples; i += 1) {
  for (let ch = 0; ch < 2; ch += 1) {
    const head = stereo[(startSample + i) * 2 + ch];
    if (i < xfadeSamples) {
      const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / xfadeSamples);
      const tail = stereo[(startSample + loopSamples + i) * 2 + ch];
      out[i * 2 + ch] = head * g + tail * (1 - g);
    } else out[i * 2 + ch] = head;
  }
}
const seamJump = Math.max(Math.abs(out[(loopSamples - 1) * 2] - out[0]), Math.abs(out[(loopSamples - 1) * 2 + 1] - out[1]));
const tmp = path.join(os.tmpdir(), `loop-bed-${process.pid}`);
mkdirSync(tmp, { recursive: true });
const raw = path.join(tmp, 'bed.f32');
writeFileSync(raw, Buffer.from(out.buffer));
// Loudness: measure, then a fixed gain (not a dynamic normaliser — a bed that
// breathes with a compressor pumps audibly every time it loops).
const measure = spawnSync('ffmpeg', ['-hide_banner', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', raw, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], { encoding: 'utf8' });
const lufs = Number(/I:\s+(-?[\d.]+) LUFS/.exec(measure.stderr)?.[1]);
const peakCheck = out.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
let gainDb = Number.isFinite(lufs) ? TARGET_LUFS - lufs : 0;
// Never push the peak past -1 dBFS.
const headroomDb = -1 - 20 * Math.log10(peakCheck || 1);
if (gainDb > headroomDb) gainDb = headroomDb;
mkdirSync(path.dirname(OUT), { recursive: true });
const enc = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', raw, '-af', `volume=${gainDb.toFixed(2)}dB`, '-codec:a', 'libmp3lame', '-b:a', '128k', '-joint_stereo', '1', OUT], { encoding: 'utf8' });
rmSync(tmp, { force: true, recursive: true });
if (enc.status !== 0) {
  console.error(`FAIL: encode: ${enc.stderr}`);
  process.exit(1);
}
const loopSeconds = loopSamples / SR;
console.log(
  `wrote ${path.relative(root, OUT)}  ${(statSync(OUT).size / 1024).toFixed(0)} KiB  loop ${loopSeconds.toFixed(6)} s  ` +
    `loudness ${Number.isFinite(lufs) ? lufs.toFixed(1) : '?'} -> ${(lufs + gainDb).toFixed(1)} LUFS  seam step ${seamJump.toFixed(4)}`
);
console.log(`MUSIC_LOOP_SECONDS entry:  '${bedName}': ${Number(loopSeconds.toFixed(6))},`);
