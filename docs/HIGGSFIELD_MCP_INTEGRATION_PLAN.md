# Higgsfield MCP Integration Plan — Generated Art Pipeline

**Date:** 2026-07-01 · **Position in the stack:** ADDITIVE. The graphics unlock is [PENGUIN_KART_GRAPHICS_REVAMP_EXECUTION_PLAN.md](PENGUIN_KART_GRAPHICS_REVAMP_EXECUTION_PLAN.md) (Phases A–E). Higgsfield is a **content multiplier** on top: it accelerates the owner-art pipeline and adds 2D/animated dressing. No H-task may displace or delay an A–E task.
**Provenance basis:** grounded in a docs audit of `race-visual-target-brief.md`, `race-ip-provenance-audit.md`, `race-owner-review-packet.md`, the asset manifest, and the promotion tooling; and in web research on the Higgsfield MCP (findings marked verified/likely at research time — re-verify tool names after connecting, the surface evolves).

---

## 1. What the Higgsfield MCP gives us (capability snapshot)

- **Official hosted server:** `claude mcp add --transport http --scope user higgsfield https://mcp.higgsfield.ai/mcp`. Auth is browser OAuth (no API keys) — first auth is interactive; afterward the cached token works for scripted runs on the same machine. Do **not** use the unofficial `jfikrat/higgsfield-mcp` GitHub server (reverse-engineered, Chrome-daemon based, not headless-safe).
- **Images:** 30+ models incl. **GPT Image 2** (same family as the already-approved "ChatGPT Image Gen 2"), Nano Banana Pro (4K, strong text rendering, inpainting), Soul 2.0, Flux 2.0, Seedream. Up to 4K, reference-image conditioning supported (multi-image).
- **Character consistency:** **Soul character training** — ~20 reference photos, ~5 min, ~40 credits per character; the trained character is then a reusable ID across unlimited image/video generations.
- **Video:** Sora 2, Kling 3.0, Veo 3.1, Seedance 2.0, etc.; clips ≤15 s. Key feature for us: **Kling first/last-frame control** — passing the SAME image as first and last frame yields a seamless loop (Higgsfield documents this workflow).
- **Pricing (likely, verify on your plan):** credit-based; images ~2 cr, Kling videos ~6 cr, Sora 2/Veo 3.1 ~40–70 cr, Soul training ~40 cr. Plans: Starter $15/70 cr, Plus $49/1,000 cr, Ultra $129/3,000 cr.

## 2. ⚠️ Legal/IP facts the owner must weigh (before H0)

1. **You own outputs; commercial use is not restricted** (ToS, fetched 2026-07-01) — but Higgsfield **disclaims all warranty on output originality**, so the existing per-asset owner protected-similarity review stays mandatory.
2. **Higgsfield retains a perpetual license to your inputs AND outputs.** Your inputs would include **ordinal penguin reference images** — decide explicitly whether you're comfortable granting that license over community IP before uploading. (This is the single biggest reason to keep expression sheets on ChatGPT Image Gen 2 if you're not.)
3. **Pure AI output is not copyrightable** (US Copyright Office position): shippable, but not protectable — others could copy the specific textures. Your human-authored arrangement/edits are protectable.
4. Third-party guides claim free-tier outputs lack commercial rights (not in the ToS text — unresolved). **Use a paid tier for anything that ships.**

## 3. H0 — Governance amendment (REQUIRED FIRST; blocks all other H-tasks)

> **SIGNED 2026-07-07** (owner, in-session, choosing "Sign H0, build the sky lab"): clauses 1-2 in force, SCOPED to text-prompt generation — the §2.2 ordinal-input upload decision remains OPEN and separately gates H1-via-Higgsfield. Clause 3 (video class scan patterns) lands with the first shipped video/animated asset. Recorded in race-visual-target-brief.md (both rule sites) and PRD §9. First approved use: track backdrop art (sky lab — a new H8-class use, same rails as H2/H3: WebP, manifest, owner review, bundle budget).

The current rule (verbatim at `race-visual-target-brief.md:18` and `:52`): *"Production bitmap assets must be custom ChatGPT Image Gen 2 outputs; repo-native/code-native/procedural assets are allowed; external stock/game assets are not approved."* Video/animated content has **zero** governance coverage today (no scan patterns, no manifest precedent). Precedent exists for extending the rule: Kenney CC0 and Tripo were both accepted in practice without doc updates — this amendment codifies the real rule instead of adding a third silent exception.

