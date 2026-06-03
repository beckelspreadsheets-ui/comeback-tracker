# Comeback City Kart Racer Release Operations Runbook

Status: current-state release operations template, not release sign-off
Date: 2026-06-03
Related plan tickets: `PROD-030`, `PROD-032`, `PROD-050`, `PROD-051`, `PROD-052`, `PROD-053`, `PROD-054`, `PROD-060`, `PROD-070`

## Purpose

Use this runbook to execute and record preview, production, rollback, monitoring, and support evidence for the kart-racer release. Do not fill unknown owner, deployment, monitoring, legal, or production values from engineering judgment.

## Required Owner Inputs

| Field | Current value |
| --- | --- |
| Release owner | `isethius` (owner/admin) |
| Rollback owner | `isethius` (owner/admin) |
| Release branch | Owner label: `release v1 comebacktracker kart racer`; Git-safe branch for this workspace: `codex/release-v1-comebacktracker-kart-racer` |
| Production Cloudflare Pages project | Use Cloudflare Pages project `showcase-designs-preview`, which is visible locally through Wrangler. Owner accepted direct Wrangler Pages upload after clean branch/worktree preparation. Preview deployment evidence is recorded at `.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/preview-deploy-summary.md`; production deployment evidence remains pending. |
| Production URL/domain | No separate custom domain is required for this pass. After preview smoke passes, direct-upload the same clean build to the selected Pages project's production environment and use the production deployment URL from Wrangler/Cloudflare output for production smoke and native rollback proof; keep `https://comebacktrackerkartgame.showcase-designs-preview.pages.dev` as the canonical preview branch URL if Wrangler confirms it after deployment. |
| Preview branch/project policy | Use Cloudflare Pages project `showcase-designs-preview` with preview branch `comebacktrackerkartgame`. Canonical preview URL is confirmed as `https://comebacktrackerkartgame.showcase-designs-preview.pages.dev`; deployment URL is `https://d1169ee7.showcase-designs-preview.pages.dev`; deployment ID is `d1169ee7-c653-4727-bed0-8dbac4d960f9`; Wrangler source commit is `948f630`. Preview deploy, deployed header smoke, release smoke, and WebGL context-loss smoke passed on 2026-06-03. Evidence: `.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/preview-deploy-summary.md`. |
| Clean deploy policy | Release branch `codex/release-v1-comebacktracker-kart-racer` was created/switched on 2026-06-03 from the current working tree state with owner approval; branch evidence is recorded at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-010-20260603T150000Z/git-branch-after-q48.log`. Owner approved committing all current project changes on the release branch on 2026-06-03 to reach a clean working tree before release checklist/deploy; decision evidence and redacted secret-scan handling are recorded at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-011-20260603T155244Z/owner-decision-intake-011.md` and `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-011-20260603T155244Z/secret-content-scan-redacted.md`. Commit `937bd25a6813927ce2e54ad4582ca39a9937157f` moved the release branch to a clean working tree, clean-start checklist evidence is recorded at `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/release-checklist-final-summary.json`, and preview deploy used `--commit-dirty=false` against commit `948f6308e85aa3437ff5c08b852e33ac5f27ff22`. Local `.dev.vars`, `.env.local`, and `.wrangler/` are ignored and must not be staged. |
| CI URL or manual checklist acceptance | Owner accepted a local manual release checklist on 2026-06-03 if GitHub Actions is unavailable and confirmed on 2026-06-03 that the full local manual release checklist should run after the clean working tree is created. Clean-start local checklist execution from branch `codex/release-v1-comebacktracker-kart-racer` at commit `937bd25a6813927ce2e54ad4582ca39a9937157f` passed after remediation; final evidence is `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/release-checklist-final-summary.json`. Preview URL smoke and preview deployed-header smoke passed at `.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/`. Release gate still requires owner manual checklist sign-off by `isethius`, production URL smoke, production deployed-header smoke, rollback proof, monitoring/support status, and release sign-off before R3. Local workflow structure exists at `.github/workflows/race-production-gates.yml` and local audit evidence is recorded at `.agent/runs/kart-racer-production-readiness/evidence/ci-release-automation-001-20260524T124743Z/ci-release-automation-summary.json`; no GitHub Actions run URL is supplied. |
| Race-disable activation policy | Owner/admin only; primary recovery is native Cloudflare Pages rollback to a known-good production deployment; secondary race-only recovery is clean redeploy with `VITE_RACE_DISABLED=true` when the race is broken but core tracker should stay live. Preview redeploy is supplemental only because Cloudflare Pages preview deployments are not valid rollback targets. |
| API smoke URL/JWT/live FatSecret approval, if sync/FatSecret ship | Scoped out of immediate kart-racer production readiness; owner/admin follow-up dated 2026-06-08 for smoke inputs, bindings, secrets, live-query approval, and production scope |
| Monitoring provider or accepted no-monitoring risk | Cloudflare-native monitoring selected for V1: enable/configure Cloudflare Web Analytics for the selected Pages project if missing and needed, Workers Logs only when Functions/API ship, no third-party provider. If local CLI/API confirmation is unavailable, owner-supplied Cloudflare dashboard screenshots/details or owner-provided access are acceptable evidence. |
| Support contact/path | Owner/admin-only V1 support path through `isethius`: monitor Cloudflare Pages/Web Analytics and deployed smoke results, record issues in this runbook/post-launch report, and use Cloudflare rollback or `VITE_RACE_DISABLED=true` clean redeploy for recovery. No public support email/contact is added until owner supplies one. |
| Post-launch monitoring window | Launch day plus 24 hours after production deploy; owner/admin checks at deploy, +1h, and +24h |
| Bundle/asset budget threshold or exception | Owner delegated a reasonable kart-racer V1 baseline on 2026-06-01: total built artifact <= `8.5 MiB` raw and <= `4600 KiB` gzip, JavaScript <= `5.25 MiB` raw and <= `1400 KiB` gzip, images <= `3.25 MiB` raw, largest file <= `3.75 MiB` raw, and largest JavaScript file <= `900 KiB` gzip. Latest local evidence records `bundle-budget-pass` at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-004-20260601T191542Z/bundle-asset-budget-report.json`. |
| Source-map/debug/test-hook policy | Standard production keeps source maps, debug routes, diagnostic globals, and test hooks disabled; no source-map upload required for V1 unless owner later approves protected monitoring upload |
| Accessibility target-browser/device reviewer or exception | Owner-only reviewer; browser baseline is desktop latest two stable Chrome, Edge, Safari, Firefox plus mobile iOS Safari and Android Chrome; device baseline is iPhone 12+, iPhone SE 2nd generation, Pixel 6a+, one Windows laptop, and one Mac laptop with integrated graphics. Owner manual QA first-pass hardware is Mac mini M4 with Brave, and iPhone 16 Pro with Safari |
| Manual QA result files | Record separate dated desktop and mobile QA result files: one for Mac mini M4 with Brave and one for iPhone 16 Pro with Safari |
| Vite/esbuild advisory decision | Upgrade dev/build tooling now for production readiness. Implemented with Vite `^8.0.16`, `@vitejs/plugin-react` `^6.0.2`, `vite-plugin-pwa` `^1.3.0`, and `workbox-window` `^7.4.1`. |
| Production dependency audit split acceptance | Full `npm audit` must pass for this release; production-only split is no longer needed for the Vite/esbuild advisory. Latest full audit evidence records zero reported vulnerabilities at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-004-20260601T191542Z/npm-audit-full-vite8.json`. |

