# AAA Kart Rubric — the bar every change is judged against

This is the shared scoring sheet for the `aaa-kart-overhaul` branch. Every
critic agent uses **this** document so that two critics looking at two
different frames apply the same standard.

The reference is **Mario Kart 8 Deluxe** (Switch). Not its art style — its
**quality bar**. We are stylised neon-dusk / arctic-sunset, MK8 is stylised
theme-park. The question is never "does this look like Mario Kart", it is
**"does this look like it was made by a team that cared as much as that team
did"**.

## How to score

Score each **scored** axis 0–10. A frame **passes AAA** only when **every scored
axis is ≥ 8.** There is no total threshold. Anything with a 0–4 on any axis is an
automatic fail regardless of the rest — one broken axis is what a player notices.

**Eleven of the twelve axes are scored.** Axis 11, *Motion & feel*, is
video/telemetry-only and no scorer exists yet, so still-frame critics skip it.
That has been true of every critic report since wave 1; the rule is written down
now rather than newly imposed. Axis numbers are **never renumbered** — ten waves
of history reference them.

The old `total ≥ 88/120` bar was deleted on 2026-08-03 (owner's ruling). It
counted an axis nobody scores, and it was redundant besides: eleven axes each ≥ 8
already forces a total ≥ 88, so the per-axis floor was always the binding
constraint.

**The instrument critics are actually dispatched with is
[docs/AAA_CRITIC_BRIEF.md](AAA_CRITIC_BRIEF.md).** Change the bar there too, or
this document becomes a description of a rule nobody applies — which is exactly
how the 88/120 line survived nine waves.

Be harsh. The default verdict is FAIL. "Pretty good for a web game" is a
FAIL — the whole point is that the web-game excuse is not available. If you
find yourself writing "acceptable", write FAIL instead and say what would
make it good.

| # | Axis | 10/10 means |
|---|------|-------------|
| 1 | **Sky & atmosphere** | Sky fills the entire upper frame with no seams, voids or visible dome edge. Gradient reads as real time-of-day. Distant geometry fades into a haze that matches the sky colour. Clouds/aurora have form and parallax. |
| 2 | **Lighting & grounding** | Every object is lit — you can read form from shading alone. Karts, props and buildings sit on the ground with contact shadows/AO. Key/fill/rim rig is legible. Nothing floats. |
| 3 | **Materials & surface** | Surfaces read as materials, not as colours: asphalt has grain, paint has a specular highlight, snow scatters, metal has a hot rim, rubber is matte. No large flat untextured expanses. |
| 4 | **Track legibility** | At speed you instantly know where the road is, where the racing line goes, where the edge is, and what is off-track. Curbs are 3D and rumble-striped. No decal spaghetti, no z-fighting, no stripes leaking onto terrain. |
| 5 | **Environment craft** | The world looks authored, not scattered. Layered depth (near dressing → mid buildings → far skyline). Landmarks. Density that never repeats visibly. Two tracks read as genuinely different places. |
| 6 | **Kart & driver** | Karts are physical objects: glossy body, matte tyres, metallic trim, visible wheel rotation and steering, driver seated in the seat and reacting. Silhouette reads at 200px. |
| 7 | **VFX** | Effects sell force. Drift sparks stage visibly, boost distorts the frame, impacts hit, dust and surface particles respond to what you're driving on. Nothing reads as floating debris or stray geometry. |
| 8 | **Camera** | Speed is felt through FOV, lag and shake. Camera leads drifts, settles on landing, keeps the horizon stable, and frames the kart at a consistent screen position with a readable amount of road ahead. |
| 9 | **Post & grade** | The frame has a considered look: bloom only on genuine emitters, coherent colour grade, clean anti-aliasing at native-ish resolution, subtle vignette. Never muddy, never blown out, never soft from upscaling. |
| 10 | **HUD** | Clear hierarchy, big readable position/lap, a real item slot, state changes animate. Never a row of identical grey pills. |
| 11 | **Motion & feel** — **NOT SCORED** *(video/telemetry only)* | Acceleration, drift stages, off-road penalty, collisions and landings all read distinctly and satisfyingly. **No scorer exists.** Omit the key; do not guess it from stills. Wiring it is a prerequisite of Phase 5, which is the phase whose work lands on this axis. |
| 12 | **Frame integrity** | No console errors, no popping, no missing meshes, no flicker, no tearing, stable frame pacing. |

## Automatic blockers

Any of these = FAIL, no matter how good the rest is:

- Any part of the frame that renders as an unlit void, a hard dome seam, or the
  clear colour.
- Geometry that a player would read as "broken" — floating sticks, stray
  planes, meshes intersecting the road, decals climbing terrain.
- Karts with no shadow / no contact with the ground.
- Z-fighting or shimmer on the track surface.
- Text or HUD elements clipped by the viewport.
- Console errors during the capture (check `capture-manifest.json`).

## The blind test

When handed a `pair-XX/left.png` + `right.png`:

1. Say which is better and by how much (decisive / clear / slight / a tie).
2. Name the **specific pixels** that decided it. "Left has a real shadow under
   the kart and right has none" is a verdict. "Left looks nicer" is not.
3. Do **not** guess which is the new build; you will not be told and guessing
   biases you. If they are equally good, say tie — a tie means the change
   accomplished nothing and is itself a useful result.

## Reporting format

Every critic returns: per-axis scores for the eleven scored axes, their total,
PASS/FAIL, the automatic blockers found, and a ranked list of the **specific**
next fixes with the file and technique named. Vague feedback wastes an
implementation round.

The exact JSON schema — key names, severity values, and the `total`-equals-sum
check — is in [docs/AAA_CRITIC_BRIEF.md](AAA_CRITIC_BRIEF.md). Emit that shape;
`scripts/aaa-approval-sheet.mjs --critics <json>` consumes it directly.
