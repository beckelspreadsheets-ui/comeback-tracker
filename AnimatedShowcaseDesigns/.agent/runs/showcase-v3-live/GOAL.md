# Showcase v3 Live

Goal ID: `showcase-v3-live`
Started: 2026-06-03T16:52:40Z
Parent goal: none
Mode: full
Ledger path: `.agent/runs/showcase-v3-live/`

## Objective

Implement Showcase Designs v3 from SHOWCASE_V3_LIVE_PRD.md, verify pricing with current market research, and prepare the site for production launch.

## Goal Mode Coupling

When creating or updating the matching `/goal`, include this ledger pointer in the goal objective:

`Maintain the agent-owned ledger at /Users/andrewferguson/Downloads/comeback-tracker/AnimatedShowcaseDesigns/.agent/runs/showcase-v3-live/ and keep implementation-notes.html current at checkpoints, before compaction, and before final handoff.`

## Finishing Criteria

- [done] Current v3 pricing is checked against current market research and documented with sources.
- [done] Pricing, trust, and founder-led copy changes from `SHOWCASE_V3_LIVE_PRD.md` are applied to `index.html` and matching preview surfaces.
- [done] Local validation gates are run, including `node verify-world.mjs`, `node verify-outbound.mjs`, `node prepare-cloudflare-deploy.mjs`, and a local dry run of `node verify-production.mjs` against the generated package where possible.
- [done] Client acquisition system artifacts are created for the launch cycle, including UTM conventions, business-card funnel, outreach scripts, compliance rules, manual follow-up cadence, and a 100-lead tracker template.
- [done] Static site conversion tracking hooks cover form submit, phone click, email click, pricing CTA click, business-card QR visit, live project click, and `/world` entry through `dataLayer` / `gtag` when available.
- [blocked] GA4 or equivalent production analytics install remains operator-controlled until a measurement ID or analytics account details are provided.
- [blocked] Production-only and operator-only launch gates are recorded explicitly instead of guessed, including Cloudflare project details, approved client/project list, public contact details, Search Console, business-card QR, and real production deploy verification.
- [done] Keep `implementation-notes.html` current with status, decisions, tradeoffs, changes, validation, blockers, and next exact action.
- [done] Link large proof artifacts from `evidence/` when they are too bulky for the HTML notes.

## Escape Hatch

Pause, ask the user, or mark a scoped item `[blocked]` / `[incomplete]` if:
- validation contradicts the goal
- the goal requires a scope change
- the agent is looping without measurable progress
- the next step risks deleting or rewriting durable memory
- the PRD and actual repo disagree
- the ledger itself contaminates validation
