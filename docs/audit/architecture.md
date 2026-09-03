# Penguin Kart — Architecture & Maintainability Audit

Scope: the game only (`src/game/**`, `src/kart/**`, its build + test harness). The
fitness tracker (`src/App.jsx`, `src/screens/**`) is out of scope except where the two
touch. Read-only audit — no source was modified.

## Method

Reachability was computed by walking `import` / `import()` / `export … from` edges from
the two real Vite entry points:

- Tracker: `src/main.jsx`
- Kart game: `src/kart/main.jsx` (the only rollup input of `vite.config.kart.js`; `index.kart.html`)

A file is "live" if it is reachable from one of those. Labs (`*-lab.html`,
`race-playtest.html`, `kart-playtest.html`) and `scripts/*.mjs` are **not** build inputs —
they are dev/CI-only and are treated separately.

## Headline numbers

| Metric | Value |
|---|---|
| `src/game` + `src/kart` JS/JSX | 69,430 LOC across 106 files |
| **Unreachable from either app entry** | **~29,920 LOC across 59 files (~43%)** |
| Live monolith `ComebackCityThreeKartRace.jsx` | 13,739 LOC (single file) |
| — of which one `useEffect` (scene build + frame loop) | ~3,300 LOC (10024–13400) |
| — of which the single rAF frame function | ~2,382 LOC (10816–13198) |
| Largest single dead file | `ComebackCityScene3D.jsx` 8,331 LOC |

The dominant story: **there are two of almost everything** — a live 13.7k-line monolith
engine, and an older, more cleanly-factored engine (`ArcadeRace3D` + `race/*Runtime` +
world hub + economy) that ships nowhere but is kept alive by test scripts and labs.

---

## HIGH severity

### H1 — Two parallel race engines; the live one is the 13.7k monolith, the clean one is dead
**Where:** live `src/game/ComebackCityThreeKartRace.jsx` (via `src/kart/KartApp.jsx:622`)
vs dead `src/game/ArcadeRace3D.jsx` + the `src/game/race/race*Runtime.js` family
(`raceSceneRuntime`, `raceUpdateRuntime`, `raceVehicleRuntime`, `raceMotionRuntime`,
`raceFinishRuntime`, `raceCameraRuntime`, `raceProgress`, `raceState`, `raceControls*`,
`raceHud.jsx`, `syncRaceMeshes`, `createRaceVehicles`, `createTrackMesh`,
`createRaceScenery`, `createBillboardText`, `raceVfx`, `raceSceneTheme`, `playtest/*`).
~9,861 LOC in `race/**` + `ArcadeRace3D` 698 LOC.

**Problem:** `ArcadeRace3D` is imported by nothing live (the matches in `KartApp.jsx` and the
monolith are comments). It is the pre-app-split engine; the current game reimplements the
same responsibilities *inline* in the monolith. A contributor cannot tell which `race/`
files are live: `raceHud.jsx`, `createTrackMesh.js`, `createRaceScenery.js`,
`syncRaceMeshes.js` all look canonical and are dead, while their live equivalents are inline
in the monolith. This is the concrete reason the "one owner per wave" rule exists — the tree
is full of plausible-but-wrong edit targets.

**Fix:** Decide explicitly: retire the old engine (delete `ArcadeRace3D` + the `race/*Runtime`
family + playtest runtime) — see H4 for the test coupling that must be cut first — **or**
commit to migrating the monolith onto it. Do not leave both. Deleting is ~1 day once the
test/lab refs (H4, C1) are re-pointed; migrating is weeks. Recommend delete.

### H2 — Dead world-hub + economy cluster (~20k LOC) reachable from nothing
**Where:** `WorldMode.jsx` (653), `WorldScene.jsx` (4,455), `ComebackCityScene3D.jsx`
(8,331), `comebackCityVisuals.jsx` (651), `comebackCityVisualTokens.jsx`,
`comebackCityVisuals.css`, `city3dAssets.js` (859), `gameProfile.js`, `gameMissions.js`,
`worldConfig.js`, `HudOverlay.jsx` (575), plus the old domain-data trio `raceTracks.js`
(808), `raceItems.js` (1,251), `raceHazards.js` (666), `raceProgression.js`,
`raceAvailability.js`.

