import { readFileSync } from 'node:fs';
const pairs = JSON.parse(readFileSync('uploads.json', 'utf8'));
for (const [file, url] of pairs) {
  const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: readFileSync(file) });
  console.log(file, res.status);
}
