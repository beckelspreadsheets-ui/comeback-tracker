# Blockers

## Phase 2 Required Refactors

These do not block Phase 1 completion, but they must be addressed before building the final three tracks.

1. Active 3D hazards are not data-driven.
   - Current state: `ArcadeRace3D` ignores `track.hazards`.
   - Proposed solution: add a component-style hazard runtime that reads trigger, effect, vehicle filter, telegraph, position, and event fields from track data.

2. Active 3D items are not registry-driven.
   - Current state: pickup effects are hardcoded by balloon color in `useHeldBalloon`; banked effects are hardcoded in `useBankedItem`.
   - Proposed solution: use `ITEM_DEFINITIONS` plus effect handlers so new item keys can be added without editing unrelated item logic.

3. Route layers are not represented in active 3D data.
   - Current state: each track has one closed route plus procedural flight gates.
   - Proposed solution: add `layers.ground`, `layers.air`, and `layers.hybrid` route definitions with per-layer item boxes, hazards, and AI weights.

4. Vehicle switch integration is incomplete.
   - Current state: switching is manual and only changes handling/altitude state.
   - Proposed solution: add switch zones, forced pads, vehicle-only paths, and switch locks to track data and runtime checks.

5. Banana economy is collection-only.
   - Current state: bananas are race-local, capped at 10, and only increase boost speed cap.
   - Proposed solution: add spend actions, item-tier upgrades, rare next pickup state, one-use double slot state, and dropped banana pickups on hit.

