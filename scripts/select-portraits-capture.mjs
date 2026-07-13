// Generates the character/kart portraits for the select screen from the real
// GLBs (select-portraits.html booth, transparent background). Rerun whenever
// a roster character or kart model changes; outputs are committed assets.
// Yaws are the lab-verified facings turned ~0.55rad for a 3/4 hero pose.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const PORT = 5304;
const OUT = path.join(root, 'src', 'assets', 'game', 'select');

const TRIPO_POSE = -Math.PI / 2 + 0.55;
const KENNEY_POSE = Math.PI + 0.55;
// K5 Meshy karts arrive nose on -X (Tripo's are +X) — mirrored hero pose.
const MESHY_KART_POSE = Math.PI / 2 + 0.55;
// Lifoladen's Meshy rig fronts +Z (lab-verified 2026-07-12) — no facing
// correction, just the 3/4 turn.
const FRONT_Z_POSE = 0.55;
const PORTRAITS = [
  { model: '/src/assets/game/models/avatars/crrt-bunny.glb', name: 'char-crrt-bunny', yaw: TRIPO_POSE },
  { model: '/src/assets/game/models/avatars/lifoladen.glb', name: 'char-lifoladen', yaw: FRONT_Z_POSE },
  { model: '/src/assets/game/models/avatars/seth-penguin.glb', name: 'char-seth-penguin', yaw: TRIPO_POSE },
  { model: '/src/assets/game/models/avatars/mizzle.glb', name: 'char-mizzle', yaw: TRIPO_POSE },
  { model: '/src/assets/game/models/avatars/tclow-penguin.glb', name: 'char-tclow', yaw: TRIPO_POSE },
  { model: '/src/assets/game/models/avatars/layer23-penguin.glb', name: 'char-layer23', yaw: TRIPO_POSE },
  { model: '/src/assets/game/models/tripo/hero-kart-tripo.glb', name: 'kart-hero', yaw: TRIPO_POSE },
  { model: '/src/assets/game/models/tripo/ice-sled.glb', name: 'kart-icesled', yaw: TRIPO_POSE },
  { model: '/src/assets/game/models/toy-car-kit/vehicle-drag-racer.glb', name: 'kart-kenney', yaw: KENNEY_POSE },
  { model: '/src/assets/game/models/karts/ice-racer.glb', name: 'kart-iceracer', yaw: MESHY_KART_POSE },
  { model: '/src/assets/game/models/karts/miami-cruiser.glb', name: 'kart-miamicruiser', yaw: MESHY_KART_POSE },
];

const waitForServer = async (url, timeoutMs = 30000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error('vite dev server not ready');
};

await mkdir(OUT, { recursive: true });
const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
});
try {
  await waitForServer(`http://127.0.0.1:${PORT}/select-portraits.html`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { height: 480, width: 480 } });
  for (const portrait of PORTRAITS) {
    await page.goto(
      `http://127.0.0.1:${PORT}/select-portraits.html?model=${encodeURIComponent(portrait.model)}&yaw=${portrait.yaw}`,
      { waitUntil: 'networkidle' }
    );
    await page.waitForFunction(() => window.__portraitReady === true, null, { timeout: 30000 });
    await page.waitForTimeout(400);
    await page.locator('canvas').screenshot({
      omitBackground: true,
      path: path.join(OUT, `${portrait.name}.png`),
    });
    console.log(`wrote ${portrait.name}.png`);
  }
  await browser.close();
} finally {
  server.kill();
}
