# Penguin Kart Graphics Revamp — Execution Plan

**Date:** 2026-07-01 · **Parent:** [PENGUIN_KART_VFX_VISUAL_GAP_PLAN.md](PENGUIN_KART_VFX_PHASED_GAMEPLAN.md) (strategy & verdict) · **Owner art intake:** [CHARACTER_EXPRESSION_SHEET_BRIEF.md](CHARACTER_EXPRESSION_SHEET_BRIEF.md)
**Provenance:** drafted per-phase by parallel planning agents grounded in current code (file:line refs verified at draft time), then adversarially cross-checked; the cross-check's required fixes are encoded below as **binding amendments** that override task text wherever they conflict.
**Scope approvals:** Blender automation **APPROVED** (owner, 2026-07-01). Bake textures ship as WebP; KTX2 remains pending. No Nintendo/Mario Kart trade dress. House asset rules apply throughout (no blanket `gltf-transform optimize`; individual verbs, compression last; orientation lab for re-exported meshes; one-variable A/B with captures).

## How to use this doc

Each task is self-contained: hand a task ID (plus this doc and the parent plan) to an engineer or agent. Execute phases in order A → B → C → D → E; within a phase, tasks may parallelize unless dependencies say otherwise. Owner art (expression sheets) can be produced any time — Phase E consumes it. **After every approved merge, immediately re-capture the `race:proof` baselines** so the next task's "comparison passes" criterion is meaningful.

## Canonical measurement protocol (all phases)

- **Canonical FPS baseline:** HEADED Chromium against a **production build** (`npm run build` + `vite preview`), app-shell route `/#race?raceAutoplay=1&track=<key>`, reading the `frameWorkMs`/`frameElapsedMs` telemetry added in A2. Three runs, take the median. Captured once after A1+A2 land — that number is the trusted baseline all later gates compare against.
- The dev-server harness (`kart-playtest.html`, A2) is a **diagnostic only** — its numbers are never quoted as baselines (dev mode + dev server skew them).
- **The pre-A2 "Phase 5 baseline" (22.7 FPS) is void.** It measured the legacy stack, headless, rAF-throttled. No task may compare against it.
- FPS floors: 45 desktop / 30 mobile (real-device for release sign-off). Bundle truth: the A4 re-baselined `test:bundle`. Visual sign-off: existing capture scripts + owner gallery A/B flow.

## Binding cross-phase amendments

1. **A1 absorbs C0.** One restore task (A1: `git checkout` the deleted GLBs + loud-404 telemetry + proof assert). C0 is retired; its hash-manifest guard (`bake-artifact-guard` inside `assets:check`) moves into C4's guard story. Restore proceeds on the assumption the working-tree deletion was accidental — owner to confirm (see Open Questions).
2. **`assets:bake` is owned by C4.** A1 ships an interim wrapper (`scripts/bake-baked-glbs.mjs`) under that npm name; C4's `bake-assets.mjs` explicitly replaces and deletes it. C3's refactor of the `.py` bake scripts must update the interim wrapper in the same commit it changes their signatures.
3. **Re-bakes never write to `public/` directly.** All bake output goes to the asset-pipeline candidate directory and reaches `public/`/manifest only through the C8 approval/promotion step. Guard hashes update at promotion time only — never by the bake command itself. The buildings re-bake joins the owner A/B list alongside the spike and village props.
4. **Every FPS-gated task in B/C/D/E hard-depends on A2 (instrument) and A1 (scene content)** even where its dependency list predates this rule. E3 compares against the A2 headed baseline, not the void Phase 5 numbers.
5. **D0 is descoped to a thin wrapper over A2's instrument** — same telemetry fields, same headed mode, same canonical environment. No second FPS harness.
6. **A3 drops its MSAA sub-experiment.** Anti-aliasing is solved once, in B4 (SMAA). B4 depends on A1/A2/A3 and its acceptance criteria are evaluated at the render scale A3 lands, not at 0.58.
7. **One shader-injection helper.** B3 creates a composable `onBeforeCompile` helper (chunk registration + merged `customProgramCacheKey`); D1's sway and E6's hull shader must route through it — never assign `onBeforeCompile` directly (second assignment silently overwrites the first). Every wiring site documents whether its material is per-instance or a shared singleton (D1 hoists spectator materials into shared sway singletons, which the penguin-march crosser in D4 also inherits).
8. **A4's re-baselined bundle numbers are the single bundle truth.** C4/C8 consume its published headroom; D4/E5 expect a green gate and absolute pass; B4's JS headroom figure is re-derived from A4's gzip threshold.
9. **A2's scope includes adding a penguin-village run to the kart-playable proof test** — without it, the penguin-track acceptance criteria in B and D are unverifiable.
10. **A3, A4, and B4 add `npm run test:race:browser` to their verification** — they touch code shared with the legacy ArcadeRace3D stack, and only that suite actually mounts it in a browser.
11. **E4/E6 depend on B4** and re-state their bloom/composer verification against the pmndrs chain (`BloomEffect.luminanceThreshold`, merged `EffectPass`) instead of the deleted `UnrealBloomPass` at the old line refs.

---


## Phase A — Stop the bleeding, fix the instruments (restore baked GLBs, repoint FPS measurement to the shipped racer, gated render-scale reclaim, honest bundle budget)

### A1 — Restore baked GLBs from git, make 404 fallback loud, wire assets:bake regeneration script

**Why:** The shipped Comeback City track silently downgraded to procedural boxes because public/baked-buildings.glb 404s into an empty error callback. Restoring the bake returns the biggest single approved visual upgrade, and loud telemetry prevents it rotting silently again.

**Effort:** day · **Depends on:** — · **Owner gate:** none (restores already-approved committed assets; re-bakes that change hashes go through the existing approval flow)

**Files:**
- `public/baked-buildings.glb (tracked at HEAD, deleted in working tree only — ' D' in git status)`
- `public/baked-spike.glb (same state)`
- `src/game/ComebackCityThreeKartRace.jsx:3702-3744 (baked-buildings load; silent error cb '() => {}' at 3743; silent empty-variants return at 3712)`
- `src/game/ComebackCityThreeKartRace.jsx:3685-3699 (bakedSpike A/B load — has NO error callback at all)`
- `src/game/ComebackCityThreeKartRace.jsx:3363-3418 (publishTelemetry) and 4414-4418 (call site with runtimeStats)`
- `scripts/blender/bake-buildings.py (self-contained; OUT_GLB=public/baked-buildings.glb, BAKE_SIZE=1024)`
- `scripts/blender/bake-spike-segment.py:16-17 (requires tmp/baked-spike/segment.json; OUT_GLB=public/baked-spike.glb)`
- `scripts/blender/export-spike-segment.mjs:67 (writes tmp/baked-spike/segment.json but does NOT mkdir the dir)`
- `scripts/bake-baked-glbs.mjs (NEW wrapper)`
- `package.json:44-52 (assets:* scripts block — add assets:bake)`

