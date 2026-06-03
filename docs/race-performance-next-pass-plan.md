# Race Performance Next-Pass Plan

Status: `RACE-PERF-002A/B/C/D` implemented with local browser evidence; desktop performance blocker remains open
Date: 2026-05-20
Source PRD: `docs/comeback-city-kart-racer-prd.md`
Related ticket: `RACE-PERF-002`

## Objective

Move the desktop race performance blocker from broad experimentation to controlled measured passes. Latest kept FPS evidence remains `perf-023`, a mild race camera/fog far-range reduction to `580` that improved paired aggregate focused, desktop all-scenario, and sustained actual-FPS metrics versus its fresh baseline. Latest kept production-runtime hardening is `perf-038`, where standard production skips visual-diagnostic telemetry construction while preserving HUD telemetry, dev/playtest diagnostics, browser gates, release smoke, artifact safety, build, visual checks, and diff checks. Latest rejected evidence is `perf-040`, where a race-ranking allocation candidate passed two browser runs and improved focused desktop actual FPS, but was reverted because the two-run candidate average regressed desktop all-scenario actual FPS versus its fresh passing baseline. The desktop performance blocker remains below the local `45` FPS floor and the PRD `55` target.

This plan does not claim a fix. It defines the next engineering sequence, preservation gates, and rejection criteria.

## Baseline To Preserve

Source: `tmp/race-playtests/race-browser-playtest-summary.json` captured at `2026-05-20T18:16:31.541Z`.

| Area | Baseline |
| --- | --- |
| Normal desktop focused states | `42.0 actualFps`, `19.6ms frameWorkMs`, `15.3ms render`, `717 / 69,781` calls/triangles |
| Manual desktop mechanic states | `34.7 actualFps`, `38.4ms frameWorkMs`, `11.8ms render`, `19.9ms visualPrime` |
| Opening sequence | `10.5 actualFps`, `1.7ms frameWorkMs`, `1.0ms render`, `cameraClipCount: 0` |
| Mobile focused states | `35.9 actualFps`, `9.5ms frameWorkMs`, `6.2ms render` |

The next pass must preserve current browser gates for kart size, road-ahead coverage, visible rivals, HUD overlap, route lookahead, camera clip count, drift, boost, item pickup, reduced motion, audio mute, and WebGL fallback.

## 2026-05-23 Instrumentation Checkpoint

Instrumentation browser evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-002-20260523T190500Z`

Implemented:

- `RACE-PERF-002A`: `npm run test:race:browser` now writes a separately labeled `sustainedNormalPlay` sample into `tmp/race-playtests/race-browser-playtest-summary.json`.
- `RACE-PERF-002B`: Race visual telemetry now includes setup-time scene budget counts for track, scenery, pickups, rivals/player, VFX, and total HUD-independent WebGL scene. The sustained summary records those budgets with renderer calls, programs, textures, and triangles.

Latest evidence:

| Evidence | Result |
| --- | --- |
| `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| `npm run test:race` | Pass. |
| `npm run build` | Pass with existing large-chunk warning. |
| `npm run test:visual` | Pass. |
| Sustained normal play | `8.942s` window, `54` samples, latest lap `2`, normalized speed `0.667`, route URL includes playtest-only `raceNoFinish=1`. |
| Sustained timing | Actual FPS average `17.58`, min `15.8`, max `27.1`; frame elapsed average `67.42ms`; frame work average `2.11ms`; render phase average `0.91ms`; budget misses `139`. |
| Scene budget | Total scene `987` objects, `874` meshes, `127` instanced meshes, `82,894` triangles; track `374` meshes; scenery `310` meshes; pickups `60` meshes; rivals/player `130` meshes; VFX `17` meshes. |
| Normal desktop focused states | Average `33.69 actualFps`, `16.62ms frameWorkMs`, `12.83ms render`, `713.43 / 69,165.14` calls/triangles. |

Decision: keep instrumentation and evidence capture. Do not close the performance blocker from this checkpoint: sustained normal-play FPS and normal desktop focused FPS remained below the agreed floor/target, so the next checkpoint proceeded to one controlled normal-view reduction.

## 2026-05-23 Controlled Reduction Checkpoint

Latest evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-003-20260523T192252Z`

Kept changes:

- `RACE-PERF-002C`: repeated street and plaza lamps are now emitted as instanced meshes instead of individual meshes.
- Boost-specific cleanup: removed the boost-only full-canvas CSS filter; boost feedback remains through speed lines, boost flame, HUD state, and boost-pad visuals.
- `RACE-PERF-002D`: kept both changes because actual-FPS evidence improved while current browser visual/control/fallback gates still passed.

Latest evidence:

| Evidence | Result |
| --- | --- |
| `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| `npm run test:race` | Pass. |
| `npm run build` | Pass with existing large-chunk warning. |
| `npm run test:visual` | Pass. |
| `npm run test:hub` | Pass. |
| Sustained normal play | `52` samples, latest lap `2`, normalized speed `0.667`, route URL includes playtest-only `raceNoFinish=1`. |
| Sustained timing | Actual FPS average `17.70`, min `15.8`, max `29.0`; frame elapsed average `65.94ms`; frame work average `2.22ms`; render phase average `0.88ms`; budget misses `138`. |
| Scene budget | Total scene `948` objects, `835` meshes, `132` instanced meshes, `82,894` triangles; track `374` meshes; scenery `271` meshes; pickups `60` meshes; rivals/player `130` meshes; VFX `17` meshes. |
| Normal desktop focused states | Average `41.54 actualFps`, `16.86ms frameWorkMs`, `13.17ms render`, `691.43 / 71,227.43` calls/triangles. |
| Delta from `RACE-PERF-002A/B` baseline | Normal desktop focused average improved `+7.85 actualFps`; focused render calls reduced by `22`; sustained normal-play average improved `+0.12 actualFps`; scene meshes reduced by `39`. |
| Boost focused state | Improved to `42.2 actualFps` with `cameraClipCount: 0`, `roadAheadCoverage: 1`, and `visibleRivalsSeen: 3`. |

Decision: keep the changes as measurable performance progress. Do not close the desktop performance blocker: normal desktop focused average remains below `45`, and sustained normal-play average remains far below the PRD `55` target.

## 2026-05-24 Kept Mild Far-Range Checkpoint

Latest kept follow-up evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z`

Kept change:

- Lowered only the race camera far plane and fog far distance from `620` to `580`.
- Preserved the existing fog near distance and added exported constants so the content test asserts the runtime values.

Latest evidence:

| Evidence | Result |
| --- | --- |
| Fresh before `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Candidate syntax checks | Pass for `src/game/race/render/createRaceScene.js` and `scripts/race-content-playtest.mjs`. |
| `npm run test:race` | Pass. |
| Candidate `npm run test:race:browser` | Two passes; both completed `24` race completions and `28` visual/control/fallback checks. |
| `npm run build` | Pass with existing large-chunk warning. |
| `npm run test:visual` | Pass. |
| Exact source and diff checks | Pass; candidate constants are present and `git diff --check` is empty. |

Measured result versus the fresh before baseline:

| Metric | Fresh before | Candidate two-run average | Delta |
| --- | ---: | ---: | ---: |
| Desktop focused actual FPS | `35.91` | `36.72` | `+0.81` |
| Desktop all-scenario actual FPS | `33.75` | `34.91` | `+1.16` |
| Sustained actual FPS | `17.50` | `17.79` | `+0.29` |
| Focused render calls | `688.29` | `681.00` | `-7.29` |
| Focused render triangles | `70,971.71` | `70,508.29` | `-463.42` |

Decision: keep the mild `580` far-range reduction as measured progress. Do not close the desktop performance blocker: the kept evidence remains below the local `45` FPS floor and PRD `55` target, and the more aggressive `520` far-range candidate remains rejected.

## 2026-05-24 Rejected Render-Scale Checkpoint

Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-027-20260524T101100Z`

Rejected change:

- Lowered only `RACE_RENDER_SCALE.desktop` from `0.92` to `0.88`.
- Reverted the value to `0.92` because this is a visual-resolution tradeoff and owner/design visual target input remains `Not supplied`.

Latest evidence:

| Evidence | Result |
| --- | --- |
| Fresh before `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Candidate syntax checks | Pass for `src/game/race/render/createRaceScene.js` and `scripts/race-content-playtest.mjs`. |
| Candidate `npm run test:race` | Pass. |
| Candidate `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Candidate `npm run build`, `npm run test:visual`, `npm run test:race:disable` | Pass. |
| Post-revert preservation | Syntax checks, `npm run test:race`, `npm run test:race:browser`, `npm run build`, `npm run test:visual`, and `npm run test:race:disable` all pass after restoring `desktop: 0.92`. |

Measured candidate result versus the fresh before baseline:

| Metric | Fresh before | Candidate | Delta |
| --- | ---: | ---: | ---: |
| Desktop focused actual FPS | `35.47` | `38.04` | `+2.57` |
| Desktop all-scenario actual FPS | `33.98` | `33.73` | `-0.25` |
| Sustained actual FPS | `16.85` | `18.21` | `+1.36` |

Decision: reject and revert. The candidate had useful FPS signal, but accepting a lower desktop render scale would weaken visual resolution before `RACE-001` target approval and would require guessing owner/design intent. Summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-027-20260524T101100Z/perf-027-rejected-render-scale-summary.json`.

