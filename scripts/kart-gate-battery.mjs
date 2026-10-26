// The kart release gate battery, in one command, with one summary.
//
//   node scripts/kart-gate-battery.mjs           # node gates + build + bundle + browser gates
//   node scripts/kart-gate-battery.mjs --quick   # node gates only (seconds, no browser)
//
// Runs sequentially on purpose: the browser gates are timing-sensitive, and on
// this machine two of them at once is enough to fake a failure. Each gate's
// output goes to tmp/gate-battery/<name>.log; the summary lists the log of
// anything that failed. Exit code is non-zero if any gate failed.
//
// Before a browser gate it waits (up to 5 min) for the 1-minute load average
// to drop under GATE_LOAD_CEILING (default 14) — load is the usual cause of a
// "failure" here that is not one.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quick = process.argv.includes('--quick');
const logDir = path.join(root, 'tmp', 'gate-battery');
mkdirSync(logDir, { recursive: true });
const LOAD_CEILING = Number(process.env.GATE_LOAD_CEILING || 14);

const NODE_GATES = [
  ['spline', 'npm', ['run', 'test:spline']],
  ['laps', 'npm', ['run', 'test:laps']],
  ['wrongway', 'npm', ['run', 'test:wrongway']],
  ['offroad', 'npm', ['run', 'test:offroad']],
  ['autoplay', 'npm', ['run', 'test:autoplay']],
  ['classic-handling', 'npm', ['run', 'test:classic-handling']],
  ['minimap', 'npm', ['run', 'test:minimap']],
  ['track-visuals', 'npm', ['run', 'test:track-visuals']],
  ['ground-clearance', 'node', ['scripts/test-ground-clearance.mjs']],
  ['select-models', 'npm', ['run', 'test:select:models']],
  ['audio-samples', 'npm', ['run', 'test:audio:samples']],
  ['kart-regressions', 'npm', ['run', 'test:kart:regressions']],
];
const BUILD_GATES = [
  ['build', 'npm', ['run', 'build:kart']],
  ['bundle', 'npm', ['run', 'test:bundle:kart']],
];
const BROWSER_GATES = [
  ['context-loss', 'npm', ['run', 'test:kart:context-loss']],
  ['soak', 'npm', ['run', 'test:kart:soak']],
  // The proof script builds again on its own; it is last so a red build above
  // fails fast first.
  ['playable-proof', 'npm', ['run', 'test:kart-playable:kart']],
];

const waitForQuiet = () => {
  const end = Date.now() + 5 * 60 * 1000;
  for (;;) {
    const load = os.loadavg()[0];
    if (load < LOAD_CEILING || Date.now() > end) return load;
    spawnSync('sleep', ['15']);
  }
};

const results = [];
const run = ([name, cmd, args], { browser = false } = {}) => {
  const load = browser ? waitForQuiet() : os.loadavg()[0];
  const started = Date.now();
  const result = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
  const seconds = (Date.now() - started) / 1000;
  const log = path.join(logDir, `${name}.log`);
  writeFileSync(log, `${result.stdout || ''}\n${result.stderr || ''}`);
  const ok = result.status === 0;
  results.push({ load, log, name, ok, seconds });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(18)} ${seconds.toFixed(0).padStart(4)} s  (load ${load.toFixed(1)})`);
  return ok;
};

NODE_GATES.forEach((gate) => run(gate));
if (!quick) {
  const built = BUILD_GATES.map((gate) => run(gate)).every(Boolean);
  if (built) BROWSER_GATES.forEach((gate) => run(gate, { browser: true }));
  else console.log('skip  browser gates (build or bundle failed)');
}

const failed = results.filter((entry) => !entry.ok);
console.log(`\n${results.length - failed.length}/${results.length} gates passed`);
failed.forEach((entry) => console.log(`  failed: ${entry.name} -> ${path.relative(root, entry.log)}`));
process.exitCode = failed.length ? 1 : 0;