**Steps:**
1. Restore instantly from git — no Blender needed: `git checkout -- public/baked-buildings.glb public/baked-spike.glb`. Both blobs exist at HEAD; the deletion is working-tree-only. Confirm with `ls -la public/*.glb` and `git status --porcelain public/`.
2. Loud fallback in ComebackCityThreeKartRace.jsx: replace the empty error callback at line 3743 with one that does `console.warn('[kart] /baked-buildings.glb failed to load — procedural fallback active', error)` and sets `engine.bakedBuildings = 'missing'`. In the success path set `engine.bakedBuildings = 'active'`, and change the silent `if (!variants.length) return;` at 3712 to warn + set 'loaded-but-empty'. Initialize `engine.bakedBuildings = 'pending'` where the engine object is assembled (~3270 block).
3. Add a fourth onError argument to the ?bakedSpike=1 loader.load call at 3686 (currently only onLoad is passed) with the same warn + `engine.bakedSpike = 'missing'` pattern.
4. Surface in telemetry: add `bakedBuildings: runtimeStats.bakedBuildings ?? null` (and bakedSpike) to the __comebackCityKartTelemetry object in publishTelemetry (3375-3417), and pass `bakedBuildings: engine.bakedBuildings` in the runtimeStats argument at the 4415 call site.
5. Guard in CI: in scripts/kart-playable-proof-test.mjs (which already waits on `window.__comebackCityKartTelemetry` at line 178), add a wait-then-assert for the comeback-city run: poll until telemetry.bakedBuildings !== 'pending' (timeout ~15s, GLB loads async after mount) and fail the proof if it is not 'active'.
6. Create scripts/bake-baked-glbs.mjs: resolve blender binary as `process.env.BLENDER_BIN || '/opt/homebrew/bin/blender'` with fallback '/Applications/Blender.app/Contents/MacOS/Blender' (mirror scripts/blender-decimate-assets.mjs:46 — Blender.app is confirmed installed); `mkdir -p tmp/baked-spike` (export script does not create it); run `node scripts/blender/export-spike-segment.mjs`, then `<blender> -b -P scripts/blender/bake-spike-segment.py`, then `<blender> -b -P scripts/blender/bake-buildings.py`; assert both public/*.glb exist and exceed a sanity size (>100 KB); print shasum-256 of each and a `git diff --stat public/` reminder so a re-bake that differs from the committed/approved bytes is a deliberate decision (hash-locked approval flow — a differing re-bake is a NEW asset needing orientation-lab/approval, never auto-shipped).
7. Add to package.json scripts: `"assets:bake": "node scripts/bake-baked-glbs.mjs"`.
8. Commit the restored GLBs + code so the working-tree deletion cannot recur silently.

**Acceptance criteria:**
- [ ] public/baked-buildings.glb and public/baked-spike.glb exist, byte-identical to HEAD blobs (git status clean for public/)
- [ ] Dev run of /#race on comeback-city shows baked buildings (no procedural-building children remain in swap groups) and window.__comebackCityKartTelemetry.bakedBuildings === 'active'
- [ ] Deleting the GLB and reloading produces a visible console.warn and telemetry 'missing' (manual spot check), and npm run test:kart-playable FAILS in that state
- [ ] npm run assets:bake regenerates both GLBs end-to-end on this machine and prints hashes without erroring
- [ ] ?bakedSpike=1 A/B overlay still loads

**Verification:**
- git checkout -- public/baked-buildings.glb public/baked-spike.glb && ls -la public/*.glb && git status --porcelain public/
- npm run test:kart-playable
- npm run test:race (node-side logic suite — must stay green, no logic touched)
- mv public/baked-buildings.glb /tmp/x.glb; npm run test:kart-playable  # expect FAIL with bakedBuildings!=='active'; then restore
- npm run assets:bake && shasum -a 256 public/baked-*.glb
- npm run assets:check (confirm public/ bakes are outside runtime-manifest scope and the audit still passes)

**Perf gate:** none directly — A2 baseline is captured AFTER this restore so the trusted FPS number includes the baked buildings

---

### A2 — Repoint FPS measurement at the shipped kart racer and capture a trusted headed baseline

**Why:** Every existing FPS number (the '22.7 sustained' crisis) was measured on the LEGACY ArcadeRace3D via race-playtest.html in headless Chromium — wrong game AND rAF-throttled. Nothing in Phase B/C can be perf-gated until an instrument points at ComebackCityThreeKartRace with real vsync.

**Effort:** days · **Depends on:** A1 · **Owner gate:** none

**Files:**
- `src/game/RacePlaytestHarness.jsx:4,75 (mounts legacy ArcadeRace3D — leave as-is for legacy suite)`
- `race-playtest.html (legacy harness page — precedent for new page; NOT in vite rollup inputs, dev-server-only)`
- `kart-playtest.html + src/game/KartPlaytestHarness.jsx (NEW minimal harness mounting ComebackCityThreeKartRace)`
- `src/game/ComebackCityThreeKartRace.jsx:3778-3787 (frame loop; rawDt clamped 0.001-0.04 at 3781; 40-frame fpsEstimate window 3784-3787), 4414 (composer.render), 3363-3418 (publishTelemetry — currently ONLY fpsEstimate, no work/elapsed split), 3436-3468 (?raceAutoplay/?character/?kart/?track already read from URL in-component)`
- `scripts/phase5-sustained-capture.mjs:109 (headless launch), 114 (legacy URL), 120-146 (reads legacy-only __raceVisualTelemetry)`
- `scripts/race-browser-playtest.mjs:755,956,1221,1529,1664 (legacy race-playtest.html URLs), 1343/1422 (already hits /#race for two checks)`
- `docs/race-v1-blocker-backlog.md:47-48 (blockers #9 and #10)`
- `docs/PENGUIN_KART_VFX_VISUAL_GAP_PLAN.md:53 (measurement-fix directive)`

**Steps:**
1. Create kart-playtest.html at repo root (copy race-playtest.html shape) loading /src/game/KartPlaytestHarness.jsx. The harness just renders <ComebackCityThreeKartRace mode="race" /> full-viewport and sets window.__kartHarnessReady = true; track/character/kart/autoplay all come free via the component's own URL-param handling (verified at 3443-3468, autoplay 3436-3440). No vite.config change needed — dev server serves root .html pages (same mechanism race-playtest.html relies on; it is not in build.rollupOptions).
2. Instrument the shipped racer: in frame() capture the UNCLAMPED delta (now - previousFrameTime, before the 0.04 clamp at 3781) into a rolling 40-sample elapsed array, and after engine.composer.render() at 4414 compute workMs = performance.now() - now into a rolling work array. Extend publishTelemetry/runtimeStats with frameElapsedMs (avg), frameWorkMs (avg), and keep fpsEstimate as-is. This reproduces the legacy work-vs-elapsed split that exposed the rAF-throttling artifact.
3. Repoint scripts/phase5-sustained-capture.mjs: change the target URL to `${baseUrl}/kart-playtest.html?raceAutoplay=1&track=comeback-city` (keep the legacy URL behind PHASE5_TARGET=legacy for one comparison run); wait for `window.__comebackCityKartTelemetry?.renderer === 'three-kart' && telemetry.countdown === 0 && telemetry.raceTime > 2` instead of the __raceVisualTelemetry gate; since the shipped racer keeps no samples ring, poll page.evaluate every 250 ms for {fpsEstimate, frameElapsedMs, frameWorkMs, rendererStats, speed, lap} and summarize in-script (reuse summarizeSustainedSamples shape). Default PHASE5_CAPTURE_DURATION_MS to 20000 — an autoplay race lasts multiple minutes, and there is no raceNoFinish param in the shipped component (confirmed absent), so a 20 s window post-countdown finishes well inside lap 1-2.
4. Add PHASE5_HEADED=1 support: chromium.launch({ headless: process.env.PHASE5_HEADED !== '1' }). Document that trusted baselines REQUIRE a headed run on the dev machine (real GPU + vsync); note the display refresh (ProMotion 120 Hz vs 60 Hz) in the evidence JSON so runs are comparable.
5. Run the captures (after A1 restore so baked buildings are in the scene): (1) headed shipped-racer run — this is the baseline; (2) headless shipped-racer run — documents the throttling delta; (3) headed legacy run — closes the 'which game were we measuring' hole. All land in .agent/runs/kart-racer-production-readiness/evidence/phase5-capture-*/.
6. Define and write down the trusted baseline: 'headed Chromium, 1440x900, comeback-city autoplay, 20 s sustained window post-countdown, metrics = mean/min FPS from unclamped frame deltas + mean frameWorkMs + rendererStats (draw calls/triangles)'. Record the numbers in docs/race-v1-blocker-backlog.md (update blocker #10 row: harness now targets shipped racer for perf; update blocker #9: the 45-FPS floor gate now has a real instrument) and cross-reference the evidence dir.
7. Scope note for race-browser-playtest.mjs: only its perf-relevant use is superseded; its dozens of visual-kart scenario assertions are wired to legacy DOM ([data-testid="arcade-race-shell"]) and legacy telemetry throughout — migrating that suite is a week-scale job, NOT Phase A. Add a loud banner to its output ('LEGACY ArcadeRace3D route — visual thresholds do not describe the shipped game') and note the deferral in the blocker backlog so the doc stops implying CI covers the shipped racer.

**Acceptance criteria:**
- [ ] kart-playtest.html mounts ComebackCityThreeKartRace (telemetry.renderer === 'three-kart') with zero app-shell/cloud-sync involvement
- [ ] __comebackCityKartTelemetry exposes finite frameElapsedMs and frameWorkMs during play
- [ ] One headed sustained capture JSON exists in .agent/runs/kart-racer-production-readiness/evidence/ for the SHIPPED racer with baked buildings active (telemetry.bakedBuildings === 'active')
- [ ] Baseline definition + numbers written into docs/race-v1-blocker-backlog.md, replacing reliance on the legacy 22.7 figure (explicitly marked non-comparable)
- [ ] Headless-vs-headed delta documented, proving/refuting the rAF-throttling artifact on this machine

**Verification:**
- PHASE5_HEADED=1 node scripts/phase5-sustained-capture.mjs   # shipped racer, trusted baseline
- node scripts/phase5-sustained-capture.mjs                   # headless, artifact-delta evidence
- PHASE5_HEADED=1 PHASE5_TARGET=legacy node scripts/phase5-sustained-capture.mjs  # one-off legacy comparison
- npm run test:kart-playable   # unchanged shipped-route guard still green
- npm run test:race            # node logic suite green (instrumentation must not alter dt/physics)

**Perf gate:** produces the baseline itself; sanity: headed frameWorkMs should be << frame budget (legacy evidence showed 1.6 ms work vs 52.9 ms elapsed)

---

### A3 — A/B raise RACE_RENDER_SCALE.desktop (0.58 → 0.70/0.75/0.85) gated on the A2 headed baseline

**Why:** Desktop renders at 0.58x scale (effective DPR 1.16 on a 2x display) — the single cheapest sharpness win if the A2 baseline shows headroom. SCOPE CORRECTION: this constant is NOT legacy-only; the shipped racer imports createRaceRenderer/fitRaceRendererToCanvas from createRaceScene.js (ComebackCityThreeKartRace.jsx:78), so one change covers the shipped game.

**Effort:** days · **Depends on:** A1, A2 · **Owner gate:** before/after captures of chosen scale (and MSAA A/B if run) shared for approval under the neon-dusk art lock

**Files:**
- `src/game/race/render/createRaceScene.js:10-13 (RACE_RENDER_SCALE desktop 0.58 / mobile 0.6), :3-8 (RACE_RENDERER_OPTIONS antialias:true — inert under the composer), :47-78 (fitRaceRendererToCanvas, DPR floor 0.355 at line 60)`
- `src/game/ComebackCityThreeKartRace.jsx:2887-2891 (EffectComposer + UnrealBloomPass(res 640x360, 0.55, 0.45, 1.0)), 3565 (composer.setPixelRatio(viewport.dpr)), 3568 (bloomPass.setSize at 0.3 x dpr — bloom cost scales with the change)`
- `scripts/race-content-playtest.mjs:137, 3833-3834, 3870-3884 (assertions IMPORT RACE_RENDER_SCALE so expectations self-adjust — still must be run)`
- `scripts/compare-race-visuals.mjs + src/assets/game/proof/*.png (pixel-compare references will see a sharpness change)`

**Steps:**
1. Precondition: A2 trusted headed baseline exists and A1 buildings are in-scene (the candidate must be judged against the real draw load).
2. One variable per run (house rule): edit RACE_RENDER_SCALE.desktop in createRaceScene.js:11 to 0.70, capture; then 0.75; then 0.85. For each candidate run the headed sustained capture AND save a still (the capture script already screenshots) — keep before (0.58) / after pairs per house A/B rules. Leave mobile at 0.6 (no mobile baseline instrument yet).
3. Optional ergonomics (small, dev-only): accept a ?renderScale= override inside fitRaceRendererToCanvas (clamped 0.355-1.0, applied only when the param is present) so the sweep needs no repeated edits; if added, it must be covered by a case in scripts/race-content-playtest.mjs before merging.
4. Record interactions per run: composer pixel ratio follows viewport.dpr (3565) and bloom input follows 0.3 x dpr (3568), so fragment cost grows ~ (scale ratio)^2 — 0.58→0.75 on a 2x display is ~67% more shaded pixels; watch frameWorkMs and rendererStats, not just FPS.
5. AA decision — scale first, MSAA second: antialias:true in RACE_RENDERER_OPTIONS does nothing for the final image because EffectComposer renders via non-multisampled WebGLRenderTargets; raising render scale is the correct first move (acts as supersampling). ONLY IF the winning scale still shows edge crawl AND holds >45 FPS with margin, run a SEPARATE single-variable A/B adding MSAA to the composer target (pass a WebGLRenderTarget with { samples: 4, type: THREE.HalfFloatType } to the EffectComposer constructor at 2887, or set composer.renderTarget1/2.samples = 4 before first render) and re-capture.
6. Pick the highest candidate whose headed sustained capture holds the 45 FPS desktop floor with margin (worst polled sample >= 45, not just the mean). Commit the constant change with the before/after captures referenced in the commit body.
7. If race:proof:compare fails on sharpness deltas, re-baseline the reference proofs through the documented proof-capture flow (race:proof:capture) with owner-visible before/after — never by loosening compare thresholds.

**Acceptance criteria:**
- [ ] A capture JSON + screenshot pair exists for 0.58 (control) and each tested candidate, all headed, all on comeback-city with baked buildings active
- [ ] Chosen RACE_RENDER_SCALE.desktop committed with worst-sample FPS >= 45 in its headed sustained capture
- [ ] Bloom/composer resolution interaction documented in the evidence (frameWorkMs and draw stats per candidate)
- [ ] npm run test:race passes with the new constant (assertions derive from the import — verified green, not assumed)
- [ ] Owner has seen the before/after pair for the chosen scale (art-lock A/B rule)

**Verification:**
- PHASE5_HEADED=1 node scripts/phase5-sustained-capture.mjs   # once per candidate, compare vs A2 control
- npm run test:race
- npm run test:kart-playable
- npm run race:proof:capture && npm run race:proof:compare   # re-baseline proofs via approved flow if sharpness delta trips compare
- npm run test:track-visuals   # unaffected data-only validation stays green

**Perf gate:** headed sustained capture at chosen scale: worst polled FPS sample >= 45 desktop; frameWorkMs mean must leave headroom for Phase B/C VFX (document remaining ms)

---

### A4 — Honest bundle budget: rebuild, stop shipping QA proof PNGs, re-baseline thresholds, report Phase C headroom

**Why:** The failing 31.4 MiB report is stale (predates avatar re-promotion to 249-582 KB and still lists a since-deleted baked-spike.glb) and ~4.5 MiB of it is QA reference PNGs that ship to users because a constants module statically drags them into every build. SCOPE CORRECTION: the script never counts tmp/ — it scans dist/ only; the offenders are src/assets/game/proof/*.png bundled via comebackCityVisuals.jsx.

**Effort:** day · **Depends on:** A1 · **Owner gate:** ack on (a) new budget thresholds replacing the 2026-06-01 delegated baseline and (b) QA reference routes/images being excluded from production builds unless VITE_VISUAL_REFERENCE_ROUTES=true

**Files:**
- `scripts/bundle-asset-budget-report.mjs:6-17 (scope=dist + env-overridable thresholds: totalMiB 8.5, imageTotalMiB 3.25, largestFileMiB 3.75, totalGzipKiB 4600), ~183-190 (owner-baseline note field), 219-223 (fail behavior)`
- `tmp/bundle-budget/bundle-asset-budget-report.json (stale: total 31.393 MiB, images 9.51, largest 3.844, 'other' 16.84 = pre-repromotion GLBs)`
- `src/game/comebackCityVisuals.jsx:17-18 (static imports of proof PNGs, 2.32 + 2.22 MiB), 710-716/740-859 (proof scenes using them)`
- `src/game/WorldScene.jsx:4, src/game/HudOverlay.jsx:26, src/game/ArcadeRace3D.jsx:5 (static const imports that drag the PNG-bearing module into every build)`
- `src/App.jsx:39-64 (VISUAL_REFERENCE_ROUTES_ENABLED: import.meta.env.DEV || VITE_VISUAL_REFERENCE_ROUTES==='true'; all proof/reference scenes already lazy)`
- `src/game/comebackCityVisualTokens.js (NEW constants-only module)`
- `vite.config.js:44-49 (workbox already globIgnores proof/backdrop patterns — precache was protected, dist payload was not)`

**Steps:**
1. Truth first, before any code change: `rm -rf dist && npm run build && npm run test:bundle` and record the report — avatars alone should collapse the 'other' bucket (models/avatars now total ~1.9 MB on disk vs the 16.84 MiB stale bucket). This yields the honest 'before' for this task. (Run once more after A1 restore lands so dist includes public/baked-*.glb — they are shipped runtime content and MUST count.)
2. Split constants out of the PNG-bearing module: create src/game/comebackCityVisualTokens.js exporting exactly what the three static importers need (VISUAL_PALETTE, CAMERA_PRESETS at minimum — enumerate each file's import list at WorldScene.jsx:4, HudOverlay.jsx:26, ArcadeRace3D.jsx:1-5 before moving); repoint those three imports; have comebackCityVisuals.jsx re-export the tokens for back-compat. comebackCityVisuals.jsx (with its PNG imports) then only enters the graph via App.jsx's guarded dynamic imports, whose `false ? ... : null` branch is statically eliminated in production builds (import.meta.env.DEV is compile-time false, VITE_VISUAL_REFERENCE_ROUTES unset) — the chunk and its PNGs stop being emitted to dist entirely. Dev and flag-enabled builds keep the reference routes intact.
3. Confirm elimination: rebuild and check `ls dist/assets | grep -i 'proof\|backdrop'` is empty and no comebackCityVisuals chunk exists; grep the build output list to be sure no other entry drags the module (asset-manifest.json mention is data-only).
4. Re-baseline thresholds in bundle-asset-budget-report.mjs against the honest post-fix build: keep totalMiB 8.5 if we land under with room, tighten imageTotalMiB to measured+margin, and size largestFileMiB to the biggest legitimate shipped asset (likely public/baked-spike.glb or a kart GLB). Update the note field (currently cites the 2026-06-01 owner delegation) with the new date/rationale. Prefer editing defaults in-script over env overrides so CI inherits them.
5. Report Phase C headroom explicitly: add a small 'headroom' block to the report output = threshold minus actual for total and images, and state in the summary how many MiB of WebP bake textures (Phase C UV2 bakes, 256-512 px) fit before any gate trips.
6. Sanity-check per-preset: run the budget against `npm run build:andrew` output too (VITE_USER_PRESET changes content); note in the report which preset is the contract until the kart game gets its own Pages project budget.

**Acceptance criteria:**
- [ ] Fresh dist + npm run test:bundle exits 0 (gateStatus bundle-budget-pass) with baked GLBs included
- [ ] No comeback-city-kart-proof-* or comeback-city-race-backdrop-* files in production dist; dev (#visual-reference routes) unaffected, VITE_VISUAL_REFERENCE_ROUTES=true builds still include them by choice
- [ ] Thresholds in the script match the documented re-baseline (note field updated, old 31.4 MiB report superseded in tmp/bundle-budget/)
- [ ] Report states numeric headroom (MiB, raw + gzip) available for Phase C bake textures
- [ ] Shipped app behavior unchanged: race, world hub, HUD all render (tokens split is import-shuffling only)

**Verification:**
- rm -rf dist && npm run build && npm run test:bundle
- ls dist/assets | grep -i 'proof\|backdrop' ; echo 'exit code 1 expected'
- npm run test:kart-playable   # shipped route unaffected by the tokens split
- npm run test:visual          # visual-reference checks still pass in dev where routes remain enabled
- npm run build:andrew && BUNDLE_BUDGET_DIST_DIR=dist npm run test:bundle   # preset parity check
- npm run test:race

**Perf gate:** none (bundle gate, not frame gate); indirect win: ~4.5 MiB less to download/precache-scan

---


## Phase B — Pure-code cinematic pass (per-track atmosphere, palette moments, toon rim light, pmndrs post chain)

### B1 — Per-track fog, hemisphere tint, and light colors driven from track palette

**Why:** The purple '#272252' fog and violet hemisphere are hardcoded for every track, so Penguin Village reads like Comeback City at distance instead of an icy arctic dusk. This is the single cheapest whole-frame mood lever.

**Effort:** hours · **Depends on:** — · **Owner gate:** Approve penguinVillage.js palette additions diff (fog/hemi/sun/rim values) before commit

**Files:**
- `/Users/andrewferguson/Downloads/comeback-tracker/src/game/ComebackCityThreeKartRace.jsx (fog :2861, clearColor :2852, sky :2860, hemi :2866, sun :2869, rim light :2882, engine return :3255-3282)`
- `/Users/andrewferguson/Downloads/comeback-tracker/src/game/race/tracks/penguinVillage.js (palette :97-121, add keys after bridge :120)`

**Steps:**
1. In createScene (palette already read at :2849), replace line 2861 `scene.fog = new THREE.Fog('#272252', 240, 820)` with: `const fogCfg = palette.fog || {}; scene.fog = new THREE.Fog(fogCfg.color || '#272252', fogCfg.near ?? 240, fogCfg.far ?? 820);` — defaults exactly reproduce Comeback City (which has no palette key at all in comebackCity.js, so it is untouched by construction).
2. Capture the hemisphere light into a variable at :2866: `const hemi = new THREE.HemisphereLight(palette.hemi?.sky || '#8d8ce0', palette.hemi?.ground || '#2a1e4a', palette.hemi?.intensity ?? 3.3); scene.add(hemi);`
3. Drive sun and rim-light tint the same way: sun color `palette.sunColor || '#ffae72'` (:2869), rim light color `palette.rimLightColor || '#4fd8ff'` (:2882). Keep intensities (2.6 / 2.0) hardcoded — one variable per change.
4. Add `fog`, `hemi`, and `rim` (the DirectionalLight at :2882, rename local to `rimLight` to avoid clash) to the engine return object at :3255-3282 so B2 can lerp them at runtime.
5. Additive keys in penguinVillage.js palette after `bridge` (:120), with comments matching file style: `fog: { color: '#12324a', near: 210, far: 760 }`, `hemi: { sky: '#9fd4e8', ground: '#12283f', intensity: 3.3 }`, `sunColor: '#ffd9a0'` (pale winter sun), `rimLightColor: '#00e5ff'` (matches existing rail/curb neon). These are proposed values — present the diff to the owner before commit.
6. Guard: keep fog.far <= 840; camera far is 860 (:2862) and skybox must stay visible beyond fog. Add a code comment noting fog far > camera far silently no-ops.
7. Comeback City parity check is structural (no palette key), but still run the pixel compare below to prove it.

**Acceptance criteria:**
- [ ] Comeback City race:proof:compare passes against existing baselines (zero intended diff).
- [ ] Penguin Village distance haze reads icy blue, not purple, in a chase-cam capture at progress ~0.3 (pond sweep).
- [ ] Owner has seen and approved the penguinVillage.js palette diff (additive keys only, no existing key modified).
- [ ] engine object exposes hemi and rimLight references (grep confirms they are in the return object).

**Verification:**
- npm run test:track-visuals
- npm run test:kart-playable
- npm run build && npm run race:proof:capture && npm run race:proof:compare
- A/B capture: npm run dev, then screenshot http://localhost:5173/?track=penguin-village&playableAutoplay=1#race before/after (same progress moment via ?proofCamera=top for determinism)
- node scripts/phase5-sustained-capture.mjs  # FPS delta must be ~0; this change adds no objects

**Perf gate:** phase5-sustained-capture before/after within noise; 45 desktop / 30 mobile floor unchanged

---

### B4 — Migrate post chain to pmndrs/postprocessing (mipmap Bloom + SMAA + Vignette + ACES ToneMappingEffect, LUT slot wired)

**Why:** The current three-examples chain has no AA at all (composer targets are not multisampled; renderer antialias:true is dead through a composer) and UnrealBloomPass is the most expensive bloom available. A merged EffectPass gets AA + vignette + tone mapping for roughly the cost of the current bloom alone.

**Effort:** days · **Depends on:** — · **Owner gate:** Step-1 parity capture approval, then separate vignette on/off approval; FXAA-vs-SMAA fallback decision if bundle delta exceeds headroom

**Files:**
- `/Users/andrewferguson/Downloads/comeback-tracker/package.json (add postprocessing dep)`
- `/Users/andrewferguson/Downloads/comeback-tracker/src/game/ComebackCityThreeKartRace.jsx (imports :6-9, renderer overrides :2850-2853, composer :2887-2891, engine return bloomPass :3263 composer :3270, resize handler :3558-3569, render call :4414, dispose :4458)`
- `/Users/andrewferguson/Downloads/comeback-tracker/src/game/race/render/createRaceScene.js (READ ONLY — do NOT edit configureRaceRenderer :19-25; it is shared with legacy ArcadeRace3D + CI harnesses)`

**Steps:**
1. npm install postprocessing — check its three peer range against three ^0.184.0 at install; pin exact version in package.json. If the released version does not yet support r184, stop and report (do not fork/patch).
2. Record 'before' evidence FIRST: npm run build; npm run race:proof:capture; node scripts/phase5-sustained-capture.mjs; gzip size of the largest dist JS chunk (`gzip -c dist/assets/<main-chunk>.js | wc -c`). Save under the scratchpad or .agent/runs evidence dir.
3. Replace imports :6-9 with `import { BloomEffect, EffectComposer, EffectPass, RenderPass, SMAAEffect, SMAAPreset, ToneMappingEffect, ToneMappingMode, VignetteEffect } from 'postprocessing';` (three examples EffectComposer/RenderPass/UnrealBloomPass/OutputPass imports go away — small bundle win).
4. In createScene, immediately after createRaceRenderer succeeds (:2850-2853), add `renderer.toneMapping = THREE.NoToneMapping;` as a LOCAL override with a comment pointing at the shared configureRaceRenderer (createRaceScene.js:21) that still sets ACES for the legacy stack. Keep `renderer.outputColorSpace = SRGBColorSpace` from the factory.
5. Replace :2887-2891 with: `const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });` + `composer.addPass(new RenderPass(scene, camera));` + `const bloomEffect = new BloomEffect({ mipmapBlur: true, intensity: 0.55, radius: 0.45, luminanceThreshold: 1.0, luminanceSmoothing: 0.08 });` + SMAAEffect({ preset: SMAAPreset.MEDIUM }) + VignetteEffect (start offset 0.32, darkness 0.45, but ship step 1 with vignette DISABLED — see A/B step) + `new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })` LAST, all merged in ONE `new EffectPass(camera, bloomEffect, smaaEffect, vignetteEffect, toneMappingEffect)`. Add a commented LUT insertion point (`// LUT3DEffect goes here, before ToneMappingEffect, when owner supplies a LUT texture`) — do not add the effect object.
6. Exposure: the old chain applied toneMappingExposure 1.05 (:2853) inside OutputPass. Verify whether pmndrs ToneMappingEffect ACES honors renderer.toneMappingExposure in the installed version; if not, match brightness by scaling hemi/sun intensities by 1.05 and note it in the commit. Judge parity by the A/B capture, not by reading code alone.
7. Resize handler :3558-3569: delete `engine.composer.setPixelRatio(viewport.dpr)` (:3565 — method does not exist on pmndrs composer) and the bloom 30% hack (:3568 — mipmapBlur makes it obsolete); replace :3566 with `engine.composer.setSize(viewport.width, viewport.height, false)` (third arg false so canvas CSS style is not rewritten; fitRaceRendererToCanvas already set pixelRatio+size at :47-78 of createRaceScene.js — assert canvas.width/height are unchanged after the composer call in a dev-console check).
8. Engine return :3263/:3270: replace `bloomPass` with `bloomEffect` (keep the key name `bloomPass` pointing at the effect if you want zero call-site churn, but grep for other bloomPass consumers first — currently only :3568). Render call :4414 becomes `engine.composer.render(dt)`. Dispose at :4458 already calls composer.dispose?.() — pmndrs supports it.
9. A/B in two gated steps (house rule: one variable): STEP 1 = bloom+ACES parity only (SMAA on, vignette OFF) — capture must look near-identical to 'before'; tune bloomEffect intensity/radius/threshold until the neon glow matches (pmndrs radius semantics differ from Unreal radius; start at the listed values). STEP 2 = enable VignetteEffect as its own before/after capture for owner sign-off.
10. Watch for the two flagged conflicts: (a) double or missing sRGB conversion (pmndrs' final pass handles encoding; symptom = washed-out or crushed capture — the CSP texture-washout memory note is a separate issue but produces similar symptoms, so verify on localhost first); (b) legacy stack unchanged — run the legacy harness smoke to prove no cross-contamination.
11. Measure bundle delta: rebuild, re-run the gzip measurement and npm run test:bundle. Postprocessing + SMAA lookup textures typically cost 50-90 KiB gzip against the ~158 KiB documented headroom; if it exceeds ~120 KiB, swap SMAAEffect for FXAAEffect (tiny) and record the decision.

**Acceptance criteria:**
- [ ] Step-1 A/B capture is owner-judged visually equivalent to the old chain on both tracks (neon bloom glow preserved).
- [ ] SMAA visibly reduces edge crawl at 0.58 render scale in a side-by-side crop (rail/curb edges).
- [ ] No edits to createRaceScene.js; legacy ArcadeRace3D route still renders (test:race passes).
- [ ] JS bundle gzip delta measured and recorded; <= ~120 KiB or FXAA fallback taken.
- [ ] Sustained FPS >= 45 desktop (phase5-sustained-capture), and not worse than the 'before' run beyond noise.
- [ ] LUT insertion point exists as a documented comment; no LUT shipped.

**Verification:**
- npm run test:kart-playable   # both: default and PLAYABLE ?track=penguin-village variant if script supports it, else manual autoplay run
- npm run test:race            # legacy-stack harness must stay green
- npm run build && npm run race:proof:capture && npm run race:proof:compare
- node scripts/phase5-sustained-capture.mjs   # before AND after, same machine
- npm run test:bundle
- gzip -c dist/assets/<main-chunk>.js | wc -c   # compare against recorded 'before'

**Perf gate:** phase5-sustained-capture before/after: no regression beyond noise; hard floor 45 desktop / 30 mobile

---

### B2 — Per-section palette moments: 3-4 atmosphere lerps per lap driven by race.progress

**Why:** MK8's per-section color scripting is what makes a lap feel like a journey; Penguin Village's four authored road ribbons (main street, pond sweep, fish market, return bend) are natural palette moments, currently all lit identically.

**Effort:** day · **Depends on:** B1, B4 · **Owner gate:** Approve the four penguin-village moment values (capture strip) before commit

**Files:**
- `/Users/andrewferguson/Downloads/comeback-tracker/src/game/race/paletteMoments.js (NEW — pure, node-importable, no THREE import; mirror tracks/ file conventions)`
- `/Users/andrewferguson/Downloads/comeback-tracker/src/game/ComebackCityThreeKartRace.jsx (createScene precompute near :2861-2884; per-frame hook just before engine.composer.render at :4414, after sun follow :4411-4413)`
- `/Users/andrewferguson/Downloads/comeback-tracker/src/game/race/tracks/penguinVillage.js (additive palette.moments key)`

**Steps:**
1. Author the data shape as an additive palette key: `palette.moments = [{ progress, fog: { color, near, far }, hemi: { sky, ground }, sun: { color, intensity }, bloom }]`, sorted by progress. Proposed 4 moments for penguin-village aligned to roadRibbons (penguinVillage.js :33-38): 0.02 main-street (B1 base values), 0.30 pond sweep (brighter cyan fog, far pushed to ~800 for the open vista), 0.55 fish market (warm amber sun tint + slight hemi warm-up for the lantern strip), 0.84 return bend (deepest dusk, fog near pulled in). Owner sees the diff.
2. Write `src/game/race/paletteMoments.js` exporting `resolveMoments(palette)` (fills every optional field from B1 base values so lerp endpoints are always fully specified — no per-frame fallback branching) and `sampleMoments(resolved, progress, out)` doing wrap-aware segment lerp (last→first across 1.0→0.0) with smoothstep easing on each segment. Pure numbers/hex-strings in, numbers out — node-testable without THREE.
3. In createScene, after the B1 light setup: if `palette.moments?.length`, precompile via resolveMoments into THREE.Color pairs once, store on engine as `engine.paletteMoments`; else store null. NEUTRAL DEFAULT: Comeback City has no palette key, so engine.paletteMoments is null and the per-frame hook returns immediately — approved look untouched.
4. Per-frame hook: immediately before `engine.composer.render()` (:4414, after the sun-follow block :4411-4413), call `applyPaletteMoments(engine, race.progress)` which lerps scene.fog.color/near/far, hemi.color/groundColor (B1 exposed hemi), sun.color/intensity, and optionally bloom intensity via the B4 bloomEffect ref (skip bloom lerp if B4 hasn't landed — UnrealBloomPass.strength is the pre-B4 equivalent; abstract behind `engine.bloomPass`). race.progress is per-lap 0..1 (updated at :3985), which is exactly the lap-relative parameter needed.
5. Cost check: ~6 Color lerps + 4 scalar lerps per frame — no allocation (reuse scratch Colors created in createScene).
6. Write a tiny node assert (scripts/ one-off or inline `node -e`) exercising sampleMoments at segment boundaries, mid-segment, and the wrap seam (progress 0.95 → 0.05) to prove no color pop at the finish line.

**Acceptance criteria:**
- [ ] Comeback City: race:proof:compare unchanged (moments null path verified by pixel compare, not just code reading).
- [ ] Penguin Village: a 4-frame capture strip at progress ~0.1/0.3/0.55/0.85 shows 3+ visibly distinct atmospheres with smooth transitions (no pop at the lap wrap in a full-lap video capture).
- [ ] sampleMoments node assert passes including the wrap seam case.
- [ ] Zero per-frame allocations in applyPaletteMoments (scratch objects reused).

**Verification:**
- node -e "import('./src/game/race/paletteMoments.js').then(m => { /* boundary + wrap asserts */ })"  # or a scripts/ check file
- npm run test:track-visuals && npm run test:race
- npm run test:kart-playable
- Full-lap capture: npm run dev; record http://localhost:5173/?track=penguin-village&playableAutoplay=1#race for one lap (fresh-user-clip-capture.mjs pattern or manual-qa-capture) — check the 0.95→0.05 seam frame-by-frame
- node scripts/phase5-sustained-capture.mjs   # confirm no FPS cost
- npm run build && npm run race:proof:capture && npm run race:proof:compare   # comeback-city baselines must pass untouched

