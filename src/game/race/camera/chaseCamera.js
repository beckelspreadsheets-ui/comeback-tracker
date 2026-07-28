// LEGACY - NOT THE SHIPPED GAME. Editing this file changes nothing the owner
// ever sees. The racer that ships is the ComebackCityThreeKartRace.jsx
// monolith, whose chase camera is inline (grep "Arcade chase camera: low,
// close") and shares no code with this.
//
// DO NOT DELETE. This file is not orphaned: scripts/race-content-playtest.mjs
// (npm run test:race) imports updateChaseCameraFrame,
// cameraCollisionCandidatesFor and applyCameraCollisionAvoidance from here by
// name and asserts against them. Deleting it breaks that script. See
// ../raceSceneRuntime.js for the full legacy-stack reachability graph.
//
// SUPERSEDED — DO NOT PORT THE COLLISION HELPERS INTO THE MONOLITH.
// An earlier note here advertised cameraCollisionCandidateFor /
// cameraCollisionCandidatesFor / applyCameraCollisionAvoidance as ready-made
// salvage for the camera driving inside an iceberg (penguin-village-p0_67).
// That salvage has since happened independently, and the monolith made the
// OPPOSITE broadphase call on purpose: grep "Camera occluders, collected ONCE"
// in ComebackCityThreeKartRace.jsx, which records why a bounding SPHERE was
// rejected — a sphere over a 130-unit iceberg cone has a ~92-unit radius, so it
// would shove the camera around every berg the track merely passes near. It
// collects world-space AABBs instead. cameraCollisionCandidateFor below IS that
// rejected sphere test (collider.radius + padding), so importing it would undo
// a reasoned, already-measured decision.
//
// Wave-6 camera work should extend the monolith's guard, not import from here.

import * as THREE from 'three';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const rounded = (value, digits = 3) => (Number.isFinite(value) ? Number(value.toFixed(digits)) : null);
const headingFromVector = (vector) => Math.atan2(vector?.x || 0, vector?.z || 0);
const signedAngleDelta = (target, current) => {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
};

// Module-level scratch vectors to reduce per-frame allocations. These are
// reused within a single updateChaseCameraFrame call; any value that outlives
// the call is cloned before return.
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _lookBase = new THREE.Vector3();
const _lookAt = new THREE.Vector3();
const _rayStart = new THREE.Vector3();
const _toCamera = new THREE.Vector3();
const _rayDirection = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _fallbackTarget = new THREE.Vector3();


export const cameraCollisionCandidateFor = ({
  distance = 0,
  object,
  padding = 12,
  rayDirection,
  rayStart,
} = {}) => {
  const collider = object?.userData?.raceCameraCollider;
  if (!collider?.center || !Number.isFinite(collider.radius)) return true;
  if (!rayStart || !rayDirection || distance <= 0) return true;

  const center = collider.center;
  const toCenterX = center.x - rayStart.x;
  const toCenterY = center.y - rayStart.y;
  const toCenterZ = center.z - rayStart.z;
  const projectedDistance = clamp(
    toCenterX * rayDirection.x + toCenterY * rayDirection.y + toCenterZ * rayDirection.z,
    0,
    distance
  );
  const closestX = rayStart.x + rayDirection.x * projectedDistance;
  const closestY = rayStart.y + rayDirection.y * projectedDistance;
  const closestZ = rayStart.z + rayDirection.z * projectedDistance;
  const dx = center.x - closestX;
  const dy = center.y - closestY;
  const dz = center.z - closestZ;
  const radius = collider.radius + padding;

  return dx * dx + dy * dy + dz * dz <= radius * radius;
};

export const cameraCollisionCandidatesFor = ({
  collisionObjects = [],
  distance = 0,
  padding = 12,
  rayDirection,
  rayStart,
} = {}) =>
  collisionObjects.filter((object) =>
    cameraCollisionCandidateFor({
      distance,
      object,
      padding,
      rayDirection,
      rayStart,
    })
  );

