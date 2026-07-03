> Handoff prompt: paste this verbatim to the next agent to resume Phase 5 work.

# Penguin Kart VFX — Phase 5 Handoff Prompt

You are resuming work on the Penguin Kart VFX track. **Phase 4 is complete and audio is deferred.** Read this prompt and the linked context reset first, then confirm scope and blockers before writing any code.

## Step 0 — Read first

1. `docs/PENGUIN_KART_VFX_PHASE4_CONTEXT_RESET.md` — current branch, commits, changed files, uncommitted state, screenshots, no-touch files.
2. `docs/PENGUIN_KART_VFX_PHASED_GAMEPLAN.md` — original phased plan. Phase 5 is **V1 production hardening / blocker resolution**.
3. `docs/PENGUIN_KART_VFX_PHASE5_PLAN.md` — detailed Phase 5 task cards, success metrics, and acceptance checklist.
4. `docs/comeback-city-kart-racer-v1-blocker-resolution-prd.md` — source PRD for the blockers to close.
5. `docs/comeback-city-kart-racer-production-readiness-plan.md` — broader production-readiness context.
6. `docs/race-performance-next-pass-plan.md` — FPS optimization sequence and rejected experiments.

## Step 1 — Confirm scope and blockers

Phase 5 per the approved gameplan is **V1 production hardening / blocker resolution**. Before writing code, verify:

- [ ] Has the user explicitly approved starting Phase 5?
- [ ] Has the user confirmed the priority order: owner decisions → desktop FPS → manual QA → fresh-user review → IP/design sign-off?
- [ ] Are there new no-touch files or updated constraints from the user?
- [ ] Does the user want to tackle Phase 2 / Phase 3 VFX first, or proceed with Phase 5 as scoped?

**If owner target/scope decisions are missing, stop and ask for them.** Do not guess visual target, scope, or performance tradeoffs.

## Step 2 — If unblocked, plan

If Phase 5 is approved and owner decisions are available, create a focused Phase 5 execution file at `docs/PENGUIN_KART_VFX_PHASE5_EXECUTION.md` that includes:

- Which blocker you are starting with (default: owner target brief, then FPS baseline).
- Exact files you expect to touch.
- No-touch file compliance check.
- Screenshot/telemetry verification approach for each task.
- One-meaningful-task-per-commit breakdown.

Get explicit user approval on the execution plan before executing.

## Step 3 — Execute with discipline

- Branch: `codex/release-v1-comebacktracker-kart-racer`
- Hard no-touch files from Phase 4 still apply: `kartTuning.js`, `kartPhysics.js`, `surfacePhysics.js`, `airTricks.js`, `heldItems.js`, `rivalRacers.js`, `raceBreakables.js`, `raceCrossers.js`.
- Do not commit pre-existing user changes listed in the Phase 4 context reset.
- One meaningful task per commit.
- Verify each task before moving on.
- For FPS work, change only one variable at a time and capture before/after browser evidence.

## Step 4 — Stop criteria

- Stop if an FPS change requires touching gameplay/physics/item/rival code.
- Stop if a visual tradeoff is proposed without owner/design approval.
- Stop if manual QA or fresh-user review surfaces a blocker that needs design input.
- Stop if the user wants to change scope or defer Phase 5.
- Do not proceed to Phase 6 without explicit user approval.

## Current state at handoff

- Phase 4 status: complete; audio deferred.
- Latest commit: `fc6bbeb2 Theme item box as winter crate`.
- Phase 4 changes are uncommitted (see context reset for list).
- Pre-existing user changes remain uncommitted (see context reset for list).

Ask the user for explicit Phase 5 approval before doing anything else.
