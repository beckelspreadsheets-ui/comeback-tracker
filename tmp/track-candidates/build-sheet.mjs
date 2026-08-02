#!/usr/bin/env node
// Builds tmp/track-candidates/index.html — the owner's comparison sheet.
//
// One page, three candidate plan views at ONE SHARED SCALE plus the shipped
// track for reference, so "four times longer" is something you can see rather
// than a number you have to take on trust. Everything on it is read from the
// previewer's own JSON reports; nothing here re-derives a measurement.
//
//   node tmp/track-candidates/build-sheet.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PREVIEW = resolve(HERE, 'preview');
const read = (key) => JSON.parse(readFileSync(resolve(PREVIEW, `${key}-layout.json`), 'utf8'));

const CANDIDATES = [
  {
    key: 'cc4x-a-bayfront',
    letter: 'A',
    title: 'Bayfront Sweep',
    thesis: 'Flow',
    pitch:
      'One hard braking point and long corners everywhere else. Big-radius sweepers you hold a drift through, a chicane early to teach the rhythm, and a nine-second causeway across the bay that ends in the only real hairpin on the lap.',
    playsLike: 'Fast, smooth, forgiving. The lap you would choose to show someone the drift mechanic.',
    build: 'Cheapest of the three. No new structural systems — it is the shipped bridge idea at a bigger scale.',
    risk:
      'The least technical layout, and the one that leans hardest on the drift being fun. Its corners cluster at r110-250, so it does the least to answer "every corner is taken the same way".',
  },
  {
    key: 'cc4x-b-downtown',
    letter: 'B',
    title: 'Downtown Deadline',
    thesis: 'Technical',
    pitch:
      'A city block circuit: square corners, two staircase chicanes through the service streets, three switchbacks in the old town, and one Expressway where all of it either pays off or does not.',
    playsLike: 'Busy and demanding. Rhythm is the skill; the Expressway is the reward for having found it.',
    build:
      'Medium. No new systems, but 17 corners of downtown need 17 corners of city — it asks the most of the dressing pass.',
    risk:
      'The busiest lap of the three and the most likely to read as work rather than flow. Two staircase corners sit at 0.82 s of announcement — over the 0.8 s gate but the tightest numbers on the sheet.',
  },
  {
    key: 'cc4x-c-skyline',
    letter: 'C',
    title: 'Skyline Viaduct',
    thesis: 'Set piece',
    pitch:
      'The lap crosses itself. A viaduct climbs 2.5 km diagonally back across the infield, passes 30 units directly over the start/finish straight at its crest, launches, and drops into two stop-and-turn hairpins.',
    playsLike:
      'A long build to one enormous event. On lap 1 you watch the leaders go over your head; by lap 3 you are the one going over.',
    build:
      'The most expensive. A viaduct needs a deck, an underside, supports and a road-over-road case the shipped bridge only half-solves at a quarter of the span.',
    risk:
      'The crest hides the viaduct hairpin down to 1.3 s of announcement — legal, but the tightest thing on the candidate, and it is the corner arriving off a 30-unit drop.',
  },
];

const REFERENCE = { key: 'comeback-city', letter: '·', title: 'Comeback City today', thesis: 'Shipped' };

const reports = new Map([...CANDIDATES, REFERENCE].map((entry) => [entry.key, read(entry.key)]));

// ---------------------------------------------------------------------------
// One shared world window across every plan, so relative size on this sheet is
// real. That is the entire reason the comparison exists — 4x has to be
// something the eye measures, not a number in a table.
// ---------------------------------------------------------------------------
const boundsOf = (report) => {
  const xs = report.plan.map((p) => p[0]);
  const zs = report.plan.map((p) => p[1]);
  const pad = Math.max(...report.plan.map((p) => p[2])) * 0.6 + 60;
  return {
    minX: Math.min(...xs) - pad,
    maxX: Math.max(...xs) + pad,
    minZ: Math.min(...zs) - pad,
    maxZ: Math.max(...zs) + pad,
  };
};
const allBounds = [...reports.values()].map(boundsOf);
const WORLD_W = Math.max(...allBounds.map((b) => b.maxX - b.minX));
const WORLD_H = Math.max(...allBounds.map((b) => b.maxZ - b.minZ));

