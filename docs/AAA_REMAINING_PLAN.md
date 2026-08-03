# AAA kart overhaul — plan for the remaining work

**Rewritten 2026-08-03 after wave 9.** Branch `aaa-kart-ci` @ `0e78badc`.
Supersedes the wave-6 version of this file, whose Tier 1–3 is now all landed
(4× tracks, spline kinks, JS chunk split, kart diet + wiring, PV shadows).

Ends in a **preview deploy on a new branch**, so the work can be looked at and
shared. Production and `main` are not touched.

---

## The goal, and the honest distance to it

Pass bar is **88/110 with every axis ≥ 8**, scored by three independent critics
against `docs/AAA_KART_RUBRIC.md`. Wave 8 scored **86 / 77 / 79**. Nothing has
passed.

Per-axis **minimum across the three critics**, by wave. The minimum is the
number that matters: the bar is "every axis ≥ 8", so one critic at 6 fails the
axis however generous the other two were. (Wave 6 is all zeros — the cyan-noise
build.)

| axis | w1 | w2 | w3 | w4 | w5 | w6 | w7 | w8 |
|---|---|---|---|---|---|---|---|---|
| **environment** | 5 | 6 | 6 | 6 | 7 | 0 | 7 | **5** |
| **lighting** | 3 | 5 | 5 | 4 | 6 | 0 | 5 | **6** |
| **materials** | 3 | 4 | 4 | 5 | 6 | 0 | 5 | **6** |
| **post** | 4 | 6 | 5 | 6 | 7 | 0 | 6 | **6** |
| camera | 2 | 3 | 3 | 4 | 4 | 0 | 7 | 7 |
| vfx | 3 | 5 | 4 | 5 | 6 | 0 | 6 | 7 |
| sky | 5 | 7 | 7 | 7 | 7 | 0 | 6 | 7 |
| kart | 4 | 4 | 4 | 5 | 5 | 0 | 6 | 7 |
| trackLegibility | 5 | 6 | 7 | 7 | 7 | 0 | 5 | 7 |
| hud | 6 | 7 | 7 | 8 | 8 | 6 | 8 | 8 ✅ |
| frameIntegrity | 2 | 3 | 4 | 4 | 5 | 0 | 4 | 8 ✅ |

**Only two axes are at the bar.** Nine need at least +1, four need +2 or +3.

### Correction to the standing story

`AAA_NEXT_RUN.md` says the axes under the bar are "**camera** (lowest
throughout), lighting, materials". **That is out of date, and believing it would
have aimed this plan at the wrong axis.**

Camera *was* the worst for five straight waves (2 → 3 → 3 → 4 → 4). The wave-4
chase camera and wave-6 camera feel fixed it: it has sat at **7** for two waves
and now needs the same +1 as six other axes.

The worst axis today is **environment at 5**, and it is a **regression** — 7 at
wave 7, 5 at wave 8. The cause is already diagnosed in the wave-8 critic notes:
stretching the loop 4× without redistributing the dressing left "roughly half of
Comeback City driving past a flat, untextured tan plane". The 4× rebuild bought
the overtaking window and paid for it in environment.

Order below therefore targets **environment (5) → the three 6s → the 7s**.

---

## Phase 0 — close wave 9's loose ends · S

Both were blocked until the GL-flags fix made headless game time run at real
speed, and both are now cheap.

1. **Measure Penguin Village's mean speed.** `MEAN_SPEED['penguin-village']` is
   260 by *inference*, not measurement. Everything the previewer reports for PV
   — lap, race, straight seconds, beat gaps — is scaled by it.
2. **CI capture gets 2 of 9 marks per track.** Now explicable: under SwiftShader
   frames are genuinely slow, the engine's dt clamp turns that into slow motion,
   and the race ends in *game* time before the later marks come round. The fix
   is not faster rendering — drive game time directly (seek to progress) instead
   of waiting on it in real time.

