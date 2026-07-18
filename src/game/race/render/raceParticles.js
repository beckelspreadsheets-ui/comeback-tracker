// G3 particles & decals for the V2 three-kart runtime (owner-approved plan
// docs/GRAPHICS_CEILING_RAISE_PLAN.md — that approval formally supersedes the
// crisis-era "no particle systems" scope rule).
//
// Budget contract: FOUR added draw calls total, everything pooled up front —
//   1. drift spray      ONE InstancedMesh (48 quads, 24 on mobile)
//   2. skid marks       ONE Mesh over ONE ring-buffer BufferGeometry (64 quads)
//   3. one-shot bursts  ONE InstancedMesh (32 quads, 16 mobile) shared by the
//                       coin sparkle and the spin-out poof (instanceColor
//                       keeps simultaneous bursts in their own colors)
//   4. boost speed-lines ONE Mesh parented to the CAMERA (camera-space radial
//                       streaks; only drawn while boosting)
//
// Sync contract: one-shot bursts fire off the SAME pure cue derivation the
// race audio uses (kartAudio.cuesForTransition) — the caller feeds cues in,
// this module never invents a second event system, so sight and sound agree
// by construction. Continuous systems (spray, skids, speed-lines) read the
// same per-frame drift/boost state the drift VFX read.
//
// reducedMotion: speed-lines hide entirely (decorative), spray halves its
// emission (gameplay-critical tier feedback stays readable), one-shot bursts
// keep firing (brief event feedback, not ambient motion).
import * as THREE from 'three';
import { DRIFT_FEEL } from '../driftFeel.js';

const SPRAY_GRAVITY = -16;
const SKID_QUADS = 64;
const SKID_FADE_SECONDS = 6;
const SKID_MIN_STEP = 1.25;
const SKID_HALF_WIDTH = 0.34;

const scratchMatrix = new THREE.Matrix4();
const scratchQuaternion = new THREE.Quaternion();
const scratchScale = new THREE.Vector3();
const scratchColor = new THREE.Color();
const HIDDEN_SCALE = new THREE.Vector3(0, 0, 0);
const HIDDEN_POSE = new THREE.Matrix4().compose(
  new THREE.Vector3(0, -50, 0),
  new THREE.Quaternion(),
  HIDDEN_SCALE
);

// Shared soft-dot sprite — hard-edged quads read as tofu at race speed.
let softDotTexture = null;
const getSoftDotTexture = () => {
  if (softDotTexture) return softDotTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  softDotTexture = new THREE.CanvasTexture(canvas);
  return softDotTexture;
};

const makeBillboardPool = (count, { blending = THREE.AdditiveBlending, size = 0.6 } = {}) => {
  const mesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      blending,
      color: '#ffffff',
      depthWrite: false,
      map: getSoftDotTexture(),
      transparent: true,
    }),
    count
  );
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let index = 0; index < count; index += 1) mesh.setMatrixAt(index, HIDDEN_POSE);
  mesh.instanceMatrix.needsUpdate = true;
  // Pools follow the kart anywhere on the course — static bounds would cull.
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
};

