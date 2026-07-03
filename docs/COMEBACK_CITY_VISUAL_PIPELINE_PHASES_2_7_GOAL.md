# Comeback City Visual Pipeline Goal: Phases 2-7

Use this file as the full goal contract when the goal text box is too small.

## Short Goal Text To Paste

```text
Implement the Comeback City visual pipeline Phases 2-7 from docs/COMEBACK_CITY_VISUAL_PIPELINE_PHASES_2_7_GOAL.md. Preserve gameplay mechanics, keep implementation-notes.html updated at every phase gate, and stop at any blocker instead of skipping validation.
```

## Repository

```text
/Users/andrewferguson/Downloads/comeback-tracker
```

## Goal Ledger Path

```text
/Users/andrewferguson/Downloads/comeback-tracker/.agent/runs/comeback-city-visual-pipeline-phases-2-7/
```

The agent should create and maintain:

- `.agent/runs/comeback-city-visual-pipeline-phases-2-7/GOAL.md`
- `.agent/runs/comeback-city-visual-pipeline-phases-2-7/implementation-notes.html`

`implementation-notes.html` must be updated after every phase boundary, validation result, blocker, and final handoff.

## Context

Phase 1 is complete. It added the non-destructive asset inventory and validation foundation.

Current Phase 1 findings:

- 7 source GLBs were found under `3d generations:character sheets`.
- 14 runtime GLBs were found under `src/assets/game/models`.
- Strict runtime checks currently fail because the runtime asset set has budget, validator, manifest, hash, and missing texture issues.
- `layer23-penguin.glb`, `mizzle.glb`, `ice-sled.glb`, and `tclow-penguin.glb` are the highest-budget runtime offenders.
- Seven Kenney toy-car GLBs reference missing `Textures/colormap.png`.
- Manifest drift exists: `layer23-penguin.glb` and `tclow-penguin.glb` are runtime files without manifest records; the manifest references missing `crrt-penguin.glb`.

Relevant existing Phase 1 files:

- `asset-pipeline/README.md`
- `asset-pipeline/config/source-roots.json`
- `asset-pipeline/config/asset-budgets.json`
- `asset-pipeline/config/asset-profiles.json`
- `asset-pipeline/config/manifest-schema.md`
- `scripts/audit-game-assets.mjs`
- `scripts/validate-game-assets.mjs`
- `scripts/lib/*`
- `.agent/runs/comeback-city-asset-pipeline-phase-1/implementation-notes.html`

## Primary Objective

Turn the existing working Three.js kart game into a visibly upgraded runtime by implementing the researched asset and track pipeline.

The final result must improve the actual `/#race` runtime visuals, not only produce reports.

## Hard Rules

- Preserve race mechanics, physics, controls, progression, item logic, rivals, lap logic, route registration, and default camera behavior.
- Do not overwrite, move, delete, or mutate raw source assets.
- Do not use Unreal MCP, Seedance, Draco, KTX2, or Blender automation in Phases 2-7 unless the owner explicitly adds that scope later.
- Do not promote any candidate asset until gallery, proof, validation, and approval gates exist.
- Every phase must end with validation results and an `implementation-notes.html` update.
- If a phase cannot pass, stop, document the blocker, and ask for direction.
- Keep generated candidates and proof output outside `src/` until controlled promotion.
- Runtime collision, progress, laps, shortcuts, and physics remain driven by track data, not authored visual GLBs.

## Phase 2: Repair And Optimize GLB Candidates

### Objective

Repair the current asset validation path, add Meshopt-aware runtime loading, and generate optimized candidates without promoting them.

### Work

- Inspect Phase 1 reports before editing.
- Resolve or document the missing `Textures/colormap.png` issue for Kenney GLBs without changing gameplay behavior.
- Add centralized Meshopt-aware `GLTFLoader` support.
- Implement `scripts/optimize-game-glbs.mjs`.
- Use glTF-Transform 4.4 APIs explicitly.
- Generate candidates under `asset-pipeline/working/optimized/`.
- Start with the highest-impact over-budget runtime assets:
  - `src/assets/game/models/avatars/layer23-penguin.glb`
  - `src/assets/game/models/avatars/mizzle.glb`
  - `src/assets/game/models/tripo/ice-sled.glb`
  - `src/assets/game/models/avatars/tclow-penguin.glb`
- Do not promote any candidate into runtime paths.

### Acceptance

