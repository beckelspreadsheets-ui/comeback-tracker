import { execFileSync } from 'node:child_process';
import { access, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = process.env.RELEASE_ARTIFACT_SAFETY_DIST_DIR
  ? path.resolve(root, process.env.RELEASE_ARTIFACT_SAFETY_DIST_DIR)
  : path.join(root, 'dist');
const shouldCleanArtifacts = !process.env.RELEASE_ARTIFACT_SAFETY_ARTIFACT_DIR;
const artifactsDir = process.env.RELEASE_ARTIFACT_SAFETY_ARTIFACT_DIR
  ? path.resolve(root, process.env.RELEASE_ARTIFACT_SAFETY_ARTIFACT_DIR)
  : path.join(root, 'tmp', 'release-artifact-safety-test');

const textExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.mjs',
  '.svg',
  '.txt',
  '.webmanifest',
  '.xml',
]);

const secretLeakPatterns = [
  { label: 'FatSecret client secret env name', pattern: /FATSECRET_CLIENT_SECRET/g },
  { label: 'Cloudflare Access audience env name', pattern: /CF_ACCESS_AUD/g },
  { label: 'sync user registry env name', pattern: /SYNC_USERS_JSON/g },
  { label: 'known test FatSecret secret value', pattern: /fat-secret-value/g },
  { label: 'Cloudflare API token env name', pattern: /CLOUDFLARE_API_TOKEN/g },
  { label: 'Wrangler API token env name', pattern: /WRANGLER_API_TOKEN/g },
  { label: 'private key marker', pattern: /-----BEGIN PRIVATE KEY-----/g },
];

const runtimePlaytestAutomationPatterns = [
  { label: 'race autoplay query flag', pattern: /raceAutoplay/g },
  { label: 'race no-finish query flag', pattern: /raceNoFinish/g },
  { label: 'race visual scenario query flag', pattern: /raceVisualScenario/g },
  { label: 'race playtest globals', pattern: /\b__racePlaytest(?:Events|Result)?\b/g },
];

const diagnosticTelemetryPatterns = [
  { label: 'race visual telemetry global', pattern: /\b__raceVisualTelemetry\b/g },
  { label: 'race visual telemetry samples global', pattern: /\b__raceVisualTelemetrySamples\b/g },
];

const visualReviewRoutePatterns = [
  { label: 'visual kart route or mode string', pattern: /visual-kart/g },
];

const fail = (message, detail = {}) => {
  const error = new Error(message);
  error.detail = detail;
  throw error;
};

const toRelativePath = (filePath) => path.relative(distDir, filePath).split(path.sep).join('/');

const isTextFile = (filePath) => {
  const basename = path.basename(filePath);
  return textExtensions.has(path.extname(filePath).toLowerCase()) || basename === '_headers' || basename === '_redirects';
};

const countMatches = (source, pattern) => {
  const matches = source.match(pattern);
  return matches ? matches.length : 0;
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

const walkFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
};

const collectPatternMatches = (source, relativePath, patterns) => {
  const matches = [];
  for (const { label, pattern } of patterns) {
    const count = countMatches(source, pattern);
    if (count) {
      matches.push({
        count,
        label,
        path: relativePath,
      });
    }
  }
  return matches;
};

const summarizeMatches = async (files) => {
  const diagnosticTelemetryMatches = [];
  const sourceMappingUrlMatches = [];
  const secretLeakMatches = [];
  const runtimePlaytestAutomationMatches = [];
  const visualReviewRouteMatches = [];

  for (const filePath of files) {
    if (!isTextFile(filePath)) continue;
    const source = await readFile(filePath, 'utf8');
    const relativePath = toRelativePath(filePath);
    const sourceMappingUrlCount = countMatches(source, /sourceMappingURL/g);
    if (sourceMappingUrlCount) {
      sourceMappingUrlMatches.push({
        count: sourceMappingUrlCount,
        path: relativePath,
      });
    }

    secretLeakMatches.push(...collectPatternMatches(source, relativePath, secretLeakPatterns));
    runtimePlaytestAutomationMatches.push(
      ...collectPatternMatches(source, relativePath, runtimePlaytestAutomationPatterns)
    );
    diagnosticTelemetryMatches.push(...collectPatternMatches(source, relativePath, diagnosticTelemetryPatterns));
    visualReviewRouteMatches.push(...collectPatternMatches(source, relativePath, visualReviewRoutePatterns));
  }

  return {
    diagnosticTelemetryMatches,
    runtimePlaytestAutomationMatches,
    secretLeakMatches,
    sourceMappingUrlMatches,
    visualReviewRouteMatches,
  };
};

