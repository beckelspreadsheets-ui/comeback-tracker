// Graphics overhaul — SINGLE configuration source (Hermes graphics branch).
// Every new lighting/material/atmosphere feature introduced by the graphics
// revamp toggles from this one module. Two presets ship: 'high' (the
// cinematic default the owner sees) and 'low' (a perf floor for weak GPUs /
// battery saver). A `?gfx=low|high|off` URL param overrides the preset for
// A/B and QA; `off` restores the pre-overhaul shipped look byte-for-byte
// (every feature short-circuits before touching the scene).
//
// Physics/collision/controls/drift are NEVER read or written here — this
// module is rendering/presentation only. Anything costly sits behind the
// 'high' preset so the 60fps target holds on 'low'.

export const GRAPHICS_PRESET_NAMES = Object.freeze(['high', 'low', 'off']);

// Per-feature toggles + tuning. `high` = full cinematic pass; `low` keeps the
// cheap wins (grade + fog + a trimmed env) and drops the per-frame-cost items
// (sharp shadows, full-res env reflections, hemi sun-fill).
const PRESETS = {
  high: {
    // Phase 1 — lighting & atmosphere.
    atmosphere: true, // per-track cinematic fog/hemi/sun/rim grade
    toneExposure: 1.18, // toneMappingExposure lift (was 1.05) for a richer key
    environmentMap: true, // PMREM RoomEnvironment -> scene.environment (PBR sheen)
    environmentIntensity: 0.55, // subtle: lifts metal/paint without washing the toon look
    shadowBoost: true, // sharper + wider key-light shadow frustum
    shadowMapSize: 1024, // up from 384 — crisp kart contact shadows
    sunFill: true, // warm low-intensity bounce light opposite the key
  },
  low: {
    atmosphere: true,
    toneExposure: 1.12,
    environmentMap: true, // RoomEnvironment PMREM is cheap (one-time bake)
    environmentIntensity: 0.35,
    shadowBoost: false, // keep the shipped 384 map + tight frustum
    shadowMapSize: 384,
    sunFill: false,
  },
  off: {
    atmosphere: false,
    toneExposure: null, // null = leave the shipped value untouched
    environmentMap: false,
    environmentIntensity: 0,
    shadowBoost: false,
    shadowMapSize: 384,
    sunFill: false,
  },
};

// Resolve the active preset. URL wins (?gfx=), else default 'high'. Parsed
// once per page load — the graphics preset is a boot-time decision, not a
// per-frame knob, so hot-swapping mid-race is out of scope by design.
export const resolveGraphicsPreset = (search = undefined) => {
  let param = null;
  if (typeof window !== 'undefined') {
    const raw = search ?? window.location.search;
    param = new URLSearchParams(raw).get('gfx');
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
