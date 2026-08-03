// Measure MEAN_SPEED per track from a real autoplay race.
//
// WHAT THIS SETTLES. scripts/track-layout-preview.mjs turns world units into
// seconds using one number per track, and every layout verdict it reports —
// corner seconds, lateral load, lap and race time, sightline seconds, the
// wedge clip, the elevation band — is that number times some geometry. Until
// this script existed, one of those numbers was a reasoned estimate and the
// other was measured on a track that no longer exists:
//
//   penguin-village  260  labelled INFERRED in the previewer's own comment
//   comeback-city    260  measured from tmp/k2.5-launch-repro/telemetry-autoplay.json
//
// That capture drove the retired 2,897-unit loop. The previewer already refuses
// to grade lap time against it (TELEMETRY_MATCH_PCT rejects a capture whose
// implied lap is >12% from the track's own length, and this one is ~75% off) —
// so using the same file to set the scale that lap time is computed FROM, while
// refusing to use it to check the answer, is a gate duplicating the data it
// checks. Both tracks needed re-measuring on the 4x layouts, not just PV.
//
//   node scripts/measure-mean-speed.mjs
//   node scripts/measure-mean-speed.mjs --track penguin-village --runs 3
//
// Output: tmp/mean-speed/<track>-telemetry.json + a summary table on stdout.
//
// WHAT "MEAN SPEED" MEANS HERE. Not top speed, and not the mean of the speed
// samples. It is the number that satisfies lapUnits / meanSpeed = lapSeconds,
// which is a TIME average over a full lap — so it is derived from lap boundaries
// rather than from averaging a speed column, because the two differ whenever
// sampling is not perfectly uniform in time. Lap 1 is excluded: it contains the
// standing start, which is a property of the grid, not of the layout.
//
// ON MACHINE LOAD. This measures GAME time (raceTime), not wall time, and the
// engine's dt clamp makes those diverge under a slow renderer — see
// scripts/lib/chromium-gl-args.mjs. A game-time measurement survives that
// divergence, but chunky integration can still change how the AI takes a
// corner, so every run reports its own fps and wall-vs-game ratio and the
// script refuses runs that drift too far. A number you cannot see the
// conditions of is not a measurement.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { chromiumGlArgs, isSoftwareGl } from './lib/chromium-gl-args.mjs';
import { KART_TRACKS, trackByKey } from '../src/game/race/tracks/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1] !== undefined) return argv[index + 1];
  return fallback;
};

const SERVER_MODE = arg('server', 'dev:kart');
const PORT = Number(arg('port', process.env.MEAN_SPEED_PORT || 5413));
const RUNS = Number(arg('runs', 2));
const TRACKS = arg('track') ? arg('track').split(',').map((t) => t.trim()) : KART_TRACKS.map((t) => t.key);
const OUT_DIR = path.join(root, 'tmp', 'mean-speed');
const TIMEOUT_MS = Number(arg('timeout', isSoftwareGl() ? 600000 : 180000));

// A run whose game clock has drifted this far from the wall clock was measured
// under a renderer slow enough that the physics stepped differently from the
// one the player drives. Reported, not silently dropped.
const WALL_RATIO_TOLERANCE = 0.25;
// Two laps that disagree by more than this are not measuring a stable racing
// pace — most likely the AI hit something.
const LAP_SPREAD_TOLERANCE_PCT = 6;

const log = (...args) => console.log('[mean-speed]', ...args);

const waitForServer = async (url, deadlineMs) => {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok || response.status === 404) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  return false;
};

// Lap times from progress wraps. Returns one entry per COMPLETED lap, each
// carrying the game time it took and the wall time it took, so the two clocks
// can be compared afterwards.
const lapsFrom = (samples) => {
  const laps = [];
  let previous = samples[0];
  let lapStartRace = null;
  let lapStartWall = null;
  for (const sample of samples) {
    if (sample.progress < previous.progress - 0.5) {
      if (lapStartRace !== null) {
        laps.push({
          raceSeconds: previous.raceTime - lapStartRace,
          wallSeconds: (previous.wall - lapStartWall) / 1000,
        });
      }
      lapStartRace = previous.raceTime;
      lapStartWall = previous.wall;
    }
    previous = sample;
  }
  return laps;
};

