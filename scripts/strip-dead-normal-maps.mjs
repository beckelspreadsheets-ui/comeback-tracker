#!/usr/bin/env node
// Delete the texture slots the kart runtime cannot sample from the SHIPPED
// kart bodies, in place, and prove the geometry came through untouched.
//
//   node scripts/strip-dead-normal-maps.mjs --dry-run     # measure only, write nothing
//   node scripts/strip-dead-normal-maps.mjs               # strip in place (verified, atomic)
//   node scripts/strip-dead-normal-maps.mjs --slug btc-kart
//   node scripts/strip-dead-normal-maps.mjs --out tmp/x   # write copies instead of in place
//   node scripts/strip-dead-normal-maps.mjs --report a.json
//
// ---------------------------------------------------------------------------
// WHY THESE BYTES ARE DEAD — READ THE MATERIAL PATH, DO NOT TRUST THIS COMMENT
// ---------------------------------------------------------------------------
// Every authored kart body is mounted by attachTripoKartBody() in
// src/game/ComebackCityThreeKartRace.jsx, and that function does not USE the
// material the GLTFLoader built. It builds a new one:
//
//     const material = applyHeroRim(new THREE.MeshToonMaterial({
//       gradientMap: getToonGradient(),
//       map: node.material?.map || null,
//     }));
//     ...
//     node.material = material;
//
// `map` is the only slot copied off the loaded material, and three's GLTFLoader
// fills `map` from baseColorTexture. MeshToonMaterial does accept a normalMap,
// which is why this needs checking rather than assuming — but nothing assigns
// one, here or in applyHeroRim/applyToonRim (src/game/race/render/
// toonRimShader.js). That shader works exclusively off `geometryNormal`, the
// interpolated vertex normal; grep the module for `normalMap` and there are
// zero hits. The GLB's own material object is dropped on the floor one line
// later. So the normal map is downloaded, decoded, uploaded to the GPU and
// never sampled: bytes paid for pixels that are never rendered.
//
// Precedent, same defect, same fix: lifoladen.glb shipped a normal map the
// MeshToonMaterial{map} path could not read and stripping it took that file
// from 904 KB to 353 KB with no visual change at all.
//
// The four 2026-07 bodies are still paying it — 245-350 KB of PNG normal map
// each against 18-39 KB of base colour, i.e. ~58-60% of every shipped kart
// file. That matters NOW because the gzip gate walks every file under
// dist-kart (scripts/bundle-asset-budget-report.mjs), so an on-demand pool
// cannot offset it: only deleting the bytes can, and wiring the five 2026-08
// bodies needs the room.
//
// ---------------------------------------------------------------------------
// WHY THIS IS A SEPARATE SCRIPT RATHER THAN A FLAG ON diet-kart-bodies.mjs
// ---------------------------------------------------------------------------
// That script is a DIET: weld -> simplify -> resize -> meshopt. Every verb in
// it changes the mesh or the texture on purpose. These four bodies are already
// owner-approved on screen, so the one thing this pass must guarantee is that
// it changes NOTHING except which textures exist. Running them back through a
// simplifier to reach a texture strip would risk the silhouette for no reason.
// Different guarantee, different tool.
//
// ---------------------------------------------------------------------------
// WHY THE RE-ENCODE IS SAFE (measured, not asserted)
// ---------------------------------------------------------------------------
// These GLBs are EXT_meshopt_compression + KHR_mesh_quantization, so reading
// one decodes it and writing it back re-encodes it. Two facts make that a
// non-event, both measured on ice-racer before this script was written:
//
//   * gltf-transform does NOT re-quantize. The accessors come back as the same
//     component types with the same min/max, and POSITION, TEXCOORD_0 and the
//     index buffer are BIT-IDENTICAL through a round trip.
//   * The one lossy step is the meshopt encoder's octahedral NORMAL filter,
//     which is re-applied on write and can move an i8n normal by +/-1 (see
//     METHOD below). This script measures the resulting angle per body and
//     fails if it exceeds NORMAL_DEV_LIMIT_DEG.
//
// METHOD: the encoder has two modes and they are not interchangeable here.
//   'filter'   re-applies the octahedral NORMAL filter. Reproduces the file's
//              EXISTING encoding (ice-racer: 539436 -> 539440 bytes on a no-op
//              round trip), at the cost of that +/-1 normal step.
//   'quantize' is bit-identical on every attribute including NORMAL, but drops
//              the filter and so costs ~16.7 KB per body (~67 KB across four).
// Default is 'filter': it keeps these bodies in the encoding the owner already
// signed off on and that the manifest records ("NORMAL:VEC3/i8n with the
// octahedral filter"), and a sub-degree normal error cannot move a 4-band toon
// ramp except by a pixel exactly on a band edge. --method quantize is there
// for anyone who would rather pay the 67 KB for bit-equality.
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const gzip = promisify(zlib.gzip);

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const flag = (name) => argv.includes(`--${name}`);

