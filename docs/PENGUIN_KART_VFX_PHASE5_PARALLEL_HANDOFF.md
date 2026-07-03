> Parallel-work handoff. Read this, then reset context. The AI will work on the left column; you work on the right column.

# Phase 5 Remaining Work — Parallel Handoff

## Context after this turn

- FPS optimization is done: `src/game/race/render/createRaceScenery.js` changed; FPS up ~18%, triangles down ~12%.
- Full remaining plan: `docs/PENGUIN_KART_VFX_PHASE5_REMAINING_PLAN.md`.
- Visual target brief: `docs/race-visual-target-brief.md` (exists, needs final sign-off).
- IP/provenance audit: `docs/race-ip-provenance-audit.md` (exists, needs final sign-off + scan).
- Manual QA rubric: `docs/race-manual-qa-rubric.md` (exists, needs owner run).
- Browser test failure: `test:race:browser` fails on a no-minimap `roadAheadCoverageMin` threshold (pre-existing).

---

## Parallel split

| AI will do | You (owner) will do |
|---|---|
| 1. Refresh automated evidence: `npm run build`, `npm run test:race`, `npm run test:qa:capture`. | 1. Read `docs/race-manual-qa-rubric.md` and prepare your Mac mini M4 Brave + iPhone 16 Pro Safari setup. |
| 2. Generate a fresh 10-second silent WebM clip for the fresh-user review. | 2. Optionally watch the clip once it is generated and answer: *“What kind of game or mode is this, and what do you think the player is trying to do?”* |
| 3. Run the final IP/provenance source scans and update `docs/race-ip-provenance-audit.md` with scan timestamp + results. | 3. Review `docs/race-visual-target-brief.md` and add your V1 sign-off section at the bottom. |
| 4. Investigate the `test:race:browser` no-minimap failure. Fix it if small; otherwise write a ticket entry in `docs/race-v1-blocker-backlog.md`. | 4. Run desktop manual QA on Brave/Mac mini M4 and create `.agent/runs/kart-racer-production-readiness/evidence/manual-qa-results-<date>/desktop-brave-mac-mini-m4.md`. |
| 5. Re-run `test:race:browser` and any other automation (`test:visual`, `test:lab`, `test:bundle`) that exists. | 5. Run mobile manual QA on Safari/iPhone 16 Pro and create `.agent/runs/kart-racer-production-readiness/evidence/manual-qa-results-<date>/mobile-safari-iphone-16-pro.md`. |
| 6. Collect PR evidence into `.agent/runs/kart-racer-production-readiness/evidence/phase5-automation-<date>/`. | 6. Add IP/provenance + product/design sign-off section at the bottom of `docs/race-ip-provenance-audit.md`. |

---

## Where to put your results

Create a folder for today:

```text
.agent/runs/kart-racer-production-readiness/evidence/manual-qa-results-<YYYY-MM-DD>/
```

Inside it, create:

```text
desktop-brave-mac-mini-m4.md
mobile-safari-iphone-16-pro.md
fresh-user-review.md
screenshots/
  desktop-idle.png
  desktop-speed.png
  desktop-drift.png
  mobile-driving.png
clips/
  fresh-user-10s.webm
```

Use the rubric in `docs/race-manual-qa-rubric.md` for the score tables.

---

## What to paste when you come back

When you reset context, paste this exact summary:

```text
Continue Phase 5 remaining work per docs/PENGUIN_KART_VFX_PHASE5_REMAINING_PLAN.md and docs/PENGUIN_KART_VFX_PHASE5_PARALLEL_HANDOFF.md. I am doing owner manual QA/sign-offs in parallel. Please do the AI-side tasks: refresh build/tests, generate the 10s fresh-user clip, run final IP scans, investigate/ticket the test:race:browser no-minimap failure, and collect PR evidence. Do not proceed to Phase 6.
```

---

## Sync point

Stop and sync when either:

- The AI-side automation fails on something that needs your decision.
- Your manual QA scores any rubric category below `4`.
- You want to change scope or defer an item.

After both sides finish, the AI will merge results into the final PR evidence and update the acceptance checklist in `docs/PENGUIN_KART_VFX_PHASE5_REMAINING_PLAN.md`.
