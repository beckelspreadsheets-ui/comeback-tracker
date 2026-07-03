#!/usr/bin/env node
// Convert a short seamless video loop (e.g. Kling first/last-frame output)
// into a game-ready flipbook sprite sheet per docs/FLIPBOOK_BILLBOARD_SPEC.md:
//   - K frames sampled evenly over one loop period, duplicate last frame dropped
//   - each frame: 240px content centered in a 256px cell with 8px smeared
//     edge gutter (protects mip levels 0-3; runtime UVs inset to the 240 region)
//   - seam QA gate: PSNR(first frame, last frame) of the SOURCE clip must be
//     >= --seam-min dB (default 40) or the clip is rejected as non-looping
//   - WebP via cwebp -sharp_yuv (the local ffmpeg build has no webp encoder)
//
// Usage:
//   node scripts/make-flipbook.mjs --in loop.mp4 --out sheet.webp \
//     [--frames 8|16] [--cell 256] [--quality 90] [--lossless] \
//     [--seam-min 40] [--no-seam-check]

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const readArg = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};
const hasFlag = (flag) => args.includes(flag);

const input = readArg('--in');
const output = readArg('--out');
const frameCount = Number(readArg('--frames', '8'));
const cell = Number(readArg('--cell', '256'));
const quality = Number(readArg('--quality', '90'));
const lossless = hasFlag('--lossless');
const seamMin = Number(readArg('--seam-min', '40'));
const skipSeamCheck = hasFlag('--no-seam-check');

if (!input || !output || !existsSync(input)) {
  console.error('usage: make-flipbook --in <loop.mp4> --out <sheet.webp> [--frames 8|16]');
  process.exit(2);
}
if (![8, 16].includes(frameCount)) {
  console.error(`--frames must be 8 (8x1 strip) or 16 (4x4 grid), got ${frameCount}`);
  process.exit(2);
}

const GUTTER = 8;
const content = cell - GUTTER * 2;
const layout = frameCount === 8 ? { cols: 8, rows: 1 } : { cols: 4, rows: 4 };
const run = (bin, argv) => execFileSync(bin, argv, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

// 1) Probe the real frame count (Kling/Sora deliver varying fps; never hardcode).
const probed = run('ffprobe', [
  '-v', 'error', '-count_frames', '-select_streams', 'v:0',
  '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', input,
]).trim();
const totalFrames = Number(probed);
if (!Number.isFinite(totalFrames) || totalFrames < frameCount + 1) {
  console.error(`clip has ${probed} frames; need at least ${frameCount + 1}`);
  process.exit(1);
}

const work = mkdtempSync(path.join(tmpdir(), 'flipbook-'));
try {
  // 2) Seam QA on the source clip: a true first/last-frame loop scores inf/high.
  if (!skipSeamCheck) {
    const first = path.join(work, 'first.png');
    const last = path.join(work, 'last.png');
    run('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-vf', "select='eq(n\\,0)'", '-frames:v', '1', first]);
    run('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-vf', `select='eq(n\\,${totalFrames - 1})'`, '-fps_mode', 'vfr', '-frames:v', '1', last]);
    // PSNR stats land on stderr even on success — spawnSync captures both.
    const psnr = spawnSync('ffmpeg', ['-i', first, '-i', last, '-filter_complex', 'psnr', '-f', 'null', '-'], { encoding: 'utf8' });
    const match = /average:(inf|[0-9.]+)/.exec(`${psnr.stderr || ''}${psnr.stdout || ''}`);
    const seamDb = match ? (match[1] === 'inf' ? Infinity : Number(match[1])) : NaN;
    if (!(seamDb >= seamMin)) {
      console.error(`SEAM REJECT: PSNR(first,last) = ${match ? match[1] : 'unparsable'} dB (< ${seamMin} dB).`);
      console.error('The clip does not loop cleanly — regenerate it (Kling first/last-frame with the SAME image in both slots), or pass --no-seam-check to force.');
      process.exit(1);
    }
    console.log(`seam check: PSNR(first,last) = ${match[1]} dB — pass (>= ${seamMin})`);
  }

  // 3) Sample K frames evenly over one period, never selecting the duplicate
  //    final frame: indices round(i * (N-1) / K) for i in 0..K-1.
  const indices = Array.from({ length: frameCount }, (_, i) => Math.round((i * (totalFrames - 1)) / frameCount));
  const select = indices.map((n) => `eq(n\\,${n})`).join('+');
  console.log(`sampling frames [${indices.join(', ')}] of ${totalFrames}`);

  // 4) One-pass: select -> pinned-matrix sRGB downscale -> pad -> smear gutter -> tile.
  const sheetPng = path.join(work, 'sheet.png');
  const filters = [
    `select='${select}'`,
    `scale=${content}:${content}:flags=lanczos:in_color_matrix=bt709:in_range=tv`,
    `pad=${cell}:${cell}:${GUTTER}:${GUTTER}`,
    `fillborders=left=${GUTTER}:right=${GUTTER}:top=${GUTTER}:bottom=${GUTTER}:mode=smear`,
    `tile=${layout.cols}x${layout.rows}`,
  ].join(',');
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-vf', filters, '-fps_mode', 'vfr', '-frames:v', '1', sheetPng]);

  // 5) Encode. -sharp_yuv stops chroma smear on saturated neon edges; use
  //    --lossless for sheets carrying small readable text.
  const cwebpArgs = lossless
    ? ['-quiet', '-lossless', '-z', '9', sheetPng, '-o', output]
    : ['-quiet', '-q', String(quality), '-m', '6', '-sharp_yuv', sheetPng, '-o', output];
  run('cwebp', cwebpArgs);

  const bytes = statSync(output).size;
  console.log(`wrote ${output} — ${layout.cols}x${layout.rows} @ ${cell}px cells (${content}px content + ${GUTTER}px gutter), ${(bytes / 1024).toFixed(1)} KB`);
  console.log('runtime UVs: repeat.set(' + `${content}/${cell * layout.cols}, ${content}/${cell * layout.rows}` + '); offset per frame inset by ' + `${GUTTER}px — see docs/FLIPBOOK_BILLBOARD_SPEC.md`);
  if (bytes > 300 * 1024) {
    console.warn('WARN: sheet exceeds the 300 KB guidance — consider fewer frames, smaller cells, or stronger quantization.');
  }
  console.log('next: manifest entry + owner similarity review before the sheet ships (docs/HIGGSFIELD_MCP_INTEGRATION_PLAN.md §3).');
} finally {
  rmSync(work, { recursive: true, force: true });
}
