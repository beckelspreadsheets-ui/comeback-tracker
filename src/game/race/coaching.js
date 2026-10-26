// FIRST-RACE COACHING — pure logic (no React, no DOM, no three.js), so every
// rule below is node-testable (scripts/test-kart-coaching.mjs).
//
// New players, and App Store reviewers, meet the game on a phone with no
// manual. Four one-line prompts teach what the race never explains on its own:
//
//   drift    before a real corner      touch "Flick toward the turn to drift"
//                                      keys  "Hold Space to drift"  (pad: RB)
//   release  sparks reached tier 1     touch "Lift your thumb to boost!"
//                                      keys  "Let go to boost!"
//   item     an item lands in the slot touch "Tap to throw your Snowball"
//                                      keys  "Press E to use your Snowball" (pad: LB)
//   pad      a boost pad coming up     "Drive over the arrows for a boost"
//
// The rules:
//   - a prompt COMPLETES when the player does the thing (drifts, releases a
//     charged drift, uses an item, hits a pad), whether or not it was on
//     screen, and is never shown again on this device;
//   - a prompt shown in COACH_RETIRE_AFTER_RACES races without being completed
//     retires too (no nagging), and shows at most COACH_TUNING.appearancesPerRace
//     times in any one race;
//   - never during the countdown or GO, after the flag, or over the TURN AROUND
//     alert or the lap banner;
//   - one prompt at a time. Drift and release are time-critical and may take
//     the slot from an item or pad prompt; item and pad wait their turn.
//
// The component (RaceCoach.jsx) owns the gates that need a browser — autoplay,
// navigator.webdriver, ?coach=1, which input device is in use — and feeds this
// module one plain frame per HUD snapshot (~7 Hz).

export const COACH_STORAGE_KEY = 'cc-kart-coach';
export const COACH_PROMPT_IDS = Object.freeze(['drift', 'release', 'item', 'pad']);
export const COACH_RETIRE_AFTER_RACES = 2;

export const COACH_TUNING = Object.freeze({
  // Per-race cap on separate appearances of one prompt.
  appearancesPerRace: 2,
  // Lead-in before a corner's entry: this many seconds at the current speed,
  // never less than the floor (a slow kart still gets time to read).
  cornerLeadMinUnits: 180,
  cornerLeadSeconds: 2.2,
  // Breathing room between two different prompts (release is exempt: it is
  // the direct follow-up to a drift and only lives while the drift does).
  gapSeconds: 0.6,
  // Visible time an item prompt gets per item held.
  itemSeconds: 6,
  // The lap roll-over banner owns the upper-middle band for 1.5s.
  lapQuietSeconds: 1.5,
  padLeadMinUnits: 140,
  padLeadSeconds: 1.6,
  // A pad still counts as "coming up" this far past its centre — the runtime
  // arms the pad within 35 units either side.
  padPassedUnits: 40,
  // Lets GO and the rocket-start verdict have the screen first.
  startDelaySeconds: 1.2,
  // Corner detection (findCorners). Curvature is the heading change across a
  // symmetric ±halfSpan baseline — wide enough that the centreline spline's
  // single-sample seam spikes cannot read as corners.
  enterKappa: 0.003,
  halfSpanUnits: 12,
  minTurnDeg: 25,
  // A REAL corner is one the kart cannot hold at top speed by steering alone:
  // cornerPushFor(κ, 228) = κ^0.7 · 228² · CORNER_LOAD_K (0.00062) beats the
  // 0.72 lane/s steering authority from κ ≈ 0.0044 up. That is where a drift
  // stops being style and starts being the way through.
  realKappa: 0.0044,
  stepUnits: 6,
});

const PRIORITY = ['release', 'drift', 'pad', 'item'];
const PREEMPTS = new Set(['release', 'drift']);

const wrap01 = (value) => ((value % 1) + 1) % 1;

// ── Persistence ─────────────────────────────────────────────────────────────

const freshEntry = () => ({ done: false, races: 0 });

export const freshCoachMemory = () => ({
  v: 1,
  prompts: Object.fromEntries(COACH_PROMPT_IDS.map((id) => [id, freshEntry()])),
});

