# Comeback City Pro Synthesis Complete Packet - Part 2 of 2

Upload this with Part 1. This file contains the remaining research reports and the final Pro handoff instructions. Use both parts together as one synthesis packet.


---

# Claude Report 2 - Track Visual Unreal MCP

# Comeback City - Research Report 2: Track Production, Visual Direction & Unreal MCP Look-Dev

_Source: Claude report two pasted by owner. Raw attachment preserved at `docs/research/claude-report-2-track-visual-unreal-mcp.raw.txt`._


**Stage 2 of 3.** Scope: how to build visually strong tracks for the existing data-driven Three.js race runtime, how to translate the V2 art cards into runtime choices, and where (if anywhere) Unreal Engine 5.8 MCP earns a place. Companion deliverables: Report 1 (asset pipeline) and the Pro synthesis (Codex build brief).

Date context: 2026-06-17. Tool/licensing claims verified against current primary docs at research time (see §13).

Tags as in Report 1: **[sourced]** / **[repo]** / **[judgment]**.

---

## 1. Executive Recommendation

**Build tracks as data-driven definitions + a procedural Three.js "track kit," and use Blender-authored GLBs surgically for hero set-pieces. Treat Unreal MCP as an optional, evidence-gated reference lab that is not in the critical path.** [judgment]

The reasoning is concrete and specific to this game:

- Your art target — low-poly, glossy/toy-like, chunky silhouettes, N64-era readability with modern polish, saturated clean color **[repo]** — is exactly what procedural Three.js geometry plus a tiny authored prop kit produces best and cheapest. It does *not* need Nanite-class geometry density or Lumen GI.
- Your repo already has the data-driven track spine (`tracks/*.js`, `buildCenterline.js`, `trackGeometry.js`) and procedural visual generation (`createTrackMesh.js`, `createRaceScene.js`) **[repo]**. The job is to extend, not replace.
- **Unreal's marginal visual gains mostly don't survive export to the web.** Unreal ships an in-engine glTF exporter (since 5.1) that handles static/skeletal meshes, animation, levels, and materials with baked textures **[sourced]**, but material baking/expression matching isn't available at runtime and requires hand-built glTF *proxy* materials **[sourced]**, and Nanite/Lumen are engine-internal rendering systems that have no Three.js equivalent. So you'd export simplified static meshes + baked textures at best — something Blender does more directly and for free.
- Running UE 5.8 (whose MCP is a first-party but **experimental, incomplete, API-unstable** plugin **[sourced]**) on your 24 GB M4 Mac Mini **[repo]** is a poor cost/benefit for a solo operator versus Blender + Three.js.

So: **Blender is the authoring workhorse, Three.js is the renderer, Unreal is a curiosity you keep at arm's length** until it proves a specific, hard-to-get-otherwise win (§7).

---

## 2. Track Authoring Strategy

| Option | Effort | Visual ceiling | Determinism | Web fit | Verdict |
|---|---|---|---|---|---|
| Pure JS/JSON definitions | Low | n/a (data only) | Total | Native | **Spine — keep & extend** |
| Procedural Three.js mesh gen | Med | High for this style | Total | Native | **Primary visual generator** |
| Modular track-kit pieces | Med | High | Total | Native | **Primary — code kit + a few GLBs** |
| Blender-authored GLB segments | Med-High | Very high | High (static) | Native after optimize | **Surgical — hero set-pieces only** |
| Unreal look-dev → export to Three.js | High | High in UE, **lossy to web** | Low | Poor (proxy mats, no Lumen/Nanite) | **Optional reference lab only** |

Key distinctions:

- **Determinism lives in data, visuals live in meshes.** Collision/progress (centerline, width, surface bands, lap logic) must stay pure data so your Node QA scripts keep importing tracks headlessly **[repo]**. Visual richness is layered on top and never feeds back into collision.
- **Procedural vs. authored is a per-element decision, not a whole-track decision.** Road ribbons, curbs, barriers, lane markings, boost pads, ramps → procedural from data (cheap, instant iteration, deterministic). District facades, finish gate, signature hero props → authored GLB (where silhouette/detail matters and procedural looks generic).

---

## 3. Recommended Hybrid Workflow

Four layers, built in this order:

```
Layer 0 — TRACK DATA (deterministic, pure JS)
   centerline · width bands · elevation · banking · surface bands
   boost pads · item boxes · finish gate · hazards · lap logic
   → imported by runtime AND by Node QA scripts (unchanged contract)
        │
Layer 1 — PROCEDURAL VISUAL KIT (code-generated Three.js meshes)
   road ribbon · curbs · barriers · rails · lane markings · ramps
   · boost-pad visuals · tunnel/bridge shells
   → generated in createTrackMesh.js from Layer 0 data
        │
Layer 2 — AUTHORED HERO GLBs (Blender → Report 1 optimizer)
   district facades/portals · finish/checkpoint gate · signature props
   → placed at Layer-0 anchor points; procedural box stays as fallback
        │
Layer 3 — VISUAL PROOF GATE (Report 1 harness)
   real-3D / grounded / readable-edge / density / FPS checks
   → must pass before a track route is promoted to /#race
```

Rules:
- **Art cards are the visual source of truth** **[repo]**. Procedural materials and authored GLBs both target the V2 card for their element; the contact-sheet gate (§10) flags drift.
- **Every authored GLB has a procedural fallback** so a failed load degrades, never blanks — matching your existing fallback architecture **[repo]**.
- **No route promotion without proof** **[repo]**.

---

## 4. Track Data Model

Extends your existing fields (`key, name, tagline, course, laps, startOffset, elevation, ramps, shortcut, surfaceBands, breakableObjects, crossers, palette, dressing, budgets`; course has `centerline/minimap path, road ribbons, boost pads, item boxes, district anchors, scenery anchors`) **[repo]**. Additions in **bold**; keep everything pure/serializable so Node imports it.

```js
// track definition (additions in comments)
{
  key, name, tagline,
  laps, startOffset,
  course: {
    centerline,            // [repo] waypoints / minimap path
    roadRibbons,           // [repo]
    boostPads,             // [repo]
    itemBoxes,             // [repo]
    districtAnchors,       // [repo]
    sceneryAnchors,        // [repo]
    // ADD:
    widthBands,            // [{ from, to, halfWidth }] per-segment road width
    banking,               // [{ from, to, rollDeg }] per-segment roll for curves
    finishGate,            // { t, style, kitPiece } placement on centerline
    hazards,               // [{ t, type, params }] (oil, ice patch, mover)
    props,                 // [{ t, offset, kitPiece, glb?, scale, yaw }]
    districtPortals,       // [{ t, district, facadeGlb?, glow }]
    sceneryZones,          // [{ from, to, palette, fogTint, density }]
    cameraHints,           // [{ from, to, fov, height, distance, lookAhead }]
    mobileCropHints        // [{ from, to, fov, height }] mobile-only overrides
  },
  elevation,               // [repo] { from, peak, to } band
  ramps, shortcut,         // [repo]
  surfaceBands,            // [repo] asphalt/ice/snow friction zones
  breakableObjects, crossers, // [repo]
  palette, dressing,       // [repo]
  budgets                  // [repo] { finishSeconds, speedFloor }
}
```

`t` = normalized position along the centerline (0–1), so every placement is resolution-independent and survives centerline edits. `cameraHints`/`mobileCropHints` let the chase camera (§6) tighten on hairpins and widen on straights without per-track camera code.

---

## 5. Modular Track Kit

Each piece is parameterized off Layer-0 data. "Source" column = how it's built first.

| Piece | Source | Key params | Collision note |
|---|---|---|---|
| Straight | Procedural | length, halfWidth | from width band |
| Left / Right curve | Procedural | radius, arc, banking | centerline + roll |
| S-curve | Procedural | composed curves | centerline |
| Ramp up / down | Procedural | rise, run | elevation band drives physics |
| Tunnel approach | Procedural | shell radius, length | visual only; road collides |
| Bridge / overpass | Procedural | span, pier spacing | elevation band (you already have `peak`) |
| Curb sections | Procedural | profile, contrast color | non-collide trim (visual edge) |
| Barriers | Procedural | height, repeat | collide (wall contact telemetry exists) |
| Rails | Procedural | post spacing | optional collide |
| Lane markings | Procedural | dash len/gap, color | non-collide decal |
| Boost pad | Procedural | size, emissive, pulse | trigger volume (boost telemetry exists) |
| Item box | Procedural **or** Kenney GLB | spin, bob | trigger volume |
| Finish / checkpoint gate | **Authored GLB** | width, banner | trigger plane |
| District facade / portal | **Authored GLB** | district id, glow | non-collide backdrop |
| Signature hero prop | **Authored GLB** | per-prop | non-collide or box-collide |

First implementation scope: ship the **procedural** pieces first (they cover ~80% of the visible track and need no art pipeline), then add the three **authored** classes via Blender once the procedural kit passes proof.

---

## 6. Visual Style Translation (V2 cards → runtime)

Anchor on your existing renderer config — ACES filmic tonemapping at exposure 1.2, sRGB output, hemisphere + sun + rim lights, fog 210/580, render scale 0.58 desktop / 0.6 mobile, DPR cap 2, shadows off for performance **[repo]**. Translate the V2 language onto that base:

| V2 trait | Three.js recipe |
|---|---|
| Glossy toy-like materials | `MeshStandardMaterial`, roughness 0.2–0.4, metalness 0.0–0.3, **a shared environment map** for the "clearcoat sheen" (cheap, big payoff with shadows off) |
| Chunky silhouettes, N64 readability | low-poly beveled forms + **rim light** to pop the silhouette against fog; avoid micro-detail that reads as noise at mobile scale |
| Saturated clean color | sRGB + ACES (you have it); keep AO subtle so colors stay clean, not muddy; per-district `palette` from data |
| Neon accents | **emissive materials + a bloom pass** (selective bloom on boost pads, portals, finish gate) |
| Asphalt | dark low-roughness base + faint normal/tiling; lane markings as bright decals |
| Curb / rubber | high-contrast curb color; rubber barriers slightly rougher than karts |
| Portal glow / fire | emissive + bloom; animate intensity for life |
| Foliage / barriers | flat-shaded low-poly; instanced for density without draw-call cost |
| Chase camera | follow player kart; use `cameraHints` (fov/height/distance/lookAhead) per zone |
| Mobile framing | `mobileCropHints` widen FOV + raise height so the road reads on a 390-wide viewport |

