import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronsRight,
  CircleDot,
  Dumbbell,
  Plane,
  RotateCcw,
  Shield,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import * as THREE from 'three';
import {
  CAMERA_PRESETS,
  CurrencyStack,
  GAME_STATUS,
  VISUAL_PALETTE,
} from './comebackCityVisuals.jsx';
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
const ROAD_WIDTH_MULTIPLIER = 1.48;
const ROAD_WIDTH_MIN = 34;
const SHOULDER_WIDTH = 7.4;
const FLIGHT_MIN_ALTITUDE = 7.5;
const FLIGHT_CRUISE_ALTITUDE = 17;
const FLIGHT_MAX_ALTITUDE = 34;
const UP = new THREE.Vector3(0, 1, 0);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrap01 = (value) => ((value % 1) + 1) % 1;
const progressDistance = (a, b) => {
  const gap = Math.abs(wrap01(a) - wrap01(b));
  return Math.min(gap, 1 - gap);
};
const distance2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const signedAngleDelta = (target, current) => {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
};

const DRIFT_TUNING = {
  hover: {
    boostDuration: [0.48, 0.78, 1.04],
    boostStrength: [7.5, 11.5, 16],
    grip: 2.8,
    slideAngle: 0.18,
    slideForce: 12.2,
    sparkChargeTime: [0.58, 1.18, 1.95],
    turnAssist: 1.22,
  },
  kart: {
    boostDuration: [0.35, 0.75, 1.1],
    boostStrength: [9.5, 14.5, 20],
    grip: 4.05,
    slideAngle: 0.28,
    slideForce: 10.8,
    sparkChargeTime: [0.55, 1.3, 2.15],
    turnAssist: 1.7,
  },
  plane: {
    boostDuration: [0.42, 0.68, 0.92],
    boostStrength: [6, 9.5, 13],
    grip: 2.25,
    slideAngle: 0.1,
    slideForce: 5.8,
    sparkChargeTime: [0.62, 1.3, 2.1],
    turnAssist: 1.08,
  },
};

