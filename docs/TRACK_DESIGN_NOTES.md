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

It also **gates**, rather than merely reporting: the curve maths is asserted
against shipped ground truth (§3) and every road segment's value separation from
its terrain is asserted against a measured frame (§7). Either one failing exits
non-zero.

---

## 2. Running it

```bash
node scripts/track-layout-preview.mjs                              # both shipped tracks
node scripts/track-layout-preview.mjs --track penguin-village      # one track
node scripts/track-layout-preview.mjs --compare comeback-city,penguin-village
node scripts/track-layout-preview.mjs --file tmp/my-draft.mjs      # unregistered draft
node scripts/track-layout-preview.mjs --json-only                  # no browser
node scripts/track-layout-preview.mjs --speed 300                  # what-if on mean speed
node scripts/track-layout-preview.mjs --strict-contrast            # no kerb-only segments, no baselined debt
```

**The run exits non-zero** if the curve maths disagrees with shipped ground
truth (§3) or if any road segment is illegible against its terrain (§7). Both
are gates, not advice.

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
| **red** road fill + `N% VALUE` | segment the driver cannot separate from the terrain — a new failure (§7) |
| orange road fill + `N% VALUE` | same, but already baselined against a shipped track |
| faint amber road tint | segment that reads only because of its painted kerb |

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

### The findings that matter

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
| **road vs terrain value** | **≥20% on every segment**, i.e. `--strict-contrast` passes | §7. Both shipped tracks fail this; authoring 4× more track without fixing it multiplies the defect by four |

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
5. Once the layout is settled, author the palette and re-run with
   `--strict-contrast` (§7) — a road nobody can find is not something to
   discover from a capture two waves later.
6. Only then build geometry, and re-run the previewer afterwards so the JSON
   report goes in the record next to the frames.

A sanity check that the targets are reachable: a 10-waypoint sketch with radii
90–260 solves to 8,976 u / 34.5 s lap / 9 corners / **8.02 s longest straight**
in one pass, with no kinks. The shape of the target is not exotic — the current
tracks are simply small.

---

## 7. The road/terrain value gate

### The failure it exists to stop

`penguin-village-p0_33` shipped with the drivable pond at luminance **152.7**
against a **151.0** snow shoulder. That is 1% separation on a 229 km/h corner.
The monolith's own road-mesh comment records the measurement; three independent
wave-6 critics then read the frame and none of them could say where the track
was. The only remaining cue was a thin barrier stripe.

That defect is invisible in every other check we run. It is not a geometry bug,
not a perf bug, not a console error, and the layout numbers on this sheet are
all perfectly healthy for that segment. It is a **value** bug, and it is the one
class of authoring mistake that gets four times worse when the track gets four
times longer. So the previewer measures it, and **fails the run**.

### What it measures

For every segment — cut at each road-ribbon boundary and each surface-band
boundary, never on a fixed grid, because a fixed grid straddles exactly the
discontinuity you are looking for — the tool resolves:

- **road value**: the asphalt map's *mean* colour (base composited with its
  speckle sets at their true coverage, because a road at speed mips to its mean,
  not to its base hex), times `SURFACE_ROAD_TINT` for the surface, times the
  baked edge-shade, plus the additive sheen (below). Sampled on **three lanes** —
  centre and both edges at ±0.9 — and the **worst** one is the verdict, because
  Penguin Village's pond is ice down the middle and snow at the edges and both
  have to read.
- **terrain value**: `palette.ground`'s mean colour as a **band**, not a number:
  the ground's vertex mottle is `0.72 + noise*0.62`, so the field occupies a
  range of values and the road only reads if it separates from the part of that
  range it is standing next to.
- **kerb** and **run-off apron**, reported separately.

Separation is Weber contrast, `|a−b| ÷ brighter`, on **display-encoded** luma
(Rec.709 on sRGB bytes). Not deltaE and not linear light: the failure being
gated is a value failure, hue separation does not survive fog or the grade, and
sRGB-byte luma is the unit every critic and every capture assertion in this
programme already measures in. The bar is **20%**.