const mean = (values) => values.reduce((a, b) => a + b, 0) / (values.length || 1);
const round = (value, dp = 1) => Number(value.toFixed(dp));

mkdirSync(OUT_DIR, { recursive: true });

const server = spawn('npm', ['run', SERVER_MODE, '--', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
});

let exitCode = 0;
let browser = null;
const results = {};

try {
  if (!(await waitForServer(`http://127.0.0.1:${PORT}/`, 60000))) {
    throw new Error(`server ${SERVER_MODE} never came up on port ${PORT}`);
  }
  browser = await chromium.launch({ headless: true, args: chromiumGlArgs() });

  for (const trackKey of TRACKS) {
    const trackDef = trackByKey(trackKey);
    if (!trackDef) throw new Error(`unknown track ${trackKey}`);
    const runs = [];

    for (let run = 0; run < RUNS; run += 1) {
      const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
      page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

      await page.goto(`http://127.0.0.1:${PORT}/?playableAutoplay=1&track=${trackKey}`, {
        waitUntil: 'domcontentloaded',
      });
      const bootMs = isSoftwareGl() ? 300000 : 45000;
      await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
        timeout: bootMs,
      });
      await page.waitForFunction(() => (window.__comebackCityKartTelemetry?.countdown ?? 99) <= 0, null, {
        timeout: bootMs,
      });

      const samples = [];
      const deadline = Date.now() + TIMEOUT_MS;
      while (Date.now() < deadline) {
        const sample = await page.evaluate(() => {
          const t = window.__comebackCityKartTelemetry || {};
          return {
            progress: t.routeProgress ?? -1,
            raceTime: t.raceTime ?? -1,
            speed: t.speed ?? 0,
            lap: t.lap ?? -1,
            finished: Boolean(t.finished),
            fps: t.fpsEstimate ?? null,
          };
        });
        samples.push({ ...sample, wall: Date.now() });
        if (sample.finished) break;
        await page.waitForTimeout(25);
      }
      await page.close();

      const finished = samples.at(-1)?.finished === true;
      const laps = lapsFrom(samples);
      // Lap 1 carries the standing start. Everything after it is racing pace.
      const racingLaps = laps.slice(1);
      const lapSeconds = racingLaps.map((l) => l.raceSeconds);
      const spreadPct = lapSeconds.length > 1 ? ((Math.max(...lapSeconds) - Math.min(...lapSeconds)) / mean(lapSeconds)) * 100 : 0;
      const wallRatio = racingLaps.length ? mean(racingLaps.map((l) => l.wallSeconds)) / mean(lapSeconds) : null;
      const fpsSamples = samples.map((s) => s.fps).filter((v) => typeof v === 'number' && v > 0);

      runs.push({
        run: run + 1,
        finished,
        samples: samples.length,
        laps: laps.length,
        racingLapSeconds: lapSeconds.map((s) => round(s, 2)),
        lapSpreadPct: round(spreadPct, 2),
        meanFps: fpsSamples.length ? round(mean(fpsSamples)) : null,
        wallToGameRatio: wallRatio === null ? null : round(wallRatio, 3),
        consoleErrors: errors.slice(0, 5),
        rawSamples: samples,
      });
      log(
        `${trackKey} run ${run + 1}/${RUNS}: ${finished ? 'finished' : 'TIMED OUT'}, ` +
          `${laps.length} laps, racing laps ${lapSeconds.map((s) => s.toFixed(2)).join('/')}s, ` +
          `${fpsSamples.length ? `${round(mean(fpsSamples))}fps` : 'no fps'}, ` +
          `wall/game ${wallRatio === null ? '?' : wallRatio.toFixed(3)}`
      );
    }

    results[trackKey] = { track: trackKey, runs };
  }
} catch (error) {
  exitCode = 1;
  log('FAILED:', String(error?.message || error));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  setTimeout(() => server.kill('SIGKILL'), 2500).unref?.();
}

