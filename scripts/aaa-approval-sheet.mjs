// Owner approval sheet for the AAA overhaul.
//
// Builds ONE page: every captured frame as before/after, the critics' verdicts,
// and the measured performance delta. Designed for a single yes/no rather than
// per-photo review.
//
//   node scripts/aaa-approval-sheet.mjs --label wave1-r2 --wave 1
//   open tmp/aaa-approval/wave1-r2.html
//
// --critics <path>  optional JSON array of critic reports to embed.
import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const index = argv.indexOf(`--${name}`);
  return index !== -1 && argv[index + 1] !== undefined ? argv[index + 1] : fallback;
};

const LABEL = arg('label');
const WAVE = arg('wave', '?');
const BASE = arg('base', 'baseline');
const CRITICS_PATH = arg('critics');
// --dist emits a SELF-CONTAINED folder (index.html + img/ webp) for publishing
// instead of a local page that reaches back into tmp/aaa-visual with ../ hrefs.
// aaa-publish-review.mjs fills img/ before calling this.
const DIST = arg('dist');
if (!LABEL) {
  console.error('usage: node scripts/aaa-approval-sheet.mjs --label <captureLabel> [--wave N] [--base baseline] [--critics <json>]');
  process.exit(2);
}

const afterDir = path.join(root, 'tmp', 'aaa-visual', LABEL);
const beforeDir = path.join(root, 'tmp', 'aaa-visual', BASE);
for (const dir of [afterDir, beforeDir]) {
  if (!existsSync(dir)) {
    console.error(`missing capture set: ${path.relative(root, dir)}`);
    process.exit(2);
  }
}

const readJson = (file, fallback = null) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};

const afterManifest = readJson(path.join(afterDir, 'capture-manifest.json'), {});
const beforeManifest = readJson(path.join(beforeDir, 'capture-manifest.json'), {});
const critics = CRITICS_PATH ? readJson(path.resolve(root, CRITICS_PATH), []) : [];

const frames = readdirSync(afterDir)
  .filter((name) => name.endsWith('.png') && existsSync(path.join(beforeDir, name)))
  .sort();

const outDir = DIST ? path.resolve(root, DIST) : path.join(root, 'tmp', 'aaa-approval');
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, DIST ? 'index.html' : `${LABEL}.html`);

// Local sheet reaches back into tmp/aaa-visual with ../ hrefs; the publishable
// dist references the phone-sized webp copies sitting next to index.html.
const href = (set, file) =>
  DIST ? `img/${set}__${file.replace(/\.png$/, '.webp')}` : `../aaa-visual/${set}/${file}`;

const statFor = (manifest, track, point) =>
  manifest?.tracks?.[track]?.captured?.find((entry) => Math.abs(entry.point - point) < 0.001) || null;

const perfRow = (track) => {
  const before = beforeManifest?.tracks?.[track]?.captured || [];
  const after = afterManifest?.tracks?.[track]?.captured || [];
  if (!before.length || !after.length) return '';
  const avg = (rows, key) => {
    const values = rows.map((row) => row[key]).filter((value) => typeof value === 'number');
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  };
  const cell = (label, b, a, unit = '', lowerIsBetter = false) => {
    if (b === null || a === null) return `<td><span class="k">${label}</span><span class="v">—</span></td>`;
    const delta = a - b;
    const pct = b ? (delta / b) * 100 : 0;
    const bad = lowerIsBetter ? pct > 10 : pct < -10;
    const sign = delta >= 0 ? '+' : '';
    return `<td><span class="k">${label}</span><span class="v">${a.toFixed(a < 100 ? 2 : 0)}${unit}</span>
      <span class="d ${bad ? 'bad' : 'ok'}">${sign}${pct.toFixed(1)}% vs ${b.toFixed(b < 100 ? 2 : 0)}${unit}</span></td>`;
  };
  return `<tr><th>${track}</th>
    ${cell('fps', avg(before, 'fps'), avg(after, 'fps'))}
    ${cell('frame work', avg(before, 'frameWorkMs'), avg(after, 'frameWorkMs'), 'ms', true)}
    ${cell('draw calls', avg(before, 'drawCalls'), avg(after, 'drawCalls'), '', true)}
    ${cell('triangles', avg(before, 'triangles'), avg(after, 'triangles'), '', true)}
  </tr>`;
};

const criticBlock = critics.length
  ? critics
      .map((critic) => {
        const scores = critic.scores || {};
        const chips = Object.entries(scores)
          .map(([axis, value]) => `<span class="chip ${value >= 8 ? 'good' : value >= 6 ? 'mid' : 'poor'}">${axis} ${value}</span>`)
          .join('');
        const fixes = (critic.nextFixes || [])
          .map((fix) => `<li><b>${fix.severity}</b> — ${fix.title}<br><span class="dim">${fix.fix || ''}</span></li>`)
          .join('');
        const blockers = (critic.blockers || []).map((b) => `<li>${b}</li>`).join('');
        return `<section class="critic">
          <h3>${critic.lens || 'critic'} <span class="verdict ${critic.verdict === 'PASS' ? 'pass' : 'fail'}">${critic.verdict || '?'}</span>
            <span class="dim">total ${critic.total ?? '—'}</span></h3>
          <p>${critic.headline || ''}</p>
          <div class="chips">${chips}</div>
          ${blockers ? `<h4>Blockers</h4><ul>${blockers}</ul>` : ''}
          ${fixes ? `<h4>Still wants fixing</h4><ul>${fixes}</ul>` : ''}
        </section>`;
      })
      .join('')
  : '<p class="dim">No critic reports embedded — pass --critics &lt;json&gt; to include them.</p>';

