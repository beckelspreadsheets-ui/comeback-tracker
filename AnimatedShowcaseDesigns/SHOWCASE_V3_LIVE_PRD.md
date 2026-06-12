# Showcase Designs v3 Live PRD

| Field | Detail |
| --- | --- |
| Product | Showcase Designs v3 production launch |
| Primary domain | https://showcase-designs.com |
| Preview source | `index.html` plus opt-in `/world` gallery |
| Date | 2026-06-01 |
| Status | Draft for operator review |
| Owner | Andrew Ferguson |

## 1. Objective

Get Showcase Designs v3 live on the production domain with the strongest practical chance of acquiring early clients.

The launch must do three things at the same time:

1. Replace the stale production site with the current v3 static marketing site.
2. Present pricing that matches the market, the current lack of deep public proof, and the founder-led delivery model.
3. Create a simple client acquisition system Andrew can use after launch, including business cards, free website reviews, local outreach, referrals, and follow-up.

## 2. Current State Snapshot

### 2.1 Current v3 Worktree

The current v3 source is a static marketing site with an opt-in 3D studio gallery.

Key files:

- `index.html`: canonical static marketing route for `/`
- `v3-preview.html`: preview copy
- `world.html`, `world.css`, `world.js`, `world-data.js`: opt-in gallery route
- `sitemap.xml`: currently contains only `https://showcase-designs.com/`
- `robots.txt`: points crawlers to the sitemap
- `verify-world.mjs`, `verify-production.mjs`, `verify-outbound.mjs`: launch gates
- `CLOUDFLARE_DEPLOY.md`, `LAUNCH_CHECKLIST.md`, `PRODUCTION_AUDIT.md`: deploy and validation records

Current v3 public pricing in `index.html` after owner correction on 2026-06-06:

| Tier | Public Price | Ownership Option | Current Listed Scope |
| --- | ---: | --- | --- |
| Starter | `$150/mo` subscription | One-time ownership builds start at `$1,500` | 5-8 page responsive website, mobile-first design, basic SEO, contact form, analytics-ready event tracking, 1 revision round, hosting included, domain setup handled |
| Growth | `$400/mo` subscription | Ownership quoted after review | Starter plus 10-15+ pages, local SEO strategy, GBP improvements, city/service area pages, reporting, one priority monthly content/update cycle, review/photo checklist, quarterly conversion improvements |
| Custom | Custom | Scoped after review | Multi-location support, voice agents, CRM integration, advanced analytics, direct founder-led project management |

### 2.2 Production Domain

As of the latest external check on 2026-06-01, `https://showcase-designs.com/` is still serving the older site, not the current v3 worktree.

Observed issues on the live production site:

- Old title: `Showcase Designs - Premium Web Design for Local Businesses`
- Old package names and pricing: `Autopilot`, `Pro`, `Elite`
- Old pricing claims: `$199/mo`, `$399/mo`, `$2,497`, founding-member discounts, `$0 setup`
- Unverified or no-longer-approved trust claims: `40+ sites built`, `100% satisfaction`, `48hr turnaround`
- Old project/case-study content includes Gustavo's Landscape and 305 RIPPZ, which are not approved launch claims in the current v3 plan
- Contact information differs from v3 source in places
- Production still needs to serve the current Cloudflare Pages package and pass `node verify-production.mjs`

Launch implication: production cutover is not just a deploy task. It is also a trust cleanup. The old live site currently makes stronger claims than the current evidence supports.

## 3. Source Research

This PRD uses the current worktree plus current public market references. Pricing references are directional because many vendor pricing pages are themselves marketing material.

### 3.1 Pricing Research

