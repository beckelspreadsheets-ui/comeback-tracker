# Comeback City Kart Racer Visual Target Brief

Status: approved owner visual reference, manual product/design sign-off still pending
Date: 2026-06-01
Source PRD: `docs/comeback-city-kart-racer-prd.md`

## Blocker

`RACE-001` requires an owner-selected target screenshot or capture. The owner supplied the original ChatGPT Image Gen 2 screenshot already created for the project, with no external resource and all production bitmap assets made with ChatGPT Image Gen 2. The repo-local target path is `src/assets/game/reference/comeback-city-original-reference.png`, and the file is present with SHA-256 `8d4aef74073da4c86b5360163478b978fe5c3101371bc7a8d18d7390e4003c55`.

Use this reference as the composition target for art, camera, HUD, district identity, and first-impression tuning. Current browser screenshots can be used as before/after evidence against this target, not as replacement target input.

## Owner Input Required

| Field | Owner-provided value | Notes |
| --- | --- | --- |
| Target screenshot/capture | Approved: original ChatGPT Image Gen 2 screenshot created for this project at `src/assets/game/reference/comeback-city-original-reference.png`. | `npm run test:visual` passes with this repo-local reference. Evidence: `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-005-20260601T201921Z/`. |
| Reference source/license | Owner states no external resource and custom ChatGPT Image Gen 2 production art. Production bitmap assets must be custom ChatGPT Image Gen 2 outputs; repo-native/code-native/procedural assets are allowed; external stock/game assets are not approved. | Must be safe for composition reference and not copied from protected assets. |
| Target viewport | Equal desktop and mobile. | Supplied by owner in chat on 2026-05-29. |
| Target browser baseline | Desktop latest two stable Chrome, Edge, Safari, and Firefox; mobile iOS Safari and Android Chrome. | Supplied by owner in chat on 2026-06-01. |
| Target device baseline | iPhone 12+, iPhone SE 2nd generation low-end iOS check, Pixel 6a+, one Windows laptop, and one Mac laptop with integrated graphics. | Supplied by owner in chat on 2026-06-01. |
| Desired kart screen size | Mobile game view target: rear kart centered in the lower third, large enough to read tire/body shape while leaving lane/apex visibility. Use existing PRD ranges as numeric guardrails: desktop normal `14%`-`24%` viewport height; mobile `16%`-`28%`. | Derived from the owner-supplied reference. |
| Horizon placement | Skyline/horizon remains in the upper half with tall buildings and beacon visible; avoid camera pitches that bury the skyline or hide the road. | Derived from the owner-supplied reference. |
| Road visibility | Broad road-ahead visibility through the center/lower middle of the frame; route, lane edges, boost/item affordances, and next district landmark stay readable. | Derived from the owner-supplied reference. |
| Object density | Dense but readable city: foreground road/water/bridge, midground district portals and streets, background skyline/mountains/clouds. Avoid empty flat-plane reads. | Derived from the owner-supplied reference. |
| HUD placement | Compact arcade HUD: objective/status near top/upper side, minimap bottom left, action/go control bottom right, resource counters near top edge. HUD must not block kart, apex, route, item boxes, or rivals. | Derived from the owner-supplied reference. |
| Color and lighting notes | Bright high-saturation low-poly arcade city. District color identities: Gym green, Food Court orange, Lab purple, Clinic red, Garage blue. Use cyan/blue beacon glow, warm daylight, crisp white labels, and dark navy translucent HUD panels. | Original Comeback City look; do not copy exact protected UI, trade dress, characters, logos, sounds, item shapes, tracks, screenshots, names, or protected assets. |
| Desktop/mobile priority | Equal desktop and mobile. | Supplied by owner in chat on 2026-05-29. |
| V1 vehicle scope | Kart and hover-plane modes in scope on separate tracks. | Supplied by owner in chat on 2026-05-29. |
| Item/audio scope | Items and audio are required. | Supplied by owner in chat on 2026-05-29. |
| Progression scope | City/progression integration is required. | Supplied by owner in chat on 2026-05-29. |
| Manual QA sign-off role | Owner only. | Supplied by owner in chat on 2026-06-01. |

## PRD Defaults Pending Confirmation

These are PRD targets, not owner-approved composition choices:

| Area | PRD default |
| --- | --- |
| Kart size | Desktop normal driving `14%`-`24%`; desktop boost `12%`-`22%`; mobile `16%`-`28%`. |
| Kart vertical placement | Kart bottom around `70%`-`84%` from top on desktop. |
| Camera lookahead | Show `1.0`-`1.5s` of road at current speed. |
| FOV | `62`-`72` degrees depending on speed and boost. |
| Road-ahead coverage | At least `45%` lower/middle viewport during racing. |
| Rival visibility | At least `3` rivals visible during normal play. |
| Performance | Desktop target `55`-`60 FPS`, ordinary laptop `45+ FPS`, modern phone `30+ FPS`. |

## IP Boundary

Use kart-racer genre quality as a benchmark for readability, camera behavior, drift/boost feel, and arcade polish only. The owner approved genre-familiar UI style and readability, but not exact/protected UI. Treat this as permission to use common arcade racing UI patterns, not permission to copy Nintendo/Mario Kart trade dress.

Do not copy Nintendo characters, tracks, layouts, items, icons, exact UI compositions, music, sound effects, names, screenshots, asset traces, or branded visual assets. Production characters, logos, sounds, and item shapes must be original Comeback City work. Production bitmap assets must be custom ChatGPT Image Gen 2 outputs; repo-native/code-native/procedural assets are allowed; external stock/game assets are not approved.

## Reference Composition Targets

| Area | Target |
| --- | --- |
| Desktop plaza | 16:9 overview with Comeback City logo, central roundabout/objective beacon, all five districts visible, layered skyline, water/bridge foreground, and no empty-plane read. |
| Mobile race | Portrait rear-kart game view, kart centered low, road vanishing through the middle, district landmarks visible ahead, minimap bottom left, action/go control bottom right, and compact counters/objective panels near top/side edges. |
| Districts | Gym, Food Court, Lab, Clinic, and Garage each need a clear sign/icon, unique color identity, portal glow, and readable facade silhouette. |
| Kart | Chunky red/black/white kart with cyan lights, oversized tires, clear front/side/back/top readability, and no protected character or brand shape. |
| HUD | Dark navy translucent panel language, crisp white labels, bright district icons, yellow route/action accents, and original Comeback City layout. |

## Current-State Evidence, Not Target

Latest automated visual evidence is recorded in `.agent/runs/kart-racer-production-readiness/evidence/perf-003-20260523T192252Z/race-browser-playtest-summary.json` from `2026-05-23T19:27:29.195Z`.

Representative current screenshots:

| Scenario | Artifact |
| --- | --- |
| Desktop idle | `tmp/race-playtests/visual-comeback-city-desktop-idle.png` |
| Desktop driving | `tmp/race-playtests/visual-comeback-city-desktop-driving.png` |
| Desktop drift | `tmp/race-playtests/visual-comeback-city-desktop-drift.png` |
| Mobile driving | `tmp/race-playtests/visual-comeback-city-mobile-driving.png` |

These artifacts prove current harness coverage only. They do not define the desired visual target.

## Approval Gate

This brief is actionable for visual implementation. R3 still requires owner manual QA/design sign-off, target-browser/device evidence, and all production deployment evidence.