## Release Candidate Local Checklist

Record each result in a dated evidence directory before preview deploy.

| Check | Required result | Evidence path |
| --- | --- | --- |
| `git status --short` | Clean branch/worktree required for production deploy | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/git-status-clean.log`; records clean status at checklist start before the evidence directory was created |
| Current branch and commit | Clean release branch `codex/release-v1-comebacktracker-kart-racer` and full SHA recorded | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/release-checklist-context.txt`; records branch `codex/release-v1-comebacktracker-kart-racer` and commit `937bd25a6813927ce2e54ad4582ca39a9937157f` |
| `npm run build` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-build.log` |
| `npm run test:accessibility` | Pass locally; target-browser/device accessibility review recorded separately | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-accessibility.log` |
| `npm run test:bundle` | Pass; report attached | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-bundle.log` |
| `npm run test:race` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-race.log` |
| `npm run test:race:browser` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-race-browser.log` |
| `npm run test:hub` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-hub.log` |
| `npm run test:visual` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-visual.log` |
| `npm run test:core` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-core.log` |
| `npm run test:api:data` | Pass locally, and URL-mode API smoke passes on preview/prod when API scope is in release scope, or API scope exception recorded | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-api-data.log`; API scope remains out of immediate kart-racer readiness with 2026-06-08 owner/admin follow-up |
| `npm run test:pwa` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-pwa.log` |
| `npm run test:pwa:update` | Pass locally; production installed-app update smoke recorded separately | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-pwa-update.log` |
| `npm run test:headers:deployed` | Pass locally; URL-capable response-header comparator and Cloudflare-style `_headers` simulation recorded separately from real deployed evidence | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-headers-deployed.log` |
| `npm run test:lab` | Pass after rerun against owner-delegated conservative lab baseline; deployed preview/prod evidence recorded separately | Initial checklist run failed at race TBT proxy `2638ms` against `2500ms`; rerun passed at `2338ms`. Final evidence: `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/lab-readiness-smoke-summary-rerun-001.json` and `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-lab-rerun-001.log` |
| `npm run test:release:smoke` | Pass locally; preview/prod URL smoke recorded separately | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-release-smoke.log` |
| `npm run test:release:rollback` | Pass locally; production rollback recorded separately | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-release-rollback.log` |
| `npm run test:release:artifacts` | Pass locally; standard production artifact has no scanned source maps, debug/playtest files, runtime playtest automation strings, diagnostic telemetry globals, or visual-review route strings | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-release-artifacts.log` |
| `npm run test:ci:release` | Pass locally; workflow structure, triggers, setup, Playwright install, and release-gate command list are recorded separately from an actual CI run | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-ci-release.log` |
| `npm run test:production:gates` | Pass structurally; records P0/P1 hard-gate blockers separately from sign-off | Clean-start checklist evidence: `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/production-gate-readiness-summary-after-qa-fix.json`. Latest preview-deploy audit: `.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/production-gate-readiness-summary.json`, with `8`/`21` P0 gates Proven, `5`/`14` P1 gates Proven, and `7` production `Not supplied` rows. |
| `npm run test:qa:capture` | Pass locally after script fix; prepares captures/clip/telemetry for human QA without replacing scores | Initial checklist run failed because the capture waited for the standard-production-disabled `window.__raceVisualTelemetry`; `scripts/manual-qa-capture.mjs` now reads production DOM race state from `data-testid="arcade-race-shell"` with diagnostics only as fallback. Evidence: `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/manual-qa-capture-summary-after-shell-telemetry-fix.json` and `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-qa-capture-after-shell-telemetry-fix.log` |
| `npm run test:monitoring:support` | Pass locally; production monitoring/support activation or risk acceptance recorded separately | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-monitoring-support.log` |
| `npm run test:security:prod` | Pass locally; full audit now passes after Vite/PWA build-tool upgrade | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-security-prod.log` |
| `npm run test:lifecycle` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-lifecycle.log` |
| `npm run test:webgl` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-run-test-webgl.log` |
| `npm audit` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/npm-audit.log`; full audit reports zero vulnerabilities after Vite/PWA build-tool upgrade |

Latest local RC checklist summary: `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/release-checklist-final-summary.json`. It proves a clean-start local checklist on branch `codex/release-v1-comebacktracker-kart-racer` at commit `937bd25a6813927ce2e54ad4582ca39a9937157f` passed after remediation: the first run passed `26` of `28` checks, `npm run test:lab` passed on rerun, and `npm run test:qa:capture` passed after `scripts/manual-qa-capture.mjs` was updated to use production DOM race state when diagnostic globals are absent. It does not replace owner manual QA/sign-off, actual CI run URL, production deployment, production deployed headers, Cloudflare rollback, monitoring/support activation, or production sign-off.

## CI Release Automation Audit Command

Local workflow structure audit:

```sh
npm run test:ci:release
```

Workflow path: `.github/workflows/race-production-gates.yml`.

Latest local CI release automation evidence: `.agent/runs/kart-racer-production-readiness/evidence/ci-release-automation-001-20260524T124743Z/ci-release-automation-summary.json`. It proves workflow structure, pull request/main/workflow_dispatch triggers, Node 20 setup, npm cache, Playwright browser install, and release-gate command coverage. Owner accepted a local manual release checklist if GitHub Actions is unavailable, and clean-start local checklist execution is recorded at `.agent/runs/kart-racer-production-readiness/evidence/release-checklist-001-20260603T160520Z/release-checklist-final-summary.json`; GitHub Actions run URL and release sign-off remain pending.

## Release Smoke Command

Local built-preview command:

```sh
npm run test:release:smoke
```

Preview URL command:

```sh
RELEASE_SMOKE_URL=<preview-url> RELEASE_SMOKE_TARGET=preview npm run test:release:smoke
```

Production URL command:

```sh
RELEASE_SMOKE_URL=<production-url> RELEASE_SMOKE_TARGET=production npm run test:release:smoke
```

Latest local built-preview evidence: `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-release-smoke-summary.json`. It proves local built app home/food/settings navigation, `/#race` WebGL load, nonblank canvas, desktop keyboard acceleration, mobile touch acceleration, race exit hash cleanup, manifest fetch, service-worker fetch, and disabled production playtest/telemetry globals.