// Anything that is not the shape we wrote becomes a clean record: bad JSON,
// a non-object, missing or junk entries, negative or fractional counts.
export const sanitizeCoachMemory = (value) => {
  const memory = freshCoachMemory();
  const prompts = value && typeof value === 'object' && !Array.isArray(value) ? value.prompts : null;
  if (!prompts || typeof prompts !== 'object') return memory;
  COACH_PROMPT_IDS.forEach((id) => {
    const entry = prompts[id];
    if (!entry || typeof entry !== 'object') return;
    const races = Number(entry.races);
    memory.prompts[id] = {
      done: entry.done === true,
      races: Number.isFinite(races) ? Math.min(99, Math.max(0, Math.floor(races))) : 0,
    };
  });
  return memory;
};

// `storage` is a Storage-like object (getItem/setItem). Every access is
// guarded: private mode and blocked site data THROW on access in WebKit.
export const readCoachMemory = (storage) => {
  try {
    const raw = storage?.getItem(COACH_STORAGE_KEY);
    if (!raw) return freshCoachMemory();
    return sanitizeCoachMemory(JSON.parse(raw));
  } catch {
    return freshCoachMemory();
  }
};

export const writeCoachMemory = (storage, memory) => {
  try {
    storage?.setItem(COACH_STORAGE_KEY, JSON.stringify(sanitizeCoachMemory(memory)));
    return true;
  } catch {
    return false;
  }
};

// ── Gates and wording ───────────────────────────────────────────────────────

// Autoplay and webdriver sessions are QA; they only see coaching on ?coach=1.
export const coachEnabled = ({ autoplay = false, forced = false, webdriver = false } = {}) =>
  Boolean(forced || (!autoplay && !webdriver));

// Which wording to use. A pad in use wins everywhere (an iPhone with a
// controller races on the pad); otherwise the race's own touch gate decides,
// so a phone can never be told about keys and a desktop never about thumbs.
export const coachScheme = ({ lastDevice = null, touch = false } = {}) =>
  lastDevice === 'pad' ? 'pad' : touch ? 'touch' : 'keyboard';

// Display names match the How-to-Race item guide (KartApp ITEM_GUIDE); the
// snowball slot wears the character's projectile skin, exactly as the HUD's
// heldItemLabel does (carrot, snowball, otherwise ice shard).
const ITEM_NAMES = {
  aurora: 'Aurora Boost',
  avalanche: 'Avalanche',
  blizzard: 'Blizzard Cloud',
  cocoa: 'Hot Cocoa',
  fishbone: 'Fish Bone',
  iceshield: 'Ice Shield',
  march: 'Penguin March',
  sardine: 'Rocket Sardine',
  slapfish: 'Slap Fish',
};

export const coachItemName = (heldItem, projectileSkin = null) => {
  if (heldItem === 'snowball') {
    if (projectileSkin === 'carrot') return 'Carrot';
    if (projectileSkin === 'snowball') return 'Snowball';
    return 'Ice Shard';
  }
  return ITEM_NAMES[heldItem] || 'item';
};

// "Tap to throw your Hot Cocoa" would be wrong, so the touch verb follows what
// the item does. Keys and pads say "use", per the brief.
const TOUCH_ITEM_VERBS = {
  blizzard: 'drop',
  fishbone: 'drop',
  sardine: 'throw',
  slapfish: 'swing',
  snowball: 'throw',
};

const BUTTONS = {
  keyboard: { drift: 'Space', item: 'E' },
  // gamepadInput.js: drift = right bumper (or X), item = left bumper (or Y);
  // the How-to-Race guide names them RB and LB.
  pad: { drift: 'RB', item: 'LB' },
};

const message = (parts) => ({
  parts,
  text: parts.map((part) => (typeof part === 'string' ? part : part.key)).join(''),
});

// parts: strings, plus { key } for a key-cap the component styles.
export const coachMessage = (id, scheme, { handling = 'assisted', heldItem = null, projectileSkin = null } = {}) => {
  const buttons = BUTTONS[scheme] || BUTTONS.keyboard;
  if (id === 'drift') {
    return scheme === 'touch'
      ? message(['Flick toward the turn to drift'])
      : message(['Hold ', { key: buttons.drift }, ' to drift']);
  }
  if (id === 'release') {
    // Classic earns the boost differently (driftFeel.js ROCK_TURBO / TAP_TURBO).
    if (handling === 'mk64') {
      return message([scheme === 'touch' ? 'Slide out of the turn and back in, then lift!' : 'Steer out and back in twice, then let go!']);
    }
    if (handling === 'mix') {
      return message(scheme === 'touch' ? ['Tap Drift when the sparks flash amber!'] : ['Press ', { key: buttons.drift }, ' again on the amber flash!']);
    }
    return message([scheme === 'touch' ? 'Lift your thumb to boost!' : 'Let go to boost!']);
  }
  if (id === 'item') {
    const name = coachItemName(heldItem, projectileSkin);
    return scheme === 'touch'
      ? message([`Tap to ${TOUCH_ITEM_VERBS[heldItem] || 'use'} your ${name}`])
      : message(['Press ', { key: buttons.item }, ` to use your ${name}`]);
  }
  if (id === 'pad') return message(['Drive over the arrows for a boost']);
  return null;
};

