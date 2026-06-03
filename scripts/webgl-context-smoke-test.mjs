import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.WEBGL_CONTEXT_SMOKE_PORT || 5198);
const baseUrl = `http://127.0.0.1:${port}`;
const artifactsDir = process.env.WEBGL_CONTEXT_SMOKE_ARTIFACT_DIR
  ? path.resolve(root, process.env.WEBGL_CONTEXT_SMOKE_ARTIFACT_DIR)
  : path.join(root, 'tmp', 'webgl-context-smoke-test');
const distIndexPath = path.join(root, 'dist', 'index.html');

const fail = (message, detail = {}) => {
  const error = new Error(message);
  error.detail = detail;
  throw error;
};

const getGitMetadata = () => {
  try {
    return {
      branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim() || null,
      commit: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() || null,
    };
  } catch {
    return { branch: null, commit: null };
  }
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
  fail('Preview server did not become ready', { url });
};

const ensureDist = async () => {
  await access(distIndexPath).catch(() => {
    fail('Built app artifact is missing; run npm run build before npm run test:webgl', {
      filePath: distIndexPath,
    });
  });
};

const forceWebGLContextLoss = async (page) =>
  page.evaluate(() => {
    const canvas = document.querySelector('canvas[data-visual-canvas="race"]');
    if (!canvas) return { ok: false, reason: 'race canvas missing' };
    const context =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    const extension = context?.getExtension?.('WEBGL_lose_context');
    if (extension?.loseContext) {
      extension.loseContext();
      return { method: 'WEBGL_lose_context', ok: true };
    }

    let event;
    try {
      event = new WebGLContextEvent('webglcontextlost', {
        cancelable: true,
        statusMessage: 'smoke-test',
      });
    } catch {
      event = new Event('webglcontextlost', { cancelable: true });
    }
    const dispatchResult = canvas.dispatchEvent(event);
    return {
      defaultPrevented: Boolean(event.defaultPrevented),
      dispatchResult,
      method: 'synthetic-webglcontextlost',
      ok: true,
    };
  });

const run = async () => {
  await ensureDist();
  await mkdir(artifactsDir, { recursive: true });

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const server = spawn(npm, ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
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
    const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(message.text());
    });

    const routeUrl = `${baseUrl}/#race`;
    await page.goto(routeUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="race-screen"][data-race-renderer="webgl"][data-race-track="comeback-city"]', {
      timeout: 15000,
    });
    await page.waitForSelector('[data-testid="arcade-race-shell"][data-race-track="comeback-city"]', { timeout: 15000 });
    await page.waitForSelector('canvas[data-visual-canvas="race"]', { timeout: 15000 });
    await page.waitForFunction(
      () => {
        const shell = document.querySelector('[data-testid="arcade-race-shell"]');
        const time = Number(shell?.dataset.raceTime || 0);
        return shell?.dataset.raceTrack === 'comeback-city' && Number.isFinite(time) && time > 0.05;
      },
      null,
      { timeout: 15000 }
    );

    const beforeLoss = await page.evaluate(() => ({
      hash: window.location.hash,
      renderer: document.querySelector('[data-testid="race-screen"]')?.getAttribute('data-race-renderer') || null,
      raceTrack: document.querySelector('[data-testid="arcade-race-shell"]')?.dataset.raceTrack || null,
    }));
    const lossResult = await forceWebGLContextLoss(page);
    if (!lossResult.ok) fail('Unable to force WebGL context loss', lossResult);

    await page.waitForSelector('[data-testid="race-screen"][data-race-renderer="canvas2d-fallback"]', {
      timeout: 15000,
    });
    await page.waitForSelector('[data-testid="race-fallback-canvas"]', { timeout: 15000 });
    await page.waitForFunction(() => {
      const canvas = document.querySelector('[data-testid="race-fallback-canvas"]');
      return canvas && canvas.toDataURL('image/png').length > 1200;
    });

    const fallbackScreenshotPath = path.join(artifactsDir, 'webgl-context-loss-fallback.png');
    await page.screenshot({ fullPage: false, path: fallbackScreenshotPath });
    const fallbackState = await page.evaluate(() => {
      const screen = document.querySelector('[data-testid="race-screen"]');
      const canvas = document.querySelector('[data-testid="race-fallback-canvas"]');
      return {
        canvasDataUrlLength: canvas?.toDataURL('image/png').length || 0,
        hash: window.location.hash,
        renderer: screen?.getAttribute('data-race-renderer') || null,
        webglContextStatus: window.__raceWebGLContextStatus || null,
      };
    });

    await page.getByTestId('race-exit-button').click();
    await Promise.race([
      page.waitForSelector('[data-testid="playable-world-home"]', { timeout: 12000 }),
      page.waitForSelector('text=The Comeback', { timeout: 12000 }),
    ]);
    const afterExit = await page.evaluate(() => ({
      hash: window.location.hash,
      homeVisible: Boolean(document.querySelector('[data-testid="playable-world-home"]')),
      raceScreenCount: document.querySelectorAll('[data-testid="race-screen"]').length,
      titleSeen: document.body.innerText.includes('The Comeback'),
    }));

    const significantErrors = pageErrors.filter(
      (message) => !message.includes('Failed to load resource: the server responded with a status of 404')
    );
    if (significantErrors.length) {
      fail('Browser console errors during WebGL context smoke', {
        errors: significantErrors,
        ignoredErrors: pageErrors.filter((message) => !significantErrors.includes(message)),
      });
    }
    if (fallbackState.renderer !== 'canvas2d-fallback' || fallbackState.canvasDataUrlLength <= 1200) {
      fail('Context-loss fallback did not render a nonblank Canvas2D race fallback', { fallbackState });
    }
    if (fallbackState.webglContextStatus?.fallbackRequested !== true) {
      fail('Context-loss handler did not record a fallback request', { fallbackState });
    }
    if (afterExit.hash || afterExit.raceScreenCount !== 0 || (!afterExit.titleSeen && !afterExit.homeVisible)) {
      fail('Race fallback exit path did not return to Today and clear the race hash', { afterExit });
    }

    const summary = {
      afterExit,
      beforeLoss,
      capturedAt: new Date().toISOString(),
      fallbackScreenshotPath,
      fallbackState,
      git: getGitMetadata(),
      ignoredConsoleErrors: pageErrors.filter((message) => !significantErrors.includes(message)),
      lossResult,
      routeUrl,
    };
    await writeFile(path.join(artifactsDir, 'webgl-context-smoke-summary.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    if (serverLog) error.serverLog = serverLog.slice(-4000);
    throw error;
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
};

run().catch((error) => {
  console.error(error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  if (error.serverLog) console.error(error.serverLog);
  process.exit(1);
});
