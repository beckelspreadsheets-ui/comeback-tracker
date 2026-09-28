# RESUME HERE — Penguin Kart game

## 2026-09-28 RELEASE PUSH (read first)
Owner goal: RELEASE as an **iOS app**, monetized by photo -> custom racer
(card + crypto, owner-approve queue). Work happened in the ~/Downloads copy
(SSD not mounted), fast-forwarded to origin first, all pushed to aaa-kart-ci.
Commits b9d0743d..43ead54f:
- FIX ground plane Z-mirror (terrain lift read local y as world z) — snow walls over
  the road at PV start / CC p0.30,p0.62. Hills now render as intended.
- W1 pause (Esc/P/HUD/app-background), results standings + Race again/Next/Menu,
  rocket start, 3 s countdown, FIX player placement flicker (lap scoring), FIX PV
  restart grid, FIX projectile spawn offset.
- W2 item roulette, 50/100/150cc (raceClasses.js; QA = 150cc), slipstream,
  gamepad (gamepadInput.js), bump/wall/roulette/final-lap/victory audio, best times.
- W3 Grand Prix cup + podium (kart/cupMode.js), hold-item-behind, Time Trial +
  replay ghost (race/replayGhost.js), field = whole roster (6 now, cap 8).
- W4a CC skyline plate v2 behind ?ccSkyline=v2 (scripts/backdrops/cc_skyline_plate.py)
  — AWAITING OWNER YES. Belt config levers were tried: no visible change, reverted.
- W5a Capacitor 8 iOS scaffold (ios/, capacitor.config.json; npm run ios:sync
  needs node 22). BLOCKED: Xcode license not accepted (sudo) -> no simulator build yet.
Approval sheet: https://claude.ai/artifact/BftxMm2bSJBCMM2137TQQ2
Owner owes: skyline yes, Xcode license, Apple dev account, name/icon/bundle id,
Higgsfield credits (balance 0), payments-vs-Apple-IAP call, real iPhone perf check.
Not started: W4 trackside dressing/HUD restyle, W6 photo->racer pipeline.

---

## Previous state (2026-09-03)

**Read this first after a context clear.** Then `docs/AAA_NEXT_RUN.md` for the
AAA-overhaul detail, and `docs/GAME_AUDIT.md` for the audit findings.

## Where the code lives
- **`/Volumes/Back-up-SSD/Penguin Kart game`** — the game's home (external SSD,
  a fresh clone). Branch **`aaa-kart-ci`**, pushed to
  `github.com:beckelspreadsheets-ui/comeback-tracker` (HEAD **`4340dca`**).
  Prefer opening a Claude session ROOTED at this path.
- The original **`~/Downloads/comeback-tracker`** is the workout tracker
  (untouched fallback). Two copies on the same branch — commit game work only in
  the SSD copy to avoid divergence.
- `npm install` + `npm run build:kart` verified green here. **Nothing is
  deployed** (owner's call, always).

## Done this session (2026-09-03)
- **Elevation (AAA item 7) — COMPLETE.** Slice A (infield ground follows the road
  grade) + A.2 (previewer reads any grade) + 7c (bold signature grade both
  tracks: CC downtown-roll/hill/valley, PV valley/glacier-climb/roll) + 7c-3
  (kart pitches into slopes) + 7d (MEAN_SPEED re-measured). Commits
  `0d325b3`,`afb2a31`,`88ee3d6`,`1e7a4c6`. **First pass for owner review** — grade
  shape/placement and pitch strength are tuning knobs. NOTE: PV MEAN_SPEED (236.7)
  is SOFT — its two measurement runs spread 1.8%; a quiet 3+ run re-measure via
  `scripts/measure-mean-speed.mjs` would tighten it.
- **Game/tracker split (code level) — DONE** (`4340dca`). The workout-status
  cluster moved to `src/lib/workoutStatus.js`; the tracker imports NOTHING from
  `src/game/`, the game runtime imports nothing from the tracker's `lib/`, both
  builds green. The PHYSICAL two-repo separation (separate remotes / Cloudflare
  Pages / deleting each side's files) is an OWNER INFRA decision — NOT done.
- **Icebergs — investigated then REVERTED.** Instancing the lap-spanning PV
  bergs gave NO per-frame draw-call win (a ring of backdrop objects never
  frustum-culls, so all always draw); not worth touching the confirmed backdrop.
- Full battery GREEN: build:kart, test:bundle:kart (9/9), test:race, test:audio:kart,
  test:kart-playable (both tracks, desktop+mobile).

## Earlier (prior sessions) — AAA items 5, 6, 8
Item 5 rival AI over 134s; item 6 phone re-measure + post-chain confirmed
already-tiered; item 8 PV scenery instancing (penguins/mounds/igloos, `dd6efc4d`,
real draw-call win) + rival body value-spread luma re-key (`1d38b0b7`). See
`docs/AAA_NEXT_RUN.md`.

## What needs the OWNER (blocking the next steps)
1. **Elevation review + tuning** — drive the tracks, say what to adjust (grade
   shape, feature placement, how hard the kart tilts).
2. **Physical repo split** — do you want a fresh GitHub repo for the game? what
   happens to the existing `comeback-city-kart` Pages project? then delete each
   side's files from each copy.
3. **Deploy** — always the owner's call.

## Rules that must survive a context clear
- Work in the SSD copy; commit ONE thing at a time, each verified; **read the
  frames yourself** before believing a healthy report; **never deploy**; never
  push the local-only `aaa-kart-overhaul-full` branch; render/physics changes ONE
  FILE AT A TIME; gate captures on load (`sysctl -n vm.loadavg` — >7 fakes proof
  reds, >12 don't launch); `test:bundle:kart` measures the EXISTING dist (build
  first).
