import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { execSync } from 'node:child_process';

const repoRoot = process.cwd();
// K1: BUNDLE_BUDGET_MODE=kart audits the kart-only build (dist-kart, its own
// thresholds, its own artifact dir so the fitness JSON is never clobbered).
// Default stays the fitness build, byte-for-byte the pre-K1 behavior.
const budgetMode = process.env.BUNDLE_BUDGET_MODE === 'kart' ? 'kart' : 'fitness';
const distDir =
  process.env.BUNDLE_BUDGET_DIST_DIR || join(repoRoot, budgetMode === 'kart' ? 'dist-kart' : 'dist');
const artifactDir =
  process.env.BUNDLE_BUDGET_ARTIFACT_DIR ||
  join(repoRoot, 'tmp', budgetMode === 'kart' ? 'bundle-budget-kart' : 'bundle-budget');
// Fitness: re-baselined 2026-07-02 (A4, graphics V2 PRD) against the honest
// post-fix build: QA proof PNGs no longer ship (comebackCityVisualTokens
// split), the dead 2D ComebackCityKartRace import is gone, meshopt avatar
// re-promotions landed, and public/baked-*.glb count as shipped content.
// Measured: total 12.30 MiB / 7263 KiB gzip, images 1.86 MiB, JS 4.79 MiB
// (1199 KiB gzip), largest file 2.75 MiB (the shared three.js world chunk).
// Supersedes the 2026-06-01 delegated 8.5 MiB baseline, which predates the 3D
// kart content (GLBs alone are 5.5 MiB). Threshold minus measured = the
// published Phase C headroom — see the report's headroom block.
const fitnessThresholdDefaults = {
  imageTotalMiB: 4.0,
  javascriptTotalGzipKiB: 1400,
  javascriptTotalMiB: 5.25,
  largestFileMiB: 3.0,
  largestJavaScriptGzipKiB: 900,
  totalGzipKiB: 8500,
  totalMiB: 15.0,
};
// Kart: set at K1 exit from the first dist-kart measurement (2026-07-11,
// PENDING owner ack — PRD §5). Measured at the split: total 8.781 MiB /
// 6722.8 KiB gzip, JS 1.098 MiB (338.85 KiB gzip, largest chunk 280.79),
// images 1.352 MiB, largest file 1.507 MiB (baked-spike.glb). JS thresholds
// are deliberately TIGHT — JS is what blocks first paint, and keeping the
// fitness app out of this build is the whole point of K1. Total thresholds
// leave ~3 MiB raw / ~1.3 MB gzip for the K4-K7 content wave (runtime-fetched
// GLBs/portraits land in dist too); growth beyond that should ride per-asset
// lazy loading + the SW runtime cache, not a threshold raise (V1-beta PRD §1).
const kartThresholdDefaults = {
  imageTotalMiB: 2.5,
  javascriptTotalGzipKiB: 500,
  javascriptTotalMiB: 2.0,
  largestFileMiB: 3.0,
  largestJavaScriptGzipKiB: 400,
  totalGzipKiB: 8000,
  totalMiB: 12.0,
};
const thresholdDefaults = budgetMode === 'kart' ? kartThresholdDefaults : fitnessThresholdDefaults;
const budgetThresholds = {
  imageTotalMiB: Number(process.env.BUNDLE_BUDGET_IMAGE_TOTAL_MIB || thresholdDefaults.imageTotalMiB),
  javascriptTotalGzipKiB: Number(process.env.BUNDLE_BUDGET_JS_GZIP_KIB || thresholdDefaults.javascriptTotalGzipKiB),
  javascriptTotalMiB: Number(process.env.BUNDLE_BUDGET_JS_TOTAL_MIB || thresholdDefaults.javascriptTotalMiB),
  largestFileMiB: Number(process.env.BUNDLE_BUDGET_LARGEST_FILE_MIB || thresholdDefaults.largestFileMiB),
  largestJavaScriptGzipKiB: Number(
    process.env.BUNDLE_BUDGET_LARGEST_JS_GZIP_KIB || thresholdDefaults.largestJavaScriptGzipKiB
  ),
  totalGzipKiB: Number(process.env.BUNDLE_BUDGET_TOTAL_GZIP_KIB || thresholdDefaults.totalGzipKiB),
  totalMiB: Number(process.env.BUNDLE_BUDGET_TOTAL_MIB || thresholdDefaults.totalMiB),
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
    budgetMode,
    capturedAt: new Date().toISOString(),
    budget: {
      checks: budgetChecks,
      failures: budgetFailures,
      note:
        budgetMode === 'kart'
          ? 'Kart-only build (dist-kart, K1 split). Thresholds set from the first kart-only measurement 2026-07-11; owner ack pending (V1-beta PRD §5). First-load budget only — per-asset lazy loading + SW runtime caching carry post-split content growth.'
          : 'Re-baselined 2026-07-02 (graphics V2 PRD task A4) against the honest post-fix build: QA proof PNGs excluded from production, dead 2D-kart import removed, meshopt avatars landed, baked GLBs counted. Supersedes the 2026-06-01 owner-delegated 8.5 MiB baseline, which predates the 3D kart content. Threshold minus measured = the published Phase C headroom (see headroom block).',
      thresholds: budgetThresholds,
    },
    // Phase C consumes this: bake textures ship as WebP (images category), so
    // the images headroom is the Phase C bake budget; WebP draws down the
    // total headroom ~1:1 in gzip terms (it barely compresses further).
    headroom: {
      imagesMiB: Number((budgetThresholds.imageTotalMiB - (categorySummary.images?.sizeMiB || 0)).toFixed(3)),
      totalGzipKiB: Number((budgetThresholds.totalGzipKiB - finalizeBucket(total).gzipKiB).toFixed(2)),
      totalMiB: Number((budgetThresholds.totalMiB - finalizeBucket(total).sizeMiB).toFixed(3)),
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
      budgetMode === 'kart'
        ? 'This records local kart-only (dist-kart) artifact sizes — the budget contract for the comeback-city-kart Pages project since K1. Preview and production release evidence still need deployed smoke and sign-off.'
        : 'This records local built artifact sizes against the 2026-07-02 A4 re-baseline (default VITE_USER_PRESET build is the budget contract until the kart game gets its own Pages project budget). Preview and production release evidence still need deployed smoke and sign-off.',
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
