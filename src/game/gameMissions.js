import { LIFTS, PROGRAM } from '../lib/program.js';
import { calcTargets } from '../lib/nutrition.js';
import { getDayLog, sumDay, todayKey } from '../lib/foodHelpers.js';
import { isWorkoutDayComplete, nextSuggestedDay } from './gameProfile.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const hasSetEntry = (set) =>
  String(set?.wt ?? '').trim() !== '' || String(set?.reps ?? '').trim() !== '';

const prescribedSetCount = (exercise) => Math.max(1, Number(exercise?.sets) || 1);

const summarizeDayProgress = (dayData, log) => {
  const exercises = dayData?.exercises || [];
  const prescribedSets = exercises.reduce((sum, exercise) => sum + prescribedSetCount(exercise), 0);
  const loggedSets = exercises.reduce((sum, exercise, index) => {
    const sets = log?.exercises?.[index]?.sets || [];
    return sum + Math.min(sets.filter(hasSetEntry).length, prescribedSetCount(exercise));
  }, 0);

  return {
    complete: isWorkoutDayComplete(dayData, log),
    loggedSets,
    prescribedSets,
    progressPct: prescribedSets ? Math.round((loggedSets / prescribedSets) * 100) : 0,
  };
};

const metricFields = ['bw', 'waist', 'arm', 'thigh'];

const summarizeMetricProgress = (state) => {
  const currentWeek = Number(state.currentWeek) || 1;
  const row = (state.metrics || []).find((item) => Number(item?.week) === currentWeek);
  const fieldsLogged = metricFields.filter((field) => row?.[field]).length;

  return {
    complete: fieldsLogged > 0,
    fieldsLogged,
    progressPct: Math.round((fieldsLogged / metricFields.length) * 100),
  };
};

const missionSort = (mission) => mission.priority + (mission.complete ? 100 : 0);

export const buildGameMissions = (state, profile) => {
  const currentWeek = Number(state.currentWeek) || 1;
  const nextDay = nextSuggestedDay(state);
  const weekComplete = PROGRAM.every((day) =>
    isWorkoutDayComplete(day, state.logs?.[`w${currentWeek}d${day.day}`])
  );
  const dayData = PROGRAM.find((day) => day.day === nextDay) || PROGRAM[0];
  const dayProgress = summarizeDayProgress(dayData, state.logs?.[`w${currentWeek}d${nextDay}`]);

  const targets = calcTargets(state.settings, state.food?.targets);
  const todayTotals = sumDay(getDayLog(state.food?.log, todayKey())).total;
  const proteinPct = targets.protein ? (todayTotals.p / (targets.protein * 0.9)) * 100 : 0;
  const caloriePct = targets.calories ? (todayTotals.cal / (targets.calories * 0.65)) * 100 : 0;
  const fuelProgress = clamp(Math.round(proteinPct * 0.72 + caloriePct * 0.28), 0, 100);
  const fuelComplete = todayTotals.cal > 0 && todayTotals.p >= targets.protein * 0.9;

  const calibrationTarget = Math.min(8, LIFTS.length);
  const calibrationProgress = clamp(
    Math.round((profile.filledRMs / calibrationTarget) * 100),
    0,
    100
  );
  const calibrationComplete = profile.filledRMs >= calibrationTarget;
  const metricProgress = summarizeMetricProgress(state);
  const recoveryComplete = profile.recoveryShield >= 90;

  return [
    {
      key: 'calibration',
      destinationKey: 'lab',
      title: calibrationComplete ? 'Targets unlocked' : 'Unlock target weights',
      summary: `${Math.min(profile.filledRMs, calibrationTarget)}/${calibrationTarget} lifts calibrated`,
      progressPct: calibrationProgress,
      complete: calibrationComplete,
      priority: 10,
      reward: '+40 XP/lift',
    },
    {
      key: 'course',
      destinationKey: 'gym',
      title: weekComplete ? `Week ${currentWeek} cleared` : `Clear Day ${nextDay}`,
      summary: weekComplete
        ? `${PROGRAM.length}/${PROGRAM.length} courses complete`
        : `${dayProgress.loggedSets}/${dayProgress.prescribedSets} sets logged`,
      progressPct: weekComplete ? 100 : dayProgress.progressPct,
      complete: weekComplete || dayProgress.complete,
      priority: 20,
      reward: '+35 XP/set',
    },
    {
      key: 'fuel',
      destinationKey: 'food',
      title: fuelComplete ? 'Fuel logged' : 'Hit protein fuel',
      summary: `${Math.round(todayTotals.p)}/${targets.protein}g protein today`,
      progressPct: fuelComplete ? 100 : fuelProgress,
      complete: fuelComplete,
      priority: 30,
      reward: '+120 XP/day',
    },
    {
      key: 'metrics',
      destinationKey: 'home',
      title: metricProgress.complete ? 'Body check-in logged' : 'Log weekly body check',
      summary: `${metricProgress.fieldsLogged}/${metricFields.length} body fields this week`,
      progressPct: metricProgress.complete ? 100 : metricProgress.progressPct,
      complete: metricProgress.complete,
      priority: 40,
      reward: '+160 XP/week',
    },
    {
      key: 'recovery',
      destinationKey: 'clinic',
      title: recoveryComplete ? 'Recovery shield stable' : 'Repair recovery shield',
      summary: `${profile.recoveryShield}/100 shield`,
      progressPct: profile.recoveryShield,
      complete: recoveryComplete,
      priority: 50,
      reward: 'Keeps combo safe',
    },
  ].sort((a, b) => missionSort(a) - missionSort(b));
};

export const getActiveMission = (missions) =>
  missions.find((mission) => !mission.complete) || missions[0] || null;
