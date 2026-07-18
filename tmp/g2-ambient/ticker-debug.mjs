import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const port = 5309;
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-kart', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  await page.goto(`http://127.0.0.1:${port}/?playableAutoplay=1#race`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__comebackCityKartTelemetry?.renderer === 'three-kart', null, { timeout: 30000 });
  await page.waitForTimeout(3000);
  const info = await page.evaluate(() => {
    const a = window.__g2AmbientDebug;
    if (!a) return { missing: true };
    return {
      tickers: a.tickers.map((t) => {
        const m = t.mesh;
        m.updateWorldMatrix(true, false);
        const e = m.matrixWorld.elements;
        return {
          world: [e[12], e[13], e[14]].map((v) => Math.round(v * 10) / 10),
          visible: m.visible,
          parentChildren: m.parent?.children.length,
          inScene: (() => { let p = m; while (p.parent) p = p.parent; return p.isScene === true; })(),
        };
      }),
      floes: a.floes.length,
      snow: Boolean(a.snow),
    };
  });
  console.log(JSON.stringify(info, null, 1));
} finally {
  await browser.close();
  server.kill();
}
