# Comeback City Kart Racer V1 Planning Index

Status: planning handoff index, not V1 sign-off
Date: 2026-05-23
Source PRD: `docs/comeback-city-kart-racer-prd.md`

## Start Here

Use this file as the entrypoint for Kart Racer V1 planning. It points to the current source of truth for each kind of work and preserves the current blocker order.

Current headline state:

- V1 is not complete.
- Latest browser evidence was captured at `2026-05-23T19:27:29.195Z`.
- Browser harness last recorded `24` race runs and `28` focused visual/control/fallback checks.
- Desktop FPS remains the main engineering blocker: normal desktop focused states average `41.54 actualFps` and sustained normal play averages `17.70 actualFps`, below the local `45` floor and PRD `55` target.
- `RACE-001` is blocked until the owner supplies an approved visual target and scope decisions.
- Manual desktop/mobile QA, fresh-user review, and IP/design sign-off are missing.
- Implementation planning coverage is audited in `docs/race-implementation-planning-completeness-audit.md`; V1 product sign-off remains incomplete.

## What To Open

| Need | Open this |
| --- | --- |
| Understand the product requirement | `docs/comeback-city-kart-racer-prd.md` |
| Fix the remaining V1 blockers | `docs/comeback-city-kart-racer-v1-blocker-resolution-prd.md` |
| Run production readiness to ship | `docs/comeback-city-kart-racer-production-readiness-plan.md` |
| Check whether implementation planning coverage is complete | `docs/race-implementation-planning-completeness-audit.md` |
| See current automated proof and failing gaps | `docs/race-kart-v1-acceptance-audit.md` |
| Check whether V1 can be claimed complete | `docs/race-v1-definition-of-done-checklist.md` |
| See the remaining blocker order | `docs/race-v1-blocker-backlog.md` |
| Pick up engineering work for immediate tickets | `docs/race-immediate-ticket-breakdown.md` |
| Work on the FPS blocker | `docs/race-performance-next-pass-plan.md` then `docs/race-performance-triage-plan.md` |
| Ask product/design/legal for required decisions | `docs/race-owner-review-packet.md` |
| Fill the approved visual target brief | `docs/race-visual-target-brief.md` |
| Review IP/provenance risk | `docs/race-ip-provenance-audit.md` |
| Review the first 30 seconds of Comeback City GP | `docs/race-first-30-seconds-vertical-slice-plan.md` |
| Run or record manual QA | `docs/race-manual-qa-rubric.md` |
| Prepare a race-quality PR | `docs/race-pr-evidence-template.md` |

## Current Work Order

1. Production-readiness setup:
   - Use `docs/comeback-city-kart-racer-production-readiness-plan.md` as the top-level plan before running a production-readiness goal.
   - Do not claim production-ready until the plan reaches `R3 Production Ready` and all P0 gates are closed.
2. Owner/product/design/legal review:
   - Use `docs/race-owner-review-packet.md`.
   - Required before `RACE-001`, IP sign-off, mobile target sign-off, and scope-dependent tuning claims can close.
3. Performance engineering:
   - Use `docs/race-performance-next-pass-plan.md`.
   - Add sustained normal-play capture, scene budget telemetry, then test one normal-view reduction at a time.
4. Immediate ticket execution:
   - Use `docs/race-immediate-ticket-breakdown.md`.
   - Keep `RACE-002` and `RACE-003` guarded as complete; treat `RACE-004` through `RACE-009` as partial or blocked until their close proof exists.
5. Manual/design review:
   - Use `docs/race-manual-qa-rubric.md` only when FPS and owner blockers are resolved enough for scores to be meaningful.
   - Exploratory notes can inform `RACE-009`; completed rubric scores close `RACE-009`.
6. PR handoff:
   - Use `docs/race-pr-evidence-template.md` for any implementation PR that claims race-quality improvement.

## Current Claim Proof List

Claim each item only when its proof exists:

- Kart Racer V1 complete: every row in `docs/race-v1-definition-of-done-checklist.md` is `Proven`.
- `RACE-001` approved visual target: owner-approved values are filled in `docs/race-visual-target-brief.md`.
- Desktop performance sign-off: focused and sustained FPS evidence meets the agreed target.
- Manual desktop keyboard completion: a recorded human full-race keyboard run exists.
- Manual mobile touch completion: a recorded human mobile touch run exists.
- Fresh-user first-impression pass: a fresh reviewer answer passes the 10 second clip prompt.
- IP/provenance sign-off: owner/design/legal review approves assets, names, silhouettes, audio, and references.
- First 30 seconds design sign-off: product/design review approves route clarity, district read, density, HUD, and feedback.
- Full drift/camera/audio feel sign-off: manual QA and design review record passing scores and notes.

## Validation Minimums

For docs-only planning changes:

```sh
rg -n "[ \t]+$" docs/<changed-files>
git diff --check -- docs/<changed-files>
```

For implementation changes that touch race runtime, tests, harness, visuals, camera, physics, HUD, audio, or telemetry:

```sh
npm run test:race
npm run test:race:browser
npm run build
```

Attach the evidence using `docs/race-pr-evidence-template.md`.