| Source | Relevant Finding | PRD Use |
| --- | --- | --- |
| EzPz Sites / Pixelated Dreams / Onyx Web Services / Hunter Web Designs | Current productized small business website offers commonly use `$150/mo` as a monthly subscription anchor | v3 Starter `$150/mo` is not too low if scope is controlled and the work is founder-led/custom |
| Hand-Coded Web / Onyx Web Services / Hunter Web Designs | One-time small business website builds commonly appear around `$1,000-$3,000+` depending on page count and support | v3 ownership from `$1,500` is defensible for an early founder-led custom build |
| CitrusKiwi Phoenix package pricing | Positions low monthly packages as affordable all-in-one web presence | v3 should not compete only on lowest price |
| WebFX local SEO pricing | Local SEO retainers commonly run `$500-$3,000/mo`; one-time local SEO projects commonly run `$500-$5,000` | v3 Growth `$400/mo` is affordable and must stay capped; do not sell it as full-service SEO |
| Google Business Profile help | Local ranking factors are relevance, distance, and prominence; profile completeness, reviews, photos, and links matter | v3 service offering should focus on GBP completeness, service relevance, reviews, and local proof |
| Google Search Central SEO Starter Guide | There is no guarantee a site will be indexed or rank first, even when best practices are followed | v3 launch should keep technical SEO clean and avoid ranking guarantees |
| Google sitemap docs | Submit absolute canonical URLs that should appear in search; sitemap submission is a hint, not a guarantee | v3 sitemap should include only approved canonical pages |
| SBA local marketing article | Referral programs can be as simple as giving satisfied customers extra business cards; local partnerships can expand reach | Business cards and referral asks should be part of the launch system |
| FTC CAN-SPAM guide | Commercial outreach must avoid misleading headers/subjects, identify advertising where required, include a physical postal address, provide opt-out, and honor opt-outs within 10 business days | Cold email must be low-volume, compliant, and tracked |

Source URLs:

- https://www.ezpzsites.com/
- https://pixelateddreamswebdesign.com/
- https://onyxwebservices.com/
- https://handcodedweb.com/
- https://hunterwebdesigns.com/pricing/
- https://www.citruskiwi.com/phoenix-small-business-website-package-pricing
- https://www.webfx.com/local-seo/pricing/
- https://support.google.com/business/answer/7091/improve-your-local-ranking-on-google
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://www.sba.gov/blog/10-local-marketing-strategies-work
- https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business

## 4. Pricing Decision

### 4.1 Recommendation

Use the owner-corrected subscription-or-ownership pricing structure, and tighten the promise.

Recommended public pricing:

| Tier | Keep / Change | Reason |
| --- | --- | --- |
| Starter: `$150/mo` subscription | Keep | Defensible for a custom 5-8 page founder-led site. Low enough for early trust stage, not so low that it looks like template churn. |
| Growth: `$400/mo` subscription | Keep, tighten monthly scope | Strong acquisition-friendly price, but current scope can overcommit Andrew if every client gets full content production, city pages, reporting, GBP, and conversion work forever. |
| Own outright: starting at `$1,500` | Keep | Defensible early custom-build ownership anchor. Ongoing hosting, support, updates, and SEO should be quoted separately or moved to subscription. |
| Custom: scoped | Keep, revise claims | Keep as a consultative tier, but remove or soften "dedicated project manager" unless it means Andrew directly manages the project. Do not imply a larger agency team. |

### 4.2 Growth Scope Adjustment

Current Growth copy says one priority monthly content/update cycle. Do not expand this into full-service SEO or unlimited content at `$400/mo`.

Recommended replacement:

> Monthly SEO support with reporting, Google Business Profile improvements, one priority content/update cycle, and a quarterly conversion review.

Then define optional content:

- Additional SEO article: custom quote
- Additional service-area page: custom quote
- Citation cleanup/buildout: custom quote or included only in first 90 days

This protects delivery time while still making Growth look useful.

### 4.3 Founding Client Strategy

Do not publish broad "founding member" discounts on the site. Public discounts can make the brand feel desperate and reduce trust.

Use private founding-client flexibility instead:

- Offer 3-5 early businesses a private "founding case-study slot."
- Keep public price anchored at `$150/mo`, `$400/mo`, or one-time ownership from `$1,500`.
- Privately allow one of these concessions:
  - split one-time ownership across 2-3 payments,
  - reduce the ownership build price in exchange for a testimonial, case-study approval, and 90-day minimum support commitment,
  - include one extra service page after launch,
  - include business-card QR tracking or call tracking setup.
- Never discount the monthly below a level that makes support unprofitable.

### 4.4 Trust-Safe Pricing Copy

The pricing section should communicate:

- "Every engagement starts with a free website review."
- "Starter and Growth are monthly subscription options."
- "One-time ownership builds start at $1,500 and are scoped before work begins."
- "Pricing depends on site scope, content needs, competition, and timeline."
- "No ranking guarantees."
- "Starter is for getting a professional, search-ready foundation live."
- "Growth is for businesses ready to improve local visibility and lead quality over time."
- "Custom is for multi-location, integrations, ecommerce, or more complex automation."

Avoid:

- "40+ sites built" unless Andrew confirms it is true and appropriate.
- "100% satisfaction" unless backed by a real policy.
- "48 hour full-site turnaround" unless every launch can meet it.
- "Dedicated project manager" if there is no separate PM.
- "Unlimited" updates unless boundaries are stated.
- Public "founding member" discounts unless Andrew intentionally wants a lower-price positioning.

## 5. Product Requirements

### L-1 Production Cutover

Requirement: `showcase-designs.com` serves the current v3 build, not the stale older site.

Acceptance criteria:

- `/` serves current `index.html`.
- `/world` serves current `world.html`.
- `/thanks` serves current `thanks.html`.
- `/privacy` and `/terms` are reachable if linked.
- Old Vercel-only routes and old case studies are gone unless intentionally preserved.
- `node verify-production.mjs` passes with `SHOWCASE_ORIGIN=https://showcase-designs.com`.

### L-2 Deploy Package

Requirement: production deploy uses the allowlisted Cloudflare `dist/` package, not the workspace root.

Acceptance criteria:

- Build command is `node prepare-cloudflare-deploy.mjs`.
- Output directory is `dist`.
- `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, `favicon.svg`, and `og-image.png` are present.
- No local audit docs, source screenshots, or verification artifacts are published.

### SEO-1 Canonical Static Marketing Page

Requirement: `/` remains the SEO and conversion source of truth.

Acceptance criteria:

- One H1.
- Unique title and meta description.
- Canonical points to `https://showcase-designs.com/`.
- Sitemap includes only URLs intended to rank.
- `/world`, `/thanks`, and `404.html` remain noindex where appropriate.
- Structured data reflects real business information and approved services.

### SEO-2 Search Console Launch

Requirement: production launch includes search indexing setup.

Acceptance criteria:

- Google Search Console property is verified for `showcase-designs.com`.
- `https://showcase-designs.com/sitemap.xml` is submitted.
- URL Inspection is used for `/` after launch.
- Bing Webmaster Tools is set up or scheduled.
- Search Console baseline is recorded at launch and reviewed weekly for first 30 days.

### SEO-3 Local SEO Foundation For Showcase Designs

Requirement: Showcase Designs itself has enough local trust signals to receive outreach and card traffic.

Acceptance criteria:

- Google Business Profile is created or updated for Showcase Designs if eligible.
- Business name, phone, email, website, and service areas match the site.
- If Andrew uses a service-area business profile, address visibility follows Google guidelines.
- At least 5 approved photos/screenshots are ready for GBP.
- Review ask process exists for current/approved clients.

### TRUST-1 Evidence-Based Claims

Requirement: launch copy only claims what Andrew can prove.

Acceptance criteria:

- No unapproved client/project appears.
- No fake or placeholder testimonial appears.
- No numeric volume claim appears unless confirmed.
- Case-study language distinguishes real clients, approved projects, and examples if examples are ever used.
- Existing four launch exhibits are reviewed for approval before production.

### TRUST-2 Founder-Led Positioning

Requirement: the site converts despite limited client count by leaning into direct founder-led work.

Acceptance criteria:

- About section clearly says Andrew is the builder/operator.
- Public copy does not pretend Showcase Designs is a large agency.
- The value proposition is custom, fast, technical, local-search-aware, and direct.
- Pricing copy explains the free website review without sounding like a pressure sales funnel.

### CONV-1 Contact And Lead Capture

Requirement: every serious visitor has a low-friction next step.

Acceptance criteria:

- Primary CTA: "Get a Free Website Review."
- Contact form submits reliably.
- Email address and phone number are consistent across HTML, schema, footer, and contact section.
- Thank-you route works.
- Form failure fallback is visible or documented.
- Business card QR points to a working URL with tracking parameters.

### CONV-2 Analytics And Tracking

Requirement: Andrew can tell which channel is creating leads.

Acceptance criteria:

- GA4 or equivalent analytics is installed.
- Events are tracked for:
  - form submit,
  - phone click,
  - email click,
  - pricing CTA click,
  - business card QR visit,
  - live project click,
  - `/world` entry.
