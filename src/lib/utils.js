// Pure utility functions

export const round5 = (n) => Math.round(n / 5) * 5;

export const epley1RM = (weight, reps, rir = 0) => {
  if (!weight || !reps) return null;
  const adj = Number(reps) + Number(rir || 0);
  return Math.round(Number(weight) * (1 + adj / 30));
};

export const phaseForWeek = (wk) => {
  if (wk <= 2) return 'CALIBRATION';
  if (wk <= 4) return 'RE-ENTRY';
  if (wk <= 12) return 'BUILD';
  return 'GRIND';
};

export const isDeloadWeek = (wk) => wk > 0 && wk % 5 === 0;

export const calcTargetWeight = (ex, oneRMs) => {
  if (!ex.liftKey) return ex.target || '—';
  const rm = oneRMs[ex.liftKey];
  if (!rm || isNaN(rm)) return 'calibrate';
  return round5(rm * ex.pct);
};

export const typeColors = {
  HEAVY: 'text-red-400 bg-red-500/10 border-red-500/30',
  MODERATE: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  'MODERATE-HAM': 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  SPECIALIZATION: 'text-violet-300 bg-violet-500/10 border-violet-500/30',
  'SPECIALIZATION-HAM': 'text-violet-300 bg-violet-500/10 border-violet-500/30',
  LIGHT: 'text-sky-300 bg-sky-500/10 border-sky-500/30',
  RECOVERY: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  'RECOVERY-HAM': 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
};

export const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Compute volume totals for a logged session
export const computeSessionVolume = (log) => {
  if (!log?.exercises) return 0;
  return log.exercises.reduce((total, ex) => {
    return total + ex.sets.reduce((exTotal, set) => {
      const wt = Number(set.wt) || 0;
      const reps = Number(set.reps) || 0;
      return exTotal + wt * reps;
    }, 0);
  }, 0);
};
