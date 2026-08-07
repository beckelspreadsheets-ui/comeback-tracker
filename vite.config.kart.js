import { renameSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// K1: standalone kart-game build target. `npm run build:kart` -> dist-kart ->
// the comeback-city-kart Pages project. The fitness build (vite.config.js ->
// dist) is untouched by this file — K1 adds, never mutates. "Penguin Kart" is
// the owner-pending placeholder name.

const kartHtmlPath = fileURLToPath(new URL('./index.kart.html', import.meta.url));

// The kart entry lives at repo root as index.kart.html (the fitness
// index.html keeps the root slot), but Cloudflare Pages, vite preview, and
// the SPA _redirects all need index.html at the outDir root. Rename on disk
// in writeBundle: every plugin's writeBundle runs before any closeBundle, so
// vite-plugin-pwa's workbox glob precaches the final name. (Mutating the
// bundle object in generateBundle instead drops the HTML under rolldown-vite
// — the emitted file vanished entirely.) In dev, rewrite / to the kart entry.
const kartHtmlEntry = () => ({
  name: 'kart-html-entry',
  writeBundle(options) {
    const outDir = options.dir;
    if (!outDir) return;
    renameSync(`${outDir}/index.kart.html`, `${outDir}/index.html`);
  },
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const [path, query] = (req.url || '').split('?');
      if (path === '/' || path === '/index.html') {
        req.url = `/index.kart.html${query ? `?${query}` : ''}`;
      }
      next();
    });
  },
});

// publicDir is public-kart/ — baked-spike.glb moved there with the 2026-07-13
// app split (the fitness build no longer ships ANY race asset), so vite's
// native publicDir copy covers build and dev; the old shared-copy plugin is
// gone.

