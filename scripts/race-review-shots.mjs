// Review frames for approval pages and bug hunts (NOT a quality/fps
// measurement: the owner's machine runs a VM and backups, so timing is noise).
// Boots a built kart preview once and screenshots each variant at race-time,
// progress or boost-hit marks.
//
//   npm run build:kart
//   node scripts/race-review-shots.mjs <outDir> '<variants json>'
//
// variants: [{ name, track, query?, phone?, viewport?, camLab?: {back,height,lookAhead,lookUp},
//              marks: [{ label, at: 'grid' | <seconds> | {p: <0-1>} | {boostHit: n, after?: ms} }] }]
// Marks must be in increasing order within a variant. `phone: true` gives an
// 844x390 touch context at 2x; add `&touchControls=1` to the query for the
// touch HUD. Prints one line per shot with race time and render scale.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { chromiumGlArgs } from './lib/chromium-gl-args.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'tmp/review-shots');
const VARIANTS = JSON.parse(process.argv[3] || '[]');
const PORT = Number(process.env.REVIEW_SHOTS_PORT || 5331);
const external = process.env.REVIEW_SHOTS_URL;
const baseUrl = external || `http://127.0.0.1:${PORT}`;
mkdirSync(OUT, { recursive: true });

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

const server = external
  ? null
  : spawn('npx', ['vite', 'preview', '--config', 'vite.config.kart.js', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
      cwd: root,
      stdio: 'ignore',
    });
const report = [];
let browser;
try {
  if (!(await waitForServer(`${baseUrl}/`, 60000))) throw new Error('server never came up (run npm run build:kart first)');
  browser = await chromium.launch({ args: chromiumGlArgs() });
  for (const variant of VARIANTS) {
    const viewport = variant.viewport || (variant.phone ? { width: 844, height: 390 } : { width: 1366, height: 768 });
    const context = await browser.newContext({
      deviceScaleFactor: variant.phone ? 2 : 1,
      hasTouch: Boolean(variant.phone),
      isMobile: Boolean(variant.phone),
      viewport,
    });
    if (variant.camLab) {
      await context.addInitScript((overrides) => {
        window.__camLabOverrides = overrides;
      }, variant.camLab);
    }
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error).slice(0, 300)));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text().slice(0, 300));
    });
    const url = `${baseUrl}/?playableAutoplay=1&track=${variant.track}${variant.query || ''}${variant.camLab ? '&camLab=1' : ''}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 90000 });
    const shots = [];
    for (const mark of variant.marks) {
      const deadline = Date.now() + 120000;
      let telemetry = null;
      while (Date.now() < deadline) {
        telemetry = await page.evaluate(() => {
          const t = window.__comebackCityKartTelemetry || {};
          return { boostHits: t.boostHits, countdown: t.countdown, p: t.routeProgress, raceTime: t.raceTime, renderScale: t.renderScale };
        });
        if (mark.at === 'grid') {
          if (telemetry.countdown != null && telemetry.countdown > 0 && telemetry.countdown < 2.6) break;
          if ((telemetry.raceTime ?? 0) > 0.05) break;
        } else if (typeof mark.at === 'object' && mark.at.boostHit) {
          if ((telemetry.boostHits ?? 0) >= mark.at.boostHit) {
            await page.waitForTimeout(mark.at.after ?? 150);
            break;
          }
        } else if (typeof mark.at === 'object') {
          // Progress mark on lap 1 (the race-time guard skips the pre-line spawn).
          if ((telemetry.raceTime ?? 0) > 2 && (telemetry.p ?? 0) >= mark.at.p) break;
        } else if ((telemetry.raceTime ?? 0) >= mark.at) break;
        await page.waitForTimeout(60);
      }
      const file = `${variant.name}-${mark.label}.png`;
      await page.screenshot({ path: path.join(OUT, file) });
      shots.push({ file, ...telemetry });
    }
    report.push({ errors, name: variant.name, shots, url });
    await context.close();
  }
} catch (error) {
  report.push({ fatal: String(error) });
} finally {
  writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  await browser?.close();
  server?.kill('SIGTERM');
}
for (const entry of report) {
  if (entry.fatal) console.log('FATAL', entry.fatal);
  else
    entry.shots.forEach((shot) =>
      console.log(`${shot.file} t=${shot.raceTime?.toFixed?.(2)} scale=${shot.renderScale} errors=${entry.errors.length}`)
    );
}
