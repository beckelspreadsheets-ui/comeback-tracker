# Completion Audit

Objective: implement the Hyperrealistic Interactive Gallery PRD for `/world` while preserving the static marketing page and release gates.

Update on 2026-05-11: the stable preview was performant and functionally verified, but the owner identified that it still did not visually match the rightmost target photo closely enough. `WORLD_PHOTO_MATCH_PRD.md` is now the controlling visual-quality gate. A first photo-match pass has been implemented, deployed to the stable preview, and verified with `verify-photo-match.mjs`; it improves the reference composition and material cues, but it is not a 1:1 pixel replica of the generated reference.

Owner decision on 2026-05-11: option C is approved. The next visual implementation should use a hybrid/generated room-plate approach for closer 1:1 similarity. Approval applies to preview sharing only; production launch remains blocked until explicit approval.

Implementation update on 2026-05-11: an initial hybrid presentation layer is implemented with `img/world/photo-match-room-plate.webp`, `world.html#photoMatchPlate`, and presentation-mode CSS. It uses the right-reference room image as a lightweight WebP plate in `?presentation=1`, hides during inspection, and preserves the normal interactive Three.js room.

Preview update on 2026-05-18: presentation mode now treats the hybrid room plate as the primary visible layer and heavily de-emphasizes the live canvas underneath, removing the earlier double-exposure look in `verification/photo-match-desktop.png`, `verification/photo-match-mobile.png`, `verification/photo-match-production-desktop.png`, and `verification/photo-match-production-mobile.png`. This CSS-only refinement passed local and stable-preview `node verify-photo-match.mjs` after deployment.

Normal-mode update on 2026-05-18: `world.js` now mounts subtle stone-slab material overlays in the real Three.js scene through `addStoneSlabMaterialOverlays()`, using the existing showroom wall textures for the hero, side, and front walls. This makes walking mode less flat and closer to the target graphite slab showroom without restoring the old decorative linework.

Preview update on 2026-05-19: `world.js` now raises the seamless-mode DPR cap within the PRD mobile range, enables antialiasing except on low-tier devices, softens the hard cove strip, and widens/retunes the default portrait camera so normal walking mode shows more floor, bench, and room depth. This pass is deployed to the stable preview and immutable preview `https://d6444b74.showcase-designs-preview.pages.dev`.

## Success Criteria

