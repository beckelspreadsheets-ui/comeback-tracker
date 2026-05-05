import { LIFTS, PROGRAM } from '../lib/program.js';
import { deriveRaceGarage } from './raceProgression.js';

export const GAME_AVATARS = [
  {
    key: 'nova',
    name: 'Nova Sprinter',
    role: 'apex sprint',
    carStyle: 'sprinter',
    chassis: '#36a7e2',
    accent: '#ffd34f',
    suit: '#f3ece0',
    drive: {
      acceleration: 58,
      boostMaxSpeed: 65,
      driftChargeRate: 0.96,
      driftGrip: 1.65,
      lateralGrip: 11.8,
      maxSpeed: 46,
      steerRate: 3.08,
    },
  },
  {
    key: 'forge',
    name: 'Forge Titan',
    role: 'muscle grip',
    carStyle: 'muscle',
    chassis: '#e2554f',
    accent: '#ffd34f',
    suit: '#2b3a67',
    drive: {
      acceleration: 62,
      brake: 82,
      boostMaxSpeed: 61,
      driftChargeRate: 0.84,
      driftGrip: 2.1,
      lateralGrip: 14.2,
      maxSpeed: 42,
      steerRate: 2.62,
    },
  },
  {
    key: 'pulse',
    name: 'Pulse Strider',
    role: 'rally hybrid',
    carStyle: 'rally',
    chassis: '#65c487',
    accent: '#44d7d0',
    suit: '#1d2758',
    drive: {
      acceleration: 55,
      boostMaxSpeed: 63,
      driftChargeRate: 0.94,
      driftGrip: 1.9,
      jumpVelocity: 20,
      lateralGrip: 12.8,
      maxSpeed: 44,
      steerRate: 2.94,
    },
  },
  {
    key: 'apex',
    name: 'Apex Vector',
    role: 'prototype top speed',
    carStyle: 'prototype',
    chassis: '#f3ece0',
    accent: '#f45b69',
    suit: '#20384b',
    drive: {
      acceleration: 52,
      boostMaxSpeed: 69,
      driftChargeRate: 0.9,
      driftGrip: 1.55,
      lateralGrip: 11.2,
      maxSpeed: 50,
      steerRate: 2.78,
    },
  },
  {
    key: 'rift',
    name: 'Rift Slider',
    role: 'drift coupe',
    carStyle: 'drifter',
    chassis: '#9b5de5',
    accent: '#2ec4b6',
    suit: '#fff3a0',
    drive: {
      acceleration: 59,
      boostMaxSpeed: 66,
      driftChargeRate: 1.08,
      driftGrip: 1.18,
      lateralGrip: 10.4,
      maxSpeed: 45,
      steerRate: 3.24,
    },
  },
  {
    key: 'terra',
    name: 'Terra Scout',
    role: 'jump buggy',
    carStyle: 'buggy',
    chassis: '#ffc857',
    accent: '#71c562',
    suit: '#20384b',
    drive: {
      acceleration: 54,
      boostMaxSpeed: 61,
      driftChargeRate: 0.88,
      driftGrip: 1.95,
      jumpVelocity: 23,
      lateralGrip: 12.2,
      maxSpeed: 43,
      steerRate: 2.98,
    },
  },
];

const XP_PER_LEVEL = 500;

const hasSetEntry = (set) =>
  String(set?.wt ?? '').trim() !== '' || String(set?.reps ?? '').trim() !== '';

const prescribedSetCount = (exercise) => Math.max(1, Number(exercise?.sets) || 1);

const dayFromLogKey = (key) => Number(key.match(/d(\d+)$/)?.[1]);

const weekFromLogKey = (key) => Number(key.match(/^w(\d+)/)?.[1]);

const meaningfulExercise = (exerciseLog) => (exerciseLog?.sets || []).some(hasSetEntry);

const meaningfulLog = (log) => (log?.exercises || []).some(meaningfulExercise);

