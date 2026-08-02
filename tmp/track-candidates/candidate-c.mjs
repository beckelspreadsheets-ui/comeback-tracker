// CANDIDATE C — "Skyline Viaduct"
//
// THESIS: one signature set piece, and a topology the other two cannot have.
// The lap CROSSES ITSELF. After the far side of the city it turns onto a
// viaduct that climbs 2.3 km diagonally back across the infield, passes 40
// units directly over the start/finish straight at its crest, launches, and
// drops into a pair of stop-and-turn hairpins. That crossing is the thing
// people describe when they describe a track, and it is visible from the grid
// on lap 1 — you watch the leaders go over your head.
//
// The crossing is structural, not decorative. A loop that crosses itself has
// to turn BOTH ways to close, so the handedness candidate A cannot reach (a
// smooth convex loop is ~30% non-dominant however it is tuned) falls out of
// the shape here for free.
//
// The cost of the thesis, stated up front: the viaduct is the most expensive
// single thing in any of the three candidates. It needs a deck, an underside,
// supports, and a road-over-road case the shipped bridge only half-solves at a
// quarter of the span. It is also the candidate whose lap is most front-loaded
// with corners and back-loaded with one enormous event.
//
// The centerline was authored as a TURN-AND-RUN sequence (walk.mjs) rather
// than by placing points: corner ANGLE decides whether a corner is a sweeper,
// a turn or a hairpin, and hand-placed points control position while leaving
// angle to chance. The coordinates below are that walk's output.

import { makeCandidate } from './candidate-kit.mjs';

// Driving order. x east, z south. Start straight east, up and around the east
// lobe, west along the north edge through three chicanes, out to the far west,
// then the VIADUCT back across everything, and two hairpins home.
const WAYPOINTS = [
  { x: -1500, z: 1150 }, // 1  Harbour Corner — 63 deg, the last corner onto the start straight
  { x: 100, z: 1150 }, // 2  T1 — the viaduct passes 40 u overhead ~210 u ahead of here
  { x: 588, z: 454 }, // 3  T2 east lobe
  { x: 432, z: -126 }, // 4  T3 Plaza chicane
  { x: 508, z: -289 }, // 5  T4 Plaza chicane
  { x: 54, z: -1157 }, // 6  T5 onto the north edge
  { x: -796, z: -1157 }, // 7  T6 Market chicane
  { x: -916, z: -1278 }, // 8  T7 Market chicane
  { x: -1270, z: -1285 }, // 9  T8 Rail chicane
  { x: -1467, z: -1423 }, // 10 T9 Rail chicane
  { x: -2313, z: -1387 }, // 11 T10
  { x: -2482, z: -1025 }, // 12 T11
  { x: -2681, z: -910 }, // 13 T12
  { x: -2892, z: -456 }, // 14 T13 — the VIADUCT ramp begins here
  { x: -877, z: 1559 }, // 15 T14 VIADUCT HAIRPIN — off the crest, hard left
  { x: -1768, z: 1684 }, // 16 T15 HARBOUR HAIRPIN — stop and turn, back onto the straight
];

// Radii in world units. Mid-band by design: C is neither A's sweeper track nor
// B's block grid. Its corners are the rhythm; the viaduct is the event.
const RADII = [
  170, // 1  Harbour Corner
  190, // 2  T1
  200, // 3  T2
  130, // 4  T3 chicane
  140, // 5  T4 chicane
  185, // 6  T5
  130, // 7  T6 chicane
  135, // 8  T7 chicane
  140, // 9  T8 chicane
  140, // 10 T9 chicane
  175, // 11 T10
  160, // 12 T11
  160, // 13 T12
  150, // 14 T13 — opens onto the viaduct
  100, // 15 T14 VIADUCT HAIRPIN
  95, // 16 T15 HARBOUR HAIRPIN
];

export const CANDIDATE_C = makeCandidate({
  key: 'cc4x-c-skyline',
  name: 'C — Skyline Viaduct',
  tagline: 'Set piece: a climbing viaduct that crosses over its own start straight',
  thesis: 'elevation',
  waypoints: WAYPOINTS,
  radii: RADII,
  mainRoadWidth: 54,
  roadRibbons: [
    { key: 'harbour-straight', role: 'main', width: 60, shoulderWidth: 7, startProgress: 0, endProgress: 0.14 },
    { key: 'east-lobe', role: 'main', width: 54, shoulderWidth: 6.5, startProgress: 0.14, endProgress: 0.34 },
    { key: 'market-row', role: 'main', width: 46, shoulderWidth: 5.5, startProgress: 0.34, endProgress: 0.52 },
    { key: 'west-approach', role: 'main', width: 52, shoulderWidth: 6, startProgress: 0.52, endProgress: 0.62 },
    { key: 'viaduct', role: 'main', width: 58, shoulderWidth: 7, startProgress: 0.62, endProgress: 0.88 },
    { key: 'south-loop', role: 'main', width: 50, shoulderWidth: 6, startProgress: 0.88, endProgress: 1 },
  ],
  boostPads: [
    { key: 'harbour-pad', progress: 0.09, side: 0 },
    { key: 'plaza-pad', progress: 0.3, side: 0.18 },
    { key: 'viaduct-pad', progress: 0.7, side: -0.2 },
    { key: 'south-loop-pad', progress: 0.965, side: 0.22 },
  ],
  itemBoxes: [
    { progress: 0.03, side: -0.18 },
    { progress: 0.16, side: 0.16 },
    { progress: 0.22, side: -0.16 },
    { progress: 0.38, side: 0.18 },
    { progress: 0.52, side: -0.16 },
    { progress: 0.77, side: 0.18 },
    { progress: 0.905, side: -0.16 },
  ],
  ramps: [
    { progress: 0.45, side: -0.55 },
    { progress: 0.63, side: 0.5 },
  ],
  // The rail-yard cut: leave the road inside the Rail chicane and rejoin on
  // the run to the viaduct ramp. Same contract as the shipped carousel dare —
  // it only sticks above 238 u/s, and casing it drops you in the sidings.
  shortcut: {
    launchProgress: 0.575,
    landProgress: 0.635,
    side: -0.7,
    minSpeed: 238,
    peakHeight: 22,
    flightTime: 1.45,
    failFlightTime: 0.85,
    failLandProgress: 0.605,
    failSpeed: 40,
    failSpin: 1.8,
  },
  // THE SET PIECE. The band is placed off the measured crossing: the lap
  // passes over itself at p0.843 (viaduct) / p0.009 (start straight) — 8.6 u
  // apart in plan, which is the same point of ground. Crest at p0.825 puts
  // 30 u of air over the start/finish line — half again the shipped bridge —
  // and leaves 582 u (2.2 s) of descent between the crest and the viaduct
  // hairpin's entry, which is what keeps that corner off the crest's shoulder.
  elevation: { bridgeBand: { from: 0.785, peak: 40, to: 0.865 }, crestLaunch: true },
  coinRows: [
    0.01, 0.05, 0.08, 0.11, 0.14, 0.18, 0.21, 0.24, 0.28, 0.31, 0.34, 0.37, 0.41, 0.44, 0.47, 0.5, 0.54, 0.57, 0.6,
    0.64, 0.67, 0.71, 0.74, 0.78, 0.81, 0.85, 0.88, 0.92, 0.95, 0.98,
  ],
  notes: { startLabel: 'Harbour Straight' },
});

export default CANDIDATE_C;
