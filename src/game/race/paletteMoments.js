// B2: per-lap palette moments — MK8-style per-section color scripting.
// A track opts in with an additive `palette.moments` key: an array of
// [{ progress, fog: { color, near, far }, hemi: { sky, ground }, sun:
// { color, intensity }, rim, rimTint, bloom }] sorted by lap progress.
// Every field except `progress` is optional; resolveMoments fills the gaps
// from the track palette's own base values so lerp endpoints are always
// fully specified and the per-frame path never branches on missing data.
//
// PURE on purpose (no THREE import): the node content playtest exercises
// the segment pick, smoothstep easing, and the 1.0 -> 0.0 lap wrap
// directly. Colors travel as decoded sRGB triples { r, g, b } in 0..1;
// the runtime applies them with Color.setRGB(r, g, b, SRGBColorSpace),
// which lands exactly where the same hex would through new Color(hex).
//
// Field semantics (bases mirror createScene in ComebackCityThreeKartRace):
// - hemi lerps SKY/GROUND HUE only — hemi intensity is deliberately not a
//   moment channel (raising hemi luminance pushes Penguin Village's white
//   snow past the bloom threshold and the frame cascades to white-out;
//   candidate sets must also be luma-normalized to the base hemi).
// - rim drives the rimLight DirectionalLight; rimTint drives the shared
//   hero-rim shader tint (TOON_RIM_SHARED_TINT) whose base is the
//   owner-picked heroRim.tint, NOT rimLightColor — keep them separate or
//   moments would repaint the picked "ice white" rim by accident.
// - bloom is a MULTIPLIER on whichever bloom the active chain carries
//   (legacy UnrealBloomPass.strength or pmndrs BloomEffect.intensity), so
//   moment data stays chain-agnostic.
// - fog.far is clamped to 840: camera far is 860 and fog beyond it
//   silently no-ops the haze.

const FOG_FAR_MAX = 840;

const lerp = (a, b, t) => a + (b - a) * t;

const smoothstep = (t) => {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
};

// '#rrggbb' -> { r, g, b } in 0..1 (sRGB, undecoded — see header).
const hexToRgb01 = (hex) => {
  const value = String(hex).replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16) / 255,
    g: parseInt(value.slice(2, 4), 16) / 255,
    b: parseInt(value.slice(4, 6), 16) / 255,
  };
};

// Base atmosphere for a palette: the same fallback chain createScene uses,
// so a palette carrying the B1 keys (Penguin Village's V8 "storm front")
// resolves to exactly those values and a bare palette resolves to the
// shipped Comeback City look. `baseOverrides` lets the caller pin values
// resolved outside the palette (the runtime passes the ACTIVE hero-rim
// tint, which a dev lab hook may have overridden).
const momentBase = (palette = {}, baseOverrides = {}) => ({
  bloom: baseOverrides.bloom ?? 1,
  fog: {
    color: palette.fog?.color || '#272252',
    near: palette.fog?.near ?? 240,
    far: Math.min(palette.fog?.far ?? 820, FOG_FAR_MAX),
  },
  hemi: {
    sky: palette.hemi?.sky || '#8d8ce0',
    ground: palette.hemi?.ground || '#2a1e4a',
  },
  sun: {
    color: palette.sunColor || '#ffae72',
    // Matches createScene's DirectionalLight intensity (not a palette key).
    intensity: baseOverrides.sunIntensity ?? 2.6,
  },
  rim: palette.rimLightColor || '#4fd8ff',
  rimTint:
    baseOverrides.rimTint || palette.heroRim?.tint || palette.rimLightColor || '#4fd8ff',
});

