import { createServer } from "node:http";
import { readFileSync, mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { inflateSync } from "node:zlib";

const root = process.cwd();
const rootPrefix = root.endsWith("/") ? root : `${root}/`;
const verificationDir = join(root, "verification");
const checks = [];

function pass(name, detail = "") {
  checks.push({ name, ok: true, detail });
  console.log(`ok - ${name}${detail ? ` (${detail})` : ""}`);
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  throw new Error(`${name}: ${detail}`);
}

function assert(name, condition, detail = "assertion failed") {
  if (!condition) fail(name, detail);
  pass(name, detail);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: options.timeout || 15000,
    stdio: options.stdio || "pipe"
  });
  if (result.error) throw result.error;
  return result;
}

function chromePath() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;

  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "google-chrome",
    "chromium",
    "chromium-browser"
  ];

  for (const candidate of candidates) {
    try {
      const probe = run(candidate, ["--version"], { timeout: 4000 });
      if (probe.status === 0) return candidate;
    } catch {}
  }

  throw new Error("Chrome/Chromium not found. Set CHROME_BIN to a headless-capable browser.");
}

function mimeType(path) {
  const ext = extname(path).toLowerCase();
  if (ext === ".html") return "text/html";
  if (ext === ".js" || ext === ".mjs") return "text/javascript";
  if (ext === ".css") return "text/css";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".txt") return "text/plain";
  if (ext === ".xml") return "application/xml";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

