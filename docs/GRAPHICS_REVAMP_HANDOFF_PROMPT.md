# Graphics Revamp — Fresh-Context Handoff Prompt

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
2500→4000 (minFps 8 UNCHANGED). race:proof green pointer =
2026-07-11T04-22-36 (at 5ac085d0). KNOWN DEBT: the proof re-run at
879021dc (2-coin rows, render strictly lighter) is pending an IDLE
machine — the owner's VM/Codex sessions held load1 at 6-11 and headless
SwiftShader fails on load artifacts (minFps + dt-dilated route
progress) at draw calls identical to the green run; capture+compare+
commit the pointer next idle window. **ONE ITEM FOR THE OWNER: sign
off the fpsWarmupMs 2500→4000 gatesNote (W0 pattern; queued in
approvals-hub top).**

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

**Updated 2026-07-10 (eighth update — the "post-switchover, coin gate + crosser" version).** Supersedes the seventh: W0/W1/W2 and W3 round 1 are ALL SHIPPED AND LIVE (see the checkpoint block above); the prompt below is the CURRENT handover.

**Purpose:** paste the block below into a new agent session to continue the graphics revamp with zero context loss. It is file-anchored — everything it references is committed — so it works for an agent with no memory of prior sessions.

---

## The prompt (copy everything in the block)

