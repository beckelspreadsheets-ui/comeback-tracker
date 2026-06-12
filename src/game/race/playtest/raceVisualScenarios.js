import * as THREE from 'three';

const defaultNormalizedSpeedFor = (speed, topSpeed) => {
  if (!Number.isFinite(speed) || !Number.isFinite(topSpeed) || topSpeed <= 0) return 0;
  return Math.min(1.4, Math.max(0, speed / topSpeed));
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const VISUAL_KART_MANUAL_SCENARIOS = {
  acceleration: 'acceleration',
  boostPadMechanics: 'boost-pad-mechanics',
  braking: 'braking',
  collisionMechanics: 'collision-mechanics',
  driftMechanics: 'drift-mechanics',
  itemBoxMechanics: 'item-box-mechanics',
  offroadSlowdown: 'offroad-slowdown',
  reverse: 'reverse',
  steeringHighSpeed: 'steering-high-speed',
  steeringLowSpeed: 'steering-low-speed',
  stuckRecovery: 'stuck-recovery',
};

export const visualKartScenarioMatches = (playtest, scenario) =>
  Boolean(playtest?.enabled && playtest.mode === 'visual-kart' && playtest.visualScenario === scenario);

export const steeringScenarioSpeedRatio = (scenario) => {
  if (scenario === VISUAL_KART_MANUAL_SCENARIOS.steeringLowSpeed) return 0.3;
  if (scenario === VISUAL_KART_MANUAL_SCENARIOS.steeringHighSpeed) return 0.8;
  return null;
};

export const visualScenarioUsesHeadingCamera = (playtest) =>
  visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.driftMechanics) ||
  visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.steeringLowSpeed) ||
  visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.steeringHighSpeed);

export const manualVisualScenarioFlags = (playtest) => ({
  acceleration: visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.acceleration),
  boostPadMechanics: visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.boostPadMechanics),
  braking: visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.braking),
  collisionMechanics: visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.collisionMechanics),
  driftMechanics: visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.driftMechanics),
  itemBoxMechanics: visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.itemBoxMechanics),
  offroadSlowdown: visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.offroadSlowdown),
  reverse: visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.reverse),
  steering: visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.steeringLowSpeed) ||
    visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.steeringHighSpeed),
  stuckRecovery: visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.stuckRecovery),
});

export const manualVisualScenarioIsActive = (playtest) => {
  const flags = manualVisualScenarioFlags(playtest);
  return (
    flags.acceleration ||
    flags.boostPadMechanics ||
    flags.braking ||
    flags.collisionMechanics ||
    flags.driftMechanics ||
    flags.itemBoxMechanics ||
    flags.offroadSlowdown ||
    flags.reverse ||
    flags.steering ||
    flags.stuckRecovery
  );
};

export const manualVisualScenarioPrimedKey = (scenario) => {
  switch (scenario) {
    case VISUAL_KART_MANUAL_SCENARIOS.acceleration:
      return 'accelerationPrimed';
    case VISUAL_KART_MANUAL_SCENARIOS.boostPadMechanics:
      return 'boostPadMechanicsPrimed';
    case VISUAL_KART_MANUAL_SCENARIOS.braking:
      return 'brakingPrimed';
    case VISUAL_KART_MANUAL_SCENARIOS.collisionMechanics:
      return 'collisionMechanicsPrimed';
    case VISUAL_KART_MANUAL_SCENARIOS.driftMechanics:
      return 'driftMechanicsPrimed';
    case VISUAL_KART_MANUAL_SCENARIOS.itemBoxMechanics:
      return 'itemBoxMechanicsPrimed';
    case VISUAL_KART_MANUAL_SCENARIOS.offroadSlowdown:
      return 'offroadSlowdownPrimed';
    case VISUAL_KART_MANUAL_SCENARIOS.reverse:
      return 'reversePrimed';
    case VISUAL_KART_MANUAL_SCENARIOS.steeringHighSpeed:
    case VISUAL_KART_MANUAL_SCENARIOS.steeringLowSpeed:
      return 'steeringPrimed';
    case VISUAL_KART_MANUAL_SCENARIOS.stuckRecovery:
      return 'stuckRecoveryPrimed';
    default:
      return null;
  }
};

