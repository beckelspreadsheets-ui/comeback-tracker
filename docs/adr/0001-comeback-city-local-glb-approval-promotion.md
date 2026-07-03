# ADR 0001: Hash-Locked Local GLB Approval And Promotion

## Decision

Comeback City GLB runtime assets will be promoted through a local, hash-locked approval pipeline. Candidates are generated outside `src/`, reviewed in a rendered gallery, approved through explicit JSON records, and promoted one asset at a time by `scripts/promote-approved-assets.mjs`.

## Context

The current Three.js kart runtime uses a mix of Kenney CC0 models and owner-generated Tripo GLBs. Several runtime GLBs are valid but exceed current runtime budgets. The project needs a promotion path that reduces asset cost without changing gameplay mechanics or silently replacing visual assets.

The implementation already has:

- Source/runtime/candidate root configuration in `asset-pipeline/config/source-roots.json`.
- Runtime asset budgets in `asset-pipeline/config/asset-budgets.json`.
- Runtime asset classification and optimization profiles in `asset-pipeline/config/asset-profiles.json`.
- Stable runtime-copy repair config in `asset-pipeline/config/runtime-repair.json`.
- glTF-Transform and Blender candidate lanes.
- A normalized candidate index.
- A Playwright/Three gallery with hash-checked staged GLBs.
- Runtime and candidate validation with the official glTF validator.
- Production-preview race proof capture and comparison.
- A promotion script that verifies approval, hashes, validation, budget, proof, and promoted bytes.

## Invariants

- Raw source assets are immutable.
- Candidates stay outside `src/` until approved.
- Approval intent must be explicit, not inferred from candidate quality.
- `--apply` promotes exactly one selected asset.
- Source and candidate hashes are checked immediately before promotion.
- Candidate budget `fail` blocks promotion.
- Missing or failed proof blocks promotion.
- Runtime Meshopt support is required because approved candidates may use `EXT_meshopt_compression`.
- Gameplay systems remain data/code driven and are not replaced by visual GLBs.

## Consequences

This decision favors traceability and rollback over speed. A user or reviewer must explicitly approve each candidate, and the agent must stop instead of guessing when the approval file is pending or ambiguous.

The promotion path produces auditable output:

- `asset-pipeline/promotions/runs/<run-id>/promotion-report.json`
- `asset-pipeline/promotions/runs/<run-id>/promotion-report.md`
- `asset-pipeline/promotions/latest-promotion-run.json`
- `asset-pipeline/promotions/promotion-ledger.json`
- updated `src/assets/game/asset-manifest.json` after applied promotion

Because current runtime assets still contain known budget debt, each promotion run should be scoped to an approved asset and followed by runtime validation for the promoted runtime path, plus proof validation after any sequence that changes runtime bytes.

## Alternatives Rejected

- Direct manual replacement in `src/assets/game/models/`: rejected because it bypasses source/candidate hash proof, manifest updates, and promotion ledger history.
- Auto-promote the lowest-budget candidate: rejected because visual approval is a human decision and candidate budgets do not prove silhouette, scale, materials, or grounding.
- Batch promotion: rejected because it makes source hash, candidate hash, runtime validation, and proof failures harder to isolate.
- Keep over-budget runtime assets indefinitely without an approval lane: rejected because the existing game needs a practical way to pay down GLB budget debt.
- Use generated candidate files as gameplay/collision authority: rejected because race physics, route progress, laps, shortcuts, and collisions must remain track-data driven.

## Files To Understand

- `docs/COMEBACK_CITY_LOCAL_GLB_PIPELINE_MASTER_PRD.md`
- `asset-pipeline/README.md`
- `asset-pipeline/config/source-roots.json`
- `asset-pipeline/config/asset-budgets.json`
- `asset-pipeline/config/asset-profiles.json`
- `asset-pipeline/config/blender-decimation.json`
- `asset-pipeline/config/proof-scenarios.json`
- `scripts/optimize-game-glbs.mjs`
- `scripts/blender-decimate-assets.mjs`
- `scripts/build-candidate-index.mjs`
- `scripts/render-asset-gallery.mjs`
- `scripts/validate-game-assets.mjs`
- `scripts/capture-race-proof.mjs`
- `scripts/compare-race-visuals.mjs`
- `scripts/promote-approved-assets.mjs`
- `src/game/race/render/gltfLoader.js`
- `src/assets/game/asset-manifest.json`

## Current Run Record

The 2026-06-19 approval run uses `asset-pipeline/gallery/runs/2026-06-19T16-16-30-254Z__asset-gallery/`. Its approval file currently has 21 pending records and no approved records, so promotion is expected to select zero records and copy zero runtime bytes until the owner edits exactly one approval record.
