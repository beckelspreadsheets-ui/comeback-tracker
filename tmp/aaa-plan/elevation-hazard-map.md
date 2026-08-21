# Elevation hazard map (AAA item 7) — mapped 2026-08-20

**Core fact:** the runtime is a **2D (X/Z) simulation with Y applied only at
render time**. Physics steps in X/Z; `progress`/`lane` are recovered by
projecting X/Z onto the spline; every object's height is a lookup
`elevationAt(progress)`. So MOST things auto-follow elevation — but the ground
plane, the bridge understructure, and several tools assume "everything except
the one bridge band is at Y≈0." That assumption is what a rolling grade breaks.

Two false friends: `raceGrade.js` is a COLOR grade (post), not terrain. The
`grounding` telemetry field is SHADOW-rig data, not physics ground contact.

## Where elevation is authored
- `ComebackCityThreeKartRace.jsx:930-940` — `makeElevation`: one half-sine hump
  inside `bridgeBand`, 0 elsewhere. `Math.sin(t*π)*band.peak`.
- Per-track constants: `comebackCity.js:52-56` (peak 40, from .785 to .865),
  `penguinVillage.js:221` (peak 28, from .1665 to .2136). Both `crestLaunch:true`.
- **Duplicated** in `track-layout-preview.mjs:242-255` (must stay in lockstep)
  and `scripts/blender/export-spike-segment.mjs:15`.

## Auto-follows elevation (SAFE — Y is never hardcoded on these)
Road mesh + normals (`computeVertexNormals`), kart & rival Y (`updateVehiclePose`
`:10273`, kart Y = `elevationAt(progress)+0.05+hop`), contact/shadow patch,
chase camera height/floor/subject (elevation-aware BY DESIGN, `:12449-12457`
with a dedicated `heightAlpha` vertical damp), coins/boxes/pads/ramps/paint/
apron, scenery districts, shadow frustum + far-field grounding band (derived
from `courseMinY/courseMaxY` over 96 samples), minimap (2D, Y ignored).

## Will BREAK or needs work (the real cost of item 7)
1. **Flat infield ground plane at `y=-0.06`** (`:4557`) — one rotated plane with
   only ±0.3 relief. #1 sink/clip hazard. The code documents the assumption
   (`:4388-4392`): "a metre of real relief would sink the snowmen and float the
   barrels." Rolling road ⇒ ground must become a heightfield that follows a
   TERRAIN grade — which is DIFFERENT from the road grade (the bridge is a deck
   over a gap; ground must NOT rise to the deck).
2. **Viaduct understructure** (skirt/pillars/`onLowerRoad`, `:5100-5220`) keyed
   to `bridgeBand` and assumes flat ~y0 beneath. Grade outside the band gets no
   support geometry → floating road.
3. **No physics grade cost / gravity** — free-body integrates X/Z at `speed`
   with no Y climb (`:10933-10949`). 3D `sampler.length` grows with grade while
   lap time barely moves ⇒ **MEAN_SPEED constants (247.1/240.7) + difficulty
   tuning drift** and must be re-measured (`measure-mean-speed.mjs`,
   `TELEMETRY_MATCH_PCT` rejects >12% length/lap divergence).
4. **Previewer `maxGradientPct`** (`track-layout-preview.mjs:1520`) is
   sine-bump-only → garbage on rolling grade. It is also the ONLY safety metric
   (the <17-18% gradient budget). No hard gate fails on it, so it only *surfaces*
   a bad change, never blocks it.
5. **Airborne scripted at crest/ramp only** (`:10727-10743`); kart body never
   pitches to grade (`group.rotation.x` is air+wobble only, `:10295`). New hills
   won't launch or tilt the kart.
6. Minor: double elevation parameterization (index-fraction `:982` vs arc-length
   `:1033`), flattened sampler tangent (`:1035`), 96/100-sample profile
   resolution, and the parallel `createRacePickups`/`racePlayerFrame` stack's
   absolute Y (NOT the monolith, but graded-track-hostile).

**No test in `race-content-playtest.mjs` catches broken monolith grounding.**
The previewer's `lengthUnits`/`peakHeight` report is the only tripwire, and it
does not hard-fail.

## Verdict + decomposition
Item 7 is NOT a one-file, fire-and-forget wave — it is a multi-system redesign,
and the GRADE SHAPE (where hills go, how steep, how it changes track feel) is an
OWNER art-direction call, the same class as the owner-confirmed neon-dusk grade
and arctic sunset. Firing an unattended rolling-grade wave risks a broken,
unverifiable grounding/render change (standing rules 5, 12) with no automated
tripwire to catch it.

Safe slice order for when item 7 is taken up (each verified alone):
- **7a. Terrain heightfield** — make the infield ground plane follow a coarse
  TERRAIN elevation function (distinct from the road/bridge function) so the
  ground can roll with the road without rising to the bridge deck. Verifiable:
  capture both tracks, confirm ground sits just under the road everywhere incl.
  the bridge gap.
- **7b. Understructure generalization** — support geometry for graded road
  outside `bridgeBand` (or author grade only where the existing understructure
  or the terrain supports it).
- **7c. Road grade authoring** (OWNER design input) — the actual rolling profile
  per track, replacing the single sine bump; update the duplicated previewer
  `makeElevation` + `maxGradientPct` in lockstep.
- **7d. Physics + calibration** — optional grade speed cost; re-measure
  MEAN_SPEED and re-tune difficulty; extend airborne/pitch to new crests.

Full agent map: this file. Reproduced 2026-08-20; ~680s of investigation.
