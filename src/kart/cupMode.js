// Grand Prix (cup) bookkeeping — pure, so it can be unit-checked in node.
// MK8's table, sliced to however many karts race (4 today, 8 later).
export const GP_POINTS = Object.freeze([15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);

export const pointsForPlace = (place) => GP_POINTS[place - 1] ?? 0;

export const createCup = (trackKeys) => ({
  lastRace: null,
  results: [],
  round: 0,
  totals: {},
  trackKeys: [...trackKeys],
});

// standings: [{ isPlayer, name }] in finishing order (from the race's onFinish).
export const applyRaceToCup = (cup, standings) => {
  if (!cup || !Array.isArray(standings) || !standings.length) return cup;
  const totals = { ...cup.totals };
  const lastRace = standings.map((entry, index) => {
    const gained = pointsForPlace(index + 1);
    totals[entry.name] = (totals[entry.name] || 0) + gained;
    return { gained, isPlayer: Boolean(entry.isPlayer), name: entry.name, place: index + 1 };
  });
  return { ...cup, lastRace, results: [...cup.results, lastRace], totals };
};

// Overall order after the races so far. Ties break on the most recent race's
// finishing order, which is how MK breaks them in practice (last race wins).
export const cupStandings = (cup) => {
  if (!cup?.lastRace) return [];
  const recentPlace = Object.fromEntries(cup.lastRace.map((row) => [row.name, row.place]));
  return cup.lastRace
    .map((row) => ({ isPlayer: row.isPlayer, name: row.name, total: cup.totals[row.name] || 0 }))
    .sort((a, b) => b.total - a.total || recentPlace[a.name] - recentPlace[b.name]);
};

export const isCupOver = (cup) => Boolean(cup) && cup.results.length >= cup.trackKeys.length;
