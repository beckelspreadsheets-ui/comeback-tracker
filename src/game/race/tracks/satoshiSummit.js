// Satoshi Summit — the mountain-pass GP (third track, PREVIEW until the owner
// approves it; see PREVIEW_TRACKS in ./index.js). Pure data, node-importable.
//
// THE LAP, in driving order:
//   Hashrate Straight   the lap's overtaking zone, start/finish in front of the
//                       ski lodge (~2,500 u, ~10 s, the slipstream/items window)
//   Genesis Hairpin     T1, a stop-and-turn at the end of the straight
//   The Switchbacks     three climbing legs and two more hairpins (one right,
//                       one left) stacked up the mountain's east flank
//   Summit Climb        the last pull north to the pass
//   Beacon Carousel     a wide 180-degree drift round the giant B beacon and
//                       mining-rig station on the summit plateau
//   Descent Esses       four alternating bends falling ~60 units off the pass
//   Crevasse Run        boost pad -> the crevasse bridge, whose crest is a free
//                       BIG launch (crestLaunch) over the glowing fissure
//   Avalanche Gallery   the covered final corner onto the straight
//
// Authored as corners + fillet radii through buildCenterline (zero kinks by
// construction, every radius stated rather than discovered), then scaled to
// the lap length the other two tracks race at (see LAP_SCALE). Measured: 11,098
// units, 11 corners (0 kinks), a 10.2 s overtaking straight, every corner
// announced >= 1.65 s; autoplay races it in 139-141 s (CC ~141.6, PV ~138.9).
import { buildCenterline, validateCenterline } from './buildCenterline.js';

// x east / z south. Waypoint 0 is the gallery corner, so the lap's first
// centreline point (progress 0) is the exit of that corner: the straight.
const WAYPOINTS = [
  { x: -1350, z: 1350 }, // W0  AVALANCHE GALLERY — covered left onto the straight
  { x: 1020, z: 1350 }, // W1  GENESIS HAIRPIN a (end of the overtaking straight)
  { x: 1020, z: 1192 }, // W2  GENESIS HAIRPIN b -> leg 1 west
  { x: 250, z: 1192 }, // W3  switchback hairpin 1 a (right-hander)
  { x: 250, z: 972 }, // W4  switchback hairpin 1 b -> leg 2 east
  { x: 1200, z: 972 }, // W5  switchback hairpin 2 a (left-hander)
  { x: 1200, z: 752 }, // W6  switchback hairpin 2 b -> leg 3 west
  { x: 350, z: 752 }, // W7  onto the summit climb
  { x: 350, z: -400 }, // W8  BEACON CAROUSEL a
  { x: -150, z: -400 }, // W9  BEACON CAROUSEL b
  { x: -150, z: 120 }, // W10 descent esses 1
  // -600, not -560: 40 more units between the first two esses take the
  // second one's announcement from 1.50 s to 1.65 s (--strict-sight passes).
  { x: -600, z: -20 }, // W11 descent esses 2
  { x: -900, z: 180 }, // W12 descent esses 3
  { x: -1280, z: 100 }, // W13 descent esses 4 -> crevasse run south
];

// Fillet radii, authored. The three hairpins sit at 105-110 (tightest instant
// in the 90s — genuine stop-and-turns, clear of the 72 floor PV's dent proved
// drivable); the carousel is a 230 drift; the esses 150-200.
const RADII = [240, 78, 78, 115, 115, 115, 115, 170, 230, 230, 160, 150, 150, 200];

// Uniform scale on the WAYPOINTS only (radii fixed, so every corner keeps its
// shape and the length comes out of the straights) — the same move
// penguinVillage.js documents. 1.18 lands the lap at ~11,070 units, between
// the two shipped tracks, so a 3-lap race sits in their ~135-145 s band.
const LAP_SCALE = 1.18;
const SPACING = 26;

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

const centerline = recentreLoop(
  buildCenterline(
    WAYPOINTS.map((point) => ({ x: point.x * LAP_SCALE, z: point.z * LAP_SCALE })),
    { radius: RADII, spacing: SPACING }
  )
);
export const SATOSHI_SUMMIT_GEOMETRY = validateCenterline(centerline);

