import * as THREE from 'three';
import { getHazardDefinition } from '../../raceHazards.js';
import { FLIGHT_ALTITUDE_LIMITS } from '../physics/kartTuning.js';

export const SOURCE_WORLD = { h: 768, w: 1024 };
export const TRACK_SCALE = 0.32;
export const ROAD_WIDTH_MULTIPLIER = 1.48;
export const ROAD_WIDTH_MIN = 34;
export const SHOULDER_WIDTH = 7.4;

// Canonical lap-wrap threshold used by the V1 modular runtime. V2 keeps its
// existing 0.86 thresholds locked in ComebackCityThreeKartRace.jsx and
// rivalRacers.js; do not change those without owner sign-off.
export const LAP_WRAP_THRESHOLD = 0.82;

const { cruise: FLIGHT_CRUISE_ALTITUDE } = FLIGHT_ALTITUDE_LIMITS;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrap01 = (value) => ((value % 1) + 1) % 1;
const distance2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// Module-level scratch vectors to reduce per-frame allocations in the hot
// nearest/pointAt paths. They are reused within a single call chain; any
// value that outlives the call is cloned before return.
const _scratchSample = new THREE.Vector3();
const _scratchNormal = new THREE.Vector3();

export const layerAltitude = (layerKey) =>
  layerKey === 'air' ? FLIGHT_CRUISE_ALTITUDE : layerKey === 'hybrid' ? 7.5 : 0;

export const layerOffset = (layerKey, roadWidth) =>
  layerKey === 'air' ? roadWidth * 0.42 : layerKey === 'hybrid' ? -roadWidth * 0.34 : 0;

export const toWorldPoint = (point, y = 0) =>
  new THREE.Vector3(
    (point.x - SOURCE_WORLD.w / 2) * TRACK_SCALE,
    y,
    (point.y - SOURCE_WORLD.h / 2) * TRACK_SCALE
  );

export const toCourseV2Point = (point, y = 0) =>
  new THREE.Vector3(point.x || 0, point.y ?? y, point.z ?? point.y ?? 0);

export const sampleCourseLine = (points, { closed = false, divisions = 32 } = {}) => {
  const vectors = (points || []).map((point) => toCourseV2Point(point));
  if (vectors.length < 3) return vectors;
  const curve = new THREE.CatmullRomCurve3(vectors, closed, 'catmullrom', 0.42);
  const samples = curve.getSpacedPoints(Math.max(divisions, vectors.length * 4));
  if (closed && samples.length > 1) samples.pop();
  return samples;
};

// Returns scratch vectors; callers must clone before storing or returning.
const pointOnSegment = (segment, t) => {
  _scratchSample.set(segment.a.x + segment.dx * t, 0, segment.a.z + segment.dz * t);
  return {
    point: _scratchSample,
    tangent: segment.tangent,
  };
};

export const compileTrack3D = (track) => {
  const courseV2 = track.courseV2 || track.course || null;
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
      maxX: Math.max(a.x, b.x),
      maxZ: Math.max(a.z, b.z),
      minX: Math.min(a.x, b.x),
      minZ: Math.min(a.z, b.z),
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
      // Cheap AABB reject: if the segment's bounding box is farther from the
      // position than the current best distance, skip the projection.
      if (best) {
        const closestX = clamp(position.x, segment.minX, segment.maxX);
        const closestZ = clamp(position.z, segment.minZ, segment.maxZ);
        const dx = position.x - closestX;
        const dz = position.z - closestZ;
        if (dx * dx + dz * dz > best.distance * best.distance) return;
      }

      const ax = position.x - segment.a.x;
      const az = position.z - segment.a.z;
      const t = clamp((ax * segment.dx + az * segment.dz) / (segment.length * segment.length), 0, 1);
      const sample = pointOnSegment(segment, t);
      const dist = distance2D(position, sample.point);
      if (!best || dist < best.distance) {
        const rawNormal = _scratchNormal.set(-segment.tangent.z, 0, segment.tangent.x);
        const side =
          (position.x - sample.point.x) * rawNormal.x + (position.z - sample.point.z) * rawNormal.z >= 0
            ? 1
            : -1;
        best = {
          distance: dist,
          normal: rawNormal.clone().multiplyScalar(side),
          point: sample.point.clone(),
          progress: progressMapper((segment.start + segment.length * t) / sourceTotalLength),
          tangent: sample.tangent.clone(),
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
    const sample = pointOnSegment(segment, t);
    return {
      point: sample.point.clone(),
      tangent: sample.tangent.clone(),
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
        maxX: Math.max(a.x, b.x),
        maxZ: Math.max(a.z, b.z),
        minX: Math.min(a.x, b.x),
        minZ: Math.min(a.z, b.z),
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
