// Penguin Village Rooftop Rally — the first NEW track (docs/MULTITRACK_EXECUTION_PLAN.md
// Phase 1). Cozy beginner loop: a long "main street" start straight, a wide
// frozen-pond sweep, a "fish market" straight, gentle return bends. This is
// the grey-box pass — drivable road + pads + boxes, flat (no bridge), no
// dressing yet. Hazards (fish-cart crossers, snowmen, pond slip-zone) and
// the arctic dressing land in later passes. Pure data; gate scripts import it.
import { buildCenterline, validateCenterline } from './buildCenterline.js';

// A loop with real character — mixed left/right turns (the W3 dent is a
// concave right-hander, the rest sweep), a long main-street start straight,
// a wide pond sweeper, and one tighter signature corner. Validated:
// ~2442 units, min radius ~72, no self-intersections.
const WAYPOINTS = [
  { x: -380, z: 250 }, // main-street start (bottom-left)
  { x: 320, z: 250 }, // end of the long start straight (bottom-right)
  { x: 480, z: 70 }, // wide frozen-pond sweeper (right)
  { x: 250, z: -40 }, // signature tight inside dent (a right-hander)
  { x: 380, z: -250 }, // back out to the top-right
  { x: -200, z: -300 }, // fish-market straight (top)
  { x: -470, z: -40 }, // wide left return
];
const centerline = buildCenterline(WAYPOINTS, { radius: [120, 110, 155, 72, 110, 145, 150], spacing: 22 });
export const PENGUIN_VILLAGE_GEOMETRY = validateCenterline(centerline);

const PENGUIN_VILLAGE_COURSE = Object.freeze({
  key: 'penguin-village',
  mainRoadWidth: 58,
  startProgress: 0.02,
  centerline,
  minimapPath: centerline.map((p) => ({ ...p })),
  // Cozy and wide; the frozen-pond sweep opens up. Runtime smooths these.
  roadRibbons: [
    { key: 'main-street', role: 'main', width: 58, shoulderWidth: 6, startProgress: 0, endProgress: 0.24 },
    { key: 'pond-sweep', role: 'main', width: 64, shoulderWidth: 7, startProgress: 0.24, endProgress: 0.42 },
    { key: 'market-row', role: 'main', width: 58, shoulderWidth: 6, startProgress: 0.42, endProgress: 0.72 },
    { key: 'return-bend', role: 'main', width: 60, shoulderWidth: 6.5, startProgress: 0.72, endProgress: 1 },
  ],
  boostPads: [
    { key: 'street-pad', progress: 0.12, side: 0 },
    { key: 'pond-pad', progress: 0.33, side: 0.1 },
    { key: 'market-pad', progress: 0.58, side: 0 },
    { key: 'return-pad', progress: 0.85, side: -0.1 },
  ],
  itemBoxes: [
    { progress: 0.06, side: -0.16 },
    { progress: 0.18, side: 0.16 },
    { progress: 0.3, side: -0.14 },
    { progress: 0.46, side: 0.16 },
    { progress: 0.6, side: -0.16 },
    { progress: 0.74, side: 0.14 },
    { progress: 0.88, side: -0.16 },
  ],
  // Dressing comes in a later pass — grey-box has no buildings or props.
  districtAnchors: [],
  sceneryAnchors: [],
});

