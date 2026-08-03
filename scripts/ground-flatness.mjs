// Ground flatness — how much of the OFF-ROAD ground reads as a flat, untextured
// expanse, measured from captured frames.
//
// WHY THIS EXISTS. The critics' "environment" and "materials" axes have both sat
// under 8 for nine waves, and the recurring complaint is large flat ground with
// nothing on it ("empty grey aprons flank the road", wave 8). Scoring that needs
// three critics and an hour; this is a proxy that runs in seconds, so a ground
// change can be iterated on without spending a wave to find out it did nothing.
//
// WHAT THIS REPLACES, AND WHY IT HAD TO BE REBUILT. An earlier uncommitted
// script produced "62.3% of the off-road band is flat", and that number was used
// to justify the largest remaining work item. A 12-agent audit found three
// faults, all of which this script fixes:
//
//   1. THE BAND WAS NOT OFF-ROAD. It excluded a fixed vertical slab,
//      x in [35%, 65%]. The road is a perspective trapezoid, so a rectangle
//      cannot exclude it: 68% of what was counted as "off-road ground" on
//      Comeback City was road surface. Fixed here by masking the road
//      PER SCANLINE, projected from the shipped curve — see roadMaskFor().
//   2. THE THRESHOLD WAS FREE. "sigma < 2.0" sat on a unimodal distribution
//      with no valley anywhere near it, and the same frames read 45.6% or 83.4%
//      under equally arbitrary radii. Fixed by not thresholding at all — this
//      reports the sigma DISTRIBUTION (median and quartiles). A median needs no
//      cut-off to defend, and it moves monotonically with the thing being
//      measured. Threshold-based fractions are still printed, at three
//      thresholds rather than one, purely for continuity with old numbers.
//   3. TWO CAPTURE SETS WERE SPLICED. The Penguin Village line took a
//      percentage from one capture directory and a mark count from another.
//      Fixed structurally: this reads exactly one directory per run and prints
//      which one.
//
// WHAT SURVIVED THE AUDIT: off-road ground really is flatter than the road
// corridor — but only on one track, and by much less than the old numbers said.
// Measured on wave8-r3 with a correct mask:
//
//   comeback-city    off-road median sigma 1.15  vs road 2.94   (2.6x flatter)
//   penguin-village  off-road median sigma 2.56  vs road 3.48   (1.4x flatter)
//
// So the work localises to COMEBACK CITY's off-road ground, not to "the ground"
// in general. Note also how badly the retired threshold statistic compressed
// this: at sigma<2.0 the same frames read 58.9% vs 47.1% and 45.5% vs 43.3%,
// turning a 2.6x gap into 1.25x and a 1.4x gap into nothing. A cut-off placed
// on a unimodal distribution throws away most of the signal it is measuring.
//
// The r = -0.71 correlation with the critics' environment score does NOT carry
// over, and cannot be recovered from the archive — see `--validate`.
//
//   node scripts/ground-flatness.mjs --dir tmp/aaa-visual/w9-after
//   node scripts/ground-flatness.mjs --dir tmp/aaa-visual/baseline --overlay
//   node scripts/ground-flatness.mjs --validate
//
// The road mask comes from scripts/track-layout-preview.mjs — imported, not
// copied. That file's sampler was itself a copy of the monolith's that went
// unchecked and drifted for two waves; a second copy of the camera model would
// drift the same way, so this imports the real one and inherits its mirror
// check against the monolith.
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { makeSampler, cameraPoseAt, projectToNdc, mirrorCheck, CAMERA_TIERS } from './track-layout-preview.mjs';
import { trackByKey } from '../src/game/race/tracks/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1] !== undefined) return argv[index + 1];
  return fallback;
};
const flag = (name) => argv.includes(`--${name}`);

// The band the old statistic measured, kept so new numbers can be compared with
// old ones. It is the middle-distance ground: below it is the kart and the
// immediate road, above it is the horizon and the skyline.
const BAND_TOP = 0.46;
const BAND_BOTTOM = 0.72;

// The 5-tap cross the old statistic used, kept for the same reason. Radius 4 at
// 1600x900: small enough to sit inside one surface, large enough to straddle a
// texel of any texture actually shipped.
const TAP_RADIUS = 4;

// Continuity thresholds only. The headline statistic is the median, which has
// no threshold. Three rather than one, because reporting a single cut-off is
// what let the last one look load-bearing when it was arbitrary.
const LEGACY_THRESHOLDS = [1.5, 2.0, 3.0];

