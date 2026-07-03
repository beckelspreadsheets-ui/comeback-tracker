#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup,
  join,
  meshopt,
  prune,
  simplify,
  textureCompress,
  weld,
} from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
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
  toRepoPath,
  writeJsonFile,
} from './lib/asset-pipeline-config.mjs';
import { writeCandidateIndex } from './lib/candidate-index.mjs';
import { createRunMetadata } from './lib/run-metadata.mjs';

const DEFAULT_PHASE_2_ASSETS = [
  'src/assets/game/models/avatars/layer23-penguin.glb',
  'src/assets/game/models/avatars/mizzle.glb',
  'src/assets/game/models/tripo/ice-sled.glb',
  'src/assets/game/models/avatars/tclow-penguin.glb',
  'src/assets/game/models/toy-car-kit/item-banana.glb',
  'src/assets/game/models/toy-car-kit/item-cone.glb',
];

const PROFILE_BY_CLASS = {
  'hero-kart': 'hero-kart-balanced-v1',
  'rival-kart': 'rival-kart-balanced-v1',
  'seated-character': 'seated-character-balanced-v1',
  'simple-prop': 'simple-prop-v1',
  'complex-prop': 'complex-prop-v1',
  'track-module': 'track-module-v1',
};

const PROFILE_LADDER_BY_CLASS = {
  'hero-kart': ['hero-kart-balanced-v1'],
  'rival-kart': [
    'rival-kart-balanced-v1',
    'rival-kart-aggressive-v1',
    'rival-kart-very-aggressive-v1',
    'rival-kart-budget-cap-v1',
  ],
  'seated-character': [
    'seated-character-balanced-v1',
    'seated-character-aggressive-v1',
    'seated-character-very-aggressive-v1',
    'seated-character-budget-cap-v1',
  ],
  'simple-prop': ['simple-prop-v1'],
  'complex-prop': ['complex-prop-v1'],
  'track-module': ['track-module-v1'],
};

const repoRoot = process.cwd();
const startedAt = new Date().toISOString();
const parsed = parseArgs({
  options: {
    asset: { type: 'string', multiple: true },
    ladder: { type: 'boolean', default: false },
    outputRoot: { type: 'string', default: 'asset-pipeline/working/optimized' },
    profile: { type: 'string', multiple: true },
  },
  allowPositionals: true,
});

const runId = `${startedAt.replace(/[:.]/g, '-') }__glb-optimization`;
const outputRoot = normalizeRepoPath(parsed.values.outputRoot);
const runDir = path.join(repoRoot, outputRoot, runId);
const requestedAssets = [...(parsed.values.asset || []), ...(parsed.positionals || [])]
  .map((value) => normalizeRepoPath(value))
  .filter(Boolean);
const selectedAssets = requestedAssets.length ? requestedAssets : DEFAULT_PHASE_2_ASSETS;
const forcedProfileNames = parsed.values.profile || [];

