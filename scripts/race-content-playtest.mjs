import { RACE_TRACKS } from '../src/game/raceTracks.js';
import { ITEM_DEFINITIONS, getItemDefinition, itemAllowedOnTrack } from '../src/game/raceItems.js';

const REQUIRED_TRACKS = {
  'comeback-city': {
    bananaCount: 18,
    hazards: ['wet', 'pulseZone', 'laser', 'mineCart', 'gate'],
    itemBoxes: { air: 4, ground: 8, hybrid: 3 },
    signature: 'boost',
  },
  'magnet-mine-descent': {
    bananaCount: 10,
    hazards: ['mineCart', 'magneticSpike', 'pulseZone', 'stalactite', 'polarityGate'],
    itemBoxes: { air: 3, ground: 5, hybrid: 2 },
    signature: 'polaritySwap',
  },
  'static-storm-plateau': {
    bananaCount: 10,
    hazards: ['lightning', 'tornado', 'bridgeCollapse', 'staticCharge', 'windGust'],
    itemBoxes: { air: 6, ground: 4, hybrid: 3 },
    signature: 'lightningRod',
  },
  'tide-pier': {
    bananaCount: 10,
    hazards: ['fishCart', 'laundry', 'lighthouseBeam', 'seagulls', 'crabTrap'],
    itemBoxes: { air: 4, ground: 6, hybrid: 2 },
    signature: 'anchorDrop',
  },
};

const REQUIRED_ITEM_CATEGORIES = ['projectile', 'trap', 'vehicle-state', 'environmental', 'setup', 'self-buff'];

const fail = (message, detail = {}) => {
  console.error(JSON.stringify({ detail, error: message }, null, 2));
  process.exit(1);
};

const progressInRange = (progress, start, end) =>
  start <= end ? progress >= start && progress <= end : progress >= start || progress <= end;

const validateItems = () => {
  const categories = new Set(ITEM_DEFINITIONS.map((item) => item.category));
  const missingCategories = REQUIRED_ITEM_CATEGORIES.filter((category) => !categories.has(category));
  if (ITEM_DEFINITIONS.length < 12) fail('Expected at least 12 item definitions', { count: ITEM_DEFINITIONS.length });
  if (missingCategories.length) fail('Missing item categories', { missingCategories });

  ITEM_DEFINITIONS.forEach((item) => {
    if (!item.targetType || !item.vehicleRestriction || !item.trackRestriction) fail('Item schema incomplete', item);
    if (!Number.isFinite(item.duration) || !Number.isFinite(item.cooldown)) fail('Item timing schema incomplete', item);
    if (!item.feedback || !('activation' in item.feedback) || !('hit' in item.feedback) || !('expiration' in item.feedback)) {
      fail('Item feedback schema incomplete', item);
    }
  });
};

const validateTrack = (track) => {
  const expected = REQUIRED_TRACKS[track.key];
  if (!expected) fail('Unexpected track key', { key: track.key });
  if (track.laps !== 3) fail('Track must be 3 laps', { key: track.key, laps: track.laps });
  if (track.bananaCount !== expected.bananaCount) {
    fail('Track banana count mismatch', { actual: track.bananaCount, expected: expected.bananaCount, key: track.key });
  }
  if (track.signatureItem?.key !== expected.signature) fail('Signature item mismatch', { key: track.key });
  if (!getItemDefinition(track.signatureItem.key)) fail('Missing signature item definition', { key: track.key });
  if (!itemAllowedOnTrack(getItemDefinition(track.signatureItem.key), track.key)) {
    fail('Signature item is not allowed on its track', { key: track.key, signature: track.signatureItem.key });
  }

  ['ground', 'air', 'hybrid'].forEach((layerKey) => {
    const layer = track.layers?.[layerKey];
    if (!layer) fail('Missing route layer', { key: track.key, layerKey });
    const expectedCount = expected.itemBoxes[layerKey];
    if ((layer.itemBoxes || []).length !== expectedCount) {
      fail('Unexpected item box count', {
        actual: (layer.itemBoxes || []).length,
        expected: expectedCount,
        key: track.key,
        layerKey,
      });
    }
  });

  if (!track.switchPads?.length) fail('Missing switch pads', { key: track.key });
  if (!track.vehicleZones?.length) fail('Missing vehicle zones', { key: track.key });
  if (!track.vehicleLocks?.length) fail('Missing vehicle locks', { key: track.key });
  if (!track.events?.length) fail('Missing dynamic events', { key: track.key });

  const hazardTypes = new Set((track.hazards || []).map((hazard) => hazard.type));
  const missingHazards = expected.hazards.filter((hazard) => !hazardTypes.has(hazard));
  if (missingHazards.length) fail('Missing required hazards', { key: track.key, missingHazards });
};

const simulateRace = (track, raceIndex, mode) => {
  const racers = [
    { finished: false, key: 'player', lap: 1, progress: track.startProgress || 0, speed: 1 + raceIndex * 0.035, vehicle: 'kart' },
    ...(track.aiRivals || []).map((rival, index) => ({
      finished: false,
      key: rival.name,
      lap: 1,
      progress: ((track.startProgress || 0) - 0.035 * (index + 1) + 1) % 1,
      speed: 0.96 + index * 0.025 + (raceIndex === index ? 0.09 : 0),
      vehicle: index === 0 ? 'plane' : 'kart',
    })),
  ];

  const finishOrder = [];
  for (let tick = 0; tick < 2400 && finishOrder.length < racers.length; tick += 1) {
    racers.forEach((racer) => {
      if (racer.finished) return;
      const previous = racer.progress;
      const zones = track.vehicleZones || [];
      zones.forEach((zone) => {
        if (zone.active === false) return;
        const gap = Math.abs(zone.progress - racer.progress);
        if (gap < 0.025 && mode === 'vehicle-restricted') racer.vehicle = zone.vehicle;
      });
      (track.vehicleLocks || []).forEach((lock) => {
        if (progressInRange(racer.progress, lock.start, lock.end) && lock.vehicle) racer.vehicle = lock.vehicle;
      });
      racer.progress = (racer.progress + 0.006 * racer.speed) % 1;
      if (previous > 0.88 && racer.progress < 0.16) {
        racer.lap += 1;
        if (racer.lap > track.laps) {
          racer.finished = true;
          finishOrder.push(racer.key);
        }
      }
    });
  }

  if (finishOrder.length !== racers.length) fail('Race simulation softlocked', { finishOrder, mode, raceIndex, track: track.key });
  return finishOrder;
};

validateItems();
if (RACE_TRACKS.length !== Object.keys(REQUIRED_TRACKS).length) {
  fail('Race track count mismatch', {
    actual: RACE_TRACKS.length,
    expected: Object.keys(REQUIRED_TRACKS).length,
  });
}

const summaries = RACE_TRACKS.map((track) => {
  validateTrack(track);
  const runs = [];
  for (let raceIndex = 0; raceIndex < 3; raceIndex += 1) {
    runs.push({ mode: 'free-switch', order: simulateRace(track, raceIndex, 'free-switch') });
    runs.push({ mode: 'vehicle-restricted', order: simulateRace(track, raceIndex, 'vehicle-restricted') });
  }
  return {
    hazards: [...new Set(track.hazards.map((hazard) => hazard.type))],
    key: track.key,
    runs,
    signature: track.signatureItem.key,
  };
});

console.log(JSON.stringify({ itemCount: ITEM_DEFINITIONS.length, status: 'ok', tracks: summaries }, null, 2));
