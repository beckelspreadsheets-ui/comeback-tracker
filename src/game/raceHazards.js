export const HAZARD_EFFECTS = {
  blind: 'blind',
  boost: 'boost',
  controlFlip: 'control-flip',
  forceSwitch: 'force-switch',
  knockBack: 'knock-back',
  pull: 'pull',
  slow: 'slow',
  spin: 'spin',
};

export const HAZARD_TRIGGERS = {
  event: 'event',
  playerAction: 'player-action',
  proximity: 'proximity',
  timer: 'timer',
};

export const HAZARD_DEFINITIONS = [
  {
    type: 'wet',
    trigger: HAZARD_TRIGGERS.proximity,
    effect: HAZARD_EFFECTS.slow,
    vehicleFilter: 'kart',
    telegraph: 'water patch radius grows by lap',
  },
  {
    type: 'swing',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.spin,
    vehicleFilter: 'both',
    telegraph: 'moving obstacle arc',
  },
  {
    type: 'gate',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.spin,
    vehicleFilter: 'both',
    telegraph: 'open/closed gate phase',
  },
  {
    type: 'gust',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.knockBack,
    vehicleFilter: 'plane',
    telegraph: 'wind lane pulse',
  },
  {
    type: 'tremor',
    trigger: 'timer-or-event',
    effect: HAZARD_EFFECTS.spin,
    vehicleFilter: 'both',
    telegraph: 'shockwave ring',
  },
  {
    type: 'slam',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.spin,
    vehicleFilter: 'both',
    telegraph: 'closing slam zone',
  },
  {
    type: 'laser',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.spin,
    vehicleFilter: 'plane',
    telegraph: 'laser shutter phase',
  },
  {
    type: 'conveyor',
    trigger: HAZARD_TRIGGERS.proximity,
    effect: HAZARD_EFFECTS.knockBack,
    vehicleFilter: 'kart',
    telegraph: 'animated conveyor lane',
  },
  {
    type: 'gravity',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.knockBack,
    vehicleFilter: 'kart',
    telegraph: 'gravity well ring',
  },
  {
    type: 'fishCart',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.knockBack,
    vehicleFilter: 'kart',
    telegraph: 'cart rolls across the lane',
  },
  {
    type: 'laundry',
    trigger: HAZARD_TRIGGERS.proximity,
    effect: HAZARD_EFFECTS.blind,
    vehicleFilter: 'kart',
    telegraph: 'cloth line shadow',
  },
  {
    type: 'lighthouseBeam',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.blind,
    vehicleFilter: 'plane',
    telegraph: 'rotating beam cone',
  },
  {
    type: 'seagulls',
    trigger: 'timer-or-event',
    effect: HAZARD_EFFECTS.spin,
    vehicleFilter: 'plane',
    telegraph: 'flock shadow and calls',
  },
  {
    type: 'crabTrap',
    trigger: HAZARD_TRIGGERS.proximity,
    effect: HAZARD_EFFECTS.slow,
    vehicleFilter: 'kart',
    telegraph: 'trap cage on racing line',
  },
  {
    type: 'boatTraffic',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.knockBack,
    vehicleFilter: 'both',
    telegraph: 'boat horn before crossing',
  },
  {
    type: 'lightning',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.spin,
    vehicleFilter: 'both',
    telegraph: 'charge ring before strike',
  },
  {
    type: 'bridgeCollapse',
    trigger: 'timer-or-event',
    effect: HAZARD_EFFECTS.forceSwitch,
    vehicleFilter: 'kart',
    telegraph: 'rope bridge cracks and missing planks',
  },
  {
    type: 'tornado',
    trigger: HAZARD_TRIGGERS.proximity,
    effect: HAZARD_EFFECTS.pull,
    vehicleFilter: 'both',
    telegraph: 'spiral wind column',
  },
  {
    type: 'staticCharge',
    trigger: HAZARD_TRIGGERS.proximity,
    effect: 'switch-lock',
    vehicleFilter: 'both',
    telegraph: 'electric floor glow',
  },
  {
    type: 'windGust',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.knockBack,
    vehicleFilter: 'plane',
    telegraph: 'wind streaks',
  },
  {
    type: 'mineCart',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.knockBack,
    vehicleFilter: 'both',
    telegraph: 'rail crossing bell',
  },
  {
    type: 'magneticSpike',
    trigger: HAZARD_TRIGGERS.proximity,
    effect: HAZARD_EFFECTS.slow,
    vehicleFilter: 'kart',
    telegraph: 'sparking spike cluster',
  },
  {
    type: 'pulseZone',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.controlFlip,
    vehicleFilter: 'both',
    telegraph: 'purple pulse ring',
  },
  {
    type: 'polarityStrip',
    trigger: HAZARD_TRIGGERS.proximity,
    effect: 'set-polarity',
    vehicleFilter: 'kart',
    telegraph: 'rotating polarity strip',
  },
  {
    type: 'stalactite',
    trigger: HAZARD_TRIGGERS.timer,
    effect: HAZARD_EFFECTS.spin,
    vehicleFilter: 'both',
    telegraph: 'falling shadow',
  },
  {
    type: 'polarityGate',
    trigger: HAZARD_TRIGGERS.proximity,
    effect: 'polarity-check',
    vehicleFilter: 'both',
    telegraph: 'matching polarity lights',
  },
];

