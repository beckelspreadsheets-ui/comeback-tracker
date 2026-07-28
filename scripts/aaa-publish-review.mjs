// Publish a wave's approval sheet as a phone-viewable preview link.
//
//   node scripts/aaa-publish-review.mjs --label wave1-r2 --wave 1 --critics tmp/aaa-plan/wave1-critics.json
//
// Downscales both capture sets to phone-sized webp (14 MiB of PNG per set is
// unusable over cellular), builds the self-contained sheet, and deploys it to
// the review Pages project. This is a REVIEW artefact only — it never touches
// the live comeback-city-kart game project.
//
// sharp is not a dependency of this repo, so encoding goes through a Playwright
// canvas (the established pattern here).
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const index = argv.indexOf(`--${name}`);
  return index !== -1 && argv[index + 1] !== undefined ? argv[index + 1] : fallback;
};
const flag = (name) => argv.includes(`--${name}`);

const LABEL = arg('label');
const WAVE = arg('wave', '?');
const BASE = arg('base', 'baseline');
const CRITICS = arg('critics');
const PROJECT = arg('project', 'comeback-kart-review');
const WIDTH = Number(arg('width', 1100));
const QUALITY = Number(arg('quality', 0.82));
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '9f01a1b31a298b112c22c3e00fe70a45';

if (!LABEL) {
  console.error('usage: node scripts/aaa-publish-review.mjs --label <captureLabel> [--wave N] [--critics <json>] [--no-deploy]');
  process.exit(2);
}

const dist = path.join(root, 'tmp', 'aaa-review-dist');
const imgDir = path.join(dist, 'img');
if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
mkdirSync(imgDir, { recursive: true });

const setDir = (label) => path.join(root, 'tmp', 'aaa-visual', label);
for (const label of [LABEL, BASE]) {
  if (!existsSync(setDir(label))) {
    console.error(`capture set "${label}" not found — run aaa-visual-capture.mjs --label ${label} first`);
    process.exit(2);
  }
}

// ---------------------------------------------------------------- transcode
const jobs = [];
for (const label of [BASE, LABEL]) {
  for (const file of readdirSync(setDir(label)).filter((name) => name.endsWith('.png'))) {
    jobs.push({ label, file, out: path.join(imgDir, `${label}__${file.replace(/\.png$/, '.webp')}`) });
  }
}

console.log(`[aaa-publish] transcoding ${jobs.length} frames to ${WIDTH}px webp q${QUALITY}…`);
const browser = await chromium.launch();
const page = await browser.newPage();
let bytesIn = 0;
let bytesOut = 0;
try {
  for (const job of jobs) {
    const source = readFileSync(path.join(setDir(job.label), job.file));
    bytesIn += source.length;
    const dataUrl = `data:image/png;base64,${source.toString('base64')}`;
    const encoded = await page.evaluate(
      async ([url, width, quality]) => {
        const image = new Image();
        image.src = url;
        await image.decode();
        const scale = Math.min(1, width / image.naturalWidth);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        const context = canvas.getContext('2d');
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/webp', quality);
      },
      [dataUrl, WIDTH, QUALITY]
    );
    const buffer = Buffer.from(encoded.split(',')[1], 'base64');
    bytesOut += buffer.length;
    writeFileSync(job.out, buffer);
  }
} finally {
  await browser.close();
}
console.log(
  `[aaa-publish] ${(bytesIn / 1048576).toFixed(1)} MiB PNG → ${(bytesOut / 1048576).toFixed(1)} MiB webp ` +
    `(${((1 - bytesOut / bytesIn) * 100).toFixed(0)}% smaller)`
);

// ---------------------------------------------------------------- build page
const sheetArgs = ['scripts/aaa-approval-sheet.mjs', '--label', LABEL, '--wave', String(WAVE), '--base', BASE, '--dist', dist];
if (CRITICS) sheetArgs.push('--critics', CRITICS);
const sheet = spawnSync('node', sheetArgs, { cwd: root, encoding: 'utf8' });
process.stdout.write(sheet.stdout || '');
if (sheet.status !== 0) {
  console.error(sheet.stderr || 'approval sheet build failed');
  process.exit(1);
}

// Phones: never let the page scroll sideways, and make the pairs stack when the
// viewport is too narrow to show two 1100px frames honestly side by side.
const indexPath = path.join(dist, 'index.html');
writeFileSync(
  indexPath,
  readFileSync(indexPath, 'utf8').replace(
    '</style>',
    `@media (max-width:760px){
  body{padding:18px 14px 60px}
  .pair{grid-template-columns:1fr;gap:8px}
  table,tbody,tr,td,th{display:block;width:auto}
  th{border-radius:7px 7px 0 0}
  td{border-left:none;border-top:1px solid #0d1017}
  h1{font-size:21px}
}
img{max-width:100%}
</style>`
  )
);
writeFileSync(path.join(dist, '_headers'), '/*\n  X-Robots-Tag: noindex\n  Cache-Control: no-store\n');

// ---------------------------------------------------------------- deploy
if (flag('no-deploy')) {
  console.log(`[aaa-publish] --no-deploy: dist ready at ${path.relative(root, dist)}`);
  process.exit(0);
}

console.log(`[aaa-publish] deploying to Pages project "${PROJECT}"…`);
const deploy = spawnSync(
  'npx',
  ['wrangler', 'pages', 'deploy', dist, `--project-name=${PROJECT}`, '--branch=main', '--commit-dirty=true'],
  { cwd: root, encoding: 'utf8', env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID } }
);
process.stdout.write(deploy.stdout || '');
process.stderr.write(deploy.stderr || '');
if (deploy.status !== 0) {
  console.error('[aaa-publish] deploy FAILED');
  process.exit(1);
}
const url = (deploy.stdout || '').match(/https:\/\/[a-z0-9.-]*pages\.dev\S*/i);
console.log(`\n[aaa-publish] review sheet live: ${url ? url[0] : `https://${PROJECT}.pages.dev`}`);
