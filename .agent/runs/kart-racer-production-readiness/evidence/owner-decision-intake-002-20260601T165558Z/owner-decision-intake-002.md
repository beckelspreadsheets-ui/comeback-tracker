# Owner Decision Intake 002

Created at: 2026-06-01T16:55:58Z

Status: owner answers recorded for Q8-Q12, not production sign-off

This file records owner answers supplied in chat after the Q8-Q12 blocker. It closes the specific Q8-Q12 intake questions, but it does not by itself prove R3 Production Ready.

## Supplied Answers

| Question | Owner answer supplied in chat | Recording status |
| --- | --- | --- |
| 8. IP-safe Mario Kart genre-reference wording | "you can copy the UI style just not the exact UI. we will make up our own characters logos, sounds and item shapes, I already have one character sheet I can drop it once we are ready." | Supplied with safe implementation boundary: use genre-familiar arcade kart-racer UI patterns and readability; do not copy exact Nintendo/Mario Kart UI, trade dress, characters, logos, sounds, item shapes, tracks, screenshots, names, or protected assets. Characters, logos, sounds, and item shapes must be original Comeback City work. |
| 9. Browser baseline | "yes" | Supplied. Baseline is desktop latest two stable Chrome, Edge, Safari, and Firefox; mobile iOS Safari and Android Chrome. |
| 10. Device baseline | "yes!" | Supplied. Baseline is iPhone 12+, iPhone SE 2nd generation low-end iOS check, Pixel 6a+, one Windows laptop, and one Mac laptop with integrated graphics. |
| 11. Production asset policy | "yes this is perfect all made with chat gpt image gen 2" | Supplied. Production bitmap assets must be custom ChatGPT Image Gen 2 outputs. Repo-native/code-native/procedural assets remain allowed. No external stock/game assets are approved. |
| 12. Manual QA sign-off model | "owner only" | Supplied. Owner is the sole manual QA sign-off role for `4+` rubric scoring; no separate fresh-user tester is required by this owner decision. |

## Formal Doc Sync Plan

Update affected docs without promoting unrelated gates:

- `docs/race-visual-target-brief.md`: record safe visual-reference/IP boundary, approved browser/device baseline, asset policy, and owner-only manual QA sign-off role.
- `docs/race-owner-review-packet.md`: fill Q8-Q12 decision fields and leave exact screenshot path, composition metrics, release/deploy/API/monitoring/legal items pending where still unanswered.
- `docs/comeback-city-kart-racer-production-readiness-plan.md`: fill Section 7 target browser/device and manual QA reviewer fields.
- `docs/race-v1-blocker-backlog.md`: update owner decision packet and RACE-001 current evidence.
- `docs/race-release-operations-runbook.md`: update accessibility target-browser/device reviewer field only; leave deployment, monitoring, support, API, audit, and release-owner policy fields pending.
- `docs/race-v1-definition-of-done-checklist.md` and `docs/race-manual-qa-rubric.md`: record owner-only QA sign-off model without filling scores.

## Remaining Known Decision Gaps After Q8-Q12

The following still need owner/release/legal decisions or explicit dated exceptions:

- Exact target screenshot path/file for the original ChatGPT Image Gen 2 reference.
- Measurable composition targets for kart size, placement, horizon, road visibility, density, HUD placement, and color/lighting.
- Item names and exact item silhouettes.
- Production Cloudflare project/domain, preview branch/project policy, clean deploy policy, launch owner, rollback owner, and race-disable activation policy.
- Cloudflare Functions/D1/FatSecret/barcode/camera production scope and any real URL/JWT/live FatSecret smoke inputs.
- Monitoring provider or no-provider risk acceptance, support contact/path, post-launch window, telemetry privacy/log-retention, Web Vitals/Lighthouse targets, bundle budget, production dependency audit split, Vite/esbuild advisory decision, CI/manual release gate policy, deployed smoke, deployed headers, production PWA update, rollback evidence, and final sign-offs.