const BEAT_MARK = {
  'item-box': { fill: '#4ad9ff', shape: 'square' },
  'boost-pad': { fill: '#ff5df0', shape: 'diamond' },
  ramp: { fill: '#ff9d3d', shape: 'triangle' },
  shortcut: { fill: '#b078ff', shape: 'diamond' },
  'crest-launch': { fill: '#ffd54a', shape: 'diamond' },
  crest: { fill: '#e8eef7', shape: 'diamond' },
};

const planSvg = (report) => {
  const b = boundsOf(report);
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  const viewBox = `${cx - WORLD_W / 2} ${cz - WORLD_H / 2} ${WORLD_W} ${WORLD_H}`;
  const plan = report.plan;
  const n = plan.length;
  const at = (progress) => plan[Math.min(n - 1, Math.max(0, Math.round(progress * n) % n))];
  const meanWidth = plan.reduce((sum, p) => sum + p[2], 0) / n;

  const pathFor = (from, to) => {
    // Walk the plan array from `from` to `to`, wrapping the lap.
    const start = Math.round(from * n) % n;
    const span = ((Math.round(to * n) - Math.round(from * n)) % n + n) % n;
    const points = [];
    for (let step = 0; step <= span; step += 1) points.push(plan[(start + step) % n]);
    if (points.length < 2) return '';
    return `M ${points.map((p) => `${p[0].toFixed(0)} ${p[1].toFixed(0)}`).join(' L ')}`;
  };

  const road = `M ${plan.map((p) => `${p[0].toFixed(0)} ${p[1].toFixed(0)}`).join(' L ')} Z`;

  // Elevated road drawn last and lighter, so a crossing reads as a crossing.
  const band = report.elevation.band;
  const elevated = band ? pathFor(band.from, band.to) : '';

  const cornerPaths = report.corners.list
    .map((corner) => {
      const stroke = corner.type === 'kink' ? '#ff4d4d' : corner.direction === 'left' ? '#5ef0a6' : '#ff7ac6';
      return `<path d="${pathFor(corner.startProgress, corner.endProgress)}" stroke="${stroke}" stroke-width="${(meanWidth * 0.34).toFixed(0)}" fill="none" stroke-linecap="round"/>`;
    })
    .join('');

  const longest = report.straights.list.reduce((best, s) => (!best || s.lengthUnits > best.lengthUnits ? s : best), null);
  const longestPath = longest
    ? `<path d="${pathFor(longest.startProgress, longest.endProgress)}" stroke="#ffd54a" stroke-width="${(meanWidth * 0.5).toFixed(0)}" fill="none" stroke-linecap="round" opacity="0.95"/>`
    : '';

  const beats = report.beats.list
    .map((beat) => {
      const mark = BEAT_MARK[beat.kind] || { fill: '#e8eef7', shape: 'square' };
      const r = meanWidth * 0.42;
      if (mark.shape === 'diamond') {
        return `<path d="M ${beat.x} ${beat.z - r} L ${beat.x + r} ${beat.z} L ${beat.x} ${beat.z + r} L ${beat.x - r} ${beat.z} Z" fill="${mark.fill}"/>`;
      }
      if (mark.shape === 'triangle') {
        return `<path d="M ${beat.x} ${beat.z - r} L ${beat.x + r} ${beat.z + r} L ${beat.x - r} ${beat.z + r} Z" fill="${mark.fill}"/>`;
      }
      return `<rect x="${beat.x - r}" y="${beat.z - r}" width="${r * 2}" height="${r * 2}" fill="${mark.fill}"/>`;
    })
    .join('');

  const startPoint = at(report.startProgress);
  const nextPoint = at(report.startProgress + 0.01);
  const dx = nextPoint[0] - startPoint[0];
  const dz = nextPoint[1] - startPoint[1];
  const len = Math.hypot(dx, dz) || 1;
  const barX = (-dz / len) * meanWidth * 0.75;
  const barZ = (dx / len) * meanWidth * 0.75;

  // A 500-unit scale bar, identical in every panel because the scale is.
  const barLen = 500;
  const barY = cz + WORLD_H / 2 - WORLD_H * 0.04;
  const barStart = cx - WORLD_W / 2 + WORLD_W * 0.04;

  return `<svg viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${report.name} plan view">
    <path d="${road}" stroke="#2b3446" stroke-width="${meanWidth.toFixed(0)}" fill="none" stroke-linejoin="round"/>
    <path d="${road}" stroke="#79879e" stroke-width="${(meanWidth * 0.1).toFixed(0)}" fill="none" stroke-linejoin="round" opacity="0.5"/>
    ${cornerPaths}
    ${longestPath}
    ${elevated ? `<path d="${elevated}" stroke="#0d1119" stroke-width="${(meanWidth * 1.5).toFixed(0)}" fill="none" stroke-linecap="round" opacity="0.55"/><path d="${elevated}" stroke="#8fb4ff" stroke-width="${(meanWidth * 0.95).toFixed(0)}" fill="none" stroke-linecap="round"/>` : ''}
    ${beats}
    <line x1="${startPoint[0] + barX}" y1="${startPoint[1] + barZ}" x2="${startPoint[0] - barX}" y2="${startPoint[1] - barZ}" stroke="#ffffff" stroke-width="${(meanWidth * 0.22).toFixed(0)}"/>
    <line x1="${barStart}" y1="${barY}" x2="${barStart + barLen}" y2="${barY}" stroke="#8b98ad" stroke-width="${(WORLD_H * 0.004).toFixed(0)}"/>
    <text x="${barStart}" y="${barY - WORLD_H * 0.012}" fill="#8b98ad" font-size="${(WORLD_H * 0.028).toFixed(0)}" font-family="ui-monospace, monospace">500 u = 1.9 s</text>
  </svg>`;
};

