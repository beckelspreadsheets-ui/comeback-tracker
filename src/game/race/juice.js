// Race JUICE — impact and finish feedback. PRESENTATION ONLY.
//
// Why this exists. Before this module the only impact response was a flat
// camera shake on two rising edges: spin-out 0.9 and ANY wall contact 0.45, so
// leaning on the rail at 60 km/h and slamming it at 220 kicked the frame
// identically, and a scrape that toggled contact re-kicked on every toggle.
// Kart-to-kart contact, a shield eating a hit, and a hit the player LANDED on a
// rival had no camera or screen response at all, and which haptic a phone felt
// was whichever cue happened to fire first inside the 90 ms rate-limit window.
//
// THE CONTRACT, and the reason this is its own file: nothing here writes
// simulation state. detectJuiceEvents READS the race once per frame, after the
// sim has stepped, and derives events from rising edges of state the sim
// already keeps (spinTimer/spinOuts, wallContact, bumps/wobbleTimer, the
// shield, every rival's spinTimer, the player's live hazards). The events are
// spent on presentation channels only:
//   camera  the chase camera's EXISTING impulse system (impulseChaseKick in
//           chaseCameraFeel.js) — a second door into the same state, never a
//           second shake;
//   screen  one DOM edge-flash overlay animated on opacity alone, which the
//           compositor runs without a repaint — the cheap option on a phone —
//           and a HIT! word for a hit the player lands (transform + opacity);
//   touch   haptics scaled by severity (haptics.hapticForImpact).
// No hit-stop, no dt scaling, no forces. The difficulty tuning and the
// autoplay/lap gates see exactly the sim they saw before this landed.
import { impulseChaseKick } from './camera/chaseCameraFeel.js';
import { hapticForImpact } from './haptics.js';

const clamp01 = (value) => Math.min(1, Math.max(0, value));
// Signed shortest progress difference, in laps (-0.5..0.5).
const progressDelta = (a, b) => ((((a - b) % 1) + 1.5) % 1) - 0.5;

export const JUICE = {
  // Camera kick at severity 1, in impulseChaseShake's 0..1 units. The spin-out
  // keeps the 0.9 it shipped with — it was already the right size for the
  // biggest thing that can happen to the player. Everything else is new or now
  // scales: a landed hit is a confirming thump, not a flinch, because nothing
  // hit YOU.
  //
  // FINISH is the camera beat at the flag: the sim parks the kart dead on the
  // line, and a small settle (mostly the dip, barely any shake) sells that stop
  // as weight while the finish camera lifts into its tableau. An ORBIT round
  // the stopped kart was tried first and dropped: swinging the lens to angles
  // the race never looked from put never-drawn scenery in frame, and its
  // first-use texture/shader uploads measured as one-off 500 ms stalls on the
  // phone tier two runs in three (none in three with the orbit off).
  kick: { bump: 0.3, finish: 0.3, flood: 0.3, landed: 0.2, shield: 0.5, spin: 0.9, wall: 0.55 },
  // Edge-flash peak opacity at severity 1, and how long it takes to fade.
  // Kart contact and the start-line flood get no flash: contact happens a lot
  // in traffic and a flood already has its own "Flooded!" verdict on screen.
  // A LANDED hit gets no edge flash either: measured on Comeback City's dusk
  // grade, a gold edge on an orange sky is invisible, and the screen edge is
  // the wrong place to confirm something that happened up the road. It gets
  // the HIT! marker instead (hitMarkerMs), which reads on any background.
  flash: { bump: 0, finish: 0.5, flood: 0, landed: 0, shield: 0.72, spin: 0.92, wall: 0.55 },
  flashMs: { finish: 950, shield: 400, spin: 500, wall: 300 },
  hitMarkerMs: 760,
  // The flash HOLDS its peak for this share of its life before decaying. A
  // pure ease-out spent a quarter of its value in the first frame, which on a
  // 60 Hz screen read as a tint rather than a flash.
  flashHold: 0.12,
  // Reduced motion: never a camera kick, and the flash survives only as a dim,
  // short cue — it is information (you were hit), not motion.
  reducedFlash: 0.35,
  reducedFlashMs: 0.6,
  // Wall severity runs from a lean at wallSpeedFloor to a slam at
  // wallSpeedFull (race.speed units), mapped onto 0.3..1 so even a lean still
  // kicks a little. Below wallFlashFloor (severity, ~125 km/h) it is a lean: a
  // kick, but no flash.
  wallSpeedFloor: 70,
  wallSpeedFull: 220,
  wallFlashFloor: 0.55,
  // A wall contact only counts as a NEW hit after this much clear running. The
  // rails clamp toggles wallContact on and off through a long scrape, and every
  // toggle used to be a fresh kick.
  wallFreshGap: 0.35,
  // A player hazard (snowball, sardine, fish bone) that vanished this frame
  // within this many world units of a rival that started spinning this frame is
  // the player's hit. Generous on purpose: the hazard and the rival are sampled
  // on different frames of a 60 Hz sim.
  landedReach: 40,
};