**Perf gate:** phase5-sustained-capture unchanged; per-frame work is a handful of lerps

---

### B3 — Fresnel rim light on karts/characters via one exported onBeforeCompile helper

**Why:** MeshToonMaterial has no envMap in r184, so karts and drivers have no edge separation from the dark track at dusk; a palette-tinted fresnel rim is the MK8 'spec/fresnel glint' step and the only way to get it on toon materials.

**Effort:** day · **Depends on:** B1 · **Owner gate:** A/B approval of rim look (strength/power/tint) before baseline regeneration

**Files:**
- `/Users/andrewferguson/Downloads/comeback-tracker/src/game/race/render/toonRimShader.js (NEW — single exported GLSL chunk + applyToonRim helper, kept minimal for the future TSL port)`
- `/Users/andrewferguson/Downloads/comeback-tracker/src/game/ComebackCityThreeKartRace.jsx (createToonMaterial :766-767 opt-in flag; mountDriverAvatar :867-870; attachTripoKartBody :896-899; attachAuthoredKartBody :923; marchers :3628-3636; itemMaterial :3647-3650; tint set in createScene near :2849)`

**Steps:**
1. Create src/game/race/render/toonRimShader.js exporting: (1) `TOON_RIM_CHUNK` — a small GLSL string computing `float rim = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), uRimPower);` and adding `uRimColor * uRimStrength * rim` to outgoingLight; (2) `TOON_RIM_SHARED_TINT = { value: new Color('#4fd8ff') }`-style shared uniform objects so ONE Color.set retints every rimmed material (createScene sets it from `palette.rimLightColor`, and B2 moments can lerp it later); (3) `applyToonRim(material, { strength = 0.32, power = 2.6 } = {})` which sets material.onBeforeCompile to inject uniforms + splice TOON_RIM_CHUNK immediately before `#include <opaque_fragment>` in the fragment shader (r184 chunk name — verify against the compiled MeshToonMaterial shader source at runtime, NOT from memory; log shader.fragmentShader once in dev if unsure) and sets `material.customProgramCacheKey = () => 'toon-rim-v1'` so rimmed programs share one compile and never collide with plain toon programs.
2. There is no existing onBeforeCompile in src/game/ (verified by grep) — this file is the single home for injected chunks; keep it under ~40 lines of GLSL+JS and comment the TSL-port intent at the top.
3. Wire it OPT-IN, karts/characters only (not scenery — rim-on-everything cheapens the read and this keeps the A/B one-variable): add `rim: true` option to createToonMaterial (:766-767) that calls applyToonRim, then pass it at the five hero sites: mountDriverAvatar (:867-870), attachTripoKartBody (:896-899), attachAuthoredKartBody (:923), the marcher re-materialization (:3628-3636), and itemMaterial (:3647-3650). Scenery materials from createToonMaterial call sites stay rim-free by default.
4. In createScene (:2849 area), set the shared tint from `palette.rimLightColor || '#4fd8ff'` (key added in B1).
5. Shader-compile smoke: a broken injection blanks every kart — test:kart-playable will catch it (telemetry/finish assertions fail if nothing renders), but ALSO check the browser console for WebGL shader errors on first load of both tracks.
6. A/B capture per house rules: same character/kart/track/frame, rim off vs on, both tracks (neon-dusk Comeback City and arctic Penguin Village show different tints). Use scripts/select-portraits-capture.mjs for character close-ups plus a chase-cam gameplay frame.
7. Expect race:proof:compare to DIFF on kart pixels — regenerate proof baselines only AFTER owner approval of the A/B, in the same commit, with the approval noted in the commit message.

**Acceptance criteria:**
- [ ] One exported helper file contains the entire injected chunk; no GLSL strings anywhere else (grep 'uRimColor' hits only toonRimShader.js and its import site).
- [ ] Karts/drivers show a readable palette-tinted edge highlight in the A/B close-up; scenery is pixel-unchanged.
- [ ] No WebGL shader compile warnings/errors in console on either track.
- [ ] Program cache: exactly one extra program variant (verify renderer.info.programs length delta is +1, not +N per material).
- [ ] Owner approved the A/B; proof baselines regenerated in the same change.

**Verification:**
- npm run test:kart-playable   # shader compile failure = kart invisible = test fails
- npm run test:visual
- A/B: node scripts/select-portraits-capture.mjs (or manual-qa-capture) rim-off vs rim-on, plus one chase frame per track at matched progress
- npm run build && npm run race:proof:capture && npm run race:proof:compare   # expect diff, regen baselines post-approval
- node scripts/phase5-sustained-capture.mjs   # fragment cost is a dot+pow; must be within noise

**Perf gate:** phase5-sustained-capture within noise; one extra shader program compile at load only

---

### B3b — GATED: Hero-kart metal parts to MeshStandardMaterial + small PMREM environment (also feeds the road material)

**Why:** Real specular ping on kart metal is the biggest 'toy quality' MK8 tell; a RoomEnvironment PMREM is cheap and the road/ground MeshStandardMaterials (:1026-1032, :1048-1051) would pick up subtle reflectance for free. Gated because it changes the material model on approved assets and touches every StandardMaterial in scene.

**Effort:** day · **Depends on:** B3, B4 · **Owner gate:** HARD GATE: do not start without owner opt-in; then per-step A/B approvals (kart material, then scene.environment)

**Files:**
- `/Users/andrewferguson/Downloads/comeback-tracker/src/game/ComebackCityThreeKartRace.jsx (createScene env setup near :2859; attachTripoKartBody :892-919 for the hero body; road material :1026-1032; ground :1048-1051)`

**Steps:**
1. Build a PMREM env once in createScene: `new PMREMGenerator(renderer)` + three's RoomEnvironment (examples import), dispose the generator after `.texture` is taken. Do NOT set scene.environment globally at first — that would hit road (:1026) AND ground (:1050) simultaneously (two variables).
2. Step 1 (kart only): in attachTripoKartBody (:892-919), identify metal-read parts (single fused mesh — so this is likely a whole-body MeshStandardMaterial swap keeping the baked map, metalness ~0.35 roughness ~0.45, `envMap` set directly on the material, envMapIntensity ~0.6) vs keeping MeshToonMaterial. If the fused mesh makes partial-metal impossible without new art, evaluate MeshMatcapMaterial with a small authored matcap as the alternative — pick ONE via A/B, don't ship both.
3. Step 2 (separate A/B): set scene.environment = envTexture with envMapIntensity tuned down on road (:1026-1032) and ground (:1050) so wet-asphalt sheen appears without washing out the toon world.
4. Each step: before/after captures, FPS run, owner approval. Toon-vs-PBR mixing risks breaking the cel look — the kill criterion is the owner capture review, decided per step.
5. Bundle note: RoomEnvironment + PMREMGenerator are already inside three; delta should be ~0 — confirm with test:bundle.

**Acceptance criteria:**
- [ ] Hero kart body shows moving specular highlight in a turntable/chase capture without losing the toon read of the driver.
- [ ] FPS floor holds (PMREM generation is one-time; runtime cost is sampler lookups).
- [ ] scene.environment step shipped ONLY if its own A/B is approved; otherwise kart-material-only ships.
- [ ] No changes to GLB assets on disk (runtime material swap only; asset pipeline untouched).

**Verification:**
- npm run test:kart-playable && npm run test:visual
- npm run assets:check   # proves no asset files were modified
- node scripts/phase5-sustained-capture.mjs before/after
- npm run test:bundle
- npm run build && npm run race:proof:capture && npm run race:proof:compare   # baselines regen post-approval

**Perf gate:** phase5-sustained-capture within noise both steps; 45/30 floor

---


## Phase C — The Big Bake: repeatable headless Blender bake pipeline (buildings, road strips, village props, ground AO) with provenance + regression guards

### C0 — ⛔ RETIRED (Amendment 1: merged into A1) — Restore the deleted baked GLBs and land the bake-regression guard first

> **Do not execute as written.** The restore + loud-404 + proof assert live in A1; only this task's hash-manifest guard (`bake-artifact-guard` in `assets:check`) survives, relocated into C4. Text kept for reference.

**Why:** public/baked-buildings.glb and public/baked-spike.glb are deleted from the working tree (unstaged; both still tracked in git per `git ls-files public/`), while ComebackCityThreeKartRace.jsx:3706 still fetches '/baked-buildings.glb' — silent 404, silent procedural fallback, visual downgrade nobody notices. Guarding this exact failure class before building more bake outputs prevents repeats.

