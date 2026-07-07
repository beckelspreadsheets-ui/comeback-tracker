// Bake the double-faced bitcoin coin: tripo mirrors the B-glyph across the
// coin, so ONE face of every roll is a mirror-mangled glyph. Fix: two
// copies back-to-back, each rotated so its CLEAN face points outward.
// COIN_FLIP=1 swaps which side each copy's offset favors (empirical knob —
// verify via turntable, flip if the mangled faces ended up outside).
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const doc = await io.read('tmp/w2-item-boxes/coin-s2-256.glb');
const root = doc.getRoot();
const scene = root.getDefaultScene() || root.listScenes()[0];
const nodes = scene.listChildren();
if (nodes.length !== 1) throw new Error(`expected 1 root node, got ${nodes.length}`);
const original = nodes[0];

// Bounding box from the mesh position accessor to find the face axis
// (thinnest dimension) and thickness.
const primitive = original.getMesh().listPrimitives()[0];
const position = primitive.getAttribute('POSITION');
const min = position.getMinNormalized([]);
const max = position.getMaxNormalized([]);
const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
const faceAxis = size.indexOf(Math.min(...size));
const thickness = size[faceAxis];
console.log('bbox', size.map((v) => v.toFixed(3)), 'faceAxis', faceAxis, 'thickness', thickness.toFixed(3));

const flip = process.env.COIN_FLIP === '1' ? -1 : 1;
const offset = thickness * 0.02 * flip;

// Nodes can't be cloned in gltf-transform; a second node SHARING the same
// mesh is exactly what we want anyway (no geometry duplication in the
// buffer — only the draw doubles).
const clone = doc.createNode('coin-flip').setMesh(original.getMesh());
// 180° about +Y maps the face axis onto its negative (works for X or Z
// face axes; the coin stands upright so faceAxis should be 0 or 2).
clone.setRotation([0, 1, 0, 0]); // quaternion (x,y,z,w) = 180 deg about Y
const originalTranslation = [0, 0, 0];
const cloneTranslation = [0, 0, 0];
originalTranslation[faceAxis] = offset;
cloneTranslation[faceAxis] = -offset;
original.setTranslation(originalTranslation);
clone.setTranslation(cloneTranslation);
scene.addChild(clone);

await io.write('tmp/w2-item-boxes/coin-composite.glb', doc);
console.log('composite written');
