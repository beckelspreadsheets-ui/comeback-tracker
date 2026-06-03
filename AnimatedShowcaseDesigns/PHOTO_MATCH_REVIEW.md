# Photo-Match Review

Date: 2026-05-11
Local update: 2026-05-18

Route under review:

```text
https://showcase-designs-preview.pages.dev/world
https://showcase-designs-preview.pages.dev/world?presentation=1
```

## Review Assets

| Asset | Path |
| --- | --- |
| Target reference | `img/world/hyperrealistic-gallery-target-right.png` |
| Local desktop capture | `verification/photo-match-desktop.png` |
| Local mobile capture | `verification/photo-match-mobile.png` |
| Preview desktop capture | `verification/photo-match-production-desktop.png` |
| Preview mobile capture | `verification/photo-match-production-mobile.png` |

## Current Result

This pass is not a 1:1 replica of the target image. It is a hand-built interactive Three.js gallery that now matches the reference direction more closely while preserving walking, collision, exhibit inspection, screenshot scroll, live-site actions, mobile controls, demand rendering, and preview deployability.

The current local build improves:

1. Visible textured ceiling and warm cove bands instead of a black void.
2. Main graphite exhibit wall with visible detail and brighter wall-wash pools.
3. Three-exhibit hero-wall composition with left glass wall and foreground bench.
4. Warmer polished-floor reflection pools.
5. Presentation mode that hides the UI for cleaner visual review.
6. Local and preview screenshot-region verification through `verify-photo-match.mjs`.
7. Initial hybrid presentation plate using `img/world/photo-match-room-plate.webp` so `?presentation=1` visually tracks the rightmost reference more closely while normal mode keeps the interactive Three.js room.
8. 2026-05-18 presentation CSS now makes the room plate the primary visible layer and reduces the live canvas to a faint underpinning, removing the earlier double-exposure look in local review captures.
9. 2026-05-18 normal walking mode now mounts subtle stone-slab material overlays on the real Three.js walls, so the interactive room reads less like flat black planes before presentation mode is enabled.
10. 2026-05-19 normal walking mode raises the DPR cap, keeps antialiasing except on low-tier devices, softens the hard cove strip, and retunes the portrait camera to show more floor/bench depth.

The stable preview now includes the 2026-05-18 presentation photo-lock CSS, the normal walking-mode stone slab overlay, and the 2026-05-19 renderer/camera tuning pass. Immutable preview for this pass: `https://d6444b74.showcase-designs-preview.pages.dev`.

The current deployed preview still differs from the target:

1. The target has richer photoreal wall/floor material breakup and softer global illumination.
2. The target glass wall has more exterior depth and architectural reflection.
3. The target bench reads as more realistic leather with stronger volume and contact.
4. The target has more natural ceiling/downlight integration.
5. The current frames/screens still read as lightweight real-time geometry compared with the rendered reference.

## Decision Recorded

Owner decision from Andrew Ferguson on 2026-05-11:

```text
Selected option: 3
Decision: Approve a hybrid/generated room-plate approach for closer near-1:1 similarity to the rightmost reference.
Scope: Preview sharing only until explicit production approval.
Copy: Not approved; must match the 1:1 source copy before launch.
Real-device access: iPhone Safari and Android Chrome available for required pre-launch QA.
Core Web Vitals: Required before launch.
```

The next visual pass should use this decision as the controlling direction. The current interactive 3D preview remains useful as a performance/functionality baseline, but it is not visually approved as the final 1:1 result.

## Latest Verification

```bash
node verify-photo-match.mjs
SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-photo-match.mjs
node verify-world.mjs
SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-production.mjs
node verify-outbound.mjs
```

Observed results:

```text
10 local photo-match checks passed after the 2026-05-19 renderer/camera tuning.
10 preview photo-match checks passed after the 2026-05-19 preview deployment.
360 local world checks passed.
63 stable-preview production checks passed.
63 immutable-preview production checks passed for https://d6444b74.showcase-designs-preview.pages.dev.
Station live-site outbound checks passed.
Full outbound verifier currently fails on FormSubmit HTTP 522.
```

Known incomplete release gates:

1. Real-device iOS Safari report is still missing.
2. Real-device Android Chrome report is still missing.
3. Production `showcase-designs.com` is still not serving this workspace build.
4. Final owner visual approval of the hybrid room-plate result is still missing.
5. Production Core Web Vitals p75 evidence is still missing.
6. Exact 1:1 source copy is still required before copy changes can be implemented.
7. FormSubmit endpoint is currently returning HTTP 522 in `node verify-outbound.mjs`.
8. Final owner approval is still required before production launch.
