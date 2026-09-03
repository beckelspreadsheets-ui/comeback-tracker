# Penguin Kart — Performance Audit

Scope: the race game only (`src/game/ComebackCityThreeKartRace.jsx` + `src/game/race/render/**`). Findings are from reading the code, not from a capture run. Line numbers are against the tree at branch `aaa-kart-ci` (HEAD `4340dca`). Field of play: **player + 3 rivals = 4 karts** (`RIVALS.length === 3`, line 770).

Severity legend: **HIGH** = measurable per-frame or load hit worth fixing now · **MEDIUM** = real cost, bounded · **LOW** = overhead / hygiene.

---

## HIGH

### H1 — `kartGradePitch` does 2 full `pointAt` calls per frame to read two Y values (elevation regression)
**File:** `ComebackCityThreeKartRace.jsx:10430-10435`, called at `11625`. **Cost:** per-frame, player only (~2 calls/frame). **Regressed in:** commit `1e7a4c6` "Elevation 7c-3 + 7d: kart pitches to grade".

```js
const kartGradePitch = (progress) => {
  const dp = 0.0025;
  const y0 = engine.sampler.pointAt(wrap01(progress - dp)).point.y;
  const y1 = engine.sampler.pointAt(wrap01(progress + dp)).point.y;
  return Math.atan2(y1 - y0, 2 * dp * engine.sampler.length);
};
```

Each `sampler.pointAt` (line 1047) runs an **arc-length binary search** (`curve.getPointAt` → `getUtoTmapping`), a **Catmull-Rom spline evaluation** (`getPoint`), a **tangent evaluation** (`getTangentAt`), and allocates **~4 `Vector3`** (`getPointAt` result, `getTangentAt` result, `new Vector3` normal, `center.clone()`). This function throws all of that away to read `.point.y` — twice.

But `point.y` **is** `elevationAt(p)`: `pointAt` sets `center.y = elevationAt(p)` and, at `lane = 0`, `point === center` in Y. The function's own comment even says "the slope is read from elevationAt". So the two spline evaluations, two binary searches, and eight vector allocations are entirely avoidable.

**Fix:** read the height field directly (the sampler already exposes it, line 1045):
```js
const y0 = engine.sampler.elevationAt(wrap01(progress - dp));
const y1 = engine.sampler.elevationAt(wrap01(progress + dp));
```
Zero allocation, no spline/tangent work. ~10x cheaper and it is exactly the number the current code computes.

### H2 — `loadKartAssets` eagerly `Promise.all`s ~25 GLBs at race start; the on-demand pool was never built
**File:** `ComebackCityThreeKartRace.jsx:2942-2990`. **Cost:** one-time, but blocks/gates race start and holds all decoded meshes resident.

The loader fetches **every** kart body (hero, ice-sled, tripo, mizzle, tclow, layer23, lifoladen, ice-racer, miami-cruiser, ice-block, btc, plus 5 wave-8 bodies), **every** driver avatar, and **every** K7 item prop (fishbone, sardine, avalanche, blizzard) in a single `Promise.all`, regardless of which 4 karts actually race or which track's item set is live. A race uses the player's selected kart + 3 rival seats + the track's props — roughly a third of what is fetched and decoded.

Consequences: (a) first race start waits on the slowest of ~25 `loadAsync` calls; (b) all decoded geometry/textures for unused bodies stay in GPU/CPU memory for the whole session; (c) the positional destructure (line 2990) is a documented footgun.

**Fix:** load the player kart + resolved rival seats + the active track's props on demand; keep the rest behind a lazy `loadKartBody(key)` that memoizes. The `.catch(() => null)` fallback contract already tolerates a body not being present, so the procedural kart covers a not-yet-loaded slot. This is the "on-demand pool" the memory notes were never built.

### H3 — Desktop shadow pass re-renders a 3072² PCF depth map every frame over dynamic **and** static casters
**File:** `raceShadowRig.js:670-677` (tier), `693-703` (camera), `842-863` (`markSceneryCasters`). **Cost:** per-frame GPU, desktop only (mobile is guarded to 512 / player-kart-only, unchanged).

Desktop tier: `mapSize: 3072`, `rivalsCast/driversCast/propsCast: true`. Every frame the renderer re-renders the full depth pass into a 3072×3072 target for the player, 3 rivals, their drivers, and every static scenery mesh `markSceneryCasters` flagged (radius 0.4-40 across the **whole** course). This is one of the two most expensive per-frame render items (the other is the post chain). Frustum culling trims casters outside the 32-unit shadow box, but the **static** scenery inside it is re-rasterized into the depth buffer every frame even though it never moves.

