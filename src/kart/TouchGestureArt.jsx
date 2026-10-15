// Gesture pictures for the touch half of the How-to-Race guide (KartApp →
// KartIntroScreen). Plain shapes only — a neutral thumb, arrows, and the
// race's own steering ring and puck. Standing art rule: no penguins, or any
// other character, in UI illustration.
//
// The ring and puck copy .three-kart-race__steer-indicator / __joystick-puck
// (comebackCityThreeKartRace.css): cyan while you steer, gold once a flick has
// started a drift. What the guide draws is what appears under the thumb.

const INK = '#0a0f1d';
const CYAN = '#38d7ff';
const GOLD = '#ffd34f';
const LINE = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };

// A left thumb seen from behind (nail up). Its tip sits on (x, y) and the body
// runs down-left out of the frame: the steering side is the left of the screen.
const Thumb = ({ x, y }) => (
  <g transform={`translate(${x} ${y}) rotate(24)`}>
    <rect fill="#000" fillOpacity="0.35" height="72" rx="10" width="20" x="-8" y="0" />
    <rect fill="#dfe6f1" height="72" rx="10" stroke={INK} strokeWidth="1.6" width="20" x="-10" y="-3" />
    <rect fill="#fff" height="15" rx="6" stroke={INK} strokeOpacity="0.3" width="13" x="-6.5" y="0" />
    <path d="M-6 31q6 3.5 12 0" stroke={INK} strokeOpacity="0.3" strokeWidth="1.2" {...LINE} />
  </g>
);

// The steering ring with its puck pushed `slide` units off centre.
const Stick = ({ color, slide, x, y }) => (
  <>
    <circle cx={x} cy={y} fill="#0c101d" fillOpacity="0.6" r="24" stroke={color} strokeOpacity="0.55" strokeWidth="1.5" />
    <circle cx={x + slide} cy={y} fill={color} fillOpacity="0.22" r="17" />
    <circle cx={x + slide} cy={y} fill={color} fillOpacity="0.9" r="13" />
  </>
);

export const GestureArt = ({ kind }) => (
  <svg aria-hidden="true" className="h-full w-full" focusable="false" viewBox="0 0 120 84">
    {kind === 'drag' ? (
      <>
        <Stick color={CYAN} slide={12} x={60} y={38} />
        <path d="M21 29l-9 9 9 9M99 29l9 9-9 9" stroke={GOLD} strokeWidth="3" {...LINE} />
        <Thumb x={72} y={38} />
      </>
    ) : kind === 'flick' ? (
      <>
        <Stick color={GOLD} slide={16} x={56} y={36} />
        {/* Speed streaks for the flick, then the spark ladder it charges. */}
        <path d="M14 36h30M22 27h18M22 45h18" stroke={GOLD} strokeOpacity="0.75" strokeWidth="2.5" {...LINE} />
        <path d="M96 27l9 9-9 9" stroke={GOLD} strokeWidth="3" {...LINE} />
        <circle cx="88" cy="72" fill="#00e5ff" r="3" />
        <circle cx="99" cy="72" fill={GOLD} r="4" />
        <circle cx="111" cy="72" fill="#c879ff" r="5" />
        <Thumb x={72} y={36} />
      </>
    ) : (
      <>
        <circle cx="44" cy="46" fill="none" r="22" stroke={CYAN} strokeOpacity="0.3" strokeWidth="1.5" />
        <circle cx="44" cy="46" fill="none" r="14" stroke={CYAN} strokeOpacity="0.7" strokeWidth="2" />
        <path d="M60 30q18-24 36-12" stroke={GOLD} strokeDasharray="4 5" strokeWidth="2.5" {...LINE} />
        <circle cx="103" cy="21" fill="#e8f6ff" r="7" stroke="#9fdcff" strokeWidth="1.5" />
        <Thumb x={44} y={46} />
      </>
    )}
  </svg>
);

// Tips-list glyph: a ramp with the jump leaving its lip (tricks, dare ramp).
export const RampGlyph = () => (
  <svg aria-hidden="true" focusable="false" height="18" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="18" {...LINE}>
    <path d="M2 20h12v-8zM15 10c2-5 6-6 7 0" />
  </svg>
);
