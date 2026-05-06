# Race Architecture Audit

## Scope Read

The active race entry path is:

1. `src/App.jsx` routes the `race` screen to `RaceScreen`.
2. `src/game/RaceScreen.jsx` renders the track selector, garage UI, inventory buttons, results persistence, and `ArcadeRace3D`.
3. `src/game/ArcadeRace3D.jsx` owns the active Three.js race loop.

There is also an older 2D canvas runtime inside `RaceScreen.jsx` (`RaceCanvas`). It is not mounted by the active race screen. The final Diddy Kong Racing-style work is implemented in `ArcadeRace3D` and the race registries.

## Race File Map

- Tracks: `src/game/raceTracks.js`
- Item metadata and item registry: `src/game/raceItems.js`
- Hazard metadata registry: `src/game/raceHazards.js`
- Player/race progression garage economy: `src/game/raceProgression.js`
- Active 3D runtime: `src/game/ArcadeRace3D.jsx`
- Isolated browser playtest harness: `race-playtest.html`, `src/game/RacePlaytestHarness.jsx`
- Automated validation: `scripts/race-content-playtest.mjs`, `scripts/race-browser-playtest.mjs`

## Current Track Data Schema

Tracks are plain objects in `src/game/raceTracks.js` exported as `RACE_TRACKS`.

Core runtime fields:

- `key`, `name`, `shortName`, `discipline`, `difficulty`, `difficultyWhy`
- `laps`, `width`, `startProgress`, `raceStyle`
- `accent`, `asphalt`, `curbA`, `curbB`, `grass`, `hazard`, `sky`
- `points`: closed route points in 1024x768 source coordinates
- `bananaCount` or `bananaPlacements`
- `boostPads`
- `layers.ground`, `layers.air`, `layers.hybrid`
- `switchPads`
- `vehicleZones`
- `vehicleLocks`
- `events`
- `hazards`
- `scenery`
- `signatureItem`
- `aiRivals`

Layer fields:

- `name`
- `vehiclePreference`
- `aiWeight`
- `lineOffset`
- `itemBoxes`
- optional layer-local `hazards`

Vehicle integration fields:

- `switchPads`: normalized `progress`, `targetVehicle`, `layer`, optional `radius`
- `vehicleZones`: normalized `progress`, `vehicle`, `action`, `radius`, optional activation fields
- `vehicleLocks`: normalized `start`, `end`, optional `vehicle`

Event fields:

- `trigger`: `lap`, `time`, `position`, or `player`
- `action`: `trigger-hazard`, `activate-zone`, `set-lock`, or `rotate-polarity`
- optional `repeatInterval`, `message`, `flag`, `hazardKey`, `hazardType`, `zoneKey`, `duration`

Scenery fields:

- `kind`: `lighthouse`, `boats`, `market`, `island`, `spire`, `mesa`, `storm`, `drill`, `ore`, or `rails`
- `x`, `y`, `w`, `h`, `color`

## Current Item Data Schema

Garage-purchased items live in `src/game/raceProgression.js` as `RACE_ITEMS`.

Runtime item metadata lives in `src/game/raceItems.js`:

- `COMMON_BOX_ITEMS`
- `BANKED_ITEMS`
- `LOCAL_ITEMS`
- `ITEM_META`
- `ITEM_DEFINITIONS`

Each `ITEM_DEFINITIONS` entry includes:

- `key`
- `name`
- `category`
- `targetType`
- `vehicleRestriction`
- `trackRestriction`
- `duration`
- `cooldown`
- `rarity`
- `feedback.activation`
- `feedback.hit`
- `feedback.expiration`

Active effects are applied through `applyRaceItem` in `ArcadeRace3D.jsx`. Item boxes choose from the registry, honor vehicle and track restrictions, and support track-specific signature items.

## Vehicle Switch System

Active vehicle switching is in `ArcadeRace3D.jsx`:

