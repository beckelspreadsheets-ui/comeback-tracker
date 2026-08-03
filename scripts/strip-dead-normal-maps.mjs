#!/usr/bin/env node
// Delete the texture slots the race renderer cannot sample from a shipped GLB,
// in place, and prove the geometry came through untouched. Default scope is the
// kart bodies; --all audits every model directory and --check is the gate that
// stops the bytes coming back.
//
//   node scripts/strip-dead-normal-maps.mjs --dry-run     # measure only, write nothing
//   node scripts/strip-dead-normal-maps.mjs               # strip in place (verified, atomic)
//   node scripts/strip-dead-normal-maps.mjs --slug btc-kart
//   node scripts/strip-dead-normal-maps.mjs --out tmp/x   # write copies instead of in place
//   node scripts/strip-dead-normal-maps.mjs --report a.json
//   node scripts/strip-dead-normal-maps.mjs --all --dry-run   # audit every model dir
//   node scripts/strip-dead-normal-maps.mjs --check           # regression gate, exits 1
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
// AND IT IS NOT ONLY THE KARTS. Every GLB mount path in the race does the same
// rebuild, so this is a property of the renderer, not of one loader:
//
//   attachTripoKartBody      ComebackCityThreeKartRace.jsx:3251   kart bodies
//   attachAuthoredKartBody   ...:3304                             kart bodies
//   mountDriverAvatar        ...:3071                             seated driver
//   item prop mount          ...:3138                             thrown items
//   penguin marcher mount    ...:9412                             PV crowd
//   item box mount           ...:9471                             pickups
//
// Each one constructs `new THREE.MeshToonMaterial({ gradientMap, map })` and
// assigns it over the loaded material. `grep -rn normalMap src/game/` returns
// exactly one hit and it is a DISPOSE loop (WorldScene.jsx:4328) — nothing in
// src/ ever assigns a normalMap, so no shipped GLB anywhere under
// src/assets/game/models/ can render one. That is why --all exists: the audit
// is a property of the whole tree, and restricting it to karts would have left
// the largest single offender (pv-tribute/outplayasians-crosser.glb, 545 KiB
// gz of PNG normal map on a prop that ships) undiscovered.
//
// The four 2026-07 bodies were paying it — 245-350 KB of PNG normal map each
// against 18-39 KB of base colour, i.e. ~58-60% of every shipped kart file.
// That mattered because the gzip gate walks every file under dist-kart
// (scripts/bundle-asset-budget-report.mjs), so an on-demand pool could not
// offset it: only deleting the bytes could, and wiring the five 2026-08 bodies
// needed the room.
//
// STATE 2026-08-03: that strip LANDED (-1255.6 KiB raw / -1256.4 KiB gz,
// tmp/dead-normal-maps/strip-report.json) and it bought exactly what it was
// meant to — all nine karts are wired and the built artifact measures
// 13.608/16 MiB and 10948.3/12000 KiB gz, every check passing. All nine bodies
// under models/karts/ are clean, so a re-run there is a proven no-op. What is
// left is 664.4 KiB raw / 665.5 KiB gz on five SHIPPED props outside this
// package's write scope — see KNOWN_DEAD_DEBT.
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
//
// ---------------------------------------------------------------------------
// WHAT --check IS FOR
// ---------------------------------------------------------------------------
// The strip is a one-shot saving that a single re-import undoes: Meshy and
// Tripo both emit a normal map by default, so the next body that arrives walks
// straight back into the same 250-550 KB. --check re-reads every shipped GLB
// and fails on any dead slot it has not been told about, plus two things a
// green build provably does not catch:
//
//   * TRAP 8 — a meshopt GLB renders NOTHING without MeshoptDecoder, silently,
//     with no console error. Every body here is EXT_meshopt_compression, so
//     the check asserts the runtime loader still installs the decoder.
//   * The manifest's outputHash drifting from the bytes on disk, which is what
//     makes scripts/audit-game-assets.mjs fail later and further from the edit.
//
// It also decodes each body to a world-space bounding box. That is the static
// half of "does this thing render" — it cannot prove pixels, but a body whose
// geometry failed to decode, lost POSITION/NORMAL, or came back zero-extent
// would produce an empty frame that no console error and no green build would
// report. The pixel half needs the capture harness.
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