// The road edge in lane units, where lane 1 is the drivable edge. 1.15 pushes
// the mask just past the kerb so a rumble strip is never counted as flat
// off-road ground — the kerb is the highest-variance thing in the frame and
// would bias the result the wrong way, making the ground look BETTER than it is.
const ROAD_EDGE_LANE = 1.15;

// Project the WHOLE lap, not just the road ahead.
//
// The first version walked 0.12 of a lap forward, which covers everything past
// the far plane in front of the kart — and was still wrong. Looking at the
// overlay showed a second ribbon of road entering frame from the left on
// Penguin Village p0.45: a different part of the same lap, tinted green as
// "off-road ground". That is the ORIGINAL fault of this metric in a subtler
// form, so the mask now covers every road segment the camera can see, wherever
// it is in the lap. Segments behind the eye project to null and cost nothing.
//
// ~2.9 units per step at an 11.6k lap, which is finer than the arc-length
// table the curve itself is sampled on.
const PROJECT_STEPS = 4000;

const rec709 = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// ---------------------------------------------------------------------------
// ROAD MASK — the fix for fault 1.
//
// Walks the shipped curve from the frame's own routeProgress, projects the left
// and right road edges through the same camera model the previewer validates,
// and returns a per-pixel boolean mask of the road corridor. A fixed rectangle
// cannot do this because the corridor is a trapezoid that also SLIDES sideways
// through a corner — and because more than one piece of it can be in frame.
// ---------------------------------------------------------------------------
// Each step of the walk contributes a QUAD — the road surface between two
// consecutive cross-sections — which is rasterised into a boolean mask.
//
// The first version stored one [left, right] span per scanline and interpolated
// between the rows the projection happened to land on. That works only while
// exactly one ribbon of road is visible. Once the whole lap is projected, a
// single scanline can receive several disjoint segments, min/max spans the gap
// between them, and the row interpolation bridges rows belonging to different
// segments — the overlay came out in red and green stripes. Filling polygons
// has no such assumption and needs no interpolation at all.
const roadMaskFor = (sampler, progress, tier, width, height) => {
  const pose = cameraPoseAt(sampler, progress, tier);
  const mask = new Uint8Array(width * height);
  // NDC y is +1 at the top of the frame; screen y counts down from 0.
  const toScreen = (ndc) => ({ x: ((ndc.x + 1) / 2) * width, y: ((1 - ndc.y) / 2) * height });

  const project = (p) => {
    const ndcL = projectToNdc(pose, sampler.pointAt(p, -ROAD_EDGE_LANE));
    const ndcR = projectToNdc(pose, sampler.pointAt(p, ROAD_EDGE_LANE));
    // A null means that edge is behind the lens. Dropping the whole
    // cross-section is right: half a cross-section cannot bound a quad.
    return ndcL && ndcR ? [toScreen(ndcL), toScreen(ndcR)] : null;
  };

  // Scanline-fill one convex quad given as four screen-space corners in order.
  const fillQuad = (corners) => {
    let yMin = Infinity;
    let yMax = -Infinity;
    for (const c of corners) {
      if (c.y < yMin) yMin = c.y;
      if (c.y > yMax) yMax = c.y;
    }
    const y0 = Math.max(0, Math.ceil(yMin));
    const y1 = Math.min(height - 1, Math.floor(yMax));
    for (let y = y0; y <= y1; y += 1) {
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = 0; i < 4; i += 1) {
        const a = corners[i];
        const b = corners[(i + 1) % 4];
        if (a.y === b.y) continue;
        const t = (y + 0.5 - a.y) / (b.y - a.y);
        if (t < 0 || t > 1) continue;
        const x = a.x + (b.x - a.x) * t;
        if (x < lo) lo = x;
        if (x > hi) hi = x;
      }
      if (lo > hi) continue;
      const x0 = Math.max(0, Math.floor(lo));
      const x1 = Math.min(width - 1, Math.ceil(hi));
      const row = y * width;
      for (let x = x0; x <= x1; x += 1) mask[row + x] = 1;
    }
  };

  let previous = project(progress);
  let quads = 0;
  for (let step = 1; step <= PROJECT_STEPS; step += 1) {
    const current = project(progress + step / PROJECT_STEPS);
    if (previous && current) {
      fillQuad([previous[0], previous[1], current[1], current[0]]);
      quads += 1;
    }
    previous = current;
  }

  // Close 1-2px horizontal seams. Consecutive quads meet exactly on an edge, so
  // a scanline whose centre falls in the join can be missed by both — the
  // overlay showed thin green lines lying across the middle of the road. Those
  // are road pixels counted as off-road ground, which biases the ground to look
  // BETTER textured than it is, so the leak runs the wrong way. Only gaps with
  // road directly above AND below are filled, so this cannot invent a corridor
  // where there is none.
  for (let x = 0; x < width; x += 1) {
    for (let y = 1; y < height - 2; y += 1) {
      if (mask[y * width + x]) continue;
      if (!mask[(y - 1) * width + x]) continue;
      if (mask[(y + 1) * width + x]) mask[y * width + x] = 1;
      else if (mask[(y + 2) * width + x]) {
        mask[y * width + x] = 1;
        mask[(y + 1) * width + x] = 1;
      }
    }
  }
  return { mask, quads };
};

