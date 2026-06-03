import * as THREE from 'three';
import { layerOffset as routeLayerOffset } from './track/trackGeometry.js';

export const RIVAL_ROUTE_LAYER_SCORE = {
  air: { plane: 1.3, hover: 0.55, kart: 0.2 },
  ground: { kart: 1.2, hover: 0.95, plane: 0.35 },
  hybrid: { hover: 1.05, kart: 0.78, plane: 0.82 },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrap01 = (value) => ((value % 1) + 1) % 1;
const distance2D = (a = {}, b = {}) => Math.hypot((a.x || 0) - (b.x || 0), (a.z || 0) - (b.z || 0));

export const chooseRaceRivalRouteLayer = ({
  aiRivals = [],
  defaultVehicle = 'kart',
  index = 0,
  rival = {},
  routeLayers = {},
  vehicleLayerScore = RIVAL_ROUTE_LAYER_SCORE,
} = {}) => {
  const entries = Object.values(routeLayers || {});
  if (!entries.length) return 'ground';

  const heldBonus = rival.heldItem ? 0.08 : 0;
  const risk = aiRivals?.[index]?.risk || 0.45;
  const scored = entries.map((layer) => {
    const vehicleScore = vehicleLayerScore[layer.key]?.[rival.vehicleMode || defaultVehicle] ?? 0.6;
    const riskBias = risk * (layer.key === 'air' ? 0.18 : layer.key === 'hybrid' ? 0.1 : 0);
    return {
      key: layer.key,
      score: (layer.aiWeight || 1) + vehicleScore + riskBias + heldBonus,
      vehiclePreference: layer.vehiclePreference,
    };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.key || 'ground';
};

export const maybeUseRivalSignature = ({
  distanceBetween = distance2D,
  player,
  rival,
  triggerHazardByType = () => {},
} = {}) => {
  const signature = rival?.ai?.signature;
  if (!signature || rival.signatureUsed) {
    return {
      signature,
      used: false,
    };
  }

  if (signature === 'dock-bell' && rival.rank === 2 && rival.progress > 0.34) {
    triggerHazardByType('seagulls', 3.4, 'Dock bell');
    rival.signatureUsed = true;
  }
  if (signature === 'static-bait' && rival.progress > 0.42 && distanceBetween(rival.position, player?.position) < 34) {
    triggerHazardByType('staticCharge', 4.2, 'Static charge');
    rival.signatureUsed = true;
  }
  if (signature === 'early-drill' && rival.rank >= 4 && rival.progress > 0.28) {
    triggerHazardByType('mineCart', 3.2, 'Drill early');
    rival.signatureUsed = true;
  }

  return {
    signature,
    used: Boolean(rival.signatureUsed),
  };
};

const updateVisualRivalCluster = ({
  compiled,
  race,
} = {}) => {
  race.rivals.forEach((rival, index) => {
    const sample = compiled.pointAt(race.player.progress + 0.018 * (index + 1));
    const normalAtPoint = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x);
    const lane = [-0.24, 0, 0.24][index % 3] * compiled.roadWidth;
    rival.finished = false;
    rival.vehicleMode = 'kart';
    rival.layer = 'ground';
    rival.progress = sample.progress;
    rival.position.copy(sample.point).addScaledVector(normalAtPoint, lane);
    rival.heading = Math.atan2(sample.tangent.x, sample.tangent.z);
    rival.speed = 44;
  });
  return {
    mode: 'visual-cluster',
    updatedCount: race.rivals.length,
  };
};

export const updateRaceRivalsForFrame = ({
  compiled,
  defaultVehicle = 'kart',
  distanceBetween = distance2D,
  dt = 0,
  layerOffset = routeLayerOffset,
  playtest = {},
  profile = {},
  race,
  scoreRacer = () => 0,
  setVehicleMode = () => false,
  triggerHazardByType = () => {},
  useVisualRivalCluster = () => false,
  vehicles = {},
} = {}) => {
  if (!race || !compiled) {
    return {
      finishedCount: 0,
      signatureUses: [],
      updatedCount: 0,
    };
  }

  if (useVisualRivalCluster(playtest)) {
    return updateVisualRivalCluster({ compiled, race });
  }

  const signatureUses = [];
  let finishedCount = 0;
  let updatedCount = 0;

  race.rivals.forEach((rival, index) => {
    if (rival.finished) return;
    const signatureUse = maybeUseRivalSignature({
      distanceBetween,
      player: race.player,
      rival,
      triggerHazardByType,
    });
    if (signatureUse.used) signatureUses.push(signatureUse);

    rival.invincibleTimer = Math.max(0, (rival.invincibleTimer || 0) - dt);
    rival.liftDisabledTimer = Math.max(0, (rival.liftDisabledTimer || 0) - dt);
    rival.polaritySwapTimer = Math.max(0, (rival.polaritySwapTimer || 0) - dt);
    if (rival.polaritySwapTimer <= 0) rival.polarity = 1;
    rival.layer = chooseRaceRivalRouteLayer({
      aiRivals: compiled.aiRivals,
      defaultVehicle,
      index,
      rival,
      routeLayers: compiled.routeLayers,
    });
    const layer = compiled.routeLayers?.[rival.layer];
    if (layer?.vehiclePreference && (rival.switchLockedUntil || 0) <= race.time) {
      setVehicleMode(rival, layer.vehiclePreference, { force: true });
    }
    const rubberband = clamp((scoreRacer(race.player) - scoreRacer(rival)) * 0.12, -0.06, 0.08);
    const rivalVehicle = vehicles[rival.vehicleMode || defaultVehicle] || vehicles[defaultVehicle] || vehicles.kart || {
      maxSpeed: 0,
    };
    const desiredSpeed =
      (rivalVehicle.maxSpeed * (0.82 + index * 0.035 + (profile.level || 0) * 0.002 + rubberband));
    if (rival.hitTimer > 0) {
      rival.hitTimer = Math.max(0, rival.hitTimer - dt);
      rival.speed *= Math.max(0, 1 - dt * 1.5);
    } else {
      rival.speed += (desiredSpeed - rival.speed) * clamp(dt * 0.75, 0, 1);
    }
    const previousProgress = rival.progress;
    rival.progress = wrap01(previousProgress + (rival.speed * dt) / compiled.totalLength);
    const sample = compiled.pointAt(rival.progress);
    const normalAtPoint = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x);
    rival.wobble += dt * (1.1 + index * 0.2);
    rival.position.copy(sample.point).addScaledVector(
      normalAtPoint,
      rival.lane +
        layerOffset(rival.layer, compiled.roadWidth) +
        Math.sin(rival.wobble) * compiled.roadWidth * 0.045
    );
    if (previousProgress > 0.82 && rival.progress < 0.18) {
      rival.lap += 1;
      if (rival.lap > compiled.laps) {
        rival.finished = true;
        rival.finishTime = race.time;
        finishedCount += 1;
      }
    }
    updatedCount += 1;
  });

  return {
    finishedCount,
    mode: 'standard',
    signatureUses,
    updatedCount,
  };
};
