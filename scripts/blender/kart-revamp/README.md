# Kart revamp pipeline

Rebuilds a kart from nothing with a Blender Python script, bakes its colour
into one texture and packs a GLB the game takes as a drop-in replacement.
First kart done this way: Hash Runner (`build_hashrunner.py`), promoted to
`src/assets/game/models/karts/hash-runner.glb` on 2026-11-19.

Needs Blender 5.x at `/opt/homebrew/bin/blender` and Node 22. No external
assets, no network.

## Drop-in contract

A rebuilt kart replaces its file in `src/assets/game/models/karts/` and
nothing else. The game reads everything below from the file itself; the only
per-kart table row is the facing, `KART_NOSE_YAW` in
`src/game/ComebackCityThreeKartRace.jsx`, and a rebuild that keeps the old
file's facing does not touch it.

| What | Rule |
|---|---|
| Facing | Same as the file it replaces. The five Meshy karts and the Hash Runner have the nose on glTF **-X** (`KART_NOSE_YAW` = `Math.PI / 2`), Y up. |
| Origin | Centre of the footprint, on the ground: the lowest point of the tyres is y = 0 and nothing hangs below them. |
| Scale | Free. The race fits the kart to 15.6 long or 7.8 high, whichever is smaller; the setup stage fits it to a fixed height. Proportions are what matter (Hash Runner: 1.0 long, 0.83 wide, 0.45 high). |
| Wheels | Mesh nodes whose names contain `wheel`, each ONE primitive: `wheel_front_l`, `wheel_front_r`, and either `wheel_rear_l` + `wheel_rear_r` or one joined `wheel_rear` (`pack-glb.mjs --join-rear`). A name containing `front` steers. No other node may contain `wheel`, `tyre` or `tire`. |
| Wheel axes | Each wheel sits under a hub node (`hub_front_l`, ...) at the axle centre. The hub carries the rotation that makes the wheel's local X the kart's right-hand direction; the wheel node itself has no rotation. The game spins on local X and steers on local Y. Axle height must equal tyre radius. Left wheels are mirrored mesh data, not negative scale. |
| Seat | An empty node `seat_mount` on the centre line at the middle of the seat (`pack-glb.mjs --seat=<x>`). The race and the setup stage put the driver over it. Only its position along and across the kart is read; height is the game's rule (0.46 of the kart's height in a race). Leave the cockpit open above it: the driver is about 0.41 kart lengths tall and 0.4 wide. Without the node the race seats the driver 2.1 units (0.135 lengths) behind the origin and the stage in the middle. |
| Materials | One material, one colour texture. In a race every material is replaced by a toon material that keeps ONLY the colour map (and vertex colours): metalness, roughness, emissive and colour factors are dropped. Stripes, panel lines, crease shading and lamp colours must be baked into the colour map. The setup stage does use the full material. |
| Paint | Racer tints and bought paints recolour every saturated texel (chroma above about 0.08 to 0.3, linear). Keep tyres, metal, seat and trim grey so they stay put. Accents in a second saturated colour will take the tint too. |
| Size | No larger than the Hero Kart file (1,049 KB), and the kart bundle gate must pass (`npm run test:bundle:kart`: largest file 3 MiB, images 2.5 MiB in total). Hash Runner: 462 KB, 21,816 triangles, 4 draw calls, one 1024 colour JPEG plus two 256 maps. |
| Compression | `pack-glb.mjs` only (meshopt level high). Never `gltf-transform optimize`. |
| Thumbnail | `src/assets/game/select/kart-<key>.webp`, 480 x 480, transparent, about 10 KB (`cwebp -q 60 -alpha_q 90`). |

The body pitches up to 3 degrees under power and braking and rolls in
corners (`updateKartBodyMotion`), wheels included, so a measured axle height
in a moving race is not the resting one. Measure on the grid.

## Steps for another kart

1. Copy `build_hashrunner.py` to `build_<kart>.py`. Keep the structure
   (materials, body parts, `build_wheel`, bake, export); change the colours,
   the `HULL` section table and the parts. `kart_lib.py` has the helpers
   (lofts, bevelled boxes, lathes, tubes, bake, export).
2. Build and pack:
   `./build.sh <kart> <output-name> [pack options]`, for example
   `./build.sh hashrunner hash-runner-v2 --seat=0.136 --join-rear`.
   This runs Blender, then `pack-glb.mjs` (meshopt only, never
   `gltf-transform optimize`; `--seat` adds the `seat_mount` node, `--join-rear`
   joins the rear wheels), then prints triangles, size, draw calls and node
   names. While shaping, run Blender by hand for speed:
   `blender -b -P build_<kart>.py -- out/<name>.glb --preview renders/wip --nobake`
   (quick stills, no bake).
3. Compare in the fixed studio: edit the three model lines in `compare.sh`
   and run it. It writes `renders/compare-{front34,side,rear34}.jpg`
   (Hero Kart, current kart, new kart). Look at them and go back to step 1.
   Hash Runner took five rounds.
4. Copy `out/<output-name>.glb` over the kart's file in
   `src/assets/game/models/karts/`. No source change is needed if the
   contract above is met.
5. Capture the game: `node scripts/blender/kart-revamp/game-shots.mjs tmp/kart-revamp final=`
   (`GAME_SHOTS_CHARACTER` picks a racer who starts in the kart, default
   `tclow` for the Hash Runner; the paint pass writes the equipped paint under
   the kart key `hashrunner`, change that one line for another kart). It
   starts its own dev server on port 5377, photographs the setup screen,
   tries a paint, runs a race, and writes `report.json` with console errors.
   Wheel and seat measurements are only filled in when the page exposes
   `window.__comebackCityKartPlayerModel`; the game does not ship that hook,
   so add `window.__comebackCityKartPlayerModel = engine.playerModel;` next to
   the `__comebackCityKartSession` line while measuring and take it out again.
   Check the pictures by eye.
6. Thumbnail:
   `node scripts/blender/kart-revamp/thumb.mjs src/assets/game/models/karts/<file>.glb out.png -x 5.3`
   then `cwebp -q 60 -alpha_q 90 out.png -o src/assets/game/select/kart-<key>.webp`.
7. `npm run test:kart:regressions`, `npm run build:kart`,
   `npm run test:bundle:kart`, `npm run test:select:stage`.
