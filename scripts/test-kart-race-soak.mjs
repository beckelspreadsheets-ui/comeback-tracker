// Race soak (RELEASE_V1_PLAN Phase 3 bar: "zero reloads in 10 races").
//
// iOS kills a WKWebView's web process when memory keeps climbing, and the
// thing that climbs in a game like this is whatever a race leaves behind when
// the next one is built: textures, geometries, listeners, WebGL contexts. This
// runs N full scene rebuilds in ONE page, the way a player does it (race, quit
// to the menu, start again), and fails if memory or live WebGL contexts grow.
//
//   npm run build:kart && node scripts/test-kart-race-soak.mjs [races=10]
//
// Chromium only (performance.memory, gc via --js-flags=--expose-gc). Numbers
// are JS heap after a forced GC, which is what leaks show up in; GPU memory is
// covered by counting live (not lost) WebGL contexts, since a context that is
// released frees its GPU objects with it.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { chromiumGlArgs } from './lib/chromium-gl-args.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RACES = Number(process.argv[2] || 10);
// Restart race (pause menu) cycles inside race 1: the same engine resets
// instead of remounting, so a leak there never shows in the remount loop.
const RESTARTS = Math.max(3, Number(process.env.KART_SOAK_RESTARTS ?? 8));
const PORT = Number(process.env.KART_SOAK_PORT || 5411);
// The menu stage owns one context, so a clean run reads 1 retained after every
// quit (see pageClick). The ceiling stays at 2: one late collection is allowed,
// a renderer-per-race leak passes it by the second race.
const RETAINED_CEILING = 2;
const SETTLE_TRIES = 8;
const external = process.env.KART_SOAK_URL;
const baseUrl = external || `http://127.0.0.1:${PORT}`;

const waitForServer = async (url, ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if ((await fetch(url)).ok) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
};

