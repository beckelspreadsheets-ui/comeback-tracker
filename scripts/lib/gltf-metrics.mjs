import fs from 'node:fs/promises';
import { Accessor, getBounds } from '@gltf-transform/core';
import { readGltfDocument, runGltfValidator } from './gltf-io.mjs';
import {
  classifyAsset,
  getRuntimeBudget,
  hashFile,
  summarizeManifestCoverage,
} from './asset-pipeline-config.mjs';

const MODE_TRIANGLES = 4;

export async function auditGltfFile({ repoRoot, file, config, includeValidator = true }) {
  if (file.missingRoot) {
    return {
      repoPath: file.repoPath,
      absolutePath: file.absolutePath,
      rootId: file.rootId,
      rootKind: file.rootKind,
      rootPath: file.rootPath,
      missingRoot: true,
      errors: [`Required root is missing: ${file.rootPath}`],
      warnings: [],
    };
  }

  const stat = await fs.stat(file.absolutePath);
  const sha256 = await hashFile(file.absolutePath);
  const classificationRepoPath = file.targetRuntimeRepoPath || file.classificationRepoPath || file.repoPath;
  const budgetRootKind = file.targetRuntimeRepoPath ? 'runtime' : file.rootKind;
  const classification = classifyAsset(classificationRepoPath, config.profiles);
  const manifestCoverage = summarizeManifestCoverage(classificationRepoPath, config.manifestRecords);
  const errors = [];
  const warnings = [];
  let parse = { ok: false };
  let metrics = emptyMetrics();
  let validator = null;

  try {
    const document = await readGltfDocument(file.absolutePath);
    metrics = collectGltfMetrics(document);
    parse = { ok: true };
  } catch (error) {
    parse = {
      ok: false,
      message: error.message,
      name: error.name,
    };
    errors.push(`glTF parse failed: ${error.message}`);
  }

  if (includeValidator) {
    validator = await runGltfValidator(repoRoot, file.absolutePath);
    if (!validator.passed) {
      errors.push(`official glTF validator failed: ${validator.errorCodes.join(', ') || 'see validator output'}`);
    }
  }

  appendStructuralFindings({ metrics, errors, warnings });
  const budget = evaluateBudgets({
    rootKind: budgetRootKind,
    encodedBytes: stat.size,
    metrics,
    classification,
    budgets: config.budgets,
  });
  errors.push(...budget.errors);
  warnings.push(...budget.warnings);

  return {
    repoPath: file.repoPath,
    absolutePath: file.absolutePath,
    rootId: file.rootId,
    rootKind: file.rootKind,
    rootPath: file.rootPath,
    targetRuntimeRepoPath: file.targetRuntimeRepoPath || null,
    candidatePipeline: file.candidatePipeline || null,
    candidateProfile: file.profileName || null,
    encodedBytes: stat.size,
    sha256,
    classification,
    manifestCoverage,
    parse,
    validator,
    metrics,
    budget,
    errors,
    warnings,
    status: errors.length ? 'fail' : warnings.length ? 'warn' : 'pass',
  };
}