const VEHICLES = {
  kart: {
    label: 'Kart',
    acceleration: 58,
    brake: 54,
    boostMax: 76,
    cameraDistance: 30,
    cameraHeight: 8.4,
    driftCharge: 1.08,
    driftGrip: DRIFT_TUNING.kart.grip,
    driftSlip: DRIFT_TUNING.kart.slideForce,
    driftTurn: DRIFT_TUNING.kart.turnAssist,
    driftVisualAngle: DRIFT_TUNING.kart.slideAngle,
    grip: 14.2,
    hover: 0,
    maxSpeed: 58,
    offroad: 0.46,
    reverse: 16,
    steer: 2.46,
  },
  hover: {
    label: 'Hover',
    acceleration: 39,
    brake: 42,
    boostMax: 64,
    cameraDistance: 40,
    cameraHeight: 12.5,
    driftCharge: 0.94,
    driftGrip: DRIFT_TUNING.hover.grip,
    driftSlip: DRIFT_TUNING.hover.slideForce,
    driftTurn: DRIFT_TUNING.hover.turnAssist,
    driftVisualAngle: DRIFT_TUNING.hover.slideAngle,
    grip: 6.8,
    hover: 1.25,
    maxSpeed: 47,
    offroad: 0.68,
    reverse: 18,
    steer: 1.95,
  },
  plane: {
    label: 'Plane',
    acceleration: 39,
    brake: 34,
    boostMax: 78,
    cameraDistance: 58,
    cameraHeight: 11.5,
    driftCharge: 0.78,
    driftGrip: DRIFT_TUNING.plane.grip,
    driftSlip: DRIFT_TUNING.plane.slideForce,
    driftTurn: DRIFT_TUNING.plane.turnAssist,
    driftVisualAngle: DRIFT_TUNING.plane.slideAngle,
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

const TRACK_THEME = {
  'comeback-city': {
    fog: '#c9f4f8',
    ground: '#57ac63',
    horizon: '#bdefff',
    sky: '#66c8ed',
  },
  'magnet-mine-descent': {
    fog: '#1a1422',
    ground: '#211827',
    horizon: '#1f2937',
    sky: '#140f1c',
  },
  'static-storm-plateau': {
    fog: '#20284f',
    ground: '#2b315f',
    horizon: '#1f2a55',
    sky: '#18204a',
  },
  'tide-pier': {
    fog: '#bdf6ff',
    ground: '#5fa56c',
    horizon: '#6ed3ef',
    sky: '#59c6ed',
  },
};

const RACE_CITY_DISTRICTS = [
  {
    accent: VISUAL_PALETTE.gym,
    base: '#3ca75b',
    dark: '#1f5f35',
    icon: 'dumbbell',
    label: 'GYM',
    progress: 0.905,
    roof: '#e9f7ce',
    side: 1,
  },
  {
    accent: VISUAL_PALETTE.food,
    base: '#f28b2e',
    dark: '#9d4516',
    icon: 'utensils',
    label: 'FOOD COURT',
    progress: 0.838,
    roof: '#fff0b0',
    side: -1,
  },
  {
    accent: VISUAL_PALETTE.lab,
    base: '#8a53df',
    dark: '#38206f',
    icon: 'flask',
    label: 'LAB',
    progress: 0.878,
    roof: '#f0e2ff',
    side: -1,
  },
  {
    accent: VISUAL_PALETTE.clinic,
    base: '#e64b4b',
    dark: '#7c202c',
    icon: 'cross',
    label: 'CLINIC',
    progress: 0.954,
    roof: '#f3ece0',
    side: -1,
  },
  {
    accent: VISUAL_PALETTE.garage,
    base: '#2677d8',
    dark: '#143d78',
    icon: 'wrench',
    label: 'GARAGE',
    progress: 0.825,
    roof: '#e4f8ff',
    side: 1,
  },
];

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

const toCourseV2Point = (point, y = 0) =>
  new THREE.Vector3(point.x || 0, point.y ?? y, point.z ?? point.y ?? 0);

const sampleCourseLine = (points, { closed = false, divisions = 32 } = {}) => {
  const vectors = (points || []).map((point) => toCourseV2Point(point));
  if (vectors.length < 3) return vectors;
  const curve = new THREE.CatmullRomCurve3(vectors, closed, 'catmullrom', 0.42);
  const samples = curve.getSpacedPoints(Math.max(divisions, vectors.length * 4));
  if (closed && samples.length > 1) samples.pop();
  return samples;
};

const makeRaceMinimap = (track) => {
  const course = track.courseV2;
  const source = course?.minimapPath?.length
    ? course.minimapPath
    : (track.points || []).map((point) => ({ x: point.x, z: point.y }));
  const branches = course?.branches || track.shortcuts || [];
  if (!source.length) return null;
  const allPoints = [
    ...source,
    ...branches.flatMap((branch) => branch.points || []),
  ].map((point) => ({ x: point.x || 0, z: point.z ?? point.y ?? 0 }));
  const bounds = allPoints.reduce(
    (acc, point) => ({
      maxX: Math.max(acc.maxX, point.x),
      maxZ: Math.max(acc.maxZ, point.z),
      minX: Math.min(acc.minX, point.x),
      minZ: Math.min(acc.minZ, point.z),
    }),
    { maxX: -Infinity, maxZ: -Infinity, minX: Infinity, minZ: Infinity }
  );
  const spanX = Math.max(1, bounds.maxX - bounds.minX);
  const spanZ = Math.max(1, bounds.maxZ - bounds.minZ);
  const pad = 12;
  const mapPoint = (point) => {
    const x = pad + ((point.x - bounds.minX) / spanX) * (100 - pad * 2);
    const y = pad + ((point.z - bounds.minZ) / spanZ) * (100 - pad * 2);
    return [Number(x.toFixed(2)), Number(y.toFixed(2))];
  };
  const pathFor = (points, closed = false) => {
    const mapped = points.map((point) => mapPoint({ x: point.x || 0, z: point.z ?? point.y ?? 0 }));
    if (!mapped.length) return '';
    const body = mapped.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
    return closed ? `${body} Z` : body;
  };
  return {
    branches: branches.map((branch) => ({
      accent: branch.accent || '#46d9ef',
      d: pathFor(branch.points || [], false),
      key: branch.key,
    })),
    route: pathFor(source, true),
  };
};

const pointOnSegment = (segment, t) => ({
  point: new THREE.Vector3(
    segment.a.x + segment.dx * t,
    0,
    segment.a.z + segment.dz * t
  ),
  tangent: segment.tangent.clone(),
});

const compileTrack3D = (track) => {
  const courseV2 = track.courseV2 || null;
  const points = courseV2
    ? sampleCourseLine(courseV2.centerline, {
        closed: true,
        divisions: courseV2.sampleCount || 128,
      })
    : track.points.map((point) => toWorldPoint(point));
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

  const nearestOnSegments = (sourceSegments, sourceTotalLength, position, progressMapper = (value) => value) => {
    let best = null;
    sourceSegments.forEach((segment) => {
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
          progress: progressMapper((segment.start + segment.length * t) / sourceTotalLength),
          tangent: segment.tangent.clone(),
        };
      }
    });
    return best;
  };

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

  const nearestMain = (position) => nearestOnSegments(segments, totalLength, position);

  const roadWidth = courseV2
    ? courseV2.mainRoadWidth || track.width || 50
    : Math.max(ROAD_WIDTH_MIN, track.width * TRACK_SCALE * ROAD_WIDTH_MULTIPLIER);

  const compileBranchRoute = (shortcut, index) => {
    const branchPoints = courseV2
      ? sampleCourseLine(shortcut.points || [], {
          closed: false,
          divisions: shortcut.sampleCount || Math.max(18, (shortcut.points || []).length * 8),
        })
      : (shortcut.points || []).map((point) => toWorldPoint(point));
    const branchSegments = [];
    let branchLength = 0;

    for (let pointIndex = 0; pointIndex < branchPoints.length - 1; pointIndex += 1) {
      const a = branchPoints[pointIndex];
      const b = branchPoints[pointIndex + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.max(0.001, Math.hypot(dx, dz));
      branchSegments.push({
        a,
        b,
        dx,
        dz,
        length,
        start: branchLength,
        tangent: new THREE.Vector3(dx / length, 0, dz / length),
      });
      branchLength += length;
    }

    const inferredStart = branchPoints[0] ? nearestMain(branchPoints[0]).progress : 0;
    const inferredEnd = branchPoints[branchPoints.length - 1]
      ? nearestMain(branchPoints[branchPoints.length - 1]).progress
      : inferredStart;
    const startProgress = Number.isFinite(shortcut.startProgress) ? wrap01(shortcut.startProgress) : inferredStart;
    const endProgress = Number.isFinite(shortcut.endProgress) ? wrap01(shortcut.endProgress) : inferredEnd;
    let span = endProgress - startProgress;
    if (span < -0.5) span += 1;
    if (span > 0.5) span -= 1;

    return {
      ...shortcut,
      endProgress,
      index,
      points: branchPoints,
      progressAt: (progress) => wrap01(startProgress + span * progress),
      roadWidth: courseV2
        ? shortcut.width || roadWidth * 0.72
        : Math.max(
            ROAD_WIDTH_MIN * 0.78,
            (shortcut.width || track.width * 0.78) * TRACK_SCALE * ROAD_WIDTH_MULTIPLIER
          ),
      segments: branchSegments,
      shoulderWidth: courseV2 ? shortcut.shoulderWidth || 5 : Math.max(4.4, SHOULDER_WIDTH * 0.72),
      startProgress,
      totalLength: branchLength,
    };
  };

  const branchRoutes = [
    ...((courseV2?.branches || track.shortcuts || [])),
    ...(courseV2 ? [] : track.branches || []),
  ].filter((branch) => (branch.points || []).length > 1).map(compileBranchRoute);

  const nearest = (position) => {
    let best = nearestMain(position);
    branchRoutes.forEach((route) => {
      const candidate = nearestOnSegments(route.segments, route.totalLength, position, route.progressAt);
      if (
        candidate &&
        candidate.distance - route.roadWidth * 0.08 < best.distance - roadWidth * 0.08
      ) {
        best = { ...candidate, branchKey: route.key, roadWidth: route.roadWidth };
      }
    });
    return best;
  };

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
    bananaPlacements: courseV2?.bananaPlacements || track.bananaPlacements || null,
    branchRoutes,
    bounds,
    cameraCheckpoints: courseV2?.cameraCheckpoints || [],
    collisionZones: courseV2?.collisionZones || [],
    courseV2,
    districtAnchors: courseV2?.districtAnchors || null,
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
    surfaceZones: courseV2?.surfaceZones || [],
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

  const chassis = color || VISUAL_PALETTE.redKart;
  const glow = accent || VISUAL_PALETTE.cyan;
  const bodyMat = createBasicMaterial(chassis, { emissive: chassis, emissiveIntensity: 0.1 });
  const accentMat = createBasicMaterial(glow, { emissive: glow, emissiveIntensity: 0.48 });
  const darkMat = createBasicMaterial(VISUAL_PALETTE.tire);
  const cockpitMat = createBasicMaterial('#202837');
  const trimMat = createBasicMaterial('#f6fbff');
  const headlightMat = createBasicMaterial(VISUAL_PALETTE.cyan, {
    emissive: VISUAL_PALETTE.cyan,
    emissiveIntensity: 0.78,
  });
  const suitMat = createBasicMaterial(suit);

  const addBox = (size, position, material = bodyMat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
    mesh.position.set(position.x || 0, position.y || 0, position.z || 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  addBox({ x: 7.4, y: 1.25, z: 9.8 }, { y: 1.48, z: 0.15 }, bodyMat);
  addBox({ x: 6.6, y: 0.8, z: 5.1 }, { y: 2.22, z: 2.15 }, bodyMat);
  addBox({ x: 4.7, y: 1.95, z: 3.5 }, { y: 3.28, z: -1.45 }, cockpitMat);
  addBox({ x: 7.8, y: 0.46, z: 1.15 }, { y: 2.18, z: 4.95 }, trimMat);
  addBox({ x: 7.2, y: 0.38, z: 1.05 }, { y: 1.16, z: -5.1 }, darkMat);
  addBox({ x: 3.4, y: 0.42, z: 1.2 }, { y: 2.62, z: 5.18 }, headlightMat);
  [-1, 1].forEach((side) => {
    addBox({ x: 1.35, y: 0.46, z: 1.12 }, { x: side * 2.6, y: 2.46, z: 5.52 }, headlightMat);
    addBox({ x: 0.58, y: 0.6, z: 6.5 }, { x: side * 4.42, y: 1.95, z: -0.2 }, darkMat);
    addBox({ x: 0.72, y: 0.46, z: 5.8 }, { x: side * 4.84, y: 2.2, z: 0.35 }, accentMat);
  });

  const nose = new THREE.Mesh(new THREE.ConeGeometry(3.55, 5.2, 4), bodyMat);
  nose.position.set(0, 1.55, 5.95);
  nose.rotation.x = Math.PI / 2;
  nose.rotation.y = Math.PI / 4;
  nose.castShadow = true;
  group.add(nose);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.34, 8.2), trimMat);
  stripe.position.set(0, 2.94, 1.25);
  stripe.castShadow = true;
  group.add(stripe);

  const driver = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 1.12, 1.65, 7), suitMat);
  torso.position.y = 4.15;
  const helmet = new THREE.Mesh(new THREE.DodecahedronGeometry(1.14, 0), accentMat);
  helmet.position.y = 5.38;
  driver.position.z = -1.9;
  driver.add(torso, helmet);
  group.add(driver);

  [-1, 1].forEach((side) => {
    const cage = new THREE.Mesh(new THREE.BoxGeometry(0.34, 3.4, 0.34), darkMat);
    cage.position.set(side * 1.85, 4.2, -2.2);
    cage.rotation.z = side * 0.14;
    group.add(cage);
  });
  addBox({ x: 4.2, y: 0.32, z: 0.44 }, { y: 5.72, z: -2.18 }, darkMat);

  const wheelGroup = new THREE.Group();
  const wheelMat = createBasicMaterial(VISUAL_PALETTE.tire);
  const hubMat = createBasicMaterial(glow, { emissive: glow, emissiveIntensity: 0.34 });
  const wheels = [];
  [
    [-4.4, 1.02, -3.55],
    [4.4, 1.02, -3.55],
    [-4.4, 1.02, 3.65],
    [4.4, 1.02, 3.65],
  ].forEach(([x, y, z]) => {
    const wheel = new THREE.Group();
    wheel.position.set(x, y, z);
    wheel.userData.front = z > 0;
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.62, 1.48, 14), wheelMat);
    tire.rotation.z = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 1.62, 9), hubMat);
    hub.rotation.z = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.11, 5, 18), hubMat);
    rim.rotation.y = Math.PI / 2;
    wheel.add(tire, hub, rim);
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

  const driftSparkGroup = new THREE.Group();
  driftSparkGroup.visible = false;
  const driftSparkMaterial = createBasicMaterial('#f7fbff', {
    emissive: '#f7fbff',
    emissiveIntensity: 0.86,
  });
  [-1, 1].forEach((side) => {
    for (let index = 0; index < 4; index += 1) {
      const spark = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34 + index * 0.08, 0), driftSparkMaterial.clone());
      spark.position.set(side * (3.85 + index * 0.22), 0.92 + index * 0.2, -3.6 - index * 0.78);
      spark.userData.side = side;
      spark.userData.phase = index * 0.62;
      driftSparkGroup.add(spark);
    }
  });
  group.add(driftSparkGroup);

  const setMode = (mode) => {
    wheelGroup.visible = mode !== 'plane';
    hoverGroup.visible = mode === 'hover';
    planeGroup.visible = mode === 'plane';
  };

  return { boostFlame, driftSparkGroup, group, setMode, wheels };
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
    boostTier: 0,
    cameraFlash: 0,
    drift: 0,
    driftActive: false,
    driftTier: 0,
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
    offroad: false,
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
    const query = new URLSearchParams(window.location.search);
    const playtest = {
      bananaMax: 0,
      enabled: query.get('raceAutoplay') === '1',
      hazardsEncountered: 0,
      itemBoxesCollected: 0,
      itemUses: 0,
      layers: new Set(),
      locks: 0,
      mode: query.get('raceMode') || 'free-switch',
      raceIndex: Number(query.get('raceIndex') || 1),
      signatureUsed: false,
      started: false,
      switchPads: 0,
      upgrades: 0,
      vehicles: new Set(),
      zones: 0,
    };
    const kartOnly = Boolean(compiled.kartOnly || compiled.courseV2?.kartOnly);
    const defaultVehicle = kartOnly ? 'kart' : DEFAULT_VEHICLE_BY_STYLE[compiled.raceStyle] || 'kart';
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

    const theme = TRACK_THEME[compiled.key] || {};
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.sky || '#59c6ed');
    scene.fog = new THREE.Fog(theme.fog || '#bdf6ff', 180, 520);

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
    const collisionCircles = [];
    const cameraCollisionObjects = [];
    const registerCameraCollider = (object) => {
      if (object) cameraCollisionObjects.push(object);
      return object;
    };

    const bounds = compiled.bounds;
    const trackSpanX = bounds.maxX - bounds.minX;
    const trackSpanZ = bounds.maxZ - bounds.minZ;
    const trackCenterX = (bounds.minX + bounds.maxX) / 2;
    const trackCenterZ = (bounds.minZ + bounds.maxZ) / 2;

    const groundMat = createBasicMaterial(compiled.grass || theme.ground || '#79c96d');
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
    const mutedLineMat = createBasicMaterial('#9fb0aa');
    const shoulderMat = createBasicMaterial('#586675');
    const railMat = createBasicMaterial('#eef6ff');
    const railPostMat = createBasicMaterial('#202837');
    const cleanCityCourse = compiled.key === 'comeback-city';

    const addTrackSegment = (segment, options = {}) => {
      const roadWidth = options.roadWidth || compiled.roadWidth;
      const shoulderWidth = options.shoulderWidth || SHOULDER_WIDTH;
      const cleanRoad = options.clean ?? cleanCityCourse;
      const railMode = options.railMode ?? (cleanRoad ? 'none' : 'full');
      const showCurbs = options.showCurbs ?? true;
      const showLines = options.showLines ?? true;
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
          new THREE.BoxGeometry(segment.length + 0.9, 0.16, shoulderWidth),
          shoulderMat,
          0,
          side * (roadWidth / 2 + shoulderWidth / 2 + 0.9),
          0.14
        );
      });

      const road = new THREE.Mesh(
        new THREE.BoxGeometry(segment.length + 1.1, 0.24, roadWidth),
        asphaltMat
      );
      road.position.copy(center);
      road.rotation.y = yaw;
      road.receiveShadow = true;
      world.add(road);

      if (showLines) {
        [-1, 1].forEach((side) => {
          placeLocalBox(
            new THREE.BoxGeometry(segment.length + 0.9, 0.14, cleanRoad ? 0.14 : 0.34),
            cleanRoad ? mutedLineMat : whiteLineMat,
            0,
            side * (roadWidth / 2 - (cleanRoad ? 0.9 : 1.25)),
            0.35
          );
        });
      }

      if (showCurbs) {
        const curbStep = cleanRoad ? 24 : 7;
        for (let offset = cleanRoad ? 8 : 3.5; offset < segment.length; offset += curbStep) {
          const t = offset / segment.length;
          [-1, 1].forEach((side) => {
            const curb = new THREE.Mesh(
              new THREE.BoxGeometry(cleanRoad ? 5.8 : 4.4, cleanRoad ? 0.24 : 0.36, cleanRoad ? 0.46 : 1.04),
              cleanRoad
                ? Math.floor(offset / curbStep + (side > 0 ? 0 : 1)) % 2 === 0
                  ? curbBMat
                  : curbAMat
                : Math.floor(offset / 7 + (side > 0 ? 0 : 1)) % 2 === 0
                  ? curbAMat
                  : curbRedMat
            );
            curb.position.set(segment.a.x + segment.dx * t, 0.38, segment.a.z + segment.dz * t);
            curb.rotation.y = yaw;
            curb.translateZ(side * (roadWidth / 2 + (cleanRoad ? 0.28 : 0.52)));
            curb.castShadow = true;
            curb.receiveShadow = true;
            world.add(curb);
          });
        }
      }

      const dashStep = cleanRoad ? 30 : 14;
      if (showLines) {
        for (let offset = cleanRoad ? 14 : 7; offset < segment.length; offset += dashStep) {
          const t = offset / segment.length;
          if (cleanRoad) {
            const dash = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.08, 0.22), lineMat);
            dash.position.set(segment.a.x + segment.dx * t, 0.39, segment.a.z + segment.dz * t);
            dash.rotation.y = yaw;
            world.add(dash);
          } else {
            [-0.58, 0.58].forEach((laneOffset) => {
              const dash = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.09, 0.18), lineMat);
              dash.position.set(segment.a.x + segment.dx * t, 0.39, segment.a.z + segment.dz * t);
              dash.rotation.y = yaw;
              dash.translateZ(laneOffset);
              world.add(dash);
            });

            [-roadWidth * 0.24, roadWidth * 0.24].forEach((laneOffset) => {
              const dash = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 0.22), whiteLineMat);
              dash.position.set(segment.a.x + segment.dx * t, 0.38, segment.a.z + segment.dz * t);
              dash.rotation.y = yaw;
              dash.translateZ(laneOffset);
              world.add(dash);
            });
          }
        }
      }

      if (railMode === 'none') return;
      [-1, 1].forEach((side) => {
        const railZ = side * (roadWidth / 2 + shoulderWidth + 1.2);
        placeLocalBox(new THREE.BoxGeometry(segment.length + 0.8, 0.34, 0.28), railMat, 0, railZ, 1.35, true);
        if (railMode === 'full') {
          placeLocalBox(new THREE.BoxGeometry(segment.length + 0.8, 0.28, 0.22), railMat, 0, railZ, 2.15, true);
        }
        for (let offset = 5; offset < segment.length; offset += 18) {
          placeLocalBox(new THREE.BoxGeometry(0.62, 2.2, 0.62), railPostMat, offset - segment.length / 2, railZ, 1.1, true);
        }
      });
    };

    const addTrackCaps = (pointsToCap, roadWidth, shoulderWidth, showRings = true) => {
      pointsToCap.forEach((point, index) => {
        const shoulderCap = new THREE.Mesh(
          new THREE.CylinderGeometry(
            roadWidth / 2 + shoulderWidth + 0.9,
            roadWidth / 2 + shoulderWidth + 0.9,
            0.14,
            28
          ),
          shoulderMat
        );
        shoulderCap.position.set(point.x, 0.08, point.z);
        shoulderCap.receiveShadow = true;
        world.add(shoulderCap);

        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(roadWidth / 2, roadWidth / 2, 0.2, 24),
          asphaltMat
        );
        cap.position.set(point.x, 0.1, point.z);
        cap.receiveShadow = true;
        world.add(cap);

        if (showRings && index % 2 === 0) {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(roadWidth / 2 + 0.42, 0.2, 4, 24),
            index % 4 === 0 ? curbAMat : curbBMat
          );
          ring.position.set(point.x, 0.31, point.z);
          ring.rotation.x = Math.PI / 2;
          world.add(ring);
        }
      });
    };

    compiled.segments.forEach((segment) =>
      addTrackSegment(segment, {
        clean: cleanCityCourse,
        railMode: cleanCityCourse ? 'none' : 'full',
      })
    );
    addTrackCaps(compiled.points, compiled.roadWidth, SHOULDER_WIDTH, !cleanCityCourse);
    (compiled.branchRoutes || []).forEach((route) => {
      route.segments.forEach((segment) =>
        addTrackSegment(segment, {
          clean: cleanCityCourse,
          railMode: cleanCityCourse || route.rails === false ? 'none' : 'low',
          roadWidth: route.roadWidth,
          shoulderWidth: route.shoulderWidth,
          showCurbs: !cleanCityCourse,
          showLines: true,
        })
      );
      if (!cleanCityCourse) addTrackCaps(route.points, route.roadWidth, route.shoulderWidth, false);
    });

    const startSample = compiled.pointAt(compiled.startProgress || 0);
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
      group.visible = cleanCityCourse ? defaultVehicle === 'plane' : defaultVehicle === 'plane' || index % 3 === 0;
      world.add(group);
      return { glow, group, ring };
    });

    const switchPadMeshes = (cleanCityCourse ? [] : race.switchPads).map((pad) => {
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
        registerCameraCollider(base);
        collisionCircles.push({ position: new THREE.Vector3(x, 0, z), radius: Math.max(w, d) * 0.68 });
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(w + 1.2, 1.4, d + 1.2),
          roofMats[index % roofMats.length]
        );
        roof.position.set(x, h + 0.7, z);
        roof.castShadow = true;
        world.add(roof);
        registerCameraCollider(roof);
        addWindows(x, z, w, d, h);
      };

      const treeMat = createBasicMaterial('#4cae50');
      const trunkMat = createBasicMaterial('#8a5a2f');

      const addLandmarkLabel = (group, label, color) => {
        const sprite = createBillboardText(label, color);
        sprite.position.y = 18;
        sprite.scale.set(12, 3, 1);
        group.add(sprite);
      };

      const addTrackLandmark = (item, index) => {
        const position = toWorldPoint(item);
        const width = Math.max(12, (item.w || 90) * TRACK_SCALE);
        const depth = Math.max(10, (item.h || item.w || 90) * TRACK_SCALE * 0.45);
        const height = Math.max(14, (item.h || 120) * TRACK_SCALE * 0.72);
        const color = item.color || compiled.accent || '#2cc8ff';
        const accentMat = createBasicMaterial(color, { emissive: color, emissiveIntensity: 0.32 });
        const darkMat = createBasicMaterial('#111827');
        const lightMat = createBasicMaterial('#f7fbff', { emissive: '#ffd34f', emissiveIntensity: 0.32 });
        const metalMat = createBasicMaterial('#6b7280', { metalness: 0.18, roughness: 0.48 });
        const group = new THREE.Group();
        group.position.copy(position);

        if (item.kind === 'lighthouse') {
          const tower = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.11, width * 0.16, height, 18), lightMat);
          tower.position.y = height / 2;
          const bandA = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.17, width * 0.17, 2.2, 18), accentMat);
          bandA.position.y = height * 0.32;
          const bandB = bandA.clone();
          bandB.position.y = height * 0.62;
          const lantern = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.2, width * 0.2, 5, 16), accentMat);
          lantern.position.y = height + 3;
          const roof = new THREE.Mesh(new THREE.ConeGeometry(width * 0.24, 6, 16), darkMat);
          roof.position.y = height + 8.4;
          const beam = new THREE.Mesh(
            new THREE.BoxGeometry(width * 1.5, 0.45, 5.2),
            new THREE.MeshBasicMaterial({ color: '#fff7b7', opacity: 0.34, transparent: true })
          );
          beam.position.set(width * 0.72, height + 3.1, 0);
          group.add(tower, bandA, bandB, lantern, roof, beam);
          addLandmarkLabel(group, 'LIGHTHOUSE', color);
        } else if (item.kind === 'boats') {
          for (let boat = 0; boat < 5; boat += 1) {
            const boatGroup = new THREE.Group();
            const hull = new THREE.Mesh(new THREE.BoxGeometry(11, 2.4, 4.8), createBasicMaterial(boat % 2 ? '#ef4444' : '#2cc8ff'));
            const bow = new THREE.Mesh(new THREE.ConeGeometry(2.5, 4.2, 4), hull.material);
            const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 10, 6), darkMat);
            const sail = new THREE.Mesh(
              new THREE.BoxGeometry(0.18, 5.6, 3.8),
              new THREE.MeshBasicMaterial({ color: '#fff7da', opacity: 0.82, transparent: true })
            );
            bow.position.z = 4.2;
            bow.rotation.x = Math.PI / 2;
            mast.position.y = 5.5;
            sail.position.set(0.2, 5.2, 1.2);
            boatGroup.add(hull, bow, mast, sail);
            boatGroup.position.set((boat - 2) * 14, 1.5 + Math.sin(boat) * 0.4, (boat % 2) * 8 - 4);
            boatGroup.rotation.y = boat % 2 ? 0.34 : -0.28;
            group.add(boatGroup);
          }
          addLandmarkLabel(group, 'HARBOR', color);
        } else if (item.kind === 'market') {
          for (let stall = 0; stall < 6; stall += 1) {
            const stallGroup = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(9.5, 5.2, 8), blockMats[(stall + index) % blockMats.length]);
            const awning = new THREE.Mesh(new THREE.BoxGeometry(10.6, 1, 8.8), accentMat);
            const laundry = new THREE.Mesh(
              new THREE.BoxGeometry(7, 0.16, 3.5),
              createBasicMaterial(stall % 2 ? '#f7fbff' : '#f45b69')
            );
            body.position.y = 2.6;
            awning.position.y = 5.7;
            laundry.position.set(0, 7.8, 4.8);
            stallGroup.add(body, awning, laundry);
            stallGroup.position.set((stall - 2.5) * 10.5, 0, (stall % 2) * 8 - 4);
            group.add(stallGroup);
          }
          addLandmarkLabel(group, 'FISH MARKET', color);
        } else if (item.kind === 'island') {
          const island = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.55, width * 0.7, 4.5, 24), createBasicMaterial('#d9b66f'));
          const grass = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.5, width * 0.5, 1.1, 24), createBasicMaterial(color));
          island.position.y = 2.2;
          grass.position.y = 5;
          group.add(island, grass);
          [-0.32, 0.28].forEach((offset) => {
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.58, 8, 6), trunkMat);
            const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2, 0), treeMat);
            trunk.position.set(offset * width, 9, offset * depth);
            crown.position.set(offset * width, 14, offset * depth);
            group.add(trunk, crown);
          });
          addLandmarkLabel(group, 'ISLAND', color);
        } else if (item.kind === 'spire') {
          const base = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.32, width * 0.42, height * 0.42, 8), darkMat);
          const spike = new THREE.Mesh(new THREE.ConeGeometry(width * 0.28, height, 8), accentMat);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(width * 0.38, 0.7, 8, 32), accentMat);
          base.position.y = height * 0.21;
          spike.position.y = height * 0.86;
          ring.position.y = height * 0.66;
          ring.rotation.x = Math.PI / 2;
          group.add(base, spike, ring);
          addLandmarkLabel(group, 'STORM EYE', color);
        } else if (item.kind === 'mesa') {
          const mesaBase = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.38, width * 0.52, depth, 9), createBasicMaterial('#7c4a2d'));
          const top = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.5, width * 0.48, 4.2, 9), accentMat);
          mesaBase.position.y = depth / 2;
          top.position.y = depth + 2.1;
          group.add(mesaBase, top);
        } else if (item.kind === 'storm') {
          for (let cloud = 0; cloud < 10; cloud += 1) {
            const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(6 + (cloud % 3) * 1.6, 0), createBasicMaterial('#2f3567'));
            puff.position.set((cloud - 4.5) * 10, 24 + Math.sin(cloud) * 3, Math.cos(cloud) * 10);
            group.add(puff);
          }
          for (let bolt = 0; bolt < 5; bolt += 1) {
            const strike = new THREE.Mesh(new THREE.BoxGeometry(0.8, 22, 0.8), accentMat);
            strike.position.set((bolt - 2) * 18, 10, bolt % 2 ? 8 : -8);
            strike.rotation.z = bolt % 2 ? 0.24 : -0.18;
            group.add(strike);
          }
          addLandmarkLabel(group, 'LIGHTNING', color);
        } else if (item.kind === 'drill') {
          const shaft = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.16, width * 0.16, height * 0.6, 14), metalMat);
          const bit = new THREE.Mesh(new THREE.ConeGeometry(width * 0.24, height * 0.48, 14), accentMat);
          const platform = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.5, width * 0.5, 4.4, 18), darkMat);
          platform.position.y = 2.2;
          shaft.position.y = height * 0.34;
          bit.position.y = height * 0.82;
          group.add(platform, shaft, bit);
          addLandmarkLabel(group, 'CENTRAL DRILL', color);
        } else if (item.kind === 'ore') {
          for (let crystal = 0; crystal < 9; crystal += 1) {
            const gem = new THREE.Mesh(new THREE.ConeGeometry(2.2 + (crystal % 3) * 0.5, 8 + (crystal % 4), 5), accentMat);
            gem.position.set((crystal % 3 - 1) * 5, 4 + (crystal % 4), (Math.floor(crystal / 3) - 1) * 5);
            gem.rotation.z = (crystal - 4) * 0.08;
            group.add(gem);
          }
        } else if (item.kind === 'rails') {
          [-3.2, 3.2].forEach((offset) => {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.55, 0.55), metalMat);
            rail.position.set(0, 0.7, offset);
            group.add(rail);
          });
          for (let sleeper = -Math.floor(width / 8); sleeper <= Math.floor(width / 8); sleeper += 1) {
            const tie = new THREE.Mesh(new THREE.BoxGeometry(1, 0.35, 9.5), darkMat);
            tie.position.set(sleeper * 8, 0.35, 0);
            group.add(tie);
          }
        }

        group.userData.kind = item.kind;
        world.add(group);
        registerCameraCollider(group);
        collisionCircles.push({
          position: position.clone(),
          radius: Math.max(width, depth) * (item.kind === 'boats' ? 0.48 : 0.62),
        });
      };

      (compiled.scenery || [])
        .filter(
          (item) =>
            !compiled.courseV2 &&
            item.kind !== 'island' &&
            !(cleanCityCourse && ['drill', 'market', 'rails', 'spire'].includes(item.kind))
        )
        .forEach(addTrackLandmark);

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

      (compiled.collisionZones || []).forEach((zone) => {
        const position = toCourseV2Point(zone.position || zone);
        const radius =
          zone.shape === 'box'
            ? Math.max(zone.size?.w || zone.w || 1, zone.size?.d || zone.d || 1) * 0.64
            : zone.radius || 12;
        collisionCircles.push({
          key: zone.key,
          position,
          radius,
        });
      });

      const streetLampCount = cleanCityCourse ? 10 : 24;
      for (let i = 0; i < streetLampCount; i += 1) {
        const sample = compiled.pointAt(i / streetLampCount);
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

      const startSample = compiled.pointAt(compiled.startProgress || 0);
      const corridorForward = startSample.tangent.clone().normalize();
      const corridorRight = new THREE.Vector3(corridorForward.z, 0, -corridorForward.x).normalize();
      const corridorOrigin = startSample.point.clone();
      const raceCityMaterials = {
        asphalt: asphaltMat,
        cyan: createBasicMaterial(VISUAL_PALETTE.cyan, {
          emissive: VISUAL_PALETTE.cyan,
          emissiveIntensity: 0.85,
        }),
        dark: createBasicMaterial('#10151d'),
        glass: createBasicMaterial('#dff8ff', {
          emissive: '#74f1ff',
          emissiveIntensity: 0.38,
        }),
        light: createBasicMaterial('#f7fbff'),
        yellow: createBasicMaterial(VISUAL_PALETTE.roadLine, {
          emissive: VISUAL_PALETTE.roadLine,
          emissiveIntensity: 0.18,
        }),
      };

      const cityPoint = (forwardDistance, lateral = 0, y = 0) =>
        corridorOrigin
          .clone()
          .addScaledVector(corridorForward, forwardDistance)
          .addScaledVector(corridorRight, lateral)
          .setY(y);

      const faceRoadYaw = (position, target = corridorOrigin) => {
        const direction = target.clone().sub(position).setY(0).normalize();
        return Math.atan2(direction.x, direction.z);
      };

      const addCityWindowGrid = (group, width, height, depth, rows = 4, columns = 4) => {
        for (let row = 0; row < rows; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            if ((row + column) % 5 === 0) continue;
            const window = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.25, 0.14), raceCityMaterials.glass);
            window.position.set(
              -width * 0.34 + (width * 0.68 * column) / Math.max(1, columns - 1),
              5 + row * (height / (rows + 1)),
              depth / 2 + 0.1
            );
            group.add(window);
          }
        }
      };

      const addDistrictIcon = (group, district, y, z) => {
        const iconGroup = new THREE.Group();
        iconGroup.position.set(0, y, z);
        const iconMat = createBasicMaterial(district.roof, {
          emissive: district.accent,
          emissiveIntensity: 0.42,
        });
        const accentMat = createBasicMaterial(district.accent, {
          emissive: district.accent,
          emissiveIntensity: 0.7,
        });

        if (district.icon === 'dumbbell') {
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 8.6, 7), iconMat);
          bar.rotation.z = Math.PI / 2;
          iconGroup.add(bar);
          [-4.3, 4.3].forEach((x) => {
            [-0.52, 0.52].forEach((offset) => {
              const plate = new THREE.Mesh(new THREE.BoxGeometry(0.82, 2.7, 1), accentMat);
              plate.position.x = x + offset;
              iconGroup.add(plate);
            });
          });
        } else if (district.icon === 'utensils') {
          [-1.6, 1.6].forEach((x, index) => {
            const handle = new THREE.Mesh(new THREE.BoxGeometry(0.48, 7.4, 0.7), iconMat);
            handle.position.x = x;
            handle.rotation.z = index === 0 ? 0.08 : -0.18;
            iconGroup.add(handle);
          });
          [-2.25, -1.6, -0.95].forEach((x) => {
            const tine = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.4, 0.64), accentMat);
            tine.position.set(x, 4, 0);
            iconGroup.add(tine);
          });
          const blade = new THREE.Mesh(new THREE.ConeGeometry(0.95, 3.4, 4), accentMat);
          blade.position.set(1.95, 3.7, 0);
          blade.rotation.z = -0.76;
          iconGroup.add(blade);
        } else if (district.icon === 'flask') {
          const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 4.2, 8), iconMat);
          neck.position.y = 2.7;
          const bulb = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 1.15, 4.6, 8), accentMat);
          bulb.position.y = -1.1;
          const liquid = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.1, 0.9), raceCityMaterials.cyan);
          liquid.position.y = -2.1;
          iconGroup.add(neck, bulb, liquid);
        } else if (district.icon === 'cross') {
          iconGroup.add(new THREE.Mesh(new THREE.BoxGeometry(2.1, 8.4, 0.9), iconMat));
          iconGroup.add(new THREE.Mesh(new THREE.BoxGeometry(7.6, 2.1, 0.95), iconMat));
        } else if (district.icon === 'wrench') {
          const handle = new THREE.Mesh(new THREE.BoxGeometry(1.1, 8.6, 0.8), iconMat);
          handle.rotation.z = -0.65;
          const head = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.35, 6, 16, Math.PI * 1.35), accentMat);
          head.position.set(2.65, 2.85, 0);
          head.rotation.z = 0.92;
          iconGroup.add(handle, head);
        }

        group.add(iconGroup);
        return iconGroup;
      };

      const addDistrictProps = (group, district, width, depth) => {
        const accentMat = createBasicMaterial(district.accent, {
          emissive: district.accent,
          emissiveIntensity: 0.42,
        });
        const baseMat = createBasicMaterial(district.base);
        const darkMat = raceCityMaterials.dark;

        if (district.icon === 'dumbbell') {
          [-0.34, 0.34].forEach((xSide) => {
            const rack = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.2, 1.2), darkMat);
            rack.position.set(xSide * width, 1.2, depth / 2 + 7);
            group.add(rack);
            for (let plate = 0; plate < 3; plate += 1) {
              const weight = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.45, 8), accentMat);
              weight.position.set(xSide * width + plate * 1.1 - 1.1, 2.2, depth / 2 + 7);
              weight.rotation.x = Math.PI / 2;
              group.add(weight);
            }
          });
        } else if (district.icon === 'utensils') {
          [-0.35, 0.35].forEach((xSide) => {
            const stall = new THREE.Mesh(new THREE.BoxGeometry(7.8, 4.6, 5.2), baseMat);
            stall.position.set(xSide * width, 2.3, depth / 2 + 7.2);
            group.add(stall);
            const awning = new THREE.Mesh(new THREE.BoxGeometry(8.6, 1, 6), accentMat);
            awning.position.set(xSide * width, 5.1, depth / 2 + 7.2);
            group.add(awning);
          });
        } else if (district.icon === 'flask') {
          [-0.3, 0.3].forEach((xSide) => {
            const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 10, 10), raceCityMaterials.glass);
            tube.position.set(xSide * width, 6.2, depth * 0.08);
            group.add(tube);
            const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.8, 10), accentMat);
            cap.position.set(xSide * width, 11.5, depth * 0.08);
            group.add(cap);
          });
        } else if (district.icon === 'cross') {
          [-0.42, 0.42].forEach((xSide) => {
            const light = new THREE.Mesh(new THREE.BoxGeometry(3.6, 5.4, 0.5), accentMat);
            light.position.set(xSide * width, 6.5, depth / 2 + 0.55);
            group.add(light);
          });
        } else if (district.icon === 'wrench') {
          [-0.42, 0.42].forEach((xSide) => {
            for (let tire = 0; tire < 3; tire += 1) {
              const stack = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.45, 6, 12), darkMat);
              stack.position.set(xSide * width, 1.4 + tire * 1.25, depth / 2 + 6);
              stack.rotation.x = Math.PI / 2;
              group.add(stack);
            }
          });
        }
      };

      const addRaceDistrict = (district, index) => {
        const sample = compiled.pointAt(district.progress);
        const normal = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x).normalize().multiplyScalar(district.side);
        const position = sample.point
          .clone()
          .addScaledVector(normal, compiled.roadWidth / 2 + (district.setback ?? 98) + (index % 2) * 8);
        const group = new THREE.Group();
        const width = district.label === 'FOOD COURT' ? 26 : district.label === 'GARAGE' ? 28 : 22;
        const depth = district.label === 'LAB' ? 21 : 18;
        const height = district.label === 'LAB' ? 34 : district.label === 'FOOD COURT' ? 22 : 26;
        const baseMat = createBasicMaterial(district.base, {
          emissive: district.base,
          emissiveIntensity: 0.06,
        });
        const darkMat = createBasicMaterial(district.dark);
        const roofMat = createBasicMaterial(district.roof);
        const accentMat = createBasicMaterial(district.accent, {
          emissive: district.accent,
          emissiveIntensity: 0.58,
        });

        group.position.copy(position);
        group.rotation.y = faceRoadYaw(position, sample.point);

        const plaza = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.82, width * 0.94, 0.38, 8), darkMat);
        plaza.position.set(0, 0.18, depth / 2 + 2.5);
        plaza.scale.z = 0.56;
        plaza.receiveShadow = true;
        group.add(plaza);

        const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), baseMat);
        body.position.y = height / 2 + 0.6;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        const upper = new THREE.Mesh(new THREE.BoxGeometry(width * 0.74, height * 0.42, depth * 0.76), darkMat);
        upper.position.set(0, height + height * 0.2 + 0.6, -depth * 0.03);
        upper.castShadow = true;
        group.add(upper);

        const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 2.2, 2.2, depth + 2.2), roofMat);
        roof.position.set(0, height + 1.7, 0);
        roof.castShadow = true;
        group.add(roof);

        [-1, 1].forEach((side) => {
          const tower = new THREE.Mesh(new THREE.BoxGeometry(4.2, height * 0.74, depth * 0.52), darkMat);
          tower.position.set(side * (width * 0.44), height * 0.37 + 0.6, depth * 0.02);
          tower.castShadow = true;
          group.add(tower);
          const trim = new THREE.Mesh(new THREE.BoxGeometry(1.15, height * 0.64, depth * 0.58), accentMat);
          trim.position.set(side * (width * 0.44), height * 0.4 + 0.8, depth * 0.09);
          group.add(trim);
        });

        addCityWindowGrid(group, width, height, depth, district.label === 'LAB' ? 5 : 3, 4);

        const portalY = Math.min(10, height * 0.44);
        const portal = new THREE.Mesh(
          new THREE.CircleGeometry(5.3, 28),
          new THREE.MeshBasicMaterial({
            color: district.accent,
            depthWrite: false,
            opacity: 0.28,
            side: THREE.DoubleSide,
            transparent: true,
          })
        );
        portal.position.set(0, portalY, depth / 2 + 0.8);
        group.add(portal);

        const portalRing = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.5, 8, 32), accentMat);
        portalRing.position.copy(portal.position);
        group.add(portalRing);

        const innerRing = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.18, 5, 22), raceCityMaterials.light);
        innerRing.position.set(0, portalY, depth / 2 + 1.08);
        group.add(innerRing);

        const sign = createBillboardText(district.label, district.accent);
        sign.position.set(0, height + 8.6, depth / 2 + 1.2);
        sign.scale.set(district.label === 'FOOD COURT' ? 20 : 14.8, 4.2, 1);
        group.add(sign);

        addDistrictIcon(group, district, height + 4.2, depth / 2 + 1.6);
        addDistrictProps(group, district, width, depth);

        const portalLight = new THREE.PointLight(district.accent, 1.45, 70, 2);
        portalLight.position.copy(portal.position);
        group.add(portalLight);

        group.userData.portalRing = portalRing;
        group.userData.innerRing = innerRing;
        group.userData.portal = portal;
        group.userData.portalLight = portalLight;
        group.userData.phase = index * 0.75;
        collisionCircles.push({
          position: position.clone(),
          radius: Math.max(width, depth) * 0.74,
        });
        animatedCityDistricts.push(group);
        world.add(group);
        registerCameraCollider(group);
      };

      const animatedCityDistricts = [];
      const raceCityDistricts = compiled.districtAnchors || RACE_CITY_DISTRICTS;
      raceCityDistricts.forEach(addRaceDistrict);

      const addRoadDistrictSign = (district, index) => {
        const signProgress = clamp(district.progress - 0.035, 0.02, 0.98);
        const sample = compiled.pointAt(signProgress);
        const normal = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x).normalize().multiplyScalar(district.side);
        const position = sample.point.clone().addScaledVector(normal, compiled.roadWidth / 2 + 18 + (index % 2) * 3);
        const group = new THREE.Group();
        const darkMat = createBasicMaterial('#0b1b2d', {
          emissive: '#0b1b2d',
          emissiveIntensity: 0.12,
        });
        const accentMat = createBasicMaterial(district.accent, {
          emissive: district.accent,
          emissiveIntensity: 0.62,
        });
        const lightMat = createBasicMaterial('#f7fbff');
        group.position.copy(position);
        group.rotation.y = faceRoadYaw(position, sample.point);

        [-1, 1].forEach((side) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.58, 9.8, 0.58), darkMat);
          post.position.set(side * 6.9, 4.9, 0);
          post.castShadow = true;
          group.add(post);
        });

        const board = new THREE.Mesh(new THREE.BoxGeometry(16.4, 4.5, 0.8), darkMat);
        board.position.set(0, 9.2, 0);
        board.castShadow = true;
        group.add(board);

        const stripe = new THREE.Mesh(new THREE.BoxGeometry(15.4, 0.5, 1), accentMat);
        stripe.position.set(0, 11.2, 0.05);
        group.add(stripe);

        [-2.8, 0, 2.8].forEach((x) => {
          const arrow = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.32, 0.82), lightMat);
          arrow.position.set(x, 7.1, 0.46);
          arrow.rotation.z = district.side > 0 ? -0.66 : 0.66;
          group.add(arrow);
        });

        const text = createBillboardText(district.label, district.accent);
        text.position.set(0, 9.3, 0.62);
        text.scale.set(district.label === 'FOOD COURT' ? 11.8 : 9.8, 2.5, 1);
        group.add(text);

        world.add(group);
        registerCameraCollider(group);
      };
      raceCityDistricts.forEach(addRoadDistrictSign);

      const addBranchDecisionSign = (route, index) => {
        const signProgress = wrap01(route.decisionCueProgress ?? route.startProgress - 0.04);
        const sample = compiled.pointAt(signProgress);
        const side = route.entrySide || (index % 2 === 0 ? -1 : 1);
        const normal = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x).normalize().multiplyScalar(side);
        const position = sample.point.clone().addScaledVector(normal, compiled.roadWidth / 2 + 13.5);
        const group = new THREE.Group();
        const accent = route.accent || VISUAL_PALETTE.cyan;
        const darkMat = createBasicMaterial('#07182a', {
          emissive: '#07182a',
          emissiveIntensity: 0.16,
        });
        const accentMat = createBasicMaterial(accent, {
          emissive: accent,
          emissiveIntensity: 0.75,
        });
        const lightMat = createBasicMaterial('#f7fbff');
        group.position.copy(position);
        group.rotation.y = faceRoadYaw(position, sample.point);

        [-1, 1].forEach((postSide) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.54, 8.8, 0.54), darkMat);
          post.position.set(postSide * 7.8, 4.4, 0);
          post.castShadow = true;
          group.add(post);
        });

        const board = new THREE.Mesh(new THREE.BoxGeometry(18.4, 5.2, 0.85), darkMat);
        board.position.set(0, 8.8, 0);
        board.castShadow = true;
        group.add(board);

        const label = createBillboardText(route.label || route.name || 'BRANCH', accent);
        label.position.set(0, 9.05, 0.62);
        label.scale.set(11.4, 2.7, 1);
        group.add(label);

        [-4.4, -1.4, 1.6, 4.6].forEach((x) => {
          const arrow = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.34, 0.82), lightMat);
          arrow.position.set(x, 6.35, 0.52);
          arrow.rotation.z = side > 0 ? -0.62 : 0.62;
          group.add(arrow);
        });

        const stripe = new THREE.Mesh(new THREE.BoxGeometry(17.2, 0.5, 1), accentMat);
        stripe.position.set(0, 11.35, 0.05);
        group.add(stripe);

        group.userData.branchKey = route.key;
        world.add(group);
        registerCameraCollider(group);
      };
      if (cleanCityCourse) (compiled.branchRoutes || []).forEach(addBranchDecisionSign);

      const addRaceObjectiveMarker = () => {
        const markerSample = compiled.pointAt(0.872);
        const markerGroup = new THREE.Group();
        markerGroup.position.copy(markerSample.point);
        markerGroup.position.y = 0.5;

        const pad = new THREE.Mesh(
          new THREE.CylinderGeometry(9.5, 11.5, 0.35, 32),
          new THREE.MeshBasicMaterial({
            color: VISUAL_PALETTE.cyan,
            opacity: 0.24,
            transparent: true,
          })
        );
        pad.position.y = 0.2;
        markerGroup.add(pad);

        const padRing = new THREE.Mesh(new THREE.TorusGeometry(10, 0.32, 6, 32), raceCityMaterials.cyan);
        padRing.rotation.x = Math.PI / 2;
        padRing.position.y = 0.45;
        markerGroup.add(padRing);

        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(1.1, 3.4, 86, 10, 1, true),
          new THREE.MeshBasicMaterial({
            color: VISUAL_PALETTE.cyan,
            depthWrite: false,
            opacity: 0.24,
            transparent: true,
          })
        );
        beam.position.y = 43;
        markerGroup.add(beam);

        const badge = new THREE.Mesh(
          new THREE.DodecahedronGeometry(5.3, 0),
          createBasicMaterial('#1f8bff', {
            emissive: VISUAL_PALETTE.cyan,
            emissiveIntensity: 1.05,
          })
        );
        badge.position.y = 26;
        badge.scale.z = 0.36;
        markerGroup.add(badge);

        const flag = new THREE.Mesh(new THREE.BoxGeometry(1.1, 6.4, 0.5), raceCityMaterials.light);
        flag.position.set(-1.3, 26.4, 0.3);
        const flagCloth = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 0.45), raceCityMaterials.cyan);
        flagCloth.position.set(1.7, 28.2, 0.4);
        markerGroup.add(flag, flagCloth);

        markerGroup.userData.beam = beam;
        markerGroup.userData.badge = badge;
        markerGroup.userData.padRing = padRing;
        world.add(markerGroup);
        animatedCityDistricts.push(markerGroup);
      };
      addRaceObjectiveMarker();

      const addCitySkyline = () => {
        const base = cityPoint(305, 0, 0);
        const skylineMats = [
          createBasicMaterial('#2d76b7'),
          createBasicMaterial('#5a91b2'),
          createBasicMaterial('#315b8d'),
          createBasicMaterial('#e28d47'),
          createBasicMaterial('#8a53df'),
          createBasicMaterial('#f3ece0'),
        ];
        for (let i = 0; i < 34; i += 1) {
          const lateral = -178 + i * 10.8;
          const depthOffset = (i % 5) * 7 - 12;
          const p = base
            .clone()
            .addScaledVector(corridorRight, lateral)
            .addScaledVector(corridorForward, depthOffset);
          const h = 20 + (i % 8) * 6.4 + (i % 5 === 0 ? 14 : 0);
          const w = 6.8 + (i % 3) * 2.4;
          const d = 8.5 + (i % 4) * 2.2;
          const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), skylineMats[i % skylineMats.length]);
          block.position.set(p.x, h / 2, p.z);
          block.rotation.y = faceRoadYaw(block.position, corridorOrigin) + (i % 3 - 1) * 0.035;
          block.castShadow = true;
          world.add(block);
          registerCameraCollider(block);
          collisionCircles.push({ position: new THREE.Vector3(p.x, 0, p.z), radius: Math.max(w, d) * 0.72 });
          if (i % 4 === 0) {
            const spire = new THREE.Mesh(
              new THREE.ConeGeometry(w * 0.36, 9 + (i % 3) * 4, 5),
              i % 2 ? raceCityMaterials.cyan : raceCityMaterials.light
            );
            spire.position.set(p.x, h + 4.2, p.z);
            spire.castShadow = true;
            world.add(spire);
          }
        }

        const wheelGroup = new THREE.Group();
        const wheelCenter = base.clone().addScaledVector(corridorRight, -118).addScaledVector(corridorForward, -6);
        wheelGroup.position.set(wheelCenter.x, 28, wheelCenter.z);
        wheelGroup.rotation.y = faceRoadYaw(wheelCenter, corridorOrigin);
        const wheelMat = createBasicMaterial('#f3ece0', {
          emissive: '#ffd34f',
          emissiveIntensity: 0.16,
        });
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(17, 0.38, 6, 36), wheelMat);
        wheelGroup.add(wheel);
        for (let i = 0; i < 10; i += 1) {
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.34, 17, 0.34), wheelMat);
          spoke.rotation.z = (Math.PI * i) / 10;
          wheelGroup.add(spoke);
        }
        const legA = new THREE.Mesh(new THREE.BoxGeometry(0.7, 34, 0.7), wheelMat);
        legA.position.set(-6.2, -17, 0);
        legA.rotation.z = -0.26;
        const legB = legA.clone();
        legB.position.x = 6.2;
        legB.rotation.z = 0.26;
        wheelGroup.add(legA, legB);
        world.add(wheelGroup);
        registerCameraCollider(wheelGroup);
      };
      addCitySkyline();

      const addPerimeterSkyline = () => {
        const skylineMats = [
          createBasicMaterial('#2d76b7'),
          createBasicMaterial('#5a91b2'),
          createBasicMaterial('#315b8d'),
          createBasicMaterial('#55b957'),
          createBasicMaterial('#f28b2e'),
          createBasicMaterial('#8a53df'),
          createBasicMaterial('#e64b4b'),
        ];
        const windowMat = createBasicMaterial('#dff8ff', {
          emissive: '#74f1ff',
          emissiveIntensity: 0.22,
          opacity: 0.74,
          transparent: true,
        });
        const placeBlock = (x, z, index, yaw = 0) => {
          const h = 18 + (index % 7) * 5.5 + (index % 6 === 0 ? 12 : 0);
          const w = 7 + (index % 3) * 2.2;
          const d = 8 + (index % 4) * 2.4;
          const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), skylineMats[index % skylineMats.length]);
          block.position.set(x, h / 2 - 0.6, z);
          block.rotation.y = yaw + (index % 3 - 1) * 0.035;
          block.castShadow = true;
          block.receiveShadow = true;
          world.add(block);
          registerCameraCollider(block);
          collisionCircles.push({ position: new THREE.Vector3(x, 0, z), radius: Math.max(w, d) * 0.72 });

          const roof = new THREE.Mesh(
            new THREE.BoxGeometry(w + 1.1, 1.4, d + 1.1),
            index % 2 ? raceCityMaterials.light : raceCityMaterials.dark
          );
          roof.position.set(x, h + 0.1, z);
          roof.rotation.y = block.rotation.y;
          roof.castShadow = true;
          world.add(roof);

          for (let row = 0; row < Math.min(5, Math.floor(h / 6)); row += 1) {
            [-0.28, 0.28].forEach((side) => {
              const window = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.12), windowMat);
              window.position.set(x + side * w, 4.8 + row * 4.8, z - d / 2 - 0.08);
              window.rotation.y = block.rotation.y;
              world.add(window);
            });
          }
        };

        const xStart = bounds.minX - 56;
        const xEnd = bounds.maxX + 56;
        const zStart = bounds.minZ - 48;
        const zEnd = bounds.maxZ + 56;
        for (let i = 0; i < 26; i += 1) {
          const t = i / 25;
          const x = xStart + (xEnd - xStart) * t;
          placeBlock(x, bounds.maxZ + 112 + (i % 5) * 7, i, Math.PI);
          placeBlock(x, bounds.minZ - 112 - (i % 4) * 7, i + 31, 0);
        }
        for (let i = 0; i < 17; i += 1) {
          const t = i / 16;
          const z = zStart + (zEnd - zStart) * t;
          placeBlock(bounds.minX - 122 - (i % 4) * 8, z, i + 63, Math.PI / 2);
          placeBlock(bounds.maxX + 122 + (i % 5) * 7, z, i + 91, -Math.PI / 2);
        }
      };
      addPerimeterSkyline();

      const addMountainsAndClouds = () => {
        [-128, -82, -38, 62, 116, 160].forEach((lateral, index) => {
          const p = cityPoint(382 + (index % 2) * 18, lateral, 0);
          const mountain = new THREE.Mesh(
            new THREE.ConeGeometry(28 + (index % 3) * 7, 52 + (index % 2) * 18, 4),
            createBasicMaterial(index % 2 ? '#9bc2d3' : '#8eb3c8')
          );
          mountain.position.set(p.x, 20, p.z);
          mountain.rotation.y = Math.PI / 4;
          world.add(mountain);

          const snow = new THREE.Mesh(
            new THREE.ConeGeometry(10 + (index % 3) * 2, 16, 4),
            raceCityMaterials.light
          );
          snow.position.set(p.x, 52 + (index % 2) * 8, p.z);
          snow.rotation.y = Math.PI / 4;
          world.add(snow);
        });

        const cloudMat = new THREE.MeshBasicMaterial({ color: '#f7fbff', opacity: 0.82, transparent: true });
        const puffGeometry = new THREE.DodecahedronGeometry(1, 0);
        [
          { d: 118, l: -92, y: 84, s: 6.3 },
          { d: 156, l: -12, y: 104, s: 5.1 },
          { d: 140, l: 86, y: 90, s: 6.8 },
          { d: 214, l: 32, y: 118, s: 4.9 },
        ].forEach((cloud, cloudIndex) => {
          const p = cityPoint(cloud.d, cloud.l, cloud.y);
          const group = new THREE.Group();
          group.position.copy(p);
          [-1.7, -0.5, 0.8, 1.9].forEach((offset, puffIndex) => {
            const puff = new THREE.Mesh(puffGeometry, cloudMat);
            puff.position.set(offset * cloud.s, Math.sin(puffIndex) * cloud.s * 0.2, 0);
            puff.scale.set(cloud.s * (0.86 + puffIndex * 0.08), cloud.s * 0.44, cloud.s * 0.34);
            group.add(puff);
          });
          group.userData.cloudSpeed = 0.012 + cloudIndex * 0.003;
          world.add(group);
        });
      };
      addMountainsAndClouds();

      const addWaterAndBridge = () => {
        const waterCenter = cityPoint(58, 76, 0);
        const water = new THREE.Mesh(
          new THREE.PlaneGeometry(150, 92, 8, 8),
          new THREE.MeshBasicMaterial({
            color: '#0ea5c8',
            opacity: 0.64,
            side: THREE.DoubleSide,
            transparent: true,
          })
        );
        water.position.set(waterCenter.x, 0.03, waterCenter.z);
        water.rotation.x = -Math.PI / 2;
        water.rotation.z = Math.atan2(corridorForward.z, corridorForward.x);
        world.add(water);

        for (let i = 0; i < 9; i += 1) {
          const ripple = new THREE.Mesh(new THREE.BoxGeometry(16 + (i % 3) * 6, 0.05, 0.32), raceCityMaterials.cyan);
          const p = waterCenter
            .clone()
            .addScaledVector(corridorForward, -36 + i * 9)
            .addScaledVector(corridorRight, -26 + (i % 4) * 13);
          ripple.position.set(p.x, 0.11, p.z);
          ripple.rotation.y = -Math.atan2(corridorForward.z, corridorForward.x);
          world.add(ripple);
        }

        const bridgeCenter = cityPoint(70, 45, 0);
        const bridgeYaw = -Math.atan2(corridorForward.z, corridorForward.x);
        const deck = new THREE.Mesh(new THREE.BoxGeometry(70, 1.1, 13.5), createBasicMaterial('#65717f'));
        deck.position.set(bridgeCenter.x, 2.3, bridgeCenter.z);
        deck.rotation.y = bridgeYaw;
        deck.castShadow = true;
        world.add(deck);
        registerCameraCollider(deck);
        [-1, 1].forEach((side) => {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(70, 0.5, 0.45), raceCityMaterials.light);
          rail.position.copy(deck.position);
          rail.position.y += 1.25;
          rail.rotation.y = bridgeYaw;
          rail.translateZ(side * 6.5);
          world.add(rail);
        });
      };
      addWaterAndBridge();

      const plazaLampCount = cleanCityCourse ? 6 : 18;
      for (let i = 0; i < plazaLampCount; i += 1) {
        const sample = compiled.pointAt(0.81 + i * (cleanCityCourse ? 0.018 : 0.008));
        const normal = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x).normalize();
        [-1, 1].forEach((side) => {
          const p = sample.point.clone().addScaledVector(normal, side * (compiled.roadWidth / 2 + 7.6));
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 7.6, 6), railPostMat);
          pole.position.set(p.x, 3.8, p.z);
          const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.72, 12, 10),
            side > 0 ? raceCityMaterials.cyan : raceCityMaterials.yellow
          );
          bulb.position.set(p.x, 7.85, p.z);
          world.add(pole, bulb);
        });
      }

      animatedCityDistricts.forEach((group) => {
        group.userData.animate = (time, dt) => {
          if (group.userData.portalRing) {
            group.userData.portalRing.rotation.z += dt * 0.9;
            group.userData.innerRing.rotation.z -= dt * 1.35;
            group.userData.portal.material.opacity = 0.2 + Math.sin(time / 190 + group.userData.phase) * 0.07;
            group.userData.portalLight.intensity = 1.1 + Math.sin(time / 180 + group.userData.phase) * 0.32;
          }
          if (group.userData.beam) {
            group.userData.beam.rotation.y += dt * 0.14;
            group.userData.beam.material.opacity = 0.2 + Math.sin(time / 260) * 0.05;
            group.userData.badge.rotation.y += dt * 1.1;
            group.userData.badge.position.y = 26 + Math.sin(time / 240) * 0.5;
            group.userData.padRing.rotation.z += dt * 0.8;
          }
        };
      });

      world.userData.cityAnimationHooks = animatedCityDistricts;
    };
    createScenery();

    const playerVehicle = createVehicleModel({
      accent: '#46d9ef',
      color: '#ef4334',
      scale: 0.8,
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
        scale: 0.48,
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
    const raceViewport = { height: 1, mobile: false, width: 1 };
    const cameraRaycaster = new THREE.Raycaster();
    cameraRaycaster.camera = camera;
    const visualStats = {
      cameraClipCount: 0,
      cameraAvoidanceCount: 0,
      fps: 60,
      branchVisibleSeen: false,
      boostSeen: false,
      driftTierSeen: 0,
      offroadSlowdownSeen: false,
    };

    if (playtest.enabled) {
      window.__racePlaytestEvents = [];
      window.__racePlaytestResult = null;
    }
    window.__raceVisualTelemetry = null;

    const recordPlaytest = (type, detail = {}) => {
      if (!playtest.enabled) return;
      window.__racePlaytestEvents.push({
        mode: playtest.mode,
        raceIndex: playtest.raceIndex,
        time: race.time,
        trackKey: compiled.key,
        type,
        ...detail,
      });
    };

    const fitRenderer = () => {
      const rect = canvas.getBoundingClientRect();
      raceViewport.width = Math.max(1, rect.width || 1);
      raceViewport.height = Math.max(1, rect.height || 1);
      raceViewport.mobile = raceViewport.width / raceViewport.height < 0.74;
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
    let ambientNodes = [];
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
      const voices =
        compiled.key === 'static-storm-plateau'
          ? [
              { frequency: 54, gain: 0.008, type: 'sawtooth' },
              { frequency: 122, gain: 0.004, type: 'square' },
              { frequency: 320, gain: 0.002, type: 'triangle' },
            ]
          : compiled.key === 'magnet-mine-descent'
          ? [
              { frequency: 42, gain: 0.01, type: 'square' },
              { frequency: 96, gain: 0.004, type: 'sawtooth' },
              { frequency: 186, gain: 0.002, type: 'triangle' },
            ]
          : [
              { frequency: 72, gain: 0.008, type: 'sine' },
              { frequency: 188, gain: 0.003, type: 'triangle' },
              { frequency: 420, gain: 0.0018, type: 'sine' },
            ];
      ambientNodes = voices.map((voice) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = voice.type;
        oscillator.frequency.value = voice.frequency;
        gain.gain.value = voice.gain;
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start();
        return { gain, oscillator };
      });
      ambientOscillator = ambientNodes[0]?.oscillator || null;
      ambientGain = ambientNodes[0]?.gain || null;
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
      if (racer.velocity) racer.velocity.addScaledVector(forward, impulse);
      else if (typeof racer.speed === 'number') racer.speed += impulse;
      const vehicle = VEHICLES[racer.vehicleMode || defaultVehicle] || VEHICLES.kart;
      const limit = vehicle.boostMax + (racer.bananas || 0) * 0.8;
      if (racer.velocity && racer.velocity.length() > limit) racer.velocity.setLength(limit);
      else if (typeof racer.speed === 'number') racer.speed = Math.min(racer.speed, limit);
    };

    const setVehicleMode = (racer, nextMode, { force = false } = {}) => {
      if (!VEHICLES[nextMode]) return false;
      if (kartOnly && nextMode !== 'kart') return false;
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
      if (kartOnly) return false;
      setVehicleMode(race.player, nextVehicleMode(race.player.vehicleMode));
      return true;
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
      if (kartOnly) return;
      if (compiled.key === 'comeback-city' && !playtest.enabled) return;
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

    const updateAutoplayPlayer = (dt) => {
      const player = race.player;
      if (player.finished) return;

      if (!playtest.started) {
        playtest.started = true;
        player.bananas = 16;
        playtest.bananaMax = player.bananas;
        player.heldItem = makeHeldItem(compiled.signatureItem?.key || 'boost', 1);
        player.heldBalloon = player.heldItem;
        recordPlaytest('start', { signatureItem: player.heldItem.itemKey });
        upgradeHeldItem();
        buyRareNextPickup();
        buyDoubleSlot();
        playtest.upgrades += 3;
        recordPlaytest('banana-upgrades', {
          bananas: player.bananas,
          doubleSlotUses: player.doubleSlotUses,
          heldLevel: player.heldItem?.level || 0,
          rareNextPickup: player.rareNextPickup,
        });
      }

      const previousProgress = player.progress;
      const layerKeys = ['ground', 'air', 'hybrid'].filter((key) => compiled.routeLayers?.[key]);
      const layerKey = layerKeys[Math.floor(race.time / 0.65) % Math.max(1, layerKeys.length)] || 'ground';
      const layer = compiled.routeLayers?.[layerKey] || compiled.routeLayers?.ground || {};
      const requiredVehicle = playtest.mode === 'vehicle-restricted' ? layer.vehiclePreference || 'kart' : layerKey === 'air' ? 'plane' : layerKey === 'hybrid' ? 'hover' : 'kart';
      if (player.vehicleMode !== requiredVehicle) setVehicleMode(player, requiredVehicle, { force: true });
      player.layer = layerKey;
      playtest.layers.add(layerKey);
      playtest.vehicles.add(player.vehicleMode);

      const progressRate = playtest.mode === 'vehicle-restricted' ? 0.86 : 0.94;
      player.progress = wrap01(player.progress + dt * progressRate);
      const sample = compiled.pointAt(player.progress);
      const normalAtPoint = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x);
      player.position.copy(sample.point).addScaledVector(normalAtPoint, layerOffset(layerKey, compiled.roadWidth));
      player.heading = Math.atan2(sample.tangent.x, sample.tangent.z);
      player.velocity.copy(sample.tangent).multiplyScalar(player.vehicleMode === 'plane' ? 56 : 48);
      player.flightAltitude = player.vehicleMode === 'plane' ? FLIGHT_CRUISE_ALTITUDE : 0;
      player.flightPitch = player.vehicleMode === 'plane' ? -0.04 : 0;
      player.flightRoll = player.vehicleMode === 'plane' ? Math.sin(race.time * 2.2) * 0.16 : 0;
      player.jumpHeight = player.vehicleMode === 'plane' ? 0 : Math.max(0, Math.sin(race.time * 4) * 0.2);
      player.steerInput = Math.sin(race.time * 1.8) * 0.22;
      player.planeBob += dt * 4;

      if (previousProgress > 0.82 && player.progress < 0.18) {
        const lapTime = race.time - (player.lapStartTime || 0);
        player.bestLap = player.bestLap ? Math.min(player.bestLap, lapTime) : lapTime;
        player.lapSplits.push(lapTime);
        player.lap += 1;
        player.lapStartTime = race.time;
        recordPlaytest('lap', { lap: player.lap - 1, lapTime });
        if (player.lap > compiled.laps) {
          player.finished = true;
          player.finishTime = race.time;
          race.finished = true;
          return;
        }
      }

      if (!playtest.signatureUsed && race.time > 0.2) {
        playtest.signatureUsed = applyRaceItem(player, player.heldItem, player.heldItem?.level || 1);
        if (playtest.signatureUsed) {
          playtest.itemUses += 1;
          recordPlaytest('signature-item', { itemKey: compiled.signatureItem?.key });
          player.heldItem = null;
          player.heldBalloon = null;
        }
      }

      if (Math.floor(race.time * 2) % 4 === 0) {
        const balloon = race.balloons.find((entry) => entry.cooldown <= 0);
        if (balloon) {
          collectBalloon(balloon);
          playtest.itemBoxesCollected += 1;
          recordPlaytest('item-box', { itemKey: player.heldItem?.itemKey || player.secondaryHeldItem?.itemKey });
        }
      }

      if (player.heldItem && race.time > 1.2 && playtest.itemUses < 3) {
        const used = applyRaceItem(player, player.heldItem, player.heldItem.level || 1);
        if (used) {
          playtest.itemUses += 1;
          recordPlaytest('item-use', { itemKey: player.heldItem.itemKey });
          player.heldItem = player.secondaryHeldItem || null;
          player.secondaryHeldItem = null;
          player.heldBalloon = player.heldItem;
        }
      }

      race.bananas.forEach((banana) => {
        banana.cooldown = Math.max(0, banana.cooldown - dt);
        if (banana.cooldown <= 0 && progressDistance(banana.progress, player.progress) < 0.02) {
          player.bananas = clamp(player.bananas + 1, 0, 99);
          banana.cooldown = 3;
        }
      });
      playtest.bananaMax = Math.max(playtest.bananaMax, player.bananas);

      const playtestProgressWindow = Math.max(0.018, dt * progressRate * 1.35);
      const crossedProgress = (target) =>
        previousProgress <= player.progress
          ? target >= previousProgress && target <= player.progress
          : target >= previousProgress || target <= player.progress;
      const nearHazard = race.trackHazards.find(
        (hazard) => hazard.active !== false && progressDistance(hazard.progress, player.progress) < playtestProgressWindow
      );
      if (nearHazard) playtest.hazardsEncountered += dt;
      if (compiled.vehicleZones.some((zone) => progressDistance(zone.progress, player.progress) < playtestProgressWindow)) playtest.zones += 1;
      if (
        compiled.vehicleLocks.some(
          (lock) =>
            progressInRange(player.progress, lock.start, lock.end) ||
            crossedProgress(lock.start) ||
            crossedProgress(lock.end)
        )
      ) {
        playtest.locks += 1;
      }
      if (race.switchPads.some((pad) => progressDistance(pad.progress, player.progress) < playtestProgressWindow)) playtest.switchPads += 1;

      player.boostTimer = Math.max(0, player.boostTimer - dt);
      player.blindTimer = Math.max(0, player.blindTimer - dt);
      player.controlFlipTimer = Math.max(0, player.controlFlipTimer - dt);
      player.ghostTimer = Math.max(0, (player.ghostTimer || 0) - dt);
      player.invincibleTimer = Math.max(0, player.invincibleTimer - dt);
      player.liftDisabledTimer = Math.max(0, player.liftDisabledTimer - dt);
      player.lightningRodTimer = Math.max(0, player.lightningRodTimer - dt);
      player.magnetTimer = Math.max(0, player.magnetTimer - dt);
      player.polaritySwapTimer = Math.max(0, player.polaritySwapTimer - dt);
      player.shieldTimer = Math.max(0, player.shieldTimer - dt);
      player.transformTimer = Math.max(0, player.transformTimer - dt);
      player.speed = player.velocity.length();
      applyVehicleIntegration(dt);
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

    const resolveWorldCollisions = (racer) => {
      if (racer.vehicleMode === 'plane' || racer.ghostTimer > 0 || racer.invincibleTimer > 0) return false;
      let collided = false;
      collisionCircles.forEach((circle) => {
        const offset = racer.position.clone().sub(circle.position).setY(0);
        const distance = offset.length();
        const radius = circle.radius + 3.2;
        if (distance <= 0.001 || distance >= radius) return;
        const normal = offset.multiplyScalar(1 / distance);
        racer.position.copy(circle.position).addScaledVector(normal, radius);
        const inwardSpeed = racer.velocity.dot(normal);
        if (inwardSpeed < 0) racer.velocity.addScaledVector(normal, -inwardSpeed * 1.18);
        racer.velocity.multiplyScalar(0.54);
        collided = true;
      });
      return collided;
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
      const activeRoadWidth = nearest.roadWidth || compiled.roadWidth;
      const offroad =
        nearest.distance > activeRoadWidth * 0.52 && !isPlane && player.jumpHeight <= 0.05;
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
        const driftTune = DRIFT_TUNING[player.vehicleMode] || DRIFT_TUNING.kart;
        const tier = driftTune.sparkChargeTime.reduce(
          (bestTier, chargeTime, index) => (player.driftCharge >= chargeTime ? index + 1 : bestTier),
          0
        );
        if (tier > 0) {
          addBoost(
            player,
            driftTune.boostDuration[tier - 1],
            driftTune.boostStrength[tier - 1],
            tier
          );
        }
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

      if (!isPlane && speed > 1.2) {
        const trackHeading = Math.atan2(nearest.tangent.x, nearest.tangent.z);
        const edgeAssist = clamp(
          (nearest.distance - activeRoadWidth * 0.2) / Math.max(1, activeRoadWidth * 0.32),
          0,
          1
        );
        const cruiseAssist =
          !player.driftActive && controls.throttle > 0.08 && Math.abs(player.steerInput) < 0.14 ? 1.45 : 0.06;
        const assistStrength = edgeAssist * (player.driftActive ? 1.05 : 2.25) + cruiseAssist;
        player.heading += signedAngleDelta(trackHeading, player.heading) * clamp(dt * assistStrength, 0, 0.16);
        if (edgeAssist > 0.05 && player.jumpHeight <= 0.05) {
          const guidedVelocity = nearest.tangent.clone().multiplyScalar(Math.max(0, player.velocity.dot(nearest.tangent)));
          player.velocity.lerp(guidedVelocity, clamp(dt * edgeAssist * (player.driftActive ? 1.35 : 2.65), 0, 0.28));
        }
        if (
          !player.driftActive &&
          controls.throttle > 0.08 &&
          Math.abs(player.steerInput) < 0.14 &&
          nearest.distance > activeRoadWidth * 0.18
        ) {
          const recenter = clamp((nearest.distance - activeRoadWidth * 0.18) / Math.max(1, activeRoadWidth * 0.46), 0, 1);
          player.velocity.addScaledVector(nearest.normal, -recenter * 34 * dt);
        }
      }

      if (!isPlane) {
        const activeRoadWidth = nearest.roadWidth || compiled.roadWidth;
        const softLimit = activeRoadWidth * 0.5;
        const guideLimit = activeRoadWidth * (player.vehicleMode === 'hover' ? 1.18 : 1.05);
        const edge = clamp((nearest.distance - softLimit) / Math.max(1, guideLimit - softLimit), 0, 1);
        if (edge > 0 && player.shieldTimer <= 0 && player.jumpHeight <= 0.05) {
          player.velocity.addScaledVector(nearest.normal, -edge * 13 * dt);
          player.velocity.multiplyScalar(Math.max(0, 1 - (0.46 + edge * 1.35) * dt));
        }
        if (nearest.distance > guideLimit && player.jumpHeight <= 0.05) {
          const returnStrength = clamp((nearest.distance - guideLimit) / Math.max(1, activeRoadWidth * 0.72), 0, 1);
          const guidedVelocity = nearest.tangent.clone().multiplyScalar(Math.max(0, player.velocity.dot(nearest.tangent)));
          const outwardSpeed = player.velocity.dot(nearest.normal);
          if (outwardSpeed > 0) player.velocity.addScaledVector(nearest.normal, -outwardSpeed * clamp(edge * 0.72, 0.1, 0.72));
          player.velocity.addScaledVector(nearest.normal, -returnStrength * 24 * dt);
          player.velocity.lerp(guidedVelocity, clamp(dt * (1.1 + returnStrength * 2.5), 0, 0.38));
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
      const mapMargin = isPlane ? Math.max(170, compiled.roadWidth * 5.5) : Math.max(120, compiled.roadWidth * 3.2);
      {
        const margin = mapMargin;
        const minX = bounds.minX - margin;
        const maxX = bounds.maxX + margin;
        const minZ = bounds.minZ - margin;
        const maxZ = bounds.maxZ + margin;
        const clampedX = clamp(player.position.x, minX, maxX);
        const clampedZ = clamp(player.position.z, minZ, maxZ);
        if (clampedX !== player.position.x) {
          player.position.x = clampedX;
          player.velocity.x *= isPlane ? -0.18 : -0.1;
        }
        if (clampedZ !== player.position.z) {
          player.position.z = clampedZ;
          player.velocity.z *= isPlane ? -0.18 : -0.1;
        }
      }
      if (resolveWorldCollisions(player)) {
        race.cameraShakeTimer = Math.max(race.cameraShakeTimer, 0.12);
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
      if (playerVehicle.driftSparkGroup) {
        const driftTune = DRIFT_TUNING[player.vehicleMode] || DRIFT_TUNING.kart;
        const sparkTier = driftTune.sparkChargeTime.reduce(
          (bestTier, chargeTime, index) => (player.driftCharge >= chargeTime ? index + 1 : bestTier),
          0
        );
        const sparkColor =
          sparkTier >= 3
            ? '#c879ff'
            : sparkTier === 2
            ? '#ffd34f'
            : sparkTier === 1
            ? '#46d9ef'
            : '#f7fbff';
        playerVehicle.driftSparkGroup.visible = player.driftActive;
        playerVehicle.driftSparkGroup.children.forEach((spark, sparkIndex) => {
          spark.material.color.set(sparkColor);
          spark.material.emissive.set(sparkColor);
          spark.material.emissiveIntensity = 0.72 + sparkTier * 0.18;
          spark.scale.setScalar(0.78 + sparkTier * 0.18 + Math.sin(now / 56 + spark.userData.phase) * 0.16);
          spark.position.y = 0.82 + (sparkIndex % 4) * 0.2 + Math.sin(now / 72 + sparkIndex) * 0.16;
          spark.position.x = spark.userData.side * (3.8 + (sparkIndex % 4) * 0.22 + Math.sin(now / 92 + sparkIndex) * 0.22);
        });
      }

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

      world.userData.cityAnimationHooks?.forEach((group) => {
        group.userData.animate?.(now, dt);
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
      const chaseDistance = isPlane
        ? vehicle.cameraDistance + speedRatio * 4.5
        : (raceViewport.mobile ? CAMERA_PRESETS.mobileChase.distance : vehicle.cameraDistance + 26) +
          speedRatio * (raceViewport.mobile ? 0.8 : 4.5);
      const chaseHeight =
        isPlane
          ? altitude + vehicle.cameraHeight + speedRatio * 1.5
          : (raceViewport.mobile ? CAMERA_PRESETS.mobileChase.height : vehicle.cameraHeight + 9.4) +
            speedRatio * 1.5 +
            altitude * 0.18;
      const lookAhead = isPlane
        ? 24 + speedRatio * 8
        : (raceViewport.mobile ? CAMERA_PRESETS.mobileChase.lookAhead + 4 : 52) + speedRatio * 8;
      const lookHeight = isPlane ? altitude + 1.2 : (raceViewport.mobile ? 5.8 : 8.6) + altitude * 0.12;
      const desired = player.position
        .clone()
        .addScaledVector(forward, -chaseDistance)
        .addScaledVector(right, -player.steerInput * speedRatio * (isPlane ? 3.6 : 1.8))
        .add(new THREE.Vector3(0, chaseHeight, 0));
      const lookAt = player.position
        .clone()
        .addScaledVector(forward, lookAhead)
        .add(new THREE.Vector3(0, lookHeight, 0));
      if (race.cameraShakeTimer > 0) {
        const shake = race.cameraShakeTimer / 0.2;
        desired.x += (Math.random() - 0.5) * 1.2 * shake;
        desired.y += (Math.random() - 0.5) * 0.7 * shake;
      }
      if (cameraCollisionObjects.length) {
        const rayStart = player.position.clone().add(new THREE.Vector3(0, altitude + 3.4, 0));
        const toCamera = desired.clone().sub(rayStart);
        const rawDistance = toCamera.length();
        if (rawDistance > 1) {
          const rayDirection = toCamera.clone().normalize();
          cameraRaycaster.set(rayStart, rayDirection);
          cameraRaycaster.far = rawDistance;
          const hit = cameraRaycaster
            .intersectObjects(cameraCollisionObjects, true)
            .find((entry) => entry.distance > 5.2);
          if (hit) {
            visualStats.cameraAvoidanceCount += 1;
            const safeDistance = Math.max(7.5, hit.distance - 2.6);
            desired.copy(rayStart).addScaledVector(rayDirection, safeDistance);
            desired.y = Math.max(desired.y + 2.2, rayStart.y + (raceViewport.mobile ? 6.6 : 8.4));

            cameraRaycaster.set(rayStart, desired.clone().sub(rayStart).normalize());
            cameraRaycaster.far = rayStart.distanceTo(desired);
            const residualHit = cameraRaycaster
              .intersectObjects(cameraCollisionObjects, true)
              .find((entry) => entry.distance > 5.2 && entry.distance < cameraRaycaster.far - 0.4);
            if (residualHit) visualStats.cameraClipCount += 1;
          }
        }
      }
      camera.position.lerp(desired, 1 - Math.exp(-9.4 * dt));
      camera.lookAt(lookAt);
      camera.rotation.z += -player.steerInput * speedRatio * 0.035;
      camera.fov = THREE.MathUtils.lerp(
        camera.fov,
        player.boostTimer > 0
          ? raceViewport.mobile
            ? 72
            : 74
          : raceViewport.mobile
          ? CAMERA_PRESETS.mobileChase.fov
          : 68,
        1 - Math.exp(-3.4 * dt)
      );
      camera.updateProjectionMatrix();
    };

    const measureKartScreenCoverage = () => {
      const box = new THREE.Box3().setFromObject(playerVehicle.group);
      if (box.isEmpty()) {
        return {
          bottomYRatio: 1,
          centerYRatio: 1,
          framingBandFromBottom: 0,
          heightRatio: 0,
        };
      }
      const corners = [
        new THREE.Vector3(box.min.x, box.min.y, box.min.z),
        new THREE.Vector3(box.min.x, box.min.y, box.max.z),
        new THREE.Vector3(box.min.x, box.max.y, box.min.z),
        new THREE.Vector3(box.min.x, box.max.y, box.max.z),
        new THREE.Vector3(box.max.x, box.min.y, box.min.z),
        new THREE.Vector3(box.max.x, box.min.y, box.max.z),
        new THREE.Vector3(box.max.x, box.max.y, box.min.z),
        new THREE.Vector3(box.max.x, box.max.y, box.max.z),
      ].map((corner) => {
        const projected = corner.project(camera);
        return {
          x: projected.x * 0.5 + 0.5,
          y: -projected.y * 0.5 + 0.5,
        };
      });
      const minY = Math.min(...corners.map((corner) => corner.y));
      const maxY = Math.max(...corners.map((corner) => corner.y));
      const centerYRatio = (minY + maxY) / 2;
      return {
        bottomYRatio: Number(maxY.toFixed(3)),
        centerYRatio: Number(centerYRatio.toFixed(3)),
        framingBandFromBottom: Number((1 - centerYRatio).toFixed(3)),
        heightRatio: Number(Math.max(0, maxY - minY).toFixed(3)),
      };
    };

    const projectedPointVisible = (point, y = 0.8) => {
      const projected = point.clone().setY(y).project(camera);
      const x = projected.x * 0.5 + 0.5;
      const screenY = -projected.y * 0.5 + 0.5;
      return {
        visible: projected.z > -1 && projected.z < 1 && x > 0.02 && x < 0.98 && screenY > 0.02 && screenY < 0.88,
        x,
        y: screenY,
      };
    };

    const estimateRoadAheadCoverage = () => {
      const samples = 18;
      const speed = race.player.velocity.length();
      const progressStep = Math.max(0.008, ((speed + 38) * 0.22) / compiled.totalLength);
      const forward = new THREE.Vector3(Math.sin(race.player.heading), 0, Math.cos(race.player.heading));
      let visible = 0;
      for (let index = 1; index <= samples; index += 1) {
        const sample = compiled.pointAt(race.player.progress + progressStep * index);
        const projected = projectedPointVisible(sample.point, 0.7);
        if (projected.visible && projected.y < 0.82) {
          visible += 1;
          continue;
        }
        const headingProbe = race.player.position.clone().addScaledVector(forward, 18 + index * 10);
        const nearest = compiled.nearest(headingProbe);
        const headingProjected = projectedPointVisible(nearest.point, 0.7);
        if (headingProjected.visible && headingProjected.y < 0.84 && nearest.distance < (nearest.roadWidth || compiled.roadWidth) * 0.7) {
          visible += 1;
        }
      }
      return {
        samples,
        value: Number((visible / samples).toFixed(3)),
      };
    };

    const countVisibleBranches = () => {
      const forward = new THREE.Vector3(Math.sin(race.player.heading), 0, Math.cos(race.player.heading));
      return (compiled.branchRoutes || []).reduce((count, route) => {
        const ahead = wrap01((route.decisionCueProgress ?? route.startProgress) - race.player.progress);
        if (ahead <= 0.004 || ahead > 0.3) return count;
        const sample = compiled.pointAt(route.decisionCueProgress ?? route.startProgress);
        const toBranch = sample.point.clone().sub(race.player.position).setY(0);
        if (toBranch.length() > 360 || toBranch.dot(forward) < -40) return count;
        const projected = projectedPointVisible(sample.point, 4.5);
        return count + (projected.visible || ahead < 0.22 ? 1 : 0);
      }, 0);
    };

    const nearestCollisionClearance = () => {
      if (!collisionCircles.length) return Infinity;
      const nearest = collisionCircles.reduce((best, circle) => {
        const clearance = distance2D(race.player.position, circle.position) - (circle.radius || 0);
        return Math.min(best, clearance);
      }, Infinity);
      return Number(nearest.toFixed(2));
    };

    const activeSurfaceFor = (nearest, offroad) => {
      if (offroad) return 'offroad';
      const zone = (compiled.surfaceZones || []).find((entry) => {
        if (!Number.isFinite(entry.progress)) return false;
        return progressDistance(entry.progress, race.player.progress) < 0.018;
      });
      if (zone?.type) return zone.type;
      if (nearest.branchKey) return `branch:${nearest.branchKey}`;
      return 'asphalt';
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
      const elapsed = (now - lastFrame) / 1000;
      const dt = playtest.enabled ? clamp(elapsed, 0, 0.16) : clamp(elapsed, 0, 0.033);
      lastFrame = now;
      visualStats.fps = THREE.MathUtils.lerp(visualStats.fps, 1 / Math.max(dt, 0.001), 0.08);
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

      if (playtest.enabled) updateAutoplayPlayer(dt);
      else updatePlayer(dt);
      updateRivals(dt);
      updateTrackEvents(dt);
      updateTrackHazards(dt);
      updateRankings();
      syncMeshes(dt, now);
      updateCamera(dt);
      renderer.render(scene, camera);

      if (now - lastTelemetry > 90) {
        lastTelemetry = now;
        const playerVehicleConfig = VEHICLES[race.player.vehicleMode] || VEHICLES.kart;
        const playerDriftTune = DRIFT_TUNING[race.player.vehicleMode] || DRIFT_TUNING.kart;
        const playerNearest = compiled.nearest(race.player.position);
        const playerRoadWidth = playerNearest.roadWidth || compiled.roadWidth;
        const driftTier = playerDriftTune.sparkChargeTime.reduce(
          (bestTier, chargeTime, index) => (race.player.driftCharge >= chargeTime ? index + 1 : bestTier),
          0
        );
        visualStats.driftTierSeen = Math.max(visualStats.driftTierSeen, driftTier);
        if (race.player.boostTimer > 0) visualStats.boostSeen = true;
        const offroad =
          race.player.vehicleMode !== 'plane' &&
          race.player.jumpHeight <= 0.05 &&
          playerNearest.distance > playerRoadWidth * 0.52;
        if (offroad) visualStats.offroadSlowdownSeen = true;
        const visibleBranchCount = countVisibleBranches();
        if (visibleBranchCount > 0) visualStats.branchVisibleSeen = true;
        const raceVisualTelemetry = {
          activeSurface: activeSurfaceFor(playerNearest, offroad),
          assetLoadState:
            compiled.courseV2?.assetLoadState || {
              externalAssets: 0,
              manifestPath: '/src/assets/game/asset-manifest.json',
              missing: [],
              state: 'procedural-ready',
            },
          boostTimer: Number(race.player.boostTimer.toFixed(3)),
          cameraAvoidanceCount: visualStats.cameraAvoidanceCount,
          cameraClipCount: visualStats.cameraClipCount,
          driftTier,
          driftTierSeen: visualStats.driftTierSeen,
          boostSeen: visualStats.boostSeen,
          fps: Number(visualStats.fps.toFixed(1)),
          branchVisibleSeen: visualStats.branchVisibleSeen,
          kartOnly,
          kartScreenCoverage: measureKartScreenCoverage(),
          nearestCollisionDistance: nearestCollisionClearance(),
          offroadSlowdown: offroad ? playerVehicleConfig.offroad : 1,
          offroadSlowdownSeen: visualStats.offroadSlowdownSeen,
          roadAheadCoverage: estimateRoadAheadCoverage(),
          trackKey: compiled.key,
          visibleBranchCount,
        };
        window.__raceVisualTelemetry = raceVisualTelemetry;
        setTelemetry({
          altitude: race.player.flightAltitude,
          bananas: race.player.bananas,
          boost: race.player.boostTimer,
          boostTier: race.player.boostTier,
          cameraFlash: race.screenFlashTimer,
          drift: race.player.driftCharge,
          driftActive: race.player.driftActive,
          driftTier,
          doubleSlotUses: race.player.doubleSlotUses,
          heldBalloon: race.player.heldBalloon,
          itemTier: race.player.heldItem?.level || 0,
          jump: race.player.jumpHeight,
          lap: Math.min(race.player.lap, compiled.laps),
          lapSplits: race.player.lapSplits.slice(-3),
          offroad,
          perfect: race.player.perfectBoostTimer > 0,
          place: race.player.rank,
          positionNotice: race.positionNotice,
          rareNextPickup: race.player.rareNextPickup,
          secondaryHeldItem: race.player.secondaryHeldItem,
          shield: race.player.shieldTimer,
          speed: Math.round(race.player.velocity.length() * 5.8),
          speedRatio: clamp(race.player.velocity.length() / (playerVehicleConfig.maxSpeed || 1), 0, 1.4),
          time: race.time,
          upgradeAvailable: race.player.bananas >= 3 && Boolean(race.player.heldItem) && race.player.heldItem.level < 3,
          vehicleMode: race.player.vehicleMode,
        });
      }

      if (race.player.finished && !reportedFinish) {
        reportedFinish = true;
        const result = {
          bestLap: race.player.bestLap,
          place: race.player.rank,
          time: race.player.finishTime,
          trackKey: compiled.key,
          ...(playtest.enabled
            ? {
                playtest: {
                  bananaMax: playtest.bananaMax,
                  hazardsEncountered: Number(playtest.hazardsEncountered.toFixed(2)),
                  itemBoxesCollected: playtest.itemBoxesCollected,
                  itemUses: playtest.itemUses,
                  layers: Array.from(playtest.layers),
                  locks: playtest.locks,
                  mode: playtest.mode,
                  raceIndex: playtest.raceIndex,
                  signatureUsed: playtest.signatureUsed,
                  switchPads: playtest.switchPads,
                  upgrades: playtest.upgrades,
                  vehicles: Array.from(playtest.vehicles),
                  zones: playtest.zones,
                },
              }
            : {}),
        };
        if (playtest.enabled) {
          window.__racePlaytestResult = result;
          recordPlaytest('finish', result);
        }
        onFinishRef.current?.(result);
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
      ambientNodes.forEach((node) => node.oscillator.stop());
      ambientNodes = [];
      if (window.__raceVisualTelemetry?.trackKey === compiled.key) window.__raceVisualTelemetry = null;
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
  const isKartOnly = Boolean(track.kartOnly || track.courseV2?.kartOnly);
  const minimap = makeRaceMinimap(track);
  return (
    <div className="arcade-race-shell relative left-1/2 w-[min(100vw,1440px)] -translate-x-1/2 overflow-hidden border-y border-white/16 bg-[#10151d] shadow-[0_24px_70px_rgba(0,0,0,0.35)] lg:rounded-lg lg:border">
      <canvas
        ref={canvasRef}
        className="arcade-race-canvas block h-[min(88svh,900px)] min-h-[640px] w-full touch-none max-sm:h-[100svh] max-sm:min-h-[100svh]"
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

      <div className="pointer-events-none absolute left-3 top-3 w-[min(222px,calc(100vw-154px))] sm:left-4 sm:w-[320px]">
        <div className="race-objective-card p-2.5 text-white backdrop-blur-md">
          <div className="grid grid-cols-[46px_1fr] items-center gap-2.5">
            <div className="grid h-11 w-11 place-items-center rounded-lg border-2 border-[#80ff62] bg-[#80ff62]/15 text-[#80ff62] shadow-[0_0_18px_rgba(128,255,98,0.22)]">
              <Dumbbell size={22} strokeWidth={2.6} />
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[8px] font-black uppercase leading-none tracking-[0.16em] text-white/62">
                Next Objective
              </div>
              <div className="mt-1 truncate font-mono text-[13px] font-black leading-none text-white">
                {GAME_STATUS.nextObjective.replace('Gym', '')}
                <span className="text-[#80ff62]">Gym</span>
              </div>
              <div className="mt-1 font-mono text-[13px] font-black leading-none text-[#9bff4f]">
                {GAME_STATUS.nextDistance}
              </div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2">
            <div className="h-2 border border-white/14 bg-black/32">
              <div
                className="h-full bg-[#9bff4f] transition-all"
                style={{ width: `${clamp((telemetry.drift / 2.75) * 100, 12, 100)}%` }}
              />
            </div>
            <div className="font-mono text-[8px] font-black uppercase tracking-[0.12em] text-white/56">
              Route
            </div>
          </div>
          <div className="mt-1 flex justify-between gap-2 font-mono text-[8px] uppercase tracking-[0.1em] text-white/55">
            <span>{track.shortName || track.name}</span>
            <span>Lap {telemetry.lap}/{track.laps}</span>
            <span>{ordinal(telemetry.place)}</span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute right-3 top-3 grid w-[116px] gap-2 text-white sm:right-4 sm:w-[132px]">
        <CurrencyStack />
        <div className="hidden grid-cols-2 gap-2 sm:grid">
          <button
            type="button"
            onClick={() => queueLocalCommand('item')}
            disabled={!telemetry.heldBalloon}
            className="arcade-hud-panel pointer-events-auto grid h-11 place-items-center border border-white/18 bg-[#10151d]/[0.88] text-white shadow-[0_12px_28px_rgba(0,0,0,0.3)] backdrop-blur-md transition-opacity disabled:opacity-42"
            title={telemetry.heldBalloon?.label || 'No item held'}
          >
            <HeldIcon size={17} />
          </button>
          <button
            type="button"
            onClick={() => queueLocalCommand('vehicle')}
            disabled={isKartOnly}
            className="arcade-hud-panel pointer-events-auto grid h-11 place-items-center border border-white/18 bg-[#10151d]/[0.88] text-white shadow-[0_12px_28px_rgba(0,0,0,0.3)] backdrop-blur-md"
            title={isKartOnly ? 'Kart only' : 'Change vehicle'}
          >
            <Plane size={17} className={isKartOnly ? 'opacity-35' : ''} />
          </button>
        </div>
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

      <div className="arcade-touch-controls pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+18px)] z-30 flex items-end justify-between px-3">
        <div className="pointer-events-none">
          <div className="race-minimap">
            {minimap ? (
              <svg className="race-minimap__svg" viewBox="0 0 100 100" aria-hidden="true">
                <path className="race-minimap__svg-route" d={minimap.route} />
                {minimap.branches.map((branch) => (
                  <path
                    key={branch.key}
                    className="race-minimap__svg-branch"
                    d={branch.d}
                    style={{ stroke: branch.accent }}
                  />
                ))}
              </svg>
            ) : (
              <span className="race-minimap__route" />
            )}
            <span className="race-minimap__dot" />
          </div>
          <div className="pointer-events-auto mt-2 flex gap-2">
            <button
              type="button"
              className="arcade-touch-button"
              onPointerDown={press({ steer: -1 })}
              onPointerUp={release({ steer: 0 })}
              onPointerCancel={release({ steer: 0 })}
              aria-label="Steer left"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              className="arcade-touch-button"
              onPointerDown={press({ steer: 1 })}
              onPointerUp={release({ steer: 0 })}
              onPointerCancel={release({ steer: 0 })}
              aria-label="Steer right"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <div className="pointer-events-auto flex items-end gap-2">
          <div className="flex flex-col gap-2">
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
              className={`arcade-touch-button ${telemetry.driftActive ? 'arcade-touch-button--active' : ''}`}
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
          <div className="grid gap-2 justify-items-end">
            {(telemetry.driftActive || telemetry.boost > 0 || telemetry.offroad) && (
              <div className="arcade-hud-panel min-w-[112px] border border-white/18 bg-[#10151d]/[0.86] px-3 py-2 text-right font-mono text-[8px] font-black uppercase tracking-[0.12em] text-white backdrop-blur-md">
                <div className={telemetry.offroad ? 'text-[#ff8a70]' : telemetry.boost > 0 ? 'text-[#ffd34f]' : 'text-[#46d9ef]'}>
                  {telemetry.offroad ? 'Off-road slow' : telemetry.boost > 0 ? `Boost x${Math.max(1, telemetry.boostTier || telemetry.driftTier || 1)}` : `Drift ${telemetry.driftTier || 0}/3`}
                </div>
                <div className="mt-1 h-1.5 bg-black/45">
                  <span
                    className="block h-full bg-[#46d9ef]"
                    style={{ width: `${clamp((telemetry.drift / 2.75) * 100, telemetry.boost > 0 ? 100 : 12, 100)}%` }}
                  />
                </div>
              </div>
            )}
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
