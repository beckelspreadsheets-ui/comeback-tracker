# Architecture Review — Comeback Tracker

Generated: 2026-06-15 · Branch: `codex/release-v1-comebacktracker-kart-racer` · Milestone `kart-v0.9.0`

> Companion docs: [CODEBASE_MAP.md](CODEBASE_MAP.md) (refreshed same day) · [FLOWS.mmd](FLOWS.mmd).
> Method: cartographer map refresh → 4 parallel read-only audit passes (sync/auth, race engine, security, perf/maintainability) → manual verification of every high-severity finding against source. Findings below were each traced to `file:line`; claims I could not confirm were dropped or downgraded.

## Executive Summary

The app is in good overall health for a personal 2-user PWA: the production build passes (~1s), the kart proof/content tests pass, auth uses a correctly-implemented CF Access JWT verification (RS256-confined, iss/aud/signature all checked), and all D1 queries are parameterized. No active XSS, SQL injection, or hardcoded-secret issues were found.

The real risks are concentrated in three places: (1) **one shipping correctness bug** — the race always reports `trackKey: 'comeback-city'`, so Penguin Village results are silently misrouted/overwritten (B1); (2) **two real security hardening gaps** — the FatSecret proxy has no auth gate (open quota-abuse vector, S1) and the USDA key is build-inlined into the client if ever enabled (S2); and (3) **first-load weight** — the service worker precaches ~14.5 MB, dominated by ~6.5 MB of proof/backdrop PNGs that are only used by dev-gated reference routes (P1).

**Top 3 recommendations**: (1) fix B1 (`trackKey` one-liner) before promoting Penguin Village; (2) add `requireAuth` to the two FatSecret handlers (S1); (3) exclude the proof/backdrop PNGs from the PWA precache (P1) — biggest UX win for the smallest change.

## Repo Map

See [CODEBASE_MAP.md](CODEBASE_MAP.md) for the full module guide. One-paragraph orientation: a React 18 + Vite fitness PWA whose state lives in a single atom (`usePersistedState.js`, schema v5) synced to Cloudflare D1 via an OCC `rev` protocol behind CF Access. The dominant body of code is the Three.js kart game (`src/game/`, 74 files): a world hub (`WorldScene.jsx`), a primary race runtime (`ComebackCityThreeKartRace.jsx`) plus a modular `race/` engine (used fully by the QA-path `ArcadeRace3D.jsx`), with game XP/credits derived from real fitness data. Backend is Pages Functions: `/api/sync/*` (auth-gated) and `/api/fatsecret/*` (proxy).

## Critical Workflows

- **Auth**: `cf-access-jwt-assertion` header → `verifyAccessJwt` (RS256 only, JWKS cached 5 min, iss/aud/exp/signature) → email mapped via `SYNC_USERS_JSON` allowlist → `{user, users}`.
- **Cloud sync (OCC)**: `setState` → debounced local save (200 ms) + cloud push (1500 ms) → `PUT /api/sync/state {state, baseRev}` → server `INSERT backup; UPDATE WHERE user_id=? AND rev=baseRev` → 409 on lost race → client conflict UI.
- **Fitness → game**: `deriveGameProfile(state)` computes XP/level; `deriveRaceGarage` computes credits (`earned − spentCredits`, only `spentCredits` persisted) and kart mechanics.
- **Race tick** (rAF loop): clock → controls → updatePlayer (or autoplay) → rivals → hazards → events → rankings → camera → `syncRaceMeshes` → telemetry (250 ms gated) → render → on finish `publishRaceFinishResult`.

---

## Risk Register

| ID | Risk | Severity | Likelihood | Mitigation | File/Area | Priority |
|----|------|----------|------------|------------|-----------|----------|
| B1 | Race reports hard-coded `trackKey: 'comeback-city'` → Penguin Village results misrouted, CC results overwritten | High | Certain (any non-CC race) | Use in-scope `trackKey` var | `ComebackCityThreeKartRace.jsx:3439` | P1 |
| S1 | FatSecret proxy unauthenticated → API-quota/credential abuse | High | Medium (public URL) | Add `requireAuth` to both handlers | `functions/api/fatsecret/{search,item}.js` | P1 |
| B2 | No backward-crossing guard in Three.js lap counter → spin through finish = free lap | Medium | Low | Add revert guard (exists in other paths) | `ComebackCityThreeKartRace.jsx:~3013` | P2 |
| B3 | `restartRace()` omits `trackDef` → wrong lap count/start on non-default track | Medium | Medium (restart on PV) | Pass `trackDef` | `ComebackCityThreeKartRace.jsx:~2783` | P2 |
| S2 | `VITE_USDA_API_KEY` build-inlined into client bundle + sent as URL param | Medium | Conditional (only if key set) | Proxy via Function | `src/lib/foodApi.js:6` | P2 |
| B4 | Old backups (`schemaVersion<5`) unrestorable — server `validateState` rejects pre-migration | Medium | Medium (after a schema bump) | Migrate before validate on restore | `functions/api/sync/backups/[id]/restore.js` | P2 |
| S3 | No payload size cap on `PUT /state` → oversized D1 rows | Medium | Low | Byte-length guard in `validateState` | `functions/api/sync/state.js` | P2 |
| P1 | SW precaches ~14.5 MB (~6.5 MB dev-only proof/backdrop PNGs) | Medium | Certain (every first load) | `globIgnores` / dynamic-import the proof assets | `vite.config.js`, `comebackCityVisuals.jsx:17-18` | P2 |
| S4 | Missing-`exp` JWT silently accepted (`payload.exp &&`) | Medium | Very low (CF always sets exp) | `!payload.exp ||` | `functions/api/sync/_shared.js:120` | P2 |
| B5 | `onFinish`/`onRestart` in scene useEffect deps → full rebuild if caller passes unstable callback | Medium | Low (currently stable) | Ref-wrap callbacks | `ComebackCityThreeKartRace.jsx:3461` | P2 |
| B6 | Sync bootstrap may apply cloud over local-dirty state after slow startup (`preBootstrapDirty` never set from persisted `dirtySince`) | Medium | Low | Init ref from `readSyncMeta().dirtySince` | `usePersistedState.js` | P2 |
| P2 | ~14 `THREE.Vector3` heap allocs/frame in chase camera → GC pauses | Medium | Certain (during race) | Module-level scratch vectors | `race/camera/chaseCamera.js:262-317` | P2 |
| M1 | XP formula divergence: `HomeScreen` inline `buildGameProfile` omits `completedCourses·150` | Medium | Certain (users w/ courses) | Reuse `deriveGameProfile` | `HomeScreen.jsx:91-119` | P2 |
| M2 | ~290 lines dead/unreachable code in `RaceScreen` pulls 2 unused engines into chunk | Low | Certain | Delete dead `return` + imports | `RaceScreen.jsx:2179-2469` | P3 |
| S5 | JWKS cache has no stale-key retry → up-to-5-min lockout on emergency key rotation | Low | Very low | Re-fetch on `kid` miss | `functions/api/sync/_shared.js:69-86` | P3 |
| S2b | FatSecret `q`/`id` params unbounded/unvalidated | Low | Low | Length cap + numeric `id` regex | `functions/api/fatsecret/*` | P3 |

---

## Prioritized Backlog (29 items)

| # | ID | Item | Why | File/Area | Pri | Effort | Impact |
|---|----|------|-----|-----------|-----|--------|--------|
| 1 | B1 | Replace hard-coded `'comeback-city'` with in-scope `trackKey` in `onFinish` | Penguin Village results lost / CC overwritten | `ComebackCityThreeKartRace.jsx:3439` | P1 | XS | High |
| 2 | S1 | Add `requireAuth` to FatSecret search+item handlers | Unauth proxy → quota/credential abuse | `functions/api/fatsecret/*` | P1 | XS | High |
| 3 | P1 | Exclude proof/backdrop PNGs from PWA precache (`globIgnores`) | −6.5 MB first-load | `vite.config.js` | P2 | S | High |
| 4 | M1 | Make `HomeScreen` use canonical `deriveGameProfile` | Level mismatch across screens | `HomeScreen.jsx:91-119` | P2 | S | Med |
| 5 | S4 | Require `exp` present: `!payload.exp \|\|` | Eternal-token footgun | `_shared.js:120` | P2 | XS | Med |
| 6 | B3 | Pass `trackDef` to `createInitialRace` in `restartRace` | Wrong laps/start on restart | `ComebackCityThreeKartRace.jsx:~2783` | P2 | XS | Med |
| 7 | B2 | Add backward-crossing revert guard to Three.js lap counter | Free lap on reverse cross | `ComebackCityThreeKartRace.jsx:~3013` | P2 | XS | Med |
| 8 | S3 | Byte-length cap (~500 KB) in `validateState` | Oversized-row DoS | `state.js`/`_shared.js` | P2 | XS | Med |
| 9 | S2 | Proxy USDA via Function; drop `VITE_USDA_API_KEY` | Key exposure if enabled | `src/lib/foodApi.js` | P2 | M | Med |
| 10 | B4 | Migrate backup state before `validateState` on restore | Old backups unrestorable | `backups/[id]/restore.js` | P2 | S | Med |
| 11 | P2 | Hoist chase-camera scratch `Vector3`s | −600+ allocs/s, GC | `chaseCamera.js:262-317` | P2 | S | Med |
| 12 | B5 | Ref-wrap `onFinish`/`onRestart`; drop from effect deps | Avoid scene-rebuild storms | `ComebackCityThreeKartRace.jsx:3461` | P2 | S | Med |
| 13 | B6 | Init `preBootstrapDirty` from persisted `dirtySince` | Protect local-dirty on slow start | `usePersistedState.js` | P2 | XS | Med |
| 14 | P3 | Pre-allocate scratch in `trackGeometry.pointAt/nearest` | −600–1200 allocs/s | `trackGeometry.js:90-114` | P2 | M | Med |
| 15 | M2 | Delete dead `return` block + `ArcadeRace3D`/`ComebackCityKartRace` imports in `RaceScreen` | −2 engines from chunk, maintenance trap | `RaceScreen.jsx:2179-2469` | P3 | S | Med |
| 16 | P4 | Investigate 2.88 MB `comebackCityVisuals` JS chunk (737 KB string + 15 k floats = embedded scene data) | Bundle weight | `comebackCityVisuals.jsx` / scene-shape JSON | P3 | M | Med |
| 17 | B7 | Cap rival `lap` at `race.laps` (or add `finished` flag) so `sardineTargetFor` doesn't stick on lapped rivals | Homing target glitch | `rivalRacers.js`, `heldItems.js:112` | P3 | S | Low |
| 18 | M3 | Single-source the neon-dusk palette (≥4–7 copies) | Edit-in-N-places | `gamePalette.js` (new) | P3 | S | Low |
| 19 | P5 | WebP-convert 5 district facade PNGs (587 KB) | −~500 KB | `src/assets/` | P3 | S | Low |
| 20 | P6 | `manualChunks` split for `three` ESM (437 KB) | Long-term caching | `vite.config.js` | P3 | XS | Low |
| 21 | S5 | JWKS re-fetch on `kid` miss | Avoid rotation lockout | `_shared.js` | P3 | S | Low |
| 22 | S6 | Length-cap `q` + numeric-validate `id` in FatSecret proxy | Input hygiene | `fatsecret/*` | P3 | XS | Low |
| 23 | B8 | Reconcile/clamp lap thresholds (0.82 vs 0.86) across engines or document | Future-track footgun | `raceProgress.js`, `ComebackCityThreeKartRace.jsx` | P3 | S | Low |
| 24 | M4 | Decompose `ComebackCityThreeKartRace.jsx` toward `race/` module shape | 3,617-line god-file | `src/game/` | P3 | L | Med |
| 25 | M5 | Decompose `WorldScene.jsx` (builder/physics/materials seams) | 4,455-line god-file | `WorldScene.jsx` | P3 | L | Med |
| 26 | M6 | Reconcile 2 track registries + 2 item systems (or document boundary) | Confusion/drift | `RaceScreen.jsx`, `raceItems.js` | P3 | M | Low |
| 27 | T1 | Add Vitest units for `migrate()`, `deriveGameProfile`, `compileTrack3D().nearest`, nutrition libs | Zero automated unit coverage | new `tests/` | P3 | M | Med |
| 28 | M7 | `raceAudio` should close AudioContext on dispose | Context accumulation (~6 cap) | `race/raceAudio.js` | P3 | XS | Low |
| 29 | M8 | Document `window.__comebackCityKartTelemetry` shared-global shape collision | Two renderers, last wins | `src/game/` | P3 | XS | Low |

