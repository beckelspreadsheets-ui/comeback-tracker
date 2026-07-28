// AAA wave 2 — the numbers behind the three kart material CLASSES.
//
// Why a table instead of inline constants: the audit's diagnosis was that
// karts are "not lit like objects, they are lit like decals" — pure diffuse
// toon plus a weak fresnel rim, with no specular event anywhere. MK8 karts
// sell mass because three materials disagree with each other:
//   glossy paint  — a hard highlight BAND that slides as the kart yaws
//   hot chrome    — a much tighter, much brighter band on trim and hubs
//   matte rubber  — no specular at all, and a touch darker than its albedo
// The contrast between those three is the read. Any one of them alone is
// just a shinier decal.
//
// The classes cannot be separate THREE materials: every authored kart body
// (Tripo/Meshy GLB) is ONE fused mesh with ONE baked map, and the Kenney
// drag racer is one mesh sharing a recoloured palette atlas. So the split
// happens PER TEXEL inside the shader, keyed off the baked albedo itself —
// paint is chromatic, trim is bright and neutral, tyres are dark and
// neutral. These thresholds are that classifier. See toonRimShader.js.
//
// Known limit, measured not assumed: "tyres are dark" is only true of most
// bakes. The Miami Cruiser paints its tyres neutral WHITE (linear luminance
// 0.91 median), which is indistinguishable from the Ice Racer's frosted white
// shell, so no albedo threshold can separate those two cases. Everything below
// is therefore designed to fail gracefully rather than to classify perfectly:
// the specular is bounded by what the surface can still absorb (SPEC_CEILING)
// rather than by getting the class right.

import {
  LinearMipmapLinearFilter,
  LinearMipmapNearestFilter,
  NearestMipmapLinearFilter,
  NearestMipmapNearestFilter,
} from 'three';

// Chroma (max(rgb) - min(rgb)) window that selects "paint". Below the low
// end a texel is a neutral (tyre, trim, glass); above the high end it is
// unambiguously body colour. The same mask drives the per-racer paint tint.
//
// Round 2 shipped [0.28, 0.62] and it was the single worst number in the file.
// Measured against the SHIPPED roster paints in linear space (the space the
// shader classifies in), sRGB -> linear crushes chroma far harder than the eye
// does, and half the roster fell out of the paint class entirely:
//
//   crrt-bunny #e8261d  chroma 0.795  lum 0.186   -> paint 1.00
//   mizzle     #f28b2e  chroma 0.861  lum 0.375   -> paint 1.00
//   seth       #7e35f4  chroma 0.869  lum 0.135   -> paint 1.00
//   tclow      #2378ff  chroma 0.983  lum 0.210   -> paint 1.00
//   layer23    #a86b32  chroma 0.360  lum 0.191   -> paint 0.16
//   lifoladen  #8e1a43  chroma 0.260  lum 0.069   -> paint 0.00
//
// Look at the luminance column: EVERY roster paint is below RUBBER_LUMINANCE's
// 0.38 upper edge. The rubber mask is (1 - paint) * darkAndNeutral, so any
// paint the chroma window failed to claim was handed straight to the rubber
// class and DARKENED — the layer23 kart's body scored 64% rubber and the
// lifoladen kart's 100%. Those two bodies got no highlight of any kind and a
// 10% darkening on top, which is exactly the "flat untextured grey/beige
// boxes, no body colour, no gloss" body all three critics filed as a blocker
// and read as a missing asset / a procedural greybox fallback.
//
// It was neither. The body at comeback-city-p0_45 is Layer 23's BRONZE
// DRAGSTER — an authored roster kart (KART_CHARACTERS: kart 'kenney', colour
// #a86b32) already running through applyHeroRim. The control is in the same
// frame: Seth's PURPLE DRAGSTER, same GLB, same shader, same call site, colour
// #7e35f4 at chroma 0.869 — and it renders saturated and shaded. The only
// variable between them is which side of this threshold their paint fell on.
//
// Re-cut so every roster paint clears it while true neutrals stay out:
// lifoladen lands at 0.91 paint, layer23 at 1.00, a white trim band (0.078)
// and a black tyre (0.006) still score 0.00.
const PAINT_CHROMA = [0.08, 0.3];
// Luminance window for "chrome/trim": bright AND neutral. Only near-white
// texels qualify, which on the shipped bodies is exactly the trim bands,
// wheel hub rings, headlight surrounds and the Kenney racer's white shell.
const CHROME_LUMINANCE = [0.62, 0.9];
// ...and the UPPER edge of that window, which round 1 shipped without.
//
// Measured failure: sampled over the Miami Cruiser's rear tyre in
// comeback-city-p0_15, output luminance went mean 0.755 / max 0.900 in
// wave1-r3 to mean 0.906 / max 1.000 in wave2-r1 — the "white marshmallow"
// read. Decoding that kart's baked albedo (miami-cruiser GLB, image 1) shows
// why: its tyres are painted NEUTRAL WHITE at linear luminance 0.91 median,
// 0.98 at p90, so a one-sided smoothstep scored them full chrome and handed
// them the hot band.
//
// Round 2 placed this at [0.9, 1.0] and the marshmallow SURVIVED — measured
// again on the same crop, the tyres still sit at (240,230,215). The arithmetic
// says why: at the tyres' 0.91 median the round-2 window retired only
// smoothstep(0.9, 1.0, 0.91) = 3%, i.e. the cut was placed above the thing it
// was cutting. Moved down just far enough to bite it (0.91 now retires 84%,
// dropping the tyres' chrome mask from 0.97 to 0.16) and no further: the class
// still peaks around luminance 0.85, and silver trim lower down keeps whatever
// share of the flash it had — a mid silver at 0.66 lands 0.19 chrome / 0.81
// plastic, i.e. the classes hand off to each other instead of cutting out.
//
// Retiring a texel from the chrome class is NOT making it matte: it keeps the
// curvature AO, the sky bounce and the rim, and on the Ice Racer's frosted
// shell — the one kart material the critics praised, and which shares this
// bracket — those are what were giving it form anyway. What it loses is only
// the additive flash, which at this output luminance has nowhere to go and can
// only erase the bake.
//
// Honest limit, unchanged: no albedo threshold fixes a tyre that was PAINTED
// white. This stops the shader making it worse; the form terms are what stop
// it reading as a foam block. See the note above SKY_BOUNCE.
const CHROME_CEILING = [0.82, 0.94];
// Luminance window for "rubber": dark AND neutral. Below 0.1 it is fully
// rubber, above 0.38 it is not rubber at all.
//
// The AND is doing all the work and it is fragile in one direction only: every
// roster paint is darker than 0.38 in linear space (see PAINT_CHROMA), so this
// window on its own would claim the entire roster. The (1 - paintMask) factor
// in the shader is the ONLY thing keeping dark body colour out of the rubber
// class — if PAINT_CHROMA is ever raised again, re-check this pair together.
const RUBBER_LUMINANCE = [0.1, 0.38];

