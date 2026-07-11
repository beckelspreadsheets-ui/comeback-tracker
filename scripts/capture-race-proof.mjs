#!/usr/bin/env node
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.RACE_PROOF_PORT || 5307);
const baseUrl = `http://127.0.0.1:${port}`;
const startedAt = new Date().toISOString();
const runId = `${startedAt.replace(/[:.]/g, '-') }__race-proof`;
const runDir = path.join(root, 'asset-pipeline', 'proof', 'runs', runId);
const configPath = path.join(root, 'asset-pipeline', 'config', 'proof-scenarios.json');
// The env value IS the npm script that serves the app. K1 adds the kart-build
// variants (preview:kart serves dist-kart, dev:kart the kart entry from
// source); unset = fitness preview, byte-for-byte the pre-K1 behavior.
const SERVER_MODES = new Set(['preview', 'dev', 'preview:kart', 'dev:kart']);
const serverMode = SERVER_MODES.has(process.env.RACE_PROOF_SERVER_MODE)
  ? process.env.RACE_PROOF_SERVER_MODE
  : 'preview';

const fail = (message, detail = {}) => {
  const error = new Error(message);
  error.detail = detail;
  throw error;
};

const waitForServer = async (url, timeoutMs = 30000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  fail('Vite server did not become ready', { url });
};

const buildRaceUrl = (query = {}) => {
  const params = new URLSearchParams(query);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return `${baseUrl}/${suffix}#race`;
};

const sanitizeConsole = (message) => ({
  location: message.location?.() || null,
  text: message.text(),
  type: message.type(),
});

const readPageFacts = async (page) =>
  page.evaluate(() => {
    const shell = document.querySelector('[data-testid="comeback-city-3d-kart-race"]');
    return {
      oldArcadeCanvasCount: document.querySelectorAll('.arcade-race-canvas, canvas[data-race-renderer="webgl"]').length,
      oldFallbackCanvasCount: document.querySelectorAll('[data-testid="race-fallback-canvas"], .race-canvas').length,
      pixiCanvasCount: document.querySelectorAll('canvas[data-race-renderer="pixi-kart"][data-visual-canvas="race"]').length,
      propCount: Number(shell?.dataset?.propCount || 0),
      renderer: shell?.dataset?.raceRenderer || null,
      shellVisible: Boolean(shell),
      threeCanvasCount: document.querySelectorAll('canvas[data-race-renderer="three-kart"][data-visual-canvas="race"]').length,
      trackVisualsEnabled: shell?.dataset?.trackVisualsEnabled || null,
    };
  });

const readTelemetry = async (page) =>
  page.evaluate(() => window.__comebackCityKartTelemetry || null);

const readResourceSummary = async (page) =>
  page.evaluate(() => {
    const resources = performance.getEntriesByType('resource').map((entry) => ({
      encodedBodySize: Math.round(entry.encodedBodySize || 0),
      name: entry.name,
      transferSize: Math.round(entry.transferSize || 0),
    }));
    return {
      count: resources.length,
      resources,
      totalEncodedBodySize: resources.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
      totalTransferSize: resources.reduce((sum, entry) => sum + entry.transferSize, 0),
    };
  });

const installPageObservers = (page, bucket) => {
  page.on('console', (message) => bucket.console.push(sanitizeConsole(message)));
  page.on('pageerror', (error) => bucket.pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    bucket.networkFailures.push({
      failure: request.failure()?.errorText || 'unknown',
      method: request.method(),
      url: request.url(),
    });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      bucket.httpErrors.push({
        status: response.status(),
        url: response.url(),
      });
    }
  });
};

const mockLocalSync = async (context) => {
  await context.route('**/api/sync/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname.endsWith('/me')) {
      await route.fulfill({
        body: JSON.stringify({
          profiles: [
            {
              displayName: 'Race Proof',
              hasState: false,
              userId: 'race-proof',
            },
          ],
          user: {
            canView: ['race-proof'],
            displayName: 'Race Proof',
            userId: 'race-proof',
          },
        }),
        contentType: 'application/json',
        status: 200,
      });
      return;
    }
    if (method === 'PUT') {
      await route.fulfill({
        body: JSON.stringify({ rev: 1, updatedAt: new Date().toISOString(), userId: 'race-proof' }),
        contentType: 'application/json',
        status: 200,
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({ rev: null, state: null, updatedAt: null, userId: 'race-proof' }),
      contentType: 'application/json',
      status: 200,
    });
  });
};

