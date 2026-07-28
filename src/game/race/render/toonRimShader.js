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
import {
  HERO_RIM_KEY_BIAS,
  HERO_RIM_RUBBER_SCALE,
  KART_PAINT_TINT_AMOUNT,
  resolveKartShading,
  tuneHeroTexture,
} from './kartMaterials.js';

// Fresnel rim added to the lit toon color. MeshToonMaterial has no envMap
// in r184, so this injected rim IS the character-pop lever — it lifts kart
// and driver silhouettes off the dark dusk track.
//
// AAA wave 2 round 2: the fresnel alone fired at full strength all the way
// around the silhouette, including the edge the sun cannot see, so the rim
// described nothing about the lighting — it read as a flat coloured outline
// traced onto every hero. It now leans toward the key: same total budget,
// redistributed, so the sunward edge is hotter and the shadow edge keeps only
// enough to hold the silhouette off a dark track (see HERO_RIM_KEY_BIAS).
// Key direction is read out of the light rig rather than taken as a uniform,
// exactly as the kart shading chunk does, so it follows whatever sun the
// track authored with no per-track wiring. `rim`-prefixed locals throughout:
// both chunks land at the same anchor in the same scope, so a shared name
// would be a redeclaration error on any material carrying both.
export const TOON_RIM_CHUNK = /* glsl */ `
	vec3 rimKeyDir = vec3(0.42, 0.72, 0.55);
	#if NUM_DIR_LIGHTS > 0
		float rimKeyWeight = -1.0;
		for (int rimLightIdx = 0; rimLightIdx < NUM_DIR_LIGHTS; rimLightIdx++) {
			float rimLightLum = luminance(directionalLights[rimLightIdx].color);
			if (rimLightLum > rimKeyWeight) {
				rimKeyWeight = rimLightLum;
				rimKeyDir = directionalLights[rimLightIdx].direction;
			}
		}
	#endif
	float toonRimFresnel = pow(1.0 - saturate(dot(geometryNormal, geometryViewDir)), uRimPower);
	// Wide window: at the silhouette N is roughly perpendicular to the view, so
	// N.key sweeps the full -1..1 as the eye travels around the outline. A tight
	// window here would cut the rim into two hard arcs.
	float toonRimKey = mix(
		uRimKeyBias.x,
		uRimKeyBias.y,
		smoothstep(-0.45, 0.35, dot(geometryNormal, normalize(rimKeyDir)))
	);
	// AAA wave 4 round 2 — the rim finally honours the "not on the tyres" rule
	// it has been documented as following since it shipped.
	//
	// This chunk always lands AFTER the kart-shading chunk in the composed
	// fragment shader (addShaderInjection re-replaces the same anchor, so a
	// later entry is inserted between the earlier one and the anchor) and both
	// sit in the same scope, so the classifier's masks are already computed and
	// in scope here — free. The #ifdef is the contract that makes that safe:
	// applyToonRim(material, { shading: null }) is a supported call, and on such
	// a material kartRubberMask simply does not exist. KART_SHADING_CLASSES is
	// #defined by the shading chunk itself, so the guard tracks whether the
	// masks are really there rather than trusting call order.
	float toonRimClass = 1.0;
	#ifdef KART_SHADING_CLASSES
		toonRimClass = mix(1.0, uRimRubberScale, kartRubberMask);
	#endif
	outgoingLight += uRimColor * uRimStrength * uRimStrengthScale * toonRimFresnel * toonRimKey * toonRimClass;`;

const TOON_RIM_PARS = /* glsl */ `uniform vec3 uRimColor;
uniform float uRimStrength;
uniform float uRimStrengthScale;
uniform float uRimPower;
uniform float uRimRubberScale;
uniform vec2 uRimKeyBias;`;

// ONE shared multiplier on every hero rim, so a later wave can push the rim
// with speed (boost = hotter silhouette) with a single float write per frame
// instead of walking the material list. 1 = shipped strength.
export const TOON_RIM_STRENGTH_SCALE = { value: 1 };

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

