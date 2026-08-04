// Course map geometry, for the HUD the kart build never had.
//
//   node scripts/test-minimap.mjs
//
// The failure modes worth gating are all about whether the drawing is the TRACK:
// a map stretched to fill its box is a different shape than the one being
// driven, a marker that does not travel monotonically is worse than no marker,
// and a path that escapes its viewBox draws over the rest of the HUD.
import { makeSampler, mirrorCheck } from './track-layout-preview.mjs';
import { createMinimap, minimapPointAt, MINIMAP_BOX } from '../src/game/race/raceMinimap.js';
import { KART_TRACKS } from '../src/game/race/tracks/index.js';

if (!mirrorCheck().pass) {
  process.stderr.write('FAIL: previewer sampler no longer mirrors the monolith.\n');
  process.exit(1);
}

const cases = [];
const check = (name, actual, expected) => {
  const pass = actual === expected;
  cases.push({ pass });
  process.stdout.write(`  ${pass ? 'ok  ' : 'FAIL'} ${name.padEnd(60)} got ${actual}, want ${expected}\n`);
};

process.stdout.write('course map\n');

for (const trackDef of KART_TRACKS) {
  const sampler = makeSampler(trackDef);
  const minimap = createMinimap((p) => {
    const pt = sampler.pointAt(p, 0);
    return { x: pt.x, z: pt.z };
  });

  process.stdout.write(`\n${trackDef.key}: ${minimap.points.length} outline points, path ${minimap.path.length} chars\n`);

  check(`${trackDef.key}: builds an outline`, Boolean(minimap && minimap.path), true);

  // Everything inside the viewBox, or it draws over the HUD.
  const inBox = minimap.points.every((p) => p.x >= 0 && p.x <= MINIMAP_BOX && p.y >= 0 && p.y <= MINIMAP_BOX);
  check(`${trackDef.key}: every point inside the viewBox`, inBox, true);

  // UNIFORM SCALE. A track squashed to fill the box reads as a different shape
  // than the one being driven — the aspect of the drawing must match the aspect
  // of the real track.
  const xs = minimap.points.map((p) => p.x);
  const ys = minimap.points.map((p) => p.y);
  const drawnAspect = (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
  const world = [];
  for (let i = 0; i < 180; i += 1) world.push(sampler.pointAt(i / 180, 0));
  const wx = world.map((p) => p.x);
  const wz = world.map((p) => p.z);
  const worldAspect = (Math.max(...wx) - Math.min(...wx)) / (Math.max(...wz) - Math.min(...wz));
  check(
    `${trackDef.key}: aspect preserved (drawn ${drawnAspect.toFixed(3)} vs world ${worldAspect.toFixed(3)})`,
    Math.abs(drawnAspect - worldAspect) < 0.02,
    true
  );

  // The marker must travel all the way round and come back, without jumping.
  let maxStep = 0;
  let previous = minimapPointAt(minimap, 0);
  for (let i = 1; i <= 600; i += 1) {
    const here = minimapPointAt(minimap, i / 600);
    maxStep = Math.max(maxStep, Math.hypot(here.x - previous.x, here.y - previous.y));
    previous = here;
  }
  check(`${trackDef.key}: marker never jumps (max step ${maxStep.toFixed(2)} of 100)`, maxStep < 4, true);

  // It must close the loop: progress 0 and progress 1 are the same place.
  const start = minimapPointAt(minimap, 0);
  const end = minimapPointAt(minimap, 1);
  check(`${trackDef.key}: the lap closes`, Math.hypot(start.x - end.x, start.y - end.y) < 0.01, true);

  // And the marker must actually be ON the drawn outline, not floating beside
  // it — that is the bug where the map and the lookup disagree about the track.
  let worstOffset = 0;
  for (let i = 0; i < 200; i += 1) {
    const dot = minimapPointAt(minimap, i / 200);
    let nearest = Infinity;
    for (const p of minimap.points) nearest = Math.min(nearest, Math.hypot(p.x - dot.x, p.y - dot.y));
    worstOffset = Math.max(worstOffset, nearest);
  }
  check(`${trackDef.key}: marker sits on the outline (worst ${worstOffset.toFixed(2)})`, worstOffset < 1.5, true);
}

const failed = cases.filter((c) => !c.pass).length;
process.stdout.write(`\n${cases.length} cases -> ${failed ? `${failed} FAILURES` : 'PASS'}\n`);
if (failed) process.exit(1);