let server = null;
let browser = null;
let failed = false;
try {
  if (!external) {
    server = spawn('npx', ['vite', 'preview', '--config', 'vite.config.kart.js', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
      cwd: root,
      stdio: 'ignore',
    });
    if (!(await waitForServer(`${baseUrl}/`, 60000))) throw new Error('preview server did not start (run npm run build:kart first)');
  }
  browser = await chromium.launch({ args: chromiumGlArgs({ extra: ['--js-flags=--expose-gc', '--enable-precise-memory-info'] }) });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  // Count every WebGL context the page creates. WeakRefs, so the counter
  // itself never keeps a dead race's canvas (and whatever its listeners close
  // over) alive and reports a leak the app does not have.
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false });
    try {
      window.localStorage.setItem('cc-kart-intro-seen', '1');
    } catch {}
    window.__glContexts = [];
    const seen = new WeakSet();
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(type, ...rest) {
      const ctx = original.call(this, type, ...rest);
      if (ctx && /webgl/.test(String(type)) && !seen.has(ctx)) {
        seen.add(ctx);
        window.__glContexts.push(new WeakRef(ctx));
      }
      return ctx;
    };
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error).slice(0, 200)));
  await page.goto(`${baseUrl}/?raceAutoplay=1&track=comeback-city`, { waitUntil: 'networkidle' });

  // Two context counts, because they catch different leaks:
  // - live: contexts not yet lost. Browsers cap these (~16 in Chrome, fewer on
  //   iOS); one race that forgets forceContextLoss shows up here.
  // - retained: context OBJECTS still reachable, lost or not, counted by
  //   prototype through the inspector. A renderer that something still
  //   references keeps its context wrapper, so this is the direct read on
  //   "is a quit race's renderer still alive" — it is how three's shared DFG
  //   lookup texture was found pinning one renderer per race (2026-10-21).
  const cdp = await context.newCDPSession(page);
  const retainedContexts = async () => {
    const group = 'soak-count';
    const { result: proto } = await cdp.send('Runtime.evaluate', { expression: 'WebGL2RenderingContext.prototype', objectGroup: group });
    const { objects } = await cdp.send('Runtime.queryObjects', { objectGroup: group, prototypeObjectId: proto.objectId });
    const { result } = await cdp.send('Runtime.callFunctionOn', {
      functionDeclaration: 'function () { return this.length; }',
      objectId: objects.objectId,
      returnByValue: true,
    });
    await cdp.send('Runtime.releaseObjectGroup', { objectGroup: group });
    return result.value;
  };
  const recentHeaps = [];
  const sample = async () => {
    const s = await page.evaluate(async () => {
      window.gc?.();
      await new Promise((resolve) => setTimeout(resolve, 300));
      window.gc?.();
      const refs = window.__glContexts || [];
      const live = refs.map((ref) => ref.deref()).filter((ctx) => ctx && !ctx.isContextLost()).length;
      return {
        heapMiB: Number(((performance.memory?.usedJSHeapSize || 0) / 1048576).toFixed(1)),
        liveContexts: live,
        totalContexts: refs.length,
      };
    });
    // Settle before judging. Two things make one sample read high without
    // anything leaking, both measured 2026-11-24:
    // - React keeps the tree it last unmounted reachable from the parent's
    //   previous fiber until that parent has rendered again, so a quit race
    //   can stay counted (one extra context, about 22 MiB of heap) while the
    //   menu just sits there. Re-rendering the menu (pick the other track and
    //   back) lets it go.
    // - a collection that has not finished yet.
    // So a context count over the ceiling, or a heap reading well above the
    // recent ones, gets a menu re-render and more collections, and the lowest
    // reading is kept. A real leak does not settle: a renderer something
    // still references stays counted, and its memory stays reachable, however
    // often the menu renders and GC runs.
    let retained = await retainedContexts();
    let heapMiB = s.heapMiB;
    let settleTries = 0;
    const heapRef = recentHeaps.length ? Math.min(...recentHeaps.slice(-3)) : null;
    const unsettled = () => retained > RETAINED_CEILING || (heapRef !== null && heapMiB > heapRef + 2.5);
    while (unsettled() && settleTries < SETTLE_TRIES) {
      settleTries += 1;
      const again = await page.evaluate(async () => {
        const tracks = ['penguin-village', 'comeback-city'].map((key) => document.querySelector(`[data-testid="race-track-${key}"]`));
        if (tracks.every(Boolean)) {
          for (const button of tracks) {
            button.click();
            await new Promise((resolve) => setTimeout(resolve, 150));
          }
        }
        window.gc?.();
        await new Promise((resolve) => setTimeout(resolve, 500));
        window.gc?.();
        return Number(((performance.memory?.usedJSHeapSize || 0) / 1048576).toFixed(1));
      });
      heapMiB = Math.min(heapMiB, again);
      retained = await retainedContexts();
    }
    recentHeaps.push(heapMiB);
    return { ...s, heapMiB, retainedContexts: retained, settleTries };
  };

  // ?raceAutoplay=1 mounts race 1 straight away and lets autoplay drive every
  // race; after that each race goes through the real menu: Quit to menu, pick
  // Single race and a track (alternating, so both scenes are built and torn
  // down), Start.
  const TRACKS = ['comeback-city', 'penguin-village'];
  const samples = [];
  let restartGrowth = 0;
  // Locators, never page.waitForSelector: that returns an ElementHandle, and
  // an undisposed handle pins its element — here the pause menu's exit
  // button, and through it the whole quit race's DOM and canvas. The first
  // version of this test did exactly that and measured its own handles.
  // Waiting is in-page too and hands back a boolean, never the element, for
  // the same reason as the clicks below.
  const waitFor = (testId) =>
    page.waitForFunction(
      (id) => {
        const el = document.querySelector(`[data-testid="${id}"]`);
        return Boolean(el && el.getClientRects().length);
      },
      testId,
      { timeout: 60000 }
    );
  // Every button is clicked from inside the page, never with a Playwright
  // click. Playwright keeps references to elements it has clicked, and once
  // the screen they were on is closed each is a detached button whose React
  // props lead back to that screen — so the just-quit race (or the menu stage
  // just left) stayed counted until a later click replaced it. Measured
  // 2026-11-24, ten races per run: all locator clicks, every sample read 2
  // retained and 2 runs in 3 hit 3; Quit and Start clicked in the page, mostly
  // 1, some 2, one run in ten still hit 3 (the mode, track and Restart
  // buttons were still locator clicks). That was the whole "flaky soak" of
  // 2026-11-19: the gate counting its own tool, the same family as the
  // ElementHandle note above.
  const pageClick = async (testId) => {
    await waitFor(testId);
    await page.evaluate((id) => document.querySelector(`[data-testid="${id}"]`).click(), testId);
  };
  for (let race = 1; race <= RACES; race += 1) {
    const track = TRACKS[(race - 1) % TRACKS.length];
    if (race > 1) {
      await waitFor('race-character-start');
      await pageClick('race-mode-single');
      await pageClick(`race-track-${track}`);
      await page.evaluate(() => delete window.__comebackCityKartTelemetry);
      await pageClick('race-character-start');
    }
    await page.waitForFunction(() => window.__comebackCityKartTelemetry?.raceTime > 4, null, { timeout: 120000 });
    const raced = await page.evaluate(() => window.__comebackCityKartTelemetry?.track);
    if (race === 1 && RESTARTS > 0) {
      // Measured from the second restart on, like the remount loop skips its
      // first races: the first run and first restarts allocate once (pools,
      // the previous run kept for the ghost, compiled code) — a heap diff
      // between restart 2 and restart 8 showed no app objects growing.
      let before = null;
      for (let i = 1; i <= RESTARTS; i += 1) {
        await page.keyboard.press('Escape');
        await pageClick('race-pause-restart');
        await page.waitForFunction(() => window.__comebackCityKartTelemetry?.raceTime < 1, null, { timeout: 30000 });
        await page.waitForFunction(() => window.__comebackCityKartTelemetry?.raceTime > 4, null, { timeout: 120000 });
        if (i === 2) before = await sample();
      }
      const after = await sample();
      restartGrowth = after.heapMiB - before.heapMiB;
      console.log(`restarts ${RESTARTS}: in-race heap after restart 2 ${before.heapMiB} -> after restart ${RESTARTS} ${after.heapMiB} MiB (growth ${restartGrowth.toFixed(1)} MiB)`);
    }
    // Quit to the menu through the pause menu, the way a player leaves.
    await page.keyboard.press('Escape');
    await pageClick('race-pause-menu-exit');
    await waitFor('race-character-start');
    await page.waitForTimeout(800);
    const s = await sample();
    samples.push({ ...s, track: raced });
    console.log(
      `race ${String(race).padStart(2)}  ${String(raced).padEnd(16)} heap ${s.heapMiB} MiB  GL contexts live ${s.liveContexts} / retained ${s.retainedContexts} (created ${s.totalContexts})${s.settleTries ? `  [settled: ${s.settleTries} extra pass${s.settleTries > 1 ? 'es' : ''}]` : ''}`
    );
  }

  // Judge. The menu stage owns one context; 2 is the ceiling for both counts.
  // Heap: after the leak fixes of 2026-10-21 ten races measured +1.2 MiB from
  // race 3 to race 10 (one quit race's renderer is ~0.6 MiB, so a
  // renderer-per-race leak shows as ~4 MiB over the same span).
  const maxLive = Math.max(...samples.map((s) => s.liveContexts));
  const maxRetained = Math.max(...samples.map((s) => s.retainedContexts));
  const early = Math.max(...samples.slice(0, Math.min(3, samples.length)).map((s) => s.heapMiB));
  const late = samples[samples.length - 1].heapMiB;
  const growth = late - early;
  console.log(
    `max live contexts ${maxLive}, max retained ${maxRetained}; heap early max ${early} MiB -> last ${late} MiB (growth ${growth.toFixed(1)} MiB)`
  );
  if (maxLive > 2) {
    failed = true;
    console.log('FAIL WebGL contexts stay live across races');
  }
  if (maxRetained > RETAINED_CEILING) {
    failed = true;
    console.log('FAIL quit races are still reachable (WebGL context objects retained)');
  }
  if (restartGrowth > 3) {
    failed = true;
    console.log('FAIL JS heap grows with each Restart race');
  }
  if (samples.length >= 6 && growth > 3) {
    failed = true;
    console.log('FAIL JS heap keeps growing across races');
  }
  if (pageErrors.length) {
    failed = true;
    console.log('FAIL page errors:', pageErrors.slice(0, 3));
  }
} catch (error) {
  failed = true;
  console.log('FAIL run aborted:', String(error).slice(0, 300));
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}
console.log(failed ? 'SOAK FAILED' : 'SOAK PASSED');
process.exitCode = failed ? 1 : 0;
