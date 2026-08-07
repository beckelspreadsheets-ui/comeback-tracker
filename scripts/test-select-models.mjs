// Does every roster entry have a model the select screen can show?
//
//   node scripts/test-select-models.mjs
//
// This gate exists because of a bug it would have caught the day it landed.
// AAA wave 8 added five kart bodies to KART_OPTIONS — hash-runner, cold-wallet,
// sat-stacker, pixel-pickup, node-runner — and nobody added portraits for them.
// KART_OPTIONS carried 12 karts, KART_PORTRAITS carried 7, and the select
// screen quietly rendered `<img src={undefined}>` for five of twelve. No build
// error, no console error, no failing test: just five broken tiles on the first
// screen of the game, sitting there through every wave since.
//
// The lesson is that a roster and its art are two lists that must be the same
// length, and nothing was checking. So: fail if a character or kart can be
// picked but not shown, and fail if a model file named in the manifest is not
// actually on disk (a rename would otherwise surface as an empty stage).
//
// Deliberately parses the manifest as text instead of importing it — the
// module is full of Vite `?url` imports that plain Node cannot resolve.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KART_TRACKS } from '../src/game/race/tracks/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'src', 'kart', 'selectModels.js');
const monolithPath = path.join(root, 'src', 'game', 'ComebackCityThreeKartRace.jsx');

const manifest = readFileSync(manifestPath, 'utf8');
const monolith = readFileSync(monolithPath, 'utf8');

const failures = [];
const check = (name, ok, detail = '') => {
  process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` — ${detail}`}\n`);
  if (!ok) failures.push(name);
};

// Roster keys, read from the monolith's own arrays.
const keysFrom = (source, marker) => {
  const start = source.indexOf(marker);
  if (start < 0) return [];
  const end = source.indexOf('\n];', start);
  return [...source.slice(start, end).matchAll(/\bkey: '([^']+)'/g)].map((match) => match[1]);
};
const characterKeys = keysFrom(monolith, 'export const KART_CHARACTERS = [');
const kartKeys = keysFrom(monolith, 'export const KART_OPTIONS = [');

check('found the character roster', characterKeys.length > 0, 'KART_CHARACTERS did not parse');
check('found the kart roster', kartKeys.length > 0, 'KART_OPTIONS did not parse');

// Manifest keys + the file each points at.
const importPaths = Object.fromEntries(
  [...manifest.matchAll(/import\s+(\w+)\s+from\s+'([^']+\.glb)\?url'/g)].map((match) => [match[1], match[2]])
);
const mapKeys = (mapName) => {
  const start = manifest.indexOf(`export const ${mapName} = {`);
  const end = manifest.indexOf('\n};', start);
  const body = manifest.slice(start, end);
  return Object.fromEntries(
    [...body.matchAll(/^\s{2}'?([\w-]+)'?:\s*(\w+),/gm)].map((match) => [match[1], match[2]])
  );
};
const characterModels = mapKeys('SELECT_CHARACTER_MODELS');
const kartModels = mapKeys('SELECT_KART_MODELS');

const missingCharacters = characterKeys.filter((key) => !characterModels[key]);
const missingKarts = kartKeys.filter((key) => !kartModels[key]);
check(
  `every character is showable (${characterKeys.length})`,
  missingCharacters.length === 0,
  `no model for: ${missingCharacters.join(', ')}`
);
check(
  `every kart is showable (${kartKeys.length})`,
  missingKarts.length === 0,
  `no model for: ${missingKarts.join(', ')}`
);

// Every referenced GLB is really on disk.
const brokenFiles = [];
Object.entries({ ...characterModels, ...kartModels }).forEach(([key, binding]) => {
  const relative = importPaths[binding];
  if (!relative) {
    brokenFiles.push(`${key} (no import named ${binding})`);
    return;
  }
  const resolved = path.resolve(path.dirname(manifestPath), relative);
  if (!existsSync(resolved)) brokenFiles.push(`${key} -> ${relative}`);
});
check('every referenced model exists on disk', brokenFiles.length === 0, brokenFiles.join('; '));

// The picker tiles still use flat portrait plates — correct, they are a grid
// you choose from, not the hero view. But THIS is the map that actually broke:
// KART_PORTRAITS in KartApp.jsx had 7 entries against 12 karts. Check it the
// same way, or the bug just comes back on the next roster addition.
const kartApp = readFileSync(path.join(root, 'src', 'kart', 'KartApp.jsx'), 'utf8');
const portraitKeys = (mapName) => {
  const start = kartApp.indexOf(`const ${mapName} = {`);
  const end = kartApp.indexOf('\n};', start);
  return [...kartApp.slice(start, end).matchAll(/^\s{2}'?([\w-]+)'?:\s*\w+,/gm)].map((match) => match[1]);
};
const characterPortraits = portraitKeys('CHARACTER_PORTRAITS');
const kartPortraits = portraitKeys('KART_PORTRAITS');
const missingCharPortraits = characterKeys.filter((key) => !characterPortraits.includes(key));
const missingKartPortraits = kartKeys.filter((key) => !kartPortraits.includes(key));
check(
  'every character has a picker portrait',
  missingCharPortraits.length === 0,
  `no portrait for: ${missingCharPortraits.join(', ')}`
);
check(
  'every kart has a picker portrait',
  missingKartPortraits.length === 0,
  `no portrait for: ${missingKartPortraits.join(', ')}`
);

// The stage lights itself from the SHIPPED track palettes. raceSceneTheme.js is
// marked LEGACY and the monolith imports none of it, so a stage lit from there
// would look correct in code and wrong on screen.
const unlitTracks = KART_TRACKS.filter((track) => !track.palette?.sun || !track.palette?.sunColor).map((t) => t.key);
check('every track exposes a key light for the stage', unlitTracks.length === 0, unlitTracks.join(', '));

process.stdout.write(`\n${failures.length ? `FAIL: ${failures.length} check(s)` : 'PASS: select models'}\n`);
if (failures.length) process.exit(1);