// ---------------------------------------------------------------------------
// The statistic. Returns the sigma distribution for off-road ground and, for
// comparison, the same for the road corridor — the audit's surviving finding is
// that the two differ, and a run that does not reproduce that difference is
// measuring something other than what it thinks.
// ---------------------------------------------------------------------------
const quantiles = (sorted, qs) =>
  qs.map((q) => {
    if (!sorted.length) return null;
    const index = (sorted.length - 1) * q;
    const lo = Math.floor(index);
    const hi = Math.ceil(index);
    return Number((sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo)).toFixed(3));
  });

const measureFrame = (png, mask) => {
  const { width: W, height: H, data } = png;
  const lum = new Float32Array(W * H);
  for (let i = 0, p = 0; i < W * H; i += 1, p += 4) lum[i] = rec709(data[p], data[p + 1], data[p + 2]);

  const y0 = Math.round(BAND_TOP * H);
  const y1 = Math.round(BAND_BOTTOM * H);
  const offRoad = [];
  const onRoad = [];

  for (let y = y0; y < y1; y += 1) {
    if (y - TAP_RADIUS < 0 || y + TAP_RADIUS >= H) continue;
    for (let x = TAP_RADIUS; x < W - TAP_RADIUS; x += 1) {
      const taps = [
        lum[y * W + x],
        lum[y * W + x - TAP_RADIUS],
        lum[y * W + x + TAP_RADIUS],
        lum[(y - TAP_RADIUS) * W + x],
        lum[(y + TAP_RADIUS) * W + x],
      ];
      const m = (taps[0] + taps[1] + taps[2] + taps[3] + taps[4]) / 5;
      let s = 0;
      for (const v of taps) s += (v - m) * (v - m);
      const sigma = Math.sqrt(s / 4);
      const isRoad = mask.mask[y * W + x] === 1;
      (isRoad ? onRoad : offRoad).push(sigma);
    }
  }

  const summarize = (values) => {
    const sorted = Float64Array.from(values).sort();
    const [q1, median, q3] = quantiles(sorted, [0.25, 0.5, 0.75]);
    const fractions = {};
    for (const t of LEGACY_THRESHOLDS) {
      let count = 0;
      for (const v of values) if (v < t) count += 1;
      fractions[`under${t}`] = values.length ? Number(((count / values.length) * 100).toFixed(1)) : null;
    }
    return { pixels: values.length, q1, median, q3, fractions };
  };

  return { offRoad: summarize(offRoad), onRoad: summarize(onRoad) };
};

// Frames are named <track>-p0_45.png by scripts/aaa-visual-capture.mjs.
const parseFrame = (file) => {
  const match = file.match(/^(.*)-p(\d+)_(\d+)\.png$/);
  if (!match) return null;
  return { track: match[1], progress: Number(`${match[2]}.${match[3]}`) };
};

// Paint the mask onto the frame so it can be LOOKED AT. Not optional polish:
// the statistic this replaces was wrong for two waves precisely because nobody
// checked that its "off-road" region was off the road. Green = counted as
// off-road ground, red = masked out as road corridor, untinted = outside the
// measured band.
const writeOverlay = (png, mask, outFile) => {
  const { width: W, height: H, data } = png;
  const out = new PNG({ width: W, height: H });
  data.copy(out.data);
  const y0 = Math.round(BAND_TOP * H);
  const y1 = Math.round(BAND_BOTTOM * H);
  for (let y = y0; y < y1; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const p = (y * W + x) * 4;
      const isRoad = mask.mask[y * W + x] === 1;
      if (isRoad) {
        out.data[p] = Math.min(255, out.data[p] + 90);
        out.data[p + 2] = Math.max(0, out.data[p + 2] - 40);
      } else {
        out.data[p + 1] = Math.min(255, out.data[p + 1] + 70);
      }
    }
  }
  writeFileSync(outFile, PNG.sync.write(out));
};