// ── Track reading ───────────────────────────────────────────────────────────

export const coachStartProgress = (trackDef) =>
  wrap01((trackDef?.course?.startProgress || 0) + (trackDef?.startOffset || 0));

// Signed heading change from tangent a to tangent b in the ground plane,
// positive toward the sampler's +normal (-t.z, 0, t.x), i.e. toward +lane.
// atan2 is scale-free, so un-normalised tangents are fine.
const signedTurn = (a, b) => Math.atan2(a.x * b.z - a.z * b.x, a.x * b.x + a.z * b.z);

// One lap scanned from startProgress, returned in driving order:
// [{ direction (±1), entry (progress), spanUnits, peakKappa, turnDeg }].
// tangentAt(progress) -> { x, z } (the race passes sampler.pointAt(p).tangent).
export const findCorners = ({ length, startProgress = 0, tangentAt, tuning = COACH_TUNING } = {}) => {
  if (typeof tangentAt !== 'function' || !(length > 0)) return [];
  const steps = Math.max(16, Math.round(length / tuning.stepUnits));
  const step = length / steps;
  // One tangent per step, read once; the ±halfSpan baseline then indexes into
  // it (half the sampler calls of reading both ends at every step).
  const tangents = new Array(steps);
  for (let index = 0; index < steps; index += 1) {
    tangents[index] = tangentAt(wrap01(startProgress + (index * step) / length));
  }
  const halfSteps = Math.max(1, Math.round(tuning.halfSpanUnits / step));
  const runs = [];
  let run = null;
  for (let index = 0; index < steps; index += 1) {
    const kappa =
      signedTurn(tangents[(index - halfSteps + steps) % steps], tangents[(index + halfSteps) % steps]) /
      (2 * halfSteps * step);
    const sign = Math.abs(kappa) >= tuning.enterKappa ? Math.sign(kappa) : 0;
    if (sign !== 0 && run && run.sign === sign) {
      run.end = index;
      run.peak = Math.max(run.peak, Math.abs(kappa));
      run.turn += kappa * step;
    } else {
      if (run) runs.push(run);
      run = sign !== 0 ? { end: index, peak: Math.abs(kappa), sign, start: index, turn: kappa * step } : null;
    }
  }
  if (run) runs.push(run);
  // A bend straddling the scan seam arrives as a run at each end: one corner.
  if (runs.length > 1) {
    const first = runs[0];
    const last = runs[runs.length - 1];
    if (first.start === 0 && last.end === steps - 1 && first.sign === last.sign) {
      runs.shift();
      runs.pop();
      runs.push({
        end: first.end + steps,
        peak: Math.max(first.peak, last.peak),
        sign: first.sign,
        start: last.start,
        turn: first.turn + last.turn,
      });
    }
  }
  const minTurn = (tuning.minTurnDeg * Math.PI) / 180;
  return runs
    .filter((entry) => entry.peak >= tuning.realKappa && Math.abs(entry.turn) >= minTurn)
    .map((entry) => ({
      direction: entry.sign,
      entry: wrap01(startProgress + (entry.start * step) / length),
      peakKappa: Number(entry.peak.toFixed(5)),
      spanUnits: (entry.end - entry.start + 1) * step,
      turnDeg: Math.round((Math.abs(entry.turn) * 180) / Math.PI),
    }))
    .sort((a, b) => wrap01(a.entry - startProgress) - wrap01(b.entry - startProgress));
};

