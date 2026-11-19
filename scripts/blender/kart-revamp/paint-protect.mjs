// Stamp the paint-protect attribute onto a kart GLB that was packed before the
// attribute existed, without rebuilding or re-packing it.
//
// The game recolours every saturated texel of a kart (racer wash, bought
// paint). A kart marks the vertices that must keep their own colour (gold,
// brass, lamps, cargo) with a float attribute _PAINT_PROTECT: 1 = never
// recoloured, 0 = ordinary. New builds get it from Blender (kart_lib.py
// stamp_paint_protect + export_attributes); this tool is for a file that is
// already shipped.
//
//   1. the flags, by UV, from the kart's own build script. No bake, no render,
//      about two seconds:
//        KART_PROTECT_DUMP=/abs/protect.json blender -b -P build_<kart>.py -- out/unused.glb
//   2. node scripts/blender/kart-revamp/paint-protect.mjs <in.glb> <out.glb> /abs/protect.json
//
// Each vertex is looked up by its UV (every corner of the unwrap is in the
// dump; the unwrap is deterministic, and the tool stops if a single vertex
// has no match). The attribute is appended as one new meshopt buffer view per
// primitive. Nothing that was in the file moves: the old binary chunk is a
// byte-for-byte prefix of the new one (checked), so positions, normals, UVs,
// indices and all three images are untouched.
// Afterwards update the file's outputHash in src/assets/game/asset-manifest.json.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const [input, output, dumpPath] = process.argv.slice(2);
if (!input || !output || !dumpPath) {
  console.error('usage: paint-protect.mjs <in.glb> <out.glb> <protect.json>');
  process.exit(1);
}
await MeshoptDecoder.ready;
await MeshoptEncoder.ready;

const file = readFileSync(input);
if (file.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
const jsonLength = file.readUInt32LE(12);
const doc = JSON.parse(file.subarray(20, 20 + jsonLength).toString('utf8'));
const binLength = file.readUInt32LE(20 + jsonLength);
const bin = file.subarray(28 + jsonLength, 28 + jsonLength + binLength);
const dump = JSON.parse(readFileSync(dumpPath, 'utf8'));
const ATTRIBUTE = dump.attribute;

// uv -> flag. pack-glb.mjs stores UVs on a 12-bit grid (1/4096), so a packed
// vertex sits up to 1.8e-4 from its corner in the dump. Islands are 4e-3 apart
// (the unwrap margin) and an island is one part, one material, so the nearest
// corner inside that distance carries the right flag; a vertex with corners of
// both flags inside twice that distance is refused rather than guessed.
const TOLERANCE = 2e-4;
const CELL = 2 * TOLERANCE;
const grid = new Map();
const cellKey = (i, j) => i * 100003 + j;
for (const [u, v, flag] of dump.corners) {
  const key = cellKey(Math.floor(u / CELL), Math.floor(v / CELL));
  if (!grid.has(key)) grid.set(key, []);
  grid.get(key).push([u, v, flag]);
}
const lookup = (u, v) => {
  const i = Math.floor(u / CELL);
  const j = Math.floor(v / CELL);
  let best = null;
  const seen = [false, false];
  for (let di = -1; di <= 1; di += 1)
    for (let dj = -1; dj <= 1; dj += 1)
      for (const corner of grid.get(cellKey(i + di, j + dj)) || []) {
        const distance = Math.hypot(corner[0] - u, corner[1] - v);
        if (distance <= 2 * TOLERANCE) seen[corner[2] ? 1 : 0] = true;
        if (!best || distance < best.distance) best = { distance, flag: corner[2] };
      }
  return best && { ...best, mixed: seen[0] && seen[1] };
};

const COMPONENT = {
  5120: [Int8Array, 1, 127],
  5121: [Uint8Array, 1, 255],
  5122: [Int16Array, 2, 32767],
  5123: [Uint16Array, 2, 65535],
  5126: [Float32Array, 4, 1],
};
const readUv = (accessorIndex) => {
  const accessor = doc.accessors[accessorIndex];
  const view = doc.bufferViews[accessor.bufferView];
  const [ArrayType, size, scale] = COMPONENT[accessor.componentType];
  const meshopt = view.extensions?.EXT_meshopt_compression;
  let bytes;
  let stride;
  if (meshopt) {
    stride = meshopt.byteStride;
    bytes = new Uint8Array(meshopt.count * stride);
    MeshoptDecoder.decodeGltfBuffer(bytes, meshopt.count, stride, bin.subarray(meshopt.byteOffset || 0, (meshopt.byteOffset || 0) + meshopt.byteLength), meshopt.mode, meshopt.filter);
  } else {
    stride = view.byteStride || size * 2;
    bytes = new Uint8Array(bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength));
  }
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const read = (offset) => {
    if (ArrayType === Float32Array) return data.getFloat32(offset, true);
    const raw = { 1: accessor.componentType === 5120 ? data.getInt8(offset) : data.getUint8(offset), 2: accessor.componentType === 5122 ? data.getInt16(offset, true) : data.getUint16(offset, true) }[size];
    return accessor.normalized ? raw / scale : raw;
  };
  const uv = [];
  for (let index = 0; index < accessor.count; index += 1) {
    const at = (accessor.byteOffset || 0) + index * stride;
    uv.push([read(at), read(at + size)]);
  }
  return uv;
};

