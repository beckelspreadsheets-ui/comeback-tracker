import { RACE_ITEMS } from './raceProgression.js';
import { RACE_TRACKS } from './raceTracks.js';

export const ITEM_CATEGORIES = {
  environmental: 'environmental',
  projectile: 'projectile',
  selfBuff: 'self-buff',
  setup: 'setup',
  trap: 'trap',
  vehicleState: 'vehicle-state',
};

export const COMMON_BOX_ITEMS = [
  'boost',
  'shield',
  'rocket',
  'bubbleTrap',
  'switchBolt',
  'liftJammer',
  'hazardBell',
  'decoyCrate',
  'ghostReplay',
  'bananaMagnet',
  'invincibility',
  'tideHorn',
];

export const BANKED_ITEMS = COMMON_BOX_ITEMS;

export const TRAP_ITEM_KEYS = ['oil', 'bubbleTrap', 'decoyCrate', 'anchorDrop'];

export const ITEM_COLORS = {
  anchorDrop: '#38506b',
  bananaMagnet: '#ffd34f',
  boardwalkGrip: '#7cf7ff',
  boost: '#2cc8ff',
  bubbleTrap: '#4ade80',
  decoyCrate: '#d9964a',
  ghostReplay: '#c879ff',
  hazardBell: '#ffb000',
  invincibility: '#f7fbff',
  liftJammer: '#6ee7f9',
  lightningRod: '#a78bfa',
  oil: '#10151d',
  phaseKey: '#9bff7a',
  polaritySwap: '#ff5fd2',
  rocket: '#ef4444',
  shield: '#ffd34f',
  switchBolt: '#f45b69',
  tideHorn: '#00d4ff',
  warhorn: '#ffb000',
};

export const LOCAL_ITEMS = [
  { key: 'oil', name: 'Slick Gel', summary: 'Drops a slippery training-gel trap behind the kart.' },
  ...RACE_TRACKS.map((track) => track.signatureItem),
];

export const ITEM_META = new Map([...RACE_ITEMS, ...LOCAL_ITEMS].map((item) => [item.key, item]));

