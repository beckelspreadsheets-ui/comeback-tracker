# Comeback City Kart Racer Manual QA Rubric

Status: runbook template, not yet run
Date: 2026-06-03
Source PRD: `docs/comeback-city-kart-racer-prd.md`

## Purpose

Use this runbook and rubric for `RACE-009` before claiming Kart Racer V1 quality. A V1 pass requires every scored category to be `4` or higher, plus the evidence fields below.

Do not fill scores from autoplay, screenshots, or telemetry alone. This rubric requires human desktop keyboard play and mobile touch play.

Owner decision on 2026-06-01: the owner is the sole manual QA sign-off role for `4+` rubric scoring. No separate fresh-user tester is required by this owner decision, but the owner must still record the 10 second clip answer or an explicit owner exception in the result record.

Owner manual QA first-pass hardware and browser targets selected on 2026-06-02:

- Desktop: Mac mini M4 with Brave.
- Mobile: iPhone 16 Pro with Safari.

Exact route URL, viewport, date/time, and scores remain to be recorded during the real QA run.

Owner decision on 2026-06-03: record desktop and mobile manual QA as separate dated result files.

Recommended result paths:

- Desktop: `.agent/runs/kart-racer-production-readiness/evidence/manual-qa-results-<date>/desktop-brave-mac-mini-m4.md`
- Mobile: `.agent/runs/kart-racer-production-readiness/evidence/manual-qa-results-<date>/mobile-safari-iphone-16-pro.md`

## Current Automated Inputs

Use these as attachments and context only. They do not replace manual scoring.

| Input | Current value |
| --- | --- |
| Latest browser summary | `.agent/runs/kart-racer-production-readiness/evidence/perf-040-race-ranking-allocation-20260524T184127Z/post-revert-race-browser-playtest-summary.json` |
| Latest browser capture time | `2026-05-24T19:03:01.482Z` |
| Latest browser race count | `24` |
| Latest focused visual/control/fallback checks | `28` |
| Latest P0/P1 gate audit | `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-010-20260603T150000Z/production-gate-readiness-summary.json`; records `10` manual QA categories without a `4`/`5` score after Q48-Q52 owner-answer sync |
| Latest manual QA prep capture | `.agent/runs/kart-racer-production-readiness/evidence/manual-qa-prep-001-20260524T093705Z/manual-qa-capture-summary.json`; records desktop idle/speed/drift screenshots, mobile driving screenshot, a `10.96s` silent WebM clip candidate, and telemetry context, but no human scores |
| Latest evidence audit | `docs/race-kart-v1-acceptance-audit.md` |
| Performance triage context | `docs/race-performance-triage-plan.md` |
| Visual target intake | `docs/race-visual-target-brief.md` |
| IP/provenance audit | `docs/race-ip-provenance-audit.md` |

## Preflight

Run and record these before manual QA. If any command fails, stop the V1 QA pass and record the failure instead of scoring the race as shippable.

```sh
npm run build
npm run test:qa:capture
npm run test:race
npm run test:race:browser
```

Record:

- Exact command timestamp and result.
- Browser summary path and `capturedAt` value.
- Manual QA prep summary path, screenshot paths, clip path, and clip duration.
- Desktop and mobile device/browser/viewport plus screenshot paths used during review.
- Any known failing automated threshold, especially FPS.

## Desktop Manual Route

Record the actual route URL and viewport used. The expected route is `/#race` on the local dev server.

Required desktop input pass:

- Accelerate with `W` or `ArrowUp` from standstill.
- Brake/reverse with `S` or `ArrowDown`.
- Steer with `A/D` or arrow keys at low speed and high speed.
- Hop/drift with `Space` or `Shift` while steering.
- Release drift after at least Tier 1, then repeat until Tier 2 is observed.
- Pick up an item box and use the held item with `F`.
- Hit at least one boost pad.
- Cause one light scrape or wall hit and verify recovery.
- Pause with `Esc`, then resume.
- Complete a full race if controls, performance, and route readability allow it.

Required desktop notes:

- Time to first confident steering input.
- Time to first successful drift release boost.
- Whether the first lap can be followed without minimap reliance.
- Whether at least 3 rivals are visible during normal play.
- Any moment where camera, HUD, or touch/mouse cursor blocks route reading.

## Mobile Touch Route

Record the actual route URL, viewport, device or emulation profile, and input method. Use touch controls, not keyboard simulation.

Required mobile input pass:

- Accelerate using the on-screen control.
- Steer through the first major turn.
- Trigger drift/hop and release at least one mini-turbo if controls allow it.
- Pick up or use an item if visible and reachable.
- Complete at least the first lap, and complete the race if controls and performance allow it.

