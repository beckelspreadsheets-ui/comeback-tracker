# Outbound Link Audit

Observed: 2026-05-03 from local network checks.
Latest passing station-link rerun: 2026-06-03 after the launch-readiness pass.
Latest full outbound rerun: 2026-06-03 at 18:26 UTC.

Command:

```bash
node verify-outbound.mjs
```

The verifier checks:

- Static case-study `href` values match `world-data.js` station `liveUrl` values.
- Each live URL responds with a success or redirect-class status.
- The FormSubmit contact endpoint responds.

## Result

All approved launch station live URLs passed. The full outbound command currently passes, including the FormSubmit endpoint.

| Link | URL | Observed | Status |
| --- | --- | --- | --- |
| EvenPath Homes | `https://evenpathhomes.com` | HTTP 200 | Passed |
| Felco Vending | `https://felcovending.com` | HTTP 200 | Passed |
| Abel M. Fitness | `https://abelfitness.com/` | HTTP 200 | Passed |
| Beckel Spreadsheets | `https://beckel-store.vercel.app` | HTTP 200 | Passed |
| FormSubmit endpoint | `https://formsubmit.co/andrew@showcase-designs.com` | HTTP 200 | Passed |

Latest command result:

```text
node verify-outbound.mjs
9 outbound checks passed.
```

## Required Rule

Do not add a station or static live-site link unless the client/project is approved and the URL passes `node verify-outbound.mjs`.

Do not mark launch complete if FormSubmit fails on a pre-launch rerun unless Andrew explicitly approves a different form provider or fallback contact flow.

Before launch, rerun:

```bash
node verify-outbound.mjs
node verify-world.mjs
```