## 2026-05-24 Rejected Static Matrix-World Checkpoint

Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-028-static-matrix-world-20260524T114346Z`

Rejected change:

- Locked `matrixWorldAutoUpdate` for static track and non-animated scenery roots after construction, excluding city animation roots and leaving vehicles, pickups, and VFX dynamic.
- Reverted the change because the repeat browser gate failed visual telemetry with `camera clip count 1 is not zero`.

Latest evidence:

| Evidence | Result |
| --- | --- |
| Fresh before `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Candidate syntax checks | Pass for `src/game/race/raceSceneRuntime.js` and `scripts/race-content-playtest.mjs`. |
| Candidate `npm run test:race` | Pass after adding a safe guard for mock scene shells without `world.userData`. |
| First candidate `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks; scene budget reported `561` locked static matrix-world objects and `6` excluded animated roots. |
| Repeat candidate `npm run test:race:browser` | Fail; visual telemetry reported `camera clip count 1 is not zero`. |
| Post-revert preservation | Syntax check, `npm run test:race`, `npm run test:race:browser`, `npm run build`, `npm run test:visual`, and `git diff --check` passed after removing the static matrix-world lock. |

Measured first candidate result versus the fresh before baseline:

| Metric | Fresh before | Candidate | Delta |
| --- | ---: | ---: | ---: |
| Desktop focused actual FPS | `38.33` | `39.11` | `+0.78` |
| Desktop all-scenario actual FPS | `33.62` | `36.27` | `+2.65` |
| Sustained actual FPS | `17.63` | `17.69` | `+0.06` |

Decision: reject and revert. The first pass had useful actual-FPS signal, but the repeated hard camera-clip failure fails preservation criteria. Summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-028-static-matrix-world-20260524T114346Z/perf-028-rejected-static-matrix-world-summary.json`.

## 2026-05-24 Rejected Collision Broadphase Checkpoint

Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-029-collision-broadphase-20260524T130514Z`

Rejected change:

- Skipped nearest-road world-collision work for collision circles whose center distance exceeded circle radius plus racer radius.
- Reverted the change because the required browser gate failed visual telemetry with `camera clip count 1 is not zero` in `comeback-city-desktop-opening-sequence`.

Latest evidence:

| Evidence | Result |
| --- | --- |
| Fresh before `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Candidate syntax checks | Pass for `src/game/race/physics/kartPhysics.js` and `scripts/race-content-playtest.mjs`. |
| Candidate `npm run test:race` | Pass after updating the existing world-collision helper assertion for the broadphase skip. |
| Candidate `npm run test:race:browser` | Fail; visual telemetry reported `camera clip count 1 is not zero` in `comeback-city-desktop-opening-sequence`. |
| Post-revert preservation | Syntax checks, `npm run test:race`, `npm run test:race:browser`, `npm run build`, `npm run test:visual`, and exact source diff checks passed after restoring the pre-candidate files. |

Measured restored state:

| Metric | Fresh before | Post-revert |
| --- | ---: | ---: |
| Desktop focused actual FPS | `38.36` | `38.73` |
| Desktop all-scenario actual FPS | `35.36` | `35.11` |
| Sustained actual FPS | `17.34` | `18.01` |

Decision: reject and revert. The candidate did not produce a complete performance run because it failed the hard visual gate. Summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-029-collision-broadphase-20260524T130514Z/perf-029-rejected-collision-broadphase-summary.json`.

## 2026-05-24 Rejected Scenery Material Cache Checkpoint

Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-030-scenery-material-cache-20260524T134250Z`

Rejected change:

- Shared identical static `MeshStandardMaterial` instances inside `createRaceScenery` with a per-scene material cache.
- Reverted the change because product-facing actual-FPS evidence regressed even though material counts, focused render calls, and focused triangles improved.

Latest evidence:

| Evidence | Result |
| --- | --- |
| Fresh before `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Candidate syntax check | Pass for `src/game/race/render/createRaceScenery.js`. |
| Candidate `npm run test:race` | Pass. |
| Candidate `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Post-revert preservation | Exact source diff, syntax, `npm run test:race`, `npm run test:race:browser`, `npm run build`, `npm run test:visual`, and `git diff --check` passed after restoring the pre-candidate file. |

Measured candidate result versus the fresh before baseline:

| Metric | Fresh before | Candidate | Delta |
| --- | ---: | ---: | ---: |
| Desktop focused actual FPS | `39.09` | `35.49` | `-3.60` |
| Desktop all-scenario actual FPS | `35.63` | `33.99` | `-1.64` |
| Sustained actual FPS | `17.67` | `17.59` | `-0.08` |
| Focused render calls | `689.57` | `684.29` | `-5.28` |
| Focused render triangles | `71,228.29` | `70,818.29` | `-410.00` |
| Scene materials | `201` | `172` | `-29` |
| Scenery materials | `122` | `93` | `-29` |

Decision: reject and revert. The candidate reduced material counts and render complexity counters, but focused desktop, desktop all-scenario, and sustained actual FPS all regressed. Summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-030-scenery-material-cache-20260524T134250Z/perf-030-rejected-scenery-material-cache-summary.json`.

## 2026-05-24 Rejected Road-Guidance Velocity Checkpoint

Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-031-road-guidance-velocity-20260524T141202Z`

Rejected change:

- Replaced transient `nearest.tangent.clone().multiplyScalar(...)` target vectors in road assist, track-boundary return, and stuck recovery velocity lerps with direct numeric tangent-target lerp math.
- Reverted the change because product-facing actual-FPS evidence regressed even though focused frame-work and render timings improved.

Latest evidence:

| Evidence | Result |
| --- | --- |
| Fresh before `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Candidate syntax check | Pass for `src/game/race/physics/kartPhysics.js`. |
| Candidate `npm run test:race` | Pass. |
| Candidate `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Post-revert preservation | Exact source diff, syntax, `npm run test:race`, `npm run test:race:browser`, `npm run build`, `npm run test:visual`, and `git diff --check` passed after restoring the pre-candidate file. |

Measured candidate result versus the fresh before baseline:

| Metric | Fresh before | Candidate | Delta |
| --- | ---: | ---: | ---: |
| Desktop focused actual FPS | `36.66` | `36.48` | `-0.18` |
| Desktop all-scenario actual FPS | `35.58` | `35.35` | `-0.23` |
| Sustained actual FPS | `17.60` | `17.48` | `-0.12` |
| Focused frame-work ms | `27.08` | `26.63` | `-0.46` |
| Focused render ms | `11.54` | `11.30` | `-0.24` |

Decision: reject and revert. The candidate reduced focused frame-work and render timings, but focused desktop, desktop all-scenario, and sustained actual FPS all regressed. Summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-031-road-guidance-velocity-20260524T141202Z/perf-031-rejected-road-guidance-velocity-summary.json`.

## 2026-05-24 Rejected Vehicle-Mode Cache Checkpoint

Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-032-vehicle-mode-cache-20260524T144114Z`

Rejected change:

- Cached repeated `setMode` calls in the player and rival vehicle model factories so per-frame `syncRaceMeshes` visibility writes return early when vehicle mode has not changed.
- Reverted the change because sustained normal-play actual FPS regressed despite focused desktop and desktop all-scenario actual-FPS improvements.

Latest evidence:

| Evidence | Result |
| --- | --- |
| Fresh before `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Candidate syntax checks | Pass for `src/game/city3dAssets.js` and `src/game/race/render/createRaceVehicles.js`. |
| Candidate `npm run test:race` | Pass. |
| Candidate `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Post-revert preservation | Exact source diffs, syntax, `npm run test:race`, `npm run test:race:browser`, `npm run build`, `npm run test:visual`, and `git diff --check` passed after restoring the pre-candidate files. |

Measured candidate result versus the fresh before baseline:

| Metric | Fresh before | Candidate | Delta |
| --- | ---: | ---: | ---: |
| Desktop focused actual FPS | `33.49` | `34.85` | `+1.36` |
| Desktop all-scenario actual FPS | `32.57` | `33.88` | `+1.31` |
| Sustained actual FPS | `17.71` | `16.93` | `-0.78` |
| Focused frame-work ms | `24.84` | `24.62` | `-0.22` |
| Sustained frame-work ms | `2.14` | `2.13` | `-0.01` |
| Sustained render ms | `0.89` | `0.86` | `-0.03` |

Decision: reject and revert. The candidate improved focused desktop and desktop all-scenario actual FPS, but sustained normal-play actual FPS regressed enough to fail the no-countervailing-FPS-regression keep criteria. Summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-032-vehicle-mode-cache-20260524T144114Z/perf-032-rejected-vehicle-mode-cache-summary.json`.

## 2026-05-24 Rejected Rival Route Allocation Checkpoint

Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-033-rival-route-allocation-20260524T151111Z`

Rejected change:

- Replaced per-rival route-layer score object allocation/sort with a best-score loop and reused a transient rival-route normal vector during rival position updates.
- Reverted the change because sustained normal-play actual FPS regressed and sustained frame-work/render timings worsened despite focused desktop and desktop all-scenario FPS improvements.

Latest evidence:

| Evidence | Result |
| --- | --- |
| Fresh before `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Candidate syntax checks | Pass for `src/game/race/raceRivals.js`. |
| Route-choice equivalence check | Pass. |
| Candidate `npm run test:race` | Pass. |
| Candidate `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Post-revert preservation | Exact source diff, syntax, `npm run test:race`, `npm run test:race:browser`, `npm run build`, `npm run test:visual`, and `git diff --check` passed after restoring the pre-candidate file. |
| Production gate audit | Still records `r3-blocked-gates-remain`. |

Measured candidate result versus the fresh before baseline:

| Metric | Fresh before | Candidate | Delta |
| --- | ---: | ---: | ---: |
| Desktop focused actual FPS | `37.55` | `38.05` | `+0.51` |
| Desktop all-scenario actual FPS | `34.59` | `36.77` | `+2.18` |
| Sustained actual FPS | `17.69` | `17.31` | `-0.38` |
| Focused frame-work ms | `22.33` | `22.96` | `+0.63` |
| Sustained frame-work ms | `2.13` | `2.18` | `+0.05` |
| Sustained render ms | `0.85` | `0.93` | `+0.08` |

Decision: reject and revert. The candidate improved focused desktop and desktop all-scenario actual FPS, but sustained normal-play actual FPS regressed and sustained frame-work/render timings worsened, so no performance evidence was promoted. Summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-033-rival-route-allocation-20260524T151111Z/perf-033-rejected-rival-route-allocation-summary.json`.

## 2026-05-24 Rejected Player-Frame Vector Scratch Checkpoint

Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-034-player-frame-vector-scratch-20260524T154421Z`

Rejected change:

- Reused module-level player-frame forward/right `THREE.Vector3` scratch objects instead of allocating new vectors during each player update.
- Reverted the change because focused desktop actual FPS and sustained actual FPS regressed, and sustained frame-work/render timings worsened.

Latest evidence:

| Evidence | Result |
| --- | --- |
| Fresh before `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Candidate syntax check | Pass for `src/game/race/racePlayerFrame.js`. |
| Forward/right equivalence check | Pass. |
| Candidate `npm run test:race` | Pass. |
| Candidate `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Post-revert preservation | Exact source diff, syntax, `npm run test:race`, `npm run test:race:browser`, `npm run build`, `npm run test:visual`, and `git diff --check` passed after restoring the pre-candidate file. |

Measured candidate result versus the fresh before baseline:

| Metric | Fresh before | Candidate | Delta |
| --- | ---: | ---: | ---: |
| Desktop focused actual FPS | `38.06` | `35.57` | `-2.49` |
| Desktop all-scenario actual FPS | `35.53` | `35.91` | `+0.37` |
| Sustained actual FPS | `17.51` | `17.44` | `-0.07` |
| Focused frame-work ms | `17.04` | `16.63` | `-0.41` |
| Focused render ms | `11.46` | `11.25` | `-0.21` |
| Focused render calls | `626.09` | `621.45` | `-4.64` |
| Focused render triangles | `66,660.36` | `66,249.27` | `-411.09` |
| Sustained frame-work ms | `2.11` | `2.28` | `+0.17` |
| Sustained render ms | `0.87` | `0.89` | `+0.02` |

Decision: reject and revert. The candidate reduced focused phase/counter metrics and slightly improved desktop all-scenario actual FPS, but focused desktop and sustained actual FPS regressed and sustained timings worsened. Summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-034-player-frame-vector-scratch-20260524T154421Z/perf-034-rejected-player-frame-vector-scratch-summary.json`.

## 2026-05-24 Rejected Telemetry Projection Scratch Checkpoint

Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-035-telemetry-projection-scratch-20260524T161256Z`

Rejected change:

- Reused scratch `THREE.Box3` and `THREE.Vector3` objects in race telemetry projection helpers for kart screen coverage, point visibility, road-ahead probes, branch visibility, horizon, and reverse-speed forward-vector calculations.
- Reverted the change because desktop all-scenario actual FPS and sustained actual FPS regressed, and focused/sustained telemetry/render counters worsened despite a small focused desktop actual-FPS gain.

Latest evidence:

| Evidence | Result |
| --- | --- |
| Fresh before `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Candidate syntax check | Pass for `src/game/race/raceTelemetry.js`. |
| Candidate `npm run test:race` | Pass. |
| Candidate `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Post-revert preservation | Exact source diff, syntax, `npm run test:race`, `npm run test:race:browser`, `npm run build`, `npm run test:visual`, and `git diff --check` passed after restoring the pre-candidate file. |

Measured candidate result versus the fresh before baseline:

| Metric | Fresh before | Candidate | Delta |
| --- | ---: | ---: | ---: |
| Desktop focused actual FPS | `35.60` | `35.73` | `+0.13` |
| Desktop all-scenario actual FPS | `35.08` | `34.37` | `-0.70` |
| Sustained actual FPS | `17.91` | `17.51` | `-0.40` |
| Focused frame-work ms | `31.79` | `31.46` | `-0.33` |
| Focused render ms | `11.78` | `11.55` | `-0.23` |
| Focused telemetry ms | `1.31` | `1.31` | `+0.01` |
| Focused render calls | `689.14` | `691.86` | `+2.71` |
| Focused render triangles | `71,446.00` | `71,603.43` | `+157.43` |
| Sustained render ms | `0.86` | `0.88` | `+0.02` |
| Sustained telemetry ms | `0.37` | `0.40` | `+0.03` |

Decision: reject and revert. The candidate slightly improved focused desktop actual FPS and lowered focused frame-work/render timings, but desktop all-scenario and sustained actual FPS regressed and telemetry/render counters worsened. Summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-035-telemetry-projection-scratch-20260524T161256Z/perf-035-rejected-telemetry-projection-scratch-summary.json`.

## 2026-05-24 Rejected Controls Allocation Checkpoint

Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-036-controls-allocation-20260524T164100Z`

Rejected change:

- Avoided cloning the player-frame controls object unless the control-flip hazard is active.
- Reverted the change because the required browser visual gate failed in `comeback-city-desktop-opening-sequence` with `camera clip count 1 is not zero`.

Latest evidence:

| Evidence | Result |
| --- | --- |
| Fresh before `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Candidate syntax check | Pass for `src/game/race/racePlayerFrame.js`. |
| Candidate `npm run test:race` | Pass. |
| Candidate `npm run test:race:browser` | Fail; desktop opening-sequence visual telemetry reported `camera clip count 1 is not zero`. |
| Post-revert preservation | Exact source diff, syntax, `npm run test:race`, `npm run test:race:browser`, `npm run build`, `npm run test:visual`, and `git diff --check` passed after restoring the pre-candidate file. |

Measured baseline and restored state:

| Metric | Fresh before | Post-revert |
| --- | ---: | ---: |
| Desktop focused actual FPS | `36.84` | `38.59` |
| Desktop all-scenario actual FPS | `34.29` | `35.13` |
| Sustained actual FPS | `17.71` | `17.84` |
| Post-revert browser gate | `24` races / `28` checks | `24` races / `28` checks |

Decision: reject and revert. A candidate that fails a camera visual gate cannot be promoted regardless of allocation intent or baseline performance context. Summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-036-controls-allocation-20260524T164100Z/perf-036-rejected-controls-allocation-summary.json`.

## 2026-05-24 Rejected Telemetry Sample-Buffer Checkpoint

Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-037-telemetry-sample-buffer-20260524T171126Z`

Rejected change:

- Mutated and capped the playtest diagnostic telemetry sample array instead of copying it on every telemetry publish.
- Reverted the change because sustained normal-play actual FPS regressed and sustained frame-work/render counters did not improve together.

Latest evidence:

| Evidence | Result |
| --- | --- |
| Fresh before `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Candidate syntax check | Pass for `src/game/race/raceTelemetryDiagnostics.js`. |
| Candidate `npm run test:race` | Pass. |
| Candidate `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Post-revert preservation | Exact source diff, syntax, `npm run test:race`, repeat `npm run test:race:browser`, `npm run build`, `npm run test:visual`, JSON parsing, and `git diff --check` passed after restoring the pre-candidate file. |

Measured candidate result versus the fresh before baseline:

| Metric | Fresh before | Candidate | Delta |
| --- | ---: | ---: | ---: |
| Desktop focused actual FPS | `33.00` | `34.72` | `+1.73` |
| Desktop all-scenario actual FPS | `33.00` | `34.72` | `+1.73` |
| Sustained actual FPS | `17.62` | `16.99` | `-0.63` |
| Focused frame-work ms | `24.77` | `24.63` | `-0.14` |
| Focused telemetry ms | `1.25` | `1.27` | `+0.03` |
| Sustained frame-work ms | `2.15` | `2.18` | `+0.03` |

Decision: reject and revert. The candidate improved focused desktop and desktop all-scenario actual FPS in one browser run, but sustained normal-play actual FPS regressed and sustained frame-work/render counters did not improve together. Summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-037-telemetry-sample-buffer-20260524T171126Z/perf-037-rejected-telemetry-sample-buffer-summary.json`.

## 2026-05-24 Kept Production Visual-Telemetry Guard Checkpoint

Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z`

Kept change:

- Standard production runtime now calls `publishRaceTelemetryFrame` with visual-diagnostic telemetry disabled unless race diagnostic telemetry/playtest runtime is enabled.
- HUD telemetry, player stats, and release-smoke DOM race state remain available in standard production.
- Dev/playtest visual diagnostics still build `window.__raceVisualTelemetry` and telemetry samples for browser gates.

Latest evidence:

| Evidence | Result |
| --- | --- |
| Syntax/content checks | `node --check` passed for `raceTelemetry.js`, `raceTelemetryRuntime.js`, and `race-content-playtest.mjs`; `npm run test:race` passed and now asserts the disabled visual-telemetry path skips visual-only probes while preserving HUD telemetry. |
| `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks; sustained actual FPS recorded at `17.89`. |
| `npm run build` | Pass with existing large-chunk warning. |
| `npm run test:release:smoke` | Pass; local built preview records no production playtest or visual telemetry globals and preserves desktop/mobile race DOM state. |
| `npm run test:release:artifacts` | Pass; no source maps, source-map references, standalone debug/playtest files, scanned secret leaks, runtime playtest automation strings, diagnostic telemetry globals, or visual-review route strings detected. |
| `npm run test:visual` and `git diff --check` | Pass. |

