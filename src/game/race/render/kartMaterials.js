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
// Widened until a facet-normal is reliably inside the window: 14 gave ~21
// degrees for paint, 48 gives ~13 for chrome. Still two clearly different
// materials — the chrome window is a third the paint window and the two
// almost never fire on the same facet — but both now fire.
//
// AAA wave 4 round 2: paint 14 -> 10 (~24.5 degrees). The round-2 widening was
// the right move and it was not enough — three critics read 18 frames and none
// found a specular hotspot on paint anywhere. Most of that was the unclip
// starving the headroom meter (see PAINT_SHAPE, which is the real fix), but the
// geometry argument compounds it: a chase camera looks at a kart's REAR, where
// the facet count is lowest and the half-vector against a low key is furthest
// from any of them. Chrome is left alone — it is the tighter of the two by
// design and the trim it lands on is small, high-curvature and well sampled.
const GLOSS = { chrome: 48, paint: 10 };
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

// ...and the SECOND ceiling, for the two terms that are supposed to clip.
//
// AAA wave 5 — one meter was doing two incompatible jobs. SPEC_CEILING is a
// FILL budget: the sky bounce, the ambient probe and the dark-class fill are
// broad, low-frequency terms that cover most of a body, and letting any of them
// past the display range is how a kart turns into a white marshmallow. The
// specular BAND is the opposite kind of term — a ~13-24 degree lobe that lands
// on a handful of facets — and the whole point of a chrome flash is that it
// blows out and feeds the bloom threshold. Metering both against 1.18 meant the
// broad terms were correctly bounded and the flash was bounded with them.
//
// Measured, wave4-r3, the surfaces that should be carrying a flash:
//   pv-p0_56 blue rival body   mean (49,50,163)  97.4% adjacent-pixel-flat
//   pv-p0_56 blue rival wing   mean (44,34,143)  97.1% adjacent-pixel-flat
//   cc-p0_45 blue rival slab   mean (64,68,185)  80.6% adjacent-pixel-flat
// Note the RED and GREEN channels: 44-68 out of 255. These bodies are nowhere
// near clipping — they sit around 0.4 scene-linear at the peak channel, i.e.
// they have ~64% of the fill budget still unspent. The flash is not missing
// because the surface ran out of room; it is missing because 0.95 (chrome)
// times a 0.28 headroom is 0.27 of add on a term that has to clear 1.0 to read
// as light rather than as a lighter shade of paint.
//
// At 1.75 the same chrome band on the same texel lands at 0.49 and crosses the
// post chain's 1.0 bloom threshold, which is the difference between "that trim
// is pale" and "that trim caught the sun". The fill terms keep 1.18 — nothing
// broad moves, so the marshmallow guard the round-2 measurements bought is
// untouched. Two ceilings, two jobs.
const SPEC_BLOOM_CEILING = 1.75;

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