| Requirement | Evidence | Status |
| --- | --- | --- |
| Photo-match owner review packet exists | `PHOTO_MATCH_REVIEW.md` lists the target, local captures, preview captures, current mismatch notes, the recorded option C approval, latest verification commands, and remaining release gates | Decision recorded; initial hybrid plate implemented |
| `/world` follows the rightmost hyperrealistic gallery reference direction | User approved superseding the old no-cluster rule on 2026-05-09; `world-data.js` places EvenPath, Felco, and Beckel on the main stone hero wall with Abel on a secondary wall; `world.js` adds `GALLERY_LAYOUT_VERSION = "right-reference-hero-wall-20260509"`, stronger wall-wash/cove/floor reflection lighting, visible glass wall/garden texture, brighter stone/floor/ceiling materials, subtle normal-mode stone-slab material overlays, presentation-mode UI hiding, a more centered leather bench, higher visual-resolution caps, softened cove-strip treatment, and a wider portrait default camera; `world.html`/`world.css` add a hybrid right-reference room plate for `?presentation=1`; the 2026-05-18 CSS pass removes the double-exposure presentation blend; `verification/photo-match-desktop.png` and `verification/photo-match-mobile.png` are the current local captures, and `verification/photo-match-production-desktop.png` plus `verification/photo-match-production-mobile.png` were refreshed from the 2026-05-19 stable preview deploy | Passed locally and on preview; owner visual review still required |
| Exhibit inspection is intentional, scrollable, and reversible | `world.html` adds `Inspect`, `Done`, `Up`, `Down`, fullscreen, and open-site controls; `world.js` uses `activeScreenStationId`, `glideCameraToInspection`, `scrollActiveScreenBy`, wheel/key handlers, and history/Escape exits; verifier-mode runtime probe activates a real station, scrolls its screen texture, exits inspection, and records `data-world-inspection-probe` | Passed locally |
| Four current exhibits remain available while supporting growth | `world-data.js` contains EvenPath, Felco, Abel, and Beckel only; the approved right-reference layout clusters three exhibits on the main hero wall and keeps the fourth on a secondary wall for expansion capacity | Passed under approved hero-wall override |
| No phone/device hardware or empty placeholders remain | Verifier checks no `notch`, `FUTURE_BAYS`, `createFutureGalleryBay`, or `createEmptyCanvasTexture`; frames are black metal artwork frames with website screenshots edge-to-edge | Passed locally |
| Collision boundaries cover room, exhibits, seating, and glass wall | `world.js` keeps perimeter clamping, `galleryColliders`, exhibit colliders, bench collider, and glass wall collider; runtime exposes `data-world-colliders` and `data-world-collision-probe`; verifier checks collider coverage and that the actual collision functions block collider centers, preserve a safe point, reject a blocked endpoint, and clamp out-of-room movement | Passed locally |
| Static page remains canonical and lightweight | `index.html` equals `v3-preview.html`; verifier checks no Three.js payload in static HTML, canonical home URL, and preserved ProfessionalService JSON-LD | Passed locally |
| Static page remains usable if animation CDNs fail | Verifier blocks `cdnjs`, `cdn.jsdelivr.net`, and `unpkg`; static hero content renders, critical UI is bound, and local fallback reveals hidden content | Passed locally |
| Static live-site links are new-tab safe | Verifier checks all four approved static live-site links use `target="_blank" rel="noopener noreferrer"` | Passed locally |
| Launch metadata has concrete assets | Verifier checks `favicon.svg`, `og-image.png`, `robots.txt`, `sitemap.xml`, Open Graph/Twitter image tags, and sitemap exclusion of noindexed `/world` | Passed locally |
| Production deploy config exists | Cloudflare Pages built-in extensionless HTML routing serves clean routes while `_headers` configures conservative security headers; `prepare-cloudflare-deploy.mjs` builds an allowlisted `dist/` package; optional `vercel.json` remains available as a fallback; deploy docs explicitly reject the parent `../wrangler.toml` because it belongs to `comeback-tracker` | Passed locally |
| Production security headers are configured | `_headers` defines conservative Cloudflare Pages headers, and both local and production verifiers check the expected header contract across checked routes and assets | Passed locally |
| Clean routes can be previewed locally | `serve-local.mjs` emulates `/world`, `/thanks`, branded 404, and conservative security headers; verifier checks the helper exists, is repo-only, and is documented | Passed locally |
| Production route verifier can be dry-run locally | `verify-production.mjs` supports `http://` and `https://` origins, including `/?lite=1`; README and launch checklist document `SHOWCASE_ORIGIN=http://127.0.0.1:8765 node verify-production.mjs` | Passed locally |
| Contact form contract is intact | Verifier checks FormSubmit action/method, hidden subject/captcha/template/next fields, required name/email/industry/package fields, privacy link, `thanks.html`, and `/thanks` rewrite; `node verify-outbound.mjs` passed 9 checks on 2026-06-03, including the FormSubmit endpoint | Passed locally; production route still failing |
| Missing routes have a branded fallback | `404.html` exists, is noindexed, and verifier checks desktop/portrait rendering plus production 404 source contract | Passed locally |
| Linked legal pages remain functional | Verifier checks `privacy.html` and `terms.html` metadata and rendered desktop/portrait screenshots | Passed locally |
| Static page links to the studio | Verifier checks static scenic routing, reduced-motion wins over scenic routing, local `/world` shell reachability, and runtime `mode-preference` set/clear behavior for scenic, lite, reduced-motion, and `/world` escape routes | Passed locally |
| Approved case-study hero/intro copy is accounted for | PRD F-1.6 requires approved copy; owner marked copy as changes requested on 2026-05-11 and requested 1:1 copy; exact source copy is still required before implementation | Not complete |
| PRD requirements are traceable to evidence | `REQUIREMENTS_TRACE.md` maps all F-1, F-2, F-3 requirements and launch gates to concrete evidence or explicit blockers; verifier enforces the trace | Passed locally |
| External launch inputs are packaged for operator handoff | `OPERATOR_INPUTS.md` lists exact required inputs, approval records, and follow-up verification commands; verifier enforces the handoff artifact | Passed locally |
| Four approved launch stations are available | `world-data.js` includes EvenPath, Felco, Abel, and Beckel; verifier checks station count, unique IDs, fields, screenshot files, and matching static anchors | Passed locally |
| 3D texture, payload, and draw-call budgets stay within PRD targets | Verifier checks each station JPG is mobile-sized and under 500KB, local `/world` shell plus station textures stay under the 1MB target, and runtime draw calls stay under the PRD budget | Passed locally |
| Unapproved/non-client projects are not included | Gustavo's Landscape is removed from the public static and 3D launch set; Saddlebrooke remains excluded without a screenshot | Passed locally |
| `/world` loads Three.js only on the opt-in route | Verifier checks dynamic Three import and absence of Three payload in `world.html` shell/static page | Passed locally |
| `/world` has fallback behavior | Verifier checks lite redirect, lite-mode preference clearing, reduced-motion redirect, unsupported WebGL fallback, runtime WebGL context-loss fallback, and low-tier Try Anyway fallback | Passed locally |
| `/world` has usable interactions | Verifier checks station controls render; source checks live CTA opens `_blank` with `noopener` and case-study CTA resolves static anchors; runtime inspection probe verifies activation, scroll, and exit in browser | Passed locally |
| `/world` preserves accessible navigation | Verifier checks skip link, screen-reader standard-view announcement, persistent static links, `aria-pressed` station state, and arrow/Home/End keyboard station navigation | Passed locally |
| `/world` motion stays bounded and purposeful | Verifier checks screenshot scroll, intro idle look, warmup rendering, and QA continuous rendering follow the PRD bounded-motion rules | Passed locally |
| Analytics hooks support post-launch measurement | Verifier checks static mode-routing events and `/world` mode, station, fallback, hover, and context-loss events route through `dataLayer` / `gtag` | Passed locally |
| `/world` portrait UI does not obstruct the scene | `world.html` includes an accessible panel toggle; verifier checks portrait world defaults to compact station controls, the mobile static-return control remains shrink-safe, and portrait camera frames the showroom wall | Passed locally |
| `/world` scene has stronger spatial polish | `world.js` now builds an approved right-reference hero wall with three framed exhibits, visible glass wall, garden silhouette, visible textured ceiling via `createCeilingPhotoTexture`, warmer cove/wall-wash lighting, stronger polished-floor reflection decals, leather bench texture/sheen, and presentation-mode UI hiding while staying inside draw-call budget | Passed locally |
| Live-site outbound CTAs are valid | `OUTBOUND_LINK_AUDIT.md` shows all approved launch station URLs pass; `node verify-outbound.mjs` passed 9 checks on 2026-06-03, including FormSubmit | Passed locally |
| Desktop and portrait scenes render nonblank 3D pixels | Verifier captures desktop and portrait screenshots and checks scene pixel brightness | Passed locally |
| QA mode supports real-device testing | `world.html?qa=1&try=1` renders a QA overlay; verifier checks QA overlay, Copy report button, `getQaReport()` API, and runtime render metrics in the report | Passed locally |
| Local browser audits are clean where expected | `LOCAL_BROWSER_AUDIT.md` records Lighthouse scores: static route 94/100/100/100 and 3D route 97/100/100 with expected noindex SEO reduction | Passed locally |
| Real-device FPS and thermal behavior meet launch threshold | `DEVICE_QA_QUICK_START.md` provides the short real-phone handoff; `DEVICE_QA.md` requires iOS Safari and Android Chrome reports with `minFps >= 30`, `render.calls <= 200`, and no severe thermal degradation after 90 seconds; `DEVICE_QA_RESULTS.md` plus `node verify-device-qa.mjs` now machine-check pasted reports | Not complete |
| Stable preview serves the last deployed hyperrealistic build | Deployed `dist/` to exact Pages project `showcase-designs-preview` on branch `main`; Cloudflare returned `https://0aa55ac2.showcase-designs-preview.pages.dev`; `SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-production.mjs` passed 63 checks, `SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-photo-match.mjs` passed 10 checks, `SHOWCASE_ORIGIN=https://0aa55ac2.showcase-designs-preview.pages.dev node verify-production.mjs` passed 63 checks, and `SHOWCASE_ORIGIN=https://0aa55ac2.showcase-designs-preview.pages.dev node verify-photo-match.mjs` passed 10 checks on the latest deploy. Direct checks confirmed that preview served the trust-safe stat copy plus `img/world/photo-match-room-plate.webp`, presentation-mode plate CSS with `#studioCanvas` opacity `0.08`, `presentationMode`, `createCeilingPhotoTexture`, `GALLERY_LAYOUT_VERSION`, `addStoneSlabMaterialOverlays`, the 2026-05-19 render/camera tuning, and the current bench/canvas CSS. | Latest preview passed; approved for preview sharing only |
| Production clean URLs are configured | `PRODUCTION_AUDIT.md` shows the 2026-06-03 production check still fails: `/world`, `/world?lite=1`, `/world.js`, `/world.css`, `/world-data.js`, `/thanks`, favicon, Open Graph image, and station textures return 404 on `showcase-designs.com`; `/` is still the older Vercel page; `node verify-production.mjs` reports 54 failed production checks; Cloudflare extensionless routing is documented locally | Failing production |
| Cloudflare deployment path is confirmed | `npx wrangler pages project list` showed exact Pages project `showcase-designs-preview`; `npx wrangler pages deployment list --project-name showcase-designs-preview` showed production branch `main`; direct upload to `dist/` completed successfully | Passed for preview |
| Core Web Vitals meet PRD thresholds | `LAUNCH_CHECKLIST.md` defines the p75 LCP, INP, and CLS gate; owner confirmed this evidence is required before launch | Not proven locally |
| Operator launch approval is obtained | Owner approved preview sharing only on 2026-05-11; production launch is not approved until explicitly updated | Not complete |

