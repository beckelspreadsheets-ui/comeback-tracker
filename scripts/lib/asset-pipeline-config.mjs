import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const CONFIG_PATHS = {
  sourceRoots: 'asset-pipeline/config/source-roots.json',
  budgets: 'asset-pipeline/config/asset-budgets.json',
  profiles: 'asset-pipeline/config/asset-profiles.json',
  manifest: 'src/assets/game/asset-manifest.json',
};

export function normalizeRepoPath(value) {
  return value.split(path.sep).join('/');
}

export function toRepoPath(repoRoot, absolutePath) {
  return normalizeRepoPath(path.relative(repoRoot, absolutePath));
}

export function fromRepoPath(repoRoot, repoPath) {
  return path.resolve(repoRoot, repoPath);
}

export async function readJsonFile(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  return JSON.parse(text);
}

export async function readJsonIfExists(filePath, fallback) {
  try {
    return await readJsonFile(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function hashFile(filePath) {
  const hash = crypto.createHash('sha256');
  const file = await fs.open(filePath, 'r');
  try {
    for await (const chunk of file.readableWebStream()) {
      hash.update(Buffer.from(chunk));
    }
  } finally {
    await file.close();
  }
  return `sha256:${hash.digest('hex')}`;
}

export function hashString(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

export async function writeJsonFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const text = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(filePath, text);
}

export async function loadPipelineConfig(repoRoot) {
  const sourceRootsPath = fromRepoPath(repoRoot, CONFIG_PATHS.sourceRoots);
  const budgetsPath = fromRepoPath(repoRoot, CONFIG_PATHS.budgets);
  const profilesPath = fromRepoPath(repoRoot, CONFIG_PATHS.profiles);
  const manifestPath = fromRepoPath(repoRoot, CONFIG_PATHS.manifest);

  const [sourceRoots, budgets, profiles, manifest] = await Promise.all([
    readJsonFile(sourceRootsPath),
    readJsonFile(budgetsPath),
    readJsonFile(profilesPath),
    readJsonIfExists(manifestPath, []),
  ]);

  return {
    repoRoot,
    sourceRoots,
    budgets,
    profiles,
    manifest,
    manifestRecords: Array.isArray(manifest) ? manifest : manifest.records || [],
  };
}

export async function hashConfigFiles(repoRoot) {
  const entries = {};
  for (const [key, repoPath] of Object.entries(CONFIG_PATHS)) {
    const absolutePath = fromRepoPath(repoRoot, repoPath);
    try {
      entries[key] = {
        path: repoPath,
        hash: await hashFile(absolutePath),
      };
    } catch (error) {
      entries[key] = {
        path: repoPath,
        error: error.message,
      };
    }
  }
  return entries;
}

export function classifyAsset(repoPath, profilesConfig) {
  const classifications = profilesConfig?.classifications || [];
  for (const entry of classifications) {
    if (entry.path && repoPath === entry.path) {
      return normalizeClassification(repoPath, entry);
    }
    if (entry.pathPrefix && repoPath.startsWith(entry.pathPrefix)) {
      return normalizeClassification(repoPath, entry);
    }
    if (entry.pathSuffix && repoPath.endsWith(entry.pathSuffix)) {
      return normalizeClassification(repoPath, entry);
    }
  }
  return {
    assetId: null,
    assetClass: 'unknown',
    role: 'unknown',
    matchedBy: null,
  };
}

function normalizeClassification(repoPath, entry) {
  const inferredId = entry.assetId || inferAssetId(entry.assetIdPrefix, repoPath);
  return {
    assetId: inferredId,
    assetClass: entry.class || 'unknown',
    role: entry.role || 'unknown',
    matchedBy: entry.path ? 'path' : entry.pathPrefix ? 'pathPrefix' : 'pathSuffix',
  };
}

function inferAssetId(prefix, repoPath) {
  const basename = path.basename(repoPath, path.extname(repoPath));
  const slug = basename
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return prefix ? `${prefix}.${slug}` : slug;
}

export function findManifestRecords(repoPath, manifestRecords) {
  return manifestRecords.filter((record) => manifestRecordMatches(record.filePath, repoPath));
}

function manifestRecordMatches(filePathPattern, repoPath) {
  if (!filePathPattern) return false;
  if (filePathPattern === repoPath) return true;

  if (filePathPattern.includes('*.glb')) {
    const prefix = filePathPattern.slice(0, filePathPattern.indexOf('*.glb'));
    if (repoPath.startsWith(prefix) && repoPath.endsWith('.glb')) return true;
    if (filePathPattern.includes('colormap.png') && repoPath === `${prefix}colormap.png`) return true;
  }

  if (!filePathPattern.includes('*')) return false;

  const escaped = filePathPattern
    .split('*')
    .map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}$`).test(repoPath);
}

export function summarizeManifestCoverage(repoPath, manifestRecords) {
  const records = findManifestRecords(repoPath, manifestRecords);
  const matched = records.length > 0;
  const missingCurrentFields = [];
  const missingFutureFields = [];

  for (const record of records) {
    for (const field of ['filePath', 'source', 'license', 'role', 'sizeBudget', 'fallback']) {
      if (!record[field]) missingCurrentFields.push(field);
    }
    for (const field of ['sourceHash', 'outputHash', 'assetId', 'assetClass', 'status', 'proof', 'runtimeTransform']) {
      if (!record[field]) missingFutureFields.push(field);
    }
  }

  return {
    matched,
    matchCount: records.length,
    recordFilePaths: records.map((record) => record.filePath),
    missingCurrentFields: [...new Set(missingCurrentFields)].sort(),
    missingFutureFields: [...new Set(missingFutureFields)].sort(),
  };
}

export function summarizeRuntimeManifestDrift({ manifestRecords, assets, runtimeRootPath = 'src/assets/game/models' }) {
  const runtimeAssets = assets.filter((asset) => asset.rootKind === 'runtime');
  const runtimeAssetPaths = new Set(runtimeAssets.map((asset) => asset.repoPath));
  const assetsByPath = new Map(runtimeAssets.map((asset) => [asset.repoPath, asset]));
  const exactManifestPaths = new Map();
  const duplicateManifestPaths = [];
  const missingRuntimeFiles = [];
  const staleHashes = [];

  for (const record of manifestRecords) {
    const manifestPath = record.filePath;
    if (!manifestPath || manifestPath.includes('*') || !manifestPath.endsWith('.glb')) continue;
    if (!manifestPath.startsWith(`${runtimeRootPath}/`)) continue;

    if (exactManifestPaths.has(manifestPath)) {
      duplicateManifestPaths.push(manifestPath);
    }
    exactManifestPaths.set(manifestPath, record);

    if (!runtimeAssetPaths.has(manifestPath)) {
      missingRuntimeFiles.push(manifestPath);
      continue;
    }

    const asset = assetsByPath.get(manifestPath);
    if (record.outputHash && asset?.sha256 && record.outputHash !== asset.sha256) {
      staleHashes.push({
        filePath: manifestPath,
        manifestOutputHash: record.outputHash,
        actualHash: asset.sha256,
      });
    }
  }

  const runtimeFilesMissingExactManifest = runtimeAssets
    .filter((asset) => !asset.manifestCoverage?.matched)
    .map((asset) => asset.repoPath);

  return {
    runtimeFilesMissingManifest: runtimeFilesMissingExactManifest.sort(),
    manifestRecordsMissingRuntimeFile: missingRuntimeFiles.sort(),
    duplicateManifestPaths: [...new Set(duplicateManifestPaths)].sort(),
    staleHashes,
    errors: [
      ...runtimeFilesMissingExactManifest.map((filePath) => `runtime file missing manifest record: ${filePath}`),
      ...missingRuntimeFiles.map((filePath) => `manifest record missing runtime file: ${filePath}`),
      ...duplicateManifestPaths.map((filePath) => `duplicate manifest record: ${filePath}`),
      ...staleHashes.map((entry) => `stale output hash for ${entry.filePath}`),
    ].sort(),
  };
}

export function getRuntimeBudget(budgets, assetClass) {
  return budgets?.runtime?.[assetClass] || null;
}

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}
