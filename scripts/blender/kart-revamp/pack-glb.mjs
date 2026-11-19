// Pack a kart GLB from Blender for the game: meshopt compression at the level
// the shipped kart bodies use ('high': 16-bit positions, 8-bit octahedral
// normals; see scripts/diet-kart-bodies.mjs). No weld, no simplify, no
// texture work, so the baked maps come through as built. This is NOT
// `gltf-transform optimize`, which must never be run on these files.
//
//   node scripts/blender/kart-revamp/pack-glb.mjs in.raw.glb out.glb [--seat=<x>] [--join-rear]
//
// Two optional finishing steps, both part of the drop-in contract (README):
//   --seat=<x>   add an empty node `seat_mount` at x on the kart's long axis
//                (file units, same sign as the file: a nose on -X has its
//                seat at +x). The game puts the driver over it. Skipped if
//                the file already has a `seat_mount`.
//   --join-rear  the two rear wheels turn on one axle and never steer, so
//                they become one mesh `wheel_rear` under `hub_rear` (one draw
//                call fewer). The fronts stay separate: each steers about its
//                own centre.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { joinPrimitives, meshopt, prune, transformPrimitive } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { statSync } from 'node:fs';

const args = process.argv.slice(2);
const [input, output] = args.filter((arg) => !arg.startsWith('--'));
const option = (name) => args.find((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`));
await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const document = await io.read(input);
const root = document.getRoot();
const nodeNamed = (name) => root.listNodes().find((node) => node.getName() === name);
const kartRoot = root.listScenes()[0].listChildren()[0];

// column-major 4x4 helpers (only rigid transforms with uniform scale occur)
const multiply = (a, b) => {
  const out = new Array(16).fill(0);
  for (let column = 0; column < 4; column += 1)
    for (let row = 0; row < 4; row += 1)
      for (let k = 0; k < 4; k += 1) out[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
  return out;
};
const invertRigid = (m) => {
  // rotation * uniform scale s, plus translation: inverse is R^T / s^2 on the 3x3
  const s2 = m[0] * m[0] + m[1] * m[1] + m[2] * m[2];
  const out = new Array(16).fill(0);
  for (let column = 0; column < 3; column += 1) for (let row = 0; row < 3; row += 1) out[column * 4 + row] = m[row * 4 + column] / s2;
  for (let row = 0; row < 3; row += 1) out[12 + row] = -(out[row] * m[12] + out[4 + row] * m[13] + out[8 + row] * m[14]);
  out[15] = 1;
  return out;
};

if (option('join-rear')) {
  const left = nodeNamed('wheel_rear_l');
  const right = nodeNamed('wheel_rear_r');
  const hubLeft = nodeNamed('hub_rear_l');
  const hubRight = nodeNamed('hub_rear_r');
  if (!left || !right || !hubLeft || !hubRight) throw new Error('--join-rear needs wheel_rear_l/r under hub_rear_l/r');
  // the shared hub: on the axle, midway, with the right hub's axle direction
  const a = hubLeft.getWorldTranslation();
  const b = hubRight.getWorldTranslation();
  const hub = document.createNode('hub_rear').setTranslation([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]).setRotation(hubRight.getWorldRotation());
  kartRoot.addChild(hub);
  const toHub = invertRigid(hub.getWorldMatrix());
  const prims = [left, right].map((wheel) => {
    const prim = wheel.getMesh().listPrimitives()[0];
    transformPrimitive(prim, multiply(toHub, wheel.getWorldMatrix()));
    return prim;
  });
  const mesh = document.createMesh('wheel_rear').addPrimitive(joinPrimitives(prims));
  hub.addChild(document.createNode('wheel_rear').setMesh(mesh));
  [left, right, hubLeft, hubRight].forEach((node) => node.dispose());
  await document.transform(prune());
}

const seat = option('seat');
if (seat && !nodeNamed('seat_mount')) {
  const x = Number(seat.split('=')[1]);
  if (!Number.isFinite(x)) throw new Error('--seat=<x> needs a number');
  kartRoot.addChild(document.createNode('seat_mount').setTranslation([x, 0, 0]));
}

const names = () => root.listNodes().map((node) => node.getName()).sort().join(',');
const before = names();
await document.transform(meshopt({ encoder: MeshoptEncoder, level: process.env.PACK_LEVEL || 'high' }));
if (names() !== before) throw new Error(`node names changed while packing: ${before} -> ${names()}`);
await io.write(output, document);
console.log(`packed ${output}: ${Math.round(statSync(input).size / 1024)} KB -> ${Math.round(statSync(output).size / 1024)} KB`);
