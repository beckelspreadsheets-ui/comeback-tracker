# Comeback City Visual Pipeline Phases 2-7

## Objective

Implement the Comeback City visual pipeline Phases 2-7 from `docs/COMEBACK_CITY_VISUAL_PIPELINE_PHASES_2_7_GOAL.md`, preserving gameplay mechanics and validating at every phase gate.

## Scope

- Phase 2: repair and optimize GLB candidates without promotion.
- Phase 3: asset preview gallery and approval template.
- Phase 4: additive visual track schema and procedural visual kit support.
- Phase 5: first runtime Comeback City visual upgrade.
- Phase 6: automated desktop/mobile screenshot and video proof.
- Phase 7: controlled promotion tooling and approved promotion only.

## References

- Goal contract: `/Users/andrewferguson/Downloads/comeback-tracker/docs/COMEBACK_CITY_VISUAL_PIPELINE_PHASES_2_7_GOAL.md`
- Repository root: `/Users/andrewferguson/Downloads/comeback-tracker`
- Phase 1 ledger: `/Users/andrewferguson/Downloads/comeback-tracker/.agent/runs/comeback-city-asset-pipeline-phase-1/`

## Finishing Criteria

- `/#race` still works and remains `data-race-renderer="three-kart"`.
- Existing gameplay mechanics still pass.
- Runtime GLBs are valid, classified, budgeted, hashed, and linked to provenance/proof.
- Comeback City has visibly improved runtime graphics.
- Desktop and mobile screenshots/videos prove the upgraded visuals.
- No unexpected fallback assets are used in the proof route.
- Final handoff lists promoted assets, remaining candidates, test results, proof paths, known debt, and next recommended phase.
- `implementation-notes.html` is updated after every phase boundary, validation result, blocker, and final handoff.

## Hard Rules

- Preserve race mechanics, physics, controls, progression, item logic, rivals, lap logic, route registration, and default camera behavior.
- Do not overwrite, move, delete, or mutate raw source assets.
- Do not use Unreal MCP, Seedance, Draco, KTX2, or Blender automation in Phases 2-7 unless the owner explicitly adds that scope later.
- Do not promote any candidate asset until gallery, proof, validation, and approval gates exist.
- Every phase must end with validation results and an `implementation-notes.html` update.
- If a phase cannot pass, stop, document the blocker, and ask for direction.
- Keep generated candidates and proof output outside `src/` until controlled promotion.
- Runtime collision, progress, laps, shortcuts, and physics remain driven by track data, not authored visual GLBs.

## Goal Mode Coupling

Maintain the agent-owned ledger at `/Users/andrewferguson/Downloads/comeback-tracker/.agent/runs/comeback-city-visual-pipeline-phases-2-7/` and keep `implementation-notes.html` current at checkpoints, before compaction, and before final handoff.

## Escape Hatch

Pause, ask the user, or mark a scoped item `[blocked]` / `[incomplete]` if:
- validation contradicts the goal;
- the goal requires a scope change;
- the agent is looping without measurable progress;
- the next step risks deleting or rewriting durable memory;
- the PRD and actual repo disagree;
- the ledger itself contaminates validation;
- a phase cannot pass its acceptance gate.
