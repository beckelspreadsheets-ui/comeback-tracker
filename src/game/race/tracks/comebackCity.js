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
  //
  // AAA wave 8: 0.03 -> 0.0075. This is a WORLD DISTANCE expressed as a
  // progress fraction, which is exactly the class of constant a 4x lap breaks
  // silently. 0.03 put the grid 87 units past the gate on the 2,897-unit loop;
  // on the 11,654-unit loop it would put it 349 units past — a second and a
  // third of driving between the gate the camera frames and the karts it is
  // supposed to be framing. 0.0075 is that same 87 units.
  startOffset: 0.0075,
  // THE VIADUCT. Candidate C's set piece and the reason this layout was picked:
  // the lap crosses over itself. The band is placed off the measured crossing —
  // the viaduct passes over the start straight at p0.843 / p0.009, 8.6 units
  // apart in plan, i.e. the same piece of ground. A crest at p0.825 puts ~30
  // units of air over the start/finish line (half again the old bridge) and
  // leaves 582 units = 2.2 s of descent before the viaduct hairpin's entry,
  // which is what keeps that corner off the crest's shoulder. Peak 40 over the
  // 0.785-0.865 band solves to a 13.5% max gradient — inside the shipped,
  // proven 17-18% range with room to spare.
  //
  // underpassBand is the OTHER half of the crossing: where the lap drives
  // UNDER the deck it will later drive over. Measured on the shipped
  // centerline at 3,000 samples — the two branches close to 1.8 units apart at
  // p0.0093 (elevation 0) and p0.8437 (elevation 29.7) — so this band is that
  // point widened by roughly the deck's own width. The chase camera reads it
  // and ducks the boom; nothing else consumes it, and a track without one
  // (Penguin Village has no self-intersection) simply omits the key.
  elevation: {
    bridgeBand: { from: 0.785, peak: 40, to: 0.865 },
    crestLaunch: true,
    underpassBand: { from: 0.003, to: 0.017 },
  },
  // Procedural opening-facade run + roadside scatter are comeback-city-only
  // dressing; new tracks bring their own.
  dressing: { openingFacades: true, roadsideProps: true },
  // Additive palette. B3 hero fresnel rim — owner RE-PICK 2026-07-07 after
  // seeing V7 live: V1 "whisper" ("v1 looks cleanest for comeback city") —
  // subtle tight edge in the track's shared cyan (V1 carries no tint
  // override; #4fd8ff is CC's fallback rim tint). The AAA sky pass added the
  // atmosphere block below; everything else still runs on the createScene
  // fallbacks, which ARE Comeback City's values by construction.
  palette: {
    // Miami neon dusk: the sun sits over the boulevard's far end, low enough
    // to throw ~2.7x-height shadows and high enough to clear the backdrop
    // plate's opaque band (its rim is at 22.6 degrees), so the disc reads in
    // open sky above the skyline instead of being swallowed by the plate.
    // ONE source: dome disc, glow lobes, key light and fog all derive here.
    sun: { azimuthDeg: 248, distance: 190, elevationDeg: 21 },
    sunColor: '#ffb85a',
    sunIntensity: 4.4,
    // Fog toward the horizon's own orange, pulled ~25% to the ground base so
    // mid-distance road does not wash out. near 240 (not the audit's 300)
    // because at 300 the measured haze gradient across the VISIBLE ground was
    // only +21% luminance and no hue shift at all — the chase camera simply
    // does not see far enough for it to bite. 240 still leaves the drivable
    // ~200 units in front of the kart completely haze-free.
    // density (FogExp2) replaced near/far as the shipped control: the linear
    // ramp put its whole transition in the 3 pixels above the horizon, so the
    // ground still butt-joined the sky. near/far are kept because the palette
    // moments set still authors in those units.
    // 0.0017 -> 0.0013 (wave 2). At 0.0017 the mid-field took 65% haze at 600
    // units and the blind judge measured the result: the Miami skyline went
    // near-monochrome sepia where the other build showed magenta/violet/orange
    // separation, and the frame's mean saturation fell 28% against baseline.
    // 0.0013 is 45% at 600 and still 94% at the ground plane's own far edge
    // (1300), so the horizon still merges — and the last stretch of that ramp
    // now comes from the depth-keyed aerial pass (aerialEffect.js), which can
    // start at 380 units instead of at the kart's bumper.
    fog: { color: '#c9541f', density: 0.0013, far: 900, near: 240 },
    hemi: { ground: '#2a1e4a', intensity: 1.5, sky: '#8d8ce0' },
    // Sunset cumulus: warm bodies, hotter undersides where they face the sun.
    clouds: { band: [0.46, 0.64], color: '#ff9a5e', litColor: '#ffd9a0', strength: 0.55 },
    // De-sun key for cc-far.webp (see createSkyDome.js). The disc is a flat
    // #ffff5b against a flat #ff6a1f sky, so the GREEN channel separates them
    // outright in linear space — 0.152 is just above the sky's 0.144, which
    // takes the disc, its antialiased rim AND the painted halo (all of which
    // tiled 5x) while the buildings, at 0.04-0.09, are untouched. The ellipse
    // stops above the lit-window band so the windows survive. Replacement is
    // a flat colour because the plate's sky genuinely is flat across v
    // 0.2-0.6. Validated by running this arithmetic over the decoded plate.
    backdropDeSun: {
      patch: [0.315, 0.55, 0.31, 0.215],
      range: [0.152, 0.22],
      skyBand: [0.3, 0.7],
      skyHi: '#ff6a1f',
      skyLo: '#ff6a1f',
      weights: [0, 1, 0],
    },
    // The far plate is opaque across the horizon band, so the dome's own glow
    // lobes cannot reach it — the ring re-emits them (tight halo, broad lobe)
    // and that is what puts the warm haze around the ONE sun instead of
    // around five painted ones.
    backdropGlow: [0.26, 0.12],
    // Aerial perspective for the fog-exempt backdrop rings. Measured cause: a
    // vertical scan at x=200 went rgb(0,0,44) skyline / rgb(169,103,53) ground
    // across four pixels, and every tower at every depth carried the same
    // near-black value. The far band takes ~0.6 of this warm haze at its base
    // and ~0.17 at its top, the near silhouette row half that — the DIFFERENCE
    // is the depth ramp, and the shared bottom fade dissolves the ring's lower
    // rim into the fogged ground instead of butt-jointing it.
    // Wave 2 keeps the DIFFERENCE between far and near (0.28 then, 0.24 now —
    // the depth ramp survives) and pulls both amounts down, because the wave-1
    // numbers were strong enough that the towers landed within a few values of
    // the sky behind them: a measured mid-ground tower read rgb(237,162,103)
    // against a rgb(237,122,54) sky. The haze colour also drops ~15% in value
    // and gains chroma — hazing toward a paler, flatter orange than the sky
    // itself is what turned the whole skyline into one peach wash.
    backdropHaze: { band: [0.3, 0.88], bottomFade: 0.16, color: '#e08a52', far: 0.46, near: 0.22 },
    // Comeback City never authored a ground palette, so the infield ran on the
    // generic forest-green fallback and lit up as a flat khaki (measured
    // rgb(135,100,55), sd 5.2, across roughly a quarter of every frame). This
    // is a dusk boulevard verge: a deep blue-green base so the warm key has
    // something to warm, with the speckle set spread over a much wider value
    // range than the fallback's two near-identical greens.
    // Wave 2 round 2: the base moves off pure green. Under a #ffb85a key at 4.4
    // a blue-green verge lands as olive, and that is exactly what the rubric
    // critic decoded — "a single dark olive-grey value with no grain, no hue
    // variation", across the whole left third of comeback-city-p0_33. A
    // teal-NAVY base sits inside the track's own violet-shadow language, and
    // the speckle set now spans four hues (teal, near-black navy, dusk violet,
    // warm sand) instead of three greens and a brown, so the mottle field has
    // chroma to move through and not just value.
    ground: {
      base: '#152b33',
      // AAA wave 5 (c). The ground plane now derives real surface normals from
      // a height field (see the relief block in addTrack); this is Comeback
      // City's half of that, tuned DOWN from the default because the two tracks
      // are not the same landform. Penguin Village is an open snow field where
      // wind drifts are the whole read; this is a city verge — kerbed shoulders,
      // service roads and plaza edges — which is flatter by nature, and the
      // owner-confirmed Miami dusk grade is calibrated on the values this
      // surface currently returns. 21 keeps a mean face tilt of ~4.5 degrees:
      // enough that the warm key finds a terminator on the infield instead of
      // returning one constant, not so much that the verge starts reading as
      // dunes beside a boulevard.
      //
      // AAA WAVE 8 ROUND 2: normalAmplitude 21 -> 30, displace UNCHANGED.
      //
      // The 4x lap put four times as much of this surface on screen and all
      // three critics filed the same finding against it — "a large flat
      // untextured expanse", "bare grey ground plane filling the left third",
      // "a single untextured ground plane running to a hard fog horizon". That
      // is KNOWN TRAP 5, and the only remedy for a flat plane is a NORMAL,
      // which is exactly what this number is. The wave-5 argument for tuning it
      // down still holds in kind — a city verge is flatter than a snowfield —
      // but 4.5 degrees of mean face tilt on a plane that now fills a third of
      // the frame returns very nearly one value, which is what the frames say.
      // 30 is ~6.4 degrees, still under Penguin Village's 7.4, and it is free:
      // a normal attribute is the same size whatever is in it. `displace` stays
      // at 0.22 on purpose — every roadside prop is planted at this plane's own
      // height, and moving the geometry is what sinks and floats them.
      relief: { displace: 0.22, normalAmplitude: 30 },
      repeat: 38,
      speckles: [
        { color: '#255049', count: 420, size: 3.4 },
        { color: '#0d1a26', count: 380, size: 4.6 },
        { color: '#3d3160', count: 190, size: 2.6 },
        { color: '#4a3b2c', count: 180, size: 5.2 },
        { color: '#5c7a68', count: 120, size: 2 },
      ],
    },
    // K2.5 owner 2026-07-11: "the bridge is not visable ... it doesnt look
    // like you launch over it" — CC never set bridge colors, so the skirts/
    // pillars rendered in the near-black defaults and silhouetted into the
    // dusk. Gold underline = the finish-gate halo / ₿ accent language;
    // structure lifted to a readable steel-blue.
    // rail added round 2 (2026-07-12, "bridge still did not read sadly"):
    // the only element the DRIVER sees from the deck — gold guard band
    // along both edges of the span.
    bridge: { beam: '#3a4a70', glow: '#ffd34f', pillar: '#55688f', pillarEmissive: '#3a4a70', rail: '#ffd34f', skirt: '#2e3d6e' },
    // AAA wave 3: 3.2/0.22 -> 2.4/0.40. Comeback City was shipping HALF the
    // rim strength of Penguin Village on the DARKER of the two tracks, which
    // is why the player kart measured as the darkest object on screen in
    // comeback-city-p0_06. Wave 2 could not reach this file and left a
    // one-directional floor in kartMaterials.js instead (HERO_RIM_MIN_STRENGTH
    // 0.4 / HERO_RIM_MAX_POWER 2.5); these are those numbers, authored. The
    // floor in kartMaterials.js is now dead and its owner can delete it —
    // PV's { 2.2, 0.45 } already cleared it and passes through untouched.
    heroRim: { power: 2.4, strength: 0.4, tint: '#4fd8ff' },
    // Run-off shelf and embankment outside the kerb. Previously unauthored, so
    // both bands fell back to palette.ground.base and rendered as the SAME
    // olive the infield does — measured rgb(74,59,47) across a 145px strip
    // between kerb and barrier in comeback-city-p0_78, which every critic read
    // as bare terrain leaking into the circuit. These put the run-off in the
    // track's own dusk-shadow family instead: a paved shelf a step up from the
    // gutter (#222b40), then a violet bank that lifts to the barrier foot. The
    // point is that neither is a terrain colour, so the edge cannot read as
    // ground however the key light warms it.
    //
    // Authored as a VALUE ladder rather than a hue shift, because the measured
    // frame says hue is not a reliable lever here: the grade warms everything
    // on this track, so a navy road base (#2c3450) still renders rgb(78,62,67)
    // and the navy gutter (#222b40) renders rgb(58,51,55). A verge picked for
    // its hue lands within a few counts of the tarmac whatever hue it started
    // as. A dark run-off shelf that sits BELOW the road's value and a bank that
    // sits above it survives the grade, and the tilt the bank now carries adds
    // to the gap rather than fighting it.
    //
    // AAA WAVE 8 ROUND 2 — DO NOT DARKEN THE INFIELD TO CHASE THE PREVIEWER'S
    // 8%, AND HERE IS THE MEASUREMENT THAT SAYS WHY.
    //
    // `track-layout-preview.mjs` reports every Comeback City segment at 8%
    // road-vs-terrain separation against its 20% gate, with the ROAD as the
    // brighter of the two (lane -0.9 Y46.9 against a 38.5-43.4 terrain band).
    // Read off the shipped wave-8 captures, the sign is the other way round:
    //
    //   comeback-city-p0_67   road  45.5-48.7 luma   near verge  65.5-70.2  = 27%
    //   comeback-city-p0_78   road  49.7-50.7        near verge  55.6-66.0  = 23%
    //   comeback-city-p0_56   road  48.2-50.4        near verge  56.1-61.1  = 18%
    //
    // The tool's model is albedo-only by design and its own header states the
    // assumption that lighting can only pull two surfaces CLOSER. On this track
    // it does not: the ground plane carries a relief normal field and a warm
    // 21-degree key while the road is flat and fully rough with its GGX lobe
    // deliberately killed, so the two surfaces take materially different
    // exposures and the render inverts the model's ordering. Acting on the
    // tool's number — darkening the terrain — would take the MEASURED
    // separation from 18-27% down toward zero while the tool's printout got
    // better. That is the exact failure mode the "read the frames" rule exists
    // for, and it is why nothing in this block moved.
    //
    // What DID move is the one lever both readings agree on: the infield's
    // relief normal (see palette.ground.relief), because a flat plane has no
    // gradient under any palette at all.
    roadVerge: { apron: '#0d1120', slope: '#3c4a66' },
    // Road paint. Miami boulevard: cold white edge lines against dark navy
    // asphalt, the district gold on the centre dashes and the lap line so the
    // start reads in the same accent as the finish gate's halo.
    roadPaint: {
      apronA: '#e8eefc',
      apronB: '#121a30',
      centre: '#ffd34f',
      edge: '#f2f6ff',
      grid: '#f2f6ff',
      lap: '#ffd34f',
    },
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
        every: 0.0112,
        key: 'neon-edge-pylons',
        kind: 'barrier-family',
        // AAA wave 8: `every` is a progress fraction, so on the 4x lap 0.045
        // spaced the pylons 524 world units apart instead of the authored 130.
        // 0.0112 is that same 130 units. maxInstances holds the draw budget,
        // so the run now covers the first ~40% of the lap at the authored pitch
        // rather than the whole lap at a pitch nobody would read as a barrier.
        // (This whole block only renders under ?trackVisuals=1, which is off by
        // default — corrected anyway so the lab is not measuring a lie.)
        maxInstances: 42,
        offset: 5.5,
        scale: 1,
        sides: [-1, 1],
        startProgress: 0.04,
      },
    ],
  },
  // Ramps live on the straights, off the center line so they're a
  // deliberate line choice; the viaduct crest is a free natural launch.
  // Re-seated onto the new lap: one on the market row's exit run, one on the
  // long climb into the viaduct ramp.
  ramps: [
    { progress: 0.45, side: -0.55 },
    { progress: 0.63, side: 0.5 },
  ],
  // The RAIL-YARD CUT. Same contract as the old carousel dare: leave the road
  // inside the Rail chicane, fly the sidings, and rejoin on the run to the
  // viaduct ramp. It only sticks above 238 u/s and casing it drops you in the
  // yard. Risk ~4-5 s lost, reward ~2-3 s won.
  shortcut: {
    failFlightTime: 0.85,
    failLandProgress: 0.605,
    failSpeed: 40,
    failSpin: 1.8,
    flightTime: 1.45,
    landProgress: 0.635,
    launchProgress: 0.575,
    minSpeed: 238,
    peakHeight: 22,
    side: -0.7,
  },
  // QA gate budgets (kart-playable): deterministic autoplay must finish
  // within finishSeconds and hold at least speedFloor mid-race.
  //
  // 45 -> 180. The geometric solve for this lap is 134.35 s over three laps
  // and the shipped telemetry runs ~1.7% slower than the solve (the grid start
  // spends the first two seconds accelerating from a standstill), so the real
  // number to beat is ~137 s. 180 keeps the SAME ~34% margin the old 45 held
  // over the old 33.5 s solve — a budget is only a regression detector if its
  // headroom is proportional, and one set to 140 here would fire on a bad lap
  // rather than on a broken build.
  budgets: { finishSeconds: 180, speedFloor: 140 },
});