// AAA wave 2 — four material classes out of one baked albedo.
//
// The audit's read on the karts was "not lit like objects, they are lit like
// decals": pure diffuse toon plus a weak fresnel rim, no specular event
// anywhere on the vehicle. This chunk adds the missing event, and adds it
// several different ways so the surfaces disagree with each other the way
// MK8's do — see kartMaterials.js for why each number is what it is.
//
// It has to work per-texel rather than per-material because every authored
// kart body is one fused mesh carrying one baked map (attachTripoKartBody
// keeps only that map), so there is no "tyre material" to treat differently.
// Paint is chromatic; trim is bright-and-neutral; rubber is dark-and-neutral;
// plastic is everything neutral in between, which round 2 left unclassified
// and therefore unshaded. The four masks are a partition, so no texel can
// collect two specular events, and the whole classifier costs four smoothsteps.
//
// Anchors and symbols verified against the INSTALLED three r184 sources, not
// from memory. At `#include <opaque_fragment>` the meshtoon (and meshphysical)
// fragment has `diffuseColor`, `outgoingLight`, `geometryNormal` and
// `geometryViewDir` in scope; `luminance()` and `viewMatrix` come from the
// renderer's fragment prefix (WebGLProgram.js); `inverseTransformDirection`
// and `saturate` come from <common>; `directionalLights` is declared by
// <lights_pars_begin> under the same NUM_DIR_LIGHTS guard used below.
const KART_SHADING_PARS = /* glsl */ `uniform vec2 uKartPaintChroma;
uniform vec2 uKartChromeLum;
uniform vec2 uKartChromeCeil;
uniform vec2 uKartRubberLum;
uniform vec2 uKartGloss;
uniform vec3 uKartSpecStrength;
uniform vec2 uKartAo;
uniform vec3 uKartSpecTint;
uniform float uKartSpecBlend;
uniform float uKartSpecCeil;
uniform float uKartSkyBounce;
uniform float uKartRubberDarken;
uniform float uKartDarkFill;
uniform float uKartRubberCeil;
uniform vec4 uKartPaintShape;
uniform vec4 uKartTint;
uniform vec4 uKartEnv;
// (fresnel floor, probe ramp low, probe ramp high, unused)
uniform vec4 uKartEnvShape;
// (paint, chrome, plastic, fresnel floor) — the sun's own image, wave 5
uniform vec4 uKartGlint;
// (view-fill strength, view-fill N.V exponent)
uniform vec2 uKartFill;
// The SECOND headroom ceiling, for the terms allowed to blow out — see
// SPEC_BLOOM_CEILING in kartMaterials.js.
uniform float uKartSpecCeilHi;`;

