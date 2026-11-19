// "Keep gold gold" (owner, 2026-11-19): the parts of a kart that paint must
// never recolour.
//
// The racer wash and a bought paint pick their texels by colour saturation
// alone (kartPaintMask in toonRimShader.js, stageMask in kart/stagePaint.js),
// so gold coins, brass, tail lamps and indicators went lilac, pink or cyan with
// the body. A hue test cannot tell them apart from a body that IS yellow,
// orange or tan (Block Reward, the Sat Stacker's sand paint), so the kart file
// says it instead, per vertex:
//
//   glTF attribute _PAINT_PROTECT (float): 1 = never recoloured, 0 = ordinary
//
// written by the kart build (scripts/blender/kart-revamp/kart_lib.py,
// mat(..., protect=True)) or stamped onto a shipped file by paint-protect.mjs.
// GLTFLoader hands it over as the geometry attribute `_paint_protect`.
//
// Why a vertex attribute and not a texture channel: a kart part is one
// material and is never welded to its neighbour, so the flag is exact per
// vertex, while the kart atlases are a mosaic of islands a few texels wide — a
// 256 mask in the roughness map's spare channel got whole coin stacks wrong.
// It is also the cheapest thing to read: no texture lookup in the race or on
// the setup stage, no texture memory, about 4 KB per kart file.
//
// A kart without the attribute is drawn exactly as before: the shaders only
// gain code behind a define those karts never set. Only the recolour is
// masked; a protected surface is still "paint" for shading.
export const PAINT_PROTECT_ATTRIBUTE = '_paint_protect';

export const hasPaintProtect = (geometry) => Boolean(geometry?.attributes?.[PAINT_PROTECT_ATTRIBUTE]);
