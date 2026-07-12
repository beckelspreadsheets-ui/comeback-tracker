# Graphics Revamp — Fresh-Context Handoff Prompt

## ⚡ K2.5 PHASE 1 + K3 CORE (2026-07-11 late — newest state)

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
