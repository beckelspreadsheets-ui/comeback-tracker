// Track registry — tracks are content, not code (docs/MULTITRACK_EXECUTION_PLAN.md).
// Every entry is a pure TrackDefinition; dressing/visual builders are keyed
// by track key inside the runtime so these defs stay node-importable for
// the QA gates.
import { COMEBACK_CITY_TRACK } from './comebackCity.js';
import { PENGUIN_VILLAGE_TRACK } from './penguinVillage.js';
import { assertValidTrackVisuals } from './trackVisualSchema.js';

export const KART_TRACKS = [COMEBACK_CITY_TRACK, PENGUIN_VILLAGE_TRACK];

assertValidTrackVisuals(KART_TRACKS);

export const DEFAULT_TRACK_KEY = 'comeback-city';

export const trackByKey = (key) =>
  KART_TRACKS.find((entry) => entry.key === key) || KART_TRACKS[0];
