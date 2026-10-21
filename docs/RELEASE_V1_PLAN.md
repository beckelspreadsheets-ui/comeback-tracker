# Penguin Kart V1 — release plan (2026-10-15)

The working queue from "the group likes the preview" to "on iPhones, playable and
fun". Written after a fresh audit (graphics, release readiness, photo-to-racer).
Work top to bottom. Check items off here as they land; this file is what a
`/goal` run reads.

## Rules for every item (carry these into any long run)

- One item = one commit on `aaa-kart-ci`. Stage explicit paths, **never
  `git add -A`** (the tree holds unrelated AnimatedShowcaseDesigns/ and tmp/
  work). Never deploy. Never push `aaa-kart-overhaul-full`.
- Gate every commit: `npm run build:kart`, `npm run test:bundle:kart`,
  `node scripts/test-ground-clearance.mjs`, the node set (`test:laps
  test:wrongway test:offroad test:autoplay test:minimap test:kart:regressions`)
  and, for anything visual or runtime, `test:kart-playable` (preview server).
  `test:spline` is green since 1.12 (it was red before this plan) — add it to
  the node set.
- **Look at a frame yourself** before believing a green report. Captures on the
  owner's main machine are fine for spotting bugs, never for scoring looks or
  fps (load is 10-25 there; check `sysctl -n vm.loadavg`, don't launch captures
  above ~12).
- Anything that changes the LOOK goes behind a URL flag first and onto ONE
  approval page with before/after frames; the owner says yes/no in one pass.
- Standing art rules: neon-dusk sunset on both tracks but distinct; no generic
  penguins (every penguin is one of his ordinals); "fewer, bigger, more
  detailed"; never `gltf-transform optimize`; transparent materials must
  depth-write or alpha-test.

## Done 2026-10-15

- [x] **Snow over the road (owner: "it distorted your character").** The
  Penguin Village valley (p0.38-0.43) had white ground wedges across the road
  that sliced the kart and driver. Cause: the terrain follow ramped back to
  the plane INSIDE the road+kerb footprint, and 38-unit ground triangles
  tilted up through it (also nearest-sample quantisation on grades and spline
  kinks at S-bends). Fix: `src/game/race/render/groundTerrain.js` (flat band
  = footprint + one triangle diagonal, foot interpolation, sag + bend
  allowances, cross-pass guard) + barrier back face plunges 1.0.
  Gate: `scripts/test-ground-clearance.mjs` — before: 34,216/818,169 PV probes
  buried (worst 1.66u) and 41,822 on CC; after: 0 and 0, no daylight under any
  barrier. Playable proof green both tracks. Committed 7ed1bea6.

## Phase 1 — looks like a real game (code only, no credits) · ~4-6 days

`[~]` = built behind a URL switch, waiting for the owner's pick: https://claude.ai/artifact/Rm381M5UN4enxAUVbs1SqQ

- [x] 1.0 *(7ed1bea6 snow fix, d055d9fb Codex fixes; build, bundle, clearance,
  node set and playable proof green before both)* Commit the snow fix (groundTerrain.js, test-ground-clearance.mjs,
  the monolith hunk, buildRoadEdgeProfile.js footDrop) and, after a read-through,
  the Codex loop fixes from docs/CODEX_LOOP_2026-10-01.md (kartLocalStore,
  replayGhost, gamepadInput, their tests, package.json script, the CI yaml) as
  their own commit.
- [x] 1.1 *(f4f8c18d; OWNER PICK 2026-10-15: set A ships — Hash Runner / Block Reward / Sat Stacker; `?rivalKarts=b|off`)* **Real karts for the ordinal rivals.** Seth Penguin, Mizzle and Layer
  23 still drive the recoloured Kenney toy dragster (roster ~line 681). Point
  them at existing authored bodies (iceracer, iceblock, btckart "Block Reward",
  hashrunner, coldwallet, satstacker, pixelpickup, noderunner) — owner picks
  the pairing on the approval page. Biggest visible jump for three lines.
  Kart stats differ by up to ~3%, so re-run `npm run probe:difficulty` after.
