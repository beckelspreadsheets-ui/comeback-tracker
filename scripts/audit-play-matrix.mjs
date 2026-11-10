// Autoplay race matrix used for the 2026-11 audit and rival tuning.
//   BASE=http://127.0.0.1:<port> node scripts/audit-play-matrix.mjs <outDir> '<json runs>'
// Each run: { track, cc, handling, query, name, marks }. Serve a kart build first
// (npm run build:kart && npx vite preview --config vite.config.kart.js --port <port>).
// Run it from an isolated copy of the repo, like the gate battery.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { chromiumGlArgs } from './lib/chromium-gl-args.mjs';

const base = process.env.BASE || 'http://127.0.0.1:5477';
const out = path.resolve(process.argv[2]);
const runs = JSON.parse(process.argv[3]);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: chromiumGlArgs() });
const report = [];
for (const run of runs) {
  const name = run.name || `${run.track}-${run.handling || 'assisted'}-${run.cc || 'default'}`;
  const phone = Boolean(run.phone);
  const context = await browser.newContext({
    viewport: run.viewport || (phone ? { width: 844, height: 390 } : { width: 1280, height: 720 }),
    deviceScaleFactor: phone ? 2 : 1, hasTouch: phone, isMobile: phone,
  });
  const page = await context.newPage();
  const errors = []; const consoleErrors = []; const failedReq = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleErrors.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
  page.on('requestfailed', (r) => failedReq.push(r.url()));
  const q = [`track=${run.track}`, 'playableAutoplay=1'];
  if (run.handling) q.push(`handling=${run.handling}`);
  if (run.cc) q.push(`cc=${run.cc}`);
  if (run.query) q.push(run.query);
  const t0 = Date.now();
  let result = { name, run };
  try {
    await page.goto(`${base}/?${q.join('&')}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 90000 });
    result.loadMs = Date.now() - t0;
    await page.evaluate(() => {
      window.__s = []; window.__ft = [];
      let last = performance.now();
      const tick = (now) => {
        const t = window.__comebackCityKartTelemetry;
        const d = now - last; last = now;
        if (t && t.countdown <= 0 && !t.finished) { window.__ft.push(d);
          window.__s.push([t.raceTime, t.speed, t.position, t.lap, t.lane, t.wallContact ? 1 : 0, t.spinOuts, t.rescues, t.routeProgress]); }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.screenshot({ path: path.join(out, `${name}-0grid.png`) });
    const marks = run.marks || [8, 30, 60, 100];
    for (const m of marks) {
      const ok = await page.waitForFunction((mm) => { const t = window.__comebackCityKartTelemetry; return t && (t.raceTime >= mm || t.finished); }, m, { timeout: 400000 }).then(() => true).catch(() => false);
      if (!ok) break;
      await page.screenshot({ path: path.join(out, `${name}-t${m}.png`) });
    }
    const fin = await page.waitForFunction(() => window.__comebackCityKartTelemetry?.finished === true, null, { timeout: run.timeout || 420000 }).then(() => true).catch(() => false);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(out, `${name}-finish.png`) });
    await page.waitForTimeout(6000);
    await page.screenshot({ path: path.join(out, `${name}-results.png`) });
    const data = await page.evaluate(() => {
      const t = window.__comebackCityKartTelemetry || {};
      const s = window.__s; const ft = window.__ft.slice().sort((a, b) => a - b);
      const pct = (p) => ft[Math.min(ft.length - 1, Math.floor(ft.length * p))];
      let lead = 0, off = 0, wall = 0, tot = 0, prev = s[0]?.[0] || 0; const lapTimes = []; let lapStart = 0, lapNo = s[0]?.[3];
      let minLap = Infinity, maxLap = -Infinity, lapBack = 0, prevLap = s[0]?.[3];
      for (const r of s) { const dt = Math.max(0, Math.min(0.2, r[0] - prev)); prev = r[0]; tot += dt; if (r[2] === 1) lead += dt; if (Math.abs(r[4]) > 1) off += dt; if (r[5]) wall += dt;
        if (r[3] !== lapNo) { lapTimes.push(Number((r[0] - lapStart).toFixed(2))); lapStart = r[0]; lapNo = r[3]; }
        if (r[3] < prevLap) lapBack += 1; prevLap = r[3]; }
      const speeds = s.map((r) => r[1]).sort((a, b) => a - b);
      return { finished: t.finished, position: t.position, raceTime: t.raceTime, lap: t.lap, laps: t.laps, handling: t.handling, track: t.track,
        spinOuts: t.spinOuts, rescues: t.rescues, wallHits: t.classicWallHits, turbos: t.classicTurbos, backfires: t.classicBackfires, hang: t.classicHangBoosts, coins: t.coins, coinsLost: t.classicCoinsLost,
        itemPickups: t.itemPickups, boostHits: t.boostHits, slipstreams: t.slipstreams, rivalPositions: t.rivalPositions, renderScale: t.renderScale, rocketStart: t.rocketStart,
        leadShare: +(lead / tot).toFixed(3), offRoadShare: +(off / tot).toFixed(3), wallShare: +(wall / tot).toFixed(3), lapTimes, lapBackwards: lapBack,
        p50speed: speeds[Math.floor(speeds.length * 0.5)], p90speed: speeds[Math.floor(speeds.length * 0.9)], maxSpeed: speeds[speeds.length - 1],
        frames: ft.length, ftP50: +pct(0.5).toFixed(1), ftP95: +pct(0.95).toFixed(1), ftP99: +pct(0.99).toFixed(1), ftMax: +ft[ft.length - 1].toFixed(1), over50: ft.filter((x) => x > 50).length, over100: ft.filter((x) => x > 100).length,
        resultsText: document.querySelector('[data-testid="race-results-standings"]')?.innerText?.slice(0, 600) || null };
    });
    result = { ...result, finishedInTime: fin, wallMs: Date.now() - t0, ...data };
  } catch (e) { result.error = String(e).slice(0, 300); }
  result.pageErrors = errors; result.consoleErrors = [...new Set(consoleErrors)].slice(0, 12); result.failedRequests = failedReq.slice(0, 8);
  report.push(result);
  console.log(JSON.stringify({ name, pos: result.position, time: result.raceTime, fin: result.finished, spin: result.spinOuts, resc: result.rescues, wall: result.wallHits, lead: result.leadShare, off: result.offRoadShare, ftP95: result.ftP95, err: errors.length, cerr: result.consoleErrors.length, e: result.error }));
  writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1));
  await context.close();
}
await browser.close();
