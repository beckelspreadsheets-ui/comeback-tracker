import * as THREE from 'three';

// Shadow + grounding rig.
//
// The original pillar audit measured the road directly under a rival kart at
// RGB(17,28,51) against RGB(17,28,52) a hundred pixels away: a one-value delta,
// i.e. mathematically zero contact. Karts, props, palms, igloos and pedestals
// all met the ground on a hard silhouette edge and read as stickers laid over
// the track. Lighting has been stuck at 5/10 ever since.
//
// Grounding here is THREE tiers, because one technique cannot cover the whole
// frame at a sane cost:
//
//   tier 1 — real cast shadows from the key light, over a tight orthographic
//            frustum that rides the player. Sharp, directional, correct, and
//            only pays for what is inside ~45 units of the kart.
//   tier 2 — contact decals under every kart. These survive the case a shadow
//            map cannot sell: a low sunset sun throws the cast shadow sideways
//            and out of shot, so without a patch under the wheels the kart
//            still reads as floating even though its shadow is technically on
//            screen. This is ambient occlusion, not a second shadow.
//   tier 3 — a static instanced contact-darkening pass for the FAR field:
//            every prop and building outside the shadow frustum gets a soft
//            multiplied patch at its base. Two draw calls for the whole world,
//            no per-frame cost, and it is the only tier that reaches the
//            mid-ground belt.
//
// Everything is tiered on `mobile` and the whole rig degrades to "tier 2 only"
// if the shadow map is off.

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Tier 3 textures are process-wide, keyed by strength.
//
// MULTIPLY blending, so this ramp is a brightness MULTIPLIER, not an alpha
// mask: white at the rim leaves the ground exactly as it was, the dark core
// scales it down. Multiplying preserves the ground's HUE, which matters on
// Comeback City's saturated neon asphalt — an alpha-blended black patch
// desaturates the road and reads as a hole punched in it, which is the note the
// boost pad's backing quad already picked up.
//
// The strength has to live in the TEXTURE and not in material.opacity: three's
// MultiplyBlending is (blendSrc ZERO, blendDst SRC_COLOR), an equation with no
// alpha term at all, so opacity on a multiply material is silently a no-op.
const sharedGroundPatchTextures = new Map();
const getGroundPatchTexture = (core) => {
  const key = core.toFixed(2);
  const cached = sharedGroundPatchTextures.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const level = (amount) => {
    const value = Math.round(255 * (1 - (1 - core) * amount));
    return `rgb(${value},${value},${value})`;
  };
  const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, level(1));
  gradient.addColorStop(0.34, level(0.82));
  gradient.addColorStop(0.62, level(0.42));
  gradient.addColorStop(0.85, level(0.12));
  gradient.addColorStop(1, level(0));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  sharedGroundPatchTextures.set(key, texture);
  return texture;
};

/**
 * Walk the static world, pruning whole subtrees that must never be swept.
 *
 * `cameraOccluderExempt` is the flag the monolith already stamps on anything
 * that MOVES WITH OR BELONGS TO AN ACTOR — the karts, their contact rigs, the
 * march train, the VFX pools. It is exactly the right signal here too: a static
 * ground patch under a kart would be frozen at wherever the kart happened to be
 * when the sweep ran, and a pooled projectile parked at the origin would leave a
 * dark ellipse on the start line. Pruning the SUBTREE (rather than testing each
 * mesh) is why this is a manual walk and not Object3D.traverse.
 *
 * Hidden subtrees are pooled items waiting to be fired; InstancedMesh is the
 * coin field, whose single small geometry would sail through every size filter
 * and then draw its entire instance list.
 */
const walkStaticWorld = (node, visit) => {
  if (!node.visible) return;
  if (node.userData.cameraOccluderExempt || node.userData.groundingExempt) return;
  if (node.isMesh && !node.isInstancedMesh && !node.isSkinnedMesh) visit(node);
  const children = node.children;
  for (let index = 0; index < children.length; index += 1) walkStaticWorld(children[index], visit);
};