- [x] 1.2 *(b3524b53 — trail held at ~100 units: 0.948 CC / 0.953 PV)* **Skyline ring looms and pops.** `nearParallax` 0.72 was tuned for
  350-unit tracks; the 4x tracks reach r~1900-2100 so the camera nears or
  crosses the painted ring (BackSide → that side vanishes). Derive from track
  extent.
- [x] 1.3 *(618253d2 — snow cap + lens fade + elevation band; blizzard lens/inside fade; pulled item glows; blur band from the real boom)* **Artifact pass** — snowfall Points become 100-400px discs near the
  lens (add near fade + size clamp + player-anchored Y, or drop them: the
  storm shells already carry the weather); blizzard cloud sits at driver
  height, FrontSide pops when the camera enters, excluded from the camera
  guard; held-item glow (10u additive sprite) is sliced by the road — shrink +
  soft fade; speed-blur depth band (9→26u) is stale vs the 30-38u boom and
  the "punch" ignores the radial clear zone.
- [x] 1.4 *(bcf6bb53 — statues + spectators are roster ordinals; spectators re-seated on the road elevation)* **Ordinal-only penguins on Penguin Village** — generic statues
  (makeIcePenguin) and 64 generic spectators (makePenguinSpectator) break the
  standing rule. Swap to instanced, decimated ordinal GLBs.
- [x] 1.5 *(489d846b — gate beacons/halo/glow bar ungated; CC viaduct underside strips)* **Start/finish moment** — CC's finish gate beacons/halo/glow bar only
  exist under `?trackVisuals=1`; ungate them; light the viaduct underside.
  (Ungate the gate pieces only: trackVisuals also turns on per-band road
  banking, and groundTerrain.js assumes a flat road — no band authors banking
  today, but re-run test-ground-clearance if one ever does.)
- [x] 1.6 *(fad5383c; OWNER PICK 2026-10-15: on with the shipped slogans; `?barrierKit=0`)* **Barrier LED ad panels + rhythm posts** — UVs + one canvas atlas on
  the existing barrier face carrying the group's jokes (HODL, WAGMI,
  Polymarket odds, inscriptions); instanced posts every ~40u for speed read.
- [x] 1.7 *(c195b76c; OWNER PICK 2026-10-15: B, the accent outline; `?driverPop=a|off`)* **Driver pop** (A/B) — driver-only rim/back-light or outline; the
  player's driver reads as a dark blob from the chase cam.
- [x] 1.8 *(a6720014; OWNER PICK 2026-10-15: B, clearer air + darker anchors; `?pvValue=a|off`)* **PV value pass** (A/B) — dark anchors (open-water leads, rock), less
  near-ring haze, bright snow chunks instead of the grey wheel smudges.
- [x] 1.9 *(c3b6ff36 — touch tier 0.6→0.85, FXAA on mobile, phone-landscape run in the proof)* **Phone render tier** — render scale is keyed on aspect ratio, so
  landscape phones get desktop resolution at DPR 2 with no AA and a floor the
  governor can't drop below. Key on touch (0.7/0.85), add FXAA/SMAA-low, add a
  landscape touch run (844x390) to the playable proof.
- [x] 1.10 *(0d6b3055 — occluder cap 0.3 + alphaHash dither fade; replay ghost keeps blending)* **Rivals at the lens** — near plane 1, nothing fades a kart between
  camera and player; add a dither fade.
- [x] 1.11 *(touch-first How to Race f1e8897f; firm flick behind `?driftFlick=firm` fa301282 — owner feel-check on the aaa-preview deploy pending)* **Touch-first How-to-Race** + drift flick threshold (any ≥0.55 px/ms
  swipe starts a drift that only ends on lift) — newcomers can't drift.
- [x] 1.12 *(46d66538 — control points re-spaced around the 6.3-unit market step; test:spline green)* Smooth the Penguin Village centreline kink at p0.4375 (spline R~80
  over 6 units) — turns `test:spline` green.

## Phase 2 — TestFlight build · ~2-3 days engineering once unblocked