const MODELS_ROOT = 'src/assets/game/models';
const KART_DIR_DEFAULT = `${MODELS_ROOT}/karts`;
const MANIFEST_PATH = 'src/assets/game/asset-manifest.json';
// The only place in src/ that builds a GLTFLoader (see TRAP 8 above).
const RUNTIME_LOADER_PATH = 'src/game/race/render/gltfLoader.js';

const CHECK = flag('check');
const EXPLICIT_DIR = arg('dir', null);
// --check defaults to the whole tree because that is the only scope in which
// "no dead maps anywhere" is a true statement, but --check --dir stays legal:
// it is how you gate a single directory you have just written.
const ALL = flag('all') || (CHECK && !EXPLICIT_DIR);
const OUT_DIR = arg('out', null) ? path.resolve(repoRoot, arg('out')) : null;
const ONLY = arg('slug', null);
// --check never writes. It is a gate, and a gate that can mutate the tree it is
// auditing is one CI invocation away from rewriting assets nobody asked it to.
const DRY = flag('dry-run') || CHECK;
const METHOD = arg('method', 'filter');
const REPORT = arg('report', null);

// Dead slots that are KNOWN to still be on disk, so --check ships GREEN and
// still fails the moment a NEW one appears. Every entry here is a shipped file
// (each is imported in ComebackCityThreeKartRace.jsx) that this package was not
// scoped to write: wave 8 owns src/assets/game/models/karts/ only. Clearing
// them is one command — `node scripts/strip-dead-normal-maps.mjs --dir
// src/assets/game/models/items` and the same for pv-tribute — and it is worth
// 665.5 KiB gz against the 12000 KiB gz gate.
//
// DELETE AN ENTRY THE MOMENT ITS FILE IS STRIPPED — a stale line silences a
// real regression on that path. --check fails on a stale entry for exactly that
// reason, so this cannot rot quietly; and after stripping, update the file's
// outputHash in asset-manifest.json or the same run fails on hash drift. Sizes
// are the dead image bytes as measured on 2026-08-03 and are informational —
// the gate keys on the slot names.
const KNOWN_DEAD_DEBT = {
  'src/assets/game/models/items/avalanche-mound.glb': { bytes: 33134, slots: ['normal'] },
  'src/assets/game/models/items/blizzard-cloud.glb': { bytes: 35359, slots: ['normal'] },
  'src/assets/game/models/items/fishbone-trap.glb': { bytes: 18181, slots: ['normal'] },
  'src/assets/game/models/items/sardine-rocket.glb': { bytes: 35553, slots: ['normal'] },
  'src/assets/game/models/pv-tribute/outplayasians-crosser.glb': { bytes: 558109, slots: ['normal'] },
};

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

// glTF matrices are COLUMN-major: element 12/13/14 is the translation, not
// element 3/7/11. Getting this backwards silently mirrors every bounding box
// through the origin and the extents still look plausible.
const applyMatrix = (m, [x, y, z]) => [
  m[0] * x + m[4] * y + m[8] * z + m[12],
  m[1] * x + m[5] * y + m[9] * z + m[13],
  m[2] * x + m[6] * y + m[10] * z + m[14],
];

