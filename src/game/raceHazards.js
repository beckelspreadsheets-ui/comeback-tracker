export const HAZARD_DEFINITIONS = [
  {
    type: 'wet',
    trigger: 'proximity',
    effect: 'slow',
    vehicleFilter: 'kart',
    telegraph: 'water patch radius grows by lap',
  },
  {
    type: 'swing',
    trigger: 'timer',
    effect: 'spin',
    vehicleFilter: 'both',
    telegraph: 'moving obstacle arc',
  },
  {
    type: 'gate',
    trigger: 'timer',
    effect: 'spin',
    vehicleFilter: 'both',
    telegraph: 'open/closed gate phase',
  },
  {
    type: 'gust',
    trigger: 'timer',
    effect: 'knock-back',
    vehicleFilter: 'both',
    telegraph: 'wind lane pulse',
  },
  {
    type: 'tremor',
    trigger: 'timer-or-event',
    effect: 'spin',
    vehicleFilter: 'both',
    telegraph: 'shockwave ring',
  },
  {
    type: 'slam',
    trigger: 'timer',
    effect: 'spin',
    vehicleFilter: 'both',
    telegraph: 'closing slam zone',
  },
  {
    type: 'laser',
    trigger: 'timer',
    effect: 'spin',
    vehicleFilter: 'both',
    telegraph: 'laser shutter phase',
  },
  {
    type: 'conveyor',
    trigger: 'proximity',
    effect: 'lateral-force',
    vehicleFilter: 'kart',
    telegraph: 'animated conveyor lane',
  },
  {
    type: 'gravity',
    trigger: 'timer',
    effect: 'lateral-force',
    vehicleFilter: 'kart',
    telegraph: 'gravity well ring',
  },
];

export const HAZARD_DEFINITION_BY_TYPE = new Map(HAZARD_DEFINITIONS.map((hazard) => [hazard.type, hazard]));
export const getHazardDefinition = (type) => HAZARD_DEFINITION_BY_TYPE.get(type) || null;
