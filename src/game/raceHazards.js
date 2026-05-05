export const HAZARD_EFFECTS = {
  blind: 'blind',
  boost: 'boost',
  controlFlip: 'control-flip',
  forceSwitch: 'force-switch',
  knockBack: 'knock-back',
  pull: 'pull',
  slow: 'slow',
  spin: 'spin',
};

export const HAZARD_TRIGGERS = {
  event: 'event',
  playerAction: 'player-action',
  proximity: 'proximity',
  timer: 'timer',
};

export const HAZARD_DEFINITIONS = [
  {
    type: 'wet',
    trigger: HAZARD_TRIGGERS.proximity,
    effect: HAZARD_EFFECTS.slow,
    vehicleFilter: 'kart',
    telegraph: 'water patch radius grows by lap',
  },
  {
    type: 'swing',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.spin,
    vehicleFilter: 'both',
    telegraph: 'moving obstacle arc',
  },
  {
    type: 'gate',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.spin,
    vehicleFilter: 'both',
    telegraph: 'open/closed gate phase',
  },
  {
    type: 'gust',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.knockBack,
    vehicleFilter: 'plane',
    telegraph: 'wind lane pulse',
  },
  {
    type: 'tremor',
    trigger: 'timer-or-event',
    effect: HAZARD_EFFECTS.spin,
    vehicleFilter: 'both',
    telegraph: 'shockwave ring',
  },
  {
    type: 'slam',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.spin,
    vehicleFilter: 'both',
    telegraph: 'closing slam zone',
  },
  {
    type: 'laser',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.spin,
    vehicleFilter: 'plane',
    telegraph: 'laser shutter phase',
  },
  {
    type: 'conveyor',
    trigger: HAZARD_TRIGGERS.proximity,
    effect: HAZARD_EFFECTS.knockBack,
    vehicleFilter: 'kart',
    telegraph: 'animated conveyor lane',
  },
  {
    type: 'gravity',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.knockBack,
    vehicleFilter: 'kart',
    telegraph: 'gravity well ring',
  },
  {
    type: 'fishCart',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.knockBack,
    vehicleFilter: 'kart',
    telegraph: 'cart rolls across the lane',
  },
  {
    type: 'laundry',
    trigger: HAZARD_TRIGGERS.proximity,
    effect: HAZARD_EFFECTS.blind,
    vehicleFilter: 'kart',
    telegraph: 'cloth line shadow',
  },
  {
    type: 'lighthouseBeam',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.blind,
    vehicleFilter: 'plane',
    telegraph: 'rotating beam cone',
  },
  {
    type: 'seagulls',
    trigger: 'timer-or-event',
    effect: HAZARD_EFFECTS.spin,
    vehicleFilter: 'plane',
    telegraph: 'flock shadow and calls',
  },
  {
    type: 'crabTrap',
    trigger: HAZARD_TRIGGERS.proximity,
    effect: HAZARD_EFFECTS.slow,
    vehicleFilter: 'kart',
    telegraph: 'trap cage on racing line',
  },
  {
    type: 'boatTraffic',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.knockBack,
    vehicleFilter: 'both',
    telegraph: 'boat horn before crossing',
  },
  {
    type: 'lightning',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.spin,
    vehicleFilter: 'both',
    telegraph: 'charge ring before strike',
  },
  {
    type: 'bridgeCollapse',
    trigger: 'timer-or-event',
    effect: HAZARD_EFFECTS.forceSwitch,
    vehicleFilter: 'kart',
    telegraph: 'rope bridge cracks and missing planks',
  },
  {
    type: 'tornado',
    trigger: HAZARD_TRIGGERS.proximity,
    effect: HAZARD_EFFECTS.pull,
    vehicleFilter: 'both',
    telegraph: 'spiral wind column',
  },
  {
    type: 'staticCharge',
    trigger: HAZARD_TRIGGERS.proximity,
    effect: 'switch-lock',
    vehicleFilter: 'both',
    telegraph: 'electric floor glow',
  },
  {
    type: 'windGust',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.knockBack,
    vehicleFilter: 'plane',
    telegraph: 'wind streaks',
  },
  {
    type: 'mineCart',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.knockBack,
    vehicleFilter: 'both',
    telegraph: 'rail crossing bell',
  },
  {
    type: 'magneticSpike',
    trigger: HAZARD_TRIGGERS.proximity,
    effect: HAZARD_EFFECTS.slow,
    vehicleFilter: 'kart',
    telegraph: 'sparking spike cluster',
  },
  {
    type: 'pulseZone',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.controlFlip,
    vehicleFilter: 'both',
    telegraph: 'purple pulse ring',
  },
  {
    type: 'polarityStrip',
    trigger: HAZARD_TRIGGERS.proximity,
    effect: 'set-polarity',
    vehicleFilter: 'kart',
    telegraph: 'rotating polarity strip',
  },
  {
    type: 'stalactite',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.spin,
    vehicleFilter: 'both',
    telegraph: 'falling shadow',
  },
  {
    type: 'polarityGate',
    trigger: HAZARD_TRIGGERS.proximity,
    effect: 'polarity-check',
    vehicleFilter: 'both',
    telegraph: 'matching polarity lights',
  },
];

export const HAZARD_DEFINITION_BY_TYPE = new Map(HAZARD_DEFINITIONS.map((hazard) => [hazard.type, hazard]));
export const getHazardDefinition = (type) => HAZARD_DEFINITION_BY_TYPE.get(type) || null;

export const vehicleMatchesFilter = (vehicleMode, vehicleFilter = 'both') =>
  vehicleFilter === 'both' ||
  vehicleFilter === vehicleMode ||
  (vehicleFilter === 'kart' && vehicleMode === 'hover');
