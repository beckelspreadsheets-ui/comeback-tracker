import * as THREE from 'three';
import {
  applyBananaMagnetRivalPullForFrame,
  resolveItemBoxPickupForFrame,
  updateDroppedBananasForPlayer,
  updateTrackBananasForPlayer,
} from '../raceItems.js';
import {
  updateDroppedHazardsForFrame,
} from '../raceHazards.js';
import {
  DRIFT_TUNING,
  FLIGHT_ALTITUDE_LIMITS,
  VEHICLES,
} from './physics/kartTuning.js';
import {
  DRIFT_HOP_DURATION,
  applyLateralGripForFrame,
  applyGroundJumpForFrame,
  applyPositionBoundsForFrame,
  applyPlayerTimersForFrame,
  applyRoadAssistForFrame,
  applySpeedCapForFrame,
  applyStuckRecovery,
  applyTrackBoundaryForFrame,
  canActivateDrift,
  canStartDriftHop,
  driftChargeForFrame,
  driveForcesForFrame,
  headingDeltaForFrame,
  driftHopVelocityFor,
  driftReleaseForState,
  resolveFlightGateForFrame,
  resolvePlayerRivalBumpsForFrame,
  resolveBoostPadForFrame,
  surfaceOffroadForState,
  updateStuckRecoveryState,
} from './physics/kartPhysics.js';
import { normalizedSpeedFor } from './raceTelemetry.js';

