import { createServer } from "node:http";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { inflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { stations } from "./world-data.js";

const root = process.cwd();
const rootPrefix = root.endsWith("/") ? root : `${root}/`;
const checks = [];

function pass(name) {
  checks.push({ name, ok: true });
  console.log(`ok - ${name}`);
}

function fail(name, message) {
  checks.push({ name, ok: false, message });
  throw new Error(`${name}: ${message}`);
}

function assert(name, condition, message = "assertion failed") {
  if (!condition) fail(name, message);
  pass(name);
}

function readText(path) {
  return readFileSync(join(root, path), "utf8");
}

function parseJsonLd(html) {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error("JSON-LD script not found");
  }
  return JSON.parse(match[1]);
}

function fileExists(path) {
  try {
    return statSync(join(root, path)).isFile();
  } catch {
    return false;
  }
}

function fileSize(path) {
  return statSync(join(root, path)).size;
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(join(root, path))).digest("hex");
}

function listFilesRecursive(relativeDir) {
  const dir = join(root, relativeDir);
  const dirStat = statSync(dir, { throwIfNoEntry: false });
  if (!dirStat?.isDirectory()) return [];

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = `${relativeDir}/${entry.name}`;
    return entry.isDirectory() ? listFilesRecursive(relativePath) : [relativePath];
  });
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
      const notFoundPath = resolve(root, "./404.html");
      const body = readFileSync(notFoundPath);
      response.writeHead(404, { "Content-Type": "text/html" });
      response.end(body);
    }
  });

  return new Promise((resolveServer) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolveServer({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

function startLocalPreviewServer(args = []) {
  const child = spawn("node", ["serve-local.mjs", "--port", "0", ...args], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";
  let settled = false;

  return new Promise((resolvePreview, rejectPreview) => {
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      if (!settled) {
        settled = true;
        rejectPreview(new Error(stderr || "Timed out starting serve-local.mjs"));
      }
    }, 5000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      const match = stdout.match(/http:\/\/127\.0\.0\.1:(\d+)\//);
      if (match && !settled) {
        settled = true;
        clearTimeout(timer);
        resolvePreview({ child, origin: `http://127.0.0.1:${match[1]}` });
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        rejectPreview(error);
      }
    });

    child.on("close", () => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        rejectPreview(new Error(stderr || stdout || "serve-local.mjs exited before listening"));
      }
    });
  });
}

async function fetchText(origin, path) {
  const response = await fetch(`${origin}${path}`);
  return {
    status: response.status,
    headers: response.headers,
    body: await response.text()
  };
}

