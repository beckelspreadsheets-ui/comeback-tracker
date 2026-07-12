// K2.5 phase 1: reproduce + capture the three CC launch sites the owner
// reported as "flying in the air ... doesn't show you the ramp".
//   Sites: ramp-A progress 0.075 (side -0.35) · crest 0.467 (any lane,
//   big launch) · ramp-B 0.685 (side +0.35). Dare shortcut 0.212 logged
//   too if hit.
// Run 1 (autoplay): guaranteed crest coverage — the bot hugs center, so
// lane ramps only trigger if dodge bias pushes it wide.
// Run 2 (scripted driver, only for sites run 1 missed): keyboard P-control
// on telemetry.lane (added for this task) steers onto each ramp.
// Outputs in tmp/k2.5-launch-repro/: full webms, per-launch 8s clips
// (ffmpeg), screenshot bursts (approach/launch/apex/landing), launches.json.
// Run: node tmp/k2.5-launch-repro/capture-launches.mjs
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = 'tmp/k2.5-launch-repro';
const PORT = 5329;
const BASE = `http://localhost:${PORT}`;
const SITES = [
  { key: 'ramp-A', progress: 0.075, lane: -0.35, window: 0.035 },
  { key: 'dare', progress: 0.212, lane: -0.35, window: 0.03 },
  { key: 'crest', progress: 0.467, lane: 0, window: 0.045 },
  { key: 'ramp-B', progress: 0.685, lane: 0.35, window: 0.035 },
];
const wrapDelta = (a, b) => {
  const d = Math.abs(a - b) % 1;
  return Math.min(d, 1 - d);
};
const siteFor = (progress) =>
  SITES.find((s) => wrapDelta(progress, s.progress) < s.window)?.key || 'other';

mkdirSync(OUT, { recursive: true });
const server = spawn('npx', ['vite', 'preview', '--config', 'vite.config.kart.js', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
});
await new Promise((resolve) => setTimeout(resolve, 2500));

const browser = await chromium.launch();
const launches = [];

const sampleLoop = async (page, label, videoT0, maxMs, screenshotSites) => {
  const samples = [];
  let wasAirborne = false;
  let pending = null; // in-flight screenshot burst
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const t = await page.evaluate(() => {
      const w = window.__comebackCityKartTelemetry;
      return w && {
        airborne: w.airborne, lane: w.lane, lap: w.lap, progress: w.routeProgress,
        raceTime: w.raceTime, speed: w.speed, finished: w.finished,
      };
    }).catch(() => null);
    if (t) {
      samples.push({ wall: Date.now(), ...t });
      if (t.airborne && !wasAirborne) {
        const site = siteFor(t.progress);
        const rec = {
          run: label, site, lap: t.lap, raceTime: t.raceTime, progress: t.progress,
          lane: t.lane, speed: t.speed, videoSec: Number(((Date.now() - videoT0) / 1000).toFixed(1)),
        };
        launches.push(rec);
        console.log('LAUNCH', JSON.stringify(rec));
        if (screenshotSites.has(site) && !pending) {
          const tag = `${site}-${label}-lap${t.lap}`;
          pending = (async () => {
            await page.screenshot({ path: `${OUT}/${tag}-launch.png` });
            await page.waitForTimeout(500);
            await page.screenshot({ path: `${OUT}/${tag}-apex.png` });
            await page.waitForTimeout(650);
            await page.screenshot({ path: `${OUT}/${tag}-landing.png` });
            pending = null;
          })();
        }
      }
      wasAirborne = t.airborne;
      if (t.finished || t.lap > 3) break;
    }
    await page.waitForTimeout(70);
  }
  if (pending) await pending;
  writeFileSync(`${OUT}/telemetry-${label}.json`, JSON.stringify(samples));
  return samples;
};

// ---------- Run 1: autoplay ----------
{
  const ctx = await browser.newContext({
    recordVideo: { dir: OUT, size: { width: 1365, height: 768 } },
    viewport: { width: 1365, height: 768 },
  });
  const page = await ctx.newPage();
  const videoT0 = Date.now();
  await page.goto(`${BASE}/?raceAutoplay=1&track=comeback-city#race`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 45000 });
  await sampleLoop(page, 'autoplay', videoT0, 150000, new Set(['ramp-A', 'crest', 'ramp-B']));
  const video = page.video();
  await ctx.close();
  const file = await video.path();
  renameSync(file, `${OUT}/run-autoplay.webm`);
}

