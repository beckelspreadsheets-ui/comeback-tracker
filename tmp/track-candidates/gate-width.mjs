#!/usr/bin/env node
/**
 * gate-width.mjs — the wave-7 round-2 blind-A/B finding, turned into a number.
 *
 * WHY THIS EXISTS
 * ---------------
 * The blind judge picked the overhaul build 18/18 and then said this about the
 * winner, across all eighteen frames and BOTH shipped tracks:
 *
 *   "Across 18 frames and two tracks the road is the same width with the same
 *    gentle constant-radius bends and one crest. Nothing in the set shows a
 *    hairpin, an elevation drop, a narrowing, or a fork. Any 4x-length track
 *    candidate should be judged on whether a randomly sampled frame is
 *    identifiable as a specific corner — none of these 18 are. Bring candidates
 *    that vary road width and radius, not just length."
 *
 * Round 0 and round 1 judged the candidates on LENGTH, CORNER RADIUS, STRAIGHT
 * DURATION, BEAT SPACING, ELEVATION, CONTRAST and SIGHTLINE. Width was authored
 * in every candidate and measured in none of them: the previewer reports
 * `road.minWidth` / `road.maxWidth`, and those are the AUTHORED ribbon extremes
 * — the numbers a designer typed, not the numbers the runtime delivers or the
 * camera photographs. That is the reporting hole this file closes.
 *
 * WHAT IT FOUND (the reason this is not a formality)
 * -------------------------------------------------
 * The runtime's width profile is `makeWidthTable` in the monolith: 224 samples
 * indexed by PROGRESS, smoothed with 14 passes of a 1-2-1 kernel. Both of those
 * constants are fractions of a lap, so **every width transition scales with lap
 * length**. The kernel's standard deviation is sqrt(14 x 0.5) = 2.65 samples =
 * 0.0118 of a lap, which is ~34 world units on the shipped 2,890 u Comeback
 * City — matching the monolith's own comment, "soft transitions (~35 world
 * units)" — and ~138 world units on an 11,700 u 4x lap.
 *
 * So a 4x track authored in exactly the shipped style delivers its width
 * changes FOUR TIMES more slowly in world units, i.e. four times more slowly in
 * seconds at the same speed. Authoring MORE width range at 4x can still put
 * LESS width contrast in a frame. Measured, before this round's edits:
 *
 *   fastest 8-unit width change   CC (shipped) 0.29 s  ·  A 0.66  B 0.57  C 1.37
 *   frames carrying >= 4 u of width contrast in the near 200 u
 *                                 CC 44%   ·   A 13%   B 11%   C 4%
 *
 * ...even though all three candidates author a WIDER range (1.30-1.46 max/min)
 * than Comeback City does (1.244) and far wider than Penguin Village (1.103).
 * Penguin Village is the extreme case and it is the track that produced nine of
 * the blind judge's eighteen frames: 82% of its lap sits within +/-5% of its own
 * median width and there is NO 8-unit width change anywhere on the lap. The
 * judge's "one wide constant-radius boulevard" is not an impression, it is the
 * width table.
 *
 * That yields the two halves of the fix, and only one of them is authoring:
 *
 *   1. AUTHORING (this package, done): put the width step AT the signature
 *      corner and make it big enough to survive the smoother — see the
 *      per-candidate notes in docs/TRACK_CANDIDATES.md section 8.
 *   2. RUNTIME (a prerequisite for whoever builds the picked layout, NOT edited
 *      here): make the width table's resolution scale with lap length so the
 *      smoothing kernel stays ~35 WORLD units instead of ~1.2% of a lap. One
 *      line, quantified in section 8 of the doc. This file reports every metric
 *      in both columns — today's fixed 224 and a length-scaled table — so the
 *      prerequisite's value is a measured delta rather than a claim.
 *
 * SELF-CHECK. Like the previewer, this file mirrors runtime code, so it asserts
 * against shipped ground truth on every run and exits non-zero if it drifts:
 * Comeback City's lap length from the same CatmullRom the race uses, and the
 * shipped width table's own documented ~35-unit transition.
 *
 * Usage: node tmp/track-candidates/gate-width.mjs [--json]
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');

// Comeback City's measured mean speed — the same constant every other candidate
// number is quoted at, so seconds here are comparable to seconds there.
const MEAN_SPEED = 260;

// The runtime's width table, verbatim (monolith makeWidthTable).
const TABLE_SAMPLES = 224;
const SMOOTHING_PASSES = 14;
// Shipped Comeback City's lap length at the time the 224/14 pair was tuned.
// Used ONLY to express "what N would keep the kernel at the shipped world
// size" — it is a reference length, not a gate.
const SHIPPED_LAP_UNITS = 2897;

// ---------------------------------------------------------------------------
// THE BARS, and where each number comes from.
//
// Every bar is anchored to a MEASURED shipped value rather than to taste,
// because the blind judge's complaint is comparative ("the road is the same
// width") and the only defensible reference is the road that is already there.
// ---------------------------------------------------------------------------

// W1. Delivered width range. Comeback City delivers 1.244 and reads as varied
// enough that the judge's complaint was about radius first; Penguin Village
// delivers 1.103 and reads as one boulevard. The bar sits above CC because a
// 4x lap has four times as much road to differentiate.
const MIN_WIDTH_RATIO = 1.3;

// W2. How much of the lap is "the same road". Share of the lap within +/-5% of
// the lap's own median width — 5% of a ~55 u road is 2.75 u, well under the
// ~7 u width of a kart, i.e. a difference nobody can see from the seat.
// Measured: CC 30.8%, PV 82.4%.
const MAX_MEDIAN_BAND_SHARE = 0.45;

// W3. Squeeze legibility: how long the road takes to change by 8 units — a bit
// over one kart width, the smallest width change that is unmistakable in a
// frame. Shipped CC does it in 0.29 s. The bar is 0.60 s, i.e. twice as slow as
// the shipped track is allowed, because a 4x lap can spend longer on a
// transition without it disappearing.
const SQUEEZE_8U_MAX_SECONDS = 0.6;
const SQUEEZE_STEP_UNITS = 8;

// W4. Distinct width levels. Three separated populations, exactly the shape of
// the radius-class gate in gate-topspeed.mjs section 7b, and for the same
// reason: a range only says the ends exist, not that the road ever sits at
// them. Levels must be >= 6 u apart (one kart width) and each must hold for
// >= 5% of the lap (~2 s at race speed — long enough to register as a place).
const MIN_WIDTH_LEVELS = 3;
const LEVEL_SEPARATION_UNITS = 6;
const LEVEL_MIN_SHARE = 0.05;

// W5. Frame identifiability, the judge's actual test: "whether a randomly
// sampled frame is identifiable as a specific corner". 100 marks spread evenly
// by arc length, each reduced to what a single frame shows — width band,
// curvature class and handedness, gradient class — and no single signature may
// own more than 30% of the lap. Measured: PV 43% (fails), CC 22%.
const MAX_MODAL_SIGNATURE_SHARE = 0.3;

// W6. Width has to be COUPLED to the layout, not merely varied: the overtaking
// straight is where cars run side by side and the tightest corner is where the
// road should visibly close down. 12 units is two kart widths of difference
// between the widest place a pass happens and the tightest place on the lap.
const MIN_STRAIGHT_TO_HAIRPIN_DELTA = 12;

// Frame window. The near 200 units of road fill the lower half of a 1600x900
// capture at the shipped desktop tier (boom 32, eye 10.5, vFOV 60) — this is
// the road the judge is actually looking at when calling a frame "the same
// width". Contrast further out than this is a horizon detail, not a frame cue.
const FRAME_NEAR_UNITS = 200;
const FRAME_CONTRAST_UNITS = 4;

// Sampling. 1440 samples of the width profile (one per quarter-percent of lap)
// and 100 signature marks.
const PROFILE_SAMPLES = 1440;
const SIGNATURE_MARKS = 100;

// ---------------------------------------------------------------------------
// Runtime mirrors. Same rules as the previewer: duplicated because the monolith
// cannot be imported into node, and safe only because it is asserted below.
// ---------------------------------------------------------------------------

const wrap01 = (value) => ((value % 1) + 1) % 1;
const lerp = (a, b, t) => a + (b - a) * t;

const makeWidthTable = (trackDef, samples = TABLE_SAMPLES) => {
  const ribbons = trackDef.course.roadRibbons;
  const table = new Float32Array(samples);
  for (let index = 0; index < samples; index += 1) {
    const p = index / samples;
    const ribbon =
      ribbons.find((entry) => p >= entry.startProgress && p < entry.endProgress) || ribbons[ribbons.length - 1];
    table[index] = ribbon.width;
  }
  for (let pass = 0; pass < SMOOTHING_PASSES; pass += 1) {
    const copy = Float32Array.from(table);
    for (let index = 0; index < samples; index += 1) {
      table[index] = (copy[(index + samples - 1) % samples] + copy[index] * 2 + copy[(index + 1) % samples]) / 4;
    }
  }
  return table;
};

const makeWidthAt = (trackDef, samples) => {
  const table = makeWidthTable(trackDef, samples);
  return (progress) => {
    const scaled = wrap01(progress) * table.length;
    const low = Math.floor(scaled) % table.length;
    const high = (low + 1) % table.length;
    return lerp(table[low], table[high], scaled - Math.floor(scaled));
  };
};

const makeElevation = (trackDef) => {
  const band = trackDef.elevation?.bridgeBand;
  if (!band) return () => 0;
  return (progress) => {
    const p = wrap01(progress);
    if (p > band.from && p < band.to) {
      return Math.sin(((p - band.from) / (band.to - band.from)) * Math.PI) * band.peak;
    }
    return 0;
  };
};

const makeCurve = (trackDef, elevationAt) =>
  new THREE.CatmullRomCurve3(
    trackDef.course.centerline.map(
      (point, index, list) => new THREE.Vector3(point.x, elevationAt(index / list.length), point.z)
    ),
    true,
    'catmullrom',
    0.38
  );

// ---------------------------------------------------------------------------
// Measurement
// ---------------------------------------------------------------------------

// Radius by three-point circumfit at a fixed 30-unit arm. The previewer's
// corner detector remains the authority on what IS a corner; this only needs a
// per-sample curvature class for the frame signature, and a fixed arm keeps the
// class comparable between a 2,890 u lap and an 11,700 u one.
const CIRCUMFIT_ARM_UNITS = 30;

const radiusAt = (curve, length, progress) => {
  const h = CIRCUMFIT_ARM_UNITS / length;
  const a = curve.getPointAt(wrap01(progress - h));
  const b = curve.getPointAt(wrap01(progress));
  const c = curve.getPointAt(wrap01(progress + h));
  const ax = a.x - b.x;
  const az = a.z - b.z;
  const cx = c.x - b.x;
  const cz = c.z - b.z;
  const cross = ax * cz - az * cx;
  if (Math.abs(cross) < 1e-9) return { radius: Infinity, direction: 0 };
  const la = Math.hypot(ax, az);
  const lc = Math.hypot(cx, cz);
  const lac = Math.hypot(a.x - c.x, a.z - c.z);
  return { radius: (la * lc * lac) / (2 * Math.abs(cross)), direction: Math.sign(cross) };
};

export const analyse = (name, trackDef, { tableSamples = TABLE_SAMPLES } = {}) => {
  const elevationAt = makeElevation(trackDef);
  const curve = makeCurve(trackDef, elevationAt);
  const length = curve.getLength();
  const widthAt = makeWidthAt(trackDef, tableSamples);

  const S = PROFILE_SAMPLES;
  const dsUnits = length / S;
  const widths = Array.from({ length: S }, (_, index) => widthAt(index / S));
  const sorted = [...widths].sort((a, b) => a - b);
  const median = sorted[S >> 1];
  const min = sorted[0];
  const max = sorted[S - 1];

  const medianBandShare = widths.filter((w) => Math.abs(w - median) <= median * 0.05).length / S;

  // Fastest 8-unit change anywhere on the lap, and where.
  let squeezeSeconds = Infinity;
  let squeezeProgress = 0;
  const maxSpan = Math.floor(S / 4);
  for (let index = 0; index < S; index += 1) {
    for (let step = 1; step <= maxSpan; step += 1) {
      if (Math.abs(widths[(index + step) % S] - widths[index]) >= SQUEEZE_STEP_UNITS) {
        const seconds = (step * dsUnits) / MEAN_SPEED;
        if (seconds < squeezeSeconds) {
          squeezeSeconds = seconds;
          squeezeProgress = index / S;
        }
        break;
      }
    }
  }

  // In-frame contrast: the width range inside the near 200 units of road.
  const nearSteps = Math.max(1, Math.round(FRAME_NEAR_UNITS / dsUnits));
  const frameContrast = new Array(S);
  for (let index = 0; index < S; index += 1) {
    let low = Infinity;
    let high = -Infinity;
    for (let step = 0; step <= nearSteps; step += 1) {
      const value = widths[(index + step) % S];
      low = Math.min(low, value);
      high = Math.max(high, value);
    }
    frameContrast[index] = high - low;
  }
  const bestFrameContrast = Math.max(...frameContrast);
  const frameContrastShare = frameContrast.filter((v) => v >= FRAME_CONTRAST_UNITS).length / S;

  // Width LEVELS: quantise to LEVEL_SEPARATION_UNITS and keep the buckets that
  // hold for long enough to register as a place rather than as a transition.
  const buckets = new Map();
  widths.forEach((w) => {
    const key = Math.round(w / LEVEL_SEPARATION_UNITS);
    buckets.set(key, (buckets.get(key) || 0) + 1);
  });
  const levels = [...buckets.entries()]
    .filter(([, count]) => count / S >= LEVEL_MIN_SHARE)
    .map(([key, count]) => ({ centreUnits: key * LEVEL_SEPARATION_UNITS, share: count / S }))
    .sort((a, b) => b.centreUnits - a.centreUnits);

  // Coupling: the widest point of the longest straight vs the width at the
  // tightest point on the lap. The longest straight is found here rather than
  // read from the previewer's JSON so this file stands alone — it is the
  // longest contiguous run with a circumfit radius over 400 u, and it is
  // cross-checked against the previewer's number in the printout.
  const radii = new Array(S);
  const directions = new Array(S);
  for (let index = 0; index < S; index += 1) {
    const { radius, direction } = radiusAt(curve, length, index / S);
    radii[index] = radius;
    directions[index] = direction;
  }
  let bestRun = { start: 0, end: 0, steps: 0 };
  let runStart = -1;
  for (let index = 0; index < S * 2; index += 1) {
    const at = index % S;
    if (radii[at] > 400) {
      if (runStart < 0) runStart = index;
      const steps = index - runStart + 1;
      if (steps > bestRun.steps) bestRun = { start: runStart % S, end: at, steps };
    } else {
      runStart = -1;
    }
  }
  let straightWidth = 0;
  for (let step = 0; step < bestRun.steps; step += 1) {
    straightWidth = Math.max(straightWidth, widths[(bestRun.start + step) % S]);
  }
  let tightestIndex = 0;
  for (let index = 0; index < S; index += 1) if (radii[index] < radii[tightestIndex]) tightestIndex = index;
  const hairpinWidth = widths[tightestIndex];

  // Frame signature. Everything a single frame tells you about where you are,
  // reduced to buckets that are separable by eye: width to one kart width,
  // curvature to the four classes the corner tables already use, gradient to
  // climb / flat / drop. Landmarks are deliberately NOT modelled — they are the
  // dressing pass, and the point of this metric is whether the ROAD carries
  // identity on its own.
  const signatures = new Map();
  for (let mark = 0; mark < SIGNATURE_MARKS; mark += 1) {
    const progress = mark / SIGNATURE_MARKS;
    const base = Math.round(progress * S);
    let sum = 0;
    for (let step = 0; step <= nearSteps; step += 1) sum += widths[(base + step) % S];
    const widthBand = Math.round(sum / (nearSteps + 1) / LEVEL_SEPARATION_UNITS);
    const radius = radii[base % S];
    let shape = 'straight';
    if (radius < 120) shape = 'tight';
    else if (radius < 200) shape = 'turn';
    else if (radius < 400) shape = 'sweep';
    const hand = shape === 'straight' ? '' : directions[base % S] > 0 ? 'L' : 'R';
    const rise = elevationAt(progress + 20 / length) - elevationAt(progress);
    const grade = (rise / 20) * 100;
    const slope = grade > 3 ? 'climb' : grade < -3 ? 'drop' : 'flat';
    const key = `w${widthBand}·${shape}${hand}·${slope}`;
    signatures.set(key, (signatures.get(key) || 0) + 1);
  }
  const signatureList = [...signatures.entries()].sort((a, b) => b[1] - a[1]);
  const modalShare = signatureList[0][1] / SIGNATURE_MARKS;

  // Per-ribbon delivery: what the author typed vs what the runtime hands the
  // camera at the ribbon's own centre. A ribbon shorter than about 2 kernel
  // widths (0.024 of a lap) cannot reach its authored value at all.
  const ribbons = trackDef.course.roadRibbons.map((ribbon) => {
    const centre = (ribbon.startProgress + ribbon.endProgress) / 2;
    const delivered = widthAt(centre);
    const span = ribbon.endProgress - ribbon.startProgress;
    return {
      key: ribbon.key,
      authored: ribbon.width,
      delivered: +delivered.toFixed(1),
      spanProgress: +span.toFixed(3),
      spanUnits: Math.round(span * length),
      shortfall: +(ribbon.width - delivered).toFixed(1),
    };
  });

  // The grid. Squeezing the lap is only a good idea if the start line is not
  // the place it happens: six karts form up two abreast at course.startProgress,
  // and a width step authored near p0 is delivered ACROSS the start/finish line
  // because the width table wraps. Reported, not gated — the bar depends on the
  // grid layout the build picks — but a candidate whose grid sits on its
  // narrowest road would be an authoring accident, not a design.
  const gridWidth = widthAt(trackDef.course.startProgress ?? 0);

  return {
    name,
    key: trackDef.key,
    lengthUnits: +length.toFixed(1),
    gridWidth: +gridWidth.toFixed(1),
    tableSamples,
    kernelWorldUnits: +((Math.sqrt(SMOOTHING_PASSES * 0.5) / tableSamples) * length).toFixed(1),
    authored: {
      min: Math.min(...trackDef.course.roadRibbons.map((r) => r.width)),
      max: Math.max(...trackDef.course.roadRibbons.map((r) => r.width)),
    },
    delivered: { min: +min.toFixed(1), max: +max.toFixed(1), median: +median.toFixed(1), ratio: +(max / min).toFixed(3) },
    medianBandShare: +medianBandShare.toFixed(3),
    // squeezeSeconds stays Infinity when the lap never changes by 8 units
    // anywhere — Penguin Village, and the reason it is reported as "never"
    // rather than as a big number: it is a different statement about the track.
    squeeze: { seconds: Number.isFinite(squeezeSeconds) ? +squeezeSeconds.toFixed(2) : null, progress: +squeezeProgress.toFixed(3) },
    frame: {
      bestContrastUnits: +bestFrameContrast.toFixed(1),
      contrastShare: +frameContrastShare.toFixed(3),
    },
    levels,
    coupling: {
      straightWidth: +straightWidth.toFixed(1),
      straightUnits: Math.round(bestRun.steps * dsUnits),
      hairpinWidth: +hairpinWidth.toFixed(1),
      hairpinProgress: +(tightestIndex / S).toFixed(3),
      hairpinRadius: +radii[tightestIndex].toFixed(1),
      delta: +(straightWidth - hairpinWidth).toFixed(1),
    },
    signature: { distinct: signatureList.length, modal: signatureList[0][0], modalShare: +modalShare.toFixed(2), top: signatureList.slice(0, 5) },
    ribbons,
  };
};

export const verdictFor = (result) => {
  const checks = [
    { key: 'W1 delivered ratio', pass: result.delivered.ratio >= MIN_WIDTH_RATIO, got: `${result.delivered.ratio}`, bar: `>= ${MIN_WIDTH_RATIO}` },
    {
      key: 'W2 same-road share',
      pass: result.medianBandShare <= MAX_MEDIAN_BAND_SHARE,
      got: `${(result.medianBandShare * 100).toFixed(1)}%`,
      bar: `<= ${MAX_MEDIAN_BAND_SHARE * 100}%`,
    },
    {
      key: `W3 ${SQUEEZE_STEP_UNITS}u squeeze`,
      pass: result.squeeze.seconds !== null && result.squeeze.seconds <= SQUEEZE_8U_MAX_SECONDS,
      got: result.squeeze.seconds === null ? 'never' : `${result.squeeze.seconds}s`,
      bar: `<= ${SQUEEZE_8U_MAX_SECONDS}s`,
    },
    { key: 'W4 width levels', pass: result.levels.length >= MIN_WIDTH_LEVELS, got: `${result.levels.length}`, bar: `>= ${MIN_WIDTH_LEVELS}` },
    {
      key: 'W5 modal frame',
      pass: result.signature.modalShare <= MAX_MODAL_SIGNATURE_SHARE,
      got: `${(result.signature.modalShare * 100).toFixed(0)}%`,
      bar: `<= ${MAX_MODAL_SIGNATURE_SHARE * 100}%`,
    },
    {
      key: 'W6 straight-hairpin',
      pass: result.coupling.delta >= MIN_STRAIGHT_TO_HAIRPIN_DELTA,
      got: `${result.coupling.delta}u`,
      bar: `>= ${MIN_STRAIGHT_TO_HAIRPIN_DELTA}u`,
    },
  ];
  return { checks, pass: checks.every((check) => check.pass) };
};

// The sheet (build-sheet.mjs) IMPORTS the two functions above rather than
// reimplementing them, for the same reason it imports gate-topspeed.mjs: the
// owner's page and the terminal must not be able to disagree about a verdict.
// Everything below this line is the command-line run and is skipped on import.
export const BARS = {
  MIN_WIDTH_RATIO,
  MAX_MEDIAN_BAND_SHARE,
  SQUEEZE_8U_MAX_SECONDS,
  SQUEEZE_STEP_UNITS,
  MIN_WIDTH_LEVELS,
  MAX_MODAL_SIGNATURE_SHARE,
  MIN_STRAIGHT_TO_HAIRPIN_DELTA,
  TABLE_SAMPLES,
  SMOOTHING_PASSES,
  SHIPPED_LAP_UNITS,
};

// Everything below runs only when this file is the entry point. Guarded rather
// than split into two files because the CLI's self-checks (shipped lap length,
// shipped kernel size) exit the process on drift, and a sheet build should not
// be killed by them — build-sheet.mjs wants the two exported functions, not the
// report.
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const { COMEBACK_CITY_TRACK } = await import(`file://${resolve(ROOT, 'src/game/race/tracks/comebackCity.js')}`);
const { PENGUIN_VILLAGE_TRACK } = await import(`file://${resolve(ROOT, 'src/game/race/tracks/penguinVillage.js')}`);
const candidates = [];
for (const file of ['candidate-a.mjs', 'candidate-b.mjs', 'candidate-c.mjs']) {
  candidates.push((await import(`file://${resolve(HERE, file)}`)).default);
}

// SELF-CHECK 1: the mirrored curve reproduces the shipped lap length. The
// working tree's Comeback City is 2,889.7 u since the start/finish kink fix.
const shipped = analyse('Comeback City (shipped)', COMEBACK_CITY_TRACK);
if (Math.abs(shipped.lengthUnits - 2889.7) > 5) {
  console.error(`FATAL: mirrored curve gives ${shipped.lengthUnits} u for Comeback City, expected ~2889.7. The mirror has drifted.`);
  process.exit(1);
}
// SELF-CHECK 2: the smoothing kernel on the shipped track must land on the
// ~35 world units the monolith's own comment claims. If this drifts, either the
// constants moved or the mirror is wrong, and every conclusion below is void.
if (Math.abs(shipped.kernelWorldUnits - 34.2) > 3) {
  console.error(`FATAL: kernel measures ${shipped.kernelWorldUnits} u on Comeback City, expected ~34. Mirror drift.`);
  process.exit(1);
}

const village = analyse('Penguin Village (shipped)', PENGUIN_VILLAGE_TRACK);
const rows = [shipped, village, ...candidates.map((track) => analyse(track.name, track))];
// The same three candidates measured against a width table whose resolution
// scales with lap length — the runtime prerequisite, priced.
const scaled = candidates.map((track) =>
  analyse(track.name, track, {
    tableSamples: Math.round(TABLE_SAMPLES * (analyse(track.name, track).lengthUnits / SHIPPED_LAP_UNITS)),
  })
);

const pad = (value, width) => String(value).padEnd(width);
const lead = (value, width) => String(value).padStart(width);

process.stdout.write(`\nROAD WIDTH GATE — "is a randomly sampled frame identifiable as a specific corner?"\n`);
process.stdout.write(`Width table ${TABLE_SAMPLES} samples x ${SMOOTHING_PASSES} smoothing passes, both fractions of a lap.\n\n`);

process.stdout.write(
  `${pad('track', 26)}${lead('lap u', 8)}${lead('kernel', 8)}${lead('authored', 11)}${lead('delivered', 12)}${lead('ratio', 7)}${lead('same-road', 11)}${lead('8u in', 8)}${lead('frame', 7)}${lead('modal', 7)}${lead('grid', 7)}\n`
);
process.stdout.write(`${'-'.repeat(110)}\n`);
for (const row of rows) {
  process.stdout.write(
    pad(row.name, 26) +
      lead(Math.round(row.lengthUnits), 8) +
      lead(`${row.kernelWorldUnits}u`, 8) +
      lead(`${row.authored.min}-${row.authored.max}`, 11) +
      lead(`${row.delivered.min}-${row.delivered.max}`, 12) +
      lead(row.delivered.ratio, 7) +
      lead(`${(row.medianBandShare * 100).toFixed(0)}%`, 11) +
      lead(row.squeeze.seconds === null ? 'never' : `${row.squeeze.seconds}s`, 8) +
      lead(`${row.frame.bestContrastUnits}u`, 7) +
      lead(`${(row.signature.modalShare * 100).toFixed(0)}%`, 7) +
      lead(`${row.gridWidth}u`, 7) +
      '\n'
  );
}

process.stdout.write(`\nWith a LENGTH-SCALED width table (the runtime prerequisite — not shipped):\n`);
for (const row of scaled) {
  process.stdout.write(
    pad(`  ${row.name}`, 26) +
      lead(Math.round(row.lengthUnits), 8) +
      lead(`${row.kernelWorldUnits}u`, 8) +
      lead(`N=${row.tableSamples}`, 11) +
      lead(`${row.delivered.min}-${row.delivered.max}`, 12) +
      lead(row.delivered.ratio, 7) +
      lead(`${(row.medianBandShare * 100).toFixed(0)}%`, 11) +
      lead(row.squeeze.seconds === null ? 'never' : `${row.squeeze.seconds}s`, 8) +
      lead(`${row.frame.bestContrastUnits}u`, 7) +
      lead(`${(row.signature.modalShare * 100).toFixed(0)}%`, 7) +
      lead(`${row.gridWidth}u`, 7) +
      '\n'
  );
}

let failed = 0;
for (const row of rows) {
  const { checks, pass } = verdictFor(row);
  process.stdout.write(`\n${row.name} — ${pass ? 'PASS' : 'FAIL'}\n`);
  for (const check of checks) {
    process.stdout.write(`   ${check.pass ? 'ok  ' : 'FAIL'} ${pad(check.key, 22)} ${lead(check.got, 8)}  (bar ${check.bar})\n`);
  }
  process.stdout.write(
    `   levels ${row.levels.map((level) => `${level.centreUnits}u x${(level.share * 100).toFixed(0)}%`).join(', ')}\n`
  );
  process.stdout.write(
    `   longest straight ${row.coupling.straightUnits}u at ${row.coupling.straightWidth}u wide; tightest r${row.coupling.hairpinRadius} at p${row.coupling.hairpinProgress} is ${row.coupling.hairpinWidth}u wide\n`
  );
  process.stdout.write(`   frames with >=${FRAME_CONTRAST_UNITS}u contrast in the near ${FRAME_NEAR_UNITS}u: ${(row.frame.contrastShare * 100).toFixed(0)}%\n`);
  process.stdout.write(`   signatures ${row.signature.distinct}/${SIGNATURE_MARKS}: ${row.signature.top.map(([key, count]) => `${key} x${count}`).join('  ')}\n`);
  process.stdout.write(
    `   ribbons: ${row.ribbons.map((ribbon) => `${ribbon.key} ${ribbon.authored}->${ribbon.delivered}`).join(' | ')}\n`
  );
  // Only the candidates are gated. The shipped tracks are printed as the
  // reference the bars were derived from; failing them here is a finding about
  // the shipped tracks, not about this round's work.
  if (!pass && row.key?.startsWith('cc4x')) failed += 1;
}

if (process.argv.includes('--json')) {
  const out = resolve(HERE, 'preview', 'width-gate.json');
  writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), meanSpeed: MEAN_SPEED, rows, scaled }, null, 2));
  process.stdout.write(`\nwrote ${out}\n`);
}

process.stdout.write(`\n${failed ? `${failed} candidate(s) FAIL the width gate` : 'all candidates pass the width gate'}\n`);
process.exit(failed ? 1 : 0);

}