function dumpDom(browser, origin, path, extraArgs = [], options = {}) {
  const profile = mkdtempSync(join(tmpdir(), "showcase-world-"));
  const child = spawn(browser, [
    "--headless=new",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    `--user-data-dir=${profile}`,
    "--window-size=500,844",
    `--virtual-time-budget=${options.virtualTimeBudget || 4500}`,
    "--dump-dom",
    ...extraArgs,
    `${origin}${path}`
  ], { cwd: root, detached: true, stdio: ["ignore", "pipe", "pipe"] });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  function killDump(signal) {
    if (!child.pid) return;
    try {
      process.kill(-child.pid, signal);
    } catch (error) {
      try {
        child.kill(signal);
      } catch (innerError) {}
    }
  }

  return new Promise((resolveDom, rejectDom) => {
    let timedOut = false;
    let killTimer = null;
    const timer = setTimeout(() => {
      timedOut = true;
      killDump("SIGTERM");
      killTimer = setTimeout(() => killDump("SIGKILL"), 1500);
    }, options.timeout || 30000);

    child.on("error", (error) => {
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      rmSync(profile, { recursive: true, force: true });
      rejectDom(error);
    });

    child.on("close", () => {
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      rmSync(profile, { recursive: true, force: true });

      if (timedOut && !stdout) {
        rejectDom(new Error(`Chrome timed out dumping DOM for ${path}`));
        return;
      }

      if (!stdout) {
        rejectDom(new Error(stderr || `Chrome produced no DOM for ${path}`));
        return;
      }

      resolveDom(stdout);
    });
  });
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function numericAttr(text, name) {
  const match = text.match(new RegExp(`${name}="([0-9]+)"`));
  return match ? Number(match[1]) : NaN;
}

function attrValue(text, name) {
  const match = text.match(new RegExp(`${name}="([^"]*)"`));
  return match ? match[1] : "";
}

function parseKeyValueProbe(value) {
  return Object.fromEntries(value.split(";").map((item) => {
    const [key, raw] = item.split(":");
    return [key, Number(raw)];
  }));
}

function captureScreenshot(browser, origin, path, width, height) {
  const profile = mkdtempSync(join(tmpdir(), "showcase-world-shot-"));
  const output = join(profile, "screenshot.png");
  const child = spawn(browser, [
    "--headless=new",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    "--virtual-time-budget=7000",
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

      if (Date.now() - started > 12000) {
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
      if (!outputStat?.isFile()) {
        rmSync(profile, { recursive: true, force: true });
        rejectShot(new Error(stderr || `Chrome failed to capture ${path}`));
        return;
      }

      const bytes = readFileSync(output);
      rmSync(profile, { recursive: true, force: true });
      resolveShot(bytes);
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

function parseJpegDimensions(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error("Not a JPEG");
  }

  let offset = 2;
  while (offset < bytes.length) {
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 2 > bytes.length) break;

    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) break;

    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return {
        width: bytes.readUInt16BE(offset + 5),
        height: bytes.readUInt16BE(offset + 3)
      };
    }

    offset += length;
  }

  throw new Error("JPEG dimensions not found");
}

function sampleScenePixels(png) {
  const x0 = Math.floor(png.width * 0.32);
  const x1 = png.width;
  const y0 = Math.floor(png.height * 0.08);
  const y1 = Math.floor(png.height * 0.72);
  let nonDark = 0;
  let bright = 0;
  let samples = 0;

  for (let sy = 0; sy < 80; sy += 1) {
    const y = Math.min(y1 - 1, y0 + Math.floor(((y1 - y0) * sy) / 80));
    const row = png.rows[y];

    for (let sx = 0; sx < 80; sx += 1) {
      const x = Math.min(x1 - 1, x0 + Math.floor(((x1 - x0) * sx) / 80));
      const index = x * png.channels;
      const total = row[index] + row[index + 1] + row[index + 2];
      if (total > 36) nonDark += 1;
      if (total > 180) bright += 1;
      samples += 1;
    }
  }

  return { nonDark, bright, samples };
}

function samplePagePixels(png) {
  const x0 = Math.floor(png.width * 0.05);
  const x1 = Math.floor(png.width * 0.95);
  const y0 = Math.floor(png.height * 0.08);
  const y1 = Math.floor(png.height * 0.92);
  let nonDark = 0;
  let bright = 0;
  let warm = 0;
  let samples = 0;

  for (let sy = 0; sy < 80; sy += 1) {
    const y = Math.min(y1 - 1, y0 + Math.floor(((y1 - y0) * sy) / 80));
    const row = png.rows[y];

    for (let sx = 0; sx < 80; sx += 1) {
      const x = Math.min(x1 - 1, x0 + Math.floor(((x1 - x0) * sx) / 80));
      const index = x * png.channels;
      const r = row[index];
      const g = row[index + 1];
      const b = row[index + 2];
      const total = r + g + b;
      if (total > 36) nonDark += 1;
      if (total > 180) bright += 1;
      if (r > g && g > b && total > 120) warm += 1;
      samples += 1;
    }
  }

  return { nonDark, bright, warm, samples };
}

function assertSceneScreenshot(name, bytes) {
  const png = parsePng(bytes);
  const pixels = sampleScenePixels(png);
  assert(`${name} screenshot size`, png.width >= 500 && png.height >= 650, `${png.width}x${png.height}`);
  assert(`${name} scene pixels`, pixels.nonDark > 500 && pixels.bright > 100, JSON.stringify(pixels));
}

function assertStaticScreenshot(name, bytes) {
  const png = parsePng(bytes);
  const pixels = samplePagePixels(png);
  assert(`${name} screenshot size`, png.width >= 500 && png.height >= 650, `${png.width}x${png.height}`);
  assert(`${name} page pixels`, pixels.nonDark > 800 && pixels.bright > 120 && pixels.warm > 20, JSON.stringify(pixels));
}

const index = readText("index.html");
const preview = readText("v3-preview.html");
const world = readText("world.html");
const thanks = readText("thanks.html");
const notFound = readText("404.html");
const privacy = readText("privacy.html");
const terms = readText("terms.html");
const worldCss = readText("world.css");
const worldJs = readText("world.js");
const photoVerifier = readText("verify-photo-match.mjs");
const readme = readText("README.md");
const stationTexturePaths = stations.map((station) => station.screenshotUrl.slice(1));
const photoPlatePath = "img/world/photo-match-room-plate.webp";
const staticSchema = parseJsonLd(index);

assert("index and v3 preview match", index === preview);
assert("static page has no Three.js payload", !/(three\.module|threejs|three\.js|cdnjs\.cloudflare\.com\/ajax\/libs\/three|unpkg\.com\/three)/i.test(index));

[
  "case-study-evenpath",
  "case-study-felco",
  "case-study-abel",
  "case-study-beckel"
].forEach((id) => assert(`static anchor ${id}`, index.includes(`id="${id}"`)));

assert("Gustavo is removed from public launch surfaces", !/gustavo|Gustavo/.test(`${index}\n${preview}\n${readText("world-data.js")}`));

[
  "world.html",
  "thanks.html",
  "404.html",
  "privacy.html",
  "terms.html",
  "world.css",
  "world.js",
  "world-data.js",
  "serve-local.mjs",
  "verify-production.mjs",
  "verify-outbound.mjs",
  "verify-photo-match.mjs",
  "verify-device-qa.mjs",
  "prepare-cloudflare-deploy.mjs",
  "generate-business-card-assets.mjs",
  "vercel.json",
  ".vercelignore",
  "_headers",
  "_redirects",
  "CLOUDFLARE_DEPLOY.md",
  "favicon.svg",
  "og-image.svg",
  "og-image.png",
  "robots.txt",
  "sitemap.xml",
  "DEVICE_QA.md",
  "DEVICE_QA_QUICK_START.md",
  "DEVICE_QA_RESULTS.md",
  "REQUIREMENTS_TRACE.md",
  "OPERATOR_INPUTS.md",
  "OUTBOUND_LINK_AUDIT.md",
  "LOCAL_BROWSER_AUDIT.md",
  "COMPLETION_AUDIT.md",
  "SHOWCASE_V3_LIVE_PRD_AUDIT.md",
  "PHOTO_MATCH_REVIEW.md",
  "LAUNCH_CHECKLIST.md",
  "PRODUCTION_AUDIT.md",
  "LAUNCH_ACQUISITION_SYSTEM.md",
  "FREE_WEBSITE_REVIEW_TEMPLATE.md",
  "CLIENT_ONBOARDING_REQUIREMENTS.md",
  "SEARCH_LOCAL_SEO_LAUNCH_SETUP.md",
  "OUTREACH_TRACKER.csv",
  "business-card/README.md",
  "business-card/showcase-business-card-front.svg",
  "business-card/showcase-business-card-back.svg",
  "business-card/showcase-business-card-qr.svg",
  "img/world/hyperrealistic-gallery-target-right.png",
  "img/world/hyperrealistic-gallery-target.png",
  photoPlatePath,
  ...stationTexturePaths
].forEach((path) => assert(`file exists ${path}`, fileExists(path)));

assert("pages use SVG favicon", index.includes('href="/favicon.svg"') && world.includes('href="/favicon.svg"') && !index.includes('href="/favicon.ico"') && !world.includes('href="/favicon.ico"'));
assert("legal pages use SVG favicon", privacy.includes('href="/favicon.svg"') && terms.includes('href="/favicon.svg"') && !privacy.includes('href="/favicon.ico"') && !terms.includes('href="/favicon.ico"'));
const ogPng = parsePng(readFileSync(join(root, "og-image.png")));
assert("Open Graph image is 1200x630 PNG", ogPng.width === 1200 && ogPng.height === 630);
const ogSvg = readText("og-image.svg");
assert("Open Graph source contains launch copy", ogSvg.includes("Showcase Designs") && ogSvg.includes("WEBSITES + LOCAL SEO") && ogSvg.includes("3D studio gallery"));
const vercelIgnore = readText(".vercelignore");
const gitIgnore = readText(".gitignore");
assert("Vercel ignore excludes repo-only artifacts", vercelIgnore.includes("*.md") && vercelIgnore.includes("verify-*.mjs") && vercelIgnore.includes("serve-local.mjs") && vercelIgnore.includes("verification/") && vercelIgnore.includes("dist/") && vercelIgnore.includes("deploy-artifacts/") && vercelIgnore.includes("img/*-mobile.png") && vercelIgnore.includes("og-image.svg"));
assert("Vercel ignore keeps required runtime assets", !["index.html", "world.html", "world.js", "world-data.js", "world.css", "og-image.png", "favicon.svg", "robots.txt", "sitemap.xml", photoPlatePath, ...stationTexturePaths].some((asset) => vercelIgnore.includes(asset)));
assert("generated Cloudflare dist stays gitignored", gitIgnore.includes("dist/") && gitIgnore.includes("deploy-artifacts/"));
const cloudflareHeaders = readText("_headers");
const cloudflareRedirects = readText("_redirects");
const cloudflareDeploy = readText("CLOUDFLARE_DEPLOY.md");
const operatorInputsForDeploy = readText("OPERATOR_INPUTS.md");
const productionAuditForDeploy = readText("PRODUCTION_AUDIT.md");
const deployArtifactMatch = cloudflareDeploy.match(/(deploy-artifacts\/showcase-designs-dist-[0-9-]+\.zip)\s+SHA256 ([a-f0-9]{64})/);
const deployArtifactIndex = deployArtifactMatch ? run("unzip", ["-p", deployArtifactMatch[1], "index.html"]) : null;
assert("Cloudflare redirects avoid clean-route loops", cloudflareRedirects.includes("built-in extensionless HTML routing") && cloudflareRedirects.includes("Do not add /world -> /world.html") && !cloudflareRedirects.includes("/world /world.html 200") && !cloudflareRedirects.includes("/thanks /thanks.html 200"));
assert("Cloudflare headers set conservative security headers", cloudflareHeaders.includes("X-Content-Type-Options: nosniff") && cloudflareHeaders.includes("Referrer-Policy: strict-origin-when-cross-origin") && cloudflareHeaders.includes("Permissions-Policy: camera=(), microphone=(), geolocation=()") && cloudflareHeaders.includes("X-Frame-Options: DENY"));
assert("Cloudflare deploy guide uses clean dist output", cloudflareDeploy.includes("Build command: node prepare-cloudflare-deploy.mjs") && cloudflareDeploy.includes("Build output directory: dist") && cloudflareDeploy.includes("Do not deploy the workspace root directly"));
assert("Cloudflare deploy guide documents direct upload path", cloudflareDeploy.includes("npx wrangler pages deploy dist --project-name <cloudflare-pages-project> --branch <production-branch>") && cloudflareDeploy.includes("Do not guess either value"));
assert("Cloudflare deploy guide rejects parent comeback tracker config", cloudflareDeploy.includes("Do not use the parent `../wrangler.toml`") && cloudflareDeploy.includes("comeback-tracker") && cloudflareDeploy.includes("is not evidence of the `showcase-designs.com` Cloudflare project"));
assert("Cloudflare deploy artifact is present and hash-matched", deployArtifactMatch && fileExists(deployArtifactMatch[1]) && sha256File(deployArtifactMatch[1]) === deployArtifactMatch[2]);
assert("Cloudflare deploy artifact contains current index", deployArtifactIndex?.status === 0 && deployArtifactIndex.stdout === index, deployArtifactIndex?.stderr || "index mismatch");
assert("Cloudflare deploy artifact references agree across audits", deployArtifactMatch && operatorInputsForDeploy.includes(deployArtifactMatch[1]) && operatorInputsForDeploy.includes(deployArtifactMatch[2]) && productionAuditForDeploy.includes(deployArtifactMatch[1]) && productionAuditForDeploy.includes(deployArtifactMatch[2]));
assert("preview deploy evidence documents current immutable build", ["https://7b30c5f6.showcase-designs-preview.pages.dev", "63 production checks passed", "10 photo-match checks passed", "Founder-Led", "No visible Cloudflare Pages project currently lists"].every((text) => operatorInputsForDeploy.includes(text) && productionAuditForDeploy.includes(text)) && operatorInputsForDeploy.includes("showcase-designs.com") && productionAuditForDeploy.includes("showcase-designs.com"));
const acquisitionSystem = readText("LAUNCH_ACQUISITION_SYSTEM.md");
const freeReviewTemplate = readText("FREE_WEBSITE_REVIEW_TEMPLATE.md");
const clientOnboarding = readText("CLIENT_ONBOARDING_REQUIREMENTS.md");
const searchLocalSetup = readText("SEARCH_LOCAL_SEO_LAUNCH_SETUP.md");
const outreachTracker = readText("OUTREACH_TRACKER.csv");
const cardReadme = readText("business-card/README.md");
const cardFront = readText("business-card/showcase-business-card-front.svg");
const cardBack = readText("business-card/showcase-business-card-back.svg");
const cardQr = readText("business-card/showcase-business-card-qr.svg");
const businessCardUrl = "https://showcase-designs.com/?utm_source=business_card&utm_medium=offline&utm_campaign=v3_launch";
const escapedBusinessCardUrl = businessCardUrl.replaceAll("&", "&amp;");
assert("launch acquisition system documents business card funnel", acquisitionSystem.includes(businessCardUrl) && acquisitionSystem.includes("Do not print cards until") && acquisitionSystem.includes("Manual Outreach Cadence") && acquisitionSystem.includes("Compliance Rules"));
assert("launch acquisition system links free review template", acquisitionSystem.includes("FREE_WEBSITE_REVIEW_TEMPLATE.md") && acquisitionSystem.includes("Review-to-call conversion") && acquisitionSystem.includes("I do not guarantee rankings"));
assert("free website review template matches launch offer", ["3 trust or conversion issues", "3 local SEO opportunities", "1 recommended next step", "Do not include a quote unless the business asks", "No rankings are guaranteed", "OUTREACH_TRACKER.csv"].every((text) => freeReviewTemplate.includes(text)));
assert("launch acquisition system documents client signal guardrail", acquisitionSystem.includes("CLIENT_ONBOARDING_REQUIREMENTS.md") && acquisitionSystem.includes("Do not sell Growth as an ongoing SEO promise") && acquisitionSystem.includes("reviews, photos, accurate business details, proof"));
assert("client onboarding checklist documents local SEO signal requirements", ["No ranking guarantees", "Google Business Profile", "reviews", "fresh photos", "accurate business details", "service areas", "proof of completed work", "Do not sell Growth"].every((text) => clientOnboarding.includes(text)));
assert("search local setup documents post-deploy SEO gates", ["Google Search Console", "sitemap.xml", "URL Inspection", "Bing Webmaster Tools", "Measurement ID", "Google Business Profile", "service-area business", "Review ask process"].every((text) => searchLocalSetup.includes(text)) && searchLocalSetup.includes("Do not install a guessed analytics tag"));
assert("outreach tracker has 100 blank lead rows", outreachTracker.split("\n").filter((line) => /^SD-[0-9]{3},not_contacted/.test(line)).length === 100);
assert("business card assets use approved QR URL and print hold", cardReadme.includes(businessCardUrl) && cardReadme.includes("Do not print until production passes") && cardQr.includes(escapedBusinessCardUrl) && cardBack.includes(escapedBusinessCardUrl));
assert("business card assets use approved contact and local-business targeting", cardReadme.includes("andrew@showcase-designs.com") && cardReadme.includes("All local businesses") && cardFront.includes("For local businesses ready for better leads.") && cardBack.includes("andrew@showcase-designs.com"));
assert("business card SVGs use standard card dimensions", cardFront.includes('width="3.5in" height="2in" viewBox="0 0 1050 600"') && cardBack.includes('width="3.5in" height="2in" viewBox="0 0 1050 600"'));
assert("static page has complete social image metadata", index.includes('property="og:image" content="https://showcase-designs.com/og-image.png"') && index.includes('property="og:image:width" content="1200"') && index.includes('name="twitter:image" content="https://showcase-designs.com/og-image.png"'));
assert("world page has complete social image metadata", world.includes('property="og:image" content="https://showcase-designs.com/og-image.png"') && world.includes('property="og:image:height" content="630"') && world.includes('name="twitter:image" content="https://showcase-designs.com/og-image.png"'));
assert("static page keeps canonical home URL", index.includes('rel="canonical" href="https://showcase-designs.com/"') && index.includes('property="og:url" content="https://showcase-designs.com"') && !index.includes('content="noindex'));
assert("static ProfessionalService schema is preserved", staticSchema["@context"] === "https://schema.org" && staticSchema["@type"] === "ProfessionalService" && staticSchema.name === "Showcase Designs" && staticSchema.url === "https://showcase-designs.com" && staticSchema.email === "andrew@showcase-designs.com" && staticSchema.serviceType === "Web Design, Local SEO");
assert("static schema offers remain complete", Array.isArray(staticSchema.offers) && staticSchema.offers.map((offer) => offer.name).join("|") === "Starter|Growth|Custom" && new Set(staticSchema.offers.map((offer) => offer.name)).size === 3);
assert("static positioning targets local businesses", index.includes("<title>Websites & Local SEO for Local Businesses | Showcase Designs</title>") && index.includes("Built for local businesses") && index.includes("We build websites and local SEO systems for local businesses") && !index.includes("Websites & Local SEO for Contractors"));
const robots = readText("robots.txt");
const sitemap = readText("sitemap.xml");
assert("robots file points at sitemap", robots.includes("User-agent: *") && robots.includes("Allow: /") && robots.includes("Sitemap: https://showcase-designs.com/sitemap.xml"));
assert("sitemap includes canonical static route only", sitemap.includes("<loc>https://showcase-designs.com/</loc>") && !sitemap.includes("/world"));
assert("contact form posts to FormSubmit", index.includes('class="contact-form" action="https://formsubmit.co/andrew@showcase-designs.com" method="POST"'));
assert("contact form hidden fields are configured", index.includes('name="_subject" value="New Showcase Designs inquiry"') && index.includes('name="_captcha" value="false"') && index.includes('name="_template" value="table"') && index.includes('name="_next" value="https://showcase-designs.com/thanks"'));
assert("contact form captures attribution fields", ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "landing_page", "referrer"].every((name) => index.includes(`name="${name}" value=""`)));
assert("contact form required fields are configured", index.includes('id="name" name="name" type="text" required') && index.includes('id="email" name="email" type="email" required') && index.includes('id="business" name="business" required') && index.includes('id="package" name="package" required'));
assert("contact form includes privacy consent link", index.includes('By submitting, you agree to our') && index.includes('href="privacy.html"'));
assert("contact form includes visible fallback contact path", index.includes('class="form-fallback"') && index.includes("If the form fails") && index.includes('href="mailto:andrew@showcase-designs.com"') && index.includes('href="tel:5203672769"'));
assert("static pricing reflects owner-approved subscription and ownership model", index.includes('$150<span style="font-size: 0.4em; font-weight: 400;">/mo</span>') && index.includes('$400<span style="font-size: 0.4em; font-weight: 400;">/mo</span>') && index.includes("Starter and Growth are monthly subscription options") && index.includes("one-time ownership builds start at $1,500") && index.includes("Starter - $150/mo subscription") && index.includes("Growth - $400/mo subscription") && index.includes("Own the site outright - starting at $1,500") && !index.includes("$149") && !index.includes("$399") && !index.includes("One-time setup"));
assert("thanks page is noindexed confirmation", thanks.includes("<title>Thanks | Showcase Designs</title>") && thanks.includes('content="noindex,follow"') && thanks.includes("Message received"));
assert("404 page is noindexed fallback", notFound.includes("<title>Page Not Found | Showcase Designs</title>") && notFound.includes('content="noindex,follow"') && notFound.includes("That page is not in the Showcase Designs build"));
assert("static fonts use optional display", index.includes("display=optional") && !index.includes("display=swap"));
assert("static font stylesheet is deferred off the critical path", index.includes("window.__showcaseLoadFonts") && index.includes("requestIdleCallback") && !index.includes('rel="preload" href="https://fonts.googleapis.com/css2') && preview.includes("window.__showcaseLoadFonts") && preview.includes("requestIdleCallback") && !preview.includes('rel="preload" href="https://fonts.googleapis.com/css2'));
assert("static page avoids external icon font payload", !index.includes("@phosphor-icons/web") && !preview.includes("@phosphor-icons/web") && index.includes(".ph-check::before") && index.includes(".ph-rocket-launch::before"));
assert("world fonts use optional display", world.includes("display=optional") && !world.includes("display=swap"));
assert("legal page fonts use optional display", privacy.includes("display=optional") && terms.includes("display=optional") && !privacy.includes("display=swap") && !terms.includes("display=swap"));
assert("legal pages have canonical URLs", privacy.includes('rel="canonical" href="https://showcase-designs.com/privacy.html"') && terms.includes('rel="canonical" href="https://showcase-designs.com/terms.html"'));
assert("static page uses optimized JPG screenshots", [
  "img/world/evenpath-mobile.jpg",
  "img/world/felco-mobile.jpg",
  "img/world/abel-mobile.jpg",
  "img/world/beckel-mobile.jpg"
].every((path) => index.includes(path)));
stationTexturePaths.forEach((path) => {
  const bytes = readFileSync(join(root, path));
  const dimensions = parseJpegDimensions(bytes);
  assert(`texture ${path} stays under 500KB`, bytes.length < 500 * 1024, `${bytes.length} bytes`);
  assert(`texture ${path} keeps mobile dimensions`, dimensions.width >= 390 && dimensions.width <= 520 && dimensions.height >= 800 && dimensions.height <= 1100, `${dimensions.width}x${dimensions.height}`);
});
const worldCriticalPayloadBytes = ["world.html", "world.css", "world.js", "world-data.js", ...stationTexturePaths]
  .reduce((total, path) => total + fileSize(path), 0);
