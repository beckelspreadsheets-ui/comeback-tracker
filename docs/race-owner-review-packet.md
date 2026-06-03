# Comeback City Kart Racer Owner Review Packet

Status: owner decisions supplied; execution evidence still blocks production sign-off
Date: 2026-06-03
Source PRD: `docs/comeback-city-kart-racer-prd.md`

## Purpose

Use this packet to collect the product/design/legal decisions that block Kart Racer V1 planning. It is intentionally written as an input request. Do not fill unknown values from engineering judgment or current screenshots.

Related planning docs:

- `docs/race-visual-target-brief.md`
- `docs/race-v1-blocker-backlog.md`
- `docs/race-ip-provenance-audit.md`
- `docs/race-first-30-seconds-vertical-slice-plan.md`
- `docs/race-manual-qa-rubric.md`
- `docs/race-disable-recovery-runbook.md`
- `docs/race-release-operations-runbook.md`
- `docs/race-release-notes-draft-2026-05-23.md`
- `docs/race-post-launch-report-template.md`
- `docs/race-lab-readiness-smoke.md`
- `docs/api-data-safety-smoke.md`

## Current State To Review

| Area | Current state |
| --- | --- |
| Visual target | Partial. Owner supplied the original ChatGPT Image Gen 2 screenshot already created for the project, with no external resource, and approved genre-familiar arcade kart-racer UI/readability without copying exact/protected UI. The reference is copied to `src/assets/game/reference/comeback-city-original-reference.png`; SHA-256 `8d4aef74073da4c86b5360163478b978fe5c3101371bc7a8d18d7390e4003c55`. Owner approved the screenshot for V1 layout/measurement reference use on 2026-06-02 and allowed additional project-specific ChatGPT Image Gen 2 detail assets if needed. Local `npm run test:visual` passes with the reference; manual gameplay/product sign-off is still pending. |
| Automated race evidence | Browser harness last recorded 24 races and 28 focused visual/control/fallback checks at `2026-05-24T17:47:46.856Z` in `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-race-browser-playtest-summary.json`. |
| Current key failure | Latest kept FPS checkpoint remains `perf-023`; latest browser preservation run records sustained normal play at `17.89 actualFps`, below the local `45` floor and PRD `55` target. |
| Manual QA | Not run. `docs/race-manual-qa-rubric.md` is a runbook template; prep captures, telemetry, and a silent clip candidate exist at `.agent/runs/kart-racer-production-readiness/evidence/manual-qa-prep-001-20260524T093705Z/`, but no owner scores or owner clip answer exist. |
| IP/provenance | Current audit fingerprints assets and records owner/product-design sign-off for current retained assets. Owner confirmed on 2026-06-01 that all current bitmap assets in the intake 006 inventory were made with ChatGPT Image Gen for this project; on 2026-06-02 the owner approved reference-derived plaza measurement scope and protected-similarity review for the current screenshots/captures. New generated assets still need inventory and repeat review before release. |
| Race disable/recovery | Local technical flag and route guard are proven. Owner/admin is the only activation owner; primary production recovery is Cloudflare Pages rollback to a known-good production deployment, with `VITE_RACE_DISABLED=true` clean redeploy reserved for race-specific breakage where the core tracker should stay live. Target preview branch remains `showcase-designs-preview` branch `comebacktrackerkartgame`; native rollback proof will use the selected Pages project's production deployment because Cloudflare Pages preview deployments are not valid rollback targets. Deployment IDs and deployed smoke are still pending. |
| API/data safety | Local sync/D1/FatSecret smoke is proven, sync schema validation now matches app schema `5`, same-schema D1 backup restore is locally proven, and a URL-mode safe-status/read-only smoke harness is ready at `.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z/`. Cloudflare Functions, D1 sync, FatSecret proxy, barcode scanner, and camera permissions are scoped out of immediate kart-racer production readiness and moved to post-readiness follow-up; real URL/JWT/bindings/secrets/live FatSecret inputs are still pending for that follow-up. |
| Core tracker regression | Local smoke is proven for home, food entry, scanner surface, settings persistence, sync states, export/import, and return navigation at `.agent/runs/kart-racer-production-readiness/evidence/core-tracker-001-20260523T204431Z/`; preview/prod smoke is not supplied. |
| Header/PWA safety | Local built-app smoke proves `_headers`, delivered CSP, cache headers, manifest, service worker control, offline app shell reload, and local installed-app update from v1 to v2 at `.agent/runs/kart-racer-production-readiness/evidence/csp-headers-001-20260523T233058Z/` and `.agent/runs/kart-racer-production-readiness/evidence/pwa-update-001-20260523T234355Z/`; barcode/camera are scoped out of immediate release, so current denied camera policy remains acceptable until the post-readiness scanner follow-up. Deployed headers, production update behavior, target-browser lifecycle, and audio autoplay evidence are still pending. |
| Lab readiness/Web Vitals | Local Playwright lab smoke records home/race paint, CLS, long-task, basic accessibility DOM, best-practice, manifest, and service-worker signals. Owner delegated a conservative V1 baseline on 2026-06-01; latest Vite 8 evidence at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-004-20260601T191542Z/lab-readiness-smoke-summary.json` records `lab-baseline-pass`. Deployed preview/production evidence is still pending. |
| Local RC checklist | Fresh local RC checklist evidence at `.agent/runs/kart-racer-production-readiness/evidence/rc-local-checklist-001-20260524T013026Z/` proves build, race content, browser race, hub, visual, and production dependency audit commands pass on branch `main` at commit `9fb87c26bcdec19e8175f63a09e490f5400231aa`; it also records a dirty worktree. Owner approved switching to release branch `codex/release-v1-comebacktracker-kart-racer` from the current working tree state on 2026-06-03; branch evidence is recorded at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-010-20260603T150000Z/git-branch-after-q48.log`. This is not production-release-accepted until clean-branch manual checklist execution or CI run evidence exists. |
| Release smoke harness | URL-capable smoke exists via `npm run test:release:smoke`; local built-preview evidence at `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-release-smoke-summary.json` proves home/food/settings navigation, `/#race`, desktop keyboard acceleration, mobile touch acceleration, manifest, service-worker fetch, disabled production playtest/telemetry globals, and standard production visual-diagnostic telemetry skip behavior. Preview/prod URL smoke, deployed headers, API bindings, rollback, monitoring, and sign-off are not supplied. |
| Release artifact safety | Local classified artifact evidence at `.agent/runs/kart-racer-production-readiness/evidence/perf-038-production-visual-telemetry-guard-20260524T180000Z/candidate-release-artifact-safety-report.json` proves built `dist` has no source map files, no `sourceMappingURL`, no standalone playtest/debug files, no scanned secret env names or known test secret values, no detected runtime playtest automation strings, no detected diagnostic telemetry globals, and no detected `visual-kart` route/mode strings in the standard production build. The same checkpoint's release smoke proves standard production builds ignore `raceAutoplay`/`raceNoFinish` automation unless `VITE_RACE_PLAYTEST_HOOKS=true` and create no playtest or telemetry globals. |
| Release decision audit | Latest local audit `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-010-20260603T150000Z/release-decision-readiness-summary.json` records `0` missing decision categories and `19` `Not supplied` execution-evidence rows after Q48-Q52 owner-answer sync. Q48-Q52 approved switching to release branch `codex/release-v1-comebacktracker-kart-racer`, set release-owner identity to `isethius`, approved the planned preview URL as canonical if Wrangler confirms it, approved two safe production deployments for native Cloudflare Pages rollback proof, and approved owner-supplied Cloudflare dashboard screenshots/details or access if local Web Analytics confirmation is unavailable. |
| Production dependency audit | Vite, `@vitejs/plugin-react`, `vite-plugin-pwa`, and `workbox-window` were upgraded for production readiness. Latest evidence at `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-004-20260601T191542Z/security-production-audit-summary.json` records `full-dependency-audit-pass`; full `npm audit` records `0` reported vulnerabilities. |
| Accessibility | Local built-preview smoke at `.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/accessibility-smoke-summary.json` proves visible named controls, no duplicate IDs, visible focus, keyboard mute toggle, reduced motion via DOM state, desktop hiding of the mobile-only Go control, mobile Go touch acceleration, and representative contrast samples. Target-browser/device manual accessibility sign-off is not supplied. |
| Page lifecycle/audio | Local race-route smoke proves visibility/pagehide/pageshow input-clear, frame reset, blocked Web Audio resume handling, and mute/unmute telemetry at `.agent/runs/kart-racer-production-readiness/evidence/lifecycle-audio-001-20260523T210212Z/`; target-browser/device bfcache evidence and support/autoplay policy are not supplied. |