Required mobile notes:

- Whether the kart remains visible above controls.
- Whether controls hide apexes, item boxes, boost pads, hazards, or rivals.
- Whether the HUD is readable without covering the route.
- Whether mobile camera shows enough road ahead in portrait or narrow layout.

## Fresh-User Clip Check

Record or show a silent 10 second clip from the actual browser route. Owner-only QA sign-off is approved, so a separate fresh-user tester is not required; if the owner is not a fresh user, record the owner's exact answer and mark the separate fresh-user condition as owner-scoped out for V1.

Required prompt:

```text
What kind of game or mode is this, and what do you think the player is trying to do?
```

Pass condition:

- Reviewer identifies it as a kart race, racing game, or close equivalent.
- Reviewer understands that the player is driving along a route against opponents or race objectives.

Record the reviewer role, exact answer, clip path, viewport, and date/time.

## Evidence Required

| Field | Required evidence |
| --- | --- |
| Build tested | Command, timestamp, result |
| Browser playtest | Command, timestamp, summary artifact path |
| QA prep capture | Command, timestamp, summary artifact path |
| Desktop manual route | URL, viewport, input method, track, result |
| Mobile manual route | URL, viewport/device/browser, input method, track, result |
| Owner QA hardware | Mac mini M4 desktop pass with Brave and iPhone 16 Pro mobile pass with Safari, unless a dated owner exception is recorded |
| Result file policy | Separate dated desktop and mobile result files |
| Screenshots/captures | Desktop idle, desktop speed, desktop drift, mobile driving |
| Telemetry summary | FPS, kart height, road-ahead coverage, drift tier, boost source, visible rivals, camera clips |
| Tester | Owner name or role |
| Date | Exact date and local time |
| Known issues | Anything below V1 bar, even if tests pass |

## Result Record

Do not fill this section until a real `RACE-009` run occurs.

| Field | Value |
| --- | --- |
| QA run status | Not run; separate desktop and mobile files required |
| Tester | Owner only; not run |
| Date/time | Not run |
| Desktop URL and viewport | Not run; planned hardware Mac mini M4 with Brave |
| Mobile URL and viewport/device | Not run; planned hardware iPhone 16 Pro with Safari |
| Desktop QA result file | Not run; planned separate dated file |
| Mobile QA result file | Not run; planned separate dated file |
| Build result | Not run |
| Race content test result | Not run |
| Race browser test result | Not run |
| Browser summary artifact | Not run |
| QA prep capture artifact | `.agent/runs/kart-racer-production-readiness/evidence/manual-qa-prep-001-20260524T093705Z/manual-qa-capture-summary.json`; prep only, not scored |
| Desktop capture artifacts | Not run |
| Mobile capture artifacts | Not run |
| Fresh-user clip reviewer and answer | Not run |
| Telemetry summary | Not run |
| Known issues | Not run |

## Score Scale

| Score | Meaning |
| --- | --- |
| 5 | Shippable for V1 with no material concern |
| 4 | Acceptable for V1 with minor follow-up only |
| 3 | Understandable but not V1 quality |
| 2 | Frequently confusing, broken, or unsatisfying |
| 1 | Does not meet the category intent |

## Rubric

| Category | Score | Required check |
| --- | --- | --- |
| First impression | Not run | A silent 10 second clip reads as a kart race, not a menu or tech demo. |
| Controls | Not run | Keyboard acceleration, braking, steering, drift, and item use feel responsive in the first lap. |
| Drift | Not run | Hop, side slip, tier feedback, and release boost are easy to start and understand. |
| Camera | Not run | Player can see road, apexes, hazards, item boxes, rivals, and exits without fighting the camera. |
| Track readability | Not run | First lap can be followed without minimap or prior route knowledge. |
| Visual polish | Not run | City density, landmarks, surface detail, VFX, and finish/start presentation feel intentional. |
| Race drama | Not run | Rivals, items, boosts, hazards, and position changes are noticeable during normal play. |
| HUD | Not run | Position, lap, timer, item, drift/boost state, and controls are readable without blocking the route. |
| Performance | Not run | Desktop and mobile stay smooth enough for manual play, with telemetry attached. |
| Mobile | Not run | Touch controls can complete a race without hiding kart, route, apex, or item boxes. |

## Current Automated Context

Latest automated evidence belongs in `docs/race-kart-v1-acceptance-audit.md`. As of this runbook template, `RACE-009` remains missing until this file is copied or edited with real scores and evidence paths.
