# Local Browser Audit

Observed: 2026-05-03 on local preview server `http://127.0.0.1:8765`.
Latest 3D route rerun after portrait panel and station glow refinements: 2026-05-03 22:43 UTC.
Latest premium dark studio gallery capture after removing Gustavo's Landscape: 2026-05-04 12:55 UTC.
Latest showroom-wall capture and verifier rerun: 2026-05-04 23:56 UTC.
Latest Cloudflare `dist/` Lighthouse package audit: 2026-05-04 12:27 UTC.

Tool:

```bash
npx --yes lighthouse
```

## Static Route

Command:

```bash
npx --yes lighthouse http://127.0.0.1:8765/ --only-categories=accessibility,best-practices,performance,seo --output=json --output-path=/tmp/showcase-index-lh-after.json --quiet --chrome-flags="--headless=new --disable-gpu"
```

Result:

| Category | Score |
| --- | ---: |
| Performance | 94 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |

Key metrics:

- LCP: `2.7s`
- CLS: `0`
- TBT: `10ms`
- Accessibility/Best Practices/SEO failures: none

Fixes made from the first audit:

- Added `favicon.svg` and updated page icon links.
- Switched Google Fonts to `display=optional` to avoid font-swap layout shift.
- Reused optimized `img/world/*.jpg` screenshots on the static page.
- Added width/height, `decoding="async"`, and lazy loading for below-fold screenshots.
- Kept the hero H1 paint-stable instead of splitting/hiding it for the entrance animation.

## 3D Route

Command:

```bash
npx --yes lighthouse 'http://127.0.0.1:8765/world.html?try=1' --only-categories=accessibility,best-practices,performance,seo --output=json --output-path=/tmp/showcase-world-lh-after.json --quiet --chrome-flags="--headless=new --disable-gpu"
```

Result:

| Category | Score |
| --- | ---: |
| Performance | 97 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 66 |

Key metrics:

- LCP: `2.4s`
- CLS: `0`
- TBT: `0ms`
- Accessibility failures: none
- Best Practices failures: none

The SEO score is intentionally reduced because `world.html` uses `noindex,follow`; the static route remains canonical.

Fresh four-station visual captures:

- `verification/current-world-fourstation-desktop.png`
- `verification/current-world-fourstation-portrait.png`

2026-05-04 12:55 UTC refresh:

- Shifted `/world` from the beige prototype palette to a dark charcoal/brass studio gallery direction.
- Added framed wall bays, stronger warm lighting, darker reflective floor cues, and refined plinths without adding generated texture assets.
- Removed the random bench prop and reduced/rebalanced station scale so the four approved client stations read as intentional gallery pieces.
- Kept the portrait station panel compact by default and refreshed both desktop and portrait captures at the paths above.

2026-05-04 22:29 UTC refresh:

- Rebuilt `/world` around a front-facing four-station showroom wall to better match the approved reference direction.
- Tightened the camera lens, widened the portrait framing enough to show all four approved stations, and made the station controls compact by default so the gallery is not hidden by the UI.
- Added cache-busted `world.css`, `world.js`, and `world-data.js` references so local and production browsers pick up this visual pass reliably.
- Removed the single-station close-up camera behavior; station selection now preserves the showroom-wide composition and only shifts/highlights subtly.
- Added lightweight procedural wall/floor texture, glass reflections over the real client screenshots, and a restrained low showroom bench with warm underglow.

2026-05-04 23:27 UTC refresh:

- Enlarged and re-spaced the four real client stations on the front wall, keeping all four visible in desktop and portrait captures.
- Removed the default-view bench from the showroom composition, reduced prototype-like floor markers, and shifted materials back toward charcoal/brass instead of beige/brown.
- Reworked ceiling fixtures into smaller dark downlights, added broader floor readability without generated texture assets, and kept real client screenshots behind subtle glass reflections.
- Trimmed decorative meshes after the verifier caught a draw-call regression, bringing `/world` back inside the PRD draw-call budget.

