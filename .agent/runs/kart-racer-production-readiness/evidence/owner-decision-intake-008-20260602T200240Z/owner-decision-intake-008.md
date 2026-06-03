# Owner Decision Intake 008

Date: 2026-06-02
Source: Chat answers Q38-Q42
Status: owner decisions recorded; deployed evidence still pending

## Answers Recorded

| Question | Owner answer | Recorded decision |
| --- | --- | --- |
| Q38. Which exact desktop browser should be recorded for the first Mac mini QA run? | Brave | First desktop manual QA pass uses Mac mini M4 with Brave. Mobile first pass remains iPhone 16 Pro with Safari. |
| Q39. Is using the original ChatGPT screenshot as a layout/measurement reference acceptable for V1 product scope? | Yes, and use ChatGPT Image Gen 2 if more detail is needed. | The original owner-supplied ChatGPT Image Gen 2 screenshot is approved for V1 layout/measurement reference use. Additional project-specific ChatGPT Image Gen 2 assets may be generated if needed for detail, with inventory and similarity review repeated for new assets. |
| Q40. Do the current/final screenshots and captures pass protected-similarity review for V1? | Yes, they do not look like Mario Kart much at all. | Owner/product-design protected-similarity review passes for the current screenshots/captures and retained current assets. |
| Q41. Is direct Wrangler Pages upload acceptable? | Yes | Direct Wrangler Pages upload is accepted for the selected Cloudflare Pages project after clean branch/worktree preparation. |
| Q42. Cleanest rollback option? | Pick the cleanest option. | Use native Cloudflare Pages production deployment rollback for rollback proof. Keep the `comebacktrackerkartgame` branch URL for preview smoke/manual QA, but do not treat preview redeploy as the primary rollback gate because Cloudflare Pages preview deployments are not valid rollback targets. |

## Cloudflare Rollback Selection

Official Cloudflare Pages documentation states that Pages rollbacks revert a project to a previous production deployment, and that preview deployments are not valid rollback targets:

- https://developers.cloudflare.com/pages/configuration/rollbacks/
- https://developers.cloudflare.com/pages/configuration/preview-deployments/
- https://developers.cloudflare.com/pages/get-started/direct-upload/

Cleanest production-readiness path selected from those docs:

1. Build from a clean branch/worktree.
2. Direct-upload the built `dist` to the selected Pages project for preview branch smoke: `showcase-designs-preview`, branch `comebacktrackerkartgame`.
3. Direct-upload the approved build to the Pages production environment for production smoke and native rollback proof.
4. Record deployment IDs, URLs, commit SHA, timestamps, and smoke results for both preview and production.
5. Use the Cloudflare Pages production deployment rollback flow to restore a known-good production deployment, then run production smoke after rollback.
6. Retain `VITE_RACE_DISABLED=true` clean redeploy as the secondary race-only recovery path.

## Immediate Audit Impact

- Owner decision categories remain fully supplied.
- The owner packet IP rows for reference-derived plaza scope and protected-similarity review are no longer `Not supplied`.
- The first desktop manual QA browser is now Brave, but manual QA remains unrun.
- Rollback method is selected, but rollback evidence remains pending until production deployment IDs and post-rollback smoke are recorded.
- Direct Wrangler upload is accepted, but deployment evidence remains pending until the clean release branch/worktree is prepared and deployed.