// The corner whose prompt window the player is in: inside it, or within
// leadUnits of its entry. Nearest wins. null when the road ahead is clear.
export const cornerWindowAt = (corners, progress, length, leadUnits) => {
  if (!corners?.length || !(length > 0)) return null;
  let best = null;
  corners.forEach((corner, index) => {
    const into = wrap01(progress - corner.entry) * length;
    const candidate =
      into <= corner.spanUnits
        ? { distance: 0, index, inside: true }
        : { distance: wrap01(corner.entry - progress) * length, index, inside: false };
    if (!candidate.inside && candidate.distance > leadUnits) return;
    if (!best || candidate.distance < best.distance) best = candidate;
  });
  return best;
};

// The boost pad coming up (or just under the kart). distance < 0 = passed.
export const padWindowAt = (pads, progress, length, leadUnits, passedUnits = COACH_TUNING.padPassedUnits) => {
  if (!pads?.length || !(length > 0)) return null;
  let best = null;
  pads.forEach((pad, index) => {
    const ahead = wrap01(pad.progress - progress) * length;
    const behind = wrap01(progress - pad.progress) * length;
    const distance = ahead <= leadUnits ? ahead : behind <= passedUnits ? -behind : null;
    if (distance == null) return;
    if (!best || Math.abs(distance) < Math.abs(best.distance)) best = { distance, index };
  });
  return best;
};

export const coachLeadUnits = (speed, kind = 'corner', tuning = COACH_TUNING) => {
  const v = Math.max(0, Number(speed) || 0);
  return kind === 'pad'
    ? Math.max(tuning.padLeadMinUnits, v * tuning.padLeadSeconds)
    : Math.max(tuning.cornerLeadMinUnits, v * tuning.cornerLeadSeconds);
};

// ── The per-race state machine ──────────────────────────────────────────────

// `memory` is the device record (readCoachMemory, or freshCoachMemory under
// ?coach=1). It is mutated in place; stepCoachRace reports when to persist it.
export const createCoachRace = (memory = freshCoachMemory(), tuning = COACH_TUNING) => ({
  active: null, // { id, key }
  appearances: Object.fromEntries(COACH_PROMPT_IDS.map((id) => [id, 0])),
  boostBaseline: null,
  itemBudget: 0,
  itemHolding: null,
  lastEndedAt: Number.NEGATIVE_INFINITY,
  lastKey: Object.fromEntries(COACH_PROMPT_IDS.map((id) => [id, null])),
  memory,
  phase: 'grid',
  prev: null,
  quietUntil: 0,
  serial: { drift: 0, item: 0, pad: 0, release: 0 },
  tuning,
  wanted: { drift: false, pad: false, release: false },
});

// May this prompt appear in this race at all?
export const coachEligible = (race, id) => {
  const entry = race.memory.prompts[id];
  if (!entry || entry.done) return false;
  return entry.races < COACH_RETIRE_AFTER_RACES || race.appearances[id] > 0;
};