assert("world initial critical payload stays under 1MB target", worldCriticalPayloadBytes < 1024 * 1024, `${worldCriticalPayloadBytes} bytes`);
assert("hybrid photo plate stays mobile-light", fileSize(photoPlatePath) < 90 * 1024, `${fileSize(photoPlatePath)} bytes`);
assert("static page does not reference heavy PNG screenshots", !/img\/(evenpath|felco|abel|beckel)-mobile\.png/.test(index));
assert("below-fold static screenshots lazy load", countMatches(index, /loading="lazy" decoding="async"/g) >= 4);
assert("hero headline remains paint-stable", !index.includes("new SplitType(heroHeadline") && !index.includes("splitHero.chars"));
assert("static critical UI initializes before animation CDN wait", index.indexOf("initCriticalUi();") > -1 && index.indexOf("initCriticalUi();") < index.indexOf('window.addEventListener("DOMContentLoaded"'));
assert("static animation fallback is locally bounded", index.includes("STATIC_FALLBACK_MS = 3500") && index.includes("__showcaseStaticFallbackApplied") && index.includes("revealStaticFallback"));
assert("static animation libraries are skipped on mobile", index.includes('data-animation-cdn", "skipped"') && index.includes('(pointer: coarse)') && index.includes('(max-width: 759px)') && !index.includes('gsap.min.js" defer') && preview.includes('data-animation-cdn", "skipped"') && preview.includes('(pointer: coarse)') && preview.includes('(max-width: 759px)') && !preview.includes('gsap.min.js" defer'));
assert("static pricing cards fail open without duplicate ScrollTrigger animation", index.includes("#pricing .pricing-card.reveal") && index.includes("opacity: 1 !important") && !index.includes('gsap.from(".pricing-card"') && preview.includes("#pricing .pricing-card.reveal") && preview.includes("opacity: 1 !important") && !preview.includes('gsap.from(".pricing-card"'));
assert("static lite route clears mode preference", index.includes('params.get("lite") === "1"') && index.includes("setModePreference(null)") && index.includes('localStorage.removeItem("mode-preference")') && index.includes("exposeModePreferenceForVerifier"));
assert("static live links use noopener", countMatches(index, /target="_blank" rel="noopener noreferrer"/g) === 4 && !index.includes('target="_blank" rel="noreferrer"'));
assert("world has noindex canonical shell", world.includes('content="noindex,follow"') && world.includes('rel="canonical"'));
assert("world imports Three dynamically", worldJs.includes("await importWithTimeout(THREE_URL, THREE_LOAD_TIMEOUT_MS)") && !world.includes("three.module"));
assert("world dependency failure has bounded fallback", worldJs.includes("THREE_LOAD_TIMEOUT_MS = 3500") && worldJs.includes("world_dependency_failed") && worldJs.includes("could not load its 3D engine"));
assert("world optional GSAP script is non-blocking", world.includes("gsap.min.js\" async") && !world.includes("gsap.min.js\" defer"));
assert("world lite route clears world preference", worldJs.includes('params.get("lite") === "1"') && worldJs.includes("setModePreference(null)") && worldJs.includes('localStorage.removeItem("mode-preference")') && worldJs.includes("exposeModePreferenceForVerifier"));
assert("world keeps accessible static return path", world.includes('class="skip-link"') && world.includes('href="#stationControls"') && world.includes('class="sr-only" aria-live="polite"') && world.includes("fully accessible standard version") && countMatches(world, /data-static-link/g) >= 3);
assert("world station controls support keyboard navigation", worldJs.includes("function handleStationChipKeydown") && ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].every((key) => worldJs.includes(`"${key}"`)) && worldJs.includes('button.setAttribute("aria-pressed", "false")'));
assert("world context-loss path has local verifier hook", worldJs.includes('params.get("simulateContextLoss") === "1"') && worldJs.includes('new Event("webglcontextlost"') && worldJs.includes("isLocalhost()"));
assert("world screenshot motion is bounded", worldJs.includes("function animateScreenshot") && worldJs.includes("if (!texture || object.scrollActive) return") && worldJs.includes("const duration = 1700") && worldJs.includes("progress < 1") && countMatches(worldJs, /object\.scrollActive = false/g) >= 2);
assert("world idle look ends with intro", worldJs.includes("function requestIdleLook") && worldJs.includes("if (!idleActive) return") && worldJs.includes("idleActive = true") && countMatches(worldJs, /idleActive = false/g) >= 2);
assert("world warmup render loop is time-boxed", worldJs.includes("function runWarmupCheck") && worldJs.includes("now - start < 900") && worldJs.includes("lastWarmup"));
assert("world continuous QA rendering is qa-only", worldJs.includes("function runQaFrameProbe") && worldJs.includes("if (!qaState || qaState.running) return") && worldJs.includes("if (!qaMode) return"));
assert("static analytics hooks cover mode routing", index.includes("window.dataLayer.push") && index.includes('window.gtag("event"') && index.includes("window.sdTrack") && index.includes('"mode_enter_world"') && index.includes('"mode_return_static"'));
assert("static analytics hooks cover conversion events", ["form_submit", "phone_click", "email_click", "pricing_cta_click", "business_card_qr_visit", "live_project_click"].every((eventName) => index.includes(`"${eventName}"`)) && index.includes("syncAttributionFields") && index.includes("trackCampaignVisit"));
assert("world analytics hooks cover mode and station events", worldJs.includes("window.dataLayer.push") && worldJs.includes('window.gtag("event"') && ["mode_enter_world", "mode_return_static", "station_click_live", "station_click_case_study", "station_hover", "world_fallback_shown", "webgl_context_lost"].every((eventName) => worldJs.includes(`"${eventName}"`)));
assert("static trust stats avoid unverified numeric claims", ["Founder-Led", "Scope-First", "Direct", "Client-Owned"].every((text) => index.includes(`data-text="${text}"`)) && !index.includes('data-counter="15"') && !index.includes('data-counter="48"') && !index.includes('data-counter="100"') && !index.includes("Projects Built") && !index.includes("48hr"));
assert("world portrait camera starts inside walkable right-reference gallery room", worldJs.includes("const cameraFov = portraitViewport ? 62 : 54") && worldJs.includes("const basePose = galleryCameraPose()") && worldJs.includes("new THREE.Vector3(-4.72, 1.5, 4.86)") && worldJs.includes("new THREE.Vector3(-0.8, 1.4, -5.18)"));
assert("world portrait station panel has compact toggle", world.includes('class="station-panel is-compact"') && world.includes('id="panelToggleButton"') && world.includes('aria-controls="stationPanelBody"') && world.includes('aria-expanded="false"') && worldCss.includes(".station-panel.is-compact") && worldJs.includes("syncStationPanelMode"));
assert("world mobile topbar keeps static return visible", worldCss.includes(".topbar-actions") && worldCss.includes("flex: 0 0 auto") && worldCss.includes("margin-left: auto") && worldCss.includes("text-overflow: ellipsis"));
const heroWallStations = stations.filter((station) => station.position?.z < -5.5 && station.rotation?.y === 0);
const sideWallStations = stations.filter((station) => Math.abs(station.rotation?.y + Math.PI / 2) < 0.02);
assert("world camera frames approved right-reference hero-wall gallery room", worldJs.includes('GALLERY_LAYOUT_VERSION = "right-reference-hero-wall-20260509"') && worldJs.includes("HERO_WALL_CLUSTER_APPROVED = true") && worldJs.includes("new THREE.PerspectiveCamera(cameraFov") && heroWallStations.length === 3 && sideWallStations.length === 1);
assert("world station selection faces each wall-mounted site", worldJs.includes("function galleryCameraPose") && worldJs.includes("applyEuler(group.rotation)") && worldJs.includes("station?.camera?.distance") && !worldJs.includes("focusDistance"));
assert("world stations include wall glow depth cues", worldJs.includes("createStationGlowTexture") && worldJs.includes("object.halo.material.opacity"));
assert("world stations include subtle in-scene wall plaques", worldJs.includes("createStationHeaderTexture") && worldJs.includes("plaqueOffset") && worldJs.includes("wallPlaque.position.y = 0.56") && worldJs.includes("station.displayName.toUpperCase()"));
assert("world exposes render metrics for QA and verifier", worldJs.includes("function renderMetrics") && worldJs.includes("data-world-render-calls") && worldJs.includes("render: renderMetrics()"));
assert("world exposes runtime collision probe for verifier", worldJs.includes("function collisionProbeForVerifier") && worldJs.includes("data-world-collision-probe") && worldJs.includes("applyGalleryCollision(safePoint, blockedTarget)"));
assert("world exposes runtime inspection probe for verifier", worldJs.includes("function inspectionProbeForVerifier") && worldJs.includes("data-world-inspection-probe") && worldJs.includes("activateStationInteraction(object, { skipGlide: true, skipHistory: true })"));
assert("world preserves interactive 3D gallery behavior", worldJs.includes("activateStationInteraction") && worldJs.includes("scrollActiveScreenBy") && worldJs.includes("galleryColliders") && worldJs.includes("requestRender("));
assert("world removes phone camera notch geometry", !worldJs.includes("notch"));
assert("world leaves open gallery spacing without empty canvas props", !worldJs.includes("FUTURE_BAYS") && !worldJs.includes("createFutureGalleryBay") && !worldJs.includes("createEmptyCanvasTexture") && worldJs.includes("createFrontWallShowroomTexture"));
assert("world supports full-room POV movement controls", worldJs.includes("function moveGallery") && worldJs.includes("function handleGalleryWheel") && worldJs.includes('"KeyW"') && worldJs.includes('window.addEventListener("keydown", handleGalleryKeyDown)') && worldJs.includes("function updateLookTargetFromDelta") && worldJs.includes("position.z = Math.max(-4.72"));
assert("world supports mobile touch walking controls", world.includes('id="mobileMoveControls"') && world.includes('id="mobileMovePad"') && worldCss.includes(".mobile-move-controls") && worldCss.includes("@media (pointer: coarse)") && worldJs.includes("function handleMovePadPointerDown") && worldJs.includes("moveState.touchForward") && worldJs.includes("requestMovementFrame()"));
assert("world supports pointer-lock first-person gallery look", worldJs.includes("function enterPointerLook") && worldJs.includes("canvas.requestPointerLock()") && worldJs.includes('document.addEventListener("pointerlockchange", handlePointerLockChange)') && worldJs.includes("handlePointerLockMove"));
assert("world adds low leather gallery seating and contact shadows", worldJs.includes("function addGallerySeatingAndLighting") && worldJs.includes("wallSconces") && worldJs.includes("leatherMat") && worldJs.includes("createLeatherTexture") && worldJs.includes("benchGroup.position.set") && worldJs.includes("addGalleryCollider(") && worldJs.includes("addContactShadow(3.72"));
assert("world adds cove lighting, track fixtures, and glass wall detail", worldJs.includes("coveMat") && worldJs.includes("addCeilingBaffles") && worldJs.includes("addGlassWallFeature") && worldJs.includes("createArchitecturalGlassTexture") && worldJs.includes("addGalleryCollider(-5.42, -2.42"));
assert("world adds right-reference hero wall wash and floor reflection decals", worldJs.includes("function addHeroWallLighting") && worldJs.includes("createHeroWallWashTexture") && worldJs.includes("function addFloorReflectionDecals") && worldJs.includes("createFloorLightPoolTexture") && worldJs.includes("createScreenFloorReflectionTexture") && worldJs.includes("screenFloorReflectionTexture") && worldJs.includes("createGardenSilhouetteTexture"));
assert("world has presentation-mode visual review hooks", worldJs.includes("presentationMode") && worldJs.includes('data-presentation') && worldCss.includes('[data-presentation="true"] .world-topbar') && worldCss.includes('[data-presentation="true"] .qa-panel'));
assert("world has approved hybrid room-plate presentation layer", world.includes('id="photoMatchPlate"') && worldCss.includes(".photo-match-plate") && worldCss.includes("photo-match-room-plate.webp") && worldCss.includes('[data-presentation="true"] .photo-match-plate') && worldCss.includes(".is-inspecting .photo-match-plate"));
assert("world has photo-match visual verifier", photoVerifier.includes("assertDesktopPhotoMatch") && photoVerifier.includes("assertMobilePhotoMatch") && photoVerifier.includes("photo-match-production") && photoVerifier.includes("SHOWCASE_ORIGIN") && photoVerifier.includes("/world?try=1&qa=minimal&presentation=1"));
assert("world avoids fake gallery linework", worldJs.includes("function addArchitecturalDetails") && !worldJs.includes("addWallPanels();") && !worldJs.includes("addTrimLine(STUDIO.width") && !worldJs.includes("addAisleDetails();") && !worldJs.includes("strokeRect(left + 8"));
assert("world aggressively optimizes mobile rendering", worldJs.includes("function currentRenderPixelRatio") && worldJs.includes("renderPixelRatioLimit") && worldJs.includes("function seamlessMode") && worldJs.includes("function renderFrameInterval") && worldJs.includes("renderState.force") && worldJs.includes("skipped: true") && worldJs.includes("preserveDrawingBuffer: false") && worldJs.includes("realtimeShadowsEnabled()") && worldJs.includes('quality !== "lite"') && worldJs.includes("adaptivePixelScale"));
assert("world uses slab-textured stone, visible ceiling, and polished floor materials", worldJs.includes("createWallTexture") && worldJs.includes("createFloorTexture") && worldJs.includes("createFloorReflectionTexture") && worldJs.includes("createCeilingPhotoTexture") && worldJs.includes("polish.addColorStop") && worldJs.includes("function addPhysicalStoneSlabRelief") && worldJs.includes("addPhysicalStoneSlabRelief();") && worldJs.includes("function addStoneSlabMaterialOverlays") && worldJs.includes("addStoneSlabMaterialOverlays();") && worldJs.includes("createBackWallShowroomTexture") && worldJs.includes("createFrontWallShowroomTexture"));
assert("world frames exhibits as thin black metal artworks", worldJs.includes("frameBar") && worldJs.includes("frameDepth") && worldJs.includes("size: [panelWidth + frameBar * 2") && worldJs.includes("frameMaterial") && !worldJs.includes("createBeveledPlateGeometry(panelWidth + 0.26"));
assert("world lets nearby website panels become scrollable exhibits", world.includes('id="screenViewerScroll" tabindex="0"') && world.includes('id="screenViewerScrollDown"') && worldJs.includes("activeScreenStationId") && worldJs.includes("SCREEN_INTERACTION_DISTANCE") && worldJs.includes("function activateStationInteraction") && worldJs.includes("function scrollStationPreview") && worldJs.includes("texture.offset.y - deltaY") && worldJs.includes("handleInspectionWheel") && worldJs.includes("handleInspectionScrollKey") && worldJs.includes("scrollActiveScreenBy") && worldJs.includes("canInteractWithStationScreen(object)"));
assert("world inspection stays in-room with compact controls", world.includes('id="inspectHint"') && world.includes('id="screenViewerFullscreen"') && worldJs.includes("function glideCameraToInspection") && worldJs.includes("document.body.classList.add(\"is-inspecting\")") && worldCss.includes(".is-inspecting .mobile-move-controls") && worldCss.includes(".screen-viewer.is-fullscreen"));
assert("world supports back-button and escape exits from inspection", worldJs.includes("pushInspectionHistory") && worldJs.includes("handleHistoryPop") && worldJs.includes('window.addEventListener("popstate", handleHistoryPop)') && worldJs.includes("handleScreenViewerKeyDown") && worldJs.includes("Escape"));
assert("world live sites open from direct panel interaction", worldJs.includes("event.detail >= 2") && worldJs.includes("openLiveSite(object.station)") && worldJs.includes("getStationIntersection(event)"));
assert("world prevents walking through gallery objects", worldJs.includes("galleryColliders") && worldJs.includes("PLAYER_RADIUS") && worldJs.includes("function addGalleryCollider") && worldJs.includes("function applyGalleryCollision") && worldJs.includes("collidesWithGallery") && worldJs.includes("addWallExhibitCollider(group.position"));
assert("world has fullscreen-friendly POV and exhibit mode", world.includes('id="screenViewer"') && world.includes('id="screenViewerImage"') && world.includes('id="fullscreenButton"') && worldCss.includes(".fullscreen-action") && worldJs.includes("function toggleWorldFullscreen") && worldJs.includes("screenViewer.requestFullscreen()") && worldJs.includes("syncTextureFromScreenViewer"));
assert("world supports minimal QA visual screenshots", worldJs.includes('params.get("qa") === "minimal"') && worldCss.includes('[data-qa-minimal="true"] .qa-panel'));
const productionVerifier = readText("verify-production.mjs");
assert("production verifier checks deployed routes", productionVerifier.includes("showcase-designs.com") && productionVerifier.includes("homeLite") && productionVerifier.includes("Client website stations") && productionVerifier.includes("Message received") && productionVerifier.includes("not-a-real-page") && productionVerifier.includes("og-image.png"));
assert("production verifier checks runtime assets", productionVerifier.includes('get("/world.css")') && productionVerifier.includes('get("/world-data.js")') && productionVerifier.includes('get("/favicon.svg")') && productionVerifier.includes("photo-match-room-plate.webp") && productionVerifier.includes("stationTextures") && productionVerifier.includes("world script is JavaScript") && productionVerifier.includes("world stylesheet is CSS") && productionVerifier.includes("world data is JavaScript") && productionVerifier.includes("texture is JPEG"));
assert("production verifier checks all fetched security headers", productionVerifier.includes("function hasSecurityHeaders") && productionVerifier.includes("world stylesheet has security headers") && productionVerifier.includes("Open Graph image has security headers"));
assert("production verifier supports local dry-run origin", productionVerifier.includes('url.protocol === "http:"') && readme.includes("SHOWCASE_ORIGIN=http://127.0.0.1:8765 node verify-production.mjs") && readText("LAUNCH_CHECKLIST.md").includes("SHOWCASE_ORIGIN=http://127.0.0.1:8765 node verify-production.mjs"));
assert("README links Cloudflare deploy guide", readme.includes("CLOUDFLARE_DEPLOY.md") && readme.includes("node prepare-cloudflare-deploy.mjs") && readme.includes("npx wrangler pages deploy dist"));
const outboundVerifier = readText("verify-outbound.mjs");
assert("outbound verifier checks station live URLs", outboundVerifier.includes("stations") && outboundVerifier.includes("liveUrl") && outboundVerifier.includes("showcase-outbound-verifier"));
assert("outbound verifier checks static URL consistency", outboundVerifier.includes("index.html") && outboundVerifier.includes("v3-preview.html") && outboundVerifier.includes("static URL matches station data"));
assert("QA mode documented", readme.includes("/world.html?qa=1&try=1") && readme.includes("Copy report") && readme.includes("window.__showcaseWorld.getState().qa"));
const deviceQa = readText("DEVICE_QA.md");
const deviceQaQuickStart = readText("DEVICE_QA_QUICK_START.md");
assert("device QA checklist documents required browsers", deviceQa.includes("iOS Safari") && deviceQa.includes("Chrome on a real Android"));
assert("device QA checklist documents pass criteria", deviceQa.includes("minFps") && deviceQa.includes("90s complete") && deviceQa.includes("30"));
assert("device QA checklist documents render metric gate", deviceQa.includes("render.calls") && deviceQa.includes("200") && readme.includes("render.calls"));
assert("device QA quick start documents preview URL and report gate", deviceQaQuickStart.includes("https://showcase-designs-preview.pages.dev/world?qa=1&try=1") && deviceQaQuickStart.includes("Do not use `showcase-designs.com`") && deviceQaQuickStart.includes("node verify-device-qa.mjs") && deviceQaQuickStart.includes("qa.minFps"));
assert("device QA results validator is documented", readme.includes("DEVICE_QA_RESULTS.md") && readme.includes("node verify-device-qa.mjs") && deviceQa.includes("node verify-device-qa.mjs"));
assert("README links device QA checklist", readme.includes("DEVICE_QA_QUICK_START.md") && readme.includes("DEVICE_QA.md"));
const outboundAudit = readText("OUTBOUND_LINK_AUDIT.md");
assert("outbound audit documents approved station URL pass", outboundAudit.includes("All approved launch station live URLs passed") && !outboundAudit.includes("DEPLOYMENT_NOT_FOUND"));
assert("outbound audit documents consistency coverage", outboundAudit.includes("href") && outboundAudit.includes("world-data.js") && outboundAudit.includes("station `liveUrl`"));
assert("outbound audit documents current FormSubmit pass", outboundAudit.includes("FormSubmit endpoint") && outboundAudit.includes("HTTP 200") && outboundAudit.includes("9 outbound checks passed") && !outboundAudit.includes("HTTP 522"));
assert("README links outbound audit", readme.includes("OUTBOUND_LINK_AUDIT.md") && readme.includes("node verify-outbound.mjs"));
assert("README links free review template", readme.includes("FREE_WEBSITE_REVIEW_TEMPLATE.md") && readme.includes("3 trust issues, 3 local SEO opportunities, 1 next step"));
assert("README links client onboarding requirements", readme.includes("CLIENT_ONBOARDING_REQUIREMENTS.md") && readme.includes("before quoting Growth"));
assert("README links search local setup", readme.includes("SEARCH_LOCAL_SEO_LAUNCH_SETUP.md") && readme.includes("Search Console, Bing, analytics, GBP"));
const localBrowserAudit = readText("LOCAL_BROWSER_AUDIT.md");
assert("local browser audit documents static Lighthouse result", localBrowserAudit.includes("Performance | 94") && localBrowserAudit.includes("Accessibility | 100") && localBrowserAudit.includes("Best Practices | 100") && localBrowserAudit.includes("SEO | 100"));
assert("local browser audit documents world Lighthouse result", localBrowserAudit.includes("Performance | 97") && localBrowserAudit.includes("world.html?try=1") && localBrowserAudit.includes("noindex,follow"));
assert("local browser audit documents Cloudflare dist Lighthouse result", localBrowserAudit.includes("Cloudflare `dist/` Lighthouse package audit") && localBrowserAudit.includes("| `/` from `dist/` | 87 | 100 | 100 | 100 |") && localBrowserAudit.includes("| `/world.html?try=1` from `dist/` | 85 | 100 | 100 | 66 |") && localBrowserAudit.includes("0.113") && localBrowserAudit.includes("0.011"));
assert("local browser audit documents thanks Lighthouse result", localBrowserAudit.includes("thanks.html") && localBrowserAudit.includes("form confirmation page"));
assert("local browser audit documents 404 Lighthouse result", localBrowserAudit.includes("404.html") && localBrowserAudit.includes("missing-route pages should not be indexed"));
assert("local browser audit documents legal Lighthouse result", localBrowserAudit.includes("/privacy.html") && localBrowserAudit.includes("/terms.html") && localBrowserAudit.includes("| `/privacy.html` | 100 | 100 | 100 | 100 |"));
assert("local browser audit documents concrete performance fixes", localBrowserAudit.includes("favicon.svg") && localBrowserAudit.includes("display=optional") && localBrowserAudit.includes("paint-stable"));
assert("local browser audit documents four-station visual capture", localBrowserAudit.includes("current-world-fourstation-desktop.png") && localBrowserAudit.includes("current-world-fourstation-portrait.png"));
assert("README links local browser audit", readme.includes("LOCAL_BROWSER_AUDIT.md"));
const audit = readText("COMPLETION_AUDIT.md");
const livePrdAudit = readText("SHOWCASE_V3_LIVE_PRD_AUDIT.md");
const photoMatchReview = readText("PHOTO_MATCH_REVIEW.md");
assert("completion audit documents local evidence", audit.includes("node verify-world.mjs") && audit.includes("Passed locally"));
assert("completion audit includes local browser audit evidence", audit.includes("LOCAL_BROWSER_AUDIT.md") && audit.includes("Passed locally"));
assert("completion audit includes outbound link evidence", audit.includes("OUTBOUND_LINK_AUDIT.md") && audit.includes("Passed locally"));
assert("completion audit documents approved case-study copy gate", audit.includes("PRD F-1.6") && audit.includes("case-study hero/intro copy") && readText("LAUNCH_CHECKLIST.md").includes("Case-study hero/intro copy"));
assert("completion audit documents remaining external gates", audit.includes("Not complete") && audit.includes("Operator approval"));
assert("photo-match review documents owner option C decision", photoMatchReview.includes("This pass is not a 1:1 replica") && photoMatchReview.includes("https://showcase-designs-preview.pages.dev/world?presentation=1") && photoMatchReview.includes("Selected option: 3") && photoMatchReview.includes("hybrid/generated room-plate approach") && photoMatchReview.includes("Real-device iOS Safari report is still missing"));
assert("README links completion audit", readme.includes("COMPLETION_AUDIT.md"));
assert("live PRD audit maps launch requirements", ["L-1 Production cutover", "L-2 Deploy package", "SEO-1 Canonical static marketing page", "SEO-2 Search Console launch", "SEO-3 Showcase local trust signals", "TRUST-1 Evidence-based claims", "TRUST-2 Founder-led positioning", "CONV-1 Contact and lead capture", "CONV-2 Analytics and tracking", "ACQ-1 Business card funnel", "ACQ-2 Outreach system", "Release criteria"].every((item) => livePrdAudit.includes(item)) && livePrdAudit.includes("Trust stats use `Founder-Led`, `Scope-First`, `Direct`, and `Client-Owned`") && readme.includes("SHOWCASE_V3_LIVE_PRD_AUDIT.md"));
assert("live PRD audit records preview deploy and production project discovery", livePrdAudit.includes("https://7b30c5f6.showcase-designs-preview.pages.dev") && livePrdAudit.includes("verify-production.mjs` passed 63 checks") && livePrdAudit.includes("verify-photo-match.mjs` passed 10 checks") && livePrdAudit.includes("visible Cloudflare Pages projects do not include") && livePrdAudit.includes("showcase-designs.com"));
const requirementsTrace = readText("REQUIREMENTS_TRACE.md");
assert("requirements trace maps all PRD functional requirements", ["F-1.1", "F-1.2", "F-1.3", "F-1.4", "F-1.5", "F-1.6", "F-1.7", "F-1.8", "F-2.1", "F-2.2", "F-2.3", "F-2.4", "F-2.5", "F-2.6", "F-2.7", "F-2.8", "F-2.9", "F-2.10", "F-2.11", "F-2.12", "F-2.13", "F-2.14", "F-2.15", "F-2.16", "F-2.17", "F-3.1", "F-3.2", "F-3.3", "F-3.4", "F-3.5"].every((id) => requirementsTrace.includes(id)));
assert("requirements trace maps launch gates and blockers", requirementsTrace.includes("Static LCP p75") && requirementsTrace.includes("Mobile FPS") && requirementsTrace.includes("Visible draw calls") && requirementsTrace.includes("Current Blockers") && requirementsTrace.includes("Cloudflare"));
assert("README links requirements trace", readme.includes("REQUIREMENTS_TRACE.md"));
const operatorInputs = readText("OPERATOR_INPUTS.md");
assert("operator inputs document exact external blockers", ["Cloudflare Preview Deploy", "showcase-designs-preview", "Real-Device QA Reports", "Production Core Web Vitals", "Copy Approval", "Operator Launch Approval"].every((item) => operatorInputs.includes(item)) && !operatorInputs.includes("Gustavo's Landscape URL"));
assert("operator inputs mirror PRD open questions", ["Exact approved client/project list", "EvenPath, Felco, Abel, and Beckel", "Approved numeric claims", "Final public phone number", "Final public email address", "Compliant physical mailing address or PO box", "Cloudflare production project name and production branch", "Private founding-client offer approved", "Growth price after first 3-5 clients", "Business card targeting"].every((item) => operatorInputs.includes(item)) && operatorInputs.includes("Do not guess these answers"));
assert("operator inputs document follow-up verification commands", operatorInputs.includes("node verify-outbound.mjs") && operatorInputs.includes("node verify-production.mjs") && operatorInputs.includes("node verify-world.mjs") && operatorInputs.includes("node verify-device-qa.mjs"));
assert("operator inputs link search local setup", operatorInputs.includes("SEARCH_LOCAL_SEO_LAUNCH_SETUP.md") && operatorInputs.includes("Google Search Console property") && operatorInputs.includes("GBP eligible"));
assert("README and completion audit link operator inputs", readme.includes("OPERATOR_INPUTS.md") && audit.includes("OPERATOR_INPUTS.md"));
const launchChecklist = readText("LAUNCH_CHECKLIST.md");
assert("launch checklist documents production route gate", launchChecklist.includes("curl -I https://showcase-designs.com/world") && launchChecklist.includes("Production Route Gate") && launchChecklist.includes("Cloudflare Pages"));
assert("launch checklist documents production verifier", launchChecklist.includes("node verify-production.mjs"));
assert("launch checklist documents CWV thresholds", launchChecklist.includes("LCP `<= 2.5s`") && launchChecklist.includes("INP `<= 200ms`") && launchChecklist.includes("CLS `<= 0.1`"));
assert("launch checklist documents search local SEO gate", launchChecklist.includes("Search And Local SEO Gate") && launchChecklist.includes("SEARCH_LOCAL_SEO_LAUNCH_SETUP.md") && launchChecklist.includes("Google Search Console property is verified"));
assert("launch checklist documents operator approval", launchChecklist.includes("Operator Approval") && launchChecklist.includes("APPROVED / CHANGES REQUESTED"));
assert("README links launch checklist", readme.includes("LAUNCH_CHECKLIST.md"));
const productionAudit = readText("PRODUCTION_AUDIT.md");
assert("production audit documents checked domain", productionAudit.includes("https://showcase-designs.com") && productionAudit.includes("Observed:"));
assert("production audit documents route failure", productionAudit.includes("https://showcase-designs.com/world") && productionAudit.includes("https://showcase-designs.com/thanks") && productionAudit.includes("HTTP/2 404") && productionAudit.includes("older Vercel page"));
assert("production audit documents required fix", productionAudit.includes("/world") && productionAudit.includes("world.html") && productionAudit.includes("/thanks") && productionAudit.includes("thanks.html") && productionAudit.includes("Deploy this workspace") && productionAudit.includes("Cloudflare Pages"));
assert("README links production audit", readme.includes("PRODUCTION_AUDIT.md"));
assert("completion audit links production audit", audit.includes("PRODUCTION_AUDIT.md") && audit.includes("Failing production"));
const vercelConfig = JSON.parse(readText("vercel.json"));
assert("Vercel config rewrites clean world route", Array.isArray(vercelConfig.rewrites) && vercelConfig.rewrites.some((rewrite) => rewrite.source === "/world" && rewrite.destination === "/world.html"));
assert("Vercel config rewrites thanks route", vercelConfig.rewrites.some((rewrite) => rewrite.source === "/thanks" && rewrite.destination === "/thanks.html"));
const headerSet = vercelConfig.headers?.find((entry) => entry.source === "/(.*)")?.headers || [];
const headerValue = (key) => headerSet.find((header) => header.key === key)?.value;
assert("Vercel config sets conservative security headers", headerValue("X-Content-Type-Options") === "nosniff" && headerValue("Referrer-Policy") === "strict-origin-when-cross-origin" && headerValue("X-Frame-Options") === "DENY" && headerValue("Permissions-Policy") === "camera=(), microphone=(), geolocation=()");
assert("README documents Cloudflare deploy flow", readme.includes("Cloudflare Pages") && readme.includes("extensionless HTML routing") && readme.includes("_headers"));
assert("README documents clean-route local preview", readme.includes("node serve-local.mjs") && readme.includes("node serve-local.mjs --root dist") && readme.includes("http://127.0.0.1:8765/world") && readme.includes("branded `404.html`"));
assert("launch checklist documents Cloudflare clean routing", launchChecklist.includes("extensionless HTML routing") && launchChecklist.includes("/world") && launchChecklist.includes("/thanks"));
assert("production audit documents Cloudflare clean route fix", productionAudit.includes("extensionless HTML routing") && productionAudit.includes("_headers") && productionAudit.includes("world.html") && productionAudit.includes("thanks.html"));
assert("production audit documents production verifier", productionAudit.includes("node verify-production.mjs") && productionAudit.includes("expected to fail"));
assert("production audit documents Cloudflare deploy input", productionAudit.includes("Cloudflare Deployment Input") && productionAudit.includes("Cloudflare account/project"));
assert("production audit documents latest production verifier failure", productionAudit.includes("production checks failed") && productionAudit.includes("/?lite=1") && productionAudit.includes("/world.css") && productionAudit.includes("/world-data.js") && productionAudit.includes("station texture JPGs") && productionAudit.includes("security headers"));
assert("station count is four approved launch projects", stations.length === 4);
assert("station ids are unique", new Set(stations.map((station) => station.id)).size === stations.length);

