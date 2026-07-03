# Penguin Kart Visual Gap Plan — "Could Ship on Switch"

**Status:** Fulfils the deliverable commissioned by `PENGUIN_KART_VFX_VISUAL_GAP_PROMPT.md` (previously never produced).
**Date:** 2026-07-01
**Basis:** Multi-agent audit of the render stack, asset pipeline, existing phase plans, perf budgets, and track dressing; web research on MK8's actual technical anatomy and the 2025–26 Three.js/Blender state of the art; claims spot-verified against the working tree.

---

## 0. Verdict: stay on Three.js. Do not port to Unreal.

1. **Unreal has no viable web target.** Official HTML5 export died in the UE4.23 era; UE5's only web path is pixel streaming (rented GPU servers, input latency, per-session cost) — a non-starter for a free PWA on Cloudflare Pages whose race economy derives from the tracker's shared state atom. A port produces a *different product* (native download), not a better-looking version of this one.
2. **The gap is content, not engine.** Mario Kart 8 is 720p with **zero anti-aliasing**, ~139k-triangle tracks, 256px bake textures, and textured (not modeled) character mouths. Digital Foundry attributes its look to baked GI/AO, per-section color scripting, motion density, and staged VFX — every one of which is proven in-browser (Coastal World, Bruno Simon, Ouigo, Mario-Kart-3.js). Nothing on the scorecard below requires an engine feature Three.js lacks.
3. **This repo already owns the hard part:** hash-locked Blender/Cycles bake pipeline, headless decimation, validation gates, deterministic pure-logic gameplay, CI playtests, IP provenance ledger. A port discards months of that for zero content gain, while the actual deficits are days-to-weeks of work in place.
4. Project governance already ruled this way: Unreal MCP is restricted to an optional look-dev lab and banned from the production runtime (`COMEBACK_CITY_VISUAL_PIPELINE_PHASES_2_7_GOAL.md`, research-prompts §Unreal).

**Owner's instinct is correct:** Blender (Cycles bakes, bevel/weighted-normal modeling, palette atlases) + verification passes is exactly the right method — it is literally MK8's own production technique.

---

## 1. The bar, correctly understood

MK8's perceived quality carriers, ranked (from DF/modding-community/GDC evidence):

1. Two-channel baked lighting on everything — AO (red) + sun shadow (green) per track model on UV2, plus a colored bounce/GI tint map. Sun never moves; real-time shadows only on karts.
2. Saturated-but-value-controlled albedo with per-section color scripting (each track section is its own lighting moment).
3. Specular/fresnel material glints (spec masks + small cubemap) — coins flash, metal glints, ice sheens.
4. Everything-animates trackside life (crowds, flags, billboards — cheap looping motion).
5. Staged drift/boost VFX with frame-matched timing (blue→orange→purple spark tiers).
6. Character/kart secondary animation (steer, lean, look-back; textured-mouth face swaps).
7. Restrained post (bloom; shipped with no AA) and a locked framerate with immaculate HUD.

## 2. Scorecard vs that bar (MK8 = 10)

| Category | Score | Why |
|---|---|---|
| Lighting | 2/10 | `shadowMap.enabled=false` both stacks; no IBL/env map anywhere; only baked assets (`baked-buildings.glb`, `baked-spike.glb`) are **deleted while still requested** at `ComebackCityThreeKartRace.jsx:3706` → silent 404 → procedural-box fallback |
| Materials | 3/10 | Every GLB = 1 material + 1 baseColor JPEG; no normal/rough/spec/AO maps; runtime re-clothes everything in a shared 4-band `MeshToonMaterial` (coherent, but ceiling-capped) |
| Post-processing | 4/10 | Right pattern (ACES + sRGB + threshold-1.0 UnrealBloom + OutputPass) but bloom at 30% res shimmers thin neon, no AA survives the composer, no LUT/AO/vignette, 0.58 render scale softens the whole frame |
| Track dressing | 4/10 | ~100 themed props with real intent, but a frozen diorama: nothing waddles/waves, hazard layer is dead content, one speckle texture per lap, `bankingDegrees` unused, arctic track inherits hardcoded purple fog (`#272252`, line 2861) |
| Characters/animation | 2/10 | Zero skeletal animation in the whole game (verified: no `AnimationMixer`/`SkinnedMesh`); static seated meshes + procedural lean/wheel-spin only. Widest single gap |
| VFX | 5/10 | Genre-correct staged drift tiers and full item set, but zero particle systems (`THREE.Points` unused), no skid marks/decals, no smoke/spray — everything is a fixed mesh on a sine wave |
| UI/polish | 4/10 | Framing well-gated in CI, but no animated HUD flourishes, audio deferred, and FPS evidence unreliable (see §3.A) |

