export const RACE_RELEVANT_KEY_CODES = [
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'KeyA',
  'KeyC',
  'KeyD',
  'KeyE',
  'KeyF',
  'KeyQ',
  'KeyR',
  'KeyS',
  'KeyV',
  'KeyW',
  'KeyX',
  'KeyZ',
  'ShiftLeft',
  'ShiftRight',
  'Space',
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const defaultRaceTouchControls = () => ({
  brake: 0,
  drift: false,
  jump: false,
  steer: 0,
  throttle: 0,
});

export const resolveRaceControls = ({
  jumpQueued = false,
  keys = new Set(),
  playtest = {},
  playtestControlsFor = null,
  touch = defaultRaceTouchControls(),
  visualStats = {},
} = {}) => {
  const keySet = typeof keys.has === 'function' ? keys : new Set(keys || []);
  const playtestControls =
    typeof playtestControlsFor === 'function' ? playtestControlsFor({ playtest, visualStats }) : null;
  if (playtestControls) return playtestControls;

  const steer =
    (keySet.has('ArrowLeft') ? -1 : 0) +
    (keySet.has('ArrowRight') ? 1 : 0) +
    (keySet.has('KeyA') ? -1 : 0) +
    (keySet.has('KeyD') ? 1 : 0) +
    (touch.steer || 0);
  const throttle = keySet.has('ArrowUp') || keySet.has('KeyW') || (touch.throttle || 0) > 0 ? 1 : 0;
  const brake = keySet.has('ArrowDown') || keySet.has('KeyS') || (touch.brake || 0) > 0 ? 1 : 0;
  const drift = keySet.has('Space') || keySet.has('ShiftLeft') || keySet.has('ShiftRight') || Boolean(touch.drift);
  const jump = jumpQueued || keySet.has('Space') || Boolean(touch.jump);

  return {
    brake,
    drift,
    jump,
    steer: clamp(steer, -1, 1),
    throttle: throttle - brake * 0.9,
  };
};

export const handleRaceCommand = ({ actions = {}, command } = {}) => {
  if (!command?.id) {
    return {
      handled: false,
      type: null,
    };
  }

  if (command.type === 'boost' || command.type === 'shield' || command.type === 'rocket') {
    return {
      handled: Boolean(actions.useBankedItem?.(command.type)),
      type: command.type,
    };
  }
  if (command.type === 'item') {
    return {
      handled: Boolean(actions.useHeldBalloon?.()),
      type: command.type,
    };
  }
  if (command.type === 'upgrade-tier') {
    return {
      handled: Boolean(actions.upgradeHeldItem?.()?.upgraded),
      type: command.type,
    };
  }
  if (command.type === 'upgrade-rare') {
    return {
      handled: Boolean(actions.buyRareNextPickup?.()?.bought),
      type: command.type,
    };
  }
  if (command.type === 'upgrade-double') {
    return {
      handled: Boolean(actions.buyDoubleSlot?.()?.bought),
      type: command.type,
    };
  }
  if (command.type === 'vehicle') {
    return {
      handled: Boolean(actions.cycleVehicle?.()),
      type: command.type,
    };
  }
  if (command.type === 'reset') {
    return {
      handled: Boolean(actions.resetPlayer?.()),
      type: command.type,
    };
  }

  return {
    handled: false,
    type: command.type,
  };
};

export const consumeRaceKeyCommands = ({ actions = {}, keys } = {}) => {
  if (!keys || typeof keys.has !== 'function') return [];

  const commands = [
    ['KeyF', () => actions.useHeldBalloon?.()],
    ['KeyC', () => actions.cycleVehicle?.()],
    ['KeyQ', () => actions.useBankedItem?.('boost')],
    ['KeyE', () => actions.useBankedItem?.('shield')],
    ['KeyR', () => actions.useBankedItem?.('rocket')],
    ['KeyZ', () => actions.upgradeHeldItem?.()],
    ['KeyX', () => actions.buyRareNextPickup?.()],
    ['KeyV', () => actions.buyDoubleSlot?.()],
  ];

  return commands.reduce((consumed, [keyCode, run]) => {
    if (!keys.has(keyCode)) return consumed;
    const result = run();
    keys.delete(keyCode);
    consumed.push({
      keyCode,
      result,
    });
    return consumed;
  }, []);
};

export const processRaceCommandFrame = ({
  actions = {},
  commandState = {},
  externalCommand = null,
  keys = null,
  localCommand = null,
} = {}) => {
  let externalCommandResult = null;
  if (externalCommand?.id && externalCommand.id !== commandState.lastExternalCommandId) {
    commandState.lastExternalCommandId = externalCommand.id;
    externalCommandResult = handleRaceCommand({
      actions,
      command: externalCommand,
    });
  }

  let localCommandResult = null;
  if (localCommand?.id && localCommand.id !== commandState.lastLocalCommandId) {
    commandState.lastLocalCommandId = localCommand.id;
    localCommandResult = handleRaceCommand({
      actions,
      command: localCommand,
    });
  }

  const keyCommandResults = consumeRaceKeyCommands({ actions, keys });

  return {
    commandState,
    externalCommandResult,
    keyCommandResults,
    localCommandResult,
  };
};

export const applyRaceKeyDown = ({
  event,
  jumpQueued = false,
  keys,
  relevantKeys = RACE_RELEVANT_KEY_CODES,
} = {}) => {
  const relevantKeySet =
    typeof relevantKeys?.has === 'function' ? relevantKeys : new Set(relevantKeys || []);
  if (!event?.code || !keys || typeof keys.has !== 'function' || !relevantKeySet.has(event.code)) {
    return {
      handled: false,
      jumpQueued,
      keyCode: event?.code || null,
    };
  }

  event.preventDefault?.();
  const nextJumpQueued = event.code === 'Space' && !keys.has('Space') ? true : jumpQueued;
  keys.add(event.code);
  return {
    handled: true,
    jumpQueued: nextJumpQueued,
    keyCode: event.code,
  };
};

export const applyRaceKeyUp = ({
  event,
  keys,
  relevantKeys = RACE_RELEVANT_KEY_CODES,
} = {}) => {
  const relevantKeySet =
    typeof relevantKeys?.has === 'function' ? relevantKeys : new Set(relevantKeys || []);
  if (!event?.code || !keys || typeof keys.delete !== 'function' || !relevantKeySet.has(event.code)) {
    return {
      handled: false,
      keyCode: event?.code || null,
    };
  }

  event.preventDefault?.();
  keys.delete(event.code);
  return {
    handled: true,
    keyCode: event.code,
  };
};

export const applyRaceTouchPatch = ({
  capture = 'set',
  event,
  patch = {},
  touch,
} = {}) => {
  event?.preventDefault?.();
  if (touch) Object.assign(touch, patch);
  if (capture === 'release') event?.currentTarget?.releasePointerCapture?.(event.pointerId);
  else event?.currentTarget?.setPointerCapture?.(event.pointerId);
  return touch;
};
