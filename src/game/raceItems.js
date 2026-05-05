import { RACE_ITEMS } from './raceProgression.js';
import { RACE_TRACKS } from './raceTracks.js';

export const COMMON_BOX_ITEMS = ['boost', 'shield', 'rocket', 'oil'];
export const BANKED_ITEMS = ['boost', 'shield', 'rocket'];
export const LOCAL_ITEMS = [
  { key: 'oil', name: 'Oil Slick', summary: 'Drops a slippery trap behind the kart.' },
  ...RACE_TRACKS.map((track) => track.signatureItem),
];
export const ITEM_META = new Map([...RACE_ITEMS, ...LOCAL_ITEMS].map((item) => [item.key, item]));

export const ITEM_DEFINITIONS = [
  {
    key: 'boost',
    category: 'self-buff',
    targetType: 'self',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 0.95,
    cooldown: 0,
    feedback: { activation: 'turbo-start', hit: null, expiration: 'turbo-end' },
  },
  {
    key: 'shield',
    category: 'setup',
    targetType: 'self',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 5.2,
    cooldown: 0,
    feedback: { activation: 'shield-on', hit: 'shield-block', expiration: 'shield-off' },
  },
  {
    key: 'rocket',
    category: 'projectile',
    targetType: 'single-opponent',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 0,
    cooldown: 0,
    feedback: { activation: 'rocket-fire', hit: 'rocket-hit', expiration: null },
  },
  {
    key: 'oil',
    category: 'trap',
    targetType: 'area',
    vehicleRestriction: 'kart',
    trackRestriction: 'universal',
    duration: 9,
    cooldown: 0,
    feedback: { activation: 'trap-drop', hit: 'trap-hit', expiration: 'trap-expire' },
  },
  {
    key: 'boardwalkGrip',
    category: 'self-buff',
    targetType: 'self',
    vehicleRestriction: 'kart',
    trackRestriction: 'neon-tide-pier',
    duration: 5.6,
    cooldown: 0,
    feedback: { activation: 'grip-on', hit: null, expiration: 'grip-off' },
  },
  {
    key: 'warhorn',
    category: 'environmental',
    targetType: 'all-opponents',
    vehicleRestriction: 'both',
    trackRestriction: 'giants-wakeway',
    duration: 2.4,
    cooldown: 0,
    feedback: { activation: 'horn-blast', hit: 'wake-hit', expiration: 'wake-calm' },
  },
  {
    key: 'phaseKey',
    category: 'environmental',
    targetType: 'self',
    vehicleRestriction: 'both',
    trackRestriction: 'orbital-relay',
    duration: 4.8,
    cooldown: 0,
    feedback: { activation: 'phase-open', hit: null, expiration: 'phase-close' },
  },
];

export const ITEM_DEFINITION_BY_KEY = new Map(ITEM_DEFINITIONS.map((item) => [item.key, item]));
export const getItemDefinition = (key) => ITEM_DEFINITION_BY_KEY.get(key) || null;
