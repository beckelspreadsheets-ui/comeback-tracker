// AAA wave-2 "post-chain-and-mood": the boost response.
//
// The audit's finding was that a boost frame and a cruise frame are the same
// image with a different number in the HUD — everything selling speed lived in
// world-space particles, and those are the ones the critics kept reading as
// "opaque sticks lying on the road". A radial screen blur cannot be mistaken
// for geometry: it has no silhouette, it cannot intersect the track, and it
// only exists while the boost does.
//
// Explicitly NO depth of field. MK8 does not blur during gameplay and the
// audit's brief says so outright; this is a motion cue, not a lens cue.
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing';
import * as THREE from 'three';

// 8 taps, and the chroma split is free: instead of three separate passes at
// three offsets, R/G/B walk the SAME ray at 1.00 / 1.06 / 1.12 of the streak
// length, so the fringing falls out of the sampling that was happening anyway.
const SPEED_BLUR_FRAGMENT = /* glsl */ `
uniform vec2 uCenter;
// x = streak length (uv), y = clear-radius, z = punch (contrast/sat lift)
uniform vec3 uBoost;
// x/y = near ramp-IN (metres), z/w = far ramp-OUT (metres)
uniform vec4 uDepthBand;

#define SPEED_BLUR_TAPS 8

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
	// Uniform branch: coherent across the entire draw, so a cruise frame pays
	// for one comparison and nothing else. This is what lets the effect live
	// inside the shared grade pass instead of needing a pass of its own (a
	// toggled pass would have to re-shuffle renderToScreen every frame).
	if (uBoost.x < 0.0015) {
		outputColor = inputColor;
		return;
	}
	// Depth band. Round 1 ran the streak field over the WHOLE frame, and the
	// artefact hunter caught it smearing the sky, the far skyline and — worst —
	// the player's own bodywork at near-plane range, where a uv-space radius is
	// enormous in world terms. Forward motion produces screen-space velocity
	// proportional to 1/distance, so the sky genuinely does not move and the
	// far belt barely does: hazing them is a lens artefact, not a motion cue.
	// The near ramp buys back the kart, whose silhouette has to stay readable
	// at 280 km/h more than anything else in the frame.
	float dist = -getViewZ(depth);
	float depthMask = smoothstep(uDepthBand.x, uDepthBand.y, dist) *
		(1.0 - smoothstep(uDepthBand.z, uDepthBand.w, dist));
	if (depthMask < 0.01) {
		outputColor = inputColor;
		return;
	}
	// Aspect-corrected so the streaks stay radial on a 16:9 frame instead of
	// stretching into an ellipse that reads as a lens fault.
	vec2 offset = (uv - uCenter) * vec2(aspect, 1.0);
	float radius = length(offset);
	// The centre of the frame is where the player is reading the road. Keeping
	// it sharp is the difference between "fast" and "I cannot see".
	float mask = smoothstep(uBoost.y, 0.72, radius) * depthMask;
	float amount = uBoost.x * mask;
	vec2 ray = (uv - uCenter) * amount;
	vec3 sum = vec3(0.0);
	for (int i = 0; i < SPEED_BLUR_TAPS; ++i) {
		float t = float(i) / float(SPEED_BLUR_TAPS - 1);
		sum.r += texture2D(inputBuffer, uv - ray * (t * 1.00)).r;
		sum.g += texture2D(inputBuffer, uv - ray * (t * 1.06)).g;
		sum.b += texture2D(inputBuffer, uv - ray * (t * 1.12)).b;
	}
	sum /= float(SPEED_BLUR_TAPS);
	vec3 color = mix(inputColor.rgb, sum, smoothstep(0.0, 0.012, amount));
	// The punch. Blur alone reads as a dropped frame; MK8's boost also gets
	// hotter and more saturated. Pivot 0.18 is linear mid-grey — this runs
	// BEFORE tone mapping, so the grade downstream still owns the final look.
	// Depth-masked with everything else, so the sky does not gain contrast
	// during a boost while the road it sits over is the thing accelerating.
	float punch = uBoost.z * clamp(uBoost.x * 14.0, 0.0, 1.0) * depthMask;
	float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
	color = lum + (color - lum) * (1.0 + punch * 0.38);
	color = (color - 0.18) * (1.0 + punch * 0.24) + 0.18;
	outputColor = vec4(max(color, vec3(0.0)), inputColor.a);
}`;

export const createSpeedBlurEffect = ({ mobile = false } = {}) => {
  // y (clear radius) 0.24, up from 0.20: the depth band below already protects
  // the kart, but the road immediately ahead of it — the part the player is
  // steering by — sits just outside the old clear zone. Phones get a shorter
  // streak and a wider clear zone still: the mobile tier is already at 0.6
  // render scale, so the same uv offset is a much coarser walk.
  const boost = new THREE.Vector3(0, mobile ? 0.3 : 0.24, mobile ? 0.7 : 1);
  // The near ramp ends at 26 units, which is just past the chase boom — the
  // player kart and its driver are inside it and stay sharp. The far ramp
  // starts at 150 (about where the mid-ground belt begins) and is out by 620,
  // so the skyline, the backdrop rings and the sky never streak.
  const depthBand = new THREE.Vector4(9, 26, 150, 620);
  // Slightly above frame centre: the chase camera's vanishing point sits above
  // the kart, and streaks that radiate from the true centre look like they
  // originate inside the player's own bodywork.
  const center = new THREE.Vector2(0.5, 0.54);
  const effect = new Effect('RaceSpeedBlurEffect', SPEED_BLUR_FRAGMENT, {
    // DEPTH as well as CONVOLUTION: the depth texture is already allocated for
    // the aerial pass in the same EffectPass, so the band mask above costs one
    // fetch that has already been paid for.
    attributes: EffectAttribute.CONVOLUTION | EffectAttribute.DEPTH,
    blendFunction: BlendFunction.SRC,
    uniforms: new Map([
      ['uBoost', new THREE.Uniform(boost)],
      ['uCenter', new THREE.Uniform(center)],
      ['uDepthBand', new THREE.Uniform(depthBand)],
    ]),
  });
  // Peak streak length in uv. 0.045 read as ~70px at 1600 wide, and with the
  // whole frame smearing that measured as "painterly mush" on every close
  // capture. 0.034 plus the depth band puts the streaks where the motion
  // actually is, which is a stronger speed cue at half the destruction.
  effect.maxStreak = mobile ? 0.024 : 0.034;
  effect.setStrength = (value01) => {
    boost.x = Math.max(0, Math.min(1, value01)) * effect.maxStreak;
  };
  effect.setTier = (isMobile) => {
    boost.y = isMobile ? 0.3 : 0.24;
    boost.z = isMobile ? 0.7 : 1;
    effect.maxStreak = isMobile ? 0.024 : 0.034;
  };
  return effect;
};
