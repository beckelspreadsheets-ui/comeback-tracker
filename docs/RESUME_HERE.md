# RESUME HERE — Penguin Kart game

## 2026-10-22 — five upgrades + new music merged, preview deployed (read first)
Summary page with screenshots and the owner's open calls:
https://claude.ai/artifact/GG5Z1yfDfbwRFijkZaV5HW · music picks + re-scored
trailer: https://claude.ai/artifact/2abKRs4f2Mgm3Ld3Hmvzri · preview deploy
b66a5183 (alias https://aaa-preview.comeback-city-kart.pages.dev), verified by
`node scripts/verify-preview-deploy.mjs <url>` (all three tracks + phone).
- **Merged today** (five parallel agents in worktrees, then merged here):
  Satoshi Summit preview track (hidden: `?previewTracks=1`, never in the
  cup — `PREVIEW_TRACKS` in tracks/index.js), game feel (impact kicks, finish
  banner + confetti, rebuilt results board — fixed phone buttons below the
  screen and no-confetti-on-win), first-race coaching (race/coaching.js +
  RaceCoach.jsx, `?coach=1`), coins + paints (race/progress.js,
  KartPaintShop.jsx; earn at the finish, 8 paints), Mirror Mode (unlocked by
  winning a cup; `?mirror=1|0`).
- **Music:** ElevenLabs beds for menu / Comeback City / Penguin Village /
  Satoshi Summit (owner may swap takes — takes + receipts in
  tmp/kart-music/elevenlabs and docs/music-receipts). Tooling:
  scripts/elevenlabs-music.mjs (key in Keychain `elevenlabs-api-key`; the
  owner pasted it in chat once — he should delete it on elevenlabs.io when
  done), loop-music-bed.mjs, rescore-trailer.mjs. Trailer re-scored (takes 1
  and 2) in tmp/trailer-ai/*-eleven-t{1,2}.mp4 — owner picks.
- **Fixes:** rival fade is a clean blend over a depth pre-pass
  (race/render/rivalFade.js; `?rivalFade=dither` = old), course map back on
  screen on phones/iPads, dev:kart renders 3D again (StrictMode vs forced
  context loss), images never inlined into JS.
- **Gates at HEAD:** build, 11/11 quick battery, test:juice, context-loss,
  soak, playable proof (on the pre-juice merge), select stage, deploy probe.
  **Bundle: JS gzip 540.09 / 540 — 90 bytes over; owner to choose raise to
  560 or drop the `?post=0` lab render path.**
- **Owner calls pending:** Summit into the Grand Prix? · JS budget · music /
  trailer takes · the oversized ₿ coin row beside the kart at the finish.

## 2026-10-21 — iPhone groundwork done, memory leak fixed
Same rules as below: `git pull` on `aaa-kart-ci`; this file plus
docs/RELEASE_V1_PLAN.md are the handoff.
- **Owner calls today:** new players start at 50cc · icon A (Seth Penguin on
  the arctic ice) shipped in the iOS project and the web icons · JS gzip
  budget 540 KiB · iPhone AND iPad, iOS 17.0 floor · App Store support /
  privacy contact andrew@showcase-designs.com confirmed.
- **Phase 2 groundwork is all in** (list with hashes in the plan): context
  loss, audio after calls/Siri, crash marker + safe mode, perf readout in the
  pause menu, haptics (native plugin synced), Info.plist / iPad / edge
  gestures / launch screen / privacy manifest, self-hosted fonts, privacy +
  support pages, store screenshot script, preview probe.
- **Memory: quitting to the menu leaked every race.** Heap at the menu after
  ten races went 54 → 26 MiB. Three causes, all fixed:
  `window.__g3ParticlesDebug` / `__g2AmbientDebug` held the last race's whole
  scene; three r184's shared DFG lookup texture (and our module textures, and
  cached GLB maps) kept one dispose listener per renderer, so every race's
  renderer stayed reachable → `src/game/race/render/releaseTextures.js` runs
  at race and menu-stage teardown. Gate: `npm run test:kart:soak` (after
  build:kart) — counts live AND retained WebGL contexts and heap growth.
  Harness lesson: never `page.waitForSelector` in a memory test (its
  ElementHandle pins the element); use locators.
- **Music swap is ready, blocked on ElevenLabs.** `scripts/loop-music-bed.mjs`
  turns a generated track into a seamless bed (finds the loop by chroma /
  timbre / onsets, sample-accurate length, crossfaded seam, loudness matched
  to the current beds) and prints the MUSIC_LOOP_SECONDS line. ElevenLabs
  refuses every call with "Insufficient scope": owner must Disconnect →
  Connect it in claude.ai Settings → Connectors (approve everything), then
  `/mcp` → reconnect in Claude Code. Then: three beds (menu 96 bpm,
  comeback-city 124, penguin-village 112), the trailer track replacing
  "Vice On Ice", and a painted polish of icon A.

## 2026-10-15 EVENING — PHASE 1 DONE · next: iPhone prep
Working from another machine: `git fetch && git checkout aaa-kart-ci && git pull`.
Claude's memory files stay on the office Mac; THIS file and
docs/RELEASE_V1_PLAN.md are the whole handoff.
- **Phase 1 (looks) is complete and pushed.** All 12 items are checked off in
  docs/RELEASE_V1_PLAN.md with commit hashes. Review page (picks, before/after
  frames): https://claude.ai/artifact/Rm381M5UN4enxAUVbs1SqQ
- **Owner picks now ship as defaults** (switches kept for comparison):
  rival karts set A (`?rivalKarts=b|off`), driver outline B (`?driverPop=a|off`),
  LED slogan boards + lit posts (`?barrierKit=0`), Penguin Village look B
  (`?pvValue=a|off`). Firmer touch drift flick is still OPT-IN
  (`?driftFlick=firm`) until the owner feel-checks it on his phone.
- **Preview deployed with the owner's OK:** https://aaa-preview.comeback-city-kart.pages.dev
  (Pages branch `aaa-preview` of `comeback-city-kart` on the Showcasedesigns
  account; production comeback-city-kart.pages.dev untouched). Redeploy:
  `PATH=<node 22 bin>:$PATH CLOUDFLARE_ACCOUNT_ID=9f01a1b31a298b112c22c3e00fe70a45 npm run deploy:kart:preview`
  (wrangler refuses Node 20). NEVER deploy to Abel's account. Production only
  on the owner's word.
- **Gates all green** at the end of the day: build, bundle 9/9, ground
  clearance (0/0 both tracks), **test:spline (green since 1.12)**, laps,
  wrongway, offroad, autoplay, minimap, kart regressions, track visuals,
  select models, playable proof (16 checks, now including a forced-touch
  844x390 phone run that asserts the touch render tier).
- **Watch item:** rivals between the lens and the player now fade by alphaHash
  dither; at 1366 desktop it reads as visible speckle. Ask the owner how it
  looks on his phone before tuning.
- **NEXT (owner chose it): Phase 2 iPhone prep that needs no Apple account** —
  see "Phase 2 — TestFlight build" in the plan: bundle the fonts locally
  (no Google Fonts at runtime), WebGL context-loss recovery + teardown between
  races, resume audio after an iOS interruption (calls/Siri), Capacitor
  haptics (navigator.vibrate is a no-op on iOS), defer screen-edge gestures +
  hide the home indicator, Info.plist (ITSAppUsesNonExemptEncryption=false,
  iPhone-only, arm64), dark launch screen, unclean-exit marker, reachable perf
  overlay. `npm run ios:sync` needs Node 22; simulator builds stay blocked
  until the owner runs `sudo xcodebuild -license accept`.
- **Owner-side blockers:** Xcode license; Apple Developer Program as the
  COMPANY (Showcase Designs must be an LLC/corp; free D-U-N-S number, up to
  5 business days; live site + email on the company domain); written OK from
  each ordinal holder; music rights ("Vice On Ice" came from MiniMax's free
  demo).
- **Photo racer decisions** (plan Phase 5): Tripo pay-as-you-go API, $7.99 with
  a $4.99 founders' price, Stripe link + Lightning for the hand-made start,
  Apple IAP inside the app. Keys go in the macOS Keychain
  (`security add-generic-password -a "$USER" -s tripo-api-key -w`, likewise
  `openai-api-key`), typed by the owner in his own Terminal; never read or
  print them. Build `racer-forge` while Apple verifies the company.
- Also pushed: the Showcase Designs site copy in this repo now lists the
  business phone (520) 222-9941 (dee23d4f). Its 221 MB `artifacts/` folder,
  the root `scratchpad/` and regenerated `tmp/` outputs are deliberately
  uncommitted — never `git add -A`.

## 2026-10-15 (morning) → docs/RELEASE_V1_PLAN.md is the queue
- Owner's "drove through the snow and it distorted your character" was white
  ground wedges across the Penguin Village valley road (p0.38-0.43). The 09-28
  Z-mirror fix had only been verified at the centreline. Fixed in
  `src/game/race/render/groundTerrain.js`, with the monolith wired to it and
  the barrier back face plunging 1.0. New gate:
  `node scripts/test-ground-clearance.mjs` (`--legacy` shows the old failure).
  Build, bundle, node set and playable proof are green. `test:spline` was
  already red (PV p0.4375 kink, fixed later by 1.12). Committed the same day
  on the owner's go: 7ed1bea6, with the Codex loop's fixes in d055d9fb.
- Fresh graphics, release and photo-racer audits are folded into
  docs/RELEASE_V1_PLAN.md (phases + rules). Plan: one `/goal` per phase.

## 2026-09-28 RELEASE PUSH
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