const frameBlocks = frames
  .map((file) => {
    const match = file.match(/^(.*)-p(\d+)_(\d+)\.png$/);
    const track = match ? match[1] : file;
    const point = match ? Number(`${match[2]}.${match[3]}`) : null;
    const after = point === null ? null : statFor(afterManifest, track, point);
    const before = point === null ? null : statFor(beforeManifest, track, point);
    const meta =
      after && before
        ? `<span class="dim">${before.fps}fps / ${before.drawCalls} draws &nbsp;→&nbsp; ${after.fps}fps / ${after.drawCalls} draws</span>`
        : '';
    return `<article>
      <h4>${track} <span class="dim">· progress ${point ?? '?'}</span> ${meta}</h4>
      <div class="pair">
        <figure><figcaption>BEFORE</figcaption><a href="${href(BASE, file)}" target="_blank"><img loading="lazy" src="${href(BASE, file)}" alt="before"></a></figure>
        <figure><figcaption>AFTER</figcaption><a href="${href(LABEL, file)}" target="_blank"><img loading="lazy" src="${href(LABEL, file)}" alt="after"></a></figure>
      </div>
    </article>`;
  })
  .join('');

const consoleErrors = [
  ...(afterManifest.consoleErrors || []),
].slice(0, 20);

writeFileSync(
  outFile,
  `<!doctype html><html><head><meta charset="utf-8"><title>AAA wave ${WAVE} — ${LABEL}</title>
<style>
:root{color-scheme:dark}
body{margin:0;padding:28px 32px 80px;background:#0d1017;color:#e8ecf4;font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
h1{font-size:26px;margin:0 0 4px} h2{margin:38px 0 12px;font-size:19px;border-bottom:1px solid #232838;padding-bottom:7px}
h3{margin:0 0 6px;font-size:16px} h4{margin:14px 0 6px;font-size:13px;font-weight:600;letter-spacing:.02em}
.dim{color:#8d97ab;font-weight:400;font-size:12px}
article{margin:26px 0}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}
figure{margin:0} figcaption{font-size:11px;letter-spacing:.09em;color:#8d97ab;margin-bottom:5px}
img{width:100%;border-radius:7px;border:1px solid #232838;display:block}
table{border-collapse:collapse;width:100%;margin:10px 0 4px}
th{text-align:left;padding:9px 12px;background:#151a25;border-radius:7px 0 0 7px;font-size:13px;width:150px}
td{padding:9px 12px;background:#12161f;border-left:1px solid #0d1017}
.k{display:block;font-size:11px;color:#8d97ab;letter-spacing:.05em}
.v{display:block;font-size:17px;font-weight:600}
.d{display:block;font-size:11px} .d.ok{color:#4ec98a} .d.bad{color:#ff7a6b}
.critic{background:#12161f;border:1px solid #232838;border-radius:10px;padding:16px 18px;margin:12px 0}
.verdict{font-size:11px;padding:2px 8px;border-radius:20px;vertical-align:2px}
.verdict.pass{background:#12402c;color:#6fe3a6} .verdict.fail{background:#4a1d1d;color:#ff9b8e}
.chips{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}
.chip{font-size:11px;padding:2px 8px;border-radius:20px;background:#1c2230}
.chip.good{background:#12402c;color:#6fe3a6} .chip.mid{background:#463a13;color:#e8cf6f} .chip.poor{background:#4a1d1d;color:#ff9b8e}
ul{margin:6px 0;padding-left:20px} li{margin:5px 0;font-size:13px}
.note{background:#151a25;border-left:3px solid #4a7fd4;padding:12px 16px;border-radius:0 7px 7px 0;margin:16px 0;font-size:14px}
</style></head><body>
<h1>AAA overhaul — wave ${WAVE}</h1>
<p class="dim">capture <b>${LABEL}</b> vs <b>${BASE}</b> · ${frames.length} frame pairs · generated ${new Date().toISOString()}</p>

<div class="note"><b>What I need from you:</b> the technical calls are already handled — seams, shadows, z-fighting, frame rate and build health are measured and fixed automatically. What I cannot decide for you is <b>taste</b>: has the art direction drifted somewhere you did not ask it to go? Scroll the pairs, and tell me either "keep going" or which specific frames went the wrong way.</div>

<h2>Performance</h2>
<table>${['comeback-city', 'penguin-village'].map(perfRow).join('')}</table>
${consoleErrors.length ? `<h4>Console errors during capture</h4><ul>${consoleErrors.map((e) => `<li>${e}</li>`).join('')}</ul>` : '<p class="dim">No console errors during capture.</p>'}

<h2>Critic verdicts</h2>
${criticBlock}

<h2>Every frame, before and after</h2>
${frameBlocks}
</body></html>
`
);

console.log(`[aaa-approval] ${frames.length} pairs → ${path.relative(root, outFile)}`);
console.log(`[aaa-approval] open ${path.relative(root, outFile)}`);