// Resolve palette.moments into fully-specified, hex-decoded lerp endpoints
// sorted by progress. Returns null when the palette carries no moments —
// the runtime stores that null and the per-frame hook is one truthy check
// (Comeback City's approved look is untouched by construction).
export const resolveMoments = (palette = {}, baseOverrides = {}) => {
  const moments = palette.moments;
  if (!Array.isArray(moments) || moments.length === 0) return null;
  const base = momentBase(palette, baseOverrides);
  return moments
    .map((moment) => ({
      progress: Math.min(1, Math.max(0, moment.progress ?? 0)),
      bloom: moment.bloom ?? base.bloom,
      fogColor: hexToRgb01(moment.fog?.color || base.fog.color),
      fogNear: moment.fog?.near ?? base.fog.near,
      fogFar: Math.min(moment.fog?.far ?? base.fog.far, FOG_FAR_MAX),
      hemiSky: hexToRgb01(moment.hemi?.sky || base.hemi.sky),
      hemiGround: hexToRgb01(moment.hemi?.ground || base.hemi.ground),
      sunColor: hexToRgb01(moment.sun?.color || base.sun.color),
      sunIntensity: moment.sun?.intensity ?? base.sun.intensity,
      rim: hexToRgb01(moment.rim || base.rim),
      rimTint: hexToRgb01(moment.rimTint || base.rimTint),
    }))
    .sort((a, b) => a.progress - b.progress);
};

// Scratch output for sampleMoments — allocate ONCE (createScene does), so
// the per-frame sample writes in place and never allocates.
export const createMomentSample = () => ({
  bloom: 1,
  fogColor: { r: 0, g: 0, b: 0 },
  fogFar: 0,
  fogNear: 0,
  hemiGround: { r: 0, g: 0, b: 0 },
  hemiSky: { r: 0, g: 0, b: 0 },
  rim: { r: 0, g: 0, b: 0 },
  rimTint: { r: 0, g: 0, b: 0 },
  segment: 0,
  sunColor: { r: 0, g: 0, b: 0 },
  sunIntensity: 0,
  t: 0,
});

const lerpColorInto = (target, a, b, t) => {
  target.r = lerp(a.r, b.r, t);
  target.g = lerp(a.g, b.g, t);
  target.b = lerp(a.b, b.b, t);
};

// Wrap-aware segment lerp with smoothstep easing. `progress` is the
// per-lap 0..1 race progress; the segment from the LAST moment back to the
// FIRST spans the 1.0 -> 0.0 lap wrap, so approaching the first moment
// from either side converges on the same values — no color pop at the
// finish line. Mutates and returns `out` (zero allocations).
export const sampleMoments = (resolved, progress, out) => {
  const count = resolved.length;
  const p = progress - Math.floor(progress);
  let index = count - 1;
  for (let i = 0; i < count; i += 1) {
    if (resolved[i].progress <= p) index = i;
    else break;
  }
  const from = resolved[index];
  const to = resolved[(index + 1) % count];
  let span = to.progress - from.progress;
  let local = p - from.progress;
  if (index === count - 1) {
    // Wrap segment (single-moment tracks land here too: from === to, and
    // identical endpoints make every t a no-op).
    span += 1;
    if (local < 0) local += 1;
  }
  const t = smoothstep(span > 0 ? local / span : 0);
  out.segment = index;
  out.t = t;
  out.bloom = lerp(from.bloom, to.bloom, t);
  lerpColorInto(out.fogColor, from.fogColor, to.fogColor, t);
  out.fogNear = lerp(from.fogNear, to.fogNear, t);
  out.fogFar = lerp(from.fogFar, to.fogFar, t);
  lerpColorInto(out.hemiSky, from.hemiSky, to.hemiSky, t);
  lerpColorInto(out.hemiGround, from.hemiGround, to.hemiGround, t);
  lerpColorInto(out.sunColor, from.sunColor, to.sunColor, t);
  out.sunIntensity = lerp(from.sunIntensity, to.sunIntensity, t);
  lerpColorInto(out.rim, from.rim, to.rim, t);
  lerpColorInto(out.rimTint, from.rimTint, to.rimTint, t);
  return out;
};
