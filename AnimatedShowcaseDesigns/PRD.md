# Showcase Designs v3 - Animated 3D Counterpart

Current hyperrealistic gallery rebuild target: see `HYPERREALISTIC_GALLERY_PRD.md`.

| Field | Details |
| --- | --- |
| Product | Showcase Designs v3 - Static Marketing Site + 3D Studio Gallery |
| Author | Andrew Ferguson + planning agent |
| Date | 2026-05-03 |
| Status | Draft, pre-implementation |
| Static base repo | https://github.com/beckelspreadsheets-ui/showcase-v3-preview |
| Current preview | https://system.showcase-designs.com/v3-preview.html |
| Production domain | https://showcase-designs.com |
| Primary launch route | / |
| 3D launch route | /world |

## 1. Executive Summary

Showcase Designs v3 will ship as a dual-mode marketing experience on one domain.

The existing static page remains the primary SEO, trust-building, and conversion path for home-service SMBs. A new opt-in 3D experience, `/world`, will sit alongside it as a memorable craft signal for designers, referral traffic, aspirational clients, and social visitors.

The 3D experience is a first-person studio gallery where client websites appear as "living screenshot" stations: phone-shaped displays mounted in a stylized Showcase Designs environment. Visitors can inspect each station, see a subtle animated mobile-site preview, open the live client site in a new tab, or jump to the corresponding static case-study section.

The core product decision is restraint: do not replace the high-performing static marketing page with a heavy 3D experience. Instead, preserve the static site as the canonical conversion funnel and offer the 3D gallery as an optional layer for visitors who will value it.

## 2. Product Strategy

### 2.1 Primary Product Bet

Showcase Designs serves two audiences whose needs conflict:

| Audience | Need | Risk if mishandled |
| --- | --- | --- |
| SMB owner-operator | Fast, credible, low-friction proof of competence | Heavy 3D may feel confusing, slow, or irrelevant |
| Design-curious visitor | Memorability, taste, craft, novelty | Conventional static site may feel too ordinary |
| Aspirational client / hiring manager | Credibility plus creative differentiation | Needs both trust and signal |

The product bet is that dual-mode beats monolithic 3D.

The static page should win on speed, clarity, SEO, and conversion. The 3D page should win on memorability, portfolio differentiation, and shareability.

### 2.2 Product Principles

1. Static first. The static page is the canonical experience and must not regress.
2. 3D is opt-in. No visitor should be forced into WebGL to understand the business.
3. Respect the device. Low-powered devices, reduced-motion users, and assistive technology users must get the fast static path.
4. Craft without gimmick. The 3D experience should feel premium, restrained, and brand-matched.
5. No build-system creep. The implementation should match the current static architecture unless there is a strong reason to change.

## 3. Background & Context

Showcase Designs is a small design and development studio building websites and local SEO systems for local businesses and service companies.

Current known active clients:

- Saddlebrooke Strength
- Felco Vending
- Beckel Spreadsheets

The current marketing page is a static HTML site hosted at:

https://system.showcase-designs.com/v3-preview.html

The repo was created on 2026-05-03 to host this work:

beckelspreadsheets-ui/showcase-v3-preview

The current static page already includes:

- Brand typography: Prata and Manrope
- Palette: dark, warm-white, cream, gold
- GSAP + ScrollTrigger via CDN
- Lenis via CDN
- Phosphor Icons
- SplitType
- No build step
- Static HTML/CSS/JS architecture
- Hosting on Beckel VPS via Cloudflare Tunnel -> Nginx
- Five existing mobile screenshots in `img/`

The 3D counterpart should extend this foundation, not replace it.

## 4. Problem Statement

The Showcase Designs site needs to convert practical SMB buyers while also signaling taste, creativity, and technical craft to higher-context audiences.

A purely static site is strong for SEO and SMB conversion but may undersell the studio's creative ambition. A full 3D portfolio may be memorable but risks hurting performance, accessibility, SEO, and SMB trust.

The product problem is:

How do we add a memorable 3D craft layer without compromising the fast, clear, SEO-friendly static conversion path?

## 5. Goals & Non-Goals

### 5.1 Goals

