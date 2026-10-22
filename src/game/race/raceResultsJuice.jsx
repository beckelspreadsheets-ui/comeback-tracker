// Finish + results presentation for the kart race (juice pass).
//
// Cosmetic only: everything here reads the frozen finish snapshot (the sim
// stops at the flag, so raceTime, position and standings never change under
// it) and nothing writes back. The monolith keeps the results markup and every
// hook the proof scripts assert on; this file holds the parts that animate.
import { memo, useLayoutEffect, useRef } from 'react';

// How long the flag moment owns the screen before the results panel reveals.
// Long enough for the place banner to land and the first two confetti waves to
// fall through the frame; short enough that a player reaching for "Race again"
// is not kept waiting. The panel itself MOUNTS at the flag (the playable proof
// asserts .three-kart-race__results the moment telemetry says finished) and is
// only held invisible until then.
export const FINISH_BANNER_MS = 1600;
// When the hidden panel starts PAINTING (still invisible) under the banner: after
// the slam has landed (the banner settles at ~420 ms), well before the reveal.
// Painting it in the reveal frame cost a one-off 250-680 ms hitch on the phone
// tier; painting it in the flag frame piled it onto the banner, the confetti
// and the flash. Mid-banner is the quiet moment.
export const FINISH_WARM_MS = 650;
const COUNT_UP_MS = 950;

export const prefersReducedMotion = () => {
  try {
    return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return false;
  }
};

// Podium metal for the badge, the banner and the standings: the CSS keys every
// colour off this one attribute, so the JSX never picks a colour.
export const placeTier = (place, timeTrial = false, record = false) => {
  if (timeTrial) return record ? 'gold' : 'field';
  if (place === 1) return 'gold';
  if (place === 2) return 'silver';
  if (place === 3) return 'bronze';
  return 'field';
};

// '1st' -> ['1', 'st'], so the badge can set the suffix small.
export const splitOrdinal = (label = '') => {
  const match = /^(\d+)(\D*)$/.exec(String(label));
  return match ? [match[1], match[2]] : [String(label), ''];
};

/**
 * The race time, counted up from zero when the panel reveals. Written straight
 * into the text node on its own rAF rather than through React state: the race
 * component republishes its snapshot EVERY frame after the flag, and a
 * count-up held in state would be one more full re-render per frame on the
 * phone tier at exactly the moment it is busiest. memo + a frozen `seconds`
 * means React never touches the node again after mount, and the effect always
 * leaves the final value in it.
 */
export const ResultsTime = memo(({ active, format, reducedMotion, seconds }) => {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const text = ref.current?.firstChild;
    if (!text) return undefined;
    const final = format(seconds);
    if (!active || reducedMotion || prefersReducedMotion() || !(seconds > 0)) {
      text.nodeValue = final;
      return undefined;
    }
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - startedAt) / COUNT_UP_MS);
      // Ease-out cubic: the digits race, then settle onto the real time.
      text.nodeValue = t >= 1 ? final : format(seconds * (1 - (1 - t) ** 3));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    text.nodeValue = format(0);
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      text.nodeValue = final;
    };
  }, [active, format, reducedMotion, seconds]);
  return <strong ref={ref}>{format(seconds)}</strong>;
});
ResultsTime.displayName = 'ResultsTime';

/**
 * The flag moment: "1ST!" slammed over the frame in the place's metal while
 * the confetti falls, before the results panel takes the screen. Decorative —
 * the same place is in the results panel and the position plate — so it is
 * aria-hidden and never takes a pointer.
 */
export const FinishBanner = ({ label, place, record = false, timeTrial = false }) => {
  const tier = placeTier(place, timeTrial, record);
  const text = timeTrial ? (record ? 'New record!' : 'Finish!') : tier === 'field' ? label : `${label}!`;
  return (
    <div aria-hidden="true" className="three-kart-race__finish-banner" data-place-tier={tier} data-testid="race-finish-banner">
      <span className="three-kart-race__finish-banner-eyebrow">{timeTrial ? 'Time trial' : 'Finish'}</span>
      <strong className="three-kart-race__finish-banner-place">{text}</strong>
    </div>
  );
};
