# Comeback City Asset Pipeline Phase 1

## Objective

Implement the non-destructive asset inventory and manifest foundation for the existing React/Vite/Three.js kart game.

## Scope

Phase 1 only. Do not change race mechanics, track behavior, renderer settings, routes, visual assets, GLB bytes, PNG bytes, model imports, camera behavior, fallback behavior, Unreal setup, Blender automation, Draco, KTX2, optimization, gallery rendering, screenshot baselines, or promotion.

## References

- User-provided Pro synthesis and implementation brief in the Codex conversation on 2026-06-18.
- First Codex task prompt: implement Phase 1 only for `/Users/andrewferguson/Downloads/comeback-tracker`.
- Repository root: `/Users/andrewferguson/Downloads/comeback-tracker`.
- Source root: `3d generations:character sheets`.
- Runtime model root: `src/assets/game/models`.
- Existing manifest: `src/assets/game/asset-manifest.json`.

## Finishing Criteria

- `assets:audit`, `assets:validate`, and `assets:check` package scripts exist.
- Phase 1 pipeline config, README, audit helpers, audit script, and validation script exist.
- Audit recursively finds source and runtime GLB/GLTF files and emits deterministic JSON, CSV, Markdown, run metadata, and `latest-audit.json`.
- Validation retains official glTF validator output and reports specification, structure, manifest, provenance, fallback, hash, and budget findings for runtime assets.
- Source and runtime asset bytes and locations are unchanged.
- Existing build and relevant kart/race/WebGL/visual tests are run or clearly reported if unavailable/failing.
- Final response lists files changed, commands run, test results, known missing provenance, and highest-budget runtime assets.

## Goal Mode Coupling

Maintain the agent-owned ledger at `/Users/andrewferguson/Downloads/comeback-tracker/.agent/runs/comeback-city-asset-pipeline-phase-1/` and keep `implementation-notes.html` current at checkpoints, before compaction, and before final handoff.

## Escape Hatch

Pause, ask the user, or mark a scoped item `[blocked]` / `[incomplete]` if:
- validation contradicts the goal;
- the goal requires a scope change;
- the agent is looping without measurable progress;
- the next step risks deleting or rewriting durable memory;
- the PRD and actual repo disagree;
- the ledger itself contaminates validation.
