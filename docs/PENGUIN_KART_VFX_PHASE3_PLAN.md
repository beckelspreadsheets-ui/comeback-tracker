# Penguin Kart VFX — Phase 3 Plan

> Focused Phase 3 plan: Penguin Village track dressing. Read this file first after context reset.

## Phase 3 Scope

Penguin Village track dressing: arch, statues, igloos, crystals, stalls, and zone-specific props.

Source references in `3d generations:character sheets/`:
- `winter asset material concept.png`
- `winter themed game props.png`
- `winter themed items icons grid.png`
- `stylized 3d game crates.png`

## Constraints

- Branch: `codex/release-v1-comebacktracker-kart-racer`
- Hard no-touch files from Phase 1/2 still apply: `kartTuning.js`, `kartPhysics.js`, `surfacePhysics.js`, `airTricks.js`, `heldItems.js`, `rivalRacers.js`, `raceBreakables.js`, `raceCrossers.js`
- Visuals only. Do not change gameplay, physics, item behavior, rival behavior, audio, track collision, or balance.
- Approved visual style: toy-like 3D arcade kart, rounded chunky shapes, clean PBR/toon materials, simple mesh-based VFX only.
- Approved palette (same as Phase 2):
  - `#F5F8FF` Ice White
  - `#00E5FF` Bright Cyan
  - `#7EC8E8` Ice Blue
  - `#FF8C00` Flame Orange
  - `#FFD34F` Flame Yellow
  - `#00E5C9` Aurora Teal
  - `#39FF8C` Aurora Green
  - `#7B61FF` Aurora Violet
  - `#F5A623` Warm Amber (windows/signage only)
- One meaningful task per commit. Fresh screenshot after every task.
- Keep changes inside `src/game/ComebackCityThreeKartRace.jsx` and `src/game/race/tracks/penguinVillage.js` unless a helper is unavoidable.
- Do not create a new VFX module. Reuse existing helpers (`makeIgloo`, `makeIceStatue`, etc.) or add small factory functions in `ComebackCityThreeKartRace.jsx`.
- Pre-existing user changes remain uncommitted. Phase 3 commits will only contain the dressing/material changes.

## Approach

Phase 3 turns the grey-box Penguin Village track into a themed winter/fish-market village using the four new reference sheets. Work is organized by track zone so each commit has a clear visual target:

1. `market-row` — fish crates, market stalls, cannery sign, fish barrels.
2. `main-street` — snowy lamp posts, pennant flags, penguin crossing signs.
3. `pond-sweep` — chunky ice crystals, snow mounds, frozen tire bumpers, cyan curb markers.
4. `return-bend` — cozy bench, igloo mailbox, sled cart, ice-block barriers.
5. Materials — tune road, shoulder, curb, rail, wall, bridge to the concept sheet.
6. Item box — replace the generic colored cube with a winter-themed crate/box variant.

All new props are simple mesh groups (boxes, cylinders, cones, spheres) with `createBasicMaterial` / `createToonMaterial`. No new GLB imports, particle systems, point lights, fog, or audio.

Test URLs:
- `/?playableAutoplay=1&track=penguin-village#race`
- `/?itemShowcase=1&track=penguin-village#race`

Screenshot helper:
- `tmp/penguin-vfx-phase2-screenshot.mjs` (reuse, or create `tmp/penguin-vfx-phase3-screenshot.mjs`)

## Phase 3 Task Cards

### Task 1 — Tune track materials to winter concept

- **Files:** `src/game/race/tracks/penguinVillage.js`
- **Search for:** `palette` block inside `PENGUIN_VILLAGE_TRACK`
- **Change:**
  - `clearColor`, `sky`, `ground` to the dusk/ice tones from `winter asset material concept.png`.
  - `curb.a` / `curb.b` to `#F5F8FF` / `#00E5FF` (frosted ice curb).
  - `rail` to `#00E5FF` (cyan rail light).
  - `wall` to `#7EC8E8` / `#F5F8FF`.
  - `bridge` skirt/glow/pillar to the ice-bridge concept.
  - `asphalt` stays dark for readability; adjust only if the reference demands it.
- **Acceptance:** the road surface, curbs, rails, and bridge read as a single icy winter palette.
- **Screenshot:** chase-cam straight on penguin-village showing road and curbs.
- **Commit:** `Tune Penguin Village materials to winter concept`

### Task 2 — Dress the fish-market straight

