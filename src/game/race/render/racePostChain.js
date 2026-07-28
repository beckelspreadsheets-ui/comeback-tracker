// AAA wave-2 "post-chain-and-mood": the post chain, extracted and rebuilt.
//
// What was here before (one merged EffectPass: Bloom -> SMAA -> Vignette ->
// ACES) had four measured faults, all of them ordering or omission:
//
//   1. SMAA and Vignette ran on LINEAR HDR, before tone mapping. SMAA is a
//      CONVOLUTION effect: its shader re-taps inputBuffer and overwrites the
//      accumulated colour, so every bloom contribution on a high-contrast
//      silhouette — the exact silhouettes bloom exists for — was discarded.
//      The chain deleted its own bloom.
//   2. No dithering anywhere, so the sky shipped 7-15px constant-colour runs.
//   3. No white point. Across all 18 wave-1 frames NOT ONE pixel reached 250,
//      so a threshold-1.0 bloom was inert by construction.
//   4. No grade. One ACES dump applied to a track that is 17% crushed black
//      and to a track that is 48% above 200.
//
// The rebuild is three passes, in the only order that is colour-correct:
//
//   Pass 1  bloomWide + bloomTight        (linear HDR, where bloom belongs)
//   Pass 2  speedBlur -> aerial haze -> ACES -> vignette -> LUT -> grain
//   Pass 3  SMAA alone, LAST              (resolves the tone-mapped image)
//
// Pass 2's internal colour space is handled by pmndrs: the LUT declares SRGB
// input, so the pass inserts the encode right after ACES and the grade sees
// exactly the values a capture PNG contains (see raceGrade.js). Everything
// before it stays linear, which is where tone mapping and haze have to live.
import {
  BlendFunction,
  BloomEffect,
  EdgeDetectionMode,
  EffectComposer,
  EffectPass,
  LUT3DEffect,
  NoiseEffect,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing';
import * as THREE from 'three';
import { createAerialEffect } from './aerialEffect.js';
import { createSpeedBlurEffect } from './speedBlurEffect.js';
import { buildTrackLut } from './raceGrade.js';

// Exposure is NOT 1.28. The audit asked for 1.05 -> 1.28 on the strength of
// "the brightest scene pixel in the capture set is 241", but that measurement
// was taken on the PRE-wave-1 baseline. Re-measured on the wave-1 tree the two
// tracks are already 36% (CC) and 12% (PV) brighter in mean than that
// baseline, and the job this wave is to put VALUE back, not to take more of it
// out. The white point therefore comes from the grade's own shoulder, where it
// can be spent on the top 12% of the range instead of on the whole image; 1.08
// is a nudge, not a re-exposure.
// ROUND 3 NOTE, and it is not obvious from anywhere else in this file: the
// number below is NOT the multiplier the image receives. ToneMappingEffect
// compiles three's own `#include <tonemapping_pars_fragment>`, whose
// ACESFilmicToneMapping does `color *= toneMappingExposure / 0.6` — the 0.6 is
// ACES' middle-grey convention. So 1.08 here is an effective 1.80x on the
// linear buffer, and anyone re-tuning this has to divide by 0.6 before
// reasoning about what a given scene value lands on. (For the record it is a
// small step DOWN from wave 1, which ran the renderer's own ACES at the shared
// configureRaceRenderer exposure of 1.2, i.e. 2.00x — so exposure is not where
// the round-2 highlight regression came from. That was the grade's top end and
// it is fixed in raceGrade.js.)
const RACE_EXPOSURE = 1.08;

const flagOn = (params, name) => !params || params.get(name) !== '0';

export const buildRacePostChain = ({
  camera,
  mobile = false,
  params = null,
  renderer,
  scene,
  trackKey = 'comeback-city',
}) => {
  const wantBloom = flagOn(params, 'postBloom');
  const wantSmaa = flagOn(params, 'postSmaa');
  const wantTone = flagOn(params, 'postTone');
  const wantVignette = flagOn(params, 'postVignette');
  const wantGrade = flagOn(params, 'postGrade');
  const wantHaze = flagOn(params, 'postHaze');
  const wantBlur = flagOn(params, 'postBlur');
  const wantGrain = flagOn(params, 'postGrain');
  const wantMsaa = flagOn(params, 'postMsaa');

  // The pmndrs chain owns tone mapping, so the renderer hands over linear HDR.
  // LOCAL override only: the shared configureRaceRenderer (createRaceScene.js)
  // still sets ACES for the legacy ArcadeRace3D stack and must not be edited.
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = RACE_EXPOSURE;

  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  // MSAA on the scene pass, on top of SMAA. They are not redundant: MSAA fixes
  // GEOMETRY edges (the iceberg and skyline diagonals all three critics called
  // "amateur"), SMAA fixes shader edges MSAA cannot see — neon trim, specular,
  // the alpha-keyed backdrop silhouettes. Guarded by the driver's own limit so
  // a device that cannot do 4x quietly does what it can.
  const maxSamples = renderer.capabilities?.maxSamples ?? 0;
  const desktopSamples = wantMsaa ? Math.min(4, maxSamples) : 0;
  if (!mobile && desktopSamples > 0) composer.multisampling = desktopSamples;
  composer.addPass(new RenderPass(scene, camera));

  const passes = [];

  // ---- Pass 1: bloom, in two lobes -----------------------------------------
  // One lobe cannot be both. The WIDE lobe is a low-intensity veil at a low
  // threshold: it is what makes a dusk frame feel like air. The TIGHT lobe
  // sits above anything a lit surface reaches, so only real emitters (the sun
  // disc, which createSkyDome emits at 2.2x for exactly this reason, neon trim,
  // boost flame) get a hot core. The old single 1.0/0.55/0.7 lobe was doing
  // neither job, and the critics measured it clipping the boost pad's chevrons
  // to featureless white while the streetlamps' halos ran wider than the lamps.
  let bloomWide = null;
  let bloomTight = null;
  if (wantBloom) {
    // Threshold 0.85 -> 1.05. At 0.85 the wide lobe was catching LIT SURFACES,
    // not emitters: Penguin Village's snow plane sits above that after the key
    // light, so a third of every PV frame was a bloom source and the veil it
    // produced is half of why the critics measured 3.37% of p0_78 blown to
    // white. Above 1.0 only things the scene deliberately emits over unity
    // qualify — the sun disc (createSkyDome emits it at 2.2x for exactly this),
    // neon trim, the boost core. The way to bloom something is now to make it
    // an emitter, not to lower the bar until ordinary daylight clears it.
    bloomWide = new BloomEffect({
      mipmapBlur: true,
      intensity: 0.46,
      // Radius 0.82 -> 0.66. Every critic independently described the same
      // artefact: "every lamp's halo is wider than the lamp"
      // (comeback-city-p0_06). A veil whose support is larger than its source
      // stops reading as light coming off the object and starts reading as a
      // smear laid over it — the fix is a tighter support at the same
      // intensity, not less bloom.
      radius: 0.66,
      levels: mobile ? 4 : 6,
      luminanceThreshold: 1.05,
      luminanceSmoothing: 0.3,
    });
    const bloomEffects = [bloomWide];
    if (!mobile) {
      bloomTight = new BloomEffect({
        mipmapBlur: true,
        intensity: 0.78,
        radius: 0.28,
        levels: 3,
        luminanceThreshold: 1.28,
        luminanceSmoothing: 0.1,
      });
      bloomEffects.push(bloomTight);
    }
    passes.push(new EffectPass(camera, ...bloomEffects));
  }

  // ---- Pass 2: the grade ---------------------------------------------------
  const speedBlur = wantBlur ? createSpeedBlurEffect({ mobile }) : null;
  const aerial = wantHaze ? createAerialEffect({ mobile, trackKey }) : null;
  let lut = null;
  const gradeEffects = [];
  // The convolution effect must come first: it re-taps inputBuffer, so anything
  // ahead of it in the same pass would be thrown away. (pmndrs allows exactly
  // one convolution effect per pass and throws on a second — SMAA is the other
  // one, which is why it gets its own pass.)
  if (speedBlur) gradeEffects.push(speedBlur);
  if (aerial) gradeEffects.push(aerial);
  if (wantTone) gradeEffects.push(new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }));
  // Vignette BEFORE the LUT, both after ACES. Before ACES it was multiplying
  // linear HDR, which is why its falloff bit the bottom of the road; after the
  // LUT it would undo the grade's shadow tint in the corners. 0.46/0.26 is
  // softer than the old 0.42/0.30 because the grade now supplies the frame's
  // edge darkening itself.
  if (wantVignette) gradeEffects.push(new VignetteEffect({ offset: 0.46, darkness: 0.26 }));
  if (wantGrade) {
    lut = buildTrackLut(trackKey);
    // Tetrahedral interpolation on desktop halves the worst-case reconstruction
    // error at the grade's steepest knee for three extra texture taps.
    gradeEffects.push(new LUT3DEffect(lut, { tetrahedralInterpolation: !mobile }));
  }
  let grain = null;
  if (wantGrain) {
    grain = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: true });
    // Applied in DISPLAY space, not linear: the job here is breaking 8-bit
    // banding in the sky, and a linear-space grain lands unevenly across the
    // ramp it is supposed to dither.
    grain.inputColorSpace = THREE.SRGBColorSpace;
    grain.blendMode.opacity.value = mobile ? 0.018 : 0.03;
    gradeEffects.push(grain);
  }
  if (gradeEffects.length) passes.push(new EffectPass(camera, ...gradeEffects));

  // ---- Pass 3: SMAA, alone and last ----------------------------------------
  // HIGH, not MEDIUM: MEDIUM disables diagonal AND corner detection, and this
  // scene is built out of diagonals (iceberg cones, skyline spires, the road's
  // own converging edges). LUMA edge detection because the image reaching this
  // pass is tone-mapped, so luma is finally perceptually meaningful.
  let smaaPass = null;
  if (wantSmaa) {
    smaaPass = new EffectPass(
      camera,
      new SMAAEffect({ edgeDetectionMode: EdgeDetectionMode.LUMA, preset: SMAAPreset.HIGH })
    );
    smaaPass.enabled = !mobile;
    passes.push(smaaPass);
  }

  passes.forEach((pass) => {
    // Ordered dither on the final write. This is the cheap half of the banding
    // fix (the grain above is the other half); on intermediate HalfFloat passes
    // it is a rounding-level no-op.
    pass.dithering = true;
    composer.addPass(pass);
  });

  // The composer assigns renderToScreen to the LAST pass in the array once, at
  // addPass time — it never re-derives it. So any tier switch that disables a
  // trailing pass has to hand the flag back itself or the frame goes nowhere.
  const retargetOutput = () => {
    let last = null;
    passes.forEach((pass) => {
      pass.renderToScreen = false;
      if (pass.enabled) last = pass;
    });
    if (last) last.renderToScreen = true;
  };
  retargetOutput();

  let blurStrength = 0;
  let currentMobile = mobile;

  return {
    // bloomWide is the handle the palette-moments hook multiplies; keeping the
    // name it had means that code path is untouched by this rebuild.
    bloomEffect: bloomWide,
    composer,
    dispose() {
      composer.dispose?.();
      lut?.dispose();
    },
    setSize(width, height) {
      composer.setSize(width, height, false);
    },
    // Called from handleResize: an orientation change on a phone must not be
    // able to leave a desktop chain running (or vice versa). Nothing is rebuilt
    // — the expensive parts are simply switched off, which is allocation-free
    // and cannot drop a frame.
    setTier(isMobile) {
      if (isMobile === currentMobile) return;
      currentMobile = isMobile;
      if (smaaPass) smaaPass.enabled = !isMobile;
      composer.multisampling = isMobile ? 0 : desktopSamples;
      if (bloomWide) bloomWide.mipmapBlurPass.levels = isMobile ? 4 : 6;
      if (bloomTight) bloomTight.blendMode.opacity.value = isMobile ? 0 : 1;
      if (grain) grain.blendMode.opacity.value = isMobile ? 0.018 : 0.03;
      speedBlur?.setTier(isMobile);
      retargetOutput();
    },
    // boost01: 0 while cruising, 1 at full mini-turbo/pad boost. Smoothed here
    // rather than at the call site so the chain owns its own response curve.
    update(dt, { boost = 0 } = {}) {
      if (!speedBlur) return;
      // Asymmetric on purpose, and the same 1-pow(k, dt) idiom the camera lerps
      // use: the streaks ARRIVE in ~0.08s so the boost lands as an event, and
      // LEAVE over ~0.4s so the frame decompresses instead of snapping.
      const rate = boost > blurStrength ? 0.000002 : 0.08;
      blurStrength += (boost - blurStrength) * (1 - Math.pow(rate, dt));
      speedBlur.setStrength(blurStrength);
    },
  };
};
