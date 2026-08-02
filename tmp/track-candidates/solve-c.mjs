#!/usr/bin/env node
// Search helper for candidate C. The turn sequence is the DESIGN (it decides
// corner types, handedness and where the chicanes are); the run lengths are
// free parameters. This scans a few of them for the combination that closes
// the loop with positive runs, lands on the ~11,700 u target, and — the whole
// point of the candidate — makes the viaduct actually cross over the start
// straight rather than run alongside it.

import { walk } from './walk.mjs';

const TURNS = [55, 50, -40, 55, 60, -45, 50, 60, 70, -125, -50, 40, -30, -20, -130];

const segCross = (a, b, c, d) => {
  const cross = (p, q, r) => (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x);
  const d1 = cross(a, b, c);
  const d2 = cross(a, b, d);
  const d3 = cross(c, d, a);
  const d4 = cross(c, d, b);
  if ((d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0)) {
    const t = d3 / (d3 - d4);
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
  }
  return null;
};

const results = [];
for (const startRun of [1350, 1450, 1550]) {
  for (const viaduct of [2400, 2600, 2800, 3000]) {
    for (const r7 of [650, 750, 850]) {
      for (const r8 of [520, 620, 720]) {
        for (const r10 of [600, 700, 800]) {
          const runs = [startRun, 850, 600, 230, 800, 850, 220, r7, r8, viaduct, r10, 230, 600, 0, 0];
          const moves = TURNS.map((turn, index) => ({ turn, run: runs[index] }));
          let solved;
          try {
            solved = walk({ start: { x: -1500, z: 1150 }, heading: 0, moves });
          } catch {
            continue;
          }
          const [a, b] = solved.solvedRuns;
          if (a < 300 || b < 300) continue;
          const w = solved.waypoints;
          let length = 0;
          for (let i = 0; i < w.length; i += 1) length += Math.hypot(w[(i + 1) % w.length].x - w[i].x, w[(i + 1) % w.length].z - w[i].z);
          if (length < 11900 || length > 12500) continue;
          // The crossing: viaduct run (index 9, waypoints 9->10) against the
          // start straight (index 0, waypoints 0->1).
          const hit = segCross(w[9], w[10], w[0], w[1]);
          if (!hit) continue;
          results.push({ startRun, viaduct, r7, r8, r10, solved: solved.solvedRuns, length: Math.round(length), hit: { x: Math.round(hit.x), z: Math.round(hit.z) } });
        }
      }
    }
  }
}

results.sort((p, q) => Math.abs(p.length - 12150) - Math.abs(q.length - 12150));
results.slice(0, 12).forEach((row) => process.stdout.write(`${JSON.stringify(row)}\n`));
process.stdout.write(`${results.length} closing layouts with a real crossing\n`);
