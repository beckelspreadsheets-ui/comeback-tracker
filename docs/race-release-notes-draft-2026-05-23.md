# Comeback City Kart Racer Release Notes Draft - 2026-05-23

Status: draft only, not release-owner approved
Related plan gate: Release notes P1 gate

## Audience

This draft separates user-facing notes from operator-facing notes. Do not publish until product/design/legal/release sign-off is supplied.

## User-Facing Draft

Comeback City Kart Racer adds a playable kart race route inside the Comeback City experience.

Included in current local evidence:

- Comeback City GP route with kart racing, rivals, boost pads, items, hazards, drift, and finish flow.
- Reduced-motion behavior.
- Mute control.
- WebGL fallback and local context-loss recovery path.
- Race exit back to the main app.

Not approved for release wording yet:

- Final product name/description.
- Visual target claims.
- Performance claims.
- Mobile/touch claims.
- IP/provenance claims.
- Any statement that preview or production deployment is ready.

## Operator-Facing Draft

Current local evidence exists for:

- Race browser harness.
- Local cross-browser smoke for Playwright Chromium, Playwright Firefox, Playwright WebKit, and local Chrome.
- Local device-matrix smoke for desktop viewport keyboard acceleration and emulated-phone touch acceleration.
- Local deployed-header smoke for Cloudflare-style `_headers` simulation and URL-capable response-header comparison.
- Local CI release workflow structure audit for `.github/workflows/race-production-gates.yml`.
- Core tracker smoke.
- Mocked API/data smoke for sync/D1/FatSecret paths, including same-schema D1 backup restore.
- Built-app header/PWA/CSP smoke.
- Local installed-app PWA update smoke.
- Page lifecycle/audio smoke.
- WebGL context-loss smoke.
- Race-disable route guard.
- Local bundle/asset size report.
- Local release artifact safety smoke for absent source maps, absent standalone debug/playtest files, absent scanned secret-name leaks, and standard production playtest-query disable behavior.
- Local release telemetry hardening evidence showing runtime playtest automation strings, diagnostic telemetry globals, and `visual-kart` route/mode strings are not detected in the standard production build; standard production release smoke now uses DOM race state and records no playtest or telemetry globals.
- Local monitoring/support readiness audit for runbook and post-launch template structure.

Known release blockers:

- Owner/release decisions are supplied or narrowed to execution evidence; final product/design, manual QA, deploy, rollback, monitoring, and release sign-offs remain missing.
- Desktop FPS remains below target.
- Manual QA and fresh-user review are missing.
- Preview/prod/rollback evidence and production monitoring/support activation or risk acceptance are missing.
- Actual GitHub Actions run URL or clean-branch manual checklist execution signed by `isethius` is missing; local workflow structure and release branch switch are recorded.
- Real preview/production deployed response-header evidence is missing; local header simulation passes.
- Cross-browser/device coverage remains partial: local Chrome/Chromium/Firefox/WebKit smoke and local desktop/emulated-phone smoke pass, but actual Safari, Microsoft Edge, physical devices, human playthrough, and release-owner sign-off are missing.
- Production scope for sync/D1/FatSecret/barcode is not supplied.
- Bundle budget is accepted locally against the owner-delegated kart-racer V1 baseline; deployed preview/prod release evidence remains pending.
- Telemetry privacy/log-retention policy is supplied for V1 through Cloudflare-native monitoring with no PII/food/health payload logging; deployed Web Analytics/version evidence remains missing.
- Vite/esbuild advisory decision is resolved by upgrading dev/build tooling and requiring full `npm audit` to pass.

## Follow-Up Tickets To List At Release

| Ticket | Status |
| --- | --- |
| `PROD-000` owner/release decisions | Supplied/narrowed to execution evidence; deploy, QA, monitoring, rollback, and sign-off evidence still missing |
| `PROD-013` manual QA | Missing |
| `PROD-020` desktop FPS | Failing |
| `PROD-031` cross-browser/device matrix | Partial; local Chrome/Chromium/Firefox/WebKit plus desktop/emulated-phone smoke recorded, actual Safari/Edge/physical-device sign-off missing |
| `PROD-032` Web Vitals/Lighthouse | Missing |
| `PROD-033` bundle/asset budget acceptance | Accepted locally against owner-delegated V1 baseline |
| `PROD-034` source-map/debug artifact policy | Local artifact and production hook behavior safety recorded; runtime automation strings, telemetry globals, and visual-review route/mode strings are not detected in the standard production build |
| `PROD-041` IP/provenance sign-off | Missing |
| `PROD-051` preview smoke | Missing |
| `PROD-052` production smoke | Missing |
| `PROD-053` rollback procedure | Missing; native Cloudflare Pages rollback and two safe production deployments are approved, but deployment IDs and post-rollback smoke are missing |
| `PROD-054` CI/manual release gate | Partial; local workflow structure, local audit, and release branch switch recorded, actual CI run URL or clean-branch manual checklist execution missing |
| `PROD-060` monitoring/support | Local runbook/template structure recorded; Cloudflare Web Analytics/dashboard-access policy selected, deployed signals and sign-off missing |
| `PROD-070` launch report | Missing |