Latest deployed preview release smoke evidence: `.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/release-smoke-summary-preview-after-console-policy-fix.json`. It proves the confirmed preview URL `https://comebacktrackerkartgame.showcase-designs-preview.pages.dev` loads home/core tracker navigation and `/#race`, records nonblank WebGL race canvases, desktop keyboard acceleration from `0` to `0.368`, mobile Go touch acceleration from `0` to `0.51`, manifest status `200`, service-worker status `200`, FatSecret safe-status `200`, and sync safe unauthenticated status `401`. It does not prove production URL smoke, authenticated D1 sync, production rollback, monitoring, or release sign-off.

## Deployed Header Smoke Command

Local Cloudflare-style header simulation:

```sh
npm run test:headers:deployed
```

Preview or production URL command:

```sh
DEPLOYED_HEADERS_SMOKE_URL=<url> DEPLOYED_HEADERS_SMOKE_TARGET=<preview|production> npm run test:headers:deployed
```

Latest local header evidence: `.agent/runs/kart-racer-production-readiness/evidence/deployed-headers-001-20260524T123726Z/deployed-headers-smoke-summary.json`. It proves the response-header comparator and local `_headers` simulation for CSP, Permissions-Policy, security headers, service-worker cache headers, manifest cache headers, and hashed asset cache headers.

