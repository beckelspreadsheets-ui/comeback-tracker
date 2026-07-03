#!/usr/bin/env node
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const startedAt = new Date().toISOString();
const runId = `${startedAt.replace(/[:.]/g, '-') }__asset-promotion`;
const runDir = path.join(root, 'asset-pipeline', 'promotions', 'runs', runId);
const manifestPath = path.join(root, 'src', 'assets', 'game', 'asset-manifest.json');
const ledgerPath = path.join(root, 'asset-pipeline', 'promotions', 'promotion-ledger.json');

const parsed = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    approval: { type: 'string' },
    asset: { type: 'string' },
    'proof-run': { type: 'string' },
  },
});

const fail = (message, detail = {}) => {
  const error = new Error(message);
  error.detail = detail;
  throw error;
};

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));

const sha256File = async (filePath) => {
  const buffer = await readFile(filePath);
  return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
};

const repoPathToAbs = (repoPath) => path.resolve(root, repoPath);

const findLatestGalleryApproval = async () => {
  const galleryRoot = path.join(root, 'asset-pipeline', 'gallery', 'runs');
  const entries = await readdir(galleryRoot, { withFileTypes: true }).catch(() => []);
  const candidates = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(galleryRoot, entry.name, 'approval-template.json'));
  const existing = [];
  for (const candidate of candidates) {
    if (await stat(candidate).then(() => true).catch(() => false)) existing.push(candidate);
  }
  existing.sort();
  return existing[existing.length - 1] || path.join(root, 'asset-pipeline', 'approvals', 'asset-gallery-approval-template.json');
};

const findLatestCandidateValidation = async () => {
  const auditRoot = path.join(root, 'asset-pipeline', 'audit');
  const entries = await readdir(auditRoot, { withFileTypes: true }).catch(() => []);
  const runs = entries
    .filter((entry) => entry.isDirectory() && entry.name.includes('__asset-validation__candidates'))
    .map((entry) => path.join(auditRoot, entry.name, 'validation.json'))
    .sort();
  return runs[runs.length - 1] || null;
};

const resolveProofRun = async () => {
  if (parsed.values['proof-run']) return path.resolve(root, parsed.values['proof-run']);
  const latestPath = path.join(root, 'asset-pipeline', 'proof', 'latest-proof-run.json');
  const latest = await readJson(latestPath).catch(() => null);
  return latest?.runDir ? path.resolve(root, latest.runDir) : null;
};

const validateProofRun = async (proofRunDir) => {
  if (!proofRunDir) return { ok: false, reason: 'missing proof run' };
  const comparison = await readJson(path.join(proofRunDir, 'comparison.json')).catch(() => null);
  if (!comparison?.ok) return { ok: false, reason: 'proof comparison is missing or failed', proofRunDir };
  return { comparisonPath: path.relative(root, path.join(proofRunDir, 'comparison.json')), ok: true, proofRunDir: path.relative(root, proofRunDir) };
};

const validateCandidateRecord = async ({ candidateValidation, proof, record }) => {
  const errors = [];
  const candidatePath = repoPathToAbs(record.candidateRepoPath);
  const sourcePath = repoPathToAbs(record.sourceRepoPath);
  const runtimePath = repoPathToAbs(record.runtimeRepoPath);
  const candidateHash = await sha256File(candidatePath).catch((error) => {
    errors.push(`candidate file missing or unreadable: ${error.message}`);
    return null;
  });
  const sourceHash = await sha256File(sourcePath).catch((error) => {
    errors.push(`source file missing or unreadable: ${error.message}`);
    return null;
  });
  if (candidateHash && candidateHash !== record.candidateHash) {
    errors.push(`candidate hash mismatch: expected ${record.candidateHash}, got ${candidateHash}`);
  }
  if (sourceHash && sourceHash !== record.sourceHash) {
    errors.push(`source hash mismatch: expected ${record.sourceHash}, got ${sourceHash}`);
  }
  const candidateValidationEntry = candidateValidation?.validations?.find(
    (entry) => entry.repoPath === record.candidateRepoPath
  );
  if (!candidateValidationEntry || !['pass', 'warn'].includes(candidateValidationEntry.status)) {
    errors.push(`candidate validation pass/warn not found for ${record.candidateRepoPath}`);
  }
  if (candidateValidationEntry?.budget?.errors?.length || candidateValidationEntry?.budget?.status === 'fail') {
    errors.push(`candidate budget failed for ${record.candidateRepoPath}`);
  }
  if (record.candidateBudgetStatus === 'fail') {
    errors.push(`approval record candidate budget status is fail for ${record.candidateRepoPath}`);
  }
  if (!proof.ok) errors.push(proof.reason);
  const previousRuntimeHash = await sha256File(runtimePath).catch(() => null);
  return {
    candidateHash,
    candidateValidationStatus: candidateValidationEntry?.status || 'missing',
    errors,
    previousRuntimeHash,
    proof,
    record,
    sourceHash,
  };
};