stations.forEach((station) => {
  assert(`station ${station.id} has display name`, typeof station.displayName === "string" && station.displayName.length > 2);
  assert(`station ${station.id} has kind`, ["live", "template"].includes(station.kind));
  assert(`station ${station.id} has live URL`, /^https:\/\/[^ ]+/.test(station.liveUrl));
  assert(`station ${station.id} has case anchor`, station.caseStudyAnchor === `/#case-study-${station.id}`);
  assert(`station ${station.id} anchor exists`, index.includes(`id="case-study-${station.id}"`));
  assert(`station ${station.id} screenshot URL`, station.screenshotUrl.startsWith("/img/world/") && fileExists(station.screenshotUrl.slice(1)));
  assert(`station ${station.id} description`, typeof station.description === "string" && station.description.length >= 40);
  assert(`station ${station.id} position`, ["x", "y", "z"].every((key) => Number.isFinite(station.position?.[key])));
  assert(`station ${station.id} rotation`, ["x", "y", "z"].every((key) => Number.isFinite(station.rotation?.[key])));
  assert(`station ${station.id} camera tuning`, Number.isFinite(station.camera?.distance));
});

assert("live CTA opens external tab safely", worldJs.includes('window.open(station.liveUrl, "_blank", "noopener")'));
assert("case-study CTA uses resolved static anchor", worldJs.includes("window.location.href = resolveCaseStudyUrl(selectedStation.caseStudyAnchor)"));
assert("QA report copy hook exists", worldJs.includes("async function copyQaReport()") && worldJs.includes("navigator.clipboard.writeText(report)"));
assert("QA report API exists", worldJs.includes("getQaReport()"));