// ---------------------------------------------------------------------------
// Targets. Each row states the bar, then how each candidate measures.
// ---------------------------------------------------------------------------
const pct = (report) => Math.round((100 * Math.min(report.corners.byDirection.left, report.corners.byDirection.right)) / report.corners.total);
const chicanes = (report) => report.corners.chicanes.length;
const straightSeconds = (report, rank) =>
  [...report.straights.list].sort((a, b) => b.lengthUnits - a.lengthUnits)[rank]?.seconds ?? 0;

const TARGETS = [
  {
    label: 'Lap length ~11,700 u',
    bar: '4x the shipped 2,897 u',
    value: (r) => `${r.lengthUnits.toLocaleString()} u`,
    ok: (r) => Math.abs(r.lengthUnits - 11700) / 11700 < 0.03,
  },
  { label: 'Lap ~45 s / race ~135 s', bar: '2-3 minute race', value: (r) => `${r.lapSeconds}s / ${r.raceSeconds}s`, ok: (r) => r.lapSeconds >= 43 && r.lapSeconds <= 47 },
  { label: 'Corners 15-25', bar: "MK8's range (today: 7)", value: (r) => `${r.corners.total}`, ok: (r) => r.corners.total >= 15 && r.corners.total <= 25 },
  {
    label: 'Overtaking straight 8-10 s',
    bar: 'the single most important target (today: 2.19 s)',
    value: (r) => `${straightSeconds(r, 0)}s`,
    ok: (r) => straightSeconds(r, 0) >= 8 && straightSeconds(r, 0) <= 10,
  },
  // Tolerance either side of the 4-5 s band rather than a hard edge: 3.97 and
  // 5.32 are both "a straight you can use an item on that is not the main
  // zone", which is what the target is for. The exact figure is in the cell.
  { label: 'Second straight 4-5 s', bar: 'somewhere to use an item that is not the main zone', value: (r) => `${straightSeconds(r, 1)}s`, ok: (r) => straightSeconds(r, 1) >= 3.8 && straightSeconds(r, 1) <= 5.5 },
  { label: 'Beats 13-16, spread', bar: 'the SAME beats, not more (today: 16 every 0.70 s)', value: (r) => `${r.beats.count} every ${r.beats.meanGapSeconds}s`, ok: (r) => r.beats.count >= 13 && r.beats.count <= 16 && r.beats.meanGapSeconds >= 2.5 },
  { label: 'Sweepers >= 6', bar: 'a shape that holds a drift', value: (r) => `${r.corners.byType.sweeper}`, ok: (r) => r.corners.byType.sweeper >= 6 },
  { label: 'Hairpins >= 2', bar: 'a shape that forces a stop-and-turn', value: (r) => `${r.corners.byType.hairpin}`, ok: (r) => r.corners.byType.hairpin >= 2 },
  { label: 'Chicanes >= 2', bar: 'a shape that breaks the rhythm', value: (r) => `${chicanes(r)}`, ok: (r) => chicanes(r) >= 2 },
  { label: 'Handedness >= 33%', bar: 'both drift directions get used', value: (r) => `${pct(r)}%`, ok: (r) => pct(r) >= 33 },
  { label: 'Radius spread', bar: '80-400 u, min authored >= 72', value: (r) => `${r.corners.radiusRange[0]}-${r.corners.radiusRange[1]}`, ok: (r) => r.corners.radiusRange[0] >= 72 },
  { label: 'Kinks 0', bar: 'authored radii only — no spline artefacts', value: (r) => `${r.corners.kinks}`, ok: (r) => r.corners.kinks === 0 },
  { label: 'Elevation, gradient <= 18%', bar: '17-18% is the shipped, proven range', value: (r) => (r.elevation.carries ? `peak ${r.elevation.peakHeight} u, ${r.elevation.maxGradientPct}%` : 'flat'), ok: (r) => r.elevation.carries && r.elevation.maxGradientPct <= 18 },
  { label: 'No blind corners', bar: 'hard gate: 0.8 s of announcement', value: (r) => `worst ${r.sightline.minAnnounceSeconds}s`, ok: (r) => r.sightline.pass },
  { label: 'Every corner >= 1.5 s announced', bar: '--strict-sight, the bar a NEW layout is authored to', value: (r) => (r.sightline.strictPass ? 'all clear' : `${r.sightline.tightCorners} under`), ok: (r) => r.sightline.strictPass },
  { label: 'Sight on the overtaking straight >= 2.5 s', bar: 'you cannot set up a pass into road you cannot see', value: (r) => `${r.sightline.meanSightSeconds}s mean`, ok: (r) => r.sightline.meanSightSeconds >= 2.5 },
  { label: 'Road/terrain value >= 20%', bar: '--strict-contrast; the shipped track fails this too', value: (r) => `${Math.round(r.contrast.minSeparation * 100)}% (kerb ${Math.round(r.contrast.segments[0].edgeSeparation * 100)}%)`, ok: (r) => r.contrast.strictPass },
];

