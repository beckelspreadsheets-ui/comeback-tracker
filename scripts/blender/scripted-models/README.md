# Scripted models (trial, 2026-11-10)

Rebuilds of the Tripo-made models, written as Blender Python so the result is
our own work. Owner approved the trial on 2026-11-10 (App Store audit,
section 12, question 6). **Nothing here is loaded by the game yet.**

Comparison page (current vs new, three angles each):
https://claude.ai/artifact/NY8hRucuBSpp1GS1KLw4QV

| Model | Current | Scripted | State |
|---|---|---|---|
| Hero kart (`hero-kart-tripo.glb`) | 23,170 triangles, 1,049 KB | 7,152 triangles, 317 KB | Close. One or two more rounds, then try it in the game. |
| Seth Penguin (`seth-penguin.glb`) | 12,826 triangles, 506 KB | 4,242 triangles, 104 KB | Recognisable, not a match yet. Face edge, goggles and jacket need work. |

Still to do: CRRT Bunny (the third Tripo model) has not been started.

## Build

    blender -b -P scripts/blender/scripted-models/build_kart.py -- out/hero-kart-scripted.glb renders/kart-new
    blender -b -P scripts/blender/scripted-models/build_seth.py -- out/seth-penguin-scripted.glb renders/seth-new
    blender -b -P scripts/blender/scripted-models/render_current.py -- <current.glb> renders/kart-current <nx> <ny>

`build_lib.py` holds the shape helpers, `render_lib.py` the shared camera and
lights. Each build script takes the output GLB path and a render prefix as its
last two arguments. Export is Blender's own glTF exporter; never run
`gltf-transform optimize` on the result.

## What the game needs for a drop-in

- **Kart:** length 1.0 along +X, ground at 0. Wheel nodes are found by name
  (`/wheel|tyre|tire/i`), spun on local X, and the front pair steered on local
  Y. The scripted kart has `wheel_front_l/r` and `wheel_rear_l/r` under
  `hub_*` parents. It exports 22 primitives over 7 flat materials; merge the
  same-colour parts before use.
- **Seth:** one static seated mesh, height 1.0, feet at 0, facing +X.

## Not verified

- Neither GLB has been loaded in the game. The kart's brake-lamp and exhaust
  placement (the fused-body analysis) is untested with separate wheels.
- Renders are Blender Eevee with matched camera and lights, not the game's
  lighting or outline.
- The likeness needs the owner's eye, and Seth's.