export const HAZARD_DEFINITION_BY_TYPE = new Map(HAZARD_DEFINITIONS.map((hazard) => [hazard.type, hazard]));
export const getHazardDefinition = (type) => HAZARD_DEFINITION_BY_TYPE.get(type) || null;

export const vehicleMatchesFilter = (vehicleMode, vehicleFilter = 'both') =>
  vehicleFilter === 'both' ||
  vehicleFilter === vehicleMode ||
  (vehicleFilter === 'kart' && vehicleMode === 'hover');

const coordinateFor = (position = {}, axis) => (Number.isFinite(position?.[axis]) ? position[axis] : 0);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrap01 = (value) => ((value % 1) + 1) % 1;

export const hazardCyclePhaseForTime = ({ cycle = 5, phase = 0, raceTime = 0 } = {}) => {
  if (!cycle) return 0;
  return wrap01(raceTime / cycle + phase);
};

export const hazardWindowOpenForTime = (hazard = {}, raceTime = 0) => {
  if (hazard.eventPulse > 0) return true;
  if (!hazard.cycle) return true;
  const phase = hazardCyclePhaseForTime({
    cycle: hazard.cycle,
    phase: hazard.phase || 0,
    raceTime,
  });
  return phase >= (hazard.openStart ?? 0.15) && phase <= (hazard.openEnd ?? 0.65);
};

export const trackHazardActiveForTime = (hazard = {}, raceTime = 0) =>
  hazard.eventPulse > 0 || (hazard.active !== false && hazardWindowOpenForTime(hazard, raceTime));

export const resolveRaceTrackHazardContactsForFrame = ({
  dt = 0,
  raceTime = 0,
  racers = [],
  trackHazards = [],
} = {}) => {
  const contacts = [];

  trackHazards.forEach((hazard) => {
    hazard.cooldown = Math.max(0, (hazard.cooldown || 0) - dt);
    hazard.eventPulse = Math.max(0, (hazard.eventPulse || 0) - dt);
    const active = trackHazardActiveForTime(hazard, raceTime);
    if (!active || hazard.cooldown > 0) return;

    racers.forEach((racer) => {
      if (!racer || racer.finished) return;
      const distance = distance2D(racer.position, hazard.position);
      const radius = hazard.radius || 8;
      if (distance < radius) {
        contacts.push({ distance, hazard, racer, radius });
        hazard.cooldown = Math.max(hazard.cooldown || 0, hazard.hitCooldown || 0.45);
      }
    });
  });

  return contacts;
};

