import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const shouldCleanArtifacts = !process.env.RELEASE_DECISION_ARTIFACT_DIR;
const artifactsDir = process.env.RELEASE_DECISION_ARTIFACT_DIR
  ? path.resolve(root, process.env.RELEASE_DECISION_ARTIFACT_DIR)
  : path.join(root, 'tmp', 'release-decision-readiness');

const docs = {
  checklist: path.join(root, 'docs', 'race-v1-definition-of-done-checklist.md'),
  manualQa: path.join(root, 'docs', 'race-manual-qa-rubric.md'),
  ownerPacket: path.join(root, 'docs', 'race-owner-review-packet.md'),
  plan: path.join(root, 'docs', 'comeback-city-kart-racer-production-readiness-plan.md'),
  runbook: path.join(root, 'docs', 'race-release-operations-runbook.md'),
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

const parseMarkdownRow = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

const extractNotSuppliedRows = (relativePath, source) =>
  source
    .split('\n')
    .map((line, index) => ({ index: index + 1, line }))
    .map(({ index, line }) => ({
      cells: parseMarkdownRow(line),
      line: index,
      path: relativePath,
      raw: line.trim(),
    }))
    .filter(({ cells, raw }) => /^\s*\|/.test(raw) && cells.some((cell) => cell === 'Not supplied'));

const requiredDecisionChecks = [
  {
    id: 'visual-target-and-scope',
    label: 'Approved visual target, viewport priority, HUD, and V1 scope',
    terms: ['approved visual composition target', 'v1 vehicle scope', 'hud direction'],
  },
  {
    id: 'target-device-and-performance',
    label: 'Minimum desktop/mobile device and performance target policy',
    terms: ['minimum desktop device/browser', 'minimum mobile device/browser', 'desktop-first'],
  },
  {
    id: 'manual-qa-and-fresh-user',
    label: 'Manual QA tester and fresh-user reviewer',
    terms: ['manual qa tester', 'fresh-user reviewer', 'manual reviewers'],
  },
  {
    id: 'ip-provenance-legal',
    label: 'IP/provenance reviewer and item naming decisions',
    terms: ['ip/provenance reviewer', 'item naming/ip direction', 'guard shell name acceptable'],
  },
  {
    id: 'cloudflare-release-target',
    label: 'Production Cloudflare Pages project/domain and preview policy',
    terms: ['production cloudflare pages project/domain', 'production cloudflare pages project', 'preview branch/project policy'],
  },
  {
    id: 'deploy-gate-policy',
    label: 'Clean deploy policy and CI/manual release gate acceptance',
    terms: ['clean production deploy policy', 'clean deploy policy', 'ci url or manual checklist acceptance'],
  },
  {
    id: 'rollback-and-race-disable',
    label: 'Launch/rollback owners and race-disable activation policy',
    terms: ['launch owner and rollback owner', 'rollback owner', 'race-disable activation policy'],
  },
  {
    id: 'cloud-sync-d1-scope',
    label: 'Cloudflare Functions, D1 sync, backups, and data rollback scope',
    terms: ['sync/cloud api production scope', 'cloudflare sync/d1 production scope', 'd1'],
  },
  {
    id: 'fatsecret-barcode-camera-scope',
    label: 'FatSecret proxy, barcode scanner, and camera permission scope',
    terms: ['fatsecret/barcode production scope', 'fatsecret and barcode scanner production scope', 'camera'],
  },
  {
    id: 'telemetry-privacy-log-retention',
    label: 'Telemetry privacy, log retention, and redaction owner',
    terms: ['telemetry retention and log redaction owner', 'telemetry/log retention owner', 'privacy'],
  },
  {
    id: 'monitoring-and-support',
    label: 'Monitoring provider/no-provider risk, support path, and post-launch window',
    terms: ['monitoring provider', 'support contact/path', 'post-launch monitoring window'],
  },
  {
    id: 'accessibility-review',
    label: 'Target-browser/device accessibility reviewer or exception',
    terms: ['accessibility target-browser/device reviewer', 'accessibility reviewer and target device/browser set'],
  },
  {
    id: 'web-vitals-lighthouse',
    label: 'Web Vitals/Lighthouse targets or dated exception',
    terms: ['web vitals/lighthouse target'],
  },
  {
    id: 'bundle-budget',
    label: 'Bundle/asset budget threshold or exception',
    terms: ['bundle/asset budget threshold or exception'],
  },
  {
    id: 'source-map-debug-test-hook-policy',
    label: 'Source-map/debug/test-hook policy',
    terms: ['source-map/debug/test-hook policy'],
  },
  {
    id: 'production-dependency-audit-policy',
    label: 'Production dependency audit split or full-audit advisory decision',
    terms: ['production dependency audit policy', 'vite/esbuild advisory decision'],
  },
  {
    id: 'preview-production-smoke-signoff',
    label: 'Preview/prod smoke metadata and sign-offs',
    terms: ['preview url', 'production url', 'sign-off'],
  },
];

const termStatus = (sources, term) => {
  const normalizedTerm = normalize(term);
  const matches = Object.entries(sources)
    .filter(([, source]) => normalize(source).includes(normalizedTerm))
    .map(([key]) => path.relative(root, docs[key]));
  return {
    matches,
    term,
  };
};

const run = async () => {
  if (shouldCleanArtifacts) await rm(artifactsDir, { force: true, recursive: true });
  await mkdir(artifactsDir, { recursive: true });

  const sources = Object.fromEntries(
    await Promise.all(Object.entries(docs).map(async ([key, filePath]) => [key, await readFile(filePath, 'utf8')]))
  );
  const notSuppliedRows = Object.entries(sources).flatMap(([key, source]) =>
    extractNotSuppliedRows(path.relative(root, docs[key]), source)
  );
  const normalizedNotSuppliedSource = normalize(notSuppliedRows.map((row) => row.raw).join('\n'));

  const decisions = requiredDecisionChecks.map((check) => {
    const terms = check.terms.map((term) => termStatus(sources, term));
    const missing = check.terms.some((term) => normalizedNotSuppliedSource.includes(normalize(term)));
    return {
      id: check.id,
      label: check.label,
      status: missing ? 'missing-owner-input' : 'not-currently-marked-not-supplied',
      terms,
    };
  });
  const missingDecisions = decisions.filter((decision) => decision.status === 'missing-owner-input');

  const summary = {
    artifactsDir,
    capturedAt: new Date().toISOString(),
    gateStatus: missingDecisions.length
      ? 'owner-release-decisions-missing-r3-blocked'
      : 'tracked-decisions-not-currently-marked-not-supplied',
    git: getGitMetadata(),
    note:
      'This audit records repo-visible release-owner/product/design/legal decisions that are still marked Not supplied. It does not infer decisions or convert local technical evidence into production sign-off.',
    decisions,
    missingDecisionCount: missingDecisions.length,
    missingDecisions: missingDecisions.map(({ id, label }) => ({ id, label })),
    notSuppliedRows,
    notSuppliedRowsByFile: Object.fromEntries(
      Object.entries(docs).map(([key, filePath]) => {
        const relativePath = path.relative(root, filePath);
        return [relativePath, notSuppliedRows.filter((row) => row.path === relativePath).length];
      })
    ),
    paths: Object.fromEntries(Object.entries(docs).map(([key, filePath]) => [key, path.relative(root, filePath)])),
    requiredOwnerQuestions: [
      'Provide preview and production URLs, Cloudflare Pages project/branch/deployment IDs, commit SHAs, smoke results, rollback target, deployed monitoring/version signal, and final sign-offs.',
      'Provide manual QA scores, target-browser/device accessibility sign-off, and final screenshot/silhouette/binary provenance review.',
      'Provide the actual CI run URL or owner-accepted manual release checklist execution from the clean release branch/worktree.',
    ],
  };

  const summaryPath = path.join(artifactsDir, 'release-decision-readiness-summary.json');
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
