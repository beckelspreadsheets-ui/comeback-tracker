// Gamepad support (standard mapping — Xbox, PlayStation, MFi, Switch Pro on
// modern browsers and iOS WebKit). Polled once per frame; the result is OR-ed
// over the keyboard/touch input, so any device can drive at any moment.
//
//   steer   left stick X (dead-zoned) or d-pad left/right
//   gas     A / Cross, or right trigger
//   brake   B / Circle, or left trigger
//   drift   right bumper, or X / Square
//   item    left bumper, or Y / Triangle
//   pause   Start / Options (edge-triggered by the caller)
const DEAD_ZONE = 0.18;
const pressed = (pad, index) => Boolean(pad.buttons[index]?.pressed);
const trigger = (pad, index) => (pad.buttons[index]?.value ?? 0) > 0.35;

export const pollGamepad = () => {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
  const pads = navigator.getGamepads();
  for (let i = 0; i < pads.length; i += 1) {
    const pad = pads[i];
    if (!pad || !pad.connected || pad.mapping !== 'standard') continue;
    const stick = pad.axes[0] ?? 0;
    const dpad = (pressed(pad, 15) ? 1 : 0) - (pressed(pad, 14) ? 1 : 0);
    const steerAxis = Math.abs(stick) > DEAD_ZONE ? Math.sign(stick) * ((Math.abs(stick) - DEAD_ZONE) / (1 - DEAD_ZONE)) : dpad || null;
    const state = {
      brake: pressed(pad, 1) || trigger(pad, 6),
      drift: pressed(pad, 5) || pressed(pad, 2),
      item: pressed(pad, 4) || pressed(pad, 3),
      pause: pressed(pad, 9),
      steerAxis,
      throttle: pressed(pad, 0) || trigger(pad, 7),
    };
    const active = state.brake || state.drift || state.item || state.pause || state.throttle || steerAxis !== null;
    return { ...state, active };
  }
  return null;
};

// Merge a polled pad over the live keyboard/touch input object.
export const mergeGamepadInput = (input, pad) => {
  if (!pad) return input;
  return {
    ...input,
    brake: input.brake || pad.brake,
    drift: input.drift || pad.drift,
    item: input.item || pad.item,
    steerAxis: pad.steerAxis ?? input.steerAxis,
    throttle: input.throttle || pad.throttle,
  };
};
