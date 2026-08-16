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
  // NOTE: lifoladen SHIPS as char-lifoladen.webp (bundle diet 2026-07-12) —
  // after a rerun, re-convert the fresh png (tmp/k7-item-lab/portrait-to-webp.mjs)
  // and delete the png; both shells import the .webp.
  { model: '/src/assets/game/models/avatars/lifoladen.glb', name: 'char-lifoladen', yaw: -0.55 },
  { model: '/src/assets/game/models/avatars/seth-penguin.glb', name: 'char-seth-penguin', yaw: TRIPO_POSE },
  { model: '/src/assets/game/models/avatars/mizzle.glb', name: 'char-mizzle', yaw: TRIPO_POSE },
  { model: '/src/assets/game/models/avatars/tclow-penguin.glb', name: 'char-tclow', yaw: TRIPO_POSE },
  { model: '/src/assets/game/models/avatars/layer23-penguin.glb', name: 'char-layer23', yaw: TRIPO_POSE },
  { model: '/src/assets/game/models/tripo/hero-kart-tripo.glb', name: 'kart-hero', yaw: TRIPO_POSE },
  { model: '/src/assets/game/models/tripo/ice-sled.glb', name: 'kart-icesled', yaw: TRIPO_POSE },
  { model: '/src/assets/game/models/toy-car-kit/vehicle-drag-racer.glb', name: 'kart-kenney', yaw: KENNEY_POSE },
  { model: '/src/assets/game/models/karts/ice-racer.glb', name: 'kart-iceracer', yaw: MESHY_KART_POSE },
  { model: '/src/assets/game/models/karts/miami-cruiser.glb', name: 'kart-miamicruiser', yaw: MESHY_KART_POSE },
  // K8 owner picks 2026-07-17 (Cold Storage + Block Reward, Meshy multi-view lifts):
  { model: '/src/assets/game/models/karts/ice-block.glb', name: 'kart-iceblock', yaw: MESHY_KART_POSE },
  { model: '/src/assets/game/models/karts/btc-kart.glb', name: 'kart-btckart', yaw: MESHY_KART_POSE },
  // AAA wave 8 added these five to KART_OPTIONS and never added portraits, so
  // the picker rendered `<img src={undefined}>` for five of twelve karts from
  // that day until 2026-08-07. All five are Meshy lifts (KART_NOSE_YAW = +π/2),
  // so they take the mirrored hero pose like the other Meshy bodies.
  // They ship as .webp — five more PNGs at ~130 KB would have eaten essentially
  // all of the image budget's remaining headroom.
  { model: '/src/assets/game/models/karts/hash-runner.glb', name: 'kart-hashrunner', yaw: MESHY_KART_POSE },
  { model: '/src/assets/game/models/karts/cold-wallet.glb', name: 'kart-coldwallet', yaw: MESHY_KART_POSE },
  { model: '/src/assets/game/models/karts/sat-stacker.glb', name: 'kart-satstacker', yaw: MESHY_KART_POSE },
  { model: '/src/assets/game/models/karts/pixel-pickup.glb', name: 'kart-pixelpickup', yaw: MESHY_KART_POSE },
  { model: '/src/assets/game/models/karts/node-runner.glb', name: 'kart-noderunner', yaw: MESHY_KART_POSE },
];

// PORTRAITS_ONLY=name1,name2 restricts a run to those entries — used when
// adding roster members so existing portraits (incl. webp conversions) stay
// byte-identical.
const only = (process.env.PORTRAITS_ONLY || '').split(',').filter(Boolean);
const CAPTURE_LIST = only.length ? PORTRAITS.filter((entry) => only.includes(entry.name)) : PORTRAITS;

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
  for (const portrait of CAPTURE_LIST) {
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
