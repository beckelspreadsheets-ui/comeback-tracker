# Race Production Readiness Checkpoint - 2026-05-23

Status: local evidence checkpoint, not production sign-off
Plan: `docs/comeback-city-kart-racer-production-readiness-plan.md`
Ledger: `.agent/runs/kart-racer-production-readiness/implementation-notes.html`
Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/baseline-20260523T180505Z`
Latest performance evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z`
Latest kept production-runtime hardening evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z`
Latest rejected performance evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-040-race-ranking-allocation-20260524T184127Z`
Latest race-disable evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/race-disable-001-20260523T200640Z`
Latest API/data evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z`
Latest core tracker evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/core-tracker-001-20260523T204431Z`
Latest local cross-browser smoke evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/cross-browser-001-20260524T121434Z`
Latest local device-matrix smoke evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/device-matrix-001-20260524T122649Z`
Latest local deployed-header smoke evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/deployed-headers-001-20260524T123726Z`
Latest local CI release automation evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/ci-release-automation-001-20260524T124743Z`
Latest header/PWA/CSP evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/csp-headers-001-20260523T233058Z`
Latest PWA update evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/pwa-update-001-20260523T234355Z`
Latest lifecycle/audio evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/lifecycle-audio-001-20260523T210212Z`
Latest WebGL context-loss evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z`
Latest route split / bundle / lab evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z`
Latest release operations evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/release-ops-001-20260523T223417Z`
Latest dedicated release smoke evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z`
Latest release artifact safety evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z`
Latest production playtest-hook behavior evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z`
Latest accessibility smoke evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z`
Latest production dependency audit evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/security-prod-audit-001-20260524T012143Z`
Latest local RC checklist evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/rc-local-checklist-001-20260524T013026Z`
Latest local rollback drill evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z`
Latest local monitoring/support readiness evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/monitoring-support-001-20260524T025102Z`
Latest release policy/decision audit evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/release-policy-audit-002-20260524T192220Z`
Latest P0/P1 production gate audit evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/release-policy-audit-002-20260524T192220Z`
Latest manual QA prep evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/manual-qa-prep-001-20260524T093705Z`

## Summary

This checkpoint makes owner-independent production-readiness progress:

- Fixed the local visual reference gate for the real mobile race HUD.
- Applied non-forced `npm audit fix` updates, removing the previous high-severity audit findings.
- Captured fresh local build, race, hub, visual, and audit evidence.
- Added sustained normal-play capture and setup-time scene budget telemetry for `RACE-PERF-002A/B`.
- Kept measured performance progress from repeated lamp instancing and boost-filter cleanup.
- Kept mild race camera/fog far-range progress from `620` to `580`; paired candidate evidence improved focused, desktop all-scenario, and sustained actual-FPS aggregates versus its fresh baseline while preserving browser visual/control/fallback gates.
- Rejected road-sign instancing candidates after browser evidence failed the performance keep criteria; restored prior sign meshes and re-proved race/browser/hub/build checks.
- Rejected far perimeter-window material consolidation, far perimeter-window density reduction, static scenery frustum-culling, track-surface basic-material, rival LOD over-reduction, far perimeter skyline density, default telemetry cadence, HUD backdrop-blur removal, renderer stencil-buffer, pickup/hazard geometry, collision effective-radius precompute, renderer tone-mapping, binary `pointAt` lookup, clean-track cap instancing, aggressive race camera/fog far-range to `520`, WebGL antialias disable, distant mountain/snow instancing, flat ground-plane segment reduction, moderate race camera/fog far-range to `560`, chase-camera vector scratch cleanup, desktop render-scale reduction, static matrix-world update locking, world-collision broadphase, scenery material-cache, road-guidance velocity, vehicle-mode visibility-cache, rival-route allocation, player-frame vector scratch, telemetry projection scratch, controls allocation cleanup, telemetry sample-buffer, viewport-fit dirty, and race-ranking allocation candidates after browser evidence failed the performance keep criteria, required browser gate, or release-plan visual-target constraint; restored the prior rendering behavior and re-proved race/browser/build/syntax checks.
- Added and locally proved a build-time race-disable route guard and hidden-entry recovery path.
- Fixed sync Function schema compatibility with the current app state and locally proved sync/D1/FatSecret safe-success and safe-error paths, including authenticated same-schema D1 backup restore with safety-backup creation.
- Extended `npm run test:api:data` with URL-mode safe-status/read-only API probes for supplied preview/prod URLs. The harness is proven against a deployment-shaped local mock with mock JWT and mock FatSecret query, but no real preview/prod URL, Access JWT, live FatSecret approval, binding proof, or production API scope decision is supplied.
- Added and locally proved a dedicated core tracker smoke covering home, food entry, scanner surface, settings persistence, sync states, export/import, and return navigation.
- Added and locally proved a built-preview cross-browser smoke through `npm run test:cross-browser`, covering route load, `/#race` WebGL render, keyboard acceleration, screenshots, and race-exit recovery in Playwright Chromium, Playwright Firefox, Playwright WebKit, and local Chrome. Microsoft Edge is not installed and actual Safari is not automated, so the cross-browser/device gate remains partial.
- Added and locally proved a built-preview device-matrix smoke through `npm run test:device:matrix`, covering local desktop viewport keyboard acceleration and emulated-phone touch acceleration with WebGL race screenshots. Physical laptop/phone human playthrough and release-owner sign-off remain missing.
- Added and locally proved a URL-capable deployed-header smoke through `npm run test:headers:deployed`, covering the response-header comparator and local Cloudflare-style `_headers` simulation for CSP, Permissions-Policy, security headers, service-worker cache headers, manifest cache headers, and hashed asset cache headers. Preview/production URL response-header evidence remains missing.
- Added a race production gate GitHub Actions workflow and locally proved its structure through `npm run test:ci:release`, covering triggers, Node setup, Playwright install, and the expected release-gate command list. Actual GitHub Actions run URL, release-owner CI/manual policy, owner-accepted manual checklist, and dirty-worktree deploy decision remain missing.
- Added local `Content-Security-Policy` to `_headers` and locally proved built-app header/PWA/CSP smoke for `_headers`, delivered CSP, cache headers, manifest metadata, service worker install/control, and offline app shell reload.
- Added and locally proved installed-app PWA update smoke: a versioned local built app updates its service worker from v1 to v2, fires `updatefound` and `controllerchange`, serves the v2 shell online, and keeps the v2 shell available offline.
- Added explicit race lifecycle/audio handling and locally proved pagehide/pageshow, visibility, input-clear, blocked Web Audio resume, and mute-toggle behavior without breaking race/browser/hub/visual gates.
- Added and locally proved built-preview WebGL context-loss handling: real `WEBGL_lose_context` switches `/#race` to the Canvas2D fallback, renders nonblank fallback output, and exits back to the world home with `#race` cleared.
- Added and locally proved built-artifact bundle/asset size reporting through `npm run test:bundle`; latest report records total built size `7.455 MiB`, gzip total `4043.13 KiB`, JavaScript total `4700.79 KiB`, and largest file `assets/index-COrftTm9.js` at `3736.62 KiB`.
- Added and locally proved `npm run test:lab` Playwright lab-readiness evidence for home/race paint, CLS, long tasks, basic accessibility DOM signals, browser error/request failures, manifest, and service-worker state. This records Web Vitals/Lighthouse-equivalent local evidence only; no release-owner target or exception is supplied.
- Added route-level lazy loading for heavy app routes and replaced the race garage's visual-reference 3D sheet with a lightweight local sheet so the built entry chunk is split from race/world/visual-reference modules. Latest report records entry chunk `56.13 KiB`, race chunk `252.27 KiB`, largest visual-reference chunk `3213.89 KiB`, total built size `7640.98 KiB`, gzip total `4052.19 KiB`, and JavaScript total `4706.25 KiB`. This is not bundle-budget acceptance because total and gzip size increased slightly and no owner budget target is supplied.
- Added release operations templates for local release checklist, preview/prod smoke, rollback, monitoring/support triage, draft release notes, and post-launch reporting. These are templates only, not executed deploy evidence or sign-off.
- Added and locally proved a URL-capable release smoke script for local built preview, covering home/food/settings navigation, `/#race`, nonblank canvas, desktop keyboard acceleration, mobile touch acceleration, manifest fetch, service-worker fetch, and production playtest-query disable behavior without shipped diagnostic telemetry globals. This is not preview/prod URL evidence or sign-off.
- Added and locally proved release artifact safety smoke for built `dist`, covering absent source map files, absent `sourceMappingURL`, absent standalone playtest/debug files, absent scanned secret env names or known test secret values, absent runtime playtest automation strings, absent diagnostic telemetry globals, and absent visual-review route strings in the standard production build.
- Added and locally proved standard production playtest-hook behavior: `raceAutoplay`/`raceNoFinish` query automation is disabled in production builds unless `VITE_RACE_PLAYTEST_HOOKS=true`; local built-preview release smoke proves the query creates no `__racePlaytest*` globals, creates no diagnostic telemetry globals/samples, and does not move the kart. Dev `race-playtest.html` automation still passes the full browser harness.
- Added and locally proved built-preview accessibility smoke for home and `/#race`, covering visible named controls, duplicate IDs, visible image alt text, keyboard focus visibility, keyboard mute-toggle operation, reduced-motion propagation through standard DOM race state, desktop hiding of the mobile-only Go control, mobile Go touch acceleration, and representative contrast samples. Also fixed the CSS ordering issue that had allowed the mobile-only Go control to remain visible/focusable on desktop. Target-browser/device manual accessibility sign-off is still missing.
- Added and locally proved production dependency audit smoke through `npm run test:security:prod`: `npm audit --omit=dev` reports zero production dependency vulnerabilities. Full `npm audit` still exits `1` with three moderate Vite/esbuild/vite-plugin-pwa dev/build-tool advisories requiring a semver-major upgrade decision or dated release-owner exception.
- Captured a fresh local RC checklist evidence set for branch/commit/status, `npm run build`, `npm run test:race`, `npm run test:race:browser`, `npm run test:hub`, `npm run test:visual`, and `npm run test:security:prod`. The worktree is dirty, so production deploy policy and release-owner acceptance remain required.
- Added and locally proved rollback drill smoke through `npm run test:release:rollback`: a local built `dist` switched from current-candidate to known-good and loaded `/#race` as WebGL after rollback using DOM race state instead of diagnostic telemetry globals. This is not Cloudflare production rollback sign-off.
- Added and locally proved a production gate readiness audit through `npm run test:production:gates`: latest evidence records the P0/P1 hard-gate matrix as `r3-blocked-gates-remain`, with `2`/`21` P0 gates Proven, `2`/`14` P1 gates Proven, `11` DoD rows not Proven-like, `10` manual QA rows without a `4`/`5` score, and no broken local evidence links. The cross-browser, device-matrix, production-cache-header, and CI/release automation P1 gates are now Partial, not Proven. This is not owner, legal, release, QA, deployment, or monitoring sign-off.
- Added and locally proved manual QA capture prep through `npm run test:qa:capture`: it records built-preview `/#race` desktop idle/speed/drift screenshots, mobile Go-touch driving screenshot, a `10.96s` silent WebM clip candidate, runtime telemetry, and a prefilled result template. This is not human QA scoring or fresh-user review.

Production readiness remains blocked. Required owner/product/design/legal/release decisions are still not supplied, desktop FPS remains below the current PRD/local target, manual QA scores and fresh-user reviewer answer are missing, and executed preview/production/Cloudflare rollback/monitoring evidence does not exist.

## Final Local Command Results

