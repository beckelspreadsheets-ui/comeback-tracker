// Race-start profile: what a first-time player sees between pressing Start and
// the race running smoothly.
//
//   npm run build:kart && node scripts/profile-race-start.mjs [distDir] [options]
//     --throttle 4     CPU slowdown (CDP), a stand-in for a slower PC
//     --mbps 40        network cap with 40 ms latency (default: unthrottled)
//     --track key      comeback-city (default) | penguin-village | satoshi-summit
//     --menu-wait ms   time on the menu before Start (default 6000; the menu
//                      preloads the race's models, so this is part of the test)
//     --seconds 8      race seconds to record
//     --out file.json  full report
//
// Drives the real menu in a fresh context (cold caches): Single Race, track,
// Start. Logs every animation frame, every WebGL program link / texture upload
// / buffer upload with its blocking time, the loading card's appearance, and a
// CDP CPU profile. Prints a 500 ms timeline, the card's shown/lifted times, the
// frames the player sees after the lift, and the main-thread functions behind
// the long frames. Pass an UNMINIFIED build for readable names:
//   npx vite build --config vite.config.kart.js --minify false --outDir <dir>
//
// Not a gate: timings on a loaded dev machine are noisy. It is the measurement
// behind the 2026-10-22 start fix (a reviewer: "a lil hiccupy at the
// beginning"). At 4x CPU + 40 Mbps the countdown had 1950 / 234 / 167 ms
// frames as models arrived mid-countdown. After the menu preload and the
// loading card, the card covers the build and the first 3 s the player sees
// peak at ~49 ms; unthrottled, 19 ms (60 fps throughout).
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { chromiumGlArgs } from './lib/chromium-gl-args.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const distDir = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : path.join(root, 'dist-kart'));
const THROTTLE = Number(opt('throttle', 1));
const MBPS = Number(opt('mbps', 0));
const TRACK = opt('track', 'comeback-city');
const MENU_WAIT = Number(opt('menu-wait', 6000));
const SECONDS = Number(opt('seconds', 8));
const OUT = opt('out', null);
const PORT = Number(opt('port', 5431));
const baseUrl = `http://127.0.0.1:${PORT}`;

const waitForServer = async (url, ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if ((await fetch(url)).ok) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
};