const updateManifestRecord = async ({ approvalPath, proof, record }) => {
  const manifest = await readJson(manifestPath).catch(() => []);
  const nextEntry = {
    fallback: 'Existing runtime loader fallback behavior remains in place if this GLB fails to load',
    filePath: record.runtimeRepoPath,
    license: 'Owner-created/generated asset; see approval and proof ledger',
    promotion: {
      approvalPath: path.relative(root, approvalPath),
      assetId: record.assetId,
      candidateHash: record.candidateHash,
      candidateRepoPath: record.candidateRepoPath,
      promotedAt: startedAt,
      proofRun: proof.proofRunDir,
      sourceHash: record.sourceHash,
      sourceRepoPath: record.sourceRepoPath,
    },
    assetClass: record.assetClass || undefined,
    assetId: record.assetId,
    outputHash: record.candidateHash,
    sourceHash: record.sourceHash,
    status: record.candidateBudgetStatus === 'warn' ? 'runtime-hard-pass-target-warning' : 'runtime-hard-pass',
    runtimeTransform: `Approved ${record.candidatePipeline || 'candidate'} ${record.candidateProfile || ''}`.trim(),
    role: `Runtime promoted asset for ${record.assetId}`,
    sizeBudget: `Promoted candidate hash ${record.candidateHash}`,
    source: `Approved optimized candidate from ${record.sourceRepoPath}`,
  };
  const index = manifest.findIndex((entry) => entry.filePath === record.runtimeRepoPath);
  if (index >= 0) manifest[index] = { ...manifest[index], ...nextEntry };
  else manifest.push(nextEntry);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
};

const appendLedger = async (entry) => {
  const ledger = await readJson(ledgerPath).catch(() => ({ schemaVersion: 1, promotions: [] }));
  ledger.promotions = [...(ledger.promotions || []), entry];
  await mkdir(path.dirname(ledgerPath), { recursive: true });
  await writeFile(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
};

const promoteOne = async ({ approvalPath, proof, validation }) => {
  const record = validation.record;
  const candidatePath = repoPathToAbs(record.candidateRepoPath);
  const runtimePath = repoPathToAbs(record.runtimeRepoPath);
  await mkdir(path.dirname(runtimePath), { recursive: true });
  await copyFile(candidatePath, runtimePath);
  const promotedHash = await sha256File(runtimePath);
  if (promotedHash !== record.candidateHash) {
    fail('promoted bytes did not match approved candidate hash', {
      expected: record.candidateHash,
      got: promotedHash,
      runtimeRepoPath: record.runtimeRepoPath,
    });
  }
  await updateManifestRecord({ approvalPath, proof, record });
  const ledgerEntry = {
    approvalPath: path.relative(root, approvalPath),
    assetId: record.assetId,
    candidateHash: record.candidateHash,
    candidateRepoPath: record.candidateRepoPath,
    previousRuntimeHash: validation.previousRuntimeHash,
    promotedAt: startedAt,
    proofRun: proof.proofRunDir,
    runId,
    runtimeRepoPath: record.runtimeRepoPath,
    sourceHash: record.sourceHash,
    sourceRepoPath: record.sourceRepoPath,
  };
  await appendLedger(ledgerEntry);
  return ledgerEntry;
};

const formatReport = (report) => `# Asset Promotion ${report.runId}

- Apply: ${report.apply ? 'yes' : 'no'}
- Approval: \`${report.approvalPath}\`
- Proof: ${report.proof.ok ? `\`${report.proof.proofRunDir}\`` : report.proof.reason}
- Candidate validation: ${report.candidateValidationPath ? `\`${report.candidateValidationPath}\`` : 'missing'}
- Approved records selected: ${report.selected.length}
- Promoted records: ${report.promoted.length}

## Selected Records

