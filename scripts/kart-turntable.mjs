// Render each lifted kart GLB from four yaws so the owner can judge the mesh
// before it costs a diet pass or a roster slot.
//
//   node scripts/kart-turntable.mjs                 # every *-raw.glb in tmp/kart-lifts
//   node scripts/kart-turntable.mjs --dir tmp/x     # somewhere else
//
// Writes <slug>-turntable.png next to each mesh. Deliberately dumb: a neutral
// studio, three lights, no post — the point is to see the GEOMETRY, not to
// flatter it. Uses the repo's own three + meshopt decoder via a served page,
// because a GLB from Meshy may be meshopt-compressed and a bare loader would
// silently render nothing (the same trap that made penguins render black).
import { readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const arg = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i !== -1 && argv[i + 1] !== undefined ? argv[i + 1] : d;
};

const DIR = path.resolve(root, arg('dir', 'tmp/kart-lifts'));
const PORT = Number(arg('port', 5599));
const YAWS = [0, 90, 180, 270];
const TILE = 420;

if (!existsSync(DIR)) {
  console.error(`no such directory: ${DIR}`);
  process.exit(2);
}
const meshes = readdirSync(DIR).filter((f) => f.endsWith('.glb')).sort();
if (!meshes.length) {
  console.error(`no .glb files in ${DIR}`);
  process.exit(2);
}

// A standalone page served from the repo root so it can import the installed
// three and its meshopt decoder over HTTP.
const pagePath = path.join(DIR, '_turntable.html');
writeFileSync(
  pagePath,
  `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#8a8f98}canvas{display:block}</style>
<script type="importmap">{"imports":{
  "three":"/node_modules/three/build/three.module.js",
  "three/addons/":"/node_modules/three/examples/jsm/"
}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const TILE = ${TILE};
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(TILE, TILE);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#8a8f98');
scene.add(new THREE.HemisphereLight('#ffffff', '#5a6070', 2.2));
const key = new THREE.DirectionalLight('#fff6e8', 2.4); key.position.set(4, 6, 5); scene.add(key);
const rim = new THREE.DirectionalLight('#cfe6ff', 1.1); rim.position.set(-5, 3, -4); scene.add(rim);

const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 200);
const pivot = new THREE.Group(); scene.add(pivot);

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

window.loadKart = (url) => new Promise((resolve, reject) => {
  while (pivot.children.length) pivot.remove(pivot.children[0]);
  loader.load(url, (gltf) => {
    const obj = gltf.scene;
    // Normalise: centre on origin, scale longest axis to 2 units, sit on y=0.
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCentre ? box.getCentre(new THREE.Vector3()) : box.getCenter(new THREE.Vector3());
    const longest = Math.max(size.x, size.y, size.z) || 1;
    const s = 2 / longest;
    obj.scale.setScalar(s);
    obj.position.set(-centre.x * s, -box.min.y * s, -centre.z * s);
    pivot.add(obj);
    let tris = 0, meshes = 0;
    obj.traverse((n) => { if (n.isMesh) { meshes++; const g = n.geometry; if (g?.index) tris += g.index.count / 3; else if (g?.attributes?.position) tris += g.attributes.position.count / 3; } });
    resolve({ meshes, tris: Math.round(tris), size: [size.x, size.y, size.z].map((v) => +v.toFixed(3)) });
  }, undefined, (e) => reject(new Error(String(e?.message || e))));
});

window.shoot = (yawDeg) => {
  pivot.rotation.y = THREE.MathUtils.degToRad(yawDeg);
  camera.position.set(3.2, 1.9, 3.2);
  camera.lookAt(0, 0.55, 0);
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL('image/png');
};
window.__ready = true;
</script>`
);

const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
});
const waitUp = async () => {
  for (let i = 0; i < 90; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/`);
      if (r.ok || r.status === 404) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
};

let browser = null;
const report = [];
try {
  if (!(await waitUp())) throw new Error(`vite never came up on ${PORT}`);
  browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: TILE, height: TILE }, deviceScaleFactor: 1 });
  const rel = path.relative(root, pagePath).split(path.sep).join('/');
  await page.goto(`http://127.0.0.1:${PORT}/${rel}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });

  for (const file of meshes) {
    const slug = file.replace(/-raw\.glb$/, '').replace(/\.glb$/, '');
    const url = `/${path.relative(root, path.join(DIR, file)).split(path.sep).join('/')}`;
    let stats;
    try {
      stats = await page.evaluate((u) => window.loadKart(u), url);
    } catch (error) {
      console.log(`[turntable] ${slug}: LOAD FAILED — ${String(error.message).slice(0, 160)}`);
      report.push({ slug, ok: false, error: String(error.message).slice(0, 200) });
      continue;
    }
    const shots = [];
    for (const yaw of YAWS) shots.push(await page.evaluate((y) => window.shoot(y), yaw));

    // Stitch the four yaws into one strip so it is one glance, not four.
    const strip = await page.evaluate(
      ([urls, tile]) =>
        new Promise((resolve) => {
          const c = document.createElement('canvas');
          c.width = tile * urls.length;
          c.height = tile;
          const ctx = c.getContext('2d');
          let done = 0;
          urls.forEach((u, i) => {
            const im = new Image();
            im.onload = () => {
              ctx.drawImage(im, i * tile, 0);
              if (++done === urls.length) resolve(c.toDataURL('image/png'));
            };
            im.src = u;
          });
        }),
      [shots, TILE]
    );
    const out = path.join(DIR, `${slug}-turntable.png`);
    writeFileSync(out, Buffer.from(strip.split(',')[1], 'base64'));
    console.log(`[turntable] ${slug}: ${stats.meshes} meshes, ${stats.tris.toLocaleString()} tris, bbox ${stats.size.join(' x ')} -> ${path.basename(out)}`);
    report.push({ slug, ok: true, ...stats });
  }
} catch (error) {
  console.error('[turntable] FAILED:', error.message);
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  setTimeout(() => server.kill('SIGKILL'), 2000).unref?.();
  writeFileSync(path.join(DIR, 'turntable-report.json'), `${JSON.stringify(report, null, 2)}\n`);
}
