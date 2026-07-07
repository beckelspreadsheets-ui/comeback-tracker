// W1 verification probe — four scenarios covering every mount path:
//  A) OWNER REPRO (human path, webdriver spoofed off): URL carries
//     ?track=comeback-city, user picks Penguin Village in the cup select →
//     the race MUST be penguin-village (this was the bug), and the select
//     must visibly preselect comeback-city from the seed.
//  B) QA seed path (#race route under webdriver, like test:kart-playable):
//     /?playableAutoplay=1&track=penguin-village#race → telemetry track PV.
//  C) Harness prop path (kart-playtest.html, like phase5):
//     /kart-playtest.html?raceAutoplay=1&track=penguin-village → PV.
//  D) ONE-SHOT SEED (in scenario A's context): the select params are
//     stripped from the URL once consumed, so exiting to Today and
//     re-entering #race preselects the SAVED pick (penguin-village), not
//     the stale ?track=comeback-city.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 5320;
const BASE = `http://127.0.0.1:${PORT}`;
const REPO = '/Users/andrewferguson/Downloads/comeback-tracker';

const fail = (msg, extra) => {
  console.error(`FAIL: ${msg}`, extra ?? '');
  process.exitCode = 1;
};

const waitForServer = async (url, timeoutMs = 60000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error(`vite not ready at ${url}`);
};

const waitForTelemetry = async (page, predicate, timeoutMs = 45000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const telemetry = await page.evaluate(() => window.__comebackCityKartTelemetry || null);
    if (telemetry && predicate(telemetry)) return telemetry;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return page.evaluate(() => window.__comebackCityKartTelemetry || null);
};

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: REPO,
  stdio: 'ignore',
  detached: false,
});

try {
  await waitForServer(BASE);
  const browser = await chromium.launch();

  // --- Scenario A: owner repro (human path) ---
  {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      Object.defineProperty(Object.getPrototypeOf(navigator), 'webdriver', { get: () => false });
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/?track=comeback-city#race`, { waitUntil: 'networkidle' });
    await page.getByTestId('race-intro-start').click({ timeout: 15000 });
    await page.getByTestId('race-character-select').waitFor({ timeout: 15000 });
    const ccClass = await page.getByTestId('race-track-comeback-city').getAttribute('class');
    const seedVisible = ccClass?.includes('#ffd34f');
    if (!seedVisible) fail('A: seed not visible — comeback-city tile not preselected from ?track=');
    else console.log('A1 PASS: select preselects comeback-city from the URL seed');
    await page.getByTestId('race-track-penguin-village').click();
    await page.getByTestId('race-character-start').click();
    const telemetry = await waitForTelemetry(page, (t) => t.renderer === 'three-kart');
    if (telemetry?.track === 'penguin-village') {
      console.log('A2 PASS: user pick beats stale ?track= param — race is penguin-village');
    } else {
      fail('A: race track should be penguin-village (the W1 bug)', telemetry?.track);
    }

    // --- Scenario D: one-shot seed — stale param must not re-seed re-entry ---
    const search = await page.evaluate(() => window.location.search);
    if (/track=/.test(search)) fail('D: ?track= should be stripped after consumption', search);
    else console.log('D1 PASS: select params stripped from URL after seeding');
    await page.getByTestId('race-exit-button').click();
    // Wait for the world hub to actually COMMIT (RaceScreen unmounted) before
    // re-entering: the hash clears synchronously inside the click handler, so
    // re-assigning '#race' too early re-selects a still-mounted RaceScreen
    // whose characterReady state survives — no select screen, probe flake.
    await page.getByTestId('playable-world-home').waitFor({ timeout: 15000 });
    await page.evaluate(() => {
      window.location.hash = '#race';
    });
    await page.getByTestId('race-character-select').waitFor({ timeout: 15000 });
    const pvClass = await page.getByTestId('race-track-penguin-village').getAttribute('class');
    if (pvClass?.includes('#ffd34f')) {
      console.log('D2 PASS: re-entry preselects the SAVED pick (penguin-village), not the stale param');
    } else {
      fail('D: re-entry should preselect penguin-village from localStorage');
    }
    await context.close();
  }

  // --- Scenario B: QA seed path on #race (webdriver true) ---
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/?playableAutoplay=1&track=penguin-village#race`, { waitUntil: 'networkidle' });
    const telemetry = await waitForTelemetry(page, (t) => t.renderer === 'three-kart');
    if (telemetry?.track === 'penguin-village') console.log('B PASS: #race QA URL still selects penguin-village via seed');
    else fail('B: #race QA URL lost ?track= behavior', telemetry?.track);
    await context.close();
  }

  // --- Scenario C: harness prop path (kart-playtest.html) ---
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/kart-playtest.html?raceAutoplay=1&track=penguin-village`, { waitUntil: 'networkidle' });
    const telemetry = await waitForTelemetry(page, (t) => t.renderer === 'three-kart');
    if (telemetry?.track === 'penguin-village') console.log('C PASS: kart-playtest.html harness passes ?track= as prop');
    else fail('C: harness lost ?track= behavior', telemetry?.track);
    await context.close();
  }

  await browser.close();
  console.log(process.exitCode ? 'PROBE FAILED' : 'ALL PROBES PASS');
} finally {
  server.kill('SIGTERM');
}
