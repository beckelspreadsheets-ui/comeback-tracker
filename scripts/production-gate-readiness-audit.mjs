import { execFileSync } from 'node:child_process';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const shouldCleanArtifacts = !process.env.PRODUCTION_GATE_AUDIT_ARTIFACT_DIR;
const artifactsDir = process.env.PRODUCTION_GATE_AUDIT_ARTIFACT_DIR
  ? path.resolve(root, process.env.PRODUCTION_GATE_AUDIT_ARTIFACT_DIR)
  : path.join(root, 'tmp', 'production-gate-readiness');

const docs = {
  checklist: 'docs/race-v1-definition-of-done-checklist.md',
  manualQa: 'docs/race-manual-qa-rubric.md',
  ownerPacket: 'docs/race-owner-review-packet.md',
  plan: 'docs/comeback-city-kart-racer-production-readiness-plan.md',
  runbook: 'docs/race-release-operations-runbook.md',
  visualBrief: 'docs/race-visual-target-brief.md',
};

const latestEvidence = {
  accessibility:
    '.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/accessibility-smoke-summary.json',
  apiData: '.agent/runs/kart-racer-production-readiness/evidence/api-data-url-smoke-001-20260524T095257Z/',
  ciReleaseAutomation:
    '.agent/runs/kart-racer-production-readiness/evidence/ci-release-automation-001-20260524T124743Z/ci-release-automation-summary.json',
  coreTracker: '.agent/runs/kart-racer-production-readiness/evidence/core-tracker-001-20260523T204431Z/',
  crossBrowser:
    '.agent/runs/kart-racer-production-readiness/evidence/cross-browser-001-20260524T121434Z/cross-browser-smoke-summary.json',
  cspHeaders: '.agent/runs/kart-racer-production-readiness/evidence/csp-headers-001-20260523T233058Z/',
  deployedHeaders:
    '.agent/runs/kart-racer-production-readiness/evidence/deployed-headers-001-20260524T123726Z/deployed-headers-smoke-summary.json',
  deviceMatrix:
    '.agent/runs/kart-racer-production-readiness/evidence/device-matrix-001-20260524T122649Z/device-matrix-smoke-summary.json',
  lazyRoute: '.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/',
  labReadiness:
    '.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-004-20260601T191542Z/lab-readiness-smoke-summary.json',
  lifecycleAudio: '.agent/runs/kart-racer-production-readiness/evidence/lifecycle-audio-001-20260523T210212Z/',
  monitoringSupport:
    '.agent/runs/kart-racer-production-readiness/evidence/monitoring-support-001-20260524T025102Z/',
  perfKept:
    '.agent/runs/kart-racer-production-readiness/evidence/perf-023-20260524T072318Z/perf-023-kept-far-range-summary.json',
  currentRaceBrowser: 'tmp/race-playtests/race-browser-playtest-summary.json',
  previewDeploy:
    '.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/preview-deploy-summary.md',
  previewDeployedHeaders:
    '.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/deployed-headers-smoke-summary-preview.json',
  previewReleaseSmoke:
    '.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/release-smoke-summary-preview-after-console-policy-fix.json',
  previewWebglContext:
    '.agent/runs/kart-racer-production-readiness/evidence/preview-deploy-001-20260603T163200Z/webgl-context-preview/webgl-context-smoke-summary.json',
  pwaUpdate: '.agent/runs/kart-racer-production-readiness/evidence/pwa-update-001-20260523T234355Z/',
  raceDisable: '.agent/runs/kart-racer-production-readiness/evidence/race-disable-001-20260523T200640Z/',
  rcChecklist:
    '.agent/runs/kart-racer-production-readiness/evidence/rc-local-checklist-001-20260524T013026Z/',
  releaseArtifactPolicy:
    '.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-005-20260601T201921Z/release-artifact-safety-report.json',
  releaseTelemetryHardening:
    '.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/validation-summary.json',
  releaseDecision:
    '.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-010-20260603T150000Z/release-decision-readiness-summary.json',
  releaseHooks: '.agent/runs/kart-racer-production-readiness/evidence/release-hooks-001-20260524T002219Z/',
  releaseNotes: 'docs/race-release-notes-draft-2026-05-23.md',
  rollback:
    '.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/release-rollback-smoke-summary.json',
  securityProd:
    '.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-005-20260601T201921Z/security-production-audit-summary.json',
  bundleBudget:
    '.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-005-20260601T201921Z/bundle-asset-budget-report.json',
  webglContext:
    '.agent/runs/kart-racer-production-readiness/evidence/release-telemetry-hardening-001-20260524T111734Z/webgl-context-smoke-summary.json',
  visualReference:
    '.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-005-20260601T201921Z/npm-run-test-visual.log',
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

const extractTableRows = (source, firstHeaderCell) => {
  const lines = source.split('\n');
  const headerIndex = lines.findIndex((line) => {
    if (!line.trim().startsWith('|')) return false;
    const cells = parseMarkdownRow(line);
    return normalize(cells[0] || '') === normalize(firstHeaderCell);
  });
  if (headerIndex === -1) return [];

  const rows = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim().startsWith('|')) break;
    rows.push({ cells: parseMarkdownRow(line), line: index + 1 });
  }
  return rows;
};