export function collectGltfMetrics(document) {
  const root = document.getRoot();
  let primitives = 0;
  let renderTriangles = 0;
  let uploadVertices = 0;
  let morphTargets = 0;
  let geometryBytes = 0;
  let nonFiniteValues = 0;
  const geometryAccessors = new Set();

  for (const mesh of root.listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      primitives += 1;
      const indices = primitive.getIndices();
      const position = primitive.getAttribute('POSITION');
      const drawCount = indices?.getCount() || position?.getCount() || 0;
      if (primitive.getMode() === MODE_TRIANGLES) {
        renderTriangles += Math.floor(drawCount / 3);
      }
      uploadVertices += position?.getCount() || 0;
      if (indices) geometryAccessors.add(indices);
      for (const attribute of primitive.listAttributes()) {
        geometryAccessors.add(attribute);
      }
      for (const target of primitive.listTargets()) {
        morphTargets += 1;
        for (const attribute of target.listAttributes()) {
          geometryAccessors.add(attribute);
        }
      }
    }
  }

  for (const accessor of geometryAccessors) {
    const array = accessor.getArray();
    geometryBytes += array?.byteLength || accessor.getCount() * accessor.getElementSize() * accessor.getComponentSize();
  }

  for (const accessor of root.listAccessors()) {
    const array = accessor.getArray();
    if (!array) continue;
    for (let index = 0; index < array.length; index += 1) {
      if (!Number.isFinite(array[index])) nonFiniteValues += 1;
    }
  }

  for (const node of root.listNodes()) {
    for (const value of [
      ...node.getTranslation(),
      ...node.getRotation(),
      ...node.getScale(),
      ...node.getMatrix(),
    ]) {
      if (!Number.isFinite(value)) nonFiniteValues += 1;
    }
  }

  const textures = root.listTextures().map((texture, index) => {
    const size = texture.getSize();
    const width = size?.[0] || null;
    const height = size?.[1] || null;
    const maxDimension = Math.max(width || 0, height || 0);
    const image = texture.getImage();
    return {
      index,
      name: texture.getName() || null,
      uri: texture.getURI() || null,
      mimeType: texture.getMimeType() || null,
      width,
      height,
      maxDimension,
      encodedBytes: image?.byteLength || 0,
      estimatedDecodedRgbaMipBytes: width && height ? Math.ceil(width * height * 4 * 4 / 3) : 0,
    };
  });

  const bounds = collectBounds(root);
  const usedExtensions = root.listExtensionsUsed().map((extension) => extension.extensionName).sort();
  const requiredExtensions = root.listExtensionsRequired().map((extension) => extension.extensionName).sort();

  return {
    scenes: root.listScenes().length,
    nodes: root.listNodes().length,
    meshes: root.listMeshes().length,
    primitives,
    renderTriangles,
    uploadVertices,
    materials: root.listMaterials().length,
    textures,
    textureCount: textures.length,
    maxTextureDimension: Math.max(0, ...textures.map((texture) => texture.maxDimension || 0)),
    estimatedTextureGpuBytes: textures.reduce((sum, texture) => sum + texture.estimatedDecodedRgbaMipBytes, 0),
    animations: root.listAnimations().length,
    skins: root.listSkins().length,
    morphTargets,
    geometryBytes,
    bounds,
    requiredExtensions,
    usedExtensions,
    namedNodes: root.listNodes().map((node) => node.getName()).filter(Boolean).sort(),
    nonFiniteValues,
  };
}

function collectBounds(root) {
  const sceneBounds = [];
  for (const scene of root.listScenes()) {
    try {
      const bounds = getBounds(scene);
      if (isFiniteBounds(bounds)) {
        sceneBounds.push({
          scene: scene.getName() || null,
          min: bounds.min.map(roundMetric),
          max: bounds.max.map(roundMetric),
        });
      }
    } catch (error) {
      sceneBounds.push({
        scene: scene.getName() || null,
        error: error.message,
      });
    }
  }
  return sceneBounds;
}

function isFiniteBounds(bounds) {
  return bounds
    && Array.isArray(bounds.min)
    && Array.isArray(bounds.max)
    && bounds.min.every(Number.isFinite)
    && bounds.max.every(Number.isFinite);
}

function roundMetric(value) {
  return Math.round(value * 1000000) / 1000000;
}

function emptyMetrics() {
  return {
    scenes: 0,
    nodes: 0,
    meshes: 0,
    primitives: 0,
    renderTriangles: 0,
    uploadVertices: 0,
    materials: 0,
    textures: [],
    textureCount: 0,
    maxTextureDimension: 0,
    estimatedTextureGpuBytes: 0,
    animations: 0,
    skins: 0,
    morphTargets: 0,
    geometryBytes: 0,
    bounds: [],
    requiredExtensions: [],
    usedExtensions: [],
    namedNodes: [],
    nonFiniteValues: 0,
  };
}

function appendStructuralFindings({ metrics, errors }) {
  if (metrics.scenes < 1) errors.push('missing scene');
  if (metrics.meshes < 1) errors.push('missing mesh');
  if (metrics.nonFiniteValues > 0) errors.push(`non-finite accessor/transform values: ${metrics.nonFiniteValues}`);
}