---

## Bugs Found

### B1 — Race always reports `trackKey: 'comeback-city'` (HIGH) ✅ verified
`src/game/ComebackCityThreeKartRace.jsx:3439`. The finish callback hard-codes the track key even though the correct `trackKey` is in scope (derived at `:2511`, and already passed to `publishTelemetry` at `:3412`). `RaceScreen.handleFinish` therefore writes every result into `raceResults['comeback-city']`; Penguin Village never accumulates wins/best-times, and a non-CC race silently clobbers the CC record. Fix:
```diff
-      trackKey: 'comeback-city',
+      trackKey,
```
`handleFinish` itself correctly guards better-vs-worse merges (`Math.min` on times/place) — the only defect is the key.

### B2 — No backward-crossing guard in Three.js lap counter (MEDIUM) ✅ verified
`ComebackCityThreeKartRace.jsx:~3013`. The player lap increment fires on `previousProgress > 0.86 && progress < 0.18` but has no inverse guard. `raceProgress.js:50` and `RaceCanvasFallback` both have the revert guard (`prev < 0.18 && progress > 0.82`). A player who spins backward across the start line gets a free lap. Add the revert branch.

### B3 — `restartRace()` omits `trackDef` (MEDIUM) ✅ verified
`ComebackCityThreeKartRace.jsx:~2783`. `Object.assign(race, createInitialRace(rivalSeats))` defaults `trackDef` to `trackByKey(DEFAULT_TRACK_KEY)`, resetting laps/`startOffset` to Comeback City. On Penguin Village a restart starts at the wrong origin. Pass `trackDef`.

### B4 — Pre-v5 backups unrestorable (MEDIUM) ✅ verified
`functions/api/sync/backups/[id]/restore.js` calls `validateState` on the raw backup before any migration; `_shared.js` rejects `schemaVersion !== 5`. Any backup taken before a schema bump becomes permanently unrestorable. Migrate the parsed backup (server-side mirror of client `migrate()`) before validating.

### B5 — Unstable finish callbacks in scene-effect deps (MEDIUM) ✅ verified
`ComebackCityThreeKartRace.jsx:3461` lists `onFinish, onRestart` in the scene `useEffect` deps. Currently `handleFinish` is stable so it doesn't fire, but any caller passing an inline arrow rebuilds the entire GLB-loading scene mid-race. Ref-wrap (the pattern `RaceCanvasFallback` already uses) and remove from deps.

### B6 — Sync bootstrap can apply cloud over local-dirty state (MEDIUM) ✅ verified
`usePersistedState.js`. `preBootstrapDirty` is only set by a state-effect comparison that can't fire before `bootstrapped` is set, so on a slow startup a locally-dirty-but-unpushed state (persisted via `dirtySince`) can be overwritten by `applyOwnCloudState`. Initialize the ref from `readSyncMeta()?.dirtySince`.

### B7 — `sardineTargetFor` sticks on lapped rivals (LOW)
`heldItems.js:112`. Rival `lap` is unbounded (no `finished` cap), so a rival the player has lapped reads as a full lap "ahead", keeping the homing sardine locked. Cap rival lap at `race.laps` or add a `finished` flag.

### B8 — Lap-threshold inconsistency 0.82 vs 0.86 (LOW)
`raceProgress.js:27` uses 0.82; the Three.js engine uses 0.86. Harmless for current tracks (both far from each `startProgress`), but a future track with `startProgress ∈ [0.82, 0.86]` would mis-count. Unify or document.

### Notes (checked, NOT bugs)
- `itemForPickup` index rotation `(boxIndex + lap) % table.length` is deterministic and correct, including the P4-final-lap ultimate table.
- GLB loader (`loadKartAssets` singleton) correctly guards post-unmount resolves via `disposed || engineRef.current !== engine`.
- `handleFinish` best-result merge is correct (the bug is purely the key, B1).
- Autoplay's physics bypass is intentional QA behavior, not a bug-hiding divergence.