export const ITEM_DEFINITIONS = [
  {
    key: 'boost',
    category: ITEM_CATEGORIES.selfBuff,
    rarity: 'common',
    targetType: 'self',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 0.95,
    cooldown: 0,
    feedback: { activation: 'turbo-start', hit: null, expiration: 'turbo-end' },
  },
  {
    key: 'shield',
    category: ITEM_CATEGORIES.setup,
    rarity: 'common',
    targetType: 'self',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 5.2,
    cooldown: 0,
    feedback: { activation: 'shield-on', hit: 'shield-block', expiration: 'shield-off' },
  },
  {
    key: 'rocket',
    category: ITEM_CATEGORIES.projectile,
    rarity: 'common',
    targetType: 'single-opponent',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 0,
    cooldown: 0,
    feedback: { activation: 'rocket-fire', hit: 'rocket-hit', expiration: null },
  },
  {
    key: 'oil',
    category: ITEM_CATEGORIES.trap,
    rarity: 'common',
    targetType: 'area',
    vehicleRestriction: 'kart',
    trackRestriction: 'universal',
    duration: 9,
    cooldown: 0,
    feedback: { activation: 'trap-drop', hit: 'trap-hit', expiration: 'trap-expire' },
  },
  {
    key: 'bubbleTrap',
    category: ITEM_CATEGORIES.trap,
    rarity: 'common',
    targetType: 'area',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 10,
    cooldown: 0,
    triggerFilter: { vehicles: ['kart', 'hover', 'plane'] },
    feedback: { activation: 'bubble-arm', hit: 'bubble-pop', expiration: 'bubble-fade' },
  },
  {
    key: 'switchBolt',
    category: ITEM_CATEGORIES.vehicleState,
    rarity: 'uncommon',
    targetType: 'single-opponent',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 2.8,
    cooldown: 0,
    feedback: { activation: 'switch-bolt-fire', hit: 'switch-bolt-hit', expiration: 'switch-bolt-clear' },
  },
  {
    key: 'liftJammer',
    category: ITEM_CATEGORIES.vehicleState,
    rarity: 'uncommon',
    targetType: 'all-opponents',
    vehicleRestriction: 'plane',
    trackRestriction: 'universal',
    duration: 4.5,
    cooldown: 0,
    feedback: { activation: 'jammer-on', hit: 'lift-cut', expiration: 'jammer-off' },
  },
  {
    key: 'hazardBell',
    category: ITEM_CATEGORIES.environmental,
    rarity: 'uncommon',
    targetType: 'area',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 0,
    cooldown: 0,
    feedback: { activation: 'bell-ring', hit: 'hazard-snap', expiration: null },
  },
  {
    key: 'decoyCrate',
    category: ITEM_CATEGORIES.setup,
    rarity: 'common',
    targetType: 'area',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 12,
    cooldown: 0,
    feedback: { activation: 'decoy-place', hit: 'decoy-break', expiration: 'decoy-fizzle' },
  },
  {
    key: 'ghostReplay',
    category: ITEM_CATEGORIES.setup,
    rarity: 'rare',
    targetType: 'self',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 5.5,
    cooldown: 0,
    feedback: { activation: 'ghost-on', hit: null, expiration: 'ghost-off' },
  },
  {
    key: 'bananaMagnet',
    category: ITEM_CATEGORIES.selfBuff,
    rarity: 'common',
    targetType: 'self',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 6,
    cooldown: 0,
    feedback: { activation: 'magnet-on', hit: null, expiration: 'magnet-off' },
  },
  {
    key: 'invincibility',
    category: ITEM_CATEGORIES.selfBuff,
    rarity: 'rare',
    targetType: 'self',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 4.2,
    cooldown: 0,
    feedback: { activation: 'surge-on', hit: 'surge-contact', expiration: 'surge-off' },
  },
  {
    key: 'tideHorn',
    category: ITEM_CATEGORIES.environmental,
    rarity: 'rare',
    targetType: 'area',
    vehicleRestriction: 'both',
    trackRestriction: 'universal',
    duration: 0,
    cooldown: 0,
    feedback: { activation: 'tide-horn', hit: 'event-hit', expiration: null },
  },
  {
    key: 'boardwalkGrip',
    category: ITEM_CATEGORIES.selfBuff,
    rarity: 'track',
    targetType: 'self',
    vehicleRestriction: 'kart',
    trackRestriction: 'neon-tide-pier',
    duration: 5.6,
    cooldown: 0,
    feedback: { activation: 'grip-on', hit: null, expiration: 'grip-off' },
  },
  {
    key: 'warhorn',
    category: ITEM_CATEGORIES.environmental,
    rarity: 'track',
    targetType: 'all-opponents',
    vehicleRestriction: 'both',
    trackRestriction: 'giants-wakeway',
    duration: 2.4,
    cooldown: 0,
    feedback: { activation: 'horn-blast', hit: 'wake-hit', expiration: 'wake-calm' },
  },
  {
    key: 'phaseKey',
    category: ITEM_CATEGORIES.environmental,
    rarity: 'track',
    targetType: 'self',
    vehicleRestriction: 'both',
    trackRestriction: 'orbital-relay',
    duration: 4.8,
    cooldown: 0,
    feedback: { activation: 'phase-open', hit: null, expiration: 'phase-close' },
  },
  {
    key: 'anchorDrop',
    category: ITEM_CATEGORIES.trap,
    rarity: 'track',
    targetType: 'area',
    vehicleRestriction: 'kart',
    trackRestriction: 'tide-pier',
    duration: 15,
    cooldown: 0,
    triggerFilter: { vehicles: ['kart', 'hover'] },
    feedback: { activation: 'anchor-drop', hit: 'anchor-drag', expiration: 'anchor-sink' },
  },
  {
    key: 'lightningRod',
    category: ITEM_CATEGORIES.environmental,
    rarity: 'track',
    targetType: 'self',
    vehicleRestriction: 'both',
    trackRestriction: 'static-storm-plateau',
    duration: 8,
    cooldown: 0,
    feedback: { activation: 'rod-charge', hit: 'storm-redir', expiration: 'rod-fade' },
  },
  {
    key: 'polaritySwap',
    category: ITEM_CATEGORIES.vehicleState,
    rarity: 'track',
    targetType: 'all-opponents',
    vehicleRestriction: 'both',
    trackRestriction: 'magnet-mine-descent',
    duration: 3,
    cooldown: 0,
    feedback: { activation: 'polarity-swap', hit: 'polarity-flip', expiration: 'polarity-reset' },
  },
];

export const ITEM_DEFINITION_BY_KEY = new Map(ITEM_DEFINITIONS.map((item) => [item.key, item]));
export const getItemDefinition = (key) => ITEM_DEFINITION_BY_KEY.get(key) || null;

