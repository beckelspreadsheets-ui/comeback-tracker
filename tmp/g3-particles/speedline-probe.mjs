import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const port = 5313;
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-kart', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  await page.goto(`http://127.0.0.1:${port}/#race`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 30000 });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.countdown <= 0, null, { timeout: 30000 });
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => (window.__comebackCityKartTelemetry?.speed || 0) > 80, null, { timeout: 60000 });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.down('Space');
  await page.waitForFunction(() => (window.__comebackCityKartTelemetry?.driftTier || 0) >= 1, null, { timeout: 30000 });
  await page.keyboard.up('Space');
  await page.waitForTimeout(150);
  const info = await page.evaluate(() => {
    const p = window.__g3ParticlesDebug;
    const s = p?.speedLines;
    const tel = window.__comebackCityKartTelemetry || {};
    if (!s) return { missing: true };
    let root = s; while (root.parent) root = root.parent;
    return {
      visible: s.visible,
      opacity: s.material.opacity,
      parentIsCamera: s.parent?.isCamera === true,
      rootIsScene: root.isScene === true,
      pos: s.parent?.position.toArray().map((v) => Math.round(v)),
      drift: tel.drift, boost: tel.miniTurboTier,
    };
  });
  console.log(JSON.stringify(info, null, 1));
  await page.screenshot({ path: 'tmp/g3-particles/speedline-probe.png' });
} finally {
  await browser.close();
  server.kill();
}
