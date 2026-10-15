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
  `test:spline` is red before this plan (PV p0.4375 kink, item 1.12).
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

- [x] 1.0 *(7ed1bea6 snow fix, d055d9fb Codex fixes; build, bundle, clearance,
  node set and playable proof green before both)* Commit the snow fix (groundTerrain.js, test-ground-clearance.mjs,
  the monolith hunk, buildRoadEdgeProfile.js footDrop) and, after a read-through,
  the Codex loop fixes from docs/CODEX_LOOP_2026-10-01.md (kartLocalStore,
  replayGhost, gamepadInput, their tests, package.json script, the CI yaml) as
  their own commit.
- [ ] 1.1 **Real karts for the ordinal rivals.** Seth Penguin, Mizzle and Layer
  23 still drive the recoloured Kenney toy dragster (roster ~line 681). Point
  them at existing authored bodies (iceracer, iceblock, btckart "Block Reward",
  hashrunner, coldwallet, satstacker, pixelpickup, noderunner) — owner picks
  the pairing on the approval page. Biggest visible jump for three lines.
  Kart stats differ by up to ~3%, so re-run `npm run probe:difficulty` after.
- [ ] 1.2 **Skyline ring looms and pops.** `nearParallax` 0.72 was tuned for
  350-unit tracks; the 4x tracks reach r~1900-2100 so the camera nears or
  crosses the painted ring (BackSide → that side vanishes). Derive from track
  extent.
- [ ] 1.3 **Artifact pass** — snowfall Points become 100-400px discs near the
  lens (add near fade + size clamp + player-anchored Y, or drop them: the
  storm shells already carry the weather); blizzard cloud sits at driver
  height, FrontSide pops when the camera enters, excluded from the camera
  guard; held-item glow (10u additive sprite) is sliced by the road — shrink +
  soft fade; speed-blur depth band (9→26u) is stale vs the 30-38u boom and
  the "punch" ignores the radial clear zone.
- [ ] 1.4 **Ordinal-only penguins on Penguin Village** — generic statues
  (makeIcePenguin) and 64 generic spectators (makePenguinSpectator) break the
  standing rule. Swap to instanced, decimated ordinal GLBs.
- [ ] 1.5 **Start/finish moment** — CC's finish gate beacons/halo/glow bar only
  exist under `?trackVisuals=1`; ungate them; light the viaduct underside.
  (Ungate the gate pieces only: trackVisuals also turns on per-band road
  banking, and groundTerrain.js assumes a flat road — no band authors banking
  today, but re-run test-ground-clearance if one ever does.)
- [ ] 1.6 **Barrier LED ad panels + rhythm posts** — UVs + one canvas atlas on
  the existing barrier face carrying the group's jokes (HODL, WAGMI,
  Polymarket odds, inscriptions); instanced posts every ~40u for speed read.
- [ ] 1.7 **Driver pop** (A/B) — driver-only rim/back-light or outline; the
  player's driver reads as a dark blob from the chase cam.
- [ ] 1.8 **PV value pass** (A/B) — dark anchors (open-water leads, rock), less
  near-ring haze, bright snow chunks instead of the grey wheel smudges.
- [ ] 1.9 **Phone render tier** — render scale is keyed on aspect ratio, so
  landscape phones get desktop resolution at DPR 2 with no AA and a floor the
  governor can't drop below. Key on touch (0.7/0.85), add FXAA/SMAA-low, add a
  landscape touch run (844x390) to the playable proof.
- [ ] 1.10 **Rivals at the lens** — near plane 1, nothing fades a kart between
  camera and player; add a dither fade.
- [ ] 1.11 **Touch-first How-to-Race** + drift flick threshold (any ≥0.55 px/ms
  swipe starts a drift that only ends on lift) — newcomers can't drift.
- [ ] 1.12 Smooth the Penguin Village centreline kink at p0.4375 (spline R~80
  over 6 units) — turns `test:spline` green.

## Phase 2 — TestFlight build · ~2-3 days engineering once unblocked

**Owner first (nothing native can be built without these):**
`sudo xcodebuild -license accept` · Apple Developer Program enrolment
($99/yr; an Organization needs a D-U-N-S number — start now) · final name +
bundle id (permanent once the App Store Connect record exists) · icon (the
current one is a generic penguin) · device floor (suggest iPhone-only, iOS
17+) · written likeness OK from each ordinal holder in the roster · commercial
terms for the music and generated assets.

**Engineering:** `ios:sync` (node 22) → simulator + device boot, check models,
meshopt WASM and audio load from `capacitor://` · Info.plist/project:
`ITSAppUsesNonExemptEncryption=false`, arm64 only, iPhone-only family, build
number · defer screen-edge gestures + hide home indicator (steering zone
reaches the bottom edge) · WebGL teardown (`forceContextLoss`, free textures)
+ context-lost handling (new canvas per race) · self-host the Google Fonts ·
`@capacitor/haptics` (navigator.vibrate is a no-op on iOS) · resume audio from
`interrupted` (calls/Siri) · reachable perf overlay · unclean-exit marker ·
dark launch screen.

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

Not in V1's store build: it needs payments, moderation and a server. What the
research (2026-10-15) settled:

- **Payment:** inside the iOS app it must be Apple in-app purchase (a $4.99
  consumable "Racer Token"; 15% under the Small Business Program — enrol
  before the first sale). Card + crypto live on a web store; the app may link
  to it in the US storefront only. The Aug-15 "app sells nothing, web sells
  racers" plan breaks guideline 3.1.3(b). No crypto and no ordinal-ownership
  unlocks inside the app.
- **Vendors:** OpenAI image model for the 4-view sheet (Gemini's API terms
  bar apps likely used by under-18s — fine for the adults-only concierge, not
  for the app) → Meshy multi-image-to-3D called directly → our own diet in a
  Cloudflare Container. Not Higgsfield (no 3D or Nano Banana Pro in its public
  API; perpetual licence on inputs). ~$18 bake-off first (Meshy/Tripo/Rodin/
  Hunyuan).
- **Scope:** PFPs (ordinals included), character art, pets. No selfies yet
  (Meshy terms bar personal data on standard plans and train on uploads;
  biometric laws). 18+ gate; racers private to the buyer; owner approves each.
- **Cost:** ~$1.40 vendor cost per delivered racer incl. re-rolls (cap $3);
  ~$2.85 margin at $4.99 after Apple. Fixed: Meshy $40/mo, Workers $5/mo.
- **Phases:** 0 concierge for the group now (~5 dev-days: off-app payment,
  Claude runs a `racer-forge` script, owner approves on the approval sheet,
  claim link loads the racer) → 1 self-serve iOS MVP (~3-4 weeks) → 2 no
  waiting (AI judge after ~100 owner calls, web checkout, selfies later).

## Art round (needs Higgsfield credits; balance is 0)

What still reads cheap after Phase 1 is Comeback City past the barrier: the
painted skyline strip, procedural boxes, primitive trees, an empty plain.
Fix = 6-10 big landmark towers at fixed spots in the main sightlines + a
4-6 piece roadside kit (neon palm, Miami lamp, crypto sign), generated →
lifted → dieted, through a lab the owner picks from.