export const resolveChaseCameraProfile = ({
  altitude = 0,
  boostActive = false,
  driftActive = false,
  finalStretchActive = false,
  headingCameraActive = false,
  isPlane = false,
  mobile = false,
  mobilePreset,
  offroadActive = false,
  reducedMotion = false,
  speed = 0,
  vehicle,
}) => {
  const maxSpeed = vehicle?.maxSpeed || 1;
  const speedRatio = clamp(speed / maxSpeed, 0, 1);
  const chaseBaseDistance = mobile ? mobilePreset?.distance ?? vehicle?.cameraDistance ?? 0 : vehicle?.cameraDistance ?? 0;
  const chaseBaseHeight = mobile ? mobilePreset?.height ?? vehicle?.cameraHeight ?? 0 : vehicle?.cameraHeight ?? 0;
  const driftFramingDistance = !mobile && !isPlane && driftActive ? 14 : 0;
  const finalStretchFramingDistance = !mobile && !isPlane && finalStretchActive ? 24 : 0;
  const headingFramingDistance =
    !mobile && !isPlane && headingCameraActive ? (speedRatio >= 0.75 ? 3 : 8) : 0;
  const offroadFramingDistance = !mobile && !isPlane && offroadActive ? 10 : 0;
  const lowSpeedFramingDistance = mobile || isPlane || speedRatio >= 0.5 ? 0 : (0.5 - speedRatio) * 32;
  const lowSpeedHeightLift = mobile || isPlane || speedRatio >= 0.5 ? 0 : (0.5 - speedRatio) * -4;
  const mobileLookAhead = mobilePreset?.lookAhead ?? 42;
  const mobileFov = mobilePreset?.fov ?? 64;

  if (isPlane) {
    return {
      chaseDistance: (vehicle?.cameraDistance || 0) + speedRatio * 4.5,
      chaseHeight: altitude + (vehicle?.cameraHeight || 0) + speedRatio * 1.5,
      collisionLift: mobile ? 6.6 : 8.4,
      fov: boostActive && !reducedMotion ? (mobile ? 68 : 70) : mobile ? mobileFov : 66,
      lookAhead: 24 + speedRatio * 8,
      lookHeight: altitude + 1.2,
      rollScale: 0.045,
      sideOffsetScale: 3.6,
      speedRatio,
    };
  }

  return {
    chaseDistance:
      chaseBaseDistance +
      driftFramingDistance +
      finalStretchFramingDistance +
      headingFramingDistance +
      offroadFramingDistance +
      lowSpeedFramingDistance +
      speedRatio * (mobile ? 1.2 : 4.5),
    chaseHeight: chaseBaseHeight + lowSpeedHeightLift + speedRatio * (mobile ? 1.2 : 1.1) + altitude * 0.18,
    collisionLift: mobile ? 6.6 : 8.4,
    fov: boostActive && !reducedMotion ? (mobile ? 66 : 64) : mobile ? mobileFov : 62,
    lookAhead: (mobile ? mobileLookAhead + 2 : 42) + speedRatio * 12,
    lookHeight: (mobile ? 4.5 : 5.1) + altitude * 0.12,
    rollScale: 0.045,
    sideOffsetScale: 1.35,
    speedRatio,
  };
};

export const cameraRollFor = ({
  driftActive = false,
  reducedMotion = false,
  speedRatio = 0,
  steerInput = 0,
}) => (reducedMotion ? 0 : -steerInput * speedRatio * (driftActive ? 0.075 : 0.045));

