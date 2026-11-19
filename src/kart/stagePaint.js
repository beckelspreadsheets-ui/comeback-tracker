// Paint preview for the select-screen model stage (KartModelStage.jsx).
//
// The race paints the player's kart through setKartPaintTint(..., { respray })
// — a uniform in the kart-shading injection (race/render/toonRimShader.js).
// The stage renders the GLBs' own materials, which have no such injection, so
// this is the same respray re-expressed for them: the same chroma mask picks
// the PAINT texels (tyres, glass, trim and chrome are neutral and keep their
// bake), the same rescale against the body's measured paint luminance
// (paintLuminance.js) with the same peak cap recolours them, and the same
// amount mixes it in. It runs on the albedo instead of the lit colour — the
// one difference, and under a white key the same thing. Factory (no tint)
// leaves the stage exactly as it was: amount 0.
//
// A kart file can flag vertices that keep their own colour (gold, brass,
// lamps: race/render/paintProtect.js). The race skips them, so the try-on here
// does too: same attribute, same (1 - flag) factor on the mask. Karts without
// the attribute keep the program they had.
import { Color, Vector2, Vector4 } from 'three';
import { KART_SHADING_DESKTOP } from '../game/race/render/kartMaterials.js';
import { measurePaintLuminance } from '../game/race/render/paintLuminance.js';
import { hasPaintProtect, PAINT_PROTECT_ATTRIBUTE } from '../game/race/render/paintProtect.js';

const PAINT_CHUNK = /* glsl */ `
{
	vec3 stageAlbedo = diffuseColor.rgb;
	float stagePeak = max(stageAlbedo.r, max(stageAlbedo.g, stageAlbedo.b));
	float stageChroma = stagePeak - min(stageAlbedo.r, min(stageAlbedo.g, stageAlbedo.b));
	float stageMask = smoothstep(uStagePaintChroma.x, uStagePaintChroma.y, stageChroma) * uStagePaint.a;
	#ifdef STAGE_PAINT_PROTECT
		stageMask *= clamp(1.0 - vStagePaintProtect, 0.0, 1.0);
	#endif
	vec3 stageLuma = vec3(0.2126, 0.7152, 0.0722);
	float stageTintPeak = max(1e-4, max(uStagePaint.r, max(uStagePaint.g, uStagePaint.b)));
	float stageRef = uStagePaintRef > 0.0 ? uStagePaintRef : dot(uStagePaint.rgb, stageLuma);
	float stageScale = min(
		dot(stageAlbedo, stageLuma) / max(1e-4, stageRef),
		max(stagePeak, uStagePaintCeiling) / stageTintPeak
	);
	diffuseColor.rgb = mix(stageAlbedo, uStagePaint.rgb * stageScale, stageMask);
}
`;

export const createStagePaintUniform = () => ({ value: new Vector4(1, 1, 1, 0) });

// paint: a race/progress.js palette entry ({ tint, amount }) or null.
export const setStagePaint = (uniform, paint) => {
  if (paint?.tint) {
    const color = new Color(paint.tint);
    uniform.value.set(color.r, color.g, color.b, paint.amount ?? 0.9);
  } else {
    uniform.value.set(1, 1, 1, 0);
  }
};

// Every material under `root` reads the one shared uniform, so a paint change
// is a single write — no reload, no recompile.
export const applyStagePaint = (root, uniform) => {
  const chroma = KART_SHADING_DESKTOP.paintChroma;
  root.traverse((node) => {
    if (!node.isMesh) return;
    (Array.isArray(node.material) ? node.material : [node.material]).forEach((material) => {
      if (!material || material.userData?.stagePaint) return;
      material.userData.stagePaint = true;
      const previous = material.onBeforeCompile;
      // One material serves the body and the wheels; every primitive of a
      // flagged kart carries the attribute.
      const protect = hasPaintProtect(node.geometry);
      material.onBeforeCompile = (shader, renderer) => {
        previous?.call(material, shader, renderer);
        if (!shader.fragmentShader.includes('#include <color_fragment>')) return;
        shader.uniforms.uStagePaint = uniform;
        shader.uniforms.uStagePaintChroma = { value: new Vector2(chroma[0], chroma[1]) };
        shader.uniforms.uStagePaintCeiling = { value: KART_SHADING_DESKTOP.paintCeiling };
        shader.uniforms.uStagePaintRef = { value: measurePaintLuminance(material.map, chroma) || 0 };
        shader.fragmentShader = shader.fragmentShader
          .replace(
            'void main() {',
            `${protect ? '#define STAGE_PAINT_PROTECT\nvarying float vStagePaintProtect;\n' : ''}uniform vec4 uStagePaint;\nuniform vec2 uStagePaintChroma;\nuniform float uStagePaintCeiling;\nuniform float uStagePaintRef;\nvoid main() {`
          )
          .replace('#include <color_fragment>', `#include <color_fragment>\n${PAINT_CHUNK}`);
        if (protect) {
          shader.vertexShader = shader.vertexShader
            .replace('void main() {', `attribute float ${PAINT_PROTECT_ATTRIBUTE};\nvarying float vStagePaintProtect;\nvoid main() {`)
            .replace('#include <begin_vertex>', `vStagePaintProtect = ${PAINT_PROTECT_ATTRIBUTE};\n#include <begin_vertex>`);
        }
      };
      material.customProgramCacheKey = () => (protect ? 'kart-stage-paint-v1-body-protect' : 'kart-stage-paint-v1-body');
      material.needsUpdate = true;
    });
  });
};