Decision: keep as production-runtime performance/release hardening. This checkpoint does not close the desktop FPS gate because the accepted browser benchmark still remains below the local `45` FPS floor and PRD `55` target. Summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/perf-038-kept-production-visual-telemetry-guard-summary.json`.

## 2026-05-24 Rejected Viewport-Fit Dirty Checkpoint

Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-039-viewport-fit-dirty-20260524T181500Z`

Rejected change:

- Drove renderer/camera fit only from initial layout plus resize/orientation signals instead of calling `fitRaceRendererToCanvas` on every animation frame.
- Reverted the change because product-facing actual-FPS evidence did not improve, even though the desktop-driving fitRenderer phase dropped by `0.09ms`.

Latest evidence:

| Evidence | Result |
| --- | --- |
| Fresh before `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Candidate `npm run test:race` | Pass. |
| Candidate `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks. |
| Post-revert preservation | Candidate identifiers removed, `npm run test:race`, `npm run test:race:browser`, `npm run build`, `npm run test:visual`, and `git diff --check` passed after restoring per-frame stable-fit behavior. |

Measured candidate result versus the fresh before baseline:

| Metric | Fresh before | Candidate | Delta |
| --- | ---: | ---: | ---: |
| Desktop focused actual FPS | `35.70` | `35.67` | `-0.03` |
| Desktop all-scenario actual FPS | `34.66` | `34.63` | `-0.03` |
| Sustained actual FPS | `17.87` | `17.77` | `-0.10` |
| Desktop driving actual FPS | `37.50` | `37.40` | `-0.10` |
| Desktop driving fitRenderer phase | `0.34ms` | `0.25ms` | `-0.09ms` |

Decision: reject and revert. The candidate reduced a measured renderer-fit phase but did not improve product-facing focused, desktop all-scenario, desktop-driving, or sustained actual FPS. Summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-039-viewport-fit-dirty-20260524T181500Z/perf-039-rejected-viewport-fit-dirty-summary.json`.

## 2026-05-24 Rejected Race-Ranking Allocation Checkpoint

Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-040-race-ranking-allocation-20260524T184127Z`

Rejected change:

- Reused a ranked-racer scratch array in the 3D race ranking frame path and replaced per-frame spread/filter/sort ranking with insertion ranking.
- Reverted the change because the two-run candidate average regressed desktop all-scenario actual FPS despite improving focused desktop actual FPS.

Latest evidence:

| Evidence | Result |
| --- | --- |
| Fresh before `npm run test:race:browser` | First attempt failed the opening-sequence camera clip gate; accepted rerun passed with `24` race completions and `28` visual/control/fallback checks. |
| Candidate `npm run test:race` | Pass. |
| Candidate `npm run test:race:browser` | Two passes, each with `24` race completions and `28` visual/control/fallback checks. |
| Post-revert preservation | Candidate identifiers removed; `npm run test:race`, `npm run test:race:browser`, `npm run build`, `npm run test:visual`, and `git diff --check` passed after restoring the original ranking path. |

Measured two-run candidate average versus the accepted fresh baseline:

| Metric | Fresh baseline | Candidate two-run average | Delta |
| --- | ---: | ---: | ---: |
| Desktop focused actual FPS | `36.46` | `38.02` | `+1.56` |
| Desktop all-scenario actual FPS | `36.13` | `35.46` | `-0.67` |
| Desktop driving actual FPS | `37.20` | `37.35` | `+0.15` |
| Mobile driving actual FPS | `32.40` | `32.55` | `+0.15` |

