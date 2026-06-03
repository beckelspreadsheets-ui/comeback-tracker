import { execFileSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const shouldCleanArtifacts = !process.env.MONITORING_SUPPORT_ARTIFACT_DIR;
const artifactsDir = process.env.MONITORING_SUPPORT_ARTIFACT_DIR
  ? path.resolve(root, process.env.MONITORING_SUPPORT_ARTIFACT_DIR)
  : path.join(root, 'tmp', 'monitoring-support-readiness');

const runbookPath = path.join(root, 'docs', 'race-release-operations-runbook.md');
const postLaunchTemplatePath = path.join(root, 'docs', 'race-post-launch-report-template.md');

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
  commit: readGitValue(['rev-parse', 'HEAD']),
  dirty: Boolean(readGitValue(['status', '--porcelain'])),
});

const normalize = (value) => value.toLowerCase().replace(/\s+/g, ' ').trim();

const hasAllTerms = (source, terms) => terms.every((term) => source.includes(normalize(term)));

const evaluateChecks = (source, checks) =>
  checks.map((check) => ({
    id: check.id,
    label: check.label,
    passed: hasAllTerms(source, check.terms),
    requiredTerms: check.terms,
  }));

const monitoringSignalChecks = [
  { id: 'app-load-errors', label: 'App load errors', terms: ['app load errors'] },
  { id: 'race-route-load-errors', label: 'Race route load errors', terms: ['race route load errors'] },
  { id: 'webgl-failures', label: 'WebGL creation/context-loss failures', terms: ['webgl', 'context-loss'] },
  { id: 'pages-functions-errors', label: 'Pages Functions errors', terms: ['pages functions errors'] },
  { id: 'race-start-completion-counts', label: 'Race start/completion counts', terms: ['race start', 'completion counts'] },
  { id: 'first-drift-item-timing', label: 'First drift/item timing', terms: ['time to first drift', 'time to first item pickup'] },
  { id: 'fps-sampling', label: 'Average/low-percentile FPS', terms: ['average', 'low-percentile fps'] },
  { id: 'device-browser-bucket', label: 'Device/browser bucket', terms: ['device/browser bucket'] },
  { id: 'deployment-version', label: 'Deployment version/commit', terms: ['deployment version/commit'] },
  { id: 'service-worker-update', label: 'Service worker update state', terms: ['service worker update state'] },
  {
    id: 'disable-rollback-status',
    label: 'Race disable/rollback activation status',
    terms: ['race disable/rollback activation status'],
  },
  { id: 'manual-support-reports', label: 'Manual support reports', terms: ['manual support reports'] },
];

const supportStepChecks = [
  { id: 'identify-deployed-version', label: 'Identify current deployed version', terms: ['deployment id', 'commit'] },
  { id: 'reproduce-race', label: 'Reproduce /#race', terms: ['reproduce', '/#race'] },
  { id: 'collect-evidence', label: 'Collect screenshots and browser info', terms: ['screenshot', 'browser'] },
  { id: 'clear-pwa-cache', label: 'Clear PWA cache or unregister service worker', terms: ['unregister service worker'] },
  { id: 'rollback', label: 'Rollback path', terms: ['rollback'] },
  { id: 'race-disable', label: 'Disable or hide race mode', terms: ['race-disable'] },
  { id: 'functions-logs', label: 'Check Cloudflare Pages Function logs', terms: ['cloudflare pages function logs'] },
  { id: 'd1-backups', label: 'Verify D1 sync/backups', terms: ['d1', 'backup'] },
  { id: 'fatsecret-health', label: 'Verify FatSecret proxy health', terms: ['fatsecret'] },
  { id: 'scanner-camera', label: 'Scanner/camera permission reports', terms: ['scanner', 'camera permission'] },
  { id: 'known-limitations', label: 'Known issues and limitations', terms: ['known current limitations'] },
];

