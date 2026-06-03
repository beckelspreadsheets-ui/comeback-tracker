# Requirements Trace

Objective: make the AnimatedShowcaseDesigns site polished and verified across the static marketing page and opt-in 3D gallery.

This trace maps each PRD functional requirement and launch gate to concrete local evidence or an explicit external blocker. It should be read with `COMPLETION_AUDIT.md`.

## Functional Requirements

| ID | Requirement | Evidence | Status |
| --- | --- | --- | --- |
| F-1.1 | Serve static marketing page at `/` | `index.html`, `serve-local.mjs`, `verify-production.mjs` local dry run | Passed locally; failing production |
| F-1.2 | Preserve static page functionality | `verify-world.mjs` checks static rendering, contact form contract, CDN-failure fallback, legal pages, and live links | Passed locally |
| F-1.3 | Add `Explore the studio ->` link | `index.html`, `v3-preview.html`, and verifier route checks | Passed locally |
| F-1.4 | Support `?scenic=1` | Runtime verifier checks scenic routing and reduced-motion precedence | Passed locally |
| F-1.5 | Support `?lite=1` | Runtime verifier checks static and world lite routes clear mode preference | Passed locally |
| F-1.6 | Refresh case-study hero/intro copy | `LAUNCH_CHECKLIST.md` requires approved case-study hero/intro copy or explicit decision to keep current copy | Not complete |
| F-1.7 | Preserve SEO metadata and schema | Verifier checks canonical URL, ProfessionalService JSON-LD, robots, sitemap, noindex pages, and social metadata | Passed locally |
| F-1.8 | Preserve static CWV performance | `LOCAL_BROWSER_AUDIT.md` has local Lighthouse evidence; production p75 CWV gate remains in `LAUNCH_CHECKLIST.md` | Not proven in production |
| F-2.1 | Create `/world` 3D gallery page | `world.html`, `serve-local.mjs`, local production verifier dry run | Passed locally; failing production |
| F-2.2 | Use WebGL 2.0 via Three.js | `world.js` WebGL2 gate and dynamic Three import; verifier checks runtime engine state | Passed locally |
| F-2.3 | Render stylized studio environment | `world.js` studio scene, rendered desktop/portrait screenshots, visual capture artifacts | Passed locally |
| F-2.4 | Use first-person POV camera | `world.js` camera setup, intro glide, and verifier checks rendered POV scene | Passed locally |
| F-2.5 | Render 5-6 station meshes | Operator removed Gustavo's Landscape on 2026-05-04; current approved launch set is four screenshot-backed stations and verifier checks count/fields | Passed locally under approved launch set |
| F-2.6 | Render phone-shaped screenshot displays | `world.js` phone meshes and station textures; verifier checks screenshot assets and rendered pixels | Passed locally |
| F-2.7 | Support subtle screenshot motion | Verifier checks bounded screenshot animation contract | Passed locally |
| F-2.8 | Add station hover/focus glow | `world.js` rim, halo, marker state; verifier checks glow contract | Passed locally |
| F-2.9 | Add LIVE / TEMPLATE badges | Station kind textures and labels; verifier checks station `kind` fields | Passed locally |
| F-2.10 | Open live client site | Verifier checks `window.open(liveUrl, "_blank", "noopener")`; outbound verifier passes all approved station URLs | Passed locally |
| F-2.11 | Add case-study link | Verifier checks static anchors and resolved case-study CTA routing | Passed locally |
| F-2.12 | Add camera glide | `world.js` eased 1.5s station glide; verifier checks source/runtime station selection | Passed locally |
| F-2.13 | Add `Fast view <-` link | `world.html` static links and runtime lite route checks | Passed locally |
| F-2.14 | Respect reduced motion | Verifier checks world reduced-motion redirect before scene use | Passed locally |
| F-2.15 | Add low-tier fallback | Verifier checks unsupported WebGL, low-tier fallback, and Try Anyway behavior | Passed locally |
| F-2.16 | Persist mode preference | Runtime verifier checks `localStorage.mode-preference` for scenic, world, lite, and reduced-motion paths | Passed locally |
| F-2.17 | Handle WebGL context loss | Runtime verifier simulates context loss and checks fallback UI | Passed locally |
| F-3.1 | Share brand variables | `index.html`, `world.css`, and rendered visual checks use the shared palette and typography | Passed locally |
| F-3.2 | Share navigation model | Static Studio links, world Fast view links, case-study CTA, and lite routes are verified | Passed locally |
| F-3.3 | Avoid SEO cannibalization | `/` canonical, `/world` noindex/canonical shell, sitemap excludes `/world` | Passed locally |
| F-3.4 | Keep content reachable via static page | Static case-study anchors and contact path are verified | Passed locally |
| F-3.5 | Add analytics events | Verifier checks static mode events and world station/fallback/context-loss events | Passed locally |

## Launch Gates

| Gate | Evidence | Status |
| --- | --- | --- |
| Static LCP p75 `<= 2.5s` | `LAUNCH_CHECKLIST.md` requires production p75 source/date/result | Not proven |
| Static INP p75 `<= 200ms` | `LAUNCH_CHECKLIST.md` requires production p75 source/date/result | Not proven |
| Static CLS p75 `<= 0.1` | `LAUNCH_CHECKLIST.md` requires production p75 source/date/result | Not proven |
| Static route loads without 3D payload | Verifier checks no Three.js payload in static HTML | Passed locally |
| Contact/conversion path works | Verifier checks FormSubmit contract and `/thanks` page | Passed locally; production route failing |
| SEO schema preserved | Verifier checks JSON-LD and canonical metadata | Passed locally |
| `/` remains canonical | Verifier checks home canonical and sitemap | Passed locally |
| Mobile FPS `>=30` for 90s | `DEVICE_QA.md` requires iOS Safari and Android Chrome reports | Not complete |
| Initial `/world` critical payload `<1MB` | Verifier checks world shell plus station texture budget | Passed locally |
| Visible draw calls `<=150-200` | Runtime verifier checks render calls; `DEVICE_QA.md` requires `render.calls <= 200` on devices | Passed locally; device reports pending |
| Reduced-motion redirect | Runtime verifier checks forced reduced-motion redirect | Passed locally |
| Low-tier fallback | Runtime verifier checks low-tier fallback and Try Anyway | Passed locally |
| WebGL context-loss handling | Runtime verifier simulates context loss | Passed locally |
| Live-site station clicks | Source and outbound verifiers check CTA behavior and URLs | Passed locally |
| Static fallback link | Verifier checks persistent static links and lite escape routes | Passed locally |
| No severe mobile thermal degradation | `DEVICE_QA.md` requires real-device thermal observations | Not complete |

## Current Blockers

1. Deploy the generated Cloudflare `dist/` package and rerun `node verify-production.mjs`.
2. Complete iOS Safari and Android Chrome device QA reports.
3. Record production Core Web Vitals p75 values.
4. Approve case-study hero/intro copy or explicitly keep current copy.
5. Record operator launch approval.