Decision: reject and revert. Focused desktop actual FPS improved, but the desktop all-scenario regression fails the no-countervailing-FPS-regression keep criteria. Summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-040-race-ranking-allocation-20260524T184127Z/perf-040-rejected-race-ranking-allocation-summary.json`.

## 2026-05-23 Rejected Follow-Up Candidates

Rejected evidence directories:

- `.agent/runs/kart-racer-production-readiness/evidence/perf-004-20260523T195759Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-005-20260523T212003Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-006-20260523T221238Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-007-20260524T004200Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-008-20260524T014921Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-009-20260524T020005Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-010-20260524T022849Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-011-20260524T025908Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-012-20260524T032926Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-013-20260524T034702Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-014-20260524T040324Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-015-20260524T042136Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-016-20260524T044449Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-017-20260524T052300Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-018-20260524T052841Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-019-20260524T055015Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-020-20260524T061703Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-021-20260524T063735Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-022-20260524T065539Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-024-20260524T075546Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-025-20260524T082513Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-026-20260524T085441Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-027-20260524T101100Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-028-static-matrix-world-20260524T114346Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-029-collision-broadphase-20260524T130514Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-030-scenery-material-cache-20260524T134250Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-031-road-guidance-velocity-20260524T141202Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-032-vehicle-mode-cache-20260524T144114Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-033-rival-route-allocation-20260524T151111Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-034-player-frame-vector-scratch-20260524T154421Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-035-telemetry-projection-scratch-20260524T161256Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-036-controls-allocation-20260524T164100Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-037-telemetry-sample-buffer-20260524T171126Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-039-viewport-fit-dirty-20260524T181500Z`
- `.agent/runs/kart-racer-production-readiness/evidence/perf-040-race-ranking-allocation-20260524T184127Z`

Rejected changes:

- Race-only Lambert/material-cost experiment: reverted after the browser harness timed out on a steering-readiness visual snapshot. No kept evidence was promoted from this candidate.
- Static collision-clearance telemetry cache: reverted after a default `npm run test:race:browser` pass showed normal desktop focused actual-FPS average regressed from `41.54` to `37.16`, despite lower frame-work and telemetry-phase cost.
- Global road-sign instancing: reverted after a browser pass showed focused draw calls improved to `641.71`, but focused actual-FPS regressed to `39.57` and sustained actual-FPS regressed to `16.25`.
- Per-sign road-sign instancing: reverted after the default browser harness timed out during visual readiness.
- Far perimeter-window material consolidation: reverted after two passing browser runs reduced material count and improved some immediate WebGL-checkpoint measurements, but the two-run average still trailed the then-kept `perf-003` baseline for sustained actual FPS, desktop average actual FPS, and focused desktop actual FPS.
- Far perimeter-window density reduction: reverted after two passing browser runs reduced scenery triangles by `2,112` and improved sustained actual FPS versus current code, but desktop average actual FPS regressed versus the current-code checkpoint and the two-run average still trailed `perf-003` for desktop average and focused desktop actual FPS.
- Static scenery instanced-mesh frustum culling: reverted after a passing browser run reduced desktop render work and triangles but regressed sustained actual FPS and desktop average actual FPS versus the current RC checkpoint and still trailed `perf-003`.
- Track-surface `MeshBasicMaterial` shader-cost experiment: reverted after syntax and `npm run test:race` passed but two default `npm run test:race:browser` attempts timed out before producing a browser summary.
- Rival LOD over-reduction: reverted after syntax and `npm run test:race` passed but the default `npm run test:race:browser` run timed out during visual readiness before producing a complete browser summary.
- Far perimeter skyline density reduction: reverted after the browser harness passed but focused desktop product-facing actual FPS regressed by `3.43` versus the then-kept `perf-003` comparison set. Sustained actual FPS improved by `0.24` and scene/scenery triangles dropped by `1,704`, but the focused FPS regression failed keep criteria.
- Default telemetry cadence increase to `220ms`: reverted after syntax and `npm run test:race` passed but the default `npm run test:race:browser` run timed out on `page.waitForFunction` before producing a complete browser summary.
- Race HUD backdrop-blur removal: reverted after the browser harness passed and frame-work/render/call/triangle metrics improved, but focused desktop product-facing actual FPS regressed by `4.60` versus the before baseline. Sustained actual FPS improved by only `0.13`, so the focused FPS regression failed keep criteria.
- Race renderer stencil-buffer disable: reverted after the browser harness passed and frame-work/render/call/triangle metrics improved, but focused desktop product-facing actual FPS regressed by `4.70` and the focused minimum regressed by `15.70` versus the before baseline. Sustained actual FPS improved by only `0.26`, so the focused FPS regression failed keep criteria.
- Small pickup/hazard geometry tessellation reduction: reverted after the browser harness passed and pickup triangles dropped by `4,272`, but desktop average actual FPS regressed by `2.34` and focused desktop actual FPS regressed by `2.47` versus the current-code baseline. Sustained actual FPS improved by `0.94`, but the focused and desktop-average FPS regressions failed keep criteria.
- Static collision-circle effective-radius precompute: reverted after the browser harness passed and focused telemetry cost improved by `0.66ms` while sustained actual FPS improved by `0.80`, but focused desktop product-facing actual FPS regressed by `2.70` versus the current-code baseline. Desktop average improved by only `0.03`, so the focused FPS regression failed keep criteria.
- Race renderer `NoToneMapping`: reverted after the browser harness passed and focused render cost improved by `2.44ms` while sustained actual FPS improved by `1.25`, but focused desktop product-facing actual FPS regressed by `11.95` and desktop average actual FPS regressed by `4.38` versus the current-code baseline.
- Binary `pointAt` segment lookup: reverted after the browser harness passed and sustained actual FPS improved by `0.65`, but focused desktop product-facing actual FPS regressed by `2.93` and desktop average actual FPS regressed by `0.08` versus the current-code baseline.
- Clean-track cap instancing: reverted after both global and chunked cap-batch variants passed the browser harness but produced countervailing product-FPS regressions. The global variant improved focused desktop actual FPS by `2.89`, but regressed sustained actual FPS by `0.25` and desktop average actual FPS by `1.70`; the chunked variant improved sustained actual FPS by `0.36`, but regressed focused desktop actual FPS by `3.65` and desktop average actual FPS by `4.00`.
- Aggressive race camera/fog far-range reduction: reverted after the candidate lowered the camera far plane and fog far distance to `520`, passed syntax and `npm run test:race`, but timed out in the default browser harness before writing a complete summary. The first post-revert browser attempt also timed out; the repeat post-revert default browser run passed with `24` races and `28` visual/control/fallback checks.
- Race WebGL antialias disable: reverted after the candidate changed only `RACE_RENDERER_OPTIONS.antialias` from `true` to `false`, passed syntax and `npm run test:race`, but timed out in the default browser harness before writing a complete summary. Post-revert validation passed syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, exact source checks, and `git diff --check`.
- Distant mountain/snow instancing: reverted after the candidate batched the six distant mountain meshes and six snow caps into three instanced meshes and passed syntax, `npm run test:race`, and `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks. It improved sustained actual FPS by only `0.09`, while desktop focused actual-FPS average regressed by `2.78` and desktop all-scenario average regressed by `2.72`, so the product-FPS regression failed keep criteria.
- Flat ground-plane segment reduction: reverted after the candidate lowered the flat race ground `PlaneGeometry` subdivisions from `24x24` to `1x1`. The first browser run passed and improved focused, desktop-average, and sustained actual-FPS metrics versus a noisy fresh baseline, but the repeat default browser run failed the visual telemetry gate with `camera clip count 1 is not zero`. Post-revert validation passed syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, exact source checks, JSON parsing, and `git diff --check`.
- Moderate race camera/fog far-range reduction to `560`: reverted after the candidate passed syntax, `npm run test:race`, and `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, but failed keep criteria. Focused desktop actual FPS improved only `+0.54`, while desktop all-scenario actual FPS regressed `-0.40`, sustained actual FPS regressed `-0.27`, and focused frame work/render/calls/triangles worsened. Post-revert validation passed syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, exact source checks, JSON parsing, and `git diff --check`.
- Chase-camera vector scratch cleanup: reverted after the candidate reused scratch vectors in the chase-camera frame path and lazily created the fallback route-lookahead target. Syntax and `npm run test:race` passed, but the required default browser harness timed out on `page.waitForFunction` before producing a complete candidate summary. Post-revert validation passed syntax for `chaseCamera.js`, `raceCameraRuntime.js`, and `race-content-playtest.mjs`, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, exact source checks, and JSON summary parsing.
- Desktop render-scale reduction to `0.88`: reverted even though the candidate passed syntax, `npm run test:race`, `npm run test:race:browser`, `npm run build`, `npm run test:visual`, and `npm run test:race:disable`, because the plan excludes visual-resolution tradeoffs before owner-approved visual-target input. Post-revert validation passed syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, and `npm run test:race:disable`.
- Static matrix-world update lock: reverted after the first browser pass improved focused desktop actual FPS by `0.78`, desktop all-scenario actual FPS by `2.65`, and sustained actual FPS by `0.06`, but the repeat browser pass failed the hard camera-clip visual gate with `camera clip count 1 is not zero`. Post-revert validation passed syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, and `git diff --check`.
- World-collision broadphase skip: reverted after syntax and `npm run test:race` passed but the required browser gate failed visual telemetry with `camera clip count 1 is not zero` in the desktop opening sequence. Post-revert validation passed syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, and exact source diff checks.
- Scenery material cache: reverted after syntax, `npm run test:race`, and `npm run test:race:browser` passed because material-count savings did not translate to product-FPS improvement. Scene/scenery material counts dropped by `29`, focused render calls dropped by `5.28`, and focused triangles dropped by `410`, but focused desktop actual FPS regressed by `3.60`, desktop all-scenario actual FPS regressed by `1.64`, and sustained actual FPS regressed by `0.08`. Post-revert validation passed exact source diff, syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, and `git diff --check`.
- Road-guidance velocity allocation cleanup: reverted after syntax, `npm run test:race`, and `npm run test:race:browser` passed because focused desktop, desktop all-scenario, and sustained actual FPS regressed despite lower focused frame-work and render timings. Post-revert validation passed exact source diff, syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, and `git diff --check`.
- Vehicle-mode visibility cache: reverted after syntax, `npm run test:race`, and `npm run test:race:browser` passed because sustained normal-play actual FPS regressed by `0.78` despite focused desktop actual FPS improving by `1.36` and desktop all-scenario actual FPS improving by `1.31`. Post-revert validation passed exact source diff, syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, and `git diff --check`.
- Rival route allocation cleanup: reverted after syntax, route-choice equivalence, `npm run test:race`, and `npm run test:race:browser` passed because sustained normal-play actual FPS regressed by `0.38` and sustained frame-work/render timings worsened, despite focused desktop actual FPS improving by `0.51` and desktop all-scenario actual FPS improving by `2.18`. Post-revert validation passed exact source diff, syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, and `git diff --check`.
- Player-frame vector scratch: reverted after syntax, forward/right equivalence, `npm run test:race`, and `npm run test:race:browser` passed because focused desktop actual FPS regressed by `2.49` and sustained actual FPS regressed by `0.07` while sustained frame-work/render timings worsened. Post-revert validation passed exact source diff, syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, and `git diff --check`.
- Telemetry projection scratch: reverted after syntax, `npm run test:race`, and `npm run test:race:browser` passed because desktop all-scenario actual FPS regressed by `0.70`, sustained actual FPS regressed by `0.40`, and telemetry/render counters worsened despite focused desktop actual FPS improving by `0.13` and focused frame-work/render timings dropping. Post-revert validation passed exact source diff, syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, and `git diff --check`.
- Controls allocation cleanup: reverted after syntax and `npm run test:race` passed but the required browser gate failed `comeback-city-desktop-opening-sequence` with `camera clip count 1 is not zero`. Post-revert validation passed exact source diff, syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, and `git diff --check`.
- Playtest telemetry sample-buffer mutation: reverted after syntax, `npm run test:race`, and `npm run test:race:browser` passed because sustained normal-play actual FPS regressed by `0.63` and sustained frame-work/render counters did not improve together. Post-revert validation passed exact source diff, syntax, `npm run test:race`, repeat `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, JSON parsing, and `git diff --check`.
- Viewport-fit dirty gating: reverted after the candidate drove renderer fit from initial layout/resize/orientation signals and passed race/browser gates, but focused desktop actual FPS regressed by `0.03`, desktop all-scenario actual FPS regressed by `0.03`, sustained actual FPS regressed by `0.10`, and desktop-driving actual FPS regressed by `0.10` versus the fresh baseline. The desktop-driving fitRenderer phase dropped by `0.09ms`, but phase savings without product-facing FPS improvement failed keep criteria.
- Race-ranking allocation cleanup: reverted after content and two browser runs passed, but the two-run candidate average regressed desktop all-scenario actual FPS by `0.67` despite focused desktop actual FPS improving by `1.56`.

Rejected cache evidence:

| Evidence | Result |
| --- | --- |
| `npm run test:race` | Pass before the cache browser run. |
| `npm run test:race:browser` | Initial default run timed out, diagnostic long-timeout run passed, repeat default run passed with `24` race completions and `28` visual/control/fallback checks. |
| Normal desktop focused states | Average `37.16 actualFps`, `15.29ms frameWorkMs`, `12.48ms render`, `0.70ms telemetry`, `683.29 / 70,529.43` calls/triangles. |
| Sustained normal play | Actual FPS average `17.52`, frame work average `1.90ms`, render phase average `0.88ms`, budget misses `138`. |
| Delta from kept `perf-003` evidence | Focused actual-FPS average regressed `-4.38`; focused frame work improved `-1.57ms`; sustained actual-FPS regressed `-0.18`. |
| Road-sign instancing evidence | `perf-005-rejected-sign-batching-summary.json` records the global sign batch regression, the per-sign timeout, and the restored post-revert browser pass with `24` race completions and `28` visual/control/fallback checks. |
| Perimeter-window material evidence | `perf-006-rejected-perimeter-window-material-summary.json` records two passing candidate browser runs, a two-run candidate average of `17.61` sustained actual FPS, `34.53` desktop average actual FPS, and `37.70` focused desktop actual FPS, all below the then-kept `perf-003` product-FPS baseline. Revert preservation passed `npm run test:race`, `npm run build`, `node --check src/game/race/render/createRaceScenery.js`, and `git diff --check`. |
| Perimeter-window density evidence | `perf-007-rejected-perimeter-window-density-summary.json` records two passing candidate browser runs and a two-run candidate average of `17.98` sustained actual FPS, `35.82` desktop average actual FPS, and `37.95` focused desktop actual FPS. The candidate reduced scenery triangles by `2,112`, but it failed keep criteria because desktop average actual FPS regressed versus the current-code checkpoint and trailed `perf-003`. Revert preservation passed `npm run test:race`, `npm run build`, `node --check src/game/race/render/createRaceScenery.js`, `git diff --check`, and JSON summary parsing. |
| Static scenery frustum-culling evidence | `perf-008-rejected-scenery-frustum-summary.json` records one passing candidate browser run with `24` races and `28` visual/control/fallback checks. The candidate reduced desktop average frame work by `1.53ms`, render phase by `0.47ms`, calls by `3.34`, and triangles by `687.04` versus the current RC checkpoint, but sustained actual FPS regressed from `17.56` to `17.47` and desktop average actual FPS regressed from `34.65` to `33.14`; it also trailed `perf-003` for sustained, desktop average, and focused desktop actual FPS. Revert preservation passed `npm run test:race`, `npm run build`, `node --check src/game/race/render/createRaceScenery.js`, and `git diff --check`. |
| Track-surface basic-material evidence | `perf-009-rejected-track-basic-material-summary.json` records a candidate that changed flat track/ground/curb/rail/line materials to unlit `MeshBasicMaterial` variants. Syntax and `npm run test:race` passed, but both default browser attempts timed out on `page.waitForFunction` before summary generation. Revert preservation passed `npm run test:race`, `npm run build`, `node --check src/game/race/render/createTrackMesh.js`, and `git diff --check`. |
| Rival LOD over-reduction evidence | `perf-010-rejected-rival-lod-summary.json` records a candidate that reduced the already-lightweight rival kart model below the existing `22`-mesh LOD. Syntax and `npm run test:race` passed after preserving the two-flame contract, but the default browser harness timed out on `page.waitForFunction` before summary generation. The exact known-good rival model was restored from the local rollback bundle. Revert preservation passed `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `node --check src/game/race/render/createRaceVehicles.js`, and `git diff --check`. |
| Far perimeter skyline density evidence | `perf-011-rejected-perimeter-skyline-density-summary.json` records a candidate that reduced far perimeter skyline block-loop counts from `26`/`17` to `22`/`14`. The browser harness passed with `24` races and `28` visual/control/fallback checks and scene/scenery triangles dropped by `1,704`, but focused desktop actual FPS regressed by `3.43` versus the then-kept `perf-003` comparison set. Revert preservation passed `npm run test:race`, `npm run test:race:browser`, `npm run build`, `node --check src/game/race/render/createRaceScenery.js`, summary JSON parsing, and `git diff --check`. |
| Telemetry cadence evidence | `perf-012-rejected-telemetry-cadence-summary.json` records a candidate that increased default telemetry publication cadence from `140ms` to `220ms`. Syntax and `npm run test:race` passed, but the default browser harness timed out on `page.waitForFunction` before summary generation. The `140ms` cadence was restored. Revert preservation passed `node --check src/game/race/raceTelemetryRuntime.js`, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, and `npm run build`. |
| HUD backdrop evidence | `perf-013-rejected-hud-backdrop-summary.json` records a candidate that removed `backdrop-blur-md` from race HUD panels. The browser harness passed with `24` races and `28` visual/control/fallback checks and focused frame-work/render/calls/triangles improved, but focused desktop actual FPS regressed by `4.60` versus the before baseline. Revert preservation passed `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, and `npm run build`. |
| Renderer stencil evidence | `perf-014-rejected-renderer-stencil-summary.json` records a candidate that set the race WebGL renderer option `stencil: false`. The browser harness passed with `24` races and `28` visual/control/fallback checks and focused frame-work/render/calls/triangles improved, but focused desktop actual FPS regressed by `4.70` and focused minimum actual FPS regressed by `15.70` versus the before baseline. The first post-revert browser run timed out on readiness; the repeat post-revert browser run passed with `24` races and `28` visual/control/fallback checks, and `npm run build` passed. |
| Pickup geometry evidence | `perf-015-rejected-pickup-geometry-summary.json` records a candidate that reduced small pickup/hazard tessellation. The browser harness passed with `24` races and `28` visual/control/fallback checks and pickup triangles dropped from `8,384` to `4,112`, but desktop average actual FPS regressed by `2.34` and focused desktop actual FPS regressed by `2.47` versus the current-code baseline. Revert preservation passed syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, and `npm run build`. |
| Collision effective-radius cache evidence | `perf-016-rejected-collision-cache-summary.json` records a candidate that precomputed collision-circle effective radii for world collision and telemetry. The browser harness passed with `24` races and `28` visual/control/fallback checks and focused telemetry cost improved by `0.66ms`, but focused desktop actual FPS regressed by `2.70` versus the current-code baseline. Revert preservation passed syntax for the affected modules, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, and `npm run build`. |
| Renderer tone-mapping evidence | `perf-017-rejected-tone-mapping-summary.json` records a candidate that switched race renderer tone mapping from `ACESFilmicToneMapping` to `NoToneMapping`. The browser harness passed with `24` races and `28` visual/control/fallback checks and focused render cost improved by `2.44ms`, but focused desktop actual FPS regressed by `11.95` and desktop average actual FPS regressed by `4.38` versus the current-code baseline. Revert preservation passed syntax for the affected files, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, and `npm run build`. |
| Track point lookup evidence | `perf-018-rejected-point-at-summary.json` records a candidate that replaced `compileTrack3D().pointAt()`'s linear segment scan with a boundary-preserving binary lookup. The browser harness passed with `24` races and `28` visual/control/fallback checks and sustained actual FPS improved by `0.65`, but focused desktop actual FPS regressed by `2.93` and desktop average actual FPS regressed by `0.08` versus the current-code baseline. Revert preservation passed syntax for the affected files, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, and `npm run build`. |
| Track cap instancing evidence | `perf-019-rejected-track-cap-instancing-summary.json` records global and chunked clean-track cap instancing variants. Both browser harness runs passed with `24` races and `28` visual/control/fallback checks, but the global variant regressed sustained actual FPS by `0.25` and desktop average actual FPS by `1.70`, while the chunked variant regressed focused desktop actual FPS by `3.65` and desktop average actual FPS by `4.00`. Revert preservation passed syntax for `createTrackMesh.js`, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, and `git diff --check`. |
| Far-range culling evidence | `perf-020-rejected-far-range-summary.json` records a candidate that lowered race camera/fog far range to `520`. Syntax and `npm run test:race` passed, but the default browser harness timed out before producing a complete summary, so no performance evidence was promoted. Revert preservation passed syntax for `createRaceScene.js` and `race-content-playtest.mjs`, `npm run test:race`, repeat `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, exact source checks, and `git diff --check`. |
| WebGL antialias evidence | `perf-021-rejected-antialias-summary.json` records a candidate that changed only `RACE_RENDERER_OPTIONS.antialias` from `true` to `false`. Syntax and `npm run test:race` passed, but the default browser harness timed out before producing a complete summary, so no performance evidence was promoted. Revert preservation passed syntax for `createRaceScene.js` and `race-content-playtest.mjs`, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, exact source checks, and `git diff --check`. |
| Mountain instancing evidence | `perf-022-rejected-mountain-instancing-summary.json` records a candidate that batched distant mountain and snow meshes into three instanced meshes. Syntax, `npm run test:race`, and `npm run test:race:browser` passed with `24` races and `28` visual/control/fallback checks, but desktop focused actual-FPS average regressed from `38.37` to `35.59` while sustained actual FPS improved only from `17.88` to `17.97`, so no performance evidence was promoted. Revert preservation passed syntax for `createRaceScenery.js` and `race-content-playtest.mjs`, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, exact source checks, and `git diff --check`. |
| Flat ground-plane segment evidence | `perf-024-rejected-ground-plane-summary.json` records a candidate that reduced the flat race ground `PlaneGeometry` subdivisions from `24x24` to `1x1`. Syntax and `npm run test:race` passed, and the first browser run passed with improved FPS metrics, but the repeat browser run failed the visual telemetry gate with `camera clip count 1 is not zero`. Revert preservation passed syntax for `createTrackMesh.js` and `race-content-playtest.mjs`, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, exact source checks, JSON parsing, and `git diff --check`. |
| Moderate far-range evidence | `perf-025-rejected-moderate-far-range-summary.json` records a candidate that lowered only race camera/fog far range from `580` to `560`. The candidate browser suite passed with `24` races and `28` visual/control/fallback checks and camera clip count `0`, but desktop all-scenario actual FPS regressed by `0.40`, sustained actual FPS regressed by `0.27`, and focused frame work/render/calls/triangles worsened while focused actual FPS improved only `0.54`. Revert preservation passed syntax for `createRaceScene.js` and `race-content-playtest.mjs`, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, exact source checks, JSON parsing, and `git diff --check`. |
| Chase-camera scratch evidence | `perf-026-rejected-camera-scratch-summary.json` records a candidate that reused scratch vectors in the chase-camera frame path and lazily created the fallback route-lookahead target. Syntax and `npm run test:race` passed, but the default browser harness timed out on `page.waitForFunction` before producing a candidate summary, so no performance evidence was promoted. Revert preservation passed syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, exact source checks, and JSON parsing. |
| Desktop render-scale evidence | `perf-027-rejected-render-scale-summary.json` records a candidate that lowered `RACE_RENDER_SCALE.desktop` from `0.92` to `0.88`. The candidate improved focused desktop actual FPS by `2.57` and sustained actual FPS by `1.36` in one browser run, but desktop all-scenario actual FPS regressed by `0.25` and the change was a visual-resolution tradeoff without owner-approved target input. Revert preservation passed syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, and `npm run test:race:disable`. |
| Static matrix-world evidence | `perf-028-rejected-static-matrix-world-summary.json` records a candidate that locked static track and non-animated scenery matrix-world updates. The first candidate browser run passed with `24` races and `28` visual/control/fallback checks and improved focused desktop actual FPS by `0.78`, desktop all-scenario actual FPS by `2.65`, and sustained actual FPS by `0.06`, but the repeat browser run failed visual telemetry with `camera clip count 1 is not zero`. Revert preservation passed syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, and `git diff --check`. |
| Collision broadphase evidence | `perf-029-rejected-collision-broadphase-summary.json` records a candidate that skipped nearest-road collision work for circles too far away to collide. Syntax and `npm run test:race` passed, but the required browser gate failed visual telemetry with `camera clip count 1 is not zero` in `comeback-city-desktop-opening-sequence`, so no performance evidence was promoted. Revert preservation passed syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, and exact source diff checks. |
| Scenery material cache evidence | `perf-030-rejected-scenery-material-cache-summary.json` records a candidate that shared identical static scenery `MeshStandardMaterial` instances. Syntax, `npm run test:race`, and `npm run test:race:browser` passed with `24` races and `28` visual/control/fallback checks, and scene/scenery material counts dropped by `29`, but focused desktop actual FPS regressed by `3.60`, desktop all-scenario actual FPS regressed by `1.64`, and sustained actual FPS regressed by `0.08`. Revert preservation passed exact source diff, syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, and `git diff --check`. |
| Road-guidance velocity evidence | `perf-031-rejected-road-guidance-velocity-summary.json` records a candidate that removed transient road-guidance velocity target vector allocations in `kartPhysics.js`. Syntax, `npm run test:race`, and `npm run test:race:browser` passed with `24` races and `28` visual/control/fallback checks, but focused desktop actual FPS regressed by `0.18`, desktop all-scenario actual FPS regressed by `0.23`, and sustained actual FPS regressed by `0.12`, despite focused frame-work improving by `0.46ms` and focused render improving by `0.24ms`. Revert preservation passed exact source diff, syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, and `git diff --check`. |
| Vehicle-mode cache evidence | `perf-032-rejected-vehicle-mode-cache-summary.json` records a candidate that cached repeated player/rival vehicle model `setMode` calls. Syntax, `npm run test:race`, and `npm run test:race:browser` passed with `24` races and `28` visual/control/fallback checks, focused desktop actual FPS improved by `1.36`, and desktop all-scenario actual FPS improved by `1.31`, but sustained normal-play actual FPS regressed by `0.78`, so no performance evidence was promoted. Revert preservation passed exact source diffs, syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, and `git diff --check`. |
| Rival route allocation evidence | `perf-033-rejected-rival-route-allocation-summary.json` records a candidate that replaced per-rival route-layer score allocation/sort with a best-score loop and reused a transient rival-route normal vector. Syntax, route-choice equivalence, `npm run test:race`, and `npm run test:race:browser` passed with `24` races and `28` visual/control/fallback checks, focused desktop actual FPS improved by `0.51`, and desktop all-scenario actual FPS improved by `2.18`, but sustained normal-play actual FPS regressed by `0.38` and sustained frame-work/render timings worsened, so no performance evidence was promoted. Revert preservation passed exact source diff, syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, and `git diff --check`. |
| Player-frame vector scratch evidence | `perf-034-rejected-player-frame-vector-scratch-summary.json` records a candidate that reused player-frame forward/right vector scratch objects. Syntax, forward/right equivalence, `npm run test:race`, and `npm run test:race:browser` passed with `24` races and `28` visual/control/fallback checks, focused frame-work/render/calls/triangles improved and desktop all-scenario actual FPS improved by `0.37`, but focused desktop actual FPS regressed by `2.49`, sustained actual FPS regressed by `0.07`, and sustained frame-work/render timings worsened, so no performance evidence was promoted. Revert preservation passed exact source diff, syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, and `git diff --check`. |
| Telemetry projection scratch evidence | `perf-035-rejected-telemetry-projection-scratch-summary.json` records a candidate that reused telemetry projection scratch objects. Syntax, `npm run test:race`, and `npm run test:race:browser` passed with `24` races and `28` visual/control/fallback checks, focused desktop actual FPS improved by `0.13`, focused frame-work improved by `0.33ms`, and focused render improved by `0.23ms`, but desktop all-scenario actual FPS regressed by `0.70`, sustained actual FPS regressed by `0.40`, focused telemetry/render counters worsened, and sustained render/telemetry timings worsened, so no performance evidence was promoted. Revert preservation passed exact source diff, syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, and `git diff --check`. |
| Controls allocation evidence | `perf-036-rejected-controls-allocation-summary.json` records a candidate that avoided cloning the player-frame controls object unless control flip is active. Syntax and `npm run test:race` passed, but `npm run test:race:browser` failed the required desktop opening-sequence camera visual gate with `camera clip count 1 is not zero`, so no performance evidence was promoted. Revert preservation passed exact source diff, syntax, `npm run test:race`, `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, and `git diff --check`. |
| Telemetry sample-buffer evidence | `perf-037-rejected-telemetry-sample-buffer-summary.json` records a candidate that mutated and capped the playtest diagnostic telemetry sample array instead of copying it on every telemetry publish. Syntax, `npm run test:race`, and `npm run test:race:browser` passed with `24` races and `28` visual/control/fallback checks, focused desktop and desktop all-scenario actual FPS improved by `1.73`, but sustained normal-play actual FPS regressed by `0.63` and sustained counters did not improve together, so no performance evidence was promoted. Revert preservation passed exact source diff, syntax, `npm run test:race`, repeat `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, `npm run build`, `npm run test:visual`, JSON parsing, and `git diff --check`. |
| Production visual-telemetry guard evidence | `perf-038-kept-production-visual-telemetry-guard-summary.json` records a kept runtime hardening change that skips visual-diagnostic telemetry construction in standard production while preserving HUD telemetry, dev/playtest diagnostics, browser gates, release smoke, artifact safety, build, visual checks, and `git diff --check`. This is production-runtime hardening, not an FPS gate closure. |
| Race-ranking allocation evidence | `perf-040-rejected-race-ranking-allocation-summary.json` records a candidate that reused a ranked-racer scratch array in the 3D ranking path. Content and two browser runs passed with `24` races and `28` visual/control/fallback checks, and focused desktop actual FPS improved by `1.56`, but desktop all-scenario actual FPS regressed by `0.67`, so no performance evidence was promoted. Revert preservation passed candidate-identifier, race, browser, build, visual, and `git diff --check` checks. |

Decision: reject and revert all rejected candidates in this section. `perf-023` is the latest kept current-code FPS checkpoint, `perf-038` is the latest kept production-runtime hardening checkpoint, and `perf-040` is the latest rejected performance checkpoint.

## Working Findings

| Finding | Planning implication |
| --- | --- |
| Draw-call reductions alone have not reliably improved `actualFps`. | Do not accept a performance change on draw calls alone. Require actual-FPS, frame-work, visual-gate, and steering evidence. |
| Some low-call scenarios still report weak `actualFps`. | Investigate frame pacing and measurement quality before assuming mesh count is the only cause. |
| Broad batching has repeatedly regressed either FPS or steering-readiness gates. | Change one category at a time and keep culling behavior visible in evidence. |
| Manual mechanic scenarios include forced setup cost. | Use normal runtime samples for product performance, and keep `visualPrimeSetup` separate from runtime. |
| Boost-only full-canvas filtering was a product-FPS outlier. | Avoid whole-canvas CSS filters for race-state feedback; use in-world/HUD effects that preserve measured boosted runtime. |
| Lower telemetry or frame-work cost is not enough when actual-FPS evidence regresses. | Reject changes that improve internal phase timings but worsen product-facing `actualFps`; use the latest kept checkpoint and a fresh before run for comparisons. |
| Telemetry projection scratch cleanup did not improve product-facing evidence enough to keep. | Do not accept telemetry allocation cleanup on focused FPS alone; require desktop all-scenario, sustained actual-FPS, and telemetry/render counters to preserve or improve together. |
| Player-frame controls allocation cleanup failed a camera visual gate. | Treat even tiny per-frame allocation changes as full browser-gate risks; reject immediately on camera clip, route, HUD, rival, or fallback failures. |
| Viewport-fit dirty gating reduced a small measured phase without improving product FPS. | Keep the per-frame stable-fit path unless resize-driven fitting improves focused, desktop-all, desktop-driving, and sustained actual FPS together while preserving visual gates. |
| Race-ranking allocation cleanup improved focused desktop FPS while desktop all-scenario FPS regressed. | Do not accept scoring/ranking allocation cleanup on focused FPS alone; desktop all-scenario and sustained evidence still decide keep/reject. |
| Playtest telemetry sample-buffer mutation improved focused FPS but regressed sustained normal-play FPS. | Do not accept harness/diagnostic overhead changes unless focused desktop, desktop-all, sustained actual FPS, and sustained frame-work/render counters improve together. |
| Road-sign batching reduced mesh/material counts or draw calls without improving kept FPS evidence. | Do not accept sign batching unless it passes the default browser harness and improves focused plus sustained actual-FPS evidence against `perf-003`. |
| Perimeter-window material consolidation reduced material count and average render time without beating the kept product-FPS baseline. | Do not accept material-count/render-phase improvements unless focused and sustained actual-FPS evidence also improves against `perf-003`. |
| Perimeter-window density reduction reduced triangles and frame work but did not improve desktop actual-FPS evidence enough to keep. | Avoid additional far-window-only passes unless paired with a clearly different hypothesis and repeat evidence that improves focused, desktop average, and sustained actual FPS. |
| Scenery instanced-mesh frustum culling reduced render work and triangles but still regressed product-facing FPS. | Do not accept culling or renderer-work improvements unless sustained and desktop average actual FPS improve at the same time. |
| Track-surface unlit material conversion did not pass the required browser gate. | Treat route-readability material changes as high risk unless the default browser visual/control/fallback suite produces complete evidence. |
| Reducing the existing lightweight rival LOD further did not pass the required browser gate. | Do not reduce rival vehicle presentation again unless the hypothesis is different and the default browser suite produces complete evidence with visible-rival and readability gates intact. |
| Far perimeter skyline density reduction improved sustained FPS slightly but regressed focused desktop FPS. | Do not accept far-perimeter density reductions unless focused desktop product-FPS evidence improves as well as sustained evidence. |
| Increasing telemetry cadence beyond `140ms` did not pass the default browser gate. | Do not raise the default telemetry interval again unless the browser readiness waits are redesigned and the default suite produces complete evidence. |
| Removing HUD backdrop blur reduced some render/work metrics but regressed focused product FPS. | Treat HUD compositor changes like rendering changes: keep only if focused desktop and sustained product-facing actual FPS both improve. |
| Disabling the race renderer stencil buffer reduced some render/work metrics but regressed focused product FPS. | Do not accept renderer context-option changes on internal phase savings alone; focused desktop and sustained product-facing actual FPS both need to improve. |
| Reducing small pickup/hazard triangles improved sustained FPS but regressed desktop-average and focused product FPS. | Do not accept small-geometry simplification when only sustained FPS improves; focused desktop and overall desktop actual FPS must not regress. |
| Precomputing collision effective radius reduced telemetry cost but regressed focused desktop FPS. | Do not accept cache/precompute changes on phase-cost savings alone; focused desktop product-facing actual FPS must not regress. |
| Switching race renderer tone mapping reduced render cost but severely regressed focused desktop FPS. | Do not accept renderer presentation changes on render-phase savings alone; focused desktop and desktop-average actual FPS must not regress. |
| Binary `pointAt` lookup reduced small CPU-phase costs and improved sustained FPS but regressed focused desktop FPS. | Do not accept algorithmic helper optimizations on CPU-phase savings alone; focused desktop and desktop-average actual FPS must not regress. |
| Clean-track cap instancing reduced static mesh/geometries and renderer calls but split FPS results between focused and sustained samples. | Do not accept track-cap batching unless focused desktop, desktop-average, and sustained actual FPS improve together while preserving culling behavior. |
| Chase-camera allocation cleanup did not produce a browser-passable candidate. | Do not promote hot-loop allocation reductions unless the default browser gate completes and records before/after product-FPS evidence. |
| Aggressively reducing race camera/fog far range to `520` did not complete the default browser gate. | Do not accept far-range culling unless the default browser suite completes and proves route readability, camera, screenshot, focused FPS, desktop-average FPS, and sustained FPS together. |
| Disabling WebGL antialias did not complete the default browser gate. | Do not accept renderer context-option changes unless the default browser suite completes and proves route readability, visual readiness, focused FPS, desktop-average FPS, and sustained FPS together. |
| Distant mountain/snow instancing produced the same countervailing-FPS pattern as other broad scenery reductions. | Do not accept decorative scenery batching when sustained FPS improves slightly but focused desktop and desktop all-scenario actual FPS regress. |
| Mild far-range culling at `580` completed the default browser gate and improved paired aggregate focused, desktop-average, and sustained actual-FPS evidence, unlike the rejected `520` candidate. | Keep only the mild `580` value and continue to require route/camera/fallback evidence plus focused, desktop-average, and sustained actual-FPS improvements for any further range/culling work. |
| Reducing the flat ground-plane subdivisions produced one passing FPS-positive run but failed repeat camera telemetry. | Do not accept low-risk-looking geometry reductions unless repeat browser evidence preserves camera clip count, route readability, visible rivals, and fallback gates. |
| Moderate far-range culling at `560` completed the browser gate but regressed desktop-all and sustained actual FPS. | Do not accept further far-range culling on focused samples alone; focused, desktop-all, sustained, render-work, and camera/readability evidence must move together. |
| Desktop render-scale reduction improved focused and sustained FPS in one run but weakens visual resolution before target approval. | Do not accept render-scale reductions without owner/design approval, an explicit dated release-owner exception, or an updated visual-quality gate. |
| Static matrix-world locking improved actual FPS in one run but failed the repeat camera clip gate. | Do not accept transform-update optimizations unless repeat browser evidence preserves camera clip count and route/camera visual readiness. |
| World-collision broadphase skipping did not complete the browser gate. | Do not promote collision-loop shortcuts unless the default browser suite completes and preserves camera clip count, route/camera visual readiness, and product-facing actual-FPS evidence. |
| Scenery material caching reduced material and render-complexity counters while product-facing FPS regressed. | Do not accept material-count reductions on counters alone; focused desktop, desktop-all, and sustained actual FPS must improve together. |
| Road-guidance velocity allocation cleanup lowered focused frame-work and render timings while product-facing FPS regressed. | Do not accept hot-loop allocation reductions on phase timings alone; focused desktop, desktop-all, and sustained actual FPS must improve together. |
| Vehicle-mode visibility caching improved focused desktop and desktop-all actual FPS while sustained normal-play FPS regressed. | Do not accept idempotent per-frame state-write reductions when any product-facing runtime FPS bucket regresses; focused desktop, desktop-all, and sustained actual FPS must improve together. |
| Rival route allocation cleanup improved focused desktop and desktop-all actual FPS while sustained normal-play FPS and sustained timings regressed. | Do not accept allocation cleanup or scoring-loop changes unless focused desktop, desktop-all, sustained actual FPS, and sustained frame timings improve together. |
| Player-frame vector scratch reduced focused frame/counter metrics while focused desktop and sustained actual FPS regressed. | Do not accept scratch-vector allocation reductions on phase/counter improvements alone; product-facing focused and sustained actual FPS still decide keep/reject. |

## Next-Pass Work Items

### RACE-PERF-002A: Add Sustained Normal-Play Capture

Goal: separate snapshot noise from sustained product runtime.

Implementation target:

- Add a focused browser capture that runs the actual race route for a fixed sustained window without manual scenario priming.
- Record average, minimum, maximum, and budget-miss count for `actualFps`, `frameElapsedMs`, `frameWorkMs`, and render phase.
- Keep existing snapshot checks unchanged.

Acceptance:

- `npm run test:race:browser` writes the sustained sample into `tmp/race-playtests/race-browser-playtest-summary.json`.
- Existing visual/control/fallback checks still pass.
- The sustained sample is labeled separately from manual visual scenarios.

### RACE-PERF-002B: Add Scene Budget Telemetry

Goal: identify which scene categories remain expensive before removing or batching visuals.

Implementation target:

- Report current object or mesh counts by broad race scene category where practical: track, scenery, pickups, rivals, VFX, HUD-independent WebGL scene.
- Report renderer program count, texture count, triangle count, and draw calls in the same browser summary row as the sustained sample.
- Do not add per-frame allocations or expensive traversal to production frames; collect counts during setup or low-frequency telemetry only.

Acceptance:

- Content or browser evidence shows the new budget fields exist.
- No current visual gate regresses.
- Performance claims cite category budgets, not only total draw calls.

### RACE-PERF-002C: Apply One Normal-View Reduction

Goal: improve normal desktop runtime without changing race feel.

Allowed candidate categories:

- Far skyline or perimeter props that do not affect route readability.
- Repeated rail/sign/barrier details beyond the chase camera readability distance.
- Decorative props outside the first 30 second teaching view.
- Material/program consolidation that does not flatten district color identity.

Do not include in this pass:

- Global track batching.
- Larger clean-track batch chunks.
- Resize-loop or renderer-fit runtime changes.
- Shoulder-underlay replacement.
- Antialias disable.
- Further desktop render-scale reduction without owner/design-approved visual-resolution exception.
- HUD transition scheduling.

Acceptance:

- Before/after summary shows normal desktop focused states improve or at least the sustained normal-play sample improves.
- Desktop idle, driving, drift, boost, item pickup, rival cluster, and finish line remain visually valid.
- High-speed steering remains within PRD target and browser readiness gates pass.
- Camera clip count remains `0`.
- Visible rivals remain at least `3` in the normal-driving gate.

### RACE-PERF-002D: Keep Or Reject The Change

Goal: prevent another false-positive performance pass.

Keep criteria:

- `npm run test:race`, `npm run test:race:browser`, and `npm run build` pass.
- Current visual gates remain green.
- At least one product-relevant normal runtime metric improves without a countervailing FPS, steering, camera, or readability regression.

Reject criteria:

- Actual FPS regresses in normal desktop states.
- Steering, camera, HUD, rival visibility, screenshot variance, or WebGL fallback regresses.
- Improvement exists only in draw calls or triangles while product FPS worsens.
- Visual quality is weakened before `RACE-001` target approval.

## Evidence To Attach After The Pass

| Evidence | Required detail |
| --- | --- |
| Before summary | Path, capture timestamp, normal desktop grouped values |
| After summary | Path, capture timestamp, same grouped values |
| Command results | `npm run test:race`, `npm run test:race:browser`, `npm run build` |
| Visual preservation | Desktop idle/driving/drift/boost/item/rival/finish screenshot paths |
| Telemetry preservation | Kart height, road-ahead coverage, route lookahead, camera clips, visible rivals |
| Performance delta | Actual FPS, frame work, render phase, renderer calls, triangles, programs, textures |
| Decision | Kept, rejected, or needs repeat run |

## Exit Criteria For Performance Blocker

Do not close the V1 performance blocker until:

- Normal desktop focused states meet the agreed local floor.
- Sustained normal-play capture supports the focused snapshot result.
- Existing camera, road, HUD, rival, drift, boost, item, reduced-motion, audio, and fallback gates still pass.
- Manual desktop performance notes are recorded in the `RACE-009` runbook or a dated completed QA artifact.
