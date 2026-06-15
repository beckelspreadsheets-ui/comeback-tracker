# Penguin Kart VFX — Phased Implementation Gameplan

> Approved gameplan saved before Phase 1. Do not edit gameplay code until this file is committed.

---

## Phase Order

| Phase | Scope | Status |
|---|---|---|
| Phase 0 | Save this plan, run read-only checks | In progress |
| Phase 1 | Existing drift VFX polish only | Blocked until screenshots approve each task |
| Phase 2 | Particle / item VFX (boost, shield, snowball, fish bone, blizzard, aurora, pickups) | Do not start without user approval |
| Phase 3 | Penguin Village track dressing (arch, statues, igloos, crystals, stalls) | Do not start without user approval |
| Phase 4 | Audio plan and wiring | Do not start without user approval and original audio assets |

**Stop after Phase 1.** Do not begin Phase 2 without explicit user approval.

---

## No-Touch Files (Hard)

These files affect gameplay, physics, item behavior, rival behavior, audio, track collision, or balance. Do not modify them.

- `src/game/race/physics/kartTuning.js`
- `src/game/race/physics/kartPhysics.js`
- `src/game/race/physics/surfacePhysics.js`
- `src/game/race/airTricks.js`
- `src/game/race/heldItems.js`
- `src/game/race/rivalRacers.js`
- `src/game/race/raceBreakables.js`
- `src/game/race/raceCrossers.js`

Also avoid adding point lights, bloom, post-processing, volumetric fog, realistic smoke/fire/snow, high-poly particle systems, or audio before visual systems are stable.

---

## Visual Style Guide

**Target:** toy-like 3D arcade kart-racer assets, *not* strict N64.

- Rounded chunky shapes, soft bevels, clean simplified forms
- Clean PBR-style / toon materials: matte plastic, rubber, painted metal, frosted ice
- Simple mesh-based VFX only (no expensive particle systems)
- Faceted treatment only where it naturally fits: ice chunks, crystals, drift sparks, snowball pieces, fish bone hazard, blizzard geometry, aurora panels
- Bright readable silhouettes, mascot-friendly proportions
- Cyan/ice-blue VFX accents
- Warm amber (`#F5A623`) only for cozy windows/signage

**Approved palette:**

| Hex | Name | Use |
|---|---|---|
| `#F5F8FF` | Ice White | Spark base, snow, crystal base |
| `#00E5FF` | Bright Cyan | Primary VFX accent, trails, shields |
| `#7EC8E8` | Ice Blue | Secondary ice material |
| `#FF8C00` | Flame Orange | Boost flame core |
| `#FFD34F` | Flame Yellow | Boost flame mid, pickup ring |
| `#00E5C9` | Aurora Teal | Aurora left band |
| `#39FF8C` | Aurora Green | Aurora center band |
| `#7B61FF` | Aurora Violet | Aurora right band |
| `#F5A623` | Warm Amber | Windows/signage only |

---

## Screenshot Checklist

Run dev server:

```bash
npm run dev -- --host 127.0.0.1
```

Suggested test URLs:

- `/?playableAutoplay=1&track=penguin-village#race`
- `/?itemShowcase=1&track=penguin-village#race`

Required screenshots:

- [ ] Phase 1 Task 1 — active drift sparks showing new ice-gem palette
- [ ] Phase 1 Task 2 — active drift sparks after emissive/glow tuning
- [ ] Phase 1 Task 3 — cyan burst ring visible immediately after drift release (mini-turbo)
- [ ] Phase 1 Task 4 — tier 2+ drift ice trail visible behind rear tires

Each screenshot must show chase-cam gameplay with the kart and VFX clearly visible. If a screenshot looks wrong, stop and fix that task before moving on.

---

## Phase 1 Task Cards

### Task 1: Drift spark palette

- **File:** `src/game/race/driftFeel.js`
- **Search for:** `DRIFT_FEEL.sparkColors`
- **Current value:** `['#f7fbff', '#46d9ef', '#ff9a2e', '#c879ff']`
- **Change:** set to `['#F5F8FF', '#00E5FF', '#7EC8E8', '#7B61FF']`
- **Why:** unify drift sparks to the approved ice-gem palette
- **Acceptance:** sparks read cyan/ice/violet while drifting instead of orange
- **Screenshot:** active drift on penguin-village track, chase cam
- **Commit:** `Polish drift spark ice-gem palette`

### Task 2: Lower spark emissive intensity

