// Workout-day completion + next-suggested-day status. Pure workout logic that
// reads the persisted `logs`/`state` against the PROGRAM definition.
//
// Extracted here (from src/game/gameProfile.js) 2026-09-02 for the game/tracker
// split: it lives in lib/ so BOTH the tracker (HomeScreen) and the game-hub
// economy (gameProfile) import it from here. That was the last edge by which the
// tracker reached into src/game/ — after this, the tracker imports nothing from
// the game module, and the game's 3D race runtime imports nothing from the
// tracker's lib/. The two are cleanly separable.
import { PROGRAM } from './program.js';

export const hasSetEntry = (set) =>
  String(set?.wt ?? '').trim() !== '' || String(set?.reps ?? '').trim() !== '';

export const prescribedSetCount = (exercise) => Math.max(1, Number(exercise?.sets) || 1);

export const meaningfulExercise = (exerciseLog) => (exerciseLog?.sets || []).some(hasSetEntry);

export const meaningfulLog = (log) => (log?.exercises || []).some(meaningfulExercise);

export const exerciseProgress = (exercise, exerciseLog) => {
  const prescribed = prescribedSetCount(exercise);
  const loggedSets = (exerciseLog?.sets || []).filter(hasSetEntry).length;
  return {
    prescribed,
    loggedSets,
    complete: loggedSets >= prescribed,
  };
};

export const isWorkoutDayComplete = (dayData, log) => {
  if (!dayData || !meaningfulLog(log)) return false;
  return dayData.exercises.every((exercise, index) =>
    exerciseProgress(exercise, log.exercises?.[index]).complete
  );
};

export const nextSuggestedDay = (state) => {
  const currentWeek = Number(state.currentWeek) || 1;
  const firstOpen = PROGRAM.find(
    (day) => !isWorkoutDayComplete(day, state.logs?.[`w${currentWeek}d${day.day}`])
  );
  return firstOpen?.day || 1;
};
