# Comeback City Kart Racer Production Readiness Plan

Status: draft for goal-mode execution, not production sign-off
Date: 2026-05-23
Owner: product/design/engineering/legal/release
Source PRD: `docs/comeback-city-kart-racer-prd.md`
Related blocker PRD: `docs/comeback-city-kart-racer-v1-blocker-resolution-prd.md`

## 1. Purpose

Make Comeback City Kart Racer production-ready, immersive, and playable at the highest practical quality bar for this app.

This plan is broader than the V1 blocker-resolution PRD. The blocker PRD closes the remaining game-quality blockers. This production readiness plan adds the missing release, reliability, operations, accessibility, security, privacy, deployment, rollback, monitoring, and post-launch gates required before anyone can responsibly call the kart racer production-ready.

Production-ready means all of these are true:

- The game feels and reads like a polished arcade kart racer to a human player.
- The first polished track, Comeback City GP, is immersive and original.
- Desktop keyboard and mobile touch are playable by humans, not only by harness automation.
- Performance is acceptable on agreed target devices and browsers.
- WebGL, PWA caching, deployment, rollback, and fallback behaviors are proven.
- Security, privacy, accessibility, IP/provenance, support, and release operations are explicitly signed off.
- Evidence exists for every claim.

## 2. Execution Rule

Read repo evidence and owner inputs before acting. When a required value depends on owner, product, design, legal, QA, or release input and the repo does not contain that input, record `Blocked - owner input required` and ask for the missing decision.

Claim production readiness only from a complete evidence set:

- local production build,
- automated race and app tests,
- browser screenshots and telemetry,
- completed manual QA,
- fresh-user review,
- approved visual target,
- signed IP/provenance review,
- preview and production smoke,
- rollback path,
- monitoring/support status.

## 3. Current Local Reality

Current stack:

- Vite, React, Three.js, and `vite-plugin-pwa`.
- PWA service worker registration in `src/main.jsx`.
- PWA/workbox configuration in `vite.config.js`.
- Cloudflare Pages headers in `public/_headers`.
- Cloudflare Pages output directory: `dist`.
- Cloudflare Pages Functions under `functions/api/sync/**` and `functions/api/fatsecret/**`.
- D1 sync schema under `migrations/0001_comeback_sync.sql`.
- Cloudflare deploy scripts in `package.json`:
  - `deploy:andrew`
  - `deploy:alexander`
- `wrangler.toml` uses `pages_build_output_dir = "./dist"` and names `comeback-tracker`.
- The preview/release planning target selected on 2026-06-01 is Cloudflare Pages project `showcase-designs-preview`, preview branch `comebacktrackerkartgame`, with planned branch URL `https://comebacktrackerkartgame.showcase-designs-preview.pages.dev`. On 2026-06-02, direct Wrangler Pages upload was accepted, and native Cloudflare Pages production rollback was selected as the clean rollback proof path because preview deployments are not valid rollback targets. On 2026-06-03, owner selected release branch `codex/release-v1-comebacktracker-kart-racer`, accepted a local manual release checklist if GitHub Actions is unavailable, approved direct-uploading the same clean build to production after preview smoke passes, approved enabling/configuring Cloudflare Web Analytics if missing and needed, and selected separate desktop/mobile manual QA result files. Later on 2026-06-03, owner approved switching to that release branch from the current working tree state, set release-owner identity to `isethius`, approved the planned preview URL as canonical if Wrangler confirms it, approved two safe production deployments for native rollback proof, and approved owner-supplied Cloudflare dashboard screenshots/details or owner-provided access if local Web Analytics confirmation is unavailable. Actual deployment URLs, deployment IDs, commit SHA, and smoke evidence remain pending.
- `public/_headers` currently sets `Permissions-Policy: camera=()`, while `src/components/BarcodeScanner.jsx` exists; release scope must reconcile camera policy with any production barcode-scanner requirement.
- Local race production gate workflow is present at `.github/workflows/race-production-gates.yml`; actual GitHub Actions run URL, release-owner CI/manual gate policy, and dirty-worktree deploy policy remain missing.
- No first-class Lighthouse CLI is currently present; a local Playwright lab-readiness equivalent is available through `npm run test:lab`, a URL-capable release smoke is available through `npm run test:release:smoke`, and a local rollback drill is available through `npm run test:release:rollback`.
- Local release operations templates are now present at `docs/race-release-operations-runbook.md`, `docs/race-release-notes-draft-2026-05-23.md`, and `docs/race-post-launch-report-template.md`; they are not release sign-off or executed deploy evidence.
- Existing deploy scripts use `--commit-dirty=true`; production release policy must confirm whether dirty direct uploads are allowed or restricted to preview/sandbox deploys.

Current automated commands:

```sh
npm run build
npm run test:accessibility
npm run test:bundle
npm run test:core
npm run test:cross-browser
npm run test:device:matrix
npm run test:headers:deployed
npm run test:api:data
npm run test:ci:release
npm run test:lifecycle
npm run test:pwa
npm run test:release:smoke
npm run test:release:rollback
npm run test:release:artifacts
npm run test:monitoring:support
npm run test:security:prod
npm run test:lab
npm run test:qa:capture
npm run test:race
npm run test:race:browser
npm run test:webgl
npm run test:hub
npm run test:visual
```

Current known game blockers from existing docs:

- Owner-approved target visual brief is supplied; manual gameplay/product sign-off against it remains missing.
- Desktop FPS is below the local floor and PRD target in latest kept FPS evidence; latest kept FPS follow-up is `.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z/`, which reduced race camera/fog far range to `580` and improved paired aggregate focused, desktop all-scenario, and sustained actual-FPS metrics but did not close the gate. Latest kept production-runtime hardening is `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/`, which skips visual-diagnostic telemetry construction in standard production while preserving HUD telemetry, dev/playtest diagnostics, browser gates, build, visual checks, release smoke, release artifact safety, and diff checks; it does not close the FPS gate. Latest rejected performance follow-up is `.agent/runs/kart-racer-production-readiness/evidence/perf-040-race-ranking-allocation-20260524T184127Z/`, where a race-ranking allocation candidate passed `npm run test:race` and two browser runs but was reverted because desktop all-scenario actual FPS regressed by `0.67` versus the accepted fresh baseline despite focused desktop actual FPS improving by `1.56`. Post-revert candidate-identifier scan, race, browser, build, visual, and `git diff --check` passed.
- Manual desktop keyboard QA is missing.
- Manual mobile touch QA is missing.
- Fresh-user 10 second read is missing.
- IP/provenance sign-off for the current asset set is recorded; repeat review is required only if new ChatGPT Image Gen assets, UI, item silhouettes, tracks, or audio are added before release.
- Product/design sign-off is missing.

Current production-readiness blockers added by this plan:

- Preview deployment target is selected as Cloudflare Pages project `showcase-designs-preview` branch `comebacktrackerkartgame`; production smoke/native rollback proof will use the selected Pages project's production deployment. The planned preview URL is approved as canonical if Wrangler confirms it. Actual deploy metadata and deployed smoke evidence remain pending.
- Release branch/project/domain policy is confirmed for this pass, and branch switch evidence exists for `codex/release-v1-comebacktracker-kart-racer`; clean checklist execution, deployed URLs, and deployment IDs remain pending.
- Monitoring/error-reporting/analytics owner and provider are selected; Cloudflare Web Analytics may be enabled/configured if missing and needed, owner-supplied dashboard screenshots/details or owner-provided access are acceptable if local confirmation is unavailable, and deployed monitoring signal evidence remains pending.
- A release smoke script is now defined, but no preview or production URL execution evidence is supplied.
- A local rollback drill is now proven, native Cloudflare Pages production rollback is selected, and two safe production deployments are approved for rollback proof. Production deployment IDs, executed rollback proof, and post-rollback production smoke are not supplied.
- Cross-browser and real-device matrix is not completed. Local built-preview cross-browser smoke is recorded for Playwright Chromium, Playwright Firefox, Playwright WebKit, and local Chrome, but actual Safari, Microsoft Edge, target devices, and release-owner sign-off are still missing.
- Device matrix is not completed. Local built-preview desktop viewport and emulated-phone smoke is recorded, but a physical laptop, physical modern phone, human playthrough, and release-owner sign-off are still missing.
- PWA update/cache behavior is not signed off.
- Security/privacy review for the app plus race telemetry is not completed.
- Support/incident runbook now has local intake, triage, signal, and monitoring-window templates, and its structure is machine-checked; Cloudflare-native monitoring, owner/admin-only V1 support path, privacy/log-retention posture, and post-launch window are selected, while production signal path and owner sign-off are still missing.
- Post-launch monitoring window and success thresholds are not defined.
- CI versus manual release-gate policy is not confirmed. Workflow structure is recorded locally, but no GitHub Actions run URL, owner-approved manual acceptance path, or dirty-worktree deploy decision is supplied.
- Cloudflare Functions sync, backups, FatSecret proxy, secrets, and D1 migration smoke checks are defined through `npm run test:api:data`; the command now supports both local mocked proof and safe read-only URL-mode probes for supplied preview/prod URLs. Production release scope and binding evidence are still missing.
- Local mocked sync/D1/FatSecret smoke is now available through `npm run test:api:data`; latest evidence is `.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z/`. It proves current schema `5`, sync state writes/readbacks/conflicts, D1 backup creation/listing, authenticated same-schema backup restore with a safety backup, old-schema restore rejection, and FatSecret success/error paths. URL-mode harness behavior is proven against a deployment-shaped local mock at `.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z/url-mode-mock/api-data-smoke-summary.json`, but real preview/prod URL, Access JWT, FatSecret live-query approval, D1 binding/migration evidence, production API scope, and secret evidence are still missing.
- Local core tracker regression smoke is now available through `npm run test:core`; local built-preview release smoke also covers home, food, settings, and race navigation through `npm run test:release:smoke`; preview and production URL smoke evidence is still missing.
- Local built-preview cross-browser smoke is now available through `npm run test:cross-browser`; latest evidence is `.agent/runs/kart-racer-production-readiness/evidence/cross-browser-001-20260524T121434Z/cross-browser-smoke-summary.json`. It proves route load, `/#race` WebGL render, keyboard acceleration, screenshots, and race-exit recovery in Playwright Chromium, Playwright Firefox, Playwright WebKit, and local Chrome. It records Microsoft Edge as unavailable and actual Safari as not automated, so target-browser/device sign-off remains missing.
- Local built-preview device-matrix smoke is now available through `npm run test:device:matrix`; latest evidence is `.agent/runs/kart-racer-production-readiness/evidence/device-matrix-001-20260524T122649Z/device-matrix-smoke-summary.json`. It proves local desktop viewport keyboard acceleration and emulated-phone touch acceleration with WebGL race screenshots. It does not replace physical laptop/phone manual playthrough or release-owner sign-off.
- Local built-app header/PWA/CSP smoke is now available through `npm run test:pwa`; latest evidence is `.agent/runs/kart-racer-production-readiness/evidence/csp-headers-001-20260523T233058Z/`. It proves local `_headers` parity, delivered `Content-Security-Policy`, cache headers, manifest metadata, service worker install/control, and offline app shell reload. Barcode/camera scope, deployed response headers, target-browser lifecycle, and audio autoplay evidence are still missing.
- Local deployed-header smoke is now available through `npm run test:headers:deployed`; latest evidence is `.agent/runs/kart-racer-production-readiness/evidence/deployed-headers-001-20260524T123726Z/deployed-headers-smoke-summary.json`. It proves the response-header comparator and local Cloudflare-style `_headers` simulation for CSP, Permissions-Policy, security headers, service-worker cache headers, manifest cache headers, and hashed asset cache headers. Real preview/production URL response-header evidence is still missing.
- Local installed-app PWA update smoke is now available through `npm run test:pwa:update`; latest evidence is `.agent/runs/kart-racer-production-readiness/evidence/pwa-update-001-20260523T234355Z/`. It proves a local installed service worker updates from v1 to v2, emits `updatefound` and `controllerchange`, loads the v2 app shell online, and keeps the v2 shell available offline. Production URL and target-browser/device update evidence are still missing.
- Local page lifecycle/audio smoke is now available through `npm run test:lifecycle`; target-browser bfcache/lifecycle, production deployment, and support/autoplay owner decisions are still missing.
- Local built-preview WebGL context-loss smoke is now available through `npm run test:webgl`; target-browser/device context-loss evidence is still missing.
- Local route-level lazy loading now splits the app entry from home, world, race, visual-reference, tracker, and settings routes. Latest evidence is `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/`; the entry chunk is `56.13 KiB`, the race chunk is `252.27 KiB`, and the largest chunk is now the visual-reference chunk at `3213.89 KiB`. Total built size and gzip size increased slightly, so this is release-readiness progress, not bundle-budget acceptance.
- Local built-artifact bundle/asset size report is available through `npm run test:bundle`; latest local evidence is `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-004-20260601T191542Z/bundle-asset-budget-report.json`. Owner delegated a kart-racer V1 baseline on 2026-06-01; latest evidence records `bundle-budget-pass` with total built artifact `7.599 MiB` raw and `4043.17 KiB` gzip against limits of `8.5 MiB` raw and `4600 KiB` gzip. Deployed preview/prod release evidence remains pending.
- Local Playwright lab-readiness smoke is now available through `npm run test:lab`; latest evidence is `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-004-20260601T191542Z/lab-readiness-smoke-summary.json`. Owner delegated a conservative V1 baseline on 2026-06-01; latest local evidence records `lab-baseline-pass` with home LCP `288ms`, race LCP `964ms`, home/race CLS below `0.1`, race startup TBT proxy `1870ms` against a `2500ms` guardrail, and race max long task `813ms` against a `1000ms` guardrail. Deployed preview/prod evidence remains pending.
- Local built-preview accessibility smoke is now available through `npm run test:accessibility`; latest evidence is `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/accessibility-smoke-summary.json`. It proves accessible names, no duplicate IDs, no visible images without alt, visible keyboard focus, keyboard mute-toggle operation, reduced-motion propagation through DOM state, desktop hiding of the mobile-only Go control, mobile Go touch acceleration, and representative contrast samples locally. Manual target-browser/device accessibility sign-off is still missing.
- Release operations templates are now available in `docs/race-release-operations-runbook.md`, draft release notes in `docs/race-release-notes-draft-2026-05-23.md`, and post-launch report template in `docs/race-post-launch-report-template.md`; release-owner approval and executed preview/prod/rollback/monitoring evidence are still missing.
- Local built-preview release smoke is now available through `npm run test:release:smoke`; latest evidence is `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-release-smoke-summary.json`. It proves local built app home/food/settings navigation, `/#race` WebGL load, nonblank race canvas, desktop keyboard acceleration, mobile touch acceleration, race exit hash cleanup, manifest fetch, service-worker fetch, and disabled production playtest/telemetry globals. It does not prove preview/prod URLs, deployed response headers, authenticated D1 sync, FatSecret production bindings, Cloudflare rollback, monitoring, or sign-off.
- Local rollback drill smoke is now available through `npm run test:release:rollback`; latest evidence is `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/release-rollback-smoke-summary.json`. It proves a local built `dist` can switch from a current-candidate root to a known-good root and then load `/#race` as WebGL on the known-good root. It does not prove Cloudflare production rollback, deployed headers, D1 rollback compatibility, monitoring/support, rollback owner approval, or sign-off.
- Local release artifact safety smoke is now available through `npm run test:release:artifacts`; latest classified artifact evidence is `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-release-artifact-safety-report.json`. It proves local built `dist` has no source map files, no `sourceMappingURL` references, no standalone playtest/debug files, no scanned secret env names or known test secret values, no detected runtime playtest automation strings, no detected diagnostic telemetry globals, and no detected `visual-kart` route/mode strings in the standard production build. Standard production builds still ignore `raceAutoplay`/`raceNoFinish` automation unless `VITE_RACE_PLAYTEST_HOOKS=true`; latest local built-preview release smoke proves the query does not create playtest or telemetry globals and does not move the kart.
- Local release decision audit is now available through `npm run test:release:decisions`; latest evidence `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-010-20260603T150000Z/release-decision-readiness-summary.json` records `0` missing decision categories and `19` current `Not supplied` execution-evidence rows after Q48-Q52 owner-answer sync. Deployed smoke metadata, rollback evidence, monitoring signals, manual QA, and sign-offs remain execution blockers.
- Local CI release automation audit is now available through `npm run test:ci:release`; latest evidence is `.agent/runs/kart-racer-production-readiness/evidence/ci-release-automation-001-20260524T124743Z/ci-release-automation-summary.json`. It proves the local workflow structure, expected triggers, Node setup, Playwright install step, and release-gate command list in `.github/workflows/race-production-gates.yml`. It does not prove an actual GitHub Actions run, release-owner CI/manual policy, owner-accepted manual checklist, or dirty-worktree deploy approval.
- Local P0/P1 production gate audit is now available through `npm run test:production:gates`; latest evidence `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-010-20260603T150000Z/production-gate-readiness-summary.json` records `r3-blocked-gates-remain`, `7`/`21` P0 gates Proven, `5`/`14` P1 gates Proven, `10` DoD rows not Proven-like, `10` manual QA rows without a `4`/`5` score, `19` `Not supplied` rows, and no evidence link failures after Q48-Q52 owner-answer sync. Owner visual target, production target, current IP/provenance scope, data/API scope-out, P1 lab/Web Vitals, P1 bundle-budget, and P1 support-runbook gates are Proven locally; cross-browser matrix, device matrix, production cache headers, CI/release automation execution, release notes, post-launch review, manual QA, rollback, monitoring, and deployed evidence gates remain Partial or Missing.
- Local manual QA capture prep is now available through `npm run test:qa:capture`; latest evidence is `.agent/runs/kart-racer-production-readiness/evidence/manual-qa-prep-001-20260524T093705Z/manual-qa-capture-summary.json`. It records local built-preview `/#race` desktop idle/speed/drift screenshots, a mobile Go-touch driving screenshot, a `10.96s` silent WebM clip candidate, and runtime telemetry. It does not replace human desktop/mobile QA scores, a fresh-user reviewer answer, or release-owner sign-off.
- Local production dependency audit smoke is now available through `npm run test:security:prod`; latest evidence is `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-004-20260601T191542Z/security-production-audit-summary.json`. It proves production-only and full `npm audit` both report zero vulnerabilities after upgrading Vite, `@vitejs/plugin-react`, `vite-plugin-pwa`, and `workbox-window`.
- Local monitoring/support readiness audit is now available through `npm run test:monitoring:support`; latest evidence is `.agent/runs/kart-racer-production-readiness/evidence/monitoring-support-001-20260524T025102Z/`. It proves the runbook/template structure covers 12 monitoring signals, 11 support steps, 6 owner-input blockers, and 7 post-launch template sections. Cloudflare-native monitoring, owner/admin-only V1 support path, and the 24-hour post-launch window are selected; deployed signals and sign-off remain required.
- Local RC checklist evidence is now recorded at `.agent/runs/kart-racer-production-readiness/evidence/rc-local-checklist-001-20260524T013026Z/`. It proves current local `npm run build`, `npm run test:race`, `npm run test:race:browser`, `npm run test:hub`, `npm run test:visual`, and `npm run test:security:prod` pass, records branch `main` and commit `9fb87c26bcdec19e8175f63a09e490f5400231aa`, and records a dirty worktree. It does not approve dirty production deploys, replace actual CI/manual release-gate acceptance, or prove preview/prod deploy, Cloudflare rollback, monitoring/support, or sign-off.
- Barcode scanner/camera permission policy is not resolved.
- Race disable activation policy is not supplied; local technical behavior is now documented in `docs/race-disable-recovery-runbook.md`.
- Lighthouse/Core Web Vitals local acceptance is defined through the owner-delegated conservative V1 lab baseline and currently passes locally; deployed preview/prod evidence is still required before R3.
- Page visibility, bfcache, background-tab resume, and Web Audio autoplay behavior are not release-gated.
- Clean production commit/deploy policy is not defined.

## 4. Research Inputs

Internal sources:

- `docs/race-kart-v1-planning-index.md`
- `docs/comeback-city-kart-racer-v1-blocker-resolution-prd.md`
- `docs/race-kart-v1-acceptance-audit.md`
- `docs/race-v1-definition-of-done-checklist.md`
- `docs/race-v1-blocker-backlog.md`
- `docs/race-performance-next-pass-plan.md`
- `docs/race-owner-review-packet.md`
- `docs/race-manual-qa-rubric.md`
- `docs/race-ip-provenance-audit.md`
- `docs/race-pr-evidence-template.md`
- `docs/race-first-30-seconds-vertical-slice-plan.md`
- `package.json`
- `vite.config.js`
- `wrangler.toml`
- `public/_headers`

External primary-source findings:

- Vite production deployment starts from `vite build`; local production verification should run against the production build. Source: [Vite build docs](https://vite.dev/guide/build).
- Cloudflare Pages preview deployments provide branch or PR-specific URLs before production. Source: [Cloudflare Pages preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/).
- Cloudflare Pages rollbacks can revert to a previous production deployment, but preview deployments are not rollback targets. Source: [Cloudflare Pages rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/).
- Cloudflare Pages build configuration supports build commands, output directories, and environment variables such as branch, commit SHA, and deployment URL. Source: [Cloudflare Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/).
- Wrangler direct upload deploys prebuilt assets and supports branch preview deployment. Source: [Cloudflare Pages direct upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).
- Cloudflare Pages can enable Web Analytics from the Pages project Metrics tab; Pages automatic setup injects the analytics snippet on the next deployment. Source: [Cloudflare Web Analytics setup](https://developers.cloudflare.com/web-analytics/get-started/).
- Browser rendering at 60 Hz leaves about 16.66 ms per frame, and practical work should fit within a tighter frame budget to keep animation smooth. Source: [web.dev rendering performance](https://web.dev/articles/rendering-performance).
- Three.js scene performance is affected by object and draw overhead; merging or instancing repeated objects is a standard optimization path, but it must be proven by actual frame results. Source: [Three.js optimize lots of objects](https://threejs.org/manual/en/optimize-lots-of-objects.html).
- WebGL context loss is a real browser event and must be handled or tested, not ignored. Source: [MDN webglcontextlost](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event).
- Nonessential interaction-triggered motion must be controllable for users sensitive to motion. Source: [W3C WCAG 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).
- OWASP ASVS provides a basis for web application security verification and secure development requirements. Source: [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/).
- Service worker updates must be treated as lifecycle work so users move cleanly onto a coherent app version. Source: [web.dev service worker lifecycle](https://web.dev/articles/service-worker-lifecycle).
- Core Web Vitals measure loading, interactivity, and visual stability through LCP, INP, and CLS, and provide product-level performance signals beyond race FPS. Source: [web.dev Web Vitals](https://web.dev/articles/vitals).
- Content Security Policy controls which resources a page can load and execute; this app should decide and test a CSP before production. Source: [MDN Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy).
- Permissions Policy controls browser feature access such as camera and autoplay; current headers must match scanner/audio product scope. Source: [MDN Permissions-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy).
- Cloudflare Pages `_headers` files can apply security and cache headers, and duplicate header rules are combined. Source: [Cloudflare Pages headers](https://developers.cloudflare.com/pages/configuration/headers/).
- Cloudflare Pages Functions bindings and secrets are separate production concerns from static assets. Source: [Cloudflare Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/).
- Cloudflare Pages Functions logs are available through Cloudflare dashboard or Wrangler, so API support and incident workflows should include that path. Source: [Cloudflare Pages debugging and logging](https://developers.cloudflare.com/pages/functions/debugging-and-logging/).
- `npm audit` reports known vulnerabilities for project dependencies to the configured registry. Source: [npm audit docs](https://docs.npmjs.com/cli/v7/commands/npm-audit/).
- WebGL best practices call out context loss and mobile constraints; the release plan should test context loss and restoration/fallback. Source: [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).
- Page Visibility events let the app react when the page is hidden or shown, which matters for game pause/resume and frame timing. Source: [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).
- Browser autoplay rules apply to Web Audio and media; race audio should start from user interaction and degrade cleanly when autoplay is blocked. Source: [MDN Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).
- OWASP logging guidance highlights that logs can contain personal or sensitive data; production logs must be reviewed before adding telemetry. Source: [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).
- OWASP HTTP header guidance provides a checklist for security response headers. Source: [OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html).

## 5. Readiness Levels

Use these levels during goal-mode execution.

| Level | Meaning | Exit requirement |
| --- | --- | --- |
| `R0 Planning Ready` | This plan exists and is linked. | Planning artifact only. |
| `R1 V1 Game Candidate` | The game meets all V1 gameplay gates in local evidence. | V1 DoD rows are `Proven` except production-only rows. |
| `R2 Release Candidate` | Build, tests, QA, IP, design, accessibility, security, and deploy-preview gates pass. | Production deploy can be attempted. |
| `R3 Production Ready` | Production deploy, smoke, rollback drill, monitoring, and support gates pass. | Release owner signs off. |
| `R4 Post-Launch Stable` | Production has passed the monitoring window without P0/P1 issues. | Post-launch report is complete. |

## 6. Goal-Mode Execution Contract

### Goal Ledger Requirement

Create a durable goal ledger before starting native `/goal` execution.

Current repo check:

- `.agent/` is absent.
- `scripts/init_goal_ledger.py` is absent.

Use this ledger path unless the owner chooses another:

```text
.agent/runs/kart-racer-production-readiness/
```

Required ledger files:

```text
.agent/GOALS.md
.agent/runs/kart-racer-production-readiness/GOAL.md
.agent/runs/kart-racer-production-readiness/implementation-notes.html
.agent/runs/kart-racer-production-readiness/evidence/
```

Create `GOAL.md` with:

```md
# Comeback City Kart Racer Production Readiness Goal

Objective: Implement Comeback City Kart Racer Production Readiness from docs/comeback-city-kart-racer-production-readiness-plan.md.

Finishing Criteria:
- Every P0 production gate is Proven.
- Every P1 production gate is Proven or has explicit release-owner exception with a dated follow-up.
- docs/race-v1-definition-of-done-checklist.md has every row Proven.
- Manual QA records every category at 4+.
- Preview and production smoke, rollback, monitoring/support, and sign-off evidence are recorded.

Runtime Goal Coupling:
Maintain the agent-owned ledger at .agent/runs/kart-racer-production-readiness and keep implementation-notes.html current at checkpoints, before compaction, and before final handoff.

Escape Hatch:
Pause, ask the user, or mark a scoped item [blocked] / [incomplete] if validation contradicts the goal, the goal requires a scope change, progress loops without measurable improvement, the next step risks deleting durable memory, the PRD and repo disagree, or the ledger itself contaminates validation.
```

Create `implementation-notes.html` with these sections:

- `Resume Here`
- `Current Phase`
- `Completed Work`
- `Active Work`
- `Blockers`
- `Next Exact Action`
- `Validation Status`
- `Evidence Links`
- `Protected Paths And User-Owned Work`
- `Decisions And Tradeoffs`
- `Progress Timeline`
- `Next Goal Candidates`

Append one compact event to the inline `progressEvents` array whenever execution reality changes:

- after each validation command,
- after each meaningful implementation checkpoint,
- after each blocker appears,
- before compaction or interruption handoff,
- before final response.

Recommended goal prompt:

```text
/goal
Goal: Implement Comeback City Kart Racer Production Readiness from docs/comeback-city-kart-racer-production-readiness-plan.md.

Success means:
  - Every P0 production gate in the plan is Proven.
  - Every P1 production gate is Proven or has explicit release-owner exception with a dated follow-up.
  - docs/race-v1-definition-of-done-checklist.md has every row Proven.
  - docs/race-manual-qa-rubric.md or a dated QA result records all categories at 4+.
  - Preview and production deployment smoke evidence, rollback evidence, monitoring/support status, and sign-offs are recorded.
  - Cloudflare Functions, D1 sync, FatSecret proxy, core tracker flows, and race-disable/rollback controls are either proven or explicitly scoped out.

Stop when: The plan reaches R3 Production Ready with evidence paths recorded, or when a required owner/legal/release decision blocks progress and the blocker is documented.

Constraints:
  - Read repo evidence and owner-supplied decisions before implementation.
  - Ask for missing owner/legal/release decisions when the repo does not contain them.
  - Preserve every currently passing race gate while improving gameplay, performance, and release readiness.
  - Maintain the agent-owned ledger at .agent/runs/kart-racer-production-readiness and keep implementation-notes.html current at checkpoints, before compaction, and before final handoff.
  - Update the affected evidence docs as each gate changes status.
```

Goal-mode operating rules:

- Start from `docs/race-kart-v1-planning-index.md`.
- Keep this plan as the top-level execution checklist.
- Keep `.agent/runs/kart-racer-production-readiness/implementation-notes.html` as the canonical live state during execution.
- Create implementation branches with the `codex/` prefix unless the owner says otherwise.
- Use owner-approved values for visual, scope, IP, deployment, and telemetry decisions.
- Use existing race modules and tests before adding new architecture.
- Change one performance variable at a time.
- Capture screenshots and telemetry after every material race-quality change.
- Re-run relevant tests before declaring any phase done.
- Update affected docs when a gate changes status.
- Append a progress event to the goal ledger at each checkpoint.

Pause and request input when:

- Owner target visual reference is now supplied; manual product/design sign-off still required.
- Item-name IP direction is now supplied for the currently risky player-facing terms; final file-level binary provenance and screenshot similarity sign-off still required.
- Missing production Cloudflare project/domain decision.
- Monitoring/privacy decision for production telemetry is supplied; deployed signals and final sign-off still required.
- Performance work repeatedly regresses existing camera, steering, route, or visual gates.
- A manual QA category remains below `4`.

## 7. Required Owner Decisions

These must be supplied before production readiness can close.

| Decision | Why it matters | Status |
| --- | --- | --- |
| Approved visual composition target | Camera, kart size, horizon, art density, HUD, and first impression require it. | Approved reference supplied on 2026-06-01 at `src/assets/game/reference/comeback-city-original-reference.png`; SHA-256 `8d4aef74073da4c86b5360163478b978fe5c3101371bc7a8d18d7390e4003c55`. Composition notes are recorded in `docs/race-visual-target-brief.md`; manual product/design sign-off remains pending. |
| Desktop-first, mobile-first, or equal priority | Performance and camera tradeoffs differ by target. | Equal desktop and mobile. |
| Minimum desktop device/browser | FPS acceptance must map to actual hardware. | Latest two stable Chrome, Edge, Safari, and Firefox on one Windows laptop and one Mac laptop with integrated graphics. |
| Minimum mobile device/browser | Touch and WebGL acceptance must map to actual hardware. | iOS Safari and Android Chrome on iPhone 12+, iPhone SE 2nd generation low-end iOS check, and Pixel 6a+. |
| Kart-only V1 or retained hover/plane modes | Scope affects controls, QA, route design, and bug surface. | Kart and hover-plane modes in scope on separate tracks. |
| V1 item/audio scope | Production claims change if items/audio are staged out. | Items and audio are required. |
| Standalone race or city-progression integration | Release smoke and product metrics differ. | City/progression integration is required. |
| HUD direction | Determines design sign-off and visual test thresholds. | Use genre-familiar arcade kart-racer UI patterns and readability, but do not copy exact/protected UI, trade dress, characters, logos, sounds, item shapes, tracks, screenshots, names, or protected assets. |
| Production Cloudflare Pages project/domain | Deploy and rollback proof require a target. | Selected: locally visible Cloudflare Pages project `showcase-designs-preview`. Preview branch is `comebacktrackerkartgame`, planned URL `https://comebacktrackerkartgame.showcase-designs-preview.pages.dev`; owner approved using it as canonical if Wrangler confirms it after deployment. After preview smoke passes, direct-upload the same clean build to the selected Pages project production environment for production smoke and native rollback proof. No separate custom production domain is required for this pass. Actual deployed URLs, deployment IDs, commit SHA, and smoke evidence remain pending. |
| Monitoring/error provider or explicit no-provider risk acceptance | Production support needs an observable failure path. | Cloudflare-native monitoring selected for V1: enable/configure Cloudflare Web Analytics for Pages if missing and needed; Workers Logs only when Functions/API scope ships; no third-party provider for this release. If local CLI/API confirmation is unavailable, owner-supplied Cloudflare dashboard screenshots/details or owner-provided access are acceptable evidence. Deployed signal evidence remains pending. |
| Analytics/privacy posture for race metrics | Race metrics must include only approved, privacy-safe fields. | Privacy-safe Cloudflare-native posture selected: page/performance analytics only for V1, structured logs only when Functions ship, no food/health payloads, emails, tokens, raw request bodies, or user identifiers in logs. |
| Sync/cloud API production scope | Pages Functions, D1, backups, and Cloudflare Access checks differ if sync is in scope. | Scoped out of immediate kart-racer production readiness; owner/admin follow-up dated 2026-06-08 for smoke inputs, bindings, and production scope. |
| FatSecret and barcode scanner production scope | API secrets, external nutrition requests, and camera permissions differ if food scanning/search is in scope. | Scoped out of immediate kart-racer production readiness; owner/admin follow-up dated 2026-06-08 for FatSecret proxy, barcode scanner, camera permissions, smoke inputs, secrets/bindings, and live-query approval. |
| CI versus manual release gates | Release evidence differs if checks run in CI or from a local release checklist. | Owner accepted a local manual release checklist on 2026-06-03 if GitHub Actions is unavailable and confirmed on 2026-06-03 that the full local manual release checklist should run after a clean working tree is created. Release gate requires clean branch/worktree `codex/release-v1-comebacktracker-kart-racer`, passing CI-equivalent local release gate, owner manual checklist sign-off by `isethius`, preview URL smoke, production URL smoke, deployed header smoke, rollback proof, and monitoring/support status before R3. Actual checklist execution or CI run URL remains pending. |
| Race disable or kill-switch policy | Production recovery differs if rollback is the only mitigation versus a rebuild/redeploy race disable control. Local technical flag evidence exists at `.agent/runs/kart-racer-production-readiness/evidence/race-disable-001-20260523T200640Z/`. | Owner/admin only; primary recovery is native Cloudflare Pages rollback to a known-good production deployment; secondary race-only recovery is a clean redeploy with `VITE_RACE_DISABLED=true` when the race is broken but core tracker should stay live. Preview redeploy is supplemental only because preview deployments are not valid rollback targets. |
| Clean production deploy policy | Existing scripts allow dirty deploys; release owner must define allowed production deploy state. | Owner approved switching to `codex/release-v1-comebacktracker-kart-racer` from the current working tree state on 2026-06-03; branch evidence is recorded at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-010-20260603T150000Z/git-branch-after-q48.log`. Owner approved committing all current project changes on the release branch on 2026-06-03 to reach a clean working tree, with the commit message explaining the move to a clean working tree. Decision evidence and redacted secret-scan handling are recorded at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-011-20260603T155244Z/owner-decision-intake-011.md` and `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-011-20260603T155244Z/secret-content-scan-redacted.md`; local `.dev.vars`, `.env.local`, and `.wrangler/` are ignored and must not be staged. Production-readiness deploy still requires clean checklist execution; current dirty local RC evidence is not production-release-accepted. |
| Web Vitals/Lighthouse target | Production page-quality acceptance requires agreed targets or explicit exception. | Conservative V1 baseline selected on 2026-06-01: home FCP <= `2000ms`, home LCP <= `2500ms`, home CLS <= `0.1`, home TBT proxy <= `300ms`, race FCP <= `2000ms`, race LCP <= `2500ms`, race CLS <= `0.1`, race WebGL startup TBT proxy <= `2500ms`, and race max long task <= `1000ms`. Latest local evidence passes; deployed preview/prod evidence remains pending. |
| Telemetry retention and log redaction owner | Race and tracker logs need a privacy-safe retention/redaction policy. | Owner/admin; Cloudflare plan default retention; logs must avoid food/health payloads, emails, tokens, raw request bodies, and user identifiers. |
| IP/provenance reviewer | Legal/design sign-off must have an owner. | Owner/product designer is the current product/design/IP reviewer. Production bitmap assets must be custom ChatGPT Image Gen outputs, repo-native/code-native/procedural assets are allowed, and no external stock/game assets are approved. Owner confirmed on 2026-06-01 that the current bitmap inventory in `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-006-20260601T205430Z/owner-decision-intake-006.md` was made with ChatGPT Image Gen for this project. Owner approved reference-derived plaza measurement scope and protected-similarity review for current screenshots/captures on 2026-06-02. Separate legal reviewer is not supplied. |
| Item naming/IP decision | Player-facing item names, cue ids, and item shapes need a safe original direction. | Stricter V1 direction selected after owner-delegated research on 2026-06-01: `Guard Gel`, `Comeback Surge`, `Fuel Magnet`/fuel tokens, `Slick Gel`, and `surge-*` cue ids. Internal implementation keys may remain where needed to preserve tested mechanics. Evidence: `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-005-20260601T201921Z/owner-decision-intake-005.md`. |
| Manual QA tester and fresh-user reviewer | Implementer-only review is not enough. | Owner only for manual QA sign-off; no separate fresh-user tester required by owner decision on 2026-06-01. Owner manual QA first-pass hardware is Mac mini M4 with Brave and iPhone 16 Pro with Safari; separate dated desktop and mobile QA result files are required; run date/time, scores, and evidence remain pending. |
| Launch owner and rollback owner | Release operations need accountable humans. | `isethius` (owner/admin) is the release-owner and rollback-owner identity for this release. |

## 8. Hard Gates

### P0 Gates

Production readiness closes only when every P0 gate is closed.

Latest local hard-gate matrix: `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-010-20260603T150000Z/production-gate-readiness-summary.json`. Current status is `r3-blocked-gates-remain`: `7`/`21` P0 gates Proven, `5`/`14` P1 gates Proven, `10` DoD rows not Proven-like, `10` manual QA rows without a `4`/`5` score, `19` `Not supplied` rows, and no evidence link failures after Q48-Q52 sync.

| Gate | Acceptance |
| --- | --- |
| Owner target locked | `docs/race-visual-target-brief.md` is filled with approved target and decisions. |
| V1 DoD proven | `docs/race-v1-definition-of-done-checklist.md` has every row `Proven`. |
| Desktop performance | Agreed desktop target is met in sustained and focused race evidence. |
| Mobile playability | Manual touch playthrough passes on agreed mobile target. |
| Manual QA | Every rubric category scores `4+`. |
| Fresh-user read | Fresh user describes the 10 second clip as a race/kart race or close equivalent. |
| IP/provenance | All race assets, generated assets, item names, audio, and references are approved or removed. |
| Product/design | First 30 seconds, camera, track, art density, HUD, and feedback are signed off. |
| Build and tests | `npm run build`, `npm run test:race`, `npm run test:race:browser`, `npm run test:hub`, and `npm run test:visual` pass or owner explicitly scopes a command out with rationale. Latest local RC checklist evidence: `.agent/runs/kart-racer-production-readiness/evidence/rc-local-checklist-001-20260524T013026Z/`; all listed commands pass, with `24` browser races and `28` visual/control/fallback checks. |
| Core tracker regression | Home, food, settings, local persistence, sync status, export/import if present, and return navigation pass smoke after race changes. Local smoke command: `npm run test:core`; latest evidence: `.agent/runs/kart-racer-production-readiness/evidence/core-tracker-001-20260523T204431Z/`. |
| Data safety | Local storage migration, cloud sync migration, backup/restore, conflict handling, and rollback data compatibility are proven or scoped out. Local mocked D1 backup restore evidence exists at `.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z/`; Cloudflare sync/D1 production scope is explicitly scoped out of immediate kart-racer readiness with owner/admin follow-up dated 2026-06-08. |
| Functions/API safety | In-scope Pages Functions, D1 sync, Access JWT, backup endpoints, FatSecret proxy, and external API error states pass smoke with production-like env. Local mocked smoke and URL-mode deployed-probe harness are available through `npm run test:api:data`; latest evidence is `.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z/`; Cloudflare Functions, D1 sync, FatSecret proxy, barcode, and camera are explicitly scoped out of immediate kart-racer readiness with owner/admin follow-up dated 2026-06-08. |
| Header/permission safety | CSP decision, cache headers, Permissions-Policy, and camera/autoplay requirements match production app scope. Local built-app smoke command: `npm run test:pwa`; latest evidence: `.agent/runs/kart-racer-production-readiness/evidence/csp-headers-001-20260523T233058Z/`. Local CSP/cache/header delivery is proven, barcode/camera are scoped out until 2026-06-08, and deployed headers plus target-browser audio/autoplay evidence remain open. |
| Production target | Cloudflare project/domain/branch policy is confirmed. Preview target is `showcase-designs-preview` branch `comebacktrackerkartgame`; planned preview URL is canonical if Wrangler confirms it; production smoke/native rollback proof uses the selected Pages project's production deployment URL from Wrangler/Cloudflare output after preview smoke passes. Actual deploy metadata remains required. |
| Preview smoke | Preview deployment passes race and app smoke checks. |
| Production smoke | Production deployment passes race and app smoke checks. |
| Rollback drill | Rollback target and rollback steps are proven or rehearsed on a safe production deployment. Native Cloudflare Pages production rollback is selected for rollback proof, two safe production deployments are approved for rollback proof, and local-only rehearsal exists at `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/release-rollback-smoke-summary.json`, but Cloudflare production deployment IDs, deployed headers, post-rollback production smoke, monitoring/support, and D1 rollback compatibility remain required. |
| Race disable/recovery control | Release owner can bypass, hide, disable, or roll back `/#race` quickly without trapping users or losing tracker data. |
| Security/privacy | Security headers, dependency audit, release artifact safety, local/cloud data handling, and telemetry privacy are reviewed. Latest classified artifact and behavior evidence: `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/`; standard production `dist` now has no detected runtime playtest automation strings, diagnostic telemetry globals, or `visual-kart` route/mode strings, local release smoke records no production telemetry/playtest globals, and standard production skips visual-diagnostic telemetry construction while preserving HUD race state. Latest dependency audit evidence: `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-004-20260601T191542Z/security-production-audit-summary.json`, proving production-only and full `npm audit` both report zero vulnerabilities after Vite/PWA build-tool upgrade. Production data/log-retention privacy posture and deployed security validation remain required. |
| Accessibility | Reduced motion, mute, keyboard, touch, focus, and contrast gates pass. Local built-preview smoke command: `npm run test:accessibility`; latest evidence: `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/accessibility-smoke-summary.json`. Manual target-browser/device accessibility sign-off is still required. |
| Monitoring/support | Error, performance, race metric, and incident handling path is active or explicitly accepted as unsupported risk. Local structural audit command: `npm run test:monitoring:support`; latest evidence: `.agent/runs/kart-racer-production-readiness/evidence/monitoring-support-001-20260524T025102Z/`. Cloudflare-native monitoring, Web Analytics enablement-if-needed policy, owner dashboard/access fallback, and owner/admin-only V1 support path are selected; deployed signals and release-owner sign-off remain required. |

### P1 Gates

P1 gates may ship only with explicit release-owner exception and dated follow-up ticket.

Latest local hard-gate matrix: `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-010-20260603T150000Z/production-gate-readiness-summary.json`. Current status is `r3-blocked-gates-remain`: `7`/`21` P0 gates Proven, `5`/`14` P1 gates Proven, `10` DoD rows not Proven-like, `10` manual QA rows without a `4`/`5` score, `19` `Not supplied` rows, and no release-owner exceptions are supplied.

| Gate | Acceptance |
| --- | --- |
| Cross-browser matrix | Chrome, Safari, Firefox, and Edge desktop behavior is checked for route load, play, fallback, and PWA basics where applicable. Local smoke command: `npm run test:cross-browser`; latest evidence: `.agent/runs/kart-racer-production-readiness/evidence/cross-browser-001-20260524T121434Z/cross-browser-smoke-summary.json`. Local Chrome, Playwright Chromium, Playwright Firefox, and Playwright WebKit pass route/race/exit smoke, but actual Safari, Microsoft Edge, target devices, and release-owner sign-off are still required. |
| Device matrix | At least one ordinary laptop and one modern phone pass the agreed smoke/manual path. Local smoke command: `npm run test:device:matrix`; latest evidence: `.agent/runs/kart-racer-production-readiness/evidence/device-matrix-001-20260524T122649Z/device-matrix-smoke-summary.json`. Local desktop viewport and emulated-phone WebGL acceleration pass, and owner manual QA first-pass hardware is Mac mini M4 with Brave plus iPhone 16 Pro with Safari, but physical-device human playthrough evidence and release-owner sign-off are still required. |
| PWA update | Existing installed app updates cleanly without stale asset breakage. Local smoke command: `npm run test:pwa:update`; latest evidence: `.agent/runs/kart-racer-production-readiness/evidence/pwa-update-001-20260523T234355Z/`. Production URL and target-browser/device update evidence are still required. |
| WebGL context loss | Context loss/fallback behavior is tested. Local built-preview smoke command: `npm run test:webgl`; latest evidence: `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/webgl-context-smoke-summary.json`. Target-browser/device evidence is still required. |
| Page lifecycle | Background tab, `visibilitychange`, `pagehide/pageshow`, and bfcache return preserve game timing, pause/resume, and navigation. Local race-route smoke command: `npm run test:lifecycle`; latest evidence: `.agent/runs/kart-racer-production-readiness/evidence/lifecycle-audio-001-20260523T210212Z/`. Target-browser/device bfcache evidence is still required. |
| Web Audio autoplay | Race audio starts after user intent, mute remains available, and blocked autoplay does not break gameplay. Local blocked-resume/mute smoke command: `npm run test:lifecycle`; latest evidence: `.agent/runs/kart-racer-production-readiness/evidence/lifecycle-audio-001-20260523T210212Z/`. |
| Lighthouse/Web Vitals | Lighthouse or equivalent lab check records performance, accessibility, best practices, and PWA signals; Web Vitals targets or exceptions are recorded. Local lab command: `npm run test:lab`; latest local evidence: `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-004-20260601T191542Z/lab-readiness-smoke-summary.json`. Owner-delegated conservative baseline passes locally; deployed preview/prod evidence remains required. |
| Production cache headers | `_headers` policy is verified in deployed response headers. Local URL-capable smoke command: `npm run test:headers:deployed`; latest local simulation evidence: `.agent/runs/kart-racer-production-readiness/evidence/deployed-headers-001-20260524T123726Z/deployed-headers-smoke-summary.json`. Preview/production URL response-header evidence is still required. |
| Bundle/asset budget | Asset and JS bundle sizes are recorded and accepted. Local built-artifact command: `npm run test:bundle`; latest local evidence: `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-004-20260601T191542Z/bundle-asset-budget-report.json`. Owner-delegated kart-racer V1 budget passes locally; deployed preview/prod release evidence remains required. |
| CI/release automation | Release gates run in CI or an owner-approved manual release checklist records equivalent evidence. Local workflow: `.github/workflows/race-production-gates.yml`; local audit command: `npm run test:ci:release`; latest local evidence: `.agent/runs/kart-racer-production-readiness/evidence/ci-release-automation-001-20260524T124743Z/ci-release-automation-summary.json`. Owner accepted a local manual release checklist if GitHub Actions is unavailable; actual clean-branch checklist execution or GitHub Actions run URL remains required. |
| Source map/debug policy | Proven locally. Local artifact smoke proves built `dist` has no source map files, no `sourceMappingURL`, no standalone playtest/debug files, no scanned secret-name leaks, no detected runtime playtest automation strings, no detected diagnostic telemetry globals, and no detected `visual-kart` route/mode strings in the standard production build. Local built-preview release smoke proves standard production builds ignore `raceAutoplay`/`raceNoFinish`, do not create `__racePlaytest*` or `__raceVisualTelemetry*` globals, do not create telemetry samples, and do not move the kart from that query alone. Latest kept runtime hardening also prevents standard production from constructing visual-diagnostic telemetry while preserving HUD race state. Latest classified evidence: `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/`. |
| Release notes | User-facing and operator-facing release notes exist. Draft path: `docs/race-release-notes-draft-2026-05-23.md`; release-owner/product/legal approval still required. |
| Support runbook | Known issues, recovery steps, and triage paths exist. Current-state path: `docs/race-release-operations-runbook.md`; owner/admin-only V1 support path is selected, while deployed monitoring/support status and sign-off remain required. |
| Post-launch review | Monitoring window and report template exist. Template path: `docs/race-post-launch-report-template.md`; launch day plus 24-hour monitoring window is selected, while completed launch report still required. |

## 9. Phase Plan

### Phase 0: Decision Lock

Objective:

Convert missing owner decisions into explicit scope, targets, and release constraints.

Tasks:

1. Send `docs/race-owner-review-packet.md` to owner/product/design/legal/release.
2. Fill `docs/race-visual-target-brief.md`.
3. Confirm target devices, browsers, and production domain/project.
4. Confirm monitoring and analytics privacy posture.
5. Confirm legal/IP reviewer and approval format.
6. Confirm sync/FatSecret/barcode scanner release scope.
7. Confirm clean deploy, CI/manual gate, and race-disable policy.
8. Confirm Web Vitals/Lighthouse targets or exceptions.
9. Update `docs/race-kart-v1-planning-index.md`, `docs/race-v1-blocker-backlog.md`, and this plan with decisions.

Exit:

- All required owner decisions are supplied.
- Any unresolved decision is explicitly accepted as a release risk or blocks the goal.

### Phase 1: Evidence Freeze

Objective:

Record the starting point so production work can prove improvement.

Tasks:

1. Run:

```sh
npm run build
npm run test:race
npm run test:race:browser
npm run test:cross-browser
npm run test:device:matrix
npm run test:headers:deployed
npm run test:webgl
npm run test:hub
npm run test:visual
npm audit
npm run test:security:prod
```

2. Save latest `tmp/race-playtests/race-browser-playtest-summary.json`.
3. Capture current desktop and mobile screenshots from the browser harness.
4. Record current git branch and commit.
5. Record current Cloudflare deploy target settings if available.
6. Record `git status --short` and whether production deploy requires a clean worktree.
7. Record whether `.github/` CI exists and whether release gates are local-only.
8. Create or update a production-readiness status artifact with current `R0` status.

Exit:

- Baseline artifacts are listed in the PR evidence record.
- Fresh evidence is used for later production claims.

### Phase 2: Immersive Game Quality

Objective:

Make the race feel like a high-tier arcade kart mini-game, not a tech demo.

Workstreams:

- Controls and feel:
  - Human keyboard acceleration, braking, steering, hop, drift, item, pause, restart, and exit must work without fighting the UI.
  - Touch controls must leave the kart, road apex, item boxes, boost pads, and hazards visible.
- Drift:
  - Drift must show hop entry, side slip, skid/smoke, tier sparks, audible tier cues, and release boost.
  - Tier 1 and Tier 2 must be reachable during ordinary play.
- Camera:
  - Route lookahead, turn anticipation, kart size, road-ahead coverage, and camera collision gates must remain within PRD thresholds.
  - Manual review must confirm speed readability and route clarity.
- Track:
  - First 30 seconds must teach accelerate, boost, item, and drift.
  - District landmarks must read from chase camera.
  - Route boundaries, arrows, curbs, barriers, boost pads, item boxes, hazards, shortcut, and finish line must be readable.
- Race drama:
  - At least 3 rivals visible in normal play.
  - Rivals must look distinct enough to register as competitors.
  - Items, hazards, boosts, and finish moments must be clear in world space.
- Presentation:
  - HUD must support position, lap, timer, held item, drift/boost state, and result flow without blocking play.
  - Audio and VFX must make drift, boost, item pickup/use, collision, lap, and finish legible.
  - Reduced motion and mute must remain respected.

Exit:

- `docs/race-v1-definition-of-done-checklist.md` rows are all `Proven` for gameplay.
- Manual QA categories are all `4+`.
- Fresh-user review passes.
- Product/design signs off on first impression, camera, route, art density, and feedback.

### Phase 3: Performance And Frame Pacing

Objective:

Make the race smooth enough on agreed devices without hiding quality problems.

Tasks:

1. Implement the controlled pass from `docs/race-performance-next-pass-plan.md`.
2. Add or verify sustained normal-play capture separate from forced visual-scenario setup.
3. Keep telemetry for:
   - `actualFps`
   - `frameDtMs`
   - `frameElapsedMs`
   - `frameBudgetMissCount`
   - `framePhaseMs`
   - `framePhaseMaxMs`
   - renderer calls
   - triangles
   - geometries
   - textures
   - programs
4. Add scene budget telemetry where it helps isolate track, scenery, pickups, rivals, VFX, HUD, and telemetry publication cost.
5. Optimize in measured units:
   - repeated props through instancing or merge only when actual FPS improves,
   - distance-based detail only when route readability survives,
   - material/program consolidation only when district identity survives,
   - animation and allocation cleanup only when frame timing improves.
6. Preserve every existing visual/control/fallback gate.

Exit:

- Desktop agreed target passes in focused and sustained evidence.
- Mobile agreed target passes or has explicit release-owner exception.
- Every kept optimization preserves camera, route readability, visible rivals, drift, boost, item, HUD, fallback, and reduced motion.

### Phase 4: Browser, Device, And Accessibility QA

Objective:

Prove the real browser product works outside the harness happy path.

Required matrix:

| Surface | Minimum check |
| --- | --- |
| Chrome desktop | Full race, tests, screenshots, PWA install if applicable. |
| Safari desktop | Load route, play first lap, WebGL/fallback behavior. |
| Firefox desktop | Load route, play first lap, WebGL/fallback behavior. |
| Edge desktop | Load route, play first lap, WebGL/fallback behavior. |
| iOS Safari | Touch first lap minimum, full race preferred. |
| Android Chrome | Touch first lap minimum, full race preferred. |
| Ordinary laptop | Sustained FPS and manual keyboard full race. |
| Modern phone | Touch playability and thermal/frame stability sample. |

Core tracker smoke:

- Home screen loads.
- Food screen loads.
- Barcode scanner behavior matches camera permission policy and release scope.
- Settings screen loads.
- Local persistence survives reload.
- Export/import or backup/restore path works if present in release scope.
- Cloud sync status behaves correctly when authenticated, unauthenticated, and offline.
- User can enter and exit `/#race` without breaking tracker navigation.
- Local smoke coverage for home, food entry, scanner surface, settings persistence, sync states, export/import, and return navigation exists through `npm run test:core`; latest evidence is `.agent/runs/kart-racer-production-readiness/evidence/core-tracker-001-20260523T204431Z/`. Preview/prod runs still need release evidence.

Accessibility checks:

- Keyboard-only start, play, pause, restart, exit.
- Visible focus where controls are reachable.
- Touch targets large enough for primary controls.
- Reduced motion disables or softens nonessential speed lines, shake, roll, and large pulses.
- Mute works and persists as expected.
- HUD contrast and text size remain readable over the race scene.
- Result and fallback screens are readable without game context.
- Local built-preview smoke coverage exists through `npm run test:accessibility`; latest evidence is `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/accessibility-smoke-summary.json`. Target-browser/device manual accessibility review is still required.

Exit:

- Matrix results are recorded.
- Any failed surface has a P0/P1/P2 severity and owner decision.

### Phase 5: PWA, Cache, And WebGL Reliability

Objective:

Avoid a production release that works once but breaks after install, refresh, cache update, or WebGL failure.

Tasks:

1. Verify `vite-plugin-pwa` behavior with production build.
2. Verify `registerType: 'autoUpdate'` produces acceptable update behavior for this app.
3. Test an installed PWA update from one build to the next.
4. Verify old cached sessions continue to load `/#race` after deployment.
5. Verify `_headers` for:
   - immutable hashed assets,
   - refresh-safe caching of `/sw.js`,
   - refresh-safe caching of `/registerSW.js`,
   - manifest refresh.
6. Simulate or force WebGL failure/context loss:
   - route remains navigable,
   - fallback UI is nonblank,
   - user can exit race,
   - error state is logged to monitoring if monitoring is enabled.
7. Test background/restore behavior:
   - switch tabs during race,
   - return after at least 30 seconds,
   - verify dt caps, pause/resume, audio, timers, and camera remain coherent.
8. Test bfcache/navigation behavior:
   - enter race,
   - navigate away,
   - use browser Back/Forward,
   - verify app state and canvas recover.
9. Test Web Audio autoplay behavior:
   - first load with no user gesture,
   - first acceleration/drift/item input,
   - mute toggle,
   - blocked-autoplay browser state if available.
10. Test offline/poor-network behavior enough to confirm the app does not show a blank race shell.

Exit:

- Installed and browser PWA update paths pass.
- WebGL failure does not break navigation.
- Cache headers are verified from deployed response headers.

### Phase 6: Security, Privacy, And Data Review

Objective:

Treat the race as part of a health/fitness tracker, not an isolated toy.

Tasks:

1. Review local data:
   - `localStorage` keys,
   - race metrics,
   - tracker data,
   - import/export behavior,
   - sync metadata.
2. Review cloud data if Pages Functions sync is in production scope:
   - authentication,
   - authorization,
   - storage locations,
   - migration state,
   - error handling,
   - deletion/export expectations.
   - conflict handling,
   - backup creation,
   - backup restore or recovery process,
   - schema version compatibility,
   - rollback compatibility after a deploy.
3. Review production telemetry:
   - race analytics include only explicitly approved health-related fields,
   - logs redact raw food/workout entries,
   - replay capture uses only explicitly approved user-identifying fields,
   - clear opt-out or explicit no-analytics posture.
4. Run dependency/security checks:

```sh
npm audit
npm run test:security:prod
```

5. Triage production dependency findings before release. If full `npm audit` reports dev/build-tool advisories, record either an upgrade decision or a dated release-owner exception.
6. Review `public/_headers`.
7. Decide whether to add or update Content Security Policy before production.
8. Verify Cloudflare Pages Functions bindings:
   - D1 binding names,
   - Access issuer/team domain,
   - Access audience,
   - FatSecret client ID/secret,
   - environment-specific secrets.
9. Smoke in-scope API routes:
   - `/api/sync/me`,
   - `/api/sync/state`,
   - `/api/sync/backups`,
   - `/api/fatsecret/search`,
   - `/api/fatsecret/item`.
10. Verify API routes return safe errors without exposing secrets or raw tracker state.
11. Verify the committed secret scan is clean.
12. Verify Cloudflare environment variables are not exposed to client bundles unless intentionally `VITE_` prefixed and safe.
13. Review browser permissions policy for current and future camera/barcode use.
14. Reconcile `Permissions-Policy: camera=()` with barcode scanner scope:
   - keep camera disabled if scanner is out of production scope,
   - update route/header policy if scanner is in production scope,
   - record manual camera-permission smoke if scanner ships.

Exit:

- Security/privacy review outcome is recorded.
- Any unmitigated high/critical risk has explicit owner acceptance.

### Phase 7: IP, Asset, And Audio Provenance

Objective:

Ship original Comeback City work without copied or unreviewed protected material.

Tasks:

1. Complete `docs/race-ip-provenance-audit.md`.
2. Confirm all `src/assets/game/**` source/license/provenance records.
3. Confirm generated assets include prompt/source/hash/date where applicable.
4. Confirm race audio is procedural, original, or licensed.
5. Review item names, silhouettes, VFX, HUD icons, track signage, and rival/kart silhouettes.
6. Review screenshots and 10 second clip for protected asset or layout similarity.
7. Confirm the approved visual target is composition-only and safe.

Exit:

- IP/provenance reviewer signs off.
- Required renames, re-skins, removals, or replacement assets are complete.

### Phase 8: Release Pipeline And Deployment

Objective:

Make deployment repeatable, inspectable, and reversible.

Tasks:

1. Confirm production Cloudflare Pages project:
   - `comeback-tracker`,
   - `comeback-andrew`,
   - `comeback-alexander`,
   - or another owner-approved target.
2. Confirm build command:

```sh
npm run build
```

3. Confirm preset-specific production builds if required:

```sh
npm run build:andrew
npm run build:alexander
```

4. Confirm Cloudflare build output:

```text
dist
```

5. Confirm Node version and environment variables.
6. Confirm production deploy cleanliness:
   - clean committed branch and commit SHA preferred,
   - dirty direct upload allowed only with explicit release-owner exception,
   - preview/sandbox direct upload records dirty status when used.
7. Create preview deployment from branch before production.
8. Run preview smoke:
   - app home loads,
   - `/#race` loads,
   - race starts,
   - keyboard acceleration works,
   - touch controls render in mobile viewport,
   - WebGL fallback test route or forced fallback works,
   - core tracker smoke passes,
   - in-scope API smoke passes,
   - settings/navigation still works,
   - console P0 error count is zero.
9. Deploy production only after preview smoke and sign-offs.
10. Run production smoke immediately after deploy.
11. Record production deployment ID, URL, commit, timestamp, deploy command, and dirty/clean status.
12. Identify rollback target.
13. Rehearse rollback steps on safe deployment or record exact production rollback process.
14. Verify race disable/recovery path:
   - feature flag,
   - route guard,
   - rollback,
   - or release-owner accepted manual intervention.

Exit:

- Preview and production deployment evidence exists.
- Rollback path is documented and tested or explicitly accepted by release owner.

### Phase 9: Monitoring, Metrics, And Support

Objective:

Know when production is broken and how to respond.

Required production signals:

- App load errors.
- Race route load errors.
- WebGL context creation/context loss failures.
- Pages Functions errors for sync and FatSecret routes when in scope.
- Race start count.
- Race completion count.
- Time to first drift.
- Time to first item pickup.
- Average and low-percentile race FPS on sampled clients if privacy-approved.
- Device/browser bucket.
- Manual support reports.
- Deployment version/commit.
- Service worker version/update state where feasible.
- Race disable/rollback activation status.

Monitoring options:

- Use an approved client error-monitoring provider.
- Use Cloudflare analytics/logging where sufficient.
- Use a minimal privacy-preserving in-app report path.
- Or record explicit owner acceptance that production will ship without monitoring, with support risk documented.

Support runbook must include:

- How to identify current deployed version.
- How to reproduce `/#race`.
- How to collect screenshots and browser info.
- How to clear PWA cache or unregister service worker for troubleshooting.
- How to roll back.
- How to disable or hide race mode if a P0 issue appears.
- How to check Cloudflare Pages Function logs.
- How to verify D1 sync/backups.
- How to verify FatSecret proxy health if in scope.
- How to recover from scanner/camera permission reports if barcode scanning ships.
- Known issues and accepted limitations.

Exit:

- Monitoring/support path is active or risk-accepted.
- Launch owner knows where to look for failures.

### Phase 10: Launch And Post-Launch Stabilization

Objective:

Release only when evidence survives production and early usage.

Tasks:

1. Run final local checks.
2. Run preview deployment checks.
3. Get release sign-off.
4. Deploy production.
5. Run production smoke.
6. Monitor agreed window:
   - first 30 minutes,
   - first 24 hours,
   - first week if the owner requires.
7. Record:
   - deployment ID,
   - commit,
   - smoke result,
   - monitoring result,
   - support issues,
   - rollback decision,
   - follow-up tickets.

Exit:

- Post-launch report exists.
- Unresolved P0/P1 production issue count is zero.

## 10. Production Test Matrix

### Automated Local

Required before release candidate:

```sh
npm run build
npm run test:race
npm run test:race:browser
npm run test:cross-browser
npm run test:device:matrix
npm run test:headers:deployed
npm run test:hub
npm run test:visual
npm audit
npm run test:security:prod
```

Release checklist also records:

- `git status --short`
- current branch,
- current commit,
- CI run URL or manual release checklist path,
- clean/dirty deploy decision.

### Production-Build Local Smoke

Required before preview deploy:

```sh
npm run build
npm run preview
```

Manual smoke on local preview:

- home route loads,
- `/#race` loads,
- desktop keyboard acceleration works,
- drift can start,
- boost pad works,
- item pickup works,
- pause/resume works,
- exit path works,
- mobile viewport renders controls without blocking the kart or road,
- reduced motion works,
- audio mute works,
- fallback path remains navigable.
- background tab return preserves race state.
- core tracker smoke passes.
- in-scope API routes are either mocked, unavailable with safe errors, or proven in an environment with production-like bindings.

### Preview Deployment Smoke

Required before production deploy:

- preview URL recorded,
- route `/#race` loads,
- production assets load without 404,
- canvas is nonblank,
- blocking console error count is zero,
- service worker and manifest responses are sane,
- `_headers` response policy is visible,
- CSP/Permissions-Policy/cache headers match release scope,
- WebGL fallback path is tested if feasible,
- page visibility/background return behaves coherently,
- Web Audio starts from user intent or degrades silently,
- core tracker smoke passes,
- in-scope API smoke passes,
- app data path still works.

### Production Smoke

Required immediately after production deploy:

- production URL recorded,
- current commit/build version identifiable,
- app loads in fresh browser profile,
- installed PWA or existing cached session updates acceptably,
- `/#race` starts and is playable for at least first lap,
- desktop and mobile smoke pass,
- core tracker smoke passes,
- in-scope API smoke passes,
- header policy is verified from production responses,
- monitoring receives deployment/version signal if enabled,
- rollback target identified,
- race disable/recovery path identified.

## 11. Manual QA Requirements

Manual QA is required in addition to autoplay.

Required artifacts:

- Completed `docs/race-manual-qa-rubric.md` or dated result copy.
- Desktop keyboard full race.
- Mobile touch first lap minimum, full race preferred.
- Fresh-user 10 second clip review.
- Product/design review notes.
- IP/provenance sign-off notes.

Manual QA minimum scores:

| Category | Minimum |
| --- | --- |
| First impression | 4 |
| Controls | 4 |
| Drift | 4 |
| Camera | 4 |
| Track readability | 4 |
| Visual polish | 4 |
| Race drama | 4 |
| HUD | 4 |
| Performance | 4 |
| Mobile | 4 |

Any score below `4` is a production blocker unless release owner explicitly downgrades scope and updates the PRD/DoD.

## 12. Bug Severity Policy

| Severity | Definition | Release rule |
| --- | --- | --- |
| P0 | Crash, blank route, unusable controls, data loss, privacy/security exposure, copied/prohibited asset, missing rollback path. | Release is blocked. |
| P1 | Major FPS failure, unreadable camera, broken mobile controls, broken PWA update, failed manual QA category, major design/IP concern. | Release is blocked unless a release-owner exception exists. |
| P2 | Noticeable polish issue, minor visual clipping, isolated browser quirk with workaround. | May ship with dated follow-up. |
| P3 | Cosmetic or backlog improvement. | May ship. |

## 13. Evidence Package

Every production-readiness PR or final handoff must include:

- Current readiness level.
- Commands run and exact result.
- CI URL or manual release checklist path.
- Git branch, commit, and clean/dirty status.
- Browser summary path.
- Desktop idle screenshot.
- Desktop speed screenshot.
- Desktop drift screenshot.
- Desktop boost/item screenshot.
- Mobile screenshot.
- Manual QA result path.
- Fresh-user clip/review result.
- IP/provenance sign-off path.
- Product/design sign-off path.
- Preview deployment URL.
- Production URL if deployed.
- Deployment ID and commit.
- Rollback target and procedure.
- Race disable/recovery procedure.
- Monitoring/support status.
- Header/CSP/Permissions-Policy verification.
- Core tracker smoke result.
- In-scope API smoke result.
- Web Vitals/Lighthouse result or exception.
- Page lifecycle/audio autoplay result.
- Data backup/export/sync compatibility result.
- Known issues and severity.
- Explicit statement of anything not tested.

## 14. Production Definition Of Done

Comeback City Kart Racer is production-ready only when:

1. This plan is at `R3 Production Ready` or higher.
2. The original V1 PRD Definition of Done is fully proven.
3. The blocker-resolution PRD is closed.
4. P0 gates are all closed.
5. P1 gates are closed or explicitly exceptioned by release owner.
6. Manual QA scores are all `4+`.
7. Fresh-user review passes.
8. Product/design/legal/release sign-off is recorded.
9. Preview deployment passes smoke.
10. Production deployment passes smoke.
11. Rollback procedure is proven or release owner explicitly accepts the remaining risk.
12. Race disable/recovery path is proven or release owner explicitly accepts rollback-only recovery.
13. Core tracker, in-scope API, data safety, header policy, and PWA lifecycle gates pass.
14. Monitoring/support path is active or explicitly risk-accepted.
15. Post-launch monitoring window is defined.

## 15. Recommended Goal-Mode Ticket Backlog

| Ticket | Title | Close proof |
| --- | --- | --- |
| `PROD-000` | Lock owner/release decisions | All currently tracked owner decisions are supplied or narrowed to execution evidence. Latest local decision audit `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-010-20260603T150000Z/release-decision-readiness-summary.json` records `0` missing decision categories and `19` current `Not supplied` execution-evidence rows after Q48-Q52 sync. Q53-Q57 clean-commit, secret-check, full local checklist, and Wrangler preview-deploy decisions are recorded at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-011-20260603T155244Z/owner-decision-intake-011.md`; local credential files were found and documented as ignored/not-to-stage in `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-011-20260603T155244Z/secret-content-scan-redacted.md`. Latest local hard-gate audit `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-010-20260603T150000Z/production-gate-readiness-summary.json` records `r3-blocked-gates-remain`, `7`/`21` P0 gates Proven, and `5`/`14` P1 gates Proven. |
| `PROD-001` | Freeze baseline evidence | Commands, screenshots, telemetry, git metadata recorded. |
| `PROD-010` | Close V1 gameplay DoD | `docs/race-v1-definition-of-done-checklist.md` all gameplay rows `Proven`. |
| `PROD-011` | Complete immersive track/art pass | Design sign-off for first 30 seconds, districts, density, route, HUD. |
| `PROD-012` | Complete feedback/audio pass | Drift, boost, item, collision, lap, finish feedback signed off. |
| `PROD-013` | Complete desktop/mobile manual QA | Separate dated desktop and mobile QA result files with all categories `4+`; prep capture command is `npm run test:qa:capture`, latest prep evidence `.agent/runs/kart-racer-production-readiness/evidence/manual-qa-prep-001-20260524T093705Z/manual-qa-capture-summary.json` does not close this ticket. |
| `PROD-014` | Complete fresh-user review | 10 second clip answer passes; latest silent clip candidate is prepared in `.agent/runs/kart-racer-production-readiness/evidence/manual-qa-prep-001-20260524T093705Z/`, but no reviewer answer exists. |
| `PROD-020` | Close desktop FPS blocker | Focused and sustained target-device FPS evidence passes. |
| `PROD-021` | Complete mobile performance pass | Target phone FPS/playability evidence passes. |
| `PROD-022` | Prove WebGL fallback/context loss | Forced failure/fallback remains navigable. Local built-preview smoke command: `npm run test:webgl`; latest local evidence: `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/webgl-context-smoke-summary.json`. |
| `PROD-023` | Prove PWA update/cache path | Installed/update/cache smoke passes. Local smoke command: `npm run test:pwa:update`; latest local evidence: `.agent/runs/kart-racer-production-readiness/evidence/pwa-update-001-20260523T234355Z/`. Production URL and target-browser/device update evidence are still required. |
| `PROD-024` | Prove page lifecycle and audio startup | Visibility, bfcache, background return, and autoplay/mute checks pass. Local smoke command: `npm run test:lifecycle`; latest local evidence: `.agent/runs/kart-racer-production-readiness/evidence/lifecycle-audio-001-20260523T210212Z/`. |
| `PROD-025` | Prove race disable/recovery path | Feature flag, guard, rollback, or accepted recovery path is recorded. |
| `PROD-030` | Complete automated release gates | Required commands pass. Latest local RC checklist evidence: `.agent/runs/kart-racer-production-readiness/evidence/rc-local-checklist-001-20260524T013026Z/`. Local URL-capable release smoke command: `npm run test:release:smoke`; latest local built-preview evidence: `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-release-smoke-summary.json`. |
| `PROD-031` | Complete cross-browser/device matrix | Local built-preview cross-browser smoke is recorded at `.agent/runs/kart-racer-production-readiness/evidence/cross-browser-001-20260524T121434Z/cross-browser-smoke-summary.json`; local desktop/emulated-phone matrix smoke is recorded at `.agent/runs/kart-racer-production-readiness/evidence/device-matrix-001-20260524T122649Z/device-matrix-smoke-summary.json`. Owner manual QA first-pass hardware is Mac mini M4 with Brave and iPhone 16 Pro with Safari. Actual Brave desktop run, Microsoft Edge, physical-device playthrough, target-device matrix, and release-owner sign-off remain required. |
| `PROD-032` | Record Web Vitals/Lighthouse evidence | Local lab evidence exists at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-004-20260601T191542Z/lab-readiness-smoke-summary.json`; owner-delegated conservative baseline passes locally. Deployed preview/prod evidence still required. |
| `PROD-033` | Record bundle/asset budget evidence | Local built-artifact size report exists and owner-delegated kart-racer V1 budget passes locally. Local command: `npm run test:bundle`; latest local evidence: `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-004-20260601T191542Z/bundle-asset-budget-report.json`. |
| `PROD-034` | Record source-map/debug artifact evidence | Local release artifact safety smoke and production-hook behavior smoke pass. Latest classified artifact evidence: `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-release-artifact-safety-report.json`; latest local built-preview behavior smoke is in the same evidence directory. |
| `PROD-035` | Record accessibility smoke evidence | Local built-preview accessibility smoke passes and target-browser/device manual accessibility review is supplied or has a dated exception. Local command: `npm run test:accessibility`; latest local evidence: `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/accessibility-smoke-summary.json`. |
| `PROD-040` | Complete security/privacy review | Dependency, header, data, telemetry, secret review recorded. Local header/PWA/CSP smoke command: `npm run test:pwa`; latest local evidence: `.agent/runs/kart-racer-production-readiness/evidence/csp-headers-001-20260523T233058Z/`. Local deployed-header simulation command: `npm run test:headers:deployed`; latest local evidence: `.agent/runs/kart-racer-production-readiness/evidence/deployed-headers-001-20260524T123726Z/deployed-headers-smoke-summary.json`. Local production dependency audit command: `npm run test:security:prod`; latest local evidence: `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-004-20260601T191542Z/security-production-audit-summary.json`, with full `npm audit` passing. Local artifact policy audit evidence: `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-release-artifact-safety-report.json`. Production data/log-retention privacy posture and real deployed security/header validation are still required. |
| `PROD-041` | Complete IP/provenance sign-off | Current assets, names, reference scope, and screenshots/captures are owner-approved; repeat inventory/source scan/similarity review if new assets, UI, item silhouettes, tracks, or audio are added. |
| `PROD-042` | Prove core tracker and data safety | Tracker smoke, local persistence, sync/backups, and rollback compatibility pass. Local tracker smoke command: `npm run test:core`; latest local tracker evidence: `.agent/runs/kart-racer-production-readiness/evidence/core-tracker-001-20260523T204431Z/`. Local mocked D1 backup restore evidence: `.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z/`. |
| `PROD-043` | Prove API and external service scope | In-scope sync/FatSecret routes pass in production-like env or are explicitly scoped out. Local mocked smoke and URL-mode deployed-probe command: `npm run test:api:data`; latest local and URL-mode harness evidence: `.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z/`. Immediate kart-racer readiness scope-out is recorded for Cloudflare Functions, D1 sync, FatSecret proxy, barcode, and camera with owner/admin follow-up dated 2026-06-08. |
| `PROD-050` | Confirm deployment pipeline | Release branch `codex/release-v1-comebacktracker-kart-racer`, branch switch evidence, preview project `showcase-designs-preview`, branch `comebacktrackerkartgame`, planned canonical branch URL if Wrangler confirms it, direct Wrangler upload acceptance, same-build production direct-upload approval after preview smoke, and production-environment rollback policy are recorded. Actual deploy metadata, build/env policy evidence, and smoke results remain required. |
| `PROD-051` | Prove preview deployment | Preview URL and smoke pass. Planned URL before deploy proof: `https://comebacktrackerkartgame.showcase-designs-preview.pages.dev`. Run `RELEASE_SMOKE_URL=<preview-url> RELEASE_SMOKE_TARGET=preview npm run test:release:smoke`; actual preview deployment evidence still required. |
| `PROD-052` | Prove production deployment | After preview smoke passes, direct-upload the same clean build to the selected Pages project production environment and use the production deployment URL from Wrangler/Cloudflare output. Run `RELEASE_SMOKE_URL=<production-url> RELEASE_SMOKE_TARGET=production npm run test:release:smoke`; deployment evidence still required. |
| `PROD-053` | Prove rollback procedure | Native Cloudflare Pages production rollback is selected, and owner approved two safe production deployments for rollback proof. Local template path: `docs/race-release-operations-runbook.md`; local-only drill command: `npm run test:release:rollback`; latest local evidence: `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/release-rollback-smoke-summary.json`. Cloudflare production deployment IDs, post-rollback production smoke, monitoring/support, and D1 rollback compatibility still remain required. |
| `PROD-054` | Confirm CI/manual release gate | CI run or manual release checklist records equivalent evidence. Local checklist evidence exists at `.agent/runs/kart-racer-production-readiness/evidence/rc-local-checklist-001-20260524T013026Z/`; workflow structure exists at `.github/workflows/race-production-gates.yml`; local CI audit evidence exists at `.agent/runs/kart-racer-production-readiness/evidence/ci-release-automation-001-20260524T124743Z/ci-release-automation-summary.json`. Owner accepted a local manual release checklist if GitHub Actions is unavailable; actual clean-branch checklist execution or GitHub Actions run URL remains required. |
| `PROD-060` | Activate monitoring/support | Monitoring/support or risk acceptance recorded. Local audit command: `npm run test:monitoring:support`; latest local evidence: `.agent/runs/kart-racer-production-readiness/evidence/monitoring-support-001-20260524T025102Z/`, proving runbook/template structure. Cloudflare-native monitoring, Web Analytics enablement-if-needed policy, owner dashboard/access fallback, owner/admin-only V1 support path through `isethius`, and 24-hour post-launch window are selected; deployed signals and release-owner sign-off remain required. |
| `PROD-070` | Complete launch report | Deployment, smoke, monitoring, issues, follow-ups recorded. Template path: `docs/race-post-launch-report-template.md`; completed launch report still required. |

## 16. Claim Only With Proof

Claim each item only when its matching proof exists:

- Production-ready: all P0 gates closed, P1 gates closed or exceptioned, and `R3 Production Ready` recorded.
- Highest-tier immersive gameplay: manual QA, fresh-user review, and product/design review all pass.
- Kart-racer quality: V1 DoD is fully proven and the fresh-user review passes.
- Desktop performance sign-off: focused and sustained target-device FPS evidence passes.
- Mobile performance sign-off: target-device touch and performance evidence passes.
- Production deploy complete: production URL, deployment ID, commit, smoke result, and rollback target are recorded.
- Safe rollback path: rollback procedure and target are tested or release-owner accepted.
- Race disable/recovery ready: release owner can bypass, hide, disable, or roll back `/#race`.
- Monitoring ready: error/performance/metric/support path is active or risk-accepted.
- IP safe: IP/provenance reviewer signs off.
- Privacy safe: privacy review signs off on telemetry, logs, storage, and sync behavior.
- Accessibility complete: keyboard, touch, reduced motion, mute, focus, contrast, and fallback checks pass.
- PWA install/update safe: installed app update and cache behavior are verified.
- Data safety complete: local migration, cloud sync/backups if in scope, export/import if present, and rollback compatibility are verified.
- API safe: Pages Functions and external service routes pass safe-success and safe-error smoke if in scope.
- Header policy safe: CSP, cache headers, and Permissions-Policy match production scope.
- Lifecycle safe: background tab, bfcache, WebGL context loss, and audio startup checks pass.
- Cross-browser safe: required browser/device matrix is recorded.

## 17. Immediate Next Actions

1. Add this plan to the planning index.
2. Ask owner/release for the required decisions in Section 7.
3. Once decisions exist, run the recommended goal prompt in Section 6.
4. Start with `PROD-001` baseline evidence before implementation changes.
5. Close `PROD-020` desktop FPS and `PROD-013` manual QA before any production-release claim.