Two style levers that matter most here [judgment]: (1) **a single shared env map** does most of the "premium glossy" work once shadows are off; (2) **selective bloom** is what sells "neon arcade" — keep it on emissive-flagged materials only so the whole scene doesn't wash out. Both are cheap on mobile.

---

## 7. Unreal MCP Optional Lab

### 7.1 What it actually is, today
UE 5.8 ships a **first-party** MCP plugin (engine id `ModelContextProtocol`, friendly name "Unreal MCP") that embeds an MCP server in the editor on `http://127.0.0.1:8000/mcp` and exposes engine functions — spawning actors, configuring lighting, creating material instances, inspecting Slate widgets, running automation tests — as tools any MCP client (Claude Code, Cursor) can call **[sourced]**. It is **experimental**: many features are incomplete and APIs/data formats may change **[sourced]**, and 5.8 itself is a mid-May-2026 preview **[sourced]**. Community alternatives exist (e.g. flopperam hosted MCP for UE 5.5–5.7; a Go-binary `mcp-unreal` using the Remote Control API on port 30010) **[sourced]** but carry the same "AI touching engine internals" risk class **[sourced]**.

### 7.2 Setup (if you try it)
Enable the plugin in Edit > Plugins (it pulls in the Toolset Registry dependency), set Auto-Start in Editor Preferences > Model Context Protocol, run `ModelContextProtocol.GenerateClientConfig` to emit the client config, then launch your MCP agent from the workspace root **[sourced]**. Optionally use the in-editor Terminal plugin to keep the agent in one window **[sourced]**.

### 7.3 What it can usefully do for you
- **Layout blockout:** ask the agent to place blocks/proxy meshes to compose a city/district arrangement quickly, then read back transforms as **reference coordinates** for your Layer-0 `districtAnchors`.
- **Lighting/material mood reference:** stage a lighting setup and **screenshot it** as a visual target to reproduce by hand in Three.js.
- **Static-mesh + baked-texture export:** via the in-engine glTF exporter (Python-scriptable: `unreal.GLTFExporter.export_to_gltf`) **[sourced]** — but only with **pre-baked/proxy materials** **[sourced]**, and the result still goes through the Report 1 optimizer.

### 7.4 What does NOT transfer (the honesty section)
- **Lumen** (real-time GI) — no web equivalent; bake or eyeball only.
- **Nanite** geometry density — UE-internal; doesn't round-trip via glTF well **[sourced]** and Three.js can't render it anyway.
- **Complex material graphs** — collapse to baked textures / proxy materials; you lose the procedural material network **[sourced]**.

### 7.5 The evidence bar before expanding Unreal usage
Adopt Unreal beyond a one-off experiment **only if** it produces, in a timeboxed trial, **a specific reference image or static GLB that measurably improved the Three.js runtime AND could not be gotten faster in Blender or directly in Three.js.** Concretely: one proof-folder comparison where the Unreal-derived asset/reference beats the hand-built version on the contact-sheet gate. Absent that, Unreal stays off the critical path. Given your hardware and solo bandwidth, the honest default is **skip it for v1**.

---

## 8. Blender Optional Workflow (the actual workhorse)

Blender is free, scriptable headless, and exports clean GLBs that feed straight into the Report 1 optimizer. Use it for cleanup *and* hero authoring.

Headless invocation **[sourced]**:
```bash
# macOS executable path
/Applications/Blender.app/Contents/MacOS/Blender -b input.blend \
  --python scripts/blender/export_glb.py -- --out asset-pipeline/raw/...

# or one-liner export
/Applications/Blender.app/Contents/MacOS/Blender -b in.blend \
  --python-expr "import bpy; bpy.ops.export_scene.gltf(filepath='out.glb')"
```

`bpy` ops you'll script **[sourced]**:
- Import source (`bpy.ops.import_scene.gltf` / fbx / obj).
- **Origin correction:** `bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY')` so the Report 1 pipeline and runtime get consistent pivots (your runtime applies yaw fixes by convention **[repo]** — keep pivots predictable so those stay valid).
- **Scale normalize:** set dimensions, then `bpy.ops.object.transform_apply(scale=True)`.
- **Decimate:** add a `DECIMATE` modifier and apply (coarse pass; the Report 1 `simplify` does the precise web-target reduction).
- **Normals / UV / material fixes:** recalc normals, basic UV cleanup, assign a single PBR material to match the toy-like target.
- **Export:** `bpy.ops.export_scene.gltf(filepath=..., export_format='GLB')`.

When to use Blender:
- **Pre-clean Tripo source** (origin/scale/normals) *before* the Report 1 optimizer, so the optimizer only does web reduction.
- **Author hero GLB segments** — district facades, finish gate, signature props — modeled to the V2 cards.
- **Track-segment baking** (optional) if a procedural piece can't hit the look.

Output target: `asset-pipeline/raw/...` → Report 1 audit → optimize → validate → proof → promote. One pipeline, two source origins (Tripo-generated and Blender-authored).

---

## 9. Visual QA Gates (track-specific)

Automatable, layered on Report 1's harness + your telemetry **[repo]**:

| Gate | Check | Signal |
|---|---|---|
| Real 3D geometry | scene is not a flat plane | depth variance in render / non-zero elevation in data |
| Grounded karts | kart Y ≈ road surface Y | telemetry `airborne=false` on flat segments; no float/sink |
| Readable road edge | curb/road contrast present | contact-sheet vs. track card |
| Visible elevation/curve | camera sees non-straight world | start-vs-mid frame differ (you already diff these) |
| Prop density | enough world dressing | `propCount >= 20` (existing gate) |
| District identity | each district visually distinct | gallery render per district |
| No placeholder/fallback | no procedural-box where GLB expected | forbidden-element check (existing pattern) |
| No blank canvas | WebGL canvas non-uniform | pixel-sample (existing) |
| Stable framing | desktop + mobile both readable | stills at 1365×768 and 390×844 |
| FPS | playable | median `fpsEstimate >= 34` (existing gate) |
| Renderer identity | three-kart, not Pixi/legacy | `data-race-renderer="three-kart"`, zero Pixi canvases (existing) |

---

## 10. Evidence Plan

Reuse the Report 1 proof harness; add track-specific artifacts. Per track, per run → `asset-pipeline/proof/<timestamp>/`:

- Desktop still (`/#race` 1365×768) and mobile still (390×844).
- 10 s desktop WebM + 10 s mobile WebM (motion proven via frame diff).
- **Top-down track layout** — orthographic render of centerline + road ribbons + boost/item/finish markers (proves real geometry and lap shape; render headlessly from Layer-0 data).
- **Contact sheet vs. V2 cards** — track/material/prop renders beside their reference cards.
- **Track-module gallery** — each kit piece rendered in isolation on `/#asset-gallery` (or a `/#track-kit` route).

---

## 11. Licensing & Provenance

Record per asset in `asset-manifest.json` (Report 1 §7). Sources and their handling:

| Source | License | Web-shippable? | Manifest fields |
|---|---|---|---|
| Owner-generated Tripo (from your own renders/cards) | Owner-owned | **Yes** | source=tripo, derivedFrom=<card>, license=owner |
| Kenney Toy Car Kit | CC0 | **Yes** | source=kenney, license=CC0 |
| Blender-authored (you) | Owner-owned | **Yes** | source=blender-authored, license=owner |
| Unreal-**rendered** reference image | reference only | n/a (not shipped) | reference asset; you reproduce the look, don't ship their pixels |
| Unreal-**exported** GLB of engine/Fab content | **Epic EULA — verify** | **Often NO** | flag: Epic-licensed content is generally Unreal-only; do not ship to a web runtime without confirming the specific asset's license |
| Third-party textures / HDRIs / plugins | varies | verify each | record source URL + license + seat |

**The real trap** [judgment]: Epic/Fab/Quixel content is typically licensed for use *within Unreal Engine projects*. Exporting such an asset as GLB into a non-Unreal web game can breach the license. **Owner-generated and CC0 are clean; Epic-sourced art is not freely portable.** Using an Unreal *render* as a visual *target* you reproduce by hand is fine — shipping their actual meshes/textures is not. Verify any specific asset's terms before promotion.

---

## 12. Implementation Roadmap

- **T1 — Track-kit schema.** Extend the track data model (§4) with `widthBands`, `banking`, `finishGate`, `hazards`, `props`, `districtPortals`, `sceneryZones`, `cameraHints`, `mobileCropHints`. Keep Node-importable; existing QA scripts still pass. *Exit:* both existing tracks load with the new fields (defaulted).
- **T2 — First procedural visual kit.** Implement the procedural pieces (§5) in `createTrackMesh.js` driven by the new fields: width bands, banking, curbs, barriers, lane markings, boost-pad visuals, ramps, bridge/tunnel shells. *Exit:* `comeback-city` renders with real width/banking/curbs and passes the §9 gates.
- **T3 — First authored hero segment.** In Blender, author one district facade or the finish gate to its V2 card; run it through the Report 1 optimizer; place it at its Layer-0 anchor with procedural fallback. *Exit:* authored GLB renders grounded with the procedural box as fallback.
- **T4 — First proof route.** Add `/#track-kit` (and reuse `/#asset-gallery`) for module/track review. *Exit:* gallery renders every kit piece, none blank.
- **T5 — Screenshot/video gate.** Wire the §10 evidence into the Report 1 proof script (add the top-down layout render). *Exit:* one proof folder with stills, two WebMs, top-down layout, contact sheet.
- **T6 — Optional Unreal MCP lab (only if pursued).** Timeboxed trial against the §7.5 evidence bar. *Exit:* either a proof-folder win that justifies it, or a written "not worth it for v1" and move on.
- **T7 — Route promotion.** Promote the improved track to `/#race` only after all gates pass **[repo]**. *Exit:* `test:kart-3d-spike` green on the new visuals.

---

## 13. Sources

