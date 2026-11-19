// Print what a GLB costs: triangles, vertices, draw calls, textures, bytes.
//   node scripts/blender/kart-revamp/glb-info.mjs a.glb [b.glb ...]
import { readFileSync } from 'node:fs';

for (const file of process.argv.slice(2)) {
  const bytes = readFileSync(file);
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  let triangles = 0;
  let vertices = 0;
  let primitives = 0;
  for (const mesh of json.meshes || []) {
    for (const primitive of mesh.primitives) {
      const position = json.accessors[primitive.attributes.POSITION];
      const count = primitive.indices !== undefined ? json.accessors[primitive.indices].count : position.count;
      triangles += count / 3;
      vertices += position.count;
      primitives += 1;
    }
  }
  const images = (json.images || []).map((image) => `${image.mimeType} ${Math.round((json.bufferViews[image.bufferView]?.byteLength || 0) / 1024)} KB`);
  console.log(
    [
      file.split('/').pop(),
      `${Math.round(bytes.length / 1024)} KB`,
      `${triangles} triangles`,
      `${vertices} vertices`,
      `${primitives} draw calls`,
      `${(json.materials || []).length} materials`,
      `images: ${images.join(', ') || 'none'}`,
      `extensions: ${(json.extensionsUsed || []).join(', ') || 'none'}`,
      `nodes: ${(json.nodes || []).map((node) => node.name).filter(Boolean).join(', ')}`,
    ].join(' | ')
  );
}
