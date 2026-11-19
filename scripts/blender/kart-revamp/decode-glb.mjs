// Write a plain copy of a meshopt-compressed GLB so Blender can open it for
// the comparison renders. The copy is a throwaway: never ship it.
//   node scripts/blender/kart-revamp/decode-glb.mjs in.glb out.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';

const [input, output] = process.argv.slice(2);
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const document = await io.read(input);
await document.transform(dequantize());
for (const extension of document.getRoot().listExtensionsUsed()) {
  if (['EXT_meshopt_compression', 'KHR_mesh_quantization'].includes(extension.extensionName)) extension.dispose();
}
await io.write(output, document);
console.log('decoded', output);