- Unreal Engine 5.8 — first-party MCP plugin (setup, `127.0.0.1:8000/mcp`, exposed tools, experimental status): https://dev.epicgames.com/documentation/unreal-engine/unreal-mcp-in-unreal-editor
- Unreal Engine — glTF Exporter (in-engine since 5.1; meshes/materials/levels): https://dev.epicgames.com/documentation/en-us/unreal-engine/exporting-unreal-engine-content-to-gltf
- Unreal Engine — How the glTF Exporter handles content (special considerations): https://dev.epicgames.com/documentation/en-us/unreal-engine/how-the-gltf-exporter-handles-unreal-engine-content
- Unreal Engine — Scripting glTF exports (Python `GLTFExporter.export_to_gltf`; runtime needs proxy materials): https://dev.epicgames.com/documentation/unreal-engine/scripting-gltf-exports-in-unreal-engine
- Blender — Command-line arguments (`-b`, `--python`, `--python-expr`): https://docs.blender.org/manual/en/latest/advanced/command_line/arguments.html
- Blender — `bpy.ops.export_scene.gltf` parameters: https://docs.blender.org/api/current/bpy.ops.export_scene.html
- Khronos — Blender glTF converter (headless CLI pattern): https://github.khronos.org/glTF-Tutorials/BlenderGltfConverter/
- three.js — GLTFLoader / KTX2Loader (runtime decode; Report 1 §12 for full list): https://threejs.org/docs/#examples/en/loaders/GLTFLoader
- (Report 1 §12 covers glTF-Transform and meshopt sources used by the shared pipeline.)

---

*End of Report 2. Next: Pro Synthesis — combine Reports 1 and 2 into a single Codex implementation brief, resolve conflicts, and list the owner decisions.*


---

# Claude Report 3 - Final Build Plan

# Comeback City - Final Build Plan & Codex Implementation Brief

_Source: Claude stage 3 synthesis report pasted by owner. Raw attachment preserved at `docs/research/claude-report-3-final-build-plan.raw.txt`._

**Stage 3 of 3 (synthesis).** Combines Report 1 (asset pipeline) and Report 2 (tracks + Unreal look-dev) into one chosen workflow, resolves where they diverge, and produces a paste-ready Codex brief. Inputs assumed present: the Shared Repo Context, Report 1, Report 2.

Date context: 2026-06-17. All sourced tool facts are verified in Reports 1–2 §Sources; this document does not re-derive them.

---

## 1. Final Recommendation

**One workflow:** a scripted, file-system-driven asset pipeline (`raw → audit → optimize → validate → proof → promote → manifest`) feeding a Three.js runtime whose tracks are **data-driven definitions + a procedural track kit**, with **Blender-authored GLBs used surgically** for hero set-pieces. Mechanics never change. Unreal MCP is an **optional, evidence-gated reference lab, off the critical path**. Video generation (Seedance) is **deferred until the playable game produces real proof footage**.

**Compression:** meshopt for geometry (decoder ships in three.js, one `setMeshoptDecoder` call), WebP for textures now, KTX2/Basis optional later. **Reduction:** scripted `weld → simplify` via meshoptimizer, using the glTF-Transform JS API (not the one-shot CLI). **Proof:** extend the existing Playwright spike-test harness; nothing reaches `/#race` without passing visual + FPS gates.

### Conflicts between the two reports, resolved
1. **Sequencing — assets first or tracks first?** The two tracks of work are largely independent. The **procedural track kit is pure code and needs no asset pipeline**, so it can proceed in parallel with asset optimization. **Authored hero GLBs depend on the optimizer existing.** Resolution: build the asset pipeline (Phases 1–2) and the track-kit schema + procedural kit (Phase 4) as parallel-eligible work; gate authored track GLBs behind the optimizer. The canonical phase order below interleaves them.
2. **Gallery route naming** — Report 1 proposed `/#asset-gallery`, Report 2 proposed `/#track-kit`. Resolution: **one route, `/#asset-gallery`, with a mode**: `?set=models` (default) and `?set=track`. Less surface area, one capture path.
3. **Blender's role** — Report 1 treated it as optional cleanup; Report 2 as the authoring workhorse. Resolution: **both, and not required for v1.** Blender pre-cleans Tripo source (origin/scale/normals) and authors hero GLBs; the v1 procedural track path ships without it. All Blender output flows into the same Report-1 optimizer.
4. **Rival karts — shared mesh or distinct bodies?** This is the biggest budget-shaping decision (owner decision A below). **Default for v1: rivals reuse one kart mesh via `InstancedMesh`** (collapses N rivals to ~1 draw call). Distinct V2 rival bodies are a later upgrade.

---

## 2. Implementation Brief For Codex

> Build a repeatable Three.js asset-and-track pipeline in the `comeback-tracker` repo **without changing game mechanics**. The runtime (React 18 / Vite 8 / Three.js r184) keeps its existing race mechanics, routes, telemetry, and selectable characters/karts. You are adding: (1) a scripted pipeline that turns raw Tripo/Blender GLBs into optimized runtime GLBs, (2) a data-driven procedural track kit, (3) automated visual proof, and (4) manifest-enforced promotion.
>
> **Hard constraints:**
> - Never modify physics, progress, lap, drift, boost, item, rival, or telemetry logic. Mechanics import only *promoted* assets at existing paths.
> - Never re-orient or re-pivot meshes in the pipeline — orientation stays a runtime concern (Tripo faces +X → runtime yaw −π/2; Kenney faces −Z → runtime yaw π). Keep `?kenneyKart=1` and `?bakedSpike=1` working.
> - Keep all track data pure/serializable so Node QA scripts import it headlessly.
> - Every authored GLB must keep a procedural fallback; a failed load degrades, never blanks.
> - Geometry compression = meshopt; textures = WebP (KTX2 deferred). ESM `.mjs` scripts only.
> - Nothing promotes to `/#race` until the visual + FPS gates pass.
>
> Work phase by phase (§12). Each phase has explicit exit criteria. Start with the First Codex Task (§13).

---

## 3. Final File Structure

```
asset-pipeline/                      # NEW — working area, never shipped in src bundle
  raw/{karts,characters,props,items,track}/      # immutable source (Tripo + Blender)
  optimized/{karts,characters,props,items,track}/ # candidates
  rejected/                          # validate failures + reason.txt
  audit/                             # audit-report.json / .md
  proof/<timestamp>/                 # stills, WebMs, top-down layout, contact sheet
  config/asset-classes.json          # name → class → simplify/texture/budget overrides
  README.md
scripts/                             # NEW scripts alongside existing harness
  lib/asset-pipeline.mjs             # shared IO + budget tables + class inference (single source of truth)
  blender/export_glb.py              # headless Blender clean/export (optional path)
  audit-game-assets.mjs
  optimize-game-glbs.mjs
  validate-game-assets.mjs
  render-asset-gallery.mjs
  capture-race-proof.mjs
  compare-race-visuals.mjs
  promote-approved-assets.mjs
src/                                 # MODIFY (additively)
  game/ComebackCityThreeKartRace.jsx # add setMeshoptDecoder once
  game/race/render/createTrackMesh.js # procedural track kit (data-driven)
  game/race/tracks/*.js              # extended track data model (new fields, defaulted)
  assets/game/asset-manifest.json    # promote rewrites provenance/budget/fallback
  assets/game/models/**              # promote target (optimized GLBs land here)
  # NEW route: /#asset-gallery?set=models|track (dev/proof only)
```

Only `promote-approved-assets.mjs` ever writes into `src/`.

---

## 4. NPM Scripts

Add to `package.json` (existing scripts untouched):

```json
{
  "assets:audit":    "node scripts/audit-game-assets.mjs",
  "assets:optimize": "node scripts/optimize-game-glbs.mjs",
  "assets:validate": "node scripts/validate-game-assets.mjs",
  "assets:gallery":  "node scripts/render-asset-gallery.mjs",
  "assets:proof":    "node scripts/capture-race-proof.mjs",
  "assets:compare":  "node scripts/compare-race-visuals.mjs",
  "assets:promote":  "node scripts/promote-approved-assets.mjs",
  "assets:all":      "npm run assets:audit && npm run assets:optimize && npm run assets:validate"
}
```

Dev dependencies to add: `@gltf-transform/core`, `@gltf-transform/functions`, `@gltf-transform/extensions`, `meshoptimizer`, `sharp`. Optional: `@gltf-transform/cli` (ad-hoc inspection), `draco3dgltf` (only if Draco fallback is ever enabled).

---

## 5. Automation Scripts

Shared module `scripts/lib/asset-pipeline.mjs` holds the glTF-Transform `NodeIO` setup, class inference, and the budget table (§6) — every script imports budgets from here; never duplicate thresholds.

| Script | Purpose | Inputs | Outputs | Packages | Pass/fail | First scope |
|---|---|---|---|---|---|---|
| `audit-game-assets.mjs` | Measure + classify + flag | `raw/**`, current `src/.../models/**` | `audit/audit-report.{json,md}` | core, functions | non-blocking; `--strict` fails if a *promoted* asset breaks budget | stats + flags for all current assets |
| `optimize-game-glbs.mjs` | weld→simplify→join→prune→texWebP→reorder→meshopt write | `raw/**.glb` + class config | `optimized/<class>/*.glb` + `optimize-log.json` | core, functions, meshoptimizer, sharp | fails if output > class budget or spec-invalid | single-mesh single-texture Tripo assets; re-optimize the 2 over-budget penguins first |
| `validate-game-assets.mjs` | Budget + glTF-spec gate | `optimized/**` | `validate-report.json`; failures → `rejected/` + `reason.txt` | core, functions | non-zero on any breach | budget table assertions + validate |
| `render-asset-gallery.mjs` | Build `/#asset-gallery?set=` route data | optimized candidates / track kit | gallery route payload | (none new) | n/a (render target) | models set first, track set second |
| `capture-race-proof.mjs` | Playwright stills + WebM + gallery + top-down layout | built `vite preview`; routes `/#race`, `/#race-3d-spike`, `/#asset-gallery` | `proof/<ts>/` artifacts + `proof-index.json` | playwright, pngjs | fails on blank canvas, missing three-kart, `fpsEstimate<34` | reuse spike-test thresholds; add top-down layout render |
| `compare-race-visuals.mjs` | Contact sheet vs V2 cards | proof PNGs + `art-direction/v2/*` | `contact-sheet.png`, `visual-diff.json` | pngjs, sharp | soft gate (flags drift for review) | extend existing `visual-reference-checks.mjs` pattern |
| `promote-approved-assets.mjs` | Copy to `src/`, rewrite manifest | validate pass-manifest + `--approve` | updated `src/.../models/**` + `asset-manifest.json` + CHANGELOG line | (none new) | refuses unvalidated assets; refuses orphaning a runtime import | manual `--approve` default |

Optimizer core (the load-bearing script) — first implementation:

```js
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, simplify, join, prune, textureCompress, reorder }
  from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

export async function optimizeAsset(inPath, outPath, cfg) {
  const doc = await io.read(inPath);
  await doc.transform(
    dedup(),
    weld({ tolerance: 0.0001 }),
    simplify({ simplifier: MeshoptSimplifier, ratio: cfg.ratio, error: cfg.error }),
    join({ keepNamed: cfg.keepNamed ?? false }),
    prune({ keepAttributes: true }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [cfg.tex, cfg.tex] }),
    reorder({ encoder: MeshoptEncoder }),
  );
  await io.write(outPath, doc); // meshopt extension enabled via registered extensions
}
```

