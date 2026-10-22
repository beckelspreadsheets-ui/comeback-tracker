// Generate a music track with the ElevenLabs Music API (paid plan: the
// account's terms cover commercial use of the output — owner to confirm).
//
//   node scripts/elevenlabs-music.mjs <out.mp3> --prompt "..." --length-ms 95000
//   node scripts/elevenlabs-music.mjs <out.mp3> --plan plan.json [--model music_v1]
//     --model music_v2_5     music_v1 | music_v2 | music_v2_5 (default music_v2_5)
//     --format mp3_44100_192 any output_format the API lists
//     --vocals               allow vocals (default: force_instrumental)
//
// THE KEY. It lives in the macOS Keychain, put there by the owner in his own
// Terminal:
//   security add-generic-password -U -a "$USER" -s elevenlabs-api-key -w
// This script reads it into memory and sends it as the xi-api-key header via
// fetch — never in argv (where `ps` would show it), never printed, never
// written anywhere. Every call spends credits, so there is no retry loop:
// a failure prints the API's message and stops.
//
// A --plan file is the API's composition_plan object verbatim: a MusicPrompt
// ({positive_global_styles, negative_global_styles, sections}) for music_v1,
// or a CompositionPlan ({chunks}) for music_v2 / music_v2_5.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const positional = [];
const opts = {};
for (let i = 0; i < args.length; i += 1) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    const next = args[i + 1];
    if (next === undefined || next.startsWith('--')) opts[key] = true;
    else {
      opts[key] = next;
      i += 1;
    }
  } else positional.push(args[i]);
}
const [outFile] = positional;
if (!outFile || (!opts.prompt && !opts.plan)) {
  console.error('usage: node scripts/elevenlabs-music.mjs <out.mp3> (--prompt "..." --length-ms N | --plan plan.json) [--model id] [--format fmt] [--vocals]');
  process.exit(2);
}

const keychain = spawnSync('security', ['find-generic-password', '-a', process.env.USER || '', '-s', 'elevenlabs-api-key', '-w'], {
  encoding: 'utf8',
});
const apiKey = keychain.status === 0 ? keychain.stdout.trim() : '';
if (!apiKey) {
  console.error('No ElevenLabs key in the Keychain. The owner adds it in his own Terminal with:');
  console.error('  security add-generic-password -U -a "$USER" -s elevenlabs-api-key -w');
  process.exit(2);
}

const model = opts.model || 'music_v2_5';
const format = opts.format || 'mp3_44100_192';
const body = { model_id: model };
if (opts.plan) {
  body.composition_plan = JSON.parse(readFileSync(opts.plan, 'utf8'));
} else {
  body.prompt = String(opts.prompt);
  if (opts['length-ms']) body.music_length_ms = Number(opts['length-ms']);
  body.force_instrumental = !opts.vocals;
}

const started = Date.now();
const response = await fetch(`https://api.elevenlabs.io/v1/music?output_format=${encodeURIComponent(format)}`, {
  body: JSON.stringify(body),
  headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
  method: 'POST',
});
if (!response.ok) {
  // The error body never echoes the key; print it so the cause is visible.
  const text = await response.text();
  console.error(`FAIL ${response.status}: ${text.slice(0, 600)}`);
  process.exit(1);
}
const bytes = Buffer.from(await response.arrayBuffer());
mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
writeFileSync(outFile, bytes);
const songId = response.headers.get('song-id') || response.headers.get('x-song-id') || '';
const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outFile], { encoding: 'utf8' });
const meta = {
  bytes: bytes.length,
  durationS: Number(probe.stdout.trim()) || null,
  format,
  generatedAt: new Date().toISOString(),
  model,
  request: opts.plan ? { composition_plan: opts.plan } : { music_length_ms: body.music_length_ms, prompt: body.prompt },
  seconds: Number(((Date.now() - started) / 1000).toFixed(1)),
  songId,
};
// A receipt next to the take: what was asked for and when, for the rights file.
writeFileSync(`${outFile}.json`, JSON.stringify(meta, null, 2));
console.log(`wrote ${outFile}  ${(bytes.length / 1024).toFixed(0)} KiB  ${meta.durationS ?? '?'} s  ${model}${songId ? `  song ${songId}` : ''}  (${meta.seconds}s)`);
