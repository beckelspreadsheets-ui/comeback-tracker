# Owner Decision Intake 004

Captured: 2026-06-01T19:15:42Z

## Owner Answers

18. Cloudflare target: use the best available preview branch under an owner-controlled Cloudflare account, with `showcase-designs.com` or `evenpath.com` acceptable. Exact Cloudflare Pages project, branch, deployment ID, preview URL, and production URL remain pending until branch cleanup/deploy setup.
19. Release gate policy: agent chooses the best production gate. Selected gate is clean release branch/worktree plus passing CI-equivalent local release gate, owner manual checklist sign-off, preview URL smoke, production URL smoke, deployed header smoke, rollback proof, and monitoring/support status before R3.
20. Web Vitals/Lighthouse policy: agent chooses a conservative baseline. Selected local baseline is home FCP <= 2000ms, home LCP <= 2500ms, home CLS <= 0.1, home TBT proxy <= 300ms, race FCP <= 2000ms, race LCP <= 2500ms, race CLS <= 0.1, race WebGL startup TBT proxy <= 2500ms, and race max long task <= 1000ms. Deployed preview/production evidence must still be recorded.
21. Bundle/asset budget policy: agent chooses a reasonable kart-racer baseline. Selected V1 budget is total built artifact <= 8.5 MiB raw and <= 4600 KiB gzip, JavaScript <= 5.25 MiB raw and <= 1400 KiB gzip, images <= 3.25 MiB raw, largest file <= 3.75 MiB raw, and largest JavaScript file <= 900 KiB gzip.
22. Dependency audit policy: upgrade dev/build tooling now to production-ready state. Implemented by upgrading Vite, `@vitejs/plugin-react`, `vite-plugin-pwa`, and `workbox-window` so both production-only and full `npm audit` pass with zero reported vulnerabilities.

## Agent Decisions From Delegated Items

- Use `showcase-designs.com` as the preferred release domain unless branch cleanup/deploy setup shows `evenpath.com` is operationally safer.
- Do not accept dirty-worktree RC evidence for production. Production deploy remains blocked until a clean branch/worktree is prepared and the release gate is re-run.
- Treat local Web Vitals/Lighthouse and bundle-budget passes as R2 readiness evidence only. R3 still requires deployed preview and production smoke artifacts with URLs and deployment IDs.
- Keep Cloudflare Functions, D1 sync, FatSecret proxy, barcode scanner, and camera permissions scoped out of immediate kart-racer release until the post-readiness follow-up supplies API smoke inputs.

## Evidence Produced In This Intake

- `npm run build` after Vite 8 upgrade: pending final copied log in this directory.
- `npm audit --json`: pending final copied log in this directory.
- `npm run test:security:prod`: pending final copied log in this directory.
- `npm run test:bundle`: pending final copied log in this directory.
- `npm run test:lab`: pending final copied log in this directory.
- Release-decision and production-gate audits: pending after docs sync.
