// Track registry — tracks are content, not code (docs/MULTITRACK_EXECUTION_PLAN.md).
// Every entry is a pure TrackDefinition; dressing/visual builders are keyed
// by track key inside the runtime so these defs stay node-importable for
// the QA gates.
//
// 2026-07-22 (Ordinals rebuild, branch kimi/ordinals-inscription-circuit):
// the Inscription Circuit is now the ONLY registered track. Comeback City
// and Penguin Village are retired from the shipped build (rejection evidence
// only — see docs/INSCRIPTION_CIRCUIT_ART_DIRECTION.md); their modules stay
// on disk untouched for the legacy fitness-side test fixtures.
import { INSCRIPTION_CIRCUIT_TRACK } from './inscriptionCircuit.js';
import { assertValidTrackVisuals } from './trackVisualSchema.js';

export const KART_TRACKS = [INSCRIPTION_CIRCUIT_TRACK];

assertValidTrackVisuals(KART_TRACKS);

export const DEFAULT_TRACK_KEY = 'inscription-circuit';

export const trackByKey = (key) =>
  KART_TRACKS.find((entry) => entry.key === key) || KART_TRACKS[0];
