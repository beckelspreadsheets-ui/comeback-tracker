// MIRROR MODE, shell side: the unlock, the setup-screen switch and the QA URL
// override. What the race does with the flag is src/game/race/mirrorMode.js.
//
// Mirror unlocks the first time the player wins a Grand Prix, at any class:
// the cup is over and the player tops the overall standings. After that the
// setup screen shows an on/off switch that applies to every mode (single race,
// cup and time trial), and the choice is remembered.
//
// Two keys, both owned here: 'cc-kart-mirror-unlocked' is '1' once earned,
// 'cc-kart-mirror' is '1' while the switch is on. ?mirror=1 forces mirror on
// regardless of the lock (screenshots, QA); ?mirror=0 forces it off.
//
// Pure apart from localStorage, which is optional throughout: private mode or
// a storage error reads as locked and off, and a write that fails keeps the
// in-memory state for the session.
import { cupStandings, isCupOver } from './cupMode.js';

export const MIRROR_UNLOCK_KEY = 'cc-kart-mirror-unlocked';
export const MIRROR_CHOICE_KEY = 'cc-kart-mirror';

const storage = () => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage || null;
  } catch {
    return null;
  }
};

const readFlag = (key) => {
  try {
    return storage()?.getItem(key) === '1';
  } catch {
    return false;
  }
};

const writeFlag = (key, on) => {
  try {
    const store = storage();
    if (!store) return false;
    store.setItem(key, on ? '1' : '0');
    return true;
  } catch {
    return false;
  }
};

export const readMirrorUnlocked = () => readFlag(MIRROR_UNLOCK_KEY);
export const unlockMirror = () => writeFlag(MIRROR_UNLOCK_KEY, true);
export const readMirrorChoice = () => readFlag(MIRROR_CHOICE_KEY);
export const writeMirrorChoice = (on) => writeFlag(MIRROR_CHOICE_KEY, on);

// ?mirror=1 -> true, ?mirror=0 -> false, anything else -> null (no override).
export const parseMirrorParam = (search) => {
  try {
    const value = new URLSearchParams(search || '').get('mirror');
    if (value === '1') return true;
    if (value === '0') return false;
  } catch {
    // Malformed query: no override.
  }
  return null;
};

// The setup screen's starting state. The URL override SEEDS the switch, the
// way ?track and ?character seed their pickers, and ?mirror=1 also opens the
// switch for a player who has not unlocked it yet (forced). ?mirror=0 never
// unlocks anything.
export const initialMirrorSetup = ({
  choice = readMirrorChoice(),
  override = typeof window === 'undefined' ? null : parseMirrorParam(window.location?.search),
  unlocked = readMirrorUnlocked(),
} = {}) => ({
  enabled: override ?? Boolean(choice),
  forced: override === true,
  // Set when a cup win unlocks it this session, for the podium's one-time
  // announcement.
  news: false,
  unlocked: Boolean(unlocked),
});

// Whether the switch can be used at all.
export const mirrorAvailable = (setup) => Boolean(setup?.unlocked || setup?.forced);

// Whether the next race runs mirrored.
export const isMirrorActive = (setup) => Boolean(setup?.enabled) && mirrorAvailable(setup);

// The unlock rule: the Grand Prix is over and the player is first overall
// (cupStandings breaks ties on the last race, as the podium does).
export const cupUnlocksMirror = (cup) => isCupOver(cup) && cupStandings(cup)[0]?.isPlayer === true;
