#!/usr/bin/env node
// Track layout previewer — see a lap BEFORE geometry is built from it.
//
// Why this exists: a kart track can be authored (waypoints, radii, ribbons,
// pads, boxes) and then not actually be LOOKED AT until the whole scene is
// assembled and driven. That blind spot is the same one that cost two kart
// lifts before the turntable rig existed. This is the track equivalent: it
// reads the SHIPPED track data, reproduces the exact curve the race drives,
// and emits (a) a to-scale plan view a human can judge a layout from and
// (b) a JSON report later agents can diff numerically.
//
//   node scripts/track-layout-preview.mjs                       # both tracks
//   node scripts/track-layout-preview.mjs --track penguin-village
//   node scripts/track-layout-preview.mjs --compare comeback-city,penguin-village
//   node scripts/track-layout-preview.mjs --json-only           # no browser
//
// Reads: src/game/race/tracks/*.js (never a copy of the shape — the real data)
// Writes: tmp/track-preview/<key>-layout.json, <key>-plan.png, compare-*.png
//
// See docs/TRACK_DESIGN_NOTES.md for how to read the output and what a 4x
// layout is being asked to hit.

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { KART_TRACKS, trackByKey } from '../src/game/race/tracks/index.js';
import { COIN_ROWS } from '../src/game/race/raceCoins.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'tmp/track-preview');

// ---------------------------------------------------------------------------
// Tuning constants. Every one of these is a MEASUREMENT decision, so each
// carries the reason it has the value it has.
// ---------------------------------------------------------------------------

// Mean speed over a full autoplay lap, per track. NOT top speed — the number
// that turns world units into seconds, which is the only unit a layout can be
// judged in. CC is measured: tmp/k2.5-launch-repro/telemetry-autoplay.json
// means 257 u/s over the moving part of the race and the lap solves at 260.
// PV is the same measurement on the shorter loop. --speed overrides.
const MEAN_SPEED = { 'comeback-city': 260, 'penguin-village': 248 };

// Ground truth the tool must agree with, or the maths is wrong and the tool
// is worse than useless. CC only — it is the track with shipped telemetry.
const GROUND_TRUTH = {
  'comeback-city': { lengthUnits: 2897, lapSeconds: 11.15, raceSeconds: 33.5, telemetryRaceSeconds: 34.08 },
};
const TELEMETRY_PATH = resolve(ROOT, 'tmp/k2.5-launch-repro/telemetry-autoplay.json');

// Curvature sampling. 2 units between samples is ~1/40th of the tightest
// authored fillet (72), so a real corner gets ~40 samples and the discrete
// turn angle is not quantisation noise.
const SAMPLE_STEP = 2;
// Turn angle is measured across a ±3-sample (±6 unit) baseline and then box
// smoothed over ±6 samples (±12 units). Without the smooth, the CatmullRom
// ripple between authored points reads as a corner every 30 units.
const CURVATURE_BASELINE = 3;
const CURVATURE_SMOOTH = 6;

// Corner detection uses HYSTERESIS, like every other signal detector: a
// corner is DECLARED where radius drops under ENTER, and then extended
// outward while radius is still under EXIT. A single threshold clips the
// gradual entry and exit of a long sweeper and inflates the straights —
// with a single 250 cut the longest straight measured 2.23 s, with the pair
// it measures 2.19 s, and the second number is the one that matches how the
// corner actually feels from the seat.
const CORNER_ENTER_RADIUS = 250;
const CORNER_EXIT_RADIUS = 450;
// Below ~11.5 degrees of total deflection nothing reads as a corner from the
// driver's seat — it is a line adjustment on a straight.
const MIN_CORNER_ANGLE_RAD = 0.2;
// Straights shorter than this are transitions between corners, not features.
const MIN_STRAIGHT_UNITS = 60;
// The tightest radius any shipped track AUTHORS is 72 (Penguin Village W3).
// Anything the curve produces below 60 was therefore not authored — it is a
// spline artifact, and it gets flagged rather than counted as design.
const KINK_RADIUS = 60;
// Corner taxonomy, for reading layout variety at a glance.
const HAIRPIN_MAX_RADIUS = 120;
const HAIRPIN_MIN_ANGLE_DEG = 120;
const SWEEPER_MIN_RADIUS = 120;
const SWEEPER_MIN_ANGLE_DEG = 45;
// Two corners that turn OPPOSITE ways with less than this between them are a
// chicane — one rhythm break, not two corners.
const CHICANE_MAX_GAP_UNITS = 60;

const wrap01 = (value) => ((value % 1) + 1) % 1;
const lerp = (a, b, t) => a + (b - a) * t;
const round = (value, dp = 2) => Number(value.toFixed(dp));

// ---------------------------------------------------------------------------
// SAMPLER — a faithful mirror of makeSampler/makeElevation/makeTrackCurve/
// makeWidthTable in src/game/ComebackCityThreeKartRace.jsx. It is duplicated
// rather than imported because that file is a 10.8k-line React/THREE monolith
// that cannot be loaded in node. Duplication is only safe because it is
// CHECKED: comebackCity solves to 2896.9 against the shipped 2897, and the
// resulting lap time solves to 11.14 s against the shipped 11.15 s. If the
// monolith's curve tension, elevation shape or width smoothing ever changes,
// the ground-truth assertion below fails loudly instead of drifting quietly.
// ---------------------------------------------------------------------------

const makeElevation = (trackDef) => {
  // A draft layout may carry no elevation at all; that is a flat track, not
  // an error, so the previewer must not require the field.
  const band = trackDef.elevation?.bridgeBand;
  if (!band) return () => 0;
  return (progress) => {
    const p = wrap01(progress);
    if (p > band.from && p < band.to) {
      const t = (p - band.from) / (band.to - band.from);
      return Math.sin(t * Math.PI) * band.peak;
    }
    return 0;
  };
};

const makeWidthTable = (trackDef) => {
  const N = 224;
  // A draft with no authored ribbons still has a road: fall back to the
  // course's single mainRoadWidth rather than refusing to draw.
  const ribbons =
    trackDef.course.roadRibbons?.length
      ? trackDef.course.roadRibbons
      : [{ key: 'main', startProgress: 0, endProgress: 1, width: trackDef.course.mainRoadWidth || 50, shoulderWidth: 6 }];
  const table = new Float32Array(N);
  for (let index = 0; index < N; index += 1) {
    const p = index / N;
    const ribbon =
      ribbons.find((entry) => p >= entry.startProgress && p < entry.endProgress) || ribbons[ribbons.length - 1];
    table[index] = ribbon.width;
  }
  for (let pass = 0; pass < 14; pass += 1) {
    const copy = Float32Array.from(table);
    for (let index = 0; index < N; index += 1) {
      table[index] = (copy[(index + N - 1) % N] + copy[index] * 2 + copy[(index + 1) % N]) / 4;
    }
  }
  return table;
};

const makeSampler = (trackDef) => {
  const elevationAt = makeElevation(trackDef);
  const points = trackDef.course.centerline.map(
    (point, index, list) => new THREE.Vector3(point.x, elevationAt(index / list.length), point.z)
  );
  const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.38);
  const length = curve.getLength();
  const widthTable = makeWidthTable(trackDef);
  const widthAt = (progress) => {
    const scaled = wrap01(progress) * widthTable.length;
    const low = Math.floor(scaled) % widthTable.length;
    const high = (low + 1) % widthTable.length;
    return lerp(widthTable[low], widthTable[high], scaled - Math.floor(scaled));
  };
  // Same lane convention the race uses: lane 1 = the drivable edge, which sits
  // at width * 0.44 from the centre. Beat `side` values are all in lane units.
  const pointAt = (progress, lane = 0) => {
    const p = wrap01(progress);
    const centre = curve.getPointAt(p);
    const tangent = curve.getTangentAt(p);
    const nx = -tangent.z;
    const nz = tangent.x;
    const n = Math.hypot(nx, nz) || 1;
    const offset = lane * widthAt(p) * 0.44;
    return { x: centre.x + (nx / n) * offset, z: centre.z + (nz / n) * offset, y: elevationAt(p) };
  };
  return { curve, elevationAt, length, pointAt, widthAt };
};