Per-class `cfg` from the budget table. Verify the current `@gltf-transform/functions` meshopt write helper signature at build time; the CLI `gltf-transform meshopt in out --level medium` is the stable fallback.

---

## 6. Asset Budgets (final)

**Source acceptance (flag for mandatory optimization, not rejection):** > 8 MB **OR** > 150k triangles **OR** texture > 2048² **OR** > 1 material with no atlas plan. (All Tripo exports trip this — expected.)

**Optimized acceptance (promotion gate):**

| Class | Triangles max | File size max | Texture max | Draw calls |
|---|---|---|---|---|
| Hero kart | 25k | 1.2 MB | 1024² | 1–2 |
| Rival kart | 18k | 0.8 MB | 1024² (shared) | 1 |
| Seated character | 25k | 1.0 MB | 1024² | 1–2 |
| Simple prop | 1.5k | 0.10 MB | 256² | 1 |
| Complex prop / facade | 8k | 0.50 MB | 512² | 1–3 |
| Item box | 2k | 0.12 MB | 256–512² | 1 |
| Boost pad | 1k | 0.08 MB | 256² + emissive | 1 |
| Track module | 6k | 0.40 MB | 512–1024² | 1–2 |

**Full visible race scene:**

| Metric | Mobile target | Desktop ceiling |
|---|---|---|
| Triangles on screen | ≤ 350k | ≤ 700k |
| Draw calls | ≤ 120 | ≤ 180 |
| GPU texture memory | ≤ 120 MB | ≤ 200 MB |
| Race GLB payload (wire) | ≤ 8 MB | ≤ 12 MB |
| Median FPS | ≥ 34 floor / 50+ target | ≥ 34 floor / 60 target |

**Bundle vs payload:** JS bundle ≤ ~600 KB gzipped; GLBs are runtime-loaded and budgeted as "race payload" above. Don't let GLBs leak into the JS chunk graph.

Anchor reference (proven-good shipping assets): bunny 14.9k tris / 0.55 MB; hero-kart-tripo 23.1k / 1.0 MB. Over-budget today and first to re-optimize: layer23-penguin (~100k / 3.84 MB), mizzle (~88k / 3.38 MB).

---

## 7. Track Workflow (final)

**Track definition schema** = existing fields + additions (normalized `t` ∈ 0–1 positioning): `widthBands`, `banking`, `finishGate`, `hazards`, `props`, `districtPortals`, `sceneryZones`, `cameraHints`, `mobileCropHints`. Pure data; Node-importable; existing QA scripts still pass with fields defaulted.

**Visual module kit** — procedural first (no art pipeline needed): straight, L/R/S curves, ramps, tunnel/bridge shells, curbs, barriers, rails, lane markings, boost-pad visuals. **Authored GLB** (Blender → optimizer): finish/checkpoint gate, district facade/portal, signature hero props. Item box = procedural or Kenney GLB.

**Authored asset integration:** Blender pre-clean (origin/scale/normals/coarse decimate) → `raw/` → Report-1 optimizer → placed at Layer-0 anchors with procedural fallback. One pipeline, two source origins.

**Runtime placement:** `createTrackMesh.js` generates procedural pieces from track data; authored GLBs load at anchor `t` values. Collision/progress stays on the deterministic centerline + width bands — never on the visual mesh.

**Camera/framing proof:** chase camera reads `cameraHints` (fov/height/distance/lookAhead) per zone; `mobileCropHints` widen for 390-wide viewports. Proven by desktop (1365×768) + mobile (390×844) stills and 10 s WebMs in the same proof folder.

**Visual style levers (highest ROI):** one shared environment map for the glossy/premium look (shadows stay off); selective bloom on emissive-flagged materials only for neon-arcade accents. Keep ACES tonemapping at exposure 1.2 and the existing hemisphere/sun/rim lighting.

---

## 8. Visual QA Gates (final, automatable)

In CI order (cheap fails first):

```
1. assets:audit --strict     # promoted assets within budget                (asset audit gate)
2. npm run build
3. test:bundle               # JS bundle + race payload budgets             (bundle gate)
4. test:webgl                # WebGL context smoke
5. test:kart-proof           # static guard
6. test:kart-playable        # playability
7. test:visual               # visual reference checks
8. test:kart-3d-spike        # three-kart renderer + propCount≥20 + FPS≥34 + non-blank
9. assets:validate           # optimized-asset budget + glTF-spec gate      (optimization gate)
10. manifest gate            # promoted stats == manifest budgets           (manifest gate)
11. assets:proof             # stills + WebM + top-down layout (route render + screenshot + video gates)
12. assets:compare           # contact sheet vs V2 cards (visual comparison gate, soft)
```

Track-specific assertions folded into the proof step: real 3D geometry (not flat plane), grounded karts (no float/sink), readable road edge, visible elevation/curve (start-vs-mid frame differ), district identity, no placeholder where GLB expected, stable desktop/mobile framing.

---

## 9. Unreal MCP Role (final)

**Optional reference lab. Off the critical path. Skip for v1 unless it clears the evidence bar.**

- **Use only for:** (a) reference screenshots of a lighting/material mood you then reproduce by hand in Three.js; (b) rapid layout blockout whose actor transforms you read back as `districtAnchors`; (c) at most, static-mesh + baked-texture GLB export with hand-built proxy materials, which still goes through the Report-1 optimizer.
- **Does not transfer to web:** Lumen GI, Nanite geometry, complex material graphs (collapse to baked proxies on export).
- **Evidence bar to expand usage:** in a timeboxed trial, produce one reference or GLB that **beats the hand-built version on the contact-sheet gate** and could not be gotten faster in Blender/Three.js. Otherwise document "not worth it for v1" and move on.
- **Setup if pursued:** enable the UE 5.8 first-party `ModelContextProtocol` plugin, auto-start on `127.0.0.1:8000/mcp`, run `ModelContextProtocol.GenerateClientConfig`, connect Claude Code from the workspace root. Note: experimental, API-unstable; heavy on a 24 GB M4 Mac Mini.
- **Licensing guardrail:** never ship Epic/Fab/Quixel meshes or textures in the web runtime — that content is generally Unreal-only. Reproducing a *look* from an Unreal render is fine; shipping their assets is not. Owner-generated Tripo and Kenney CC0 are clean.

---

## 10. Seedance / Video-Generation Decision

**Defer. Proof comes first.** Video generation becomes useful **only after** a track is promoted to `/#race` and passes every visual + FPS gate, *and* the Playwright-captured 10 s desktop/mobile WebMs prove the playable visuals hold up. At that point Seedance-class tools are for **marketing/trailer/promo** material — not for building or validating the game. Trigger condition to revisit: a green `/#race` proof folder you'd be comfortable putting in front of players. Until then, the real running-game WebMs are the only footage that matters.

---

## 11. Owner Decisions (the only ones that block implementation)

Codex can start Phase 1 without these, but you should answer A–C before Phase 2 completes and D–E before authored assets:

- **A. Rival karts:** shared instanced mesh (default; best draw calls) or distinct V2 rival bodies (higher fidelity, higher budget)? *Recommend shared for v1.*
- **B. Promotion:** auto-promote on green gates, or require manual `--approve` after you eyeball the contact sheet? *Recommend manual for art, auto for everything else.*
- **C. Texture floor:** 512² for characters/karts (halves VRAM) or hold 1024² for the hero kart specifically? *Recommend 512² baseline, 1024² hero only.*
- **D. Character LOD:** re-optimize the two heavy penguins in place to ≤25k (recommended; reuse existing select-screen PNGs for menus), or keep separate high-poly select-screen variants?
- **E. KTX2 timing:** WebP now + KTX2 later (default), or KTX2/Basis in Phase 2 (adds the transcoder to `public/` + `detectSupport` wiring)?

---

## 12. Phase Plan

| Phase | Work | Exit criteria |
|---|---|---|
| **1 — Inventory & manifest** | `asset-pipeline/` tree; copy raw Tripo GLBs into `raw/`; `lib/asset-pipeline.mjs` + `audit-game-assets.mjs`; manifest schema | `npm run assets:audit` prints stats + flags for all current assets |
| **2 — GLB optimization** | `optimize-game-glbs.mjs` (the §5 core) + `validate-game-assets.mjs`; re-optimize the 2 heavy penguins as proof case | every candidate passes §6; log shows penguins ~100k→≤25k tris |
| **3 — Asset preview gallery** | `render-asset-gallery.mjs` + `/#asset-gallery?set=models` route | gallery renders every candidate, none blank |
| **4 — Track-kit schema** *(parallel-eligible with 1–2)* | extend track data model (§7); procedural kit in `createTrackMesh.js` (width bands, banking, curbs, barriers, lane markings, ramps, bridge/tunnel) | `comeback-city` renders real width/banking/curbs; existing QA still passes |
| **5 — First visual proof route** | `?set=track` gallery + first authored hero GLB (finish gate or one facade) via Blender→optimizer, placed with procedural fallback | authored GLB renders grounded; procedural fallback works |
| **6 — Screenshot/video evidence** | `capture-race-proof.mjs` + `compare-race-visuals.mjs`; add top-down layout render; wire gates into CI | one proof folder: stills, 2 WebMs, top-down layout, contact sheet; gates pass |
| **7 — Route promotion** | `promote-approved-assets.mjs` + manifest gate; promote improved assets/track | `test:kart-3d-spike` green on new visuals at `/#race` |
| **8 — Optional Unreal MCP lab** | timeboxed trial against §9 evidence bar | a proof-folder win that justifies it, or a written "skip for v1" |

Phases 1–3 are the asset pipeline; 4–7 the track + proof + promotion; 8 optional. Phase 4 can run alongside 1–2.

---

## 13. First Codex Task (paste this)