Latest deployed preview header evidence: `.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/deployed-headers-smoke-summary-preview.json`. It records `deployed-response-headers-pass-needs-release-signoff` for `https://comebacktrackerkartgame.showcase-designs-preview.pages.dev`, with root CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, manifest cache, service-worker cache, and hashed asset cache headers matching `public/_headers`. It does not prove production deployed response headers or release sign-off.

## API/Data Smoke Command

Local mocked API/data command:

```sh
npm run test:api:data
```

Preview URL safe-status command:

```sh
API_DATA_SMOKE_URL=<preview-url> API_DATA_SMOKE_TARGET=preview npm run test:api:data
```

Production URL safe-status command:

```sh
API_DATA_SMOKE_URL=<production-url> API_DATA_SMOKE_TARGET=production npm run test:api:data
```

Authenticated production sync read command, if sync/D1 is in scope:

```sh
API_DATA_SMOKE_URL=<production-url> API_DATA_SMOKE_TARGET=production API_DATA_SMOKE_JWT=<cf-access-jwt> API_DATA_SMOKE_USER_ID=<user-id> npm run test:api:data
```

Live FatSecret proxy command, if FatSecret is in scope and owner approval to call the proxy is supplied:

```sh
API_DATA_SMOKE_URL=<production-url> API_DATA_SMOKE_TARGET=production API_DATA_SMOKE_FATSECRET_LIVE_QUERY=<query> npm run test:api:data
```

Latest local API/data evidence: `.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z/api-data-smoke-summary.json`. It preserves the local mocked Cloudflare Access, D1 sync/backups/restore, and FatSecret safe-success/error proof. URL-mode harness evidence at `.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z/url-mode-mock/api-data-smoke-summary.json` proves the deployed-URL probe behavior against a deployment-shaped local mock server. It does not prove real preview/prod bindings because production URL, Cloudflare Access JWT, live FatSecret query approval, D1 migration/binding evidence, production API scope, privacy/log-retention posture, and release sign-off are not supplied.

Local rollback drill command:

```sh
npm run test:release:rollback
```

Latest local rollback evidence: `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/release-rollback-smoke-summary.json`. It proves a local built `dist` can switch from current-candidate to known-good and load `/#race` as WebGL after rollback. It does not prove Cloudflare production rollback, deployed response headers, D1 rollback compatibility, monitoring/support, rollback-owner approval, or sign-off.

Latest local header/PWA/CSP evidence: `.agent/runs/kart-racer-production-readiness/evidence/csp-headers-001-20260523T233058Z/csp-headers-001-summary.json`. It proves local `_headers` parity, delivered 13-directive `Content-Security-Policy`, cache headers, manifest metadata, service worker control, and offline app shell reload. It does not prove deployed Cloudflare response headers, barcode/camera scope, or release-owner sign-off.

Latest local installed-app update evidence: `.agent/runs/kart-racer-production-readiness/evidence/pwa-update-001-20260523T234355Z/pwa-update-001-summary.json`. It proves a versioned local built app updates from v1 to v2, emits service worker `updatefound` and `controllerchange`, loads the v2 shell online, and keeps the v2 shell available offline. It does not prove production URL update behavior or the target browser/device installed-app matrix.

## Accessibility Smoke Command

Local built-preview command:

```sh
npm run test:accessibility
```

Latest local evidence: `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/accessibility-smoke-summary.json`. It proves visible named controls, no duplicate IDs, no visible images without alt, visible keyboard focus, keyboard mute-toggle operation, reduced-motion propagation through DOM state, desktop hiding of the mobile-only Go control, mobile Go touch acceleration, and representative contrast samples. It does not replace target-browser/device manual accessibility review or release-owner sign-off.

