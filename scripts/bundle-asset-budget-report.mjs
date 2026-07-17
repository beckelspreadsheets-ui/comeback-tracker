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
// Fitness: re-baselined 2026-07-13 at the APP SPLIT (owner: "make it
// completely separate apps for space") — the fitness build no longer ships
// ANY of src/game/ (no world hub, no race routes, no kart GLBs; baked-spike
// moved to public-kart/). Measured post-split: total 1.168 MiB / 343.8 KiB
// gzip, JS 1.08 MiB / 305 KiB gzip. Thresholds set tight with ~40-50%
// headroom so game content can never silently creep back into this bundle —
// a breach here means the split leaked, not that the app "grew". Supersedes
// the 2026-07-02 A4 combined-build baseline (15 MiB / 8500).
const fitnessThresholdDefaults = {
  imageTotalMiB: 0.25,
  javascriptTotalGzipKiB: 450,
  javascriptTotalMiB: 1.6,
  largestFileMiB: 1.0,
  largestJavaScriptGzipKiB: 250,
  totalGzipKiB: 500,
  totalMiB: 1.75,
};
// Kart: set at K1 exit from the first dist-kart measurement (2026-07-11);
// totals REVISED 2026-07-12 at the K4/K5 roster wave (crosser + two owner-
// picked karts ≈ +2 MiB of runtime-fetched GLBs pushed the artifact to
// ~8.75 MB gz vs the K1-era 8000) — still PENDING the owner's single ack,
// PRD §5, now covering these numbers. JS thresholds stay deliberately
// TIGHT and UNCHANGED — JS is what blocks first paint, and keeping the
// fitness app out of this build is the whole point of K1. The GLBs are NOT
// SW-precached (runtime CacheFirst after first use), so total artifact size
// is CDN/disk footprint, not first-paint cost; ~1 MB gz of headroom is left
// for the K6 characters + K7 item props before the next revision.
// TOTALS RAISED 2026-07-17 WITH OWNER ACK ("lets ship it" for the K8 karts
// after being told the raise was the one thing blocking them): 13->16 MiB /
// 9800->12000 KiB gz. This closes the long-pending ack above. JS caps stay
// tight and unchanged — JS blocks first paint; GLB totals are CDN/disk only.
const kartThresholdDefaults = {
  imageTotalMiB: 2.5,
  javascriptTotalGzipKiB: 500,
  javascriptTotalMiB: 2.0,
  largestFileMiB: 3.0,
  largestJavaScriptGzipKiB: 400,
  totalGzipKiB: 12000,
  totalMiB: 16.0,
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