- **File:** `src/game/ComebackCityThreeKartRace.jsx`
- **Search for:** `addPenguinVillageDressing` and the `market-row` zone placement pattern.
- **Change:**
  - Add `makeFishCrate`, `makeMarketStall`, `makeFishBarrel`, and `makeCannerySign` factory functions.
  - Place clusters of fish crates, market stalls, barrels, and a cannery sign alongside `market-row` progress (roughly 0.42–0.72).
  - Keep props outside the racing line (use `minCenterlineDistance` checks like existing dressing).
- **Reference:** `winter themed game props.png` items 1, 2, 11, 15.
- **Acceptance:** the market straight reads as a busy fish market without blocking the road.
- **Screenshot:** chase-cam through the market straight.
- **Commit:** `Add fish-market prop dressing to Penguin Village`

### Task 3 — Dress the main street start

- **File:** `src/game/ComebackCityThreeKartRace.jsx`
- **Change:**
  - Add `makeSnowyLampPost`, `makePennantFlags`, and `makePenguinCrossingSign` factory functions.
  - Place lamp posts and pennant flag poles along `main-street` progress (roughly 0.0–0.24).
  - Place one penguin crossing sign near the start of the straight.
- **Reference:** `winter themed game props.png` items 3, 4, 13.
- **Acceptance:** the main street feels like a cozy village entrance.
- **Screenshot:** chase-cam down the start straight.
- **Commit:** `Add main-street prop dressing to Penguin Village`

### Task 4 — Dress the pond sweep

- **File:** `src/game/ComebackCityThreeKartRace.jsx`
- **Change:**
  - Add `makeChunkyIceCrystal`, `makeSnowMound`, and `makeFrozenTireBumper` factory functions.
  - Place crystals, snow mounds, and a few tire bumpers around `pond-sweep` progress (roughly 0.24–0.42).
  - Reuse/adjust the existing snow-mound/ice-shard filler in `addPenguinVillageDressing` to match the concept colors.
- **Reference:** `winter themed game props.png` items 5, 6, 7.
- **Acceptance:** the pond sweep reads as a frozen lake edge with ice chunks and snow piles.
- **Screenshot:** chase-cam through the pond sweep.
- **Commit:** `Add pond-sweep prop dressing to Penguin Village`

### Task 5 — Dress the return bends

- **File:** `src/game/ComebackCityThreeKartRace.jsx`
- **Change:**
  - Add `makeVillageBench`, `makeIglooMailbox`, `makeSledCart`, and `makeIceBlockBarrier` factory functions.
  - Place these props along `return-bend` progress (roughly 0.72–1.0).
- **Reference:** `winter themed game props.png` items 9, 10, 12, 14.
- **Acceptance:** the return bends feel like a small snowy village.
- **Screenshot:** chase-cam through the return bends.
- **Commit:** `Add return-bend village prop dressing to Penguin Village`

### Task 6 — Theme the item box as a winter crate

- **File:** `src/game/ComebackCityThreeKartRace.jsx`
- **Search for:** `addItemBox` and `ITEM_BOX_COLORS`
- **Change:**
  - Replace the generic colored cube with a winter-themed crate mesh (e.g., fish-crate style from `stylized 3d game crates.png` or a frosted ice mystery cube).
  - Keep the question-mark billboard behavior; only change the cube geometry/material.
  - Use `#F5F8FF` / `#00E5FF` / `#7EC8E8` materials with metal corner brackets.
- **Acceptance:** floating item boxes read as winter-themed mystery crates.
- **Screenshot:** item box on track, chase cam or item showcase.
- **Commit:** `Theme item box as winter crate`

## Stop Criteria

- Stop if a screenshot looks wrong; fix that task before moving on.
- Stop if any change requires touching gameplay/physics code; escalate instead.
- Do not proceed to Phase 4 without explicit user approval.

## Out of Scope for Phase 3

- Removing the bloom composer or `addGlowSprite` glow sprites (pre-existing user code).
- Adding new geometries, particle systems, point lights, fog, or audio.
- Changing rival/player model geometry beyond materials.
- Adding new GLB model imports.
- Modifying HUD item labels or `raceItems.js` definitions.

## Current State (Before Phase 3)

- Phase 1 complete (commits `ffa6b9e`–`e049b16`).
- Phase 2 complete (commits `4f9dc02`–`cfb3300`, wrap-up `9310e34`).
- `src/game/race/tracks/penguinVillage.js` has track data, surface bands, breakables, crossers, and a basic palette, but `districtAnchors` and `sceneryAnchors` are empty.
- `addPenguinVillageDressing` in `src/game/ComebackCityThreeKartRace.jsx` already places ice statues, igloos, snow mounds, ice shards, frozen river, icebergs, spectators, and the start/finish arch.
