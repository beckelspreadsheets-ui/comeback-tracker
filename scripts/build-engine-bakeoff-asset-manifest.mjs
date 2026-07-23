#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetRoot = path.join(root, 'src', 'assets', 'game');
const output = path.join(root, 'benchmarks', 'browser-engine', 'equal-input-assets.json');
const allowed = new Set(['.glb', '.gltf', '.png', '.webp']);

const walk = async (dir) => {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(absolute)));
    else if (allowed.has(path.extname(entry.name).toLowerCase())) found.push(absolute);
  }
  return found;
};

const files = (await walk(assetRoot)).sort();
const assets = [];
for (const absolute of files) {
  const bytes = await readFile(absolute);
  assets.push({
    path: path.relative(root, absolute).split(path.sep).join('/'),
    bytes: (await stat(absolute)).size,
    sha256: createHash('sha256').update(bytes).digest('hex')
  });
}
const manifest = {
  protocolVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceCommit: process.env.GIT_COMMIT || null,
  assetRoot: 'src/assets/game',
  totalAssets: assets.length,
  totalBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
  assets
};
await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${assets.length} assets (${manifest.totalBytes} bytes) to ${path.relative(root, output)}`);
