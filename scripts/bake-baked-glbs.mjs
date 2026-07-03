#!/usr/bin/env node
// Interim `npm run assets:bake` wrapper (exec plan A1 / PRD P0-4).
// Regenerates the two committed bake GLBs end-to-end:
//   tmp/baked-spike/segment.json -> public/baked-spike.glb (Cycles)
//   scripts/blender/bake-buildings.py -> public/baked-buildings.glb (Cycles)
// Amendment 2: C4's bake-assets.mjs replaces and deletes this wrapper; C3's
// refactor of the .py scripts must update this file in the same commit.
//
// Hash-locked approval flow: a re-bake whose bytes differ from the committed
// GLBs is a NEW asset — it goes through orientation lab + gallery approval,
// never straight to a commit. This script prints hashes and a diff reminder;
// it does not decide.
import { access, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const exists = async (p) => access(p).then(() => true, () => false);

const resolveBlender = async () => {
  const candidates = [
    process.env.BLENDER_BIN,
    '/opt/homebrew/bin/blender',
    '/Applications/Blender.app/Contents/MacOS/Blender',
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  throw new Error(
    `No Blender binary found (tried: ${candidates.join(', ')}). Set BLENDER_BIN.`
  );
};

const runStep = (label, file, args, opts = {}) => {
  console.log(`\n[assets:bake] ${label}`);
  execFileSync(file, args, { cwd: root, stdio: 'inherit', ...opts });
};

const assertBaked = async (relPath, minBytes = 100 * 1024) => {
  const filePath = path.join(root, relPath);
  const info = await stat(filePath).catch(() => null);
  if (!info) throw new Error(`${relPath} was not produced`);
  if (info.size < minBytes) {
    throw new Error(`${relPath} is suspiciously small (${info.size} bytes < ${minBytes})`);
  }
  const hash = createHash('sha256').update(readFileSync(filePath)).digest('hex');
  console.log(`[assets:bake] ${relPath}  ${info.size} bytes  sha256:${hash}`);
};

const blender = await resolveBlender();
console.log(`[assets:bake] blender: ${blender}`);

// export-spike-segment writes tmp/baked-spike/segment.json but does not
// create the directory.
await mkdir(path.join(root, 'tmp', 'baked-spike'), { recursive: true });

runStep('export spike segment (JS -> segment.json)', process.execPath, [
  'scripts/blender/export-spike-segment.mjs',
]);
runStep('bake spike segment (Cycles)', blender, ['-b', '-P', 'scripts/blender/bake-spike-segment.py']);
runStep('bake buildings (Cycles)', blender, ['-b', '-P', 'scripts/blender/bake-buildings.py']);

await assertBaked('public/baked-spike.glb');
await assertBaked('public/baked-buildings.glb');

console.log(`
[assets:bake] Done. If the hashes above differ from the committed GLBs, this
re-bake is a NEW asset: run the orientation lab + gallery approval flow before
committing. Check with: git diff --stat public/`);
