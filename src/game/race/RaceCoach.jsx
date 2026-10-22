// First-race coaching prompt for the 3D kart race HUD. The rules live in
// ./coaching.js (pure, node-tested); this file owns what needs a browser: the
// autoplay/webdriver/?coach=1 gate, localStorage, which input device is in
// use, reading the track off the engine's sampler, and the fade.
//
// Fed by the parent's HUD snapshot (~7 Hz), so it costs one small effect per
// snapshot and nothing per frame. Renders NOTHING when disabled, which keeps
// every existing smoke suite (webdriver, no ?coach=1) blind to it.
import { useEffect, useRef, useState } from 'react';
import { ChevronsUp, Sparkles, Zap } from 'lucide-react';
import { pollGamepad } from './gamepadInput.js';
import {
  coachEligible,
  coachEnabled,
  coachLeadUnits,
  coachMessage,
  coachScheme,
  coachStartProgress,
  cornerWindowAt,
  createCoachRace,
  findCorners,
  freshCoachMemory,
  padWindowAt,
  readCoachMemory,
  stepCoachRace,
  writeCoachMemory,
} from './coaching.js';

const FADE_OUT_MS = 240;

const deviceStorage = () => {
  try {
    return window.localStorage || null;
  } catch {
    return null; // WebKit throws on access with site data blocked
  }
};

const readGate = (autoplay) => {
  if (typeof window === 'undefined') return { enabled: false, forced: false };
  let forced = false;
  try {
    forced = new URLSearchParams(window.location.search).get('coach') === '1';
  } catch {
    forced = false;
  }
  return { enabled: coachEnabled({ autoplay, forced, webdriver: Boolean(window.navigator?.webdriver) }), forced };
};

const sameView = (a, b) =>
  a === b || (a && b && a.id === b.id && a.key === b.key && a.scheme === b.scheme && a.heldItem === b.heldItem);

const CoachPlate = ({ ItemIcon, leaving = false, projectileSkin, view }) => {
  const message = coachMessage(view.id, view.scheme, { heldItem: view.heldItem, projectileSkin });
  if (!message) return null;
  const glyph =
    view.id === 'item' && ItemIcon && view.heldItem ? (
      <ItemIcon heldItem={view.heldItem} projectileSkin={projectileSkin} size={26} />
    ) : view.id === 'drift' ? (
      <Sparkles size={18} />
    ) : view.id === 'pad' ? (
      <ChevronsUp size={20} />
    ) : (
      <Zap size={18} />
    );
  return (
    <div
      aria-hidden={leaving ? 'true' : undefined}
      className="three-kart-race__coach-plate"
      data-coach-leaving={leaving ? 'true' : undefined}
      data-coach-tone={view.id === 'drift' ? 'drift' : 'boost'}
    >
      <span aria-hidden="true" className="three-kart-race__coach-glyph">
        {glyph}
      </span>
      <span className="three-kart-race__coach-copy">
        <span aria-hidden="true" className="three-kart-race__coach-eyebrow">
          Tip
        </span>
        <span className="three-kart-race__coach-text">
          {message.parts.map((part, index) =>
            typeof part === 'string' ? (
              <span key={index}>{part}</span>
            ) : (
              <kbd className="three-kart-race__coach-key" key={index}>
                {part.key}
              </kbd>
            )
          )}
        </span>
      </span>
    </div>
  );
};

