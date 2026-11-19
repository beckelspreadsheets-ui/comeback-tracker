// "Keep gold gold": the six rebuilt karts carry the paint-protect vertex flag
// (src/game/race/render/paintProtect.js) and the five older karts do not.
// A re-pack or a re-export that silently dropped the attribute would put the
// lilac coins back with no error anywhere, so the files are checked here.
// Pure node, no browser.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { PAINT_PROTECT_ATTRIBUTE, hasPaintProtect } from '../src/game/race/render/paintProtect.js';

const KARTS = new URL('../src/assets/game/models/karts/', import.meta.url);
// file -> [fewest, most] protected vertices as a share of the kart. Gold and
// lamps are a part of each kart, never none of it and never most of it.
const PROTECTED = {
  'cold-wallet.glb': [0.01, 0.2],
  'hash-runner.glb': [0.005, 0.2],
  'ice-block.glb': [0.03, 0.3],
  'node-runner.glb': [0.01, 0.2],
  'pixel-pickup.glb': [0.01, 0.2],
  'sat-stacker.glb': [0.3, 0.6],
};
const UNTOUCHED = ['btc-kart.glb', 'ice-racer.glb', 'miami-cruiser.glb', '../tripo/hero-kart-tripo.glb', '../tripo/ice-sled.glb'];

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const read = (name) => io.readBinary(new Uint8Array(readFileSync(new URL(name, KARTS))));

assert.equal(PAINT_PROTECT_ATTRIBUTE, '_paint_protect', 'GLTFLoader lower-cases _PAINT_PROTECT');
assert.equal(hasPaintProtect({ attributes: { _paint_protect: {} } }), true);
assert.equal(hasPaintProtect({ attributes: { position: {} } }), false);
assert.equal(hasPaintProtect(null), false);

for (const [name, [low, high]] of Object.entries(PROTECTED)) {
  const document = await read(name);
  let vertices = 0;
  let flagged = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const flags = primitive.getAttribute('_PAINT_PROTECT');
      assert.ok(flags, `${name} ${mesh.getName()}: every primitive carries _PAINT_PROTECT (one material serves them all)`);
      assert.equal(flags.getCount(), primitive.getAttribute('POSITION').getCount(), `${name} ${mesh.getName()}: one flag per vertex`);
      for (let index = 0; index < flags.getCount(); index += 1) {
        const value = flags.getScalar(index);
        assert.ok(value === 0 || value === 1, `${name} ${mesh.getName()}: flag ${value} is neither 0 nor 1`);
        flagged += value;
      }
      vertices += flags.getCount();
    }
  }
  const share = flagged / vertices;
  assert.ok(share >= low && share <= high, `${name}: ${(share * 100).toFixed(1)}% of vertices protected, expected ${low * 100}-${high * 100}%`);
}

for (const name of UNTOUCHED) {
  const document = await read(name);
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      assert.equal(primitive.getAttribute('_PAINT_PROTECT'), null, `${name}: an older kart gained the flag`);
    }
  }
}

// The shaders only read the flag behind a define / on a flagged geometry.
const race = readFileSync(new URL('../src/game/race/render/toonRimShader.js', import.meta.url), 'utf8');
assert.match(race, /#ifdef KART_PAINT_PROTECT\s+float kartTintMask = kartPaintMask \* saturate\(1\.0 - vKartPaintProtect\);\s+#else\s+#define kartTintMask kartPaintMask/);
assert.match(race, /mix\(outgoingLight, kartTinted, kartTintMask \* uKartTint\.a\)/);
const stage = readFileSync(new URL('../src/kart/stagePaint.js', import.meta.url), 'utf8');
assert.match(stage, /#ifdef STAGE_PAINT_PROTECT\s+stageMask \*= clamp\(1\.0 - vStagePaintProtect, 0\.0, 1\.0\);/);

console.log(`kart paint protect: ${Object.keys(PROTECTED).length} rebuilt karts flagged, ${UNTOUCHED.length} older karts untouched`);
