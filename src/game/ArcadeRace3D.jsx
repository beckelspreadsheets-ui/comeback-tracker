import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronsRight,
  CircleDot,
  Gauge,
  Plane,
  RotateCcw,
  Shield,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import * as THREE from 'three';
import raceBackdrop from '../assets/game/comeback-city-race-backdrop-v2.png';
import {
  COMMON_BOX_ITEMS,
  getItemDefinition,
  itemAllowedForVehicle,
  itemAllowedOnTrack,
  itemLabel,
} from './raceItems.js';
import { getHazardDefinition, vehicleMatchesFilter } from './raceHazards.js';

const SOURCE_WORLD = { h: 768, w: 1024 };
const TRACK_SCALE = 0.32;
const ROAD_WIDTH_MULTIPLIER = 1.18;
const ROAD_WIDTH_MIN = 26;
const SHOULDER_WIDTH = 5.2;
const FLIGHT_MIN_ALTITUDE = 7.5;
const FLIGHT_CRUISE_ALTITUDE = 17;
const FLIGHT_MAX_ALTITUDE = 34;
const UP = new THREE.Vector3(0, 1, 0);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrap01 = (value) => ((value % 1) + 1) % 1;
const distance2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const signedAngleDelta = (target, current) => {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
};

const VEHICLES = {
  kart: {
    label: 'Kart',
    acceleration: 46,
    brake: 54,
    boostMax: 66,
    cameraDistance: 54,
    cameraHeight: 24,
    driftCharge: 1.08,
    driftGrip: 5.6,
    driftSlip: 9.5,
    driftTurn: 1.42,
    grip: 13.5,
    hover: 0,
    maxSpeed: 50,
    offroad: 0.72,
    reverse: 16,
    steer: 2.18,
  },
  hover: {
    label: 'Hover',
    acceleration: 39,
    brake: 42,
    boostMax: 64,
    cameraDistance: 57,
    cameraHeight: 25,
    driftCharge: 0.94,
    driftGrip: 3.2,
    driftSlip: 13,
    driftTurn: 1.24,
    grip: 6.8,
    hover: 1.25,
    maxSpeed: 47,
    offroad: 0.9,
    reverse: 18,
    steer: 1.95,
  },
  plane: {
    label: 'Plane',
    acceleration: 39,
    brake: 34,
    boostMax: 78,
    cameraDistance: 74,
    cameraHeight: 36,
    driftCharge: 0.78,
    driftGrip: 2.4,
    driftSlip: 6,
    driftTurn: 1.08,
    grip: 4.8,
    hover: 0,
    maxSpeed: 62,
    offroad: 1,
    reverse: 10,
    steer: 1.52,
  },
};

const DEFAULT_VEHICLE_BY_STYLE = {
  chaotic: 'hover',
  puzzle: 'plane',
  technical: 'kart',
};

const BALLOON_TYPES = [
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

const BALLOON_BY_KEY = new Map(BALLOON_TYPES.map((item) => [item.key, item]));

const ITEM_COLORS = {
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

const VEHICLE_ORDER = ['kart', 'hover', 'plane'];
const VEHICLE_LAYER_SCORE = {
  air: { plane: 1.3, hover: 0.55, kart: 0.2 },
  ground: { kart: 1.2, hover: 0.95, plane: 0.35 },
  hybrid: { hover: 1.05, kart: 0.78, plane: 0.82 },
};

const vehicleMatches = (vehicleMode, expected) =>
  expected === 'both' || expected === vehicleMode || (expected === 'kart' && vehicleMode === 'hover');

const makeHeldItem = (itemKey, level = 1, type = null) => {
  const definition = getItemDefinition(itemKey);
  const color = ITEM_COLORS[itemKey] || type?.color || '#f7fbff';
  return {
    category: definition?.category || 'unknown',
    color,
    itemKey,
    key: itemKey,
    label: itemLabel(itemKey),
    level: clamp(level, 1, 3),
    rarity: definition?.rarity || 'common',
    vehicleRestriction: definition?.vehicleRestriction || 'both',
  };
};

const layerAltitude = (layerKey) => (layerKey === 'air' ? FLIGHT_CRUISE_ALTITUDE : layerKey === 'hybrid' ? 7.5 : 0);
const layerOffset = (layerKey, roadWidth) =>
  layerKey === 'air' ? roadWidth * 0.42 : layerKey === 'hybrid' ? -roadWidth * 0.34 : 0;

const toWorldPoint = (point, y = 0) =>
  new THREE.Vector3(
    (point.x - SOURCE_WORLD.w / 2) * TRACK_SCALE,
    y,
    (point.y - SOURCE_WORLD.h / 2) * TRACK_SCALE
  );

const pointOnSegment = (segment, t) => ({
  point: new THREE.Vector3(
    segment.a.x + segment.dx * t,
    0,
    segment.a.z + segment.dz * t
  ),
  tangent: segment.tangent.clone(),
});

const compileTrack3D = (track) => {
  const points = track.points.map((point) => toWorldPoint(point));
  const segments = [];
  let totalLength = 0;

  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.max(0.001, Math.hypot(dx, dz));
    segments.push({
      a,
      b,
      dx,
      dz,
      length,
      start: totalLength,
      tangent: new THREE.Vector3(dx / length, 0, dz / length),
    });
    totalLength += length;
  }

  const bounds = points.reduce(
    (acc, point) => ({
      maxX: Math.max(acc.maxX, point.x),
      maxZ: Math.max(acc.maxZ, point.z),
      minX: Math.min(acc.minX, point.x),
      minZ: Math.min(acc.minZ, point.z),
    }),
    { maxX: -Infinity, maxZ: -Infinity, minX: Infinity, minZ: Infinity }
  );

  const pointAt = (progress) => {
    const target = wrap01(progress) * totalLength;
    const segment =
      segments.find((item) => target >= item.start && target <= item.start + item.length) ||
      segments[segments.length - 1];
    const t = clamp((target - segment.start) / segment.length, 0, 1);
    return {
      ...pointOnSegment(segment, t),
      progress: target / totalLength,
    };
  };

  const nearest = (position) => {
    let best = null;
    segments.forEach((segment) => {
      const ax = position.x - segment.a.x;
      const az = position.z - segment.a.z;
      const t = clamp((ax * segment.dx + az * segment.dz) / (segment.length * segment.length), 0, 1);
      const sample = pointOnSegment(segment, t);
      const dist = distance2D(position, sample.point);
      if (!best || dist < best.distance) {
        const rawNormal = new THREE.Vector3(-segment.tangent.z, 0, segment.tangent.x);
        const side =
          (position.x - sample.point.x) * rawNormal.x + (position.z - sample.point.z) * rawNormal.z >= 0
            ? 1
            : -1;
        best = {
          distance: dist,
          normal: rawNormal.multiplyScalar(side),
          point: sample.point,
          progress: (segment.start + segment.length * t) / totalLength,
          tangent: segment.tangent.clone(),
        };
      }
    });
    return best;
  };

  const roadWidth = Math.max(ROAD_WIDTH_MIN, track.width * TRACK_SCALE * ROAD_WIDTH_MULTIPLIER);
  const sourceLayers =
    track.layers || {
      air: { aiWeight: 0.82, itemBoxes: [], lineOffset: 0.42, vehiclePreference: 'plane' },
      ground: { aiWeight: 1, itemBoxes: track.itemBoxes || [], lineOffset: 0, vehiclePreference: 'kart' },
      hybrid: { aiWeight: 0.9, itemBoxes: [], lineOffset: -0.34, vehiclePreference: 'hover' },
    };

  const routeLayers = Object.fromEntries(
    Object.entries(sourceLayers).map(([key, layer]) => [
      key,
      {
        aiWeight: layer.aiWeight ?? 1,
        hazards: layer.hazards || [],
        itemBoxes: layer.itemBoxes || [],
        key,
        lineOffset: layer.lineOffset ?? (key === 'air' ? 0.42 : key === 'hybrid' ? -0.34 : 0),
        name: layer.name || key,
        vehiclePreference: layer.vehiclePreference || (key === 'air' ? 'plane' : key === 'hybrid' ? 'hover' : 'kart'),
      },
    ])
  );

  const normalizeProgressEntry = (entry, layerKey, index, defaults = {}) => {
    const progress = typeof entry === 'number' ? entry : entry.progress;
    return {
      ...defaults,
      ...(typeof entry === 'number' ? {} : entry),
      index,
      layer: layerKey,
      progress: wrap01(Number(progress) || 0),
    };
  };

  const itemBoxPlacements = Object.values(routeLayers).flatMap((layer) =>
    (layer.itemBoxes || []).map((entry, index) =>
      normalizeProgressEntry(entry, layer.key, index, {
        pool: layer.itemPool,
        rare: false,
      })
    )
  );

  const hazardPlacements = [
    ...(track.hazards || []).map((entry, index) => normalizeProgressEntry(entry, entry.layer || 'ground', index)),
    ...Object.values(routeLayers).flatMap((layer) =>
      (layer.hazards || []).map((entry, index) => normalizeProgressEntry(entry, layer.key, index))
    ),
  ].map((hazard, index) => ({
    active: true,
    definition: getHazardDefinition(hazard.type),
    key: hazard.key || `${hazard.type || 'hazard'}-${index}`,
    radius: hazard.radius || 8,
    telegraphTime: hazard.telegraphTime ?? 0.8,
    ...hazard,
  }));

  const switchPads = (track.switchPads || []).map((entry, index) =>
    normalizeProgressEntry(entry, entry.layer || 'ground', index, {
      radius: 7,
      targetVehicle: entry.targetVehicle || entry.vehicle || 'kart',
    })
  );

  const vehicleZones = (track.vehicleZones || []).map((entry, index) =>
    normalizeProgressEntry(entry, entry.layer || 'ground', index, {
      action: entry.action || 'auto-switch',
      radius: entry.radius || 12,
      vehicle: entry.vehicle || 'kart',
    })
  );

  const vehicleLocks = (track.vehicleLocks || []).map((entry, index) => ({
    ...entry,
    index,
    end: wrap01(Number(entry.end) || 0),
    start: wrap01(Number(entry.start) || 0),
  }));

  return {
    ...track,
    bananaCount: track.bananaCount || 18,
    bananaPlacements: track.bananaPlacements || null,
    bounds,
    events: track.events || [],
    hazardPlacements,
    itemBoxPlacements: itemBoxPlacements.length
      ? itemBoxPlacements
      : (track.itemBoxes || []).map((entry, index) => normalizeProgressEntry(entry, 'ground', index)),
    routeLayers,
    nearest,
    pointAt,
    points,
    roadWidth,
    segments,
    switchPads,
    totalLength,
    vehicleLocks,
    vehicleZones,
  };
};

const scoreRacer = (racer) => (racer.lap - 1) + racer.progress + (racer.finished ? 20 : 0);
const ordinal = (value) =>
  value === 1 ? '1st' : value === 2 ? '2nd' : value === 3 ? '3rd' : `${value}th`;
const formatTime = (seconds = 0) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00.00';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(2).padStart(5, '0')}`;
};

const createBasicMaterial = (color, options = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    metalness: 0.02,
    roughness: 0.68,
    ...options,
  });

const createVehicleModel = ({ accent = '#2cc8ff', color = '#ef4334', scale = 1, suit = '#202837' }) => {
  const group = new THREE.Group();
  group.scale.setScalar(scale);

  const bodyMat = createBasicMaterial(color, { emissive: color, emissiveIntensity: 0.08 });
  const accentMat = createBasicMaterial(accent, { emissive: accent, emissiveIntensity: 0.36 });
  const darkMat = createBasicMaterial('#111827');
  const trimMat = createBasicMaterial('#f6fbff');
  const suitMat = createBasicMaterial(suit);

  const addBox = (size, position, material = bodyMat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
    mesh.position.set(position.x || 0, position.y || 0, position.z || 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  addBox({ x: 5.6, y: 1.25, z: 8.2 }, { y: 1.45, z: 0 }, bodyMat);
  addBox({ x: 4.2, y: 0.8, z: 4.4 }, { y: 2.25, z: 2.3 }, accentMat);
  addBox({ x: 3.2, y: 1.75, z: 2.8 }, { y: 3.1, z: -1.35 }, darkMat);
  addBox({ x: 6.6, y: 0.38, z: 1.1 }, { y: 2.12, z: 4.65 }, trimMat);
  addBox({ x: 6.4, y: 0.36, z: 0.95 }, { y: 1.16, z: -4.75 }, darkMat);
  addBox({ x: 2.6, y: 0.36, z: 1.1 }, { y: 2.54, z: 4.78 }, accentMat);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(3.05, 4.2, 4), bodyMat);
  nose.position.set(0, 1.48, 5.1);
  nose.rotation.x = Math.PI / 2;
  nose.rotation.y = Math.PI / 4;
  nose.castShadow = true;
  group.add(nose);

  const driver = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.95, 1.5, 7), suitMat);
  torso.position.y = 3.85;
  const helmet = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), accentMat);
  helmet.position.y = 5.0;
  driver.position.z = -1.7;
  driver.add(torso, helmet);
  group.add(driver);

  const wheelGroup = new THREE.Group();
  const wheelMat = createBasicMaterial('#0b1019');
  const hubMat = createBasicMaterial(accent, { emissive: accent, emissiveIntensity: 0.25 });
  const wheels = [];
  [
    [-3.3, 0.9, -3.0],
    [3.3, 0.9, -3.0],
    [-3.3, 0.9, 3.3],
    [3.3, 0.9, 3.3],
  ].forEach(([x, y, z]) => {
    const wheel = new THREE.Group();
    wheel.position.set(x, y, z);
    wheel.userData.front = z > 0;
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 1.15, 12), wheelMat);
    tire.rotation.z = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.28, 8), hubMat);
    hub.rotation.z = Math.PI / 2;
    wheel.add(tire, hub);
    wheelGroup.add(wheel);
    wheels.push(wheel);
  });
  group.add(wheelGroup);

  const hoverGroup = new THREE.Group();
  hoverGroup.visible = false;
  [-2.7, 2.7].forEach((x) => {
    const fan = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.18, 6, 18), accentMat);
    fan.position.set(x, 0.85, -2.2);
    fan.rotation.x = Math.PI / 2;
    hoverGroup.add(fan);
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 18),
      new THREE.MeshBasicMaterial({ color: accent, opacity: 0.24, transparent: true })
    );
    glow.position.set(x, 0.18, -2.2);
    glow.rotation.x = -Math.PI / 2;
    hoverGroup.add(glow);
  });
  group.add(hoverGroup);

  const planeGroup = new THREE.Group();
  planeGroup.visible = false;
  const wing = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.34, 2.0), accentMat);
  wing.position.set(0, 2.2, -1.2);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.32, 1.4), accentMat);
  tail.position.set(0, 3.35, -5.2);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.2, 1.2), accentMat);
  fin.position.set(0, 4.2, -5.2);
  planeGroup.add(wing, tail, fin);
  group.add(planeGroup);

  const boostFlame = new THREE.Group();
  boostFlame.visible = false;
  [-1.1, 1.1].forEach((x) => {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 3.2, 6),
      createBasicMaterial('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 0.9 })
    );
    flame.position.set(x, 1.2, -5.2);
    flame.rotation.x = -Math.PI / 2;
    boostFlame.add(flame);
  });
  group.add(boostFlame);

  const setMode = (mode) => {
    wheelGroup.visible = mode !== 'plane';
    hoverGroup.visible = mode === 'hover';
    planeGroup.visible = mode === 'plane';
  };

  return { boostFlame, group, setMode, wheels };
};