| Command | Result | Evidence |
| --- | --- | --- |
| Branch/commit/status | Recorded; branch `main`, commit `9fb87c26bcdec19e8175f63a09e490f5400231aa`, dirty worktree | `.agent/runs/kart-racer-production-readiness/evidence/rc-local-checklist-001-20260524T013026Z/rc-local-checklist-001-summary.json` |
| `npm run build` | Pass with existing large-chunk warning | `.agent/runs/kart-racer-production-readiness/evidence/rc-local-checklist-001-20260524T013026Z/npm-run-build.log` |
| `npm run test:race` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/rc-local-checklist-001-20260524T013026Z/npm-run-test-race.log` |
| `npm run test:race:browser` | Pass; `24` browser races and `28` visual/control/fallback checks | `.agent/runs/kart-racer-production-readiness/evidence/rc-local-checklist-001-20260524T013026Z/npm-run-test-race-browser.log` |
| `npm run test:cross-browser` | Pass; Playwright Chromium, Playwright Firefox, Playwright WebKit, and local Chrome route/race/exit smokes pass; Edge unavailable and actual Safari not automated | `.agent/runs/kart-racer-production-readiness/evidence/cross-browser-001-20260524T121434Z/cross-browser-smoke-summary.json` |
| `npm run test:device:matrix` | Pass; local desktop viewport keyboard acceleration and emulated-phone touch acceleration pass with WebGL screenshots; no physical device human playthrough | `.agent/runs/kart-racer-production-readiness/evidence/device-matrix-001-20260524T122649Z/device-matrix-smoke-summary.json` |
| `npm run test:headers:deployed` | Pass locally; Cloudflare-style `_headers` simulation matches CSP/security/cache policy; no preview/production URL response proof | `.agent/runs/kart-racer-production-readiness/evidence/deployed-headers-001-20260524T123726Z/deployed-headers-smoke-summary.json` |
| `npm run test:ci:release` | Pass locally; workflow structure, triggers, setup, Playwright install, and release-gate command list are recorded; no actual GitHub Actions run URL or owner policy | `.agent/runs/kart-racer-production-readiness/evidence/ci-release-automation-001-20260524T124743Z/ci-release-automation-summary.json` |
| `npm run test:hub` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/rc-local-checklist-001-20260524T013026Z/npm-run-test-hub.log` |
| `npm run test:visual` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/rc-local-checklist-001-20260524T013026Z/npm-run-test-visual.log` |
| `npm run test:security:prod` | Pass; `npm audit --omit=dev` reports zero production vulnerabilities. Full audit artifacts still record three moderate dev/build-tool advisories. | `.agent/runs/kart-racer-production-readiness/evidence/rc-local-checklist-001-20260524T013026Z/security-production-audit-summary.json` |
| `npm run test:release:artifacts` | Pass; standard production artifact records no source maps, sourceMappingURL, standalone debug/playtest files, scanned secret leaks, runtime playtest automation strings, diagnostic telemetry globals, or visual-review route strings | `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-release-artifact-safety-report.json` |
| `npm run test:release:smoke` | Pass; local built preview proves core navigation, `/#race`, desktop/mobile acceleration, manifest/service-worker fetches, and no production playtest/diagnostic telemetry globals | `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-release-smoke-summary.json` |
| `npm run test:accessibility` | Pass; local built preview proves accessibility smoke using standard DOM race state for reduced-motion/speed checks | `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/accessibility-smoke-summary.json` |
| `npm run test:webgl` | Pass; local built preview context-loss fallback remains proven without production diagnostic telemetry globals | `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/webgl-context-smoke-summary.json` |
| `npm run test:release:rollback` | Pass; local current-candidate -> known-good rollback switch and known-good `/#race` WebGL smoke | `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/release-rollback-smoke-summary.json` |
| `npm run test:production:gates` | Pass structurally; records `r3-blocked-gates-remain`, `2`/`21` P0 gates Proven, `2`/`14` P1 gates Proven, cross-browser as Partial, device matrix as Partial, production cache headers as Partial, and CI/release automation as Partial | `.agent/runs/kart-racer-production-readiness/evidence/release-policy-audit-002-20260524T192220Z/production-gate-readiness-summary.json` |
| `npm run test:qa:capture` | Pass; local built-preview screenshots, silent clip candidate, telemetry, and prep template recorded; no human scores | `.agent/runs/kart-racer-production-readiness/evidence/manual-qa-prep-001-20260524T093705Z/manual-qa-capture-summary.json` |
| `npm run test:api:data` | Pass; local mocked sync/D1/FatSecret proof remains intact and URL-mode API smoke harness is proven against a deployment-shaped local mock | `.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z/api-data-smoke-summary.json`; `.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z/url-mode-mock/api-data-smoke-summary.json` |
| Full `npm audit` | Fails with three moderate Vite/esbuild/vite-plugin-pwa dev/build-tool advisories | `.agent/runs/kart-racer-production-readiness/evidence/rc-local-checklist-001-20260524T013026Z/npm-audit-full.json` |

Rollup/Vite build still reports the existing large-chunk warning; this is not resolved in this checkpoint.

Status: local RC checklist command evidence is current, with gate status `local-rc-build-race-browser-hub-visual-pass-not-release-signoff`, local rollback drill evidence is current with gate status `local-rollback-drill-proven-not-production-rollback-signoff`, and local CI workflow structure is current with gate status `ci-release-workflow-structured-not-run-or-owner-approved`. This is not release sign-off because the worktree is dirty and release-owner dirty deploy policy, actual GitHub Actions run or owner-accepted manual checklist, preview/prod URL smoke, deployed headers, Cloudflare rollback, monitoring/support, and sign-offs remain missing.

## Latest Performance Evidence

Latest performance checkpoint:

- Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z`
- Summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z/perf-023-kept-far-range-summary.json`
- Candidate metrics: `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z/perf-023-candidate-metrics.json`
- Fresh before browser summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z/race-browser-playtest-summary-before.json`
- Candidate browser summaries: `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z/race-browser-playtest-summary.json`, `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z/race-browser-playtest-summary-repeat.json`

| Command | Result | Evidence |
| --- | --- | --- |
| Fresh before `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks | `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z/npm-run-test-race-browser-before.log` |
| Candidate syntax checks | Pass for `createRaceScene.js` and `race-content-playtest.mjs` | `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z/node-check-create-race-scene.log`, `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z/node-check-race-content-playtest.log` |
| `npm run test:race` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z/npm-run-test-race.log` |
| Candidate `npm run test:race:browser` | Two passes; each with `24` race completions and `28` visual/control/fallback checks | `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z/npm-run-test-race-browser.log`, `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z/npm-run-test-race-browser-repeat.log` |
| `npm run build` | Pass with existing large-chunk warning | `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z/npm-run-build.log` |
| `npm run test:visual` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z/npm-run-test-visual.log` |
| Exact source / diff checks | Pass | `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z/far-range-candidate-identifiers.log`, `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z/git-diff-check.log` |

Mild far-range kept-change details:

- Candidate changed only the race camera far plane and fog far distance from `620` to `580`; the existing fog near distance remained unchanged.
- Fresh before baseline: focused desktop average `35.91 actualFps`, desktop all-scenario average `33.75 actualFps`, sustained average `17.50 actualFps`.
- Candidate two-run average: focused desktop average `36.72 actualFps`, desktop all-scenario average `34.91 actualFps`, sustained average `17.79 actualFps`.
- Delta: focused desktop `+0.81 actualFps`, desktop all-scenario `+1.16 actualFps`, sustained `+0.29 actualFps`, focused render calls `-7.29`, focused triangles `-463.42`.

Decision: keep the mild `580` far-range reduction as measured progress. Do not close the desktop performance blocker; the kept evidence remains below the local `45` floor and PRD `55` target.

Subsequent rejected follow-up:

- Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-004-20260523T195759Z`
- Race-only material-cost experiment was reverted after the browser harness timed out on a steering-readiness visual snapshot.
- Static collision-clearance telemetry cache was reverted after a repeat default `npm run test:race:browser` pass showed normal desktop focused actual-FPS average regressed to `37.16`, even though frame-work and telemetry phase costs improved.
- Additional rejected evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-005-20260523T212003Z`
- Global road-sign instancing was reverted after a browser pass showed focused draw calls improved to `641.71`, but focused actual-FPS regressed to `39.57` and sustained actual-FPS regressed to `16.25`.
- Per-sign road-sign instancing was reverted after the default browser harness timed out during visual readiness.
- Restored validation after the sign-batching rejection passed `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run test:hub`, `npm run build`, `node --check src/game/race/render/createRaceScenery.js`, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-005-20260523T212003Z/perf-005-rejected-sign-batching-summary.json`.
- Latest rejected material-consolidation evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-006-20260523T221238Z`
- Perimeter-window material consolidation reduced scene/scenery material count by `1` and improved candidate average render phase versus the WebGL checkpoint, but its two-run average remained below the then-kept `perf-003` baseline for sustained actual FPS (`17.61` versus `17.70`), desktop average actual FPS (`34.53` versus `37.29`), and focused desktop actual FPS (`37.70` versus `38.36`).
- Restored validation after the material-consolidation rejection passed `npm run test:race`, `npm run build`, `node --check src/game/race/render/createRaceScenery.js`, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-006-20260523T221238Z/perf-006-rejected-perimeter-window-material-summary.json`.
- Latest rejected density-reduction evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-007-20260524T004200Z`
- Perimeter-window density reduction lowered scenery triangles by `2,112` and improved sustained actual FPS versus the current-code checkpoint, but its two-run average regressed desktop average actual FPS versus current code and still trailed `perf-003` for desktop average and focused desktop actual FPS.
- Restored validation after the density-reduction rejection passed `npm run test:race`, `npm run build`, `node --check src/game/race/render/createRaceScenery.js`, `git diff --check`, and JSON summary parsing; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-007-20260524T004200Z/perf-007-rejected-perimeter-window-density-summary.json`.
- Latest rejected static scenery frustum-culling evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-008-20260524T014921Z`
- Static scenery instanced-mesh frustum culling passed `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks and reduced desktop average frame work/render/calls/triangles versus the current RC checkpoint, but sustained actual FPS regressed to `17.47`, desktop average actual FPS regressed to `33.14`, and the candidate still trailed `perf-003` for sustained, desktop average, and focused desktop actual FPS.
- Restored validation after the frustum-culling rejection passed `npm run test:race`, `npm run build`, `node --check src/game/race/render/createRaceScenery.js`, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-008-20260524T014921Z/perf-008-rejected-scenery-frustum-summary.json`.
- Latest rejected track-surface basic-material evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-009-20260524T020005Z`
- Track-surface `MeshBasicMaterial` conversion passed syntax and `npm run test:race`, but two default `npm run test:race:browser` attempts timed out before producing a browser summary, so no FPS evidence was promoted.
- Restored validation after the track-material rejection passed `npm run test:race`, `npm run build`, `node --check src/game/race/render/createTrackMesh.js`, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-009-20260524T020005Z/perf-009-rejected-track-basic-material-summary.json`.
- Latest rejected rival LOD over-reduction evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-010-20260524T022849Z`
- Rival LOD over-reduction passed syntax and `npm run test:race` after preserving the two-flame contract, but the default `npm run test:race:browser` attempt timed out before producing a browser summary, so no FPS evidence was promoted.
- Restored validation after the rival LOD rejection passed `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, `node --check src/game/race/render/createRaceVehicles.js`, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-010-20260524T022849Z/perf-010-rejected-rival-lod-summary.json`.
- Latest rejected far perimeter skyline density evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-011-20260524T025908Z`
- Far perimeter skyline density reduction passed `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks, reduced scene/scenery triangles by `1,704`, and improved sustained actual FPS by `0.24`, but focused desktop actual FPS regressed by `3.43` versus the then-kept `perf-003` comparison set.
- Restored validation after the perimeter skyline rejection passed `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, `node --check src/game/race/render/createRaceScenery.js`, summary JSON parsing, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-011-20260524T025908Z/perf-011-rejected-perimeter-skyline-density-summary.json`.
- Latest rejected telemetry cadence evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-012-20260524T032926Z`
- Default telemetry cadence increase from `140ms` to `220ms` passed syntax and `npm run test:race`, but the default `npm run test:race:browser` attempt timed out on `page.waitForFunction` before producing a browser summary.
- Restored validation after the telemetry cadence rejection passed `node --check src/game/race/raceTelemetryRuntime.js`, `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), and `npm run build`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-012-20260524T032926Z/perf-012-rejected-telemetry-cadence-summary.json`.
- Latest rejected HUD backdrop evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-013-20260524T034702Z`
- Race HUD backdrop-blur removal passed `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks and improved focused frame-work/render/call/triangle metrics, but focused desktop actual FPS regressed by `4.60` versus the before baseline while sustained actual FPS improved only `0.13`.
- Restored validation after the HUD backdrop rejection passed `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), and `npm run build`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-013-20260524T034702Z/perf-013-rejected-hud-backdrop-summary.json`.
- Latest rejected renderer stencil evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-014-20260524T040324Z`
- Race renderer `stencil: false` passed `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks and improved focused frame-work/render/call/triangle metrics, but focused desktop actual FPS regressed by `4.70` and focused minimum actual FPS regressed by `15.70` versus the before baseline while sustained actual FPS improved only `0.26`.
- Restored validation after the renderer stencil rejection passed `node --check src/game/race/render/createRaceScene.js`, `npm run test:race`, repeat `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks) after one restored readiness timeout, and `npm run build`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-014-20260524T040324Z/perf-014-rejected-renderer-stencil-summary.json`.

