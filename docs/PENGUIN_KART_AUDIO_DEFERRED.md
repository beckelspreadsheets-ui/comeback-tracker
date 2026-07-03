# Penguin Kart — Audio Deferred Note

> Decision date: 2026-06-16  
> Status: **Deferred to end of project**  
> Reason: User estimates audio will be several days of work and wants to tackle it last.

Phase 4 (audio plan and wiring) from `docs/PENGUIN_KART_VFX_PHASED_GAMEPLAN.md` is postponed. A silent, placeholder-ready `AudioManager` has already been wired into `ArcadeRace3D.jsx` so the race runtime keeps its audio event hooks without producing any sound.

## Already in place

- `src/game/audio/AudioManager.js` — silent manager that mirrors the runtime’s expected audio API (`playCue`, `startLoop`, `stopLoop`, `setMuted`, `resume`, `suspend`, `dispose`).
- `src/game/ArcadeRace3D.jsx` — uses `createAudioManager()` instead of the old synthesized `createRaceAudioController()`.
- `scripts/page-lifecycle-audio-smoke-test.mjs` — updated to assert the silent state (no `AudioContext`/oscillators created) while still verifying the mute toggle and page lifecycle handling.

## When audio work resumes

1. Drop final assets into `public/audio/` (`.ogg` + `.mp3` fallback).
2. Inside `AudioManager.js`, load buffers and implement `playCue()` / loop playback.
3. Keep lifecycle handling autoplay-safe.
4. Re-enable the smoke-test Web Audio assertions if desired.

The full build prompt below is preserved so work can resume without losing context.

---

# Penguin Kart — Phase 4 Audio Build Prompt

## Project context
- Browser-based arcade kart racer, Three.js + React.
- Current visual theme: toy-like penguin winter village, chunky shapes, ice/cyan VFX accents.
- Phase 4 is **audio plan and wiring only**; do not change gameplay, physics, item behavior, rival behavior, or balance.
- No-touch code files still apply: `kartTuning.js`, `kartPhysics.js`, `surfacePhysics.js`, `airTricks.js`, `heldItems.js`, `rivalRacers.js`, `raceBreakables.js`, `raceCrossers.js`.

## Creative direction
- **Style:** arcade, bouncy, toy-like — *not* realistic racing sim.
- **Palette fit:** crisp ice/snow accents, bright cyan energy, warm amber only for cozy UI touches.
- **Readability:** every sound must be instantly identifiable (boost vs drift vs item vs UI).
- **Mix:** player kart louder/clearer than rivals; ambient present but not washing out action.
- **Looping elements must be seamless** (engine, drift, boost, ambient).

## Audio asset inventory

