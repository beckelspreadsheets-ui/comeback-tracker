#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { collectAssetFiles } from './lib/asset-walk.mjs';
import {
  applyStrictRuntimeManifestFindings,
  auditGltfFile,
  formatCsv,
  summarizeAssetForCsv,
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
    scope: { type: 'string', default: 'all' },
    strict: { type: 'boolean', default: false },
    asset: { type: 'string', multiple: true },
  },
  allowPositionals: true,
});

const scope = parsed.values.scope;
const strict = parsed.values.strict;
const assetFilters = new Set(parsed.values.asset || []);
validateScope(scope);

const runId = `${startedAt.replace(/[:.]/g, '-') }__assets-audit__${scope}${strict ? '__strict' : ''}`;
const runDir = path.join(repoRoot, 'asset-pipeline', 'audit', runId);

try {
  const config = await loadPipelineConfig(repoRoot);
  const files = await collectAssetFiles(repoRoot, config.sourceRoots, scope);
  const selectedFiles = assetFilters.size
    ? files.filter((file) => assetFilters.has(file.repoPath) || assetFilters.has(file.absolutePath))
    : files;
  const assets = [];

  for (const file of selectedFiles) {
    const asset = await auditGltfFile({ repoRoot, file, config, includeValidator: true });
    if (strict && asset.rootKind === 'runtime') {
      const strictErrors = applyStrictRuntimeManifestFindings(asset);
      asset.errors.push(...strictErrors);
      if (asset.classification?.assetClass === 'unknown') {
        asset.errors.push('runtime asset class is unknown');
      }
      asset.status = asset.errors.length ? 'fail' : asset.warnings.length ? 'warn' : 'pass';
    }
    assets.push(asset);
  }

  const completedAt = new Date().toISOString();
  const run = await createRunMetadata({
    repoRoot,
    runId,
    kind: 'asset-audit',
    scope,
    strict,
    startedAt,
    completedAt,
    args: process.argv.slice(2),
  });

  const manifestDrift = scope === 'runtime' || scope === 'all'
    ? summarizeRuntimeManifestDrift({ manifestRecords: config.manifestRecords, assets })
    : null;
  const report = {
    schemaVersion: 1,
    run,
    totals: calculateTotals(assets),
    manifestDrift,
    assets,
  };

  await fs.mkdir(runDir, { recursive: true });
  await writeJsonFile(path.join(runDir, 'assets.json'), assets);
  await fs.writeFile(path.join(runDir, 'assets.csv'), formatCsv(assets.map(summarizeAssetForCsv)));
  await fs.writeFile(path.join(runDir, 'summary.md'), formatSummary(report));
  await writeJsonFile(path.join(runDir, 'run.json'), run);
  await writeJsonFile(path.join(repoRoot, 'asset-pipeline', 'manifests', 'latest-audit.json'), report);

  console.log(`Asset audit written to ${path.relative(repoRoot, runDir)}`);
  console.log(formatConsoleSummary(report));

  if (strict && (assets.some((asset) => asset.errors?.length) || manifestDrift?.errors?.length)) {
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

function calculateTotals(assets) {
  const totals = {
    files: assets.length,
    source: 0,
    runtime: 0,
    candidates: 0,
    pass: 0,
    warn: 0,
    fail: 0,
    encodedBytes: 0,
    renderTriangles: 0,
    uploadVertices: 0,
  };
  for (const asset of assets) {
    if (asset.rootKind === 'immutable-source') totals.source += 1;
    if (asset.rootKind === 'runtime') totals.runtime += 1;
    if (asset.rootKind === 'candidate') totals.candidates += 1;
    totals[asset.status] = (totals[asset.status] || 0) + 1;
    totals.encodedBytes += asset.encodedBytes || 0;
    totals.renderTriangles += asset.metrics?.renderTriangles || 0;
    totals.uploadVertices += asset.metrics?.uploadVertices || 0;
  }
  return totals;
}

function formatConsoleSummary(report) {
  const totals = report.totals;
  return [
    `files=${totals.files} source=${totals.source} runtime=${totals.runtime} candidates=${totals.candidates}`,
    `pass=${totals.pass} warn=${totals.warn} fail=${totals.fail}`,
  ].join('\n');
}

function formatSummary(report) {
  const highestRuntime = report.assets
    .filter((asset) => asset.rootKind === 'runtime')
    .sort((a, b) => (b.metrics?.renderTriangles || 0) - (a.metrics?.renderTriangles || 0))
    .slice(0, 12);
  const failed = report.assets.filter((asset) => asset.errors?.length);
  const missingProvenance = report.assets
    .filter((asset) => asset.rootKind === 'runtime' && (!asset.manifestCoverage?.matched || asset.manifestCoverage?.missingCurrentFields?.length || asset.manifestCoverage?.missingFutureFields?.length));

  return `# Asset Audit ${report.run.runId}

## Run

- Scope: \`${report.run.scope}\`
- Strict: \`${report.run.strict}\`
- Started: \`${report.run.startedAt}\`
- Completed: \`${report.run.completedAt}\`
- Node: \`${report.run.node}\`
- npm: \`${report.run.npm || 'unknown'}\`
- Git commit: \`${report.run.gitCommit || 'unknown'}\`

## Totals

| Metric | Count |
| --- | ---: |
| Files | ${report.totals.files} |
| Source | ${report.totals.source} |
| Runtime | ${report.totals.runtime} |
| Candidates | ${report.totals.candidates} |
| Pass | ${report.totals.pass} |
| Warn | ${report.totals.warn} |
| Fail | ${report.totals.fail} |
| Encoded bytes | ${report.totals.encodedBytes} |
| Render triangles | ${report.totals.renderTriangles} |
| Upload vertices | ${report.totals.uploadVertices} |

## Highest Runtime Geometry

| Runtime asset | Class | Bytes | Triangles | Upload vertices | Status |
| --- | --- | ---: | ---: | ---: | --- |
${highestRuntime.map((asset) => `| \`${asset.repoPath}\` | ${asset.classification?.assetClass || 'unknown'} | ${asset.encodedBytes || 0} | ${asset.metrics?.renderTriangles || 0} | ${asset.metrics?.uploadVertices || 0} | ${asset.status || 'unknown'} |`).join('\n') || '| none |  | 0 | 0 | 0 |  |'}

## Failures

${failed.map((asset) => `- \`${asset.repoPath}\`: ${asset.errors.join('; ')}`).join('\n') || '- none'}

## Runtime Manifest And Provenance Gaps

${missingProvenance.map((asset) => `- \`${asset.repoPath}\`: matched=${asset.manifestCoverage?.matched}; missing current=${(asset.manifestCoverage?.missingCurrentFields || []).join(', ') || 'none'}; missing future=${(asset.manifestCoverage?.missingFutureFields || []).join(', ') || 'none'}`).join('\n') || '- none'}

## Runtime Manifest Drift

${(report.manifestDrift?.errors || []).map((error) => `- ${error}`).join('\n') || '- none'}
`;
}