const extractNotSuppliedRows = (relativePath, source) =>
  source
    .split('\n')
    .map((line, index) => ({ index: index + 1, line }))
    .filter(({ line }) => line.trim().startsWith('|'))
    .map(({ index, line }) => ({
      cells: parseMarkdownRow(line),
      line: index,
      path: relativePath,
      raw: line.trim(),
    }))
    .filter(({ cells }) => cells.some((cell) => cell === 'Not supplied'));

const pathExists = async (relativePath) => {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
};

const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));

const withEvidence = async (paths) =>
  Promise.all(
    paths.map(async (relativePath) => ({
      exists: await pathExists(relativePath),
      path: relativePath,
    }))
  );

const gate = async ({ acceptance, evidence = [], id, level, notes, status }) => ({
  acceptance,
  evidence: await withEvidence(evidence),
  id,
  level,
  notes,
  status,
});

const summarizeStatuses = (gates) => {
  const byStatus = {};
  for (const item of gates) byStatus[item.status] = (byStatus[item.status] || 0) + 1;
  return {
    byStatus,
    proven: gates.filter((item) => item.status === 'Proven').length,
    total: gates.length,
  };
};

const averageFinite = (values) => {
  const finiteValues = values.filter(Number.isFinite);
  if (!finiteValues.length) return null;
  return Number((finiteValues.reduce((total, value) => total + value, 0) / finiteValues.length).toFixed(2));
};

const summarizeCurrentRacePerformance = async () => {
  if (!(await pathExists(latestEvidence.currentRaceBrowser))) return null;
  const summary = await readJson(latestEvidence.currentRaceBrowser);
  const visualChecks = Array.isArray(summary.visualChecks) ? summary.visualChecks : [];
  const desktopChecks = visualChecks.filter((check) => (check.viewport?.width || 0) >= 1000);
  const focusedDesktopChecks = desktopChecks.filter((check) =>
    [
      'acceleration',
      'braking',
      'boost-pad-mechanics',
      'drift',
      'drift-mechanics',
      'drift-release',
      'driving',
      'finish-line',
      'item-box-mechanics',
      'item-pickup',
      'rival-cluster',
      'steering-high-speed',
      'steering-low-speed',
      'turn-approach',
    ].includes(check.scenario)
  );
  return {
    capturedAt: summary.capturedAt || null,
    desktopAllAverageActualFps: averageFinite(desktopChecks.map((check) => check.summary?.actualFps)),
    desktopFocusedAverageActualFps: averageFinite(focusedDesktopChecks.map((check) => check.summary?.actualFps)),
    raceCount: summary.raceCount ?? null,
    sustainedAverageActualFps: summary.sustainedNormalPlay?.summary?.actualFps?.average ?? null,
    sustainedDeliveredFps: summary.sustainedNormalPlay?.summary?.deliveredFps ?? null,
    visualCheckCount: summary.visualCheckCount ?? null,
  };
};

