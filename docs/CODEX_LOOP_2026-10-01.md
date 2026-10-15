# Codex release loop — October 1, 2026

Scope: Penguin Kart in this Downloads checkout only. Hard stop 10:55 PM
America/Phoenix (2026-10-02 05:55 UTC). No deployment or publishing.
Preserve existing unrelated AnimatedShowcaseDesigns work. Claude PID 89877
was idle at inspection; do not overlap active edits from another session.

## Pass 1 (around 9:17 PM Phoenix)
- Fixed src/kart/kartLocalStore.js: both race and time-trial best-lap writes
  now require finite positive numeric laps. Invalid stored best laps recover
  on the next finish, preserving other record fields.
- Added scripts/test-kart-local-store.mjs. Reproduced the original failure
  with a negative lap, then passed coverage for negative/zero/nonfinite/string
  input, valid improvements, preserved bests, race counters, trial counter
  isolation, and recovery of corrupted prior saves.
- Verified: node scripts/test-kart-local-store.mjs; npm run build:kart.
- Build warnings: old Browserslist data and large chunks; no build failure.
- Bundle-budget check started; result will be appended below.
- Changes remain uncommitted. Do not stage unrelated files.

For the next pass: inspect other release-state modules (cupMode/replayGhost)
for concrete correctness issues; do not redo lap validation without cause.
Xcode simulator build remains blocked by owner acceptance of its license.
Skyline/design and product/payment decisions remain pending owner approval.

- Pass 1 final checks: bundle budget PASS (9/9), git diff --check PASS. Bundle report Git metadata is unavailable because its subprocess uses blocked system Git; do not interpret its dirty:false as a clean checkout.

## Pass 2 (9:27 PM Phoenix)
- Fixed src/game/race/replayGhost.js: reject incomplete/nonfinite replay triples and nonpositive stored times; allow valid runs to replace corrupt records. Missing localStorage now reports save failure.
- Added scripts/test-kart-replay-storage.mjs. Regression failed before the fix on a negative saved time, then passed corrupt-record recovery, invalid input, best-run selection, signature mismatch, interpolation and unavailable storage checks.
- npm run build:kart and git diff --check passed. Same existing chunk/Browserslist warnings. No rendering or physics changes; no deployment.
- Source changes remain uncommitted. Next pass can inspect cup integration and result navigation; cupMode pure bookkeeping read without changes this pass.

## Pass 3 (9:36 PM Phoenix)
- Inspected KartApp cup creation/advance/menu handlers, race finish callback,
  restart controls and cupMode bookkeeping. Finish callback is guarded once;
  cup restart is disabled in keyboard/UI paths. No confirmed new defect found.
- Executed pure-module assertions: points across two rounds, immutable state,
  completion detection, null standings and latest-race tie break all PASS.
- No source changes or deployment this pass. Next inspection: gamepad input
  and pause/restart interactions, then release handoff coverage.

## Pass 4 (9:47 PM Phoenix)
- Fixed src/game/race/gamepadInput.js: select an active standard controller over idle earlier slots; catch getGamepads access errors so keyboard/touch play can continue.
- Added scripts/test-kart-gamepad-input.mjs. Active-second-controller assertion failed before fix and passed afterward, along with disconnected slots, pause input, idle fallback, blocked/missing API and keyboard/touch merging.
- npm run build:kart and git diff --check passed. No physical controller test performed over SSH; device QA still needed.
- Pause clock and keyboard restart guards inspected without further changes. All loop source changes remain uncommitted; no deployment.
- Next pass: inspect existing release test entry points and make the three new regression checks discoverable together if appropriate.

## Pass 5 (9:56 PM Phoenix)
- Added npm run test:kart:regressions to package.json, running the three new
  persistence/controller regression files together. No dependencies changed.
- Existing race-production-gates.yml references absent scripts: test:race:browser, test:race:disable, test:hub, test:visual.
  That workflow builds/tests the combined tracker and old hub too; did not
  remove gates or rewrite its broader scope during this game-only session.
