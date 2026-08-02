#!/usr/bin/env node
// Diet the owner-approved kart lifts down to the shipped kart footprint.
//
//   node scripts/diet-kart-bodies.mjs                       # all *-raw.glb in tmp/kart-lifts -> tmp/kart-diet
//   node scripts/diet-kart-bodies.mjs --slug cold-wallet    # one body
//   node scripts/diet-kart-bodies.mjs --texture 384         # override the base-colour resize
//   node scripts/diet-kart-bodies.mjs --promote             # copy the verified GLBs into the runtime dir
//
// WHY THIS SCRIPT EXISTS AT ALL, rather than `gltf-transform optimize`:
// the blanket `optimize` command is BANNED in this repo. It bundles weld,
// simplify, resize, texture recompression and meshopt behind one flag, so when
// a body comes out wrong there is no way to tell WHICH verb cost the
// silhouette, and no way to tune one of them. Every verb below runs as its own
// measured step and the byte/triangle count is printed after each one, so the
// pipeline is auditable rather than magic.
//
// MEASUREMENT NOTE: the size printed after steps 0-3 is the size of the GLB
// serialised WITHOUT meshopt (the encoder only runs in step 4). Those numbers
// are comparable to each other and to the raw input, but only the final row is
// the shipped size. That is deliberate — meshopt's ratio depends on what the
// earlier steps left behind, so folding it into every row would hide which
// step actually removed the bytes.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

// sharp is NOT a direct dependency of this repo — it arrives transitively under
// @gltf-transform/cli -> ndarray-pixels. textureCompress needs an encoder and
// this is the only sharp on disk, so resolve the top-level id first (in case a
// future install hoists it) and fall back to the nested copy rather than
// failing with a bare "Cannot find package 'sharp'".
const loadSharp = () => {
  for (const id of ['sharp', 'ndarray-pixels/node_modules/sharp']) {
    try {
      return require(id);
    } catch {}
  }
  const nested = path.join(repoRoot, 'node_modules/ndarray-pixels/node_modules/sharp');
  return require(nested);
};

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const flag = (name) => argv.includes(`--${name}`);

const IN_DIR = path.resolve(repoRoot, arg('in', 'tmp/kart-lifts'));
const OUT_DIR = path.resolve(repoRoot, arg('out', 'tmp/kart-diet'));
const RUNTIME_DIR = path.resolve(repoRoot, 'src/assets/game/models/karts');
const ONLY = arg('slug', null);

// Geometry knobs. 0.5 / 0.01 is the shipped fleet's setting (ice-racer,
// miami-cruiser, ice-block, btc-kart all record
// "weld -> simplify 0.5/0.01 -> resize -> meshopt" in the asset manifest) and
// it lands ~30k-triangle Meshy lifts at ~15k, inside the hero-kart runtime
// budget of 18k target / 25k hard.
const RATIO = Number(arg('ratio', '0.5'));
const ERROR = Number(arg('error', '0.01'));

// Base-colour resize. 384 was the fleet's number, chosen under the 2026-07-12
// budget squeeze when each kart was also paying 245-350 KB for a normal map.
// Step 0 deletes that dead weight (see stripUnsampledTextures), which buys back
// far more than the difference between 384 and 512, so the default is 512: the
// base map is the ONLY texture the runtime samples, so it is the only place
// texture budget buys anything visible.
const TEXTURE = Number(arg('texture', '512'));
const QUALITY = Number(arg('quality', '82'));

const KB = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

const countTriangles = (document) => {
  let tris = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      const count = indices ? indices.getCount() : prim.getAttribute('POSITION')?.getCount() || 0;
      tris += count / 3;
    }
  }
  return Math.round(tris);
};

const textureBytes = (document) =>
  document
    .getRoot()
    .listTextures()
    .reduce((sum, texture) => sum + (texture.getImage()?.byteLength || 0), 0);

