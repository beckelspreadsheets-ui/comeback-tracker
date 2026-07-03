# Comeback City Local GLB Approval Promotion

## Objective

Create the current-state Master PRD and ADR for the Comeback City local GLB pipeline, then execute the approval/promotion run from `asset-pipeline/gallery/runs/2026-06-19T16-16-30-254Z__asset-gallery/` in goal mode.

## Scope

- Document the current local GLB intake, candidate, gallery, approval, promotion, validation, and proof pipeline.
- Use the existing gallery run at `asset-pipeline/gallery/runs/2026-06-19T16-16-30-254Z__asset-gallery/`.
- Promote only approved candidates, one asset at a time.
- Validate runtime assets after each promotion.
- Preserve gameplay mechanics and runtime behavior outside approved GLB asset replacement.

## Finishing Criteria

- Master PRD exists and reflects the current implementation state.
- ADR exists and records the local GLB approval/promotion decision.
- Approval records are inspected from the specified gallery run.
- Each approved candidate, if any, is promoted individually with exact source and candidate hash verification.
- Runtime asset validation runs after each individual promotion.
- Required gameplay/proof validation runs after the promotion sequence, if any promotion succeeds.
- Execution stops immediately on source hash mismatch, candidate hash mismatch, budget fail, validator fail, proof fail, or ambiguous approval.
- `implementation-notes.html` is current at checkpoints and final handoff.

## Hard Rules

- Do not guess approval intent.
- Do not promote pending, rejected, duplicate, missing, malformed, or ambiguous approval records.
- Do not batch multiple assets into one promotion command.
- Do not change gameplay mechanics, physics, controls, progression, item logic, rivals, lap logic, route registration, camera behavior, or track-data-driven collision/progress/physics.
- Do not mutate raw source assets.
- Do not relax budgets, validators, proof gates, or hashes to make a promotion pass.
- Stop and report the first hard gate failure.

## References

- Repository root: `/Users/andrewferguson/Downloads/comeback-tracker`
- Gallery run: `/Users/andrewferguson/Downloads/comeback-tracker/asset-pipeline/gallery/runs/2026-06-19T16-16-30-254Z__asset-gallery/`
- Prior visual pipeline ledger: `/Users/andrewferguson/Downloads/comeback-tracker/.agent/runs/comeback-city-visual-pipeline-phases-2-7/`

## Goal Mode Coupling

Maintain the agent-owned ledger at `/Users/andrewferguson/Downloads/comeback-tracker/.agent/runs/comeback-city-local-glb-approval-promotion/` and keep `implementation-notes.html` current at checkpoints, before compaction, and before final handoff.

## Escape Hatch

Pause, ask the user, or mark a scoped item `[blocked]` / `[incomplete]` if:
- validation contradicts the goal;
- the goal requires a scope change;
- the agent is looping without measurable progress;
- the next step risks deleting or rewriting durable memory;
- the PRD and actual repo disagree;
- the ledger itself contaminates validation;
- source or candidate hash verification fails;
- approval records are ambiguous or incomplete.
