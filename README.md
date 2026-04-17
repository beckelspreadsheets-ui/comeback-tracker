# Comeback Tracker

Personal training tracker PWA — **The Comeback: 181 → 238 lbs**. 7-day arms/hams specialization program with calibration protocol, percentage-based target weights, joint protection system, session logger, body metrics chart, and macro calculator.

Built as a single-page React PWA, deployable to Cloudflare Pages behind Zero Trust Access.

## Stack

- **React 18** + Vite 5
- **Tailwind CSS 3** for styling
- **Recharts** for progress visualization
- **lucide-react** for icons
- **vite-plugin-pwa** for service worker, manifest, offline-first
- **localStorage** for persistence (debounced writes, schema-versioned)
- Zero backend — all data stays on-device, fully portable via JSON export/import

## Quick start

```bash
npm install
npm run dev
# Opens on http://localhost:5173
```

## Build

```bash
npm run build
# Outputs to ./dist
```

The build produces a single-page PWA with:
- Chunked vendor bundles (`react`, `recharts`, `icons` split for better caching)
- Service worker that caches app shell + Google Fonts for full offline use
- Icons for iOS home screen, Android maskable, and favicon

## Deploy to Cloudflare Pages

### Option A — Direct upload via Wrangler CLI (fastest)

```bash
npm install -g wrangler
wrangler login
npm run build
wrangler pages deploy dist --project-name=comeback-tracker
```

### Option B — Git-connected deploy (recommended long-term)

1. Push this repo to GitHub.
2. In Cloudflare dashboard → Pages → Create project → Connect to Git.
3. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variable:** `NODE_VERSION` = `20`
4. Every push to `main` auto-deploys.

### Custom domain + Zero Trust Access

Once deployed (e.g. `comeback-tracker.pages.dev`):

1. **Add custom domain** in Pages project → Custom domains → add `comeback.showcase-designs.com` (or whichever subdomain you want).
2. **Gate with Zero Trust Access:**
   - Cloudflare dashboard → Zero Trust → Access → Applications → Add application → Self-hosted.
   - Application domain: `comeback.showcase-designs.com`
   - Add a policy: Include → Emails → your email(s).
   - Session duration: 30 days or whatever you prefer.
3. Now the app requires your login before loading — same pattern as `agents.showcase-designs.com`.

### Install as PWA on mobile

- **iOS Safari:** Share → Add to Home Screen.
- **Android Chrome:** menu → Install app (or "Add to Home Screen").

Once installed, it opens fullscreen, works offline, and all data persists in localStorage on that device.

## Data portability

Because this is a zero-backend app, your data lives in browser localStorage under the key `comeback-tracker-v1`. To move between devices or back up:

- **Export:** Tap the ⬇️ icon (top right). Downloads `comeback-YYYY-MM-DD.json`.
- **Import:** Tap the ⬆️ icon and select a previously-exported file. (Confirms before replacing existing data.)

If you want cloud sync across devices in the future, a few easy options exist:
- Add a Cloudflare Workers + D1 backend (would take ~2 hours to wire up).
- Use a service like Supabase or a simple self-hosted CouchDB.
- Sync the exported JSON via iCloud Drive / Google Drive manually.

## Project structure

```
src/
  App.jsx                   # Root — nav, header, timer wiring, export/import
  main.jsx                  # Entry + SW registration
  index.css                 # Tailwind + global styles + safe-area support
  lib/
    program.js              # Full 7-day program, 24 lifts, calibration, joint data
    utils.js                # Epley, phase logic, deload detection, target calc
  hooks/
    usePersistedState.js    # localStorage-backed state (debounced, versioned)
    useRestTimer.js         # Rest timer with Web Audio beep + vibrate
  components/
    primitives.jsx          # Card, SectionTitle, NumInput, Pill
    RestTimer.jsx           # Floating timer FAB + chip-based starter
  screens/
    HomeScreen.jsx          # Hero + day grid + weekly stats
    SettingsScreen.jsx      # Body metrics + 24 1RM inputs
    CalibrationScreen.jsx   # Method + effort guide + Epley calculator
    DayScreen.jsx           # Session logger with sets/joint/notes/timer
    MetricsScreen.jsx       # Body weight chart + weekly tracking
    NutritionScreen.jsx     # BMR/TDEE/macros auto from BW
    JointScreen.jsx         # Decision trees + subs + prehab
public/
  favicon.svg               # Source icon (gradient C monogram)
  icon-192.png              # PWA standard
  icon-512.png              # PWA standard
  icon-maskable-512.png     # Android adaptive icon
  apple-touch-icon.png      # iOS home screen
  _headers                  # Cloudflare Pages caching + security headers
  _redirects                # SPA fallback routing
```

## Program reference

The training program is extracted verbatim from `comeback-tracker-v3.xlsx`. Phase transitions:

| Weeks | Phase | Notes |
|-------|-------|-------|
| 1–2 | **CALIBRATION** | Use the Calibration screen. Find real working weights with conservative starts and RPE-based adjustments. Compute 1RMs with Epley. |
| 3–4 | **RE-ENTRY** | Program runs at 70% 1RM for moderate lifts, 78% for heavy. |
| 5–12 | **BUILD** | Same percentages, progress via reps and strategic 1RM updates. |
| 13+ | **GRIND** | Hard phase. Keep joint protection dialed. |

Every 5th week is an **automatic deload** (app detects this and reduces all target weights by 20% on Day screens).

## Philosophy notes

- **Local-first, sovereignty-oriented** — no backend, no accounts, no telemetry. Your training data is yours alone.
- **Minimum viable polish** — tab-able, touch-optimized, 16px inputs (no iOS zoom), safe-area aware, installable PWA.
- **Zero external state dependencies** at runtime — once installed, the app works airplane mode at the gym.

## License

Personal use. Not licensed for redistribution.
