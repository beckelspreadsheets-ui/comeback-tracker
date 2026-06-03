# Comeback City Kart Racer Immediate Ticket Breakdown

Status: engineering handoff plan, not V1 sign-off
Date: 2026-05-20
Source PRD: `docs/comeback-city-kart-racer-prd.md`

## Purpose

Use this as the engineering handoff for the PRD immediate tickets. The acceptance audit states current proof; the blocker backlog states what blocks V1; this file turns `RACE-001` through `RACE-009` into concrete next actions, dependencies, write scopes, and stop conditions.

Do not treat a ticket as closed from intent, partial automation, or screenshots alone. Close it only when the proof listed here exists in the current worktree or attached review artifacts.

## Current Execution Priority

| Priority | Work | Reason |
| ---: | --- | --- |
| 1 | `RACE-PERF-002` next pass from `docs/race-performance-next-pass-plan.md` | Desktop FPS is the main engineering blocker and prevents meaningful V1 sign-off. |
| 2 | Owner review packet from `docs/race-owner-review-packet.md` | `RACE-001`, IP review, mobile target, and scope decisions cannot be inferred. |
| 3 | Assign human QA using prepared capture evidence if useful | Manual play can reveal problems, but it cannot close `RACE-009` before FPS and owner blockers are resolved; prep evidence exists at `.agent/runs/kart-racer-production-readiness/evidence/manual-qa-prep-001-20260524T093705Z/`. |
| 4 | Hardening gates after performance improves | Hard FPS checks should be added only after the product can pass them. |
| 5 | PR evidence template for each quality PR | `docs/race-pr-evidence-template.md` prevents partial evidence from being presented as final race-quality proof. |

## Ticket Breakdown

| Ticket | Current status | Dependencies | Primary write scope | Next action | Proof to close | Stop conditions |
| --- | --- | --- | --- | --- | --- | --- |
| `RACE-001` Confirm Target Visual Brief | Blocked | Owner/product/design input | `docs/race-visual-target-brief.md`, `docs/race-owner-review-packet.md` | Send or review the owner packet; fill only owner-approved values. | Approved brief includes target reference, source/license, viewport, kart size, horizon, road visibility, object density, HUD placement, color/lighting, scope, and IP boundary. | Do not infer target values from current screenshots or PRD defaults. |
| `RACE-002` Extract Kart Tuning | Complete for current architecture | None for planning | `src/game/race/physics/kartTuning.js`, related imports/tests | Preserve extraction; route future tuning changes through tuning modules. | Existing tests pass and tuning constants are not buried back into frame-update code. | Do not refactor unrelated physics just to make the ticket look larger. |
| `RACE-003` Add Physics Telemetry | Complete for current telemetry scope | Browser harness remains active | `src/game/race/raceTelemetry.js`, `scripts/race-browser-playtest.mjs`, content tests | Preserve telemetry and extend only where new proof needs it, such as sustained performance samples. | `window.__raceVisualTelemetry` and JSON artifacts include required speed, drift, boost, stuck, camera, race, and visual metrics. | Do not weaken telemetry thresholds to hide failures. |
| `RACE-004` Implement Drift V2 | Partial | Manual feel review; FPS good enough for human play; vehicle-scope decision for V1 | `src/game/race/physics/kartPhysics.js`, `src/game/race/racePlayerFrame.js`, `src/game/race/render/raceVfx.js`, `src/game/race/raceAudio.js`, browser scenarios | After performance work, run manual drift review and tune only against approved scope. | Tier 1 and Tier 2 telemetry, visible side slip/sparks, release boost, screenshots/captures, and manual score show drift is readable and satisfying. | Do not claim feel quality from staged telemetry alone. |
| `RACE-005` Implement Chase Camera V2 | Partial | `RACE-001` target for composition claims; performance pass; manual camera review | `src/game/race/camera/chaseCamera.js`, `src/game/race/raceCameraRuntime.js`, telemetry/harness | Preserve existing camera gates while performance work proceeds; tune composition only after target approval. | Speed/drift/turn screenshots meet kart-size, road-ahead, lookahead, clip-count, and manual readability criteria. | Do not tune toward an unapproved screenshot target. |
| `RACE-006` Rebuild Comeback City GP First 30 Seconds | Partial / not signed off | `RACE-001`, desktop FPS, first-lap manual review, design review | `src/game/raceTracks.js`, `src/game/courseV2.js`, render/scenery modules, `docs/race-first-30-seconds-vertical-slice-plan.md` | Keep current authored opening sequence; do design/manual review after target and FPS blockers are addressed. | Start, straight, boost, item, first drift turn, Gym/Food landmarks, branch, no empty-plane read, and first-lap route readability are proven by screenshots/clips and review notes. | Do not mark complete from branch/turn screenshots alone. |
| `RACE-007` Add Core VFX And Audio | Partial | Owner audio scope; manual readability review; reduced-motion/mute preserved | `src/game/race/render/raceVfx.js`, `src/game/race/raceAudio.js`, `src/game/race/raceMotionRuntime.js`, HUD controls | Use manual review to identify missing mechanic feedback after performance and scope decisions. | Drift, boost, item pickup/use, collision, lap, and finish are readable with audio/VFX; mute and reduced motion still pass browser evidence. | Do not add copied or unreviewed sampled audio. |
| `RACE-008` Visual Test Harness | Strong partial | Performance pass for hard FPS gate; owner target for composition-specific checks | `scripts/race-browser-playtest.mjs`, `scripts/race-content-playtest.mjs`, telemetry helpers | Add sustained normal-play performance capture per `docs/race-performance-next-pass-plan.md`; add hard FPS gate after the route can pass it. | Screenshots and telemetry JSON cover required states, fail on blank canvas, bad camera/kart/road, camera clips, HUD overlap, weak rival visibility, and later agreed FPS floor. | Do not enable a hard FPS gate that current evidence cannot pass unless the intent is to block all runs. |
| `RACE-009` Manual QA Pass | Prep only | Owner target, FPS blocker, manual desktop/mobile runs, fresh-user review, IP/design review | `docs/race-manual-qa-rubric.md` or a dated completed QA artifact | Use `.agent/runs/kart-racer-production-readiness/evidence/manual-qa-prep-001-20260524T093705Z/` as prepared capture context, but do not score V1 yet; optionally record exploratory notes as non-closing evidence. | Every PRD rubric category scores `4+`, desktop and mobile evidence is attached, fresh-user read passes, and known issues are recorded. | Do not fill scores from automation, screenshots, prep captures, or implementer-only opinion. |

## Cross-Ticket Implementation Rules

- Preserve the current browser visual gates while doing performance work.
- Change one performance variable at a time and record keep/reject evidence.
- Keep new tuning constants out of frame-update code.
- Keep new visual, audio, or item work original to Comeback City and covered by provenance review when needed.
- Treat manual QA as sign-off evidence only after the runbook is actually executed.
- Keep `ArcadeRace3D.jsx` from absorbing new systems; put new work in the extracted race modules unless a local pattern clearly says otherwise.

## Required Commands For Closing Engineering Tickets

Run these before any ticket is claimed complete unless the ticket is explicitly docs-only or owner-input-only:

```sh
npm run test:race
npm run test:race:browser
npm run build
```

For docs-only planning changes, run whitespace/diff hygiene at minimum and state that runtime tests were not run.

For implementation PRs that claim race-quality improvement, copy `docs/race-pr-evidence-template.md` into the PR body or attach an equivalent completed evidence record.
