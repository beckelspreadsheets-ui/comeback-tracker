// Is it actually a race? — the difficulty measurement.
//
//   npm run probe:difficulty
//
// The owner's report was "it's very easy to just mob around the whole map".
// That is a feel judgement and this machine cannot make feel judgements, but
// almost every part of it has a number behind it, and those numbers are what
// this prints:
//
//   FINISH      where the player came, and by how many seconds. A race whose
//               field arrives inside a second is a procession with a photo
//               finish bolted on; one where the player wins by ten never had
//               an opponent in it.
//   THROTTLE    the share of the race spent at 95%+ of the fastest speed the
//               run ever reached. This is "corners don't demand anything",
//               stated as a measurement: if it is high, the track can be taken
//               flat and there is no braking decision anywhere on the lap.
//   MISTAKES    spin-outs, and time spent off-road. If leaving the road costs
//               nothing, the racing line is not a line, it is a suggestion.
//
// IT MEASURES THE AUTOPLAY DRIVER, NOT THE OWNER. Autoplay is a fixed policy,
// which is exactly what makes it useful — it drives the same way before and
// after a change, so a difference in these numbers is a difference in the GAME
// rather than in who was holding it. It is not a substitute for him playing it.
//
// Frame RATE on this machine is worthless (load 8-32), but none of the above
// is a frame-rate number: the sim is dt-driven, so a slow frame advances the
// race by more per frame rather than differently. Runs are repeated and the
// spread is printed so noise is visible instead of assumed.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { chromiumGlArgs } from './lib/chromium-gl-args.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.DIFFICULTY_PROBE_PORT || 5331);
const baseUrl = process.env.DIFFICULTY_PROBE_URL || `http://127.0.0.1:${port}`;
const outputDir = path.join(root, 'tmp', 'kart-difficulty');
const TRACKS = (process.env.DIFFICULTY_PROBE_TRACKS || 'comeback-city,penguin-village').split(',');
const RUNS = Number(process.env.DIFFICULTY_PROBE_RUNS || 2);
// A race is ~134s of game time; this is the wall-clock ceiling per run.
const RACE_TIMEOUT_MS = Number(process.env.DIFFICULTY_PROBE_TIMEOUT_MS || 420000);
// Sampled off the running race rather than assumed, because kart stats and
// boosts both move the ceiling.
const FLAT_OUT_FRACTION = 0.95;

const waitForServer = async (url, timeoutMs = 40000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  throw new Error(`server never came up at ${url}`);
};

const mean = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
const spread = (values) => (values.length ? Math.max(...values) - Math.min(...values) : 0);

