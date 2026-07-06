// B3 (Amendment 7): the single home for shader-injected chunks. Every
// onBeforeCompile in src/game/ must compose through addShaderInjection —
// a direct `material.onBeforeCompile = fn` assignment silently overwrites
// any earlier injection, so D1's spectator sway and E6's hull outlines
// route through this registry later instead of assigning their own.
// Kept as tiny GLSL strings + plain uniform objects so a future TSL/WebGPU
// port can translate chunk-by-chunk.
//
// Anchors below were verified against the INSTALLED three r184 sources
// (node_modules/three/src/renderers/shaders/ShaderLib/meshtoon.glsl.js),
// not from memory: the meshtoon fragment tail is
//   vec3 outgoingLight = reflectedLight.directDiffuse + ...;
//   #include <opaque_fragment>
// and `geometryNormal` / `geometryViewDir` (orthographic-safe, declared by
// lights_fragment_begin) are already in scope at that point.
import * as THREE from 'three';

// Fresnel rim added to the lit toon color. MeshToonMaterial has no envMap
// in r184, so this injected rim IS the character-pop lever — it lifts kart
// and driver silhouettes off the dark dusk track.
export const TOON_RIM_CHUNK = /* glsl */ `
	float toonRimFresnel = pow(1.0 - saturate(dot(geometryNormal, geometryViewDir)), uRimPower);
	outgoingLight += uRimColor * uRimStrength * toonRimFresnel;`;

const TOON_RIM_PARS = /* glsl */ `uniform vec3 uRimColor;
uniform float uRimStrength;
uniform float uRimPower;`;

// ONE shared tint object across every rimmed material: createScene sets it
// from palette.rimLightColor (per-track — Penguin Village '#00d5ff' vs the
// Comeback City fallback '#4fd8ff'), so a single Color.set retints the whole
// hero set and B2's palette moments can lerp it at runtime.
export const TOON_RIM_SHARED_TINT = { value: new THREE.Color('#4fd8ff') };

// Composable onBeforeCompile: registered injections re-apply together and
// the program cache key is merged from every entry name. The explicit key
// matters twice over: three's default customProgramCacheKey stringifies
// onBeforeCompile, and this composed callback has IDENTICAL source for
// materials whose captured registries differ — without the merged key,
// differently-injected materials would collide on one program.
export const addShaderInjection = (material, injection) => {
  const registry = material.userData.shaderInjections || (material.userData.shaderInjections = []);
  if (registry.some((entry) => entry.name === injection.name)) return material;
  registry.push(injection);
  material.onBeforeCompile = (shader) => {
    registry.forEach((entry) => {
      Object.assign(shader.uniforms, entry.uniforms);
      if (entry.vertexPars) {
        shader.vertexShader = shader.vertexShader.replace('void main() {', `${entry.vertexPars}\nvoid main() {`);
      }
      if (entry.vertexChunk) {
        shader.vertexShader = shader.vertexShader.replace(
          entry.vertexAnchor,
          `${entry.vertexChunk}\n\t${entry.vertexAnchor}`
        );
      }
      if (entry.fragmentPars) {
        shader.fragmentShader = shader.fragmentShader.replace('void main() {', `${entry.fragmentPars}\nvoid main() {`);
      }
      if (entry.fragmentChunk) {
        shader.fragmentShader = shader.fragmentShader.replace(
          entry.fragmentAnchor,
          `${entry.fragmentChunk}\n\t${entry.fragmentAnchor}`
        );
      }
    });
  };
  material.customProgramCacheKey = () => registry.map((entry) => entry.name).join('|');
  // Safe on unrendered materials too; required if the material already
  // compiled once (three only re-evaluates programs on a version bump).
  material.needsUpdate = true;
  return material;
};

// Palette-tinted fresnel rim for the hero set (karts, drivers, marchers,
// item boxes — never scenery: rim-on-everything cheapens the read).
// Defaults are the execution-plan starting values; the owner-gated rim lab
// picks the shipped numbers.
export const applyToonRim = (material, { strength = 0.32, power = 2.6 } = {}) =>
  addShaderInjection(material, {
    fragmentAnchor: '#include <opaque_fragment>',
    fragmentChunk: TOON_RIM_CHUNK,
    fragmentPars: TOON_RIM_PARS,
    name: 'toon-rim-v1',
    uniforms: {
      uRimColor: TOON_RIM_SHARED_TINT,
      uRimPower: { value: power },
      uRimStrength: { value: strength },
    },
  });
