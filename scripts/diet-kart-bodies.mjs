#!/usr/bin/env node
// Diet the owner-approved kart lifts down to the shipped kart footprint.
//
//   node scripts/diet-kart-bodies.mjs                       # all *-raw.glb in tmp/kart-lifts -> tmp/kart-diet
//   node scripts/diet-kart-bodies.mjs --slug cold-wallet    # one body
//   node scripts/diet-kart-bodies.mjs --texture 384         # override the base-colour resize
//   node scripts/diet-kart-bodies.mjs --promote             # copy the verified GLBs into the runtime dir
//   node scripts/diet-kart-bodies.mjs --verify              # re-read the SHIPPED karts and gate them
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
const RUNTIME_DIR_DEFAULT = 'src/assets/game/models/karts';
const RUNTIME_DIR = path.resolve(repoRoot, RUNTIME_DIR_DEFAULT);
// --verify defaults to what SHIPS, but takes a directory so the dieted bodies
// can be gated in tmp/kart-diet BEFORE --promote copies them in. Verifying only
// after promotion means the first thing that catches a broken body is the
// runtime directory already containing it.
const VERIFY_DIR = path.resolve(repoRoot, arg('verify-dir', RUNTIME_DIR_DEFAULT));
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

// --verify ---------------------------------------------------------------
//
// WHY THIS MODE EXISTS. Every failure this diet can cause is INVISIBLE to the
// tooling that currently guards the repo:
//
//   * a meshopt GLB whose loader has no MeshoptDecoder renders NOTHING, with
//     no console error and no failed request (KNOWN TRAP 8);
//   * a material that lost its baseColorTexture still loads, still draws, and
//     still counts as a passing asset — the runtime path is
//     MeshToonMaterial{ gradientMap, map }, so map:null is a flat untextured
//     slab, which is exactly the "untextured blockout geometry" read a critic
//     logged against the pre-overhaul build;
//   * a body that lost its alpha (see STEP 3) gets SMALLER, so every size gate
//     goes greener as it breaks.
//
// The asset audit checks budgets, not renderability, and the build is green in
// all three cases. Wave 6 established that a green build proves nothing about
// whether the game renders, so this asserts the render-critical invariants
// directly against the bytes that ship.
const HARD = 'FAIL';
const SOFT = 'warn';

