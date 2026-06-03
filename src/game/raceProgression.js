export const RACE_UPGRADES = [
  {
    key: 'engine',
    name: 'Engine',
    stat: 'Top speed',
    maxLevel: 6,
    baseCost: 140,
    costStep: 90,
  },
  {
    key: 'tires',
    name: 'Tires',
    stat: 'Grip',
    maxLevel: 6,
    baseCost: 120,
    costStep: 80,
  },
  {
    key: 'turbo',
    name: 'Turbo',
    stat: 'Boost power',
    maxLevel: 6,
    baseCost: 150,
    costStep: 95,
  },
];

export const RACE_ITEMS = [
  {
    key: 'boost',
    name: 'Turbo Can',
    cost: 90,
    summary: 'Start-line and straightaway burst',
  },
  {
    key: 'shield',
    name: 'Guard Gel',
    cost: 110,
    summary: 'Blocks one rough contact window',
  },
  {
    key: 'rocket',
    name: 'Pulse Rocket',
    cost: 135,
    summary: 'Knocks the nearest rival off pace',
  },
  {
    key: 'bubbleTrap',
    name: 'Bubble Trap',
    cost: 120,
    summary: 'Drops a floating trap that pops rivals out of their line',
  },
  {
    key: 'switchBolt',
    name: 'Switch Bolt',
    cost: 145,
    summary: 'Forces the nearest rival into the opposite vehicle mode',
  },
  {
    key: 'liftJammer',
    name: 'Lift Jammer',
    cost: 150,
    summary: 'Disables plane lift on nearby opponents for a short window',
  },
  {
    key: 'hazardBell',
    name: 'Hazard Bell',
    cost: 160,
    summary: 'Triggers the next armed environmental hazard early',
  },
  {
    key: 'decoyCrate',
    name: 'Decoy Crate',
    cost: 100,
    summary: 'Places a fake item box that spins out greedy racers',
  },
  {
    key: 'ghostReplay',
    name: 'Ghost Replay',
    cost: 125,
    summary: 'Creates a short racing-line ghost that grants slipstream speed',
  },
  {
    key: 'bananaMagnet',
    name: 'Fuel Magnet',
    cost: 115,
    summary: 'Pulls nearby fuel tokens into your vehicle',
  },
  {
    key: 'invincibility',
    name: 'Comeback Surge',
    cost: 190,
    summary: 'Brief invincibility against traps, hazards, and contact',
  },
  {
    key: 'tideHorn',
    name: 'Tide Horn',
    cost: 155,
    summary: 'Remote environmental trigger for water and crowd hazards',
  },
];

export const DEFAULT_RACE_GARAGE = {
  inventory: {
    boost: 0,
    bananaMagnet: 0,
    bubbleTrap: 0,
    decoyCrate: 0,
    ghostReplay: 0,
    hazardBell: 0,
    invincibility: 0,
    liftJammer: 0,
    rocket: 0,
    shield: 0,
    switchBolt: 0,
    tideHorn: 0,
  },
  spentCredits: 0,
  upgrades: {
    engine: 0,
    tires: 0,
    turbo: 0,
  },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const normalizeRaceGarage = (garage = {}) => ({
  inventory: {
    ...DEFAULT_RACE_GARAGE.inventory,
    ...(garage.inventory || {}),
  },
  spentCredits: Math.max(0, Number(garage.spentCredits) || 0),
  upgrades: {
    ...DEFAULT_RACE_GARAGE.upgrades,
    ...(garage.upgrades || {}),
  },
});

export const upgradeCost = (upgrade, level) =>
  Math.round(upgrade.baseCost + Math.max(0, level) * upgrade.costStep);

export const earnedRaceCredits = (profile) => {
  const workout = profile.workout || {};
  return Math.max(
    0,
    Math.round(
      workout.loggedSets * 12 +
        workout.completedExercises * 28 +
        workout.completedCourses * 95 +
        workout.sessions * 45 +
        profile.streak * 30 +
        profile.filledRMs * 18
    )
  );
};

export const deriveRaceGarage = (state, profile) => {
  const garage = normalizeRaceGarage(state.game?.raceGarage);
  const earnedCredits = earnedRaceCredits(profile);
  const credits = Math.max(0, earnedCredits - garage.spentCredits);
  const upgrades = garage.upgrades;
  const drive = profile.avatar?.drive || {};
  const levelBonus = Math.max(0, profile.level - 1);
  const topSpeed =
    258 +
    ((Number(drive.maxSpeed) || 44) - 44) * 8 +
    levelBonus * 3.4 +
    upgrades.engine * 18;
  const acceleration =
    166 +
    ((Number(drive.acceleration) || 56) - 56) * 3.1 +
    levelBonus * 2.6 +
    upgrades.engine * 10;
  const handling =
    5.6 +
    ((Number(drive.steerRate) || 2.9) - 2.9) * 0.78 +
    levelBonus * 0.025 +
    upgrades.tires * 0.48;
  const traction =
    0.86 +
    ((Number(drive.lateralGrip) || 12.5) - 12.5) * 0.018 +
    upgrades.tires * 0.055;
  const driftBoost =
    1.0 +
    ((Number(drive.driftChargeRate) || 0.92) - 0.92) * 0.28 +
    levelBonus * 0.012 +
    upgrades.turbo * 0.14;
  const boostSpeed = topSpeed * (1.25 + upgrades.turbo * 0.025);

  return {
    credits,
    earnedCredits,
    garage,
    mechanics: {
      acceleration,
      boostSpeed,
      braking: 245 + upgrades.tires * 12,
      driftBoost,
      handling,
      offroadGrip: clamp(0.6 + upgrades.tires * 0.055, 0.6, 0.92),
      topSpeed,
      traction: clamp(traction, 0.72, 1.25),
    },
    statBars: {
      acceleration: clamp(Math.round((acceleration / 270) * 100), 1, 100),
      boost: clamp(Math.round((boostSpeed / 430) * 100), 1, 100),
      grip: clamp(Math.round((traction / 1.2) * 100), 1, 100),
      speed: clamp(Math.round((topSpeed / 390) * 100), 1, 100),
    },
  };
};