// Static half of "does this body render". It cannot prove pixels — only the
// capture harness can — but every failure it reports produces an EMPTY FRAME
// with a green build and zero console errors, which is exactly the class of
// defect that has cost this overhaul rounds.
const renderability = (document) => {
  const findings = [];
  const root = document.getRoot();
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let primCount = 0;

  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    // getWorldMatrix() folds in the KHR_mesh_quantization dequantisation node
    // scale, so the box below is in the units fitKartScale actually sees.
    const world = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      primCount += 1;
      const position = prim.getAttribute('POSITION');
      if (!position) {
        findings.push(`${mesh.getName() || '(unnamed mesh)'}: primitive has no POSITION — nothing to draw`);
        continue;
      }
      if (!prim.getAttribute('NORMAL')) {
        // MeshToonMaterial bands on the interpolated normal and toonRimShader
        // reads geometryNormal; without NORMAL the body renders as one flat
        // band with no rim at all.
        findings.push(`${mesh.getName() || '(unnamed mesh)'}: primitive has no NORMAL — toon banding and the rim have nothing to shade`);
      }
      const material = prim.getMaterial();
      if (material?.getBaseColorTexture() && !prim.getAttribute('TEXCOORD_0')) {
        findings.push(`${mesh.getName() || '(unnamed mesh)'}: baseColor texture with no TEXCOORD_0 — the one live map cannot be sampled`);
      }
      // getMinNormalized de-quantises i8n/i16n back to real units; getMin would
      // report raw integers and every extent check below would be meaningless.
      const lo = position.getMinNormalized([]);
      const hi = position.getMaxNormalized([]);
      if (![...lo, ...hi].every(Number.isFinite)) {
        findings.push(`${mesh.getName() || '(unnamed mesh)'}: POSITION bounds are not finite — the accessor did not decode`);
        continue;
      }
      for (let corner = 0; corner < 8; corner += 1) {
        const point = applyMatrix(world, [corner & 1 ? hi[0] : lo[0], corner & 2 ? hi[1] : lo[1], corner & 4 ? hi[2] : lo[2]]);
        for (let axis = 0; axis < 3; axis += 1) {
          if (point[axis] < min[axis]) min[axis] = point[axis];
          if (point[axis] > max[axis]) max[axis] = point[axis];
        }
      }
    }
  }

  if (!primCount) findings.push('no mesh primitives — this file draws nothing');
  const size = max.map((value, axis) => value - min[axis]);
  if (primCount && !size.every((extent) => Number.isFinite(extent) && extent > 1e-6)) {
    findings.push(`degenerate world bounds ${size.map((v) => v.toFixed(4)).join(' x ')} — the body would occupy no screen space`);
  }
  for (const texture of root.listTextures()) {
    if (!texture.getImage()?.byteLength) findings.push(`texture ${texture.getName() || '(unnamed)'} has no image payload`);
    else if (!texture.getSize()) findings.push(`texture ${texture.getName() || '(unnamed)'} has an unreadable ${texture.getMimeType()} header`);
  }
  return { findings, primCount, size: size.map((value) => (Number.isFinite(value) ? Number(value.toFixed(3)) : null)) };
};

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