- Latest rejected pickup/hazard geometry evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-015-20260524T042136Z`
- Small pickup/hazard geometry tessellation reduction passed `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks and reduced pickup triangles from `8,384` to `4,112`, but desktop average actual FPS regressed by `2.34` and focused desktop actual FPS regressed by `2.47` versus the current-code baseline while sustained actual FPS improved by `0.94`.
- Restored validation after the pickup/hazard geometry rejection passed `node --check src/game/race/render/createRacePickups.js`, `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), and `npm run build`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-015-20260524T042136Z/perf-015-rejected-pickup-geometry-summary.json`.

- Latest rejected collision effective-radius cache evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-016-20260524T044449Z`
- Static collision-circle effective-radius precompute passed `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks and improved focused telemetry cost by `0.66ms`, but focused desktop actual FPS regressed by `2.70` versus the current-code baseline while sustained actual FPS improved by `0.80`.
- Restored validation after the collision effective-radius cache rejection passed syntax checks for `kartPhysics.js`, `createRaceScenery.js`, `raceTelemetry.js`, and `race-content-playtest.mjs`, plus `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), and `npm run build`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-016-20260524T044449Z/perf-016-rejected-collision-cache-summary.json`.

- Latest rejected renderer tone-mapping evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-017-20260524T052300Z`
- Race renderer `NoToneMapping` passed `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks and improved focused render cost by `2.44ms`, but focused desktop actual FPS regressed by `11.95` and desktop average actual FPS regressed by `4.38` versus the current-code baseline while sustained actual FPS improved by `1.25`.
- Restored validation after the renderer tone-mapping rejection passed syntax checks for `createRaceScene.js` and `race-content-playtest.mjs`, plus `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), and `npm run build`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-017-20260524T052300Z/perf-017-rejected-tone-mapping-summary.json`.

- Latest rejected binary `pointAt` lookup evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-018-20260524T052841Z`
- Binary `compileTrack3D().pointAt()` segment lookup passed `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks and improved sustained actual FPS by `0.65`, but focused desktop actual FPS regressed by `2.93` and desktop average actual FPS regressed by `0.08` versus the current-code baseline.
- Restored validation after the binary `pointAt` lookup rejection passed syntax checks for `trackGeometry.js` and `race-content-playtest.mjs`, plus `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), and `npm run build`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-018-20260524T052841Z/perf-018-rejected-point-at-summary.json`.
- Latest rejected clean-track cap instancing evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-019-20260524T055015Z`
- Global clean-track cap instancing passed `npm run test:race:browser` with `24` races and `28` visual/control/fallback checks and improved focused desktop average FPS by `2.89`, but sustained actual FPS regressed by `0.25` and desktop average actual FPS regressed by `1.70`; chunked cap instancing also passed the browser harness and improved sustained actual FPS by `0.36`, but focused desktop average FPS regressed by `3.65` and desktop average actual FPS regressed by `4.00`.
- Restored validation after the cap-instancing rejection passed syntax for `createTrackMesh.js`, `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-019-20260524T055015Z/perf-019-rejected-track-cap-instancing-summary.json`.
- Latest rejected race camera/fog far-range evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-020-20260524T061703Z`
- Lowering the race camera far plane and fog far range to `520` passed syntax and `npm run test:race`, but the default `npm run test:race:browser` gate timed out before producing a complete summary, so no performance evidence was promoted.
- Restored validation after the far-range rejection passed syntax for `createRaceScene.js` and `race-content-playtest.mjs`, `npm run test:race`, repeat `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, exact source checks, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-020-20260524T061703Z/perf-020-rejected-far-range-summary.json`.
- Latest rejected WebGL antialias evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-021-20260524T063735Z`
- Disabling WebGL antialiasing changed only `RACE_RENDERER_OPTIONS.antialias` from `true` to `false`, passed syntax and `npm run test:race`, but the default `npm run test:race:browser` gate timed out before producing a complete summary, so no performance evidence was promoted.
- Restored validation after the antialias rejection passed syntax for `createRaceScene.js` and `race-content-playtest.mjs`, `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, exact source checks, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-021-20260524T063735Z/perf-021-rejected-antialias-summary.json`.
- Latest rejected distant mountain/snow instancing evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-022-20260524T065539Z`
- Batching six distant mountain meshes and six snow caps into three instanced meshes passed syntax, `npm run test:race`, and `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), but desktop focused actual-FPS average regressed from `38.37` to `35.59` while sustained actual FPS improved only from `17.88` to `17.97`, so no performance evidence was promoted.
- Restored validation after the mountain-instancing rejection passed syntax for `createRaceScenery.js` and `race-content-playtest.mjs`, `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, exact source checks, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-022-20260524T065539Z/perf-022-rejected-mountain-instancing-summary.json`.
- Latest kept mild race camera/fog far-range evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z`
- The `580` far-range candidate passed syntax, `npm run test:race`, two `npm run test:race:browser` runs (`24` race completions, `28` visual/control/fallback checks each), `npm run build`, `npm run test:visual`, exact source checks, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z/perf-023-kept-far-range-summary.json`.
- `perf-023` is the latest kept current-code performance checkpoint. The performance gate remains open.
- Rejected flat ground-plane segment evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-024-20260524T075546Z`
- Reducing the flat race ground `PlaneGeometry` subdivisions from `24x24` to `1x1` passed syntax, `npm run test:race`, and one `npm run test:race:browser` run, with first-run FPS metrics improved versus a noisy fresh baseline, but the repeat browser run failed visual telemetry with `camera clip count 1 is not zero`; the candidate was reverted.
- Restored validation after the flat ground-plane rejection passed syntax for `createTrackMesh.js` and `race-content-playtest.mjs`, `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, exact source checks, JSON parsing, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-024-20260524T075546Z/perf-024-rejected-ground-plane-summary.json`.
- Latest rejected moderate far-range evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-025-20260524T082513Z`
- Lowering the race camera/fog far range from `580` to `560` passed syntax, `npm run test:race`, and `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), but desktop all-scenario actual FPS regressed by `0.40`, sustained actual FPS regressed by `0.27`, and focused frame work/render/calls/triangles worsened while focused actual FPS improved only `0.54`; the candidate was reverted.
- Restored validation after the moderate far-range rejection passed syntax for `createRaceScene.js` and `race-content-playtest.mjs`, `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, exact source checks, JSON parsing, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-025-20260524T082513Z/perf-025-rejected-moderate-far-range-summary.json`.
- Latest rejected chase-camera scratch evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-026-20260524T085441Z`
- Reusing scratch vectors in the chase-camera frame path and lazily creating the fallback route-lookahead target passed syntax and `npm run test:race`, but the default browser harness timed out on `page.waitForFunction` before producing a candidate summary; the candidate was reverted.
- Restored validation after the chase-camera scratch rejection passed syntax for `chaseCamera.js`, `raceCameraRuntime.js`, and `race-content-playtest.mjs`, `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, exact source checks, and JSON parsing; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-026-20260524T085441Z/perf-026-rejected-camera-scratch-summary.json`.
- Latest rejected desktop render-scale evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-027-20260524T101100Z`
- Lowering `RACE_RENDER_SCALE.desktop` from `0.92` to `0.88` passed syntax, `npm run test:race`, `npm run test:race:browser`, `npm run build`, `npm run test:visual`, and `npm run test:race:disable`; the candidate improved focused desktop actual FPS by `2.57` and sustained actual FPS by `1.36`, but desktop all-scenario actual FPS regressed by `0.25` and the change was a visual-resolution tradeoff before owner-approved visual target input.
- Restored validation after the render-scale rejection passed syntax for `createRaceScene.js` and `race-content-playtest.mjs`, `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, `npm run test:visual`, and `npm run test:race:disable`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-027-20260524T101100Z/perf-027-rejected-render-scale-summary.json`.
- Latest rejected static matrix-world evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-028-static-matrix-world-20260524T114346Z`
- Locking `matrixWorldAutoUpdate` for static track and non-animated scenery roots passed syntax, `npm run test:race`, and the first `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), improving focused desktop actual FPS by `0.78`, desktop all-scenario actual FPS by `2.65`, and sustained actual FPS by `0.06`, but the repeat browser run failed visual telemetry with `camera clip count 1 is not zero`; the candidate was reverted.
- Restored validation after the static matrix-world rejection passed syntax for `raceSceneRuntime.js`, `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, `npm run test:visual`, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-028-static-matrix-world-20260524T114346Z/perf-028-rejected-static-matrix-world-summary.json`.
- Rejected collision broadphase evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-029-collision-broadphase-20260524T130514Z`
- Skipping nearest-road world-collision work for collision circles too far away to collide passed syntax and `npm run test:race`, but the required browser gate failed visual telemetry with `camera clip count 1 is not zero` in `comeback-city-desktop-opening-sequence`; the candidate was reverted without promoting performance evidence.
- Restored validation after the collision broadphase rejection passed syntax for `kartPhysics.js` and `race-content-playtest.mjs`, `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, `npm run test:visual`, and exact source diff checks; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-029-collision-broadphase-20260524T130514Z/perf-029-rejected-collision-broadphase-summary.json`.
- Rejected scenery material-cache evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-030-scenery-material-cache-20260524T134250Z`
- Sharing identical static scenery `MeshStandardMaterial` instances passed syntax, `npm run test:race`, and `npm run test:race:browser`, and reduced scene/scenery material counts by `29`, but focused desktop actual FPS regressed by `3.60`, desktop all-scenario actual FPS regressed by `1.64`, and sustained actual FPS regressed by `0.08`; the candidate was reverted.
- Restored validation after the material-cache rejection passed exact source diff, syntax for `createRaceScenery.js`, `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, `npm run test:visual`, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-030-scenery-material-cache-20260524T134250Z/perf-030-rejected-scenery-material-cache-summary.json`.
- Rejected road-guidance velocity evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-031-road-guidance-velocity-20260524T141202Z`
- Removing transient road-guidance velocity target vector allocations passed syntax, `npm run test:race`, and `npm run test:race:browser`, and reduced focused frame-work by `0.46ms` and focused render by `0.24ms`, but focused desktop actual FPS regressed by `0.18`, desktop all-scenario actual FPS regressed by `0.23`, and sustained actual FPS regressed by `0.12`; the candidate was reverted.
- Restored validation after the road-guidance velocity rejection passed exact source diff, syntax for `kartPhysics.js`, `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, `npm run test:visual`, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-031-road-guidance-velocity-20260524T141202Z/perf-031-rejected-road-guidance-velocity-summary.json`.
- Rejected vehicle-mode cache evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-032-vehicle-mode-cache-20260524T144114Z`
- Caching repeated player/rival vehicle model `setMode` visibility writes passed syntax, `npm run test:race`, and `npm run test:race:browser`, and improved focused desktop actual FPS by `1.36` and desktop all-scenario actual FPS by `1.31`, but sustained actual FPS regressed by `0.78`; the candidate was reverted.
- Restored validation after the vehicle-mode cache rejection passed exact source diffs for `city3dAssets.js` and `createRaceVehicles.js`, syntax checks, `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, `npm run test:visual`, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-032-vehicle-mode-cache-20260524T144114Z/perf-032-rejected-vehicle-mode-cache-summary.json`.
- Rejected rival route allocation evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-033-rival-route-allocation-20260524T151111Z`
- Rival route allocation cleanup passed syntax, route-choice equivalence, `npm run test:race`, and `npm run test:race:browser` with `24` races and `28` checks. Focused desktop actual FPS improved by `0.51` and desktop all-scenario actual FPS improved by `2.18`, but sustained actual FPS regressed by `0.38` and sustained frame-work/render timings worsened, so the candidate was reverted.
- Restored validation after the rival route allocation rejection passed exact source diff for `raceRivals.js`, syntax, `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, `npm run test:visual`, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-033-rival-route-allocation-20260524T151111Z/perf-033-rejected-rival-route-allocation-summary.json`.
- Rejected player-frame vector scratch evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-034-player-frame-vector-scratch-20260524T154421Z`
- Player-frame vector scratch cleanup passed syntax, forward/right equivalence, `npm run test:race`, and `npm run test:race:browser` with `24` races and `28` checks. Focused frame-work/render/calls/triangles improved and desktop all-scenario actual FPS improved by `0.37`, but focused desktop actual FPS regressed by `2.49`, sustained actual FPS regressed by `0.07`, and sustained frame-work/render timings worsened, so the candidate was reverted.
- Restored validation after the player-frame vector scratch rejection passed exact source diff for `racePlayerFrame.js`, syntax, `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, `npm run test:visual`, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-034-player-frame-vector-scratch-20260524T154421Z/perf-034-rejected-player-frame-vector-scratch-summary.json`.
- Rejected telemetry projection scratch evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-035-telemetry-projection-scratch-20260524T161256Z`
- Telemetry projection scratch cleanup passed syntax, `npm run test:race`, and `npm run test:race:browser` with `24` races and `28` checks. Focused desktop actual FPS improved by `0.13` and focused frame-work/render timings dropped, but desktop all-scenario actual FPS regressed by `0.70`, sustained actual FPS regressed by `0.40`, and telemetry/render counters worsened, so the candidate was reverted.
- Restored validation after the telemetry projection scratch rejection passed exact source diff for `raceTelemetry.js`, syntax, `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, `npm run test:visual`, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-035-telemetry-projection-scratch-20260524T161256Z/perf-035-rejected-telemetry-projection-scratch-summary.json`.
- Rejected controls allocation evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-036-controls-allocation-20260524T164100Z`
- Controls allocation cleanup passed syntax and `npm run test:race`, but the required `npm run test:race:browser` gate failed `comeback-city-desktop-opening-sequence` with `camera clip count 1 is not zero`; the candidate was reverted.
- Restored validation after the controls allocation rejection passed exact source diff for `racePlayerFrame.js`, syntax, `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, `npm run test:visual`, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-036-controls-allocation-20260524T164100Z/perf-036-rejected-controls-allocation-summary.json`.
- Rejected telemetry sample-buffer evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-037-telemetry-sample-buffer-20260524T171126Z`
- Telemetry sample-buffer mutation passed syntax, `npm run test:race`, and `npm run test:race:browser` with `24` races and `28` checks, but sustained normal-play actual FPS regressed by `0.63` and sustained counters did not improve together, so the candidate was reverted.
- Restored validation after the telemetry sample-buffer rejection passed exact source diff for `raceTelemetryDiagnostics.js`, syntax, `npm run test:race`, repeat `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, `npm run test:visual`, JSON parsing, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-037-telemetry-sample-buffer-20260524T171126Z/perf-037-rejected-telemetry-sample-buffer-summary.json`.
- Latest rejected viewport-fit dirty evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-039-viewport-fit-dirty-20260524T181500Z`
- Viewport-fit dirty gating passed `npm run test:race` and `npm run test:race:browser` with `24` races and `28` checks, but focused desktop actual FPS regressed by `0.03`, desktop all-scenario actual FPS regressed by `0.03`, sustained actual FPS regressed by `0.10`, and desktop-driving actual FPS regressed by `0.10`; the candidate was reverted.
- Restored validation after the viewport-fit dirty rejection passed candidate-identifier scan, `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, `npm run test:visual`, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-039-viewport-fit-dirty-20260524T181500Z/perf-039-rejected-viewport-fit-dirty-summary.json`.
- Latest rejected race-ranking allocation evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/perf-040-race-ranking-allocation-20260524T184127Z`
- Race-ranking allocation passed `npm run test:race` and two `npm run test:race:browser` runs with `24` races and `28` checks, but the two-run candidate average regressed desktop all-scenario actual FPS by `0.67` while focused desktop actual FPS improved by `1.56`; the candidate was reverted.
- Restored validation after the race-ranking allocation rejection passed candidate-identifier scan, `npm run test:race`, `npm run test:race:browser` (`24` race completions, `28` visual/control/fallback checks), `npm run build`, `npm run test:visual`, and `git diff --check`; evidence summary is `.agent/runs/kart-racer-production-readiness/evidence/perf-040-race-ranking-allocation-20260524T184127Z/perf-040-rejected-race-ranking-allocation-summary.json`.

## Race Disable/Recovery Evidence

Local technical race-disable control:

- Runbook: `docs/race-disable-recovery-runbook.md`
- Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/race-disable-001-20260523T200640Z`
- Flag: `VITE_RACE_DISABLED=true`
- Optional message: `VITE_RACE_DISABLED_REASON`

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run test:race:disable` | Pass; direct `/#race` renders the recovery screen, race canvases do not mount, Race GP/world/shell/nav race entry counts are `0`, and stored race-reward state does not target raceway. | `.agent/runs/kart-racer-production-readiness/evidence/race-disable-001-20260523T200640Z/npm-run-test-race-disable.log` |
| `npm run test:race` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/race-disable-001-20260523T200640Z/npm-run-test-race.log` |
| `npm run test:race:browser` | Pass; `24` races and `28` visual/control/fallback checks with race enabled by default. | `.agent/runs/kart-racer-production-readiness/evidence/race-disable-001-20260523T200640Z/npm-run-test-race-browser.log` |
| `npm run test:hub` | Pass; normal Race GP/world raceway entry and race-start hub metrics still work when the flag is absent. | `.agent/runs/kart-racer-production-readiness/evidence/race-disable-001-20260523T200640Z/npm-run-test-hub.log` |
| `npm run test:visual` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/race-disable-001-20260523T200640Z/npm-run-test-visual.log` |
| `npm run build` | Pass with existing large-chunk warning. | `.agent/runs/kart-racer-production-readiness/evidence/race-disable-001-20260523T200640Z/npm-run-build.log` |

