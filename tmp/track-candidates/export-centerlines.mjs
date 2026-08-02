#!/usr/bin/env node
// Emits each candidate's centerline in the shape the RUNTIME consumes —
// Array<{x, z}> on course.centerline — plus the waypoints and radii it was
// generated from, so a build can start from the picked candidate without
// re-deriving anything. The dense array is what courseV2/penguinVillage hand
// to the CatmullRom; the waypoints are what a human edits.

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

for (const file of ['candidate-a.mjs', 'candidate-b.mjs', 'candidate-c.mjs']) {
  const track = (await import(`file://${resolve(HERE, file)}`)).default;
  const out = resolve(HERE, `${track.key}-centerline.json`);
  writeFileSync(
    out,
    `${JSON.stringify(
      {
        key: track.key,
        name: track.name,
        source: `tmp/track-candidates/${file}`,
        generator: 'src/game/race/tracks/buildCenterline.js',
        geometry: track.candidate.geometry,
        waypoints: track.candidate.waypoints,
        radii: track.candidate.radii,
        mainRoadWidth: track.course.mainRoadWidth,
        roadRibbons: track.course.roadRibbons,
        elevation: track.elevation,
        boostPads: track.course.boostPads,
        itemBoxes: track.course.itemBoxes,
        ramps: track.ramps,
        shortcut: track.shortcut,
        coinRows: track.candidate.coinRows,
        centerline: track.course.centerline.map((p) => ({ x: Math.round(p.x * 100) / 100, z: Math.round(p.z * 100) / 100 })),
      },
      null,
      2
    )}\n`
  );
  process.stdout.write(`wrote ${out} (${track.course.centerline.length} points, ${track.candidate.geometry.length} u, ${track.candidate.geometry.selfIntersections} self-intersections)\n`);
}
