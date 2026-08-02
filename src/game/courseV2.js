export const CourseV2Definition = Object.freeze({
  key: 'string',
  version: 'string',
  laps: 'number',
  centerline: 'Array<{ x: number, z: number }>',
  roadRibbons: 'RoadRibbon[]',
  branches: 'RouteBranch[]',
  surfaceZones: 'SurfaceZone[]',
  collisionZones: 'CollisionZone[]',
  sceneryAnchors: 'Array<object>',
  districtAnchors: 'DistrictAnchor[]',
  minimapPath: 'Array<{ x: number, z: number }>',
  cameraCheckpoints: 'Array<object>',
});

export const RoadRibbon = Object.freeze({
  key: 'string',
  role: 'main | branch',
  width: 'number',
  shoulderWidth: 'number',
});

export const RouteBranch = Object.freeze({
  key: 'string',
  name: 'string',
  startProgress: 'number',
  endProgress: 'number',
  width: 'number',
  leadSeconds: 'number',
  points: 'Array<{ x: number, z: number }>',
});

export const SurfaceZone = Object.freeze({
  key: 'string',
  type: 'asphalt | boost | offroad | wet',
  progress: 'number',
  radius: 'number',
});

export const CollisionZone = Object.freeze({
  key: 'string',
  shape: 'circle | box',
  position: '{ x: number, z: number }',
  radius: 'number',
});

export const DistrictAnchor = Object.freeze({
  key: 'string',
  label: 'string',
  progress: 'number',
  side: 'number',
  setback: 'number',
});

export const AssetManifestEntry = Object.freeze({
  filePath: 'string',
  source: 'string',
  license: 'string',
  role: 'string',
  sizeBudget: 'string',
  fallback: 'string',
});

export const RaceVisualTelemetry = Object.freeze({
  kartScreenCoverage: '{ heightRatio: number, centerYRatio: number, framingBandFromBottom: number }',
  roadAheadCoverage: '{ value: number, samples: number }',
  visibleBranchCount: 'number',
  activeSurface: 'string',
  offroadSlowdown: 'number',
  driftTier: 'number',
  boostTimer: 'number',
  cameraClipCount: 'number',
  nearestCollisionDistance: 'number',
  fps: 'number',
  assetLoadState: '{ state: string, manifestPath: string, externalAssets: number }',
});

export const KartTuningV2 = Object.freeze({
  acceleration: 58,
  boostDurations: [0.35, 0.75, 1.1],
  boostStrength: [9.5, 14.5, 20],
  driftGrip: 4.05,
  grip: 14.2,
  maxSpeed: 58,
  offroadMultiplier: 0.46,
  slideAngle: 0.28,
  slideForce: 10.8,
  steering: 2.46,
  tierChargeTimes: [0.55, 1.3, 2.15],
});