- `VEHICLES` defines `kart`, `hover`, and `plane` handling.
- `DEFAULT_VEHICLE_BY_STYLE` picks an initial mode from `track.raceStyle`.
- `setVehicleMode` handles transform timing, altitude/jump reset, audio cue, and brief invincibility.
- `cycleVehicle` handles manual switching.
- `applyVehicleIntegration` handles switch pads, vehicle-only zones, penalties, blocks, and vehicle locks.
- Items and hazards query `racer.vehicleMode` and use `vehicleMatchesFilter`.

## Banana Economy

Bananas are active race currency:

- Bananas accumulate during the race and are not reset per lap.
- `3` bananas upgrades the held item by one tier.
- `5` bananas guarantees a rare item on the next pickup.
- `8` bananas arms a one-use second item slot.
- Hits scatter up to 3 dropped bananas onto the track.
- Banana Magnet pulls placed and dropped bananas.
- The HUD shows count, item tier, rare pickup state, second slot state, and upgrade availability.

## Hazard Architecture

Hazard metadata lives in `src/game/raceHazards.js`. Track instances live in each track's `hazards` arrays.

Active hazard runtime support:

- trigger windows through cycle timing, event pulses, and proximity checks
- effects including slow, spin, knockback, pull, boost, blind, force-switch, switch-lock, control-flip, set-polarity, and polarity-check
- vehicle filtering through `vehicleFilter`
- visual telegraphs through active/inactive hazard meshes
- remote triggering through environmental items and dynamic events

## How To Add A New Track

1. Add a new object to `RACE_TRACKS` in `src/game/raceTracks.js`.
2. Choose a stable `key`, display labels, `laps`, `width`, `startProgress`, and `raceStyle`.
3. Add closed route `points` in 1024x768 source coordinates.
4. Add `layers.ground`, `layers.air`, and `layers.hybrid` with item boxes and AI weights.
5. Add `bananaPlacements` or `bananaCount`.
6. Add `boostPads`, `switchPads`, `vehicleZones`, `vehicleLocks`, `events`, `hazards`, and `scenery`.
7. Add `signatureItem` and matching item metadata in `src/game/raceItems.js`.
8. Add `aiRivals` and any signature behavior supported by `maybeUseRivalSignature`.
9. Run `npm run test:race`, `npm run test:race:browser`, and `npm run build`.

## How To Add A New Item

1. If shop-purchasable, add it to `RACE_ITEMS` in `src/game/raceProgression.js`.
2. Add normalized metadata to `ITEM_DEFINITIONS` in `src/game/raceItems.js`.
3. Add it to `COMMON_BOX_ITEMS`, `BANKED_ITEMS`, or a track `signatureItem`.
4. Implement or map the effect in `applyRaceItem` in `ArcadeRace3D.jsx`.
5. Add `ITEM_COLORS` and feedback cue ids when useful.
6. Add or update content/browser playtest assertions if the item introduces a new mechanic.

## How To Add A New Hazard Type

1. Add metadata to `HAZARD_DEFINITIONS` in `src/game/raceHazards.js`.
2. Add hazard instances to a track's `hazards` array or a layer-local `hazards` array.
3. Map the effect in `applyHazardEffect` if it is not already supported.
4. Add mesh styling in the hazard mesh creation block if the default mesh is not clear enough.
5. Verify vehicle filtering, cooldowns, event triggering, and softlock safety with both race test scripts.

## Architectural Blockers

No known blockers remain for the requested Diddy Kong Racing-style content. The original Phase 1 blockers were resolved by the registry split, data-driven route layers, active 3D hazard consumption, item metadata, vehicle zones/locks/switch pads, banana spending, and dynamic event scheduler.

Remaining quality refinements are non-blocking:

- Replace generated WebAudio cues with authored audio assets.
- Add more nuanced AI tactical item coordination.
- Add richer route geometry instead of one compiled centerline plus layer offsets.
