# Race Performance Triage Plan

Status: current evidence and next implementation plan, not V1 performance sign-off
Date: 2026-05-23
Source PRD: `docs/comeback-city-kart-racer-prd.md`

## Current Evidence

- Latest browser summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-003-20260523T192252Z/race-browser-playtest-summary.json`
- Latest browser capture time: `2026-05-23T19:27:29.195Z`
- Browser race count: 24
- Focused visual/control/fallback checks: 28
- Latest validation command: `npm run test:race:browser`
- New telemetry fields: `framePhaseMs`, `framePhaseMaxMs`, `frameWorkMs`, `frameWorkMaxMs`, `player.progress`, `reducedMotion`, `telemetryIntervalMs`, `telemetryPublishCount`, `telemetrySkipCount`

## PRD Gates

| Gate | Target | Current evidence | Result |
| --- | --- | --- | --- |
| Desktop FPS | 55 target, 45 local minimum | Normal desktop focused samples average `41.54 actualFps`; sustained normal play averages `17.70 actualFps`. | Failing |
| Desktop frame work | Must fit inside the FPS gate; 55 FPS implies about `18.2ms` per frame | Normal desktop focused samples average `16.86ms frameWorkMs`, but FPS remains below floor and sustained frame elapsed averages `65.94ms`. | Failing |
| Mobile FPS | Modern phone stable 30+ FPS | Mobile focused samples are driving `33.8 actualFps` and idle `32.0 actualFps`, but this is headless/emulated snapshot evidence, not a manual device run. | Snapshot pass, not sign-off |
| Camera/visual gates | Kart size, road ahead, camera clip, HUD overlap | Browser visual/control gates passed in the latest run. | Proven for harness scenarios |

## Phase Findings

| Scenario group | Samples | Avg actual FPS | Avg frame work | Avg render phase | Avg visual-prime phase | Avg calls / triangles | Finding |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Normal desktop visual states | 9 | `42.0` | `19.6ms` | `15.3ms` | `0.1ms` | `717 / 69,781` | Browser gates remain green, but actual FPS remains below the local `45` FPS floor. |
| Manual desktop mechanic states | 14 | `34.7` | `38.4ms` | `11.8ms` | `19.9ms` | `592 / 59,886` | Mechanic evidence still splits one-time setup from runtime. |
| Opening sequence | 1 | `10.5` | `1.7ms` | `1.0ms` | `0.1ms` | `293 / 35,782` | The continuous start-to-branch evidence passes camera/route/rival gates, but the actual-FPS sample is not product performance sign-off. |
| Mobile focused states | 2 | `35.9` | `9.5ms` | `6.2ms` | `0.1ms` | `478 / 49,593` | Mobile snapshots clear 30 FPS in this run, but require sustained manual-device evidence. |

Normal desktop states in the latest focused grouping: idle, driving, drift, boost, item pickup, rival cluster, and finish line. The kept 2026-05-23 pass improved the average to `41.54 actualFps`, but the historical grouped table below remains useful as the pre-pass baseline.

Manual desktop mechanic states in this grouping: acceleration, braking, reverse, steering, turn approach, branch decision, collision, off-road, drift mechanics, boost-pad mechanics, item-box mechanics, and stuck recovery.

## Latest Focused Hotspots

| Scenario | actualFps | frameWorkMs | renderMs | visualPrimeMs | render calls | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Desktop acceleration | `28.2` | `32.70` | `9.11` | `18.14` | `594` | Setup `113.5ms`, runtime `0.01ms`; product runtime cost is not the primer cost. |
| Desktop stuck recovery | `33.7` | `40.95` | `11.19` | `20.93` | `781` | Setup `110.9ms`, runtime `0.01ms`; scenario setup dominates the averaged visual-prime field. |
| Desktop branch decision | `33.2` | `12.84` | `9.83` | `0.06` | `249` | Low calls and low frame work still produce weak actual FPS; frame pacing needs more investigation. |
| Desktop opening sequence | `10.5` | `1.73` | `0.96` | `0.06` | `293` | Passes new route/branch/rival/camera gates with `cameraAvoidanceCount: 11` and `cameraClipCount: 0`; frame pacing remains suspect. |
| Desktop driving | `41.7` | `18.90` | `14.79` | `0.06` | `706` | Still below the local floor and remains a product performance blocker. |
| Desktop idle | `41.2` | `18.99` | `14.98` | `0.06` | `782` | Static camera state is below the local floor in this run and misses the PRD `55` target. |
| Desktop rival cluster | `41.7` | `21.07` | `16.71` | `0.06` | `705` | Rival visibility remains proven, but this sample is still below the local floor. |
| Mobile driving | `34.6` | `8.45` | `5.77` | `0.06` | `472` | Snapshot meets 30 FPS, but needs sustained device confirmation. |

## Skyline Batching Pass

The latest implementation pass batches city/perimeter skyline blocks and roofs with `InstancedMesh` in `src/game/race/render/createRaceScenery.js`. `scripts/race-content-playtest.mjs` now asserts the presence of instanced scenery meshes and lowers the expected camera-collider count because far skyline batches are no longer camera colliders.

The first browser run with skyline batches registered as camera colliders reproduced a high-speed steering readiness timeout. Removing far skyline batches from camera-collider registration restored the browser evidence while preserving the visible skyline.

Result: normal desktop draw calls fell from `1,424` to `1,308` on average and manual mechanic draw calls fell from `1,229` to `1,144`, but normal desktop average actual FPS also moved from `43.6` to `40.4` in this capture. This is mixed progress, not performance sign-off.

## Clean Track Box Batching Pass

The latest implementation pass batches clean Comeback City road, shoulder, edge-line, center-dash, and curb boxes in small spatial `InstancedMesh` chunks in `src/game/race/render/createTrackMesh.js`. The local track probe dropped direct track children from `1,171` to `374`, with `104` instanced track batches and `901` box instances. The content test now asserts that clean-course track batching is present while non-clean tracks remain unbatched.

Browser gates stayed green, including high-speed steering, camera coverage, camera clip count, screenshot variance, HUD overlap, drift, boost, item, rival, mobile, audio, and WebGL fallback checks. Normal desktop draw calls fell from `1,308` to `806` on average, render phase moved from `20.3ms` to `16.2ms`, and frame work moved from `25.6ms` to `21.0ms`. Normal desktop average actual FPS improved from `40.4` to `43.7`, but still misses the local `45` FPS floor and the PRD `55` target.

## Rival LOD Pass

The latest implementation pass replaces full player-grade rival kart models with a lower-detail rival model in `src/game/race/render/createRaceVehicles.js`. Local probe evidence moved each rival from about `63` meshes and `3,440` triangles to `22` meshes and `472` triangles while keeping color accents, four wheels, mode toggles, and boost-flame hooks. `scripts/race-content-playtest.mjs` now asserts that lightweight rival contract.

Browser gates stayed green, including the normal-driving requirement for `3` visible rivals. Normal desktop draw calls fell from `806` to `715` on average, triangles from `75,990` to `69,532`, and render phase from `16.2ms` to `15.8ms`. Actual FPS remained noisy and moved from `43.7` to `41.6` in this capture, so this is render-cost progress but still not performance sign-off.

## Telemetry Cadence Pass

The latest implementation pass moves visual/HUD telemetry publication from a default `90ms` cadence to `140ms` and reports publication cadence counters in both `window.__raceVisualTelemetry.telemetry` and the compact browser summary. Content tests still assert explicit `90ms` cadence behavior when a runtime is created with that interval, and they assert the default `140ms` cadence separately.

Browser gates stayed green at `2026-05-20T16:35:47.203Z`, including drift, boost, item, rival, HUD overlap, mobile, audio mute, and WebGL fallback checks. Normal desktop visual states now average `42.1 actualFps`, `19.5ms frameWorkMs`, `15.2ms render`, `1.7ms telemetry`, and `717 / 69,746` calls/triangles. Mobile focused states average `33.3 actualFps`, `8.3ms frameWorkMs`, `5.7ms render`, and `500 / 51,050` calls/triangles. This is useful overhead reduction and better evidence, not V1 performance sign-off.

## HUD Minimap Memoization Pass

The latest implementation pass memoizes the static race minimap in `src/game/race/raceHud.jsx` so telemetry-driven HUD renders do not rebuild the route and branch geometry on every publication. Browser gates stayed green at `2026-05-20T16:51:57.168Z`, including the HUD overlap, camera, drift, boost, item, rival, mobile, audio mute, and WebGL fallback checks.

Normal desktop visual states averaged `43.6 actualFps`, `20.1ms frameWorkMs`, `15.6ms render`, and `720 / 70,008` calls/triangles. Mobile focused states averaged `33.4 actualFps`, `8.9ms frameWorkMs`, `6.5ms render`, and `504 / 51,506` calls/triangles. This is a low-risk HUD cleanup and preserves gates, but it is not V1 performance sign-off.

## Visual Prime Setup Split

The latest implementation pass keeps the existing `visualPrime` timing field and adds `visualPrimeSetup` and `visualPrimeRuntime` phase keys for manual visual scenarios. The setup key is recorded only on the first scenario-prime frame; the runtime key is recorded on later frames. This separates one-time scenario placement from the actual mechanic-state runtime without skipping setup or weakening the physics/camera assertions.

Browser gates stayed green at `2026-05-20T17:00:04.906Z`. Manual desktop mechanic states averaged `21.4ms visualPrime`, but the split shows that value is setup-tainted: `visualPrimeSetup` averaged `108.0ms`, while `visualPrimeRuntime` averaged `0.0ms`. Normal desktop visual states averaged `42.6 actualFps`, `20.0ms frameWorkMs`, `15.3ms render`, and `716 / 69,596` calls/triangles. This completes the evidence split requested by `RACE-PERF-003`; it does not solve the product FPS blocker.

## Rejected Decorative Scenery Batching Retest

A temporary retest batched street lamps, plaza lamps, water ripples, mountains, and cloud puffs in `src/game/race/render/createRaceScenery.js`. The browser harness passed at `2026-05-20T17:10:50.969Z`, but the result did not improve the product FPS gate: normal desktop draw calls fell to `670` on average while normal desktop actual FPS regressed to `41.4`, triangles rose to `71,220`, and renderer programs rose to `7`.

The change was removed and the browser summary was regenerated at `2026-05-20T17:16:15.156Z`. The retest is useful evidence that broad decorative instancing can hurt culling/program pressure even when draw calls fall.

## Rejected Cumulative Steady-FPS Telemetry Retest

A temporary retest added cumulative `steadyActualFps` fields after a one-second warmup. The browser harness passed at `2026-05-20T17:24:12.457Z`, but the metric was misleading because it folded headless/browser `requestAnimationFrame` gaps into a single cumulative number. Representative summaries reported desktop idle `steadyActualFps: 7.9` and desktop driving `steadyActualFps: 8.5` even though the existing phase timings and visual gates did not show a matching runtime collapse.

The fields were removed and the then-current browser summary was regenerated at `2026-05-20T17:29:07.549Z`. Keep using `actualFps`, `frameElapsedMs`, `frameBudgetMissCount`, and phase timings until a better sustained-runtime measurement is designed and validated.

## Rejected HUD Transition Scheduling Retest

A temporary retest wrapped HUD telemetry state updates in React `startTransition`. The browser harness passed, but normal desktop actual FPS regressed to `38.8` on average with weak drift Tier 1 and finish-line samples. The transition scheduling change was removed; only static minimap memoization remains.

## Rejected Desktop Render-Scale Retest

A temporary retest lowered `RACE_RENDER_SCALE.desktop` from `0.92` to `0.88`. The browser harness passed, but actual-FPS evidence was mixed and did not justify the visual-resolution loss: representative normal states included idle `41.5`, drift `39.7`, boost `42.0`, item pickup `42.0`, and finish line `41.9`. The desktop render scale was restored to `0.92`.

## Rejected Clean Track Batch-Size Retest

A temporary retest increased `CLEAN_TRACK_BOX_BATCH_SEGMENTS` from `6` to `8` in `src/game/race/render/createTrackMesh.js`. The browser harness passed at `2026-05-20T18:12:39.395Z`, and normal desktop draw calls fell from about `717` to `685`, but product FPS moved the wrong way: normal desktop actual FPS averaged `38.6`, with desktop idle at `32.1` and item pickup at `23.4`.

The change was reverted to `6`, `npm run test:race` passed, and the browser summary was regenerated at `2026-05-20T18:16:31.541Z`. The final post-revert run passed 24 races and 28 focused visual/control/fallback checks. Treat the batch-size retest as evidence that draw-call reduction alone is not enough when larger chunks weaken culling or frame pacing.

## Next Performance Tickets

Detailed next-pass sequencing for `RACE-PERF-002` now lives in `docs/race-performance-next-pass-plan.md`.

### RACE-PERF-001: Keep Phase Timing In PR Evidence

Objective: Preserve phase-level evidence so performance work can be judged by where frame time actually went.

Implementation status:

- `window.__raceVisualTelemetry` includes `framePhaseMs`, `framePhaseMaxMs`, `frameWorkMs`, and `frameWorkMaxMs`.
- Browser summaries include those fields, including `visualPrimeSetup` and `visualPrimeRuntime` when manual scenario setup applies.
- Content tests assert phase timing updates and telemetry publication.

Acceptance:

- `npm run test:race` passes.
- `npm run test:race:browser` writes phase timing fields for every focused WebGL visual check.
- PR evidence reports top frame phases for any performance claim.

### RACE-PERF-002: Reduce Normal-Play Render Cost

Objective: Bring normal desktop visual states above the PRD local minimum before attempting V1 performance sign-off.

Evidence target for the next pass:

- Desktop driving, idle, drift, boost, item pickup, rival cluster, and finish line all report `actualFps >= 45`.
- Normal desktop average `frameWorkMs <= 22ms`.
- Normal desktop average render phase moves from about `19.8ms` toward `14ms` without lowering kart size, road-ahead coverage, rival visibility, or screenshot variance.
- Browser visual gates still pass.

Candidate work, to validate one change at a time:

- Reduce authored mesh count in normal camera view while preserving current culling behavior.
- Add LOD or distance-based omission for skyline, repeated signs, rails, and far props.
- Batch repeated static props only where the prior high-speed steering gate remains stable.
- Keep rejected global track batching, resize-driven runtime changes, shoulder-underlay batching, and antialias-disable attempts out unless a new test proves the earlier failure mode is gone.

Acceptance commands:

```sh
npm run test:race
npm run test:race:browser
npm run build
```

### RACE-PERF-003: Separate Playtest Setup Cost From Product Runtime Cost

Objective: Stop focused mechanic scenario setup from being misread as normal game performance.

Evidence target for the next pass:

- Mechanic scenarios continue to prove physics/camera gates.
- `visualPrimeSetup` and `visualPrimeRuntime` are explicitly reported so one-time scenario setup is not mistaken for product runtime cost.
- Performance sign-off uses normal runtime samples plus sustained manual play, not only forced mechanic snapshots.

Implementation status:

- Browser telemetry now reports `visualPrimeSetup` and `visualPrimeRuntime` phase keys for manual visual scenarios.
- Latest manual mechanic states show setup around `108.0ms` and runtime around `0.0ms`, proving the forced-primer cost is separate from ordinary race runtime.

Candidate work:

- Avoid re-priming stable visual scenarios every frame when player/scenario state has already been placed.
- Add a per-scenario `primed` flag or command id so expensive setup only runs on scenario entry or reset.
- Keep the existing mechanic assertions; do not hide failed physics/camera behavior by skipping scenario setup before the target state is reached.

### RACE-PERF-004: Add A Real Performance Gate After Optimization

Objective: Convert performance evidence into a hard check once the normal-play samples are above the minimum.

Acceptance:

- Browser summary fails if normal desktop visual states are below the agreed local FPS floor.
- Browser summary fails if camera clipping, kart size, road coverage, HUD overlap, or visible rivals regress.
- Mobile remains reported separately until a target device and sustained-run threshold are confirmed.

### RACE-PERF-005: Manual Mobile And Desktop Performance Pass

Objective: Provide the PRD-required non-automated performance evidence.

Acceptance:

- Manual desktop keyboard run records FPS, camera, drift, item, collision, and finish notes.
- Manual mobile/touch run records sustained FPS, touch-control visibility, kart visibility, and first-lap completion.
- Results are recorded in `docs/race-manual-qa-rubric.md` or a dated completed rubric artifact.

## Current Recommendation

Continue `RACE-PERF-002` before more broad visual polish, but stop treating draw calls alone as sufficient. Track batching, rival LOD, telemetry cadence, HUD minimap memoization, and the visual-prime setup split improved the evidence quality while actual FPS remains below gate and noisy. The rejected decorative batching, cumulative steady-FPS, scenery frustum-culling, and track-surface material retests reinforce that the next pass must improve product-facing actual FPS while preserving the default browser gate, not only renderer-work counters. Treat `RACE-PERF-003` as implemented for evidence separation, with manual play still required for sign-off.
