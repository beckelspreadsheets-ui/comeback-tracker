// Pure breakable-object system for track-side props (snowmen, ice pillars, barrels).
// No Three.js, no DOM, no Math.random — state is fully deterministic from track data.

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const wrap01 = (value) => ((value % 1) + 1) % 1

export const BREAKABLE_TYPES = {
  barrel: 'barrel',
  icePillar: 'icePillar',
  snowman: 'snowman',
}

export const BREAKABLE_HIT_PADDING = 2.5

export const BREAKABLE_DEFAULT_RADIUS = {
  barrel: 4,
  icePillar: 5,
  snowman: 4.5,
}

export const BREAKABLE_RESPAWN_SECONDS = 30

export const BREAKABLE_TYPE_DEFS = {
  [BREAKABLE_TYPES.snowman]: {
    maxHits: 1,
    spawn: { kind: 'itemBox' },
  },
  [BREAKABLE_TYPES.icePillar]: {
    maxHits: 2,
    spawn: { hazardType: 'iceShard', kind: 'hazard' },
  },
  [BREAKABLE_TYPES.barrel]: {
    maxHits: 1,
    spawn: { hazardType: 'barrel', kind: 'hazard' },
  },
}

const breakableRadiusFor = (breakable) =>
  breakable.radius ?? BREAKABLE_DEFAULT_RADIUS[breakable.type] ?? BREAKABLE_DEFAULT_RADIUS.snowman

const breakableLaneFor = (breakable) =>
  Number.isFinite(breakable.lane) ? breakable.lane : Number.isFinite(breakable.side) ? breakable.side : 0

const distanceAlongTrack = (from, to, trackLength) => {
  const raw = Math.abs(wrap01(to) - wrap01(from))
  return Math.min(raw, 1 - raw) * Math.max(1, trackLength || 1)
}

const createBreakableState = (definition, index) => {
  const type = definition.type || BREAKABLE_TYPES.snowman
  const def = BREAKABLE_TYPE_DEFS[type] || BREAKABLE_TYPE_DEFS[BREAKABLE_TYPES.snowman]
  const key = definition.key || `${type}-${index}`
  return {
    broken: false,
    hits: 0,
    hitCooldown: 0,
    id: key,
    key,
    lane: breakableLaneFor(definition),
    maxHits: def.maxHits,
    progress: Number.isFinite(definition.progress) ? definition.progress : 0,
    radius: breakableRadiusFor({ ...definition, type }),
    respawn: Number.isFinite(definition.respawn) ? definition.respawn : 0,
    respawnTimer: 0,
    type,
  }
}

const spawnRequestFor = (breakable) => {
  const def = BREAKABLE_TYPE_DEFS[breakable.type]
  if (!def) return null
  const { kind, hazardType } = def.spawn
  return {
    id: breakable.id,
    key: breakable.key,
    lane: breakable.lane,
    progress: breakable.progress,
    type: kind,
    ...(hazardType ? { hazardType } : {}),
  }
}

export const createBreakables = (track = {}) => {
  const definitions = Array.isArray(track.breakableObjects) ? track.breakableObjects : []
  return {
    objects: definitions.map((definition, index) => createBreakableState(definition, index)),
    spawnRequests: [],
  }
}

export const breakableHitFor = ({
  breakables,
  hitPadding = BREAKABLE_HIT_PADDING,
  lane = 0,
  progress = 0,
  trackLength = 1,
} = {}) => {
  if (!breakables?.objects?.length) return null

  for (const breakable of breakables.objects) {
    if (breakable.broken || breakable.hitCooldown > 0) continue

    const along = distanceAlongTrack(breakable.progress, progress, trackLength)
    const across = Math.abs(breakable.lane - lane)
    const reach = breakable.radius + hitPadding
    if (along * along + across * across > reach * reach) continue

    breakable.hits += 1
    breakable.hitCooldown = 0.25

    if (breakable.hits < breakable.maxHits) {
      return {
        damaged: true,
        id: breakable.id,
        key: breakable.key,
        remainingHits: breakable.maxHits - breakable.hits,
        spawnRequest: null,
        type: breakable.type,
      }
    }

    breakable.broken = true
    breakable.respawnTimer = breakable.respawn > 0 ? breakable.respawn : 0

    const spawnRequest = spawnRequestFor(breakable)
    if (spawnRequest && Array.isArray(breakables.spawnRequests)) breakables.spawnRequests.push(spawnRequest)

    return {
      broken: true,
      id: breakable.id,
      key: breakable.key,
      remainingHits: 0,
      spawnRequest,
      type: breakable.type,
    }
  }

  return null
}

export const updateBreakablesForFrame = ({
  breakables,
  dt = 0,
  hitTesters = [],
} = {}) => {
  const results = []
  if (!breakables?.objects?.length) return { hits: results, spawnRequests: [] }

  const safeDt = Math.max(0, dt)
  if (!Array.isArray(breakables.spawnRequests)) breakables.spawnRequests = []
  breakables.spawnRequests.length = 0

  for (const breakable of breakables.objects) {
    if (breakable.hitCooldown > 0) breakable.hitCooldown = Math.max(0, breakable.hitCooldown - safeDt)
    if (breakable.broken && breakable.respawnTimer > 0) {
      breakable.respawnTimer = Math.max(0, breakable.respawnTimer - safeDt)
      if (breakable.respawnTimer <= 0) {
        breakable.broken = false
        breakable.hits = 0
      }
    }
  }

  const testers = Array.isArray(hitTesters) ? hitTesters : []
  for (const tester of testers) {
    const input = typeof tester === 'function' ? tester() : tester
    if (!input) continue
    const hit = breakableHitFor({
      breakables,
      hitPadding: input.hitPadding,
      lane: input.lane,
      progress: input.progress,
      trackLength: input.trackLength,
    })
    if (hit) results.push({ ...hit, tester: input })
  }

  const spawnRequests = breakables.spawnRequests || []
  return { hits: results, spawnRequests }
}
