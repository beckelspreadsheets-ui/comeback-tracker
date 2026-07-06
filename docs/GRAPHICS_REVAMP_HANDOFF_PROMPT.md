# Graphics Revamp — Fresh-Context Handoff Prompt

**Updated 2026-07-06 (fourth update today — the "start B2 here" version)** (supersedes the third update: B3 is SETTLED FOR PENGUIN VILLAGE — owner picked V6 "ice white" from rim-lab.html, landed as `palette.heroRim`, ships ON at 144 FPS; Comeback City ships rim-off BY OWNER CHOICE, its pick stays open. ALSO LANDED same day, gameplay: kart-vs-kart collision (solid karts, symmetric rear-hit spin-outs) + fish-bone arm delay + autoplay item sense — commit 6a016533; race timelines shifted, all suites re-verified green. NEXT SESSION STARTS AT: B2 (per-lap palette moments, kickoff brief below) → M2 benchmark review → Phase C city-visuals kickoff).

**Purpose:** paste the block below into a new agent session to continue the graphics revamp with zero context loss. It is file-anchored — everything it references is committed — so it works for an agent with no memory of prior sessions.

---

## The prompt (copy everything in the block)

```text
You are working in the comeback-tracker repo on the Penguin Kart racing game
(React + Vite PWA; Three.js r184 game in src/game/; shipped runtime =
src/game/ComebackCityThreeKartRace.jsx). Branch:
codex/release-v1-comebacktracker-kart-racer (pushed; HEAD == origin).

MISSION: execute the graphics revamp that takes the game to
"could-ship-on-Nintendo-Switch" visual quality. Engine decision is FINAL:
Three.js + Blender bake pipeline. Do not evaluate or propose Unreal/Godot/
Unity/WebGPU migrations.

READ IN THIS ORDER (do not start work before 1 and 2):
1. docs/PENGUIN_KART_GRAPHICS_V2_PRD.md — THE master doc: vision, milestones
   M0-M5, requirement IDs, acceptance criteria, owner decision log. Its M1
   milestone-notes block and §8 budgets line carry the live numbers.
2. docs/PENGUIN_KART_GRAPHICS_REVAMP_EXECUTION_PLAN.md — file-level tasks
   (IDs A1..E6). Read its "Binding cross-phase amendments" and "Canonical
   measurement protocol" sections FIRST; they override task text. C0 is
   retired; D0 is descoped.
3. When a task touches its domain: docs/FLIPBOOK_BILLBOARD_SPEC.md,
   docs/HIGGSFIELD_MCP_INTEGRATION_PLAN.md (H0 gates generated art),
   docs/KART_FACE_ART_INTAKE.md + docs/CHARACTER_EXPRESSION_SHEET_BRIEF.md
   (Phase E art intake; format locked by E1).

STATE YOU INHERIT (verified 2026-07-06; commits a9b7c202..15599b98 —
B4 landed at 47b38a2c, B1 completed at 15599b98, both verified by the
full battery and pushed):
- M0 COMPLETE. Everything is committed; a fresh clone passes `npm ci &&
  npm run build && npm run test:race && npm run test:kart-playable &&
  npm run assets:check` (verified end-to-end; only post-clone step is
  `npx playwright install chromium`). The quarantine stash is fully
  drained: meshopt avatars re-landed (-11.3 MB, hashes match manifest),
  trackVisualSchema re-landed FINISHED behind ?trackVisuals=1 (default
  OFF — owner §9 signature required for default-on), bake-GLB 404s are
  loud + proof-gated (kart-playable FAILS unless telemetry.bakedBuildings
  === 'active'), `npm run assets:bake` regenerates bakes end-to-end
  (Blender 5.1.2 local), and .github/workflows/asset-integrity.yml runs
  assets:check on every push (red/green proof recorded in the PRD). Two
  stash hunks were deliberately EXCLUDED pending owner review, preserved
  verbatim in tmp/m0-trackvisuals-proof/excluded-*.patch (legacy audio
  silencing; scenery window-density/culling change).
- M1 COMPLETE. Canonical FPS truth (headed Chromium, PRODUCTION build via
  vite preview, /?raceAutoplay=1&track=<key>#race, 20s post-countdown,
  median of 3, Mac mini M4 @ 144Hz — instrument:
  scripts/phase5-sustained-capture.mjs, PHASE5_HEADED=1 / PHASE5_TRACK=):
  BOTH tracks vsync-locked at 144 FPS, worst sample 143.5, frameWorkMs
  1.2-1.4ms, comeback-city 480 draw calls / penguin-village 783. The old
  22.7-FPS figure was headless rAF throttling — headless is NEVER quotable
  as a baseline. Desktop render scale is committed at 0.85 (RACE_RENDER_SCALE
  in src/game/race/render/createRaceScene.js); the legacy ArcadeRace3D stack
  is pinned to 0.58 via RACE_RENDER_SCALE_LEGACY (its suite's pixel
  thresholds are resolution-calibrated). Bundle budget re-baselined and
  GREEN (test:bundle, both presets): total 12.45 MiB vs 15.0 threshold
  (12.30 pre-B4; B4 spent 72.9 KiB gzip of its ~200 KiB JS allowance).
  PUBLISHED HEADROOM (PRD §8): Phase C gets 2.14 MiB of WebP bake textures
  (images gate) within 2.70 MiB total raw / 1237 KiB gzip. Telemetry now
  exposes frameElapsedMs/frameWorkMs/rendererStats/bakedBuildings/
  trackVisualsEnabled/proofCameraMode/postChainEnabled; race:proof
  (capture+compare) PASSES at HEAD.
- M2 IN PROGRESS — B1 COMPLETE, B4 COMPLETE (gated), B3 BUILT (owner pick
  pending). Ledger:
  B3 (built + verified 2026-07-06, third session): composable
  shader-injection helper src/game/race/render/toonRimShader.js is the
  Amendment 7 single home (addShaderInjection registry + merged
  customProgramCacheKey — D1 sway and E6 hull MUST route through it; the
  explicit merged key matters because three's default key stringifies
  onBeforeCompile and the composed callback has identical source across
  materials with different registries). Fresnel rim chunk verified against
  the INSTALLED r184 meshtoon sources: anchor `#include <opaque_fragment>`,
  reuses in-scope geometryNormal/geometryViewDir from lights_fragment_begin.
  Rim wired OPT-IN at the five hero sites (mountDriverAvatar,
  attachTripoKartBody, attachAuthoredKartBody, marcher swap-in,
  itemMaterial) via applyHeroRim; scenery untouched. DEV-ONLY gate:
  ?rimLab=1 + window.__rimLabOverrides={strength,power,tint} (paletteLab
  pattern); shipped default is rim-OFF and provably unchanged (race:proof
  status=pass errors=0 at the landing commit — baselines NOT regenerated,
  by design). Shared tint TOON_RIM_SHARED_TINT set per-track in createScene
  from palette.rimLightColor (PV '#00d5ff' / CC fallback '#4fd8ff'); B2 can
  lerp it. Rim lab live: rim-lab.html (regen: node
  tmp/m2-rim-lab/capture-rim-variants.mjs) — V0 control + 7 candidates ×
  both tracks, kart-centered crop gate tiles at routeProgress 0.30, + 2
  visual-only ?post=1 interplay tiles; linked from approvals-hub. Evidence:
  extreme-value probe (tmp/m2-rim-lab/probe-rim-extreme.mjs) proves the
  injection end-to-end (magenta heroes, scenery pixel-untouched);
  program-sharing delta 0 vs control (rim variant REPLACES the hero
  toon+map program one-for-one — every toon+map material in scene is a
  hero material; telemetry rendererStats gained `programs` for this);
  rim-on phase5 headed medians 144 both tracks (worst sample 143.47, work
  1.15-1.54ms). SETTLED (same day, part 2): owner picked V6 "ice white"
  FOR PENGUIN VILLAGE ("V6 for the penguin track is looking best") —
  landed as palette.heroRim in penguinVillage.js (0.32/2.6/'#eaf6ff'),
  resolved per race in createScene (lab URL hook still overrides; new
  ?rimLab=0 forces off). CC kept rim-off BY OWNER CHOICE ("keep CC rim
  off for now") — its pick remains open. Verified at the part-2 commit:
  race:proof pass errors=0 (proof route is CC, untouched), kart-playable
  green both tracks, test:race green, shipped-default PV crop matches the
  V6 tile (tmp/m2-rim-lab/penguin-village-shipped-default-v6-crop.png),
  shipped-default PV phase5 headed 144.03/143.27 worst / 1.37ms.
  B1: owner picked V8 "storm front" (2026-07-06) from palette-lab.html;
  values landed as additive keys in penguinVillage.js palette (fog
  '#4a6478' 150/680, hemi '#689bb8'/'#0f273f' @3.0, sun '#e8c9a0', rim
  '#00d5ff'). Comeback City untouched by construction (no palette keys).
  Full verification battery green at the landing commit (see its message).
  B4 (47b38a2c): pmndrs chain behind ?post=1 — mipmap bloom (radius 0.7,
  knee 0.22 — tuned for parity; legacy bloom ran on a 30%-res target which
  oversized halos) + SMAA MEDIUM + vignette + ACES in ONE EffectPass;
  renderer.toneMapping locally NoToneMapping; createRaceScene.js zero
  edits; every effect toggleable (&postBloom/postSmaa/postTone/
  postVignette=0). Owner signed BOTH per-task gates 2026-07-06 ("every
  change in the post lab is amazing"): parity + vignette (defaults ON
  inside the chain). Bundle +72.9 KiB gzip on the race chunk (under the
  ~120 SMAA budget; SMAA kept, no FXAA fallback); ?post=1 FPS 144 both
  tracks, no regression. Evidence: post-lab.html + tmp/m2-b4-post-chain/;
  phase5 gained PHASE5_URL_EXTRA + postChainEnabled sampling.
  STILL PENDING for M2 close: B2, then the benchmark review (owner
  signs/declines the §9 post-ban supersession there — B4 stays URL-gated
  until then). B3's Comeback City rim pick is OPEN but does NOT block M2
  (owner explicitly kept CC rim-off for now).
- GAMEPLAY LANDED 2026-07-06 (commit 6a016533, outside the graphics plan
  but it changes race timelines — know it exists): kart-vs-kart collision.
  rivalRacers.js KART_CONTACT = per-frame lateral push-apart separation
  (55 wu/s; must exceed steering authority or passes steer-lock into
  tailgates), cooldown-gated bumps, SYMMETRIC rear-hit spin-outs at
  closing speed > 85 wu/s (boost-grade: 284 boost vs 228*0.96 worst
  cruise = 65 stays under), airborne + dare-shortcut flight skip contact,
  and EVERY spin start (contact or item) sets bumpCooldown =
  spinCooldown 2.4 s so spins can't chain at the 46-speed floor.
  Companions that keep autoplay QA at baseline (probe: 5 item-hit
  spins/race → 0, finish time 30.2 s = baseline): heldItems.js fish bones
  arm 0.3 s for everyone (point-blank drops became 4-frame unreactables
  once karts got solid), and the autoplay driver dodges armed bones ahead
  + snowballs behind (autoplayDodgeBias in the JSX). Tunables live in
  KART_CONTACT; the owner was told spinSpeedDiff is the one number to
  retune if crashes feel too strict/loose. Diagnosis instrument:
  tmp/kart-contact-probe.mjs (telemetry trace of PV autoplay; patch the
  sample count for longer runs). Pure-node coverage:
  validateKartContactHelpers in scripts/race-content-playtest.mjs — the
  FIRST test coverage of the shipped V2 rival sim; extend it when you
  touch contact rules.
  Historical detail of the B1 part-1 wiring (verified by code audit):
  createScene (src/game/ComebackCityThreeKartRace.jsx ~L2864-2921) reads
  atmosphere from trackDef.palette — fog color/near/far, hemi sky/ground/
  intensity, sunColor, rimLightColor — with fallbacks IDENTICAL to the old
  hardcoded values (fog '#272252' 240/820, hemi '#8d8ce0'/'#2a1e4a' 3.3,
  sun '#ffae72', rim '#4fd8ff'). comebackCity.js defines NO palette key at
  all, so Comeback City runs 100% on fallbacks — untouched by construction
  (race:proof re-captured post-wiring: status=pass errors=0). Keep
  fog.far <= 840: camera far is 860 and fog beyond it silently no-ops.
  hemi + rimLight are exposed on the engine return for B2's runtime lerps.
  Dev-only variant hook: ?paletteLab=1 AND window.__paletteLabOverrides
  (both required; inert by default — the branch ships in the bundle, it is
  runtime-gated, not build-stripped). The Penguin Village palette lab is
  live: palette-lab.html (repo root) = V0 shipped-default control + 8
  candidates captured at telemetry routeProgress 0.30 (pond sweep), linked
  from approvals-hub.html (now marked PICKED: V8; kept for reference,
  alongside post-lab.html for B4); tiles, debug isolates, and
  capture scripts committed in tmp/m2-palette-lab/ (regen: node
  tmp/m2-palette-lab/capture-palette-variants.mjs). LAB LESSONS, encoded
  in that script: (1) hemi candidates are luma-normalized to the defaults —
  raising hemi luminance pushes the white snow past the bloom threshold
  and the frame cascades to white-out; vary HUE, never brightness;
  (2) fog must be pale/milky to read as haze on white geometry —
  scene.background is fog-exempt, so fog must harmonize with the sky.
  Verified at f2347c22: build, test:race, test:kart-playable (both tracks,
  bakedBuildings=active) green; race:proof pass with the committed
  latest-proof-run.json pointer moved to the post-wiring run. NOTE on
  proof evidence: asset-pipeline/proof/runs/ is gitignored, so proof-run
  artifacts are local-only and a fresh clone re-runs race:proof instead of
  reading old results — pre-existing design, same as the M1-exit
  re-capture (2ba807a9).
  (B1 part 2 landed per the ledger above — the pick was V8, no finalist
  blend round was needed, so the capture-script header's promised 0.84
  return-bend tile was never implemented; ignore that stale comment.)
- KNOWN-RED, PRE-EXISTING, DOCUMENTED (do not chase; do not silently
  accept new failures on top): (a) test:race:browser fails ONLY on
  blocker #10 (no-minimap 0.444<0.45, legacy-route harness) — run it with
  RACE_VISUAL_READY_TIMEOUT_MS=75000 or its 25s waits flake under load;
  (b) test:visual panel-2 waits for the LEGACY raceHud section on /#race —
  same family, ledgered in docs/race-v1-blocker-backlog.md #10.
- NEVER run two vite-spawning suites/captures concurrently: the dev-server
  dep-cache ping-pongs and CPU contention produces phantom knife-edge
  failures (kart-height, readiness timeouts). One at a time.
- FLAKE TRIAGE LEARNED 2026-07-06 (rerun ONCE on these signatures before
  investigating): (a) the FIRST dev-spawning suite after any npm dep
  change hits vite dep re-optimization mid-run and misses progress-by-time
  checkpoints (log shows "Re-optimizing dependencies"); (b) kart-playable
  mobile-autoplay can catch a rival hazard near a checkpoint ("did not
  sustain race speed" with healthy frameElapsedMs) — structurally RARER
  since the kart-contact landing (autoplay now dodges fish bones/snowballs
  and fresh bones have a 0.3 s arm delay; probe went 5 hits/race → 0), but
  the rerun-once rule still applies; (c) headed phase5/
  capture Chromium windows appear on the owner's desktop and he may close
  one ("Target page, context or browser has been closed") — TELL HIM
  before long capture batches. A palette/color change can never affect
  physics — don't chase speed failures into color commits.

YOUR TASK NOW: B2 (per-lap palette moments) — the LAST construction task
of M2. B1/B3/B4 are landed (B3: PV ships the V6 "ice white" heroRim; CC
ships rim-off by owner choice — its pick stays open in rim-lab.html and
does NOT block you; ?rimLab=1 forces a candidate, ?rimLab=0 forces off).

B2 KICKOFF BRIEF (full task detail: execution plan B2 section — read it;
deltas since it was written are folded in here):
- WHAT: Penguin Village's four authored road ribbons (main street 0.02,
  pond sweep 0.30, fish market 0.55, return bend 0.84 — align to
  penguinVillage.js roadRibbons) become 3-4 atmosphere lerps per lap
  driven by race.progress. Comeback City has no moments key → null path,
  pixel-untouched by construction (same trick as B1/B3).
- BUILD: src/game/race/paletteMoments.js — PURE (no THREE import, node-
  importable, deterministic): resolveMoments(palette) fills every
  optional field from the landed B1 V8 base values (fog '#4a6478'
  150/680, hemi '#689bb8'/'#0f273f' @3.0, sun '#e8c9a0') so lerp
  endpoints are always fully specified; sampleMoments(resolved, progress,
  out) does wrap-aware segment lerp (last→first across 1.0→0.0) with
  smoothstep easing. Data shape = additive palette.moments key:
  [{ progress, fog: {color,near,far}, hemi: {sky,ground}, sun:
  {color,intensity}, rim }].
- WIRE: in createScene, if palette.moments?.length, precompile via
  resolveMoments into THREE.Color pairs ONCE onto engine.paletteMoments
  (else null). Per-frame hook applyPaletteMoments(engine, race.progress)
  immediately before engine.composer.render(), after the sun-follow
  block. Handles ALREADY exposed on the engine return: hemi, rimLight,
  sun, scene.fog via scene. NEW since the exec plan: (a) the rim tint —
  lerp TOON_RIM_SHARED_TINT.value (toonRimShader.js; one Color.set
  retints every rimmed hero material, comment in createScene says B2 may
  lerp it); (b) bloom — branch on engine.postChainEnabled: legacy
  UnrealBloomPass ref is engine.bloomPass (.strength), pmndrs ?post=1 ref
  is engine.bloomEffect (.intensity); exactly one is non-null. ZERO
  per-frame allocations (scratch Colors made in createScene).
- GUARDS: fog.far stays <= 840 in every moment (camera far 860 no-ops
  beyond); hemi moment colors LUMA-NORMALIZED to the V8 base (vary hue,
  never brightness — the white-out lesson; copy matchLuma from
  tmp/m2-palette-lab/capture-palette-variants.mjs); moments must start/
  end near the V8 base so the lap wrap (0.95→0.05) has no color pop.
- OWNER GATE (design-choice workflow): build a MOMENTS LAB before
  landing — tmp/m2-moments-lab/ capture script (copy the rim-lab pattern:
  vite dev port 531x, headless, telemetry routeProgress-keyed shots at
  each moment progress 0.05/0.30/0.55/0.84, console-error collection) ×
  2-3 candidate moment SETS (e.g. subtle/journey/dramatic), page
  moments-lab.html at repo root, entry in approvals-hub.html Labs list,
  ?momentsLab=1 + window.__momentsLabOverrides dev hook in createScene
  (clone the paletteLab hook — overrides replace palette.moments).
  Shipped default stays moment-LESS until the owner picks a set; the pick
  lands as the palette.moments key + proof recapture in that commit.
- TESTS: node assert for sampleMoments at segment boundaries, mid-
  segment, and the wrap seam (0.95→0.05) — add a
  validatePaletteMomentHelpers to scripts/race-content-playtest.mjs
  (import from ../src/game/race/paletteMoments.js, follow
  validateKartContactHelpers right above the call list).
- VERIFY (serial, never two vite suites at once): npm run test:race ·
  test:track-visuals · test:kart-playable · test:race-proof (CC proof
  route must pass UNCHANGED — moments are PV-only) · full-lap PV capture
  checking the wrap seam · phase5 headed both tracks (144 must hold; a
  handful of lerps is free) · test:visual (panel-2 known-red only).

THEN: M2 BENCHMARK REVIEW closes the milestone. Checklist:
- Full A/B walk-through with the owner from approvals-hub: B1 palette
  (landed), B3 rim on/off per track (?rimLab=0 vs default), B2 moments
  (picked set vs none), B4 ?post=1 on/off + per-effect toggles.
- Owner SIGNS or DECLINES the §9 post-ban supersession: B4 default-on
  (flip postChainEnabled default + re-tune if needed + proof re-baseline)
  vs stays URL-gated. Record in PRD §9 either way.
- Owner re-rates the 7-category scorecard (targets: Post 4→7, Materials
  3→5); write PRD §7 M2 milestone notes in the M1 style (numbers, dates,
  evidence paths); re-run canonical FPS medians (median of 3, headed,
  both tracks) and re-capture race:proof at the closing commit.
- Settle any deferred picks the owner wants to batch here: CC rim
  (rim-lab.html still live), M0/M1 scorecard re-rating, ?trackVisuals=1
  default-on, A3 sharpness ack, excluded stash patches.
B3b (hero-kart PBR/PMREM) stays HARD-GATED — only on explicit owner
opt-in. Satisfy every PRD §7 M2 acceptance criterion; A/B pairs per task;
FPS medians must hold; re-capture race:proof after every approved merge.
AFTER M2 (owner-steered 2026-07-06): Phase C jumps the queue — the owner
called Comeback City's procedural skyline "cheap" and wants authored city
visuals ("truly make it look like a city"; he LOVES the road). Kick off
with a city-block variant lab (silhouettes/density/signage/window
emissives) — the lab workflow is how he likes to decide. Penguin Village
outer dressing: gambling/trading tribute props (group culture — see
session memory ordinals-community-context) + a better "THE ICE IS NICE"
gantry presentation; concepts go through a lab too.

DESIGN-CHOICE WORKFLOW (owner-agreed 2026-07-03): for parameter picks
(B1 palette values, B2 moment colors, B3 rim strength/tint, B4 vignette),
build a VARIANT LAB first — render the same scene under 5-10 candidate
value sets, assemble a captioned contact-sheet lab page, link it from
approvals-hub.html, and let the owner pick a number. Exploration happens
in the lab (no gate); only the picked winner goes through the normal
one-variable-per-change A/B + proof re-baseline pipeline. Variant
overrides ride dev-only URL params or init-script hooks — never shipped
defaults. Precedents: palette-lab.html + tmp/m2-palette-lab/
capture-palette-variants.mjs (B1 — the model to copy: telemetry
routeProgress-keyed screenshots, luma-normalized candidates, lessons
encoded as script comments), orientation-lab.html, flipbook-lab.html,
tmp/m0-trackvisuals-proof/capture-trackvisuals-ab.mjs (key screenshots on
telemetry routeProgress, not wall-clock).

HARD RULES (each has burned this project before):
- Never blanket `gltf-transform optimize`; individual verbs, compression
  LAST. Every GLB load goes through createGameGltfLoader (grep
  "new GLTFLoader(" src/ must return exactly 1 hit, in gltfLoader.js).
- Any new/re-exported mesh passes the orientation lab before promotion.
- One variable per change; before/after captures; FPS floor 45 desktop /
  30 mobile on PRD §4.2 reference hardware (this Mac mini M4 IS the
  desktop reference); binary assets land committed same-day WITH manifest
  entries (CI enforces).
- Legacy ArcadeRace3D stays working (Amendment 10 suites when touching
  shared code — src/game/race/** is shared; do NOT edit createRaceScene's
  configureRaceRenderer, and keep RACE_RENDER_SCALE_LEGACY at 0.58).
- comebackCityVisuals.jsx must NEVER be statically imported by shipped
  code — production-safe tokens/components live in
  comebackCityVisualTokens.jsx (A4 split; keeps 4.5 MiB of QA PNGs out
  of dist).
- No Nintendo/Mario Kart trade dress. Owner-generated art only. Bakes
  ship WebP (KTX2 pending). Never read .env files. Deploy only per repo
  deploy rules (Showcasedesigns account; kart game = its own Pages
  project).

OWNER GATES PENDING (do not self-sign. Bookkeeping rule, per the PRD §9
footnote: §9 tracks STANDING/STRATEGIC gates only; per-task A/B gates
live in each task's Owner-gate field in the execution plan and are
settled at that task's review, NOT as §9 rows. SETTLED 2026-07-06: B1
palette pick = V8; B4 parity + vignette = approved, vignette ON in-chain):
- B3 rim: PV SETTLED 2026-07-06 (V6 "ice white" landed, ships ON);
  Comeback City pick still OPEN (owner chose to keep CC rim-off for now —
  rim-lab.html stays live for it). B2 moment values (per-task gate,
  upcoming).
- M0/M1 scorecard re-rating from approvals-hub captures.
- ?trackVisuals=1 default-on (A/B pairs already in approvals-hub).
- A3 sharpness pair ack (0.58 vs 0.85, committed).
- E1 face-art format ack (docs/KART_FACE_ART_INTAKE.md §7).
- The two excluded stash patches (audio silencing / scenery density).
- H0 generated-art amendment; B3b opt-in; B4 post-chain supersession
  (signs at M2 benchmark review).
- Expression sheets: owner delivering 5 PNGs to
  "3d generations:character sheets/<key>-expressions.png"
  (keys: crrt-bunny, tclow, seth-penguin, mizzle, layer23). Checked
  2026-07-06: the folder exists with June source art (GLBs, mood boards,
  kart PNGs) but NO *-expressions.png yet — still pending.

WORKING PROTOCOL per task: follow the execution plan Steps; satisfy every
Acceptance criterion; run the full Verification list; store capture
evidence and link it from approvals-hub.html (view via `npx vite`);
commit with the task ID in the message; push; stop only at a declared
owner gate. At milestone end: captures + owner scorecard re-rating,
gates green, proofs re-captured, work committed and pushed.
```

---

## Not in the prompt but useful to know

- **Evidence trails:** canonical FPS runs live in `.agent/runs/kart-racer-production-readiness/evidence/phase5-capture-*`; A/B captures in `tmp/m0-trackvisuals-proof/` and `tmp/m1-render-scale/`; B1 palette-lab tiles + capture scripts in `tmp/m2-palette-lab/` (contact sheet: `palette-lab.html`); B3 rim-lab tiles + capture/probe scripts in `tmp/m2-rim-lab/` (contact sheet: `rim-lab.html`; the extreme-value probe images are the injection/scenery-untouched proof). The race:proof "ledger" in git is only the pointer `asset-pipeline/proof/latest-proof-run.json` — the run artifacts under `asset-pipeline/proof/runs/` are gitignored and local-only.
- **Session memory** (Claude Code auto-memory) mirrors this doc — `kart-project-state.md` is the READ-FIRST memory entry and was updated 2026-07-06.
- **The owner reviews at** `http://localhost:5173/approvals-hub.html` (dev server usually already running).
- Owner-call bookkeeping: the PRD's decision log (§9) records STANDING/STRATEGIC gates; per-task A/B gates (like the B1 palette pick) are tracked in the execution plan's per-task Owner-gate fields — the §9 footnote scopes the table this way on purpose. Update those docs, not chat history.
