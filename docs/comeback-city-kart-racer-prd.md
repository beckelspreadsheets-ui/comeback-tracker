# Comeback City Kart Racer PRD

Status: Draft for implementation planning
Date: 2026-05-19
Owner: product/design/engineering

## 1. Purpose

Make Comeback City race mode feel like a real arcade kart racer instead of a fitness-app screen with a Three.js scene behind it.

The current problem is not only tuning. The repeated failure mode is that work has been judged by whether the scene renders, routes work, tests pass, or a static screenshot looks less broken. That is not enough. The product goal is a playable racing experience with satisfying kart handling, readable chase camera, strong visual identity, responsive controls, obvious racing goals, and enough presentation polish that a user immediately understands: this is a kart race.

This PRD defines the mechanics, camera, art direction, implementation plan, testing gates, and acceptance criteria needed to reach that bar.

Important IP boundary: "Mario Kart-like" means kart-racer genre quality, readability, camera behavior, drift/boost feel, and arcade polish. It does not mean copying Nintendo characters, tracks, items, icons, UI layouts, sounds, music, names, or branded visual assets. The shipped product must be an original Comeback City kart racer.

## 2. Current Code Reality

Relevant files:

- `src/game/ArcadeRace3D.jsx`
  - Main Three.js race mode.
  - Owns renderer setup, track scene, player physics, rivals, items, hazards, camera, VFX, HUD, telemetry, and autoplay playtest behavior in one large component.
  - Current implementation can render and finish races, but it is not organized for systematic feel tuning.
- `src/game/RaceScreen.jsx`
  - Hosts `ArcadeRace3D`.
  - Also contains a legacy 2D `RaceCanvas` implementation that is not the primary rendered race, which creates debugging confusion.
- `src/game/raceTracks.js`
  - Track data, including Comeback City GP, route points, layers, hazards, boosts, items, rivals, signature item, and course metadata.
- `src/game/courseV2.js`
  - Defines authored kart track schema and telemetry expectations, including camera checkpoints and kart screen coverage.
- `src/game/city3dAssets.js`
  - Contains reusable kart/vehicle model helpers.
- `src/game/raceItems.js`
  - Item definitions and display metadata.
- `src/game/raceHazards.js`
  - Hazard definitions and vehicle filters.
- `src/game/RacePlaytestHarness.jsx`
  - Standalone race harness used by `race-playtest.html`.
- `scripts/race-content-playtest.mjs`
  - Data/content validation.
- `scripts/race-browser-playtest.mjs`
  - Headless browser race playtest that drives races and captures screenshots.

Current known gaps:

- The camera still needs a deliberate kart-racer composition system, not one-off distance tweaks.
- The physics model needs explicit feel targets and telemetry thresholds.
- The visual scene needs a real art pass: track surface, barriers, props, landmarks, lighting, VFX, skyline, readable turns, and speed feedback.
- The HUD and race UI should support racing, not look like borrowed tracker/reference UI.
- Race work is too concentrated in `ArcadeRace3D.jsx`, making it hard to tune safely.
- Passing autoplay tests does not prove the game feels good to a human.

## 3. Product Vision

Comeback City GP is a compact arcade kart race through the fitness city.

The player drives a stylized original kart through wide city streets, district landmarks, boost pads, item boxes, hazards, ramps, shortcuts, and finish-line moments. The race should feel fast, readable, colorful, and forgiving. The player should be able to steer, hop, drift, earn mini-turbos, grab items, recover from mistakes, and understand the track within seconds.

The target reaction is:

"This feels like a real kart-racing mini-game inside the tracker."

Not:

"This is a 3D menu."

Not:

"This is a tech demo."

Not:

"This is a static city screenshot with a kart in it."

## 4. Goals

1. Make the race mode feel like a responsive arcade kart racer on desktop keyboard and mobile touch.
2. Build a chase camera that consistently frames the kart, road, turns, rivals, and track landmarks.
3. Create original Comeback City racing visuals with dense, readable, colorful art.
4. Make drift, mini-turbo, boost pads, collisions, item pickups, and hazards satisfying and clear.
5. Make Comeback City GP the first polished reference track before expanding other tracks.
6. Add telemetry and visual tests that prevent "it renders, so it is done" false positives.
7. Keep race mode performant on ordinary laptops and modern phones.
8. Keep all assets original or properly licensed.

## 5. Non-Goals

- Do not copy Nintendo IP, tracks, characters, UI, icons, sounds, music, item designs, names, or exact visual layouts.
- Do not add multiplayer in this milestone.
- Do not build a full racing game economy before the core driving feel is good.
- Do not polish every track before Comeback City GP reaches the target quality bar.
- Do not spend time on reference-panel screenshot matching for race mode.
- Do not hide race feel problems behind autoplay success.
- Do not keep adding large systems inside `ArcadeRace3D.jsx` without splitting testable modules.

## 6. Design Pillars

### Pillar 1: Kart Feel First

Driving must be fun before cosmetics, progression, or more tracks matter.

Required feel:

- Fast response from standstill.
- Steering is readable at low speed and stable at high speed.
- Drift is easy to start, easy to understand, and satisfying to release.
- Mistakes cost time but rarely stop the player dead.
- Recovery is quick.
- Boosts feel visible and audible.

### Pillar 2: The Camera Sells The Speed

The camera is part of the game feel. It must show enough road ahead, maintain a readable kart size, and frame upcoming turns before the player reaches them.