// ---------------------------------------------------------------------------
// CORNER / STRAIGHT ANALYSIS
// ---------------------------------------------------------------------------

const classifyCorner = (radius, angleDeg) => {
  if (radius < KINK_RADIUS) return 'kink';
  if (angleDeg >= HAIRPIN_MIN_ANGLE_DEG && radius < HAIRPIN_MAX_RADIUS) return 'hairpin';
  if (angleDeg >= SWEEPER_MIN_ANGLE_DEG && radius >= SWEEPER_MIN_RADIUS) return 'sweeper';
  return 'turn';
};

const analyseGeometry = (sampler, meanSpeed) => {
  const { curve, length } = sampler;
  const count = Math.max(64, Math.round(length / SAMPLE_STEP));
  const ds = length / count;
  const samples = [];
  for (let index = 0; index < count; index += 1) {
    const p = index / count;
    const point = curve.getPointAt(p);
    samples.push({ progress: p, x: point.x, z: point.z, y: sampler.elevationAt(p), width: sampler.widthAt(p) });
  }

  // Signed turn rate (radians per world unit) across a fixed baseline. Sign
  // carries the turn DIRECTION, which is what makes chicane detection possible.
  const rate = new Array(count);
  for (let index = 0; index < count; index += 1) {
    const a = samples[(index - CURVATURE_BASELINE + count) % count];
    const b = samples[index];
    const c = samples[(index + CURVATURE_BASELINE) % count];
    const v1x = b.x - a.x;
    const v1z = b.z - a.z;
    const v2x = c.x - b.x;
    const v2z = c.z - b.z;
    rate[index] = Math.atan2(v1x * v2z - v1z * v2x, v1x * v2x + v1z * v2z) / (CURVATURE_BASELINE * ds);
  }
  const smoothed = new Array(count);
  for (let index = 0; index < count; index += 1) {
    let sum = 0;
    for (let j = -CURVATURE_SMOOTH; j <= CURVATURE_SMOOTH; j += 1) sum += rate[(index + j + count) % count];
    smoothed[index] = sum / (CURVATURE_SMOOTH * 2 + 1);
  }
  const radii = smoothed.map((k) => (Math.abs(k) < 1e-9 ? Infinity : 1 / Math.abs(k)));
  samples.forEach((sample, index) => {
    sample.radius = radii[index];
  });

  // Hysteresis: seed on ENTER, grow outward while under EXIT.
  const inCorner = radii.map((r) => r < CORNER_ENTER_RADIUS);
  for (let index = 0; index < count; index += 1) {
    if (!inCorner[index]) continue;
    let forward = index;
    while (radii[(forward + 1) % count] < CORNER_EXIT_RADIUS && !inCorner[(forward + 1) % count]) {
      forward = (forward + 1) % count;
      inCorner[forward] = true;
    }
    let back = index;
    while (radii[(back - 1 + count) % count] < CORNER_EXIT_RADIUS && !inCorner[(back - 1 + count) % count]) {
      back = (back - 1 + count) % count;
      inCorner[back] = true;
    }
  }

  // Walk the loop from a point known to be OUTSIDE a corner so runs never wrap.
  let origin = 0;
  let guard = 0;
  while (inCorner[origin] && guard < count) {
    origin = (origin + 1) % count;
    guard += 1;
  }
  const runs = [];
  let current = null;
  for (let step = 0; step < count; step += 1) {
    const index = (origin + step) % count;
    if (inCorner[index]) {
      if (!current) current = { startIndex: index, lengthUnits: 0, angle: 0, minRadius: Infinity };
      current.lengthUnits += ds;
      current.angle += smoothed[index] * ds;
      current.minRadius = Math.min(current.minRadius, radii[index]);
      current.endIndex = index;
    } else if (current) {
      runs.push(current);
      current = null;
    }
  }
  if (current) runs.push(current);

  const corners = runs
    .filter((run) => Math.abs(run.angle) > MIN_CORNER_ANGLE_RAD)
    .map((run, order) => {
      const angleDeg = Math.abs(run.angle) * (180 / Math.PI);
      // Mean radius over the whole arc, i.e. arc length / swept angle — the
      // number a driver feels, as opposed to the tightest instant.
      const radius = run.lengthUnits / Math.abs(run.angle);
      return {
        index: order + 1,
        startProgress: round(run.startIndex / count, 4),
        endProgress: round(run.endIndex / count, 4),
        direction: run.angle > 0 ? 'left' : 'right',
        angleDeg: round(angleDeg, 1),
        radiusUnits: round(radius, 1),
        minRadiusUnits: round(run.minRadius, 1),
        lengthUnits: round(run.lengthUnits, 1),
        seconds: round(run.lengthUnits / meanSpeed, 2),
        type: classifyCorner(radius, angleDeg),
        // v^2 / r. Not a g figure (world units are not metres) — an INDEX,
        // useful only relative to the other corners on the same sheet.
        lateralLoad: round((meanSpeed * meanSpeed) / radius, 0),
      };
    });

  // Straights are simply what is left between consecutive corners.
  const straights = corners.map((corner, index) => {
    const next = corners[(index + 1) % corners.length];
    const startIndex = Math.round(corner.endProgress * count);
    const endIndex = Math.round(next.startProgress * count);
    const spanSamples = (endIndex - startIndex + count) % count;
    const lengthUnits = spanSamples * ds;
    return {
      startProgress: round(corner.endProgress, 4),
      endProgress: round(next.startProgress, 4),
      afterCorner: corner.index,
      beforeCorner: next.index,
      lengthUnits: round(lengthUnits, 1),
      seconds: round(lengthUnits / meanSpeed, 2),
    };
  });

  // Chicanes: adjacent opposite-handed corners with almost nothing between.
  const chicanes = [];
  corners.forEach((corner, index) => {
    const next = corners[(index + 1) % corners.length];
    const gap = straights[index].lengthUnits;
    if (corner.direction !== next.direction && gap < CHICANE_MAX_GAP_UNITS && corner.type !== 'kink' && next.type !== 'kink') {
      chicanes.push({ corners: [corner.index, next.index], gapUnits: gap });
    }
  });

  return { samples, corners, straights, chicanes, sampleSpacing: round(ds, 3) };
};

// ---------------------------------------------------------------------------
// BEATS — the authored moments around the lap.
//
// A BEAT is a discrete authored thing that happens TO the driver: an item box
// row, a boost pad, a ramp, the shortcut launch, the elevation crest. Coins
// are deliberately NOT beats: they are a continuous collectible layer that
// rewards line choice everywhere, so counting them would hide the real
// pacing. They are reported separately as a second density figure.
// ---------------------------------------------------------------------------

