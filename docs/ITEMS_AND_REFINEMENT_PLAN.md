# Comeback City Kart — Items & Refinement Plan

Owner-approved plan (2026-06-12) for the next arc: the themed item set, then audio/juice,
then more tracks. Continues from `docs/GAMEPLAY_FEEL_PLAN.md` (Phases 1–3.5 all shipped).

## Context for a fresh session

- Runtime: `src/game/ComebackCityThreeKartRace.jsx` mounted at `/#race` via `RaceScreen.jsx`
  (which also owns the first-time intro overlay — `cc-kart-intro-seen` localStorage,
  auto-skipped when `navigator.webdriver` or autoplay params, REQUIRED or Playwright gates hang).
- Pure gameplay modules under `src/game/race/`: `driftFeel.js` (hop/drift/mini-turbo),
  `rivalRacers.js` (independent rival sim, personalities, rubber-band, bumps),
  `heldItems.js` (items, bananas, snowballs, comeback tables), `airTricks.js` (ramps,
  tricks, dare-ramp shortcut, crest launch).
- Track: generated centerline in `courseV2.js` (81 dense points; regenerate via arc/straight
  turtle script if layout changes — validate crossing/curvature/sim first). Variable width via
  `roadRibbons` (45 narrow / 56 carousels) smoothed in `sampler.widthAt`. Bridge band
  `{from 0.40, peak 21, to 0.534}`; crest kicker marks the launch.
- Asset pipelines (all proven):
  - Owner drops raw Tripo GLBs in `3d generations:character sheets/` (~16MB).
    Optimize: `gltf-transform weld → simplify --error 0.0008 → resize 512`.
    **Never `gltf-transform optimize`** — meshopt compression breaks GLTFLoader.
  - **Orientation lab before integrating ANY model**: `node scripts/orientation-lab-capture.mjs`
    → read tmp/orientation-lab/lab.png → authored yaw (all Tripo rigs so far face +X → −π/2;
    Kenney racer faces −Z → π). Never guess facing.
  - Blender headless bakes: `scripts/blender/bake-spike-segment.py` (track shell A/B),
    `bake-buildings.py` (building family → `public/baked-buildings.glb`, swapped in via
    `buildingSwaps` registry). Unlit MeshBasicMaterial in-engine = zero lighting cost.
- QA gates after every change: `npm run build`, `test:kart-proof`, `test:kart-playable`,
  `test:race`, `test:kart-3d-spike` (FPS median ≥ 34 — ONLY trustworthy on an idle machine;
  the owner's parallel AI sessions run GPU Blender bakes that crush WebGL; never optimize
  visuals off a busy-machine reading). Visual check: `node scripts/camera-probe-capture.mjs`.
  Owner review via `tmp/v2-approval-preview.html` (newest section on top, `open` it).

## The item set (owner's list, all design decisions approved)

Already live: **Snowball** (forward projectile, spins first kart hit), **shield** (→ Ice
Shield), **boost** (→ Hot Cocoa), **banana** (→ Fish Bone), position-weighted comeback
tables (`ITEM_TABLES` in heldItems.js), rivals throw snowballs when >0.8s behind.

Build order (one to two per round, feel-check each):

1. **Reskin pass** — rename keys/HUD to themed names; Fish Bone + Cocoa + Ice Shield
   visuals (owner may render models; Blender-bake otherwise). Per-character projectile
   skins: same Snowball slot renders as a **carrot (crrt)** for CRRT Bunny, ice shard for
   penguins — identical stats, cosmetic flavor only.
2. **Slap Fish** — melee swipe: spins any kart within ~12 units alongside; big fish swing
   visual. Counter to bumper personalities. Cheap, hilarious, build early.
3. **Avalanche** — leader-killer ultimate: targets whoever is P1 (wherever they are),
   rumble warning ~1.5s, then spin + heavy slow. P4-final-lap exclusive.
4. **Rocket Sardine** — homing missile at the kart DIRECTLY AHEAD (a passing tool, distinct
   from Avalanche): snowball that steers its lane toward the target; can be shielded.
5. **Blizzard Cloud** — dropped zone hazard: fog dome parked on the track ~8s, caps speed
   inside; readable and dodgeable; brutal in narrow sections.
6. **Aurora Boost** — invincibility + speed for ~3s, plows through bananas/snowballs/karts
   (they spin, you don't); aurora ribbon VFX.
7. **Penguin March** — signature ultimate: a waddle-train of the owner's ordinal penguins
   crosses the road at a chosen point; anyone who hits the line spins. The owner has MANY
   penguin ordinals to use as the waddlers (see memory: ordinals community).

Tiering rule (approved): P1 sees only defense (Fish Bone/Ice Shield); mid-pack gets
skirmish items (Snowball/Slap Fish/Cocoa); **ultimates (Avalanche, Aurora, Penguin March)
only appear P4 on the final lap** — earned by desperation, deterministic, tunable.

## After the items

- **Phase 4 — Audio** (biggest remaining feel multiplier): engine pitch from speed, drift
  screech + tier chirps, item/boost stingers, countdown/finish; adapt legacy
  `src/game/race/raceAudio.js`; mute toggle; suspend AudioContext on blur (`test:lifecycle`).
- **Phase 5 — Juice**: speed lines, camera shake, landing dust, per-character VFX
  (carrot-rocket boost for bunny, ice-shard drift for penguins), finish confetti.
- **Lap count / race length**: decide after items (laps 3→4-5 is one line in courseV2).
- **Visual process** (owner: "a process"): background/skyline density, building variety
  (owner may render), eventually the full Blender baked track shell once layout is declared
  locked. The bake + swap pipelines are ready.
- **Track 2** once this one is "super nice".
- Pending whenever the machine is idle: one clean `test:kart-3d-spike` run.

## Why this matters (owner context)

The penguin characters are **ordinals**; the owner is part of an ordinals group and intends
to share the game with the community if it gets good enough. Mizzle, the cowboy penguin
(sheet exists, GLB pending), and more penguins are coming — the roster pipeline and
per-character flavor system are how they all get seats. Quality bar = "would the group play it."

## Kickoff prompt (paste in the fresh session)

```
Read docs/ITEMS_AND_REFINEMENT_PLAN.md and the memory files gameplay-feel-roadmap,
kart-art-direction-feedback, and ordinals-community-context. We are executing the
items plan in order, starting with step 1 (reskin pass + per-character projectile
skins). After each step: run the QA gates, regenerate the camera probe, update
tmp/v2-approval-preview.html with a new top section, and stop for my feel-check.
```
