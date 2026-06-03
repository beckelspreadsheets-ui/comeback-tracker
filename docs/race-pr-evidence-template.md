# Comeback City Kart Racer PR Evidence Template

Status: copyable template, not completed evidence
Date: 2026-05-20
Source PRD: `docs/comeback-city-kart-racer-prd.md`

## Purpose

Use this template for any PR that claims race quality, camera, drift, visual, performance, mobile, HUD, item, VFX, audio, or first-slice improvement. The PRD requires evidence beyond "it renders" or "tests pass."

Do not claim "kart-racer quality", "dialed in", or equivalent final-quality language unless this template is complete and the relevant manual/design gates are also complete.

## PR Summary

| Field | Value |
| --- | --- |
| PR title | Not filled |
| Branch | Not filled |
| Commit | Not filled |
| Ticket(s) | Not filled |
| Change type | Not filled |
| Primary files changed | Not filled |
| Before failure or reason for change | Not filled |
| Known scope exclusions | Not filled |

## Required Commands

| Command | Result | Timestamp | Notes |
| --- | --- | --- | --- |
| `npm run test:race` | Not run | Not filled | Required unless docs-only. |
| `npm run test:race:browser` | Not run | Not filled | Required for race runtime, visual, camera, performance, HUD, mobile, VFX, audio, or telemetry changes. |
| `npm run build` | Not run | Not filled | Required before implementation PR handoff. |

If any command is not run, state why and do not present the PR as release-ready.

## Screenshot And Capture Evidence

| Required artifact | Path or link | Required when |
| --- | --- | --- |
| Before screenshot or current failure description | Not filled | Every race-quality PR |
| After desktop idle screenshot | Not filled | Every visual/camera/HUD/performance PR |
| After desktop speed/driving screenshot | Not filled | Every race-quality PR |
| After desktop drift screenshot or short capture | Not filled | Drift, camera, VFX, or overall race-quality PR |
| After desktop boost/item/rival screenshot as relevant | Not filled | Boost, item, race-drama, or first-slice PR |
| After mobile screenshot or capture | Not filled | Touch, camera, HUD, mobile, layout, or V1-quality PR |
| WebGL fallback screenshot or result | Not filled | Renderer/fallback/navigation changes |

## Browser Summary Artifacts

| Field | Value |
| --- | --- |
| Browser summary path | Not filled |
| `capturedAt` | Not filled |
| Race count | Not filled |
| Focused visual/control/fallback check count | Not filled |
| Git branch/commit in summary | Not filled |
| Relevant telemetry JSON paths | Not filled |

## Telemetry Summary

Fill only fields relevant to the PR, but include every field required by the changed area.

| Metric | Before | After | Pass target |
| --- | --- | --- | --- |
| Desktop actual FPS | Not filled | Not filled | `55` target, `45` local floor unless owner changes target |
| Desktop frame work | Not filled | Not filled | Must support FPS target |
| Mobile FPS | Not filled | Not filled | `30+` on agreed device/profile |
| Kart height ratio | Not filled | Not filled | Desktop normal `0.14`-`0.24` |
| Kart bottom/center placement | Not filled | Not filled | Match PRD or approved `RACE-001` target |
| Road-ahead coverage | Not filled | Not filled | `>= 0.45` |
| Route lookahead seconds | Not filled | Not filled | `1.0`-`1.5s` during normal speed |
| Camera clip count | Not filled | Not filled | `0` unresolved clips |
| Camera avoidance count | Not filled | Not filled | Informational unless clipping occurs |
| Visible rivals | Not filled | Not filled | `>= 3` in normal play sample |
| Drift tier seen | Not filled | Not filled | `>= 1` for drift PRs; Tier 2 evidence for V1 drift review |
| Boost source/effect | Not filled | Not filled | Source and visible speed/FOV response |
| Held item / item pickup | Not filled | Not filled | Required for item PRs |
| Stuck recovery count/result | Not filled | Not filled | Required for collision/recovery PRs |
| Reduced motion state | Not filled | Not filled | Required for VFX/camera/HUD motion PRs |
| Audio muted state | Not filled | Not filled | Required for audio/HUD audio PRs |

## Manual Or Review Evidence

| Review | Result | Artifact or notes |
| --- | --- | --- |
| Desktop keyboard manual run | Not run | Required before V1 sign-off or control/feel claims. |
| Mobile touch manual run | Not run | Required before mobile/V1 sign-off. |
| Fresh-user 10 second read | Not run | Required before first-impression/V1 sign-off. |
| Product/design visual review | Not run | Required for `RACE-001`, `RACE-006`, visual polish, HUD, and V1 claims. |
| IP/provenance review | Not run | Required before release or item/name/art/audio claims. |

## Regression Checks

Confirm the PR does not regress these unless the owner explicitly accepted the tradeoff.

| Gate | Status | Notes |
| --- | --- | --- |
| Existing browser visual checks still pass | Not checked | Not filled |
| Kart size remains in range | Not checked | Not filled |
| Road ahead remains visible | Not checked | Not filled |
| Camera clip count remains zero | Not checked | Not filled |
| HUD does not overlap kart or protected road focus | Not checked | Not filled |
| At least 3 rivals visible in normal-driving gate | Not checked | Not filled |
| Reduced motion behavior preserved | Not checked | Not filled |
| Audio mute behavior preserved | Not checked | Not filled |
| WebGL fallback still works | Not checked | Not filled |
| No unreviewed binary art/audio introduced | Not checked | Not filled |

## Known Remaining Issues

| Issue | Severity | Owner | Follow-up |
| --- | --- | --- | --- |
| Not filled | Not filled | Not filled | Not filled |

## Claim Guardrails

Use cautious language if any of these are missing:

- Owner-approved `RACE-001` target.
- Desktop FPS gate.
- Manual desktop keyboard run.
- Manual mobile touch run.
- Fresh-user 10 second read.
- IP/provenance sign-off.
- Manual QA score `4+` in every category.

Safe wording for partial work:

```text
This PR improves/proves [specific area] under [specific evidence]. It does not claim Kart Racer V1 quality because [remaining blockers].
```
