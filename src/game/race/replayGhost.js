// Time-trial ghost: record the player's run as (cumulativeProgress, lane) at a
// fixed race-time step, store the best run per track, and play it back. Pure
// data + localStorage; the runtime owns the model and the clock.
export const GHOST_STEP_SECONDS = 0.05;
const STORAGE_PREFIX = 'cc-kart-ghost-v2-';

export const createGhostRecorder = () => ({ nextAt: 0, samples: [] });

// Call every sim frame with the current race time. Samples are flat
// [cum, lane, air, cum, lane, air, ...] rounded to keep the stored JSON small.
export const GHOST_STRIDE = 3;
export const recordGhostFrame = (recorder, raceTime, cumulativeProgress, lane, airHeight = 0) => {
  while (raceTime >= recorder.nextAt) {
    recorder.samples.push(
      Math.round(cumulativeProgress * 1e5) / 1e5,
      Math.round(lane * 1e3) / 1e3,
      Math.round(Math.max(0, airHeight) * 10) / 10
    );
    recorder.nextAt += GHOST_STEP_SECONDS;
  }
};

// The track signature pins a ghost to the geometry it was driven on: a
// re-authored track invalidates old ghosts instead of replaying them off-road.
const keyFor = (trackKey) => `${STORAGE_PREFIX}${trackKey}`;

export const readGhost = (trackKey, signature) => {
  try {
    const raw = window.localStorage?.getItem(keyFor(trackKey));
    if (!raw) return null;
    const ghost = JSON.parse(raw);
    if (!ghost || ghost.signature !== signature || !Array.isArray(ghost.samples) || !Number.isFinite(ghost.time)) {
      return null;
    }
    return ghost;
  } catch {
    return null;
  }
};

// Saves only when there is no ghost yet or this run is faster. Returns
// whether it saved (i.e. a new record).
export const saveGhostIfBest = (trackKey, signature, { character, kart, samples, time }) => {
  if (!Number.isFinite(time) || time <= 0 || samples.length < 4) return false;
  const current = readGhost(trackKey, signature);
  if (current && current.time <= time) return false;
  try {
    window.localStorage?.setItem(
      keyFor(trackKey),
      JSON.stringify({ character, kart, samples, signature, time: Math.round(time * 1000) / 1000 })
    );
    return true;
  } catch {
    return false;
  }
};

// Ghost state at a race time: { cum, lane } linearly interpolated, clamped to
// the recorded run (the ghost parks past the line once its run is over).
export const ghostStateAt = (ghost, raceTime) => {
  const S = GHOST_STRIDE;
  const at = (index, channel) => ghost.samples[index * S + channel];
  const count = ghost.samples.length / S;
  const position = Math.max(0, raceTime / GHOST_STEP_SECONDS);
  const index = Math.min(count - 1, Math.floor(position));
  const next = Math.min(count - 1, index + 1);
  const t = Math.min(1, position - index);
  const mix = (channel) => at(index, channel) + (at(next, channel) - at(index, channel)) * t;
  return { air: mix(2), cum: mix(0), done: position >= count - 1, lane: mix(1) };
};
