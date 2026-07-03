# Penguin Kart VFX — Phase 5 Plan

> Status: pending user approval  
> Goal: Close the remaining V1 production blockers so the kart racer can be signed off.

## Phase 5 Scope

Phase 5 is the first production-hardening phase after VFX and deferred audio. It focuses on the blockers listed in `docs/comeback-city-kart-racer-v1-blocker-resolution-prd.md`:

1. Owner target/scope decisions
2. Desktop FPS optimization
3. Manual desktop/mobile QA evidence
4. Fresh-user first-impression review
5. IP/provenance sign-off
6. Product/design review

This phase closes the gap between "feature complete" and "production sign-off complete." It is not about adding new tracks, items, or modes.

## Non-Goals

- Do not add multiplayer.
- Do not expand tracks before Comeback City GP / Penguin Village is signed off.
- Do not add a progression economy to hide race-quality issues.
- Do not copy protected kart-racer characters, tracks, item designs, names, UI layouts, sounds, music, or art.
- Do not lower resolution, object density, or camera readability just to pass a metric unless product/design explicitly accepts the tradeoff.
- Do not modify gameplay, physics, item behavior, rival behavior, track collision, or balance unless explicitly in scope.

## Hard No-Touch Files

- `src/game/race/physics/kartTuning.js`
- `src/game/race/physics/kartPhysics.js`
- `src/game/race/physics/surfacePhysics.js`
- `src/game/race/airTricks.js`
- `src/game/race/heldItems.js`
- `src/game/race/rivalRacers.js`
- `src/game/race/raceBreakables.js`
- `src/game/race/raceCrossers.js`

## Success Metrics

| Metric | Target |
|---|---|
| Owner target brief | Approved and filled in `docs/race-visual-target-brief.md` |
| Desktop focused FPS | Every normal desktop focused state at or above agreed local floor; target remains PRD `55` unless changed by owner |
| Sustained desktop capture | Supports focused FPS result and records budget misses |
| Desktop manual QA | Full race completed by keyboard with notes |
| Mobile manual QA | Touch first lap completed; full race preferred |
| Manual QA rubric | Every category `4+` |
| Fresh-user read | Reviewer identifies a kart race/racing game or close equivalent |
| IP/provenance | Owner/design/legal review signs off or records required changes |
| Product/design review | First 30 seconds, route clarity, landmarks, HUD, camera, drift, feedback, and overall read approved |
| Automation | `npm run build`, `npm run test:race`, and `npm run test:race:browser` pass after changes |

## Task Cards

### Task 1: Owner target/scope intake

- **File:** `docs/race-visual-target-brief.md` (create or fill)
- **Inputs:** `docs/race-owner-review-packet.md`, `docs/comeback-city-kart-racer-v1-blocker-resolution-prd.md`
- **Goal:** Get explicit owner decisions for:
  - Target screenshot/capture source and license.
  - Desktop vs mobile priority.
  - Kart-only V1 versus retained hover/plane modes.
  - Item and audio scope.
  - Standalone versus city-progression scope.
  - Mobile performance target device/profile.
  - HUD direction.
- **Acceptance:** No `Not supplied` values remain for V1-required fields.
- **Commit:** `Document owner-approved V1 visual target and scope`

### Task 2: Desktop FPS baseline and scene budget

- **Files:** `src/game/ComebackCityThreeKartRace.jsx`, `src/game/race/render/createRaceScene.js`, `src/game/race/render/createRaceScenery.js`, telemetry code as needed
- **Goal:** Establish a fresh FPS baseline and capture scene-budget telemetry.
- **Preservation gates:** kart size, road-ahead coverage, visible rivals, HUD overlap, route lookahead, camera clip count, drift, boost, item pickup, reduced motion, audio mute, WebGL fallback.
- **Acceptance:** `npm run test:race`, `npm run test:race:browser`, and `npm run build` pass.
- **Commit:** `Capture Phase 5 desktop FPS baseline and scene budget`

