# Comeback Tracker

## Codebase Overview

A personal fitness/recovery PWA built with React + Vite, deployed to Cloudflare Pages with D1-backed cloud sync behind Cloudflare Access. Tracks workouts, food, body metrics, joint signals, and 1RM calibration. Includes a Three.js arcade racing minigame (`src/game/`) whose XP, level, and credits are derived from the user's real fitness data.

**Stack**: React 18, Vite 5, Tailwind 3 (custom Kintsugi palette), Three.js, Recharts, lucide-react, vite-plugin-pwa, @zxing/browser. Backend is Cloudflare Pages Functions + D1.

**Structure**:
- `src/App.jsx` — custom router (single `useState`, no react-router); deep linking only via `#race` hash
- `src/screens/` — top-level screens (Home, Day, Food, Metrics, Calibration, Settings, Joint, Race)
- `src/components/` — shared UI (FoodEntrySheet, BarcodeScanner, RestTimer, primitives)
- `src/hooks/usePersistedState.js` — single state atom, localStorage + cloud sync, OCC versioning, schema v4
- `src/lib/` — workout program, nutrition, food helpers, utilities
- `src/game/` — Three.js world hub + arcade race + economy/profile derivation
- `functions/api/` — `/sync/*` (CF Access JWT) and `/fatsecret/*` (OAuth2 proxy)
- `migrations/0001_comeback_sync.sql` — D1 schema (`user_states`, `state_backups`)

Build presets target two users via `VITE_USER_PRESET` (`andrew`, `alexander`) deploying to separate Cloudflare Pages projects.

For detailed architecture, module guide, data flows, gotchas, and navigation paths for common tasks, see [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).