Status: the local feature flag and route guard are proven. The production gate is not closed because release-owner activation policy, preview/prod deployment evidence, rollback target, and monitoring/support status are still not supplied.

## API/Data Safety Evidence

Local API/data smoke:

- Runbook: `docs/api-data-safety-smoke.md`
- Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z`
- Local summary: `.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z/api-data-smoke-summary.json`
- URL-mode harness summary: `.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z/url-mode-mock/api-data-smoke-summary.json`

| Command | Result | Evidence |
| --- | --- | --- |
| `API_DATA_SMOKE_ARTIFACT_DIR=.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z npm run test:api:data` | Pass; local mocked sync accepts current app schema `5`, creates/lists backups, restores an own-profile backup to rev `3` with a safety backup of rev `2`, returns safe auth/conflict/read-only/other-user/old-schema errors, and covers FatSecret missing-credentials/success/upstream-error paths without configured secret leakage. | `.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z/npm-run-test-api-data-local.log` |
| URL-mode mock deployment probe | Pass; deployed-URL harness checks FatSecret short-query and missing-item shapes, unauthenticated sync safe statuses, authenticated sync read routes, no raw `state_json` leak, live FatSecret query shape, and configured-secret leakage checks against a deployment-shaped local mock. | `.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z/url-mode-mock.log` |
| `npm run test:api:data` | Pass; sync accepts current app schema `5`, creates/list backups, restores an own-profile backup to rev `3` with a safety backup of rev `2`, returns safe auth/conflict/read-only/other-user/old-schema errors, and covers FatSecret missing-credentials/success/upstream-error paths without configured secret leakage. | `.agent/runs/kart-racer-production-readiness/evidence/api-data-restore-001-20260523T235700Z/npm-run-test-api-data.log` |
| `npm run build` | Pass with existing large-chunk warning. | `.agent/runs/kart-racer-production-readiness/evidence/api-data-restore-001-20260523T235700Z/npm-run-build.log` |
| `node --check 'functions/api/sync/backups/[id]/restore.js'` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/api-data-restore-001-20260523T235700Z/node-check-sync-backup-restore.log` |
| `git diff --check` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/api-data-restore-001-20260523T235700Z/git-diff-check.log` |

Status: local Functions/D1/FatSecret behavior is smoke-proven with mocked Cloudflare Access, D1, and FatSecret upstreams, including same-schema D1 backup restore. The URL-mode API harness is ready for supplied preview/prod URLs and was proven against a local mock. The production gate is not closed because production scope, Cloudflare project/domain, real D1 binding/migration evidence, Access JWT, FatSecret secrets/live-query approval, barcode/camera scope, real preview/prod smoke, production rollback compatibility, and privacy/log-retention decisions are still not supplied.

## Core Tracker Regression Evidence

Local core tracker smoke:

- Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/core-tracker-001-20260523T204431Z`
- Summary: `.agent/runs/kart-racer-production-readiness/evidence/core-tracker-001-20260523T204431Z/core-tracker-smoke-summary.json`

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run test:core` | Pass; basic-mode home loads, manual food entry persists and syncs, barcode scanner surface is reachable without requesting camera, settings persistence works, export/import preserves schema `5`, return navigation works, authenticated sync reports `Synced`, unauthenticated sync reports `Local only`, and network failure reports `Offline / local changes`. | `.agent/runs/kart-racer-production-readiness/evidence/core-tracker-001-20260523T204431Z/npm-run-test-core.log` |
| `npm run build` | Pass with existing large-chunk warning. | `.agent/runs/kart-racer-production-readiness/evidence/core-tracker-001-20260523T204431Z/npm-run-build.log` |
| `node --check scripts/core-tracker-smoke-test.mjs` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/core-tracker-001-20260523T204431Z/node-check-core-tracker-smoke.log` |
| `git diff --check` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/core-tracker-001-20260523T204431Z/git-diff-check.log` |

Status: local core tracker regression smoke is proven for the covered routes and data flows. Preview and production smoke are still not supplied, and barcode camera permission policy still needs a release-scope decision because `public/_headers` currently denies camera access.

## Header/PWA/CSP Evidence

Local built-app header/PWA/CSP smoke:

- Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/csp-headers-001-20260523T233058Z`
- Summary: `.agent/runs/kart-racer-production-readiness/evidence/csp-headers-001-20260523T233058Z/csp-headers-001-summary.json`

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run test:pwa` | Pass; built `_headers` matches `public/_headers`, `Content-Security-Policy` is present in public/dist headers, the local header-aware server delivered the expected 13-directive CSP to Chromium, cache policies are present, manifest metadata is valid, service worker installs and controls the built app, and offline reload serves the app shell. | `.agent/runs/kart-racer-production-readiness/evidence/csp-headers-001-20260523T233058Z/npm-run-test-pwa.log` |
| `npm run test:release:smoke` | Pass after the CSP/header change; local built preview still proves home/food/settings navigation, `/#race` WebGL load, nonblank canvas, desktop keyboard acceleration, mobile touch acceleration, race exit hash cleanup, manifest fetch, and service-worker fetch. | `.agent/runs/kart-racer-production-readiness/evidence/csp-headers-001-20260523T233058Z/npm-run-test-release-smoke.log` |
| `npm run build` | Pass with existing large-chunk warning. | `.agent/runs/kart-racer-production-readiness/evidence/csp-headers-001-20260523T233058Z/npm-run-build.log` |
| `node --check scripts/header-pwa-smoke-test.mjs` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/csp-headers-001-20260523T233058Z/node-check-header-pwa-smoke.log` |
| `node --check scripts/release-smoke-test.mjs` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/csp-headers-001-20260523T233058Z/node-check-release-smoke.log` |
| `git diff --check` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/csp-headers-001-20260523T233058Z/git-diff-check.log` |

Status: local built-app CSP/cache/PWA/offline shell behavior is proven. Header/permission production readiness remains partial because `Permissions-Policy` denies camera while barcode scanner scope is undecided, deployed Cloudflare response headers are not proven, and target-browser page lifecycle/audio autoplay checks are still not supplied. The PWA smoke tolerates deterministic Google Fonts request failures and the intentional offline `/api/sync/me` request failure during offline-shell validation.

## PWA Update Evidence

Local installed-app update smoke:

- Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/pwa-update-001-20260523T234355Z`
- Summary: `.agent/runs/kart-racer-production-readiness/evidence/pwa-update-001-20260523T234355Z/pwa-update-001-summary.json`

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run test:pwa:update` | Pass; the local installed app served v1, registered and controlled the page with `sw.js`, switched the server to v2, observed service worker `updatefound` and `controllerchange`, loaded the v2 app-shell marker online, and reloaded the v2 shell while offline. | `.agent/runs/kart-racer-production-readiness/evidence/pwa-update-001-20260523T234355Z/npm-run-test-pwa-update.log` |
| `npm run build` | Pass with existing large-chunk warning. | `.agent/runs/kart-racer-production-readiness/evidence/pwa-update-001-20260523T234355Z/npm-run-build.log` |
| `node --check scripts/pwa-update-smoke-test.mjs` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/pwa-update-001-20260523T234355Z/node-check-pwa-update-smoke.log` |
| `git diff --check` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/pwa-update-001-20260523T234355Z/git-diff-check.log` |

Status: local installed-app update/cache behavior is proven for Chromium/Playwright on a versioned built app. Production readiness remains partial because deployed preview/production update behavior, target-browser/device installed-app matrix, release-owner PWA support policy, and rollback evidence are not supplied.

## Page Lifecycle/Audio Evidence

Local page lifecycle/audio smoke:

- Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/lifecycle-audio-001-20260523T210212Z`
- Summary: `.agent/runs/kart-racer-production-readiness/evidence/lifecycle-audio-001-20260523T210212Z/page-lifecycle-audio-summary.json`
- Browser race summary: `.agent/runs/kart-racer-production-readiness/evidence/lifecycle-audio-001-20260523T210212Z/race-browser-playtest-summary.json`

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run test:lifecycle` | Pass; race page clears active input on hidden/pagehide, records persisted pagehide/pageshow, resets frame timing on resume, catches blocked Web Audio resume without unhandled rejection, and keeps mute/unmute telemetry available. | `.agent/runs/kart-racer-production-readiness/evidence/lifecycle-audio-001-20260523T210212Z/npm-run-test-lifecycle.log` |
| `npm run test:race` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/lifecycle-audio-001-20260523T210212Z/npm-run-test-race.log` |
| `npm run test:race:browser` | Pass; `24` races and `28` visual/control/fallback checks after lifecycle/audio runtime changes. | `.agent/runs/kart-racer-production-readiness/evidence/lifecycle-audio-001-20260523T210212Z/npm-run-test-race-browser.log` |
| `npm run test:visual` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/lifecycle-audio-001-20260523T210212Z/npm-run-test-visual.log` |
| `npm run test:hub` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/lifecycle-audio-001-20260523T210212Z/npm-run-test-hub.log` |
| `npm run build` | Pass with existing large-chunk warning. | `.agent/runs/kart-racer-production-readiness/evidence/lifecycle-audio-001-20260523T210212Z/npm-run-build.log` |
| `node --check scripts/page-lifecycle-audio-smoke-test.mjs` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/lifecycle-audio-001-20260523T210212Z/node-check-page-lifecycle-audio-smoke.log` |
| `git diff --check` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/lifecycle-audio-001-20260523T210212Z/git-diff-check.log` |