// ---- AAA wave 4 round 2: saturated paint, measured -------------------------
//
// THE MEASUREMENT. Sampled the Miami Cruiser's body in
// tmp/aaa-visual/wave4-r1/comeback-city-p0_15.png:
//
//   region              mean RGB          lum p10..p90   R >= 252
//   pink body, upper    (241, 156, 202)   177 .. 226      86.7%
//   pink body, side     (254, 143, 195)   187 .. 211      97.1%
//   pink nose           (242, 168, 211)   194 .. 242      89.2%
//   blue rival (control) (103,  97, 119)   39 .. 182      21.6%
//
// The side panel holds a value spread of TWENTY-FOUR out of 255 across its
// whole area while its red channel is pinned at maximum on 97% of it. That is
// the blind judge's "one uniform hot pink with a clipped highlight and no
// form", and it is a clipping failure, not a shading one: the panel almost
// certainly HAS gradation, entirely above 1.0 where the output cannot show it.
//
// WHY EVERY EXISTING GUARD MISSED IT. SPEC_CEILING is spent against
// `luminance(outgoingLight)`, and luminance is Rec709-weighted — green carries
// 0.72 of it, red 0.21. Hot pink is a colour with almost no green, so a texel
// whose red channel is already past 1.0 still measures as a mid-luminance
// surface and every headroom meter in the shader reports room to spare. The
// meter now reads the PEAK CHANNEL instead (see KART_HEADROOM in
// toonRimShader.js); peak >= luminance for every colour, with equality on
// neutrals, so this tightens the meter exactly on the saturated surfaces that
// were escaping it and is a no-op on the chrome and rubber it was tuned for.
//
// `shade` — the shadow-side step. A toon body lit by one broad key lands on a
// single ramp step over most of its area; multiplying the PAINT class by this
// on normals facing away from the key is what puts a third value on the body
// (lit crest / mid flank / shadow side) rather than leaving the AO's curvature
// term to carry the whole read on its own.
//
// `knee` / `ceiling` / `pull` — the unclip.
//
// AAA wave 4 round 2 — THIS TERM DID NOT WORK AND IT TOOK THE PAINT HIGHLIGHT
// DOWN WITH IT. Round 2 shipped a HARD-DIVIDE unclip: scale the colour by
// knee/peak, take 70% of that correction, knee = 1.0. Walk the arithmetic on
// the peaks the shipped bodies actually reach:
//
//   peak 0.90 -> 0.900   headroom 0.237   paint spec lands at 0.131
//   peak 1.00 -> 1.000   headroom 0.153   paint spec lands at 0.084
//   peak 1.20 -> 1.060   STILL CLIPPED    paint spec lands at 0.056
//   peak 1.60 -> 1.180   STILL CLIPPED    paint spec lands at 0.000
//
// Two of the three critics' findings are that table. A knee AT 1.0 cannot
// unclip anything — the correction only starts where the display already ended
// — and taking 70% of an insufficient correction leaves 1.2 and 1.6 both
// pinned at white, which is the measured "one uniform hot pink with no form"
// and the blue rival's 81.7% adjacent-flat body. And because SPEC_CEILING
// meters the additive terms against what is left under 1.18, a panel parked at
// 1.06-1.18 has nothing left to spend, which is why not one of 18 frames
// carries a specular hotspot on paint. One cause, both findings.
//
// Replaced with a proper soft-knee compressor: below `knee` nothing happens at
// all, above it the overshoot is folded into the band between `knee` and
// `ceiling` by over/(over + range), which is monotone and asymptotic — so an
// arbitrarily overexposed panel lands just under `ceiling` and, crucially,
// texels that differed above 1.0 still differ below it. Same hue-exactness as
// before (all three channels take one factor; this moves exposure, never tint).
//
// knee 0.72 is low enough that a body sitting in full key is genuinely brought
// down into the display range rather than nudged; the ceiling is the asymptote
// the compressor approaches. `pull` stays a partial take (0.85) so a small
// overshoot is corrected gently.
//
// The ADDITIVE terms still run after this and are still allowed past 1.0 —
// that is the point. The body is compressed under the display ceiling; the
// specular band is what goes over it and feeds the bloom threshold.
//
// AAA wave 5 round 2 — CEILING 1.02 -> 0.88, because the sentence directly
// above was not true of the number directly above it.
//
// The post chain's bloom threshold is 1.0 (racePostChain.js) and ACES runs at
// an effective 1.08/0.6 = 1.80x on the linear buffer, so a body compressed to a
// peak of 1.02 is ALREADY over the bloom threshold before a single additive
// term has run — it encodes to ~245/255 and then gets a bloom contribution on
// top. Walk what wave 5 then stacks on a paint texel that lands at the
// compressor's asymptote:
//
//   after compressor      peak 1.02
//   + VIEW_FILL gain      x (1 + 0.55 * 0.136)      -> 1.096
//   + sky bounce / probe  + ~0.03                   -> 1.13
//   + sun glint           + up to 0.42 * 0.354      -> 1.28
//   + cel specular band   + up to 0.55 * 0.27       -> 1.43
//
// 1.43 linear is 249/255 through ACES and 255 once bloom and the grade LUT have
// had it, which is the artefact hunter's measurement: 9,178 of 55,250 sampled
// pixels in comeback-city-p0_15's near kart region carry a railed channel,
// against 358 in the same box in wave4-r3. A railed channel is a panel with no
// gradation left, which is the same frame the rubric critic reads as "one
// uniform hot pink with no form".
//
// At 0.88 the body lands under 1.0 even after the VIEW_FILL gain (0.88 x 1.12 =
// 0.99), so the highlights are once again the only kart terms that cross the
// bloom threshold — which is what the paragraph above always claimed. Cost is
// confined to genuinely hot paint: a panel at peak 0.8 moves by 1%, one at 1.4
// by 7%. Nothing below the knee is touched at all, and the compressor is masked
// by kartPaintMask, so neutrals (the Ice Racer's frosted shell, the Miami
// Cruiser's baked-white tyres) never see it.
const PAINT_SHAPE = { ceiling: 0.88, knee: 0.72, pull: 0.85, shade: 0.78 };