const collectBeats = (trackDef) => {
  const course = trackDef.course;
  const beats = [];
  (course.itemBoxes || []).forEach((box, index) =>
    beats.push({ kind: 'item-box', label: `box ${index + 1}`, progress: wrap01(box.progress), side: box.side ?? 0 })
  );
  (course.boostPads || []).forEach((pad, index) =>
    beats.push({ kind: 'boost-pad', label: pad.key || `pad ${index + 1}`, progress: wrap01(pad.progress), side: pad.side ?? 0 })
  );
  (trackDef.ramps || []).forEach((ramp, index) =>
    beats.push({ kind: 'ramp', label: `ramp ${index + 1}`, progress: wrap01(ramp.progress), side: ramp.side ?? 0 })
  );
  if (trackDef.shortcut) {
    beats.push({
      kind: 'shortcut',
      label: 'shortcut launch',
      progress: wrap01(trackDef.shortcut.launchProgress),
      side: trackDef.shortcut.side ?? 0,
    });
  }
  if (trackDef.elevation?.bridgeBand) {
    const band = trackDef.elevation.bridgeBand;
    beats.push({
      kind: trackDef.elevation.crestLaunch ? 'crest-launch' : 'crest',
      label: trackDef.elevation.crestLaunch ? 'bridge crest (free launch)' : 'bridge crest',
      progress: wrap01((band.from + band.to) / 2),
      side: 0,
    });
  }
  beats.sort((a, b) => a.progress - b.progress);
  return beats;
};

const coinRowsFor = (trackKey) => (COIN_ROWS[trackKey] || []).map((progress) => wrap01(progress));

// ---------------------------------------------------------------------------
// REPORT
// ---------------------------------------------------------------------------

const readTelemetryCheck = () => {
  if (!existsSync(TELEMETRY_PATH)) return null;
  try {
    const rows = JSON.parse(readFileSync(TELEMETRY_PATH, 'utf8'));
    const finished = rows.find((row) => row.finished);
    const moving = rows.filter((row) => row.raceTime > 1).map((row) => row.speed);
    return {
      source: 'tmp/k2.5-launch-repro/telemetry-autoplay.json',
      raceSeconds: finished ? finished.raceTime : null,
      meanMovingSpeed: moving.length ? round(moving.reduce((a, b) => a + b, 0) / moving.length, 1) : null,
      peakSpeed: moving.length ? Math.max(...moving) : null,
    };
  } catch {
    return null;
  }
};

const analyseTrack = (trackDef, { meanSpeedOverride } = {}) => {
  const key = trackDef.key;
  const meanSpeed = meanSpeedOverride || MEAN_SPEED[key] || 250;
  const sampler = makeSampler(trackDef);
  const geometry = analyseGeometry(sampler, meanSpeed);
  const laps = trackDef.laps || 3;
  const lapSeconds = sampler.length / meanSpeed;

  const beats = collectBeats(trackDef).map((beat) => {
    const point = sampler.pointAt(beat.progress, beat.side);
    return { ...beat, progress: round(beat.progress, 4), x: round(point.x, 1), z: round(point.z, 1) };
  });
  // Gap to the NEXT beat, wrapping the lap, expressed in the only unit that
  // matters for pacing: seconds at race speed.
  beats.forEach((beat, index) => {
    const next = beats[(index + 1) % beats.length];
    const delta = index === beats.length - 1 ? 1 - beat.progress + next.progress : next.progress - beat.progress;
    beat.gapToNextSeconds = round(delta * lapSeconds, 2);
  });
  const gaps = beats.map((beat) => beat.gapToNextSeconds);

  const coinRows = coinRowsFor(key).map((progress) => {
    const point = sampler.pointAt(progress, 0);
    return { progress: round(progress, 4), x: round(point.x, 1), z: round(point.z, 1) };
  });

  const realCorners = geometry.corners.filter((corner) => corner.type !== 'kink');
  const kinks = geometry.corners.filter((corner) => corner.type === 'kink');
  const namedStraights = geometry.straights.filter((straight) => straight.lengthUnits >= MIN_STRAIGHT_UNITS);
  const longest = namedStraights.reduce((best, s) => (!best || s.lengthUnits > best.lengthUnits ? s : best), null);

  // Elevation profile, sampled per-percent of the lap.
  const elevation = [];
  for (let index = 0; index <= 100; index += 1) elevation.push(round(sampler.elevationAt(index / 100), 2));
  const peakHeight = Math.max(...elevation);
  const band = trackDef.elevation?.bridgeBand || null;
  const bandLength = band ? (band.to - band.from) * sampler.length : 0;
  // Steepest gradient on the climb: a sine bump's max slope is at its foot.
  const maxGradientPct = band && bandLength > 0 ? round(((band.peak * Math.PI) / bandLength) * 100, 1) : 0;

  const widths = geometry.samples.map((sample) => sample.width);

  const report = {
    key,
    name: trackDef.name,
    tagline: trackDef.tagline || '',
    generatedAt: new Date().toISOString(),
    tool: 'scripts/track-layout-preview.mjs',
    meanSpeed,
    laps,
    lengthUnits: round(sampler.length, 1),
    lapSeconds: round(lapSeconds, 2),
    raceSeconds: round(lapSeconds * laps, 2),
    road: {
      minWidth: round(Math.min(...widths), 1),
      maxWidth: round(Math.max(...widths), 1),
      ribbons: (trackDef.course.roadRibbons || []).map((ribbon) => ({
        key: ribbon.key,
        startProgress: ribbon.startProgress,
        endProgress: ribbon.endProgress,
        width: ribbon.width,
        shoulderWidth: ribbon.shoulderWidth,
      })),
    },
    corners: {
      total: geometry.corners.length,
      authored: realCorners.length,
      kinks: kinks.length,
      byType: ['sweeper', 'hairpin', 'turn', 'kink'].reduce((acc, type) => {
        acc[type] = geometry.corners.filter((corner) => corner.type === type).length;
        return acc;
      }, {}),
      byDirection: {
        left: geometry.corners.filter((corner) => corner.direction === 'left').length,
        right: geometry.corners.filter((corner) => corner.direction === 'right').length,
      },
      radiusRange: realCorners.length
        ? [Math.min(...realCorners.map((c) => c.radiusUnits)), Math.max(...realCorners.map((c) => c.radiusUnits))]
        : [0, 0],
      chicanes: geometry.chicanes,
      list: geometry.corners,
    },
    straights: {
      countOverMin: namedStraights.length,
      minUnits: MIN_STRAIGHT_UNITS,
      longestUnits: longest ? longest.lengthUnits : 0,
      // THE HEADLINE. A pass needs a window to be set up in; this is how long
      // that window is.
      longestSeconds: longest ? longest.seconds : 0,
      totalStraightUnits: round(
        geometry.straights.reduce((sum, straight) => sum + straight.lengthUnits, 0),
        1
      ),
      list: geometry.straights,
    },
    beats: {
      count: beats.length,
      meanGapSeconds: round(lapSeconds / Math.max(1, beats.length), 2),
      minGapSeconds: gaps.length ? round(Math.min(...gaps), 2) : 0,
      maxGapSeconds: gaps.length ? round(Math.max(...gaps), 2) : 0,
      byKind: beats.reduce((acc, beat) => {
        acc[beat.kind] = (acc[beat.kind] || 0) + 1;
        return acc;
      }, {}),
      list: beats,
    },
    coins: {
      rows: coinRows.length,
      coinsPerRow: 2,
      meanGapSeconds: coinRows.length ? round(lapSeconds / coinRows.length, 2) : 0,
      list: coinRows,
    },
    elevation: {
      carries: peakHeight > 0.01,
      peakHeight: round(peakHeight, 1),
      band,
      bandLengthUnits: round(bandLength, 1),
      bandSeconds: round(bandLength / meanSpeed, 2),
      maxGradientPct,
      crestLaunch: Boolean(trackDef.elevation?.crestLaunch),
      profile: elevation,
    },
    // Drawing payload for the plan view. Downsampled to ~4 units; the corner
    // maths already ran at 2, so this only affects the picture.
    plan: geometry.samples
      .filter((_, index) => index % 2 === 0)
      .map((sample) => [round(sample.x, 1), round(sample.z, 1), round(sample.width, 1)]),
    startProgress: trackDef.course.startProgress ?? 0,
  };

  // Validation — the tool must be checkable, not merely plausible.
  const truth = GROUND_TRUTH[key];
  if (truth) {
    const pct = (a, b) => round(((a - b) / b) * 100, 2);
    const telemetry = readTelemetryCheck();
    report.validation = {
      groundTruth: truth,
      telemetry,
      lengthDeltaPct: pct(report.lengthUnits, truth.lengthUnits),
      lapDeltaPct: pct(report.lapSeconds, truth.lapSeconds),
      raceDeltaPct: pct(report.raceSeconds, truth.raceSeconds),
      // The measured race is SLOWER than the geometric solve because the grid
      // start spends the first ~2 s accelerating from a standstill.
      vsTelemetryPct: telemetry?.raceSeconds ? pct(report.raceSeconds, telemetry.raceSeconds) : null,
      pass: Math.abs(pct(report.lengthUnits, truth.lengthUnits)) < 1 && Math.abs(pct(report.lapSeconds, truth.lapSeconds)) < 3,
    };
  }
  return report;
};