const SATOSHI_SUMMIT_COURSE = Object.freeze({
  key: 'satoshi-summit',
  mainRoadWidth: 56,
  startProgress: 0.005,
  centerline,
  minimapPath: centerline.map((p) => ({ ...p })),
  // Width carries the read: the widest road on the lap (the straight, 60) empties
  // into the narrowest (the Genesis Hairpin, 46), the carousel opens to 62 so the
  // drift round the beacon is a choice of lines, and the esses pinch to 50.
  roadRibbons: [
    { key: 'hashrate-straight', role: 'main', width: 60, shoulderWidth: 7, startProgress: 0, endProgress: 0.195 },
    { key: 'genesis-hairpin', role: 'main', width: 46, shoulderWidth: 5, startProgress: 0.195, endProgress: 0.265 },
    { key: 'switchbacks', role: 'main', width: 52, shoulderWidth: 6, startProgress: 0.265, endProgress: 0.545 },
    { key: 'summit-climb', role: 'main', width: 56, shoulderWidth: 6.5, startProgress: 0.545, endProgress: 0.625 },
    { key: 'beacon-carousel', role: 'main', width: 62, shoulderWidth: 7, startProgress: 0.625, endProgress: 0.725 },
    { key: 'descent-esses', role: 'main', width: 50, shoulderWidth: 5.5, startProgress: 0.725, endProgress: 0.875 },
    { key: 'crevasse-run', role: 'main', width: 56, shoulderWidth: 6.5, startProgress: 0.875, endProgress: 0.95 },
    { key: 'avalanche-gallery', role: 'main', width: 54, shoulderWidth: 6, startProgress: 0.95, endProgress: 1 },
  ],
  boostPads: [
    { key: 'lodge-pad', progress: 0.075, side: 0 },
    { key: 'switchback-pad', progress: 0.415, side: 0.2 },
    { key: 'summit-pad', progress: 0.59, side: -0.2 },
    // Straight into the crevasse bridge: the pad is what makes the jump BIG.
    { key: 'crevasse-pad', progress: 0.878, side: 0 },
  ],
  itemBoxes: [
    { progress: 0.02, side: -0.18 },
    { progress: 0.14, side: 0.16 },
    { progress: 0.29, side: -0.16 },
    { progress: 0.505, side: 0.18 },
    { progress: 0.665, side: -0.16 },
    { progress: 0.79, side: 0.16 },
    { progress: 0.945, side: -0.16 },
  ],
  // Dressing is placed procedurally by track key (summitDressing.js).
  districtAnchors: [],
  sceneryAnchors: [],
});

