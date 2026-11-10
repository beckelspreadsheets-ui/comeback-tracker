// Engine classes (MK's 50/100/150cc), expressed as how hard the field drives.
// The player's kart is identical in every class; rivalPace scales the rivals'
// straight-line target speed (their corner caps are physics and do not move),
// and catchUp scales how hard a dropped rival rubber-bands back. 150cc is the
// field exactly as tuned in the 2026-08 difficulty pass, so QA runs there.
//
// RETUNED 2026-11-10 (owner: "easy 50cc, tighten the rest"). 50cc is as it
// was. 100cc went 0.95 -> 1.02 and 150cc 1 -> 1.05, measured with the
// autoplay driver on all three tracks: at the old values it won 8 of 9 races,
// leading up to 91% of one; at 1.03 it came 2nd in 5 of 6 without ever
// leading; at 1.05 it came 2nd, 2nd, 3rd; at 1.06 it was last in 3 of 6. The
// step from "wins" to "last" is only about 0.06 wide, so move these in 0.01s.
// Autoplay does not drift for boosts; a player who does has that in hand.
//
// classicSpeed is Classic handling's rule (docs/CLASSIC_HANDLING.md step 5),
// MK64's: the class sets EVERYONE's speed, the player's kart and the rivals'
// alike (MK64's 50/100/150cc top speeds run ~0.88 / 1.0 / 1.08). So 150cc is
// genuinely faster, and at that speed the same corners ask more of the grip.
export const RACE_CLASSES = Object.freeze([
  Object.freeze({ catchUp: 0.6, classicSpeed: 0.88, key: '50cc', name: '50cc', rivalPace: 0.9, tagline: 'Relaxed — learn the tracks' }),
  Object.freeze({ catchUp: 0.85, classicSpeed: 1, key: '100cc', name: '100cc', rivalPace: 1.02, tagline: 'A real race' }),
  Object.freeze({ catchUp: 1, classicSpeed: 1.08, key: '150cc', name: '150cc', rivalPace: 1.05, tagline: 'The crew at full tilt' }),
]);

// Owner call 2026-10-21: a brand-new player's first race is 50cc, so a
// first-timer (and an App Store reviewer) can finish near the front. KartApp
// saves the class the first time the menu loads, so anyone who has already
// played keeps what they had, and the picker remembers every later choice.
export const DEFAULT_RACE_CLASS = '50cc';
export const QA_RACE_CLASS = '150cc';

export const raceClassByKey = (key) => RACE_CLASSES.find((entry) => entry.key === key) || RACE_CLASSES[2];
