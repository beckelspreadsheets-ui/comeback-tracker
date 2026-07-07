# Graphics Revamp — Fresh-Context Handoff Prompt

**Updated 2026-07-07 EOD (seventh update — the "SHIP MIAMI MODE, then item clarity" version)** (supersedes the sixth: the entire visual overhaul is DONE AND OWNER-APPROVED behind ?skyLab=1 — painted sunset backdrops on BOTH tracks (CC sunset boulevard / PV arctic-sunset glowing shelf), old boxy skyline+facades hidden, and the owner-approved Miami-vice 3D set (deco hotel, condo tower, corner arcade, palm clusters, lifeguard towers, retro diner — "perfect vibes") mounted across 20 trackside slots. Mesh pipeline settled by bake-off: tripo_3d text-to-3D via Higgsfield MCP (~$0.22/asset, zero owner minutes) + diet-mesh.sh; heroes stay owner-run Tripo Studio. All evidence/provenance in tmp/m3-sky-lab/ + tmp/m3-city-lab/, in-game shots on city-lab.html. NEXT SESSION: JOB 1 = promotion/ship (checklist below — mind the BUNDLE MATH, ~7.6MB of new assets vs ~2.5MiB headroom), JOB 2 = item/track clarity revamp (boost pads, item audit incl. fish-bone arm-delay suspect, item box variety, held-item HUD icon), then PV 3D additions, then Phase C bakes.)

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
- M2 IN PROGRESS — construction DONE: B1 COMPLETE, B4 COMPLETE (gated),
  B3 SETTLED for PV / CC pick open, B2 BUILT (owner pick pending). Ledger:
  B2 (built + verified 2026-07-06, fourth session; SHIPPED DEFAULT IS
  MOMENT-LESS on every track until the owner picks a set — both tracks
  pixel-unchanged by construction, race:proof pass errors=0 with NO
  baseline regeneration): src/game/race/paletteMoments.js is PURE (no
  THREE; node-importable) — resolveMoments(palette, baseOverrides) fills
  every optional field from the palette's own base (PV = the landed V8
  values; bare palettes = the CC shipped hardcodes), decodes hex to sRGB
  triples once, clamps fog.far <= 840, sorts by progress;
  sampleMoments(resolved, progress, out) does wrap-aware smoothstep
  segment lerp into a preallocated scratch (zero per-frame allocations;
  approaching the first moment from the wrap side converges exactly — no
  finish-line pop, proven in node tests). Data shape: additive
  palette.moments = [{ progress, fog{color,near,far}, hemi{sky,ground},
  sun{color,intensity}, rim, rimTint, bloom }]. CHANNEL SEMANTICS that
  matter: rim drives the rimLight DirectionalLight; rimTint drives
  TOON_RIM_SHARED_TINT and its BASE is the ACTIVE hero-rim tint (owner's
  V6 "ice white", lab override included) so candidates that omit rimTint
  can never repaint the picked rim; bloom is a chain-agnostic MULTIPLIER
  (applyPaletteMoments branches on engine.postChainEnabled:
  bloomEffect.intensity vs bloomPass.strength; ?post=1&postBloom=0 leaves
  both refs null -> bloom lerp skipped); hemi INTENSITY is deliberately
  not a moment channel (white-out rule — hue only). Wiring: createScene
  precompiles engine.paletteMoments = { bloomBase, resolved, sample } (or
  null) right after the composer block; applyPaletteMoments(engine,
  race.progress) runs after the sun-follow block, before composer.render;
  colors land via setRGB(..., THREE.SRGBColorSpace) which matches new
  Color(hex) under r184 default color management. Dev hook (rimLab
  pattern): ?momentsLab=1 + window.__momentsLabOverrides REPLACES
  palette.moments; ?momentsLab=0 forces off (the control that stays valid
  after a pick lands). Telemetry gained paletteMomentsEnabled. Tests:
  validatePaletteMomentHelpers in scripts/race-content-playtest.mjs (base
  fill, sort, fog-far clamp, boundary exactness, smoothstep easing,
  wrap-seam convergence, zero-alloc reuse, single-moment constancy). Lab
  live: moments-lab.html (regen: node
  tmp/m2-moments-lab/capture-moments-variants.mjs, PORT 5315) — V0
  control + 3 candidate sets (v1-subtle / v2-journey / v3-dramatic), each
  = 4 lap moments keyed on telemetry routeProgress 0.05/0.30/0.55/0.84
  PLUS a seam pair (0.96 / 0.06 next lap — the two tiles must read
  identical or the set fails); hemi candidates luma-normalized at capture
  (matchLuma from the palette lab) and captions print the NORMALIZED
  literals — the pick lands those verbatim as penguinVillage.js
  palette.moments + proof recapture in that commit. Evidence:
  tmp/m2-moments-lab/capture-telemetry.json; wrap-seam probe
  (probe-wrap-seam.mjs) recorded control + v2-journey seam-crossing webms
  and A/B'd frameWorkMs medians under identical screencast overhead —
  1.30ms control vs 1.46ms moments-on (lerps are free; NOTE playwright
  video recording inflates ABSOLUTE frameWorkMs ~30x, only the A/B delta
  is meaningful — a first probe draft false-alarmed on a 5ms absolute
  gate). Verified at the landing commit: test:race green (incl. the new
  validator), test:track-visuals green, test:kart-playable green both
  tracks, test:race-proof pass errors=0, phase5 headed medians CC 144.02
  (worst 143.27) / PV 144.02 (worst 143.47), test:visual fails ONLY on
  ledgered panel-2.
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
  STILL PENDING for M2 close: the benchmark review only (owner
  signs/declines the §9 post-ban supersession there — B4 stays URL-gated
  until then). Open picks to batch into it: B2 moment set
  (moments-lab.html) and B3's Comeback City rim (rim-lab.html) — neither
  blocks the review; shipped defaults stay moment-less / CC rim-off until
  the owner picks.
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

