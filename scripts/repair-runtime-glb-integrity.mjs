#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import {
  findManifestRecords,
  fromRepoPath,
  hashFile,
  loadPipelineConfig,
  normalizeRepoPath,
  readJsonIfExists,
  writeJsonFile,
} from './lib/asset-pipeline-config.mjs';
import { createRunMetadata } from './lib/run-metadata.mjs';

const repoRoot = process.cwd();
const startedAt = new Date().toISOString();
const parsed = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    'runtime-root': { type: 'string', default: 'src/assets/game/models' },
    config: { type: 'string', default: 'asset-pipeline/config/runtime-repair.json' },
  },
});

if (parsed.values.apply && parsed.values['dry-run']) {
  throw new Error('Use either --apply or --dry-run, not both');
}

const apply = Boolean(parsed.values.apply);
const runtimeRoot = normalizeRepoPath(parsed.values['runtime-root']);
const configPath = normalizeRepoPath(parsed.values.config);
const runId = `${startedAt.replace(/[:.]/g, '-') }__runtime-glb-repair${apply ? '__apply' : '__dry-run'}`;
const runDir = path.join(repoRoot, 'asset-pipeline', 'audit', runId);

try {
  const [pipelineConfig, repairConfig, trackedRuntimeGlbs] = await Promise.all([
    loadPipelineConfig(repoRoot),
    readJsonIfExists(fromRepoPath(repoRoot, configPath), { cachedRuntimeCopies: [] }),
    listTrackedRuntimeGlbs(runtimeRoot),
  ]);
  const cacheByRuntime = new Map(
    (repairConfig.cachedRuntimeCopies || []).map((entry) => [normalizeRepoPath(entry.runtimeRepoPath), {
      ...entry,
      runtimeRepoPath: normalizeRepoPath(entry.runtimeRepoPath),
      cacheRepoPath: normalizeRepoPath(entry.cacheRepoPath),
    }])
  );
  const results = [];

  for (const repoPath of trackedRuntimeGlbs) {
    results.push(await inspectRuntimeGlb({
      cacheByRuntime,
      pipelineConfig,
      repoPath,
    }));
  }

  const blockers = results.flatMap((result) => result.errors.map((error) => `${result.repoPath}: ${error}`));
  if (apply && blockers.length) {
    await writeReports({ pipelineConfig, repairConfig, results, blockers });
    throw withDetail(new Error('Runtime GLB repair blocked before applying changes'), { blockers });
  }

  if (apply) {
    for (const result of results) {
      if (result.status !== 'missing') continue;
      await fs.mkdir(path.dirname(fromRepoPath(repoRoot, result.repoPath)), { recursive: true });
      if (result.restoreSource.kind === 'cache') {
        await fs.copyFile(fromRepoPath(repoRoot, result.restoreSource.repoPath), fromRepoPath(repoRoot, result.repoPath));
      } else if (result.restoreSource.kind === 'git') {
        await fs.writeFile(fromRepoPath(repoRoot, result.repoPath), await gitShowBuffer(result.repoPath));
      } else {
        result.errors.push('no restore source available');
      }
    }
  }

  if (apply) {
    for (const result of results) {
      if (result.status !== 'missing') continue;
      const actualHash = await hashFile(fromRepoPath(repoRoot, result.repoPath));
      result.restoredHash = actualHash;
      result.restored = actualHash === result.restoreSource.sha256;
      if (!result.restored) {
        result.errors.push(`restored hash mismatch: expected ${result.restoreSource.sha256}, got ${actualHash}`);
      }
    }
  }

  const finalBlockers = results.flatMap((result) => result.errors.map((error) => `${result.repoPath}: ${error}`));
  await writeReports({ pipelineConfig, repairConfig, results, blockers: finalBlockers });

  console.log(`Runtime GLB repair report written to ${path.relative(repoRoot, runDir)}`);
  console.log(`apply=${apply ? 'yes' : 'no'} tracked=${results.length} missing=${results.filter((r) => r.status === 'missing').length} restored=${results.filter((r) => r.restored).length} blockers=${finalBlockers.length}`);
  if (finalBlockers.length) process.exitCode = 1;
} catch (error) {
  console.error(error.stack || error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  process.exitCode = 1;
}

async function inspectRuntimeGlb({ cacheByRuntime, pipelineConfig, repoPath }) {
  const absolutePath = fromRepoPath(repoRoot, repoPath);
  const gitBytes = await gitShowBuffer(repoPath).catch(() => null);
  const gitHash = gitBytes ? sha256Buffer(gitBytes) : null;
  const manifestHashes = acceptedManifestHashes(repoPath, pipelineConfig.manifestRecords);
  const acceptedHashes = new Set([gitHash, ...manifestHashes].filter(Boolean));
  const cache = cacheByRuntime.get(repoPath);
  const restoreSource = await resolveRestoreSource({ cache, gitHash, repoPath });
  const errors = [];

  if (!gitHash) errors.push('tracked Git blob could not be read');

  const exists = await fileExists(absolutePath);
  if (exists) {
    const actualHash = await hashFile(absolutePath);
    if (!acceptedHashes.has(actualHash)) {
      errors.push(`unexpected existing hash: ${actualHash}; accepted: ${[...acceptedHashes].join(', ') || 'none'}`);
    }
    return {
      repoPath,
      status: errors.length ? 'blocked' : 'present',
      actualHash,
      acceptedHashes: [...acceptedHashes],
      gitHash,
      restoreSource,
      restored: false,
      errors,
    };
  }

  if (!restoreSource.kind) errors.push('missing runtime file and no cache/Git restore source is available');
  return {
    repoPath,
    status: 'missing',
    actualHash: null,
    acceptedHashes: [...acceptedHashes],
    gitHash,
    restoreSource,
    restored: false,
    errors,
  };
}

async function resolveRestoreSource({ cache, gitHash, repoPath }) {
  if (cache) {
    const cachePath = fromRepoPath(repoRoot, cache.cacheRepoPath);
    if (await fileExists(cachePath)) {
      const cacheHash = await hashFile(cachePath);
      if (!cache.sha256 || cacheHash === cache.sha256 || cacheHash === gitHash) {
        return {
          kind: 'cache',
          repoPath: cache.cacheRepoPath,
          sha256: cacheHash,
        };
      }
    }
  }
  if (gitHash) {
    return {
      kind: 'git',
      repoPath,
      sha256: gitHash,
    };
  }
  return {
    kind: null,
    repoPath: null,
    sha256: null,
  };
}

function acceptedManifestHashes(repoPath, manifestRecords) {
  const hashes = [];
  for (const record of findManifestRecords(repoPath, manifestRecords)) {
    if (record.outputHash) hashes.push(record.outputHash);
    if (record.promotion?.candidateHash) hashes.push(record.promotion.candidateHash);
  }
  return hashes;
}

async function listTrackedRuntimeGlbs(rootPath) {
  const output = await git(['ls-files', '-z', rootPath]);
  return output
    .toString('utf8')
    .split('\0')
    .map(normalizeRepoPath)
    .filter((repoPath) => repoPath.endsWith('.glb'))
    .sort();
}

async function gitShowBuffer(repoPath) {
  return git(['show', `HEAD:${repoPath}`]);
}

async function git(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    const errors = [];
    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stderr.on('data', (chunk) => errors.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(Buffer.concat(errors).toString('utf8').trim() || `git ${args.join(' ')} failed`));
    });
  });
}

