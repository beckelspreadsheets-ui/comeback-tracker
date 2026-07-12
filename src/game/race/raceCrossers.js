// Race crosser hazards — fish carts, penguin marches, avalanche rumbles.
// Pure JS, Three.js-free and DOM-free, deterministic, opt-in per track.

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const wrap01 = (value) => ((value % 1) + 1) % 1

const signedProgressDelta = (from, to) => {
  let delta = wrap01(to) - wrap01(from)
  if (delta > 0.5) delta -= 1
  if (delta < -0.5) delta += 1
  return delta
}

const hashString01 = (value) => {
  const text = String(value)
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0
  }
  return hash / 0xffffffff
}

export const CROSSER_TYPES = Object.freeze({
  avalancheRumble: {
    hitSeverity: 2,
    label: 'Avalanche Rumble',
    laneAmplitude: 0,
    laneFrequency: 0,
    speedMultiplier: 0.55,
  },
  fishCart: {
    hitSeverity: 1,
    label: 'Fish Cart',
    laneAmplitude: 0,
    laneFrequency: 0,
    speedMultiplier: 0.72,
  },
  penguinMarch: {
    hitSeverity: 1,
    label: 'Penguin March',
    laneAmplitude: 0.35,
    laneFrequency: 0.7,
    speedMultiplier: 0.76,
  },
  // K4 (2026-07-12): steady straight-line walker for ordinal-likeness
  // crossers (outplayasians at the PV finish line is the first).
  ordinalWalker: {
    hitSeverity: 1,
    label: 'Ordinal Walker',
    laneAmplitude: 0,
    laneFrequency: 0,
    speedMultiplier: 0.7,
  },
})

export const CROSSER_DEFAULTS = Object.freeze({
  direction: 1,
  modelType: 'fishCart',
  speed: 0.5,
  width: 0.25,
})

export const createCrossers = (track = {}) => {
  const entries = track.crossers || []
  return {
    instances: entries.map((entry, index) => {
      const key = entry.key || `crosser-${index}`
      const modelType = entry.modelType || CROSSER_DEFAULTS.modelType
      return {
        active: true,
        crossedCount: 0,
        cycleTimer: 0,
        direction: Math.sign(entry.direction ?? CROSSER_DEFAULTS.direction) || 1,
        key,
        lane: entry.lane ?? 0,
        modelType,
        phase: hashString01(key) * Math.PI * 2,
        progress: wrap01(entry.progress ?? 0),
        speed: entry.speed ?? CROSSER_DEFAULTS.speed,
        width: entry.width ?? CROSSER_DEFAULTS.width,
      }
    }),
  }
}

export const updateCrossersForFrame = ({
  crossers,
  dt = 0,
  roadWidth = 1,
  trackLength = 1,
} = {}) => {
  if (!crossers?.instances?.length) return { instances: [] }
  // Crossers operate in normalized lane space (-1..1 road, with shoulder
  // margin so they can start/end just off the edges like the Penguin March).
  const halfWidth = 1
  const shoulder = 0.35
  crossers.instances.forEach((crosser) => {
    if (!crosser.active) return
    const type = CROSSER_TYPES[crosser.modelType] || CROSSER_TYPES.fishCart
    crosser.cycleTimer += dt
    const wobble = type.laneFrequency > 0
      ? Math.sin((crosser.cycleTimer + crosser.phase) * type.laneFrequency * Math.PI * 2)
      : 0
    const lateralSpeed = crosser.speed * crosser.direction * (1 + wobble * type.laneAmplitude)
    crosser.lane += lateralSpeed * dt
    const resetMargin = crosser.width * 0.5
    if (Math.abs(crosser.lane) > halfWidth + shoulder + resetMargin) {
      crosser.lane = -Math.sign(crosser.lane) * (halfWidth + shoulder)
      crosser.crossedCount += 1
    }
  })
  return crossers
}

export const crosserHitFor = ({
  crossers,
  lane = 0,
  progress = 0,
  trackLength = 1,
} = {}) => {
  if (!crossers?.instances?.length) return null
  const wrappedProgress = wrap01(progress)
  let best = null
  let bestDistance = Infinity
  const length = Math.max(trackLength, 0.001)
  crossers.instances.forEach((crosser) => {
    if (!crosser.active) return
    const progressDelta = signedProgressDelta(wrappedProgress, crosser.progress)
    const progressSpan = (crosser.width / length) * 0.5 + 0.005
    if (Math.abs(progressDelta) > progressSpan) return
    const halfHitWidth = crosser.width * 0.5
    if (Math.abs(lane - crosser.lane) > halfHitWidth) return
    const distance = Math.abs(progressDelta)
    if (distance < bestDistance) {
      bestDistance = distance
      best = crosser
    }
  })
  return best
}

export const crosserAvoidanceLanes = ({
  crossers,
  lane = 0,
  lookaheadSeconds = 2,
  progress = 0,
  racerSpeed = 120,
  roadWidth = 1,
  trackLength = 1,
} = {}) => {
  if (!crossers?.instances?.length) return []
  const wrappedProgress = wrap01(progress)
  // Lane hints are normalized to match rivalRacers.js targetLane conventions.
  const halfWidth = 1
  const length = Math.max(trackLength, 0.001)
  const hints = []
  crossers.instances.forEach((crosser) => {
    if (!crosser.active) return
    const progressDelta = signedProgressDelta(wrappedProgress, crosser.progress)
    if (progressDelta <= 0) return
    const secondsToImpact = progressDelta * length / Math.max(racerSpeed, 0.001)
    if (secondsToImpact > lookaheadSeconds) return
    const avoidDirection = lane > crosser.lane ? 1 : -1
    const targetOffset = avoidDirection * Math.max(crosser.width * 0.75, 0.18)
    const targetLane = clamp(crosser.lane + targetOffset, -halfWidth, halfWidth)
    hints.push({
      key: crosser.key,
      lane: crosser.lane,
      progress: crosser.progress,
      targetLane,
      targetOffset,
      urgency: 1 - clamp(secondsToImpact / lookaheadSeconds, 0, 1),
    })
  })
  return hints
}

export const applyCrosserHitToRacer = ({
  crosser,
  racer,
  severity,
} = {}) => {
  if (!racer || !crosser) {
    return { applied: false, reason: 'missing' }
  }
  if ((racer.invincibleTimer || 0) > 0) {
    return { applied: false, reason: 'invincible' }
  }
  if ((racer.jumpHeight || 0) > 1.1) {
    return { applied: false, reason: 'airborne' }
  }
  const type = CROSSER_TYPES[crosser.modelType] || CROSSER_TYPES.fishCart
  const hitSeverity = severity ?? type.hitSeverity ?? 1
  const hitDuration = 0.45 + hitSeverity * 0.22
  const speedMultiplier = clamp(0.72 - hitSeverity * 0.08, 0.42, 0.72)
  racer.hitTimer = Math.max(racer.hitTimer || 0, hitDuration)
  if (typeof racer.speed === 'number') {
    racer.speed *= speedMultiplier
  }
  if (typeof racer.velocity?.multiplyScalar === 'function') {
    racer.velocity.multiplyScalar(speedMultiplier)
  }
  return {
    applied: true,
    hitDuration,
    hitSeverity,
    reason: null,
    speedMultiplier,
  }
}
