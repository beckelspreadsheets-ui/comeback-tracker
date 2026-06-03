# Showcase Designs Launch Acquisition System

Status: launch-ready template; do not scale outreach until the operator confirmations below are complete.

## Primary Offer

Free Website Review

The review output is:

- 3 trust or conversion issues holding the site back.
- 3 local SEO opportunities tied to the business service area.
- 1 recommended next step.
- A quote only if the business asks for one.

## Tracking URLs

Use these URLs exactly unless Andrew approves a different campaign name.

| Channel | URL |
| --- | --- |
| Business card QR | `https://showcase-designs.com/?utm_source=business_card&utm_medium=offline&utm_campaign=v3_launch` |
| Referral text | `https://showcase-designs.com/?utm_source=referral&utm_medium=text&utm_campaign=v3_launch` |
| Manual email outreach | `https://showcase-designs.com/?utm_source=manual_outreach&utm_medium=email&utm_campaign=v3_launch` |
| Contact-form outreach | `https://showcase-designs.com/?utm_source=manual_outreach&utm_medium=contact_form&utm_campaign=v3_launch` |
| Partner referral | `https://showcase-designs.com/?utm_source=partner&utm_medium=referral&utm_campaign=v3_launch` |
| Social launch post | `https://showcase-designs.com/?utm_source=social_post&utm_medium=organic_social&utm_campaign=v3_launch` |
| Google Business Profile | `https://showcase-designs.com/?utm_source=google_business_profile&utm_medium=organic&utm_campaign=v3_launch` |

UTM rules:

- `utm_source`: who or what sent the visitor.
- `utm_medium`: channel type.
- `utm_campaign`: use `v3_launch` for the first launch cycle.
- `utm_content`: optional variant label, for example `card_front`, `card_back`, or `roofing_list`.
- `utm_term`: optional industry or search term.

The site now passes UTM fields, landing page, and referrer through the contact form when present.

## Tracker

Use `OUTREACH_TRACKER.csv` as the first 100-lead CRM sheet. Fill only public or permission-based information.

Required weekly metrics:

- Leads added.
- Outreach messages sent.
- Replies.
- Free reviews requested.
- Free reviews delivered.
- Calls booked.
- Proposals sent.
- Clients closed.
- Revenue booked.

## Business Card Funnel

Front:

- Showcase Designs
- Websites + Local SEO for Contractors
- Free Website Review

Back:

- QR code to `https://showcase-designs.com/?utm_source=business_card&utm_medium=offline&utm_campaign=v3_launch`
- `hello@showcase-designs.com`
- `(520) 367-2769` only if confirmed
- Built by Andrew Ferguson

Do not print cards until:

- Production serves the v3 site.
- `SHOWCASE_ORIGIN=https://showcase-designs.com node verify-production.mjs` passes.
- Final public phone and email are confirmed.
- QR scan opens the production URL with UTM parameters intact.
- Form, phone click, email click, and `/thanks` are tested on production.

Handout targets:

- Existing friendly business owners.
- Contractor supply houses where appropriate.
- Local networking events.
- Friends/family who can refer business owners.
- Current client handoffs after completed wins.

## Lead Qualification

Initial focus:

- Contractors and home-service businesses.
- Roofing, HVAC, plumbing, electrical, landscaping, fencing, concrete, cleaning, pest control, pool service, auto detail, vending, fitness/training.
- Businesses with outdated websites, weak mobile layouts, no clear service-area pages, poor forms, no visible reviews, or inconsistent Google Business Profile details.

Do not start broad with every industry. The first launch cycle should stay specific.

## Manual Outreach Cadence

Use this only for manually researched, relevant businesses.

| Touch | Timing | Action |
| --- | --- | --- |
| 1 | Day 0 | Send one specific note with one observed issue. |
| 2 | Day 4-7 | Send one short follow-up only if there is still a clear fit. |
| 3 | Day 12-16 | Send one close-loop note, then stop unless they reply. |

If they opt out, mark `do_not_contact` immediately.

## Outreach Scripts

Email or contact form:

```text
Subject: Quick website note for [Business Name]

Hi [Name],

I am Andrew from Showcase Designs in Tucson. I was looking at [Business Name] and noticed one thing that may be costing calls: [specific issue].

I build websites and local SEO systems for contractors and home-service businesses. I am offering a free website review while launching the new Showcase Designs site.

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
I just launched the new Showcase Designs site. I am looking for a few more contractor/home-service businesses to do free website reviews for. If you know someone whose site looks outdated or is not getting calls, can you send them this link?

https://showcase-designs.com/?utm_source=referral&utm_medium=text&utm_campaign=v3_launch
```

In-person card handoff:

```text
I build websites and local SEO systems for local service businesses. I am offering a free website review right now. The QR code goes straight to the review request page.
```

## Compliance Rules

- Use truthful sender information.
- Use accurate subject lines.
- Do not imply an existing relationship if there is not one.
- Include a valid postal address or compliant mailing address before scaling cold email.
- Provide a clear opt-out path.
- Honor opt-outs within 10 business days.
- Keep volume low until reply quality and compliance are proven.
- Do not send automated bulk cold email until compliance, deliverability, and tracking are intentionally set up.

## Operator Confirmations Before Scaling

- Approved public client/project list.
- Final public phone number.
- Final public email address.
- Compliant physical mailing address or PO box for commercial outreach.
- Whether business cards target only contractors/home services or all local businesses.
- Whether private founding-client slots are approved and how many.