function startServer() {
  const server = createServer((request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const rewrites = new Map([
      ["/", "/index.html"],
      ["/world", "/world.html"],
      ["/thanks", "/thanks.html"]
    ]);
    const pathname = rewrites.get(url.pathname) || url.pathname;
    const filePath = resolve(root, `.${pathname}`);

    if (filePath !== root && !filePath.startsWith(rootPrefix)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    try {
      const body = readFileSync(filePath);
      response.writeHead(200, { "Content-Type": mimeType(filePath) });
      response.end(body);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("Not found");
    }
  });

  return new Promise((resolveServer) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolveServer({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

function captureScreenshot(browser, origin, path, width, height, outputName) {
  mkdirSync(verificationDir, { recursive: true });
  const profile = mkdtempSync(join(tmpdir(), "showcase-photo-match-"));
  const output = join(verificationDir, outputName);
  rmSync(output, { force: true });
  const child = spawn(browser, [
    "--headless=new",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--force-device-scale-factor=1",
    "--hide-scrollbars",
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    "--virtual-time-budget=8000",
    `--screenshot=${output}`,
    `${origin}${path}`
  ], { cwd: root, stdio: ["ignore", "ignore", "pipe"] });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  return new Promise((resolveShot, rejectShot) => {
    const started = Date.now();
    const poll = setInterval(() => {
      const outputStat = statSync(output, { throwIfNoEntry: false });
      if (outputStat?.isFile() && outputStat.size > 0) {
        child.kill("SIGTERM");
      }

      if (Date.now() - started > 15000) {
        child.kill("SIGTERM");
      }
    }, 250);

    child.on("error", (error) => {
      clearInterval(poll);
      rmSync(profile, { recursive: true, force: true });
      rejectShot(error);
    });

    child.on("close", () => {
      clearInterval(poll);
      const outputStat = statSync(output, { throwIfNoEntry: false });
      rmSync(profile, { recursive: true, force: true });
      if (!outputStat?.isFile() || outputStat.size <= 0) {
        rejectShot(new Error(stderr || `Chrome failed to capture ${path}`));
        return;
      }
      resolveShot({ path: output, bytes: readFileSync(output) });
    });
  });
}

function readUInt32(bytes, offset) {
  return bytes.readUInt32BE(offset);
}

function parsePng(bytes) {
  const signature = "89504e470d0a1a0a";
  if (bytes.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("Not a PNG");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (offset < bytes.length) {
    const length = readUInt32(bytes, offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    const data = bytes.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = readUInt32(data, 0);
      height = readUInt32(data, 4);
      bitDepth = data[8];
      colorType = data[9];
    }

    if (type === "IDAT") idat.push(data);
    if (type === "IEND") break;

    offset += length + 12;
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}`);
  }

  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const rows = [];
  let rawOffset = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset];
    rawOffset += 1;
    const row = Buffer.from(raw.subarray(rawOffset, rawOffset + stride));
    rawOffset += stride;

    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? row[x - channels] : 0;
      const up = previous[x] || 0;
      const upLeft = x >= channels ? previous[x - channels] || 0 : 0;

      if (filter === 1) row[x] = (row[x] + left) & 255;
      if (filter === 2) row[x] = (row[x] + up) & 255;
      if (filter === 3) row[x] = (row[x] + Math.floor((left + up) / 2)) & 255;
      if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        row[x] = (row[x] + predictor) & 255;
      }
    }

    rows.push(row);
    previous = row;
  }

  return { width, height, channels, rows };
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function regionStats(png, region, grid = 90) {
  const x0 = Math.max(0, Math.floor(png.width * region.x0));
  const x1 = Math.min(png.width, Math.floor(png.width * region.x1));
  const y0 = Math.max(0, Math.floor(png.height * region.y0));
  const y1 = Math.min(png.height, Math.floor(png.height * region.y1));
  const values = [];
  let bright = 0;
  let warm = 0;
  let nonDark = 0;
  let veryDark = 0;

  for (let sy = 0; sy < grid; sy += 1) {
    const y = Math.min(y1 - 1, y0 + Math.floor(((y1 - y0) * sy) / grid));
    const row = png.rows[y];

    for (let sx = 0; sx < grid; sx += 1) {
      const x = Math.min(x1 - 1, x0 + Math.floor(((x1 - x0) * sx) / grid));
      const index = x * png.channels;
      const r = row[index];
      const g = row[index + 1];
      const b = row[index + 2];
      const lum = luminance(r, g, b);
      values.push(lum);
      if (lum > 92) bright += 1;
      if (lum > 24) nonDark += 1;
      if (lum < 10) veryDark += 1;
      if (r > g * 0.98 && g > b * 1.05 && lum > 24) warm += 1;
    }
  }

  const samples = values.length;
  const average = values.reduce((sum, value) => sum + value, 0) / samples;
  const variance = values.reduce((sum, value) => sum + ((value - average) ** 2), 0) / samples;
  return {
    average,
    stddev: Math.sqrt(variance),
    brightRatio: bright / samples,
    warmRatio: warm / samples,
    nonDarkRatio: nonDark / samples,
    veryDarkRatio: veryDark / samples,
    samples
  };
}

function brightColumnClusters(png, region, threshold = 118) {
  const x0 = Math.max(0, Math.floor(png.width * region.x0));
  const x1 = Math.min(png.width, Math.floor(png.width * region.x1));
  const y0 = Math.max(0, Math.floor(png.height * region.y0));
  const y1 = Math.min(png.height, Math.floor(png.height * region.y1));
  const active = [];

  for (let x = x0; x < x1; x += 2) {
    let hits = 0;
    let samples = 0;
    for (let y = y0; y < y1; y += 4) {
      const row = png.rows[y];
      const index = x * png.channels;
      const lum = luminance(row[index], row[index + 1], row[index + 2]);
      if (lum > threshold) hits += 1;
      samples += 1;
    }
    active.push(hits / samples > 0.08);
  }

  let clusters = 0;
  let width = 0;
  let activeColumns = 0;
  for (const isActive of active) {
    if (isActive) {
      activeColumns += 1;
      width += 1;
      continue;
    }
    if (width >= 8) clusters += 1;
    width = 0;
  }
  if (width >= 8) clusters += 1;

  return { clusters, activeColumns, columns: active.length };
}

function fmt(stats) {
  return `avg=${stats.average.toFixed(1)} sd=${stats.stddev.toFixed(1)} nonDark=${stats.nonDarkRatio.toFixed(2)} bright=${stats.brightRatio.toFixed(2)} warm=${stats.warmRatio.toFixed(2)}`;
}

function assertDesktopPhotoMatch(bytes) {
  const png = parsePng(bytes);
  assert("desktop photo-match screenshot size", png.width >= 1300 && png.height >= 820, `${png.width}x${png.height}`);

  const ceiling = regionStats(png, { x0: 0.08, x1: 0.92, y0: 0.06, y1: 0.2 });
  const glass = regionStats(png, { x0: 0.02, x1: 0.23, y0: 0.14, y1: 0.72 });
  const wall = regionStats(png, { x0: 0.28, x1: 0.93, y0: 0.18, y1: 0.62 });
  const frameBand = regionStats(png, { x0: 0.22, x1: 0.78, y0: 0.24, y1: 0.63 });
  const floor = regionStats(png, { x0: 0.14, x1: 0.9, y0: 0.62, y1: 0.94 });
  const bench = regionStats(png, { x0: 0.36, x1: 0.78, y0: 0.56, y1: 0.82 });
  const frames = brightColumnClusters(png, { x0: 0.22, x1: 0.78, y0: 0.24, y1: 0.63 });

  assert("desktop ceiling/cove is visible", ceiling.average > 18 && ceiling.stddev > 13 && ceiling.warmRatio > 0.05, fmt(ceiling));
  assert("desktop left glass wall has visible depth", glass.average > 13 && glass.stddev > 12 && glass.nonDarkRatio > 0.18, fmt(glass));
  assert("desktop graphite wall is not a flat black plane", wall.average > 17 && wall.stddev > 15 && wall.nonDarkRatio > 0.26, fmt(wall));
  assert("desktop hero exhibits read as three bright framed artworks", frames.clusters >= 3 && frameBand.brightRatio > 0.035, `clusters=${frames.clusters} active=${frames.activeColumns}/${frames.columns}; ${fmt(frameBand)}`);
  assert("desktop polished floor has warm reflected light", floor.average > 18 && floor.stddev > 15 && floor.warmRatio > 0.05 && floor.brightRatio > 0.018, fmt(floor));
  assert("desktop ottoman is visible and grounded", bench.average > 11 && bench.stddev > 12 && bench.veryDarkRatio < 0.62, fmt(bench));
}

function assertMobilePhotoMatch(bytes) {
  const png = parsePng(bytes);
  assert("mobile photo-match screenshot size", png.width >= 360 && png.height >= 760, `${png.width}x${png.height}`);

  const scene = regionStats(png, { x0: 0.06, x1: 0.94, y0: 0.08, y1: 0.72 });
  const lower = regionStats(png, { x0: 0.06, x1: 0.94, y0: 0.54, y1: 0.82 });

  assert("mobile scene has visible gallery detail", scene.average > 13 && scene.stddev > 14 && scene.nonDarkRatio > 0.18, fmt(scene));
  assert("mobile lower view keeps floor/foreground readable", lower.average > 10 && lower.stddev > 10 && lower.veryDarkRatio < 0.76, fmt(lower));
}

async function main() {
  const browser = chromePath();
  const externalOrigin = process.env.SHOWCASE_ORIGIN ? process.env.SHOWCASE_ORIGIN.replace(/\/$/, "") : "";
  const preview = externalOrigin ? { server: null, origin: externalOrigin } : await startServer();
  const outputPrefix = externalOrigin ? "photo-match-production" : "photo-match";
  try {
    const desktop = await captureScreenshot(
      browser,
      preview.origin,
      "/world?try=1&qa=minimal&presentation=1",
      1440,
      900,
      `${outputPrefix}-desktop.png`
    );
    const mobile = await captureScreenshot(
      browser,
      preview.origin,
      "/world?try=1&qa=minimal&presentation=1",
      390,
      844,
      `${outputPrefix}-mobile.png`
    );

    assertDesktopPhotoMatch(desktop.bytes);
    assertMobilePhotoMatch(mobile.bytes);
    console.log(`\n${checks.length} photo-match checks passed.`);
    console.log(`Origin: ${preview.origin}`);
    console.log(`Desktop capture: ${desktop.path}`);
    console.log(`Mobile capture: ${mobile.path}`);
  } finally {
    if (preview.server) {
      await new Promise((resolveClose) => preview.server.close(resolveClose));
    }
  }
}

main().catch((error) => {
  console.error(`\nPhoto-match verification failed: ${error.message}`);
  process.exit(1);
});