export default defineConfig({
  publicDir: 'public-kart',
  plugins: [
    react(),
    kartHtmlEntry(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Penguin Kart',
        short_name: 'Penguin Kart',
        description: 'Penguin Kart — arcade kart racing with the ordinal crew (beta)',
        theme_color: '#10151d',
        background_color: '#10151d',
        display: 'standalone',
        orientation: 'landscape',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        categories: ['games'],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webp}'],
        globIgnores: [
          '**/comeback-city-kart-proof-*',
          '**/comeback-city-race-backdrop-*',
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          // K1 offline-replay fix: GLBs and the precache-ignored backdrop
          // strips are runtime-fetched hashed assets — cache them on first
          // use so a track raced once online replays offline. Hashed URLs
          // make staleness impossible; old entries age out.
          //
          // Audio joined this rule 2026-08-07 (owner's call) for the same
          // reason and NOT the precache. Precaching the beds would download
          // ~6 MB at install, before first play, which is exactly the
          // time-to-playable cost on cellular that the bundle caps exist to
          // protect. Here the cost is zero at install and a track you have
          // already raced keeps its music and cues offline.
          {
            urlPattern: /\/(?:assets\/[^?]+\.(?:glb|webp|png|mp3|m4a|ogg|wav)|baked-spike\.glb)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kart-runtime-assets',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    // 5174: the fitness dev server usually already owns 5173.
    port: 5174,
    host: true,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    outDir: 'dist-kart',
    // Audio must NEVER be inlined. Vite's default inlines any asset under 4 KB
    // as a base64 data URI, and 8 of the 20 SFX one-shots are under 4 KB — so
    // the default silently base64'd them (at +33% size) straight into
    // race-runtime.js. Three things wrong with that, none of them visible in a
    // build log: it spends the JS budget, which is the one cap the audio work
    // is explicitly not allowed to touch (JS blocks first paint, audio does
    // not); it puts sound in the precache by the back door; and it makes the
    // runtimeCaching rule below unable to see those cues at all. Everything
    // else keeps the normal 4 KB behaviour.
    assetsInlineLimit: (filePath) => (/\.(?:mp3|m4a|ogg|wav)$/i.test(filePath) ? false : undefined),
    rollupOptions: {
      input: kartHtmlPath,
      output: {
        // AAA wave 7 — `largest JavaScript gzip size` breached its 400 KiB cap
        // (measured 427.6 KiB) because six overhaul waves grew the monolith
        // 6,703 -> 10,831 lines and every new render module landed in the same
        // index.kart chunk alongside all of three.js and postprocessing.
        //
        // Everything below is a STATIC chunk split: rollup still emits plain
        // `import` edges from the entry, so module evaluation order is exactly
        // what it was in one chunk. Nothing here defers a download or changes
        // when side effects run — that would need a dynamic import in
        // src/kart/KartApp.jsx, which this config cannot reach. See the
        // wave-7 notes: React.lazy on the race component alone would NOT
        // defer the monolith, because KartApp also imports KART_CHARACTERS,
        // KART_OPTIONS, DEFAULT_CHARACTER_KEY and HeldItemIcon from it for the
        // intro/select screens.
        //
        // Split order matters: the most specific vendor prefixes are tested
        // first, and app code is only bucketed after every node_modules test
        // has missed.
        //
        // Measured on the same tree, before -> after:
        //   largest JavaScript gzip   427.59 KiB FAIL -> 253.05 KiB pass
        //   total JavaScript gzip     484.62        -> 485.94 / 500
        // The +1.32 KiB total is chunk-boundary overhead and shared text that
        // no longer cross-compresses — the price of the split, paid knowingly.
        // Every chunk is <link rel=modulepreload>-ed from index.html, so the
        // same bytes are still fetched in parallel on first paint; nothing
        // became a request waterfall. The CSS splits too (index + race-runtime)
        // and concatenating the two is byte-identical to the old single file
        // apart from one injected newline, so the Tailwind cascade order the
        // race UI depends on is unchanged. SW precache 47 -> 50 entries.
        //
        // ---------------------------------------------------------------
        // WAVE 7 ROUND 1: a critic blamed this split for the Comeback City
        // mid-ground skyline changing layout ("order-dependent RNG draw at
        // module init, re-ordered by the chunk split"). FALSIFIED three
        // times over — do NOT re-litigate it, and do NOT "fix" it here:
        //
        //  1. This block lives under `build.rollupOptions`. The capture
        //     harness records `"server": "dev:kart"` in every
        //     capture-manifest.json (scripts/aaa-visual-capture.mjs
        //     SERVER_MODE defaults to dev:kart; `--server preview:kart` is
        //     opt-in and was not used). Vite dev serves unbundled native
        //     ESM — manualChunks never runs. The split cannot have produced
        //     a single pixel in tmp/aaa-visual/wave7-r1.
        //  2. createMidGroundBelt.js contains ZERO Math.random. Its stream
        //     is makeRandom(hashSeed(`midground:${trackKey}`)) — a pure
        //     FNV-1a of the track key, seeded inside the factory call, not
        //     at module scope. Nothing about import order can reach it. A
        //     module-scope scan of every file under src/game for
        //     Math.random / Date.now / performance.now at depth 0 returns
        //     one comment and nothing else, so no race module has an
        //     evaluation-order-sensitive side effect to re-order.
        //  3. A static manualChunks split preserves ESM evaluation order by
        //     construction anyway (see the paragraph above).
        //
        // The actual cause is path-dependent: the belt is handed
        // `beltCenterline` sampled from the course, and its placement loop
        // rejects a slot (`if (!placed) continue;`) AFTER consuming three
        // draws but BEFORE the shape / variant / landmark / mass / colour /
        // tint draws. So one changed accept-reject outcome phase-shifts the
        // rest of the shared stream and the whole skyline reshuffles. Wave
        // 7's courseV2.js start/finish edit re-splined the closed
        // CatmullRom, which moves every centerline sample, which flips
        // those clearance tests. Belt determinism is per-TRACK-KEY, not
        // per-LAYOUT. Owner of createMidGroundBelt.js: draw the
        // placement-independent per-instance rolls from a per-slot sub-seed
        // (hash of trackKey + ring + step + side) so a rejection can no
        // longer phase-shift its neighbours.
        //
        // WAVE 7 ROUND 2 VERIFICATION (read-only, no build run): the emitted
        // dist-kart/assets tree matches the intent above and the cross-chunk
        // import graph is an ACYCLIC DAG, so no cross-chunk TDZ is possible:
        //   rolldown-runtime <- icons <- {react-vendor, race-runtime, index.kart}
        //   postprocessing-vendor <- race-runtime <- index.kart
        // Sizes (raw / gz KiB): postprocessing-vendor 875.7/253.8,
        // race-runtime 491.5/170.8, react-vendor 129.7/41.6, index.kart
        // 20.5/6.0, icons 9.3/3.9 — largest-JS-gz gate 253.05/400 pass,
        // total JS gz 486.38/500 pass. All five are modulepreloaded from
        // index.html.
        //
        // Two naming surprises, both harmless, documented so nobody "fixes"
        // them: rolldown folded REACT CORE into the `icons` chunk (react-dom
        // is what actually lives in `react-vendor`), and `three` lives in
        // `postprocessing-vendor` — same reachability-merge behaviour noted
        // above. Chunk NAMES are cosmetic; the byte split and the load order
        // are what the gate measures.
        //
        // Also note for future critics: the capture harness runs `dev:kart`,
        // and vite dev serves unbundled native ESM, so NO capture round can
        // ever confirm or deny this split. Its only evidence is a real
        // `build:kart` + `test:bundle:kart`.
        // ---------------------------------------------------------------
        manualChunks(id) {
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('/node_modules/lucide-react/')) {
            return 'icons';
          }
          // three + its examples/jsm helpers (GLTFLoader, MeshoptDecoder,
          // RoundedBoxGeometry, BufferGeometryUtils, the ?post=0 fallback
          // EffectComposer chain). A clean leaf — nothing in three imports app
          // code, so no cycle can straddle this boundary and trip a TDZ.
          if (id.includes('/node_modules/three/')) {
            return 'three-vendor';
          }
          // pmndrs postprocessing — the SHIPPED post chain (racePostChain.js).
          // Depends on three one-way, so it is safe downstream of three.
          //
          // MEASURED, not assumed: rolldown FOLDS these two groups back
          // together and emits a single postprocessing-vendor chunk (896.8 KiB
          // raw / 253.1 KiB gz, and it does contain WebGLRenderer). Both
          // groups are reachable from exactly one importer — race-runtime —
          // so rolldown's chunk merge treats them as one unit. The three-vendor
          // branch above is kept because it states the intent and takes effect
          // the moment those reachability sets diverge (e.g. postprocessing
          // dropped, or three pulled in by a non-race screen). Do not "clean
          // up" the branch on the grounds that no three-vendor-*.js appears.
          if (id.includes('/node_modules/postprocessing/')) {
            return 'postprocessing-vendor';
          }
          if (id.includes('/node_modules/')) return undefined;
          // The race runtime: the monolith plus every module under
          // src/game/race/ (physics, render, audio, tracks, HUD). This is the
          // boundary the screen flow already implies — none of it is needed
          // until a race actually starts. Keeping it in its own chunk today
          // (a) gets the largest-chunk metric back under cap without touching
          // a line of game code, and (b) means the eventual dynamic import in
          // KartApp.jsx has a chunk already shaped for it instead of forcing a
          // re-split. Matched by path, not by import site, so a new render
          // module joins it automatically.
          if (id.includes('/src/game/race/') || id.includes('/src/game/ComebackCityThreeKartRace.jsx')) {
            return 'race-runtime';
          }
          return undefined;
        },
      },
    },
  },
});
