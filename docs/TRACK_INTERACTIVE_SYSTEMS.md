# Track Interactive Systems — Data Schema & Modules

This doc describes the opt-in interactive systems added to the track data model and the pure-JS modules that power them. Existing tracks without these arrays behave identically.

## Surface physics

Module: `src/game/race/physics/surfacePhysics.js`

Track data: `surfaceBands: [{ progressStart, progressEnd, laneStart, laneEnd, type }]`

Types: `asphalt`, `ice`, `snow`, `boost`, `slipZone`.

Each type defines multipliers for grip, drift grip, drift charge rate, acceleration, and steering. The runtime calls `surfaceTypeAt({ progress, lane }, surfaceBands)` each frame and applies the matching multipliers to the kart state via `applySurfaceToPhysics(kartState, surfaceType, dt)`.

Wired into:
- V2: `ComebackCityThreeKartRace.jsx` (player) and `rivalRacers.js` (rivals via shared breakables/crossers hooks).
- V1: `racePlayerFrame.js` and `kartPhysics.js` (`applyLateralGripForFrame` reads surface grip multipliers).

## Breakable objects

Module: `src/game/race/raceBreakables.js`

Track data: `breakableObjects: [{ key, type, progress, lane|side, radius?, respawn? }]`

Types: `snowman` (1 hit → item box), `icePillar` (2 hits → ice shards hazard), `barrel` (1 hit → slides/spins hazard).

Runtime state is built by `createBreakables(track)`. Each frame `updateBreakablesForFrame({ breakables, dt })` advances timers, and `breakableHitFor({ breakables, progress, lane, trackLength })` checks for contacts. On final break, a spawn request `{ type, progress, lane, hazardType? }` is emitted.

Deterministic IDs come from the track `key`; no `Math.random`.

Wired into V2 (`ComebackCityThreeKartRace.jsx`) and V1 (`raceUpdateRuntime.js` / `ArcadeRace3D.jsx`). Rivals trigger breakables in `rivalRacers.js`.

## Fish-cart crosser hazards

Module: `src/game/race/raceCrossers.js`

Track data: `crossers: [{ key, progress, direction, speed, width, modelType }]`

Types: `fishCart`, `penguinMarch`, `avalancheRumble`. Crossers move across the road in normalized lane space. `updateCrossersForFrame` advances them, `crosserHitFor` tests overlap, and `crosserAvoidanceLanes` produces lane hints for rival AI.

Hits apply a spin + speed penalty using existing feel constants.

Wired into V2 and V1 runtimes. `rivalRacers.js` consumes avoidance hints and applies hits to rivals.

## Shortcut triggers

Module: `src/game/race/shortcutTriggers.js`

Track data: `shortcuts: [{ key, type: 'gate'|'timer'|'dare', fromProgress, toProgress, elevation?, trigger?, openDuration?, closeDuration? }]`

The legacy single `shortcut` dare object remains supported and is normalized into the shortcuts list.

- `gate`: opens when the racer holds `trigger` (or permanently if no trigger) and is near `fromProgress`.
- `timer`: cycles open/closed based on `raceTime`.
- `dare`: identified by the module but intentionally handled by `airTricks.js` (`launchShortcut` / `updateShortcut`).

Wired into V2 before the dare shortcut launch in `ComebackCityThreeKartRace.jsx`.

## Penguin Village example

`src/game/race/tracks/penguinVillage.js` now includes:

- `surfaceBands`: asphalt on main street / market / return bend; ice on the frozen pond; snow shoulder strips.
- `breakableObjects`: six snowmen along the fish-market straight, two ice pillars at the pond edge.
- `crossers`: one fish cart on the market straight (~0.55) and one penguin march on the return bend (~0.82).
- `ramps`: one pond-edge kicker for an air trick.

## Testing

All new modules are importable in Node without Three.js. The acceptance gates are `npm run build`, `npm run test:kart-proof`, `npm run test:kart-playable`, and `npm run test:race`.
