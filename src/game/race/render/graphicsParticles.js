// Graphics overhaul — Phase 2 particle systems (visual-only).
// THREE.Points-based pools: one draw call per system. Physics triggers the
// emission (drift active, boost timer, kart speed) but these systems only
// READ race state — they never feed back into it. All three are preset-gated
// and fully absent on ?gfx=off / 'low' where noted.
//
// Systems:
//   - Drift smoke: soft billboards puffed off the rear wheels while drifting,
//     tinted toward the live drift tier color (hooks the existing tier read).
//   - Boost sparks: small bright embers sprayed behind the exhaust on boost /
//     mini-turbo, tinted to the banked tier (amber -> violet grammar).
//   - Ambient motes: a slow drifting volume of dust (CC) / snow (PV) around
//     the camera for atmosphere depth.
import * as THREE from 'three';

const SMOKE_COUNT = 90;
const SPARK_COUNT = 70;

// Round soft-puff sprite (canvas-generated, no asset bytes).
const makePuffTexture = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

// Small hard spark sprite (bright core, fast falloff).
const makeSparkTexture = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 15);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

// Generic CPU-integrated billboard pool. Each particle: pos, vel, life, size.
// One THREE.Points (one draw call). Dead particles park at y=-9999.
const createPointPool = ({ count, map, size, blending = THREE.NormalBlending, opacity = 1 }) => {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i += 1) positions[i * 3 + 1] = -9999;
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.PointsMaterial({
    map,
    size,
    transparent: true,
    opacity,
    depthWrite: false,
    blending,
    sizeAttenuation: true,
  });
  // Per-particle size via onBeforeCompile would be ideal; PointsMaterial has
  // a single size, so we bake size variation into the velocity/alpha instead
  // and keep one draw call (simplicity > per-particle size here).
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false; // particles roam the whole track
  return {
    points,
    positions,
    vel: new Float32Array(count * 3),
    life: new Float32Array(count), // remaining life (s); <=0 = dead
    maxLife: new Float32Array(count),
    count,
    cursor: 0,
  };
};

const spawn = (pool, x, y, z, vx, vy, vz, life) => {
  const i = pool.cursor;
  pool.cursor = (pool.cursor + 1) % pool.count;
  pool.positions[i * 3] = x;
  pool.positions[i * 3 + 1] = y;
  pool.positions[i * 3 + 2] = z;
  pool.vel[i * 3] = vx;
  pool.vel[i * 3 + 1] = vy;
  pool.vel[i * 3 + 2] = vz;
  pool.life[i] = life;
  pool.maxLife[i] = life;
};

const stepPool = (pool, dt, drag = 0.94, gravity = 0) => {
  const { positions, vel, life, count } = pool;
  for (let i = 0; i < count; i += 1) {
    if (life[i] <= 0) continue;
    life[i] -= dt;
    if (life[i] <= 0) {
      positions[i * 3 + 1] = -9999;
      continue;
    }
    vel[i * 3] *= drag;
    vel[i * 3 + 1] = vel[i * 3 + 1] * drag + gravity * dt;
    vel[i * 3 + 2] *= drag;
    positions[i * 3] += vel[i * 3] * dt;
    positions[i * 3 + 1] += vel[i * 3 + 1] * dt;
    positions[i * 3 + 2] += vel[i * 3 + 2] * dt;
  }
  pool.points.geometry.attributes.position.needsUpdate = true;
};