## Decisions Required

| Decision | Owner answer | Why it matters |
| --- | --- | --- |
| Target screenshot/capture for `RACE-001` | Approved: original ChatGPT Image Gen 2 screenshot created for this project and copied to `src/assets/game/reference/comeback-city-original-reference.png`; SHA-256 `8d4aef74073da4c86b5360163478b978fe5c3101371bc7a8d18d7390e4003c55`. | Required before art, camera, HUD, and first-slice quality can be judged against an approved composition target. |
| Target reference source/license | Owner states no external resource and custom ChatGPT Image Gen 2 production art; production bitmap assets must be custom ChatGPT Image Gen 2 outputs, with repo-native/code-native/procedural assets allowed and no external stock/game assets approved. | Required to confirm the reference is safe for composition-only use and will not become copied production art. |
| Target viewport priority | Equal desktop and mobile. | Determines whether next tuning optimizes desktop first, mobile first, or both equally. |
| Desired kart screen size and placement | Use the screenshot mobile game panel as target: rear kart centered in the lower third, readable body/tires, existing PRD numeric ranges retained as guardrails. | Confirms or adjusts the PRD ranges before framing tuning claims are made. |
| Desired horizon and road visibility | Skyline/horizon in the upper half, broad road-ahead visibility through the middle/lower frame, route/apex/item/rival readability preserved. | Confirms or adjusts composition gates and screenshot review criteria. |
| Object density and landmark expectations | Dense bright low-poly city with foreground road/water/bridge, midground district portals/signs, background skyline/mountains/clouds, and no empty-plane read. | Defines what is enough for the city to stop reading as empty or flat. |
| HUD direction | Use genre-familiar arcade kart-racer UI patterns and readability, but do not copy exact/protected UI or trade dress; all UI must be original Comeback City work. | Determines how close the HUD should be to genre conventions versus Comeback City brand. |
| V1 vehicle scope | Kart and hover-plane modes in scope on separate tracks. | Confirms kart-only V1 or retained hover/plane modes for V1 acceptance. |
| Item scope | Items are required. | Confirms whether items are required in the first quality pass or can be staged after driving/camera. |
| Audio scope | Audio is required. | Confirms whether generated audio cues are required for V1 acceptance. |
| Progression scope | City/progression integration is required. | Confirms standalone race quality first or city-progression integration before V1 sign-off. |
| Mobile performance target device/profile | iPhone 12+, iPhone SE 2nd generation low-end iOS check, Pixel 6a+, using iOS Safari and Android Chrome. | Required before mobile performance evidence can be judged as representative. |
| Item naming/IP direction | Use stricter original Comeback City player-facing labels: `Guard Gel`, `Comeback Surge`, `Fuel Magnet`/fuel tokens, and `Slick Gel`; replace `star-*` cue ids with `surge-*`. Existing internal keys remain implementation details to preserve tested mechanics. | Determines whether shell/star/banana/oil terminology must be renamed or re-skinned before sign-off. |
| Race-disable activation policy | Owner/admin only. Primary production recovery is native Cloudflare Pages rollback to a known-good production deployment; secondary race-only recovery is a clean redeploy with `VITE_RACE_DISABLED=true` when the race is broken but the core tracker should stay live. Preview redeploy remains supplemental only because Cloudflare Pages preview deployments are not valid rollback targets. | Determines whether production recovery uses `VITE_RACE_DISABLED=true`, rollback-only recovery, or another release-owner-approved path. |
| Source-map/debug/test-hook policy | Standard production keeps source maps, debug routes, diagnostic globals, and test hooks disabled; no source-map upload is required for V1 unless owner later approves a protected monitoring provider. | Determines whether production source maps stay disabled and whether protected monitoring upload is required. Local standard-build evidence now records no shipped playtest/debug route strings or diagnostic telemetry globals. |
| Production dependency audit policy | Upgrade dev/build tooling now; full dependency audit must pass before release. Implemented with Vite 8, `@vitejs/plugin-react` 6, `vite-plugin-pwa` 1.3, and `workbox-window` 7.4. Latest full audit passes with zero reported vulnerabilities. | Determines whether `npm audit --omit=dev` is accepted as production dependency evidence and whether the remaining full-audit Vite/esbuild/vite-plugin-pwa dev/build-tool advisories get a semver-major upgrade now or a dated release-owner exception. |
| Clean/dirty deploy and checklist acceptance | Production deploys must come from release branch `codex/release-v1-comebacktracker-kart-racer`. Owner approved creating/switching to that branch from the current working tree state on 2026-06-03; clean-branch manual checklist execution or CI run remains pending. | Determines whether the dirty local RC checklist evidence can be used for a release candidate, whether production deploys require a clean branch, and whether CI or a manual checklist is the release gate. |
| Preview and production Cloudflare Pages target | Selected project: `showcase-designs-preview`. Preview branch: `comebacktrackerkartgame`, planned branch preview URL `https://comebacktrackerkartgame.showcase-designs-preview.pages.dev`; owner approved using that URL as canonical if Wrangler confirms it after deployment. After preview smoke passes, owner approved direct-uploading the same clean build to the selected Pages project production environment for production smoke and native rollback proof. Actual deployment URLs, deployment IDs, commit SHA, and smoke results remain pending. | Required before preview smoke, production smoke, deployed headers, rollback planning, monitoring/version checks, and final release sign-off can close. |
| Launch owner and rollback owner | Owner/admin only; release-owner sign-off identity for this release is `isethius`. | Required before preview/prod deploy, rollback drill, and race-disable/recovery evidence can close. |
| Cloudflare sync/D1 production scope | Scoped out of immediate kart-racer production readiness; owner/admin follow-up dated 2026-06-08 to provide smoke inputs, bindings, and production scope. | Determines whether `/api/sync/**`, D1 migration, Access JWT, backups, and data rollback compatibility must pass production-like URL smoke with owner-supplied `API_DATA_SMOKE_URL` and `API_DATA_SMOKE_JWT`. |
| FatSecret/barcode production scope | FatSecret proxy, barcode scanner, and camera permissions are scoped out of immediate kart-racer production readiness; owner/admin follow-up dated 2026-06-08 to provide smoke inputs, secrets/bindings, live-query approval, and camera policy. | Determines whether `/api/fatsecret/**`, FatSecret secrets, scanner/camera UX, `Permissions-Policy: camera=()`, and owner-approved live `API_DATA_SMOKE_FATSECRET_LIVE_QUERY` smoke need production sign-off or explicit scoping out. |
| Telemetry/log retention owner | Owner/admin. Use Cloudflare Web Analytics for privacy-first Pages signals and enable/configure it if missing and needed; use Workers Logs only when Functions/API scope ships. If CLI/API cannot confirm Web Analytics locally, owner-supplied Cloudflare dashboard screenshots/details or owner-provided access are acceptable evidence. Logs must avoid food/health payloads, emails, tokens, raw request bodies, and user identifiers, and use Cloudflare plan default retention. | Required before sync/API/race logs and support workflows can be considered privacy-safe. |
| Accessibility reviewer and target device/browser set | Owner-only reviewer; browser baseline is desktop latest two stable Chrome, Edge, Safari, Firefox plus mobile iOS Safari and Android Chrome; device baseline is iPhone 12+, iPhone SE 2nd generation, Pixel 6a+, one Windows laptop, and one Mac laptop with integrated graphics. Owner manual QA first-pass hardware is Mac mini M4 with Brave, and iPhone 16 Pro with Safari. | Required before the local accessibility smoke can become production accessibility sign-off. |

