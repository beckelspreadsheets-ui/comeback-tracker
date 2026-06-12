# Comeback City V2 3D Kart Runtime

## Objective

Implement `COMEBACK_CITY_V2_3D_KART_RUNTIME_PRD.md` as a real playable low-poly Three.js kart runtime, first at `/#race-3d-spike`, then promoted to `/#race` after the PRD gates pass.

## Runtime Goal Coupling

Maintain the agent-owned ledger at `.agent/runs/comeback-city-v2-3d-kart-runtime/` and keep `implementation-notes.html` current at checkpoints, before compaction, and before final handoff.

## Approved Source Of Truth

- `src/assets/game/art-direction/v2/approval-sheet.html`
- `src/assets/game/art-direction/v2/PROMPTS.md`
- `src/assets/game/art-direction/v2/hero-red-kart-trait-card-v2.png`
- `src/assets/game/art-direction/v2/purple-tech-rival-trait-card-v2.png`
- `src/assets/game/art-direction/v2/blue-speed-rival-trait-card-v2.png`
- `src/assets/game/art-direction/v2/orange-muscle-rival-trait-card-v2.png`
- `src/assets/game/art-direction/v2/green-utility-rival-trait-card-v2.png`
- `src/assets/game/art-direction/v2/black-gold-elite-rival-trait-card-v2.png`
- `src/assets/game/art-direction/v2/white-red-support-rival-trait-card-v2.png`
- `src/assets/game/art-direction/v2/track-geometry-road-system-trait-card-v2.png`
- `src/assets/game/art-direction/v2/district-portals-facades-trait-card-v2.png`
- `src/assets/game/art-direction/v2/roadside-props-barriers-trait-card-v2.png`
- `src/assets/game/art-direction/v2/pickups-boost-vfx-trait-card-v2.png`
- `src/assets/game/art-direction/v2/material-lighting-camera-trait-card-v2.png`

## Finishing Criteria

- `/#race-3d-spike` exists as an isolated new Three.js runtime route.
- `/#race` uses the new Three.js runtime after the visual, motion, playability, and QA gates pass.
- The race scene uses real 3D track geometry with curves or elevation, not a static screenshot background or flat road-image overlay.
- The scene includes a grounded hero kart, three grounded rivals, boost pads, item boxes, finish gate, curbs, guardrails, and 20-40 V2-inspired props.
- Playable controls visibly affect kart, road/camera relationship, rivals, and VFX.
- Full lap and restart work.
- Telemetry exposes `renderer`, `fpsEstimate`, `speed`, `steer`, `drift`, `boostHits`, `itemPickups`, `lap`, `finished`, and `visualAssetSet: comeback-city-v2-three-runtime`.
- Desktop FPS stays above 34 in proof runs.
- Tests fail on regression to static-image or overlay-only visuals.
- Required validation commands and browser evidence are run or any misses are recorded as `[incomplete]` with reason, proof, attempted work, impact, and next decision.

## Protected Paths And User-Owned Work

- Do not revert existing dirty worktree changes unless explicitly requested.
- Do not revive the old `ArcadeRace3D` route as the default cart route.
- Do not continue the existing Pixi projected-road route as the final solution.
- Keep generated evidence under this run ledger or existing test output directories; do not delete pre-existing tmp proof artifacts.

## Escape Hatch

Pause, ask the user, or mark a scoped item `[blocked]` / `[incomplete]` if:
- validation contradicts the goal
- the goal requires a scope change
- the agent is looping without measurable progress
- the next step risks deleting or rewriting durable memory
- the PRD and actual repo disagree
- the ledger itself contaminates validation
- the 3D spike does not beat the current visual route
- the V2 cards prove insufficient for implementation assets
- FPS drops below target and cannot be recovered without scope change
- tests pass but screenshots/videos still look visually wrong