// -------- summary.
//
// Track length comes from the PREVIEWER, run as a child process, rather than by
// rebuilding the curve here. A third copy of makeSampler is a third thing to
// drift — which is the failure this whole phase started with. Running the real
// tool also means this measurement inherits its mirror check: if the previewer's
// sampler has drifted from the monolith, the child exits non-zero and this
// script reports no length rather than a confident wrong one.
const lengthsFromPreviewer = () => {
  const outDir = path.join(OUT_DIR, '_preview');
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, 'track-layout-preview.mjs'), '--json-only', '--out', outDir],
    { cwd: root, encoding: 'utf8' }
  );
  const lengths = {};
  for (const trackKey of TRACKS) {
    try {
      const report = JSON.parse(readFileSync(path.join(outDir, `${trackKey}-layout.json`), 'utf8'));
      lengths[trackKey] = report.lengthUnits;
    } catch {
      lengths[trackKey] = null;
    }
  }
  // The previewer exits 1 on a strict-gate failure too, so a non-zero status is
  // reported rather than treated as fatal — but a mirror failure invalidates
  // the lengths and must not pass silently.
  const mirrorFailed = /no longer mirrors the shipped one/.test(result.stderr || '');
  return { lengths, mirrorFailed, status: result.status };
};

if (Object.keys(results).length) {
  const { lengths, mirrorFailed } = lengthsFromPreviewer();
  if (mirrorFailed) {
    log('WARNING: the previewer reports its sampler no longer mirrors the monolith.');
    log('         Track lengths below are not trustworthy; fix the mirror first.');
    exitCode = 1;
  }
  process.stdout.write('\n');
  const summary = {};
  for (const [trackKey, entry] of Object.entries(results)) {
    const trackDef = trackByKey(trackKey);
    const good = entry.runs.filter(
      (r) => r.finished && r.racingLapSeconds.length && r.lapSpreadPct <= LAP_SPREAD_TOLERANCE_PCT
    );
    const usable = good.filter((r) => r.wallToGameRatio === null || Math.abs(r.wallToGameRatio - 1) <= WALL_RATIO_TOLERANCE);
    const allLaps = usable.flatMap((r) => r.racingLapSeconds);
    const meanLap = allLaps.length ? mean(allLaps) : null;
    const lengthUnits = lengths[trackKey] ?? null;
    summary[trackKey] = {
      runs: entry.runs.length,
      usableRuns: usable.length,
      racingLaps: allLaps,
      meanLapSeconds: meanLap === null ? null : round(meanLap, 2),
      lengthUnits,
      // The measurement. lapUnits / lapSeconds — a time average over a full
      // lap, which is what the previewer's unit-to-second conversion needs.
      meanSpeed: meanLap && lengthUnits ? round(lengthUnits / meanLap, 1) : null,
      meanFps: round(mean(entry.runs.map((r) => r.meanFps).filter(Boolean))),
      wallToGameRatio: round(mean(entry.runs.map((r) => r.wallToGameRatio).filter((v) => v !== null)), 3),
      rejected: entry.runs.length - usable.length,
      trackName: trackDef?.name || trackKey,
    };
    writeFileSync(
      path.join(OUT_DIR, `${trackKey}-telemetry.json`),
      `${JSON.stringify({ track: trackKey, runs: entry.runs }, null, 2)}\n`
    );
  }
  writeFileSync(path.join(OUT_DIR, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(
    'track             usable  length     mean lap   MEAN_SPEED   fps   wall/game\n' +
      Object.entries(summary)
        .map(
          ([key, s]) =>
            `${key.padEnd(18)}${String(`${s.usableRuns}/${s.runs}`).padEnd(8)}` +
            `${String(s.lengthUnits ?? '—').padEnd(11)}${String(s.meanLapSeconds ?? '—').padEnd(11)}` +
            `${String(s.meanSpeed ?? '—').padEnd(13)}${String(s.meanFps ?? '—').padEnd(6)}${s.wallToGameRatio ?? '—'}`
        )
        .join('\n') +
      '\n\nMEAN_SPEED = length / mean racing lap, lap 1 excluded (standing start).\n' +
      'Raw telemetry in tmp/mean-speed/. Put these in MEAN_SPEED in\n' +
      'scripts/track-layout-preview.mjs, with the date and the fps they were measured at.\n'
  );
}

process.exit(exitCode);