### Task 3: Controlled FPS optimization pass

- **Files:** render/scenery files, scene runtime, telemetry
- **Goal:** Implement one controlled optimization at a time from `docs/race-performance-next-pass-plan.md`.
- **Allowed areas:** far-skyline/perimeter prop LOD, repeated rail/sign/barrier detail beyond readability distance, decorative props outside first 30-second teaching view, material/program consolidation.
- **Rejected approaches (do not retry without new evidence):** global track batching, larger clean-track chunks, renderer resize-loop changes, shoulder-underlay replacement, antialias disable, desktop render-scale reduction, HUD transition scheduling, draw-call-only wins that worsen actual FPS.
- **Acceptance:** before/after browser summary shows product-relevant FPS improvement; all preservation gates pass.
- **Commit:** one commit per tested optimization variable

### Task 4: Manual QA capture

- **Files:** `docs/race-manual-qa-rubric.md`, `scripts/manual-qa-capture.mjs`, new QA result files in `tmp/`
- **Goal:** Run desktop keyboard and mobile touch playthroughs; capture notes and screenshots/video.
- **Acceptance:** Every rubric category scores `4+`; gaps are recorded as new tickets.
- **Commit:** `Add Phase 5 manual QA evidence`

### Task 5: Fresh-user review

- **Files:** `docs/race-fresh-user-review-template.md` (create if missing), evidence files in `tmp/`
- **Goal:** Show a 10-second silent clip to a fresh reviewer and record whether they identify it as a kart race.
- **Acceptance:** Reviewer gives a kart-race or close-equivalent read.
- **Commit:** `Add fresh-user first-impression review evidence`

### Task 6: IP/provenance and product/design sign-off

- **Files:** `docs/race-ip-provenance-audit.md`, `docs/race-visual-target-brief.md`, review notes
- **Goal:** Complete item-name review, binary asset provenance sign-off, and product/design review for first 30 seconds, route clarity, landmarks, HUD, camera, drift, and mechanic feedback.
- **Acceptance:** Sign-off recorded or required changes ticketed.
- **Commit:** `Record V1 IP and design review sign-off`

### Task 7: Automation re-run and PR evidence

- **Goal:** Run `npm run build`, `npm run test:race`, `npm run test:race:browser`, `npm run test:visual`, `npm run test:lab`, `npm run test:bundle` and attach evidence.
- **Acceptance:** All relevant automated checks pass.
- **Commit:** `Re-run V1 automated gates and attach evidence`

## Stop Criteria

- Stop if owner scope/target decisions are missing.
- Stop if an FPS change requires touching no-touch gameplay/physics files.
- Stop if a visual tradeoff is proposed without owner/design approval.
- Stop if manual QA or fresh-user review surfaces a blocker that needs design input.
- Do not proceed to Phase 6 without explicit user approval.

## Acceptance Checklist

- [ ] Owner target brief approved and complete.
- [ ] Desktop focused FPS at or above agreed floor.
- [ ] Sustained normal-play FPS recorded and not regressing.
- [ ] Desktop manual QA completed with notes.
- [ ] Mobile manual QA completed with notes.
- [ ] Manual QA rubric every category `4+` or ticketed.
- [ ] Fresh-user review completed.
- [ ] IP/provenance sign-off recorded.
- [ ] Product/design review recorded.
- [ ] `npm run build`, `npm run test:race`, `npm run test:race:browser` pass.

## Commit Strategy

One meaningful task per commit after evidence approval.

1. `Document owner-approved V1 visual target and scope`
2. `Capture Phase 5 desktop FPS baseline and scene budget`
3. `<one commit per tested FPS optimization>`
4. `Add Phase 5 manual QA evidence`
5. `Add fresh-user first-impression review evidence`
6. `Record V1 IP and design review sign-off`
7. `Re-run V1 automated gates and attach evidence`

Do not batch unrelated evidence or optimization changes into one commit.