export const resolveRaceTrackEventsForFrame = ({
  applyEvent = null,
  dt = 0,
  eventCooldowns = {},
  eventFlags = {},
  eventMessages = [],
  events = [],
  player = null,
  raceTime = 0,
  rivals = [],
  scoreRacer = null,
} = {}) => {
  const triggeredEvents = [];
  const score = scoreRacer || ((racer) => (racer?.lap || 0) + (racer?.progress || 0));

  events.forEach((event) => {
    const key = event.key || `${event.trigger}-${event.lap || event.time || event.progress}`;
    if (event.repeatInterval) {
      const last = eventCooldowns[key] || 0;
      if (raceTime - last >= event.repeatInterval) {
        eventCooldowns[key] = raceTime;
        const triggeredEvent = { event, key, repeat: true };
        triggeredEvents.push(triggeredEvent);
        applyEvent?.(event, triggeredEvent);
      }
      return;
    }

    const firedKey = `fired:${key}`;
    if (eventFlags[firedKey]) return;

    const leader = [player, ...rivals]
      .filter(Boolean)
      .sort((a, b) => score(b) - score(a))[0] || null;
    const ready =
      (event.trigger === 'lap' && player && player.lap >= event.lap) ||
      (event.trigger === 'time' && raceTime >= event.time) ||
      (event.trigger === 'position' && leader && leader.progress >= event.progress) ||
      (event.trigger === 'player' && eventFlags[event.flag]);

    if (ready) {
      eventFlags[firedKey] = true;
      const triggeredEvent = { event, key, repeat: false };
      triggeredEvents.push(triggeredEvent);
      applyEvent?.(event, triggeredEvent);
    }
  });

  return {
    eventMessages: eventMessages
      .map((message) => ({ ...message, life: message.life - dt }))
      .filter((message) => message.life > 0),
    triggeredEvents,
  };
};

export const applyRaceHazardEffect = ({
  addBoost = null,
  defaultVehicle = 'kart',
  dt = 0,
  getNextVehicleMode = null,
  hazard = null,
  hitPlayer = null,
  hitRival = null,
  isPlayer = false,
  lightningRedirectTarget = null,
  raceTime = 0,
  racer = null,
  setVehicleMode = null,
} = {}) => {
  if (!hazard || !racer) return { applied: false, reason: 'missing-input' };

  const definition = hazard.definition || getHazardDefinition(hazard.type);
  const vehicleFilter = hazard.vehicleFilter || definition?.vehicleFilter || 'both';
  if (!vehicleMatchesFilter(racer.vehicleMode || defaultVehicle, vehicleFilter)) {
    return { applied: false, effect: null, reason: 'vehicle-filter', vehicleFilter };
  }

  const effect = hazard.effect || definition?.effect;
  if (isPlayer && racer.invincibleTimer > 0 && !['boost', 'switch-lock'].includes(effect)) {
    return { applied: false, effect, reason: 'invincible', vehicleFilter };
  }

  const result = {
    applied: true,
    boost: null,
    effect,
    hit: null,
    reason: null,
    vehicleFilter,
  };
  const applyHit = (severity) => {
    if (isPlayer) hitPlayer?.(severity);
    else hitRival?.(racer, severity);
    result.hit = { severity, target: isPlayer ? 'player' : 'rival' };
  };

  if (isPlayer && hazard.type === 'lightning' && racer.lightningRodTimer > 0) {
    const leader = lightningRedirectTarget?.() || null;
    if (leader) hitRival?.(leader, hazard.severity || 1.05);
    racer.lightningRodTimer = 0;
    return {
      ...result,
      lightningRedirected: Boolean(leader),
      redirectedTarget: leader,
    };
  }

  if (effect === 'slow') {
    const velocityScale = 1 - clamp(dt * (hazard.strength || 1.4), 0, 0.2);
    const speedScale = 1 - clamp(dt * 1.2, 0, 0.16);
    if (racer.velocity) racer.velocity.multiplyScalar(velocityScale);
    if (racer.speed) racer.speed *= speedScale;
    return { ...result, speedScale, velocityScale };
  }

  if (effect === 'spin') {
    applyHit(hazard.severity || 0.85);
    return result;
  }

  if (effect === 'knock-back') {
    const push = racer.position?.clone?.().sub(hazard.position);
    push?.setY?.(0);
    if (push?.length?.() > 0.001 && racer.velocity) {
      racer.velocity.addScaledVector(push.normalize(), (hazard.force || 16) * dt);
    }
    applyHit(0.35);
    return result;
  }

  if (effect === 'pull') {
    const pull = hazard.position?.clone?.().sub(racer.position);
    pull?.setY?.(0);
    if (pull?.length?.() > 0.001 && racer.velocity) {
      racer.velocity.addScaledVector(pull.normalize(), (hazard.force || 20) * dt);
    }
    if (racer.vehicleMode === 'plane') {
      result.boost = { duration: 0.16, impulse: 2.2, source: 'trick', tier: 1 };
      addBoost?.(racer, result.boost.duration, result.boost.impulse, result.boost.tier, result.boost.source);
    }
    return result;
  }

  if (effect === 'boost') {
    result.boost = { duration: 0.35, impulse: hazard.impulse || 7, source: 'pad', tier: 1 };
    addBoost?.(racer, result.boost.duration, result.boost.impulse, result.boost.tier, result.boost.source);
    return result;
  }

  if (effect === 'blind') {
    racer.blindTimer = Math.max(racer.blindTimer || 0, hazard.duration || 3);
    return result;
  }

  if (effect === 'force-switch') {
    const nextMode =
      hazard.targetVehicle ||
      getNextVehicleMode?.(racer.vehicleMode || defaultVehicle) ||
      racer.vehicleMode ||
      defaultVehicle;
    setVehicleMode?.(racer, nextMode, { force: true });
    return { ...result, nextMode };
  }

  if (effect === 'control-flip') {
    racer.controlFlipTimer = Math.max(racer.controlFlipTimer || 0, hazard.duration || 2.2);
    return result;
  }

  if (effect === 'set-polarity') {
    racer.polarity = hazard.polarity || 1;
    racer.polaritySwapTimer = Math.max(racer.polaritySwapTimer || 0, hazard.duration || 4);
    return result;
  }

  if (effect === 'switch-lock') {
    racer.switchLockedUntil = Math.max(racer.switchLockedUntil || 0, raceTime + (hazard.duration || 5));
    return result;
  }

  if (effect === 'polarity-check' && hazard.polarity && racer.polarity !== hazard.polarity) {
    applyHit(0.72);
    return result;
  }

  return { ...result, applied: false, reason: 'unknown-effect' };
};