## Release Artifact Safety Command

Local built-artifact command:

```sh
npm run test:release:artifacts
```

Latest classified artifact evidence: `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-release-artifact-safety-report.json`. It proves built `dist` has no source map files, no `sourceMappingURL` references, no standalone playtest/debug files, no scanned secret env names or known test secret values, no detected runtime playtest automation strings, no detected diagnostic telemetry globals, and no detected `visual-kart` route/mode strings in the standard production build. Latest behavior evidence at `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-release-smoke-summary.json` proves standard production builds ignore `raceAutoplay`/`raceNoFinish` automation unless `VITE_RACE_PLAYTEST_HOOKS=true`: the local built-preview query probe creates no `__racePlaytestEvents`, no `__racePlaytestResult`, no `__raceVisualTelemetry`, no `__raceVisualTelemetrySamples`, and leaves normalized speed at `0`.

Local release decision audit command:

```sh
npm run test:release:decisions
```

Latest release decision evidence: `.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/release-decision-readiness-summary.json`. It records gate status `tracked-decisions-not-currently-marked-not-supplied`, `0` missing decision categories, and `7` current `Not supplied` production execution-evidence rows after preview deployment/smoke proof. Q8-Q12 owner answers are recorded at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-002-20260601T165558Z/owner-decision-intake-002.md`; Q13-Q17 owner answers are recorded at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-003-20260601T182940Z/owner-decision-intake-003.md`; Q18-Q22 owner answers and delegated release baselines are recorded at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-004-20260601T191542Z/owner-decision-intake-004.md`; Q23-Q27 answers and visual/IP/support/API follow-up decisions are recorded at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-005-20260601T201921Z/owner-decision-intake-005.md`; Q28-Q32 preview target, planned branch URL, manual QA hardware, and asset inventory confirmation request are recorded at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-006-20260601T205430Z/owner-decision-intake-006.md`; Q33-Q37 asset provenance confirmation, QA browser targets, preview-domain production-readiness policy, and deploy permission are recorded at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-007-20260601T221929Z/owner-decision-intake-007.md`; Q38-Q42 Brave desktop QA, reference-scope approval, protected-similarity approval, direct Wrangler upload, and native production rollback selection are recorded at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-008-20260602T200240Z/owner-decision-intake-008.md`; Q43-Q47 release branch, manual checklist fallback, same-build production direct-upload approval, Web Analytics enablement-if-needed policy, and separate desktop/mobile QA files are recorded at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-009-20260603T142332Z/owner-decision-intake-009.md`; Q48-Q52 release-branch switch approval, `isethius` release-owner identity, canonical preview URL approval, two-production-deployment rollback proof approval, and Web Analytics dashboard/access fallback are recorded at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-010-20260603T150000Z/owner-decision-intake-010.md`; Q53-Q57 clean-tree/checklist/deploy approval is recorded at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-011-20260603T155244Z/owner-decision-intake-011.md`.

## Production Gate Readiness Audit Command

Local P0/P1 matrix command:

```sh
npm run test:production:gates
```

Latest gate evidence: `.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/production-gate-readiness-summary.json`. It records gate status `r3-blocked-gates-remain`, `8` of `21` P0 gates as `Proven`, `5` of `14` P1 gates as `Proven`, `10` DoD rows not Proven-like, `10` manual QA rubric rows without a `4`/`5` score, `7` production `Not supplied` rows, CI/release automation as Partial, preview smoke as Proven, and no broken local evidence links. It does not replace production, QA, rollback, monitoring, or release sign-off.

## Manual QA Capture Prep Command

Local built-preview command:

```sh
npm run test:qa:capture
```

Latest local prep evidence: `.agent/runs/kart-racer-production-readiness/evidence/manual-qa-prep-001-20260524T093705Z/manual-qa-capture-summary.json`. It records desktop idle, speed, and drift screenshots, a mobile driving screenshot, a `10.96s` silent WebM clip candidate, runtime telemetry, file-type checks, byte-size checks, and a prefilled result template. It does not replace human desktop play, human mobile play, fresh-user answer, manual QA category scores, or release-owner sign-off.

## Production Dependency Audit Command

Local production dependency command:

```sh
npm run test:security:prod
```

Latest local evidence: `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-004-20260601T191542Z/security-production-audit-summary.json`. It proves `npm audit --omit=dev` and full `npm audit` exit `0` with zero reported vulnerabilities after upgrading Vite/PWA build tooling. Full audit evidence is `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-004-20260601T191542Z/npm-audit-full-vite8.json`.

## Monitoring/Support Readiness Audit Command

Local runbook/template command:

```sh
npm run test:monitoring:support
```