## Composition Input Form

Fill this section only with owner-approved input.

| Field | Value |
| --- | --- |
| Target reference path or URL | `src/assets/game/reference/comeback-city-original-reference.png` |
| Reference owner/source/license | Owner-supplied ChatGPT Image Gen 2 generated reference; no external resource; production bitmap assets custom ChatGPT Image Gen 2 only |
| Review is composition-only, not production art | Approved as genre-familiar arcade kart-racer readability only; do not copy exact/protected UI, trade dress, characters, logos, sounds, item shapes, tracks, screenshots, names, or protected assets |
| Target viewport | Equal desktop and mobile |
| Kart height target | Mobile game panel target: rear kart centered in lower third; keep existing PRD numeric guardrails for desktop/mobile screenshots |
| Kart bottom/center placement target | Kart centered horizontally with bottom anchored low enough for speed feel while leaving route and apex visibility |
| Horizon placement target | Skyline/horizon stays in upper half with beacon/buildings visible |
| Road-ahead visibility target | Broad road-ahead view through center/lower middle; route, lane edges, item boxes, boost affordances, and rivals remain readable |
| Foreground density notes | Road markings, bridge/water edges, trees, curbs, and roundabout detail should make the scene feel built, not empty |
| Midground density notes | District portals/signage and street geometry should read immediately: Gym green, Food Court orange, Lab purple, Clinic red, Garage blue |
| Background density notes | Layered skyline, mountains, clouds, and beacon glow should create depth without muddying gameplay |
| HUD placement notes | Genre-familiar arcade racing HUD patterns are allowed, but exact/protected UI layouts are not approved for copying; use compact dark panels, minimap bottom left, go/action control bottom right, counters near top edge |
| Color/lighting notes | Bright daylight, saturated district colors, cyan/blue beacon glow, dark navy HUD panels, crisp white labels, and yellow route/action accents |
| IP restrictions beyond PRD | Custom ChatGPT Image Gen 2 production bitmap assets plus repo-native/code-native/procedural assets only; no external stock/game assets; original Comeback City characters, logos, sounds, and item shapes required |

