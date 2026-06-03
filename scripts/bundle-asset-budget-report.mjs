import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { execSync } from 'node:child_process';

const repoRoot = process.cwd();
const distDir = process.env.BUNDLE_BUDGET_DIST_DIR || join(repoRoot, 'dist');
const artifactDir = process.env.BUNDLE_BUDGET_ARTIFACT_DIR || join(repoRoot, 'tmp', 'bundle-budget');
const budgetThresholds = {
  imageTotalMiB: Number(process.env.BUNDLE_BUDGET_IMAGE_TOTAL_MIB || 3.25),
  javascriptTotalGzipKiB: Number(process.env.BUNDLE_BUDGET_JS_GZIP_KIB || 1400),
  javascriptTotalMiB: Number(process.env.BUNDLE_BUDGET_JS_TOTAL_MIB || 5.25),
  largestFileMiB: Number(process.env.BUNDLE_BUDGET_LARGEST_FILE_MIB || 3.75),
  largestJavaScriptGzipKiB: Number(process.env.BUNDLE_BUDGET_LARGEST_JS_GZIP_KIB || 900),
  totalGzipKiB: Number(process.env.BUNDLE_BUDGET_TOTAL_GZIP_KIB || 4600),
  totalMiB: Number(process.env.BUNDLE_BUDGET_TOTAL_MIB || 8.5),
};

const fail = (message, detail = {}) => {
  const error = new Error(message);
  error.detail = detail;
  throw error;
};

const byteCount = (value) => Number(value || 0);
const kib = (bytes) => Number((byteCount(bytes) / 1024).toFixed(2));
const mib = (bytes) => Number((byteCount(bytes) / (1024 * 1024)).toFixed(3));

const categoryFor = (filePath) => {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.js' || ext === '.mjs') return 'javascript';
  if (ext === '.css') return 'css';
  if (ext === '.html') return 'html';
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg', '.ico'].includes(ext)) return 'images';
  if (['.woff', '.woff2', '.ttf', '.otf'].includes(ext)) return 'fonts';
  if (['.json', '.webmanifest', '.map'].includes(ext)) return 'metadata';
  if (['.wav', '.mp3', '.ogg', '.m4a'].includes(ext)) return 'audio';
  return 'other';
};

const walkFiles = (root) => {
  const files = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.isFile()) files.push(fullPath);
    }
  };
  visit(root);
  return files;
};

const summarizeFile = (filePath) => {
  const buffer = readFileSync(filePath);
  const sizeBytes = statSync(filePath).size;
  const gzipBytes = gzipSync(buffer, { level: 9 }).length;
  const brotliBytes = brotliCompressSync(buffer).length;
  return {
    brotliBytes,
    brotliKiB: kib(brotliBytes),
    category: categoryFor(filePath),
    gzipBytes,
    gzipKiB: kib(gzipBytes),
    path: relative(distDir, filePath),
    sizeBytes,
    sizeKiB: kib(sizeBytes),
  };
};

const addToBucket = (bucket, file) => {
  bucket.fileCount += 1;
  bucket.sizeBytes += file.sizeBytes;
  bucket.gzipBytes += file.gzipBytes;
  bucket.brotliBytes += file.brotliBytes;
};

const finalizeBucket = (bucket) => ({
  ...bucket,
  brotliKiB: kib(bucket.brotliBytes),
  gzipKiB: kib(bucket.gzipBytes),
  sizeKiB: kib(bucket.sizeBytes),
  sizeMiB: mib(bucket.sizeBytes),
});