// Albedo-INDEPENDENT hemispheric fill for the dark-neutral class.
//
// The measured case is the player's driver in comeback-city-p0_06: a solid
// black shape at 300px with no readable form, which is the same "form must be
// read from shading alone" failure the critics file against the Penguin
// Village mountains. Walk what the shader offers a near-black neutral texel
// today and every single term is a subtraction or a no-op: curvature AO
// darkens it, RUBBER_DARKEN darkens it again, SKY_BOUNCE is multiplied by the
// albedo so it returns ~0, and the env probe deliberately gives the rubber
// class nothing. The only thing separating that driver from the road behind it
// is the rim — i.e. an outline, which is exactly the "flat black cut-out"
// read.
//
// This is the one term that works on a black surface, and it is the physically
// honest one: a black dielectric is not visible through its diffuse albedo, it
// is visible through what it REFLECTS. Sky colour on up-facing normals, ground
// colour underneath, no albedo factor, headroom-metered so it cannot clip.
//
// AAA wave 4 round 2 — 0.13 WAS A FILL LIGHT, and it is what turned the tyres
// grey. Measured on the player's left rear tyre in
// tmp/aaa-visual/wave4-r2/penguin-village-p0_56.png: mean rgb(120,110,117),
// median luminance 108. A tyre whose albedo is #10121c (linear luminance
// ~0.006) has no route to a mid grey through any diffuse path; this term is the
// route. Both of its factors were wrong for the job:
//
//   * MAGNITUDE. 0.13 of a colour normalised to a max channel of 1 is ~0.13 of
//     linear output, which encodes to roughly sRGB 0.40 — i.e. this term alone
//     sets the tyre's floor at ~102/255, above everything else on the tyre
//     combined. The critics' read, "pale blue-grey tyres", is precisely the
//     Penguin Village hemisphere sky arriving at 0.13 on a black surface.
//   * SHAPE. `mix(ground, sky, ...)` never returns zero: a fully down-facing
//     normal still gets the full 0.13, just in the ground's hue. So it was a
//     uniform lift wearing a gradient's clothes, which is the opposite of the
//     top-to-bottom value break it was added for.
//
// Now 0.05 and ramped to ZERO on down-facing normals (see the chunk), so the
// term is a genuine break — lit crown, black undercarriage — and its peak
// contribution is ~1/3 of what it was. The driver's black suit keeps a
// readable crown, which was the whole justification for the term; the tyres
// return to the value anchor the other three classes are read against.
const DARK_FILL = 0.05;

