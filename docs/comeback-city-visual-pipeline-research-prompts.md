# Comeback City Visual Pipeline Research Prompt Pack

Use this file as the shared context for two independent Deep Research runs and one final Pro synthesis run.

Share the relevant prompt section together with the full Shared Repo Context. Treat local filesystem paths as stable labels; the receiving research model should use the embedded repo snapshot below as the project context.

Packet status:

- Self-contained for text-only research about architecture, pipeline design, toolchain, budgets, scripts, CI gates, provenance, and implementation planning.
- Stronger for visual-direction research when the six V2 art cards listed in the External upload checklist are attached.
- Stronger for 3D-asset-specific critique when a tool that can inspect GLB files receives the raw GLB binaries; the embedded audit tables are sufficient for budget and pipeline planning.

Recommended three-run workflow:

1. Run Deep Research 1 with the full Shared Repo Context and the `Deep Research Prompt 1` section.
2. Run Deep Research 2 with the full Shared Repo Context and the `Deep Research Prompt 2` section.
3. Run the Pro synthesis with the full Shared Repo Context, both completed research reports, and the `Pro Synthesis Prompt` section.

Research source rules:

- Use current official or primary documentation for tool behavior, licensing, version support, and command syntax.
- Include source links for each material recommendation.
- Distinguish sourced facts, repo-context facts, and implementation judgment.
- Treat June 17, 2026 as the project-context date; verify time-sensitive tool, licensing, and Unreal MCP details against current sources at research time.

## Shared Repo Context

Project path:

`/Users/andrewferguson/Downloads/comeback-tracker`

Portable-use note:

The research model receiving this prompt will not have local filesystem access to this path. Use the path as a project label. Use the embedded repo snapshot, asset inventories, package data, architecture notes, and constraints below as the authoritative project context. Ask for a pasted file excerpt only when exact source text, image inspection, or binary asset inspection is required to make a decision.

Project goal:

Build an automated Three.js asset and track production pipeline for the Comeback City kart game. The gameplay mechanics are already strong; the main gap is producing runtime visuals, character/kart assets, props, and tracks that match the approved character sheets and V2 art direction.

Current stack:

- React 18.3.1
- Vite 8.0.16
- Three.js 0.184.0
- Pixi.js 8.19.0 exists in the repo, but the race direction has moved to Three.js.
- Playwright 1.59.1 is available for browser QA and screenshot/video capture.
- The app is a web/PWA project, not a native Unreal project.

Important package scripts:

- `npm run dev`
- `npm run build`
- `npm run test:kart-proof`
- `npm run test:kart-playable`
- `npm run test:kart-3d-spike`
- `npm run test:visual`
- `npm run test:webgl`
- `npm run test:bundle`
- `npm run test:race`
- `npm run test:race:browser`

Package scripts snapshot:

```json
{
  "dev": "vite",
  "build": "vite build",
  "build:andrew": "VITE_USER_PRESET=andrew vite build",
  "build:alexander": "VITE_USER_PRESET=alexander vite build",
  "preview": "vite preview",
  "test:bundle": "node scripts/bundle-asset-budget-report.mjs",
  "test:race": "node scripts/race-content-playtest.mjs",
  "test:race:browser": "node scripts/race-browser-playtest.mjs",
  "test:kart-proof": "node scripts/kart-proof-static-guard.mjs",
  "test:kart-playable": "node scripts/kart-playable-proof-test.mjs",
  "test:kart-3d-spike": "node scripts/kart-3d-spike-test.mjs",
  "test:webgl": "node scripts/webgl-context-smoke-test.mjs",
  "test:visual": "node scripts/visual-reference-checks.mjs"
}
```

Package dependency snapshot:

```json
{
  "dependencies": {
    "@zxing/browser": "^0.1.5",
    "lucide-react": "^0.400.0",
    "pixi.js": "^8.19.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.12.7",
    "three": "^0.184.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^6.0.2",
    "playwright": "^1.59.1",
    "pngjs": "^7.0.0",
    "tailwindcss": "^3.4.4",
    "vite": "^8.0.16",
    "vite-plugin-pwa": "^1.3.0",
    "workbox-window": "^7.4.1"
  }
}
```

Important source folders:

- `3d generations:character sheets/`
- `src/assets/game/models/`
- `src/assets/game/art-direction/v2/`
- `src/assets/game/generated-race-v2/`
- `src/game/race/`
- `src/game/race/tracks/`
- `src/game/race/render/`
- `scripts/`

Race source file inventory:

```text
src/game/race/airTricks.js
src/game/race/camera/chaseCamera.js
src/game/race/driftFeel.js
src/game/race/heldItems.js
src/game/race/physics/kartPhysics.js
src/game/race/physics/kartTuning.js
src/game/race/physics/surfacePhysics.js
src/game/race/playtest/raceAutoplay.js
src/game/race/playtest/racePlaytestControls.js
src/game/race/playtest/racePlaytestNoopRuntime.js
src/game/race/playtest/racePlaytestRuntime.js
src/game/race/playtest/racePlaytestState.js
src/game/race/playtest/raceVisualScenarios.js
src/game/race/raceAudio.js
src/game/race/raceBreakables.js
src/game/race/raceCameraRuntime.js
src/game/race/raceControls.js
src/game/race/raceControlsBase.js
src/game/race/raceCrossers.js
src/game/race/raceDropRuntime.js
src/game/race/raceFinishRuntime.js
src/game/race/raceFrameClock.js
src/game/race/raceFrameUpdates.js
src/game/race/raceHitRuntime.js
src/game/race/raceHud.jsx
src/game/race/raceMotionRuntime.js
src/game/race/racePlayerFrame.js
src/game/race/raceProgress.js
src/game/race/raceRivals.js
src/game/race/raceRuntimeActions.js
src/game/race/raceRuntimeBaseSetup.js
src/game/race/raceRuntimeSetup.js
src/game/race/raceSceneRuntime.js
src/game/race/raceState.js
src/game/race/raceTelemetry.js
src/game/race/raceTelemetryDiagnostics.js
src/game/race/raceTelemetryRuntime.js
src/game/race/raceUpdateRuntime.js
src/game/race/raceVehicleRuntime.js
src/game/race/render/createBillboardText.js
src/game/race/render/createKartModel.js
src/game/race/render/createRacePickups.js
src/game/race/render/createRaceScene.js
src/game/race/render/createRaceScenery.js
src/game/race/render/createRaceVehicles.js
src/game/race/render/createTrackMesh.js
src/game/race/render/raceSceneTheme.js
src/game/race/render/raceVfx.js
src/game/race/render/syncRaceMeshes.js
src/game/race/rivalRacers.js
src/game/race/shortcutTriggers.js
src/game/race/track/trackGeometry.js
src/game/race/tracks/buildCenterline.js
src/game/race/tracks/comebackCity.js
src/game/race/tracks/index.js
src/game/race/tracks/penguinVillage.js
```

Game asset inventory snapshot:

```text
src/assets/game/art-direction/COMEBACK_CITY_ART_BIBLE.md
src/assets/game/art-direction/avatars/crrt-penguin-sheet.png
src/assets/game/art-direction/comeback-city-world-trait-sheet-v1.png
src/assets/game/art-direction/hud-controls-trait-sheet-v1.png
src/assets/game/art-direction/pickups-vfx-trait-sheet-v1.png
src/assets/game/art-direction/player-kart-trait-sheet-v1.png
src/assets/game/art-direction/rival-kart-family-trait-sheet-v1.png
src/assets/game/art-direction/v2/PROMPTS.md
src/assets/game/art-direction/v2/black-gold-elite-rival-trait-card-v2.png
src/assets/game/art-direction/v2/blue-speed-rival-trait-card-v2.png
src/assets/game/art-direction/v2/district-portals-facades-trait-card-v2.png
src/assets/game/art-direction/v2/green-utility-rival-trait-card-v2.png
src/assets/game/art-direction/v2/hero-red-kart-trait-card-v2.png
src/assets/game/art-direction/v2/material-lighting-camera-trait-card-v2.png
src/assets/game/art-direction/v2/orange-muscle-rival-trait-card-v2.png
src/assets/game/art-direction/v2/pickups-boost-vfx-trait-card-v2.png
src/assets/game/art-direction/v2/purple-tech-rival-trait-card-v2.png
src/assets/game/art-direction/v2/roadside-props-barriers-trait-card-v2.png
src/assets/game/art-direction/v2/track-geometry-road-system-trait-card-v2.png
src/assets/game/art-direction/v2/white-red-support-rival-trait-card-v2.png
src/assets/game/asset-manifest.json
src/assets/game/generated-race-v2/pickups/pickups-vfx-alpha-sheet.png
src/assets/game/generated-race-v2/player/player-boost.png
src/assets/game/generated-race-v2/player/player-lean-left.png
src/assets/game/generated-race-v2/player/player-lean-right.png
src/assets/game/generated-race-v2/player/player-straight.png
src/assets/game/generated-race-v2/rivals/rival-blue-a.png
src/assets/game/generated-race-v2/rivals/rival-blue-b.png
src/assets/game/generated-race-v2/rivals/rival-orange-a.png
src/assets/game/generated-race-v2/rivals/rival-orange-b.png
src/assets/game/generated-race-v2/rivals/rival-purple-a.png
src/assets/game/generated-race-v2/rivals/rival-purple-b.png
src/assets/game/generated-race-v2/road/road-boost-lane.png
src/assets/game/generated-race-v2/road/road-curve-left.png
src/assets/game/generated-race-v2/road/road-curve-right.png
src/assets/game/generated-race-v2/road/road-straight.png
src/assets/game/generated-race-v2/sheets/pickups-vfx-source.png
src/assets/game/generated-race-v2/sheets/player-kart-states-source.png
src/assets/game/generated-race-v2/sheets/rival-kart-family-source.png
src/assets/game/generated-race-v2/sheets/road-modules-source.png
src/assets/game/generated-race-v2/sheets/road-perspective-modules-source.png
src/assets/game/generated/district-facade-clinic.png
src/assets/game/generated/district-facade-food.png
src/assets/game/generated/district-facade-garage.png
src/assets/game/generated/district-facade-gym.png
src/assets/game/generated/district-facade-lab.png
src/assets/game/models/avatars/crrt-bunny.glb
src/assets/game/models/avatars/layer23-penguin.glb
src/assets/game/models/avatars/mizzle.glb
src/assets/game/models/avatars/seth-penguin.glb
src/assets/game/models/avatars/tclow-penguin.glb
src/assets/game/models/toy-car-kit/colormap.png
src/assets/game/models/toy-car-kit/item-banana.glb
src/assets/game/models/toy-car-kit/item-box.glb
src/assets/game/models/toy-car-kit/item-cone.glb
src/assets/game/models/toy-car-kit/vehicle-drag-racer.glb
src/assets/game/models/toy-car-kit/vehicle-racer-low.glb
src/assets/game/models/toy-car-kit/vehicle-racer.glb
src/assets/game/models/toy-car-kit/vehicle-vintage-racer.glb
src/assets/game/models/tripo/hero-kart-tripo.glb
src/assets/game/models/tripo/ice-sled.glb
src/assets/game/proof/comeback-city-kart-proof-desktop-v1.png
src/assets/game/proof/comeback-city-kart-proof-mobile-v1.png
src/assets/game/select/char-crrt-bunny.png
src/assets/game/select/char-layer23.png
src/assets/game/select/char-mizzle.png
src/assets/game/select/char-seth-penguin.png
src/assets/game/select/char-tclow.png
src/assets/game/select/kart-hero.png
src/assets/game/select/kart-icesled.png
src/assets/game/select/kart-kenney.png
```

Important repo documents:

- `COMEBACK_CITY_V2_3D_KART_RUNTIME_PRD.md`
- `src/assets/game/art-direction/v2/PROMPTS.md`
- `src/assets/game/asset-manifest.json`

Current V2 PRD summary:

- Build a new low-poly Three.js 3D kart runtime.
- Use real track geometry with curves/elevation.
- Use a chase camera following the player kart.
- Render grounded player kart, rivals, boost pads, item boxes, finish gate, and props.
- Use the V2 trait-card visual language.
- Use real 3D scene construction for the gameplay world.
- Promote to `/#race` only after visual, motion, playability, and QA gates pass.

Approved V2 art direction summary:

- Source of truth lives in `src/assets/game/art-direction/v2/`.
- Trait cards are design-lock references, not direct runtime sprites.
- Shared visual target: premium original arcade kart racer, N64-era readability with modern polish, glossy toy-like materials, chunky silhouettes, saturated clean color.
- Key V2 cards:
  - `hero-red-kart-trait-card-v2.png`
  - `purple-tech-rival-trait-card-v2.png`
  - `blue-speed-rival-trait-card-v2.png`
  - `orange-muscle-rival-trait-card-v2.png`
  - `green-utility-rival-trait-card-v2.png`
  - `black-gold-elite-rival-trait-card-v2.png`
  - `white-red-support-rival-trait-card-v2.png`
  - `track-geometry-road-system-trait-card-v2.png`
  - `district-portals-facades-trait-card-v2.png`
  - `roadside-props-barriers-trait-card-v2.png`
  - `pickups-boost-vfx-trait-card-v2.png`
  - `material-lighting-camera-trait-card-v2.png`

Raw asset folder facts:

`3d generations:character sheets/` contains high-resolution PNG concept sheets plus seven Tripo-generated GLB source models:

- `crrt-bunny.glb`
- `seth-3dpengu.glb`
- `tclow-ordinalpenguin.glb`
- `layer233d.glb`
- `mizzlepixelated3d.glb`
- `red+go-kart+3d+model.glb`
- `ice+sled+3d+model.glb`

Raw PNG/source sheet inventory:

| Source image | Dimensions | Apparent role |
|---|---:|---|
| `bunnycart.png` | 1254x1254 | CRRT Bunny/kart concept source |
| `glidercart.png` | 1536x1024 | Ice sled/glider cart source |
| `gokartred.png` | 1535x1024 | Red kart source |
| `hero-red-kart-trait-card-v2.png` | 1536x1024 | Approved hero kart V2 reference |
| `icefishitem.png` | 1254x1254 | Item concept |
| `icy game UI items.png` | 1491x1055 | Icy UI/item concept sheet |
| `layer23pixelated.png` | 1254x1254 | Layer 23 character source |
| `mizzlesitting.png` | 1254x1254 | Mizzle seated character source |
| `penguincoolercart.png` | 1254x1254 | Penguin cooler cart concept |
| `penguinglider.png` | 1536x1024 | Penguin glider concept |
| `sethhpengu.png` | 1254x1254 | Seth Penguin source |
| `shoppingcartracer.png` | 1254x1254 | Shopping cart racer concept |
| `stylized 3d game crates.png` | 1448x1086 | Prop/crate concept sheet |
| `tclow.png` | 1024x1536 | T Clow character source |
| `tclowjpeg.png` | 192x192 | T Clow small source/reference |
| `vechile select list.png` | 1672x941 | Vehicle selection concept sheet |
| `winter asset material concept.png` | 1491x1055 | Winter material concept |
| `winter themed game props.png` | 1448x1086 | Winter prop concept sheet |
| `winter themed items icons grid.png` | 1491x1055 | Winter item/icon concept sheet |

Raw GLB audit facts:

| Source GLB | Approx file size | Vertices | Triangles | Materials | Textures | Animations |
|---|---:|---:|---:|---:|---:|---:|
| `crrt-bunny.glb` | 14.7 MB | 281,749 | 488,998 | 1 | 1 JPEG | 0 |
| `ice+sled+3d+model.glb` | 15.8 MB | 293,087 | 501,388 | 1 | 1 JPEG | 0 |
| `layer233d.glb` | 15.5 MB | 300,716 | 501,594 | 1 | 1 JPEG | 0 |
| `mizzlepixelated3d.glb` | 15.4 MB | 297,312 | 501,420 | 1 | 1 JPEG | 0 |
| `red+go-kart+3d+model.glb` | 15.7 MB | 293,520 | 502,030 | 1 | 1 JPEG | 0 |
| `seth-3dpengu.glb` | 15.0 MB | 282,819 | 501,358 | 1 | 1 JPEG | 0 |
| `tclow-ordinalpenguin.glb` | 14.9 MB | 279,408 | 501,650 | 1 | 1 JPEG | 0 |

Raw GLB interpretation:

- The Tripo GLBs are useful as source art.
- The raw exports are too heavy for direct web/mobile race usage.
- The production pipeline needs automated audit, optimization, validation, and promotion.

Existing optimized runtime GLB facts:

The repo already contains smaller optimized runtime assets:

| Runtime GLB | Approx file size | Vertices | Triangles | Materials | Textures | Animations |
|---|---:|---:|---:|---:|---:|---:|
| `src/assets/game/models/avatars/crrt-bunny.glb` | 0.55 MB | 14,202 | 14,932 | 1 | 1 | 0 |
| `src/assets/game/models/avatars/seth-penguin.glb` | 0.48 MB | 12,017 | 12,826 | 1 | 1 | 0 |
| `src/assets/game/models/avatars/tclow-penguin.glb` | 1.94 MB | 50,023 | 64,948 | 1 | 1 | 0 |
| `src/assets/game/models/avatars/layer23-penguin.glb` | 3.84 MB | 87,255 | 100,350 | 1 | 1 | 0 |
| `src/assets/game/models/avatars/mizzle.glb` | 3.38 MB | 76,582 | 88,030 | 1 | 1 | 0 |
| `src/assets/game/models/tripo/hero-kart-tripo.glb` | 1.00 MB | 23,125 | 23,172 | 1 | 1 | 0 |
| `src/assets/game/models/tripo/ice-sled.glb` | 3.12 MB | 69,268 | 81,820 | 1 | 1 | 0 |

Existing runtime architecture facts:

- `src/game/ComebackCityThreeKartRace.jsx` imports Three.js, GLTFLoader, optimized avatar GLBs, optimized Tripo kart GLBs, generated facade images, track definitions, race mechanics, render helpers, and race CSS.
- The runtime has selectable characters and karts:
  - CRRT Bunny with Hero Kart
  - T Clow with Ice Sled
  - Seth Penguin
  - Mizzle
  - Layer 23
- The race has existing mechanics for acceleration, braking, steering, drift, boost pads, item pickups, rivals, lap progress, finish trigger, restart, held items, air tricks, and race telemetry.
- `src/game/race/tracks/index.js` registers tracks as content:
  - `COMEBACK_CITY_TRACK`
  - `PENGUIN_VILLAGE_TRACK`
- `src/game/race/render/createRaceScene.js` creates the Three.js renderer, ACES filmic tonemapping, fog, lighting, camera, and world group.
- `src/game/race/render/createTrackMesh.js` creates track render materials, boost pad visuals, road geometry, curbs, barriers, lanes, and related track visual meshes.
- `src/assets/game/asset-manifest.json` records asset provenance, license, role, budget, and fallback behavior.

Route and runtime facts:

- Main promoted race route: `/#race`.
- Isolated Three.js spike route: `/#race-3d-spike`.
- Visual/reference routes include `/#visual-plaza`, `/#visual-districts`, `/#visual-kart`, `/#visual-hud`, `/#visual-kart-proof`, and `/#visual-kart-playable`.
- The Three.js race root uses `data-testid="comeback-city-3d-kart-race"` and `data-race-renderer="three-kart"`.
- The race canvas uses `data-race-renderer="three-kart"` and `data-visual-canvas="race"`.
- The production visual asset set is `comeback-city-v2-three-runtime`.
- Authored model loading currently keeps procedural fallbacks in place if optional GLBs fail to load.
- Tripo rigs are lab-verified to face `+X`; the runtime applies `yaw = -Math.PI / 2` to face the driving direction.
- The Kenney drag racer faces `-Z`; the runtime applies `yaw = Math.PI`.
- The player can force the Kenney fallback body with `?kenneyKart=1`.
- A Blender-baked spike shell can be A/B loaded with `?bakedSpike=1`.
- Baked building GLBs can replace procedural districts while procedural boxes remain fallback.

Renderer facts:

- `createRaceRenderer` uses `THREE.WebGLRenderer`.
- Renderer options: antialias enabled, depth enabled, `powerPreference: "high-performance"`, `preserveDrawingBuffer: false`.
- Output color space: `THREE.SRGBColorSpace`.
- Tonemapping: `THREE.ACESFilmicToneMapping`.
- Tonemapping exposure: `1.2`.
- Runtime render scale: desktop `0.58`, mobile `0.6`.
- Raw DPR is capped at `2`.
- Race camera far plane is `580`.
- Fog near/far is `210`/`580`.
- Current race scene uses hemisphere, sun, and rim lights.
- Shadows are disabled in the main race renderer for performance.

Telemetry facts:

`window.__comebackCityKartTelemetry` currently exposes:

```text
airborne, auroraActive, avalanchePending, marchActive, avalancheTarget,
blizzardsOnTrack, character, kart, track, laps, slapping, fishBonesOnTrack,
boostHits, countdown, drift, driftCharge, driftTier, finished, heldItem,
fpsEstimate, itemPickups, lap, miniTurbo, miniTurboTier, position, propCount,
raceTime, renderer, rivalCount, rivalPositions, route, routeProgress, speed,
spinOuts, steer, tricksLanded, visualAssetSet, wallContact
```

Track data facts:

- `src/game/race/tracks/index.js` exports `KART_TRACKS = [COMEBACK_CITY_TRACK, PENGUIN_VILLAGE_TRACK]`.
- Default track key: `comeback-city`.
- Track definitions are pure data so Node-based QA scripts can import them.
- `COMEBACK_CITY_TRACK` uses `COMEBACK_CITY_COURSE_V2`, 3 laps, start offset `0.03`, bridge elevation band `{ from: 0.4, peak: 21, to: 0.534 }`, two ramps, one risky shortcut, opening facades, roadside props, and QA budgets `{ finishSeconds: 45, speedFloor: 140 }`.
- `PENGUIN_VILLAGE_TRACK` is a grey-box/new-track pass with built centerline waypoints, road ribbons, boost pads, item boxes, bridge elevation band `{ from: 0.55, peak: 17, to: 0.67 }`, one ramp, surface bands for asphalt/ice/snow, breakable objects, crossers, arctic palette, and QA budgets `{ finishSeconds: 45, speedFloor: 130 }`.
- Existing track content fields include `key`, `name`, `tagline`, `course`, `laps`, `startOffset`, `elevation`, `ramps`, `shortcut`, `surfaceBands`, `breakableObjects`, `crossers`, `palette`, `dressing`, and `budgets`.
- Existing course content fields include centerline/minimap path, road ribbons, boost pads, item boxes, district anchors, and scenery anchors.