## Security Issues

### S1 — FatSecret proxy unauthenticated (HIGH) ✅ verified
`functions/api/fatsecret/search.js`, `item.js` have no `requireAuth`/CF-Access check (confirmed: zero auth calls). If CF Access only gates `/api/sync/*`, anyone reaching the deployment can drive FatSecret queries on your credentials → quota/billing abuse. No SSRF (target URL hardcoded) and no method injection (`'foods.search'`/`'food.get'` hardcoded). Fix: import and call `requireAuth(request, env)` from `../sync/_shared.js` in both handlers, or extend CF Access to `/api/fatsecret/*`.

### S2 — `VITE_USDA_API_KEY` client-inlined (MEDIUM) ✅ verified
`src/lib/foodApi.js:6` reads `import.meta.env.VITE_USDA_API_KEY`; Vite substitutes the literal at build time and it is sent as a URL query param. Anyone with the bundle or network log gets the key. Currently gated by `if (USDA_KEY)` so it's a non-issue while unset, but the architecture invites accidental exposure. Proxy via a Function with a non-`VITE_` env var.

### S3 — No payload-size cap on `PUT /state` (MEDIUM) ✅ verified
`functions/api/sync/state.js` / `_shared.js validateState` only checks `schemaVersion`. An authenticated user can write arbitrarily large JSON to D1. Add `if (JSON.stringify(state).length > 500_000) throw new SyncError(400, 'sync-state-too-large')`.

### S4 — Missing `exp` accepted (MEDIUM) ✅ verified
`_shared.js:120` `if (payload.exp && …)` short-circuits when `exp` is absent → eternal token. CF Access always sets `exp`, so low likelihood, but change to `if (!payload.exp || Number(payload.exp) <= now)`.

### S5 — JWKS no stale-key retry (LOW)
`_shared.js:69-86` caches JWKS 5 min with no re-fetch on `kid` miss → up-to-5-min lockout on emergency key rotation. Re-fetch once on miss before failing.

### S6 — FatSecret input unbounded (LOW)
`fatsecret/search.js` (`q` no max length), `item.js` (`id` not validated numeric). Add a length cap and `^\d{1,20}$` check.

### Verified-safe (checked, no action)
JWT alg confined to RS256 (`:107`) with matching Web Crypto verify; iss/aud/signature all validated; user isolation via server-side `canView` allowlist + `assertOwnProfile` on writes; **all D1 queries parameterized** (`.bind`, placeholder-count-only string building); **no `dangerouslySetInnerHTML`/`innerHTML`/`eval`/`new Function`** anywhere in `src/`; no `unsafe-eval` in CSP; `frame-ancestors`/`base-uri`/`object-src` all set; FatSecret/CF secrets never `VITE_`-prefixed (server-only); no secret logging in `functions/`; restore `id` is parameterized + scoped `WHERE id=? AND user_id=?` (no path traversal); OCC CAS prevents blind overwrite.

## Performance Hotspots

### P1 — Service worker precaches ~14.5 MB (~6.5 MB dev-only PNGs) (MEDIUM) ✅ verified
Build precaches 70 entries / 14,859 KiB. `dist/sw.js` precache list includes `comeback-city-kart-proof-desktop-v1` (2.32 MB), `…-mobile-v1` (2.22 MB), and `race-backdrop-v2` (2.02 MB) — all imported unconditionally in `comebackCityVisuals.jsx:16-18` but only rendered by `VISUAL_REFERENCE_ROUTES`-gated proof components. Every user downloads them on first load.
- **Fix (safest, highest impact)**: add a `workbox.globIgnores` for `**/comeback-city-kart-proof-*`, `**/comeback-city-race-backdrop-*` in `vite.config.js` (keeps the assets available on demand but out of precache). Better: dynamic-import the proof components so the assets leave the eager graph.
- **Validation**: re-run `npm run build`; confirm precache KiB drops ~6.5 MB. Risk: low (assets are reference-only).
> Correction to an earlier hypothesis: these PNGs are **not** base64-inlined into JS (verified 0 `data:` URIs in the chunk); they are separate asset files. The bloat is the *precache manifest*, not the JS bundle.