**Owner first (nothing native can be built without these):**
`sudo xcodebuild -license accept` · Apple Developer Program enrolment —
**owner chose the COMPANY route (Showcase Designs), 2026-10-15**: it must be a
registered LLC/corporation (no sole prop or DBA), needs a free D-U-N-S number
(Apple's lookup tool, up to 5 business days, legal name spelled identically),
a live website on the company's own domain plus an email on that domain, and
the enroller must be able to bind the company; $99/yr, Apple may phone to
verify · bundle id is `com.showcasedesigns.penguinkart` in capacitor.config.json
(permanent once the App Store Connect record exists; display name can change)
· icon: **owner picked A, Seth Penguin on the arctic ice (2026-10-21, shipped
65fee406)**; a painted polish of it waits on ElevenLabs · device floor: **owner chose
iPhone AND iPad (2026-10-21)**; iOS 17.0 minimum set by Claude, changeable · written likeness OK from each ordinal holder in the
roster (docs/LIKENESS_PERMISSION.md) · music: the in-game beds are rendered by
our own script (clean); "Vice On Ice" (MiniMax free demo, unclear terms) is
only the TRAILER track and gets replaced from ElevenLabs credits.

**Groundwork done without the Apple account (2026-10-21):**
- [x] WebGL context loss: the race pauses with a note, skips drawing, and
  recovers on restore; leaving a race calls forceContextLoss on its canvas
  (every race mounts a fresh canvas). Gate: `npm run test:kart:context-loss`.
- [x] Audio resumes after an iOS interruption (calls/Siri): 'interrupted' is
  treated like 'suspended' while the game wants sound; taps on the pause menu
  no longer restart audio behind it.
- [x] Unclean-exit marker (race/sessionHealth.js): a race that dies on screen
  puts the next one in safe mode (governor held at its floor), counted.
- [x] The on-device performance readout (src/kart/devicePerfProbe.js, already
  behind `?perf=1`) is now reachable inside the app: a pause-menu toggle that
  is remembered on the device (race/perfToggle.js); it also shows the render
  scale and SAFE MODE / crash count.
- [x] Haptics through the native plugin via Capacitor's injected bridge (no
  @capacitor/core in the web bundle), falling back to navigator.vibrate
  (race/haptics.js); hits, walls, mini-turbos, the start and the finish.
  Native plugin installed + synced (d9290a5f, @capacitor/haptics 8.0.2).
- [x] App Store screenshot capture at the iPhone 6.9" and iPad 13" landscape
  sizes: `node scripts/app-store-screenshots.mjs` (after build:kart).
- [x] Review-frame capture lives in the repo now:
  `node scripts/race-review-shots.mjs <outDir> '<variants json>'` (race-time,
  progress and boost-hit marks; phone variants; camLab).

- [x] Native project (3b40172b): Info.plist `ITSAppUsesNonExemptEncryption`
  false + arm64 only, iOS 17.0, iPhone + iPad family, every screen edge
  deferred to the game (MainViewController.swift — the home indicator is left
  visible on purpose, see the comment there), dark launch screen,
  PrivacyInfo.xcprivacy.
- [x] Fonts self-hosted, no Google requests; privacy + support pages ship in
  the build (5b5da2d5, trimmed 87499060).
- [x] 10-race soak (`npm run test:kart:soak`, after build:kart): race → Quit
  to menu → Single race on the other track → Start, ten times in one page.
  First run: ONE live WebGL context at the menu after every race (each race's
  context is released), JS heap after GC 45.3 → 53.6 MiB (~0.6 MiB a race
  after warm-up) — passes the bar; the creep is being chased.

**Engineering still open (needs the Xcode licence, then the Apple account):**
`npm run ios:sync` (node 22) → simulator + device boot, check models, meshopt
WASM and audio load from `capacitor://` · build number at archive time ·
TestFlight upload.

## Phase 3 — fun check with the group (TestFlight)

Owner + 2-3 group members first, then a public TestFlight link. Bar: a
newcomer finishes top 3 in their first race (re-run `probe:difficulty` at
50/100cc with touch), zero reloads in 10 races, ≥30 fps p95 on an iPhone
12-class phone, no keyboard text on phones.