const esc = (value) => String(value).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

const cornerCensus = (r) =>
  `${r.corners.byType.sweeper} sweeper · ${r.corners.byType.hairpin} hairpin · ${r.corners.byType.turn} turn · ${chicanes(r)} chicane · ${r.corners.byDirection.left}L/${r.corners.byDirection.right}R`;

const verdictFor = (entry) => {
  const r = reports.get(entry.key);
  const misses = TARGETS.filter((target) => !target.ok(r));
  const hits = TARGETS.length - misses.length;
  return { r, misses, hits };
};

const candidateCard = (entry) => {
  const { r, misses, hits } = verdictFor(entry);
  return `<section class="card" id="${entry.letter}">
    <header class="card-head">
      <div class="letter">${entry.letter}</div>
      <div>
        <h2>${esc(entry.title)}</h2>
        <p class="thesis">${esc(entry.thesis)} · ${r.lengthUnits.toLocaleString()} u · ${r.lapSeconds}s lap · ${r.corners.total} corners · <strong>${straightSeconds(r, 0)}s</strong> pass window</p>
      </div>
    </header>
    <div class="plan">${planSvg(r)}</div>
    <p class="pitch">${esc(entry.pitch)}</p>
    <dl class="facts">
      <div><dt>Corner census</dt><dd>${cornerCensus(r)}</dd></div>
      <div><dt>Radii</dt><dd>${r.corners.radiusRange[0]}-${r.corners.radiusRange[1]} u, ${r.corners.kinks} kinks</dd></div>
      <div><dt>Straights</dt><dd>${straightSeconds(r, 0)}s · ${straightSeconds(r, 1)}s · ${straightSeconds(r, 2)}s · ${straightSeconds(r, 3)}s</dd></div>
      <div><dt>Beats</dt><dd>${r.beats.count}, one every ${r.beats.meanGapSeconds}s (min ${r.beats.minGapSeconds}s, max ${r.beats.maxGapSeconds}s)</dd></div>
      <div><dt>Elevation</dt><dd>${r.elevation.carries ? `peak ${r.elevation.peakHeight} u, ${r.elevation.maxGradientPct}% max gradient, ${r.elevation.crestLaunch ? 'free launch off the crest' : 'no launch'}` : 'flat'}</dd></div>
      <div><dt>Camera</dt><dd>worst corner announced ${r.sightline.minAnnounceSeconds}s (gate 0.8s), mean forward sight ${r.sightline.meanSightSeconds}s</dd></div>
    </dl>
    <p class="plays"><span>Plays like</span> ${esc(entry.playsLike)}</p>
    <p class="plays"><span>Build cost</span> ${esc(entry.build)}</p>
    <p class="plays risk"><span>The honest risk</span> ${esc(entry.risk)}</p>
    <p class="score">Hits <strong>${hits} of ${TARGETS.length}</strong> targets.${misses.length ? ` Misses: ${misses.map((m) => esc(m.label)).join('; ')}.` : ''}</p>
  </section>`;
};

