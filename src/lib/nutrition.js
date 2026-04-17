// Mifflin-St Jeor BMR (male formula — matches spreadsheet).
export const calcBMR = (bwLb, heightIn, age) =>
  Math.round(10 * (bwLb / 2.2046) + 6.25 * (heightIn * 2.54) - 5 * age + 5);

export const calcTDEE = (bmr, activity) => Math.round(bmr * activity);

// Phase-aware daily targets. `offset` is added to TDEE.
export const calcTargets = (settings, foodTargets) => {
  const { currentBW, height, age, activity } = settings;
  const { phase, offsets, proteinPerLb, fatGPerLb } = foodTargets;
  const bmr = calcBMR(currentBW, height, age);
  const tdee = calcTDEE(bmr, activity);
  const offset = offsets?.[phase] ?? 0;
  const calories = Math.max(1000, tdee + offset);
  const protein = Math.round(currentBW * proteinPerLb);
  const fat = Math.max(0, Math.round(currentBW * fatGPerLb));
  const remaining = Math.max(0, calories - protein * 4 - fat * 9);
  const carbs = Math.round(remaining / 4);
  return { bmr, tdee, offset, calories, protein, carbs, fat, phase };
};

export const PHASES = [
  { key: 'cut', label: 'Cut' },
  { key: 'maintain', label: 'Maintain' },
  { key: 'bulk', label: 'Bulk' },
];
