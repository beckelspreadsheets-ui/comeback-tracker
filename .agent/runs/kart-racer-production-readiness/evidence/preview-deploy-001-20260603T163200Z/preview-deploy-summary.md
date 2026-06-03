# Preview Deploy 001 Summary

Captured: 2026-06-03

## Deployment

- Cloudflare Pages project: `showcase-designs-preview`
- Preview branch: `comebacktrackerkartgame`
- Canonical preview URL: `https://comebacktrackerkartgame.showcase-designs-preview.pages.dev`
- Deployment URL: `https://d1169ee7.showcase-designs-preview.pages.dev`
- Deployment ID: `d1169ee7-c653-4727-bed0-8dbac4d960f9`
- Wrangler source commit: `948f630`
- Build dashboard URL: `https://dash.cloudflare.com/8e8aa1cbf30faaf422ef2491d832b0b7/pages/view/showcase-designs-preview/d1169ee7-c653-4727-bed0-8dbac4d960f9`

## Commands

- `npm run build`
- `npx wrangler pages deploy dist --project-name=showcase-designs-preview --branch=comebacktrackerkartgame --commit-hash=948f6308e85aa3437ff5c08b852e33ac5f27ff22 --commit-message="Record release checklist remediation evidence" --commit-dirty=false`
- `DEPLOYED_HEADERS_SMOKE_URL=https://comebacktrackerkartgame.showcase-designs-preview.pages.dev DEPLOYED_HEADERS_SMOKE_TARGET=preview npm run test:headers:deployed`
- `RELEASE_SMOKE_URL=https://comebacktrackerkartgame.showcase-designs-preview.pages.dev RELEASE_SMOKE_TARGET=preview npm run test:release:smoke`
- `WEBGL_CONTEXT_SMOKE_URL=https://comebacktrackerkartgame.showcase-designs-preview.pages.dev WEBGL_CONTEXT_SMOKE_TARGET=preview WEBGL_CONTEXT_SMOKE_ARTIFACT_DIR=.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/webgl-context-preview npm run test:webgl`

## Result

- Deployment: pass.
- Deployed header smoke: pass; `_headers`/CSP/Permissions-Policy/cache headers match release policy.
- Release smoke: pass; app home, core tracker home/food/settings/home navigation, `/#race`, desktop keyboard acceleration, mobile Go touch acceleration, nonblank race canvases, manifest, service worker, and production playtest-hook rejection passed.
- WebGL context-loss smoke: pass; deployed `/#race` switched from WebGL to Canvas2D fallback, rendered a nonblank fallback canvas, and exited back home with `#race` cleared.
- API scope: Cloudflare Functions/D1 authenticated sync remains scoped out of immediate kart-racer readiness; deployed safe-status probe returned `/api/sync/me` 401 and FatSecret short-query proxy returned 200 with an empty food list.

## Evidence

- Wrangler deploy log: `wrangler-pages-deploy-preview.log`
- Wrangler deployment metadata: `wrangler-pages-deployment-list-preview.json`
- Header smoke summary: `deployed-headers-smoke-summary-preview.json`
- Release smoke summary: `release-smoke-summary-preview-after-console-policy-fix.json`
- Release smoke screenshots: `release-smoke-home-preview.png`, `release-smoke-race-desktop-preview.png`, `release-smoke-race-mobile-preview.png`
- WebGL context-loss summary: `webgl-context-preview/webgl-context-smoke-summary.json`
- WebGL fallback screenshot: `webgl-context-preview/webgl-context-loss-fallback.png`