## Phase 4 — App Store

Screenshots at Apple sizes, privacy label ("Data Not Collected" for V1),
age rating, privacy + support URLs, optional Game Center Time Trial boards
(~1 day). Review takes 1-2 weeks including fixes.

## Phase 5 — photo → custom racer (V1.1) · full brief: docs/PHOTO_RACER_BRIEF.md

Not in V1's store build: it needs payments, moderation and a server.

**Owner decisions 2026-10-15** (these override the brief where they differ):
- **3D vendor = Tripo's pay-as-you-go API, no subscription.** Meshy's API
  needs a paid plan ($20/mo Pro minimum; the "$40" was Premium) and
  Higgsfield is on its free tier with 0 credits and no packs offered. Tripo:
  $0.01/credit, top up from $1; H3.1 multiview textured 30-40 credits
  ($0.30-0.40), P1 game topology 50-60 ($0.50-0.60); paid-credit outputs are
  ours and not trained on. Free sign-up credits leave rights with Tripo, so
  use them for tests only. **Terms §3.2:** making the model available to end
  users needs Tripo's written OK (business@vastai3d.com) — fine for the
  concierge (we make and deliver the racer), ask before self-serve.
- **Sheet step:** owner's ChatGPT by hand ($0) or an OpenAI API key
  (gpt-image-2 ~$0.04-0.17/image). Keys go in the macOS Keychain
  (`security add-generic-password -a "$USER" -s tripo-api-key -w`, likewise
  `openai-api-key`), entered by the owner in his own Terminal; scripts read
  them at run time and never print them.
- **Cost:** ~$0.70-1.40 per delivered racer incl. one full re-roll.
- **Price:** $7.99 standard with a **$4.99 founders' price** for the group's
  first wave (first ~20 racers or two weeks). Profit per racer at $7.99 ≈
  $6.05-6.75 card (Stripe 2.9%+30¢), $6.60-7.30 Lightning, $5.40-6.10 in-app
  (Apple 15%); at $4.99 ≈ $3.15-3.85 / $3.60-4.30 / $2.85-3.55. $7.99 wins
  while it keeps ≥55% of the $4.99 buyers; drop to $4.99-5.99 if sales fall
  by more than half after founders' week. Later upsell: kart paint / name
  plate ~$2.99. Market: Hero Forge custom file ~$8, Fortnite outfits ~$9-23,
  photo-avatar apps $3-9/mo subscriptions, physical photo figurines $49-99+.
- **Payment (concierge):** Stripe payment link AND Bitcoin Lightning. Inside
  the iOS app it must be Apple in-app purchase.
- **When:** build the `racer-forge` concierge while Apple verifies the company
  account (Phase 2 wait), not ahead of Phase 1.

Still standing from the research:
- **Payment rules:** in-app = Apple IAP (consumable "Racer Token"; 15% under
  the Small Business Program — enrol before the first sale). Web store for
  card + crypto; the app may link to it in the US storefront only. Anything
  sold on the web must also be buyable in-app (3.1.3(b)). No crypto and no
  ordinal-ownership unlocks inside the app.
- **Scope:** PFPs (ordinals included), character art, pets. No selfies yet
  (vendor terms + biometric laws). 18+ gate (fal's terms also require 18+
  end users if fal is ever used); owner approves each racer.
- **Phases:** 0 concierge for the group (off-app payment, Claude runs
  `racer-forge`, owner approves on the approval sheet, the racer reaches the
  game) → 1 self-serve iOS MVP (~3-4 weeks) → 2 no waiting (AI judge after
  ~100 owner calls, web checkout, selfies later).

## Art round (pay-per-use now: OpenAI images + Tripo lifts; no Higgsfield plan needed)

What still reads cheap after Phase 1 is Comeback City past the barrier: the
painted skyline strip, procedural boxes, primitive trees, an empty plain.
Fix = 6-10 big landmark towers at fixed spots in the main sightlines + a
4-6 piece roadside kit (neon palm, Miami lamp, crypto sign), generated →
lifted → dieted, through a lab the owner picks from.