## Scope Input Form

| Field | Value |
| --- | --- |
| Desktop-first, mobile-first, or equal priority | Equal desktop and mobile |
| V1 vehicle modes | Kart and hover-plane modes on separate tracks |
| V1 item set required | Required |
| V1 audio required | Required |
| V1 progression integration required | Required |
| Minimum mobile device/profile | iPhone 12+, iPhone SE 2nd generation low-end iOS check, Pixel 6a+ |
| Required manual reviewers | Owner only |
| Owner manual QA first-pass hardware | Mac mini M4 for desktop with Brave; iPhone 16 Pro for mobile with Safari |
| Manual QA result files | Separate dated desktop and mobile files |

## IP Review Input Form

| Topic | Owner/legal/design answer |
| --- | --- |
| `Guard Shell` name acceptable? | Not accepted for player-facing V1; renamed to `Guard Gel` |
| `Star Shield` name acceptable? | Not accepted for player-facing V1; renamed to `Comeback Surge` |
| `Banana Magnet` and banana pickups acceptable? | Not accepted for player-facing V1; item renamed to `Fuel Magnet` and copy describes fuel tokens; internal test-covered key remains implementation-only |
| `Oil Slick` acceptable? | Not accepted for player-facing V1; renamed to `Slick Gel` |
| Feedback cue ids with `star` terminology acceptable? | Not accepted for V1; changed to `surge-on`, `surge-contact`, and `surge-off` |
| Current binary assets under `src/assets/game/**` have confirmed provenance? | Confirmed by owner on 2026-06-01: all bitmap assets in `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-006-20260601T205430Z/owner-decision-intake-006.md` were made with ChatGPT Image Gen for this project. |
| Reference-derived plaza measurement data is acceptable for product scope? | Approved by owner on 2026-06-02 for V1 layout/measurement reference use; additional project-specific ChatGPT Image Gen 2 detail assets may be generated if needed and must be inventoried/reviewed before release |
| Current screenshots/captures pass protected-similarity review? | Approved by owner on 2026-06-02; owner states the current/final screenshots and captures do not look like Mario Kart much at all |

## Suggested Owner Prompt

```text
Please review docs/race-owner-review-packet.md for Comeback City Kart Racer V1.

The immediate blockers are:
1. Approve or supply the RACE-001 composition target screenshot/capture and source/license.
2. Choose desktop/mobile priority and V1 vehicle/item/audio/progression scope.
3. Confirm mobile performance target device/profile.
4. Review item naming/IP risks in docs/race-ip-provenance-audit.md.

Do not approve from current screenshots alone unless you intend those screenshots to be the target reference.
```

## How To Close This Packet

This packet is complete only when every `Not supplied` value above is either filled by the owner or explicitly marked not required for V1. After that:

1. Update `docs/race-visual-target-brief.md` with the approved composition target and measurable notes.
2. Update `docs/race-ip-provenance-audit.md` with the IP/naming/provenance decisions.
3. Update `docs/race-v1-blocker-backlog.md` to mark owner-decision blockers closed or narrowed.
4. Use the approved target and scope to guide performance, first-slice, audio, and manual QA sign-off.