| Asset | Pipeline | Decision | Approved | Candidate hash ok | Source hash ok | Validation | Budget | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${report.selected.map((entry) => `| ${entry.assetId} | ${entry.candidatePipeline || ''} | ${entry.decision} | ${entry.approvedForPromotion ? 'yes' : 'no'} | ${entry.candidateHashOk ? 'yes' : 'no'} | ${entry.sourceHashOk ? 'yes' : 'no'} | ${entry.candidateValidationStatus} | ${entry.candidateBudgetStatus || ''} | ${entry.errors.length ? `blocked: ${entry.errors.join('; ')}` : 'ready'} |`).join('\n') || '| none |  |  |  |  |  |  |  |  |'}

## Notes

${report.notes.map((note) => `- ${note}`).join('\n') || '- none'}
`;

const run = async () => {
  await mkdir(runDir, { recursive: true });
  const approvalPath = path.resolve(root, parsed.values.approval || await findLatestGalleryApproval());
  const approval = await readJson(approvalPath);
  const proof = await validateProofRun(await resolveProofRun());
  const candidateValidationPath = await findLatestCandidateValidation();
  const candidateValidation = candidateValidationPath ? await readJson(candidateValidationPath) : null;
  const approvedRecords = (approval.records || []).filter(
    (record) => record.decision === 'approved' && record.approvedForPromotion === true
  );
  const assetFilter = parsed.values.asset || null;
  const selectedRecords = assetFilter
    ? (approval.records || []).filter((record) => record.assetId === assetFilter)
    : approvedRecords;
  if (assetFilter && !selectedRecords.length) fail(`No approval record found for asset "${assetFilter}"`);
  const notes = [];
  if (!selectedRecords.length) {
    notes.push('No records are approved for promotion; runtime asset bytes were not changed.');
  }
  if (parsed.values.apply && selectedRecords.length !== 1) {
    fail('Promotion with --apply requires exactly one selected approved asset', {
      selected: selectedRecords.map((record) => record.assetId),
    });
  }
  const validations = [];
  for (const record of selectedRecords) {
    const validation = await validateCandidateRecord({ candidateValidation, proof, record });
    if (record.decision !== 'approved' || record.approvedForPromotion !== true) {
      validation.errors.push('record is not approved for promotion');
    }
    validations.push(validation);
  }
  const selected = validations.map((validation) => ({
    approvedForPromotion: validation.record.approvedForPromotion === true,
    assetId: validation.record.assetId,
    candidateBudgetStatus: validation.record.candidateBudgetStatus || validation.record.budgetStatus || '',
    candidatePipeline: validation.record.candidatePipeline || '',
    candidateHashOk: validation.candidateHash === validation.record.candidateHash,
    candidateValidationStatus: validation.candidateValidationStatus,
    decision: validation.record.decision,
    errors: validation.errors,
    sourceHashOk: validation.sourceHash === validation.record.sourceHash,
  }));
  const blockers = validations.flatMap((validation) =>
    validation.errors.map((error) => `${validation.record.assetId}: ${error}`)
  );
  if (parsed.values.apply && blockers.length) {
    fail('Selected asset did not pass promotion gates', { blockers });
  }
  const promoted = [];
  if (parsed.values.apply && validations.length === 1) {
    promoted.push(await promoteOne({ approvalPath, proof, validation: validations[0] }));
  }
  if (!parsed.values.apply) {
    notes.push('Dry-run only. Pass --apply with --asset <assetId> after approval to copy bytes.');
  }
  const report = {
    apply: parsed.values.apply,
    approvalPath: path.relative(root, approvalPath),
    candidateValidationPath: candidateValidationPath ? path.relative(root, candidateValidationPath) : null,
    notes,
    promoted,
    proof,
    runId,
    selected,
    startedAt,
  };
  await writeFile(path.join(runDir, 'promotion-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(runDir, 'promotion-report.md'), formatReport(report));
  await writeFile(path.join(root, 'asset-pipeline', 'promotions', 'latest-promotion-run.json'), `${JSON.stringify({
    runDir: path.relative(root, runDir),
    runId,
  }, null, 2)}\n`);
  console.log(`Asset promotion report written to ${path.relative(root, runDir)}`);
  console.log(`selected=${selected.length} promoted=${promoted.length} apply=${parsed.values.apply ? 'yes' : 'no'}`);
  if (blockers.length && assetFilter) {
    console.error(blockers.join('\n'));
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error(error.stack || error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  process.exit(1);
});