function evaluateBudgets({ rootKind, encodedBytes, metrics, classification, budgets }) {
  const errors = [];
  const warnings = [];
  const assetClass = classification.assetClass;

  if (rootKind === 'immutable-source') {
    evaluateRange('encodedBytes', encodedBytes, budgets.source.encodedBytes, errors, warnings);
    evaluateRange('triangles', metrics.renderTriangles, budgets.source.triangles, errors, warnings);
    evaluateRange('uploadVertices', metrics.uploadVertices, budgets.source.uploadVertices, errors, warnings);
    evaluateRange('maxTextureDimension', metrics.maxTextureDimension, budgets.source.maxTextureDimension, errors, warnings);
    evaluateRange('materials', metrics.materials, budgets.source.materials, errors, warnings);
    if (metrics.animations > 0) warnings.push(`source contains animations: ${metrics.animations}`);
    return {
      scope: 'source',
      assetClass,
      errors,
      warnings,
    };
  }

  if (rootKind !== 'runtime') {
    return {
      scope: rootKind,
      assetClass,
      errors,
      warnings,
    };
  }

  const runtimeBudget = getRuntimeBudget(budgets, assetClass);
  if (!runtimeBudget) {
    warnings.push(`no runtime budget for asset class: ${assetClass}`);
    return {
      scope: 'runtime',
      assetClass,
      errors,
      warnings,
    };
  }

  evaluateHardTarget('encodedBytes', encodedBytes, runtimeBudget.encodedBytes, errors, warnings);
  evaluateHardTarget('triangles', metrics.renderTriangles, runtimeBudget.triangles, errors, warnings);
  evaluateHardTarget('materials', metrics.materials, runtimeBudget.materials, errors, warnings);
  if (metrics.maxTextureDimension > runtimeBudget.maxTextureDimension) {
    errors.push(`maxTextureDimension ${metrics.maxTextureDimension} exceeds hard ${runtimeBudget.maxTextureDimension}`);
  }

  return {
    scope: 'runtime',
    assetClass,
    budget: runtimeBudget,
    errors,
    warnings,
  };
}

function evaluateRange(name, value, range, errors, warnings) {
  if (value > range.hard) {
    errors.push(`${name} ${value} exceeds hard ${range.hard}`);
  } else if (value > range.warn) {
    warnings.push(`${name} ${value} exceeds warning ${range.warn}`);
  }
}

function evaluateHardTarget(name, value, range, errors, warnings) {
  if (value > range.hard) {
    errors.push(`${name} ${value} exceeds hard ${range.hard}`);
  } else if (value > range.target) {
    warnings.push(`${name} ${value} exceeds target ${range.target}`);
  }
}

export function applyStrictRuntimeManifestFindings(asset) {
  const errors = [];
  const coverage = asset.manifestCoverage;
  if (asset.rootKind !== 'runtime') return errors;
  if (!coverage.matched) {
    errors.push('runtime file missing manifest record');
    return errors;
  }
  for (const field of coverage.missingCurrentFields) {
    errors.push(`manifest missing required current field: ${field}`);
  }
  for (const field of ['sourceHash', 'outputHash']) {
    if (coverage.missingFutureFields.includes(field)) {
      errors.push(`manifest missing hash field: ${field}`);
    }
  }
  return errors;
}

export function summarizeAssetForCsv(asset) {
  return {
    repoPath: asset.repoPath,
    rootKind: asset.rootKind,
    targetRuntimeRepoPath: asset.targetRuntimeRepoPath || '',
    candidatePipeline: asset.candidatePipeline || '',
    candidateProfile: asset.candidateProfile || '',
    assetId: asset.classification?.assetId || '',
    assetClass: asset.classification?.assetClass || '',
    status: asset.status || '',
    encodedBytes: asset.encodedBytes || 0,
    sha256: asset.sha256 || '',
    scenes: asset.metrics?.scenes || 0,
    nodes: asset.metrics?.nodes || 0,
    meshes: asset.metrics?.meshes || 0,
    primitives: asset.metrics?.primitives || 0,
    renderTriangles: asset.metrics?.renderTriangles || 0,
    uploadVertices: asset.metrics?.uploadVertices || 0,
    materials: asset.metrics?.materials || 0,
    textures: asset.metrics?.textureCount || 0,
    maxTextureDimension: asset.metrics?.maxTextureDimension || 0,
    estimatedTextureGpuBytes: asset.metrics?.estimatedTextureGpuBytes || 0,
    animations: asset.metrics?.animations || 0,
    skins: asset.metrics?.skins || 0,
    morphTargets: asset.metrics?.morphTargets || 0,
    requiredExtensions: (asset.metrics?.requiredExtensions || []).join(' '),
    usedExtensions: (asset.metrics?.usedExtensions || []).join(' '),
    parseOk: asset.parse?.ok ? 'true' : 'false',
    validatorPassed: asset.validator?.passed ? 'true' : 'false',
    manifestMatched: asset.manifestCoverage?.matched ? 'true' : 'false',
    errors: (asset.errors || []).join(' | '),
    warnings: (asset.warnings || []).join(' | '),
  };
}

export function formatCsv(rows) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function csvCell(value) {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}
