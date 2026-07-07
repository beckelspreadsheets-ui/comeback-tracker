# Penguin Kart Graphics V2 PRD — "Could Ship On Switch"

**Date:** 2026-07-02 · **Owner:** Andrew (isethius) · **Status:** v1.0 — adversarially reviewed (3-critic panel 2026-07-02; all blocking/important findings applied) · awaiting owner approval
**Supersedes nothing; consolidates:** [PENGUIN_KART_VFX_VISUAL_GAP_PLAN.md](PENGUIN_KART_VFX_VISUAL_GAP_PLAN.md) (strategy), [PENGUIN_KART_GRAPHICS_REVAMP_EXECUTION_PLAN.md](PENGUIN_KART_GRAPHICS_REVAMP_EXECUTION_PLAN.md) (task IDs A1..E6), [HIGGSFIELD_MCP_INTEGRATION_PLAN.md](HIGGSFIELD_MCP_INTEGRATION_PLAN.md) (H0–H7), [FLIPBOOK_BILLBOARD_SPEC.md](FLIPBOOK_BILLBOARD_SPEC.md), [CHARACTER_EXPRESSION_SHEET_BRIEF.md](CHARACTER_EXPRESSION_SHEET_BRIEF.md) — plus the 2026-07-02 regression incident, which added the M0 stabilization milestone.

---

## 1. Purpose

Take the shipped Three.js penguin kart racer from "impressive web prototype" (~3.5/10 vs the Mario Kart 8 bar) to "a game the Ordinals community would believe shipped on a console" — without changing engines, without breaking the FPS floors, and without violating the IP/provenance rules that protect the project.

This PRD is the single document an agent or engineer reads to know **what** we are building, **why**, in **what order**, and **when it's done**. Per-task file-level instructions live in the execution plan; this doc owns requirements, milestones, and success metrics.

## 2. Current Reality (verified 2026-07-02)

- **Engine question is settled:** Unreal ruled out with evidence (no web target; the gap is content, not engine; MK8 itself is 720p/no-AA/139k-tri tracks). Three.js r184 + Blender/Cycles bake pipeline is the locked platform.
- **Visual scorecard vs MK8 (10):** Lighting 2, Materials 3, Post-processing 4, Track dressing 4, Characters/animation 2, VFX 5, UI/polish 4. Composite ≈ 3.5 (unweighted mean).
- **Known-good baseline restored:** the 2026-07-02 incident (black-blob penguins + wrong road colors) was caused by uncommitted meshopt-compressed avatars loading through a decoder-less `GLTFLoader`, plus a half-applied track-visual experiment. The **tracked-file diffs** for both are quarantined in git stash `quarantine 2026-07-02`; the **new modules they import** (`trackVisualSchema.js`, `gltfLoader.js`, etc.) are untracked working-tree files NOT inside the stash — P0-1 must commit them before the stash is re-landed (P0-3a/P0-3b depend on both). `public/baked-*.glb` restored from HEAD; penguins verified rendering; `test:race` green.
- **Instruments are broken:** the committed FPS baseline (22.7 sustained) measured the *legacy* stack headless and is void. The bundle budget report (31.4 MiB vs 8.5) is stale and counts QA artifacts. Neither may gate anything until re-baselined (A2/A4 in M1); M0 carries an explicit gate exemption (§8).
- **Load-bearing files are uncommitted.** Untracked: `src/game/race/render/gltfLoader.js`, `raceBreakables.js`, `raceCrossers.js`, `trackVisualSchema.js`, `surfacePhysics.js`, `shortcutTriggers.js`, `src/game/audio/`, all graphics-revamp docs, `flipbook-lab.html`, `approvals-hub.html`, and the asset/proof script layer (`scripts/make-flipbook.mjs`, `scripts/capture-race-proof.mjs`, `scripts/compare-race-visuals.mjs`, `scripts/audit-game-assets.mjs`, `scripts/validate-game-assets.mjs`, `scripts/blender/`, `scripts/lib/`). Also **uncommitted modifications to tracked files**: `package.json`/`package-lock.json` (all `assets:*`, `race:proof:*`, `test:track-visuals` npm scripts exist only in the working tree) and `orientation-lab.html` (meshopt-decoder fix). A clean clone loses all of it.
- **Approval surfaces exist and work:** `approvals-hub.html` indexes the live game (debug params), orientation lab (now meshopt-capable), flipbook lab (validated), asset gallery, and capture evidence.

