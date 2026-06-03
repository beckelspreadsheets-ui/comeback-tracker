# Hyperrealistic Interactive Gallery PRD

| Field | Details |
| --- | --- |
| Product | Showcase Designs `/world` interactive gallery |
| PRD focus | Turn the current gallery into the rightmost GPT image-gen concept direction |
| Date | 2026-05-08 |
| Status | Ready for goal-mode implementation |
| Reference image | `img/world/hyperrealistic-gallery-target-right.png` |
| Full concept sheet | `img/world/hyperrealistic-gallery-target.png` |
| Primary route | `/world` |
| Stable preview | https://showcase-designs-preview.pages.dev/world |

## 1. Target Outcome

Rebuild `/world` so it feels like a top-tier, hyperrealistic private digital art gallery, using the rightmost generated reference as the visual target.

The finished gallery should feel closer to a luxury architectural visualization than a game level:

- Dark stone showroom walls with real material variation.
- Polished dark floor with soft, imperfect reflections.
- Black metal and glass detailing.
- Large framed digital website exhibits mounted like premium artwork.
- Warm wall-wash lighting, ceiling coves, and focused spotlights.
- Low premium seating that helps the room feel real.
- First-person movement that feels grounded, bounded, and smooth.
- Clickable website exhibits that can be inspected and minimally scrolled.
- Mobile controls that make walking easy without tanking performance.

## 2. Non-Negotiables

- Keep four current website exhibits for now: EvenPath Homes, Felco Vending, Abel M. Fitness, and Beckel Spreadsheets.
- Keep the exhibits distributed around the room with breathing room. Do not cluster two exhibits on one wall unless explicitly approved later.
- Do not add empty placeholder canvases.
- Do not use phone silhouettes, camera notches, phone speakers, or fake device hardware.
- Website screenshots should fill the exhibit frames edge-to-edge as premium digital artworks.
- Remove visual linework that makes the room look drawn, cheap, or low-poly.
- Do not let the player fly through walls, exhibits, seating, or major fixtures.
- Preserve `/` as the fast static marketing site.
- Preserve clickable live-site actions.
- Preserve mobile performance as a hard launch requirement.

## 3. Visual Direction

Use `img/world/hyperrealistic-gallery-target-right.png` as the main art reference.

### 3.1 Materials

| Surface | Target |
| --- | --- |
| Walls | Large dark graphite stone or concrete slabs, subtle seams, roughness variation, no gold outline artifice. |
| Floor | Dark polished stone or concrete, glossy but not mirror-perfect, soft blurred reflections, visible wear and micro-scratches. |
| Ceiling | Dark textured ceiling with perimeter cove lighting and minimal black track fixtures. |
| Frames | Thin blackened metal frames, subtle bevels, real thickness, soft edge highlights. |
| Glass | Optional subtle screen glass/reflection layer, visible only at grazing angles. |
| Seating | Low black or dark brown leather bench/ottoman, realistic proportions, contact shadow, no oversized cartoon bevels. |
| Accent metal | Use brass/gold only as tiny premium accents, not dominant trim. |

### 3.2 Lighting

The room should be lit like a real gallery:

- Warm ceiling cove lighting around edges.
- Narrow wall-wash pools above each exhibit.
- Small black spotlights or downlights with believable placement.
- Contact shadows under frames, seating, benches, and wall fixtures.
- No neon glow, arcade bloom, or heavy gold rim lighting.
- Mobile mode should use baked/fake lighting instead of expensive realtime shadows.

### 3.3 Composition

The default camera view should immediately communicate the premium room:

- Human eye height.
- Slightly wide lens, not fisheye.
- Visible floor reflection and ceiling lighting.
- At least one framed website exhibit clearly visible.
- Seating visible enough to ground the room.
- No UI panel should dominate the first viewport.

## 4. Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| G-1 | First-person walkable room | P0 | Desktop keyboard/mouse and mobile touch controls move the viewer around the gallery. |
| G-2 | Collision boundaries | P0 | Viewer cannot pass through walls, exhibits, bench/seating, or the glass wall area. |
| G-3 | Exhibit click interaction | P0 | Walking up to a website exhibit and clicking/tapping opens inspection mode instead of immediately breaking immersion. |
| G-4 | Minimal exhibit scroll | P0 | In inspection mode, user can scroll/pan the website screenshot vertically. |
| G-5 | Live-site action | P0 | Each exhibit still exposes a clear action to open the live site in a new tab. |
| G-6 | Fullscreen-friendly POV | P1 | A clear fullscreen/immersive control exists and the camera framing improves when fullscreen is active. |
| G-7 | Mobile walking | P0 | Mobile controls are visible, ergonomic, and do not overlap critical exhibit interaction UI. |
| G-8 | Return/escape controls | P0 | User can exit inspection mode and return to walking without reloading the page. |
| G-9 | Station selection fallback | P1 | Existing station chips or panel controls remain usable as a fallback, but stay visually minimized. |
| G-10 | Low-motion fallback | P0 | Reduced-motion and unsupported WebGL users are sent to the static site or a graceful fallback. |

## 5. Interaction Model

### 5.1 Walking Mode

Walking mode is the default.

- Desktop: WASD or arrow keys to move, pointer drag to look.
- Mobile: left thumb joystick for walking, drag scene to look.
- Movement is horizontal only. No vertical flight.
- Camera height stays human-scaled.
- Collision uses simple 2D bounds and circular/rectangular blockers.
- Renderer only draws while moving, looking, animating, or interacting.