const createEvent = () => ({ kind: '', severity: 0 });

export const createJuiceTracker = () => ({
  ready: false,
  raceTime: 0,
  finished: false,
  spinTimer: 0,
  spinOuts: 0,
  wall: false,
  wallClear: 99,
  bumps: 0,
  wobbleTimer: 0,
  shieldActive: false,
  shieldTimer: 0,
  slapTimer: 0,
  avalancheBy: null,
  avalancheTarget: null,
  rivalSpin: [],
  // Previous frame's live player hazards, as reused { ref, progress } records.
  hazards: [],
  hazardCount: 0,
  // Reused output. At most a handful of events a frame, almost always none.
  events: [],
  eventPool: [createEvent(), createEvent(), createEvent(), createEvent()],
});

const pushEvent = (tracker, kind, severity) => {
  const index = tracker.events.length;
  if (index >= tracker.eventPool.length) tracker.eventPool.push(createEvent());
  const event = tracker.eventPool[index];
  event.kind = kind;
  event.severity = clamp01(severity);
  tracker.events.push(event);
};

const isPlayerHazard = (entry) => entry && entry.owner === 'player' && !entry.held;

const recordHazards = (tracker, list, count) => {
  if (!list) return count;
  let next = count;
  for (let index = 0; index < list.length; index += 1) {
    const entry = list[index];
    if (!isPlayerHazard(entry)) continue;
    if (next >= tracker.hazards.length) tracker.hazards.push({ progress: 0, ref: null });
    tracker.hazards[next].ref = entry;
    tracker.hazards[next].progress = entry.progress;
    next += 1;
  }
  return next;
};

const snapshotHazards = (tracker, race) => {
  const count = recordHazards(tracker, race.fishBones, recordHazards(tracker, race.projectiles, 0));
  for (let index = count; index < tracker.hazardCount; index += 1) tracker.hazards[index].ref = null;
  tracker.hazardCount = count;
};

const snapshot = (tracker, race) => {
  tracker.raceTime = race.raceTime || 0;
  tracker.spinTimer = race.spinTimer || 0;
  tracker.spinOuts = race.spinOuts || 0;
  tracker.wall = Boolean(race.wallContact);
  tracker.bumps = race.bumps || 0;
  tracker.wobbleTimer = race.wobbleTimer || 0;
  tracker.shieldActive = Boolean(race.shieldActive);
  tracker.shieldTimer = race.shieldTimer || 0;
  tracker.slapTimer = race.slapTimer || 0;
  tracker.avalancheBy = race.avalanche?.by ?? null;
  tracker.avalancheTarget = race.avalanche?.target ?? null;
  const rivals = race.rivals || [];
  tracker.rivalSpin.length = rivals.length;
  for (let index = 0; index < rivals.length; index += 1) tracker.rivalSpin[index] = rivals[index].spinTimer || 0;
  snapshotHazards(tracker, race);
};

// Was this rival's spin, which started this frame, the player's doing? Every
// branch is a cause the sim itself would name: the player's slap fish, a
// player-owned snowball/sardine/bone that vanished beside the rival, the
// player's penguin march (only the player can fire one), the player's
// avalanche landing on its target, or player contact (the rails pit manoeuvre
// spins rivals on a side swipe).
const playerCaused = (tracker, race, rival, { bumped, slapped, trackLength }) => {
  if (bumped || slapped) return true;
  const reach = JUICE.landedReach / Math.max(1, trackLength);
  for (let index = 0; index < tracker.hazardCount; index += 1) {
    const hazard = tracker.hazards[index];
    if (!hazard.ref) continue;
    const alive = race.projectiles?.includes(hazard.ref) || race.fishBones?.includes(hazard.ref);
    if (!alive && Math.abs(progressDelta(hazard.progress, rival.progress)) < reach) return true;
  }
  if (race.march && Math.abs(progressDelta(race.march.progress, rival.progress)) < reach) return true;
  return tracker.avalancheBy === 'player' && tracker.avalancheTarget === rival.name;
};

