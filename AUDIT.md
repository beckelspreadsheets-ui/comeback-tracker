# Phase 1 Audit

## Scope Read

The app is a Vite/React tracker with a game layer under `src/game`. The active race entry path is:

1. `src/App.jsx` routes the `race` screen to `RaceScreen`.
2. `src/game/RaceScreen.jsx` renders the track selector, garage UI, inventory buttons, results persistence, and active `ArcadeRace3D`.
3. `src/game/ArcadeRace3D.jsx` owns the playable 3D race loop.

There is also an older 2D canvas race implementation inside `RaceScreen.jsx` (`RaceCanvas`). It is not mounted. It still documents useful behavior for hazards and track events, but the active game is `ArcadeRace3D`.

## Race File Map

- Tracks: `src/game/raceTracks.js`
- Item metadata and current item registry: `src/game/raceItems.js`
- Hazard metadata registry: `src/game/raceHazards.js`
- Player/race progression garage economy: `src/game/raceProgression.js`
- Active 3D race runtime: `src/game/ArcadeRace3D.jsx`
- Race shell, garage UI, results persistence, legacy 2D runtime: `src/game/RaceScreen.jsx`
- Profile/avatar stat derivation: `src/game/gameProfile.js`
- World entry point to raceway: `src/game/worldConfig.js`, `src/game/WorldMode.jsx`, `src/game/WorldScene.jsx`, `src/game/HudOverlay.jsx`

## Current Track Data Schema

Tracks are plain objects in `src/game/raceTracks.js` exported as `RACE_TRACKS`.

Required runtime fields used by the active 3D race:

- `key`: stable result and selection id.
- `name`, `shortName`, `discipline`, `difficulty`, `difficultyWhy`: UI labels.
- `laps`: race lap count.
- `width`: source-space track width used by the legacy 2D runtime and scaled by the 3D runtime.
- `startProgress`: normalized 0..1 start position on the route.
- `raceStyle`: controls default vehicle through `DEFAULT_VEHICLE_BY_STYLE` in `ArcadeRace3D`.
- `accent`, `asphalt`, `curbA`, `curbB`, `grass`, `hazard`, `sky`: presentation colors.
- `points`: closed route points in 1024x768 source coordinates.
- `boostPads`: normalized progress values.
- `itemBoxes`: normalized progress values.
- `aiRivals`: rival display and behavior data. Active 3D uses `name`, `color`, and `accent`; legacy 2D also uses lane, aggression, risk, patience, and signature data.

UI/design fields:

- `theme`: `atmosphere`, `time`, `weather`, `music`.
- `layout`: `philosophy`, `shape`, `keyTurns`, `elevation`, `branches`.
- `signatureObstacles`: array of strings.
- `dynamicElements`: array of strings.
- `riskRewardShortcut`: `name`, `summary`.
- `powerUpIntel`: `placement`, `signatureUse`, `defensive`, `aggressive`.
- `aiIntel`: `line`, `shortcuts`, `items`, `signatureMove`.
- `signatureItem`: `key`, `name`, `summary`, `color`.
- `shortcuts`: legacy 2D shortcut route data with `key`, `name`, `condition`, `width`, `accent`, `points`.
- `hazards`: legacy 2D hazard definitions. Active 3D currently does not process these.
- `scenery`: legacy 2D scenery definitions. Active 3D currently generates generic scenery instead.

## Current Item Data Schema

Garage-purchased items live in `src/game/raceProgression.js` as `RACE_ITEMS`:

- `key`
- `name`
- `cost`
- `summary`

Runtime item metadata lives in `src/game/raceItems.js`:

- `COMMON_BOX_ITEMS`: current item-box pool keys.
- `BANKED_ITEMS`: garage inventory keys the player can trigger from the HUD.
- `LOCAL_ITEMS`: local non-shop item labels, including track signatures.
- `ITEM_META`: lookup map used by the race UI.
- `ITEM_DEFINITIONS`: normalized metadata for current items: `key`, `category`, `targetType`, `vehicleRestriction`, `trackRestriction`, `duration`, `cooldown`, `feedback`.

Active 3D pickup items are still color balloon based in `ArcadeRace3D.jsx`:

- `BALLOON_TYPES` defines `key`, `color`, `icon`, and tier `labels`.
- `collectBalloon` tiers repeated pickups of the same color up to level 3.
- `useHeldBalloon` applies hardcoded effects for `red`, `blue`, `green`, `yellow`, and `rainbow`.

## Vehicle Switch System

Active vehicle switching is in `ArcadeRace3D.jsx`:

- `VEHICLES` defines `kart`, `hover`, and `plane` handling.
- `DEFAULT_VEHICLE_BY_STYLE` picks an initial mode from `track.raceStyle`.
- `cycleVehicle` cycles `kart -> hover -> plane`, resets altitude/jump state, gives a small boost, and calls `playerVehicle.setMode`.
- Commands reach the runtime through `RaceScreen` buttons, keyboard `KeyC`, or touch controls.
- Plane-specific flight gates exist in `createRaceState` and `updatePlayer`.

Current limitation: there are no data-driven switch pads, forced zones, switch locks, or vehicle-only route checks yet.

## Banana Collection System

Bananas are active only in `ArcadeRace3D.jsx`:

- `createRaceState` generates 18 bananas procedurally along the compiled route.
- `updatePlayer` checks distance to each banana, increments `player.bananas`, clamps to 10, and starts an 8.5 second banana cooldown.
- `addBoost` uses bananas as a speed cap bonus.
- The HUD displays `telemetry.bananas`.

Current limitation: bananas do not persist beyond the active race state, cannot be spent, and are not dropped on hit.

## Hazard And Obstacle Architecture

Current active 3D hazards:

- Dropped green balloon traps are stored in `race.droppedHazards`.
- Trap collision only checks rivals.
- Boost pads, item balloons, bananas, flight gates, road edges, rival bumping, and off-road slowdown are implemented inline in `updatePlayer`.

Current legacy 2D hazards:

- `RaceCanvas` reads `track.hazards`.
- Supported types include `wet`, `swing`, `gate`, `gust`, `tremor`, `slam`, `laser`, `conveyor`, and `gravity`.
- Logic is hardcoded in `updateTrackHazards`.

Foundation added in Phase 1:

- `src/game/raceHazards.js` now records current hazard metadata in `HAZARD_DEFINITIONS`.

## How To Add A New Track

1. Add a new object to `RACE_TRACKS` in `src/game/raceTracks.js`.
2. Choose a stable `key`, display labels, `laps`, `width`, `startProgress`, and `raceStyle`.
3. Add route `points` in 1024x768 source coordinates. The active 3D compiler converts them to world coordinates.
4. Add `boostPads` and `itemBoxes` as normalized progress values.
5. Add `signatureItem` and register matching item metadata in `src/game/raceItems.js`.
6. Add `aiRivals`.
7. Add design/UI fields (`theme`, `layout`, obstacles, dynamic elements, shortcut and AI notes).
8. If using hazards or shortcuts in the active 3D game, implement the relevant runtime support in `ArcadeRace3D.jsx`. Track hazard data alone is not enough yet.
9. Run `npm run build` and an automated playtest.

## How To Add A New Item

1. If it is shop-purchasable, add it to `RACE_ITEMS` in `src/game/raceProgression.js`.
2. Add normalized metadata to `ITEM_DEFINITIONS` in `src/game/raceItems.js`.
3. Add it to `COMMON_BOX_ITEMS`, `BANKED_ITEMS`, or a track `signatureItem` as appropriate.
4. Add display metadata if it is not already covered by `RACE_ITEMS` or `LOCAL_ITEMS`.
5. Implement the active effect in `ArcadeRace3D.jsx`. Current active item effects are hardcoded in `useHeldBalloon` and `useBankedItem`.
6. Add visual/audio feedback hooks when Phase 6 feedback systems exist.
7. Add tests or an automated playtest path that uses the item.

## How To Add A New Hazard Type

1. Add metadata to `HAZARD_DEFINITIONS` in `src/game/raceHazards.js`.
2. Add hazard instances to a track's `hazards` array in `src/game/raceTracks.js`.
3. Implement runtime trigger/effect/telegraph behavior in `ArcadeRace3D.jsx`.
4. Add mesh creation and mesh sync if the hazard needs a visible 3D object.
5. Verify vehicle filtering, cooldowns, and softlock safety in automated playtests.

## Architectural Blockers

Resolved in Phase 1:

- Track data no longer lives inside the `RaceScreen` UI component.
- Item metadata no longer lives inside the `RaceScreen` UI component.
- Hazard metadata now has a registry file for Phase 2 expansion.

Remaining blockers to address before adding final content:

- Active 3D item effects are still hardcoded by balloon color and banked item key.
- Active 3D does not consume `track.hazards`, `track.shortcuts`, or `track.scenery`.
- Vehicle switch behavior is manual only; there are no forced zones, locks, or switch pads.
- Bananas are capped at 10 and only provide passive speed bonus.
- AI rivals follow the primary route by progress and do not evaluate route layers.
- Dynamic track events exist only as hardcoded legacy 2D behavior, not as an active 3D scheduler.

