#!/usr/bin/env node
/**
 * gate-topspeed.mjs — the wave-7 critic's tightened acceptance gate, applied to
 * every candidate layout JSON the previewer has already emitted.
 *
 * WHY THIS EXISTS
 * ---------------
 * Round 0 judged the candidates at CC's MEAN speed (260 u/s), because mean speed
 * is the only honest way to convert a whole lap into seconds. A critic then
 * pointed out that the overtaking straight is not driven at mean speed — the
 * shipped telemetry pegs 285-286 on exactly the marks where a pass would be set
 * up, so a straight that measures 8.4 s at the lap mean can be under 8 s in the
 * only situation the straight exists for. That is a real hole in the round-0
 * gate and this file closes it: the straight gate is re-derived at TOP speed
 * while everything lap-shaped stays at mean speed.
 *
 * The speed constants are measured, not assumed —
 * tmp/k2.5-launch-repro/telemetry-autoplay.json, 898 rows, moving part of the
 * race:
 *   mean 257.0   ·   peak 295   ·   p90 293
 *   45.2% of the race sits in the 220-240 band (unboosted top speed)
 *   40.7% sits in the 280-300 band (boosted)
 * The game labels its HUD number km/h but the value IS world units per second:
 * 2,897 u / 260 u/s = 11.14 s against a shipped lap of 11.15 s. So "286 km/h"
 * and "286 u/s" are the same number and no conversion is involved.
 *
 * Usage: node tmp/track-candidates/gate-topspeed.mjs
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PREVIEW = resolve(HERE, 'preview');

// Speed regimes. BOOST is the gate; the other two are reported so the sheet
// shows the range a straight actually spans rather than a single number that
// looks authoritative and is not.
const SPEED = {
  cruise: 231, // top of the unboosted band — the slowest a straight is ever driven flat out
  mean: 260, // the lap-conversion speed, matched to shipped telemetry
  boost: 286, // the critic's number: what the HUD reads on the marks a pass happens on
};

// Straight gate. 8-10 s is the design-notes target; it now has to hold at BOOST,
// which is the shortest the straight can ever feel.
const STRAIGHT_MIN_S = 8.0;
const STRAIGHT_MAX_S = 10.0;

// ---------------------------------------------------------------------------
// Radius classes.
//
// The critic asked for three distinct classes: "sweeper >200, medium 90-140,
// hairpin <70". The first two transfer verbatim. The hairpin bound does NOT,
// and the reason is in this repo's own numbers rather than in taste:
//
//   - scripts/track-layout-preview.mjs fails a sheet outright at radius < 60
//     (KINK_RADIUS) because nothing below that was ever authored — it is the
//     signature of centerline points sitting too close together, i.e. a defect.
//   - docs/TRACK_DESIGN_NOTES.md records 72 as the tightest radius either
//     shipped track authors (Penguin Village's W3 dent), and the only tight
//     radius proven drivable in a real build.
//
// So "<70" is a 10-unit-wide slot between the proven floor and the tool's own
// defect alarm. Authoring into it would put a corner nearer the kink threshold
// than to anything ever driven. The hairpin class is therefore taken as < 90
// with a hard floor of 72. The critic's INTENT — three separated radius
// populations rather than one 95-180 smear — is adopted in full, and the raw
// count below 70 is reported alongside so the deviation is auditable rather
// than quietly assumed.
//
// WHICH RADIUS EACH CLASS IS MEASURED ON, and why it is not one number:
// the previewer reports two radii per corner and they answer different
// questions. `radiusUnits` is arc ÷ angle, the radius the corner SUSTAINS.
// `minRadiusUnits` is the tightest instant inside the arc.
//   - A sweeper is defined by what you can hold on the throttle all the way
//     round, so it is judged on the SUSTAINED radius. A 217 u sweeper that
//     pinches to 187 for one sample is still a sweeper from the seat.
//   - A hairpin is defined by the instant that forces you off the throttle, so
//     it is judged on the TIGHTEST radius. A corner whose mean is 96 but which
//     never drops below 78 brakes like a hairpin, and the driver is right.
//   - Medium is the band in between and is judged on the sustained radius for
//     the same reason as the sweeper.
// Both numbers are printed for every corner in the per-corner dump so this
// choice can be checked rather than trusted.
// ---------------------------------------------------------------------------
const CLASSES = [
  { key: 'sweeper', label: 'sweeper (sustained r > 200)', on: 'radiusUnits', test: (r) => r > 200 },
  { key: 'medium', label: 'medium (sustained 90-140)', on: 'radiusUnits', test: (r) => r >= 90 && r <= 140 },
  { key: 'hairpin', label: 'hairpin (tightest < 90)', on: 'minRadiusUnits', test: (r) => r < 90 },
];
const HAIRPIN_FLOOR = 72; // proven drivable; below this the layout is untested, not bold
const MIN_CLASSES = 3;
const MIN_PER_CLASS = 1;

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

const loadLayouts = () =>
  readdirSync(PREVIEW)
    .filter((f) => f.endsWith('-layout.json'))
    .map((f) => JSON.parse(readFileSync(resolve(PREVIEW, f), 'utf8')))
    .sort((a, b) => a.key.localeCompare(b.key));

// A corner is tested against each class on that class's own radius measure, so
// membership is checked per class rather than resolved to a single label first.
// Hairpin is checked before the others: a corner that pinches below 90 is a
// hairpin no matter what its sustained radius says.
const classify = (corner) => {
  const hairpin = CLASSES.find((c) => c.key === 'hairpin');
  if (hairpin.test(corner[hairpin.on])) return 'hairpin';
  const hit = CLASSES.find((c) => c.key !== 'hairpin' && c.test(corner[c.on]));
  return hit ? hit.key : 'unclassed';
};

export const report = (layout) => {
  const corners = layout.corners.list;
  const buckets = Object.fromEntries(CLASSES.map((c) => [c.key, []]));
  buckets.unclassed = [];
  corners.forEach((c) => buckets[classify(c)].push(c));

  const filled = CLASSES.filter((c) => buckets[c.key].length >= MIN_PER_CLASS);
  const longest = layout.straights.list.reduce((a, b) => (b.lengthUnits > a.lengthUnits ? b : a));
  const second = layout.straights.list
    .filter((s) => s !== longest)
    .reduce((a, b) => (b.lengthUnits > a.lengthUnits ? b : a));

  const secs = (units) =>
    Object.fromEntries(Object.entries(SPEED).map(([k, v]) => [k, round(units / v)]));

  const boostSeconds = round(longest.lengthUnits / SPEED.boost);

  return {
    key: layout.key,
    name: layout.name,
    lengthUnits: layout.lengthUnits,
    lapSeconds: layout.lapSeconds,
    corners: corners.length,
    longestStraight: {
      units: longest.lengthUnits,
      afterCorner: longest.afterCorner,
      beforeCorner: longest.beforeCorner,
      seconds: secs(longest.lengthUnits),
      // Units needed to reach the 8.0 s floor at boost, so a miss comes with the
      // size of its own fix rather than just a red mark.
      deficitUnitsAtBoost: boostSeconds >= STRAIGHT_MIN_S ? 0 : round(STRAIGHT_MIN_S * SPEED.boost - longest.lengthUnits, 1),
      pass: boostSeconds >= STRAIGHT_MIN_S && boostSeconds <= STRAIGHT_MAX_S,
    },
    secondStraight: { units: second.lengthUnits, seconds: secs(second.lengthUnits) },
    radiusClasses: {
      counts: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])),
      sustainedRange: [
        round(Math.min(...corners.map((c) => c.radiusUnits)), 1),
        round(Math.max(...corners.map((c) => c.radiusUnits)), 1),
      ],
      tightestInstant: round(Math.min(...corners.map((c) => c.minRadiusUnits)), 1),
      // Reported so the deviation from the critic's literal <70 bound, and any
      // drop below the proven floor, are both visible without reading the code.
      underSeventy: corners.filter((c) => c.minRadiusUnits < 70).length,
      belowProvenFloor: corners.filter((c) => c.minRadiusUnits < HAIRPIN_FLOOR).length,
      classesFilled: filled.length,
      missing: CLASSES.filter((c) => buckets[c.key].length < MIN_PER_CLASS).map((c) => c.label),
      pass: filled.length >= MIN_CLASSES && corners.every((c) => c.minRadiusUnits >= HAIRPIN_FLOOR),
    },
    cornerCountPass: corners.length >= 15 && corners.length <= 25,
    cornerDump: corners.map((c) => ({
      i: c.index,
      p: c.startProgress,
      deg: c.angleDeg,
      sustained: c.radiusUnits,
      tightest: c.minRadiusUnits,
      cls: classify(c),
    })),
  };
};

export { SPEED, STRAIGHT_MIN_S, STRAIGHT_MAX_S, CLASSES, HAIRPIN_FLOOR };

// Everything below is the CLI. Guarded so build-sheet.mjs can import `report`
// and render the SAME numbers the terminal prints — one implementation of the
// gate, not a copy that drifts from it.
const isCli = process.argv[1] && process.argv[1].endsWith('gate-topspeed.mjs');
const pad = (s, n) => String(s).padEnd(n);
const results = isCli ? loadLayouts().map(report) : [];
if (!isCli) {
  // no output on import
} else {

console.log('\nTOP-SPEED STRAIGHT GATE  (floor %ss at %s u/s)\n', STRAIGHT_MIN_S, SPEED.boost);
console.log(pad('track', 26), pad('units', 9), pad('@231', 7), pad('@260', 7), pad('@286', 7), 'verdict');
results.forEach((r) => {
  const s = r.longestStraight;
  console.log(
    pad(r.key, 26),
    pad(s.units, 9),
    pad(s.seconds.cruise, 7),
    pad(s.seconds.mean, 7),
    pad(s.seconds.boost, 7),
    s.pass ? 'PASS' : `FAIL  needs +${s.deficitUnitsAtBoost}u`,
  );
});

console.log('\nRADIUS CLASS SPREAD  (sweeper/medium on sustained radius, hairpin on tightest instant)\n');
console.log(pad('track', 26), pad('corners', 9), pad('sweeper', 9), pad('medium', 8), pad('hairpin', 9), pad('tightest', 10), 'verdict');
results.forEach((r) => {
  const c = r.radiusClasses;
  const floorBreach = c.belowProvenFloor > 0 ? ` · ${c.belowProvenFloor} under the proven floor ${HAIRPIN_FLOOR}` : '';
  console.log(
    pad(r.key, 26),
    pad(r.corners, 9),
    pad(c.counts.sweeper, 9),
    pad(c.counts.medium, 8),
    pad(c.counts.hairpin, 9),
    pad(c.tightestInstant, 10),
    (c.pass ? 'PASS' : `FAIL  missing ${c.missing.join(', ')}`) + floorBreach,
  );
});

if (process.argv.includes('--corners')) {
  results.forEach((r) => {
    console.log(`\n${r.key} — per corner (sustained / tightest)\n`);
    r.cornerDump.forEach((c) =>
      console.log(pad(`C${c.i}`, 5), pad(`p${c.p.toFixed(3)}`, 9), pad(`${c.deg}deg`, 9), pad(c.sustained, 8), pad(c.tightest, 8), c.cls),
    );
  });
}

console.log('\nJSON\n');
console.log(JSON.stringify(results.map(({ cornerDump, ...rest }) => rest), null, 2));

}