- UTM conventions are documented.
- Leads are logged in a simple CRM sheet or database.

### ACQ-1 Business Card Funnel

Requirement: business cards support a specific conversion path, not generic branding.

Acceptance criteria:

- Card has one primary offer: "Free website review."
- Card includes `showcase-designs.com` QR code with UTM tracking.
- Card includes phone and email.
- QR landing target works before cards are printed.
- Andrew has a plan for where and when cards will be handed out.

### ACQ-2 Outreach System

Requirement: after launch, Andrew has a repeatable way to find and contact potential clients.

Acceptance criteria:

- Ideal customer list is defined.
- Lead sources are defined.
- Outreach scripts are written.
- Follow-up cadence is written.
- Compliance rules are included.
- Results are tracked weekly.

## 6. Recommended Site Copy Changes Before Launch

### 6.1 Pricing Section

Change Growth monthly deliverables from:

> 2 blog posts per month

To:

> Monthly SEO support with reporting, Google Business Profile improvements, and one priority content/update cycle.

Change Custom bullet:

> Dedicated project manager

To:

> Direct founder-led project management

Consider changing:

> Hosting + domain included

To:

> Hosting included; domain setup handled

Reason: domain renewals, premium domains, registrars, DNS, and ownership can create confusion. The client should own the domain.

### 6.2 Trust Section

The live production site currently makes strong claims that should not carry into v3 unless confirmed.

Remove or avoid:

- `40+ sites built`
- `100% satisfaction`
- `48hr turnaround`
- `built websites for home service businesses across Arizona and nationwide` if not provable
- unapproved projects

Use instead:

- "Founder-built websites for contractors and local service businesses."
- "Real project work shown where approved."
- "Direct communication with the person building your site."
- "Fast, mobile-first pages with local SEO structure baked in."

### 6.3 Offer Copy

Recommended primary offer:

> Free Website Review

Review output:

- 3 biggest trust or conversion issues
- 3 local SEO opportunities
- 1 recommended next step
- clear quote only if the business asks for one

This lets Andrew start conversations without pretending to have a large agency pipeline.

## 7. Client Acquisition Plan

### 7.1 Ideal Customers

Initial focus:

- Local businesses and service companies with visible buying intent.
- Examples: roofing, HVAC, plumbing, electrical, landscaping, fencing, concrete, cleaning, pest control, pool service, auto detail, vending, fitness/training, real estate, restaurants, and local shops.
- Businesses with outdated websites, weak mobile layouts, no clear service-area pages, poor forms, no visible reviews, or inconsistent Google Business Profile details.

Stay selective. Focus outreach where a better website and local SEO can clearly lead to calls, bookings, review requests, or quote requests.

### 7.2 Lead List Criteria

Each lead should have:

- Business name
- Owner/manager name if public
- Website
- Phone
- Public email or contact form URL
- City/service area
- Industry
- Google Business Profile link
- Review count/rating
- One specific website issue
- One specific local SEO issue
- Current status: not contacted, contacted, replied, booked review, proposal sent, won, lost, do-not-contact

Lead sources:

- Google Maps manual research
- Local chamber/business directories
- Contractors associations
- Facebook local business groups where promotion is allowed
- Referral conversations
- Businesses Andrew already visits or knows
- Trucks/signs/business cards encountered in normal life

Avoid buying low-quality bulk lead lists for the first launch cycle. The offer depends on specificity.

### 7.3 Outreach Channels

Priority order:

1. Warm referrals from existing clients, friends, family, and local business owners.
2. In-person card handoffs with a specific reason to scan the QR code.
3. Personalized email or contact-form note with one useful observation.
4. Phone follow-up only when there is a clear local fit.
5. Local partnerships with photographers, sign shops, bookkeepers, print shops, and consultants.
6. Social proof loop: short public website teardown posts and before/after examples.

### 7.4 Business Card Strategy

Card front:

- Showcase Designs
- Websites + Local SEO for Local Businesses
- Free Website Review

Card back:

- QR code to `https://showcase-designs.com/?utm_source=business_card&utm_medium=offline&utm_campaign=v3_launch`
- `andrew@showcase-designs.com`
- `(520) 367-2769` if confirmed
- "Built by Andrew Ferguson"

