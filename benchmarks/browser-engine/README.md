# Browser engine bake-off harness

This directory implements the equal-input measurement contract from
`ordinals-kart-browser-engine-bakeoff-2026-07-23.md`. It does not authorize or
start a production migration.

## Fixed protocol

- Route: `/?raceAutoplay=1&track=comeback-city#race`
- Warm-up: countdown complete plus two race seconds
- Measurement window: 20 seconds by default
- Captures: fixed start/middle/end screenshots and `metrics.json`
- Desktop viewport: 1440x900
- Mobile viewport: 844x390
- Frame metrics: median FPS, 1% low FPS, long frames (>50 ms), spikes (>100 ms)
- Load metrics: response transfer bytes, DOM/content load timing, startup time
- Scene metrics: draw calls, triangles, geometries, textures, programs where the
  lane exposes them

All lanes must serve the same camera path and asset set recorded in
`equal-input-assets.json`. Lane-specific substitutes invalidate the result.

## Commands

```sh
npm run build:kart
npm run benchmark:assets
ENGINE_BENCHMARK_LANE=threejs \
ENGINE_BENCHMARK_URL=http://127.0.0.1:5197 \
npm run benchmark:engine
```

The benchmark intentionally accepts a URL. This makes the same collector work
against local Three.js/PlayCanvas builds and remote Unity/Needle builds without
changing its scoring logic.

Headless VPS results are diagnostic because this machine has no GPU. Trusted
winner selection requires headed runs on representative desktop and mobile
hardware, three repetitions per lane, using the median.