**Exit:** previewer reports a measured PV lap; CI capture reaches ≥ 8/9 marks or
the residual cause is written down.

---

## Phase 1 — score wave 9 · S · before any new work

Wave 9 is **unscored** and it shipped a change to a failing axis. A wave-8
critic measured PV's contact shadow as intermittent — luma delta under the kart
7.5% at p0.06, "no readable contact" at p0.15, against CC's 38.2% — and wave 9's
split key exists to fix exactly that.

Capture 18 frames both tracks, run the three critics, blind A/B against
`tmp/aaa-visual/baseline`, record in `tmp/aaa-plan/progress.json`, publish the
sheet.

**Why first:** it decides how much of Phase 3 is still needed. Without it the
next three phases are guesswork.

---

## Phase 2 — ENVIRONMENT · the 5, and the only regression · M–L

Biggest gap, known cause, so this is redistribution work rather than invention.

- **Dressing density over an 11.6k lap.** Districts, scenery anchors and the
  mid-ground belt were authored for a 2,897-unit loop and were never
  re-distributed when the lap quadrupled.
- **The flat untextured tan ground**, named directly by the critic.
- **Penguin Village needs the same audit** — same 4× stretch, same
  authored-for-a-short-loop dressing.

Verify at all nine marks per track, not two: empty stretches are exactly what a
sparse capture misses.

**Exit:** environment ≥ 8 from all three critics.

---

## Phase 3 — the three 6s: materials, lighting, post · M–L

Each has a named cause already on record.

- **Materials — rival value-spread capped at 0.247** by the shipped texture
  atlas: half the body texels come from a cell that is one flat value. Needs a
  **new atlas cell**, not a cleverer remap. (Filed as a "smaller open item" in
  the old handoff. It is not small — it is a failing axis.)
- **Materials/kart — the driver.** Wave-8 critic: the character's near-black
  back gets no rim term so it merges with the roll hoop and seat, and the torso
  sits behind the seat back at this camera. Add the hero rim to the character
  material; raise/forward the seat anchor a few cm. **Explicitly deferred to
  "the wave-9 kart/driver pass" and never claimed.**
- **Lighting —** re-read after Phase 1. If the split key moved PV, what remains
  is CC's own shading.
- **Post —** scored 6/7/6. Treat the *quality* complaints here; *tiering* is
  Phase 7, deliberately separate.

Already fixed, do not re-open: the fallback kart's `blackMat`/`seatMat` now
carry `rim: true` (`tireMat` is deliberately excluded — see the comment at
`ComebackCityThreeKartRace.jsx:1121`). Verified 2026-08-03.

---

## Phase 4 — the 7s, and the pass bar · M

Six axes need exactly +1.

- **Camera — rival readability at distance.** Two independent sources land on
  the same fix. The wave-6 plan: "the remaining camera fix is a screen-space
  rival ghost". The wave-8 critic: "a rival 40m up the road is a flat coloured
  lump with no silhouette read — you cannot tell which of the five bodies it
  is." Position awareness from the chase camera is the camera axis's remaining
  debt. Each body needs a distinct roof/wing silhouette and one high-contrast
  accent that survives at distance — which overlaps the atlas work in Phase 3,
  so sequence them together.
- **Camera — corner announcement.** Previewer measures worst 1.3 s (CC) / 1.8 s
  (PV) against a 0.8 s gate but a **1.5 s authoring bar**; CC's C14 (1.3 s) and
  C16 (1.45 s) are both under it and flagged `tight`.
- **VFX — near-plane snow.** Storm-snow quads scale to 40–60 px at the near
  plane and composite as opaque grey-white spheres sitting still while
  everything beside them is motion-blurred — they read as floating balls. Needs
  a near-distance size clamp plus alpha fade inside ~2–3 units.

**Exit: every axis ≥ 8. This is the pass bar.**

---

## Phase 5 — rival AI over a 134-second race · M