// ---------- Run 2: scripted driver for any site the bot missed ----------
const covered = new Set(launches.map((l) => l.site));
const missed = SITES.filter((s) => s.key !== 'dare' && s.key !== 'crest' && !covered.has(s.key));
if (missed.length) {
  console.log('bot missed:', missed.map((m) => m.key).join(', '), '— scripted driver run');
  const ctx = await browser.newContext({
    recordVideo: { dir: OUT, size: { width: 1365, height: 768 } },
    viewport: { width: 1365, height: 768 },
  });
  const page = await ctx.newPage();
  const videoT0 = Date.now();
  // A seeded ?track= deep-link goes straight into the race (one-shot seed +
  // webdriver intro skip) — no intro/select clicks needed.
  await page.goto(`${BASE}/?track=comeback-city#race`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 45000 });
  await page.keyboard.down('ArrowUp');

  // Steering sign probe: hold right 400ms once moving, watch lane delta.
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.speed > 60, null, { timeout: 30000 });
  const laneBefore = await page.evaluate(() => window.__comebackCityKartTelemetry.lane);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowRight');
  const laneAfter = await page.evaluate(() => window.__comebackCityKartTelemetry.lane);
  const rightSign = Math.sign(laneAfter - laneBefore) || 1; // lane delta per ArrowRight
  console.log(`steer probe: right => lane ${rightSign > 0 ? '+' : '-'}`);

  let steering = 0; // -1 left held, 1 right held, 0 none
  const setSteer = async (dir) => {
    if (dir === steering) return;
    if (steering === 1) await page.keyboard.up('ArrowRight');
    if (steering === -1) await page.keyboard.up('ArrowLeft');
    if (dir === 1) await page.keyboard.down('ArrowRight');
    if (dir === -1) await page.keyboard.down('ArrowLeft');
    steering = dir;
  };

  let wasAirborne = false;
  let pending = null;
  const samples = [];
  const started = Date.now();
  while (Date.now() - started < 200000) {
    const t = await page.evaluate(() => {
      const w = window.__comebackCityKartTelemetry;
      return w && {
        airborne: w.airborne, lane: w.lane, lap: w.lap, progress: w.routeProgress,
        raceTime: w.raceTime, speed: w.speed, finished: w.finished,
      };
    }).catch(() => null);
    if (t) {
      samples.push({ wall: Date.now(), ...t });
      // Target the next missed ramp's lane when approaching it; center else.
      const nextRamp = missed.find((s) => {
        const ahead = (s.progress - t.progress + 1) % 1;
        return ahead < 0.1 || ahead > 0.985;
      });
      const target = nextRamp ? nextRamp.lane : 0;
      if (!t.airborne) {
        const err = target - t.lane;
        await setSteer(Math.abs(err) < 0.05 ? 0 : Math.sign(err) * rightSign);
      }
      if (t.airborne && !wasAirborne) {
        const site = siteFor(t.progress);
        const rec = {
          run: 'driver', site, lap: t.lap, raceTime: t.raceTime, progress: t.progress,
          lane: t.lane, speed: t.speed, videoSec: Number(((Date.now() - videoT0) / 1000).toFixed(1)),
        };
        launches.push(rec);
        console.log('LAUNCH', JSON.stringify(rec));
        if (site !== 'other' && !pending) {
          const tag = `${site}-driver-lap${t.lap}`;
          pending = (async () => {
            await page.screenshot({ path: `${OUT}/${tag}-launch.png` });
            await page.waitForTimeout(500);
            await page.screenshot({ path: `${OUT}/${tag}-apex.png` });
            await page.waitForTimeout(650);
            await page.screenshot({ path: `${OUT}/${tag}-landing.png` });
            pending = null;
          })();
        }
      }
      wasAirborne = t.airborne;
      if (t.finished || t.lap > 3) break;
      if (missed.every((s) => launches.some((l) => l.site === s.key && l.run === 'driver'))) {
        if (t.lap >= 2) break; // got what we came for
      }
    }
    await page.waitForTimeout(60);
  }
  if (pending) await pending;
  writeFileSync(`${OUT}/telemetry-driver.json`, JSON.stringify(samples));
  const video = page.video();
  await ctx.close();
  const file = await video.path();
  renameSync(file, `${OUT}/run-driver.webm`);
}

await browser.close();
server.kill();

// ---------- ffmpeg per-launch clips ----------
const firstPerSiteRun = new Map();
for (const l of launches) {
  const k = `${l.site}:${l.run}`;
  if (l.site !== 'other' && !firstPerSiteRun.has(k)) firstPerSiteRun.set(k, l);
}
for (const l of firstPerSiteRun.values()) {
  const src = `${OUT}/run-${l.run}.webm`;
  const dst = `${OUT}/clip-${l.site}-${l.run}.webm`;
  const start = Math.max(0, l.videoSec - 3.5);
  try {
    execFileSync('ffmpeg', ['-y', '-ss', String(start), '-i', src, '-t', '8', '-c:v', 'libvpx-vp9', '-b:v', '1.5M', '-an', dst], { stdio: 'ignore' });
    console.log('clip', dst);
  } catch (error) {
    console.log('clip failed', dst, error.message.split('\n')[0]);
  }
}

writeFileSync(`${OUT}/launches.json`, JSON.stringify({ capturedAt: new Date().toISOString(), launches }, null, 2));
console.log(`\n${launches.length} launches captured; sites: ${[...new Set(launches.map((l) => l.site))].join(', ')}`);