const verifyKart = ({ file, document, bytes, hash, record, budgets, glbJson, decoderRegistered, shipping }) => {
  const findings = [];
  const add = (level, message) => findings.push({ level, message });

  // 1. TRAP 8. Declaring meshopt REQUIRED is fine — it is only fatal when the
  // house loader has stopped registering the decoder, which is why this is
  // reported per-kart (so the blast radius is visible) but stays silent while
  // the loader is intact. A verifier that prints a warning on a healthy file
  // trains the next reader to skim past the one that matters.
  const required = glbJson.extensionsRequired || [];
  if (required.includes('EXT_meshopt_compression') && !decoderRegistered) {
    add(HARD, 'declares EXT_meshopt_compression but the house loader no longer registers MeshoptDecoder — this body renders NOTHING, silently');
  }
  for (const extension of required) {
    if (!['EXT_meshopt_compression', 'KHR_mesh_quantization', 'KHR_texture_basisu'].includes(extension)) {
      add(HARD, `unexpected REQUIRED extension ${extension} — the runtime loader registers meshopt only`);
    }
  }

  // 2. Geometry survived simplify. A zero-triangle or unindexed primitive is
  // the shape a botched decimation takes.
  let triangles = 0;
  let primitives = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      primitives += 1;
      const indices = primitive.getIndices();
      const position = primitive.getAttribute('POSITION');
      if (!position || position.getCount() === 0) add(HARD, 'primitive has no POSITION data');
      if (!indices) add(SOFT, 'primitive is not indexed — weld did not run or was undone');
      triangles += (indices ? indices.getCount() : position?.getCount() || 0) / 3;
      // UVs are what makes the base colour a texture rather than a tint.
      if (!primitive.getAttribute('TEXCOORD_0')) add(HARD, 'primitive has no TEXCOORD_0 — base colour cannot be sampled');
    }
  }
  triangles = Math.round(triangles);
  if (triangles === 0) add(HARD, 'zero triangles');
  if (triangles > budgets.triangles.hard) add(HARD, `triangles ${triangles} over hard ${budgets.triangles.hard}`);
  else if (triangles > budgets.triangles.target) add(SOFT, `triangles ${triangles} over target ${budgets.triangles.target}`);

  // 3. The ONLY texture slot the runtime samples must still be there, and the
  // container it survived in must be able to carry the alpha its material
  // claims to need.
  let deadTextureBytes = 0;
  for (const material of document.getRoot().listMaterials()) {
    const base = material.getBaseColorTexture();
    if (!base) {
      add(HARD, `material "${material.getName() || '(unnamed)'}" has no baseColorTexture — MeshToonMaterial gets map:null and draws an untextured slab`);
    } else if (material.getAlphaMode() !== 'OPAQUE' && base.getMimeType() === 'image/jpeg') {
      add(HARD, `material "${material.getName() || '(unnamed)'}" is ${material.getAlphaMode()} but its base colour is jpeg — alpha was destroyed by the resize step`);
    }
    for (const [slot, texture] of [
      ['normal', material.getNormalTexture()],
      ['metallicRoughness', material.getMetallicRoughnessTexture()],
      ['emissive', material.getEmissiveTexture()],
      ['occlusion', material.getOcclusionTexture()],
    ]) {
      if (!texture) continue;
      const slotBytes = texture.getImage()?.byteLength || 0;
      deadTextureBytes += slotBytes;
      // WARN not FAIL: the four karts shipped before this script exists still
      // carry these, and they are explicitly not this script's to rewrite.
      add(SOFT, `carries an unsampled ${slot} map (${KB(slotBytes)}) — MeshToonMaterial cannot sample it`);
    }
  }
  const materials = document.getRoot().listMaterials().length;
  if (materials > budgets.materials.hard) add(HARD, `materials ${materials} over hard ${budgets.materials.hard}`);

  for (const texture of document.getRoot().listTextures()) {
    const size = texture.getSize();
    if (size && Math.max(size[0], size[1]) > budgets.maxTextureDimension) {
      add(HARD, `texture ${size[0]}x${size[1]} over max dimension ${budgets.maxTextureDimension}`);
    }
  }

  if (bytes > budgets.encodedBytes.hard) add(HARD, `${KB(bytes)} over hard ${KB(budgets.encodedBytes.hard)}`);
  else if (bytes > budgets.encodedBytes.target) add(SOFT, `${KB(bytes)} over target ${KB(budgets.encodedBytes.target)}`);

  // 4. Manifest drift. A GLB re-dieted without its manifest entry being
  // updated is how a proof pointer ends up describing a file that no longer
  // exists (the "manifest entries need sourceHash or the audit fails" rule is
  // the same class of problem seen from the other side).
  // shipping === "these bytes are the ones in the runtime directory". Only
  // then is the manifest authoritative about them; a pre-promotion body in
  // tmp/ is EXPECTED to disagree with a manifest that still describes the
  // body it is about to replace, so those become warnings.
  const drift = shipping ? HARD : SOFT;
  if (!record) {
    add(drift, 'no asset-manifest.json entry for this file');
  } else {
    if (!record.sourceHash) add(drift, 'manifest entry has no sourceHash');
    if (record.outputHash !== hash) add(drift, `manifest outputHash ${record.outputHash} != on-disk ${hash}`);
    // A kart mounted without a KART_NOSE_YAW entry drives BACKWARD — an
    // owner-reported bug once already. The wiring package reads this note.
    // Both spellings are accepted: the four 2026-07 bodies record it as
    // "mount yaw +PI/2", the 2026-08 five name the constant outright.
    if (!/KART_NOSE_YAW|mount yaw/i.test(record.role || '')) {
      add(SOFT, 'manifest role does not state a KART_NOSE_YAW — the wiring package has to re-derive the nose direction');
    }
  }

  return { file, triangles, bytes, materials, deadTextureBytes, findings };
};

