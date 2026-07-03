// Track-level shortcut trigger system. Supports three shortcut types:
// - 'gate': opens when the racer holds a specific item (or permanently if no
//   trigger) and is near fromProgress; advances the racer to toProgress.
// - 'timer': cycles open/closed based on raceTime using openDuration /
//   closeDuration.
// - 'dare': reuses airTricks.js launchShortcut / updateShortcut; this module
//   only identifies dare entries so the runtime can call the air logic.
//
// Tracks opt in via an optional `shortcuts` array. The legacy single
// `track.shortcut` dare object is preserved for backward compatibility.

export const SHORTCUT_TYPES = Object.freeze({
  dare: 'dare',
  gate: 'gate',
  timer: 'timer',
})

// Default cycle durations for timer shortcuts (seconds).
export const DEFAULT_SHORTCUT_TIMING = Object.freeze({
  closeDuration: 2,
  openDuration: 3,
})

// How close a racer must be to fromProgress to trigger a gate/timer shortcut.
export const GATE_TRIGGER_PROXIMITY = 0.03

const wrap01 = (value) => ((value % 1) + 1) % 1
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

// Normalize the legacy single shortcut and the new shortcuts array into one
// flat list. The legacy object becomes a 'dare' entry keyed by the original
// key or a deterministic fallback.
const normalizeShortcuts = (track) => {
  const list = Array.isArray(track?.shortcuts) ? [...track.shortcuts] : []
  if (track?.shortcut) {
    list.push({
      key: track.shortcut.key || 'shortcut-dare',
      type: 'dare',
      ...track.shortcut,
    })
  }
  return list
}

// Build the mutable state object the runtime can attach to race state.
// Gate entries start open when no item is required; timer entries start in
// their cycle at raceTime 0.
export const shortcutStateFor = (track) => {
  const shortcuts = normalizeShortcuts(track)
  const gates = []
  const timers = []
  shortcuts.forEach((shortcut) => {
    if (shortcut.type === 'gate') {
      gates.push({
        key: shortcut.key,
        open: !shortcut.trigger,
      })
    } else if (shortcut.type === 'timer') {
      const openDuration = shortcut.openDuration ?? DEFAULT_SHORTCUT_TIMING.openDuration
      const closeDuration = shortcut.closeDuration ?? DEFAULT_SHORTCUT_TIMING.closeDuration
      const cycle = openDuration + closeDuration
      const phase = 0
      timers.push({
        key: shortcut.key,
        open: cycle > 0 && phase < openDuration,
        phase,
      })
    }
  })
  return { gates, timers }
}

// Recompute which shortcuts are currently open. Gate shortcuts are open when
// the racer holds the required item (or no item is required). Timer shortcuts
// cycle open/closed based on raceTime. Returns an array of open shortcut keys.
export const updateShortcutGates = ({ shortcuts = [], raceTime = 0, heldItem = null } = {}) => {
  const openKeys = []
  shortcuts.forEach((shortcut) => {
    if (shortcut.type === 'timer') {
      const openDuration = shortcut.openDuration ?? DEFAULT_SHORTCUT_TIMING.openDuration
      const closeDuration = shortcut.closeDuration ?? DEFAULT_SHORTCUT_TIMING.closeDuration
      const cycle = openDuration + closeDuration
      if (cycle <= 0) return
      const phase = raceTime % cycle
      if (phase < openDuration) openKeys.push(shortcut.key)
    } else if (shortcut.type === 'gate') {
      const requiredItem = shortcut.trigger
      if (!requiredItem || heldItem === requiredItem) openKeys.push(shortcut.key)
    }
  })
  return openKeys
}

// Determine whether a shortcut should trigger for a racer at playerProgress
// holding heldItem. Gate shortcuts require the matching item; timer shortcuts
// require the gate to be open at raceTime (defaults to 0). Dare shortcuts are
// intentionally skipped here and handled by airTricks.js. Returns the matched
// shortcut definition or null.
export const shortcutTriggerFor = (track, playerProgress, heldItem, raceTime = 0) => {
  const shortcuts = normalizeShortcuts(track)
  if (!shortcuts.length) return null
  const openKeys = new Set(updateShortcutGates({ shortcuts, raceTime, heldItem }))
  let best = null
  let bestDelta = Infinity
  shortcuts.forEach((shortcut) => {
    if (shortcut.type === 'dare') return
    if (!openKeys.has(shortcut.key)) return
    const from = wrap01(shortcut.fromProgress)
    const delta = Math.abs(wrap01(playerProgress - from + 0.5) - 0.5)
    const proximity = shortcut.elevation ? clamp(GATE_TRIGGER_PROXIMITY * 1.5, 0.01, 0.5) : GATE_TRIGGER_PROXIMITY
    if (delta < proximity && delta < bestDelta) {
      best = shortcut
      bestDelta = delta
    }
  })
  return best
}