export const itemAllowedOnTrack = (definition, trackKey) =>
  !definition ||
  definition.trackRestriction === 'universal' ||
  definition.trackRestriction === trackKey;

export const itemAllowedForVehicle = (definition, vehicleMode) =>
  !definition ||
  definition.vehicleRestriction === 'both' ||
  definition.vehicleRestriction === vehicleMode ||
  (definition.vehicleRestriction === 'kart' && vehicleMode === 'hover');

export const chooseRaceBoxItem = ({
  box = {},
  random = Math.random,
  rareNextPickup = false,
  signatureItemKey = null,
  trackKey,
  vehicleMode,
} = {}) => {
  const pool = [...(box.pool || COMMON_BOX_ITEMS), signatureItemKey].filter(Boolean);
  const filtered = pool.filter((key) => {
    const definition = getItemDefinition(key);
    return definition && itemAllowedOnTrack(definition, trackKey) && itemAllowedForVehicle(definition, vehicleMode);
  });
  const candidates = filtered.length ? filtered : COMMON_BOX_ITEMS;
  const rareCandidates = candidates.filter((key) => ['rare', 'track'].includes(getItemDefinition(key)?.rarity));
  const finalPool = box.rare || rareNextPickup ? rareCandidates.length ? rareCandidates : candidates : candidates;
  return finalPool[Math.floor(random() * finalPool.length)] || 'boost';
};

export const resolveItemBoxPickupForFrame = ({
  box,
  distance = Infinity,
  dt = 0,
  pickupDistance = 5.4,
} = {}) => {
  if (!box) {
    return {
      cooldown: 0,
      picked: false,
    };
  }

  box.cooldown = Math.max(0, box.cooldown - dt);
  const picked = box.cooldown <= 0 && distance < pickupDistance;

  return {
    cooldown: box.cooldown,
    picked,
  };
};

export const applyRaceItemBoxPickup = ({
  box,
  cooldownSeconds = 6.8,
  item,
  itemKey = item?.itemKey || item?.key || null,
  player,
} = {}) => {
  if (!player || !item) {
    return {
      cooldown: box?.cooldown ?? 0,
      item: null,
      itemKey,
      slot: null,
    };
  }

  const held = player.heldItem;
  const useSecondarySlot = held && held.itemKey !== itemKey && player.doubleSlotUses > 0 && !player.secondaryHeldItem;
  if (useSecondarySlot) {
    player.secondaryHeldItem = item;
    player.doubleSlotUses = 0;
  } else {
    player.heldItem = item;
    player.heldBalloon = item;
  }
  if (box) box.cooldown = cooldownSeconds;

  return {
    cooldown: box?.cooldown ?? cooldownSeconds,
    item,
    itemKey,
    slot: useSecondarySlot ? 'secondary' : 'primary',
  };
};

export const collectRaceItemBoxForPlayer = ({
  box,
  random = Math.random,
  signatureItemKey = null,
  trackKey,
  vehicleMode,
  player,
} = {}) => {
  if (!box || !player) {
    return {
      cooldown: box?.cooldown ?? 0,
      item: null,
      itemBoxSourceType: box?.type?.key || box?.type || null,
      itemKey: null,
      slot: null,
    };
  }

  const itemKey = chooseRaceBoxItem({
    box: box.box || {},
    random,
    rareNextPickup: player.rareNextPickup,
    signatureItemKey,
    trackKey,
    vehicleMode,
  });
  player.rareNextPickup = false;

  const held = player.heldItem;
  const level = held?.itemKey === itemKey ? Math.min(3, Math.max(1, held.level + 1)) : 1;
  const item = createHeldRaceItem(itemKey, level, box.type);
  const pickup = applyRaceItemBoxPickup({
    box,
    item,
    itemKey,
    player,
  });

  return {
    ...pickup,
    itemBoxSourceType: box.type?.key || box.type || null,
    level,
  };
};

const pointFrom = (point = {}) => ({
  x: point.x || 0,
  y: point.y || 0,
  z: point.z || 0,
});

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

const distanceBetweenPoints = (a, b) => {
  if (typeof a?.distanceTo === 'function') return a.distanceTo(b);
  const source = pointFrom(a);
  const target = pointFrom(b);
  return Math.hypot(source.x - target.x, source.y - target.y, source.z - target.z);
};

