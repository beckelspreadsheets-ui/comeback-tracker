// LEGACY - NOT THE SHIPPED GAME. Editing this file changes nothing the owner
// ever sees. The shipped VFX are ./raceParticles.js (drift spray, skid decals,
// boost speed-lines, coin/spin-out bursts) — a different module, despite the
// similar name. Do not confuse the two when editing.
//
// DO NOT DELETE. Not orphaned: ./syncRaceMeshes.js imports these helpers, and
// syncRaceMeshes is itself pulled in by scripts/race-content-playtest.mjs
// (npm run test:race) and src/game/ArcadeRace3D.jsx. See
// ../raceSceneRuntime.js for the full legacy-stack reachability graph.

export const DRIFT_SPARK_COLORS = {
  charge: '#f7fbff',
  tier1: '#46d9ef',
  tier2: '#ffd34f',
  tier3: '#c879ff',
};

export const DRIFT_TRAIL_COLORS = {
  charge: '#f7fbff',
  tier1: '#46d9ef',
  tier2: '#49d9ff',
  tier3: '#c879ff',
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const vectorLength = (value) => {
  if (!value) return 0;
  if (typeof value.length === 'function') return value.length();
  if (Number.isFinite(value.length)) return value.length;
  return Math.hypot(value.x || 0, value.y || 0, value.z || 0);
};

export const driftSparkTierForCharge = (charge = 0, driftTune = {}) =>
  (driftTune.sparkChargeTime || []).reduce(
    (bestTier, chargeTime, index) => (charge >= chargeTime ? index + 1 : bestTier),
    0
  );

export const driftSparkColorForTier = (tier = 0) => {
  if (tier >= 3) return DRIFT_SPARK_COLORS.tier3;
  if (tier === 2) return DRIFT_SPARK_COLORS.tier2;
  if (tier === 1) return DRIFT_SPARK_COLORS.tier1;
  return DRIFT_SPARK_COLORS.charge;
};

export const driftTrailColorForTier = (tier = 0) => {
  if (tier >= 3) return DRIFT_TRAIL_COLORS.tier3;
  if (tier === 2) return DRIFT_TRAIL_COLORS.tier2;
  if (tier === 1) return DRIFT_TRAIL_COLORS.tier1;
  return DRIFT_TRAIL_COLORS.charge;
};

export const driftSparkFrameFor = ({ now = 0, phase = 0, side = 1, sparkIndex = 0, tier = 0 } = {}) => ({
  color: driftSparkColorForTier(tier),
  emissiveIntensity: 0.72 + tier * 0.18,
  scale: 0.78 + tier * 0.18 + Math.sin(now / 56 + phase) * 0.16,
  x: side * (3.8 + (sparkIndex % 4) * 0.22 + Math.sin(now / 92 + sparkIndex) * 0.22),
  y: 0.82 + (sparkIndex % 4) * 0.2 + Math.sin(now / 72 + sparkIndex) * 0.16,
});

export const driftTrailFrameFor = ({ now = 0, side = 1, trailIndex = 0, tier = 0 } = {}) => {
  const tierScale = 1 + tier * 0.12;
  const pulse = 1 + Math.sin(now / 88 + trailIndex) * 0.06;
  return {
    color: driftTrailColorForTier(tier),
    opacity: clamp(0.34 + tier * 0.08 + Math.sin(now / 110 + trailIndex) * 0.04, 0.28, 0.62),
    scaleX: (1.55 + tier * 0.16) * pulse,
    scaleZ: 1.35 * tierScale,
    x: side * (2.65 + tier * 0.1),
    y: 0.22,
    z: -6.35 - tier * 0.28,
  };
};

export const applyDriftSparkGroupFrame = ({ active = false, charge = 0, driftTune, group, now = 0 } = {}) => {
  if (!group) return 0;
  const tier = driftSparkTierForCharge(charge, driftTune);
  group.visible = active;
  if (!active) {
    group.children.forEach((child) => {
      if (child.userData?.kind === 'drift-trail-visual') child.visible = false;
    });
    group.scale.setScalar?.(0.001);
    return tier;
  }
  group.scale.setScalar?.(1);
  group.children.forEach((spark, sparkIndex) => {
    if (spark.userData?.kind === 'drift-trail-visual') {
      const frame = driftTrailFrameFor({
        now,
        side: spark.userData?.side || 1,
        tier,
        trailIndex: spark.userData?.trailIndex || 0,
      });
      spark.visible = true;
      spark.material.color.set(frame.color);
      if (spark.material.emissive) spark.material.emissive.set(frame.color);
      spark.material.opacity = frame.opacity;
      spark.scale.set(frame.scaleX, 1, frame.scaleZ);
      spark.position.set(frame.x, frame.y, frame.z);
      return;
    }
    const frame = driftSparkFrameFor({
      now,
      phase: spark.userData?.phase || 0,
      side: spark.userData?.side || 1,
      sparkIndex,
      tier,
    });
    spark.material.color.set(frame.color);
    spark.material.emissive.set(frame.color);
    spark.material.emissiveIntensity = frame.emissiveIntensity;
    spark.scale.setScalar(frame.scale);
    spark.position.x = frame.x;
    spark.position.y = frame.y;
  });
  return tier;
};

export const boostFlamePresentationFrameFor = ({ boostTimer = 0, now = 0, visible = null } = {}) => {
  const active = visible ?? (boostTimer || 0) > 0.02;
  return {
    burstHaloOpacity: active ? clamp(0.68 + Math.sin(now / 80) * 0.12, 0.54, 0.84) : 0,
    burstHaloRotationZDelta: active ? 0.09 : 0,
    burstScale: active ? 1 + Math.sin(now / 72) * 0.08 : 1,
    burstScaleZ: active ? 1.08 + Math.sin(now / 68) * 0.12 : 1,
    burstStreakOpacity: active ? clamp(0.62 + Math.sin(now / 92) * 0.12, 0.48, 0.8) : 0,
    visible: active,
  };
};

export const applyBoostFlameGroupFrame = ({ boostTimer = 0, group, now = 0, visible = null } = {}) => {
  const frame = boostFlamePresentationFrameFor({ boostTimer, now, visible });
  if (group) {
    group.visible = frame.visible;
    group.children.forEach((child) => {
      if (child.userData?.kind === 'boost-burst-streak') {
        child.visible = frame.visible;
        child.scale.z = frame.burstScaleZ;
        if (child.material) child.material.opacity = frame.burstStreakOpacity;
      } else if (child.userData?.kind === 'boost-burst-halo') {
        child.visible = frame.visible;
        child.rotation.z += frame.burstHaloRotationZDelta;
        child.scale.setScalar(frame.burstScale);
        if (child.material) child.material.opacity = frame.burstHaloOpacity;
      }
    });
  }
  return frame;
};

export const shieldPresentationFrameFor = ({ now = 0, shieldTimer = 0 } = {}) => {
  const visible = (shieldTimer || 0) > 0.02;
  const pulse = visible ? 1.06 + Math.sin(now / 130) * 0.055 : 1;
  return {
    burstOpacity: visible ? clamp(0.72 + Math.sin(now / 72) * 0.16, 0.56, 0.96) : 0,
    burstRotationYDelta: visible ? 0.08 : 0,
    burstScale: visible ? 1.02 + Math.sin(now / 84) * 0.12 : 1,
    opacity: visible ? clamp(0.32 + Math.min(shieldTimer, 1.2) * 0.12, 0.32, 0.5) : 0,
    ringOpacity: visible ? clamp(0.74 + Math.sin(now / 90) * 0.16, 0.56, 0.92) : 0,
    ringRotationYDelta: visible ? 0.045 : 0,
    scale: pulse,
    visible,
  };
};

export const applyShieldGroupFrame = ({ group, now = 0, shieldTimer = 0 } = {}) => {
  const frame = shieldPresentationFrameFor({ now, shieldTimer });
  if (!group) return frame;
  group.visible = frame.visible;
  if (!frame.visible) {
    group.scale.setScalar(0.001);
    group.children.forEach((child) => {
      if (child.userData?.kind === 'shield-burst-crown') child.visible = false;
    });
    return frame;
  }
  group.scale.setScalar(frame.scale);
  const [shell, ring] = group.children;
  if (shell?.material) shell.material.opacity = frame.opacity;
  if (ring) {
    ring.rotation.y += frame.ringRotationYDelta;
    if (ring.material) ring.material.opacity = frame.ringOpacity;
  }
  const burstGroup = group.children.find((child) => child.userData?.kind === 'shield-burst-crown');
  if (burstGroup) {
    burstGroup.visible = true;
    burstGroup.rotation.y += frame.burstRotationYDelta;
    burstGroup.scale.setScalar(frame.burstScale);
    burstGroup.children.forEach((child, index) => {
      if (child.material) child.material.opacity = index === 0 ? frame.burstOpacity * 0.78 : frame.burstOpacity;
      if (child.userData?.kind === 'shield-burst-spark') child.rotation.y -= frame.burstRotationYDelta * 1.7;
    });
  }
  return frame;
};

export const playerVehiclePresentationFrameFor = ({
  dt = 0,
  player = {},
  vehicle = {},
} = {}) => {
  const isPlane = player.vehicleMode === 'plane';
  const speedRatio = clamp(vectorLength(player.velocity) / (vehicle.maxSpeed || 1), 0, 1);
  const height =
    (isPlane ? player.flightAltitude || 0 : (vehicle.hover || 0) + (player.jumpHeight || 0)) +
    (isPlane ? Math.sin(player.planeBob || 0) * 0.35 : 0);
  const boostFlame = boostFlamePresentationFrameFor({ boostTimer: player.boostTimer });

  return {
    boostFlame,
    boostFlameVisible: boostFlame.visible,
    frontWheelRotationY: (player.steerInput || 0) * 0.36,
    rotationX: isPlane
      ? player.flightPitch || 0
      : (player.driftActive ? -(player.driftDirection || 0) * 0.08 : 0) + ((player.jumpHeight || 0) > 0 ? 0.08 : 0),
    rotationY: player.heading || 0,
    rotationZ: isPlane ? player.flightRoll || 0 : -speedRatio * 0.1,
    wheelRotationXDelta: (player.speed || 0) * dt * 2.2,
    y: 0.48 + height,
  };
};

export const switchRingFrameFor = ({ dt = 0, transformTimer = 0 } = {}) => {
  const visible = transformTimer > 0;
  return {
    opacity: visible ? clamp(transformTimer / 0.5, 0.2, 0.8) : 0,
    rotationZDelta: visible ? dt * 8 : 0,
    scale: visible ? 1 + (0.5 - transformTimer) * 0.8 : 1,
    visible,
  };
};

export const rivalVehiclePresentationFrameFor = ({
  defaultVehicle = 'kart',
  dt = 0,
  flightCruiseAltitude = 17,
  now = 0,
  rival = {},
  sample = {},
} = {}) => {
  const tangent = sample.tangent || { x: 0, z: 1 };
  const vehicleMode = rival.vehicleMode || defaultVehicle;
  const altitude = vehicleMode === 'plane' ? flightCruiseAltitude : vehicleMode === 'hover' ? 1.25 : 0;
  const boostFlame = boostFlamePresentationFrameFor({ visible: false });

  return {
    boostFlame,
    boostFlameVisible: boostFlame.visible,
    rotationY: Math.atan2(tangent.x || 0, tangent.z || 0),
    rotationZ:
      vehicleMode === 'plane'
        ? Math.sin(rival.wobble || 0) * 0.16
        : (rival.hitTimer || 0) > 0
        ? Math.sin(now / 70) * 0.18
        : 0,
    vehicleMode,
    wheelRotationXDelta: (rival.speed || 0) * dt * 1.6,
    y: 0.42 + altitude,
  };
};

export const trackBananaPresentationFrameFor = ({ banana = {}, dt = 0, index = 0, now = 0 } = {}) => ({
  rotationYDelta: dt * 1.8,
  visible: (banana.cooldown || 0) <= 0,
  y: 1.25 + Math.sin(now / 220 + index) * 0.16,
});

export const itemBoxPresentationFrameFor = ({ box = {}, dt = 0, index = 0, now = 0 } = {}) => ({
  rotationYDelta: dt * 0.9,
  visible: (box.cooldown || 0) <= 0,
  y: 3.5 + Math.sin(now / 280 + index) * 0.22,
});

export const boostPadPresentationFrameFor = ({ index = 0, zipper = {}, now = 0 } = {}) => {
  const cooling = (zipper.cooldown || 0) > 0.45;
  const pulse = 0.88 + Math.sin(now / 92 + index) * 0.12;
  return {
    chevronOpacity: cooling ? 0.58 : 0.82 + pulse * 0.14,
    chevronScaleY: cooling ? 0.92 : 1 + Math.sin(now / 80 + index) * 0.08,
    centerStripeOpacity: cooling ? 0.48 : 0.72,
    visualActive: true,
    visible: true,
  };
};

export const flightGatePresentationFrameFor = ({
  active = false,
  gate = {},
  index = 0,
  now = 0,
} = {}) => {
  const pulse = 1 + Math.sin(now / 180 + index) * 0.045;
  const cooling = (gate.cooldown || 0) > 0;
  return {
    glowOpacity: active ? (cooling ? 0.08 : 0.18) : 0.06,
    groupVisible: active || index % 3 === 0,
    ringOpacity: active ? (cooling ? 0.28 : 0.78) : 0.32,
    scale: cooling ? 1.12 : pulse,
    y: (gate.altitude || 0) + Math.sin(now / 360 + index) * 0.6,
  };
};

export const switchPadPresentationFrameFor = ({ dt = 0, index = 0, now = 0, pad = {} } = {}) => {
  const cooling = (pad.cooldown || 0) > 0;
  return {
    rotationYDelta: dt * (cooling ? 2.4 : 0.7),
    scale: cooling ? 0.82 : 1 + Math.sin(now / 180 + index) * 0.04,
  };
};

export const trackHazardPresentationFrameFor = ({
  active = false,
  dt = 0,
  hazard = {},
  index = 0,
  now = 0,
} = {}) => ({
  opacity: active ? 0.86 : 0.38,
  rotationYDelta: dt * 0.8,
  scale: active ? 1.05 + Math.sin(now / 140 + index) * 0.06 : 0.72,
  visible: active || (hazard.eventPulse || 0) > 0 || (hazard.telegraphTime || 0) > 0,
});

export const trapPresentationFrameFor = ({ hazard = {} } = {}) => ({
  opacity: clamp((hazard.life || 0) / 6, 0.15, 1),
  visible: (hazard.life || 0) > 0,
});

export const droppedBananaPresentationFrameFor = ({ banana = {}, dt = 0, now = 0 } = {}) => ({
  rotationYDelta: dt * 1.8,
  visible: (banana.life || 0) > 0,
  y: 1.08 + Math.sin(now / 180) * 0.08,
});