**Effort:** hours · **Depends on:** — · **Owner gate:** Confirm the public/*.glb deletion was accidental, not an intentional bundle trim, before restoring

**Files:**
- `public/baked-buildings.glb (deleted, tracked)`
- `public/baked-spike.glb (deleted, tracked)`
- `src/game/ComebackCityThreeKartRace.jsx:3685-3700 (?bakedSpike=1 loader), :3705-3744 (baked-buildings loader with silent error callback)`
- `scripts/bake-artifact-guard.mjs (new)`
- `package.json:44-52 (assets:* scripts)`

**Steps:**
1. Confirm with owner the deletion was accidental (see open questions); if so run `git restore public/baked-buildings.glb public/baked-spike.glb` — deletion is unstaged so last-committed bytes come back instantly.
2. Create scripts/bake-artifact-guard.mjs: (1) read a checked-in registry asset-pipeline/bakes/bake-manifest.json listing every runtime-referenced bake output {repoPath, sha256, referencedBy}; (2) statically scan src/game/ComebackCityThreeKartRace.jsx (and later files) for string literals matching /\/baked-[\w-]+\.glb/ and imports from src/assets/game/baked/; (3) fail (exit 1) if any referenced file is missing from disk, missing from the registry, or hash-mismatched against the registry.
3. Seed bake-manifest.json with the two restored GLBs (sha256 via node crypto, same format as promote-approved-assets.mjs:33-36).
4. Add npm script "assets:bake:guard": "node scripts/bake-artifact-guard.mjs" and append it to the "assets:check" chain in package.json:52 so existing CI invocations of assets:check inherit the guard.

**Acceptance criteria:**
- [ ] Both GLBs exist in public/ and load in the runtime (no 404 in devtools network tab on /#race).
- [ ] With either GLB deleted, `npm run assets:bake:guard` exits nonzero naming the missing file and the referencing source line; with files present and hashes matching it exits 0.
- [ ] `npm run assets:check` now includes the guard and passes.

**Verification:**
- git restore public/baked-buildings.glb public/baked-spike.glb && npm run assets:bake:guard
- mv public/baked-buildings.glb /tmp/x.glb && npm run assets:bake:guard; echo exit=$? (expect nonzero); mv /tmp/x.glb public/baked-buildings.glb
- npm run assets:check
- npm run build && npx vite preview → open /?bakedSpike=1#race and verify the baked shell renders on the gym sweeper

---

### C1 — Extract the runtime track sampler into a pure shared module (single source of truth for JS→Blender geometry)

**Why:** The bake exporter must reproduce the exact runtime road geometry or baked shadows will misregister. Today the sampler math lives inside the 4600-line JSX (TRACK_SAMPLES=112 at :101; makeElevation :225-235; makeTrackCurve with CatmullRom(closed, 0.38) :237-242; makeWidthTable N=224 with 14 smoothing passes :246-263; makeSampler with lane*width*0.44 offset :265-293) where node scripts cannot import it — which is exactly why scripts/blender/export-spike-segment.mjs:13-26 drifted stale (it hardcodes bridge band {from:0.52, peak:16, to:0.75} + a second bump, but comebackCity.js:32 now says {from:0.4, peak:21, to:0.534}).

**Effort:** hours · **Depends on:** C0 · **Owner gate:** none

**Files:**
- `src/game/ComebackCityThreeKartRace.jsx:87-101, 219-293`
- `src/game/race/track/trackSampler.js (new)`
- `src/game/race/tracks/comebackCity.js:32 (elevation truth, read-only)`
- `src/game/race/tracks/penguinVillage.js:67 (elevation truth, read-only)`

**Steps:**
1. Create src/game/race/track/trackSampler.js exporting TRACK_SAMPLES, wrap01, crestProgressFor, makeElevation, makeTrackCurve, makeWidthTable, makeSampler — moved verbatim (it already only depends on THREE and trackDef data).
2. Import those symbols in ComebackCityThreeKartRace.jsx and delete the local copies; do not change any math (CatmullRom tension 0.38, closed=true, width table 224/14 passes, lane multiplier 0.44).
3. Do NOT modify track data files (comebackCity.js, penguinVillage.js) or raceBreakables.js/raceCrossers.js — they are consumed, not modified.
4. Note the module is .js (not .jsx) specifically so scripts/blender/export-track-bake-data.mjs (C2) can import it under plain node.

**Acceptance criteria:**
- [ ] Runtime behavior byte-identical: all kart gates pass with no threshold changes.
- [ ] node -e "import('./src/game/race/track/trackSampler.js').then(m=>console.log(typeof m.makeSampler))" prints 'function' (node-importable).
- [ ] No remaining local definitions of makeSampler/makeElevation/makeWidthTable inside the JSX.

**Verification:**
- npm run test:kart-playable
- npm run test:race
- npm run test:track-visuals
- npm run build
- grep -n 'const makeSampler' src/game/ComebackCityThreeKartRace.jsx (expect no hits)

---

### C2 — Full-track bake-data exporter (generalizes export-spike-segment.mjs to whole loops, both tracks)

**Why:** The proven JS→Blender mechanism is: a node script imports the course data, rebuilds the same CatmullRomCurve3, samples world-space frames {x,y,z,nx,nz,curvature} into tmp/baked-spike/segment.json, and the headless Blender script reads that JSON with plain open() and rebuilds geometry in Blender coords (x, -z_game, y_game) — bake-spike-segment.py:15-41. Generalizing it to full loops + per-sample width unlocks road-strip and full-scenery bakes for both tracks.

**Effort:** day · **Depends on:** C1 · **Owner gate:** none

**Files:**
- `scripts/blender/export-spike-segment.mjs (reference; superseded)`
- `scripts/blender/export-track-bake-data.mjs (new)`
- `src/game/race/tracks/index.js (trackByKey — pure data import)`
- `src/game/race/track/trackSampler.js (from C1)`

**Steps:**
1. Write scripts/blender/export-track-bake-data.mjs taking --track comeback-city|penguin-village. Use trackByKey + makeSampler from C1 — this permanently fixes the stale-elevation bug in export-spike-segment.mjs:13-26.
2. Sample the FULL closed loop at 448 samples (4× TRACK_SAMPLES for bake fidelity): per sample emit {progress, x, y, z, nx, nz, curvature, width: sampler.widthAt(p)} — width must come from the smoothed ribbon table, not mainRoadWidth (the spike used constant 50; penguin village varies 58→64→58→60 per penguinVillage.js:32-37).
3. Also emit: trackLength, palette (penguinVillage.js:97-121 / comeback defaults), elevation band, and an occluders list — building-swap anchor positions/footprints from courseV2 districtAnchors + OPENING_FACADES progress/side (ComebackCityThreeKartRace.jsx:1699-1705) and the large penguin-village landmarks (statues at p 0.16/0.5/0.82, igloo ring — addPenguinVillageDressing:2570-2594) so road bakes can include coarse proxy shadows.
4. Write to tmp/bakes/<trackKey>/bake-data.json. Keep the spike's segment.json writer working until C3 retires bake-spike-segment.py.
5. Reproduce the runtime road-surface Y exactly: road verts get +0.05 lift and optional banking offset (addTrack:995-1000, bankYOffsetAt:970-975 — currently 0 because no visual band sets bankingDegrees; document that assumption in the exporter).

**Acceptance criteria:**
- [ ] node scripts/blender/export-track-bake-data.mjs --track penguin-village writes tmp/bakes/penguin-village/bake-data.json with 448 samples, non-constant width across the pond sweep (64 vs 58), and palette block.
- [ ] Comeback City export elevation peaks ~21 units around progress ~0.467 (matches comebackCity.js:32, NOT the old 16@0.52-0.75).
- [ ] Round-trip parity: a small node assert in the exporter compares 8 spot samples against makeSampler().pointAt() to 1e-6.

**Verification:**
- node scripts/blender/export-track-bake-data.mjs --track comeback-city && node -e "const d=require('./tmp/bakes/comeback-city/bake-data.json');const m=Math.max(...d.samples.map(s=>s.y));console.log('peakY',m); if(Math.abs(m-21)>1.5)process.exit(1)"
- node scripts/blender/export-track-bake-data.mjs --track penguin-village (inspect width variance)
- npm run test:race (unchanged runtime)

---

### C3 — Parameterized headless Blender bake scripts: shared lib + road-strip bake + buildings + Penguin Village prop family

**Why:** bake-spike-segment.py and bake-buildings.py are one-off spikes with duplicated scene/lighting/bake boilerplate and hardcoded neon-dusk lights; the MK8 target (baked AO+sun-shadow+bounce at 256-512px) needs the same machinery re-run per track/per asset family with track-palette lighting.

**Effort:** days · **Depends on:** C2 · **Owner gate:** none

**Files:**
- `scripts/blender/bake-spike-segment.py (refactor→retire)`
- `scripts/blender/bake-buildings.py (refactor)`
- `scripts/blender/lib_bake.py (new)`
- `scripts/blender/bake-road-strip.py (new)`
- `scripts/blender/bake-village-props.py (new)`

**Steps:**
1. Extract lib_bake.py from the two existing scripts: scene reset (read_factory_settings), make_mesh-with-vertex-colors helper (bake-spike-segment.py:43-54), world+sun+rim light rig parameterized by palette JSON (dusk values at bake-buildings.py:164-181; runtime dusk truth: hemi #8d8ce0/#2a1e4a 3.3, sun #ffae72, rim #4fd8ff at ComebackCityThreeKartRace.jsx:2866-2884), Cycles bake settings block (bake-spike-segment.py:185-196: CPU, 32-48 samples, denoise, direct+indirect), and GLB export. Add an assert on bpy.app.version >= (4, 2, 0) — the scripts already use Blender-4-only APIs ('Emission Color' input at bake-buildings.py:148; mesh.color_attributes needs 3.2+). Document: Blender 4.2 LTS+, resolved via BLENDER_BIN env or /opt/homebrew/bin/blender (same convention as blender-decimate-assets.mjs:46).
2. bake-road-strip.py --data <bake-data.json> --out <png> --size 256x2048: rebuild the full-loop road deck (lanes profile like bake-spike-segment.py:56-71, using per-sample width) + curbs + a ground apron + coarse box occluders from the exported occluders list. Author UVs ANALYTICALLY (u = 0..1 left→right across the deck, v = sample_index/N) — no smart_project, so the strip maps 1:1 onto the runtime uv1 added in C5. Bake type DIFFUSE with use_pass_color=False, use_pass_direct/indirect=True (lighting-only irradiance: AO + sun shadow + bounce, no albedo — the runtime multiplies it under the tiling asphalt map). Save PNG to tmp/bakes/<track>/road-light.png. Bake the closed loop as closed geometry so v=0 and v=1 rows match (seam-free at the start line).
3. bake-buildings.py: port to lib_bake, keep the three named variants bldg-tower/bldg-block/bldg-arcade (names are load-bearing — consumed at ComebackCityThreeKartRace.jsx:3709-3711), keep COMBINED bake + 1024px, output path becomes an argument.
4. bake-village-props.py: model + bake an arctic prop family matching the procedural silhouettes in addPenguinVillageDressing (:2567-2839): igloo, ordinal-penguin ice statue, snowy lamp post, market stall, fish crate, village bench. One 512px COMBINED bake, arctic palette lighting from penguinVillage.js:97-121, exported as baked-village-props.glb with one named object per variant (prop-igloo, prop-statue, prop-lamp, prop-stall, prop-crate, prop-bench) — same swap contract as the buildings.
5. Retire bake-spike-segment.py by re-pointing it at lib_bake (or delete once C6 A/B re-capture passes); note that regenerating baked-spike.glb with corrected elevation (C2) will legitimately change its geometry.

**Acceptance criteria:**
- [ ] blender -b -P scripts/blender/bake-road-strip.py -- --data tmp/bakes/penguin-village/bake-data.json --out tmp/bakes/penguin-village/road-light.png exits printing BAKE_OK; PNG is 256x2048 lighting-only (no asphalt speckle color).
- [ ] bake-buildings and bake-village-props each export GLBs whose named variants survive a gltf inspect (node with names present).
- [ ] Each script fails loudly (nonzero) on Blender < 4.2.
- [ ] Bakes are 256-512px per governance (road strip long axis excepted, documented in bake-jobs.json).

**Verification:**
- blender --version (>= 4.2)
- BLENDER_BIN=$(which blender) node scripts/bake-assets.mjs --job road-strip-penguin-village (after C4) or direct: blender -b -P scripts/blender/bake-road-strip.py -- --data ... --out ...
- npx gltf-transform inspect tmp/bakes/village-props/baked-village-props.glb | grep prop- (all 6 variants named)

---

### C4 — npm run assets:bake driver: job orchestration + WebP post-processing + output placement

**Why:** One command must regenerate every bake deterministically (the pipeline is only 'repeatable' if nobody hand-runs blender), and outputs must land in WebP per the 2026-07-01 owner approval (KTX2 still needs separate approval).

**Effort:** day · **Depends on:** C3, C0 · **Owner gate:** none

**Files:**
- `scripts/bake-assets.mjs (new)`
- `asset-pipeline/config/bake-jobs.json (new)`
- `package.json:44-52 (add assets:bake)`
- `public/ (GLB outputs)`
- `src/assets/game/baked/ (new dir, strip textures)`

**Steps:**
1. bake-jobs.json: array of jobs {key, track?, exporterArgs, blenderScript, tmpOutputs, finalOutputs, maxBytes} covering: buildings-comeback-city, spike-comeback-city (until retired), road-strip-comeback-city, road-strip-penguin-village, village-props-penguin-village.
2. scripts/bake-assets.mjs (--job <key> to filter): (1) run export-track-bake-data.mjs; (2) spawn `${BLENDER_BIN} -b -P <script> -- <args>` and require BAKE_OK on stdout; (3) post-process LAST per pipeline rules — GLBs: `npx gltf-transform webp <in> <out>` (individual verb only; NEVER `gltf-transform optimize`); strips: PNG→WebP via sharp (available transitively through @gltf-transform/cli); (4) place outputs: GLBs → public/baked-*.glb, strips → src/assets/game/baked/<track>-road-light.webp; (5) enforce per-job maxBytes; (6) write run report to asset-pipeline/bakes/runs/<runId>/ and update bake-manifest.json hashes (consumed by the C0 guard).
3. Add "assets:bake": "node scripts/bake-assets.mjs" to package.json.
4. three r184 GLTFLoader handles EXT_texture_webp natively, and createGameGltfLoader is already used for these loads (ComebackCityThreeKartRace.jsx:3686, :3705) — no runtime loader change needed for WebP-in-GLB.

**Acceptance criteria:**
- [ ] `npm run assets:bake` on a machine with Blender 4.2+ regenerates all outputs from a clean tmp/, exits 0, and `npm run assets:bake:guard` passes immediately after (hashes updated).
- [ ] All GLB textures report image/webp in gltf-transform inspect; strip files are .webp.
- [ ] Each output is within its bake-jobs.json maxBytes; combined new-output total recorded in the run report for A4 budget accounting.
- [ ] Running with Blender missing prints an actionable error naming BLENDER_BIN.

**Verification:**
- npm run assets:bake && npm run assets:bake:guard
- npx gltf-transform inspect public/baked-buildings.glb (textures = webp)
- npm run build && npm run test:bundle (record delta vs previous report in tmp/bundle-budget/bundle-asset-budget-report.json; green gate still blocked on Phase A4 headroom)
- npm run assets:check

---

### C5 — Runtime wiring: road ribbon uv1 + baked light strip (MeshBasicMaterial path) behind ?bakedRoad=1

**Why:** The road is the biggest lit surface on screen every frame. The ribbon builds positions/uv in one loop (addTrack, ComebackCityThreeKartRace.jsx:992-1012) with uv = (0|1, index*0.4) — a REPEATING v, unusable for a lightmap — so the chosen approach is a second analytic UV set (uv1: u across 0..1, v = progress 0..1) sampling the baked strip, and switching the road from MeshStandardMaterial (:1024-1033) to MeshBasicMaterial({map: tiling asphalt, lightMap: strip}) — albedo × baked light, the same pay-lighting-once path already proven for baked-buildings (:3717). Generating lightmap UV2 in code is trivial here precisely because the ribbon is parametric; no Blender unwrap needed on the runtime mesh.

**Effort:** day · **Depends on:** C4 · **Owner gate:** A/B capture pair (current vs bakedRoad) approved via gallery flow before flipping default-on (neon-dusk art lock)

**Files:**
- `src/game/ComebackCityThreeKartRace.jsx:992-1036 (addTrack ribbon + road material), :3685 (URL-flag pattern to copy)`
- `src/assets/game/baked/<track>-road-light.webp (from C4)`

**Steps:**
1. In the vertex loop (:995-1007) also push uv1: (0, progress, 1, progress); setAttribute('uv1', Float32BufferAttribute(uv1, 2)) beside :1010.
2. Import both strips with Vite `?url` from src/assets/game/baked/ keyed by trackDef.key; load via THREE.TextureLoader with onError fallback that keeps the current MeshStandardMaterial (missing strip must never blank the road — same fallback contract as the GLB loaders :3678-3680, :3742-3743).
3. Configure strip texture: .channel = 1 (three r184 lightMap channel API → samples uv1), wrapT = RepeatWrapping (lap-seam wrap), wrapS = ClampToEdge, colorSpace = SRGBColorSpace, flipY left default (verify against bake orientation in the A/B capture — if the shadow pattern is mirrored along the track, flip v in the exporter, not at runtime).
4. Behind ?bakedRoad=1 (copy the URLSearchParams pattern at :3685): build the road as MeshBasicMaterial({ map: asphaltTexture, lightMap: strip, lightMapIntensity: 1.0, side: DoubleSide }) instead of the MeshStandard at :1026-1032. MeshBasicMaterial multiplies diffuse × lightMap and respects fog — the neon-dusk Fog('#272252',240,820) at :2861 still applies.
5. One variable per A/B: do NOT combine with C6/C7 flags in the same capture run.

**Acceptance criteria:**
- [ ] ?bakedRoad=1 shows baked sun-shadow/AO/bounce variation along both tracks with no visible seam at the start line and no misregistration against curbs.
- [ ] Without the flag or with the strip missing, rendering is pixel-identical to today.
- [ ] Desktop sustained FPS does not regress (expect improvement: PBR removed from the largest surface).
- [ ] All existing gates pass.

**Verification:**
- npm run build && node scripts/baked-spike-ab-capture.mjs (extended per C8, or manual: preview + screenshot /?raceAutoplay=1&bakedRoad=1#race vs without, same progress beat)
- node scripts/phase5-sustained-capture.mjs before/after (this is the real FPS tool; race-browser-playtest.mjs targets the legacy stack — do not use it as evidence)
- npm run test:kart-playable && npm run test:race && npm run test:track-visuals
- npm run test:bundle (strips counted under images budget)

**Perf gate:** phase5-sustained-capture shows no regression vs baseline; 45 FPS desktop floor evidence attached to the flip-on PR

---

### C6 — Runtime wiring: Penguin Village prop swaps + re-baked buildings/spike (GLB unlit path)

**Why:** The GLB attach mechanism is already proven: load, re-materialize every mesh to MeshBasicMaterial keeping the baked map, Box3-fit to the procedural footprint, remove tagged procedural children (:3705-3744 for buildings via the buildingSwaps registry filled at :1742 and :1808). Penguin Village props need the same registry pattern — its ~95 dressing props are built procedurally in addPenguinVillageDressing (:2567-2839) with no swap hooks today.

**Effort:** days · **Depends on:** C4 · **Owner gate:** Gallery A/B approval per prop family before default-on; village props are owner's ordinals-adjacent content — quality bar is 'would the group play it'

**Files:**
- `src/game/ComebackCityThreeKartRace.jsx:2567-2839 (addPenguinVillageDressing — add swap registry), :3702-3744 (loader block to extend), :1736-1781 (facade run, unchanged)`
- `public/baked-village-props.glb (from C4)`

**Steps:**
1. Thread a villageSwaps array (same shape as buildingSwaps: {group, footprint, key}) through addPenguinVillageDressing for the swappable classes only: igloos (:2584-2594), statues (:2570-2582), lamps/stalls/crates/benches (street :2645-2667, market :2730-2762, return-bend :2763-2790). Wrap each prop in a Group tagged userData.kind='procedural-prop' before world.add so the swap can remove/replace children exactly like :3732-3738. Leave icebergs, spectators, river, snow mounds, and the ICE IS NICE arch procedural (distant, animated-later, or already unlit).
2. Extend the loader block after :3744: load '/baked-village-props.glb' only when trackDef.dressing?.penguinVillage, map registry keys → GLB node names (prop-igloo etc.), clone/re-materialize to MeshBasicMaterial({map}) (:3717), Box3-footprint-fit (:3723-3731), silent-error fallback keeps procedural props (:3742-3743).
3. Register '/baked-village-props.glb' in bake-manifest.json so the C0 guard covers it.
4. Regenerate baked-spike.glb via assets:bake (elevation now correct per C2) and re-run the spike A/B; retire the ?bakedSpike flag or keep as diagnostic — owner call.
5. Do not touch raceBreakables.js/raceCrossers.js; the authored-but-dead breakables/crossers in penguinVillage.js:81-94 stay out of scope for this phase.

**Acceptance criteria:**
- [ ] With the GLB present, Penguin Village shows baked igloos/statues/props in the registered slots; with it deleted, the procedural props render (fallback proven) AND assets:bake:guard fails (regression caught).
- [ ] Prop placement/rotation identical to procedural placements (positions come from the same registry groups).
- [ ] Draw call count does not increase materially (swap replaces multi-mesh procedural groups with single baked meshes — expect a decrease; record renderer.info before/after).
- [ ] test:kart-playable passes on penguin-village (no prop encroaches the racing line — placements unchanged).

**Verification:**
- npm run assets:bake && npm run build && npm run test:kart-playable
- A/B captures on penguin village at 2-3 progress beats (extend C8 harness with --track penguin-village)
- rm public/baked-village-props.glb && npm run assets:bake:guard (expect fail), then restore
- npm run test:race && npm run test:track-visuals

---

### C7 — Ground-contact AO: single code-generated splat map on the ground plane (chosen over per-prop decals and vertex AO)

**Why:** Evaluated against the actual builders: (a) per-prop blob decals (the kart pattern at :589-618) would add ~100 transparent draw calls or a merged-overdraw mesh; (b) vertex-color darkening is useless because the ground is one PlaneGeometry(1120,1060,18,18) (:1048-1055) — ~60-unit cells can't hold a 7-unit contact gradient, and prop meshes don't include ground polys; (c) a single 1024² CanvasTexture splatted from the already-known placement positions (props :2567-2839, buildings via clearBuildingPlacement :1724-1734) applied as the ground's aoMap costs zero extra draw calls and one texture, and works for BOTH tracks. No Blender involvement — positions are runtime-computed, so this bake must live in code.

**Effort:** day · **Depends on:** — · **Owner gate:** A/B capture approval before default-on (one-variable rule)

**Files:**
- `src/game/ComebackCityThreeKartRace.jsx:1048-1055 (ground plane), :2567-2839 and :1736-1830 (placement sites to record contacts), :2866 (hemisphere light — the dominant ground illumination that aoMap modulates)`

**Steps:**
1. Collect a contacts array during scene build: every world.add of a grounded prop/building pushes {x, z, radius} (radius from prop class: igloo≈radius+2, statue≈10, lamp≈2.5, building≈footprint*0.55, etc.).
2. After dressing completes, render a 1024² canvas: fill white; for each contact draw a radial gradient rgba(0,0,0,0.55)→transparent at u=(x+560)/1120, v=1-(z+530)/1060 (plane is 1120×1060 centered at origin, rotated -PI/2 — verify v orientation with one prop empirically before batching).
3. CanvasTexture, colorSpace NoColorSpace, channel=0 explicitly (plane's own uv is 0..1 unrepeated; the grass map's repeat 16 lives on the texture transform, not the uv), assign as ground material aoMap with aoMapIntensity≈0.9. aoMap modulates indirect diffuse — hemisphere(3.3)+ambient dominate ground lighting, so splats read as soft contact shadows.
4. Flag ?groundAo=1 for the A/B; default off until approval. Karts keep their dynamic blob shadows (:589-618) — this map is static props only.
5. Note interaction: on-road contact shading comes from the C5 strip; this map covers off-road ground only — no double-darkening because road and ground are separate meshes.

**Acceptance criteria:**
- [ ] ?groundAo=1 shows soft contact darkening under igloos/statues/lamps/buildings on both tracks; splats are centered under props (no offset drift at plane edges).
- [ ] renderer.info.render.calls unchanged vs baseline (zero new draw calls).
- [ ] FPS unchanged within noise on phase5-sustained-capture.
- [ ] Flag off = pixel-identical to today.

**Verification:**
- npm run build; capture /?raceAutoplay=1&groundAo=1#race vs without at matching progress beats (C8 harness)
- node scripts/phase5-sustained-capture.mjs before/after
- npm run test:kart-playable && npm run test:race

---

### C8 — Pipeline safety: bake ledger + manifest provenance, generalized A/B capture harness, budget accounting

**Why:** House rules require hash-locked provenance (pattern exists in promote-approved-assets.mjs), owner A/B approval per change, and budget accounting; bakes currently bypass all three. The C0 guard needs ledger hashes to verify against.

**Effort:** day · **Depends on:** C4 · **Owner gate:** none

**Files:**
- `scripts/bake-assets.mjs (from C4 — ledger hooks)`
- `asset-pipeline/bakes/bake-ledger.json (new), asset-pipeline/bakes/bake-manifest.json (from C0)`
- `src/assets/game/asset-manifest.json (provenance entries)`
- `scripts/promote-approved-assets.mjs:33-36, :122-159 (hash + ledger/manifest patterns to mirror)`
- `scripts/baked-spike-ab-capture.mjs → scripts/bake-ab-capture.mjs (generalized)`
- `scripts/bundle-asset-budget-report.mjs:9-17 (thresholds; read-only)`

**Steps:**
1. Ledger: assets:bake appends to asset-pipeline/bakes/bake-ledger.json per output: {job, bakedAt, blenderVersion, blenderScriptHash, bakeDataHash, outputRepoPath, outputHash sha256, previousOutputHash} — mirroring appendLedger (promote-approved-assets.mjs:154-159) and the sha256 helper (:33-36).
2. asset-manifest.json: add/update an entry per bake output (filePath public/baked-*.glb and src/assets/game/baked/*.webp, source 'scripts/blender/<script> via npm run assets:bake', outputHash, fallback note 'runtime keeps procedural fallback') — same entry shape the promote script writes (:124-147). Orientation lab is N/A for textures/strips; baked GLB variants that introduce NEW meshes (village props) DO need one orientation-lab capture each (scripts/orientation-lab-capture.mjs) since they are new exported assets.
3. Generalize baked-spike-ab-capture.mjs into scripts/bake-ab-capture.mjs with --flag bakedRoad|groundAo|bakedSpike, --track, --progress <beats,comma-separated> (reuse its telemetry-poll capture-at-progress mechanism :29-47); write pairs into asset-pipeline/gallery/runs/<runId>/ so the existing approval-template flow picks them up.
4. Budget: record each bake output's bytes in the run report and bake-jobs.json maxBytes; run npm run test:bundle after assets:bake and store the delta — the 8.5MiB gate stays red until Phase A4 lands headroom (report currently claims 31.4MiB but predates avatar re-promotions and counts tmp proof PNGs), so the C-phase acceptance is 'delta accounted and within per-job budgets', not 'gate green'.
5. CI wiring: assets:check (already extended in C0) is the enforcement point; document in the run report that Blender is NOT required on CI — CI only verifies committed artifacts exist and match the ledger.

**Acceptance criteria:**
- [ ] Every committed bake output has a ledger entry whose sha256 matches the file; assets:bake:guard cross-checks and fails on mismatch.
- [ ] asset-manifest.json contains provenance entries for all bake outputs (same guard style as kart-proof-static-guard.mjs:59-65 uses for proof assets).
- [ ] bake-ab-capture produces before/after pairs at identical progress beats for each flag, one variable each.
- [ ] Bundle report shows the bake outputs itemized; per-job maxBytes all pass.

**Verification:**
- npm run assets:bake && node -e "const l=require('./asset-pipeline/bakes/bake-ledger.json');console.log(l.promotions?.length ?? l.bakes.length)"
- npm run assets:check
- node scripts/bake-ab-capture.mjs --flag bakedRoad --track comeback-city --progress 0.105,0.45
- npm run build && npm run test:bundle

---


## Phase D — "Make it alive": ambient animation, feel VFX, surface variety, and wiring dead track content into the shipped kart runtime

### D0 — ⚠️ DESCOPED (Amendment 5: thin wrapper over A2's instrument) — Shipped-runtime FPS/visual A/B capture harness

> **Reduced scope:** reuse A2's telemetry fields (`frameWorkMs`/`frameElapsedMs`), headed mode, and the canonical measurement environment. Build no second harness; this task only adds the A/B convenience wrapper the D tasks call.

**Why:** House rules require one-variable A/B with before/after captures and a 45/30 FPS floor, but the existing sustained-capture tool (scripts/phase5-sustained-capture.mjs:117-125) drives the LEGACY race-playtest.html route and asserts window.__raceVisualTelemetry — it never touches the shipped ComebackCityThreeKartRace runtime, whose telemetry is window.__comebackCityKartTelemetry (published at src/game/ComebackCityThreeKartRace.jsx:3375-3417 with fpsEstimate, rendererStats.drawCalls/triangles, track).

**Effort:** hours · **Depends on:** — · **Owner gate:** none

**Files:**
- `scripts/kart-fps-ab-capture.mjs (NEW)`
- `scripts/item-moment-capture.mjs (reference pattern only: spawns vite preview, ?playableAutoplay=1, waits for telemetry.renderer==='three-kart')`
- `src/game/ComebackCityThreeKartRace.jsx:3375-3417 (telemetry shape), 3436-3469 (?playableAutoplay=1, ?track=, ?character= QA params)`

**Steps:**
1. Copy the server-spawn + telemetry-wait skeleton from scripts/item-moment-capture.mjs (vite preview on a fixed port, page.goto(`/${QUERY}#race`), waitForFunction on window.__comebackCityKartTelemetry?.renderer === 'three-kart').
2. Accept env vars: KART_AB_LABEL (output subdir), KART_AB_TRACK (default 'comeback-city', also 'penguin-village'), KART_AB_QUERY (extra query params for feature flags), KART_AB_DURATION_MS (default 30000), KART_AB_VIEWPORT (desktop 1440x900 default; 'mobile' = 390x844).
3. Sample window.__comebackCityKartTelemetry every 500ms for the duration; collect fpsEstimate, rendererStats.drawCalls, rendererStats.triangles, rendererStats.meshCount, propCount, speed, routeProgress.
4. Write tmp/kart-fps-ab/<label>/summary.json with avg/min/p5 fpsEstimate, max drawCalls/triangles, plus one full-page screenshot at ~15s for the visual A/B pair.
5. Exit non-zero if min fpsEstimate < 45 on desktop viewport (< 30 for mobile) so it can be used as a hard gate; print a one-line before/after-friendly summary.
6. Sanity-run on both tracks at HEAD to record the Phase-D baseline captures (label them baseline-comeback-city / baseline-penguin-village) before any D1-D4 code lands.

**Acceptance criteria:**
- [ ] node scripts/kart-fps-ab-capture.mjs runs green on both tracks at current HEAD and produces summary.json + screenshot
- [ ] summary.json contains avg/min fps, drawCalls, triangles, and the track key actually matches KART_AB_TRACK (guard against silent fallback to default track)
- [ ] Script exits non-zero when min FPS is below the floor for the chosen viewport
- [ ] Baseline captures for both tracks committed/stored under tmp/kart-fps-ab/ (or .agent evidence dir) before D1 starts

**Verification:**
- KART_AB_LABEL=baseline-comeback-city KART_AB_TRACK=comeback-city node scripts/kart-fps-ab-capture.mjs
- KART_AB_LABEL=baseline-penguin-village KART_AB_TRACK=penguin-village node scripts/kart-fps-ab-capture.mjs
- cat tmp/kart-fps-ab/baseline-penguin-village/summary.json

**Perf gate:** Baseline captures recorded for both tracks; harness itself enforces 45 desktop / 30 mobile floor on every later run. Note: fpsEstimate is rAF-derived (frame loop at ComebackCityThreeKartRace.jsx:3778-3787), so run captures on an unthrottled foreground browser; treat suspiciously flat 60/low values as the known rAF-throttling artifact.

---

### D1 — Everything-animates ambient pass: shader-time sway (spectators, pennants), facade marquee UV-scroll, drifting ice floes, single InstancedMesh snowfall

**Why:** The MK8 target look is 'everything animates'; today every track prop is frozen via setFlatTransform (matrixAutoUpdate=false, ComebackCityThreeKartRace.jsx:295-299) and the only world motion is item boxes and boost pad chevrons. Verified: spectators and pennants are individual Groups (makePenguinSpectator 2056-2078, makePennantFlags 2288-2319), NOT InstancedMesh — so per-prop technique is shader sway on shared materials, not instanceId tricks; the only InstancedMesh in the scene is the barrier family at 1375.

**Effort:** days · **Depends on:** D0 · **Owner gate:** Screenshot pairs (before/after per sub-step) posted for owner approval per art-lock house rules; snowfall density is an owner-taste call

**Files:**
- `src/game/ComebackCityThreeKartRace.jsx:295-299 (setFlatTransform), 748-767 (getToonGradient/createToonMaterial factory — attach sway helper next to it), 732-746 (makeGlowTexture, reuse for snow), 1736-1781 (addOpeningFacadeRun: sign bar 1763-1769, facade plane 1770-1777), 1795 (openingFacades gate), 2056-2078 (makePenguinSpectator — per-call materials, hoist to shared singletons), 2288-2319 (makePennantFlags), 2688-2699 (river ice floes; only the river GROUP matrix is frozen at 2699 — floe children still auto-update), 2714-2729 (spectator placement, 16 total), 3082 (penguinVillage dressing gate), 3255-3283 (engine return object — add ambient handles), 4414 (composer.render — tick shared time uniform just before)`

**Steps:**
1. Add a module-scoped shared uniform `const AMBIENT_TIME = { value: 0 };` and helper `applyAmbientSway(material, { amp, freq })` next to createToonMaterial (~767): material.onBeforeCompile injects `uniform float uAmbientTime;` and, at `#include <begin_vertex>`, `transformed.x += sin(uAmbientTime * FREQ + modelMatrix[3].x * 0.35 + modelMatrix[3].z * 0.27) * AMP * smoothstep(0.0, 3.0, position.y);` with shader.uniforms.uAmbientTime = AMBIENT_TIME (shared object reference — no per-material tick needed). Set material.customProgramCacheKey = () => `sway-${amp}-${freq}` so patched materials share GL programs. Keep the chunk to ~3 lines for the future TSL port.
2. In the render loop immediately before engine.composer.render() (4414), set AMBIENT_TIME.value = now / 1000. matrixAutoUpdate=false stays untouched everywhere — sway is pure vertex-shader displacement.
3. Spectators: convert makePenguinSpectator's 4 per-call materials (2058-2070) to lazily-created module-level shared singletons (16 spectators currently allocate ~64 materials); apply applyAmbientSway(amp≈0.10, freq≈1.7) to the body/head/belly materials. A/B capture: penguins visibly rock in the 0.10/0.36/0.6/0.88 rail clusters.
4. Pennants: share makePennantFlags materials the same way; apply stronger sway (amp≈0.25, freq≈2.4) ONLY to the flag cone material (2306-2308), not poles/bases.
5. Facade marquee scroll (Comeback City): in addOpeningFacadeRun (1736-1781) add one thin PlaneGeometry marquee strip per facade below the emissive sign bar (y≈50*scale, in front of body z≈8), textured with a small canvas chevron/text strip (RepeatWrapping, repeat.x≈4). Push each texture into a module array; in the render loop set tex.offset.x = (now / 1000 * 0.15) % 1 (no allocation). Guarded by trackDef.dressing?.openingFacades (1795).
6. Ice floes: the four cylinders at 2688-2695 keep matrixAutoUpdate (only the parent river group is frozen). Collect them into an `ambientFloes` array returned on the engine (extend the return at 3255-3283); per frame: floe.position.x = baseX + Math.sin(now/1000 * 0.12 + i * 1.7) * 5; floe.rotation.y += dt * 0.05. Store baseX in userData at creation. 4 meshes — negligible CPU.
7. Snowfall (Penguin Village only, gated by trackDef.dressing?.penguinVillage like 3082): ONE THREE.InstancedMesh — PlaneGeometry(0.5, 0.5), MeshBasicMaterial({ map: makeGlowTexture(), transparent: true, depthWrite: false, opacity: 0.85 }), count = viewport.mobile ? 280 : 500. Seed static per-instance spawn offsets once (setMatrixAt at creation only). All motion in the vertex shader via onBeforeCompile: wrap position.y with mod(spawnY - uAmbientTime * fallSpeed, VOLUME_H) and add sin drift on x; derive per-instance phase from the instanceMatrix translation column (no per-frame instanceMatrix writes, no allocation). Billboard by building the quad in view space (transformed = view-aligned) inside the same injected chunk. Per frame, only snowMesh.position.set(camera.position.x, 0, camera.position.z) to keep the volume around the player. frustumCulled = false.
8. If the billboard shader exceeds the keep-it-small rule, fallback variant (still one draw call): CPU-update instanceMatrix for 280 flakes with a single module-scoped Object3D scratch — but shader path is preferred and must be tried first.
9. Run one A/B capture per sub-step (sway / marquee / floes / snow) — house one-variable rule — and stash the four screenshot pairs for owner review.

**Acceptance criteria:**
- [ ] Spectators and pennant flags visibly sway in a penguin-village capture; motion is vertex-shader only (grep confirms no new matrixAutoUpdate=true or updateMatrix calls on dressing props)
- [ ] Comeback City facades show a scrolling marquee strip; texture offset animation allocates nothing per frame
- [ ] Ice floes drift and slowly rotate on the frozen river
- [ ] Snowfall renders as exactly ONE InstancedMesh (estimateSceneRenderStats meshCount/drawCalls delta ≤ +3 total for all of D1; snow contributes +1 draw call)
- [ ] renderer.info shows no per-frame program recompiles after warmup (customProgramCacheKey verified: patched toon materials share one program)
- [ ] No console errors on either track; npm run test:kart-playable stays green

**Verification:**
- npm run test:kart-playable
- npm run test:track-visuals
- KART_AB_LABEL=d1-after-penguin KART_AB_TRACK=penguin-village node scripts/kart-fps-ab-capture.mjs  # compare vs baseline-penguin-village
- KART_AB_LABEL=d1-after-city KART_AB_TRACK=comeback-city node scripts/kart-fps-ab-capture.mjs  # marquee-only delta vs baseline-comeback-city
- npm run dev then open http://localhost:5173/?track=penguin-village&playableAutoplay=1#race and visually confirm sway/snow/floes

**Perf gate:** avg FPS delta ≥ -2 vs baseline on BOTH tracks, min ≥ 45 desktop / ≥ 30 mobile viewport capture; drawCalls delta ≤ +3, triangles delta ≤ +2k

---

### D2 — Feel VFX: pooled instanced-quad drift sparks (replacing sin-bobbed dodecahedrons), persistent skidmark ring-buffer ribbon, boost-keyed FOV kick, optional hit screen-shake

**Why:** Drift feedback is the core MK8 feel signal; today sparks are 10 scale-pulsed dodecahedrons (created 524-538, animated 4278-4298) with no emission/lifetime and no ground trace. MK8 frame-matching: burst lifetime 0.3-0.5s, boost FOV +8-10deg; the approved tier colors already exist in DRIFT_FEEL.sparkColors (src/game/race/driftFeel.js:22 — '#F5F8FF' white → '#00E5FF' cyan → '#7EC8E8' ice → '#7B61FF' purple) and MUST be kept.

**Effort:** days · **Depends on:** D0, D1 (shared AMBIENT_TIME/glow-texture helpers land in D1; can be reordered if D1 slips by inlining the helper) · **Owner gate:** FOV kick magnitude (6 vs 8 vs 10) and shake on/off are feel calls — present capture clips for owner pick

**Files:**
- `src/game/race/render/raceVfx.js (ADDITIVE pure exports only — file is THREE-free/duck-typed and must stay that way; existing frame-function pattern at 43-63 and applier pattern at 65-108 is the architecture to copy)`
- `src/game/race/render/syncRaceMeshes.js:67-73 (legacy applier reference — do not modify, read for the frame→applier split)`
- `src/game/ComebackCityThreeKartRace.jsx:524-538 (dodecahedron spark group to replace), 543-569 (ice-trail shards — keep), 4278-4298 (spark animation block to replace), 4154-4155 (playerSample + updateVehiclePose — wheel-contact source for skidmarks), 3781-3783 (dt), 3985 (progress integration — skid stamp distance), 4040-4042/4053-4055/4065-4071/4128-4130 (spin-out sites — shake trigger), 4366-4409 (FOV: chase target at 4401-4404, lerp at 4406-4409), 4187+ (race.boostTimer usage), 3426 (reducedMotion prop — gates shake)`
- `src/game/race/driftFeel.js:22 (DRIFT_FEEL.sparkColors — read-only)`
- `scripts/race-content-playtest.mjs (add assertions for the new pure frame functions)`

**Steps:**
1. Pure logic first (raceVfx.js, additive): export `sparkEmissionFrameFor({ dt, drifting, tier, releaseFlash, sparkColors = [] })` → { spawnCount (0 when not drifting; ~90/s while drifting; 14 burst on releaseFlash), color: sparkColors[tier], lifeSeconds: 0.3 + tier * 0.06 (caps ≤0.5 per MK8), speed, spreadRadians } and `particleAgeFrameFor({ age, life })` → { alpha: 1-(age/life)^2, scale: 0.5 + age/life * 0.9 }. Plain data in/out, no THREE types — same contract style as driftSparkFrameFor (raceVfx.js:43-49).
2. Assert the new pure exports in scripts/race-content-playtest.mjs (spawnCount 0 when idle, burst on releaseFlash, life within 0.3-0.5, color equals passed tier color) so npm run test:race covers them.
3. Shipped spark applier: delete the dodecahedron group creation (524-538) and its per-frame block (4278-4298). Replace with a pooled InstancedMesh child of playerModel.group: PlaneGeometry(0.7,0.7), additive MeshBasicMaterial({ map: makeGlowTexture(), transparent, depthWrite: false }), count 48, instanceColor enabled. Module-scoped scratch Object3D + Color; ring-buffer head index; per-particle state in preallocated Float32Arrays (pos, vel, age, life). Spawn at the old anchor offsets (±(5.0), y 0.9, z -4.2 local) with outward/backward velocity kick; drive spawn/color from sparkEmissionFrameFor fed with DRIFT_FEEL.sparkColors and driftState.tier / releaseFlashTimer (same inputs the old block read at 4280-4283). Dead particles get a zero-scale matrix. No per-frame allocation.
4. Keep driftIceTrailGroup (543-569, 4299-4309) and miniTurboRing untouched — one variable at a time.
5. Skidmarks: preallocate a world-space BufferGeometry ring buffer of 256 quads — position attr (256*4*3) and RGBA color attr (256*4*4, itemSize 4 for vertex alpha), MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), frustumCulled = false, renderOrder 3. Stamp while race.drift && !race.airState.airborne every ≥1.1 world units (track lastStampProgress; distance = shortProgressDelta * sampler.length): two quads at rear-wheel ground points derived from playerSample.point ± playerSample.normal-rotated offsets (±4.3 lateral, -5 longitudinal, matching wheel positions at 465-511), y = sample.point.y + 0.08. Fade: per-frame alpha decay written only over the live quad range (bounded ≤4096 floats), color attr needsUpdate = true. Dark #0b0f16 alpha 0.55 default; icy #bfeaff alpha 0.3 when the stamp progress/lane falls in a penguinVillage ice band (reuse D3's band lookup if it has landed, else constant color — do not block on D3).
6. Boost FOV kick: single-line A/B at 4401-4404 — add `+ (race.boostTimer > 0 ? BOOST_FOV_KICK : 0)` with BOOST_FOV_KICK candidates 6/8/10 (MK8 target +8-10; existing speed term already adds up to +7 at saturation, so measure combined transient in capture). Existing lerp (4406-4409) provides the ease-in/out. Keep the miniTurbo +3.5 term.
7. Screen shake (optional, last, its own A/B): add race.shakeTimer = 0.25 at each spin-out assignment site (4040-4042, 4053-4055, 4065-4071, avalanche 4128-4130); decay race.shakeTimer -= dt near spinTimer decay (3827); after the camera position lerp (4389-4392) add deterministic jitter: camera.position.x += Math.sin(now*0.047)*0.35*(race.shakeTimer/0.25) etc. Skip entirely when reducedMotion (prop at 3426). Ship behind ?shake=0 opt-out.
8. Capture item-moment screenshots of tier-3 sparks + skidmark trail for the owner pair.

**Acceptance criteria:**
- [ ] Sparks emit only while drifting/at release, live 0.3-0.5s, use exactly DRIFT_FEEL.sparkColors tiers, render as ONE InstancedMesh (+1 draw call replacing 10 dodecahedron meshes — net drawCalls should DROP)
- [ ] Skidmarks persist behind the kart during drift, fade out over ~4-6s via vertex alpha, geometry allocation happens once (grep: no `new THREE.` inside the frame function for either system)
- [ ] raceVfx.js remains THREE-free (no three imports; new exports are plain-data functions) and npm run test:race passes with the new assertions
- [ ] Boost pads / rocket item produce a visible FOV widen ≈ +8-10deg transient (verify via engine.camera.fov logging in a manual run) with no pop (lerp intact)
- [ ] Shake absent when reducedMotion is set; ?shake=0 disables it
- [ ] No GC-driven frame spikes: fps min in a 30s capture within floor while continuously drifting

**Verification:**
- npm run test:race
- npm run test:kart-playable
- KART_AB_LABEL=d2-after KART_AB_TRACK=comeback-city node scripts/kart-fps-ab-capture.mjs  # compare vs d1-after-city
- KART_AB_LABEL=d2-after-penguin KART_AB_TRACK=penguin-village node scripts/kart-fps-ab-capture.mjs
- node scripts/item-moment-capture.mjs  # screenshot sparks/skid moments
- npm run race:proof:capture

**Perf gate:** Net drawCalls delta ≤ 0 vs pre-D2 (sparks consolidate 10 meshes → 1 instanced; skids +1); min FPS ≥ 45 desktop during sustained tier-3 drift capture

---

### D3 — Surface variety visuals: ice/snow band overlay ribbons from penguinVillage surfaceBands + start-grid and crosswalk decals

**Why:** penguinVillage.js authors real surface data (ice pond sweep with snow shoulders, lines 74-80) that is invisible in the shipped runtime — the pond reads as plain asphalt. VERIFIED: the road strip is 2 verts per cross-section row (positions/uvs at ComebackCityThreeKartRace.jsx:992-1012, single MeshStandardMaterial 1024-1033, no vertex colors), so lane-scoped banding CANNOT be painted into the existing road vertices — a translucent overlay ribbon (the buildCheckerRibbon pattern at 1059-1104 already proves the technique) is the right fit.

**Effort:** day · **Depends on:** D0 · **Owner gate:** Ice tint/alpha values vs neon-dusk art lock — screenshot pair for approval; ALSO surface owner decision: should ice get matching PHYSICS (surfacePhysics.js is ready) as a follow-up, since visual-only ice may read as a broken promise

**Files:**
- `src/game/race/tracks/penguinVillage.js:74-80 (surfaceBands — READ ONLY, consume data), 32-37 (ribbon widths)`
- `src/game/race/physics/surfacePhysics.js:60-74 (surfaceTypeAt — optional pure lookup helper, consume only)`
- `src/game/ComebackCityThreeKartRace.jsx:992-1036 (road strip builder — insertion point directly after), 1059-1104 (buildCheckerRibbon — degenerate-row guard at 1090-1098 to copy), 280-292 (sampler.pointAt: lane offset = lane * widthAt * 0.44 — the lane→world mapping for band edges), 166-168 (startProgressFor), 2647-2666 (street 'crossing' prop at p=0.22 — crosswalk anchor), 2791-2838 (ICE IS NICE start arch — grid decal anchor), 295-299 (setFlatTransform)`

**Steps:**
1. Add `addSurfaceBandOverlays(world, sampler, trackDef)` right after the road mesh build (~1036): for each trackDef.surfaceBands entry with type 'ice' or 'snow', walk index 0..TRACK_SAMPLES; skip rows outside [progressStart, progressEnd]; row verts = sampler.pointAt(progress, band.laneStart).point and sampler.pointAt(progress, band.laneEnd).point (pointAt handles the 0.44*width lane scaling, verified line 288), y += 0.09. Copy the fold-back guard from buildCheckerRibbon (1090-1098).
2. Material: MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }), renderOrder 4. Vertex RGBA: ice #cfeeff alpha 0.45 with a subtle alpha shimmer band every N rows (sells 'frozen' without a texture); snow #f5f9ff alpha 0.3. One mesh per band type (max 3 meshes for penguin village), setFlatTransform each.
3. Call it from createScene track-build path for any trackDef with surfaceBands (Comeback City has none — automatic no-op). Do NOT wire physics (surfacePhysics.applySurfaceToPhysics) in this task — visual only; physics wiring is a flagged open question for the owner.
4. Start-grid decal: canvas texture (8 grid slot boxes + checker strip, reuse makeSloganTexture canvas conventions at 2083-2113) on a PlaneGeometry spanning sampler.widthAt(start) * 0.9, placed at startProgressFor(trackDef) minus ~6 world units of progress, rotated flat, y +0.1, depthWrite false, renderOrder 4, setFlatTransform. Add for BOTH tracks (generic, reads sampler).
5. Crosswalk decals (Penguin Village): striped white/cyan plane across the road at p=0.22 (matches the penguin-crossing sign prop at 2654) and p=0.55 (fish-market — doubles as the visual telegraph line for the D4 fish-cart crosser). Same material recipe.
6. A/B capture the pond sweep and start line before/after.

**Acceptance criteria:**
- [ ] Frozen-pond section (progress 0.24-0.42) visibly reads as ice with snow shoulders in a penguin-village capture; band edges follow laneStart/laneEnd (ice stops at ±0.75 of the road, snow fills the shoulders)
- [ ] No z-fighting shimmer at race speed (polygonOffset + y-lift verified in motion capture, not just stills)
- [ ] Comeback City renders byte-identical (no surfaceBands → no overlay meshes; verify rendererStats.meshCount unchanged on comeback-city capture)
- [ ] npm run test:track-visuals still passes (overlay reads track data, never mutates it — validate-track-visuals asserts visual data cannot change compiled mechanics)
- [ ] ≤ +5 draw calls on penguin village (3 band meshes + grid + crosswalks)

**Verification:**
- npm run test:track-visuals
- npm run test:kart-playable
- KART_AB_LABEL=d3-after-penguin KART_AB_TRACK=penguin-village node scripts/kart-fps-ab-capture.mjs
- KART_AB_LABEL=d3-after-city KART_AB_TRACK=comeback-city node scripts/kart-fps-ab-capture.mjs  # must equal d2 numbers (no-op proof)
- npm run test:race

**Perf gate:** penguin-village min FPS ≥ 45 desktop; drawCalls delta ≤ +5; comeback-city capture numerically unchanged

---

### D4 — Wire dead content: snowman/ice-pillar breakables + fish-cart and penguin-march crossers into the shipped runtime via the tested pure modules

**Why:** penguinVillage.js ships 8 breakables (lines 81-90) and 2 crossers (91-94) that only the LEGACY runtime consumes (raceState.js:213-214 creates them; raceUpdateRuntime.js:201-239 is the reference integration) — the shipped market straight is inert. raceBreakables.js/raceCrossers.js are no-touch tested pure modules: consume createBreakables/updateBreakablesForFrame/breakableHitFor (raceBreakables.js:83/141/91) and createCrossers/updateCrossersForFrame/crosserHitFor/applyCrosserHitToRacer/CROSSER_TYPES (raceCrossers.js:54/77/106/169/23).

**Effort:** days · **Depends on:** D0, D2 (debris burst reuses the D2 particle pool; if D2 slips, ship break with a scale-pop only and add debris when D2 lands) · **Owner gate:** Snowman break reward ('cocoa' grant vs cosmetic-only) is an economy/feel call; crosser hit severity clip for approval

**Files:**
- `src/game/race/raceBreakables.js (READ/CONSUME ONLY — note: breakableHitFor mixes world-unit `along` with lane-unit `across` at lines 103-106)`
- `src/game/race/raceCrossers.js (READ/CONSUME ONLY — crossers move in normalized lane space with 0.35 shoulder margin, lines 84-101)`
- `src/game/race/raceUpdateRuntime.js:201-239 (reference integration — READ ONLY)`
- `src/game/race/tracks/penguinVillage.js:81-94 (data — READ ONLY)`
- `src/game/ComebackCityThreeKartRace.jsx:170-217 (createInitialRace — add breakables/crossers state), 3746-3750 (restartRace — currently drops trackDef, must pass it), 4024-4074 (march-hit block — the shipped hit-gating pattern to mirror: airborne/spinning/aurora skip, shield eats, spinTimer=ITEM_FEEL.spinDuration + spinOuts+1 + speed scale), 2507+ (makeSledCart — fish-cart mesh base), 2056-2078 (makePenguinSpectator — march-train mesh base), 2117 (makeFishCrate), 280-292 (sampler.pointAt lane mapping for mesh placement), 3375-3417 (publishTelemetry — add counters), 3255-3283 (engine return — add mesh registries)`

**Steps:**
1. State: import the two pure modules in ComebackCityThreeKartRace.jsx; in createInitialRace (170-217) add `breakables: trackDef.breakableObjects?.length ? createBreakables(trackDef) : null` and `crossers: trackDef.crossers?.length ? createCrossers(trackDef) : null` (mirrors legacy raceState.js:213-214 which passes the compiled track — trackDef carries the same top-level keys). Fix restartRace (3747) to call createInitialRace(rivalSeats, trackDef) — today it silently resets to DEFAULT_TRACK laps/startProgress on non-default tracks AND would drop the breakables; verify no existing proof test depends on the old behavior.
2. Lane-unit adaptation (breakables only, done on OUR state instance — no module edit): breakableHitFor compares world-unit along-track distance against lane-unit lateral offset (raceBreakables.js:103-106), which on a 58-wide road makes lateral position nearly irrelevant. After engine.sampler exists, scale each race.breakables.objects[i].lane by sampler.widthAt(obj.progress) * 0.44 and pass `lane: race.lane * sampler.widthAt(race.progress) * 0.44` at hit-test time so both axes are world units. Validate feel in a manual drive; if it feels wrong, fall back to the exact legacy call shape (raceUpdateRuntime.js:204-209) and record the decision.
3. Breakable meshes: new ~40-line makeSnowman (two toon spheres + coal buttons + carrot cone, shared module-level materials per D1 convention) and ice pillar (reuse the cone-shard recipe at 2607-2610, scaled up, 2-hit visual = add crack tint on first hit). Place at sampler.pointAt(progress, side) using the ORIGINAL normalized side from track data (side 0.7-0.88 lands on-road/shoulder — that is the design: obstacles on the market straight). Register in engine.breakableMeshes keyed by state key; per-frame sync: visible/scale-pop from state.broken + respawnTimer (respawn is 0 for these — broken stays broken for the race).
4. Breakable update wiring (inside the physics block, after the march-hit section 4024-4074): updateBreakablesForFrame({ breakables: race.breakables, dt }); when grounded && !spinning, call breakableHitFor with the scaled lanes; on result.broken → race.speed *= 0.9 (soft tap, snowmen are rewards not walls), debris burst via the D2 spark pool (white/ice colors), and for type 'snowman' grant race.heldItem = 'cocoa' if !race.heldItem (mirrors raceUpdateRuntime.js:210-212 — FIRST verify 'cocoa' is a valid shipped item key in src/game/race/heldItems.js ITEM_LABELS; if not, use itemForPickup(race.position) instead). icePillar 'damaged' result → crack visual only; ignore hazard spawnRequests (shipped runtime has no hazard-spawn system — document the dropped spawnRequest in a code comment).
5. Crosser meshes: fishCart = makeSledCart() (2507) + two makeFishCrate(0.5); penguinMarch = group of 4 makePenguinSpectator(0.8) spaced 3.2 units along the crossing axis. Register engine.crosserMeshes by key.
6. Crosser update wiring: updateCrossersForFrame({ crossers: race.crossers, dt, trackLength: engine.sampler.length }) each physics frame; mesh sync: sample = engine.sampler.pointAt(crosser.progress, clamp(crosser.lane, -1.35, 1.35)) (pointAt's lane*width*0.44 mapping keeps the 1.35 overshoot just off-road — verified line 288), position mesh, face travel direction (rotate y = atan2(normal.x, normal.z) * sign(direction)), waddle-bob penguins with sin(now + index) rotation.z ≤0.12.
7. Crosser hit: crosserHitFor({ crossers: race.crossers, lane: race.lane, progress: race.progress, trackLength: engine.sampler.length }) — both lanes already normalized, no scaling. Gate exactly like the march block (4029-4044): skip when airborne/spinning/aurora; shield eats the hit (shieldActive = false); otherwise call applyCrosserHitToRacer({ racer: race, crosser }) (consumes the tested severity/speed math — its racer.invincibleTimer/jumpHeight guards read undefined→0 on the shipped race object, harmless) THEN set race.spinTimer = ITEM_FEEL.spinDuration and race.spinOuts += 1 so the existing spinOutYaw presentation (3765-3766) fires.
8. Telemetry: add breakablesBroken (count of state.broken) and crosserCrossings (sum of crossedCount) to publishTelemetry (3375-3417) so captures can assert liveness.
9. Rival-vs-crosser interaction and crosserAvoidanceLanes for the rival sim: explicitly OUT of scope (rival sim has its own updateRivalRacers API, 4078-4104) — file as follow-up.
10. Manual QA drive: hit a snowman (item grant + debris), take both pillar hits, get run over by the fish cart, jump the penguin march airborne (must NOT hit — air gate).

**Acceptance criteria:**
- [ ] 6 snowmen + 2 ice pillars appear on penguin-village market/pond sections at the authored progresses; hitting a snowman breaks it (debris + item grant when hands empty), pillars take 2 hits; broken props stay down for the race
- [ ] Fish cart shuttles across p=0.55 and penguin march across p=0.82 with the authored speeds/directions; driving into one spins the player (shield eats it; airborne clears it), matching applyCrosserHitToRacer's speed penalty
- [ ] raceBreakables.js, raceCrossers.js, and penguinVillage.js diffs are EMPTY (git diff --stat confirms consume-only)
- [ ] Comeback City is untouched (no breakables/crossers keys → null state, zero new meshes; comeback-city capture numbers unchanged)
- [ ] Restart on penguin village preserves breakables/crossers AND correct laps/startProgress (restartRace now passes trackDef)
- [ ] telemetry exposes breakablesBroken/crosserCrossings and both increment during an autoplay capture
- [ ] npm run test:race still green (legacy pure-module consumers unaffected)

**Verification:**
- git diff --stat src/game/race/raceBreakables.js src/game/race/raceCrossers.js src/game/race/tracks/penguinVillage.js  # must be empty
- npm run test:race
- npm run test:kart-playable
- npm run test:track-visuals
- KART_AB_LABEL=d4-after-penguin KART_AB_TRACK=penguin-village node scripts/kart-fps-ab-capture.mjs  # assert breakablesBroken/crosserCrossings > 0 in sampled telemetry
- npm run assets:check  # no manifest drift (all props procedural)
- npm run test:bundle  # delta-check only: code-only change must not move asset budget (report is already red for pre-existing reasons)
- npm run dev → http://localhost:5173/?track=penguin-village#race manual hit/jump QA script from the last step

**Perf gate:** penguin-village capture: ~12 added meshes (8 breakables + 2 crosser rigs) must keep min FPS ≥ 45 desktop / 30 mobile; drawCalls delta ≤ +14

---


## Phase E — Character life: face-atlas expression swaps, secondary driver animation, inverted-hull outlines (5 Tripo avatars)

### E1 — Owner art intake spec: expression sheets + per-character notes (docs only)

**Why:** Everything-animates faces are the single biggest MK8-style life upgrade, and owner art is the long pole — locking the format on day 1 lets all code tasks proceed on a debug atlas in parallel.

**Effort:** hours · **Depends on:** — · **Owner gate:** Owner approves the sheet format and commits to delivering 5 expression sheets (this gates only E5 final art; E2-E4 proceed on debug atlas)

**Files:**
- `docs/KART_FACE_ART_INTAKE.md (new)`
- `src/game/ComebackCityThreeKartRace.jsx:113-121 (KART_CHARACTERS roster — names/keys the spec must match)`
- `src/assets/game/art-direction/avatars/ (existing owner reference sheets)`

**Steps:**
1. Create docs/KART_FACE_ART_INTAKE.md specifying per-character expression sheets: 3x2 grid, 6 states in fixed cell order — [0] neutral, [1] blink, [2] boost-grin, [3] hit-gasp, [4] win, [5] lose. Cell order is a runtime contract (faceAtlasOffsetFor in E2 maps index→offset).
2. Format requirements: front-facing face only, consistent framing (eye-line centered horizontally at ~55% cell height, face fills ~80% of cell), square cells at 512px delivery (downsampled to 256px cells in the final atlas), transparent-background PNG delivery, flat toon shading matching the existing baked baseColor look (no painted shadows/highlights beyond the toon style), no Nintendo trade dress.
3. Atlas build spec: per-character 768x512 WebP atlas (3 cols x 2 rows of 256px cells) assembled at intake; WebP is the owner-approved bake format (KTX2 explicitly NOT approved yet). Atlases live as EXTERNAL runtime textures (src/assets/game/textures/faces/<key>-faces.webp), not embedded in GLBs, so art can iterate without re-promoting hash-locked avatar GLBs.
4. Intake checklist (write into the doc): 1) receive sheet(s); 2) slice cells; 3) normalize framing against a template overlay; 4) assemble 3x2 atlas; 5) export WebP q~90 with alpha; 6) drop raw art in asset-pipeline/raw/ with provenance line; 7) gallery render for owner approval; 8) per-avatar Blender decal fit (E5).
5. Per-character notes: crrt-bunny is a BUNNY (long muzzle, buck-tooth option; boost-grin may bite a carrot to echo its carrot projectileSkin); tclow, seth-penguin, mizzle, layer23 are ordinal PENGUINS — beak instead of mouth, and each must keep its individual ordinal traits/colors from its baked texture (pull palettes from the baseColor JPEGs; these are NFT characters the community recognizes, fidelity matters).
6. Include a filled example row (can be the E4 debug-atlas render) so the owner sees exact framing expectations.

**Acceptance criteria:**
- [ ] docs/KART_FACE_ART_INTAKE.md exists with the 6-state cell order, framing dims, WebP atlas spec, intake checklist, and 5 per-character sections keyed by KART_CHARACTERS keys (crrt-bunny, tclow, seth-penguin, mizzle, layer23)
- [ ] Owner has acknowledged the format (message/approval note referenced in the doc)
- [ ] Cell-order contract in the doc matches the DRIVER_EXPRESSIONS order shipped in E2

**Verification:**
- test -f docs/KART_FACE_ART_INTAKE.md
- grep -n 'neutral\|blink\|boost-grin\|hit-gasp\|win\|lose' docs/KART_FACE_ART_INTAKE.md
- Cross-check character keys: grep -n "key: '" src/game/ComebackCityThreeKartRace.jsx | sed -n '1,5p' vs the doc's sections

**Perf gate:** none

---

### E2 — Pure expression state machine + driver pose frames in raceVfx.js (THREE-free)

**Why:** All face/pose behavior becomes deterministic, testable math before any renderer wiring — same pattern as the existing presentation-frame functions, and keeps the logic reusable by both runtimes.

**Effort:** day · **Depends on:** — · **Owner gate:** none

**Files:**
- `src/game/race/render/raceVfx.js (append after line 251; file currently ends at 325; existing pose frames playerVehiclePresentationFrameFor:188-212, rivalVehiclePresentationFrameFor:224-251 — do not modify, only add)`
- `scripts/race-content-playtest.mjs (fail() helper at line 323 — add assertions)`
- `src/game/race/driftFeel.js:28-39 (createDriftState — read-only reference: direction at :31, slideYaw at :36)`
- `src/game/race/rivalRacers.js:94 (totalProgressOf — read-only reference; DO NOT modify, consume its semantics)`

**Steps:**
1. Add export DRIVER_EXPRESSIONS = ['neutral','blink','boost','hit','win','lose'] — index = atlas cell index, matching the E1 doc contract.
2. Add export driverExpressionFor({ blinkSeed = 0, boostTimer = 0, finished = false, miniTurboTimer = 0, now = 0, position = 1, spinTimer = 0 }) returning the state string. Priority: finished ? (position === 1 ? 'win' : 'lose') : spinTimer > 0 ? 'hit' : (boostTimer > 0 || miniTurboTimer > 0) ? 'boost' : blink ? 'blink' : 'neutral'. Blink must be deterministic (house rule: no Math.random) — e.g. blink when ((now / 1000 + blinkSeed * 3.7) % (3.2 + (blinkSeed % 3) * 0.7)) < 0.13.
3. Add export faceAtlasOffsetFor(stateIndex, { cols = 3, rows = 2 } = {}) returning { offsetX, offsetY, repeatX, repeatY } in glTF UV convention (texture.flipY === false for GLB-loaded pipelines): repeatX = 1/cols, repeatY = 1/rows, offsetX = (stateIndex % cols) / cols, offsetY = 1 - (Math.floor(stateIndex / cols) + 1) / rows. Unit-test all 6 cells — this function is the single place the flipY convention lives.
4. Add export nearestRivalGapBehind(playerTotal = 0, rivalTotals = []) returning the smallest positive (playerTotal - rivalTotal) or null — caller supplies totals computed with totalProgressOf semantics (lap - 1 + progress) so this file stays decoupled from rivalRacers.js.
5. Add export driverPoseFrameFor({ driftActive = false, driftDirection = 0, finished = false, lookBackGap = null, lookBackThreshold = 0.012, now = 0, position = 1, spinTimer = 0 } = {}) returning { pitch, yaw, bobY }: drift head-turn yaw = driftDirection * 0.35 when driftActive; look-back yaw = 0.62 when !driftActive && lookBackGap !== null && lookBackGap < lookBackThreshold (fixed over-right-shoulder is fine for V1); win pose (finished && position === 1): bobY = Math.abs(Math.sin(now / 180)) * 0.6 + slight yaw wag Math.sin(now / 300) * 0.2; lose pose: pitch = 0.28 slump, yaw = 0; hit (spinTimer > 0): zeros (the whole-kart spinOutYaw at ComebackCityThreeKartRace.jsx:3765 already sells it). Clamp yaw to ±0.7, pitch to ±0.35. Return plain numbers only — the caller does the damped lerp.
6. Keep the file import-free and THREE-free (it currently has zero imports — additions must preserve that; these functions must survive a future TSL port untouched).
7. Extend scripts/race-content-playtest.mjs with a 'driver life' assertion block using its fail() pattern: expression priority ordering (finished beats spinTimer beats boostTimer beats blink), blink determinism (same inputs → same output; different blinkSeed → different phase), all 6 faceAtlasOffsetFor cells within [0,1], nearestRivalGapBehind ignores rivals ahead, driverPoseFrameFor clamps.

**Acceptance criteria:**
- [ ] raceVfx.js exports DRIVER_EXPRESSIONS, driverExpressionFor, faceAtlasOffsetFor, nearestRivalGapBehind, driverPoseFrameFor with zero imports added
- [ ] grep -c 'import' src/game/race/render/raceVfx.js returns 0
- [ ] npm run test:race passes including the new assertions; existing exports (lines 1-325) byte-identical
- [ ] raceBreakables.js / raceCrossers.js untouched

**Verification:**
- npm run test:race
- git diff --stat src/game/race/render/raceVfx.js scripts/race-content-playtest.mjs (only these two files change)
- node -e "import('./src/game/race/render/raceVfx.js').then(m => console.log(m.faceAtlasOffsetFor(4)))" (expect col 1 row 1 → offsetX≈0.333, offsetY=0)

**Perf gate:** none (pure math)

---

### E3 — Runtime wiring: driver rig handles + head-turn / look-back / podium poses

**Why:** Drivers are currently statues bolted to the driverMount; steering the mount from race state makes every kart read alive at zero asset cost — the highest visible-return code-only task in this phase.

**Effort:** day · **Depends on:** E2 · **Owner gate:** none (feel check via captures recommended)

**Files:**
- `src/game/ComebackCityThreeKartRace.jsx:863-888 (mountDriverAvatar — already returns rig), :3606-3611 (call site discards return), :402-404 (driverMount Group created in createGroundedKartModel), :653 (handles object), :4077 (playerTotal), :4110 (race.position update), :4149-4167 (player pose block), :4345-4364 (rival sync loop), :4378-4398 (finish tableau camera)`
- `src/game/race/render/raceVfx.js (E2 exports, read-only)`
- `src/game/race/rivalRacers.js:94 (totalProgressOf — import and consume, do not modify)`

**Steps:**
1. At the attachCharacter call site (:3604-3611), store the handle: model.driverRig = mountDriverAvatar(...). Apply pose to model.driverMount (the Group at :402-404), NOT the rig — the rig's rotation.y/position encode the lab-verified driverYaw (+X-facing Tripo convention, :876) and bbox centering (:880-884); the mount's rotation is untouched after creation so it is a free pose channel.
2. Import driverPoseFrameFor + nearestRivalGapBehind from './race/render/raceVfx.js' (this runtime does not import raceVfx today — new import is clean).
3. Player wiring (after updateVehiclePose, :4167): playerTotal is already computed at :4077 inside the physics block — hoist it (or recompute: (race.finished ? race.laps : race.lap - 1) + race.progress) and build rivalTotals = race.rivals.map(totalProgressOf). Call driverPoseFrameFor({ driftActive: race.driftState.active, driftDirection: race.driftState.direction, finished: race.finished, lookBackGap: nearestRivalGapBehind(playerTotal, rivalTotals), now: race.raceTime * 1000, position: race.position, spinTimer: race.spinTimer }). Apply with the codebase's damped-lerp idiom: mount.rotation.y = lerp(mount.rotation.y, pose.yaw, 1 - Math.pow(0.0001, dt)); same for rotation.x → pose.pitch; mount.position.y = baseY + pose.bobY, where baseY is captured once when the mount is positioned (attachTripoKartBody sets it at :917, attachAuthoredKartBody at :940 — snapshot mount.userData.baseY there).
4. Rival wiring (inside :4345-4364 loop): rival win/lose at tableau = totalProgressOf(racer) > playerTotal; call driverPoseFrameFor({ finished: race.finished, position: totalProgressOf(racer) > playerTotal ? 1 : 2, spinTimer: racer.spinTimer, driftActive: false, lookBackGap: null, now: race.raceTime * 1000 + index * 400 }) — the +400ms stagger keeps podium bounces from syncing robotically.
5. Null-safety: if the avatar GLB failed to load (loadKartAssets catches to null, :790-796), driverMount is empty — rotating an empty Group is harmless; no guard needed beyond mount existence.
6. Capture a before/after A/B: 10s webm at the drift hairpin + a finish tableau still, one variable (poses on/off via a temporary const), per house rules; attach to the PR.

**Acceptance criteria:**
- [ ] Driver visibly turns head/torso into drifts (direction matches driftState.direction), looks back when a rival is within ~0.012 total-progress behind, bounces on win and slumps on lose at the finish tableau — verified in captures for player AND rivals
- [ ] Kart body pose (updateVehiclePose) and rig fit transform are untouched; only driverMount rotation/position animate
- [ ] npm run test:kart-playable and npm run test:race pass; no new console errors
- [ ] FPS unchanged within noise on scripts/phase5-sustained-capture.mjs (pose math is O(4) lerps/frame)

**Verification:**
- npm run test:race
- npm run test:kart-playable
- npm run build && npm run race:proof:capture
- node scripts/phase5-sustained-capture.mjs (compare to committed Phase 5 baseline)
- Manual: npm run dev → #race → hold drift both directions, finish 1st and 4th, confirm all four pose behaviors

**Perf gate:** phase5-sustained-capture delta vs baseline within noise; 45fps desktop floor holds

---

### E4 — Face-decal runtime path with generated debug atlas (flag-gated ?faces=1)

**Why:** Proves the entire offset-swap machinery end-to-end before any Blender or owner-art work exists, so E5 becomes pure asset drop-in; approach (a) decal shell is confirmed correct — GLB inspection shows each avatar is one fused tripo_mesh_* + one tripo_mat_* + one baked baseColor JPEG with arbitrary UVs, so canvas-compositing into the face UV region (approach b) has no locatable face rect and is rejected.

**Effort:** day · **Depends on:** E2, E3 · **Owner gate:** none (debug art never ships default-on)

**Files:**
- `src/game/ComebackCityThreeKartRace.jsx:863-888 (mountDriverAvatar traverse :865-873 — decal special-case), :3583-3585 (wantsKenneyKart URLSearchParams flag pattern to copy), :3623-3646 (marchers clone the SAME driverScenes — texture-sharing hazard), :4149+ (frame loop expression application)`
- `src/game/race/render/raceVfx.js (E2 exports, read-only)`

**Steps:**
1. Add wantsFaces flag: new URLSearchParams(window.location.search).get('faces') === '1' (copy the wantsKenneyKart pattern at :3583-3585). Everything in this task is inert without the flag.
2. Add makeDebugFaceAtlas(): 768x512 canvas, 6 cells (3x2) with distinct background colors + big painted eyes/mouth + state label text, returned as THREE.CanvasTexture with colorSpace = SRGBColorSpace and flipY = false (MUST match the glTF convention baked into faceAtlasOffsetFor from E2). Place near makeQuestionTexture (:656-672) with the other canvas-texture factories.
3. In mountDriverAvatar's traverse (:865-873), special-case node.name === 'face-decal' (the exact name E5's Blender script will author): instead of the plain toon rebuild, assign new MeshToonMaterial({ alphaTest: 0.5, gradientMap: getToonGradient(), map: decalTexture }) where decalTexture is a PER-RIG clone (texture.clone(); clone.needsUpdate = true). CRITICAL: driverScenes are clone(true)'d for rival seats (:3614-3616) AND the Penguin March marchers (:3623-3646) — clone(true) shares texture instances, so mutating offset on a shared texture would puppet the marchers' faces too. Set clone.repeat.set(1/3, 1/2) and neutral offset via faceAtlasOffsetFor(0). Return the handle: extend mountDriverAvatar's return to { rig, faceDecal: { mesh, texture } | null } and update the E3 call site accordingly.
4. Until E5 GLBs contain a 'face-decal' node: when wantsFaces && !faceDecal, attach a temporary PlaneGeometry(1.6, 1.6) quad named 'face-decal' to the rig at approximate head height (bbox top minus ~20% height, pushed +Z of the rig by ~55% depth after the driverYaw rotation) with the debug-atlas material — throwaway scaffolding, deleted in E5; it exists to make the swap visibly capturable per house A/B rules.
5. Frame loop: for player (near :4274 where boostFlame state is already derived) and each rival (:4345-4364), compute state = driverExpressionFor({ blinkSeed: seatIndex, boostTimer, miniTurboTimer (player only), spinTimer, finished, position, now: race.raceTime * 1000 }); if state index changed since last frame (store on model.faceDecal.lastIndex), apply faceAtlasOffsetFor(index) to texture.offset — offset writes are uniform updates, no re-upload, so cost is negligible.
6. Teardown: in the engine disposal path, dispose the cloned decal textures (model.faceDecal?.texture.dispose()) alongside the existing material/geometry disposal.
7. Capture with ?faces=1: boost pickup (grin), snowball hit (gasp), finish 1st (win) and 4th (lose), plus 20s idle showing deterministic blinks.

**Acceptance criteria:**
- [ ] With ?faces=1: debug cells visibly swap on boost/hit/finish/blink for player and all 3 rivals; marcher penguins NEVER change face (texture-clone isolation proven)
- [ ] Without the flag: zero behavior/perf change; npm run test:kart-playable passes on the default route
- [ ] Blink cadence is deterministic across reloads (same seed → same schedule)
- [ ] All expression/offset math lives in raceVfx.js (E2); the JSX only holds wiring

**Verification:**
- npm run test:race && npm run test:kart-playable
- npm run test:track-visuals
- Manual A/B: npm run dev → '#race' vs '#race' + '?faces=1' — record 10s webm each, confirm marchers static in both
- npm run build && npm run race:proof:capture (default flags — proof baseline must not shift)

**Perf gate:** phase5-sustained-capture with ?faces=1 within noise of baseline (expected: offset writes only)

---

### E5 — Blender face-decal authoring for 5 avatars + external per-character atlas + pipeline round-trip

**Why:** This is where owner art becomes shipped faces: a curved decal shell per avatar named 'face-decal' snaps into the E4 runtime with zero code changes, and keeping the atlas as an external WebP texture means future expression art iterates without re-promoting hash-locked GLBs.

**Effort:** days · **Depends on:** E1 (owner expression art delivered), E4 · **Owner gate:** Two gates: gallery approval of decal placement per avatar, and final in-game capture approval before removing the ?faces flag

**Files:**
- `scripts/blender/add-face-decal.py (new; sibling to bake-buildings.py / targeted-decimate.py — Blender automation is owner-approved 2026-07-01)`
- `src/assets/game/models/avatars/{crrt-bunny,tclow-penguin,seth-penguin,mizzle,layer23-penguin}.glb (re-exported via pipeline, hash-locked)`
- `src/assets/game/textures/faces/<key>-faces.webp x5 (new runtime textures, loaded via ?url import + THREE.TextureLoader with flipY=false, colorSpace SRGB)`
- `src/assets/game/asset-manifest.json (avatar entries :107-113 legacy-style, :115-135 promoted-style with sourceHash/outputHash — new entries must follow the promoted format)`
- `src/game/ComebackCityThreeKartRace.jsx (swap makeDebugFaceAtlas for per-character atlas texture map keyed by KART_CHARACTERS.key; remove E4 temp quad scaffolding; remove ?faces=1 gate on owner sign-off)`

**Steps:**
1. Write scripts/blender/add-face-decal.py: import the avatar GLB; build a decal shell = subdivided plane (~100-200 tris) shrinkwrapped to the face region + ~2-3mm outward normal offset (real geometry offset — avoids polygonOffset/z-fighting entirely); name the object exactly 'face-decal'; UV-map the shell to the NEUTRAL cell region using the E2 faceAtlasOffsetFor(0) convention (u in [0, 1/3], v in [1/2, 1] pre-flip — document the exact rect in the script header and cross-check against the E2 unit test); assign a material whose baseColor references the per-character atlas; export GLB with the original tripo_node_*/tripo_mesh_*/tripo_mat_* nodes byte-preserved and the native +X facing untouched.
2. Face-region placement is per-avatar manual input (Tripo meshes have no landmarks): the script takes a config block per character (center point + radius in model space) filled in by opening each GLB once in Blender; record the 5 configs in the script.
3. Build the 5 atlases from owner art per the E1 intake checklist (256px cells, 768x512 WebP with alpha, q~90 — decal needs alpha, which is why the baked JPEG pipeline can't carry it and WebP-external is the design).
4. Runtime texture load: import the 5 webp URLs (?url), lazy-load with THREE.TextureLoader inside loadKartAssets' Promise.all (:780-797) with .catch(() => null) like the avatar GLBs — decal renders debug-magenta-free by keeping the neutral-cell fallback if the atlas fails; set flipY = false to match the E2 UV math (external TextureLoader defaults flipY=true — this is the one gotcha).
5. Pipeline round-trip per avatar (NEVER blanket 'gltf-transform optimize'; individual verbs only, compression LAST): raw export → asset-pipeline working/candidates (npm run assets:candidates) → npm run assets:gallery → OWNER APPROVAL of decal placement renders → npm run assets:promote → manifest entries regenerate with new sourceHash/outputHash (promoted format like :115-135).
6. Orientation lab is mandatory for every re-exported GLB (house rule — never guess facing): node scripts/orientation-lab-capture.mjs and confirm all 5 avatars still read +X-native at the 4 lab yaws.
7. Delete the E4 temp-quad scaffolding and debug atlas; flip faces default-on only after owner sign-off on captures of all 5 characters x 6 states.
8. Marchers (:3623-3646) keep neutral faces automatically (their material rebuild path doesn't touch offsets after the E4 clone isolation) — confirm in capture.

**Acceptance criteria:**
- [ ] All 5 avatar GLBs contain a 'face-decal' node; original tripo mesh/material/texture untouched (assets:check strict passes; orientation lab confirms facing)
- [ ] All 6 expressions render correctly on all 5 characters with real owner art; penguin beaks and bunny muzzle land on-face with no visible shell edge or z-fighting at gameplay camera distance
- [ ] asset-manifest.json has promoted-format entries (sourceHash/outputHash/approvalPath) for all 5 re-exports + provenance for the 5 atlas textures
- [ ] Owner approved gallery renders AND in-game captures; faces ship default-on
- [ ] Bundle delta from atlases ≤ ~250KB total (5 x ~50KB WebP)

**Verification:**
- npm run assets:check
- node scripts/orientation-lab-capture.mjs
- npm run assets:gallery (owner approval artifact saved under asset-pipeline/gallery/runs/)
- npm run test:kart-playable && npm run test:race && npm run test:track-visuals
- npm run build && npm run race:proof:capture && npm run test:bundle (record atlas byte delta in the report)

**Perf gate:** phase5-sustained-capture within noise (adds ~100-200 tris + 1 draw call per driver, 4 drivers); 45fps desktop / 30 mobile floors hold

---

### E6 — Inverted-hull outlines on karts + drivers only, flag-gated ?outlines=1 with FPS A/B

**Why:** A dark contour on racers is the cheapest step toward the MK8 'characters pop off the track' read under the neon-dusk palette; scoping to karts+drivers (not scene-wide) keeps the draw-call bill bounded and the art lock intact.

**Effort:** day · **Depends on:** E3 (shared rig-handle plumbing and capture baseline) · **Owner gate:** Owner picks default-on vs flag-only from the A/B captures (art-lock decision)

**Files:**
- `src/game/ComebackCityThreeKartRace.jsx:892-919 (attachTripoKartBody), :921-942 (attachAuthoredKartBody), :863-888 (mountDriverAvatar), :2887-2891 (EffectComposer chain — verified: RenderPass + UnrealBloomPass + OutputPass; three/addons OutlineEffect is a renderer-wrapper that would have to replace RenderPass' internal render call, so it is REJECTED in favor of per-object hulls), :4415-4418 (telemetry rendererStatsForFrame for draw-call deltas)`
- `scripts/baked-spike-ab-capture.mjs (pattern to copy for the A/B capture script)`

**Steps:**
1. Add helper addInvertedHullOutline(root, { color = '#0a0c18', worldWidth = 0.09 }): traverse root; for each Mesh (skip node.name === 'face-decal' and any node under a name/userData VFX marker), create hull = new THREE.Mesh(node.geometry, hullMaterial) — SHARE the geometry instance (no clone; zero extra GPU memory) — and add it as a CHILD of the source mesh so wheel spin (:4320-4323, :4360-4363) and body swaps inherit for free; hull.renderOrder = node.renderOrder.
2. hullMaterial: MeshBasicMaterial({ color, side: THREE.BackSide, fog: true }) with onBeforeCompile injecting a single line into the vertex shader after #include <begin_vertex>: 'transformed += normalize(objectNormal) * uOutlineWidth;' plus one uniform — keep the chunk to ~3 lines total (house rule: small shader chunks for the future TSL port). One shared material per outline width; widths passed via per-material uniform.
3. Width compensation: rigs are uniformly scaled to fit (fit factors at :877, :909, :935) — compute uOutlineWidth = worldWidth / rigWorldScale after rig.scale.setScalar(fit) so all karts get identical world-space line weight; pass per-rig by cloning the material only when scale differs (3 kart pipelines + drivers ≈ 4-6 material instances max).
4. Call sites: end of attachTripoKartBody (after :918 replaceBody), attachAuthoredKartBody (after :941), and mountDriverAvatar (after the fit at :884, before mount). Do NOT outline: procedural fallback kart (optional follow-up), blob shadow/contact glow (:589-618), all VFX groups (boostFlame/sparks/rings — they live outside bodyGroup/driverMount so the traverse never sees them), marchers, item boxes, scenery.
5. Gate behind ?outlines=1 (same URLSearchParams pattern, :3583-3585). Bloom note: hulls are near-black so UnrealBloomPass threshold 1.0 (:2889) ignores them — confirm no halo artifacts in capture.
6. Write scripts/outline-ab-capture.mjs cloned from baked-spike-ab-capture.mjs: same seed/camera, one variable (flag on/off), desktop + mobile viewport stills at 3 canonical shots (start grid, drift hairpin, finish tableau) + 10s webm.
7. Measure: telemetry rendererStats (:4417) draw-call delta with flag on (expect roughly +1 call per outlined mesh: hero/icesled = 1 body mesh, Kenney rig = body + 4 wheels, driver = 1-2 meshes → ~+8 to +28 calls total across 4 karts) and node scripts/phase5-sustained-capture.mjs both ways. Avatars are ~18k tris each — hulls double their vertex load; if mobile dips below 30fps, fallback plan: outline drivers only, or decimated hull source via scripts/blender/targeted-decimate.py.
8. Present A/B to owner for the default-on decision; until then the flag ships dormant.

**Acceptance criteria:**
- [ ] With ?outlines=1: consistent-width dark contour on all 4 karts + drivers; no z-fighting, no bloom halos, no outline on face-decal/VFX/shadows/scenery/marchers; without flag: zero visual or perf delta
- [ ] Draw-call delta measured and recorded (telemetry rendererStats) and within the predicted +8..+28 range
- [ ] phase5-sustained-capture: desktop ≥ 45fps sustained with outlines ON; mobile viewport ≥ 30fps (else fallback scope applied and re-measured)
- [ ] A/B capture set (3 shots x 2 states + webm) attached; one-variable rule respected

**Verification:**
- npm run test:kart-playable && npm run test:track-visuals
- node scripts/outline-ab-capture.mjs (new, cloned from scripts/baked-spike-ab-capture.mjs)
- node scripts/phase5-sustained-capture.mjs (flag off, then on — record both in the PR)
- npm run build && npm run race:proof:capture (default flags — proof baseline unchanged)

**Perf gate:** 45fps desktop / 30fps mobile floors via phase5-sustained-capture with outlines ON (not the legacy race-browser-playtest — it measures the wrong route and rAF-throttles)

---


## Risks (merged)

- **(A)** SCOPE CORRECTION (verified): RACE_RENDER_SCALE in createRaceScene.js is NOT legacy-only — ComebackCityThreeKartRace.jsx:78 imports createRaceRenderer/fitRaceRendererToCanvas from it, so A3's change hits the shipped game AND the legacy stack/CI (race-content-playtest assertions self-adjust via import, but must be rerun).
- **(A)** SCOPE CORRECTION (verified): scripts/phase5-sustained-capture.mjs is NOT currently a valid shipped-game instrument — it targets race-playtest.html (line 114), which mounts legacy ArcadeRace3D (RacePlaytestHarness.jsx:4), reads legacy-only __raceVisualTelemetry (lines 120-146), and launches headless Chromium (line 109). All prior FPS evidence including the 22.7 number measured the wrong game under rAF throttling; the new baseline is deliberately non-comparable.
- **(A)** SCOPE CORRECTION (verified): the shipped racer has NO frameWorkMs/frameElapsedMs instrumentation — publishTelemetry only exposes a 40-frame rolling fpsEstimate (ComebackCityThreeKartRace.jsx:3396, 3784-3787). A2 must add the work/elapsed split before any throttling claim can be re-verified on the shipped game.
- **(A)** SCOPE CORRECTION (verified): the bundle report never counts tmp/ — it scans dist/ only (bundle-asset-budget-report.mjs:7). The proof PNGs enter dist from src/assets/game/proof/ via static imports in comebackCityVisuals.jsx:17-18, dragged in by constants imports in WorldScene.jsx:4 / HudOverlay.jsx:26 / ArcadeRace3D.jsx:5. Also the stale report predates avatar re-promotion (avatars now 249-582 KB) and lists a dist copy of the then-present public/baked-spike.glb.
- **(A)** SCOPE CORRECTION (verified): the deleted bake GLBs are tracked at HEAD (' D' working-tree deletion only) — restore is `git checkout --`, no Blender run required; assets:bake is regeneration insurance, not the restore path. Also bake-spike-segment.py requires tmp/baked-spike/segment.json from export-spike-segment.mjs, which does not mkdir its output dir — the wrapper must.
- **(A)** Headed FPS on this Mac may be vsync-capped at 60 or 120 (ProMotion): record display refresh in evidence and gate on worst-sample FPS + frameWorkMs, not mean FPS alone, or A3 candidates could all read 'capped' and look identical.
- **(A)** A3 sharpness delta can trip race:proof:compare pixel thresholds; the only allowed fix is re-baselining reference proofs through the documented capture/approval flow — loosening compare thresholds would blind the proof gate.
- **(A)** kart-playable-proof-test asserting bakedBuildings==='active' introduces an async load race (GLB resolves after telemetry first appears) — must poll for status !== 'pending' with a generous timeout or CI flakes.
- **(A)** A4 tokens split touches three shipped import sites; a missed export (e.g. DISTRICT_VISUALS/GAME_STATUS consumers) breaks the world hub at runtime, not build time — the test:kart-playable + test:visual pair is the safety net.
- **(A)** assets:bake writes straight into public/ (scripts hardcode OUT_GLB); an accidental run after upstream script drift could silently replace approved bytes — the wrapper's hash print + git diff reminder is the guard, and re-baked variants must go through orientation-lab/approval before commit.
- **(B)** pmndrs sRGB/tone-mapping double-application (or omission) after removing OutputPass — washed-out or crushed frames; mitigated by the mandatory step-1 parity capture before any new effects are enabled, and by verifying on localhost before deploy (the CSP blob:/connect-src washout from project memory produces similar symptoms and must not be conflated).
- **(B)** postprocessing version vs three ^0.184.0 peer range — r184 renamed internals before; if the installed release doesn't support r184, B4 blocks (fallback: stay on the three-examples chain and ship B1/B2/B3 only).
- **(B)** SMAA lookup textures (~35-50 KiB gzip embedded data) plus library core against the ~158 KiB gzip headroom while the bundle budget is already failing for asset reasons — measured gate with FXAAEffect fallback is built into B4.
- **(B)** Every visual change diffs race:proof:compare baselines — intended diffs must be owner-approved and baselines regenerated in the same commit, or the proof gate loses its regression-catching value.
- **(B)** onBeforeCompile chunk names drift between three releases (output_fragment → opaque_fragment); B3 explicitly requires verifying the splice anchor against the runtime-compiled r184 shader, not memory.
- **(B)** B2 bloom-intensity lerp couples to whichever composer is live; if B4 slips, B2 must target UnrealBloomPass.strength instead — the engine.bloomPass abstraction in B2 exists to absorb this.
- **(B)** FPS baselines are polluted by rAF throttling in headless captures (audit blocker #10: 1.6ms work vs 52.9ms elapsed); all perf gates in this phase must use scripts/phase5-sustained-capture.mjs on the same machine before/after, never scripts/race-browser-playtest.mjs.
- **(C)** FPS evidence is contaminated by rAF throttling in headless captures (1.6ms work vs 52.9ms elapsed) — all perf gates in this phase must use scripts/phase5-sustained-capture.mjs and frame-work metrics, never scripts/race-browser-playtest.mjs (it targets the legacy ArcadeRace3D route, blocker #10).
- **(C)** Regenerating baked-spike.glb with the corrected elevation (C2 fixes export-spike-segment.mjs's stale bridge band 0.52/16/0.75 vs current 0.4/21/0.534) will visibly move the baked shell — all prior tmp/baked-spike A/B captures are invalid and must be re-taken before any approval claim.
- **(C)** Switching the road to MeshBasicMaterial+lightMap removes dynamic light response on the road; scene lights are static (hemi/sun/rim, no point lights found) so this should be invisible, but the A/B capture must specifically check boost/bloom moments for a dead-road read.
- **(C)** Bundle budget is already failing (31.4MiB vs 8.5, though the report is stale and counts tmp PNGs); every bake output adds bytes. Per-job maxBytes keeps this bounded, but a green test:bundle gate is blocked on Phase A4 headroom — phase C can only account, not fix.
- **(C)** Blender 4.x API drift: 'Emission Color' input naming and glTF exporter options change between majors; lib_bake.py must hard-assert bpy.app.version >= (4,2,0) or bakes will fail with obscure KeyErrors.
- **(C)** Penguin Village's bright snow bounce may wash out the road-light strip (near-white indirect everywhere); bake exposure/sun energy needs per-palette tuning, verified only via the A/B gallery, not by eyeballing Blender renders.
- **(C)** Lightmap strip lap seam: if the bake mesh isn't a truly closed loop or v-orientation is flipped vs runtime uv1, the start/finish line shows a hard lighting seam or mirrored shadows — the exporter-side flip (not runtime) is the sanctioned fix.
- **(C)** Bash tooling note from planning: line refs were verified against the current working tree on branch codex/release-v1-comebacktracker-kart-racer @ a9b7c202; the file is actively drifting (~4600 lines), so re-grep anchors before editing.
- **(D)** FPS measurement blind spot: fpsEstimate is rAF-window based (ComebackCityThreeKartRace.jsx:3784-3787) and the audit already caught a 1.6ms-work vs 52.9ms-elapsed rAF-throttling artifact on the legacy harness; the D0 harness must run foreground/unthrottled or every perf gate in this phase is noise. phase5-sustained-capture.mjs and race-browser-playtest.mjs target the LEGACY route and must NOT be used as gates for these changes.
- **(D)** onBeforeCompile program-cache explosion: without material.customProgramCacheKey, every patched material compiles its own GL program (spectators alone are ~64 materials pre-hoist). D1 must both hoist shared materials and set cache keys; verify renderer.info.programs count after warmup.
- **(D)** three r184 chunk drift: sway/snow injections anchor on '#include <begin_vertex>' in MeshToonMaterial/MeshBasicMaterial shaders; a future three upgrade or the planned TSL port breaks silent — keep injected chunks ≤3 lines and behind a single helper so there is one place to port.
- **(D)** Vertex-alpha skidmarks depend on RGBA 'color' attribute (itemSize 4) + vertexColors — confirmed supported in r184 but easy to get wrong (renders opaque black if itemSize is 3); test visually before building the fade logic on top.
- **(D)** breakableHitFor mixes world-unit along-track distance with lane-unit lateral distance (raceBreakables.js:103-106); the no-touch rule forces a consume-side lane-rescaling workaround on our own state instance — if the legacy-parity call shape is chosen instead, snowmen effectively hit regardless of lateral position on a 58-wide road.
- **(D)** restartRace (3746-3750) currently omits trackDef, so createInitialRace falls back to the default track's laps/startProgress — D4 must fix this to carry breakables state through restarts, and that latent-bug fix could shift an existing proof-test expectation; run test:kart-playable immediately after.
- **(D)** Draw-call creep across D1+D3+D4 stacks (+3, +5, +14 budgeted): individually fine, but the phase-end penguin-village capture must be compared against the ORIGINAL baseline, not the previous task's 'after', to catch cumulative regression below the 45 FPS floor.
- **(D)** Bundle budget report is already failing (31.4MiB vs 8.5) for pre-existing asset reasons; Phase D is code-only, so gate test:bundle on zero delta rather than absolute pass, or a red-but-unrelated gate will block the phase.
- **(D)** Snowfall billboard shader is the highest-complexity injection in the phase; if it fights the keep-chunks-small rule, the CPU fallback (280 flakes, one scratch Object3D) must be measured before accepting it on mobile.
- **(E)** Texture-instance sharing: driverScenes are clone(true)'d into rival seats (ComebackCityThreeKartRace.jsx:3614-3616) AND Penguin March marchers (:3623-3646); THREE's clone shares textures, so any face-offset mutation on a shared instance would animate marcher faces too — E4's per-rig texture.clone() is load-bearing and must be regression-checked in captures
- **(E)** flipY convention split: GLB-embedded textures use flipY=false, external TextureLoader defaults flipY=true — the E5 external atlas MUST set flipY=false to match faceAtlasOffsetFor's math or every expression maps to the wrong row; covered by an E2 unit test plus an E5 manual capture check
- **(E)** Avatar GLB re-export is the riskiest step in the phase: promotion is hash-locked (asset-manifest.json sourceHash/outputHash), orientation regressions have happened twice before (rivals drove tail-first), and Tripo rigs must stay +X-native — orientation lab + assets:check strict are non-negotiable gates on E5
- **(E)** Perf: avatars are ~18k triangles each; E6 hulls double vertex work on 4 drivers at 0.58-0.6 render scale — mobile 30fps floor is the likely first casualty; fallback (driver-only or decimated hulls) is pre-planned. Measure ONLY with scripts/phase5-sustained-capture.mjs — the legacy race-browser-playtest targets the wrong route and its rAF-throttled numbers are known-bad
- **(E)** Bundle budget is already failing (31.4MiB vs 8.5MiB reported, report stale): 5 new WebP atlases add real bytes; keep ≤~50KB each and record the delta in test:bundle so this phase doesn't muddy the separate budget-fix workstream
- **(E)** Owner art is the schedule long pole: 5 characters x 6 expressions of on-model NFT-ordinal art (community will notice off-model penguins); debug-atlas sequencing (E2-E4) de-risks it, but E5 cannot finish without delivery
- **(E)** Podium/look-back poses rotate driverMount, whose position differs per kart body (Tripo cowl :917 vs Kenney :940) — clip checks needed per body in E3 captures, clamps already specced (yaw ±0.7, pitch ±0.35)


## Open questions for the owner (merged across phases)

1. **Confirm the deletion of `public/baked-buildings.glb` / `baked-spike.glb` was accidental.** A1 restores them from git on that assumption; if the deletion was deliberate (e.g., a look you rejected), say so and A1 pivots to a re-bake + re-approval instead.
2. **KTX2 texture compression** remains unapproved — bakes ship as WebP until you say otherwise (KTX2 would cut GPU texture memory further; needs a loader + CSP check).
3. **Legacy ArcadeRace3D stack sunset:** the legacy route still owns some CI harnesses (blocker #10). This plan keeps it alive and verified; deciding when to migrate/retire it is out of scope here and deserves its own decision.
4. **Ice-band visuals (D3) change perceived (not actual) physics** — the frozen-pond band already has slip physics; making it *visible* may change how players drive it. Needs your playtest sign-off.
5. **Post-processing ban** (old PHASED_GAMEPLAN rule) is formally superseded when you sign off on B4's before/after FPS benchmark.
