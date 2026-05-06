# Blockers

No active blockers remain for the requested racing-game scope.

## Resolved

1. Active 3D hazards are data-driven.
   - `ArcadeRace3D` consumes track and layer hazard definitions and applies trigger, effect, vehicle filter, cooldown, and telegraph behavior.

2. Active 3D items use the item registry.
   - Item boxes and banked items resolve metadata from `raceItems.js`; active effects are keyed by item definition and track restrictions.

3. Route layers are represented in active 3D data.
   - Each track has ground, air, and hybrid layers with item boxes, vehicle preferences, AI weights, and hazards.

4. Vehicle switch integration is implemented.
   - Switch pads, vehicle-only zones, penalties, blocks, and vehicle locks are active in the runtime and covered by browser playtests.

5. Banana economy is functional.
   - Bananas support tier upgrades, rare next pickup, one-use double slot, and dropped banana recovery after hits.

## Non-Blocking Follow-Ups

- Replace generated WebAudio cues with authored sound assets.
- Expand AI coordination beyond the current route weighting and signature triggers.
- Add more authored route geometry for layer-specific racing lines.