const applyFlatPull = ({ dt = 0, sourcePosition, speed = 0, targetPosition }) => {
  if (!sourcePosition || !targetPosition || typeof targetPosition.clone !== 'function') return false;
  const pull = targetPosition.clone().sub(sourcePosition);
  if (typeof pull.setY === 'function') pull.setY(0);
  else pull.y = 0;
  if (typeof pull.length !== 'function' || pull.length() <= 0.001) return false;
  sourcePosition.addScaledVector(pull.normalize(), speed * dt);
  return true;
};

export const resolveBananaScatterForRacer = ({
  amount = 3,
  racer,
  spacingBase = 4.5,
  spacingStep = 1.1,
  spreadRadians = 0.62,
  velocity = 5.5,
} = {}) => {
  const available = Math.min(amount, Math.max(0, racer?.bananas || 0));
  if (!racer || !available) {
    return {
      available: 0,
      drops: [],
      nextBananas: racer?.bananas ?? 0,
    };
  }

  racer.bananas = Math.max(0, racer.bananas - available);
  const origin = pointFrom(racer.position);
  const heading = racer.heading || 0;
  const drops = Array.from({ length: available }, (_, index) => {
    const angle = heading + Math.PI + (index - 1) * spreadRadians;
    const direction = {
      x: Math.sin(angle),
      y: 0,
      z: Math.cos(angle),
    };
    const distance = spacingBase + index * spacingStep;
    return {
      angle,
      position: {
        x: origin.x + direction.x * distance,
        y: origin.y,
        z: origin.z + direction.z * distance,
      },
      velocity: {
        x: direction.x * velocity,
        y: 0,
        z: direction.z * velocity,
      },
    };
  });

  return {
    available,
    drops,
    nextBananas: racer.bananas,
  };
};

export const updateTrackBananasForPlayer = ({
  bananas = [],
  dt = 0,
  magnetDistance = 22,
  magnetSpeed = 18,
  maxBananas = 99,
  pickupCooldown = 8.5,
  pickupDistance = 4.2,
  player,
} = {}) => {
  let collected = 0;
  let magnetPulls = 0;

  if (!player) {
    return {
      bananas,
      collected,
      magnetPulls,
      playerBananas: 0,
    };
  }

  bananas.forEach((banana) => {
    banana.cooldown = Math.max(0, banana.cooldown - dt);
    const magnetPull =
      player.magnetTimer > 0 &&
      banana.cooldown <= 0 &&
      distanceBetweenPoints(player.position, banana.position) < magnetDistance;
    if (
      magnetPull &&
      applyFlatPull({
        dt,
        sourcePosition: banana.position,
        speed: magnetSpeed,
        targetPosition: player.position,
      })
    ) {
      magnetPulls += 1;
    }
    if (banana.cooldown <= 0 && distanceBetweenPoints(player.position, banana.position) < pickupDistance) {
      player.bananas = clampNumber((player.bananas || 0) + 1, 0, maxBananas);
      banana.cooldown = pickupCooldown;
      collected += 1;
    }
  });

  return {
    bananas,
    collected,
    magnetPulls,
    playerBananas: player.bananas || 0,
  };
};

export const updateDroppedBananasForPlayer = ({
  bananas = [],
  dragRate = 1.8,
  dt = 0,
  magnetDistance = 26,
  magnetSpeed = 24,
  maxBananas = 99,
  player,
} = {}) => {
  let collected = 0;
  let magnetPulls = 0;

  bananas.forEach((banana) => {
    banana.life -= dt;
    banana.position.addScaledVector(banana.velocity, dt);
    banana.velocity.multiplyScalar(Math.max(0, 1 - dt * dragRate));
    if (
      player?.magnetTimer > 0 &&
      distanceBetweenPoints(player.position, banana.position) < magnetDistance &&
      applyFlatPull({
        dt,
        sourcePosition: banana.position,
        speed: magnetSpeed,
        targetPosition: player.position,
      })
    ) {
      magnetPulls += 1;
    }
    if (player && banana.life > 0 && distanceBetweenPoints(player.position, banana.position) < banana.radius) {
      player.bananas = clampNumber((player.bananas || 0) + 1, 0, maxBananas);
      banana.life = 0;
      collected += 1;
    }
  });

  return {
    activeBananas: bananas.filter((banana) => banana.life > 0),
    collected,
    magnetPulls,
    playerBananas: player?.bananas || 0,
  };
};

