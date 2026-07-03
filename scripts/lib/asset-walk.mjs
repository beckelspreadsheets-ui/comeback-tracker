import fs from 'node:fs/promises';
import path from 'node:path';
import { loadCandidateMetadataByRepoPath } from './candidate-index.mjs';
import { fromRepoPath, normalizeRepoPath, toRepoPath } from './asset-pipeline-config.mjs';

const GLTF_EXTENSIONS = new Set(['.glb', '.gltf']);

export async function collectAssetFiles(repoRoot, sourceRootsConfig, scope) {
  const includeCandidates = scope === 'candidates' || scope === 'all';
  const candidateMetadataByRepoPath = includeCandidates
    ? await loadCandidateMetadataByRepoPath(repoRoot)
    : new Map();
  const indexedCandidateFiles = includeCandidates && candidateMetadataByRepoPath.size
    ? await collectIndexedCandidateFiles(repoRoot, candidateMetadataByRepoPath)
    : [];
  const roots = rootsForScope(sourceRootsConfig, scope)
    .filter((root) => !(root.kind === 'candidate' && indexedCandidateFiles.length));
  const files = [];

  for (const root of roots) {
    const absoluteRoot = fromRepoPath(repoRoot, root.path);
    const exists = await pathExists(absoluteRoot);
    if (!exists) {
      if (root.required) {
        files.push({
          rootId: root.id,
          rootKind: root.kind,
          rootPath: root.path,
          missingRoot: true,
          repoPath: normalizeRepoPath(root.path),
          absolutePath: absoluteRoot,
        });
      }
      continue;
    }

    const found = await walkGltfFiles(absoluteRoot);
    for (const absolutePath of found) {
      files.push({
        rootId: root.id,
        rootKind: root.kind,
        rootPath: root.path,
        missingRoot: false,
        repoPath: toRepoPath(repoRoot, absolutePath),
        absolutePath,
        ...candidateMetadataByRepoPath.get(toRepoPath(repoRoot, absolutePath)),
      });
    }
  }

  return [...files, ...indexedCandidateFiles].sort((a, b) => a.repoPath.localeCompare(b.repoPath));
}

async function collectIndexedCandidateFiles(repoRoot, candidateMetadataByRepoPath) {
  const files = [];
  for (const [repoPath, metadata] of candidateMetadataByRepoPath) {
    const absolutePath = fromRepoPath(repoRoot, repoPath);
    files.push({
      rootId: metadata.candidatePipeline || 'candidate-index',
      rootKind: 'candidate',
      rootPath: path.dirname(repoPath),
      missingRoot: !(await pathExists(absolutePath)),
      repoPath,
      absolutePath,
      ...metadata,
    });
  }
  return files;
}

function rootsForScope(sourceRootsConfig, scope) {
  const configured = sourceRootsConfig.roots || [];
  if (scope === 'source') {
    return configured.filter((root) => root.kind === 'immutable-source');
  }
  if (scope === 'runtime') {
    return configured.filter((root) => root.kind === 'runtime');
  }
  if (scope === 'candidates') {
    return [
      {
        id: 'optimized-candidates',
        path: 'asset-pipeline/working/optimized',
        kind: 'candidate',
        required: false,
      },
      {
        id: 'blender-decimate-candidates',
        path: 'asset-pipeline/working/blender-decimate',
        kind: 'candidate',
        required: false,
      },
    ];
  }
  return [
    ...configured.filter((root) => root.kind === 'immutable-source' || root.kind === 'runtime'),
    {
      id: 'optimized-candidates',
      path: 'asset-pipeline/working/optimized',
      kind: 'candidate',
      required: false,
    },
    {
      id: 'blender-decimate-candidates',
      path: 'asset-pipeline/working/blender-decimate',
      kind: 'candidate',
      required: false,
    },
  ];
}

async function pathExists(absolutePath) {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

async function walkGltfFiles(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkGltfFiles(absolutePath));
    } else if (entry.isFile() && GLTF_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(absolutePath);
    }
  }

  return files;
}
