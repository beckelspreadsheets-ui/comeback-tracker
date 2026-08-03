# AAA kart overhaul — plan for the remaining work (v3, audited)

**Rewritten 2026-08-03 after a 12-agent adversarial audit** (1.3M tokens, two
stages: investigate-to-refute, then a second auditor attacking the first).
Branch `aaa-kart-ci` @ `a7cd9a7b`.

**v2 of this plan would have failed on contact.** Three of its premises were
wrong in ways that produce immediate, expensive failure. This version records
what was verified, what was refuted, and — where a claim is still soft — says so.

Ends in a **preview deploy on a new branch**. Production and `main` untouched.

---

## Phase −1 — preconditions. Nothing dispatches before these · S

**1. Set the worktree base ref. This is the one that kills everything else.**

Claude-created worktrees default to `worktree.baseRef: "fresh"`, which branches
from the **remote default branch**. Here that is `main` — nine waves behind, an
obsolete 2025-era tree with a five-dependency manifest. Every dispatched agent
would land somewhere it cannot build, and would either fail or "helpfully"
rewrite from scratch. No settings file on this machine currently has a
`worktree` key.

```json
{ "worktree": { "baseRef": "head" } }
```

`baseRef` accepts only `"fresh"` or `"head"` — it cannot take a branch name.
Budget **~985 MiB per agent** once this is set (~557 MiB tracked + ~428 MiB
`node_modules`); the default's 0.45 MiB checkout is small only because it cannot
build the project.

**2. Add `.claude/worktrees/` to `.gitignore`.** It is not there today, so every
agent worktree surfaces as untracked files in every `git status`.

**3. Decide the pass bar — it is currently unanswerable.** The rubric says
"every axis ≥ 8 **and total ≥ 88/120**" across twelve axes. Axis 11, *Motion &
feel*, is video/telemetry-only and the still-frame critics score **eleven**. So
the 12-axis gate has never been evaluable and **"nothing has passed" is not a
measurement** — wave 10 could hit ≥8 on all eleven scored axes and there would
still be no defined answer to "did it pass".

Worse: the 11-axis instrument lives in an **uncommitted brief**, not in this
repo. Editing `AAA_NEXT_RUN.md` or the rubric changes nothing about what the
next critics actually score.

Owner's call, one of:
- **(a)** Declare the bar to be 11 axes, every axis ≥ 8, and delete `88/120`
  from the rubric; or
- **(b)** Stand up video/telemetry scoring for axis 11 — the harness already
  emits `desktop-10s.webm`, `mobile-10s.webm` and full autoplay telemetry, so
  this is wiring, not new capture.

Phase 7's exit criteria are undefined until this is answered.

---

## Phase 0 — corrections that DELETE work · S · do these first

Every item here either removes a later phase or fixes an instrument the later
phases are measured by. Cheapest work in the plan.

**1. Fix the previewer's arc-length mirror (~3 lines).** The previewer's sampler
does not mirror the shipped curve's arc-length resolution. Consequence: Phase 4's
corner-announcement numbers are wrong, and **once fixed there is zero
crest-caused announcement defect on either track**. The "hidden by crest" tight
corners (CC C14, C16) are an artifact of a 200-division sampler. This deletes
one of Phase 4's two named defects outright.

**2. Rebuild the flatness metric before trusting it.** The 62.3% figure that
justified the largest work item does not survive audit:

- The measured band is **68% road on Comeback City** — a fixed vertical slab
  (`x∈[35%,65%]`) cannot exclude a perspective trapezoid.
- `σ < 2.0` is a **free parameter**: the σ distribution is unimodal with no
  valley there, and the same frames read **45.6% or 83.4%** under equally
  arbitrary radii.
- The Penguin Village line in v2 **spliced two capture sets** — "52.0%" from
  `tmp/aaa-visual/scratch` (where it is 7 of 9 marks, not 3) and "3 of 9" from
  `wave7-r3` (where the total is 48.1%).
- The script was never committed, yet v2 told a future agent to "re-run the
  flatness measure".

**What survives, and why it is still worth having:** within the measured band,
CC's off-road ground reads **67–69% flat against 48–59% for the road corridor**,
so the localisation to off-road ground holds; and the band statistic correlates
**r = −0.71 with the critics' environment score across seven waves**. It is a
cheap automated proxy for an expensive human gate. Rebuild it with **per-scanline
road masking** and a threshold justified against the σ distribution, **commit it
as a script**, and only then let a Phase 2 exit criterion depend on it.

