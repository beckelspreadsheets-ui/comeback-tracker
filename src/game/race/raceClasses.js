// Engine classes (MK's 50/100/150cc), expressed as how hard the field drives.
// The player's kart is identical in every class; rivalPace scales the rivals'
// straight-line target speed (their corner caps are physics and do not move),
// and catchUp scales how hard a dropped rival rubber-bands back. 150cc is the
// field exactly as tuned in the 2026-08 difficulty pass, so QA runs there.
export const RACE_CLASSES = Object.freeze([
  Object.freeze({ catchUp: 0.6, key: '50cc', name: '50cc', rivalPace: 0.9, tagline: 'Relaxed — learn the tracks' }),
  Object.freeze({ catchUp: 0.85, key: '100cc', name: '100cc', rivalPace: 0.95, tagline: 'A real race' }),
  Object.freeze({ catchUp: 1, key: '150cc', name: '150cc', rivalPace: 1, tagline: 'The crew at full tilt' }),
]);

// Owner call 2026-10-21: a brand-new player's first race is 50cc, so a
// first-timer (and an App Store reviewer) can finish near the front. KartApp
// saves the class the first time the menu loads, so anyone who has already
// played keeps what they had, and the picker remembers every later choice.
export const DEFAULT_RACE_CLASS = '50cc';
export const QA_RACE_CLASS = '150cc';

export const raceClassByKey = (key) => RACE_CLASSES.find((entry) => entry.key === key) || RACE_CLASSES[2];