/**
 * Derive this frame's impact events from the race. Pure with respect to the
 * race (reads only) and allocation-free in steady state.
 *
 * @param {object} tracker  from createJuiceTracker
 * @param {object} race     the live race state, AFTER this frame's sim step
 * @param {object} options  { dt (seconds, presentation clock), trackLength }
 * @returns {Array<{kind, severity}>} tracker.events (reused — do not retain)
 */
export const detectJuiceEvents = (tracker, race, { dt = 0, trackLength = 1 } = {}) => {
  tracker.events.length = 0;
  if (!race) return tracker.events;
  // A restart Object.assigns a fresh race over the old one, so every counter
  // goes backwards at once. Re-sync rather than read that as events.
  const restarted = (race.raceTime || 0) + 0.25 < tracker.raceTime || (tracker.finished && !race.finished);
  if (!tracker.ready || restarted) {
    tracker.ready = true;
    tracker.finished = Boolean(race.finished);
    tracker.wallClear = 99;
    snapshot(tracker, race);
    return tracker.events;
  }

  if (race.finished) {
    if (!tracker.finished) {
      tracker.finished = true;
      pushEvent(tracker, 'finish', 1);
    }
    snapshot(tracker, race);
    return tracker.events;
  }

  // ---- The player taking a hit ----------------------------------------------
  let spun = false;
  if ((race.spinTimer || 0) > tracker.spinTimer + 0.01) {
    spun = true;
    // spinOuts only counts real hits (items, contact spins, crossers, a failed
    // shortcut landing). A spin without one is the rocket-start flood: the
    // player's own mistake at walking pace, so a nudge rather than a hit.
    pushEvent(tracker, (race.spinOuts || 0) > tracker.spinOuts ? 'spin' : 'flood', 1);
  }
  // The shield eating a hit: it went down with life left on its clock (expiry
  // runs the clock to zero first, so an expired shield is not an impact).
  if (tracker.shieldActive && !race.shieldActive && tracker.shieldTimer > 0.1) {
    pushEvent(tracker, 'shield', 1);
  }

  const wall = Boolean(race.wallContact);
  if (wall && !tracker.wall && tracker.wallClear >= JUICE.wallFreshGap && !spun) {
    const impact = clamp01(
      ((race.speed || 0) - JUICE.wallSpeedFloor) / (JUICE.wallSpeedFull - JUICE.wallSpeedFloor)
    );
    pushEvent(tracker, 'wall', 0.3 + 0.7 * impact);
  }
  tracker.wallClear = wall ? 0 : tracker.wallClear + dt;

  const bumped = (race.bumps || 0) > tracker.bumps;
  if (bumped && !spun) {
    // The wobble tier is the hard-but-not-spinning contact; a shield up means
    // the shove never landed.
    const wobble = (race.wobbleTimer || 0) > tracker.wobbleTimer + 0.01;
    pushEvent(tracker, 'bump', race.shieldActive ? 0.4 : wobble ? 1 : 0.6);
  }

  // ---- The player landing a hit -----------------------------------------------
  const rivals = race.rivals || [];
  const slapped = (race.slapTimer || 0) > tracker.slapTimer + 0.01;
  let landed = 0;
  for (let index = 0; index < rivals.length; index += 1) {
    const rival = rivals[index];
    const before = index < tracker.rivalSpin.length ? tracker.rivalSpin[index] : 0;
    if ((rival.spinTimer || 0) > before + 0.01 && playerCaused(tracker, race, rival, { bumped, slapped, trackLength })) {
      landed += 1;
    }
  }
  if (landed > 0) pushEvent(tracker, 'landed', landed > 1 ? 1 : 0.75);

  snapshot(tracker, race);
  return tracker.events;
};

const prefersReducedMotion = () => {
  try {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return false;
  }
};

/**
 * The runtime half: detection plus the three channels. One per race effect.
 *
 *   cameraFeel     chase camera feel state (createChaseFeelState)
 *   getOverlay     () => the edge-flash element, or null
 *   getHitMarker   () => the HIT! marker element, or null
 *   haptics        bool — touch sessions outside autoplay/capture only
 *   reducedMotion  the race's reducedMotion prop (the OS setting is read too)
 */
