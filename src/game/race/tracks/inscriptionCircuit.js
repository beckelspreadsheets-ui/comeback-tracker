// Inscription Circuit — the Ordinals rebuild track (M1 graybox). One
// cohesive fantasy world, three character-owned districts on a single lap:
//   Launch Yard (isethius spaceport)  → fast straight + opening sweep
//   Blackflag Wharf (t clow pirate harbor) → narrow technical switchbacks
//   Layer23 Mesa (wide-brim observatory)  → elevated climb, crest jump, descent
// Topology is NEW (docs/INSCRIPTION_CIRCUIT_ART_DIRECTION.md): not a
// rearrangement of Comeback City's city grid or Penguin Village's dented oval.
// Pure data (no THREE) so the QA gate scripts can import it.
import { buildCenterline, validateCenterline } from './buildCenterline.js';
import { TRACK_VISUAL_SCHEMA_VERSION } from './trackVisualSchema.js';

// Ten authored corners. Macro silhouette: long southern launch straight,
// big eastern opening sweep, pinched northern wharf switchbacks, western
// mesa climb, southern descent back into the straight.
// Validated: length 3108, min radius ~51 (the wharf signature pinch),
// zero self-intersections.
const WAYPOINTS = [
  { x: -440, z: 320 }, // W1 launch straight west (start/finish)
  { x: 400, z: 320 }, // W2 launch straight east end
  { x: 580, z: 40 }, // W3 opening sweeper (Launch Yard)
  { x: 470, z: -180 }, // W4 sweeper exit / wharf entry
  { x: 210, z: -70 }, // W5 wharf switchback dent (signature pinch)
  { x: 330, z: -320 }, // W6 wharf switchback out
  { x: -60, z: -390 }, // W7 boardwalk top straight
  { x: -380, z: -330 }, // W8 hairpin into the mesa approach
  { x: -570, z: -60 }, // W9 mesa climb (west rim)
  { x: -390, z: 150 }, // W10 mesa descent toward the finish
];
const RADII = [100, 130, 150, 110, 76, 84, 120, 82, 110, 100];
const centerline = buildCenterline(WAYPOINTS, { radius: RADII, spacing: 22 });
export const INSCRIPTION_CIRCUIT_GEOMETRY = validateCenterline(centerline);

// Measured waypoint progress (tmp/m1-track-check.mjs): W2 0.238 · W3 0.336 ·
// W4 0.413 · W5 0.476 · W6 0.531 · W7 0.643 · W8 0.748 · W9 0.853 ·
// W10 0.937 · W1 0.986. District boundaries below come from these.
const INSCRIPTION_CIRCUIT_COURSE = Object.freeze({
  key: 'inscription-circuit',
  mainRoadWidth: 56,
  startProgress: 0.02,
  centerline,
  minimapPath: centerline.map((p) => ({ ...p })),
  roadRibbons: [
    // Launch Yard: widest, fastest.
    { key: 'launch-straight', role: 'main', width: 60, shoulderWidth: 6, startProgress: 0, endProgress: 0.22 },
    { key: 'opening-sweep', role: 'main', width: 64, shoulderWidth: 7, startProgress: 0.22, endProgress: 0.42 },
    // Blackflag Wharf: the narrow technical pinch — boardwalk, not highway.
    { key: 'wharf-switchbacks', role: 'main', width: 46, shoulderWidth: 4.5, startProgress: 0.42, endProgress: 0.64 },
    // Layer23 Mesa: mid-width climb + descent.
    { key: 'mesa-climb', role: 'main', width: 52, shoulderWidth: 5, startProgress: 0.64, endProgress: 0.94 },
    { key: 'final-cut', role: 'main', width: 58, shoulderWidth: 6, startProgress: 0.94, endProgress: 1 },
  ],
  boostPads: [
    { key: 'launch-pad', progress: 0.1, side: 0 },
    { key: 'sweep-pad', progress: 0.27, side: 0.1 },
    { key: 'boardwalk-pad', progress: 0.52, side: 0 },
    { key: 'descent-pad', progress: 0.905, side: -0.1 },
  ],
  itemBoxes: [
    { progress: 0.06, side: -0.16 },
    { progress: 0.2, side: 0.16 },
    { progress: 0.34, side: -0.14 },
    { progress: 0.46, side: 0.16 },
    { progress: 0.6, side: -0.16 },
    { progress: 0.74, side: 0.14 },
    { progress: 0.88, side: -0.16 },
  ],
  // District + scenery anchors stay empty in the M1 graybox; the M3 dressing
  // pass keys off trackDef.key === 'inscription-circuit' instead.
  districtAnchors: [],
  sceneryAnchors: [],
});

