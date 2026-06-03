# Owner Decision Intake 001

Created at: 2026-05-29T21:39:42Z

Status: raw owner chat intake, not release sign-off

This file records owner answers supplied in chat after the resumed blocker audit. It does not promote any gate to Proven by itself. Values that still need exact approval remain pending.

## Supplied Answers

| Question | Owner answer supplied in chat | Recording status |
| --- | --- | --- |
| 1. Approved visual target/source | "I have no external resource we need to use the original screenshot we made with chat gpt image gen 2 and use it for the rest of the building" | Partial. Record as owner direction to use the original ChatGPT Image Gen 2 screenshot and no external reference. Exact screenshot path/file and final reference/provenance wording still pending. |
| 2. Visual priority | "equal mobile and desktop" | Supplied. Record as equal desktop and mobile priority after owner approval pass. |
| 3. Visual targets | "I want these to basically match mario kart" | Pending exact approval. Proposed safe wording: "Target an arcade kart-racer feel and readability similar to Mario Kart as a genre reference, using only original Comeback City assets. Do not copy Nintendo/Mario Kart characters, logos, sounds, item shapes, UI, tracks, or trade dress." |
| 4. V1 vehicle scope | "kart and hover plane but seperate tracks" | Supplied with spelling normalized to "separate tracks." Record as kart and hover-plane modes in scope, on separate tracks, after owner approval pass. |
| 5. Items/audio/progression scope | "all 3 of these required" | Supplied. Record as items, audio, and city/progression integration all required after owner approval pass. |
| 6. Target devices/browsers | "lets research whats best here please" | Researched. Recommendation below still needs owner approval. |
| 7. Review/art provenance | "im the owner and product designers we are just using chapt gpt image gen 2 for all the production so it should be custom made" | Partial. Record owner/product-design role and custom ChatGPT Image Gen 2 production-art direction. Manual QA, fresh-user, accessibility, and IP/legal review roles still need explicit approval or owner exception. |

## Q6 Research Summary

Sources checked on 2026-05-29:

- StatCounter U.S. mobile browser share for April 2026: Safari 54.69%, Chrome 38.18%, Samsung Internet 2.52%, Brave 1.54%, Firefox 1.4%. Source: https://gs.statcounter.com/browser-market-share/mobile/united-states-of-america
- StatCounter U.S. desktop browser share for April 2026: Chrome 60.47%, Edge 14.71%, Safari 12.38%, Firefox 5.89%, Brave 3.79%. Source: https://gs.statcounter.com/browser-market-share/desktop/united-states-of-america
- StatCounter U.S. desktop screen resolution share for April 2026 includes 1920x1080 at 22.28%, 1536x864 at 8.2%, 1366x768 at 6.21%, 1440x900 at 4.25%. Source: https://gs.statcounter.com/screen-resolution-stats/desktop/united-states-of-america
- StatCounter U.S. mobile screen resolution share for April 2026 includes 414x896 at 20.31%, 390x844 at 12.86%, 393x852 at 6.36%, 375x812 at 5.86%. Source: https://gs.statcounter.com/screen-resolution-stats/mobile/united-states-of-america
- MDN records WebGL support as present in modern browsers while still depending on device hardware support. Source: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API
- Apple lists iOS 26 compatibility from iPhone 11, iPhone SE 2nd generation and later, and newer devices. Source: https://www.apple.com/os/ios/
- Android Developers lists Android 16 support for Pixel 6/6 Pro, Pixel 6a, Pixel 7/7 Pro, Pixel 7a, Pixel Fold, Pixel Tablet, Pixel 8/8 Pro, Pixel 8a, Pixel 9/9 Pro/9 Pro XL/9 Pro Fold, and Pixel 9a. Source: https://developer.android.com/about/versions/16/get

Recommended target pending owner approval:

- Browser baseline: latest two stable versions of Chrome, Edge, Safari, and Firefox on desktop; iOS Safari and Chrome on Android as required mobile smoke targets.
- Device baseline: real-device QA on iPhone 12 or newer, iPhone SE 2nd generation as low-end iOS check, Pixel 6a or newer as Android check, plus one Windows laptop and one Mac laptop with integrated graphics.
- Viewport priority: equal desktop and mobile.

## Pending Owner Approvals Asked Next

Resolved on 2026-06-01 in `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-002-20260601T165558Z/owner-decision-intake-002.md`.

8. Owner approved genre-familiar UI style only, not exact/protected UI. Original Comeback City characters, logos, sounds, and item shapes are required.
9. Owner approved the Q6 browser baseline.
10. Owner approved the Q6 device baseline.
11. Owner confirmed ChatGPT Image Gen 2 custom-generated bitmap assets plus repo-native/code-native assets only; no external stock/game assets.
12. Owner selected owner-only manual QA sign-off.

## Formal Doc Sync And Audit Refresh

Updated on: 2026-05-29T21:43:40Z

The already-clear owner answers were copied into the formal docs without promoting pending approvals:

- Equal desktop/mobile priority.
- Kart plus hover-plane modes in scope on separate tracks.
- Items required.
- Audio required.
- City/progression integration required.
- Original ChatGPT Image Gen 2 screenshot direction recorded as partial until exact file/path is supplied.

Updated docs:

- `docs/race-visual-target-brief.md`
- `docs/race-owner-review-packet.md`
- `docs/comeback-city-kart-racer-production-readiness-plan.md`
- `docs/race-v1-blocker-backlog.md`

Refreshed audit evidence:

- `release-decision-readiness-summary.json`: `owner-release-decisions-missing-r3-blocked`, `17` missing tracked decision categories, `97` `Not supplied` rows.
- `production-gate-readiness-summary.json`: `r3-blocked-gates-remain`, P0 `2/21` Proven, P1 `2/14` Proven, `11` DoD rows not Proven-like, `10` manual QA rows without a `4`/`5` score, `103` `Not supplied` rows, and no evidence link failures.
