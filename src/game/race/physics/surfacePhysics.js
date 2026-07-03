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
