import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { makeDefaultState, normalizeState, STORAGE_KEY, SYNC_META_KEY } from '../src/hooks/usePersistedState.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
let port = Number(process.env.ACCESSIBILITY_SMOKE_PORT || 5211);
let baseUrl = `http://127.0.0.1:${port}`;
const shouldCleanArtifacts = !process.env.ACCESSIBILITY_SMOKE_ARTIFACT_DIR;
const artifactsDir = process.env.ACCESSIBILITY_SMOKE_ARTIFACT_DIR
  ? path.resolve(root, process.env.ACCESSIBILITY_SMOKE_ARTIFACT_DIR)
  : path.join(root, 'tmp', 'accessibility-smoke-test');
const distIndexPath = path.join(root, 'dist', 'index.html');

const fail = (message, detail = {}) => {
  const error = new Error(message);
  error.detail = detail;
  throw error;
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const makeBasicState = () => {
  const state = clone(makeDefaultState());
  state.game = {
    ...state.game,
    homeMode: 'basic',
  };
  return normalizeState(state);
};

const getGitMetadata = () => {
  try {
    return {
      branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim() || null,
      commit: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() || null,
      dirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()),
    };
  } catch {
    return { branch: null, commit: null, dirty: null };
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
  fail('Accessibility smoke preview server did not become ready', { url });
};

const canListenOnPort = (candidatePort) =>
  new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => {
      probe.close(() => resolve(true));
    });
    probe.listen(candidatePort, '127.0.0.1');
  });

const resolveLocalPreviewPort = async () => {
  if (process.env.ACCESSIBILITY_SMOKE_PORT) {
    if (!(await canListenOnPort(port))) {
      fail('Requested ACCESSIBILITY_SMOKE_PORT is already in use', { port });
    }
    return port;
  }
  for (let candidatePort = port; candidatePort < port + 50; candidatePort += 1) {
    if (await canListenOnPort(candidatePort)) return candidatePort;
  }
  fail('No available local accessibility smoke preview port found', { startPort: port });
};

const ensureDist = async () => {
  await access(distIndexPath).catch(() => {
    fail('Built app artifact is missing; run npm run build before npm run test:accessibility', {
      filePath: distIndexPath,
    });
  });
};

const installSeedState = async (context) => {
  await context.addInitScript(
    ({ stateJson, storageKey, syncMetaKey }) => {
      localStorage.setItem(storageKey, stateJson);
      localStorage.removeItem(syncMetaKey);
    },
    {
      stateJson: JSON.stringify(makeBasicState()),
      storageKey: STORAGE_KEY,
      syncMetaKey: SYNC_META_KEY,
    }
  );
};

const mockLocalSync = async (context) => {
  await context.route('**/api/sync/**', async (route) => {
    await route.fulfill({
      body: JSON.stringify({ error: 'not_authenticated' }),
      contentType: 'application/json',
      status: 401,
    });
  });
};

const collectBrowserErrors = (page) => {
  const pageErrors = [];
  const consoleErrors = [];
  const requestFailures = [];
  const httpErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/401 \(Unauthorized\)/.test(message.text()) && !/\/api\/sync\//.test(message.text())) {
      consoleErrors.push(message.text());
    }
  });
  page.on('requestfailed', (request) => {
    requestFailures.push({
      failure: request.failure()?.errorText || null,
      method: request.method(),
      url: request.url(),
    });
  });
  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400 && !/\/api\/sync\//.test(response.url())) {
      httpErrors.push({ status, url: response.url() });
    }
  });
  return { consoleErrors, httpErrors, pageErrors, requestFailures };
};

const assertNoBlockingBrowserErrors = (label, errors) => {
  if (errors.pageErrors.length || errors.consoleErrors.length || errors.requestFailures.length || errors.httpErrors.length) {
    fail('Blocking browser errors recorded during accessibility smoke', { errors, label });
  }
};

const routeUrl = (route = '/') => `${baseUrl}${route}`;

const waitForRaceReady = async (page) => {
  await page.waitForSelector('[data-testid="race-screen"][data-race-track="comeback-city"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="arcade-race-shell"][data-race-track="comeback-city"]', { timeout: 15000 });
  await page.waitForFunction(
    () => {
      const shell = document.querySelector('[data-testid="arcade-race-shell"]');
      const time = Number(shell?.dataset.raceTime || 0);
      return shell?.dataset.raceTrack === 'comeback-city' && Number.isFinite(time) && time > 0.05;
    },
    null,
    { timeout: 15000 }
  );
};

