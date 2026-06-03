# Operator Inputs

Use this checklist to unblock final launch validation. Do not mark the active goal complete until every item below has evidence recorded in the referenced audit or checklist.

## 0. Studio Quality Visual Decision

```text
Right-reference hero wall supersedes old no-cluster rule: YES
Approver: Andrew Ferguson
Date: 2026-05-09
Notes: Approved because the rightmost reference is the visual target and the layout should visually look best while allowing the gallery to grow into more websites.
```

Implemented in the current build: three exhibits on the main stone wall, the fourth on a secondary wall, with the stable preview serving the `right-reference-hero-wall-20260509` layout, the 2026-05-11 photo-match lighting/material pass, the 2026-05-18 photo-lock/stone-overlay refinements, and the 2026-05-19 renderer/camera visual tuning pass.

```text
Hybrid/generated room-plate approach: APPROVED
Approver: Andrew Ferguson
Date: 2026-05-11
Notes: Selected option C because the result needs to match the rightmost screenshot as a closer 1:1 copy. Approval applies to preview sharing only until explicit production approval.
```

The current interactive 3D preview remains the performance/functionality baseline. The next visual implementation should use the approved hybrid/generated room-plate direction in `WORLD_PHOTO_MATCH_PRD.md`.

## Removed From Launch Set

Gustavo's Landscape is intentionally removed until it is approved as a paying client or replaced by another approved project. Do not re-add it without explicit operator approval and a valid screenshot/live URL.

## 1. Cloudflare Preview Deploy

Completed direct-upload deployment:

```text
Cloudflare Pages project: showcase-designs-preview
Branch: main
Previous hero-wall deployment: https://0cc4d1b9.showcase-designs-preview.pages.dev
Previous photo-match deployment: https://61e0e520.showcase-designs-preview.pages.dev
Previous hybrid-plate deployment: https://9bf74ca5.showcase-designs-preview.pages.dev
Previous photo-lock/stone-overlay deployment: https://b47e5e1b.showcase-designs-preview.pages.dev
Current render/camera tuning deployment: https://d6444b74.showcase-designs-preview.pages.dev
Stable preview: https://showcase-designs-preview.pages.dev
Verification: SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-production.mjs -> 63 checks passed
Visual verification: SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-photo-match.mjs -> 10 checks passed
Immutable verification: SHOWCASE_ORIGIN=https://d6444b74.showcase-designs-preview.pages.dev node verify-production.mjs -> 63 checks passed
```

Preview note from 2026-05-18: `world.css` now uses a photo-locked presentation layer for `?presentation=1` so the room plate is primary and the live canvas no longer double-exposes over it. Local and stable-preview `node verify-photo-match.mjs` checks passed after this change.

Additional preview note from 2026-05-18: `world.js` now mounts `addStoneSlabMaterialOverlays()` in normal walking mode so the real Three.js room has subtle graphite slab variation on the walls. Direct stable and immutable preview checks confirmed the function is served.

Preview note from 2026-05-19: `world.js` now raises the seamless-mode DPR cap inside the PRD mobile range, enables antialiasing except on low-tier devices, softens the hard cove strip into a warmer architectural glow, and widens/retunes the default portrait camera to show more floor, bench, and room depth. Direct stable and immutable preview checks confirmed these changes are served.

Last verified direct-upload artifact retained for reference:

```text
Archive: deploy-artifacts/showcase-designs-dist-20260519-110740.zip
SHA256: a92d3df5ec26b05adeb8dec470ee88e04ec7e4748db84d3e459c116ee7e1b00b
Source: generated from the allowlisted `dist/` package after `node verify-world.mjs`, `node verify-photo-match.mjs`, and local-dist `verify-production.mjs` passed; this is the latest deployed preview package and includes the 2026-05-18 presentation photo-lock CSS, normal-mode stone overlay, and 2026-05-19 renderer/camera visual tuning.
```

Production is deferred until the owner explicitly approves it. Preview sharing is approved.

If deploying `showcase-designs.com` production separately later, record:

```text
Cloudflare account/project:
Deployment method: Pages Git integration / Pages direct upload / approved workflow
Production domain: showcase-designs.com
Build command: node prepare-cloudflare-deploy.mjs
Output directory: dist
`_redirects` included: YES / NO
`_headers` included: YES / NO
```

After any production-domain deployment, run:

```bash
node verify-world.mjs
node verify-photo-match.mjs
node verify-outbound.mjs
node prepare-cloudflare-deploy.mjs
node verify-production.mjs
```

Update `PRODUCTION_AUDIT.md` with the result.

Current outbound note from 2026-05-19:

```text
Approved station live URLs: PASS
FormSubmit endpoint: FAIL, HTTP 522
Command: node verify-outbound.mjs
```

Before launch, rerun `node verify-outbound.mjs`. If FormSubmit still returns 522, use an owner-approved alternate form provider or fallback contact flow before production approval.

## 2. Real-Device QA Reports

Use `DEVICE_QA_QUICK_START.md` for the short phone-testing handoff. Use `DEVICE_QA.md` for the complete checklist.

Required inputs:

```text
iOS Safari DEVICE_QA.md report: PASS / FAIL
Android Chrome DEVICE_QA.md report: PASS / FAIL
```

Both reports must include `minFps`, `render.calls`, thermal notes, interaction notes, and visual-overlap notes from `DEVICE_QA.md`.

Device access confirmed by owner on 2026-05-11: iPhone Safari yes, Android Chrome yes. Reports are still required before launch.

Record the reports in `DEVICE_QA_RESULTS.md`, then run:

```bash
node verify-device-qa.mjs
```

## 3. Production Core Web Vitals

Required input:

```text
Source:
Date:
LCP:
INP:
CLS:
Result: PASS / FAIL
```

Use the thresholds in `LAUNCH_CHECKLIST.md`.

Owner decision on 2026-05-11: Core Web Vitals evidence is required before launch.

## 4. Copy Approval

Required input:

```text
Case-study hero/intro copy decision: CHANGES REQUESTED
Approver: Andrew Ferguson
Date: 2026-05-11
Notes: Needs to match the 1:1 copy. Exact source copy is still required before implementation.
```

If changes are requested, update `index.html` and `v3-preview.html` together, then rerun `node verify-world.mjs`.

## 5. Operator Launch Approval

Required input:

```text
Approver: Andrew Ferguson
Date: 2026-05-11
Decision: APPROVED FOR PREVIEW SHARING ONLY
Notes: Production launch is not approved until the owner says otherwise.
```

Record this in `LAUNCH_CHECKLIST.md` only after the production route gate, outbound link gate, device QA, Core Web Vitals, and copy decision are complete.