| ID | File name | Type | Use / trigger | Loop? | Notes |
|---|---|---|---|---|---|
| `engine_loop` | `audio/engine-loop.ogg` | SFX | Player kart engine, pitch by speed | Yes | Layered so it can pitch 0.6x–1.8x without getting chipmunky. Mono or narrow stereo. |
| `engine_idle` | `audio/engine-idle.ogg` | SFX | Low-speed / stopped engine | Yes | Blend into `engine_loop` at low speed. |
| `drift_start` | `audio/drift-start.ogg` | SFX | Drift input registered | No | Short ice/skid chirp. |
| `drift_loop` | `audio/drift-loop.ogg` | SFX | Held drift | Yes | Icy scrape, lower volume, duck under boost. |
| `drift_release` | `audio/drift-release.ogg` | SFX | Drift released (any tier) | No | Short settle/skid tail. |
| `mini_turbo` | `audio/mini-turbo.ogg` | SFX | Mini-turbo burst fired | No | Quick cyan “pop” + zip, matches VFX ring. |
| `boost_start` | `audio/boost-start.ogg` | SFX | Boost activated | No | Flame whoosh, playful. |
| `boost_loop` | `audio/boost-loop.ogg` | SFX | Boost active | Yes | Layer under engine, duck engine slightly. |
| `item_box_break` | `audio/item-box-break.ogg` | SFX | Item crate broken | No | Wood/crystal crack + sparkle. |
| `item_pickup` | `audio/item-pickup.ogg` | SFX | Item received | No | Bright chime, distinct per rarity if possible. |
| `item_use` | `audio/item-use.ogg` | SFX | Item activated | No | Whoosh or deploy sound. |
| `snowball_throw` | `audio/snowball-throw.ogg` | SFX | Snowball item used | No | Airy launch + ice crackle. |
| `fish_bone_deploy` | `audio/fish-bone-deploy.ogg` | SFX | Fish bone hazard placed | No | Clunky bone rattle + splash. |
| `shield_pop` | `audio/shield-pop.ogg` | SFX | Shield hit/broken | No | Glassy shatter. |
| `blizzard_cast` | `audio/blizzard-cast.ogg` | SFX | Blizzard item used | No | Icy wind swell. |
| `collision_soft` | `audio/collision-soft.ogg` | SFX | Bump wall/kart at low speed | No | Dull plastic thud. |
| `collision_hard` | `audio/collision-hard.ogg` | SFX | Hard impact | No | Bigger crunch, lower pitch. |
| `offroad_loop` | `audio/offroad-loop.ogg` | SFX | Driving on snow/offroad | Yes | Muffled crunch, layered with engine. |
| `ui_hover` | `audio/ui-hover.ogg` | UI | Menu cursor move | No | Tiny icy tick. |
| `ui_select` | `audio/ui-select.ogg` | UI | Menu confirm | No | Bright confirm blip. |
| `ui_back` | `audio/ui-back.ogg` | UI | Menu cancel/back | No | Lower subtle blip. |
| `countdown_3` | `audio/countdown-3.ogg` | UI | Race countdown “3” | No | Low tom/boop. |
| `countdown_2` | `audio/countdown-2.ogg` | UI | Race countdown “2” | No | Mid tom/boop. |
| `countdown_1` | `audio/countdown-1.ogg` | UI | Race countdown “1” | No | Higher tom/boop. |
| `countdown_go` | `audio/countdown-go.ogg` | UI | Race start “GO!” | No | Big cheerful launch cue. |
| `lap_complete` | `audio/lap-complete.ogg` | UI | Cross finish line mid-race | No | Short fanfare + sparkle. |
| `race_finish` | `audio/race-finish.ogg` | UI | Final lap finish | No | Longer victory fanfare. |
| `ambient_penguin_village` | `audio/ambient-penguin-village.ogg` | Ambience | Penguin Village track | Yes | Soft winter wind, distant village chatter, very low. |

## Technical spec
- **Format:** `.ogg` primary, `.mp3` fallback for each asset.
- **Sample rate:** 44.1 kHz.
- **Bit depth:** 16-bit export.
- **Channels:** SFX mono where possible (smaller, spatial-friendly); ambience/loops stereo.
- **Looping:** Loop points must be sample-accurate and verified in-engine; no clicks/pops.
- **Loudness target:** SFX peaks around -6 dBFS, ambience around -18 dBFS.
- **Max duration:** UI cues < 0.5s; one-shots < 2s; loops < 8s unless ambient.
- **Naming:** kebab-case, all lowercase, no spaces.

## Wiring / code expectations
- Add a lightweight `AudioManager` or integrate Web Audio API / Howler / Three.js Audio.
- Hook into existing per-frame update in `ComebackCityThreeKartRace.jsx` for engine pitch, drift loops, boost loops.
- Trigger one-shots at existing event sites (item use, collisions, lap finish, etc.) without modifying no-touch files.
- Support master, SFX, music/ambience, and UI volume groups.
- Respect browser autoplay policy: audio starts only after first user interaction / race start.

## Acceptance checklist
- [ ] All assets present in `public/audio/` (or `src/assets/audio/`) with `.ogg` and `.mp3`.
- [ ] Engine pitch responds smoothly to kart speed.
- [ ] Drift start/loop/release chain sounds continuous and natural.
- [ ] Boost loop layers cleanly and ducks engine briefly.
- [ ] Each item sound is distinct and readable.
- [ ] UI sounds are short and non-annoying.
- [ ] No audible pops, clicks, or gaping loops.
- [ ] No modifications to no-touch gameplay/physics files.
- [ ] Audio initializes only after user interaction.
- [ ] Bundle size impact is measured and acceptable.

## Deliverable
A single folder of assets plus a short implementation plan (`docs/PENGUIN_KART_AUDIO_PLAN.md`) listing which files map to which in-game events.
