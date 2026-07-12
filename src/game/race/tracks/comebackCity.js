// TrackDefinition for Comeback City — the original neon GP. Pure data (no
// THREE, no asset imports) so node gate scripts can import it directly.
// The course geometry/anchors live in courseV2.js; this bundles everything
// the runtime used to hardcode: elevation, ramps, the dare shortcut, laps,
// spawn offset, and the QA gate budgets.
import { COMEBACK_CITY_COURSE_V2 } from '../../courseV2.js';
import { TRACK_VISUAL_SCHEMA_VERSION } from './trackVisualSchema.js';

const COMEBACK_CITY_VISUAL_BANDS = COMEBACK_CITY_COURSE_V2.roadRibbons.map((ribbon, index) => ({
  curbWidth: index === 3 ? 3.8 : 3.2,
  endProgress: ribbon.endProgress,
  key: ribbon.key,
  laneMarking: 'center-dash',
  shoulderWidth: ribbon.shoulderWidth + (index % 2 === 0 ? 0.8 : 0.4),
  startProgress: ribbon.startProgress,
  width: ribbon.width,
}));

export const COMEBACK_CITY_TRACK = Object.freeze({
  key: 'comeback-city',
  name: 'Comeback City',
  tagline: 'The original neon GP',
  course: COMEBACK_CITY_COURSE_V2,
  laps: COMEBACK_CITY_COURSE_V2.laps || 3,
  // Spawn just past the finish line so the gate frames the lap wrap at
  // progress 0 without crowding the spawn camera.
  startOffset: 0.03,
  // Bridge band peaks at progress ~0.467 where the climb crosses over the
  // dive (which passes under at ~0.191); peak must clear kart visual
  // height. Measured from the generated centerline's self-intersection.
  // crestLaunch: the bridge top is a free ballistic launch (kicker + jump).
  elevation: { bridgeBand: { from: 0.4, peak: 21, to: 0.534 }, crestLaunch: true },
  // Procedural opening-facade run + roadside scatter are comeback-city-only
  // dressing; new tracks bring their own.
  dressing: { openingFacades: true, roadsideProps: true },
  // Additive palette: ONLY heroRim — every other atmosphere key stays
  // undefined so the track keeps running on the createScene fallbacks
  // (the original hardcoded neon dusk). B3 hero fresnel rim — owner
  // RE-PICK 2026-07-07 after seeing V7 live: V1 "whisper" ("v1 looks
  // cleanest for comeback city") — subtle tight edge in the track's
  // shared cyan (V1 carries no tint override; #4fd8ff is CC's fallback
  // rim tint).
  palette: {
    // K2.5 owner 2026-07-11: "the bridge is not visable ... it doesnt look
    // like you launch over it" — CC never set bridge colors, so the skirts/
    // pillars rendered in the near-black defaults and silhouetted into the
    // dusk. Gold underline = the finish-gate halo / ₿ accent language;
    // structure lifted to a readable steel-blue.
    bridge: { beam: '#3a4a70', glow: '#ffd34f', pillar: '#55688f', pillarEmissive: '#3a4a70', skirt: '#2e3d6e' },
    heroRim: { power: 3.2, strength: 0.22, tint: '#4fd8ff' },
  },
  visual: {
    schemaVersion: TRACK_VISUAL_SCHEMA_VERSION,
    districtCues: COMEBACK_CITY_COURSE_V2.districtAnchors.map((anchor) => ({
      accent: anchor.accent,
      base: anchor.dark,
      key: anchor.key,
      progress: anchor.progress,
      side: anchor.side,
      span: 0.036,
    })),
    finishGate: { beacon: '#36e2ff', halo: '#ffd34f', trim: '#f8fbff' },
    materialFamilies: {
      contact: 'soft-neon-contact',
      districtEdge: 'district-edge-glow',
      road: 'comeback-city-neon-asphalt',
    },
    road: {
      asphalt: {
        base: '#2c3450',
        speckles: [
          { color: '#3a4666', count: 420, size: 2.4 },
          { color: '#202840', count: 360, size: 3.1 },
          { color: '#46537a', count: 130, size: 1.6 },
        ],
      },
      bands: COMEBACK_CITY_VISUAL_BANDS,
      barrier: { enabled: true, railColor: '#36e2ff', wallA: '#e94d3f', wallB: '#f8fbff' },
      curb: { colorA: '#ff5d4f', colorB: '#f8fbff', enabled: true, width: 3.2 },
      laneMarkings: { color: '#ffd34f', enabled: true, everySamples: 4, mode: 'center-dash' },
      shoulder: { color: '#222b40', enabled: true, width: 6.2 },
    },
    placements: [
      {
        assetId: 'barrier.neon-pylon',
        color: '#36e2ff',
        endProgress: 0.98,
        every: 0.045,
        key: 'neon-edge-pylons',
        kind: 'barrier-family',
        maxInstances: 42,
        offset: 5.5,
        scale: 1,
        sides: [-1, 1],
        startProgress: 0.04,
      },
    ],
  },
  // Ramps live on the straights, off the center line so they're a
  // deliberate line choice; the bridge crest is a free natural launch.
  ramps: [
    { progress: 0.075, side: -0.35 },
    { progress: 0.685, side: 0.35 },
  ],
  // Shortcut dare-ramp: jump the entire south carousel from the inside
  // line. Only sticks if you arrive ABOVE natural top speed; case it slow
  // and you crash-land mid-corner. Risk ≈ 4-5s lost, reward ≈ 2-3s won.
  shortcut: {
    failFlightTime: 0.85,
    failLandProgress: 0.272,
    failSpeed: 40,
    failSpin: 1.8,
    flightTime: 1.55,
    landProgress: 0.365,
    launchProgress: 0.212,
    minSpeed: 232,
    peakHeight: 26,
    side: -0.7,
  },
  // QA gate budgets (kart-playable): deterministic autoplay must finish
  // within finishSeconds and hold at least speedFloor mid-race.
  budgets: { finishSeconds: 45, speedFloor: 140 },
});
