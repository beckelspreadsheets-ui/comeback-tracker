import { renameSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// K1: standalone kart-game build target. `npm run build:kart` -> dist-kart ->
// the comeback-city-kart Pages project (Penguin Kart was the placeholder name). The fitness build (vite.config.js ->
// dist) is untouched by this file — K1 adds, never mutates. "Penguin Kart" was
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
        name: 'Inscription Circuit',
        short_name: 'Inscription',
        description: 'Inscription Circuit — arcade kart racing with the Ordinals: spaceport dusk, pirate wharf, mesa observatory',
        theme_color: '#0d0a1c',
        background_color: '#0d0a1c',
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
          {
            urlPattern: /\/(?:assets\/[^?]+\.(?:glb|webp|png)|baked-spike\.glb)$/,
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
    rollupOptions: {
      input: kartHtmlPath,
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('/node_modules/lucide-react/')) {
            return 'icons';
          }
        },
      },
    },
  },
});
