# Comeback City Arcade Kart Rebuild

## Objective

Build a separate Comeback City arcade kart visual proof scene that is materially closer to the supplied target screenshot/mockup than to the old blocky in-game race scene. Phase 1 is static visual proof only; gameplay work remains blocked until owner approval.

## Parent Goal

Successor to `kart-racer-production-readiness`. The owner has paused production readiness, Cloudflare deploys, rollback, and release audits until the gameplay/visual result is approved.

## Goal Mode Coupling

Maintain the agent-owned ledger at `/Users/andrewferguson/Downloads/comeback-tracker/.agent/runs/comeback-city-arcade-kart-rebuild` and keep implementation-notes.html current at checkpoints, before compaction, and before final handoff.

## Latest Checkpoint

2026-06-07T22:15:23Z: pass 051 records owner approval: "looks amazing this is approved". Phase 1 static visual proof is approved using the pass 048 visual review packet, pass 048 acceptance audit, pass 049 static proof guard, and pass 050 blocker audit as evidence. The Phase 1 goal is complete. Phase 2 may begin in a later pass.

## Immediate Phase 1 Gate

- Do not tune the old race scene as the next step.
- Do not add gameplay until the owner accepts the static visual proof.
- Do not continue the rejected CSS/HTML shape-art proof as the visual base.
- Use bitmap/generated raster art as the Phase 1 visual source of truth.
- Each visual pass must save desktop and mobile screenshots plus target/old-scene comparison evidence.
- Stop and revise the art approach if two consecutive visual proof passes fail owner review.

## Finishing Criteria

- One Comeback City kart-only proof track has a clear start grid, readable lap route, barriers, apex markers, boost pads, item boxes, district signs, and finish gate.
- Unusable or unclear branches are removed or disabled until the main lap is fun and readable.
- Visual direction is locked to cartoon arcade: rounded roads, painted curbs, decals, signs, storefront facades, glowing portals, skyline layers, trees, banners, VFX, improved kart silhouette, wheels, seat, driver, exhaust or boost flame, and drift sparks.
- Core kart loop is present and playable: acceleration, braking, steering, hop/drift, mini-turbo, boost pads, item boxes, simple items, rivals, lap/finish flow.
- Camera clearly frames kart, road, apex, items, and rivals.
- Each implementation pass has before/after desktop and mobile screenshots. If the screenshots do not look materially more like a real arcade kart game, stop and adjust direction before more engineering.
- Automated validation is run or explicitly marked incomplete with reason:
  - `npm run test:race`
  - `npm run test:race:browser`
  - `npm run test:visual`
  - `npm run test:qa:capture`
- FPS telemetry targets stable 45 FPS for focused desktop play.
- Manual owner review is ready for the required screenshots:
  - Start grid
  - First turn/drift
  - Boost pad
  - Item pickup/use
  - Rival cluster
  - Finish gate
  - Mobile driving
- Owner approval gates are ready for 4+ scores on visual appeal, track readability, drift feel, camera, race drama, and mobile playability.

## Explicit Assumptions From PRD

- "75% of Mario Kart" means feel, readability, camera, drift satisfaction, and arcade presentation, not Nintendo-level art fidelity.
- Cartoon arcade is the art target because it has the best chance of looking good while hitting 45 FPS in browser.
- The first release-quality proof is one polished kart-only track, not all modes or tracks.
- Production readiness, Cloudflare deploys, rollback, and release audits pause until the owner approves the gameplay/visual result.

## Escape Hatch

Pause, ask the user, or mark a scoped item `[blocked]` / `[incomplete]` if:
- validation contradicts the goal
- the goal requires a scope change
- the agent is looping without measurable progress
- the next step risks deleting or rewriting durable memory
- the PRD and actual repo disagree
- baseline or after screenshots fail the visual-delta rule
- a required gameplay or visual decision is ambiguous and cannot be discovered from the repo
- the ledger itself contaminates validation