export const applyRaceTrackEvent = ({
  event = null,
  eventFlags = {},
  player = null,
  raceTime = 0,
  trackHazards = [],
  vehicleZones = [],
} = {}) => {
  if (!event) return { applied: false, message: null };

  const result = {
    action: event.action || null,
    applied: true,
    flagKey: null,
    hazard: null,
    message: event.message ? { life: 2.2, text: event.message } : null,
    rotatedHazards: [],
    switchLockUntil: null,
    zone: null,
  };

  if (event.flag) {
    eventFlags[event.flag] = event.value ?? true;
    result.flagKey = event.flag;
  }

  if (event.action === 'trigger-hazard') {
    const hazard = trackHazards.find((entry) => entry.key === event.hazardKey || entry.type === event.hazardType);
    if (hazard) {
      hazard.eventPulse = Math.max(hazard.eventPulse || 0, event.duration || 2.4);
      result.hazard = hazard;
    }
  }

  if (event.action === 'activate-zone') {
    const zone = vehicleZones.find((entry) => entry.key === event.zoneKey);
    if (zone) {
      zone.active = event.active ?? true;
      result.zone = zone;
    }
  }

  if (event.action === 'set-lock' && player) {
    player.switchLockedUntil = Math.max(player.switchLockedUntil || 0, raceTime + (event.duration || 2));
    result.switchLockUntil = player.switchLockedUntil;
  }

  if (event.action === 'rotate-polarity') {
    trackHazards.forEach((hazard) => {
      if (hazard.type === 'polarityStrip' || hazard.type === 'polarityGate') {
        hazard.polarity = (hazard.polarity || 1) * -1;
        hazard.eventPulse = Math.max(hazard.eventPulse || 0, 1.2);
        result.rotatedHazards.push(hazard);
      }
    });
  }

  return result;
};

export const resolveDroppedRaceHazard = ({
  definition = null,
  heading = 0,
  itemKey,
  level = 1,
  options = {},
  owner = null,
  position = {},
} = {}) => {
  const safeHeading = Number.isFinite(heading) ? heading : 0;
  const safeLevel = Number.isFinite(level) ? level : 1;
  const dropDistance = 5.8 + safeLevel;

  return {
    dragBackward: itemKey === 'anchorDrop' ? 3 : 0,
    effect: options.effect || (itemKey === 'decoyCrate' ? 'spin' : 'slow'),
    itemKey,
    life: options.life || definition?.duration || 8,
    owner,
    position: {
      x: coordinateFor(position, 'x') - Math.sin(safeHeading) * dropDistance,
      y: coordinateFor(position, 'y'),
      z: coordinateFor(position, 'z') - Math.cos(safeHeading) * dropDistance,
    },
    radius: options.radius || 3.2 + safeLevel * 0.75,
    vehicleFilter: options.vehicleFilter || definition?.vehicleRestriction || 'both',
  };
};

