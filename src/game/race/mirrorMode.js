// MIRROR MODE, race side: every track raced flipped left-to-right, the way
// Mario Kart's mirror cup does it. Unlocking and the setup-screen switch live
// in src/kart/mirrorUnlock.js; this file is what the race itself needs.
//
// The SIMULATION is never mirrored. Track splines, rivals, items, autoplay and
// saved ghost samples all run in the space they always have; only the PICTURE
// flips. The race canvas and the course map wear a CSS scaleX(-1), a
// compositor transform that costs nothing per frame and leaves the HTML HUD
// readable. The player's steering is inverted so that pushing left still turns
// the kart left ON SCREEN. Flipping the image rather than the world means no
// mirrored geometry, no reversed triangle winding, no second copy of any track,
// and no change to the autoplay driver or the ghost format. Text painted on 3D
// signs reads backwards as a result, which is what Mario Kart 8 does too.
//
// Pure and DOM-free, so scripts/test-kart-mirror.mjs checks it in node.

// Shared by the race canvas and the course map's <svg>. Neither has a
// transform of its own (comebackCityThreeKartRace.css), so an inline one cannot
// fight a stylesheet rule. Frozen: React reuses the same object every render.
export const MIRROR_FLIP_STYLE = Object.freeze({ transform: 'scaleX(-1)' });

// Steering inversion, in ONE place for every player input source. The frame
// loop merges keyboard (left/right booleans), touch drag and tilt (analog
// steerAxis) and the gamepad stick and d-pad (steerAxis again, via
// mergeGamepadInput) into one object before anything reads it, so inverting
// that object covers all of them. Drift direction needs nothing extra: a drift
// (button or touch flick) takes its side from the steer at the hop, and that
// steer is computed from the inverted input.
//
// Autoplay is NOT inverted. Its driver reads the track in simulation space and
// is right as it stands; flipping it would steer it into the walls.
//
// Returns the input unchanged when there is nothing to do, else a new object;
// the input is never mutated, because it is the live inputRef object that the
// key and pointer handlers keep replacing.
export const mirrorSteerInput = (input, { autoplay = false, mirror = false } = {}) => {
  if (!mirror || autoplay || !input) return input;
  const axis = input.steerAxis;
  return {
    ...input,
    left: input.right,
    right: input.left,
    // null means "no analog source, the keys rule"; keep it null. Zero stays a
    // plain zero instead of becoming -0.
    steerAxis: typeof axis === 'number' && axis !== 0 ? -axis : axis,
  };
};

// Records: a mirror run must never overwrite a normal one. Results
// (kartLocalStore.js, 'cc-kart-results') and time-trial ghosts
// (replayGhost.js, 'cc-kart-ghost-v2-<key>') are both stored per key, so a
// mirror run saves under '<trackKey>:mirror' and the normal key is untouched.
// Data saved before mirror mode existed stays valid as it is: those keys are
// the normal records.
export const MIRROR_RECORD_SUFFIX = ':mirror';

export const isMirrorRecordKey = (key) => typeof key === 'string' && key.endsWith(MIRROR_RECORD_SUFFIX);

export const mirrorRecordKey = (trackKey, mirror) =>
  mirror && !isMirrorRecordKey(trackKey) ? `${trackKey}${MIRROR_RECORD_SUFFIX}` : trackKey;

// The saved results as the setup screen should show them for the mode it is
// in, keyed by plain track key: normal mode sees only normal records, mirror
// mode sees only the ':mirror' ones.
export const recordsForMode = (results, mirror) => {
  const view = {};
  if (!results || typeof results !== 'object') return view;
  for (const [key, entry] of Object.entries(results)) {
    if (isMirrorRecordKey(key) !== Boolean(mirror)) continue;
    view[mirror ? key.slice(0, -MIRROR_RECORD_SUFFIX.length) : key] = entry;
  }
  return view;
};