const fallbackIndex = doc.buffers.findIndex((buffer) => buffer.extensions?.EXT_meshopt_compression?.fallback);
if (fallbackIndex < 0) throw new Error('expected a meshopt-packed GLB (pack-glb.mjs)');
const appended = [];
let appendAt = bin.length; // the GLB chunk is already padded to 4
let worst = 0;
const summary = [];
for (const mesh of doc.meshes) {
  for (const primitive of mesh.primitives) {
    if (primitive.attributes[ATTRIBUTE] !== undefined) throw new Error(`${mesh.name} already has ${ATTRIBUTE}`);
    const uv = readUv(primitive.attributes.TEXCOORD_0);
    const flags = new Float32Array(uv.length);
    let on = 0;
    uv.forEach(([u, v], index) => {
      const hit = lookup(u, v);
      if (!hit || hit.distance > TOLERANCE) throw new Error(`${mesh.name}: vertex ${index} uv ${u},${v} is not in the dump (wrong kart, or the unwrap changed)`);
      if (hit.mixed) throw new Error(`${mesh.name}: vertex ${index} uv ${u},${v} sits between a protected and an ordinary corner`);
      worst = Math.max(worst, hit.distance);
      flags[index] = hit.flag;
      on += hit.flag;
    });
    const raw = new Uint8Array(flags.buffer);
    const encoded = MeshoptEncoder.encodeGltfBuffer(raw, flags.length, 4, 'ATTRIBUTES');
    const fallback = doc.buffers[fallbackIndex];
    const fallbackOffset = Math.ceil(fallback.byteLength / 4) * 4;
    fallback.byteLength = fallbackOffset + raw.length;
    doc.bufferViews.push({
      buffer: fallbackIndex,
      byteLength: raw.length,
      byteOffset: fallbackOffset,
      byteStride: 4,
      extensions: { EXT_meshopt_compression: { buffer: 0, byteLength: encoded.length, byteOffset: appendAt, byteStride: 4, count: flags.length, mode: 'ATTRIBUTES' } },
      target: 34962,
    });
    doc.accessors.push({ bufferView: doc.bufferViews.length - 1, componentType: 5126, count: flags.length, max: [on ? 1 : 0], min: [on === flags.length ? 1 : 0], type: 'SCALAR' });
    primitive.attributes[ATTRIBUTE] = doc.accessors.length - 1;
    const padded = Buffer.alloc(Math.ceil(encoded.length / 4) * 4);
    padded.set(encoded);
    appended.push(padded);
    appendAt += padded.length;
    summary.push(`${mesh.name} ${on}/${flags.length}`);
  }
}

const newBin = Buffer.concat([bin, ...appended]);
doc.buffers[0].byteLength = newBin.length;
let text = Buffer.from(JSON.stringify(doc), 'utf8');
text = Buffer.concat([text, Buffer.alloc((4 - (text.length % 4)) % 4, 0x20)]);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + text.length + 8 + newBin.length, 8);
const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(text.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(newBin.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4);
const out = Buffer.concat([header, jsonHeader, text, binHeader, newBin]);
if (!newBin.subarray(0, bin.length).equals(bin)) throw new Error('the old binary chunk moved');
writeFileSync(output, out);
console.log(
  `${output}: ${ATTRIBUTE} protected/vertices ${summary.join(', ')}; worst uv match ${worst.toExponential(1)}; ` +
    `${file.length} -> ${out.length} bytes, old binary chunk kept byte for byte; sha256:${createHash('sha256').update(out).digest('hex')}`
);