const server = spawn(
  'npx',
  ['vite', 'preview', '--config', 'vite.config.kart.js', '--outDir', distDir, '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
  { cwd: root, stdio: 'ignore' }
);
let browser = null;
try {
  if (!(await waitForServer(`${baseUrl}/`, 60000))) throw new Error(`preview server did not start (is ${distDir} built?)`);
  browser = await chromium.launch({ args: chromiumGlArgs({ extra: ['--autoplay-policy=no-user-gesture-required'] }) });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false });
    try {
      window.localStorage.setItem('cc-kart-intro-seen', '1');
    } catch {}
    // [time, countdown, raceTime, loading card on screen]
    window.__frames = [];
    const tick = (time) => {
      const telemetry = window.__comebackCityKartTelemetry;
      window.__frames.push([
        time,
        telemetry ? telemetry.countdown : null,
        telemetry ? telemetry.raceTime : null,
        document.querySelector('[data-testid="race-loading"]') ? 1 : 0,
      ]);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // Blocking time of the GL calls that carry the start-up cost.
    window.__gl = [];
    const wrap = (proto, name, bucket) => {
      const original = proto[name];
      if (!original) return;
      proto[name] = function timed(...callArgs) {
        const start = performance.now();
        try {
          return original.apply(this, callArgs);
        } finally {
          window.__gl.push([start, bucket, performance.now() - start]);
        }
      };
    };
    for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
      wrap(proto, 'linkProgram', 'link');
      ['compileShader', 'getProgramParameter', 'getProgramInfoLog', 'getShaderInfoLog', 'getShaderParameter'].forEach((name) =>
        wrap(proto, name, 'program')
      );
      ['texImage2D', 'texSubImage2D', 'texStorage2D', 'texImage3D', 'compressedTexImage2D', 'generateMipmap'].forEach((name) =>
        wrap(proto, name, 'texture')
      );
      wrap(proto, 'bufferData', 'buffer');
    }
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error).slice(0, 200)));
  const cdp = await context.newCDPSession(page);
  if (MBPS > 0) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      downloadThroughput: (MBPS * 1e6) / 8,
      latency: 40,
      offline: false,
      uploadThroughput: (MBPS * 1e6) / 8,
    });
  }
  await page.goto(`${baseUrl}/`, { waitUntil: 'load' });
  const click = (testId) => page.locator(`[data-testid="${testId}"]`).click({ timeout: 60000 });
  await page.locator('[data-testid="race-character-start"]').waitFor({ timeout: 60000 });
  await click('race-mode-single');
  await click(`race-track-${TRACK}`);
  await page.waitForTimeout(MENU_WAIT);
  if (THROTTLE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 250 });
  await cdp.send('Profiler.start');
  const t0 = await page.evaluate(() => performance.now());
  await click('race-character-start');
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const raceTime = await page.evaluate(() => window.__comebackCityKartTelemetry?.raceTime ?? 0).catch(() => 0);
    if (raceTime >= SECONDS - 3) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const { profile } = await cdp.send('Profiler.stop');
  if (THROTTLE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const { frames, gl } = await page.evaluate(() => ({ frames: window.__frames, gl: window.__gl }));

  const after = frames.filter((frame) => frame[0] >= t0);
  const deltaAt = (index) => (index > 0 ? after[index][0] - after[index - 1][0] : 0);
  const longFrames = after
    .map((frame, index) => ({ at: Math.round(after[index - 1]?.[0] - t0), countdown: after[index - 1]?.[1] ?? null, ms: Math.round(deltaAt(index)) }))
    .filter((entry) => entry.ms > 50);

  // 500 ms timeline.
  const BUCKET = 500;
  const timeline = [];
  for (let start = 0; start < (after.at(-1)?.[0] ?? t0) - t0; start += BUCKET) {
    const inBucket = (time) => time >= t0 + start && time < t0 + start + BUCKET;
    const deltas = after.map((frame, index) => (index > 0 && inBucket(frame[0]) ? deltaAt(index) : null)).filter((d) => d !== null);
    const glIn = gl.filter((entry) => inBucket(entry[0]));
    const blocked = (bucket) => Math.round(glIn.filter((entry) => entry[1] === bucket).reduce((sum, entry) => sum + entry[2], 0));
    timeline.push({
      t: `${(start / 1000).toFixed(1)}s`,
      card: after.some((frame) => inBucket(frame[0]) && frame[3] === 1) ? 'on' : '',
      countdown: after.find((frame) => inBucket(frame[0]))?.[1] ?? null,
      frames: deltas.length,
      maxMs: Math.round(Math.max(0, ...deltas)),
      over33: deltas.filter((d) => d > 33.4).length,
      links: glIn.filter((entry) => entry[1] === 'link').length,
      programMs: blocked('program') + blocked('link'),
      textureMs: blocked('texture'),
      bufferMs: blocked('buffer'),
    });
  }

  // What the player sees: frames after the loading card lifts.
  const cardOn = after.findIndex((frame) => frame[3] === 1);
  const cardOff = cardOn >= 0 ? after.findIndex((frame, index) => index > cardOn && frame[3] === 0) : -1;
  const liftTime = cardOff >= 0 ? after[cardOff][0] : t0;
  const seen = [];
  for (let index = Math.max(1, cardOff + 1); index < after.length; index += 1) {
    if (after[index][0] - liftTime < 3000) seen.push(deltaAt(index));
  }

  // Main-thread self time inside the long frames, from the CPU profile. The
  // profile clock (us) is aligned to performance.now() at its start, which
  // lands within one sampling interval of t0.
  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  const selfInLong = new Map();
  let clock = profile.startTime;
  const inLong = (pageMs) => longFrames.some((entry) => pageMs >= t0 + entry.at && pageMs <= t0 + entry.at + entry.ms);
  profile.samples.forEach((id, index) => {
    clock += profile.timeDeltas[index];
    const next = clock + (profile.timeDeltas[index + 1] ?? 0);
    const pageMs = (clock - profile.startTime) / 1000 + t0;
    if (!inLong(pageMs)) return;
    const frame = nodes.get(id).callFrame;
    const label = `${frame.functionName || '(anonymous)'} ${(frame.url || '').split('/').pop()}:${frame.lineNumber + 1}`;
    selfInLong.set(label, (selfInLong.get(label) || 0) + (next - clock) / 1000);
  });
  const topSelf = [...selfInLong.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([label, ms]) => [Math.round(ms), label]);

  const report = {
    cardLiftedMs: cardOff >= 0 ? Math.round(liftTime - t0) : null,
    cardShownMs: cardOn >= 0 ? Math.round(after[cardOn][0] - t0) : null,
    goMs: (() => {
      const go = after.find((frame) => frame[1] === 0);
      return go ? Math.round(go[0] - t0) : null;
    })(),
    longFrames,
    mbps: MBPS,
    pageErrors,
    seenFirst3s: { maxMs: Math.round(Math.max(0, ...seen)), over33: seen.filter((d) => d > 33.4).length, frames: seen.length },
    throttle: THROTTLE,
    timeline,
    topSelfInLongFrames: topSelf,
    track: TRACK,
  };
  if (OUT) writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`track ${TRACK}  throttle ${THROTTLE}x  network ${MBPS ? `${MBPS} Mbps` : 'unthrottled'}  GO at ${report.goMs} ms`);
  console.log(`loading card: shown ${report.cardShownMs} ms, lifted ${report.cardLiftedMs} ms after Start`);
  console.log(`first 3 s after the lift: max frame ${report.seenFirst3s.maxMs} ms, ${report.seenFirst3s.over33} of ${report.seenFirst3s.frames} frames over 33 ms`);
  console.table(timeline);
  console.log('main thread inside long frames (ms, function):');
  topSelf.forEach(([ms, label]) => console.log(`  ${String(ms).padStart(5)}  ${label}`));
  if (pageErrors.length) console.log('page errors:', pageErrors);
} finally {
  await browser?.close().catch(() => {});
  server.kill('SIGTERM');
}