Status: local page lifecycle/audio behavior is proven for the race route and preservation suite. Production readiness remains partial because real browser bfcache behavior across target browsers/devices, production deploy smoke, and release-owner autoplay/support decisions are still not supplied.

## WebGL Context-Loss Evidence

Local built-preview WebGL context-loss smoke:

- Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/webgl-context-001-20260523T214739Z`
- Summary: `.agent/runs/kart-racer-production-readiness/evidence/webgl-context-001-20260523T214739Z/webgl-context-001-summary.json`
- Context-loss smoke summary: `.agent/runs/kart-racer-production-readiness/evidence/webgl-context-001-20260523T214739Z/webgl-context-smoke-summary.json`
- Browser race summary: `.agent/runs/kart-racer-production-readiness/evidence/webgl-context-001-20260523T214739Z/race-browser-playtest-summary.json`

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run test:webgl` | Pass; built preview loads `/#race` as WebGL, real `WEBGL_lose_context` triggers `canvas2d-fallback`, fallback canvas is nonblank, `window.__raceWebGLContextStatus.fallbackRequested` is `true`, and the race exit returns to the world home with an empty hash. | `.agent/runs/kart-racer-production-readiness/evidence/webgl-context-001-20260523T214739Z/npm-run-test-webgl.log` |
| `npm run test:race` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/webgl-context-001-20260523T214739Z/npm-run-test-race.log` |
| `npm run test:race:browser` | Pass; `24` races and `28` visual/control/fallback checks after context-loss handling and race-exit changes. | `.agent/runs/kart-racer-production-readiness/evidence/webgl-context-001-20260523T214739Z/npm-run-test-race-browser.log` |
| `npm run test:core` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/webgl-context-001-20260523T214739Z/npm-run-test-core.log` |
| `npm run test:lifecycle` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/webgl-context-001-20260523T214739Z/npm-run-test-lifecycle.log` |
| `npm run test:hub` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/webgl-context-001-20260523T214739Z/npm-run-test-hub.log` |
| `npm run test:visual` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/webgl-context-001-20260523T214739Z/npm-run-test-visual.log` |
| `npm run build` | Pass with existing large-chunk warning. | `.agent/runs/kart-racer-production-readiness/evidence/webgl-context-001-20260523T214739Z/npm-run-build.log` |
| `node --check scripts/webgl-context-smoke-test.mjs` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/webgl-context-001-20260523T214739Z/node-check-webgl-context-smoke.log` |
| `git diff --check` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/webgl-context-001-20260523T214739Z/git-diff-check.log` |
| Ledger `progressEvents` syntax check | Pass | `.agent/runs/kart-racer-production-readiness/evidence/webgl-context-001-20260523T214739Z/implementation-notes-progress-events-check.log` |

Status: local built-preview context-loss behavior is proven for Chromium/Playwright. Production readiness remains partial because target-browser/device WebGL context-loss, preview/prod deploy smoke, monitoring/logging behavior, and release-owner support policy are still not supplied.

## Release Smoke Harness Evidence

Local built-preview release smoke:

- Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z`
- Summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-release-smoke-summary.json`

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run test:release:smoke` | Pass; local built preview loads home, navigates home -> food -> settings -> home, loads `/#race` as WebGL, records nonblank race canvas, proves desktop keyboard acceleration, proves mobile touch acceleration, exits race with `#race` cleared, fetches manifest/service worker, and proves the playtest query creates no `__racePlaytest*`, diagnostic telemetry, or sample globals. | `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-release-smoke-summary.json` |
| `npm run build` | Pass with existing large-chunk warning before smoke run. | `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/validation-summary.json` |
| `node --check scripts/release-smoke-test.mjs` | Pass | local terminal validation on 2026-05-24 |

Status: local release smoke harness is proven for the built preview and can be pointed at deployed URLs with `RELEASE_SMOKE_URL=<url> RELEASE_SMOKE_TARGET=preview|production npm run test:release:smoke`. The preview/prod gates are not closed because release URLs, deployment IDs, deployed response headers, authenticated D1 sync, FatSecret production bindings, Cloudflare rollback, monitoring, and sign-off are still not supplied.

The same smoke was rerun after the CSP/header change in `.agent/runs/kart-racer-production-readiness/evidence/csp-headers-001-20260523T233058Z/npm-run-test-release-smoke.log`.

## Local Rollback Drill Evidence

Local built-dist rollback drill:

- Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z`
- Summary: `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/release-rollback-smoke-summary.json`

| Command | Result | Evidence |
| --- | --- | --- |
| `node --check scripts/release-rollback-smoke-test.mjs` | Pass | local terminal validation on 2026-05-24 |
| `npm run build` | Pass with existing large-chunk warning before rollback smoke run. | `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/validation-summary.json` |
| `npm run test:release:rollback` | Pass; local switchable server served current-candidate, switched active root to known-good, verified rollback marker, and loaded known-good `/#race` with `raceRenderer: webgl` and `raceTrack: comeback-city`. | `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/release-rollback-smoke-summary.json` |

Status: local rollback mechanics are rehearsed with copied `dist` roots and a switchable local server. The production rollback gate is not closed because Cloudflare project/domain, deployment IDs, rollback owner approval, production smoke after rollback, deployed headers, monitoring/support, D1 rollback compatibility, and sign-off are still not supplied.

## Release Artifact Safety Evidence

Local built-artifact safety smoke:

- Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/release-artifacts-001-20260524T000946Z`
- Summary: `.agent/runs/kart-racer-production-readiness/evidence/release-artifacts-001-20260524T000946Z/release-artifacts-001-summary.json`
- Report: `.agent/runs/kart-racer-production-readiness/evidence/release-artifacts-001-20260524T000946Z/release-artifact-safety-report.json`

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run build` | Pass with existing large-chunk warning. | `.agent/runs/kart-racer-production-readiness/evidence/release-artifacts-001-20260524T000946Z/npm-run-build.log` |
| `node --check scripts/release-artifact-safety-test.mjs` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/release-artifacts-001-20260524T000946Z/node-check-release-artifact-safety.log` |
| `npm run test:release:artifacts` | Pass; built `dist` has no source map files, no `sourceMappingURL`, no standalone playtest/debug files, and no scanned secret env names or known test secret values. | `.agent/runs/kart-racer-production-readiness/evidence/release-artifacts-001-20260524T000946Z/npm-run-test-release-artifacts.log` |

Additional production behavior checkpoint:

- Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/release-hooks-001-20260524T002219Z`
- Summary: `.agent/runs/kart-racer-production-readiness/evidence/release-hooks-001-20260524T002219Z/release-hooks-001-summary.json`

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run build` | Pass with existing large-chunk warning. | `.agent/runs/kart-racer-production-readiness/evidence/release-hooks-001-20260524T002219Z/npm-run-build.log` |
| `npm run test:release:smoke` | Pass; includes `/?raceAutoplay=1&raceMode=visual-kart&raceVisualScenario=acceleration&raceNoFinish=1#race`, proving no `__racePlaytestEvents`, no `__racePlaytestResult`, no `__raceVisualTelemetrySamples`, and `normalizedSpeed: 0` after the query-only wait. | `.agent/runs/kart-racer-production-readiness/evidence/release-hooks-001-20260524T002219Z/npm-run-test-release-smoke.log` |
| `npm run test:release:artifacts` | Pass; static artifact safety checks remain green. Static playtest/debug strings are still recorded as policy-needed. | `.agent/runs/kart-racer-production-readiness/evidence/release-hooks-001-20260524T002219Z/npm-run-test-release-artifacts.log` |
| `npm run test:race` | Pass; content helper verifies hook-disable state creation. | `.agent/runs/kart-racer-production-readiness/evidence/release-hooks-001-20260524T002219Z/npm-run-test-race.log` |
| `npm run test:race:browser` | Pass; dev `race-playtest.html` automation still runs `24` races and `28` visual/control/fallback checks. | `.agent/runs/kart-racer-production-readiness/evidence/release-hooks-001-20260524T002219Z/npm-run-test-race-browser.log` |

Status: local artifact and production behavior checks pass with gate status `standard-production-playtest-hooks-disabled-locally-policy-needed`. The source-map/debug P1 gate is not closed because static playtest/debug strings remain in race chunks and release-owner policy/sign-off or a dated follow-up is not supplied.

Additional release policy checkpoint:

- Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/release-policy-audit-001-20260524T031952Z`
- Artifact summary: `.agent/runs/kart-racer-production-readiness/evidence/release-policy-audit-001-20260524T031952Z/release-artifact-safety-report.json`
- Decision summary: `.agent/runs/kart-racer-production-readiness/evidence/release-policy-audit-001-20260524T031952Z/release-decision-readiness-summary.json`

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run build` | Pass with existing large-chunk warning. | `.agent/runs/kart-racer-production-readiness/evidence/release-policy-audit-001-20260524T031952Z/npm-run-build.log` |
| `npm run test:release:artifacts` | Pass; technical artifact safety checks remain green and the report classifies present runtime playtest automation strings, diagnostic telemetry globals, and `visual-kart` route/mode strings separately. | `.agent/runs/kart-racer-production-readiness/evidence/release-policy-audit-001-20260524T031952Z/npm-run-test-release-artifacts.log` |
| `npm run test:release:decisions` | Pass; records gate status `owner-release-decisions-missing-r3-blocked`, `17` missing decision categories, and `119` `Not supplied` rows. | `.agent/runs/kart-racer-production-readiness/evidence/release-policy-audit-001-20260524T031952Z/npm-run-test-release-decisions.log` |

Release artifact hardening checkpoint:

- Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z`
- Artifact summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-release-artifact-safety-report.json`
- Release smoke summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-release-smoke-summary.json`

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run build` | Pass with existing large-chunk warning. | `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/validation-summary.json` |
| `npm run test:release:artifacts` | Pass; source maps, `sourceMappingURL`, standalone playtest/debug files, scanned secret-name leaks, runtime playtest automation strings, diagnostic telemetry globals, and visual-review route strings are not detected in the standard production build. | `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-release-artifact-safety-report.json` |
| `npm run test:release:smoke` | Pass; local built-preview query probe still creates no playtest globals, no diagnostic telemetry globals/samples, and leaves normalized speed at `0`. | `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-release-smoke-summary.json` |
| `npm run test:race` | Pass. | `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/validation-summary.json` |
| `npm run test:race:browser` | Pass with `24` races and `28` visual/control/fallback checks. | `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-race-browser-playtest-summary.json` |
| `npm run test:visual` | Pass. | `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/validation-summary.json` |
| `npm run test:race:disable` | Pass. | `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/validation-summary.json` |

## Production Dependency Audit Evidence

Local production dependency audit smoke:

- Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/security-prod-audit-001-20260524T012143Z`
- Summary: `.agent/runs/kart-racer-production-readiness/evidence/security-prod-audit-001-20260524T012143Z/security-production-audit-summary.json`
- Production audit JSON: `.agent/runs/kart-racer-production-readiness/evidence/security-prod-audit-001-20260524T012143Z/npm-audit-production.json`
- Full audit JSON: `.agent/runs/kart-racer-production-readiness/evidence/security-prod-audit-001-20260524T012143Z/npm-audit-full.json`

| Command | Result | Evidence |
| --- | --- | --- |
| `node --check scripts/security-production-audit.mjs` | Pass | local terminal validation on 2026-05-24 |
| `npm run test:security:prod` | Pass; `npm audit --omit=dev` exits `0` with `0` total production vulnerabilities across `48` production dependencies. | `.agent/runs/kart-racer-production-readiness/evidence/security-prod-audit-001-20260524T012143Z/security-production-audit-summary.json` |
| Full `npm audit --json` captured by the smoke | Fails as expected for unresolved policy; `3` moderate dev/build-tool advisories remain: esbuild `GHSA-67mh-4wv8-2f99`, Vite `GHSA-4w7w-66w2-5vf9`, and vite-plugin-pwa via Vite. npm reports semver-major fixes to Vite `8.0.14` and vite-plugin-pwa `1.3.0`. | `.agent/runs/kart-racer-production-readiness/evidence/security-prod-audit-001-20260524T012143Z/npm-audit-full.json` |

Status: local production dependency audit is proven with gate status `production-dependency-audit-pass-dev-advisory-policy-needed`. The Security/privacy P0 gate remains partial because release owner must confirm the production-only audit split, choose the semver-major Vite/vite-plugin-pwa upgrade, or record a dated exception for the remaining full-audit dev/build-tool advisories. Telemetry/privacy and log-retention posture, deployed headers, barcode/camera scope, and production API binding scope also remain unresolved.

## Accessibility Smoke Evidence

Local built-preview accessibility smoke:

- Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z`
- Summary: `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/accessibility-smoke-summary.json`
- Screenshots: `accessibility-home.png`, `accessibility-race-desktop.png`, `accessibility-race-mobile.png`

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run build` | Pass with existing large-chunk warning before smoke run. | `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/validation-summary.json` |
| `node --check scripts/accessibility-smoke-test.mjs` | Pass | local terminal validation on 2026-05-24 |
| `npm run test:accessibility` | Pass; local built preview proves visible named controls, no duplicate IDs, no visible images without alt, visible keyboard focus, keyboard mute-toggle operation, reduced-motion propagation to canvas/HUD/DOM race state, desktop hiding of the mobile-only Go control, mobile Go touch acceleration above `0.05`, and representative contrast ratios from `12.8` to `17.73` on sampled race controls. | `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/accessibility-smoke-summary.json` |
| `npm run test:race:browser` | Pass; `24` race completions and `28` visual/control/fallback checks passed after release telemetry hardening. | `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-race-browser-playtest-summary.json` |

Status: local accessibility smoke is proven with gate status `local-accessibility-smoke-proven-not-manual-signoff`. The Accessibility P0 gate remains partial until target-browser/device manual accessibility review and release-owner acceptance or a dated exception are supplied.

## Lab Readiness Evidence

Local Web Vitals/Lighthouse-equivalent lab smoke:

- Runbook: `docs/race-lab-readiness-smoke.md`
- Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z`
- Summary: `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/lab-readiness-smoke-summary.json`

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run build` | Pass with existing large-chunk warning. | `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/npm-run-build.log` |
| `npm run test:lab` | Pass; home and `/#race` routes record paint, CLS, long-task, accessibility DOM, browser error/request, manifest, and service-worker signals. | `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/npm-run-test-lab.log` |

Recorded local metrics:

- Home route: FCP `268ms`, LCP `288ms`, CLS `0.0018`, long-task count `0`, no visible unlabeled controls, no console/page/request failures.
- Race route: FCP `68ms`, LCP `876ms`, CLS `0.0001`, long-task count `40`, max long task `706ms`, Total Blocking Time proxy `1576ms`, no visible unlabeled controls, no console/page/request failures.
- PWA signals: manifest fetch `200`, display `standalone`, service worker activated and controlling the page.

Status: local lab evidence is recorded. The P1 Lighthouse/Web Vitals gate remains partial because release-owner numeric targets or a dated exception, production URL evidence, deployed-header evidence, target browser/device matrix, and monitoring decision are not supplied.

## Route Split / Bundle Evidence

Local route-level lazy-loading and bundle smoke:

- Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z`
- Summary: `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/lazy-route-001-summary.json`
- Bundle report: `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/bundle-asset-budget-report.json`

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run test:bundle` | Pass; route chunks and built asset sizes recorded. | `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/npm-run-test-bundle.log` |
| `npm run test:race` | Pass. | `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/npm-run-test-race.log` |
| `npm run test:core` | Pass. | `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/npm-run-test-core.log` |
| `npm run test:hub` | Pass. | `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/npm-run-test-hub.log` |
| `npm run test:visual` | Pass. | `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/npm-run-test-visual.log` |
| `npm run test:race:browser` | First run timed out on a visual snapshot wait; repeat default run passed with `24` races and `28` visual/control/fallback checks. | `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/npm-run-test-race-browser-repeat.log` |
| `npm run test:pwa` | Pass. | `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/npm-run-test-pwa.log` |
| `npm run test:webgl` | Pass. | `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/npm-run-test-webgl.log` |

Recorded route-split metrics:

- Previous largest bundle file: `assets/index-COrftTm9.js` at `3736.62 KiB`.
- Current app entry chunk: `assets/index-C5W1R8KX.js` at `56.13 KiB`.
- Current race chunk: `assets/RaceScreen-D4xLy_iL.js` at `252.27 KiB`.
- Current world chunk: `assets/WorldMode-CMFCvhag.js` at `109.49 KiB`.
- Current largest chunk: `assets/comebackCityVisuals-DeaiWGlV.js` at `3213.89 KiB`.
- Total built size increased by `7.21 KiB`, gzip total increased by `9.06 KiB`, and JavaScript total increased by `5.46 KiB`.

Status: route-level split is kept as release-readiness progress because heavy route code no longer sits in the entry chunk and the preservation suite passes on repeat. It is not FPS sign-off or bundle-budget acceptance; repeat browser evidence still reports normal desktop focused average `35.61 actualFps` and sustained normal play `17.45 actualFps`, below both the current local floor and PRD target.

## Race Browser Evidence

Latest browser summary:

- Path: `.agent/runs/kart-racer-production-readiness/evidence/perf-040-race-ranking-allocation-20260524T184127Z/post-revert-race-browser-playtest-summary.json`
- Captured at: `2026-05-24T18:17:41.550Z`
- Git recorded by harness: branch `main`, commit `9fb87c2`
- Race completions: `24`
- Visual/control/fallback checks: `28`
- HUD overlap: `maxKartOverlapArea: 0`, `maxRoadFocusOverlapArea: 0` for recorded normal desktop/mobile focus checks.
- WebGL fallback: `renderer: canvas2d-fallback`, nonblank canvas data recorded.
- Reduced motion: `speedLineCount: 0`, telemetry reduced motion true.
- Audio mute: toggle changes label/pressed state and telemetry audio muted true.

Representative copied screenshots:

- `.agent/runs/kart-racer-production-readiness/evidence/baseline-20260523T180505Z/visual-comeback-city-desktop-driving-after-audit-fix.png`
- `.agent/runs/kart-racer-production-readiness/evidence/baseline-20260523T180505Z/visual-comeback-city-desktop-drift-after-audit-fix.png`
- `.agent/runs/kart-racer-production-readiness/evidence/baseline-20260523T180505Z/visual-comeback-city-mobile-driving-after-audit-fix.png`
- `.agent/runs/kart-racer-production-readiness/evidence/baseline-20260523T180505Z/visual-comeback-city-webgl-fallback-after-audit-fix.png`

## Changes Made