**One dated owner decision, recorded in the audit's owner-decision pattern, with three clauses:**
1. **Sources:** add Higgsfield (GPT Image 2, Soul, named video models) alongside ChatGPT Image Gen 2 as approved owner-operated generation tools for production bitmap **and video/animated** assets, generated for this project under owner direction. External stock/asset-pack/ripped content remains prohibited.
2. **Mechanics (unchanged, tool-widened):** every generated asset gets (a) an `asset-manifest.json` entry with the six required fields, `source` naming tool+model+date+prompt authorship+input references (mirror the existing facade/Tripo entries); (b) SHA-256 + byte-size fingerprint in the audit inventory; (c) per-asset owner protected-similarity review before release. Human likenesses require explicit owner review.
3. **Video class (new):** define animated media scope (runtime flipbook sheets / DOM video vs. non-runtime marketing clips); extend the audit scan regex (`race-ip-provenance-audit.md:98-101`) to cover `.mp4/.webm/.gif/.apng`, `VideoTexture`, `HTMLVideoElement`; runtime animated assets obey bundle budget, FPS floor, and PWA precache rules like any other asset.

**Doc edits:** `race-visual-target-brief.md:18,52` · `race-ip-provenance-audit.md:22, 53-57, 98-101, 122, 124` · `race-owner-review-packet.md:52, 82, 94`.

---

## 4. Use-case tasks

