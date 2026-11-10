// Which handling a race runs: Assisted (the shipped rails game) or one of the
// two Classic versions in race/classicHandling.js.
//
//   ?handling=assisted | retro | mix
//
// retro is MK64's rules (the key was 'mk64' until 2026-11-10, and the old
// name still reads as retro); mix is the same base with ideas from the other games
// in the owner's decomp list (CTR-style timed boosts, coins lost on hits, timed
// ramp tricks, hang-time boosts). A saved choice lives under
// HANDLING_STORAGE_KEY; the URL wins over it, so a shared link always shows
// the handling it names.
import { currentHandlingKey, HANDLING_MODES } from './classicHandling.js';

export const HANDLING_STORAGE_KEY = 'cc-kart-handling';
export const DEFAULT_HANDLING = 'assisted';
export const HANDLING_LABELS = Object.freeze({ assisted: 'Assisted', mix: 'Classic Mix', retro: 'Retro' });

// The setup screen's picker, in the order it shows them.
export const HANDLING_OPTIONS = Object.freeze([
  Object.freeze({ key: 'assisted', name: 'Assisted', tagline: 'The road helps you round every bend' }),
  Object.freeze({ key: 'retro', name: 'Retro', tagline: 'Aim it yourself. Rock the stick for boosts' }),
  Object.freeze({ key: 'mix', name: 'Classic Mix', tagline: 'Classic, plus timed boosts, tricks and coin spills' }),
]);

// URL first (a shared link shows what it names), then `preferred` (the setup
// screen's pick, passed to the race as a prop), then the saved choice.
export const readHandlingMode = ({ search, storage, preferred } = {}) => {
  const query = search ?? (typeof window !== 'undefined' ? window.location.search : '');
  const fromUrl = currentHandlingKey(new URLSearchParams(query).get('handling'));
  if (HANDLING_MODES.includes(fromUrl)) return fromUrl;
  const picked = currentHandlingKey(preferred);
  if (HANDLING_MODES.includes(picked)) return picked;
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    const saved = currentHandlingKey(store?.getItem(HANDLING_STORAGE_KEY));
    if (HANDLING_MODES.includes(saved)) return saved;
  } catch {}
  return DEFAULT_HANDLING;
};

export const saveHandlingMode = (mode, storage) => {
  if (!HANDLING_MODES.includes(mode)) return;
  try {
    (storage ?? window.localStorage).setItem(HANDLING_STORAGE_KEY, mode);
  } catch {}
};