`rivalRacers.js` is correctly parameterised in world units, so **nothing is
broken**. But personalities tuned to be interesting over 34 seconds have never
been checked over 134, and pacing a field across three 45-second laps is a
different design problem. A design pass, not a bug fix.

Now measurable rather than eyeballed: autoplay telemetry runs at real speed, so
judge on lead changes and gap-over-time across the full race, not finish order.

---

## Phase 6 — elevation · M

Both tracks author elevation as a **single sin bump**, so the viaduct is the only
relief on an 11.6k lap and the rest is dead flat.

Deliberately **after** the axis work and **before** the renderer tiers:
elevation changes sightlines and crest occlusion, so it must settle before
anything downstream is locked, and the previewer measures gradient and corner
announcement cheaply.

---

## Phase 7 — post-chain and renderer tiers · M · ONE FILE AT A TIME

Last of the big work, for two reasons: **the combined tier package is what
destroyed the render in wave 6**, and tiering should measure a scene that has
stopped changing.

- One file per change, each verified by its own capture. No exceptions.
- `RACE_RENDER_SCALE` is hardcoded 0.85 desktop / 0.6 mobile — a fixed cut means
  the game never renders at native resolution even on hardware that could.
- Tiers must preserve the art direction: the LUT and vignette carry the look and
  should survive; SMAA and the heavier effects are the drop candidates.
- The phone build has not been re-measured since shadow maps, the three-pass
  post chain, the mid-ground belt and the environment probe all landed.

---

## Phase 8 — remaining small items · S

- **On-demand kart pool, runtime half** — designed in wave 7's notes, not built.
- **Legacy 2D minimap** (`raceTracks.js` ~128): hardcoded +512/+384 offset
  assuming a ~350-unit loop, now fed 449 points spanning ±1716. Only affects
  `RacePlaytestHarness`, a dev tool excluded from the build, and the kart HUD's
  minimap auto-normalises — **nothing shipped is wrong.** Fix or delete.

---

## Phase 9 — verify, then preview deploy · S

1. Full battery at load < 5: `build:kart`, `test:bundle:kart`, `test:race`,
   `test:track-visuals`, `test:audio:kart`, `test:kart-playable`, the previewer,
   and `test:core`.
2. Final 18-frame capture, three critics, blind A/B against baseline.
3. **Preview deploy on a NEW branch:**

```
npx wrangler pages deploy dist-kart \
  --project-name=comeback-city-kart \
  --branch=aaa-preview
```

- Account is **Showcasedesigns.co@gmail.com** (`9f01a1b3…`) — verified, and the
  only account this token can reach. Never Abel's.
- **Do NOT use `npm run deploy:kart`.** It hardcodes `--branch=main`, which is
  *production* for this Pages project. The preview gets its own npm script so
  production is never one flag away.
- Verify the deployed origin serves the new build — byte-check the GLBs, probe a
  race — rather than trusting the deploy output.

**Deliberately out of scope:** production deploy and `main` (owner's call, never
given), and the **ordinal roster** — pipeline proven on 3 of ~100, the rest is
blocked on the owner's art, not on engineering.

---

## Rules this plan leans on

1. **Read the frames.** A green build with zero console errors and 18/18 frames
   rendered cyan noise in wave 6. Only looking caught it.
2. **Render-pipeline changes one at a time**, each verified alone.
3. **A gate that duplicates the data it checks stops checking it** — four found
   stale in wave 9, one red since wave 4.
4. **Pixel A/B cannot verify a render change here** — a control capture of
   identical code differs on 4–20% of pixels. Walk the live scene graph.
5. **"Load-fake red" is a hypothesis, not a verdict.** Blaming load hid a real
   bug for several waves.
6. **Verify a claim before carrying it forward.** This rewrite dropped two
   inherited items that were already fixed, and corrected the axis the whole
   plan was going to aim at.
7. **Never `git add -A`.** Stage owned paths explicitly.