export const createRaceJuice = ({
  cameraFeel = null,
  getHitMarker = () => null,
  getOverlay = () => null,
  haptics = false,
  reducedMotion = false,
} = {}) => {
  const tracker = createJuiceTracker();
  const reduced = Boolean(reducedMotion) || prefersReducedMotion();
  // Published for capture scripts and smokes (same spirit as
  // __g3ParticlesDebug): what fired, how often, and how hard.
  const debug = {
    counts: { bump: 0, finish: 0, flood: 0, landed: 0, shield: 0, spin: 0, wall: 0 },
    last: null,
  };
  let flashAnimation = null;
  let flashStartedAt = 0;
  let flashPeak = 0;
  let flashMs = 1;

  const flash = (kind, severity) => {
    const overlay = getOverlay();
    if (!overlay || typeof overlay.animate !== 'function') return;
    let peak = (JUICE.flash[kind] || 0) * severity;
    let duration = JUICE.flashMs[kind] || 300;
    if (kind === 'wall' && severity < JUICE.wallFlashFloor) peak = 0;
    if (reduced) {
      peak *= JUICE.reducedFlash;
      duration *= JUICE.reducedFlashMs;
    }
    if (!(peak > 0.02)) return;
    const now = performance.now();
    // A weaker flash never cuts a stronger one short.
    const remaining = flashAnimation ? flashPeak * (1 - (now - flashStartedAt) / flashMs) : 0;
    if (remaining > peak) return;
    flashAnimation?.cancel();
    overlay.dataset.impact = kind;
    flashPeak = peak;
    flashMs = duration;
    flashStartedAt = now;
    try {
      flashAnimation = overlay.animate(
        [
          { opacity: peak, offset: 0 },
          { easing: 'cubic-bezier(0.3, 0.55, 0.4, 1)', opacity: peak, offset: JUICE.flashHold },
          { opacity: 0, offset: 1 },
        ],
        { duration }
      );
      flashAnimation.onfinish = () => {
        flashAnimation = null;
      };
    } catch {
      flashAnimation = null;
    }
  };

  // HIT! confirmation for a landed hit: pops, holds, lifts away. Transform and
  // opacity only. Reduced motion keeps the word and drops the pop.
  let markerAnimation = null;
  const markHit = (severity) => {
    const marker = getHitMarker();
    if (!marker || typeof marker.animate !== 'function') return;
    marker.textContent = severity >= 1 ? 'Double hit!' : 'Hit!';
    markerAnimation?.cancel();
    const at = (scale, lift = 0) => `translate(-50%, ${lift}px) scale(${reduced ? 1 : scale})`;
    try {
      markerAnimation = marker.animate(
        [
          { opacity: 0, transform: at(0.55) },
          { opacity: 1, transform: at(1.16), offset: 0.16 },
          { opacity: 1, transform: at(1), offset: 0.3 },
          { opacity: 1, transform: at(1), offset: 0.74 },
          { opacity: 0, transform: at(0.96, reduced ? 0 : -12) },
        ],
        { duration: JUICE.hitMarkerMs, easing: 'ease-out' }
      );
    } catch {
      markerAnimation = null;
    }
  };

  const fire = (kind, severity) => {
    const kick = (JUICE.kick[kind] || 0) * severity;
    if (!reduced && kick > 0 && cameraFeel) impulseChaseKick(cameraFeel, kick);
    flash(kind, severity);
    if (kind === 'landed') markHit(severity);
    if (haptics) hapticForImpact(kind, severity);
  };
  // QA: fire one event's presentation on demand (camera + flash + haptic, no
  // sim) so a capture can photograph each accent deterministically instead of
  // hunting for a live hit inside a screenshot round-trip.
  debug.preview = (kind, severity = 1) => fire(kind, severity);

  const update = (race, dt, trackLength) => {
    const events = detectJuiceEvents(tracker, race, { dt, trackLength });
    for (let index = 0; index < events.length; index += 1) {
      const { kind, severity } = events[index];
      debug.counts[kind] = (debug.counts[kind] || 0) + 1;
      debug.last = { at: race.raceTime, kind, severity: Number(severity.toFixed(2)) };
      fire(kind, severity);
    }
  };

  return {
    debug,
    dispose() {
      flashAnimation?.cancel();
      flashAnimation = null;
      markerAnimation?.cancel();
      markerAnimation = null;
    },
    update,
  };
};