const distance2D = (a = {}, b = {}) => Math.hypot((a.x || 0) - (b.x || 0), (a.z || 0) - (b.z || 0));

export const resolveDroppedHazardContact = ({
  defaultVehicle = 'kart',
  hazard = null,
  hitPadding = 2.8,
  racer = null,
} = {}) => {
  if (!hazard || !racer) return { hit: false, reason: 'missing-input' };
  if (racer === hazard.owner) return { hit: false, reason: 'owner' };
  if (racer.finished) return { hit: false, reason: 'finished' };
  if (!vehicleMatchesFilter(racer.vehicleMode || defaultVehicle, hazard.vehicleFilter || 'both')) {
    return { hit: false, reason: 'vehicle-filter' };
  }
  if (!(hazard.life > 0)) return { hit: false, reason: 'expired' };

  const distance = distance2D(racer.position, hazard.position);
  const radius = hazard.radius + hitPadding;
  if (!(distance < radius)) {
    return {
      distance,
      hit: false,
      radius,
      reason: 'out-of-range',
    };
  }

  return {
    distance,
    dragBackward: hazard.effect === 'drag' ? hazard.dragBackward || 3 : 0,
    effect: hazard.effect || null,
    hit: true,
    playerHitSeverity: 0.9,
    radius,
    rivalHitSeverity: hazard.effect === 'spin' ? 1.05 : 0.9,
  };
};

export const updateDroppedHazardsForFrame = ({
  defaultVehicle = 'kart',
  dt = 0,
  hazards = [],
  hitPlayer = () => false,
  hitRival = () => false,
  player = null,
  rivals = [],
} = {}) => {
  const racers = [player, ...rivals].filter(Boolean);
  const contacts = [];

  hazards.forEach((hazard) => {
    hazard.life -= dt;
    racers.forEach((racer) => {
      const contact = resolveDroppedHazardContact({
        defaultVehicle,
        hazard,
        racer,
      });
      if (!contact.hit) return;

      if (contact.dragBackward > 0 && racer.velocity && racer.position?.addScaledVector) {
        const back = {
          x: -Math.sin(racer.heading || 0),
          y: 0,
          z: -Math.cos(racer.heading || 0),
        };
        racer.position.addScaledVector(back, contact.dragBackward);
      }
      if (racer === player) hitPlayer(contact.playerHitSeverity);
      else hitRival(racer, contact.rivalHitSeverity);
      hazard.life = 0;
      contacts.push({ contact, hazard, racer });
    });
  });

  return {
    activeHazards: hazards.filter((hazard) => hazard.life > 0),
    contacts,
  };
};

export const triggerRaceHazardByType = ({
  duration = 2.4,
  hazardType,
  message = null,
  messageLife = 2,
  trackHazards = [],
} = {}) => {
  const hazard = trackHazards.find((entry) => entry.type === hazardType) || null;
  if (hazard) hazard.eventPulse = Math.max(hazard.eventPulse || 0, duration);

  return {
    duration,
    hazard,
    message: message ? { life: messageLife, text: message } : null,
    triggered: Boolean(hazard),
  };
};

export const triggerNearestRemoteHazard = ({
  hazards = [],
  playerPosition,
  pulseSeconds = 1.8,
  strength = 1,
} = {}) => {
  const target = hazards
    .filter((hazard) => hazard.active !== false)
    .sort((a, b) => distance2D(playerPosition, a.position) - distance2D(playerPosition, b.position))[0] || null;

  if (target) {
    target.eventPulse = Math.max(target.eventPulse || 0, pulseSeconds * strength);
    target.cooldown = 0;
  }

  return {
    cooldown: target?.cooldown ?? null,
    eventPulse: target?.eventPulse ?? 0,
    message: {
      life: pulseSeconds,
      text: target ? 'Hazard Triggered' : 'No Hazard Armed',
    },
    strength,
    target,
    triggered: Boolean(target),
  };
};