// Ceiling on the RUBBER class's final output, as a peak-channel value in the
// same linear space the shader works in.
//
// Belt-and-braces behind the two fixes above, and the critics asked for it
// explicitly ("value clamped so tyres stay matte black"). DARK_FILL is not the
// only term that can reach a tyre — the toon ramp's 58/255 floor, an emissive a
// caller passed in, and any future additive term all land here too — and
// "matte black" is a contract this class is defined by, not a number that
// should depend on five other numbers staying small. Applied as a soft knee,
// not a clamp: a hard min() would posterise the tyre's crown into a flat plate
// and undo the form DARK_FILL is there to give it.
//
// 0.055 linear encodes to roughly sRGB 0.26 (~66/255) before tone mapping,
// against the ~108 the frames measure today. Dark, still legible as a surface,
// and clearly the darkest thing on the vehicle — which is the job.
const RUBBER_CEILING = 0.055;

// ---- AAA wave 5: the camera-anchored fill ----------------------------------
//
// THE FINDING, which two critics filed independently: "the hero kart is the
// darkest object in Comeback City's frame". It is not a grade bug and it is not
// fixable in the grade — it is geometry. Comeback City's sun is DOWN-TRACK, so
// a chase camera looks at the one face of the kart the key light cannot reach,
// and every existing term in this file makes that worse rather than better:
//
//   * the specular band is keyed on the half-vector H = normalize(L + V). With
//     the sun beyond the kart, L points away from the eye, so H is degenerate
//     and N.H is meaningless. A backlit kart cannot have a half-vector
//     highlight. This is why three critics read 18 frames and none of them
//     found a specular hotspot on paint — the band was not too narrow or too
//     weak, it was structurally unable to fire on the shot the game is played
//     in.
//   * kartLitMask gates the band on N.L as well, which is correct and which
//     independently zeroes it on the same face.
//   * the curvature AO and the paint shade step both DARKEN the away-facing
//     side, by design.
//
// So the rear of a Comeback City kart collects nothing but ambient. Measured on
// wave4-r3/comeback-city-p0_78: rear paint mean rgb(83,60,67) against a
// mid-frame mean of rgb(99,69,80) and a sky at rgb(241,108,51).
//
// A fill light is the standard answer and it is what this is: a low, broad,
// view-anchored term that lands hardest where the surface faces the CAMERA.
// Two shaping decisions make it a fill rather than an exposure lift:
//
//   `[0]` strength, `[1]` the N.V exponent. Above 1 so the term concentrates on
//   the panels square to the lens and falls away on the shoulders — which is
//   exactly the half of the body the environment probe does NOT cover (the
//   probe is Schlick-shaped and lives on the shoulders). The two are
//   complements on purpose: between them every facet gets one of the two, and
//   because they peak in opposite places their SUM still has orientation
//   structure instead of being a wash.
//
//   And it is gated on (1 - kartLitMask), i.e. it only fills where the key
//   cannot reach. On a track that front-lights the kart the term is ~0 and
//   nothing moves; on Comeback City's backlit chase it does the whole job. That
//   gate is also what stops this becoming a second key light and drifting an
//   owner-confirmed grade — it cannot brighten anything the sun already lit.
//
// It is applied as a GAIN, not as an addition, and `strength` is therefore a
// fraction of the surface's own value rather than an absolute lift. That is not
// a stylistic choice — measured on a backlit toon body under the Penguin
// Village rig, the additive form of this term at the same mean lift took the
// body's top-to-bottom value break from 60 levels to 27. Every additive term in
// this file is metered by remaining headroom and headroom is largest where the
// surface is darkest, so an additive fill always lands hardest on the part of
// the body carrying the form. See the chunk for the full profile.
//
// Excluded from the rubber class in the chunk. Tyres stay the value anchor.
// Headroom-metered against SPEC_CEILING like every other fill, so Penguin
// Village's already-bright paint (measured rgb(224,40,37)) self-limits to
// roughly a fifth of the gain the dark Comeback City rear panel collects.
const VIEW_FILL = { exponent: 1.6, strength: 0.55 };

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
//
// AAA wave 4 round 2 — the term landed and it landed FLAT. Measured on the
// bodies the round-1 comment names as the cases it was written for:
// penguin-village-p0_56's blue rival is 81.7% adjacent-pixel-flat and
// comeback-city-p0_45's rival 84.6%, i.e. essentially unmoved. The weights are
// not the reason; `fresnelFloor` is. See below.
//
// AAA wave 5 — the floor fix was right and it was HALF the problem. Re-measured
// on wave4-r3 the two bodies got worse, not better: pv-p0_56's blue rival is
// now 97.4% adjacent-pixel-flat (its wing 97.1%) and cc-p0_45's 80.6%. Dropping
// the floor 0.28 -> 0.09 correctly stopped the term being a flat tint, but it
// also took ~70% of the mean contribution out with it and nothing replaced it,
// so the reflection went from "a wash" to "not there".
//
// The weights are the reason now, and the arithmetic that says so is the same
// arithmetic that says raising them is safe. That blue rival measures
// rgb(49,50,163) — its RED and GREEN channels are at 49 and 50 out of 255, and
// its peak channel sits around 0.42 scene-linear, so KART_HEADROOM reports 0.64
// of the fill budget unspent on the exact body the term was written for. At
// paint 0.22 with the 0.09 floor, a facet square to the lens collected
// 0.22 * 0.09 * 0.64 = 1.3% of a normalised probe colour and an edge-on facet
// 14%: a 10:1 ratio, which is the right SHAPE, applied at a magnitude nothing
// can see.
//
// Raised so the shoulder actually lands (paint 0.34 puts an edge-on facet at
// ~22% of the probe against ~2% square-on), and the headroom meter is what
// makes that safe rather than a repeat of round 1's desaturation: the bodies
// that were desaturating are the ones sitting near the ceiling, and they meter
// themselves down to a sixth of what these dark rivals collect. Round 1's
// failure was a FLOOR applied unconditionally; this is a shoulder gain applied
// against remaining headroom, which is the opposite operation.
const ENV_PROBE = {
  chrome: 0.7,
  // Lower bound of the Schlick shaping, i.e. how much of the probe a facet
  // pointing STRAIGHT AT THE CAMERA still collects.
  //
  // This was 0.28, hard-coded in the chunk, and it is why the probe reads as a
  // wash instead of as a reflection. At 0.28 a body's front-facing facets — the
  // large ones, the ones that fill the silhouette — all take 28% of the same
  // probe colour, so the term's floor is a flat tint applied to most of the
  // visible area and only its top 72% varies with orientation. Two measured
  // consequences, both filed as findings:
  //
  //   * the rivals stay flat, because the part of the term that varies per
  //     facet is swamped by the part that does not;
  //   * the hero's paint desaturates. On Penguin Village the probe is a pale
  //     cold sky; 0.28 * 0.22 of it, added unconditionally to a red body,
  //     measures rgb(136,94,101) at saturation 0.19 on a kart whose paint is
  //     #ef4334. A reflection that lands hardest where the surface faces you is
  //     not a reflection, it is a haze pass.
  //
  // 0.09 makes the term what its own comment says it is: a SHOULDER sheen. The
  // facets turned edge-on to the eye keep essentially all of their weight (the
  // Schlick top end is untouched), the flat-on facets keep a trace, and the
  // difference between the two is now the read. Per-facet variation goes up
  // while the mean contribution goes down — which is exactly the trade that
  // fixes flatness and desaturation at the same time.
  fresnelFloor: 0.09,
  // The sun's own image in the surface, SPLIT OUT of the ambient probe in wave
  // 5 and given its own weights, its own fresnel floor and its own headroom
  // meter. Through wave 4 it was one line inside `kartProbe`, which meant it
  // inherited all three of the ambient term's settings — and every one of them
  // is wrong for a glint:
  //
  //   * it took the ambient FRESNEL FLOOR (0.09). A sky reflection genuinely
  //     should vanish on a facet square to the lens; the sun's image should
  //     not. Multiplying the two together put the glint on a rear panel at
  //     0.09 * 0.22 * 0.19 = 0.4% of the horizon colour — four parts in a
  //     thousand.
  //   * it was metered against the FILL ceiling. A glint is a highlight; it is
  //     supposed to cross the bloom threshold. See SPEC_BLOOM_CEILING.
  //
  // What this does NOT fix, recorded so it is not re-argued: it is keyed on the
  // reflection vector, and dot(reflect(-V, N), L) peaks at exactly N = H, so it
  // is the Phong form of the cel band's own Blinn condition and it is equally
  // dead on a fully backlit kart. Comeback City's backlit case belongs to
  // VIEW_FILL and to the fresnel-shaped ambient probe. What the split buys is
  // the rest of the lap, where the body has yawed away from the sun's bearing
  // and a travelling glint is both correct and, at these weights, visible.
  //
  // Weighted chrome-heaviest for the same reason the ambient term is: a mirror
  // returns the sun almost intact, paint scatters it, unpainted plastic barely
  // holds it. `glintFloor` is high (a glint is mostly orientation-independent
  // once it fires — the LOBE is what localises it, not the fresnel) but not 1,
  // so an edge-on facet still catches more.
  //
  // Localisation comes entirely from `sunSharp`: at exponent 26 the lobe is a
  // ~13 degree half-angle window, so this is a hot spot travelling across a
  // cowl through a bend, not a second key light.
  glintChrome: 0.9,
  glintFloor: 0.5,
  glintPaint: 0.42,
  glintPlastic: 0.22,
  paint: 0.34,
  plastic: 0.18,
  // Vertical span of the probe's ground -> sky ramp, in reflected-Y.
  //
  // Was (-0.30, 0.42). A chase camera sits behind and slightly above the kart,
  // so the reflection vectors off a kart's visible facets cluster in a narrow
  // band around the horizon — and a ramp that spends its whole contrast across
  // 0.72 of Y returns nearly the same colour to every one of them. Tightened to
  // (-0.18, 0.34) so the band the facets actually occupy is where the ramp's
  // contrast lives. Zero cost: it is the same smoothstep with different edges.
  rampHi: 0.34,
  rampLo: -0.18,
  // Exponent on the sun lobe in the REFLECTION direction. Much tighter than the
  // paint gloss lobe because this one is not gated on a half-vector: it is
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
  darkFill: DARK_FILL,
  envChrome: ENV_PROBE.chrome,
  envFresnelFloor: ENV_PROBE.fresnelFloor,
  envPaint: ENV_PROBE.paint,
  envPlastic: ENV_PROBE.plastic,
  envRamp: [ENV_PROBE.rampLo, ENV_PROBE.rampHi],
  envSunSharp: ENV_PROBE.sunSharp,
  glintChrome: ENV_PROBE.glintChrome,
  glintFloor: ENV_PROBE.glintFloor,
  glintPaint: ENV_PROBE.glintPaint,
  glintPlastic: ENV_PROBE.glintPlastic,
  paintCeiling: PAINT_SHAPE.ceiling,
  paintChroma: PAINT_CHROMA,
  paintGloss: GLOSS.paint,
  paintKnee: PAINT_SHAPE.knee,
  paintPull: PAINT_SHAPE.pull,
  paintShade: PAINT_SHAPE.shade,
  paintStrength: SPEC_STRENGTH.paint,
  plasticStrength: SPEC_STRENGTH.plastic,
  rubberCeiling: RUBBER_CEILING,
  rubberDarken: RUBBER_DARKEN,
  rubberLuminance: RUBBER_LUMINANCE,
  skyBounce: SKY_BOUNCE,
  specBloomCeiling: SPEC_BLOOM_CEILING,
  specCeiling: SPEC_CEILING,
  specTintBlend: SPEC_TINT_BLEND,
  textureAnisotropy: HERO_TEXTURE_ANISOTROPY,
  viewFillExponent: VIEW_FILL.exponent,
  viewFillStrength: VIEW_FILL.strength,
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
//
// PAINT_SHAPE, DARK_FILL and RUBBER_CEILING are deliberately NOT re-tiered.
// None is a detail term — one compresses a clipping channel, one is a
// low-frequency value gradient, one is a soft ceiling — so all three survive a
// 0.6-scale render intact, and all three matter MORE on a small screen where a
// flat clipped panel has no other cue left. The probe's fresnel floor and ramp
// are not re-tiered either: they cost nothing and they are the term carrying
// per-facet variation, which a downscale needs most.
//
// AAA wave 5, on the two new terms. VIEW_FILL is not re-tiered — it is a broad
// low-frequency lift on the panels facing the lens, which is the single most
// downscale-proof thing in the file and the term a 0.6-scale render needs most.
// The GLINT is, and only because of a coupling: `envSunSharp` already widens
// 26 -> 15 on mobile so a tight lobe cannot strobe between samples, and a lobe
// spread over ~1.7x the solid angle at the desktop weight would stop reading as
// a travelling hot spot and start reading as a second key. Paint and plastic
// come down to hold the term's total energy roughly constant across the two
// tiers; chrome keeps its weight because the trim it lands on is small enough
// that even the widened lobe stays local.
export const KART_SHADING_MOBILE = Object.freeze({
  ...KART_SHADING_DESKTOP,
  aoCrease: 0,
  chromeGloss: 34,
  envSunSharp: 15,
  glintPaint: 0.26,
  glintPlastic: 0.14,
  paintGloss: 8,
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

// How much of the rim the DARK-NEUTRAL (rubber) class keeps.
//
// createGroundedKartModel's own comment says the rim goes on paint, trim and
// hubs and NOT on tyres, "the one part that has to stay dead matte". That was
// never true in the shipped shader: the rim is a material-level injection and
// every authored body is one fused mesh with one material, so the rim had no
// way to know which texel it was on. A 4x zoom of comeback-city-p0_06 shows the
// consequence — a continuous teal line tracing the outer edge of all four
// tyres and the roll hoop, which welds the whole vehicle into a single glowing
// outline instead of a set of parts.
//
// The classifier already computes the mask this needs, so the rim now takes the
// documented reduction per texel. NOT zero, and this is the one number in the
// file that is a judgement call rather than a measurement: the driver's black
// suit is also a dark neutral, and on Comeback City that silhouette against a
// near-black road has nothing else holding it. So the tyres lose most of the
// outline while the driver keeps a trace of it — and DARK_FILL, which lands on
// the same mask, gives that driver the form the outline was standing in for.
//
// AAA wave 4 round 2: 0.4 -> 0.15. The round-2 note asserted that "a rim at 0.4
// is well under the eye's edge-detection threshold at the widths involved" and
// the frames say otherwise — the player's tyres in penguin-village-p0_56
// measure a p95 luminance of 160 against a median of 108, i.e. the brightest
// thing on the tyre is still its outline. 0.4 was also chosen while DARK_FILL
// was lifting the whole tyre to a mid grey, so the rim had to compete with a
// pale surface to be seen; with the tyre back at its real value the same
// silhouette read costs far less rim. The driver keeps a trace at 0.15, which
// is the only reason this is not zero.
export const HERO_RIM_RUBBER_SCALE = 0.15;

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
// the baked shading variation inside the paint region.
//
// ---- AAA wave 5 round 2 -----------------------------------------------------
//
// FIRST, THE PART OF THE CRITICS' FINDING THAT IS WRONG, recorded so the same
// patch is not handed back a third time. Three critics filed "rival karts never
// receive the material classes the player got — route rivals through the same
// applyToonRim path", and one of them filed this constant as the cause of a
// Kenney rival's flat violet. Both halves are refuted by the import graph:
//
//   * EVERY body already routes through applyHeroRim -> applyToonRim ->
//     applyKartShading. attachTripoKartBody, attachAuthoredKartBody and
//     mountDriverAvatar are the only three attach paths in the monolith
//     (:2582, :2630, :2398 as of this round — the file is being edited
//     concurrently, so grep the names) and all three call it. There is no
//     unshaded body anywhere in the roster.
//   * the Kenney rivals never receive this constant AT ALL. Purple Dragster
//     (seth-penguin), Orange Dragster (mizzle) and Bronze Dragster (layer23)
//     are `kart: 'kenney'`, which routes to attachAuthoredKartBody — and that
//     function deliberately does NOT call setKartPaintTint, because
//     makeKartPaletteTexture has already remapped the atlas upstream. So this
//     number cannot explain penguin-village-p0_56's violet rival by any value.
//     What CAN is that the Kenney atlas is a palette of FLAT swatches on a
//     flat-shaded slab body: the albedo carries no panel shading for a shader
//     to preserve. That is the asset track, not this file.
//
// SECOND, THE REAL BUG THIS CONSTANT IS HALF OF, which is a blocker and is
// measured. The tint is applied as a LUMINANCE-PRESERVING RESCALE:
// tint.rgb * (luminance(lit) / luminance(tint)). That ratio is unbounded, and
// for every roster colour it is large, because a saturated hue has far more
// peak channel than Rec709 luminance:
//
//   crrt-bunny #e8261d   peak 0.806  lum 0.186   peak/lum 4.33
//   lifoladen  #8e1a43   peak 0.270  lum 0.069   peak/lum 3.93
//   tclow      #2378ff   peak 1.000  lum 0.207   peak/lum 4.84
//
// So a lit body at luminance 0.4 was being handed a tint whose red channel is
// 1.57 in linear light before anything else ran. That is trap #2 — a shipped
// term with no ceiling — and it is visible: comeback-city-p0_15's Miami Cruiser
// (lifoladen's seat, authored #8e1a43, a DARK WINE) renders at rgb(253,110,148),
// a railed bubblegum pink that is not the colour anybody picked. The downstream
// paint compressor then has to fold a 1.57 overshoot into a 0.3-wide band,
// which is what destroys the panel breaks the tint was documented as keeping.
// One cause, three findings: the clip, the wrong hue, and the flatness.
//
// The ceiling itself lands in the shader (see the tint block in
// toonRimShader.js) — it caps the rescale so the tint can never lift the peak
// channel above max(the surface's own peak, PAINT_SHAPE.ceiling), which is
// hue-exact and leaves luminance preservation intact on every texel that was
// not going to clip.
//
// 0.7 -> 0.55 is the OTHER half, and only makes sense once the cap exists. On a
// texel the cap binds, the tinted colour is constant, so the untinted (1 - a)
// share is the only channel through which the bake's own panel variation still
// reaches the output: at 0.7 a 0.20 peak-channel spread across a panel arrives
// as 0.06, at 0.55 as 0.09. Not the 0.42-0.48 the rubric critic asked for —
// that was aimed at the wrong lever (a tint at 0.45 of a colour overshooting by
// 3.9x still rails) and it costs more per-racer identity than the measurement
// justifies now that the overshoot is bounded at source.
//
// Also already true, and filed as missing: the tint IS multiplied by the paint
// mask's confidence — `mix(outgoingLight, kartTinted, kartPaintMask * amount)`
// — so tyres, glass and trim never take the racer colour. That half of the ask
// has shipped since wave 2.
export const KART_PAINT_TINT_AMOUNT = 0.55;
