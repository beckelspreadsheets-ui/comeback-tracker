# Comeback City Arcade Kart Phase 2 Playable Slice

## Objective

After Phase 1 owner approval, add a playable arcade kart slice on the approved Comeback City visual direction with acceleration, braking, steering, chase camera follow, boost pad trigger, simple rivals moving ahead, and item box pickup placeholder. Produce desktop and mobile evidence proving a 10-second clip/screenshot sequence reads as a kart race, not a tech demo.

## Parent Goal

Parent: `comeback-city-arcade-kart-rebuild`

Phase 1 approval is recorded at:

- `/Users/andrewferguson/Downloads/comeback-tracker/.agent/runs/comeback-city-arcade-kart-rebuild/evidence/pass-051-owner-approval/owner-approval.md`

## Goal Mode Coupling

Maintain the agent-owned ledger at `/Users/andrewferguson/Downloads/comeback-tracker/.agent/runs/comeback-city-arcade-kart-phase-2-playable-slice` and keep implementation-notes.html current at checkpoints, before compaction, and before final handoff.

## Latest Checkpoint

2026-06-07T22:30:39Z: pass 001 completed the Phase 2 playable proof route. `/#visual-kart-playable` is separate from the approved Phase 1 static route and uses the approved bitmap-first art as its visual base. It adds keyboard acceleration/braking/steering, touch controls, chase-camera motion, boost pad trigger feedback, three moving rivals, item box pickup placeholder, HUD/minimap/GO presentation, and autoplay evidence via `/?playableAutoplay=1#visual-kart-playable`. Evidence is archived under `evidence/pass-001-playable-proof/`, including desktop/mobile screenshot sequences, `desktop-10s.webm`, `desktop-10s-telemetry.json`, `kart-playable-proof-report.json`, `contact-sheet.png`, and `pass-note.md`. Validation passed: `npm run test:kart-proof`, `npm run test:kart-playable`, `npm run build`, and asset manifest parse. Phase 2 goal is complete.

## Finishing Criteria

- A separate Phase 2 playable proof route exists and does not replace or regress the approved Phase 1 static route.
- The playable route visually remains aligned with the approved bitmap-first arcade kart direction.
- Player acceleration, braking, and steering work from keyboard and mobile/touch controls.
- Chase camera follow is visible through route/camera motion.
- Boost pad trigger works and has visible boost feedback.
- 2-3 simple rivals move ahead.
- Item box pickup placeholder works and is visible in HUD.
- Desktop and mobile evidence are saved for the implementation pass.
- A 10-second clip or screenshot sequence reads as a kart race, not a tech demo.
- `npm run build` and focused route validation pass.

## Escape Hatch

Pause, ask the user, or mark a scoped item `[blocked]` / `[incomplete]` if:

- the playable slice starts drifting away from the approved visual direction
- implementation starts modifying the old blocky race scene instead of a separate proof route
- screenshots do not read as an arcade kart race
- validation contradicts the goal
- the goal requires a scope change
- the agent is looping without measurable progress
- the ledger itself contaminates validation
