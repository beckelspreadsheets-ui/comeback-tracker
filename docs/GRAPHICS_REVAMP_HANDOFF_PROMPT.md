# Graphics Revamp — Fresh-Context Handoff Prompt

**Updated 2026-07-06** (supersedes the 2026-07-03 version: M2 is now IN PROGRESS — B1 part 1 (palette-driven atmosphere wiring + Penguin Village palette lab) is COMPLETE, code-audited at HEAD; B1 part 2 is blocked on the owner's palette pick. Adds the B1 state block, the lab-lesson constraints, and corrected owner-gate bookkeeping: PRD §9 is standing/strategic gates only — per-task gates live in the execution plan).

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

STATE YOU INHERIT (verified 2026-07-06 by code audit at HEAD; commits
a9b7c202..1ab5e660):
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
  GREEN (test:bundle, both presets): total 12.30 MiB vs 15.0 threshold.
  PUBLISHED HEADROOM (PRD §8): Phase C gets 2.14 MiB of WebP bake textures
  (images gate) within 2.70 MiB total raw / 1237 KiB gzip; B4's pmndrs
  chain gets ~200 KiB gzip JS. Telemetry now exposes frameElapsedMs/
  frameWorkMs/rendererStats/bakedBuildings/trackVisualsEnabled/
  proofCameraMode; race:proof (capture+compare) PASSES at HEAD.
- M2 IN PROGRESS — B1 PART 1 COMPLETE (f2347c22 wiring + 1ab5e660 lab
  cleanup; every claim below re-verified against the code at HEAD).
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
  from approvals-hub.html as "PICK NEEDED"; tiles, debug isolates, and
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
  B1 REMAINING = PART 2, BLOCKED ON OWNER: owner picks a lab number (or
  two to blend) from palette-lab.html; the winner lands as ADDITIVE keys
  in src/game/race/tracks/penguinVillage.js palette (after `bridge`,
  ~L120); then satisfy B1's two open acceptance boxes (Penguin Village
  haze reads icy blue, not purple, at progress ~0.3; owner has seen the
  diff) and run its verification list: test:track-visuals,
  test:kart-playable, build + race:proof capture/compare — Comeback City
  must stay ZERO-diff — plus the two-track A/B capture. Optional finalist
  step (promised in the capture-script header, NOT yet implemented): a
  routeProgress 0.84 return-bend tile for the two finalists' warm/cool
  balance.
- KNOWN-RED, PRE-EXISTING, DOCUMENTED (do not chase; do not silently
  accept new failures on top): (a) test:race:browser fails ONLY on
  blocker #10 (no-minimap 0.444<0.45, legacy-route harness) — run it with
  RACE_VISUAL_READY_TIMEOUT_MS=75000 or its 25s waits flake under load;
  (b) test:visual panel-2 waits for the LEGACY raceHud section on /#race —
  same family, ledgered in docs/race-v1-blocker-backlog.md #10.
- NEVER run two vite-spawning suites/captures concurrently: the dev-server
  dep-cache ping-pongs and CPU contention produces phantom knife-edge
  failures (kart-height, readiness timeouts). One at a time.

YOUR TASK NOW: Milestone M2 (IN PROGRESS) — the pure-code cinematic pass.
Position: B1 part 1 is DONE (state block above); B1 part 2 is BLOCKED on
the owner's palette-lab pick. What you can start WITHOUT the owner:
- B4 (pmndrs post chain) — fully unblocked: no B1 dependency, and its
  Amendment-6 deps (A1/A2/A3) are all complete. Ships behind ?post=1
  until the owner signs the ban supersession at the M2 benchmark review.
  Run test:race:browser (extended timeout) per Amendment 10.
- B3 (toon rim helper) — mechanically startable: its B1 dependency is the
  rimLightColor key plumbing, which landed in part 1 (Comeback City uses
  the '#4fd8ff' fallback either way). But its two-track A/B wants the
  Penguin Village rim value landed to show different tints, so prefer B4
  first and B3 after the palette pick.
- B2 (palette moments) — needs FULL B1 (the landed Penguin Village values
  are its lerp endpoints) + B4. Do not start early.
B3b is HARD-GATED — do not start without explicit owner opt-in. Satisfy
every PRD §7 M2 acceptance criterion; A/B pairs per task; FPS medians must
hold (re-run the canonical protocol); re-capture race:proof after every
approved merge.

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
footnote: §9 tracks STANDING/STRATEGIC gates only; per-task A/B gates —
like the B1 palette pick — live in each task's Owner-gate field in the
execution plan and are settled at that task's review, NOT as §9 rows):
- B1 Penguin Village palette pick (per-task gate) — pick a number from
  palette-lab.html via approvals-hub (reply "V<n>", or two numbers to
  blend). Unblocks B1 part 2, which unblocks B2 and de-risks B3's A/B.
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

- **Evidence trails:** canonical FPS runs live in `.agent/runs/kart-racer-production-readiness/evidence/phase5-capture-*`; A/B captures in `tmp/m0-trackvisuals-proof/` and `tmp/m1-render-scale/`; B1 palette-lab tiles + capture scripts in `tmp/m2-palette-lab/` (contact sheet: `palette-lab.html`). The race:proof "ledger" in git is only the pointer `asset-pipeline/proof/latest-proof-run.json` — the run artifacts under `asset-pipeline/proof/runs/` are gitignored and local-only.
- **Session memory** (Claude Code auto-memory) mirrors this doc — `kart-project-state.md` is the READ-FIRST memory entry and was updated 2026-07-06.
- **The owner reviews at** `http://localhost:5173/approvals-hub.html` (dev server usually already running).
- Owner-call bookkeeping: the PRD's decision log (§9) records STANDING/STRATEGIC gates; per-task A/B gates (like the B1 palette pick) are tracked in the execution plan's per-task Owner-gate fields — the §9 footnote scopes the table this way on purpose. Update those docs, not chat history.
