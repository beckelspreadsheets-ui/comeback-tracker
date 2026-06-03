# Owner Decision Checklist

Created at: 2026-05-27T17:31:41Z

Use short answers. For any row, answer `Approved`, `Out of scope`, or `Exception until YYYY-MM-DD: ...`.

## A. Product / Visual Scope

- [ ] Visual target reference: screenshot/capture/link and source/license.
- [ ] Visual priority: desktop-first, mobile-first, or equal.
- [ ] Kart/camera targets: kart size, camera framing, horizon, road visibility.
- [ ] World/HUD targets: object density, HUD placement, color/lighting notes.
- [ ] V1 vehicle scope: kart-only, or keep hover/plane modes.
- [ ] V1 gameplay scope: items required?
- [ ] V1 audio scope: audio required?
- [ ] V1 progression scope: standalone race or city progression integration.

## B. Review / Legal

- [ ] Product/design reviewer.
- [ ] Manual QA tester.
- [ ] Fresh-user reviewer.
- [ ] Accessibility reviewer.
- [ ] IP/legal reviewer.
- [ ] Current item names approved or rename/remove: `Guard Shell`, `Star Shield`, `Banana Magnet`, `Oil Slick`, `star` terms.
- [ ] Current binary assets approved for production.
- [ ] Reference-derived plaza data approved for production.

## C. Release / Deployment

- [ ] Cloudflare Pages project.
- [ ] Production domain.
- [ ] Preview branch/project policy.
- [ ] Release owner.
- [ ] Launch owner.
- [ ] Rollback owner.
- [ ] Clean worktree required, or dirty manual deploy accepted.
- [ ] CI required, or owner-approved manual checklist accepted.
- [ ] Race disable policy: rollback only, or `VITE_RACE_DISABLED` rebuild/redeploy kill switch.
- [ ] Who can activate race disable/rollback.

## D. API / Data / Privacy

- [ ] Cloudflare Functions in scope or out of scope.
- [ ] D1 sync/backups in scope or out of scope.
- [ ] Access JWT in scope or out of scope.
- [ ] FatSecret proxy in scope or out of scope.
- [ ] Barcode scanner/camera in scope or out of scope.
- [ ] API proof source: preview/prod URL, JWT/access method, D1 binding/migration proof, FatSecret approval.
- [ ] Approved race metrics.
- [ ] Telemetry/log retention owner.
- [ ] Log redaction/privacy posture.

## E. Ops / Quality Gates

- [ ] Monitoring provider, or no-monitoring risk accepted.
- [ ] Support contact/path.
- [ ] Post-launch monitoring window.
- [ ] Source maps policy.
- [ ] Debug routes/test hooks policy.
- [ ] Protected source-map upload policy, if any.
- [ ] Web Vitals/Lighthouse target or exception.
- [ ] Bundle/asset budget target or exception.
- [ ] Accept production-only audit split, or require full Vite/esbuild advisory upgrade/exception.