export const applyBananaMagnetRivalPullForFrame = ({
  distanceBetween = distanceBetweenPoints,
  dt = 0,
  player = null,
  pullSpeed = 11,
  rivals = [],
  scoreRacer = () => 0,
} = {}) => {
  if (!player || !(player.magnetTimer > 0)) {
    return {
      applied: false,
      reason: player ? 'inactive' : 'missing-player',
      target: null,
    };
  }

  const playerScore = scoreRacer(player);
  const target =
    rivals
      .filter((rival) => !rival.finished && scoreRacer(rival) > playerScore)
      .sort((a, b) => distanceBetween(player.position, a.position) - distanceBetween(player.position, b.position))[0] ||
    null;

  if (!target) {
    return {
      applied: false,
      reason: 'no-target',
      target: null,
    };
  }

  if (!target.position?.clone || !player.velocity?.addScaledVector) {
    return {
      applied: false,
      reason: 'missing-vector-api',
      target,
    };
  }

  const pull = target.position.clone().sub(player.position);
  if (typeof pull.setY === 'function') pull.setY(0);
  else pull.y = 0;

  if (typeof pull.length !== 'function' || pull.length() <= 0.001) {
    return {
      applied: false,
      reason: 'zero-pull',
      target,
    };
  }

  const impulse = pullSpeed * dt;
  player.velocity.addScaledVector(pull.normalize(), impulse);

  return {
    applied: true,
    impulse,
    reason: null,
    target,
  };
};

export const spendRaceBananasForPlayer = ({
  amount = 0,
  player,
} = {}) => {
  if (!player) {
    return {
      bananas: 0,
      reason: 'missing-player',
      spent: false,
    };
  }
  if (player.bananas < amount) {
    return {
      bananas: player.bananas,
      reason: 'insufficient-bananas',
      spent: false,
    };
  }
  player.bananas -= amount;
  return {
    bananas: player.bananas,
    reason: null,
    spent: true,
  };
};

export const upgradeHeldRaceItemForPlayer = ({
  cost = 3,
  maxLevel = 3,
  player,
} = {}) => {
  if (!player?.heldItem) {
    return {
      heldItem: null,
      reason: 'missing-held-item',
      upgraded: false,
    };
  }
  if (player.heldItem.level >= maxLevel) {
    return {
      heldItem: player.heldItem,
      reason: 'max-level',
      upgraded: false,
    };
  }

  const spend = spendRaceBananasForPlayer({ amount: cost, player });
  if (!spend.spent) {
    return {
      heldItem: player.heldItem,
      reason: spend.reason,
      upgraded: false,
    };
  }

  player.heldItem = createHeldRaceItem(player.heldItem.itemKey, player.heldItem.level + 1);
  player.heldBalloon = player.heldItem;
  return {
    heldItem: player.heldItem,
    reason: null,
    upgraded: true,
  };
};

export const buyRareRacePickupForPlayer = ({
  cost = 5,
  player,
} = {}) => {
  const spend = spendRaceBananasForPlayer({ amount: cost, player });
  if (!spend.spent) {
    return {
      reason: spend.reason,
      rareNextPickup: player?.rareNextPickup || false,
      bought: false,
    };
  }
  player.rareNextPickup = true;
  return {
    reason: null,
    rareNextPickup: player.rareNextPickup,
    bought: true,
  };
};

export const buyRaceDoubleSlotForPlayer = ({
  cost = 8,
  player,
} = {}) => {
  const spend = spendRaceBananasForPlayer({ amount: cost, player });
  if (!spend.spent) {
    return {
      doubleSlotUses: player?.doubleSlotUses || 0,
      reason: spend.reason,
      bought: false,
    };
  }
  player.doubleSlotUses = 1;
  return {
    doubleSlotUses: player.doubleSlotUses,
    reason: null,
    bought: true,
  };
};

export const advanceHeldRaceItemAfterUse = ({ player } = {}) => {
  if (!player) {
    return {
      heldItem: null,
      promoted: false,
    };
  }

  const promotedItem = player.secondaryHeldItem || null;
  player.heldItem = promotedItem;
  player.secondaryHeldItem = null;
  player.heldBalloon = player.heldItem;

  return {
    heldItem: player.heldItem,
    promoted: Boolean(promotedItem),
  };
};

export const itemLabel = (key) => ITEM_META.get(key)?.name || getItemDefinition(key)?.key || key;