## 3. Product Vision

At racing speed, every frame reads like a stylized console kart racer: a sharp image with real glow on the neon, baked warm-vs-cold lighting grounding every prop, a world that is never still (waddling spectators, waving pennants, animated jumbotrons, snowfall), penguins with faces that react — grinning on boost, gasping on hit, sulking on loss — and drift sparks that stage cyan → gold → purple into a bloom that feels earned. A friend from the Ordinals group clicks a link, and their first message back is a screenshot.

## 4. Goals

1. **Composite visual score ≥ 7/10** against the MK8 rubric, with no category below 6. *Composite = unweighted arithmetic mean of the 7 categories, one decimal; owner scores each milestone from approvals-hub captures and the signed scorecard is stored alongside the evidence.*
2. **Hold the floors:** ≥45 FPS desktop, ≥30 FPS mobile, by the canonical protocol — headed browser, production build (`npm run build` + `vite preview`), `/#race`, median of 3 runs. **Reference hardware:** desktop = owner's Mac mini (M4, Chrome); mobile = iPhone 16 Pro (Safari), plugged in.
3. **Green budgets:** the bundle gate (`npm run test:bundle`) passes absolutely after A4's honest re-baseline; every new art asset carries manifest provenance + owner similarity review.
4. **Characters become the product:** all 5 avatars render compressed (bundle −10+ MB), animated (procedural secondary motion), and expressive (face atlas) — the ordinal penguins are the reason this game exists.
5. **Repeatability:** every visual system (bakes, flipbooks, expression atlases) has a one-command script and a lab page; nothing depends on manual heroics.

## 5. Non-Goals

- No engine migration (Unreal/Godot/Unity) — revisit only if a literal console/Steam SKU becomes a business goal.
- No WebGPU/TSL migration in this PRD (post-V1 candidate; new shader code stays in small injectable chunks to keep the door open).
- No audio (explicitly deferred by prior owner decision; biggest feel multiplier *after* this PRD).
- No new tracks, characters, or gameplay mechanics (the stashed banking experiment lands only as a *visual* finish behind a flag; D3 ice-physics wiring is a gated owner decision, not default scope).
- No AI-generated 3D models (Tripo + Blender remains the model pipeline) and no replacement of the 3D-captured select portraits.
- H7 (world-hub signage) is optional/anytime and carries no milestone commitment.
- No Nintendo/Mario Kart trade dress, ever. Genre conventions yes; protected expression no.

## 6. Design Pillars

