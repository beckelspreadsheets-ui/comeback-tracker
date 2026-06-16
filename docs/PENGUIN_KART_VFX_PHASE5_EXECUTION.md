# Penguin Kart VFX — Phase 5 Execution Plan

> Status: pending user approval  
> Branch: `codex/release-v1-comebacktracker-kart-racer`  
> Starting commit: `fafba27b`  
> Build status at start: `npm run build` passes (large-chunk warning only)

## Scope confirmation

Phase 5 = V1 production hardening / blocker resolution per `docs/PENGUIN_KART_VFX_PHASE5_PLAN.md`.

User approved starting Phase 5 on 2026-06-16. Owner target/scope decisions are already filled in `docs/race-visual-target-brief.md` and `docs/race-owner-review-packet.md`, so Task 1 is verification-only, not a blocker.

## No-touch file compliance

Hard no-touch files (do not modify):

- `src/game/race/physics/kartTuning.js`
- `src/game/race/physics/kartPhysics.js`
- `src/game/race/physics/surfacePhysics.js`
- `src/game/race/airTricks.js`
- `src/game/race/heldItems.js`
- `src/game/race/rivalRacers.js`
- `src/game/race/raceBreakables.js`
- `src/game/race/raceCrossers.js`

Also avoid gameplay, physics, item behavior, rival behavior, track collision, balance, audio wiring, and visual-resolution tradeoffs without explicit owner/design approval.

## Pre-existing user changes (do not commit)

The following files are modified in the working tree but belong to pre-existing user work. I will not commit them unless you explicitly approve:

- `scripts/api-data-smoke-test.mjs`
- `src/game/race/camera/chaseCamera.js`
- `src/game/race/physics/kartPhysics.js`
- `src/game/race/racePlayerFrame.js`
- `src/game/race/raceProgress.js`
- `src/game/race/raceRivals.js`
- `src/game/race/raceState.js`
- `src/game/race/raceUpdateRuntime.js`
- `src/game/race/rivalRacers.js`
- `src/game/race/track/trackGeometry.js`

Phase 4 agent changes are also uncommitted; I will commit only the Phase 5 task files per the commit strategy below.

## Task-by-task progress

| Task | Status |
|---|---|
| Task 1 — Verify owner target/scope brief | Done: decisions present in `docs/race-visual-target-brief.md` and `docs/race-owner-review-packet.md` |
| Task 2 — Fresh desktop FPS baseline | Done: baseline captured at `tmp/phase5-baseline/phase5-baseline-summary.json` |
| Task 3 — Controlled FPS optimization | Pending |
| Task 4 — Manual QA capture | Pending |
| Task 5 — Fresh-user review | Pending |
| Task 6 — IP/provenance and design sign-off | Pending |
| Task 7 — Automation re-run | Pending |

## Current blocker / environment note

`npm run test:race:browser` does **not** complete in this local environment. It successfully runs:
- all 24 core-loop races,
- sustained normal-play capture,
- no-minimap lap readability capture,
- 7 desktop visual snapshots (idle, driving, acceleration, braking, reverse, steering-low-speed, steering-high-speed),

and then times out on the `opening-sequence` visual snapshot `page.waitForFunction` even with `RACE_VISUAL_READY_TIMEOUT_MS=60000`. The same `opening-sequence` scenario passes in isolation with a fresh dev server and fresh browser, so this appears to be a cumulative environment/infra issue rather than a race-code regression.

Impact:
- Task 2 baseline was captured from the partial run artifacts.
- Task 3 optimization will use `npm run test:race` + focused manual Playwright captures for before/after evidence instead of relying on the full browser suite.
- Task 7 automation re-run will attempt the full suite again; if it still fails, the timeout will be documented as an environment blocker separate from any Phase 5 code changes.

Mitigation:
- Re-run `npm run test:race:browser` after each FPS change attempt; if it still times out at the same point, use the partial-run sustained telemetry and individual scenario captures as evidence.
- Do not claim the full browser gate passes until the suite completes.

## Task-by-task plan

### Task 1 — Verify owner target/scope brief

- **Files touched:** `docs/PENGUIN_KART_VFX_PHASE5_EXECUTION.md` (this file), possibly `docs/race-visual-target-brief.md` if a link needs updating.
- **Goal:** Confirm `docs/race-visual-target-brief.md` has no `Not supplied` values for V1-required fields.
- **Current state:** Owner decisions are recorded; IP/naming direction, scope, and target reference are supplied.
- **Verification:** Read `docs/race-visual-target-brief.md` and `docs/race-owner-review-packet.md`; record that V1-required fields are filled.
- **Screenshot/telemetry:** N/A; document-only.
- **Commit:** `Document owner-approved V1 visual target and scope verification`

### Task 2 — Fresh desktop FPS baseline and scene budget

