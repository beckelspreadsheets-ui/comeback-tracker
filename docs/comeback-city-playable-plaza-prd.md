# Comeback City Playable Plaza PRD

Status: Draft for implementation planning
Date: 2026-05-16
Owner: product/design/engineering

## 1. Purpose

Turn Comeback City from a static-looking reference panel into a playable, visually appealing game hub that makes the fitness tracker feel like a city-scale arcade game.

The immediate product problem is clear: the current `/#visual-plaza` work is a visual verification scene. It is not a playable game scene. The next effort should prioritize interaction, progression, and game feel over screenshot matching.

## 2. Current Code Reality

Relevant files:

- `src/game/WorldMode.jsx`
  - Home currently renders `ReferencePlazaView`, so the first screen behaves like a visual panel with clickable destinations.
  - `WorldScene` is not used in the home path.
- `src/game/WorldScene.jsx`
  - A playable Three.js world already exists: keyboard/touch driving, kart state, camera, nearby destination detection, collision boxes, boost pads, destination groups, route guides, and fallback 2D world.
  - This is the right base for the playable plaza.
- `src/game/worldConfig.js`
  - Existing destination data covers Gym, Food, Home/Base, Lab, Clinic, Garage, and Raceway with positions, entry points, sizes, colors, signs, portal radii, routes, and metadata.
- `src/game/RaceScreen.jsx`
  - Race mode exists and is routeable through `#race`, but currently it is separate from the plaza hub.
- `src/game/ComebackCityScene3D.jsx`
  - Contains the measured reference-panel scene. Keep this for visual regression only; do not make it the gameplay scene.

Conclusion: the best path is not to keep editing `ReferencePlazaView`. The game already has a playable world foundation; the PRD should make that world the primary home experience and raise its game quality.

## 3. Research Inputs

The PRD uses these design principles:

- MDA framework: design the experience from player emotion and dynamics back to mechanics, not from art assets forward. Source: Hunicke, LeBlanc, Zubek, "MDA: A Formal Approach to Game Design and Game Research" - https://www.cs.northwestern.edu/~hunicke/MDA.pdf
- GameFlow: player enjoyment depends on concentration, challenge, skills, control, clear goals, feedback, immersion, and social interaction. Source: Sweetser and Wyeth, "GameFlow: A Model for Evaluating Player Enjoyment in Games" - https://www.valuesatplay.org/wp-content/uploads/2007/09/sweetser.pdf
- Self-Determination Theory: motivation improves when the experience supports autonomy, competence, and relatedness. Source: Ryan and Deci, 2000 - https://selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf
- Apple game onboarding guidance: teach the core loop in short, active steps; let players demonstrate competency; introduce advanced systems later; measure retention and engagement. Source: https://developer.apple.com/app-store/onboarding-for-games/
- Three.js performance guidance: many separate meshes are expensive; merge geometry or use vertex colors/instancing for dense scenery. Source: https://threejs.org/manual/en/optimize-lots-of-objects.html

## 4. Product Vision

Comeback City is the interactive home base for the tracker.

The player drives a small kart/character through a compact city plaza. Each district represents a real tracking function:

- Gym: today workout
- Food Court: nutrition logging
- Lab: calibration and strength data
- Clinic: joints/recovery
- Garage: avatar/kart/settings/upgrades
- Raceway: racing mode and challenges
- Home/Base: body metrics and progress recap

The city should feel like a bright arcade hub: readable landmarks, glowing portals, short routes, satisfying movement, clear mission guidance, and visible progress changes after real tracker actions.

## 5. Goals

1. Replace the home `ReferencePlazaView` with a playable `WorldScene` hub.
2. Make movement feel good on desktop and mobile.
3. Make district selection obvious, fast, and satisfying.
4. Make the city visually appealing at gameplay camera angles.
5. Connect city actions to existing tracker screens and race mode.
6. Give the player clear daily goals and feedback.
7. Preserve `/#visual-plaza` only as a regression/reference route, not as the main game.
8. Keep performance stable on ordinary laptops and phones.

## 6. Non-Goals

- Do not continue pursuing pixel-perfect screenshot matching for the playable hub.
- Do not make the reference panel the gameplay scene.
- Do not rebuild the whole app navigation system in the first playable milestone.
- Do not add multiplayer.
- Do not add external art packs until source/license and bundle impact are approved.

