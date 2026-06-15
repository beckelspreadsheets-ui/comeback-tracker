# Game Agent Guide — work on the kart racer, skip the fitness app

> Onboarding for an agent whose job is the **Three.js kart-racing game** only. This repo is a fitness/recovery PWA that *contains* the game; for now you can ignore almost all of the fitness side. Start from tag **`kart-v0.9.0`** (the known-good checkpoint) or the latest `codex/release-v1-comebacktracker-kart-racer` branch.

## Read these first
1. [docs/CODEBASE_MAP.md](CODEBASE_MAP.md) — full architecture (sections **2–6** are the game).
2. [docs/ARCH_REVIEW.md](ARCH_REVIEW.md) — current bugs/perf/backlog (the game-relevant ones are called out below).
3. This file — what to touch and what to ignore.

## Where the game lives — TOUCH THIS

```
src/game/
  ComebackCityThreeKartRace.jsx   PRIMARY race runtime (the live game). Big god-file (~3,617 lines).
  RaceScreen.jsx                  Track → Racer → Kart cup-select; mounts the race. Launch point.
  WorldScene.jsx                  Explorable Three.js hub (god-file ~4,455 lines).
  WorldMode.jsx / HudOverlay.jsx  Hub orchestration + hub HUD.
  comebackCityVisuals.{jsx,css}   Shared palette/camera presets + reference components.
  city3dAssets.js                 Procedural Three.js model factories (karts, districts).
  courseV2.js / worldConfig.js    Comeback City track data + hub layout.
  race/                           THE MODULAR RACE ENGINE — do most gameplay work here:
    tracks/        Track DATA (TrackDefinition). Add new tracks here. Three.js-free on purpose.
    physics/       kartPhysics.js + kartTuning.js (drift/boost/speed feel).
    heldItems.js   Live 3D item set (10 items, deterministic, position-tiered).
    rivalRacers.js Rival AI (3 personalities, rubber-band, ultimates).
    driftFeel.js / airTricks.js   Drift mini-turbo + ramp/trick/shortcut arcs.
    render/        Scene/track/scenery/vehicle/pickup mesh builders + per-frame sync + VFX.
    *Runtime.js    Per-frame tick modules (used fully by ArcadeRace3D, partly by the god-file).
    playtest/      Autoplay/QA harness (drives headless races for the test scripts).
```

Game economy bridge (pure data, **read-only from a game POV** — don't rebuild the fitness UI):
- `src/game/gameProfile.js` — `deriveGameProfile(state)` → XP/level/avatar drive-stats.
- `src/game/raceProgression.js` — `deriveRaceGarage` → credits + kart mechanics.

These two derive game numbers from the user's fitness state. For gameplay work, treat them as **the data source for XP/credits/stats** — you generally don't need to modify them, and you never need to touch how the fitness data is entered.

## What to IGNORE for now (the fitness/recovery app)

You can safely skip all of this unless explicitly asked:

```
src/screens/   HomeScreen, DayScreen, FoodScreen, MetricsScreen,
               CalibrationScreen, SettingsScreen, JointScreen   ← workout/food/metrics UI
src/components/ FoodEntrySheet, BarcodeScanner, RestTimer, TemplateSaveModal
src/lib/        program.js, nutrition.js, foodHelpers.js, foodApi.js,
               restaurantApi.js, foodParse.js, portionChips.js   ← nutrition/program math
src/hooks/usePersistedState.js   ← state atom + cloud sync (only relevant if you change save data)
functions/api/  sync/* and fatsecret/*   ← backend; not needed for gameplay
migrations/     D1 schema                ← not needed for gameplay
```

Note: `RaceScreen` and `SettingsScreen` both render a "garage/upgrade" UI driven by `raceProgression.js`. The **garage shop lives in Settings**; the race cup-select lives in `RaceScreen`. If you only do gameplay, you can ignore the Settings garage.

## How to run / see the game

- `npm run dev` → open the app, enter the City hub, drive into the **Raceway** portal (or use the `#race` hash).
- **Debug URL params** (on the race) — invaluable for QA/captures:
  `?track=` `?character=` `?kart=` `?giveItem=<key>` `?itemShowcase=1` `?playableAutoplay=1`
- Tests (Node + Playwright): `npm run test:kart-proof` (fast static guard), `npm run test:kart-playable`, `npm run test:race` (content playtest). These read `window.__racePlaytestResult` / telemetry globals.
- Build gate: `npm run build` must stay green.

## Hard rules / gotchas (from project history — don't relearn these)
- **Never `gltf-transform optimize`** the avatar GLBs — it corrupts them.
- **Neon-dusk look is locked** — match the existing palette; don't guess model facing (there's an orientation-lab workflow; never eyeball it).
- **Tracks/items are DATA** (`race/tracks/`, `heldItems.js`) kept Three.js-free so Node QA scripts can import them. Keep content out of render code.
- **`runId` prop** restarts a race (React key bump) — don't unmount.
- Deterministic gameplay: `heldItems.js`/`rivalRacers.js` use **no `Math.random`** (reproducible for tests). Keep it that way.
- CSP forbids `unsafe-eval` and needs `blob:` in `connect-src` (textures wash out otherwise).
- Two coexisting systems to not confuse: track registries `KART_TRACKS` (new, live 3D) vs `RACE_TRACKS` (legacy 2D); item systems `heldItems.js` (live) vs `raceItems.js` (legacy). **The live 3D game uses `KART_TRACKS` + `heldItems.js`.**

## Game-relevant backlog (from ARCH_REVIEW.md — game items only)
- **B1 (fixed in this branch):** race now reports the correct `trackKey` — Penguin Village results track properly.
- **B2:** add a backward-crossing guard to the Three.js lap counter (spin through finish = free lap).
- **B3:** `restartRace()` should pass `trackDef` (wrong laps/start on Penguin Village restart).
- **B5:** ref-wrap `onFinish`/`onRestart` so unstable callbacks don't rebuild the scene.
- **B7:** cap rival `lap` so homing sardine doesn't stick on lapped rivals.
- **P2/P3:** pre-allocate per-frame `Vector3` scratch in `chaseCamera.js` and `trackGeometry.js` (GC pauses).
- **M4/M5:** decompose the two god-files toward the modular `race/` shape (`ArcadeRace3D` shows the target).

## Owner's gameplay direction (ask before big content adds)
- Owner has a **list of more penguin/iceberg items** for Penguin Village — ask for it before adding dressing.
- Wanted next: Village hazards (fish-cart crossers, breakable snowmen, frozen-pond slip-zone — the Penguin March is the crosser template), **audio** (biggest remaining feel multiplier; adapt legacy `race/raceAudio.js`), and more tracks per `docs/MULTITRACK_EXECUTION_PLAN.md`.
- Quality bar: "would the (ordinal penguin) community actually play it." The penguin characters are NFT ordinals — they're the audience.
