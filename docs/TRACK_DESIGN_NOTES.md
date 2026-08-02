# Track Design Notes

How to see a kart track before it exists, what the numbers mean, and what the
approved 4x layout work has to hit.

Tool: `scripts/track-layout-preview.mjs` · Output: `tmp/track-preview/`

---

## 1. Why this document exists

A kart track can be fully authored — waypoints, fillet radii, road ribbons,
boost pads, item boxes, ramps, a shortcut — and then not actually be *looked
at* until the whole scene is assembled and driven. Every judgement about the
layout therefore arrives after the expensive part is already built. That is the
same blind spot that cost two kart lifts before the turntable rig existed.

The previewer closes it. It reads the **shipped** track data, reproduces the
**exact** curve the race drives, and gives you a plan view plus the numbers a
layout actually lives or dies by — in seconds, not world units, because a
driver experiences seconds.

It runs on unregistered drafts too (`--file`), so a layout can be judged and
rejected before anything is built from it.

---

## 2. Running it

```bash
node scripts/track-layout-preview.mjs                              # both shipped tracks
node scripts/track-layout-preview.mjs --track penguin-village      # one track
node scripts/track-layout-preview.mjs --compare comeback-city,penguin-village
node scripts/track-layout-preview.mjs --file tmp/my-draft.mjs      # unregistered draft
node scripts/track-layout-preview.mjs --json-only                  # no browser
node scripts/track-layout-preview.mjs --speed 300                  # what-if on mean speed
```

Writes, per track: `<key>-layout.json` (diffable) and `<key>-plan.png` (the
sheet). `--compare` writes `compare-<a>-vs-<b>.png` + `.json`.

`--file` accepts any module exporting an object with `.course.centerline`.
Elevation, ribbons, pads and boxes are all optional — a bare centerline is
enough to get a plan view and a lap time, which is the point.

### Prerequisites

`three` and `playwright` (both already dependencies). `sharp` is **not** in
this repo, so the PNG comes out of a headless Chromium canvas, which is the
established pattern here. Do not add an image library for this.

---

## 3. What it measures, and how

### The curve

`makeSampler()` in the script is a **faithful mirror** of
`makeSampler` / `makeElevation` / `makeTrackCurve` / `makeWidthTable` in
`src/game/ComebackCityThreeKartRace.jsx`: same `CatmullRomCurve3`, same tension
`0.38`, same sine elevation band, same 224-entry width table with 14 smoothing
passes. It is duplicated rather than imported only because that file is a
10.8k-line React/THREE monolith that cannot be loaded in node.

Duplication is safe **only because it is checked**. On every run against
Comeback City the tool asserts against shipped ground truth and fails loudly if
it drifts:

| | tool | shipped | Δ |
|---|---|---|---|
| lap length | 2896.9 u | 2897 u | 0.00% |
| lap time | 11.14 s | 11.15 s | −0.09% |
| 3-lap race | 33.43 s | 33.5 s | — |
| vs measured autoplay | 33.43 s | 34.08 s | −1.91% |

The measured autoplay run (`tmp/k2.5-launch-repro/telemetry-autoplay.json`) is
the *slower* number because the grid start spends ~2 s accelerating from a
standstill; the geometric solve does not model that. Everything else agrees to
within a tenth of a percent. **If that assertion ever fails, the maths is
wrong and no layout the tool reports should be trusted** — the run exits
non-zero.

### Seconds, not units

Every duration uses a per-track **mean speed**, not top speed: CC 260 u/s,
PV 248 u/s. CC's is measured — the telemetry means 257 u/s across the moving
part of the race and the lap solves at 260. Override with `--speed`.

### Corners

Curvature is sampled every 2 world units, measured as signed turn angle across
a ±6-unit baseline, then box-smoothed over ±12 units. Without the smooth, the
CatmullRom's ripple between authored points reads as a corner every 30 units.

Detection uses **hysteresis**, like any other signal detector: a corner is
declared where radius drops under **250**, then extended outward while radius is
still under **450**. A single threshold clips the gradual entry and exit of a
long sweeper and inflates the straights — the longest straight measures 2.23 s
with one threshold and 2.19 s with the pair, and the second number is the one
that matches what the corner does from the seat. Runs deflecting less than
11.5° are dropped: that is a line adjustment, not a corner.

Per corner the sheet reports:

- **radius** = arc length ÷ swept angle. The radius the driver *feels*.
- **min r** = the tightest instant inside the arc. A big gap between the two
  means the corner is not a constant-radius arc.