export const PENGUIN_VILLAGE_TRACK = Object.freeze({
  key: 'penguin-village',
  name: 'Penguin Village',
  tagline: 'Cozy snow-village rally',
  course: PENGUIN_VILLAGE_COURSE,
  laps: 3,
  startOffset: 0.03,
  // Ice-bridge OVERPASS on the top straight (progress ~0.49-0.71): the road
  // climbs over a frozen river and back down. No forced crest jump.
  elevation: { bridgeBand: { from: 0.55, peak: 17, to: 0.67 }, crestLaunch: false },
  ramps: [
    // Pond-edge kicker for a small air trick; off the racing line so it's a
    // deliberate line choice, not a trap.
    { progress: 0.34, side: -0.55 },
  ],
  shortcut: null,
  surfaceBands: [
    { progressStart: 0, progressEnd: 0.24, laneStart: -1, laneEnd: 1, type: 'asphalt' },
    { progressStart: 0.24, progressEnd: 0.42, laneStart: -0.75, laneEnd: 0.75, type: 'ice' },
    { progressStart: 0.24, progressEnd: 0.42, laneStart: -1, laneEnd: -0.75, type: 'snow' },
    { progressStart: 0.24, progressEnd: 0.42, laneStart: 0.75, laneEnd: 1, type: 'snow' },
    { progressStart: 0.42, progressEnd: 1, laneStart: -1, laneEnd: 1, type: 'asphalt' },
  ],
  breakableObjects: [
    { key: 'snowman-market-1', type: 'snowman', progress: 0.46, side: 0.72 },
    { key: 'snowman-market-2', type: 'snowman', progress: 0.51, side: -0.7 },
    { key: 'snowman-market-3', type: 'snowman', progress: 0.56, side: 0.74 },
    { key: 'snowman-market-4', type: 'snowman', progress: 0.61, side: -0.72 },
    { key: 'snowman-market-5', type: 'snowman', progress: 0.66, side: 0.7 },
    { key: 'snowman-market-6', type: 'snowman', progress: 0.71, side: -0.74 },
    { key: 'ice-pillar-pond-1', type: 'icePillar', progress: 0.28, side: 0.88 },
    { key: 'ice-pillar-pond-2', type: 'icePillar', progress: 0.36, side: -0.86 },
  ],
  crossers: [
    // K4 (2026-07-12): first crosser LIVE in the shipped runtime —
    // outplayasians strolls across the finish straight (likeness approved
    // 2026-07-10 "asians looked great"). SLOW + partial width so a driving
    // line always exists. The old fish-cart/penguin-march entries were
    // legacy-only dead data (the shipped runtime never consumed crossers
    // before K4) — revive them in V2 once they have shipped visuals.
    // Width 0.34 → 0.52 (owner 2026-07-17: "walk across the finish line
    // more"; a driving line still exists on the far side, rivals dodge).
    { key: 'outplayasians-finish', progress: 0.015, direction: 1, speed: 0.16, width: 0.52, modelType: 'ordinalWalker' },
  ],
  // Arctic-neon palette: snow ground, icy dusk sky, ice-blue edges. Road
  // asphalt stays dark (readability rule — Sherbet Land does the same).
  palette: {
    clearColor: '#0a1a2e',
    // Elevation LUT for the sky dome (offset 0 = zenith, 1 = horizon). The
    // old array was authored against nothing: its horizon end sat at
    // rgb(159,212,224) while pv-far's own top row is rgb(138,174,188), so the
    // plate seamed against the sky it was supposed to dissolve into. With
    // horizonPower 2.6 the plate's rim (22.6 degrees) samples offset ~0.92,
    // which is why the 0.92 stop is the plate's colour.
    // horizonPower 1.7, not 2.6. At 2.6 the whole visible band — the camera
    // never looks higher than ~35 degrees — sampled offsets 0.84 to 1.0, so
    // SIX of these seven stops were unreachable and the sky shipped as one
    // flat grey (measured rgb(162,187,197) at every height). At 1.7 the
    // visible band covers offsets 0.61 to 0.91, which is where the storm
    // actually has to be painted: a deep blue-violet ceiling, a bruised
    // grey-violet body, then the plate's own value at its rim. The 0.80 stop
    // is the plate match (its rim is 22.6 degrees, and 0.384^1.7 = 0.196).
    skyHorizonPower: 1.7,
    // Wave 2 deepens the four stops ABOVE the plate match and leaves 0.8-1.0
    // exactly where the sky pass put them. Measured cause: the blind judge
    // scored PV as "one grey value from sky to snow to iceberg" and the
    // artefact hunter measured the upper-frame R-channel stddev collapsing
    // 75.7 -> 38.3 with mean saturation 0.302 -> 0.152. A ceiling that only
    // spans #5c6a90 -> #cde2ea across the whole visible band has nothing for
    // the ice to be brighter THAN. The 0.8 stop is still pv-far's own rim
    // value, so the plate keeps dissolving into the dome rather than seaming.
    // Wave 2 round 2 deepens the top three stops again. The rubric critic
    // measured PV's sky at lightness 0.687-0.717 against a 0.483-0.575
    // baseline: the ceiling was PALER than the snow under it, which is the one
    // arrangement that cannot read as a storm. The zenith drops to a genuine
    // navy so the ice has something to be brighter than, and the 0.8 stop is
    // still pv-far's own rim value so the plate keeps dissolving into the dome.
    // Round 3 adds CHROMA at unchanged value. The rubric critic measured PV's
    // sky at saturation 0.203-0.287 against Comeback City's 0.739-0.928 and
    // called it "a pale overcast, not an arctic sunset storm front". Every stop
    // below keeps its predecessor's luminance to within ~2/255 — the value
    // ladder the last two rounds spent their whole budget establishing is
    // untouched, and the 0.8 stop still matches pv-far.webp's own rim (Y 165
    // against the plate's 167) so the backdrop keeps dissolving into the dome
    // instead of seaming. What changes is the distance between the channels:
    // the visible band (offsets ~0.61-0.91) goes from 0.15-0.19 saturation to
    // 0.19-0.26, which is a storm-blue ceiling rather than a grey one.
    // Wave 3: the storm front finally gets a SUNSET under it. Rounds 1-3 spent
    // their whole budget on value and chroma and left every stop blue-of-
    // neutral, so the rubric critic measured PV's sky as within 1-6/255 of the
    // previous wave on 8 of 9 frames with B > R everywhere — which is overcast,
    // full stop. The camera never looks higher than ~33 degrees, and with
    // horizonPower 1.7 that band maps to offsets ~0.64 (top of frame) to 1.0
    // (horizon). So the ladder splits INSIDE the visible band rather than above
    // it: 0-0.74 stays the cold navy ceiling the last three rounds built, and
    // 0.82-1.0 turns over into the warm break a front is lit from underneath by.
    // That is also the only arrangement that reads as a FRONT — a warm horizon
    // with a cold lid over it is a weather edge; a uniformly warm sky is dusk,
    // and a uniformly cold one is fog.
    //
    // The 0.8 stop no longer matches pv-far.webp's rim exactly (it was chosen
    // for that). It does not need to: backdropHaze below took the same warm
    // step, so the plate and the dome still meet at a shared colour — they just
    // meet at a warmer one.
    //
    // WAVE 4 — AND THE REASON EVERY WORD ABOVE IS TRUE AND STILL PRODUCED AN
    // OVERCAST. The ladder above was authored against the wrong angles. The
    // camera does not see the horizon: the far backdrop plate is opaque from
    // 0 to ~12 degrees of elevation and only dissolves out at its rim, 22.3
    // degrees (radius 780, height 380, centre y 140 — see createSkyDome.js,
    // where the decoded alpha ramp is written down). With horizonPower 1.7 the
    // band the player ACTUALLY sees, 20 to 34 degrees, samples offsets 0.63 to
    // 0.84. Wave 3's warm break lived at 0.86-1.00, which is 0-13 degrees:
    // painted, correct, and behind a plate.
    //
    // So the whole ladder moves DOWN the offset axis by roughly one band. The
    // warm break now lands at 0.85-0.91 (17-21 degrees, where the plate's alpha
    // has fallen to 0.3-0.7 and the dome shows through), the turn-over sits at
    // 0.71-0.78 (25-30 degrees) and the bruised indigo ceiling occupies
    // 0.52-0.63 (34-40 degrees), which is the top of frame. Replayed through
    // the shipped dome shader, ACES at the chain's effective 1.80x, the
    // vignette and the track LUT, over seven bearings:
    //
    //   elev 34   hue 229-244  sat 0.37-0.79  val 0.68-0.78   storm ceiling
    //   elev 30   hue 234-247  sat 0.38-0.55  val 0.66-0.75
    //   elev 26   hue 250-309  sat 0.22-0.31  val 0.67        the front's edge
    //   elev 23   hue 328-354  sat 0.21-0.22  val 0.67-0.79
    //   elev 20   hue  10-30   sat 0.20-0.40  val 0.79-0.92   the warm break
    //   elev 16   hue  32-38   sat 0.42-0.53  val 0.89-0.95
    //
    // against a shipped build measured at hue 233-238 / sat 0.21-0.25 at the
    // top of frame decaying to sat 0.02-0.10 with an UNDEFINED hue below it.
    // The same replay reproduces Comeback City's captured sky to rms 13/255,
    // which is what makes those numbers worth quoting.
    //
    // Chroma is deliberately LOW in the stops themselves (the widest is 0.44
    // saturation): the track grade runs sat 1.30 on top, so an authored stop at
    // 0.6 comes out of the pipeline past 0.85 and the ladder turns into a
    // magenta bruise on the way from indigo to amber. The stops carry the HUE
    // rotation and the VALUE ladder; the grade supplies the chroma.
    sky: [
      [0, '#16204a'],
      [0.3, '#22305c'],
      [0.52, '#384780'],
      [0.63, '#4e5a8c'],
      [0.71, '#6a6b8b'],
      [0.78, '#877a83'],
      [0.85, '#a58270'],
      [0.91, '#c4966a'],
      [0.96, '#dcae74'],
      [1, '#efc68d'],
    ],
    // Arctic SUNSET, and round 1 did not deliver one: the only disc in 18
    // frames was small, WHITE and high, which is midday. 22 -> 15 degrees puts
    // the sun down into the ice ridge's own band, so it rakes ACROSS the field
    // instead of lighting it from above — vertical ice faces gain what the flat
    // snow loses, which is what gives a white track any form at all. The disc
    // now grazes the far plate's ridge line rather than floating clear of it;
    // that is the intended read (sun behind the mountains), and the glow lobes
    // below are what carry it when the ridge is in front.
    // Wave 4: 15 -> 12 degrees, which is the elevation the wave-3 rubric critic
    // prescribed by name and which no previous agent owned the file to set. It
    // does two things at once: it puts the disc and its glow lobes down into
    // the band where the backdrop plate is still translucent (12 degrees is
    // where pv-far.webp's alpha first reaches 255), and it drops the flat
    // snow's share of the key from sin(15) = 0.259 to sin(12) = 0.208 while
    // leaving a sun-facing vertical ice face at cos(12) = 0.978 — so the rake
    // moves off the ground plane and onto the geometry that has form.
    sun: { azimuthDeg: 195, distance: 190, elevationDeg: 12 },
    // Wave 3: 5.2 -> 4.2, and see sunColor. Penguin Village was running a
    // HOTTER and MORE intense key than Comeback City (#ffb85a at 4.4) over a
    // white track, and the arithmetic only goes one way: a cool #a9c2d2 belt
    // albedo times a (1, 0.745, 0.47) key at 5.2 lands at (0.66, 0.57, 0.39),
    // which is sand. All three critics measured the result and called the
    // arctic "a field of tan desert cones"; the warm-share of the mid-ground
    // band went 9.5% -> 17.8% while the wave's stated target was to lower it.
    // 4.2 also stops the lit faces clipping past the toon ramp's top band,
    // which is what flattened the warm belt masses into single-value slabs and
    // blew the ice kart's bodywork to pure white in penguin-village frames.
    // Wave 4: 4.2 -> 4.6, and this is a value correction, not a warmth one.
    // Dropping the sun to 12 degrees costs the flat snow 20% of its key
    // (sin 15 -> sin 12); 4.6 gives that back on the ground plane and hands a
    // sun-facing vertical face 10% MORE than it had, which is the whole point
    // of lowering the sun. Still well under the 5.2 that wave 3 measured
    // clipping past the toon ramp's top band.
    sunIntensity: 4.6,
    // WAVE 4: 0.36 -> 0.08 on the broad lobe, and this is one of the two
    // mechanisms that made the sky measure as neutral grey. Both lobes are
    // ADDITIVE, and a wide additive amber over a violet dome is arithmetically
    // a desaturator: the shipped frames sample rgb(198,198,198) and
    // rgb(150,147,150) in the sky column, i.e. an undefined hue, because
    // pow(sd,3) * 0.36 covers most of the visible hemisphere and adds
    // (0.26, 0.19, 0.12) of linear warmth to a body whose own chroma is
    // smaller than that. The warm half of the sky is now carried by the
    // ELEVATION LADDER and by the deck's own base colour, both of which rotate
    // hue instead of washing it out. The tight halo stays (0.4 -> 0.30): it
    // sits within a few degrees of the disc, where a real sun genuinely does
    // burn its surroundings toward white.
    skyGlow: [0.3, 0.08],
    // Heavy overcast, not scattered cumulus: a lower coverage floor plus a
    // cool body, so the deck reads as one storm ceiling.
    // Wave 2: the deck was BRIGHTER than the sky it sat in (#b9cad8 over a
    // #5c6a90-#808fa8 band) at ~44% coverage, so it painted over the whole
    // gradient and PV's sky shipped as a flat slab measuring rgb(228,227,226)
    // at the top of frame. A storm ceiling is DARKER than the breaks in it.
    // #93a8c0 at 28% coverage lets the dome's gradient carry the upper frame
    // and turns the deck back into cells with edges — which is also what
    // gives the broad sun lobe (skyGlow 0.26 below) something to break through.
    // Round 2: the deck body goes cooler and darker still and the lit side goes
    // warmer, so the difference BETWEEN a cloud's body and its sun-lit underside
    // is what the eye reads — an overcast with a break in it, rather than an
    // evenly bright lid. Strength up to 0.84 for the same reason: the critic
    // asked for "one bright break motivating the key direction", and a low
    // contrast deck cannot supply one at any coverage.
    // Round 3: the deck body takes the same chroma step as the dome under it
    // (#7e93ae is 0.20 saturated, #6c86a8 is 0.26 at a near-identical value) —
    // the deck covers most of the visible sky, so a grey deck over a blue dome
    // measures as a grey sky whatever the dome does. litColor unchanged: the
    // warm break is the one part of this that was already right.
    // Round 4 (wave 3): the deck was the reason the sky ladder could not be
    // measured. The high deck's mask is smoothstep(0.09, 0.30, d.y), so at the
    // 10-22 degrees where the warm break lives it runs at ~0.85 coverage, and a
    // BLUE deck at that coverage over any horizon colour measures blue. Two
    // changes, both to let the break through rather than to remove the lid:
    // band 0.40 -> 0.44 against fbm at mean 0.52 halves mean coverage (0.50 ->
    // 0.26), which turns a lid into a front with gaps in it; and the body goes
    // storm-violet, which is what a cloud base actually is when it is lit from
    // under by a low sun, instead of the daylight blue-grey it was.
    // WAVE 4, and this is the OTHER half of the measured cause. The deck's
    // coverage mask used to be smoothstep(0.09, 0.30, d.y) — fully closed above
    // 17.5 degrees — while the sky the camera frames above the plate's rim
    // starts at 22.3. So 100% of every visible sky pixel was deck body colour,
    // and the shipped frames prove it: penguin-village-p0_15 samples
    // rgb(125,127,160) at the top of frame against a body authored #7d7ba0 =
    // rgb(125,123,160). The dome's elevation ladder was never on screen at all.
    //
    // Three changes, all in the shader's new (defaulted) knobs:
    //   deck [0.20, 0.62] — coverage now THICKENS with height instead of
    //     closing at 17 degrees: ~39% at the plate rim, ~70% at 30 degrees,
    //     ~94% at the top of frame. That is a front with gaps under it rather
    //     than a lid, and it is what lets the warm ladder below reach the eye.
    //   color / baseColor — two body colours, ramped by `tone`. A cloud base
    //     over a 12-degree sun is lit from underneath and a cloud top is not;
    //     one body colour can only ever be an overcast. #8b7684 is a warm
    //     storm base, #525778 the bruised ceiling above it.
    //   litMix 0.42 / litAdd 0 — the sun side is now a MIX toward #dc9f79
    //     rather than an addition of it. Additive amber over violet is grey,
    //     which is exactly the sat 0.02-0.10 / undefined-hue the wave-3 critic
    //     measured. Comeback City keeps the additive path (its deck body is
    //     already the warm colour, so an additive highlight reads as a hotter
    //     cloud) and is bit-identical: every new key defaults to the old
    //     literal.
    clouds: {
      band: [0.44, 0.68],
      baseColor: '#8b7684',
      color: '#525778',
      deck: [0.2, 0.62],
      litAdd: 0,
      litColor: '#dc9f79',
      litMix: 0.42,
      lowDeck: [0.3, 0.62],
      scale: 0.5,
      strength: 0.84,
      tone: [0.3, 0.56],
    },
    // De-sun key for pv-far.webp (see createSkyDome.js). PV's disc is a soft
    // cream inside a warm glow band, so no brightness threshold separates the
    // two — RED-MINUS-BLUE does, because the storm band, the mountains and
    // the snow are all cooler than the sky. The patch is deliberately wide:
    // flattening the whole warm band to a vertical gradient removes the disc
    // AND the five-fold hotspot, and the real glow comes back from the sun.
    backdropDeSun: {
      patch: [0.47, 0.62, 0.44, 0.24],
      range: [0.2, 0.38],
      skyBand: [0.5, 0.74],
      skyHi: '#fbd4a8',
      skyLo: '#e9c181',
      weights: [1, 0, -1],
    },
    // Up with skyGlow, and for the same reason: the far plate is opaque across
    // the band the sun now sits in, so the ring's re-emitted lobes are the only
    // place the sunset can appear on the horizon itself.
    // Wave 4 takes the same step the dome's own lobes did (skyGlow above) and
    // for the same measured reason: the broad lobe is additive, and additive
    // warmth over the plate's cool grey rows bleaches rather than warms. What
    // replaces it is backdropHaze below, which MIXES the plate toward the
    // horizon colour and therefore keeps a hue.
    backdropGlow: [0.26, 0.08],
    // Aerial perspective for the fog-exempt backdrop rings. The haze colour is
    // DARKER than the plate on purpose: the audit's blind judge found the snow
    // and the storm sky sitting in the same value band around the horizon, so
    // the ground plane simply vanished. Pulling the far ice ridge down toward
    // rgb(143,163,178) is what re-establishes the horizon line, and it also
    // takes the edge off the lava-orange rim painted into the plate.
    // Wave 2: same reasoning as Comeback City's ring haze — the depth ramp
    // (the far/near DIFFERENCE) is what re-established the horizon line, and
    // it survives at 0.18; the absolute amounts come down because they were
    // the largest single contributor to PV's chroma collapse. rgb(143,163,178)
    // is 20% saturated; #7e9ab5 is 30% and 6% darker, so it keeps the "snow
    // must sit under the sky" rule the sky pass established while putting
    // actual blue back into the far ice.
    // Wave 3: the haze colour takes the same warm step the sky's horizon band
    // did. Aerial perspective hazes TOWARD the sky it recedes into, so a cool
    // blue haze under a warm horizon is the mistake this line has now made in
    // two directions across three rounds. #a2a0bc is the same value as
    // #7e9ab5 (within 3/255) and 34 units warmer in R-minus-B, so the "snow
    // must sit under the sky" rule and the plate/dome match both survive.
    // Wave 4: the haze finally hazes toward a colour that exists in the sky.
    // #a2a0bc was chosen to match a warm horizon band that, as the sky note
    // above establishes, was never visible — so in the shipped frames it was a
    // cool violet mixed into a plate sitting under an amber break that was not
    // there. The dome's low band now renders at hue 32-42 / value 0.89-0.95,
    // and #b58a6e sits under it in value (0.71) and inside it in hue (25), so
    // the plate recedes INTO the sky instead of across it. Amounts come down a
    // touch (0.34/0.16 -> 0.30/0.14) because the sky behind the plate is now
    // doing chromatic work of its own and the haze no longer has to be the
    // only warm thing on the horizon; the far/near DIFFERENCE — the depth ramp
    // this line exists for — is preserved at 0.16.
    backdropHaze: { band: [0.28, 0.86], bottomFade: 0.18, color: '#b58a6e', far: 0.3, near: 0.14 },
    // Icebergs collapsed into one white value under the old 4-band ramp; the
    // 5-band set keeps a readable step between the two lit bands where all
    // the arctic geometry sits, and the deeper floor (40, not 64) is what
    // lets the shade side actually take the hemisphere's cold ground bounce.
    toonRamp: [40, 96, 154, 208, 255],
    // Snow at rgb(216,219,220) was BRIGHTER than the sky above it and carried
    // a saturation of 0.02 — an achromatic field, which is why the track read
    // as fog rather than as arctic sunset. The base drops ~17% in value and
    // takes a blue cast, so the key light's warmth is what lifts the lit snow
    // and the hemisphere's ground colour is what cools the shade.
    // Round 2: down another ~9% in value and further into blue. The rubric
    // critic asked for "at least 60 RGB units of separation between the snow
    // plane and the sky it sits against"; the sky's upper band has just dropped
    // by ~25 units, and this is the other half of that gap. It also gives the
    // grade's (now luminance-neutral) warm highlight tint somewhere to land —
    // snow that is already at 240 cannot be gilded, only clipped.
    // Wave 4: #adc4da -> #b4c6d6. The fill above lost 23% of its green and 25%
    // of its blue (hemi below), and this is the half of that which the snow
    // gets back — with the recovery weighted toward RED, so the plane comes
    // back to its shipped luminance without coming back to its shipped cast.
    // Replayed through the exact grade over the measured snow patch of
    // penguin-village-p0_56 (rgb(70,135,171)), the field lands at rgb(89,132,143):
    // same value band, B-R falls from +101 to +54. Snow reads as snow rather
    // than as one flat indigo sheet, and it still sits well under the new sky.
    ground: {
      base: '#b4c6d6',
      repeat: 38,
      // ~7.6 world units per sparkle tile (2600 / 340).
      sparkle: { color: '#dff1ff', intensity: 0.5, repeat: 340 },
      // Wave 4 re-spreads these against the new base. Two of the three used to
      // sit within 10/255 of #adc4da, so the tiling map carried a total value
      // range of 78 counts on a surface the rubric critic measured as "one
      // flat value across ~35% of every frame". The set now spans 129-230
      // (+29%), and the extra range is deliberately taken DOWNWARD: on a
      // bright field it is the dark end that describes form, and the bright end
      // is already the background.
      speckles: [
        { color: '#9db5cb', count: 300, size: 3.4 },
        { color: '#e6f1fa', count: 340, size: 4.2 },
        { color: '#8199b4', count: 160, size: 2 },
      ],
    },
    // AAA wave 3 — edge LEGIBILITY, not decoration. The old curb ran
    // #F5F8FF against #eaf4fa snow and the barrier #7EC8E8/#F5F8FF against the
    // same: under 4 deltaE on the white half of the pair, so in
    // penguin-village-p0_45 and -p0_78 roughly half of the track boundary
    // simply was not there. Both pairs now put a DARK tooth against the cyan
    // one — on a white track the contrast has to come from the dark end of the
    // ramp, because the bright end is already the background.
    // Wave 3 round 2: a -> #2a7ba0. The dark tooth was the right call against
    // white snow and the wrong value against its own neighbour — #123a52 sits
    // within a few units of the gutter beside it (#1b2b3a, the shoulder
    // fallback), so the checker lost one of its two teeth into the band next to
    // it and shipped as "sparse cyan tiles on a dark strip". The kerb block now
    // carries its own rise and fall faces (buildRoadEdgeProfile.js), whose
    // shaded values are derived from THIS colour, so the tooth has to sit high
    // enough that its darkest face still steps off the gutter. Mid teal does
    // that at both ends: clearly above the gutter, clearly below the verge.
    // Wave 3 round 2 (again), and this time the reasoning above is inverted on
    // purpose. The dark tooth was correct while the kerb's neighbour on the
    // outside was raw white snow; it is now a slate run-off shelf (roadVerge
    // below), so the constraint that forced a dark end of the ramp is gone.
    // What the dark tooth cost is measurable: on the road side it rendered
    // rgb(14,81,129) against rgb(14,34,63) asphalt while the cyan tooth
    // rendered rgb(4,151,205), so ONE of the two teeth carried the rail and the
    // checker read as sparse cyan dashes rather than as a continuous kerb —
    // two separate critics counted it as a broken edge in
    // penguin-village-p0_78. Glacier white against ice blue puts BOTH teeth
    // well clear of the tarmac, which is the same relationship Comeback City's
    // red/white pair has to its own asphalt, and the block's rise/fall faces
    // (shaded 0.8 / 0.58 in buildRoadEdgeProfile) still step it off the shelf.
    // WAVE 4 — THE PERIWINKLE TOOTH, MEASURED AND FIXED AT THE ALBEDO. The
    // wave-3 artefact hunter filed "kerb white teeth render periwinkle blue"
    // against Comeback City; it is worse here. Sampled in penguin-village-p0_15
    // and -p0_78, the white tooth renders rgb(101,163,206) / rgb(110,180,228)
    // while the cyan tooth beside it renders rgb(4,130,192) — the two teeth of
    // a red/white-style checker are BOTH blue, and the edge stops reading as a
    // checker at all.
    //
    // The cause is that the kerb is a MeshStandardMaterial (wave 3's Basic ->
    // Standard swap, correct) whose crest faces UP, and every up-facing surface
    // on this track is dominated by the hemisphere's SKY term. #e9f6ff is
    // itself blue of neutral (linear B/R = 1.24); multiplied by a fill that is
    // bluer still, it can only land periwinkle. So the authored colour is
    // pre-corrected: #fff2dc is warm in the palette and NEUTRAL on screen.
    // Replayed through the exact grade with the wave-4 rig, the tooth lands at
    // rgb(137,159,178) — B-R falls from +118 to +41, and it now separates from
    // the cyan tooth by hue as well as by value.
    curb: { a: '#fff2dc', b: '#00c6ee' },
    rail: '#00E5FF',
    wall: { a: '#1c4a63', b: '#00E5FF' },
    // Run-off shelf and embankment. Same fault as Comeback City's and the
    // opposite colour problem: both bands fell back to palette.ground.base
    // (#adc4da), so the strip between kerb and barrier was the snowfield, flat
    // to within 8/255 over 680px in penguin-village-p0_45. A packed-snow shelf
    // that is clearly DARKER than the field gives the white kerb something to
    // sit against, and the bank behind it comes back up to near-field value so
    // the pair reads as built shoulder rather than as one grey plate.
    // Same value-ladder rule as Comeback City, read off the measured frame:
    // #adc4da renders as rgb(63,113,153) here, i.e. the pipeline lands at
    // roughly 0.36/0.58/0.70 of the authored channels, so the shelf is picked
    // to come out clearly below the snowfield and the bank clearly above it.
    roadVerge: { apron: '#5c7b99', slope: '#c3d8ec' },
    // Road paint. Ice-blue rather than white for the same reason as the curb:
    // a white line on a pale track is invisible, and the aurora cyan is the
    // colour the whole track already speaks in.
    roadPaint: {
      apronA: '#dff1ff',
      apronB: '#123044',
      centre: '#cfe9ff',
      edge: '#8fd8ff',
      grid: '#e8f7ff',
      lap: '#00E5FF',
    },
    // Ice-bridge structure: frosted deck skirts, bright cyan glow underline,
    // pale ice pillars.
    bridge: { skirt: '#1a3a4a', glow: '#00E5FF', pillar: '#a8d4e8', pillarEmissive: '#3a6a7a', beam: '#2a4a5a' },
    // B1 atmosphere — owner-picked V8 "storm front" from palette-lab.html
    // (2026-07-06): close grey-blue haze, moody.
    // AAA sky pass re-tuned it: rgb(74,100,120) was a COLD, dark haze under a
    // warm cream horizon, so distant snow dropped below the sky instead of
    // lifting into it — aerial perspective backwards. rgb(159,184,196) is the
    // plate's own shelf value, near 150 -> 230 keeps haze off the drivable
    // ribbon and the first rival ahead, and far 680 -> 820 is now legal
    // (camera.far is 1800 with the backdrop on). The hemi intensity drop from
    // 3 to 1.4 is the key:fill rebalance, and it also buys back the bloom
    // headroom the brighter fog spends.
    // FogExp2 density (see comebackCity.js). Denser than CC on purpose — a
    // storm front is the whole brief here, and it is what pushes the iceberg
    // rows apart in depth instead of stacking them in one white band.
    // Round 2: rgb(159,184,196) was BRIGHTER than the plate's own shelf value
    // (138,174,188), so distant snow lifted ABOVE the sky it was supposed to
    // recede into — aerial perspective backwards again, one step subtler.
    // rgb(143,163,178) sits ~13% under the plate, which is the MK8 rule the
    // blind judge cited: their snow is always darker than their sky.
    // Wave 2: 0.0022 -> 0.0016 and the colour gains chroma. At 0.0022 the fog
    // reached 47% by 300 units and 76% by 500 — it was hazing the mid-field
    // the camera actually frames, and it is achromatic, which is how a track
    // authored as "arctic sunset storm front" shipped at 0.152 mean saturation
    // (baseline 0.302). 0.0016 is 20% at 300 and still 99% at the ground
    // plane's far edge; the far end of the ramp moved into aerialEffect.js,
    // which starts at 300 units instead of at the kart.
    // Wave 3: the colour follows the sky ladder for the third time, and this
    // time in the direction the ladder actually went. Fog hazes toward the sky
    // a surface recedes into; the sky's visible band is now a warm break under
    // a cold lid, so a #7e9ab5 haze (R-B = -55) was pulling every distant mass
    // AWAY from the horizon it is supposed to dissolve into. #a89caf is a storm
    // violet at -7: warm enough to sit under the break, ~6% brighter so the
    // "snow darker than sky" rule holds, and — because fog only bites past
    // ~250 units — it does this WITHOUT gilding the near snow, which is the
    // failure mode the wave-2 key light walked into. Density unchanged.
    // Wave 4: same correction as backdropHaze, same reason. The rule this line
    // keeps restating — "fog hazes toward the sky a surface recedes into" — was
    // being applied to a sky nobody could see. The visible low sky now renders
    // at hue 32-42 / value 0.89-0.95, so #bfa08c is the colour the snow plane
    // is actually receding into, and it is the one lever this package owns that
    // gives the flat ground plane a genuine near-to-far ramp: FogExp2 at 0.0016
    // is 2.5% at 100 units, 21% at 300 and 60% at 600, so the same snow albedo
    // walks from cool-white at the kart to warm haze at the horizon. Density
    // unchanged.
    fog: { color: '#bfa08c', density: 0.0016, near: 230, far: 820 },
    // Fill UN-inverted. Round 2 put warm cream in the sky term to buy chroma,
    // and it worked in exactly the wrong direction: a HemisphereLight's sky
    // colour lands on every UP-FACING surface, so the warm term went onto the
    // snow plane, the cone tops and the mid-ground belt all at once, while the
    // sun — the thing that is actually supposed to be warm — only reaches faces
    // turned toward azimuth 195. Measured consequence: the belt's authored
    // ice palette (#a9c2d2 / #97b0c4 / #83a0b8, all cool) sampled at
    // (169,160,145) and (189,169,137) on penguin-village-p0_06 — R exceeding B
    // by up to 52, a ~93-point channel-order flip — and all three critics read
    // the arctic as "a field of tan desert cones".
    //
    // A low sun over ice does not work like that. The KEY is warm and
    // directional (sunColor #ffbe78 at 5.2 below); the FILL is the cold navy
    // sky it sits in. Splitting them that way is what gives every ice face a
    // warm/cool terminator instead of one warm value, and it is the only
    // arrangement in which "warm rake across ice" and "cool navy sky" are the
    // same lighting rig rather than two contradictory ones.
    //
    // The ground bounce also comes up out of pure saturated navy. #1d3f70 was
    // what made the underside of every overhanging ice mass render as a flat
    // #3a64b2 slab (the "unlit blue plane" on penguin-village-p0_67); a snow
    // field bounces a lot of light, so a lighter, less saturated bounce is both
    // truer and stops down-facing geometry reading as an unlit void.
    // Intensity 1.5 -> 1.7 pays back the luminance the cooler sky term costs.
    //
    // WAVE 4 — THE FILL, MEASURED. The wave-3 note above is right about the
    // SHAPE of the rig and wrong about its numbers, and the frames say so. On
    // an up-facing surface the three lights deliver, in linear irradiance:
    //
    //   hemi #93b4dc x 1.7   (0.489, 0.766, 1.216)
    //   key  #ffdcb4 x 4.2 x sin(15)   (1.087, 0.770, 0.515)
    //   rim  #00d5ff x 1.6 x 0.423     (0.000, 0.431, 0.676)
    //   ------------------------------------------------------
    //   total                (1.576, 1.967, 2.407)   B/R = 1.53
    //
    // A fill whose blue is 2.5x its red is not a "cool navy sky", it is a
    // colour cast, and it is why every white surface on this track — kerb
    // teeth, snow, run-off shelf — measures periwinkle. The wave-4 rig keeps
    // the same RED (so nothing gets darker where it counts) and takes the
    // excess out of green and blue:
    //
    //   hemi #7e96c6 x 1.7   (0.355, 0.519, 0.960)
    //   key  #ffd2a4 x 4.6 x sin(12)   (0.957, 0.610, 0.360)
    //   rim  #a4ccdb x 1.6 x 0.423     (0.251, 0.413, 0.489)
    //   ------------------------------------------------------
    //   total                (1.563, 1.542, 1.809)   B/R = 1.16
    //
    // i.e. red within 1% of where it was, blue down 25%. That is the whole
    // "cool navy fill" prescription expressed as a rebalance rather than as a
    // dimming, and it is what lets the KEY's warmth read as a terminator
    // instead of being buried under a blue wash.
    //
    // The ground bounce comes off pure navy for the third time and this time
    // with a reason it can keep: #33517d has a linear red of 0.033, so a
    // down-facing plane on this track received essentially NO red at all and
    // rendered as the "unlit blue slab" the wave-2 note describes. #5a5f7e is
    // still cool and still dark — it is snow bounce under a storm, not sunlit
    // snow — but its red is 3.1x higher, which is the difference between a
    // shaded underside and a hole. Deliberately NOT the warm bounce the
    // physics of a lit snowfield would suggest: replayed, a warm ground term
    // multiplies a down-face's red by ~15x and lands the undersides of the
    // ice masses on tan, which is the exact failure wave 3 round 1 shipped.
    hemi: { sky: '#7e96c6', ground: '#5a5f7e', intensity: 1.7 },
    // Wave 3: #ffbe78 -> #ffdcb4. Still amber, and still the colour the dome
    // tints the disc and its lobes with, but at 0.29 saturation instead of
    // 0.53. The wave-2 note below was right that the KEY should be warm and the
    // FILL cold; it was wrong about how much warmth an albedo of 0.9 can take
    // before it stops being white. A storm-front sunset is a warm SKY over cold
    // snow — the sky ladder and backdropHaze above now carry that, and this
    // only has to leave a warm/cool terminator on the ice faces rather than
    // repaint them. Against the belt's #a9c2d2 the lit face now lands ~24/255
    // warm of neutral instead of ~110.
    //
    // The disc and glow lobes lose the same chroma. That is deliberate: they
    // sit inside the sky's own warm horizon band now, so they no longer have to
    // be the only warm thing in the frame.
    //
    // Wave 4: #ffdcb4 -> #ffd2a4, and note WHERE the warmth comes from. Both
    // colours have a linear red of exactly 1.0; what changes is that green
    // drops 0.708 -> 0.638 and blue 0.474 -> 0.376. The key gets warmer by
    // losing its cool channels, not by gaining red — which is precisely the
    // move that wave 3 round 1's #ffbe78 (linear R/B = 5.14) got wrong and
    // that turned the bergs to sand. This sits at R/B = 2.66 against wave 3's
    // 2.11 and that sand's 5.14, and the belt's clamp (createMidGroundBelt.js)
    // comes down in the same wave to keep the net warm-pixel share inside the
    // 5.9-13.6% band the critics scored as the win.
    sunColor: '#ffd2a4',
    // WAVE 4 — TWO MEASURED ARTEFACTS, ONE PALETTE KEY. `rimLightColor` has
    // exactly two live consumers on this track and neither of them is the
    // owner-approved hero rim (heroRim.tint below pins that to #00d5ff and
    // wins at both call sites):
    //
    //   1. the rim DirectionalLight, #00d5ff at intensity 1.6. Its LINEAR RED
    //      IS EXACTLY ZERO. On an up-facing surface it contributes
    //      (0.000, 0.431, 0.676) — a third of the fill, with no red in it at
    //      all — which is half of why the white kerb tooth measures
    //      rgb(101,163,206) instead of white.
    //   2. the road's ice sheen, ComebackCityThreeKartRace.jsx:2350, which
    //      adds `uRoadSheenColor * roadSheen * 2.4` with NO ceiling. A colour
    //      with zero red multiplied by 2.4 can only ever clip green and blue,
    //      which is the (66,255,255) / (55,215,255) column measured over the
    //      road in penguin-village-p0_33 — a highlight that is mathematically
    //      incapable of turning white however hot it gets.
    //
    // #a4ccdb is the same aurora ice-blue at the same luminance (0.568 against
    // #00d5ff's 0.528, +7%) with a real red channel (0.371 linear). It fixes
    // the fill's half of the periwinkle outright and it stops the road sheen
    // being a two-channel clip. The sheen's missing CEILING is still a defect
    // and is not in a file this package owns — see the note in the report.
    rimLightColor: '#a4ccdb',
    // B3 hero fresnel rim — owner RE-PICK 2026-07-07 after seeing V5
    // live: V3 "bold" ("v3 for penguin") — stronger, wider edge in the
    // track's own aurora tint (V3 carries no tint override, so the shader
    // rim uses this palette's rimLightColor #00d5ff). tint overrides the
    // shader rim only; the rimLight DirectionalLight above keeps #00d5ff.
    // History: V6 ice white (07-06) → V5 wide sheen (07-07 am) → V3 bold.
    heroRim: { power: 2.2, strength: 0.45, tint: '#00d5ff' },
  },
  // Arctic dressing: giant ordinal-penguin ice statues, igloos, snow + ice.
  // customStartArch: skip the default finish gantry (the ICE IS NICE arch
  // marks the start/finish instead).
  dressing: { penguinVillage: true, customStartArch: true },
  // Shorter loop than Comeback City; budgets stay generous for the gate.
  budgets: { finishSeconds: 45, speedFloor: 130 },
});
