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

// ---------------------------------------------------------------------------
// AAA WAVE 8 — THE 4x LAP. Comeback City is now candidate C, "SKYLINE VIADUCT"
// (owner-picked from the three plan views in tmp/track-candidates/).
//
// WHAT CHANGED AND WHY. The shipped loop was 2,897 units — 11.15 s a lap, a
// 33.5 s race, and a longest straight of 2.19 s. That last number is the whole
// reason for this rebuild: 2.19 s is not a passing window, so there was never a
// place on either track to set a move up. Skyline is 11,643 units, 44.78 s a
// lap, a 134.35 s race, and its viaduct deck is a 2,528-unit / 9.72 s straight.
// Sixteen corners (7 sweeper, 2 hairpin, 7 turn, 0 kink) against the old five.
//
// WHY IT IS GENERATED AND NOT HAND-PLACED. The old centerline was 80 authored
// points, and two of the three worst geometry defects this project has had came
// out of that: a near-duplicate seam point that the uniform-parameterised
// CatmullRom whipped through (wave 7 round 1) and a join-angle kink on the
// start/finish line that took a swept search to remove (wave 7 round 2). Both
// are impossible here. `buildCenterline` runs exact straights between exact
// fillet arcs, so a radius is a number you STATE rather than one you measure
// off the sheet afterwards, and the previewer now reports ZERO kinks on a loop
// with three times the corners. The waypoints and radii below are candidate C's
// verbatim (tmp/track-candidates/candidate-c.mjs) — do not "tidy" them; every
// corner classification, straight length and beat gap in the measured sheet is
// downstream of these exact numbers.
//
// RECENTRING. The authored walk closes around (-1145, 119) with a half-extent
// of 1,716 units. The ground plane is the ONE piece of world geometry pinned to
// the origin (everything else — backdrop rings, dome, shadow rig — is camera
// or centreline anchored), so an off-origin loop would need a plane sized for
// the offset AND the extent. Recentring is a rigid translation: every length,
// radius, corner angle, sightline and lap time is invariant under it, and it
// takes the plane the loop needs from 6,032 units square down to 6,032 — i.e.
// it is the difference between a plane that has to cover 2,861 units of offset
// and one that only has to cover 1,716 units of track. Free, so do it.
import { buildCenterline } from './race/tracks/buildCenterline.js';

// Driving order, x east / z south. Start straight east, up and around the east
// lobe, west along the north edge through three chicanes, out to the far west,
// then the VIADUCT diagonally back across everything it just drove, and two
// stop-and-turn hairpins home. The lap CROSSES ITSELF at the viaduct crest —
// the deck passes ~30 units over the start/finish straight, which is the one
// thing on this track a player will describe to someone else.
const SKYLINE_WAYPOINTS = [
  { x: -1500, z: 1150 }, // C16 Harbour Corner — the last corner onto the start straight
  { x: 100, z: 1150 }, // C1  the viaduct passes 40u overhead ~210u ahead of here
  { x: 588, z: 454 }, // C2  east lobe
  { x: 432, z: -126 }, // C3  Plaza chicane
  { x: 508, z: -289 }, // C4  Plaza chicane
  { x: 54, z: -1157 }, // C5  onto the north edge
  { x: -796, z: -1157 }, // C6  Market chicane
  { x: -916, z: -1278 }, // C7  Market chicane
  { x: -1270, z: -1285 }, // C8  Rail chicane
  { x: -1467, z: -1423 }, // C9  Rail chicane
  { x: -2313, z: -1387 }, // C10
  { x: -2482, z: -1025 }, // C11
  { x: -2681, z: -910 }, // C12
  { x: -2892, z: -456 }, // C13 — the VIADUCT ramp begins here
  { x: -877, z: 1559 }, // C14 VIADUCT HAIRPIN — off the crest, hard left
  { x: -1768, z: 1684 }, // C15 HARBOUR HAIRPIN — stop and turn, back onto the straight
];

// Per-corner fillet radii in world units. Mid-band by design: the corners are
// the rhythm, the viaduct is the event. The two hairpins are the only radii
// under 120, which is what makes them the only two stop-and-turns on the lap.
const SKYLINE_RADII = [
  170, // C16 Harbour Corner
  190, // C1
  200, // C2
  130, // C3 chicane
  140, // C4 chicane
  185, // C5
  130, // C6 chicane
  135, // C7 chicane
  140, // C8 chicane
  140, // C9 chicane
  175, // C10
  160, // C11
  160, // C12
  150, // C13 — opens onto the viaduct
  100, // C14 VIADUCT HAIRPIN
  95, // C15 HARBOUR HAIRPIN
];

