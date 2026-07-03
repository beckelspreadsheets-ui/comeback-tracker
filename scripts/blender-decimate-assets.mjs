#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup,
  meshopt,
  prune,
  textureCompress,
} from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { auditGltfFile } from './lib/gltf-metrics.mjs';
import {
  classifyAsset,
  fromRepoPath,
  getRuntimeBudget,
  hashFile,
  hashString,
  loadPipelineConfig,
  normalizeRepoPath,
  readJsonFile,
  toRepoPath,
  writeJsonFile,
} from './lib/asset-pipeline-config.mjs';
import { writeCandidateIndex } from './lib/candidate-index.mjs';
import { createRunMetadata } from './lib/run-metadata.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.cwd();
const startedAt = new Date().toISOString();
const parsed = parseArgs({
  options: {
    asset: { type: 'string', multiple: true },
    blender: { type: 'string' },
    config: { type: 'string', default: 'asset-pipeline/config/blender-decimation.json' },
    outputRoot: { type: 'string' },
  },
  allowPositionals: true,
});

const blenderBin = parsed.values.blender || process.env.BLENDER_BIN || '/opt/homebrew/bin/blender';
const configPath = normalizeRepoPath(parsed.values.config);
const requestedAssets = [...(parsed.values.asset || []), ...(parsed.positionals || [])]
  .map((value) => normalizeRepoPath(value))
  .filter(Boolean);