export const manualVisualScenarioIsPrimed = (playtest) => {
  if (!playtest?.enabled || playtest.mode !== 'visual-kart') return false;
  const key = manualVisualScenarioPrimedKey(playtest.visualScenario);
  return Boolean(key && playtest[key]);
};

export const resetKartPlayerForVisualScenario = ({
  player,
  position = null,
  sample,
  setVehicleMode,
  vehicle,
  velocityRatio = 0,
} = {}) => {
  if (!player || !sample) return null;
  setVehicleMode?.(player, 'kart', { force: true });
  player.bananas = 0;
  player.boostTimer = 0;
  player.boostTier = 0;
  player.boostSource = null;
  player.driftActive = false;
  player.driftCharge = 0;
  player.hitTimer = 0;
  player.jumpHeight = 0;
  player.jumpVelocity = 0;
  player.progress = sample.progress;
  player.position.copy(position || sample.point);
  player.heading = Math.atan2(sample.tangent.x, sample.tangent.z);
  player.steerInput = 0;
  player.velocity.copy(sample.tangent).multiplyScalar((vehicle?.maxSpeed || 1) * velocityRatio);
  return player;
};

export const primeVisualKartScenario = ({
  collisionCircles = [],
  compiled,
  normalizedSpeedFor = defaultNormalizedSpeedFor,
  playtest,
  race,
  setVehicleMode,
  vehicles,
  visualStats,
} = {}) => {
  if (!playtest || !race?.player || !compiled || !vehicles?.kart || !visualStats) return null;

  const player = race.player;
  const vehicle = vehicles.kart;
  const startProgress = compiled.startProgress || 0.012;

  if (visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.stuckRecovery)) {
    if (playtest.stuckRecoveryPrimed) return VISUAL_KART_MANUAL_SCENARIOS.stuckRecovery;

    setVehicleMode?.(player, 'kart', { force: true });
    player.boostTimer = 0;
    player.driftActive = false;
    player.driftCharge = 0;
    player.driftDirection = 0;
    player.hitTimer = 1.35;
    player.jumpHeight = 0;
    player.jumpVelocity = 0;
    player.stuckRecoveryCooldown = 0;
    player.stuckTimer = 0;
    player.velocity.set(0, 0, 0);
    if (!player.stuckProbePosition) player.stuckProbePosition = player.position.clone();
    player.stuckProbePosition.copy(player.position);
    playtest.stuckRecoveryPrimed = true;
    return VISUAL_KART_MANUAL_SCENARIOS.stuckRecovery;
  }

  if (visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.acceleration)) {
    if (playtest.accelerationPrimed) return VISUAL_KART_MANUAL_SCENARIOS.acceleration;

    resetKartPlayerForVisualScenario({
      player,
      sample: compiled.pointAt(startProgress),
      setVehicleMode,
      vehicle,
      velocityRatio: 0,
    });
    race.zippers?.forEach((zipper) => {
      zipper.cooldown = 999;
    });
    visualStats.boostSeen = false;
    visualStats.boostSource = null;
    visualStats.boostSourcesSeen = {};
    visualStats.timeToSpeed80 = null;
    visualStats.timeToSpeed98 = null;
    playtest.accelerationPrimed = true;
    return VISUAL_KART_MANUAL_SCENARIOS.acceleration;
  }

  if (visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.braking)) {
    if (playtest.brakingPrimed) return VISUAL_KART_MANUAL_SCENARIOS.braking;

    resetKartPlayerForVisualScenario({
      player,
      sample: compiled.pointAt(startProgress),
      setVehicleMode,
      vehicle,
      velocityRatio: 1,
    });
    visualStats.brakingStartTime = null;
    visualStats.timeFromTopSpeedTo25 = null;
    playtest.brakingPrimed = true;
    return VISUAL_KART_MANUAL_SCENARIOS.braking;
  }

  if (visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.reverse)) {
    if (playtest.reversePrimed) return VISUAL_KART_MANUAL_SCENARIOS.reverse;

    resetKartPlayerForVisualScenario({
      player,
      sample: compiled.pointAt(startProgress),
      setVehicleMode,
      vehicle,
      velocityRatio: 0,
    });
    visualStats.reverseSpeedCapRatio = normalizedSpeedFor(vehicle.reverse || 0, vehicle.maxSpeed || 1);
    visualStats.reverseSpeedRatio = 0;
    visualStats.reverseTuningRatio = normalizedSpeedFor(vehicle.reverse || 0, vehicle.maxSpeed || 1);
    playtest.reversePrimed = true;
    return VISUAL_KART_MANUAL_SCENARIOS.reverse;
  }

  if (visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.boostPadMechanics)) {
    if (playtest.boostPadMechanicsPrimed) return VISUAL_KART_MANUAL_SCENARIOS.boostPadMechanics;

    const zipper = race.zippers?.find((entry) => Number.isFinite(entry.progress)) || race.zippers?.[0];
    const sample = compiled.pointAt(zipper?.progress ?? 0.095);
    resetKartPlayerForVisualScenario({
      player,
      position: sample.point.clone().addScaledVector(sample.tangent, -7.5),
      sample,
      setVehicleMode,
      vehicle,
      velocityRatio: 0.52,
    });
    if (zipper) zipper.cooldown = 0;
    visualStats.boostPadActivationDelay = null;
    visualStats.boostPadActivationTime = null;
    visualStats.boostPadProbeStartTime = race.time;
    visualStats.boostPadSpeedAfter = null;
    visualStats.boostPadSpeedBefore = null;
    visualStats.boostSeen = false;
    visualStats.boostSource = null;
    visualStats.boostSourcesSeen = {};
    playtest.boostPadCaptureProgress = ((zipper?.progress ?? 0.095) + 0.988) % 1;
    playtest.boostPadMechanicsPrimed = true;
    return VISUAL_KART_MANUAL_SCENARIOS.boostPadMechanics;
  }

  if (visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.collisionMechanics)) {
    if (playtest.collisionMechanicsPrimed) return VISUAL_KART_MANUAL_SCENARIOS.collisionMechanics;

    const collisionTarget =
      collisionCircles.find((circle) => {
        const circleRoad = compiled.nearest(circle.position);
        const circleRoadWidth = circleRoad.roadWidth || compiled.roadWidth;
        const corridorClearance = circleRoad.distance - circleRoadWidth * 0.5;
        return Math.min(circle.radius || 0, Math.max(0, corridorClearance - 2.5)) > 2.5;
      }) || collisionCircles[0];
    const fallbackSample = compiled.pointAt(startProgress);
    const nearest = compiled.nearest(collisionTarget?.position || fallbackSample.point);
    const normal =
      collisionTarget?.position
        ?.clone()
        .sub(nearest.point)
        .setY(0)
        .normalize() || new THREE.Vector3(1, 0, 0);
    if (!Number.isFinite(normal.x) || normal.lengthSq() < 0.1) normal.set(1, 0, 0);
    const tangent = nearest.tangent?.clone?.().setY(0).normalize() || new THREE.Vector3(-normal.z, 0, normal.x);
    const effectiveRadius = Math.min(
      collisionTarget?.radius || 4,
      Math.max(0, (nearest.distance || 0) - (nearest.roadWidth || compiled.roadWidth) * 0.5 - 2.5)
    );
    const collisionRadius = Math.max(5.7, effectiveRadius + 3.2);
    setVehicleMode?.(player, 'kart', { force: true });
    player.bananas = 0;
    player.boostTimer = 0;
    player.boostTier = 0;
    player.boostSource = null;
    player.driftActive = false;
    player.driftCharge = 0;
    player.ghostTimer = 0;
    player.hitTimer = 0;
    player.invincibleTimer = 0;
    player.jumpHeight = 0;
    player.jumpVelocity = 0;
    player.progress = nearest.progress || startProgress;
    player.position.copy(collisionTarget?.position || nearest.point).addScaledVector(normal, collisionRadius - 0.8);
    player.heading = Math.atan2(tangent.x, tangent.z);
    player.steerInput = 0;
    player.velocity
      .copy(tangent)
      .multiplyScalar(vehicle.maxSpeed * 0.6)
      .addScaledVector(normal, -vehicle.maxSpeed * 0.22);
    visualStats.collisionCount = 0;
    visualStats.collisionImpactTime = null;
    visualStats.collisionSpeedAfter = null;
    visualStats.collisionSpeedBefore = null;
    visualStats.collisionSpeedLossRatio = null;
    playtest.collisionMechanicsPrimed = true;
    return VISUAL_KART_MANUAL_SCENARIOS.collisionMechanics;
  }

  if (visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.offroadSlowdown)) {
    if (playtest.offroadSlowdownPrimed) return VISUAL_KART_MANUAL_SCENARIOS.offroadSlowdown;

    const sample = compiled.pointAt(startProgress + 0.065);
    const normal = new THREE.Vector3(-sample.tangent.z, 0, sample.tangent.x);
    const roadWidth = compiled.nearest(sample.point)?.roadWidth || compiled.roadWidth;
    resetKartPlayerForVisualScenario({
      player,
      position: sample.point.clone().addScaledVector(normal, roadWidth * 0.64),
      sample,
      setVehicleMode,
      vehicle,
      velocityRatio: 0.9,
    });
    player.ghostTimer = 0;
    player.invincibleTimer = 0;
    visualStats.offroadSlowdownSeen = false;
    visualStats.offroadSpeedAfter = null;
    visualStats.offroadSpeedBefore = normalizedSpeedFor(player.velocity.length(), vehicle.maxSpeed || 1);
    visualStats.offroadSpeedLossRatio = null;
    playtest.offroadSlowdownPrimed = true;
    return VISUAL_KART_MANUAL_SCENARIOS.offroadSlowdown;
  }

  if (visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.itemBoxMechanics)) {
    if (playtest.itemBoxMechanicsPrimed) return VISUAL_KART_MANUAL_SCENARIOS.itemBoxMechanics;

    const balloon = race.balloons?.find((entry) => Number.isFinite(entry.progress)) || race.balloons?.[0];
    const sample = compiled.pointAt(balloon?.progress ?? 0.08);
    resetKartPlayerForVisualScenario({
      player,
      position: (balloon?.position || sample.point).clone().addScaledVector(sample.tangent, -6.8),
      sample,
      setVehicleMode,
      vehicle,
      velocityRatio: 0.48,
    });
    player.doubleSlotUses = 0;
    player.heldBalloon = null;
    player.heldItem = null;
    player.secondaryHeldItem = null;
    if (balloon) balloon.cooldown = 0;
    visualStats.itemBoxPickupDelay = null;
    visualStats.itemBoxPickupKey = null;
    visualStats.itemBoxPickupTime = null;
    visualStats.itemBoxProbeStartTime = race.time;
    visualStats.itemBoxSourceType = null;
    playtest.itemBoxMechanicsPrimed = true;
    return VISUAL_KART_MANUAL_SCENARIOS.itemBoxMechanics;
  }

  if (visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.driftMechanics)) {
    if (playtest.driftMechanicsPrimed) return VISUAL_KART_MANUAL_SCENARIOS.driftMechanics;

    resetKartPlayerForVisualScenario({
      player,
      sample: compiled.pointAt(startProgress),
      setVehicleMode,
      vehicle,
      velocityRatio: 0.62,
    });
    player.driftDirection = 0;
    player.driftHopTimer = 0;
    player.jumpCooldown = 0;
    visualStats.boostSeen = false;
    visualStats.boostSource = null;
    visualStats.boostSourcesSeen = {};
    visualStats.driftHopDuration = null;
    visualStats.driftHopStartCount = 0;
    visualStats.driftHopStartTime = null;
    visualStats.driftStartCount = 0;
    visualStats.driftTierSeen = 0;
    playtest.driftMechanicsPrimed = true;
    return VISUAL_KART_MANUAL_SCENARIOS.driftMechanics;
  }

  const speedRatio = steeringScenarioSpeedRatio(playtest.visualScenario);
  if (playtest.mode === 'visual-kart' && speedRatio !== null) {
    if (playtest.steeringPrimed) return playtest.visualScenario;

    resetKartPlayerForVisualScenario({
      player,
      sample: compiled.pointAt(startProgress),
      setVehicleMode,
      vehicle,
      velocityRatio: speedRatio,
    });
    visualStats.steeringStartHeading = player.heading;
    visualStats.steeringStartTime = race.time;
    visualStats.steeringTurn90Time = null;
    visualStats.steeringTurnDegrees = 0;
    playtest.steeringPrimed = true;
    return playtest.visualScenario;
  }

  return null;
};