- **arc°** = total deflection. 230° is a carousel; 40° is a kink in the road.
- **sec** = how long the corner lasts at mean speed.
- **lat** = v²/r. An **index** for ranking corners on the same sheet, not a g
  figure — world units are not metres.
- **type** — `sweeper` (≥45°, r ≥120: holds a long drift), `hairpin` (≥120°,
  r <120: stop-and-turn), `turn` (everything else), `kink` (see below).
- **chicane** — flagged when two *opposite-handed* corners sit within 60 u of
  each other. One rhythm break, not two corners.

### Kinks — the tool's own alarm

The tightest radius either shipped track **authors** is 72 (Penguin Village's
W3 dent). So anything the curve produces below **60** was not designed: it is
the spline reacting to centerline points that sit too close together.

Comeback City has two, and they are at the worst possible place:

```
C6  p0.993  right  28.4°  r 20.2 (min 12.6)   lat 3353
C7  p0.997  left   42.9°  r 34.7 (min 11.2)   lat 1948
```

Cause: the authored centerline's last point `{-193, 46}` and its first point
`{-195, 45}` are 2.2 authored units apart (3.0 world units) where every other
gap is ~30. The CatmullRom kinks through that pair — **directly on the
start/finish line**, and the lateral index there is 5× the hardest real corner
on the track. It also chops what should be a single ~410 u run onto the
start straight into 392 + 6 + 4. Look at the plan: the ribbon visibly pinches.

This is exactly the class of defect the previewer exists to catch, and it was
invisible before it. Penguin Village has none, because it is generated by
`buildCenterline()` from waypoints + fillet radii rather than hand-placed
points — which is an argument for authoring the 4x layouts the same way.

### Straights

Straights are simply what is left between consecutive corners; those over 60 u
are named in the table with length **and duration**. The longest is the
headline stat on the sheet, because **a pass needs a window to be set up in and
that number is how long the window is**.

### Beats

A **beat** is a discrete authored thing that happens *to* the driver: an item
box row, a boost pad, a ramp, the shortcut launch, the elevation crest. The
table gives each beat's progress, lane and the **gap in seconds to the next
one**.

Coins are deliberately **not** beats. They are a continuous collectible layer
rewarding line choice everywhere, so folding them in would hide the real
pacing. They are counted separately (8 rows × 2 on both tracks) and drawn as
small gold dots.

### Elevation