const measureDir = (dir, { tier = 'desktop', overlayDir = null } = {}) => {
  // cameraPoseAt takes the tier OBJECT, not its key — passing the string makes
  // tier.boom undefined, which becomes NaN progress and dies deep inside three
  // with "cannot read properties of undefined".
  const tierDef = CAMERA_TIERS[tier];
  if (!tierDef) throw new Error(`unknown camera tier ${tier}; have ${Object.keys(CAMERA_TIERS).join(', ')}`);
  const files = readdirSync(dir).filter((f) => f.endsWith('.png') && parseFrame(f));
  const samplers = new Map();
  const frames = [];
  for (const file of files.sort()) {
    const meta = parseFrame(file);
    const trackDef = trackByKey(meta.track);
    if (!trackDef) continue;
    if (!samplers.has(meta.track)) samplers.set(meta.track, makeSampler(trackDef));
    const png = PNG.sync.read(readFileSync(path.join(dir, file)));
    const mask = roadMaskFor(samplers.get(meta.track), meta.progress, tierDef, png.width, png.height);
    const stats = measureFrame(png, mask);
    if (overlayDir) writeOverlay(png, mask, path.join(overlayDir, file.replace('.png', '-mask.png')));
    frames.push({ file, ...meta, roadQuads: mask.quads, ...stats });
  }
  return frames;
};

const aggregate = (frames) => {
  const byTrack = {};
  for (const frame of frames) {
    byTrack[frame.track] ??= [];
    byTrack[frame.track].push(frame);
  }
  const out = {};
  for (const [track, list] of Object.entries(byTrack)) {
    const medians = list.map((f) => f.offRoad.median).filter((v) => v !== null);
    const roadMedians = list.map((f) => f.onRoad.median).filter((v) => v !== null);
    const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    out[track] = {
      frames: list.length,
      offRoadMedianSigma: Number((mean(medians) ?? 0).toFixed(3)),
      roadMedianSigma: Number((mean(roadMedians) ?? 0).toFixed(3)),
      offRoadUnder2Pct: Number((mean(list.map((f) => f.offRoad.fractions.under2)) ?? 0).toFixed(1)),
      roadUnder2Pct: Number((mean(list.map((f) => f.onRoad.fractions.under2)) ?? 0).toFixed(1)),
      offRoadPixels: list.reduce((a, f) => a + f.offRoad.pixels, 0),
      roadPixels: list.reduce((a, f) => a + f.onRoad.pixels, 0),
    };
  }
  return out;
};

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
const mirror = mirrorCheck();
if (!mirror.pass) {
  process.stderr.write(
    'FAIL: the previewer\'s sampler no longer mirrors the monolith, so the road mask\n' +
      'this script projects does not describe the shipped road. Fix that first —\n' +
      'run scripts/track-layout-preview.mjs to see which constant drifted.\n'
  );
  process.exit(1);
}

