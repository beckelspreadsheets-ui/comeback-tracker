// Graphics overhaul — SINGLE configuration source (Hermes graphics branch).
// Every new lighting/material/atmosphere feature introduced by the graphics
// revamp toggles from this one module. Two presets ship: 'high' (the
// presentation default the owner sees) and 'low' (a perf floor for weak GPUs /
// battery saver). A `?gfx=low|high|off` URL param overrides the preset for
// A/B and QA; `off` skips this module's additive lighting/material/post
// features before they touch the scene.
//
// Physics/collision/controls/drift are NEVER read or written here — this
// module is rendering/presentation only. Anything costly sits behind the
// 'high' preset so the 60fps target holds on 'low'.

export const GRAPHICS_PRESET_NAMES = Object.freeze(['high', 'low', 'off']);

// Per-feature toggles + tuning. `high` = presentation default; `low` keeps the
// cheap wins (grade + fog + a trimmed env) and drops heavier visual extras.
const PRESETS = {
  high: {
    // Phase 1 — lighting & atmosphere.
    atmosphere: true, // per-track fog/hemi/sun/rim grade
    toneExposure: 1.14, // toneMappingExposure lift (was 1.05) for a richer key
    environmentMap: true, // PMREM RoomEnvironment -> scene.environment (PBR sheen)
    environmentIntensity: 0.55, // subtle: lifts metal/paint without washing the toon look
    shadowBoost: false, // renderer shadows are off for this presentation slice
    shadowMapSize: 384,
    sunFill: true, // warm low-intensity bounce light opposite the key
    // Phase 2 — post-processing.
    postColorGrade: true, // LUT-style hue/sat + brightness/contrast cohesive grade
    gradeSaturation: 0.12, // +vibrance: lifts the neon palette out of cartoon-flat
    gradeContrast: 0.07, // gentle S-curve for material separation
    speedChromaticAberration: false, // keep the chase view optically clean
    chromaticAberrationMax: 0,
    speedBloomBoost: 0.12, // restrained boost lift, never a cover-up
    // Phase 2 — particles. Keep only state-critical drift readability here.
    particlesDriftSmoke: true, // drifting tire smoke/dust puffs (visual-only)
    particlesBoostSparks: false,
    particlesAmbient: false,
    ambientParticleCount: 0,
    // Phase 3 — track surface detail.
    trackDetailMaps: true, // procedural normal + roughness detail on the road
    trackDetailNormalScale: 0.3, // micro-surface relief strength (subtle, not gravel)
    // Phase 4 — sky backdrop.
    cinematicSky: true, // equirect sky dome: gradient + sun disc + horizon glow + stars
  },
  low: {
    atmosphere: true,
    toneExposure: 1.1,
    environmentMap: true, // RoomEnvironment PMREM is cheap (one-time bake)
    environmentIntensity: 0.35,
    shadowBoost: false, // local A/B shadow boost stays disabled on low
    shadowMapSize: 384,
    sunFill: false,
    // Phase 2 — low keeps the cheap wins, drops the per-frame-cost items.
    postColorGrade: true,
    gradeSaturation: 0.1,
    gradeContrast: 0.06,
    speedChromaticAberration: false, // CA is a per-frame full-screen pass — drop on low
    chromaticAberrationMax: 0,
    speedBloomBoost: 0.08,
    particlesDriftSmoke: true,
    particlesBoostSparks: false,
    particlesAmbient: false, // ambient field is the first particle cut on weak GPUs
    ambientParticleCount: 0,
    // Phase 3 — low keeps the detail maps (cheap one-time canvas bake, then a
    // single texture lookup; big readability win for the cost).
    trackDetailMaps: true,
    trackDetailNormalScale: 0.32,
    // Phase 4 — sky is a one-time canvas bake (no per-frame cost),
    // so it stays on at 'low' too.
    cinematicSky: true,
  },
  off: {
    atmosphere: false,
    toneExposure: null, // null = leave the renderer fallback exposure untouched
    environmentMap: false,
    environmentIntensity: 0,
    shadowBoost: false,
    shadowMapSize: 384,
    sunFill: false,
    postColorGrade: false,
    gradeSaturation: 0,
    gradeContrast: 0,
    speedChromaticAberration: false,
    chromaticAberrationMax: 0,
    speedBloomBoost: 0,
    particlesDriftSmoke: false,
    particlesBoostSparks: false,
    particlesAmbient: false,
    ambientParticleCount: 0,
    trackDetailMaps: false,
    trackDetailNormalScale: 0,
    cinematicSky: false,
  },
};

// Resolve the active preset. URL wins (?gfx=), else the player's saved
// preference (cc-kart-gfx, set from the M5 settings toggles on the select
// screen), else default 'high'. Parsed once per page load — the graphics
// preset is a boot-time decision, not a per-frame knob, so hot-swapping
// mid-race is out of scope by design.
export const resolveGraphicsPreset = (search = undefined) => {
  let param = null;
  if (typeof window !== 'undefined') {
    const raw = search ?? window.location.search;
    param = new URLSearchParams(raw).get('gfx');
    if (!param) {
      try {
        param = window.localStorage?.getItem('cc-kart-gfx');
      } catch {
        param = null;
      }
    }
  }
  if (param === 'low') return 'low';
  if (param === 'off') return 'off';
  return 'high';
};

export const graphicsConfigFor = (presetName) => {
  const name = GRAPHICS_PRESET_NAMES.includes(presetName) ? presetName : 'high';
  return Object.freeze({ name, ...PRESETS[name] });
};

// Convenience for call sites: resolve + freeze in one step.
export const resolveGraphicsConfig = (search = undefined) =>
  graphicsConfigFor(resolveGraphicsPreset(search));