const KART_DIR_DEFAULT = 'src/assets/game/models/karts';
const IN_DIR = path.resolve(repoRoot, arg('dir', KART_DIR_DEFAULT));
const OUT_DIR = arg('out', null) ? path.resolve(repoRoot, arg('out')) : null;
const ONLY = arg('slug', null);
const DRY = flag('dry-run');
const METHOD = arg('method', 'filter');
const REPORT = arg('report', null);

// The slots MeshToonMaterial{gradientMap, map} cannot reach. baseColor is
// deliberately absent — it is the one texture the runtime DOES sample and the
// only place texture budget buys anything visible.
const DEAD_SLOTS = [
  ['normal', (m) => m.getNormalTexture(), (m) => m.setNormalTexture(null)],
  ['metallicRoughness', (m) => m.getMetallicRoughnessTexture(), (m) => m.setMetallicRoughnessTexture(null)],
  ['emissive', (m) => m.getEmissiveTexture(), (m) => m.setEmissiveTexture(null)],
  ['occlusion', (m) => m.getOcclusionTexture(), (m) => m.setOcclusionTexture(null)],
];

// One meshopt octahedral round trip is worth well under a degree. Anything
// past this is not the filter, it is a bug, and the body must not be written.
const NORMAL_DEV_LIMIT_DEG = 2.0;

const KIB = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;
const pct = (from, to) => `${(((to - from) / from) * 100).toFixed(1)}%`;
const sha256 = (buffer) => `sha256:${createHash('sha256').update(buffer).digest('hex')}`;

const makeIO = () =>
  new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const listPrimitives = (document) =>
  document
    .getRoot()
    .listMeshes()
    .flatMap((mesh) => mesh.listPrimitives());

const textureBytes = (document) =>
  document
    .getRoot()
    .listTextures()
    .reduce((sum, texture) => sum + (texture.getImage()?.byteLength || 0), 0);

// Snapshot everything a render depends on, so the post-write comparison is
// against the real numbers and not against a re-derived guess.
const snapshot = (document) => ({
  prims: listPrimitives(document).map((prim) => ({
    attributes: Object.fromEntries(
      prim.listSemantics().map((semantic) => {
        const accessor = prim.getAttribute(semantic);
        return [semantic, { array: accessor.getArray(), componentType: accessor.getComponentType(), normalized: accessor.getNormalized() }];
      })
    ),
    indices: prim.getIndices()?.getArray() || null,
    mode: prim.getMode(),
  })),
  nodes: document
    .getRoot()
    .listNodes()
    .map((node) => ({
      name: node.getName(),
      rotation: node.getRotation(),
      scale: node.getScale(),
      translation: node.getTranslation(),
    })),
  baseColorImages: document
    .getRoot()
    .listMaterials()
    .map((material) => material.getBaseColorTexture()?.getImage() || null),
});

// i8-normalised NORMAL -> unit vector, using the glTF two's-complement rule
// (divide by 127, clamp at -1) rather than /128, which would bias every axis.
const decodeNormal = (array, componentType, index) => {
  const scale = componentType === 5120 ? 127 : componentType === 5122 ? 32767 : 1;
  const at = (k) => (scale === 1 ? array[k] : Math.max(array[k] / scale, -1));
  const v = [at(index), at(index + 1), at(index + 2)];
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
};