**Fix options (pick one):** drop to 2048² (a 0.031-unit texel over 32 units — still far denser than the "structureless ink" complaint that drove 3072); or render static-scenery casters into the depth map once and re-render only the karts/drivers each frame (a static-depth composite); or exclude static scenery from the tier-1 depth pass entirely and lean on the tier-3 baked far-field grounding that already exists (line 8596). The memory's own note calls 3072 a "1.8x density" luxury; it is the cheapest large win on desktop.

---

## MEDIUM

### M1 — Coin field rewrites and re-uploads its entire instance buffer every frame
**File:** `ComebackCityThreeKartRace.jsx:11976-12028` (update), `8355-8367` (build). **Cost:** per-frame CPU + a full `DynamicDrawUsage` buffer re-upload; **grew ~4x** when coins went 8→30 rows in the AAA work.

Every frame the loop walks **all** coin groups (`~60`: 30 rows × 2) × **all** faces per coin, and for each: computes `lensCoverage` per group (matrix decompose + projection), `compose()`s a matrix, `multiply()`s the baked per-face matrix, and `setMatrixAt` for **every** instance — then flips `instanceMatrix.needsUpdate = true`, re-uploading the whole matrix buffer to the GPU. Coins are static; only the handful within the lens band actually change (the near-shrink). The field is `frustumCulled = false` (M4), so this runs even when the whole field is behind the camera.

**Fix:** gate the rewrite on "at least one coin inside the lens band this frame" (the common case is zero, so skip the loop and the upload entirely); or split near/far so only near coins get per-frame matrices; or track a dirty set and only re-upload changed slots. The static bulk should be written once at build.

### M2 — `sampler.pointAt` allocates ~4 `Vector3` per call and is called ~10x/frame
**File:** `ComebackCityThreeKartRace.jsx:1047-1057`. **Cost:** per-frame GC pressure (worst on mobile). H1 is the acute instance of this systemic issue.

`pointAt` allocates on every call: `curve.getPointAt(p)` (new Vector3), `curve.getTangentAt(p)` (new Vector3), `new THREE.Vector3(...)` (normal), `center.clone()` (point). Per-frame callers: player pose (1, `~11484`), rival poses (3, `12166`), grade pitch (2, H1), corner-push/`trackCurvatureAt` (2-4, `9423-9455`). Call it **~10/frame → ~40+ Vector3/frame → ~2,400/s** at 60fps, plus the arc-length binary search and spline eval each time. Note `pointAt` now also runs `elevationAt(p)` on every call (elevation baked in), a small per-call tax multiplied across all of these.

**Fix:** three's `getPointAt`/`getTangentAt` both accept an `optionalTarget` — thread scratch vectors through and return a pooled `{center, normal, point, tangent}` (the file already pools ~30 module-level `Vector3`s for the camera/ghost paths, e.g. `GHOST_AXIS` at 366). Read-only callers (grade, curvature) don't need fresh objects at all. Landing H1 removes 2 of the ~10 calls outright.

### M3 — `publishTelemetry` runs every frame and no shipped player reads it
**File:** `ComebackCityThreeKartRace.jsx:9605-9691`, called at `13092`. **Cost:** per-frame allocation + string formatting, production included.

Every frame it builds a ~60-field object onto `window.__comebackCityKartTelemetry` with **~30 `Number(x.toFixed(n))`** round-trips (each allocates + parses a string), a `rivalPositionsOf(...)` map over rivals, spread copies (`{ ...miamiMountStats }`), and nested framing/grounding objects. This exists purely for the capture/measurement harness; a real player never reads it.

**Fix:** throttle it to the React snapshot cadence (already gated to 0.14s at `13157`), or gate the whole call behind a `?telemetry=1` / capture flag. The governor and audio observers that consume a couple of these fields can read them directly.

### M4 — Lap-spanning instanced fields are `frustumCulled = false` (known tradeoff — confirmed)
**Files:** `ComebackCityThreeKartRace.jsx:8363` (coins), `7839` (snow), `createRaceScenery.js:103` (scenery default), `createMidGroundBelt.js:1643/2439/2461/2488/2608/2779`, `raceParticles.js:1199/1753/1961`. **Cost:** per-frame vertex throughput (one draw call each, but all instances submitted every frame).

The tradeoff is legitimate: the shared geometry's bounding sphere is a single instance, so three would cull the entire field the moment that one-coin sphere left the frustum. Setting `frustumCulled = false` fixes correctness at the cost of always submitting every instance's vertices — including the ~3/4 of a 4x-track field that is behind the camera or a full lap away. The vertex shader runs for all of them every frame.

