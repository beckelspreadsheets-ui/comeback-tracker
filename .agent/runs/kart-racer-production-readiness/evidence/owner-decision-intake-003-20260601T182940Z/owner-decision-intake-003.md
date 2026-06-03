# Owner Decision Intake 003

Created at: 2026-06-01T18:29:40Z

Status: owner answers recorded for Q13-Q17, with two agent-selected policies based on official Cloudflare documentation

This file records owner answers supplied in chat after Q13-Q17. It closes or narrows several release-operation decisions, but it does not by itself prove R3 Production Ready because exact deployment URLs, smoke results, QA scores, performance, and final sign-offs are still missing.

## Official Cloudflare Research Used

- Cloudflare Pages rollbacks can instantly revert to a previous successful production deployment; preview deployments are not valid rollback targets.
- Cloudflare Pages branch deployment controls allow production and preview deployment behavior to be configured by branch.
- Cloudflare Pages preview deployments create per-branch preview URLs and branch aliases; preview deployments can be protected with Cloudflare Access.
- Cloudflare Web Analytics provides free privacy-first page analytics and performance signals for Pages projects.
- Cloudflare Workers Logs collect Workers invocation/custom logs, errors, and uncaught exceptions in the Cloudflare dashboard; structured JSON logs are the recommended format.

## Supplied Answers

| Question | Owner answer supplied in chat | Recording status |
| --- | --- | --- |
| 13. Cloudflare production/preview target | "we have a working link but we can use any of my clouflares accounts most likely a branch off showcase-designs.com" | Partial. Production target is expected to be a Cloudflare Pages branch/custom-domain deployment under `showcase-designs.com`, using one of the owner's Cloudflare accounts. Exact account, Pages project, branch, preview URL, production URL/domain, and deployment ID are still not supplied. |
| 14. Release owner, rollback owner, and clean deploy policy | "I am the owner of this I believe we should clean up the working tree branches so it comes from a clean one moving forward" | Supplied for owner and clean-deploy direction. Release owner and rollback owner are owner/admin only. Production deploys must come from a clean branch/worktree after branch cleanup; the current dirty local RC evidence is not production-release-accepted. CI versus manual release gate remains pending. |
| 15. Race-disable/rollback policy | "I have no clue here can we research the best option? should be just me the admin owner" | Agent-selected based on official Cloudflare docs. Owner/admin only may activate production recovery. Primary recovery is Cloudflare Pages rollback to the latest known-good production deployment for production-impacting regressions. Secondary race-only recovery is a clean rebuild/redeploy with `VITE_RACE_DISABLED=true` when the race is broken but the core tracker should stay live and rollback is not the right product choice. Preview and production must smoke both recovery paths before sign-off. |
| 16. Cloudflare Functions/D1/FatSecret/barcode/camera production scope | "they will come later but we need to do this right after everything else please and I need more information to provide the smoke inputs" | Scoped out of the immediate kart-racer production readiness target. Cloudflare Functions, D1 sync, FatSecret proxy, barcode scanner, and camera permissions are post-readiness follow-up work. Current release evidence must keep local API/core tracker proof, but production URL/JWT/live FatSecret/binding smoke remains pending until the follow-up. Exact dated follow-up is still not supplied. |
| 17. Monitoring/support/privacy posture | "whats the best option here for the task at hand I'll let you pick please" | Agent-selected based on official Cloudflare docs. Use Cloudflare-native monitoring for V1: Cloudflare Web Analytics for privacy-first Pages page/performance signals; Workers Logs only when Pages Functions/API scope ships; no third-party monitoring provider for this V1 release. Logs must be structured JSON, avoid food/health payloads, emails, tokens, raw request bodies, and user identifiers, and use Cloudflare plan default retention. Owner/admin is the telemetry/log retention owner. Production source maps, debug routes, and test hooks remain disabled for standard production; no source-map upload is required for V1. |

## Recommended Operational Policy Now Recorded

- Preview policy: use a clean release branch connected to Cloudflare Pages preview deployment; protect preview access with Cloudflare Access when non-public review is desired.
- Production policy: deploy production from a clean release branch/worktree only after release gates pass.
- Rollback policy: identify and record the known-good production deployment before launch; owner/admin can rollback in Cloudflare Pages if launch smoke or monitoring finds P0/P1 regressions.
- Race-disable policy: use `VITE_RACE_DISABLED=true` only as a race-specific clean redeploy when rollback would remove acceptable non-race fixes or when owner/admin intentionally keeps core tracker live while disabling the race.
- Monitoring policy: Cloudflare Web Analytics plus deployed smoke/support checks for static Pages; Workers Logs added when Functions/API ship; no PII/food/health payload logging.

## Remaining Known Decision Gaps After Q13-Q17

- Exact Cloudflare account, Pages project, release branch, preview URL, production URL/domain, and deployment ID.
- CI versus manual release gate final decision, or both.
- Exact support contact/path.
- Post-launch monitoring window and thresholds, unless the owner accepts the default proposed launch day/24-hour monitoring window in the next intake.
- Dated follow-up for Cloudflare Functions/D1/FatSecret/barcode/camera productionization.
- Web Vitals/Lighthouse target or dated exception.
- Bundle/asset budget threshold or dated exception.
- Vite/esbuild/vite-plugin-pwa advisory policy: accept production-only audit split, upgrade now, or exception with dated follow-up.
- Exact visual composition metrics, item/IP/provenance decisions, owner manual QA scores, preview/prod smoke evidence, deployed header evidence, Cloudflare rollback evidence, deployed monitoring/support evidence, and final sign-offs.