## Local Verification Command

Run:

```bash
node verify-world.mjs
```

The verifier covers static integrity, route behavior, fallbacks, station contracts, CTA safety, QA mode, runtime draw-call bounds, desktop/portrait rendered pixels, and the presence/documentation/syntax of the real-device QA report validator.

Latest observed result after the 2026-05-19 preview deployment:

```text
node verify-photo-match.mjs
10 photo-match checks passed.

node verify-world.mjs
360 checks passed.

SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-photo-match.mjs
10 photo-match checks passed.

SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-production.mjs
63 production checks passed.

SHOWCASE_ORIGIN=https://d6444b74.showcase-designs-preview.pages.dev node verify-production.mjs
63 production checks passed.
```

## Remaining Inputs

The active goal should not be marked complete until these external results exist. `OPERATOR_INPUTS.md` lists the exact input format for each item:

1. Completed `DEVICE_QA_RESULTS.md` report for iOS Safari on a real iPhone, validated by `node verify-device-qa.mjs`.
2. Completed `DEVICE_QA_RESULTS.md` report for Chrome on a real Android phone, validated by `node verify-device-qa.mjs`.
3. Owner visual approval of the initial hybrid room-plate result, or requested refinements.
4. Exact source copy for the requested 1:1 copy match, followed by copy implementation and verification.
5. Deployment fix for the failing production routes documented in `PRODUCTION_AUDIT.md`, deferred until the owner approves production.
6. Production Core Web Vitals p75 results meet PRD thresholds.
7. Search Console, Bing, analytics, and Google Business Profile launch evidence from `SEARCH_LOCAL_SEO_LAUNCH_SETUP.md`.
8. Operator approval for production launch.