for (const file of ["world.js", "world-data.js", "serve-local.mjs", "prepare-cloudflare-deploy.mjs", "verify-device-qa.mjs", "verify-photo-match.mjs"]) {
  const result = run("node", ["--check", file]);
  assert(`syntax ${file}`, result.status === 0, result.stderr);
}

const productionSyntax = run("node", ["--check", "verify-production.mjs"]);
assert("syntax verify-production.mjs", productionSyntax.status === 0, productionSyntax.stderr);
const outboundSyntax = run("node", ["--check", "verify-outbound.mjs"]);
assert("syntax verify-outbound.mjs", outboundSyntax.status === 0, outboundSyntax.stderr);
const cloudflarePackage = run("node", ["prepare-cloudflare-deploy.mjs"]);
assert("Cloudflare deploy package builds", cloudflarePackage.status === 0 && cloudflarePackage.stdout.includes("Prepared Cloudflare Pages deploy output"));
const distFiles = listFilesRecursive("dist");
[
  "dist/_headers",
  "dist/_redirects",
  "dist/index.html",
  "dist/v3-preview.html",
  "dist/world.html",
  "dist/world.css",
  "dist/world.js",
  "dist/world-data.js",
  "dist/thanks.html",
  "dist/404.html",
  "dist/privacy.html",
  "dist/terms.html",
  "dist/favicon.svg",
  "dist/og-image.png",
  "dist/robots.txt",
  "dist/sitemap.xml",
  "dist/img/world/photo-match-room-plate.webp",
  "dist/img/world/evenpath-mobile.jpg",
  "dist/img/world/felco-mobile.jpg",
  "dist/img/world/abel-mobile.jpg",
  "dist/img/world/beckel-mobile.jpg"
].forEach((path) => assert(`Cloudflare package includes ${path}`, distFiles.includes(path)));
assert("Cloudflare package excludes repo-only artifacts", !distFiles.some((path) => /\.md$|verify-.*\.mjs|serve-local\.mjs|prepare-cloudflare-deploy\.mjs|verification\/|og-image\.svg|img\/[^/]+-mobile\.png|gustavo/i.test(path)));

