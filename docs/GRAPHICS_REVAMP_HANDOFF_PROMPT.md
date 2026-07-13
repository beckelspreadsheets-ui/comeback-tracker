# Graphics Revamp — Fresh-Context Handoff Prompt

## ⚡ K6+K7 SHIPPED CHECKPOINT (2026-07-13 — NEWEST, supersedes every block below)

**EVERYTHING THROUGH THE KART REBALANCE IS LIVE (deploy df14c9c8,
verified; deploys this sprint: lifoladen 9e9fa180 → icons 1d74cc7d →
props 44e5bb4f → rebalance df14c9c8, every one live-verified both
tracks):**
- **K6 lifoladen** = playable racer (slot 2, Miami Cruiser, snowball
  skin, 353 KiB GLB after the normal-map strip).
- **K7 icons** = all 12 held-item HUD/guide icons are rendered art
  (lucide retired; march icon = penguin-free footprints), owner chip
  pick **B** live (race-item-pickup-pop, 0.66s).
- **K7 world props** = fishbone-trap / sardine-rocket / avalanche-mound
  / blizzard-cloud lifted + swapped INSIDE the pools
  (swapItemPropVisuals; procedural fallbacks kept; snowball lift
  BENCHED for budget, render in tmp/k7-item-lab/).
- **Kart rebalance** (owner: "speeds are all over the place... more
  balanced since the race is so short"): topSpeed ±2% / accel ±4% /
  handling ±5%; measured before/after with
  tmp/k7-item-lab/kart-balance-probe.mjs — old spread cost Miami
  Cruiser the WIN outright; now all five karts finish 1st, live-origin
  gap 0.84s over the ~34s race. **OWNER V2 CALL recorded: spreads widen
  back out when 2-3min MK-length tracks land (old values at 511dc12b).**
- Kart bundle fresh-build **9648.77/9800 KiB gz** (portrait→webp paid
  for the props); fitness untouched.

**BOOST-PAD REBUILD DONE (2026-07-13, commit 8c01ffe6) + DEPLOYED same
day (owner "deploy"; deploy 56052785 — live-verified both tracks
22/22+10/10 zero CSP, pads probed at race speed ON the origin,
tmp/k7-boost-pad/live-*.png):** the authored pad now matches
the approved concept — 3 chunky beveled ExtrudeGeometry chevrons with
HDR vertex-color ember→orange gradients, each carrying a molten
white-hot core strip (inset extrude MERGED into the same geometry via
mergeGeometries — one draw call per chevron; a vertex-color spine can
NOT render on a flat cap, no interior vertices, real geometry was the
only way), double gold trim ring (outer band + inner pinstripe, ONE
extrude, rounded corners via absarc), charcoal plate. chevronOrder
still rides the shipped pulse. Pad cost 8→6 draw calls (PV was 799/800
— now has headroom; CC proof maxDrawCalls 460). Battery green: kart
9656.55/9800 fresh-build · playable both tracks · proof errors=0 ·
smoke 26/26. Evidence tmp/k7-boost-pad/ (before-*/after6-*
far/near/at, capture pattern = lap≥2 + routeProgress windows against
the RUNNING 5173).

**⚠️ FITNESS BUNDLE TRUTH (found 2026-07-13 by stash A/B, PRE-existing):
fresh fitness build = 16.54 MiB / 11,416 KiB gz vs 15 MiB / 8,500 gates
= OVER.** Every "fitness byte-stable 8489.99" reading since the K5 kart
wave was a STALE-dist measurement (same trap as test:bundle:kart — the
fitness test:bundle ALSO measures the existing dist). Kart GLBs
(iceracer/miamicruiser/lifoladen/4 item props) DO enter the fitness
dist — the old "new GLBs don't enter fitness" empirical note is DEAD.
Live fitness site unaffected (predates the wave); bites at next fitness
deploy. Fix vehicle = queued K2 race-path diet (owner-gated) or a
narrow lazy-load patch — owner's call, hub row up.

**NEXT TASK (fresh context starts HERE): drift-tier VFX**, then the
phase5 headed pair closes K7.

**GOTCHAS from this sprint (additive to everything below):**
- `test:bundle:kart` MEASURES the existing dist-kart — ALWAYS
  `build:kart` first (a stale-dist reading shipped a wrong "pass" once).
- higgsfield `generate_3d` defaults `should_texture:false` — always pass
  `true` (3 jobs wasted; ids in tmp/k7-item-lab/generation-record.json).
- Avatar GLBs: normal maps NEVER render (mountDriverAvatar swaps in
  MeshToonMaterial{map}) — strip them at diet time.
- Thin-geometry lifts (fish bone) blob from the front — check ALL yaws.
- Autoplay always runs 1st, so position-tiered mid-pack items
  (sardine/blizzard/avalanche) can never be caught on camera —
  **mid-pack prop visual check OWED at the owner's next phone pass or
  the phase5 headed pair.**
- New manifest entries REQUIRE sourceHash or assets:check fails.
- sharp is NOT in this repo — image processing goes through Playwright
  canvas (tmp/k7-item-lab/make-icon-tiles.mjs pattern).
- Races measure ~34s — remember when tuning anything pace-related.

**OWNER OWES (hub top lists all):** 3 ordinal ChatGPT sheets · economy
word (K2 gated) · game NAME · kart budget ack (13 MiB / 9800 KiB gz) ·
phone re-check (now doubles as prop + rebalance feel-check FROM
MID-PACK).

## ⚡ V1-BETA SPRINT CHECKPOINT (2026-07-12 EOD — superseded)

**LIVE at comeback-city-kart.pages.dev (deploy acf0c6f9, verified):** the
full 2026-07-12 sprint — K2.5 launch fixes (short flights, full-trigger
ramps + chevrons, gold bridge rails + crest chevrons) · K3 mobile controls
V2 COMPLETE (drag/flick/tap one-thumb grammar + buttons as fallbacks, TILT
opt-in with counter-rotation soft lock — NO fullscreen/lock attempts, they
thrashed iOS, REMOVED — race is ALWAYS visually landscape on phones,
100dvh container, camera PINNED per race: phoneWide=touchControls back 33
/ height 10 / lookAhead 28 / FOV 63, controls hide on finish, select/intro
top-clip fixed via my-auto BOTH mirror files) · K4 outplayasians
finish-line crosser (crosser system now live in the shipped runtime,
footprint 8) · K5 partial: Ice Racer + Miami Cruiser selectable
(owner-picked; cyber-lowrider/gold-gp/stealth-speedster REJECTED, re-roll
offered) · coins/rails/all prior content.

**Owner verdicts on record (roadmap rounds 5-8, verbatim):** mechanics
"amazing"; camera was "wild" in fullscreen → fixed by removing fullscreen;
"hard to see asians" → footprint bump (re-check on his next pass).

**K6 LIFOLADEN LANDED (2026-07-12 eve, committed NOT deployed —
owner-gated):** playable racer wired end-to-end. Diet: weld → gentle
simplify 0.68/0.004 (raw 30,766 tris broke the 25k seated-character hard
cap; likeness verified raw-vs-diet at 4 yaws BEFORE promotion — crown/
skull/₿-staff/robe all hold) → resize 512 → meshopt = 904 KiB shipped at
src/assets/game/models/avatars/lifoladen.glb. Roster: SECOND slot in
KART_CHARACTERS (so he auto-fills a rival seat for every other pick —
note: default bunny lineup's rivals are now lifoladen/tclow/seth, mizzle
dropped out), accent #a7f542 / color #8e1a43, signature kart Miami
Cruiser, projectileSkin 'snowball' (human wizard — keeps him OUT of the
iceshard-keyed Penguin March pool; a plain 'snowball' pool variant
already existed, and heldItemLabel now says SNOWBALL for it).
Orientation: front = +Z lab-verified → driverYaw 0, portrait pose yaw
0.55 (the handoff's earlier π/2+0.55 guess was WRONG — booth camera sits
on +Z like the lab). driverHeight 6.4 reads right in the parked probe
(tmp/k6-lifoladen/parked-player.png; mounts 43/43 both as player and as
rival). Manifest + asset-profiles source entry + both portrait mirrors
done; select-portraits-capture.mjs knows his FRONT_Z_POSE for reruns.
**LIFOLADEN DEPLOYED 2026-07-12 eve (owner "deploy lets knock out k7";
deploy 9e9fa180): live-verified both tracks 22/22 + 10/10, zero CSP,
lifoladen probed on the origin (tmp/k6-lifoladen/live-parked.png).**

**K7 ROUND 1 FIRED same turn (2026-07-12 eve): all 8 concepts rendered
(nano_banana 2cr each, 16cr; job ids in
tmp/k7-item-lab/generation-record.json), lab live at
tmp/k7-item-lab/item-lab.html, hub row up top.** Read: fish-bone/
snowball/ice-shield/avalanche = strong 3D-render style (lift-ready);
sardine + blizzard rolled ILLUSTRATION style (fine as icons; re-roll
offered for world props); cocoa is ICON-ONLY (no world prop exists) and
rolled a perfect sticker icon; boost-pad = art-direction reference (the
in-game pad stays authored geometry — rebuild chevron profile/emissive
to match on pick); avalanche concept has bg-sign text (discarded at
lift). **OWNER ANSWERED same eve: "love all these rendered icons" + chip pick
B → K7 ICON HALF LANDED (committed, NOT deployed):** 12 tiles (8 concepts
+ 5 fills @2cr: slapfish/aurora/carrot/iceshard/march — march is
penguin-FREE footprints-in-snow per the standing rule; ids in
generation-record.json iconBatch2) → 192px webp via
tmp/k7-item-lab/make-icon-tiles.mjs (Playwright canvas — sharp is NOT in
this repo) → src/assets/game/items/ → ITEM_ICON_URLS +
SNOWBALL_SKIN_ICON_URLS in ComebackCityThreeKartRace.jsx; HeldItemIcon
now renders img tiles (item-lucide imports deleted); empty chip/button
states = dimmed skin tile; guide icons size 24 in BOTH mirror files.
**Pick B live:** race-item-pickup-pop testid, ~0.66s keyframe pop
(comebackCityThreeKartRace.css), unmount at 680ms; smoke shots
tmp/k7-item-lab/smoke-pop2.png (frozen mid-pop) / smoke-armed.png /
smoke-guide.png.
**TWO CORRECTIONS ON THE RECORD:** (1) test:bundle:kart MEASURES the
existing dist-kart, it does NOT build — the lifoladen-battery "8745.48
all-pass" was a stale-dist reading; fresh-build truth was 9861/9800 =
OVER. (2) Fix: lifoladen.glb carried a 560KB normal map that
mountDriverAvatar's MeshToonMaterial{map} NEVER renders — stripped
(tmp/k7-item-lab/strip-lifoladen-normal.mjs, 904→353 KiB, likeness
re-verified 4 yaws, manifest hash updated). Kart bundle fresh-build =
9384/9800 gz. ALWAYS build:kart before test:bundle:kart. The LIVE
deploy 9e9fa180 predates the strip (it shipped the fat GLB — harmless,
next deploy carries the diet).
Battery green at the icon commit: assets:check strict · test:race ·
bundles (fitness byte-stable 8489.99) · kart-playable passed=true ·
shell smoke 26/26 · race:proof pass errors=0 @ load1 3.89.
**K7 WORLD PROPS LANDED same night (owner "deploy and lets keep going
forward" — the deploy word covered the ICON build, which shipped
1d74cc7d + live-verified; the PROP round is committed NOT deployed,
mounted look unseen by owner):** 4 lifted GLBs in
src/assets/game/models/items/ — fishbone-trap (item-box class, 4.6k
tris), sardine-rocket (complex-prop, 6.6k; 3D-style re-roll concept
first — both re-rolls landed clean), avalanche-mound (7.7k, erupts
INSIDE the ring — additive, ring/glow/pulse untouched), blizzard-cloud
(7.9k, crowns the fog dome, shells + fade untouched).
swapItemPropVisuals + fitItemPropScene in ComebackCityThreeKartRace.jsx
swap INSIDE the pools (procedural = load-failure fallback). Sardine
nose = −X → yaw +π/2 (lab). SNOWBALL LIFT BENCHED for budget
(tmp/k7-item-lab/snowball-diet*.glb, procedural sphere ships);
char-lifoladen portrait → webp (255→40KB) paid for the props; fresh
build 9648.77/9800 gz.
GOTCHAS this round: generate_3d image_to_3d DEFAULTS
should_texture:false — ALWAYS pass should_texture:true (3 untextured
jobs wasted, ids in generation-record.json) · thin geometry (fish bone)
lifts blob-ish from the front, fine in profile — check ALL yaws before
promoting · position-tiered items mean autoplay (always 1st) can NEVER
catch sardine/blizzard/avalanche on camera — mid-pack visual check owed
on the owner's next phone race or the phase5 headed pass.
Battery green at the prop commit: assets:check strict fail=0 (sourceHash
required on new manifest entries — audit fails without it) · test:race ·
bundles fresh-build all-pass · kart-playable passed=true · smoke 26/26 ·
race:proof pass errors=0.
**NEXT: owner deploy word for the props → then boost-pad authored
rebuild (concept approved, separate change) → drift-tier VFX → phase5
headed pair at K7 exit. Owner still owes: 3 ordinal sheets · economy
word · NAME · budget ack (13 MiB/9800) · phone re-check.**

**OWNER OWES (hub top lists all):** 3 ordinal ChatGPT sheets (ak47/
denomad/georgefx — the PNGs in "fresh add ons/" are 700-930 BYTE pixel
sources, NOT sheets; ordinal art never uploads to Higgsfield/Meshy) ·
economy word (K2 still gated) · game NAME · kart budget ack (REVISED
2026-07-12: totals 13 MiB / 9800 KiB gz, JS caps unchanged) · phone
re-check of the camera round + crosser size.

**NEW GOTCHAS from 2026-07-12 (additive to the standing rules below):**
- Load-artifact reds now proven at load1 ≥7 (not just >5): dt-dilated
  countdown = "acceleration did not increase speed" kart-playable fake;
  race:proof green at load 5.8-7.9 repeatedly. GREENS under load count;
  reds = retry.
- verify-live-deploy's FIRST attempt after "Deployment complete" can
  catch alias propagation mid-swap (crosser showed failed:1 once) —
  re-probe before diagnosing, the standing rule works.
- Meshy meshes face −X, Tripo face +X: KART_NOSE_YAW map in the runtime;
  crosser mounts yaw 0 (+Z front after its own convention). Orientation
  lab BEFORE promotion, always (tmp/k4-crosser/orientation.html?glb=).
- navigator.webdriver auto-skips the intro AND seeded ?track= deep-links
  skip intro+select entirely (kart-shell QA contract) — to see the real
  user flow in Playwright, override navigator.webdriver to false.
- The fitness dist is byte-stable (8489.99 KiB gz) even as kart assets
  land — new GLB imports do NOT enter the fitness artifact (empirical,
  unexplained; do not rely on it without re-checking test:bundle).
- Higgsfield: tripo_3d text-to-3D is GONE from the catalog. Pipeline =
  nano_banana concepts (2cr) → meshy image_to_3d (30cr) / multi_image
  (4-view sheets). media_upload → presigned PUT from Bash → media_confirm
  works for local files. Balance ~790cr.
- phase5 headed pairs owed (CC: K2.5 meshes · PV: crosser) at a genuinely
  quiet machine — the only perf debt.

## ⚡ K2.5 PHASE 1 + K3 CORE (2026-07-11 late — superseded)

Post-deploy the owner playtested on his phone (verbatim record: roadmap W7
additions; PRD amended with NEW K2.5 + expanded K3). Since then, SAME DAY:
- **K2.5 phase 1 DONE (9878622b):** the CC "flying in the air" bug is
  reproduced + measured — crest 0.472 + ramp-B 0.688 fire ~2.4 s apart
  EVERY lap ("does it twice"); trigger rampHitLane 0.22 vs ~0.15 visible
  wedge; flights ~330 units/1.3-1.7 s, no landing marker. Evidence + fix
  menu: **launch-lab.html** (hub row live). ⏳ OWNER picks fixes per site
  (recommended: crest d+b · ramps a+b). Telemetry gained `lane`.
- **K3 CORE BUILT (e5a7868a):** coarse-pointer-gated joystick (analog
  steerAxis) + auto-accel + brake/DRIFT/96px smash-item cluster (button IS
  the held-item display; 9px chip retired on touch, testid lives on the
  label); desktop = ZERO touch buttons (kart-playable asserts it);
  E/F item keys + guide copy (BOTH mirror files). REAL BUG FIXED:
  min-height:620px buried all touch controls below the fold on landscape
  phones. QA override `?touchControls=1/0`. Smoke 14/14
  (tmp/k3-mobile-controls-smoke). Battery FULLY GREEN incl. race:proof
  pass errors=0 (at load1=6.97 — green under load is trustworthy) and both
  bundles (kart 6723.31/8000, fitness 8489.99/8500). ⏳ OWNER deploy go →
  his phone session = feel pass + 30-FPS measure + graphics A/B; phase5
  headed pair at K3 exit.
- Still ⏳: K2 economy-shelved confirm (K2 not started) · kart budget ack ·
  NAME · fpsWarmupMs gatesNote.

## ⚡ K1 DEPLOYED (2026-07-11 eve — supersedes "NOT deployed" below)

**The K1 kart-only build is LIVE on comeback-city-kart.pages.dev** (owner
gave the deploy go; `npm run deploy:kart`, deploy 562cd020). Full live
battery GREEN: verify-live-deploy both tracks (mounts 22/22 CC + 9/9 PV,
zero CSP errors, postChain on) · live-coin-probe 8 ₿ by lap 2, HUD badge
agrees, 477 draw calls · live `/sw.js` byte-identical to `dist-kart/sw.js`
and served `no-cache, no-store` (registerSW.js too) · fresh visitor
installs the kart SW and is controlled in <5s · **fitness→kart SW swap
re-proven ON THE LIVE ORIGIN** (tmp/k1-live-sw-swap/live-sw-swap-smoke.mjs,
4/4: seeds the pre-K1 fitness SW against the real origin via Playwright
request interception — needs `PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS=1`
— then the client updates itself into the kart shell from the real live
deploy) · full OFFLINE reload still races with all mounts (CacheFirst
runtime cache working on live). One nuance, documented in the smoke:
Chrome only forces the sw.js update check on navigation when the
registration is stale (>24h) — a seconds-old seeded registration needs an
explicit `registration.update()` (that's the exact fetch a real returning
user's navigation performs; real clients are always stale by the time a
deploy matters). `/index.html` 308-redirects to `/` on Pages — workbox
precache handles it (fresh-install proof), don't chase it as a bug.
**Deploy gate CLOSED in approvals-hub; budget-ack row remains open.**
NEXT = K2, still gated on the owner's economy-stays-shelved confirm.

## ⚡ K1 LANDED (2026-07-11 pm — read before the block below)

**K1 (kart-only build target) is BUILT + verified locally, NOT yet
deployed (owner-gated).** `npm run build:kart` → `dist-kart` via
`vite.config.kart.js` + `index.kart.html` + `src/kart/` (main.jsx /
KartApp.jsx / kartLocalStore.js) + `public-kart/` (kart CSP `_headers` —
food-API entries dropped; placeholder "Penguin Kart" icons). Measured:
**8.781 MiB raw / 6722.8 KiB gzip** (combined build: 13.486/8490; JS
4.79→1.10 MiB — the fitness app is fully out). Kart budget thresholds
committed in `scripts/bundle-asset-budget-report.mjs`
(`BUNDLE_BUDGET_MODE=kart`): total 12 MiB / 8000 KiB gz, JS 2 MiB /
500 KiB gz — **owner ack pending (PRD §5)**; the queued 8500→9500 raise
is SUPERSEDED (row updated in approvals-hub). Fitness `npm run build`
verified **byte-identical** (79/79 hashes). Verified on `dist-kart`:
kart-playable BOTH tracks (passed:true, mounts clean), 26/26 shell-smoke
checks (intro→select→race testids, one-shot `?character/?kart/?track`
seeds + strip, `playableAutoplay`/`raceAutoplay`, telemetry globals,
legacy-atom best-time migration one-shot + read-only, fitness atom never
written), test:race, assets:check, test:bundle (fitness mode unchanged).
KartApp.jsx is a VERBATIM lift of RaceScreen's live intro/select shell —
RaceScreen cannot be imported (its `ArcadeRace3D` import drags the
2.71 MB dead chain); **mirror intro/select edits into both files until
K2+ deletes the fitness copy**. Suites point at the kart build via
`KART_PLAYABLE_PROOF_SERVER_SCRIPT=preview:kart` /
`RACE_PROOF_SERVER_MODE=preview:kart` (npm shortcuts:
`test:kart-playable:kart`, `test:race-proof:kart`, `test:bundle:kart`;
deploy = `deploy:kart`, serves `dist-kart` to the same
comeback-city-kart project). SW now runtime-caches GLBs/backdrops
(CacheFirst) — offline replay works after one online race; manifest is
landscape. Owner items queued in approvals-hub: kart threshold ack +
"deploy the kart build" go.

## ⚡ FABLE SWITCHOVER CHECKPOINT (2026-07-10 — read this block first)

The owner switched the session model to Fable 5 mid-stream and asked for a
stop + checkpoint. **Revert point: git tag `pre-fable-revert-point`**
(= commit 4549a8db, pushed to GitHub with an annotated note; a GitHub
prerelease carries the same checklist). `git reset --hard
pre-fable-revert-point` discards everything after the switchover.

**SHIPPED + DEPLOYED + VERIFIED at the tag (live on
comeback-city-kart.pages.dev):**
- W1 track-select fix · W0 miami mode default (+ CSP `wasm-unsafe-eval`
  fix — first deploy carrying meshopt assets) · W2 item audit +
  validators + rival fishbone fix + held-item chip + item guide
  reachable every visit · bitcoin item boxes per track (CC ₿ coin
  composite / PV ₿-in-ice, penguin-free re-roll) · boost pad V1 default ·
  rims CC V1 / PV V3 · W3 round-1 tribute set mounted on PV (monument /
  runestone / odds board / token clusters ×2 / empty casino corner) ·
  no-generic-penguins standing rule enforced everywhere.

**₿ COINS LIVE 2026-07-11 (owner: "deploy the coins"; deployed at
879021dc, live-verified both tracks — mounts 22/22 CC + 9/9 PV, zero
CSP errors, autoplay live-probe collected 8 coins by lap 2 + HUD badge
renders):** rows are TWO coins at ±laneSpread — owner call same day,
verbatim "there should only be 2 in a row not 3 through 3 makes it too
easy to get them" — the center coin is GONE (center-line driving
collects nothing; validator in test:race now asserts this). Gate
history: settled at 5ac085d0 — headed truth vsync-144 median-of-3 BOTH
tracks (CC 144.04 calls 500→477 / PV 144.03 calls 821→798 vs pre-coin
143.75/143.88; evidence phase5-capture-2026-07-11*); the red gate was
headless-only (+24 clone draw calls + SwiftShader compile ramp crossing
the 2500ms warmup boundary). Coin field = ONE InstancedMesh (now 16
instances, 1 draw call; groups stay transform/visibility proxies;
3-lens adversarial review zero confirmed defects) + fpsWarmupMs
2500→4000 (minFps 8 UNCHANGED). race:proof GREEN at the deployed code:
pointer = 2026-07-11T17-21-18 run (desktop steady 11 fps headless,
pass errors=0; the earlier same-day red re-runs were load artifacts —
owner's VM/Codex sessions at load1 6-11; landed once load1 < 3).
**ONE ITEM FOR THE OWNER: sign off the fpsWarmupMs 2500→4000 gatesNote
(W0 pattern; queued in approvals-hub top).**

**Owner calls settled at the switchover:** outplayasians likeness
APPROVED ("asians looked great") — crosser wiring + optional roster
seat is the queued next W3 step (not started). Fish-bone arm delay
stays. Camera question closed ("v1 far").

**Open owner decisions (all listed in approvals-hub.html top section):**
bundle gzip threshold 8500→9500 proposal (11 KiB spare — REQUIRED
before W4/W5 bundled content) · chip-revision direction (W7) · standing
PRD §9 gates (trackVisuals default-on, scorecards, acks, stash patches).

**Bundle state: 13.482 MiB raw / 8488.79 KiB gz vs 15.0/8500 — do not
add bundled bytes before the threshold decision.** Biggest structural
win queued in the roadmap: a kart-only build target (the fitness app's
~4-5 MB rides in the game deploy today).

---

**Updated 2026-07-11 pm (tenth update — the "K1 done" version).** Supersedes the ninth: K1 (the kart-only split) is BUILT + verified + pushed (88a349b5) but NOT deployed (owner gate); the prompt below is the CURRENT handover and starts the next agent at the K1 owner gates / K2.

**Purpose:** paste the block below into a new agent session to continue the graphics revamp with zero context loss. It is file-anchored — everything it references is committed — so it works for an agent with no memory of prior sessions.

---

## The prompt (copy everything in the block)

```text
You are working in the comeback-tracker repo on the Penguin Kart racing
game (React + Vite PWA; Three.js r184 game in src/game/; shipped runtime
= src/game/ComebackCityThreeKartRace.jsx). Branch:
codex/release-v1-comebacktracker-kart-racer (HEAD == origin, K1 done at
88a349b5). Live demo: https://comeback-city-kart.pages.dev/#race —
still serving the LAST PRE-K1 deploy (the combined fitness+kart build,
coins live-verified there); the K1 kart-only build is committed and
locally verified but NOT deployed — that deploy is an owner gate, not
yours to trigger. Git tag `pre-fable-revert-point` (+ its GitHub
prerelease) is the owner's revert point. Do not force-push over it.

READ IN THIS ORDER before working:
1. docs/PENGUIN_KART_V1_BETA_PRD.md — THE work queue (K1–K9,
   owner-approved 2026-07-11): split the fitness app out into the
   standalone penguin kart game, mobile controls V2, crosser + roster +
   item renders, menu beauty pass, then share as a beta. Each K-task
   carries Why/Files/Steps/Acceptance/Perf-gate. §5 is the owner gate
   table. V2 bucket (do NOT start): track improvements, ICE IS NICE,
   casino ordinal posing, haunt figures, share polish.
2. docs/GRAPHICS_REVAMP_HANDOFF_PROMPT.md — the checkpoint block at the
   top is the live-state truth (what's shipped + open owner decisions).
3. docs/PENGUIN_KART_CONTENT_ROADMAP_2026-07.md — W4–W7 source specs +
   STANDING RULES at the bottom (no-generic-penguins is absolute).
4. docs/PENGUIN_KART_GRAPHICS_V2_PRD.md §8/§9 when a task touches
   budgets or standing gates.

STATE YOU INHERIT (2026-07-11 EOD, post-K1):
- K1 DONE (commits 8989c3a5 + 88a349b5): `npm run build:kart` →
  dist-kart via vite.config.kart.js + index.kart.html + src/kart/
  (main.jsx / KartApp.jsx / kartLocalStore.js) + public-kart/ (kart CSP
  _headers, placeholder "Penguin Kart" icons). 8.781 MiB raw /
  6722.8 KiB gz. Fitness `npm run build` verified BYTE-IDENTICAL.
  Kart-local results in cc-kart-results + one-shot read-only migration
  from any legacy fitness atom. SW runtime-caches GLBs/backdrops —
  offline replay + fitness→kart SW self-swap both PROVEN locally
  (tmp/k1-pwa-upgrade-smoke, runs on loopback alias 127.10.42.67; LAN
  IP is firewalled, plain localhost skips SW registration by design).
  Shell QA contract proven 26/26 (tmp/k1-kart-shell-smoke).
- LIVE + verified (owner approvals in asset-manifest + approvals-hub):
  miami mode default both tracks; W2 clarity set (held-item chip, item
  guide, per-track ₿ item boxes, boost pad V1, rims CC V1 / PV V3); W3
  round-1 PV tribute set; collectible ₿ COIN system (879021dc) — rows =
  TWO coins at ±laneSpread (owner: "only 2 in a row not 3"), center
  line collects nothing (validator asserts it), field = ONE
  InstancedMesh, HUD ₿ counter; tmp/live-coin-probe.mjs re-verifies
  live any time.
- Proof/perf ground truth: race:proof GREEN at the K1 code twice
  (committed pointer 2026-07-11T19-54-29, captured at load1=2.90;
  run against dist-kart via RACE_PROOF_SERVER_MODE=preview:kart);
  headed phase5 = vsync-144 median-of-3 BOTH tracks (CC 144.04 /
  PV 144.03, evidence phase5-capture-2026-07-11*); fpsWarmupMs
  2500→4000 (minFps 8 unchanged) PENDING owner sign-off.
- Bundle: K1 LANDED — the kart deploy is now its own artifact:
  dist-kart 8.781 MiB raw / 6722.8 KiB gz vs kart budgets 12.0/8000
  (JS capped 2 MiB / 500 KiB gz; owner ack pending). The fitness build
  (dist, 13.486/8490 vs 15.0/8500) no longer carries kart content
  growth; the 8500→9500 raise is superseded. New kart content still
  prefers per-asset lazy loading + SW runtime cache over bundled bytes.

YOUR TASK: execute the V1-beta PRD in order. K1 is DONE (built +
locally verified; deploy + threshold ack are owner-gated — see the
K1 LANDED block at the top of this doc). When the owner says "deploy
the kart build": `npm run deploy:kart` (ships dist-kart to the same
comeback-city-kart project), then verify-live-deploy + live-coin-probe,
and re-confirm the fitness→kart SW swap on the live origin with a kept
browser profile. Next work item is K2 (fitness race-path diet — GATED
on the owner confirming the credits/garage/shop economy stays shelved:
deletes RaceScreen's dead second return + the ArcadeRace3D import +
orphaned pixi.js; K2 also lets KartApp import the intro/select from
one shared place, ending the mirror rule), then K3 mobile controls V2
(spec in PRD, ends with the 30-FPS iPhone 16 Pro sign-off), then K4…
per the PRD. Each K-task ends at its Owner-gate.

OWNER-PENDING (never block on these; surface when relevant — all queued
in approvals-hub top + PRD §5): "deploy the kart build" go (K1) · kart
budget thresholds ack (12 MiB / 8000 KiB gz, JS 2 MiB / 500 KiB gz) ·
the game NAME + real icon (placeholder "Penguin Kart" + wheel icon ship
meanwhile; regen via scripts/render-kart-placeholder-icons.mjs) ·
fpsWarmupMs gatesNote sign-off · economy-stays-shelved confirm
(REQUIRED before K2 deletes its dead UI) · 3 ordinal ChatGPT sheets +
lifoladen Tripo run (each unblocks its K6 character independently) ·
chip-revision direction (ask at K7 with icons in hand) · outplayasians
roster seat (K4 crosser ships regardless).

HARD RULES (each has burned this project):
- MIRROR RULE (new at K1): src/kart/KartApp.jsx duplicates RaceScreen's
  live intro/select shell VERBATIM (RaceScreen is unimportable from the
  kart build — its static ArcadeRace3D import drags the 2.71 MB dead
  visualTokens chain, and editing RaceScreen breaks fitness
  byte-identity). Any intro/select/testid change goes in BOTH files
  until K2+ deletes the fitness copy. The kart shell must NEVER touch
  the 'comeback-tracker-v1' localStorage key (kart state = cc-kart-*).
- NO GENERIC PENGUINS in generated content — prompts carry "NO people,
  NO animals, NO penguins"; penguin likenesses come only from the
  owner's ordinal collection with his per-file opt-in.
- No generator text/lettering; deliberate symbols only when the owner
  directs (the ₿ precedent). tripo mirror-mangles one face of every
  coin-like object — the back-to-back composite fix is
  tmp/w2-item-boxes/build-coin-composite.mjs.
- Never blanket `gltf-transform optimize`; individual verbs, meshopt
  LAST; a second simplify pass at error 0.001 is a NO-OP (raise the
  error bound instead). grep "new GLTFLoader(" src/ must return
  exactly 1 hit (gltfLoader.js).
- Every new mesh: orientation lab before promotion; manifest record
  with BOTH hashes + owner-approval quote; assets:check green
  (strict audit covers src/assets/game/models/**).
- Every generated mount goes through the telemetry mounts guard
  (miamiMountStats) — kart-playable fails loud on a 404. Keep it that
  way; it has caught two real deploy breakages.
- Deploy = owner-triggered. Kart game (post-K1): `npm run deploy:kart`
  (= build:kart + wrangler pages deploy dist-kart
  --project-name=comeback-city-kart; CLOUDFLARE_ACCOUNT_ID in the
  cloudflare memory: 9f01a1b31a298b112c22c3e00fe70a45). NEVER deploy
  the fitness `dist` to comeback-city-kart again. ALWAYS run node
  tmp/w0-ship/verify-live-deploy.mjs after (both tracks + mounts; it
  reads at raceTime>4 and can show one requested mount short —
  tmp/live-coin-probe.mjs reads at raceTime>20 and settles it); the
  pages.dev alias serves stale for ~30-60s — re-probe before
  diagnosing. CSP gotchas (both live-only): connect-src needs blob:,
  script-src needs 'wasm-unsafe-eval' (meshopt) — both preserved in
  public-kart/_headers.
- Never run two vite-spawning suites/captures concurrently. Headless
  FPS is never quotable — headed phase5 is the only FPS truth. Before
  diagnosing a RED headless proof as real, check `sysctl -n vm.loadavg`:
  the owner's VM/Codex sessions at load1 > ~5 fake minFps/route-progress
  failures (proven 2026-07-11; wait for load1 < 3 and re-run).
- One variable per change; battery before every ship — kart variants
  since K1: test:race · test:kart-playable:kart (both tracks, runs over
  dist-kart) · test:bundle:kart AND test:bundle (fitness must stay
  green too) · assets:check · test:race-proof:kart (re-baseline only
  when visuals change by design) · phase5 headed when perf could move.
  The plain suites (no :kart suffix) still exercise the fitness build —
  run those when a change touches shared src/game/ code.
- Owner decisions go through labs + approvals-hub.html ("Decisions
  waiting on you" section at top — keep it current). He answers fast
  and tersely; record every pick verbatim in the roadmap + manifest.

WORKING PROTOCOL: commit with the task/workstream ID; push; stop only
at declared owner gates; keep the handoff doc checkpoint block + session
memory current at every stop.
```

---

## Not in the prompt but useful to know

- **Evidence trails:** canonical FPS runs live in `.agent/runs/kart-racer-production-readiness/evidence/phase5-capture-*`; A/B captures in `tmp/m0-trackvisuals-proof/` and `tmp/m1-render-scale/`; B1 palette-lab tiles + capture scripts in `tmp/m2-palette-lab/` (contact sheet: `palette-lab.html`); B3 rim-lab tiles + capture/probe scripts in `tmp/m2-rim-lab/` (contact sheet: `rim-lab.html`; the extreme-value probe images are the injection/scenery-untouched proof); B2 moments-lab tiles + capture/seam-probe scripts in `tmp/m2-moments-lab/` (contact sheet: `moments-lab.html`; `seam-lap-*.webm` are the frame-by-frame wrap-seam evidence, `seam-probe.json` the lerps-are-free A/B). The race:proof "ledger" in git is only the pointer `asset-pipeline/proof/latest-proof-run.json` — the run artifacts under `asset-pipeline/proof/runs/` are gitignored and local-only.
- **Session memory** (Claude Code auto-memory) mirrors this doc — `kart-project-state.md` is the READ-FIRST memory entry and was updated 2026-07-11 pm (K1 done).
- **The owner reviews at** `http://localhost:5173/approvals-hub.html` (dev server usually already running).
- Owner-call bookkeeping: the PRD's decision log (§9) records STANDING/STRATEGIC gates; per-task A/B gates (like the B1 palette pick) are tracked in the execution plan's per-task Owner-gate fields — the §9 footnote scopes the table this way on purpose. Update those docs, not chat history.