const compareSnapshots = (before, after) => {
  const findings = [];
  let normalMaxDeg = 0;
  let normalSumDeg = 0;
  let normalCount = 0;

  if (before.prims.length !== after.prims.length) {
    findings.push(`primitive count changed: ${before.prims.length} -> ${after.prims.length}`);
    return { findings, normalMaxDeg, normalMeanDeg: 0 };
  }
  for (let i = 0; i < before.prims.length; i += 1) {
    const a = before.prims[i];
    const b = after.prims[i];
    if (a.mode !== b.mode) findings.push(`prim ${i}: draw mode ${a.mode} -> ${b.mode}`);
    const semantics = new Set([...Object.keys(a.attributes), ...Object.keys(b.attributes)]);
    for (const semantic of semantics) {
      const x = a.attributes[semantic];
      const y = b.attributes[semantic];
      if (!x || !y) {
        findings.push(`prim ${i}: attribute ${semantic} ${x ? 'DROPPED' : 'ADDED'}`);
        continue;
      }
      if (x.array.length !== y.array.length) {
        findings.push(`prim ${i}: ${semantic} length ${x.array.length} -> ${y.array.length}`);
        continue;
      }
      if (x.componentType !== y.componentType || x.normalized !== y.normalized) {
        findings.push(`prim ${i}: ${semantic} type ${x.componentType}/${x.normalized} -> ${y.componentType}/${y.normalized}`);
        continue;
      }
      if (semantic === 'NORMAL') {
        // The one attribute allowed to move, and only by the octahedral
        // filter. Measured as an ANGLE, because a raw integer delta of 1 means
        // nothing until it is expressed as the direction error it causes.
        for (let k = 0; k < x.array.length; k += 3) {
          const p = decodeNormal(x.array, x.componentType, k);
          const q = decodeNormal(y.array, y.componentType, k);
          const dot = Math.min(1, Math.max(-1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]));
          const deg = (Math.acos(dot) * 180) / Math.PI;
          if (deg > normalMaxDeg) normalMaxDeg = deg;
          normalSumDeg += deg;
          normalCount += 1;
        }
        continue;
      }
      for (let k = 0; k < x.array.length; k += 1) {
        if (x.array[k] !== y.array[k]) {
          findings.push(`prim ${i}: ${semantic} changed at element ${k} (${x.array[k]} -> ${y.array[k]})`);
          break;
        }
      }
    }
    const ia = a.indices;
    const ib = b.indices;
    if (!ia !== !ib) findings.push(`prim ${i}: index buffer ${ia ? 'DROPPED' : 'ADDED'}`);
    else if (ia && ib) {
      if (ia.length !== ib.length) findings.push(`prim ${i}: index count ${ia.length} -> ${ib.length}`);
      else
        for (let k = 0; k < ia.length; k += 1) {
          if (ia[k] !== ib[k]) {
            findings.push(`prim ${i}: winding changed at index ${k}`);
            break;
          }
        }
    }
  }
  if (JSON.stringify(before.nodes) !== JSON.stringify(after.nodes)) {
    findings.push('node transforms changed — the mount fit (fitKartScale/KART_NOSE_YAW) is keyed on these');
  }
  // The base colour is the only texture that survives, so it is the only one
  // whose bytes must be provably untouched. gltf-transform passes image
  // buffers through verbatim; this asserts it rather than trusting it.
  const ba = before.baseColorImages;
  const bb = after.baseColorImages;
  if (ba.length !== bb.length) findings.push(`material count changed: ${ba.length} -> ${bb.length}`);
  else
    for (let i = 0; i < ba.length; i += 1) {
      if (!ba[i] && !bb[i]) continue;
      if (!ba[i] || !bb[i]) {
        findings.push(`material ${i}: baseColor image ${ba[i] ? 'LOST' : 'APPEARED'}`);
        continue;
      }
      if (Buffer.compare(Buffer.from(ba[i]), Buffer.from(bb[i])) !== 0) {
        findings.push(`material ${i}: baseColor image bytes changed — the runtime DOES sample this`);
      }
    }
  return { findings, normalMaxDeg, normalMeanDeg: normalCount ? normalSumDeg / normalCount : 0 };
};