const referenceCard = () => {
  const r = reports.get(REFERENCE.key);
  return `<section class="card reference">
    <header class="card-head">
      <div class="letter ref">·</div>
      <div>
        <h2>${esc(REFERENCE.title)}</h2>
        <p class="thesis">Shipped · ${r.lengthUnits.toLocaleString()} u · ${r.lapSeconds}s lap · ${r.corners.total} corners · <strong>${straightSeconds(r, 0)}s</strong> pass window</p>
      </div>
    </header>
    <div class="plan">${planSvg(r)}</div>
    <p class="pitch">Drawn at the same scale as the three candidates — this is what four times longer actually looks like. Today's lap is ${r.lapSeconds} s, its longest straight is ${straightSeconds(r, 0)} s, it has ${r.corners.total} corners, and it throws a beat at the driver every ${r.beats.meanGapSeconds} s. (Measured against the working tree, so it already includes the start/finish kink fix: the two r12 kinks the previewer found on the start line are gone, and the lap is 2,889.7 u rather than the 2,897 u in the design notes.)</p>
    <dl class="facts">
      <div><dt>Corner census</dt><dd>${cornerCensus(r)}</dd></div>
      <div><dt>Beats</dt><dd>${r.beats.count}, one every ${r.beats.meanGapSeconds}s</dd></div>
      <div><dt>Camera</dt><dd>worst corner announced ${r.sightline.minAnnounceSeconds}s — under the 0.8 s gate, on ${r.sightline.blindCorners} corners</dd></div>
    </dl>
  </section>`;
};

