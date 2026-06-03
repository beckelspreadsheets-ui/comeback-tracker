# Comeback Tracker

Personal training tracker PWA — **The Comeback: 181 → 238 lbs**. 7-day arms/hams specialization program with calibration protocol, percentage-based target weights, joint protection system, session logger, body metrics chart, and macro calculator.

Built as a single-page React PWA, deployable to Cloudflare Pages behind Zero Trust Access with D1-backed sync.

## Stack

- **React 18** + Vite 5
- **Tailwind CSS 3** for styling
- **Recharts** for progress visualization
- **lucide-react** for icons
- **vite-plugin-pwa** for service worker, manifest, offline-first
- **localStorage** for the offline-first cache (debounced writes, schema-versioned)
- **Cloudflare Pages Functions + D1** for authenticated full-state sync
- **Cloudflare Access** for auth; sync APIs verify the Access JWT before reading or writing

## Quick start

```bash
npm install
npm run dev
# Opens on http://localhost:5173
```

## Comeback City routes

- `/` opens the playable Comeback City hub.
- `/#visual-plaza` opens the visual reference panel used for regression checks.
- `/#race` opens race mode.

## Build

```bash
npm run build
# Outputs to ./dist
```

The build produces a single-page PWA with:
- Chunked vendor bundles (`react`, `recharts`, `icons` split for better caching)
- Service worker that caches app shell + Google Fonts for full offline use
- Icons for iOS home screen, Android maskable, and favicon

## Cloud sync

The app still loads and saves localStorage immediately under `comeback-tracker-v1`. When Cloudflare Access auth is present, it also syncs the full app state JSON through Pages Functions under `/api/sync/*`.

Sync metadata is stored separately under `comeback-tracker-sync-meta-v1`. First-run cloud actions require a prompt before replacing local data or uploading local data. Conflicts return `409` from the API and pause auto-save until the user chooses.

Pages Functions require:

- D1 binding: `DB`
- `CF_ACCESS_AUD`: the Access application AUD tag for that Pages project
- `CF_ACCESS_TEAM_DOMAIN`: `https://<your-team-name>.cloudflareaccess.com`
- `SYNC_USERS_JSON`: email-to-user mapping, for example:

```json
{
  "andrew@example.com": {
    "userId": "andrew",
    "displayName": "Andrew",
    "canView": ["andrew", "alexander"]
  },
  "alexander@example.com": {
    "userId": "alexander",
    "displayName": "Alexander",
    "canView": ["alexander", "andrew"]
  }
}
```

Use `.dev.vars` for local testing values. `.dev.vars*` is ignored; do not commit real emails or secrets.

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

Canonical sync URLs:

- `https://comeback-andrew.evenpathhomes.com`
- `https://comeback-alexander.evenpathhomes.com`

Set both Pages projects to use the same D1 database, bound as `DB`. Apply the D1 migration in `migrations/0001_comeback_sync.sql`.

1. **Add custom domains** in each Pages project.
2. **Gate with Zero Trust Access:**
   - Cloudflare dashboard → Zero Trust → Access → Applications → Add application → Self-hosted.
   - Application domains: the two custom domains above.
   - Add a policy: Include → Emails → Andrew and Alexander.
   - Session duration: 30 days or whatever you prefer.
3. In each Pages project, set `CF_ACCESS_AUD`, `CF_ACCESS_TEAM_DOMAIN`, and `SYNC_USERS_JSON`.
4. Keep `*.pages.dev` usable as preview/local-only unless Access is explicitly added there too.

The helper script can create/bind the shared D1 database, attach custom domains, create Access apps, and add email policies:

```bash
ACCESS_EMAILS='andrew@example.com,alexander@example.com' scripts/setup-cloudflare.sh
```

After that, set the Pages environment variables shown by the script and redeploy both projects.

### Install as PWA on mobile

- **iOS Safari:** Share → Add to Home Screen.
- **Android Chrome:** menu → Install app (or "Add to Home Screen").

Once installed, it opens fullscreen, works offline, and all data persists in localStorage on that device.

## Data portability

Your local offline cache lives in browser localStorage under the key `comeback-tracker-v1`. To move between devices manually or back up:

- **Export:** Tap the ⬇️ icon (top right). Downloads `comeback-YYYY-MM-DD.json`.
- **Import:** Tap the ⬆️ icon and select a previously-exported file. (Confirms before replacing existing data.)

Exports/imports remain full-state JSON and work without cloud sync.

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
    usePersistedState.js    # localStorage cache + cloud sync orchestration
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
functions/
  api/sync/                 # Access-authenticated D1 sync API
migrations/
  0001_comeback_sync.sql    # D1 tables for current state + backups
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

- **Local-first, sovereignty-oriented** — localStorage remains the immediate cache, cloud sync is authenticated, and JSON export/import stays available.
- **Minimum viable polish** — tab-able, touch-optimized, 16px inputs (no iOS zoom), safe-area aware, installable PWA.
- **Zero external state dependencies** at runtime — once installed, the app works airplane mode at the gym.

## License

Personal use. Not licensed for redistribution.
