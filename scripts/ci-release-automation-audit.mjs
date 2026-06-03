import { execFileSync } from 'node:child_process';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const shouldCleanArtifacts = !process.env.CI_RELEASE_AUTOMATION_AUDIT_ARTIFACT_DIR;
const artifactsDir = process.env.CI_RELEASE_AUTOMATION_AUDIT_ARTIFACT_DIR
  ? path.resolve(root, process.env.CI_RELEASE_AUTOMATION_AUDIT_ARTIFACT_DIR)
  : path.join(root, 'tmp', 'ci-release-automation-audit');
const workflowPath = path.join(root, '.github', 'workflows', 'race-production-gates.yml');

const requiredRuns = [
  'npm ci',
  'npx playwright install --with-deps chromium firefox webkit',
  'npm run build',
  'npm run test:race',
  'npm run test:race:browser',
  'npm run test:race:disable',
  'npm run test:core',
  'npm run test:hub',
  'npm run test:visual',
  'npm run test:api:data',
  'npm run test:pwa',
  'npm run test:pwa:update',
  'npm run test:lifecycle',
  'npm run test:webgl',
  'npm run test:release:smoke',
  'npm run test:release:rollback',
  'npm run test:release:artifacts',
  'npm run test:accessibility',
  'npm run test:cross-browser',
  'npm run test:device:matrix',
  'npm run test:headers:deployed',
  'npm run test:bundle',
  'npm run test:lab',
  'npm run test:qa:capture',
  'npm run test:monitoring:support',
  'npm run test:security:prod',
  'npm run test:release:decisions',
  'npm run test:production:gates',
  'npm run test:ci:release',
];

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

const normalize = (value) => value.replace(/\s+/g, ' ').trim();

const run = async () => {
  if (shouldCleanArtifacts) await rm(artifactsDir, { force: true, recursive: true });
  await mkdir(artifactsDir, { recursive: true });
  await access(workflowPath);

  const workflowSource = await readFile(workflowPath, 'utf8');
  const normalizedSource = normalize(workflowSource);
  const missingRuns = requiredRuns.filter((command) => !normalizedSource.includes(command));
  const triggerChecks = [
    { label: 'pull_request trigger', ok: /\bpull_request\s*:/.test(workflowSource) },
    { label: 'main push trigger', ok: /\bpush\s*:/.test(workflowSource) && /branches\s*:[\s\S]*-\s+main/.test(workflowSource) },
    { label: 'workflow_dispatch trigger', ok: /\bworkflow_dispatch\s*:/.test(workflowSource) },
  ];
  const setupChecks = [
    { label: 'checkout action', ok: workflowSource.includes('actions/checkout@v4') },
    { label: 'setup-node action', ok: workflowSource.includes('actions/setup-node@v4') },
    { label: 'node 20', ok: /node-version:\s*20/.test(workflowSource) },
    { label: 'npm cache', ok: /cache:\s*npm/.test(workflowSource) },
  ];
  const failures = [
    ...missingRuns.map((command) => ({ command, label: 'missing run command' })),
    ...triggerChecks.filter((check) => !check.ok),
    ...setupChecks.filter((check) => !check.ok),
  ];
  const summary = {
    artifactsDir,
    capturedAt: new Date().toISOString(),
    failures,
    gateStatus: failures.length
      ? 'ci-release-workflow-structure-failing'
      : 'ci-release-workflow-structured-not-run-or-owner-approved',
    git: getGitMetadata(),
    note:
      'This audit proves the workflow file contains the expected local release-gate commands. It does not prove a GitHub Actions run has executed or that release owner accepted CI/manual gate policy.',
    requiredRuns,
    setupChecks,
    triggerChecks,
    unresolved: [
      'No GitHub Actions run URL is recorded.',
      'Release-owner CI/manual gate policy and dirty-worktree deploy policy are not supplied.',
    ],
    workflowPath: path.relative(root, workflowPath),
  };

  await writeFile(path.join(artifactsDir, 'ci-release-automation-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  if (failures.length) process.exitCode = 1;
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
