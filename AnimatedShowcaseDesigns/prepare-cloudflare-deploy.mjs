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
  "world-layout.js",
  "world-data.js",
  "vendor/three/three.module.min.js",
  "vendor/three/three.core.min.js",
  "thanks.html",
  "404.html",
  "privacy.html",
  "terms.html",
  "favicon.svg",
  "og-image.png",
  "robots.txt",
  "sitemap.xml",
  "img/world/gallery-room/gallery-room-master-desktop-empty.webp",
  "img/world/gallery-room/gallery-room-master-desktop-empty.avif",
  "img/world/gallery-room/gallery-room-master-mobile-empty.jpg",
  "img/world/gallery-room/gallery-room-master-mobile-empty.webp",
  "img/world/gallery-room/station-inspect-plate-empty.webp",
  "img/world/gallery-room/station-inspect-plate-empty.avif",
  "img/world/gallery-room/traileranimated12-poster.jpg",
  "img/world/gallery-room/traileranimated12.mp4",
  "img/world/gallery-room/reconstructed-gallery.glb",
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