export const createHeldRaceItem = (itemKey, level = 1, type = null) => {
  const definition = getItemDefinition(itemKey);
  const color = ITEM_COLORS[itemKey] || type?.color || '#f7fbff';
  return {
    category: definition?.category || 'unknown',
    color,
    itemKey,
    key: itemKey,
    label: itemLabel(itemKey),
    level: Math.min(3, Math.max(1, level)),
    rarity: definition?.rarity || 'common',
    vehicleRestriction: definition?.vehicleRestriction || 'both',
  };
};

export const resolveRaceItemUseRequest = ({
  itemLike,
  level = 1,
  requireVehicleAllowed = false,
  trackKey,
  vehicleMode,
} = {}) => {
  const itemKey = typeof itemLike === 'string' ? itemLike : itemLike?.itemKey || itemLike?.key || null;
  const definition = getItemDefinition(itemKey);
  if (!itemKey || !definition) {
    return {
      allowed: false,
      definition: null,
      itemKey,
      level,
      reason: itemKey ? 'unknown-item' : 'missing-item',
    };
  }
  if (!itemAllowedOnTrack(definition, trackKey)) {
    return {
      allowed: false,
      definition,
      itemKey,
      level,
      reason: 'track-restricted',
    };
  }
  if (requireVehicleAllowed && !itemAllowedForVehicle(definition, vehicleMode)) {
    return {
      allowed: false,
      definition,
      itemKey,
      level,
      reason: 'vehicle-restricted',
    };
  }

  return {
    allowed: true,
    definition,
    itemKey,
    level,
    reason: null,
  };
};

export const resolveRaceTrapItemUse = ({
  definition = null,
  itemKey,
  level = 1,
} = {}) => {
  if (!TRAP_ITEM_KEYS.includes(itemKey)) {
    return {
      effect: null,
      itemKey,
      life: 0,
      trap: false,
    };
  }

  return {
    effect: itemKey === 'anchorDrop' ? 'drag' : itemKey === 'decoyCrate' ? 'spin' : 'slow',
    itemKey,
    life: (definition?.duration || 0) + level * 1.2,
    trap: true,
  };
};

export const resolveRaceItemBoostUse = ({
  itemKey,
  level = 1,
} = {}) => {
  if (itemKey === 'boost') {
    return {
      boost: true,
      duration: 0.55 + level * 0.42,
      impulse: 12 + level * 5.5,
      source: 'item',
      tier: level,
    };
  }
  if (itemKey === 'shield' && level >= 3) {
    return {
      boost: true,
      duration: 0.55,
      impulse: 8,
      source: 'item',
      tier: 2,
    };
  }
  if (itemKey === 'rocket') {
    return {
      boost: true,
      duration: 0.22 + level * 0.08,
      impulse: 4 + level * 2,
      source: 'item',
      tier: level,
    };
  }
  if (itemKey === 'ghostReplay') {
    return {
      boost: true,
      duration: 0.28 + level * 0.15,
      impulse: 5 + level * 2.4,
      source: 'item',
      tier: level,
    };
  }
  if (itemKey === 'invincibility') {
    return {
      boost: true,
      duration: 0.55,
      impulse: 8,
      source: 'item',
      tier: 2,
    };
  }
  if (itemKey === 'boardwalkGrip') {
    return {
      boost: true,
      duration: 0.65,
      impulse: 8,
      source: 'item',
      tier: 2,
    };
  }
  if (itemKey === 'warhorn') {
    return {
      boost: true,
      duration: 1.0,
      impulse: 13,
      source: 'item',
      tier: 2,
    };
  }
  if (itemKey === 'phaseKey') {
    return {
      boost: true,
      duration: 0.82,
      impulse: 12,
      source: 'item',
      tier: 2,
    };
  }

  return {
    boost: false,
    duration: 0,
    impulse: 0,
    source: null,
    tier: 0,
  };
};

