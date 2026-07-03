# Comeback City Asset Pipeline

Phase 1 is a non-destructive inventory and validation layer for the existing Three.js race assets.

The pipeline separates source assets, generated reports, and promoted runtime assets:

- `3d generations:character sheets/` is an immutable source root.
- `asset-pipeline/raw/` is an optional future immutable intake root.
- `src/assets/game/models/` is the promoted runtime model root.

Phase 1 scripts may read GLB/GLTF files, calculate hashes and metrics, run the official glTF validator, and write generated reports under `asset-pipeline/`. They must not rewrite, move, delete, optimize, or promote any source or runtime asset.

## Commands

```bash
npm run assets:audit -- --scope all
npm run assets:audit -- --scope runtime --strict
npm run assets:repair-runtime -- --dry-run
npm run assets:repair-runtime -- --apply
npm run assets:optimize
npm run assets:decimate
npm run assets:candidates
npm run assets:validate -- --scope runtime
npm run assets:check
```

`--scope` accepts `source`, `runtime`, `candidates`, or `all`. Phase 1 candidate support was report-only; Phase 2 adds non-promoting optimization while promotion remains out of scope.

`assets:optimize` is the Phase 2 non-promoting optimizer. By default it reads the four highest-budget runtime GLBs, writes Meshopt candidates under `asset-pipeline/working/optimized/`, and emits before/after metrics, hashes, tool versions, and budget status. It does not copy candidates into `src/`.

`assets:repair-runtime` is the scoped runtime integrity repair gate. It only inspects tracked GLBs under `src/assets/game/models/`, restores missing expected GLBs from approved cache copies or exact Git blobs when `--apply` is provided, and blocks on unexpected existing hashes.

`assets:decimate` is the local Blender decimation lane for topology-heavy runtime copies. It reads `asset-pipeline/config/blender-decimation.json`, uses `/opt/homebrew/bin/blender` by default or `BLENDER_BIN`, writes candidates under `asset-pipeline/working/blender-decimate/`, and refreshes the shared candidate index.

`assets:candidates` rebuilds the shared candidate index from latest optimizer and Blender reports. Gallery, validation, and promotion use that normalized candidate metadata so candidates are budgeted against their target runtime path.

Generated reports are written to:

- `asset-pipeline/audit/<run-id>/`
- `asset-pipeline/manifests/latest-audit.json`
- `asset-pipeline/manifests/latest-validation.json`

Ordinary generated runs are ignored by Git. Config, README files, approvals, runtime assets, and the existing runtime manifest are not ignored.