const exerciseProgress = (exercise, exerciseLog) => {
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

const summarizeWorkoutProgress = (state) => {
  let loggedSets = 0;
  let completedExercises = 0;
  let completedCourses = 0;
  let jointWarnings = 0;
  let sessions = 0;

  Object.entries(state.logs || {}).forEach(([logKey, log]) => {
    const dayData = PROGRAM.find((day) => day.day === dayFromLogKey(logKey));
    if (!dayData || !meaningfulLog(log)) return;

    sessions += 1;
    let courseComplete = true;

    dayData.exercises.forEach((exercise, index) => {
      const exerciseLog = log.exercises?.[index];
      const progress = exerciseProgress(exercise, exerciseLog);
      loggedSets += progress.loggedSets;
      if (progress.complete) {
        completedExercises += 1;
      } else {
        courseComplete = false;
      }

      if (exerciseLog?.joint === 'yellow') jointWarnings += 1;
      if (exerciseLog?.joint === 'red') jointWarnings += 3;
    });

    if (courseComplete) completedCourses += 1;
  });

  const currentWeek = Number(state.currentWeek) || 1;
  const currentWeekLoggedDays = PROGRAM.filter((day) =>
    meaningfulLog(state.logs?.[`w${currentWeek}d${day.day}`])
  ).length;
  const distinctWeeks = new Set(
    Object.entries(state.logs || {})
      .filter(([, log]) => meaningfulLog(log))
      .map(([key]) => weekFromLogKey(key))
      .filter(Boolean)
  ).size;

  return {
    loggedSets,
    completedExercises,
    completedCourses,
    currentWeekLoggedDays,
    distinctWeeks,
    sessions,
    jointWarnings,
  };
};

const countFoodDays = (foodLog = {}) =>
  Object.values(foodLog).filter((day) =>
    Object.values(day || {}).some((entries) => Array.isArray(entries) && entries.length > 0)
  ).length;

const countMetricWeeks = (metrics = []) =>
  metrics.filter((row) => row?.bw || row?.waist || row?.arm || row?.thigh).length;

export const nextSuggestedDay = (state) => {
  const currentWeek = Number(state.currentWeek) || 1;
  const firstOpen = PROGRAM.find(
    (day) => !isWorkoutDayComplete(day, state.logs?.[`w${currentWeek}d${day.day}`])
  );
  return firstOpen?.day || 1;
};

export const deriveGameProfile = (state) => {
  const workout = summarizeWorkoutProgress(state);
  const foodDays = countFoodDays(state.food?.log);
  const metricWeeks = countMetricWeeks(state.metrics);
  const filledRMs = Object.values(state.oneRMs || {}).filter((value) => value && !Number.isNaN(Number(value))).length;
  const totalXp =
    workout.loggedSets * 35 +
    workout.completedExercises * 90 +
    workout.completedCourses * 150 +
    foodDays * 120 +
    metricWeeks * 160 +
    filledRMs * 40;
  const level = Math.max(1, Math.floor(totalXp / XP_PER_LEVEL) + 1);
  const currentLevelXp = totalXp % XP_PER_LEVEL;
  const avatar =
    GAME_AVATARS.find((item) => item.key === state.game?.avatar) || GAME_AVATARS[0];
  const recoveryShield = Math.max(0, 100 - workout.jointWarnings * 8);

  const profile = {
    avatar,
    combo: workout.completedExercises,
    currentLevelXp,
    filledRMs,
    foodDays,
    level,
    metricWeeks,
    nextDay: nextSuggestedDay(state),
    nextLevelXp: XP_PER_LEVEL,
    recoveryShield,
    streak: workout.currentWeekLoggedDays,
    totalLiftCount: LIFTS.length,
    totalXp,
    workout,
  };

  return {
    ...profile,
    race: deriveRaceGarage(state, profile),
  };
};