> **Task: Phase 1 — asset pipeline inventory + audit + manifest schema.**
>
> Repo: `comeback-tracker` (React 18 / Vite 8 / Three.js r184). Do not change any game mechanics, routes, or telemetry. This phase only adds a working area and an audit script; it does not modify any runtime asset.
>
> 1. Create the `asset-pipeline/` tree: `raw/{karts,characters,props,items,track}/`, `optimized/{karts,characters,props,items,track}/`, `rejected/`, `audit/`, `proof/`, `config/`, and a `README.md` describing the pipeline (`raw → audit → optimize → validate → proof → promote → manifest`).
> 2. Copy the raw Tripo source GLBs from `3d generations:character sheets/` into `asset-pipeline/raw/` under the right class subfolders (karts vs characters vs items). Treat `raw/` as immutable from here on.
> 3. Add dev deps: `@gltf-transform/core`, `@gltf-transform/functions`, `@gltf-transform/extensions`, `meshoptimizer`, `sharp`.
> 4. Create `scripts/lib/asset-pipeline.mjs` exporting: a configured glTF-Transform `NodeIO`; a `classify(filename)` helper (kart/character/prop/item/track); and a `BUDGETS` table matching the optimized-acceptance budgets (hero kart 25k/1.2MB/1024², rival 18k/0.8MB, character 25k/1.0MB, simple prop 1.5k/0.10MB/256², complex prop 8k/0.5MB/512², item 2k/0.12MB, boost pad 1k/0.08MB, track module 6k/0.4MB). This module is the single source of truth for budgets.
> 5. Create `scripts/audit-game-assets.mjs` (ESM). For every GLB in `asset-pipeline/raw/**` and every GLB in `src/assets/game/models/**`, measure: bytes, vertices, triangles, materials, textures, max texture dimension, animation count, bounding box. Use glTF-Transform vertex-count helpers. Classify each asset and attach `flags[]` for source-acceptance breaches (>8MB OR >150k tris OR texture >2048² OR >1 material). Write `asset-pipeline/audit/audit-report.json` and a readable `audit-report.md`. Default exit 0; add a `--strict` flag that exits non-zero if any asset already under `src/.../models/**` exceeds its optimized budget.
> 6. Add `"assets:audit": "node scripts/audit-game-assets.mjs"` to `package.json`.
> 7. Define (in the README and a JSON schema/comment) the per-asset manifest contract that a later promote step will write into `src/assets/game/asset-manifest.json`: `source`, `license`, `role`, `sizeBudgetBytes`, `actualBytes`, `triangles`, `fallback`, `optimizedFrom`, `proofRef`.
>
> **Acceptance:** `npm run assets:audit` runs clean and prints a table of every current asset with its class, size, triangle count, and flags — including the two over-budget penguins (`layer23-penguin` ~100k tris, `mizzle` ~88k tris) and the well-optimized bunny (~15k). No file under `src/` is modified. Report what you created and paste the audit table.
>
> Do **not** start optimization, meshopt, or any GLB rewriting in this task — that is Phase 2.

---

*End of synthesis. Reports 1 and 2 hold the sourced detail behind every decision here. This brief is ready to paste into Codex as the implementation starting point; hand it the First Codex Task (§13) first.*


---

# ChatGPT Technical Risk Audit

# Three.js Asset Pipeline for Comeback City Kart

_Source: ChatGPT deep research report pasted by owner. Raw attachment preserved at `docs/research/chatgpt-deep-research-technical-risk-audit.raw.txt`._

## Executive recommendation

The best first version for Comeback City is a dual-variant glTF pipeline centered on GLB as the runtime container, glTF Transform as the offline optimizer, Meshopt as the default geometry compression, and KTX2/Basis Universal as the default texture compression. In practice, that means every approved asset produces two runtime outputs: a primary asset using EXT_meshopt_compression plus KHR_texture_basisu, and a fallback asset using quantized but uncompressed geometry plus WebP or PNG/JPEG textures. That choice fits browser delivery well because glTF is designed for efficient transmission and loading, GLB keeps the asset self-contained in one binary, Three.js GLTFLoader supports KHR_mesh_quantization, KHR_texture_basisu, KHR_meshopt_compression, EXT_meshopt_compression, and Draco, and Vite’s public directory is the cleanest way to serve exact asset filenames referenced by a JSON manifest. 

For a kart game, Meshopt should be the default geometry path, not Draco. The reason is runtime behavior: glTF Transform documents Meshopt as lightweight, fast to decode, and appropriate for models of any size, while Draco is best reserved for geometry-heavy assets and can lose its advantage on smaller assets because decoder cost may outweigh size savings. That tradeoff matters in a racing game, where visible assets stream in while maintaining responsiveness on mobile hardware. Keep Draco as an opt-in override for unusually large static track modules when download size beats decode latency in your target environment. 

The implementation principle is simple: do not let imported art own gameplay. Preserve the current React/Vite/Three.js race mechanics by keeping collision, lap logic, boosts, checkpoints, input, and item behavior in the existing gameplay files, while moving only the visual surface to manifest-driven GLB assets. That keeps the current race playable even if an asset fails validation or falls back to a simpler visual. Three.js also makes this separation practical because repeated props can be instanced to reduce draw calls, renderer statistics can be sampled through renderer.info, and materials and textures can be explicitly disposed when assets are swapped or unloaded. 

If Blender is part of the source toolchain, keep authoring constraints intentionally narrow for the first shipping version: export Binary .glb, restrict materials to Principled BSDF or Unlit, and use Actions/NLA for any animation that must survive export. Blender’s glTF documentation and API docs explicitly describe GLB export, supported material families, and Actions/NLA animation export. 