// ---------------------------------------------------------------------------
// RENDER — Playwright canvas. sharp is not a dependency of this repo; a
// headless chromium page is the established way to get a PNG out of a script.
// ---------------------------------------------------------------------------

const SHEET_CSS = `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin:0; background:#0b0e14; color:#e6ebf5;
  font: 13px/1.45 ui-monospace, "SF Mono", Menlo, monospace; padding:26px; }
h1 { font-size:23px; margin:0 0 2px; letter-spacing:.02em; }
h1 small { font-weight:400; color:#7d8aa3; font-size:13px; letter-spacing:0; }
h2 { font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:#7d8aa3;
  margin:0 0 8px; border-bottom:1px solid #202634; padding-bottom:5px; }
.sub { color:#7d8aa3; margin:0 0 18px; font-size:12px; }
.cols { display:flex; gap:22px; align-items:flex-start; }
.panel { background:#111624; border:1px solid #1e2534; border-radius:9px; padding:14px; }
.stats { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
.stat { background:#111624; border:1px solid #1e2534; border-radius:9px; padding:10px 12px; }
.stat .k { font-size:10px; letter-spacing:.13em; text-transform:uppercase; color:#7d8aa3; }
.stat .v { font-size:22px; font-weight:600; margin-top:3px; }
.stat .n { font-size:11px; color:#8894ab; margin-top:1px; }
.stat.hero { border-color:#c8763a; background:#1b1410; }
.stat.hero .v { color:#ffb85a; }
.stat.warn { border-color:#8d3a3a; background:#1c1112; }
.stat.warn .v { color:#ff7a6e; }
table { border-collapse:collapse; width:100%; font-size:12px; }
th { text-align:left; font-weight:500; color:#7d8aa3; font-size:10px; letter-spacing:.1em;
  text-transform:uppercase; padding:4px 8px 4px 0; border-bottom:1px solid #202634; }
td { padding:3px 8px 3px 0; border-bottom:1px solid #161b27; white-space:nowrap; }
td.num { text-align:right; font-variant-numeric:tabular-nums; }
.tag { display:inline-block; padding:1px 6px; border-radius:4px; font-size:10px; letter-spacing:.06em; }
.t-sweeper { background:#123a2e; color:#5fe0b0; }
.t-hairpin { background:#3a1230; color:#ff8ad4; }
.t-turn    { background:#16243c; color:#7fb2ff; }
.t-kink    { background:#3a1414; color:#ff7a6e; }
.legend { display:flex; flex-wrap:wrap; gap:12px; margin-top:10px; font-size:11px; color:#9aa6bd; }
.legend span { display:flex; align-items:center; gap:5px; }
.sw { width:11px; height:11px; border-radius:3px; display:inline-block; }
.note { font-size:11px; color:#8894ab; margin-top:10px; line-height:1.5; }
.flag { border-left:3px solid #ff7a6e; padding:7px 11px; background:#1c1112; border-radius:0 7px 7px 0;
  font-size:12px; color:#ffc0b8; margin-top:12px; }
.ok { border-left-color:#4dbd8a; background:#101c17; color:#a5e8c9; }
.gapbar { height:9px; background:#1a2130; border-radius:3px; overflow:hidden; margin-top:2px; }
.gapbar i { display:block; height:100%; background:#5b8cff; }
canvas { display:block; border-radius:7px; background:#080a10; }
.stack { display:flex; flex-direction:column; gap:16px; }
.pair { display:flex; gap:22px; }
`;