| Goal | Description |
| --- | --- |
| G1 - Preserve static conversion path | `/` remains the main marketing, SEO, and lead-generation page. |
| G2 - Add opt-in 3D gallery | `/world` provides a first-person studio gallery of client website stations. |
| G3 - Maintain Core Web Vitals | Static page must continue to meet p75 CWV targets. |
| G4 - Keep 3D performant on mobile | `/world` must sustain usable frame rates on mid-tier mobile devices. |
| G5 - Respect reduced motion and low-tier devices | Reduced-motion and unsupported-device users must be routed to static or fallback paths. |
| G6 - Drive portfolio exploration | Visitors should be able to open live client sites and case-study anchors from stations. |
| G7 - Support social discovery | The 3D experience should be shareable and memorable without becoming the SEO canonical page. |

### 5.2 Non-Goals for v3.0

The following are explicitly out of scope for the v3.0 launch:

- Avatar character
- Free-roam sandbox mode
- WebGPU support
- React, R3F, Next.js, or Sanity migration
- Custom CMS
- Live iframe embeds inside 3D
- Per-station mini-games or bespoke interactions
- Full sound-design system
- Replacing the static page
- Automated screenshot capture
- Automated GitHub Actions deployment
- Cinematic video fallback
- 2D parallax fallback tier

## 6. Target Users & Scenarios

### 6.1 Primary Persona - The Contractor

Profile:
A home-service SMB owner, contractor, or operator searching Google for a web designer or local SEO help.

Context:
Usually mobile, low patience, likely comparing vendors, wants credibility quickly.

Desired flow:
Lands on `/`, sees strong proof, understands services, trusts the business, and converts through the contact path.

3D expectation:
May never enter `/world`. That is acceptable and expected.

Success condition:
The static page loads quickly, feels credible, and does not require novelty to convert.

### 6.2 Secondary Persona - The Designer

Profile:
A designer, agency operator, founder, developer, or social visitor arriving from Twitter/X, referral, or direct link.

Context:
More likely to reward craft, novelty, and visual storytelling.

Desired flow:
Clicks "Explore the studio ->" or lands via `/world`, explores the gallery, opens client sites, and eventually finds Andrew's contact information.

Success condition:
The visitor remembers Showcase Designs as unusually polished for a small studio.

### 6.3 Tertiary Persona - The Aspirational Client / Hiring Manager

Profile:
A higher-budget client, partner, or hiring manager evaluating both business credibility and design taste.

Context:
May spend time in both modes.

Desired flow:
Uses static page for credibility and `/world` for taste validation.

Success condition:
The combination of restraint and creativity increases confidence.

## 7. Product Scope

### 7.1 In Scope

The v3.0 launch includes:

- Static page served at `/`
- New 3D gallery served at `/world`
- Clean toggle between static and 3D modes
- Query-param routing for scenic and lite modes
- Local storage mode preference
- Reduced-motion routing
- Low-tier device fallback
- 5-6 client/project stations
- Phone-shaped screenshot planes
- Subtle animated station previews
- Hover/focus glow states
- LIVE / TEMPLATE badges
- Live-site click-throughs
- Case-study anchor links
- Shared brand styling between modes
- Basic analytics instrumentation
- Manual deploy to existing VPS

### 7.2 Out of Scope

See section 5.2 and section 18.

## 8. Information Architecture & Routes

### 8.1 Required Routes

| Route | Purpose | Indexing intent |
| --- | --- | --- |
| `/` | Static marketing and conversion page | Primary indexed canonical |
| `/world` | 3D studio gallery | Secondary, not SEO-primary |
| `/?scenic=1` | Shortcut into 3D mode | Redirects to `/world` unless blocked |
| `/?lite=1` | Force static mode | Stays on `/` and clears scenic preference |
| `/world?lite=1` | Escape hatch from 3D | Redirects to `/` and clears scenic preference |

### 8.2 Route Behavior

#### `/`

The static page should:

- Serve the existing v3 marketing page.
- Add a visible but non-dominant "Explore the studio ->" link.
- Preserve the primary conversion path.
- Preserve existing SEO metadata and JSON-LD.
- Redirect to `/world` only when `?scenic=1` is present and the visitor is eligible.
- Ignore or clear scenic preference when `?lite=1` is present.

#### `/world`

The 3D page should:

- Load the first-person studio gallery.
- Provide a persistent "Fast view <-" link back to `/`.
- Redirect reduced-motion users to `/`.
- Show fallback UI for unsupported or low-tier devices.
- Allow click-through to live client sites.
- Allow secondary navigation to static case-study anchors.

### 8.3 Recommended File Mapping

