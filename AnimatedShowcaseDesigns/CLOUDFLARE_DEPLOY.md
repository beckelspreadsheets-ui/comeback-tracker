# Cloudflare Deploy

Use this when publishing `showcase-designs.com` through Cloudflare Pages.

## Build Settings

Required Cloudflare Pages settings:

```text
Framework preset: None / Static HTML
Build command: node prepare-cloudflare-deploy.mjs
Build output directory: dist
Production domain: showcase-designs.com
```

Do not deploy the workspace root directly. The root contains launch audits, verifier scripts, source screenshots, and local screenshot artifacts that should not be public. The deploy script creates an allowlisted `dist/` folder containing only runtime assets.

## Git Integration Path

Use these Cloudflare Pages fields when the project is connected to a repository:

```text
Framework preset: None / Static HTML
Build command: node prepare-cloudflare-deploy.mjs
Build output directory: dist
Root directory: this workspace, or the repo subdirectory that contains this workspace
Production branch: the branch connected to showcase-designs.com
```

## Direct Upload Path

Last verified upload package:

```text
deploy-artifacts/showcase-designs-dist-20260603-103616.zip
SHA256 5c49fe6fca877a1fb31d0f16730a2f038eb71c39194865fc767238f83802ed92
```

This retained package is the current launch-readiness artifact generated on 2026-06-03. It includes the trust-safe pricing copy, capped Growth scope, UTM/contact-form attribution capture, static conversion tracking hooks, and the acquisition-launch copy updates. It has not been verified on `showcase-designs.com` yet because production still serves the stale Vercel site.

Use this path when deploying manually with Wrangler:

```bash
node verify-world.mjs
node verify-photo-match.mjs
node verify-outbound.mjs
node prepare-cloudflare-deploy.mjs
npx wrangler pages deploy dist --project-name <cloudflare-pages-project> --branch <production-branch>
node verify-production.mjs
```

Required values:

```text
<cloudflare-pages-project>: the exact Cloudflare Pages project name
<production-branch>: the branch configured as production for that Pages project
```

Do not guess either value. Confirm both in Cloudflare before running the deploy command.

Latest confirmed preview direct-upload values:

```text
Cloudflare Pages project: showcase-designs-preview
Production branch: main
Earlier preview deployment: https://9db747ed.showcase-designs-preview.pages.dev
Previous hero-wall deployment: https://0cc4d1b9.showcase-designs-preview.pages.dev
Previous photo-match deployment: https://61e0e520.showcase-designs-preview.pages.dev
Previous hybrid-plate deployment: https://9bf74ca5.showcase-designs-preview.pages.dev
Previous photo-lock/stone-overlay deployment: https://b47e5e1b.showcase-designs-preview.pages.dev
Current render/camera tuning deployment: https://d6444b74.showcase-designs-preview.pages.dev
Stable preview: https://showcase-designs-preview.pages.dev
```

The stable preview URLs above are older than the 2026-06-03 launch-readiness package unless a new preview deployment is recorded here after this note.

Do not use the parent `../wrangler.toml` for this workspace. That file is for the separate `comeback-tracker` Pages project and is not evidence of the `showcase-designs.com` Cloudflare project.

## Required Runtime Files

The `dist/` output includes:

- HTML routes: `index.html`, `v3-preview.html`, `world.html`, `thanks.html`, `404.html`, `privacy.html`, `terms.html`
- 3D assets: `world.css`, `world.js`, `world-data.js`, `img/world/*.jpg` for the four approved launch stations, and `img/world/photo-match-room-plate.webp` for the approved presentation-mode hybrid plate
- Metadata assets: `favicon.svg`, `og-image.png`, `robots.txt`, `sitemap.xml`
- Cloudflare config: `_redirects`, `_headers`

## Route And Header Contracts

`_redirects` must be present in `dist/`, but it must not rewrite `/world` to `/world.html` or `/thanks` to `/thanks.html`. Cloudflare Pages serves those clean routes through built-in extensionless HTML routing; adding rewrites creates a redirect loop with Cloudflare's `.html` to extensionless redirect.

```text
# Cloudflare Pages serves /world from world.html and /thanks from thanks.html
# through its built-in extensionless HTML routing.
```

`_headers` must be present in `dist/` and apply these headers:

```text
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-Frame-Options: DENY
```

## Verification

Before deploy:

```bash
node verify-world.mjs
node verify-photo-match.mjs
node verify-outbound.mjs
node prepare-cloudflare-deploy.mjs
node serve-local.mjs --root dist
```

After deploy:

```bash
node verify-production.mjs
SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-photo-match.mjs
```

Production is not launch-ready until `node verify-production.mjs` passes for `https://showcase-designs.com`.
