// Graphics overhaul — per-track atmosphere grades (Phase 1).
// Pure data (no THREE) so the runtime can import it without dragging the
// renderer into Node QA scripts — same constraint as race/tracks/*.js.
//
// Each track gets a `grade` that OVERRIDES the createScene fallbacks with a
// deliberate cinematic mood. These are presentation-only: they feed fog,
// hemisphere, sun, rim, and the new sun-fill bounce light. Physics is never
// touched. The shipped defaults stay reachable via ?gfx=off.
//
// Design intent per track:
//   comeback-city   = warm golden-hour neon dusk. The sunset sky already
//     exists; the grade warms the key light, deepens the fog to purple so the
//     neon skyline separates, and lifts ambient so kart paint reads instead
//     of silhouetting into the dusk.
//   penguin-village = crisp arctic dawn. The shipped "storm front" is muddy
//     and the karts dissolve into the snow; the grade cools the sky fill,
//     pushes a low warm sun for long shadows + rim, and thins the fog so the
//     ice shelf and aurora horizon read with depth.

export const TRACK_ATMOSPHERE_GRADES = Object.freeze({
  'comeback-city': Object.freeze({
    // Deep violet haze — pulls the horizon back so the neon towers pop. Fog
    // far stays well under the 840 camera-far no-op ceiling.
    fog: { color: '#241c3f', near: 260, far: 760 },
    // Warm lavender sky fill over a deep indigo ground bounce — the classic
    // dusk two-tone that keeps kart undersides from going black.
    hemi: { sky: '#9a8ff0', ground: '#241a44', intensity: 2.85 },
    // Low golden key — the "sun is setting behind the skyline" read. Warm
    // amber flatters the red/white hero karts and the gold ₿ accents.
    sunColor: '#ffb066',
    sunIntensity: 2.85,
    // Cool cyan rim from the opposite side — the neon-sign edge light that
    // separates karts from the dark road. Matches the shipped rim tint.
    rimLightColor: '#4fd8ff',
    rimLightIntensity: 2.35,
    // Warm bounce fill (new): a soft low light opposite the key that fakes
    // sky/ground bounce so shaded faces aren't flat black. Low intensity —
    // it's a fill, not a second key.
    sunFillColor: '#6a5fd0',
    sunFillIntensity: 0.85,
    // Road surface specular (Phase 1 materials): neon-dusk asphalt reads
    // slightly wet so the city lights + sun streak across it. envMapIntensity
    // scales the IBL contribution on this one material (multiplies the
    // scene-wide environmentIntensity for the road only).
    road: { metalness: 0.08, roughness: 0.62, envMapIntensity: 0.55 },
    ground: { roughness: 0.9, envMapIntensity: 0.25 },
  }),
  'penguin-village': Object.freeze({
    // Thin cold haze — keeps the arctic air readable without the shipped
    // grey-out. Slightly tighter near/far than CC for a fresher feel.
    fog: { color: '#5a7a94', near: 200, far: 680 },
    // Bright icy sky over deep blue shadow — high key for snow that doesn't
    // blow out, dark enough ground to ground the karts.
    hemi: { sky: '#6a9ec8', ground: '#0b1c2e', intensity: 2.7 },
    // Pale gold dawn sun — long shadows + a warm edge on the ice. Cools the
    // snow's flat white into something with direction.
    sunColor: '#f2d9a8',
    sunIntensity: 2.6,
    // Aurora-cyan rim — the track's signature #00d5ff, pushed a touch.
    rimLightColor: '#18dcff',
    rimLightIntensity: 2.55,
    // Cold sky bounce fill — lifts the shadowed kart flanks off the snow.
    sunFillColor: '#3f6f9f',
    sunFillIntensity: 0.75,
    // Road surface specular: packed-snow/ice asphalt gets a glossier sheen
    // than CC so the dawn sun glints off the frozen surface.
    road: { metalness: 0.05, roughness: 0.58, envMapIntensity: 0.6 },
    ground: { roughness: 0.82, envMapIntensity: 0.35 },
  }),
});

// Fallback used when a track carries no grade entry (future tracks). Mirrors
// the shipped createScene defaults so an ungraded track never regresses.
export const DEFAULT_ATMOSPHERE_GRADE = Object.freeze({
  fog: { color: '#272252', near: 240, far: 820 },
  hemi: { sky: '#8d8ce0', ground: '#2a1e4a', intensity: 3.3 },
  sunColor: '#ffae72',
  sunIntensity: 2.6,
  rimLightColor: '#4fd8ff',
  rimLightIntensity: 2.0,
  sunFillColor: '#5a4fa8',
  sunFillIntensity: 0.8,
  road: { metalness: 0.06, roughness: 0.6, envMapIntensity: 0.6 },
  ground: { roughness: 0.92, envMapIntensity: 0.3 },
});

export const atmosphereGradeFor = (trackKey) =>
  TRACK_ATMOSPHERE_GRADES[trackKey] || DEFAULT_ATMOSPHERE_GRADE;