```text
showcase-v3-preview/
├── index.html                 # renamed from v3-preview.html
├── world.html                 # 3D gallery page
├── world.css                  # 3D page styles
├── world.js                   # Three.js scene, camera, interactions
├── world-data.js              # Station data
├── privacy.html
├── terms.html
├── img/
│   ├── saddlebrooke-mobile.jpg
│   ├── felco-mobile.jpg
│   ├── beckel-mobile.jpg
│   └── ...
└── README.md
```

### 8.4 Clean URL Recommendation

Use Nginx rewrites so production visitors see clean routes:

`/` -> `index.html`

`/world` -> `world.html`

The `.html` routes may continue to work internally, but clean URLs should be the public interface.

## 9. User Experience Requirements

### 9.1 Static Experience

The static page remains the fast, accessible, SEO-forward marketing page.

Required changes:

- Rename or serve `v3-preview.html` as `index.html`.
- Add "Explore the studio ->" to the nav.
- Add query-param shim for `?scenic=1`.
- Add query-param shim for `?lite=1`.
- Refresh case-study hero/intro copy after operator approval.
- Preserve existing body content unless explicitly revised.
- Preserve existing contact and conversion paths.

### 9.2 3D Experience

The 3D experience is a stylized first-person studio environment.

Core experience:

- Visitor lands at a fixed first-person camera position.
- Camera height approximates human eye level at ~1.6m.
- No avatar is rendered in v3.0.
- Client stations are arranged along the studio walls.
- Each station appears as a phone-shaped display with a mobile screenshot.
- Stations include:
  - Project/client name
  - LIVE or TEMPLATE badge
  - Short description
  - Primary live-site action
  - Secondary case-study action
- Hover or focus creates a premium glow/rim-light effect.
- Clicking a station triggers a short camera glide and opens the live site in a new tab.

### 9.3 Motion Rules

Motion should be subtle, purposeful, and interruptible.

| Motion | Requirement |
| --- | --- |
| Camera glide | Approximately 1.5s, eased, only on explicit station interaction |
| Screenshot scroll | Subtle; active only while station is focused, hovered, selected, or during brief attention moments |
| Idle animation | Minimal; must not require continuous render loop indefinitely |
| Reduced motion | Redirect to `/` before initializing 3D |

Important implementation constraint:

On-demand rendering and perpetual auto-scroll conflict. Therefore, station screenshot animation must not force continuous rendering forever. Continuous rendering is allowed only during active interaction, camera transitions, short intro moments, or explicitly bounded animation windows.

## 10. Functional Requirements

### 10.1 Static Page Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| F-1.1 | Serve the static marketing page at `/`. | P0 | Visiting showcase-designs.com/ loads the v3 static page. |
| F-1.2 | Preserve current static page functionality. | P0 | Existing layout, animations, contact links, and content remain functional. |
| F-1.3 | Add "Explore the studio ->" link. | P0 | Link is visible in nav or persistent header and routes to `/world`. |
| F-1.4 | Support `?scenic=1`. | P1 | Eligible visitors landing on `/?scenic=1` are routed to `/world`. |
| F-1.5 | Support `?lite=1`. | P0 | Visitors landing on `/?lite=1` remain on `/`; scenic preference is cleared. |
| F-1.6 | Refresh case-study hero/intro copy. | P2 | Approved copy is included without disrupting body sections. |
| F-1.7 | Preserve SEO metadata and schema. | P0 | Existing JSON-LD and canonical SEO structure remain intact. |
| F-1.8 | Preserve static CWV performance. | P0 | Static `/` meets launch performance gates. |

### 10.2 3D Gallery Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| F-2.1 | Create `/world` 3D gallery page. | P0 | Visiting `/world` loads `world.html`. |
| F-2.2 | Use WebGL 2.0 via Three.js. | P0 | Scene initializes successfully on supported browsers. |
| F-2.3 | Render stylized studio environment. | P0 | Floor, walls, ceiling, lighting, and brand-matched atmosphere are visible. |
| F-2.4 | Use first-person POV camera. | P0 | Camera is positioned near 1.6m eye height; no avatar appears. |
| F-2.5 | Render 5-6 station meshes. | P0 | Each launch station appears at a predetermined wall position. |
| F-2.6 | Render phone-shaped screenshot displays. | P0 | Each station displays a mobile screenshot texture. |
| F-2.7 | Support subtle screenshot motion. | P1 | Screenshot scrolls only during bounded active states. |
| F-2.8 | Add station hover/focus glow. | P1 | Hovering or focusing a station creates visible glow/rim state. |
| F-2.9 | Add LIVE / TEMPLATE badges. | P1 | Each station displays the correct project type. |
| F-2.10 | Open live client site. | P0 | Primary station action calls `window.open(liveUrl, '_blank', 'noopener')`. |
| F-2.11 | Add case-study link. | P1 | Secondary action links to the relevant static page anchor. |
| F-2.12 | Add camera glide. | P1 | Selecting a station triggers an eased camera move of about 1.5s. |
| F-2.13 | Add "Fast view <-" link. | P0 | Persistent link returns visitor to `/`. |
| F-2.14 | Respect reduced motion. | P0 | `prefers-reduced-motion: reduce` redirects to `/` before scene initialization. |
| F-2.15 | Add low-tier fallback. | P0 | Unsupported or low-tier devices see a static fallback with CTA to `/`. |
| F-2.16 | Persist mode preference. | P1 | `localStorage.mode-preference` stores static or world. |
| F-2.17 | Handle WebGL context loss. | P1 | Context-loss event shows fallback/recovery UI instead of a broken canvas. |

### 10.3 Cross-Mode Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| F-3.1 | Share brand variables. | P0 | Both modes use the same typography, palette, and visual language. |
| F-3.2 | Share navigation model. | P1 | Visitors can move between `/` and `/world` without confusion. |
| F-3.3 | Avoid SEO cannibalization. | P0 | `/` remains the canonical indexed marketing page. |
| F-3.4 | Keep content reachable via static page. | P0 | All essential case-study and conversion content exists on `/`. |
| F-3.5 | Add analytics events. | P1 | Mode and station interactions can be measured post-launch. |

## 11. Data Model

Station data should live in `world-data.js`.

No CMS is required for v3.0. The operator updates station content by editing this file and pushing changes.

```js
export const stations = [
  {
    id: 'saddlebrooke',
    displayName: 'Saddlebrooke Strength',
    kind: 'live',
    liveUrl: 'https://saddlebrookestrength.com',
    caseStudyAnchor: '/#case-study-saddlebrooke',
    screenshotUrl: '/img/saddlebrooke-mobile.jpg',
    description: 'Personal training studio in Tucson - full-stack rebuild',
    position: { x: -2, y: 1.6, z: -3 },
    rotation: { x: 0, y: 0, z: 0 }
  }
];
```

### 11.1 Required Station Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| id | string | Yes | Stable slug used for analytics and DOM hooks. |
| displayName | string | Yes | Human-readable project/client name. |
| kind | `'live' \| 'template'` | Yes | Determines badge label. |
| liveUrl | string | Yes | External URL opened by primary station action. |
| caseStudyAnchor | string | Yes | Internal static-page anchor. |
| screenshotUrl | string | Yes | Optimized mobile screenshot texture. |
| description | string | Yes | Short project description. |
| position | object | Yes | Three.js world position. |
| rotation | object | Yes | Three.js world rotation. |

### 11.2 Launch Station Candidates

Final launch list requires operator confirmation.

Recommended initial stations:

1. Saddlebrooke Strength
2. Felco Vending
3. Beckel Spreadsheets
4. Showcase Designs internal/template example
5. One additional approved screenshot from existing `img/`
6. Optional sixth station if performance remains within budget

## 12. Visual & Brand Requirements

The 3D gallery should feel like the spatial counterpart of the static brand.

### 12.1 Brand Tokens

Use the static page's CSS variables as the source of truth:

```css
--black: #0a0a0a;
--warm-white: #f5f0e8;
--cream: #ece6d9;
--gold: #c9a227;
--gold-light: #dbb94e;
--text: #e8e4dc;
--text-dim: #8a8578;
```

### 12.2 Typography

| Use | Font |
| --- | --- |
| Display headings | Prata |
| UI, nav, body, labels | Manrope |

### 12.3 3D Art Direction

The gallery should be:

- Dark, warm, editorial, and restrained
- More "premium studio" than "game level"
- Minimal enough to avoid visual clutter
- Built around client work as the hero
- Branded through lighting, materials, typography, and composition

Avoid:

- Neon arcade look
- Overly playful game mechanics
- Excessive particles
- Heavy bloom/postprocessing on mobile
- Complex environmental geometry
- Anything that competes with the client website stations

## 13. Technical Approach

### 13.1 Stack

Use the existing static architecture.

| Layer | Choice |
| --- | --- |
| 3D rendering | Three.js via CDN, latest stable r160+ |
| Animation | GSAP 3.12.5 |
| Static scroll | Existing GSAP + ScrollTrigger + Lenis |
| Icons | Existing Phosphor Icons |
| Typography | Google Fonts: Prata + Manrope |
| Framework | None |
| Build step | None |
| CMS | None |
| Deployment | Manual rsync to Beckel VPS for v3.0 |

### 13.2 Explicit Technical Decision

Use vanilla Three.js, not React Three Fiber.

Rationale:

- Current repo has no React.
- Current repo has no build step.
- Existing page is static HTML/CSS/JS.
- Vanilla Three.js is sufficient for a small controlled scene.
- Keeping the stack flat reduces launch complexity.

A future R3F migration may be considered only if the scene grows beyond v3.0 scope.

## 14. Performance Requirements

### 14.1 Static Page Performance Gates

The static page is the business-critical path.

| Metric | Requirement |
| --- | --- |
| LCP, p75 | <= 2.5s |
| INP, p75 | <= 200ms |
| CLS, p75 | <= 0.1 |
| 4G TTI regression | None introduced by `/world` work |
| Added static payload from 3D work | Near-zero unless visitor opts into `/world` |

No Three.js payload should load on `/`.

### 14.2 3D Page Performance Gates

| Metric | Requirement |
| --- | --- |
| Initial critical payload for `/world` | < 1MB target |
| Mobile FPS floor | >= 30fps sustained for 90s |
| Mobile FPS target | 45fps+ on iPhone 12 / Pixel 6a / Galaxy A54 class |
| Visible draw calls on mobile | <= 150-200 |
| DPR cap | 1.0-1.25 adaptive |
| Mandatory postprocessing on mobile | None |
| Continuous render loop | Not allowed except during bounded active animation |
| Texture size | Optimized; each screenshot preferably < 500KB |
| Thermal behavior | No obvious throttling or device warnings in 90s test |

### 14.3 Rendering Policy

`/world` should use on-demand rendering.

Render frames when:

- Scene initializes
- User moves pointer/touches
- Station hover/focus state changes
- Camera glide is active
- Screenshot scroll is actively running
- Window resizes
- Device pixel ratio or quality tier changes
- Context is restored

Do not render indefinitely while idle.

## 15. Device Tiering & Fallbacks

### 15.1 Hard Fallback Conditions

Show fallback UI instead of initializing the full 3D scene when:

- `prefers-reduced-motion: reduce` is active
- WebGL 2.0 is unavailable
- WebGL context creation fails
- Browser/device cannot reliably initialize the scene
- Explicit `?lite=1` is present

Reduced-motion users should be redirected to `/`, not shown a separate 3D fallback.

### 15.2 Low-Tier Detection

Use a conservative combination of:

- WebGL 2.0 support
- `navigator.deviceMemory` where available
- `navigator.connection.saveData` where available
- Initial renderer capability checks
- Runtime frame stability during initialization

Because some browser APIs are unavailable on Safari, missing capability data should not automatically imply failure. Treat unknown devices conservatively but not punitively.

### 15.3 Fallback UI

Fallback screen on `/world` should include:

- Short message: "The studio view is optimized for devices that support interactive 3D."
- Primary CTA: View standard site
- Optional secondary CTA: Try anyway only if device is borderline, not unsupported
- No guilt, no technical jargon, no broken canvas

## 16. Accessibility Requirements

The static page is the accessible canonical path.

### 16.1 Static Page

`/` must remain:

- Keyboard navigable
- Screen-reader accessible
- Content-complete
- Form/contact accessible
- Case-study accessible
- SEO canonical

### 16.2 3D Page

`/world` must:

- Redirect reduced-motion users to `/`
- Include a persistent visible link back to `/`
- Include a screen-reader announcement explaining that the full accessible version is available at `/`
- Avoid trapping keyboard focus
- Provide keyboard-accessible station actions where practical
- Ensure all meaningful project content also exists on `/`

Recommended screen-reader copy:

"Interactive 3D studio view loaded. A fully accessible standard version of this content is available on the main Showcase Designs page."

## 17. SEO Requirements

### 17.1 Static Page

`/` remains the SEO source of truth.

Requirements:

- Preserve canonical URL for `/`
- Preserve ProfessionalService JSON-LD
- Preserve page title and meta description strategy
- Preserve crawlable case-study content
- Preserve internal anchors
- Do not require JS or WebGL to understand the business

### 17.2 3D Page

`/world` is a shareable experience, not the primary SEO page.

Recommended metadata:

- `noindex,follow` for `/world`
- Canonical pointing to `/` or self-canonical only if there is a deliberate reason to allow indexing
- Open Graph metadata optimized for sharing
- Clear title such as:
  Showcase Designs Studio Gallery
- Description that frames `/world` as an interactive companion, not a separate service page

## 18. Analytics & Measurement

### 18.1 Launch Instrumentation

Add lightweight analytics events for:

| Event | Trigger |
| --- | --- |
| mode_enter_world | User enters `/world` from `/`, query param, or direct route |
| mode_return_static | User clicks "Fast view <-" or uses `?lite=1` |
| world_fallback_shown | Device fallback appears |
| reduced_motion_redirect | Reduced-motion user is routed to `/` |
| station_hover | Visitor hovers/focuses a station |
| station_click_live | Visitor opens a live client site |
| station_click_case_study | Visitor clicks case-study pill |
| webgl_context_lost | WebGL context loss occurs |
| world_session_90s | Visitor remains in `/world` for 90 seconds |

### 18.2 Post-Launch Metrics

Track after launch:

- Percentage of visitors entering `/world`
- Time spent in each mode
- Station click-through rate
- Case-study click-through rate
- Lead form submissions segmented by entry mode
- Bounce rate segmented by referrer
- Conversion rate by traffic source
- Lead quality by entry path
- Deal-size difference between static-only and `/world`-entry visitors over 1-2 months

## 19. Phased Delivery Plan

### Phase 0 - Setup & Alignment

Estimated effort: 1-2 days

Tasks:

- Clone repo locally.
- Run local static server.
- Verify current `v3-preview.html` matches live preview.
- Inventory existing screenshots in `img/`.
- Confirm which 5-6 stations ship at launch.
- Confirm whether `v3-preview.html` becomes `index.html`.
- Confirm clean URL rewrite plan.

Success criteria:

- Repo runs locally.
- Static preview matches expected live version.
- Station list is approved.
- Route plan is confirmed.

### Phase 1 - World Scaffold

Estimated effort: 3-5 days

Tasks:

- Create `world.html`.
- Add `world.css`.
- Add `world.js`.
- Match static page `<head>` structure and brand fonts.
- Load Three.js via CDN.
- Build empty studio scene:
  - Floor
  - Walls
  - Ceiling
  - Ambient light
  - Key light
  - POV camera at ~1.6m
- Implement on-demand rendering.
- Implement reduced-motion redirect.
- Implement WebGL 2.0 detection.
- Implement low-tier fallback.
- Add "Fast view <-" link.

Success criteria:

- `/world` renders an empty branded studio.
- Scene initializes on supported browsers.
- Reduced-motion users are redirected to `/`.
- Unsupported devices see fallback UI.
- On-demand rendering is functioning.
- 90-second test does not create obvious thermal or performance degradation.

### Phase 2 - First Station End-to-End

Estimated effort: 3-5 days

Recommended first station: Saddlebrooke Strength.

Tasks:

- Capture or confirm mobile screenshot at approximately 390px width.
- Optimize screenshot to target < 500KB.
- Create first station entry in `world-data.js`.
- Build station factory:
  - Phone-shaped mesh
  - Screenshot texture
  - Badge
  - Hover/focus state
  - Click target
  - Case-study action
- Implement bounded screenshot scroll.
- Implement camera glide.
- Implement `window.open(liveUrl, '_blank', 'noopener')`.

Success criteria:

- Saddlebrooke station appears in `/world`.
- Hover/focus state works.
- Screenshot motion works without indefinite rendering.
- Primary click opens live site in a new tab.
- Secondary pill routes to static case-study anchor.
- Camera glide feels intentional and does not disorient.

### Phase 3 - Toggle UX & Routing

Estimated effort: 1-2 days

Tasks:

- Add "Explore the studio ->" link to static nav.
- Add `?scenic=1` routing on `/`.
- Add `?lite=1` routing on `/` and `/world`.
- Implement `localStorage.mode-preference`.
- Ensure reduced-motion check wins over all scenic routing.
- Ensure static page does not load Three.js.

Success criteria:

- `/` -> `/world` toggle works.
- `/world` -> `/` toggle works.
- `?scenic=1` deep link works for eligible users.
- `?lite=1` clears scenic preference.
- Reduced-motion users never enter the 3D scene.
- Static route performance does not regress.

### Phase 4 - Full Station Set

Estimated effort: 3-5 days

Tasks:

- Add all approved stations to `world-data.js`.
- Capture and optimize all station screenshots.
- Validate station layout.
- Prevent clipping and awkward camera angles.
- Confirm all primary live links.
- Confirm all case-study anchors.
- Run draw-call and FPS performance pass.
- Adjust DPR caps and texture quality as needed.

Success criteria:

- 5-6 stations are live.
- Every station has correct metadata.
- Every live link works.
- Every case-study link works.
- Mobile draw-call budget remains within target.
- Mobile FPS remains >=30 for 90 seconds.

### Phase 5 - Polish, QA & Launch

Estimated effort: 3-5 days

Tasks:

- Refine camera glide timing.
- Refine lighting and material treatment.
- Cross-browser test:
  - iOS Safari
  - Chrome Android
  - Desktop Safari
  - Desktop Chrome
  - Desktop Firefox
  - Edge
- Test WebGL context loss handling.
- Test cold load on 4G simulation.
- Confirm static CWV has not regressed.
- Confirm `/world` metadata and noindex behavior.
- Deploy manually via rsync to Beckel VPS.
- Verify production routes.
- Obtain operator approval.

Success criteria:

- `/` is live and stable.
- `/world` is live and stable.
- Static page remains canonical and performant.
- 3D page meets launch performance gates.
- Reduced-motion and fallback behavior work.
- Operator approves launch.

### Phase 6+ - Deferred Enhancements

Potential future work:

- GitHub Actions auto-deploy
- Avatar character layer
- Screenshot automation with Puppeteer
- Sound design experiment
- Traffic-source-based UX refinement
- R3F migration if scene complexity justifies it
- More advanced analytics segmentation
- Cinematic fallback for devices that cannot run 3D

## 20. Launch Gates

The project should not launch until all P0 gates pass.

### 20.1 Static Launch Gates

| Gate | Requirement |
| --- | --- |
| Static LCP, p75 | <= 2.5s |
| Static INP, p75 | <= 200ms |
| Static CLS, p75 | <= 0.1 |
| Static route loads without 3D payload | Required |
| Contact/conversion path works | Required |
| SEO schema preserved | Required |
| `/` remains canonical | Required |

### 20.2 3D Launch Gates

| Gate | Requirement |
| --- | --- |
| Mobile FPS | >=30 sustained for 90s |
| Initial `/world` critical payload | <1MB target |
| Visible draw calls on mobile | <=150-200 |
| Reduced-motion redirect | Required |
| Low-tier fallback | Required |
| WebGL context-loss handling | Required |
| Live-site station clicks | Required |
| Static fallback link | Required |
| No severe mobile thermal degradation | Required |

## 21. Risks & Mitigations

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Mobile thermal throttling degrades 3D after 60-90 seconds | High | Use on-demand rendering, avoid mandatory postprocessing, cap DPR, keep draw calls <=150-200, pause idle animation. |
| Screenshot auto-scroll conflicts with on-demand rendering | High | Make screenshot motion bounded and interaction-triggered instead of perpetual. |
| Static fast path regresses after adding `/world` | High | Do not load Three.js on `/`; test static CWV before launch; deploy preview-first. |
| Reduced-motion users accidentally enter scenic mode | High | Run reduced-motion check before scenic preference or redirect logic. |
| iOS Safari WebGL context loss | Medium | Keep GPU memory low, handle context-loss events, test on real iPhone hardware. |
| Device-tier detection incorrectly blocks good devices | Medium | Use fallback conservatively; allow "Try anyway" only for borderline devices. |
| Device-tier detection lets poor devices into bad experience | Medium | Runtime FPS check during initialization; degrade quality or show fallback. |
| `/world` creates SEO confusion | Medium | Keep `/` canonical; ensure all meaningful content exists on `/`; use `noindex,follow` on `/world`. |
| Vanilla Three.js becomes hard to maintain | Low | Keep scene small and data-driven; preserve future migration path to R3F. |
| Case-study anchors do not exist or drift | Medium | Verify anchors before wiring station links; add stable IDs to static sections. |
| Client screenshots become stale | Medium | Manual screenshot update process for v3.0; automate in future phase. |
| Domain cutover causes SEO loss | Medium | No domain change; static page remains at `/`; `/world` is additive. |

## 22. Open Questions

These require operator decisions before implementation or launch.

1. Should `v3-preview.html` be renamed to `index.html` so showcase-designs.com/ serves it directly?
   Recommendation: Yes.
2. Should Nginx rewrites be configured for clean URLs?
   Recommendation: Yes. Use `/` and `/world` publicly.
3. Should `/world` use `noindex,follow`?
   Recommendation: Yes, unless there is a deliberate reason to index it.
4. Which 5-6 stations ship at launch?
   Recommendation: Start with Saddlebrooke Strength, Felco Vending, Beckel Spreadsheets, and 2-3 approved additional examples.
5. Do existing static case-study sections already have stable fragment IDs?
   Required before: Wiring "Case study ->" station pills.
6. Should GitHub Actions auto-deploy be included in v3.0?
   Recommendation: Defer to v3.x.
7. Should Cloudflare Web Analytics be added now?
   Recommendation: Add if lightweight and quick; otherwise defer, but ensure some analytics path exists for mode and station events.
8. Should borderline low-tier users see a "Try anyway" button?
   Recommendation: Yes only when WebGL 2.0 exists and the device is not clearly unsupported.

## 23. Implementation Notes

### 23.1 Query Param Priority

Routing logic should follow this order:

1. `prefers-reduced-motion: reduce`
   -> force `/`
2. `?lite=1`
   -> clear scenic preference and force `/`
3. Unsupported WebGL or hard fallback condition
   -> show fallback on `/world` or route to `/` depending on entry path
4. `?scenic=1`
   -> set `mode-preference = 'world'` and route to `/world`
5. Stored `mode-preference`
   -> may influence soft routing only if the visitor has explicitly opted in before

Reduced motion always wins.

### 23.2 Suggested Local Storage Values

```js
localStorage.setItem('mode-preference', 'world');
localStorage.setItem('mode-preference', 'static');
localStorage.removeItem('mode-preference');
```

Avoid silently forcing first-time visitors into `/world` based only on localStorage unless they explicitly opted in previously.

### 23.3 External Link Safety

Use:

```js
window.open(liveUrl, '_blank', 'noopener');
```

For anchor links, use normal internal navigation:

```js
window.location.href = '/#case-study-saddlebrooke';
```

## 24. Acceptance Criteria Summary

The v3.0 release is successful when:

- showcase-designs.com/ serves the static v3 marketing page.
- Static page remains fast, accessible, and SEO canonical.
- showcase-designs.com/world serves the opt-in 3D studio gallery.
- Reduced-motion users are routed away from 3D.
- Unsupported devices receive a graceful fallback.
- 5-6 client/project stations are visible and usable.
- Each station can open a live site in a new tab.
- Each station can route to a static case-study anchor.
- The 3D experience sustains >=30fps on target mid-tier mobile devices for 90 seconds.
- No Three.js payload affects the static path.
- Analytics can distinguish static-only visitors from `/world` visitors.
- Operator approves both static and 3D experiences before launch.

## 25. Appendix: Research Synthesis

Three independent research streams converged on the same product direction: a dual-mode hybrid.

The strongest pattern from SMB web-design evidence is that restraint tends to win for conversion. Fast, clear, minimalist redesigns have stronger support for contractor and home-service audiences than heavy interactive experiences. By contrast, highly memorable 3D portfolios tend to resonate more with agencies, designers, tech audiences, and creative referrers.

The resulting product decision:

Keep the static site as the business-critical path. Add the 3D gallery as an optional craft layer.

Additional technical conclusions:

- iOS Safari and mobile WebGL require careful memory and context-loss handling.
- Sustained mobile 3D can trigger thermal throttling, even on strong phones.
- On-demand rendering is mandatory for a 90-second mobile experience.
- Texture-on-plane is the right approach for website previews.
- CSS3DRenderer and iframe-in-3D are not reliable enough for mobile.
- Vanilla Three.js best matches the current no-build static repo.
- Automatic traffic-source routing is too fragile for v3.0.
- Soft toggle plus explicit query params is the safer launch path.