const ownerInputChecks = [
  { id: 'monitoring-provider', label: 'Monitoring provider or no-monitoring risk', terms: ['monitoring provider'] },
  { id: 'support-contact', label: 'Support contact/path', terms: ['support contact/path'] },
  { id: 'post-launch-window', label: 'Post-launch monitoring window', terms: ['post-launch monitoring window'] },
  { id: 'release-owner', label: 'Release owner', terms: ['release owner'] },
  { id: 'rollback-owner', label: 'Rollback owner', terms: ['rollback owner'] },
  { id: 'production-target', label: 'Production Cloudflare target', terms: ['production cloudflare pages project'] },
];

const postLaunchChecks = [
  { id: 'release-metadata', label: 'Release metadata table', terms: ['release metadata', 'production url', 'deployment id'] },
  { id: 'final-evidence', label: 'Final pre-launch evidence table', terms: ['final pre-launch evidence'] },
  { id: 'production-smoke', label: 'Production smoke result table', terms: ['production smoke result'] },
  { id: 'monitoring-window', label: 'Monitoring window table', terms: ['monitoring window'] },
  { id: 'issues', label: 'Issue table', terms: ['issues', 'severity', 'owner'] },
  { id: 'rollback-decision', label: 'Rollback decision table', terms: ['rollback decision'] },
  { id: 'final-status', label: 'Final R3/R4 status', terms: ['r3/r4 status'] },
];

const summarize = (checks) => ({
  failed: checks.filter((check) => !check.passed).map((check) => check.id),
  passed: checks.filter((check) => check.passed).map((check) => check.id),
  total: checks.length,
});

const run = async () => {
  if (shouldCleanArtifacts) await rm(artifactsDir, { force: true, recursive: true });
  await mkdir(artifactsDir, { recursive: true });

  const runbook = normalize(await readFile(runbookPath, 'utf8'));
  const postLaunchTemplate = normalize(await readFile(postLaunchTemplatePath, 'utf8'));

  const monitoringSignals = evaluateChecks(runbook, monitoringSignalChecks);
  const supportSteps = evaluateChecks(runbook, supportStepChecks);
  const ownerInputs = evaluateChecks(runbook, ownerInputChecks);
  const postLaunchTemplateChecks = evaluateChecks(postLaunchTemplate, postLaunchChecks);

  const structuralFailures = [
    ...monitoringSignals.filter((check) => !check.passed),
    ...supportSteps.filter((check) => !check.passed),
    ...ownerInputs.filter((check) => !check.passed),
    ...postLaunchTemplateChecks.filter((check) => !check.passed),
  ];

  const summary = {
    artifactsDir,
    capturedAt: new Date().toISOString(),
    gateStatus: structuralFailures.length
      ? 'failed'
      : 'local-monitoring-support-template-proven-provider-decision-needed',
    git: getGitMetadata(),
    note:
      'This validates the local monitoring/support runbook and post-launch report template structure only. It does not activate a production monitoring provider, create a support contact, define log retention, or approve shipping without monitoring.',
    paths: {
      postLaunchTemplate: path.relative(root, postLaunchTemplatePath),
      runbook: path.relative(root, runbookPath),
    },
    checks: {
      monitoringSignals,
      ownerInputs,
      postLaunchTemplate: postLaunchTemplateChecks,
      supportSteps,
    },
    summaries: {
      monitoringSignals: summarize(monitoringSignals),
      ownerInputs: summarize(ownerInputs),
      postLaunchTemplate: summarize(postLaunchTemplateChecks),
      supportSteps: summarize(supportSteps),
    },
    unresolvedReleaseDecisions: [
      'Choose an approved monitoring/error-reporting provider or record explicit no-provider risk acceptance.',
      'Confirm support contact/path and incident owner.',
      'Define post-launch monitoring window and success thresholds.',
      'Confirm telemetry/privacy/log-retention posture for any client metrics or support reports.',
      'Supply production URL, deployment ID, commit, and deployed response-header evidence before claiming production monitoring readiness.',
    ],
  };

  const summaryPath = path.join(artifactsDir, 'monitoring-support-readiness-summary.json');
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));

  if (structuralFailures.length) {
    fail('Monitoring/support readiness audit failed', {
      failedChecks: structuralFailures.map((check) => ({
        id: check.id,
        label: check.label,
        requiredTerms: check.requiredTerms,
      })),
      summaryPath,
    });
  }
};

run().catch((error) => {
  console.error(error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  process.exit(1);
});
