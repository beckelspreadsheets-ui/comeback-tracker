import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.LIFECYCLE_SMOKE_PORT || 5198);
const baseUrl = `http://127.0.0.1:${port}`;
const shouldCleanArtifacts = !process.env.LIFECYCLE_SMOKE_ARTIFACT_DIR;
const artifactsDir = process.env.LIFECYCLE_SMOKE_ARTIFACT_DIR
  ? path.resolve(root, process.env.LIFECYCLE_SMOKE_ARTIFACT_DIR)
  : path.join(root, 'tmp', 'page-lifecycle-audio-smoke-test');

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

const installAudioAndLifecycleHooks = async (page) => {
  await page.addInitScript(() => {
    window.__audioLifecycle = {
      created: 0,
      oscillatorStarts: 0,
      resumeCalls: 0,
      suspendCalls: 0,
      unhandledRejections: [],
    };

    window.addEventListener('unhandledrejection', (event) => {
      window.__audioLifecycle.unhandledRejections.push(String(event.reason?.message || event.reason || 'unknown'));
    });

    class FakeAudioParam {
      constructor(value = 0) {
        this.value = value;
      }
      exponentialRampToValueAtTime(value) {
        this.value = value;
      }
      linearRampToValueAtTime(value) {
        this.value = value;
      }
      setValueAtTime(value) {
        this.value = value;
      }
    }

    class FakeAudioNode {
      connect() {
        return this;
      }
    }

    class FakeOscillator extends FakeAudioNode {
      constructor() {
        super();
        this.frequency = new FakeAudioParam(0);
        this.type = 'sine';
      }
      start() {
        window.__audioLifecycle.oscillatorStarts += 1;
      }
      stop() {}
    }

    class FakeGain extends FakeAudioNode {
      constructor() {
        super();
        this.gain = new FakeAudioParam(0);
      }
    }

    class FakeAudioContext {
      constructor() {
        window.__audioLifecycle.created += 1;
        this.currentTime = 0;
        this.destination = new FakeAudioNode();
        this.state = 'suspended';
      }
      createGain() {
        return new FakeGain();
      }
      createOscillator() {
        return new FakeOscillator();
      }
      resume() {
        window.__audioLifecycle.resumeCalls += 1;
        return Promise.reject(new DOMException('Autoplay blocked in lifecycle smoke', 'NotAllowedError'));
      }
      suspend() {
        window.__audioLifecycle.suspendCalls += 1;
        this.state = 'suspended';
        return Promise.resolve();
      }
    }

    window.AudioContext = FakeAudioContext;
    window.webkitAudioContext = FakeAudioContext;

    let hiddenValue = false;
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => hiddenValue,
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (hiddenValue ? 'hidden' : 'visible'),
    });
    window.__setLifecycleHidden = (nextHidden) => {
      hiddenValue = Boolean(nextHidden);
    };
  });
};

const lifecycleRoundTrip = async (page) => {
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(
    () => (window.__raceVisualTelemetry?.player?.normalizedSpeed || 0) > 0.08,
    null,
    { timeout: 10000 }
  );

  await page.evaluate(() => {
    window.__setLifecycleHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
  });
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    window.__setLifecycleHidden(false);
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });

  await page.waitForFunction(
    () => {
      const telemetry = window.__raceVisualTelemetry;
      const lifecycle = telemetry?.lifecycle || {};
      return (
        lifecycle.pauseCount >= 1 &&
        lifecycle.resumeCount >= 1 &&
        lifecycle.inputClearCount >= 1 &&
        lifecycle.pageHidePersistedCount >= 1 &&
        lifecycle.pageShowPersistedCount >= 1 &&
        Number.isFinite(telemetry.frameElapsedMs) &&
        telemetry.frameElapsedMs < 250
      );
    },
    null,
    { timeout: 10000 }
  );
};