| Area | Change | Proof |
| --- | --- | --- |
| Mobile race HUD | Added a compact real-route mobile objective card and status stack so the mobile race matches the production visual check's required HUD composition. | `npm run test:visual` pass after fix. |
| Mobile minimap | Kept minimap visible on mobile and moved it lower to avoid the protected road-focus rectangle. | `npm run test:race:browser` pass after minimap adjustment. |
| Visual checker | Adjusted WebGL canvas nonblank assertion so WebGL canvases with `preserveDrawingBuffer: false` are not treated as blank solely from 2D readback; the existing screenshot comparison remains the visual nonblank proof. | `npm run test:visual` pass after checker update. |
| Dependency audit | Ran non-forced `npm audit fix`, updating transitive dependencies and removing high-severity findings. | `npm audit-after-fix.log` shows only the remaining moderate Vite/esbuild advisory. |
| Performance instrumentation | Added sustained normal-play capture and setup-time scene budget telemetry. | `perf-003-summary.json` includes sustained normal play, scene budgets, and focused desktop deltas. |
| Lamp instancing | Replaced repeated street/plaza lamp meshes with instanced meshes. | Scene meshes reduced by `39`; browser/race/build/visual/hub gates pass. |
| Boost filter cleanup | Removed the boost-only full-canvas CSS filter while retaining speed-line, boost-flame, HUD, and boost-pad feedback. | Boost focused state improved to `42.2 actualFps`; browser visual gates pass. |
| Kept mild race camera/fog far-range reduction | Lowered the race camera far plane and fog far distance from `620` to `580` after the more aggressive `520` candidate had been rejected. | `perf-023-kept-far-range-summary.json`; two candidate browser runs passed and paired averages improved focused desktop actual FPS by `0.81`, desktop all-scenario actual FPS by `1.16`, and sustained actual FPS by `0.29`; performance gate remains open. |
| Rejected perimeter-window material candidate | Reverted far perimeter-window material consolidation because two passing browser runs did not beat the then-kept product-FPS baseline. | `perf-006-rejected-perimeter-window-material-summary.json`; later kept checkpoint is `perf-023`. |
| Rejected perimeter-window density candidate | Reverted far perimeter-window density reduction because two passing browser runs reduced triangles but regressed desktop average actual FPS versus current code and still trailed the then-kept product-FPS baseline. | `perf-007-rejected-perimeter-window-density-summary.json`; later kept checkpoint is `perf-023`. |
| Rejected static scenery frustum-culling candidate | Reverted scenery instanced-mesh bounds/frustum culling because a passing browser run reduced render work but regressed sustained actual FPS and desktop average actual FPS versus the current RC checkpoint and still trailed the then-kept product-FPS baseline. | `perf-008-rejected-scenery-frustum-summary.json`; later kept checkpoint is `perf-023`. |
| Rejected track-surface basic-material candidate | Reverted unlit track/ground/curb/rail/line materials because the default browser harness timed out twice before summary generation. | `perf-009-rejected-track-basic-material-summary.json`; later kept checkpoint is `perf-023`. |
| Rejected rival LOD over-reduction candidate | Reverted an attempt to simplify the already-lightweight rival kart model because the default browser harness timed out before summary generation. | `perf-010-rejected-rival-lod-summary.json`; later kept checkpoint is `perf-023`. |
| Rejected perimeter skyline density candidate | Reverted far perimeter skyline block-count reduction because a passing browser run reduced scene triangles and slightly improved sustained FPS, but focused desktop actual FPS regressed versus the then-kept product-FPS baseline. | `perf-011-rejected-perimeter-skyline-density-summary.json`; later kept checkpoint is `perf-023`. |
| Rejected telemetry cadence candidate | Reverted default telemetry cadence increase to `220ms` because the default browser harness timed out before summary generation. | `perf-012-rejected-telemetry-cadence-summary.json`; later kept checkpoint is `perf-023`. |
| Rejected HUD backdrop-blur candidate | Reverted race HUD backdrop-blur removal because a passing browser run reduced frame-work/render/calls/triangles, but focused desktop actual FPS regressed versus the before baseline. | `perf-013-rejected-hud-backdrop-summary.json`; later kept checkpoint is `perf-023`. |
| Rejected renderer stencil candidate | Reverted race renderer `stencil: false` because a passing browser run reduced frame-work/render/calls/triangles, but focused desktop actual FPS and focused minimum actual FPS regressed versus the before baseline. | `perf-014-rejected-renderer-stencil-summary.json`; later kept checkpoint is `perf-023`. |
| Rejected pickup/hazard geometry candidate | Reverted small pickup/hazard tessellation reduction because a passing browser run reduced pickup triangles by `4,272` and improved sustained FPS, but desktop average actual FPS and focused desktop actual FPS regressed versus the current-code baseline. | `perf-015-rejected-pickup-geometry-summary.json`; later kept checkpoint is `perf-023`. |
| Rejected collision effective-radius cache candidate | Reverted static collision-circle effective-radius precompute because a passing browser run reduced telemetry cost and improved sustained FPS, but focused desktop actual FPS regressed versus the current-code baseline. | `perf-016-rejected-collision-cache-summary.json`; later kept checkpoint is `perf-023`. |
| Rejected renderer tone-mapping candidate | Reverted `NoToneMapping` because a passing browser run reduced render cost and improved sustained FPS, but focused desktop and desktop-average actual FPS regressed versus the current-code baseline. | `perf-017-rejected-tone-mapping-summary.json`; later kept checkpoint is `perf-023`. |
| Rejected binary `pointAt` lookup candidate | Reverted boundary-preserving binary segment lookup in `compileTrack3D().pointAt()` because a passing browser run improved sustained FPS, but focused desktop and desktop-average actual FPS regressed versus the current-code baseline. | `perf-018-rejected-point-at-summary.json`; later kept checkpoint is `perf-023`. |
| Rejected clean-track cap instancing candidate | Reverted global and chunked cap instancing because both variants passed browser gates but produced countervailing product-FPS regressions across focused, desktop-average, and sustained samples. | `perf-019-rejected-track-cap-instancing-summary.json`; later kept checkpoint is `perf-023`. |
| Rejected race camera/fog far-range candidate | Reverted the `520` far-range candidate because the default browser gate timed out before a complete summary, even though syntax and `npm run test:race` passed. Repeat post-revert browser preservation passed with `24` races and `28` visual/control/fallback checks. | `perf-020-rejected-far-range-summary.json`; later kept checkpoint is `perf-023`. |
| Rejected WebGL antialias disable candidate | Reverted `antialias: false` because the default browser gate timed out before a complete summary, even though syntax and `npm run test:race` passed. Post-revert browser preservation passed with `24` races and `28` visual/control/fallback checks. | `perf-021-rejected-antialias-summary.json`; later kept checkpoint is `perf-023`. |
| Rejected distant mountain/snow instancing candidate | Reverted mountain/snow instancing because the browser gate passed but desktop focused actual-FPS average regressed by `2.78` while sustained actual FPS improved only `0.09`. Post-revert browser preservation passed with `24` races and `28` visual/control/fallback checks. | `perf-022-rejected-mountain-instancing-summary.json`; later kept checkpoint is `perf-023`. |
| Rejected flat ground-plane segment candidate | Reverted the flat ground `PlaneGeometry` `1x1` segment candidate because the repeat default browser gate failed visual telemetry with `camera clip count 1 is not zero`, despite one passing FPS-positive browser run. Post-revert browser preservation passed with `24` races and `28` visual/control/fallback checks. | `perf-024-rejected-ground-plane-summary.json`; latest kept checkpoint remains `perf-023`. |
| Rejected moderate far-range candidate | Reverted the race camera/fog far-range `560` candidate because the browser gate passed but desktop all-scenario actual FPS regressed by `0.40`, sustained actual FPS regressed by `0.27`, and focused render work/calls/triangles worsened. Post-revert browser preservation passed with `24` races and `28` visual/control/fallback checks. | `perf-025-rejected-moderate-far-range-summary.json`; latest kept checkpoint remains `perf-023`. |
| Rejected chase-camera vector scratch candidate | Reverted the chase-camera scratch-vector candidate because the default browser gate timed out before producing a complete candidate summary, even though syntax and `npm run test:race` passed. Post-revert browser preservation passed with `24` races and `28` visual/control/fallback checks. | `perf-026-rejected-camera-scratch-summary.json`; latest kept checkpoint remains `perf-023`. |
| Rejected desktop render-scale candidate | Reverted the `RACE_RENDER_SCALE.desktop` `0.88` candidate because it was a visual-resolution tradeoff without owner-approved visual target input or release-owner exception, despite passing browser/build/visual/race-disable checks and improving focused/sustained FPS in one run. | `perf-027-rejected-render-scale-summary.json`; latest kept checkpoint remains `perf-023`. |
| Rejected static matrix-world candidate | Reverted the static track/scenery `matrixWorldAutoUpdate` lock because the repeat default browser gate failed visual telemetry with `camera clip count 1 is not zero`, despite one passing FPS-positive browser run. Post-revert browser preservation passed with `24` races and `28` visual/control/fallback checks. | `perf-028-rejected-static-matrix-world-summary.json`; latest kept checkpoint remains `perf-023`. |
| Rejected collision broadphase candidate | Reverted the nearest-road collision broadphase skip because the default browser gate failed visual telemetry with `camera clip count 1 is not zero` in the desktop opening sequence, despite passing syntax and `npm run test:race`. Post-revert browser preservation passed with `24` races and `28` visual/control/fallback checks. | `perf-029-rejected-collision-broadphase-summary.json`; latest kept checkpoint remains `perf-023`. |
| Rejected scenery material-cache candidate | Reverted static scenery material sharing because lower material counts did not improve product FPS. Candidate browser preservation passed, but focused desktop actual FPS regressed by `3.60`, desktop all-scenario actual FPS regressed by `1.64`, and sustained actual FPS regressed by `0.08`. | `perf-030-rejected-scenery-material-cache-summary.json`; latest kept checkpoint remains `perf-023`. |
| Rejected road-guidance velocity candidate | Reverted road-guidance velocity allocation cleanup because lower frame-work/render timings did not improve product FPS. Candidate browser preservation passed, but focused desktop actual FPS regressed by `0.18`, desktop all-scenario actual FPS regressed by `0.23`, and sustained actual FPS regressed by `0.12`. | `perf-031-rejected-road-guidance-velocity-summary.json`; latest kept checkpoint remains `perf-023`. |
| Rejected vehicle-mode cache candidate | Reverted vehicle-model mode visibility caching because focused desktop and desktop all-scenario FPS improved but sustained actual FPS regressed. Candidate browser preservation passed with `24` races and `28` checks; post-revert validation passed exact source diffs, syntax, race, browser, build, visual, and diff whitespace checks. | `perf-032-rejected-vehicle-mode-cache-summary.json`; latest kept checkpoint remains `perf-023`. |
| Rejected rival route allocation candidate | Reverted route-layer score allocation/sort cleanup and transient rival-route normal reuse because focused desktop and desktop all-scenario FPS improved but sustained actual FPS regressed and sustained frame-work/render timings worsened. Candidate browser preservation passed with `24` races and `28` checks; post-revert validation passed exact source diff, syntax, race, browser, build, visual, and diff whitespace checks. | `perf-033-rejected-rival-route-allocation-summary.json`; latest kept checkpoint remains `perf-023`. |
| Rejected player-frame vector scratch candidate | Reverted player-frame forward/right scratch vector reuse because focused desktop and sustained FPS regressed and sustained frame-work/render timings worsened despite lower focused counters and a slight desktop all-scenario FPS improvement. Candidate browser preservation passed with `24` races and `28` checks; post-revert validation passed exact source diff, syntax, race, browser, build, visual, and diff whitespace checks. | `perf-034-rejected-player-frame-vector-scratch-summary.json`; latest kept checkpoint remains `perf-023`. |
| Rejected telemetry projection scratch candidate | Reverted telemetry projection scratch reuse because desktop all-scenario and sustained actual FPS regressed and telemetry/render counters worsened despite a small focused desktop FPS gain and lower focused frame-work/render timings. Candidate browser preservation passed with `24` races and `28` checks; post-revert validation passed exact source diff, syntax, race, browser, build, visual, and diff whitespace checks. | `perf-035-rejected-telemetry-projection-scratch-summary.json`; latest kept checkpoint remains `perf-023`. |
| Rejected controls allocation candidate | Reverted player-frame controls allocation cleanup because the required browser gate failed desktop opening-sequence visual telemetry with `camera clip count 1 is not zero`. Candidate syntax and content tests passed; post-revert validation passed exact source diff, syntax, race, browser, build, visual, and diff whitespace checks. | `perf-036-rejected-controls-allocation-summary.json`; latest kept checkpoint remains `perf-023`. |
| Rejected telemetry sample-buffer candidate | Reverted playtest diagnostics sample-buffer mutation because sustained normal-play actual FPS regressed by `0.63` and sustained counters did not improve together. Candidate syntax, content, and browser gates passed; post-revert validation passed exact source diff, syntax, race, repeat browser, build, visual, JSON parsing, and diff whitespace checks. | `perf-037-rejected-telemetry-sample-buffer-summary.json`; latest kept checkpoint remains `perf-023`. |
| Rejected viewport-fit dirty candidate | Reverted resize/orientation-driven renderer-fit dirty gating because focused desktop actual FPS regressed by `0.03`, desktop all-scenario actual FPS regressed by `0.03`, sustained actual FPS regressed by `0.10`, and desktop-driving actual FPS regressed by `0.10` versus the fresh baseline. Candidate race/browser gates passed; post-revert validation passed race, browser, build, visual, candidate-identifier, and diff whitespace checks. | `perf-039-rejected-viewport-fit-dirty-summary.json`; latest kept checkpoint remains `perf-023`. |
| Rejected race-ranking allocation candidate | Reverted ranked-racer scratch reuse because focused desktop actual FPS improved by `1.56`, but the two-run candidate average regressed desktop all-scenario actual FPS by `0.67`. Candidate content and two browser gates passed; post-revert validation passed race, browser, build, visual, candidate-identifier, and diff whitespace checks. | `perf-040-rejected-race-ranking-allocation-summary.json`; latest kept checkpoint remains `perf-023`. |
| Kept production visual telemetry guard | Standard production skips visual-diagnostic telemetry construction while preserving HUD telemetry and standard DOM race state; dev/playtest visual diagnostics remain enabled for browser gates. | `perf-038-kept-production-visual-telemetry-guard-summary.json`; browser, build, release smoke, artifact safety, visual, and diff checks pass. Latest kept FPS checkpoint remains `perf-023`. |
| Race disable control | Added a Vite build-time disable flag that hides race entry points and converts direct `/#race` into a recovery screen without mounting the race canvas. | `npm run test:race:disable` pass plus default-enabled race/browser/hub/build/visual preservation passes. |
| API/data safety smoke | Aligned sync Function schema validation with current app schema `5`, added local Cloudflare Access/D1/FatSecret smoke, added authenticated same-schema backup restore, and added URL-mode safe-status/read-only smoke for supplied preview/prod URLs. | Local `npm run test:api:data` and URL-mode mock harness pass in `api-data-url-smoke-001-20260524T095257Z`; production URL/JWT/live FatSecret approval/bindings remain missing. |
| Core tracker regression smoke | Added a focused Playwright smoke for home, food, settings, local persistence, sync status, export/import, scanner surface, and return navigation. | `npm run test:core` pass and `npm run build` pass in `core-tracker-001-20260523T204431Z`. |
| Header/PWA/CSP smoke | Added a built-app smoke for `_headers`, delivered CSP, cache headers, manifest, service worker control, and offline app shell reload. | `npm run test:pwa`, `npm run test:release:smoke`, and `npm run build` pass in `csp-headers-001-20260523T233058Z`. |
| PWA update smoke | Added a versioned installed-app update smoke for service worker update and offline updated shell behavior. | `npm run test:pwa:update`, `npm run build`, syntax check, and `git diff --check` pass in `pwa-update-001-20260523T234355Z`. |
| Page lifecycle/audio smoke | Added lifecycle input-clear/frame-reset telemetry, safe audio suspend/resume handling, and a browser smoke for pagehide/pageshow, visibility, blocked Web Audio resume, and mute/unmute state. | `npm run test:lifecycle` plus race/browser/visual/hub/build preservation passes in `lifecycle-audio-001-20260523T210212Z`. |
| WebGL context-loss smoke | Added `webglcontextlost` handling that clears active input, suspends audio, stops the WebGL RAF path, records context-loss status, switches to the existing Canvas2D fallback, and exposes a visible race exit that clears `#race`. | Latest `npm run test:webgl` pass is in `release-telemetry-hardening-001-20260524T111734Z`; earlier preservation suite is in `webgl-context-001-20260523T214739Z`. |
| Bundle/asset budget report | Added `npm run test:bundle` to record local built artifact size by category, largest files, gzip/Brotli size, git commit, and dirty status. | `bundle-budget-001-20260523T222825Z`; status is recorded-not-accepted because release-owner budget targets are not supplied. |
| Lab readiness smoke | Added `npm run test:lab` to record local Web Vitals/Lighthouse-equivalent lab signals without adding a Lighthouse dependency. | `lab-001-20260523T224516Z`; status is recorded-not-accepted because release-owner Web Vitals/Lighthouse targets or a dated exception are not supplied. |
| Route-level lazy loading | Split heavy route modules out of the app entry chunk and replaced the race garage's visual-reference 3D sheet with a lightweight local sheet so the race route no longer imports the visual-reference module. | `lazy-route-001-20260523T225320Z`; preservation suite passes on repeat, entry chunk is `56.13 KiB`, and gate status remains recorded-not-accepted because total/gzip size increased slightly and no owner budget target exists. |
| Release operations templates | Added owner-neutral release operations runbook, draft release notes, and post-launch report template. | `release-ops-001-20260523T223417Z`; status is templates-recorded-not-signoff because preview/prod/Cloudflare rollback/monitoring evidence and release-owner approval are not supplied. |
| Release smoke harness | Added URL-capable release smoke for local built preview and future preview/prod URLs. | Latest `perf-038-production-visual-telemetry-guard-20260524T180000Z`; local built-preview smoke passes without production diagnostic/playtest globals, but preview/prod URL evidence, deployed headers, API bindings, Cloudflare rollback, monitoring, and sign-off remain missing. |
| Release artifact safety smoke | Added `npm run test:release:artifacts` to inspect built `dist` for source maps, `sourceMappingURL`, standalone playtest/debug files, scanned secret env names or known test secret values, runtime playtest automation strings, diagnostic telemetry globals, and visual-review route strings. | Latest `perf-038-production-visual-telemetry-guard-20260524T180000Z`; standard production artifact safety passes with all scanned diagnostic/playtest/visual-review runtime strings not detected. |
| Production playtest-hook behavior | Standard production builds disable `raceAutoplay`/`raceNoFinish` automation unless `VITE_RACE_PLAYTEST_HOOKS=true`; release smoke proves the autoplay query creates no playtest globals/samples, no diagnostic telemetry globals, and does not move the kart, while dev browser playtest automation still passes. | Latest `perf-038-production-visual-telemetry-guard-20260524T180000Z`; runtime playtest strings and diagnostic telemetry globals are not detected in the standard production build. |
| Production visual telemetry guard | Standard production now skips visual-diagnostic telemetry construction while preserving HUD telemetry and standard DOM race state. Dev/playtest diagnostics remain enabled for browser gates. | `perf-038-production-visual-telemetry-guard-20260524T180000Z`; `npm run test:race`, `npm run test:race:browser`, `npm run build`, `npm run test:release:smoke`, `npm run test:release:artifacts`, `npm run test:visual`, and `git diff --check` pass. |
| Release policy/decision audit | Added `npm run test:release:decisions` and refined the artifact classifier so shipped runtime automation strings, telemetry globals, and visual-review route strings are reported separately. | `release-policy-audit-001-20260524T031952Z`; decision audit records `17` decision categories and `119` `Not supplied` rows. Latest telemetry hardening in `perf-038-production-visual-telemetry-guard-20260524T180000Z` keeps runtime playtest, visual-review route, and diagnostic telemetry global matches out of the standard production build. |
| Production gate readiness audit | Added `npm run test:production:gates` to record the P0/P1 hard-gate matrix and local evidence-link integrity without inferring owner decisions. | Latest `perf-040-race-ranking-allocation-20260524T184127Z`; audit records `r3-blocked-gates-remain`, `2`/`21` P0 gates Proven, `2`/`14` P1 gates Proven, `11` DoD rows not Proven-like, `10` manual QA rows without a `4`/`5` score, cross-browser as Partial, device matrix as Partial, production cache headers as Partial, and CI/release automation as Partial. |
| Manual QA prep capture | Added `npm run test:qa:capture` to prepare route screenshots, a silent clip candidate, telemetry context, and a result template for human QA. | `manual-qa-prep-001-20260524T093705Z`; prep records desktop idle/speed/drift screenshots, mobile driving screenshot, `10.96s` WebM, and runtime telemetry, but no manual scores or fresh-user answer. |
| Accessibility smoke | Added `npm run test:accessibility` to prove local built-preview accessible names, duplicate-ID/image-alt checks, visible focus, keyboard mute toggle, reduced motion through standard DOM race state, desktop hiding of the mobile-only Go control, mobile Go touch, and representative contrast samples. | Latest `release-telemetry-hardening-001-20260524T111734Z`; local smoke passes, but manual target-browser/device accessibility sign-off remains missing. |
| Cross-browser smoke | Added `npm run test:cross-browser` to record local built-preview browser-engine behavior without inferring release sign-off. | `cross-browser-001-20260524T121434Z`; Playwright Chromium, Playwright Firefox, Playwright WebKit, and local Chrome pass, but actual Safari, Microsoft Edge, target devices, and release-owner sign-off remain missing. |
| Device-matrix smoke | Added `npm run test:device:matrix` to record local desktop and emulated-phone behavior without inferring physical-device sign-off. | `device-matrix-001-20260524T122649Z`; local desktop keyboard and emulated-phone touch acceleration pass in WebGL, but physical laptop/phone human playthrough and release-owner sign-off remain missing. |
| Deployed-header smoke | Added `npm run test:headers:deployed` to compare response headers with `public/_headers` locally or against a supplied URL. | `deployed-headers-001-20260524T123726Z`; local Cloudflare-style header simulation passes, but preview/production URL response-header evidence remains missing. |
| CI release workflow audit | Added `.github/workflows/race-production-gates.yml` and `npm run test:ci:release` to check workflow structure, triggers, setup, Playwright install, and release-gate command coverage. | `ci-release-automation-001-20260524T124743Z`; local audit passes, but actual GitHub Actions run URL, release-owner CI/manual policy, owner-accepted manual checklist, and dirty-worktree deploy decision remain missing. |
| Desktop race Go control | Added a scoped CSS override so the `sm:hidden` mobile Go button stays hidden on desktop despite later custom `.arcade-go-button` display rules. | `npm run test:accessibility` proves the desktop Go button is hidden; repeat `npm run test:race:browser` passes after the CSS fix. |
| Production dependency audit smoke | Added `npm run test:security:prod` to record `npm audit --omit=dev` and full `npm audit --json` artifacts in one evidence directory. | `security-prod-audit-001-20260524T012143Z`; production dependencies report zero vulnerabilities, but full audit still needs a dev/build-tool advisory upgrade or exception decision. |
| Local RC checklist evidence | Captured branch, commit, dirty status, current local build/race/browser/hub/visual/security command results, and browser summary in one release-candidate evidence directory. | `rc-local-checklist-001-20260524T013026Z`; local commands pass, but dirty deploy policy, actual CI run or owner-accepted manual release acceptance, preview/prod smoke, Cloudflare rollback, monitoring, and sign-off remain missing. |
| Local rollback drill smoke | Added `npm run test:release:rollback` to rehearse a current-candidate to known-good switch with copied local `dist` roots. | Latest `release-telemetry-hardening-001-20260524T111734Z`; local switch and known-good `/#race` WebGL smoke pass, but Cloudflare rollback target, deployment IDs, owner approval, post-rollback production smoke, monitoring/support, D1 rollback compatibility, and sign-off remain missing. |
| Monitoring/support readiness audit | Added `npm run test:monitoring:support` to verify the local runbook and post-launch template cover required production signals, triage steps, owner-input blockers, and launch-report sections without inventing owner decisions. | `monitoring-support-001-20260524T025102Z`; local structure passes, but provider/risk acceptance, support contact/path, privacy/log-retention posture, post-launch thresholds, deployed signals, and sign-off remain missing. |