## 7. Target Player Experience

First 10 seconds:

1. Player loads the app.
2. They appear in Comeback City inside a small kart/avatar.
3. A mission beacon points to the most relevant district.
4. The player can immediately drive or tap a district.
5. If they approach a portal, a clear prompt appears: "Enter Gym", "Open Food Court", etc.

First 2 minutes:

1. Player learns move, steer, interact.
2. Player enters the suggested district.
3. Player completes or updates one real tracker action.
4. Returning to the plaza shows visible feedback: beacon changes, lights pulse, XP/credits/progress animates, district status updates.

Daily loop:

1. Check the city.
2. Follow mission beacon or choose a district.
3. Complete tracker action.
4. Earn city feedback, credits, or cosmetic progress.
5. Optionally race or upgrade in Garage.

## 8. Design Pillars

### Pillar 1: The City Is The Menu

Navigation should happen through the city world first. Bottom nav can remain as a fallback, but the primary interaction is driving/tapping to districts.

### Pillar 2: Real Progress Changes The World

Fitness and nutrition progress should affect the city visually:

- Completed workout: Gym lights turn on, crowd/sparks animate, training banner updates.
- Food logged: Food Court stalls glow, daily streak token appears.
- Calibration updated: Lab beacon stabilizes, tubes fill.
- Recovery logged: Clinic shield fills.
- Race won: Raceway flags animate, trophies appear.

### Pillar 3: Fast, Clear, Low-Friction

The app is still a tracker. The hub should make common tasks faster, not slower.

Requirements:

- Tap/click a district to enter without requiring driving.
- Driving to a portal should also work.
- Keyboard and touch controls must be discoverable.
- No long intro before the user can act.

### Pillar 4: Arcade Visual Clarity

The plaza should look good during play, not only in a fixed screenshot.

Visual priorities:

- Distinct silhouettes for each district.
- Strong color coding.
- Readable signs.
- Glowing portals.
- Roads that tell the player where they can drive.
- Dense but organized props.
- Camera framing that keeps destination and player readable.

## 9. Core Gameplay Loop

Primary loop:

1. Spawn in plaza.
2. See active mission beacon.
3. Drive/tap to district.
4. Enter destination.
5. Complete tracker action or challenge.
6. Return to city.
7. Receive feedback and unlock next useful action.

Secondary loop:

1. Earn race credits and streak rewards.
2. Upgrade kart cosmetics or handling.
3. Try raceway challenges.
4. Bring rewards back to plaza visuals.

## 10. Mechanics

### Movement

Desktop:

- `W`/Arrow Up: accelerate
- `S`/Arrow Down: brake/reverse
- `A`/`D` or Arrow Left/Right: steer
- Space: hop/drift
- `E`/Enter: enter nearby district

Mobile:

- Left thumb zone: steer
- Right thumb buttons: accelerate/brake/interact
- Optional tap-to-route: tap district, route guide appears, auto-orient camera toward it

Required feel:

- Immediate response at low speed.
- Gentle drift/hop for arcade feel.
- Low punishment collisions.
- Camera should smooth but not lag enough to cause nausea.

### District Interaction

Districts support three entry methods:

1. Click/tap landmark.
2. Drive into portal radius and press interact.
3. Use bottom nav fallback.

When nearby:

- Portal ring intensifies.
- District name and action appear.
- Route line fades out because the player arrived.

### Mission Guidance

Mission beacon rules:

- Default target: next suggested workout day if incomplete.
- If workout complete but food not logged, target Food Court.
- If calibration data missing, target Lab.
- If joint/recovery state is flagged, target Clinic.
- If race reward available, target Raceway.

The route guide should be visible but not obnoxious:

- Thin glowing path on road.
- Floating arrow markers at turns.
- Beacon above target district.

### Rewards

Rewards should support competence without turning the tracker into a grind.

Initial reward types:

- City XP: persistent progress meter.
- Race credits: already exists, can be expanded.
- District lights: visual state, no balancing risk.
- Cosmetics: kart color, trail color, district banners.

Avoid:

- Punitive decay.
- Dark patterns.
- Long reward modals.

## 11. Visual Direction

Use the reference plaza as inspiration, not as a target plate.