- **Status:** Done — baseline captured from partial `npm run test:race:browser` run; full suite times out in this environment after 7 successful desktop visual snapshots.
- **Files touched:** `docs/PENGUIN_KART_VFX_PHASE5_BASELINE.json` (committed summary), `docs/PENGUIN_KART_VFX_PHASE5_EXECUTION.md`, and evidence in `.agent/runs/kart-racer-production-readiness/evidence/phase5-baseline-20260616/` (gitignored).
- **Goal:** Capture fresh focused + sustained desktop FPS, frame work/render times, renderer calls/triangles/programs/textures, and scene budget counts.
- **Preservation gates:** kart size, road-ahead coverage, visible rivals ≥3, HUD overlap, route lookahead, camera clip count = 0, drift, boost, item pickup, reduced motion, audio mute, WebGL fallback.
- **Acceptance:** `npm run test:race` and `npm run build` pass; baseline recorded with timestamp and evidence path. `npm run test:race:browser` does not complete in this environment due to a cumulative timeout on the `opening-sequence` visual snapshot (see blocker note below); partial artifacts are preserved.
- **Baseline results:**
  - Captured at: `2026-06-16T21:16:11.807Z`
  - Branch/commit: `codex/release-v1-comebacktracker-kart-racer` / `ccc4b95d`
  - Sustained normal play (`raceNoFinish=1`, lap 2, normalized speed ~0.667):
    - `actualFps.average`: **22.69** (min 20.8, max 26.2)
    - `deliveredFps`: **21.03**
    - `frameElapsedMs.average`: **52.9**
    - `frameWorkMs.average`: **1.6**
    - Renderer: **313 calls**, **59976 triangles**, **8 programs**, **19 textures**
    - Scene budget: **881 objects**, **737 meshes**, **173 instanced meshes**, **251 materials**, **79266 triangles**
      - track: 260 objects, 235 meshes, 43338 triangles
      - scenery: 310 objects, 266 meshes, 23944 triangles
      - rivals/player: 188 objects, 148 meshes, 6968 triangles
      - pickups: 118 objects, 88 meshes, 5016 triangles
      - vfx: 27 objects, 22 meshes, 1396 triangles
  - Focused desktop states (from partial visual snapshots):
    - idle: actualFps **34.4**, kart height ratio **0.16**, roadAheadCoverage **1.0**, visibleRivals **3**, clipCount **0**
    - driving: actualFps **35.9**, kart height ratio **0.212**, roadAheadCoverage **1.0**, visibleRivals **3**, clipCount **0**
- **Evidence path:** `.agent/runs/kart-racer-production-readiness/evidence/phase5-baseline-20260616/phase5-baseline-summary.json`
- **Committed summary:** `docs/PENGUIN_KART_VFX_PHASE5_BASELINE.json`
- **Screenshot/telemetry:** `.agent/runs/kart-racer-production-readiness/evidence/phase5-baseline-20260616/sustained-normal-play-comeback-city.telemetry.json`, `visual-comeback-city-desktop-*.telemetry.json`, and corresponding PNGs.
- **Commit:** `Capture Phase 5 desktop FPS baseline and scene budget`

### Task 3 — Controlled FPS optimization pass

- **Files expected to touch:** `src/game/race/render/createRaceScenery.js`, possibly `src/game/race/render/createRaceScene.js` for far-range/material constants.
- **Goal:** Implement one controlled optimization at a time from the allowed categories in `docs/race-performance-next-pass-plan.md`:
  - far-skyline/perimeter prop LOD,
  - repeated rail/sign/barrier detail beyond readability distance,
  - decorative props outside the first 30-second teaching view,
  - material/program consolidation that preserves district identity.
- **Approach:**
  1. Read `createRaceScenery.js` fully and identify the highest-count decorative/repeated categories.
  2. Pick one variable (e.g., reduce far-perimeter building window density, omit distant tree clusters, or batch a repeated sign/rail type into an existing instanced path).
  3. Implement the change behind a named constant/export so the content test can assert the value.
  4. Run `npm run test:race` and `npm run test:race:browser`.
  5. Compare before/after focused desktop FPS, sustained normal-play FPS, frame work, render phase, calls, triangles, and scene budget.
  6. Keep only if product-relevant FPS improves without regressing preservation gates; otherwise revert.
  7. Repeat with a different variable only after the first is kept or reverted.
- **Rejected approaches (will not retry without new evidence):** global track batching, larger clean-track chunks, renderer resize-loop changes, shoulder-underlay replacement, antialias disable, desktop render-scale reduction, HUD transition scheduling, draw-call-only wins that worsen actual FPS.
- **Acceptance:** before/after browser summary shows product-relevant FPS improvement; all preservation gates pass; no-touch files untouched.
- **Screenshot/telemetry:** Desktop idle/driving/drift/boost screenshots from `npm run test:qa:capture` or browser harness; telemetry summary with before/after delta.
- **Commit:** one commit per tested optimization variable, e.g. `Reduce far-perimeter window density` or `Instance distant decorative prop kind X`.