1. **Baked light is the look.** Pay lighting cost offline in Cycles (MK8's own trick: AO + sun shadow + bounce at 256–512px), keep runtime unlit-cheap.
2. **Sharpness is credibility.** A soft, aliased frame reads "web demo" before any art is judged. Resolution and AA come before new effects.
3. **Everything animates.** Nothing on screen may be provably static; motion is cheap (shader time, UV offset, flipbooks) — stillness is what breaks the console illusion.
4. **Characters are the stars.** Poly budget, texture detail, animation effort, and screen framing all bias toward the penguins.
5. **Measure, then change, then prove.** One variable per change, A/B captures, FPS gate, proof re-baseline after merge. The 2026-07-02 incident is the canonical example of what skipping this costs.
6. **Provenance is a feature.** Owner-generated art only, hash-fingerprinted, similarity-reviewed — the community's IP stays clean.

## 7. Milestones

Every milestone ends with: captures in approvals-hub, owner scorecard re-rating (§4.1), applicable gates green (§8; M0 is exempt from FPS/bundle gates — instruments are re-baselined in M1), race:proof baselines re-captured, work committed.

**Runs immediately, parallel to M0:** E1 (face-art intake format lock — cell order, 3×2/512px cells, WebP external atlas). It gates only E5's final art, but the owner's expression sheets are ALREADY in production and must match the runtime contract. H0 (governance amendment) is an owner decision that can be signed any time and unblocks the H-track.

### M0 — Stabilize the ground (NEW — from the 2026-07-02 incident) · ~2–3 days
| ID | Requirement | Acceptance |
|---|---|---|
| P0-1 | Commit ALL uncommitted load-bearing state (untracked files listed in §2 **plus** modified `package.json`/`package-lock.json` and `orientation-lab.html`) in reviewable batches | fresh clone of the branch: `npm ci && npm run build && npm run test:race && npm run test:kart-playable && npm run assets:check` all pass |
| P0-2 | **Meshopt loader unification:** every GLB load routes through `createGameGltfLoader` | `grep -rn "new GLTFLoader(" src/` returns exactly one hit, inside `src/game/race/render/gltfLoader.js`; a named meshopt GLB (e.g. `mizzle.glb`) renders textured in both the game (`#race`) and orientation lab with zero console errors; one capture of each stored via approvals-hub |
| P0-3a | Re-land stashed avatar re-promotions AFTER P0-2, via gallery approval + orientation lab | all 5 avatars captured textured in the orientation lab (captures stored); total bytes under `src/assets/game/models/avatars/` decrease ≥10 MB vs HEAD (`du -sk` before/after recorded in the commit message); `npm run assets:check` passes with updated manifest hashes |
| P0-3b | Re-land stashed trackVisualSchema work **finished, behind `?trackVisuals=1`** | with the flag unset, `race:proof` comparison passes against pre-change baselines WITHOUT re-capture (default look provably unchanged); with `?trackVisuals=1`, A/B capture pair at the return-bend checkpoint stored; default-on only via the §9 gate signature |
| P0-4 | Finish A1: loud 404 fallback + `bakedBuildings` telemetry + proof assert + `assets:bake` wrapper | deleting a bake GLB makes `test:kart-playable` FAIL; `npm run assets:bake` regenerates it such that `assets:check` passes and `test:kart-playable` goes green again |
| P0-5 | Working-tree hygiene: binary asset changes land same-day with their manifest entries; `assets:check` in CI on every push | Wired: [.github/workflows/asset-integrity.yml](../.github/workflows/asset-integrity.yml) (runs `assets:check` on every push/PR). Red/green proof recorded below this table. |

**P0-5 red/green proof (2026-07-02):** deliberate red — branch `test/p0-5-red-proof` added `src/assets/game/models/red-proof-unmanifested.glb` with no manifest entry; CI failed on the "Asset audit + validation (strict, runtime scope)" step: [run 28635901452](https://github.com/beckelspreadsheets-ui/comeback-tracker/actions/runs/28635901452). Green on the work branch with manifests intact: [run 28635894478](https://github.com/beckelspreadsheets-ui/comeback-tracker/actions/runs/28635894478). Test branch deleted after recording.

### M1 — Sharp & measured (Phase A remainder) · ~3–4 days
**Tasks:** A2 (repoint FPS instrument at the shipped game; headed canonical baselines BOTH tracks; + penguin-village proof run), A3 (render scale), A4 (honest bundle re-baseline; publish Phase C headroom into §8).
**Acceptance:** canonical 3-run medians recorded for both tracks on the §4.2 reference hardware; render scale committed at the **highest** value in {0.75, 0.80, 0.85} whose medians hold ≥45/≥30, with the chosen value + medians in the milestone notes; A/B sharpness capture pair at a fixed camera checkpoint stored; `npm run test:bundle` green post-re-baseline with the Phase-C headroom figure written into §8; `test:race:browser` green (shared-code guard).
**Demo:** side-by-side sharpness capture — the "pixelated web game" tell is gone. *Score targets: UI/polish 4→5.*

**M1 milestone notes (2026-07-02):** A2 canonical baselines (headed, production build, 1440×900, median of 3, Mac mini M4 @ 144 Hz): comeback-city 144 FPS avg / 143.5 worst sample / 1.2 ms work; penguin-village 144 / 143.5 / 1.4 ms — both vsync-locked; the 22.7 figure was headless rAF throttling (same build headless: 32.5 FPS at LOWER work). A3 chose **0.85** (highest candidate; all of 0.75/0.80/0.85 held 144 FPS, worst sample 143.5): re-measured medians at 0.85 — comeback-city 143.98 avg / 143.47 worst / 1.27 ms, penguin-village 143.99 / 143.47 / 1.38 ms. Mobile scale untouched at 0.6 (no mobile instrument; ≥30 floor rests on the unchanged mobile path pending real-device sign-off). Legacy ArcadeRace3D pinned to its calibrated 0.58 via `RACE_RENDER_SCALE_LEGACY` (its headless suite's pixel thresholds are resolution-calibrated). Sharpness A/B at routeProgress 0.10: `tmp/m1-render-scale/sharpness-p0p10-{0.58,0.85}.png` (linked in approvals-hub).

### M2 — Cinematic pass (Phase B) · ~1 week
**Tasks:** B1 per-track fog/sky, B2 per-lap palette moments, B3 rim light via the single shader-injection helper, B3b hero-kart env glints **(hard-gated: owner opt-in required before starting; per-step A/B approvals)**, B4 pmndrs post chain.
**Containment:** the post chain ships behind `?post=1` and does not become default until the owner signs the ban supersession at the M2 benchmark review; if declined, B4 reverts and M2 closes on B1–B3.
**Acceptance:** each effect (bloom/SMAA/vignette/ACES/LUT slot) individually toggleable for the benchmark review; fog verified by capture on both tracks (arctic haze ≠ dusk purple); A/B pairs stored per task; FPS medians hold floors; proofs re-captured.
**Demo:** the neon finally *glows*. *Score targets: Post 4→7, Materials 3→5.*

**M2 milestone notes (2026-07-06, closed at the fast-close review):** B1 landed (owner pick V8 "storm front", additive penguinVillage.js palette keys; CC untouched by construction). B3 landed for PV (owner pick V6 "ice white" `palette.heroRim`, ships ON; toonRimShader.js is the Amendment-7 single injection home); **CC rim stays OFF — pick deliberately deferred until Phase C re-dresses the city** (rim-lab.html stays live). B2 engine landed (e4062f52: pure paletteMoments.js + createScene wiring + `?momentsLab` hook + node tests + moments-lab.html); **owner reviewed the lab and declined a pick — "all the moments are just super hard to tell a difference from" — so the shipped game is moment-LESS on every track**; the engine and lab are kept for a future pick at zero added cost (the per-frame hook is one truthy check). B4 **default-ON** per the §9 supersession signed the same day (see §9 row for details; `?post=0` = legacy chain; kart-playable's desktop finish budget extended 45s→150s because headless SwiftShader renders the pmndrs chain at ~11 FPS and the dt clamp dilates sim time ~2.3× — headed is unaffected and headless remains non-quotable). Closing verification (all at the closing commit): test:race, test:track-visuals, test:kart-playable (both tracks, post-on route), test:bundle (12.458 MiB vs 15.0) green; race:proof pass errors=0 re-captured post-flip; canonical headed medians (median of 3, Mac mini M4 @144 Hz): comeback-city 143.96 avg / 143.47 worst / 0.89 ms work, penguin-village 143.99 / 140.45 worst / 1.33 ms — both vsync-locked with the post chain on (JS frame work *dropped* vs the legacy chain). Evidence: tmp/m2-palette-lab/, tmp/m2-rim-lab/, tmp/m2-moments-lab/ (+ seam webms), tmp/m2-b4-post-chain/, phase5-capture-* dirs. **Deferred by owner's fast-close choice:** 7-category scorecard re-rating (batch at the next review), CC rim pick, M0/M1 scorecard re-rating, `?trackVisuals=1` default-on, A3 sharpness ack, excluded stash patches. Owner's strategic steer at close: incremental parameter labs are not moving the visual needle — Phase C (baked lighting + authored city visuals) jumps the queue.

### M3 — The big bake (Phase C) · ~1–2 weeks
**Tasks:** C1–C8 (track sampler extraction, whole-loop bake exporter, parameterized headless Cycles scripts, `assets:bake` driver, road-strip + village-prop + buildings wiring behind flags, ground-contact AO splat, ledger/guards).
**Acceptance:** `?bakedRoad=1` A/B pairs at 3 fixed checkpoints per track; the full bake reproduces one-command from a clean checkout (`npm run assets:bake`); **first runtime `.webp` ships here — `webp` added to `vite.config.js` workbox `globPatterns` in the same change** (else sheets/strips 404 offline, FLIPBOOK_BILLBOARD_SPEC §6.3); bake bytes within the A4-published headroom; FPS medians hold (bake should *raise* them); promotion via gallery approval + ledger.
**Demo:** the A/B toggle — crevices, contact shadows, bounce color everywhere. *Score targets: Lighting 2→7, Track 4→6, Materials 5→6 (baked light replaces flat shading on the largest visible surfaces).*

### M4 — Alive (Phase D + H4) · ~1 week
**Tasks:** D0 (descoped per Amendment 5: thin `kart-fps-ab-capture` wrapper over the A2 instrument; captures `baseline-comeback-city` + `baseline-penguin-village` BEFORE D1 lands — all D-task perf gates compare against these originals), D1 ambient motion, D2 feel VFX, D3 visible ice bands + grid decals, D4 wire breakables/crossers, H4 flipbook jumbotrons per the locked spec.
**H4 gate:** content generation is gated on the §9 H0 amendment; if H0 is unsigned by M4 start, jumbotrons ship with owner-produced/existing-footage flipbooks (same spec) and generated content drops from M4 scope.
**Acceptance:** every D-task A/B compares against the D0 originals (not the previous task's "after"); 30-second capture clip stored in which spectators, pennants, snowfall, and ≥1 jumbotron are visibly animating; breakables/crossers verified by `test:race` + capture; FPS medians hold.
**Demo:** the clip where nothing is still. *Score targets: Track 6→7, VFX 5→8.*

### M5 — Character life (Phase E + H2/H5) · ~1–2 weeks
**Tasks:** E2–E5 face atlas pipeline (state machine → debug atlas behind `?faces=1` → Blender decals → final owner-art atlases; E5 carries its per-character double gate), E2/E3 secondary animation, E6 outlines behind `?outlines=1` (default-on is a §9-noted gate), plus H2 victory/track art and H5 item icons within A4 headroom.
**Acceptance:** all 5 avatars pass the orientation lab post-decal; a `?faces=1` capture set stored — one capture per expression state per character; podium/look-back poses verified in captures; outlines FPS A/B recorded; final scorecard signed.
**Demo:** a penguin grins on boost and sulks on loss — the community screenshot moment. *Score targets: Characters 2→7, UI 5→7, Track 7→8 (H2/H3 art drops + dressing polish).*

**Score arithmetic check (§4.1):** end state Lighting 7, Materials 6, Post 7, Track 8, Characters 7, VFX 8, UI 7 → composite 50/7 ≈ **7.1** ≥ 7, no category < 6. ✔

**Content multiplier (parallel, gated):** H0 (owner signature, anytime) → H1 expression-sheet support (needs H0 + input-license comfort; ChatGPT fallback otherwise) → H3 facade refresh (after M1/A4 headroom) → H6 launch trailer (after M2, when the game films well) → H7 world-hub signage (optional, anytime).

## 8. Success Metrics & Quality Bar

- **Scorecard:** owner re-rates all 7 categories per milestone from approvals-hub captures (composite = unweighted mean, §4.1). PRD exit = composite ≥7, no category <6.
- **Performance:** canonical-protocol medians (§4.2 hardware) ≥45/≥30 at every milestone exit **from M1 onward**. M0 is exempt (instruments void until A2/A4); M0 exits on: fresh-clone build + `test:race` + `test:kart-playable` + `assets:check` all green.
- **Budgets:** `npm run test:bundle` green at every milestone exit from M1 onward; flipbook sheets ≤150 KB lossy / ≤300 KB lossless-text (spec §2); bake textures within the A4-published headroom — **A4 re-baseline (2026-07-02): thresholds total 15.0 MiB / 8500 KiB gzip / images 4.0 MiB vs measured 12.30 MiB / 7263 KiB / 1.86 MiB. Phase C headroom = 2.14 MiB of WebP bake textures (the images gate) within 2.70 MiB total raw / 1237 KiB gzip. B4's JS budget: 1400 KiB gzip threshold vs 1199 measured → ~200 KiB gzip for the pmndrs chain.** The report's `headroom` block recomputes these on every `test:bundle` run.
- **Regression armor:** race:proof baselines re-captured after every approved merge; bake-artifact guard + `assets:check` strict in CI; kart-playable proof asserts baked buildings AND runs penguin-village.
- **Community bar (measured at M4 and M5 exit):** the build link goes to ≥5 Ordinals group members; success = ≥1 unsolicited screenshot or clip posted back within 48 hours, archived alongside the milestone captures.

## 9. Owner Decision Log & Open Gates

| Decision | Status |
|---|---|
| Unreal port | ❌ Rejected — gap-plan engine verdict 2026-07-01; reinforces the earlier governance ruling banning Unreal MCP from the production runtime (visual-pipeline goal doc, June 2026) |
| Blender automation | ✅ Approved 2026-07-01 |
| Baked GLB deletion | ✅ Restored from HEAD during 2026-07-02 incident recovery; treated as accidental (owner countersigns at P0-4 review) |
| KTX2 texture compression | ⏳ Pending (WebP default until then) |
| H0 generated-art amendment (Higgsfield sources + video class) | ⏳ Pending owner sign-off; gates H1/H3/H4-generated/H6 content |
| Higgsfield input-license comfort (ordinal images as inputs; ToS grants perpetual input license) | ⏳ Pending — H1 falls back to owner-run ChatGPT if declined |
| B3b hero-kart PBR/PMREM experiment | ⏳ **Hard gate — owner opt-in required before starting** (exec plan B3b); per-step A/B approvals after |
| Post-processing ban supersession | ✅ SIGNED 2026-07-06 at the M2 close — B4 pmndrs chain (mipmap bloom + SMAA + vignette + ACES) is DEFAULT-ON on the shipped route; `?post=0` keeps the legacy UnrealBloom chain reachable for A/B/diagnosis, `?post=1` stays a no-op for older capture URLs. Owner approved the per-task gates 2026-07-06 ("every change in the post lab is amazing") and the default-on at the fast-close review the same day. Headed medians post-flip: CC 143.96 / PV 143.99 (floors hold); proof re-captured green at the closing commit. |
| trackVisualSchema default-on | ⏳ Signs at P0-3b A/B review |
| Ice-band slip physics (D3 follow-up: visible ice with/without matching physics) | ⏳ Owner playtest sign-off at M4 D3 review (exec plan open question 4) |
| Legacy ArcadeRace3D sunset | ⏳ Deferred — legacy stays alive and CI-verified through this PRD (Amendment 10); retirement is a separate decision (exec plan open question 3) |
| E6 outlines default-on | ⏳ Signs at M5 review after FPS A/B |
| Expression sheets (5 characters) | 🔄 In production by owner per brief (format locked by E1, which runs during M0) |

*This table tracks standing/strategic gates only; per-task A/B and feel gates (A3 scale pick, B1 palette diff, D1 snowfall density, D2 FOV-kick/shake feel, D4 snowman-reward economy, C6 `?bakedSpike` retirement, E5 per-character double gate) are defined in each task's Owner-gate field in the execution plan and are settled at that task's review.*

## 10. Risks

1. **Real FPS is unknown until A2** — all visual headroom assumptions could tighten on real numbers. Mitigation: A2 is the first M1 task; every effect ships behind a flag until its A/B passes.
2. **Working-tree drift recurs** (the incident's root cause). Mitigation: M0 commits everything, CI guards, same-day-landing rule (P0-5).
3. **Bake quality needs iteration** — first Cycles outputs rarely match the art target. Mitigation: candidate/promotion flow with gallery approval; spike segment (`?bakedSpike=1`) as the fast iteration loop.
4. **Owner-throughput bottleneck** — approvals and art are single-threaded through Andrew. Mitigation: approvals-hub batches reviews; milestones sized so each needs ~one review session; the §9 table makes pending signatures visible.
5. **Scope seduction** — new ideas (audio, tracks, multiplayer) compete for attention. Mitigation: §5 non-goals; new ideas go to the backlog, not the milestone.

## 11. References

Execution detail: [PENGUIN_KART_GRAPHICS_REVAMP_EXECUTION_PLAN.md](PENGUIN_KART_GRAPHICS_REVAMP_EXECUTION_PLAN.md) (task IDs used above) · Strategy/scorecard: [PENGUIN_KART_VFX_VISUAL_GAP_PLAN.md](PENGUIN_KART_VFX_VISUAL_GAP_PLAN.md) · Generated art: [HIGGSFIELD_MCP_INTEGRATION_PLAN.md](HIGGSFIELD_MCP_INTEGRATION_PLAN.md) · Billboards: [FLIPBOOK_BILLBOARD_SPEC.md](FLIPBOOK_BILLBOARD_SPEC.md) · Art intake: [CHARACTER_EXPRESSION_SHEET_BRIEF.md](CHARACTER_EXPRESSION_SHEET_BRIEF.md) · Fresh-context handoff: [GRAPHICS_REVAMP_HANDOFF_PROMPT.md](GRAPHICS_REVAMP_HANDOFF_PROMPT.md) · Approval surfaces: `approvals-hub.html` (vite dev) · Original game PRD: [comeback-city-kart-racer-prd.md](comeback-city-kart-racer-prd.md)
