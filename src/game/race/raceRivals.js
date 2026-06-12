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
const vectorLength = (vector) => (typeof vector?.length === 'function' ? vector.length() : 0);
const signedWrapDelta = (from = 0, to = 0) => {
  let delta = wrap01(to) - wrap01(from);
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  return delta;
};

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
  const packProgressOffsets = [0.0025, 0.005, 0.008];
  const packLanes = [-0.22, 0.14, 0.28];
  race.rivals.forEach((rival, index) => {
    const sample = compiled.pointAt(race.player.progress + (packProgressOffsets[index] ?? 0.018));
    const normalAtPoint = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x);
    const lane = packLanes[index % packLanes.length] * compiled.roadWidth;
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

export const rivalPressureForFrame = ({
  ai = {},
  compiled = {},
  dt = 0,
  index = 0,
  playtest = {},
  player = {},
  profile = {},
  rival = {},
  rivalVehicle = {},
  scoreGap = 0,
} = {}) => {
  const aggression = clamp(ai.aggression ?? 0.34, 0, 1);
  const patience = clamp(ai.patience ?? 0.7, 0, 1);
  const maxSpeed = rivalVehicle.maxSpeed || 0;
  const playerSpeed = Math.max(vectorLength(player.velocity), player.speed || 0);
  const baseMultiplier =
    0.76 + index * 0.025 + (profile.level || 0) * 0.002 + aggression * 0.12 - patience * 0.025;
  const rubberband = scoreGap >= 0 ? clamp(scoreGap * 0.72, 0, 0.34) : clamp(scoreGap * 0.9, -0.34, 0);
  let desiredSpeed = maxSpeed * (baseMultiplier + rubberband);

  if (scoreGap < -0.025 && playerSpeed > 0.1) {
    desiredSpeed = Math.min(desiredSpeed, playerSpeed + 7 + index * 2 + aggression * 10);
  }

  if (scoreGap > 0.1) {
    desiredSpeed = Math.max(desiredSpeed, maxSpeed * (1.02 + aggression * 0.18));
  }

  let progressCorrection = null;
  const scriptedAutoplay = playtest?.enabled && playtest.mode !== 'visual-kart';
  if (scriptedAutoplay && compiled.totalLength > 0) {
    const scriptedRate = playtest.mode === 'vehicle-restricted' ? 0.86 : 0.94;
    const scriptedSpeed = compiled.totalLength * scriptedRate;
    const targetAhead = [0.018, 0.035, 0.052][index % 3];
    const targetProgress = wrap01((player.progress || 0) + targetAhead);
    const targetDelta = signedWrapDelta(rival.progress || 0, targetProgress);
    desiredSpeed =
      scoreGap > -0.08
        ? Math.max(desiredSpeed, scriptedSpeed * (1 + index * 0.018))
        : Math.min(desiredSpeed, scriptedSpeed * 0.92);
    if (Math.abs(targetDelta) > 0.025) {
      progressCorrection = {
        blend: clamp(dt * 1.35, 0, 0.22),
        targetProgress,
      };
    }
  }

  return {
    desiredSpeed,
    progressCorrection,
    scoreGap,
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
    const rivalVehicle = vehicles[rival.vehicleMode || defaultVehicle] || vehicles[defaultVehicle] || vehicles.kart || {
      maxSpeed: 0,
    };
    const pressure = rivalPressureForFrame({
      ai: rival.ai || compiled.aiRivals?.[index],
      compiled,
      dt,
      index,
      playtest,
      player: race.player,
      profile,
      rival,
      rivalVehicle,
      scoreGap: scoreRacer(race.player) - scoreRacer(rival),
    });
    const desiredSpeed = pressure.desiredSpeed;
    if (rival.hitTimer > 0) {
      rival.hitTimer = Math.max(0, rival.hitTimer - dt);
      rival.speed *= Math.max(0, 1 - dt * 1.5);
    } else {
      rival.speed += (desiredSpeed - rival.speed) * clamp(dt * 0.75, 0, 1);
    }
    const previousProgress = rival.progress;
    rival.progress = wrap01(previousProgress + (rival.speed * dt) / compiled.totalLength);
    if (pressure.progressCorrection) {
      rival.progress = wrap01(
        rival.progress + signedWrapDelta(rival.progress, pressure.progressCorrection.targetProgress) * pressure.progressCorrection.blend
      );
    }
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
        if (playtest?.noFinish) {
          rival.lap = 1;
          rival.finishTime = null;
        } else {
          rival.finished = true;
          rival.finishTime = race.time;
          finishedCount += 1;
        }
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
