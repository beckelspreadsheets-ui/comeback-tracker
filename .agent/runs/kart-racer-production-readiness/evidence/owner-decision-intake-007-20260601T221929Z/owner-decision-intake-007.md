# Owner Decision Intake 007 - Q33-Q37

Date: 2026-06-01
Status: decision intake; deployment, smoke, rollback, manual QA scores, protected-similarity review, and final sign-off remain pending.

## Owner Answers Recorded

| Question | Owner answer | Repo interpretation |
| --- | --- | --- |
| Q33. Confirm current binary asset provenance. | "yes all made with chat gpt image gen" | Current bitmap inventory recorded in intake 006 is owner-confirmed as ChatGPT Image Gen output for this project. This closes the file-level source/provenance question for current retained game bitmap assets. |
| Q34. What browser will you use on the Mac mini M4 for manual QA? | "safari or brave" | Desktop manual QA first-pass browser candidates are Safari or Brave on Mac mini M4. The exact browser used must be named in the actual QA result. |
| Q35. What browser will you use on the iPhone 16 Pro for manual QA? | "safari" | Mobile manual QA first-pass browser is Safari on iPhone 16 Pro. |
| Q36. What production URL/domain should we use for this pass? | "lets just use any preview domain and label it we had comeback tracker already on a domain" | Use a Cloudflare Pages preview domain as the labeled production-readiness URL for this pass. No separate custom production domain is required for this pass unless the owner later changes scope. Actual deployed URL remains pending until deployment. |
| Q37. May deploy proceed after clean branch/worktree preparation? | "yes" | Owner approves deployment to Cloudflare Pages project `showcase-designs-preview`, branch `comebacktrackerkartgame`, after clean branch/worktree preparation and release-gate evidence. |

## Updated Release Target

| Field | Value |
| --- | --- |
| Cloudflare Pages project | `showcase-designs-preview` |
| Preview branch | `comebacktrackerkartgame` |
| Planned preview/labeled production-readiness URL | `https://comebacktrackerkartgame.showcase-designs-preview.pages.dev` |
| Separate custom production domain for this pass | Not required by owner decision on 2026-06-01 |
| Actual deployment URL | Pending deploy |
| Deployment ID | Pending deploy |
| Commit SHA | Pending clean branch/deploy |
| Preview smoke | Pending deployed URL smoke |
| Labeled production-readiness smoke | Pending deployed URL smoke |
| Rollback evidence | Pending Cloudflare rollback/redeploy proof or explicit release-owner exception |

## Updated Manual QA Target

| Field | Value |
| --- | --- |
| Desktop hardware | Mac mini M4 |
| Desktop browser | Safari or Brave; exact browser to be recorded in QA result |
| Mobile hardware | iPhone 16 Pro |
| Mobile browser | Safari |
| QA scores | Pending owner run with every category `4+` |

## Updated IP/Provenance Target

Owner confirms all current bitmap assets in the intake 006 inventory were made with ChatGPT Image Gen for this project:

- `src/assets/game/city-skyline-backdrop.png`
- `src/assets/game/comeback-city-race-backdrop-v2.png`
- `src/assets/game/comeback-city-race-backdrop.png`
- `src/assets/game/generated/district-facade-clinic.png`
- `src/assets/game/generated/district-facade-food.png`
- `src/assets/game/generated/district-facade-garage.png`
- `src/assets/game/generated/district-facade-gym.png`
- `src/assets/game/generated/district-facade-lab.png`
- `src/assets/game/reference/comeback-city-original-reference.png`

Remaining IP/provenance blockers:

- Reference-derived plaza measurement data product-scope approval.
- Current/final screenshots and captures protected-similarity review.
- Final item silhouette, UI, sound, logo, and composition similarity sign-off after the deploy/QA evidence exists.

## Remaining Blockers After This Intake

- Prepare clean branch/worktree without reverting unrelated user-owned changes.
- Deploy to `showcase-designs-preview` branch `comebacktrackerkartgame` and record actual deployment URL, deployment ID, commit SHA, and smoke results.
- Decide and record whether direct Wrangler Pages upload is the accepted deploy mechanism for the selected non-Git-connected Pages project.
- Record owner manual QA scores on Mac mini M4 and iPhone 16 Pro/Safari.
- Record protected-similarity review and plaza-measurement scope approval.
- Record rollback/redeploy recovery proof or a dated release-owner exception.