Latest local evidence: `.agent/runs/kart-racer-production-readiness/evidence/monitoring-support-001-20260524T025102Z/monitoring-support-readiness-summary.json`. It proves the local runbook/template structure covers 12 monitoring signals, 11 support steps, 6 owner-input blockers, and 7 post-launch template sections. Owner/admin-only V1 support path is recorded on 2026-06-01; owner approved enabling/configuring Cloudflare Web Analytics if missing and needed on 2026-06-03; deployed signals and release-owner sign-off remain pending.

## Preview Deployment Smoke

| Item | Required evidence |
| --- | --- |
| Preview URL | Proven: `https://comebacktrackerkartgame.showcase-designs-preview.pages.dev`; Wrangler alias URL confirmed in `.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/wrangler-pages-deploy-preview.log` |
| Deployment ID | Proven: `d1169ee7-c653-4727-bed0-8dbac4d960f9`; metadata in `.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/wrangler-pages-deployment-list-preview.json` |
| Commit SHA | Proven: Wrangler source `948f630`, full local commit `948f6308e85aa3437ff5c08b852e33ac5f27ff22`; evidence in `.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/preview-deploy-summary.md` |
| App home loads | Proven: `.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/release-smoke-summary-preview-after-console-policy-fix.json` and `release-smoke-home-preview.png` |
| `/#race` loads | Proven: desktop and mobile race smokes pass in `.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/release-smoke-summary-preview-after-console-policy-fix.json` |
| Race starts and canvas is nonblank | Proven: desktop canvas data URL length `15090`; mobile canvas data URL length `9682`; screenshots `release-smoke-race-desktop-preview.png` and `release-smoke-race-mobile-preview.png` |
| Desktop keyboard acceleration works | Proven: deployed preview desktop smoke records normalized speed `0` before input and `0.368` after keyboard input |
| Mobile viewport controls render | Proven: deployed preview mobile smoke records Go button box `82x74` and normalized speed `0.51` after touch input |
| WebGL fallback or context-loss path remains navigable | Proven: deployed preview WebGL context-loss smoke records `canvas2d-fallback`, nonblank fallback canvas length `360554`, `fallbackRequested: true`, and successful exit home at `.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/webgl-context-preview/webgl-context-smoke-summary.json` |
| Core tracker smoke passes on preview | Proven: preview release smoke covers home, Food, Setup, and Today navigation in `.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/release-smoke-summary-preview-after-console-policy-fix.json` |
| In-scope API smoke passes on preview or is scoped out | Scoped out of immediate kart-racer readiness; owner/admin follow-up dated 2026-06-08 |
| `_headers`/CSP/Permissions-Policy/cache headers match release scope | Proven for preview: `.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/deployed-headers-smoke-summary-preview.json` |
| Console P0 error count is zero | Proven in preview release and WebGL smokes after allowing expected `/api/sync/me` unauthenticated 401 and external Google Fonts request failure; summaries record no blocking browser errors |
| Service worker and manifest responses are sane | Proven: manifest and service worker status `200` in `.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/release-smoke-summary-preview-after-console-policy-fix.json` |

## Production Deployment Smoke

| Item | Required evidence |
| --- | --- |
| Production URL | Actual Pages production deployment URL pending; record the URL emitted by Wrangler/Cloudflare for the selected `showcase-designs-preview` production deployment |
| Deployment ID | Not supplied |
| Commit SHA | Not supplied |
| Fresh profile app load | Not supplied |
| `/#race` first-lap smoke | Not supplied |
| Desktop smoke | Not supplied |
| Mobile smoke | Not supplied |
| Core tracker smoke | Not supplied |
| In-scope API smoke or scope exception | Scoped out of immediate kart-racer readiness; owner/admin follow-up dated 2026-06-08 |
| Header policy from deployed responses | Not supplied; local URL-capable header comparator evidence exists at `.agent/runs/kart-racer-production-readiness/evidence/deployed-headers-001-20260524T123726Z/deployed-headers-smoke-summary.json` |
| Monitoring/version signal, if enabled | Pending deployed Cloudflare Web Analytics/version evidence; owner-supplied Cloudflare dashboard screenshots/details or owner-provided access are acceptable if local CLI/API confirmation is unavailable |
| Rollback target identified | Native Cloudflare Pages production rollback selected; owner approved two safe production deployments for rollback proof, but exact known-good/newer production deployment IDs are not supplied |
| Race disable/recovery path identified | Owner/admin only; Cloudflare Pages rollback is primary, `VITE_RACE_DISABLED=true` clean redeploy is secondary for race-only breakage |

## Rollback Procedure

