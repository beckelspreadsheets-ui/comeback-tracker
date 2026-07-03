import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { hashConfigFiles } from './asset-pipeline-config.mjs';

const execFileAsync = promisify(execFile);

export async function createRunMetadata({ repoRoot, runId, kind, scope, strict, startedAt, completedAt, args }) {
  const [npmVersion, gitCommit, packageVersions, configHashes] = await Promise.all([
    readCommand('npm', ['-v'], repoRoot),
    readCommand('git', ['rev-parse', 'HEAD'], repoRoot),
    readPackageVersions(repoRoot),
    hashConfigFiles(repoRoot),
  ]);

  return {
    schemaVersion: 1,
    runId,
    kind,
    scope,
    strict,
    commandArguments: args,
    cwd: repoRoot,
    startedAt,
    completedAt,
    node: process.version,
    npm: npmVersion.ok ? npmVersion.stdout.trim() : null,
    platform: {
      platform: process.platform,
      arch: process.arch,
      versions: process.versions,
    },
    gitCommit: gitCommit.ok ? gitCommit.stdout.trim() : null,
    packageVersions,
    configHashes,
  };
}

async function readCommand(command, args, cwd) {
  try {
    const result = await execFileAsync(command, args, { cwd });
    return {
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      message: error.message,
    };
  }
}

async function readPackageVersions(repoRoot) {
  const packages = [
    '@gltf-transform/core',
    '@gltf-transform/functions',
    '@gltf-transform/extensions',
    '@gltf-transform/cli',
    'meshoptimizer',
    'sharp',
    'three',
    'vite',
    'playwright',
    'pngjs',
  ];
  const versions = {};
  for (const packageName of packages) {
    const packageJsonPath = path.join(repoRoot, 'node_modules', ...packageName.split('/'), 'package.json');
    try {
      const parsed = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      versions[packageName] = parsed.version || null;
    } catch (error) {
      versions[packageName] = {
        error: error.message,
      };
    }
  }
  return versions;
}
