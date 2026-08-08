// Renders the engine LOOPS — the one sound in the game that never stops.
//
//   node scripts/render-kart-engine.mjs
//
// The engine is played back as looping buffers whose playbackRate is driven by
// speed, which is the only way a sampled engine can stay speed-reactive (a
// sample that is NOT pitch-shifted the same way is a downgrade on the synth it
// replaces).
//
// WHY THERE ARE THREE OF THEM — the owner's "still not right", diagnosed.
//
// `engineFrequencyFor` runs 42 Hz at idle to 269 Hz on a boost. Against a
// single loop rendered at 100 Hz that is a playbackRate range of 0.42 to 2.69:
// the whole timbre dragged 1.25 octaves DOWN at idle and pushed 1.43 octaves UP
// on boost. Resampling moves everything — the induction hiss, the body of the
// tone, every resonance — so at the bottom the loop is a slowed-down groan and
// at the top it is a chipmunk buzz. There is no clip, generated or authored,
// that survives being stretched 6.4x. That is why iterating on the one buffer
// kept not working, and why no audio generator would have fixed it either.
//
// So the engine is MULTI-SAMPLED, the way a sampler covers a keyboard: three
// loops an octave apart, each one played near its own native rate, crossfaded
// by speed (see kartAudio.js). Worst-case stretch drops from 1.43 octaves to
// 0.5 — at the crossover points, where two layers are sounding together and
// each is equally off, which is the least bad place to put the error.
//
// The noise layer is deliberately NOT scaled with BASE_HZ. Its filter
// coefficients are absolute, so all three layers share the same induction band
// while their harmonic stacks move — which is the whole point of multi-sampling
// rather than pitch-shifting: the parts of an engine that do not track RPM stay
// where they are.
//
// TWO THINGS MAKE THIS DIFFERENT FROM THE ONE-SHOTS.
//
// 1. THE SEAM HAS TO BE MATHEMATICALLY PERFECT, not nearly perfect. A one-shot
//    that clicks at the end clicks once; this repeats every 0.5 s for the whole
//    race. So the loop is built to be periodic BY CONSTRUCTION rather than cut
//    and hoped over: the length is 0.5 s and every pitched component is an
//    integer multiple of 2 Hz, so each one completes a whole number of cycles
//    inside the buffer and the last sample joins the first exactly. The noise
//    layer cannot be periodic, so it is the ONLY layer that gets a crossfade,
//    and it is summed in after the harmonic layer is already seamless.
//
// 2. IT SHIPS AS WAV, NOT MP3. Every mp3 carries encoder delay and padding —
//    a few tens of milliseconds of silence baked onto each end — and
//    decodeAudioData hands that silence back. On a one-shot it is an
//    inaudible latency; on a loop it is a gap, every single time round. 0.5 s
//    of 16-bit mono at 44.1 kHz is 44 KB against 5.9 MiB of free audio budget,
//    so the correct format is simply affordable here.
//
// Deterministic: seeded noise, so re-running gives a byte-identical file.
import { mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src', 'assets', 'game', 'audio', 'engine');

// Loop geometry. LOOP_SECONDS and each base are locked together: a base must be
// an integer multiple of 1 / LOOP_SECONDS (= 2 Hz) for the seam to close, and
// so must every modulation rate below. The firing pulse sits at HALF the
// fundamental, so a base has to be a multiple of FOUR for both to close.
const LOOP_SECONDS = 0.5;
const LENGTH = Math.round(LOOP_SECONDS * SR);

// 56 / 112 / 224 — clean octaves, all multiples of 4, covering the 42-269 Hz
// range `engineFrequencyFor` asks for. Deviation from native rate: 0.42 octaves
// at idle, 0.5 at each crossover, 0.26 at full boost.
//
// The file name carries the base frequency because that is what the crossfade
// needs at runtime, and a number parsed from the name cannot drift out of sync
// with the file the way a second table would. kartAudioAssets.js parses it.
const BASE_HZ_LAYERS = [56, 112, 224];

const mulberry32 = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Harmonic stack. Amplitudes fall off roughly 1/n with the 2nd and 3rd lifted
// — that emphasis is most of what separates "engine" from "sawtooth". Slight
// per-harmonic phase offsets stop every partial peaking on the same sample,
// which is what would otherwise give the loop a hard buzz on the downbeat.
const HARMONICS = [
  { amp: 1.0, n: 1, phase: 0 },
  { amp: 0.82, n: 2, phase: 0.21 },
  { amp: 0.66, n: 3, phase: 0.44 },
  { amp: 0.34, n: 4, phase: 0.13 },
  { amp: 0.26, n: 5, phase: 0.67 },
  { amp: 0.18, n: 6, phase: 0.31 },
  { amp: 0.12, n: 8, phase: 0.52 },
  { amp: 0.07, n: 10, phase: 0.08 },
];

const harmonicLayer = (baseHz) => {
  const out = new Float32Array(LENGTH);
  // Four-stroke firing sits at half the fundamental. This is what stops the
  // loop reading as a synth drone: an engine has a pulse.
  const firingHz = baseHz / 2;
  // Partials above Nyquist would alias back down as inharmonic tones, and the
  // 224 Hz layer's 10th harmonic is 2.24 kHz so nothing is close today — but
  // the guard belongs with the loop that would produce it, not in a comment on
  // a future edit that raises a base.
  for (let i = 0; i < LENGTH; i += 1) {
    const t = i / SR;
    let sample = 0;
    for (const h of HARMONICS) {
      if (baseHz * h.n >= SR / 2) continue;
      sample += h.amp * Math.sin(2 * Math.PI * (baseHz * h.n * t + h.phase));
    }
    // Raised cosine to a power gives a pulse train rather than a wobble, and
    // the power controls how "lumpy" the idle is. Periodic at firingHz, so the
    // seam still closes.
    const firing = (1 + Math.cos(2 * Math.PI * firingHz * t)) / 2;
    const pulse = 0.55 + 0.45 * firing ** 2.2;
    out[i] = sample * pulse;
  }
  return out;
};

// Induction/exhaust hiss. Not periodic, so this layer alone gets a
// constant-power crossfade to close its own seam.
const noiseLayer = (seed = 1) => {
  const rng = mulberry32(seed);
  const fadeN = Math.round(0.02 * SR);
  const raw = new Float32Array(LENGTH + fadeN);
  // Two-pole lowpass on white noise gives a breathy band rather than hiss.
  let z1 = 0;
  let z2 = 0;
  for (let i = 0; i < raw.length; i += 1) {
    const white = rng() * 2 - 1;
    z1 += 0.28 * (white - z1);
    z2 += 0.28 * (z1 - z2);
    raw[i] = z2;
  }
  const out = new Float32Array(LENGTH);
  out.set(raw.subarray(0, LENGTH));
  // Crossfade the START, not the end. Blending extra tail material INTO the
  // end leaves the end connected to material that is not sample 0, so the loop
  // still steps at the wrap — which is exactly what the seam check caught on
  // the first attempt. Blending it into the start instead makes out[0] the
  // natural continuation of out[LENGTH-1], because raw[LENGTH] is literally
  // the sample that followed it.
  for (let i = 0; i < fadeN; i += 1) {
    const x = i / fadeN;
    const fadeIn = Math.sin((x * Math.PI) / 2);
    const fadeOut = Math.cos((x * Math.PI) / 2);
    out[i] = raw[i] * fadeIn + raw[LENGTH + i] * fadeOut;
  }
  return out;
};

// One layer, rendered and measured. The seam report is the number that
// matters: if the discontinuity across the wrap is bigger than a typical
// sample-to-sample step inside the loop, the loop will click, and no amount of
// listening on a loaded machine will tell you that as reliably as this will.
const renderLayer = (baseHz, seed) => {
  const harmonic = harmonicLayer(baseHz);
  const noise = noiseLayer(seed);
  const mixed = new Float32Array(LENGTH);
  for (let i = 0; i < LENGTH; i += 1) mixed[i] = harmonic[i] * 0.5 + noise[i] * 1.15;

  // Gentle saturation for body, then normalise. No fade in/out — a fade would
  // destroy the very seam this file exists to protect.
  for (let i = 0; i < LENGTH; i += 1) mixed[i] = Math.tanh(mixed[i] * 1.35) / Math.tanh(1.35);
  let peak = 0;
  for (let i = 0; i < LENGTH; i += 1) peak = Math.max(peak, Math.abs(mixed[i]));
  // Every layer normalises to the same peak, which is what lets the runtime
  // crossfade treat them as interchangeable: a layer that arrived hotter than
  // its neighbour would swell through the handover.
  for (let i = 0; i < LENGTH; i += 1) mixed[i] *= 0.92 / peak;

  const steps = new Float64Array(LENGTH - 1);
  for (let i = 1; i < LENGTH; i += 1) steps[i - 1] = Math.abs(mixed[i] - mixed[i - 1]);
  const sorted = Float64Array.from(steps).sort();
  // The bar is the 99th percentile, NOT the mean. A steep part of the waveform
  // has steep steps, and the wrap can legitimately land on one — the first
  // version of this check compared against the mean and failed a loop whose
  // seam was a perfectly ordinary step that merely happened to be steeper than
  // average. What actually indicates a click is the seam being an OUTLIER.
  return {
    baseHz,
    maxStep: sorted[sorted.length - 1],
    meanStep: steps.reduce((sum, step) => sum + step, 0) / steps.length,
    p99: sorted[Math.floor(sorted.length * 0.99)],
    samples: mixed,
    seamStep: Math.abs(mixed[0] - mixed[LENGTH - 1]),
  };
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
    body.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), i * 2);
  }
  writeFileSync(filePath, Buffer.concat([header, body]));
};

