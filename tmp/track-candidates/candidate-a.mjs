// CANDIDATE A — "Bayfront Sweep"
//
// THESIS: flow. One hard braking point, everything else held on the throttle.
// The lap is built out of big-radius sweepers a drift can be carried through,
// a chicane early to break the rhythm and teach it, and one enormous causeway
// straight across the bay that ends in the only genuine hairpin on the track.
// It is the layout that most rewards the mechanic the owner already called
// "amazing", because there are long corners to hold a drift in.
//
// The cost of the thesis, stated up front: it is the LEAST technical of the
// three. Corner count sits at the bottom of the 15-25 band, and a flowing loop
// is mostly convex, so it is the candidate that struggles hardest with the
// "at least a third of corners turn the other way" target.

import { makeCandidate } from './candidate-kit.mjs';

// Driving order. x east, z south (same frame as the shipped tracks). The lap:
// start straight east along the bottom, chicane, four flowing sweepers up the
// east side, a tightening pair into the causeway, the causeway west across the
// bay, the hairpin, then three long esses back down the west side.
const WAYPOINTS = [
  { x: -1930, z: 1250 }, // 1  BOULEVARD HAIRPIN — the final corner, and the last place to take a place
  { x: -380, z: 1250 }, // 2  T1 flat-out entry to the chicane
  { x: -190, z: 1120 }, // 3  T2 Palm chicane, element 1
  { x: -30, z: 1200 }, // 4  T3 Palm chicane, element 2
  { x: 140, z: 1105 }, // 5  T4 Palm chicane, element 3
  { x: 1250, z: 1000 }, // 6  T5 Ocean Drive — the flyover straight runs into this
  { x: 1700, z: 620 }, // 7  T6
  { x: 1800, z: 60 }, // 8  T7
  { x: 1620, z: -420 }, // 9  T8
  { x: 1360, z: -700 }, // 10 T9 Marina dent (turns the other way)
  { x: 1430, z: -860 }, // 11 T10 Marina squeeze — second chicane; the shortcut cuts across here
  { x: 900, z: -1430 }, // 12 T11 causeway entry
  { x: -1750, z: -1430 }, // 13 T12 LIGHTHOUSE HAIRPIN — the one hard braking point
  { x: -1300, z: -830 }, // 14 T13 esse
  { x: -1700, z: -170 }, // 15 T14 esse
  { x: -1250, z: 480 }, // 16 T15 esse
];

// Per-corner fillet radii in world units, authored rather than discovered.
// Capped at 235: above ~250 the previewer stops seeing a corner at all.
const RADII = [
  105, // 1  BOULEVARD HAIRPIN — 130 degrees at r105 is the lap's second stop-and-turn
  220, // 2  T1
  120, // 3  T2 chicane
  110, // 4  T3 chicane
  120, // 5  T4 chicane
  235, // 6  T5
  205, // 7  T6
  195, // 8  T7
  180, // 9  T8
  140, // 10 T9 marina dent
  120, // 11 T10 marina squeeze
  155, // 12 T11
  100, // 13 T12 hairpin
  205, // 14 T13
  215, // 15 T14
  200, // 16 T15
];

export const CANDIDATE_A = makeCandidate({
  key: 'cc4x-a-bayfront',
  name: 'A — Bayfront Sweep',
  tagline: 'Flow: long drifts, one hairpin, a nine-second causeway',
  thesis: 'flow',
  waypoints: WAYPOINTS,
  radii: RADII,
  mainRoadWidth: 56,
  // Width is a design tool here, not decoration: the start straight and the
  // causeway are the two places eight karts have to exist side by side, so
  // they are the widest sections on the lap. The esses narrow, so the flowing
  // part still costs something.
  roadRibbons: [
    { key: 'start-boulevard', role: 'main', width: 62, shoulderWidth: 7, startProgress: 0, endProgress: 0.11 },
    { key: 'palm-chicane', role: 'main', width: 50, shoulderWidth: 6, startProgress: 0.11, endProgress: 0.17 },
    { key: 'ocean-drive', role: 'main', width: 56, shoulderWidth: 6.5, startProgress: 0.17, endProgress: 0.37 },
    { key: 'marina-squeeze', role: 'main', width: 46, shoulderWidth: 5.5, startProgress: 0.37, endProgress: 0.47 },
    { key: 'causeway', role: 'main', width: 64, shoulderWidth: 7.5, startProgress: 0.47, endProgress: 0.72 },
    { key: 'lighthouse-hairpin', role: 'main', width: 54, shoulderWidth: 6.5, startProgress: 0.72, endProgress: 0.79 },
    { key: 'west-esses', role: 'main', width: 50, shoulderWidth: 6, startProgress: 0.79, endProgress: 1 },
  ],
  boostPads: [
    { key: 'boulevard-pad', progress: 0.08, side: 0 },
    { key: 'ocean-exit-pad', progress: 0.32, side: 0.18 },
    { key: 'causeway-pad', progress: 0.55, side: -0.2 },
    { key: 'esse-inside-pad', progress: 0.82, side: 0.24 },
  ],
  itemBoxes: [
    { progress: 0.02, side: -0.18 },
    { progress: 0.12, side: 0.16 },
    { progress: 0.47, side: -0.16 },
    { progress: 0.62, side: 0.18 },
    { progress: 0.7, side: -0.18 },
    { progress: 0.885, side: 0.16 },
    { progress: 0.96, side: -0.16 },
  ],
  ramps: [
    { progress: 0.24, side: -0.55 },
    { progress: 0.765, side: 0.5 },
  ],
  shortcut: {
    launchProgress: 0.41,
    landProgress: 0.48,
    side: -0.7,
    minSpeed: 236,
    peakHeight: 24,
    flightTime: 1.5,
    failFlightTime: 0.85,
    failLandProgress: 0.44,
    failSpeed: 40,
    failSpin: 1.8,
  },
  // The Ocean Drive flyover. Deliberately NOT on the causeway: a crest in the
  // middle of the overtaking straight is exactly the fault the sightline gate
  // found on the shipped bridge (cc-C4, 0.44 s announcement), and the straight
  // a pass is set up on is the one place forward sight has to be longest.
  // The Bayfront flyover sits on the 1,006 u run out of the Palm chicane, and
  // the placement is the whole point: the crest lands at p0.19 and the next
  // corner entry is at p0.243, i.e. 605 u = 2.3 s later, comfortably past the
  // 1.5 s "no corner on the shoulder of a crest" rule. Peak 28 over a 518 u
  // band is a 17.0% gradient — inside the shipped, proven 17-18% range.
  elevation: { bridgeBand: { from: 0.168, peak: 28, to: 0.213 }, crestLaunch: true },
  // Coins scale WITH length (the shipped tracks run 8 rows over an 11 s lap;
  // 30 over 45 s keeps the same per-second density). They are not beats — one
  // InstancedMesh, a continuous reward for line choice, deliberately excluded
  // from the pacing numbers so they cannot hide the real gaps.
  coinRows: [
    0.01, 0.04, 0.07, 0.1, 0.14, 0.17, 0.2, 0.23, 0.27, 0.3, 0.34, 0.37, 0.4, 0.44, 0.48, 0.51, 0.54, 0.58, 0.61,
    0.64, 0.67, 0.71, 0.74, 0.77, 0.8, 0.84, 0.87, 0.9, 0.93, 0.97,
  ],
  notes: { startLabel: 'Bayfront Boulevard' },
});

export default CANDIDATE_A;
