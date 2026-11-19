// Pack a kart GLB from Blender for the game: meshopt compression at the level
// the shipped kart bodies use ('high': 16-bit positions, 8-bit octahedral
// normals; see scripts/diet-kart-bodies.mjs). Nothing else is touched: no
// weld, no simplify, no join, no texture work, so node names (the wheels are
// found by name) and the baked maps come through as built. This is NOT
// `gltf-transform optimize`, which must never be run on these files.
//   node scripts/blender/kart-revamp/pack-glb.mjs in.raw.glb out.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { statSync } from 'node:fs';

const [input, output] = process.argv.slice(2);
await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const document = await io.read(input);
const names = () => document.getRoot().listNodes().map((node) => node.getName()).sort().join(',');
const before = names();
await document.transform(meshopt({ encoder: MeshoptEncoder, level: process.env.PACK_LEVEL || 'high' }));
if (names() !== before) throw new Error(`node names changed while packing: ${before} -> ${names()}`);
await io.write(output, document);
console.log(`packed ${output}: ${Math.round(statSync(input).size / 1024)} KB -> ${Math.round(statSync(output).size / 1024)} KB`);