Assumptions used in this report: I can see the target file paths you named — src/game/ComebackCityThreeKartRace.jsx, src/game/race/render/*, src/game/race/tracks/*, and src/assets/game/asset-manifest.json — but I could not inspect the current repository contents in this conversation. So the report assumes: the project already runs on React + Vite + Three.js; the existing race is already playable with placeholder or procedural visuals; the listed npm scripts already exist or can be re-wired; and the owner is willing to add build-time asset generation outside the browser runtime. Where those assumptions may be wrong, I call out exact owner questions later in the report.

## Pipeline design

The repeatable path should be:

```text
game-assets/raw
  -> audit
  -> classify
  -> optimize
  -> validate
  -> preview
  -> capture proof
  -> promote
  -> update manifest
  -> consume in runtime
```
That flow matches the strengths of the tooling. glTF Transform provides audit, validation, restructuring, quantization, simplification, texture conversion, and compression tooling; Khronos’s glTF-Validator emits machine-readable JSON reports with both issues and asset stats; Playwright captures screenshots, videos, and visual comparisons; and Vite cleanly serves finalized runtime assets from public while leaving your source manifest in src/assets/game. 

A practical implementation-ready flow for each asset should look like this:

Stage	What happens	Primary tools	Pass condition	Artifacts
Raw source	Artist drops *.glb, source textures, and sidecar metadata	Blender export, file conventions	File opens, naming valid	game-assets/raw/...
Audit	Read file stats, materials, textures, triangles, animations, extensions	inspect, validate, gltf-validator	No fatal parse/spec errors	*.audit.json
Classify	Assign budget class and optimization profile	custom script + metadata	Class known, budget profile attached	asset-audit.json
Optimize	Dedup, prune, weld, join, quantize, simplify, texture compress, geometry compress	glTF Transform API/CLI	Both primary and fallback assets produced	*.primary.glb, *.fallback.glb
Validate	Run spec validation + custom budget checks + manifest schema	gltf-validator, custom checks	Zero errors, zero hard-budget violations	asset-validation.json
Preview	Load assets in the same loader path the game uses	local Vite preview + Three.js	Asset renders, no blank canvas, no runtime loader error	gallery page, thumb PNGs
Capture proof	Desktop/mobile screenshots, videos, gallery shot, diff data	Playwright	Proof artifacts captured and nonblank	proof/...
Promote	Copy approved outputs into runtime folder	Node FS scripts	Only validated assets promoted	public/game/runtime/...
Update manifest	Write URLs, metrics, fallback URLs, revision	JSON generator	Manifest schema valid	src/assets/game/asset-manifest.json

The classification step is not optional. The optimization settings that are correct for a hero kart are wrong for an instanced traffic cone. Put that decision in a sidecar metadata file such as asset.meta.json, living next to the raw asset, with fields like id, kind, budgetClass, compression, allowSimplify, requiredAnchors, proofCamera, collisionSource, and authoringNotes. That gives the scripts a stable way to avoid over-compressing hero assets or under-optimizing repeated props. This is consistent with glTF Transform’s scripting model, which is built around reading a document, applying staged transforms, and writing deterministic outputs. 

## GLB optimization strategy

Use .glb only for runtime delivery. A GLB is a single binary with one buffer, which makes cache handling, copying, manifesting, and Preview/Playwright proofing simpler than multipart .gltf + .bin + textures. For browser delivery in a game repo, that operational simplicity is more valuable than hand-editability. 

The canonical optimization sequence should be:

```bash
# audit
npx gltf-transform inspect input.glb
npx gltf-transform validate input.glb

# structure cleanup
npx gltf-transform dedup input.glb step1.glb
npx gltf-transform prune step1.glb step2.glb
npx gltf-transform weld step2.glb step3.glb
npx gltf-transform reorder step3.glb step4.glb
npx gltf-transform quantize step4.glb step5.glb

# draw-call reduction when safe
npx gltf-transform join step5.glb step6.glb

# lossy reduction only if the class allows it
npx gltf-transform simplify step6.glb step7.glb

# primary runtime variant
npx gltf-transform uastc step7.glb step8.glb \
  --slots "{normalTexture,occlusionTexture,metallicRoughnessTexture}" \
  --level 4 --rdo --rdo-lambda 4 --zstd 18 --verbose
npx gltf-transform etc1s step8.glb primary.glb --quality 255 --verbose
npx gltf-transform meshopt primary.glb primary.glb --level medium

# fallback runtime variant
# do this in the Node API with textureCompress(...slots:/^(?!normalTexture).*$/...)
```
That sequence is grounded in what the official tools actually expose. inspect reports whether the model is geometry-heavy, texture-heavy, or draw-call-heavy. validate checks spec correctness. dedup removes duplicate accessors, textures, materials, and meshes. prune removes unreferenced data. weld merges identical vertices and improves cache efficiency. reorder optimizes locality of reference and is explicitly recommended for Web-oriented transmission size or GPU efficiency. quantize reduces memory footprint with KHR_mesh_quantization. join reduces draw calls. simplify is deliberately lossy and therefore should be conditional on class. resample should also be added whenever an asset contains baked animation. 

For texture handling, use KTX2 in the primary variant and WebP/PNG in the fallback. Khronos’s KHR_texture_basisu extension exists specifically to use KTX2 with Basis Universal supercompression for more efficient transmission and reduced GPU memory footprint, and Three.js requires KTX2Loader to decode those textures. glTF Transform’s own guidance shows a mixed approach: use UASTC for normal and packed data textures, and ETC1S for the rest. That is the right trade for a kart game because normal maps and packed ORM textures are the maps most likely to show block artifacts under aggressive ETC1S compression. 

The default geometry compression should be Meshopt, using meshopt after structure cleanup and before final validation. Meshopt provides very fast runtime decompression and a lightweight decoder, and glTF Transform explicitly notes that compression alone does not improve framerate directly; framerate gains come from reducing vertex count and draw calls with simplification and joining. That is why your pipeline should always combine Meshopt with budget-driven simplification and draw-call reduction, not treat compression as a performance feature by itself. 

Use Draco only as an override, not the default. A reasonable policy is: if raw geometry payload is above roughly 1 MB and the asset is mostly static and rarely hot-swapped, allow compression: "draco" in the asset metadata. glTF Transform documents Draco as especially valuable when geometry dominates file size, but also notes that for geometry smaller than 1 MB the decoder library may outweigh the savings. Three.js supports Draco, but it requires explicit loader wiring and decoder assets. 

The fallback strategy should be a separate GLB, not optional fallback images embedded into the same GLB. The Khronos extension spec allows optional PNG fallback images in the same asset, but glTF Transform’s KHRTextureBasisu docs state that when the extension is added by glTF Transform it should be required, and the tool does not support writing fallback PNG/JPEG data into the same asset. That makes separate primary and fallback GLBs the cleanest and most deterministic implementation in this repo. 

## Budgets and file structure

The following budgets are recommended engineering targets, not official industry standards. They are derived from the constraints official docs emphasize for WebGL apps: keep VRAM under a measured budget, batch draw calls, use mipmaps for 3D textures, use compressed texture formats to reduce GPU memory, and use instancing where repeated meshes share geometry and material. Those principles are what the numbers below are trying to make concrete for a mobile-first browser racer. 

Asset budgets
Asset class	Triangles target	Hard max	Materials / draw calls target	Texture cap	Primary GLB target	Fallback GLB max	Estimated active GPU memory target
Hero kart	12k	18k	1 material / 1–2 calls	1×1024 color, 1×1024 normal, 1×512 ORM	250–450 KB	700 KB	2.5–3.5 MiB
Rival kart	8k	12k	1 material / 1 call	1×1024 color, 1×512 normal/ORM	180–320 KB	500 KB	1.5–2.5 MiB
Seated character	10k	15k	1–2 materials / 1–2 calls	1×1024 color, 1×512 normal, 1×512 ORM	220–420 KB	650 KB	2–3 MiB
Simple prop	300	1k	1 material / 1 call before instancing	1×256 or shared atlas	10–40 KB	80 KB	0.05–0.2 MiB
Complex prop	2k	6k	1 material / 1–2 calls	1×512 color, optional 1×512 ORM	60–180 KB	300 KB	0.5–1.2 MiB
Item box	1k	2k	1 material / 1 call	1×512 color+emissive	40–120 KB	180 KB	0.4–0.9 MiB
Boost pad	500	1.5k	1 material / 1 call	1×256 or 1×512	20–80 KB	120 KB	0.2–0.6 MiB
Track module	10k	25k	1–2 materials / 1–3 calls	1×1024 atlas, optional 1×1024 detail/normal	250–900 KB	1.3 MB	3–6 MiB
Full visible race scene	80k–120k	140k mobile / 220k desktop	60–90 calls mobile / 120 desktop	active unique texture set <= 12 MiB compressed assets	first visible set <= 4.5 MB compressed	<= 7 MB	70–120 MiB total scene budget

For texture dimensions, keep the default ceilings at 256 for tiny props and decals, 512 for most props and interactive pickups, 1024 for hero vehicles and close-view characters, and 2048 only when the track module truly needs an atlas and can prove it in screenshots. A mipmapped 1024² uncompressed RGBA8 texture costs about 5.33 MiB, while a 1024² compressed texture around 4–8 bits per pixel is roughly 0.67–1.33 MiB including mip overhead; the same relationship scales to 2048² textures as roughly 21.33 MiB uncompressed versus 2.67–5.33 MiB compressed. Those latter numbers are an engineering inference based on MDN’s compressed-format memory behavior, MDN’s 30% mip overhead note, and common ETC2/ASTC-class bit rates that KTX2 transcoders target at runtime. 

For bundle budgets, keep asset bytes out of the JS bundle entirely. The race route should lazy-load visual decoders and runtime assets only when the player enters the race. A good first target is: main app JS+CSS <= 320 KB gzip, race-mode async JS <= 450 KB gzip, decoders <= 400 KB compressed and lazy-loaded, and initial race asset payload <= 5 MB compressed on mobile. Those numbers are recommendations based on the fact that Vite treats public assets separately from the source graph, so you can keep the race art payload from inflating initial route JS. 

Recommended file structure
Use exact folders like this:

```text
game-assets/
  raw/
    karts/
    characters/
    props/
    tracks/
  working/
    primary/
    fallback/
    metrics/
  rejected/
  thumbs/
  proof/
    screenshots/
    videos/
    diffs/
    contact-sheets/
    traces/
  manifests/
    asset-audit.json
    asset-validation.json
    asset-gallery.json
    asset-promotion-log.json
  budgets/
    game-asset-budgets.json

public/
  game/
    runtime/
      glb/
        karts/
        characters/
        props/
        tracks/
      decoders/
        basis/
        draco/

src/
  assets/
    game/
      asset-manifest.json
```
Put raw, working, rejected, proof, budgets, and manifests outside src/ so they never enter the app bundle accidentally. Put promoted runtime GLBs and decoder blobs in public/game/runtime, because Vite serves public files at root and copies them to the output directory as-is without transformation. Keep the source-of-truth manifest in src/assets/game/asset-manifest.json, because the app should import that JSON directly and use its public-root-relative URLs like /game/runtime/glb/.... 

Scripts, commands, and dependencies
Install the new toolchain like this:

```bash
npm i -D \
  @gltf-transform/cli \
  @gltf-transform/core \
  @gltf-transform/extensions \
  @gltf-transform/functions \
  gltf-validator \
  sharp \
  meshoptimizer \
  draco3dgltf \
  fast-glob \
  execa \
  zod \
  pngjs \
  pixelmatch \
  wait-on \
  playwright \
  @playwright/test

npx playwright install --with-deps
```
That dependency set directly matches the primary docs: glTF Transform exposes both CLI and scripting APIs; sharp is the recommended image encoder for texture optimization in Node; Playwright’s official install flow downloads browser binaries with npx playwright install --with-deps; and the mesh/Draco packages align with the official glTF Transform scripting examples for Node I/O and compression dependencies. 

These package.json entries are the simplest wiring for the first version:

```json
{
  "scripts": {
    "assets:audit": "node scripts/audit-game-assets.mjs",
    "assets:optimize": "node scripts/optimize-game-glbs.mjs",
    "assets:validate": "node scripts/validate-game-assets.mjs",
    "assets:gallery": "node scripts/render-asset-gallery.mjs",
    "assets:proof": "node scripts/capture-race-proof.mjs",
    "assets:compare": "node scripts/compare-race-visuals.mjs",
    "assets:promote": "node scripts/promote-approved-assets.mjs"
  }
}
```
## Script plan

Script	Inputs	Outputs	Required packages	Command example	Pass / fail criteria	Generated files
scripts/audit-game-assets.mjs	game-assets/raw/**/*.glb, optional asset.meta.json	consolidated audit + per-asset reports	@gltf-transform/core, @gltf-transform/extensions, @gltf-transform/functions, gltf-validator, fast-glob, zod	node scripts/audit-game-assets.mjs --src game-assets/raw --out game-assets/manifests/asset-audit.json	Pass: every file loads, validates, and classifies. Fail: parse errors, spec errors, duplicate IDs, unknown budget class without override.	game-assets/manifests/asset-audit.json, game-assets/manifests/per-asset/*.audit.json
scripts/optimize-game-glbs.mjs	raw assets + audit manifest + budget config	primary and fallback working GLBs + metrics	execa, sharp, meshoptimizer, draco3dgltf, glTF Transform packages, fast-glob	node scripts/optimize-game-glbs.mjs --src game-assets/raw --work game-assets/working --budgets game-assets/budgets/game-asset-budgets.json	Pass: each approved raw asset emits primary and fallback. Fail: missing variant, failed transform, size regression > threshold, hard budget violation.	game-assets/working/primary/**/*.glb, game-assets/working/fallback/**/*.glb, game-assets/working/metrics/*.json
scripts/validate-game-assets.mjs	working GLBs + budget config + audit data	validation summary	gltf-validator, @gltf-transform/functions, zod	node scripts/validate-game-assets.mjs --work game-assets/working --out game-assets/manifests/asset-validation.json	Pass: validator errors = 0, hard budgets = 0, required anchors present, manifest fields resolvable. Fail: any spec error or hard-budget miss.	game-assets/manifests/asset-validation.json
scripts/render-asset-gallery.mjs	validated working assets	thumbnail PNGs + gallery manifest + optional static gallery HTML/JSON	playwright, sharp, fast-glob, wait-on	node scripts/render-asset-gallery.mjs --work game-assets/working --out game-assets/thumbs	Pass: every promoted asset has a nonblank thumb and metadata row. Fail: missing thumbnails, blank renders, loader errors.	game-assets/thumbs/**/*.png, game-assets/manifests/asset-gallery.json
scripts/capture-race-proof.mjs	local preview server + runtime manifest + proof seed	screenshots, videos, trace, metrics	playwright, wait-on, execa	node scripts/capture-race-proof.mjs --url http://127.0.0.1:4173 --seed asset-pipeline	Pass: desktop/mobile screenshots + videos saved, canvas nonblank, race scene renders, proof metrics captured. Fail: blank canvas, console errors, loader errors, unexpected fallback, missing output artifacts.	game-assets/proof/screenshots/*.png, game-assets/proof/videos/*.webm, game-assets/proof/traces/*.zip, game-assets/proof/metrics.json
scripts/compare-race-visuals.mjs	proof screenshots + baseline refs	diffs + contact sheets + summary	pixelmatch, pngjs, sharp, fast-glob	node scripts/compare-race-visuals.mjs --actual game-assets/proof/screenshots --expected tests/visual/references/v2	Pass: diff under configured threshold. Fail: threshold exceeded or baseline missing in strict CI mode.	game-assets/proof/diffs/*.png, game-assets/proof/contact-sheets/*.png, game-assets/proof/visual-compare.json
scripts/promote-approved-assets.mjs	validated working assets + approval manifest	runtime files + updated manifest + promotion log	node:fs/promises, crypto, fast-glob, zod	node scripts/promote-approved-assets.mjs --from game-assets/working --to public/game/runtime --manifest src/assets/game/asset-manifest.json	Pass: only validated assets copied, manifest rewritten atomically, all URLs exist. Fail: promotion without validation, URL mismatch, stale metrics.	public/game/runtime/**, src/assets/game/asset-manifest.json, game-assets/manifests/asset-promotion-log.json

For optimize-game-glbs.mjs, the actual implementation should use both the glTF Transform scripting API and CLI. Use the Node API for audit, custom per-class conditionals, fallback texture conversion with textureCompress, and JSON metrics; use the CLI only for the KTX2/Basis passes where the official tool already exposes uastc, etc1s, and ktxfix commands cleanly. That hybrid approach is more maintainable than trying to force every step through the CLI or every step through raw extension plumbing. 

## Runtime integration and visual proof

src/game/ComebackCityThreeKartRace.jsx should remain the authoritative gameplay orchestrator. Do not replace race logic with artist-authored scene graphs. Instead, introduce a visual asset layer that maps existing gameplay entities to manifest IDs. A kart entity that the game already knows as “player kart” or “rival kart” should gain only a visualAssetId and possibly visualVariant, while physics size, wheelbase, hitbox, boost behavior, slipstream logic, and checkpoint behavior remain in code. This keeps the race mechanics stable while visual assets can iterate independently. 

Inside src/game/race/render/*, add a small loader stack. At minimum, you want: raceAssetRegistry.ts or .js to read the manifest; loadRaceAsset.ts to choose primary vs fallback; cloneRaceAssetScene.ts to return reusable scene instances; and disposeRaceAssetScene.ts to traverse the scene and call dispose() on geometry, materials, and textures when appropriate. This is important because GLTFLoader uses image bitmaps and Three.js docs warn that they are not automatically garbage-collected when no longer referenced; explicit cleanup matters if you swap scenes, re-enter races, or hot-reload in development. 

Inside src/game/race/tracks/*, keep the current track definition authoritative for layout, checkpoints, collision, spline, item spawn points, and boost triggers, but let each module reference a promoted visual asset ID. In other words: the track files become the place where logical track pieces say “use track.module.corner-neon-01 here”, not the place where raw meshes are authored. This lets you preserve today’s race behavior while upgrading scenery piece by piece.

src/assets/game/asset-manifest.json should become a generated file with a schema like this:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-06-17T00:00:00.000Z",
  "runtimeBaseUrl": "/game/runtime",
  "decoders": {
    "basisTranscoderPath": "/game/runtime/decoders/basis/",
    "dracoDecoderPath": "/game/runtime/decoders/draco/"
  },
  "assets": {
    "kart.hero.comeback-city": {
      "kind": "kart",
      "budgetClass": "hero-kart",
      "primary": "/game/runtime/glb/karts/comeback-city.primary.glb",
      "fallback": "/game/runtime/glb/karts/comeback-city.fallback.glb",
      "thumbnail": "/game-assets/thumbs/karts/comeback-city.png",
      "metrics": {
        "triangles": 11842,
        "materials": 1,
        "drawCallsExpected": 1,
        "primaryBytes": 392144,
        "fallbackBytes": 581923
      },
      "anchors": {
        "seat": [0, 0.42, -0.08],
        "frontAxle": [0, 0.18, 0.66],
        "rearAxle": [0, 0.18, -0.61]
      }
    }
  }
}
```
The runtime loader should choose the primary variant whenever KTX2 and the selected geometry codec are available, and otherwise choose fallback. The required Three.js wiring is straightforward and official: GLTFLoader.setKTX2Loader() is required for KTX2, KTX2Loader.detectSupport(renderer) must run before loading textures, GLTFLoader.setMeshoptDecoder() is required for EXT_meshopt_compression, and GLTFLoader.setDRACOLoader() is required only for Draco assets. 

A practical loader skeleton looks like this:

js
Copy
import manifest from '@/assets/game/asset-manifest.json';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';

export function createRaceAssetLoader(renderer) {
  const gltfLoader = new GLTFLoader();

  const ktx2Loader = new KTX2Loader()
    .setTranscoderPath(manifest.decoders.basisTranscoderPath)
    .detectSupport(renderer);

  const dracoLoader = new DRACOLoader()
    .setDecoderPath(manifest.decoders.dracoDecoderPath);

  gltfLoader.setKTX2Loader(ktx2Loader);
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  gltfLoader.setDRACOLoader(dracoLoader);

  function pickVariant(entry) {
    return entry.primary ?? entry.fallback;
  }

  return {
    async load(assetId) {
      const entry = manifest.assets[assetId];
      const url = pickVariant(entry);
      return gltfLoader.loadAsync(url);
    },
    dispose() {
      ktx2Loader.dispose();
      dracoLoader.dispose();
    }
  };
}
To preserve visuals correctly, do not regress Three.js color handling. Current Three.js docs show the renderer’s outputColorSpace default as SRGBColorSpace, and GLTFLoader natively supports the modern glTF material and texture extensions you want to use. Unless your repo is pinned to a much older Three.js release, you should keep that modern color-management path intact rather than manually overriding glTF-loaded texture color spaces. 

## Visual proof workflow

The proof workflow should be automated with Playwright and produce these artifacts on every promoted asset batch:

Artifact	Required viewport / device	What it proves	Implementation note
Desktop screenshot	1440×900 Chromium	primary race scene visually loads	page.screenshot() or toHaveScreenshot()
Mobile screenshot	393×851 mobile emulation	mobile-safe layout and asset readability	Playwright emulation with touch/mobile context
Desktop video	10 seconds	motion, shader stability, streaming, no mid-race blanks	browser context with recordVideo; close context to save
Mobile video	10 seconds	same proof under mobile emulation	same as above with mobile context
Asset gallery screenshot	full-page	every promoted asset renders in browser	one gallery route, full-page screenshot
Contact sheet vs V2 references	static image sheet	easy human review of old vs new look	sharp montage + diff labels
WebGL nonblank checks	JS eval + image histogram	catches “canvas exists but scene never rendered”	inspect renderer.info, canvas pixels, alpha coverage
Fallback detection checks	JS eval + console scan	proves fallback only happens when expected	expose window.__assetPipelineMetrics

Playwright’s official docs cover screenshots, full-page screenshots, stored visual comparisons through toHaveScreenshot(), mobile emulation via device/context options, and test video output. They also recommend using traces on CI retries for debugging. That makes Playwright a good fit not just for proof capture, but for actionable failure artifacts. 

For the nonblank-canvas gate, do two checks. First, inspect runtime counters in the page: renderer.info.render.calls > 0, renderer.info.memory.geometries > 0, and renderer.info.memory.textures > 0. Second, analyze the captured PNG and fail if more than 98% of pixels are the same color or if alpha is effectively zero across the frame. That two-part approach catches both logic bugs and rendering bugs. Three.js exposes the render stats officially through renderer.info, and Playwright provides screenshot buffers for post-processing. 

For the fallback gate, instrument the runtime with a small metrics object such as:

js
Copy
window.__assetPipelineMetrics = {
  usedFallbackAssets: [],
  failedPrimaryAssets: [],
  renderCalls: 0,
  textureCount: 0,
  geometryCount: 0
};
Then make Playwright read it with page.evaluate(). In the normal desktop/mobile proof runs, usedFallbackAssets should be empty. In a dedicated “fallback simulation” run, intentionally disable KTX2 or Meshopt and assert that the fallback assets render correctly instead of failing the scene. That is the simplest way to prove your resilience path actually works.

## CI gates and implementation phases

The existing script names you provided should become hard gates with these behaviors:

Existing command	Gate behavior
npm run build	Must build the app, emit a valid manifest, and confirm that all promoted runtime URLs exist under public/game/runtime.
npm run test:kart-proof	Must run the Playwright proof capture and produce desktop/mobile screenshots, desktop/mobile 10-second videos, metrics JSON, and no blank-canvas failures.
npm run test:kart-playable	Must prove the optimized assets do not break race mechanics: race starts, input or bot controls work, at least one lap/checkpoint flow still completes, and no asset-load error halts play.
npm run test:kart-3d-spike	Must smoke-test GLTFLoader + manifest + decoder integration in isolation on one kart, one track module, one prop, and one fallback path.
npm run test:visual	Must run screenshot comparisons and diff thresholds against the accepted visual baseline.
npm run test:webgl	Must assert WebGL context creation, nonblank rendering, compressed texture support detection, and fallback functioning when codecs are unavailable.
npm run test:bundle	Must assert JS bundle budgets and that runtime art bytes stay out of the initial JS bundle.

The test:visual gate should use toHaveScreenshot() or equivalent pixel diffing for desktop race, mobile race, and asset gallery images. For deterministic results, freeze the race seed, lock the camera path, disable volatile overlays, and if necessary apply a Playwright stylePath to hide transient UI that would otherwise produce meaningless diffs. Playwright documents both snapshot generation/update flow and custom stylePath for determinism. 

The test:webgl gate should include three specific assertions. First, the page must create a WebGL context successfully. Second, it must render at least one frame with nonzero renderer.info stats. Third, it must pass a fallback simulation where KTX2 or Meshopt use is disabled and the scene still renders with fallback assets. That gate matters because official loader docs show KTX2 depends on WebAssembly and detected format support, while compressed texture availability varies by device and browser extensions. 

## Implementation phases

Phase one should add the folder structure, budget config, raw metadata schema, and audit-game-assets.mjs. Do not optimize anything yet. The deliverable is a truthful inventory of what the raw assets contain and which ones can already pass validation. 

Phase two should implement optimize-game-glbs.mjs and validate-game-assets.mjs, producing primary and fallback variants for one hero kart, one rival kart, one seated character, one prop, one boost pad, and one track module. That is the smallest slice that exercises every major budget class. 

Phase three should integrate manifest-driven loading into src/game/ComebackCityThreeKartRace.jsx and src/game/race/render/*, but only swap visuals for one lane of content at a time. Start with the player kart and one track module while leaving everything else on current visuals. That minimizes the blast radius on race mechanics.

Phase four should add Playwright proof capture and visual compare, along with the dedicated proof seed and asset gallery route. Do this before promoting a full art drop, so every future asset batch has machine-verifiable proof from day one. 

Phase five should expand coverage to all track modules and repeated props, add instancing where the renderer path permits it, and enforce the CI hard gates. This is where draw-call and VRAM wins become visible, because repeated scenery is where batching and instancing matter most for a kart game. 

## Risks, decisions, assumptions, and exact owner questions

The highest-risk decisions are these. First, whether you want runtime assets in public/ or hashed imports from src/. This report recommends public/ because the manifest is JSON and Vite explicitly supports exact-path public assets served and copied as-is. Second, whether you want Meshopt-only or Meshopt plus rare Draco overrides. This report recommends Meshopt-first. Third, whether your current gameplay layer derives any behavior from render mesh bounds; if it does, you need to stop doing that before replacing visual meshes wholesale. 

The main technical risks are predictable. Over-compressing hero assets will produce visible surface artifacts; KTX2 without a fallback path will fail on unsupported environments; letting track art define gameplay layout will destabilize racing logic; and not disposing old materials/textures will leak memory across route reloads or repeated sessions. Those are exactly the kinds of issues the primary docs warn about: compressed texture formats vary by platform, KTX2 depends on runtime support detection, and Three.js resources should be explicitly disposed when no longer used. 

## Exact follow-up questions for the owner

What Three.js version is currently pinned in the repo, and does the existing renderer already use the modern outputColorSpace path?
Does src/assets/game/asset-manifest.json already have a schema in production, or can it be replaced outright with a generated schema?
Does the current race logic derive collision, wheel placement, kart size, or checkpoint behavior from visual mesh bounds anywhere in src/game/ComebackCityThreeKartRace.jsx or src/game/race/render/*?
Do src/game/race/tracks/* currently separate collision/layout data from decorative render data, or are those still mixed together?
Are you willing to serve runtime art from public/game/runtime, or do you need transformed and hashed asset URLs from within src/?
Are there already V2 reference screenshots/videos in the repo for the visual comparison gate, or must the first approved run generate them?
Which mobile devices define success for this project: low-end Android, mid-range Android, recent iPhone, or a mixed set?
Is the seated character intended to stay mostly static, or do you need a skinned animated driver in the first version?
Are you willing to ship the Basis and Draco decoder files in public/game/runtime/decoders, or is there an existing asset-hosting constraint?
Do any assets need to remain editable in external DCC tooling after optimization, or can optimized GLBs be treated as strictly generated artifacts?

## Sources

Three.js official docs

GLTFLoader support and loader setup. 
KTX2Loader setup, detectSupport(), transcoder path, and WASM requirement. 
DRACOLoader decoder path and worker controls. 
InstancedMesh draw-call reduction. 
Renderer.outputColorSpace and renderer.info. 
Material.dispose() and Texture.dispose(). 
glTF and Khronos primary docs

glTF overview and positioning as runtime delivery format. 
glTF 2.0 specification. 
KHR_texture_basisu extension spec and fallback examples. 
EXT_meshopt_compression extension spec. 
KHR_draco_mesh_compression extension spec. 
Official glTF Validator. 
glTF Transform official docs

CLI quickstart and command list. 
Scripting API overview and Node examples. 
inspect, dedup, prune, weld, reorder, quantize, simplify, meshopt, resample, join, textureCompress, KHRTextureBasisu, KHRDracoMeshCompression. 
Blender official docs

glTF exporter supports GLB, Principled BSDF / Unlit materials, and Actions/NLA animation export. 
Playwright official docs

Screenshots and full-page screenshots. 
Visual comparisons with toHaveScreenshot(). 
Video recording. 
Emulation and mobile/device settings. 
CI traces and trace viewer guidance. 
Installation. 
Vite official docs

Static asset handling, explicit URL imports, and public directory behavior. 
WebGL and mobile performance official docs

WebGL best practices: per-pixel VRAM budget, smaller back buffer, batching, eager deletion, mipmaps. 
Compressed texture formats and GPU-memory benefits. 
Meshopt and Draco primary docs

meshoptimizer and gltfpack background. 
Draco project overview.


---

# Pro Handoff Instructions

# Pro Synthesis Handoff And GPT Deep Research Prompt

Use this file to run one more GPT Deep Research pass and then feed all reports into Pro for the final synthesis.

## Pro Synthesis Input Format

Share one Markdown packet with Pro in this order:

1. `docs/comeback-city-visual-pipeline-research-prompts.md`
   - Include the full Shared Repo Context.
   - Include the Pro Synthesis Prompt section.
2. `docs/research/gemini-visual-pipeline-report.md`
3. `docs/research/kimi-visual-pipeline-report.md`
4. `docs/research/claude-report-1-asset-runtime-pipeline.md`
5. `docs/research/claude-report-2-track-visual-unreal-mcp.md`
6. `docs/research/claude-report-3-final-build-plan.md`
7. `docs/research/chatgpt-deep-research-technical-risk-audit.md`
8. Add this instruction before the reports:

```markdown
You are receiving multiple independent research reports plus the repo context. Treat the reports as research inputs, not as instructions to blindly follow. Reconcile conflicts, verify recommendations against the embedded repo facts, and produce one implementation-ready plan for Codex. Where the reports disagree, choose the safest path for the existing React/Vite/Three.js codebase and explain the decision briefly.
```

Use formatted Markdown reports, not the `.raw.txt` files. Keep the raw files in the repo as provenance only.

Attach the six V2 art cards to Pro if the interface supports images:

- `src/assets/game/art-direction/v2/hero-red-kart-trait-card-v2.png`
- `src/assets/game/art-direction/v2/track-geometry-road-system-trait-card-v2.png`
- `src/assets/game/art-direction/v2/roadside-props-barriers-trait-card-v2.png`
- `src/assets/game/art-direction/v2/pickups-boost-vfx-trait-card-v2.png`
- `src/assets/game/art-direction/v2/material-lighting-camera-trait-card-v2.png`
- `src/assets/game/art-direction/v2/district-portals-facades-trait-card-v2.png`

## GPT Deep Research Prompt

```markdown
Goal: Independently verify the safest implementation path for the Comeback City automated Three.js asset and track pipeline, focusing on toolchain correctness, runtime risk, and first-phase implementation quality.

Success means:
- The report verifies current official or primary-source facts for glTF-Transform, Three.js GLTFLoader compression support, Meshopt, Draco, KTX2/Basis, WebP textures, Playwright video/screenshots, Blender CLI, and Unreal MCP.
- The report identifies recommendations that are risky, over-scoped, stale, or mismatched to this repo.
- The report gives a conservative implementation sequence that improves visuals without destabilizing the existing race mechanics.
- The report recommends exact package additions, script boundaries, asset folder choices, and validation gates.
- The report separates decisions for Phase 1 from decisions that belong later.
- The report includes source links for material claims.
- The report labels every assumption and lists exact owner questions.

Stop when the output can be used as a technical risk audit and implementation sanity check during final Pro synthesis.

Use the Shared Repo Context from `docs/comeback-city-visual-pipeline-research-prompts.md` as the fixed project context. Treat local paths as labels only; use the embedded repo snapshot as source context.

Research focus:

1. Verify glTF pipeline choices
Check current official docs and primary sources for:
- `@gltf-transform/core`
- `@gltf-transform/functions`
- `@gltf-transform/extensions`
- `@gltf-transform/cli`
- `meshopt`
- `draco`
- texture resizing/compression with `sharp`
- WebP texture support in glTF and Three.js
- KTX2/Basis tradeoffs for browser/mobile games

Return a clear recommendation for this repo:
- first implementation compression strategy
- fallback strategy
- whether to use Meshopt, Draco, both, or neither in Phase 1
- whether to use WebP, KTX2, both, or neither in Phase 1

2. Verify Three.js runtime impact
Research current Three.js guidance for:
- GLTFLoader support for extensions
- DRACOLoader setup
- MeshoptDecoder setup
- KTX2Loader setup
- runtime bundle impact
- Vite asset handling for GLB/wasm/decoder files
- mobile WebGL constraints

Return exact integration implications for:
- `src/game/ComebackCityThreeKartRace.jsx`
- `src/game/race/render/createRaceScene.js`
- `src/game/race/render/createTrackMesh.js`
- `vite.config.js`
- `package.json`

3. Verify Playwright proof strategy
Research current Playwright behavior for:
- screenshots of WebGL canvases
- video recording
- Chromium channels
- headless/headed differences
- traces
- CI environment limitations

Return a practical proof strategy that fits the existing scripts:
- `scripts/kart-3d-spike-test.mjs`
- `scripts/kart-playable-proof-test.mjs`
- `scripts/visual-reference-checks.mjs`
- `scripts/bundle-asset-budget-report.mjs`

4. Audit proposed file structure
Compare these candidate approaches:
- keeping optimized runtime assets in existing `src/assets/game/models/avatars` and `src/assets/game/models/tripo`
- adding `src/assets/game/models/_raw`
- adding `.asset-workspace`
- adding `src/assets/game/models/track-modules`
- adding `docs/research`

Recommend the structure that best fits Vite, git hygiene, and the current repo.

5. Audit track workflow
Research and recommend the safest path for track visuals:
- keep current data-driven track definitions
- add visual module fields conservatively
- use instancing where repeated props/modules justify it
- keep physics/progress independent from visual modules
- define what belongs in Phase 1 versus later

Return a minimal first track-kit implementation plan that improves screenshots without requiring a full track-system rewrite.

6. Audit Unreal MCP role
Research current Unreal Engine MCP status and capabilities from official or primary sources.

Return a conservative recommendation:
- what Unreal MCP is useful for
- what evidence should trigger using it
- what output should feed back into Three.js
- what work should stay in the Three.js pipeline

7. Final risk table
Return a table with:
- recommendation
- risk
- likely impact
- safer alternative
- phase to address

8. Final implementation recommendation
Return:
- Phase 1 exact scope
- packages to add
- scripts to build first
- folders to create first
- gates to run first
- choices to defer

Use precise engineering language. Prefer scoped, reversible steps over large rewrites. Cite sources.
```

## Pro Packet Checklist

Before sending to Pro, confirm the packet includes:

- Shared Repo Context.
- Gemini formatted report.
- Kimi formatted report.
- Claude report 1 formatted report.
- Claude report 2 formatted report.
- Claude report 3 formatted synthesis.
- ChatGPT deep research formatted report.
- Pro Synthesis Prompt.
- Image attachments for the six V2 cards, if supported.

Ask Pro for one final artifact:

```markdown
Return one implementation-ready plan for Codex. Include a final first-task prompt that starts with asset inventory and validation, preserves existing mechanics, and defers Unreal MCP until the Three.js proof pipeline is producing trustworthy screenshots/videos.
```