// The runtime kart material path is
//   new THREE.MeshToonMaterial({ gradientMap: getToonGradient(), map: node.material?.map })
// in attachTripoKartBody (ComebackCityThreeKartRace.jsx). MeshToonMaterial has
// no metalness/roughness/emissive inputs at all, and the constructor above
// copies ONLY `map` off the loaded material — which three's GLTFLoader fills
// from baseColorTexture. Every other slot is loaded, decoded, uploaded and
// never sampled.
//
// This is not hypothetical. lifoladen.glb shipped a 560 KB normal map for
// exactly this reason and stripping it took the file 904 -> 353 KB with zero
// visual change. The four kart bodies ALREADY SHIPPED are still paying it:
// ice-racer 316 KB, miami-cruiser 350 KB, ice-block 245 KB, btc-kart 344 KB of
// PNG normal map each, against 18-39 KB of base colour — 58-60% of every
// shipped kart file is a texture the runtime cannot sample. (Those four are not
// this package's to touch; the finding is in the handoff.)
const stripUnsampledTextures = (document) => {
  const removed = [];
  for (const material of document.getRoot().listMaterials()) {
    const slots = [
      ['normal', () => material.getNormalTexture(), () => material.setNormalTexture(null)],
      ['metallicRoughness', () => material.getMetallicRoughnessTexture(), () => material.setMetallicRoughnessTexture(null)],
      ['emissive', () => material.getEmissiveTexture(), () => material.setEmissiveTexture(null)],
      ['occlusion', () => material.getOcclusionTexture(), () => material.setOcclusionTexture(null)],
    ];
    for (const [name, get, clear] of slots) {
      const texture = get();
      if (!texture) continue;
      removed.push({ slot: name, bytes: texture.getImage()?.byteLength || 0 });
      clear();
    }
  }
  return removed;
};

const sha256 = async (file) => `sha256:${createHash('sha256').update(await fs.readFile(file)).digest('hex')}`;