Sampled per percent of lap from the same sine band the race uses, with peak
height, band length in units and seconds, and the steepest gradient (a sine
bump's max slope is at its foot).

---

## 4. Reading the plan view

| what you see | what it is |
|---|---|
| dark grey ribbon | the road at **true width** (lane ±1 sits at `width × 0.44`, same as the race) |
| green arc | left-hand corner |
| pink arc | right-hand corner |
| **red** arc + leader line | kink — unauthored, tighter than any designed radius |
| gold line + `N.NNs` | the longest straight, labelled with its duration |
| steel-blue line | other straights over 60 u |
| cyan square | item box · **magenta chevron** boost pad · **orange triangle** ramp |
| purple diamond | shortcut launch · **gold diamond** crest launch · white diamond plain crest |
| small gold dot | coin row |
| white bar + arrowhead | start/finish and direction of travel |
| grid | 100 world units; scale bar also gives that distance in seconds |

`--compare` forces **one shared world-units-per-pixel across both canvases**, so
relative size on that sheet is real — that is the entire reason for the mode.

---

## 5. The structural grammar we are missing

Mario Kart 8 lays a lap out to a repeatable grammar. Measured against it, both
shipped tracks are short on structure, not on polish:

| element | what it does | CC | PV |
|---|---|---|---|
| **opening straight** wide enough for the pack to fan out | lets 8 karts sort themselves before the first commitment | 392 u / **1.51 s**, 45–47 u wide — the narrowest section on the track | 544 u / **2.19 s**, 58 u — the best opening either track has |
| **early corner sequence** establishing the drift rhythm | teaches the lap's cadence in the first quarter | C1 sweeper then straight into a 230° carousel — one corner, not a sequence | C1→C2→C3→C4 in the first half: a real sequence, but see the handedness problem |
| **mid-course signature set piece** | the thing people describe when they describe the track | the bridge climb + free crest launch (p0.40–0.53). Genuinely good | the ice bridge, but `crestLaunch: false`, so it is scenery, not a beat you play |
| **risk/reward shortcut** | a decision, with a punish for getting it wrong | the carousel dare-jump (p0.212, needs 232 u/s, ±2–3 s) — a model example | **none** (`shortcut: null`) |
| **elevation / jump beat** | breaks the plane, resets the camera | peak 20.9 u, 1.49 s, ~17% gradient | peak 17 u, ~18% gradient, no launch |
| **final corner that decides overtakes** | the last place a race changes hands | C5, a 162° left sweeper — good, then ruined by a r20 kink on the line itself | C7, 72° r137 sweeper onto the main straight — the best-shaped corner on either track |
| **corner-type variety** | sweepers hold a drift, hairpins force a stop-and-turn, chicanes break rhythm | 3 sweeper / 1 hairpin / 1 turn / **0 chicanes** | 4 sweeper / 3 turn / **0 hairpins**, 2 chicanes |

### The three findings that matter

**1. Seven corners against MK8's 12–20 — and on CC only five are real.**
Radii cluster in a narrow band (CC 111–183, PV 88–165), so almost every corner
is taken the same way. PV has no hairpin at all.

**2. The longest straight on either track is 2.19 s.** There is no window in
which to set up a pass. This is *not* a shortage of straight: CC is 50%
straight by distance and PV 55%. The problem is that the straight is **chopped
into five to seven pieces**, none of them long enough to use. Lengthening the
lap alone will not fix it — one *contiguous* straight has to be authored.

On Penguin Village it is worse than the number suggests: its longest straight
*is* its start straight, so the only pass window on the lap opens the instant
the lap wraps and is gone before turn 1. Put the 4x overtaking zone somewhere a
driver can still reach it — mid-lap, feeding a slow corner.

**3. Beat density is one every 0.70–0.76 s** (CC 16 beats / 11.14 s, PV 13 /
9.86 s). Something is thrown at the driver roughly three times per corner.
There is no quiet stretch, so nothing lands as an event and there is no room
left to think about racecraft.

**4. Penguin Village turns right six times out of seven.** One left-hander in
the whole lap means one drift direction, which halves the mechanic the owner
called "amazing".

---

## 6. Targets for the 4x layouts

The approved work is ~4× lap length. What the previewer should report when it
is done:

### Comeback City 4x

| target | value | why |
|---|---|---|
| lap length | **~11,700 units** | 45 s at the measured 260 u/s |
| lap time | **~45 s** | 3 laps = ~135 s race — the 2–3 minute track the kart rebalance V2 note is already waiting on |
| corners | **15–25** | MK8's range. At 20 that is a corner every ~585 u |
| radius spread | **80–400 u**, min authored ≥ 72 | 72 is proven drivable (PV W3). The current 111–183 band is why every corner feels alike |
| **longest straight** | **8–10 s** (2,080–2,600 u) | the designated overtaking zone, ~18–22% of the lap, and it must be **one contiguous run** |
| second straight | 4–5 s | somewhere to use an item that is not the main zone |
| beats | **the SAME 13–16, spread out** | not multiplied. 16 beats over 45 s = one every **2.8 s** instead of 0.70 |
| coin rows | scale *with* length (~30) | coins are the continuous layer and should keep their per-second density. One `InstancedMesh`, so ~free |
| corner types | ≥2 hairpins, ≥6 sweepers, ≥2 chicanes | the three shapes exist to do three different jobs |
| handedness | ≥⅓ turning the non-dominant way | both drift directions get used |
| kinks | **0** | the tool fails the sheet if any radius lands under 60 |
| elevation | ≥1 climb, gradient ≤18% | 17–18% is the shipped, proven range |

### Penguin Village 4x

Same shape of targets scaled to 248 u/s (45 s lap ≈ **11,200 u**), plus three
things PV specifically owes:

- a **shortcut** — it has none, so it has no risk/reward decision anywhere;
- at least **two left-handers**, so drift works both ways;
- `crestLaunch: true` on the ice bridge, or a ramp beat at the crest, so the
  signature set piece is something you *play* rather than something you drive
  past.

### Author them with `buildCenterline()`

Waypoints + per-corner fillet radii, not hand-placed points. It is what PV
does, and PV has zero kinks while CC — hand-placed — has two on its start
line. It also makes radius a thing you *state* rather than a thing you
discover afterwards.

### Workflow

1. Author waypoints + radii in a scratch module.
2. `node scripts/track-layout-preview.mjs --file <draft> --speed 260`
3. Read the sheet against the table above. Iterate. This costs seconds, and
   nothing has been built yet.
4. `--compare` the draft against the shipped track to keep scale honest.
5. Only then build geometry, and re-run the previewer afterwards so the JSON
   report goes in the record next to the frames.

A sanity check that the targets are reachable: a 10-waypoint sketch with radii
90–260 solves to 8,976 u / 34.5 s lap / 9 corners / **8.02 s longest straight**
in one pass, with no kinks. The shape of the target is not exotic — the current
tracks are simply small.
