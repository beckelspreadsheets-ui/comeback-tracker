import * as THREE from 'three';
import {
  DRIFT_TUNING,
  VEHICLES,
} from './physics/kartTuning.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const rounded = (value, digits = 3) => (Number.isFinite(value) ? Number(value.toFixed(digits)) : null);
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

export const createRaceTelemetryStats = () => ({
  actualFps: 60,
  branchVisibleSeen: false,
  boostSeen: false,
  boostPadActivationDelay: null,
  boostPadActivationTime: null,
  boostPadProbeStartTime: null,
  boostPadSpeedAfter: null,
  boostPadSpeedBefore: null,
  boostSource: null,
  boostSourcesSeen: {},
  cameraAvoidanceCount: 0,
  cameraClipCount: 0,
  collisionCount: 0,
  collisionImpactTime: null,
  collisionSpeedAfter: null,
  collisionSpeedBefore: null,
  collisionSpeedLossRatio: null,
  driftHopDuration: null,
  driftHopStartCount: 0,
  driftHopStartTime: null,
  driftStartCount: 0,
  driftTierSeen: 0,
  fps: 60,
  frameBudgetMissCount: 0,
  frameBudgetMissRatio: 0,
  frameCount: 0,
  frameDtMs: 0,
  frameElapsedMs: 0,
  frameElapsedTotalMs: 0,
  framePhaseMaxMs: {},
  framePhaseMs: {},
  frameWorkMaxMs: 0,
  frameWorkMs: 0,
  lifecycleAudioResumeCount: 0,
  lifecycleAudioSuspendCount: 0,
  lifecycleInputClearCount: 0,
  lifecycleLastEvent: null,
  lifecycleLastFrameResetAt: null,
  lifecyclePageHidePersistedCount: 0,
  lifecyclePageShowPersistedCount: 0,
  lifecyclePauseCount: 0,
  lifecycleResumeCount: 0,
  itemBoxPickupDelay: null,
  itemBoxPickupKey: null,
  itemBoxPickupTime: null,
  itemBoxProbeStartTime: null,
  itemBoxSourceType: null,
  offroadSpeedAfter: null,
  offroadSpeedBefore: null,
  offroadSpeedLossRatio: null,
  offroadSlowdownSeen: false,
  brakingStartTime: null,
  reverseSpeedCapRatio: null,
  reverseSpeedRatio: null,
  reverseTuningRatio: null,
  steeringStartHeading: null,
  steeringStartTime: null,
  steeringTurn90Time: null,
  steeringTurnDegrees: 0,
  telemetryIntervalMs: null,
  telemetryPublishCount: 0,
  telemetrySkipCount: 0,
  timeFromTopSpeedTo25: null,
  stuckRecoveryCount: 0,
  timeToSpeed80: null,
  timeToSpeed98: null,
  visibleRivalsSeen: 0,
});

export const normalizedSpeedFor = (speed, topSpeed) => {
  if (!Number.isFinite(speed) || !Number.isFinite(topSpeed) || topSpeed <= 0) return 0;
  return rounded(clamp(speed / topSpeed, 0, 1.4));
};

export const recordTimeToSpeed80 = (stats, raceTime, normalizedSpeed) => {
  if (!stats || stats.timeToSpeed80 !== null) return;
  if (normalizedSpeed >= 0.8) stats.timeToSpeed80 = rounded(raceTime);
};

export const recordTimeToSpeed98 = (stats, raceTime, normalizedSpeed) => {
  if (!stats || stats.timeToSpeed98 !== null) return;
  if (normalizedSpeed >= 0.98) stats.timeToSpeed98 = rounded(raceTime);
};

export const recordBrakingToSpeed25 = (stats, raceTime, normalizedSpeed, brakingActive) => {
  if (!stats || stats.timeFromTopSpeedTo25 !== null) return;
  if (!brakingActive) {
    stats.brakingStartTime = null;
    return;
  }
  if (stats.brakingStartTime === null && normalizedSpeed >= 0.95) {
    stats.brakingStartTime = raceTime;
  }
  if (stats.brakingStartTime !== null && normalizedSpeed <= 0.25) {
    stats.timeFromTopSpeedTo25 = rounded(raceTime - stats.brakingStartTime);
  }
};

export const recordSteeringTurn90 = (stats, raceTime, heading, steeringActive) => {
  if (!stats || stats.steeringTurn90Time !== null) return;
  if (!steeringActive) {
    stats.steeringStartHeading = null;
    stats.steeringStartTime = null;
    stats.steeringTurnDegrees = 0;
    return;
  }
  if (stats.steeringStartHeading === null || stats.steeringStartTime === null) {
    stats.steeringStartHeading = heading;
    stats.steeringStartTime = raceTime;
  }
  const turnedRadians = Math.abs(signedAngleDelta(heading, stats.steeringStartHeading));
  stats.steeringTurnDegrees = rounded((turnedRadians * 180) / Math.PI, 1);
  if (turnedRadians >= Math.PI / 2) {
    stats.steeringTurn90Time = rounded(raceTime - stats.steeringStartTime);
  }
};

export const recordBoostSource = (stats, source) => {
  if (!stats || !source) return;
  stats.boostSeen = true;
  stats.boostSource = source;
  stats.boostSourcesSeen[source] = (stats.boostSourcesSeen[source] || 0) + 1;
};

export const measureObjectScreenCoverage = (object, camera) => {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) {
    return {
      bottomYRatio: 1,
      centerXRatio: 0.5,
      centerYRatio: 1,
      framingBandFromBottom: 0,
      heightRatio: 0,
      leftXRatio: 0.5,
      rightXRatio: 0.5,
      widthRatio: 0,
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
  const minX = Math.min(...corners.map((corner) => corner.x));
  const maxX = Math.max(...corners.map((corner) => corner.x));
  const centerYRatio = (minY + maxY) / 2;
  return {
    bottomYRatio: rounded(maxY),
    centerXRatio: rounded((minX + maxX) / 2),
    centerYRatio: rounded(centerYRatio),
    framingBandFromBottom: rounded(1 - centerYRatio),
    heightRatio: rounded(Math.max(0, maxY - minY)),
    leftXRatio: rounded(minX),
    rightXRatio: rounded(maxX),
    widthRatio: rounded(Math.max(0, maxX - minX)),
  };
};

export const projectedPointVisible = (point, camera, y = 0.8) => {
  const projected = point.clone().setY(y).project(camera);
  const x = projected.x * 0.5 + 0.5;
  const screenY = -projected.y * 0.5 + 0.5;
  return {
    visible: projected.z > -1 && projected.z < 1 && x > 0.02 && x < 0.98 && screenY > 0.02 && screenY < 0.88,
    x,
    y: screenY,
  };
};

export const estimateRoadAheadCoverage = ({ camera, compiled, player }) => {
  const samples = 18;
  const speed = player.velocity.length();
  const progressStep = Math.max(0.008, ((speed + 38) * 0.22) / compiled.totalLength);
  const forward = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
  let visible = 0;
  for (let index = 1; index <= samples; index += 1) {
    const sample = compiled.pointAt(player.progress + progressStep * index);
    const projected = projectedPointVisible(sample.point, camera, 0.7);
    if (projected.visible && projected.y < 0.82) {
      visible += 1;
      continue;
    }
    const headingProbe = player.position.clone().addScaledVector(forward, 18 + index * 10);
    const nearest = compiled.nearest(headingProbe);
    const headingProjected = projectedPointVisible(nearest.point, camera, 0.7);
    if (headingProjected.visible && headingProjected.y < 0.84 && nearest.distance < (nearest.roadWidth || compiled.roadWidth) * 0.7) {
      visible += 1;
    }
  }
  return {
    samples,
    value: rounded(visible / samples),
  };
};

export const countVisibleBranches = ({ camera, compiled, player }) => {
  const forward = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
  return (compiled.branchRoutes || []).reduce((count, route) => {
    const cueAhead = wrap01((route.decisionCueProgress ?? route.startProgress) - player.progress);
    const startAhead = wrap01(route.startProgress - player.progress);
    const ahead = cueAhead > 0.004 && cueAhead <= 0.3 ? cueAhead : startAhead;
    if (ahead <= 0.004 || ahead > 0.3) return count;
    const sample = compiled.pointAt(cueAhead > 0.004 && cueAhead <= 0.3 ? route.decisionCueProgress ?? route.startProgress : route.startProgress);
    const toBranch = sample.point.clone().sub(player.position).setY(0);
    if (toBranch.length() > 360 || toBranch.dot(forward) < -40) return count;
    const projected = projectedPointVisible(sample.point, camera, 4.5);
    return count + (projected.visible || ahead < 0.22 ? 1 : 0);
  }, 0);
};

export const countVisibleRivals = ({ camera, rivals }) =>
  rivals.reduce((count, rival) => {
    if (rival.finished) return count;
    const projected = projectedPointVisible(rival.position, camera, 2.6);
    return count + (projected.visible ? 1 : 0);
  }, 0);

export const summarizeRivalPackDistance = ({ player, rivals = [] } = {}) => {
  const distances = rivals
    .filter((rival) => rival && !rival.finished)
    .map((rival) => distance2D(player.position, rival.position))
    .filter(Number.isFinite);
  if (!distances.length) {
    return {
      average: null,
      nearest: null,
    };
  }
  return {
    average: rounded(distances.reduce((sum, distance) => sum + distance, 0) / distances.length, 2),
    nearest: rounded(Math.min(...distances), 2),
  };
};

export const playerShieldVisualActive = (playerVehicleGroup) => {
  let active = false;
  playerVehicleGroup?.traverse?.((child) => {
    if (child?.userData?.kind === 'shield-visual' && child.visible) active = true;
  });
  return active;
};

export const playerShieldBurstVisualActive = (playerVehicleGroup) => {
  let active = false;
  playerVehicleGroup?.traverse?.((child) => {
    if (child?.userData?.kind === 'shield-burst-crown' && child.visible) active = true;
  });
  return active;
};

export const playerDriftTrailVisualActive = (playerVehicleGroup) => {
  let active = false;
  playerVehicleGroup?.traverse?.((child) => {
    if (child?.userData?.kind === 'drift-trail-visual' && child.visible) active = true;
  });
  return active;
};

export const boostPadVisualActive = (boostPadMeshes = []) =>
  boostPadMeshes.some((mesh) => {
    if (!mesh?.visible || mesh.userData?.kind !== 'boost-pad-visual' || !mesh.userData?.visualActive) return false;
    return mesh.children?.some((child) => child?.userData?.kind === 'boost-pad-chevron' && child.visible);
  });

export const playerBoostBurstVisualActive = (playerVehicleGroup) => {
  let active = false;
  playerVehicleGroup?.traverse?.((child) => {
    if (child?.userData?.kind === 'boost-burst-streak' && child.visible) active = true;
  });
  return active;
};

export const estimateHorizonYRatio = ({ camera, player }) => {
  const forward = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
  const projected = player.position.clone().addScaledVector(forward, 360).setY(0).project(camera);
  return clamp(-projected.y * 0.5 + 0.5, 0, 1);
};

export const nearestCollisionClearance = ({ collisionCircles, compiled, playerPosition }) => {
  if (!collisionCircles.length) return Infinity;
  const nearest = collisionCircles.reduce((best, circle) => {
    const circleRoad = compiled.nearest(circle.position);
    const circleRoadWidth = circleRoad.roadWidth || compiled.roadWidth;
    const corridorClearance = circleRoad.distance - circleRoadWidth * 0.5;
    const effectiveRadius = Math.min(circle.radius || 0, Math.max(0, corridorClearance - 2.5));
    if (effectiveRadius <= 0) return best;
    const clearance = distance2D(playerPosition, circle.position) - effectiveRadius;
    return Math.min(best, clearance);
  }, Infinity);
  return rounded(nearest, 2);
};

export const activeSurfaceFor = ({ compiled, nearest, offroad, progress }) => {
  if (offroad) return 'offroad';
  const zone = (compiled.surfaceZones || []).find((entry) => {
    if (!Number.isFinite(entry.progress)) return false;
    return progressDistance(entry.progress, progress) < 0.018;
  });
  if (zone?.type) return zone.type;
  if (nearest.branchKey) return `branch:${nearest.branchKey}`;
  return 'asphalt';
};

export const rendererInfoTelemetryFor = (renderer) => {
  const info = renderer?.info;
  if (!info) return null;
  return {
    calls: Number.isFinite(info.render?.calls) ? info.render.calls : null,
    frame: Number.isFinite(info.render?.frame) ? info.render.frame : null,
    geometries: Number.isFinite(info.memory?.geometries) ? info.memory.geometries : null,
    lines: Number.isFinite(info.render?.lines) ? info.render.lines : null,
    points: Number.isFinite(info.render?.points) ? info.render.points : null,
    programs: Array.isArray(info.programs) ? info.programs.length : null,
    textures: Number.isFinite(info.memory?.textures) ? info.memory.textures : null,
    triangles: Number.isFinite(info.render?.triangles) ? info.render.triangles : null,
  };
};

export const buildRaceVisualTelemetry = ({
  activeSurface,
  assetLoadState,
  boostPadVisual = false,
  boostTimer,
  camera,
  driftTier,
  heldItemKey,
  kartOnly,
  kartScreenCoverage,
  nearestCollisionDistance,
  normalizedSpeed,
  offroadSlowdown,
  player,
  playerBoostBurstVisual = false,
  playerDriftTrailVisual = false,
  playerShieldBurstVisual = false,
  playerShieldVisual = false,
  race,
  roadAheadCoverage,
  rendererInfo,
  rivalPackDistance,
  sceneBudget,
  stats,
  trackKey,
  visibleBranchCount,
  visibleRivals,
}) => {
  const boostActive = boostTimer > 0;
  const roadAheadValue =
    typeof roadAheadCoverage === 'number' ? roadAheadCoverage : roadAheadCoverage?.value ?? null;
  const boostSource = boostActive ? player.boostSource || stats.boostSource || null : null;

  return {
    activeSurface,
    assetLoadState,
    boostSeen: stats.boostSeen,
    boostTimer: rounded(boostTimer),
    branchVisibleSeen: stats.branchVisibleSeen,
    cameraAvoidanceCount: stats.cameraAvoidanceCount,
    cameraClipCount: stats.cameraClipCount,
    driftTier,
    driftTierSeen: stats.driftTierSeen,
    deliveredFps: rounded(stats.deliveredFps, 1),
    actualFps: rounded(stats.actualFps, 1),
    fps: rounded(stats.fps, 1),
    frameBudgetMissCount: stats.frameBudgetMissCount || 0,
    frameBudgetMissRatio: rounded(stats.frameBudgetMissRatio, 3),
    frameCount: stats.frameCount || 0,
    frameDtMs: rounded(stats.frameDtMs, 2),
    frameElapsedMs: rounded(stats.frameElapsedMs, 2),
    frameElapsedTotalMs: rounded(stats.frameElapsedTotalMs, 2),
    framePhaseMaxMs: stats.framePhaseMaxMs || {},
    framePhaseMs: stats.framePhaseMs || {},
    lifecycle: {
      audioResumeCount: stats.lifecycleAudioResumeCount || 0,
      audioSuspendCount: stats.lifecycleAudioSuspendCount || 0,
      inputClearCount: stats.lifecycleInputClearCount || 0,
      lastEvent: stats.lifecycleLastEvent || null,
      lastFrameResetAt: stats.lifecycleLastFrameResetAt ?? null,
      pageHidePersistedCount: stats.lifecyclePageHidePersistedCount || 0,
      pageShowPersistedCount: stats.lifecyclePageShowPersistedCount || 0,
      pauseCount: stats.lifecyclePauseCount || 0,
      resumeCount: stats.lifecycleResumeCount || 0,
    },
    telemetry: {
      intervalMs: stats.telemetryIntervalMs ?? null,
      publishCount: stats.telemetryPublishCount || 0,
      skipCount: stats.telemetrySkipCount || 0,
    },
    frameWorkMaxMs: rounded(stats.frameWorkMaxMs, 2),
    frameWorkMs: rounded(stats.frameWorkMs, 2),
    kartOnly,
    kartScreenCoverage,
    nearestCollisionDistance,
    normalizedSpeed,
    offroadSlowdown,
    offroadSlowdownSeen: stats.offroadSlowdownSeen,
    reducedMotion: Boolean(race.reducedMotion),
    renderer: rendererInfo,
    roadAheadCoverage,
    sceneBudget,
    trackKey,
    visibleBranchCount,
    player: {
      audioMuted: Boolean(race.audioMuted),
      boostActive,
      boostPadActivationDelay: stats.boostPadActivationDelay,
      boostPadActivationTime: stats.boostPadActivationTime,
      boostPadSpeedAfter: stats.boostPadSpeedAfter,
      boostPadSpeedBefore: stats.boostPadSpeedBefore,
      boostPadVisualActive: Boolean(boostPadVisual),
      boostBurstVisualActive: Boolean(playerBoostBurstVisual),
      boostSource,
      collisionCount: stats.collisionCount,
      collisionImpactTime: stats.collisionImpactTime,
      collisionSpeedAfter: stats.collisionSpeedAfter,
      collisionSpeedBefore: stats.collisionSpeedBefore,
      collisionSpeedLossRatio: stats.collisionSpeedLossRatio,
      driftActive: Boolean(player.driftActive),
      driftHopActive: (player.driftHopTimer || 0) > 0,
      driftHopDuration: stats.driftHopDuration,
      driftHopStartCount: stats.driftHopStartCount,
      driftHopStartTime: stats.driftHopStartTime,
      driftStartCount: stats.driftStartCount,
      driftTier,
      driftTierSeen: stats.driftTierSeen,
      driftTrailVisualActive: Boolean(playerDriftTrailVisual),
      grounded: (player.jumpHeight || 0) <= 0.02,
      hopTimer: rounded(player.driftHopTimer || 0),
      itemBoxPickupDelay: stats.itemBoxPickupDelay,
      itemBoxPickupKey: stats.itemBoxPickupKey,
      itemBoxPickupTime: stats.itemBoxPickupTime,
      itemBoxSourceType: stats.itemBoxSourceType,
      kartScreenCoverage,
      normalizedSpeed,
      offroadSpeedAfter: stats.offroadSpeedAfter,
      offroadSpeedBefore: stats.offroadSpeedBefore,
      offroadSpeedLossRatio: stats.offroadSpeedLossRatio,
      progress: rounded(player.progress),
      reducedMotion: Boolean(race.reducedMotion),
      reverseSpeedCapRatio: stats.reverseSpeedCapRatio,
      reverseSpeedRatio: stats.reverseSpeedRatio,
      reverseTuningRatio: stats.reverseTuningRatio,
      speedRatio: normalizedSpeed,
      shield: rounded(player.shieldTimer || 0),
      shieldBurstVisualActive: Boolean(playerShieldBurstVisual),
      shieldVisualActive: Boolean(playerShieldVisual),
      steering: rounded(player.steerInput || 0),
      steeringTurnDegrees: stats.steeringTurnDegrees,
      steeringTurn90Time: stats.steeringTurn90Time,
      stuckRecoveryCount: stats.stuckRecoveryCount,
      stuckRecoveryCooldown: rounded(player.stuckRecoveryCooldown || 0),
      stuckTimer: rounded(player.stuckTimer || 0),
      timeFromTopSpeedTo25: stats.timeFromTopSpeedTo25,
      timeToSpeed80: stats.timeToSpeed80,
      timeToSpeed98: stats.timeToSpeed98,
      vehicleMode: player.vehicleMode,
    },
    camera: {
      avoidanceCount: stats.cameraAvoidanceCount,
      clipCount: stats.cameraClipCount,
      distance: rounded(camera.distance),
      fov: rounded(camera.fov, 1),
      height: rounded(camera.height),
      horizonYRatio: rounded(camera.horizonYRatio),
      roadAheadCoverage: rounded(roadAheadValue),
      routeLookaheadCurvature: rounded(camera.routeLookahead?.curvature),
      routeLookaheadDistance: rounded(camera.routeLookahead?.distance),
      routeLookaheadSeconds: rounded(camera.routeLookahead?.seconds),
      routeLookaheadUsed: Boolean(camera.routeLookahead?.usedRoute),
    },
    race: {
      heldItemKey: heldItemKey || null,
      lap: race.lap,
      place: race.place,
      rivalPackAverageDistance: rivalPackDistance?.average ?? null,
      rivalPackNearestDistance: rivalPackDistance?.nearest ?? null,
      visibleRivals,
      visibleRivalsSeen: stats.visibleRivalsSeen,
    },
  };
};

export const raceHudTelemetryForFrame = ({
  compiled,
  driftTier = 0,
  offroad = false,
  playerVehicleConfig = {},
  race,
  visibleRivals = 0,
  visibleRivalsSeen = 0,
} = {}) => {
  const player = race.player;
  return {
    altitude: player.flightAltitude,
    audioMuted: Boolean(race.audioMuted),
    bananas: player.bananas,
    boost: player.boostTimer,
    boostTier: player.boostTier,
    cameraFlash: race.screenFlashTimer,
    drift: player.driftCharge,
    driftActive: player.driftActive,
    driftTier,
    doubleSlotUses: player.doubleSlotUses,
    heldBalloon: player.heldBalloon,
    itemTier: player.heldItem?.level || 0,
    jump: player.jumpHeight,
    lap: Math.min(player.lap, compiled.laps),
    lapSplits: player.lapSplits.slice(-3),
    offroad,
    perfect: player.perfectBoostTimer > 0,
    place: player.rank,
    positionNotice: race.positionNotice,
    rareNextPickup: player.rareNextPickup,
    reducedMotion: Boolean(race.reducedMotion),
    secondaryHeldItem: player.secondaryHeldItem,
    shield: player.shieldTimer,
    speed: Math.round(player.velocity.length() * 5.8),
    speedRatio: clamp(player.velocity.length() / (playerVehicleConfig.maxSpeed || 1), 0, 1.4),
    time: race.time,
    upgradeAvailable: player.bananas >= 3 && Boolean(player.heldItem) && player.heldItem.level < 3,
    vehicleMode: player.vehicleMode,
    visibleRivals,
    visibleRivalsSeen,
  };
};

export const publishRaceTelemetryFrame = ({
  boostPadMeshes = [],
  camera,
  brakingTelemetryActive = false,
  cameraRouteLookahead = null,
  collisionCircles = [],
  compiled,
  driftTuning = DRIFT_TUNING,
  includeVisualTelemetry = true,
  kartOnly = false,
  playtest = {},
  playerVehicleGroup = null,
  race,
  renderer = null,
  sceneBudget = null,
  setTelemetry = () => {},
  stats,
  vehicles = VEHICLES,
} = {}) => {
  const player = race.player;
  const playerVehicleConfig = vehicles[player.vehicleMode] || vehicles.kart || {};
  const playerDriftTune = driftTuning[player.vehicleMode] || driftTuning.kart || {};
  const playerNearest = compiled.nearest(player.position);
  const playerRoadWidth = playerNearest.roadWidth || compiled.roadWidth;
  const playerSpeed = player.velocity.length();
  const normalizedSpeed = normalizedSpeedFor(playerSpeed, playerVehicleConfig.maxSpeed || 1);
  const playerForward = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
  const reverseSpeedRatio = normalizedSpeedFor(
    Math.max(0, -player.velocity.dot(playerForward)),
    playerVehicleConfig.maxSpeed || 1
  );
  stats.reverseSpeedRatio = Math.max(stats.reverseSpeedRatio || 0, reverseSpeedRatio);
  stats.reverseSpeedCapRatio = normalizedSpeedFor(
    playerVehicleConfig.reverse || 0,
    playerVehicleConfig.maxSpeed || 1
  );
  stats.reverseTuningRatio = stats.reverseSpeedCapRatio;
  recordTimeToSpeed80(stats, race.time, normalizedSpeed);
  recordTimeToSpeed98(stats, race.time, normalizedSpeed);
  recordBrakingToSpeed25(
    stats,
    race.time,
    normalizedSpeed,
    brakingTelemetryActive
  );
  const driftTier = (playerDriftTune.sparkChargeTime || []).reduce(
    (bestTier, chargeTime, index) => (player.driftCharge >= chargeTime ? index + 1 : bestTier),
    0
  );
  stats.driftTierSeen = Math.max(stats.driftTierSeen, driftTier);
  if (player.boostTimer > 0) stats.boostSeen = true;
  const offroad =
    player.vehicleMode !== 'plane' &&
    player.jumpHeight <= 0.05 &&
    playerNearest.distance > playerRoadWidth * 0.52;
  if (offroad) stats.offroadSlowdownSeen = true;
  let visibleBranchCount = 0;
  const cameraCanProject = Boolean(camera?.projectionMatrix?.elements && camera?.matrixWorldInverse?.elements);
  const visibleRivals = cameraCanProject ? countVisibleRivals({ camera, rivals: race.rivals }) : 0;
  const rivalPackDistance = summarizeRivalPackDistance({ player, rivals: race.rivals });
  stats.visibleRivalsSeen = Math.max(stats.visibleRivalsSeen || 0, visibleRivals);
  if (includeVisualTelemetry) {
    visibleBranchCount = countVisibleBranches({ camera, compiled, player });
    if (visibleBranchCount > 0) stats.branchVisibleSeen = true;
  }
  const heldItemKey =
    typeof player.heldBalloon === 'string'
      ? player.heldBalloon
      : player.heldBalloon?.itemKey || player.heldBalloon?.key || null;
  const raceVisualTelemetry = includeVisualTelemetry
    ? buildRaceVisualTelemetry({
        activeSurface: activeSurfaceFor({
          compiled,
          nearest: playerNearest,
          offroad,
          progress: player.progress,
        }),
        assetLoadState:
          compiled.courseV2?.assetLoadState || {
            externalAssets: 0,
            manifestPath: '/src/assets/game/asset-manifest.json',
            missing: [],
            state: 'procedural-ready',
          },
        boostTimer: player.boostTimer,
        boostPadVisual: boostPadVisualActive(boostPadMeshes),
        camera: {
          distance: camera.position.distanceTo(player.position),
          fov: camera.fov,
          height: camera.position.y - player.position.y,
          horizonYRatio: estimateHorizonYRatio({ camera, player }),
          routeLookahead: cameraRouteLookahead,
        },
        driftTier,
        heldItemKey,
        kartOnly,
        kartScreenCoverage: measureObjectScreenCoverage(playerVehicleGroup, camera),
        nearestCollisionDistance: nearestCollisionClearance({
          collisionCircles,
          compiled,
          playerPosition: player.position,
        }),
        normalizedSpeed,
        offroadSlowdown: offroad ? playerVehicleConfig.offroad : 1,
        player,
        playerBoostBurstVisual: playerBoostBurstVisualActive(playerVehicleGroup),
        playerDriftTrailVisual: playerDriftTrailVisualActive(playerVehicleGroup),
        playerShieldBurstVisual: playerShieldBurstVisualActive(playerVehicleGroup),
        playerShieldVisual: playerShieldVisualActive(playerVehicleGroup),
        race: {
          audioMuted: Boolean(race.audioMuted),
          lap: Math.min(player.lap, compiled.laps),
          place: player.rank,
          reducedMotion: Boolean(race.reducedMotion),
        },
        rendererInfo: rendererInfoTelemetryFor(renderer),
        roadAheadCoverage: estimateRoadAheadCoverage({ camera, compiled, player }),
        sceneBudget,
        stats,
        trackKey: compiled.key,
        visibleBranchCount,
        visibleRivals,
        rivalPackDistance,
      })
    : null;
  const hudTelemetry = raceHudTelemetryForFrame({
    compiled,
    driftTier,
    offroad,
    playerVehicleConfig,
    race,
    visibleRivals,
    visibleRivalsSeen: stats.visibleRivalsSeen || 0,
  });
  setTelemetry(hudTelemetry);

  return {
    driftTier,
    heldItemKey,
    hudTelemetry,
    normalizedSpeed,
    offroad,
    raceVisualTelemetry,
    visibleBranchCount,
  };
};
