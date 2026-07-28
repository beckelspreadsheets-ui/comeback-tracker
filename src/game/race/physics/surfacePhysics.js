// Surface physics — pure, deterministic, Three.js-free.
// Applies track-defined surface bands (ice, snow, boost, slipZone) to a plain
// kart state object as multipliers for steering, grip, drift charge, and accel.
// Missing or empty surfaceBands is a no-op and falls back to asphalt.

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const wrap01 = (value) => ((value % 1) + 1) % 1

export const SURFACE_TYPES = Object.freeze({
  asphalt: {
    accelerationMultiplier: 1,
    driftChargeMultiplier: 1,
    driftGripMultiplier: 1,
    gripMultiplier: 1,
    steerMultiplier: 1,
  },
  ice: {
    accelerationMultiplier: 0.72,
    driftChargeMultiplier: 1.25,
    driftGripMultiplier: 0.55,
    gripMultiplier: 0.35,
    steerMultiplier: 0.7,
  },
  snow: {
    accelerationMultiplier: 0.82,
    driftChargeMultiplier: 0.92,
    driftGripMultiplier: 0.78,
    gripMultiplier: 0.65,
    steerMultiplier: 0.85,
  },
  boost: {
    accelerationMultiplier: 1.12,
    boostDuration: 0.35,
    boostImpulse: 14,
    driftChargeMultiplier: 1,
    driftGripMultiplier: 1,
    gripMultiplier: 1,
    steerMultiplier: 1,
  },
  slipZone: {
    accelerationMultiplier: 0.55,
    driftChargeMultiplier: 1.45,
    driftGripMultiplier: 0.35,
    gripMultiplier: 0.22,
    steerMultiplier: 0.55,
  },
  // Past the kerb crest. Not authored into any track's surfaceBands — it is
  // what a lane clamp wider than the road resolves to once the outer wheel can
  // leave the tarmac. Kept here (rather than in the runtime) so the penalty
  // for leaving the road lives beside every other surface penalty.
  offroad: {
    accelerationMultiplier: 0.55,
    driftChargeMultiplier: 0.6,
    driftGripMultiplier: 0.7,
    gripMultiplier: 0.62,
    steerMultiplier: 0.85,
  },
})

// What each surface does to the ROAD's albedo, as a multiplier on the asphalt
// map. This lives beside the physics table on purpose: the whole point of the
// visible surface bands is that what the player sees and what the kart does
// come from ONE source. surfaceTypeAt() picks the type; the road mesh bakes
// this tint per vertex; applySurfaceToPhysics reads the same key.
//
// Snow lifts and cools slightly rather than going white — the road stays dark
// for readability (the Sherbet Land rule the track palettes already follow),
// so the band has to read as salted tarmac, not as a snowfield laid over the
// racing line. Ice goes distinctly blue AND slightly darker, because what sells
// ice is the specular highlight below, not albedo.
// Wave 3 round 2: ice 0.78/1.02/1.34 -> 0.9/1.0/1.16. The old spread put ~56
// units of chroma into the albedo BEFORE the sheen ran, and the sheen adds a
// pale blue on top — the two stacked into a band whose blue channel measured a
// clamped 255 across penguin-village-p0_24, which reads as a neon decal rather
// than as a frozen road. Chroma in the albedo is exactly what ice does NOT
// have: what sells it is the highlight, so the albedo's whole job here is to
// stay pale, cool and slightly BRIGHTER than the tarmac.
export const SURFACE_ROAD_TINT = Object.freeze({
  asphalt: [1, 1, 1],
  boost: [1.06, 1, 0.9],
  ice: [0.9, 1, 1.16],
  offroad: [0.9, 0.94, 0.86],
  slipZone: [0.82, 1, 1.2],
  snow: [1.26, 1.3, 1.34],
})

// How hard the road's hard-edged specular fires per surface (0 = dry tarmac).
// Drives the ice sheen injection on the road material.
export const SURFACE_ROAD_SHEEN = Object.freeze({
  asphalt: 0,
  boost: 0,
  ice: 1,
  offroad: 0,
  slipZone: 0.75,
  snow: 0.14,
})

const progressInBand = (progress, start, end) =>
  start <= end
    ? progress >= start && progress <= end
    : progress >= start || progress <= end

const laneInBand = (lane, start, end) => {
  const min = Math.min(start, end)
  const max = Math.max(start, end)
  return lane >= min && lane <= max
}

export const surfaceTypeAt = ({ progress = 0, lane = 0 } = {}, surfaceBands = []) => {
  if (!surfaceBands?.length) return 'asphalt'
  const p = wrap01(progress)
  const l = clamp(lane, -1, 1)
  for (const band of surfaceBands) {
    if (!band || !SURFACE_TYPES[band.type]) continue
    if (
      progressInBand(p, band.progressStart ?? 0, band.progressEnd ?? 1) &&
      laneInBand(l, band.laneStart ?? -1, band.laneEnd ?? 1)
    ) {
      return band.type
    }
  }
  return 'asphalt'
}

export const applySurfaceToPhysics = (kartState = {}, surfaceType = 'asphalt', dt = 0) => {
  const surface = SURFACE_TYPES[surfaceType] || SURFACE_TYPES.asphalt
  kartState.surfaceType = surfaceType
  kartState.surfaceGripMultiplier = surface.gripMultiplier
  kartState.surfaceDriftGripMultiplier = surface.driftGripMultiplier
  kartState.surfaceDriftChargeMultiplier = surface.driftChargeMultiplier
  kartState.surfaceAccelerationMultiplier = surface.accelerationMultiplier
  kartState.surfaceSteerMultiplier = surface.steerMultiplier
  kartState.surfaceBoostImpulse = surface.boostImpulse || 0
  kartState.surfaceBoostDuration = surface.boostDuration || 0
  kartState.surfaceDt = dt
  return {
    accelerationMultiplier: kartState.surfaceAccelerationMultiplier,
    driftChargeMultiplier: kartState.surfaceDriftChargeMultiplier,
    driftGripMultiplier: kartState.surfaceDriftGripMultiplier,
    gripMultiplier: kartState.surfaceGripMultiplier,
    steerMultiplier: kartState.surfaceSteerMultiplier,
    surfaceType,
  }
}
