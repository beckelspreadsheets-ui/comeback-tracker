// Course map for the kart HUD.
//
// The shipped kart game has never had one. All three wave-9 critics reported it
// independently, and the import graph confirms it: the auto-normalising minimap
// in raceHud.jsx is rendered only by ArcadeRace3D.jsx — the FITNESS app's race
// screen — and the kart build goes index.kart.html -> src/kart/main.jsx ->
// KartApp.jsx, which imports the monolith and never that file. The plan had this
// item dropped as "not a defect" on the strength of a HUD the kart build does
// not load.
//
// It matters more now than it did: a lap is ~47s across 16 corners, and with
// free-body the player can leave the road and turn around, so "where am I and
// which way is the track" stopped being obvious.
//
// Pure and Three.js-free — takes the track's centerline, returns an SVG path in
// a normalised box plus a progress -> point lookup. Testable in node, which
// scripts/test-minimap.mjs does.

// Resolution of the drawn outline. 180 points over an 11.6k-unit lap is a
// sample every ~65 units — finer than the HUD can resolve at ~120px, and coarse
// enough that the path string stays under 3 KB.
const OUTLINE_POINTS = 180;
// The normalised box the path is drawn into. Matches the SVG viewBox.
export const MINIMAP_BOX = 100;
// Keeps the stroke and the markers off the edge of the viewBox.
const PADDING = 8;

const wrap01 = (value) => ((value % 1) + 1) % 1;

// Build the static outline once per track. `sampleAt(progress)` must return a
// point with x and z in world units — the monolith passes its sampler, so the
// map is drawn from the SAME curve the kart drives on rather than from a second
// description of the track that could drift out of step with it.
export const createMinimap = (sampleAt, { points = OUTLINE_POINTS } = {}) => {
  const raw = [];
  for (let i = 0; i < points; i += 1) {
    const p = sampleAt(i / points);
    raw.push({ x: p.x, z: p.z });
  }
  if (!raw.length) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of raw) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }

  // UNIFORM scale on both axes, not a stretch to fill the box. A track squashed
  // to fit reads as a different shape than the one being driven, which is worse
  // than a smaller drawing — the whole job of this thing is recognising where
  // you are.
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanZ = Math.max(maxZ - minZ, 1e-6);
  const usable = MINIMAP_BOX - PADDING * 2;
  const scale = usable / Math.max(spanX, spanZ);
  const offsetX = (MINIMAP_BOX - spanX * scale) / 2;
  const offsetZ = (MINIMAP_BOX - spanZ * scale) / 2;

  const project = (x, z) => ({
    x: offsetX + (x - minX) * scale,
    y: offsetZ + (z - minZ) * scale,
  });

  const projected = raw.map((p) => project(p.x, p.z));
  const path = `${projected
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join('')}Z`;

  return { path, points: projected, project, scale, viewBox: `0 0 ${MINIMAP_BOX} ${MINIMAP_BOX}` };
};

// Where a racer sits on the drawn outline. Interpolates between the two nearest
// outline samples so a marker slides rather than stepping between 180 stops.
export const minimapPointAt = (minimap, progress) => {
  if (!minimap?.points?.length) return null;
  const list = minimap.points;
  const scaled = wrap01(progress) * list.length;
  const low = Math.floor(scaled) % list.length;
  const high = (low + 1) % list.length;
  const t = scaled - Math.floor(scaled);
  return {
    x: list[low].x + (list[high].x - list[low].x) * t,
    y: list[low].y + (list[high].y - list[low].y) * t,
  };
};
