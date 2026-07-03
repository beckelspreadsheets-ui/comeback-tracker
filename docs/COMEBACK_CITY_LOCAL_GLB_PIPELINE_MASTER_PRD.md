# Comeback City Local GLB Pipeline Master PRD

## Objective

Maintain a local, hash-locked GLB pipeline for Comeback City race runtime assets. The pipeline must generate optimized candidates, render a human-review gallery, promote only explicitly approved candidates one asset at a time, and preserve gameplay mechanics.

## Current Implementation State

This PRD reflects the repository state on 2026-06-19.

The current runtime is the Three.js kart route at `/#race` with `data-race-renderer="three-kart"` and visual telemetry reporting `visualAssetSet: comeback-city-v2-three-runtime`. Runtime GLBs load through `src/game/race/render/gltfLoader.js`, which registers Three's Meshopt decoder so promoted `EXT_meshopt_compression` candidates can load in-game.

The pipeline roots are:

- `3d generations:character sheets/`: immutable legacy source GLB root.
- `asset-pipeline/raw/`: immutable pipeline intake and stable runtime-copy cache.
- `asset-pipeline/working/optimized/`: glTF-Transform candidate output.
- `asset-pipeline/working/blender-decimate/`: local Blender decimation candidate output.
- `asset-pipeline/working/candidates/latest-candidate-index.json`: normalized candidate index used by gallery, validation, and promotion.
- `asset-pipeline/gallery/runs/`: gallery and approval run output.
- `asset-pipeline/proof/runs/`: desktop/mobile race proof output.
- `asset-pipeline/promotions/runs/`: promotion reports.
- `src/assets/game/models/`: promoted runtime GLB root.
- `src/assets/game/asset-manifest.json`: runtime provenance and promotion metadata.

## Product Requirements

### Candidate Generation

The pipeline must create candidates outside `src/` and must not mutate source or runtime GLBs during candidate generation.

Required commands:

```bash
npm run assets:optimize -- --ladder
npm run assets:decimate
npm run assets:candidates
```

`scripts/optimize-game-glbs.mjs` uses glTF-Transform 4.4 and Meshopt to produce profile-ladder candidates for runtime paths. `scripts/blender-decimate-assets.mjs` uses local Blender plus `scripts/blender/targeted-decimate.py` for topology-heavy runtime-copy assets. Both scripts record source hashes, config hashes, output hashes, metrics, tool versions, and budget status.

### Gallery Review

The gallery must render source, runtime, candidate, and V2 reference views before any promotion.

Required command:

```bash
npm run assets:gallery
```

The gallery fails on missing asset files, hash mismatch in the viewer, render error, console/page error, or blank screenshot. The approval template starts every candidate as:

```json
{
  "decision": "pending",
  "approvedForPromotion": false
}
```

Human approval requires exactly one candidate record per target asset to be changed to:

```json
{
  "decision": "approved",
  "approvedForPromotion": true
}
```

### Promotion

Promotion must copy exactly one approved candidate into one runtime path per apply command.

Required command shape:

```bash
npm run assets:promote -- --approval <approval-template.json>
npm run assets:promote -- --apply --approval <approval-template.json> --asset <assetId>
```

`scripts/promote-approved-assets.mjs` must block promotion unless all of these are true:

- The selected approval record has `decision: "approved"` and `approvedForPromotion: true`.
- `--apply` selects exactly one asset.
- The current source file hash equals `sourceHash` in the approval record.
- The current candidate file hash equals `candidateHash` in the approval record.
- Latest candidate validation has status `pass` or `warn` for the candidate.
- Candidate budget status is not `fail`.
- Latest proof comparison exists and reports `ok: true`.
- Promoted runtime bytes equal the approved candidate hash after copy.

After a successful promotion, the script updates `src/assets/game/asset-manifest.json` with source hash, output hash, asset ID, asset class, promotion metadata, proof path, and runtime transform metadata. It also appends `asset-pipeline/promotions/promotion-ledger.json`.

### Validation And Proof

Runtime validation is required after each successful promotion. Proof is required before promotion and after any promotion sequence that changes runtime bytes.

Required commands:

