# Kart revamp pipeline

Rebuilds a kart from nothing with a Blender Python script, bakes its colour
into one texture, and trials it in the game behind a dev/trial-only switch.
First kart done this way: Hash Runner (`build_hashrunner.py`, `?hashRunner=v2`).

Needs Blender 5.x at `/opt/homebrew/bin/blender` and Node 22. No external
assets, no network.

## What the game needs from the file

- In a race every kart material is replaced by a toon material that keeps
  only the colour texture. Metalness, roughness, emissive and colour factors
  are dropped, so everything that must be seen in a race (stripes, panel
  lines, shading in creases, lamp colours) has to be in the baked colour map.
  The select screen does use the full materials.
- Wheels: four nodes named `wheel_front_l`, `wheel_front_r`, `wheel_rear_l`,
  `wheel_rear_r`, one mesh each, each under a hub node. Nothing else may have
  "wheel", "tyre" or "tire" in its name. The game spins them on local X and
  steers the ones with "front" in the name on local Y.
- Facing and size: the file must face the same way and sit on the same origin
  as the kart it replaces (Hash Runner: nose on glTF -X, origin at the centre
  of the footprint, wheels touching y = 0). The game scales to fit by length
  and height, so proportions matter, absolute size does not.
- Driver: in a race the driver is placed 0.135 kart lengths behind the origin
  at 0.46 of the kart's height, and is about 0.41 kart lengths tall. Leave an
  open cockpit there.
- Paint: racer tints and bought paints recolour every saturated texel. Keep
  tyres, metal, seat and trim grey (low saturation) so they stay put.
- Size: at or under the Hero Kart file (1,049 KB). Hash Runner v2 is 466 KB.

## Steps for another kart

1. Copy `build_hashrunner.py` to `build_<kart>.py`. Keep the structure
   (materials, body parts, `build_wheel`, bake, export); change the colours,
   the `HULL` section table and the parts. `kart_lib.py` has the helpers
   (lofts, bevelled boxes, lathes, tubes, bake, export).
2. Build and pack:
   `./build.sh <kart> <output-name>` (for example `./build.sh hashrunner hash-runner-v2`).
   This runs Blender, then `pack-glb.mjs` (meshopt only, never
   `gltf-transform optimize`), then prints triangles, size and node names.
   While shaping, run Blender by hand for speed:
   `blender -b -P build_<kart>.py -- out/<name>.glb --preview renders/wip --nobake`
   (quick stills, no bake).
3. Compare in the fixed studio: edit the three model lines in `compare.sh`
   and run it. It writes `renders/compare-{front34,side,rear34}.jpg`
   (Hero Kart, current kart, new kart). Look at them and go back to step 1.
   Hash Runner took five rounds.
4. Add the trial switch, copying the two `hashRunner` blocks in
   `src/game/ComebackCityThreeKartRace.jsx` (`hashRunnerUrl`) and
   `src/kart/KartModelStage.jsx` (`stageKartUrl`). The `TRIAL_MODELS` test
   must be in the same expression as the `import('...glb?url')` so the store
   build drops the file.
5. Capture the game: `node scripts/blender/kart-revamp/game-shots.mjs tmp/kart-revamp v2=<query>`
   (`GAME_SHOTS_CHARACTER` picks the racer; the paint pass writes the
   equipped paint under the kart key `hashrunner`, change that one line for
   another kart). It
   starts its own dev server on port 5377, photographs the setup screen all
   the way round the turntable, tries a paint, runs a race, and writes
   `report.json` with console errors, wheel spin and steer, and the driver
   position. Check the pictures by eye.
6. Thumbnail candidate:
   `node scripts/blender/kart-revamp/thumb.mjs <glb> <out.png> -x 5.3`.
   It never writes into `src/assets/game/select`.
7. `npm run build:kart:store`, then check `dist-kart` has no trace:
   `grep -rl "<output-name>\|kart-revamp" dist-kart` must print nothing.

## Hash Runner trial

- `?hashRunner=v2` loads the rebuilt kart on the setup screen and in races.
- `&hashRunnerTint=off` also skips Seth's colour wash in the race, so the
  kart shows its own baked purple and mint.
