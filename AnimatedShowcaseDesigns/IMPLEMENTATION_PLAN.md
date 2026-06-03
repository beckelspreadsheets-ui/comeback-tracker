# Showcase Designs v3 Implementation Plan

## Current Photo-Match Revision

For the next `/world` visual pass, use `WORLD_PHOTO_MATCH_PRD.md` as the controlling Code Mode handoff. It documents the stricter gap between the current performant gallery and the rightmost hyperrealistic reference, including measurable composition, lighting, material, UI, screenshot-verification, and owner-approval gates.

The owner approved superseding the older "do not cluster two exhibits on one wall" rule on 2026-05-09. The right-reference hero wall may keep three exhibits on the main wall, with side walls reserved for growth.

## Scope

Build the PRD as a no-build static site:

- `/` served by `index.html`
- `/world` served by `world.html`
- Static page remains canonical and does not load Three.js
- `/world` provides the opt-in Three.js studio gallery
- Approved launch station set:
  - EvenPath Homes
  - Felco Vending
  - Abel M. Fitness
  - Beckel Spreadsheets

Gustavo's Landscape was removed from the launch set because it is not an approved paying client. Re-add only after explicit operator approval and a passing live URL.

Saddlebrooke Strength is not included in this implementation because no Saddlebrooke screenshot exists in the imported base repo.

## File Plan

| File | Purpose |
| --- | --- |
| `index.html` | Static marketing route copied from `v3-preview.html`, with studio toggle and query-param routing |
| `v3-preview.html` | Backward-compatible preview copy of the static page |
| `world.html` | 3D studio gallery document and fallback shell |
| `world.css` | Shared brand styling for `/world`, fallback UI, and accessible station panel |
| `world-data.js` | Data-driven station list |
| `world.js` | Three.js scene, routing guards, interactions, analytics hooks, and on-demand rendering |
| `README.md` | Updated local preview and route notes |
| `PRD.md` | Source product requirements |

## Build Steps

1. Import the static base repo into this workspace.
2. Create `index.html` from the current `v3-preview.html`.
3. Add static route guards:
   - reduced motion wins over scenic routing
   - `?lite=1` clears `mode-preference`
   - `?scenic=1` checks WebGL 2.0 eligibility before routing to `/world`
4. Add visible static-to-world navigation.
5. Add stable case-study IDs to existing project articles.
6. Create `/world` files:
   - `world.html`
   - `world.css`
   - `world-data.js`
   - `world.js`
7. Implement `/world` hard guards:
   - `?lite=1` routes to `/`
   - reduced motion routes to `/`
   - unsupported WebGL shows fallback
   - low-tier/save-data devices show fallback with optional try-anyway when WebGL exists
8. Build a restrained studio scene:
   - floor, walls, ceiling
   - warm ambient and key lights
   - fixed first-person camera at about 1.6m
   - phone-shaped screenshot stations
   - label panels and badges
9. Add interactions:
   - pointer hover/focus glow
   - keyboard station list
   - station click camera glide
   - live-site opening with `window.open(liveUrl, '_blank', 'noopener')`
   - case-study navigation to static anchors
   - bounded screenshot scroll during active states only
10. Add lightweight analytics hooks:
   - use `window.dataLayer` or `window.gtag` when present
   - otherwise no-op without errors
11. Verify:
   - file presence
   - route behavior through a local static server
   - no Three.js import in `index.html`
   - `/world` references Three.js only on the opt-in route
   - station data includes required fields
   - all existing local screenshot paths resolve

## Deferred Manual Verification

These launch gates require production analytics or real devices and cannot be proven by local static checks alone:

- p75 Core Web Vitals
- 90-second mobile thermal behavior
- real iOS Safari and Android device FPS
- Nginx production rewrites
- operator launch approval

The implementation should still include code-level support for these gates.