const processKart = async (file) => {
  const inPath = path.join(IN_DIR, file);
  const io = makeIO();
  const beforeBytes = await fs.readFile(inPath);
  const document = await io.read(inPath);

  const beforeTextures = document
    .getRoot()
    .listTextures()
    .map((texture) => ({ bytes: texture.getImage()?.byteLength || 0, mime: texture.getMimeType(), name: texture.getName() }));

  const removed = [];
  for (const material of document.getRoot().listMaterials()) {
    for (const [slot, get, clear] of DEAD_SLOTS) {
      const texture = get(material);
      if (!texture) continue;
      removed.push({ bytes: texture.getImage()?.byteLength || 0, material: material.getName() || '(unnamed)', mime: texture.getMimeType(), slot });
      clear(material);
    }
  }

  const result = {
    beforeBytes: beforeBytes.byteLength,
    beforeGz: (await gzip(beforeBytes)).byteLength,
    beforeHash: sha256(beforeBytes),
    // Sum the snapshot taken BEFORE the slots were cleared. Clearing a slot only
    // drops the material's reference — the Texture and its image are still in
    // the document until prune() runs — so measuring the live document here and
    // adding `removed` back would count every stripped map twice and overstate
    // the saving to whoever reads the report next.
    beforeTextureBytes: beforeTextures.reduce((sum, texture) => sum + texture.bytes, 0),
    beforeTextures,
    file,
    removed,
    slug: file.replace(/\.glb$/, ''),
  };

  if (!removed.length) {
    result.skipped = 'no dead texture slots';
    result.afterBytes = result.beforeBytes;
    result.afterGz = result.beforeGz;
    result.afterHash = result.beforeHash;
    // An already-stripped body keeps exactly the textures it had, so the report
    // reads the same shape for skipped and stripped bodies. Re-running this
    // script is a no-op by design; the report has to say so in numbers.
    result.afterTextureBytes = result.beforeTextureBytes;
    result.afterTextures = beforeTextures;
    return result;
  }

  const before = snapshot(document);
  // prune() is what actually deletes the bytes: clearing the slot only drops
  // the reference, leaving the texture and its image still in the document
  // (and still in the written GLB). Scoped to textures so it cannot decide a
  // mesh or a node is unused.
  await document.transform(prune({ propertyTypes: ['Texture', 'TextureInfo'] }));
  // Restate the encoder mode explicitly. Without this the writer falls back to
  // 'quantize' and every body silently grows ~16.7 KB — a strip that gives
  // back 5% of what it saved is the kind of thing nobody notices for a month.
  document.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: METHOD });

  const afterBuffer = Buffer.from(await io.writeBinary(document));
  result.afterBytes = afterBuffer.byteLength;
  result.afterGz = (await gzip(afterBuffer)).byteLength;
  result.afterHash = sha256(afterBuffer);
  result.afterTextureBytes = textureBytes(document);

  // Re-read what was WRITTEN, not the in-memory document. The whole risk in
  // this pass lives in the encode/decode round trip, and comparing the
  // document against itself would step straight over it.
  const written = await makeIO().readBinary(new Uint8Array(afterBuffer));
  const { findings, normalMaxDeg, normalMeanDeg } = compareSnapshots(before, snapshot(written));
  result.findings = findings;
  result.normalMaxDeg = normalMaxDeg;
  result.normalMeanDeg = normalMeanDeg;
  result.afterTextures = written
    .getRoot()
    .listTextures()
    .map((texture) => ({ bytes: texture.getImage()?.byteLength || 0, mime: texture.getMimeType(), name: texture.getName() }));

  if (normalMaxDeg > NORMAL_DEV_LIMIT_DEG) {
    findings.push(`NORMAL deviated ${normalMaxDeg.toFixed(2)} deg, past the ${NORMAL_DEV_LIMIT_DEG} deg limit`);
  }
  for (const slot of DEAD_SLOTS.map(([name]) => name)) {
    const still = written
      .getRoot()
      .listMaterials()
      .some((material) => DEAD_SLOTS.find(([n]) => n === slot)[1](material));
    if (still) findings.push(`${slot} texture survived the strip`);
  }
  result.ok = findings.length === 0;
  result.buffer = afterBuffer;
  return result;
};