// Drawn in the browser. Kept as one self-contained function so the same code
// serves the single-track sheet and both halves of the compare sheet.
const DRAW_SCRIPT = String.raw`
const BEAT_STYLE = {
  'item-box':    { fill:'#36e2ff', shape:'square',   r:6.5 },
  'boost-pad':   { fill:'#ff5bd0', shape:'chevron',  r:8 },
  'ramp':        { fill:'#ffa63d', shape:'triangle', r:7.5 },
  'shortcut':    { fill:'#b06bff', shape:'diamond',  r:8 },
  'crest':       { fill:'#f2f6ff', shape:'diamond',  r:7 },
  'crest-launch':{ fill:'#ffd34f', shape:'diamond',  r:8.5 },
};

function planBounds(report) {
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for (const [x,z,w] of report.plan) {
    const pad = w*0.6;
    minX=Math.min(minX,x-pad); maxX=Math.max(maxX,x+pad);
    minZ=Math.min(minZ,z-pad); maxZ=Math.max(maxZ,z+pad);
  }
  return {minX,maxX,minZ,maxZ};
}

function drawPlan(canvas, report, opts) {
  const o = opts || {};
  const ctx = canvas.getContext('2d');
  const dpr = 2;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W*dpr; canvas.height = H*dpr;
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,W,H);

  const b = o.bounds || planBounds(report);
  const inset = 74; // room for the corner labels that sit outside the loop
  // unitsPerPx is shared in compare mode so two layouts are literally to the
  // same scale — the whole point of putting them side by side.
  const upp = o.unitsPerPx || Math.max((b.maxX-b.minX)/(W-inset*2), (b.maxZ-b.minZ)/(H-inset*2));
  const cx = (b.minX+b.maxX)/2, cz = (b.minZ+b.maxZ)/2;
  // World +z maps to screen +y so the plan matches the minimap's handedness.
  const X = (x) => W/2 + (x-cx)/upp;
  const Y = (z) => H/2 + (z-cz)/upp;

  // grid at 100 world units
  ctx.strokeStyle = '#141a26'; ctx.lineWidth = 1;
  const g = 100;
  for (let x = Math.ceil((cx-W/2*upp)/g)*g; x < cx+W/2*upp; x += g) {
    ctx.beginPath(); ctx.moveTo(X(x),0); ctx.lineTo(X(x),H); ctx.stroke();
  }
  for (let z = Math.ceil((cz-H/2*upp)/g)*g; z < cz+H/2*upp; z += g) {
    ctx.beginPath(); ctx.moveTo(0,Y(z)); ctx.lineTo(W,Y(z)); ctx.stroke();
  }

  const plan = report.plan;
  const N = plan.length;
  const norm = (i) => {
    const a = plan[(i-1+N)%N], c = plan[(i+1)%N];
    let nx = -(c[1]-a[1]), nz = (c[0]-a[0]);
    const l = Math.hypot(nx,nz)||1; return [nx/l, nz/l];
  };
  // Road ribbon at true width (lane 1 sits at width*0.44, same as the race).
  // Filled QUAD BY QUAD rather than as one even-odd ring pair: Comeback City
  // crosses over itself at the bridge, and an even-odd fill cancels itself out
  // exactly where the two ribbons overlap — punching a hole through the most
  // important junction on the track.
  const edgePoint = (i, sign) => {
    const [x,z,w] = plan[i]; const [nx,nz] = norm(i);
    return [X(x + nx*w*0.44*sign), Y(z + nz*w*0.44*sign)];
  };
  ctx.fillStyle = o.accentDim || '#1b2438';
  ctx.strokeStyle = o.accentDim || '#1b2438';
  ctx.lineWidth = 1; // stroking each quad with its own fill closes the
  ctx.lineJoin = 'round'; // antialiased hairline seam between adjacent quads
  for (let i=0;i<N;i++){
    const j = (i+1)%N;
    const a = edgePoint(i,1), b = edgePoint(j,1), c = edgePoint(j,-1), d = edgePoint(i,-1);
    ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.lineTo(c[0],c[1]); ctx.lineTo(d[0],d[1]);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.strokeStyle = o.accent || '#4a6ea8'; ctx.lineWidth = 1.4;
  for (const sign of [1,-1]) {
    ctx.beginPath();
    for (let i=0;i<N;i++){ const p = edgePoint(i,sign); if (i===0) ctx.moveTo(p[0],p[1]); else ctx.lineTo(p[0],p[1]); }
    ctx.closePath(); ctx.stroke();
  }

  // Straights over the reporting minimum, drawn as the overtaking windows.
  const idxOf = (p) => Math.round(((p%1)+1)%1 * N) % N;
  for (const s of report.straights.list) {
    if (s.lengthUnits < report.straights.minUnits) continue;
    const hero = s.lengthUnits === report.straights.longestUnits;
    ctx.strokeStyle = hero ? '#ffd34f' : '#3f5f8a';
    ctx.lineWidth = hero ? 4 : 2.5;
    ctx.beginPath();
    let i = idxOf(s.startProgress);
    const end = idxOf(s.endProgress);
    let steps = 0;
    ctx.moveTo(X(plan[i][0]), Y(plan[i][1]));
    while (i !== end && steps < N) { i=(i+1)%N; steps++; ctx.lineTo(X(plan[i][0]), Y(plan[i][1])); }
    ctx.stroke();
    if (hero) {
      const m = plan[idxOf((s.startProgress + (s.endProgress<s.startProgress?s.endProgress+1:s.endProgress))/2)];
      ctx.fillStyle='#ffd34f'; ctx.font='600 13px ui-monospace,monospace';
      ctx.textAlign='center';
      ctx.fillText(s.seconds.toFixed(2)+'s', X(m[0]), Y(m[1])-13);
    }
  }

  // Corners, coloured by handedness; kinks shout in red.
  for (const c of report.corners.list) {
    const kink = c.type === 'kink';
    ctx.strokeStyle = kink ? '#ff4b3e' : (c.direction==='left' ? '#5fe0b0' : '#ff8ad4');
    ctx.lineWidth = kink ? 5 : 3.2;
    ctx.beginPath();
    let i = idxOf(c.startProgress);
    const end = idxOf(c.endProgress);
    let steps = 0;
    ctx.moveTo(X(plan[i][0]), Y(plan[i][1]));
    while (i !== end && steps < N) { i=(i+1)%N; steps++; ctx.lineTo(X(plan[i][0]), Y(plan[i][1])); }
    ctx.stroke();
    const midIndex = idxOf((c.startProgress + (c.endProgress<c.startProgress?c.endProgress+1:c.endProgress))/2);
    const mid = plan[midIndex];
    const [nx,nz] = norm(midIndex);
    // Push the label OUTWARD from the arc (a corner curves away from its own
    // outside), and stagger the distance so back-to-back corners — the two
    // kinks at the start/finish line especially — do not stack on each other.
    const away = c.direction === 'left' ? -1 : 1;
    const push = (kink ? 70 : 52) + (c.index % 2) * 22;
    // Clamp into the canvas — a label that runs off the edge is a lost reading.
    const lx = Math.min(W-56, Math.max(56, X(mid[0]+nx*push*away)));
    const ly = Math.min(H-34, Math.max(40, Y(mid[1]+nz*push*away)));
    ctx.fillStyle = kink ? '#ff4b3e' : '#cbd6ea';
    ctx.font = (kink?'600 ':'')+'11px ui-monospace,monospace';
    ctx.textAlign='center';
    if (kink) { // leader line, because a kink label lands well off its arc
      ctx.strokeStyle='#ff4b3e'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(X(mid[0]),Y(mid[1])); ctx.lineTo(lx,ly+4); ctx.stroke();
    }
    ctx.fillText('C'+c.index+' r'+Math.round(c.radiusUnits), lx, ly);
  }

  // Coin rows — the secondary collectible layer, drawn small on purpose.
  ctx.fillStyle='#c9a227';
  for (const row of report.coins.list) { ctx.beginPath(); ctx.arc(X(row.x),Y(row.z),2.6,0,7); ctx.fill(); }

  // Beats.
  for (const beat of report.beats.list) {
    const st = BEAT_STYLE[beat.kind] || {fill:'#fff',shape:'square',r:6};
    const px = X(beat.x), py = Y(beat.z);
    ctx.fillStyle = st.fill;
    ctx.strokeStyle = '#080a10'; ctx.lineWidth = 2;
    ctx.beginPath();
    if (st.shape==='square') ctx.rect(px-st.r/1.6,py-st.r/1.6,st.r*1.25,st.r*1.25);
    else if (st.shape==='triangle'){ctx.moveTo(px,py-st.r);ctx.lineTo(px+st.r,py+st.r*0.8);ctx.lineTo(px-st.r,py+st.r*0.8);ctx.closePath();}
    else if (st.shape==='diamond'){ctx.moveTo(px,py-st.r);ctx.lineTo(px+st.r,py);ctx.lineTo(px,py+st.r);ctx.lineTo(px-st.r,py);ctx.closePath();}
    else {ctx.moveTo(px-st.r,py-st.r*0.7);ctx.lineTo(px,py);ctx.lineTo(px-st.r,py+st.r*0.7);ctx.lineTo(px-st.r*0.4,py);ctx.closePath();
          ctx.moveTo(px+st.r*0.2,py-st.r*0.7);ctx.lineTo(px+st.r*1.2,py);ctx.lineTo(px+st.r*0.2,py+st.r*0.7);ctx.lineTo(px+st.r*0.8,py);ctx.closePath();}
    ctx.stroke(); ctx.fill();
  }

  // Start line + travel direction.
  const si = idxOf(report.startProgress);
  const [snx,snz] = norm(si);
  const sp = plan[si];
  ctx.strokeStyle='#ffffff'; ctx.lineWidth=3;
  ctx.beginPath();
  ctx.moveTo(X(sp[0]+snx*sp[2]*0.5), Y(sp[1]+snz*sp[2]*0.5));
  ctx.lineTo(X(sp[0]-snx*sp[2]*0.5), Y(sp[1]-snz*sp[2]*0.5));
  ctx.stroke();
  // Direction of travel: an arrowhead a few samples downstream of the line, so
  // a reader never has to guess which way the lap runs.
  const ahead = plan[(si+7)%N], tip = plan[(si+11)%N];
  ctx.fillStyle='#ffffff'; ctx.font='600 12px ui-monospace,monospace'; ctx.textAlign='left';
  ctx.fillText('START/FINISH', X(sp[0])+9, Y(sp[1])-11);
  const ax = X(tip[0]) - X(ahead[0]), ay = Y(tip[1]) - Y(ahead[1]);
  const al = Math.hypot(ax,ay)||1;
  const ux = ax/al, uy = ay/al;
  ctx.fillStyle='#ffffff';
  ctx.beginPath();
  ctx.moveTo(X(tip[0]), Y(tip[1]));
  ctx.lineTo(X(tip[0])-ux*11-uy*6, Y(tip[1])-uy*11+ux*6);
  ctx.lineTo(X(tip[0])-ux*11+uy*6, Y(tip[1])-uy*11-ux*6);
  ctx.closePath(); ctx.fill();

  // Scale bar + title block.
  const barUnits = 200, barPx = barUnits/upp;
  ctx.strokeStyle='#8894ab'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(16,H-20); ctx.lineTo(16+barPx,H-20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(16,H-25); ctx.lineTo(16,H-15); ctx.moveTo(16+barPx,H-25); ctx.lineTo(16+barPx,H-15); ctx.stroke();
  ctx.fillStyle='#8894ab'; ctx.font='11px ui-monospace,monospace'; ctx.textAlign='left';
  ctx.fillText(barUnits+' units  ('+(barUnits/report.meanSpeed).toFixed(2)+'s)', 16, H-28);
  if (o.title) { ctx.fillStyle='#e6ebf5'; ctx.font='600 15px ui-monospace,monospace'; ctx.fillText(o.title, 16, 26); }
  return upp;
}

function drawElevation(canvas, report) {
  const ctx = canvas.getContext('2d');
  const dpr=2, W=canvas.clientWidth, H=canvas.clientHeight;
  canvas.width=W*dpr; canvas.height=H*dpr; ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,W,H);
  const prof = report.elevation.profile;
  const peak = Math.max(1, report.elevation.peakHeight);
  ctx.strokeStyle='#1c2432'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,H-14); ctx.lineTo(W,H-14); ctx.stroke();
  ctx.beginPath();
  prof.forEach((h,i)=>{ const x=i/(prof.length-1)*W, y=(H-14)-(h/peak)*(H-30);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.lineTo(W,H-14); ctx.lineTo(0,H-14); ctx.closePath();
  ctx.fillStyle='rgba(255,184,90,0.18)'; ctx.fill();
  ctx.strokeStyle='#ffb85a'; ctx.lineWidth=2;
  ctx.beginPath();
  prof.forEach((h,i)=>{ const x=i/(prof.length-1)*W, y=(H-14)-(h/peak)*(H-30);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.stroke();
  ctx.fillStyle='#7d8aa3'; ctx.font='10px ui-monospace,monospace';
  ctx.textAlign='left'; ctx.fillText('0%',0,H-3);
  ctx.textAlign='right'; ctx.fillText('100% of lap',W,H-3);
  ctx.textAlign='left'; ctx.fillText('peak '+report.elevation.peakHeight+'u',0,11);
}
`;

