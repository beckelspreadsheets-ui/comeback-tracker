# Owner Decision Intake 009

Date: 2026-06-03
Source: Chat answers Q43-Q47
Status: owner decisions recorded; execution evidence still pending

## Answers Recorded

| Question | Owner answer | Recorded decision |
| --- | --- | --- |
| Q43. What release branch name should be used for the clean production-readiness branch? | `release v1 comebacktracker kart racer` | Use Git-safe branch name `codex/release-v1-comebacktracker-kart-racer` when creating the clean release branch. This preserves the owner label and uses the default Codex branch prefix. |
| Q44. Is a local manual release checklist approved if GitHub Actions is not available? | Yes | A local manual release checklist is owner-approved as the release gate when a GitHub Actions run is unavailable, provided it is run from the clean release branch/worktree and records equivalent command/deploy/smoke evidence. |
| Q45. After preview smoke passes, may the same clean build be direct-uploaded to Pages production for production smoke and rollback proof? | Yes | After preview smoke passes, direct-upload the same clean build to the selected Cloudflare Pages production environment for production smoke and native rollback proof. |
| Q46. Should Cloudflare Web Analytics be enabled/configured if missing? | Enable if missing and needed | Cloudflare Web Analytics may be enabled/configured for the selected Pages project if it is missing and needed for production monitoring evidence. |
| Q47. Should manual QA be recorded in one combined result or separate desktop/mobile files? | Separate files | Record desktop and mobile manual QA in separate dated result files, one for Mac mini M4 with Brave and one for iPhone 16 Pro with Safari. |

## Cloudflare Web Analytics Basis

Cloudflare's current Web Analytics documentation says Pages projects can enable Web Analytics from Workers & Pages, selecting the Pages project, then Metrics and Enable under Web Analytics. Cloudflare automatically adds the JavaScript snippet on the next deployment when using Pages automatic setup.

Source: https://developers.cloudflare.com/web-analytics/get-started/

## Immediate Audit Impact

- Release branch policy is supplied as `codex/release-v1-comebacktracker-kart-racer`.
- Manual release checklist policy is supplied, but actual checklist execution evidence remains pending.
- Production direct-upload approval is supplied, but actual production URL, deployment ID, commit SHA, smoke, and rollback evidence remain pending.
- Cloudflare Web Analytics enablement policy is supplied, but actual enabled/status evidence remains pending.
- Manual QA result structure is supplied as separate desktop and mobile dated result files, but scores remain pending.
