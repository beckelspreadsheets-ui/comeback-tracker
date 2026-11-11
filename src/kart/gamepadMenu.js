// Controller navigation for the menus (audit 2026-11-09: a controller could
// drive the kart but not reach Start). D-pad or left stick moves a focus ring
// between buttons and links by position on screen; A / Cross presses the
// focused one; Start / Options presses the screen's main button.
//
// The picking rule is a pure function so plain Node can test it
// (scripts/test-kart-gamepad-input.mjs).

const STICK = 0.55;
const FIRST_REPEAT_MS = 380;
const REPEAT_MS = 150;

// rects: [{ x, y }] centres. dir: 'up' | 'down' | 'left' | 'right'.
// Returns the index of the nearest centre lying in that direction, or -1.
export const nextFocusIndex = (rects, current, dir) => {
  const from = rects[current];
  if (!from) return rects.length ? 0 : -1;
  const horizontal = dir === 'left' || dir === 'right';
  const sign = dir === 'right' || dir === 'down' ? 1 : -1;
  let best = -1;
  let bestScore = Infinity;
  rects.forEach((rect, index) => {
    if (index === current) return;
    const along = ((horizontal ? rect.x - from.x : rect.y - from.y)) * sign;
    const across = Math.abs(horizontal ? rect.y - from.y : rect.x - from.x);
    // Must really be in that direction: a control that is mostly off to the
    // side (a neighbour a few pixels lower) is not "down".
    if (along < 6 || along < across * 0.35) return;
    const score = along + across * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return best;
};

const readPad = () => {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
  let pads;
  try {
    pads = navigator.getGamepads();
  } catch {
    return null;
  }
  for (let i = 0; i < pads.length; i += 1) {
    const pad = pads[i];
    if (!pad || !pad.connected || pad.mapping !== 'standard') continue;
    const down = (index) => Boolean(pad.buttons[index]?.pressed);
    const x = pad.axes[0] ?? 0;
    const y = pad.axes[1] ?? 0;
    const dir = down(12) || y < -STICK ? 'up' : down(13) || y > STICK ? 'down' : down(14) || x < -STICK ? 'left' : down(15) || x > STICK ? 'right' : null;
    if (dir || down(0) || down(9)) return { confirm: down(0), dir, start: down(9) };
  }
  return { confirm: false, dir: null, start: false };
};

const FOCUSABLE = 'button:not([disabled]), a[href], select, input:not([disabled])';
const STYLE_ID = 'kart-pad-focus-style';

// getScope() returns the element whose controls the pad may reach right now,
// or null while the pad belongs to the race. mainSelector is what Start
// presses. skipSelector leaves a control out of the d-pad walk: the setup
// screen's Start is pinned to the viewport, so its position says nothing about
// where it sits among the scrolling controls (Start on the pad reaches it).
export const startGamepadMenu = ({ getScope, mainSelector = null, skipSelector = null }) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = '[data-pad-focus="1"]{outline:3px solid #ffd54a !important;outline-offset:3px;border-radius:12px}';
    document.head.appendChild(style);
  }
  let raf = 0;
  let stopped = false;
  let focused = null;
  let heldDir = null;
  let nextRepeatAt = 0;
  // Start as "held" so a button still down from the race (A on the gas when
  // the results appear) cannot press a menu button on the first frame.
  let confirmWasDown = true;
  let startWasDown = true;
  const clear = () => {
    focused?.removeAttribute('data-pad-focus');
    focused = null;
  };
  const setFocus = (element) => {
    clear();
    focused = element;
    element.setAttribute('data-pad-focus', '1');
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
  };
  const candidates = (scope) =>
    [...scope.querySelectorAll(FOCUSABLE)].filter((element) => {
      const rect = element.getBoundingClientRect();
      if (skipSelector && element.matches(skipSelector)) return false;
      return rect.width > 0 && rect.height > 0 && window.getComputedStyle(element).visibility !== 'hidden';
    });
  const move = (scope, dir) => {
    const list = candidates(scope);
    if (!list.length) return;
    const current = focused && scope.contains(focused) ? list.indexOf(focused) : -1;
    if (current < 0) {
      // First press: start on the main button if it is on screen, else on
      // the first control inside the viewport.
      const main = mainSelector ? scope.querySelector(mainSelector) : null;
      const inView = list.find((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= window.innerHeight;
      });
      setFocus(main && list.includes(main) ? main : inView || list[0]);
      return;
    }
    const centres = list.map((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    const next = nextFocusIndex(centres, current, dir);
    if (next >= 0) setFocus(list[next]);
  };
  const tick = () => {
    if (stopped) return;
    raf = window.requestAnimationFrame(tick);
    const pad = readPad();
    const scope = pad ? getScope() : null;
    if (!pad || !scope) {
      if (focused && (!scope || !scope.contains(focused))) clear();
      heldDir = null;
      confirmWasDown = true;
      startWasDown = true;
      return;
    }
    if (focused && !scope.contains(focused)) clear();
    const now = performance.now();
    if (pad.dir !== heldDir) {
      heldDir = pad.dir;
      nextRepeatAt = now + FIRST_REPEAT_MS;
      if (pad.dir) move(scope, pad.dir);
    } else if (pad.dir && now >= nextRepeatAt) {
      nextRepeatAt = now + REPEAT_MS;
      move(scope, pad.dir);
    }
    if (pad.confirm && !confirmWasDown && focused && scope.contains(focused)) focused.click();
    confirmWasDown = pad.confirm;
    if (pad.start && !startWasDown && mainSelector) scope.querySelector(mainSelector)?.click();
    startWasDown = pad.start;
  };
  raf = window.requestAnimationFrame(tick);
  return () => {
    stopped = true;
    window.cancelAnimationFrame(raf);
    clear();
  };
};
