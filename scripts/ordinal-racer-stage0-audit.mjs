#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { PNG } from 'pngjs';
import { auditGltfFile } from './lib/gltf-metrics.mjs';
import { loadPipelineConfig, writeJsonFile } from './lib/asset-pipeline-config.mjs';

const root = process.cwd();
const output = path.join(root, 'tmp/ordinal-racer-prototype/stage0');
const paths = [
  '3d generations:character sheets/sethhpengu.png',
  '3d generations:character sheets/seth-3dpengu.glb',
  '3d generations:character sheets/layer23pixelated.png',
  '3d generations:character sheets/layer233d.glb',
  'asset-pipeline/raw/references/layer23-meshy-input.png',
  'asset-pipeline/raw/references/layer23-meshy-input-clean.png',
  'asset-pipeline/raw/runtime-copies/layer23-penguin__0622be5ab6c7.glb',
  'src/assets/game/models/avatars/seth-penguin.glb',
  'src/assets/game/models/avatars/layer23-penguin.glb',
  'src/assets/game/select/char-seth-penguin.png',
  'src/assets/game/select/char-layer23.png',
];
const config = await loadPipelineConfig(root);
const files = [];
for (const repoPath of paths) {
  const absolutePath = path.join(root, repoPath);
  let data;
  try { data = await fs.readFile(absolutePath); } catch (error) {
    if (error.code === 'ENOENT') { files.push({ repoPath, exists: false }); continue; }
    throw error;
  }
  const record = {
    repoPath,
    exists: true,
    bytes: data.length,
    sha256: crypto.createHash('sha256').update(data).digest('hex'),
  };
  if (repoPath.endsWith('.png')) {
    const png = PNG.sync.read(data);
    record.image = { width: png.width, height: png.height, format: 'png' };
  } else if (repoPath.endsWith('.glb')) {
    const runtime = repoPath.startsWith('src/');
    const audit = await auditGltfFile({
      repoRoot: root,
      file: {
        absolutePath, repoPath, missingRoot: false,
        rootId: runtime ? 'promoted-runtime-models' : 'stage0-reference',
        rootKind: runtime ? 'runtime' : 'immutable-source',
        rootPath: path.dirname(repoPath), targetRuntimeRepoPath: null,
      },
      config,
      includeValidator: true,
    });
    record.glb = {
      status: audit.status,
      parseOk: audit.parse?.ok ?? false,
      validatorPassed: audit.validator?.passed ?? false,
      renderTriangles: audit.metrics?.renderTriangles ?? 0,
      uploadVertices: audit.metrics?.uploadVertices ?? 0,
      materials: audit.metrics?.materials ?? 0,
      textures: audit.metrics?.textureCount ?? 0,
      maxTextureDimension: audit.metrics?.maxTextureDimension ?? 0,
      animations: audit.metrics?.animations ?? audit.metrics?.animationCount ?? 0,
      animationClips: audit.metrics?.animationNames ?? [],
      usedExtensions: audit.metrics?.usedExtensions ?? [],
      requiredExtensions: audit.metrics?.requiredExtensions ?? [],
      errors: audit.errors ?? [], warnings: audit.warnings ?? [],
    };
  }
  files.push(record);
}
await fs.mkdir(output, { recursive: true });
await writeJsonFile(path.join(output, 'metrics.json'), {
  schemaVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  branch: 'experiment/ordinal-racers-seth-layer23-20260721',
  files,
  missingCanonical: files.filter((file) => !file.exists).map((file) => file.repoPath),
  inscriptionIds: { sethPenguin: null, layer23: null },
});
console.log(`wrote ${path.relative(root, path.join(output, 'metrics.json'))}`);