try {
  const [pipelineConfig, decimationConfig] = await Promise.all([
    loadPipelineConfig(repoRoot),
    readJsonFile(fromRepoPath(repoRoot, configPath)),
  ]);
  const outputRoot = normalizeRepoPath(parsed.values.outputRoot || decimationConfig.outputRoot || 'asset-pipeline/working/blender-decimate');
  const runId = `${startedAt.replace(/[:.]/g, '-') }__blender-decimation`;
  const runDir = path.join(repoRoot, outputRoot, runId);
  const rawDir = path.join(runDir, '_blender-raw');
  const selectedAssets = selectAssets(decimationConfig.assets || [], requestedAssets);
  if (!selectedAssets.length) throw new Error('No Blender decimation assets selected');

  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'meshopt.decoder': MeshoptDecoder,
      'meshopt.encoder': MeshoptEncoder,
    });

  const results = [];
  for (const asset of selectedAssets) {
    results.push(await decimateAsset({
      asset,
      config: pipelineConfig,
      decimationConfig,
      io,
      outputRoot,
      rawDir,
      runDir,
    }));
  }

  const completedAt = new Date().toISOString();
  const run = await createRunMetadata({
    repoRoot,
    runId,
    kind: 'blender-decimation',
    scope: 'candidates',
    strict: false,
    startedAt,
    completedAt,
    args: process.argv.slice(2),
  });
  run.toolVersions = {
    ...run.toolVersions,
    blender: results[0]?.blender?.blenderVersion || 'unknown',
  };
  const report = {
    schemaVersion: 1,
    candidatePipeline: 'blender-decimate',
    run,
    configPath,
    outputRoot,
    blenderBin,
    sourceAssets: selectedAssets.map((asset) => asset.sourceRepoPath),
    targetRuntimeAssets: selectedAssets.map((asset) => asset.targetRuntimeRepoPath),
    totals: calculateTotals(results),
    results,
  };

  await writeJsonFile(path.join(runDir, 'decimation-report.json'), report);
  await fs.writeFile(path.join(runDir, 'decimation-report.md'), formatReport(report));
  await writeJsonFile(path.join(repoRoot, outputRoot, 'latest-decimation.json'), report);
  await writeCandidateIndex(repoRoot);

  console.log(`Blender decimation report written to ${path.relative(repoRoot, runDir)}`);
  console.log(formatConsoleSummary(report));

  const invalid = results.filter((result) =>
    !result.candidate.parseOk
    || !result.candidate.validatorPassed
    || result.candidate.budget.status === 'fail'
  );
  if (invalid.length) {
    console.error(`Blender candidates failed gates: ${invalid.map((result) => result.target.runtimeRepoPath).join(', ')}`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.stack || error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  process.exitCode = 1;
}

function selectAssets(assets, requested) {
  if (!requested.length) return assets;
  const wanted = new Set(requested);
  return assets.filter((asset) =>
    wanted.has(asset.assetId)
    || wanted.has(normalizeRepoPath(asset.sourceRepoPath))
    || wanted.has(normalizeRepoPath(asset.targetRuntimeRepoPath))
  );
}

async function decimateAsset({ asset, config, decimationConfig, io, outputRoot, rawDir, runDir }) {
  const profileName = asset.profile;
  const profile = decimationConfig.profiles?.[profileName];
  if (!profile) throw new Error(`Blender decimation profile not found: ${profileName}`);

  const sourceRepoPath = normalizeRepoPath(asset.sourceRepoPath);
  const targetRuntimeRepoPath = normalizeRepoPath(asset.targetRuntimeRepoPath);
  const sourcePath = fromRepoPath(repoRoot, sourceRepoPath);
  const sourceHash = await hashFile(sourcePath);
  if (asset.sourceHash && sourceHash !== asset.sourceHash) {
    throw new Error(`Source hash mismatch for ${sourceRepoPath}: expected ${asset.sourceHash}, got ${sourceHash}`);
  }

  const classification = classifyAsset(targetRuntimeRepoPath, config.profiles);
  const configHash = hashString(JSON.stringify({
    asset,
    profile,
    targetRuntimeRepoPath,
    budgets: config.budgets?.runtime?.[classification.assetClass] || null,
    script: 'scripts/blender-decimate-assets.mjs',
    worker: 'scripts/blender/targeted-decimate.py',
  }));
  const slug = path.basename(targetRuntimeRepoPath, path.extname(targetRuntimeRepoPath));
  const baseName = `${slug}__${profileName}__${shortHash(sourceHash)}__${shortHash(configHash)}`;
  const rawCandidatePath = path.join(rawDir, `${baseName}__blender.glb`);
  const candidatePath = path.join(runDir, slug, `${baseName}__meshopt.glb`);
  const candidateRepoPath = toRepoPath(repoRoot, candidatePath);
  await fs.mkdir(path.dirname(rawCandidatePath), { recursive: true });
  await fs.mkdir(path.dirname(candidatePath), { recursive: true });

  const sourceAudit = await auditGltfFile({
    repoRoot,
    file: {
      absolutePath: sourcePath,
      missingRoot: false,
      repoPath: sourceRepoPath,
      rootId: 'runtime-source-cache',
      rootKind: 'immutable-source',
      rootPath: path.dirname(sourceRepoPath),
    },
    config,
    includeValidator: true,
  });

  const blender = await runBlender({
    inputPath: sourcePath,
    outputPath: rawCandidatePath,
    profile,
  });
  const document = await io.read(rawCandidatePath);
  await document.transform(
    dedup(),
    textureCompress({
      encoder: sharp,
      quality: profile.textureQuality ?? 80,
      resize: [profile.maxTextureSize || 512, profile.maxTextureSize || 512],
    }),
    prune({ keepExtras: true }),
    meshopt({
      encoder: MeshoptEncoder,
      level: profile.meshoptLevel || 'medium',
    })
  );
  await io.write(candidatePath, document);

  const candidateAudit = await auditGltfFile({
    repoRoot,
    file: {
      absolutePath: candidatePath,
      missingRoot: false,
      repoPath: candidateRepoPath,
      rootId: 'blender-decimate-candidates',
      rootKind: 'candidate',
      rootPath: outputRoot,
      targetRuntimeRepoPath,
      candidatePipeline: 'blender-decimate',
      profileName,
    },
    config,
    includeValidator: true,
  });
  const budget = evaluateRuntimeBudget({
    assetClass: classification.assetClass,
    budgets: config.budgets,
    encodedBytes: candidateAudit.encodedBytes,
    metrics: candidateAudit.metrics,
  });

  return {
    candidatePipeline: 'blender-decimate',
    assetId: asset.assetId,
    label: asset.label,
    source: {
      repoPath: sourceRepoPath,
      sourceHash,
      classification,
      metrics: summarizeAudit(sourceAudit),
      parseOk: Boolean(sourceAudit.parse?.ok),
      validatorPassed: Boolean(sourceAudit.validator?.passed),
    },
    target: {
      runtimeRepoPath: targetRuntimeRepoPath,
      classification,
    },
    profile: {
      name: profileName,
      configHash,
      settings: profile,
    },
    blender,
    candidate: {
      repoPath: candidateRepoPath,
      outputHash: candidateAudit.sha256,
      metrics: summarizeAudit(candidateAudit),
      parseOk: Boolean(candidateAudit.parse?.ok),
      validatorPassed: Boolean(candidateAudit.validator?.passed),
      budget,
      errors: candidateAudit.errors || [],
      warnings: candidateAudit.warnings || [],
    },
    deltas: summarizeDeltas(sourceAudit, candidateAudit),
  };
}

async function runBlender({ inputPath, outputPath, profile }) {
  const args = [
    '-b',
    '--python',
    path.join(__dirname, 'blender', 'targeted-decimate.py'),
    '--',
    '--input',
    inputPath,
    '--output',
    outputPath,
    '--target-triangles',
    String(profile.targetTriangles),
    '--remove-doubles-threshold',
    String(profile.removeDoublesThreshold ?? 0.0001),
    '--dissolve-angle-degrees',
    String(profile.dissolveAngleDegrees ?? 0),
  ];
  const result = await spawnBuffered(blenderBin, args);
  if (result.code !== 0) {
    throw withDetail(new Error(`Blender decimation failed for ${path.basename(inputPath)}`), {
      code: result.code,
      stdout: result.stdout.slice(-4000),
      stderr: result.stderr.slice(-4000),
    });
  }
  const jsonLine = result.stdout
    .trim()
    .split('\n')
    .reverse()
    .find((line) => line.trim().startsWith('{') && line.trim().endsWith('}'));
  const stats = jsonLine ? JSON.parse(jsonLine) : {};
  return {
    ...stats,
    stdoutTail: result.stdout.slice(-2000),
    stderrTail: result.stderr.slice(-2000),
  };
}

async function spawnBuffered(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

function summarizeAudit(asset) {
  return {
    encodedBytes: asset.encodedBytes || 0,
    renderTriangles: asset.metrics?.renderTriangles || 0,
    uploadVertices: asset.metrics?.uploadVertices || 0,
    materials: asset.metrics?.materials || 0,
    textures: asset.metrics?.textureCount || 0,
    maxTextureDimension: asset.metrics?.maxTextureDimension || 0,
    requiredExtensions: asset.metrics?.requiredExtensions || [],
    usedExtensions: asset.metrics?.usedExtensions || [],
  };
}

function summarizeDeltas(before, after) {
  const b = summarizeAudit(before);
  const a = summarizeAudit(after);
  return {
    encodedBytes: deltaPair(b.encodedBytes, a.encodedBytes),
    renderTriangles: deltaPair(b.renderTriangles, a.renderTriangles),
    uploadVertices: deltaPair(b.uploadVertices, a.uploadVertices),
    materials: deltaPair(b.materials, a.materials),
    textures: deltaPair(b.textures, a.textures),
  };
}

function deltaPair(before, after) {
  const delta = after - before;
  const ratio = before ? after / before : null;
  return {
    before,
    after,
    delta,
    ratio: ratio === null ? null : Number(ratio.toFixed(4)),
    reductionPercent: before ? Number(((1 - ratio) * 100).toFixed(2)) : null,
  };
}

function evaluateRuntimeBudget({ assetClass, budgets, encodedBytes, metrics }) {
  const runtimeBudget = getRuntimeBudget(budgets, assetClass);
  if (!runtimeBudget) {
    return {
      assetClass,
      status: 'warn',
      errors: [],
      warnings: [`no runtime budget for asset class: ${assetClass}`],
    };
  }
  const errors = [];
  const warnings = [];
  checkHardTarget('encodedBytes', encodedBytes, runtimeBudget.encodedBytes, errors, warnings);
  checkHardTarget('triangles', metrics.renderTriangles || 0, runtimeBudget.triangles, errors, warnings);
  checkHardTarget('materials', metrics.materials || 0, runtimeBudget.materials, errors, warnings);
  if ((metrics.maxTextureDimension || 0) > runtimeBudget.maxTextureDimension) {
    errors.push(`maxTextureDimension ${metrics.maxTextureDimension} exceeds hard ${runtimeBudget.maxTextureDimension}`);
  }
  return {
    assetClass,
    status: errors.length ? 'fail' : warnings.length ? 'warn' : 'pass',
    budget: runtimeBudget,
    errors,
    warnings,
  };
}

function checkHardTarget(name, value, range, errors, warnings) {
  if (value > range.hard) {
    errors.push(`${name} ${value} exceeds hard ${range.hard}`);
  } else if (value > range.target) {
    warnings.push(`${name} ${value} exceeds target ${range.target}`);
  }
}

function calculateTotals(results) {
  return {
    files: results.length,
    parsePass: results.filter((result) => result.candidate.parseOk).length,
    validatorPass: results.filter((result) => result.candidate.validatorPassed).length,
    budgetPass: results.filter((result) => result.candidate.budget.status === 'pass').length,
    budgetWarn: results.filter((result) => result.candidate.budget.status === 'warn').length,
    budgetFail: results.filter((result) => result.candidate.budget.status === 'fail').length,
    beforeBytes: results.reduce((sum, result) => sum + result.source.metrics.encodedBytes, 0),
    afterBytes: results.reduce((sum, result) => sum + result.candidate.metrics.encodedBytes, 0),
    beforeTriangles: results.reduce((sum, result) => sum + result.source.metrics.renderTriangles, 0),
    afterTriangles: results.reduce((sum, result) => sum + result.candidate.metrics.renderTriangles, 0),
  };
}

function formatConsoleSummary(report) {
  const totals = report.totals;
  return [
    `files=${totals.files} parsePass=${totals.parsePass} validatorPass=${totals.validatorPass}`,
    `budget pass=${totals.budgetPass} warn=${totals.budgetWarn} fail=${totals.budgetFail}`,
    `bytes ${totals.beforeBytes} -> ${totals.afterBytes}; triangles ${totals.beforeTriangles} -> ${totals.afterTriangles}`,
  ].join('\n');
}

function formatReport(report) {
  return `# Blender Decimation ${report.run.runId}

## Run

- Blender: \`${report.blenderBin}\`
- Output root: \`${report.outputRoot}\`
- Config: \`${report.configPath}\`

## Totals

| Metric | Count |
| --- | ---: |
| Files | ${report.totals.files} |
| Candidate parse pass | ${report.totals.parsePass} |
| Candidate validator pass | ${report.totals.validatorPass} |
| Budget pass | ${report.totals.budgetPass} |
| Budget warn | ${report.totals.budgetWarn} |
| Budget fail | ${report.totals.budgetFail} |
| Before bytes | ${report.totals.beforeBytes} |
| After bytes | ${report.totals.afterBytes} |
| Before triangles | ${report.totals.beforeTriangles} |
| After triangles | ${report.totals.afterTriangles} |

## Candidates

| Target runtime | Candidate | Profile | Source hash | Output hash | Bytes | Triangles | Vertices | Budget |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
${report.results.map((result) => {
  const bytes = result.deltas.encodedBytes;
  const triangles = result.deltas.renderTriangles;
  const vertices = result.deltas.uploadVertices;
  return `| \`${result.target.runtimeRepoPath}\` | \`${result.candidate.repoPath}\` | \`${result.profile.name}\` | \`${result.source.sourceHash}\` | \`${result.candidate.outputHash}\` | ${bytes.before} -> ${bytes.after} | ${triangles.before} -> ${triangles.after} | ${vertices.before} -> ${vertices.after} | ${result.candidate.budget.status} |`;
}).join('\n') || '| none | | | | | | | | |'}

## Candidate Findings

${report.results.map((result) => {
  const findings = [
    ...result.candidate.errors.map((error) => `error: ${error}`),
    ...result.candidate.warnings.map((warning) => `warning: ${warning}`),
    ...result.candidate.budget.errors.map((error) => `budget error: ${error}`),
    ...result.candidate.budget.warnings.map((warning) => `budget warning: ${warning}`),
  ];
  return `- \`${result.candidate.repoPath}\`: ${findings.length ? findings.join('; ') : 'none'}`;
}).join('\n') || '- none'}
`;
}

function shortHash(hash) {
  return String(hash || '').replace(/^sha256:/, '').slice(0, 12);
}

function withDetail(error, detail) {
  error.detail = detail;
  return error;
}