Existing QA gate facts:

- `scripts/kart-3d-spike-test.mjs` runs against a production `vite preview` server after `npm run build`.
- It captures `#race-3d-spike` desktop at `1365x768`, `#race-3d-spike` mobile at `390x844`, and promoted `#race` desktop at `1365x768`.
- It records a desktop 10-second WebM.
- It waits for `[data-testid="comeback-city-3d-kart-race"][data-race-renderer="three-kart"]`.
- It requires telemetry renderer `three-kart`.
- It requires countdown complete and `fpsEstimate >= 34`.
- It samples median FPS and fails below `34`.
- It requires one Three.js race canvas, zero Pixi race canvases, zero old arcade WebGL canvases, and `propCount >= 20`.
- It requires telemetry `visualAssetSet === "comeback-city-v2-three-runtime"`.
- It compares start/motion screenshots and requires visible image change.
- Existing `scripts/visual-reference-checks.mjs` captures visual panels and compares them against a reference image with mean-difference thresholds.
- Existing visual checks verify required selectors, forbidden fallback/reference elements, WebGL canvas presence, layout boxes, aspect ratios, and route-specific DOM markers.

Existing asset provenance notes:

- Some models are owner-generated with Tripo from owner-authored renders or approved V2 trait cards.
- Some toy car kit models come from Kenney Toy Car Kit under CC0.
- The manifest records source, license, runtime role, size budget, and fallback for game assets.

Strategic direction:

- Keep the current React/Vite/Three.js game runtime and existing mechanics.
- Build a repeatable asset pipeline around the existing runtime.
- Promote raw generated assets into optimized runtime GLBs through scripted audit, optimization, validation, and visual proof.
- Build visually stronger tracks through data-driven track definitions plus modular track kits and optional authored GLB segments.
- Use Unreal Engine 5.8 MCP as an optional look-development and track staging lab.
- Use Unreal outputs as references, GLB exports, textures, or staging proofs that feed back into the Three.js runtime.
- Defer Seedance/video-generation subscriptions until actual runtime screenshots and videos prove the playable game visuals.

Primary research target:

Find the best production workflow for turning the existing local source assets and V2 art direction into optimized, visually strong, testable Three.js race visuals and tracks.

External upload checklist:

- Upload this Markdown file or paste the relevant prompt plus the full Shared Repo Context.
- Upload V2 art cards when the research model can inspect images:
  - `hero-red-kart-trait-card-v2.png`
  - `track-geometry-road-system-trait-card-v2.png`
  - `roadside-props-barriers-trait-card-v2.png`
  - `pickups-boost-vfx-trait-card-v2.png`
  - `material-lighting-camera-trait-card-v2.png`
  - `district-portals-facades-trait-card-v2.png`
- Upload one or two current runtime screenshots if the research run supports image review.
- Use the embedded GLB audit tables for research. Upload raw GLB binaries only for a tool or model that can inspect 3D files directly.
- Use the final Pro synthesis run with both completed research reports pasted in full.

---

## Deep Research Prompt 1: Three.js Asset And Runtime Pipeline