if (flag('validate')) {
  // THE CORRELATION CANNOT BE INHERITED, AND CANNOT BE RECOVERED FROM HISTORY.
  //
  // The r = -0.71 the plan quotes was measured on the retired statistic, so it
  // does not transfer to this one. The obvious repair — recompute this
  // statistic across the archived waves and correlate that — does not work
  // either, and the reason is structural rather than fixable: the road mask is
  // PROJECTED from the shipped curve, so it is only valid for frames captured
  // on the layout that curve describes. Waves 1-7 were shot on the pre-wave-8
  // tracks, which were ~2.9k units against today's ~11.6k. Masking those frames
  // with today's geometry would draw the corridor somewhere the road is not,
  // which is the exact failure this script exists to fix.
  //
  // So only wave 8 onward can be scored at all, and one or two waves cannot
  // carry a correlation. This is reported rather than papered over: until
  // several more waves land, treat the statistic as a RELATIVE measure between
  // two builds of the same layout — which is how a ground change will actually
  // use it — and not as a calibrated predictor of the environment score.
  process.stdout.write(
    '\nvalidation — waves scoreable against the CURRENT layout only\n' +
      '(pre-wave-8 captures are a different track; projecting today\'s road mask\n' +
      ' onto them would mask where the road is not)\n\n'
  );
  const criticDir = path.join(root, 'tmp', 'aaa-plan');
  const visualDir = path.join(root, 'tmp', 'aaa-visual');
  const rows = [];
  for (let wave = 8; wave <= 9; wave += 1) {
    const criticPath = path.join(criticDir, `wave${wave}-r3-critics.json`);
    const capturePath = path.join(visualDir, `wave${wave}-r3`);
    if (!existsSync(criticPath) || !existsSync(capturePath)) continue;
    const critics = JSON.parse(readFileSync(criticPath, 'utf8'));
    const scores = (Array.isArray(critics) ? critics : [])
      .map((c) => c?.scores?.environment)
      .filter((v) => typeof v === 'number');
    if (!scores.length) continue;
    const frames = measureDir(capturePath);
    if (!frames.length) continue;
    const agg = aggregate(frames);
    const allMedians = Object.values(agg).map((a) => a.offRoadMedianSigma);
    rows.push({
      wave,
      environment: Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)),
      offRoadMedianSigma: Number((allMedians.reduce((a, b) => a + b, 0) / allMedians.length).toFixed(3)),
      frames: frames.length,
    });
    process.stdout.write(
      `  wave ${wave}: environment ${rows.at(-1).environment}, off-road median sigma ${rows.at(-1).offRoadMedianSigma} (${frames.length} frames)\n`
    );
  }
  if (rows.length >= 3) {
    const xs = rows.map((r) => r.offRoadMedianSigma);
    const ys = rows.map((r) => r.environment);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    let num = 0;
    let dx = 0;
    let dy = 0;
    for (let i = 0; i < xs.length; i += 1) {
      num += (xs[i] - mx) * (ys[i] - my);
      dx += (xs[i] - mx) ** 2;
      dy += (ys[i] - my) ** 2;
    }
    const r = num / Math.sqrt(dx * dy);
    process.stdout.write(
      `\n  r = ${r.toFixed(3)} between off-road median sigma and the critics' environment score, over ${rows.length} waves.\n` +
        `  Sign should be POSITIVE here: higher sigma = more texture = better environment.\n` +
        `  (The old statistic was a FLATNESS fraction, so its correlation was negative.)\n`
    );
    writeFileSync(
      path.join(root, 'tmp', 'ground-flatness-validation.json'),
      `${JSON.stringify({ rows, r: Number(r.toFixed(4)) }, null, 2)}\n`
    );
  } else {
    process.stdout.write(
      `\n  ${rows.length} scoreable wave(s) on disk — not enough for a correlation.\n` +
        '  Use this as a relative measure between two builds of the same layout.\n' +
        '  Re-run once several waves have landed on the 4x tracks.\n'
    );
  }
  process.exit(0);
}

const DIR = arg('dir');
if (!DIR) {
  process.stderr.write('usage: node scripts/ground-flatness.mjs --dir <capture dir> [--validate]\n');
  process.exit(1);
}
const dir = path.resolve(root, DIR);
if (!existsSync(dir)) {
  process.stderr.write(`no such capture directory: ${dir}\n`);
  process.exit(1);
}

let overlayDir = null;
if (flag('overlay')) {
  overlayDir = path.join(root, 'tmp', 'ground-flatness', `${path.basename(dir)}-overlay`);
  mkdirSync(overlayDir, { recursive: true });
}
const frames = measureDir(dir, { overlayDir });
if (!frames.length) {
  process.stderr.write(`no capture frames in ${dir}\n`);
  process.exit(1);
}
const agg = aggregate(frames);

process.stdout.write(`\nground flatness — ${path.relative(root, dir)} (${frames.length} frames)\n\n`);
process.stdout.write('track             frames  off-road sigma   road sigma   off<2.0   road<2.0\n');
for (const [track, a] of Object.entries(agg)) {
  process.stdout.write(
    `${track.padEnd(18)}${String(a.frames).padEnd(8)}` +
      `${String(a.offRoadMedianSigma).padEnd(17)}${String(a.roadMedianSigma).padEnd(13)}` +
      `${String(`${a.offRoadUnder2Pct}%`).padEnd(10)}${a.roadUnder2Pct}%\n`
  );
}
process.stdout.write(
  '\nHeadline is the MEDIAN sigma — no threshold, so nothing to argue about. Lower =\n' +
    'flatter = worse. The <2.0 columns are for continuity with the retired statistic\n' +
    'only; do not gate on them.\n'
);

mkdirSync(path.join(root, 'tmp', 'ground-flatness'), { recursive: true });
const outPath = path.join(root, 'tmp', 'ground-flatness', `${path.basename(dir)}.json`);
writeFileSync(outPath, `${JSON.stringify({ dir: path.relative(root, dir), aggregate: agg, frames }, null, 2)}\n`);
process.stdout.write(`\nwrote ${path.relative(root, outPath)}\n`);