const waitForRace = async (page, scenarioKey) => {
  await page.waitForSelector('[data-testid="comeback-city-3d-kart-race"][data-race-renderer="three-kart"]', {
    timeout: 20000,
  });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
    timeout: 20000,
  });
  const facts = await readPageFacts(page);
  if (facts.renderer !== 'three-kart' || facts.threeCanvasCount !== 1 || facts.pixiCanvasCount !== 0) {
    fail(`${scenarioKey}: race shell did not mount the expected Three renderer`, facts);
  }
  return facts;
};

const captureTimedEvidence = async ({ config, page, scenarioDir }) => {
  const durationMs = config.capture.durationMs;
  const sampleIntervalMs = config.capture.sampleIntervalMs;
  const marks = config.capture.screenshotMarks.map((mark) => ({ ...mark, captured: false }));
  const samples = [];
  const screenshots = [];
  const started = Date.now();
  let nextSampleAt = 0;

  while (Date.now() - started <= durationMs + 150) {
    const elapsedMs = Date.now() - started;
    for (const mark of marks) {
      if (!mark.captured && elapsedMs >= mark.atMs) {
        const fileName = `${mark.key}.png`;
        await page.screenshot({ fullPage: false, path: path.join(scenarioDir, fileName) });
        screenshots.push({ atMs: Math.round(elapsedMs), key: mark.key, path: fileName });
        mark.captured = true;
      }
    }
    if (elapsedMs >= nextSampleAt) {
      samples.push({
        atMs: Math.round(elapsedMs),
        telemetry: await readTelemetry(page),
      });
      nextSampleAt += sampleIntervalMs;
    }
    const nextMark = marks.filter((mark) => !mark.captured).map((mark) => mark.atMs).sort((a, b) => a - b)[0];
    const nextDue = Math.min(nextSampleAt, nextMark ?? durationMs);
    const waitMs = Math.max(80, Math.min(250, nextDue - elapsedMs));
    await page.waitForTimeout(waitMs);
  }
  return { samples, screenshots };
};

const captureTopDown = async ({ browser, config, scenario, scenarioDir }) => {
  if (!config.topDown?.enabled) return null;
  const bucket = { console: [], httpErrors: [], networkFailures: [], pageErrors: [] };
  const context = await browser.newContext({
    deviceScaleFactor: scenario.deviceScaleFactor || 1,
    viewport: scenario.viewport,
  });
  await mockLocalSync(context);
  const page = await context.newPage();
  installPageObservers(page, bucket);
  await page.goto(buildRaceUrl(config.topDown.query), { waitUntil: 'networkidle' });
  await waitForRace(page, `${scenario.key}-top-down`);
  await page.waitForTimeout(config.topDown.atMs);
  const fileName = 'top-down.png';
  await page.screenshot({ fullPage: false, path: path.join(scenarioDir, fileName) });
  const telemetry = await readTelemetry(page);
  const facts = await readPageFacts(page);
  await context.close();
  return {
    facts,
    observers: bucket,
    path: fileName,
    telemetry,
  };
};

const captureScenario = async ({ browser, config, scenario }) => {
  const scenarioDir = path.join(runDir, scenario.key);
  await mkdir(scenarioDir, { recursive: true });
  const bucket = { console: [], httpErrors: [], networkFailures: [], pageErrors: [] };
  const context = await browser.newContext({
    deviceScaleFactor: scenario.deviceScaleFactor || 1,
    recordVideo: { dir: scenarioDir, size: scenario.viewport },
    viewport: scenario.viewport,
  });
  await mockLocalSync(context);
  const page = await context.newPage();
  const video = page.video();
  installPageObservers(page, bucket);
  await page.goto(buildRaceUrl(config.query), { waitUntil: 'networkidle' });
  const facts = await waitForRace(page, scenario.key);
  const timed = await captureTimedEvidence({ config, page, scenarioDir });
  const finalTelemetry = await readTelemetry(page);
  const resources = await readResourceSummary(page);
  await page.close();
  await context.close();
  const rawVideoPath = await video.path();
  const videoFileName = `${scenario.key}-10s.webm`;
  await copyFile(rawVideoPath, path.join(scenarioDir, videoFileName));
  const topDown = await captureTopDown({ browser, config, scenario, scenarioDir });
  return {
    facts,
    finalTelemetry,
    key: scenario.key,
    label: scenario.label,
    observers: bucket,
    resources,
    screenshots: timed.screenshots,
    telemetrySamples: timed.samples,
    topDown,
    video: videoFileName,
    viewport: scenario.viewport,
  };
};

