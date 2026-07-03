import path from 'node:path';
import {
  fromRepoPath,
  normalizeRepoPath,
  readJsonIfExists,
  writeJsonFile,
} from './asset-pipeline-config.mjs';

export const DEFAULT_CANDIDATE_REPORTS = [
  'asset-pipeline/working/optimized/latest-optimization.json',
  'asset-pipeline/working/blender-decimate/latest-decimation.json',
];

export const DEFAULT_CANDIDATE_INDEX = 'asset-pipeline/working/candidates/latest-candidate-index.json';

export async function loadCandidateIndex(repoRoot, extraReportPaths = []) {
  const reportPaths = unique([
    ...DEFAULT_CANDIDATE_REPORTS,
    ...extraReportPaths.map(normalizeRepoPath),
  ]);
  const candidates = [];

  for (const reportPath of reportPaths) {
    const report = await readJsonIfExists(fromRepoPath(repoRoot, reportPath), null);
    if (!report) continue;
    candidates.push(...normalizeCandidateReport(report, reportPath));
  }

  return {
    schemaVersion: 1,
    reports: reportPaths,
    candidates: candidates.sort((a, b) =>
      `${a.targetRuntimeRepoPath}:${a.candidatePipeline}:${a.profileName}:${a.candidateRepoPath}`
        .localeCompare(`${b.targetRuntimeRepoPath}:${b.candidatePipeline}:${b.profileName}:${b.candidateRepoPath}`)
    ),
  };
}

export async function writeCandidateIndex(repoRoot, extraReportPaths = []) {
  const index = await loadCandidateIndex(repoRoot, extraReportPaths);
  await writeJsonFile(fromRepoPath(repoRoot, DEFAULT_CANDIDATE_INDEX), index);
  return index;
}

export async function loadCandidateMetadataByRepoPath(repoRoot, extraReportPaths = []) {
  const index = await loadCandidateIndex(repoRoot, extraReportPaths);
  return new Map(index.candidates.map((candidate) => [candidate.candidateRepoPath, candidate]));
}

export function candidatesByTargetRuntime(index) {
  const map = new Map();
  for (const candidate of index.candidates || []) {
    const list = map.get(candidate.targetRuntimeRepoPath) || [];
    list.push(candidate);
    map.set(candidate.targetRuntimeRepoPath, list);
  }
  return map;
}

function normalizeCandidateReport(report, reportPath) {
  if (Array.isArray(report.candidates)) {
    return report.candidates.map((candidate) => normalizeFlatCandidate(candidate, reportPath)).filter(Boolean);
  }

  if (Array.isArray(report.results)) {
    return report.results.map((result) => normalizeResultCandidate(result, report, reportPath)).filter(Boolean);
  }

  return [];
}

function normalizeFlatCandidate(candidate, reportPath) {
  const candidateRepoPath = normalizeMaybe(candidate.candidateRepoPath || candidate.repoPath);
  const targetRuntimeRepoPath = normalizeMaybe(candidate.targetRuntimeRepoPath || candidate.runtimeRepoPath);
  if (!candidateRepoPath || !targetRuntimeRepoPath) return null;

  return {
    reportPath,
    candidateRepoPath,
    candidateHash: candidate.candidateHash || candidate.outputHash || '',
    sourceRepoPath: normalizeMaybe(candidate.sourceRepoPath),
    sourceHash: candidate.sourceHash || '',
    targetRuntimeRepoPath,
    candidatePipeline: candidate.candidatePipeline || candidate.pipeline || 'candidate',
    profileName: candidate.profileName || candidate.candidateProfile || candidate.profile || 'candidate',
    assetClass: candidate.assetClass || candidate.budget?.assetClass || candidate.budgetClass || '',
    metrics: candidate.metrics || {},
    budgetStatus: candidate.budgetStatus || candidate.budget?.status || 'unknown',
    budget: candidate.budget || null,
  };
}

function normalizeResultCandidate(result, report, reportPath) {
  const candidate = result.candidate || {};
  const source = result.source || {};
  const profile = result.profile || {};
  const target = result.target || {};
  const candidateRepoPath = normalizeMaybe(candidate.repoPath || result.candidateRepoPath);
  const targetRuntimeRepoPath = normalizeMaybe(
    target.runtimeRepoPath
      || result.targetRuntimeRepoPath
      || result.runtimeRepoPath
      || source.targetRuntimeRepoPath
      || source.repoPath
  );
  if (!candidateRepoPath || !targetRuntimeRepoPath) return null;

  const pipeline = result.candidatePipeline
    || report.candidatePipeline
    || (report.run?.kind === 'blender-decimation' ? 'blender-decimate' : 'gltf-transform');
  const budget = candidate.budget || result.budget || null;

  return {
    reportPath,
    candidateRepoPath,
    candidateHash: candidate.outputHash || result.candidateHash || '',
    sourceRepoPath: normalizeMaybe(source.repoPath || result.sourceRepoPath),
    sourceHash: source.sourceHash || result.sourceHash || '',
    targetRuntimeRepoPath,
    candidatePipeline: pipeline,
    profileName: profile.name || result.profileName || 'candidate',
    assetClass: source.classification?.assetClass || result.assetClass || budget?.assetClass || '',
    metrics: candidate.metrics || result.metrics || {},
    budgetStatus: budget?.status || result.budgetStatus || 'unknown',
    budget,
  };
}

function normalizeMaybe(value) {
  return value ? normalizeRepoPath(String(value)) : '';
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