**3. Measure Penguin Village's mean speed.** `MEAN_SPEED['penguin-village']` is
260 by inference. Every PV number the previewer reports scales by it.

**4. CI capture reaches 2 of 9 marks.** Hypothesis (still unverified): under
SwiftShader the frames are genuinely slow, the dt clamp turns that into slow
motion, and the race ends in *game* time before later marks arrive. Fix by
driving game time directly rather than waiting on it. **Labelled a hypothesis
because it has not been tested.**

---

## Phase 1 — score wave 9 · S · checkpoint, not a gate

Wave 9 is unscored and shipped a lighting change. Only the **lighting** sub-item
in Phase 3 is genuinely score-gated; everything else is a named defect that needs
fixing regardless. Do not block other phases on this.

When reading the result: wave 8's environment regression is **carried entirely by
one critic** (−3). A wave-10 re-score that does not reproduce it is *not*
automatically evidence the fix worked.

---

## Phase 2 — THE MONOLITH BRANCH · single owner, serialized · L

The audit moved three items into this branch that v2 had outside it. All of the
following edit `ComebackCityThreeKartRace.jsx` and **share the `attachCharacter`
call site at `:9509-9551`**:

| item | where |
|---|---|
| near dressing | `:5981` `addDistrictsAndProps`, `:7011` `addPenguinVillageDressing`, + 9 monolith-local helpers |
| **ground material** | `:4128-4415` — **not** `createTrackMesh.js` |
| atlas recolour | `KENNEY_BODY_SWATCHES:2940`, `KENNEY_SWATCH_CONTRAST:2949`, `makeKartPaletteTexture:2951`, sites `:9538/:9600` |
| driver seat anchor | anchor `:1105-1107`, overwritten `:3296` (authored bodies) and `:3336` (Kenney) |

**`createTrackMesh.js` is a dead tombstone.** It is not in the kart build —
`vite.config.kart.js` has a single HTML entry and `race-playtest.html` is never
bundled. It reaches the player through nothing. It **is** live to `test:race`
(`race-content-playtest.mjs:4184`, `:4314`), so do not delete it.

### Three hazards inside this branch

**The contrast gate is a tripwire.** Comeback City has **zero road-vs-terrain
margin on 7 of 7 segments** — any darkening of `palette.ground`
(`comebackCity.js:147-165`) turns the previewer's contrast gate red and it exits
non-zero. Penguin Village is exposed at exactly one segment,
`glacier-shore@0.290`. Check the gate on every ground-material iteration.

**The atlas is a two-file system with a silent failure mode.** Recolour lives in
the monolith; the **per-texel paint classifier** lives in
`kartMaterials.js:112` (`PAINT_CHROMA = [0.08, 0.3]`) and reaches the shader via
`toonRimShader.js:724/765`. Changing `KENNEY_SWATCH_CONTRAST` can push swatches
across the 0.08 boundary and **reclassify paint as rubber** in a file this
package does not own. `kartMaterials.js:110-113` documents exactly this trap.
Either own both files in this branch or hold `PAINT_CHROMA` fixed and verify
classification after every swatch change.

**The atlas cap is CHEAP to fix, not expensive.** v2 said the 0.247 value-spread
"needs a new atlas cell, not a cleverer remap". **Refuted.** Swatch1 is not one
flat value — it carries a 14-step orange→amber gradient (G 157→114) that is
invisible to HSL-L but present in luma. Re-keying the remap on **luma** recovers
~0.12 raw / **~0.25 after the ×2.1 expansion at `:3036`**, with no new atlas
cell. Do the cheap fix first.

### Scope and axes

Near-ground work is two code paths — `palette.ground` +
the mottle/relief block at `:4218-4265`, and
`dressingCount`/`buildDressingDensity` `:521-610` driving `:6089/:6166/:7043/:7064`
— and it touches **three** failing axes, not two: environment (5), materials (6)
and lighting (6). Its grounding behaviour is gated by `raceShadowRig`, not free.
**Re-score materials after this lands** rather than assuming sufficiency.

Secondary owner to be aware of: `race/tracks/trackVisualSchema.js` owns the
`?trackVisuals=1` half of dressing. That path is dark by default
(`trackVisualsEnabled` false at `:7451`), so it only matters if this branch is
scoped to include the trackVisuals experiment.

---

## Phase 3 — camera · M · AFTER Phase 0's previewer fix

