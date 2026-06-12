# Comeback City Arcade Kart Art Bible

## Purpose
`/#race` must read as a premium arcade kart racer, not a static city screenshot with sprites on top. Use these sheets as the production visual source of truth before generating or implementing new race assets.

## Trait Sheets
- `player-kart-trait-sheet-v1.png`: red hero kart proportions, rear chase silhouette, boost/flame language, cyan tail-light accents.
- `rival-kart-family-trait-sheet-v1.png`: rival color families, vehicle silhouettes, and opponent readability rules.
- `comeback-city-world-trait-sheet-v1.png`: modular track/world direction, district portals, road modules, finish gate, and parallax layer language.
- `pickups-vfx-trait-sheet-v1.png`: item boxes, boost pads, drift sparks, shield/coin/burst effects, and animation-strip language.
- `hud-controls-trait-sheet-v1.png`: compact racing HUD, mobile controls, meters, countdown, and result-panel direction.

## Visual Rules
- Build the playable route from separate moving assets: road modules, district side layers, player kart states, rivals, pickups, VFX, finish gate, and DOM HUD.
- The road must visibly scroll and curve through layered modules. A single full-screen screenshot cannot be the gameplay world.
- The player kart must dominate the lower third in desktop and portrait, with strong rear silhouette, tire mass, cyan rear lights, exhaust glow, and boost state.
- Rivals must be readable as real vehicles at distance, not icons or markers. Use scale, lane position, shadow, and road contact to communicate depth.
- Pickups and boost pads must be in-world game objects with glow/shadow/contact, not floating placeholders.
- VFX must confirm controls visibly: acceleration exhaust, braking deceleration, steering lean/lane shift, drift sparks, mini-turbo burst, boost streaks, item pickup flash, finish crossing.
- HUD stays compact and readable, with no large overlays covering the kart or road action.

## Generation Rules
- Generate sprite sheets on removable chroma-key backgrounds when assets need transparency.
- Keep designs original and generic. Do not reference or copy Nintendo, Mario Kart, or other franchise characters, logos, tracks, or UI.
- Prefer consistent material language: glossy toy-like body panels, chunky tires, saturated district colors, cyan tech glow, warm orange boost/fire accents.
- Every generated sheet must be inspected before implementation. Reject outputs with bad text, broken wheels, unreadable silhouettes, inconsistent perspective, or non-uniform chroma backgrounds.

## Runtime Acceptance
- `/#race` is acceptable only when gameplay motion is visible without reading telemetry.
- The camera must feel like it is moving through a layered track: road scroll, foreground module movement, rival motion, pickup approach, player lean, and VFX must all change independently.
- QA screenshots and videos must show idle, acceleration, steering, drift, boost/item, and finish states.
