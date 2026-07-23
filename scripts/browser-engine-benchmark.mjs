#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lane = process.env.ENGINE_BENCHMARK_LANE || 'threejs';
const baseUrl = process.env.ENGINE_BENCHMARK_URL;
const durationMs = Number(process.env.ENGINE_BENCHMARK_DURATION_MS || 20000);
const headed = process.env.ENGINE_BENCHMARK_HEADED === '1';
if (!baseUrl) throw new Error('ENGINE_BENCHMARK_URL is required');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(root, 'benchmarks', 'browser-engine', 'runs', `${stamp}-${lane}`);
const scenarios = [
  { id: 'desktop', viewport: { width: 1440, height: 900 } },
  { id: 'mobile-landscape', viewport: { width: 844, height: 390 }, isMobile: true }
];
const quantile = (values, q) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const round = (value) => Number.isFinite(value) ? Number(value.toFixed(2)) : null;

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: !headed });
const results = [];
try {
  for (const scenario of scenarios) {
    const scenarioDir = path.join(outDir, scenario.id);
    await mkdir(scenarioDir, { recursive: true });
    const context = await browser.newContext({
      viewport: scenario.viewport,
      isMobile: scenario.isMobile || false,
      deviceScaleFactor: 1
    });
    const page = await context.newPage();
    const responseBytes = new Map();
    page.on('response', async (response) => {
      try {
        const headers = await response.allHeaders();
        const length = Number(headers['content-length']);
        responseBytes.set(response.url(), Number.isFinite(length) ? length : (await response.body()).byteLength);
      } catch {}
    });
    await page.addInitScript(() => {
      window.__engineBakeoffFrames = [];
      let previous = performance.now();
      const sample = (now) => {
        window.__engineBakeoffFrames.push(now - previous);
        previous = now;
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    const route = `${baseUrl.replace(/\/$/, '')}/?raceAutoplay=1&track=comeback-city#race`;
    const navigationStarted = Date.now();
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 60000 });
    if (lane === 'threejs') {
      await page.waitForFunction(() => {
        const t = window.__comebackCityKartTelemetry;
        return t?.renderer === 'three-kart' && t.countdown === 0 && t.raceTime > 2;
      }, null, { timeout: 60000 });
    } else {
      await page.waitForTimeout(Number(process.env.ENGINE_BENCHMARK_WARMUP_MS || 10000));
    }
    const readyAtMs = Date.now() - navigationStarted;
    await page.evaluate(() => { window.__engineBakeoffFrames = []; });
    await page.screenshot({ path: path.join(scenarioDir, 'start.png') });
    await page.waitForTimeout(durationMs / 2);
    await page.screenshot({ path: path.join(scenarioDir, 'middle.png') });
    await page.waitForTimeout(durationMs / 2);
    await page.screenshot({ path: path.join(scenarioDir, 'end.png') });
    const pageData = await page.evaluate(() => ({
      frames: window.__engineBakeoffFrames || [],
      navigation: performance.getEntriesByType('navigation')[0]?.toJSON?.() || null,
      memory: performance.memory ? {
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        usedJSHeapSize: performance.memory.usedJSHeapSize
      } : null,
      telemetry: window.__comebackCityKartTelemetry || window.__engineBenchmarkTelemetry || null
    }));
    const frames = pageData.frames.filter((value) => Number.isFinite(value) && value > 0);
    const fps = frames.map((ms) => 1000 / ms);
    const sortedFps = [...fps].sort((a, b) => a - b);
    const lowCount = Math.max(1, Math.ceil(sortedFps.length * 0.01));
    const scene = pageData.telemetry?.rendererStats || pageData.telemetry?.scene || null;
    results.push({
      id: scenario.id,
      viewport: scenario.viewport,
      url: route,
      load: {
        startupToReadyMs: readyAtMs,
        transferBytes: [...responseBytes.values()].reduce((sum, value) => sum + value, 0),
        responseCount: responseBytes.size,
        navigation: pageData.navigation
      },
      memory: pageData.memory,
      frames: {
        sampleCount: frames.length,
        medianFps: round(quantile(fps, 0.5)),
        onePercentLowFps: round(sortedFps.slice(0, lowCount).reduce((a, b) => a + b, 0) / lowCount),
        medianFrameMs: round(quantile(frames, 0.5)),
        p99FrameMs: round(quantile(frames, 0.99)),
        longFrameCount: frames.filter((ms) => ms > 50).length,
        spikeCount: frames.filter((ms) => ms > 100).length
      },
      scene,
      artifacts: ['start.png', 'middle.png', 'end.png']
    });
    await context.close();
  }
} finally {
  await browser.close();
}

const report = {
  protocolVersion: 1,
  lane,
  capturedAt: new Date().toISOString(),
  diagnosticOnly: !headed,
  environment: {
    headed,
    hostname: os.hostname(),
    platform: `${os.platform()} ${os.release()}`,
    cpu: os.cpus()[0]?.model || null,
    logicalCpuCount: os.cpus().length,
    totalMemoryBytes: os.totalmem(),
    playwrightBrowser: 'chromium'
  },
  scenarios: results
};
await writeFile(path.join(outDir, 'metrics.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(path.relative(root, path.join(outDir, 'metrics.json')));
