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
  isPlane = false,
  mobile = false,
  mobilePreset,
  reducedMotion = false,
  speed = 0,
  vehicle,
}) => {
  const maxSpeed = vehicle?.maxSpeed || 1;
  const speedRatio = clamp(speed / maxSpeed, 0, 1);
  const chaseBaseDistance = mobile ? mobilePreset?.distance ?? vehicle?.cameraDistance ?? 0 : vehicle?.cameraDistance ?? 0;
  const chaseBaseHeight = mobile ? mobilePreset?.height ?? vehicle?.cameraHeight ?? 0 : vehicle?.cameraHeight ?? 0;
  const mobileLookAhead = mobilePreset?.lookAhead ?? 52;
  const mobileFov = mobilePreset?.fov ?? 66;

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
    chaseDistance: chaseBaseDistance + speedRatio * (mobile ? 0.8 : 12),
    chaseHeight: chaseBaseHeight + speedRatio * (mobile ? 1.5 : 2.2) + altitude * 0.18,
    collisionLift: mobile ? 6.6 : 8.4,
    fov: boostActive && !reducedMotion ? (mobile ? 68 : 70) : mobile ? mobileFov : 66,
    lookAhead: (mobile ? mobileLookAhead + 4 : 52) + speedRatio * 18,
    lookHeight: (mobile ? 4.9 : 6.6) + altitude * 0.12,
    rollScale: 0.045,
    sideOffsetScale: 1.8,
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
  const fallbackTarget = player?.position?.clone?.().addScaledVector(fallbackForward, fallbackDistance);
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
      target: fallbackTarget,
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
      target: fallbackTarget,
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
  hitBackoff = 2.6,
  liftPadding = 2.2,
  maxResolveAttempts = 4,
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
    const toCamera = desired.clone().sub(rayStart);
    const rawDistance = toCamera.length();
    if (rawDistance <= 1) return { avoided, clipped: false, desired };

    const rayDirection = toCamera.clone().normalize();
    const candidates = cameraCollisionCandidatesFor({
      collisionObjects,
      distance: rawDistance,
      rayDirection,
      rayStart,
    });
    if (!candidates.length) return { avoided, clipped: false, desired };

    raycaster.set(rayStart, rayDirection);
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
    desired.copy(rayStart).addScaledVector(rayDirection, safeDistance);
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
  const forward = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  const altitude = isPlane ? player.flightAltitude : player.jumpHeight;
  const playerSpeed = player.velocity.length();
  const profile = resolveChaseCameraProfile({
    altitude,
    boostActive: player.boostTimer > 0,
    isPlane,
    mobile,
    mobilePreset,
    reducedMotion,
    speed: playerSpeed,
    vehicle,
  });
  const routeLookahead = isPlane || useHeadingCamera
    ? null
    : resolveRouteLookaheadTarget({
        compiled,
        fallbackForward: forward,
        player,
        profile,
        speed: playerSpeed,
      });
  const desired = player.position
    .clone()
    .addScaledVector(forward, -profile.chaseDistance)
    .addScaledVector(right, -player.steerInput * profile.speedRatio * profile.sideOffsetScale)
    .add(new THREE.Vector3(0, profile.chaseHeight, 0));
  const lookBase = routeLookahead?.target || player.position.clone().addScaledVector(forward, profile.lookAhead);
  const lookAt = lookBase.clone().add(new THREE.Vector3(0, profile.lookHeight, 0));

  if (!reducedMotion && (race?.cameraShakeTimer || 0) > 0) {
    const shake = race.cameraShakeTimer / 0.2;
    desired.x += (random() - 0.5) * 1.2 * shake;
    desired.y += (random() - 0.5) * 0.7 * shake;
  }

  if (cameraCollisionObjects.length) {
    const rayStart = player.position.clone().add(new THREE.Vector3(0, altitude + 3.4, 0));
    const cameraAvoidance = applyCameraCollisionAvoidance({
      collisionLift: profile.collisionLift,
      collisionObjects: cameraCollisionObjects,
      desired,
      raycaster,
      rayStart,
    });
    if (cameraAvoidance.avoided && collisionStats) collisionStats.cameraAvoidanceCount += 1;
    if (cameraAvoidance.clipped && collisionStats) collisionStats.cameraClipCount += 1;
  }

  if (!cameraInitialized) {
    camera.position.copy(desired);
    cameraInitialized = true;
  } else {
    camera.position.lerp(desired, 1 - Math.exp(-9.4 * dt));
  }
  camera.lookAt(lookAt);
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
    desired,
    lookAt,
    profile,
    routeLookahead,
  };
};
