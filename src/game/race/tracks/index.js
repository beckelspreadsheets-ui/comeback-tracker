// Track registry — tracks are content, not code (docs/MULTITRACK_EXECUTION_PLAN.md).
// Every entry is a pure TrackDefinition; dressing/visual builders are keyed
// by track key inside the runtime so these defs stay node-importable for
// the QA gates.
import { COMEBACK_CITY_TRACK } from './comebackCity.js';
import { PENGUIN_VILLAGE_TRACK } from './penguinVillage.js';
import { SATOSHI_SUMMIT_TRACK } from './satoshiSummit.js';
import { assertValidTrackVisuals } from './trackVisualSchema.js';

// The shipped cup. The Grand Prix, the default menus and "next track" read
// THIS list only.
export const KART_TRACKS = [COMEBACK_CITY_TRACK, PENGUIN_VILLAGE_TRACK];

// Built and raceable, but hidden until the owner approves them: the setup
// screen lists these only behind ?previewTracks=1 (persisted as localStorage
// cc-kart-preview-tracks = '1'), and the cup never includes them. A direct
// ?track=<key> QA entry still resolves them.
export const PREVIEW_TRACKS = [SATOSHI_SUMMIT_TRACK];

// Every track the runtime can build — what the QA gates iterate.
export const ALL_TRACKS = [...KART_TRACKS, ...PREVIEW_TRACKS];

assertValidTrackVisuals(ALL_TRACKS);

export const DEFAULT_TRACK_KEY = 'comeback-city';

export const isKnownTrackKey = (key) => ALL_TRACKS.some((entry) => entry.key === key);

export const trackByKey = (key) =>
  ALL_TRACKS.find((entry) => entry.key === key) || KART_TRACKS[0];