// 26, not the shipped 22: the lap is four times longer and a uniform
// CatmullRom does not need 530 control points to follow a 200-unit radius —
// and points sitting too close together is the single authoring mistake that
// produces a kink (see the wave-7 seam above).
const SKYLINE_SPACING = 26;

// Rigid translation onto the origin — see the RECENTRING note above. Exported
// because the track's world-space anchors (water, collision volumes) are
// derived from the same points rather than hand-typed, so nothing can go stale
// when the layout is retuned.
const recentreLoop = (points) => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.z < minZ) minZ = point.z;
    if (point.z > maxZ) maxZ = point.z;
  }
  const centreX = (minX + maxX) / 2;
  const centreZ = (minZ + maxZ) / 2;
  return points.map((point) => ({ x: point.x - centreX, z: point.z - centreZ }));
};

const centerline = recentreLoop(buildCenterline(SKYLINE_WAYPOINTS, { radius: SKYLINE_RADII, spacing: SKYLINE_SPACING }));

const minimapPath = centerline.map((point) => ({ ...point }));

// World-space anchor helper. Every absolute coordinate on this track used to be
// typed by hand against a 350-unit loop; at 1,716 units they would all have had
// to be retyped, and a stale one puts a building on the racing line (which is
// exactly what happened at the carousel entry, owner-reported 2026-06-12).
// These are DERIVED from the centerline instead, so they follow the layout.
// `progress` here is index-space, not arc length — good enough for scenery that
// only has to be near a section, and deliberately not used for anything the
// kart interacts with.
const anchorAt = (progress, side, distance) => {
  const count = centerline.length;
  const index = ((Math.round(progress * count) % count) + count) % count;
  const here = centerline[index];
  const next = centerline[(index + 1) % count];
  const dx = next.x - here.x;
  const dz = next.z - here.z;
  const length = Math.hypot(dx, dz) || 1;
  // sampler builds its normal as (-tangent.z, 0, tangent.x); match it so `side`
  // means the same thing here as it does everywhere else on the track.
  return {
    x: here.x + (-dz / length) * side * distance,
    z: here.z + (dx / length) * side * distance,
  };
};

// Evenly spaced hazard field for the legacy 2D racer (raceTracks.js). The kart
// runtime does not read these — it drops fish bones dynamically — but the field
// is still authored to the LAP rather than to a count, so it does not thin out
// to nothing on a track four times longer.
const bananaPlacements = Array.from({ length: 24 }, (_, index) => ({
  progress: Number(((index + 0.5) / 24).toFixed(4)),
  side: index % 3 === 0 ? -0.18 : index % 3 === 1 ? 0.2 : -0.1,
}));