export const createRaceParticles = ({ isIce = false, mobile = false } = {}) => {
  const group = new THREE.Group();
  group.name = 'g3-race-particles';

  // -- 1. Drift spray -------------------------------------------------------
  const sprayCount = mobile ? 24 : 48;
  const sprayMesh = makeBillboardPool(sprayCount, { size: 0.62 });
  sprayMesh.renderOrder = 30;
  group.add(sprayMesh);
  const sprayPool = Array.from({ length: sprayCount }, () => ({
    life: 0,
    position: new THREE.Vector3(),
    ttl: 0,
    velocity: new THREE.Vector3(),
  }));
  let sprayCursor = 0;
  let sprayAccumulator = 0;

  // -- 2. Skid marks (ring buffer, one geometry updated in place) -----------
  const skidPositions = new Float32Array(SKID_QUADS * 4 * 3);
  const skidColors = new Float32Array(SKID_QUADS * 4 * 4);
  const skidIndices = new Uint16Array(SKID_QUADS * 6);
  for (let quad = 0; quad < SKID_QUADS; quad += 1) {
    const v = quad * 4;
    skidIndices.set([v, v + 1, v + 2, v + 2, v + 1, v + 3], quad * 6);
  }
  const skidGeometry = new THREE.BufferGeometry();
  skidGeometry.setAttribute('position', new THREE.BufferAttribute(skidPositions, 3).setUsage(THREE.DynamicDrawUsage));
  skidGeometry.setAttribute('color', new THREE.BufferAttribute(skidColors, 4).setUsage(THREE.DynamicDrawUsage));
  skidGeometry.setIndex(new THREE.BufferAttribute(skidIndices, 1));
  // Dark rubber on Comeback City asphalt, blue-white scrape on Penguin ice.
  const skidTone = new THREE.Color(isIce ? '#dff4ff' : '#07090f');
  const skidBaseAlpha = isIce ? 0.5 : 0.42;
  const skidMesh = new THREE.Mesh(
    skidGeometry,
    new THREE.MeshBasicMaterial({
      depthWrite: false,
      // Lift over co-planar road decals without moving the quads off the
      // surface on slopes.
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      side: THREE.DoubleSide,
      transparent: true,
      vertexColors: true,
    })
  );
  skidMesh.renderOrder = 4;
  skidMesh.frustumCulled = false;
  skidMesh.castShadow = false;
  group.add(skidMesh);
  const skidAges = new Float32Array(SKID_QUADS).fill(Infinity);
  let skidCursor = 0;
  // Per rear wheel: the last laid edge (left/right verts) or null when the
  // drift broke — the next segment starts fresh instead of streaking across.
  const skidTrails = [null, null];

  // -- 3. One-shot bursts (coin sparkle + spin-out poof share the pool) -----
  const burstCount = mobile ? 16 : 32;
  const burstMesh = makeBillboardPool(burstCount, { size: 0.5 });
  burstMesh.renderOrder = 32;
  group.add(burstMesh);
  const burstPool = Array.from({ length: burstCount }, () => ({
    life: 0,
    position: new THREE.Vector3(),
    size: 1,
    ttl: 0,
    velocity: new THREE.Vector3(),
  }));
  let burstCursor = 0;

  // -- 4. Boost speed-lines (camera-space, parent to the camera) ------------
  const lineCount = mobile ? 8 : 14;
  const linePositions = new Float32Array(lineCount * 4 * 3);
  const lineIndices = new Uint16Array(lineCount * 6);
  for (let line = 0; line < lineCount; line += 1) {
    const angle = (line / lineCount) * Math.PI * 2 + (line % 2 ? 0.19 : 0);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Thin wedge hugging the frame edge at z = -1.6 — speed feedback, not
    // a screen takeover: inner radius stays outside the kart's framing.
    const inner = 0.86 + (line % 3) * 0.08;
    const outer = 1.5;
    const half = 0.009 + (line % 2) * 0.004;
    const px = -sin * half;
    const py = cos * half;
    linePositions.set(
      [
        cos * inner - px, sin * inner - py, -1.6,
        cos * inner + px, sin * inner + py, -1.6,
        cos * outer - px * 2.6, sin * outer - py * 2.6, -1.6,
        cos * outer + px * 2.6, sin * outer + py * 2.6, -1.6,
      ],
      line * 12
    );
    const v = line * 4;
    lineIndices.set([v, v + 1, v + 2, v + 2, v + 1, v + 3], line * 6);
  }
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  lineGeometry.setIndex(new THREE.BufferAttribute(lineIndices, 1));
  const speedLines = new THREE.Mesh(
    lineGeometry,
    new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: '#bfeaff',
      depthTest: false,
      depthWrite: false,
      opacity: 0,
      // The wedges are authored in the camera's xy-plane and wind toward
      // -Z — single-sided they'd be backface-culled from the camera's view.
      side: THREE.DoubleSide,
      transparent: true,
    })
  );
  speedLines.name = 'g3-boost-speed-lines';
  speedLines.renderOrder = 60;
  speedLines.frustumCulled = false;
  speedLines.visible = false;

  const spawnSpray = (context) => {
    const item = sprayPool[sprayCursor];
    sprayCursor = (sprayCursor + 1) % sprayCount;
    const side = Math.random() < 0.5 ? -1 : 1;
    const cos = Math.cos(context.yaw);
    const sin = Math.sin(context.yaw);
    // Rear-wheel local offset (±4.7, 0.8, -3.6) rotated into world.
    const lx = side * (4.4 + Math.random() * 0.9);
    const lz = -3.4 - Math.random() * 1.2;
    item.position.set(
      context.kartPosition.x + cos * lx + sin * lz,
      context.groundY + 0.7 + Math.random() * 0.5,
      context.kartPosition.z - sin * lx + cos * lz
    );
    // Kicked backward and outward off the wheel, arcing up then under gravity.
    const vx = side * (1.2 + Math.random() * 2.6);
    const vz = -(9 + Math.random() * 6 + context.tier * 2);
    item.velocity.set(cos * vx + sin * vz, 3.2 + Math.random() * 3.4, -sin * vx + cos * vz);
    item.ttl = 0.3 + Math.random() * 0.22;
    item.life = item.ttl;
  };

  const spawnBurst = (context, { color, count, size, speed, ttl, upBias }) => {
    for (let index = 0; index < count; index += 1) {
      const item = burstPool[burstCursor];
      const slot = burstCursor;
      burstCursor = (burstCursor + 1) % burstCount;
      const angle = (index / count) * Math.PI * 2 + Math.random() * 0.7;
      item.position.set(context.kartPosition.x, context.groundY + 2.4, context.kartPosition.z);
      item.velocity.set(
        Math.cos(angle) * speed * (0.55 + Math.random() * 0.45),
        upBias + Math.random() * upBias,
        Math.sin(angle) * speed * (0.55 + Math.random() * 0.45)
      );
      item.ttl = ttl * (0.75 + Math.random() * 0.5);
      item.life = item.ttl;
      item.size = size;
      burstMesh.setColorAt(slot, scratchColor.set(color));
    }
    if (burstMesh.instanceColor) burstMesh.instanceColor.needsUpdate = true;
  };

  // Cue router — cue names come from kartAudio.cuesForTransition verbatim.
  const onCue = (cue, context) => {
    if (cue === 'coin') {
      spawnBurst(context, {
        color: '#FFD34F',
        count: mobile ? 5 : 7,
        size: 0.9,
        speed: 5.5,
        ttl: 0.5,
        upBias: 4.2,
      });
    } else if (cue === 'spin-out') {
      spawnBurst(context, {
        color: isIce ? '#e8f4ff' : '#d9dfec',
        count: mobile ? 7 : 10,
        size: 1.7,
        speed: 4.2,
        ttl: 0.75,
        upBias: 2.2,
      });
    }
  };

  const laySkidSegment = (context) => {
    const cos = Math.cos(context.yaw);
    const sin = Math.sin(context.yaw);
    [-1, 1].forEach((side, wheelIndex) => {
      const lx = side * 4.6;
      const lz = -3.3;
      const cx = context.kartPosition.x + cos * lx + sin * lz;
      const cz = context.kartPosition.z - sin * lx + cos * lz;
      const leftX = cx - cos * SKID_HALF_WIDTH;
      const leftZ = cz + sin * SKID_HALF_WIDTH;
      const rightX = cx + cos * SKID_HALF_WIDTH;
      const rightZ = cz - sin * SKID_HALF_WIDTH;
      const trail = skidTrails[wheelIndex];
      if (trail) {
        const stepX = cx - trail.centerX;
        const stepZ = cz - trail.centerZ;
        if (stepX * stepX + stepZ * stepZ < SKID_MIN_STEP * SKID_MIN_STEP) return;
        const quad = skidCursor;
        skidCursor = (skidCursor + 1) % SKID_QUADS;
        const y = context.groundY + 0.08 + (quad % 4) * 0.004;
        skidPositions.set(
          [
            trail.leftX, y, trail.leftZ,
            trail.rightX, y, trail.rightZ,
            leftX, y, leftZ,
            rightX, y, rightZ,
          ],
          quad * 12
        );
        for (let vert = 0; vert < 4; vert += 1) {
          skidColors.set([skidTone.r, skidTone.g, skidTone.b, skidBaseAlpha], (quad * 4 + vert) * 4);
        }
        skidAges[quad] = 0;
        skidGeometry.attributes.position.needsUpdate = true;
      }
      skidTrails[wheelIndex] = { centerX: cx, centerZ: cz, leftX, leftZ, rightX, rightZ };
    });
  };

  const update = (context) => {
    const { camera, dt } = context;
    camera.getWorldQuaternion(scratchQuaternion);

    // Spray: emit while drifting on the ground, tier raises the rate.
    const spraying = context.drifting && !context.airborne;
    if (spraying) {
      const rate = (24 + context.tier * 11) * (context.reducedMotion ? 0.5 : 1);
      sprayAccumulator += dt * rate;
      while (sprayAccumulator >= 1) {
        sprayAccumulator -= 1;
        spawnSpray(context);
      }
    } else {
      sprayAccumulator = 0;
    }
    const sprayColor = scratchColor.set(DRIFT_FEEL.sparkColors[context.tier] || DRIFT_FEEL.sparkColors[0]);
    sprayMesh.material.color.copy(sprayColor);
    sprayPool.forEach((item, index) => {
      if (item.life <= 0) {
        sprayMesh.setMatrixAt(index, HIDDEN_POSE);
        return;
      }
      item.life -= dt;
      item.velocity.y += SPRAY_GRAVITY * dt;
      item.position.addScaledVector(item.velocity, dt);
      if (item.position.y < context.groundY + 0.1) item.life = 0;
      const fade = Math.max(0, item.life / item.ttl);
      scratchScale.setScalar(0.4 + fade * 0.9);
      sprayMesh.setMatrixAt(index, scratchMatrix.compose(item.position, scratchQuaternion, scratchScale));
    });
    sprayMesh.instanceMatrix.needsUpdate = true;

    // Skids: lay while drifting on the ground; a break in the drift breaks
    // the trail. Fade all live quads by age.
    if (spraying) laySkidSegment(context);
    else skidTrails[0] = skidTrails[1] = null;
    let skidDirty = false;
    for (let quad = 0; quad < SKID_QUADS; quad += 1) {
      if (skidAges[quad] > SKID_FADE_SECONDS) continue;
      skidAges[quad] += dt;
      const alpha = Math.max(0, skidBaseAlpha * (1 - skidAges[quad] / SKID_FADE_SECONDS));
      for (let vert = 0; vert < 4; vert += 1) skidColors[(quad * 4 + vert) * 4 + 3] = alpha;
      skidDirty = true;
    }
    if (skidDirty) skidGeometry.attributes.color.needsUpdate = true;

    // Bursts: ballistic, camera-billboarded, shrink out.
    burstPool.forEach((item, index) => {
      if (item.life <= 0) {
        burstMesh.setMatrixAt(index, HIDDEN_POSE);
        return;
      }
      item.life -= dt;
      item.velocity.y -= 7.5 * dt;
      item.position.addScaledVector(item.velocity, dt);
      const fade = Math.max(0, item.life / item.ttl);
      scratchScale.setScalar(item.size * (0.5 + fade * 0.8));
      burstMesh.setMatrixAt(index, scratchMatrix.compose(item.position, scratchQuaternion, scratchScale));
    });
    burstMesh.instanceMatrix.needsUpdate = true;

    // Speed-lines: decorative — reducedMotion hides them outright.
    const boostVisible = context.boosting && !context.reducedMotion;
    speedLines.visible = boostVisible;
    if (boostVisible) {
      speedLines.material.color.set(context.miniTurboTier >= 3 ? '#C879FF' : '#bfeaff');
      speedLines.material.opacity = 0.18 + Math.random() * 0.12;
      speedLines.rotation.z += dt * 2.4 + Math.random() * 0.08;
    }
  };

  const dispose = () => {
    sprayMesh.dispose();
    burstMesh.dispose();
  };

  return { dispose, group, onCue, speedLines, update };
};