### H1 — Expression-sheet production line (feeds Phase E)
**What:** Generate the 5 expression sheets per [CHARACTER_EXPRESSION_SHEET_BRIEF.md](CHARACTER_EXPRESSION_SHEET_BRIEF.md) via MCP instead of manual ChatGPT runs — I batch-generate with your references, QA framing consistency across cells programmatically, regenerate drifted cells, and slice the atlas.
**How:** Per character: reference-image conditioning with GPT Image 2 / Nano Banana Pro (owner's ordinal image + existing 3D renders as refs). Optionally Soul-train the 5 characters (~200 cr total) if one-shot conditioning drifts off-model — Soul then also powers H6 trailer shots.
**Gate:** H0 **plus** the §2.2 input-license decision. If you decline uploading ordinal art, this task reverts to owner-run ChatGPT (the brief's default) — everything downstream is unchanged.
**Credits:** ~100–350. **Effort saved:** your 5 manual runs + retries become a supervised batch.

### H2 — Track posters, intro/select art, victory cards (greenfield UI surfaces)
**Where (verified):** track select cards are text-only (`src/game/RaceScreen.jsx:1818-1836`); intro screen likewise; results overlay is bare text (`ComebackCityThreeKartRace.jsx:4562-4573`); countdown (`:4559-4561`). Zero art exists on any of them — lowest-risk, highest-visibility surfaces in the game.
**What:** one poster per track (Comeback City dusk skyline, Penguin Village aurora), a "Comeback City GP" intro splash, per-character victory card behind the results div (5 images), countdown 3-2-1 art.
**Pipeline:** generate 4K → downscale → **WebP** → `src/assets/game/generated/` → manifest entry → ES import → `<img>`/CSS. **Depends on A4** (image budget is failing at 9.51 MiB vs 3.25 MiB cap — new images need the re-baselined headroom).
**Credits:** ~60–120.

### H3 — District facade v2 + Penguin Village facade set (drop-in)
**Where (verified):** five facade PNGs (317–353 px) imported at `ComebackCityThreeKartRace.jsx:20-24`, mapped at `:158-164`, rendered as unlit alpha-tested planes via `createAssetMaterial` (`:318-355`, magenta color-key supported). Manifest entry exists (`asset-manifest.json:27-33`).
**What:** regenerate the 5 facades at higher fidelity matching the neon-dusk lock (bake the neon glow INTO the image — facades are non-emissive by design; glow comes from separate additive sprites), and create a NEW arctic facade set for Penguin Village (new imports + `DISTRICT_FACADE_URLS` entries + anchor rows).
**Rule:** keep filenames for the v2 swap; every replacement is a new manifest fingerprint + owner review. **Depends on A4** headroom.
**Credits:** ~40–80.

### H4 — Animated billboards/jumbotrons (ties into Phase D1 "everything animates")
> **LOCKED & VALIDATED 2026-07-01:** full technical spec, converter script (`scripts/make-flipbook.mjs`), and dev lab (`flipbook-lab.html`) now exist — see **[FLIPBOOK_BILLBOARD_SPEC.md](FLIPBOOK_BILLBOARD_SPEC.md)**, which supersedes the pipeline sketch below where they differ (notably: material is MeshBasicMaterial + HDR color multiplier, not emissiveMap).

**The decision (research-backed):** **flipbook sprite sheets, NOT `THREE.VideoTexture`.** Video textures re-upload every frame to the GPU (~5× cost, three.js #28980), get no mipmaps (shimmer at racing distance), fail in iOS Low Power Mode, and fight PWA precache (2 MB workbox cutoff, range requests). Flipbooks upload once, get proper mips, and pingpong looping is free.
**Where (verified):** finish-gate overhead board (`ComebackCityThreeKartRace.jsx:1648-1652`), ICE IS NICE gantry plane (`:2822`, currently `makeSloganTexture` — a 1-line map swap), rooftop sign (`:1763-1769`), plus new jumbotron quads where Phase D1 adds dressing.
**Pipeline per billboard:**
1. Still: Nano Banana Pro/GPT Image 2, billboard aspect, bold few-word text (or composite real text yourself — bloom eats thin strokes).
2. Loop: Kling 3.0 first/last-frame with the SAME still in both slots, 2–4 s.
3. `ffmpeg -i loop.mp4 -vf "fps=10,scale=256:-1:flags=lanczos,tile=8x1" -frames:v 1 sheet.png` → `cwebp -q 80` (~100–300 KB; 8×1 strip keeps the offset math trivial: `repeat.x=1/8`, `offset.x=frame/8`).
4. Runtime: `emissiveMap` with `SRGBColorSpace`, `emissiveIntensity` 1.5–4 to feed selective bloom; step frames on a fixed 10 Hz accumulator in the race update (no per-frame allocation); power-of-two frame grid + edge gutters to stop mip bleed.
**Depends on:** B4 (pmndrs bloom) for the emissive pop; D1 for placement; A4 for budget. FPS A/B per house rules.
**Credits:** ~30 per billboard (1–3 stills + 2–4 loop attempts); 3–5 billboards ≈ 100–150.

### H5 — HUD item icon set
**Where (verified):** all HUD icons are lucide-react vectors picked by a JSX ternary chain (`ComebackCityThreeKartRace.jsx:4500-4557`); item keys/labels in `race/heldItems.js`.
**What:** custom item sprites (Hot Cocoa, Fish Bone, Ice Shield, Snowball, Slap Fish, Rocket Sardine, Blizzard Cloud, Avalanche, Aurora Boost, Penguin March) — replace the ternary with an `ITEM_ICON_URLS` map of imported 64–128 px sprites. Files <4 KB inline as data URIs (CSP allows `data:`), so budget impact is minimal.
**Trade-dress note:** item icons are a classic similarity trap — icons must be original shapes; owner review per icon.
**Credits:** ~30–60.

### H6 — Community trailer + launch content (non-runtime)
**What:** ~15–30 s cut from (a) real gameplay captures (the proof-capture scripts already produce clean footage) + (b) Soul-consistent character beauty shots + (c) Sora 2/Veo 3.1 establishing shots of a penguin arctic race city. Output for the Ordinals group: launch post, teaser clips.
**No bundle/runtime constraints** (never enters `src/assets`), but keep provenance records for anything published, and run the same trade-dress review on every clip.
**Best after Phase B** — the game looks dramatically better on camera once bloom/SMAA/fog land.
**Credits:** ~150–600 depending on how many hero clips.

### H7 — World-hub signage (optional, cheap)
**Where (verified):** every hub sign is a runtime canvas texture (`WorldScene.jsx:756-794`); the double-sided frame/halo rig is reusable — swap `makeLabelTexture(...)` for a loaded image per sign. Hub is budget-disciplined (`data-texture-count="0"` by design) — keep it to a few small WebPs, unlit materials only.

### Explicit non-uses (keep the tool in its lane)
- **No 3D generation for HERO-grade meshes** (characters/karts stay Tripo + Blender). UNDER EVALUATION 2026-07-07: owner asked for a faster mesh workflow (manual Tripo ≈ 20 min/item) — Higgsfield `generate_3d` may be acceptable for BACKGROUND-grade meshes (trackside buildings/props) if a quality A/B passes the orientation lab + owner review; Tripo-API scripting is the alternate zero-owner-minutes path.
- **No select-portrait replacement** — portraits are 3D captures from the real GLBs (`scripts/select-portraits-capture.mjs`); replacing them with stylized AI art diverges from the model-derived pipeline (owner decision if ever).
- **Never a substitute for Phases A–D** — no generated image fixes lighting, resolution, or animation.

---

## 5. Budget & sequencing

| Tier | Fit |
|---|---|
| Starter $15/70 cr | Too small — H1 alone exceeds it |
| **Plus $49/1,000 cr** | **Recommended** — covers H1–H5 (~350–750 cr) with headroom; add a top-up ($5/100 cr) if the trailer runs hot |
| Ultra $129/3,000 cr | Only if H6 goes heavy on Sora 2/Veo 3.1 (40–70 cr/clip) |

**Order:** H0 (owner decision, unblocks everything) → H1 (feeds Phase E, start now) → H2/H3/H5 after A4 publishes image-budget headroom → H4 after B4+D1 → H6 after Phase B → H7 anytime.

**Setup:** `claude mcp add --transport http --scope user higgsfield https://mcp.higgsfield.ai/mcp`, complete the browser OAuth once, then verify the tool list via `/mcp` (exact tool names evolve; guides mention `generate_image`, `generate_video`, `create_character`, `get_generation_status`, `list_characters`).