const main = async () => {
  const sharp = loadSharp();
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

  const entries = (await fs.readdir(IN_DIR))
    .filter((file) => file.endsWith('.glb'))
    .sort()
    // Lift revisions carry a -v2 suffix; the SHIPPED name is the product name,
    // so it is dropped here rather than baked into the runtime path.
    .map((file) => ({ file, slug: file.replace(/-raw\.glb$/, '').replace(/\.glb$/, '').replace(/-v\d+$/, '') }))
    .filter((entry) => !ONLY || entry.slug === ONLY);

  if (!entries.length) {
    console.error(`no kart lifts matched in ${IN_DIR}`);
    process.exitCode = 2;
    return;
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const report = [];

  for (const { file, slug } of entries) {
    const source = path.join(IN_DIR, file);
    const target = path.join(OUT_DIR, `${slug}.glb`);
    const steps = [];
    const document = await io.read(source);

    const rawBytes = (await fs.stat(source)).size;
    const record = async (label, note) => {
      const bytes = (await io.writeBinary(document)).byteLength;
      steps.push({ step: label, bytes, triangles: countTriangles(document), textureBytes: textureBytes(document), note });
      return bytes;
    };

    console.log(`\n=== ${slug}  (${file}, ${KB(rawBytes)})`);
    steps.push({ step: 'raw', bytes: rawBytes, triangles: countTriangles(document), textureBytes: textureBytes(document), note: 'as lifted' });

    // STEP 0 — drop texture slots the runtime never samples, then prune the
    // now-orphaned images. dedup() first so two identical images do not survive
    // as one kept + one orphan.
    const stripped = stripUnsampledTextures(document);
    await document.transform(dedup(), prune({ keepExtras: true }));
    await record(
      'strip+prune',
      stripped.length
        ? `dropped ${stripped.map((s) => `${s.slot} ${KB(s.bytes)}`).join(', ')}`
        : 'no unsampled texture slots present'
    );

    // STEP 1 — weld. Meshy exports split vertices per triangle corner, so this
    // is what makes the mesh a connected surface. simplify() collapses edges;
    // an unwelded mesh has no shared edges to collapse and simplify would be a
    // near no-op that still costs error budget.
    await document.transform(weld({ overwrite: false }));
    await record('weld', 'shared vertices restored so edge collapse has edges');

    // STEP 2 — simplify. This is the step that can destroy a silhouette, which
    // is why the turntable re-render is mandatory afterwards.
    await document.transform(simplify({ error: ERROR, lockBorder: false, ratio: RATIO, simplifier: MeshoptSimplifier }));
    await record('simplify', `ratio ${RATIO}, error ${ERROR}`);

    // STEP 3 — resize the base colour. targetFormat is pinned to jpeg on
    // purpose: textureCompress preserves the input container by default, and a
    // PNG that merely gets resized stays a PNG — which is exactly how the
    // shipped fleet ended up with 245-350 KB "384x384" normal maps. Pinning the
    // format means the resize step cannot silently keep a lossless container.
    await document.transform(
      textureCompress({ encoder: sharp, quality: QUALITY, resize: [TEXTURE, TEXTURE], targetFormat: 'jpeg' })
    );
    await record('resize', `base colour -> ${TEXTURE}px jpeg q${QUALITY}`);

    // STEP 4 — meshopt LAST. It quantises and compresses the vertex/index
    // streams; running it before simplify would mean simplifying quantised data
    // and re-encoding afterwards. Note this adds EXT_meshopt_compression +
    // KHR_mesh_quantization as REQUIRED extensions, so anything that loads
    // these files must have MeshoptDecoder registered — a meshopt GLB renders
    // NOTHING without it, silently, with no console error. createGameGltfLoader
    // (gltfLoader.js) already registers it, as does scripts/kart-turntable.mjs.
    await document.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
    await io.write(target, document);
    const finalBytes = (await fs.stat(target)).size;
    steps.push({
      step: 'meshopt (SHIPPED)',
      bytes: finalBytes,
      triangles: countTriangles(document),
      textureBytes: textureBytes(document),
      note: 'EXT_meshopt_compression + KHR_mesh_quantization required',
    });

    for (const step of steps) {
      console.log(
        `  ${step.step.padEnd(18)} ${KB(step.bytes).padStart(10)}  tris ${String(step.triangles).padStart(6)}  tex ${KB(step.textureBytes).padStart(9)}  ${step.note || ''}`
      );
    }
    console.log(`  -> ${path.relative(repoRoot, target)}  ${KB(finalBytes)}  (${((1 - finalBytes / rawBytes) * 100).toFixed(1)}% off raw)`);

    report.push({
      slug,
      source: path.relative(repoRoot, source),
      output: path.relative(repoRoot, target),
      sourceHash: await sha256(source),
      outputHash: await sha256(target),
      rawBytes,
      shippedBytes: finalBytes,
      steps,
      settings: { ratio: RATIO, error: ERROR, texture: TEXTURE, quality: QUALITY },
    });
  }

  await fs.mkdir(path.join(OUT_DIR), { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, 'diet-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nreport -> ${path.relative(repoRoot, path.join(OUT_DIR, 'diet-report.json'))}`);

  // Promotion is a SEPARATE, explicit flag. The diet lands in tmp/ first so the
  // turntable can be re-rendered and READ before anything reaches the runtime
  // directory — a diet that destroys the silhouette is worse than no diet, and
  // nothing automated catches that.
  if (flag('promote')) {
    await fs.mkdir(RUNTIME_DIR, { recursive: true });
    for (const entry of report) {
      const dest = path.join(RUNTIME_DIR, `${entry.slug}.glb`);
      await fs.copyFile(path.join(repoRoot, entry.output), dest);
      console.log(`promoted ${entry.slug} -> ${path.relative(repoRoot, dest)}  ${entry.outputHash}`);
    }
  } else {
    console.log('(dry: pass --promote to copy the verified GLBs into src/assets/game/models/karts/)');
  }
};

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