// Specular exponents, RE-DERIVED against the geometry that actually ships.
//
// Round 2 used 28 / 90, which are sane numbers for a smooth mesh and wrong
// ones here. pow(NdH, 28) crosses the 0.42 cel threshold at NdH ~= 0.969, a
// half-angle window of ~14 degrees; the chrome lobe at 90 is ~8. The shipped
// bodies are FLAT-SHADED low-poly: a kart presents on the order of twenty
// facets to the camera, each holding one constant normal, so the band does
// not sweep across a surface — it either contains a facet's normal or it does
// not. With a 14-degree window and a low sun that is almost always "does
// not", which is why not one of the three critics reported seeing a highlight
// on any kart in 18 frames. The classes were live and invisible.
//
// Widened until a facet-normal is reliably inside the window: 14 gives ~21
// degrees for paint, 48 gives ~13 for chrome. Still two clearly different
// materials — the chrome window is a third the paint window and the two
// almost never fire on the same facet — but both now fire.
const GLOSS = { chrome: 48, paint: 14 };
// Additive strengths. Chrome stays well above paint — a chrome flash that is
// merely as bright as the paint highlight reads as one material — but it comes
// down from 1.1 because the wider lobe spends it over ~2.5x the facet area.
//
// `plastic` is the fourth class, and it exists because the first three left a
// hole: a texel that is neutral, too dark for chrome (luminance < 0.62) and
// too bright for rubber (> 0.38) matched NOTHING and got no specular event at
// all. That band is where mid-grey unpainted plastic lives — roll bars, seat
// shells, bumpers, the Kenney atlas's grey swatch column — i.e. a large part
// of the surface area on the bodies the critics described as "flat grey
// boxes" and "less surface information than a background prop". Deliberately
// the weakest of the three events: unpainted plastic should read as duller
// than paint, not as a fourth kind of gloss.
const SPEC_STRENGTH = { chrome: 0.95, paint: 0.55, plastic: 0.34 };
// How far the paint highlight is pulled off pure white toward the track's
// hero-rim tint. Fully white highlights look like blown-out plastic under a
// neon dusk key; fully tinted highlights stop reading as "light".
const SPEC_TINT_BLEND = 0.45;

