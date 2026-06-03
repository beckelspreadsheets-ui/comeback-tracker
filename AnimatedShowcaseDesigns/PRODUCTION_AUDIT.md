# Production Audit

Observed preview after latest deploy: 2026-05-19 11:07 local time from:

```bash
npx wrangler pages project list
npx wrangler pages deployment list --project-name showcase-designs-preview
node prepare-cloudflare-deploy.mjs
npx wrangler pages deploy dist --project-name showcase-designs-preview --branch main
SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-production.mjs
SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-photo-match.mjs
curl -I https://showcase-designs-preview.pages.dev/img/world/photo-match-room-plate.webp
curl -fsSL https://showcase-designs-preview.pages.dev/world.html | rg -n "photoMatchPlate|photo-match-plate"
curl -fsSL https://showcase-designs-preview.pages.dev/world.css | rg -n "photo-match-room-plate|data-presentation|opacity: 0\\.08"
curl -fsSL https://showcase-designs-preview.pages.dev/world.js | rg -n "GALLERY_LAYOUT_VERSION|HERO_WALL_CLUSTER_APPROVED|addHeroWallLighting|presentationMode|createCeilingPhotoTexture|addStoneSlabMaterialOverlays|cameraFov = portraitViewport|renderPixelRatioLimit|antialias: !isLowTierDevice"
```

Preview deployment is current and route health passed:

```text
Exact Pages project: showcase-designs-preview
Exact branch: main
Earlier preview deployment: https://9db747ed.showcase-designs-preview.pages.dev
Previous hero-wall deployment: https://0cc4d1b9.showcase-designs-preview.pages.dev
Previous photo-match deployment: https://61e0e520.showcase-designs-preview.pages.dev
Previous hybrid-plate deployment: https://9bf74ca5.showcase-designs-preview.pages.dev
Previous photo-lock/stone-overlay deployment: https://b47e5e1b.showcase-designs-preview.pages.dev
Current render/camera tuning deployment: https://d6444b74.showcase-designs-preview.pages.dev
63 production checks passed for https://showcase-designs-preview.pages.dev.
10 photo-match checks passed for https://showcase-designs-preview.pages.dev.
63 production checks passed for https://d6444b74.showcase-designs-preview.pages.dev.
```

Current-build evidence:

- `/world.html` references `world.css?v=photo-match-plate-20260511-1`, `world.js?v=studio-quality-hero-wall-20260509-1`, and `id="photoMatchPlate"`.
- `/world.js` imports `world-data.js?v=studio-quality-hero-wall-20260509-1`.
- `/world.css` includes the `photo-match-room-plate.webp` presentation overlay, hides it during inspection, and includes the 2026-05-18 photo-lock rule that de-emphasizes `#studioCanvas` to opacity `0.08` in presentation mode.
- `/img/world/photo-match-room-plate.webp` returns `HTTP/2 200` with `content-type: image/webp`.
- The stable preview `world.js` includes `GALLERY_LAYOUT_VERSION = "right-reference-hero-wall-20260509"` and `HERO_WALL_CLUSTER_APPROVED = true`.
- The stable preview `world.js` includes `addHeroWallLighting`, `createHeroWallWashTexture`, `createFloorLightPoolTexture`, `createGardenSilhouetteTexture`, `presentationMode`, `createCeilingPhotoTexture`, `addStoneSlabMaterialOverlays`, the 2026-05-19 render/camera tuning, and the current inspection/glass/leather hooks.
- `SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-photo-match.mjs` captured `verification/photo-match-production-desktop.png` and `verification/photo-match-production-mobile.png`.
- The stable preview `world-data.js` places EvenPath, Felco, and Beckel on the main wall, with Abel on the secondary side wall.
- The immutable deployment URL and the stable preview URL serve the same current build identifiers, the same 2026-05-18 photo-lock/stone-overlay refinements, and the same 2026-05-19 render/camera tuning.

Previous verified direct-upload package:

```text
deploy-artifacts/showcase-designs-dist-20260518-182207.zip
SHA256 68902e6d81ed1fc8d57af765167c9dc69571dc7719fd637bd5fcb6c77e40a7bd
```

Latest verified direct-upload package:

```text
deploy-artifacts/showcase-designs-dist-20260603-103616.zip
SHA256 5c49fe6fca877a1fb31d0f16730a2f038eb71c39194865fc767238f83802ed92
```

The 2026-06-03 launch-readiness package includes the pricing/trust copy pass, launch acquisition system, UTM/contact-form attribution capture, and static conversion event hooks. It is generated locally and ready for an approved Cloudflare Pages upload, but it is not yet deployed to `showcase-designs.com`.

Observed: 2026-05-19 18:07 UTC preview deploy evidence from `node verify-production.mjs`, `node verify-photo-match.mjs`, and direct `curl` checks.

Domain checked: `https://showcase-designs.com`

## Result

Production is not serving this workspace build yet. Latest verifier result on 2026-05-11: `50 production checks failed for https://showcase-designs.com.`

