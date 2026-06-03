import { cpSync, mkdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const outDir = join(root, "dist");

const files = [
  "_headers",
  "_redirects",
  "index.html",
  "v3-preview.html",
  "world.html",
  "world.css",
  "world.js",
  "world-data.js",
  "thanks.html",
  "404.html",
  "privacy.html",
  "terms.html",
  "favicon.svg",
  "og-image.png",
  "robots.txt",
  "sitemap.xml",
  "img/world/photo-match-room-plate.webp",
  "img/world/evenpath-mobile.jpg",
  "img/world/felco-mobile.jpg",
  "img/world/abel-mobile.jpg",
  "img/world/beckel-mobile.jpg"
];

function copyFile(relativePath) {
  const source = join(root, relativePath);
  const target = join(outDir, relativePath);
  const sourceStat = statSync(source, { throwIfNoEntry: false });
  if (!sourceStat?.isFile()) {
    throw new Error(`Missing deploy asset: ${relativePath}`);
  }
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

files.forEach(copyFile);

console.log(`Prepared Cloudflare Pages deploy output in dist/ with ${files.length} files.`);
