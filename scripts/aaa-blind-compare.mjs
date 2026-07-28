// Blind A/B rig for the AAA overhaul.
//
// Takes two capture sets produced by aaa-visual-capture.mjs and lays them out
// as anonymised LEFT/RIGHT pairs so a critic agent can judge which build looks
// better WITHOUT knowing which is the new one. Side assignment is randomised
// per pair from a seed; the answer key is written OUTSIDE the pair directory so
// the critic's working directory contains no tell.
//
//   node scripts/aaa-blind-compare.mjs --a baseline --b lighting-v3 --round r1
//
// Critic is handed:   tmp/aaa-blind/<round>/pair-XX/{left.png,right.png}
// Key lands at:       tmp/aaa-blind-keys/<round>.json   (never show this to the critic)
import { mkdirSync, writeFileSync, copyFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const index = argv.indexOf(`--${name}`);
  if (index !== -1 && argv[index + 1] !== undefined) return argv[index + 1];
  return fallback;
};

const A_LABEL = arg('a', 'baseline');
const B_LABEL = arg('b');
const ROUND = arg('round', `${A_LABEL}-vs-${B_LABEL}`);
const SEED = Number(arg('seed', 1337));

if (!B_LABEL) {
  console.error('usage: node scripts/aaa-blind-compare.mjs --a <labelA> --b <labelB> [--round <name>] [--seed N]');
  process.exit(2);
}

const setDir = (label) => path.join(root, 'tmp', 'aaa-visual', label);
const aDir = setDir(A_LABEL);
const bDir = setDir(B_LABEL);
for (const [label, dir] of [[A_LABEL, aDir], [B_LABEL, bDir]]) {
  if (!existsSync(dir)) {
    console.error(`capture set "${label}" not found at ${path.relative(root, dir)} — run aaa-visual-capture.mjs --label ${label} first`);
    process.exit(2);
  }
}

const framesIn = (dir) => readdirSync(dir).filter((name) => name.endsWith('.png')).sort();
const shared = framesIn(aDir).filter((name) => existsSync(path.join(bDir, name)));
if (!shared.length) {
  console.error('no frames captured at the same progress marks in both sets — recapture with identical --points');
  process.exit(2);
}

// Deterministic PRNG so a round can be regenerated, but the critic can't infer
// the side from ordering.
let state = SEED >>> 0;
const rand = () => {
  state = (state * 1664525 + 1013904223) >>> 0;
  return state / 0x100000000;
};

const outDir = path.join(root, 'tmp', 'aaa-blind', ROUND);
const keyDir = path.join(root, 'tmp', 'aaa-blind-keys');
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
mkdirSync(keyDir, { recursive: true });

const key = { round: ROUND, a: A_LABEL, b: B_LABEL, seed: SEED, pairs: [] };

shared.forEach((frame, index) => {
  const pairId = `pair-${String(index + 1).padStart(2, '0')}`;
  const pairDir = path.join(outDir, pairId);
  mkdirSync(pairDir, { recursive: true });
  const bOnLeft = rand() < 0.5;
  copyFileSync(path.join(bOnLeft ? bDir : aDir, frame), path.join(pairDir, 'left.png'));
  copyFileSync(path.join(bOnLeft ? aDir : bDir, frame), path.join(pairDir, 'right.png'));
  key.pairs.push({ pairId, frame, left: bOnLeft ? B_LABEL : A_LABEL, right: bOnLeft ? A_LABEL : B_LABEL });
});

writeFileSync(path.join(keyDir, `${ROUND}.json`), `${JSON.stringify(key, null, 2)}\n`);

// A neutral index so the critic knows how many pairs exist and nothing else.
writeFileSync(
  path.join(outDir, 'README.txt'),
  `Blind comparison round: ${ROUND}\n${key.pairs.length} pairs.\n` +
    `Each pair directory holds left.png and right.png — two builds of the same frame of the same track.\n` +
    `Which side is which build is randomised per pair. Judge only what you see.\n`
);

console.log(`[aaa-blind] ${key.pairs.length} pairs → ${path.relative(root, outDir)}`);
console.log(`[aaa-blind] key (do not show critics) → ${path.relative(root, path.join(keyDir, `${ROUND}.json`))}`);