export const RaceCoach = ({
  autoplay = false,
  engineRef = null,
  ItemIcon = null,
  projectileSkin = null,
  reducedMotion = false,
  snapshot = null,
  touchControls = false,
  trackDef = null,
}) => {
  // Resolved once per mount: a race never changes its own URL or driver.
  const [gate] = useState(() => readGate(autoplay));
  const memoryRef = useRef(null);
  const raceRef = useRef(null);
  const cornersRef = useRef({ corners: [], sampler: null });
  const deviceRef = useRef(null);
  const [view, setView] = useState(null);
  const [leaving, setLeaving] = useState(null);
  const shownRef = useRef(null);
  const leavingTimerRef = useRef(0);

  // Last input device: a key or a pointer hands the wording back to the
  // session's own scheme (touch or keyboard); a pad takes it while in use.
  useEffect(() => {
    if (!gate.enabled) return undefined;
    const onKey = () => {
      deviceRef.current = 'keys';
    };
    const onPointer = () => {
      deviceRef.current = 'pointer';
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointer, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointer, true);
    };
  }, [gate.enabled]);

  useEffect(() => {
    if (!gate.enabled || !snapshot) return;
    if (!memoryRef.current) memoryRef.current = gate.forced ? freshCoachMemory() : readCoachMemory(deviceStorage());
    let race = raceRef.current;
    // A new race: first snapshot, or a restart (pause menu / "Race again"
    // rewinds the countdown without remounting). ?coach=1 starts every race
    // from a clean record so QA and the screenshots are repeatable.
    if (!race || (snapshot.countdown > 0 && race.phase !== 'grid')) {
      race = createCoachRace(gate.forced ? freshCoachMemory() : memoryRef.current);
      raceRef.current = race;
    }
    // The sampler is the engine's, so the corners are the ones being driven.
    // Scanned once per engine (a few ms, during the countdown) and only while
    // the drift prompt can still appear.
    const sampler = engineRef?.current?.sampler || null;
    const length = sampler?.length || 0;
    let corner = null;
    if (sampler && coachEligible(race, 'drift')) {
      if (cornersRef.current.sampler !== sampler) {
        cornersRef.current = {
          corners: findCorners({
            length,
            startProgress: coachStartProgress(trackDef),
            tangentAt: (progress) => sampler.pointAt(progress).tangent,
          }),
          sampler,
        };
      }
      corner = cornerWindowAt(cornersRef.current.corners, snapshot.progress, length, coachLeadUnits(snapshot.speed));
    }
    const pad =
      sampler && coachEligible(race, 'pad')
        ? padWindowAt(trackDef?.course?.boostPads, snapshot.progress, length, coachLeadUnits(snapshot.speed, 'pad'))
        : null;
    const { changed, prompt } = stepCoachRace(race, {
      boostHits: snapshot.boostHits,
      corner,
      countdown: snapshot.countdown,
      drift: snapshot.drift,
      driftTier: snapshot.driftTier ?? 0,
      finished: snapshot.finished,
      heldItem: snapshot.heldItem,
      lap: snapshot.lap,
      miniTurboTier: snapshot.miniTurboTier ?? 0,
      pad,
      raceTime: snapshot.raceTime,
      ttBoosts: snapshot.timeTrial ? snapshot.ttBoosts : null,
      wrongWay: snapshot.wrongWay,
    });
    if (changed && !gate.forced) writeCoachMemory(deviceStorage(), race.memory);
    if (pollGamepad()?.active) deviceRef.current = 'pad';
    const next = prompt
      ? {
          heldItem: snapshot.heldItem || null,
          id: prompt.id,
          key: prompt.key,
          scheme: coachScheme({ lastDevice: deviceRef.current, touch: touchControls }),
        }
      : null;
    setView((current) => (sameView(current, next) ? current : next));
    // Only the snapshot drives this; the other inputs are fixed per race.
  }, [snapshot]);

  // Fade-out copy of whatever just left the slot. The timer lives in a ref so
  // a quick in-out-in cannot strand a stale copy on screen.
  useEffect(() => {
    const previous = shownRef.current;
    shownRef.current = view;
    if (!previous || (view && view.id === previous.id && view.key === previous.key)) return;
    setLeaving(previous);
    window.clearTimeout(leavingTimerRef.current);
    leavingTimerRef.current = window.setTimeout(() => setLeaving(null), FADE_OUT_MS);
  }, [view]);
  useEffect(() => () => window.clearTimeout(leavingTimerRef.current), []);

  if (!gate.enabled) return null;
  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="three-kart-race__coach"
      data-coach-prompt={view?.id || 'none'}
      data-coach-scheme={view?.scheme || undefined}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-testid="race-coach"
      role="status"
    >
      {leaving && !(view && view.id === leaving.id && view.key === leaving.key) ? (
        <CoachPlate ItemIcon={ItemIcon} key={`out-${leaving.id}-${leaving.key}`} leaving projectileSkin={projectileSkin} view={leaving} />
      ) : null}
      {view ? (
        <CoachPlate ItemIcon={ItemIcon} key={`in-${view.id}-${view.key}`} projectileSkin={projectileSkin} view={view} />
      ) : null}
    </div>
  );
};
