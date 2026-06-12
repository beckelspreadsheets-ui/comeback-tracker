# Comeback City Arcade Kart Rebuild PRD

## Status

Phase 1 and Phase 2 are complete.

- Phase 1 approval: `.agent/runs/comeback-city-arcade-kart-rebuild/evidence/pass-051-owner-approval/owner-approval.md`
- Phase 2 completion: `.agent/runs/comeback-city-arcade-kart-phase-2-playable-slice/evidence/pass-001-playable-proof/`

## Product Goal

Turn Comeback City into a polished browser-based arcade kart experience that visually matches the approved cartoon arcade direction and feels like a real kart race instead of a blocky tech demo.

The approved visual direction is the source of truth:

- polished cartoon arcade style
- large readable red/black kart in chase camera
- clean boulevard racing road
- colorful district buildings
- glowing portals
- readable signs
- skyline depth
- clear HUD
- visible rivals, route, boost pads, and item boxes

## Phase Count

The original rebuild has 3 core phases:

1. Static Visual Proof
2. Playable Slice
3. Drift And Race Feel

For goal-mode execution, use 5 total PRD phases:

1. Static Visual Proof - complete
2. Playable Slice - complete
3. Drift And Race Feel - next
4. Track Integration And Race Loop
5. QA, Polish, And Release Readiness

## Hard Rules

- Preserve the approved Phase 1 visual direction.
- Do not regress to the old blocky procedural race scene.
- Do not remove `/#visual-kart-proof`.
- Keep `/#visual-kart-playable` or its successor visually close to the approved proof.
- Every visual/mechanics pass must produce desktop and mobile evidence.
- A pass fails if screenshots read closer to the old game than to the approved proof.
- If two visual passes fail, stop coding and revise the art approach.
- Gameplay features must remain readable in screenshots and clips, not only in telemetry.

## Phase 1: Static Visual Proof

Status: Complete.

Approved route:

- `/#visual-kart-proof`

Required evidence:

- desktop screenshot
- mobile screenshot
- target comparison
- old-game comparison
- owner approval

Completion evidence:

- `.agent/runs/comeback-city-arcade-kart-rebuild/evidence/pass-048-phase1-acceptance-audit/contact-sheet.png`
- `.agent/runs/comeback-city-arcade-kart-rebuild/evidence/pass-051-owner-approval/owner-approval.md`

## Phase 2: Playable Slice

Status: Complete.

Approved route:

- `/#visual-kart-playable`

Implemented:

- acceleration
- braking
- steering
- chase-camera style motion
- boost pad trigger
- simple rivals moving ahead
- item box pickup placeholder
- keyboard controls
- mobile touch controls
- desktop/mobile evidence
- 10-second desktop clip

Completion evidence:

- `.agent/runs/comeback-city-arcade-kart-phase-2-playable-slice/evidence/pass-001-playable-proof/contact-sheet.png`
- `.agent/runs/comeback-city-arcade-kart-phase-2-playable-slice/evidence/pass-001-playable-proof/desktop-10s.webm`
- `.agent/runs/comeback-city-arcade-kart-phase-2-playable-slice/evidence/pass-001-playable-proof/kart-playable-proof-report.json`

Validation:

- `npm run test:kart-proof`
- `npm run test:kart-playable`
- `npm run build`

## Phase 3: Drift And Race Feel

Status: Next.

Objective:

Make the playable slice feel like an arcade kart race by adding hop/drift, drift sparks, mini-turbo charge, boost burst, camera response, one readable lap route, finish gate, and lap flow.

Required features:

- hop/drift input
- drift state and direction
- visible drift sparks
- mini-turbo charge tiers
- boost burst on drift release
- camera response during drift and boost
- one clean lap route
- finish gate
- lap counter flow
- clear route readability without relying on the minimap

Acceptance criteria:

- One full lap can be completed without minimap.
- Drift is visually obvious.
- Mini-turbo is visible and understandable.
- Boost burst is visible and changes speed.
- Camera makes turns and boost feel faster without losing readability.
- Desktop and mobile screenshots read as a kart race.
- 10-second clip shows drift, sparks, mini-turbo, boost, rivals, and route.

Required evidence:

- desktop screenshot: drift start
- desktop screenshot: drift sparks
- desktop screenshot: mini-turbo release
- desktop screenshot: finish gate
- mobile screenshot: drift or boost
- 10-second clip
- telemetry report proving drift state, mini-turbo charge/release, boost burst, lap progress, and finish gate crossing

Validation commands:

- `npm run test:kart-proof`
- `npm run test:kart-playable`
- new `npm run test:kart-drift` or equivalent
- `npm run build`