```markdown
Goal: Produce a practical, implementation-ready Three.js asset pipeline for the Comeback City kart game.

Success means:
- The report defines a repeatable path from raw GLB/PNG source assets to optimized runtime assets.
- The report fits the shared repo context exactly.
- The report gives concrete GLB, texture, triangle, memory, and bundle budgets for a browser/mobile kart game.
- The report identifies exact tools, commands, scripts, package dependencies, and CI gates.
- The report explains how to preserve the existing React/Vite/Three.js race mechanics while improving the visuals.
- The report cites current official or primary documentation for Three.js, glTF, glTF-Transform, Blender if used, Playwright, and WebGL/mobile performance.
- The report labels assumptions and asks exact follow-up questions where the embedded context is insufficient.

Stop when a coding agent can implement the first version of the asset pipeline from the report alone.

Use the Shared Repo Context above as the fixed project context.

Research and return:

1. Executive Recommendation
Explain the best asset pipeline in plain engineering language.

2. Runtime Asset Pipeline
Design the flow:
raw source folder -> audit -> classify -> optimize -> validate -> preview -> capture proof -> promote -> update manifest.

3. GLB Optimization Strategy
Specify the exact use of glTF-Transform and related tools:
- inspect
- validate
- weld
- dedup
- prune
- texture resize
- simplification
- optional meshopt or Draco choices
- output format choices for Vite/Three.js
- fallback strategy for unsupported compression

4. Asset Budgets
Recommend budget targets for:
- hero kart
- rival kart
- seated character
- simple prop
- complex prop
- item box
- boost pad
- track module
- full visible race scene
- texture dimensions
- GLB file size
- GPU memory
- draw calls

5. Script Plan
Propose exact scripts and npm commands:
- `scripts/audit-game-assets.mjs`
- `scripts/optimize-game-glbs.mjs`
- `scripts/validate-game-assets.mjs`
- `scripts/render-asset-gallery.mjs`
- `scripts/capture-race-proof.mjs`
- `scripts/compare-race-visuals.mjs`
- `scripts/promote-approved-assets.mjs`

For each script, include:
- inputs
- outputs
- required packages
- command examples
- pass/fail criteria
- generated files

6. File Structure
Recommend exact folders for:
- raw assets
- working assets
- optimized runtime assets
- rejected assets
- generated thumbnails
- visual proof evidence
- manifests
- asset budgets

7. Runtime Integration
Explain how the optimized assets should integrate with:
- `src/game/ComebackCityThreeKartRace.jsx`
- `src/game/race/render/*`
- `src/game/race/tracks/*`
- `src/assets/game/asset-manifest.json`

8. Visual Proof
Define an automated screenshot/video proof workflow using Playwright:
- desktop screenshot
- mobile screenshot
- 10-second desktop video
- 10-second mobile video
- asset gallery screenshot
- contact sheet against V2 references
- WebGL nonblank canvas checks
- fallback detection checks

9. CI Gates
Define gates that work with existing scripts:
- `npm run build`
- `npm run test:kart-proof`
- `npm run test:kart-playable`
- `npm run test:kart-3d-spike`
- `npm run test:visual`
- `npm run test:webgl`
- `npm run test:bundle`

10. Implementation Phases
Break implementation into small phases a coding agent can execute.

11. Risks And Decisions
List open questions and exact decisions needed from the owner.

12. Sources
Link every official or primary source used.
```

---

## Deep Research Prompt 2: Track Production, Visual Direction, And Unreal MCP Look-Dev

```markdown
Goal: Produce a practical track and look-development workflow for making Comeback City race visuals match the approved V2 art direction while keeping the game in Three.js.

Success means:
- The report defines how to build visually strong tracks for the existing data-driven Three.js race runtime.
- The report compares procedural Three.js tracks, modular track kits, Blender-authored GLB segments, and Unreal MCP look-development.
- The report explains where Unreal Engine 5.8 MCP adds value as an optional lab.
- The report explains how outputs from Unreal or Blender can feed back into the Three.js runtime.
- The report defines acceptance criteria for track visuals, camera, lighting, props, grounding, density, and performance.
- The report cites current official or primary documentation for Unreal MCP, Unreal Engine 5.8, Blender/glTF export, Three.js, and relevant licensing.
- The report labels assumptions and asks exact follow-up questions where the embedded context is insufficient.

Stop when a coding agent can implement a first track-kit and visual proof workflow from the report alone.

Use the Shared Repo Context above as the fixed project context.

Research and return:

1. Executive Recommendation
Recommend the best track production workflow for this repo.

2. Track Authoring Strategy
Compare these options:
- pure JS/JSON track definitions
- procedural Three.js mesh generation
- modular track kit pieces
- Blender-authored GLB track segments
- Unreal-authored look-dev scenes exported back to Three.js

3. Recommended Hybrid Workflow
Design the best hybrid workflow for this game:
- keep mechanics data-driven
- use authored visual modules where they improve quality
- keep track collision/progress deterministic
- use art cards as the visual source of truth
- use visual proof before route promotion

4. Track Data Model
Recommend fields for track definitions:
- centerline
- width bands
- elevation
- banking
- boost pads
- item boxes
- finish gate
- hazards
- props
- district portals
- scenery zones
- camera hints
- mobile crop hints

5. Modular Track Kit
Define the runtime-ready track kit:
- straight
- left curve
- right curve
- S-curve
- ramp up
- ramp down
- tunnel approach
- bridge/overpass
- curb sections
- barriers
- rails
- lane markings
- boost pad
- item box
- finish/checkpoint gate
- district facade/portal props

6. Visual Style Translation
Explain how to translate the V2 cards into runtime choices:
- glossy toy-like materials
- chunky silhouettes
- readable N64-era shapes with modern polish
- saturated clean color
- neon accents
- asphalt, curb, rubber, portal glow, fire, foliage, barriers
- chase camera and mobile framing

7. Unreal MCP Optional Lab
Research Unreal Engine 5.8 MCP and explain:
- setup requirements
- what MCP exposes to an AI coding agent
- how it can stage lighting, materials, layout, and track-kit previews
- how it can create reference scenes
- how GLB/texture outputs can come back to Three.js
- how to keep Unreal as optional look-dev instead of the production runtime
- what evidence should prove Unreal adds value before expanding usage

8. Blender Optional Workflow
Explain when Blender CLI should be used:
- cleanup
- origin correction
- scale normalization
- decimation
- UV/material fixes
- GLB export
- track segment baking

9. Visual QA Gates
Define track-specific visual gates:
- real 3D geometry
- grounded karts
- readable road edge
- visible elevation or curve
- prop density target
- district identity
- no placeholder/fallback visuals
- no blank WebGL canvas
- stable desktop/mobile framing
- FPS target

10. Evidence Plan
Define the proof artifacts:
- desktop screenshot
- mobile screenshot
- 10-second desktop video
- 10-second mobile video
- top-down track layout
- contact sheet against V2 cards
- asset gallery
- track module gallery

11. Licensing And Provenance
Explain how to record:
- owner-generated Tripo assets
- Kenney CC0 assets
- paid Fab/Marketplace assets if used
- Unreal-rendered reference output
- Unreal-generated/exported runtime assets
- third-party textures/HDRIs/plugins

12. Implementation Roadmap
Break the work into phases:
- track-kit schema
- first modular visual kit
- first authored visual segment
- first proof route
- first screenshot/video gate
- optional Unreal MCP lab
- final route promotion

13. Sources
Link every official or primary source used.
```

---

## Pro Synthesis Prompt: Combine Two Research Reports Into The Final Build Plan

```markdown
Goal: Synthesize two Deep Research reports into one final implementation plan for the Comeback City automated Three.js asset and track pipeline.

Success means:
- The final plan chooses one clear workflow.
- The final plan preserves the existing React/Vite/Three.js game mechanics.
- The final plan turns raw generated assets into optimized runtime assets through repeatable scripts.
- The final plan creates visually strong data-driven tracks with modular assets and proof gates.
- The final plan places Unreal MCP in the correct optional role.
- The final plan gives a coding agent exact files, scripts, phases, commands, and acceptance criteria.
- The final plan resolves conflicts between the two reports with explicit reasoning.
- The final plan lists the smallest set of owner decisions required before implementation.

Stop when the output is ready to paste into Codex as an implementation brief.

Inputs:

1. Shared Repo Context from the prompt pack.
2. Deep Research Report 1: Three.js Asset And Runtime Pipeline.
3. Deep Research Report 2: Track Production, Visual Direction, And Unreal MCP Look-Dev.

Read both reports and produce:

1. Final Recommendation
State the chosen workflow in one page or less.

2. Implementation Brief For Codex
Write a direct build brief that a coding agent can execute in the repo.

3. Final File Structure
List the exact folders and files to create or modify.

4. NPM Scripts
List the exact `package.json` scripts to add.

5. Automation Scripts
For each script, define:
- path
- purpose
- inputs
- outputs
- packages used
- pass/fail behavior
- first implementation scope

6. Asset Budgets
Return final budget numbers for:
- source GLB acceptance
- optimized GLB acceptance
- kart
- character
- prop
- track module
- full scene
- texture dimensions
- bundle size
- FPS

7. Track Workflow
Return the final track production workflow:
- track definition schema
- visual module kit
- authored asset integration
- runtime placement
- camera/framing proof
- mobile proof

8. Visual QA Gates
Return final gates that can be automated:
- asset audit gate
- optimization gate
- manifest gate
- route render gate
- screenshot gate
- video gate
- visual comparison gate
- FPS/bundle gate

9. Unreal MCP Role
Define exactly when to use Unreal MCP and what output counts as useful:
- reference screenshots
- lighting/material staging
- modular track layout
- exported GLB/texture assets
- evidence that improves the Three.js runtime

10. Seedance Decision
State when video generation becomes useful and what proof should come first.

11. Owner Decisions
List only the questions the owner must answer before implementation.

12. Phase Plan
Return a phase-by-phase build plan:
- Phase 1: inventory and manifest
- Phase 2: GLB optimization scripts
- Phase 3: asset preview gallery
- Phase 4: track-kit schema
- Phase 5: first visual proof route
- Phase 6: automated screenshot/video evidence
- Phase 7: route promotion
- Phase 8: optional Unreal MCP lab

13. First Codex Task
Write the exact first prompt to give Codex to start implementation.
```
