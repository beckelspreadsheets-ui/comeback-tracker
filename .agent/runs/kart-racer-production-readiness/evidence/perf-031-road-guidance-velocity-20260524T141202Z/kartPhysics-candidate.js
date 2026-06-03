const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const signedAngleDelta = (target, current) => {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
};

export const nextVehicleModeFor = (current, vehicleOrder = ['kart', 'hover', 'plane']) => {
  const currentIndex = vehicleOrder.indexOf(current);
  return vehicleOrder[(currentIndex + 1) % vehicleOrder.length] || 'kart';
};

export const applyVehicleModeChange = ({
  flightAltitudeLimits = { cruise: 17, max: 34, min: 7.5 },
  force = false,
  kartOnly = false,
  nextMode,
  racer,
  raceTime = 0,
  vehicles = {},
} = {}) => {
  if (!racer) {
    return {
      changed: false,
      reason: 'missing-racer',
    };
  }
  if (!vehicles[nextMode]) {
    return {
      changed: false,
      reason: 'unknown-vehicle',
    };
  }
  if (kartOnly && nextMode !== 'kart') {
    return {
      changed: false,
      reason: 'kart-only',
    };
  }
  if (!force && racer.switchLockedUntil > raceTime) {
    return {
      changed: false,
      reason: 'switch-locked',
    };
  }

  const previousMode = racer.vehicleMode;
  racer.vehicleMode = nextMode;
  racer.transformTimer = 0.5;
  racer.invincibleTimer = Math.max(racer.invincibleTimer || 0, 0.5);
  if (nextMode === 'plane') {
    racer.flightAltitude = clamp(
      Math.max(racer.flightAltitude || 0, flightAltitudeLimits.cruise),
      flightAltitudeLimits.min,
      flightAltitudeLimits.max
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

  return {
    changed: true,
    nextMode,
    previousMode,
    reason: null,
  };
};

const defaultDistance2D = (a, b) => Math.hypot((a?.x || 0) - (b?.x || 0), (a?.z || 0) - (b?.z || 0));

const lerpVelocityTowardTangent = (velocity, tangent, targetSpeed, alpha) => {
  const targetX = tangent.x * targetSpeed;
  const targetY = tangent.y * targetSpeed;
  const targetZ = tangent.z * targetSpeed;
  velocity.x += (targetX - velocity.x) * alpha;
  velocity.y += (targetY - velocity.y) * alpha;
  velocity.z += (targetZ - velocity.z) * alpha;
};

export const vehicleMatchesMode = (vehicleMode, expected) =>
  expected === 'both' || expected === vehicleMode || (expected === 'kart' && vehicleMode === 'hover');

const progressInRange = (progress, start, end) =>
  start <= end ? progress >= start && progress <= end : progress >= start || progress <= end;

export const resolveVehicleIntegrationForFrame = ({
  distanceBetween = defaultDistance2D,
  dt = 0,
  hitPlayer = () => false,
  player = null,
  pointAt = () => null,
  raceTime = 0,
  setVehicleMode = () => false,
  shouldSkip = false,
  switchPads = [],
  vehicleLocks = [],
  vehicleMatches = vehicleMatchesMode,
  vehicleZones = [],
} = {}) => {
  if (shouldSkip || !player) {
    return {
      blockedZones: [],
      lockHits: [],
      penaltyZones: [],
      skipped: true,
      switchPadHits: [],
      zoneSwitches: [],
    };
  }

  const switchPadHits = [];
  const zoneSwitches = [];
  const blockedZones = [];
  const penaltyZones = [];
  const lockHits = [];

  switchPads.forEach((pad) => {
    pad.cooldown = Math.max(0, pad.cooldown - dt);
    if (pad.cooldown <= 0 && distanceBetween(player.position, pad.position) < (pad.radius || 7)) {
      setVehicleMode(player, pad.targetVehicle, { force: true });
      pad.cooldown = 1.2;
      switchPadHits.push(pad);
    }
  });

  vehicleZones.forEach((zone) => {
    if (zone.active === false) return;
    const sample = pointAt(zone.progress);
    if (!sample?.point || distanceBetween(player.position, sample.point) > (zone.radius || 12)) return;
    if (vehicleMatches(player.vehicleMode, zone.vehicle)) return;

    if (zone.action === 'auto-switch') {
      setVehicleMode(player, zone.vehicle, { force: true });
      zoneSwitches.push(zone);
    } else if (zone.action === 'block') {
      if (player.velocity?.multiplyScalar) player.velocity.multiplyScalar(0.28);
      hitPlayer(0.2);
      blockedZones.push(zone);
    } else if (zone.action === 'penalty') {
      hitPlayer(zone.severity || 0.65);
      penaltyZones.push(zone);
    }
  });

  vehicleLocks.forEach((lock) => {
    if (!progressInRange(player.progress, lock.start, lock.end)) return;
    player.switchLockedUntil = Math.max(player.switchLockedUntil || 0, raceTime + 0.2);
    if (lock.vehicle && !vehicleMatches(player.vehicleMode, lock.vehicle)) {
      setVehicleMode(player, lock.vehicle, { force: true });
    }
    lockHits.push(lock);
  });

  return {
    blockedZones,
    lockHits,
    penaltyZones,
    skipped: false,
    switchPadHits,
    zoneSwitches,
  };
};

export const applyPlayerHitResponse = ({
  bananaScatterCount = 3,
  cameraShakeTimer = 0.2,
  cue = 'item-hit',
  hitDurationBase = 0.45,
  hitDurationPerSeverity = 0.22,
  jumpIgnoreHeight = 1.1,
  player,
  screenFlashTimer = 0.18,
  severity = 1,
  shieldDrainPerSeverity = 1.4,
  velocityMaxMultiplier = 0.72,
  velocityMinMultiplier = 0.42,
  velocitySeverityMultiplier = 0.08,
} = {}) => {
  if (!player) {
    return {
      applied: false,
      reason: 'missing-player',
    };
  }
  if ((player.invincibleTimer || 0) > 0) {
    return {
      applied: false,
      reason: 'invincible',
    };
  }
  if ((player.jumpHeight || 0) > jumpIgnoreHeight) {
    return {
      applied: false,
      reason: 'airborne',
    };
  }
  if ((player.shieldTimer || 0) > 0) {
    const previousShieldTimer = player.shieldTimer || 0;
    player.shieldTimer = Math.max(0, previousShieldTimer - shieldDrainPerSeverity * severity);
    return {
      applied: false,
      previousShieldTimer,
      reason: 'shield-blocked',
      shieldBlocked: true,
      shieldTimer: player.shieldTimer,
    };
  }

  const hitTimer = hitDurationBase + severity * hitDurationPerSeverity;
  const velocityMultiplier = clamp(
    velocityMaxMultiplier - severity * velocitySeverityMultiplier,
    velocityMinMultiplier,
    velocityMaxMultiplier
  );
  player.hitTimer = Math.max(player.hitTimer || 0, hitTimer);
  if (player.velocity?.multiplyScalar) player.velocity.multiplyScalar(velocityMultiplier);

  return {
    applied: true,
    bananaScatterCount,
    cameraShakeTimer,
    cue,
    hitTimer: player.hitTimer,
    reason: null,
    screenFlashTimer,
    velocityMultiplier,
  };
};

export const applyRivalHitResponse = ({
  hitDurationBase = 0.52,
  hitDurationPerSeverity = 0.3,
  rival,
  severity = 1,
  speedBaseMultiplier = 0.72,
  speedMaxMultiplier = 0.78,
  speedMinMultiplier = 0.45,
  speedSeverityMultiplier = 0.08,
} = {}) => {
  if (!rival) {
    return {
      applied: false,
      reason: 'missing-rival',
    };
  }
  if ((rival.invincibleTimer || 0) > 0) {
    return {
      applied: false,
      reason: 'invincible',
    };
  }

  const hitTimer = hitDurationBase + severity * hitDurationPerSeverity;
  const speedMultiplier = clamp(
    speedBaseMultiplier - severity * speedSeverityMultiplier,
    speedMinMultiplier,
    speedMaxMultiplier
  );
  rival.hitTimer = Math.max(rival.hitTimer || 0, hitTimer);
  rival.speed *= speedMultiplier;

  return {
    applied: true,
    hitTimer: rival.hitTimer,
    reason: null,
    speedMultiplier,
  };
};

export const DRIFT_HOP_DURATION = 0.26;

export const STUCK_RECOVERY_TUNING = {
  centerPush: 10,
  headingAssist: 0.42,
  minimumPushSpeed: 9,
  movementThreshold: 1.35,
  pushSpeedRatio: 0.24,
  recoveryCooldown: 0.65,
  speedThreshold: 1.2,
  throttleThreshold: 0.35,
  triggerSeconds: 1.25,
};

export const driftHopVelocityFor = (speed, maxSpeed) => {
  const speedRatio = maxSpeed > 0 ? Math.min(1, Math.max(0, speed / maxSpeed)) : 0;
  return 7.2 + speedRatio * 1.1;
};

export const accelerationMultiplierForSpeed = ({ forwardSpeed = null, speedRatio = null, vehicle }) => {
  const topSpeed = Math.max(1, vehicle?.maxSpeed || 1);
  const ratio = Number.isFinite(speedRatio)
    ? clamp(speedRatio, 0, 1.2)
    : clamp(Math.max(0, forwardSpeed || 0) / topSpeed, 0, 1.2);
  const taperStart = clamp(vehicle?.accelerationTaperStart ?? 1, 0, 1);
  const minMultiplier = clamp(vehicle?.accelerationMinMultiplier ?? 1, 0, 1);
  if (ratio <= taperStart) return 1;
  return clamp(
    1 - ((ratio - taperStart) / Math.max(0.001, 1 - taperStart)) * (1 - minMultiplier),
    minMultiplier,
    1
  );
};

export const surfaceOffroadForState = ({
  distance = 0,
  isPlane = false,
  jumpHeight = 0,
  roadWidth = 0,
  thresholdRatio = 0.52,
} = {}) => distance > roadWidth * thresholdRatio && !isPlane && jumpHeight <= 0.05;

export const speedCapsForState = ({
  bananas = 0,
  boostTimer = 0,
  offroad = false,
  shieldTimer = 0,
  signedForwardSpeed = 0,
  vehicle,
} = {}) => {
  const bananaBonus = 1 + bananas * 0.018;
  const baseForwardSpeedCap = boostTimer > 0 ? vehicle?.boostMax || 0 : (vehicle?.maxSpeed || 0) * bananaBonus;
  const offroadMultiplier = offroad && shieldTimer <= 0 ? vehicle?.offroad || 1 : 1;
  const forwardSpeedCap = baseForwardSpeedCap * offroadMultiplier;
  const reverseSpeedCap = Math.max(1, vehicle?.reverse || forwardSpeedCap * 0.25);
  return {
    bananaBonus,
    forwardSpeedCap,
    offroadMultiplier,
    reverseSpeedCap,
    speedCap: signedForwardSpeed < -0.1 ? reverseSpeedCap : forwardSpeedCap,
  };
};

export const applySpeedCapForFrame = ({
  forward,
  offroad = false,
  player,
  vehicle,
} = {}) => {
  if (!player?.velocity || !forward || !vehicle) {
    return {
      clamped: false,
      speedAfter: 0,
      speedBefore: 0,
      speedCap: 0,
      signedForwardSpeed: 0,
    };
  }

  const signedForwardSpeed = player.velocity.dot(forward);
  const caps = speedCapsForState({
    bananas: player.bananas,
    boostTimer: player.boostTimer,
    offroad,
    shieldTimer: player.shieldTimer,
    signedForwardSpeed,
    vehicle,
  });
  const speedBefore = player.velocity.length();
  const clamped = speedBefore > caps.speedCap;
  if (clamped) player.velocity.setLength(caps.speedCap);

  return {
    ...caps,
    clamped,
    speedAfter: player.velocity.length(),
    speedBefore,
    signedForwardSpeed,
  };
};

export const applyGroundJumpForFrame = ({
  dt = 0,
  gravity = 54,
  landingTimer = 0.18,
  player,
  trickBoost = {
    impulse: 5.5,
    seconds: 0.3,
    source: 'trick',
    tier: 1,
  },
  trickSteerThreshold = 0.25,
} = {}) => {
  if (!player) {
    return {
      landed: false,
      trickBoost: null,
      updatedJump: false,
    };
  }

  const wasJumping = (player.jumpHeight || 0) > 0;
  let landed = false;
  let boostRequest = null;
  let updatedJump = false;

  if ((player.jumpHeight || 0) > 0 || (player.jumpVelocity || 0) > 0) {
    updatedJump = true;
    player.jumpHeight = Math.max(0, (player.jumpHeight || 0) + (player.jumpVelocity || 0) * dt);
    player.jumpVelocity = (player.jumpVelocity || 0) - gravity * dt;
    if (player.jumpHeight <= 0 && wasJumping) {
      landed = true;
      player.jumpHeight = 0;
      player.jumpVelocity = 0;
      player.landingTimer = landingTimer;
      if (player.driftActive && Math.abs(player.steerInput || 0) > trickSteerThreshold) {
        boostRequest = { ...trickBoost };
      }
    }
  }

  player.flightAltitude = 0;
  player.flightPitch = 0;
  player.flightRoll = 0;
  player.flightVerticalVelocity = 0;

  return {
    landed,
    trickBoost: boostRequest,
    updatedJump,
  };
};

export const applyPositionBoundsForFrame = ({
  bounds,
  dt = 0,
  isPlane = false,
  player,
  roadWidth = 0,
} = {}) => {
  if (!player?.position || !player?.velocity || !bounds) {
    return {
      clampedX: false,
      clampedZ: false,
      margin: 0,
      moved: false,
    };
  }

  player.position.addScaledVector(player.velocity, dt);
  const margin = isPlane ? Math.max(170, roadWidth * 5.5) : Math.max(120, roadWidth * 3.2);
  const minX = bounds.minX - margin;
  const maxX = bounds.maxX + margin;
  const minZ = bounds.minZ - margin;
  const maxZ = bounds.maxZ + margin;
  const clampedXValue = clamp(player.position.x, minX, maxX);
  const clampedZValue = clamp(player.position.z, minZ, maxZ);
  const clampedX = clampedXValue !== player.position.x;
  const clampedZ = clampedZValue !== player.position.z;

  if (clampedX) {
    player.position.x = clampedXValue;
    player.velocity.x *= isPlane ? -0.18 : -0.1;
  }
  if (clampedZ) {
    player.position.z = clampedZValue;
    player.velocity.z *= isPlane ? -0.18 : -0.1;
  }

  return {
    clampedX,
    clampedZ,
    margin,
    maxX,
    maxZ,
    minX,
    minZ,
    moved: true,
  };
};

export const driveForcesForFrame = ({
  dt = 0,
  forwardSpeed = 0,
  hitTimer = 0,
  speed = 0,
  throttle = 0,
  vehicle,
} = {}) => {
  if (hitTimer > 0) {
    return {
      accelerationMultiplier: 0,
      dragMultiplier: Math.max(0, 1 - dt * 1.8),
      forwardImpulse: 0,
      mode: 'hit',
      nextHitTimer: Math.max(0, hitTimer - dt),
    };
  }
  if (throttle > 0.08) {
    const accelerationMultiplier = accelerationMultiplierForSpeed({
      forwardSpeed,
      vehicle,
    });
    return {
      accelerationMultiplier,
      dragMultiplier: 1,
      forwardImpulse: (vehicle?.acceleration || 0) * throttle * accelerationMultiplier * dt,
      mode: 'accelerate',
      nextHitTimer: 0,
    };
  }
  if (throttle < -0.08) {
    return {
      accelerationMultiplier: 0,
      dragMultiplier: 1,
      forwardImpulse: -(vehicle?.brake || 0) * Math.abs(throttle) * dt,
      mode: 'brake',
      nextHitTimer: 0,
    };
  }
  return {
    accelerationMultiplier: 0,
    dragMultiplier: Math.max(0, 1 - (0.72 + speed * 0.006) * dt),
    forwardImpulse: 0,
    mode: 'coast',
    nextHitTimer: 0,
  };
};

export const canStartDriftHop = ({
  driftActive,
  driftHopTimer,
  driftInputReady,
  grounded,
  isPlane,
  jumpCooldown,
}) => !isPlane && driftInputReady && !driftActive && grounded && driftHopTimer <= 0 && jumpCooldown <= 0;

export const canActivateDrift = ({ driftHopTimer, driftInputReady, jumpHeight }) =>
  driftInputReady && (driftHopTimer > 0 || jumpHeight > 0.02);

export const driftTierForCharge = (charge, driftTune) =>
  (driftTune?.sparkChargeTime || []).reduce(
    (bestTier, chargeTime, index) => (charge >= chargeTime ? index + 1 : bestTier),
    0
  );

export const driftReleaseForState = ({
  charge = 0,
  driftActive = false,
  driftHeld = false,
  driftTune = {},
  minReleaseSpeed = 8,
  speed = 0,
} = {}) => {
  const shouldRelease = driftActive && (!driftHeld || speed < minReleaseSpeed);
  const tier = shouldRelease ? driftTierForCharge(charge, driftTune) : 0;
  return {
    boostDuration: tier > 0 ? driftTune.boostDuration?.[tier - 1] || 0 : 0,
    boostStrength: tier > 0 ? driftTune.boostStrength?.[tier - 1] || 0 : 0,
    source: tier > 0 ? 'drift' : null,
    shouldBoost: tier > 0,
    shouldRelease,
    tier,
  };
};

export const driftChargeForFrame = ({
  charge = 0,
  driftDirection = 0,
  dt = 0,
  speed = 0,
  steerInput = 0,
  vehicle,
}) => {
  const counterSteer = steerInput * driftDirection < -0.25 ? 1.22 : 1;
  return clamp(
    charge + (vehicle?.driftCharge || 0) * counterSteer * (0.78 + speed / 80) * dt,
    0,
    2.8
  );
};

export const steeringTurnInputForState = ({
  driftActive = false,
  driftDirection = 0,
  steerInput = 0,
  vehicle,
}) => (driftActive ? driftDirection * (vehicle?.driftTurn || 0) + steerInput * 0.25 : steerInput);

export const steeringTurnSpeedForState = ({
  driftActive = false,
  signedForwardSpeed = 0,
  vehicle,
  vehicleMode = null,
}) => {
  const turnSpeedRatio = clamp(Math.abs(signedForwardSpeed) / Math.max(1, vehicle?.maxSpeed || 1), 0.28, 1.2);
  if (driftActive) return turnSpeedRatio;
  if (vehicleMode === 'kart') return clamp(0.68 - turnSpeedRatio * 0.06, 0.61, 0.67);
  return turnSpeedRatio;
};

export const headingDeltaForFrame = ({
  controlsThrottle = 0,
  driftActive = false,
  driftDirection = 0,
  dt = 0,
  isPlane = false,
  jumpHeight = 0,
  signedForwardSpeed = 0,
  speed = 0,
  steerInput = 0,
  vehicle,
  vehicleMode = null,
}) => {
  if (speed <= 0.4 && Math.abs(controlsThrottle) <= 0.1) return 0;
  const turnInput = steeringTurnInputForState({
    driftActive,
    driftDirection,
    steerInput,
    vehicle,
  });
  const turnSpeed = steeringTurnSpeedForState({
    driftActive,
    signedForwardSpeed,
    vehicle,
    vehicleMode,
  });
  return (
    turnInput *
    (vehicle?.steer || 0) *
    turnSpeed *
    (isPlane ? 0.92 : jumpHeight > 0.05 ? 0.45 : 1) *
    Math.sign(signedForwardSpeed || controlsThrottle || 1) *
    dt
  );
};

export const applyLateralGripForFrame = ({
  dt = 0,
  player,
  right,
  speed = 0,
  vehicle,
} = {}) => {
  if (!player || !player.velocity || !right || !vehicle) {
    return {
      applied: false,
      driftSlipImpulse: 0,
      grip: 0,
      gripBlend: 0,
      lateralSpeed: 0,
    };
  }

  const lateralSpeed = player.velocity.dot(right);
  const grip = player.driftActive ? vehicle.driftGrip : vehicle.grip;
  const gripBlend = clamp(grip * dt, 0, 1);
  player.velocity.addScaledVector(right, -lateralSpeed * gripBlend);

  let driftSlipImpulse = 0;
  if (player.driftActive) {
    driftSlipImpulse = (player.driftDirection || 0) * (vehicle.driftSlip || 0) * (0.28 + speed / 90) * dt;
    player.velocity.addScaledVector(right, driftSlipImpulse);
  }

  return {
    applied: true,
    driftSlipImpulse,
    grip,
    gripBlend,
    lateralSpeed,
  };
};

export const applyRoadAssistForFrame = ({
  activeRoadWidth = 1,
  controlsThrottle = 0,
  dt = 0,
  isPlane = false,
  nearest,
  player,
  speed = 0,
} = {}) => {
  if (!player || !nearest?.tangent || !player.velocity || isPlane || speed <= 1.2) {
    return {
      applied: false,
      assistStrength: 0,
      cruiseAssist: 0,
      edgeAssist: 0,
      headingCorrection: 0,
      recenter: 0,
      velocityLerp: 0,
    };
  }

  const steerInput = player.steerInput || 0;
  const driftActive = !!player.driftActive;
  const trackHeading = Math.atan2(nearest.tangent.x, nearest.tangent.z);
  const edgeAssist = clamp(
    (nearest.distance - activeRoadWidth * 0.2) / Math.max(1, activeRoadWidth * 0.32),
    0,
    1
  );
  const cruiseAssist = !driftActive && controlsThrottle > 0.08 && Math.abs(steerInput) < 0.14 ? 0.62 : 0.02;
  const assistStrength = edgeAssist * (driftActive ? 0.38 : 1.1) + cruiseAssist;
  const headingCorrection =
    signedAngleDelta(trackHeading, player.heading || 0) * clamp(dt * assistStrength, 0, 0.072);
  player.heading = (player.heading || 0) + headingCorrection;

  let velocityLerp = 0;
  if (edgeAssist > 0.05 && (player.jumpHeight || 0) <= 0.05) {
    const guidedSpeed = Math.max(0, player.velocity.dot(nearest.tangent));
    velocityLerp = clamp(dt * edgeAssist * (driftActive ? 0.42 : 1.35), 0, 0.16);
    lerpVelocityTowardTangent(player.velocity, nearest.tangent, guidedSpeed, velocityLerp);
  }

  let recenter = 0;
  if (
    !driftActive &&
    controlsThrottle > 0.08 &&
    Math.abs(steerInput) < 0.14 &&
    nearest.distance > activeRoadWidth * 0.18
  ) {
    recenter = clamp((nearest.distance - activeRoadWidth * 0.18) / Math.max(1, activeRoadWidth * 0.46), 0, 1);
    player.velocity.addScaledVector(nearest.normal, -recenter * 34 * dt);
  }

  return {
    applied: true,
    assistStrength,
    cruiseAssist,
    edgeAssist,
    headingCorrection,
    recenter,
    velocityLerp,
  };
};

export const applyTrackBoundaryForFrame = ({
  activeRoadWidth = 1,
  dt = 0,
  isPlane = false,
  nearest,
  player,
} = {}) => {
  if (!player || !nearest?.normal || !nearest?.tangent || !player.velocity || isPlane) {
    return {
      applied: false,
      dragMultiplier: 1,
      edge: 0,
      guideLimit: activeRoadWidth,
      outwardDamping: 0,
      returnLerp: 0,
      returnStrength: 0,
      softLimit: activeRoadWidth * 0.5,
    };
  }

  const softLimit = activeRoadWidth * 0.5;
  const guideLimit = activeRoadWidth * (player.vehicleMode === 'hover' ? 1.18 : 1.05);
  const edge = clamp((nearest.distance - softLimit) / Math.max(1, guideLimit - softLimit), 0, 1);
  let dragMultiplier = 1;
  if (edge > 0 && (player.shieldTimer || 0) <= 0 && (player.jumpHeight || 0) <= 0.05) {
    player.velocity.addScaledVector(nearest.normal, -edge * 13 * dt);
    dragMultiplier = Math.max(0, 1 - (0.46 + edge * 1.35) * dt);
    player.velocity.multiplyScalar(dragMultiplier);
  }

  let outwardDamping = 0;
  let returnLerp = 0;
  let returnStrength = 0;
  if (nearest.distance > guideLimit && (player.jumpHeight || 0) <= 0.05) {
    returnStrength = clamp((nearest.distance - guideLimit) / Math.max(1, activeRoadWidth * 0.72), 0, 1);
    const guidedSpeed = Math.max(0, player.velocity.dot(nearest.tangent));
    const outwardSpeed = player.velocity.dot(nearest.normal);
    if (outwardSpeed > 0) {
      outwardDamping = clamp(edge * 0.72, 0.1, 0.72);
      player.velocity.addScaledVector(nearest.normal, -outwardSpeed * outwardDamping);
    }
    player.velocity.addScaledVector(nearest.normal, -returnStrength * 24 * dt);
    returnLerp = clamp(dt * (1.1 + returnStrength * 2.5), 0, 0.38);
    lerpVelocityTowardTangent(player.velocity, nearest.tangent, guidedSpeed, returnLerp);
  }

  return {
    applied: edge > 0 || returnStrength > 0,
    dragMultiplier,
    edge,
    guideLimit,
    outwardDamping,
    returnLerp,
    returnStrength,
    softLimit,
  };
};

export const resolveWorldCircleCollision = ({
  bounce = 1.18,
  circle,
  circleRoad,
  collisionPadding = 2.5,
  racer,
  racerRadius = 3.2,
  speedRetain = 0.62,
} = {}) => {
  if (!racer || !circle || racer.vehicleMode === 'plane' || racer.ghostTimer > 0 || racer.invincibleTimer > 0) {
    return { collided: false };
  }
  const circleRoadWidth = circleRoad?.roadWidth || 0;
  const corridorClearance = (circleRoad?.distance || 0) - circleRoadWidth * 0.5;
  const effectiveRadius = Math.min(circle.radius || 0, Math.max(0, corridorClearance - collisionPadding));
  if (effectiveRadius <= 0) return { collided: false };

  const offset = racer.position.clone().sub(circle.position).setY(0);
  const distance = offset.length();
  const radius = effectiveRadius + racerRadius;
  if (distance <= 0.001 || distance >= radius) return { collided: false };

  const speedBefore = racer.velocity.length();
  const normal = offset.multiplyScalar(1 / distance);
  racer.position.copy(circle.position).addScaledVector(normal, radius);
  const inwardSpeed = racer.velocity.dot(normal);
  if (inwardSpeed < 0) racer.velocity.addScaledVector(normal, -inwardSpeed * bounce);
  racer.velocity.multiplyScalar(speedRetain);
  const speedAfter = racer.velocity.length();

  return {
    collided: true,
    effectiveRadius,
    radius,
    speedAfter,
    speedBefore,
    speedLossRatio: speedBefore > 0 ? clamp((speedBefore - speedAfter) / speedBefore, 0, 1) : null,
  };
};

export const resolveWorldCollisionContactsForFrame = ({
  collisionCircles = [],
  defaultRoadWidth = 0,
  nearestRoadForPosition = null,
  racer = null,
} = {}) => {
  if (!racer || racer.vehicleMode === 'plane' || racer.ghostTimer > 0 || racer.invincibleTimer > 0) {
    return { collided: false, contacts: [] };
  }

  const contacts = [];
  collisionCircles.forEach((circle) => {
    const nearestRoad = nearestRoadForPosition?.(circle.position) || {};
    const collision = resolveWorldCircleCollision({
      circle,
      circleRoad: {
        distance: nearestRoad.distance,
        roadWidth: nearestRoad.roadWidth || defaultRoadWidth,
      },
      racer,
    });
    if (collision.collided) {
      contacts.push({
        circle,
        collision,
        road: nearestRoad,
      });
    }
  });

  return {
    collided: contacts.length > 0,
    contacts,
  };
};

export const resolvePlayerRivalBumpsForFrame = ({
  distanceBetween = defaultDistance2D,
  hitPlayer = () => false,
  hitRival = () => false,
  isPlane = false,
  maxJumpHeight = 1.1,
  player = null,
  playerHitSeverity = 0.34,
  pushRadius = 5.8,
  pushScale = 0.45,
  rivals = [],
  shieldHitSeverity = 0.75,
} = {}) => {
  const contacts = [];
  if (!player || isPlane) {
    return {
      bumped: false,
      contacts,
      reason: isPlane ? 'plane' : 'missing-player',
    };
  }

  rivals.forEach((rival) => {
    const gap = distanceBetween(player.position, rival.position);
    if (
      !(gap > 0 && gap < pushRadius) ||
      !(player.hitTimer <= 0) ||
      !(player.jumpHeight <= maxJumpHeight)
    ) {
      return;
    }

    const push = player.position.clone().sub(rival.position).setY(0).normalize();
    const pushDistance = (pushRadius - gap) * pushScale;
    player.position.addScaledVector(push, pushDistance);
    const shielded = player.shieldTimer > 0;
    if (shielded) hitRival(rival, shieldHitSeverity);
    else hitPlayer(playerHitSeverity);
    contacts.push({
      gap,
      playerHitSeverity: shielded ? 0 : playerHitSeverity,
      pushDistance,
      rival,
      rivalHitSeverity: shielded ? shieldHitSeverity : 0,
      shielded,
    });
  });

  return {
    bumped: contacts.length > 0,
    contacts,
    reason: contacts.length > 0 ? null : 'no-contact',
  };
};

export const updateStuckRecoveryState = ({
  dt,
  grounded = true,
  isPlane = false,
  movementDistance = 0,
  recoveryCooldown = 0,
  speed = 0,
  stuckTimer = 0,
  throttle = 0,
  tuning = STUCK_RECOVERY_TUNING,
}) => {
  const nextCooldown = Math.max(0, recoveryCooldown - dt);
  if (nextCooldown > 0) {
    return {
      candidate: false,
      recover: false,
      recoveryCooldown: nextCooldown,
      resetProbe: true,
      stuckTimer: 0,
    };
  }

  const candidate =
    !isPlane &&
    grounded &&
    throttle >= tuning.throttleThreshold &&
    speed <= tuning.speedThreshold &&
    movementDistance <= tuning.movementThreshold;
  const nextTimer = candidate ? stuckTimer + dt : 0;
  const recover = nextTimer >= tuning.triggerSeconds;

  return {
    candidate,
    recover,
    recoveryCooldown: recover ? tuning.recoveryCooldown : 0,
    resetProbe: !candidate || recover || movementDistance > tuning.movementThreshold,
    stuckTimer: recover ? 0 : nextTimer,
  };
};

export const applyStuckRecovery = ({
  activeRoadWidth = 1,
  nearest,
  player,
  tuning = STUCK_RECOVERY_TUNING,
  vehicle,
}) => {
  if (!player || !nearest?.tangent || !player.velocity || !vehicle) return null;

  const trackHeading = Math.atan2(nearest.tangent.x, nearest.tangent.z);
  const headingBlend = clamp(tuning.headingAssist, 0, 1);
  const headingDelta = signedAngleDelta(trackHeading, player.heading || 0);
  player.heading += headingDelta * headingBlend;

  const recoverySpeed = Math.max(tuning.minimumPushSpeed, (vehicle.maxSpeed || 0) * tuning.pushSpeedRatio);
  lerpVelocityTowardTangent(player.velocity, nearest.tangent, recoverySpeed, 0.62);

  const centerPull =
    nearest.normal && Number.isFinite(nearest.distance)
      ? clamp(nearest.distance / Math.max(1, activeRoadWidth * 0.5), 0, 1)
      : 0;
  if (centerPull > 0) player.velocity.addScaledVector(nearest.normal, -centerPull * tuning.centerPush);

  return {
    centerPull,
    headingDelta,
    recoverySpeed,
  };
};

export const applyPlayerTimersForFrame = ({
  dt = 0,
  forward,
  player,
} = {}) => {
  if (!player) {
    return {
      boostExpired: false,
      planeBob: 0,
      polarityReset: false,
      speed: 0,
    };
  }

  player.boostTimer = Math.max(0, player.boostTimer - dt);
  const boostExpired = player.boostTimer <= 0;
  if (boostExpired) {
    player.boostTier = 0;
    player.boostSource = null;
  }
  player.blindTimer = Math.max(0, player.blindTimer - dt);
  player.controlFlipTimer = Math.max(0, player.controlFlipTimer - dt);
  player.ghostTimer = Math.max(0, (player.ghostTimer || 0) - dt);
  player.invincibleTimer = Math.max(0, player.invincibleTimer - dt);
  player.jumpCooldown = Math.max(0, player.jumpCooldown - dt);
  player.driftHopTimer = Math.max(0, (player.driftHopTimer || 0) - dt);
  player.landingTimer = Math.max(0, player.landingTimer - dt);
  player.liftDisabledTimer = Math.max(0, player.liftDisabledTimer - dt);
  player.lightningRodTimer = Math.max(0, player.lightningRodTimer - dt);
  player.shieldTimer = Math.max(0, player.shieldTimer - dt);
  player.magnetTimer = Math.max(0, player.magnetTimer - dt);
  player.perfectBoostTimer = Math.max(0, player.perfectBoostTimer - dt);
  player.polaritySwapTimer = Math.max(0, player.polaritySwapTimer - dt);
  const polarityReset = player.polaritySwapTimer <= 0;
  if (polarityReset) player.polarity = 1;
  player.transformTimer = Math.max(0, player.transformTimer - dt);
  player.planeBob += dt * 4;
  player.speed = player.velocity.dot(forward);

  return {
    boostExpired,
    planeBob: player.planeBob,
    polarityReset,
    speed: player.speed,
  };
};

export const applyBoost = ({
  forward,
  impulse,
  racer,
  seconds,
  source = null,
  tier = 1,
  vehicle,
}) => {
  if (!racer || !vehicle) return null;
  racer.boostTimer = Math.max(racer.boostTimer || 0, seconds);
  racer.boostTier = Math.max(racer.boostTier || 0, tier);
  racer.boostSource = source || racer.boostSource || null;

  if (racer.velocity) racer.velocity.addScaledVector(forward, impulse);
  else if (typeof racer.speed === 'number') racer.speed += impulse;

  const limit = vehicle.boostMax + (racer.bananas || 0) * 0.8;
  if (racer.velocity && racer.velocity.length() > limit) racer.velocity.setLength(limit);
  else if (typeof racer.speed === 'number') racer.speed = Math.min(racer.speed, limit);

  return {
    boostSource: racer.boostSource,
    boostTier: racer.boostTier,
    boostTimer: racer.boostTimer,
    limit,
  };
};

export const resolveBoostPadForFrame = ({
  activationDistance = 5.7,
  controlsThrottle = 0,
  cooldownSeconds = 1.2,
  distance = Infinity,
  dt = 0,
  minSpeed = 6,
  speed = 0,
  zipper,
} = {}) => {
  if (!zipper) {
    return {
      activated: false,
      cooldown: 0,
    };
  }

  zipper.cooldown = Math.max(0, zipper.cooldown - dt);
  const activated = zipper.cooldown <= 0 && distance < activationDistance && speed > minSpeed;
  if (!activated) {
    return {
      activated: false,
      cooldown: zipper.cooldown,
    };
  }

  const perfect = controlsThrottle < 0.24;
  zipper.cooldown = cooldownSeconds;

  return {
    activated: true,
    boost: {
      impulse: perfect ? 22 : 14,
      seconds: perfect ? 1.36 : 0.82,
      source: 'pad',
      tier: perfect ? 3 : 2,
    },
    cooldown: zipper.cooldown,
    perfect,
    perfectBoostTimer: perfect ? 1.1 : 0,
  };
};

export const resolveFlightGateForFrame = ({
  altitudeTolerance = 6.5,
  cooldownSeconds = 1.75,
  distance = Infinity,
  dt = 0,
  gate = null,
  isPlane = false,
  playerAltitude = 0,
  roadWidth = 0,
} = {}) => {
  if (!gate) {
    return {
      activated: false,
      cooldown: 0,
      reason: 'missing-gate',
    };
  }

  gate.cooldown = Math.max(0, gate.cooldown - dt);
  const activationDistance = Math.max(8.5, roadWidth * 0.25);
  const altitudeDelta = Math.abs(playerAltitude - gate.altitude);
  const activated = isPlane && gate.cooldown <= 0 && distance < activationDistance && altitudeDelta < altitudeTolerance;

  if (!activated) {
    return {
      activated: false,
      altitudeDelta,
      cooldown: gate.cooldown,
      reason: !isPlane
        ? 'not-plane'
        : gate.cooldown > 0
          ? 'cooldown'
          : distance >= activationDistance
            ? 'distance'
            : 'altitude',
    };
  }

  gate.cooldown = cooldownSeconds;
  return {
    activated: true,
    altitudeDelta,
    boost: {
      impulse: 8.5,
      seconds: 0.5,
      source: 'pad',
      tier: 1,
    },
    cooldown: gate.cooldown,
    reason: null,
  };
};