/**
 * Collect one grounding patch per PROP, not per mesh.
 *
 * A palm is a trunk plus fronds, a building is a shell plus twenty window
 * quads. Emitting a decal per mesh would stack fifteen patches on one spot and
 * crush the road to black. Meshes are bucketed on a coarse XZ grid and the
 * bucket keeps the widest footprint and the LOWEST base — which is how a sign
 * panel four units up in the air ends up sharing a patch with the post holding
 * it, instead of getting a dark ellipse floating beside it.
 */
const collectGroundingBuckets = (world, { cellSize, groundMin, groundMax, maxFootprint }) => {
  const buckets = new Map();
  const box = new THREE.Box3();
  world.updateMatrixWorld(true);
  walkStaticWorld(world, (node) => {
    if (!node.geometry) return;
    // Roads, ground planes and every existing decal are RECEIVERS. A receiver
    // that also grounded itself would double-darken the surface it lies on.
    const type = node.geometry.type;
    if (type === 'PlaneGeometry' || type === 'CircleGeometry' || type === 'ShapeGeometry') return;
    if (node.userData.kind === 'real-3d-track-mesh') return;
    const material = Array.isArray(node.material) ? node.material[0] : node.material;
    // Alpha-blended meshes are glow halos, speed lines and billboards — they
    // have no mass and nothing to ground.
    if (!material || material.transparent || material.wireframe || material.depthWrite === false) return;
    if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
    if (!node.geometry.boundingBox) return;
    box.copy(node.geometry.boundingBox).applyMatrix4(node.matrixWorld);
    const sizeX = box.max.x - box.min.x;
    const sizeY = box.max.y - box.min.y;
    const sizeZ = box.max.z - box.min.z;
    if (!Number.isFinite(sizeX) || !Number.isFinite(sizeZ)) return;
    const footprint = Math.max(sizeX, sizeZ);
    // Under a metre it is a bolt or a window frame; over `maxFootprint` it is
    // the backdrop ring, the sky dome or the track ribbon itself.
    if (footprint < 1.2 || footprint > maxFootprint) return;
    // Under 1.6 units tall it is road furniture lying on the deck — a boost-pad
    // chevron, a curb block, a painted marking riser. Darkening around those
    // reads as the "shadow-shaped hole punched in the asphalt" the critics
    // already logged against the boost pad's backing quad.
    if (sizeY < 1.6) return;
    // Bands the world's ground can plausibly be at. Anything above this is a
    // gantry, a hanging sign or the skyline, and a patch under it would land in
    // mid-air.
    if (box.min.y < groundMin || box.min.y > groundMax) return;
    const centerX = (box.min.x + box.max.x) * 0.5;
    const centerZ = (box.min.z + box.max.z) * 0.5;
    const key = `${Math.round(centerX / cellSize)}|${Math.round(centerZ / cellSize)}`;
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, { x: centerX, z: centerZ, baseY: box.min.y, sizeX, sizeZ });
      return;
    }
    existing.baseY = Math.min(existing.baseY, box.min.y);
    if (Math.max(sizeX, sizeZ) > Math.max(existing.sizeX, existing.sizeZ)) {
      existing.x = centerX;
      existing.z = centerZ;
      existing.sizeX = sizeX;
      existing.sizeZ = sizeZ;
    }
  });
  return [...buckets.values()];
};

/**
 * Build the tier-3 instanced patches. Two meshes, split by footprint: MULTIPLY
 * blending has no per-instance strength control (see getGroundPatchTexture), so
 * strength lives in the texture and the split lives in the bucketing. Two draw
 * calls for every prop on the course.
 */