Scene style:

- Saturated arcade colors.
- Chunky stylized 3D buildings.
- Dense midground blocks.
- Curved roads and roundabout.
- Bright sky, soft clouds, mountains.
- Neon portals and beacon.
- Animated environmental details.

Gameplay camera requirements:

- Player always visible.
- Target district visible when guided.
- Low enough angle to show buildings, high enough to drive.
- No UI overlap with player or interact prompts.

District visual requirements:

- Gym: green arena, dumbbell sign, training banners, bright portal.
- Food Court: orange market stalls, awnings, utensils sign, warm lights.
- Lab: purple tower, tubes, flask sign, animated glow.
- Clinic: red/white recovery station, cross/shield sign, soft pulse lights.
- Garage: blue workshop, wide door, tire stacks, wrench sign.
- Raceway: flags, start arch, trophy lights.
- Home/Base: blue clubhouse, progress beacon, daily summary board.

## 12. UX Requirements

HUD:

- Current mission.
- Nearby district prompt.
- Small minimap or compass.
- Progress/reward pulse after actions.
- Controls hint only when needed.

Onboarding:

- No blocking tutorial.
- First-time hints appear contextually:
  - "Drive with WASD or arrows."
  - "Approach a glowing portal."
  - "Press E to enter."
- Hints disappear once demonstrated.
- Help can be reopened.

Accessibility:

- Keyboard-only usable.
- Pointer/touch usable.
- Reduced motion option.
- High contrast prompt text.
- No required precision driving to access core tracker screens.

## 13. Technical Architecture

Recommended implementation:

1. Keep `ReferencePlazaView` only for `/#visual-plaza`.
2. Use `WorldScene` as the home gameplay scene in `WorldMode`.
3. Promote reusable plaza art into a new gameplay-focused module, not the visual reference renderer.
4. Keep destination data in `worldConfig.js`.
5. Add a small `gameHubState` section to persisted state.

Suggested state shape:

```js
game: {
  homeMode: 'world',
  hub: {
    onboardingSeen: boolean,
    lastSpawn: { x: number, z: number, heading: number },
    discoveredDistricts: string[],
    completedHubActions: string[],
    cityXp: number,
    cosmetics: {
      kartPaint: string,
      trailColor: string,
      bannerSet: string,
    },
  },
}
```

Rendering:

- Use merged geometry or instancing for repeated props, trees, windows, cones, lamps.
- Keep per-frame allocations near zero.
- Limit dynamic lights; fake glow with emissive materials/sprites.
- Prefer coarse collision volumes.
- Keep visual-reference JSON out of the gameplay bundle if possible.

## 14. Implementation Plan

### Phase 0: Stop The Confusion

Objective: make routes truthful.

Tasks:

- Rename internal comments so `/#visual-plaza` is clearly "visual reference".
- Add a README note: playable hub is `/`, visual panel is `/#visual-plaza`.
- Add a visible dev label only in visual route if needed: "Reference Panel".

Acceptance:

- User can clearly distinguish game from visual reference.

### Phase 1: Make Home Playable

Objective: replace static home with playable world.

Tasks:

- Import and mount `WorldScene` in `WorldMode` home.
- Preserve `ReferencePlazaView` only for visual route.
- Wire `onEnter`, `onNearbyChange`, active mission, and destination routes.
- Add keyboard/touch interaction prompt.
- Add tap/click district entry fallback.

Acceptance:

- `/` opens an interactive city.
- Player can drive.
- Player can enter Gym, Food Court, Lab, Clinic, Garage, Raceway, and Home/Base.
- `/#visual-plaza` still works as visual test route.

### Phase 2: Gameplay Camera And Controls

Objective: make the hub feel good.

Tasks:

- Tune acceleration, braking, turn radius, drift, collision softness.
- Tune camera follow, target lookahead, zoom, and mobile framing.
- Add route guidance to active mission.
- Add collision/debug overlay behind a dev flag.

Acceptance:

- New user can reach a district in under 15 seconds.
- Player never loses sight of the kart.
- Interact prompt appears reliably.
- Movement works on keyboard and touch.

### Phase 3: Visual Upgrade

Objective: make the playable city attractive without screenshot matching.

Tasks:

- Rebuild district landmarks as gameplay-scale stylized models.
- Add road network, roundabout, sidewalks, bridges, water, props.
- Add skyline/mountains/clouds as background depth.
- Add district-specific animations and portal effects.
- Add day-progress lighting states.

Acceptance:

- Each district is recognizable from gameplay camera.
- City feels dense, colorful, and intentional.
- No large empty flat areas near main routes.
- Performance remains stable.

### Phase 4: Progression And Feedback

Objective: make tracker actions change the city.

Tasks:

- Add city XP/reward pulse.
- Update district visuals based on tracker state.
- Add post-action return feedback.
- Connect race credits/cosmetics to Garage.
- Add daily mission completion sequence.

Acceptance:

- Completing a workout visibly updates Gym/city state.
- Logging food visibly updates Food Court.
- Race results feed back into plaza/Raceway/Garage.
- Player understands what changed.

### Phase 5: Polish, Testing, And Release

Objective: make it shippable.

Tasks:

- Add Playwright tests for route entry and district navigation.
- Add visual screenshots for playable hub desktop/mobile.
- Add performance budget checks.
- Add reduced motion mode.
- Add error/fallback handling for WebGL.

Acceptance:

- `npm run build` passes.
- Visual/reference tests still pass.
- New playable hub smoke test passes.
- Manual QA passes desktop keyboard and mobile touch.

## 15. Testing Plan

Automated:

- Route smoke:
  - `/` renders playable `WorldScene`.
  - `/#visual-plaza` renders reference panel.
  - `/#race` renders race mode.
- Interaction:
  - Simulate keyboard drive.
  - Simulate click/tap district.
  - Verify `onEnter` route changes.
- Telemetry:
  - Hub exposes test telemetry for player position, nearby destination, FPS estimate, active mission.
- Performance:
  - Initial load below agreed budget.
  - Draw calls and object count tracked in dev telemetry.

Manual:

- Desktop keyboard playthrough.
- Mobile/touch playthrough.
- Reduced motion check.
- Low-end browser check.

## 16. Metrics

Product metrics:

- Time to first meaningful action.
- Percent of sessions where user enters a district from city.
- Percent of sessions where user completes one tracker action after entering from city.
- Race starts per active user.
- Return rate after first playable hub session.

Quality metrics:

- Desktop FPS target: 55-60 on development machine.
- Mobile FPS target: stable 30+.
- No route-blocking WebGL errors.
- No inaccessible core tracker path if WebGL fails.

## 17. Risks

Risk: hub slows down tracker usage.

- Mitigation: click/tap and bottom nav remain fast.

Risk: visual ambition creates another long art rabbit hole.

- Mitigation: gameplay camera quality wins over screenshot match; ship in phases.

Risk: WebGL performance regresses.

- Mitigation: merged/instanced geometry, coarse collisions, simple materials, fallback world.

Risk: player does not understand what to do.

- Mitigation: mission beacon, contextual prompt, route guide, first-time hints.

Risk: game rewards distort health behavior.

- Mitigation: rewards celebrate completion and consistency, not extreme performance.

## 18. Open Decisions

These need owner confirmation before implementation:

1. Should the player drive a kart, a walking avatar, or choose between both?
2. Should Home/Base be a real district or just the spawn plaza?
3. Should Race mode be accessible immediately or unlocked after first daily action?
4. Should cosmetics affect handling or be visual only?
5. Should the game prioritize mobile portrait or desktop landscape first?

Recommended defaults:

1. Kart first, because the race game already supports that fantasy.
2. Home/Base as spawn plus metrics district.
3. Race accessible immediately.
4. Cosmetics visual only at first.
5. Desktop and mobile both supported, but tune desktop first because the current complaint came from desktop plaza work.

## 19. Definition Of Done For Playable Plaza V1

Playable Plaza V1 is done when:

- `/` opens a playable Three.js city hub.
- `/#visual-plaza` remains only a reference/regression route.
- Player can drive with keyboard.
- Player can use touch controls.
- Player can enter all major districts.
- Mission beacon points to the next relevant action.
- Districts are visually distinct and attractive.
- At least three tracker actions visibly update the city.
- Race mode is reachable from the city.
- WebGL fallback still allows navigation.
- Build and tests pass.
- Manual side-by-side with the current home confirms it is clearly more game-like, not just a prettier menu.
