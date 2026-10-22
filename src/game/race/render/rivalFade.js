// Rival fade by BLENDING with a depth pre-pass — the proximity ghost's
// default since 2026-10-22 (RELEASE_V1_PLAN 1.10 follow-up); `?rivalFade=dither`
// brings back the alphaHash screen-door for comparison.
//
// WHY A SECOND FADE. 1.10 fades a rival parked between the lens and the
// player with three's alphaHash: a screen-door dither that stays in the opaque
// pass, so nothing can sort wrong. At desktop size it reads as speckle; at the
// phone tier (0.6 render scale, then upscaled at 3x) the speckle grows into a
// cloud of noise over the player's own kart (phone capture, 2026-10-22).
//
// WHY PLAIN BLENDING WAS DROPPED BEFORE. A blended kart that stops writing
// depth draws its own interior through itself — "the see-through hull with a
// solid helmet inside it". The fix for that is the classic one: while a rival
// is faded, an invisible twin of each of its meshes writes the kart's depth
// first (colour writes off), then the real meshes blend with depth test on, so
// only the front-most surface of the kart is ever drawn. One clean
// translucent kart, the player's kart visible through it, no inner faces.
//
// ORDER. Both passes run in three's TRANSPARENT list, after every opaque
// object — the player's kart is already in the frame when the twin writes
// depth over it. renderOrder puts every twin (DEPTH_ORDER) before every faded
// mesh (COLOR_ORDER), and after the scene's own transparent effects
// (renderOrder 0).
//
// THE SHADER VARIANT. three keys its programs on `opaque` (transparent off +
// normal blending), so flipping `transparent` needs material.needsUpdate and,
// the first time, a program compile — a mid-race hitch on a phone. The race's
// countdown warm-up calls prewarmBlendFade around its renderer.compile() so
// both variants are linked before GO.
import * as THREE from 'three';

const DEPTH_ORDER = 9;
const COLOR_ORDER = 10;

// Blend unless ?rivalFade=dither. Side-by-side frames (phone tier and desktop,
// 2026-10-22): the dither turned a rival at the lens into a cloud of speckle
// over the player's kart; the blend reads as one clean translucent kart.
export const rivalFadeVariant = () => {
  if (typeof window === 'undefined') return 'blend';
  return new URLSearchParams(window.location.search).get('rivalFade') === 'dither' ? 'dither' : 'blend';
};

const materialsOf = (mesh) => (Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []);

// The depth twin: same geometry, same world transform (a child at identity),
// colour writes off. Its material is per model, never module-level — a shared
// material would collect one renderer dispose listener per race (see
// releaseTextures.js for what that costs).
const twinFor = (mesh, model) => {
  const existing = mesh.userData.fadeDepthTwin;
  if (existing) return existing;
  const side = materialsOf(mesh)[0]?.side ?? THREE.FrontSide;
  model.fadeDepthMaterials ||= {};
  const material =
    model.fadeDepthMaterials[side] ||
    (model.fadeDepthMaterials[side] = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, side, transparent: true }));
  let twin;
  if (mesh.isSkinnedMesh) {
    twin = new THREE.SkinnedMesh(mesh.geometry, material);
    twin.bind(mesh.skeleton, mesh.bindMatrix);
  } else {
    twin = new THREE.Mesh(mesh.geometry, material);
  }
  twin.userData.isFadeTwin = true;
  twin.renderOrder = DEPTH_ORDER;
  twin.castShadow = false;
  twin.receiveShadow = false;
  twin.frustumCulled = mesh.frustumCulled;
  twin.visible = false;
  mesh.add(twin);
  mesh.userData.fadeDepthTwin = twin;
  return twin;
};

const setTransparent = (material, on) => {
  if (material.transparent === on) return;
  material.transparent = on;
  // `opaque` is part of the program key; without a version bump the OPAQUE
  // define stays and alpha is forced back to 1.
  material.needsUpdate = true;
};

// Per frame, only when the rival's proximity changed.
export const applyBlendFade = (model, proximity) => {
  const ghosted = proximity < 1;
  model.bodyMeshes.forEach((mesh) => {
    if (mesh.userData.isFadeTwin) return;
    const twin = ghosted ? twinFor(mesh, model) : mesh.userData.fadeDepthTwin;
    materialsOf(mesh).forEach((material) => {
      setTransparent(material, ghosted);
      // The twin owns depth while the kart is faded.
      material.depthWrite = !ghosted;
      material.opacity = proximity;
    });
    mesh.renderOrder = ghosted ? COLOR_ORDER : 0;
    if (twin) {
      twin.visible = ghosted;
      twin.castShadow = false;
    }
  });
};

// Around the countdown warm-up's renderer.compile(): flip every rival body
// material to its transparent variant so compile() links that program too,
// and return the function that puts them back.
export const prewarmBlendFade = (models) => {
  const flipped = [];
  models.forEach((model) => {
    if (model?.fadeMode !== 'blend') return;
    model.bodyMeshes.forEach((mesh) => {
      if (mesh.userData.isFadeTwin) return;
      materialsOf(mesh).forEach((material) => {
        if (material.transparent) return;
        setTransparent(material, true);
        flipped.push(material);
      });
    });
  });
  return () => flipped.forEach((material) => setTransparent(material, false));
};
