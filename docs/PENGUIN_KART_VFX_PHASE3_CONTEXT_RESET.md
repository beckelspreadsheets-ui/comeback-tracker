# Penguin Kart VFX — Phase 3 Context Reset

> Save this file before resetting context. Read it first when resuming Phase 4 or later.

## Current Branch

`codex/release-v1-comebacktracker-kart-racer`

## Phase 3 Status

| Task | Description | Status | Commit |
|---|---|---|---|
| Task 1 | Tune Penguin Village materials to winter concept | Done | `0694621` |
| Task 2 | Dress fish-market straight | Done | `1a797f0` |
| Task 3 | Dress main street start | Done | `81b798f` |
| Task 4 | Dress pond sweep | Done | `bf45713` |
| Task 5 | Dress return bends | Done | `48853b4` |
| Task 6 | Theme item box as winter crate | Done | `fc6bbeb` |

**Phase 3 complete.** User has approved moving toward Phase 4.

## Files Modified in Phase 3

- `src/game/race/tracks/penguinVillage.js` — winter palette, sky, ground, curb, rail, wall, bridge materials.
- `src/game/ComebackCityThreeKartRace.jsx` — prop factory functions, zone dressing, item-box winter crate.
- `tmp/penguin-vfx-phase3-screenshot.mjs` — reusable screenshot helper for Phase 3.

## Approved Visual Direction (Still in Force)

- Toy-like 3D arcade kart racer, not strict N64.
- Rounded chunky shapes, soft bevels, clean PBR/toon materials.
- Cyan/ice-blue VFX accents (`#00E5FF`, `#7EC8E8`, `#F5F8FF`, `#7B61FF`).
- Warm amber (`#F5A623`) only for windows/signage.
- Simple mesh-based VFX only — no particle systems, bloom, fog, point lights, post-processing.

## Hard No-Touch Files

- `src/game/race/physics/kartTuning.js`
- `src/game/race/physics/kartPhysics.js`
- `src/game/race/physics/surfacePhysics.js`
- `src/game/race/airTricks.js`
- `src/game/race/heldItems.js`
- `src/game/race/rivalRacers.js`
- `src/game/race/raceBreakables.js`
- `src/game/race/raceCrossers.js`

Do not modify gameplay, physics, item behavior, rival behavior, audio, track collision, or balance.

## Working Tree State (Uncommitted)

Pre-existing user changes are still in the working tree, uncommitted:

- `src/game/ArcadeRace3D.jsx`
- `src/game/race/camera/chaseCamera.js`
- `src/game/race/physics/kartPhysics.js`
- `src/game/race/racePlayerFrame.js`
- `src/game/race/raceProgress.js`
- `src/game/race/raceRivals.js`
- `src/game/race/raceState.js`
- `src/game/race/raceUpdateRuntime.js`
- `src/game/race/rivalRacers.js`
- `src/game/race/track/trackGeometry.js`
- `scripts/api-data-smoke-test.mjs`

Untracked files also present:

- `src/game/race/physics/surfacePhysics.js`
- `src/game/race/raceBreakables.js`
- `src/game/race/raceCrossers.js`
- `src/game/race/shortcutTriggers.js`
- `3d generations:character sheets/`
- `docs/CODEX_PENGUIN_KART_VFX_RESEARCH_PROMPT.md`
- `docs/TRACK_INTERACTIVE_SYSTEMS.md`
- Various `tmp/` screenshots and test artifacts (including `tmp/penguin-vfx-phase3/`)

**Phase 3 VFX screenshots:**

- `tmp/penguin-vfx-phase3/task1-race.png` — winter road/curb palette
- `tmp/penguin-vfx-phase3/task2-race.png` — fish-market straight
- `tmp/penguin-vfx-phase3/task3-race.png` — main-street start
- `tmp/penguin-vfx-phase3/task4-race.png` — pond sweep
- `tmp/penguin-vfx-phase3/task5-race.png` — return bends
- `tmp/penguin-vfx-phase3/task6-race.png` — winter item crate

## Phase 3 Implementation Summary

### Task 1 — Winter Materials

- Updated `PENGUIN_VILLAGE_TRACK.palette` to icy dusk tones.
- `curb.a/b` set to `#F5F8FF` / `#00E5FF`.
- `rail` set to `#00E5FF`.
- `wall.a/b` set to `#7EC8E8` / `#F5F8FF`.
- `bridge` skirt/glow/pillar tuned to ice-bridge concept.

### Tasks 2–5 — Zone Prop Dressing

Added factory functions in `src/game/ComebackCityThreeKartRace.jsx` and placed them by zone using `sampler.pointAt`, `minCenterlineDistance`, and `roadWidth` clearance:

- `makeFishCrate`, `makeMarketStall`, `makeFishBarrel`, `makeCannerySign` — market-row (0.42–0.72).
- `makeSnowyLampPost`, `makePennantFlags`, `makePenguinCrossingSign` — main-street (0.0–0.24).
- `makeChunkyIceCrystal`, `makeSnowMound`, `makeFrozenTireBumper` — pond-sweep (0.24–0.42).
- `makeVillageBench`, `makeIglooMailbox`, `makeSledCart`, `makeIceBlockBarrier` — return-bend (0.72–1.0).

Existing snow-mound/ice-shard filler colors were also tuned to the concept palette.

### Task 6 — Winter Item Crate

- Replaced generic colored cube in `addItemBox` with `makeWinterItemCrate`.
- Crate body uses `#7EC8E8`, metal brackets use `#F5F8FF`, edge glow uses the item-box accent color.
- Question-mark billboard behavior preserved.

## Preview / Screenshot Workflow

1. Restart dev server: `npm run dev -- --host 127.0.0.1 --port 5174`
2. Run screenshot helper: `PENGUIN_VFX_TASK=<name> [PENGUIN_VFX_WAIT=<ms>] node tmp/penguin-vfx-phase3-screenshot.mjs`
3. Test URLs:
   - `/?playableAutoplay=1&track=penguin-village#race`
   - `/?itemShowcase=1&track=penguin-village#race`

## Critical Discipline Reminders

- **One meaningful task per commit.** Do not batch visual changes.
- **Fresh screenshot after every task.** Do not advance if the screenshot looks wrong.
- **Commit before moving to the next task.**
- **Do not stage/commit pre-existing user changes as part of VFX commits.** Keep them uncommitted unless the user explicitly asks to commit them.
- **Do not modify gameplay/physics code.** Escalate if a change requires touching no-touch files.

## Next Phase

Phase 4 is scoped as **audio plan and wiring** per `docs/PENGUIN_KART_VFX_PHASED_GAMEPLAN.md`. **Original audio assets are required before Phase 4 execution can begin.** Confirm asset availability and user-approved scope before starting.
