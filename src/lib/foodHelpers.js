// Date utilities — all keys are local-timezone YYYY-MM-DD strings.

export const MEAL_BUCKETS = [
  { key: 'breakfast', label: 'Breakfast', emoji: '☼' },
  { key: 'lunch', label: 'Lunch', emoji: '◔' },
  { key: 'dinner', label: 'Dinner', emoji: '☾' },
  { key: 'snacks', label: 'Snacks', emoji: '✦' },
];

export const toDateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const todayKey = () => toDateKey(new Date());

export const shiftDateKey = (key, days) => {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toDateKey(dt);
};

export const formatDateKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const today = todayKey();
  const yest = shiftDateKey(today, -1);
  if (key === today) return 'Today';
  if (key === yest) return 'Yesterday';
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

export const emptyDayLog = () => ({ breakfast: [], lunch: [], dinner: [], snacks: [] });

export const getDayLog = (foodLog, dateKey) => foodLog?.[dateKey] || emptyDayLog();

// Sum cal + macros for a list of entries (each is {cal,p,c,f,servings}).
export const sumEntries = (entries = []) =>
  entries.reduce(
    (acc, e) => {
      const s = Number(e.servings) || 1;
      acc.cal += (Number(e.cal) || 0) * s;
      acc.p += (Number(e.p) || 0) * s;
      acc.c += (Number(e.c) || 0) * s;
      acc.f += (Number(e.f) || 0) * s;
      return acc;
    },
    { cal: 0, p: 0, c: 0, f: 0 }
  );

export const sumDay = (dayLog = emptyDayLog()) => {
  const meals = MEAL_BUCKETS.map((b) => ({ key: b.key, ...sumEntries(dayLog[b.key]) }));
  const total = meals.reduce(
    (acc, m) => ({
      cal: acc.cal + m.cal,
      p: acc.p + m.p,
      c: acc.c + m.c,
      f: acc.f + m.f,
    }),
    { cal: 0, p: 0, c: 0, f: 0 }
  );
  return { meals, total };
};

// Last N day keys ending today (inclusive).
export const lastNDays = (n) => {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(shiftDateKey(todayKey(), -i));
  return out;
};

// Week aggregates for the last 7 days: array of { date, cal, p, c, f }.
export const weekSeries = (foodLog, targets) => {
  const days = lastNDays(7);
  return days.map((d) => {
    const totals = sumDay(getDayLog(foodLog, d)).total;
    return {
      date: d,
      label: d.slice(5),
      cal: Math.round(totals.cal),
      p: Math.round(totals.p),
      c: Math.round(totals.c),
      f: Math.round(totals.f),
      target: targets.calories,
    };
  });
};

// Compliance: % of days within ±10% of target cals AND hitting protein target.
export const weekCompliance = (foodLog, targets) => {
  const series = weekSeries(foodLog, targets);
  const logged = series.filter((d) => d.cal > 0);
  if (!logged.length) return { pct: 0, logged: 0, avgCal: 0 };
  const low = targets.calories * 0.9;
  const high = targets.calories * 1.1;
  const hits = logged.filter((d) => d.cal >= low && d.cal <= high && d.p >= targets.protein * 0.9);
  const avgCal = Math.round(logged.reduce((s, d) => s + d.cal, 0) / logged.length);
  return { pct: Math.round((hits.length / logged.length) * 100), logged: logged.length, avgCal };
};

// 12-week protein-hit compliance by calendar week (Mon-start).
// Produces [{ week: 'W1', pct }] sorted oldest → newest.
export const proteinCompliance12w = (foodLog, targets) => {
  const weeks = [];
  const today = new Date();
  for (let w = 11; w >= 0; w--) {
    const end = new Date(today);
    end.setDate(end.getDate() - w * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    let hits = 0;
    let logged = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = toDateKey(d);
      const totals = sumDay(getDayLog(foodLog, key)).total;
      if (totals.cal > 0) {
        logged += 1;
        if (totals.p >= targets.protein * 0.9) hits += 1;
      }
    }
    weeks.push({
      week: `W${12 - w}`,
      pct: logged ? Math.round((hits / logged) * 100) : 0,
      logged,
    });
  }
  return weeks;
};

export const makeEntryId = () =>
  `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
