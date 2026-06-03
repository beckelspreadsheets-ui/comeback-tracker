import {
  CircleDot,
  Shield,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import * as THREE from 'three';
import { FLIGHT_ALTITUDE_LIMITS } from './physics/kartTuning.js';
import {
  TRACK_SCALE,
  layerOffset,
} from './track/trackGeometry.js';

const { cruise: FLIGHT_CRUISE_ALTITUDE } = FLIGHT_ALTITUDE_LIMITS;

const wrap01 = (value) => ((value % 1) + 1) % 1;

export const BALLOON_TYPES = [
  {
    color: '#ef4444',
    icon: Target,
    key: 'red',
    labels: ['Pulse Shot', 'Homing Shot', 'Triple Shot'],
  },
  {
    color: '#2cc8ff',
    icon: Zap,
    key: 'blue',
    labels: ['Boost Burst', 'Hot Boost', 'Super Boost'],
  },
  {
    color: '#4ade80',
    icon: CircleDot,
    key: 'green',
    labels: ['Slick Trap', 'Bubble Trap', 'Mine Trap'],
  },
  {
    color: '#ffd34f',
    icon: Shield,
    key: 'yellow',
    labels: ['Guard', 'Strong Guard', 'Surge Guard'],
  },
  {
    color: '#c879ff',
    icon: Sparkles,
    key: 'rainbow',
    labels: ['Tow Beam', 'Magnet Beam', 'Warp Beam'],
  },
];

export const BALLOON_BY_KEY = new Map(BALLOON_TYPES.map((item) => [item.key, item]));

export const createRaceState = (compiled, profile, defaultVehicle) => {
  const start = compiled.pointAt(compiled.startProgress || 0);
  const playerPosition = start.point.clone();

  const player = {
    bananas: 0,
    bestLap: null,
    blindTimer: 0,
    boostTier: 0,
    boostTimer: 0,
    controlFlipTimer: 0,
    doubleSlotUses: 0,
    driftActive: false,
    driftCharge: 0,
    driftDirection: 0,
    driftHopTimer: 0,
    finished: false,
    finishTime: null,
    flightAltitude: defaultVehicle === 'plane' ? FLIGHT_CRUISE_ALTITUDE : 0,
    flightPitch: 0,
    flightRoll: 0,
    flightVerticalVelocity: 0,
    heading: Math.atan2(start.tangent.x, start.tangent.z),
    heldBalloon: null,
    heldItem: null,
    hitTimer: 0,
    invincibleTimer: 0,
    jumpCooldown: 0,
    jumpHeight: 0,
    jumpVelocity: 0,
    landingTimer: 0,
    lap: 1,
    lapStartTime: 0,
    lapSplits: [],
    layer: 'ground',
    liftDisabledTimer: 0,
    lightningRodTimer: 0,
    magnetTimer: 0,
    perfectBoostTimer: 0,
    planeBob: 0,
    polarity: 1,
    polaritySwapTimer: 0,
    position: playerPosition,
    progress: start.progress,
    rank: 1,
    rareNextPickup: false,
    secondaryHeldItem: null,
    shieldTimer: 0,
    speed: 0,
    steerInput: 0,
    switchLockedUntil: 0,
    stuckProbePosition: playerPosition.clone(),
    stuckRecoveryCooldown: 0,
    stuckTimer: 0,
    transformTimer: 0,
    vehicleMode: defaultVehicle,
    velocity: start.tangent.clone().multiplyScalar(0),
  };

  const rivals = (compiled.aiRivals || []).map((rival, index) => {
    const sample = compiled.pointAt((compiled.startProgress || 0) + 0.018 * (index + 1));
    const laneNormal = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x);
    const lane = [-0.24, 0, 0.24][index % 3] * compiled.roadWidth;
    return {
      accent: rival.accent,
      ai: rival,
      color: rival.color,
      finished: false,
      finishTime: null,
      hitTimer: 0,
      lap: 1,
      lane,
      layer: 'ground',
      liftDisabledTimer: 0,
      name: rival.name,
      polarity: 1,
      polaritySwapTimer: 0,
      position: sample.point.clone().addScaledVector(laneNormal, lane),
      progress: sample.progress,
      rank: index + 2,
      signatureUsed: false,
      speed: 26 + index * 1.8,
      vehicleMode: defaultVehicle,
      wobble: index * 1.3,
    };
  });

  const bananaEntries =
    compiled.bananaPlacements ||
    Array.from({ length: compiled.bananaCount || 18 }, (_, index) => ({
      progress: wrap01(0.035 + index * (0.94 / Math.max(1, compiled.bananaCount || 18)) + (index % 3) * 0.008),
    }));

  const bananas = bananaEntries.map((entry, index) => {
    const progress = wrap01(typeof entry === 'number' ? entry : entry.progress);
    const sample = compiled.pointAt(progress);
    const normalAtPoint = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x);
    return {
      cooldown: 0,
      position: sample.point.clone().addScaledVector(
        normalAtPoint,
        (typeof entry === 'number' ? ((index % 3) - 1) * 0.18 : entry.side || 0) * compiled.roadWidth
      ),
      progress,
    };
  });

  const balloons = (compiled.itemBoxPlacements || []).map((box, index) => {
    const sample = compiled.pointAt(box.progress);
    const normalAtPoint = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x);
    const type = BALLOON_TYPES[index % BALLOON_TYPES.length];
    const offset = (box.side ?? (index % 2 ? 1 : -1) * 0.2) * compiled.roadWidth + layerOffset(box.layer, compiled.roadWidth);
    return {
      box,
      cooldown: 0,
      position: sample.point.clone().addScaledVector(normalAtPoint, offset),
      progress: box.progress,
      type,
    };
  });

  const zippers = (compiled.boostPads || []).map((entry, index) => {
    const progress = typeof entry === 'number' ? entry : entry.progress;
    const sample = compiled.pointAt(progress);
    const normalAtPoint = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x);
    return {
      cooldown: 0,
      index,
      position: sample.point.clone().addScaledVector(
        normalAtPoint,
        (typeof entry === 'number' ? 0 : entry.side || 0) * compiled.roadWidth + layerOffset(entry.layer, compiled.roadWidth)
      ),
      progress,
      tangent: sample.tangent.clone(),
    };
  });

  const flightGates = compiled.kartOnly || compiled.courseV2?.kartOnly ? [] : Array.from({ length: 10 }, (_, index) => {
    const progress = wrap01(0.045 + index * 0.096);
    const sample = compiled.pointAt(progress);
    return {
      altitude: FLIGHT_CRUISE_ALTITUDE + ((index % 3) - 1) * 2.2,
      cooldown: 0,
      index,
      position: sample.point.clone(),
      progress,
      tangent: sample.tangent.clone(),
    };
  });

  return {
    bananas,
    balloons,
    defaultVehicle,
    droppedBananas: [],
    droppedHazards: [],
    eventCooldowns: {},
    eventFlags: {},
    eventMessages: [],
    flightGates,
    finished: false,
    lastVehicleChange: 0,
    player,
    profile,
    rivals,
    switchPads: compiled.switchPads.map((pad) => {
      const sample = compiled.pointAt(pad.progress);
      const normalAtPoint = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x);
      return {
        ...pad,
        cooldown: 0,
        position: sample.point.clone().addScaledVector(normalAtPoint, layerOffset(pad.layer, compiled.roadWidth)),
        tangent: sample.tangent.clone(),
      };
    }),
    trackHazards: compiled.hazardPlacements.map((hazard) => {
      const sample = compiled.pointAt(hazard.progress);
      const normalAtPoint = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x);
      return {
        ...hazard,
        cooldown: 0,
        eventPulse: 0,
        position: sample.point.clone().addScaledVector(
          normalAtPoint,
          (compiled.courseV2 ? hazard.side || 0 : (hazard.side || 0) * TRACK_SCALE) +
            layerOffset(hazard.layer, compiled.roadWidth)
        ),
        tangent: sample.tangent.clone(),
      };
    }),
    time: 0,
    cameraShakeTimer: 0,
    lastPlayerRank: 1,
    positionNotice: null,
    screenFlashTimer: 0,
    zippers,
  };
};
