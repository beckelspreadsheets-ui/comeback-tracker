# AAA critic brief — the instrument, committed

**This file is what a critic agent is actually given.** Before this commit the
brief lived outside the repo and was pasted at dispatch time, which meant editing
`AAA_KART_RUBRIC.md` changed the *description* of the bar without changing what
any critic scored. Dispatch by pointing at this file. If you change the bar,
change it **here**, or the change has no effect.

Owner's ruling, 2026-08-03: **eleven scored axes, every axis ≥ 8, no total
threshold.** Axis 11 (*Motion & feel*) stays unscored until the video/telemetry
scorer lands — that is a prerequisite of Phase 5, not of Phase 8.

---

## What this ruling changed, and what it did not

It did **not** change the instrument. Ten waves of critic output are on disk in
`tmp/aaa-plan/wave*-critics.json`, and **all thirty reports carry exactly eleven
score keys**. Axis 11 has never been scored by anyone. The ruling makes the
written bar match the instrument that has been running since wave 1, so **every
historical score stays directly comparable** — nothing needs re-scoring.

The deleted `≥ 88/120` was doubly broken: 120 counted an axis nobody scores, and
88 was redundant anyway, since eleven axes each ≥ 8 already forces a total ≥ 88.
The per-axis floor was always the binding constraint. Only it remains.

Under the new bar, **still nothing has passed** — the honest state is unchanged.
Best round on disk is wave 8 critic0, which reaches 86 with four axes under 8.

---

## The dispatch prompt

Give the critic the capture directory and this file, and nothing else. For blind
A/B rounds, the critic's working directory must contain no key, manifest or
source — see `scripts/aaa-blind-compare.mjs`.

> Score the frames in `<capture dir>` against `docs/AAA_KART_RUBRIC.md`.
>
> The reference is **Mario Kart 8 Deluxe** — not its art style, its quality bar.
> The question is never "does this look like Mario Kart", it is "does this look
> like it was made by a team that cared as much as that team did".
>
> **Be harsh. The default verdict is FAIL.** "Pretty good for a web game" is a
> FAIL — the web-game excuse is not available. If you find yourself writing
> "acceptable", write FAIL instead and say what would make it good.
>
> **Open every frame.** A verdict reached from a manifest, a build log or a file
> listing is not a verdict. Wave 6 shipped a green build, zero console errors and
> 18/18 frames — and the frames were cyan noise. Only looking caught it.
>
> Score **eleven** axes 0–10, using the exact JSON keys below. Do not score
> *Motion & feel*; it is video/telemetry-only and no scorer exists yet. Omit the
> key entirely rather than guessing from stills.
>
> A frame passes only when **every one of the eleven axes is ≥ 8**. There is no
> total threshold. Any axis at 0–4 is an automatic FAIL regardless of the rest —
> one broken axis is what a player notices.
>
> Return the JSON object described under **Output schema**, and nothing else.

## The eleven scored axes

Axis numbers match `AAA_KART_RUBRIC.md` and are **never renumbered** — ten waves
of history reference them. Axis 11 is skipped, not removed.

| # | key | axis |
|---|---|---|
| 1 | `sky` | Sky & atmosphere |
| 2 | `lighting` | Lighting & grounding |
| 3 | `materials` | Materials & surface |
| 4 | `trackLegibility` | Track legibility |
| 5 | `environment` | Environment craft |
| 6 | `kart` | Kart & driver |
| 7 | `vfx` | VFX |
| 8 | `camera` | Camera |
| 9 | `post` | Post & grade |
| 10 | `hud` | HUD |
| — | *(not scored)* | *Motion & feel — video/telemetry, deferred to Phase 5* |
| 12 | `frameIntegrity` | Frame integrity |

The 10/10 definition of each axis lives in the rubric. Read it there; do not
paraphrase it here, or the two drift apart.

## Output schema

```jsonc
{
  "lens": "...",      // How you looked: what you opened, in what order, what
                      // separated the builds. Written BEFORE the scores.
  "verdict": "FAIL",  // "PASS" | "FAIL"
  "headline": "...",  // One sentence. Name the axes that pin the verdict.
  "scores": {         // Exactly the 11 keys above. No extras, none missing.
    "sky": 8, "lighting": 7, "materials": 7, "trackLegibility": 9,
    "environment": 7, "kart": 8, "vfx": 8, "camera": 8, "post": 7,
    "hud": 8, "frameIntegrity": 9
  },
  "total": 86,        // Sum of the 11. Must equal the sum — it is checked.
  "blockers": ["..."],// Automatic-blocker hits, each naming its frames.
  "nextFixes": [{
    "title": "...",
    "frame": "...",      // The SPECIFIC frames that show it. Required.
    "severity": "blocker", // blocker | major | moderate | polish
    "fix": "...",        // Name the technique AND the file. "Improve the
                         // lighting" wastes an implementation round.
    "targetFile": "...", // Absolute path.
    "inScope": true      // Is this wave's package allowed to touch it?
  }],
  "outOfScopeNoted": ["..."]  // Real defects this wave must not touch.
}
```

`total` is verified against the sum of `scores` — it has matched in all thirty
historical reports, and a mismatch means the report was assembled by hand rather
than from the frames.

**Schema note for anyone reading old files:** waves 2–8 used a wave-numbered
`inScopeForWaveN` key instead of `inScope`, and wave 1 omitted it. New reports
use `inScope`. `scripts/aaa-approval-sheet.mjs` reads `scores`, `total`,
`verdict`, `lens`, `headline`, `blockers` and `nextFixes` only, and iterates
score keys generically — so it needs no change when an axis is added or removed.

## What the ≥ 8 bar currently costs

Wave 8's three critics disagree on most axes but are **unanimous that three sit
under 8: `materials`, `environment`, `post`.** Those three are what the bar is
waiting on. `lighting` is sub-8 for two of three.

This matters for sequencing: Phase 2 targets environment, materials and lighting,
and Phase 6 owns the post chain. No phase in the current plan is aimed at an axis
that all three critics already pass.

## Adding axis 11 later

The wiring, when Phase 5 needs it: the capture harness already emits
`desktop-10s.webm`, `mobile-10s.webm` and full autoplay telemetry, and since the
GL-flag fix (`f2d4b026`) that telemetry runs at real speed rather than 9%. So the
scorer is wiring over existing artefacts, not new capture.

When it lands: add `motionFeel` to `scores`, add the row back to the table above,
and say so in this file's header. Do **not** renumber the other axes, and do not
reintroduce a total threshold — with twelve axes each ≥ 8 the total is again
implied, and a redundant gate is how the last one came to be wrong.