try {
  const config = await loadPipelineConfig(repoRoot);
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'meshopt.decoder': MeshoptDecoder,
      'meshopt.encoder': MeshoptEncoder,
    });

  const results = [];
  for (const repoPath of selectedAssets) {
    const classification = classifyAsset(repoPath, config.profiles);
    const profileNames = selectProfileNames({ classification, forcedProfileNames, useLadder: parsed.values.ladder });
    for (const profileName of profileNames) {
      results.push(await optimizeAsset({
        classification,
        config,
        io,
        profileName,
        repoPath,
        runDir,
      }));
    }
  }

  const completedAt = new Date().toISOString();
  const run = await createRunMetadata({
    repoRoot,
    runId,
    kind: 'glb-optimization',
    scope: 'candidates',
    strict: false,
    startedAt,
    completedAt,
    args: process.argv.slice(2),
  });
  const report = {
    schemaVersion: 1,
    run,
    outputRoot,
    defaultsUsed: requestedAssets.length === 0,
    profileMode: forcedProfileNames.length ? 'forced' : parsed.values.ladder ? 'ladder' : 'default',
    sourceAssets: selectedAssets,
    totals: calculateTotals(results),
    results,
  };

  await writeJsonFile(path.join(runDir, 'optimization-report.json'), report);
  await fs.writeFile(path.join(runDir, 'optimization-report.md'), formatReport(report));
  await writeJsonFile(path.join(repoRoot, outputRoot, 'latest-optimization.json'), report);
  await writeCandidateIndex(repoRoot);

  console.log(`GLB optimization report written to ${path.relative(repoRoot, runDir)}`);
  console.log(formatConsoleSummary(report));

  const invalid = results.filter((result) => !result.candidate.parseOk || !result.candidate.validatorPassed);
  if (invalid.length) {
    console.error(`Candidate validation failed for ${invalid.map((result) => result.source.repoPath).join(', ')}`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}

function selectProfileNames({ classification, forcedProfileNames, useLadder }) {
  if (forcedProfileNames.length) return forcedProfileNames;
  if (useLadder) {
    return PROFILE_LADDER_BY_CLASS[classification.assetClass] || [
      PROFILE_BY_CLASS[classification.assetClass] || 'recompress-only-v1',
    ];
  }
  return [PROFILE_BY_CLASS[classification.assetClass] || 'recompress-only-v1'];
}

async function optimizeAsset({ classification, config, io, profileName, repoPath, runDir }) {
  const absolutePath = fromRepoPath(repoRoot, repoPath);
  const stat = await fs.stat(absolutePath);
  if (!stat.isFile()) throw new Error(`Asset is not a file: ${repoPath}`);

  const profile = config.profiles.profiles?.[profileName];
  if (!profile) throw new Error(`Optimization profile not found: ${profileName}`);

  const sourceHash = await hashFile(absolutePath);
  const configHash = hashString(JSON.stringify({
    profileName,
    profile,
    assetClass: classification.assetClass,
    budgets: config.budgets?.runtime?.[classification.assetClass] || null,
    scriptProfileMap: PROFILE_BY_CLASS,
  }));
  const slug = path.basename(repoPath, path.extname(repoPath));
  const candidateFileName = `${slug}__${profileName}__${shortHash(sourceHash)}__${shortHash(configHash)}.glb`;
  const candidatePath = path.join(runDir, slug, candidateFileName);
  const candidateRepoPath = toRepoPath(repoRoot, candidatePath);

  const beforeAudit = await auditGltfFile({
    repoRoot,
    file: {
      absolutePath,
      missingRoot: false,
      repoPath,
      rootId: 'promoted-runtime-models',
      rootKind: 'runtime',
      rootPath: 'src/assets/game/models',
    },
    config,
    includeValidator: true,
  });

  const document = await io.read(absolutePath);
  const transforms = [
    dedup(),
    weld({ overwrite: false }),
  ];
  if (profile.allowSimplify) {
    transforms.push(simplify({
      error: profile.simplifyError ?? 0.01,
      lockBorder: Boolean(profile.lockBorder),
      ratio: profile.simplifyRatio ?? 0.2,
      simplifier: MeshoptSimplifier,
    }));
  }
  if (profile.allowJoin) {
    transforms.push(join({
      keepNamed: Boolean(profile.keepNamed),
    }));
  }
  if (profile.maxTextureSize) {
    transforms.push(textureCompress({
      encoder: sharp,
      quality: profile.colorTextureQuality ?? 82,
      resize: [profile.maxTextureSize, profile.maxTextureSize],
    }));
  }
  transforms.push(
    prune({ keepExtras: true }),
    meshopt({
      encoder: MeshoptEncoder,
      level: profile.meshoptLevel || 'medium',
    })
  );
  await document.transform(...transforms);
  await fs.mkdir(path.dirname(candidatePath), { recursive: true });
  await io.write(candidatePath, document);

  const candidateAudit = await auditGltfFile({
    repoRoot,
    file: {
      absolutePath: candidatePath,
      missingRoot: false,
      repoPath: candidateRepoPath,
      rootId: 'optimized-candidates',
      rootKind: 'candidate',
      rootPath: outputRoot,
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
    source: {
      repoPath,
      sourceHash,
      classification,
      metrics: summarizeAudit(beforeAudit),
      parseOk: Boolean(beforeAudit.parse?.ok),
      validatorPassed: Boolean(beforeAudit.validator?.passed),
    },
    profile: {
      name: profileName,
      configHash,
      settings: profile,
    },
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
    deltas: summarizeDeltas(beforeAudit, candidateAudit),
  };
}

function shortHash(hash) {
  return String(hash || '').replace(/^sha256:/, '').slice(0, 12);
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
  return `# GLB Optimization ${report.run.runId}

## Run

- Started: \`${report.run.startedAt}\`
- Completed: \`${report.run.completedAt}\`
- Node: \`${report.run.node}\`
- npm: \`${report.run.npm || 'unknown'}\`
- Git commit: \`${report.run.gitCommit || 'unknown'}\`
- Output root: \`${report.outputRoot}\`

## Tool Versions

${Object.entries(report.run.packageVersions || {}).map(([name, value]) => `- \`${name}\`: ${typeof value === 'string' ? value : value?.error || 'unknown'}`).join('\n')}

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

| Source | Candidate | Profile | Source hash | Config hash | Output hash | Bytes | Triangles | Vertices | Materials | Textures | Budget |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
${report.results.map((result) => {
  const bytes = result.deltas.encodedBytes;
  const triangles = result.deltas.renderTriangles;
  const vertices = result.deltas.uploadVertices;
  const materials = result.deltas.materials;
  const textures = result.deltas.textures;
  return `| \`${result.source.repoPath}\` | \`${result.candidate.repoPath}\` | \`${result.profile.name}\` | \`${result.source.sourceHash}\` | \`${result.profile.configHash}\` | \`${result.candidate.outputHash}\` | ${bytes.before} -> ${bytes.after} | ${triangles.before} -> ${triangles.after} | ${vertices.before} -> ${vertices.after} | ${materials.before} -> ${materials.after} | ${textures.before} -> ${textures.after} | ${result.candidate.budget.status} |`;
}).join('\n') || '| none | | | | | | | | | | | |'}

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