### The one calibrated constant

The ice band's albedo solves to a luminance of **37.3** — nearly black — yet it
renders at 152.7, because the hard-edged specular injected into the road
material is **additive and albedo-independent**. Without that term the model
would call the pond a high-contrast surface and wave the defect straight
through. `SHEEN_SPECULAR_LIFT = 136` is solved from the shipped frame: the
snowfield's authored value is 199 and it renders at 171, so that scene's own
exposure is 0.877, and the lift is `(152.7 − 0.877×37.3) ÷ 0.877`.

The result: predicted separation at `p0.33` is **8.6%** against the **10.7%**
the pixels give. It reads slightly high, for the reason in "what the model does
not include" below, and it lands on the same side of the 20% bar — which is the
assertion the run actually makes.

Only `sheen = 1` is measured. Snow (0.14) and slipZone (0.75) are interpolated
linearly and are **not** validated.

### Verdicts

| verdict | meaning |
|---|---|
| `pass` | the road surface separates from the terrain band by ≥20% on its own |
| `edge-only` | it does not, but a **single kerb colour** separates ≥20% from *both* the road and the terrain. Reported, not failed |
| `known-debt` | fails, and is baselined against a shipped track with the frame that proves it |
| `fail` | fails and is new. **Exits non-zero.** |

The `edge-only` tier is a deliberate departure from the literal rule, and here
is the evidence for it. The literal rule fails **Comeback City on all seven
segments**: its road solves to 46.9 against a 38.5–43.4 verge, i.e. 8%. That
measurement is correct — the road and the verge really are the same value — but
Comeback City is the owner-confirmed reference build and no critic in six waves
has called its road hard to find. What carries it is visible in every frame: a
continuous red/white kerb (126 and 251) plus a white edge line, running the
entire lap. A painted boundary is a legitimate legibility device and MK8 leans
on it constantly. A gate that painted the reference track red on every segment
would simply be switched off.

But a kerb only rescues a segment if the *same colour* differs from both sides.
Penguin Village's pond has a kerb too and it does not qualify: the white tooth
(250) is 17% off a 208 snowfield and the cyan tooth (159) is 8% off the 173 ice.
A white kerb on a white field is not an edge. The frame agrees, and so do the
palette's own comments.

So today: **Comeback City = 7 kerb-only, Penguin Village = 3 pass + the pond as
known debt.** Run `--strict-contrast` and both fail, which is the bar a new
layout should be authored to.

### What the model does NOT include

Fog (both tracks run `FogExp2`, which pulls road and terrain toward one haze
value), the display grade, bloom, Penguin Village's ground sparkle emissive,
Comeback City's ground relief normals, and any sheen strictly between 0 and 1.

**Every one of those pulls the two surfaces closer together.** The real frame
separation is therefore always **≤** the number this tool reports. Passing the
gate is *necessary, not sufficient* — a passing segment still has to survive a
capture. A failing segment is broken with certainty.

### Fixing a failure

Move the **value**, not the hue — and take the move from the end of the ramp
that is *not* already the background: on a bright track (snow, ice) separate
downward, because the bright end is the field; on a dark track separate upward.
That is the same rule the shipped palettes' own comments arrived at
independently for the kerbs and the run-off shelf, twice.

### Baselining

`KNOWN_CONTRAST_DEBT` in the script keys segments as `<ribbon>@<startProgress>`
and each entry carries the frame that proves it. Adding an entry is how you say
"shipped, known, not this wave" — it is not how you make a new failure quiet.
`CONTRAST_GROUND_TRUTH` is the opposite direction: it asserts the model still
reproduces the measured `pv-p0_33` verdict, and the run fails if the model ever
starts calling that segment legible. If the tool and the pixels disagree, the
tool is wrong.
