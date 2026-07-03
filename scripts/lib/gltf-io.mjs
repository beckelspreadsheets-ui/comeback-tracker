import path from 'node:path';
import { spawn } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

let ioPromise = null;

export async function createGltfIO() {
  if (!ioPromise) {
    ioPromise = initializeGltfIO();
  }
  return ioPromise;
}

async function initializeGltfIO() {
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
  return new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'meshopt.decoder': MeshoptDecoder,
      'meshopt.encoder': MeshoptEncoder,
    });
}

export async function readGltfDocument(absolutePath) {
  const io = await createGltfIO();
  return io.read(absolutePath);
}

export async function runGltfValidator(repoRoot, absolutePath) {
  const cliPath = path.join(repoRoot, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');
  const args = [cliPath, 'validate', absolutePath, '--format', 'md'];
  const startedAt = new Date().toISOString();
  const result = await spawnCapture(process.execPath, args, { cwd: repoRoot });
  const completedAt = new Date().toISOString();
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
  const issues = extractValidatorIssues(output);

  return {
    command: `${process.execPath} ${args.map((arg) => JSON.stringify(arg)).join(' ')}`,
    startedAt,
    completedAt,
    status: result.status,
    signal: result.signal,
    passed: result.status === 0,
    errorCount: result.status === 0 ? 0 : Math.max(issues.errorCodes.length, 1),
    warningCount: issues.warningCodes.length,
    infoCount: issues.infoCodes.length,
    errorCodes: issues.errorCodes,
    warningCodes: issues.warningCodes,
    infoCodes: issues.infoCodes,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function spawnCapture(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (status, signal) => {
      resolve({ status, signal, stdout, stderr });
    });
  });
}

function extractValidatorIssues(output) {
  return {
    errorCodes: extractCodesFromSection(output, 'ERROR'),
    warningCodes: extractCodesFromSection(output, 'WARNING'),
    infoCodes: extractCodesFromSection(output, 'INFO'),
  };
}

function extractCodesFromSection(output, sectionName) {
  const sectionStart = output.indexOf(` ${sectionName}\n`);
  if (sectionStart === -1) return [];
  const nextSection = output.slice(sectionStart + sectionName.length + 2).search(/\n\s+(ERROR|WARNING|INFO|HINT)\n/);
  const section = nextSection === -1
    ? output.slice(sectionStart)
    : output.slice(sectionStart, sectionStart + sectionName.length + 2 + nextSection);
  const codes = [];
  for (const match of section.matchAll(/^\|\s*([A-Z0-9_]+)\s*\|/gm)) {
    codes.push(match[1]);
  }
  return [...new Set(codes)].sort();
}
