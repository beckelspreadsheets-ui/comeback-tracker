# Stage 0 Runner — Seth + Layer23

Work only in this isolated worktree and on branch `experiment/ordinal-racers-seth-layer23-20260721`.

Read completely before acting:

- `docs/ordinal-racer-prototype-state.json`
- `/home/openclaw/.openclaw/workspace/plans/comeback-city-ordinal-racer-prototype-plan-2026-07-21.md`
- existing asset-pipeline documentation and scripts relevant to GLB audit/capture

Execute only Stage 0 and the factual inventory portion of Stage 1. Do not replace either runtime GLB, do not merge, and do not deploy production.

Required outputs:

1. Audit all existing Seth and Layer23 source art, selection art, runtime GLBs, raw copies, and references. Record exact paths, hashes, dimensions/file sizes, triangle counts, materials/textures, animation clips, and likely provenance. Clearly identify missing canonical source art or inscription IDs.
2. Create reproducible old-model evidence for both characters using existing repo tooling where possible: neutral turntable views, seated-kart view, chase-race view, character-select view, and mobile view. Do not fake a capture if tooling cannot produce it; record the blocker.
3. Create a concise identity brief for each character based only on available source art, explicitly separating verified traits from uncertain traits.
4. Create a Stage 0 report and machine-readable metrics under `tmp/ordinal-racer-prototype/stage0/`, plus any durable scripts needed to reproduce them. Evidence files in ignored `tmp/` may remain uncommitted; durable scripts/docs belong in the branch.
5. Update `docs/ordinal-racer-prototype-state.json` after each meaningful checkpoint with current step, completed artifacts, next safe action, UTC activity timestamp, and truthful status.
6. Run relevant validations, commit durable source/docs changes, and push the experiment branch.
7. Stop at the owner approval gate. Do not begin modeling or runtime replacement.

Preserve the four protected fingerprints in the state file and re-check them before finishing. Do not touch unrelated files.
