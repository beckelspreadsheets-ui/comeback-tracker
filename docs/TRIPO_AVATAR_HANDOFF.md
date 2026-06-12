# Tripo Handoff — CRRT Bunny Avatar (and follow-up jobs)

Give this entire document to the agent walking you through Tripo. It is self-contained — no other context needed.

## Context (read first)

We are building **Comeback City Arcade Kart**, a Three.js browser kart racer. The character **CRRT Bunny** will be a static, seated 3D driver mounted in the kart's cockpit. The game integration (mounting, scaling, toon shading, shadows, camera checks) is handled afterward by Claude Code in this repo — **this job ends when a GLB file is saved into the repo.** Do not attempt rigging, animation, scene setup, or any game work in Tripo.

The owner's Tripo account uses **free signup credits (commercial rights included)**. Do not purchase anything; the free credits are sufficient for this job including retries.

## Input files (already prepared, in this repo)

Use these exact files — do NOT use the character trait sheets (multi-panel reference cards) as generation inputs:

| View | File |
|---|---|
| Front (¾) — main image | `src/assets/game/art-direction/avatars/tripo-inputs/crrt-bunny-seated-front34.png` |
| Side | `src/assets/game/art-direction/avatars/tripo-inputs/crrt-bunny-seated-side.png` |
| Back | `src/assets/game/art-direction/avatars/tripo-inputs/crrt-bunny-seated-back.png` |

Character facts for judging likeness: black-furred bunny with tall ears, huge white cartoon eyes, **orange beak-like nose**, white belly patch, white paws/feet/tail, seated driving pose with paws forward gripping an invisible steering wheel. No carrot anywhere (intentional). Canon palette: fur `#1F1F1F`, belly/paws `#FFFFFF`, nose `#F57C00`.

## Pipeline — order matters

**Stage 1 — Generate (high detail).** Use image-to-3D with **multi-view input**: assign front34 as front/main, side as side, back as back. Pick stylized/cartoon mode if the UI offers one. Generate at the default/high detail level — this is the draft stage where likeness is judged. Do NOT apply Smart Topology yet.

**Stage 2 — Judge the draft (quality gate).** Rotate the 3D preview fully around. Pass/fail checklist:
- [ ] Two distinct ears, not fused, not melted (the input views disagree slightly on ear spread — this is the most likely failure)
- [ ] Face crisp: two white eyes with pupils, orange nose readable, not smeared
- [ ] White belly patch on front, white tail on back, white paws/feet — in the right places
- [ ] Seated pose preserved (legs forward, arms up/forward)
- [ ] No floating debris, holes, or extra limbs

If it fails: retry generation (expect 2–3 attempts; this is normal, credits cover it). If ears fail repeatedly, switch to **single-image mode using only the front34 image** — a clean single view often beats an inconsistent multi-view set. If the face fails repeatedly, regenerate with front34 set as the dominant/front image.

**Stage 3 — Texture.** If Tripo separates geometry and texture into steps, run the texture stage on the winning draft. The exported model must be colored, not gray.

**Stage 4 — Smart Topology / retopology (on the winner only).** Apply Smart Topology to the approved draft. If a polygon target is offered, choose roughly **10,000–20,000 triangles** (quad output is fine too; export triangulates). Then re-check the face and ear edges in the preview — **if Smart Topology visibly mushes the face or ears, skip it and export the high-detail version instead.** A correct face beats a clean wireframe; poly reduction can be done later in-repo.

**Stage 5 — Export.** Format: **GLB** with **embedded textures** (one file, not GLB + separate texture files). Download it.

## Delivery (how this job ends)

1. Save the downloaded file to: `src/assets/game/models/avatars/crrt-bunny.glb` (create the folder if needed).
2. Record for the asset manifest (Claude adds the entry — just note these): tool = Tripo, date, account tier = free credits w/ commercial rights, which stage was exported (smart-topology or high-detail), approximate triangle count if shown.
3. Tell Claude Code: "bunny GLB is at src/assets/game/models/avatars/crrt-bunny.glb" — integration happens from there.

## Hard don'ts

- Don't use the trait sheets (`crrt-bunny-sheet-*.jpeg`) as generation input — multi-panel images produce garbage 3D.
- Don't generate a standing/T-pose version — the seated pose is intentional (it skips rigging).
- Don't rig, auto-rig, or animate.
- Don't pay for credits or upgrade the plan.
- Don't accept a model with a melted face just because the body looks good — the face is 90% of the character read at game camera distance.

## Queued follow-up jobs (same pipeline, after the bunny succeeds)

1. **CRRT Penguin** — inputs don't exist yet; owner generates seated-pose renders first (same three views; "no fish, goggles on"). Reference sheet: `src/assets/game/art-direction/avatars/crrt-penguin-sheet.png`. Deliver to `src/assets/game/models/avatars/crrt-penguin.glb`.
2. **Hero kart body A/B test** — inputs ready at `tmp/tripo-inputs/hero-three-quarter.png` (main) and `tmp/tripo-inputs/hero-front.png` (extra view). Same pipeline. One difference: this mesh's wheels will be static (fused); that's acceptable for the A/B test. Deliver to `src/assets/game/models/avatars/../hero-kart-tripo.glb` or anywhere — just tell Claude where.
