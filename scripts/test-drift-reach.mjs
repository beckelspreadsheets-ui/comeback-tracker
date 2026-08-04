// Are the drift tiers reachable on the tracks that actually ship?
//
// This gate exists because for two waves they were not, and nothing noticed.
// The 4x rebuild kept 16 corners but stretched the lap from 11.15s to ~47s, so
// corners went from arriving every 0.70s — where one held drift carried across
// several and banked the top tiers routinely — to every ~2.97s with a median
// 1.8s straight between. Every drift then started from zero, and against the
// original 0.55/1.3/2.15 thresholds tier 2 and tier 3 became UNREACHABLE in any
// corner on either track. Two thirds of the drift system was dead content, and
// the only signal was the owner saying "drifting seems a bit harder than it
// was" after playing it.
//
//   node scripts/test-drift-reach.mjs
//
// A charge-time change and a track re-author are the two things that can break
// this, and they live in different files — which is exactly why the check has to
// read BOTH and compare them.
import { makeSampler, mirrorCheck, MEAN_SPEED } from './track-layout-preview.mjs';
import { DRIFT_FEEL } from '../src/game/race/driftFeel.js';
import { KART_TRACKS } from '../src/game/race/tracks/index.js';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

if (!mirrorCheck().pass) {
  process.stderr.write('FAIL: previewer sampler no longer mirrors the monolith.\n');
  process.exit(1);
}

// Corner durations come from the previewer, so this and the layout report can
// never disagree about how long a corner lasts.
const out = mkdtempSync(path.join(tmpdir(), 'drift-reach-'));
spawnSync(process.execPath, [path.join(import.meta.dirname, 'track-layout-preview.mjs'), '--json-only', '--out', out], {
  encoding: 'utf8',
});

const cases = [];
const check = (name, actual, expected) => {
  const pass = actual === expected;
  cases.push({ pass });
  process.stdout.write(`  ${pass ? 'ok  ' : 'FAIL'} ${name.padEnd(62)} got ${actual}, want ${expected}\n`);
};

const [t1, t2, t3] = DRIFT_FEEL.chargeTimes;
process.stdout.write(`drift reach — thresholds ${t1} / ${t2} / ${t3}s at ${MEAN_SPEED['comeback-city']} u/s\n`);

// A chicane is two corners separated by a short gap, so a drift held through it
// charges for both plus the gap. That is the intended route to the top tier.
const CHICANE_GAP_SECONDS = 0.17;

for (const trackDef of KART_TRACKS) {
  const report = JSON.parse(readFileSync(path.join(out, `${trackDef.key}-layout.json`), 'utf8'));
  const corners = report.corners.list.map((c) => c.seconds).filter(Number.isFinite);
  const sorted = corners.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const longest = sorted.at(-1);
  const chained = longest + CHICANE_GAP_SECONDS + median;

  process.stdout.write(
    `\n${trackDef.key}: ${corners.length} corners, median ${median.toFixed(2)}s, longest ${longest.toFixed(2)}s, ` +
      `chained ${chained.toFixed(2)}s\n`
  );

  // TIER 1 must be routine — reachable in a median corner, or ordinary
  // cornering never rewards a drift at all.
  check(`${trackDef.key}: tier 1 reachable in a MEDIAN corner`, median >= t1, true);

  // TIER 2 must be reachable in the track's best corner. This is the assertion
  // that was false for two waves.
  check(`${trackDef.key}: tier 2 reachable in the LONGEST corner`, longest >= t2, true);

  // TIER 3 must be reachable by CHAINING, and must NOT be reachable in a single
  // corner — the top tier is meant to be earned, and a top tier you fall into
  // is the same dead content as one you cannot reach.
  check(`${trackDef.key}: tier 3 reachable by CHAINING a chicane`, chained >= t3, true);
  check(`${trackDef.key}: tier 3 NOT reachable in one corner`, longest < t3, true);

  // And most corners should do something. A track where half the corners award
  // nothing does not read as a drifting game.
  const rewarding = corners.filter((s) => s >= t1).length;
  check(
    `${trackDef.key}: at least 2/3 of corners reach tier 1 (${rewarding}/${corners.length})`,
    rewarding >= Math.ceil((corners.length * 2) / 3),
    true
  );
}

const failed = cases.filter((c) => !c.pass).length;
process.stdout.write(`\n${cases.length} cases -> ${failed ? `${failed} FAILURES` : 'PASS'}\n`);
if (failed) process.exit(1);