Goal-mode prompt:

```text
Start a goal for Comeback City Arcade Kart Phase 3 Drift And Race Feel.

Objective: add hop/drift, visible drift sparks, mini-turbo charge, boost burst, camera response, one clean lap route, finish gate, and lap flow to the approved Phase 2 playable proof without regressing the approved visual direction. Produce desktop/mobile screenshots and a 10-second clip proving the sequence reads as a kart race. Maintain the agent-owned ledger at /Users/andrewferguson/Downloads/comeback-tracker/.agent/runs/comeback-city-arcade-kart-phase-3-drift-race-feel and keep implementation-notes.html current at checkpoints, before compaction, and before final handoff.
```

## Phase 4: Track Integration And Race Loop

Status: Planned.

Objective:

Move from proof-slice gameplay into a coherent single-track race loop while preserving the approved visual direction.

Required features:

- start grid
- countdown
- one complete lap route
- finish gate and lap counter
- route markers
- boost pads and item boxes placed along the route
- simple rival pacing
- basic collision/off-road slowdown
- restart flow
- results state

Acceptance criteria:

- Player can complete one full race loop.
- Route is readable without debug UI.
- Rivals remain visible ahead or nearby.
- Boost pads and item boxes are placed where the player naturally drives.
- Finish gate is obvious.
- Mobile controls remain usable.

Required evidence:

- desktop start grid screenshot
- desktop first turn screenshot
- desktop boost pad screenshot
- desktop item pickup screenshot
- desktop finish gate screenshot
- mobile driving screenshot
- full-lap clip or screenshot sequence
- telemetry proving lap start, lap progress, item pickup, boost pad trigger, rival movement, and finish crossing

Goal-mode prompt:

```text
Start a goal for Comeback City Arcade Kart Phase 4 Track Integration And Race Loop.

Objective: turn the approved playable kart proof into a coherent one-track race loop with start grid, countdown, one complete lap route, finish gate/lap flow, boost pads, item boxes, simple rivals, route markers, and restart/results flow. Preserve the approved visual direction and produce desktop/mobile evidence plus full-lap telemetry. Maintain the agent-owned ledger at /Users/andrewferguson/Downloads/comeback-tracker/.agent/runs/comeback-city-arcade-kart-phase-4-track-loop and keep implementation-notes.html current at checkpoints, before compaction, and before final handoff.
```

## Phase 5: QA, Polish, And Release Readiness

Status: Planned.

Objective:

Harden the arcade kart experience for release-quality review.

Required features:

- visual polish pass
- HUD polish
- input polish
- mobile layout polish
- performance pass
- accessibility/safe fallback review
- deterministic test coverage for the kart slice
- owner review packet

Acceptance criteria:

- Desktop and mobile play are stable.
- The race remains visually close to the approved direction.
- No major HUD overlap.
- Touch controls are usable.
- Build and focused tests pass.
- Owner scores 4+ on visual appeal, track readability, kart silhouette, camera, arcade presentation, and mobile playability.

Required evidence:

- owner review contact sheet
- desktop clip
- mobile clip or screenshot sequence
- performance summary
- test report
- known issues list

Validation commands:

- `npm run test:kart-proof`
- `npm run test:kart-playable`
- drift/track-loop tests added in Phases 3-4
- `npm run test:visual`
- `npm run build`

Goal-mode prompt:

```text
Start a goal for Comeback City Arcade Kart Phase 5 QA Polish And Release Readiness.

Objective: polish and harden the approved Comeback City arcade kart race for release-quality owner review, including visual polish, HUD polish, input/mobile polish, performance validation, focused test coverage, and an owner review packet with desktop/mobile evidence. Maintain the agent-owned ledger at /Users/andrewferguson/Downloads/comeback-tracker/.agent/runs/comeback-city-arcade-kart-phase-5-qa-polish-release and keep implementation-notes.html current at checkpoints, before compaction, and before final handoff.
```

## Current Recommended Next Goal

Run Phase 3 next.

Reason:

Phase 2 proves the playable slice. The next quality jump is race feel: drift, sparks, mini-turbo, boost burst, route/lap/finish readability, and camera response.

## Definition Of Done

The full Comeback City arcade kart rebuild is done when:

- Phase 1 visual direction is preserved.
- Phase 2 mechanics remain functional.
- Phase 3 drift/race feel is fun and readable.
- Phase 4 one-track loop can be completed.
- Phase 5 owner review passes with 4+ scores.
- Desktop and mobile evidence exist for each phase.
- Focused tests and production build pass.