**Problem:** This is the cut "Comeback City hub + credits/missions economy" feature. None of
it is reachable from `KartApp` (which goes straight select → race) nor from the tracker
(grep of `src/App.jsx`, `src/screens/**`, `src/components/**` for any of these names returns
nothing). It is pure weight that inflates search results, grep noise, and onboarding time.

**Fix:** `git rm` the cluster. Two guards first: (a) `gameProfile.js` still imports the *live*
`src/lib/workoutStatus.js` — deleting `gameProfile` is fine, `workoutStatus` stays. (b) some
scripts import the old domain data (H4/C1). Effort: ~half a day including the test cleanup.

### H3 — The monolith's ~3,300-line scene/frame `useEffect` is the real danger zone
**Where:** `ComebackCityThreeKartRace.jsx` — component starts at 9742; the mega-effect at
**10024** builds the scene (`createScene`, defined at 7845) and then runs one rAF frame
function **10816–13198** (~2,382 lines) that reads 12 refs and mutates the Three.js graph in
place. 10 `useEffect`, 12 `useRef`, 9 `useMemo`, 8 `useState` in the component.

**Problem:** All per-frame physics stepping, camera framing, item/hazard resolution, particle
and HUD updates live in one closure over mutable refs. It cannot be unit-tested, diffs are
huge, and any change risks the whole loop. This single function is why edits must be
serialized.

**Fix (phased, this is the priority refactor):**
1. First carve the *pure* module-level builders below the component out of the file (H8) —
   near-zero risk, shrinks the file ~55% and makes the effect findable.
2. Then extract the frame loop into `race/frame/updateRaceFrame.js` taking an explicit
   `engine` handle (camera, scene, racers, sampler, refs-as-a-struct) and returning nothing —
   a pure-ish stepper the effect just calls. Physics is already partly external
   (`race/physics/kartPhysics.js`); pull the inline camera solve (`solveChaseFraming`, 439)
   in with `race/camera/chaseCameraFeel.js` (already imported) so camera lives in one place.
3. Split the frame body along its existing internal phases: input→physics→items/hazards→
   camera→particles/HUD. Each becomes a testable function.
   Effort: 2–4 days for step 2–3; step 1 is a day.

### H4 — The `test:race` battery validates the DEAD engine, not the shipping game
**Where:** `scripts/race-content-playtest.mjs` (npm `test:race`) imports `raceTracks.js`,
`raceHazards.js`, `raceItems.js`, `race/render/createRaceScenery.js`, `syncRaceMeshes.js`,
`raceCameraRuntime.js`, `raceMotionRuntime.js`, `raceSceneRuntime.js`, `raceUpdateRuntime.js`,
`playtest/racePlaytestRuntime.js`, `playtest/raceAutoplay.js`, `raceTelemetryDiagnostics.js`,
`racePlayerFrame.js` — i.e. the entire dead runtime + dead domain data.
`scripts/phase5-sustained-capture.mjs` has an explicit `legacy` target = "old ArcadeRace3D".

**Problem:** Green `test:race` says nothing about the code the user actually plays. The live
monolith's item/hazard/track/physics frame path (H3) has **no** integration test of its own —
its only coverage is autoplay screenshot proofs (`test:kart-playable`, `test:race-proof`,
which drive `dev:kart`/`preview:kart` = the real build) and the pure-function unit tests
`test:spline` / `test:freebody` (both import `race/splineProjection.js` directly — genuine
units). So the divergent, non-shipping engine is what carries the "race content" label.

**Fix:** Re-point `race-content-playtest.mjs` at the live sources (`race/heldItems.js`,
`race/tracks/*`, `race/raceCrossers.js` + `race/raceBreakables.js`, `race/physics/kartPhysics.js`)
before deleting the old engine, **or** retire `test:race` + phase5-legacy together with the
old engine and rely on the autoplay proofs. Recommend the latter (the old engine is going
away). Effort: ~half a day, must precede H1/H2 deletion.

---

## MEDIUM severity

### M1 — `makeElevation` is triplicated and hand-synced by comment only
**Where:** `ComebackCityThreeKartRace.jsx:930` (runtime), `scripts/track-layout-preview.mjs:248`
(comment at :251 says "MUST stay in lockstep with the runtime makeElevation"), and a third
copy in `tmp/track-candidates/gate-width.mjs:189`. `makeTrackCurve`/`makeWidthTable`/
`makeSampler` are duplicated the same way.