export const resolveRouteLookaheadTarget = ({
  compiled,
  fallbackForward,
  player,
  profile,
  speed = 0,
  targetSeconds = 1.25,
}) => {
  const fallbackDistance = Math.max(0, profile?.lookAhead || 0);
  _fallbackTarget.copy(player?.position || _fallbackTarget.set(0, 0, 0)).addScaledVector(fallbackForward || _forward.set(0, 0, 1), fallbackDistance);
  const missingRoute =
    !compiled?.pointAt ||
    !fallbackForward ||
    !player?.position ||
    !Number.isFinite(player.progress) ||
    !Number.isFinite(compiled.totalLength) ||
    compiled.totalLength <= 0;

  if (missingRoute) {
    return {
      curvature: 0,
      distance: fallbackDistance,
      seconds: speed > 0.1 ? rounded(fallbackDistance / speed) : null,
      target: _fallbackTarget.clone(),
      usedRoute: false,
    };
  }

  const seconds = clamp(targetSeconds, 1, 1.5);
  const distance = Math.max(fallbackDistance, speed > 0.1 ? speed * seconds : 0);
  const sample = compiled.pointAt(player.progress + distance / compiled.totalLength);
  if (!sample?.point) {
    return {
      curvature: 0,
      distance,
      seconds: speed > 0.1 ? rounded(distance / speed) : null,
      target: _fallbackTarget.clone(),
      usedRoute: false,
    };
  }

  return {
    curvature: rounded(signedAngleDelta(headingFromVector(sample.tangent), headingFromVector(fallbackForward))),
    distance: rounded(distance),
    seconds: speed > 0.1 ? rounded(distance / speed) : null,
    target: sample.point.clone(),
    usedRoute: true,
  };
};

export const applyCameraCollisionAvoidance = ({
  collisionLift = 8.4,
  collisionObjects = [],
  desired,
  hitBackoff = 3.4,
  liftPadding = 2.8,
  maxResolveAttempts = 6,
  minimumCameraDistance = 7.5,
  minimumHitDistance = 5.2,
  raycaster,
  rayStart,
  residualPadding = 0.4,
}) => {
  if (!desired || !rayStart || !raycaster || !collisionObjects.length) {
    return { avoided: false, clipped: false, desired };
  }

  let avoided = false;
  let clipped = false;
  const attempts = Math.max(1, maxResolveAttempts);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    _toCamera.copy(desired).sub(rayStart);
    const rawDistance = _toCamera.length();
    if (rawDistance <= 1) return { avoided, clipped: false, desired };

    _rayDirection.copy(_toCamera).normalize();
    const candidates = cameraCollisionCandidatesFor({
      collisionObjects,
      distance: rawDistance,
      rayDirection: _rayDirection,
      rayStart,
    });
    if (!candidates.length) return { avoided, clipped: false, desired };

    raycaster.set(rayStart, _rayDirection);
    raycaster.far = rawDistance;
    const hit = raycaster
      .intersectObjects(candidates, true)
      .find(
        (entry) =>
          entry.distance > minimumHitDistance &&
          entry.distance < raycaster.far - residualPadding
      );

    if (!hit) return { avoided, clipped: false, desired };

    avoided = true;
    clipped = true;
    const attemptLift = liftPadding * (attempt + 1);
    const safeDistance = Math.max(
      minimumCameraDistance,
      hit.distance - hitBackoff - attempt * 1.4
    );
    desired.copy(rayStart).addScaledVector(_rayDirection, safeDistance);
    desired.y = Math.max(
      desired.y + attemptLift,
      rayStart.y + collisionLift + attemptLift
    );
  }

  return { avoided, clipped, desired };
};

