# Comeback City Kart Racer V1 Blocker Resolution PRD

Status: draft for implementation
Date: 2026-05-22
Owner: product/design/engineering/legal review
Source PRD: `docs/comeback-city-kart-racer-prd.md`
Production-readiness plan: `docs/comeback-city-kart-racer-production-readiness-plan.md`

## 1. Purpose

Close the remaining blockers that prevent Comeback City Kart Racer V1 from being called implemented and sign-off complete.

Implementation planning is complete, but V1 is still blocked by:

- owner target/scope input,
- desktop FPS,
- manual desktop and mobile QA,
- fresh-user first-impression review,
- IP/provenance sign-off,
- product/design review.

This PRD defines the work required to turn those blockers into shipped evidence.

## 2. Research Inputs

Internal evidence:

- `docs/race-kart-v1-planning-index.md`
- `docs/race-v1-definition-of-done-checklist.md`
- `docs/race-v1-blocker-backlog.md`
- `docs/race-performance-next-pass-plan.md`
- `docs/race-kart-v1-acceptance-audit.md`
- `docs/race-owner-review-packet.md`
- `docs/race-ip-provenance-audit.md`
- `docs/race-manual-qa-rubric.md`
- `tmp/race-playtests/race-browser-playtest-summary.json`

External primary-source findings:

- Browser rendering needs a tight frame budget: on a typical 60 Hz display, the browser has about `16.66ms` per frame, and missed budgets cause visible judder. Source: web.dev rendering performance guidance.
- `requestAnimationFrame` aligns animation callbacks with display refresh, but refresh rates vary and callbacks can be paused in background contexts. Source: MDN `requestAnimationFrame`.
- Three.js performance work should reduce expensive object/draw overhead with approaches such as merged geometry or instancing, but the current repo evidence shows draw-call reductions alone are not enough. Source: official Three.js optimization manual plus local rejected experiment history.
- Motion triggered by interaction must be controllable when nonessential; the existing reduced-motion browser check should remain a release gate. Source: W3C WCAG understanding for Animation from Interactions and MDN `prefers-reduced-motion`.
- IP review must distinguish copyrightable works, trademarks, names/logos/source identifiers, source asset provenance, and registered rights. Source: USPTO trademark/copyright basics and U.S. Copyright Office registration guidance.

## 3. Current State

Latest internal evidence was captured at `2026-05-23T19:27:29.195Z`.

| Area | Current state |
| --- | --- |
| Browser runs | `24` races and `28` focused visual/control/fallback checks |
| Desktop FPS | Normal desktop focused states average `41.54 actualFps`; sustained normal play averages `17.70 actualFps`; both remain below local `45` floor and PRD `55` target |
| Visual target | `RACE-001` is blocked; no owner-approved target screenshot/capture or scope decision exists |
| Manual QA | Runbook exists, but desktop keyboard, mobile touch, and fresh-user review have not been run |
| IP/provenance | Current audit exists, but item-name review and binary asset provenance sign-off are missing |
| Design review | First-slice readability, district density, HUD, drift/camera feel, and mechanic feedback are not signed off |
| Automated checks | Latest recorded `npm run build`, `npm run test:race`, `npm run test:race:browser`, `npm run test:visual`, and `npm run test:hub` pass in `.agent/runs/kart-racer-production-readiness/evidence/perf-003-20260523T192252Z/` |

## 4. Goals

1. Obtain owner-approved visual target and V1 scope decisions.
2. Raise desktop performance to at least the agreed local floor without reducing race readability.
3. Prove desktop keyboard playability with a human full-race run.
4. Prove mobile touch playability with at least a first-lap run, preferably full race.
5. Run the manual QA rubric and get every category to `4+`.
6. Prove a fresh user identifies the experience as a kart race from a 10 second silent clip.
7. Complete IP/provenance and item-name review.
8. Complete product/design review for visual identity, route readability, HUD, camera, drift, and mechanic feedback.
9. Re-run automated checks and attach PR evidence.

## 5. Non-Goals

- Do not add multiplayer.
- Do not expand every race track before Comeback City GP is signed off.
- Do not add a progression economy to hide race-quality issues.
- Do not copy protected kart-racer characters, tracks, item designs, names, UI layouts, sounds, music, or production art.
- Do not lower resolution, object density, or camera readability just to pass a metric unless product/design explicitly accepts the tradeoff.
- Do not mark manual QA complete from autoplay, telemetry, or implementer-only opinion.

## 6. Success Metrics

| Metric | Target |
| --- | --- |
| Owner target brief | Approved and filled in `docs/race-visual-target-brief.md` |
| Desktop focused FPS | Every normal desktop focused state at or above agreed local floor; target remains PRD `55` unless changed by owner |
| Sustained desktop capture | Supports focused FPS result and records budget misses |
| Desktop manual QA | Full race completed by keyboard with notes |
| Mobile manual QA | Touch first lap completed; full race preferred |
| Manual QA rubric | Every category `4+` |
| Fresh-user read | Reviewer identifies a kart race/racing game or close equivalent |
| IP/provenance | Owner/design/legal review signs off or records required changes |
| Product/design review | First 30 seconds, route clarity, landmarks, HUD, camera, drift, feedback, and overall read approved |
| Automation | `npm run build`, `npm run test:race`, and `npm run test:race:browser` pass after changes |

