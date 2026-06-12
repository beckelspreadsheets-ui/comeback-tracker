# Comeback City V2 3D Kart Runtime PRD

## Objective
Implement the approved Comeback City Arcade Kart V2 art direction as a real playable 3D race runtime. Build a new low-poly Three.js/N64-style spike first, prove it is materially better than the current Pixi route, then promote it to `/#race`.

This is a fresh goal. Do not inherit blocked status from any earlier thread or goal.

## Approved Source Of Truth
- `src/assets/game/art-direction/v2/approval-sheet.html`
- `src/assets/game/art-direction/v2/PROMPTS.md`
- All approved V2 trait cards in `src/assets/game/art-direction/v2/`

## Current Problem
The existing `/#race` Pixi route improved cart sprites but repeatedly failed the visual target. The road/world still read as rudimentary overlays instead of a grounded playable kart-race scene.

## Non-Negotiables
- Do not keep iterating on the current Pixi projected-road route as the final solution.
- Do not revive the old `ArcadeRace3D` route.
- Build a new Three.js runtime route first at `/#race-3d-spike`.
- Promote to `/#race` only after visual, motion, playability, and QA gates pass.
- Keep a new goal ledger at `.agent/runs/comeback-city-v2-3d-kart-runtime/`.

## Target Runtime
Use a low-poly Three.js scene:
- Real track geometry with curves/elevation.
- Chase camera following the player kart.
- Grounded player kart, rivals, boost pads, item boxes, finish gate, and props.
- V2 trait-card-driven visual language.
- No static screenshot backgrounds as the gameplay world.
- No flat road image/ramp overlays.
- No floating debug markers.

## Implementation Phases

### Phase 0: Goal Ledger
Create:
- `.agent/runs/comeback-city-v2-3d-kart-runtime/GOAL.md`
- `.agent/runs/comeback-city-v2-3d-kart-runtime/implementation-notes.html`
- `.agent/runs/comeback-city-v2-3d-kart-runtime/evidence/`

Record:
- Approved trait-card paths.
- Current visual failure modes.
- Protected files and user-owned work.
- Validation gates.
- Decisions and tradeoffs as work progresses.

### Phase 1: Build `/#race-3d-spike`
Add a new isolated route:
- `/#race-3d-spike`

The spike must include:
- Three.js renderer.
- Real low-poly track mesh.
- Curbs and guardrails.
- At least one curve or elevation change.
- Boost pad.
- Item box.
- Finish gate placeholder.
- 20-40 instanced props from V2 art direction.
- Chase camera.
- Hero kart from approved red kart direction.
- Three grounded rivals.
- Basic telemetry.

Gate 1:
- Capture desktop/mobile screenshots and a 10-second desktop video.
- If the spike does not look clearly better than current `/#race`, stop implementation and revise the art/model approach before adding gameplay.

### Phase 2: Playability
Implement:
- Acceleration.
- Braking.
- Steering.
- Drift input.
- Drift sparks.
- Boost pad trigger.
- Item box pickup.
- Rival movement.
- Lap progress.
- Finish trigger.
- Restart.

Gate 2:
- Controls visibly affect kart, road, camera, rivals, and VFX.
- No telemetry-only proof.
- No static scene acceptance.

### Phase 3: V2 Asset Integration
Integrate or derive assets from approved V2 cards:
- Hero kart states.
- Rival variants.
- Boost pad.
- Item box.
- Curb/barrier/prop set.
- Portal/facade props.
- VFX sprites/textures.
- Material, lighting, and camera direction from `material-lighting-camera-trait-card-v2.png`.

Gate 3:
- Desktop and mobile screenshots read closer to approved V2 trait cards than current Pixi `/#race`.
- Objects feel grounded in one 3D scene.

### Phase 4: Promote To `/#race`
After gates pass:
- Switch production `/#race` to the new Three.js runtime.
- Keep Pixi route only as legacy/debug.
- Keep old `ArcadeRace3D` out of the default cart route.

Telemetry must expose:
- `renderer`
- `fpsEstimate`
- `speed`
- `steer`
- `drift`
- `boostHits`
- `itemPickups`
- `lap`
- `finished`
- `visualAssetSet: comeback-city-v2-three-runtime`

### Phase 5: QA Evidence
Run:
- `npm run build`
- `npm run test:kart-proof`
- `npm run test:kart-playable`
- `npm run test:kart-3d-spike`
- Browser smoke for `/#race`

Create evidence:
- Desktop 10-second video.
- Mobile 10-second video.
- Desktop screenshots.
- Mobile screenshots.
- Contact sheet comparing:
  - approved V2 trait cards
  - current Pixi `/#race`
  - `/#race-3d-spike`
  - final promoted `/#race`

## Acceptance Criteria
The goal is complete only when:
- `/#race` uses the new Three.js runtime.
- The scene looks materially closer to approved V2 cards than the current Pixi route.
- The track is real 3D geometry, not image overlay.
- Playable controls are visible without telemetry.
- Full lap and restart work.
- Desktop FPS stays above 34.
- Tests fail if the route regresses to static-image or overlay-only visuals.
- Goal ledger is current and links final evidence.

## Escape Hatch
Stop and ask before continuing if:
- The 3D spike does not beat the current visual route.
- The V2 cards prove insufficient for implementation assets.
- FPS drops below target and cannot be recovered without scope change.
- Tests pass but screenshots/videos still look visually wrong.
- Work starts looping on cosmetic tweaks without improving the core 3D scene.
