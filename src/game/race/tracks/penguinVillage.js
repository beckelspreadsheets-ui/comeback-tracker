// Penguin Village Rooftop Rally — the first NEW track (docs/MULTITRACK_EXECUTION_PLAN.md
// Phase 1). Cozy beginner loop: a long "main street" start straight, a wide
// frozen-pond sweep, a "fish market" straight, gentle return bends. This is
// the grey-box pass — drivable road + pads + boxes, flat (no bridge), no
// dressing yet. Hazards (fish-cart crossers, snowmen, pond slip-zone) and
// the arctic dressing land in later passes. Pure data; gate scripts import it.
import { buildCenterline, validateCenterline } from './buildCenterline.js';

// Six corners forming a friendly wide loop (final world coords; no extra
// scale). Per-corner radii: flowing side sweepers, gentler corners into the
// straights. Validated: ~2374 units, min radius ~118, no self-intersections.
const WAYPOINTS = [
  { x: -364, z: 221 }, // main-street start (bottom-left)
  { x: 364, z: 221 }, // bottom-right — end of the long start straight
  { x: 488, z: -39 }, // frozen-pond sweep (right)
  { x: 221, z: -293 }, // top-right
  { x: -221, z: -293 }, // fish-market straight (top)
  { x: -488, z: -39 }, // left return
];
const centerline = buildCenterline(WAYPOINTS, { radius: [130, 118, 165, 118, 130, 165], spacing: 22 });
export const PENGUIN_VILLAGE_GEOMETRY = validateCenterline(centerline);

const PENGUIN_VILLAGE_COURSE = Object.freeze({
  key: 'penguin-village',
  mainRoadWidth: 58,
  startProgress: 0.02,
  centerline,
  minimapPath: centerline.map((p) => ({ ...p })),
  // Cozy and wide; the frozen-pond sweep opens up. Runtime smooths these.
  roadRibbons: [
    { key: 'main-street', role: 'main', width: 58, shoulderWidth: 6, startProgress: 0, endProgress: 0.24 },
    { key: 'pond-sweep', role: 'main', width: 64, shoulderWidth: 7, startProgress: 0.24, endProgress: 0.42 },
    { key: 'market-row', role: 'main', width: 58, shoulderWidth: 6, startProgress: 0.42, endProgress: 0.72 },
    { key: 'return-bend', role: 'main', width: 60, shoulderWidth: 6.5, startProgress: 0.72, endProgress: 1 },
  ],
  boostPads: [
    { key: 'street-pad', progress: 0.12, side: 0 },
    { key: 'pond-pad', progress: 0.33, side: 0.1 },
    { key: 'market-pad', progress: 0.58, side: 0 },
    { key: 'return-pad', progress: 0.85, side: -0.1 },
  ],
  itemBoxes: [
    { progress: 0.06, side: -0.16 },
    { progress: 0.18, side: 0.16 },
    { progress: 0.3, side: -0.14 },
    { progress: 0.46, side: 0.16 },
    { progress: 0.6, side: -0.16 },
    { progress: 0.74, side: 0.14 },
    { progress: 0.88, side: -0.16 },
  ],
  // Dressing comes in a later pass — grey-box has no buildings or props.
  districtAnchors: [],
  sceneryAnchors: [],
});

export const PENGUIN_VILLAGE_TRACK = Object.freeze({
  key: 'penguin-village',
  name: 'Penguin Village',
  tagline: 'Cozy snow-village rally',
  course: PENGUIN_VILLAGE_COURSE,
  laps: 3,
  startOffset: 0.03,
  // Flat (peak 0) and no bridge launch — the village is ground-level for now.
  elevation: { bridgeBand: { from: 0.4, peak: 0, to: 0.534 }, crestLaunch: false },
  ramps: [],
  shortcut: null,
  // Shorter loop than Comeback City; budgets stay generous for the gate.
  budgets: { finishSeconds: 45, speedFloor: 130 },
});