const buildGroundingDecals = (world, options) => {
  const entries = collectGroundingBuckets(world, options);
  if (!entries.length) return [];
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);
  // A barrel wants a tight, dark patch; a forty-unit building wants a wide,
  // faint one, or the road under the skyline turns to soot.
  const tiers = [
    { name: 'grounding-decals-tight', core: 0.42, spread: 1.75, entries: [] },
    { name: 'grounding-decals-broad', core: 0.66, spread: 1.4, entries: [] },
  ];
  entries.forEach((entry) => {
    const tier = Math.max(entry.sizeX, entry.sizeZ) <= options.tightMax ? tiers[0] : tiers[1];
    tier.entries.push(entry);
  });
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const built = [];
  tiers.forEach((tier) => {
    if (!tier.entries.length) return;
    const material = new THREE.MeshBasicMaterial({
      blending: THREE.MultiplyBlending,
      depthWrite: false,
      map: getGroundPatchTexture(tier.core),
      // Not for alpha (multiply has none) — this puts the patch in the
      // transparent pass so it draws AFTER the ground it is darkening.
      transparent: true,
      // The world's ground is not flat (bridge decks, ice shelves, banked
      // aprons). Biasing toward the lens is cheaper and more reliable than
      // trying to find the exact surface height for every prop.
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, tier.entries.length);
    mesh.name = tier.name;
    mesh.userData.groundingExempt = true;
    mesh.renderOrder = 1;
    // The patches are scattered over the whole course, so one bounding sphere
    // around all of them is the size of the track — culling it as a unit either
    // never culls or wrongly culls. Instanced draws are one call either way.
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    tier.entries.forEach((entry, index) => {
      position.set(entry.x, entry.baseY + 0.07, entry.z);
      scale.set(
        Math.max(2.4, entry.sizeX * tier.spread),
        1,
        Math.max(2.4, entry.sizeZ * tier.spread)
      );
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    world.add(mesh);
    built.push(mesh);
  });
  return built;
};

/**
 * @param {object} options
 *   renderer   WebGLRenderer
 *   sun        the scene's shadow-casting DirectionalLight
 *   mobile     phone tier
 *   enabled    master switch (false keeps tier 2 only)
 */
export const createRaceShadowRig = ({ renderer, sun, mobile = false, enabled = true }) => {
  const active = Boolean(enabled && renderer && sun);
  // Tier budget. The frame has ~14ms of headroom against a 16.7ms target, and a
  // 2048 depth pass over a 45-unit frustum costs a fraction of a millisecond
  // because per-object frustum culling keeps it to the karts plus whatever
  // roadside props are actually beside the player.
  //
  // The phone tier is deliberately UNCHANGED from what shipped (512 over a
  // slightly tighter frustum, player kart only). Phone framerate is owner-
  // visible and the phone's grounding win comes from tiers 2 and 3, which cost
  // it nothing.
  const tier = mobile
    ? { mapSize: 512, extent: 38, rivalsCast: false, driversCast: false, propsCast: false }
    : { mapSize: 2048, extent: 46, rivalsCast: true, driversCast: true, propsCast: true };

  if (renderer) {
    renderer.shadowMap.enabled = active;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  if (sun) {
    sun.castShadow = active;
    if (active) {
      sun.shadow.mapSize.set(tier.mapSize, tier.mapSize);
      sun.shadow.camera.left = -tier.extent;
      sun.shadow.camera.right = tier.extent;
      sun.shadow.camera.top = tier.extent;
      sun.shadow.camera.bottom = -tier.extent;
      // A sunset sun sits ~15-20 degrees up, so a kart throws a shadow close to
      // three times its own height. The near plane has to clear the light's own
      // standoff and the far plane has to reach past the casters behind it.
      sun.shadow.camera.near = 8;
      sun.shadow.camera.far = 520;
      // normalBias over depth bias: at 2048 over 92 units a texel is 0.045
      // world units, and a constant bias big enough to kill acne on the chunky
      // low-poly bodywork also detaches the shadow from the wheels. normalBias
      // pushes the sample along the surface normal, which is where the acne is.
      sun.shadow.bias = -0.00016;
      sun.shadow.normalBias = 0.55;
      sun.shadow.camera.updateProjectionMatrix();
    }
  }

  const texelWorldSize = active ? (tier.extent * 2) / tier.mapSize : 0;
  const lightRight = new THREE.Vector3();
  const lightUp = new THREE.Vector3();
  const lightForward = new THREE.Vector3();
  const snapped = new THREE.Vector3();
  const WORLD_UP = new THREE.Vector3(0, 1, 0);
  const FALLBACK_UP = new THREE.Vector3(0, 0, 1);
  let decals = [];

  const disposeDecals = () => {
    decals.forEach((mesh) => {
      mesh.parent?.remove(mesh);
      // The instance matrix attribute is the InstancedMesh's own; geometry and
      // material are shared with the sibling tier, and three's dispose is
      // idempotent, so freeing both twice is safe.
      mesh.dispose();
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    decals = [];
  };

  /**
   * Place the key light for this frame.
   *
   * The light rides the player, which is what keeps the frustum tight — and is
   * also what makes shadow edges CRAWL, because every frame resamples the depth
   * map on a slightly different grid. Snapping the light's target to whole
   * shadow texels removes the crawl entirely and costs three dot products.
   */
  const update = (focusPoint, sunDirection, sunDistance) => {
    if (!sun) return;
    if (!active || texelWorldSize <= 0) {
      sun.position.copy(sunDirection).multiplyScalar(sunDistance).add(focusPoint);
      sun.target.position.copy(focusPoint);
      sun.target.updateMatrixWorld();
      return;
    }
    lightForward.copy(sunDirection).normalize().negate();
    const upReference = Math.abs(lightForward.y) > 0.98 ? FALLBACK_UP : WORLD_UP;
    lightRight.crossVectors(lightForward, upReference).normalize();
    lightUp.crossVectors(lightRight, lightForward).normalize();
    const alongRight = focusPoint.dot(lightRight);
    const alongUp = focusPoint.dot(lightUp);
    const alongForward = focusPoint.dot(lightForward);
    const snapRight = Math.round(alongRight / texelWorldSize) * texelWorldSize;
    const snapUp = Math.round(alongUp / texelWorldSize) * texelWorldSize;
    snapped
      .copy(lightRight)
      .multiplyScalar(snapRight)
      .addScaledVector(lightUp, snapUp)
      .addScaledVector(lightForward, alongForward);
    sun.target.position.copy(snapped);
    sun.target.updateMatrixWorld();
    sun.position.copy(sunDirection).multiplyScalar(sunDistance).add(snapped);
  };

  /**
   * Tier 1 caster sweep — which meshes enter the depth pass.
   * Runs once, before the karts mount, so kart policy stays with the karts.
   */
  const markSceneryCasters = (world) => {
    if (!active || !tier.propsCast) return 0;
    let marked = 0;
    world.updateMatrixWorld(true);
    walkStaticWorld(world, (node) => {
      if (!node.geometry || node.castShadow) return;
      if (node.userData.kind === 'real-3d-track-mesh') return;
      if (node.geometry.type === 'PlaneGeometry' || node.geometry.type === 'CircleGeometry') return;
      const material = Array.isArray(node.material) ? node.material[0] : node.material;
      if (!material || material.transparent || material.wireframe) return;
      if (!node.geometry.boundingSphere) node.geometry.computeBoundingSphere();
      const radius =
        (node.geometry.boundingSphere?.radius || 0) * node.matrixWorld.getMaxScaleOnAxis();
      // Under 0.4 units the caster is smaller than a shadow texel; over 40 it is
      // architecture the frustum can only ever see a slice of, and that slice
      // self-shadows into acne.
      if (radius < 0.4 || radius > 40) return;
      node.castShadow = true;
      marked += 1;
    });
    return marked;
  };

  // Remembered so refresh() can redo both sweeps once the async GLB mounts have
  // landed without the caller having to re-derive the course's ground band.
  let groundingWorld = null;
  let groundingBand = null;

  /** Tier 3. Idempotent — calling it again replaces the previous patch set. */
  const buildFarFieldGrounding = (world, { groundMin = -80, groundMax = 90 } = {}) => {
    groundingWorld = world;
    groundingBand = { groundMax, groundMin };
    disposeDecals();
    try {
      decals = buildGroundingDecals(world, {
        cellSize: 7,
        groundMin,
        groundMax,
        // Past 96 units across it is the road ribbon, a backdrop ring or the
        // mid-ground belt's base plate, none of which sit ON anything.
        maxFootprint: 96,
        tightMax: 14,
      });
      return decals.reduce((total, mesh) => total + mesh.count, 0);
    } catch (error) {
      // Grounding is dressing. A malformed prop must never cost the race.
      if (import.meta.env?.DEV) console.warn('[kart] far-field grounding skipped', error);
      decals = [];
      return 0;
    }
  };

  /**
   * Re-run both static sweeps.
   *
   * The Miami building GLBs and the authored props mount ASYNCHRONOUSLY, so
   * neither sweep can see them at scene-build time — which is exactly the set of
   * objects the critics measured as ungrounded ("belt towers have zero
   * ground-contact darkening", "the sign, the barrels, the snowman all meet the
   * ground on an unshaded edge"). The caller pairs this with its existing
   * post-mount camera-blocker refresh so the world is only walked once more.
   */
  const refresh = () => {
    if (!groundingWorld) return { casters: 0, patches: 0 };
    // markSceneryCasters skips anything already flagged, so the re-run only
    // costs the newly mounted meshes.
    const casters = markSceneryCasters(groundingWorld);
    const patches = buildFarFieldGrounding(groundingWorld, groundingBand || {});
    return { casters, patches };
  };

  return {
    active,
    buildFarFieldGrounding,
    dispose: disposeDecals,
    driversCast: active && tier.driversCast,
    markSceneryCasters,
    mapSize: active ? tier.mapSize : 0,
    refresh,
    rivalsCast: active && tier.rivalsCast,
    update,
  };
};

/**
 * Contact-patch sizing for a kart, tier 2.
 *
 * With real cast shadows ON, the old 12x21-unit blob double-darkened the road
 * and — because a low sun throws the REAL shadow well off to one side — the two
 * together read as a hard-edged slab sitting a kart-length away from the wheels,
 * which is precisely the note the critics logged. The patch below is the kart's
 * own footprint and nothing more: it is the ambient occlusion under the
 * bodywork, and the sun is allowed to own the cast shadow.
 *
 * Pass the flag PER KART, not per scene: on phones the player casts and the
 * rivals do not, so the player wants the small AO patch and the rivals still
 * want the big soft blob that is their only grounding cue. Same on the
 * ?trackVisuals=1 branch, where nothing casts at all.
 */
export const contactPatchProfile = (shadowsEnabled, contactGrounding) =>
  shadowsEnabled
    ? { width: 8.4, length: 12.6, opacity: contactGrounding ? 0.38 : 0.34, glowScale: 1.1 }
    : { width: 12, length: 21, opacity: contactGrounding ? 0.52 : 0.46, glowScale: 1.05 };

/**
 * Air fade for a contact patch.
 *
 * Shared by the player and every rival so a kart mid-hop reads the same however
 * it got airborne. Returns the uniform XZ scale AND the opacity multiplier: a
 * shadow does not just shrink as its caster rises, it also softens.
 */
export const contactPatchAirFade = (airHeight) => {
  const air = Math.max(0, airHeight || 0);
  const scale = clamp(1 - air * 0.05, 0.42, 1);
  return { opacity: clamp(1 - air * 0.062, 0.3, 1), scale };
};