export const resolveRaceItemSelfStatusUse = ({
  itemKey,
  level = 1,
} = {}) => {
  const statuses = [];
  const addStatus = (key, duration) => {
    statuses.push({ duration, key });
  };

  if (itemKey === 'shield') addStatus('shieldTimer', 3.2 + level * 1.5);
  if (itemKey === 'ghostReplay') addStatus('ghostTimer', 4.4 + level * 0.6);
  if (itemKey === 'bananaMagnet') addStatus('magnetTimer', 4.8 + level * 0.9);
  if (itemKey === 'invincibility') addStatus('invincibleTimer', 3.4 + level * 0.55);
  if (itemKey === 'boardwalkGrip') addStatus('shieldTimer', 5.6);
  if (itemKey === 'phaseKey') {
    addStatus('phaseTimer', 4.8);
    addStatus('invincibleTimer', 1.2);
  }
  if (itemKey === 'lightningRod') {
    addStatus('lightningRodTimer', 8);
    addStatus('invincibleTimer', 0.7);
  }

  return {
    itemKey,
    status: statuses.length > 0,
    statuses,
  };
};

export const applyRaceItemSelfStatusUse = ({
  itemKey,
  level = 1,
  racer,
} = {}) => {
  const statusUse = resolveRaceItemSelfStatusUse({ itemKey, level });
  if (!racer || !statusUse.status) {
    return {
      ...statusUse,
      applied: false,
    };
  }

  statusUse.statuses.forEach(({ duration, key }) => {
    racer[key] = Math.max(racer[key] || 0, duration);
  });

  return {
    ...statusUse,
    applied: true,
  };
};

export const resolveRaceItemOpponentUse = ({
  itemKey,
  level = 1,
} = {}) => {
  if (itemKey === 'rocket') {
    return {
      hitSeverity: 0.8 + level * 0.32,
      opponent: true,
      target: 'nearest',
    };
  }
  if (itemKey === 'switchBolt') {
    return {
      hitSeverity: 0.45,
      opponent: true,
      switchLockDuration: 1.8 + level * 0.4,
      switchVehicle: true,
      target: 'nearest',
    };
  }
  if (itemKey === 'liftJammer') {
    return {
      liftDisabledDuration: 3.2 + level * 0.8,
      opponent: true,
      planeHitSeverity: 0.52,
      target: 'all',
    };
  }
  if (itemKey === 'warhorn') {
    return {
      hitRadius: 72,
      hitSeverity: 1.05,
      opponent: true,
      target: 'ahead-or-radius',
    };
  }
  if (itemKey === 'polaritySwap') {
    return {
      hitSeverity: 0.35,
      opponent: true,
      polarityFlip: true,
      polaritySwapDuration: 3,
      target: 'all',
    };
  }

  return {
    opponent: false,
    target: null,
  };
};

export const resolveRaceItemRemoteHazardUse = ({
  itemKey,
} = {}) => {
  if (itemKey === 'hazardBell') {
    return {
      remoteHazard: true,
      strength: 1,
    };
  }
  if (itemKey === 'tideHorn') {
    return {
      remoteHazard: true,
      strength: 1.4,
    };
  }
  if (itemKey === 'warhorn') {
    return {
      remoteHazard: true,
      strength: 1.25,
    };
  }

  return {
    remoteHazard: false,
    strength: 0,
  };
};