- Next pass: consider a separate kart-only CI workflow using current tests,
  with no deployment, keeping the legacy tracker workflow intact.
- Verification: npm run test:kart:regressions PASS (all three scripts); git diff --check PASS.

## Pass 6 (10:07 PM Phoenix)
- Added .github/workflows/kart-regressions.yml with Node 22, read-only repository permission, five-minute timeout and the three regression scripts. Triggers on relevant PR changes, main/aaa-kart-ci pushes, or manual dispatch. No dependency install required; tests import only built-in/pure modules.
- npm run test:kart:regressions and git diff --check PASS. Workflow reviewed locally; GitHub execution not verified because nothing was pushed.
- Legacy combined tracker CI remains unchanged with its four missing script references documented above. No deployment.
- Next pass: final review of all loop diffs and focused edge cases; avoid unrelated expansion.

## Pass 7 (10:17 PM Phoenix)
- Review found saved ghost times rounded to milliseconds could accept a slower new run (10.0007 after 10.0006 rounded to 10.001). Preserve full numeric finish time in replayGhost.js; display formatting stays unchanged.
- Added regression for slower/faster sub-millisecond comparisons. Failed before fix, passed afterward. Full npm run test:kart:regressions, build:kart and git diff --check PASS.
- Existing previously rounded records cannot recover lost precision; new saves now preserve it. No deployment or physical-device QA.
- Next pass: final bundle gate on latest build and full change inventory; then prepare handoff before the 10:55 PM cutoff.

## Pass 8 (10:26 PM Phoenix)
- Final bundle check on pass 7 build: PASS (9/9); git diff --check PASS.
- Exact loop file inventory: package.json; src/kart/kartLocalStore.js; src/game/race/replayGhost.js; src/game/race/gamepadInput.js; scripts/test-kart-local-store.mjs; scripts/test-kart-replay-storage.mjs; scripts/test-kart-gamepad-input.mjs; .github/workflows/kart-regressions.yml; this handoff document.
- Four tracked files modified and five new files remain uncommitted. No staging, commits, push or deployment. Existing unrelated changes preserved.
- Verified fixes: lap record validation/recovery; replay data validation and exact best-time comparison; active-controller selection and denied-API fallback.
- Remaining release limitations: physical iPhone/controller QA, owner Xcode license/account/product decisions, legacy CI missing commands, new workflow not yet run on GitHub.
- Final handoff ready. Later passes should avoid scope expansion or repeat builds absent new changes; check for owner input or concurrent changes and disable heartbeat no later than cutoff.

## Pass 9 (10:34 PM Phoenix)
- Verified scoped change inventory remains intact. No new owner direction or actionable issue from this check. No further source edits or repeated build/tests. Final handoff above remains current.

## Final handoff (10:44 PM Phoenix, before 10:55 cutoff)
- Authorized inspect/fix/verify work complete. No further changes warranted after final review. Heartbeat being disabled now.
- Run npm run test:kart:regressions for all new checks. Regression suite, production kart build, all nine bundle gates and diff whitespace checks passed on the final source state.
- All nine loop files listed in pass 8 remain local/uncommitted. Nothing pushed or deployed. Review and selectively commit these files; preserve unrelated existing work.
- Remaining owner/device/CI limitations are listed in pass 8. Remote SSH tests do not establish iPhone or physical-controller release readiness.

## Renewed iOS cleanup request (11:08 PM Phoenix)
- Owner authorized additional iOS-focused cleanup; loop budget/stop-time clarification pending. Previous heartbeat remains disabled.
- Packaging uses dist-kart and landscape orientation; native entry already bypasses service-worker registration.
- xcodebuild -version succeeds (Xcode 27.0), but xcrun simctl list devices available fails with unaccepted Xcode license. Native build/simulator blocker remains; no agreement accepted.
