// Renders the engine LOOP — the one sound in the game that never stops.
//
//   node scripts/render-kart-engine.mjs
//
// The engine is played back as a single looping buffer whose playbackRate is
// driven by speed, which is the only way a sampled engine can stay speed-
// reactive (see A6 in docs/AUDIO_AND_MENU_PLAN.md: a sample that is NOT
// pitch-shifted the same way is a downgrade on the synth it replaces).
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
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src', 'assets', 'game', 'audio', 'engine');

// Loop geometry. LOOP_SECONDS and BASE_HZ are locked together: BASE_HZ must be
// an integer multiple of 1 / LOOP_SECONDS (= 2 Hz) for the seam to close, and
// so must every modulation rate below.
const LOOP_SECONDS = 0.5;
const BASE_HZ = 100; // 50 whole cycles per loop
// Four-stroke firing sits at half the fundamental — 25 whole cycles. This is
// what stops the loop reading as a synth drone: an engine has a pulse.
const FIRING_HZ = BASE_HZ / 2;
const LENGTH = Math.round(LOOP_SECONDS * SR);

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

const harmonicLayer = () => {
  const out = new Float32Array(LENGTH);
  for (let i = 0; i < LENGTH; i += 1) {
    const t = i / SR;
    let sample = 0;
    for (const h of HARMONICS) {
      sample += h.amp * Math.sin(2 * Math.PI * (BASE_HZ * h.n * t + h.phase));
    }
    // Firing pulse: a shaped half-order AM. Raised cosine to a power gives a
    // pulse train rather than a wobble, and the power controls how "lumpy" the
    // idle is. Periodic at FIRING_HZ, so the seam still closes.
    const firing = (1 + Math.cos(2 * Math.PI * FIRING_HZ * t)) / 2;
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

const harmonic = harmonicLayer();
const noise = noiseLayer(20260807);
const mixed = new Float32Array(LENGTH);
for (let i = 0; i < LENGTH; i += 1) mixed[i] = harmonic[i] * 0.5 + noise[i] * 1.15;

// Gentle saturation for body, then normalise. No fade in/out — a fade would
// destroy the very seam this file exists to protect.
for (let i = 0; i < LENGTH; i += 1) mixed[i] = Math.tanh(mixed[i] * 1.35) / Math.tanh(1.35);
let peak = 0;
for (let i = 0; i < LENGTH; i += 1) peak = Math.max(peak, Math.abs(mixed[i]));
for (let i = 0; i < LENGTH; i += 1) mixed[i] *= 0.92 / peak;

// Seam report — the number that matters. If the discontinuity across the wrap
// is bigger than a typical sample-to-sample step inside the loop, the loop
// will click, and no amount of listening on a loaded machine will tell you
// that as reliably as this will.
const steps = new Float64Array(LENGTH - 1);
for (let i = 1; i < LENGTH; i += 1) steps[i - 1] = Math.abs(mixed[i] - mixed[i - 1]);
const sorted = Float64Array.from(steps).sort();
const maxStep = sorted[sorted.length - 1];
const meanStep = steps.reduce((sum, step) => sum + step, 0) / steps.length;
// The bar is the 99th percentile, NOT the mean. A steep part of the waveform
// has steep steps, and the wrap can legitimately land on one — the first
// version of this check compared against the mean and failed a loop whose seam
// was a perfectly ordinary step that merely happened to be steeper than
// average. What actually indicates a click is the seam being an OUTLIER.
const p99 = sorted[Math.floor(sorted.length * 0.99)];
const seamStep = Math.abs(mixed[0] - mixed[LENGTH - 1]);

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
const outPath = path.join(outDir, 'engine-loop.wav');
writeWav(outPath, mixed);

process.stdout.write(
  [
    `wrote ${path.relative(root, outPath)} (${statSync(outPath).size} bytes, ${LOOP_SECONDS}s @ ${BASE_HZ} Hz)`,
    `seam step        ${seamStep.toFixed(6)}`,
    `mean step        ${meanStep.toFixed(6)}`,
    `p99 step         ${p99.toFixed(6)}`,
    `max step         ${maxStep.toFixed(6)}`,
    `seam / p99       ${(seamStep / p99).toFixed(3)}  (must be <= 1 — the seam must not be an outlier)`,
  ].join('\n') + '\n'
);
if (seamStep > p99) {
  process.stderr.write('FAIL: the loop wrap is an outlier step — it will click once per loop, all race.\n');
  process.exit(1);
}