- Candidate generation is reproducible from source hash, config hash, and tool versions.
- Candidates parse and validate.
- Candidates report before/after bytes, triangles, vertices, materials, textures, and budget status.
- Current `/#race` behavior remains unchanged unless only loader compatibility hooks were added.

## Phase 3: Asset Preview Gallery

### Objective

Create a neutral visual review system so source, candidate, runtime, and V2 references can be compared before promotion.

### Work

- Implement `scripts/render-asset-gallery.mjs`.
- Build a temporary Vite/Three.js gallery entry outside runtime app code.
- Render fixed front, side, rear, and top views.
- Include metrics and exact hashes under each tile.
- Generate contact sheets with V2 reference images.
- Add an approval JSON template.

### Acceptance

- Gallery fails on blank render, load error, console exception, decoder error, or hash mismatch.
- Reviewers can judge silhouette, material quality, grounding, and scale without opening Blender.
- No candidate is promoted by the gallery script.

## Phase 4: Track Visual Schema

### Objective

Add additive visual track data and procedural visual kit support without changing mechanics.

### Work

- Add `src/game/race/tracks/trackVisualSchema.js`.
- Add deterministic centerline frame helpers.
- Extend track data with optional visual fields and safe defaults.
- Extend procedural road rendering for width bands, curbs, shoulders, lane markings, and optional banking.
- Add deterministic placement anchors.
- Add one instanced prop/barrier family.
- Keep existing tracks importable in Node.

### Acceptance

- Existing track mechanics/progress results remain unchanged for unchanged data.
- Visual schema can be disabled without changing race outcome.
- No road seams appear at logical segment boundaries.
- Unknown visual asset IDs fail validation before browser runtime.

## Phase 5: First Comeback City Visual Upgrade

### Objective

Apply the first real runtime visual upgrade to Comeback City.

### Work

- Apply the visual kit to Comeback City first.
- Add finish gate, district identity, better road-edge readability, grounding/contact treatment, prop density, and material families.
- Keep renderer shadows disabled unless benchmarked and justified.
- Use emissive materials/additive VFX before bloom.
- Preserve route and renderer markers.

### Acceptance

- `/#race` still uses `data-race-renderer="three-kart"`.
- Real 3D road curve/elevation is visible.
- Karts look grounded.
- Road edge is readable on desktop and mobile.
- Finish gate or district cue is visible.
- Prop count target remains visible.
- No required fallback asset is used unexpectedly.

## Phase 6: Automated Screenshot And Video Proof

### Objective

Create deterministic proof that the upgraded runtime visuals work on desktop and mobile.

### Work

- Implement `scripts/capture-race-proof.mjs`.
- Implement `scripts/compare-race-visuals.mjs`.
- Add `asset-pipeline/config/proof-scenarios.json`.
- Capture desktop and mobile screenshots.
- Capture desktop and mobile 10-second videos.
- Capture telemetry, renderer stats, network failures, console errors, and top-down proof.
- Add hard runtime baseline checks and soft V2 review contact sheets.

### Acceptance

- Videos finalize correctly.
- Nonblank, motion, framing, fallback, route, FPS, triangle, draw-call, and transfer gates work.
- V2 art-direction review requires explicit approval, not pixel similarity to concept cards.

## Phase 7: Controlled Promotion

### Objective

Promote only validated, approved assets and route visuals into runtime paths.

### Work

- Implement `scripts/promote-approved-assets.mjs`.
- Add manifest helpers and promotion ledger.
- Add or update generated runtime registry only when needed.
- Promote one asset at a time.
- Require exact candidate hash, source hash, proof run, validation pass, and approval record.
- Run full post-promotion tests.

### Acceptance

- Promoted bytes exactly match approved candidate hash.
- Manifest, registry, proof, fallback, and provenance are consistent.
- `/#race` uses the upgraded visual set with no unexpected fallback.
- Existing gameplay tests still pass.
- Any old runtime asset can be restored through version control.

## Final Finishing Criteria

- `/#race` still works and remains `data-race-renderer="three-kart"`.
- Existing gameplay mechanics still pass.
- Runtime GLBs are valid, classified, budgeted, hashed, and linked to provenance/proof.
- Comeback City has visibly improved runtime graphics.
- Desktop and mobile screenshots/videos prove the upgraded visuals.
- No unexpected fallback assets are used in the proof route.
- Final handoff lists promoted assets, remaining candidates, test results, proof paths, known debt, and next recommended phase.

## First Action

Read Phase 1 reports, package scripts, current manifest, GLB audit output, runtime loader code, and race render/track files. Then begin Phase 2 only, with no promotion.
