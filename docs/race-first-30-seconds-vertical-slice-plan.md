# Comeback City GP First 30 Seconds Vertical Slice Plan

Status: current-state plan and evidence map, not design sign-off
Date: 2026-05-20
Source PRD: `docs/comeback-city-kart-racer-prd.md`
Ticket: `RACE-006`

## Objective

Make the opening stretch of Comeback City GP prove the kart-racer promise quickly: start line, first straight, first boost, first item, first drift turn, first district landmark, clear branch language, visible rivals, and no empty-plane read.

This document does not claim `RACE-006` is complete. It defines the slice, current authored data, existing automated evidence, and the missing evidence needed before sign-off.

## Authored Slice Data

Current source of truth:

- `src/game/courseV2.js`
- `src/game/raceTracks.js`
- `tmp/race-playtests/race-browser-playtest-summary.json`

| Sequence | Current authored marker | Evidence status |
| --- | --- | --- |
| Start boulevard | `startProgress: 0.012`; road ribbon `start-boulevard` from `0.00` to `0.13`, width `52`. | Authored |
| First boost pad | `start-boulevard-pad` at progress `0.055`, side `0`. | Authored and browser-tested |
| First item boxes | Item boxes at progress `0.09` and `0.19`. | Authored and browser-tested |
| First landmark | Gym district anchor at progress `0.18`, side `1`, label `GYM`, icon `dumbbell`. | Authored; needs design/readability review |
| First hazard/readability test | `city-food-wet-strip` at progress `0.18`; `city-crosswalk-pulse` at progress `0.28`. | Authored; mechanic samples exist, route readability not signed off |
| First boost after landmark | `gym-exit-pad` at progress `0.215`, side `0.18`. | Authored |
| First branch cue | `food-court-cut` decision cue at progress `0.242`; branch starts at `0.285`; label `FOOD FORK`; lead time `2.35s`. | Authored and branch screenshot exists |
| First drift-friendly turn | `gym-sweeper` road ribbon from `0.13` to `0.28`; branch/food fork follows at `0.28` to `0.43`. | Authored; manual drift readability not signed off |
| Second district landmark | Food district anchor at progress `0.31`, side `-1`, label `FOOD COURT`, icon `utensils`. | Authored; needs design/readability review |
| Optional shortcut | `food-court-cut`, width `34`, start `0.285`, end `0.395`, entry side `-1`. | Authored; shortcut usefulness/readability not signed off |

## Current Automated Evidence

Latest browser summary: `.agent/runs/kart-racer-production-readiness/evidence/perf-003-20260523T192252Z/race-browser-playtest-summary.json`

Latest capture: `2026-05-23T19:27:29.195Z`

| Scenario | What it proves | Current artifact |
| --- | --- | --- |
| Desktop idle | Start camera/kart framing, nonblank scene, HUD overlap gate. | `tmp/race-playtests/visual-comeback-city-desktop-idle.png` |
| Desktop driving | Road-ahead, route lookahead, visible rivals, HUD overlap gate during motion. | `tmp/race-playtests/visual-comeback-city-desktop-driving.png` |
| Desktop boost-pad mechanics | Real boost pad activation with source `pad`, speed delta, boosted FOV. | `tmp/race-playtests/visual-comeback-city-desktop-boost-pad-mechanics.png` |
| Desktop item-box mechanics | Real item-box pickup path, held item, pickup delay. | `tmp/race-playtests/visual-comeback-city-desktop-item-box-mechanics.png` |
| Desktop drift mechanics | Hop, drift start, Tier 2 charge, drift-release boost source. | `tmp/race-playtests/visual-comeback-city-desktop-drift-mechanics.png` |
| Desktop turn approach | Route lookahead and turn approach framing. | `tmp/race-playtests/visual-comeback-city-desktop-turn-approach.png` |
| Desktop branch decision | Food branch visibility gate. | `tmp/race-playtests/visual-comeback-city-desktop-branch-decision.png` |
| Desktop opening sequence | Continuous start-to-branch sample proving route progress through the food-court cue, route lookahead, branch visibility, three-rival visibility, kart framing, road-ahead coverage, and zero unresolved camera clips. | `tmp/race-playtests/visual-comeback-city-desktop-opening-sequence.png` |
| Desktop rival cluster | Three-rival visibility in a populated race view. | `tmp/race-playtests/visual-comeback-city-desktop-rival-cluster.png` |
| Mobile driving | Mobile camera/kart framing and visible rivals. | `tmp/race-playtests/visual-comeback-city-mobile-driving.png` |

Representative telemetry from the latest capture:

| Scenario | Key telemetry |
| --- | --- |
| Desktop driving | `actualFps: 42.2`, `kartHeightRatio: 0.182`, `roadAheadCoverage: 1.0`, `routeLookaheadSeconds: 1.333`, `visibleRivals: 3`, `cameraClipCount: 0`. |
| Desktop boost-pad mechanics | `actualFps: 37.7`, `kartHeightRatio: 0.173`, `roadAheadCoverage: 1.0`, `boostSource: pad`, `cameraClipCount: 0`. |
| Desktop item-box mechanics | `actualFps: 39.7`, `kartHeightRatio: 0.225`, `roadAheadCoverage: 1.0`, `heldItemKey: invincibility`, `itemBoxPickupDelay: 0.16`, `cameraClipCount: 0`. |
| Desktop drift mechanics | `actualFps: 37.5`, `kartHeightRatio: 0.191`, `roadAheadCoverage: 1.0`, `driftTierSeen: 2`, `boostSource: drift`, `cameraClipCount: 0`. |
| Desktop branch decision | `actualFps: 32.9`, `kartHeightRatio: 0.186`, `roadAheadCoverage: 1.0`, `routeLookaheadSeconds: 1.333`, `cameraClipCount: 0`. |
| Desktop opening sequence | `actualFps: 11.5`, `playerProgress: 0.247`, `kartHeightRatio: 0.170`, `roadAheadCoverage: 1.0`, `routeLookaheadSeconds: 1.333`, `visibleRivalsSeen: 3`, `cameraAvoidanceCount: 13`, `cameraClipCount: 0`. |
| Mobile driving | `actualFps: 33.8`, `kartHeightRatio: 0.198`, `roadAheadCoverage: 1.0`, `routeLookaheadSeconds: 1.417`, `visibleRivals: 3`, `cameraClipCount: 0`. |

## Acceptance Gaps

| Gap | Why current evidence is insufficient | Required evidence |
| --- | --- | --- |
| First-lap route readability | Browser scenarios now include a continuous opening sample through progress `0.249`, but they still do not prove that a new player can follow the first lap without minimap. | Manual first-lap run by someone without route knowledge, with notes and screenshot/capture. |
| District landmark readability | District anchors are authored, but no design review confirms Gym/Food Court read from the chase camera. | Desktop and mobile screenshots or short clips with reviewer notes for district identity. |
| Object density/no empty-plane read | Screenshot variance proves nonblank output, not product-level density or composition quality. | Design review against the approved `RACE-001` visual target. |
| First drift turn feel | Drift mechanics are proven in a staged scenario, but not judged in the natural first turn sequence. | Manual keyboard playthrough notes for initiating, holding, and releasing drift through the opening turn. |
| Shortcut clarity | Branch decision gate proves a branch is visible, not that it reads as optional and risk/reward. | Manual first-lap review plus screenshot at food-court decision cue. |
| Desktop FPS | Current first-slice scenarios include desktop driving `42.2`, branch decision `32.9`, opening sequence `11.5`, and item-box mechanics `39.7`. | Performance work before V1 sign-off; local minimum is `45`, PRD target is `55`. |
| Mobile touch play | Mobile driving snapshot passes framing, but no mobile touch completion exists. | Manual mobile/touch first-lap or full-race result. |

## RACE-006 Completion Checklist

Do not mark `RACE-006` complete until all rows are proven.

| Requirement | Automated evidence | Manual/design evidence | Status |
| --- | --- | --- | --- |
| Start line/start boulevard reads as a race start | Desktop idle screenshot exists. | Owner/design review missing. | Partial |
| First straight shows route, rivals, and HUD without blocking view | Desktop driving and opening-sequence screenshots/telemetry exist. | Manual first-lap review missing. | Partial |
| First boost pad is visible and works | Boost-pad mechanics screenshot and telemetry exist. | Visual/readability review missing. | Partial |
| First item box is visible and works | Item-box mechanics screenshot and telemetry exist. | Visual/readability review missing. | Partial |
| First drift opportunity supports hop/charge/release | Drift mechanics screenshot and telemetry exist. | Natural first-turn feel review missing. | Partial |
| First district landmark is recognizable | Gym/Food anchors are authored. | Chase-camera landmark review missing. | Partial |
| Food Court shortcut is visible but optional | Branch-decision and opening-sequence screenshots/telemetry exist. | Risk/reward readability review missing. | Partial |
| No large empty plane dominates opening camera | Screenshot variance exists. | Design target review missing. | Not proven |
| Desktop performance is acceptable | Current evidence contradicts the FPS gate. | Performance sign-off missing. | Failing |
| Mobile opening is playable | Mobile driving snapshot exists. | Touch playthrough missing. | Partial |

## Recommended Next Work

1. Keep the authored opening sequence, because it already maps to the PRD learning order: start, boost, item, drift/turn, landmark, branch.
2. Review the new opening-sequence screenshot and telemetry with product/design before treating it as first-slice sign-off evidence.
3. Add HUD/apex/item-box overlap checks for the opening branch and item-box moments if product/design wants stricter evidence than the current protected road-focus rect.
4. Do not claim first-lap readability until a manual player can follow the opening without minimap or prior route knowledge.
5. Do not claim V1 slice quality until desktop FPS and `RACE-001` target-review blockers are resolved.