**Problem:** The layout previewer and drift-reach test build track geometry from a *copy* of
the elevation math. When the runtime version changes (bridge deck / signed-sin² terrain), the
preview silently lies until someone remembers to edit two-to-three files. Classic footgun.

**Fix:** Extract the sampler math (`makeElevation`, `makeTrackCurve`, `makeWidthTable`,
`makeSampler`) into a dependency-free ESM module (e.g. `src/game/race/tracks/sampler.js`) that
the monolith, `track-layout-preview.mjs`, and the tests all import. The functions are pure and
already close over nothing React-y. Effort: ~half a day; delete the `tmp/` copy.

### M2 — `MEAN_SPEED` constant is measured by one script, hard-coded in another
**Where:** `scripts/track-layout-preview.mjs:81` hard-codes
`{ 'comeback-city': 247.2, 'penguin-village': 236.7 }`; `scripts/measure-mean-speed.mjs` prints
values for a human to paste back in (its own output literally says "Put these in MEAN_SPEED in…").

**Problem:** Copy-paste sync between a producer and a consumer script; drifts whenever track
length or pacing changes. `test:drift` reads the stale constant.

**Fix:** Have `measure-mean-speed.mjs` emit `tmp/mean-speed/mean-speed.json`; have the
previewer import it (fallback to defaults if absent). Effort: ~1–2 hours.

### M3 — Duplicated domain data with mixed-liveness modules
**Where:** items — dead `raceItems.js`/`raceProgression.js` vs live `race/heldItems.js`;
tracks — dead `raceTracks.js` vs live `race/tracks/*`; hazards — dead `raceHazards.js` vs live
`race/raceCrossers.js` + `race/raceBreakables.js`.

**Problem:** Beyond the dead-code weight (H2), two modules are *mixed*: `raceProgression.js`
exports a live-looking `RACE_ITEMS` (and dead economy: `RACE_UPGRADES`, `deriveRaceGarage`,
`earnedRaceCredits`, …) but the whole file is unreachable from the app — `RACE_ITEMS` ships
nothing. `race/render/createKartModel.js` exports the **live** `createBasicMaterial` (60+ call
sites in the monolith) **plus** a full kart-builder consumed only by the dead
`createRaceVehicles.js`. So "delete the file" is unsafe for these two — they must be split.

**Fix:** During H1/H2 removal, move `createBasicMaterial` to a live materials module (or leave
`createKartModel.js` and delete only its dead exports), and delete `raceProgression.js`
wholesale (the app never reads `RACE_ITEMS`; the live item catalog is `heldItems.js`). Effort:
~2 hours, folds into H2.

### M4 — 7,600 LOC of pure builders trapped in the monolith with almost no signposting
**Where:** `ComebackCityThreeKartRace.jsx` lines ~206–7845 — constants, camera/lens/contact
math, track sampling, texture generators (`make*Texture`, ~1971–3077), `createGroundedKartModel`
(1161–1971, ~810 LOC), and per-track scenery/prop builders (Comeback City + Penguin Village,
~3077–7256). Only **4** section-banner comments exist in the entire 13.7k file.

**Problem:** These are module-level, mostly pure functions (they close over imported helpers +
constants, not React state), so they are cheap and safe to extract — but co-locating them with
the component makes the file unnavigable and is the bulk of its intimidating size.

**Fix:** Move to `race/render/`: `textures.js` (the `make*Texture` family), `kartModel.js`
(`createGroundedKartModel`), `sceneryComebackCity.js` + `sceneryPenguinVillage.js` (the two
dressing blocks), `trackSampler.js` (M1). Pure lift-and-shift, one module per PR, guarded by
`test:kart-playable`. This is the low-risk prerequisite that makes H3 tractable. Effort:
1–2 days total, splittable.

### M5 — Two full Vite configs; the kart config carries all the build logic and a fragile rename plugin
**Where:** `vite.config.js` (111 lines) vs `vite.config.kart.js` (313 lines, 3 `manualChunks`/
`assetFileNames`/`chunkFileNames` knobs). The `kart-html-entry` plugin (`vite.config.kart.js:22`)
renames `index.kart.html` → `index.html` on disk in `writeBundle`, with a comment documenting
that the "cleaner" `generateBundle` mutation makes the file vanish under rolldown-vite and that
the name is coupled to vite-plugin-pwa's workbox precache glob.

**Problem:** All the game's chunking/asset strategy lives in a 313-line config with an
imperative, order-sensitive disk rename tied to PWA precache naming. It's documented but
brittle: a partial build, a toolchain bump (rolldown-vite), or a second run can leave the
outDir without an `index.html`. There is no test asserting `dist-kart/index.html` exists post-build.

**Fix:** Keep the split (the two apps genuinely diverge) but (a) add a one-line post-build
assertion (a script or a `closeBundle` guard) that `index.html` exists and `index.kart.html`
is gone, and (b) factor the shared rollup/asset-naming into a small helper both configs import.
Effort: ~2–3 hours.

---

## LOW severity

### L1 — Dead CSS
`comebackCityKartRace.css` (8 KB) is imported by nothing. `comebackCityVisuals.css` is imported
only by the dead visuals cluster. Delete with H2. Effort: minutes.

### L2 — Name collisions between old and new module families
Top-level `src/game/raceTracks.js` vs `src/game/race/tracks/`; `raceItems.js` vs
`race/heldItems.js`; `raceHud.jsx` vs the inline monolith HUD. Until the dead set is removed, a
newcomer cannot tell old from new by name. Resolves for free once H1/H2 land; interim, a
`race/DEPRECATED.md` or a top-of-file marker on each dead file would help. Effort: minutes.

### L3 — `tmp/` is a tracked dumping ground
`tmp/` holds generated artifacts (webm/png/json), a third `makeElevation` copy
(`tmp/track-candidates/gate-width.mjs`), and appears throughout `git status`. Add `tmp/` to
`.gitignore` (or prune) so generated output stops polluting diffs and search. Effort: minutes.

### L4 — Camera logic split across two homes
`solveChaseFraming` + the CHASE_*/LENS_* constant math live inline in the monolith
(`ComebackCityThreeKartRace.jsx:206–460`) while `race/camera/chaseCameraFeel.js` is imported
for feel params. Fold the inline solve into the camera module during H3. Effort: folds into H3.

---

## Recommended cleanup order

Do these in sequence — each step de-risks the next, and the deletions must not precede the
test/lab re-pointing.

1. **L3** gitignore/prune `tmp/` (minutes) — stop the noise before you start grepping.
2. **H4 / C-refs** Re-point or retire `test:race` (`race-content-playtest.mjs`) and the
   phase5 `legacy` target; likewise the `race-playtest.html` / `kart-playtest.html` labs and
   `lab-readiness` if they load the dead harnesses. This severs every non-app edge into the
   old engine (~half a day).
3. **H1 + H2 + M3 + L1** Delete the dead race engine, the world-hub/economy cluster, the old
   domain-data trio, and dead CSS — splitting the two mixed-liveness modules
   (`createKartModel.js` → keep `createBasicMaterial`; drop `raceProgression.js`) as you go.
   This removes ~29k LOC / ~43% of the game tree in one reviewed pass (~half a day). Re-run
   `test:kart-playable`, `test:race-proof`, `test:bundle:kart`.
4. **M1 + M2** Extract the shared track sampler and the `MEAN_SPEED` JSON so the previewer and
   tests stop drifting from the runtime (~half a day).
5. **M4** Lift the pure builders (textures, kart model, per-track scenery, sampler) out of the
   monolith, one module per PR (1–2 days). File drops from ~13.7k to ~6k.
6. **H3 + L4** Extract the frame loop into a pure `updateRaceFrame(engine)` stepper and split
   it along its input→physics→items→camera→particles/HUD phases; fold camera framing into the
   camera module (2–4 days). This is the payoff: the loop becomes testable and the "one owner
   per wave" rule can be relaxed.
7. **M5** Add the post-build `index.html` guard and factor shared rollup logic (~2–3 hours).

Steps 1–3 are mostly deletion and reclaim the biggest maintainability win for the least risk;
5–6 are the structural refactor of the live monolith and should follow, not lead.
