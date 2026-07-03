#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { collectAssetFiles } from './lib/asset-walk.mjs';
import {
  applyStrictRuntimeManifestFindings,
  auditGltfFile,
} from './lib/gltf-metrics.mjs';
import {
  loadPipelineConfig,
  summarizeRuntimeManifestDrift,
  writeJsonFile,
} from './lib/asset-pipeline-config.mjs';
import { createRunMetadata } from './lib/run-metadata.mjs';

const repoRoot = process.cwd();
const startedAt = new Date().toISOString();
const parsed = parseArgs({
  options: {
    scope: { type: 'string', default: 'runtime' },
    strict: { type: 'boolean', default: false },
    asset: { type: 'string', multiple: true },
  },
  allowPositionals: true,
});

const scope = parsed.values.scope;
const strict = parsed.values.strict;
const assetFilters = new Set(parsed.values.asset || []);
validateScope(scope);

const runId = `${startedAt.replace(/[:.]/g, '-') }__asset-validation__${scope}${strict ? '__strict' : ''}`;
const runDir = path.join(repoRoot, 'asset-pipeline', 'audit', runId);

try {
  const config = await loadPipelineConfig(repoRoot);
  const files = await collectAssetFiles(repoRoot, config.sourceRoots, scope);
  const selectedFiles = assetFilters.size
    ? files.filter((file) => assetFilters.has(file.repoPath) || assetFilters.has(file.absolutePath))
    : files;
  const validations = [];

  for (const file of selectedFiles) {
    const asset = await auditGltfFile({ repoRoot, file, config, includeValidator: true });
    const errors = [...asset.errors];
    const warnings = [...asset.warnings];
    if (strict && asset.rootKind === 'runtime') {
      errors.push(...applyStrictRuntimeManifestFindings(asset));
      if (asset.classification?.assetClass === 'unknown') {
        errors.push('runtime asset class is unknown');
      }
    }
    validations.push({
      repoPath: asset.repoPath,
      rootKind: asset.rootKind,
      targetRuntimeRepoPath: asset.targetRuntimeRepoPath,
      candidatePipeline: asset.candidatePipeline,
      candidateProfile: asset.candidateProfile,
      classification: asset.classification,
      parse: asset.parse,
      validator: asset.validator,
      metrics: asset.metrics,
      manifestCoverage: asset.manifestCoverage,
      budget: asset.budget,
      errors,
      warnings,
      status: errors.length ? 'fail' : warnings.length ? 'warn' : 'pass',
    });
  }

  const completedAt = new Date().toISOString();
  const run = await createRunMetadata({
    repoRoot,
    runId,
    kind: 'asset-validation',
    scope,
    strict,
    startedAt,
    completedAt,
    args: process.argv.slice(2),
  });
  const assetsForDrift = validations.map((validation) => ({
    repoPath: validation.repoPath,
    rootKind: validation.rootKind,
    sha256: null,
    manifestCoverage: validation.manifestCoverage,
  }));
  const manifestDrift = scope === 'runtime' || scope === 'all'
    ? summarizeRuntimeManifestDrift({ manifestRecords: config.manifestRecords, assets: assetsForDrift })
    : null;
  const report = {
    schemaVersion: 1,
    run,
    totals: calculateTotals(validations),
    manifestDrift,
    validations,
  };

  await fs.mkdir(runDir, { recursive: true });
  await writeJsonFile(path.join(runDir, 'validation.json'), report);
  await fs.writeFile(path.join(runDir, 'validation.md'), formatValidationSummary(report));
  await writeJsonFile(path.join(repoRoot, 'asset-pipeline', 'manifests', 'latest-validation.json'), report);

  console.log(`Asset validation written to ${path.relative(repoRoot, runDir)}`);
  console.log(`files=${report.totals.files} pass=${report.totals.pass} warn=${report.totals.warn} fail=${report.totals.fail}`);

  if (strict && (validations.some((validation) => validation.errors.length) || manifestDrift?.errors?.length)) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}

function validateScope(value) {
  if (!['all', 'source', 'runtime', 'candidates'].includes(value)) {
    throw new Error(`Unsupported scope "${value}". Use all, source, runtime, or candidates.`);
  }
}

function calculateTotals(validations) {
  const totals = {
    files: validations.length,
    pass: 0,
    warn: 0,
    fail: 0,
    validatorPass: 0,
    validatorFail: 0,
  };
  for (const validation of validations) {
    totals[validation.status] += 1;
    if (validation.validator?.passed) totals.validatorPass += 1;
    else totals.validatorFail += 1;
  }
  return totals;
}

function formatValidationSummary(report) {
  return `# Asset Validation ${report.run.runId}

## Run

- Scope: \`${report.run.scope}\`
- Strict: \`${report.run.strict}\`
- Started: \`${report.run.startedAt}\`
- Completed: \`${report.run.completedAt}\`
- Node: \`${report.run.node}\`
- npm: \`${report.run.npm || 'unknown'}\`

## Totals

| Metric | Count |
| --- | ---: |
| Files | ${report.totals.files} |
| Pass | ${report.totals.pass} |
| Warn | ${report.totals.warn} |
| Fail | ${report.totals.fail} |
| Validator pass | ${report.totals.validatorPass} |
| Validator fail | ${report.totals.validatorFail} |

## Results

| Asset | Class | Validator | Status | Errors | Warnings |
| --- | --- | --- | --- | --- | --- |
${report.validations.map((validation) => `| \`${validation.repoPath}\` | ${validation.classification?.assetClass || 'unknown'} | ${validation.validator?.passed ? 'pass' : 'fail'} | ${validation.status} | ${formatTableCell(validation.errors.join('; ') || 'none')} | ${formatTableCell(validation.warnings.join('; ') || 'none')} |`).join('\n') || '| none |  |  |  |  |  |'}

Official validator stdout/stderr is retained in \`validation.json\` for each asset.

## Runtime Manifest Drift

${(report.manifestDrift?.errors || []).map((error) => `- ${error}`).join('\n') || '- none'}
`;
}

function formatTableCell(value) {
  return value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}