Re-check first: Phase 0 item 1 likely **deletes the crest-occlusion defect**. The
single remaining tight corner is limited by frame edge, which elevation and
crests do not touch. Do not start camera work until the previewer is fixed and
the defect is re-measured — it may not exist.

Camera is a **genuine two-file split**, not monolith-dominant and not
`chaseCameraFeel.js`-only:

- The monolith owns the rig and the seed values — 6 real symbol sites
  (`:424`, `:9376`, `:11591-11593`, `:11600`), handing `advanceChaseFeel` 17
  named inputs including `boomBase`, `eyeBase`, `fovBase`, `lookUpBase`.
- `chaseCameraFeel.js` (1052 lines, camera-only) owns the **dynamics** —
  `CHASE_FEEL_DEFAULTS:105`, `advanceChaseFeel:650`, `solveFramingCorrection:957`.

The surviving camera item is **rival readability at distance** ("a rival 40m up
the road is a flat coloured lump"), which shares a root with the atlas work in
Phase 2 — sequence them together.

---

## Phase 4 — elevation · M · and the coupling that reverses the order

**MISSING COUPLING, found by the audit: elevation mechanically DELETES the near
dressing Phase 2 adds.** The `onElevatedSpan` guard (defined `:625`) skips
near-dressing at **8 call sites** — `:2494`, `:2742`, `:2756`, `:6089`, `:6166`,
`:7023`, `:7043`, `:7064` — and today it blanks **8.0% of Comeback City's lap**
(band 0.785–0.865) and **4.7% of Penguin Village's** (0.1665–0.2136). A Phase 4
that adds relief across the lap, with that guard unchanged, deletes the dressing
Phase 2 just paid for.

(A ninth near-dressing run, the iceberg ring at `:7219+`, is deliberately exempt
because it forces its own `y` — the comment at `:7223` says so. Verified: a raw
`grep -c` returns 11, which is the definition plus two comments plus the eight
real sites. Counting textual hits instead of call sites is how this kind of
number goes wrong.)

So the two are not independent and the naive order is wrong. Either:
- change the guard so elevated spans carry their own near dressing, **then** add
  relief; or
- author the relief only outside the dressed bands and accept less grade.

Resolve this **before** either phase, not between them.

---

## Phase 5 — rival AI over a 134-second race · M

`rivalRacers.js`, 7 monolith call sites. Nothing is broken — personalities tuned
over 34 seconds have never been checked over 134. A design pass.

Now measurable rather than eyeballed: autoplay telemetry runs at real speed since
the GL-flag fix, so judge on lead changes and gap-over-time across the full race.
**This lands on axis 11, which is currently unscored** — see Phase −1 item 3.

---

## Phase 6 — post-chain and renderer tiers · M · ONE CHANGE AT A TIME

The wave-6 revert is the precedent and it was **four files**, so the discipline
must name all of them — including **`vite.config.kart.js`**, which v2 left
outside the fence. The bundle coupling is documented history, not a forecast:
reverting the chunk split immediately broke the largest-JS-gzip check by 26 KiB.

**Expect a false red.** `RACE_RENDER_SCALE` is imported by
`scripts/race-content-playtest.mjs`, so changing it will turn `test:race` red as
a **fixture mismatch, not a regression**. Update the fixture in the same change.

`RACE_RENDER_SCALE` is 0.85 desktop / 0.6 mobile. The 0.6 branch is unreachable
**on phones** (`touchControls === false` skips the soft lock at `:9230-9234`) but
is reachable on any non-touch surface taller than 0.74 aspect — a narrow desktop
window, docked devtools, a portrait headless capture. **Do not delete it as
dead**, and do not assume phones are already on a cheap path.

---

## Phase 7 — remaining items · S

- **On-demand kart pool, runtime half** — real, but justify it on **first-load
  time and VRAM**. The bundle-budget rationale is foreclosed by the manifest in
  five separate places.
- ~~Legacy 2D minimap~~ — **dropped. Not a defect.** `raceTracks.js:128` affects
  only a dev harness excluded from the build, and the kart HUD's minimap
  auto-normalises. Effort priced against it is wasted.
- ~~Driver hero rim~~ — **dropped, already shipped.** Both tracks carry a
  `heroRim`; the comment at `:2360` claiming CC ships rim-off is stale. Fix the
  comment. Only the seat anchor is real (Phase 2).
- ~~Fallback kart `rim: true`~~ — **dropped, already fixed.** Do not re-open from
  `docs/AAA_RESTART_PROMPT.md:20`; that note is stale and additionally mis-lists
  `tireMat`, which is excluded on purpose.
- **Near-plane snow — re-scoped.** Tuning `SNOW_NEAR_FADE` is a **no-op** on the
  reported artifact: the blobs are the monolith's **ambient Points cloud**, not
  the streak system in `raceParticles.js`. Severity is also lower than the critic
  implied — ~1.8 flakes within the ≥44 px band at any instant, so one or two
  conspicuous blobs, not a field.

---

## Phase 8 — verify, then preview deploy · S

1. Full battery at load < 5: `build:kart`, `test:bundle:kart`, `test:race`,
   `test:track-visuals`, `test:audio:kart`, `test:kart-playable`, the previewer,
   `test:core`.
2. Final capture, critics, blind A/B against baseline. **Exit criteria depend on
   Phase −1 item 3 being answered.**
3. Preview deploy:

```
npm run deploy:kart:preview      # --branch=aaa-preview
```

- Account **Showcasedesigns.co@gmail.com** (`9f01a1b3…`), verified, the only
  account this token reaches. Never Abel's.
- **Never `npm run deploy:kart`** — it targets `--branch=main`, which is
  production for this Pages project.
- Verify the deployed origin serves the new build rather than trusting the
  deploy output.

**Out of scope:** production deploy and `main` (owner's call, never given), and
the ordinal roster (blocked on the owner's art, not on engineering).

---

## Parallelism: an honest reckoning

The manager-of-branches model needs work that can actually be split. **This
codebase mostly cannot be, yet.** After audit, the genuinely
independent-of-the-monolith work is:

- `scripts/track-layout-preview.mjs` — previewer sampler + flatness metric
- `scripts/race-content-playtest.mjs` — the `RACE_RENDER_SCALE` fixture
- `rivalRacers.js` internals, if the design pass avoids its 7 call sites

Everything else — dressing, ground, atlas, seat anchor, camera seeds, the
elevation guard — lands in one 12.6k-line file, and the project's own rule
(*one monolith owner per verified capture*) exists because ignoring it already
cost Penguin Village three waves.

So: **run Phase 0 and Phase 5 as parallel branches; run Phase 2 as a single
serialized owner.** Widening beyond that means decomposing the monolith first,
which is its own project and is not in this plan.

---

## Corrections ledger — what v2 got wrong

Kept so the next reader can calibrate how much to trust an inherited plan.

| v2 claim | verdict |
|---|---|
| P2 ground material is self-contained in `createTrackMesh.js`, 0 monolith refs | **wrong** — that file is a dead tombstone; shipped ground is monolith `:4128-4415` |
| "camera + ground material" is a safe parallel first-test pair | **wrong** — ground is monolith, so the pair collides with dressing |
| Only 3 of 9 items own monolith work | **wrong** — 4+, and the count came from a circular check |
| CC 62.3% flat off-road band | **band is 68% road**; threshold arbitrary; direction survives, number does not |
| PV "52.0% flat, 3 of 9 marks" | **spliced two capture sets** |
| Atlas cap "needs a new atlas cell, not a remap" | **refuted** — luma re-key recovers ~0.25, no new cell |
| Snow: tune the existing `nearFade` | **no-op** — wrong particle system entirely |
| Legacy minimap is an open item | **not a defect** |
| Camera "needs the same +1 as six other axes" | **four** other axes sit at min 7 |
| `AAA_NEXT_RUN.md` introduced the 88/110 conflation | **upstream** — it faithfully reports an uncommitted brief's scale |
| Elevation and dressing are independent | **wrong** — `onElevatedSpan` deletes dressing on 8 sites |

## Rules this plan leans on

1. **Read the frames.** Wave 6: green build, zero console errors, 18/18 frames,
   cyan noise. Only looking caught it.
2. **A check that could not have failed is not a check.** Two audit rounds and
   the v2 plan all shipped verdicts resting on greps that were guaranteed to
   return what they returned.
3. **Render-pipeline changes one at a time**, and name every file in the fence.
4. **A gate that duplicates the data it checks stops checking it.**
5. **"Load-fake red" is a hypothesis, not a verdict.**
6. **Verify a claim before carrying it forward** — this rewrite dropped four
   items that were already fixed or never real.
7. **Never `git add -A`.** Stage owned paths explicitly.