const writeContactSheet = async (report) => {
  const cards = [];
  for (const scenario of report.scenarios) {
    for (const shot of scenario.screenshots) {
      cards.push({
        label: `${scenario.key} ${shot.key}`,
        path: `${scenario.key}/${shot.path}`,
      });
    }
    if (scenario.topDown) {
      cards.push({
        label: `${scenario.key} top-down`,
        path: `${scenario.key}/${scenario.topDown.path}`,
      });
    }
  }
  const htmlCards = cards
    .map((card) => `<figure><figcaption>${card.label}</figcaption><img src="${card.path}" alt="${card.label}"></figure>`)
    .join('\n');
  await writeFile(
    path.join(runDir, 'visual-review-contact-sheet.html'),
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Race Proof Contact Sheet</title>
  <style>
    body { margin: 0; background: #06111f; color: #edf7ff; font: 14px system-ui, sans-serif; }
    header { padding: 16px 20px; background: #020813; border-bottom: 1px solid rgba(120,233,255,.3); }
    h1 { margin: 0; font-size: 18px; }
    main { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 14px; padding: 14px; }
    figure { margin: 0; border: 1px solid rgba(120,233,255,.28); background: rgba(5,17,29,.88); }
    figcaption { padding: 9px 11px; font-weight: 800; text-transform: uppercase; }
    img { display: block; width: 100%; height: auto; }
  </style>
</head>
<body>
  <header><h1>Race Proof Contact Sheet</h1></header>
  <main>${htmlCards}</main>
</body>
</html>
`
  );
};

const formatSummary = (report) => `# Race Proof Capture ${report.runId}

- Started: \`${report.startedAt}\`
- Base URL: \`${report.baseUrl}\`
- Scenarios: ${report.scenarios.length}
- Contact sheet: \`${report.contactSheet}\`

## Captures

| Scenario | Screenshots | Top-down | Video | Telemetry samples | Console errors | Network failures |
| --- | ---: | --- | --- | ---: | ---: | ---: |
${report.scenarios.map((scenario) => {
  const consoleErrors = scenario.observers.console.filter((entry) => entry.type === 'error').length + scenario.observers.pageErrors.length;
  const networkFailures = scenario.observers.networkFailures.length + scenario.observers.httpErrors.length;
  return `| ${scenario.key} | ${scenario.screenshots.length} | ${scenario.topDown ? 'yes' : 'no'} | \`${scenario.key}/${scenario.video}\` | ${scenario.telemetrySamples.length} | ${consoleErrors} | ${networkFailures} |`;
}).join('\n')}
`;

const run = async () => {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  await mkdir(runDir, { recursive: true });
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const server = spawn(npm, ['run', serverMode, '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverLog = '';
  server.stdout.on('data', (chunk) => {
    serverLog += chunk.toString();
  });
  server.stderr.on('data', (chunk) => {
    serverLog += chunk.toString();
  });

  let browser;
  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch({ headless: true });
    const scenarios = [];
    for (const scenario of config.scenarios) {
      scenarios.push(await captureScenario({ browser, config, scenario }));
    }
    const report = {
      baseUrl,
      configPath: path.relative(root, configPath),
      contactSheet: path.relative(root, path.join(runDir, 'visual-review-contact-sheet.html')),
      runDir: path.relative(root, runDir),
      runId,
      scenarios,
      serverMode,
      startedAt,
    };
    await writeContactSheet(report);
    await writeFile(path.join(runDir, 'proof-run.json'), `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(path.join(runDir, 'proof-run.md'), formatSummary(report));
    await writeFile(path.join(root, 'asset-pipeline', 'proof', 'latest-proof-run.json'), `${JSON.stringify({
      runDir: report.runDir,
      runId,
    }, null, 2)}\n`);
    console.log(`Race proof written to ${path.relative(root, runDir)}`);
    console.log(`scenarios=${scenarios.length} contactSheet=${report.contactSheet}`);
  } catch (error) {
    if (serverLog) error.serverLog = serverLog.slice(-4000);
    throw error;
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
};

run().catch((error) => {
  console.error(error.stack || error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  if (error.serverLog) console.error(error.serverLog);
  process.exit(1);
});
