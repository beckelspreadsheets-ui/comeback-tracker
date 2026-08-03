// Chromium launch flags for anything that needs the kart game to actually RUN
// rather than merely load.
//
// WHY THIS EXISTS. Headless chromium launched with no GL flags does not fail —
// it silently serves a path that drives requestAnimationFrame at about two
// frames a second. The game's own work is fine there (frameWorkMs measured at
// 2-4 ms), but the gap BETWEEN frames is 400-1800 ms, and the engine clamps dt
// per frame the way every game loop must. The clamp is what converts a slow
// renderer into SLOW MOTION: game time advances ~1/24 s per frame however long
// the frame really took, so at 2.4 fps the world runs at roughly a tenth of
// real time. Measured on this repo, same machine, same scene:
//
//   no GL flags   fpsEstimate 1-2    frameElapsedMs 412-1790   3 s countdown took 22 s
//   these flags   fpsEstimate ~110   frameElapsedMs ~9         3 s countdown took <2 s
//                                                              raceTime tracks real time 1:1
//
// That is the whole reason `test:audio:kart` and `test:kart-playable` timed out
// waiting on `countdown <= 0`: nothing was broken in the game, the clock was
// running at 9% speed and a 20 s deadline could not cover it. A test that waits
// on GAME time must launch a browser that runs game time at real speed.
//
// Kept in one place because three scripts had hand-rolled their own copies and
// only the capture harness had the right set — which is the same way a gate and
// the data it checks drift apart.

// Software rasterisation for GPU-less CI runners. Current Chromium dropped
// --use-gl=swiftshader; the working combination is ANGLE pointed at the
// SwiftShader backend, and WITHOUT --enable-unsafe-swiftshader context creation
// fails SILENTLY and the app falls back to its 2D renderer with no console
// error at all.
const SOFTWARE_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-gpu-sandbox',
  '--no-sandbox',
];

const HARDWARE_ARGS = ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'];

/**
 * @param {object} [options]
 *   software  force the SwiftShader path (default: AAA_CAPTURE_GL=swiftshader)
 *   extra     additional flags to append, e.g. --autoplay-policy=...
 */
export const chromiumGlArgs = ({ software = process.env.AAA_CAPTURE_GL === 'swiftshader', extra = [] } = {}) => [
  ...(software ? SOFTWARE_ARGS : HARDWARE_ARGS),
  ...extra,
];

// True when the run is on the software path, which is roughly two orders of
// magnitude slower and needs every browser-side deadline widened.
export const isSoftwareGl = () => process.env.AAA_CAPTURE_GL === 'swiftshader';