```text
You are working in the comeback-tracker repo on the Penguin Kart racing
game (React + Vite PWA; Three.js r184 game in src/game/; shipped runtime
= src/game/ComebackCityThreeKartRace.jsx). Branch:
codex/release-v1-comebacktracker-kart-racer (HEAD == origin). Live demo:
https://comeback-city-kart.pages.dev/#race — everything through git tag
`pre-fable-revert-point` is deployed and verified; that tag (+ its
GitHub prerelease) is the owner's revert point. Do not force-push over
it.

READ IN THIS ORDER before working:
1. docs/GRAPHICS_REVAMP_HANDOFF_PROMPT.md — the FABLE SWITCHOVER
   CHECKPOINT block at the top is the live truth (what's shipped, the
   one red gate, open owner decisions).
2. docs/PENGUIN_KART_CONTENT_ROADMAP_2026-07.md — the work queue (W1/W0/
   W2 done; W3 in progress; W4/W5/W6/W7 specced) + STANDING RULES at the
   bottom (no-generic-penguins is the newest and is absolute).
3. docs/PENGUIN_KART_GRAPHICS_V2_PRD.md §8/§9 for budgets + owner gates
   when a task touches them.

STATE YOU INHERIT (2026-07-10):
- LIVE + verified: miami mode default both tracks; W2 clarity set
  (held-item chip, item guide via the race-setup button, per-track
  bitcoin item boxes, boost pad V1, rims CC V1 / PV V3); W3 round-1 PV
  tribute props (₿ monument, runestone, odds board, token clusters,
  empty casino corner). Owner approvals for all of it are recorded in
  asset-manifest records + approvals-hub.html.
- LIVE (deployed 879021dc, 2026-07-11): the collectible bitcoin COIN
  system — src/game/race/raceCoins.js (pure; validators in test:race),
  runtime wiring + HUD ₿ counter, ONE InstancedMesh field. Rows = TWO
  coins at ±laneSpread (owner: "only 2 in a row not 3"), center line
  collects nothing. fpsWarmupMs 2500→4000 gatesNote PENDING owner
  sign-off; proof pointer green at 2026-07-11T04-22-36; a re-proof at
  879021dc awaits an idle machine (headless fails under the owner's
  VM/Codex load — load artifact, documented in the commit).
- Bundle: 13.482 MiB raw / 8488.79 KiB gz vs 15.0/8500 thresholds —
  11 KiB gzip spare. ADD NO BUNDLED BYTES until the owner signs the
  queued 8500→9500 threshold proposal (approvals-hub top). The coin
  system added zero bytes (it clones the shipped CC coin template).

YOUR TASK QUEUE, IN ORDER:
1. COIN LEFTOVERS: (a) land the green race:proof pointer for 879021dc —
   capture+compare on an IDLE machine (load1 < 3; tmp/live-coin-probe.mjs
   re-verifies live any time), commit the pointer; (b) collect the
   owner's sign-off on the fpsWarmupMs 2500→4000 gatesNote (queued in
   approvals-hub top); (c) owner feedback from his phone test may queue
   coin tuning (spread/count/bonus all live in raceCoins.js COIN_FEEL).
2. OUTPLAYASIANS CROSSER (likeness APPROVED 2026-07-10): the dieted
   mesh is tmp/w3-pv-props/outplayasians-diet.glb. Orientation lab
   FIRST (orientation-lab.html — never guess facing), then wire him as
   the PV finish-line SLOW crosser via the raceCrossers template
   (src/game/race/raceCrossers.js; penguin-march at progress 0.82 is
   the model) near progress ~0.0, partial-width, tuned so a line
   always exists; autoplay dodge must handle him (kart-playable both
   tracks green is the gate). Bundle: his GLB is NEW BYTES — needs the
   threshold decision first OR ship him runtime-only within the
   remaining 11 KiB (he won't fit; so the threshold decision
   realistically gates this. ASK THE OWNER: "raise the bundle budget"
   is the queued proposal). Roster seat = separate owner call.
3. W3 REMAINDER (each through a lab + owner pick): ICE IS NICE gantry
   revamp (3 directions: 3D ice-letter sculpture / flipbook billboard
   per docs/FLIPBOOK_BILLBOARD_SPEC.md / glacier marquee — the slogan
   TEXT is an owner brand element, composite real lettering, never
   generator gibberish) · start-line haunt figures (Lifo.jpg via cheap
   image-to-3D is allowed, he is NOT ordinal; owner wants "a few like
   that") · the ordinal-posing round for the empty casino tables (ASK
   the owner for JPEGs from his 100-ordinal collection; each upload =
   a per-asset H0 §2.2 opt-in, precedent: outplayasians).
4. THEN W4 roster / W5 item renders (both blocked on the bundle
   threshold decision + owner deliveries: outplayasians was solved via
   Meshy; ak47/denomad/georgefx need the owner-ChatGPT sheet flow;
   lifoladen needs owner Tripo Studio) and W6/W7 per the roadmap.

HARD RULES (each has burned this project):
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
- Deploy = owner-triggered. Command in the cloudflare memory:
  CLOUDFLARE_ACCOUNT_ID=9f01a1b31a298b112c22c3e00fe70a45 npx wrangler
  pages deploy dist --project-name=comeback-city-kart --branch=main
  --commit-dirty=true. ALWAYS run node
  tmp/w0-ship/verify-live-deploy.mjs after (both tracks + mounts);
  the pages.dev alias serves stale for ~30-60s — re-probe before
  diagnosing. CSP gotchas (both live-only): connect-src needs blob:,
  script-src needs 'wasm-unsafe-eval' (meshopt).
- Never run two vite-spawning suites/captures concurrently. Headless
  FPS is never quotable — headed phase5 is the only FPS truth.
- One variable per change; battery before every ship: test:race ·
  kart-playable both tracks · test:bundle · assets:check · race:proof
  (re-baseline only when visuals change by design) · phase5 headed
  when perf could move.
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
- **Session memory** (Claude Code auto-memory) mirrors this doc — `kart-project-state.md` is the READ-FIRST memory entry and was updated 2026-07-06.
- **The owner reviews at** `http://localhost:5173/approvals-hub.html` (dev server usually already running).
- Owner-call bookkeeping: the PRD's decision log (§9) records STANDING/STRATEGIC gates; per-task A/B gates (like the B1 palette pick) are tracked in the execution plan's per-task Owner-gate fields — the §9 footnote scopes the table this way on purpose. Update those docs, not chat history.