const browser = chromePath();
const { server, origin } = await startServer();

try {
  const staticDom = await dumpDom(browser, origin, "/");
  assert("static page renders hero headline", staticDom.includes("More qualified calls for") && staticDom.includes("through better websites and local SEO."));
  assert("static page renders optimized screenshot assets", staticDom.includes("img/world/evenpath-mobile.jpg") && staticDom.includes("img/world/felco-mobile.jpg"));
  assertStaticScreenshot("desktop static", await captureScreenshot(browser, origin, "/", 1440, 1000));
  assertStaticScreenshot("portrait static", await captureScreenshot(browser, origin, "/", 500, 844));

  const staticCdnFailDom = await dumpDom(
    browser,
    origin,
    "/",
    ["--host-resolver-rules=MAP cdnjs.cloudflare.com 127.0.0.1,MAP cdn.jsdelivr.net 127.0.0.1,MAP unpkg.com 127.0.0.1"],
    { virtualTimeBudget: 7000, timeout: 9000 }
  );
  assert("static CDN failure still renders content", staticCdnFailDom.includes("More qualified calls for") && staticCdnFailDom.includes('data-static-fallback="animation-unavailable"'));
  assert("static CDN failure keeps critical UI bound", staticCdnFailDom.includes('data-world-bound="true"') && staticCdnFailDom.includes('data-nav-bound="true"'));

  const staticLitePreferenceDom = await dumpDom(browser, origin, "/index.html?lite=1&verifyMode=1&seedMode=world");
  assert("static lite clears mode preference at runtime", staticLitePreferenceDom.includes('data-mode-preference="null"') && staticLitePreferenceDom.includes("case-study-evenpath"));

  const staticTrackingDom = await dumpDom(browser, origin, "/?utm_source=business_card&utm_medium=offline&utm_campaign=v3_launch&utm_content=verifier&verifyTracking=1");
  assert("static business-card UTM tracking runs at runtime", staticTrackingDom.includes('data-form-utm-source="business_card"') && staticTrackingDom.includes('data-form-utm-medium="offline"') && staticTrackingDom.includes('data-form-utm-campaign="v3_launch"') && staticTrackingDom.includes('data-last-static-event="business_card_qr_visit"') && numericAttr(staticTrackingDom, "data-static-data-layer-count") >= 1);

  const staticReducedScenicDom = await dumpDom(browser, origin, "/index.html?scenic=1&verifyMode=1", ["--force-prefers-reduced-motion=reduce"]);
  assert("static reduced motion blocks scenic routing", staticReducedScenicDom.includes("case-study-evenpath") && !staticReducedScenicDom.includes('id="stationControls"'));
  assert("static reduced scenic stores static preference at runtime", staticReducedScenicDom.includes('data-mode-preference="static"'));

  const cleanThanksDom = await dumpDom(browser, origin, "/thanks");
  assert("clean thanks route renders confirmation copy", cleanThanksDom.includes("Message received") && cleanThanksDom.includes("Back to home"));

  const thanksDom = await dumpDom(browser, origin, "/thanks.html");
  assert("thanks page renders confirmation copy", thanksDom.includes("Message received") && thanksDom.includes("Back to home"));
  assertStaticScreenshot("desktop thanks", await captureScreenshot(browser, origin, "/thanks.html", 1440, 1000));
  assertStaticScreenshot("portrait thanks", await captureScreenshot(browser, origin, "/thanks.html", 500, 844));

  const cleanNotFoundDom = await dumpDom(browser, origin, "/not-a-real-page");
  assert("clean missing route renders branded 404", cleanNotFoundDom.includes("That page is not in the Showcase Designs build") && cleanNotFoundDom.includes("Back to home"));

  const notFoundDom = await dumpDom(browser, origin, "/404.html");
  assert("404 page renders fallback copy", notFoundDom.includes("That page is not in the Showcase Designs build") && notFoundDom.includes("Studio"));
  assertStaticScreenshot("desktop 404", await captureScreenshot(browser, origin, "/404.html", 1440, 1000));
  assertStaticScreenshot("portrait 404", await captureScreenshot(browser, origin, "/404.html", 500, 844));

  const privacyDom = await dumpDom(browser, origin, "/privacy.html");
  assert("privacy page renders policy copy", privacyDom.includes("Privacy Policy") && privacyDom.includes("Form Processing"));
  assertStaticScreenshot("desktop privacy", await captureScreenshot(browser, origin, "/privacy.html", 1440, 1000));
  assertStaticScreenshot("portrait privacy", await captureScreenshot(browser, origin, "/privacy.html", 500, 844));

  const termsDom = await dumpDom(browser, origin, "/terms.html");
  assert("terms page renders terms copy", termsDom.includes("Terms of Service") && termsDom.includes("Limitation of Liability"));
  assertStaticScreenshot("desktop terms", await captureScreenshot(browser, origin, "/terms.html", 1440, 1000));
  assertStaticScreenshot("portrait terms", await captureScreenshot(browser, origin, "/terms.html", 500, 844));

  const normalDom = await dumpDom(browser, origin, "/world.html?try=1&verifyMode=1");
  assert("world initializes Three", normalDom.includes('data-engine="three.js r160"'));
  assert("world route stores world preference at runtime", normalDom.includes('data-mode-preference="world"'));
  assert("world renders four station chips", countMatches(normalDom, /class="station-chip/g) === 4);
  assert("world renders inspection and fullscreen controls", normalDom.includes('id="inspectHint"') && normalDom.includes('id="fullscreenButton"') && normalDom.includes('id="screenViewerFullscreen"'));
  assert("world starts with active station", /station-chip is-active[\s\S]*aria-pressed="true"/.test(normalDom));
  assert("portrait world defaults to compact station panel", normalDom.includes("station-panel is-compact") && normalDom.includes('id="panelToggleButton"') && normalDom.includes('aria-expanded="false"'));
  assert("normal mode hides QA overlay", !/qa-panel|data-qa=/.test(normalDom));
  const renderCalls = numericAttr(normalDom, "data-world-render-calls");
  const renderTextures = numericAttr(normalDom, "data-world-textures");
  const colliderCount = numericAttr(normalDom, "data-world-colliders");
  const collisionProbe = parseKeyValueProbe(attrValue(normalDom, "data-world-collision-probe"));
  const inspectionProbe = parseKeyValueProbe(attrValue(normalDom, "data-world-inspection-probe"));
  assert("world draw calls stay within PRD budget", renderCalls > 0 && renderCalls <= 150, String(renderCalls));
  assert("world texture count stays bounded", renderTextures > 0 && renderTextures <= 40, String(renderTextures));
  assert("world exposes physical collider coverage", colliderCount >= 6, String(colliderCount));
  assert("world runtime collision probe blocks physical objects", collisionProbe.colliders === colliderCount && collisionProbe.blocked === colliderCount && collisionProbe.safe === 1 && collisionProbe.endpointClear === 1 && collisionProbe.clamp === 1, JSON.stringify(collisionProbe));
  assert("world runtime inspection probe activates scrolls and exits", inspectionProbe.ready === 1 && inspectionProbe.activated === 1 && inspectionProbe.scrolled === 1 && inspectionProbe.exited === 1, JSON.stringify(inspectionProbe));
  assertSceneScreenshot("desktop world", await captureScreenshot(browser, origin, "/world.html?try=1", 1440, 1000));
  assertSceneScreenshot("portrait world", await captureScreenshot(browser, origin, "/world.html?try=1", 500, 844));

  const cleanWorldDom = await dumpDom(browser, origin, "/world?try=1");
  assert("clean world route initializes Three", cleanWorldDom.includes('data-engine="three.js r160"') && cleanWorldDom.includes("Client website stations"));

  const gsapFailDom = await dumpDom(
    browser,
    origin,
    "/world.html?try=1",
    ["--host-resolver-rules=MAP cdnjs.cloudflare.com 127.0.0.1"],
    { virtualTimeBudget: 7000, timeout: 9000 }
  );
  assert("optional GSAP failure still initializes world", gsapFailDom.includes('data-engine="three.js r160"') && gsapFailDom.includes("Client website stations"));

  const qaDom = await dumpDom(browser, origin, "/world.html?qa=1&try=1");
  assert("QA mode initializes Three", qaDom.includes('data-engine="three.js r160"'));
  assert("QA overlay renders", qaDom.includes('class="qa-panel"') && qaDom.includes('data-qa="pixels"'));
  assert("QA copy report button renders", qaDom.includes('data-qa-copy="">Copy report</button>'));
  assert("QA route reaches running state", qaDom.includes('data-qa="route">world running'));

  const liteDom = await dumpDom(browser, origin, "/world.html?lite=1&verifyMode=1");
  assert("world lite redirects static", liteDom.includes("case-study-evenpath") && !liteDom.includes("Client website stations"));
  assert("world lite clears mode preference at runtime", liteDom.includes('data-mode-preference="null"'));

  const cleanLiteDom = await dumpDom(browser, origin, "/world?lite=1&verifyMode=1");
  assert("clean world lite redirects static", cleanLiteDom.includes("case-study-evenpath") && !cleanLiteDom.includes("Client website stations"));
  assert("clean world lite clears mode preference at runtime", cleanLiteDom.includes('data-mode-preference="null"'));

  const reducedDom = await dumpDom(browser, origin, "/world.html?try=1&verifyMode=1", ["--force-prefers-reduced-motion=reduce"]);
  assert("reduced motion redirects static", reducedDom.includes("case-study-evenpath") && !reducedDom.includes('data-engine="three.js r160"'));
  assert("reduced motion stores static preference at runtime", reducedDom.includes('data-mode-preference="static"'));

  const unsupportedDom = await dumpDom(browser, origin, "/world.html", ["--disable-webgl", "--disable-3d-apis"]);
  assert("unsupported WebGL fallback", unsupportedDom.includes('<section class="fallback" id="fallback">') && unsupportedDom.includes("Standard view recommended"));

  const contextLossDom = await dumpDom(browser, origin, "/world.html?try=1&simulateContextLoss=1");
  assert("WebGL context loss shows fallback", contextLossDom.includes("graphics context was lost") && contextLossDom.includes('<section class="fallback" id="fallback">'));

  const dependencyFailDom = await dumpDom(
    browser,
    origin,
    "/world.html?try=1",
    ["--host-resolver-rules=MAP unpkg.com 127.0.0.1"],
    { virtualTimeBudget: 7000, timeout: 9000 }
  );
  assert("Three dependency failure fallback", dependencyFailDom.includes("could not load its 3D engine") && dependencyFailDom.includes('<section class="fallback" id="fallback">'));

  const lowTierDom = await dumpDom(browser, origin, "/world.html?qa=1", ["--enable-low-end-device-mode"]);
  assert("low-tier fallback includes Try Anyway", lowTierDom.includes('<button class="secondary-action" id="tryAnywayButton" type="button">Try anyway</button>'));
  assert("low-tier QA route state", lowTierDom.includes('data-qa="route">low-tier fallback'));

  const scenicDom = await dumpDom(browser, origin, "/index.html?scenic=1&verifyMode=1");
  assert("static scenic reaches world shell", scenicDom.includes('id="stationControls"') || scenicDom.includes('id="fallback"'));
  assert("static scenic stores world preference at runtime", scenicDom.includes('data-mode-preference="world"'));
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
}

const localPreview = await startLocalPreviewServer();
try {
  const previewHome = await fetchText(localPreview.origin, "/");
  assert("serve-local home route", previewHome.status === 200 && previewHome.body.includes("Explore the studio"));
  assert("serve-local security headers", previewHome.headers.get("x-content-type-options") === "nosniff" && previewHome.headers.get("referrer-policy") === "strict-origin-when-cross-origin");

  const previewWorld = await fetchText(localPreview.origin, "/world");
  assert("serve-local clean world route", previewWorld.status === 200 && previewWorld.body.includes("studioCanvas") && previewWorld.body.includes("world.js"));

  const previewThanks = await fetchText(localPreview.origin, "/thanks");
  assert("serve-local clean thanks route", previewThanks.status === 200 && previewThanks.body.includes("Message received"));

  const previewMissing = await fetchText(localPreview.origin, "/not-a-real-page");
  assert("serve-local branded missing route", previewMissing.status === 404 && previewMissing.body.includes("That page is not in the Showcase Designs build"));

  const dryRun = spawnSync("node", ["verify-production.mjs"], {
    cwd: root,
    encoding: "utf8",
    timeout: 20000,
    env: { ...process.env, SHOWCASE_ORIGIN: localPreview.origin }
  });
  assert("production verifier passes against serve-local", dryRun.status === 0, dryRun.stderr || dryRun.stdout);
} finally {
  localPreview.child.kill("SIGTERM");
  await new Promise((resolveClose) => localPreview.child.once("close", resolveClose));
}

const distPreview = await startLocalPreviewServer(["--root", "dist"]);
try {
  const distHome = await fetchText(distPreview.origin, "/");
  assert("serve-local dist home route", distHome.status === 200 && distHome.body.includes("Explore the studio"));

  const distWorld = await fetchText(distPreview.origin, "/world");
  assert("serve-local dist clean world route", distWorld.status === 200 && distWorld.body.includes("studioCanvas") && distWorld.body.includes("world.js"));

  const distReadme = await fetchText(distPreview.origin, "/README.md");
  assert("serve-local dist excludes repo docs", distReadme.status === 404 && distReadme.body.includes("That page is not in the Showcase Designs build"));

  const distVerifier = await fetchText(distPreview.origin, "/verify-world.mjs");
  assert("serve-local dist excludes verifier scripts", distVerifier.status === 404 && distVerifier.body.includes("That page is not in the Showcase Designs build"));

  const distDryRun = spawnSync("node", ["verify-production.mjs"], {
    cwd: root,
    encoding: "utf8",
    timeout: 20000,
    env: { ...process.env, SHOWCASE_ORIGIN: distPreview.origin }
  });
  assert("production verifier passes against Cloudflare dist package", distDryRun.status === 0, distDryRun.stderr || distDryRun.stdout);
} finally {
  distPreview.child.kill("SIGTERM");
  await new Promise((resolveClose) => distPreview.child.once("close", resolveClose));
}

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  process.exitCode = 1;
} else {
  console.log(`\n${checks.length} checks passed.`);
}
