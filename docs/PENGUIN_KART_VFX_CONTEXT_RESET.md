# Penguin Kart VFX — Context Reset Summary

> Save this file before resetting context. Read it first when resuming.

## Current Branch

`codex/release-v1-comebacktracker-kart-racer`

## Phase 1 Status

| Task | Description | Status | Commit |
|---|---|---|---|
| Task 0 | Save phased gameplan | Done | `fd6bf12` |
| Task 1 | Drift spark ice-gem palette | Done | `ffa6b9e` |
| Task 2 | Lower drift spark emissive intensity | Done | `5cf25c1` |
| Task 3 | Mini-turbo cyan burst ring | Done | `eebe379` |
| Task 4 | Tier 2+ ground ice trail | Done | `e049b16` |

## Phase 2 Status

| Task | Description | Status | Commit |
|---|---|---|---|
| Task 1 | Boost flame approved palette | Done | `4f9dc02` |
| Task 2 | Ice shield bubble approved palette | Done | `9dba28e` |
| Task 3 | Snowball and ice shard projectiles | Done | `fac3c68` |
| Task 4 | Fish bone hazard icy palette | Done | `832937a` |
| Task 5 | Blizzard dome approved ice palette | Done | `d7d7370` |
| Task 6 | Aurora boost ribbons approved palette | Done | `b086b59` |
| Task 7 | Pickup item boxes approved palette | Done | `cfb3300` |

**Phase 2 complete. Do not start Phase 3 without explicit user approval.**

## Approved Visual Direction

- Toy-like 3D arcade kart racer, not strict N64
- Rounded chunky shapes, soft bevels, clean PBR/toon materials
- Cyan/ice-blue VFX accents (`#00E5FF`, `#7EC8E8`, `#F5F8FF`, `#7B61FF`)
- Warm amber (`#F5A623`) only for windows/signage
- Simple mesh-based VFX only — no particle systems, bloom, fog, point lights, post-processing

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
- `src/game/ComebackCityThreeKartRace.jsx` (pre-existing changes on top of the clean Task 4 commit)
- `src/game/race/camera/chaseCamera.js`
- `src/game/race/physics/kartPhysics.js`
- `src/game/race/racePlayerFrame.js`
- `src/game/race/raceProgress.js`
- `src/game/race/raceRivals.js`
- `src/game/race/raceState.js`
- `src/game/race/raceUpdateRuntime.js`
- `src/game/race/rivalRacers.js`
- `src/game/race/track/trackGeometry.js`
- `src/game/race/tracks/penguinVillage.js`
- `scripts/api-data-smoke-test.mjs`

Untracked files also present:

- `src/game/race/physics/surfacePhysics.js`
- `src/game/race/raceBreakables.js`
- `src/game/race/raceCrossers.js`
- `src/game/race/shortcutTriggers.js`
- Various `tmp/` screenshots and test artifacts

**Latest VFX screenshots:**

- `tmp/penguin-vfx-phase2/boost-boost.png` — boost flame warm orange/yellow
- `tmp/penguin-vfx-phase2/task2-shield.png` — ice shield bubble cyan/white
- `tmp/penguin-vfx-phase2/task3-showcase.png` — projectiles in approved palette
- `tmp/penguin-vfx-phase2/task4-fishbone-showcase.png` — fish bones icy cyan
- `tmp/penguin-vfx-phase2/task5-blizzard-reverse.png` — blizzard dome frosted ice
- `tmp/penguin-vfx-phase2/task6-aurora.png` — aurora ribbons teal/green/violet
- `tmp/penguin-vfx-phase2/task7-itembox.png` — item boxes in approved palette

## Phase 1 Implementation Summary

### Task 3 — Mini-Turbo Cyan Burst Ring

- Added `miniTurboRing` mesh in `createGroundedKartModel` (`src/game/ComebackCityThreeKartRace.jsx`)
- Low-poly cyan torus (`#00E5FF`), additive blending, hidden by default
- Scales up + fades out during `miniTurboTimer`
- Commit: `eebe379`

### Task 4 — Tier 2+ Ground Ice Trail

- Added `driftIceTrailGroup` mesh group in `createGroundedKartModel`
- 8 low-poly ice shards (`#7EC8E8`) behind the rear wheels, additive blending
- Visible when `race.drift && driftState.tier >= 2`
- Animated opacity/emissive/scale; tier 3 stronger than tier 2
- Commit: `e049b16`

## Preview / Screenshot Workflow

1. Restart dev server: `npm run dev -- --host 127.0.0.1 --port 5174`
2. Build + deploy to Cloudflare Pages preview branch:
   ```bash
   npm run build
   npx wrangler pages deploy dist --project-name=comeback-city-kart --branch=preview-penguin-vfx-phase2 --commit-dirty=true
   ```
3. Test URLs:
   - `/?playableAutoplay=1&track=penguin-village#race`
   - `/?itemShowcase=1&track=penguin-village#race`
   - `/?playableAutoplay=1&track=penguin-village&giveItem=<key>#race` (cocoa, iceshield, snowball, sardine, fishbone, blizzard, aurora)
4. Screenshot helpers:
   - `tmp/penguin-vfx-screenshot.mjs` (Phase 1 drift captures)
   - `tmp/penguin-vfx-phase2-screenshot.mjs` (Phase 2 task captures)

## Critical Discipline Reminders

- **One meaningful task per commit.** Do not batch visual changes.
- **Fresh screenshot after every task.** Do not advance if the screenshot looks wrong.
- **Commit before moving to the next task.**
- **Do not use `git reset --hard` unless explicitly told to.** It already lost working-tree changes once; they were recovered from dangling objects, but that is not guaranteed.
- **Do not stage/commit pre-existing user changes as part of VFX commits.** Keep them uncommitted unless the user explicitly asks to commit them.
- **Do not create a VFX module during Phase 1.** Keep changes inside `src/game/ComebackCityThreeKartRace.jsx` and `src/game/race/driftFeel.js`.
- **Audio is deferred** until original audio assets are ready.