M2 IS CLOSED (2026-07-06 fast-close review; outcomes in the header above
and PRD §7 M2 milestone notes — B4 default-on signed, B2 no-pick/
moment-less, CC rim + scorecard re-ratings deferred).

OWNER STEER 2026-07-07 (supersedes the kickoff order below where they
conflict): "major background overhauls on both tracks ... backgrounds to
be top tier" via GENERATED ART — the owner explicitly does not believe
building-geometry variants will get there ("we tried to use those
buildings and I just dont think they are going to come out great"). H0
was SIGNED the same day (scoped: text-prompt only, no ordinal uploads —
see PRD §9) and SKY LAB ROUND 1 IS LIVE: sky-lab.html — 12 Higgsfield
soul_location candidates (3 art directions x 2 takes per track, 21:9,
provenance + seeds in tmp/m3-sky-lab/provenance.json). PENDING: owner
picks a direction per track. AFTER THE PICK: regenerate the winner as
production layers (one sky band + 2-3 silhouette strips per track,
remove_background for cutouts, WebP within the §8 2.14 MiB images
headroom — measured cost ~60-130KB per 2560px strip at q85, so the
budget is comfortable; add 'webp' to vite.config workbox globPatterns
with the FIRST runtime webp), manifest entries + owner similarity
review, then wire scene.background sky + parallax billboard rings
behind ?skyLab=1 (house hook pattern) and judge the composite in-game
before shipping + proof re-baseline. The city-block GEOMETRY lab below
is DEMOTED to mid-ground support (a silhouette row between track and
backdrop) — judged only after the backdrop layers are in. Fog rule
still applies: scene.background is fog-exempt; generated skies must
harmonize with each track's fog color.

SKY/CITY STATE AS OF 2026-07-07 EOD (supersedes older lines where they
conflict): H0 signed; sky-lab ROUND 2 shipped-behind-flag — CC = sunset
boulevard strips (cc-far/near-a defaults), PV = arctic-sunset glowing
shelf (pv-far/near-B defaults — the a-take ice row keyed out dark and
read identical to CC's towers; owner flagged it, b-takes fixed it,
verified live on his 5173 server via tmp/m3-sky-lab/probe-5173.mjs).
Behind ?skyLab=1 Comeback City ALSO hides: the old 14-box skyline row,
the opening-facade run, and the district building bodies + facade
sprites (neon portals + lowered beacons stay as gameplay cues;
buildingSwaps left empty — the bake loader no-ops and still reaches
bakedBuildings='active'; the proof gate runs flag-off regardless).
TRACKSIDE DIRECTION (owner): "miami vice vibe ... for all the side
things" — city-lab.html round 1 live (deco hotel / condo tower / corner
arcade × 2 takes, style-locked to the sunset, isolated on magenta;
concept picks pending). MESH PIPELINE (2026-07-07, OPEN QUESTION — do not treat as settled):
manual Tripo costs the owner ~20 min/item and he asked for something
quicker. Candidates: (a) Higgsfield generate_3d — Claude-drivable
end-to-end, zero owner minutes, quality UNPROVEN (first call was
permission-blocked; needs a quality A/B on one building + owner review;
plausible for background-grade meshes, heroes stay Tripo), (b) Tripo
API scripting (trusted quality, zero owner minutes, needs owner API
key), (c) batched manual Tripo handoffs (fallback). Whichever wins:
gltf-transform diet (individual verbs) + orientation lab + owner review
before any mesh mounts into the buildingSwaps slots. PROMOTION (on owner take/
concept confirmation): strips + building GLBs to real assets (hashed
filenames end the same-URL browser-cache confusion), manifest +
similarity review, longer far-band top fade, webp workbox globPattern,
retire hidden dressing for good, full battery + proof re-baseline.

THE QUEUE NOW LIVES IN docs/PENGUIN_KART_CONTENT_ROADMAP_2026-07.md
(owner-scoped 2026-07-07: W1 track-select bugfix -> W0 ship -> W2 item
clarity -> W3 Penguin Village revamp incl. ICE IS NICE + outplayasians
finish-line crosser -> W4 roster (5 karts + new penguins) -> W5 item
renders). START WITH W1: the ?track= URL param unconditionally overrides
the cup-select pick (trackKey useMemo ~:3972) — verified root cause of
the owner's "penguin village is loading the miami vice vibes" report;
fix = param seeds initial selection only. Then JOB 1 below = roadmap W0.

YOUR TASK NOW — TWO QUEUED JOBS, IN ORDER (owner 2026-07-07: "you can
ship this First"):

JOB 1: SHIP MIAMI MODE (promote ?skyLab=1 to the shipped default look).
Everything is owner-approved and verified in-game behind the flag
(commits bdf37f0d..c358f093). Checklist:
1. BUNDLE MATH FIRST — this is the hard part. The six approved GLBs
   (tmp/m3-city-lab/*-diet.glb) total ~7.3MB + ~0.3MB sky strips, but
   test:bundle headroom is only ~2.5MiB total (15.0 threshold vs 12.458
   measured). Options to combine: re-diet textures to 512 (resize verb;
   textures dominate these GLBs), meshopt-compress (compression LAST,
   individual verbs — the avatar pipeline precedent), drop duplicate
   mounts sharing one template (already shared via cache — file count is
   what matters: 6 files), and/or exclude dressing GLBs from the workbox
   precache (offline fallback = props absent; mountMiamiAsset already
   no-ops on load failure) — but test:bundle counts dist bytes
   regardless, so if 512+meshopt still busts the threshold, present the
   owner a threshold re-baseline decision (A4-style, §8) — do NOT
   silently raise it.
2. Move strips (cc-far-a, cc-near-a, pv-far-b, pv-near-b .webp) +
   6 GLBs into src/assets/game/generated/ (or models/miami/), switch
   MIAMI_ASSETS + SKY_LAB_STRIPS to hashed ES-import URLs, add 'webp'
   to vite.config workbox globPatterns (FIRST runtime webp — M3
   acceptance note), asset-manifest.json entries (six fields, source =
   Higgsfield tripo_3d/soul_location + jobId + date + prompt authorship
   — all jobIds in tmp/m3-city-lab/provenance.json and
   tmp/m3-sky-lab/provenance.json), SHA-256 fingerprints, assets:check
   green. Owner similarity review: he has visually approved every asset
   in the labs — record that as the review with dates/quotes.
3. Regenerate corner-arcade once (5cr) with "purely abstract geometric
   neon, zigzags and circles only" — its current neon squiggles read
   letter-like (no-text rule); re-diet, swap file.
4. Lengthen the far-band top fade (fade_frac 0.16 → ~0.35 in the strip
   processing — regenerate from CDN originals, PIL steps in the sky-lab
   capture script comments) — the hard band at frame top was the one
   visible seam.
5. Flip defaults: skyLab config default ON (miami mode + backdrops),
   ?skyLab=0 as escape hatch; camera.far 1800 becomes shipped; DELETE
   the old skyline row / facade run / boxy district bodies + facade
   sprites for good; retire the baked-buildings.glb loader + its
   kart-playable bakedBuildings==='active' assertion DELIBERATELY in
   the same commit (update the proof test — the gate protected the old
   bakes; buildings no longer come from public/baked-buildings.glb).
   KEEP PV dressing + statues untouched.
6. Battery: test:race · test:kart-playable both tracks · test:bundle ·
   race:proof RE-BASELINE (visuals change by design — capture becomes
   the new reference; check drawCalls/triangles vs the 650/900k proof
   gates — ~20 Miami rigs ≈ +600k tris, may need the harder diet or
   gate re-baseline with owner note) · phase5 headed both tracks
   (144 floor) · deploy is owner-triggered per repo deploy rules.

JOB 2 (after ship): ITEM/TRACK CLARITY REVAMP (owner feedback verbatim:
"The boost aren't very clear. It's hard to tell and sometimes the fish
doesn't spin you out so I feel like we just need to re-look over all the
items. Make sure they work and actually add in a couple different item
boxes and way for when you pick up an item you know what it is maybe a
little icon underneath near the item throw"):
- Boost pads: visual clarity pass (bigger/brighter/animated chevrons —
  lab it: 3-4 pad treatments, in-game A/B tiles).
- Item audit: pure-node checks that EVERY item in heldItems.js applies
  its effect (extend race-content-playtest validators). Fish-bone
  no-spin: check the 0.3s ARM DELAY first (added with kart-contact,
  6a016533) — point-blank hits inside the window are likely the cause;
  decide feel fix with owner (shorter arm? visual armed-state?).
- Item box variety: 2-3 new box designs (tripo_3d pipeline, cheap).
- Held-item HUD icon near the throw button (mobile + desktop) — ties
  into H5 (generated ITEM_ICON_URLS replacing the lucide ternary at the
  HUD; icons are a similarity trap — owner review per icon).
- THEN: Penguin Village gets the same 3D-render revamp + additions
  (owner: "same revamps with 3-D renders and add some things to
  pengui"), and items likely get 3D renders too.

AFTER THOSE: PHASE C — this is the milestone the owner is waiting on
("we are not improving majorly" — the answer is baked lighting + authored
city visuals, not more parameter picks). Owner-steered kickoff order:
1. CITY-BLOCK VARIANT LAB first (the owner decides through labs): candidate
   Comeback City block treatments — silhouettes/density/signage/window
   emissives — as capturable variants; he called the procedural skyline
   "cheap" and wants it to "truly make it look like a city" (he LOVES the
   road — do not touch road treatment). Copy the moments-lab capture
   pattern (PORT 531x — next free is 5316; telemetry routeProgress-keyed
   shots, fail-loud gates, contact sheet at repo root + approvals-hub
   entry). SCOUTED ANCHORS (2026-07-06, verbatim-verified — the lab's
   levers, all in src/game/ComebackCityThreeKartRace.jsx):
   - THE "CHEAP" SKYLINE IS :2062-2084, inside the sceneryAnchors loop
     (kind === 'skyline'): 14 flat untextured boxes in ONE straight row —
     width 16+(i%3)*7, height 28+(i%5)*10, depth fixed 18, x-spacing
     fixed 39, base '#1b2342', emissive alternating '#38d7ff'/'#b14fd8'
     at 0.3/0.12, NO windows, NO z variation, 14 separate meshes (no
     instancing). anchor.color and anchor.d are read but UNUSED; 'bridge'
     and 'roundabout' anchor kinds are silently ignored. This loop is the
     lab's primary target.
   - Lab lever ideas grounded in what exists: layered rows with z-offset
     (parallax depth), silhouette variety (per-index setbacks, rooftop
     caps, width/height jitter), density (count/spacing/gaps), INSTANCED
     window quads (InstancedMesh = 1 draw call in
     estimateSceneRenderStats :3540-3580 — the excluded legacy patch
     tmp/m0-trackvisuals-proof/excluded-createRaceScenery-look-perf.patch
     has the frustum-culling + window-density technique to transplant,
     NOT apply, it patches the legacy file), emissive-window cadence,
     rooftop neon sign bars (the opening facades' accent-bar pattern
     :1890-1896). NO text billboards exist in the V2 runtime (only legacy
     has createBillboardText) — canvas-texture signage would be new.
   - DO NOT touch: the 10 buildingSwaps buildings (5 opening facades
     :1826-1908 + 5 district anchors :1910-2005) — they are the baked-GLB
     swap targets and kart-playable FAILS unless telemetry.bakedBuildings
     reaches 'active'; the skyline row is NOT in buildingSwaps, so the
     lab can rebuild it freely without touching the proof gate. Roadside
     scatter (24 props + 7 tire stacks :2007-2060) is separate dressing —
     leave it out of round 1.
   - Perf guard: CC currently ~480 draw calls vs the 650 race-proof gate;
     skyline variants must use InstancedMesh for repeated geometry
     (windows especially) and stay under the gate; verify with race:proof
     + phase5 headed.
   - Hook naming: follow the house pattern — ?cityLab=1 +
     window.__cityLabOverrides (init-script), ?cityLab=0 force-off,
     overrides REPLACE the skyline build parameters; shipped default
     unchanged until the owner picks.
2. C1..C8 pipeline per the execution plan (track sampler extraction →
   whole-loop bake exporter → Cycles scripts → assets:bake driver → road/
   village/buildings wiring behind flags → AO splat → guards). Read the
   C-task Files/Steps in the execution plan before writing code; Amendment
   3 (bakes never write public/ directly; promotion-only) and the WebP-not-
   KTX2 rule apply throughout. Phase C budget (PRD §8): 2.14 MiB WebP bake
   textures within 2.70 MiB raw / 1237 KiB gzip images headroom.
3. PV outer dressing concepts (gambling/trading tribute props, better "THE
   ICE IS NICE" gantry) go through a lab too — see session memory
   ordinals-community-context for why quality bar = "would the group play
   it".
Note the shipped default now renders the pmndrs post chain — captures no
longer need ?post=1, legacy comparisons need ?post=0, and any new capture
script asserting postChainEnabled should expect true unless the URL
carries post=0.

The old M2 benchmark-review checklist (kept only for the deferred items):
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
  Comeback City pick DEFERRED BY OWNER until Phase C re-dresses the city
  (rim-lab.html stays live for it). B2 moment set: SETTLED 2026-07-06 as
  NO PICK ("super hard to tell a difference") — ships moment-less; a
  future pick just lands the printed literals from moments-lab.html.
- M0/M1 scorecard re-rating from approvals-hub captures.
- ?trackVisuals=1 default-on (A/B pairs already in approvals-hub).
- A3 sharpness pair ack (0.58 vs 0.85, committed).
- E1 face-art format ack (docs/KART_FACE_ART_INTAKE.md §7).
- The two excluded stash patches (audio silencing / scenery density).
- H0 generated-art amendment; B3b opt-in. (B4 post-chain supersession:
  SIGNED 2026-07-06 — default-on shipped, see §9.)
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

- **Evidence trails:** canonical FPS runs live in `.agent/runs/kart-racer-production-readiness/evidence/phase5-capture-*`; A/B captures in `tmp/m0-trackvisuals-proof/` and `tmp/m1-render-scale/`; B1 palette-lab tiles + capture scripts in `tmp/m2-palette-lab/` (contact sheet: `palette-lab.html`); B3 rim-lab tiles + capture/probe scripts in `tmp/m2-rim-lab/` (contact sheet: `rim-lab.html`; the extreme-value probe images are the injection/scenery-untouched proof); B2 moments-lab tiles + capture/seam-probe scripts in `tmp/m2-moments-lab/` (contact sheet: `moments-lab.html`; `seam-lap-*.webm` are the frame-by-frame wrap-seam evidence, `seam-probe.json` the lerps-are-free A/B). The race:proof "ledger" in git is only the pointer `asset-pipeline/proof/latest-proof-run.json` — the run artifacts under `asset-pipeline/proof/runs/` are gitignored and local-only.
- **Session memory** (Claude Code auto-memory) mirrors this doc — `kart-project-state.md` is the READ-FIRST memory entry and was updated 2026-07-06.
- **The owner reviews at** `http://localhost:5173/approvals-hub.html` (dev server usually already running).
- Owner-call bookkeeping: the PRD's decision log (§9) records STANDING/STRATEGIC gates; per-task A/B gates (like the B1 palette pick) are tracked in the execution plan's per-task Owner-gate fields — the §9 footnote scopes the table this way on purpose. Update those docs, not chat history.
