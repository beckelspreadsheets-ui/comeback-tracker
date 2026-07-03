> ⚠️ **DEFERRED — DO NOT EXECUTE NOW.** Phase 4 audio has been postponed to the end of the project by user decision. This handoff is archived until audio work is revisited. See `docs/PENGUIN_KART_AUDIO_DEFERRED.md` for the preserved asset brief.

> Handoff prompt: paste this verbatim to the next agent to resume Phase 4 work (when audio is revisited).

# Penguin Kart VFX — Phase 4 Handoff Prompt

You are resuming work on the Penguin Kart VFX track. **Phase 3 is complete.** Read this prompt and the linked context reset first, then confirm scope and blockers before writing any code.

## Step 0 — Read first

1. `docs/PENGUIN_KART_VFX_PHASE3_CONTEXT_RESET.md` — current branch, commits, changed files, uncommitted state, screenshots, no-touch files.
2. `docs/PENGUIN_KART_VFX_PHASED_GAMEPLAN.md` — original phased plan. Phase 4 is **Audio plan and wiring**.
3. `docs/CODEX_PENGUIN_KART_VFX_RESEARCH_PROMPT.md` — if present, check the Phase 4 audio plan section.

## Step 1 — Confirm scope and blockers

Phase 4 per the approved gameplan is **audio plan and wiring**. Before writing code, verify:

- [ ] Are original audio assets available? (engine loop, drift, boost, item pickup, item use, ambient, UI, etc.)
- [ ] Has the user explicitly approved the exact Phase 4 scope and asset list?
- [ ] Are there new no-touch files or updated constraints from the user?

**If original audio assets are not available, stop and report the blocker.** Do not synthesize, import placeholder packs, or wire audio without assets.

## Step 2 — If unblocked, plan

If assets are available and the user has approved Phase 4 audio, create a focused Phase 4 plan file at `docs/PENGUIN_KART_VFX_PHASE4_PLAN.md` that includes:

- Asset inventory (file names, formats, intended use).
- Which events trigger which sounds (engine pitch from speed, drift start/hold/release, boost, mini-turbo, item pickup/use, collisions, lap/finish UI).
- Where audio hooks will be added (keep changes minimal; prefer `ComebackCityThreeKartRace.jsx` update loop and existing event sites).
- No-touch file compliance check.
- Screenshot or audio-meter verification approach.
- One-meaningful-task-per-commit breakdown.

Get explicit user approval on the plan before executing.

## Step 3 — Execute with discipline

- Branch: `codex/release-v1-comebacktracker-kart-racer`
- Hard no-touch files from Phase 3 still apply: `kartTuning.js`, `kartPhysics.js`, `surfacePhysics.js`, `airTricks.js`, `heldItems.js`, `rivalRacers.js`, `raceBreakables.js`, `raceCrossers.js`.
- Do not commit pre-existing user changes listed in the Phase 3 context reset.
- One meaningful audio task per commit.
- Verify each task before moving on.

## Step 4 — Stop criteria

- Stop if an audio change requires touching gameplay/physics/item/rival code.
- Stop if a screenshot or audio check looks/sounds wrong.
- Stop if the user wants to change scope.
- Do not proceed to Phase 5 without explicit user approval.

## Current state at handoff

- Phase 3 commits: `0694621` → `fc6bbeb2`.
- Latest commit: `fc6bbeb2 Theme item box as winter crate`.
- Phase 3 screenshots: `tmp/penguin-vfx-phase3/task{1-6}-race.png`.
- Pre-existing user changes remain uncommitted (see context reset for list).

Ask the user for the audio asset package before doing anything else.