export const COMEBACK_CITY_COURSE_V2 = Object.freeze({
  key: 'comeback-city',
  version: 'v2-skyline-4x',
  laps: 3,
  kartOnly: true,
  mainRoadWidth: 54,
  // 0.003, not the old 0.012. Both are "the finish gate sits just past the
  // seam", but a PROGRESS constant means a different world distance on a
  // different-length track: 0.012 was 35 units on the 2,897-unit loop and would
  // be 140 units here. This is that same 35 units, re-expressed.
  startProgress: 0.003,
  startLabel: 'Harbour Straight',
  centerline,
  minimapPath,
  // Width is C's second story, running alongside its elevation one. The market
  // row is the narrowest road on the lap; the viaduct deck is the widest thing
  // after the start straight, and it OPENS as it climbs, which is the opposite
  // of everything else here and is why the crossing reads as a set piece. The
  // twin hairpins drop 20 units off the deck they fall from, and the ribbon
  // starts at 0.85 — ~2 sigma of the runtime's width smoother ahead of C14's
  // 0.875 entry — so the full 42 is delivered by the time the corner arrives
  // rather than half of it.
  roadRibbons: [
    { key: 'harbour-straight', role: 'main', width: 60, shoulderWidth: 7, startProgress: 0, endProgress: 0.14 },
    { key: 'east-lobe', role: 'main', width: 54, shoulderWidth: 6.5, startProgress: 0.14, endProgress: 0.34 },
    { key: 'market-row', role: 'main', width: 44, shoulderWidth: 5, startProgress: 0.34, endProgress: 0.52 },
    { key: 'west-approach', role: 'main', width: 56, shoulderWidth: 6.5, startProgress: 0.52, endProgress: 0.625 },
    { key: 'viaduct', role: 'main', width: 62, shoulderWidth: 7.5, startProgress: 0.625, endProgress: 0.85 },
    { key: 'twin-hairpins', role: 'main', width: 42, shoulderWidth: 5, startProgress: 0.85, endProgress: 0.965 },
    { key: 'harbour-approach', role: 'main', width: 54, shoulderWidth: 6.5, startProgress: 0.965, endProgress: 1 },
  ],
  branches: [],
  // Telemetry-only classification zones (raceTelemetry.js). Re-seated onto the
  // new sections; nothing in the kart sim reads them.
  surfaceZones: [
    { key: 'harbour-asphalt', type: 'asphalt', progress: 0.06, radius: 140 },
    { key: 'plaza-wet-cleanup', type: 'wet', progress: 0.26, side: -8, radius: 18 },
    { key: 'market-row-grip', type: 'asphalt', progress: 0.43, radius: 90 },
    { key: 'viaduct-deck-clean', type: 'asphalt', progress: 0.74, radius: 120 },
    { key: 'hairpin-runoff-edge', type: 'offroad', progress: 0.915, side: 31, radius: 26 },
  ],
  // Candidate C's beats, verbatim. Four pads and seven boxes over a 44.8 s lap,
  // which with the ramps, the shortcut and the crest launch is 15 events at a
  // 2.99 s mean gap — MK8 pacing. The shipped 13-16 beats over an 11 s lap was
  // one every 0.70 s, i.e. a cram; this is the SAME authored content spread
  // across four times the road, which is the entire point of the rebuild and
  // the reason nothing here was multiplied to match the new length.
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
  bananaPlacements,
  // Five districts spread over the lap instead of bunched into its first third.
  // NONE sits inside 0.785-0.865: that band is the elevated viaduct, and a
  // district is placed at sampler.pointAt(progress), whose y IS the deck
  // height — an anchor there would hang a building 40 units in the air.
  districtAnchors: [
    {
      key: 'gym',
      accent: '#80ff62',
      base: '#3ca75b',
      dark: '#1f5f35',
      icon: 'dumbbell',
      label: 'GYM',
      progress: 0.155,
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
      progress: 0.3,
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
      progress: 0.44,
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
      progress: 0.585,
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
      progress: 0.905,
      roof: '#e4f8ff',
      setback: 92,
      side: 1,
    },
  ],
  // Legacy 2D-racer collision volumes, derived from the districts they belong
  // to rather than typed as absolute coordinates (see anchorAt).
  collisionZones: [
    { key: 'gym-facade', shape: 'circle', position: anchorAt(0.155, 1, 96), radius: 24 },
    { key: 'food-stalls', shape: 'circle', position: anchorAt(0.3, -1, 96), radius: 28 },
    { key: 'lab-tower', shape: 'circle', position: anchorAt(0.44, 1, 104), radius: 28 },
    { key: 'clinic-plaza-building', shape: 'circle', position: anchorAt(0.585, -1, 100), radius: 26 },
    { key: 'garage-hairpin-building', shape: 'circle', position: anchorAt(0.905, 1, 104), radius: 28 },
    { key: 'harbour-roundabout-core', shape: 'circle', position: anchorAt(0.985, -1, 150), radius: 22 },
  ],
  // Only `water` is still rendered (the W0 promotion deleted the procedural
  // skyline and the boxy bridge in favour of the painted backdrop rings and the
  // real viaduct geometry), so this is one anchor and three retired keys are
  // simply not authored any more.
  //
  // The bay sits outboard of the HARBOUR HAIRPIN, which is both the thematic
  // home for it and — measured, not guessed — the only place a 1200x560 sheet
  // of water fits on this layout. A sweep of every (progress, side, offset)
  // this helper can produce scored each candidate box by its distance to the
  // nearest centerline point; this one clears the road by 440 units and the
  // next best clears it by 198. The old hand-typed anchor would have put the
  // bay under the viaduct hairpin.
  sceneryAnchors: [
    { kind: 'water', ...anchorAt(0.94, -1, 720), w: 1200, d: 560, color: '#0ea5c8' },
  ],
  cameraCheckpoints: [
    { key: 'mobile-start', profile: 'mobile', progress: 0.012, targetBandFromBottom: [0.25, 0.33] },
    { key: 'desktop-start', profile: 'desktop', progress: 0.012, targetBandFromBottom: [0.14, 0.22] },
    { key: 'early-route-readability', profile: 'all', progress: 0.26 },
    { key: 'camera-viaduct-crest', profile: 'all', progress: 0.825, collisionClearanceMin: 1.5 },
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
