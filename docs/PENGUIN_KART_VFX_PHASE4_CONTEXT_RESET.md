# Penguin Kart VFX — Phase 4 Context Reset

> Save this file before resetting context. Read it first when resuming Phase 5 or later.

## Current Branch

`codex/release-v1-comebacktracker-kart-racer`

## Phase 4 Status

| Task | Description | Status |
|---|---|---|
| Task 1 | Document audio deferral decision | Done |
| Task 2 | Add silent/placeholder-ready `AudioManager` | Done |
| Task 3 | Wire `AudioManager` into `ArcadeRace3D.jsx` | Done |
| Task 4 | Update lifecycle audio smoke test for silent manager | Done |
| Task 5 | Update `CODEBASE_MAP.md` audio references | Done |

**Phase 4 complete.** Audio is deferred to the end of the project. No final sound design or assets were added.

## Latest Commit

`fc6bbeb2 Theme item box as winter crate` — latest Phase 3 commit.

Phase 4 changes are **uncommitted** in the working tree (see below).

## Files Modified in Phase 4

- `src/game/audio/AudioManager.js` — new silent manager with runtime audio API (`playCue`, `startLoop`, `stopLoop`, `setMuted`, `resume`, `suspend`, `dispose`).
- `src/game/ArcadeRace3D.jsx` — now imports `createAudioManager` from `src/game/audio/AudioManager.js` instead of `createRaceAudioController` from `src/game/race/raceAudio.js`.
- `scripts/page-lifecycle-audio-smoke-test.mjs` — updated to assert the silent state (no `AudioContext`/oscillator creation) while still verifying mute toggle and page lifecycle handling.
- `docs/CODEBASE_MAP.md` — updated runtime and caveat lines to point at `audio/AudioManager`.
- `docs/PENGUIN_KART_VFX_PHASED_GAMEPLAN.md` — Phase 4 marked deferred; Phase 5 added.
- `docs/PENGUIN_KART_VFX_PHASE4_HANDOFF.md` — marked as archived/deferred.
- `docs/PENGUIN_KART_AUDIO_DEFERRED.md` — new file preserving the audio build prompt and deferral note.

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

Do not modify gameplay, physics, item behavior, rival behavior, audio wiring (unless explicitly in scope), track collision, or balance.

## Working Tree State (Uncommitted)

### Phase 4 changes (by agent)

- `docs/CODEBASE_MAP.md`
- `docs/PENGUIN_KART_VFX_PHASE4_HANDOFF.md`
- `docs/PENGUIN_KART_VFX_PHASED_GAMEPLAN.md`
- `docs/PENGUIN_KART_AUDIO_DEFERRED.md` (untracked)
- `scripts/page-lifecycle-audio-smoke-test.mjs`
- `src/game/ArcadeRace3D.jsx`
- `src/game/audio/AudioManager.js` (untracked)

### Pre-existing user changes (still uncommitted)

- `scripts/api-data-smoke-test.mjs`
- `src/game/race/camera/chaseCamera.js`
- `src/game/race/physics/kartPhysics.js`
- `src/game/race/racePlayerFrame.js`
- `src/game/race/raceProgress.js`
- `src/game/race/raceRivals.js`
- `src/game/race/raceState.js`
- `src/game/race/raceUpdateRuntime.js`
- `src/game/race/rivalRacers.js`
- `src/game/race/track/trackGeometry.js`

### Untracked files also present

- `src/game/race/physics/surfacePhysics.js`
- `src/game/race/raceBreakables.js`
- `src/game/race/raceCrossers.js`
- `src/game/race/shortcutTriggers.js`
- `3d generations:character sheets/`
- `docs/CODEX_PENGUIN_KART_VFX_RESEARCH_PROMPT.md`
- `docs/TRACK_INTERACTIVE_SYSTEMS.md`
- Various `tmp/` screenshots and test artifacts (including `tmp/penguin-vfx-phase3/`)

## Phase 4 Implementation Summary

### Audio Deferral

- User decided audio would take several days and should be tackled at the very end of the project.
- `docs/PENGUIN_KART_VFX_PHASED_GAMEPLAN.md` updated to mark Phase 4 deferred.
- Full asset/wiring build prompt preserved in `docs/PENGUIN_KART_AUDIO_DEFERRED.md`.

### Silent AudioManager

- New `src/game/audio/AudioManager.js` mirrors the runtime's expected audio API.
- Default state: `enabled = false`, `muted = true`, no `AudioContext` created, no sounds played.
- `playCue()` is a silent no-op with a dev-only debug log.
- Future audio assets can be registered and played without changing gameplay code.

### ArcadeRace3D Wiring

- `createRaceAudioController()` import replaced with `createAudioManager()`.
- Same method names mean `raceVehicleRuntime`, `raceHitRuntime`, and `raceRuntimeActions` require no changes.

### Smoke Test Update

- Removed the `KeyQ` trigger and oscillator-start assertions.
- Added assertions that `AudioContext` and oscillator creation counts remain `0`.
- Kept lifecycle round-trip and mute-toggle checks.

## Build / Test Status at Handoff

- `npm run build` passes.
- `npm run test:lifecycle` should be re-run after context reset to confirm the updated smoke test.
- `npm run test:race`, `npm run test:race:browser`, `npm run test:visual` expected to pass (no gameplay/physics changes).

## Critical Discipline Reminders

1. **Do not commit pre-existing user changes** listed above unless the user explicitly approves.
2. **Phase 5 requires explicit user approval** before starting.
3. **No-touch files remain no-touch** in Phase 5 unless scope explicitly changes.
4. **One meaningful task per commit.** Do not batch unrelated changes.
5. **Verify with tests/screenshots after every change.**
6. **Stop if a change requires touching gameplay/physics/item/rival code.**