Cloudflare Pages rollback is the primary production recovery path for owner/admin-triggered P0/P1 release regressions. Owner selected the native production deployment rollback path on 2026-06-02 because Cloudflare Pages preview deployments are not valid rollback targets. On 2026-06-03, owner approved creating two safe production deployments during this readiness pass to prove native rollback from the newer deployment back to the known-good deployment. The target project is `showcase-designs-preview`; production URL and deployment IDs are still pending in repo evidence. A local-only rollback drill is available through `npm run test:release:rollback`; it exercises copied `dist` roots behind a switchable local server and must not be treated as Cloudflare production rollback sign-off.

1. Identify the known-good production deployment ID.
2. Confirm rollback owner approval.
3. Revert production to the known-good deployment in Cloudflare Pages.
4. Record rollback timestamp, operator, deployment ID before rollback, and deployment ID after rollback.
5. Run production smoke after rollback.
6. Record whether `/#race`, home, core tracker, sync/API scope, and PWA shell recover.
7. If sync is in scope in the later API follow-up, verify the D1 backup restore path or record the production rollback alternative.

Current rollback target: Not supplied; two safe production deployments are approved for proof but not executed.
Latest local drill: `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/release-rollback-smoke-summary.json`.

Official rollback basis:

- Cloudflare Pages rollbacks revert to a previous production deployment.
- Cloudflare Pages preview deployments are not valid rollback targets.
- Wrangler direct upload supports uploading prebuilt assets and specifying a preview branch for branch smoke.

Production deploy sequence selected on 2026-06-03:

1. Prepare clean release branch `codex/release-v1-comebacktracker-kart-racer`.
2. Run the owner-approved local manual release checklist if GitHub Actions is unavailable.
3. Direct-upload the clean build to preview branch `comebacktrackerkartgame`.
4. If preview smoke passes, direct-upload the same clean build to the selected Pages project production environment.
5. Record production URL, deployment ID, commit SHA, and native Cloudflare Pages rollback target.

## Race Disable/Recovery Procedure

Local technical control is documented in `docs/race-disable-recovery-runbook.md`.

Production activation policy:

- Owner/admin only may activate race-disable recovery.
- Use Cloudflare Pages rollback when the full deployment is bad or the known-good production deployment is the fastest safe recovery.
- Use a clean redeploy with `VITE_RACE_DISABLED=true` only when the race is broken but core tracker should stay live.
- Still required before sign-off: target Cloudflare Pages project, branch, env value, deployment ID, preview/prod smoke with disabled and enabled states, and recovery sign-off.

## Monitoring And Support Triage

| Signal | Current source | Status |
| --- | --- | --- |
| App load errors | Cloudflare Web Analytics plus deployed smoke/support checks after launch | Production missing |
| Race route load errors | Cloudflare Web Analytics plus deployed smoke/support checks after launch | Production missing |
| WebGL creation/context-loss failures | Local smoke only | Production missing |
| Pages Functions errors | Workers Logs when Functions/API ship; API scope is out of immediate release | Scoped out for immediate release |
| Race start/completion counts | Local browser harness only | Production missing |
| Time to first drift/item pickup | Local harness can exercise mechanics | Production missing |
| Average/low-percentile FPS | Local browser summary only | Production missing |
| Device/browser bucket | Local harness only | Production missing |
| Deployment version/commit | Bundle report records local commit | Production missing |
| Service worker update state | Local PWA smoke only | Production missing |
| Race disable/rollback activation status | Local race-disable smoke and local rollback drill only | Production missing |
| Manual support reports | Owner/admin-only launch support path through Cloudflare dashboard checks, smoke evidence, and this runbook/post-launch report; no public support contact for V1 until supplied | Production missing |

Cloudflare Web Analytics setup note: if Web Analytics is missing and needed, enable it for the Pages project from Workers & Pages, select the project, then Metrics and Enable under Web Analytics. Cloudflare Pages automatic setup injects the JavaScript snippet on the next deployment. If local CLI/API confirmation is unavailable, owner-supplied Cloudflare dashboard screenshots/details or owner-provided access are acceptable evidence. Source: https://developers.cloudflare.com/web-analytics/get-started/

### Incident Intake Fields

Record these fields for every P0/P1 race, app, sync, PWA, or support report:

| Field | Required value |
| --- | --- |
| Reporter/contact | Support contact/path from release owner, or direct reporter if supplied |
| Production URL | Exact URL where issue occurred |
| Deployment ID | Current deployed version from Cloudflare Pages |
| Commit SHA | Current deployed commit |
| Browser/device/OS | Browser name/version, device class, OS, viewport |
| Installed PWA | Yes/no/unknown |
| Route | Home, food, settings, `/#race`, sync/API, or other |
| Steps to reproduce | Numbered steps, including whether fresh profile was used |
| Screenshot/recording | Path or link |
| Console/network errors | Raw browser console and failed request summary |
| Monitoring signal | Provider event ID, Cloudflare log path, or explicit no-provider note |
| Data/API scope | Whether sync, D1 backups, FatSecret, or barcode scanner is in scope |
| Decision | Continue, rollback, race-disable, fix-forward, or monitor |