// Ceiling for the ADDITIVE specular, in lit-output luminance.
//
// Round 1 spent the highlight against the ALBEDO's headroom, which is the
// wrong quantity: a mid-value texel standing in full key is already near 1.0
// by the time the band fires, so the add walked straight past it. This is the
// same number measured against the lit result instead, so the band lifts dark
// and mid surfaces hard and eases to nothing on anything the key has already
// taken to white. Deliberately ABOVE 1.0 — a chrome flash that cannot clear
// the post chain's bloom threshold is not a chrome flash — but low enough
// that it is the only kart texel per frame that gets there.
const SPEC_CEILING = 1.18;

// Curvature AO. `floor` is the multiplier on a fully down-facing normal:
// undertrays, wheel wells and seat interiors darken independent of the light
// direction, which is what gives the pale karts on Penguin Village a
// top/side value break instead of one flat pale-blue shape.
// `crease` inks high-curvature texels using the screen-space derivative of
// the normal — ~0 across a flat facet, large across an edge — so low-poly
// bodies get a contour line for free. Kept low: it is a seasoning, and on a
// dense smooth mesh it would otherwise bruise every curve.
const AO = { crease: 0.16, floor: 0.66 };

// Sky bounce: an ADDITIVE fill on up-facing normals, tinted by the surface's
// own albedo and bounded by the same lit headroom the specular uses.
//
// Two problems, one term. First, the AO above only ever darkens, so pushing
// its floor down to widen the top/side value break also walks the whole kart
// darker — and the critics' standing complaint on Comeback City is that the
// player kart is already the DARKEST object on screen. Pairing the deeper
// floor with a lift on the sunward-up faces widens the break while leaving the
// kart's mean value slightly higher than round 2 shipped.
//
// Second, and this is why it is light-INDEPENDENT: a near-white baked surface
// (the Miami Cruiser's tyres, the Ice Racer's shell) is retired from every
// specular class by CHROME_CEILING, so nothing else in this shader can give it
// form. An albedo-tinted vertical ramp still can, and it is the only tool left
// that works on a texel the classifier has deliberately given up on.
//
// Headroom-bounded so it cannot clip: an already-white texel gets nothing,
// which is also what stops it feeding the post chain's bloom threshold.
const SKY_BOUNCE = 0.16;

// Extra darkening applied to the rubber class on top of the AO term. Tyres
// that merely lack a highlight still read as "dark paint"; pushing them down
// another ~10% is what makes them read as rubber.
const RUBBER_DARKEN = 0.9;

// ---- AAA wave 4: the analytic sky probe ------------------------------------
//
// Per-class weight on the environment reflection injected by the kart shading
// chunk. Read raceEnvironment.js first — these are the KART half of one
// feature, and the reason the kart half is analytic is that three r184's toon
// shader carries no envMap chunk, so `scene.environment` can never reach a hero
// body however the probe is installed.
//
// What this buys that no existing term does. Every specular event in this file
// is a LOBE: it fires when the half-vector lands inside a narrow window and is
// black everywhere else. On the flat-shaded low-poly bodies that ship, a facet
// is either inside the window or outside it, so a kart is a small number of
// facets each holding one constant value — which is precisely the measured
// failure the critics keep filing: "one flat colour across a curved body with
// zero value change" (the blue rival in comeback-city-p0_45 and
// penguin-village-p0_56 are the same slab in both). A reflection is not a lobe.
// It returns a DIFFERENT sky colour for every facet normal, so twenty facets
// get twenty values off one term, and it slides continuously as the kart yaws.
// That is the single cheapest way to put value variation back on a body whose
// baked albedo has none — and it is the only one that also survives the
// saturation overshoot in the Kenney rival recolour (which is monolith-side and
// not fixed here), because a body that is channel-clipped in blue still has
// full headroom in red and green for a sky-coloured sheen to move through.
//
// Chrome is roughly 2.3x paint on purpose. A reflection is what distinguishes
// metal from paint far more than a highlight does — paint scatters, chrome
// returns the sky nearly intact — and the ratio is what keeps the two classes
// disagreeing now that they both carry a reflection.
//
// Rubber gets nothing at all, which is the same one-line contract the rest of
// this file keeps: matte is the whole point of the class, and the tyres are the
// value anchor the other three classes are read against.
const ENV_PROBE = {
  chrome: 0.5,
  paint: 0.22,
  plastic: 0.14,
  // Exponent on the sun lobe in the REFLECTION direction. Much tighter than the
  // paint gloss lobe (14) because this one is not gated on a half-vector: it is
  // the sun's own image in the surface, and a wide one would read as a second
  // key light washing the whole body rather than as a glint travelling across
  // a cowl.
  sunSharp: 26,
};