export const SATOSHI_SUMMIT_TRACK = Object.freeze({
  key: 'satoshi-summit',
  name: 'Satoshi Summit',
  tagline: 'Blue-hour mountain pass',
  course: SATOSHI_SUMMIT_COURSE,
  laps: 3,
  // A world distance written as a progress fraction (see comebackCity.js):
  // ~83 units past the gate on this lap, same as the other two.
  startOffset: 0.0075,
  elevation: {
    // THE CREVASSE BRIDGE. A deck over the fissure on the run south from the
    // esses; its crest is a free BIG launch. Peak 26 over 0.045 of the lap
    // (~498 u) is a 16.4% max gradient, inside the shipped 17-18% range. The
    // crest (p0.9095) sits ~600 u (2.5 s) before the gallery corner's entry, so
    // no corner lands on its shoulder. Terrain bands end at 0.885, clear of it.
    bridgeBand: { from: 0.887, peak: 26, to: 0.932 },
    crestLaunch: true,
    // THE CLIMB. Signed sin^2 bands summed (same form as the other tracks):
    // 0 on the straight, ~18 at the first switchback hairpin, ~42 at the
    // second, ~50 on the summit climb, a ~62 plateau through the carousel, then
    // the esses fall back to the valley floor by p0.885. Max gradient ~4.9%.
    terrain: [
      { from: 0.255, to: 0.66, amp: 41 },
      { from: 0.44, to: 0.885, amp: 53 },
      { from: 0.6, to: 0.82, amp: 12 },
    ],
    // Mountain fill (groundTerrain.js): the infield between passes is
    // interpolated from the road heights around it, so the switchback legs and
    // the summit loop sit on one continuous hillside instead of on dykes with
    // V-gullies between them. Opt-in; the shipped tracks omit it.
    fill: { halfReach: 260, radius: 620 },
  },
  ramps: [
    // One small kicker, off the racing line on the middle switchback leg. The
    // crevasse crest is the lap's ONE big jump.
    { progress: 0.385, side: -0.55 },
  ],
  shortcut: null,
  palette: {
    clearColor: '#0b0a26',
    // BLUE HOUR: the sun has just set. Deep indigo-violet at the top of frame,
    // turning through blue to teal at the plate rim, with a thin rose
    // afterglow on the horizon line itself — no sunset disc anywhere, which is
    // what keeps it apart from Comeback City's orange Miami dusk and Penguin
    // Village's amber storm break. horizonPower 1.7 maps the band the camera
    // frames (20-34 degrees) onto offsets ~0.63-0.84, so the ladder is authored
    // there.
    skyHorizonPower: 1.7,
    sky: [
      [0, '#06051a'],
      [0.3, '#100b36'],
      [0.5, '#1b1454'],
      [0.62, '#281f74'],
      [0.69, '#2c3388'],
      [0.75, '#2a4d93'],
      [0.8, '#2a6c9c'],
      [0.85, '#2f8a9f'],
      [0.9, '#4aa3a3'],
      [0.95, '#86b8b2'],
      [1, '#c49ab8'],
    ],
    // The key is the MOON, rising opposite where the sun went down: a cool
    // lavender-white disc 24 degrees up (high enough to throw a readable cast
    // shadow — PV's split-key note puts that floor at ~20).
    sun: { azimuthDeg: 32, distance: 190, elevationDeg: 24 },
    // A pale lavender rather than a white: the dome draws the disc at 2.2x
    // this colour, so a white key reads as a blown-out sun; this lands a lit
    // lavender moon. Intensity carries the same key energy (#d6dcff x 3.6).
    sunColor: '#9a9cc8',
    sunIntensity: 7.4,
    // Tight halo only: a moon does not paint the sky round it.
    skyGlow: [0.16, 0.02],
    clouds: {
      band: [0.5, 0.72],
      baseColor: '#4d4688',
      color: '#1e2152',
      deck: [0.3, 0.7],
      litAdd: 0,
      litColor: '#a7a2e6',
      litMix: 0.35,
      lowDeck: [0.36, 0.7],
      scale: 0.5,
      strength: 0.5,
      tone: [0.3, 0.6],
    },
    // Fog toward the cloud sea the pass looks down onto: a lavender-slate that
    // sits under the teal horizon in value, so the far snow sinks INTO the haze.
    fog: { color: '#5d6199', density: 0.0012, near: 230, far: 820 },
    // Cold sky fill, violet bounce off the snow.
    hemi: { sky: '#7b8fe0', ground: '#3c3468', intensity: 1.5 },
    // Magenta rim — the neon accent this track speaks in (CC is cyan, PV aurora
    // cyan), on the rim light and the hero fresnel.
    rimLightColor: '#ff86de',
    heroRim: { power: 2.3, strength: 0.42, tint: '#ff6ad5' },
    toonRamp: [44, 100, 156, 210, 255],
    ground: {
      // Blue-hour snow: the field takes the sky's colour, so it is a cool
      // periwinkle rather than white, and it sits well above the navy asphalt
      // (the road reads by value on every segment, not by its kerb).
      base: '#93a5d4',
      repeat: 38,
      relief: { displace: 0.24, normalAmplitude: 34 },
      sparkle: { color: '#e2e8ff', intensity: 0.42, repeat: 340 },
      speckles: [
        { color: '#7f92c4', count: 300, size: 3.4 },
        { color: '#c9d4f2', count: 320, size: 4.2 },
        { color: '#6a78ad', count: 170, size: 2.2 },
      ],
    },
    // Kerb: deep ink + magenta. A white tooth on a pale field is no edge (the
    // PV lesson), so one tooth is darker than the road and one is neon.
    curb: { a: '#1b1842', b: '#ff4fd8' },
    rail: '#36e2ff',
    wall: { a: '#262457', b: '#36e2ff' },
    // Packed-snow run-off shelf under the field's value, bank above it.
    roadVerge: { apron: '#4d5688', slope: '#b4c2ea' },
    roadPaint: {
      apronA: '#eef1ff',
      apronB: '#1b1d3c',
      centre: '#7ff3ff',
      edge: '#e9edff',
      grid: '#eef1ff',
      lap: '#ff4fd8',
    },
    // The crevasse bridge: dark slate skirts with a magenta underline, steel
    // pillars, cyan deck rails the driver sees from the deck.
    bridge: {
      beam: '#3a3e70',
      glow: '#ff4fd8',
      pillar: '#5a6194',
      pillarEmissive: '#2c3060',
      rail: '#36e2ff',
      skirt: '#24275a',
      underGlow: '#36e2ff',
    },
    // Fog-exempt backdrop rings (procedural, see summitBackdrop.js): haze them
    // toward the cloud-sea slate so the far range recedes into it.
    backdropHaze: { band: [0.26, 0.86], bottomFade: 0.12, color: '#56598f', far: 0.26, near: 0.12 },
    backdropGlow: [0.1, 0.02],
  },
  // Summit dressing (summitDressing.js) + its own start gantry.
  dressing: { satoshiSummit: true, customStartArch: true, arcticParticles: true },
  // Same proportional headroom the other two tracks carry over their ~140 s.
  budgets: { finishSeconds: 180, speedFloor: 130 },
});