const {
  cruise: FLIGHT_CRUISE_ALTITUDE,
  max: FLIGHT_MAX_ALTITUDE,
  min: FLIGHT_MIN_ALTITUDE,
} = FLIGHT_ALTITUDE_LIMITS;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const defaultDistance2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export const updateRacePlayerForFrame = ({
  addBoost = () => {},
  applyVehicleIntegration = () => {},
  bounds,
  collectBalloon = () => {},
  compiled,
  controls: rawControls = {},
  defaultVehicle = 'kart',
  distanceBetween = defaultDistance2D,
  dt = 0,
  hitPlayer = () => false,
  hitRival = () => false,
  race,
  resolveWorldCollisions = () => false,
  scoreRacer = () => 0,
  touchControls = null,
  updateLapProgress = () => {},
  vehicles = VEHICLES,
  visualStats = {},
} = {}) => {
  const player = race.player;
  const controls = {
    ...rawControls,
    steer: player.controlFlipTimer > 0 ? -rawControls.steer : rawControls.steer,
  };
  const vehicle = vehicles[player.vehicleMode] || vehicles.kart;
  const isPlane = player.vehicleMode === 'plane';
  player.layer = isPlane ? 'air' : player.vehicleMode === 'hover' ? 'hybrid' : 'ground';
  const nearest = compiled.nearest(player.position);
  updateLapProgress(player, nearest);
  player.steerInput += (controls.steer - player.steerInput) * clamp(dt * 11, 0, 1);

  const forward = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  const speed = player.velocity.length();
  const signedForwardSpeed = player.velocity.dot(forward);
  const activeRoadWidth = nearest.roadWidth || compiled.roadWidth;
  const offroad = surfaceOffroadForState({
    distance: nearest.distance,
    isPlane,
    jumpHeight: player.jumpHeight,
    roadWidth: activeRoadWidth,
  });
  const driftInputReady =
    !isPlane && controls.drift && Math.abs(player.steerInput) > 0.16 && speed > 12;
  const grounded = player.jumpHeight <= 0.02 && player.jumpVelocity <= 0.1;
  const driftHopReady = canStartDriftHop({
    driftActive: player.driftActive,
    driftHopTimer: player.driftHopTimer || 0,
    driftInputReady,
    grounded,
    isPlane,
    jumpCooldown: player.jumpCooldown,
  });

  if (!isPlane && controls.jump && !driftInputReady && player.jumpCooldown <= 0 && player.jumpHeight <= 0.02) {
    player.jumpVelocity = 18 + clamp(speed, 0, vehicle.maxSpeed) * 0.12;
    player.jumpCooldown = 0.46;
    player.velocity.addScaledVector(forward, speed > 2 ? 2.2 : 1.2);
  }
  if (driftHopReady) {
    player.jumpVelocity = Math.max(player.jumpVelocity, driftHopVelocityFor(speed, vehicle.maxSpeed));
    player.jumpCooldown = DRIFT_HOP_DURATION;
    player.driftHopTimer = DRIFT_HOP_DURATION;
    visualStats.driftHopDuration = DRIFT_HOP_DURATION;
    visualStats.driftHopStartCount += 1;
    if (visualStats.driftHopStartTime === null) visualStats.driftHopStartTime = Number(race.time.toFixed(3));
    player.velocity.addScaledVector(forward, speed > 2 ? 1.4 : 0.8);
  }
  if (!isPlane && touchControls) touchControls.jump = false;

  const driveForces = driveForcesForFrame({
    dt,
    forwardSpeed: signedForwardSpeed,
    hitTimer: player.hitTimer,
    speed,
    throttle: controls.throttle,
    vehicle,
  });
  player.hitTimer = driveForces.nextHitTimer;
  if (driveForces.dragMultiplier !== 1) player.velocity.multiplyScalar(driveForces.dragMultiplier);
  if (driveForces.forwardImpulse) player.velocity.addScaledVector(forward, driveForces.forwardImpulse);

  const driftCanStart = canActivateDrift({
    driftHopTimer: player.driftHopTimer || 0,
    driftInputReady,
    jumpHeight: player.jumpHeight,
  });
  if (!player.driftActive && driftCanStart) {
    player.driftActive = true;
    player.driftCharge = 0;
    player.driftDirection = Math.sign(player.steerInput) || 1;
    visualStats.driftStartCount += 1;
  } else {
    const driftTune = DRIFT_TUNING[player.vehicleMode] || DRIFT_TUNING.kart;
    const release = driftReleaseForState({
      charge: player.driftCharge,
      driftActive: player.driftActive,
      driftHeld: controls.drift,
      driftTune,
      speed,
    });
    if (release.shouldBoost) {
      addBoost(
        player,
        release.boostDuration,
        release.boostStrength,
        release.tier,
        release.source
      );
    }
    if (release.shouldRelease) {
      player.driftActive = false;
      player.driftCharge = 0;
      player.driftHopTimer = 0;
    }
  }

  if (player.driftActive) {
    player.driftCharge = driftChargeForFrame({
      charge: player.driftCharge,
      driftDirection: player.driftDirection,
      dt,
      speed,
      steerInput: player.steerInput,
      vehicle,
    });
  }

  applyLateralGripForFrame({
    dt,
    player,
    right,
    speed,
    vehicle,
  });

  player.heading += headingDeltaForFrame({
    controlsThrottle: controls.throttle,
    driftActive: player.driftActive,
    driftDirection: player.driftDirection,
    dt,
    isPlane,
    jumpHeight: player.jumpHeight,
    signedForwardSpeed,
    speed,
    steerInput: player.steerInput,
    vehicle,
    vehicleMode: player.vehicleMode,
  });

  applyRoadAssistForFrame({
    activeRoadWidth,
    controlsThrottle: controls.throttle,
    dt,
    isPlane,
    nearest,
    player,
    speed,
  });

  applyTrackBoundaryForFrame({
    activeRoadWidth,
    dt,
    isPlane,
    nearest,
    player,
  });

  applySpeedCapForFrame({
    forward,
    offroad,
    player,
    vehicle,
  });
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
    const groundJump = applyGroundJumpForFrame({
      dt,
      player,
    });
    if (groundJump.trickBoost) {
      addBoost(
        player,
        groundJump.trickBoost.seconds,
        groundJump.trickBoost.impulse,
        groundJump.trickBoost.tier,
        groundJump.trickBoost.source
      );
    }
  }
  applyPositionBoundsForFrame({
    bounds,
    dt,
    isPlane,
    player,
    roadWidth: compiled.roadWidth,
  });
  if (resolveWorldCollisions(player)) {
    race.cameraShakeTimer = Math.max(race.cameraShakeTimer, 0.12);
  }
  if (!player.stuckProbePosition) player.stuckProbePosition = player.position.clone();
  const stuckMovementDistance = distanceBetween(player.position, player.stuckProbePosition);
  const stuckRecovery = updateStuckRecoveryState({
    dt,
    grounded: player.jumpHeight <= 0.02,
    isPlane,
    movementDistance: stuckMovementDistance,
    recoveryCooldown: player.stuckRecoveryCooldown || 0,
    speed: player.velocity.length(),
    stuckTimer: player.stuckTimer || 0,
    throttle: controls.throttle,
  });
  player.stuckTimer = stuckRecovery.stuckTimer;
  player.stuckRecoveryCooldown = stuckRecovery.recoveryCooldown;
  if (stuckRecovery.recover) {
    applyStuckRecovery({
      activeRoadWidth,
      nearest,
      player,
      vehicle,
    });
    visualStats.stuckRecoveryCount += 1;
  }
  if (stuckRecovery.resetProbe) player.stuckProbePosition.copy(player.position);
  applyPlayerTimersForFrame({ dt, forward, player });

  updateTrackBananasForPlayer({
    bananas: race.bananas,
    dt,
    player,
  });
  race.droppedBananas = updateDroppedBananasForPlayer({
    bananas: race.droppedBananas,
    dt,
    player,
  }).activeBananas;

  race.balloons.forEach((balloon) => {
    const itemBoxPickup = resolveItemBoxPickupForFrame({
      box: balloon,
      distance: player.position.distanceTo(balloon.position),
      dt,
    });
    if (itemBoxPickup.picked) {
      collectBalloon(balloon);
    }
  });

  race.zippers.forEach((zipper) => {
    const boostPad = resolveBoostPadForFrame({
      controlsThrottle: controls.throttle,
      distance: player.position.distanceTo(zipper.position),
      dt,
      speed,
      zipper,
    });
    if (boostPad.activated) {
      const beforeSpeed = player.velocity.length();
      addBoost(player, boostPad.boost.seconds, boostPad.boost.impulse, boostPad.boost.tier, boostPad.boost.source);
      if (visualStats.boostPadActivationTime === null) {
        visualStats.boostPadActivationTime = Number(race.time.toFixed(3));
        visualStats.boostPadActivationDelay = Number(
          (race.time - (visualStats.boostPadProbeStartTime ?? race.time)).toFixed(3)
        );
        visualStats.boostPadSpeedBefore = normalizedSpeedFor(beforeSpeed, vehicle.maxSpeed || 1);
        visualStats.boostPadSpeedAfter = normalizedSpeedFor(player.velocity.length(), vehicle.maxSpeed || 1);
      }
      player.perfectBoostTimer = boostPad.perfectBoostTimer;
    }
  });

  race.flightGates.forEach((gate) => {
    const flightGate = resolveFlightGateForFrame({
      distance: distanceBetween(player.position, gate.position),
      dt,
      gate,
      isPlane,
      playerAltitude: player.flightAltitude,
      roadWidth: compiled.roadWidth,
    });
    if (flightGate.activated) {
      const { boost } = flightGate;
      addBoost(player, boost.seconds, boost.impulse, boost.tier, boost.source);
    }
  });

  applyBananaMagnetRivalPullForFrame({
    distanceBetween,
    dt,
    player,
    rivals: race.rivals,
    scoreRacer,
  });

  race.droppedHazards = updateDroppedHazardsForFrame({
    defaultVehicle,
    dt,
    hazards: race.droppedHazards,
    hitPlayer,
    hitRival,
    player: race.player,
    rivals: race.rivals,
  }).activeHazards;

  resolvePlayerRivalBumpsForFrame({
    distanceBetween,
    hitPlayer,
    hitRival,
    isPlane,
    player,
    rivals: race.rivals,
  });

  applyVehicleIntegration(dt);

  return {
    controls,
    isPlane,
    jumpQueued: false,
    nearest,
    player,
    vehicle,
  };
};