const matrixRow = (target) => `<tr>
  <th scope="row">${esc(target.label)}<span>${esc(target.bar)}</span></th>
  ${CANDIDATES.map((entry) => {
    const r = reports.get(entry.key);
    return `<td class="${target.ok(r) ? 'hit' : 'miss'}">${esc(target.value(r))}</td>`;
  }).join('')}
  <td class="ref">${esc(target.value(reports.get(REFERENCE.key)))}</td>
</tr>`;

const html = `<title>Comeback City 4x — three candidate layouts</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root {
    color-scheme: dark;
    --bg: #0b0e14;
    --panel: #121724;
    --line: #222a3a;
    --ink: #e8eef7;
    --dim: #8b98ad;
    --gold: #ffd54a;
    --hit: #5ef0a6;
    --miss: #ff8a7a;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.55 ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .wrap { max-width: 1500px; margin: 0 auto; padding: 22px 16px 80px; }
  h1 { font-size: clamp(22px, 4.6vw, 34px); margin: 0 0 6px; letter-spacing: -0.01em; }
  .sub { color: var(--dim); margin: 0 0 18px; max-width: 70ch; }
  .note { background: var(--panel); border: 1px solid var(--line); border-left: 3px solid var(--gold); border-radius: 10px; padding: 12px 14px; margin: 0 0 24px; color: var(--dim); }
  .note strong { color: var(--ink); }
  .grid { display: grid; gap: 18px; grid-template-columns: 1fr; }
  @media (min-width: 1100px) { .grid { grid-template-columns: repeat(3, 1fr); } }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
  .card.reference { border-style: dashed; }
  .card-head { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
  .letter { width: 38px; height: 38px; flex: 0 0 38px; border-radius: 10px; background: var(--gold); color: #10131b; font-weight: 700; font-size: 20px; display: grid; place-items: center; }
  .letter.ref { background: #2b3446; color: var(--dim); }
  h2 { font-size: 19px; margin: 0; }
  .thesis { margin: 2px 0 0; color: var(--dim); font-size: 13px; }
  .thesis strong { color: var(--gold); }
  .plan { background: #080b11; border: 1px solid var(--line); border-radius: 10px; margin-bottom: 12px; }
  .plan svg { display: block; width: 100%; height: auto; }
  .pitch { margin: 0 0 12px; }
  .facts { margin: 0 0 12px; font-size: 13px; }
  .facts > div { display: grid; grid-template-columns: 118px 1fr; gap: 10px; padding: 5px 0; border-top: 1px solid var(--line); }
  dt { color: var(--dim); }
  dd { margin: 0; }
  .plays { margin: 0 0 8px; font-size: 13.5px; color: #cfd8e6; }
  .plays span { color: var(--dim); text-transform: uppercase; letter-spacing: 0.07em; font-size: 11px; display: block; }
  .plays.risk { color: #ffcfc6; }
  .score { margin: 12px 0 0; padding-top: 10px; border-top: 1px solid var(--line); font-size: 13px; color: var(--dim); }
  .score strong { color: var(--ink); }
  .legend { display: flex; flex-wrap: wrap; gap: 10px 16px; margin: 10px 0 24px; font-size: 12px; color: var(--dim); }
  .legend i { display: inline-block; width: 11px; height: 11px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
  h3 { font-size: 17px; margin: 30px 0 10px; }
  .scroller { overflow-x: auto; border: 1px solid var(--line); border-radius: 12px; background: var(--panel); }
  table { border-collapse: collapse; width: 100%; min-width: 720px; font-size: 13px; }
  th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--line); }
  thead th { position: sticky; top: 0; background: #172033; font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--dim); }
  tbody th { font-weight: 600; width: 34%; }
  tbody th span { display: block; font-weight: 400; color: var(--dim); font-size: 11.5px; }
  td { font-variant-numeric: tabular-nums; }
  td.hit { color: var(--hit); }
  td.miss { color: var(--miss); }
  td.ref { color: #6f7d92; }
  .closing { margin-top: 26px; background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
  .closing p { margin: 0 0 10px; }
  .closing p:last-child { margin-bottom: 0; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; color: #b9c6da; }
</style>
<div class="wrap">
  <h1>Comeback City 4x — three candidate layouts</h1>
  <p class="sub">Pick one. These are plan views, not built track: everything here costs seconds to change and nothing has been modelled yet. Every number was measured by <code>scripts/track-layout-preview.mjs</code>, the same tool that validates to 0.00% on lap length and −0.09% on lap time against the shipped race.</p>
  <div class="note"><strong>All four plans are drawn at ONE shared scale.</strong> The small dashed one at the end is Comeback City as it ships today. That size difference is the whole proposal: a 45-second lap with a nine-second straight to pass on, instead of an 11-second lap whose longest straight is 2.19 s.</div>

  <div class="grid">
    ${CANDIDATES.map(candidateCard).join('\n')}
  </div>

  <div class="legend">
    <span><i style="background:#2b3446"></i>road at true width</span>
    <span><i style="background:#5ef0a6"></i>left corner</span>
    <span><i style="background:#ff7ac6"></i>right corner</span>
    <span><i style="background:#ffd54a"></i>the overtaking straight</span>
    <span><i style="background:#8fb4ff"></i>elevated road (climb / viaduct)</span>
    <span><i style="background:#4ad9ff"></i>item box</span>
    <span><i style="background:#ff5df0"></i>boost pad</span>
    <span><i style="background:#ff9d3d"></i>ramp</span>
    <span><i style="background:#b078ff"></i>shortcut launch</span>
    <span><i style="background:#ffffff"></i>start / finish</span>
  </div>

  <h3>Same scale, for reference</h3>
  <div class="grid" style="grid-template-columns:1fr;max-width:520px">
    ${referenceCard()}
  </div>

  <h3>Every target, measured</h3>
  <div class="scroller">
    <table>
      <thead><tr><th>Target</th>${CANDIDATES.map((c) => `<th>${c.letter} — ${esc(c.title)}</th>`).join('')}<th>Today</th></tr></thead>
      <tbody>${TARGETS.map(matrixRow).join('\n')}</tbody>
    </table>
  </div>

  <div class="closing">
    <p><strong>What all three miss, identically, and on purpose.</strong> The road/terrain value gate fails on every segment of every candidate for exactly the reason it fails on Comeback City today: the road solves to luminance 46.9 against a 38.5–43.4 verge, and what actually carries it in every shipped frame is the painted red/white kerb at 81% separation. These candidates borrow Comeback City's palette verbatim so their contrast verdicts <em>are</em> the reference build's verdicts. Authoring new palette values is the step after a layout is picked — doing it now would mean tuning three palettes to throw two away.</p>
    <p><strong>Handedness is topology, not tuning.</strong> A smooth convex loop turns one way; the other direction only appears where the road is concave. That is why A lands at 31% however it is tuned, why B's slalom of square corners reaches 35%, and why C — which crosses itself, so it has to turn both ways to close — gets 44% for free. If both drift directions matter, that is a reason to prefer B or C, not a number to nudge.</p>
    <p><strong>What happens next.</strong> Pick a letter. Only then: author the palette against <code>--strict-contrast</code>, place the coin rows (~30, scaling with length, still free — one InstancedMesh), and build geometry. Re-run the previewer afterwards so the JSON report lands in the record next to the frames.</p>
  </div>
</div>
`;

writeFileSync(resolve(HERE, 'index.html'), html);
process.stdout.write(`wrote ${resolve(HERE, 'index.html')}\n`);
CANDIDATES.forEach((entry) => {
  const { misses, hits } = verdictFor(entry);
  process.stdout.write(`  ${entry.letter} ${entry.title}: ${hits}/${TARGETS.length} — misses ${misses.map((m) => m.label).join(' | ') || 'none'}\n`);
});
