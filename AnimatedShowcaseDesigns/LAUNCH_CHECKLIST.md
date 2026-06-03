# Launch Checklist

Use this after `node verify-world.mjs` passes and after both device QA reports in `DEVICE_QA.md` pass.

## Current Status

As of 2026-06-03, local launch-readiness validation passes, but production still serves the stale Vercel site.

Current direct-upload package:

```text
deploy-artifacts/showcase-designs-dist-20260603-103616.zip
SHA256 5c49fe6fca877a1fb31d0f16730a2f038eb71c39194865fc767238f83802ed92
```

Latest production check:

```text
SHOWCASE_ORIGIN=https://showcase-designs.com node verify-production.mjs
Result: 54 production checks failed
Reason: showcase-designs.com still serves the old Vercel build; /world and /thanks return 404.
```

## Local Gate

```bash
node verify-world.mjs
```

Required result:

```text
All checks pass.
```

## Production Route Gate

Deploy the current workspace through Cloudflare Pages, or use the equivalent approved Cloudflare release workflow for the production project.

Use `CLOUDFLARE_DEPLOY.md` for the exact Cloudflare settings. The production deploy must publish the generated `dist/` folder, not the workspace root.

Optional pre-deploy dry run:

```bash
node serve-local.mjs
SHOWCASE_ORIGIN=http://127.0.0.1:8765 node verify-production.mjs
node prepare-cloudflare-deploy.mjs
```

This uses the same route/source verifier against the local clean-route helper before production credentials are available.

Before deploying, confirm Cloudflare project details:

```text
Cloudflare account/project:
Deployment method: Pages Git integration / Pages direct upload / approved workflow
Production domain: showcase-designs.com
Build command: node prepare-cloudflare-deploy.mjs
Output directory: dist
```

Pass criteria:

- Build command is `node prepare-cloudflare-deploy.mjs`, or an equivalent approved process creates the same allowlisted output.
- Output directory is `dist`.
- `_redirects` and `_headers` are included in the deployed static output.
- `_redirects` does not rewrite `/world` to `/world.html` or `/thanks` to `/thanks.html`; Cloudflare Pages built-in extensionless HTML routing serves those clean routes.
- `showcase-designs.com` points at the intended Cloudflare deployment.
- The approved deploy workflow explicitly identifies the Cloudflare account/project.

Run:

```bash
node verify-production.mjs
```

After deploying to `https://showcase-designs.com`, confirm:

```bash
curl -I https://showcase-designs.com/
curl -I https://showcase-designs.com/world
curl -I https://showcase-designs.com/thanks
curl -I https://showcase-designs.com/not-a-real-page
curl -I 'https://showcase-designs.com/?lite=1'
curl -I 'https://showcase-designs.com/world?lite=1'
```

Pass criteria:

- `/` returns the static page.
- `/world` returns the 3D gallery shell.
- `/thanks` returns the noindexed form confirmation page.
- Missing routes return the branded `404.html` page with HTTP 404.
- Cloudflare serves `/world` and `/thanks` through built-in extensionless HTML routing without redirect loops.
- Production responses include `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and `X-Frame-Options: DENY`.
- `/?lite=1` stays on static.
- `/world?lite=1` routes to static.
- Static HTML source does not include Three.js.
- `verify-production.mjs` passes.

## Production Smoke Test

In a normal desktop browser:

1. Open `/`.
2. Click Studio or Explore the studio.
3. Confirm `/world` loads or shows a correct fallback.
4. Click each station chip.
5. Confirm Open live site opens a new tab.
6. Confirm Case study routes to the matching static section.
7. Click Fast view and confirm the static site returns.
8. Submit a test form or visit `/thanks` and confirm the confirmation page loads.

## Outbound Link Gate

Run:

```bash
node verify-outbound.mjs
```

Pass criteria:

- All live-site URLs return a successful or redirect response.
- No station CTA points to a deleted deployment or missing page.
- If a URL fails, get the correct URL from the operator before launch.

## Core Web Vitals Gate

Production p75 targets from the PRD:

- LCP `<= 2.5s`
- INP `<= 200ms`
- CLS `<= 0.1`

Record the source used for p75 values:

```text
Source:
Date:
LCP:
INP:
CLS:
Result: PASS / FAIL
```

## Operator Approval

Before launch, confirm:

- Station list is approved.
- Case-study hero/intro copy and case-study anchors are approved.
- External live-site URLs are approved.
- Static page remains the canonical conversion path.
- 3D gallery remains opt-in.

Approval record:

```text
Approver:
Date:
Decision: APPROVED / CHANGES REQUESTED
Notes:
```

## Launch Decision

Launch only when all of these pass:

- `node verify-world.mjs`
- `DEVICE_QA.md` iOS Safari report
- `DEVICE_QA.md` Android Chrome report
- Production route gate
- Production smoke test
- Outbound link gate
- Core Web Vitals gate
- Operator approval