export const updateChaseCameraFrame = ({
  camera,
  cameraCollisionObjects = [],
  cameraInitialized = false,
  collisionStats = null,
  compiled,
  dt = 0,
  mobile = false,
  mobilePreset,
  player,
  race,
  random = Math.random,
  raycaster,
  reducedMotion = false,
  useHeadingCamera = false,
  vehicle,
} = {}) => {
  const isPlane = player.vehicleMode === 'plane';
  _forward.set(Math.sin(player.heading), 0, Math.cos(player.heading));
  _right.set(_forward.z, 0, -_forward.x);
  const altitude = isPlane ? player.flightAltitude : player.jumpHeight;
  const playerSpeed = player.velocity.length();
  const nearestRoad = !isPlane && compiled?.nearest ? compiled.nearest(player.position) : null;
  const activeRoadWidth = nearestRoad?.roadWidth || compiled?.roadWidth || 0;
  const offroadActive =
    !isPlane &&
    player.jumpHeight <= 0.05 &&
    Number.isFinite(nearestRoad?.distance) &&
    nearestRoad.distance > activeRoadWidth * 0.52;
  const finalStretchActive =
    !isPlane &&
    Number.isFinite(player.lap) &&
    Number.isFinite(compiled?.laps) &&
    player.lap >= compiled.laps &&
    (player.progress <= 0.06 || player.progress >= 0.92);
  const profile = resolveChaseCameraProfile({
    altitude,
    boostActive: player.boostTimer > 0,
    driftActive: player.driftActive,
    finalStretchActive,
    headingCameraActive: useHeadingCamera,
    isPlane,
    mobile,
    mobilePreset,
    offroadActive,
    reducedMotion,
    speed: playerSpeed,
    vehicle,
  });
  const routeLookahead = isPlane || useHeadingCamera
    ? null
    : resolveRouteLookaheadTarget({
        compiled,
        fallbackForward: _forward,
        player,
        profile,
        speed: playerSpeed,
      });
  _desired.copy(player.position)
    .addScaledVector(_forward, -profile.chaseDistance)
    .addScaledVector(_right, -player.steerInput * profile.speedRatio * profile.sideOffsetScale)
    .add(_offset.set(0, profile.chaseHeight, 0));
  if (routeLookahead?.target) {
    _lookBase.copy(routeLookahead.target);
  } else {
    _lookBase.copy(player.position).addScaledVector(_forward, profile.lookAhead);
  }
  _lookAt.copy(_lookBase).add(_offset.set(0, profile.lookHeight, 0));

  if (!reducedMotion && (race?.cameraShakeTimer || 0) > 0) {
    const shake = race.cameraShakeTimer / 0.2;
    _desired.x += (random() - 0.5) * 1.2 * shake;
    _desired.y += (random() - 0.5) * 0.7 * shake;
  }

  if (cameraCollisionObjects.length) {
    _rayStart.copy(player.position).add(_offset.set(0, altitude + 3.4, 0));
    const cameraAvoidance = applyCameraCollisionAvoidance({
      collisionLift: profile.collisionLift,
      collisionObjects: cameraCollisionObjects,
      desired: _desired,
      raycaster,
      rayStart: _rayStart,
    });
    if (cameraAvoidance.avoided && collisionStats) collisionStats.cameraAvoidanceCount += 1;
    if (cameraAvoidance.clipped && collisionStats) collisionStats.cameraClipCount += 1;
  }

  if (!cameraInitialized) {
    camera.position.copy(_desired);
    cameraInitialized = true;
  } else {
    camera.position.lerp(_desired, 1 - Math.exp(-9.4 * dt));
  }
  camera.lookAt(_lookAt);
  camera.rotation.z += cameraRollFor({
    driftActive: player.driftActive,
    reducedMotion,
    speedRatio: profile.speedRatio,
    steerInput: player.steerInput,
  });
  const nextFov = THREE.MathUtils.lerp(camera.fov, profile.fov, 1 - Math.exp(-3.4 * dt));
  const fovDelta = Math.abs(nextFov - camera.fov);
  camera.fov = fovDelta <= 0.01 ? profile.fov : nextFov;
  if (fovDelta > 0.01) camera.updateProjectionMatrix();

  return {
    cameraInitialized,
    // Clones, not the module scratch vectors — a caller that stores these
    // across frames must not see them silently rewritten next frame.
    desired: _desired.clone(),
    lookAt: _lookAt.clone(),
    profile,
    routeLookahead,
  };
};