// Build all three systems. `trackKey` picks the ambient flavor + tint.
export const createGraphicsParticles = ({ gfx, trackKey }) => {
  const group = new THREE.Group();
  group.name = 'graphics-particles';
  const systems = {};

  if (gfx.particlesDriftSmoke) {
    systems.smoke = createPointPool({
      count: SMOKE_COUNT,
      map: makePuffTexture(),
      size: 2.6,
      opacity: 0.4,
    });
    group.add(systems.smoke.points);
  }
  if (gfx.particlesBoostSparks) {
    systems.sparks = createPointPool({
      count: SPARK_COUNT,
      map: makeSparkTexture(),
      size: 0.55,
      blending: THREE.AdditiveBlending,
      opacity: 0.9,
    });
    group.add(systems.sparks.points);
  }
  if (gfx.particlesAmbient && gfx.ambientParticleCount > 0) {
    systems.ambient = createPointPool({
      count: gfx.ambientParticleCount,
      map: makePuffTexture(),
      size: trackKey === 'penguin-village' ? 1.5 : 1.2,
      opacity: trackKey === 'penguin-village' ? 0.55 : 0.28,
    });
    // Seed the ambient volume in a box around the origin; it re-centers on
    // the camera each frame (see updateFrame).
    const { positions, count } = systems.ambient;
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 240;
      positions[i * 3 + 1] = Math.random() * 40 + 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 240;
    }
    systems.ambient.points.geometry.attributes.position.needsUpdate = true;
    group.add(systems.ambient.points);
  }

  const isSnow = trackKey === 'penguin-village';

  // Per-frame update. Reads race state for emission triggers only.
  //   drift:      { active, tier, position:{x,y,z}, heading }
  //   boost:      { active, tier }
  //   camPosition: THREE.Vector3 (ambient re-centering)
  const updateFrame = ({ dt = 0, drift = null, boost = null, camPosition = null, rng = Math.random } = {}) => {
    // --- Drift smoke: puff from both rear wheels while drifting. ---
    if (systems.smoke && drift?.active && drift.position) {
      const { x, y, z } = drift.position;
      // 2 puffs/frame at full rate; tier scales count slightly.
      const rate = 1 + (drift.tier || 0);
      for (let n = 0; n < rate; n += 1) {
        const side = n % 2 === 0 ? -1 : 1;
        spawn(
          systems.smoke,
          x + side * 3.4 + (rng() - 0.5) * 1.5,
          y + 0.4,
          z - 4.5 + (rng() - 0.5) * 1.5,
          (rng() - 0.5) * 3 + side * 1.2,
          2.2 + rng() * 2,
          (rng() - 0.5) * 3 - 2,
          0.7 + rng() * 0.5
        );
      }
    }
    if (systems.smoke) stepPool(systems.smoke, dt, 0.92, 1.5);

    // --- Boost sparks: bright embers off the exhaust. ---
    if (systems.sparks && boost?.active && boost.position) {
      const { x, y, z } = boost.position;
      const rate = 2 + (boost.tier || 0);
      for (let n = 0; n < rate; n += 1) {
        spawn(
          systems.sparks,
          x + (rng() - 0.5) * 2.2,
          y + 1.6 + (rng() - 0.5) * 0.8,
          z - 5.4,
          (rng() - 0.5) * 6,
          1 + rng() * 3,
          -6 - rng() * 6,
          0.28 + rng() * 0.22
        );
      }
    }
    if (systems.sparks) stepPool(systems.sparks, dt, 0.9, -9);

    // --- Ambient motes: slow drift, re-centered on the camera. ---
    if (systems.ambient && camPosition) {
      const { positions, count } = systems.ambient;
      const range = 240;
      for (let i = 0; i < count; i += 1) {
        // Gentle fall (snow) or rise (dust); CC motes rise slowly, PV snow falls.
        positions[i * 3 + 1] += (isSnow ? -1 : 0.35) * dt * 2;
        positions[i * 3] += Math.sin(i + performance.now() * 0.0002) * dt * 0.6;
        // Wrap vertically inside a 0..46 band.
        if (positions[i * 3 + 1] < 0) positions[i * 3 + 1] = 46;
        if (positions[i * 3 + 1] > 46) positions[i * 3 + 1] = 0;
        // Re-center horizontally around the camera.
        const dx = positions[i * 3] - camPosition.x;
        const dz = positions[i * 3 + 2] - camPosition.z;
        if (dx > range / 2) positions[i * 3] -= range;
        if (dx < -range / 2) positions[i * 3] += range;
        if (dz > range / 2) positions[i * 3 + 2] -= range;
        if (dz < -range / 2) positions[i * 3 + 2] += range;
      }
      systems.ambient.points.geometry.attributes.position.needsUpdate = true;
    }
  };

  // Tier color for smoke/spark tinting (mirrors the DRIFT_FEEL grammar).
  const setTierColor = (sparkColor, smokeColor) => {
    if (systems.sparks) systems.sparks.points.material.color.set(sparkColor);
    if (systems.smoke && smokeColor) systems.smoke.points.material.color.set(smokeColor);
  };

  const dispose = () => {
    Object.values(systems).forEach((s) => {
      s.points.geometry.dispose();
      s.points.material.map?.dispose();
      s.points.material.dispose();
    });
  };

  return { group, systems, updateFrame, setTierColor, dispose };
};
