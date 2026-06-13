# Penguin World — the iceberg makeover (owner-approved direction, 2026-06-12)

Owner verdict after the items arc: gameplay "fucking amazing"; the one thing left is **the
background / everything you see while driving**. Direction: make the world iceberg/arctic
penguin-themed — "the penguin thing gives us something amazing and easy to go with" — while
still reading as a race track. **Look changes, mechanics/layout don't** (mechanics are
90–95% loved). The neon dusk lock stays: this is arctic-neon, not daylight tundra.

## What the research says (classic ice-track grammar)

Mario Kart's ice tracks (Sherbet Land N64/GCN, Frappe Snowland) establish the vocabulary:

- **Penguins ARE the theme**: Sherbet Land's hazards are penguins waddling across the ice
  that spin you out — exactly our Penguin March. We're extending canon, not inventing.
- **A giant penguin landmark**: Sherbet Land's centerpiece is an island with a giant penguin
  in the middle of dark water. Ours = **giant ordinal penguin ice statues** (scaled roster
  GLBs, frosted toon material) — the community flex, basically free with our pipeline.
- **Dark water + jagged ice edges** around the racing surface; fall-in = freeze. We don't
  need the mechanic — the *read* (dark water, floes, bergs) is what sells arctic.
- **Snow walls/banks line the track** (Frappe's Tateyama-style walls) — natural side
  treatment that pairs with the owner's baked beveled-curb pick.
- **An ice cave section** narrows the track with pillars — our existing underpass can read
  as an ice tunnel (icicles under the bridge deck) without touching the centerline.
- **Road stays visually distinct** from the ice world: smooth dark surface vs white/blue
  surroundings, walls and item boxes marking the line. Critical rule: **the asphalt stays
  dark** — ice-blue accents at the edges only, or we trade readability for theme.
- Low-poly arctic packs (reference vocabulary): icebergs, ice columns/floes/crystals,
  snow pines, research-station domes/towers, aurora. Flat colors + strong silhouettes +
  shared small textures = our exact toon/baked/unlit pipeline.

## Element-by-element swap map (current scene → penguin world)

| Today | Becomes | How |
|---|---|---|
| Navy-purple gradient sky | Same gradient + **aurora bands + star field** | World-scale version of the Aurora Boost ribbon canvas (additive planes, slow sway) + star sprites. Cheap, unlit. |
| Grass/ground noise texture | **Snowfield** (white-blue noise) with **dark water inlets + ice floes** on outer areas | Re-tint the existing canvas-noise generator; floes = flat white polygons on dark planes. |
| Distant block skyline | **Iceberg/glacier silhouettes** with emissive cyan rims | New baked family via `bake-buildings.py` pattern → `baked-icebergs.glb`; swapped via the buildingSwaps registry. |
| Neon district buildings | **Ice hotel / research station / igloo domes**, cyan-emissive window bands | Re-dress + rebake the existing Blender building family with an ice palette (owner may render hero buildings later). |
| Tire stacks / generic props | **Snowmen, snow pines, ice column stacks** | Procedural or tiny bake; placed with `clearBuildingPlacement` as always. |
| Hard track sides | **Owner's baked-shell beveled lit curbs** + snow banks behind | Full-track bake (`bake-spike-segment.py` scaled up) AFTER the resize lands. Unlit = the FPS win. |
| Bridge + pillars | **Ice bridge**: translucent-cyan deck skirts, icicles beneath, frozen river under it | Material/geometry dressing on the existing bridge band; helps the round-7 "I never see the bridge" problem too. |
| (nothing) | **Giant ordinal penguin ice statues** at 2–3 landmark corners + an island statue beyond the rails | Scaled roster GLB clones, frosted/ice toon material, pedestals. Near-zero cost, maximum community flex. |
| (nothing) | **Penguin spectator clusters** near rails at the start straight and carousel exits | Reuse march waddlers idle-bobbing. Instanced/cheap, capped for FPS. |
| Lamps/portals/curb neon | Stay — arctic-NEON dusk is the lock | Recolor a few accents toward cyan/teal where they fight the ice palette. |

## Hard constraints

- Art direction lock: neon dusk (navy-purple sky, glowing accents, dark asphalt). No daylight.
- FPS floor: median ≥ 34 in `test:kart-3d-spike` on an idle machine. Everything above is
  unlit/baked/instanced; per-element budget rules from the visual arc still apply.
- Track LAYOUT untouched until the owner's separate resize call (round 7: ~1.2× larger,
  bridge/alt-routes must read). **Sequence: resize first, then bake, then dress.**
- Asphalt readability beats theme everywhere they conflict.

## Execution order (each round ends with gates + probe + preview + feel-check)

1. **Track resize + route readability** (round 7 ask): scale centerline ~1.2×, retune
   playable budgets, make the bridge and dare-ramp shortcut read (deck color, rails,
   marked ribbon). Mechanics-adjacent, do it before anything is baked.
2. **Sky + ground + skyline pass** (the 80% read): aurora bands, stars, snowfield re-tint,
   water inlets + floes, baked iceberg skyline. One feel-check.
3. **Landmarks + life**: giant ordinal statues, penguin spectators, snowmen/pine/ice props,
   ice-bridge dressing + underpass icicles.
4. **The big bake**: full-track shell with beveled lit curbs (owner's pick) + re-dressed
   ice buildings. Declares the look "done" pending owner hero renders.
5. Then back to the refinement list: audio (Phase 4), juice (Phase 5), lap count, track 2.

## Sources

- [Sherbet Land (Mario Kart 64) — Super Mario Wiki](https://www.mariowiki.com/Sherbet_Land_(Mario_Kart_64))
- [Frappe Snowland — Super Mario Wiki](https://www.mariowiki.com/Frappe_Snowland)
- [Low Poly Game Art guide — RetroStyle Games](https://retrostylegames.com/blog/low-poly-game-art-an-ultimate-guide/)
- [Arctic low-poly asset vocabulary — ITHappy](https://ithappystudios.com/environment/arctic/)