export const applyVisualKartScenarioFrame = ({
  compiled,
  normalizedSpeedFor = defaultNormalizedSpeedFor,
  playtest,
  race,
  recordSteeringTurn90 = null,
  vehicles,
  visualStats,
} = {}) => {
  if (!playtest || !race?.player || !compiled || !vehicles?.kart || !visualStats) return null;

  const player = race.player;
  const vehicle = vehicles.kart;
  const startProgress = compiled.startProgress || 0.012;
  const forward = () => new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));

  if (visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.acceleration)) {
    return VISUAL_KART_MANUAL_SCENARIOS.acceleration;
  }

  if (visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.reverse)) {
    const reverseForward = forward();
    const reverseRatio = normalizedSpeedFor(
      Math.max(0, -player.velocity.dot(reverseForward)),
      vehicle.maxSpeed || 1
    );
    visualStats.reverseSpeedRatio = Math.max(visualStats.reverseSpeedRatio || 0, reverseRatio);
    visualStats.reverseSpeedCapRatio = normalizedSpeedFor(vehicle.reverse || 0, vehicle.maxSpeed || 1);
    visualStats.reverseTuningRatio = normalizedSpeedFor(vehicle.reverse || 0, vehicle.maxSpeed || 1);
    return VISUAL_KART_MANUAL_SCENARIOS.reverse;
  }

  if (visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.boostPadMechanics)) {
    if (visualStats.boostPadActivationTime !== null) {
      const zipper = race.zippers?.find((entry) => Number.isFinite(entry.progress)) || race.zippers?.[0];
      const padProgress = zipper?.progress ?? 0.095;
      const padSample = compiled.pointAt(padProgress);
      const captureProgress =
        Number.isFinite(playtest.boostPadCaptureProgress)
          ? playtest.boostPadCaptureProgress
          : (padProgress + 0.988) % 1;
      const captureSample = compiled.pointAt(captureProgress);
      const padTangent = (zipper?.tangent?.clone?.() || padSample.tangent.clone()).setY(0).normalize();
      const padPosition = zipper?.position?.clone?.() || padSample.point.clone();
      player.progress = captureSample.progress;
      player.position.copy(padPosition).addScaledVector(padTangent, -7.2);
      player.heading = Math.atan2(padTangent.x, padTangent.z);
      player.steerInput = 0;
      player.boostTimer = Math.max(player.boostTimer, 0.55);
      player.boostSource = 'pad';
      player.velocity.copy(padTangent).multiplyScalar((vehicle.maxSpeed || 1) * 0.86);
      if (zipper) zipper.cooldown = 0;
    }
    return VISUAL_KART_MANUAL_SCENARIOS.boostPadMechanics;
  }

  if (visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.braking)) {
    if (visualStats.timeFromTopSpeedTo25 !== null) {
      player.velocity.copy(forward()).multiplyScalar((vehicle.maxSpeed || 1) * 0.25);
    }
    return VISUAL_KART_MANUAL_SCENARIOS.braking;
  }

  if (visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.collisionMechanics)) {
    if (visualStats.collisionImpactTime !== null) {
      const captureSample = compiled.pointAt(startProgress + 0.035);
      player.progress = captureSample.progress;
      player.position.copy(captureSample.point);
      player.heading = Math.atan2(captureSample.tangent.x, captureSample.tangent.z);
      player.steerInput = 0;
      const captureSpeed = Math.max(0.62, visualStats.collisionSpeedAfter || 0.3);
      player.velocity.copy(captureSample.tangent).multiplyScalar((vehicle.maxSpeed || 1) * captureSpeed);
    }
    return VISUAL_KART_MANUAL_SCENARIOS.collisionMechanics;
  }

  if (visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.driftMechanics)) {
    const driftBoostCaptured = Boolean(visualStats.boostSourcesSeen?.drift);
    const minimumDriftSpeed = (vehicle.maxSpeed || 1) * (driftBoostCaptured ? 0.86 : 0.56);
    if (driftBoostCaptured) {
      const captureSample = compiled.pointAt(startProgress + 0.045);
      player.boostTimer = Math.max(player.boostTimer, 0.45);
      player.boostSource = 'drift';
      player.progress = captureSample.progress;
      player.position.copy(captureSample.point);
      player.heading = Math.atan2(captureSample.tangent.x, captureSample.tangent.z);
      player.steerInput = 0;
      player.velocity.copy(captureSample.tangent).multiplyScalar(minimumDriftSpeed);
    }
    if (player.velocity.length() < minimumDriftSpeed) player.velocity.setLength(minimumDriftSpeed);
    return VISUAL_KART_MANUAL_SCENARIOS.driftMechanics;
  }

  if (visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.offroadSlowdown)) {
    const nearest = compiled.nearest(player.position);
    const roadWidth = nearest.roadWidth || compiled.roadWidth;
    const offroad = nearest.distance > roadWidth * 0.52 && player.jumpHeight <= 0.05;
    if (offroad && visualStats.offroadSpeedAfter === null) {
      const speedAfter = normalizedSpeedFor(player.velocity.length(), vehicle.maxSpeed || 1);
      visualStats.offroadSpeedAfter = speedAfter;
      visualStats.offroadSpeedLossRatio =
        visualStats.offroadSpeedBefore > 0
          ? Number(
              clamp(
                (visualStats.offroadSpeedBefore - speedAfter) / visualStats.offroadSpeedBefore,
                0,
                1
              ).toFixed(3)
            )
          : null;
    }
    if (offroad) {
      player.heading = Math.atan2(nearest.tangent.x, nearest.tangent.z);
      player.steerInput = 0;
      player.velocity
        .copy(nearest.tangent)
        .multiplyScalar((vehicle.maxSpeed || 1) * (vehicle.offroad || 0.58));
    }
    return VISUAL_KART_MANUAL_SCENARIOS.offroadSlowdown;
  }

  if (visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.itemBoxMechanics)) {
    const approachSpeed = (vehicle.maxSpeed || 1) * 0.52;
    if (visualStats.itemBoxPickupTime === null && player.velocity.length() < approachSpeed) {
      player.velocity.copy(forward()).multiplyScalar(approachSpeed);
    }
    if (visualStats.itemBoxPickupTime !== null) {
      if (!Number.isFinite(playtest.itemBoxCaptureProgress)) playtest.itemBoxCaptureProgress = player.progress;
      const captureSample = compiled.pointAt(playtest.itemBoxCaptureProgress);
      player.progress = captureSample.progress;
      player.position.copy(captureSample.point);
      player.heading = Math.atan2(captureSample.tangent.x, captureSample.tangent.z);
      player.steerInput = 0;
      player.velocity.copy(captureSample.tangent).multiplyScalar((vehicle.maxSpeed || 1) * 0.68);
    }
    return VISUAL_KART_MANUAL_SCENARIOS.itemBoxMechanics;
  }

  const steeringSpeedRatio = steeringScenarioSpeedRatio(playtest.visualScenario);
  if (playtest.mode === 'visual-kart' && steeringSpeedRatio !== null) {
    recordSteeringTurn90?.(visualStats, race.time, player.heading, true);
    if (visualStats.steeringTurn90Time !== null) {
      if (!playtest.steeringHoldPosition) playtest.steeringHoldPosition = player.position.clone();
      const captureSample = compiled.pointAt(startProgress + 0.035);
      player.progress = captureSample.progress;
      player.position.copy(captureSample.point);
      player.heading = Math.atan2(captureSample.tangent.x, captureSample.tangent.z);
      player.steerInput = 0;
      player.velocity.copy(captureSample.tangent).multiplyScalar((vehicle.maxSpeed || 1) * steeringSpeedRatio);
    } else {
      player.velocity.copy(forward()).multiplyScalar((vehicle.maxSpeed || 1) * steeringSpeedRatio);
    }
    return playtest.visualScenario;
  }

  if (visualKartScenarioMatches(playtest, VISUAL_KART_MANUAL_SCENARIOS.stuckRecovery)) {
    return VISUAL_KART_MANUAL_SCENARIOS.stuckRecovery;
  }

  return null;
};