**Fix:** split each lap-spanning field into arc-segments, each an `InstancedMesh` with a correct bounding sphere, so off-screen segments cull normally; or, cheaper, compute one field-wide bounding sphere covering all instances (`mesh.geometry.boundingSphere` override) so at least a fully-off-screen field culls as a unit. Either keeps the one-draw-call win while restoring culling.

### M5 — Mobile post chain still runs RenderPass + bloom pyramid + a 6-effect grade pass on a HalfFloat composer
**File:** `racePostChain.js:94` (HalfFloat composer), `126-153` (bloom), `156-189` (grade pass), `246-256` (`setTier`). **Cost:** per-frame GPU on phones, at render-scale floor 0.6.

`setTier(true)` correctly disables SMAA, MSAA, and `bloomTight`, and lowers bloom mip levels 6→4. But mobile **still** runs: the scene RenderPass into a HalfFloat target, `bloomWide` (4-level mipmap blur pyramid), and Pass 2 = speedBlur → aerial haze → ACES tone map → vignette → LUT3D (32³) → grain. That is roughly three fullscreen passes plus a blur pyramid, in half-float, every frame on a phone. HalfFloat doubles bandwidth on exactly the tier that is bandwidth-bound.

**Fix:** on the mobile tier consider dropping `aerial` and/or `speedBlur` from Pass 2, or collapsing bloom to 3 levels; the particle system already has a mobile-only load governor (`raceParticles.js:3904`) and the render-scale governor caps mobile at 0.8 (`createRaceScene.js:26`) — the post chain is the piece with no mobile-load backoff.

---

## LOW

### L1 — Two full-scene traversals every 750ms for telemetry that ships to production
**File:** `ComebackCityThreeKartRace.jsx:9184` (`estimateSceneRenderStats`) + `estimateTextureBytes`, cached via `rendererStatsForFrame` (`10724`), `RENDER_STATS_REFRESH_MS = 750` (`9147`). **Cost:** ~2 whole-graph traversals / 750ms, main thread.

Well-mitigated (cached, not per-frame; the deep breakdown is `import.meta.env.DEV`-gated dead code in prod). But the base estimate still walks hundreds of meshes twice every 750ms purely to populate telemetry no player consumes. Gate it behind the same capture flag as M3.

### L2 — Scene-build cost: road ring loop + ~50k-vertex infield ground plane (one-time, mostly mitigated)
**File:** `ComebackCityThreeKartRace.jsx:3560` (road rings), `4286-4590` (ground plane). **Cost:** one-time, main-thread, behind the loading screen.

The road is rebuilt from `max(96, len/6.5/2*2)` arc-length rings, each calling `pointAt` and cloning several vectors (`3652-3660`); on a 4x track that is a few hundred rings. The infield ground plane is `~50k vertices` (`groundSegments ≈ groundSize/27`), each vertex doing a 3×3 spatial-hash nearest-sample lookup + 4 `heightAt` noise evaluations for normals (`4521-4568`). The code is well-optimized — the spatial-hash lattice (`4480-4508`) deliberately replaced a brute-force O(vertices × samples) search that would have been ~53M distance tests on a 4x track — but it is still tens of ms on the main thread at scene build. Acceptable as a one-time cost; flagged so it is on the radar if load time regresses. The elevation slice added a per-vertex `terrainLift` nearest-sample path here (`4578+`) that is a no-op today (elevation is 0 outside the bridge band) but the nearest-search runs regardless to build normals.

---

## Regressions traceable to the recent elevation work

- **H1 (`kartGradePitch`)** — added by `1e7a4c6`; 2 allocating `pointAt`/frame that should be `elevationAt`. The one clear per-frame regression.
- **`pointAt` now computes `elevationAt(p)` on every call** (`1050`) — small per-call tax now multiplied across every per-frame `pointAt` (M2). Before elevation, center Y was a constant.
- **Infield ground plane gained a per-vertex terrain-follow path** (`4447-4590`) — build-time only, no-op today, but the nearest-sample lattice runs to produce normals regardless.

## Quick-win ordering
1. **H1** — one-line change, removes 2 spline evals + 8 allocs/frame. Do first.
2. **M3 / L1** — gate telemetry behind a flag; removes steady per-frame allocation + periodic double traversal from the shipped build.
3. **M1** — skip the coin rewrite when no coin is in the lens band (the usual case).
4. **H3** — 3072→2048 shadow map (or static-caster cache) for the biggest desktop GPU win.
5. **H2** — on-demand kart/prop loading for faster starts and lower resident memory.
6. **M2** — scratch-vector `pointAt` for systemic GC relief (H1 is the down-payment).