## 7. Requirements

### 7.1 Owner Target And Scope

Required:

- Use `docs/race-owner-review-packet.md` to collect decisions.
- Fill `docs/race-visual-target-brief.md` only with owner-approved values.
- Confirm target screenshot/capture source/license.
- Confirm desktop/mobile priority.
- Confirm kart-only V1 versus retained hover/plane modes.
- Confirm item and audio scope.
- Confirm standalone versus city-progression scope.
- Confirm mobile performance target device/profile.
- Confirm HUD direction.

Acceptance:

- No `Not supplied` values remain for V1-required fields.
- Product/design explicitly approves the target as composition reference only.
- Engineering updates affected plans/checklists after decisions land.

### 7.2 Desktop FPS

Required:

- Implement `docs/race-performance-next-pass-plan.md`.
- Add sustained normal-play capture before broad optimization changes.
- Add scene budget telemetry for track, scenery, pickups, rivals, VFX, and WebGL scene where practical.
- Change one performance variable at a time.
- Preserve kart size, road-ahead coverage, visible rivals, HUD overlap, route lookahead, camera clip count, drift, boost, item pickup, reduced motion, audio mute, and WebGL fallback gates.

Candidate implementation areas:

- Far skyline or perimeter prop LOD/omission that does not affect route readability.
- Repeated rail/sign/barrier detail beyond gameplay readability distance.
- Decorative props outside first 30 second teaching view.
- Material/program consolidation that preserves district identity.
- Measurement improvements that separate browser/headless frame pacing from product render cost.

Do not retry without new evidence:

- Global track batching.
- Larger clean-track batch chunks.
- Renderer resize-loop changes.
- Shoulder-underlay replacement.
- Antialias disable.
- Desktop render-scale reduction.
- HUD transition scheduling.
- Draw-call-only wins that worsen actual FPS.

Acceptance:

- `npm run test:race`, `npm run test:race:browser`, and `npm run build` pass.
- Before/after browser summary shows product-relevant FPS improvement.
- Desktop normal focused states meet local floor.
- Sustained normal-play sample supports the focused result.
- No current visual/control/fallback gate regresses.

### 7.3 Manual Desktop QA

Required:

- Use `docs/race-manual-qa-rubric.md`.
- Record URL, viewport, input method, date/time, tester, build/test artifacts.
- Complete full race by keyboard if performance and route state allow.
- Exercise acceleration, braking/reverse, steering, hop/drift, drift release, item pickup/use, boost pad, collision/recovery, pause/resume, finish/result.

Acceptance:

- Desktop manual result is recorded.
- Controls, drift, camera, track readability, HUD, performance, and race drama notes are filled.
- Any failure is logged as a blocker or follow-up with severity.

### 7.4 Manual Mobile QA

Required:

- Use actual touch input or a touch-capable test environment.
- Record device/profile, viewport, URL, date/time, tester.
- Complete first lap at minimum; full race preferred.
- Verify controls do not hide kart, route apex, item boxes, boost pads, hazards, or rivals.

Acceptance:

- Mobile touch result is recorded.
- Mobile score in manual rubric is `4+`.
- If full race cannot be completed, blocker is recorded with reproduction notes.

### 7.5 Fresh-User Review

Required:

- Record or show a silent 10 second clip from the real browser route.
- Reviewer must not have worked on implementation.
- Ask the prompt from `docs/race-manual-qa-rubric.md`:

```text
What kind of game or mode is this, and what do you think the player is trying to do?
```

Acceptance:

- Reviewer identifies a kart race, racing game, or close equivalent.
- Reviewer understands the player is driving along a route against opponents or race objectives.
- Exact answer, reviewer role, clip path, viewport, and date/time are recorded.

### 7.6 IP And Provenance

Required:

- Resolve `docs/race-ip-provenance-audit.md` open items.
- Review item names and silhouettes, especially shell/star/banana/oil terminology.
- Confirm source/license/provenance for every retained binary asset under `src/assets/game/**`.
- Confirm reference-derived plaza measurement data is acceptable for product scope.
- Confirm selected visual target is safe for composition-only use.
- Run final scan for protected names and unreviewed binary art/audio imports.
- Review screenshots/captures for protected character, item, track, UI, logo, sound, or composition similarity.

Acceptance:

- Review outcome is recorded as approved, rename/re-skin required, remove asset, or needs legal follow-up.
- Any required rename/re-skin/removal is implemented before V1 sign-off.
- No unreviewed sampled audio or production art is introduced.

### 7.7 Product And Design Review

Required review areas:

- First 30 seconds of Comeback City GP.
- District landmark readability.
- No empty-plane read.
- Route readability without minimap.
- Shortcut readability and risk/reward clarity.
- HUD readability and non-occlusion.
- Chase camera composition against approved target.
- Drift, boost, item, collision, lap, and finish feedback.
- Mobile layout and touch-control occlusion.

Acceptance:

- Product/design review notes are recorded.
- Required changes are converted into tickets.
- First-slice and V1 quality claims are not made until required changes are complete.

## 8. Implementation Plan

### Phase A: Decision Lock

1. Send `docs/race-owner-review-packet.md`.
2. Fill `docs/race-visual-target-brief.md`.
3. Update blocker, DoD, and ticket docs with decisions.

Exit:

- `RACE-001` no longer blocked.
- Scope decisions are explicit.

### Phase B: Performance Proof And Fix

1. Add sustained normal-play capture.
2. Add scene budget telemetry.
3. Apply one normal-view optimization.
4. Keep or reject based on actual FPS plus visual gates.
5. Repeat until desktop local floor passes.

Exit:

- Desktop FPS blocker is closed or narrowed with hard evidence.

### Phase C: Review-Ready Race Build

1. Preserve or tune drift/camera only against approved target and scope.
2. Address any obvious HUD, route, VFX, or audio gaps found during exploratory play.
3. Re-run automated checks.

Exit:

- Build is ready for manual/design review.

### Phase D: Human QA And Fresh-User Proof

1. Run desktop manual QA.
2. Run mobile touch QA.
3. Run fresh-user 10 second read.
4. Record rubric scores.

Exit:

- Every manual QA category is `4+`, or blockers are filed.

### Phase E: IP And Product Sign-Off

1. Complete item/name/provenance review.
2. Complete product/design review.
3. Implement required changes.
4. Re-run automation and attach PR evidence.

Exit:

- DoD checklist can move every row to `Proven`.

## 9. Testing And Evidence

Required commands before sign-off:

```sh
npm run build
npm run test:race
npm run test:race:browser
```

Required artifacts:

- Completed `docs/race-pr-evidence-template.md` or equivalent.
- Browser summary path and timestamp.
- Desktop idle/speed/drift screenshots.
- Mobile driving screenshot or capture.
- Sustained performance sample.
- Manual desktop QA result.
- Manual mobile QA result.
- Fresh-user answer.
- Product/design review notes.
- IP/provenance review notes.
- Updated `docs/race-v1-definition-of-done-checklist.md`.

## 10. Dependencies

- Owner/product/design/legal availability for review.
- A stable local dev route for manual QA.
- A confirmed mobile device/profile for mobile performance.
- Browser harness support for sustained normal-play capture.
- Current race runtime remains in extracted race modules, not re-concentrated in `ArcadeRace3D.jsx`.

## 11. Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Owner decisions remain unavailable | Keep `RACE-001` blocked and limit work to performance/evidence improvements that do not depend on target style. |
| FPS work reduces visual identity | Preserve visual gates and require design review for visible reductions. |
| Draw-call reductions regress FPS | Keep/reject based on actual FPS, frame work, steering, camera, and visual gates, not draw calls alone. |
| Manual QA exposes major control issues | File follow-up blockers and do not score V1 complete. |
| IP review requires rename/re-skin | Treat rename/re-skin as release-blocking before sign-off. |
| Fresh user does not identify a kart race | Reopen visual/camera/HUD/feedback work and rerun the test. |

## 12. Definition Of Done

This blocker-resolution PRD is complete when:

- Owner target and V1 scope decisions are recorded.
- Desktop FPS meets the agreed local floor with sustained evidence.
- Manual desktop keyboard run passes.
- Manual mobile touch run passes.
- Fresh-user 10 second review passes.
- Manual QA scores are all `4+`.
- IP/provenance review is signed off or all required changes are complete.
- Product/design review signs off first-slice readability, visual identity, HUD, camera, drift, and mechanic feedback.
- `npm run build`, `npm run test:race`, and `npm run test:race:browser` pass after final changes.
- `docs/race-v1-definition-of-done-checklist.md` marks every row `Proven`.

## 13. Source Links

- web.dev Rendering performance: `https://web.dev/rendering-performance/`
- web.dev Jank busting for better rendering performance: `https://web.dev/articles/speed-rendering`
- MDN `requestAnimationFrame`: `https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame`
- Three.js Optimize Lots of Objects: `https://threejs.org/manual/en/optimize-lots-of-objects.html`
- MDN `prefers-reduced-motion`: `https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion`
- W3C Understanding Success Criterion 2.3.3 Animation from Interactions: `https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html`
- USPTO Trademark basics: `https://www.uspto.gov/trademarks/basics`
- USPTO Trademark, patent, or copyright: `https://www.uspto.gov/trademarks/basics/trademark-patent-copyright`
- U.S. Copyright Office registration portal: `https://www.copyright.gov/registration/`
- U.S. Copyright Office motion pictures/audiovisual works registration: `https://www.copyright.gov/registration/motion-pictures/`