// Anisotropic filtering for hero albedo maps.
//
// Every kart panel in the close frames (comeback-city-p0_24/p0_45,
// penguin-village-p0_45) resolves as a low-frequency wash: those bodies are
// baked-texture GLBs viewed at a hard grazing angle from a low chase camera,
// which is precisely the case trilinear mipmapping over-blurs. 8 is the usual
// knee — 16 costs measurably more bandwidth for a difference nobody can see at
// 1600x900. Not clamped here: three clamps to capabilities.getMaxAnisotropy()
// at upload, so a device that cannot do 8 quietly does what it can.
export const HERO_TEXTURE_ANISOTROPY = 8;

export const KART_SHADING_DESKTOP = Object.freeze({
  aoCrease: AO.crease,
  aoFloor: AO.floor,
  chromeCeiling: CHROME_CEILING,
  chromeGloss: GLOSS.chrome,
  chromeLuminance: CHROME_LUMINANCE,
  chromeStrength: SPEC_STRENGTH.chrome,
  envChrome: ENV_PROBE.chrome,
  envPaint: ENV_PROBE.paint,
  envPlastic: ENV_PROBE.plastic,
  envSunSharp: ENV_PROBE.sunSharp,
  paintChroma: PAINT_CHROMA,
  paintGloss: GLOSS.paint,
  paintStrength: SPEC_STRENGTH.paint,
  plasticStrength: SPEC_STRENGTH.plastic,
  rubberDarken: RUBBER_DARKEN,
  rubberLuminance: RUBBER_LUMINANCE,
  skyBounce: SKY_BOUNCE,
  specCeiling: SPEC_CEILING,
  specTintBlend: SPEC_TINT_BLEND,
  textureAnisotropy: HERO_TEXTURE_ANISOTROPY,
});

// Phone tier. The classifier, the specular bands and the AO all stay — they
// are the read, and dropping them is what made karts look like decals in the
// first place. What goes is the derivative crease term (an extra fwidth on a
// tile-based GPU for a 1px effect nobody sees at phone DPR) and a slightly
// wider paint band so the highlight survives the 0.6 render scale.
// Anisotropy drops to 2: the phone renders at 0.6 scale into a viewport a
// third of the width, so the grazing-angle detail 8x buys is already below a
// physical pixel, and texture bandwidth is the scarce thing on a tile GPU.
// The sky probe STAYS on mobile — it is ~15 ALU with no texture fetch, which is
// the cheapest form cue in the whole file and the one a 0.6-scale render needs
// most, since every lobe-based highlight is exactly the kind of high-frequency
// detail a downscale eats. Only the sun lobe widens: at 0.6 scale a 26-exponent
// glint can land between samples and strobe, and 15 spreads the same energy
// over roughly 1.7x the solid angle so it survives resampling.
export const KART_SHADING_MOBILE = Object.freeze({
  ...KART_SHADING_DESKTOP,
  aoCrease: 0,
  chromeGloss: 34,
  envSunSharp: 15,
  paintGloss: 10,
  textureAnisotropy: 2,
});

// Same rule the renderer uses for raceViewport.mobile (createRaceScene.js:74)
// — duplicated rather than imported because hero materials are built during
// asset load, before any viewport object is threaded down here, and the two
// only have to agree on which TIER, not on exact pixels.
export const resolveKartShading = (windowRef = globalThis.window) => {
  const width = windowRef?.innerWidth || 0;
  const height = windowRef?.innerHeight || 0;
  if (width > 0 && height > 0 && width / height < 0.74) return KART_SHADING_MOBILE;
  return KART_SHADING_DESKTOP;
};

