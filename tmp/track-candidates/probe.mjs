#!/usr/bin/env node
// Fast iteration probe for the candidate layouts. Prints the numbers a
// waypoint edit changes immediately — length, per-waypoint progress, straight
// runs between fillet tangents, handedness and the tightest radius — without
// paying for the previewer's contrast/sightline/browser work.
//
// The previewer remains the authority; this only shortens the loop between
// "move a waypoint" and "was that better".

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MEAN_SPEED = 260;

const files = process.argv.slice(2);
if (!files.length) files.push('candidate-a.mjs', 'candidate-b.mjs', 'candidate-c.mjs');

const sub = (a, b) => ({ x: a.x - b.x, z: a.z - b.z });
const len = (a) => Math.hypot(a.x, a.z);
const norm = (a) => {
  const l = len(a) || 1;
  return { x: a.x / l, z: a.z / l };
};

for (const file of files) {
  const module = await import(`file://${resolve(HERE, file)}`);
  const track = module.default;
  const { waypoints, radii, geometry } = track.candidate;
  const n = waypoints.length;

  // Polyline length and per-corner deflection/tangent, mirroring buildCenterline.
  let polyline = 0;
  const rows = [];
  for (let i = 0; i < n; i += 1) {
    const prev = waypoints[(i + n - 1) % n];
    const next = waypoints[(i + 1) % n];
    const din = norm(sub(waypoints[i], prev));
    const dout = norm(sub(next, waypoints[i]));
    const cross = din.x * dout.z - din.z * dout.x;
    const dot = din.x * dout.x + din.z * dout.z;
    const turn = Math.atan2(cross, dot);
    const edge = len(sub(waypoints[i], prev));
    polyline += edge;
    const wanted = radii[i] * Math.tan(Math.abs(turn) / 2);
    const t = Math.min(wanted, edge * 0.49, len(sub(next, waypoints[i])) * 0.49);
    const effective = wanted > 0 ? t / Math.tan(Math.abs(turn) / 2) : radii[i];
    rows.push({
      i: i + 1,
      edgeIn: Math.round(edge),
      deflectionDeg: Math.round((Math.abs(turn) * 180) / Math.PI),
      dir: turn > 0 ? 'left' : 'right',
      authored: Math.round(radii[i]),
      effective: Math.round(effective),
      clipped: effective < radii[i] - 1,
      tangent: Math.round(t),
    });
  }

  // Straight between consecutive fillets = edge - tangentOut(prev) - tangentIn(next).
  const straights = rows.map((row, i) => {
    const next = rows[(i + 1) % n];
    const run = next.edgeIn - row.tangent - next.tangent;
    return { from: row.i, to: next.i, units: Math.round(run), seconds: run / MEAN_SPEED };
  });
  const longest = straights.reduce((best, s) => (s.units > best.units ? s : best), straights[0]);
  const lefts = rows.filter((row) => row.dir === 'left').length;

  process.stdout.write(
    [
      ``,
      `${track.name}  (${file})`,
      `  centerline      ${geometry.length} u = ${(geometry.length / MEAN_SPEED).toFixed(2)} s/lap, ` +
        `${(((geometry.length / MEAN_SPEED) * 3)).toFixed(1)} s race`,
      `  vs 11,700 target ${(((geometry.length / 11700) - 1) * 100).toFixed(1)}%   (x${(geometry.length / 2897).toFixed(2)} of shipped CC)`,
      `  points ${geometry.points}, min radius ${geometry.minRadius}, self-intersections ${geometry.selfIntersections}`,
      `  waypoints       ${n} (${lefts} left / ${n - lefts} right)`,
      `  longest straight ${longest.units} u = ${longest.seconds.toFixed(2)} s  (wp${longest.from} to wp${longest.to})`,
      `  corner table:`,
      ...rows.map(
        (row) =>
          `    wp${String(row.i).padStart(2)} ${row.dir.padEnd(5)} ${String(row.deflectionDeg).padStart(3)}deg  ` +
          `r${String(row.authored).padStart(3)}${row.clipped ? ` -> CLIPPED r${row.effective}` : '        '}  ` +
          `edge in ${String(row.edgeIn).padStart(4)}  tangent ${String(row.tangent).padStart(3)}`
      ),
      `  straights:`,
      ...straights
        .filter((s) => s.units > 60)
        .sort((a, b) => b.units - a.units)
        .slice(0, 6)
        .map((s) => `    wp${s.from}->wp${s.to}  ${String(s.units).padStart(4)} u = ${s.seconds.toFixed(2)} s`),
    ].join('\n') + '\n'
  );
}