### 5.2 Exhibit Proximity

When the viewer approaches an exhibit:

- Show a restrained hover/focus state on the frame.
- Show a small contextual affordance such as "Inspect" or an icon button in the existing UI layer.
- Do not add bright outlines or game-like halos.
- Selection should ease the camera toward the exhibit, but only enough to inspect it.

### 5.3 Inspection Mode

Inspection mode should feel like standing in front of a digital artwork.

- Camera locks to a comfortable viewing distance.
- The selected website becomes the active scroll target.
- Wheel, trackpad, touch drag, or a minimal scroll control moves the screenshot inside the frame.
- A compact "Open site" action remains available.
- Escape key, back button, or tapping away exits inspection mode.
- The room remains visible around the exhibit where possible.

## 6. Technical Approach

The current no-build static Three.js setup should stay unless implementation proves it cannot hit performance targets.

### 6.1 Rendering Strategy

- Keep demand-driven rendering as the default.
- Use a lightweight "smooth" mode for production/mobile.
- Use baked canvas textures, material maps, and light/shadow planes for realism.
- Avoid expensive realtime shadows on mobile.
- Keep optional cinematic mode behind `?cinematic=1` if heavier PBR materials are useful for desktop testing.
- Prefer fewer, better materials over many small decorative meshes.

### 6.2 Scene Upgrades

Implement in this order:

1. Replace fake decorative wall linework with realistic large-format dark stone slab textures.
2. Replace floor with polished dark stone/concrete texture plus baked reflection sheen.
3. Rebuild exhibit frames as thin black metal gallery frames with screen-glass layer.
4. Add cove lighting, wall-wash pools, and focused fixture geometry.
5. Rework seating into a low leather ottoman/bench with realistic scale and contact shadow.
6. Add optional glass wall/window feature only if it can be done cheaply and improves realism.
7. Tune default camera, station camera offsets, and fullscreen framing.
8. Add/finish collisions for room perimeter and major props.

### 6.3 File Targets

Expected implementation files:

- `world.js`: scene geometry, materials, lighting, collisions, camera behavior, exhibit interaction.
- `world.css`: minimized UI, mobile controls, fullscreen affordance, inspection controls.
- `world.html`: any required UI hooks for fullscreen, inspection, and mobile movement.
- `world-data.js`: station positions, rotations, camera offsets, and collision metadata if needed.
- `verify-world.mjs`: automated assertions for PRD requirements.
- `img/world/*`: reference image and any optimized texture assets.

## 7. Performance Requirements

The scene must feel smooth before it is considered done.

| Metric | Requirement |
| --- | --- |
| Mobile FPS floor | 30fps sustained minimum during walking |
| Mobile target | 45fps+ on mid-tier phones where possible |
| Desktop target | 60fps-feeling movement on modern laptops |
| Mobile DPR | Adaptive, capped around 0.75-1.0 unless proven safe |
| Continuous idle loop | Not allowed |
| Mobile draw calls | Keep low enough that movement remains smooth; target under 120 visible calls |
| Mobile triangles | Target under 20k visible triangles |
| Texture payload | Optimize screenshots and generated/baked textures before deploy |
| Postprocessing | Avoid on mobile; optional desktop-only only if performance remains strong |

## 8. Quality Bar

The implementation is not complete until screenshots and walkthroughs visually clear these checks:

- The room no longer looks outlined, flat, or drawn.
- Wall surfaces read as real dark stone or concrete, not simple black planes.
- Floor reflections are present but subtle and believable.
- Lighting creates soft pools around exhibits and realistic contact shadows.
- Frames look like premium gallery hardware, not phones or UI mockups.
- The seating feels physically grounded.
- The first view looks premium before the user moves.
- The gallery remains readable on mobile without UI covering the scene.
- The user cannot walk through physical objects.
- Interaction with websites feels intentional and inspectable.

## 9. Verification Plan

Run local verification before deploy:

```bash
node verify-world.mjs
```

Browser QA:

- Desktop `/world` at 1440x900.
- Mobile `/world` at 390x844.
- Pointer/mouse walking and looking.
- Mobile joystick walking and touch looking.
- Exhibit inspect, scroll, exit, and open-site flow.
- Fullscreen entry/exit.
- Collision against each wall, exhibit, and bench.

Production verification after deploy:

```bash
SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-production.mjs
```

## 10. Release Criteria

Ship when all of these are true:

- `node verify-world.mjs` passes.
- Production verifier passes on Cloudflare Pages.
- Mobile walking is smooth enough to use without frustration.
- Visual result clearly resembles the rightmost reference image.
- No phone-camera/notch elements remain.
- No fake decorative linework remains.
- Exhibits are clickable, inspectable, and minimally scrollable.
- Collision prevents flying through room geometry and props.
- The route works at `https://showcase-designs-preview.pages.dev/world`.

## 11. Explicit Non-Goals

- Do not migrate to React/R3F unless performance or maintainability forces it.
- Do not add multiplayer, avatars, minimaps, or game mechanics.
- Do not build a CMS.
- Do not replace the static marketing homepage.
- Do not add more project exhibits until the four-current-exhibit room is visually excellent.
- Do not use heavy realtime raytracing, path tracing, or mobile postprocessing.