const main = async () => {
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
  if (!['filter', 'quantize'].includes(METHOD)) {
    console.error(`--method must be 'filter' or 'quantize', got '${METHOD}'`);
    process.exit(2);
  }
  const files = (await fs.readdir(IN_DIR))
    .filter((f) => f.endsWith('.glb'))
    .filter((f) => !ONLY || f === `${ONLY}.glb`)
    .sort();
  if (!files.length) {
    console.error(`no .glb files in ${IN_DIR}${ONLY ? ` matching --slug ${ONLY}` : ''}`);
    process.exit(2);
  }
  if (OUT_DIR) await fs.mkdir(OUT_DIR, { recursive: true });

  console.log(`strip-dead-normal-maps  dir=${path.relative(repoRoot, IN_DIR)}  method=${METHOD}${DRY ? '  DRY RUN' : ''}\n`);
  const results = [];
  let failures = 0;
  for (const file of files) {
    const result = await processKart(file);
    results.push(result);
    if (result.skipped) {
      console.log(`skip ${result.slug.padEnd(16)} ${KIB(result.beforeBytes).padStart(11)}  (${result.skipped})`);
      continue;
    }
    const status = result.ok ? 'ok  ' : 'FAIL';
    if (!result.ok) failures += 1;
    console.log(
      `${status} ${result.slug.padEnd(16)} ${KIB(result.beforeBytes).padStart(11)} -> ${KIB(result.afterBytes).padStart(11)} (${pct(result.beforeBytes, result.afterBytes)})   ` +
        `gz ${KIB(result.beforeGz).padStart(11)} -> ${KIB(result.afterGz).padStart(11)} (${pct(result.beforeGz, result.afterGz)})`
    );
    console.log(
      `     dropped ${result.removed.map((r) => `${r.slot} ${KIB(r.bytes)} ${r.mime}`).join(', ')}` +
        `   kept ${result.afterTextures.map((t) => `baseColor ${KIB(t.bytes)} ${t.mime}`).join(', ')}`
    );
    console.log(
      `     geometry: POSITION/TEXCOORD/INDICES bit-identical, NORMAL max ${result.normalMaxDeg.toFixed(3)} deg / mean ${result.normalMeanDeg.toFixed(3)} deg`
    );
    for (const finding of result.findings) console.log(`     !! ${finding}`);
  }

  const changed = results.filter((r) => !r.skipped);
  const totals = changed.reduce(
    (acc, r) => ({
      afterBytes: acc.afterBytes + r.afterBytes,
      afterGz: acc.afterGz + r.afterGz,
      beforeBytes: acc.beforeBytes + r.beforeBytes,
      beforeGz: acc.beforeGz + r.beforeGz,
    }),
    { afterBytes: 0, afterGz: 0, beforeBytes: 0, beforeGz: 0 }
  );
  if (changed.length) {
    console.log(
      `\ntotal ${changed.length} bodies  raw ${KIB(totals.beforeBytes)} -> ${KIB(totals.afterBytes)}  (saved ${KIB(totals.beforeBytes - totals.afterBytes)})` +
        `   gz ${KIB(totals.beforeGz)} -> ${KIB(totals.afterGz)}  (saved ${KIB(totals.beforeGz - totals.afterGz)})`
    );
  }

  // The report is written on EVERY exit path, including --dry-run and a failed
  // verification. Measuring without writing is the main reason to run this
  // script at all now that the fleet is stripped, and a --dry-run --report that
  // silently produced no file (the original behaviour) made the flag pair look
  // broken. `applied` records which it was, so a report can never be mistaken
  // for proof that the GLBs on disk changed.
  const writeReport = async (applied) => {
    if (!REPORT) return;
    const reportPath = path.resolve(repoRoot, REPORT);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(
      reportPath,
      `${JSON.stringify(
        {
          applied,
          bodies: results.map(({ buffer, ...rest }) => rest),
          dryRun: DRY,
          failures,
          generatedAt: new Date().toISOString(),
          method: METHOD,
          totals,
        },
        null,
        2
      )}\n`
    );
    console.log(`report ${path.relative(repoRoot, reportPath)}`);
  };

  if (failures) {
    console.error(`\n${failures} body/bodies failed verification — NOTHING was written.`);
    await writeReport(false);
    process.exitCode = 1;
    return;
  }
  if (DRY) {
    console.log('\ndry run — nothing written. Drop --dry-run to apply.');
    await writeReport(false);
    return;
  }

  // Write only after EVERY body has passed. A half-applied strip leaves the
  // fleet in two encodings and the manifest describing neither.
  for (const result of changed) {
    const target = OUT_DIR ? path.join(OUT_DIR, result.file) : path.join(IN_DIR, result.file);
    const tmp = `${target}.tmp-${process.pid}`;
    await fs.writeFile(tmp, result.buffer);
    await fs.rename(tmp, target);
    console.log(`wrote ${path.relative(repoRoot, target)}  ${result.afterHash}`);
  }
  if (changed.length) {
    console.log('\nUPDATE THE MANIFEST: outputHash and sizeBudget for every body above, or the asset audit fails on hash drift.');
  }

  await writeReport(changed.length > 0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