Handout targets:

- Existing friendly business owners
- Contractor supply houses where appropriate
- Local networking events
- Friends/family who can refer business owners
- Any current client handoff after a completed win

Referral ask:

> If you know a local business whose website is costing them calls, send them here for a free review.

### 7.5 Outreach Scripts

Email / contact form:

```text
Subject: Quick website note for [Business Name]

Hi [Name],

I am Andrew from Showcase Designs in Tucson. I was looking at [Business Name] and noticed one thing that may be costing calls: [specific issue].

I build websites and local SEO systems for local businesses. I am offering a free website review while launching the new Showcase Designs site.

If useful, I can send over 3 quick fixes I would make to improve trust, mobile clarity, and local search visibility.

Either way, I hope this helps.

Andrew
Showcase Designs
[phone]
[website]

To opt out of future notes from me, reply "no thanks."
```

Referral text:

```text
I just launched the new Showcase Designs site. I am looking for a few more local businesses to do free website reviews for. If you know someone whose site looks outdated or is not getting calls, can you send them this link?

https://showcase-designs.com/?utm_source=referral&utm_medium=text&utm_campaign=v3_launch
```

In-person card handoff:

```text
I build websites and local SEO systems for local service businesses. I am offering a free website review right now. The QR code goes straight to the review request page.
```

### 7.6 Outreach Compliance

For commercial email:

- Use truthful sender information.
- Use accurate subject lines.
- Do not imply an existing relationship if there is not one.
- Include a valid postal address or compliant mailing address before scaling cold email.
- Provide a clear opt-out path.
- Honor opt-outs within 10 business days.
- Keep volume low until reply quality and compliance are proven.

Do not send automated bulk cold email until compliance, deliverability, and tracking are intentionally set up.

## 8. 30-Day Launch Plan

### Week 0: Launch Readiness

Goals:

- Production serves v3.
- Contact form works.
- Pricing and trust claims are safe.
- Business card QR target works.
- Analytics and Search Console are ready.

Tasks:

- Apply pricing copy changes.
- Confirm phone, email, and business address/mailing address.
- Confirm approved client/project list.
- Fix or replace FormSubmit if it is still unreliable.
- Run `node verify-world.mjs`.
- Run `node verify-outbound.mjs`.
- Build `dist/` with `node prepare-cloudflare-deploy.mjs`.
- Deploy through approved Cloudflare production workflow.
- Run `SHOWCASE_ORIGIN=https://showcase-designs.com node verify-production.mjs`.
- Submit sitemap in Search Console.

### Week 1: Warm Launch

Goals:

- Get first conversations without broad cold outreach.
- Verify that the site converts real people.

Tasks:

- Send referral text to trusted contacts.
- Hand out first 25-50 business cards.
- Ask approved clients/friends for introductions.
- Post one launch announcement with a clear free-review offer.
- Build first 50-lead list manually.
- Send 10 personalized outreach notes.

Success signals:

- 3-5 free review requests.
- 1-2 live calls booked.
- No confusion about pricing.
- No form/phone/email failures.

### Week 2: Focused Outreach

Goals:

- Turn the site into a repeatable sales asset.

Tasks:

- Add 50 more qualified leads.
- Send 20 personalized notes.
- Make 10 warm follow-ups.
- Publish 1 useful teardown or before/after post.
- Ask every conversation: "Do you know another local business this would help?"

Success signals:

- 5+ replies.
- 2+ reviews delivered.
- 1 proposal sent.

### Week 3: Offer Tightening

Goals:

- Improve based on real sales objections.

Tasks:

- Review all objections from calls.
- Update FAQ/pricing copy only if multiple prospects misunderstand the same thing.
- Add one proof asset if approved: screenshot, testimonial, mini case study, or before/after.
- Follow up with all warm leads.

Success signals:

- Clearer pricing conversations.
- At least one serious proposal in progress.
- At least one testimonial/review request sent to an approved client.

### Week 4: First Acquisition Review

Goals:

- Decide what to scale.

Tasks:

- Review analytics by UTM source.
- Review Search Console indexing.
- Review outreach reply rate.
- Review conversion from free review to proposal.
- Decide whether to increase in-person cards, cold notes, partnerships, or content.

Decision rules:

- If business cards produce scans but no inquiries, improve the landing offer.
- If outreach gets replies but no calls, improve review output and CTA.
- If calls happen but no proposals close, revisit pricing, guarantee language, and proof.
- If nobody replies, lead targeting or personalization is too weak.

## 9. Metrics

### Launch Quality Metrics

- `verify-world.mjs`: pass
- `verify-outbound.mjs`: pass or documented operator-approved exception
- `verify-production.mjs`: pass on production
- Lighthouse production mobile: target 90+ performance, 100 SEO
- Contact form: successful real test
- Search Console: sitemap submitted

### Acquisition Metrics

Track weekly:

- Business cards handed out
- Business card QR visits
- Referral asks made
- Leads added
- Outreach messages sent
- Replies
- Free reviews requested
- Free reviews delivered
- Calls booked
- Proposals sent
- Clients closed
- Revenue booked

Initial 30-day activity target:

- 100 qualified leads researched
- 50 personalized outreach touches
- 50 business cards distributed
- 10 referral asks
- 5 free reviews delivered
- 2 proposals sent

These are activity targets, not guarantees.

## 10. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Production keeps serving stale site | Confuses prospects and hurts trust | Treat production cutover as P0; verify live domain before printing cards |
| Pricing feels too expensive without proof | Prospects hesitate | Use free review, founder-led positioning, and private founding slots |
| Pricing feels too cheap | Prospects assume template work | Keep subscription and ownership options clear; avoid public fire-sale discounts |
| Growth tier overcommits Andrew | Delivery quality drops | Cap monthly content/update cycle and quote extra content separately |
| Unverified claims remain | Trust damage | Remove numeric claims and unapproved projects before launch |
| FormSubmit fails | Leads lost | Test form before launch; use fallback email/phone; replace provider if needed |
| Cold email compliance gap | Legal/reputation risk | Keep outreach manual, truthful, low-volume, and opt-out compliant |
| Business cards point to wrong URL | Offline traffic wasted | Final QR test before print |

## 11. Open Questions For Andrew

These must be confirmed before production launch or before scaling outreach:

1. Exact approved client/project list for public launch.
2. Whether EvenPath, Felco, Abel, and Beckel can all be shown publicly as client/project examples.
3. Whether any numeric claims are approved, including site count, response time, satisfaction, or turnaround.
4. Final public phone number.
5. Final public email address.
6. Whether Andrew has a compliant physical mailing address or PO box for commercial outreach.
7. Cloudflare production project name and production branch.
8. Whether the private founding-client offer is approved, and how many slots are allowed.
9. Whether Growth should stay `$400/mo` or move higher after the first 3-5 clients. Owner answer on 2026-06-06: decide later.
10. Whether business cards should target only contractors/home services or all local businesses. Owner answer on 2026-06-06: all local businesses.

## 12. Release Criteria

Showcase v3 is ready to go live when all are true:

- Current v3 site is deployed to `https://showcase-designs.com`.
- Stale production content is gone.
- Pricing copy is updated to avoid overpromising.
- Unapproved projects and numeric claims are removed.
- Form, phone, email, `/thanks`, and fallback contact paths work.
- `SHOWCASE_ORIGIN=https://showcase-designs.com node verify-production.mjs` passes.
- `node verify-world.mjs` passes.
- `node verify-outbound.mjs` passes or Andrew approves a documented exception.
- Search Console and sitemap are configured.
- Business card QR target is tested.
- Outreach scripts and follow-up tracker are ready.

## 13. Next Implementation Tickets

1. Edit `index.html` and `v3-preview.html` pricing copy:
   - replace Growth "2 blog posts per month" with capped monthly SEO support,
   - replace "Dedicated project manager" with "Direct founder-led project management",
   - clarify hosting/domain language.
2. Compare production old-site claims against v3 and confirm nothing stale remains after deploy.
3. Confirm public contact details and update schema/footer/form consistently.
4. Decide whether to replace FormSubmit or keep it with a tested fallback.
5. Generate final business card QR URL and test it.
6. Prepare Cloudflare production deploy using `CLOUDFLARE_DEPLOY.md`.
7. After production deploy, rerun all gates and update `PRODUCTION_AUDIT.md`.
8. Create the first 100-lead outreach tracker.
9. Print business cards only after production URL and QR path pass.
