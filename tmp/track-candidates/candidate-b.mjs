// CANDIDATE B — "Downtown Deadline"
//
// THESIS: technical. The lap is a city block grid, so it is built out of
// square corners, staircase chicanes through the service streets and two
// stop-and-turn switchbacks in the old town. Radii sit in the 80-160 band
// where the shipped tracks have nothing, which is the direct answer to the
// finding that "almost every corner is taken the same way". Rhythm is the
// skill: brake, turn, brake, turn, then one long Expressway where all of it
// pays off or does not.
//
// The cost of the thesis, stated up front: it is the busiest of the three and
// the one most likely to feel like work rather than flow. It also asks the
// most of the art pass — 17 corners of downtown need 17 corners of city.

import { makeCandidate } from './candidate-kit.mjs';

// Driving order. x east, z south. Start straight east along the north edge,
// two staircase chicanes south-east through the blocks, down the east side,
// west along the Expressway, then the Old Town switchbacks and the final
// sequence back onto the start straight.
const WAYPOINTS = [
  { x: -1950, z: -1250 }, // 1  Exchange Corner — onto the start straight
  { x: -500, z: -1250 }, // 2  T1 into the block grid
  { x: -500, z: -930 }, // 3  T2 staircase — chicane 1 with T1
  { x: 150, z: -930 }, // 4  T3
  { x: 150, z: -610 }, // 5  T4 staircase — chicane 2 with T3
  { x: 1250, z: -610 }, // 6  T5 onto the east avenue
  { x: 1250, z: -100 }, // 7  T6
  { x: 1600, z: 250 }, // 8  T7
  // T8/T9/T10 all moved in wave 7 fix round 1, for two measured reasons that
  // happen to share one edit.
  //
  // (1) THE EXPRESSWAY WAS TOO SHORT AT THE SPEED IT IS ACTUALLY DRIVEN.
  //     Round 0 measured it at 8.41 s against an 8-10 s target, but that was at
  //     the LAP MEAN of 260 u/s. Shipped telemetry pegs 285-286 on exactly the
  //     kind of mark a pass is set up on, and at 286 the same 2,186 u is
  //     7.64 s — under the floor, in the one situation the straight exists for.
  //     The leg goes 2,300 -> 2,600 u, which puts it at ~8.5 s at boost and
  //     still inside 10 s at the slowest a straight is ever driven flat out.
  // (2) B HAD NO SWEEPER. Every corner sat in a 134-178 sustained band except
  //     the two switchbacks, which is the same "every corner is taken the same
  //     way" complaint the shipped track earns, just at a different radius.
  //     Pulling T8 north steepens the approach diagonal so T9's deflection goes
  //     41 -> ~60 degrees, which is what lets it be authored as a real sweeper
  //     (see RADII) instead of a 41-degree turn that a big radius would only
  //     have flattened into a straight.
  { x: 1600, z: 780 }, // 9  T8
  { x: 1300, z: 1300 }, // 10 T9 — the Expressway begins, and B's only sweeper
  { x: -1300, z: 1300 }, // 11 T10 — the Expressway ends, hard, into the tight stuff
  { x: -1600, z: 900 }, // 12 T11
  { x: -1600, z: 150 }, // 13 T12 OLD TOWN SWITCHBACK 1 — stop and turn
  { x: -1000, z: 650 }, // 14 T13 OLD TOWN SWITCHBACK 2 — stop and turn the other way
  { x: -1100, z: -100 }, // 15 T14
  { x: -1500, z: -450 }, // 16 T15
  { x: -1361, z: -658 }, // 17 T16 — chicane 3 with T15
];

// Radii in world units. The whole point of this candidate is the 80-160 band:
// Comeback City authors 111-183 and Penguin Village 88-165, so every corner on
// both shipped tracks is taken at roughly the same speed.
const RADII = [
  110, // 1  Exchange Corner
  130, // 2  T1
  130, // 3  T2
  130, // 4  T3
  130, // 5  T4
  120, // 6  T5
  150, // 7  T6
  150, // 8  T7
  120, // 9  T8
  // 210, not 130. This is the one corner on B that is allowed out of the
  // technical band, and it is the right one: it is the gateway onto the
  // Expressway, so it is the corner where carrying speed pays for the whole
  // straight. A candidate whose radii all sit within 45 units of each other has
  // one corner shape, however many corners it has — the fault B exists to fix.
  // The paired waypoint move gives it ~60 degrees of deflection so the radius
  // buys a held drift rather than just erasing the corner.
  210, // 10 T9 — opens onto the Expressway: B's only sweeper, deliberately
  110, // 11 T10
  140, // 12 T11
  85, // 13 T12 switchback
  85, // 14 T13 switchback
  140, // 15 T14
  130, // 16 T15
  130, // 17 T16
];

export const CANDIDATE_B = makeCandidate({
  key: 'cc4x-b-downtown',
  name: 'B — Downtown Deadline',
  tagline: 'Technical: 17 corners, two switchbacks, one Expressway',
  thesis: 'technical',
  waypoints: WAYPOINTS,
  radii: RADII,
  mainRoadWidth: 52,
  roadRibbons: [
    { key: 'start-avenue', role: 'main', width: 60, shoulderWidth: 7, startProgress: 0, endProgress: 0.09 },
    { key: 'block-staircase', role: 'main', width: 46, shoulderWidth: 5.5, startProgress: 0.09, endProgress: 0.2 },
    { key: 'east-avenue', role: 'main', width: 52, shoulderWidth: 6, startProgress: 0.2, endProgress: 0.42 },
    { key: 'expressway', role: 'main', width: 64, shoulderWidth: 7.5, startProgress: 0.42, endProgress: 0.66 },
    { key: 'old-town', role: 'main', width: 44, shoulderWidth: 5, startProgress: 0.66, endProgress: 0.83 },
    { key: 'civic-return', role: 'main', width: 50, shoulderWidth: 6, startProgress: 0.83, endProgress: 1 },
  ],
  boostPads: [
    { key: 'exchange-pad', progress: 0.07, side: 0 },
    { key: 'east-avenue-pad', progress: 0.39, side: 0.18 },
    { key: 'expressway-pad', progress: 0.57, side: -0.2 },
    { key: 'civic-pad', progress: 0.89, side: 0.22 },
  ],
  itemBoxes: [
    { progress: 0.03, side: -0.18 },
    { progress: 0.145, side: 0.16 },
    { progress: 0.34, side: -0.16 },
    { progress: 0.5, side: 0.18 },
    { progress: 0.64, side: -0.18 },
    { progress: 0.72, side: 0.16 },
    { progress: 0.85, side: -0.16 },
    { progress: 0.96, side: 0.16 },
  ],
  ramps: [
    { progress: 0.3, side: -0.55 },
    { progress: 0.79, side: 0.5 },
  ],
  // The service-alley cut: skip the last corner before the Expressway and
  // arrive on it already at speed. Same risk/reward contract as the shipped
  // carousel dare — it only sticks above 234 u/s, and casing it drops you
  // into the wall of the block behind.
  shortcut: {
    launchProgress: 0.44,
    landProgress: 0.5,
    side: -0.7,
    minSpeed: 234,
    peakHeight: 20,
    flightTime: 1.35,
    failFlightTime: 0.8,
    failLandProgress: 0.47,
    failSpeed: 40,
    failSpin: 1.8,
  },
  // The Convention Center ramp — a short, steep hump on the run out of the
  // block staircase, with a free launch off the crest.
  //
  // Moved 0.011 of a lap earlier in wave 7 fix round 1. Lengthening the
  // Expressway lengthened the lap, which shifts every progress-addressed beat
  // slightly backwards relative to the corners — enough that C5 fell to exactly
  // 1.50 s of announcement, hidden by this crest, and joined the strict-sight
  // miss list. Nothing is wrong with C5; the occluder had drifted onto its
  // shoulder. Pulling the band back restores the gap. The lesson generalises
  // and is worth stating for whoever builds the picked layout: progress-space
  // beats are NOT invariant under a length change, so re-run the sightline gate
  // after any centerline edit, however local the edit looks.
  elevation: { bridgeBand: { from: 0.196, peak: 27, to: 0.238 }, crestLaunch: true },
  coinRows: [
    0.01, 0.04, 0.07, 0.1, 0.14, 0.17, 0.2, 0.23, 0.27, 0.3, 0.34, 0.37, 0.4, 0.44, 0.48, 0.51, 0.54, 0.58, 0.61,
    0.64, 0.67, 0.71, 0.74, 0.77, 0.8, 0.84, 0.87, 0.9, 0.93, 0.97,
  ],
  notes: { startLabel: 'Exchange Avenue' },
});

export default CANDIDATE_B;
