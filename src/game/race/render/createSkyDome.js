// AAA wave-1 "sky-and-key-light": one coherent time of day.
//
// Before this module the kart sky was TWO unrelated things — a screen-space
// `scene.background` gradient (nailed to the framebuffer, so it never moved
// with the camera) and an open-top CylinderGeometry backdrop whose rim sat
// at ~22.6 degrees elevation inside a 66-degree FOV. Every capture had a
// hard black arc across the upper third, and because the backdrop plate has
// a sun painted into it and tiled 5x, up to three suns could share one
// frame.
//
// What lives here:
//   createSkyUniforms      — the ONE world-space sun (direction + colour)
//                            that the dome, the backdrop rings, the key
//                            light and the fog all read from.
//   createSkyDome          — a closed dome pinned to the far plane: the
//                            elevation gradient, the real sun disc, its two
//                            glow lobes, and a procedural cloud deck.
//   createBackdropRingMaterial — the ring shader: de-sun (erases the plate's
//                            baked sun so only the dome's sun survives) plus
//                            the same glow lobes so the horizon band agrees
//                            with the sun instead of contradicting it.
//
// The ring material lives beside the dome because the two MUST share the sun
// uniform objects — a second copy is how you get two suns again.
//
// Zero new asset bytes: the gradient is the existing makeSkyTexture canvas
// read as a 1D elevation LUT, and the cloud noise is generated procedurally
// at scene build.
import * as THREE from 'three';

// Azimuth 0 = +Z, 90 = +X (the convention the track palettes are authored
// in); elevation 0 = horizon. Returns a UNIT vector pointing FROM the world
// TOWARD the sun, which is both what the dome's dot() wants and where the
// DirectionalLight has to stand.
export const sunDirectionFrom = ({ azimuthDeg = 248, elevationDeg = 12 } = {}, target = new THREE.Vector3()) => {
  const azimuth = THREE.MathUtils.degToRad(azimuthDeg);
  const elevation = THREE.MathUtils.degToRad(elevationDeg);
  const horizontal = Math.cos(elevation);
  return target.set(horizontal * Math.sin(azimuth), Math.sin(elevation), horizontal * Math.cos(azimuth)).normalize();
};

export const createSkyUniforms = ({ sun = {} } = {}) => ({
  uSunColor: { value: new THREE.Color(sun.color || '#ffb85a') },
  uSunDir: { value: sunDirectionFrom(sun) },
});

