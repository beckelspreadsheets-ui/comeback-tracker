// Penguin Village Rooftop Rally — the first NEW track (docs/MULTITRACK_EXECUTION_PLAN.md
// Phase 1). Cozy beginner loop: a long "main street" start straight, a wide
// frozen-pond sweep, a "fish market" straight, gentle return bends. This is
// the grey-box pass — drivable road + pads + boxes, flat (no bridge), no
// dressing yet. Hazards (fish-cart crossers, snowmen, pond slip-zone) and
// the arctic dressing land in later passes. Pure data; gate scripts import it.
import { buildCenterline, validateCenterline } from './buildCenterline.js';

// A loop with real character — mixed left/right turns (the W3 dent is a
// concave right-hander, the rest sweep), a long main-street start straight,
// a wide pond sweeper, and one tighter signature corner. Validated:
// ~2442 units, min radius ~72, no self-intersections.
const WAYPOINTS = [
  { x: -380, z: 250 }, // main-street start (bottom-left)
  { x: 320, z: 250 }, // end of the long start straight (bottom-right)
  { x: 480, z: 70 }, // wide frozen-pond sweeper (right)
  { x: 250, z: -40 }, // signature tight inside dent (a right-hander)
  { x: 380, z: -250 }, // back out to the top-right
  { x: -200, z: -300 }, // fish-market straight (top)
  { x: -470, z: -40 }, // wide left return
];
const centerline = buildCenterline(WAYPOINTS, { radius: [120, 110, 155, 72, 110, 145, 150], spacing: 22 });
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
  // Arctic-neon palette: snow ground, icy dusk sky, ice-blue edges. Road
  // asphalt stays dark (readability rule — Sherbet Land does the same).
  palette: {
    clearColor: '#0c1a2e',
    sky: [
      [0, '#0a1a30'],
      [0.45, '#163a55'],
      [0.7, '#2d6f86'],
      [0.85, '#5fb8c4'],
      [1, '#bfe8ec'],
    ],
    ground: {
      base: '#d7e6f1',
      repeat: 16,
      speckles: [
        { color: '#c4d8e6', count: 300, size: 3.4 },
        { color: '#eef6fb', count: 340, size: 4.2 },
        { color: '#b0c8da', count: 120, size: 2 },
      ],
    },
    curb: { a: '#7fd4ff', b: '#f8fbff' },
    rail: '#8fe6ff',
    wall: { a: '#6fb8e0', b: '#f8fbff' },
  },
  // Arctic dressing: giant ordinal-penguin ice statues, igloos, snow + ice.
  dressing: { penguinVillage: true },
  // Shorter loop than Comeback City; budgets stay generous for the gate.
  budgets: { finishSeconds: 45, speedFloor: 130 },
});