const run = async () => {
  await access(path.join(distDir, 'index.html')).catch(() => {
    fail('Built app artifact is missing; run npm run build before npm run test:release:artifacts', {
      distDir,
    });
  });

  if (shouldCleanArtifacts) {
    await rm(artifactsDir, { force: true, recursive: true });
  }
  await mkdir(artifactsDir, { recursive: true });

  const files = await walkFiles(distDir);
  if (!files.length) fail('Built app artifact is empty', { distDir });

  const fileSummaries = await Promise.all(
    files.map(async (filePath) => ({
      path: toRelativePath(filePath),
      sizeBytes: (await stat(filePath)).size,
    }))
  );

  const sourceMapFiles = fileSummaries.filter((file) => /\.map$/i.test(file.path));
  const standaloneDebugFiles = fileSummaries.filter((file) =>
    /(^|\/)(race-playtest|playtest|debug|storybook|RacePlaytestHarness)[^/]*\.(?:html|js|css)$/i.test(file.path)
  );
  const {
    diagnosticTelemetryMatches,
    runtimePlaytestAutomationMatches,
    secretLeakMatches,
    sourceMappingUrlMatches,
    visualReviewRouteMatches,
  } = await summarizeMatches(files);
  const policySensitiveRuntimeMatches = [
    ...runtimePlaytestAutomationMatches,
    ...diagnosticTelemetryMatches,
    ...visualReviewRouteMatches,
  ];

  const failures = [];
  if (sourceMapFiles.length) failures.push({ check: 'no source map files', matches: sourceMapFiles });
  if (sourceMappingUrlMatches.length) {
    failures.push({ check: 'no sourceMappingURL references', matches: sourceMappingUrlMatches });
  }
  if (standaloneDebugFiles.length) {
    failures.push({ check: 'no standalone playtest/debug files', matches: standaloneDebugFiles });
  }
  if (secretLeakMatches.length) failures.push({ check: 'no secret names or known secret values in dist', matches: secretLeakMatches });

  const report = {
    artifactDir: artifactsDir,
    capturedAt: new Date().toISOString(),
    distDir,
    fileCount: fileSummaries.length,
    gateStatus: failures.length
      ? 'failed'
      : policySensitiveRuntimeMatches.length
        ? 'technical-artifacts-pass-policy-needed'
        : 'technical-artifacts-pass',
    git: getGitMetadata(),
    note:
      policySensitiveRuntimeMatches.length
        ? 'This proves local built dist artifact safety checks only. Release owner still must decide production source-map/debug/test-hook policy, diagnostic telemetry privacy posture, and whether visual review route strings are acceptable in shipped chunks.'
        : 'This proves local built dist artifact safety checks only. Standard production dist has no scanned source maps, sourceMappingURL references, standalone playtest/debug files, scanned secret-name leaks, runtime playtest automation strings, diagnostic telemetry globals, or visual review route strings.',
    diagnosticTelemetry: {
      matches: diagnosticTelemetryMatches,
      status: diagnosticTelemetryMatches.length ? 'present-needs-privacy-monitoring-policy' : 'not-detected',
    },
    playtestRuntimeHooks: {
      matches: policySensitiveRuntimeMatches,
      status: policySensitiveRuntimeMatches.length ? 'present-needs-release-owner-policy' : 'not-detected',
    },
    runtimePlaytestAutomation: {
      matches: runtimePlaytestAutomationMatches,
      status: runtimePlaytestAutomationMatches.length ? 'present-needs-release-owner-test-hook-policy' : 'not-detected',
    },
    visualReviewRouteStrings: {
      matches: visualReviewRouteMatches,
      status: visualReviewRouteMatches.length ? 'present-needs-release-owner-scope-policy' : 'not-detected',
    },
    checks: {
      noSecretNameOrKnownSecretValueLeaks: secretLeakMatches.length === 0,
      noSourceMapFiles: sourceMapFiles.length === 0,
      noSourceMappingUrlReferences: sourceMappingUrlMatches.length === 0,
      noStandalonePlaytestOrDebugFiles: standaloneDebugFiles.length === 0,
    },
    failures,
    scans: {
      diagnosticTelemetryPatterns: diagnosticTelemetryPatterns.map(({ label }) => label),
      runtimePlaytestAutomationPatterns: runtimePlaytestAutomationPatterns.map(({ label }) => label),
      secretLeakPatterns: secretLeakPatterns.map(({ label }) => label),
      textFileExtensions: Array.from(textExtensions).sort(),
      visualReviewRoutePatterns: visualReviewRoutePatterns.map(({ label }) => label),
    },
    sourceMapFiles,
    sourceMappingUrlMatches,
    standaloneDebugFiles,
  };

  const reportPath = path.join(artifactsDir, 'release-artifact-safety-report.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (failures.length) {
    fail('Release artifact safety checks failed', { failures, reportPath });
  }
};

run().catch((error) => {
  console.error(error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  process.exit(1);
});