**Realistic note:** The current render scale is already `0.58` desktop / `0.6` mobile and fog/camera far is already `580`, so low-hanging resolution/culling changes are largely exhausted. I will only keep an optimization if it moves focused and/or sustained actual FPS up without countervailing regressions.

### Task 4 — Manual QA capture

- **Files touched:** `docs/race-manual-qa-rubric.md` (update result record section), new dated desktop/mobile result files under `.agent/runs/kart-racer-production-readiness/evidence/manual-qa-results-<date>/`.
- **Goal:** Produce QA capture artifacts (screenshots, silent clip, telemetry) using `npm run test:qa:capture` and prepare blank result files for owner scoring.
- **Owner action required:** You must play the desktop (Brave/Mac mini M4) and mobile (Safari/iPhone 16 Pro) routes and fill scores. I cannot sign off rubric categories for you.
- **Acceptance:** `npm run test:qa:capture` passes; result files exist with prefilled evidence paths and empty score fields.
- **Screenshot/telemetry:** Attach `manual-qa-capture-summary.json`, desktop idle/speed/drift screenshots, mobile driving screenshot, and 10 s silent clip.
- **Commit:** `Add Phase 5 manual QA capture artifacts and result templates`

### Task 5 — Fresh-user review

- **Files touched:** `docs/race-fresh-user-review-template.md` (create), dated review evidence file.
- **Goal:** Create a template for the 10-second silent clip review and record the prompt/acceptance criteria.
- **Owner action required:** You (or a fresh reviewer you designate) must watch the clip and answer the prompt. If you are the reviewer, note that owner-only QA sign-off is already approved but the answer must still be recorded.
- **Acceptance:** Template exists; pass condition is reviewer identifies a kart race/racing game or close equivalent.
- **Screenshot/telemetry:** Clip path from Task 4; reviewer answer recorded.
- **Commit:** `Add fresh-user first-impression review template`

### Task 6 — IP/provenance and product/design sign-off

- **Files touched:** `docs/race-ip-provenance-audit.md` (final pre-release scan update), `docs/race-visual-target-brief.md` (design sign-off section if needed), new sign-off record file.
- **Goal:**
  1. Re-run the prohibited-term/source scan and final live-race import scan.
  2. Confirm no new unreviewed binary images/audio are imported by `src/game/ArcadeRace3D.jsx` or `src/game/race/**`.
  3. Record current `src/assets/game/**` hashes if any files changed.
  4. Prepare a product/design review checklist for first 30 seconds, route clarity, landmarks, HUD, camera, drift, and mechanic feedback.
- **Owner action required:** You must perform or delegate the product/design review and IP/provenance sign-off. I can produce the checklist and scan results, but I cannot sign off on your behalf.
- **Acceptance:** Review outcome recorded as approved, rename/re-skin required, remove asset, or needs legal follow-up; required changes ticketed.
- **Screenshot/telemetry:** Scan command output; updated inventory/hashes; checklist file.
- **Commit:** `Record V1 IP and design review sign-off prep`

### Task 7 — Automation re-run and PR evidence

- **Files touched:** `docs/PENGUIN_KART_VFX_PHASE5_EXECUTION.md` (record final results), possibly `docs/race-v1-definition-of-done-checklist.md` if rows can move to `Proven`.
- **Goal:** Run `npm run build`, `npm run test:race`, `npm run test:race:browser`, `npm run test:visual`, `npm run test:lab`, and `npm run test:bundle`; attach evidence.
- **Acceptance:** All relevant automated checks pass.
- **Screenshot/telemetry:** Command outputs and summary JSON paths.
- **Commit:** `Re-run V1 automated gates and attach evidence`

## Stop criteria

I will stop and ask you before continuing if:

- An FPS change requires touching gameplay/physics/item/rival code.
- A visual tradeoff is proposed without your/design approval.
- Manual QA or fresh-user review surfaces a blocker that needs design input.
- A tested optimization does not improve product-relevant FPS or regresses preservation gates.
- You want to change scope, defer Phase 5, or tackle Phase 2/3 VFX first.

## Commit strategy

One meaningful task per commit:

1. `Document owner-approved V1 visual target and scope verification`
2. `Capture Phase 5 desktop FPS baseline and scene budget`
3. `<one commit per kept FPS optimization variable>`
4. `Add Phase 5 manual QA capture artifacts and result templates`
5. `Add fresh-user first-impression review template`
6. `Record V1 IP and design review sign-off prep`
7. `Re-run V1 automated gates and attach evidence`

## First action if approved

Run `npm run test:race:browser` to capture the fresh Phase 5 desktop FPS baseline and scene budget, then record the result in this file.