// frame (all plain values, straight off the HUD snapshot):
//   countdown, finished, raceTime, lap, wrongWay, drift, driftTier,
//   miniTurboTier, heldItem, boostHits, ttBoosts (time trial only, else null),
//   corner: cornerWindowAt(...) | null, pad: padWindowAt(...) | null
// Returns { prompt: { id, key } | null, changed } — persist memory on changed.
export const stepCoachRace = (race, frame) => {
  const { memory, tuning } = race;
  let changed = false;
  const end = () => {
    if (!race.active) return;
    race.active = null;
    race.lastEndedAt = Number(frame.raceTime) || 0;
  };
  const complete = (id) => {
    const entry = memory.prompts[id];
    if (!entry || entry.done) return;
    entry.done = true;
    changed = true;
    if (race.active?.id === id) end();
  };

  if (frame.countdown > 0 || frame.finished) {
    end();
    race.phase = frame.finished ? 'finished' : 'grid';
    race.prev = null;
    return { changed, prompt: null };
  }
  race.phase = 'racing';
  const raceTime = Number(frame.raceTime) || 0;
  const prev = race.prev;
  const dt = prev ? Math.max(0, raceTime - prev.raceTime) : 0;

  // 1. Completions — the player did the thing, prompt on screen or not.
  if (frame.drift) complete('drift');
  // A drift that ends with a mini-turbo running was released with sparks; one
  // that ends without (too slow, spun, launched) was not.
  if (prev?.drift && !frame.drift && frame.miniTurboTier > 0) complete('release');
  if (prev?.heldItem && !frame.heldItem) complete('item');
  // Time trial refills the Hot Cocoa the instant one is used, so the slot
  // never empties between snapshots; the spare count does drop.
  if (prev && Number.isFinite(prev.ttBoosts) && frame.ttBoosts < prev.ttBoosts) complete('item');
  // The first racing frame's count already includes a rocket-start boost.
  if (race.boostBaseline == null) race.boostBaseline = frame.boostHits || 0;
  else if ((frame.boostHits || 0) > race.boostBaseline) {
    race.boostBaseline = frame.boostHits;
    complete('pad');
  }

  // 2. Item budget: each item held gets itemSeconds of prompt time, spent only
  // while the item prompt is actually on screen (so a drift that borrows the
  // slot does not eat it).
  if (race.active?.id === 'item') race.itemBudget = Math.max(0, race.itemBudget - dt);
  if (!frame.heldItem) {
    race.itemHolding = null;
    race.itemBudget = 0;
  } else if (race.itemHolding == null) {
    race.serial.item += 1;
    race.itemHolding = race.serial.item;
    race.itemBudget = tuning.itemSeconds;
  }

  // 3. What each prompt wants right now. Windows count as a new appearance
  // each time they open (false -> true), so a corner or pad passed without
  // the prompt cannot be re-shown for that same visit.
  const raw = {
    drift: !frame.drift && frame.corner != null,
    item: Boolean(frame.heldItem) && race.itemBudget > 0,
    pad: frame.pad != null,
    // Sparks on two snapshots running: a player who lets go the instant the
    // sparks appear completes it without the prompt flashing up for 0.14s.
    release: Boolean(frame.drift) && frame.driftTier >= 1 && Boolean(prev?.drift) && prev.driftTier >= 1,
  };
  ['drift', 'pad', 'release'].forEach((id) => {
    if (raw[id] && !race.wanted[id]) race.serial[id] += 1;
    race.wanted[id] = raw[id];
  });
  const keyFor = (id) => (id === 'item' ? `item-${race.itemHolding}` : `${id}-${race.serial[id]}`);

  // Yield to the TURN AROUND alert, to GO, and to the lap roll-over banner.
  if (prev && frame.lap > prev.lap && frame.lap >= 2) race.quietUntil = raceTime + tuning.lapQuietSeconds;
  const suppressed = Boolean(frame.wrongWay) || raceTime < tuning.startDelaySeconds || raceTime < race.quietUntil;
  const canShow = (id) => {
    if (suppressed || !raw[id] || !coachEligible(race, id)) return false;
    const key = keyFor(id);
    if (race.lastKey[id] === key) return true; // same appearance, resuming
    return race.appearances[id] < tuning.appearancesPerRace;
  };

  // 4. Choose. The active prompt keeps the slot while it still applies,
  // unless a time-critical one (drift, release) needs it. Drift and release
  // never want the slot at once (one needs a drift, the other needs none).
  let current = race.active;
  if (current && !(canShow(current.id) && keyFor(current.id) === current.key)) {
    end(); // its moment is over: whatever comes next waits a breath
    current = null;
  }
  let next = current?.id ?? null;
  if (next && !PREEMPTS.has(next)) next = PRIORITY.find((id) => PREEMPTS.has(id) && canShow(id)) || next;
  if (!next) {
    // A free slot: highest priority first, after a breath since the last one
    // (release excepted — it lives only as long as the drift does).
    const rested = raceTime - race.lastEndedAt >= tuning.gapSeconds;
    next = PRIORITY.find((id) => canShow(id) && (rested || id === 'release')) || null;
  }

  if (!next) end();
  else {
    const key = keyFor(next);
    if (!current || current.id !== next || current.key !== key) {
      if (race.lastKey[next] !== key) {
        if (race.appearances[next] === 0) {
          memory.prompts[next].races += 1;
          changed = true;
        }
        race.appearances[next] += 1;
        race.lastKey[next] = key;
      }
      race.active = { id: next, key };
    }
  }

  race.prev = {
    drift: Boolean(frame.drift),
    driftTier: Number(frame.driftTier) || 0,
    heldItem: frame.heldItem || null,
    lap: Number(frame.lap) || 0,
    raceTime,
    ttBoosts: Number.isFinite(frame.ttBoosts) ? frame.ttBoosts : null,
  };
  return { changed, prompt: race.active ? { ...race.active } : null };
};