### P2 — ~14 `THREE.Vector3` allocations/frame in chase camera (MEDIUM) ✅ verified
`race/camera/chaseCamera.js:262-317` allocates `forward`, `right`, `desired`, `lookAt`, `rayStart` (+ collision-avoidance clones, up to 6×) every frame → ~600+ allocs/s, sustained GC. Hoist module-level scratch vectors and use `.copy()/.set()`. Pure compute, single instance, callers don't retain → low risk. Independently corroborated by the render-layer pass.

### P3 — O(n) per-frame track queries + allocations (MEDIUM)
`race/track/trackGeometry.js:90-114` (`nearest`/`pointAt`) linear-scan ~128 segments and allocate `Vector3`s, called 5+×/frame (player, camera, telemetry×3). Pre-allocate scratch + optionally short-circuit when movement < 0.5 units. Risk: medium (lap-counter correctness must be preserved).

### P4 — 2.88 MB `comebackCityVisuals` JS chunk (LOW–MEDIUM) ✅ verified
The chunk is genuinely 2.88 MB of JS — a 737 KB string literal + 15,303 float literals = embedded scene/geometry data (plaza scene-shape specs), not images. Investigate moving the baked data to a `.json` asset (fetched/lazy) rather than an inlined module.

### Also: WorldScene animate loop re-allocates `forward`/`right` 4×/frame (`WorldScene.jsx:3620-3745`); `three` ESM ships as one 437 KB chunk (no `manualChunks` split); 5 district facade PNGs = 587 KB (WebP would cut ~90%).

## Maintainability

- **M1 (real defect)**: `HomeScreen.jsx:91-119` inline `buildGameProfile` omits `completedCourses·150` (present in `gameProfile.js:228`) and uses `jointHp` vs `recoveryShield` — users with completed courses see a different level on Home vs Metrics/Race. Delete the local copy; import `deriveGameProfile`.
- **M2 dead code**: `RaceScreen.jsx:2179-2469` (~290 lines) is after an earlier `return` — unreachable, yet its imports (`ArcadeRace3D` 678 lines, `ComebackCityKartRace` 871 lines) are pulled into the chunk. Delete block + imports (verify `RACE_TRACKS` has no live caller first).
- **God-files**: `WorldScene.jsx` (4,455), `ComebackCityThreeKartRace.jsx` (3,617), `createRaceScenery.js` (1,457), `comebackCityVisuals.jsx` (1,055). The modular `race/` engine already shows the target decomposition for the race god-file.
- **Duplication**: neon-dusk palette in ≥4 (up to 7) files; magic physics numbers scattered inline.
- **Two registries / two item systems** (`KART_TRACKS` vs `RACE_TRACKS`; `heldItems.js` vs `raceItems.js`) — know which path you touch.
- **Misc**: `raceAudio` never closes its AudioContext (accumulates ~6 cap across remounts); `window.__comebackCityKartTelemetry` written by two renderers with different shapes.

### Test coverage gaps
No automated unit/integration tests exist — `scripts/` (37 `.mjs`) are Playwright capture/smoke tools. Highest-risk untested logic, all pure and cheap to cover with Vitest: `migrate()` + the OCC conflict logic (`usePersistedState.js`), `deriveGameProfile`/`deriveRaceGarage` (the XP/credit economy — would have caught M1), `compileTrack3D().nearest/pointAt` (lap correctness), and `nutrition.js`/`program.js`.

## Flow Diagram

See [docs/FLOWS.mmd](FLOWS.mmd).

---

## Priority Ranking (issue IDs, ordered)

**P1 (do first):** B1, S1
**P2:** P1(precache), M1, S4, B3, B2, S3, S2, B4, P2(camera), B5, B6, P3
**P3:** M2, P4, B7, M3, P5(facade WebP), P6(three chunk), S5, S6, B8, M4, M5, M6, T1, M7, M8

**Single highest-value change**: B1 — a one-line fix that unblocks correct Penguin Village result tracking before that track is promoted to the public demo.
