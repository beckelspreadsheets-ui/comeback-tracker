export const scoreRacer = (racer, { finishedBonus = 20 } = {}) => {
  const lap = Number.isFinite(racer?.lap) ? racer.lap : 1;
  const progress = Number.isFinite(racer?.progress) ? racer.progress : 0;
  return (lap - 1) + progress + (racer?.finished ? finishedBonus : 0);
};

export const applyLapProgress = ({
  nearest = null,
  progress = nearest?.progress,
  racer = null,
  raceTime = 0,
  totalLaps = 1,
  trackLapSplits = false,
} = {}) => {
  if (!racer || !Number.isFinite(progress)) {
    return {
      completedLap: false,
      finished: false,
      progress: racer?.progress ?? null,
      reverted: false,
    };
  }

  const previousProgress = Number.isFinite(racer.progress) ? racer.progress : 0;
  racer.progress = progress;

  if (!racer.finished && previousProgress > 0.82 && racer.progress < 0.18) {
    const lapTime = raceTime - (racer.lapStartTime || 0);
    if (trackLapSplits) {
      racer.bestLap = racer.bestLap ? Math.min(racer.bestLap, lapTime) : lapTime;
      if (!Array.isArray(racer.lapSplits)) racer.lapSplits = [];
      racer.lapSplits.push(lapTime);
    }
    racer.lap = (Number.isFinite(racer.lap) ? racer.lap : 1) + 1;
    racer.lapStartTime = raceTime;
    if (racer.lap > totalLaps) {
      racer.finished = true;
      racer.finishTime = raceTime;
    }
    return {
      completedLap: true,
      finished: Boolean(racer.finished),
      lapTime,
      previousProgress,
      progress: racer.progress,
      reverted: false,
    };
  }

  if (previousProgress < 0.18 && racer.progress > 0.82) {
    racer.progress = previousProgress;
    return {
      completedLap: false,
      finished: false,
      previousProgress,
      progress: racer.progress,
      reverted: true,
    };
  }

  return {
    completedLap: false,
    finished: false,
    previousProgress,
    progress: racer.progress,
    reverted: false,
  };
};

export const applyRaceRankings = ({
  lastPlayerRank = 1,
  noticeLife = 1.6,
  player = null,
  rivals = [],
} = {}) => {
  const racers = [player, ...rivals].filter(Boolean).sort((a, b) => scoreRacer(b) - scoreRacer(a));
  racers.forEach((racer, index) => {
    racer.rank = index + 1;
  });

  const playerRank = player?.rank ?? null;
  const rankChanged = Number.isFinite(playerRank) && playerRank !== lastPlayerRank;
  const delta = rankChanged ? lastPlayerRank - playerRank : 0;
  return {
    lastPlayerRank: rankChanged ? playerRank : lastPlayerRank,
    playerRank,
    positionNotice: rankChanged
      ? {
          life: noticeLife,
          text: delta > 0 ? `Position +${delta}` : `Position ${delta}`,
        }
      : null,
    racers,
    rankChanged,
  };
};