const run = async () => {
  if (shouldCleanArtifacts) await rm(artifactsDir, { force: true, recursive: true });
  await mkdir(artifactsDir, { recursive: true });

  const sources = Object.fromEntries(
    await Promise.all(Object.entries(docs).map(async ([key, relativePath]) => [key, await readFile(path.join(root, relativePath), 'utf8')]))
  );
  const notSuppliedRows = Object.entries(sources).flatMap(([key, source]) =>
    extractNotSuppliedRows(docs[key], source)
  );

  const dodRows = extractTableRows(sources.checklist, 'PRD DoD item').map(({ cells, line }) => ({
    item: cells[0],
    line,
    proofNeeded: cells[3],
    status: cells[2],
  }));
  const nonProvenDodRows = dodRows.filter((row) => !normalize(row.status).startsWith('proven'));
  const qaRows = extractTableRows(sources.manualQa, 'Category').map(({ cells, line }) => ({
    category: cells[0],
    line,
    requiredCheck: cells[2],
    score: cells[1],
  }));
  const qaFailures = qaRows.filter((row) => !/^[4-5]$/.test(row.score));
  const perfSummary = await readJson(latestEvidence.perfKept);
  const currentRacePerformance = await summarizeCurrentRacePerformance();
  const perf = {
    currentCapturedAt: currentRacePerformance?.capturedAt ?? null,
    desktopAllAverageActualFps:
      currentRacePerformance?.desktopAllAverageActualFps ?? perfSummary.averageCandidate?.desktopAllAverageActualFps ?? null,
    desktopFocusedAverageActualFps:
      currentRacePerformance?.desktopFocusedAverageActualFps ??
      perfSummary.averageCandidate?.desktopFocusedAverageActualFps ??
      null,
    localFloorFps: 45,
    prdTargetFps: 55,
    sustainedAverageActualFps:
      currentRacePerformance?.sustainedAverageActualFps ?? perfSummary.averageCandidate?.sustainedAverageActualFps ?? null,
    sustainedDeliveredFps: currentRacePerformance?.sustainedDeliveredFps ?? null,
  };
  const performanceMeetsLocalFloor =
    (perf.desktopFocusedAverageActualFps || 0) >= perf.localFloorFps &&
    (perf.sustainedAverageActualFps || 0) >= perf.localFloorFps;
  const missingPlanGateLabels = [
    'Owner target locked',
    'V1 DoD proven',
    'Desktop performance',
    'Cross-browser matrix',
    'Source map/debug policy',
    'Post-launch review',
  ].filter((label) => !normalize(sources.plan).includes(normalize(label)));

  const p0 = [
    await gate({
      acceptance: 'Approved visual target and owner decisions are filled in the visual target brief.',
      evidence: [docs.visualBrief, docs.ownerPacket, latestEvidence.releaseDecision, latestEvidence.visualReference],
      id: 'owner-target-locked',
      level: 'P0',
      notes:
        'Owner-supplied ChatGPT Image Gen 2 reference is present at src/assets/game/reference/comeback-city-original-reference.png, composition notes are recorded, and npm run test:visual passes with the repo-local reference.',
      status: 'Proven',
    }),
    await gate({
      acceptance: 'Every DoD traceability row is Proven.',
      evidence: [docs.checklist],
      id: 'v1-dod-proven',
      level: 'P0',
      notes: `${nonProvenDodRows.length} DoD rows are not Proven-like. Exact row status values are preserved in dodStatus.`,
      status: nonProvenDodRows.length ? 'Blocked - DoD rows not Proven' : 'Proven',
    }),
    await gate({
      acceptance: 'Agreed desktop target is met in sustained and focused race evidence.',
      evidence: [latestEvidence.currentRaceBrowser, latestEvidence.perfKept],
      id: 'desktop-performance',
      level: 'P0',
      notes: currentRacePerformance
        ? `Current race-browser evidence from ${perf.currentCapturedAt} reports ${perf.desktopFocusedAverageActualFps} focused desktop actual FPS and ${perf.sustainedAverageActualFps} sustained actual FPS (${perf.sustainedDeliveredFps} delivered), below local ${perf.localFloorFps} and PRD ${perf.prdTargetFps} targets. Older kept perf evidence remains linked for history.`
        : `Latest kept evidence reports ${perf.desktopFocusedAverageActualFps} focused desktop actual FPS and ${perf.sustainedAverageActualFps} sustained actual FPS, below local ${perf.localFloorFps} and PRD ${perf.prdTargetFps} targets.`,
      status: performanceMeetsLocalFloor ? 'Proven' : 'Failing - below performance target',
    }),
    await gate({
      acceptance: 'Manual touch playthrough passes on agreed mobile target.',
      evidence: [docs.manualQa, latestEvidence.accessibility],
      id: 'mobile-playability',
      level: 'P0',
      notes: 'Local touch acceleration is proven, but a human mobile touch playthrough has not been run.',
      status: 'Missing - manual QA required',
    }),
    await gate({
      acceptance: 'Every rubric category scores 4+.',
      evidence: [docs.manualQa],
      id: 'manual-qa',
      level: 'P0',
      notes: `${qaFailures.length} rubric rows do not have a numeric score of 4 or 5.`,
      status: qaFailures.length ? 'Missing - manual QA required' : 'Proven',
    }),
    await gate({
      acceptance: 'Fresh user describes the 10 second clip as a race or kart race.',
      evidence: [docs.manualQa],
      id: 'fresh-user-read',
      level: 'P0',
      notes: 'No fresh-user reviewer, clip, answer, or dated result is recorded.',
      status: 'Missing - fresh-user result required',
    }),
    await gate({
      acceptance: 'Assets, names, audio, and references are approved or removed.',
      evidence: ['docs/race-ip-provenance-audit.md', latestEvidence.releaseDecision],
      id: 'ip-provenance',
      level: 'P0',
      notes:
        'Current bitmap asset source/provenance is owner-confirmed as ChatGPT Image Gen output; reference-derived plaza scope and protected-similarity review for current screenshots/captures are owner-approved. Repeat inventory and similarity review is required if new generated assets, UI, item silhouettes, tracks, or audio are added.',
      status: 'Proven',
    }),
    await gate({
      acceptance: 'First 30 seconds, camera, track, density, HUD, and feedback are signed off.',
      evidence: ['docs/race-first-30-seconds-vertical-slice-plan.md', docs.visualBrief, latestEvidence.releaseDecision],
      id: 'product-design',
      level: 'P0',
      notes: 'Local screenshots/telemetry exist, but approved visual target and design sign-off are not supplied.',
      status: 'Blocked - owner input required',
    }),
    await gate({
      acceptance: 'Build, race, browser, hub, and visual commands pass.',
      evidence: [latestEvidence.rcChecklist],
      id: 'build-and-tests',
      level: 'P0',
      notes: 'Latest local RC checklist records passing commands, but it is not deploy approval.',
      status: 'Proven',
    }),
    await gate({
      acceptance: 'Core tracker smoke passes after race changes.',
      evidence: [latestEvidence.coreTracker],
      id: 'core-tracker-regression',
      level: 'P0',
      notes: 'Local core tracker smoke is recorded.',
      status: 'Proven',
    }),
    await gate({
      acceptance: 'Local/cloud migration, backup/restore, conflict handling, and rollback compatibility are proven or scoped out.',
      evidence: [latestEvidence.apiData],
      id: 'data-safety',
      level: 'P0',
      notes:
        'Local same-schema D1 backup restore is proven, and Cloudflare sync/D1 production scope is explicitly scoped out of immediate kart-racer readiness with owner/admin follow-up dated 2026-06-08.',
      status: 'Proven',
    }),
    await gate({
      acceptance: 'In-scope Functions, D1, Access JWT, backup endpoints, FatSecret, and external API states pass production-like smoke.',
      evidence: [latestEvidence.apiData],
      id: 'functions-api-safety',
      level: 'P0',
      notes:
        'Local mocked smoke exists, and Cloudflare Functions, D1 sync, FatSecret proxy, barcode, and camera are explicitly scoped out of immediate kart-racer readiness with owner/admin follow-up dated 2026-06-08.',
      status: 'Proven',
    }),
    await gate({
      acceptance: 'CSP, cache headers, Permissions-Policy, and camera/autoplay requirements match production scope.',
      evidence: [latestEvidence.cspHeaders, latestEvidence.previewDeployedHeaders],
      id: 'header-permission-safety',
      level: 'P0',
      notes:
        'Local built-app header smoke and preview deployed headers are proven, barcode/camera are scoped out until the 2026-06-08 follow-up, and production deployed headers remain pending.',
      status: 'Partial - production scope/evidence required',
    }),
    await gate({
      acceptance: 'Cloudflare project/domain/branch policy is confirmed.',
      evidence: [docs.runbook, latestEvidence.releaseDecision, latestEvidence.previewDeploy],
      id: 'production-target',
      level: 'P0',
      notes:
        'Target is selected as Cloudflare Pages project showcase-designs-preview with preview branch comebacktrackerkartgame. Preview URL, deployment URL, deployment ID, and source commit are proven; same-build production smoke/native rollback proof still uses the Pages production deployment.',
      status: 'Proven',
    }),
    await gate({
      acceptance: 'Preview deployment passes race and app smoke checks.',
      evidence: [
        docs.runbook,
        latestEvidence.previewDeploy,
        latestEvidence.previewReleaseSmoke,
        latestEvidence.previewDeployedHeaders,
        latestEvidence.previewWebglContext,
      ],
      id: 'preview-smoke',
      level: 'P0',
      notes:
        'Preview deployment, release smoke, deployed headers, core tracker navigation, desktop/mobile race smoke, and WebGL context-loss fallback are proven for https://comebacktrackerkartgame.showcase-designs-preview.pages.dev.',
      status: 'Proven',
    }),
    await gate({
      acceptance: 'Production deployment passes race and app smoke checks.',
      evidence: [docs.runbook],
      id: 'production-smoke',
      level: 'P0',
      notes:
        'Production smoke uses the selected Pages project production deployment URL from Wrangler/Cloudflare output; actual deployed URL, deployment ID, commit SHA, and smoke results are not supplied.',
      status: 'Missing - deployed evidence required',
    }),
    await gate({
      acceptance: 'Rollback target and steps are proven or rehearsed on a safe production deployment.',
      evidence: [latestEvidence.rollback],
      id: 'rollback-drill',
      level: 'P0',
      notes:
        'Local rollback drill is proven, native Cloudflare Pages production rollback is selected because preview deployments are not rollback targets, and two safe production deployments are approved for proof; production deployment IDs and post-rollback smoke are missing.',
      status: 'Partial - production scope/evidence required',
    }),
    await gate({
      acceptance: 'Release owner can bypass, hide, disable, or roll back /#race quickly.',
      evidence: [latestEvidence.raceDisable, 'docs/race-disable-recovery-runbook.md'],
      id: 'race-disable-recovery-control',
      level: 'P0',
      notes:
        'Local technical flag is proven and owner/admin-only activation policy is supplied; exact Cloudflare project/deployment and deployed smoke remain pending.',
      status: 'Partial - production scope/evidence required',
    }),
    await gate({
      acceptance: 'Security headers, dependency audit, artifact safety, data handling, and telemetry privacy are reviewed.',
      evidence: [
        latestEvidence.cspHeaders,
        latestEvidence.releaseArtifactPolicy,
        latestEvidence.releaseTelemetryHardening,
        latestEvidence.securityProd,
      ],
      id: 'security-privacy',
      level: 'P0',
      notes:
        'Production and full dependency audits pass after Vite/PWA build-tool upgrade, and standard production artifact safety is locally proven with no shipped diagnostic telemetry globals; data-handling privacy posture, deployed-header/security validation, and production sign-off remain missing.',
      status: 'Partial - owner policy required',
    }),
    await gate({
      acceptance: 'Reduced motion, mute, keyboard, touch, focus, and contrast gates pass.',
      evidence: [latestEvidence.accessibility],
      id: 'accessibility',
      level: 'P0',
      notes: 'Local accessibility smoke passes; manual target-browser/device sign-off is missing.',
      status: 'Partial - manual sign-off required',
    }),
    await gate({
      acceptance: 'Error, performance, race metric, and incident path is active or accepted as unsupported risk.',
      evidence: [latestEvidence.monitoringSupport, docs.runbook],
      id: 'monitoring-support',
      level: 'P0',
      notes:
        'Cloudflare-native monitoring, Web Analytics enablement-if-needed policy, owner dashboard/access fallback, and owner/admin-only V1 support path are selected, and local runbook structure is proven; deployed signals and release-owner sign-off remain missing.',
      status: 'Partial - owner policy required',
    }),
  ];

  const crossBrowserEvidenceExists = await pathExists(latestEvidence.crossBrowser);
  const ciReleaseAutomationEvidenceExists = await pathExists(latestEvidence.ciReleaseAutomation);
  const deployedHeadersEvidenceExists = await pathExists(latestEvidence.deployedHeaders);
  const deviceMatrixEvidenceExists = await pathExists(latestEvidence.deviceMatrix);
  const p1 = [
    await gate({
      acceptance: 'Chrome, Safari, Firefox, and Edge behavior is checked.',
      evidence: [docs.runbook, latestEvidence.crossBrowser],
      id: 'cross-browser-matrix',
      level: 'P1',
      notes: crossBrowserEvidenceExists
        ? 'Local Chrome/Chromium/Firefox/WebKit smoke is recorded; actual Safari, Edge when unavailable, target-device coverage, and release-owner sign-off are still missing.'
        : 'No target-browser matrix result or exception is recorded.',
      status: crossBrowserEvidenceExists
        ? 'Partial - target-browser evidence or exception required'
        : 'Missing - manual evidence or exception required',
    }),
    await gate({
      acceptance: 'At least one ordinary laptop and one modern phone pass agreed smoke/manual path.',
      evidence: [docs.manualQa, latestEvidence.deviceMatrix],
      id: 'device-matrix',
      level: 'P1',
      notes: deviceMatrixEvidenceExists
        ? 'Local desktop viewport and emulated-phone smoke are recorded, and owner first-pass hardware is Mac mini M4 with Brave plus iPhone 16 Pro with Safari; physical-device human playthrough evidence and release-owner sign-off are still missing.'
        : 'No laptop/phone manual matrix result or exception is recorded.',
      status: deviceMatrixEvidenceExists
        ? 'Partial - physical device evidence or exception required'
        : 'Missing - manual evidence or exception required',
    }),
    await gate({
      acceptance: 'Existing installed app updates cleanly without stale asset breakage.',
      evidence: [latestEvidence.pwaUpdate],
      id: 'pwa-update',
      level: 'P1',
      notes: 'Local installed-app update smoke is proven; production URL and target-device update evidence are missing.',
      status: 'Partial - production evidence or exception required',
    }),
    await gate({
      acceptance: 'Context loss/fallback behavior is tested.',
      evidence: [latestEvidence.webglContext, latestEvidence.previewWebglContext],
      id: 'webgl-context-loss',
      level: 'P1',
      notes: 'Local built-preview and deployed preview context-loss proof exist; target-browser/device evidence is missing.',
      status: 'Partial - target-browser evidence or exception required',
    }),
    await gate({
      acceptance: 'Background tab, visibilitychange, pagehide/pageshow, and bfcache return preserve route behavior.',
      evidence: [latestEvidence.lifecycleAudio],
      id: 'page-lifecycle',
      level: 'P1',
      notes: 'Local lifecycle smoke is proven; target-browser/device bfcache evidence is missing.',
      status: 'Partial - target-browser evidence or exception required',
    }),
    await gate({
      acceptance: 'Race audio starts after user intent, mute remains available, and blocked autoplay does not break gameplay.',
      evidence: [latestEvidence.lifecycleAudio],
      id: 'web-audio-autoplay',
      level: 'P1',
      notes: 'Local blocked-resume and mute behavior are proven.',
      status: 'Proven',
    }),
    await gate({
      acceptance: 'Lighthouse/equivalent records performance, accessibility, best practices, and PWA signals.',
      evidence: [latestEvidence.labReadiness],
      id: 'lighthouse-web-vitals',
      level: 'P1',
      notes:
        'Owner-delegated conservative local lab baseline is recorded and passes; deployed preview/prod Web Vitals evidence remains covered by deployment smoke gates.',
      status: 'Proven',
    }),
    await gate({
      acceptance: '_headers policy is verified in deployed response headers.',
      evidence: [docs.runbook, latestEvidence.deployedHeaders, latestEvidence.previewDeployedHeaders],
      id: 'production-cache-headers',
      level: 'P1',
      notes: deployedHeadersEvidenceExists
        ? 'Local Cloudflare-style header simulation and preview URL deployed response evidence are recorded; production URL deployed response evidence is still missing.'
        : 'Deployed response-header evidence is not supplied.',
      status: deployedHeadersEvidenceExists
        ? 'Partial - deployed evidence required'
        : 'Missing - deployed evidence required',
    }),
    await gate({
      acceptance: 'Asset and JS bundle sizes are recorded and accepted.',
      evidence: [latestEvidence.bundleBudget],
      id: 'bundle-asset-budget',
      level: 'P1',
      notes:
        'Owner-delegated kart-racer V1 bundle budget is recorded and current build passes all budget checks.',
      status: 'Proven',
    }),
    await gate({
      acceptance: 'Release gates run in CI or owner-approved manual checklist records equivalent evidence.',
      evidence: [docs.runbook, latestEvidence.ciReleaseAutomation, '.github/workflows/race-production-gates.yml'],
      id: 'ci-release-automation',
      level: 'P1',
      notes: ciReleaseAutomationEvidenceExists
        ? 'GitHub Actions workflow structure and local audit are recorded, release branch switch is recorded, and owner accepted a local manual release checklist if GitHub Actions is unavailable; actual CI run URL or clean-branch manual checklist execution signed by isethius remains missing.'
        : 'CI/manual release-gate acceptance is Not supplied.',
      status: ciReleaseAutomationEvidenceExists
        ? 'Partial - CI run or owner acceptance required'
        : 'Blocked - owner input required',
    }),
    await gate({
      acceptance: 'Standard production artifact has no source maps, debug/playtest files, runtime test hooks, diagnostic telemetry globals, or visual-review route strings, and production query hooks remain disabled.',
      evidence: [latestEvidence.releaseArtifactPolicy, latestEvidence.releaseTelemetryHardening],
      id: 'source-map-debug-policy',
      level: 'P1',
      notes: 'Latest local artifact report records diagnostic telemetry, runtime playtest automation, and visual-review route strings as not detected; release smoke proves the playtest query creates no globals and no query-driven movement.',
      status: 'Proven',
    }),
    await gate({
      acceptance: 'User-facing and operator-facing release notes exist and are approved.',
      evidence: [latestEvidence.releaseNotes],
      id: 'release-notes',
      level: 'P1',
      notes: 'Draft release notes exist; release-owner/product/legal approval is missing.',
      status: 'Partial - owner approval required',
    }),
    await gate({
      acceptance: 'Known issues, recovery steps, and triage paths exist.',
      evidence: [docs.runbook, latestEvidence.monitoringSupport],
      id: 'support-runbook',
      level: 'P1',
      notes:
        'Runbook structure, owner/admin-only V1 support path through isethius, Cloudflare-native monitoring posture, Web Analytics enablement-if-needed policy, owner dashboard/access fallback, and recovery triage path are recorded.',
      status: 'Proven',
    }),
    await gate({
      acceptance: 'Monitoring window and report template exist, then completed launch report is recorded.',
      evidence: ['docs/race-post-launch-report-template.md'],
      id: 'post-launch-review',
      level: 'P1',
      notes: 'Template exists and a 24-hour post-launch monitoring window is selected; completed launch report is missing.',
      status: 'Partial - production evidence or exception required',
    }),
  ];

  const evidenceLinkFailures = [...p0, ...p1]
    .flatMap((item) => item.evidence.map((entry) => ({ ...entry, gate: item.id })))
    .filter((entry) => !entry.exists);
  const p0Summary = summarizeStatuses(p0);
  const p1Summary = summarizeStatuses(p1);

  const summary = {
    artifactsDir,
    capturedAt: new Date().toISOString(),
    dodStatus: {
      nonProvenRows: nonProvenDodRows,
      nonProvenRowCount: nonProvenDodRows.length,
      rowCount: dodRows.length,
    },
    evidenceLinkFailures,
    gateStatus: evidenceLinkFailures.length
      ? 'audit-failed-missing-local-evidence-link'
      : p0Summary.proven === p0Summary.total && p1.every((item) => item.status === 'Proven' || item.status.includes('exception'))
        ? 'r3-production-ready-claims-require-human-review'
        : 'r3-blocked-gates-remain',
    git: getGitMetadata(),
    latestPerformance: perf,
    manualQaStatus: {
      failingRows: qaFailures,
      failingRowCount: qaFailures.length,
      rowCount: qaRows.length,
    },
    missingPlanGateLabels,
    note:
      'This audit records P0/P1 hard-gate status from repo-visible evidence only. It does not infer owner, legal, release, QA, deployment, or production monitoring decisions.',
    notSuppliedRows,
    notSuppliedRowsByFile: Object.fromEntries(
      Object.entries(docs).map(([key, relativePath]) => [
        relativePath,
        notSuppliedRows.filter((row) => row.path === docs[key]).length,
      ])
    ),
    p0,
    p0Summary,
    p1,
    p1Summary,
    requiredOwnerQuestions: [
      'Provide manual QA scores, mobile/desktop playthrough evidence, owner clip/fresh-user result, and target-browser/device accessibility sign-off.',
      'Provide production URL/deployment IDs, smoke results, deployed headers, Cloudflare rollback evidence, monitoring/version signal, and final sign-offs.',
      'Provide actual CI run URL or owner-accepted manual release checklist execution from the clean release branch/worktree.',
      'If any new ChatGPT Image Gen assets, UI, item silhouettes, tracks, or audio are added, repeat inventory, source scan, and protected-similarity review before release.',
    ],
  };

  const summaryPath = path.join(artifactsDir, 'production-gate-readiness-summary.json');
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));

  if (evidenceLinkFailures.length || missingPlanGateLabels.length) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