const KART_SHADING_CHUNK = /* glsl */ `
	// Declares that the four class masks below exist in this scope. The rim
	// chunk (which is appended after this one, same scope) branches on it so it
	// can weight itself per class without assuming it was registered alongside
	// a shading pass — see TOON_RIM_CHUNK.
	#define KART_SHADING_CLASSES 1
	// Remaining headroom before the additive terms clip, measured against the
	// PEAK CHANNEL rather than against luminance.
	//
	// A macro rather than a local because every additive term below has to
	// re-read the CURRENT outgoingLight — the sky bounce, the probe and the
	// specular each spend from what the ones before them left, and a snapshot
	// taken once at the top would let three terms all spend the same headroom.
	//
	// Why peak and not luminance: luminance is Rec709-weighted, so red counts
	// 0.21 and blue 0.07. A hot pink or a deep blue body can have a channel
	// past 1.0 while its luminance still reads as a mid surface, and the old
	// meter therefore reported full headroom on a panel that was already
	// clipped — measured at 97% of the Miami Cruiser's flank in
	// comeback-city-p0_15 (see PAINT_SHAPE in kartMaterials.js). peak >=
	// luminance for every colour with equality on neutrals, so this bites
	// exactly on the saturated surfaces that were escaping the meter and leaves
	// the chrome and rubber cases it was tuned for unchanged.
	#define KART_HEADROOM saturate((uKartSpecCeil - max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b))) / uKartSpecCeil)
	// The same meter against the higher ceiling, for the two terms that are
	// SUPPOSED to clip: the cel specular band and the sun glint. A fill that
	// crosses 1.0 is a blown panel; a highlight that never crosses it is not a
	// highlight. See SPEC_BLOOM_CEILING in kartMaterials.js for the measurement.
	#define KART_SPEC_HEADROOM saturate((uKartSpecCeilHi - max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b))) / uKartSpecCeilHi)
	vec3 kartAlbedo = diffuseColor.rgb;
	float kartChroma =
		max(kartAlbedo.r, max(kartAlbedo.g, kartAlbedo.b)) -
		min(kartAlbedo.r, min(kartAlbedo.g, kartAlbedo.b));
	float kartLum = luminance(kartAlbedo);
	float kartPaintMask = smoothstep(uKartPaintChroma.x, uKartPaintChroma.y, kartChroma);
	float kartNeutral = 1.0 - kartPaintMask;
	// Chrome is a BAND-PASS, not a step. Round 1 used the rising edge alone, so
	// any near-white neutral texel scored a full chrome flash — which is what
	// turned the pink kart's baked-white tyres into glossy marshmallows in
	// comeback-city-p0_15. The falling edge retires everything above the
	// ceiling from EVERY specular class (see below): still AO'd, still bounced,
	// still rimmed, but no additive event on a surface that is already at white.
	float kartBrightRetire = smoothstep(uKartChromeCeil.x, uKartChromeCeil.y, kartLum);
	float kartChromeSel = smoothstep(uKartChromeLum.x, uKartChromeLum.y, kartLum);
	float kartRubberSel = 1.0 - smoothstep(uKartRubberLum.x, uKartRubberLum.y, kartLum);
	float kartChromeMask = kartNeutral * kartChromeSel * (1.0 - kartBrightRetire);
	float kartRubberMask = kartNeutral * kartRubberSel;
	// The fourth class is whatever the other three did not claim: neutral, but
	// too dark for chrome and too bright for rubber. Round 2 gave that band
	// nothing at all, and it is where mid-grey unpainted plastic lives — roll
	// bars, seat shells, bumpers. Defined as the leftover rather than as its
	// own window so the four masks stay a partition and no texel can ever
	// collect two specular events.
	float kartPlasticMask =
		kartNeutral * (1.0 - kartBrightRetire) * (1.0 - kartChromeSel) * (1.0 - kartRubberSel);

	// Key direction = the brightest directional light, already in VIEW space
	// and already premultiplied by intensity by WebGLLights. Reading it out of
	// the light rig instead of taking a uniform means the highlight tracks
	// whatever sun each track authored with zero per-track wiring, and it stays
	// correct if a later wave re-aims the key.
	vec3 kartKeyDir = vec3(0.42, 0.72, 0.55);
	vec3 kartKeyColor = vec3(1.0);
	#if NUM_DIR_LIGHTS > 0
		float kartKeyWeight = -1.0;
		for (int kartLightIdx = 0; kartLightIdx < NUM_DIR_LIGHTS; kartLightIdx++) {
			float kartLightWeight = luminance(directionalLights[kartLightIdx].color);
			if (kartLightWeight > kartKeyWeight) {
				kartKeyWeight = kartLightWeight;
				kartKeyDir = directionalLights[kartLightIdx].direction;
				kartKeyColor = directionalLights[kartLightIdx].color;
			}
		}
	#endif
	kartKeyDir = normalize(kartKeyDir);

	// ---- The track's own light, as three normalised HUES --------------------
	// Hoisted above the fill in wave 5 because two terms now need it (the
	// camera-anchored fill and the sky probe) and a second copy would be a
	// second place for the track's palette to be read differently.
	//
	// Hue from the track, MAGNITUDE from the weights that use these. The
	// hemisphere and directional uniforms arrive premultiplied by intensity
	// (WebGLLights), and borrowing their energy as well as their colour would
	// make every consumer a second fill light and lift the whole kart — exactly
	// the kind of ambient drift that would regress an owner-confirmed grade.
	// Normalising to a max channel of 1 keeps each term's entire budget inside
	// its own uniform.
	vec3 kartEnvSky = vec3(0.30, 0.32, 0.52);
	vec3 kartEnvGround = vec3(0.08, 0.07, 0.11);
	#if NUM_HEMI_LIGHTS > 0
		kartEnvSky = hemisphereLights[0].skyColor;
		kartEnvGround = hemisphereLights[0].groundColor;
	#endif
	kartEnvSky /= max(1e-4, max(kartEnvSky.r, max(kartEnvSky.g, kartEnvSky.b)));
	kartEnvGround /= max(1e-4, max(kartEnvGround.r, max(kartEnvGround.g, kartEnvGround.b)));
	vec3 kartEnvHorizon = kartKeyColor / max(1e-4, max(kartKeyColor.r, max(kartKeyColor.g, kartKeyColor.b)));

	// Half-vector against the key: the band slides across the cowl as the kart
	// YAWS, which is the cue that reads as a solid glossy object rather than a
	// painted sprite. pow() shapes the lobe, smoothstep cuts it into a cel band.
	float kartNdH = saturate(dot(geometryNormal, normalize(kartKeyDir + geometryViewDir)));
	float kartPaintBand = smoothstep(0.42, 0.52, pow(kartNdH, uKartGloss.x));
	float kartChromeBand = smoothstep(0.42, 0.52, pow(kartNdH, uKartGloss.y));
	// No shadow term is reachable here (meshtoon does not include
	// <shadowmask_pars_fragment>), so gate on N.L instead — enough to stop a
	// highlight firing on a face the key cannot see.
	float kartLitMask = smoothstep(0.02, 0.3, dot(geometryNormal, kartKeyDir));

	// Curvature AO, deliberately light-INDEPENDENT: undertrays, wheel wells and
	// seat interiors have to stay dark even when the low sun rakes straight
	// under the kart. World up, not view up — the kart yaws every frame.
	vec3 kartWorldNormal = inverseTransformDirection(geometryNormal, viewMatrix);
	float kartAo = mix(uKartAo.x, 1.0, smoothstep(-0.35, 0.85, kartWorldNormal.y));
	// Screen-space derivative of the normal: ~0 across a flat facet, large
	// across a crease, so hard edges ink themselves without a second pass.
	kartAo *= 1.0 - uKartAo.y * smoothstep(0.1, 0.8, length(fwidth(geometryNormal)));

	// Per-racer paint tint, selecting itself off the same chroma mask so tyres,
	// trim and decals never take the racer colour. Luminance-preserving, so the
	// baked panel shading survives the recolour. Amount is 0 unless a caller
	// opts a body in via setKartPaintTint.
	//
	// AAA wave 5 round 2 — THE RESCALE IS BOUNDED NOW, and the missing bound was
	// a blocker. luminance(lit) / luminance(tint) is unbounded, and it is large
	// for every colour on the roster: a saturated hue carries far more peak
	// channel than Rec709 luminance (crrt-bunny 4.33x, lifoladen 3.93x, tclow
	// 4.84x), so a body lit to luminance 0.4 was handed a tint whose peak channel
	// was already 1.6-1.9 in linear light before any other term ran. Measured
	// consequence in comeback-city-p0_15: the Miami Cruiser, authored #8e1a43 —
	// a dark wine — renders rgb(253,110,148), and 9,178 of 55,250 sampled pixels
	// in its region carry a railed channel against 358 in the same box in
	// wave4-r3. (The two captures do not frame that kart identically, so treat
	// the 358 -> 9,178 step as corroboration rather than as the proof; the proof
	// is the arithmetic above, which rails without reference to any frame.) A
	// railed channel has no gradation left, and the compressor twelve lines below
	// then folds a 1.6 overshoot into a 0.16-wide band, which flattens whatever
	// the bake still had. See KART_PAINT_TINT_AMOUNT for the full derivation.
	//
	// The cap is the surface's OWN peak, or the paint compressor's ceiling,
	// whichever is higher: a dark body can still be lifted to a legible hue, and
	// no body can be pushed past the value the compressor is about to enforce
	// anyway. One factor across all three channels, so this is exposure only —
	// the hue the owner picked is preserved exactly, which is the whole point of
	// the term. min() makes it one-sided: a tint that was not going to clip is
	// untouched and keeps full luminance preservation.
	float kartTintPeak = max(uKartTint.r, max(uKartTint.g, uKartTint.b));
	float kartLitPeak = max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b));
	float kartTintScale = min(
		luminance(outgoingLight) / max(1e-4, luminance(uKartTint.rgb)),
		max(kartLitPeak, uKartPaintShape.w) / max(1e-4, kartTintPeak)
	);
	vec3 kartTinted = uKartTint.rgb * kartTintScale;
	outgoingLight = mix(outgoingLight, kartTinted, kartPaintMask * uKartTint.a);
	outgoingLight *= kartAo * mix(1.0, uKartRubberDarken, kartRubberMask);

	// Paint gets a THIRD value. The curvature AO above is light-independent by
	// design, so on a body lit by one broad key the whole flank lands on a
	// single toon ramp step: measured spread across the Miami Cruiser's side
	// panel was 24 out of 255. This is the shadow-side step the AO deliberately
	// is not — keyed on N.L so it describes where the sun is, and restricted to
	// the paint class so it cannot deepen a tyre that RUBBER_DARKEN has already
	// taken down.
	float kartPaintShade = mix(uKartPaintShape.x, 1.0, smoothstep(-0.10, 0.42, dot(geometryNormal, kartKeyDir)));
	outgoingLight *= mix(1.0, kartPaintShade, kartPaintMask);

	// ...and paint gets its range back. A saturated body spends its whole range
	// in one channel and pins there, so the gradation the bake and the two
	// terms above are producing exists entirely above 1.0 where nothing can
	// show it. Scaling the colour uniformly is hue-exact (all three channels
	// take the same factor — this moves exposure, never tint) and it is what
	// makes every additive term below land ON a panel instead of being metered
	// away against a surface that was already clipped. Ordered here, before the
	// additive terms, for exactly that reason.
	//
	// AAA wave 4 round 2 — SOFT KNEE, not a divide. The round-2 form was
	// knee / max(knee, peak) at knee = 1.0, which is a no-op below 1.0 and an
	// insufficient correction above it: a panel at peak 1.6 came out at 1.18 and
	// stayed pinned at white, and the headroom meter then had nothing left to
	// give the specular band (measured: 18 frames, no paint hotspot in any of
	// them). See PAINT_SHAPE in kartMaterials.js for the full table.
	//
	// over/(over + range) is monotone and asymptotic to the ceiling, so an
	// arbitrarily overexposed panel is folded into the band between knee and
	// ceiling AND texels that differed above 1.0 still differ below it. Nothing
	// below the knee is touched at all, so a dark body is unaffected.
	float kartPaintPeak = max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b));
	float kartPaintRange = max(1e-4, uKartPaintShape.w - uKartPaintShape.y);
	float kartPaintOver = max(0.0, kartPaintPeak - uKartPaintShape.y);
	float kartPaintTarget = uKartPaintShape.y + kartPaintOver * kartPaintRange / (kartPaintOver + kartPaintRange);
	// min() is NOT redundant. Below the knee kartPaintOver is 0, so the target
	// is the knee itself and the raw ratio is knee/peak > 1 — i.e. without this
	// the compressor would BRIGHTEN every dark paint texel up to the knee, which
	// is the exact opposite of the term's job and would flatten the shadow side
	// of every body into the same value. This is a one-sided compressor: it may
	// only ever pull down.
	float kartPaintPull = min(1.0, kartPaintTarget / max(1e-4, kartPaintPeak));
	outgoingLight *= mix(1.0, mix(1.0, kartPaintPull, uKartPaintShape.z), kartPaintMask);

	// ---- Camera-anchored fill (AAA wave 5) ---------------------------------
	// Comeback City's sun is DOWN-TRACK, so the chase camera looks at the one
	// face of the kart the key cannot reach and the hero measures as the darkest
	// object in a blazing frame (rear paint rgb(83,60,67) against a mid-frame
	// mean of rgb(99,69,80) in cc-p0_78). Every other term in this chunk makes
	// that worse: the AO and the paint shade step both darken the away side, and
	// the specular band is keyed on H = normalize(L + V), which is DEGENERATE
	// when the sun is behind the subject — a backlit kart cannot have a
	// half-vector highlight at all. That is the structural reason three critics
	// read 18 frames and found no paint hotspot in any of them.
	//
	// Two gates make this a fill rather than an exposure lift. It is shaped on
	// N.V with an exponent above 1, so it concentrates on the panels square to
	// the lens — the exact half of the body the Schlick-shaped probe below does
	// NOT cover, so the two are complements and their sum keeps orientation
	// structure instead of averaging into a wash. And it is multiplied by
	// (1 - kartLitMask), so it can only ever fill where the key does not reach:
	// on a front-lit track it is ~0 and nothing moves, which is what stops it
	// drifting an owner-confirmed grade.
	//
	// MULTIPLICATIVE, and that is the whole difference between this working and
	// this making the kart worse. Measured on a backlit toon body under the
	// Penguin Village rig, an ADDITIVE fill at the same effective lift moved the
	// vertical profile from 130 / 70 / 112 to 131 / 104 / 127 — i.e. it raised
	// the mean by 21 levels and destroyed 33 of the 60-level top-to-bottom value
	// break in the process. That is arithmetic, not tuning: every additive term
	// here is metered by KART_HEADROOM, headroom is largest exactly where the
	// surface is darkest, so any additive fill necessarily lands hardest on the
	// part of the body that is carrying the form. Brighter and flatter is the
	// one trade this package must not make — flat is the finding.
	//
	// A gain preserves ratios. Same test, same lift, applied as (1 + k): the
	// break costs 10 levels instead of 33 (60.3 -> 50.0), and with the probe and
	// glint stacked on top the body's overall value SPREAD comes out ABOVE where
	// it started (111.2 -> 121.6) with its peak up 24 levels. It is an exposure
	// change scoped to one object — exactly what "the hero is the darkest thing
	// in the frame" asks for, and exactly what must never be done to the scene.
	// The residual ~8 levels of break is what a fill light costs; it is the
	// intended trade, and it is a tenth of the frame's dynamic range rather than
	// half of the body's.
	//
	// Still metered by KART_HEADROOM, so the gain tapers to nothing as a panel
	// approaches the ceiling — Penguin Village's already-bright paint takes
	// roughly a fifth of what Comeback City's dark rear does. Rubber excluded:
	// the tyres are the value anchor, and an anchor that moves is not one.
	float kartFillFace = pow(saturate(dot(geometryNormal, geometryViewDir)), uKartFill.y);
	outgoingLight *= 1.0 + uKartFill.x * kartFillFace * (1.0 - kartLitMask)
		* (1.0 - kartRubberMask) * KART_HEADROOM;

	// Sky bounce — the only form cue that survives on a texel the classifier
	// has retired (baked-white tyres, the frosted shell). Albedo-tinted so it
	// reads as light the surface returned rather than as a grey wash, and
	// metered against the same lit headroom as the specular so it can only
	// spend what the surface still has, never clip.
	outgoingLight += uKartSkyBounce
		* saturate(kartWorldNormal.y)
		* kartAlbedo
		* KART_HEADROOM;

	// ---- Analytic sky probe (AAA wave 4) ----------------------------------
	// scene.environment cannot reach a kart: WebGLRenderer.js:2165 gates it on
	// isMeshStandardMaterial/Lambert/Phong, and every hero body is toon. This is
	// the same probe raceEnvironment.js installs for the track, evaluated in
	// closed form, and it is the term that answers the standing critic note
	// that a rival kart is "one flat colour across a curved body with zero
	// value change": every other event in this chunk is a lobe that a
	// flat-shaded facet either contains or does not, whereas a reflection
	// returns a different sky colour per facet normal and slides continuously
	// as the kart yaws.
	//
	// Colours come out of the LIGHT RIG the track already authored — hemisphere
	// sky/ground for the dome, the key light for the horizon band — rather than
	// from uniforms, so this is correct per track with zero wiring and cannot
	// drift out of agreement with the sky actually being rendered. Resolved
	// above, next to the key light they are read from.
	//
	// World space throughout: the kart yaws every frame, so a view-space
	// reflection would slide with the CAMERA instead of with the body.
	vec3 kartWorldView = inverseTransformDirection(geometryViewDir, viewMatrix);
	vec3 kartRefl = reflect(-kartWorldView, kartWorldNormal);
	vec3 kartKeyWorld = inverseTransformDirection(kartKeyDir, viewMatrix);
	// Ramp edges are uniforms since wave 4 round 2. The reflection vectors off a
	// kart's visible facets cluster in a narrow band around the horizon (a chase
	// camera looks slightly down at a mostly-vertical rear), so a ramp that
	// spent its contrast across 0.72 of reflected-Y returned near-identical
	// colour to every facet — which is most of why this term measured as no
	// change at all on the two rivals it was written for. See ENV_PROBE.rampLo.
	vec3 kartProbe = mix(kartEnvGround, kartEnvSky, smoothstep(uKartEnvShape.y, uKartEnvShape.z, kartRefl.y));
	// The warm band sits where the sun does — low. pow() on |y| keeps it inside
	// roughly the bottom 25 degrees of the reflected hemisphere, which is where
	// both tracks author their hot horizon stop.
	kartProbe = mix(kartProbe, kartEnvHorizon, pow(1.0 - min(1.0, abs(kartRefl.y)), 2.4) * 0.62);
	// Schlick-shaped: a facet turned edge-on to the eye returns far more of the
	// sky than one facing it. This is what puts the sheen on the SHOULDER of a
	// panel and off its centre, and it is most of why the term reads as a
	// reflection rather than as a wash.
	//
	// The FLOOR is the whole argument and it was hard-coded at 0.28, which meant
	// every front-facing facet — the large ones, the ones that fill the
	// silhouette — collected 28% of the same probe colour unconditionally. That
	// floor is a flat tint over most of the visible body, and it is why the
	// rivals stayed 81-85% adjacent-flat and why the hero's red paint measured
	// out at saturation 0.19. Now a uniform (0.09), so the term is genuinely
	// orientation-driven: per-facet variation up, mean contribution down.
	float kartEnvFresnel = mix(uKartEnvShape.x, 1.0, pow(1.0 - saturate(dot(geometryNormal, geometryViewDir)), 3.0));
	float kartEnvWeight = kartEnvFresnel * (
		uKartEnv.x * kartPaintMask +
		uKartEnv.y * kartChromeMask +
		// The bright-neutral band CHROME_CEILING retires (baked-white tyres, the
		// Ice Racer's frosted shell, the Kenney atlas's white panels) is folded
		// in at the plastic weight rather than dropped. It is the class carrying
		// the least form information of the four — it is retired precisely
		// BECAUSE nothing additive fits on it — and a reflection is the one
		// directional term it can still take, since the headroom meter below
		// falls to zero exactly where those texels already sit. Rubber is the
		// only class with no share at all; matte is the whole point of it.
		uKartEnv.z * (kartPlasticMask + kartNeutral * kartBrightRetire)
	);
	outgoingLight += kartProbe * kartEnvWeight * KART_HEADROOM;

	// ---- The sun's own image in the surface (AAA wave 5) -------------------
	// Through wave 4 this was one line INSIDE kartProbe, which meant it
	// inherited the ambient reflection's fresnel floor, its class weights and
	// its headroom meter. All three are wrong for a glint, and the product of
	// the three is why nobody has ever seen it: on a rear panel it evaluated to
	// 0.09 (ambient floor) x 0.22 (paint weight) x 0.19 (fill headroom) = 0.4%
	// of the horizon colour. Four parts in a thousand.
	//
	// WHAT THIS IS NOT — stated because the obvious argument for splitting it
	// out is wrong, and someone will re-derive it. This does NOT reach geometry
	// the cel band cannot: dot(reflect(-V, N), L) is maximised at exactly
	// N = normalize(L + V), so it is the Phong statement of the same Blinn
	// condition and it is degenerate on a fully backlit subject for the same
	// reason. NOTHING keyed on the sun's position can put a highlight on a face
	// the sun cannot see. That case belongs to the camera-anchored fill above
	// and to the fresnel-shaped ambient probe, and those are the two terms
	// carrying Comeback City.
	//
	// What the split buys is that on every stretch where the sun is NOT directly
	// behind the kart — most of a lap on both tracks, since the body yaws
	// through the full circle while the sun stays put — the glint is finally
	// strong enough to see. It gets its own fresnel floor (high: a glint is
	// largely orientation-independent once it fires, and it is the LOBE that
	// localises it, not the fresnel), its own per-class weights, and the BLOOM
	// ceiling, because a highlight that cannot cross 1.0 is not a highlight.
	// uKartEnv.w at 26 is a ~13 degree half-angle window: a hot spot travelling
	// across a cowl through a bend, not a second key light.
	float kartGlintFresnel = mix(uKartGlint.w, 1.0, pow(1.0 - saturate(dot(geometryNormal, geometryViewDir)), 3.0));
	float kartGlintLobe = pow(max(dot(kartRefl, kartKeyWorld), 0.0), uKartEnv.w);
	// Same four-class partition as the ambient probe, including the retired
	// bright band folded in at the plastic weight. Rubber gets nothing: a matte
	// surface has no mirror direction to return the sun from.
	outgoingLight += kartEnvHorizon * kartGlintLobe * kartGlintFresnel * (
		uKartGlint.x * kartPaintMask +
		uKartGlint.y * kartChromeMask +
		uKartGlint.z * (kartPlasticMask + kartNeutral * kartBrightRetire)
	) * KART_SPEC_HEADROOM;

	// ---- Dark-class form fill (AAA wave 4 round 2) -------------------------
	// The one term in this file that does anything at all on a near-black
	// texel. Everything else either darkens it (AO, RUBBER_DARKEN), multiplies
	// by its albedo and returns nothing (SKY_BOUNCE), or excludes the class on
	// purpose (the probe weights above) — which is why the player's driver
	// measures as a solid black shape with no readable form at 300px in
	// comeback-city-p0_06, held off the road by the rim alone.
	//
	// Deliberately NOT albedo-tinted and deliberately not a lobe: it is the
	// same two-band hemisphere the probe is built on, so an up-facing surface
	// returns the sky's hue and a down-facing one the ground's, giving a black
	// body a top-to-bottom value break that follows the track's own palette.
	// Reuses kartRubberMask so the tyres' contract still holds — this adds no
	// gloss and no highlight, only the value gradient that stops a matte black
	// surface reading as a hole. Headroom-metered like everything else.
	//
	// AAA wave 4 round 2 — the RAMP is new and it is the difference between a
	// value break and a fill light. Round 2 shipped mix(ground, sky, ...)
	// alone, which never returns zero: a fully down-facing normal still took the
	// full uKartDarkFill, just in the ground's hue. So the term lifted the whole
	// tyre uniformly (measured mean rgb(120,110,117) on a #10121c tyre) while
	// only its HUE varied top to bottom. Multiplying by a second ramp that
	// reaches zero underneath is what makes it a crown light: lit top, black
	// undercarriage, which is what a matte black surface needs to read as a
	// solid rather than as a hole. Magnitude came down alongside it (0.13 ->
	// 0.05) — see DARK_FILL.
	float kartDarkLift = smoothstep(-0.35, 0.9, kartWorldNormal.y);
	outgoingLight += mix(kartEnvGround, kartEnvSky, smoothstep(-0.55, 0.85, kartWorldNormal.y))
		* uKartDarkFill * kartDarkLift * kartRubberMask * KART_HEADROOM;

	vec3 kartSpec = kartLitMask * (
		mix(vec3(1.0), uKartSpecTint, uKartSpecBlend) * (uKartSpecStrength.x * kartPaintBand * kartPaintMask) +
		// Unpainted plastic borrows the paint lobe (no extra pow) at a third of
		// the strength and half the tint pull: a duller, more neutral event.
		mix(vec3(1.0), uKartSpecTint, uKartSpecBlend * 0.5) * (uKartSpecStrength.z * kartPaintBand * kartPlasticMask) +
		vec3(uKartSpecStrength.y * kartChromeBand * kartChromeMask)
	);
	// Additive specular on an already-lit surface is unbounded. Round 1 spent
	// it against the ALBEDO's headroom, which is the wrong quantity — a mid
	// texel standing in full key is already near 1.0 by the time the band
	// fires. Measured against the LIT result instead, the band lifts dark and
	// mid surfaces hard and eases to nothing on anything the key has already
	// taken to white, so the highlight can no longer flatten a panel into a
	// featureless blob.
	//
	// AAA wave 5 — against the BLOOM ceiling, not the fill ceiling. The band is
	// a 13-24 degree lobe landing on a handful of facets; the terms above it are
	// broad washes. Sharing one meter meant the flash was bounded by a number
	// authored to stop a wash blowing out a whole panel, and on the rivals that
	// measure 97% adjacent-flat with 64% of their fill budget unspent, chrome's
	// 0.95 came out at 0.27 of add — a lighter shade of paint rather than light.
	// See SPEC_BLOOM_CEILING. Still bounded, still eases to nothing on a surface
	// the key already took to white; it is now allowed to cross 1.0 and reach
	// the post chain's bloom threshold, which is the whole read.
	outgoingLight += kartSpec * KART_SPEC_HEADROOM;

	// ---- Rubber's soft ceiling (AAA wave 4 round 2) ------------------------
	// The class contract is "dead matte, and the value anchor the other three
	// classes are read against". That contract was being enforced only by every
	// other term in the file happening to stay small, and in round 2 one of them
	// did not (DARK_FILL at 0.13 put the player's tyres at a measured median
	// luminance of 108). This makes the contract a property of the class instead
	// of an emergent one.
	//
	// A soft knee, not a min(): a hard clamp would flatten the tyre's crown into
	// a plate and undo the very gradient two lines above exist to give it. Same
	// asymptotic fold as the paint compressor, so it is monotone — a brighter
	// texel stays brighter, it just stays under the ceiling.
	//
	// Deliberately LAST in this chunk, and deliberately not the last word: the
	// rim chunk composes after this one (addShaderInjection re-replaces the same
	// anchor, so a later entry lands between this and <opaque_fragment>) and
	// adds its own silhouette term afterwards. That is intended — the rim is
	// what holds a black tyre off a black road — and it is why
	// HERO_RIM_RUBBER_SCALE has to stay small independently of this.
	float kartRubberPeak = max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b));
	float kartRubberOver = max(0.0, kartRubberPeak - uKartRubberCeil);
	float kartRubberTarget = uKartRubberCeil + kartRubberOver * uKartRubberCeil / (kartRubberOver + uKartRubberCeil);
	// One-sided, for the same reason the paint compressor is: below the ceiling
	// the raw ratio exceeds 1 and would LIFT a genuinely black texel up to it,
	// turning a ceiling into a floor and greying the exact surface this class
	// exists to keep dark.
	outgoingLight *= mix(1.0, min(1.0, kartRubberTarget / max(1e-4, kartRubberPeak)), kartRubberMask);`;