const processKart = async (inDir, file) => {
  const inPath = path.join(inDir, file);
  const io = makeIO();
  const beforeBytes = await fs.readFile(inPath);
  const document = await io.read(inPath);
  // Measured on the file AS SHIPPED, before any slot is cleared, so the numbers
  // describe what the runtime loads rather than what this script left behind.
  const render = renderability(document);

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
    dir: path.relative(repoRoot, inDir),
    path: path.relative(repoRoot, inPath),
    render,
    requiresMeshopt: document
      .getRoot()
      .listExtensionsRequired()
      .some((extension) => extension.extensionName === 'EXT_meshopt_compression'),
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

  // --check stops here on purpose: it never writes, so the prune + meshopt
  // re-encode below would be pure cost, and everything the gate reads (dead
  // slots, renderability, hashes) was measured off the file as it shipped.
  if (CHECK || !removed.length) {
    result.skipped = removed.length
      ? `${removed.length} DEAD SLOT(S): ${removed.map((r) => r.slot).join(', ')}`
      : 'no dead texture slots';
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

// Every directory under src/assets/game/models that actually holds a GLB.
// Discovered rather than listed, because the failure this whole script exists
// to prevent is a body arriving somewhere nobody remembered to look.
const collectModelDirs = async (root) => {
  const dirs = [];
  const walk = async (dir) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    if (entries.some((entry) => entry.isFile() && entry.name.endsWith('.glb'))) dirs.push(dir);
    for (const entry of entries) if (entry.isDirectory()) await walk(path.join(dir, entry.name));
  };
  await walk(root);
  return dirs.sort();
};

// The gate. Everything in here is read-only and reports a COUNT of failures so
// the caller decides the exit code — a checker that calls process.exit() itself
// cannot be reused inside a longer run.
const runCheck = async (results) => {
  let failed = 0;
  const fail = (line) => {
    console.log(`FAIL ${line}`);
    failed += 1;
  };

  console.log('\n--- check -----------------------------------------------------');

  // 1. Dead slots. Known debt is reported but does not fail; anything else does.
  let debtBytes = 0;
  const stillDirty = new Set();
  for (const result of results) {
    if (!result.removed.length) continue;
    stillDirty.add(result.path);
    const slots = result.removed.map((entry) => entry.slot).sort();
    const known = KNOWN_DEAD_DEBT[result.path];
    const bytes = result.removed.reduce((sum, entry) => sum + entry.bytes, 0);
    if (known && slots.join(',') === [...known.slots].sort().join(',')) {
      debtBytes += bytes;
      console.log(`debt ${result.path}  ${slots.join(', ')}  ${KIB(bytes)}  (known, still to strip)`);
      continue;
    }
    fail(`${result.path} carries ${slots.join(', ')} (${KIB(bytes)}) that no material in src/ can sample — run this script on its directory`);
  }
  // A file that has been stripped but is still listed as debt makes the list
  // hide the NEXT regression on that path, so failing is what forces the line
  // out. Only judge paths this run actually scanned — a --dir or --slug run
  // sees a subset and must not report the rest as stale.
  const scanned = new Set(results.map((result) => result.path));
  for (const known of Object.keys(KNOWN_DEAD_DEBT)) {
    if (scanned.has(known) && !stillDirty.has(known)) fail(`KNOWN_DEAD_DEBT lists ${known} but it is clean — delete that entry`);
  }

  // 2. Renderability. Every one of these is an empty frame with a green build.
  for (const result of results) {
    for (const finding of result.render.findings) fail(`${result.path}: ${finding}`);
  }

  // 3. TRAP 8. Meshopt GLBs render NOTHING without the decoder, silently.
  const meshoptBodies = results.filter((result) => result.requiresMeshopt);
  if (meshoptBodies.length) {
    const loaderSource = await fs.readFile(path.resolve(repoRoot, RUNTIME_LOADER_PATH), 'utf8').catch(() => null);
    if (loaderSource === null) fail(`${RUNTIME_LOADER_PATH} is missing — ${meshoptBodies.length} bodies require EXT_meshopt_compression`);
    else if (!/setMeshoptDecoder\s*\(/.test(loaderSource)) {
      fail(`${RUNTIME_LOADER_PATH} does not call setMeshoptDecoder — all ${meshoptBodies.length} meshopt bodies would render nothing, with no console error`);
    } else console.log(`ok   ${meshoptBodies.length} meshopt bodies, decoder installed at ${RUNTIME_LOADER_PATH}`);
  }

  // 4. Manifest drift. Cheap here, and it is what makes audit-game-assets fail
  // later and further from the edit that caused it.
  const manifest = JSON.parse(await fs.readFile(path.resolve(repoRoot, MANIFEST_PATH), 'utf8'));
  const byPath = new Map(manifest.filter((entry) => entry.filePath && entry.outputHash).map((entry) => [entry.filePath, entry]));
  let checkedHashes = 0;
  for (const result of results) {
    const entry = byPath.get(result.path);
    if (!entry) {
      // Only inside the shipped model tree. A --dir pointed at a scratch
      // directory is a staging run and has no business in the manifest.
      if (result.path.startsWith(`${MODELS_ROOT}/`)) {
        fail(`${result.path} ships but has no asset-manifest.json entry with an outputHash — audit-game-assets.mjs fails on this later and further from the edit`);
      }
      continue;
    }
    checkedHashes += 1;
    if (entry.outputHash !== result.beforeHash) {
      fail(`${result.path}: manifest outputHash ${entry.outputHash.slice(0, 22)}... != on-disk ${result.beforeHash.slice(0, 22)}...`);
    }
  }
  if (checkedHashes) console.log(`ok   ${checkedHashes} manifest outputHash entries match the bytes on disk`);

  const debtFiles = results.filter((result) => result.removed.length && KNOWN_DEAD_DEBT[result.path]).length;
  console.log(
    `\n${results.length} bodies scanned  ·  outstanding dead-map debt ${KIB(debtBytes)} raw across ${debtFiles} scanned file(s)  ·  ${failed} failure(s)`
  );
  return failed;
};

const main = async () => {
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
  if (!['filter', 'quantize'].includes(METHOD)) {
    console.error(`--method must be 'filter' or 'quantize', got '${METHOD}'`);
    process.exit(2);
  }
  if (ALL && EXPLICIT_DIR) {
    console.error('--all and --dir are mutually exclusive');
    process.exit(2);
  }
  // --out writes by basename, and two dirs can hold the same basename, so a
  // multi-dir run would silently overwrite one body with another.
  if (ALL && OUT_DIR) {
    console.error('--out needs a single --dir; it writes by basename and a multi-dir run would collide');
    process.exit(2);
  }

  const dirs = ALL
    ? await collectModelDirs(path.resolve(repoRoot, MODELS_ROOT))
    : [path.resolve(repoRoot, EXPLICIT_DIR || KART_DIR_DEFAULT)];
  const jobs = [];
  for (const dir of dirs) {
    const files = (await fs.readdir(dir))
      .filter((f) => f.endsWith('.glb'))
      .filter((f) => !ONLY || f === `${ONLY}.glb`)
      .sort();
    for (const file of files) jobs.push({ dir, file });
  }
  if (!jobs.length) {
    console.error(`no .glb files in ${dirs.map((d) => path.relative(repoRoot, d)).join(', ')}${ONLY ? ` matching --slug ${ONLY}` : ''}`);
    process.exit(2);
  }
  if (OUT_DIR) await fs.mkdir(OUT_DIR, { recursive: true });

  const scope = ALL ? `${MODELS_ROOT}/** (${dirs.length} dirs)` : path.relative(repoRoot, dirs[0]);
  console.log(
    `strip-dead-normal-maps  ${CHECK ? 'CHECK' : 'strip'}  scope=${scope}  method=${METHOD}${DRY && !CHECK ? '  DRY RUN' : ''}\n`
  );
  const results = [];
  let failures = 0;
  let lastDir = null;
  for (const { dir, file } of jobs) {
    if (ALL && dir !== lastDir) {
      console.log(`${lastDir ? '\n' : ''}${path.relative(repoRoot, dir)}/`);
      lastDir = dir;
    }
    const result = await processKart(dir, file);
    results.push(result);
    if (result.skipped) {
      // In check mode the decoded world box IS the evidence — it is what says
      // the meshopt payload came back as geometry rather than as nothing.
      const bounds = CHECK
        ? `  ${result.render.primCount} prim${result.render.primCount === 1 ? '' : 's'}  ${result.render.size.join(' x ')} units`
        : '';
      console.log(`skip ${result.slug.padEnd(22)} ${KIB(result.beforeBytes).padStart(11)}  (${result.skipped})${bounds}`);
      for (const finding of result.render.findings) console.log(`     !! ${finding}`);
      continue;
    }
    // A renderability finding is a hard stop, not a note: writing a body that
    // already fails to decode would bake the failure into the shipped bytes.
    if (result.render.findings.length) result.findings = [...result.render.findings, ...(result.findings || [])];
    result.ok = !result.findings?.length;
    const status = result.ok ? 'ok  ' : 'FAIL';
    if (!result.ok) failures += 1;
    console.log(
      `${status} ${result.slug.padEnd(22)} ${KIB(result.beforeBytes).padStart(11)} -> ${KIB(result.afterBytes).padStart(11)} (${pct(result.beforeBytes, result.afterBytes)})   ` +
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

  if (CHECK) failures += await runCheck(results);

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
    console.error(`\n${failures} ${CHECK ? 'check failure(s).' : 'body/bodies failed verification — NOTHING was written.'}`);
    await writeReport(false);
    process.exitCode = 1;
    return;
  }
  if (CHECK) {
    console.log('\ncheck passed.');
    await writeReport(false);
    return;
  }
  if (DRY) {
    console.log('\ndry run — nothing written. Drop --dry-run to apply.');
    await writeReport(false);
    return;
  }

  // Write only after EVERY body has passed. A half-applied strip leaves the
  // fleet in two encodings and the manifest describing neither. Each body goes
  // back to the directory it came from, not to a single module-level input dir
  // — --all spans several.
  for (const result of changed) {
    const target = OUT_DIR ? path.join(OUT_DIR, result.file) : path.resolve(repoRoot, result.dir, result.file);
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