const run = async () => {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const server = spawn(npm, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
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
    if (shouldCleanArtifacts) await rm(artifactsDir, { force: true, recursive: true });
    await mkdir(artifactsDir, { recursive: true });
    await waitForServer(baseUrl);

    browser = await chromium.launch({
      args: ['--ignore-gpu-blocklist', '--use-gl=swiftshader'],
      headless: true,
    });
    const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(message.text());
    });
    await installAudioAndLifecycleHooks(page);

    const url = `${baseUrl}/race-playtest.html?raceTrack=comeback-city&raceMode=free-switch&raceIndex=lifecycle-audio-smoke&raceNoFinish=1`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('canvas[data-visual-canvas="race"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="race-audio-toggle"]', { timeout: 15000 });
    await page.waitForFunction(() => window.__raceVisualTelemetry?.trackKey === 'comeback-city', null, {
      timeout: 15000,
    });

    await page.keyboard.press('KeyQ');
    await page.waitForFunction(
      () => window.__audioLifecycle?.created >= 1 && window.__audioLifecycle?.oscillatorStarts >= 1,
      null,
      { timeout: 10000 }
    );

    const audioToggle = page.locator('[data-testid="race-audio-toggle"]');
    const beforePressed = await audioToggle.getAttribute('aria-pressed');
    await audioToggle.click();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="race-audio-toggle"]')?.getAttribute('aria-pressed') === 'true' &&
        window.__raceVisualTelemetry?.player?.audioMuted === true,
      null,
      { timeout: 5000 }
    );
    await audioToggle.click();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="race-audio-toggle"]')?.getAttribute('aria-pressed') === 'false' &&
        window.__raceVisualTelemetry?.player?.audioMuted === false,
      null,
      { timeout: 5000 }
    );

    await lifecycleRoundTrip(page);
    await page.screenshot({
      fullPage: true,
      path: path.join(artifactsDir, 'page-lifecycle-audio-race.png'),
    });

    const detail = await page.evaluate(() => ({
      audio: window.__audioLifecycle,
      telemetry: window.__raceVisualTelemetry,
      telemetrySamples: window.__raceVisualTelemetrySamples || [],
      toggle: {
        ariaLabel: document.querySelector('[data-testid="race-audio-toggle"]')?.getAttribute('aria-label'),
        ariaPressed: document.querySelector('[data-testid="race-audio-toggle"]')?.getAttribute('aria-pressed'),
        beforePressed: window.__beforePressed,
      },
    }));
    detail.toggle.beforePressed = beforePressed;

    if (detail.audio.unhandledRejections.length) {
      fail('Blocked audio resume produced unhandled rejections', { audio: detail.audio });
    }
    if (detail.audio.resumeCalls < 1 || detail.audio.created < 1 || detail.audio.oscillatorStarts < 1) {
      fail('Audio smoke did not exercise blocked Web Audio startup path', { audio: detail.audio });
    }
    if (detail.toggle.ariaPressed !== 'false' || detail.toggle.ariaLabel !== 'Mute race audio') {
      fail('Audio mute toggle did not return to available unmuted state', { toggle: detail.toggle });
    }
    if (detail.telemetry?.player?.audioMuted !== false) {
      fail('Audio telemetry did not return to unmuted state', {
        audioMuted: detail.telemetry?.player?.audioMuted,
      });
    }
    if (pageErrors.length) fail('Browser console errors during page lifecycle/audio smoke', { errors: pageErrors });

    const summary = {
      artifactsDir,
      status: 'ok',
      routeUrl: url,
      audio: {
        audioContextCreated: detail.audio.created,
        oscillatorStarts: detail.audio.oscillatorStarts,
        resumeCalls: detail.audio.resumeCalls,
        unhandledRejections: detail.audio.unhandledRejections.length,
      },
      lifecycle: detail.telemetry.lifecycle,
      timing: {
        frameDtMs: detail.telemetry.frameDtMs,
        frameElapsedMs: detail.telemetry.frameElapsedMs,
        raceTime: detail.telemetry.race.time,
      },
      toggle: detail.toggle,
    };
    await writeFile(path.join(artifactsDir, 'page-lifecycle-audio-summary.json'), JSON.stringify(summary, null, 2));
    await writeFile(path.join(artifactsDir, 'page-lifecycle-audio-telemetry.json'), JSON.stringify(detail.telemetry, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error(error.message);
    if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
    if (serverLog) console.error(serverLog.slice(-4000));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
};

await run();