// Adds the paint / chrome / plastic / rubber split to a hero material. Composed through
// addShaderInjection like everything else — never assigned directly — so it
// stacks with the rim (and with anything a later wave registers).
export const applyKartShading = (material, overrides = null) => {
  // Merged, not taken whole: applyToonRim lets a caller hand in a partial
  // shading object, and a missing vec2 here would throw at spread time rather
  // than degrade.
  const params = overrides ? { ...resolveKartShading(), ...overrides } : resolveKartShading();
  // Sampling, not shading, but this is the one funnel every hero albedo map
  // passes through — kart bodies, seated drivers, marchers and item boxes all
  // reach it via applyHeroRim. Doing it at material-build time means the
  // texture is re-uploaded before its first draw, not mid-race.
  tuneHeroTexture(material.map, params.textureAnisotropy);
  return addShaderInjection(material, {
    fragmentAnchor: '#include <opaque_fragment>',
    fragmentChunk: KART_SHADING_CHUNK,
    fragmentPars: KART_SHADING_PARS,
    name: 'kart-shading-v1',
    uniforms: {
      uKartAo: { value: new THREE.Vector2(params.aoFloor, params.aoCrease) },
      uKartChromeCeil: { value: new THREE.Vector2(...params.chromeCeiling) },
      uKartChromeLum: { value: new THREE.Vector2(...params.chromeLuminance) },
      uKartDarkFill: { value: params.darkFill },
      uKartEnv: {
        value: new THREE.Vector4(
          params.envPaint,
          params.envChrome,
          params.envPlastic,
          params.envSunSharp
        ),
      },
      // (fresnel floor, probe ramp low, probe ramp high, spare)
      uKartEnvShape: {
        value: new THREE.Vector4(params.envFresnelFloor, params.envRamp[0], params.envRamp[1], 0),
      },
      // (view-fill strength, N.V exponent)
      uKartFill: { value: new THREE.Vector2(params.viewFillStrength, params.viewFillExponent) },
      // (paint, chrome, plastic, the glint's OWN fresnel floor — deliberately
      //  much higher than the ambient probe's; see ENV_PROBE.glintFloor)
      uKartGlint: {
        value: new THREE.Vector4(
          params.glintPaint,
          params.glintChrome,
          params.glintPlastic,
          params.glintFloor
        ),
      },
      uKartGloss: { value: new THREE.Vector2(params.paintGloss, params.chromeGloss) },
      uKartPaintChroma: { value: new THREE.Vector2(...params.paintChroma) },
      // (shadow-side step, compressor knee, how much of the correction to take,
      //  compressor ceiling — the asymptote the knee folds the overshoot into)
      uKartPaintShape: {
        value: new THREE.Vector4(
          params.paintShade,
          params.paintKnee,
          params.paintPull,
          params.paintCeiling
        ),
      },
      uKartRubberCeil: { value: params.rubberCeiling },
      uKartRubberDarken: { value: params.rubberDarken },
      uKartRubberLum: { value: new THREE.Vector2(...params.rubberLuminance) },
      uKartSkyBounce: { value: params.skyBounce },
      uKartSpecBlend: { value: params.specTintBlend },
      uKartSpecCeil: { value: params.specCeiling },
      uKartSpecCeilHi: { value: params.specBloomCeiling },
      uKartSpecStrength: {
        value: new THREE.Vector3(params.paintStrength, params.chromeStrength, params.plasticStrength),
      },
      // Same shared Color object the rim rides, so palette moments retint the
      // paint highlight and the rim together in one write.
      uKartSpecTint: TOON_RIM_SHARED_TINT,
      uKartTint: { value: new THREE.Vector4(1, 1, 1, 0) },
    },
  });
};