**Composite ≈ 3.5/10 — and the entire gap is art/content/measurement work, not engine work.**

---

## 3. Roadmap (ordered by impact per unit effort)

### Phase A — Stop the bleeding, fix the instruments (days, pure code + rerun of existing scripts)

1. **Restore the deleted bake GLBs (regression).** Re-run `scripts/blender/bake-buildings.py` and `bake-spike-segment.py`; restore `public/baked-buildings.glb` / `baked-spike.glb`. The `?bakedSpike=1` A/B flag is already wired. Runtime cost is *negative* (unlit materials). Also: make the 404 loud — log when the fetch falls back to procedural boxes.
2. **Fix the measurement harness before believing any FPS number.** Evidence the "22.7 FPS vs 45 floor" crisis is partly instrumentation: frame *work* averages 1.6 ms while frame *elapsed* is 52.9 ms (headless rAF throttling), and `scripts/race-browser-playtest.mjs` still targets the **legacy ArcadeRace3D route** (blocker #10) so CI measures the wrong game. Fix the route, capture one real headed run (`scripts/phase5-sustained-capture.mjs`) on the target machine.
3. **Reclaim render resolution.** If real FPS clears the floor, raise `RACE_RENDER_SCALE.desktop` from 0.58 (cut from 0.92 chasing possibly-phantom FPS) toward 0.75–0.85 in `src/game/race/render/createRaceScene.js:10-13`. Softness/aliasing is the #1 "cheap web game" tell — confirmed visible in every proof screenshot. One-variable A/B per house methodology.
4. **Re-baseline the bundle budget.** The failing report (31.4 MiB vs 8.5) predates the avatar re-promotions and counts multi-MiB proof PNGs that shouldn't be in the shipping bundle; re-run `scripts/bundle-asset-budget-report.mjs` with corrected scope so Phase C has a truthful budget.

### Phase B — Pure-code cinematic pass (≈1 week, no Blender, no new art)

5. **Per-track fog + per-section color scripting.** Kill hardcoded `THREE.Fog('#272252', 240, 820)` (line 2861); drive fog/sky/hemisphere from the track palette (arctic = icy haze), then lerp fog/light/background by lap progress for 3–4 palette moments per lap. MK8's #2 quality carrier; zero runtime cost.
6. **Rim light + selective specular.** Fresnel rim (`pow(1.0−dot(N,V),3.0)`, sky-tinted) injected via `onBeforeCompile` into the shared toon factory (lines 748–767) and GLB re-materialization path (863–942). Note: `MeshToonMaterial` has **no envMap** (verified in r184), so IBL cannot help toon-shaded characters — rim injection is the correct lever. Optionally matcap/Standard + small PMREM env for hero-kart metal parts (also benefits the Standard-material road).
7. **Post chain upgrade → pmndrs/postprocessing.** One merged `EffectPass`: mipmap-blur Bloom (fixes 30%-res shimmer), SMAA (currently no AA survives the composer), Vignette, ACES tonemap last (`renderer.toneMapping = NoToneMapping`, half-float buffers), then a `.cube` LUT graded in a photo editor against the approved reference image to close the trait-card color gap. ~1–2 ms GPU; JS gzip has ~158 KiB headroom. *Needs owner benchmark sign-off (post-processing ban in PHASED_GAMEPLAN is already superseded in practice by shipped bloom).* Keep shader chunks small to ease a post-V1 WebGPU/TSL port.

### Phase C — The big bake (Blender; days per track; transformative)

8. **Bake AO + sun shadow + colored bounce for the whole track.** Generalize `bake-spike-segment.py` (it already builds around the gameplay centerline) to bake per-band strip textures for road ribbon + props, MK8-style (256–512px bakes; AO in red, shadow in green). Environment props currently have zero ground contact; this is the single biggest indie-vs-Nintendo gap. Runtime cost negative. Ship as WebP (KTX2 currently banned by PHASES_2_7_GOAL scope — needs owner decision, see §5).

### Phase D — Make it alive (≈1 week, mostly pure code)

9. **Everything-animates ambient pass.** Shader-time sway (`sin(time+instanceId)` via `onBeforeCompile`, preserving `matrixAutoUpdate=false`) for penguin spectators and pennants; UV-scroll on Comeback City signage; drifting ice floes; one InstancedMesh snowfall on Penguin Village. Static scenery is the #1 amateur tell.
10. **Feel-layer VFX.** Persistent skidmark ribbon stamped at wheel contacts (nothing is currently ever stamped on the road); pooled instanced-quad sparks/snow-spray replacing sine-bobbed dodecahedrons; boost-keyed FOV kick added to the existing `targetFov` lerp (lines 4366–4407). Frame-match MK8D footage at 0.25× speed (spark burst length, flame duration, FOV +~10°).
11. **Surface variety + wire the dead content.** Visual ice banding for the pond's physics-only `surfaceBands`; start-grid/crosswalk decals; wire the authored-but-unconsumed snowman breakables and fish-cart/penguin-march crossers (`penguinVillage.js:81–94`, tested logic in `raceBreakables.js`/`raceCrossers.js`) into the shipped runtime — consume, don't modify.

### Phase E — Character life (needs owner art, see §4)

12. **Face atlas + secondary animation.** MK8's textured-mouth trick: eye/mouth states (neutral, blink, boost-grin, hit-gasp, win, lose) as texture-offset swaps on a small atlas added to avatar GLBs, plus head-turn/look-back extending the `raceVfx.js` pose frames. Attacks the weakest category (2/10) for exactly the penguin-NFT audience the game exists for.
13. *(Optional)* Inverted-hull outlines on karts/characters only (`OutlineEffect`, backface hull) — after #6, never scene-wide on mobile.

**Deliberately deferred:** N8AO (until real FPS known), DoF (menus only), WebGPU/TSL migration (post-V1; unlocks TRAA/GTAO/compute particles).

---

## 4. Owner inputs required

| Item | What's needed |
|---|---|
| **Character sheets (offered — yes, wanted)** | Per-penguin **expression sheets** via ChatGPT Image Gen 2 (per the visual-target brief, external stock is not approved): front-facing head with eye/mouth states — neutral, blink, boost-grin, hit-gasp, win, lose. Consistent framing per character. Used for the Phase E face atlas. Optional second priority: hero-kart detail/trim sheets. |
| **Scope decisions** | (a) ~~Blender automation~~ — **APPROVED by owner 2026-07-01**; bake textures ship as WebP (KTX2 remains a separate, still-pending decision); (b) benchmark sign-off to formally supersede the post-processing ban; (c) bundle-budget re-baseline after Phase A #4. |
| **Look approvals** | Existing gallery/approval flow: baked-lighting look (Phase C), LUT grade vs the approved reference image, render-scale A/B captures. |

## 5. Method guardrails (unchanged house rules)

- One-variable A/B with before/after captures for every perf-relevant change; hold the FPS floor before adding effects.
- Orientation lab for any new/re-exported asset; never blanket `gltf-transform optimize` (individual verbs only, compression last).
- No Nintendo/Mario Kart trade dress; palette/props stay original per the IP provenance audit.
- CSP: `blob:` in `connect-src` when loading HDR/KTX2/worker-decoded assets.