const readGitValue = (command) => {
  try {
    return execSync(command, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null;
  } catch {
    return null;
  }
};

const run = async () => {
  if (!existsSync(distDir)) {
    fail('Built app artifact is missing; run npm run build before npm run test:bundle', {
      distDir,
    });
  }

  const files = walkFiles(distDir).map(summarizeFile).sort((a, b) => b.sizeBytes - a.sizeBytes);
  if (!files.length) fail('Built app artifact is empty', { distDir });

  const categories = {};
  const total = {
    brotliBytes: 0,
    fileCount: 0,
    gzipBytes: 0,
    sizeBytes: 0,
  };

  files.forEach((file) => {
    if (!categories[file.category]) {
      categories[file.category] = {
        brotliBytes: 0,
        fileCount: 0,
        gzipBytes: 0,
        sizeBytes: 0,
      };
    }
    addToBucket(categories[file.category], file);
    addToBucket(total, file);
  });

  const categorySummary = Object.fromEntries(
    Object.entries(categories)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, bucket]) => [name, finalizeBucket(bucket)])
  );

  const javascriptFiles = files.filter((file) => file.category === 'javascript');
  const cssFiles = files.filter((file) => file.category === 'css');
  const largestJavaScriptFile = javascriptFiles[0] || null;
  const budgetChecks = [
    {
      actual: finalizeBucket(total).sizeMiB,
      label: 'total built artifact size',
      limit: budgetThresholds.totalMiB,
      unit: 'MiB',
    },
    {
      actual: finalizeBucket(total).gzipKiB,
      label: 'total built artifact gzip size',
      limit: budgetThresholds.totalGzipKiB,
      unit: 'KiB',
    },
    {
      actual: mib(javascriptFiles.reduce((sum, file) => sum + file.sizeBytes, 0)),
      label: 'total JavaScript size',
      limit: budgetThresholds.javascriptTotalMiB,
      unit: 'MiB',
    },
    {
      actual: kib(javascriptFiles.reduce((sum, file) => sum + file.gzipBytes, 0)),
      label: 'total JavaScript gzip size',
      limit: budgetThresholds.javascriptTotalGzipKiB,
      unit: 'KiB',
    },
    {
      actual: categorySummary.images?.sizeMiB || 0,
      label: 'total image size',
      limit: budgetThresholds.imageTotalMiB,
      unit: 'MiB',
    },
    {
      actual: mib(files[0].sizeBytes),
      label: 'largest single file size',
      limit: budgetThresholds.largestFileMiB,
      unit: 'MiB',
    },
    {
      actual: largestJavaScriptFile?.gzipKiB || 0,
      label: 'largest JavaScript gzip size',
      limit: budgetThresholds.largestJavaScriptGzipKiB,
      unit: 'KiB',
    },
  ].map((check) => ({
    ...check,
    status: check.actual <= check.limit ? 'pass' : 'fail',
  }));
  const budgetFailures = budgetChecks.filter((check) => check.status === 'fail');
  const report = {
    artifactDir,
    capturedAt: new Date().toISOString(),
    budget: {
      checks: budgetChecks,
      failures: budgetFailures,
      note:
        'Owner delegated a reasonable kart-racer V1 baseline on 2026-06-01. These thresholds allow current custom bitmap and race scene assets while flagging material growth before release.',
      thresholds: budgetThresholds,
    },
    categories: categorySummary,
    distDir,
    gateStatus: budgetFailures.length ? 'bundle-budget-fail' : 'bundle-budget-pass',
    git: {
      branch: await readGitValue('git rev-parse --abbrev-ref HEAD'),
      commit: await readGitValue('git rev-parse HEAD'),
      dirty: Boolean(await readGitValue('git status --porcelain')),
    },
    largestFiles: files.slice(0, 15),
    note:
      'This records local built artifact sizes against the owner-delegated kart-racer V1 bundle baseline. Preview and production release evidence still need deployed smoke and sign-off.',
    summary: {
      cssFileCount: cssFiles.length,
      cssTotalKiB: kib(cssFiles.reduce((sum, file) => sum + file.sizeBytes, 0)),
      javascriptFileCount: javascriptFiles.length,
      javascriptTotalKiB: kib(javascriptFiles.reduce((sum, file) => sum + file.sizeBytes, 0)),
      largestFile: files[0],
      total: finalizeBucket(total),
    },
  };

  mkdirSync(artifactDir, { recursive: true });
  const reportPath = join(artifactDir, 'bundle-asset-budget-report.json');
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  if (budgetFailures.length) {
    fail('Bundle/asset budget exceeded', { budgetFailures, reportPath });
  }
  console.log(JSON.stringify(report, null, 2));
};

run().catch((error) => {
  console.error(error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  process.exit(1);
});
