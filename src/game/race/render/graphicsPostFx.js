// Graphics overhaul — Phase 2 post-processing (speed-reactive).
// Builds the additional pmndrs effects layered onto the shipped chain and
// drives the speed-linked ones each frame. Rendering/presentation only — the
// speed value is READ from race state (never written), so physics is safe.
//
// Two cost tiers, gated by the graphics preset:
//   - Color grade (HueSaturation + BrightnessContrast): the LUT-style cohesive
//     grade the brief asks for. A real .cube LUT is overkill here — the
//     palette is already stylized — so we approximate a filmic LUT with a
//     +saturation vibrance lift and a gentle contrast S-curve. Cheap (merged
//     into the same EffectPass as bloom/SMAA/vignette).
//   - ChromaticAberration: radial CA whose offset scales with speedRatio, so
//     the frame edges fringing only kicks in at speed (the motion read). This
//     is the one per-frame full-screen cost and is dropped on 'low'.
// Bloom is already in the shipped chain; we expose a speed boost multiplier
// so boost trails / mini-turbo flames bloom harder at top speed.
import { ChromaticAberrationEffect, HueSaturationEffect, BrightnessContrastEffect } from 'postprocessing';
import * as THREE from 'three';

// Construct the Phase-2 effects + a per-frame driver. Returns null when every
// Phase-2 post feature is off (?gfx=off), so the chain stays byte-identical
// to the shipped build in that case.
export const createGraphicsPostFx = ({ gfx }) => {
  const grade = gfx.postColorGrade
    ? [
        // Vibrance lift: +saturation pulls the neon palette out of cartoon-flat.
        new HueSaturationEffect({ hue: 0, saturation: gfx.gradeSaturation }),
        // Gentle contrast S-curve for cinematic tonal separation.
        new BrightnessContrastEffect({ brightness: 0, contrast: gfx.gradeContrast }),
      ]
    : [];

  let chromaticAberration = null;
  if (gfx.speedChromaticAberration && gfx.chromaticAberrationMax > 0) {
    chromaticAberration = new ChromaticAberrationEffect({
      // Start at zero offset — driven per-frame by speed below.
      offset: new THREE.Vector2(0, 0),
      // Radial modulation confines the fringing to the frame edges (center
      // stays sharp for readability), the classic speed-CA look.
      radialModulation: true,
      modulationOffset: 0.34,
    });
  }

  const effects = [...grade];
  if (!effects.length && !chromaticAberration) return null;

  // scratch vector reused every frame (no per-frame allocation).
  const caOffset = new THREE.Vector2(0, 0);

  // Per-frame driver: scale CA + return the bloom multiplier for the frame.
  // speedRatio is 0..~1.15 (clamped by the caller). Only touches uniforms.
  const updateFrame = ({ speedRatio = 0 } = {}) => {
    const t = Math.min(Math.max(speedRatio, 0), 1.15);
    if (chromaticAberration) {
      // Ease the offset in above ~40% speed so low-speed framing stays clean.
      const eased = Math.max(0, (t - 0.4) / 0.75);
      const mag = gfx.chromaticAberrationMax * eased * eased;
      caOffset.set(mag, mag * 0.6); // slight vertical bias reads faster
      chromaticAberration.offset = caOffset;
    }
    // Bloom boost: 1 + speedBloomBoost * t^2 (quadratic so it only swells at
    // the top end, making boost trails / mini-turbo flames bloom hardest).
    return 1 + gfx.speedBloomBoost * t * t;
  };

  return { effects, chromaticAberration, updateFrame };
};
