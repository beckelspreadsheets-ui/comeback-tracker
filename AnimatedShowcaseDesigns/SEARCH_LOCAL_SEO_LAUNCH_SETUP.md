# Search And Local SEO Launch Setup

Status: post-deploy operator checklist for Showcase Designs v3. Do not mark SEO-2, SEO-3, or analytics launch gates complete until the evidence fields below are filled in after production serves the current build.

This file turns the PRD's Search Console, Bing, Google Business Profile, analytics, and review/photo requirements into a launch worksheet. It does not replace the production verifier.

## Current Gate

Blocked until `https://showcase-designs.com` serves the current v3 build and `SHOWCASE_ORIGIN=https://showcase-designs.com node verify-production.mjs` passes.

Do not submit the sitemap, request indexing, print business cards, or promote the QR funnel while production still serves the stale Vercel site.

## Required Operator Inputs

```text
Production deploy verified: YES / NO
Final public business name:
Final public phone:
Final public email:
Showcase Designs public address type: storefront / service-area / not eligible yet
Public address or service areas approved:
Google account owner:
Analytics recommendation: GA4 first for conversion events; optional Cloudflare Web Analytics for lightweight pageview backup
GA4 Measurement ID or equivalent analytics ID:
Search Console property owner:
Bing Webmaster Tools owner:
GBP owner/manager:
Approved GBP photos/screenshots:
Approved review ask contacts:
```

## Google Search Console

Use only after production is current.

1. Verify a Search Console property for `showcase-designs.com`.
2. Confirm these production URLs return the current build:
   - `https://showcase-designs.com/`
   - `https://showcase-designs.com/robots.txt`
   - `https://showcase-designs.com/sitemap.xml`
3. Submit `https://showcase-designs.com/sitemap.xml` in Search Console.
4. Use URL Inspection for `https://showcase-designs.com/`.
5. Run a live test, then request indexing only if the page is indexable.
6. Record the launch baseline.

Evidence to record:

```text
Search Console property type:
Verified owner:
Verification method:
Sitemap submitted: YES / NO
Sitemap status:
URL Inspection status for /:
Live test result:
Indexing requested: YES / NO
Manual actions: clear / issue
Security issues: clear / issue
Launch baseline date:
```

## Bing Webmaster Tools

Use only after production is current.

1. Add or verify `showcase-designs.com`.
2. Submit `https://showcase-designs.com/sitemap.xml`.
3. Record whether Bing URL submission is used for the home page.

Evidence to record:

```text
Bing site verified: YES / NO
Verification method:
Sitemap submitted: YES / NO
Sitemap status:
URL submitted: YES / NO
Launch baseline date:
```

## Analytics

The source currently has analytics-ready `dataLayer` and optional `gtag` event hooks, but no confirmed production Measurement ID.

Do not install a guessed analytics tag.

Recommended setup:

1. Use GA4 as the default analytics platform because the site already emits conversion events that can be confirmed in realtime/debug reports.
2. Optionally enable Cloudflare Web Analytics as a lightweight privacy-first traffic backup after production is current.
3. Do not use Cloudflare Web Analytics as the only launch analytics if the goal is to report form, phone, email, pricing, QR, live-project, and studio-entry conversion events from the existing hooks.

If using GA4:

1. Create or select the GA4 property.
2. Add a web data stream for `https://showcase-designs.com`.
3. Copy the Measurement ID that starts with `G-`.
4. Install the owner-approved tag or equivalent tag manager configuration.
5. Confirm these events appear in debug or realtime reporting:
   - `form_submit`
   - `phone_click`
   - `email_click`
   - `pricing_cta_click`
   - `business_card_qr_visit`
   - `live_project_click`
   - `mode_enter_world`

Evidence to record:

```text
Analytics platform: GA4 recommended
Measurement ID:
Installed by:
Install method:
Realtime home page view confirmed: YES / NO
Form event confirmed: YES / NO
Phone event confirmed: YES / NO
Email event confirmed: YES / NO
Pricing CTA event confirmed: YES / NO
Business card QR event confirmed: YES / NO
Live project click event confirmed: YES / NO
World entry event confirmed: YES / NO
```

## Google Business Profile

Only create or update a Showcase Designs Google Business Profile if the business is eligible under Google's guidelines.

Guardrails:

- Use the real-world business name.
- Use a phone number and website under Andrew's control.
- Do not use a virtual office or rented mailing address as a public business location unless it is eligible, staffed, signed, and receives customers during stated hours.
- If Showcase Designs is a service-area business without a public staffed storefront, hide the address from customers and define service areas.
- Keep phone, website, services, hours, and service areas consistent with the site.

Minimum launch assets:

- Logo or brand mark.
- Founder-approved website screenshot.
- 3D studio or portfolio screenshot.
- 2-3 approved project screenshots.
- Short business description that avoids ranking guarantees.
- Services list aligned with the site.
- Review request link or approved review ask process.

Evidence to record:

```text
GBP eligible: YES, service-area profile expected
GBP profile URL: NEEDS OWNER CONFIRMATION
Address visibility: public / hidden / not applicable
Service areas:
Primary category:
Secondary categories:
Phone matches site: YES / NO
Website matches site: YES / NO
Photos uploaded:
Review ask process approved: YES / NO
```

## Review Ask Process

Use this only with real customers or approved contacts.

```text
Hi [Name], I am updating Showcase Designs and would really appreciate a short honest review of what it was like working with me.

The most helpful review mentions the project, communication, speed, quality, or whether the final site/process helped you.

Review link: [GBP review link]
```

Rules:

- Do not script a fake review.
- Do not ask someone to mention results they did not experience.
- Do not imply rankings, calls, or revenue improved unless they can say that truthfully.
- Track who was asked and whether they responded.

## First 30-Day Search Review

Review weekly for the first 30 days after production launch:

| Week | Search Console | Bing | Analytics | GBP | Action |
| --- | --- | --- | --- | --- | --- |
| 1 | Index status for `/`, crawl errors, sitemap status | Sitemap status | UTM visits and events | Profile completeness, photos, reviews | Fix technical issues only. |
| 2 | Queries/impressions if available | Crawl/index notes | Lead events by source | Review/photo progress | Improve offer if scans do not convert. |
| 3 | Page indexing and canonical status | URL status | Free review requests | Review asks sent | Adjust copy only if prospects are confused. |
| 4 | Baseline search visibility | Baseline Bing visibility | Conversion by channel | GBP signal gaps | Decide what to scale. |

## Official References

- Google Search Central sitemap guidance: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google Search Console URL Inspection: https://support.google.com/webmasters/answer/9012289
- Google Business Profile guidelines: https://support.google.com/business/answer/3038177
- GA4 tag ID guidance: https://support.google.com/analytics/answer/9539598
- Bing Webmaster Tools sitemap guidance: https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed
