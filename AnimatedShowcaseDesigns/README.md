# showcase-v3-preview

Source for Showcase Designs v3: a static marketing page plus an opt-in 3D studio gallery.

## Files

- `index.html` — primary static marketing route for `/`
- `v3-preview.html` — backward-compatible preview copy
- `world.html` — opt-in 3D studio gallery route for `/world`
- `thanks.html` — noindexed FormSubmit confirmation route for `/thanks`
- `404.html` — noindexed fallback page for missing routes
- `world.css`, `world.js`, `world-data.js` — 3D gallery styles, scene logic, and station data
- `_redirects` — Cloudflare Pages guard file documenting that clean routes use built-in extensionless HTML routing
- `_headers` — Cloudflare Pages conservative security headers
- `prepare-cloudflare-deploy.mjs` — allowlisted Cloudflare Pages deploy package builder
- `CLOUDFLARE_DEPLOY.md` — exact Cloudflare Pages build settings and verification steps
- `vercel.json` — optional Vercel fallback rewrites and security headers
- `.vercelignore` — keeps local docs, verifiers, and unused heavy source screenshots out of optional Vercel deploys
- `serve-local.mjs` — local preview server that emulates clean routes and branded 404 behavior
- `favicon.svg` — production favicon
- `og-image.png`, `og-image.svg` — social preview card source and raster output
- `robots.txt`, `sitemap.xml` — production crawl metadata
- `PRD.md`, `IMPLEMENTATION_PLAN.md` — product requirements and implementation plan
- `REQUIREMENTS_TRACE.md` — PRD requirement-to-evidence trace
- `OPERATOR_INPUTS.md` — exact external inputs needed to complete launch validation
- `DEVICE_QA_QUICK_START.md` — short real-phone QA handoff for iOS Safari and Android Chrome
- `LOCAL_BROWSER_AUDIT.md` — local Lighthouse evidence for `/` and `/world.html?try=1`
- `PRODUCTION_AUDIT.md` — current production route and source audit
- `OUTBOUND_LINK_AUDIT.md` — current external live-site URL audit
- `LAUNCH_ACQUISITION_SYSTEM.md` — business-card, UTM, outreach, compliance, and weekly tracking runbook
- `OUTREACH_TRACKER.csv` — blank 100-lead launch CRM tracker template
- `privacy.html`, `terms.html` — linked from the footer
- `img/` — mobile screenshots used by the approved launch case-study grid
- `img/world/` — optimized gallery textures used by `/world`

External deps load via CDN. The static page uses GSAP + ScrollTrigger, Lenis, Phosphor Icons, and SplitType, while keeping the H1 text paint-stable for LCP. The 3D route dynamically imports Three.js only after `/world` eligibility checks pass. There is no build step.

## Local preview

```bash
node serve-local.mjs
# open http://127.0.0.1:8765/
# open http://127.0.0.1:8765/world
```

Pass a different port when needed:

```bash
node serve-local.mjs --port 8000
```

Preview the generated Cloudflare package after running `node prepare-cloudflare-deploy.mjs`:

```bash
node serve-local.mjs --root dist
```

The helper server rewrites `/world` to `world.html`, rewrites `/thanks` to `thanks.html`, serves this workspace's branded `404.html` for missing routes, and applies the same conservative local security headers expected from `_headers`.

If you use Python's simple static server instead, open `/world.html` directly because it does not provide clean-route rewrites.

For real-device QA, open `/world.html?qa=1&try=1`. This hidden mode keeps normal visitors unaffected and overlays route, FPS, jank, device, canvas, and pixel-check metrics while continuously rendering the studio scene. Leave it open for at least 90 seconds on iOS Safari and Android Chrome, then use the QA panel's Copy report button or inspect `window.__showcaseWorld.getState().qa` from remote devtools for the final metrics, including `render.calls`, triangles, textures, and geometries.

Use `DEVICE_QA_QUICK_START.md` for the short real-phone handoff.
Use `DEVICE_QA.md` for the full mobile launch checklist and report template.
Use `DEVICE_QA_RESULTS.md` plus `node verify-device-qa.mjs` to validate pasted real-device reports.
Use `COMPLETION_AUDIT.md` for the current evidence map and remaining launch gates.
Use `REQUIREMENTS_TRACE.md` for the PRD ID-to-evidence trace.
Use `OPERATOR_INPUTS.md` for the exact external inputs needed to finish validation.
Use `LAUNCH_CHECKLIST.md` for production route, Core Web Vitals, smoke-test, and operator approval gates.
Use `PRODUCTION_AUDIT.md` for the latest checked production route status.
Use `CLOUDFLARE_DEPLOY.md` for the clean Cloudflare Pages deploy package and settings.
Use `LOCAL_BROWSER_AUDIT.md` for local Lighthouse performance, accessibility, best-practices, and SEO evidence.
Use `OUTBOUND_LINK_AUDIT.md` for the current external live-site URL status.

Run the local verification gate before deploying:

```bash
node verify-world.mjs
```

After deploying, run the production route/source gate:

```bash
node verify-production.mjs
```

You can dry-run the same route/source contract locally with the clean-route helper:

```bash
node serve-local.mjs
SHOWCASE_ORIGIN=http://127.0.0.1:8765 node verify-production.mjs
```

Before launch, run the outbound link gate:

```bash
node verify-outbound.mjs
```

Optional local browser audit:

```bash
npx --yes lighthouse http://127.0.0.1:8000/ --only-categories=accessibility,best-practices,performance,seo --output=json --output-path=/tmp/showcase-index-lh.json --quiet --chrome-flags="--headless=new --disable-gpu"
```

## Deploy

The production domain should serve clean URLs:

- `/` -> `index.html`
- `/world` -> `world.html`
- `/thanks` -> `thanks.html`

This folder includes Cloudflare Pages config files: `_redirects` documents that `/world` and `/thanks` rely on Cloudflare Pages built-in extensionless HTML routing, and `_headers` applies conservative security headers. As of the latest `PRODUCTION_AUDIT.md`, `showcase-designs.com` is still serving the older Vercel page at `/`, and `/world` plus `/world.html` return 404. Deploy a clean `dist/` package through Cloudflare before treating production gates as complete.

`vercel.json` remains in the folder as an optional fallback if the project is deployed on Vercel instead of Cloudflare.

Suggested Cloudflare Pages deployment flow:

```bash
node verify-world.mjs
node verify-outbound.mjs
node prepare-cloudflare-deploy.mjs
# deploy dist/ in Cloudflare Pages
node verify-production.mjs
```

Manual Wrangler deploy template:

```bash
npx wrangler pages deploy dist --project-name <cloudflare-pages-project> --branch <production-branch>
```

Confirm the exact project name and production branch in Cloudflare before using that command.

Then rerun the production route checks in `LAUNCH_CHECKLIST.md` and update `PRODUCTION_AUDIT.md` with the new result.

The live page at `system.showcase-designs.com/v3-preview.html` is served from `/var/www/sites/system-preview/v3-preview.html` on the Beckel VPS (Cloudflare Tunnel -> Nginx). It is **not** auto-synced from this repo yet. Promote changes manually for now.

Example Nginx locations:

```nginx
location = / {
    try_files /index.html =404;
}

location = /world {
    try_files /world.html =404;
}
```
