# Graphics Revamp — Fresh-Context Handoff Prompt

**Updated 2026-07-02** (supersedes the 2026-07-01 version: adds the PRD as entry point, the M0 stabilization milestone, the quarantine stash, and the resolved owner decisions).

**Purpose:** paste the block below into a new agent session (Claude Code, Codex, or any coding agent) to continue the graphics revamp with zero context loss. It is file-anchored — everything it references is in the repo — so it works for an agent with no memory of prior sessions.

---

## The prompt (copy everything in the block)

```text
You are working in the comeback-tracker repo on the Penguin Kart racing game
(React + Vite PWA; Three.js r184 game in src/game/; shipped runtime =
src/game/ComebackCityThreeKartRace.jsx). Branch:
codex/release-v1-comebacktracker-kart-racer.

MISSION: execute the graphics revamp that takes the game to
"could-ship-on-Nintendo-Switch" visual quality. Engine decision is FINAL:
Three.js + Blender bake pipeline. Do not evaluate or propose Unreal/Godot/
Unity/WebGPU migrations.

READ IN THIS ORDER (do not start work before 1 and 2):
1. docs/PENGUIN_KART_GRAPHICS_V2_PRD.md — THE master doc: vision, milestones
   M0-M5, requirement IDs, success metrics, owner decision log, risks.
2. docs/PENGUIN_KART_GRAPHICS_REVAMP_EXECUTION_PLAN.md — file-level tasks
   (IDs A1..E6 referenced by the PRD). Read its "Binding cross-phase
   amendments" and "Canonical measurement protocol" sections FIRST; they
   override task text. C0 is retired; D0 is descoped (annotated inline).
3. When a task touches its domain: docs/FLIPBOOK_BILLBOARD_SPEC.md (billboards),
   docs/HIGGSFIELD_MCP_INTEGRATION_PLAN.md (generated art; H0 gates it),
   docs/CHARACTER_EXPRESSION_SHEET_BRIEF.md (Phase E art intake).

STATE YOU INHERIT (verified 2026-07-02):
- Working tree is at the known-good baseline: penguins render, baked
  buildings restored, test:race green.
- git stash "quarantine 2026-07-02" holds two mixed WIP streams: meshopt-
  compressed avatar GLBs (GOOD, -11MB, but require a MeshoptDecoder-wired
  loader) and a half-finished trackVisualSchema road/banking experiment.
  NEVER `git stash pop` it wholesale — re-land per PRD P0-2/P0-3a/P0-3b.
- Load-bearing files are UNCOMMITTED and must be committed first (PRD P0-1
  has the authoritative list): untracked game modules (gltfLoader.js,
  raceBreakables.js, raceCrossers.js, trackVisualSchema.js, surfacePhysics.js,
  shortcutTriggers.js, src/game/audio/), the graphics docs, the lab pages,
  the asset/proof script layer (make-flipbook, capture-race-proof,
  compare-race-visuals, audit/validate-game-assets, scripts/blender/,
  scripts/lib/), AND modified tracked files: package.json/package-lock.json
  (all assets:*/race:proof:* npm scripts live only in the working tree!) and
  orientation-lab.html (meshopt fix).
- The committed FPS baseline (22.7 sustained) is VOID (measured the legacy
  stack, headless). The bundle report is stale. Re-baseline via A2/A4 before
  gating anything on either.

HARD RULES (each has burned this project before):
- Never blanket `gltf-transform optimize`; individual verbs only,
  compression LAST.
- Every GLB load goes through createGameGltfLoader (it sets MeshoptDecoder);
  never instantiate a raw GLTFLoader.
- Any new/re-exported mesh passes the orientation lab before promotion.
- One variable per change; before/after captures; FPS floor 45 desktop /
  30 mobile; re-capture race:proof baselines after every approved merge.
- Binary asset changes land committed same-day WITH their manifest entries —
  never left sitting in the working tree (cause of the 2026-07-02 incident).
- Legacy ArcadeRace3D stack stays working: run test:race:browser when
  touching shared code.
- No Nintendo/Mario Kart trade dress. Owner-generated art only, manifest
  provenance + similarity review per asset. Bakes ship WebP (KTX2 pending).
- Never read .env files. Deploy only per repo deploy rules (Showcasedesigns
  account; kart game is its own Pages project).

DECISIONS ALREADY MADE (do not re-ask):
- Unreal: rejected. Blender automation: APPROVED 2026-07-01.
- Baked-GLB deletion: was accidental; already restored.
- KTX2: pending → use WebP. H0 generated-art amendment: pending → Higgsfield
  tasks blocked until owner signs; everything else proceeds.
- Owner is producing 5 expression sheets → land at
  "3d generations:character sheets/<key>-expressions.png"
  (keys: crrt-bunny, tclow, seth-penguin, mizzle, layer23).

YOUR TASK NOW: [OWNER — replace, e.g. "Execute milestone M0 (P0-1 through
P0-5) in order, then M1 (A2, A3, A4)" or a single ID like "Execute P0-2"].

WORKING PROTOCOL per task: follow the task's Steps; satisfy every Acceptance
criterion; run its full Verification list; save capture evidence (view via
`npx vite` → /approvals-hub.html); commit with the task ID in the message;
stop only at a declared owner_gate. At milestone end: captures + owner
scorecard re-rating per PRD §8, gates green, proofs re-captured, work
committed. Do not start a milestone while the previous one's gates are red.
```

---

## Notes for the owner

- **Two `[OWNER]`-free decisions are already baked in** — this version needs only the task assignment filled in. Default: `Execute milestone M0, then M1`.
- Works for any agent, but for Claude Code specifically, project memory will also auto-recall this state — the prompt deliberately doesn't depend on it.
- If you parallelize agents, one per milestone-workstream max, and every agent must read the execution plan amendments — that's where collision-avoidance lives (single shader-injection helper, `assets:bake` ownership, bundle-truth ownership, stash re-landing order).
- The PRD's decision log (§9) is the single place to record your pending calls (KTX2, H0 amendment, trackVisualSchema default-on, post-ban supersession) — update it there, not in chat history.
