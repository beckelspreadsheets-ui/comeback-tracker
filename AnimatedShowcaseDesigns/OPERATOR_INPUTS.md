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

## PRD Open Questions For Andrew

These are the exact open questions from `SHOWCASE_V3_LIVE_PRD.md` that must be answered before production launch or before scaling outreach.

```text
1. Exact approved client/project list for public launch:
2. EvenPath, Felco, Abel, and Beckel public display approval: YES / NO / PARTIAL
3. Approved numeric claims, if any, including site count, response time, satisfaction, or turnaround:
4. Final public phone number:
5. Final public email address:
6. Compliant physical mailing address or PO box for commercial outreach:
7. Cloudflare production project name and production branch:
8. Private founding-client offer approved: YES / NO
8a. Founding-client slot count:
9. Growth price after first 3-5 clients: keep $400/mo / move higher / decide later
10. Business card targeting: contractors/home services only / all local businesses / other approved focus
```

Owner answers received on 2026-06-06:

```text
1. Preview before production: YES. Production approval is not granted yet.
2. Latest deploy target before preview: use the most updated local build, then verify preview.
3. Final public phone number: (520) 367-2769.
4. Final public email address: andrew@showcase-designs.com.
5. Compliant physical mailing address or PO box: not available yet; add one before scaled commercial outreach.
6. EvenPath, Felco, Abel, and Beckel public display approval: YES. Andrew can get reviews.
7. Approved numeric claims: no new numeric claims supplied; keep current trust-safe nonnumeric claims.
8. Public pricing: Starter $150/mo subscription, Growth $400/mo subscription, or one-time ownership from $1,500. Do not use monthly + setup framing.
9. Private founding-client flexibility: approved only for friends or people Andrew meets personally. Do not publish broad discounts.
10. Growth price after first 3-5 clients: decide later.
11. Analytics: no GA4 ID yet. Recommended default is GA4 for event reporting, with optional Cloudflare Web Analytics as a lightweight pageview backup.
12. Search Console and Bing setup after deploy: YES.
13. Google Business Profile: service-area profile likely exists; verify owner/profile URL after production is current.
14. Business card targeting: all local businesses.
15. Print cards only after production QR/form tests pass: YES.
```

Do not guess these answers. Do not guess remaining unknown answers. If an answer is unknown, leave it blank or mark `NEEDS OWNER DECISION` and keep the related launch gate blocked.

## 1. Cloudflare Preview Deploy

Completed direct-upload deployment:

```text
Cloudflare Pages project: showcase-designs-preview
Branch: main
Latest preview-readiness deployment: https://7b30c5f6.showcase-designs-preview.pages.dev
Previous launch-readiness deployment: https://0aa55ac2.showcase-designs-preview.pages.dev
Previous hero-wall deployment: https://0cc4d1b9.showcase-designs-preview.pages.dev
Previous photo-match deployment: https://61e0e520.showcase-designs-preview.pages.dev
Previous hybrid-plate deployment: https://9bf74ca5.showcase-designs-preview.pages.dev
Previous photo-lock/stone-overlay deployment: https://b47e5e1b.showcase-designs-preview.pages.dev
Current render/camera tuning deployment: https://d6444b74.showcase-designs-preview.pages.dev
Stable preview: https://showcase-designs-preview.pages.dev
Verification: SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-production.mjs -> 63 production checks passed
Visual verification: SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-photo-match.mjs -> 10 photo-match checks passed
Immutable verification: SHOWCASE_ORIGIN=https://7b30c5f6.showcase-designs-preview.pages.dev node verify-production.mjs -> 63 production checks passed
Immutable visual verification: SHOWCASE_ORIGIN=https://7b30c5f6.showcase-designs-preview.pages.dev node verify-photo-match.mjs -> 10 photo-match checks passed
Direct source check on stable and immutable preview: Websites & Local SEO for Local Businesses, $150/mo, $400/mo, and andrew@showcase-designs.com present; old $149/$399 and setup wording absent.
Trust-safe stat copy on stable preview: Founder-Led / Scope-First / Client-Owned present; old numeric stat markup absent
```

Preview note from 2026-05-18: `world.css` now uses a photo-locked presentation layer for `?presentation=1` so the room plate is primary and the live canvas no longer double-exposes over it. Local and stable-preview `node verify-photo-match.mjs` checks passed after this change.

Additional preview note from 2026-05-18: `world.js` now mounts `addStoneSlabMaterialOverlays()` in normal walking mode so the real Three.js room has subtle graphite slab variation on the walls. Direct stable and immutable preview checks confirmed the function is served.

Preview note from 2026-05-19: `world.js` now raises the seamless-mode DPR cap inside the PRD mobile range, enables antialiasing except on low-tier devices, softens the hard cove strip into a warmer architectural glow, and widens/retunes the default portrait camera to show more floor, bench, and room depth. Direct stable and immutable preview checks confirmed these changes are served.

Last verified direct-upload artifact retained for reference:

```text
Archive: deploy-artifacts/showcase-designs-dist-20260606-142403.zip
SHA256: 1547ccd54ae80b06d49337bb6cce4758b86f730fd0bae13d606a428ecf84cd15
Source: generated from the allowlisted `dist/` package after the 2026-06-06 owner-answer pass added the corrected `$150/mo`, `$400/mo`, and ownership-from-`$1,500` pricing model, `andrew@showcase-designs.com`, local-business positioning, regenerated business-card assets, and analytics recommendations. Archive contents were confirmed to match the current `index.html`.
```

Production is deferred until the owner explicitly approves it. Preview sharing is approved.

Cloudflare project list note from 2026-06-03:

```text
Command: npx wrangler pages project list
Visible project for this site: showcase-designs-preview
Custom domain on visible project: none, only showcase-designs-preview.pages.dev
No visible Cloudflare Pages project currently lists showcase-designs.com as a project domain.
```

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

Current outbound note from 2026-06-03:

```text
Approved station live URLs: PASS
FormSubmit endpoint: PASS
Command: node verify-outbound.mjs
```

Before launch, rerun `node verify-outbound.mjs`. If FormSubmit fails, use an owner-approved alternate form provider or fallback contact flow before production approval.

## 1.1 Search, Analytics, And Local Profile Setup

Use `SEARCH_LOCAL_SEO_LAUNCH_SETUP.md` after production serves the current build. Do not submit the sitemap or request indexing while production still serves the stale Vercel site.

Required inputs:

```text
Google Search Console property: VERIFIED / NOT VERIFIED
Sitemap submitted: YES / NO
Bing Webmaster Tools site: VERIFIED / NOT VERIFIED
Analytics platform and Measurement ID: Recommended GA4 first; ID not provided yet.
GBP eligible: YES, service-area profile expected
GBP profile URL: NEEDS OWNER CONFIRMATION
Approved GBP photos/screenshots:
Review ask process approved: YES / NO
```

Record the complete evidence in `SEARCH_LOCAL_SEO_LAUNCH_SETUP.md`.

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
