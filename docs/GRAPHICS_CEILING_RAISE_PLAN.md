# Graphics Ceiling Raise — G1/G2/G3 Plan

> Owner-approved 2026-07-17 ("love those ideas lets write a detailed plan").
> Thesis (agreed with owner): the CODEBASE IS NOT THE CEILING — Three.js does
> everything MK8-style stylization needs; the gap is studio *process*: baked
> lighting, animation on everything, and particles/decals. Engine port stays
> RULED OUT (third time asked, third time same answer: Unity/Unreal web = 50—
> 150 MB wasm + dead load times; distribution model is "group clicks a link").

## The three phases (owner greenlight order = impact order; EXECUTION order
## flexes around his machine — see "Machine etiquette" below)

- **G1 — Baked lighting & ambient occlusion** (biggest jump; needs local
  Blender = quiet-machine batches; changes textures → proof re-baseline)
- **G2 — Everything-animates pass** (zero bytes, code only, safe anytime)
- **G3 — Particles & decals** (small JS, code only; formally SUPERSEDES the
  old "no particle systems" scope rule — this plan's approval is the record)

**Recommended execution: G2 → G3 → G1** (G2/G3 don't need his machine free;
G1's Blender bakes + proof re-baseline land in a quiet window).

---

## G2 — Everything-animates (start here)

Static scenery is the #1 amateur tell (self-diagnosed in
PENGUIN_KART_VFX_VISUAL_GAP_PLAN.md item 9). All procedural, zero assets.

### Tasks
1. **Driver lean + counter-lean.** `playerModel.driverMount` rotates with
   steer/drift (lean INTO drifts, slight counter on release-kick). Rivals get
   the same from their sim state. Pure render-loop, mirrors how drift VFX
   reads state.
2. **Kart landing squash + suspension bob.** On `airborne -> grounded`
   (the audio observer's `land` transition already detects this — same
   pattern, see kartAudio.js `cuesForTransition`) squash body scale ~0.92y
   for ~150ms; subtle speed-scaled body bob while grounded. CAMERA IS PINNED
   phoneWide — bob the kart BODY group, never the camera.
3. **Spectator/pennant sway.** Shader-time `sin(time + instanceId)` sway via
   `onBeforeCompile` — MUST route through the Amendment-7 injection registry
   (`src/game/race/render/toonRimShader.js`, `addShaderInjection` +
   merged `customProgramCacheKey`) and preserve `matrixAutoUpdate=false`.
4. **CC signage UV-scroll** (one or two Miami-building emissive strips).
5. **PV snowfall** — ONE InstancedMesh (~200 quads), +1 draw call, respects
   `reducedMotion` (prop already reaches the race component — gate ALL G2/G3
   ambient motion on it).
6. **PV ice-floe drift** on the frozen river (slow position/rotation drift).

### Guards
- Draw calls: only snowfall adds one. PV proof cap is 800 — check headroom in
  the CURRENT proof run before adding anything else.
- phase5 headed medians must hold vsync-144 on the M4 (quiet machine).
- No physics/no-touch files: kartTuning/kartPhysics/surfacePhysics/airTricks/
  heldItems/rivalRacers/raceBreakables/raceCrossers stay untouched.

---

## G3 — Particles & decals

The old "no particle systems" rule was scope triage from the crisis era, NOT
a perf finding — THIS PLAN'S OWNER APPROVAL SUPERSEDES IT. Keep everything
instanced; target ≤4 added draw calls total.

### Tasks
1. **Drift snow spray.** Instanced quads (~48) at the rear wheels while
   drifting; color follows DRIFT_FEEL.sparkColors tier grammar (charge →
   cyan → amber → violet — same palette the sparks/trail/ring use, one
   grammar everywhere). Emission rate scales with tier.
2. **Skid marks.** Ring buffer (~64 quads, ONE BufferGeometry updated in
   place, one draw call) laid on the road during drift; fade out over ~6s.
   Dark on CC asphalt, blue-white scrape on PV ice.
3. **Boost speed-lines.** Camera-space radial streak sprites during
   boost/mini-turbo (visible feedback pairs with the violet t3 flame).
4. **Coin sparkle burst** on pickup (audio `coin` cue already marks the
   frame — reuse the transition).
5. **Item-hit poof** on spin-outs (matches `spin-out` audio cue frame).

### Guards
- Sync source of truth: derive every burst from the SAME state transitions
  kartAudio.js uses (`cuesForTransition` is pure + exported — call it or
  mirror it; do NOT invent a second event system).
- `reducedMotion` gates ambient intensity (keep gameplay-critical feedback
  like drift spray, drop decorative extras).
- Mobile 30-FPS floor: verify on phone pass; particles are the first thing
  to tier down (halve instance counts under `viewport.mobile`).

---

## G1 — Baked lighting & ambient occlusion (quiet-machine phase)

Every trackside GLB mounts UNLIT (`MeshBasicMaterial{map}` in
`mountMiamiAsset`) — so "lighting" is whatever is painted in the texture.
That is exactly why bakes work here: AO/GI multiplied INTO the base-color
texture ships with ZERO shader changes and ZERO draw-call cost.

### Tasks
1. **Inventory + priority.** Assets that touch the ground and fill the frame
   first: 6 Miami buildings/roadside (CC), PV tribute set (6), igloos/
   statues. Karts/avatars are toon-lit — SKIP them (rim+gradient carries).
2. **Blender AO bake batch.** Local Blender (BLENDER_BIN, see
   `asset-pipeline/config/blender-decimation.json` for the wiring pattern;
   `assets:bake` / `scripts/bake-baked-glbs.mjs` is the existing bake lane).
   Per asset: import GLB → bake AO (+ soft top-down sun lightmap where it
   reads) → MULTIPLY into base color → re-export → re-diet (weld/resize/
   meshopt — individual verbs, NEVER `gltf-transform optimize`).
3. **Ground-contact shadows.** Where a full re-bake is risky, cheap contact
   decal quads under buildings/props (dark radial gradient, the kart blob-
   shadow pattern at 681-694 in ComebackCityThreeKartRace.jsx).
4. **Track-edge AO.** The road mesh is generated — darken edge/curb verts
   via vertex colors at build time (no texture cost at all).
5. **Manifest hygiene.** Every re-baked GLB: update `outputHash` (+ keep
   sourceHash), asset-manifest entry note "G1 AO bake", or `assets:check`
   fails loudly. Budget: textures may grow 384→512 where AO detail needs it;
   current headroom ~1.1 MB gz under the 12000 gate.
6. **Proof re-baseline.** Bakes change pixels → race-proof compare WILL
   diff. Re-baseline with a gatesNote and get the owner's explicit sign-off
   (the W0 pattern). A/B screenshots (before/after per asset, same camera)
   go in the lab sheet for his pick — HE GATES which bakes ship.

---

## Machine etiquette (owner constraint 2026-07-17)

Owner runs 5 things incl. a second model comparing graphics in THIS repo (its
branch ≠ ours; ours = codex/release-v1-comebacktracker-kart-racer). Rules:
- G2/G3 coding + headless smokes are fine anytime.
- Blender bakes, phase5 headed pair, 7-kart balance probe, race-proof when
  load1 < ~4 (`sysctl -n vm.loadavg`; reds at load1 ≥ 7 are FAKE, greens
  always count).
- Deploys stay on the owner's explicit word, per standing convention.

## Battery per phase (all must be green before offering deploy)

`npm run build:kart` FIRST, then: test:bundle:kart (12000 gz gate) ·
test:audio:kart (9 checks) · test:kart-playable · test:race-proof ·
assets:check (G1) · k3 controls smoke (if input touched) · in-game
screenshot evidence in tmp/g{1,2,3}-*/ + origin probes after deploy.

## Standing owed list (unchanged by this plan)

Owner phone verdict on the NEW gyro curve + viewport fix · mid-pack item
visual check · balance probe on the 7-kart grid · phase5 headed pair ·
owner owes: 3 ordinal ChatGPT sheets (characters blocked on them) · game
NAME (placeholder "Penguin Kart"/"Comeback City Grand Prix" split) · MK-
length track = V2 headliner (rebalance widens per recorded call).
