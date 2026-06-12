# Showcase v3 Live PRD Audit

Date: 2026-06-03

This audits `SHOWCASE_V3_LIVE_PRD.md` against the current workspace. It is not a launch approval. Production remains incomplete until `showcase-designs.com` serves this build and production gates pass.

## Summary

| PRD Area | Status | Evidence |
| --- | --- | --- |
| L-1 Production cutover | Blocked | `PRODUCTION_AUDIT.md` shows `showcase-designs.com` still serves stale Vercel content and `verify-production.mjs` fails 54 checks. |
| L-2 Deploy package | Passed locally | `prepare-cloudflare-deploy.mjs`, `_headers`, `_redirects`, `CLOUDFLARE_DEPLOY.md`, and local `verify-production.mjs` dry runs cover the Cloudflare `dist/` package. |
| SEO-1 Canonical static marketing page | Passed locally | `index.html`, `sitemap.xml`, `robots.txt`, JSON-LD, and `verify-world.mjs` assertions cover canonical, metadata, noindex, and structured data. |
| SEO-2 Search Console launch | Blocked | `SEARCH_LOCAL_SEO_LAUNCH_SETUP.md` defines the post-deploy worksheet; production must be current before submitting sitemap or requesting indexing. |
| SEO-3 Showcase local trust signals | Needs owner input | `SEARCH_LOCAL_SEO_LAUNCH_SETUP.md` requires GBP eligibility, service areas/address handling, photos, and review ask evidence. |
| TRUST-1 Evidence-based claims | Passed locally, owner approval pending | Public v3 source removes old `40+`, `100% satisfaction`, `48hr turnaround`, Gustavo, and 305 RIPPZ claims; current stats avoid unverified numeric claims. Approved project list still needs Andrew's confirmation. |
| TRUST-2 Founder-led positioning | Passed locally | About/pricing copy says small team, hands-on, direct person building the site, founder-led project management, and free review without pressure. |
| CONV-1 Contact and lead capture | Passed locally, production pending | Contact form, `/thanks`, email/phone fallback, FormSubmit, and business-card UTM target are covered locally and by `verify-outbound.mjs`; production route still fails. |
| CONV-2 Analytics and tracking | Partially complete | `dataLayer`/optional `gtag` hooks and UTM capture exist. GA4/equivalent Measurement ID remains operator-controlled. |
| ACQ-1 Business card funnel | Passed locally, print blocked | `business-card/` assets and `LAUNCH_ACQUISITION_SYSTEM.md` use the approved QR URL and print hold. Production QR test is still required. |
| ACQ-2 Outreach system | Passed locally | `LAUNCH_ACQUISITION_SYSTEM.md`, `FREE_WEBSITE_REVIEW_TEMPLATE.md`, `CLIENT_ONBOARDING_REQUIREMENTS.md`, and `OUTREACH_TRACKER.csv` define targeting, scripts, cadence, compliance, and weekly tracking. |
| 30-day launch plan and metrics | Passed locally | `LAUNCH_ACQUISITION_SYSTEM.md`, `SEARCH_LOCAL_SEO_LAUNCH_SETUP.md`, `LAUNCH_CHECKLIST.md`, and `OUTREACH_TRACKER.csv` cover weekly activity and evidence fields. |
| Release criteria | Not complete | Production deploy, Search Console/Bing/analytics/GBP evidence, production verifier pass, business-card QR production test, and operator launch approval remain open. |

## Local Copy Audit

- Growth no longer promises `2 blog posts per month`; it promises one priority monthly content/update cycle.
- Custom no longer says `Dedicated project manager`; it says direct founder-led project management.
- Starter domain language says hosting is included and domain setup is handled.
- Pricing copy states no ranking guarantees and explains reviews, fresh photos, accurate business details, and proof are client-side local SEO signals.
- Trust stats use `Founder-Led`, `Scope-First`, `Direct`, and `Client-Owned` instead of unverified numeric volume, turnaround, or satisfaction claims.

## Remaining Required Evidence

Use `OPERATOR_INPUTS.md` for the exact answer fields.

- Andrew-approved public client/project list, including whether EvenPath, Felco, Abel, and Beckel can be shown.
- Final public phone and email.
- Compliant physical mailing address or PO box before scaled commercial email.
- Cloudflare production project name, branch, and deployment approval.
- GA4/equivalent analytics ID and install evidence.
- Search Console, Bing, and GBP setup evidence.
- Production `SHOWCASE_ORIGIN=https://showcase-designs.com node verify-production.mjs` pass.
- Real production QR scan and lead-flow smoke test before printing business cards.

## Preview Deployment Evidence

- Latest preview deployment: `https://7b30c5f6.showcase-designs-preview.pages.dev`
- Previous launch-readiness deployment: `https://0aa55ac2.showcase-designs-preview.pages.dev`
- Stable preview: `https://showcase-designs-preview.pages.dev`
- `SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-production.mjs` passed 63 checks.
- `SHOWCASE_ORIGIN=https://7b30c5f6.showcase-designs-preview.pages.dev node verify-production.mjs` passed 63 checks.
- `SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-photo-match.mjs` passed 10 checks.
- `SHOWCASE_ORIGIN=https://7b30c5f6.showcase-designs-preview.pages.dev node verify-photo-match.mjs` passed 10 checks.
- Direct source checks confirmed the Local Businesses title, `$150/mo`, `$400/mo`, and `andrew@showcase-designs.com`; old `$149/$399` and setup wording are absent.
- Direct stable-preview source check confirmed `Founder-Led`, `Scope-First`, and `Client-Owned` stat copy is served and old numeric stat markup is absent.

## Production Project Discovery

`npx wrangler pages project list` succeeded on 2026-06-03. The visible Cloudflare Pages projects do not include a project/domain entry for `showcase-designs.com`; only `showcase-designs-preview.pages.dev` is visible for the Showcase Designs preview project. Production cutover still requires Andrew's exact project/domain workflow and approval.