If either mobile device report fails, tune the scene or fallback policy before retesting.

## Hyperrealistic PRD Checklist

| PRD item | Concrete evidence inspected | Status |
| --- | --- | --- |
| Reference assets and primary route | `img/world/hyperrealistic-gallery-target-right.png`, `img/world/hyperrealistic-gallery-target.png`, and `/world` exist; stable preview is `https://showcase-designs-preview.pages.dev/world` | Passed |
| Target outcome visual direction | Approved hero-wall layout, glass wall, main graphite exhibit wall, three visible framed works, more centered leather bench, visible textured ceiling, warm cove/wall-wash lighting, polished floor reflection decals, normal-mode stone slab overlays, softened cove hardware, portrait camera retune, presentation-mode UI hiding, and an initial right-reference room plate are implemented; the current local and preview `verification/photo-match-*.png` captures use the 2026-05-18 photo-locked presentation plate plus the 2026-05-19 renderer/camera tuning | Passed locally and on preview; owner visual review still required |
| Non-negotiables: four exhibits only | `world-data.js` has EvenPath Homes, Felco Vending, Abel M. Fitness, and Beckel Spreadsheets only; verifier enforces count and station fields | Passed |
| Non-negotiables: distributed exhibits | Superseded by user approval on 2026-05-09 because the rightmost reference requires a hero-wall cluster; current layout keeps three exhibits on the main wall and one on a secondary wall for growth | Superseded and implemented |
| Non-negotiables: no placeholders or phone hardware | Verifier checks no future bays, empty canvas textures, generated plate, or `notch`; latest visual patch removes decorative wall overlay and thins frame hardware | Passed |
| Non-negotiables: screenshots edge-to-edge | Station screenshot plane fills the framed exhibit surface; inspection scroll manipulates the same in-scene texture | Passed |
| Non-negotiables: preserve `/` static site | `index.html` equals `v3-preview.html`; verifier checks no Three payload on `/` | Passed |
| Materials 3.1 | `createWallTexture`, `createFloorTexture`, `createFloorReflectionTexture`, `createLeatherTexture`, `createArchitecturalGlassTexture`, and black metal materials are used in `world.js` | Passed |
| Lighting 3.2 | Cove strips, hero-wall wash planes, track fixtures, contact-shadow planes, glass-wall fill, and stronger floor reflection decals are implemented; mobile still uses fake/baked lighting and no mobile postprocessing | Passed locally |
| Composition 3.3 | Default camera uses human eye height, a wider architectural lens, left glass wall, main hero wall, bench, ceiling cove, and floor reflections in view | Passed locally |
| G-1 first-person walkable room | WASD/arrow handlers, pointer look, mobile move pad, and Playwright/mobile emulation walking path exist; verifier checks movement controls | Passed locally |
| G-2 collision boundaries | Room clamps, exhibit colliders, bench collider, glass wall collider, `PLAYER_RADIUS`, runtime collider count, and runtime collision probe are present; verifier checks collider coverage and actual collision function behavior | Passed locally, physical collision should still be included in real-device walkthrough |
| G-3 exhibit click interaction | Raycast hit plane and `activateStationInteraction` open inspection mode instead of direct navigation; inspect hint is present; runtime inspection probe confirms activation opens viewer state | Passed locally |
| G-4 minimal exhibit scroll | Wheel/key/touch/control scrolling call `scrollActiveScreenBy` / `scrollStationPreview`; `Up` and `Down` controls are present; runtime inspection probe confirms station texture offset changes during scroll | Passed locally |
| G-5 live-site action | `openLiveSite` opens `_blank` with `noopener,noreferrer`; outbound verifier checks all four live URLs | Passed |
| G-6 fullscreen-friendly POV | Topbar fullscreen button and inspection fullscreen action call browser fullscreen APIs | Passed locally |
| G-7 mobile walking | Coarse-pointer CSS shows a left thumb move pad; mobile emulation shows controls visible and render metrics under budget | Partially passed; real iOS/Android report still required |
| G-8 return/escape controls | `Done`, Escape, and back-button popstate clear inspection mode without reload; runtime inspection probe confirms programmatic exit clears active inspection state and hides the viewer | Passed locally |
| G-9 station selection fallback | Four station chips remain in compact/minimized panel with keyboard navigation | Passed locally |
| G-10 low-motion fallback | Lite route, reduced-motion redirect, unsupported WebGL fallback, context-loss fallback, and Try Anyway path are verified | Passed locally |
| Interaction model 5.1 | Horizontal movement keeps camera at fixed human-scaled height, uses 2D bounds/colliders, and renders on demand while moving/looking/interacting | Passed locally |
| Interaction model 5.2 | Nearby exhibit hint and restrained frame/halo opacity update are implemented without bright outlines | Passed locally |
| Interaction model 5.3 | Inspection locks camera toward a comfortable viewing distance, keeps room context, scrolls selected texture, offers Open site, and exits by Done/Escape/back | Passed locally |
| Rendering strategy 6.1 | Static Three setup remains; quality modes, demand rendering, mobile DPR cap, fake lighting/shadow planes, optional cinematic mode, and no mobile postprocessing are present | Passed locally |
| Scene upgrade order 6.2 | Wall overlay linework is no longer rendered; floor, frames, lights, seating, glass wall, camera/fullscreen, and collisions are implemented | Passed locally |
| File targets 6.3 | `world.js`, `world.css`, `world.html`, `world-data.js`, `verify-world.mjs`, `verify-photo-match.mjs`, and `img/world/*` all contain the expected implementation/support assets | Passed |
| Performance requirements 7 | Verifier confirms draw calls, triangles, textures, payload, demand rendering, and local/preview route health; mobile emulation reports low draw calls/triangles | Partially passed; real-device sustained FPS/thermal floor remains unproven |
| Quality bar 8 | `verify-world.mjs` asserts the approved hero-wall layout, lighting/reflection/glass hooks, presentation-mode hooks, photo-match verifier presence, minimized QA mode, hybrid plate hooks, and nonblank desktop/portrait scene pixels; `verify-photo-match.mjs` asserts desktop/mobile screenshot-region gates; `verification/photo-match-desktop.png` provides the latest local visual screenshot | Passed locally; owner review still required |
| Verification plan 9 | `node verify-photo-match.mjs` passed 10 checks after the 2026-05-19 renderer/camera tuning; `node verify-world.mjs` passed 400 checks on 2026-06-03; stable preview `verify-production` passed 63 checks on the latest preview deploy; stable preview `verify-photo-match` passed 10 checks on the latest preview deploy; immutable preview `verify-production` and `verify-photo-match` passed for `https://0aa55ac2.showcase-designs-preview.pages.dev`; `node verify-outbound.mjs` passed 9 checks on 2026-06-03; production `verify-production` failed 54 checks on 2026-06-03 at 20:30 UTC | Passed except real-device browser reports, source-copy approval, Core Web Vitals, Search Console/Bing/analytics/GBP launch evidence, and production launch approval |
| Release criteria 10 | Local verifier, preview verifier, outbound verifier, no notch/placeholders, inspect/scroll, collision implementation, and visual photo-match gate are satisfied | Not complete because owner visual approval, real-device smoothness reports, source-copy approval, Core Web Vitals, Search Console/Bing/analytics/GBP launch evidence, and production-domain deployment/approval are missing |
| Explicit non-goals 11 | No React/R3F migration, multiplayer, avatars, minimaps, CMS, extra exhibits, raytracing, or mobile postprocessing were added | Passed |
