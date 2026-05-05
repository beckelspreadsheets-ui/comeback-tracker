# Changelog

## Phase 1: Audit and Foundation

- Audited active race architecture and documented schemas in `AUDIT.md`.
- Added `BLOCKERS.md`.
- Split race content into registries:
  - `src/game/raceTracks.js`
  - `src/game/raceItems.js`
  - `src/game/raceHazards.js`
- Added Three.js race assets and foundation race files to version control.
- Committed as `PHASE 1: audit race architecture`.

## Phase 2: Core System Expansions

- Expanded item roster to 19 definitions covering projectile, trap, vehicle-state, environmental, setup, and self-buff categories.
- Added item target, vehicle, track, duration, cooldown, rarity, and feedback metadata.
- Added banana spending: tier upgrade, rare next pickup, one-use double slot.
- Added dropped bananas on hit.
- Added data-driven route layers, layer item boxes, switch pads, vehicle zones, vehicle locks, dynamic events, and component-style hazards to the active 3D runtime.
- Added basic AI route-layer evaluation.
- Committed as `PHASE 2: expand race systems`.

## Phase 3: Tide Pier

- Replaced the first track with the refined Tide Pier.
- Added figure-8 coastal layout, 10 bananas, ground/air/hybrid layers, 6/4/2 item box placement, rising tide, boat traffic, and five signature obstacles.
- Added Anchor Drop as the track signature item.
- Added Captain Brine's dock-bell seagull trigger.
- Committed as `PHASE 3: refine Tide Pier`.

## Phase 4: Static Storm Plateau

- Replaced the second track with Static Storm Plateau.
- Added floating mesa layout, 10 bananas, ground/air/hybrid layers, 4/6/3 item box placement, bridge degradation, storm-eye shortcut, and five signature obstacles.
- Added Lightning Rod behavior to redirect lightning to the leader.
- Added Volt's static-charge trigger.
- Committed as `PHASE 4: add Static Storm Plateau`.

## Phase 5: Magnet Mine Descent

- Replaced the third track with Magnet Mine Descent.
- Added mine spiral layout, 10 bananas, ground/air/hybrid layers, 5/3/2 item box placement, drill shortcut, polarity rotation, and five signature obstacles.
- Added polarity strips/gates and Polarity Swap interactions.
- Added Drill's early mine trigger.
- Committed as `PHASE 5: add Magnet Mine Descent`.

## Phase 6: Polish

- Added camera shake on impact, boost FOV widening, and turn tilt.
- Added speed-line overlay, boost visual filter, and hit flash.
- Added vehicle-switch transform ring and invincibility window.
- Added ambient WebAudio hooks per track family and item cue hooks.
- Added lap split display and position change notifications.
- Improved banana and item upgrade HUD.
- Committed as `PHASE 6: polish race feedback`.

## Phase 7: Testing and Documentation

- Added `scripts/race-content-playtest.mjs`.
- Added `npm run test:race`.
- Verified all three tracks complete 3 simulated races in free-switch and vehicle-restricted modes.
- Verified required track hazards, route layers, item box counts, signatures, item roster, banana counts, events, zones, locks, and switch pads.
- Added `TRACK_DESIGN.md`, `ITEM_REFERENCE.md`, and this changelog.

