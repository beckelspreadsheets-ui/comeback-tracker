# Race Disable And Recovery Runbook

Status: local technical control proven; production release policy not supplied
Date: 2026-05-23
Related plan gate: `PROD-025` in `docs/comeback-city-kart-racer-production-readiness-plan.md`

## Proven Technical Control

The app supports a Vite build-time race disable flag:

| Env var | Behavior |
| --- | --- |
| `VITE_RACE_DISABLED=true` | Direct `/#race` requests render the race-disabled recovery screen instead of the race canvas. Race entry points are hidden from app navigation, the world HUD, and world destination controls. |
| `VITE_RACE_DISABLED_REASON="..."` | Optional message shown on the recovery screen. |

Accepted true values for `VITE_RACE_DISABLED` are `1`, `true`, `yes`, `on`, and `disabled`.

## Local Verification

Latest local evidence:

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run test:race:disable` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/race-disable-001-20260523T200640Z/npm-run-test-race-disable.log` |
| `npm run test:race` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/race-disable-001-20260523T200640Z/npm-run-test-race.log` |
| `npm run test:race:browser` | Pass; `24` races and `28` focused visual/control/fallback checks | `.agent/runs/kart-racer-production-readiness/evidence/race-disable-001-20260523T200640Z/npm-run-test-race-browser.log` |
| `npm run test:hub` | Pass; normal enabled raceway entry and hub metrics still work | `.agent/runs/kart-racer-production-readiness/evidence/race-disable-001-20260523T200640Z/npm-run-test-hub.log` |
| `npm run test:visual` | Pass | `.agent/runs/kart-racer-production-readiness/evidence/race-disable-001-20260523T200640Z/npm-run-test-visual.log` |
| `npm run build` | Pass with existing large-chunk warning | `.agent/runs/kart-racer-production-readiness/evidence/race-disable-001-20260523T200640Z/npm-run-build.log` |

The disable smoke asserts:

- direct `/#race` shows `[data-testid="race-disabled-screen"]`,
- no WebGL race canvas or Canvas2D race fallback mounts,
- Race GP, world raceway, shell raceway, bottom race nav, and raceway feedback entry counts are `0`,
- a stored race-reward state does not target raceway as the active mission or reward-pulse destination,
- the recovery button returns to the playable world home.

## Disable Procedure

Use this only after the release owner decides race mode should be hidden or bypassed.

1. Set `VITE_RACE_DISABLED=true` in the target deployment environment.
2. Optionally set `VITE_RACE_DISABLED_REASON` to a short user-facing message.
3. Rebuild and redeploy the target environment.
4. Verify direct `/#race` and normal tracker navigation after deploy.
5. Record deployment URL, deployment ID, commit, timestamp, command, and smoke evidence in the production readiness checkpoint.

## Re-Enable Procedure

1. Remove `VITE_RACE_DISABLED` or set it to a value outside the accepted true set.
2. Rebuild and redeploy.
3. Run or record equivalent smoke for:
   - `/#race` loads the race,
   - the world Race GP control is visible,
   - `npm run test:race:browser` passes for the target commit,
   - core tracker navigation still works.

## Not Proven Yet

This runbook does not close the full production gate by itself. The repo still lacks:

- release owner approval for when to activate the flag,
- production Cloudflare Pages project/domain and env-var owner,
- preview deployment smoke with the flag on and off,
- production deployment smoke with the flag on or accepted rollback-only recovery,
- rollback owner, rollback target, and rollback drill evidence,
- monitoring/support status for race disable or rollback activation.
