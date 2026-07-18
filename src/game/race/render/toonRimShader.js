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

// G2 ambient sway — ONE shared clock across every swaying material, advanced
// once per frame by the race loop (and simply not advanced under
// reducedMotion, which freezes all shader sway at zero cost).
export const AMBIENT_SWAY_TIME = { value: 0 };

// Vertex-shader sway for frozen-matrix scenery (spectators, pennant flags,
// palms): matrixAutoUpdate stays false — the lean happens in the shader, so
// the CPU never touches a matrix. Displacement rides the object-local X axis
// (each prop rocks around its own facing) and scales with WORLD height above
// the ground plane, so feet/bases/trunks stay planted. Instancing-aware: the
// phase seed and height use instanceMatrix when present, giving every
// instance its own beat.
const AMBIENT_SWAY_PARS = /* glsl */ `uniform float uSwayTime;
uniform float uSwayStrength;
uniform float uSwaySpeed;
uniform float uSwayHeight;`;

const AMBIENT_SWAY_CHUNK = /* glsl */ `
	vec4 swayLocal = vec4(transformed, 1.0);
	#ifdef USE_INSTANCING
		swayLocal = instanceMatrix * swayLocal;
	#endif
	vec4 swayWorld = modelMatrix * swayLocal;
	float swayWave = sin(uSwayTime * uSwaySpeed + swayWorld.x * 0.43 + swayWorld.z * 0.61);
	transformed.x += swayWave * uSwayStrength * clamp(swayWorld.y / uSwayHeight, 0.0, 1.5);`;

export const applyAmbientSway = (material, { heightRef = 4, speed = 1.6, strength = 0.1 } = {}) =>
  addShaderInjection(material, {
    name: 'ambient-sway-v1',
    uniforms: {
      uSwayHeight: { value: heightRef },
      uSwaySpeed: { value: speed },
      uSwayStrength: { value: strength },
      uSwayTime: AMBIENT_SWAY_TIME,
    },
    vertexAnchor: '#include <project_vertex>',
    vertexChunk: AMBIENT_SWAY_CHUNK,
    vertexPars: AMBIENT_SWAY_PARS,
  });

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
