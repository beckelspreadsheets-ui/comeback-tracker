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
  // Ice-bridge OVERPASS on the top straight (progress ~0.49-0.71): the road
  // climbs over a frozen river and back down. No forced crest jump.
  elevation: { bridgeBand: { from: 0.55, peak: 17, to: 0.67 }, crestLaunch: false },
  ramps: [
    // Pond-edge kicker for a small air trick; off the racing line so it's a
    // deliberate line choice, not a trap.
    { progress: 0.34, side: -0.55 },
  ],
  shortcut: null,
  surfaceBands: [
    { progressStart: 0, progressEnd: 0.24, laneStart: -1, laneEnd: 1, type: 'asphalt' },
    { progressStart: 0.24, progressEnd: 0.42, laneStart: -0.75, laneEnd: 0.75, type: 'ice' },
    { progressStart: 0.24, progressEnd: 0.42, laneStart: -1, laneEnd: -0.75, type: 'snow' },
    { progressStart: 0.24, progressEnd: 0.42, laneStart: 0.75, laneEnd: 1, type: 'snow' },
    { progressStart: 0.42, progressEnd: 1, laneStart: -1, laneEnd: 1, type: 'asphalt' },
  ],
  breakableObjects: [
    { key: 'snowman-market-1', type: 'snowman', progress: 0.46, side: 0.72 },
    { key: 'snowman-market-2', type: 'snowman', progress: 0.51, side: -0.7 },
    { key: 'snowman-market-3', type: 'snowman', progress: 0.56, side: 0.74 },
    { key: 'snowman-market-4', type: 'snowman', progress: 0.61, side: -0.72 },
    { key: 'snowman-market-5', type: 'snowman', progress: 0.66, side: 0.7 },
    { key: 'snowman-market-6', type: 'snowman', progress: 0.71, side: -0.74 },
    { key: 'ice-pillar-pond-1', type: 'icePillar', progress: 0.28, side: 0.88 },
    { key: 'ice-pillar-pond-2', type: 'icePillar', progress: 0.36, side: -0.86 },
  ],
  crossers: [
    { key: 'fish-cart-market', progress: 0.55, direction: 1, speed: 0.45, width: 0.28, modelType: 'fishCart' },
    { key: 'penguin-march-return', progress: 0.82, direction: -1, speed: 0.38, width: 0.35, modelType: 'penguinMarch' },
  ],
  // Arctic-neon palette: snow ground, icy dusk sky, ice-blue edges. Road
  // asphalt stays dark (readability rule — Sherbet Land does the same).
  palette: {
    clearColor: '#0a1a2e',
    sky: [
      [0, '#061220'],
      [0.42, '#0f2a42'],
      [0.66, '#1a4a5e'],
      [0.83, '#3a7a8a'],
      [1, '#9fd4e0'],
    ],
    ground: {
      base: '#eaf4fa',
      repeat: 16,
      speckles: [
        { color: '#dbeaf3', count: 300, size: 3.4 },
        { color: '#f5f9ff', count: 340, size: 4.2 },
        { color: '#c8dde8', count: 120, size: 2 },
      ],
    },
    curb: { a: '#F5F8FF', b: '#00E5FF' },
    rail: '#00E5FF',
    wall: { a: '#7EC8E8', b: '#F5F8FF' },
    // Ice-bridge structure: frosted deck skirts, bright cyan glow underline,
    // pale ice pillars.
    bridge: { skirt: '#1a3a4a', glow: '#00E5FF', pillar: '#a8d4e8', pillarEmissive: '#3a6a7a', beam: '#2a4a5a' },
    // B1 atmosphere — owner-picked V8 "storm front" from palette-lab.html
    // (2026-07-06): close grey-blue haze, moody. Values are the lab's
    // luma-normalized set (hemi luminance must match the shared defaults or
    // snow crosses the bloom threshold and the frame cascades to white-out).
    // fog.far must stay <= 840 (camera far 860 silently no-ops the haze).
    fog: { color: '#4a6478', near: 150, far: 680 },
    hemi: { sky: '#689bb8', ground: '#0f273f', intensity: 3 },
    sunColor: '#e8c9a0',
    rimLightColor: '#00d5ff',
  },
  // Arctic dressing: giant ordinal-penguin ice statues, igloos, snow + ice.
  // customStartArch: skip the default finish gantry (the ICE IS NICE arch
  // marks the start/finish instead).
  dressing: { penguinVillage: true, customStartArch: true },
  // Shorter loop than Comeback City; budgets stay generous for the gate.
  budgets: { finishSeconds: 45, speedFloor: 130 },
});