export const INSCRIPTION_CIRCUIT_TRACK = Object.freeze({
  key: 'inscription-circuit',
  name: 'Inscription Circuit',
  tagline: 'Spaceport dusk → pirate wharf → mesa observatory',
  course: INSCRIPTION_CIRCUIT_COURSE,
  laps: 3,
  startOffset: 0.03,
  // Layer23 Mesa: the road climbs the west rim and comes back down — the
  // crest (≈0.855, right at the W9 rim) is the signature airtime moment,
  // jumping into the descent panorama. Peak 24 world units.
  elevation: { bridgeBand: { from: 0.76, peak: 24, to: 0.95 }, crestLaunch: true },
  ramps: [
    // Opening-sweep kicker for small air tricks; off the racing line so it's
    // a deliberate line choice, not a trap.
    { progress: 0.3, side: -0.55 },
  ],
  // The Inscription slab cut: a boost-speed-only ramp on the final corner
  // (inside of the W1 left-hander) that jumps the corner and rejoins the
  // launch straight. Miss the speed and you crawl back on.
  shortcut: {
    failFlightTime: 0.8,
    failLandProgress: 0.988,
    failSpeed: 40,
    failSpin: 1.6,
    flightTime: 1.35,
    landProgress: 0.035,
    launchProgress: 0.952,
    minSpeed: 225,
    peakHeight: 22,
    side: -0.65,
  },
  crossers: [
    // The Blackflag cannon battery (prop placed in M3) fires rolling shot
    // across the switchback apex — slow, narrow, dodgeable, always cycling.
    { key: 'wharf-cannonball', progress: 0.475, direction: 1, speed: 0.5, width: 0.18, modelType: 'cannonball' },
  ],
  // Inscription-dusk palette: dark carved stone ground, indigo→teal→burnt
  // orange dusk sky. District light languages (teal runway / lantern gold /
  // beacon violet+gold) ride on top via the visual schema + M3 dressing.
  palette: {
    clearColor: '#0d0a1c',
    sky: [
      [0, '#070a1e'],
      [0.42, '#14224a'],
      [0.66, '#274a68'],
      [0.83, '#8a5a54'],
      [1, '#ff9a4a'],
    ],
    ground: {
      base: '#2a2136',
      repeat: 16,
      speckles: [
        { color: '#352a48', count: 320, size: 3.2 },
        { color: '#201a30', count: 300, size: 4.0 },
        { color: '#43335c', count: 140, size: 2.0 },
      ],
    },
    // Road language: teal rail light, orange/white curbs (Launch Yard leads
    // the lap, so its language opens the race; M3 bands the rest).
    curb: { a: '#ff8b21', b: '#f4f0ff' },
    rail: '#2ee6c8',
    wall: { a: '#3a2c4e', b: '#f4f0ff' },
    // Mesa band: dark stone skirts, gold beacon glow, violet pillars.
    bridge: { skirt: '#241a36', glow: '#ffd34f', pillar: '#4a3a66', pillarEmissive: '#2a2040', beam: '#322448' },
    fog: { color: '#322a52', near: 210, far: 760 },
    hemi: { sky: '#8690e0', ground: '#221a3a', intensity: 3.15 },
    sunColor: '#ffd0a0',
    rimLightColor: '#3fe0c8',
    heroRim: { power: 2.2, strength: 0.45, tint: '#3fe0c8' },
  },
  visual: {
    schemaVersion: TRACK_VISUAL_SCHEMA_VERSION,
    key: 'inscription-circuit-visuals',
    road: {
      asphalt: {
        base: '#2a2438',
        speckles: [
          { color: '#352c48', count: 420, size: 2.4 },
          { color: '#1f1a2e', count: 360, size: 3.1 },
          { color: '#453a5e', count: 130, size: 1.6 },
        ],
      },
      bands: [
        { key: 'launch-straight', startProgress: 0, endProgress: 0.22, width: 60, shoulderWidth: 6, laneMarking: 'center-dash' },
        { key: 'opening-sweep', startProgress: 0.22, endProgress: 0.42, width: 64, shoulderWidth: 7, laneMarking: 'center-dash' },
        // Boardwalk planks — no painted center line in the wharf.
        { key: 'wharf-switchbacks', startProgress: 0.42, endProgress: 0.64, width: 46, shoulderWidth: 4.5, laneMarking: 'none' },
        { key: 'mesa-climb', startProgress: 0.64, endProgress: 0.94, width: 52, shoulderWidth: 5, laneMarking: 'center-dash' },
        { key: 'final-cut', startProgress: 0.94, endProgress: 1, width: 58, shoulderWidth: 6, laneMarking: 'center-dash' },
      ],
      barrier: { enabled: true, railColor: '#2ee6c8', wallA: '#3a2c4e', wallB: '#f4f0ff' },
      curb: { colorA: '#ff8b21', colorB: '#f4f0ff', enabled: true, width: 3.2 },
      laneMarkings: { color: '#ffb23e', enabled: true, everySamples: 4, mode: 'center-dash' },
      shoulder: { color: '#1c1628', enabled: true, width: 5.5 },
    },
    // District edge-light language: teal runway, lantern gold, beacon violet.
    districtCues: [
      { key: 'launch-yard', progress: 0.06, side: 1, span: 0.05, accent: '#2ee6c8', base: '#16283e' },
      { key: 'blackflag-wharf', progress: 0.48, side: -1, span: 0.05, accent: '#ffb23e', base: '#1c1210' },
      { key: 'layer23-mesa', progress: 0.78, side: 1, span: 0.05, accent: '#b08aff', base: '#241a36' },
    ],
    finishGate: { beacon: '#2ee6c8', halo: '#ffb23e', trim: '#f4f0ff' },
    materialFamilies: {
      contact: 'carved-stone-contact',
      districtEdge: 'inscription-edge-glow',
      road: 'inscription-stone-asphalt',
    },
    placements: [
      { key: 'launch-edge-pylons', assetId: 'barrier.neon-pylon', color: '#2ee6c8', startProgress: 0, endProgress: 0.42, every: 0.035, offset: 5, sides: [-1, 1], maxInstances: 40 },
      { key: 'wharf-lantern-pylons', assetId: 'barrier.neon-pylon', color: '#ffb23e', startProgress: 0.42, endProgress: 0.64, every: 0.03, offset: 4, sides: [-1, 1], maxInstances: 24 },
      { key: 'mesa-beacon-pylons', assetId: 'barrier.neon-pylon', color: '#b08aff', startProgress: 0.64, endProgress: 1, every: 0.035, offset: 5, sides: [-1, 1], maxInstances: 34 },
    ],
  },
  budgets: { finishSeconds: 58, speedFloor: 130 },
});
