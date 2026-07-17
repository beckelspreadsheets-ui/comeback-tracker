// Graphics overhaul — environment reflection probe (Phase 1, materials).
// Builds a PMREM-filtered environment from THREE's RoomEnvironment and
// installs it as `scene.environment`, so every PBR material (the kart
// MeshStandardMaterial bodies, the road, the curbs) picks up a subtle
// image-based-lighting sheen. This is the cubemap approximation the brief
// asks for: RoomEnvironment is a tiny procedural HDR studio scene (no network
// fetch, no texture bytes), prefiltered once at boot into a mip-mapped
// radiance env map. Cost = one PMREM bake; per-frame it's just an extra
// texture lookup in the standard-material shader.
//
// Guarded by the graphics preset: 'low' gets a dimmer bake, 'off' skips it
// entirely (scene.environment stays null -> the shipped flat look). MeshToon
// materials (hero karts/drivers) don't consume envMap in r184 — their pop
// still comes from the toon rim shader — so this is additive, never a swap.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Bake a PMREM environment for the scene and apply it. Returns the
// { texture, pmrem } pair so the caller can dispose both on teardown.
// `intensity` maps to scene.environmentIntensity (r163+): below 1.0 keeps the
// reflection a subtle sheen instead of a chrome mirror — critical for holding
// the stylized kart-racer read while still getting metal/paint definition.
export const applyGraphicsEnvironment = ({ renderer, scene, intensity = 0.55 } = {}) => {
  if (!renderer || !scene) return null;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileCubemapShader();
  // RoomEnvironment: an emissive-box studio — soft top key + colored side
  // walls. Pre-filtered to a cubemap radiance env; fromScene renders it once.
  const environmentScene = new RoomEnvironment();
  const envRT = pmrem.fromScene(environmentScene, 0.04);
  scene.environment = envRT.texture;
  // environmentIntensity is the scene-wide multiplier three applies to every
  // standard material's IBL contribution. Guard for older three that predates
  // the property (harmless no-op there, env still binds at full strength).
  if ('environmentIntensity' in scene) scene.environmentIntensity = intensity;
  return { envRT, pmrem };
};

// Dispose the env probe + free the PMREM targets on scene teardown.
export const disposeGraphicsEnvironment = ({ scene, handle } = {}) => {
  if (scene) {
    scene.environment = null;
    if ('environmentIntensity' in scene) scene.environmentIntensity = 1;
  }
  if (handle?.envRT) handle.envRT.dispose();
  if (handle?.pmrem) handle.pmrem.dispose();
};