```bash
npm run assets:validate -- --scope candidates
npm run assets:validate -- --scope runtime
npm run test:track-visuals
npm run build
npm run test:race
npm run test:kart-playable
npm run test:race-proof
```

`scripts/validate-game-assets.mjs` runs parser checks, the official glTF validator, structural checks, manifest coverage checks, and configured budgets. `scripts/capture-race-proof.mjs` captures desktop/mobile screenshots, videos, telemetry, top-down proof, renderer facts, and network/console health. `scripts/compare-race-visuals.mjs` gates nonblank screenshots, motion, video output, renderer identity, route progress, FPS, draw calls, triangles, transfer bytes, prop count, fallback renderer absence, and visual asset set.

## Current Gallery Run

The approval/promotion run for this PRD uses:

```text
asset-pipeline/gallery/runs/2026-06-19T16-16-30-254Z__asset-gallery/
```

Current gallery state:

- 6 asset groups.
- 21 candidate approval records.
- 21 `pending` decisions.
- 0 approved records.
- 0 records with `approvedForPromotion: true`.

Latest candidate validation for the gallery candidates:

- Run: `asset-pipeline/audit/2026-06-19T16-15-43-706Z__asset-validation__candidates/validation.json`
- Files: 21.
- Official validator pass: 21.
- Budget pass: 2.
- Budget warn: 7.
- Budget fail: 12.

Promotion-eligible candidates after approval are the records with candidate budget `pass` or `warn`; hard-budget `fail` candidates remain blocked even if someone marks them approved.

## Stop Conditions

Stop immediately and do not promote or continue if any of these occur:

- Source hash mismatch.
- Candidate hash mismatch.
- Candidate budget `fail`.
- glTF parser failure.
- Official glTF validator failure.
- Gallery proof failure.
- Race proof failure.
- Missing proof comparison.
- Missing or unreadable approval record.
- More than one selected record for one `--apply` run.
- Record is pending, rejected, malformed, duplicated, or ambiguous.
- Runtime validation fails for the promoted asset.
- Gameplay, route, renderer, telemetry, or proof behavior changes outside approved GLB replacement.

## Gameplay Preservation

The local GLB pipeline must not change race mechanics. These are protected:

- Physics and steering.
- Controls and input mapping.
- Progress, laps, finish, restart, and route registration.
- Item logic and boost logic.
- Rival behavior.
- Default chase camera behavior.
- Track-data-driven collision, progress, and physics.
- Runtime fallback behavior except for manifest/provenance metadata changes tied to promoted assets.

## Acceptance Criteria

The pipeline is acceptable when:

- Candidate generation is reproducible from source hash, config hash, and tool versions.
- Gallery render output is nonblank and hash-verified.
- Approval data unambiguously identifies each promoted candidate.
- Promotion copies only one approved candidate per apply command.
- Runtime bytes match the approved candidate hash after promotion.
- Manifest and promotion ledger record the source, candidate, proof, and approval paths.
- Runtime asset validation passes for each promoted asset.
- Race proof passes after runtime-byte changes.
- `/#race` remains the Three.js kart runtime and gameplay mechanics are preserved.

## Current Known Debt

The 2026-06-19 gallery has no approved candidates, so no runtime-byte promotion is currently authorized.

Current runtime validation still reports six hard-budget failures in existing runtime GLBs:

- `src/assets/game/models/avatars/layer23-penguin.glb`
- `src/assets/game/models/avatars/mizzle.glb`
- `src/assets/game/models/avatars/tclow-penguin.glb`
- `src/assets/game/models/tripo/ice-sled.glb`
- `src/assets/game/models/toy-car-kit/item-banana.glb`
- `src/assets/game/models/toy-car-kit/item-cone.glb`

These remain pending until explicit approval selects budget-pass or budget-warn candidates for one-at-a-time promotion.

## Out Of Scope

- Auto-approval.
- Batch promotion.
- Raw source mutation.
- Replacing gameplay systems with authored visual GLBs.
- Relaxing budgets, proof gates, or validator gates.
- Direct manual copying into `src/assets/game/models/` outside `scripts/promote-approved-assets.mjs`.