// Tileable 4-octave value noise for the cloud deck. Deterministic (no
// Math.random — same house rule as makeNoiseTexture) and shared across
// races: one 256² RGBA upload for both tracks.
const NOISE_SIZE = 256;
let sharedCloudNoise = null;
const latticeValue = (x, y, cells, octave) => {
  const wrapped = ((x % cells) + cells) % cells + (((y % cells) + cells) % cells) * cells;
  const n = Math.sin(wrapped * 12.9898 + octave * 78.233) * 43758.5453123;
  return n - Math.floor(n);
};
const smoothT = (t) => t * t * (3 - 2 * t);
const getCloudNoise = () => {
  if (sharedCloudNoise) return sharedCloudNoise;
  const octaves = [
    { cells: 4, gain: 0.5 },
    { cells: 8, gain: 0.26 },
    { cells: 16, gain: 0.15 },
    { cells: 32, gain: 0.09 },
  ];
  const data = new Uint8Array(NOISE_SIZE * NOISE_SIZE * 4);
  for (let y = 0; y < NOISE_SIZE; y += 1) {
    for (let x = 0; x < NOISE_SIZE; x += 1) {
      let sum = 0;
      octaves.forEach(({ cells, gain }, octave) => {
        const fx = (x / NOISE_SIZE) * cells;
        const fy = (y / NOISE_SIZE) * cells;
        const ix = Math.floor(fx);
        const iy = Math.floor(fy);
        const tx = smoothT(fx - ix);
        const ty = smoothT(fy - iy);
        const a = latticeValue(ix, iy, cells, octave);
        const b = latticeValue(ix + 1, iy, cells, octave);
        const c = latticeValue(ix, iy + 1, cells, octave);
        const d = latticeValue(ix + 1, iy + 1, cells, octave);
        sum += (a + (b - a) * tx + (c - a + (a - b - c + d) * tx) * ty) * gain;
      });
      const value = Math.max(0, Math.min(255, Math.round(sum * 255)));
      const offset = (y * NOISE_SIZE + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, NOISE_SIZE, NOISE_SIZE, THREE.RGBAFormat);
  // Mask, not colour: leave it in NoColorSpace so .r is the raw fbm value.
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  // Mipmapped on purpose: the infinite-plane projection makes uv derivatives
  // explode toward the horizon, and unfiltered noise there crawls.
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  sharedCloudNoise = texture;
  return texture;
};

// A ShaderMaterial gets none of three's OUTPUT plumbing for free, and the
// shipped chain runs pmndrs (NoToneMapping + HalfFloat) while ?post=0 runs
// ACES on the renderer — without these the sky would grade differently from
// every other material in the frame. Only the TAIL chunks belong here: three
// already emits colorspace_pars_fragment / linearToOutputTexel (and
// tonemapping_pars_fragment when tone mapping is on) into the fragment
// prefix for every material, so re-including the pars is a redefinition
// error. tonemapping_fragment is itself guarded by #if defined(TONE_MAPPING),
// so it costs nothing on the pmndrs path.
const OUTPUT_TAIL = /* glsl */ `
	#include <tonemapping_fragment>
	#include <colorspace_fragment>`;

// disc / tight halo / broad lobe. The disc is emitted ABOVE 1.0 on purpose:
// that is what makes bloom (luminanceThreshold 1.0) catch it, so the sun
// blooms because it is bright rather than because someone painted a halo.
const SUN_LOBES = /* glsl */ `
vec3 skySunLobes(float sd, vec3 sunColor, float discGain, vec2 glow) {
	return sunColor * (
		smoothstep(0.9985, 0.9994, sd) * discGain +
		pow(sd, 14.0) * glow.x +
		pow(sd, 3.0) * glow.y
	);
}`;

const DOME_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
	vDir = position;
	// .xyww pins every dome fragment to the far plane, so the dome can never
	// clip the world no matter what camera.far the backdrop tier chose.
	gl_Position = (projectionMatrix * modelViewMatrix * vec4(position, 1.0)).xyww;
}`;

const DOME_FRAGMENT = /* glsl */ `
uniform sampler2D uSky;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform vec2 uGlow;
uniform float uHorizonPower;
#ifdef SKY_CLOUDS
uniform sampler2D uCloudNoise;
uniform vec3 uCloudColor;
uniform vec3 uCloudLitColor;
uniform vec2 uCloudBand;
uniform float uCloudScale;
uniform float uCloudStrength;
uniform float uTime;
#endif
varying vec3 vDir;
${SUN_LOBES}
void main() {
	vec3 d = normalize(vDir);
	// uHorizonPower >> 1 spends most of the LUT on the first ~25 degrees,
	// where the backdrop plates live and where the two have to agree; the
	// stops are authored so the LUT value at the plate's rim elevation
	// matches the plate's own top row.
	float t = pow(clamp(d.y, 0.0, 1.0), uHorizonPower);
	vec3 col = texture2D(uSky, vec2(0.5, t)).rgb;
	float sd = max(dot(d, uSunDir), 0.0);
	col += skySunLobes(sd, uSunColor, 2.2, uGlow);
#ifdef SKY_CLOUDS
	// TWO decks at different altitudes, not two octaves of one. Both are
	// infinite-plane projections (they converge on their own, so no geometry
	// and no second draw call), but the divisor FLOOR is what sets a deck's
	// apparent height: 0.055 puts the high deck's convergence right down at
	// the horizon, 0.16 stops the low deck ~9 degrees up. Because the two
	// converge at different elevations and scroll at different rates, turning
	// the camera slides one across the other — that is the parallax a single
	// band could never have, and it still costs exactly two taps.
	vec2 highUv = d.xz / max(d.y, 0.055) * uCloudScale;
	vec2 lowUv = d.xz / max(d.y, 0.16) * uCloudScale * 2.4;
	float high = texture2D(uCloudNoise, highUv + uTime * vec2(0.0016, 0.0008)).r;
	float low = texture2D(uCloudNoise, lowUv - uTime * vec2(0.0044, 0.0021)).r;
	// The fbm taps sit at mean 0.52 with sigma ~0.10, so the coverage band has
	// to straddle that or the deck simply never appears. The low deck runs a
	// tighter band so it stays scattered against the high deck's ceiling.
	float cHigh = smoothstep(uCloudBand.x, uCloudBand.y, high) * smoothstep(0.09, 0.30, d.y);
	float cLow = smoothstep(uCloudBand.x + 0.07, uCloudBand.y + 0.11, low) * smoothstep(0.20, 0.50, d.y);
	col = mix(col, uCloudColor, cHigh * uCloudStrength * 0.78);
	col = mix(col, uCloudColor * 1.07, cLow * uCloudStrength);
	// Lit undersides: the cloud edge facing the sun is what sells the hour.
	col += uCloudLitColor * ((cHigh + cLow) * pow(sd, 4.0) * 0.4);
#endif
	gl_FragColor = vec4(col, 1.0);
${OUTPUT_TAIL}
}`;

// lut: the makeSkyTexture canvas, read as a 1D elevation ramp (v=0 horizon,
// v=1 zenith). clouds:null gates the deck off for the phone tier.
export const createSkyDome = ({ clouds = null, horizonPower = 2.6, glow = [0.3, 0.08], lut, skyUniforms }) => {
  const uniforms = {
    uGlow: { value: new THREE.Vector2(glow[0], glow[1]) },
    uHorizonPower: { value: horizonPower },
    uSky: { value: lut },
    uSunColor: skyUniforms.uSunColor,
    uSunDir: skyUniforms.uSunDir,
  };
  if (clouds) {
    uniforms.uCloudBand = { value: new THREE.Vector2(clouds.band?.[0] ?? 0.46, clouds.band?.[1] ?? 0.64) };
    uniforms.uCloudColor = { value: new THREE.Color(clouds.color || '#ff9a5e') };
    uniforms.uCloudLitColor = { value: new THREE.Color(clouds.litColor || '#ffd9a0') };
    uniforms.uCloudNoise = { value: getCloudNoise() };
    uniforms.uCloudScale = { value: clouds.scale ?? 0.65 };
    uniforms.uCloudStrength = { value: clouds.strength ?? 0.55 };
    uniforms.uTime = { value: 0 };
  }
  const material = new THREE.ShaderMaterial({
    defines: clouds ? { SKY_CLOUDS: '' } : {},
    // depthTest stays ON and the dome renders LAST in the opaque queue. It
    // used to run first with the test off, which meant this shader — two
    // texture taps, three sun lobes and two cloud decks — was evaluated for
    // every pixel of the framebuffer and then thrown away wherever the world
    // overdrew it. A racing frame is 60-70% road, terrain and karts, so
    // running the dome after them lets early-z reject most of it. .xyww still
    // pins every fragment to the far plane, so LEqual against a cleared depth
    // buffer passes exactly where sky is visible and nowhere else.
    depthWrite: false,
    fog: false,
    fragmentShader: DOME_FRAGMENT,
    side: THREE.BackSide,
    uniforms,
    vertexShader: DOME_VERTEX,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1000;
  // vDir is the dome's LOCAL position, so the dome has to sit on the camera
  // for that to be the view direction. One Vector3 copy per frame.
  mesh.onBeforeRender = (renderer, scene, camera) => {
    mesh.position.copy(camera.position);
    mesh.updateMatrixWorld(true);
  };
  return {
    material,
    mesh,
    update: (elapsed) => {
      if (uniforms.uTime) uniforms.uTime.value = elapsed;
    },
  };
};

const RING_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
	vUv = uv;
	vec4 world = modelMatrix * vec4(position, 1.0);
	vWorld = world.xyz;
	gl_Position = projectionMatrix * viewMatrix * world;
}`;

// De-sun: the generated backdrop plates have a sun disc painted into them
// and are wrapped 5x, so the plate alone put up to three suns in one frame.
// Rather than re-export the .webp (byte churn, and the plate is still the
// approved art), the disc is keyed out in the shader: inside an authored
// ellipse, any texel whose key measure exceeds the sky's is replaced by the
// plate's own sky gradient. The key measure is per track — Comeback City's
// disc is flat #ffff5b against a flat #ff6a1f sky (green channel separates
// them cleanly in LINEAR space, which is what texture2D returns), Penguin
// Village's is a soft cream disc inside a warm glow band on a cool storm
// plate (red-minus-blue separates warm sky from cold mountains). Both sets
// were validated by running this exact arithmetic over the decoded plates.
const RING_FRAGMENT = /* glsl */ `
uniform sampler2D map;
uniform float uRepeat;
uniform float uMirror;
uniform float uOpacity;
uniform vec4 uDeSunPatch;
uniform vec3 uDeSunWeights;
uniform vec2 uDeSunRange;
uniform vec3 uDeSunSkyLo;
uniform vec3 uDeSunSkyHi;
uniform vec2 uDeSunSkyBand;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform vec2 uGlow;
uniform vec3 uHazeColor;
uniform vec3 uHaze;
uniform float uHazeBottomFade;
varying vec2 vUv;
varying vec3 vWorld;
${SUN_LOBES}
void main() {
	// Sample through the hardware wrap so mip derivatives stay continuous;
	// the tile-local u is recomputed separately for the de-sun ellipse, whose
	// mask is already 0 at the tile seam.
	vec2 uv = vec2(vUv.x * uRepeat, vUv.y);
	vec4 tex = texture2D(map, uv);
	float tiled = vUv.x * uRepeat;
	float local = fract(tiled);
	local = mix(local, 1.0 - local, step(1.0, mod(floor(tiled), 2.0)) * uMirror);
	vec2 offset = (vec2(local, vUv.y) - uDeSunPatch.xy) / uDeSunPatch.zw;
	float patchMask = 1.0 - smoothstep(0.55, 1.0, length(offset));
	float measure = dot(tex.rgb, uDeSunWeights);
	float key = smoothstep(uDeSunRange.x, uDeSunRange.y, measure) * patchMask;
	vec3 plateSky = mix(uDeSunSkyLo, uDeSunSkyHi, smoothstep(uDeSunSkyBand.x, uDeSunSkyBand.y, vUv.y));
	vec3 col = mix(tex.rgb, plateSky, key);
	// AERIAL PERSPECTIVE. The rings are fog-exempt (the art is pre-hazed and
	// they are camera-anchored, so scene.fog would grade them by a distance
	// that never changes), and the consequence was measurable: a vertical scan
	// through the Comeback City skyline went from rgb(0,0,44) silhouette to
	// rgb(169,103,53) fogged ground across FOUR pixels, and every building at
	// every depth carried the same value. The haze is therefore applied here,
	// keyed off plate height rather than distance: strongest along the bottom
	// of the plate where the silhouettes root into the fogged ground, easing
	// off toward the open sky at the top. uHaze = (amount, vLo, vHi).
	float hazeFall = mix(1.0, 0.28, smoothstep(uHaze.y, uHaze.z, vUv.y));
	col = mix(col, uHazeColor, clamp(uHaze.x * hazeFall, 0.0, 1.0));
	// The plate is opaque across the horizon band, so the dome's glow lobe
	// can never reach it — the ring has to carry the same lobe itself or the
	// haze around the sun stops at the skyline. No disc term: the disc is the
	// dome's, and additive over a building silhouette would read as a bug.
	vec3 d = normalize(vWorld - cameraPosition);
	col += skySunLobes(max(dot(d, uSunDir), 0.0), uSunColor, 0.0, uGlow);
	// The ring's lower rim co-planes with the ground plane, which showed up as
	// a full-width tone step along the horizon. Dissolving the bottom of the
	// plate means the ground always wins that band outright.
	float bottomFade = smoothstep(0.0, uHazeBottomFade, vUv.y);
	gl_FragColor = vec4(col, tex.a * uOpacity * bottomFade);
${OUTPUT_TAIL}
}`;

// deSun: { patch:[cu,cv,ru,rv], weights:[r,g,b], range:[lo,hi],
//          skyLo, skyHi, skyBand:[v0,v1] } — all in plate UV / LINEAR space.
// Pass deSun:null for plates with no baked sun (the near silhouette rows).
// haze: { color, amount, band:[vLo,vHi], bottomFade } — the ring's stand-in
// for scene.fog. The FAR ring must always run a higher amount than the NEAR
// one; that difference IS the depth ramp across the skyline.
export const createBackdropRingMaterial = ({
  deSun = null,
  glow = [0, 0],
  haze = null,
  map,
  mirrored = true,
  repeats = 1,
  skyUniforms,
}) => {
  const patch = deSun?.patch || [0.5, 0.5, 0.0001, 0.0001];
  const hazeBand = haze?.band || [0.32, 0.86];
  return new THREE.ShaderMaterial({
    depthWrite: false,
    fog: false,
    fragmentShader: RING_FRAGMENT,
    side: THREE.BackSide,
    transparent: true,
    uniforms: {
      map: { value: map },
      uDeSunPatch: { value: new THREE.Vector4(patch[0], patch[1], patch[2], patch[3]) },
      uDeSunRange: { value: new THREE.Vector2(...(deSun?.range || [9, 10])) },
      uDeSunSkyBand: { value: new THREE.Vector2(...(deSun?.skyBand || [0, 1])) },
      uDeSunSkyHi: { value: new THREE.Color(deSun?.skyHi || '#ffffff') },
      uDeSunSkyLo: { value: new THREE.Color(deSun?.skyLo || '#ffffff') },
      uDeSunWeights: { value: new THREE.Vector3(...(deSun?.weights || [0, 0, 0])) },
      uGlow: { value: new THREE.Vector2(glow[0], glow[1]) },
      uHaze: { value: new THREE.Vector3(haze?.amount ?? 0, hazeBand[0], hazeBand[1]) },
      uHazeBottomFade: { value: haze?.bottomFade ?? 0.001 },
      uHazeColor: { value: new THREE.Color(haze?.color || '#ffffff') },
      uMirror: { value: mirrored ? 1 : 0 },
      uOpacity: { value: 1 },
      uRepeat: { value: repeats },
      uSunColor: skyUniforms.uSunColor,
      uSunDir: skyUniforms.uSunDir,
    },
    vertexShader: RING_VERTEX,
  });
};