Latest verifier result on 2026-06-03: `54 production checks failed for https://showcase-designs.com.`

| URL | Expected | Observed | Status |
| --- | --- | --- | --- |
| `https://showcase-designs.com/` | Current `index.html` with Studio links, free-review offer, and case-study anchors | HTTP/2 200, but source is the older Vercel page last modified 2026-05-29 | Failing |
| `https://showcase-designs.com/world` | Current `world.html` gallery shell | HTTP/2 404, serving `404.html` | Failing |
| `https://showcase-designs.com/world.html` | Current `world.html` gallery shell, if direct file access is supported | HTTP/2 404, serving `404.html` | Failing |
| `https://showcase-designs.com/thanks` | Current `thanks.html` form confirmation page | HTTP/2 404, serving `404.html` | Failing |
| Runtime assets | `world.js`, `world.css`, `world-data.js`, `favicon.svg`, `og-image.png`, `photo-match-room-plate.webp`, and station texture JPGs return the expected asset types | HTTP/2 404 for checked runtime assets | Failing |

## Evidence

Header checks:

```bash
curl -I --max-time 12 https://showcase-designs.com/
curl -I --max-time 12 https://showcase-designs.com/world
curl -I --max-time 12 https://showcase-designs.com/world.html
curl -I --max-time 12 https://showcase-designs.com/thanks
```

Observed headers on 2026-06-03:

- `/` returned `HTTP/2 200`, `server: Vercel`, `x-vercel-cache: HIT`, `last-modified: Fri, 29 May 2026 04:39:38 GMT`, `content-length: 80612`.
- `/world` returned `HTTP/2 404`, `content-disposition: inline; filename="404.html"`, `last-modified: Fri, 29 May 2026 02:39:27 GMT`.
- `/thanks` returned `HTTP/2 404`, `content-disposition: inline; filename="404.html"`, `last-modified: Fri, 29 May 2026 02:39:27 GMT`.

Source checks:

```bash
curl -sS --max-time 12 https://showcase-designs.com/ | rg -n "Explore the studio|js-world-link|case-study-evenpath|world\.html|/world|Three|three"
curl -sS --max-time 12 https://showcase-designs.com/world | head -40
curl -sS --max-time 12 https://showcase-designs.com/ | head -30
```

Observed source findings on 2026-06-03:

- `/` did not include `Explore the studio`, `js-world-link`, `case-study-evenpath`, `world.html`, or `/world`.
- The only `Three` match on `/` was old marketing copy: `Three tiers.<br><em>Zero surprises.</em>`.
- `/world` served the existing production 404 page titled `404 - Page Not Found | Showcase Designs`.
- `/` served the older page titled `Showcase Designs - Premium Web Design for Local Businesses`.
- `/` still includes old pricing and trust claims, including `Autopilot ($199/mo)`, `Pro ($399/mo)`, `Elite ($2,497)`, `40+ Sites Built`, `100% Satisfaction`, and `48hr Turnaround`.

## Required Fix

Deploy this workspace build to production through Cloudflare Pages and configure clean routes:

- `/` serves `index.html`.
- `/world` serves `world.html` through Cloudflare Pages built-in extensionless HTML routing.
- `/thanks` serves `thanks.html` through Cloudflare Pages built-in extensionless HTML routing.
- Cloudflare deploys the generated `dist/` folder, not the workspace root.
- Cloudflare does not add `_redirects` rewrites from `/world` to `/world.html` or `/thanks` to `/thanks.html`, because those loop with Cloudflare's `.html` to extensionless redirect.
- Cloudflare applies the local `_headers` security header contract.

After deployment, rerun the production route gate in `LAUNCH_CHECKLIST.md` and update this audit.

## Cloudflare Deployment Input

Required operator input before production can be fixed:

```text
Cloudflare account/project:
Deployment method: Pages Git integration / Pages direct upload / approved workflow
Production domain: showcase-designs.com
Build command: node prepare-cloudflare-deploy.mjs
Output directory: dist
```

Production deploy is blocked until the Cloudflare account/project and deploy method are confirmed.

Automated command:

```bash
node verify-production.mjs
```

This command is expected to fail until production serves this workspace build.

Latest observed result from 2026-06-03 17:36:07 UTC:

```text
54 production checks failed for https://showcase-designs.com.
```

Notable failures include:

- `/` returns 200 but does not serve the current static page.
- `/?lite=1` returns 200 but does not serve the current static page.
- `/world`, `/world?lite=1`, `/world.js`, `/world.css`, `/world-data.js`, `/thanks`, `/favicon.svg`, `/og-image.png`, and station texture JPGs are missing.
- Runtime asset MIME checks fail because production returns 404 HTML instead of JavaScript, CSS, SVG, PNG, and JPEG assets.
- Production responses do not yet include the configured security headers across checked routes and assets.
- The missing-route page is still the older production 404, not this workspace's branded `404.html`.