const esc = (value) => String(value).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

const statBlock = (report) => {
  const s = report.straights;
  const heroClass = s.longestSeconds < 4 ? 'stat hero warn' : 'stat hero';
  return `
<div class="stats">
  <div class="stat"><div class="k">Lap length</div><div class="v">${report.lengthUnits}</div><div class="n">world units</div></div>
  <div class="stat"><div class="k">Lap time</div><div class="v">${report.lapSeconds}s</div><div class="n">at ${report.meanSpeed} u/s mean</div></div>
  <div class="stat"><div class="k">Race</div><div class="v">${report.raceSeconds}s</div><div class="n">${report.laps} laps</div></div>
  <div class="stat"><div class="k">Corners</div><div class="v">${report.corners.total}</div><div class="n">${report.corners.authored} authored + ${report.corners.kinks} kink${report.corners.kinks === 1 ? '' : 's'}</div></div>
  <div class="${heroClass}"><div class="k">Longest straight</div><div class="v">${s.longestSeconds}s</div><div class="n">${s.longestUnits} units — the only pass window</div></div>
  <div class="stat"><div class="k">Beats</div><div class="v">${report.beats.count}</div><div class="n">1 every ${report.beats.meanGapSeconds}s</div></div>
  <div class="stat"><div class="k">Radius range</div><div class="v">${report.corners.radiusRange[0]}–${report.corners.radiusRange[1]}</div><div class="n">units, authored corners</div></div>
  <div class="stat"><div class="k">Road width</div><div class="v">${report.road.minWidth}–${report.road.maxWidth}</div><div class="n">units, smoothed</div></div>
</div>`;
};

const cornerTable = (report) => `
<table>
<tr><th>#</th><th>p</th><th>dir</th><th>type</th><th class="num">arc°</th><th class="num">radius</th><th class="num">min r</th><th class="num">length</th><th class="num">sec</th><th class="num">lat</th></tr>
${report.corners.list
  .map(
    (c) => `<tr><td>C${c.index}</td><td>${c.startProgress.toFixed(2)}</td><td>${c.direction}</td>
<td><span class="tag t-${c.type}">${c.type}</span></td>
<td class="num">${c.angleDeg}</td><td class="num">${c.radiusUnits}</td><td class="num">${c.minRadiusUnits}</td>
<td class="num">${c.lengthUnits}</td><td class="num">${c.seconds}</td><td class="num">${c.lateralLoad}</td></tr>`
  )
  .join('')}
</table>`;

const straightTable = (report) => `
<table>
<tr><th>from</th><th>to</th><th class="num">units</th><th class="num">seconds</th><th>window</th></tr>
${report.straights.list
  .filter((s) => s.lengthUnits >= report.straights.minUnits)
  .sort((a, b) => b.lengthUnits - a.lengthUnits)
  .map(
    (s) => `<tr><td>C${s.afterCorner} exit</td><td>C${s.beforeCorner} entry</td>
<td class="num">${s.lengthUnits}</td><td class="num">${s.seconds}</td>
<td><div class="gapbar"><i style="width:${Math.min(100, (s.seconds / 10) * 100)}%"></i></div></td></tr>`
  )
  .join('')}
</table>
<div class="note">Bar is scaled against a 10 s reference — an MK8-scale overtaking straight would fill it.</div>`;

const beatTable = (report) => `
<table>
<tr><th>p</th><th>kind</th><th>label</th><th class="num">lane</th><th class="num">gap→next</th><th></th></tr>
${report.beats.list
  .map(
    (b) => `<tr><td>${b.progress.toFixed(3)}</td><td>${esc(b.kind)}</td><td>${esc(b.label)}</td>
<td class="num">${b.side}</td><td class="num">${b.gapToNextSeconds}s</td>
<td><div class="gapbar"><i style="width:${Math.min(100, (b.gapToNextSeconds / 3) * 100)}%"></i></div></td></tr>`
  )
  .join('')}
</table>
<div class="note">Bar is scaled against a 3 s reference. Coins (${report.coins.rows} rows × ${report.coins.coinsPerRow}) are a continuous
collectible layer, not beats, and are excluded from the density figure — they appear as small gold dots on the plan.</div>`;

const validationBlock = (report) => {
  if (!report.validation) {
    return `<div class="flag ok">No shipped telemetry for this track, so lap time is a pure geometric solve:
      length ÷ mean speed. Treat it as ±3% until a race is measured.</div>`;
  }
  const v = report.validation;
  const cls = v.pass ? 'flag ok' : 'flag';
  return `<div class="${cls}">
    <b>${v.pass ? 'VALIDATED' : 'FAILS GROUND TRUTH'}</b> — length ${report.lengthUnits} vs ${v.groundTruth.lengthUnits} (${v.lengthDeltaPct}%),
    lap ${report.lapSeconds}s vs ${v.groundTruth.lapSeconds}s (${v.lapDeltaPct}%),
    race ${report.raceSeconds}s vs measured autoplay ${v.telemetry?.raceSeconds ?? '—'}s (${v.vsTelemetryPct ?? '—'}%).
    The measured race is the slower of the two because the grid start burns ~2 s accelerating from a standstill.
  </div>`;
};

const kinkBlock = (report) => {
  const kinks = report.corners.list.filter((c) => c.type === 'kink');
  if (!kinks.length) return '';
  return `<div class="flag"><b>GEOMETRY WARNING — ${kinks.length} kink${kinks.length === 1 ? '' : 's'}.</b>
    ${kinks
      .map((k) => `radius ${k.radiusUnits}u (min ${k.minRadiusUnits}u) at p${k.startProgress.toFixed(3)}`)
      .join('; ')}.
    The tightest radius either shipped track AUTHORS is 72, so anything under ${KINK_RADIUS} is not design — it is the
    CatmullRom reacting to centerline points that sit too close together. Check the authored centerline for a short
    segment at that progress.</div>`;
};

const legend = `
<div class="legend">
  <span><i class="sw" style="background:#5fe0b0"></i>left corner</span>
  <span><i class="sw" style="background:#ff8ad4"></i>right corner</span>
  <span><i class="sw" style="background:#ff4b3e"></i>kink (unauthored)</span>
  <span><i class="sw" style="background:#ffd34f"></i>longest straight</span>
  <span><i class="sw" style="background:#3f5f8a"></i>straight &gt;60u</span>
  <span><i class="sw" style="background:#36e2ff"></i>item box</span>
  <span><i class="sw" style="background:#ff5bd0"></i>boost pad</span>
  <span><i class="sw" style="background:#ffa63d"></i>ramp</span>
  <span><i class="sw" style="background:#b06bff"></i>shortcut launch</span>
  <span><i class="sw" style="background:#ffd34f"></i>crest</span>
  <span><i class="sw" style="background:#c9a227"></i>coin row</span>
</div>`;

const singleSheetHtml = (report) => `<!doctype html><meta charset="utf-8"><style>${SHEET_CSS}</style>
<body>
<h1>${esc(report.name)} <small>${esc(report.key)} · ${esc(report.tagline)}</small></h1>
<p class="sub">Plan view from the SHIPPED centerline — same CatmullRom (tension 0.38), same elevation band and same
width table the race drives. Generated ${esc(report.generatedAt)} by ${esc(report.tool)}.</p>
${statBlock(report)}
<div class="cols">
  <div class="panel" style="flex:0 0 auto">
    <canvas id="plan" style="width:900px;height:820px"></canvas>
    ${legend}
    <h2 style="margin-top:16px">Elevation</h2>
    <canvas id="elev" style="width:900px;height:120px"></canvas>
    <div class="note">${
      report.elevation.carries
        ? `Bridge band p${report.elevation.band.from}–${report.elevation.band.to}, peak ${report.elevation.peakHeight}u over
           ${report.elevation.bandLengthUnits}u (${report.elevation.bandSeconds}s), steepest gradient ~${report.elevation.maxGradientPct}%.
           ${report.elevation.crestLaunch ? 'The crest is a FREE ballistic launch.' : 'No forced crest jump.'}`
        : 'This track is flat — no elevation beat.'
    }</div>
  </div>
  <div class="stack" style="flex:1 1 auto; min-width:0">
    <div class="panel"><h2>Corners — ${report.corners.total} (${report.corners.byDirection.left}L / ${report.corners.byDirection.right}R · ${report.corners.byType.sweeper} sweeper, ${report.corners.byType.hairpin} hairpin, ${report.corners.byType.turn} turn, ${report.corners.byType.kink} kink)</h2>
      ${cornerTable(report)}
      <div class="note">radius = arc length ÷ swept angle (what the driver feels); min r = tightest instant.
      lat = v²/r at mean speed — an index for comparing corners on this sheet, not a g figure.
      ${report.corners.chicanes.length ? `Chicanes: ${report.corners.chicanes.map((c) => `C${c.corners[0]}–C${c.corners[1]} (${c.gapUnits}u apart)`).join(', ')}.` : 'No chicanes: no two opposite-handed corners are within 60u of each other.'}</div>
    </div>
    <div class="panel"><h2>Straights over ${report.straights.minUnits}u — ${report.straights.countOverMin}</h2>${straightTable(report)}</div>
    <div class="panel"><h2>Beat map — ${report.beats.count} beats, 1 every ${report.beats.meanGapSeconds}s (min ${report.beats.minGapSeconds}s / max ${report.beats.maxGapSeconds}s)</h2>${beatTable(report)}</div>
    <div class="panel"><h2>Validation</h2>${validationBlock(report)}${kinkBlock(report)}</div>
  </div>
</div>
<script>const REPORT = ${JSON.stringify(report)};
${DRAW_SCRIPT}
drawPlan(document.getElementById('plan'), REPORT, {});
drawElevation(document.getElementById('elev'), REPORT);
</script>
</body>`;

const compareRow = (label, a, b, fmt = (v) => v) => {
  const delta = typeof a === 'number' && typeof b === 'number' ? round(b - a, 2) : '';
  return `<tr><td>${esc(label)}</td><td class="num">${fmt(a)}</td><td class="num">${fmt(b)}</td><td class="num">${delta === '' ? '' : (delta > 0 ? '+' : '') + delta}</td></tr>`;
};

const compareSheetHtml = (a, b) => `<!doctype html><meta charset="utf-8"><style>${SHEET_CSS}</style>
<body>
<h1>${esc(a.name)} vs ${esc(b.name)} <small>same scale, same units per pixel</small></h1>
<p class="sub">Both plans are drawn at one shared world-units-per-pixel, so relative size is real. Generated ${esc(a.generatedAt)}.</p>
<div class="pair">
  <div class="panel"><canvas id="planA" style="width:760px;height:700px"></canvas></div>
  <div class="panel"><canvas id="planB" style="width:760px;height:700px"></canvas></div>
</div>
${legend}
<div class="panel" style="margin-top:18px">
  <h2>Numbers</h2>
  <table>
    <tr><th>metric</th><th class="num">${esc(a.key)}</th><th class="num">${esc(b.key)}</th><th class="num">Δ</th></tr>
    ${compareRow('lap length (units)', a.lengthUnits, b.lengthUnits)}
    ${compareRow('lap time (s)', a.lapSeconds, b.lapSeconds)}
    ${compareRow('race time (s)', a.raceSeconds, b.raceSeconds)}
    ${compareRow('mean speed (u/s)', a.meanSpeed, b.meanSpeed)}
    ${compareRow('corners (total)', a.corners.total, b.corners.total)}
    ${compareRow('corners (authored)', a.corners.authored, b.corners.authored)}
    ${compareRow('kinks', a.corners.kinks, b.corners.kinks)}
    ${compareRow('tightest authored radius', a.corners.radiusRange[0], b.corners.radiusRange[0])}
    ${compareRow('widest authored radius', a.corners.radiusRange[1], b.corners.radiusRange[1])}
    ${compareRow('straights over 60u', a.straights.countOverMin, b.straights.countOverMin)}
    ${compareRow('longest straight (units)', a.straights.longestUnits, b.straights.longestUnits)}
    ${compareRow('longest straight (s)', a.straights.longestSeconds, b.straights.longestSeconds)}
    ${compareRow('beats', a.beats.count, b.beats.count)}
    ${compareRow('mean beat gap (s)', a.beats.meanGapSeconds, b.beats.meanGapSeconds)}
    ${compareRow('coin rows', a.coins.rows, b.coins.rows)}
    ${compareRow('elevation peak (units)', a.elevation.peakHeight, b.elevation.peakHeight)}
    ${compareRow('road width min', a.road.minWidth, b.road.minWidth)}
    ${compareRow('road width max', a.road.maxWidth, b.road.maxWidth)}
  </table>
</div>
<script>const A = ${JSON.stringify(a)}, B = ${JSON.stringify(b)};
${DRAW_SCRIPT}
// One shared scale for both canvases: take the larger of the two required
// units-per-pixel figures and force it on both.
const bA = planBounds(A), bB = planBounds(B);
const cA = document.getElementById('planA'), cB = document.getElementById('planB');
const need = (bounds, c) => Math.max((bounds.maxX-bounds.minX)/(c.clientWidth-92), (bounds.maxZ-bounds.minZ)/(c.clientHeight-92));
const upp = Math.max(need(bA,cA), need(bB,cB));
drawPlan(cA, A, { unitsPerPx: upp, title: A.name+'  —  '+A.lengthUnits+'u / '+A.lapSeconds+'s' });
drawPlan(cB, B, { unitsPerPx: upp, title: B.name+'  —  '+B.lengthUnits+'u / '+B.lapSeconds+'s' });
</script>
</body>`;