async function writeReports({ pipelineConfig, repairConfig, results, blockers }) {
  await fs.mkdir(runDir, { recursive: true });
  const completedAt = new Date().toISOString();
  const run = await createRunMetadata({
    repoRoot,
    runId,
    kind: 'runtime-glb-repair',
    scope: 'runtime',
    strict: true,
    startedAt,
    completedAt,
    args: process.argv.slice(2),
  });
  const report = {
    schemaVersion: 1,
    run,
    apply,
    configPath,
    runtimeRoot,
    repairConfig,
    totals: {
      tracked: results.length,
      present: results.filter((result) => result.status === 'present').length,
      missing: results.filter((result) => result.status === 'missing').length,
      restored: results.filter((result) => result.restored).length,
      blocked: blockers.length,
    },
    blockers,
    results,
  };
  await writeJsonFile(path.join(runDir, 'runtime-repair.json'), report);
  await fs.writeFile(path.join(runDir, 'runtime-repair.md'), formatReport(report));
  await writeJsonFile(path.join(repoRoot, 'asset-pipeline', 'manifests', 'latest-runtime-repair.json'), report);
  void pipelineConfig;
}

function formatReport(report) {
  return `# Runtime GLB Repair ${report.run.runId}

- Apply: ${report.apply ? 'yes' : 'no'}
- Runtime root: \`${report.runtimeRoot}\`
- Tracked GLBs: ${report.totals.tracked}
- Present: ${report.totals.present}
- Missing: ${report.totals.missing}
- Restored: ${report.totals.restored}
- Blockers: ${report.totals.blocked}

## Results

| Runtime GLB | Status | Restore source | Actual hash | Restored hash | Errors |
| --- | --- | --- | --- | --- | --- |
${report.results.map((result) => `| \`${result.repoPath}\` | ${result.status} | ${result.restoreSource?.kind || 'none'}${result.restoreSource?.repoPath ? `:\`${result.restoreSource.repoPath}\`` : ''} | ${result.actualHash || ''} | ${result.restoredHash || ''} | ${formatCell(result.errors.join('; ') || 'none')} |`).join('\n') || '| none | | | | | |'}
`;
}

function sha256Buffer(buffer) {
  return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
}

function formatCell(value) {
  return value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function withDetail(error, detail) {
  error.detail = detail;
  return error;
}