mkdirSync(outDir, { recursive: true });
// The old single 100 Hz loop is superseded by the three below. It has to GO
// rather than sit alongside them: the manifest globs this folder, so a stale
// engine-loop.wav would be picked up as a fourth layer with no base frequency
// in its name.
rmSync(path.join(outDir, 'engine-loop.wav'), { force: true });

const lines = [];
let failed = false;
// A distinct noise seed per layer. Sharing one would make the three induction
// beds identical, and identical noise summed at the crossover correlates —
// which is the one thing that would make a constant-power crossfade swell.
BASE_HZ_LAYERS.forEach((baseHz, index) => {
  const layer = renderLayer(baseHz, 20260807 + index * 7919);
  const outPath = path.join(outDir, `engine-loop-${baseHz}.wav`);
  writeWav(outPath, layer.samples);
  lines.push(
    `${path.relative(root, outPath)}  ${statSync(outPath).size} bytes, ${LOOP_SECONDS}s @ ${baseHz} Hz`,
    `  seam ${layer.seamStep.toFixed(6)}   mean ${layer.meanStep.toFixed(6)}   p99 ${layer.p99.toFixed(
      6
    )}   max ${layer.maxStep.toFixed(6)}`,
    `  seam / p99  ${(layer.seamStep / layer.p99).toFixed(3)}  (must be <= 1 — the seam must not be an outlier)`
  );
  if (layer.seamStep > layer.p99) {
    lines.push(`  FAIL: the ${baseHz} Hz wrap is an outlier step — it will click once per loop, all race.`);
    failed = true;
  }
});

// What the runtime crossfade will actually be asked to do, printed here so the
// coverage claim is checkable rather than asserted. 42 Hz is idle and 269 Hz is
// engineFrequencyFor(1.4, boosting) — the extremes of the curve in kartAudio.js.
const worstStretch = (freq) =>
  Math.min(...BASE_HZ_LAYERS.map((baseHz) => Math.abs(Math.log2(freq / baseHz))));
lines.push(
  '',
  `coverage over the 42-269 Hz curve (octaves from a layer's native rate — lower is better):`,
  `  idle 42 Hz        ${worstStretch(42).toFixed(2)}`,
  `  crossover 79 Hz   ${worstStretch(79.2).toFixed(2)}`,
  `  crossover 158 Hz  ${worstStretch(158.4).toFixed(2)}`,
  `  boost 269 Hz      ${worstStretch(269).toFixed(2)}`,
  `  the single 100 Hz loop this replaces: 1.25 at idle, 1.43 at boost.`
);

process.stdout.write(`${lines.join('\n')}\n`);
if (failed) process.exit(1);