Required feel:

- The kart should occupy roughly 14-24 percent of viewport height during normal driving.
- Road ahead should occupy at least 45 percent of the lower/middle viewport during racing.
- Horizon should usually sit around 35-48 percent from the top on desktop.
- Upcoming turn, boost, item box, or hazard should be visible at least 1.0-1.5 seconds before arrival at normal speed.
- Camera should never clip through buildings or hide the kart.

### Pillar 3: Original Arcade City

The race should be inspired by the Comeback City tracker world, not by copyrighted kart-racer tracks.

Required feel:

- Chunky original city landmarks.
- District-specific colors and props.
- Clear race track boundaries.
- Strong foreground, midground, and background layers.
- Saturated but controlled color.
- No large empty flat areas in the playable camera view.

### Pillar 4: Readable Competition

The player must understand what is happening in a race.

Required feel:

- Position, lap, speed/boost/drift state, and held item are visible at a glance.
- Rivals are visible enough to make the race feel populated.
- Item pickups, hits, boosts, and hazards have obvious effects.
- Finish and lap transitions feel like events.

### Pillar 5: Prove It Visually

Every implementation phase must produce a screenshot or short capture from the actual browser route. Telemetry and build success are necessary but not sufficient.

Required evidence per phase:

- Desktop screenshot at idle.
- Desktop screenshot while driving at speed.
- Desktop screenshot while drifting.
- Mobile screenshot or capture.
- Telemetry summary for camera, FPS, drift, speed, and collisions.

## 7. Target Player Experience

First 5 seconds:

1. Player opens `/#race`.
2. They see a full-screen race scene, not a mobile panel or tracker card.
3. The kart is centered low in frame with the road and city ahead.
4. HUD shows race state without blocking driving visibility.
5. The player can press `W` or touch Go and immediately accelerate.

First 20 seconds:

1. Player reaches racing speed quickly.
2. First turn is visible early.
3. Player can hold drift and see sparks/charge feedback.
4. Player releases drift and gets a mini-turbo.
5. Rival karts, item boxes, boost pads, or hazards make the scene feel alive.

First race:

1. Player completes 3 laps.
2. The track teaches a simple route first, then optional risk/reward branches.
3. Mistakes slow the player but do not create long stalls.
4. Finish sequence gives clear result, reward, and return path.

## 8. Quality Bar

Race mode is acceptable only when all of these are true:

- A user can identify it as a kart racer from a 3 second silent clip.
- Driving with keyboard feels responsive within the first 10 seconds.
- The kart never dominates the screen during normal play.
- The player can see where to drive next.
- Drift creates visible side slip, sparks, audio/visual charge, and a release boost.
- Boost pads clearly accelerate the kart and create screen/speed feedback.
- Item boxes are visible before pickup and the held item is obvious.
- At least 3 rival karts are visible during a normal race.
- The Comeback City track has recognizable district landmarks.
- The scene does not look like an empty flat plane with buildings in the distance.
- The build and race playtests pass.

## 9. Mechanics Requirements

### 9.1 Controls

Desktop:

- `W` or `ArrowUp`: accelerate.
- `S` or `ArrowDown`: brake/reverse.
- `A/D` or `ArrowLeft/ArrowRight`: steer.
- `Space`: hop and hold drift.
- `Shift`: alternate drift hold.
- `F`: use item.
- `Q/E/R`: optional vehicle or bank actions only if still part of the design.
- `Esc`: pause.

Mobile:

- Right thumb: large accelerate button.
- Left thumb: steering zone or left/right buttons.
- Secondary buttons: drift/hop and item.
- Buttons must not cover the kart, road apex, or item boxes.

Controller support, if added:

- Right trigger or A: accelerate.
- Left trigger or B: brake.
- Left stick: steer.
- R bumper: hop/drift.
- X/Y: item.

### 9.2 Acceleration And Speed

Intent:

The kart should feel quick and arcade-like without becoming uncontrollable.

Targets:

- Time from standstill to 80 percent top speed: 1.2-1.8 seconds.
- Time from standstill to full non-boost top speed: 2.2-3.0 seconds.
- Braking from top speed to 25 percent speed: 0.8-1.3 seconds.
- Reverse should be available but clearly slower than forward.
- Coasting should lose speed gently, not instantly.
- Off-road should slow the kart but still allow recovery.

Implementation notes:

- Use normalized telemetry for speed targets because current HUD speed may be scaled.
- Add `window.__raceVisualTelemetry.player.normalizedSpeed`.
- Add `window.__raceVisualTelemetry.player.timeToSpeed80` in playtest harness.
- Tune acceleration by measuring the above, not by eyeballing constants only.

### 9.3 Steering

Intent:

The kart should turn sharply enough for arcade racing but still reward planned lines.

Targets:

- At 30 percent top speed, the kart should complete a 90 degree turn in 0.65-0.95 seconds with full steering.
- At 80 percent top speed, the kart should complete a 90 degree turn in 1.0-1.45 seconds without drift.
- Steering input should have minimal latency: visual wheel/kart response under 100 ms.
- High-speed steering should not snap or spin out.
- Small corrections should feel precise.

Implementation notes:

- Separate input smoothing from physics smoothing.
- Do not over-smooth steering input; smooth camera and visuals instead.
- Keep a small amount of road assist only to prevent frustration, not to drive for the player.

### 9.4 Hop

Intent:

Hop is the entry point into drift and a tactile racing action.

Targets:

- Pressing drift at speed should trigger a short hop within 1 frame.
- Hop duration: 180-300 ms.
- Hop should slightly reduce ground grip while airborne.
- Landing should have a small squash/settle visual, tire chirp, and optional dust puff.

### 9.5 Drift

Intent:

Drift is the core mechanic. It should be easy to start, visually obvious, and rewarding.

Drift start conditions:

- Player is grounded or just initiating hop.
- Speed is above low-speed threshold.
- Drift button is held.
- Steering input exceeds a small threshold.

Required behavior:

- Kart rotates toward turn direction while velocity slides outward.
- Counter-steering adjusts line without canceling drift immediately.
- Drift charge increases while held.
- Sparks change color by tier.
- Release gives boost based on tier.

Recommended charge tiers:

- Tier 1 blue: 0.55-0.80 seconds of sustained drift.
- Tier 2 orange: 1.15-1.55 seconds.
- Tier 3 purple/gold: 1.95-2.45 seconds.

Recommended boost rewards:

- Tier 1: 0.45-0.65 seconds.
- Tier 2: 0.75-1.05 seconds.
- Tier 3: 1.15-1.55 seconds.

Required feedback:

- Tire smoke/skid marks when drift begins.
- Spark color change at each tier.
- Short audio cue at each tier.
- FOV/speed-line pulse on release.
- HUD drift meter can exist, but world feedback must be sufficient without reading HUD.

Failure conditions:

- Drift must not feel like normal steering with a HUD meter.
- Drift must not force the kart into an uncontrollable spin.
- Drift must not require precision beyond ordinary casual play.

### 9.6 Boost

Boost sources:

- Drift release.
- Boost pads.
- Items.
- Trick/ramp landing, if added.

Targets:

- Boost must be visibly faster within 100 ms of activation.
- Camera FOV should increase slightly.
- Exhaust/trail VFX should intensify.
- Audio pitch should rise.
- Boost should not destroy steering readability.

Stacking:

- Boosts can refresh or extend duration, but top speed should be capped.
- Use clear priority rules so drift boost plus pad boost is predictable.

### 9.7 Collision And Recovery

Intent:

Collisions should communicate impact without making the game feel stuck.

Targets:

- Light wall scrape: small speed loss, sparks, controller/camera feedback.
- Direct wall hit: bounce back/angle correction and 25-45 percent speed loss.
- Rival bump: small lateral shove, no full stop.
- Hazard hit: clear effect based on hazard type, recovery under 1.5 seconds unless it is a major item.
- Respawn/recenter only when fully off-track or stuck.

Requirements:

- No collision should leave the player facing backward for more than 2 seconds without assistance.
- Add stuck detection:
  - speed near zero,
  - throttle held,
  - little position change,
  - duration over 1.25 seconds.
- Stuck recovery should gently rotate the kart toward the track and apply a small push.

### 9.8 Items

Intent:

Items should add arcade drama but not overshadow driving in V1.

Initial V1 item set:

- Turbo: forward boost.
- Shield: blocks one hazard/item hit.
- Oil Slick or Goo Patch: dropped behind player, causes slide/slow.
- Homing Trainer or Energy Bolt: simple forward projectile with visible trail.
- Recovery Snack or Repair Kit: small self-recovery/speed bump if behind.

Requirements:

- Item boxes must be visible at least 1 second before pickup at normal speed.
- Pickup should spin/flash and play a sound.
- Held item should be visible in HUD.
- Using an item should create world-space feedback.
- Items must have original names/icons, not genre-copy icons.

Balancing:

- Players in lower positions get more catch-up items.
- First place gets more defensive or small boosts.
- Comeback mechanics should keep races exciting without making skill irrelevant.

### 9.9 Rivals And Rubber Banding

Intent:

The race needs opponents to feel alive, but V1 can use simple AI.

Requirements:

- Minimum visible rival count: 3.
- Recommended full field: 6 racers total.
- Rivals should follow racing lines, use boosts, and visibly drift on key turns.
- Rivals should have distinct colors/silhouettes.
- Rivals should not teleport in view.
- Rubber banding should be subtle:
  - trailing rivals may gain speed off-camera,
  - leading rivals should not impossibly slow down in front of the player.

Telemetry:

- Track average distance to nearest rival.
- Track visible rival count.
- Track position changes per race.

### 9.10 Track Design

Comeback City GP V1 must be the polished reference track.

Required layout:

- Wide start boulevard.
- First gentle turn that teaches steering.
- First visible boost pad.
- First item boxes on a straight.
- First drift-friendly 90-120 degree turn.
- District landmark sequence:
  - Gym arena.
  - Food Court market turn.
  - Lab bridge or neon tunnel.
  - Clinic recovery lane.
  - Garage shortcut or waterfront branch.
  - Raceway finish arch.
- At least one optional shortcut that is faster only with clean drift/boost.
- At least one hazard zone that is readable and avoidable.

Track readability:

- Road edges must be obvious.
- Barriers should be visible but not overly punishing.
- Apex markers, arrows, curbs, lights, or banners should tell the player where to turn.
- Avoid intersections that visually imply wrong routes unless blocked or signed clearly.

Road dimensions:

- Main lanes should support casual steering and rival traffic.
- Tight shortcuts can be narrower, but must not be required for core completion.
- Avoid precision-only turns in the first 20 seconds.

## 10. Camera Requirements

### 10.1 Desktop Chase Camera

Targets:

- Kart screen height during normal speed: 14-24 percent.
- Kart screen height during boost: 12-22 percent.
- Kart bottom should sit around 70-84 percent from top of screen.
- Lookahead should show 1.0-1.5 seconds of road at current speed.
- FOV: 62-72 degrees depending on speed/boost.
- Camera should bias slightly toward inside of upcoming turn, not only current heading.

Inputs to camera:

- Player position.
- Player heading.
- Velocity vector.
- Steering input.
- Drift state.
- Track tangent and upcoming curvature.
- Nearby camera collision volumes.
- Upcoming boost/item/hazard markers.

Behavior:

- At low speed, camera can sit closer and lower.
- At high speed, camera pulls back, increases FOV slightly, and raises enough to show the road.
- During drift, camera should roll subtly and look toward the exit.
- During boost, camera should widen and add speed-line feedback.
- During collisions, camera can shake briefly, but not obscure steering.

### 10.2 Turn Anticipation

The camera must anticipate turns from track data.

Requirements:

- Sample the route 1.0-1.5 seconds ahead based on speed.
- Calculate upcoming curvature.
- Blend look target toward the upcoming tangent/exit.
- On hairpins, show the exit before the kart reaches the apex.
- On straightaways, look farther down the road.

Acceptance:

- A new player can identify the next major turn before reaching it.
- Browser screenshot at speed shows road ahead, not only rear kart/body.

### 10.3 Camera Collision

Requirements:

- Camera must not clip through buildings, barriers, signs, bridges, or tunnels.
- If collision detected, move camera inward/upward smoothly.
- Avoid sudden zoom jumps.
- Track `cameraClipCount` and `cameraAvoidanceCount`.

Acceptance:

- `cameraClipCount` is zero during browser playtest screenshots.
- No screenshot has the camera inside geometry.

### 10.4 Mobile Camera

Targets:

- Keep kart visible above touch controls.
- Show enough road despite portrait/narrow landscape constraints.
- Hide or compress nonessential HUD.
- Touch controls must not cover upcoming road apex.

Acceptance:

- Player can complete first lap on mobile without needing hidden route knowledge.
- Kart remains visible when controls are pressed.

## 11. Visual Direction

### 11.1 Original Style

Comeback City GP should be a bright, stylized arcade city.

Style keywords:

- Chunky.
- Colorful.
- Clean silhouettes.
- Toy-like materials.
- Saturated district accents.
- Readable track signage.
- Energetic speed VFX.

Do not use:

- Nintendo characters.
- Nintendo item forms.
- Nintendo track layouts.
- Nintendo UI compositions.
- Recognizable copied karts.
- Copied music/sound effects.
- Screenshots or asset traces as production art.

### 11.2 Scene Composition

Required layers:

- Foreground:
  - road texture,
  - curbs,
  - lane lines,
  - boost pads,
  - item boxes,
  - skid marks,
  - tire smoke,
  - rival karts.
- Midground:
  - barriers,
  - district buildings,
  - signs,
  - banners,
  - spectators or simple crowd shapes,
  - hazard props,
  - shortcut gates.
- Background:
  - skyline,
  - mountains or hills,
  - clouds,
  - tall landmark silhouettes,
  - animated balloons/blimps or original race signage.

Acceptance:

- At normal chase-camera height, the view should not be mostly empty sky or empty asphalt.
- Every major turn should have at least one landmark or sign.
- The start/finish line should feel like a race event location.

### 11.3 Kart Model

Requirements:

- Original kart silhouette with chunky tires, low chassis, visible driver/avatar, rear exhaust, front bumper, and color customization.
- Wheels must visibly steer and spin.
- Kart must lean/roll subtly under steering, drift, jump, and landing.
- Boost flames/trails must be visible from chase camera.
- Collision and landing should trigger small squash/settle animation.

Screen-size requirement:

- Desktop normal driving: kart occupies 14-24 percent of viewport height.
- Mobile: kart occupies 16-28 percent, adjusted for touch controls.

### 11.4 Track Surface

Requirements:

- Asphalt or road material with lane markings and subtle procedural texture.
- Curbs with strong contrast.
- Painted arrows and racing lines where needed.
- Boost pads must glow and animate.
- Item boxes must float/spin or pulse.
- Off-road surface must be visually distinct before it slows the player.

### 11.5 District Landmarks

Each Comeback City district must read from gameplay camera:

- Gym:
  - green arena,
  - dumbbell/training sign,
  - banners,
  - cheering crowd/light pulses.
- Food Court:
  - orange/yellow stalls,
  - awnings,
  - utensil sign,
  - market props,
  - warm lights.
- Lab:
  - purple/blue tower,
  - tubes,
  - glowing panels,
  - animated energy column.
- Clinic:
  - red/white recovery station,
  - shield/cross motif,
  - soft pulse lights.
- Garage:
  - blue workshop,
  - wide door,
  - tire stacks,
  - wrench sign,
  - shortcut gate.
- Raceway:
  - start arch,
  - flags,
  - timing lights,
  - trophy lights.

### 11.6 Lighting And Color

Requirements:

- Bright sky with readable horizon.
- Main directional light creates form but does not over-darken road.
- Fake glow/emissive materials preferred over many dynamic lights.
- Color coding should clarify route and district identity.
- Avoid a one-note palette.

### 11.7 VFX

Required VFX:

- Tire smoke on drift start.
- Skid marks during drift.
- Tiered drift sparks.
- Boost trail/flames.
- Boost pad activation burst.
- Item box pickup pop.
- Item use trail/impact.
- Collision sparks.
- Lap/finish confetti or light sweep.
- Speed lines at high speed, subtle enough not to block readability.

VFX must respect reduced motion mode.

## 12. Audio Direction

V1 does not need final music, but it needs enough audio feedback to sell mechanics.

Required sounds:

- Engine loop with pitch based on speed.
- Drift tire loop or skid chirp.
- Drift tier ping.
- Boost activation.
- Boost pad.
- Item pickup.
- Item use.
- Collision bump.
- Lap complete.
- Finish.

Requirements:

- Sounds must be original, generated in code, or properly licensed.
- Audio should be optional/mutable.
- No copied sound effects from commercial games.

## 13. HUD And UX

### 13.1 Race HUD

Required information:

- Position.
- Lap.
- Timer.
- Held item.
- Drift/boost state.
- Optional minimap.

Requirements:

- HUD must not block upcoming turns.
- HUD should look like a racing overlay, not tracker cards.
- Desktop HUD should be compact and anchored to edges.
- Mobile HUD should be simplified to protect view and controls.

### 13.2 Pause/Result Flow

Pause:

- Resume.
- Restart race.
- Exit to city.
- Controls/help.
- Reduced motion/audio options.

Results:

- Finish place.
- Time.
- Best lap.
- Reward/credits.
- Retry.
- Return to city.

### 13.3 Onboarding

No blocking tutorial.

Context hints:

- "Hold W to accelerate."
- "Press Space while steering to drift."
- "Release drift for mini-turbo."
- "Drive through item boxes."

Hints disappear once demonstrated.

## 14. Technical Architecture

### 14.1 Refactor Direction

`ArcadeRace3D.jsx` should stop absorbing every new racing concern.

Recommended modules:

- `src/game/race/physics/kartPhysics.js`
  - Acceleration, braking, steering, drift, boost, collision response.
- `src/game/race/physics/kartTuning.js`
  - Numeric tuning profiles and comments explaining each value.
- `src/game/race/camera/chaseCamera.js`
  - Camera position, lookahead, turn anticipation, collision avoidance.
- `src/game/race/render/createRaceScene.js`
  - Scene setup, lighting, track, district landmarks.
- `src/game/race/render/createTrackMesh.js`
  - Road ribbons, curbs, lane marks, boost pads, boundaries.
- `src/game/race/render/createKartModel.js`
  - Player/rival kart model variants.
- `src/game/race/render/raceVfx.js`
  - Drift sparks, smoke, boosts, item pickup, collisions.
- `src/game/race/raceTelemetry.js`
  - `window.__raceVisualTelemetry`, screenshots/test metrics.
- `src/game/race/raceHud.jsx`
  - HUD and touch controls.
- `src/game/race/raceAudio.js`
  - WebAudio cues and engine loop.

The first implementation can move code incrementally, but each new system should land in one of these modules instead of adding more inline code to `ArcadeRace3D.jsx`.

### 14.2 Data Model

Race state should explicitly include:

```js
race: {
  trackKey: string,
  lap: number,
  place: number,
  time: number,
  player: {
    position: { x: number, y: number, z: number },
    heading: number,
    velocity: { x: number, y: number, z: number },
    normalizedSpeed: number,
    steering: number,
    throttle: number,
    brake: number,
    grounded: boolean,
    hopTimer: number,
    drift: {
      active: boolean,
      direction: -1 | 0 | 1,
      charge: number,
      tier: number,
      releaseTimer: number,
    },
    boost: {
      active: boolean,
      timer: number,
      tier: number,
      source: 'drift' | 'pad' | 'item' | 'trick' | null,
    },
    item: {
      heldKey: string | null,
      cooldown: number,
    },
  },
  rivals: Array<object>,
  camera: {
    mode: 'chase',
    clipCount: number,
    avoidanceCount: number,
  },
}
```

### 14.3 Tuning Configuration

Do not bury tuning constants inside frame-update code.

Recommended shape:

```js
export const KART_TUNING_V1 = {
  acceleration: {
    force: number,
    topSpeed: number,
    boostTopSpeed: number,
    brakeForce: number,
    reverseTopSpeed: number,
    coastDrag: number,
  },
  steering: {
    lowSpeedTurnRate: number,
    highSpeedTurnRate: number,
    inputResponsiveness: number,
    visualWheelAngle: number,
  },
  drift: {
    minSpeed: number,
    hopImpulse: number,
    sideSlip: number,
    turnAssist: number,
    counterSteerInfluence: number,
    chargeTierTimes: [number, number, number],
    boostDurations: [number, number, number],
    boostImpulses: [number, number, number],
  },
  camera: {
    baseDistance: number,
    speedDistance: number,
    baseHeight: number,
    speedHeight: number,
    baseFov: number,
    boostFov: number,
    lookaheadSeconds: number,
    turnAnticipation: number,
  },
}
```

Each numeric change should include why it changed and which screenshot/test proves it improved the experience.

### 14.4 Performance Requirements

Targets:

- Desktop development machine: 55-60 FPS.
- Ordinary laptop: stable 45+ FPS.
- Modern phone: stable 30+ FPS.
- Initial race route should become interactive under 3 seconds on local dev.

Rendering constraints:

- Use instancing or merged geometry for repeated props, windows, cones, lights, crowds, tire stacks, barriers, and trees.
- Avoid many dynamic lights.
- Prefer emissive materials/sprites for glow.
- Reuse geometries/materials.
- Avoid per-frame allocations in physics/render loop.
- Keep texture count and image weight controlled.
- Adaptive DPR is acceptable, but do not hide poor composition by lowering resolution.

### 14.5 WebGL Fallback

If WebGL fails:

- User can still exit race and navigate app.
- Show a clear fallback panel.
- Do not leave a blank canvas.
- Race fallback can be simple, but route must not break.

## 15. Implementation Plan

### Phase 0: Lock The Target

Objective:

Stop vague "make it more Mario Kart" loops by defining exact evidence.

Tasks:

1. Pick one approved target reference screenshot or capture for composition only.
2. Write a one-page visual brief from it:
   - camera height,
   - kart screen size,
   - horizon placement,
   - road visibility,
   - object density,
   - color/lighting,
   - HUD density.
3. Confirm desktop-first or mobile-first priority.
4. Confirm whether V1 is kart-only or keeps hover/plane modes.
5. Confirm art style boundaries and IP restrictions.

Acceptance:

- Target visual brief exists in `docs/`.
- No implementation starts from "I think it should look better" without the brief.

### Phase 1: Race Architecture Cleanup

Objective:

Make tuning possible without breaking the whole race component.

Tasks:

1. Extract tuning constants into `race/physics/kartTuning.js`.
2. Extract player physics into `race/physics/kartPhysics.js`.
3. Extract chase camera into `race/camera/chaseCamera.js`.
4. Extract race telemetry helpers into `race/raceTelemetry.js`.
5. Move HUD into `race/raceHud.jsx`.
6. Mark legacy 2D `RaceCanvas` in `RaceScreen.jsx` as deprecated or remove it if unused.

Acceptance:

- `ArcadeRace3D.jsx` is materially smaller.
- Physics can be unit-tested without rendering.
- Camera can be tested from synthetic player/track inputs.
- Existing race browser playtest still passes.

### Phase 2: Kart Physics V2

Objective:

Make driving feel like a responsive arcade kart.

Tasks:

1. Implement normalized acceleration/speed telemetry.
2. Tune acceleration to target time-to-speed.
3. Tune braking and reverse.
4. Implement hop as a first-class state.
5. Implement drift start, hold, counter-steer, tier charge, and release boost.
6. Add collision recovery/stuck detection.
7. Add boost stacking rules.
8. Tune off-road slowdown and recovery.

Acceptance:

- Time to 80 percent speed is within target range.
- Player can start drift within first turn reliably.
- Drift tier telemetry records Tier 1 and Tier 2 in normal driving.
- Releasing drift visibly boosts the kart.
- Stuck detection recovers the player in under 1.5 seconds.
- Manual desktop playthrough feels responsive enough to complete 3 laps without fighting controls.

### Phase 3: Chase Camera V2

Objective:

Make the camera frame the race like a kart racer.

Tasks:

1. Implement route-based lookahead.
2. Implement upcoming turn anticipation.
3. Tune camera distance, height, FOV, side offset, and boost FOV.
4. Implement camera collision avoidance.
5. Add telemetry for:
   - kart screen height,
   - kart screen center,
   - road-ahead coverage,
   - horizon position,
   - camera clip count,
   - camera avoidance count.
6. Add screenshot tests for idle, speed, drift, boost, and turn approach.

Acceptance:

- Kart occupies 14-24 percent of desktop viewport height during normal speed.
- Road ahead is visible in all required screenshots.
- Upcoming turn is visible before the kart reaches it.
- Camera clip count is zero in playtest screenshots.
- No HUD overlaps the kart.

### Phase 4: Comeback City GP Track Rebuild

Objective:

Make one track feel authored and raceable.

Tasks:

1. Redesign Comeback City GP as the reference V1 track.
2. Author a readable main route with clear turn sequence.
3. Add district landmark gates and silhouettes.
4. Add boost pads in intentional locations.
5. Add item boxes on readable straights.
6. Add one optional shortcut.
7. Add hazard zones that teach avoidance.
8. Add start/finish arch and lap trigger clarity.
9. Add route signs, arrows, curbs, and barrier language.

Acceptance:

- A new player can follow the track without minimap for the first lap.
- Every major district is recognizable from gameplay camera.
- No large empty flat area dominates the driving view.
- Shortcut is visible but not required.
- First 20 seconds teach steering, boost, item, and drift opportunity.

### Phase 5: Visual Art Pass

Objective:

Make the scene look like an original polished kart-racer environment.

Tasks:

1. Upgrade road material, curbs, markings, and barriers.
2. Upgrade kart model silhouette and animation.
3. Add district buildings and props at gameplay scale.
4. Add skyline/background depth.
5. Add spectators/crowd shapes or animated signage.
6. Add boost pads, item boxes, hazard props, and finish arch.
7. Add original race banners and flags.
8. Tune lighting, color, fog, and material roughness.
9. Add screenshots for desktop/mobile at idle and speed.

Acceptance:

- Static screenshot at speed reads as a kart race.
- Visuals are original and Comeback City branded.
- Object density is high enough to avoid "empty plane" look.
- Performance remains within targets.

### Phase 6: Juice, Audio, And Feedback

Objective:

Make every racing action feel rewarding.

Tasks:

1. Add engine pitch loop.
2. Add drift skid/spark sounds.
3. Add boost pad and drift boost sounds.
4. Add item pickup/use sounds.
5. Add collision sounds and sparks.
6. Add lap/finish event feedback.
7. Add speed lines, FOV pulse, and camera shake tuning.
8. Add reduced motion and mute handling.

Acceptance:

- Drift, boost, item pickup, item use, collision, lap, and finish are all obvious without reading debug telemetry.
- Reduced motion disables or softens camera shake/speed lines.

### Phase 7: Rivals, Items, And Race Drama

Objective:

Make races feel populated and competitive.

Tasks:

1. Ensure at least 3 rivals are visible in normal play.
2. Improve rival kart visuals and colors.
3. Add rival drift/boost visual states.
4. Add item balancing by race position.
5. Add visible item use by rivals.
6. Tune rubber banding.
7. Add result screen that makes place/time/reward clear.

Acceptance:

- Player sees rivals during the first 10 seconds.
- Position changes happen in normal races.
- Items create readable moments.
- Rubber banding does not feel like obvious cheating.

### Phase 8: Mobile And Accessibility

Objective:

Make the race playable outside desktop keyboard.

Tasks:

1. Tune mobile camera.
2. Redesign touch controls for racing.
3. Add pause/help controls.
4. Add reduced motion.
5. Add high contrast HUD option if needed.
6. Verify keyboard-only race start, pause, restart, and exit.

Acceptance:

- Mobile user can finish a race.
- Touch controls do not hide the kart or road.
- Keyboard-only user can complete all core actions.

### Phase 9: Release Hardening

Objective:

Ship without another false finish.

Tasks:

1. Run `npm run build`.
2. Run `npm run test:race`.
3. Run `npm run test:race:browser`.
4. Capture required screenshots and attach paths in PR.
5. Run manual desktop playthrough.
6. Run manual mobile/touch playthrough.
7. Check WebGL fallback.
8. Confirm no copied/prohibited assets.

Acceptance:

- All automated checks pass.
- Screenshot/capture evidence meets visual criteria.
- Manual playthrough passes rubric.
- Product/design/engineering sign off on "kart-racer quality" for V1.

## 16. Testing Plan

### 16.1 Automated Build/Data Tests

Required:

- `npm run build`
- `npm run test:race`
- `npm run test:race:browser`

Add:

- Physics unit tests for acceleration, braking, drift, boost, collision recovery.
- Camera unit tests for route lookahead, turn anticipation, FOV, collision avoidance.
- Data validation for track route continuity, item box visibility, boost pad spacing, lap trigger placement.

### 16.2 Browser Visual Tests

Add a race visual test script that captures:

- Desktop idle at start.
- Desktop after 2 seconds acceleration.
- Desktop drift on first major turn.
- Desktop boost pad activation.
- Desktop item pickup.
- Desktop rival cluster.
- Desktop finish line.
- Mobile idle.
- Mobile driving.
- WebGL fallback.

Each screenshot should write:

- image file,
- telemetry JSON,
- route URL,
- viewport,
- timestamp,
- git commit or branch if available.

### 16.3 Telemetry Thresholds

Add telemetry fields:

```js
window.__raceVisualTelemetry = {
  fps: number,
  viewport: { width: number, height: number, dpr: number },
  player: {
    normalizedSpeed: number,
    speedRatio: number,
    driftActive: boolean,
    driftTier: number,
    boostActive: boolean,
    kartScreenCoverage: {
      heightRatio: number,
      centerYRatio: number,
      bottomYRatio: number,
    },
  },
  camera: {
    fov: number,
    distance: number,
    height: number,
    roadAheadCoverage: number,
    horizonYRatio: number,
    clipCount: number,
    avoidanceCount: number,
  },
  race: {
    visibleRivals: number,
    lap: number,
    place: number,
    heldItemKey: string | null,
  },
}
```

Thresholds:

- `fps >= 55` desktop target, `fps >= 45` minimum local acceptance for heavy scenes.
- `player.kartScreenCoverage.heightRatio` between `0.14` and `0.24` during normal desktop driving.
- `camera.roadAheadCoverage >= 0.45`.
- `camera.clipCount === 0`.
- `race.visibleRivals >= 3` during at least one first-lap sample.
- `player.driftTier >= 1` during drift test.

### 16.4 Manual QA Rubric

Score each category 1-5. V1 cannot ship with any category below 4.

- First impression: does it immediately read as a kart race?
- Controls: does acceleration/steering feel responsive?
- Drift: is it easy to start, hold, charge, and release?
- Camera: can the player see road and turns?
- Track readability: is the route clear?
- Visual polish: does the city feel dense and intentional?
- Race drama: are rivals/items/boosts/hazards noticeable?
- HUD: is race info useful without blocking play?
- Performance: does it stay smooth enough?
- Mobile: is touch playable?

### 16.5 Required Evidence For PR

Every PR that claims race quality improvement must include:

- Before screenshot or description of current failure.
- After desktop screenshot.
- After mobile screenshot if touch/camera/HUD changed.
- At least one driving or drift screenshot.
- Test commands run and result.
- Telemetry summary.
- Known remaining issues.

No PR should claim "Mario Kart-like", "kart-racer quality", or "dialed in" without this evidence.

## 17. Metrics

Product metrics:

- Race starts per active user.
- Race completion rate.
- Retry rate.
- Time to first drift.
- Time to first item pickup.
- Race mode return rate.
- Percent of race sessions launched from city.

Quality metrics:

- Manual QA rubric scores.
- FPS.
- Camera clip count.
- Kart screen coverage.
- Road-ahead coverage.
- Drift tier activation rate.
- Stuck recovery count.
- Visible rival count.

## 18. Risks And Mitigations

Risk: "Like Mario Kart" leads to IP copying.

Mitigation: Treat it as genre benchmark only. Use original Comeback City art, names, mechanics expression, UI, and audio.

Risk: More tuning without evidence wastes another week.

Mitigation: Require screenshots, telemetry, and manual QA rubric for every tuning PR.

Risk: Visual ambition hurts performance.

Mitigation: Use instancing, merged geometry, simple materials, fake glow, adaptive DPR, and performance telemetry.

Risk: Camera changes make mobile worse.

Mitigation: Tune desktop and mobile camera profiles separately and test both.

Risk: Autoplay passing hides human control problems.

Mitigation: Add manual play rubric and input-specific telemetry.

Risk: Huge component makes changes fragile.

Mitigation: Extract physics, camera, HUD, VFX, and telemetry modules before major V2 work.

Risk: Race becomes distracting from tracker purpose.

Mitigation: Keep race optional, fast to exit, and connected to rewards/city progression without blocking health logging.

## 19. Open Decisions

These require owner confirmation before implementation:

1. What exact screenshot/capture is the visual composition target?
2. Is V1 desktop-first, mobile-first, or equal priority?
3. Should Comeback City GP V1 be kart-only, or keep hover/plane modes?
4. Should items be minimal in V1, or part of the first quality pass?
5. Should audio be required for V1 acceptance?
6. Should the race be a standalone mode first or tightly connected to city progression first?
7. How close should the HUD be to genre conventions versus Comeback City brand?
8. What is the minimum acceptable mobile device/performance target?

Recommended defaults:

- Use desktop-first tuning for the next pass because the current complaint is desktop visual/camera/feel.
- Make Comeback City GP V1 kart-only until the core kart feel is strong.
- Keep items in V1, but limit the item set to 4-5 original items.
- Require simple original audio cues for drift/boost/item/lap/finish.
- Treat the current race as a prototype and build a reference-quality Comeback City GP before polishing other tracks.

## 20. Definition Of Done For Kart Racer V1

Kart Racer V1 is done when:

- `/#race` opens a full-screen playable kart race.
- The race uses original Comeback City art and does not copy protected game assets.
- The player can accelerate, brake, steer, hop, drift, release mini-turbo, use items, hit boost pads, collide, recover, and finish a race.
- Drift is the central satisfying mechanic.
- The chase camera frames the kart and road like an arcade kart racer.
- Comeback City GP has dense district landmarks, readable turns, barriers, boost pads, item boxes, hazards, and finish-line presentation.
- At least 3 rivals are visible during normal play.
- HUD supports race decisions without blocking the view.
- Desktop keyboard and mobile touch both work.
- Reduced motion is respected.
- WebGL failure does not break app navigation.
- `npm run build` passes.
- `npm run test:race` passes.
- `npm run test:race:browser` passes.
- Visual screenshots meet telemetry thresholds.
- Manual QA rubric scores are all 4 or higher.
- A fresh user watching 10 seconds of gameplay describes it as a kart race, not a menu or tech demo.

## 21. Immediate Next Tickets

### RACE-001: Confirm Target Visual Brief

Create `docs/race-visual-target-brief.md`.

Must include:

- target screenshot/capture,
- viewport,
- desired kart size,
- horizon placement,
- road visibility,
- object density,
- HUD placement,
- color/lighting notes,
- explicit IP boundary.

### RACE-002: Extract Kart Tuning

Move kart constants out of `ArcadeRace3D.jsx` into `race/physics/kartTuning.js`.

Acceptance:

- No behavior change intended.
- Build and browser race tests pass.

### RACE-003: Add Physics Telemetry

Add normalized speed, time-to-speed, drift start, drift tier, boost source, and stuck recovery telemetry.

Acceptance:

- Telemetry visible in `window.__raceVisualTelemetry`.
- Browser test records telemetry JSON.

### RACE-004: Implement Drift V2

Implement hop-driven drift with tiered sparks and release mini-turbo.

Acceptance:

- Manual drift test shows side slip, sparks, release boost.
- Telemetry records Tier 1 and Tier 2.
- Screenshot evidence included.

### RACE-005: Implement Chase Camera V2

Implement route lookahead, turn anticipation, kart screen coverage target, road-ahead telemetry, and camera collision avoidance.

Acceptance:

- Speed/drift screenshots show road ahead and correctly sized kart.
- Camera clip count is zero.

### RACE-006: Rebuild Comeback City GP First 30 Seconds

Author the first 30 seconds of the track as a polished vertical slice.

Acceptance:

- Start line, first straight, first boost, first item, first drift turn, and first district landmark are complete.
- A user can understand the route without minimap.

### RACE-007: Add Core VFX And Audio

Add drift, boost, item pickup, item use, collision, lap, and finish feedback.

Acceptance:

- Each mechanic has visible and audible feedback.
- Reduced motion/mute controls work.

### RACE-008: Visual Test Harness

Add screenshot capture and telemetry threshold checks for race visuals.

Acceptance:

- Test outputs desktop/mobile screenshots and telemetry JSON.
- Fails on blank canvas, bad kart size, camera clipping, or insufficient road visibility.

### RACE-009: Manual QA Pass

Run the rubric and attach results.

Acceptance:

- No score below 4 before V1 is called done.