const renderSheet = async (html, outPath, viewport) => {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    // A drawing error inside the page would otherwise ship a sheet with blank
    // canvases and no indication anything went wrong — the exact failure mode
    // this tool exists to prevent.
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(message.text());
    });
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForTimeout(220);
    if (pageErrors.length) throw new Error(`plan view failed to draw:\n  ${pageErrors.join('\n  ')}`);
    await page.screenshot({ path: outPath, fullPage: true });
  } finally {
    await browser.close();
  }
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

// A draft layout does not have to be registered in tracks/index.js to be
// looked at — that is the whole point. --file loads any module that exports a
// track definition (centerline/ribbons/pads is enough; palette and visuals are
// never read here).
const loadTrackFromFile = async (path) => {
  const module = await import(`file://${resolve(process.cwd(), path)}`);
  const isTrackDef = (value) => value && typeof value === 'object' && value.course && value.course.centerline;
  if (module.default && isTrackDef(module.default)) return module.default;
  const named = Object.values(module).find(isTrackDef);
  if (!named) throw new Error(`${path} exports no track definition (needs .course.centerline)`);
  return named;
};

const parseArgs = (argv) => {
  const args = { track: null, file: null, compare: null, out: OUT_DIR, speed: null, jsonOnly: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--track') args.track = argv[++index];
    else if (arg === '--file') args.file = argv[++index];
    else if (arg === '--compare') args.compare = argv[++index];
    else if (arg === '--out') args.out = resolve(process.cwd(), argv[++index]);
    else if (arg === '--speed') args.speed = Number(argv[++index]);
    else if (arg === '--json-only') args.jsonOnly = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
  }
  return args;
};

const USAGE = `track-layout-preview — plan view + layout numbers for the shipped kart tracks

  --track <key>            one track (${KART_TRACKS.map((t) => t.key).join(' | ')}); default: all
  --file <path.js>         preview an UNREGISTERED draft definition (a module
                           exporting anything with .course.centerline)
  --compare <keyA,keyB>    side-by-side sheet at one shared scale
  --out <dir>              output directory (default tmp/track-preview)
  --speed <units/s>        override the mean speed used to convert units to seconds
  --json-only              skip the browser, write JSON only
`;

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(USAGE);
    return;
  }
  mkdirSync(args.out, { recursive: true });

  const keys = args.file
    ? [null]
    : args.compare
      ? args.compare.split(',').map((key) => key.trim())
      : args.track
        ? [args.track]
        : KART_TRACKS.map((track) => track.key);

  const reports = [];
  for (const requested of keys) {
    const trackDef = args.file ? await loadTrackFromFile(args.file) : trackByKey(requested);
    if (!args.file && trackDef.key !== requested) {
      process.stderr.write(`unknown track "${requested}" — known: ${KART_TRACKS.map((t) => t.key).join(', ')}\n`);
      process.exitCode = 1;
      return;
    }
    const key = trackDef.key;
    const report = analyseTrack(trackDef, { meanSpeedOverride: args.speed });
    reports.push(report);
    const jsonPath = resolve(args.out, `${key}-layout.json`);
    writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

    process.stdout.write(
      [
        ``,
        `${report.name} (${report.key})`,
        `  length          ${report.lengthUnits} units`,
        `  lap / race      ${report.lapSeconds}s / ${report.raceSeconds}s at ${report.meanSpeed} u/s over ${report.laps} laps`,
        `  corners         ${report.corners.total} (${report.corners.authored} authored, ${report.corners.kinks} kink) radii ${report.corners.radiusRange[0]}-${report.corners.radiusRange[1]}`,
        `  straights >60u  ${report.straights.countOverMin}, longest ${report.straights.longestUnits}u = ${report.straights.longestSeconds}s  <-- the pass window`,
        `  beats           ${report.beats.count}, one every ${report.beats.meanGapSeconds}s (${report.coins.rows} coin rows on top)`,
        `  elevation       ${report.elevation.carries ? `peak ${report.elevation.peakHeight}u over ${report.elevation.bandSeconds}s, ~${report.elevation.maxGradientPct}% max gradient` : 'flat'}`,
        `  json            ${jsonPath}`,
      ].join('\n') + '\n'
    );

    if (report.validation) {
      const v = report.validation;
      process.stdout.write(
        `  validation      length ${v.lengthDeltaPct}% / lap ${v.lapDeltaPct}% vs ground truth; ` +
          `race ${v.vsTelemetryPct ?? '?'}% vs measured autoplay ${v.telemetry?.raceSeconds ?? '?'}s -> ${v.pass ? 'PASS' : 'FAIL'}\n`
      );
      if (!v.pass) {
        process.stderr.write(
          `\nFAIL: the tool disagrees with shipped ground truth. The maths is wrong; do not trust any layout it reports.\n`
        );
        process.exitCode = 1;
      }
    }
    const kinks = report.corners.list.filter((corner) => corner.type === 'kink');
    if (kinks.length) {
      process.stdout.write(
        `  WARNING         ${kinks.length} kink(s) tighter than any authored radius: ` +
          `${kinks.map((k) => `r${k.radiusUnits} at p${k.startProgress.toFixed(3)}`).join(', ')}\n`
      );
    }
  }

  if (args.jsonOnly) return;

  if (args.compare) {
    if (reports.length !== 2) {
      process.stderr.write('--compare needs exactly two track keys\n');
      process.exitCode = 1;
      return;
    }
    const outPath = resolve(args.out, `compare-${reports[0].key}-vs-${reports[1].key}.png`);
    await renderSheet(compareSheetHtml(reports[0], reports[1]), outPath, { width: 1640, height: 1500 });
    writeFileSync(
      resolve(args.out, `compare-${reports[0].key}-vs-${reports[1].key}.json`),
      `${JSON.stringify({ generatedAt: reports[0].generatedAt, tracks: reports.map((r) => r.key), reports }, null, 2)}\n`
    );
    process.stdout.write(`\nwrote ${outPath}\n`);
    return;
  }

  for (const report of reports) {
    const outPath = resolve(args.out, `${report.key}-plan.png`);
    await renderSheet(singleSheetHtml(report), outPath, { width: 1740, height: 1400 });
    process.stdout.write(`wrote ${outPath}\n`);
  }
};

await main();
