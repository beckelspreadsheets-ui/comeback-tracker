# Penguin Kart — game audit (2026-09-03)

Three-dimension audit of the game (not the tracker). Full detail per dimension:
- `docs/audit/correctness.md` — bugs / logic / edge cases
- `docs/audit/performance.md` — per-frame + load-time cost
- `docs/audit/architecture.md` — structure / dead code / tech debt

Headline: **no crash, desync, or lap-miscount was found in the shipped rails
path, and the recently-added elevation math is correct.** The biggest issues are
tech-debt and per-frame cost, not correctness.

## Cross-dimension priority backlog (what to do, in order)

### A. Quick wins (small, safe, high value)
1. **`kartGradePitch` uses `pointAt` not `elevationAt`** (perf HIGH, monolith
   ~:10430) — 2 allocating spline evals/frame to read a Y that `sampler.elevationAt`
   returns directly. Regression from this session's elevation work. *(Fixed
   2026-09-03 — see below.)*
2. **Stale "byte-for-byte NO-OP" comments** in the ground-follow block
   (correctness LOW, monolith ~:4449-4577) — false now that terrain grade is
   authored. *(Fixed 2026-09-03.)*
3. **Projectile spawn offset not rescaled for 4× tracks** (correctness MEDIUM,
   `src/game/race/heldItems.js:107,138`) — hardcoded `6/3000` means Snowball/
   Sardine spawn ~23u ahead on the long tracks and leapfrog close targets. Same
   class as the old coin/startOffset fraction bug.
4. **`kartLocalStore.recordRaceFinish` doesn't validate `place`** (correctness
   LOW, `:97-105`) — a non-finite place persists NaN; sanitize on write.

### B. Elevation follow-ups (from this session's first-pass grade)
5. **Prop-anchor guard covers only the bridge band, not the new terrain hills**
   (correctness LOW, monolith `onElevatedSpan` ~:642) — hillside props can float/
   sink. Part of the elevation review/tuning pass; extend the guard to terrain.
6. **PV MEAN_SPEED (236.7) is soft** — re-measure 3+ runs quiet (`measure-mean-speed.mjs`).

### C. Performance (per-frame, bigger)
7. **Eager GLB load** (`loadKartAssets` ~:2942) — `Promise.all`s ~25 GLBs though
   4 karts race; the on-demand pool was never built. Slow start + unused meshes
   resident.
8. **Shadow pass re-renders a 3072² PCF map every frame** over static scenery
   (`raceShadowRig.js:671`) — drop to 2048 and/or cache static casters.
9. **Coin field re-uploads its whole instance buffer every frame** (~:11976),
   ~4× costlier since coins went 8→30 rows — gate on "any coin in lens band".
10. **`publishTelemetry` runs every frame** with ~30 `toFixed` round-trips for
    data no shipped player reads (~:9605) — throttle/flag-gate. Sibling:
    `sampler.pointAt` allocates ~4 Vector3 × ~10 calls/frame — use scratch targets.

### D. Architecture (big, plan carefully)
11. **~43% of the game tree is DEAD** (≈29.9k of 69.4k LOC, 59 files) — a whole
    second race engine (`ArcadeRace3D` + `race/*Runtime`) + the cut world-hub/
    economy cluster (`ComebackCityScene3D`, `WorldScene`, `gameProfile`/
    `gameMissions`/`worldConfig`, old `raceTracks`/`raceItems`/`raceHazards`).
    Big cleanup, but split-don't-blind-delete (mixed-liveness modules below).
12. **`test:race` validates the DEAD engine, not the shipping monolith** —
    `race-content-playtest.mjs` imports the old runtime. The live game's only
    integration proof is `test:kart-playable` (+ reading frames). Re-point the
    content test at the shipping path BEFORE deleting the dead engine.
13. **The monolith's danger is one ~3,300-line `useEffect` (10024–13400)** around
    a 2,382-line rAF loop. ~7,600 LOC of pure builders above it extract cheaply
    first, which then makes the loop factorable. This is the "one owner per wave"
    root cause.
14. **`makeElevation` is triplicated** (monolith:930, `track-layout-preview.mjs:248`,
    a tmp/ copy) and **`MEAN_SPEED` is copy-pasted** — hand-synced by comment only.
    Extract to a shared module (removes a real footgun the elevation work hit).
15. **Mixed-liveness modules** block naive deletion: `raceProgression.js` mixes
    live `RACE_ITEMS` with dead economy; `createKartModel.js` mixes live
    `createBasicMaterial` (60+ uses) with dead builders. Split first.

## Recommended sequence
Quick wins (A) → elevation follow-ups (B, with the owner's tuning) → per-frame
perf (C) → then the big architecture cleanup (D), starting by re-pointing
`test:race` (12) so deleting the dead engine (11) is safe, then extracting the
monolith builders (13).