2026-05-04 23:56 UTC refresh:

- Replaced many thin wall-frame meshes with one lightweight procedural showroom wall texture, reducing line-art clutter while preserving static performance and draw-call budget.
- Kept the four approved client screenshots as the only phone screen content; the generated reference direction was translated into materials, trim, and lighting only.
- Refreshed `verification/current-world-fourstation-desktop.png` and `verification/current-world-fourstation-portrait.png` after the wall-texture pass.

## Cloudflare Dist Package

Commands:

```bash
node prepare-cloudflare-deploy.mjs
node serve-local.mjs --root dist --port 8877
npx --yes lighthouse http://127.0.0.1:8877/ --only-categories=accessibility,best-practices,performance,seo --output=json --output-path=/tmp/showcase-dist-index-lh-panelcompact.json --quiet --chrome-flags="--headless=new"
npx --yes lighthouse 'http://127.0.0.1:8877/world.html?try=1' --only-categories=accessibility,best-practices,performance,seo --output=json --output-path=/tmp/showcase-dist-world-lh-panelcompact.json --quiet --chrome-flags="--headless=new"
```

Result:

| Route | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` from `dist/` | 87 | 100 | 100 | 100 | `3.3s` | `0` | `20ms` |
| `/world.html?try=1` from `dist/` | 85 | 100 | 100 | 66 | `2.6s` | `0.011` | `350ms` |

The 3D route CLS improved from `0.113` to `0.011` after making the portrait station panel compact in the initial HTML. These local Lighthouse numbers are not a replacement for production p75 Core Web Vitals.

## Thanks Route

Command:

```bash
npx --yes lighthouse http://127.0.0.1:8765/thanks.html --only-categories=accessibility,best-practices,performance,seo --output=json --output-path=/tmp/showcase-thanks-lh-after.json --quiet --chrome-flags="--headless=new --disable-gpu"
```

Result:

| Category | Score |
| --- | ---: |
| Performance | 94 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 66 |

Key metrics:

- LCP: `2.5s`
- CLS: `0`
- TBT: `0ms`
- Accessibility failures: none
- Best Practices failures: none

The SEO score is intentionally reduced because `thanks.html` uses `noindex,follow`; it is a form confirmation page, not an indexable landing page.

## 404 Route

Command:

```bash
npx --yes lighthouse http://127.0.0.1:8765/404.html --only-categories=accessibility,best-practices,performance,seo --output=json --output-path=/tmp/showcase-404-lh-after.json --quiet --chrome-flags="--headless=new --disable-gpu"
```

Result:

| Category | Score |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 66 |

Key metrics:

- LCP: `1.5s`
- CLS: `0`
- TBT: `0ms`
- Accessibility failures: none
- Best Practices failures: none

The SEO score is intentionally reduced because `404.html` uses `noindex,follow`; missing-route pages should not be indexed.

## Legal Routes

Commands:

```bash
npx --yes lighthouse http://127.0.0.1:8765/privacy.html --only-categories=accessibility,best-practices,performance,seo --output=json --output-path=/tmp/showcase-privacy-lh-after.json --quiet --chrome-flags="--headless=new --disable-gpu"
npx --yes lighthouse http://127.0.0.1:8765/terms.html --only-categories=accessibility,best-practices,performance,seo --output=json --output-path=/tmp/showcase-terms-lh-after.json --quiet --chrome-flags="--headless=new --disable-gpu"
```

Result:

| Route | Performance | Accessibility | Best Practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| `/privacy.html` | 100 | 100 | 100 | 100 |
| `/terms.html` | 100 | 100 | 100 | 100 |

Key metrics:

- Privacy LCP: `1.5s`, CLS: `0`, TBT: `0ms`
- Terms LCP: `1.5s`, CLS: `0`, TBT: `0ms`
