// Drift-tier VFX evidence capture — spawns dev:kart, drives a real drift with
// keyboard input, screenshots each tier as telemetry reports it, then the
// release payoff. Asserts tier 3 was actually banked so the captures can't
// silently show a lower tier.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const port = Number(process.env.DRIFT_VFX_PORT || 5301);
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = __dirname;
const labelSuffix = process.env.DRIFT_VFX_LABEL ? `-${process.env.DRIFT_VFX_LABEL}` : '';

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
  throw new Error(`Vite server did not become ready: ${url}`);
};

const telemetry = (page) => page.evaluate(() => window.__comebackCityKartTelemetry || null);

const waitForTier = async (page, tier, timeoutMs) => {
  await page.waitForFunction(
    (wanted) => (window.__comebackCityKartTelemetry?.driftTier || 0) >= wanted,
    tier,
    { timeout: timeoutMs }
  );
};

const shoot = (page, name) =>
  page.screenshot({ path: path.join(outputDir, `${name}${labelSuffix}.png`), fullPage: false });

const attemptDrift = async (page, steerKey) => {
  const samples = [];
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(1500);
  await page.keyboard.down(steerKey);
  await page.keyboard.down('Space');
  try {
    // Tier flips per DRIFT_FEEL.chargeTimes 0.55 / 1.3 / 2.15s. Screenshot the
    // instant each tier lands (tier-up pop is mid-burst) plus a settled frame.
    await waitForTier(page, 1, 4000);
    await shoot(page, 'tier1-pop');
    samples.push(await telemetry(page));
    await page.waitForTimeout(250);
    await shoot(page, 'tier1');
    await waitForTier(page, 2, 3000);
    await shoot(page, 'tier2-pop');
    samples.push(await telemetry(page));
    await page.waitForTimeout(250);
    await shoot(page, 'tier2');
    await waitForTier(page, 3, 3000);
    await shoot(page, 'tier3-pop');
    samples.push(await telemetry(page));
    await page.waitForTimeout(250);
    await shoot(page, 'tier3');
  } finally {
    await page.keyboard.up('Space');
  }
  await page.waitForTimeout(140);
  await shoot(page, 'release-flash');
  const released = await telemetry(page);
  await page.waitForTimeout(400);
  await shoot(page, 'mini-turbo');
  const turbo = await telemetry(page);
  await page.keyboard.up(steerKey);
  await page.keyboard.up('ArrowUp');
  return { released, samples, turbo };
};

const run = async () => {
  await mkdir(outputDir, { recursive: true });
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const server = spawn(npm, ['run', 'dev:kart', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  });
  let browser = null;
  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1365, height: 768 }, deviceScaleFactor: 1 });
    const consoleErrors = [];
    page.on('pageerror', (error) => consoleErrors.push(String(error)));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await page.goto(`${baseUrl}/#race`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, {
      timeout: 20000,
    });
    await page.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, { timeout: 20000 });
    await page.waitForTimeout(300);

    let result = null;
    let direction = null;
    for (const steerKey of ['ArrowRight', 'ArrowLeft']) {
      try {
        result = await attemptDrift(page, steerKey);
        direction = steerKey;
        break;
      } catch (error) {
        // Track curvature may cancel the drift in one direction — release
        // everything and retry the other way on fresh speed.
        for (const key of ['Space', 'ArrowRight', 'ArrowLeft', 'ArrowUp']) await page.keyboard.up(key);
        await page.waitForTimeout(1200);
        if (steerKey === 'ArrowLeft') throw error;
      }
    }

    const tiersSeen = result.samples.map((sample) => sample?.driftTier || 0);
    const report = {
      capturedAt: new Date().toISOString(),
      consoleErrors,
      direction,
      label: process.env.DRIFT_VFX_LABEL || 'after',
      miniTurboTierBanked: result.released?.miniTurboTier ?? result.turbo?.miniTurboTier ?? 0,
      pass:
        tiersSeen[0] >= 1 &&
        tiersSeen[1] >= 2 &&
        tiersSeen[2] >= 3 &&
        (result.released?.miniTurboTier === 3 || result.turbo?.miniTurboTier === 3) &&
        consoleErrors.length === 0,
      tiersSeen,
    };
    await writeFile(
      path.join(outputDir, `drift-tier-vfx-report${labelSuffix}.json`),
      `${JSON.stringify(report, null, 2)}\n`
    );
    console.log(JSON.stringify(report, null, 2));
    if (!report.pass) process.exitCode = 1;
  } finally {
    await browser?.close();
    server.kill('SIGTERM');
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
