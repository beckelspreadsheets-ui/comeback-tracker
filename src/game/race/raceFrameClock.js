const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const rounded = (value, digits = 2) => (Number.isFinite(value) ? Number(value.toFixed(digits)) : 0);

export const resolveRaceFrameDelta = ({
  lastFrame = 0,
  maxFrameDt = 0.033,
  maxPlaytestDt = 0.16,
  now = 0,
  playtestEnabled = false,
} = {}) => {
  const elapsed = (now - lastFrame) / 1000;
  return {
    dt: clamp(elapsed, 0, playtestEnabled ? maxPlaytestDt : maxFrameDt),
    elapsed,
    lastFrame: now,
  };
};

export const updateRaceFrameStats = ({
  dt = 0,
  elapsed = dt,
  fpsLerp = 0.08,
  stats,
} = {}) => {
  if (!stats) return null;
  const elapsedMs = elapsed * 1000;
  stats.fps = lerp(stats.fps || 0, 1 / Math.max(dt, 0.001), fpsLerp);
  stats.actualFps = lerp(stats.actualFps ?? stats.fps ?? 0, 1 / Math.max(elapsed, 0.001), fpsLerp);
  stats.frameCount = (stats.frameCount || 0) + 1;
  stats.frameDtMs = dt * 1000;
  stats.frameElapsedMs = elapsedMs;
  stats.frameElapsedTotalMs = (stats.frameElapsedTotalMs || 0) + elapsedMs;
  if (elapsed > 1 / 45) stats.frameBudgetMissCount = (stats.frameBudgetMissCount || 0) + 1;
  stats.deliveredFps =
    stats.frameElapsedTotalMs > 0 ? stats.frameCount / (stats.frameElapsedTotalMs / 1000) : stats.actualFps;
  stats.frameBudgetMissRatio =
    stats.frameCount > 0 ? (stats.frameBudgetMissCount || 0) / stats.frameCount : 0;
  return stats.fps;
};

export const updateRaceRuntimeTimers = ({ dt = 0, race } = {}) => {
  if (!race) {
    return {
      cameraShakeTimer: 0,
      positionNoticeExpired: false,
      raceTime: 0,
      screenFlashTimer: 0,
    };
  }

  race.time += dt;
  race.cameraShakeTimer = Math.max(0, race.cameraShakeTimer - dt);
  race.screenFlashTimer = Math.max(0, race.screenFlashTimer - dt);

  let positionNoticeExpired = false;
  if (race.positionNotice) {
    race.positionNotice.life -= dt;
    if (race.positionNotice.life <= 0) {
      race.positionNotice = null;
      positionNoticeExpired = true;
    }
  }

  return {
    cameraShakeTimer: race.cameraShakeTimer,
    positionNoticeExpired,
    raceTime: race.time,
    screenFlashTimer: race.screenFlashTimer,
  };
};

export const recordRaceFramePhaseStats = ({
  fpsLerp = 0.08,
  phases = {},
  stats,
  totalMs = null,
} = {}) => {
  if (!stats) return null;
  stats.framePhaseMs = stats.framePhaseMs || {};
  stats.framePhaseMaxMs = stats.framePhaseMaxMs || {};
  Object.entries(phases).forEach(([key, value]) => {
    if (!Number.isFinite(value)) return;
    const current = stats.framePhaseMs[key] ?? value;
    const next = lerp(current, value, fpsLerp);
    stats.framePhaseMs[key] = rounded(next);
    stats.framePhaseMaxMs[key] = rounded(Math.max(stats.framePhaseMaxMs[key] || 0, value));
  });
  if (Number.isFinite(totalMs)) {
    const current = Number.isFinite(stats.frameWorkMs) && stats.frameWorkMs > 0 ? stats.frameWorkMs : totalMs;
    stats.frameWorkMs = rounded(lerp(current, totalMs, fpsLerp));
    stats.frameWorkMaxMs = rounded(Math.max(stats.frameWorkMaxMs || 0, totalMs));
  }
  return {
    framePhaseMaxMs: stats.framePhaseMaxMs,
    framePhaseMs: stats.framePhaseMs,
    frameWorkMaxMs: stats.frameWorkMaxMs,
    frameWorkMs: stats.frameWorkMs,
  };
};

export const advanceRaceFrameClock = ({
  lastFrame = 0,
  now = 0,
  playtest = {},
  race,
  stats,
} = {}) => {
  const frame = resolveRaceFrameDelta({
    lastFrame,
    now,
    playtestEnabled: Boolean(playtest.enabled),
  });
  const fps = updateRaceFrameStats({ dt: frame.dt, elapsed: frame.elapsed, stats });
  const timers = updateRaceRuntimeTimers({ dt: frame.dt, race });
  return {
    ...frame,
    fps,
    timers,
  };
};