// Owner feedback 2026-06-12: the lap needed MK-scale room to drift with a
// full field of karts — the whole course is scaled up from the authored
// points (longer straights, broader corner radii). Progress-based data
// (pads, boxes, anchors) is scale-invariant; absolute world coordinates
// below are multiplied through.
const TRACK_SCALE = 1.35;
// AAA wave 7: the authored loop used to close with a point at {-193, 46}, only
// 2.2 authored units (3.0 scaled) from centerline[0] {-195, 45}, where every
// other gap on the loop is ~24-29. The runtime builds this as a CLOSED
// CatmullRomCurve3 with UNIFORM parameterisation, so a segment an order of
// magnitude shorter than its neighbours gets the same slice of curve parameter
// as a full-length one and the spline whips through it. The layout previewer
// measured the result as two unauthored kinks of radius 20.2 and 34.7 sitting
// directly ON the start/finish line — tighter than anything either track
// authors (min 72) and crossed once per lap. Dropping the point leaves a seam
// gap of 28.5 authored units against its neighbour's 29.2, i.e. the loop now
// closes at its own natural spacing. Verified: 7 corners (2 kink) ->
// 5 corners (0 kink), min radius 20.2 -> 110.5.
// Owner feedback 2026-06-12 round 2: corners must be long sustained sweepers
// that reward holding a drift. This centerline is GENERATED from exact
// arc/straight primitives (three drift carousels R~108-143 scaled, a dive,
// a bridge climb, two overtaking straights) and densely sampled so the
// runtime CatmullRom follows the intended radii. Generator + validation
// (crossing/curvature/race-sim): see git history of tmp track-gen scripts.
const authoredCenterline = [
  { x: -195, z: 45 },
  { x: -171, z: 45 },
  { x: -147, z: 45 },
  { x: -123, z: 45 },
  { x: -99, z: 45 },
  { x: -75, z: 45 },
  { x: -51, z: 45 },
  { x: -27, z: 45 },
  { x: -3, z: 45 },
  { x: 21, z: 45 },
  { x: 45, z: 45 },
  { x: 69, z: 45 },
  { x: 93, z: 45 },
  { x: 124, z: 43 },
  { x: 151, z: 33 },
  { x: 173, z: 16 },
  { x: 190, z: -7 },
  { x: 200, z: -28 },
  { x: 211, z: -49 },
  { x: 222, z: -70 },
  { x: 233, z: -91 },
  { x: 243, z: -112 },
  { x: 255, z: -141 },
  { x: 257, z: -170 },
  { x: 248, z: -198 },
  { x: 229, z: -220 },
  { x: 204, z: -234 },
  { x: 175, z: -239 },
  { x: 147, z: -233 },
  { x: 122, z: -217 },
  { x: 105, z: -194 },
  { x: 98, z: -166 },
  { x: 101, z: -137 },
  { x: 114, z: -109 },
  { x: 126, z: -89 },
  { x: 137, z: -69 },
  { x: 153, z: -44 },
  { x: 171, z: -25 },
  { x: 197, z: -7 },
  { x: 216, z: 6 },
  { x: 235, z: 20 },
  { x: 254, z: 33 },
  { x: 273, z: 46 },
  { x: 292, z: 59 },
  { x: 316, z: 79 },
  { x: 333, z: 102 },
  { x: 344, z: 130 },
  { x: 346, z: 159 },
  { x: 339, z: 188 },
  { x: 325, z: 214 },
  { x: 305, z: 235 },
  { x: 279, z: 250 },
  { x: 251, z: 256 },
  { x: 217, z: 257 },
  { x: 193, z: 257 },
  { x: 169, z: 257 },
  { x: 145, z: 257 },
  { x: 121, z: 257 },
  { x: 97, z: 257 },
  { x: 73, z: 257 },
  { x: 49, z: 257 },
  { x: 25, z: 257 },
  { x: 1, z: 257 },
  { x: -23, z: 257 },
  { x: -47, z: 257 },
  { x: -71, z: 257 },
  { x: -95, z: 257 },
  { x: -119, z: 257 },
  { x: -143, z: 257 },
  { x: -167, z: 257 },
  { x: -199, z: 255 },
  { x: -227, z: 245 },
  { x: -252, z: 228 },
  { x: -270, z: 205 },
  { x: -282, z: 177 },
  { x: -285, z: 148 },
  { x: -280, z: 118 },
  { x: -267, z: 92 },
  { x: -247, z: 69 },
  { x: -222, z: 54 },
];
const centerline = authoredCenterline.map((point) => ({
  x: point.x * TRACK_SCALE,
  z: point.z * TRACK_SCALE,
}));

const minimapPath = centerline.map((point) => ({ ...point }));

