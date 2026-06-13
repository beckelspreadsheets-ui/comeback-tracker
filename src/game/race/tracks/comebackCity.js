// TrackDefinition for Comeback City — the original neon GP. Pure data (no
// THREE, no asset imports) so node gate scripts can import it directly.
// The course geometry/anchors live in courseV2.js; this bundles everything
// the runtime used to hardcode: elevation, ramps, the dare shortcut, laps,
// spawn offset, and the QA gate budgets.
import { COMEBACK_CITY_COURSE_V2 } from '../../courseV2.js';

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
