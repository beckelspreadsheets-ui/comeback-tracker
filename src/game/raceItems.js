import { RACE_ITEMS } from './raceProgression.js';
import { RACE_TRACKS } from './raceTracks.js';

export const ITEM_CATEGORIES = {
  environmental: 'environmental',
  projectile: 'projectile',
  selfBuff: 'self-buff',
  setup: 'setup',
  trap: 'trap',
  vehicleState: 'vehicle-state',
};

export const COMMON_BOX_ITEMS = [
  'boost',
  'shield',
  'rocket',
  'bubbleTrap',
  'switchBolt',
  'liftJammer',
  'hazardBell',
  'decoyCrate',
  'ghostReplay',
  'bananaMagnet',
  'invincibility',
  'tideHorn',
];

export const BANKED_ITEMS = COMMON_BOX_ITEMS;

export const LOCAL_ITEMS = [
  { key: 'oil', name: 'Oil Slick', summary: 'Drops a slippery trap behind the kart.' },
  ...RACE_TRACKS.map((track) => track.signatureItem),
];

export const ITEM_META = new Map([...RACE_ITEMS, ...LOCAL_ITEMS].map((item) => [item.key, item]));

export const ITEM_DEFINITIONS = [
  {
    key: 'boost',
    category: ITEM_CATEGORIES.selfBuff,
    rarity: 'common',
    targetType: 'self',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 0.95,
    cooldown: 0,
    feedback: { activation: 'turbo-start', hit: null, expiration: 'turbo-end' },
  },
  {
    key: 'shield',
    category: ITEM_CATEGORIES.setup,
    rarity: 'common',
    targetType: 'self',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 5.2,
    cooldown: 0,
    feedback: { activation: 'shield-on', hit: 'shield-block', expiration: 'shield-off' },
  },
  {
    key: 'rocket',
    category: ITEM_CATEGORIES.projectile,
    rarity: 'common',
    targetType: 'single-opponent',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 0,
    cooldown: 0,
    feedback: { activation: 'rocket-fire', hit: 'rocket-hit', expiration: null },
  },
  {
    key: 'oil',
    category: ITEM_CATEGORIES.trap,
    rarity: 'common',
    targetType: 'area',
    vehicleRestriction: 'kart',
    trackRestriction: 'universal',
    duration: 9,
    cooldown: 0,
    feedback: { activation: 'trap-drop', hit: 'trap-hit', expiration: 'trap-expire' },
  },
  {
    key: 'bubbleTrap',
    category: ITEM_CATEGORIES.trap,
    rarity: 'common',
    targetType: 'area',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 10,
    cooldown: 0,
    triggerFilter: { vehicles: ['kart', 'hover', 'plane'] },
    feedback: { activation: 'bubble-arm', hit: 'bubble-pop', expiration: 'bubble-fade' },
  },
  {
    key: 'switchBolt',
    category: ITEM_CATEGORIES.vehicleState,
    rarity: 'uncommon',
    targetType: 'single-opponent',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 2.8,
    cooldown: 0,
    feedback: { activation: 'switch-bolt-fire', hit: 'switch-bolt-hit', expiration: 'switch-bolt-clear' },
  },
  {
    key: 'liftJammer',
    category: ITEM_CATEGORIES.vehicleState,
    rarity: 'uncommon',
    targetType: 'all-opponents',
    vehicleRestriction: 'plane',
    trackRestriction: 'universal',
    duration: 4.5,
    cooldown: 0,
    feedback: { activation: 'jammer-on', hit: 'lift-cut', expiration: 'jammer-off' },
  },
  {
    key: 'hazardBell',
    category: ITEM_CATEGORIES.environmental,
    rarity: 'uncommon',
    targetType: 'area',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 0,
    cooldown: 0,
    feedback: { activation: 'bell-ring', hit: 'hazard-snap', expiration: null },
  },
  {
    key: 'decoyCrate',
    category: ITEM_CATEGORIES.setup,
    rarity: 'common',
    targetType: 'area',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 12,
    cooldown: 0,
    feedback: { activation: 'decoy-place', hit: 'decoy-break', expiration: 'decoy-fizzle' },
  },
  {
    key: 'ghostReplay',
    category: ITEM_CATEGORIES.setup,
    rarity: 'rare',
    targetType: 'self',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 5.5,
    cooldown: 0,
    feedback: { activation: 'ghost-on', hit: null, expiration: 'ghost-off' },
  },
  {
    key: 'bananaMagnet',
    category: ITEM_CATEGORIES.selfBuff,
    rarity: 'common',
    targetType: 'self',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 6,
    cooldown: 0,
    feedback: { activation: 'magnet-on', hit: null, expiration: 'magnet-off' },
  },
  {
    key: 'invincibility',
    category: ITEM_CATEGORIES.selfBuff,
    rarity: 'rare',
    targetType: 'self',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 4.2,
    cooldown: 0,
    feedback: { activation: 'star-on', hit: 'star-contact', expiration: 'star-off' },
  },
  {
    key: 'tideHorn',
    category: ITEM_CATEGORIES.environmental,
    rarity: 'rare',
    targetType: 'area',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 0,
    cooldown: 0,
    feedback: { activation: 'tide-horn', hit: 'event-hit', expiration: null },
  },
  {
    key: 'boardwalkGrip',
    category: ITEM_CATEGORIES.selfBuff,
    rarity: 'track',
    targetType: 'self',
    vehicleRestriction: 'kart',
    trackRestriction: 'neon-tide-pier',
    duration: 5.6,
    cooldown: 0,
    feedback: { activation: 'grip-on', hit: null, expiration: 'grip-off' },
  },
  {
    key: 'warhorn',
    category: ITEM_CATEGORIES.environmental,
    rarity: 'track',
    targetType: 'all-opponents',
    vehicleRestriction: 'both',
    trackRestriction: 'giants-wakeway',
    duration: 2.4,
    cooldown: 0,
    feedback: { activation: 'horn-blast', hit: 'wake-hit', expiration: 'wake-calm' },
  },
  {
    key: 'phaseKey',
    category: ITEM_CATEGORIES.environmental,
    rarity: 'track',
    targetType: 'self',
    vehicleRestriction: 'both',
    trackRestriction: 'orbital-relay',
    duration: 4.8,
    cooldown: 0,
    feedback: { activation: 'phase-open', hit: null, expiration: 'phase-close' },
  },
  {
    key: 'anchorDrop',
    category: ITEM_CATEGORIES.trap,
    rarity: 'track',
    targetType: 'area',
    vehicleRestriction: 'kart',
    trackRestriction: 'tide-pier',
    duration: 15,
    cooldown: 0,
    triggerFilter: { vehicles: ['kart', 'hover'] },
    feedback: { activation: 'anchor-drop', hit: 'anchor-drag', expiration: 'anchor-sink' },
  },
  {
    key: 'lightningRod',
    category: ITEM_CATEGORIES.environmental,
    rarity: 'track',
    targetType: 'self',
    vehicleRestriction: 'both',
    trackRestriction: 'static-storm-plateau',
    duration: 8,
    cooldown: 0,
    feedback: { activation: 'rod-charge', hit: 'storm-redir', expiration: 'rod-fade' },
  },
  {
    key: 'polaritySwap',
    category: ITEM_CATEGORIES.vehicleState,
    rarity: 'track',
    targetType: 'all-opponents',
    vehicleRestriction: 'both',
    trackRestriction: 'magnet-mine-descent',
    duration: 3,
    cooldown: 0,
    feedback: { activation: 'polarity-swap', hit: 'polarity-flip', expiration: 'polarity-reset' },
  },
];

export const ITEM_DEFINITION_BY_KEY = new Map(ITEM_DEFINITIONS.map((item) => [item.key, item]));
export const getItemDefinition = (key) => ITEM_DEFINITION_BY_KEY.get(key) || null;

export const itemAllowedOnTrack = (definition, trackKey) =>
  !definition ||
  definition.trackRestriction === 'universal' ||
  definition.trackRestriction === trackKey;

export const itemAllowedForVehicle = (definition, vehicleMode) =>
  !definition ||
  definition.vehicleRestriction === 'both' ||
  definition.vehicleRestriction === vehicleMode ||
  (definition.vehicleRestriction === 'kart' && vehicleMode === 'hover');

export const itemLabel = (key) => ITEM_META.get(key)?.name || getItemDefinition(key)?.key || key;