const createBillboardText = (text, color = '#fff8d5') => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(7, 17, 27, 0.82)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  ctx.font = '900 42px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2 + 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ depthWrite: false, map: texture, opacity: 0.82, transparent: true })
  );
  sprite.scale.set(16, 4, 1);
  return sprite;
};

const createRaceState = (compiled, profile, defaultVehicle) => {
  const start = compiled.pointAt(compiled.startProgress || 0);
  const normal = new THREE.Vector3(-start.tangent.z, 0, start.tangent.x);
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
    transformTimer: 0,
    vehicleMode: defaultVehicle,
    velocity: start.tangent.clone().multiplyScalar(0),
  };

  const rivals = (compiled.aiRivals || []).map((rival, index) => {
    const sample = compiled.pointAt((compiled.startProgress || 0) - 0.035 * (index + 1));
    const laneNormal = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x);
    const lane = [0.32, -0.32, 0.18][index % 3] * compiled.roadWidth;
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

  const zippers = (compiled.boostPads || []).map((progress, index) => {
    const sample = compiled.pointAt(progress);
    return {
      cooldown: 0,
      index,
      position: sample.point.clone(),
      progress,
      tangent: sample.tangent.clone(),
    };
  });

  const flightGates = Array.from({ length: 10 }, (_, index) => {
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
          (hazard.side || 0) * TRACK_SCALE + layerOffset(hazard.layer, compiled.roadWidth)
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

export const ArcadeRace3D = ({
  command,
  inventory,
  onFinish,
  onInventoryUse,
  profile,
  runId,
  track,
}) => {
  const canvasRef = useRef(null);
  const commandRef = useRef(command);
  const inventoryRef = useRef(inventory);
  const onFinishRef = useRef(onFinish);
  const onInventoryUseRef = useRef(onInventoryUse);
  const localCommandRef = useRef(null);
  const touchRef = useRef({ brake: 0, drift: false, jump: false, steer: 0, throttle: 0 });
  const [telemetry, setTelemetry] = useState({
    altitude: 0,
    bananas: 0,
    boost: 0,
    cameraFlash: 0,
    drift: 0,
    doubleSlotUses: 0,
    heldBalloon: null,
    itemTier: 0,
    jump: 0,
    lap: 1,
    lapSplits: [],
    perfect: false,
    place: 1,
    positionNotice: null,
    rareNextPickup: false,
    secondaryHeldItem: null,
    shield: 0,
    speed: 0,
    speedRatio: 0,
    time: 0,
    upgradeAvailable: false,
    vehicleMode: DEFAULT_VEHICLE_BY_STYLE[track.raceStyle] || 'kart',
  });

  useEffect(() => {
    commandRef.current = command;
  }, [command]);

  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    onInventoryUseRef.current = onInventoryUse;
  }, [onInventoryUse]);

  const queueLocalCommand = (type) => {
    localCommandRef.current = { id: Date.now() + Math.random(), type };
  };

  useEffect(() => {
    if (!runId) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const compiled = compileTrack3D(track);
    const defaultVehicle = DEFAULT_VEHICLE_BY_STYLE[compiled.raceStyle] || 'kart';
    const race = createRaceState(compiled, profile, defaultVehicle);
    const keys = new Set();
    const relevantKeys = new Set([
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
    ]);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#59c6ed');
    scene.fog = new THREE.Fog('#bdf6ff', 180, 520);

    const camera = new THREE.PerspectiveCamera(90, 1, 0.25, 520);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas,
      depth: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    scene.add(new THREE.HemisphereLight('#fff8cf', '#1c6d88', 2.8));
    const sun = new THREE.DirectionalLight('#fff2b9', 3.2);
    sun.position.set(-64, 98, -54);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.left = -140;
    sun.shadow.camera.right = 140;
    sun.shadow.camera.top = 140;
    sun.shadow.camera.bottom = -140;
    scene.add(sun);
    const rim = new THREE.DirectionalLight('#63e6ff', 1.2);
    rim.position.set(84, 52, 76);
    scene.add(rim);

    const world = new THREE.Group();
    scene.add(world);

    const textureLoader = new THREE.TextureLoader();
    const backdropTexture = textureLoader.load(raceBackdrop);
    backdropTexture.colorSpace = THREE.SRGBColorSpace;
    backdropTexture.offset.set(0, 0.18);
    backdropTexture.repeat.set(1, 0.78);

    const addBackdrop = (position, rotationY = 0) => {
      const backdrop = new THREE.Mesh(
        new THREE.PlaneGeometry(440, 204),
        new THREE.MeshBasicMaterial({
          depthWrite: false,
          fog: false,
          map: backdropTexture,
          opacity: 0.86,
          side: THREE.DoubleSide,
          toneMapped: false,
          transparent: true,
        })
      );
      backdrop.position.copy(position);
      backdrop.rotation.y = rotationY;
      backdrop.renderOrder = -4;
      world.add(backdrop);
    };
    const bounds = compiled.bounds;
    const trackSpanX = bounds.maxX - bounds.minX;
    const trackSpanZ = bounds.maxZ - bounds.minZ;
    const trackCenterX = (bounds.minX + bounds.maxX) / 2;
    const trackCenterZ = (bounds.minZ + bounds.maxZ) / 2;
    const backdropX = Math.max(230, trackSpanX / 2 + compiled.roadWidth + 95);
    const backdropZ = Math.max(220, trackSpanZ / 2 + compiled.roadWidth + 110);
    addBackdrop(new THREE.Vector3(trackCenterX, 98, trackCenterZ + backdropZ), 0);
    addBackdrop(new THREE.Vector3(trackCenterX + backdropX, 98, trackCenterZ), Math.PI / 2);
    addBackdrop(new THREE.Vector3(trackCenterX - backdropX, 98, trackCenterZ), -Math.PI / 2);

    const groundMat = createBasicMaterial(compiled.grass || '#79c96d');
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.max(500, trackSpanX + 210), Math.max(460, trackSpanZ + 220), 24, 24),
      groundMat
    );
    ground.position.set(trackCenterX, 0, trackCenterZ);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    world.add(ground);

    const asphaltMat = new THREE.MeshStandardMaterial({
      color: compiled.asphalt || '#3d4450',
      flatShading: true,
      metalness: 0,
      roughness: 0.82,
    });
    const curbAMat = createBasicMaterial(compiled.curbA || '#fff6da');
    const curbBMat = createBasicMaterial(compiled.curbB || compiled.accent || '#2cc8ff');
    const curbRedMat = createBasicMaterial('#e2554f');
    const lineMat = createBasicMaterial('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 0.12 });
    const whiteLineMat = createBasicMaterial('#f7fbff');
    const shoulderMat = createBasicMaterial('#586675');
    const railMat = createBasicMaterial('#eef6ff');
    const railPostMat = createBasicMaterial('#202837');

    const addTrackSegment = (segment) => {
      const center = new THREE.Vector3(
        (segment.a.x + segment.b.x) / 2,
        0.08,
        (segment.a.z + segment.b.z) / 2
      );
      const yaw = -Math.atan2(segment.dz, segment.dx);
      const placeLocalBox = (geometry, material, xOffset, zOffset, y, castShadow = false) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(center);
        mesh.rotation.y = yaw;
        mesh.translateX(xOffset);
        mesh.translateZ(zOffset);
        mesh.position.y = y;
        mesh.castShadow = castShadow;
        mesh.receiveShadow = true;
        world.add(mesh);
        return mesh;
      };

      [-1, 1].forEach((side) => {
        placeLocalBox(
          new THREE.BoxGeometry(segment.length + 0.9, 0.16, SHOULDER_WIDTH),
          shoulderMat,
          0,
          side * (compiled.roadWidth / 2 + SHOULDER_WIDTH / 2 + 0.9),
          0.14
        );
      });

      const road = new THREE.Mesh(
        new THREE.BoxGeometry(segment.length + 1.1, 0.24, compiled.roadWidth),
        asphaltMat
      );
      road.position.copy(center);
      road.rotation.y = yaw;
      road.receiveShadow = true;
      world.add(road);

      [-1, 1].forEach((side) => {
        placeLocalBox(
          new THREE.BoxGeometry(segment.length + 0.9, 0.2, 0.34),
          whiteLineMat,
          0,
          side * (compiled.roadWidth / 2 - 1.25),
          0.35
        );
      });

      for (let offset = 3.5; offset < segment.length; offset += 7) {
        const t = offset / segment.length;
        [-1, 1].forEach((side) => {
          const curb = new THREE.Mesh(
            new THREE.BoxGeometry(4.4, 0.36, 1.04),
            Math.floor(offset / 7 + (side > 0 ? 0 : 1)) % 2 === 0 ? curbAMat : curbRedMat
          );
          curb.position.set(segment.a.x + segment.dx * t, 0.38, segment.a.z + segment.dz * t);
          curb.rotation.y = yaw;
          curb.translateZ(side * (compiled.roadWidth / 2 + 0.52));
          curb.castShadow = true;
          curb.receiveShadow = true;
          world.add(curb);
        });
      }

      for (let offset = 7; offset < segment.length; offset += 14) {
        const t = offset / segment.length;
        [-0.58, 0.58].forEach((laneOffset) => {
          const dash = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.09, 0.18), lineMat);
          dash.position.set(segment.a.x + segment.dx * t, 0.39, segment.a.z + segment.dz * t);
          dash.rotation.y = yaw;
          dash.translateZ(laneOffset);
          world.add(dash);
        });

        [-compiled.roadWidth * 0.24, compiled.roadWidth * 0.24].forEach((laneOffset) => {
          const dash = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 0.22), whiteLineMat);
          dash.position.set(segment.a.x + segment.dx * t, 0.38, segment.a.z + segment.dz * t);
          dash.rotation.y = yaw;
          dash.translateZ(laneOffset);
          world.add(dash);
        });
      }

      [-1, 1].forEach((side) => {
        const railZ = side * (compiled.roadWidth / 2 + SHOULDER_WIDTH + 1.2);
        placeLocalBox(new THREE.BoxGeometry(segment.length + 0.8, 0.34, 0.28), railMat, 0, railZ, 1.35, true);
        placeLocalBox(new THREE.BoxGeometry(segment.length + 0.8, 0.28, 0.22), railMat, 0, railZ, 2.15, true);
        for (let offset = 5; offset < segment.length; offset += 18) {
          placeLocalBox(new THREE.BoxGeometry(0.62, 2.2, 0.62), railPostMat, offset - segment.length / 2, railZ, 1.1, true);
        }
      });
    };

    compiled.segments.forEach(addTrackSegment);
    compiled.points.forEach((point, index) => {
      const shoulderCap = new THREE.Mesh(
        new THREE.CylinderGeometry(
          compiled.roadWidth / 2 + SHOULDER_WIDTH + 0.9,
          compiled.roadWidth / 2 + SHOULDER_WIDTH + 0.9,
          0.14,
          28
        ),
        shoulderMat
      );
      shoulderCap.position.set(point.x, 0.08, point.z);
      shoulderCap.receiveShadow = true;
      world.add(shoulderCap);

      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(compiled.roadWidth / 2, compiled.roadWidth / 2, 0.2, 24),
        asphaltMat
      );
      cap.position.set(point.x, 0.1, point.z);
      cap.receiveShadow = true;
      world.add(cap);

      if (index % 2 === 0) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(compiled.roadWidth / 2 + 0.42, 0.2, 4, 24),
          index % 4 === 0 ? curbAMat : curbBMat
        );
        ring.position.set(point.x, 0.31, point.z);
        ring.rotation.x = Math.PI / 2;
        world.add(ring);
      }
    });

    const startSample = compiled.pointAt(compiled.startProgress || 0);
    const startYaw = Math.atan2(startSample.tangent.x, startSample.tangent.z);
    const startSign = createBillboardText('Comeback GP', compiled.accent || '#ffd34f');
    startSign.position.copy(startSample.point.clone().add(new THREE.Vector3(0, 18.5, 0)));
    startSign.rotation.y = startYaw;
    world.add(startSign);

    for (let lane = -2; lane <= 2; lane += 1) {
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.1, compiled.roadWidth / 5),
        createBasicMaterial(lane % 2 === 0 ? '#f7fbff' : '#10151d')
      );
      tile.position.copy(startSample.point);
      tile.position.y = 0.36;
      tile.rotation.y = -Math.atan2(startSample.tangent.z, startSample.tangent.x);
      tile.translateX(lane * 2.5);
      world.add(tile);
    }

    const createBoostPadMesh = (zipper) => {
      const group = new THREE.Group();
      group.position.copy(zipper.position);
      group.position.y = 0.42;
      group.rotation.y = -Math.atan2(zipper.tangent.z, zipper.tangent.x);
      const mat = createBasicMaterial(compiled.accent || '#2cc8ff', {
        emissive: compiled.accent || '#2cc8ff',
        emissiveIntensity: 0.4,
      });
      const base = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.28, compiled.roadWidth * 0.38), mat);
      group.add(base);
      [-3, -1, 1, 3].forEach((x) => {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.12, compiled.roadWidth * 0.26), lineMat);
        stripe.position.set(x, 0.23, 0);
        stripe.rotation.z = 0.55;
        group.add(stripe);
      });
      world.add(group);
      return group;
    };

    const zipperMeshes = race.zippers.map(createBoostPadMesh);

    const bananaMat = createBasicMaterial('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 0.16 });
    const bananaMeshes = race.bananas.map((banana) => {
      const group = new THREE.Group();
      group.position.copy(banana.position);
      group.position.y = 1.25;
      const fruit = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.22, 6, 18, Math.PI * 1.3), bananaMat);
      fruit.rotation.x = Math.PI / 2;
      fruit.rotation.z = -0.8;
      group.add(fruit);
      world.add(group);
      return group;
    });

    const balloonMeshes = race.balloons.map((balloon) => {
      const group = new THREE.Group();
      group.position.copy(balloon.position);
      group.position.y = 3.5;
      const mat = createBasicMaterial(balloon.type.color, {
        emissive: balloon.type.color,
        emissiveIntensity: 0.5,
      });
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.45, 18, 14), mat);
      sphere.scale.y = 1.15;
      const knot = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.75, 5), mat);
      knot.position.y = -1.55;
      knot.rotation.x = Math.PI;
      group.add(sphere, knot);
      world.add(group);
      return group;
    });

    const flightGateMeshes = race.flightGates.map((gate, index) => {
      const group = new THREE.Group();
      const radius = Math.max(7.4, compiled.roadWidth * 0.23);
      const gateColor = index % 2 === 0 ? compiled.accent || '#2cc8ff' : '#2cc8ff';
      const ringMat = new THREE.MeshBasicMaterial({
        color: gateColor,
        depthWrite: false,
        opacity: 0.72,
        transparent: true,
      });
      const glowMat = new THREE.MeshBasicMaterial({
        color: gateColor,
        depthWrite: false,
        opacity: 0.14,
        side: THREE.DoubleSide,
        transparent: true,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.36, 8, 40), ringMat);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.88, 36), glowMat);
      const postMat = createBasicMaterial('#f7fbff', { emissive: gateColor, emissiveIntensity: 0.18 });
      const arrowMat = createBasicMaterial('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 0.42 });

      [-1, 1].forEach((side) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.48, radius * 1.35, 0.48), postMat);
        post.position.set(side * radius * 0.76, -radius * 0.1, 0);
        group.add(post);
      });
      [-1.6, 0, 1.6].forEach((x) => {
        const arrow = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.38, 0.72), arrowMat);
        arrow.position.set(x, -radius * 0.42, 0.06);
        arrow.rotation.z = -0.72;
        group.add(arrow);
      });

      group.add(glow, ring);
      group.position.copy(gate.position);
      group.position.y = gate.altitude;
      group.rotation.y = Math.atan2(gate.tangent.x, gate.tangent.z);
      group.visible = defaultVehicle === 'plane' || index % 3 === 0;
      world.add(group);
      return { glow, group, ring };
    });

    const switchPadMeshes = race.switchPads.map((pad) => {
      const group = new THREE.Group();
      const color = pad.targetVehicle === 'plane' ? '#2cc8ff' : pad.targetVehicle === 'hover' ? '#4ade80' : '#ffd34f';
      const mat = createBasicMaterial(color, { emissive: color, emissiveIntensity: 0.46 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 0.28, 24), mat);
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.2, 3), createBasicMaterial('#f7fbff'));
      arrow.position.y = 0.35;
      arrow.rotation.x = Math.PI / 2;
      group.add(base, arrow);
      group.position.copy(pad.position);
      group.position.y = 0.52 + layerAltitude(pad.layer) * 0.12;
      group.rotation.y = Math.atan2(pad.tangent.x, pad.tangent.z);
      world.add(group);
      return group;
    });

    const trackHazardMeshes = race.trackHazards.map((hazard) => {
      const definition = hazard.definition || getHazardDefinition(hazard.type);
      const color =
        hazard.color ||
        (definition?.effect === 'blind'
          ? '#f7fbff'
          : definition?.effect === 'boost'
          ? '#4ade80'
          : definition?.effect === 'pull'
          ? '#c879ff'
          : '#f45b69');
      const mat = createBasicMaterial(color, { emissive: color, emissiveIntensity: 0.28 });
      const geometry =
        hazard.type === 'lightning' || hazard.type === 'stalactite'
          ? new THREE.ConeGeometry(Math.max(1.2, hazard.radius * 0.12), Math.max(5, hazard.radius * 0.38), 7)
          : new THREE.CylinderGeometry(Math.max(1.5, hazard.radius * 0.2), Math.max(1.5, hazard.radius * 0.2), 0.22, 18);
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.copy(hazard.position);
      mesh.position.y = 0.72 + layerAltitude(hazard.layer) * 0.22;
      mesh.castShadow = true;
      world.add(mesh);
      return mesh;
    });

    const createScenery = () => {
      const districtColors = ['#65c487', '#f28b2e', '#8a53df', '#e64b4b', '#2688ff'];
      const blockMats = districtColors.map((color) => createBasicMaterial(color));
      const roofMats = [createBasicMaterial('#f6fbff'), createBasicMaterial('#153765')];
      const windowMat = createBasicMaterial('#dff7ff', { emissive: '#74f1ff', emissiveIntensity: 0.28 });
      const sceneryGap = compiled.roadWidth * 0.5 + 78;
      const left = bounds.minX - sceneryGap;
      const right = bounds.maxX + sceneryGap;
      const near = bounds.minZ - sceneryGap;
      const far = bounds.maxZ + sceneryGap;

      const addWindows = (x, z, w, d, h) => {
        const cols = Math.max(2, Math.floor(w / 3));
        const rows = Math.max(2, Math.floor(h / 4));
        for (let row = 0; row < rows; row += 1) {
          for (let col = 0; col < cols; col += 1) {
            if ((row + col) % 3 === 0) continue;
            const wx = x - w * 0.34 + (w * 0.68 * col) / Math.max(1, cols - 1);
            const wy = 3.6 + row * 3.2;
            [-1, 1].forEach((side) => {
              const window = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.25, 0.08), windowMat);
              window.position.set(wx, wy, z + side * (d / 2 + 0.06));
              world.add(window);
            });
          }
        }
      };

      const addBuilding = (x, z, w, d, h, index) => {
        const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), blockMats[index % blockMats.length]);
        base.position.set(x, h / 2, z);
        base.castShadow = true;
        base.receiveShadow = true;
        world.add(base);
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(w + 1.2, 1.4, d + 1.2),
          roofMats[index % roofMats.length]
        );
        roof.position.set(x, h + 0.7, z);
        roof.castShadow = true;
        world.add(roof);
        addWindows(x, z, w, d, h);
      };

      const buildingSpots = [
        [left - 18, near + trackSpanZ * 0.1, 11, 13, 18],
        [left - 30, trackCenterZ + trackSpanZ * 0.12, 12, 13, 23],
        [left - 17, far - trackSpanZ * 0.14, 10, 14, 20],
        [right + 18, near + trackSpanZ * 0.18, 13, 12, 19],
        [right + 30, trackCenterZ - trackSpanZ * 0.08, 12, 12, 26],
        [right + 18, far - trackSpanZ * 0.1, 12, 13, 18],
        [trackCenterX - trackSpanX * 0.24, near - 32, 12, 12, 18],
        [trackCenterX + trackSpanX * 0.24, far + 32, 12, 12, 20],
        [trackCenterX - trackSpanX * 0.06, far + 44, 9, 10, 30],
        [trackCenterX + trackSpanX * 0.05, near - 44, 10, 10, 28],
      ];
      buildingSpots.forEach(([x, z, w, d, h], index) => addBuilding(x, z, w, d, h, index));

      [0.06, 0.22, 0.4, 0.6, 0.79].forEach((progress, index) => {
        const sample = compiled.pointAt(progress);
        const normal = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x);
        const side = index % 2 === 0 ? -1 : 1;
        const position = sample.point.clone().addScaledVector(normal, side * (compiled.roadWidth / 2 + 22));
        const color = districtColors[index % districtColors.length];
        const group = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(15, 16 + index * 1.4, 13), blockMats[index % blockMats.length]);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(17, 1.4, 14.5), roofMats[(index + 1) % roofMats.length]);
        const portalMat = new THREE.MeshBasicMaterial({ color, depthWrite: false, opacity: 0.38, transparent: true });
        const ringMat = createBasicMaterial(color, { emissive: color, emissiveIntensity: 0.58 });
        const portal = new THREE.Mesh(new THREE.CircleGeometry(4.2, 28), portalMat);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.42, 8, 28), ringMat);
        const sign = new THREE.Mesh(new THREE.BoxGeometry(8, 3.2, 0.45), ringMat);
        body.position.y = body.geometry.parameters.height / 2;
        roof.position.y = body.geometry.parameters.height + 0.8;
        portal.position.set(0, 4.8, 6.78);
        ring.position.copy(portal.position);
        sign.position.set(0, body.geometry.parameters.height + 2.9, 6.8);
        group.add(body, roof, portal, ring, sign);
        group.position.copy(position);
        group.rotation.y = Math.atan2(sample.point.x - position.x, sample.point.z - position.z);
        world.add(group);
      });

      for (let i = 0; i < 24; i += 1) {
        const sample = compiled.pointAt(i / 24);
        const normal = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x);
        const side = i % 2 === 0 ? -1 : 1;
        const position = sample.point.clone().addScaledVector(normal, side * (compiled.roadWidth / 2 + 9.4));
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 6.6, 6), railPostMat);
        const lamp = new THREE.Mesh(
          new THREE.SphereGeometry(0.8, 12, 10),
          createBasicMaterial('#fff6da', { emissive: '#ffd34f', emissiveIntensity: 0.52 })
        );
        pole.position.set(position.x, 3.3, position.z);
        lamp.position.set(position.x, 6.8, position.z);
        world.add(pole, lamp);
      }

      const treeMat = createBasicMaterial('#4cae50');
      const trunkMat = createBasicMaterial('#8a5a2f');
      for (let i = 0; i < 42; i += 1) {
        const angle = (Math.PI * 2 * i) / 42;
        const radiusX = trackSpanX / 2 + compiled.roadWidth + 72 + (i % 3) * 6;
        const radiusZ = trackSpanZ / 2 + compiled.roadWidth + 72 + (i % 4) * 5;
        const x = trackCenterX + Math.cos(angle) * radiusX;
        const z = trackCenterZ + Math.sin(angle) * radiusZ;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 3, 5), trunkMat);
        trunk.position.set(x, 1.5, z);
        const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4 + (i % 3) * 0.35, 0), treeMat);
        crown.position.set(x, 4.2, z);
        crown.castShadow = true;
        world.add(trunk, crown);
      }

    };
    createScenery();

    const playerVehicle = createVehicleModel({
      accent: '#46d9ef',
      color: '#ef4334',
      scale: 0.78,
      suit: profile.avatar?.suit || '#202837',
    });
    playerVehicle.setMode(race.player.vehicleMode);
    world.add(playerVehicle.group);
    const switchRing = new THREE.Mesh(
      new THREE.TorusGeometry(7.2, 0.28, 8, 40),
      new THREE.MeshBasicMaterial({ color: '#ffd34f', depthWrite: false, opacity: 0.75, transparent: true })
    );
    switchRing.rotation.x = Math.PI / 2;
    switchRing.visible = false;
    playerVehicle.group.add(switchRing);

    const rivalModels = race.rivals.map((rival) => {
      const model = createVehicleModel({
        accent: rival.accent,
        color: rival.color,
        scale: 0.62,
        suit: '#202837',
      });
      model.setMode(defaultVehicle);
      world.add(model.group);
      return model;
    });

    const trapMat = createBasicMaterial('#10151d');
    const droppedBananaMat = createBasicMaterial('#ffd34f', { emissive: '#ffd34f', emissiveIntensity: 0.18 });
    const droppedBananaMeshes = [];
    const trapMeshes = [];

    let raf = 0;
    let lastFrame = performance.now();
    let lastTelemetry = 0;
    let lastHandledCommand = 0;
    let lastLocalCommand = 0;
    let jumpQueued = false;
    let reportedFinish = false;

    const fitRenderer = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      renderer.setPixelRatio(dpr);
      if (canvas.width !== width || canvas.height !== height) {
        renderer.setSize(rect.width, rect.height, false);
      }
      camera.aspect = Math.max(0.1, rect.width / Math.max(1, rect.height));
      camera.updateProjectionMatrix();
      return rect;
    };

    const currentControls = () => {
      const touch = touchRef.current;
      const steer =
        (keys.has('ArrowLeft') ? -1 : 0) +
        (keys.has('ArrowRight') ? 1 : 0) +
        (keys.has('KeyA') ? -1 : 0) +
        (keys.has('KeyD') ? 1 : 0) +
        touch.steer;
      const throttle = keys.has('ArrowUp') || keys.has('KeyW') || touch.throttle > 0 ? 1 : 0;
      const brake = keys.has('ArrowDown') || keys.has('KeyS') || touch.brake > 0 ? 1 : 0;
      const drift = keys.has('ShiftLeft') || keys.has('ShiftRight') || touch.drift;
      const jump = jumpQueued || keys.has('Space') || touch.jump;
      return {
        brake,
        drift,
        jump,
        steer: clamp(steer, -1, 1),
        throttle: throttle - brake * 0.9,
      };
    };

    let audioContext = null;
    let ambientOscillator = null;
    let ambientGain = null;
    const cueFrequency = (name = '') =>
      name.includes('lightning') || name.includes('storm')
        ? 180
        : name.includes('anchor') || name.includes('drill') || name.includes('polarity')
        ? 120
        : name.includes('shield') || name.includes('star')
        ? 520
        : name.includes('boost') || name.includes('turbo')
        ? 720
        : name.includes('trap') || name.includes('bubble')
        ? 260
        : 360;

    const ensureAudio = () => {
      if (typeof window === 'undefined') return null;
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      if (!audioContext) audioContext = new AudioCtor();
      if (audioContext.state === 'suspended') audioContext.resume();
      return audioContext;
    };

    const startAmbientAudio = () => {
      const ctx = ensureAudio();
      if (!ctx || ambientOscillator) return;
      ambientOscillator = ctx.createOscillator();
      ambientGain = ctx.createGain();
      ambientOscillator.type = compiled.key === 'static-storm-plateau' ? 'sawtooth' : compiled.key === 'magnet-mine-descent' ? 'square' : 'sine';
      ambientOscillator.frequency.value =
        compiled.key === 'static-storm-plateau' ? 64 : compiled.key === 'magnet-mine-descent' ? 48 : 86;
      ambientGain.gain.value = 0.012;
      ambientOscillator.connect(ambientGain).connect(ctx.destination);
      ambientOscillator.start();
    };

    const playCue = (name, duration = 0.11) => {
      const ctx = ensureAudio();
      if (!ctx) return;
      startAmbientAudio();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = name?.includes('hit') || name?.includes('drag') ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(cueFrequency(name), ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.02);
    };

    const addBoost = (racer, seconds, impulse, tier = 1) => {
      const forward = new THREE.Vector3(Math.sin(racer.heading), 0, Math.cos(racer.heading));
      racer.boostTimer = Math.max(racer.boostTimer || 0, seconds);
      racer.boostTier = Math.max(racer.boostTier || 0, tier);
      racer.velocity.addScaledVector(forward, impulse);
      const vehicle = VEHICLES[racer.vehicleMode || defaultVehicle] || VEHICLES.kart;
      const limit = vehicle.boostMax + racer.bananas * 0.8;
      if (racer.velocity.length() > limit) racer.velocity.setLength(limit);
    };

    const setVehicleMode = (racer, nextMode, { force = false } = {}) => {
      if (!VEHICLES[nextMode]) return false;
      if (!force && racer.switchLockedUntil > race.time) return false;
      racer.vehicleMode = nextMode;
      racer.transformTimer = 0.5;
      racer.invincibleTimer = Math.max(racer.invincibleTimer || 0, 0.5);
      if (nextMode === 'plane') {
        racer.flightAltitude = clamp(
          Math.max(racer.flightAltitude || 0, FLIGHT_CRUISE_ALTITUDE),
          FLIGHT_MIN_ALTITUDE,
          FLIGHT_MAX_ALTITUDE
        );
        racer.flightVerticalVelocity = 0;
        racer.jumpHeight = 0;
        racer.jumpVelocity = 0;
      } else {
        racer.flightAltitude = 0;
        racer.flightPitch = 0;
        racer.flightRoll = 0;
        racer.flightVerticalVelocity = 0;
      }
      if (racer === race.player) {
        racer.boostTimer = Math.max(racer.boostTimer, 0.2);
        playerVehicle.setMode(racer.vehicleMode);
        playCue('vehicle-switch', 0.16);
      }
      return true;
    };

    const nextVehicleMode = (current) => {
      const currentIndex = VEHICLE_ORDER.indexOf(current);
      return VEHICLE_ORDER[(currentIndex + 1) % VEHICLE_ORDER.length] || 'kart';
    };

    const spawnDroppedBanana = (position, velocity = new THREE.Vector3()) => {
      const banana = {
        life: 18,
        position: position.clone(),
        radius: 3.4,
        velocity: velocity.clone(),
      };
      race.droppedBananas.push(banana);
      const group = new THREE.Group();
      group.position.copy(banana.position);
      group.position.y = 1.08;
      const fruit = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.18, 6, 16, Math.PI * 1.28), droppedBananaMat);
      fruit.rotation.x = Math.PI / 2;
      fruit.rotation.z = -0.8;
      group.add(fruit);
      world.add(group);
      droppedBananaMeshes.push({ banana, mesh: group });
    };

    const scatterBananas = (racer, amount = 3) => {
      const available = Math.min(amount, Math.max(0, racer.bananas || 0));
      if (!available) return;
      racer.bananas = Math.max(0, racer.bananas - available);
      for (let index = 0; index < available; index += 1) {
        const angle = racer.heading + Math.PI + (index - 1) * 0.62;
        const offset = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(4.5 + index * 1.1);
        spawnDroppedBanana(
          racer.position.clone().add(offset),
          new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(5.5)
        );
      }
    };

    const hitPlayer = (severity = 1) => {
      if (race.player.invincibleTimer > 0) return;
      if (race.player.jumpHeight > 1.1) return;
      if (race.player.shieldTimer > 0) {
        race.player.shieldTimer = Math.max(0, race.player.shieldTimer - 1.4 * severity);
        return;
      }
      race.player.hitTimer = Math.max(race.player.hitTimer, 0.45 + severity * 0.22);
      race.player.velocity.multiplyScalar(clamp(0.72 - severity * 0.08, 0.42, 0.72));
      race.cameraShakeTimer = Math.max(race.cameraShakeTimer, 0.2);
      race.screenFlashTimer = Math.max(race.screenFlashTimer, 0.18);
      playCue('item-hit', 0.1);
      scatterBananas(race.player, 3);
    };

    const hitRival = (rival, severity = 1) => {
      if (rival.invincibleTimer > 0) return;
      rival.hitTimer = Math.max(rival.hitTimer, 0.52 + severity * 0.3);
      rival.speed *= clamp(0.72 - severity * 0.08, 0.45, 0.78);
    };

    const cycleVehicle = () => {
      setVehicleMode(race.player, nextVehicleMode(race.player.vehicleMode));
    };

    const nearestRival = (fromRacer, predicate = () => true) =>
      race.rivals
        .filter((rival) => !rival.finished && predicate(rival))
        .map((rival) => ({
          gap: Math.abs(scoreRacer(rival) - scoreRacer(fromRacer)),
          rival,
        }))
        .sort((a, b) => a.gap - b.gap)[0]?.rival || null;

    const dropTrap = (racer, itemKey, level = 1, options = {}) => {
      const definition = getItemDefinition(itemKey);
      const forward = new THREE.Vector3(Math.sin(racer.heading), 0, Math.cos(racer.heading));
      const position = racer.position.clone().addScaledVector(forward, -(5.8 + level));
      const hazard = {
        dragBackward: itemKey === 'anchorDrop' ? 3 : 0,
        effect: options.effect || (itemKey === 'decoyCrate' ? 'spin' : 'slow'),
        itemKey,
        life: options.life || definition?.duration || 8,
        owner: racer,
        position,
        radius: options.radius || 3.2 + level * 0.75,
        vehicleFilter: options.vehicleFilter || definition?.vehicleRestriction || 'both',
      };
      race.droppedHazards.push(hazard);
      const color = ITEM_COLORS[itemKey] || '#10151d';
      const mesh = new THREE.Mesh(
        itemKey === 'bubbleTrap'
          ? new THREE.SphereGeometry(1.8 + level * 0.34, 16, 12)
          : new THREE.CylinderGeometry(1.9 + level * 0.32, 1.9 + level * 0.32, 0.22, 14),
        createBasicMaterial(color, {
          emissive: color,
          emissiveIntensity: itemKey === 'bubbleTrap' ? 0.32 : 0.08,
          opacity: itemKey === 'bubbleTrap' ? 0.62 : 1,
          transparent: itemKey === 'bubbleTrap',
        })
      );
      mesh.position.copy(position);
      mesh.position.y = itemKey === 'bubbleTrap' ? 3.1 : 0.48;
      world.add(mesh);
      trapMeshes.push({ hazard, mesh });
    };

    const triggerRemoteHazard = (strength = 1) => {
      const target = race.trackHazards
        .filter((hazard) => hazard.active !== false)
        .sort((a, b) => distance2D(race.player.position, a.position) - distance2D(race.player.position, b.position))[0];
      if (target) {
        target.eventPulse = Math.max(target.eventPulse || 0, 1.8 * strength);
        target.cooldown = 0;
      }
      race.eventMessages.push({ life: 1.8, text: target ? 'Hazard Triggered' : 'No Hazard Armed' });
    };

    const applyRaceItem = (racer, itemLike, level = 1) => {
      const itemKey = typeof itemLike === 'string' ? itemLike : itemLike?.itemKey || itemLike?.key;
      const definition = getItemDefinition(itemKey);
      if (!itemKey || !definition) return false;
      if (!itemAllowedOnTrack(definition, compiled.key)) return false;
      if (racer === race.player && !itemAllowedForVehicle(definition, racer.vehicleMode)) return false;
      if (racer === race.player) playCue(definition.feedback?.activation || itemKey, 0.12);

      if (itemKey === 'boost') {
        addBoost(racer, 0.55 + level * 0.42, 12 + level * 5.5, level);
        return true;
      }
      if (itemKey === 'shield') {
        racer.shieldTimer = Math.max(racer.shieldTimer || 0, 3.2 + level * 1.5);
        if (level >= 3) addBoost(racer, 0.55, 8, 2);
        return true;
      }
      if (itemKey === 'rocket') {
        const target = nearestRival(racer);
        if (target) hitRival(target, 0.8 + level * 0.32);
        addBoost(racer, 0.22 + level * 0.08, 4 + level * 2, level);
        return true;
      }
      if (itemKey === 'oil' || itemKey === 'bubbleTrap' || itemKey === 'decoyCrate' || itemKey === 'anchorDrop') {
        dropTrap(racer, itemKey, level, {
          effect: itemKey === 'anchorDrop' ? 'drag' : itemKey === 'decoyCrate' ? 'spin' : 'slow',
          life: definition.duration + level * 1.2,
        });
        return true;
      }
      if (itemKey === 'switchBolt') {
        const target = nearestRival(racer);
        if (target) {
          setVehicleMode(target, nextVehicleMode(target.vehicleMode || defaultVehicle), { force: true });
          target.switchLockedUntil = Math.max(target.switchLockedUntil || 0, race.time + 1.8 + level * 0.4);
          hitRival(target, 0.45);
        }
        return true;
      }
      if (itemKey === 'liftJammer') {
        race.rivals.forEach((rival) => {
          rival.liftDisabledTimer = Math.max(rival.liftDisabledTimer || 0, 3.2 + level * 0.8);
          if (rival.vehicleMode === 'plane') hitRival(rival, 0.52);
        });
        return true;
      }
      if (itemKey === 'hazardBell' || itemKey === 'tideHorn') {
        triggerRemoteHazard(itemKey === 'tideHorn' ? 1.4 : 1);
        return true;
      }
      if (itemKey === 'ghostReplay') {
        racer.ghostTimer = Math.max(racer.ghostTimer || 0, 4.4 + level * 0.6);
        addBoost(racer, 0.28 + level * 0.15, 5 + level * 2.4, level);
        return true;
      }
      if (itemKey === 'bananaMagnet') {
        racer.magnetTimer = Math.max(racer.magnetTimer || 0, 4.8 + level * 0.9);
        return true;
      }
      if (itemKey === 'invincibility') {
        racer.invincibleTimer = Math.max(racer.invincibleTimer || 0, 3.4 + level * 0.55);
        addBoost(racer, 0.55, 8, 2);
        return true;
      }
      if (itemKey === 'boardwalkGrip') {
        racer.shieldTimer = Math.max(racer.shieldTimer || 0, 5.6);
        addBoost(racer, 0.65, 8, 2);
        return true;
      }
      if (itemKey === 'warhorn') {
        triggerRemoteHazard(1.25);
        race.rivals.forEach((opponent) => {
          if (distance2D(racer.position, opponent.position) < 72 || scoreRacer(opponent) > scoreRacer(racer)) {
            hitRival(opponent, 1.05);
          }
        });
        addBoost(racer, 1.0, 13, 2);
        return true;
      }
      if (itemKey === 'phaseKey') {
        racer.phaseTimer = Math.max(racer.phaseTimer || 0, 4.8);
        racer.invincibleTimer = Math.max(racer.invincibleTimer || 0, 1.2);
        addBoost(racer, 0.82, 12, 2);
        return true;
      }
      if (itemKey === 'lightningRod') {
        racer.lightningRodTimer = Math.max(racer.lightningRodTimer || 0, 8);
        racer.invincibleTimer = Math.max(racer.invincibleTimer || 0, 0.7);
        return true;
      }
      if (itemKey === 'polaritySwap') {
        race.rivals.forEach((rival) => {
          rival.polarity *= -1;
          rival.polaritySwapTimer = Math.max(rival.polaritySwapTimer || 0, 3);
          hitRival(rival, 0.35);
        });
        return true;
      }
      return false;
    };

    const chooseBoxItem = (balloon) => {
      const box = balloon.box || {};
      const pool = [...(box.pool || COMMON_BOX_ITEMS), compiled.signatureItem?.key].filter(Boolean);
      const filtered = pool.filter((key) => {
        const definition = getItemDefinition(key);
        return (
          definition &&
          itemAllowedOnTrack(definition, compiled.key) &&
          itemAllowedForVehicle(definition, race.player.vehicleMode)
        );
      });
      const candidates = filtered.length ? filtered : COMMON_BOX_ITEMS;
      const rareCandidates = candidates.filter((key) => ['rare', 'track'].includes(getItemDefinition(key)?.rarity));
      const finalPool = box.rare || race.player.rareNextPickup ? rareCandidates.length ? rareCandidates : candidates : candidates;
      race.player.rareNextPickup = false;
      return finalPool[Math.floor(Math.random() * finalPool.length)] || 'boost';
    };

    const collectBalloon = (balloon) => {
      const itemKey = chooseBoxItem(balloon);
      const held = race.player.heldItem;
      const level = held?.itemKey === itemKey ? clamp(held.level + 1, 1, 3) : 1;
      const item = makeHeldItem(itemKey, level, balloon.type);
      if (held && held.itemKey !== itemKey && race.player.doubleSlotUses > 0 && !race.player.secondaryHeldItem) {
        race.player.secondaryHeldItem = item;
        race.player.doubleSlotUses = 0;
      } else {
        race.player.heldItem = item;
        race.player.heldBalloon = item;
      }
      balloon.cooldown = 6.8;
    };

    const useHeldBalloon = () => {
      const held = race.player.heldItem || race.player.heldBalloon;
      if (!held) return;
      if (applyRaceItem(race.player, held, held.level || 1)) {
        race.player.heldItem = race.player.secondaryHeldItem || null;
        race.player.secondaryHeldItem = null;
        race.player.heldBalloon = race.player.heldItem;
      }
    };

    const useBankedItem = (type) => {
      if ((inventoryRef.current?.[type] || 0) <= 0) return;
      if (applyRaceItem(race.player, type, 2)) onInventoryUseRef.current?.(type);
    };

    const spendBananas = (amount) => {
      if (race.player.bananas < amount) return false;
      race.player.bananas -= amount;
      return true;
    };

    const upgradeHeldItem = () => {
      if (!race.player.heldItem || race.player.heldItem.level >= 3 || !spendBananas(3)) return;
      race.player.heldItem = makeHeldItem(race.player.heldItem.itemKey, race.player.heldItem.level + 1);
      race.player.heldBalloon = race.player.heldItem;
    };

    const buyRareNextPickup = () => {
      if (!spendBananas(5)) return;
      race.player.rareNextPickup = true;
    };

    const buyDoubleSlot = () => {
      if (!spendBananas(8)) return;
      race.player.doubleSlotUses = 1;
    };

    const updateLapProgress = (racer, nearest) => {
      const previous = racer.progress;
      racer.progress = nearest.progress;
      if (!racer.finished && previous > 0.82 && racer.progress < 0.18) {
        const lapTime = race.time - (racer.lapStartTime || 0);
        if (racer === race.player) {
          racer.bestLap = racer.bestLap ? Math.min(racer.bestLap, lapTime) : lapTime;
          racer.lapSplits.push(lapTime);
        }
        racer.lap += 1;
        racer.lapStartTime = race.time;
        if (racer.lap > compiled.laps) {
          racer.finished = true;
          racer.finishTime = race.time;
          if (racer === race.player) race.finished = true;
        }
      } else if (previous < 0.18 && racer.progress > 0.82) {
        racer.progress = previous;
      }
    };

    const progressInRange = (progress, start, end) =>
      start <= end ? progress >= start && progress <= end : progress >= start || progress <= end;

    const cyclePhase = (cycle = 5, phase = 0) => wrap01(race.time / cycle + phase);
    const hazardWindowOpen = (hazard) => {
      if (hazard.eventPulse > 0) return true;
      if (!hazard.cycle) return true;
      const phase = cyclePhase(hazard.cycle, hazard.phase || 0);
      return phase >= (hazard.openStart ?? 0.15) && phase <= (hazard.openEnd ?? 0.65);
    };

    const applyVehicleIntegration = (dt) => {
      race.switchPads.forEach((pad) => {
        pad.cooldown = Math.max(0, pad.cooldown - dt);
        if (pad.cooldown <= 0 && distance2D(race.player.position, pad.position) < (pad.radius || 7)) {
          setVehicleMode(race.player, pad.targetVehicle, { force: true });
          pad.cooldown = 1.2;
        }
      });

      compiled.vehicleZones.forEach((zone) => {
        if (zone.active === false) return;
        if (distance2D(race.player.position, compiled.pointAt(zone.progress).point) > (zone.radius || 12)) return;
        if (vehicleMatches(race.player.vehicleMode, zone.vehicle)) return;
        if (zone.action === 'auto-switch') {
          setVehicleMode(race.player, zone.vehicle, { force: true });
        } else if (zone.action === 'block') {
          race.player.velocity.multiplyScalar(0.28);
          hitPlayer(0.2);
        } else if (zone.action === 'penalty') {
          hitPlayer(zone.severity || 0.65);
        }
      });

      compiled.vehicleLocks.forEach((lock) => {
        if (!progressInRange(race.player.progress, lock.start, lock.end)) return;
        race.player.switchLockedUntil = Math.max(race.player.switchLockedUntil || 0, race.time + 0.2);
        if (lock.vehicle && !vehicleMatches(race.player.vehicleMode, lock.vehicle)) {
          setVehicleMode(race.player, lock.vehicle, { force: true });
        }
      });
    };

    const applyHazardEffect = (racer, hazard, dt) => {
      const definition = hazard.definition || getHazardDefinition(hazard.type);
      const vehicleFilter = hazard.vehicleFilter || definition?.vehicleFilter || 'both';
      if (!vehicleMatchesFilter(racer.vehicleMode || defaultVehicle, vehicleFilter)) return;
      const effect = hazard.effect || definition?.effect;
      if (racer === race.player && racer.invincibleTimer > 0 && !['boost', 'switch-lock'].includes(effect)) return;
      if (racer === race.player && hazard.type === 'lightning' && race.player.lightningRodTimer > 0) {
        const leader = [...race.rivals].sort((a, b) => scoreRacer(b) - scoreRacer(a))[0];
        if (leader) hitRival(leader, hazard.severity || 1.05);
        race.player.lightningRodTimer = 0;
        return;
      }

      if (effect === 'slow') {
        if (racer.velocity) racer.velocity.multiplyScalar(1 - clamp(dt * (hazard.strength || 1.4), 0, 0.2));
        if (racer.speed) racer.speed *= 1 - clamp(dt * 1.2, 0, 0.16);
      } else if (effect === 'spin') {
        racer === race.player ? hitPlayer(hazard.severity || 0.85) : hitRival(racer, hazard.severity || 0.85);
      } else if (effect === 'knock-back') {
        const push = racer.position.clone().sub(hazard.position).setY(0);
        if (push.length() > 0.001 && racer.velocity) racer.velocity.addScaledVector(push.normalize(), (hazard.force || 16) * dt);
        racer === race.player ? hitPlayer(0.35) : hitRival(racer, 0.35);
      } else if (effect === 'pull') {
        const pull = hazard.position.clone().sub(racer.position).setY(0);
        if (pull.length() > 0.001 && racer.velocity) racer.velocity.addScaledVector(pull.normalize(), (hazard.force || 20) * dt);
        if (racer.vehicleMode === 'plane') addBoost(racer, 0.16, 2.2, 1);
      } else if (effect === 'boost') {
        addBoost(racer, 0.35, hazard.impulse || 7, 1);
      } else if (effect === 'blind') {
        racer.blindTimer = Math.max(racer.blindTimer || 0, hazard.duration || 3);
      } else if (effect === 'force-switch') {
        setVehicleMode(racer, hazard.targetVehicle || nextVehicleMode(racer.vehicleMode || defaultVehicle), { force: true });
      } else if (effect === 'control-flip') {
        racer.controlFlipTimer = Math.max(racer.controlFlipTimer || 0, hazard.duration || 2.2);
      } else if (effect === 'set-polarity') {
        racer.polarity = hazard.polarity || 1;
        racer.polaritySwapTimer = Math.max(racer.polaritySwapTimer || 0, hazard.duration || 4);
      } else if (effect === 'switch-lock') {
        racer.switchLockedUntil = Math.max(racer.switchLockedUntil || 0, race.time + (hazard.duration || 5));
      } else if (effect === 'polarity-check' && hazard.polarity && racer.polarity !== hazard.polarity) {
        racer === race.player ? hitPlayer(0.72) : hitRival(racer, 0.72);
      }
    };

    const updateTrackHazards = (dt) => {
      race.trackHazards.forEach((hazard) => {
        hazard.cooldown = Math.max(0, hazard.cooldown - dt);
        hazard.eventPulse = Math.max(0, hazard.eventPulse - dt);
        const active = hazard.eventPulse > 0 || (hazard.active !== false && hazardWindowOpen(hazard));
        if (!active || hazard.cooldown > 0) return;
        [race.player, ...race.rivals].forEach((racer) => {
          if (racer.finished) return;
          if (distance2D(racer.position, hazard.position) < (hazard.radius || 8)) {
            applyHazardEffect(racer, hazard, dt);
            hazard.cooldown = Math.max(hazard.cooldown, hazard.hitCooldown || 0.45);
          }
        });
      });
    };

    const runTrackEvent = (event) => {
      if (!event) return;
      if (event.message) race.eventMessages.push({ life: 2.2, text: event.message });
      if (event.flag) race.eventFlags[event.flag] = event.value ?? true;
      if (event.action === 'trigger-hazard') {
        const hazard = race.trackHazards.find((entry) => entry.key === event.hazardKey || entry.type === event.hazardType);
        if (hazard) hazard.eventPulse = Math.max(hazard.eventPulse || 0, event.duration || 2.4);
      }
      if (event.action === 'activate-zone') {
        const zone = compiled.vehicleZones.find((entry) => entry.key === event.zoneKey);
        if (zone) zone.active = event.active ?? true;
      }
      if (event.action === 'set-lock') {
        race.player.switchLockedUntil = Math.max(race.player.switchLockedUntil || 0, race.time + (event.duration || 2));
      }
      if (event.action === 'rotate-polarity') {
        race.trackHazards.forEach((hazard) => {
          if (hazard.type === 'polarityStrip' || hazard.type === 'polarityGate') {
            hazard.polarity = (hazard.polarity || 1) * -1;
            hazard.eventPulse = Math.max(hazard.eventPulse || 0, 1.2);
          }
        });
      }
    };

    const updateTrackEvents = (dt) => {
      (compiled.events || []).forEach((event) => {
        const key = event.key || `${event.trigger}-${event.lap || event.time || event.progress}`;
        if (event.repeatInterval) {
          const last = race.eventCooldowns[key] || 0;
          if (race.time - last >= event.repeatInterval) {
            race.eventCooldowns[key] = race.time;
            runTrackEvent(event);
          }
          return;
        }
        if (race.eventFlags[`fired:${key}`]) return;
        const leader = [race.player, ...race.rivals].sort((a, b) => scoreRacer(b) - scoreRacer(a))[0];
        const ready =
          (event.trigger === 'lap' && race.player.lap >= event.lap) ||
          (event.trigger === 'time' && race.time >= event.time) ||
          (event.trigger === 'position' && leader && leader.progress >= event.progress) ||
          (event.trigger === 'player' && race.eventFlags[event.flag]);
        if (ready) {
          race.eventFlags[`fired:${key}`] = true;
          runTrackEvent(event);
        }
      });

      race.eventMessages = race.eventMessages
        .map((message) => ({ ...message, life: message.life - dt }))
        .filter((message) => message.life > 0);
    };

    const updatePlayer = (dt) => {
      const player = race.player;
      const rawControls = currentControls();
      const controls = {
        ...rawControls,
        steer: player.controlFlipTimer > 0 ? -rawControls.steer : rawControls.steer,
      };
      const vehicle = VEHICLES[player.vehicleMode] || VEHICLES.kart;
      const isPlane = player.vehicleMode === 'plane';
      player.layer = isPlane ? 'air' : player.vehicleMode === 'hover' ? 'hybrid' : 'ground';
      const nearest = compiled.nearest(player.position);
      updateLapProgress(player, nearest);
      player.steerInput += (controls.steer - player.steerInput) * clamp(dt * 11, 0, 1);

      const forward = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
      const right = new THREE.Vector3(forward.z, 0, -forward.x);
      const speed = player.velocity.length();
      const signedForwardSpeed = player.velocity.dot(forward);
      const bananaBonus = 1 + player.bananas * 0.018;
      const offroad =
        nearest.distance > compiled.roadWidth * 0.52 && !isPlane && player.jumpHeight <= 0.05;
      const maxSpeed =
        (player.boostTimer > 0 ? vehicle.boostMax : vehicle.maxSpeed * bananaBonus) *
        (offroad && player.shieldTimer <= 0 ? vehicle.offroad : 1);

      if (!isPlane && controls.jump && player.jumpCooldown <= 0 && player.jumpHeight <= 0.02) {
        player.jumpVelocity = 18 + clamp(speed, 0, vehicle.maxSpeed) * 0.12;
        player.jumpCooldown = 0.46;
        player.velocity.addScaledVector(forward, speed > 2 ? 2.2 : 1.2);
      }
      jumpQueued = false;
      if (!isPlane) touchRef.current.jump = false;

      if (player.hitTimer > 0) {
        player.hitTimer = Math.max(0, player.hitTimer - dt);
        player.velocity.multiplyScalar(Math.max(0, 1 - dt * 1.8));
      } else if (controls.throttle > 0.08) {
        player.velocity.addScaledVector(forward, vehicle.acceleration * controls.throttle * dt);
      } else if (controls.throttle < -0.08) {
        player.velocity.addScaledVector(forward, -vehicle.brake * Math.abs(controls.throttle) * dt);
      } else {
        player.velocity.multiplyScalar(Math.max(0, 1 - (0.72 + speed * 0.006) * dt));
      }

      const driftCanStart = !isPlane && controls.drift && Math.abs(player.steerInput) > 0.16 && speed > 12;
      if (!player.driftActive && driftCanStart) {
        player.driftActive = true;
        player.driftCharge = 0;
        player.driftDirection = Math.sign(player.steerInput) || 1;
      } else if (player.driftActive && (!controls.drift || speed < 8)) {
        if (player.driftCharge > 2.1) addBoost(player, 1.1, 17, 3);
        else if (player.driftCharge > 1.25) addBoost(player, 0.82, 12, 2);
        else if (player.driftCharge > 0.62) addBoost(player, 0.48, 8, 1);
        player.driftActive = false;
        player.driftCharge = 0;
      }

      if (player.driftActive) {
        const counterSteer = player.steerInput * player.driftDirection < -0.25 ? 1.22 : 1;
        player.driftCharge = clamp(
          player.driftCharge + vehicle.driftCharge * counterSteer * (0.78 + speed / 80) * dt,
          0,
          2.8
        );
      }

      const lateralSpeed = player.velocity.dot(right);
      const grip = player.driftActive ? vehicle.driftGrip : vehicle.grip;
      player.velocity.addScaledVector(right, -lateralSpeed * clamp(grip * dt, 0, 1));
      if (player.driftActive) {
        player.velocity.addScaledVector(
          right,
          player.driftDirection * vehicle.driftSlip * (0.28 + speed / 90) * dt
        );
      }

      const turnInput = player.driftActive
        ? player.driftDirection * vehicle.driftTurn + player.steerInput * 0.25
        : player.steerInput;
      const turnSpeed = clamp(Math.abs(signedForwardSpeed) / Math.max(1, vehicle.maxSpeed), 0.28, 1.2);
      if (speed > 0.4 || Math.abs(controls.throttle) > 0.1) {
        player.heading +=
          turnInput *
          vehicle.steer *
          turnSpeed *
          (isPlane ? 0.92 : player.jumpHeight > 0.05 ? 0.45 : 1) *
          Math.sign(signedForwardSpeed || controls.throttle || 1) *
          dt;
      }

      if (!isPlane) {
        const edge = clamp((nearest.distance - compiled.roadWidth * 0.42) / (compiled.roadWidth * 0.42), 0, 1);
        if (edge > 0 && player.shieldTimer <= 0 && player.jumpHeight <= 0.05) {
          player.velocity.addScaledVector(nearest.normal, -edge * 8.2 * dt);
        }
        if (nearest.distance > compiled.roadWidth * 0.86 && player.jumpHeight <= 0.05) {
          player.position.copy(nearest.point).addScaledVector(nearest.normal, compiled.roadWidth * 0.86);
          player.velocity.multiplyScalar(0.72);
        }
      }

      if (player.velocity.length() > maxSpeed) player.velocity.setLength(maxSpeed);
      if (isPlane) {
        const liftInput = (controls.jump ? 1 : 0) - (controls.drift ? 1 : 0);
        const speedLift = clamp((player.velocity.length() - vehicle.maxSpeed * 0.36) / vehicle.maxSpeed, 0, 0.7);
        const cruisePull = (FLIGHT_CRUISE_ALTITUDE - player.flightAltitude) * 0.2;
        const liftPower = player.liftDisabledTimer > 0 ? 0.22 : 1;
        player.flightVerticalVelocity +=
          (liftInput * 22 * liftPower + cruisePull + speedLift * 3 - player.flightVerticalVelocity * 1.65) * dt;
        player.flightAltitude = clamp(
          player.flightAltitude + player.flightVerticalVelocity * dt,
          FLIGHT_MIN_ALTITUDE,
          FLIGHT_MAX_ALTITUDE
        );
        if (
          player.flightAltitude <= FLIGHT_MIN_ALTITUDE + 0.05 ||
          player.flightAltitude >= FLIGHT_MAX_ALTITUDE - 0.05
        ) {
          player.flightVerticalVelocity *= 0.25;
        }
        player.flightPitch = THREE.MathUtils.lerp(
          player.flightPitch,
          -liftInput * 0.22 - speedLift * 0.06,
          1 - Math.exp(-7 * dt)
        );
        player.flightRoll = THREE.MathUtils.lerp(
          player.flightRoll,
          -player.steerInput * 0.48,
          1 - Math.exp(-8 * dt)
        );
        player.jumpHeight = 0;
        player.jumpVelocity = 0;
      } else {
        const wasJumping = player.jumpHeight > 0;
        if (player.jumpHeight > 0 || player.jumpVelocity > 0) {
          player.jumpHeight = Math.max(0, player.jumpHeight + player.jumpVelocity * dt);
          player.jumpVelocity -= 54 * dt;
          if (player.jumpHeight <= 0 && wasJumping) {
            player.jumpHeight = 0;
            player.jumpVelocity = 0;
            player.landingTimer = 0.18;
            if (player.driftActive && Math.abs(player.steerInput) > 0.25) addBoost(player, 0.3, 5.5, 1);
          }
        }
        player.flightAltitude = 0;
        player.flightPitch = 0;
        player.flightRoll = 0;
        player.flightVerticalVelocity = 0;
      }
      player.position.addScaledVector(player.velocity, dt);
      if (isPlane) {
        const margin = Math.max(170, compiled.roadWidth * 5.5);
        const minX = bounds.minX - margin;
        const maxX = bounds.maxX + margin;
        const minZ = bounds.minZ - margin;
        const maxZ = bounds.maxZ + margin;
        const clampedX = clamp(player.position.x, minX, maxX);
        const clampedZ = clamp(player.position.z, minZ, maxZ);
        if (clampedX !== player.position.x) {
          player.position.x = clampedX;
          player.velocity.x *= -0.18;
        }
        if (clampedZ !== player.position.z) {
          player.position.z = clampedZ;
          player.velocity.z *= -0.18;
        }
      }
      player.boostTimer = Math.max(0, player.boostTimer - dt);
      if (player.boostTimer <= 0) player.boostTier = 0;
      player.blindTimer = Math.max(0, player.blindTimer - dt);
      player.controlFlipTimer = Math.max(0, player.controlFlipTimer - dt);
      player.ghostTimer = Math.max(0, (player.ghostTimer || 0) - dt);
      player.invincibleTimer = Math.max(0, player.invincibleTimer - dt);
      player.jumpCooldown = Math.max(0, player.jumpCooldown - dt);
      player.landingTimer = Math.max(0, player.landingTimer - dt);
      player.liftDisabledTimer = Math.max(0, player.liftDisabledTimer - dt);
      player.lightningRodTimer = Math.max(0, player.lightningRodTimer - dt);
      player.shieldTimer = Math.max(0, player.shieldTimer - dt);
      player.magnetTimer = Math.max(0, player.magnetTimer - dt);
      player.perfectBoostTimer = Math.max(0, player.perfectBoostTimer - dt);
      player.polaritySwapTimer = Math.max(0, player.polaritySwapTimer - dt);
      if (player.polaritySwapTimer <= 0) player.polarity = 1;
      player.transformTimer = Math.max(0, player.transformTimer - dt);
      player.planeBob += dt * 4;
      player.speed = player.velocity.dot(forward);

      race.bananas.forEach((banana) => {
        banana.cooldown = Math.max(0, banana.cooldown - dt);
        const magnetPull = player.magnetTimer > 0 && banana.cooldown <= 0 && player.position.distanceTo(banana.position) < 22;
        if (magnetPull) {
          const pull = player.position.clone().sub(banana.position).setY(0);
          if (pull.length() > 0.001) banana.position.addScaledVector(pull.normalize(), 18 * dt);
        }
        if (banana.cooldown <= 0 && player.position.distanceTo(banana.position) < 4.2) {
          player.bananas = clamp(player.bananas + 1, 0, 99);
          banana.cooldown = 8.5;
        }
      });

      race.droppedBananas.forEach((banana) => {
        banana.life -= dt;
        banana.position.addScaledVector(banana.velocity, dt);
        banana.velocity.multiplyScalar(Math.max(0, 1 - dt * 1.8));
        if (player.magnetTimer > 0 && player.position.distanceTo(banana.position) < 26) {
          const pull = player.position.clone().sub(banana.position).setY(0);
          if (pull.length() > 0.001) banana.position.addScaledVector(pull.normalize(), 24 * dt);
        }
        if (banana.life > 0 && player.position.distanceTo(banana.position) < banana.radius) {
          player.bananas = clamp(player.bananas + 1, 0, 99);
          banana.life = 0;
        }
      });
      race.droppedBananas = race.droppedBananas.filter((banana) => banana.life > 0);

      race.balloons.forEach((balloon) => {
        balloon.cooldown = Math.max(0, balloon.cooldown - dt);
        if (balloon.cooldown <= 0 && player.position.distanceTo(balloon.position) < 5.4) {
          collectBalloon(balloon);
        }
      });

      race.zippers.forEach((zipper) => {
        zipper.cooldown = Math.max(0, zipper.cooldown - dt);
        if (zipper.cooldown <= 0 && player.position.distanceTo(zipper.position) < 5.7 && speed > 6) {
          const perfect = controls.throttle < 0.24;
          addBoost(player, perfect ? 1.36 : 0.82, perfect ? 22 : 14, perfect ? 3 : 2);
          player.perfectBoostTimer = perfect ? 1.1 : 0;
          zipper.cooldown = 1.2;
        }
      });

      race.flightGates.forEach((gate) => {
        gate.cooldown = Math.max(0, gate.cooldown - dt);
        if (
          isPlane &&
          gate.cooldown <= 0 &&
          distance2D(player.position, gate.position) < Math.max(8.5, compiled.roadWidth * 0.25) &&
          Math.abs(player.flightAltitude - gate.altitude) < 6.5
        ) {
          addBoost(player, 0.5, 8.5, 1);
          gate.cooldown = 1.75;
        }
      });

      if (player.magnetTimer > 0) {
        const target = race.rivals
          .filter((rival) => !rival.finished && scoreRacer(rival) > scoreRacer(player))
          .sort((a, b) => distance2D(player.position, a.position) - distance2D(player.position, b.position))[0];
        if (target) {
          const pull = target.position.clone().sub(player.position).setY(0);
          if (pull.length() > 0.001) player.velocity.addScaledVector(pull.normalize(), 11 * dt);
        }
      }

      race.droppedHazards.forEach((hazard) => {
        hazard.life -= dt;
        [race.player, ...race.rivals].forEach((racer) => {
          if (racer === hazard.owner || racer.finished) return;
          if (!vehicleMatchesFilter(racer.vehicleMode || defaultVehicle, hazard.vehicleFilter || 'both')) return;
          if (hazard.life > 0 && distance2D(racer.position, hazard.position) < hazard.radius + 2.8) {
            if (hazard.effect === 'drag' && racer.velocity) {
              const back = new THREE.Vector3(Math.sin(racer.heading), 0, Math.cos(racer.heading)).multiplyScalar(-1);
              racer.position.addScaledVector(back, hazard.dragBackward || 3);
            }
            racer === race.player ? hitPlayer(0.9) : hitRival(racer, hazard.effect === 'spin' ? 1.05 : 0.9);
            hazard.life = 0;
          }
        });
      });
      race.droppedHazards = race.droppedHazards.filter((hazard) => hazard.life > 0);

      race.rivals.forEach((rival) => {
        const gap = distance2D(player.position, rival.position);
        if (!isPlane && gap > 0 && gap < 5.8 && player.hitTimer <= 0 && player.jumpHeight <= 1.1) {
          const push = player.position.clone().sub(rival.position).setY(0).normalize();
          player.position.addScaledVector(push, (5.8 - gap) * 0.45);
          if (player.shieldTimer > 0) hitRival(rival, 0.75);
          else hitPlayer(0.34);
        }
      });

      applyVehicleIntegration(dt);
    };

    const chooseAIRouteLayer = (rival, index) => {
      const entries = Object.values(compiled.routeLayers || {});
      if (!entries.length) return 'ground';
      const heldBonus = rival.heldItem ? 0.08 : 0;
      const scored = entries.map((layer) => {
        const vehicleScore = VEHICLE_LAYER_SCORE[layer.key]?.[rival.vehicleMode || defaultVehicle] ?? 0.6;
        const riskBias = (compiled.aiRivals?.[index]?.risk || 0.45) * (layer.key === 'air' ? 0.18 : layer.key === 'hybrid' ? 0.1 : 0);
        return {
          key: layer.key,
          score: (layer.aiWeight || 1) + vehicleScore + riskBias + heldBonus,
          vehiclePreference: layer.vehiclePreference,
        };
      });
      scored.sort((a, b) => b.score - a.score);
      return scored[0]?.key || 'ground';
    };

    const triggerHazardByType = (hazardType, duration = 2.4, message = null) => {
      const hazard = race.trackHazards.find((entry) => entry.type === hazardType);
      if (hazard) hazard.eventPulse = Math.max(hazard.eventPulse || 0, duration);
      if (message) race.eventMessages.push({ life: 2, text: message });
    };

    const maybeUseRivalSignature = (rival) => {
      const signature = rival.ai?.signature;
      if (!signature || rival.signatureUsed) return;
      if (signature === 'dock-bell' && rival.rank === 2 && rival.progress > 0.34) {
        triggerHazardByType('seagulls', 3.4, 'Dock bell');
        rival.signatureUsed = true;
      }
      if (signature === 'static-bait' && rival.progress > 0.42 && distance2D(rival.position, race.player.position) < 34) {
        triggerHazardByType('staticCharge', 4.2, 'Static charge');
        rival.signatureUsed = true;
      }
      if (signature === 'early-drill' && rival.rank >= 4 && rival.progress > 0.28) {
        triggerHazardByType('mineCart', 3.2, 'Drill early');
        rival.signatureUsed = true;
      }
    };

    const updateRivals = (dt) => {
      race.rivals.forEach((rival, index) => {
        if (rival.finished) return;
        maybeUseRivalSignature(rival);
        rival.invincibleTimer = Math.max(0, (rival.invincibleTimer || 0) - dt);
        rival.liftDisabledTimer = Math.max(0, (rival.liftDisabledTimer || 0) - dt);
        rival.polaritySwapTimer = Math.max(0, (rival.polaritySwapTimer || 0) - dt);
        if (rival.polaritySwapTimer <= 0) rival.polarity = 1;
        rival.layer = chooseAIRouteLayer(rival, index);
        const layer = compiled.routeLayers?.[rival.layer];
        if (layer?.vehiclePreference && (rival.switchLockedUntil || 0) <= race.time) {
          setVehicleMode(rival, layer.vehiclePreference, { force: true });
        }
        const rubberband = clamp((scoreRacer(race.player) - scoreRacer(rival)) * 0.12, -0.06, 0.08);
        const rivalVehicle = VEHICLES[rival.vehicleMode || defaultVehicle] || VEHICLES[defaultVehicle] || VEHICLES.kart;
        const desiredSpeed =
          (rivalVehicle.maxSpeed * (0.82 + index * 0.035 + profile.level * 0.002 + rubberband));
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
          }
        }
      });
    };

    const updateRankings = () => {
      const racers = [race.player, ...race.rivals].sort((a, b) => scoreRacer(b) - scoreRacer(a));
      racers.forEach((racer, index) => {
        racer.rank = index + 1;
      });
      if (race.player.rank !== race.lastPlayerRank) {
        const delta = race.lastPlayerRank - race.player.rank;
        race.positionNotice = { life: 1.6, text: delta > 0 ? `Position +${delta}` : `Position ${delta}` };
        race.lastPlayerRank = race.player.rank;
      }
    };

    const syncMeshes = (dt, now) => {
      const player = race.player;
      const vehicle = VEHICLES[player.vehicleMode] || VEHICLES.kart;
      const isPlane = player.vehicleMode === 'plane';
      const height =
        (isPlane ? player.flightAltitude : vehicle.hover + player.jumpHeight) +
        (isPlane ? Math.sin(player.planeBob) * 0.35 : 0);
      playerVehicle.group.position.copy(player.position);
      playerVehicle.group.position.y = 0.48 + height;
      playerVehicle.group.rotation.y = player.heading;
      playerVehicle.group.rotation.z =
        isPlane
          ? player.flightRoll
          : -clamp(player.velocity.length() / vehicle.maxSpeed, 0, 1) * 0.1;
      playerVehicle.group.rotation.x =
        isPlane
          ? player.flightPitch
          : (player.driftActive ? -player.driftDirection * 0.08 : 0) + (player.jumpHeight > 0 ? 0.08 : 0);
      playerVehicle.boostFlame.visible = player.boostTimer > 0.02;
      switchRing.visible = player.transformTimer > 0;
      if (switchRing.visible) {
        switchRing.rotation.z += dt * 8;
        switchRing.scale.setScalar(1 + (0.5 - player.transformTimer) * 0.8);
        switchRing.material.opacity = clamp(player.transformTimer / 0.5, 0.2, 0.8);
      }
      playerVehicle.wheels.forEach((wheel) => {
        wheel.rotation.x += player.speed * dt * 2.2;
        if (wheel.userData.front) wheel.rotation.y = player.steerInput * 0.36;
      });

      race.rivals.forEach((rival, index) => {
        const sample = compiled.pointAt(rival.progress + 0.004);
        const model = rivalModels[index];
        const yaw = Math.atan2(sample.tangent.x, sample.tangent.z);
        const rivalMode = rival.vehicleMode || defaultVehicle;
        const rivalAltitude = rivalMode === 'plane' ? FLIGHT_CRUISE_ALTITUDE : rivalMode === 'hover' ? 1.25 : 0;
        model.setMode(rivalMode);
        model.group.position.copy(rival.position);
        model.group.position.y = 0.42 + rivalAltitude;
        model.group.rotation.y = yaw;
        model.group.rotation.z =
          rivalMode === 'plane' ? Math.sin(rival.wobble) * 0.16 : rival.hitTimer > 0 ? Math.sin(now / 70) * 0.18 : 0;
        model.boostFlame.visible = false;
        model.wheels.forEach((wheel) => {
          wheel.rotation.x += rival.speed * dt * 1.6;
        });
      });

      race.bananas.forEach((banana, index) => {
        const mesh = bananaMeshes[index];
        mesh.visible = banana.cooldown <= 0;
        mesh.rotation.y += dt * 1.8;
        mesh.position.y = 1.25 + Math.sin(now / 220 + index) * 0.16;
      });

      race.balloons.forEach((balloon, index) => {
        const mesh = balloonMeshes[index];
        mesh.visible = balloon.cooldown <= 0;
        mesh.rotation.y += dt * 0.9;
        mesh.position.y = 3.5 + Math.sin(now / 280 + index) * 0.22;
      });

      race.zippers.forEach((zipper, index) => {
        const mesh = zipperMeshes[index];
        mesh.visible = zipper.cooldown <= 0.45 || Math.floor(now / 70) % 2 === 0;
      });

      race.flightGates.forEach((gate, index) => {
        const mesh = flightGateMeshes[index];
        const active = player.vehicleMode === 'plane';
        const pulse = 1 + Math.sin(now / 180 + index) * 0.045;
        mesh.group.visible = active || index % 3 === 0;
        mesh.group.position.y = gate.altitude + Math.sin(now / 360 + index) * 0.6;
        mesh.group.scale.setScalar(gate.cooldown > 0 ? 1.12 : pulse);
        mesh.ring.material.opacity = active ? (gate.cooldown > 0 ? 0.28 : 0.78) : 0.32;
        mesh.glow.material.opacity = active ? (gate.cooldown > 0 ? 0.08 : 0.18) : 0.06;
      });

      race.switchPads.forEach((pad, index) => {
        const mesh = switchPadMeshes[index];
        if (!mesh) return;
        mesh.rotation.y += dt * (pad.cooldown > 0 ? 2.4 : 0.7);
        mesh.scale.setScalar(pad.cooldown > 0 ? 0.82 : 1 + Math.sin(now / 180 + index) * 0.04);
      });

      race.trackHazards.forEach((hazard, index) => {
        const mesh = trackHazardMeshes[index];
        if (!mesh) return;
        const active = hazard.eventPulse > 0 || (hazard.active !== false && hazardWindowOpen(hazard));
        mesh.visible = active || hazard.eventPulse > 0 || hazard.telegraphTime > 0;
        mesh.rotation.y += dt * 0.8;
        mesh.scale.setScalar(active ? 1.05 + Math.sin(now / 140 + index) * 0.06 : 0.72);
        if (mesh.material) mesh.material.opacity = active ? 0.86 : 0.38;
      });

      trapMeshes.forEach((entry) => {
        entry.mesh.visible = entry.hazard.life > 0;
        entry.mesh.material.opacity = clamp(entry.hazard.life / 6, 0.15, 1);
      });

      droppedBananaMeshes.forEach((entry) => {
        entry.mesh.visible = entry.banana.life > 0;
        entry.mesh.position.copy(entry.banana.position);
        entry.mesh.position.y = 1.08 + Math.sin(now / 180) * 0.08;
        entry.mesh.rotation.y += dt * 1.8;
      });
    };

    const updateCamera = (dt) => {
      const player = race.player;
      const vehicle = VEHICLES[player.vehicleMode] || VEHICLES.kart;
      const isPlane = player.vehicleMode === 'plane';
      const forward = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
      const right = new THREE.Vector3(forward.z, 0, -forward.x);
      const speedRatio = clamp(player.velocity.length() / vehicle.maxSpeed, 0, 1);
      const altitude = isPlane ? player.flightAltitude : player.jumpHeight;
      const desired = player.position
        .clone()
        .addScaledVector(forward, -(vehicle.cameraDistance + speedRatio * 5))
        .addScaledVector(right, -player.steerInput * speedRatio * (isPlane ? 4.8 : 2.2))
        .add(new THREE.Vector3(0, vehicle.cameraHeight + speedRatio * 2.5 + altitude * (isPlane ? 0.72 : 0.55), 0));
      const lookAt = player.position
        .clone()
        .addScaledVector(forward, 2 + speedRatio * 4)
        .add(new THREE.Vector3(0, 4.2 + altitude * (isPlane ? 0.78 : 0.38), 0));
      if (race.cameraShakeTimer > 0) {
        const shake = race.cameraShakeTimer / 0.2;
        desired.x += (Math.random() - 0.5) * 1.2 * shake;
        desired.y += (Math.random() - 0.5) * 0.7 * shake;
      }
      camera.position.lerp(desired, 1 - Math.exp(-7.2 * dt));
      camera.lookAt(lookAt);
      camera.rotation.z += -player.steerInput * speedRatio * 0.045;
      camera.fov = THREE.MathUtils.lerp(camera.fov, player.boostTimer > 0 ? 100 : 90, 1 - Math.exp(-3 * dt));
      camera.updateProjectionMatrix();
    };

    const handleCommand = (nextCommand) => {
      if (!nextCommand?.id) return;
      if (nextCommand.type === 'boost' || nextCommand.type === 'shield' || nextCommand.type === 'rocket') {
        useBankedItem(nextCommand.type);
      }
      if (nextCommand.type === 'item') useHeldBalloon();
      if (nextCommand.type === 'upgrade-tier') upgradeHeldItem();
      if (nextCommand.type === 'upgrade-rare') buyRareNextPickup();
      if (nextCommand.type === 'upgrade-double') buyDoubleSlot();
      if (nextCommand.type === 'vehicle') cycleVehicle();
      if (nextCommand.type === 'reset') {
        const sample = compiled.pointAt(race.player.progress);
        race.player.position.copy(sample.point);
        race.player.velocity.set(0, 0, 0);
        race.player.heading = Math.atan2(sample.tangent.x, sample.tangent.z);
        race.player.flightAltitude = race.player.vehicleMode === 'plane' ? FLIGHT_CRUISE_ALTITUDE : 0;
        race.player.flightPitch = 0;
        race.player.flightRoll = 0;
        race.player.flightVerticalVelocity = 0;
        race.player.jumpHeight = 0;
        race.player.jumpVelocity = 0;
      }
    };

    const tick = (now) => {
      const dt = clamp((now - lastFrame) / 1000, 0, 0.033);
      lastFrame = now;
      race.time += dt;
      race.cameraShakeTimer = Math.max(0, race.cameraShakeTimer - dt);
      race.screenFlashTimer = Math.max(0, race.screenFlashTimer - dt);
      if (race.positionNotice) {
        race.positionNotice.life -= dt;
        if (race.positionNotice.life <= 0) race.positionNotice = null;
      }
      fitRenderer();

      const externalCommand = commandRef.current;
      if (externalCommand?.id && externalCommand.id !== lastHandledCommand) {
        lastHandledCommand = externalCommand.id;
        handleCommand(externalCommand);
      }

      const localCommand = localCommandRef.current;
      if (localCommand?.id && localCommand.id !== lastLocalCommand) {
        lastLocalCommand = localCommand.id;
        handleCommand(localCommand);
      }

      if (keys.has('KeyF')) {
        useHeldBalloon();
        keys.delete('KeyF');
      }
      if (keys.has('KeyC')) {
        cycleVehicle();
        keys.delete('KeyC');
      }
      if (keys.has('KeyQ')) {
        useBankedItem('boost');
        keys.delete('KeyQ');
      }
      if (keys.has('KeyE')) {
        useBankedItem('shield');
        keys.delete('KeyE');
      }
      if (keys.has('KeyR')) {
        useBankedItem('rocket');
        keys.delete('KeyR');
      }
      if (keys.has('KeyZ')) {
        upgradeHeldItem();
        keys.delete('KeyZ');
      }
      if (keys.has('KeyX')) {
        buyRareNextPickup();
        keys.delete('KeyX');
      }
      if (keys.has('KeyV')) {
        buyDoubleSlot();
        keys.delete('KeyV');
      }

      updatePlayer(dt);
      updateRivals(dt);
      updateTrackEvents(dt);
      updateTrackHazards(dt);
      updateRankings();
      syncMeshes(dt, now);
      updateCamera(dt);
      renderer.render(scene, camera);

      if (now - lastTelemetry > 90) {
        lastTelemetry = now;
        setTelemetry({
          altitude: race.player.flightAltitude,
          bananas: race.player.bananas,
          boost: race.player.boostTimer,
          cameraFlash: race.screenFlashTimer,
          drift: race.player.driftCharge,
          doubleSlotUses: race.player.doubleSlotUses,
          heldBalloon: race.player.heldBalloon,
          itemTier: race.player.heldItem?.level || 0,
          jump: race.player.jumpHeight,
          lap: Math.min(race.player.lap, compiled.laps),
          lapSplits: race.player.lapSplits.slice(-3),
          perfect: race.player.perfectBoostTimer > 0,
          place: race.player.rank,
          positionNotice: race.positionNotice,
          rareNextPickup: race.player.rareNextPickup,
          secondaryHeldItem: race.player.secondaryHeldItem,
          shield: race.player.shieldTimer,
          speed: Math.round(race.player.velocity.length() * 5.8),
          speedRatio: clamp(race.player.velocity.length() / ((VEHICLES[race.player.vehicleMode] || VEHICLES.kart).maxSpeed || 1), 0, 1.4),
          time: race.time,
          upgradeAvailable: race.player.bananas >= 3 && Boolean(race.player.heldItem) && race.player.heldItem.level < 3,
          vehicleMode: race.player.vehicleMode,
        });
      }

      if (race.player.finished && !reportedFinish) {
        reportedFinish = true;
        onFinishRef.current?.({
          bestLap: race.player.bestLap,
          place: race.player.rank,
          time: race.player.finishTime,
          trackKey: compiled.key,
        });
      }

      raf = window.requestAnimationFrame(tick);
    };

    const keyDown = (event) => {
      if (!relevantKeys.has(event.code)) return;
      event.preventDefault();
      if (event.code === 'Space' && !keys.has('Space')) jumpQueued = true;
      keys.add(event.code);
    };
    const keyUp = (event) => {
      if (!relevantKeys.has(event.code)) return;
      event.preventDefault();
      keys.delete(event.code);
    };

    window.addEventListener('keydown', keyDown, { passive: false });
    window.addEventListener('keyup', keyUp, { passive: false });
    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      if (ambientOscillator) ambientOscillator.stop();
      renderer.dispose();
    };
  }, [profile, runId, track]);

  const press = (patch) => (event) => {
    event.preventDefault();
    Object.assign(touchRef.current, patch);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const release = (patch) => (event) => {
    event.preventDefault();
    Object.assign(touchRef.current, patch);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const heldDefinition = telemetry.heldBalloon ? getItemDefinition(telemetry.heldBalloon.itemKey || telemetry.heldBalloon.key) : null;
  const HeldIcon =
    heldDefinition?.category === 'projectile'
      ? Target
      : heldDefinition?.category === 'self-buff'
      ? Zap
      : heldDefinition?.category === 'setup'
      ? Shield
      : heldDefinition?.category === 'vehicle-state'
      ? Plane
      : Sparkles;
  const vehicle = VEHICLES[telemetry.vehicleMode] || VEHICLES.kart;

  return (
    <div className="arcade-race-shell relative -mx-4 overflow-hidden border-y border-white/16 bg-[#10151d] shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:mx-0 sm:rounded-lg sm:border">
      <canvas
        ref={canvasRef}
        className="arcade-race-canvas block h-[min(78svh,680px)] min-h-[560px] w-full touch-none"
        style={{ filter: telemetry.boost > 0 ? 'saturate(1.18) contrast(1.08)' : 'none' }}
      />

      {telemetry.speedRatio > 0.8 && (
        <div className="pointer-events-none absolute inset-0 opacity-45 mix-blend-screen">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-[repeating-linear-gradient(100deg,transparent_0_18px,rgba(255,255,255,0.16)_18px_20px,transparent_20px_42px)]" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[repeating-linear-gradient(80deg,transparent_0_18px,rgba(255,255,255,0.16)_18px_20px,transparent_20px_42px)]" />
        </div>
      )}

      {telemetry.cameraFlash > 0 && (
        <div
          className="pointer-events-none absolute inset-0 bg-white mix-blend-screen"
          style={{ opacity: clamp(telemetry.cameraFlash / 0.18, 0, 0.34) }}
        />
      )}

      <div className="pointer-events-none absolute left-3 right-3 top-3 grid gap-2 sm:left-4 sm:right-auto sm:w-[360px]">
        <div className="arcade-hud-panel border border-white/18 bg-[#10151d]/[0.88] p-2.5 text-white shadow-[0_14px_34px_rgba(0,0,0,0.32)] backdrop-blur-md">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
            <div className="grid h-10 w-10 place-items-center border-2 border-[#2cc8ff] bg-[#2cc8ff]/15 text-[#2cc8ff]">
              <Gauge size={20} />
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[8px] font-black uppercase leading-none tracking-[0.16em] text-white/58">
                {track.shortName || track.name}
              </div>
              <div className="mt-1 truncate font-mono text-sm font-black uppercase leading-none text-white">
                Lap {telemetry.lap}/{track.laps} / {ordinal(telemetry.place)}
              </div>
            </div>
            <div className="text-right font-mono text-[18px] font-black leading-none text-[#ffd34f] tabular-nums">
              {telemetry.speed}
              <div className="mt-0.5 text-[7px] uppercase tracking-[0.14em] text-white/48">mph</div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2">
            <div className="h-2 border border-white/14 bg-black/32">
              <div
                className="h-full bg-[#ffd34f] transition-all"
                style={{ width: `${clamp((telemetry.drift / 2.75) * 100, 0, 100)}%` }}
              />
            </div>
            <div className="font-mono text-[8px] font-black uppercase tracking-[0.12em] text-white/56">
              Drift
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1 font-mono text-[8px] uppercase tracking-[0.08em] text-white/58">
            {[0, 1, 2].map((index) => (
              <div key={index} className="truncate">
                L{index + 1} <span className="text-white">{formatTime(telemetry.lapSplits[index])}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="arcade-hud-panel border border-white/16 bg-[#10151d]/[0.82] px-2 py-2 text-center font-mono text-white backdrop-blur-md">
            <div className="text-[8px] uppercase tracking-[0.14em] text-white/52">Bananas</div>
            <div className="mt-1 text-sm font-black text-[#ffd34f]">{telemetry.bananas}</div>
          </div>
          <div className="arcade-hud-panel border border-white/16 bg-[#10151d]/[0.82] px-2 py-2 text-center font-mono text-white backdrop-blur-md">
            <div className="text-[8px] uppercase tracking-[0.14em] text-white/52">Vehicle</div>
            <div className="mt-1 text-sm font-black text-[#2cc8ff]">{vehicle.label}</div>
          </div>
          <div className="arcade-hud-panel border border-white/16 bg-[#10151d]/[0.82] px-2 py-2 text-center font-mono text-white backdrop-blur-md">
            <div className="text-[8px] uppercase tracking-[0.14em] text-white/52">Time</div>
            <div className="mt-1 text-sm font-black">{formatTime(telemetry.time)}</div>
          </div>
          <div className="arcade-hud-panel border border-white/16 bg-[#10151d]/[0.82] px-2 py-2 text-center font-mono text-white backdrop-blur-md">
            <div className="text-[8px] uppercase tracking-[0.14em] text-white/52">
              {telemetry.vehicleMode === 'plane' ? 'Alt' : 'Jump'}
            </div>
            <div className="mt-1 text-sm font-black text-[#ffd34f]">
              {telemetry.vehicleMode === 'plane'
                ? Math.round(telemetry.altitude)
                : telemetry.jump > 0
                  ? Math.round(telemetry.jump)
                  : '--'}
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute right-3 top-3 grid w-[144px] gap-2 text-white sm:right-4">
        <button
          type="button"
          onClick={() => queueLocalCommand('item')}
          disabled={!telemetry.heldBalloon}
          className="arcade-hud-panel pointer-events-auto grid min-h-[72px] border border-white/18 bg-[#10151d]/[0.88] p-2 text-left shadow-[0_14px_34px_rgba(0,0,0,0.32)] backdrop-blur-md transition-opacity disabled:opacity-50"
          title="Use balloon item"
        >
          <div className="flex items-center gap-2">
            <span
              className="grid h-8 w-8 place-items-center border"
              style={{
                borderColor: telemetry.heldBalloon?.color || '#ffffff55',
                color: telemetry.heldBalloon?.color || '#ffffffaa',
              }}
            >
              <HeldIcon size={17} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-mono text-[8px] font-black uppercase tracking-[0.12em] text-white/56">
                Item
              </span>
              <span className="block truncate font-mono text-[10px] font-black uppercase leading-tight">
                {telemetry.heldBalloon?.label || 'Empty'}
              </span>
            </span>
          </div>
          <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#ffd34f]">
            {telemetry.heldBalloon
              ? `Tier ${telemetry.heldBalloon.level}${telemetry.secondaryHeldItem ? ' / +1 slot' : ''}`
              : 'Collect box'}
          </div>
        </button>

        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => queueLocalCommand('upgrade-tier')}
            disabled={!telemetry.upgradeAvailable}
            className="arcade-hud-panel pointer-events-auto h-8 border border-white/18 bg-[#10151d]/[0.86] font-mono text-[8px] font-black uppercase tracking-[0.08em] text-[#ffd34f] disabled:opacity-40"
            title="Spend 3 bananas to upgrade the held item"
          >
            T+1
          </button>
          <button
            type="button"
            onClick={() => queueLocalCommand('upgrade-rare')}
            disabled={telemetry.bananas < 5 || telemetry.rareNextPickup}
            className="arcade-hud-panel pointer-events-auto h-8 border border-white/18 bg-[#10151d]/[0.86] font-mono text-[8px] font-black uppercase tracking-[0.08em] text-[#ffd34f] disabled:opacity-40"
            title="Spend 5 bananas for a rare next pickup"
          >
            Rare
          </button>
          <button
            type="button"
            onClick={() => queueLocalCommand('upgrade-double')}
            disabled={telemetry.bananas < 8 || telemetry.doubleSlotUses > 0 || telemetry.secondaryHeldItem}
            className="arcade-hud-panel pointer-events-auto h-8 border border-white/18 bg-[#10151d]/[0.86] font-mono text-[8px] font-black uppercase tracking-[0.08em] text-[#ffd34f] disabled:opacity-40"
            title="Spend 8 bananas to arm a one-use second item slot"
          >
            Slot
          </button>
        </div>

        <button
          type="button"
          onClick={() => queueLocalCommand('vehicle')}
          className="arcade-hud-panel pointer-events-auto flex h-10 items-center justify-center gap-2 border border-white/18 bg-[#10151d]/[0.88] px-2 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-white backdrop-blur-md"
          title="Change vehicle"
        >
          <Plane size={13} />
          Switch
        </button>
      </div>

      {telemetry.perfect && (
        <div className="pointer-events-none absolute left-1/2 top-[21%] -translate-x-1/2 arcade-hud-panel border border-[#ffd34f]/60 bg-[#ffd34f] px-4 py-2 font-mono text-[11px] font-black uppercase tracking-[0.14em] text-[#10151d] shadow-[0_16px_42px_rgba(0,0,0,0.36)]">
          Perfect zipper
        </div>
      )}

      {telemetry.positionNotice && (
        <div className="pointer-events-none absolute left-1/2 top-[29%] -translate-x-1/2 arcade-hud-panel border border-[#2cc8ff]/60 bg-[#10151d]/90 px-4 py-2 font-mono text-[11px] font-black uppercase tracking-[0.14em] text-[#2cc8ff] shadow-[0_16px_42px_rgba(0,0,0,0.36)]">
          {telemetry.positionNotice.text}
        </div>
      )}

      <div className="arcade-touch-controls pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+18px)] z-30 flex items-end justify-between px-3 sm:hidden">
        <div className="pointer-events-auto flex gap-2">
          <button
            type="button"
            className="arcade-touch-button"
            onPointerDown={press({ steer: -1 })}
            onPointerUp={release({ steer: 0 })}
            onPointerCancel={release({ steer: 0 })}
            aria-label="Steer left"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            type="button"
            className="arcade-touch-button"
            onPointerDown={press({ steer: 1 })}
            onPointerUp={release({ steer: 0 })}
            onPointerCancel={release({ steer: 0 })}
            aria-label="Steer right"
          >
            <ArrowRight size={20} />
          </button>
        </div>

        <div className="pointer-events-auto flex items-end gap-2">
          <div className="grid gap-2">
            <button
              type="button"
              className="arcade-touch-button"
              onPointerDown={press({ jump: true })}
              onPointerUp={release({ jump: false })}
              onPointerCancel={release({ jump: false })}
              aria-label={telemetry.vehicleMode === 'plane' ? 'Climb' : 'Jump'}
            >
              <Zap size={18} />
            </button>
            <button
              type="button"
              className="arcade-touch-button"
              onPointerDown={press({ drift: true })}
              onPointerUp={release({ drift: false })}
              onPointerCancel={release({ drift: false })}
              aria-label={telemetry.vehicleMode === 'plane' ? 'Descend' : 'Drift'}
            >
              <Sparkles size={18} />
            </button>
            <button
              type="button"
              className="arcade-touch-button"
              onPointerDown={press({ brake: 1 })}
              onPointerUp={release({ brake: 0 })}
              onPointerCancel={release({ brake: 0 })}
              aria-label="Brake"
            >
              <ArrowDown size={18} />
            </button>
          </div>
          <button
            type="button"
            className="arcade-go-button"
            onPointerDown={press({ throttle: 1 })}
            onPointerUp={release({ throttle: 0 })}
            onPointerCancel={release({ throttle: 0 })}
            aria-label="Accelerate"
          >
            <ChevronsRight size={32} strokeWidth={3.1} />
            <span>Go</span>
          </button>
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-[calc(env(safe-area-inset-bottom)+100px)] left-3 hidden gap-2 sm:flex">
        <button
          type="button"
          onClick={() => queueLocalCommand('reset')}
          className="arcade-hud-panel flex h-10 items-center gap-2 border border-white/18 bg-[#10151d]/[0.82] px-3 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-white backdrop-blur-md"
        >
          <RotateCcw size={13} />
          Reset
        </button>
        <button
          type="button"
          onClick={() => queueLocalCommand('item')}
          disabled={!telemetry.heldBalloon}
          className="arcade-hud-panel flex h-10 items-center gap-2 border border-white/18 bg-[#10151d]/[0.82] px-3 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-white backdrop-blur-md disabled:opacity-45"
        >
          <ArrowUp size={13} />
          Use Item
        </button>
      </div>
    </div>
  );
};