const raceSpeedState = async (page) =>
  page.evaluate(() => ({
    normalizedSpeed: Number(document.querySelector('[data-testid="arcade-race-shell"]')?.dataset.raceSpeedRatio || 0),
  }));

const collectAccessibilitySignals = async (page) =>
  page.evaluate(() => {
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };
    const textForIdRefs = (refs) =>
      refs
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() || '')
        .filter(Boolean)
        .join(' ')
        .trim();
    const accessibleName = (element) => {
      const labelledBy = element.getAttribute('aria-labelledby');
      if (labelledBy) {
        const label = textForIdRefs(labelledBy);
        if (label) return label;
      }
      const ariaLabel = element.getAttribute('aria-label')?.trim();
      if (ariaLabel) return ariaLabel;
      const title = element.getAttribute('title')?.trim();
      if (title) return title;
      if (element.id) {
        const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`)?.textContent?.trim();
        if (label) return label;
      }
      const wrappedLabel = element.closest('label')?.textContent?.trim();
      if (wrappedLabel) return wrappedLabel;
      const alt = element.getAttribute('alt')?.trim();
      if (alt) return alt;
      return element.textContent?.trim() || '';
    };

    const interactive = Array.from(
      document.querySelectorAll(
        'a[href], button, input, select, textarea, summary, [role="button"], [role="link"], [role="menuitem"], [tabindex]:not([tabindex="-1"])'
      )
    ).filter(isVisible);
    const unlabeledInteractive = interactive
      .filter((element) => !accessibleName(element))
      .map((element) => ({
        className: element.className || null,
        role: element.getAttribute('role'),
        tagName: element.tagName.toLowerCase(),
        testId: element.getAttribute('data-testid'),
        type: element.getAttribute('type'),
      }));
    const ids = Array.from(document.querySelectorAll('[id]')).map((element) => element.id);
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    const visibleImagesWithoutAlt = Array.from(document.querySelectorAll('img'))
      .filter(isVisible)
      .filter((image) => !image.hasAttribute('alt'))
      .map((image) => image.currentSrc || image.src || image.getAttribute('src'));
    return {
      duplicateIds,
      htmlLang: document.documentElement.lang || null,
      interactiveCount: interactive.length,
      title: document.title,
      unlabeledInteractive,
      viewportMeta: document.querySelector('meta[name="viewport"]')?.getAttribute('content') || null,
      visibleImagesWithoutAlt,
      visibleNamedInteractives: interactive.slice(0, 16).map((element) => ({
        name: accessibleName(element).slice(0, 120),
        tagName: element.tagName.toLowerCase(),
        testId: element.getAttribute('data-testid'),
      })),
    };
  });

const assertAccessibilitySignals = (label, signals) => {
  if (signals.htmlLang !== 'en') {
    fail('Accessibility smoke failed: html lang must be en', { label, signals });
  }
  if (!signals.title) {
    fail('Accessibility smoke failed: document title is missing', { label, signals });
  }
  if (!signals.viewportMeta?.includes('width=device-width')) {
    fail('Accessibility smoke failed: viewport meta is missing width=device-width', { label, signals });
  }
  if (signals.duplicateIds.length) {
    fail('Accessibility smoke failed: duplicate ids found', { duplicateIds: signals.duplicateIds, label });
  }
  if (signals.unlabeledInteractive.length) {
    fail('Accessibility smoke failed: visible interactive elements without accessible names', {
      label,
      unlabeledInteractive: signals.unlabeledInteractive,
    });
  }
  if (signals.visibleImagesWithoutAlt.length) {
    fail('Accessibility smoke failed: visible images without alt attributes', {
      label,
      visibleImagesWithoutAlt: signals.visibleImagesWithoutAlt,
    });
  }
};

const focusedElementInfo = async (page) =>
  page.evaluate(() => {
    const element = document.activeElement;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const textForIdRefs = (refs) =>
      refs
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() || '')
        .filter(Boolean)
        .join(' ')
        .trim();
    const accessibleName = (target) => {
      const labelledBy = target.getAttribute('aria-labelledby');
      if (labelledBy) {
        const label = textForIdRefs(labelledBy);
        if (label) return label;
      }
      return (
        target.getAttribute('aria-label')?.trim() ||
        target.getAttribute('title')?.trim() ||
        target.textContent?.trim() ||
        target.getAttribute('alt')?.trim() ||
        ''
      );
    };
    const hasOutline = style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth || '0') > 0;
    const hasShadow = style.boxShadow && style.boxShadow !== 'none';
    const hasVisibleIndicator = hasOutline || hasShadow;
    return {
      ariaLabel: element.getAttribute('aria-label'),
      className: element.className || null,
      hasShadow,
      hasVisibleIndicator,
      id: element.id || null,
      name: accessibleName(element).slice(0, 120),
      outlineColor: style.outlineColor,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      rect: {
        height: Math.round(rect.height),
        width: Math.round(rect.width),
        x: Math.round(rect.x),
        y: Math.round(rect.y),
      },
      tagName: element.tagName.toLowerCase(),
      testId: element.getAttribute('data-testid'),
      visible: style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0,
    };
  });

const assertFocusedElement = (label, info) => {
  if (!info.visible || !info.name || !info.hasVisibleIndicator) {
    fail('Accessibility smoke failed: focused control is not visibly named', { focus: info, label });
  }
};

const collectTabFocusSequence = async (page, { label, steps = 8 }) => {
  await page.evaluate(() => {
    document.body.focus();
  });
  const sequence = [];
  for (let index = 0; index < steps; index += 1) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(60);
    const info = await focusedElementInfo(page);
    if (info.tagName !== 'body') sequence.push(info);
  }
  const usable = sequence.filter((info) => info.visible && info.name && info.hasVisibleIndicator);
  if (usable.length < Math.min(3, steps)) {
    fail('Accessibility smoke failed: tab focus sequence did not expose enough visible named controls', {
      label,
      sequence,
      usableCount: usable.length,
    });
  }
  return {
    label,
    sequence,
    status: 'pass',
    usableCount: usable.length,
  };
};

const focusSelector = async (page, selector, label) => {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: 'visible', timeout: 12000 });
  await locator.focus();
  const info = await focusedElementInfo(page);
  const matchesSelector = await page.evaluate((targetSelector) => {
    const target = document.querySelector(targetSelector);
    return Boolean(target && (document.activeElement === target || target.contains(document.activeElement)));
  }, selector);
  if (!matchesSelector) {
    fail('Accessibility smoke failed: requested control did not receive focus', { focus: info, label, selector });
  }
  assertFocusedElement(label, info);
  return {
    focus: info,
    label,
    selector,
    status: 'pass',
  };
};

const collectControlState = async (page, selector, label) =>
  page.evaluate(
    ({ label: controlLabel, selector: controlSelector }) => {
      const element = document.querySelector(controlSelector);
      if (!element) {
        return {
          label: controlLabel,
          selector: controlSelector,
          status: 'missing',
        };
      }
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const textForIdRefs = (refs) =>
        refs
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() || '')
          .filter(Boolean)
          .join(' ')
          .trim();
      const labelledBy = element.getAttribute('aria-labelledby');
      const nameFromLabelledBy = labelledBy ? textForIdRefs(labelledBy) : '';
      return {
        ariaDisabled: element.getAttribute('aria-disabled'),
        disabled: Boolean(element.disabled),
        label: controlLabel,
        name:
          nameFromLabelledBy ||
          element.getAttribute('aria-label')?.trim() ||
          element.getAttribute('title')?.trim() ||
          element.textContent?.trim().replace(/\s+/g, ' ') ||
          '',
        rect: {
          height: Math.round(rect.height),
          width: Math.round(rect.width),
          x: Math.round(rect.x),
          y: Math.round(rect.y),
        },
        selector: controlSelector,
        status: style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0 ? 'visible' : 'hidden',
        tagName: element.tagName.toLowerCase(),
      };
    },
    { label, selector }
  );

const collectContrastChecks = async (page, samples) =>
  page.evaluate((requestedSamples) => {
    const parseColor = (value) => {
      const rgbMatch = value.match(/rgba?\(([^)]+)\)/i);
      if (!rgbMatch) return null;
      const parts = rgbMatch[1]
        .split(',')
        .map((part) => part.trim())
        .map((part) => (part.endsWith('%') ? (Number.parseFloat(part) / 100) * 255 : Number.parseFloat(part)));
      if (parts.length < 3 || parts.some((part) => !Number.isFinite(part))) return null;
      return {
        a: Number.isFinite(parts[3]) ? parts[3] : 1,
        b: parts[2],
        g: parts[1],
        r: parts[0],
      };
    };
    const composite = (foreground, background) => {
      const alpha = foreground.a + background.a * (1 - foreground.a);
      if (alpha <= 0) return { a: 0, b: 0, g: 0, r: 0 };
      return {
        a: alpha,
        b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
        g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
        r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
      };
    };
    const effectiveBackground = (element) => {
      const colors = [];
      let current = element;
      while (current) {
        const color = parseColor(window.getComputedStyle(current).backgroundColor);
        if (color && color.a > 0) colors.push(color);
        current = current.parentElement;
      }
      let background = { a: 1, b: 255, g: 255, r: 255 };
      for (let index = colors.length - 1; index >= 0; index -= 1) {
        background = composite(colors[index], background);
      }
      return background;
    };
    const luminance = (color) => {
      const values = [color.r, color.g, color.b].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
    };
    const contrastRatio = (foreground, background) => {
      const lighter = Math.max(luminance(foreground), luminance(background));
      const darker = Math.min(luminance(foreground), luminance(background));
      return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
    };
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };

    return requestedSamples.map((sample) => {
      const element = document.querySelector(sample.selector);
      if (!element || !isVisible(element)) {
        return {
          label: sample.label,
          minimum: sample.minimum,
          selector: sample.selector,
          status: 'missing-or-hidden',
        };
      }
      const style = window.getComputedStyle(element);
      const color = parseColor(style.color);
      const background = effectiveBackground(element);
      const ratio = color ? contrastRatio(color, background) : null;
      return {
        background,
        color,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        label: sample.label,
        minimum: sample.minimum,
        ratio,
        selector: sample.selector,
        status: ratio !== null && ratio >= sample.minimum ? 'pass' : 'fail',
        text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 100),
      };
    });
  }, samples);

const assertContrastChecks = (label, checks) => {
  const failures = checks.filter((check) => check.status !== 'pass');
  if (failures.length) {
    fail('Accessibility smoke failed: contrast sample did not meet the required ratio', { failures, label });
  }
};

const smokeHome = async (context) => {
  const page = await context.newPage();
  const errors = collectBrowserErrors(page);
  try {
    await page.goto(routeUrl('/'), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=The Comeback', { timeout: 12000 });
    await page.waitForTimeout(800);
    const signals = await collectAccessibilitySignals(page);
    assertAccessibilitySignals('home', signals);
    const focus = await collectTabFocusSequence(page, { label: 'home tab order', steps: 8 });
    const contrast = await collectContrastChecks(page, [
      { label: 'home first button', minimum: 4.5, selector: 'button' },
    ]);
    assertContrastChecks('home', contrast);
    const screenshotPath = path.join(artifactsDir, 'accessibility-home.png');
    await page.screenshot({ fullPage: false, path: screenshotPath });
    assertNoBlockingBrowserErrors('home', errors);
    return {
      contrast,
      focus,
      screenshotPath,
      signals,
      status: 'pass',
    };
  } finally {
    await page.close();
  }
};

const smokeRaceDesktop = async (context) => {
  const page = await context.newPage();
  const errors = collectBrowserErrors(page);
  try {
    await page.goto(routeUrl('/#race'), { waitUntil: 'domcontentloaded' });
    await waitForRaceReady(page);
    await page.waitForSelector('[data-testid="race-audio-toggle"]', { timeout: 12000 });
    const signals = await collectAccessibilitySignals(page);
    assertAccessibilitySignals('race desktop', signals);
    const focus = {
      audioToggle: await focusSelector(page, '[data-testid="race-audio-toggle"]', 'race audio toggle'),
      exitButton: await focusSelector(page, '[data-testid="race-exit-button"]', 'race exit button'),
      tabOrder: await collectTabFocusSequence(page, { label: 'race desktop tab order', steps: 6 }),
    };
    const itemButton = await collectControlState(page, '[data-testid="race-item-panel"] button', 'race item button');
    if (itemButton.status !== 'visible' || !itemButton.name) {
      fail('Accessibility smoke failed: race item button is not a visible named control', { itemButton });
    }
    const desktopGoButton = await collectControlState(page, '[data-testid="race-go-button"]', 'race desktop go button');
    if (desktopGoButton.status !== 'hidden') {
      fail('Accessibility smoke failed: mobile-only Go control is visible on desktop', { desktopGoButton });
    }

    const audioToggle = page.getByTestId('race-audio-toggle');
    const beforePressed = await audioToggle.getAttribute('aria-pressed');
    await audioToggle.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      (previousValue) =>
        document.querySelector('[data-testid="race-audio-toggle"]')?.getAttribute('aria-pressed') !== previousValue,
      beforePressed,
      { timeout: 5000 }
    );
    const afterPressed = await audioToggle.getAttribute('aria-pressed');
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      (previousValue) =>
        document.querySelector('[data-testid="race-audio-toggle"]')?.getAttribute('aria-pressed') !== previousValue,
      afterPressed,
      { timeout: 5000 }
    );

    const contrast = await collectContrastChecks(page, [
      { label: 'race exit button', minimum: 4.5, selector: '[data-testid="race-exit-button"]' },
      { label: 'race audio icon button', minimum: 3, selector: '[data-testid="race-audio-toggle"]' },
      { label: 'race live hud title', minimum: 4.5, selector: '[data-testid="race-live-hud"] .truncate' },
      { label: 'race item button', minimum: 4.5, selector: '[data-testid="race-item-panel"] button' },
    ]);
    assertContrastChecks('race desktop', contrast);
    const screenshotPath = path.join(artifactsDir, 'accessibility-race-desktop.png');
    await page.screenshot({ fullPage: false, path: screenshotPath });
    assertNoBlockingBrowserErrors('race desktop', errors);
    return {
      audioToggle: {
        afterKeyboardToggle: afterPressed,
        beforeKeyboardToggle: beforePressed,
        finalPressed: await audioToggle.getAttribute('aria-pressed'),
        name: await audioToggle.getAttribute('aria-label'),
      },
      contrast,
      desktopGoButton,
      focus,
      itemButton,
      screenshotPath,
      signals,
      status: 'pass',
    };
  } finally {
    await page.close();
  }
};

const smokeReducedMotion = async (browser) => {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    reducedMotion: 'reduce',
    viewport: { height: 900, width: 1440 },
  });
  await installSeedState(context);
  await mockLocalSync(context);
  const page = await context.newPage();
  const errors = collectBrowserErrors(page);
  try {
    await page.goto(routeUrl('/#race'), { waitUntil: 'domcontentloaded' });
    await waitForRaceReady(page);
    await page.waitForFunction(
      () => document.querySelector('canvas[data-visual-canvas="race"]')?.dataset.reducedMotion === 'true',
      null,
      { timeout: 8000 }
    );
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(1400);
    await page.keyboard.up('ArrowUp');
    const state = await page.evaluate(() => ({
      canvasReducedMotion: document.querySelector('canvas[data-visual-canvas="race"]')?.dataset.reducedMotion || null,
      shellReducedMotion: document.querySelector('[data-testid="arcade-race-shell"]')?.dataset.reducedMotion || null,
      speedLineCount: document.querySelectorAll('[data-testid="race-speed-lines"]').length,
    }));
    if (state.canvasReducedMotion !== 'true' || state.shellReducedMotion !== 'true') {
      fail('Accessibility smoke failed: reduced-motion state did not propagate to race canvas and HUD', {
        state,
      });
    }
    assertNoBlockingBrowserErrors('reduced motion', errors);
    return {
      state,
      status: 'pass',
    };
  } finally {
    await page.close();
    await context.close();
  }
};

const smokeRaceMobile = async (browser) => {
  const context = await browser.newContext({
    hasTouch: true,
    ignoreHTTPSErrors: true,
    isMobile: true,
    viewport: { height: 844, width: 390 },
  });
  await installSeedState(context);
  await mockLocalSync(context);
  const page = await context.newPage();
  const errors = collectBrowserErrors(page);
  try {
    await page.goto(routeUrl('/#race'), { waitUntil: 'domcontentloaded' });
    await waitForRaceReady(page);
    await page.waitForSelector('[data-testid="race-go-button"]', { timeout: 12000 });
    const signals = await collectAccessibilitySignals(page);
    assertAccessibilitySignals('race mobile', signals);
    const focus = {
      goButton: await focusSelector(page, '[data-testid="race-go-button"]', 'race mobile go button'),
    };
    const beforeInput = await raceSpeedState(page);
    const goButton = page.getByTestId('race-go-button');
    const goButtonBox = await goButton.boundingBox();
    if (!goButtonBox) fail('Accessibility smoke failed: mobile Go touch control did not render a clickable box');
    await goButton.dispatchEvent('pointerdown', {
      bubbles: true,
      button: 0,
      buttons: 1,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });
    await page.waitForTimeout(1200);
    await goButton.dispatchEvent('pointerup', {
      bubbles: true,
      button: 0,
      buttons: 0,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });
    await page.waitForFunction(
      () => Number(document.querySelector('[data-testid="arcade-race-shell"]')?.dataset.raceSpeedRatio || 0) > 0.05,
      null,
      { timeout: 8000 }
    );
    const afterInput = await raceSpeedState(page);
    const contrast = await collectContrastChecks(page, [
      { label: 'race mobile go button text', minimum: 4.5, selector: '[data-testid="race-go-button"] span' },
      { label: 'race mobile objective body', minimum: 4.5, selector: '.race-objective-card p' },
      { label: 'race mobile objective lap', minimum: 4.5, selector: '.race-objective-card b' },
      { label: 'race mobile status speed', minimum: 4.5, selector: '.race-status-stack strong' },
    ]);
    assertContrastChecks('race mobile', contrast);
    const screenshotPath = path.join(artifactsDir, 'accessibility-race-mobile.png');
    await page.screenshot({ fullPage: false, path: screenshotPath });
    assertNoBlockingBrowserErrors('race mobile', errors);
    return {
      afterInput,
      beforeInput,
      contrast,
      focus,
      goButtonBox,
      screenshotPath,
      signals,
      status: 'pass',
    };
  } finally {
    await page.close();
    await context.close();
  }
};

const run = async () => {
  try {
    if (shouldCleanArtifacts) await rm(artifactsDir, { force: true, recursive: true });
    await mkdir(artifactsDir, { recursive: true });
    await ensureDist();
    port = await resolveLocalPreviewPort();
    baseUrl = `http://127.0.0.1:${port}`;

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
      const desktopContext = await browser.newContext({
        ignoreHTTPSErrors: true,
        viewport: { height: 900, width: 1440 },
      });
      await installSeedState(desktopContext);
      await mockLocalSync(desktopContext);

      const home = await smokeHome(desktopContext);
      const raceDesktop = await smokeRaceDesktop(desktopContext);
      await desktopContext.close();

      const reducedMotion = await smokeReducedMotion(browser);
      const raceMobile = await smokeRaceMobile(browser);

      const summary = {
        artifactFiles: [
          path.join(artifactsDir, 'accessibility-home.png'),
          path.join(artifactsDir, 'accessibility-race-desktop.png'),
          path.join(artifactsDir, 'accessibility-race-mobile.png'),
          path.join(artifactsDir, 'accessibility-smoke-summary.json'),
        ],
        artifactsDir,
        baseUrl,
        capturedAt: new Date().toISOString(),
        gateStatus: 'local-accessibility-smoke-proven-not-manual-signoff',
        git: getGitMetadata(),
        home,
        note:
          'Local built-preview accessibility smoke for accessible names, duplicate IDs, visible image alt text, keyboard focus visibility, mute toggle keyboard operation, reduced motion propagation, mobile Go touch control, and representative contrast samples. It is not a substitute for manual target-device accessibility sign-off.',
        raceDesktop,
        raceMobile,
        reducedMotion,
        unresolvedReleaseDecisions: [
          'Target browser/device accessibility matrix and manual sign-off',
          'Manual keyboard/touch QA result with all rubric categories at 4+',
          'Release-owner acceptance of this Playwright smoke as local accessibility evidence',
        ],
      };
      await writeFile(path.join(artifactsDir, 'accessibility-smoke-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
      console.log(JSON.stringify(summary, null, 2));
    } catch (error) {
      if (serverLog) error.detail = { ...(error.detail || {}), serverLog: serverLog.slice(-4000) };
      throw error;
    } finally {
      if (browser) await browser.close();
      server.kill();
    }
  } catch (error) {
    console.error(error.message);
    if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
    process.exitCode = 1;
  }
};

await run();
