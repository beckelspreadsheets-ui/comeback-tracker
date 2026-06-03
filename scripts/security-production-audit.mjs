import { spawnSync } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const shouldCleanArtifacts = !process.env.SECURITY_AUDIT_ARTIFACT_DIR;
const artifactsDir = process.env.SECURITY_AUDIT_ARTIFACT_DIR
  ? path.resolve(root, process.env.SECURITY_AUDIT_ARTIFACT_DIR)
  : path.join(root, 'tmp', 'security-production-audit');

const fail = (message, detail = {}) => {
  const error = new Error(message);
  error.detail = detail;
  throw error;
};

const readGitValue = (args) => {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null;
  }
};

const getGitMetadata = () => ({
  branch: readGitValue(['branch', '--show-current']),
  commit: readGitValue(['rev-parse', '--short', 'HEAD']),
  dirty: Boolean(readGitValue(['status', '--porcelain'])),
});

const runNpmAudit = (args) => {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npm, ['audit', ...args, '--json'], {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
  });
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  let report = null;
  try {
    report = JSON.parse(stdout);
  } catch {
    fail('npm audit did not return valid JSON', {
      args,
      exitCode: result.status,
      stderr: stderr.slice(-4000),
      stdout: stdout.slice(0, 4000),
    });
  }
  return {
    args: ['npm', 'audit', ...args, '--json'],
    exitCode: result.status,
    report,
    stderr,
    stdout,
  };
};

const vulnerabilityTotal = (report) => report?.metadata?.vulnerabilities?.total ?? 0;

const summarizeVulnerabilities = (report) =>
  Object.values(report?.vulnerabilities || {}).map((item) => ({
    effects: item.effects || [],
    fixAvailable: item.fixAvailable || false,
    isDirect: Boolean(item.isDirect),
    name: item.name,
    range: item.range || null,
    severity: item.severity || null,
    via: (item.via || []).map((entry) =>
      typeof entry === 'string'
        ? { name: entry, type: 'dependency' }
        : {
            cwe: entry.cwe || [],
            name: entry.name || null,
            severity: entry.severity || null,
            source: entry.source || null,
            title: entry.title || null,
            url: entry.url || null,
          }
    ),
  }));

const run = async () => {
  try {
    if (shouldCleanArtifacts) await rm(artifactsDir, { force: true, recursive: true });
    await mkdir(artifactsDir, { recursive: true });

    const productionAudit = runNpmAudit(['--omit=dev']);
    const fullAudit = runNpmAudit([]);
    await writeFile(
      path.join(artifactsDir, 'npm-audit-production.json'),
      `${JSON.stringify(productionAudit.report, null, 2)}\n`
    );
    await writeFile(path.join(artifactsDir, 'npm-audit-full.json'), `${JSON.stringify(fullAudit.report, null, 2)}\n`);
    await writeFile(
      path.join(artifactsDir, 'npm-audit-production.stderr.log'),
      productionAudit.stderr ? `${productionAudit.stderr}\n` : ''
    );
    await writeFile(path.join(artifactsDir, 'npm-audit-full.stderr.log'), fullAudit.stderr ? `${fullAudit.stderr}\n` : '');

    if (vulnerabilityTotal(productionAudit.report) > 0) {
      fail('Production dependency audit reported vulnerabilities', {
        vulnerabilities: productionAudit.report.metadata?.vulnerabilities,
      });
    }

    const fullVulnerabilityTotal = vulnerabilityTotal(fullAudit.report);
    const fullVulnerabilities = summarizeVulnerabilities(fullAudit.report);
    const summary = {
      artifactFiles: [
        path.join(artifactsDir, 'npm-audit-production.json'),
        path.join(artifactsDir, 'npm-audit-full.json'),
        path.join(artifactsDir, 'security-production-audit-summary.json'),
      ],
      artifactsDir,
      capturedAt: new Date().toISOString(),
      fullAudit: {
        dependencyCounts: fullAudit.report.metadata?.dependencies || {},
        exitCode: fullAudit.exitCode,
        vulnerabilities: fullAudit.report.metadata?.vulnerabilities || {},
        vulnerabilityDetails: fullVulnerabilities,
      },
      gateStatus:
        fullVulnerabilityTotal > 0
          ? 'production-dependency-audit-pass-dev-advisory-policy-needed'
          : 'full-dependency-audit-pass',
      git: getGitMetadata(),
      note:
        fullVulnerabilityTotal > 0
          ? 'Production dependency audit passes with zero reported prod vulnerabilities. Full npm audit still reports dev/build-tool advisories that require a major-version upgrade decision or dated release-owner exception.'
          : 'Production and full dependency audits pass with zero reported vulnerabilities.',
      productionAudit: {
        dependencyCounts: productionAudit.report.metadata?.dependencies || {},
        exitCode: productionAudit.exitCode,
        vulnerabilities: productionAudit.report.metadata?.vulnerabilities || {},
      },
      unresolvedReleaseDecisions:
        fullVulnerabilityTotal > 0
          ? [
              'Perform Vite/vite-plugin-pwa major upgrade now or record a dated release-owner exception for the dev-server/build-tool advisories.',
              'Confirm whether npm audit --omit=dev is accepted as production dependency evidence for the release checklist.',
            ]
          : [],
    };
    await writeFile(path.join(artifactsDir, 'security-production-audit-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error(error.message);
    if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
    process.exitCode = 1;
  }
};

await run();