### Operator Signal Checks

Use this table when monitoring is enabled, or mark the provider/event path as not available when the release owner has accepted no-provider risk.

| Area | Check |
| --- | --- |
| App shell | App load errors, console P0s, deployed headers, service worker update state |
| Race route | Race route load errors, WebGL context creation/context-loss failures, race start/completion counts |
| Race mechanics | Time to first drift, time to first item pickup, average/low-percentile FPS if privacy-approved |
| Data/API | Pages Functions errors, D1 sync/backups, FatSecret proxy health when in scope |
| Release controls | Deployment version/commit, race disable/rollback activation status |
| Support | Manual support reports, browser/device bucket, known limitation match |

### Triage Steps

1. Record URL, deployment ID, commit, browser, device, viewport, network, and whether the app is installed as PWA.
2. Capture screenshot or screen recording.
3. Check console errors and network failures.
4. Reproduce `/#race` in a fresh browser profile.
5. Test home, food entry, settings, sync status, export/import, and return navigation.
6. Clear site data or unregister service worker only as a troubleshooting step; record before/after behavior.
7. If sync/FatSecret is in scope, check Cloudflare Pages Function logs and D1/FatSecret health.
8. If barcode scanning ships, record scanner surface behavior, camera permission state, and whether `Permissions-Policy` matches release scope.
9. If P0, choose rollback or race-disable path according to release-owner policy.

### Post-Launch Monitoring Window Template

Release-owner window selected on 2026-06-01: launch day plus 24 hours after production deploy, with owner/admin checks at deploy, +1h, and +24h.

| Window | Required checks |
| --- | --- |
| First 30 minutes | Production smoke stays green, P0 console/app/race errors remain zero, support path receives no P0 reports |
| First 24 hours | Error/support trend is reviewed, WebGL/PWA/API support reports are triaged, rollback/race-disable state is unchanged or documented |
| First week, if required | Open P1/P2 issues have owners and dated follow-ups |

## Known Current Limitations

- Target is selected as `showcase-designs-preview` branch `comebacktrackerkartgame` for preview smoke and the selected Pages project production environment for production smoke/native rollback. Release branch name, branch switch approval/evidence, `isethius` release-owner identity, manual checklist fallback, canonical preview URL policy, production direct-upload approval, two-production-deployment rollback proof approval, Web Analytics enablement/dashboard evidence policy, and separate desktop/mobile QA files are selected. Preview deploy and preview smoke evidence is recorded; production deploy and production-readiness sign-off evidence remains pending.
- Executed preview URL smoke, preview deployed-header smoke, and preview WebGL context-loss smoke pass at `.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/`; production URL smoke is still missing.
- No production rollback target or Cloudflare rollback drill; two safe production deployments are approved for proof, but only local copied-`dist` rollback rehearsal exists.
- Deployed Cloudflare Web Analytics/version signal is not recorded, and Web Analytics enablement status is not recorded; owner dashboard screenshots/details or owner-provided access are acceptable if local confirmation is unavailable.
- V1 uses owner/admin-only manual support; no public support contact is added until the owner supplies one.
- No manual QA, fresh-user review, product/design sign-off, or legal/IP sign-off.
- No target-browser/device manual accessibility sign-off.
- Clean-start local RC checklist execution, local CI workflow structure audit, preview deploy smoke, and preview deployed-header smoke pass, but production deploy smoke, production deployed headers, Cloudflare rollback, monitoring evidence, owner QA scores, and release sign-off are not supplied.
- Desktop FPS remains below the local floor and PRD target in latest kept evidence.
- Bundle/asset budget is accepted locally against the owner-delegated kart-racer V1 baseline; preview deployed release smoke passes and production deployed release evidence remains pending.
- Source-map/debug artifact safety and standard production hook-disable behavior are locally smoke-proven; the latest artifact classifier records runtime playtest automation strings, diagnostic telemetry globals, and `visual-kart` route/mode strings as not detected in the standard production build. Latest `perf-038` runtime hardening also skips visual-diagnostic telemetry construction in standard production while preserving HUD race state. Owner source-map policy, protected monitoring upload policy if any, and broader telemetry/log-retention privacy posture are still not supplied.
- Production dependency audit is locally clean, and full `npm audit` passes after the Vite/PWA build-tool upgrade. Re-run on the clean release branch before production deploy.
