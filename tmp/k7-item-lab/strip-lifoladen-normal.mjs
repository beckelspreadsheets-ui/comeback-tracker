// The avatar mount replaces every material with MeshToonMaterial({map}) —
// normal maps never render on drivers. Strip lifoladen's to reclaim gz.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
});
const doc = await io.read('src/assets/game/models/avatars/lifoladen.glb');
for (const material of doc.getRoot().listMaterials()) {
  material.setNormalTexture(null);
}
await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write('src/assets/game/models/avatars/lifoladen.glb', doc);