const runVerify = async (io) => {
  const [budgetsRaw, manifestRaw, loaderSource] = await Promise.all([
    fs.readFile(path.join(repoRoot, 'asset-pipeline/config/asset-budgets.json'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'src/assets/game/asset-manifest.json'), 'utf8'),
    fs.readFile(path.join(repoRoot, 'src/game/race/render/gltfLoader.js'), 'utf8').catch(() => ''),
  ]);
  const budgets = JSON.parse(budgetsRaw).runtime['hero-kart'];
  const manifest = JSON.parse(manifestRaw);
  const records = Array.isArray(manifest) ? manifest : manifest.records || [];

  // The runtime half of TRAP 8, checked statically because the decoder cannot
  // be exercised without a browser: every kart below declares
  // EXT_meshopt_compression as REQUIRED, and the single house loader is the
  // only thing standing between that and an empty scene.
  let failures = 0;
  const decoderRegistered = /setMeshoptDecoder/.test(loaderSource);
  if (!decoderRegistered) {
    console.error('FAIL  src/game/race/render/gltfLoader.js no longer calls setMeshoptDecoder — every meshopt kart will render NOTHING, silently');
    failures += 1;
  } else {
    console.log('ok    gltfLoader.js registers MeshoptDecoder');
  }

  const files = (await fs.readdir(VERIFY_DIR))
    .filter((file) => file.endsWith('.glb'))
    .sort()
    .filter((file) => !ONLY || file === `${ONLY}.glb`);

  for (const file of files) {
    const absolute = path.join(VERIFY_DIR, file);
    const buffer = await fs.readFile(absolute);
    // Read the JSON chunk straight out of the GLB container: extensionsRequired
    // is a container-level fact and gltf-transform does not round-trip it.
    const jsonLength = buffer.readUInt32LE(12);
    const glbJson = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'));
    // Manifest lookup always keys on the RUNTIME path, even when the bytes
    // being read live in tmp/ — the manifest describes where a body ships, not
    // where this invocation found it.
    const repoPath = `${RUNTIME_DIR_DEFAULT}/${file}`;
    const result = verifyKart({
      file,
      document: await io.read(absolute),
      bytes: buffer.byteLength,
      hash: await sha256(absolute),
      record: records.find((entry) => entry.filePath === repoPath) || null,
      budgets,
      glbJson,
      decoderRegistered,
      shipping: VERIFY_DIR === RUNTIME_DIR,
    });

    const hard = result.findings.filter((finding) => finding.level === HARD);
    failures += hard.length;
    console.log(
      `\n${hard.length ? 'FAIL ' : 'ok   '} ${file.padEnd(20)} ${KB(result.bytes).padStart(10)}  tris ${String(result.triangles).padStart(6)}  mats ${result.materials}  dead-tex ${KB(result.deadTextureBytes)}`
    );
    for (const finding of result.findings) console.log(`      ${finding.level}  ${finding.message}`);
  }

  if (failures) {
    console.error(`\n${failures} hard finding(s) — do NOT ship these bodies.`);
    process.exitCode = 1;
  } else {
    console.log(`\nall ${files.length} kart bodies pass the render-critical checks.`);
  }
};

const main = async () => {
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
  // Built before the sharp resolve and before IN_DIR is touched: --verify reads
  // only what SHIPS, so it has to keep working on a checkout that has no
  // tmp/kart-lifts (they are 4 MB each and deliberately untracked) and no
  // encoder installed.
  const verifyIo = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
  if (flag('verify')) {
    await runVerify(verifyIo);
    return;
  }

  const sharp = loadSharp();
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
    //
    // ...EXCEPT when a material actually needs alpha. JPEG has no alpha
    // channel, so pinning it on a MASK/BLEND body silently fills every
    // cut-out — a wing grille, a crate-slat gap, a canopy — with solid paint,
    // and nothing downstream reports it: the file gets SMALLER, the triangle
    // count is untouched, the audit passes, and the defect is only visible by
    // looking at the kart. Gating on alphaMode rather than "does the PNG have
    // an alpha channel" is deliberate and matches the glTF spec: under OPAQUE
    // the alpha channel is defined to be ignored, so converting it away is
    // free and correct. All five bodies dieted on 2026-08-02 are OPAQUE, so
    // this branch has never fired — it exists so the SIXTH one cannot ship
    // broken.
    const alphaMaterials = document
      .getRoot()
      .listMaterials()
      .filter((material) => material.getAlphaMode() !== 'OPAQUE');
    const keepsAlpha = alphaMaterials.length > 0;
    if (keepsAlpha) {
      console.warn(
        `  !! ${slug}: ${alphaMaterials.length} material(s) are ${[...new Set(alphaMaterials.map((m) => m.getAlphaMode()))].join('/')} — NOT pinning jpeg, alpha would be destroyed`
      );
    }
    await document.transform(
      textureCompress({
        encoder: sharp,
        quality: QUALITY,
        resize: [TEXTURE, TEXTURE],
        ...(keepsAlpha ? {} : { targetFormat: 'jpeg' }),
      })
    );
    await record(
      'resize',
      keepsAlpha
        ? `base colour -> ${TEXTURE}px, SOURCE FORMAT KEPT (alpha-dependent material)`
        : `base colour -> ${TEXTURE}px jpeg q${QUALITY}`
    );

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
      // textureFormat is recorded rather than assumed: the manifest's
      // runtimeTransform string quotes it, and the jpeg pin is conditional
      // (see STEP 3), so a future reader must be able to tell which branch ran.
      settings: { ratio: RATIO, error: ERROR, texture: TEXTURE, quality: QUALITY, textureFormat: keepsAlpha ? 'source-kept (alpha)' : 'jpeg' },
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