export const applyRaceItemUse = ({
  addBoost = () => false,
  defaultVehicle = 'kart',
  distanceBetween = () => Infinity,
  dropTrap = () => false,
  getNextVehicleMode = (mode) => mode,
  hitRival = () => false,
  itemLike,
  level = 1,
  onAllowed = null,
  racer,
  requireVehicleAllowed = false,
  rivals = [],
  raceTime = 0,
  scoreRacer = () => 0,
  setVehicleMode = () => false,
  trackKey,
  triggerRemoteHazard = () => false,
  vehicleMode = racer?.vehicleMode,
} = {}) => {
  const request = resolveRaceItemUseRequest({
    itemLike,
    level,
    requireVehicleAllowed,
    trackKey,
    vehicleMode,
  });
  if (!request.allowed) {
    return {
      ...request,
      applied: false,
      action: null,
    };
  }

  const { definition, itemKey } = request;
  onAllowed?.(definition.feedback?.activation || itemKey, request);

  const itemBoost = resolveRaceItemBoostUse({ itemKey, level });
  const applyItemBoost = () => {
    if (!itemBoost.boost) return false;
    addBoost(racer, itemBoost.duration, itemBoost.impulse, itemBoost.tier, itemBoost.source);
    return true;
  };
  const applyItemSelfStatuses = () =>
    applyRaceItemSelfStatusUse({
      itemKey,
      level,
      racer,
    }).applied;
  const opponentUse = resolveRaceItemOpponentUse({ itemKey, level });
  const remoteHazardUse = resolveRaceItemRemoteHazardUse({ itemKey, level });
  const nearestRival = (predicate = () => true) =>
    rivals
      .filter((rival) => !rival.finished && predicate(rival))
      .map((rival) => ({
        gap: Math.abs(scoreRacer(rival) - scoreRacer(racer)),
        rival,
      }))
      .sort((a, b) => a.gap - b.gap)[0]?.rival || null;
  const complete = (action, details = {}) => ({
    ...request,
    action,
    applied: true,
    ...details,
  });

  if (itemKey === 'boost') {
    return complete('boost', { boostApplied: applyItemBoost() });
  }
  if (itemKey === 'shield') {
    const statusApplied = applyItemSelfStatuses();
    return complete('shield', {
      statusApplied,
      boostApplied: applyItemBoost(),
    });
  }
  if (itemKey === 'rocket') {
    const target = nearestRival();
    if (target) hitRival(target, opponentUse.hitSeverity);
    return complete('rocket', {
      boostApplied: applyItemBoost(),
      target,
    });
  }

  const trapUse = resolveRaceTrapItemUse({ definition, itemKey, level });
  if (trapUse.trap) {
    dropTrap(racer, itemKey, level, {
      effect: trapUse.effect,
      life: trapUse.life,
    });
    return complete('trap', { trapUse });
  }

  if (itemKey === 'switchBolt') {
    const target = nearestRival();
    if (target) {
      setVehicleMode(target, getNextVehicleMode(target.vehicleMode || defaultVehicle), { force: true });
      target.switchLockedUntil = Math.max(target.switchLockedUntil || 0, raceTime + opponentUse.switchLockDuration);
      hitRival(target, opponentUse.hitSeverity);
    }
    return complete('switchBolt', { target });
  }
  if (itemKey === 'liftJammer') {
    rivals.forEach((rival) => {
      rival.liftDisabledTimer = Math.max(rival.liftDisabledTimer || 0, opponentUse.liftDisabledDuration);
      if (rival.vehicleMode === 'plane') hitRival(rival, opponentUse.planeHitSeverity);
    });
    return complete('liftJammer', { targetCount: rivals.length });
  }
  if (itemKey === 'hazardBell' || itemKey === 'tideHorn') {
    triggerRemoteHazard(remoteHazardUse.strength);
    return complete('remoteHazard', { strength: remoteHazardUse.strength });
  }
  if (itemKey === 'ghostReplay') {
    const statusApplied = applyItemSelfStatuses();
    return complete('ghostReplay', {
      statusApplied,
      boostApplied: applyItemBoost(),
    });
  }
  if (itemKey === 'bananaMagnet') {
    return complete('bananaMagnet', { statusApplied: applyItemSelfStatuses() });
  }
  if (itemKey === 'invincibility') {
    const statusApplied = applyItemSelfStatuses();
    return complete('invincibility', {
      statusApplied,
      boostApplied: applyItemBoost(),
    });
  }
  if (itemKey === 'boardwalkGrip') {
    const statusApplied = applyItemSelfStatuses();
    return complete('boardwalkGrip', {
      statusApplied,
      boostApplied: applyItemBoost(),
    });
  }
  if (itemKey === 'warhorn') {
    triggerRemoteHazard(remoteHazardUse.strength);
    const targets = [];
    rivals.forEach((opponent) => {
      if (
        distanceBetween(racer.position, opponent.position) < opponentUse.hitRadius ||
        scoreRacer(opponent) > scoreRacer(racer)
      ) {
        targets.push(opponent);
        hitRival(opponent, opponentUse.hitSeverity);
      }
    });
    return complete('warhorn', {
      boostApplied: applyItemBoost(),
      targets,
    });
  }
  if (itemKey === 'phaseKey') {
    const statusApplied = applyItemSelfStatuses();
    return complete('phaseKey', {
      statusApplied,
      boostApplied: applyItemBoost(),
    });
  }
  if (itemKey === 'lightningRod') {
    return complete('lightningRod', { statusApplied: applyItemSelfStatuses() });
  }
  if (itemKey === 'polaritySwap') {
    rivals.forEach((rival) => {
      rival.polarity *= -1;
      rival.polaritySwapTimer = Math.max(rival.polaritySwapTimer || 0, opponentUse.polaritySwapDuration);
      hitRival(rival, opponentUse.hitSeverity);
    });
    return complete('polaritySwap', { targetCount: rivals.length });
  }

  return {
    ...request,
    action: null,
    applied: false,
  };
};
