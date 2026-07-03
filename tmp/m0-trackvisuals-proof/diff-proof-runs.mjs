// P0-3b parity evidence: pixel-diff the flag-off proof run against the
// pre-change baseline run at each capture mark. playableAutoplay is
// deterministic modulo frame timing, so the top-down (fixed camera, fixed ms)
// should be near-zero; chase marks tolerate small timing skew.
import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';

const root = '/Users/andrewferguson/Downloads/comeback-tracker';
const before = process.env.PROOF_BEFORE || `${root}/asset-pipeline/proof/runs/2026-07-03T02-02-10-801Z__race-proof`;
const after = process.env.PROOF_AFTER || `${root}/asset-pipeline/proof/runs/2026-07-03T02-38-29-121Z__race-proof`;

const diff = async (rel) => {
  const a = PNG.sync.read(await readFile(`${before}/${rel}`));
  const b = PNG.sync.read(await readFile(`${after}/${rel}`));
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  let changed = 0;
  let total = 0;
  let samples = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const delta =
        Math.abs(a.data[i] - b.data[i]) +
        Math.abs(a.data[i + 1] - b.data[i + 1]) +
        Math.abs(a.data[i + 2] - b.data[i + 2]);
      total += delta / 3;
      if (delta > 42) changed += 1;
      samples += 1;
    }
  }
  return { changedRatio: +(changed / samples).toFixed(4), meanDelta: +(total / samples).toFixed(2) };
};

const marks = ['desktop/top-down.png', 'desktop/start.png', 'desktop/mid.png', 'desktop/end.png', 'mobile/top-down.png', 'mobile/start.png', 'mobile/mid.png', 'mobile/end.png'];
for (const mark of marks) {
  console.log(mark, JSON.stringify(await diff(mark)));
}
