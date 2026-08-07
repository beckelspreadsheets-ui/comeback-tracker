// Does the select screen's live model stage actually run?
//
//   node scripts/test-select-stage.mjs
//
// TRAP THIS GATE EXISTS FOR: `navigator.webdriver` makes KartApp skip intro AND
// select and deep-link straight into the race. Every existing harness therefore
// races right past this screen — a capture of "the menu" photographs the track
// instead, and a broken select screen would ship green. This overrides
// webdriver to false and seeds the intro-seen flag so the select screen is what
// actually loads.
//
// The assertions are functional, not aesthetic: the stage mounted, WebGL came
// up, both GLBs decoded, and the render loop is still turning frames. Whether
// it LOOKS good is a judgement call that needs frames captured somewhere other
// than this machine — see docs/AUDIO_AND_MENU_PLAN.md trap 8.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { chromiumGlArgs } from './lib/chromium-gl-args.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.SELECT_STAGE_PORT || 5307);
const baseUrl = process.env.SELECT_STAGE_URL || `http://127.0.0.1:${port}`;
const outputDir = path.join(root, 'tmp', 'select-stage');

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

const run = async () => {
  await mkdir(outputDir, { recursive: true });
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const server = process.env.SELECT_STAGE_URL
    ? null
    : spawn(npm, ['run', 'dev:kart', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
        cwd: root,
        stdio: 'ignore',
      });
  let browser = null;
  const checks = [];
  const check = (name, ok, detail = null) => {
    checks.push({ name, ok, ...(detail ? { detail } : {}) });
    if (!ok) {
      const error = new Error(`check failed: ${name}`);
      error.detail = detail;
      throw error;
    }
  };
  try {
    if (server) await waitForServer(baseUrl);
    // GL flags are not optional: headless chromium without them runs rAF at
    // ~2 fps, which would make the frame-count assertion below meaningless.
    browser = await chromium.launch({ args: chromiumGlArgs() });
    const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
    const consoleErrors = [];
    page.on('pageerror', (error) => consoleErrors.push(String(error)));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    // The whole point: undo the webdriver skip, and mark the intro seen so the
    // SELECT screen is what renders.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      try {
        window.localStorage.setItem('cc-kart-intro-seen', '1');
      } catch {}
    });
    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    check('select screen rendered (webdriver override held)', (await page.locator('[data-testid="race-character-select"]').count()) === 1);
    check('model stage mounted', (await page.locator('[data-testid="race-select-stage"]').count()) === 1);

    await page
      .waitForFunction(
        () => {
          const stage = window.__comebackCityKartSelectStage;
          return stage?.characterLoaded && stage?.kartLoaded;
        },
        null,
        { timeout: 30000 }
      )
      .catch(() => {});
    const stage = await page.evaluate(() => window.__comebackCityKartSelectStage || null);
    check('stage reported telemetry', Boolean(stage), { stage });
    check('character model loaded', stage.characterLoaded === true, { stage });
    check('kart model loaded', stage.kartLoaded === true, { stage });
    check('WebGL came up', (await page.getAttribute('[data-testid="race-select-stage"]', 'data-stage-failed')) === '0');

    // Still turning frames a second later — catches a loop that threw and died
    // after the first render, which leaves a correct-looking frozen image.
    const before = stage.frames;
    await page.waitForTimeout(1000);
    const after = await page.evaluate(() => window.__comebackCityKartSelectStage?.frames || 0);
    check('render loop is live', after > before + 10, { after, before });

    // Changing the pick must reload the stage, not just the tiles.
    await page.click('[data-testid="race-kart-satstacker"]');
    await page.waitForTimeout(1200);
    const swapped = await page.evaluate(() => window.__comebackCityKartSelectStage || null);
    check('stage survives a kart swap', swapped.kartLoaded === true, { swapped });

    // The backdrop plate must actually DECODE. A wrong import path renders an
    // empty <img> that lays out at full size and looks, in a screenshot, like a
    // menu with a dark background — which is what it has anyway under the
    // scrim. naturalWidth is the only honest signal.
    const selectBackdrop = await page.evaluate(() => {
      const img = document.querySelector('[data-testid="menu-backdrop"]');
      return img ? { complete: img.complete, w: img.naturalWidth } : null;
    });
    check('select backdrop decoded', (selectBackdrop?.w || 0) > 0, { selectBackdrop });

    // The instructions screen is the other half of the revamp and no harness
    // has ever loaded it — webdriver skips it too. It needs its OWN page: the
    // init script above re-seeds `cc-kart-intro-seen` on every navigation, so
    // clearing the key and reloading lands right back on select.
    const introPage = await browser.newPage({ viewport: { width: 1365, height: 900 } });
    introPage.on('pageerror', (error) => consoleErrors.push(String(error)));
    introPage.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await introPage.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    await introPage.goto(baseUrl, { waitUntil: 'networkidle' });
    check('instructions screen rendered', (await introPage.locator('[data-testid="race-intro-screen"]').count()) === 1);
    const introBackdrop = await introPage.evaluate(() => {
      const img = document.querySelector('[data-testid="menu-backdrop"]');
      return img ? { w: img.naturalWidth } : null;
    });
    check('instructions backdrop decoded', (introBackdrop?.w || 0) > 0, { introBackdrop });
    // 10 items + the coins card. Counted as CARDS, not as icons: the item
    // icons are rendered <img> tiles (K7 retired lucide for them) while the
    // coins card still uses a lucide <svg>, so counting either element type
    // silently misses the other.
    const guideCards = await introPage.locator('[data-testid="race-item-guide"] > div').count();
    check('item guide still lists every item', guideCards === 11, { guideCards });
    check(
      'instructions start button present',
      (await introPage.locator('[data-testid="race-intro-start"]').count()) === 1
    );

    check('zero console errors', consoleErrors.length === 0, { consoleErrors });

    const report = { baseUrl, checks, pass: true };
    await writeFile(path.join(outputDir, 'select-stage-report.json'), `${JSON.stringify(report, null, 2)}\n`);
    checks.forEach((entry) => process.stdout.write(`${entry.ok ? 'ok  ' : 'FAIL'} ${entry.name}\n`));
    process.stdout.write('\nPASS: select stage\n');
  } catch (error) {
    const report = { baseUrl, checks, detail: error.detail || null, error: String(error), pass: false };
    await writeFile(path.join(outputDir, 'select-stage-report.json'), `${JSON.stringify(report, null, 2)}\n`);
    checks.forEach((entry) => process.stdout.write(`${entry.ok ? 'ok  ' : 'FAIL'} ${entry.name}\n`));
    process.stderr.write(`\nFAIL: ${error.message}\n${JSON.stringify(error.detail || {}, null, 2)}\n`);
    process.exitCode = 1;
  } finally {
    await browser?.close();
    server?.kill('SIGTERM');
  }
};

run();
