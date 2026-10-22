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
import { Color, Vector2, Vector4 } from 'three';
import { KART_SHADING_DESKTOP } from '../game/race/render/kartMaterials.js';
import { measurePaintLuminance } from '../game/race/render/paintLuminance.js';

// The Kenney drag racer's main panel is a near-grey atlas swatch (chroma
// 0.118 linear) that the race repaints by UV region, not by mask — see
// KENNEY_BODY_SWATCHES in the race. A lower window lets the preview reach it.
const KENNEY_PAINT_CHROMA = [0.02, 0.1];

const PAINT_CHUNK = /* glsl */ `
{
	vec3 stageAlbedo = diffuseColor.rgb;
	float stagePeak = max(stageAlbedo.r, max(stageAlbedo.g, stageAlbedo.b));
	float stageChroma = stagePeak - min(stageAlbedo.r, min(stageAlbedo.g, stageAlbedo.b));
	float stageMask = smoothstep(uStagePaintChroma.x, uStagePaintChroma.y, stageChroma) * uStagePaint.a;
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
export const applyStagePaint = (root, uniform, { kenney = false } = {}) => {
  const chroma = kenney ? KENNEY_PAINT_CHROMA : KART_SHADING_DESKTOP.paintChroma;
  root.traverse((node) => {
    if (!node.isMesh) return;
    (Array.isArray(node.material) ? node.material : [node.material]).forEach((material) => {
      if (!material || material.userData?.stagePaint) return;
      material.userData.stagePaint = true;
      const previous = material.onBeforeCompile;
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
            'uniform vec4 uStagePaint;\nuniform vec2 uStagePaintChroma;\nuniform float uStagePaintCeiling;\nuniform float uStagePaintRef;\nvoid main() {'
          )
          .replace('#include <color_fragment>', `#include <color_fragment>\n${PAINT_CHUNK}`);
      };
      const chromaKey = kenney ? 'kenney' : 'body';
      material.customProgramCacheKey = () => `kart-stage-paint-v1-${chromaKey}`;
      material.needsUpdate = true;
    });
  });
};
