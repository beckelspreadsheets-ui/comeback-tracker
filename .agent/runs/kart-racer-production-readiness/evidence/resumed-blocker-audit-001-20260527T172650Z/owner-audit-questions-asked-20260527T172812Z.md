# Owner Audit Questions Asked In Chat

Asked at: 2026-05-27T17:28:12Z

The user asked to answer the audit questions in chat. The following numbered questions were asked for owner/release/legal decisions and exceptions:

1. Approved visual target: what screenshot/capture/reference should the race match, and what is its source/license?
2. Visual priority: desktop-first, mobile-first, or equal?
3. Visual targets: kart size, camera framing, horizon, road visibility, object density, HUD placement, color/lighting notes?
4. V1 scope: kart-only, or keep hover/plane modes in scope?
5. V1 gameplay scope: are items required? Is audio required? Is progression/city integration required, or standalone race only?
6. Target devices/browsers: minimum desktop and mobile device/browser profiles?
7. Manual reviewers: who owns product/design review, manual QA, fresh-user review, accessibility review, and IP/legal review?
8. IP/legal: are current item names/silhouettes acceptable (`Guard Shell`, `Star Shield`, `Banana Magnet`, `Oil Slick`, `star` terms), or should any be renamed/removed?
9. IP/provenance: are current binary assets and reference-derived plaza data approved for production?
10. Production target: Cloudflare Pages project, production domain, preview branch/project policy?
11. Release owners: release owner, launch owner, rollback owner?
12. Deploy policy: clean worktree required, or can a dirty-worktree manual deploy be accepted?
13. Release gates: CI required, or owner-approved manual checklist acceptable?
14. Race disable policy: rollback only, or use `VITE_RACE_DISABLED`/rebuild/redeploy as a kill switch? Who can activate it?
15. API/data scope: are Cloudflare Functions, D1 sync/backups, Access JWT, FatSecret proxy, barcode scanner, and camera permissions in scope for this release?
16. API production proof: if any API/data items are in scope, what preview/prod URL, JWT/access method, D1 binding/migration proof, live FatSecret approval, and rollback compatibility evidence should be used?
17. Monitoring/support: monitoring provider, or explicit no-monitoring risk acceptance? Support contact/path? Post-launch monitoring window?
18. Privacy/telemetry: approved race metrics, log retention/redaction owner, and telemetry privacy posture?
19. Build/artifact policy: source maps, debug routes, test hooks, protected source-map upload, and standard production artifact requirements?
20. Performance/bundle/security: Web Vitals/Lighthouse targets or exception, bundle/asset budget or exception, production-only audit split accepted or full Vite/esbuild advisory upgrade/exception?