- **File:** `src/game/ComebackCityThreeKartRace.jsx`
- **Search for:** `driftSparkGroup` creation block around line 544 and update block around line 3400
- **Change:** reduce initial `emissiveIntensity` in the creation block (currently `1.0`) and/or reduce the update formula (currently `0.9 + sparkTier * 0.25`) so sparks look like polished chunky ice gems rather than harsh neon blobs.
- **Constraint:** keep materials faceted/dodecahedral; do not soften geometry.
- **Acceptance:** sparks glow but do not blow out on screen
- **Screenshot:** active drift sparks, chase cam
- **Commit:** `Tune drift spark glow for polished ice`

### Task 3: Mini-turbo cyan burst ring

- **File:** `src/game/ComebackCityThreeKartRace.jsx`
- **Goal:** add a persistent low-poly cyan torus/ring effect for mini-turbo release.
- **Implementation notes:**
  - Create the ring mesh *once* inside `createGroundedKartModel` and attach it to `model`.
  - Hide it by default.
  - During the per-frame update, when `miniTurboActive` becomes true (or on the frame `events.released` fires), animate scale up + fade out over `DRIFT_FEEL.releaseFlash`.
  - Reuse the same mesh; do not create/destroy meshes per frame.
- **Material:** `createBasicMaterial('#00E5FF', { emissive: '#00E5FF', emissiveIntensity: ~0.8 })`
- **Acceptance:** a clean cyan ring bursts outward from the kart on mini-turbo release
- **Screenshot:** the frame right after drift release, chase cam
- **Commit:** `Add mini-turbo cyan burst ring`

### Task 4: Tier 2+ ground ice trail

- **File:** `src/game/ComebackCityThreeKartRace.jsx`
- **Goal:** add a small capped trail of frosted ice rectangles/chips behind the rear tires for tier 2+ drifts only.
- **Implementation notes:**
  - Use fixed reusable meshes (e.g., 8–12 small boxes/planes total) positioned behind the rear wheels.
  - Show/position them only when `driftState.tier >= 2` and `race.drift` is active.
  - Cycle positions so the trail reads as moving chips, not smoke/fog.
  - No unbounded particles. No new mesh creation per frame.
- **Material:** frosted ice toon/basic material in `#F5F8FF`/`#7EC8E8`
- **Acceptance:** visible ice chips trail behind rear tires during tier 2/3 drifts
- **Screenshot:** tier 2+ drift on penguin-village track, chase cam
- **Commit:** `Add capped tier-two drift ice trail`

---

## Decision Notes

1. **Start arch text remains "THE ICE IS NICE".** Do not change it during Phase 1.
2. **Later arch polish** should make "NICE" feel like playful icy cursive/script lettering. That work belongs in Phase 3, after Phase 1 is approved.
3. **Seth and T Clow statues must use actual GLB clones first:**
   - `src/assets/game/models/avatars/seth-penguin.glb`
   - `src/assets/game/models/avatars/tclow-penguin.glb`
4. **Layer 23 and Mizzle are reserved for variety later:**
   - `src/assets/game/models/avatars/layer23-penguin.glb`
   - `src/assets/game/models/avatars/mizzle.glb`
5. **Phase 1 stays inside:**
   - `src/game/ComebackCityThreeKartRace.jsx`
   - `src/game/race/driftFeel.js`
6. **Do not create a VFX module during Phase 1.** Keep changes local to the existing runtime.
7. **Consider a small VFX module only after Phase 1 screenshots are approved.** If Phase 2 begins, evaluate whether `src/game/race/render/` deserves a focused VFX helper.
8. **Audio is deferred until original audio assets are ready.** Do not synthesize, import, or wire sounds in Phase 1.
9. **Fresh screenshots are required after every visual step.** No task advances without a screenshot.
10. **Old screenshot/reference cleanup is a separate later task.** It is not part of Phase 1.
11. **Do not modify gameplay, physics, item behavior, rival behavior, audio, track collision, or balance.** Visuals only.
12. **The current drift spark geometry uses `THREE.DodecahedronGeometry` with detail `0`.** Preserve that faceted ice-gem shape; only tune color and intensity in Phase 1.
13. **`createBasicMaterial` is imported from `src/game/race/render/createKartModel.js`.** Reuse it for new VFX materials rather than creating custom `MeshBasicMaterial` constructors inline.
14. **The active player model is `engine.playerModel` and is built by `createGroundedKartModel`.** New VFX objects should attach to `model` inside the factory and be toggled/animated in the per-frame update block near line 3390+.

---

## Commit Strategy

One meaningful task per commit after screenshot approval.

1. `Save Penguin Kart VFX phased gameplan`
2. `Polish drift spark ice-gem palette`
3. `Tune drift spark glow for polished ice`
4. `Add mini-turbo cyan burst ring`
5. `Add capped tier-two drift ice trail`

Do not batch multiple visual changes into one commit.
