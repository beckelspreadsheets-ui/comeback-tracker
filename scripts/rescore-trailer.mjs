// Re-score the trailer cuts with a new music track (video streams copied, so
// no generation loss and no re-render).
//
//   node scripts/rescore-trailer.mjs <music.mp3> [tag=eleven]
//
// The 16:9 trailer and its 4K master are 53.5 s; the music plan
// (scripts/elevenlabs-plans/trailer-v25.json) puts the freeze-over impact at
// 26.0 s, where the Penguin Village flyover cut lands, and the title hit at
// 47.0 s, where the logo card starts. Those cuts come from the beat sheet in
// tmp/trailer-ai/final/list2.txt (01..11, starting 0, 4, 9.5, 13.5, 18, 22,
// 26, 30, 34.5, 39, 43, 47).
//
// The 9:16 teaser is 22 s with its title card at 16.0 s, so its score is the
// track's first 16 s crossfaded (1 s) into the title section, placed so the
// 47.0 s hit lands on 16.0 s.
//
// Outputs sit next to the old cuts in tmp/trailer-ai/ with a -<tag> suffix;
// the old "Vice On Ice" versions are left in place for comparison.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const music = process.argv[2];
const tag = process.argv[3] || 'eleven';
if (!music || !existsSync(music)) {
  console.error('usage: node scripts/rescore-trailer.mjs <music.mp3> [tag]');
  process.exit(2);
}
const dir = path.join(root, 'tmp', 'trailer-ai');
const TITLE_HIT_S = 47;
const TEASER_TITLE_S = 16;

const run = (args) => {
  const result = spawnSync('ffmpeg', ['-y', '-v', 'error', ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr.slice(0, 400));
};
const duration = (file) =>
  Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout.trim());

// The newest edits are the ones that went out with "Vice On Ice" (16:9 v4,
// 4K v2, teaser v3, 2026-08-16/17); the plainly named files are older cuts
// of a different length. Only their audio is replaced.
const cuts = [
  { source: 'penguin-kart-trailer-16x9-v4-viceonice.mp4', out: `penguin-kart-trailer-16x9-${tag}.mp4` },
  { source: 'penguin-kart-trailer-4k-v2-viceonice.mp4', out: `penguin-kart-trailer-4k-${tag}.mp4` },
];
for (const cut of cuts) {
  const src = path.join(dir, cut.source);
  if (!existsSync(src)) {
    console.log(`skip ${cut.source} (missing)`);
    continue;
  }
  const length = duration(src);
  // Music from 0, faded over the last 1.5 s of picture.
  run([
    '-i', src, '-i', music,
    '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'copy',
    '-af', `afade=t=out:st=${(length - 1.5).toFixed(2)}:d=1.5`,
    '-c:a', 'aac', '-b:a', '192k',
    '-t', length.toFixed(3),
    '-movflags', '+faststart',
    path.join(dir, cut.out),
  ]);
  console.log(`wrote tmp/trailer-ai/${cut.out}  ${length.toFixed(2)} s`);
}

const teaser = path.join(dir, 'penguin-kart-teaser-9x16-v3-viceonice.mp4');
if (existsSync(teaser)) {
  const length = duration(teaser);
  const tailStart = TITLE_HIT_S - 1; // 1 s crossfade ending on the hit
  run([
    '-i', teaser, '-i', music, '-i', music,
    '-filter_complex',
    `[1:a]atrim=0:${TEASER_TITLE_S},asetpts=PTS-STARTPTS[a];` +
      `[2:a]atrim=${tailStart},asetpts=PTS-STARTPTS[b];` +
      `[a][b]acrossfade=d=1:c1=tri:c2=tri,afade=t=out:st=${(length - 1.2).toFixed(2)}:d=1.2[m]`,
    '-map', '0:v:0', '-map', '[m]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-t', length.toFixed(3),
    '-movflags', '+faststart',
    path.join(dir, `penguin-kart-teaser-9x16-${tag}.mp4`),
  ]);
  console.log(`wrote tmp/trailer-ai/penguin-kart-teaser-9x16-${tag}.mp4  ${length.toFixed(2)} s`);
}