## Still Not Proven

| Gate | Current state |
| --- | --- |
| Owner target locked | Blocked. `docs/race-visual-target-brief.md` and `docs/race-owner-review-packet.md` still show `Not supplied`. |
| V1 DoD proven | Not proven. `docs/race-v1-definition-of-done-checklist.md` still has Partial/Missing rows. |
| Desktop performance | Failing. Latest kept `perf-023` follow-up improved paired averages to `36.72` focused desktop actual FPS, `34.91` desktop all-scenario actual FPS, and `17.79` sustained actual FPS versus its fresh baseline, but these remain below the local `45` FPS floor and PRD `55` target. Latest rejected `perf-040` race-ranking allocation passed `npm run test:race` and two browser runs, but was reverted because desktop all-scenario actual FPS regressed by `0.67` versus the accepted fresh baseline despite focused desktop actual FPS improving by `1.56`. |
| Mobile playability | Partial. Browser mobile snapshots pass and local release smoke proves mobile touch acceleration, but no manual touch playthrough exists. |
| Manual QA | Missing. `docs/race-manual-qa-rubric.md` still has no dated scores; prep captures exist in `manual-qa-prep-001-20260524T093705Z`. |
| Fresh-user read | Missing. A `10.96s` silent clip candidate exists in `manual-qa-prep-001-20260524T093705Z`, but no reviewer answer exists. |
| IP/provenance | Not signed off. Audit exists but owner/legal/design approval is missing. |
| Product/design sign-off | Missing. First 30 seconds, camera, route, art density, HUD, and feedback are not signed off. |
| Accessibility | Partial technical progress only. Local built-preview accessibility smoke is proven, but target-browser/device manual accessibility review and release-owner acceptance or exception are not supplied. |
| Security/privacy | Partial. High audit findings were removed and `npm run test:security:prod` proves zero production dependency vulnerabilities, but full `npm audit` still exits `1` because fixing the remaining moderate Vite/esbuild/vite-plugin-pwa dev/build-tool advisories requires a semver-major Vite/vite-plugin-pwa upgrade or dated release-owner exception. Local CSP/header delivery, local deployed-header simulation, and local release artifact safety are proven; telemetry/privacy and log-retention posture, barcode/camera, real deployed-header evidence, and production audit split acceptance remain missing. |
| Preview/prod/rollback/monitoring | Partial technical progress only. Local race-disable route guard, local built-preview release smoke, local RC checklist commands, local copied-`dist` rollback drill, and local monitoring/support readiness audit are proven, but no production target, preview URL smoke, production URL smoke, Cloudflare rollback drill, release-owner activation policy, production monitoring/support activation or risk acceptance, or sign-off is supplied. |
| Release operations artifacts | Partial technical progress only. Release checklist, smoke, rollback, monitoring/support, release notes, post-launch templates, local RC command evidence, local CI workflow structure, a local rollback drill, and machine-checked monitoring/support template structure exist, but no owner approval, actual CI run or owner-accepted manual checklist, clean/dirty deploy decision, monitoring provider/risk decision, support contact/path, or executed deployment evidence is supplied. |
| Cloudflare Functions/D1/FatSecret/barcode scope | Partial technical progress only. Local sync/D1/FatSecret smoke now includes same-schema backup restore and URL-mode preview/prod API smoke tooling, and local core tracker, built-app CSP/PWA, built-preview release smoke, and local rollback drill are proven, but production scope, real bindings/secrets/JWT, owner-approved live FatSecret query, preview/prod URL smoke, barcode/camera policy, production rollback compatibility, and privacy/log-retention decisions are not supplied. |
| Cross-browser/device matrix | Partial technical progress only. Local built-preview smoke passes in Playwright Chromium, Playwright Firefox, Playwright WebKit, and local Chrome, and local desktop/emulated-phone device-matrix smoke passes, but actual Safari, Microsoft Edge, physical laptop/phone human playthrough, and release-owner sign-off are not supplied. |
| PWA/lifecycle/audio/WebGL reliability | Partial technical progress only. Local built-app CSP/PWA shell, installed-app update smoke, race lifecycle/audio smoke, built-preview WebGL context-loss fallback, and local release-smoke manifest/service-worker fetches are proven, but target-browser bfcache/page lifecycle/context-loss, autoplay/support policy, monitoring, production update behavior, and production deployed-header evidence are not supplied. |
| Bundle/asset budget | Partial technical progress only. Local route-level split and built-artifact size report are recorded, but total/gzip size increased slightly and no release-owner budget targets, acceptance, or dated exception is supplied. |
| Source map/debug release artifact | Proven locally for the standard production artifact. Local artifact smoke proves source maps, `sourceMappingURL`, standalone debug/playtest files, runtime playtest automation strings, diagnostic telemetry globals, and visual-review route strings are absent from the standard production `dist`; local release smoke proves standard production builds ignore playtest automation queries; `perf-038` proves standard production skips visual-diagnostic telemetry construction while preserving HUD race state. Deployed monitoring/source-map upload policy, if desired, remains part of the broader release/monitoring decisions. |
| Lighthouse/Web Vitals | Partial technical progress only. Local lab readiness evidence is recorded, but race route TBT proxy remains high and no production URL, deployed-header evidence, target browser/device matrix, Web Vitals/Lighthouse targets, or dated exception is supplied. |

## Required Decisions Before R3

Use `docs/race-owner-review-packet.md` and Section 7 of the production plan. The next required decisions are:

- Owner-approved visual target and source/license.
- Desktop/mobile target devices and browser floors.
- V1 vehicle/item/audio/progression scope.
- IP reviewer and item-name/provenance decisions.
- Cloudflare project/domain/branch/clean-deploy policy.
- Monitoring/privacy/log retention posture.
- Sync/D1/FatSecret/barcode production scope.
- CI/manual release gate policy, actual GitHub Actions run URL, or owner-accepted manual checklist.
- Race-disable activation policy, production env-var owner, or rollback-only recovery exception.
- Release owner, rollback owner, manual QA tester, and fresh-user reviewer.

## Next Implementable Work

Without guessing owner decisions, remaining implementable engineering work includes another measured performance pass from `docs/race-performance-next-pass-plan.md` principles. Do not close the performance gate until focused and sustained evidence meet the agreed floor/target.