const runRace = async (browser, track, runIndex) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  // playableAutoplay drives the player with the shipped autoplay policy and
  // skips the menus. Same entry every other harness uses.
  // DIFFICULTY_PROBE_QUERY appends extra URL params, which is how the same
  // measurement runs against a variant instead of a second script. The one it
  // exists for is `freebody=1`: the free-body physics is fully built and gated
  // behind that flag (docs/FREE_BODY_PLAN.md, P1-P6), and comparing the two
  // needs identical instrumentation on both sides or the comparison is worth
  // nothing.
  const extraQuery = process.env.DIFFICULTY_PROBE_QUERY ? `&${process.env.DIFFICULTY_PROBE_QUERY}` : '';
  await page.goto(`${baseUrl}/?track=${track}&playableAutoplay=1${extraQuery}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
    timeout: 60000,
  });

  // Sample in the PAGE on rAF, not by polling from node: a node-side poll
  // samples wall-clock, and time spent at full throttle has to be measured in
  // race time or a slow frame counts the same as a fast one.
  await page.evaluate(() => {
    window.__difficultySamples = [];
    const tick = () => {
      const t = window.__comebackCityKartTelemetry;
      if (t && !t.finished) {
        window.__difficultySamples.push({
          lane: t.lane ?? null,
          lap: t.lap,
          position: t.position,
          raceTime: t.raceTime,
          speed: t.speed,
          spinOuts: t.spinOuts,
          wallContact: t.wallContact,
        });
      }
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  });

  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.finished === true, null, {
    timeout: RACE_TIMEOUT_MS,
  });
  // One extra beat so the finishing frame's telemetry is the published one.
  await page.waitForTimeout(500);

  const result = await page.evaluate(() => {
    const t = window.__comebackCityKartTelemetry || {};
    return {
      finished: t.finished,
      lap: t.lap,
      laps: t.laps,
      position: t.position,
      raceTime: t.raceTime,
      rivalPositions: t.rivalPositions || [],
      rescues: t.rescues ?? 0,
      samples: window.__difficultySamples || [],
      spinOuts: t.spinOuts,
    };
  });
  await page.close();

  const samples = result.samples;
  const topSpeed = samples.reduce((best, sample) => Math.max(best, sample.speed || 0), 0);
  // The ceiling is the 90th percentile of speed, NOT the maximum. Boosts and
  // mini-turbos put the peak well above anything the kart can hold — the first
  // cut of this used the max and measured 295 km/h on a kart that cruises near
  // 230, so "95% of top speed" was a bar only a boost could clear and the
  // metric reported 13% for a race that is mostly flat out. p90 is the fastest
  // the driver actually SUSTAINS, which is what corners are supposed to
  // interrupt.
  const speeds = samples.map((sample) => sample.speed || 0).sort((a, b) => a - b);
  const percentile = (fraction) => speeds[Math.min(speeds.length - 1, Math.floor(speeds.length * fraction))] || 0;
  const cruiseCeiling = percentile(0.9);
  const flatOutBar = cruiseCeiling * FLAT_OUT_FRACTION;
  // Weight each sample by the race time it represents, so the share is a share
  // of the RACE and not of the frames — a stutter must not count as a corner.
  let totalTime = 0;
  let flatOutTime = 0;
  let offRoadTime = 0;
  let leadTime = 0;
  let leadChanges = 0;
  let previousRaceTime = samples[0]?.raceTime ?? 0;
  let previousPosition = samples[0]?.position ?? 4;
  samples.forEach((sample) => {
    const step = Math.max(0, Math.min(0.2, (sample.raceTime ?? 0) - previousRaceTime));
    previousRaceTime = sample.raceTime ?? previousRaceTime;
    totalTime += step;
    if ((sample.speed || 0) >= flatOutBar) flatOutTime += step;
    if (Math.abs(sample.lane ?? 0) > 1) offRoadTime += step;
    // Telemetry publishes the player's own position, so the standings are read
    // from the one number that is always there. Time spent leading is the
    // honest form of "do the rivals threaten me": a player who takes P1 early
    // and never sees it again was never racing anyone, whatever the finishing
    // margin says.
    if (sample.position === 1) leadTime += step;
    if (sample.position !== previousPosition) {
      if (sample.position === 1 || previousPosition === 1) leadChanges += 1;
      previousPosition = sample.position;
    }
  });

  return {
    cruiseCeiling,
    // How much the corners actually take out of the car: the slowest tenth of
    // the race against the fastest tenth. Near 1 means the speed trace is a
    // flat line and there is no braking decision anywhere on the lap.
    slowFastRatio: cruiseCeiling > 0 ? percentile(0.1) / cruiseCeiling : 0,
    flatOutShare: totalTime > 0 ? flatOutTime / totalTime : 0,
    leadChanges,
    leadShare: totalTime > 0 ? leadTime / totalTime : 0,
    offRoadShare: totalTime > 0 ? offRoadTime / totalTime : 0,
    position: result.position,
    raceTime: result.raceTime,
    rivalPositions: result.rivalPositions,
    rescues: result.rescues,
    run: runIndex,
    sampleCount: samples.length,
    spinOuts: result.spinOuts,
    topSpeed,
    track,
  };
};

const run = async () => {
  await mkdir(outputDir, { recursive: true });
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const server = process.env.DIFFICULTY_PROBE_URL
    ? null
    : spawn(npm, ['run', 'dev:kart', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
        cwd: root,
        stdio: 'ignore',
      });
  let browser = null;
  try {
    if (server) await waitForServer(baseUrl);
    browser = await chromium.launch({ args: chromiumGlArgs() });
    const results = [];
    for (const track of TRACKS) {
      for (let index = 0; index < RUNS; index += 1) {
        // eslint-disable-next-line no-await-in-loop
        results.push(await runRace(browser, track, index));
      }
    }

    const lines = ['KART DIFFICULTY PROBE — autoplay driver, dt-driven, load-independent', ''];
    for (const track of TRACKS) {
      const forTrack = results.filter((result) => result.track === track);
      if (!forTrack.length) continue;
      const positions = forTrack.map((result) => result.position);
      const times = forTrack.map((result) => result.raceTime);
      lines.push(track);
      lines.push(
        `  finish position       ${positions.join(' / ')}   (1 = won; the player starts P4 of 4)`
      );
      lines.push(`  race time             ${times.map((time) => time.toFixed(1)).join(' / ')} s`);
      lines.push(
        `  LED THE RACE FOR      ${forTrack
          .map((result) => `${(result.leadShare * 100).toFixed(0)}%`)
          .join(' / ')}   of the distance — near 100% means nobody ever threatened`
      );
      lines.push(
        `  lead changes          ${forTrack.map((result) => result.leadChanges).join(' / ')}   (0 = a procession)`
      );
      lines.push(
        `  order at the flag     ${forTrack
          .map((result) => (result.rivalPositions || []).map((entry) => entry.name).join(' > '))
          .join('   |   ')}`
      );
      lines.push(
        `  FLAT OUT              ${forTrack
          .map((result) => `${(result.flatOutShare * 100).toFixed(0)}%`)
          .join(' / ')}   of the race at 95%+ of sustained pace — high means corners cost nothing`
      );
      lines.push(
        `  slowest/fastest 10%   ${forTrack
          .map((result) => result.slowFastRatio.toFixed(2))
          .join(' / ')}   (near 1.00 = the speed trace is a flat line)`
      );
      lines.push(
        `  off-road              ${forTrack.map((result) => `${(result.offRoadShare * 100).toFixed(1)}%`).join(' / ')}`
      );
      lines.push(`  spin-outs             ${forTrack.map((result) => result.spinOuts).join(' / ')}`);
      // P7: with ?freebody=1 this is the number that used to be the whole
      // story (the rescue loop). On rails it is structurally 0.
      lines.push(`  rescues               ${forTrack.map((result) => result.rescues).join(' / ')}`);
      lines.push(`  top speed             ${forTrack.map((result) => result.topSpeed).join(' / ')} km/h`);
      lines.push(
        `  run-to-run spread     race time ${spread(times).toFixed(1)}s, flat-out ${(
          spread(forTrack.map((result) => result.flatOutShare)) * 100
        ).toFixed(0)} points   (this is the noise floor — ignore changes smaller than it)`
      );
      lines.push('');
    }

    await writeFile(
      path.join(outputDir, 'kart-difficulty-report.json'),
      `${JSON.stringify({ capturedAt: new Date().toISOString(), results }, null, 2)}\n`
    );
    process.stdout.write(`${lines.join('\n')}\n`);
    process.stdout.write(`full report: tmp/kart-difficulty/kart-difficulty-report.json\n`);
    // Averages, because a single number is what gets quoted later.
    process.stdout.write(
      `overall: flat-out ${(mean(results.map((r) => r.flatOutShare)) * 100).toFixed(0)}%, wins ${
        results.filter((r) => r.position === 1).length
      }/${results.length}\n`
    );
  } catch (error) {
    process.stderr.write(`FAIL: ${error.message}\n`);
    process.exitCode = 1;
  } finally {
    await browser?.close();
    server?.kill('SIGTERM');
  }
};

run();