// AAA wave 4: the wave-2 hero-rim floor (HERO_RIM_MIN_STRENGTH 0.4 /
// HERO_RIM_MAX_POWER 2.5) is GONE, along with the two clamps in
// applyToonRim. It existed because wave 2 could not reach the track palettes
// and Comeback City was shipping half of Penguin Village's rim strength on the
// darker of the two tracks. Wave 3 landed the real numbers:
//   comebackCity.js:151    heroRim { power 2.4, strength 0.40, tint '#4fd8ff' }
//   penguinVillage.js:432  heroRim { power 2.2, strength 0.45, tint '#00d5ff' }
// Both clear the retired floor exactly (2.4 <= 2.5, 0.40 >= 0.40; 2.2 <= 2.5,
// 0.45 >= 0.40), so removing it is a verified no-op on every shipped track
// rather than a change of look — and a third track can now author a soft rim
// without a helper silently overriding it.

// How the rim is redistributed around the silhouette by KEY DIRECTION.
//
// A plain fresnel term fires equally hard on the edge facing the sun and the
// edge facing away from it, which is the "lit by nothing" read: the rim stops
// describing where the light is and becomes a uniform coloured outline. These
// two numbers are the multiplier at the extremes — [0] on a normal pointing
// straight away from the key, [1] on one pointing into it. They straddle 1.0
// on purpose so the SHAPE changes without the overall rim budget changing;
// swapping to a floor-only clamp would just dim every hero silhouette.
// Applies to the rim only. The rim's COLOUR stays whatever the track palette
// authored (PV ice-white, CC cyan) — that is an owner pick, not a bug.
export const HERO_RIM_KEY_BIAS = [0.45, 1.25];

// Bring a hero albedo map up to the tier's sampling standard, once per texture.
//
// Deliberately conservative about mipmaps: GLTFLoader honours the glTF
// sampler, and forcing generateMipmaps on a compressed (KTX2/basis) texture
// would throw away its shipped mip chain. So mipmaps are only turned on for an
// uncompressed map that arrived with a non-mipmapping minFilter, which is the
// only case that is unambiguously wrong.
export const tuneHeroTexture = (texture, anisotropy = HERO_TEXTURE_ANISOTROPY) => {
  // The Kenney palette atlas is shared by every fallback body, so this runs
  // many times on one texture; re-flagging needsUpdate each time would force a
  // pointless re-upload per material.
  if (!texture || texture.userData?.heroTuned) return texture;
  const mipFilters = [
    LinearMipmapLinearFilter,
    LinearMipmapNearestFilter,
    NearestMipmapLinearFilter,
    NearestMipmapNearestFilter,
  ];
  if (!texture.isCompressedTexture && !mipFilters.includes(texture.minFilter)) {
    texture.generateMipmaps = true;
    texture.minFilter = LinearMipmapLinearFilter;
  }
  texture.anisotropy = Math.max(texture.anisotropy || 1, anisotropy);
  texture.userData = texture.userData || {};
  texture.userData.heroTuned = true;
  texture.needsUpdate = true;
  return texture;
};

// Per-racer paint colours, mirrored from KART_CHARACTERS in the monolith.
//
// NOT WIRED, and it cannot be from this side: the six applyHeroRim call sites
// hand the shader a material and nothing else, so the shader has no way to
// know which racer it belongs to. attachTripoKartBody / attachAuthoredKartBody
// (ComebackCityThreeKartRace.jsx ~1701/1732) are the only places that know,
// and they are in the monolith. Whoever owns that file needs one line per
// body: setKartPaintTint(material, KART_PAINT_TINTS[characterEntry.key]).
// Until then applyKartShading ships amount 0 — the tint is a no-op.
//
// Scope correction worth having before anyone spends the edit: it is only
// needed for the AUTHORED bodies (hero / icesled / miamicruiser / iceblock /
// btc), which keep whatever colour their GLB baked. The three `kart: 'kenney'`
// racers already get a per-racer recolour upstream — makeKartPaletteTexture
// remaps the atlas's orange swatch column to characterEntry.color before the
// texture is built — so wiring the tint on those would recolour them twice.
export const KART_PAINT_TINTS = Object.freeze({
  'crrt-bunny': '#e8261d',
  layer23: '#a86b32',
  lifoladen: '#8e1a43',
  mizzle: '#f28b2e',
  'seth-penguin': '#7e35f4',
  tclow: '#2378ff',
});

// How hard the tint pushes when a caller does opt in. A full replace kills
// the baked shading variation inside the paint region; 0.7 keeps the bake's
// panel breaks while the racer's hue clearly wins.
export const KART_PAINT_TINT_AMOUNT = 0.7;