// Opt a body into the per-racer paint tint. Call AFTER applyToonRim /
// applyKartShading (it writes into the injection's own uniform), passing the
// racer's colour — KART_PAINT_TINTS in kartMaterials.js mirrors the roster.
export const setKartPaintTint = (material, tint, amount = KART_PAINT_TINT_AMOUNT) => {
  const entry = material.userData.shaderInjections?.find((item) => item.name === 'kart-shading-v1');
  if (!entry || !tint) return material;
  const color = new THREE.Color(tint);
  entry.uniforms.uKartTint.value.set(color.r, color.g, color.b, amount);
  return material;
};

// Palette-tinted fresnel rim for the hero set (karts, drivers, marchers,
// item boxes — never scenery: rim-on-everything cheapens the read).
// Defaults are the execution-plan starting values; the owner-gated rim lab
// picks the shipped numbers.
//
// AAA wave 2: this now ALSO installs the kart material classes, registered
// first so the rim lands on top of the AO'd, specular'd surface rather than
// underneath it. Doing it here is what keeps the package at zero monolith
// edits — applyHeroRim is already wired at all six hero call sites. Pass
// `shading: null` for a hero material that should stay flat-toon.
// Consequence worth knowing: applyHeroRim no-ops entirely when a track ships
// no palette.heroRim (and under the ?rimLab=0 diagnostic), so a track without
// that key now loses the material classes too, not just the rim — including,
// since wave 4, the sky probe that is the karts' only environment term.
export const applyToonRim = (material, { strength = 0.32, power = 2.6, shading } = {}) => {
  if (shading !== null) applyKartShading(material, shading || null);
  return addShaderInjection(material, {
    fragmentAnchor: '#include <opaque_fragment>',
    fragmentChunk: TOON_RIM_CHUNK,
    fragmentPars: TOON_RIM_PARS,
    name: 'toon-rim-v1',
    uniforms: {
      uRimColor: TOON_RIM_SHARED_TINT,
      // See kartMaterials.js: Comeback City ships HALF the rim strength of
      // Penguin Village, on the darker of the two tracks. The floor lifts CC
      // only; PV's authored values already clear it. Temporary — it belongs
      // in the track palette.
      uRimKeyBias: { value: new THREE.Vector2(...HERO_RIM_KEY_BIAS) },
      // Authored values, unclamped. Wave 2's floor/ceiling here retired in
      // wave 4 — see the note in kartMaterials.js: both shipped tracks now
      // carry their real heroRim numbers and clear the old floor exactly, so
      // the clamps were a verified no-op that could only ever silently
      // override a third track's art direction.
      uRimPower: { value: power },
      // Per-class rim weight. See HERO_RIM_RUBBER_SCALE — this is what stops
      // the rim tracing the tyres it was always documented as skipping.
      uRimRubberScale: { value: HERO_RIM_RUBBER_SCALE },
      uRimStrength: { value: strength },
      uRimStrengthScale: TOON_RIM_STRENGTH_SCALE,
    },
  });
};