export const COMEBACK_CITY_COURSE_V2 = Object.freeze({
  key: 'comeback-city',
  version: 'v2-authored-kart',
  laps: 3,
  kartOnly: true,
  mainRoadWidth: 56,
  sampleCount: 132,
  startProgress: 0.012,
  startLabel: 'Start Boulevard',
  centerline,
  minimapPath,
  // Width profile (owner direction 2026-06-12): the drift carousels open up
  // wide; everything else stays narrow so the lap takes skill. The runtime
  // smooths these into a continuous width along the lap.
  roadRibbons: [
    { key: 'start-straight', role: 'main', width: 47, shoulderWidth: 6, startProgress: 0, endProgress: 0.1 },
    { key: 'harbor-dive', role: 'main', width: 45, shoulderWidth: 5.5, startProgress: 0.1, endProgress: 0.2 },
    { key: 'south-carousel', role: 'main', width: 56, shoulderWidth: 7, startProgress: 0.2, endProgress: 0.4 },
    { key: 'bridge-climb', role: 'main', width: 45, shoulderWidth: 5.5, startProgress: 0.4, endProgress: 0.53 },
    { key: 'east-loop', role: 'main', width: 56, shoulderWidth: 7, startProgress: 0.53, endProgress: 0.66 },
    { key: 'top-straight', role: 'main', width: 47, shoulderWidth: 6, startProgress: 0.66, endProgress: 0.78 },
    { key: 'seam-carousel', role: 'main', width: 54, shoulderWidth: 6.5, startProgress: 0.78, endProgress: 1 },
  ],
  branches: [],
  surfaceZones: [
    { key: 'start-asphalt', type: 'asphalt', progress: 0.04, radius: 120 },
    { key: 'food-wet-cleanup', type: 'wet', progress: 0.335, side: -8, radius: 16 },
    { key: 'lab-bridge-grip', type: 'asphalt', progress: 0.57, radius: 80 },
    { key: 'clinic-clean-tile', type: 'wet', progress: 0.72, side: 7, radius: 15 },
    { key: 'waterfront-offroad-edge', type: 'offroad', progress: 0.88, side: 31, radius: 26 },
  ],
  // Pads/boxes re-seated for the drift-sweeper layout: pad into the carousel
  // commit, pad onto the bridge climb, risk/reward inside-line pad in the
  // seam carousel.
  boostPads: [
    { key: 'start-boulevard-pad', progress: 0.055, side: 0 },
    { key: 'carousel-commit-pad', progress: 0.205, side: 0.16 },
    { key: 'bridge-climb-pad', progress: 0.435, side: 0 },
    { key: 'seam-inside-pad', progress: 0.875, side: -0.28 },
  ],
  itemBoxes: [
    { progress: 0.025, side: -0.18 },
    { progress: 0.115, side: 0.16 },
    { progress: 0.225, side: -0.16 },
    { progress: 0.36, side: 0.18 },
    { progress: 0.5, side: -0.16 },
    { progress: 0.6, side: 0.18 },
    { progress: 0.74, side: -0.18 },
    { progress: 0.86, side: 0.16 },
  ],
  bananaPlacements: [
    { progress: 0.045, side: -0.18 },
    { progress: 0.095, side: 0.18 },
    { progress: 0.15, side: -0.08 },
    { progress: 0.205, side: 0.22 },
    { progress: 0.265, side: -0.2 },
    { progress: 0.325, side: 0.12 },
    { progress: 0.385, side: -0.18 },
    { progress: 0.445, side: 0.22 },
    { progress: 0.505, side: -0.1 },
    { progress: 0.565, side: 0.16 },
    { progress: 0.625, side: -0.2 },
    { progress: 0.685, side: 0.12 },
    { progress: 0.745, side: -0.16 },
    { progress: 0.805, side: 0.2 },
    { progress: 0.865, side: -0.14 },
    { progress: 0.925, side: 0.18 },
    { progress: 0.965, side: -0.08 },
    { progress: 0.99, side: 0.12 },
  ],
  districtAnchors: [
    {
      key: 'gym',
      accent: '#80ff62',
      base: '#3ca75b',
      dark: '#1f5f35',
      icon: 'dumbbell',
      label: 'GYM',
      progress: 0.18,
      roof: '#e9f7ce',
      setback: 86,
      side: 1,
    },
    {
      key: 'food',
      accent: '#ffac32',
      base: '#f28b2e',
      dark: '#9d4516',
      icon: 'utensils',
      label: 'FOOD COURT',
      progress: 0.31,
      roof: '#fff0b0',
      setback: 84,
      side: -1,
    },
    {
      key: 'lab',
      accent: '#d45cff',
      base: '#8a53df',
      dark: '#38206f',
      icon: 'flask',
      label: 'LAB',
      progress: 0.56,
      roof: '#f0e2ff',
      setback: 92,
      side: 1,
    },
    {
      key: 'clinic',
      accent: '#ff5b68',
      base: '#e64b4b',
      dark: '#7c202c',
      icon: 'cross',
      label: 'CLINIC',
      progress: 0.72,
      roof: '#f3ece0',
      setback: 88,
      side: -1,
    },
    {
      key: 'garage',
      accent: '#2cc8ff',
      base: '#2677d8',
      dark: '#143d78',
      icon: 'wrench',
      label: 'GARAGE',
      progress: 0.88,
      roof: '#e4f8ff',
      setback: 92,
      side: 1,
    },
  ],
  collisionZones: [
    { key: 'gym-facade', shape: 'circle', position: { x: 128 * TRACK_SCALE, z: -20 * TRACK_SCALE }, radius: 24 },
    { key: 'food-stalls', shape: 'circle', position: { x: 22 * TRACK_SCALE, z: -208 * TRACK_SCALE }, radius: 28 },
    { key: 'lab-tower', shape: 'circle', position: { x: -32 * TRACK_SCALE, z: 96 * TRACK_SCALE }, radius: 28 },
    { key: 'clinic-plaza-building', shape: 'circle', position: { x: 318 * TRACK_SCALE, z: 126 * TRACK_SCALE }, radius: 26 },
    { key: 'garage-waterfront-building', shape: 'circle', position: { x: -72 * TRACK_SCALE, z: 352 * TRACK_SCALE }, radius: 28 },
    { key: 'finish-roundabout-core', shape: 'circle', position: { x: -224 * TRACK_SCALE, z: 150 * TRACK_SCALE }, radius: 22 },
  ],
  sceneryAnchors: [
    { kind: 'water', x: -58 * TRACK_SCALE, z: 322 * TRACK_SCALE, w: 210 * TRACK_SCALE, d: 96 * TRACK_SCALE, color: '#0ea5c8' },
    { kind: 'bridge', x: 18 * TRACK_SCALE, z: 42 * TRACK_SCALE, w: 126 * TRACK_SCALE, d: 18, color: '#65717f' },
    { kind: 'roundabout', x: -226 * TRACK_SCALE, z: 150 * TRACK_SCALE, r: 38, color: '#2cc8ff' },
    { kind: 'skyline', x: 48 * TRACK_SCALE, z: -318 * TRACK_SCALE, w: 520 * TRACK_SCALE, d: 64, color: '#315b8d' },
  ],
  cameraCheckpoints: [
    { key: 'mobile-start', profile: 'mobile', progress: 0.04, targetBandFromBottom: [0.25, 0.33] },
    { key: 'desktop-start', profile: 'desktop', progress: 0.04, targetBandFromBottom: [0.14, 0.22] },
    { key: 'early-route-readability', profile: 'all', progress: 0.245 },
    { key: 'camera-near-lab', profile: 'all', progress: 0.56, collisionClearanceMin: 1.5 },
  ],
  assetLoadState: {
    state: 'procedural-ready',
    manifestPath: '/src/assets/game/asset-manifest.json',
    externalAssets: 0,
    missing: [],
  },
});

export const COMEBACK_CITY_TRACK_V2_FIELDS = Object.freeze({
  bananaPlacements: COMEBACK_CITY_COURSE_V2.bananaPlacements,
  boostPads: COMEBACK_CITY_COURSE_V2.boostPads,
  itemBoxes: COMEBACK_CITY_COURSE_V2.itemBoxes,
  shortcuts: COMEBACK_CITY_COURSE_V2.branches.map((branch) => ({
    accent: branch.accent,
    decisionCueProgress: branch.decisionCueProgress,
    endProgress: branch.endProgress,
    entrySide: branch.entrySide,
    key: branch.key,
    label: branch.label,
    leadSeconds: branch.leadSeconds,
    name: branch.name,
    points: branch.points,
    shoulderWidth: branch.shoulderWidth,
    startProgress: branch.startProgress,
    width: branch.width,
  })),
});
