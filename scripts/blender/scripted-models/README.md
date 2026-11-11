# Scripted models (trial, 2026-11-10)

Rebuilds of the Tripo-made models, written as Blender Python so the result is
our own work. Owner approved the trial on 2026-11-10 (App Store audit,
section 12, question 6). The kart loads in the game only behind a test switch
(`?heroKart=scripted`, and only in `npm run dev:kart` or a build made with
`VITE_KART_TRIAL_MODELS=1`; the store build carries neither the switch nor
the file). Seth is not loaded by the game.

Comparison page (current vs new, three angles each):
https://claude.ai/artifact/NY8hRucuBSpp1GS1KLw4QV

| Model | Current | Scripted | State |
|---|---|---|---|
| Hero kart (`hero-kart-tripo.glb`) | 23,170 triangles, 1,049 KB | 7,152 triangles, 453 KB, 5 draws | In the game behind `?heroKart=scripted` (2026-11-11). Works; the rear view is plainer than the current kart. |
| Seth Penguin (`seth-penguin.glb`) | 12,826 triangles, 506 KB | 4,586 triangles, 137 KB, 1 draw | Closer after the 2026-11-11 rounds (goggles, face, scarf, jacket, mitts, feet). No painted detail. Not in the game. |

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
  `hub_*` parents. Colours are baked per vertex (`bake_colours` in
  `build_lib.py`), so the GLB is one material and five primitives: the body
  and four wheels. Every hub is turned the same way (wheel X = the kart's
  right) so the game's one spin sign rolls all four forward.
- **Seth:** one static seated mesh, height 1.0, feet at 0, facing +X.

## Checked on 2026-11-11 (desktop Chromium, dev server, Comeback City)

- `?heroKart=scripted&character=crrt-bunny`: the kart loads, fits like the
  current one, the driver sits in the seat, exhaust flames sit at the tail,
  no console errors in a 16 s autoplay race.
- Measured in a live race through a temporary debug hook (not committed): four
  named wheels, all spinning at the same rate, the front pair taking the steer
  angle, axles one wheel radius above the ground.

## Not verified

- The scripted kart on a phone or in the simulator (the switch is a URL
  value in dev and trial builds, so the installed app cannot reach it), on rivals, with a bought
  paint, or on the select screen.
- Brake-lamp placement was not looked at under braking.
- Seth's GLB has not been loaded in the game.
- Renders are Blender Eevee with matched camera and lights, not the game's
  lighting or outline.
- The likeness needs the owner's eye, and Seth's.
