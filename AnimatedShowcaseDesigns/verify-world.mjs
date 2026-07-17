import { createServer } from "node:http";
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { inflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import sharp from "sharp";
import { stations } from "./world-data.js";
import { roomLayout, worldReconstruction } from "./world-layout.js";

const root = process.cwd();
const rootPrefix = root.endsWith("/") ? root : `${root}/`;
const evidenceDir = join(root, ".agent/runs/higgsfield-1to1-blender-world/evidence");
const checks = [];

mkdirSync(evidenceDir, { recursive: true });

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

function readJson(path) {
  return JSON.parse(readText(path));
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

function fileSha256(path) {
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
  if (ext === ".json") return "application/json";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".avif") return "image/avif";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".glb") return "model/gltf-binary";
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
      const body = readFileSync(resolve(root, "./404.html"));
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

function dumpDom(browser, origin, path, extraArgs = [], options = {}) {
  const profile = mkdtempSync(join(tmpdir(), "showcase-world-"));
  const width = options.width || 1440;
  const height = options.height || 900;
  const child = spawn(browser, [
    "--headless=new",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--use-angle=swiftshader",
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    `--virtual-time-budget=${options.virtualTimeBudget || 5000}`,
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
    } catch {
      try {
        child.kill(signal);
      } catch {}
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

function captureScreenshot(browser, origin, path, width, height, evidenceName) {
  const profile = mkdtempSync(join(tmpdir(), "showcase-world-shot-"));
  const output = join(profile, "screenshot.png");
  const child = spawn(browser, [
    "--headless=new",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--hide-scrollbars",
    "--use-angle=swiftshader",
    "--force-device-scale-factor=1",
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

      if (Date.now() - started > 14000) {
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
      if (evidenceName) {
        writeFileSync(join(evidenceDir, evidenceName), bytes);
      }
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
  if (bytes.subarray(0, 8).toString("hex") !== signature) throw new Error("Not a PNG");

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

function samplePixels(png) {
  const x0 = Math.floor(png.width * 0.06);
  const x1 = Math.floor(png.width * 0.94);
  const y0 = Math.floor(png.height * 0.08);
  const y1 = Math.floor(png.height * 0.92);
  let nonDark = 0;
  let bright = 0;
  let warm = 0;
  let varied = 0;
  let previousTotal = 0;
  let samples = 0;

  for (let sy = 0; sy < 90; sy += 1) {
    const y = Math.min(y1 - 1, y0 + Math.floor(((y1 - y0) * sy) / 90));
    const row = png.rows[y];
    for (let sx = 0; sx < 90; sx += 1) {
      const x = Math.min(x1 - 1, x0 + Math.floor(((x1 - x0) * sx) / 90));
      const index = x * png.channels;
      const r = row[index];
      const g = row[index + 1];
      const b = row[index + 2];
      const total = r + g + b;
      if (total > 30) nonDark += 1;
      if (total > 150) bright += 1;
      if (r >= g && g >= b && total > 90) warm += 1;
      if (samples > 0 && Math.abs(total - previousTotal) > 18) varied += 1;
      previousTotal = total;
      samples += 1;
    }
  }

  return { nonDark, bright, warm, varied, samples };
}

function assertWorldScreenshot(name, bytes, minWidth, minHeight) {
  const png = parsePng(bytes);
  const pixels = samplePixels(png);
  assert(`${name} screenshot size`, png.width >= minWidth && png.height >= minHeight, `${png.width}x${png.height}`);
  assert(`${name} screenshot is nonblank 3D evidence`, pixels.nonDark > 700 && pixels.bright > 40 && pixels.varied > 120, JSON.stringify(pixels));
}

function readEvidenceImage(name) {
  return readFileSync(join(evidenceDir, name));
}

const deferredVisualFailures = [];
const ownerDiagnosticFailures = [];

function ownerDiagnostic(name, condition, detail = {}) {
  if (condition) {
    pass(name);
    return;
  }
  ownerDiagnosticFailures.push({ name, detail });
  console.log(`not ok - ${name}`);
}

function assertNoOwnerDiagnosticFailures() {
  const reportPath = join(evidenceDir, "owner-rejection-diagnostics-report.json");
  const report = {
    status: ownerDiagnosticFailures.length ? "failed" : "passed",
    rejectedDefectsCovered: [
      "screen containment and physical frame inset",
      "material-board wall and side-wall fidelity",
      "warm cove/wall-wash lighting shape",
      "floor reflection shape and breakup",
      "black-void rejection in first views and walking views"
    ],
    failures: ownerDiagnosticFailures
  };
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  if (ownerDiagnosticFailures.length) {
    fail("owner-rejection diagnostic preflight", JSON.stringify({
      failures: ownerDiagnosticFailures.map((item) => item.name),
      evidence: "evidence/owner-rejection-diagnostics-report.json"
    }));
  }
  pass("owner-rejection diagnostic preflight");
}

function assertOwnerBaselineDiagnosticPreserved() {
  const report = JSON.parse(readFileSync(join(evidenceDir, "owner-rejection-diagnostics-baseline-failure.json"), "utf8"));
  const failureNames = new Set((report.failures || []).map((failure) => failure.name));
  const requiredFailureNames = [
    "owner diagnostic exports physical frame inset geometry",
    "owner diagnostic runtime uses inner screen corners for websites and hit targets",
    "owner diagnostic material maps exist for wall floor metal glass and lighting",
    "owner diagnostic rejects hard rectangular wall-wash and floor-glow bars",
    "owner diagnostic runtime loads material-board-derived texture maps"
  ];
  assert(
    "owner-rejection baseline failing diagnostics preserved",
    report.status === "failed_as_required"
      && report.command === "node verify-world.mjs"
      && requiredFailureNames.every((name) => failureNames.has(name))
      && (report.coveredRejectedRegions || []).includes("wall")
      && (report.coveredRejectedRegions || []).includes("frame-screen")
      && (report.coveredRejectedRegions || []).includes("lighting")
      && (report.coveredRejectedRegions || []).includes("floor"),
    JSON.stringify({ status: report.status, failures: [...failureNames], coveredRejectedRegions: report.coveredRejectedRegions })
  );
}

function assertPhase0MissingEvidenceDecisionRequest() {
  const requiredMissingPoseIds = ["fullscreen", "inspection"];
  const requiredOwnerDecisionOptionIds = [
    "provide_archived_evidence",
    "explicit_phase0_waiver",
    "reject_current_visual"
  ];
  const jsonPath = join(evidenceDir, "phase0-missing-evidence-decision-request.json");
  const htmlPath = join(evidenceDir, "phase0-missing-evidence-decision-request.html");
  const request = JSON.parse(readFileSync(jsonPath, "utf8"));
  const html = readFileSync(htmlPath, "utf8");
  const optionIds = new Set((request.ownerDecisionOptions || []).map((option) => option.id));
  const missingDirectBeforeCapturePoseIds = new Set(request.missingDirectBeforeCapturePoseIds || []);
  const missingDiagnosticFailurePoseIds = new Set(request.missingDiagnosticFailurePoseIds || []);

  assert(
    "phase0 missing-evidence owner decision request preserved",
    request.status === "owner_decision_required"
      && requiredMissingPoseIds.every((poseId) => missingDirectBeforeCapturePoseIds.has(poseId))
      && requiredMissingPoseIds.every((poseId) => missingDiagnosticFailurePoseIds.has(poseId))
      && requiredOwnerDecisionOptionIds.every((optionId) => optionIds.has(optionId))
      && html.includes("Phase 0 Missing Evidence Decision Request")
      && html.includes("owner_decision_required")
      && html.includes("provide_archived_evidence")
      && html.includes("explicit_phase0_waiver")
      && html.includes("reject_current_visual"),
    JSON.stringify({
      status: request.status,
      missingDirectBeforeCapturePoseIds: request.missingDirectBeforeCapturePoseIds,
      missingDiagnosticFailurePoseIds: request.missingDiagnosticFailurePoseIds,
      ownerDecisionOptionIds: [...optionIds]
    })
  );
}

function assertOwnerFinalDecisionRequest() {
  const requiredDecisionIds = [
    "phase0_historical_evidence_resolution",
    "material_reference_confirmation",
    "visual_match_acceptance"
  ];
  const requiredResponseIds = [
    "provide_archived_evidence",
    "explicit_phase0_waiver",
    "reject_current_visual",
    "confirm_material_style_board",
    "provide_different_material_reference",
    "accept_visual_match",
    "reject_visual_match_with_regions"
  ];
  const request = JSON.parse(readFileSync(join(evidenceDir, "owner-final-decision-request.json"), "utf8"));
  const html = readFileSync(join(evidenceDir, "owner-final-decision-request.html"), "utf8");
  const manifest = JSON.parse(readFileSync(join(evidenceDir, "owner-review-pairs-manifest.json"), "utf8"));
  const dogfoodReport = JSON.parse(readFileSync(join(evidenceDir, "dogfood-report.json"), "utf8"));
  const decisions = new Map((request.decisions || []).map((decision) => [decision.id, decision]));
  const responseIds = new Set((request.decisions || []).flatMap((decision) => (
    decision.acceptableOwnerResponses || []
  ).map((response) => response.id)));
  const decisionIds = new Set(request.requiredDecisionIds || []);

  assert(
    "owner final-decision request preserved",
    request.status === "pending_owner"
      && request.ownerAcceptanceReceived === false
      && request.visualMatchAcceptanceReceived === false
      && request.goalMayBeMarkedComplete === false
      && requiredDecisionIds.every((id) => decisionIds.has(id))
      && decisions.get("phase0_historical_evidence_resolution")?.status === "pending_owner"
      && decisions.get("material_reference_confirmation")?.status === "pending_owner"
      && decisions.get("material_reference_confirmation")?.evidence?.selectedMaterialReference === "img/world/gallery-room/material-style-board.avif"
      && decisions.get("material_reference_confirmation")?.evidence?.rawMaterialReference === "artifacts/higgsfield/showcase-gallery-next-level/raw/material-style-board-manual-2026-06-18T21-41-38-662Z.png"
      && decisions.get("visual_match_acceptance")?.status === "pending_owner"
      && requiredResponseIds.every((id) => responseIds.has(id))
      && manifest.supplemental?.ownerFinalDecisionRequest?.json === "owner-final-decision-request.json"
      && manifest.supplemental?.ownerFinalDecisionRequest?.html === "owner-final-decision-request.html"
      && (dogfoodReport.ownerReview?.pairedEvidence || []).includes("owner-final-decision-request.json")
      && (dogfoodReport.ownerReview?.pairedEvidence || []).includes("owner-final-decision-request.html")
      && html.includes("Owner Final Decision Request")
      && html.includes("phase0_historical_evidence_resolution")
      && html.includes("material_reference_confirmation")
      && html.includes("confirm_material_style_board")
      && html.includes("provide_different_material_reference")
      && html.includes("visual_match_acceptance")
      && html.includes("accept_visual_match")
      && html.includes("reject_visual_match_with_regions"),
    JSON.stringify({
      status: request.status,
      ownerAcceptanceReceived: request.ownerAcceptanceReceived,
      visualMatchAcceptanceReceived: request.visualMatchAcceptanceReceived,
      goalMayBeMarkedComplete: request.goalMayBeMarkedComplete,
      requiredDecisionIds: request.requiredDecisionIds,
      materialReferenceDecision: decisions.get("material_reference_confirmation"),
      responseIds: [...responseIds],
      manifest: manifest.supplemental?.ownerFinalDecisionRequest,
      pairedEvidence: dogfoodReport.ownerReview?.pairedEvidence
    })
  );
}

function assertOwnerFinalDecisionProofLinksPreserved() {
  const request = JSON.parse(readFileSync(join(evidenceDir, "owner-final-decision-request.json"), "utf8"));
  const html = readFileSync(join(evidenceDir, "owner-final-decision-request.html"), "utf8");
  const packetHtml = readFileSync(join(evidenceDir, "owner-review-packet.html"), "utf8");
  const decisions = new Map((request.decisions || []).map((decision) => [decision.id, decision]));
  const visualEvidence = decisions.get("visual_match_acceptance")?.evidence || {};
  const requiredEvidence = {
    ownerReviewPacket: "owner-review-packet.html",
    ownerRejectionFixedAfter: "owner-rejection-fixed-after.html",
    ownerRejectionFixedAfterReport: "owner-rejection-fixed-after.json",
    ownerRejectionDefectMap: "owner-rejection-defect-map.png",
    ownerRejectionDefectMapReport: "owner-rejection-defect-map.json",
    materialRuntimeProof: "owner-review-material-runtime-proof.png",
    materialRuntimeProofReport: "material-runtime-proof-report.json",
    noBlackVoidRenderedProof: "owner-review-no-black-void-proof.png",
    noBlackVoidRenderedProofReport: "no-black-void-rendered-proof-report.json",
    wallSlabDetailProof: "owner-review-wall-slab-detail-proof.png",
    wallSlabDetailProofReport: "wall-slab-detail-report.json",
    lightingFloorProof: "owner-review-lighting-floor-proof.png",
    lightingShapeReport: "lighting-shape-report.json",
    floorReflectionReport: "floor-reflection-report.json",
    screenFrameInsetProof: "owner-review-screen-inset-proof.png",
    screenFrameInsetProofReport: "screen-inner-frame-containment-report.json",
    websiteFrameFitReport: "browser-probe-summary.json",
    structuralRegionProof: "owner-review-structural-region-proof.png",
    structuralRegionProofReport: "structural-region-continuity-report.json",
    criticalRegionZooms: "owner-review-critical-region-zooms.png",
    criticalRegionZoomsReport: "owner-review-critical-region-zooms.json",
    readinessAudit: "owner-review-readiness-audit.html",
    strictCompletionAudit: "strict-prd-completion-audit.html"
  };
  const requiredTriptychs = [
    "owner-review-desktop-triptych.png",
    "owner-review-mobile-triptych.png",
    "owner-review-fullscreen-triptych.png",
    "owner-review-inspection-triptych.png"
  ];
  const requiredCleanCanvasPairs = [
    "owner-review-desktop-clean-canvas-pair.png",
    "owner-review-mobile-clean-canvas-pair.png",
    "owner-review-fullscreen-clean-canvas-pair.png"
  ];
  const requiredOwnerReplyLines = [
    "Phase 0 decision: provide_archived_evidence | explicit_phase0_waiver | reject_current_visual",
    "Material reference decision: confirm_material_style_board | provide_different_material_reference",
    "Visual decision: accept_visual_match | reject_visual_match_with_regions"
  ];
  const evidenceValues = Object.values(requiredEvidence);
  const packetEvidenceValues = evidenceValues.filter((file) => file !== "owner-review-packet.html");

  assert(
    "owner final-decision request directly links rejected-defect proof",
    Object.entries(requiredEvidence).every(([key, value]) => visualEvidence[key] === value)
      && Array.isArray(visualEvidence.triptychs)
      && requiredTriptychs.every((file) => visualEvidence.triptychs.includes(file))
      && Array.isArray(visualEvidence.cleanCanvasPairs)
      && requiredCleanCanvasPairs.every((file) => visualEvidence.cleanCanvasPairs.includes(file))
      && evidenceValues.every((file) => html.includes(file))
      && requiredTriptychs.every((file) => html.includes(file))
      && requiredCleanCanvasPairs.every((file) => html.includes(file))
      && packetEvidenceValues.every((file) => packetHtml.includes(file))
      && requiredTriptychs.every((file) => packetHtml.includes(file))
      && requiredCleanCanvasPairs.every((file) => packetHtml.includes(file))
      && packetHtml.includes("Exact owner reply required")
      && requiredOwnerReplyLines.every((line) => html.includes(line) && packetHtml.includes(line)),
    JSON.stringify({
      visualEvidence,
      requiredEvidence,
      requiredTriptychs,
      requiredCleanCanvasPairs,
      packetHasExactReplyHeading: packetHtml.includes("Exact owner reply required"),
      ownerReplyLinesInPacket: requiredOwnerReplyLines.map((line) => packetHtml.includes(line))
    })
  );
}

function assertPhase0ArchiveNearMissClassification() {
  const report = JSON.parse(readFileSync(join(evidenceDir, "phase0-capture-search-report.json"), "utf8"));
  const candidatesByPath = new Map((report.candidates || []).map((candidate) => [candidate.path, candidate]));
  const fullscreenNearMiss = candidatesByPath.get(".agent/runs/higgsfield-1to1-blender-world/evidence/fullscreen-hero-3d.png");
  const photoMatchDesktop = candidatesByPath.get(".agent/runs/higgsfield-1to1-blender-world/evidence/photo-match-desktop.png");
  const photoMatchMobile = candidatesByPath.get(".agent/runs/higgsfield-1to1-blender-world/evidence/photo-match-mobile.png");

  assert(
    "phase0 archive search classifies reviewed near-miss evidence",
    fullscreenNearMiss?.classification === "reviewed_pre_rebuild_fullscreen_reference_capture_not_promoted"
      && fullscreenNearMiss.dimensions?.width === 1920
      && fullscreenNearMiss.dimensions?.height === 1080
      && photoMatchDesktop?.classification === "reviewed_pre_rebuild_photo_match_capture_not_pose_failure"
      && photoMatchMobile?.classification === "reviewed_pre_rebuild_photo_match_capture_not_pose_failure",
    JSON.stringify({
      fullscreenNearMiss,
      photoMatchDesktop,
      photoMatchMobile
    })
  );
}

function assertReadinessAuditStrictStatusPrecision() {
  const strictAudit = JSON.parse(readFileSync(join(evidenceDir, "strict-prd-completion-audit.json"), "utf8"));
  const readinessAudit = JSON.parse(readFileSync(join(evidenceDir, "owner-review-readiness-audit.json"), "utf8"));
  const row = (readinessAudit.requirements || []).find((item) => item.id === "strict-prd-completion-audit");
  const expectedStatus = strictAudit.automatedEvidenceComplete
    && strictAudit.ownerAcceptanceReceived === false
    && strictAudit.goalMayBeMarkedComplete === false
    ? "proven"
    : strictAudit.status;

  assert(
    "readiness audit reports strict audit status precisely",
    row?.status === expectedStatus
      && row.evidence?.status === strictAudit.status
      && row.evidence?.automatedEvidenceComplete === strictAudit.automatedEvidenceComplete
      && row.evidence?.goalMayBeMarkedComplete === strictAudit.goalMayBeMarkedComplete,
    JSON.stringify({
      expectedStatus,
      actualStatus: row?.status,
      strictStatus: strictAudit.status,
      strictAutomatedEvidenceComplete: strictAudit.automatedEvidenceComplete,
      strictGoalMayBeMarkedComplete: strictAudit.goalMayBeMarkedComplete
    })
  );
}

function expectedOwnerReviewEvidenceStatus(strictAudit) {
  return strictAudit.automatedEvidenceComplete
    ? "owner-review-ready-owner-acceptance-pending"
    : "runtime-gates-passed-strict-evidence-incomplete-owner-decisions-pending";
}

function assertOwnerReviewStatusPrecision() {
  const strictAudit = JSON.parse(readFileSync(join(evidenceDir, "strict-prd-completion-audit.json"), "utf8"));
  const readinessAudit = JSON.parse(readFileSync(join(evidenceDir, "owner-review-readiness-audit.json"), "utf8"));
  const dogfoodReport = JSON.parse(readFileSync(join(evidenceDir, "dogfood-report.json"), "utf8"));
  const fixedAfterReport = JSON.parse(readFileSync(join(evidenceDir, "owner-rejection-fixed-after.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(evidenceDir, "owner-review-pairs-manifest.json"), "utf8"));
  const expectedStatus = expectedOwnerReviewEvidenceStatus(strictAudit);

  assert(
    "owner-review status precision preserved",
    readinessAudit.status === strictAudit.status
      && dogfoodReport.status === expectedStatus
      && fixedAfterReport.status === expectedStatus
      && manifest.supplemental?.ownerRejectionFixedAfter?.status === expectedStatus
      && fixedAfterReport.ownerAcceptanceReceived === false
      && fixedAfterReport.goalMayBeMarkedComplete === false
      && dogfoodReport.ownerReview?.ownerAcceptanceReceived === false,
    JSON.stringify({
      strictStatus: strictAudit.status,
      strictAutomatedEvidenceComplete: strictAudit.automatedEvidenceComplete,
      readinessStatus: readinessAudit.status,
      expectedStatus,
      dogfoodStatus: dogfoodReport.status,
      fixedAfterStatus: fixedAfterReport.status,
      manifestStatus: manifest.supplemental?.ownerRejectionFixedAfter?.status,
      dogfoodOwnerAcceptanceReceived: dogfoodReport.ownerReview?.ownerAcceptanceReceived,
      fixedAfterOwnerAcceptanceReceived: fixedAfterReport.ownerAcceptanceReceived,
      fixedAfterGoalMayBeMarkedComplete: fixedAfterReport.goalMayBeMarkedComplete
    })
  );
}

async function assertPhase0ExpandedEvidenceReviewPreserved() {
  const searchReport = JSON.parse(readFileSync(join(evidenceDir, "phase0-expanded-local-evidence-search.json"), "utf8"));
  const review = JSON.parse(readFileSync(join(evidenceDir, "phase0-expanded-evidence-review.json"), "utf8"));
  const imageMetadata = await sharp(join(evidenceDir, "phase0-expanded-evidence-review.png")).metadata();
  const reviewedByPath = new Map((review.reviewedCandidates || []).map((candidate) => [candidate.path, candidate]));
  const requiredReviewedClassifications = new Map([
    [
      ".agent/runs/higgsfield-1to1-blender-world/evidence/fullscreen-hero-3d.png",
      "reviewed_pre_rebuild_fullscreen_reference_or_empty_frame_capture_not_live_failure"
    ],
    [
      ".agent/runs/higgsfield-1to1-blender-world/evidence/visual-match-inspect-blender-debug.png",
      "reviewed_pre_rebuild_inspection_blender_debug_image_not_live_route_failure"
    ],
    [
      ".agent/runs/higgsfield-rendered-world/evidence/desktop-inspection-evenpath.png",
      "reviewed_previous_goal_inspection_capture_not_current_owner_rejected_build"
    ],
    [
      "artifacts/higgsfield/showcase-gallery-next-level/selected/station-inspect-plate-empty-4k-derived-2026-06-19.png",
      "reviewed_inspection_reference_asset_not_live_route_failure"
    ],
    [
      ".agent/runs/higgsfield-1to1-blender-world/evidence/live-reconstruction-gate-failure.log",
      "reviewed_pre_rebuild_default_route_failure_log_not_fullscreen_or_inspection_pose"
    ],
    [
      ".agent/runs/higgsfield-1to1-blender-world/evidence/photo-match-live-default-failure.log",
      "reviewed_pre_rebuild_photo_match_log_not_fullscreen_or_inspection_pose"
    ],
    [
      ".agent/runs/higgsfield-1to1-blender-world/evidence/visual-gate-failures-20260621T003402Z.json",
      "reviewed_pre_rebuild_visual_gate_failures_desktop_mobile_only"
    ]
  ]);
  const missingReviewedClassifications = [...requiredReviewedClassifications.entries()].filter(([path, classification]) => (
    reviewedByPath.get(path)?.reviewedClassification !== classification
  ));

  assert(
    "phase0 expanded local evidence review preserved",
    searchReport.requirement === "Expanded local search for missing Phase 0 fullscreen and inspection before-change failure evidence."
      && searchReport.candidateCount === (searchReport.candidates || []).length
      && (searchReport.preRebuildFullscreenCandidates || []).length >= 1
      && (searchReport.preRebuildInspectionCandidates || []).length >= 7
      && (searchReport.preRebuildFailureCandidates || []).length >= 3
      && review.sourceReport === "phase0-expanded-local-evidence-search.json"
      && review.status === "no_defensible_fullscreen_or_inspection_phase0_promotion_found"
      && Array.isArray(review.promotedEvidence)
      && review.promotedEvidence.length === 0
      && review.reviewedCandidateCount === (review.reviewedCandidates || []).length
      && review.reviewedCandidateCount >= 11
      && missingReviewedClassifications.length === 0
      && imageMetadata.width >= 760
      && imageMetadata.height >= 1000,
    JSON.stringify({
      searchCandidateCount: searchReport.candidateCount,
      preRebuildFullscreenCandidates: searchReport.preRebuildFullscreenCandidates?.length,
      preRebuildInspectionCandidates: searchReport.preRebuildInspectionCandidates?.length,
      preRebuildFailureCandidates: searchReport.preRebuildFailureCandidates?.length,
      reviewStatus: review.status,
      reviewedCandidateCount: review.reviewedCandidateCount,
      promotedEvidenceCount: review.promotedEvidence?.length,
      missingReviewedClassifications,
      imageDimensions: { width: imageMetadata.width, height: imageMetadata.height }
    })
  );
}

function assertPhase0ArchiveEvidenceSearchPreserved() {
  const report = JSON.parse(readFileSync(join(evidenceDir, "phase0-archive-evidence-search.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(evidenceDir, "owner-review-pairs-manifest.json"), "utf8"));
  const dogfoodReport = JSON.parse(readFileSync(join(evidenceDir, "dogfood-report.json"), "utf8"));
  const readinessAudit = JSON.parse(readFileSync(join(evidenceDir, "owner-review-readiness-audit.json"), "utf8"));
  const strictAudit = JSON.parse(readFileSync(join(evidenceDir, "strict-prd-completion-audit.json"), "utf8"));
  const searchRootLabels = new Set((report.searchRoots || []).map((item) => item.label));
  const archiveRows = report.archives || [];
  const matchingClassifications = new Set(archiveRows.flatMap((archive) => (
    archive.matches || []
  ).map((match) => match.classification)));
  const readinessRow = (readinessAudit.requirements || []).find((item) => item.id === "phase0-archive-evidence-search");
  const strictRow = (strictAudit.requirements || []).find((item) => item.id === "phase0-archive-evidence-search");

  assert(
    "phase0 project archive evidence search preserved",
    report.status === "no_defensible_fullscreen_or_inspection_phase0_archive_evidence_found"
      && report.requirement === "Search project zip archives for missing Phase 0 fullscreen and inspection before-change failure evidence without extracting unrelated personal archives."
      && searchRootLabels.has("current workspace")
      && searchRootLabels.has("parent workspace")
      && searchRootLabels.has("Downloads")
      && report.archiveCount >= 20
      && report.archivesWithMatches >= 1
      && report.matchingMemberCount >= 1
      && report.candidateMemberCount === 0
      && Array.isArray(report.candidateMembers)
      && report.candidateMembers.length === 0
      && matchingClassifications.has("reviewed_archive_photo_match_room_plate_reference_not_failure_capture")
      && manifest.supplemental?.phase0ArchiveEvidenceSearch?.json === "phase0-archive-evidence-search.json"
      && manifest.supplemental?.phase0ArchiveEvidenceSearch?.status === report.status
      && (dogfoodReport.ownerReview?.pairedEvidence || []).includes("phase0-archive-evidence-search.json")
      && readinessRow?.status === "proven"
      && strictRow?.status === "proven",
    JSON.stringify({
      status: report.status,
      archiveCount: report.archiveCount,
      archivesWithMatches: report.archivesWithMatches,
      matchingMemberCount: report.matchingMemberCount,
      candidateMemberCount: report.candidateMemberCount,
      searchRoots: report.searchRoots,
      matchingClassifications: [...matchingClassifications],
      manifest: manifest.supplemental?.phase0ArchiveEvidenceSearch,
      readinessRow: readinessRow?.status,
      strictRow: strictRow?.status
    })
  );
}

function assertPhase0GitHistoryEvidenceSearchPreserved() {
  const report = JSON.parse(readFileSync(join(evidenceDir, "phase0-git-history-evidence-search.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(evidenceDir, "owner-review-pairs-manifest.json"), "utf8"));
  const dogfoodReport = JSON.parse(readFileSync(join(evidenceDir, "dogfood-report.json"), "utf8"));
  const readinessAudit = JSON.parse(readFileSync(join(evidenceDir, "owner-review-readiness-audit.json"), "utf8"));
  const strictAudit = JSON.parse(readFileSync(join(evidenceDir, "strict-prd-completion-audit.json"), "utf8"));
  const readinessRow = (readinessAudit.requirements || []).find((item) => item.id === "phase0-git-history-evidence-search");
  const strictRow = (strictAudit.requirements || []).find((item) => item.id === "phase0-git-history-evidence-search");
  const pathspecs = new Set(report.pathspecs || []);

  assert(
    "phase0 git history evidence search preserved",
    report.status === "no_defensible_fullscreen_or_inspection_phase0_git_history_evidence_found"
      && report.requirement === "Search tracked Git history for missing Phase 0 fullscreen and inspection before-change failure evidence."
      && report.gitCommand === "git log --all --name-only"
      && pathspecs.has(".agent/runs/higgsfield-1to1-blender-world")
      && pathspecs.has(".agent/runs/higgsfield-rendered-world")
      && pathspecs.has("verification")
      && report.commitCount >= 1
      && Array.isArray(report.trackedMatches)
      && report.trackedMatches.length >= 1
      && Array.isArray(report.candidateMatches)
      && report.candidateMatches.length === 0
      && manifest.supplemental?.phase0GitHistoryEvidenceSearch?.json === "phase0-git-history-evidence-search.json"
      && manifest.supplemental?.phase0GitHistoryEvidenceSearch?.status === report.status
      && (dogfoodReport.ownerReview?.pairedEvidence || []).includes("phase0-git-history-evidence-search.json")
      && readinessRow?.status === "proven"
      && strictRow?.status === "proven",
    JSON.stringify({
      status: report.status,
      commitCount: report.commitCount,
      trackedMatchCount: report.trackedMatches?.length,
      candidateMatchCount: report.candidateMatches?.length,
      manifest: manifest.supplemental?.phase0GitHistoryEvidenceSearch,
      readinessRow: readinessRow?.status,
      strictRow: strictRow?.status
    })
  );
}

function assertScreenScaleInsetReportPreserved() {
  const report = JSON.parse(readFileSync(join(evidenceDir, "screen-scale-inset-report.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(evidenceDir, "owner-review-pairs-manifest.json"), "utf8"));
  const dogfoodReport = JSON.parse(readFileSync(join(evidenceDir, "dogfood-report.json"), "utf8"));
  const readinessAudit = JSON.parse(readFileSync(join(evidenceDir, "owner-review-readiness-audit.json"), "utf8"));
  const strictAudit = JSON.parse(readFileSync(join(evidenceDir, "strict-prd-completion-audit.json"), "utf8"));
  const requiredPoseIds = ["desktopHero", "mobileHero", "inspectSelected", "fullscreenHero"];
  const poseIds = new Set(Object.keys(report.poses || {}));
  const readinessRow = (readinessAudit.requirements || []).find((item) => item.id === "screen-scale-inset");
  const strictRow = (strictAudit.requirements || []).find((item) => item.id === "screen-scale-inset");

  assert(
    "screen scale and inset report preserved",
    report.status === "passed"
      && report.requirement === "Projected website screen planes remain smaller than physical frame rails with measurable inset margins across desktop, mobile, fullscreen, and inspection poses."
      && requiredPoseIds.every((poseId) => poseIds.has(poseId))
      && Number(report.maxInnerOuterAreaRatio) <= 0.91
      && Number(report.minInsetPx) >= 2
      && (report.failures || []).length === 0
      && manifest.supplemental?.screenScaleInsetReport === "screen-scale-inset-report.json"
      && (dogfoodReport.ownerReview?.pairedEvidence || []).includes("screen-scale-inset-report.json")
      && readinessRow?.status === "proven"
      && strictRow?.status === "proven",
    JSON.stringify({
      status: report.status,
      poses: Object.keys(report.poses || {}),
      maxInnerOuterAreaRatio: report.maxInnerOuterAreaRatio,
      minInsetPx: report.minInsetPx,
      failures: report.failures,
      manifest: manifest.supplemental?.screenScaleInsetReport,
      readinessRow: readinessRow?.status,
      strictRow: strictRow?.status
    })
  );
}

function assertFirstViewFrameContaminationReportPreserved() {
  const report = JSON.parse(readFileSync(join(evidenceDir, "first-view-frame-contamination-report.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(evidenceDir, "owner-review-pairs-manifest.json"), "utf8"));
  const dogfoodReport = JSON.parse(readFileSync(join(evidenceDir, "dogfood-report.json"), "utf8"));
  const readinessAudit = JSON.parse(readFileSync(join(evidenceDir, "owner-review-readiness-audit.json"), "utf8"));
  const strictAudit = JSON.parse(readFileSync(join(evidenceDir, "strict-prd-completion-audit.json"), "utf8"));
  const requiredPoseIds = ["desktopHero", "mobileHero", "fullscreenHero", "inspectSelected"];
  const poseIds = new Set(Object.keys(report.poses || {}));
  const readinessRow = (readinessAudit.requirements || []).find((item) => item.id === "first-view-frame-contamination");
  const strictRow = (strictAudit.requirements || []).find((item) => item.id === "first-view-frame-contamination");
  const cssSignals = report.cssSignals || {};

  assert(
    "first-view frame contamination report preserved",
    report.status === "passed"
      && report.requirement === "First-view desktop, mobile, fullscreen, and inspection screenshots must not show labels, yellow guide bands, debug strips, hover chrome, or calibration overlays crossing physical frame interiors."
      && requiredPoseIds.every((poseId) => poseIds.has(poseId))
      && Number(report.totalInspectedRingPixels) > 0
      && Number(report.totalGuideBandPixels) === 0
      && Number(report.maxGuideBandPixelRatio) <= 0.0005
      && (report.failures || []).length === 0
      && Object.values(cssSignals).every(Boolean)
      && manifest.supplemental?.firstViewFrameContaminationReport === "first-view-frame-contamination-report.json"
      && (dogfoodReport.ownerReview?.pairedEvidence || []).includes("first-view-frame-contamination-report.json")
      && readinessRow?.status === "proven"
      && strictRow?.status === "proven",
    JSON.stringify({
      status: report.status,
      poses: Object.keys(report.poses || {}),
      totalInspectedRingPixels: report.totalInspectedRingPixels,
      totalGuideBandPixels: report.totalGuideBandPixels,
      maxGuideBandPixelRatio: report.maxGuideBandPixelRatio,
      cssSignals,
      failures: report.failures,
      manifest: manifest.supplemental?.firstViewFrameContaminationReport,
      readinessRow: readinessRow?.status,
      strictRow: strictRow?.status
    })
  );
}

function assertNormalRouteParityReportPreserved() {
  const report = JSON.parse(readFileSync(join(evidenceDir, "normal-route-parity-report.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(evidenceDir, "owner-review-pairs-manifest.json"), "utf8"));
  const dogfoodReport = JSON.parse(readFileSync(join(evidenceDir, "dogfood-report.json"), "utf8"));
  const readinessAudit = JSON.parse(readFileSync(join(evidenceDir, "owner-review-readiness-audit.json"), "utf8"));
  const strictAudit = JSON.parse(readFileSync(join(evidenceDir, "strict-prd-completion-audit.json"), "utf8"));
  const readinessRow = (readinessAudit.requirements || []).find((item) => item.id === "normal-route-parity");
  const strictRow = (strictAudit.requirements || []).find((item) => item.id === "normal-route-parity");
  const comparisonIds = new Set((report.comparisons || []).map((comparison) => comparison.id));
  const requiredComparisonIds = [
    "desktop-first-view",
    "mobile-first-view",
    "fullscreen-first-view",
    "desktop-inspection",
    "mobile-inspection"
  ];

  assert(
    "normal route parity report preserved",
    report.status === "passed"
      && report.requirement === "Normal /world visual evidence must be at least as good as verify-mode evidence for desktop, mobile, fullscreen, and inspection within a narrow regression tolerance."
      && requiredComparisonIds.every((id) => comparisonIds.has(id))
      && (report.failures || []).length === 0
      && report.routeContract?.normalWorldStartsLiveWalkingView === true
      && report.routeContract?.normalWorldReferenceViewActive === false
      && report.routeContract?.referenceViewIsNotDefaultPassPath === true
      && manifest.supplemental?.normalRouteParityReport === "normal-route-parity-report.json"
      && (dogfoodReport.ownerReview?.pairedEvidence || []).includes("normal-route-parity-report.json")
      && readinessRow?.status === "proven"
      && strictRow?.status === "proven",
    JSON.stringify({
      status: report.status,
      comparisons: [...comparisonIds],
      failures: report.failures,
      routeContract: report.routeContract,
      manifest: manifest.supplemental?.normalRouteParityReport,
      readinessRow: readinessRow?.status,
      strictRow: strictRow?.status
    })
  );
}

function assertOwnerRejectionFixedAfterPreserved() {
  const report = JSON.parse(readFileSync(join(evidenceDir, "owner-rejection-fixed-after.json"), "utf8"));
  const html = readFileSync(join(evidenceDir, "owner-rejection-fixed-after.html"), "utf8");
  const manifest = JSON.parse(readFileSync(join(evidenceDir, "owner-review-pairs-manifest.json"), "utf8"));
  const dogfoodReport = JSON.parse(readFileSync(join(evidenceDir, "dogfood-report.json"), "utf8"));
  const readinessAudit = JSON.parse(readFileSync(join(evidenceDir, "owner-review-readiness-audit.json"), "utf8"));
  const strictAudit = JSON.parse(readFileSync(join(evidenceDir, "strict-prd-completion-audit.json"), "utf8"));
  const beforeImages = new Set((report.before || []).map((item) => item.image));
  const afterImages = new Set((report.after || []).map((item) => item.image));
  const readinessRow = (readinessAudit.requirements || []).find((item) => item.id === "owner-rejection-fixed-after");
  const strictRow = (strictAudit.requirements || []).find((item) => item.id === "owner-rejection-fixed-after");

  assert(
    "owner rejection fixed-after proof preserved",
    report.status === expectedOwnerReviewEvidenceStatus(strictAudit)
      && report.ownerAcceptanceReceived === false
      && report.goalMayBeMarkedComplete === false
      && beforeImages.has("owner-rejection-lighting-wall-screens-01.png")
      && beforeImages.has("owner-rejection-lighting-wall-screens-02.png")
      && afterImages.has("normal-desktop-main-3d.png")
      && afterImages.has("normal-mobile-main-3d.png")
      && afterImages.has("normal-fullscreen-main-3d.png")
      && afterImages.has("normal-desktop-inspection-viewer-3d.png")
      && report.proof?.baselineFailure === "owner-rejection-diagnostics-baseline-failure.json"
      && report.proof?.currentPassingDiagnostics === "owner-rejection-diagnostics-report.json"
      && manifest.supplemental?.ownerRejectionFixedAfter?.json === "owner-rejection-fixed-after.json"
      && manifest.supplemental?.ownerRejectionFixedAfter?.html === "owner-rejection-fixed-after.html"
      && (dogfoodReport.ownerReview?.pairedEvidence || []).includes("owner-rejection-fixed-after.json")
      && (dogfoodReport.ownerReview?.pairedEvidence || []).includes("owner-rejection-fixed-after.html")
      && readinessRow?.status === "proven"
      && strictRow?.status === "proven"
      && html.includes("Owner Rejection Failure Before / Fixed After")
      && html.includes("owner-rejection-lighting-wall-screens-01.png")
      && html.includes("normal-desktop-main-3d.png")
      && html.includes("owner-review-critical-region-zooms.png"),
    JSON.stringify({
      status: report.status,
      ownerAcceptanceReceived: report.ownerAcceptanceReceived,
      goalMayBeMarkedComplete: report.goalMayBeMarkedComplete,
      beforeImages: [...beforeImages],
      afterImages: [...afterImages],
      manifest: manifest.supplemental?.ownerRejectionFixedAfter,
      readinessRow: readinessRow?.status,
      strictRow: strictRow?.status
    })
  );
}

async function assertOwnerReviewTriptychsPreserved() {
  const manifest = JSON.parse(readFileSync(join(evidenceDir, "owner-review-pairs-manifest.json"), "utf8"));
  const dogfoodReport = JSON.parse(readFileSync(join(evidenceDir, "dogfood-report.json"), "utf8"));
  const readinessAudit = JSON.parse(readFileSync(join(evidenceDir, "owner-review-readiness-audit.json"), "utf8"));
  const strictAudit = JSON.parse(readFileSync(join(evidenceDir, "strict-prd-completion-audit.json"), "utf8"));
  const packetHtml = readFileSync(join(evidenceDir, "owner-review-packet.html"), "utf8");
  const triptychs = manifest.triptychs || [];
  const required = new Map([
    ["desktop", { output: "owner-review-desktop-triptych.png", width: 2188, height: 510 }],
    ["mobile", { output: "owner-review-mobile-triptych.png", width: 1108, height: 840 }],
    ["inspection", { output: "owner-review-inspection-triptych.png", width: 2188, height: 510 }],
    ["fullscreen", { output: "owner-review-fullscreen-triptych.png", width: 2908, height: 600 }]
  ]);
  const byId = new Map(triptychs.map((item) => [item.id, item]));
  const metadata = {};
  for (const [id, expected] of required) {
    const item = byId.get(id);
    if (item?.output) {
      metadata[id] = await sharp(join(evidenceDir, item.output)).metadata();
    }
  }
  const pairedEvidence = dogfoodReport.ownerReview?.pairedEvidence || [];
  const readinessRow = (readinessAudit.requirements || []).find((item) => item.id === "owner-review-pairs");
  const strictRow = (strictAudit.requirements || []).find((item) => item.id === "owner-review-packet");
  const allRequiredTriptychs = [...required].every(([id, expected]) => {
    const item = byId.get(id);
    const dimensions = metadata[id] || {};
    return item?.output === expected.output
      && fileExists(`.agent/runs/higgsfield-1to1-blender-world/evidence/${expected.output}`)
      && Boolean(item.target)
      && Boolean(item.reference)
      && Boolean(item.runtime)
      && dimensions.width === expected.width
      && dimensions.height === expected.height
      && pairedEvidence.includes(expected.output)
      && packetHtml.includes(expected.output);
  });

  assert(
    "owner review target/reference/runtime triptychs preserved",
    triptychs.length === required.size
      && allRequiredTriptychs
      && readinessRow?.status === "proven"
      && strictRow?.status === "proven"
      && packetHtml.includes("Target / Blender Reference / Runtime Triptychs"),
    JSON.stringify({
      manifestTriptychs: triptychs,
      pairedEvidence,
      readinessRow: readinessRow?.status,
      strictRow: strictRow?.status,
      metadata
    })
  );
}

async function assertOwnerReviewCleanCanvasPairsPreserved() {
  const manifest = JSON.parse(readFileSync(join(evidenceDir, "owner-review-pairs-manifest.json"), "utf8"));
  const dogfoodReport = JSON.parse(readFileSync(join(evidenceDir, "dogfood-report.json"), "utf8"));
  const readinessAudit = JSON.parse(readFileSync(join(evidenceDir, "owner-review-readiness-audit.json"), "utf8"));
  const strictAudit = JSON.parse(readFileSync(join(evidenceDir, "strict-prd-completion-audit.json"), "utf8"));
  const packetHtml = readFileSync(join(evidenceDir, "owner-review-packet.html"), "utf8");
  const cleanPairs = manifest.cleanCanvasPairs || [];
  const required = new Map([
    ["desktop", { output: "owner-review-desktop-clean-canvas-pair.png", runtime: "normal-desktop-main-canvas-3d.png", width: 1454, height: 510 }],
    ["mobile", { output: "owner-review-mobile-clean-canvas-pair.png", runtime: "normal-mobile-main-canvas-3d.png", width: 734, height: 840 }],
    ["fullscreen", { output: "owner-review-fullscreen-clean-canvas-pair.png", runtime: "normal-fullscreen-main-canvas-3d.png", width: 1934, height: 600 }]
  ]);
  const byId = new Map(cleanPairs.map((item) => [item.id, item]));
  const metadata = {};
  for (const [id, expected] of required) {
    const item = byId.get(id);
    if (item?.output) {
      metadata[id] = await sharp(join(evidenceDir, item.output)).metadata();
    }
  }
  const pairedEvidence = dogfoodReport.ownerReview?.pairedEvidence || [];
  const readinessRow = (readinessAudit.requirements || []).find((item) => item.id === "owner-review-clean-canvas-pairs");
  const strictRow = (strictAudit.requirements || []).find((item) => item.id === "owner-review-clean-canvas-pairs");
  const allRequiredCleanPairs = [...required].every(([id, expected]) => {
    const item = byId.get(id);
    const dimensions = metadata[id] || {};
    return item?.output === expected.output
      && item?.runtime?.endsWith(expected.runtime)
      && fileExists(`.agent/runs/higgsfield-1to1-blender-world/evidence/${expected.output}`)
      && fileExists(`.agent/runs/higgsfield-1to1-blender-world/evidence/${expected.runtime}`)
      && dimensions.width === expected.width
      && dimensions.height === expected.height
      && pairedEvidence.includes(expected.output)
      && pairedEvidence.includes(expected.runtime)
      && packetHtml.includes(expected.output);
  });

  assert(
    "owner review clean normal-route canvas pairs preserved",
    cleanPairs.length === required.size
      && allRequiredCleanPairs
      && readinessRow?.status === "proven"
      && strictRow?.status === "proven"
      && packetHtml.includes("Clean Normal Route Canvas Pairs"),
    JSON.stringify({
      manifestCleanCanvasPairs: cleanPairs,
      pairedEvidence,
      readinessRow: readinessRow?.status,
      strictRow: strictRow?.status,
      metadata
    })
  );
}

async function assertBlenderDebugRenderProofPreserved() {
  const imageName = "blender-debug-render-proof.png";
  const jsonName = "blender-debug-render-proof.json";
  const report = JSON.parse(readFileSync(join(evidenceDir, jsonName), "utf8"));
  const manifest = JSON.parse(readFileSync(join(evidenceDir, "owner-review-pairs-manifest.json"), "utf8"));
  const dogfoodReport = JSON.parse(readFileSync(join(evidenceDir, "dogfood-report.json"), "utf8"));
  const readinessAudit = JSON.parse(readFileSync(join(evidenceDir, "owner-review-readiness-audit.json"), "utf8"));
  const strictAudit = JSON.parse(readFileSync(join(evidenceDir, "strict-prd-completion-audit.json"), "utf8"));
  const packetHtml = readFileSync(join(evidenceDir, "owner-review-packet.html"), "utf8");
  const metadata = await sharp(join(evidenceDir, imageName)).metadata();
  const requiredFeatureIds = new Set([
    "graphite-wall-slabs",
    "physical-frame-depth",
    "inset-screen-planes",
    "cove-wallwash-lighting",
    "floor-reflection-regions",
    "side-return-no-void"
  ]);
  const featureIds = new Set((report.features || []).map((feature) => feature.id));
  const missingFeatureIds = [...requiredFeatureIds].filter((id) => !featureIds.has(id));
  const readinessRow = (readinessAudit.requirements || []).find((item) => item.id === "blender-debug-render-proof");
  const strictRow = (strictAudit.requirements || []).find((item) => item.id === "blender-debug-render-proof");
  const pairedEvidence = dogfoodReport.ownerReview?.pairedEvidence || [];

  assert(
    "Blender debug render proof preserved",
    report.status === "proven"
      && report.image === imageName
      && report.dimensions?.width === 1134
      && report.dimensions?.height === 726
      && metadata.width === 1134
      && metadata.height === 726
      && missingFeatureIds.length === 0
      && (report.features || []).every((feature) => feature.passed === true && feature.renderExists === true)
      && manifest.supplemental?.blenderDebugProof?.json === jsonName
      && manifest.supplemental?.blenderDebugProof?.image === imageName
      && manifest.supplemental?.blenderDebugProof?.status === "proven"
      && pairedEvidence.includes(jsonName)
      && pairedEvidence.includes(imageName)
      && readinessRow?.status === "proven"
      && strictRow?.status === "proven"
      && packetHtml.includes(imageName)
      && packetHtml.includes("Blender debug render proof"),
    JSON.stringify({
      status: report.status,
      dimensions: report.dimensions,
      metadata: { width: metadata.width, height: metadata.height },
      missingFeatureIds,
      manifest: manifest.supplemental?.blenderDebugProof,
      pairedEvidence,
      readinessRow: readinessRow?.status,
      strictRow: strictRow?.status
    })
  );
}

async function assertOwnerReviewCriticalRegionZoomsPreserved() {
  const imageName = "owner-review-critical-region-zooms.png";
  const jsonName = "owner-review-critical-region-zooms.json";
  const imagePath = join(evidenceDir, imageName);
  const jsonPath = join(evidenceDir, jsonName);
  const requiredRegionIds = [
    "wall-material",
    "screen-inset",
    "cove-lighting",
    "floor-reflection",
    "walking-right-wall",
    "inspection-frame-inset"
  ];
  const report = JSON.parse(readFileSync(jsonPath, "utf8"));
  const imageMetadata = await sharp(imagePath).metadata();
  const regionIds = new Set((report.regions || []).map((region) => region.id));
  const missingRegionIds = requiredRegionIds.filter((regionId) => !regionIds.has(regionId));
  const regionsHaveValidSourcesAndCrops = (report.regions || []).every((region) => {
    const sourcePresent = statSync(join(evidenceDir, region.source || ""), { throwIfNoEntry: false })?.isFile();
    return sourcePresent
      && Number.isFinite(region.crop?.left)
      && Number.isFinite(region.crop?.top)
      && Number(region.crop?.width) > 0
      && Number(region.crop?.height) > 0
      && Number(region.tile?.width) >= 400
      && Number(region.tile?.height) >= 300;
  });

  assert(
    "owner-review critical-region zoom proof preserved",
    report.status === "present"
      && report.image === imageName
      && Array.isArray(report.regions)
      && report.regions.length >= requiredRegionIds.length
      && missingRegionIds.length === 0
      && regionsHaveValidSourcesAndCrops
      && imageMetadata.width >= 1400
      && imageMetadata.height >= 880
      && report.dimensions?.width === imageMetadata.width
      && report.dimensions?.height === imageMetadata.height,
    JSON.stringify({
      status: report.status,
      image: report.image,
      dimensions: report.dimensions,
      renderedDimensions: { width: imageMetadata.width, height: imageMetadata.height },
      regionIds: [...regionIds],
      missingRegionIds
    })
  );
}

async function assertStructuralRegionProofPreserved() {
  const imageName = "owner-review-structural-region-proof.png";
  const jsonName = "structural-region-continuity-report.json";
  const imagePath = join(evidenceDir, imageName);
  const jsonPath = join(evidenceDir, jsonName);
  const imagePresent = statSync(imagePath, { throwIfNoEntry: false })?.isFile();
  const jsonPresent = statSync(jsonPath, { throwIfNoEntry: false })?.isFile();
  const report = jsonPresent ? JSON.parse(readFileSync(jsonPath, "utf8")) : {};
  const imageMetadata = imagePresent ? await sharp(imagePath).metadata() : {};
  const requiredRegionIds = [
    "left-glass-mullions",
    "bench-footprint",
    "ceiling-band-depth",
    "walking-bench-collision"
  ];
  const regionIds = new Set((report.regions || []).map((region) => region.id));
  const missingRegionIds = requiredRegionIds.filter((regionId) => !regionIds.has(regionId));
  const regionsHaveMetrics = (report.regions || []).every((region) => (
    region.passed === true
      && statSync(join(evidenceDir, region.source || ""), { throwIfNoEntry: false })?.isFile()
      && Number(region.crop?.width) > 0
      && Number(region.crop?.height) > 0
      && Number(region.metrics?.samples) > 1000
      && Number(region.metrics?.meanLuma) >= Number(region.gates?.meanLumaMin)
      && Number(region.metrics?.lumaSd) >= Number(region.gates?.lumaSdMin)
      && Number(region.metrics?.nonDarkRatio) >= Number(region.gates?.nonDarkRatioMin)
      && Number(region.metrics?.edgeChangeRatio) >= Number(region.gates?.edgeChangeRatioMin)
  ));
  const manifest = JSON.parse(readFileSync(join(evidenceDir, "owner-review-pairs-manifest.json"), "utf8"));
  const dogfood = JSON.parse(readFileSync(join(evidenceDir, "dogfood-report.json"), "utf8"));
  const readiness = JSON.parse(readFileSync(join(evidenceDir, "owner-review-readiness-audit.json"), "utf8"));
  const strict = JSON.parse(readFileSync(join(evidenceDir, "strict-prd-completion-audit.json"), "utf8"));
  const packetHtml = readFileSync(join(evidenceDir, "owner-review-packet.html"), "utf8");
  const pairedEvidence = dogfood.ownerReview?.pairedEvidence || [];
  const readinessRow = (readiness.requirements || []).find((row) => row.id === "structural-region-continuity");
  const strictRow = (strict.requirements || []).find((row) => row.id === "structural-region-continuity");

  assert(
    "structural-region continuity proof preserved",
    imagePresent
      && jsonPresent
      && report.status === "passed"
      && report.image === imageName
      && report.requiredRegionIds?.length === requiredRegionIds.length
      && missingRegionIds.length === 0
      && regionsHaveMetrics
      && imageMetadata.width >= 1400
      && imageMetadata.height >= 640
      && report.dimensions?.width === imageMetadata.width
      && report.dimensions?.height === imageMetadata.height
      && manifest.supplemental?.structuralRegionProof?.json === jsonName
      && manifest.supplemental?.structuralRegionProof?.image === imageName
      && manifest.supplemental?.structuralRegionProof?.status === "passed"
      && pairedEvidence.includes(jsonName)
      && pairedEvidence.includes(imageName)
      && readinessRow?.status === "proven"
      && strictRow?.status === "proven"
      && packetHtml.includes(imageName)
      && packetHtml.includes("Structural region proof"),
    JSON.stringify({
      imagePresent,
      jsonPresent,
      status: report.status,
      image: report.image,
      dimensions: report.dimensions,
      renderedDimensions: { width: imageMetadata.width, height: imageMetadata.height },
      regionIds: [...regionIds],
      missingRegionIds,
      manifest: manifest.supplemental?.structuralRegionProof,
      pairedEvidence,
      readinessRow: readinessRow?.status,
      strictRow: strictRow?.status
    })
  );
}

async function assertWallSlabDetailProofPreserved() {
  const imageName = "owner-review-wall-slab-detail-proof.png";
  const jsonName = "wall-slab-detail-report.json";
  const imagePath = join(evidenceDir, imageName);
  const jsonPath = join(evidenceDir, jsonName);
  const imagePresent = statSync(imagePath, { throwIfNoEntry: false })?.isFile();
  const jsonPresent = statSync(jsonPath, { throwIfNoEntry: false })?.isFile();
  const report = jsonPresent ? JSON.parse(readFileSync(jsonPath, "utf8")) : {};
  const imageMetadata = imagePresent ? await sharp(imagePath).metadata() : {};
  const requiredRegionIds = [
    "desktop-main-wall",
    "fullscreen-main-wall",
    "walking-right-wall"
  ];
  const regionIds = new Set((report.regions || []).map((region) => region.id));
  const missingRegionIds = requiredRegionIds.filter((regionId) => !regionIds.has(regionId));
  const regionsHaveMetrics = (report.regions || []).every((region) => (
    region.passed === true
      && statSync(join(evidenceDir, region.source || ""), { throwIfNoEntry: false })?.isFile()
      && Number(region.crop?.width) > 0
      && Number(region.crop?.height) > 0
      && Number(region.metrics?.samples) > 1000
      && Number(region.metrics?.meanLuma) >= Number(region.gates?.meanLumaMin)
      && Number(region.metrics?.lumaSd) >= Number(region.gates?.lumaSdMin)
      && Number(region.metrics?.edgeChangeRatio) >= Number(region.gates?.edgeChangeRatioMin)
      && Number(region.metrics?.verticalSeamCandidates) >= Number(region.gates?.minVerticalSeamCandidates)
      && Number(region.metrics?.horizontalSeamCandidates) >= Number(region.gates?.minHorizontalSeamCandidates)
  ));
  const manifest = JSON.parse(readFileSync(join(evidenceDir, "owner-review-pairs-manifest.json"), "utf8"));
  const dogfood = JSON.parse(readFileSync(join(evidenceDir, "dogfood-report.json"), "utf8"));
  const readiness = JSON.parse(readFileSync(join(evidenceDir, "owner-review-readiness-audit.json"), "utf8"));
  const strict = JSON.parse(readFileSync(join(evidenceDir, "strict-prd-completion-audit.json"), "utf8"));
  const packetHtml = readFileSync(join(evidenceDir, "owner-review-packet.html"), "utf8");
  const pairedEvidence = dogfood.ownerReview?.pairedEvidence || [];
  const readinessRow = (readiness.requirements || []).find((row) => row.id === "wall-slab-detail-proof");
  const strictRow = (strict.requirements || []).find((row) => row.id === "wall-slab-detail-proof");

  assert(
    "wall-slab rendered detail proof preserved",
    imagePresent
      && jsonPresent
      && report.status === "passed"
      && report.method === "rendered-image-luma-edge-seam-analysis"
      && report.image === imageName
      && report.requiredRegionIds?.length === requiredRegionIds.length
      && missingRegionIds.length === 0
      && regionsHaveMetrics
      && imageMetadata.width >= 1400
      && imageMetadata.height >= 520
      && report.dimensions?.width === imageMetadata.width
      && report.dimensions?.height === imageMetadata.height
      && manifest.supplemental?.wallSlabDetailProof?.json === jsonName
      && manifest.supplemental?.wallSlabDetailProof?.image === imageName
      && manifest.supplemental?.wallSlabDetailProof?.status === "passed"
      && pairedEvidence.includes(jsonName)
      && pairedEvidence.includes(imageName)
      && readinessRow?.status === "proven"
      && strictRow?.status === "proven"
      && packetHtml.includes(imageName)
      && packetHtml.includes("Wall slab detail proof"),
    JSON.stringify({
      imagePresent,
      jsonPresent,
      status: report.status,
      method: report.method,
      image: report.image,
      dimensions: report.dimensions,
      renderedDimensions: { width: imageMetadata.width, height: imageMetadata.height },
      regionIds: [...regionIds],
      missingRegionIds,
      manifest: manifest.supplemental?.wallSlabDetailProof,
      pairedEvidence,
      readinessRow: readinessRow?.status,
      strictRow: strictRow?.status
    })
  );
}

async function assertLightingFloorRenderedProofPreserved() {
  const imageName = "owner-review-lighting-floor-proof.png";
  const lightingJsonName = "lighting-shape-report.json";
  const floorJsonName = "floor-reflection-report.json";
  const imagePath = join(evidenceDir, imageName);
  const imagePresent = statSync(imagePath, { throwIfNoEntry: false })?.isFile();
  const imageMetadata = imagePresent ? await sharp(imagePath).metadata() : {};
  const lightingPresent = statSync(join(evidenceDir, lightingJsonName), { throwIfNoEntry: false })?.isFile();
  const floorPresent = statSync(join(evidenceDir, floorJsonName), { throwIfNoEntry: false })?.isFile();
  const lightingReport = lightingPresent ? JSON.parse(readFileSync(join(evidenceDir, lightingJsonName), "utf8")) : {};
  const floorReport = floorPresent ? JSON.parse(readFileSync(join(evidenceDir, floorJsonName), "utf8")) : {};
  const requiredLightingRegionIds = [
    "desktop-cove-line",
    "desktop-wall-wash",
    "fullscreen-wall-wash"
  ];
  const requiredFloorRegionIds = [
    "desktop-floor-reflection",
    "fullscreen-floor-reflection",
    "walking-floor-reflection"
  ];
  const lightingRegionIds = new Set((lightingReport.regions || []).map((region) => region.id));
  const floorRegionIds = new Set((floorReport.regions || []).map((region) => region.id));
  const missingLightingRegionIds = requiredLightingRegionIds.filter((regionId) => !lightingRegionIds.has(regionId));
  const missingFloorRegionIds = requiredFloorRegionIds.filter((regionId) => !floorRegionIds.has(regionId));
  const regionsHaveMetrics = (report) => (report.regions || []).every((region) => (
    region.passed === true
      && statSync(join(evidenceDir, region.source || ""), { throwIfNoEntry: false })?.isFile()
      && Number(region.crop?.width) > 0
      && Number(region.crop?.height) > 0
      && Number(region.metrics?.samples) > 1000
      && Number(region.metrics?.meanLuma) >= Number(region.gates?.meanLumaMin)
      && Number(region.metrics?.lumaSd) >= Number(region.gates?.lumaSdMin)
      && Number(region.metrics?.warmRatio) >= Number(region.gates?.warmRatioMin)
      && Number(region.metrics?.brightRatio) >= Number(region.gates?.brightRatioMin)
      && Number(region.metrics?.darkRatio) <= Number(region.gates?.darkRatioMax)
      && Number(region.metrics?.edgeChangeRatio) >= Number(region.gates?.edgeChangeRatioMin)
      && Number(region.metrics?.edgeChangeRatio) <= Number(region.gates?.edgeChangeRatioMax)
  ));
  const manifest = JSON.parse(readFileSync(join(evidenceDir, "owner-review-pairs-manifest.json"), "utf8"));
  const dogfood = JSON.parse(readFileSync(join(evidenceDir, "dogfood-report.json"), "utf8"));
  const readiness = JSON.parse(readFileSync(join(evidenceDir, "owner-review-readiness-audit.json"), "utf8"));
  const strict = JSON.parse(readFileSync(join(evidenceDir, "strict-prd-completion-audit.json"), "utf8"));
  const packetHtml = readFileSync(join(evidenceDir, "owner-review-packet.html"), "utf8");
  const pairedEvidence = dogfood.ownerReview?.pairedEvidence || [];
  const readinessRow = (readiness.requirements || []).find((row) => row.id === "lighting-floor-rendered-proof");
  const strictRow = (strict.requirements || []).find((row) => row.id === "lighting-floor-rendered-proof");

  assert(
    "lighting and floor rendered proof preserved",
    imagePresent
      && lightingPresent
      && floorPresent
      && lightingReport.status === "passed"
      && lightingReport.method === "rendered-image-warm-soft-region-analysis"
      && lightingReport.image === imageName
      && lightingReport.requiredRegionIds?.length === requiredLightingRegionIds.length
      && missingLightingRegionIds.length === 0
      && regionsHaveMetrics(lightingReport)
      && floorReport.status === "passed"
      && floorReport.method === "rendered-image-reflection-pool-analysis"
      && floorReport.image === imageName
      && floorReport.requiredRegionIds?.length === requiredFloorRegionIds.length
      && missingFloorRegionIds.length === 0
      && regionsHaveMetrics(floorReport)
      && imageMetadata.width >= 1400
      && imageMetadata.height >= 760
      && lightingReport.dimensions?.width === imageMetadata.width
      && lightingReport.dimensions?.height === imageMetadata.height
      && floorReport.dimensions?.width === imageMetadata.width
      && floorReport.dimensions?.height === imageMetadata.height
      && manifest.supplemental?.lightingFloorRenderedProof?.lightingJson === lightingJsonName
      && manifest.supplemental?.lightingFloorRenderedProof?.floorJson === floorJsonName
      && manifest.supplemental?.lightingFloorRenderedProof?.image === imageName
      && manifest.supplemental?.lightingFloorRenderedProof?.status === "passed"
      && pairedEvidence.includes(lightingJsonName)
      && pairedEvidence.includes(floorJsonName)
      && pairedEvidence.includes(imageName)
      && readinessRow?.status === "proven"
      && strictRow?.status === "proven"
      && packetHtml.includes(imageName)
      && packetHtml.includes("Lighting and floor reflection proof"),
    JSON.stringify({
      imagePresent,
      lightingPresent,
      floorPresent,
      lightingStatus: lightingReport.status,
      lightingMethod: lightingReport.method,
      floorStatus: floorReport.status,
      floorMethod: floorReport.method,
      renderedDimensions: { width: imageMetadata.width, height: imageMetadata.height },
      missingLightingRegionIds,
      missingFloorRegionIds,
      manifest: manifest.supplemental?.lightingFloorRenderedProof,
      pairedEvidence,
      readinessRow: readinessRow?.status,
      strictRow: strictRow?.status
    })
  );
}

async function assertScreenFrameInsetRenderedProofPreserved() {
  const imageName = "owner-review-screen-inset-proof.png";
  const jsonName = "screen-inner-frame-containment-report.json";
  const imagePath = join(evidenceDir, imageName);
  const jsonPath = join(evidenceDir, jsonName);
  const imagePresent = statSync(imagePath, { throwIfNoEntry: false })?.isFile();
  const jsonPresent = statSync(jsonPath, { throwIfNoEntry: false })?.isFile();
  const report = jsonPresent ? JSON.parse(readFileSync(jsonPath, "utf8")) : {};
  const imageMetadata = imagePresent ? await sharp(imagePath).metadata() : {};
  const requiredRegionIds = [
    "desktop-right-frame",
    "mobile-left-frame",
    "fullscreen-center-frame",
    "inspection-left-frame"
  ];
  const regionIds = new Set((report.regions || []).map((region) => region.id));
  const missingRegionIds = requiredRegionIds.filter((regionId) => !regionIds.has(regionId));
  const regionsHaveMetrics = (report.regions || []).every((region) => (
    region.passed === true
      && statSync(join(evidenceDir, region.source || ""), { throwIfNoEntry: false })?.isFile()
      && Number(region.crop?.width) > 0
      && Number(region.crop?.height) > 0
      && Number(region.metrics?.minInsetPx) >= Number(region.gates?.minInsetPx)
      && Number(region.metrics?.innerOuterAreaRatio) <= Number(region.gates?.maxInnerOuterAreaRatio)
      && Number(region.metrics?.maxOverlayErrorPx) <= Number(region.gates?.maxOverlayErrorPx)
      && ["left", "right", "top", "bottom"].every((side) => Number(region.metrics?.insetMargins?.[side]) >= Number(region.gates?.minInsetPx))
  ));
  const manifest = JSON.parse(readFileSync(join(evidenceDir, "owner-review-pairs-manifest.json"), "utf8"));
  const dogfood = JSON.parse(readFileSync(join(evidenceDir, "dogfood-report.json"), "utf8"));
  const readiness = JSON.parse(readFileSync(join(evidenceDir, "owner-review-readiness-audit.json"), "utf8"));
  const strict = JSON.parse(readFileSync(join(evidenceDir, "strict-prd-completion-audit.json"), "utf8"));
  const packetHtml = readFileSync(join(evidenceDir, "owner-review-packet.html"), "utf8");
  const pairedEvidence = dogfood.ownerReview?.pairedEvidence || [];
  const readinessRow = (readiness.requirements || []).find((row) => row.id === "screen-frame-inset-rendered-proof");
  const strictRow = (strict.requirements || []).find((row) => row.id === "screen-frame-inset-rendered-proof");

  assert(
    "screen-frame rendered inset proof preserved",
    imagePresent
      && jsonPresent
      && report.status === "passed"
      && report.method === "rendered-frame-screen-inset-analysis"
      && report.image === imageName
      && report.requiredRegionIds?.length === requiredRegionIds.length
      && missingRegionIds.length === 0
      && regionsHaveMetrics
      && imageMetadata.width >= 1400
      && imageMetadata.height >= 760
      && report.dimensions?.width === imageMetadata.width
      && report.dimensions?.height === imageMetadata.height
      && manifest.supplemental?.screenFrameInsetProof?.json === jsonName
      && manifest.supplemental?.screenFrameInsetProof?.image === imageName
      && manifest.supplemental?.screenFrameInsetProof?.status === "passed"
      && pairedEvidence.includes(jsonName)
      && pairedEvidence.includes(imageName)
      && readinessRow?.status === "proven"
      && strictRow?.status === "proven"
      && packetHtml.includes(imageName)
      && packetHtml.includes("Screen frame inset proof"),
    JSON.stringify({
      imagePresent,
      jsonPresent,
      status: report.status,
      method: report.method,
      renderedDimensions: { width: imageMetadata.width, height: imageMetadata.height },
      missingRegionIds,
      manifest: manifest.supplemental?.screenFrameInsetProof,
      pairedEvidence,
      readinessRow: readinessRow?.status,
      strictRow: strictRow?.status
    })
  );
}

async function assertMaterialRuntimeProofPreserved() {
  const imageName = "owner-review-material-runtime-proof.png";
  const jsonName = "material-runtime-proof-report.json";
  const imagePath = join(evidenceDir, imageName);
  const jsonPath = join(evidenceDir, jsonName);
  const imagePresent = statSync(imagePath, { throwIfNoEntry: false })?.isFile();
  const jsonPresent = statSync(jsonPath, { throwIfNoEntry: false })?.isFile();
  const report = jsonPresent ? JSON.parse(readFileSync(jsonPath, "utf8")) : {};
  const imageMetadata = imagePresent ? await sharp(imagePath).metadata() : {};
  const requiredRegionIds = [
    "selected-material-board",
    "wall-albedo-map",
    "floor-albedo-map",
    "runtime-wall-slab",
    "runtime-floor-reflection",
    "runtime-frame-rail",
    "runtime-glass-mullion"
  ];
  const requiredRuntimeRegionIds = [
    "runtime-wall-slab",
    "runtime-floor-reflection",
    "runtime-frame-rail",
    "runtime-glass-mullion"
  ];
  const regionIds = new Set((report.regions || []).map((region) => region.id));
  const missingRegionIds = requiredRegionIds.filter((regionId) => !regionIds.has(regionId));
  const missingRuntimeRegionIds = requiredRuntimeRegionIds.filter((regionId) => !regionIds.has(regionId));
  const allRegionsHaveSources = (report.regions || []).every((region) => (
    region.passed === true
      && statSync(join(root, region.source || ""), { throwIfNoEntry: false })?.isFile()
      && Number(region.crop?.width) > 0
      && Number(region.crop?.height) > 0
  ));
  const runtimeRegionsHaveMetrics = (report.regions || [])
    .filter((region) => requiredRuntimeRegionIds.includes(region.id))
    .every((region) => (
      Number(region.metrics?.samples) > 1000
        && Number(region.metrics?.meanLuma) >= Number(region.gates?.meanLumaMin)
        && Number(region.metrics?.lumaSd) >= Number(region.gates?.lumaSdMin)
        && Number(region.metrics?.nonDarkRatio) >= Number(region.gates?.nonDarkRatioMin)
    ));
  const manifest = JSON.parse(readFileSync(join(evidenceDir, "owner-review-pairs-manifest.json"), "utf8"));
  const dogfood = JSON.parse(readFileSync(join(evidenceDir, "dogfood-report.json"), "utf8"));
  const readiness = JSON.parse(readFileSync(join(evidenceDir, "owner-review-readiness-audit.json"), "utf8"));
  const strict = JSON.parse(readFileSync(join(evidenceDir, "strict-prd-completion-audit.json"), "utf8"));
  const packetHtml = readFileSync(join(evidenceDir, "owner-review-packet.html"), "utf8");
  const pairedEvidence = dogfood.ownerReview?.pairedEvidence || [];
  const readinessRow = (readiness.requirements || []).find((row) => row.id === "material-runtime-crop-proof");
  const strictRow = (strict.requirements || []).find((row) => row.id === "material-runtime-crop-proof");

  assert(
    "material-board runtime crop proof preserved",
    imagePresent
      && jsonPresent
      && report.status === "passed"
      && report.method === "material-board-runtime-crop-analysis"
      && report.image === imageName
      && report.requiredRegionIds?.length === requiredRegionIds.length
      && missingRegionIds.length === 0
      && missingRuntimeRegionIds.length === 0
      && allRegionsHaveSources
      && runtimeRegionsHaveMetrics
      && imageMetadata.width >= 1400
      && imageMetadata.height >= 760
      && report.dimensions?.width === imageMetadata.width
      && report.dimensions?.height === imageMetadata.height
      && manifest.supplemental?.materialRuntimeProof?.json === jsonName
      && manifest.supplemental?.materialRuntimeProof?.image === imageName
      && manifest.supplemental?.materialRuntimeProof?.status === "passed"
      && pairedEvidence.includes(jsonName)
      && pairedEvidence.includes(imageName)
      && readinessRow?.status === "proven"
      && strictRow?.status === "proven"
      && packetHtml.includes(imageName)
      && packetHtml.includes("Material board runtime proof"),
    JSON.stringify({
      imagePresent,
      jsonPresent,
      status: report.status,
      method: report.method,
      renderedDimensions: { width: imageMetadata.width, height: imageMetadata.height },
      missingRegionIds,
      missingRuntimeRegionIds,
      manifest: manifest.supplemental?.materialRuntimeProof,
      pairedEvidence,
      readinessRow: readinessRow?.status,
      strictRow: strictRow?.status
    })
  );
}

async function assertNoBlackVoidRenderedProofPreserved() {
  const imageName = "owner-review-no-black-void-proof.png";
  const jsonName = "no-black-void-rendered-proof-report.json";
  const imagePath = join(evidenceDir, imageName);
  const jsonPath = join(evidenceDir, jsonName);
  const imagePresent = statSync(imagePath, { throwIfNoEntry: false })?.isFile();
  const jsonPresent = statSync(jsonPath, { throwIfNoEntry: false })?.isFile();
  const report = jsonPresent ? JSON.parse(readFileSync(jsonPath, "utf8")) : {};
  const imageMetadata = imagePresent ? await sharp(imagePath).metadata() : {};
  const requiredRegionIds = [
    "desktopFirstView",
    "mobileFirstView",
    "fullscreenFirstView",
    "desktopWalking",
    "mobileWalking"
  ];
  const regionIds = new Set((report.regions || []).map((region) => region.id));
  const missingRegionIds = requiredRegionIds.filter((regionId) => !regionIds.has(regionId));
  const regionsHaveMetrics = (report.regions || []).every((region) => (
    region.passed === true
      && statSync(join(evidenceDir, region.source || ""), { throwIfNoEntry: false })?.isFile()
      && Number(region.crop?.width) > 0
      && Number(region.crop?.height) > 0
      && Number(region.metrics?.samples) > 1000
      && Number(region.metrics?.meanLuma) >= Number(region.gates?.meanLumaMin)
      && Number(region.metrics?.darkRatio) <= Number(region.gates?.darkRatioMax)
      && Number(region.metrics?.nonDarkRatio) >= Number(region.gates?.nonDarkRatioMin)
      && Number(region.metrics?.lumaSd) >= Number(region.gates?.lumaSdMin)
  ));
  const manifest = JSON.parse(readFileSync(join(evidenceDir, "owner-review-pairs-manifest.json"), "utf8"));
  const dogfood = JSON.parse(readFileSync(join(evidenceDir, "dogfood-report.json"), "utf8"));
  const readiness = JSON.parse(readFileSync(join(evidenceDir, "owner-review-readiness-audit.json"), "utf8"));
  const strict = JSON.parse(readFileSync(join(evidenceDir, "strict-prd-completion-audit.json"), "utf8"));
  const packetHtml = readFileSync(join(evidenceDir, "owner-review-packet.html"), "utf8");
  const pairedEvidence = dogfood.ownerReview?.pairedEvidence || [];
  const readinessRow = (readiness.requirements || []).find((row) => row.id === "no-black-void-rendered-proof");
  const strictRow = (strict.requirements || []).find((row) => row.id === "no-black-void-rendered-proof");

  assert(
    "no-black-void rendered proof preserved",
    imagePresent
      && jsonPresent
      && report.status === "passed"
      && report.method === "rendered-no-black-void-material-continuity-analysis"
      && report.image === imageName
      && report.requiredRegionIds?.length === requiredRegionIds.length
      && missingRegionIds.length === 0
      && regionsHaveMetrics
      && imageMetadata.width >= 1400
      && imageMetadata.height >= 760
      && report.dimensions?.width === imageMetadata.width
      && report.dimensions?.height === imageMetadata.height
      && manifest.supplemental?.noBlackVoidRenderedProof?.json === jsonName
      && manifest.supplemental?.noBlackVoidRenderedProof?.image === imageName
      && manifest.supplemental?.noBlackVoidRenderedProof?.status === "passed"
      && pairedEvidence.includes(jsonName)
      && pairedEvidence.includes(imageName)
      && readinessRow?.status === "proven"
      && strictRow?.status === "proven"
      && packetHtml.includes(imageName)
      && packetHtml.includes("No black void proof"),
    JSON.stringify({
      imagePresent,
      jsonPresent,
      status: report.status,
      method: report.method,
      renderedDimensions: { width: imageMetadata.width, height: imageMetadata.height },
      missingRegionIds,
      manifest: manifest.supplemental?.noBlackVoidRenderedProof,
      pairedEvidence,
      readinessRow: readinessRow?.status,
      strictRow: strictRow?.status
    })
  );
}

function rootRelativePath(path) {
  return String(path || "").replace(/^\//, "");
}

function requiredFrameExportReport() {
  const requiredKeys = [
    "outerCornersWorld",
    "innerScreenCornersWorld",
    "glassCornersWorld",
    "railDepth",
    "wallWashRegion",
    "floorReflectionRegion"
  ];
  return Object.fromEntries(Object.entries(worldReconstruction.frames).map(([slot, frame]) => [
    slot,
    {
      missing: requiredKeys.filter((key) => frame[key] === undefined),
      hasInsetScreen: Array.isArray(frame.innerScreenCornersWorld)
        && Array.isArray(frame.outerCornersWorld)
        && polygonArea3d(frame.innerScreenCornersWorld) < polygonArea3d(frame.outerCornersWorld) * 0.94
    }
  ]));
}

function polygonArea3d(points = []) {
  if (!Array.isArray(points) || points.length < 3) return 0;
  let areaVector = [0, 0, 0];
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    areaVector[0] += (current[1] - next[1]) * (current[2] + next[2]);
    areaVector[1] += (current[2] - next[2]) * (current[0] + next[0]);
    areaVector[2] += (current[0] - next[0]) * (current[1] + next[1]);
  }
  return Math.hypot(...areaVector) / 2;
}

function requiredMaterialMapReport() {
  const materials = worldReconstruction.materials || {};
  const requiredPaths = {
    "wall.albedo": materials.wall?.albedo,
    "wall.normal": materials.wall?.normal,
    "wall.roughness": materials.wall?.roughness,
    "floor.albedo": materials.floor?.albedo,
    "floor.roughness": materials.floor?.roughness,
    "floor.reflectionMask": materials.floor?.reflectionMask,
    "frameMetal.roughness": materials.frameMetal?.roughness,
    "glass.reflectionMask": materials.glass?.reflectionMask,
    "lighting.wallWashMask": materials.lighting?.wallWashMask
  };
  return {
    expected: requiredPaths,
    missing: Object.entries(requiredPaths)
      .filter(([, path]) => !path)
      .map(([key]) => key),
    missingFiles: Object.entries(requiredPaths)
      .filter(([, path]) => path && !fileExists(rootRelativePath(path)))
      .map(([key, path]) => ({ key, path }))
  };
}

function writeJsonEvidence(name, data) {
  writeFileSync(join(evidenceDir, name), JSON.stringify(data, null, 2));
}

function reportStatus(pass, evidence = {}) {
  return { status: pass ? "passed" : "failed", ...evidence };
}

function writeOwnerRequiredDiagnosticReports({ materialBoardAsset, frameExportReport, materialMapReport }) {
  const frameReports = Object.fromEntries(Object.entries(worldReconstruction.frames).map(([slot, frame]) => {
    const outerArea = polygonArea3d(frame.outerCornersWorld);
    const innerArea = polygonArea3d(frame.innerScreenCornersWorld);
    const glassArea = polygonArea3d(frame.glassCornersWorld);
    return [slot, {
      objectName: frame.objectName,
      outerArea: roundMetric(outerArea),
      innerArea: roundMetric(innerArea),
      glassArea: roundMetric(glassArea),
      innerToOuterRatio: roundMetric(innerArea / Math.max(outerArea, 1e-9)),
      glassToOuterRatio: roundMetric(glassArea / Math.max(outerArea, 1e-9)),
      hasInsetScreen: frameExportReport[slot]?.hasInsetScreen === true,
      missing: frameExportReport[slot]?.missing || [],
      projectedInnerScreenCorners: frame.verification?.desktopHero?.projectedInnerScreenCorners || [],
      projectedOuterCorners: frame.verification?.desktopHero?.projectedOuterCorners || []
    }];
  }));
  const allFramesInset = Object.values(frameReports).every((frame) => frame.hasInsetScreen && frame.missing.length === 0 && frame.innerToOuterRatio < 0.94);
  const screenContainmentReportPath = join(evidenceDir, "screen-inner-frame-containment-report.json");
  const existingScreenContainmentReport = statSync(screenContainmentReportPath, { throwIfNoEntry: false })?.isFile()
    ? JSON.parse(readFileSync(screenContainmentReportPath, "utf8"))
    : null;
  const existingRenderedScreenContainmentProof = existingScreenContainmentReport?.method === "rendered-frame-screen-inset-analysis"
    && existingScreenContainmentReport?.image === "owner-review-screen-inset-proof.png"
    && Array.isArray(existingScreenContainmentReport?.regions);
  if (!existingRenderedScreenContainmentProof) {
    writeJsonEvidence("screen-inner-frame-containment-report.json", reportStatus(allFramesInset && worldJs.includes("projectInnerScreenCorners"), {
      requirement: "Website surfaces and hit targets use exported inner screen planes inset within physical outer frame rails.",
      runtimeSignals: {
        innerScreenCornersWorld: worldJs.includes("innerScreenCornersWorld"),
        projectInnerScreenCorners: worldJs.includes("projectInnerScreenCorners"),
        outerCornersWorld: worldJs.includes("outerCornersWorld"),
        glassCornersWorld: worldJs.includes("glassCornersWorld")
      },
      frames: frameReports
    }));
  }

  const materialTokens = ["wall-albedo", "wall-normal", "wall-roughness", "floor-albedo", "floor-roughness", "floor-reflection-mask", "frame-metal-roughness", "glass-reflection-mask", "wall-wash-mask"];
  const materialPass = materialBoardAsset?.raw?.path === worldReconstruction.sourceAssets.materialBoard.raw
    && materialBoardAsset.derivatives?.some((derivative) => derivative.path === worldReconstruction.sourceAssets.materialBoard.runtime)
    && materialMapReport.missing.length === 0
    && materialMapReport.missingFiles.length === 0
    && materialTokens.every((token) => worldJs.includes(token));
  writeJsonEvidence("material-match-report.json", reportStatus(materialPass, {
    requirement: "Runtime material maps are derived from the selected material-items photo and loaded by the Three.js world.",
    selectedAsset: materialBoardAsset?.id || null,
    selectedRaw: materialBoardAsset?.raw?.path || null,
    expectedRaw: worldReconstruction.sourceAssets.materialBoard.raw,
    expectedRuntime: worldReconstruction.sourceAssets.materialBoard.runtime,
    materialMapReport,
    runtimeTextureTokens: Object.fromEntries(materialTokens.map((token) => [token, worldJs.includes(token)]))
  }));

  const wallMapPaths = [
    worldReconstruction.materials?.wall?.albedo,
    worldReconstruction.materials?.wall?.normal,
    worldReconstruction.materials?.wall?.roughness
  ];
  const slabPass = wallMapPaths.every((path) => path && fileExists(rootRelativePath(path)))
    && worldJs.includes("addGraphiteSlabWall")
    && worldJs.includes("Wall_Main_Graphite_Slab");
  const wallSlabReportPath = join(evidenceDir, "wall-slab-detail-report.json");
  const existingWallSlabReport = statSync(wallSlabReportPath, { throwIfNoEntry: false })?.isFile()
    ? JSON.parse(readFileSync(wallSlabReportPath, "utf8"))
    : null;
  const existingRenderedWallSlabProof = existingWallSlabReport?.method === "rendered-image-luma-edge-seam-analysis"
    && existingWallSlabReport?.image === "owner-review-wall-slab-detail-proof.png"
    && Array.isArray(existingWallSlabReport?.regions);
  if (!existingRenderedWallSlabProof) {
    writeJsonEvidence("wall-slab-detail-report.json", reportStatus(slabPass, {
      requirement: "Main wall uses graphite stone slab structure and material-board-derived maps, not a flat black wall.",
      wallMapPaths,
      runtimeSignals: {
        addGraphiteSlabWall: worldJs.includes("addGraphiteSlabWall"),
        slabMeshes: worldJs.includes("Wall_Main_Graphite_Slab")
      }
    }));
  }

  const lightingPass = Boolean(worldReconstruction.materials?.lighting?.wallWashMask)
    && fileExists(rootRelativePath(worldReconstruction.materials?.lighting?.wallWashMask))
    && Object.values(worldReconstruction.frames).every((frame) => Array.isArray(frame.wallWashRegion) && frame.wallWashRegion.length === 4)
    && !worldJs.includes("WallWash_")
    && !worldJs.includes("Cove_Light_Main");
  const lightingReportPath = join(evidenceDir, "lighting-shape-report.json");
  const existingLightingReport = statSync(lightingReportPath, { throwIfNoEntry: false })?.isFile()
    ? JSON.parse(readFileSync(lightingReportPath, "utf8"))
    : null;
  const existingRenderedLightingProof = existingLightingReport?.method === "rendered-image-warm-soft-region-analysis"
    && existingLightingReport?.image === "owner-review-lighting-floor-proof.png"
    && Array.isArray(existingLightingReport?.regions);
  if (!existingRenderedLightingProof) {
    writeJsonEvidence("lighting-shape-report.json", reportStatus(lightingPass, {
      requirement: "Lighting uses soft warm cove/wall-wash masks and frame-positioned regions rather than hard rectangular bars.",
      wallWashMask: worldReconstruction.materials?.lighting?.wallWashMask || null,
      rejectedRuntimeSignals: {
        hardWallWashName: worldJs.includes("WallWash_"),
        hardCoveName: worldJs.includes("Cove_Light_Main")
      },
      frameWallWashRegions: Object.fromEntries(Object.entries(worldReconstruction.frames).map(([slot, frame]) => [slot, frame.wallWashRegion || null]))
    }));
  }

  const floorPass = Boolean(worldReconstruction.materials?.floor?.reflectionMask)
    && fileExists(rootRelativePath(worldReconstruction.materials?.floor?.reflectionMask))
    && Object.values(worldReconstruction.frames).every((frame) => Array.isArray(frame.floorReflectionRegion) && frame.floorReflectionRegion.length === 4)
    && !worldJs.includes("new THREE.MeshBasicMaterial({ color: 0xffb35f");
  const floorReportPath = join(evidenceDir, "floor-reflection-report.json");
  const existingFloorReport = statSync(floorReportPath, { throwIfNoEntry: false })?.isFile()
    ? JSON.parse(readFileSync(floorReportPath, "utf8"))
    : null;
  const existingRenderedFloorProof = existingFloorReport?.method === "rendered-image-reflection-pool-analysis"
    && existingFloorReport?.image === "owner-review-lighting-floor-proof.png"
    && Array.isArray(existingFloorReport?.regions);
  if (!existingRenderedFloorProof) {
    writeJsonEvidence("floor-reflection-report.json", reportStatus(floorPass, {
      requirement: "Floor reflections use soft mapped reflection regions with texture breakup rather than hard translucent planes.",
      reflectionMask: worldReconstruction.materials?.floor?.reflectionMask || null,
      rejectedRuntimeSignals: {
        solidOldFloorGlowMaterial: worldJs.includes("new THREE.MeshBasicMaterial({ color: 0xffb35f")
      },
      frameFloorReflectionRegions: Object.fromEntries(Object.entries(worldReconstruction.frames).map(([slot, frame]) => [slot, frame.floorReflectionRegion || null]))
    }));
  }
}

async function assertVisualReferenceMatch(name, bytes, referencePath, maskPath, gates = {}) {
  const width = gates.sampleWidth || 320;
  const height = gates.sampleHeight || 200;
  const [candidate, reference, mask] = await Promise.all([
    normalizedImage(bytes, width, height),
    normalizedImage(join(root, referencePath), width, height),
    maskPath ? normalizedImage(join(root, maskPath), width, height) : Promise.resolve(null)
  ]);
  const diff = Buffer.alloc(width * height * 3);
  const metrics = visualMatchMetrics(candidate, reference, mask, diff, width, height, gates);
  const report = {
    name,
    candidate: gates.candidateLabel || "runtime canvas",
    reference: referencePath,
    mask: maskPath || null,
    screenPolygons: gates.screenPolygons || [],
    excludedRects: gates.excludedRects || [],
    gates: {
      colorMaeMax: gates.colorMaeMax ?? 24,
      lumaMaeMax: gates.lumaMaeMax ?? 18,
      brightnessRatioMin: gates.brightnessRatioMin ?? 0.82,
      brightnessRatioMax: gates.brightnessRatioMax ?? 1.18,
      darkRatioMax: gates.darkRatioMax ?? 0.18,
      brightRatioMin: gates.brightRatioMin ?? 0.09
    },
    metrics
  };
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  await sharp(diff, { raw: { width, height, channels: 3 } }).png().toFile(join(evidenceDir, `${slug}-visual-diff.png`));
  writeFileSync(join(evidenceDir, `${slug}-visual-match.json`), JSON.stringify(report, null, 2));

  const failures = [
    [`${name} visual reference color`, metrics.colorMae <= report.gates.colorMaeMax],
    [`${name} visual reference luminance`, metrics.lumaMae <= report.gates.lumaMaeMax],
    [`${name} visual reference brightness`, metrics.brightnessRatio >= report.gates.brightnessRatioMin && metrics.brightnessRatio <= report.gates.brightnessRatioMax],
    [`${name} visual reference dark coverage`, metrics.darkRatio <= report.gates.darkRatioMax],
    [`${name} visual reference highlight coverage`, metrics.brightRatio >= report.gates.brightRatioMin]
  ].filter(([, ok]) => !ok);

  if (gates.deferFailure && failures.length) {
    deferredVisualFailures.push({ name, failures: failures.map(([failureName]) => failureName), report });
    console.log(`not ok - ${name} visual reference deferred (${failures.length} gate failures)`);
    return report;
  }

  for (const [failureName, ok] of failures) {
    assert(failureName, ok, JSON.stringify(report));
  }
  if (!failures.length) pass(`${name} visual reference gates`);
  return report;
}

async function assertWalkingParallax(name, beforeBytes, afterBytes, options = {}) {
  const width = options.sampleWidth || 320;
  const height = options.sampleHeight || 200;
  const [before, after] = await Promise.all([
    normalizedImage(beforeBytes, width, height),
    normalizedImage(afterBytes, width, height)
  ]);
  const diff = Buffer.alloc(width * height * 3);
  const metrics = visualChangeMetrics(before, after, diff, width, height, options);
  const presence = visualPresenceMetrics(after, width, height, options);
  const report = {
    name,
    before: options.beforeLabel || "initial canvas",
    after: options.afterLabel || "post-walk canvas",
    screenPolygons: options.screenPolygons || [],
    gates: {
      lumaMaeMin: options.lumaMaeMin ?? 2.5,
      changedRatioMin: options.changedRatioMin ?? 0.08,
      afterMeanLumaMin: options.afterMeanLumaMin ?? 42,
      afterDarkRatioMax: options.afterDarkRatioMax ?? 0.32,
      afterNonDarkRatioMin: options.afterNonDarkRatioMin ?? 0.68
    },
    metrics,
    presence,
    states: options.states || null
  };
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  await sharp(diff, { raw: { width, height, channels: 3 } }).png().toFile(join(evidenceDir, `${slug}-diff.png`));
  writeFileSync(join(evidenceDir, `${slug}.json`), JSON.stringify(report, null, 2));

  assert(`${name} room luminance changes while walking`, metrics.lumaMae >= report.gates.lumaMaeMin, JSON.stringify(report));
  assert(`${name} changed-pixel coverage while walking`, metrics.changedRatio >= report.gates.changedRatioMin, JSON.stringify(report));
  assert(`${name} post-walk view has no black void`, presence.meanLuma >= report.gates.afterMeanLumaMin && presence.darkRatio <= report.gates.afterDarkRatioMax && presence.nonDarkRatio >= report.gates.afterNonDarkRatioMin, JSON.stringify(report));
  pass(`${name} parallax evidence`);
  return report;
}

function assertBlackVoidCoverageReport(report) {
  const requiredScopeIds = [
    "desktopFirstView",
    "mobileFirstView",
    "fullscreenFirstView",
    "desktopWalking",
    "mobileWalking"
  ];
  const coveredScopeIds = new Set(report.scopeIds || []);
  const entries = report.entries || {};
  assert(
    "black-void report covers first-view fullscreen and walking material continuity",
    report.status === "passed"
      && report.requirement === "Normal /world first views and walking side views must retain readable material response and must not collapse into black voids or untextured return walls."
      && requiredScopeIds.every((id) => coveredScopeIds.has(id))
      && requiredScopeIds.every((id) => entries[id]?.status === "passed"),
    JSON.stringify({
      status: report.status,
      requirement: report.requirement,
      scopeIds: report.scopeIds || [],
      requiredScopeIds,
      entries: Object.fromEntries(requiredScopeIds.map((id) => [id, entries[id]?.status || "missing"]))
    })
  );
}

function blackVoidPresenceGates(options = {}) {
  return {
    meanLumaMin: options.meanLumaMin ?? options.afterMeanLumaMin ?? 42,
    darkRatioMax: options.darkRatioMax ?? options.afterDarkRatioMax ?? 0.32,
    nonDarkRatioMin: options.nonDarkRatioMin ?? options.afterNonDarkRatioMin ?? 0.68,
    lumaSdMin: options.lumaSdMin ?? 18
  };
}

function blackVoidPresencePassed(presence, gates) {
  return presence.meanLuma >= gates.meanLumaMin
    && presence.darkRatio <= gates.darkRatioMax
    && presence.nonDarkRatio >= gates.nonDarkRatioMin
    && presence.lumaSd >= gates.lumaSdMin;
}

async function materialContinuityEntry({ id, label, evidence, bytes, sampleWidth, sampleHeight, screenPolygons = [], excludedRects = [], gates = {} }) {
  const image = await normalizedImage(bytes, sampleWidth, sampleHeight);
  const normalizedGates = blackVoidPresenceGates(gates);
  const presence = visualPresenceMetrics(image, sampleWidth, sampleHeight, { screenPolygons, excludedRects });
  return {
    id,
    label,
    evidence,
    sampleSize: { width: sampleWidth, height: sampleHeight },
    gates: normalizedGates,
    presence,
    status: blackVoidPresencePassed(presence, normalizedGates) ? "passed" : "failed"
  };
}

function walkingMaterialContinuityEntry(id, label, evidence, parallaxReport, gates = {}) {
  const normalizedGates = blackVoidPresenceGates({
    ...parallaxReport.gates,
    ...gates
  });
  return {
    id,
    label,
    evidence,
    gates: normalizedGates,
    presence: parallaxReport.presence,
    parallax: {
      metrics: parallaxReport.metrics,
      states: parallaxReport.states
    },
    status: blackVoidPresencePassed(parallaxReport.presence, normalizedGates) ? "passed" : "failed"
  };
}

async function normalizedImage(input, width, height) {
  return sharp(input)
    .resize(width, height, { fit: "cover", position: "center" })
    .removeAlpha()
    .raw()
    .toBuffer();
}

function visualMatchMetrics(candidate, reference, mask, diff, width, height, options = {}) {
  let samples = 0;
  let colorMae = 0;
  let lumaMae = 0;
  let candidateLuma = 0;
  let referenceLuma = 0;
  let dark = 0;
  let bright = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 3;
      if (isExcludedVisualPixel(x, y, index, mask, options)) {
        diff[index] = 32;
        diff[index + 1] = 32;
        diff[index + 2] = 32;
        continue;
      }

      const cr = candidate[index];
      const cg = candidate[index + 1];
      const cb = candidate[index + 2];
      const rr = reference[index];
      const rg = reference[index + 1];
      const rb = reference[index + 2];
      const cLuma = luminance(cr, cg, cb);
      const rLuma = luminance(rr, rg, rb);
      const dr = Math.abs(cr - rr);
      const dg = Math.abs(cg - rg);
      const db = Math.abs(cb - rb);

      diff[index] = dr;
      diff[index + 1] = dg;
      diff[index + 2] = db;
      colorMae += (dr + dg + db) / 3;
      lumaMae += Math.abs(cLuma - rLuma);
      candidateLuma += cLuma;
      referenceLuma += rLuma;
      if (cLuma < 22) dark += 1;
      if (cLuma > 140) bright += 1;
      samples += 1;
    }
  }

  return {
    samples,
    colorMae: roundMetric(colorMae / samples),
    lumaMae: roundMetric(lumaMae / samples),
    candidateMeanLuma: roundMetric(candidateLuma / samples),
    referenceMeanLuma: roundMetric(referenceLuma / samples),
    brightnessRatio: roundMetric(candidateLuma / referenceLuma),
    darkRatio: roundMetric(dark / samples),
    brightRatio: roundMetric(bright / samples)
  };
}

function visualChangeMetrics(before, after, diff, width, height, options = {}) {
  let samples = 0;
  let lumaMae = 0;
  let colorMae = 0;
  let changed = 0;
  let maxLumaDiff = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 3;
      if (isExcludedVisualPixel(x, y, index, null, options)) {
        diff[index] = 32;
        diff[index + 1] = 32;
        diff[index + 2] = 32;
        continue;
      }

      const br = before[index];
      const bg = before[index + 1];
      const bb = before[index + 2];
      const ar = after[index];
      const ag = after[index + 1];
      const ab = after[index + 2];
      const bLuma = luminance(br, bg, bb);
      const aLuma = luminance(ar, ag, ab);
      const dr = Math.abs(ar - br);
      const dg = Math.abs(ag - bg);
      const db = Math.abs(ab - bb);
      const lumaDiff = Math.abs(aLuma - bLuma);

      diff[index] = dr;
      diff[index + 1] = dg;
      diff[index + 2] = db;
      colorMae += (dr + dg + db) / 3;
      lumaMae += lumaDiff;
      maxLumaDiff = Math.max(maxLumaDiff, lumaDiff);
      if (lumaDiff > (options.changedLumaThreshold ?? 6)) changed += 1;
      samples += 1;
    }
  }

  return {
    samples,
    colorMae: roundMetric(colorMae / samples),
    lumaMae: roundMetric(lumaMae / samples),
    changedRatio: roundMetric(changed / samples),
    maxLumaDiff: roundMetric(maxLumaDiff)
  };
}

function visualPresenceMetrics(image, width, height, options = {}) {
  let samples = 0;
  let lumaSum = 0;
  let lumaSq = 0;
  let dark = 0;
  let nonDark = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 3;
      if (isExcludedVisualPixel(x, y, index, null, options)) continue;

      const value = luminance(image[index], image[index + 1], image[index + 2]);
      lumaSum += value;
      lumaSq += value * value;
      if (value < 24) dark += 1;
      if (value >= 35) nonDark += 1;
      samples += 1;
    }
  }

  const mean = lumaSum / Math.max(1, samples);
  const variance = Math.max(0, lumaSq / Math.max(1, samples) - mean * mean);
  return {
    samples,
    meanLuma: roundMetric(mean),
    lumaSd: roundMetric(Math.sqrt(variance)),
    darkRatio: roundMetric(dark / Math.max(1, samples)),
    nonDarkRatio: roundMetric(nonDark / Math.max(1, samples))
  };
}

function isExcludedVisualPixel(x, y, index, mask, options) {
  if (mask && maskedScreenPixel(mask, index)) return true;
  if (options.screenPolygons?.some((polygon) => pointInPolygon(x, y, polygon))) return true;
  if (options.excludedRects?.some((rect) => x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height)) return true;
  return false;
}

function maskedScreenPixel(mask, index) {
  if (!mask) return false;
  const r = mask[index];
  const g = mask[index + 1];
  const b = mask[index + 2];
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);
  return saturation > 70 && Math.max(r, g, b) > 130;
}

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersects = ((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function projectedFramePolygons(poseName, sampleWidth, sampleHeight, inset = 0) {
  const camera = worldReconstruction.cameras[poseName];
  if (!camera) return [];
  const scaleX = sampleWidth / camera.verificationSize.width;
  const scaleY = sampleHeight / camera.verificationSize.height;
  return Object.values(worldReconstruction.frames).map((frame) => {
    const points = frame.verification[poseName].projectedCorners.map(([x, y]) => [x * scaleX, y * scaleY]);
    return inset ? insetPolygon(points, inset) : points;
  });
}

function projectedFramePolygonsFromState(state, viewportWidth, viewportHeight, sampleWidth, sampleHeight, inset = 0) {
  const scaleX = sampleWidth / viewportWidth;
  const scaleY = sampleHeight / viewportHeight;
  return Object.values(state?.frameGeometry || {}).map((frame) => {
    const points = frame.projectedCorners.map(([x, y]) => [x * scaleX, y * scaleY]);
    return inset ? insetPolygon(points, inset) : points;
  });
}

function insetPolygon(points, inset) {
  const center = points.reduce((acc, point) => [acc[0] + point[0] / points.length, acc[1] + point[1] / points.length], [0, 0]);
  return points.map(([x, y]) => [
    center[0] + (x - center[0]) * (1 - inset),
    center[1] + (y - center[1]) * (1 - inset)
  ]);
}

function assertNoDeferredVisualFailures() {
  const failuresPath = join(evidenceDir, "visual-gate-failures.json");
  if (!deferredVisualFailures.length) {
    rmSync(failuresPath, { force: true });
    pass("strict visual reference gates pass all required poses");
    return;
  }
  writeFileSync(failuresPath, JSON.stringify(deferredVisualFailures, null, 2));
  fail("strict visual reference gates", JSON.stringify({
    failures: deferredVisualFailures.map((failure) => ({
      name: failure.name,
      failedGates: failure.failures,
      metrics: failure.report.metrics,
      gates: failure.report.gates
    })),
    evidence: "evidence/visual-gate-failures.json"
  }));
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function roundMetric(value) {
  return Math.round(value * 10000) / 10000;
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function numericAttr(text, name) {
  const match = text.match(new RegExp(`${name}="([0-9.]+)"`));
  return match ? Number(match[1]) : NaN;
}

function attrValue(text, name) {
  const match = text.match(new RegExp(`${name}="([^"]*)"`));
  return match ? match[1] : "";
}

function parseProbe(value) {
  return Object.fromEntries(value.split(";").map((item) => {
    const [key, raw] = item.split(":");
    const numeric = Number(raw);
    return [key, Number.isFinite(numeric) ? numeric : raw];
  }));
}

function manifestAsset(role) {
  return manifest.assets.find((asset) => asset.role === role);
}

function manifestFileCoverage(asset, requiredPaths) {
  const manifestEntries = [asset?.raw, ...(asset?.derivatives || [])].filter(Boolean);
  const byPath = new Map(manifestEntries.map((entry) => [entry.path, entry]));
  const files = requiredPaths.map((path) => {
    const entry = byPath.get(path) || null;
    const present = fileExists(path);
    const actualBytes = present ? fileSize(path) : null;
    const actualSha256 = present ? fileSha256(path) : null;
    return {
      path,
      recorded: Boolean(entry),
      present,
      recordedBytes: entry?.bytes ?? null,
      actualBytes,
      recordedSha256: entry?.sha256 || null,
      actualSha256,
      bytesMatch: Boolean(entry) && present && entry.bytes === actualBytes,
      sha256Match: Boolean(entry) && present && entry.sha256 === actualSha256
    };
  });
  return {
    assetId: asset?.id || null,
    role: asset?.role || null,
    status: asset?.review?.status || asset?.status || null,
    expectedFileCount: requiredPaths.length,
    recordedFileCount: files.filter((file) => file.recorded).length,
    missingEntries: files.filter((file) => !file.recorded).map((file) => file.path),
    missingFiles: files.filter((file) => !file.present).map((file) => file.path),
    mismatchedBytes: files.filter((file) => file.recorded && file.present && !file.bytesMatch).map((file) => file.path),
    mismatchedSha256: files.filter((file) => file.recorded && file.present && !file.sha256Match).map((file) => file.path),
    files,
    complete: Boolean(asset)
      && asset.review?.status === "selected"
      && files.every((file) => file.recorded && file.present && file.bytesMatch && file.sha256Match)
  };
}

function selectedManifestAsset(role) {
  return manifest.assets.find((asset) => asset.role === role && asset.review?.status === "selected")
    || manifest.assets.find((asset) => asset.role === role && asset.status === "selected")
    || null;
}

function normalizeAssetPath(path) {
  return String(path || "").replace(/^\//, "");
}

function manifestEntryForPath(asset, path) {
  const normalizedPath = normalizeAssetPath(path);
  if (asset?.raw?.path === normalizedPath) return { entry: asset.raw, kind: "raw" };
  const derivative = (asset?.derivatives || []).find((item) => item.path === normalizedPath);
  return derivative ? { entry: derivative, kind: "derivative" } : { entry: null, kind: null };
}

function fileKindHasDimensionsOrScale(entry, kind) {
  if (!entry) return false;
  if (kind === "model") return Boolean(entry.scale?.unit || entry.bounds?.unit || entry.unitScale);
  if (kind === "video") return Number(entry.width) > 0 && Number(entry.height) > 0 && Number(entry.durationSeconds) > 0;
  return Number(entry.width) > 0 && Number(entry.height) > 0;
}

function runtimeAssetManifestCoverage() {
  const requiredRuntimeDerivatives = [
    { role: "gallery-room-master-desktop-empty-4k", path: roomLayout.assets.desktopPlate, kind: "image" },
    { role: "gallery-room-master-desktop-empty-4k", path: roomLayout.assets.desktopPlateAvif, kind: "image" },
    { role: "gallery-room-master-mobile-empty-4k", path: roomLayout.assets.mobilePlate, kind: "image" },
    { role: "gallery-room-master-mobile-empty-4k", path: roomLayout.assets.mobilePlateWebp, kind: "image" },
    { role: "station-inspect-plate-empty-4k", path: roomLayout.assets.inspectPlate, kind: "image" },
    { role: "station-inspect-plate-empty-4k", path: roomLayout.assets.inspectPlateAvif, kind: "image" },
    { role: "portfolio-social-teaser", path: roomLayout.assets.introPoster, kind: "image" },
    { role: "portfolio-social-teaser", path: roomLayout.assets.introVideo, kind: "video" },
    { role: "world-reconstruction-blender-scene", path: roomLayout.assets.reconstructionModel, kind: "model" },
    { role: "material-style-board", path: worldReconstruction.sourceAssets.materialBoard.runtime, kind: "image" },
    { role: "station-closeup-still", path: "img/world/gallery-room/station-closeup-still.avif", kind: "image" },
    ...Object.values(requiredMaterialMapReport().expected).map((path) => ({ role: "world-material-map-derivatives", path, kind: "image" }))
  ];
  const normalRouteRuntimePaths = [
    roomLayout.assets.desktopPlate,
    roomLayout.assets.desktopPlateAvif,
    roomLayout.assets.mobilePlate,
    roomLayout.assets.mobilePlateWebp,
    roomLayout.assets.inspectPlate,
    roomLayout.assets.inspectPlateAvif,
    roomLayout.assets.introPoster,
    roomLayout.assets.introVideo,
    roomLayout.assets.reconstructionModel,
    ...Object.values(requiredMaterialMapReport().expected)
  ].map(normalizeAssetPath);
  const files = requiredRuntimeDerivatives.map((item) => {
    const asset = selectedManifestAsset(item.role);
    const path = normalizeAssetPath(item.path);
    const { entry, kind } = manifestEntryForPath(asset, path);
    const present = fileExists(path);
    const actualBytes = present ? fileSize(path) : null;
    const actualSha256 = present ? fileSha256(path) : null;
    return {
      role: item.role,
      path,
      kind: item.kind,
      assetId: asset?.id || null,
      assetStatus: asset?.review?.status || asset?.status || null,
      sourcePath: asset?.raw?.path || null,
      sourceRole: asset?.inputs?.[0]?.role || asset?.role || null,
      recorded: Boolean(entry),
      entryKind: kind,
      present,
      recordedBytes: entry?.bytes ?? null,
      actualBytes,
      recordedSha256: entry?.sha256 || null,
      actualSha256,
      bytesMatch: Boolean(entry) && present && entry.bytes === actualBytes,
      sha256Match: Boolean(entry) && present && entry.sha256 === actualSha256,
      hasDimensionsOrScale: fileKindHasDimensionsOrScale(entry, item.kind)
    };
  });
  const selectedAssets = [...new Set(requiredRuntimeDerivatives.map((item) => item.role))]
    .map((role) => selectedManifestAsset(role))
    .filter(Boolean);
  const sourceFiles = selectedAssets.map((asset) => {
    const sourcePath = asset.raw?.path || "";
    const present = sourcePath ? fileExists(sourcePath) : false;
    const actualBytes = present ? fileSize(sourcePath) : null;
    const actualSha256 = present ? fileSha256(sourcePath) : null;
    return {
      role: asset.role,
      assetId: asset.id,
      sourcePath,
      present,
      recordedBytes: asset.raw?.bytes ?? null,
      actualBytes,
      recordedSha256: asset.raw?.sha256 || null,
      actualSha256,
      bytesMatch: present && asset.raw?.bytes === actualBytes,
      sha256Match: present && asset.raw?.sha256 === actualSha256
    };
  });
  const rawRuntimePaths = normalRouteRuntimePaths.filter((path) => (
    path.startsWith("artifacts/higgsfield/showcase-gallery-next-level/selected/")
    || path.endsWith(".blend")
    || path.endsWith(".blend1")
  ));
  return {
    requiredRuntimeDerivatives: requiredRuntimeDerivatives.map((item) => ({
      role: item.role,
      path: normalizeAssetPath(item.path),
      kind: item.kind
    })),
    files,
    sourceFiles,
    rawRuntimePaths,
    missingEntries: files.filter((file) => !file.recorded).map((file) => file.path),
    missingFiles: files.filter((file) => !file.present).map((file) => file.path),
    mismatchedBytes: files.filter((file) => file.recorded && file.present && !file.bytesMatch).map((file) => file.path),
    mismatchedSha256: files.filter((file) => file.recorded && file.present && !file.sha256Match).map((file) => file.path),
    missingDimensionsOrScale: files.filter((file) => !file.hasDimensionsOrScale).map((file) => file.path),
    sourceMismatches: sourceFiles.filter((file) => !file.present || !file.bytesMatch || !file.sha256Match).map((file) => file.sourcePath || file.assetId),
    complete: files.every((file) => file.recorded && file.present && file.bytesMatch && file.sha256Match && file.hasDimensionsOrScale)
      && sourceFiles.every((file) => file.present && file.bytesMatch && file.sha256Match)
      && rawRuntimePaths.length === 0
  };
}

const world = readText("world.html");
const worldCss = readText("world.css");
const worldJs = readText("world.js");
const worldLayoutJs = readText("world-layout.js");
const promptPack = readJson("asset-library/showcase-designs/animated-gallery/prompt-pack.json");
const checklistHtml = readText("asset-library/showcase-designs/animated-gallery/checklist.html");
const manifest = readJson("artifacts/higgsfield/showcase-gallery-next-level/manifests/higgsfield-assets.json");
const exportedLayout = readJson("artifacts/blender/higgsfield-1to1-world/exports/world-reconstruction-layout.json");
const stationTexturePaths = stations.map((station) => station.screenshotUrl.slice(1));
const runtimeAssetPaths = [
  "vendor/three/three.module.min.js",
  "vendor/three/three.core.min.js",
  "img/world/gallery-room/reconstructed-gallery.glb",
  roomLayout.assets.desktopPlate.slice(1),
  roomLayout.assets.desktopPlateAvif.slice(1),
  roomLayout.assets.mobilePlate.slice(1),
  roomLayout.assets.mobilePlateWebp.slice(1),
  roomLayout.assets.inspectPlate.slice(1),
  roomLayout.assets.inspectPlateAvif.slice(1),
  roomLayout.assets.introPoster.slice(1),
  roomLayout.assets.introVideo.slice(1)
];
const blenderArtifactPaths = [
  "artifacts/blender/higgsfield-1to1-world/world-reconstruction.blend",
  "artifacts/blender/higgsfield-1to1-world/exports/world-reconstruction-layout.json",
  "artifacts/blender/higgsfield-1to1-world/exports/desktop-hero-verification.json",
  "artifacts/blender/higgsfield-1to1-world/exports/mobile-hero-verification.json",
  "artifacts/blender/higgsfield-1to1-world/exports/inspection-verification.json",
  "artifacts/blender/higgsfield-1to1-world/exports/fullscreen-hero-verification.json",
  "artifacts/blender/higgsfield-1to1-world/exports/collision-navigation.json",
  "artifacts/blender/higgsfield-1to1-world/exports/alignment-report.json",
  "artifacts/blender/higgsfield-1to1-world/renders/desktop-hero-reference-match-debug.png",
  "artifacts/blender/higgsfield-1to1-world/renders/mobile-hero-reference-match-debug.png",
  "artifacts/blender/higgsfield-1to1-world/renders/inspect-reference-match-debug.png",
  "artifacts/blender/higgsfield-1to1-world/renders/fullscreen-hero-reference-match-debug.png",
  "artifacts/blender/higgsfield-1to1-world/renders/frame-plane-debug.png"
];
const requiredCalibrationManifestPaths = [
  "artifacts/blender/higgsfield-1to1-world/exports/world-reconstruction-layout.json",
  "artifacts/blender/higgsfield-1to1-world/exports/desktop-hero-verification.json",
  "artifacts/blender/higgsfield-1to1-world/exports/mobile-hero-verification.json",
  "artifacts/blender/higgsfield-1to1-world/exports/inspection-verification.json",
  "artifacts/blender/higgsfield-1to1-world/exports/fullscreen-hero-verification.json",
  "artifacts/blender/higgsfield-1to1-world/exports/collision-navigation.json",
  "artifacts/blender/higgsfield-1to1-world/exports/alignment-report.json",
  "artifacts/blender/higgsfield-1to1-world/renders/desktop-hero-reference-match-debug.png",
  "artifacts/blender/higgsfield-1to1-world/renders/mobile-hero-reference-match-debug.png",
  "artifacts/blender/higgsfield-1to1-world/renders/inspect-reference-match-debug.png",
  "artifacts/blender/higgsfield-1to1-world/renders/fullscreen-hero-reference-match-debug.png",
  "artifacts/blender/higgsfield-1to1-world/renders/frame-plane-debug.png"
];
const requiredPlateRoles = [
  "gallery-room-master-desktop-empty-4k",
  "gallery-room-master-mobile-empty-4k",
  "gallery-room-screen-mask-reference",
  "station-inspect-plate-empty-4k",
  "station-inspect-mask-reference"
];
const requiredAssetChecklistRoles = [
  "gallery-room-master-desktop-empty-4k",
  "gallery-room-master-mobile-empty-4k",
  "gallery-room-screen-mask-reference",
  "station-inspect-plate-empty-4k",
  "station-inspect-mask-reference",
  "material-style-board",
  "world-material-map-derivatives",
  "world-reconstruction-blender-scene",
  "world-reconstruction-calibration-export",
  "main-wall-to-closeup-transition"
];
const requiredAssetChecklistTaxonomy = [
  "required",
  "selected",
  "planned",
  "optional",
  "authoring-only"
];

assert("world shell uses full-bleed 3D canvas", world.includes('id="worldCanvas"') && world.includes('id="screenOverlayLayer"') && world.includes("vendor/three/three.module.min.js"));
assert("world shell keeps accessible static return path", world.includes('class="skip-link"') && world.includes('href="#stationControls"') && countMatches(world, /data-static-link/g) >= 3);
assert("world preserves inspection controls", ["screenViewer", "screenViewerScroll", "screenViewerImage", "screenViewerScrollUp", "screenViewerScrollDown", "screenViewerLive"].every((id) => world.includes(`id="${id}"`)));
assert("world JS uses Three.js reconstruction runtime", worldJs.includes("three.module.min.js") && worldJs.includes("new THREE.WebGLRenderer") && worldJs.includes("worldReconstruction"));
assert("world JS exposes continuous movement and collision hooks", ["movePlayerBy", "runMovementProbe", "circleIntersectsAabb", "data-world-movement-probe"].every((text) => worldJs.includes(text)));
assert("world JS exposes alignment hooks", ["alignmentProbe", "getProjectedFrameCorners", "data-world-alignment-probe"].every((text) => worldJs.includes(text)));
assert("world JS keeps station behavior hooks", ["handleStationChipKeydown", "openLiveSite", "resolveCaseStudyUrl", "enterInspection", "scrollActiveScreenBy", "copyQaReport", "getQaReport"].every((text) => worldJs.includes(text)));
assert("world JS keeps analytics hooks", ["mode_enter_world", "mode_return_static", "station_click_live", "station_click_case_study", "station_inspect", "world_fallback_shown"].every((eventName) => worldJs.includes(eventName)));
assert("world CSS contains canvas and calibrated hit target styles", worldCss.includes(".world-canvas") && worldCss.includes(".screen-target") && worldCss.includes(".screen-viewer-scroll"));
assert("world layout embeds Blender reconstruction", worldLayoutJs.includes("worldReconstruction") && worldReconstruction.version === exportedLayout.version && worldReconstruction.scene.renderMode === "three-js-from-blender-export");
assert("world layout has named verification cameras", ["desktopHero", "mobileHero", "inspectSelected", "fullscreenHero"].every((name) => worldReconstruction.cameras[name]?.verificationSize));
assert("world layout has calibrated frame geometry", Object.keys(worldReconstruction.frames).length === 3 && Object.values(worldReconstruction.frames).every((frame) => frame.cornersWorld.length === 4 && frame.verification.desktopHero.projectedCorners.length === 4));
assert("world layout has movement bounds and blockers", worldReconstruction.movement.navBounds && worldReconstruction.movement.blockers.length >= 6 && worldReconstruction.movement.playerRadius > 0);
assert("world layout records selected production plate roles", ["gallery-room-master-desktop-empty-4k", "gallery-room-master-mobile-empty-4k", "station-inspect-plate-empty-4k"].every((role) => roomLayout.selectedProductionPlateRoles.includes(role)));
assert("prompt pack includes all required plate and mask roles", requiredPlateRoles.every((role) => promptPack.assets.some((asset) => asset.role === role)));
assert("asset checklist surfaces reconstruction asset taxonomy", checklistHtml.includes('id="reconstructionPanel"')
  && checklistHtml.includes("renderReconstructionPanel")
  && requiredAssetChecklistRoles.every((role) => checklistHtml.includes(role))
  && requiredAssetChecklistTaxonomy.every((token) => checklistHtml.includes(token)), JSON.stringify({
    missingRoles: requiredAssetChecklistRoles.filter((role) => !checklistHtml.includes(role)),
    missingTaxonomy: requiredAssetChecklistTaxonomy.filter((token) => !checklistHtml.includes(token)),
    hasPanel: checklistHtml.includes('id="reconstructionPanel"'),
    hasRenderer: checklistHtml.includes("renderReconstructionPanel")
  }));
assert("manifest includes production roles as selected 4K source derivatives", ["gallery-room-master-desktop-empty-4k", "gallery-room-master-mobile-empty-4k", "station-inspect-plate-empty-4k"].every((role) => {
  const asset = manifestAsset(role);
  return asset?.status === "selected"
    && asset.raw?.path?.startsWith("artifacts/higgsfield/showcase-gallery-next-level/selected/")
    && asset.raw.width >= 2160
    && asset.raw.height >= 2160
    && asset.derivatives?.some((derivative) => derivative.path.startsWith("img/world/gallery-room/"));
}));
assert("station count is four approved launch projects", stations.length === 4 && new Set(stations.map((station) => station.id)).size === 4);

for (const station of stations) {
  assert(`station ${station.id} has live URL`, /^https:\/\/[^ ]+/.test(station.liveUrl));
  assert(`station ${station.id} has case anchor`, station.caseStudyAnchor === `/#case-study-${station.id}`);
  assert(`station ${station.id} screenshot exists`, fileExists(station.screenshotUrl.slice(1)));
}

[...runtimeAssetPaths, ...stationTexturePaths, ...blenderArtifactPaths].forEach((path) => assert(`file exists ${path}`, fileExists(path)));
assert("runtime GLB is optimized-size", fileSize("img/world/gallery-room/reconstructed-gallery.glb") < 500 * 1024);
assert("vendored Three modules are available", fileSize("vendor/three/three.module.min.js") > 300 * 1024 && fileSize("vendor/three/three.core.min.js") > 300 * 1024);
assert("rendered reference plates stay lightweight", [
  roomLayout.assets.desktopPlate.slice(1),
  roomLayout.assets.desktopPlateAvif.slice(1),
  roomLayout.assets.mobilePlate.slice(1),
  roomLayout.assets.inspectPlate.slice(1),
  roomLayout.assets.introPoster.slice(1)
].every((path) => fileSize(path) < 180 * 1024));

const materialBoardAsset = manifest.assets.find((asset) => asset.role === "material-style-board" && asset.review?.status === "selected");
const frameExportReport = requiredFrameExportReport();
const materialMapReport = requiredMaterialMapReport();
const materialMapAsset = manifest.assets.find((asset) => asset.role === "world-material-map-derivatives" && asset.review?.status === "selected");
const materialDerivativePaths = new Set(materialMapAsset?.derivatives?.map((derivative) => derivative.path) || []);
const calibrationManifestCoverage = manifestFileCoverage(manifestAsset("world-reconstruction-calibration-export"), requiredCalibrationManifestPaths);
const runtimeManifestCoverage = runtimeAssetManifestCoverage();
writeOwnerRequiredDiagnosticReports({ materialBoardAsset, frameExportReport, materialMapReport });
ownerDiagnostic(
  "owner diagnostic locks selected material-items photo",
  materialBoardAsset?.raw?.path === worldReconstruction.sourceAssets.materialBoard.raw
    && materialBoardAsset.derivatives?.some((derivative) => derivative.path === worldReconstruction.sourceAssets.materialBoard.runtime),
  {
    expectedRaw: worldReconstruction.sourceAssets.materialBoard.raw,
    expectedRuntime: worldReconstruction.sourceAssets.materialBoard.runtime,
    selectedAsset: materialBoardAsset?.id || null,
    selectedRaw: materialBoardAsset?.raw?.path || null
  }
);
ownerDiagnostic(
  "owner diagnostic exports physical frame inset geometry",
  Object.values(frameExportReport).every((frame) => frame.missing.length === 0 && frame.hasInsetScreen),
  frameExportReport
);
ownerDiagnostic(
  "owner diagnostic runtime uses inner screen corners for websites and hit targets",
  worldJs.includes("innerScreenCornersWorld")
    && worldJs.includes("outerCornersWorld")
    && worldJs.includes("glassCornersWorld")
    && worldJs.includes("projectInnerScreenCorners"),
  {
    requiredRuntimeSignals: [
      "innerScreenCornersWorld",
      "outerCornersWorld",
      "glassCornersWorld",
      "projectInnerScreenCorners"
    ]
  }
);
ownerDiagnostic(
  "owner diagnostic material maps exist for wall floor metal glass and lighting",
  materialMapReport.missing.length === 0 && materialMapReport.missingFiles.length === 0,
  materialMapReport
);
ownerDiagnostic(
  "owner diagnostic manifest records generated material map derivatives",
  materialMapAsset?.raw?.path === worldReconstruction.sourceAssets.materialBoard.raw
    && Object.values(materialMapReport.expected).every((path) => materialDerivativePaths.has(path)),
  {
    selectedMaterialMapAsset: materialMapAsset?.id || null,
    expectedRaw: worldReconstruction.sourceAssets.materialBoard.raw,
    actualRaw: materialMapAsset?.raw?.path || null,
    expectedDerivatives: Object.values(materialMapReport.expected),
    manifestDerivatives: [...materialDerivativePaths]
  }
);
ownerDiagnostic(
  "owner diagnostic manifest records Blender calibration exports and debug renders",
  calibrationManifestCoverage.complete,
  calibrationManifestCoverage
);
assert(
  "asset manifest records Blender calibration exports and debug renders",
  calibrationManifestCoverage.complete,
  JSON.stringify(calibrationManifestCoverage)
);
ownerDiagnostic(
  "owner diagnostic manifest records optimized runtime assets with provenance",
  runtimeManifestCoverage.complete,
  runtimeManifestCoverage
);
assert(
  "asset manifest records optimized runtime assets with provenance",
  runtimeManifestCoverage.complete,
  JSON.stringify(runtimeManifestCoverage)
);
ownerDiagnostic(
  "owner diagnostic rejects hard rectangular wall-wash and floor-glow bars",
  !worldJs.includes("WallWash_")
    && !worldJs.includes("Cove_Light_Main")
    && !worldJs.includes("new THREE.MeshBasicMaterial({ color: 0xffb35f"),
  {
    rejectedRuntimeSignals: [
      "WallWash_ hard boxes",
      "Cove_Light_Main hard box",
      "solid MeshBasicMaterial floor glow"
    ]
  }
);
ownerDiagnostic(
  "owner diagnostic runtime loads material-board-derived texture maps",
  ["wall-albedo", "wall-normal", "wall-roughness", "floor-albedo", "floor-roughness", "floor-reflection-mask", "wall-wash-mask"].every((token) => worldJs.includes(token)),
  {
    requiredTextureTokens: [
      "wall-albedo",
      "wall-normal",
      "wall-roughness",
      "floor-albedo",
      "floor-roughness",
      "floor-reflection-mask",
      "wall-wash-mask"
    ]
  }
);
ownerDiagnostic(
  "owner diagnostic Blender-authored website placement covers frame windows",
  [
    "screenFitDiagnostics",
    "buildBlenderCoverWebsiteTexture",
    "websiteFrameAspect",
    "websitePlaneCornersWorld",
    "screenPlacement",
    "contentMode: \"blender-cover\"",
    "coverFillRatio"
  ].every((token) => worldJs.includes(token)),
  {
    rejectedRuntimeSignals: [
      "small inset poster placement leaves weird frame-edge bands",
      "runtime-only website fitting is not anchored to Blender-authored screen placement"
    ]
  }
);
assertNoOwnerDiagnosticFailures();
assertOwnerBaselineDiagnosticPreserved();
assertPhase0MissingEvidenceDecisionRequest();
assertOwnerFinalDecisionRequest();
assertOwnerFinalDecisionProofLinksPreserved();
assertPhase0ArchiveNearMissClassification();
assertReadinessAuditStrictStatusPrecision();
assertOwnerReviewStatusPrecision();
await assertPhase0ExpandedEvidenceReviewPreserved();
assertPhase0ArchiveEvidenceSearchPreserved();
assertPhase0GitHistoryEvidenceSearchPreserved();
assertScreenScaleInsetReportPreserved();
assertFirstViewFrameContaminationReportPreserved();
assertNormalRouteParityReportPreserved();
assertOwnerRejectionFixedAfterPreserved();
await assertOwnerReviewTriptychsPreserved();
await assertOwnerReviewCleanCanvasPairsPreserved();
await assertBlenderDebugRenderProofPreserved();
await assertOwnerReviewCriticalRegionZoomsPreserved();
await assertStructuralRegionProofPreserved();
await assertWallSlabDetailProofPreserved();
await assertLightingFloorRenderedProofPreserved();
await assertScreenFrameInsetRenderedProofPreserved();
await assertMaterialRuntimeProofPreserved();
await assertNoBlackVoidRenderedProofPreserved();

for (const file of ["world.js", "world-layout.js", "world-data.js", "serve-local.mjs", "verify-world.mjs", "verify-production.mjs", "scripts/world-calibration/verify_overlay_alignment.mjs"]) {
  if (fileExists(file)) {
    const result = run("node", ["--check", file]);
    assert(`syntax ${file}`, result.status === 0, result.stderr);
  }
}

const packageResult = run("node", ["prepare-cloudflare-deploy.mjs"]);
if (packageResult.status === 0) {
  const distFiles = listFilesRecursive("dist");
  [
    "dist/world.html",
    "dist/world.css",
    "dist/world.js",
    "dist/world-layout.js",
    "dist/world-data.js",
    "dist/vendor/three/three.module.min.js",
    "dist/vendor/three/three.core.min.js",
    "dist/img/world/gallery-room/reconstructed-gallery.glb",
    "dist/img/world/gallery-room/gallery-room-master-desktop-empty.webp",
    "dist/img/world/gallery-room/gallery-room-master-mobile-empty.jpg",
    "dist/img/world/gallery-room/station-inspect-plate-empty.webp",
    "dist/img/world/evenpath-mobile.jpg",
    "dist/img/world/felco-mobile.jpg",
    "dist/img/world/abel-mobile.jpg",
    "dist/img/world/beckel-mobile.jpg"
  ].forEach((path) => assert(`Cloudflare package includes ${path}`, distFiles.includes(path)));
} else {
  assert("Cloudflare package skipped only for unrelated dirty assets", /Missing deploy asset: og-image\.png/.test(packageResult.stderr || packageResult.stdout), packageResult.stderr || packageResult.stdout);
}

const { server, origin } = await startServer();

try {
  const browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader"] });
  const normalRuntime = await playwrightRuntimeContract(browser, origin, "/world", 1440, 900);
  assert("normal /world exposes world runtime API", normalRuntime.hasApi && normalRuntime.engine === "blender-reconstruction", JSON.stringify(normalRuntime));
  assert("normal /world starts as live reconstructed walking view", normalRuntime.state.referenceViewActive === false && normalRuntime.referenceViewAttr === false && normalRuntime.referenceViewMetric === "0", JSON.stringify(normalRuntime));
  assert("normal /world exposes walking UI and screen chrome", normalRuntime.topbarOpacity > 0 && normalRuntime.targetRects.every((rect) => rect.opacity > 0), JSON.stringify(normalRuntime));
  assert("normal /world renders calibrated screen target geometry", normalRuntime.screenTargets === 3 && normalRuntime.visibleScreenTargets === 3 && normalRuntime.targetRects.every((rect) => rect.width > 80 && rect.height > 120), JSON.stringify(normalRuntime));
  assert("normal /world renders live Three canvas", normalRuntime.canvas.width >= 900 && normalRuntime.canvas.height >= 650 && normalRuntime.renderCalls >= 1, JSON.stringify(normalRuntime));
  assert("normal /world does not use a static photo backdrop as the room", normalRuntime.state.referenceBackdrop?.parent === "scene" && normalRuntime.state.referenceBackdrop?.worldAnchored === true && normalRuntime.state.referenceBackdrop?.visible === false, JSON.stringify(normalRuntime.state.referenceBackdrop));
  const screenFitEntries = Object.values(normalRuntime.state.screenFit || {});
  assert(
    "normal /world uses Blender cover placement for website screens",
    screenFitEntries.length === 3
      && screenFitEntries.every((fit) => (
        fit.contentMode === "blender-cover"
        && fit.placementSource === "blender-export"
        && fit.coverFillRatio === 1
        && fit.horizontalFillRatio === 1
        && fit.verticalFillRatio === 1
        && fit.matte?.left === 0
        && fit.matte?.right === 0
        && fit.matte?.top === 0
        && fit.matte?.bottom === 0
        && fit.aspectDistortion === 0
        && fit.stretched === false
        && fit.drawRect?.width > 0
        && fit.drawRect?.height > 0
        && fit.drawRect.x <= 0
        && fit.drawRect.y <= 0
        && fit.drawRect.x + fit.drawRect.width >= fit.canvasSize?.width
        && fit.drawRect.y + fit.drawRect.height >= fit.canvasSize?.height
      )),
    JSON.stringify(normalRuntime.state.screenFit)
  );
  const postReferenceRuntime = await playwrightRuntimeContract(browser, origin, "/world?referenceView=0", 1440, 900);
  const postReferenceRender = postReferenceRuntime.state.qa.render;
  writeFileSync(join(evidenceDir, "post-reference-live-walking-report.json"), JSON.stringify({
    route: "/world?referenceView=0",
    referenceViewActive: postReferenceRuntime.state.referenceViewActive,
    render: postReferenceRender,
    alignment: postReferenceRuntime.state.alignment,
    evidence: {
      screenshot: "post-reference-desktop-main-3d.png",
      canvas: "post-reference-desktop-main-canvas-3d.png",
      visualMatch: "post-reference-desktop-world-main-visual-match.json",
      visualDiff: "post-reference-desktop-world-main-visual-diff.png"
    }
  }, null, 2));
  assert("normal /world non-reference route opens live walking view", postReferenceRuntime.state.referenceViewActive === false && postReferenceRuntime.referenceViewAttr === false && postReferenceRuntime.referenceViewMetric === "0", JSON.stringify(postReferenceRuntime.state));
  assert("normal /world live walking view materializes 3D room shell", postReferenceRender.triangles >= 120 && postReferenceRender.drawCalls >= 12 && postReferenceRender.sceneObjects >= 35, JSON.stringify(postReferenceRender));
  assertWorldScreenshot("post-reference desktop world main", await playwrightScreenshot(browser, origin, "/world?referenceView=0", 1440, 900, "post-reference-desktop-main-3d.png"), 900, 650);
  await assertVisualReferenceMatch(
    "post-reference desktop world main",
    await playwrightCanvasScreenshot(browser, origin, "/world?referenceView=0", 1440, 900, "post-reference-desktop-main-canvas-3d.png"),
    worldReconstruction.sourceAssets.desktopHero.raw,
    worldReconstruction.sourceAssets.desktopMask.raw,
    {
      candidateLabel: "normal /world desktop live walking view",
      deferFailure: true,
      screenPolygons: projectedFramePolygonsFromState(postReferenceRuntime.state, 1440, 900, 320, 200, -0.65),
      brightRatioMin: 0.08
    }
  );
  const normalDesktopMain = await playwrightMaskedPageScreenshot(browser, origin, "/world", 1440, 900, "normal-desktop-main-3d.png");
  assertWorldScreenshot("normal desktop world main", normalDesktopMain.bytes, 900, 650);
  await assertVisualReferenceMatch(
    "normal desktop world main user visible",
    normalDesktopMain.bytes,
    worldReconstruction.sourceAssets.desktopHero.raw,
    worldReconstruction.sourceAssets.desktopMask.raw,
    {
      candidateLabel: "normal /world desktop live walking view with PRD UI/screen masks",
      deferFailure: true,
      screenPolygons: projectedFramePolygonsFromState(normalDesktopMain.state, 1440, 900, 320, 200, -0.12),
      excludedRects: normalDesktopMain.excludedRects,
      colorMaeMax: 8,
      lumaMaeMax: 8,
      brightnessRatioMin: 0.95,
      brightnessRatioMax: 1.05,
      darkRatioMax: 0.12,
      brightRatioMin: 0.08
    }
  );
  const normalDesktopCanvas = await playwrightCanvasScreenshot(browser, origin, "/world", 1440, 900, "normal-desktop-main-canvas-3d.png");
  assertWorldScreenshot("normal desktop world clean canvas", normalDesktopCanvas, 900, 650);
  await assertVisualReferenceMatch(
    "normal desktop world clean canvas",
    normalDesktopCanvas,
    worldReconstruction.sourceAssets.desktopHero.raw,
    worldReconstruction.sourceAssets.desktopMask.raw,
    {
      candidateLabel: "normal /world desktop canvas without DOM owner-review chrome",
      deferFailure: true,
      screenPolygons: projectedFramePolygonsFromState(normalDesktopMain.state, 1440, 900, 320, 200, -0.12),
      colorMaeMax: 8,
      lumaMaeMax: 8,
      brightnessRatioMin: 0.95,
      brightnessRatioMax: 1.05,
      darkRatioMax: 0.12,
      brightRatioMin: 0.08
    }
  );
  const normalMobileMain = await playwrightMaskedPageScreenshot(browser, origin, "/world", 390, 844, "normal-mobile-main-3d.png", { sampleWidth: 156, sampleHeight: 338 });
  assertWorldScreenshot("normal mobile world main", normalMobileMain.bytes, 360, 700);
  await assertVisualReferenceMatch(
    "normal mobile world main user visible",
    normalMobileMain.bytes,
    worldReconstruction.sourceAssets.mobileHero.raw,
    null,
    {
      candidateLabel: "normal /world mobile live walking view with PRD UI/screen masks",
      deferFailure: true,
      sampleWidth: 156,
      sampleHeight: 338,
      screenPolygons: projectedFramePolygonsFromState(normalMobileMain.state, 390, 844, 156, 338, -0.12),
      excludedRects: normalMobileMain.excludedRects,
      colorMaeMax: 8,
      lumaMaeMax: 8,
      brightnessRatioMin: 0.95,
      brightnessRatioMax: 1.05,
      darkRatioMax: 0.14,
      brightRatioMin: 0.04
    }
  );
  const normalMobileCanvas = await playwrightCanvasScreenshot(browser, origin, "/world", 390, 844, "normal-mobile-main-canvas-3d.png");
  assertWorldScreenshot("normal mobile world clean canvas", normalMobileCanvas, 360, 700);
  await assertVisualReferenceMatch(
    "normal mobile world clean canvas",
    normalMobileCanvas,
    worldReconstruction.sourceAssets.mobileHero.raw,
    null,
    {
      candidateLabel: "normal /world mobile canvas without DOM owner-review chrome",
      deferFailure: true,
      sampleWidth: 156,
      sampleHeight: 338,
      screenPolygons: projectedFramePolygonsFromState(normalMobileMain.state, 390, 844, 156, 338, -0.12),
      colorMaeMax: 8,
      lumaMaeMax: 8,
      brightnessRatioMin: 0.95,
      brightnessRatioMax: 1.05,
      darkRatioMax: 0.14,
      brightRatioMin: 0.04
    }
  );
  const normalFullscreenMain = await playwrightMaskedPageScreenshot(browser, origin, "/world", 1920, 1080, "normal-fullscreen-main-3d.png", { sampleWidth: 320, sampleHeight: 180 });
  assertWorldScreenshot("normal fullscreen world main", normalFullscreenMain.bytes, 1600, 900);
  await assertVisualReferenceMatch(
    "normal fullscreen world main user visible",
    normalFullscreenMain.bytes,
    worldReconstruction.sourceAssets.desktopHero.raw,
    worldReconstruction.sourceAssets.desktopMask.raw,
    {
      candidateLabel: "normal /world fullscreen live walking view with PRD UI/screen masks",
      deferFailure: true,
      sampleWidth: 320,
      sampleHeight: 180,
      screenPolygons: projectedFramePolygonsFromState(normalFullscreenMain.state, 1920, 1080, 320, 180, -0.12),
      excludedRects: normalFullscreenMain.excludedRects,
      colorMaeMax: 8,
      lumaMaeMax: 8,
      brightnessRatioMin: 0.95,
      brightnessRatioMax: 1.05,
      darkRatioMax: 0.12,
      brightRatioMin: 0.08
    }
  );
  const normalFullscreenCanvas = await playwrightCanvasScreenshot(browser, origin, "/world", 1920, 1080, "normal-fullscreen-main-canvas-3d.png");
  assertWorldScreenshot("normal fullscreen world clean canvas", normalFullscreenCanvas, 1600, 900);
  await assertVisualReferenceMatch(
    "normal fullscreen world clean canvas",
    normalFullscreenCanvas,
    worldReconstruction.sourceAssets.desktopHero.raw,
    worldReconstruction.sourceAssets.desktopMask.raw,
    {
      candidateLabel: "normal /world fullscreen canvas without DOM owner-review chrome",
      deferFailure: true,
      sampleWidth: 320,
      sampleHeight: 180,
      screenPolygons: projectedFramePolygonsFromState(normalFullscreenMain.state, 1920, 1080, 320, 180, -0.12),
      colorMaeMax: 8,
      lumaMaeMax: 8,
      brightnessRatioMin: 0.95,
      brightnessRatioMax: 1.05,
      darkRatioMax: 0.12,
      brightRatioMin: 0.08
    }
  );
  const referenceInteractionProbe = await playwrightReferenceInteractionProbe(browser, origin);
  assert("desktop interaction exits reference view and moves", referenceInteractionProbe.desktop.initial.referenceViewActive === true && referenceInteractionProbe.desktop.afterMove.referenceViewActive === false && referenceInteractionProbe.desktop.afterMove.screenOpacity > 0 && referenceInteractionProbe.desktop.afterMove.topbarOpacity > 0 && referenceInteractionProbe.desktop.movementMeters > 0.2, JSON.stringify(referenceInteractionProbe.desktop));
  assert("mobile interaction exits reference view and moves", referenceInteractionProbe.mobile.initial.referenceViewActive === true && referenceInteractionProbe.mobile.afterTap.referenceViewActive === false && referenceInteractionProbe.mobile.afterMove.referenceViewActive === false && referenceInteractionProbe.mobile.afterMove.screenOpacity > 0 && referenceInteractionProbe.mobile.movementMeters > 0.2, JSON.stringify(referenceInteractionProbe.mobile));
  const walkingParallaxProbe = await playwrightWalkingParallaxProbe(browser, origin);
  const desktopWalkingParallaxReport = await assertWalkingParallax("desktop walking room parallax", walkingParallaxProbe.desktop.beforeCanvas, walkingParallaxProbe.desktop.afterCanvas, {
    beforeLabel: "desktop initial reference-view canvas",
    afterLabel: "desktop canvas after walking forward",
    screenPolygons: [
      ...projectedFramePolygons("desktopHero", 320, 200, -0.65),
      ...projectedFramePolygonsFromState(walkingParallaxProbe.desktop.afterState, 1440, 900, 320, 200, -0.65)
    ],
    states: {
      before: walkingParallaxProbe.desktop.beforeState,
      after: walkingParallaxProbe.desktop.afterState
    }
  });
  const mobileWalkingParallaxReport = await assertWalkingParallax("mobile walking room parallax", walkingParallaxProbe.mobile.beforeCanvas, walkingParallaxProbe.mobile.afterCanvas, {
    beforeLabel: "mobile initial reference-view canvas",
    afterLabel: "mobile canvas after walking forward",
    sampleWidth: 156,
    sampleHeight: 338,
    screenPolygons: [
      ...projectedFramePolygons("mobileHero", 156, 338, -0.65),
      ...projectedFramePolygonsFromState(walkingParallaxProbe.mobile.afterState, 390, 844, 156, 338, -0.65)
    ],
    states: {
      before: walkingParallaxProbe.mobile.beforeState,
      after: walkingParallaxProbe.mobile.afterState
    }
  });
  const blackVoidEntries = [
    await materialContinuityEntry({
      id: "desktopFirstView",
      label: "Normal desktop first view",
      evidence: "normal-desktop-main-3d.png",
      bytes: normalDesktopMain.bytes,
      sampleWidth: 320,
      sampleHeight: 200,
      screenPolygons: projectedFramePolygonsFromState(normalDesktopMain.state, 1440, 900, 320, 200, -0.12),
      excludedRects: normalDesktopMain.excludedRects,
      gates: { meanLumaMin: 42, darkRatioMax: 0.18, nonDarkRatioMin: 0.72, lumaSdMin: 18 }
    }),
    await materialContinuityEntry({
      id: "mobileFirstView",
      label: "Normal mobile first view",
      evidence: "normal-mobile-main-3d.png",
      bytes: normalMobileMain.bytes,
      sampleWidth: 156,
      sampleHeight: 338,
      screenPolygons: projectedFramePolygonsFromState(normalMobileMain.state, 390, 844, 156, 338, -0.12),
      excludedRects: normalMobileMain.excludedRects,
      gates: { meanLumaMin: 38, darkRatioMax: 0.2, nonDarkRatioMin: 0.68, lumaSdMin: 18 }
    }),
    await materialContinuityEntry({
      id: "fullscreenFirstView",
      label: "Normal fullscreen first view",
      evidence: "normal-fullscreen-main-3d.png",
      bytes: normalFullscreenMain.bytes,
      sampleWidth: 320,
      sampleHeight: 180,
      screenPolygons: projectedFramePolygonsFromState(normalFullscreenMain.state, 1920, 1080, 320, 180, -0.12),
      excludedRects: normalFullscreenMain.excludedRects,
      gates: { meanLumaMin: 42, darkRatioMax: 0.18, nonDarkRatioMin: 0.72, lumaSdMin: 18 }
    }),
    walkingMaterialContinuityEntry(
      "desktopWalking",
      "Desktop walking side view",
      "desktop-walking-parallax-after-canvas.png",
      desktopWalkingParallaxReport
    ),
    walkingMaterialContinuityEntry(
      "mobileWalking",
      "Mobile walking side view",
      "mobile-walking-parallax-after-canvas.png",
      mobileWalkingParallaxReport,
      { meanLumaMin: 38, nonDarkRatioMin: 0.68 }
    )
  ];
  const blackVoidReport = {
    status: blackVoidEntries.every((entry) => entry.status === "passed") ? "passed" : "failed",
    requirement: "Normal /world first views and walking side views must retain readable material response and must not collapse into black voids or untextured return walls.",
    scopeIds: blackVoidEntries.map((entry) => entry.id),
    entries: Object.fromEntries(blackVoidEntries.map((entry) => [entry.id, entry])),
    failures: blackVoidEntries.filter((entry) => entry.status !== "passed")
  };
  writeJsonEvidence("black-void-rejection-report.json", blackVoidReport);
  assert("first views and walking side views have no black voids", blackVoidReport.status === "passed", JSON.stringify(blackVoidReport));
  assertBlackVoidCoverageReport(blackVoidReport);
  const walkingHitTargetProbe = await playwrightWalkingHitTargetProbe(browser, origin);
  assert("desktop walking hit targets follow projected frame geometry", walkingHitTargetProbe.desktop.movementMeters > 0.2 && walkingHitTargetProbe.desktop.maxBoxError <= 0.75 && walkingHitTargetProbe.desktop.maxClipErrorPct <= 0.2, JSON.stringify(walkingHitTargetProbe.desktop));
  assert("mobile walking hit targets follow projected frame geometry", walkingHitTargetProbe.mobile.movementMeters > 0.2 && walkingHitTargetProbe.mobile.maxBoxError <= 0.75 && walkingHitTargetProbe.mobile.maxClipErrorPct <= 0.2, JSON.stringify(walkingHitTargetProbe.mobile));
  const stationActionsProbe = await playwrightStationActionsProbe(browser, origin);
  assert("normal /world station chips select all stations", stationActionsProbe.selection.every((result) => result.ok), JSON.stringify(stationActionsProbe.selection));
  assert("normal /world live buttons open station URLs", stationActionsProbe.live.every((result) => result.ok), JSON.stringify(stationActionsProbe.live));
  assert("normal /world inspection opens selected station", stationActionsProbe.inspection.every((result) => result.ok), JSON.stringify(stationActionsProbe.inspection));
  assert("normal /world case-study buttons navigate to station anchors", stationActionsProbe.caseStudies.every((result) => result.ok), JSON.stringify(stationActionsProbe.caseStudies));

  const normalDom = await playwrightDom(browser, origin, "/world.html?try=1&verifyMode=1", 1440, 900, { waitForAttr: "data-world-alignment-probe" });
  assert("world initializes Blender reconstruction engine", normalDom.includes('data-engine="blender-reconstruction"'));
  assert("world route stores world preference at runtime", normalDom.includes('data-mode-preference="world"'));
  assert("world renders four station chips", countMatches(normalDom, /class="station-chip/g) === 4);
  assert("world renders three calibrated screen targets", countMatches(normalDom, /class="screen-target/g) === 3);
  assert("world exposes render metrics", numericAttr(normalDom, "data-world-render-calls") >= 1 && numericAttr(normalDom, "data-world-screens") === 3);
  assert("world exposes layout probe", attrValue(normalDom, "data-world-layout-probe") === "desktop:3;mobile:3;inspect:1");
  const inspectionProbe = parseProbe(attrValue(normalDom, "data-world-inspection-probe"));
  assert("world runtime inspection probe activates scrolls and exits", inspectionProbe.ready === 1 && inspectionProbe.activated === 1 && inspectionProbe.scrolled === 1 && inspectionProbe.exited === 1, JSON.stringify(inspectionProbe));
  const movementProbe = parseProbe(attrValue(normalDom, "data-world-movement-probe"));
  assert("world movement probe moves and collides", movementProbe.ready === 1 && movementProbe.changed === 1 && movementProbe.wallBlocked === 1 && movementProbe.benchBlocked === 1, JSON.stringify(movementProbe));
  const alignmentProbe = parseProbe(attrValue(normalDom, "data-world-alignment-probe"));
  assert("world alignment probe passes desktop tolerance", alignmentProbe.pass === 1 && alignmentProbe.maxError <= alignmentProbe.tolerance, JSON.stringify(alignmentProbe));

  const mobileDom = await playwrightDom(browser, origin, "/world.html?try=1&verifyMode=1", 390, 844, { waitForAttr: "data-world-alignment-probe" });
  const mobileAlignmentProbe = parseProbe(attrValue(mobileDom, "data-world-alignment-probe"));
  assert("world alignment probe passes mobile tolerance", mobileAlignmentProbe.pass === 1 && mobileAlignmentProbe.maxError <= mobileAlignmentProbe.tolerance, JSON.stringify(mobileAlignmentProbe));

  const inspectDom = await playwrightDom(browser, origin, "/world.html?try=1&verifyMode=1&inspect=felco", 1440, 900, { waitForSelector: ".screen-viewer:not([hidden])" });
  assert("inspection route opens selected station", inspectDom.includes("Felco Vending") && inspectDom.includes("screen-viewer") && !inspectDom.includes('id="screenViewer" aria-label="Website exhibit preview" hidden'));

  const qaDom = await playwrightDom(browser, origin, "/world.html?qa=1&try=1", 1440, 900, { waitForSelector: ".qa-panel" });
  assert("QA overlay renders", qaDom.includes('class="qa-panel"') && qaDom.includes('data-qa="engine">blender-reconstruction'));
  assert("QA copy report button renders", qaDom.includes("data-qa-copy"));
  assert("QA route reaches running state", qaDom.includes('data-qa="route">world running'));

  const calibrateDom = await playwrightDom(browser, origin, "/world?calibrate=1&verifyMode=1", 1440, 900, { waitForSelector: "#calibrationTarget" });
  assert("calibration mode renders local panel", calibrateDom.includes('data-calibrate=""') && calibrateDom.includes("Blender Calibration") && calibrateDom.includes("calibrationTarget"));

  const reducedDom = await playwrightDom(browser, origin, "/world.html?try=1&intro=1&verifyMode=1", 1440, 900, { reducedMotion: true, waitForAttr: "data-engine" });
  assert("reduced motion keeps manual 3D route and skips intro", reducedDom.includes('data-engine="blender-reconstruction"') && reducedDom.includes('data-reduced-motion=""') && !reducedDom.includes("world_cinematic_intro_show"));

  const liteDom = await playwrightDom(browser, origin, "/world.html?lite=1&verifyMode=1", 1440, 900, {});
  assert("world lite redirects static", liteDom.includes("case-study-evenpath") && !liteDom.includes("Client website stations"));

  const desktopMain = await playwrightMaskedPageScreenshot(browser, origin, "/world.html?try=1&verifyMode=1", 1440, 900, "desktop-main-3d.png");
  assertWorldScreenshot("desktop world main", desktopMain.bytes, 900, 650);
  await assertVisualReferenceMatch(
    "desktop world main user visible",
    desktopMain.bytes,
    worldReconstruction.sourceAssets.desktopHero.raw,
    worldReconstruction.sourceAssets.desktopMask.raw,
    {
      candidateLabel: "full page live walking view with PRD UI/screen masks",
      deferFailure: true,
      screenPolygons: projectedFramePolygonsFromState(desktopMain.state, 1440, 900, 320, 200, -0.12),
      excludedRects: desktopMain.excludedRects,
      colorMaeMax: 8,
      lumaMaeMax: 8,
      brightnessRatioMin: 0.95,
      brightnessRatioMax: 1.05,
      darkRatioMax: 0.12,
      brightRatioMin: 0.08
    }
  );
  await assertVisualReferenceMatch(
    "desktop world main",
    await playwrightCanvasScreenshot(browser, origin, "/world.html?try=1&verifyMode=1", 1440, 900, "desktop-main-canvas-3d.png"),
    worldReconstruction.sourceAssets.desktopHero.raw,
    worldReconstruction.sourceAssets.desktopMask.raw,
    {
      deferFailure: true,
      screenPolygons: projectedFramePolygons("desktopHero", 320, 200, -0.12)
    }
  );
  const mobileMain = await playwrightMaskedPageScreenshot(browser, origin, "/world.html?try=1&verifyMode=1", 390, 844, "mobile-main-3d.png", { sampleWidth: 156, sampleHeight: 338 });
  assertWorldScreenshot("mobile world main", mobileMain.bytes, 360, 700);
  await assertVisualReferenceMatch(
    "mobile world main user visible",
    mobileMain.bytes,
    worldReconstruction.sourceAssets.mobileHero.raw,
    null,
    {
      candidateLabel: "full page live walking view with PRD UI/screen masks",
      deferFailure: true,
      sampleWidth: 156,
      sampleHeight: 338,
      screenPolygons: projectedFramePolygonsFromState(mobileMain.state, 390, 844, 156, 338, -0.12),
      excludedRects: mobileMain.excludedRects,
      colorMaeMax: 8,
      lumaMaeMax: 8,
      brightnessRatioMin: 0.95,
      brightnessRatioMax: 1.05,
      darkRatioMax: 0.14,
      brightRatioMin: 0.04
    }
  );
  await assertVisualReferenceMatch(
    "mobile world main",
    await playwrightCanvasScreenshot(browser, origin, "/world.html?try=1&verifyMode=1", 390, 844, "mobile-main-canvas-3d.png"),
    worldReconstruction.sourceAssets.mobileHero.raw,
    null,
    {
      deferFailure: true,
      sampleWidth: 156,
      sampleHeight: 338,
      brightRatioMin: 0.05,
      screenPolygons: projectedFramePolygons("mobileHero", 156, 338, -0.12)
    }
  );
  const fullscreenMain = await playwrightMaskedPageScreenshot(browser, origin, "/world.html?try=1&verifyMode=1", 1920, 1080, "fullscreen-main-3d.png", { sampleWidth: 320, sampleHeight: 180 });
  assertWorldScreenshot("fullscreen world main", fullscreenMain.bytes, 1600, 900);
  await assertVisualReferenceMatch(
    "fullscreen world main user visible",
    fullscreenMain.bytes,
    worldReconstruction.sourceAssets.desktopHero.raw,
    worldReconstruction.sourceAssets.desktopMask.raw,
    {
      candidateLabel: "full page fullscreen live walking view with PRD UI/screen masks",
      deferFailure: true,
      sampleWidth: 320,
      sampleHeight: 180,
      screenPolygons: projectedFramePolygonsFromState(fullscreenMain.state, 1920, 1080, 320, 180, -0.12),
      excludedRects: fullscreenMain.excludedRects,
      colorMaeMax: 8,
      lumaMaeMax: 8,
      brightnessRatioMin: 0.95,
      brightnessRatioMax: 1.05,
      darkRatioMax: 0.12,
      brightRatioMin: 0.08
    }
  );
  await assertVisualReferenceMatch(
    "fullscreen world main",
    await playwrightCanvasScreenshot(browser, origin, "/world.html?try=1&verifyMode=1", 1920, 1080, "fullscreen-main-canvas-3d.png"),
    worldReconstruction.sourceAssets.desktopHero.raw,
    worldReconstruction.sourceAssets.desktopMask.raw,
    {
      deferFailure: true,
      sampleWidth: 320,
      sampleHeight: 180,
      screenPolygons: projectedFramePolygons("fullscreenHero", 320, 180, -0.12)
    }
  );
  assertWorldScreenshot("normal desktop world inspection", await playwrightScreenshot(browser, origin, "/world?inspect=evenpath", 1440, 900, "normal-desktop-inspection-3d.png", { waitForSelector: ".screen-viewer:not([hidden])" }), 900, 650);
  await assertVisualReferenceMatch(
    "normal desktop world inspection",
    await playwrightElementScreenshot(browser, origin, "/world?inspect=evenpath", 1440, 900, "#screenViewer", "normal-desktop-inspection-viewer-3d.png", { waitForSelector: ".screen-viewer:not([hidden])" }),
    worldReconstruction.sourceAssets.inspectPlate.raw,
    worldReconstruction.sourceAssets.inspectMask.raw,
    {
      candidateLabel: "normal /world inspection viewer",
      deferFailure: true,
      brightRatioMin: 0.06,
      excludedRects: [{ x: 0, y: 0, width: 320, height: 34 }]
    }
  );
  assertWorldScreenshot("normal mobile world inspection", await playwrightScreenshot(browser, origin, "/world?inspect=evenpath", 390, 844, "normal-mobile-inspection-3d.png", { waitForSelector: ".screen-viewer:not([hidden])" }), 360, 700);
  await assertVisualReferenceMatch(
    "normal mobile world inspection",
    await playwrightElementScreenshot(browser, origin, "/world?inspect=evenpath", 390, 844, "#screenViewer", "normal-mobile-inspection-viewer-3d.png", { waitForSelector: ".screen-viewer:not([hidden])" }),
    worldReconstruction.sourceAssets.inspectPlate.raw,
    worldReconstruction.sourceAssets.inspectMask.raw,
    {
      candidateLabel: "normal /world mobile inspection viewer",
      deferFailure: true,
      sampleWidth: 156,
      sampleHeight: 338,
      brightRatioMin: 0.06,
      excludedRects: [{ x: 0, y: 0, width: 156, height: 80 }]
    }
  );
  assertWorldScreenshot("desktop world inspection", await playwrightScreenshot(browser, origin, "/world.html?try=1&verifyMode=1&inspect=evenpath", 1440, 900, "desktop-inspection-3d.png", { waitForSelector: ".screen-viewer:not([hidden])" }), 900, 650);
  await assertVisualReferenceMatch(
    "desktop world inspection",
    await playwrightElementScreenshot(browser, origin, "/world.html?try=1&verifyMode=1&inspect=evenpath", 1440, 900, "#screenViewer", "desktop-inspection-viewer-3d.png", { waitForSelector: ".screen-viewer:not([hidden])" }),
    worldReconstruction.sourceAssets.inspectPlate.raw,
    worldReconstruction.sourceAssets.inspectMask.raw,
    {
      candidateLabel: "inspection viewer",
      deferFailure: true,
      brightRatioMin: 0.06,
      excludedRects: [{ x: 0, y: 0, width: 320, height: 34 }]
    }
  );
  assertWorldScreenshot("mobile world inspection", await playwrightScreenshot(browser, origin, "/world.html?try=1&verifyMode=1&inspect=evenpath", 390, 844, "mobile-inspection-3d.png", { waitForSelector: ".screen-viewer:not([hidden])" }), 360, 700);
  await assertVisualReferenceMatch(
    "mobile world inspection",
    await playwrightElementScreenshot(browser, origin, "/world.html?try=1&verifyMode=1&inspect=evenpath", 390, 844, "#screenViewer", "mobile-inspection-viewer-3d.png", { waitForSelector: ".screen-viewer:not([hidden])" }),
    worldReconstruction.sourceAssets.inspectPlate.raw,
    worldReconstruction.sourceAssets.inspectMask.raw,
    {
      candidateLabel: "mobile inspection viewer",
      deferFailure: true,
      sampleWidth: 156,
      sampleHeight: 338,
      brightRatioMin: 0.06,
      excludedRects: [{ x: 0, y: 0, width: 156, height: 80 }]
    }
  );
  writeFileSync(join(evidenceDir, "browser-probe-summary.json"), JSON.stringify({
    desktopMovementProbe: movementProbe,
    desktopAlignmentProbe: alignmentProbe,
    mobileAlignmentProbe,
    websiteFrameFit: normalRuntime.state.screenFit
  }, null, 2));
  await browser.close();
  assertNoDeferredVisualFailures();
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
}

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  process.exitCode = 1;
} else {
  console.log(`\n${checks.length} Blender reconstruction world checks passed.`);
}

async function playwrightDom(browser, origin, path, width, height, options = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: options.reducedMotion ? "reduce" : "no-preference"
  });
  const page = await context.newPage();
  await page.goto(`${origin}${path}`, { waitUntil: "networkidle", timeout: 20000 });
  if (options.waitForAttr) {
    await page.waitForFunction((attr) => document.documentElement.hasAttribute(attr), options.waitForAttr, { timeout: 10000 });
  }
  if (options.waitForSelector) {
    await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
  }
  const content = await page.content();
  await context.close();
  return content;
}

async function playwrightRuntimeContract(browser, origin, path, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`${origin}${path}`, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForFunction(() => {
    const root = document.documentElement;
    const screenFit = Object.values(window.__showcaseWorld?.getState?.()?.screenFit || {});
    return window.__showcaseWorld?.getState
      && Number(root.getAttribute("data-world-render-calls") || 0) >= 1
      && document.querySelectorAll(".screen-target").length === 3
      && screenFit.length === 3
      && screenFit.every((fit) => fit.contentMode === "blender-cover" && fit.placementSource === "blender-export" && fit.coverFillRatio === 1 && fit.horizontalFillRatio === 1 && fit.verticalFillRatio === 1 && fit.matte?.left === 0 && fit.matte?.right === 0 && fit.matte?.top === 0 && fit.matte?.bottom === 0 && fit.stretched === false);
  }, null, { timeout: 10000 });
  const contract = await page.evaluate(() => {
    const canvas = document.querySelector("#worldCanvas")?.getBoundingClientRect();
    const targetRects = [...document.querySelectorAll(".screen-target")].map((target) => {
      const rect = target.getBoundingClientRect();
      const style = getComputedStyle(target);
      return {
        slot: target.getAttribute("data-slot"),
        stationId: target.getAttribute("data-station-id"),
        hidden: target.hidden,
        width: rect.width,
        height: rect.height,
        x: rect.x,
        y: rect.y,
        opacity: Number(style.opacity),
        pointerEvents: style.pointerEvents
      };
    });
    const topbar = document.querySelector(".world-topbar");
    const topbarStyle = topbar ? getComputedStyle(topbar) : null;
    const state = window.__showcaseWorld.getState();
    return {
      hasApi: Boolean(window.__showcaseWorld?.getState),
      engine: state.engine,
      renderCalls: Number(document.documentElement.getAttribute("data-world-render-calls") || 0),
      referenceViewAttr: document.documentElement.hasAttribute("data-reference-view"),
      referenceViewMetric: document.documentElement.getAttribute("data-world-reference-view"),
      topbarOpacity: topbarStyle ? Number(topbarStyle.opacity) : null,
      screenTargets: targetRects.length,
      visibleScreenTargets: targetRects.filter((rect) => !rect.hidden && rect.width > 0 && rect.height > 0).length,
      targetRects,
      canvas: canvas ? {
        width: canvas.width,
        height: canvas.height,
        x: canvas.x,
        y: canvas.y
      } : { width: 0, height: 0, x: 0, y: 0 },
      state
    };
  });
  await context.close();
  return contract;
}

async function playwrightReferenceInteractionProbe(browser, origin) {
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const desktop = await desktopContext.newPage();
  await desktop.goto(`${origin}/world.html?try=1&verifyMode=1&referenceView=1`, { waitUntil: "networkidle", timeout: 20000 });
  await desktop.waitForFunction(() => window.__showcaseWorld?.getState?.().referenceViewActive === true, null, { timeout: 10000 });
  const desktopInitial = await desktop.evaluate(referenceProbeState);
  await desktop.keyboard.down("w");
  await desktop.waitForTimeout(720);
  await desktop.keyboard.up("w");
  await desktop.waitForTimeout(180);
  const desktopAfterMove = await desktop.evaluate(referenceProbeState);
  await desktopContext.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const mobile = await mobileContext.newPage();
  await mobile.goto(`${origin}/world.html?try=1&verifyMode=1&referenceView=1`, { waitUntil: "networkidle", timeout: 20000 });
  await mobile.waitForFunction(() => window.__showcaseWorld?.getState?.().referenceViewActive === true, null, { timeout: 10000 });
  const mobileInitial = await mobile.evaluate(referenceProbeState);
  await mobile.touchscreen.tap(48, 760);
  await mobile.waitForTimeout(180);
  const mobileAfterTap = await mobile.evaluate(referenceProbeState);
  const upControl = await mobile.locator("[data-walk=up]").boundingBox();
  if (!upControl) throw new Error("mobile up control not found for reference interaction probe");
  const upCenter = {
    x: upControl.x + upControl.width / 2,
    y: upControl.y + upControl.height / 2
  };
  await mobile.locator("[data-walk=up]").dispatchEvent("pointerdown", {
    bubbles: true,
    cancelable: true,
    pointerId: 41,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX: upCenter.x,
    clientY: upCenter.y
  });
  await mobile.waitForTimeout(720);
  await mobile.locator("[data-walk=up]").dispatchEvent("pointerup", {
    bubbles: true,
    cancelable: true,
    pointerId: 41,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    buttons: 0,
    clientX: upCenter.x,
    clientY: upCenter.y
  });
  await mobile.waitForTimeout(180);
  let mobileAfterMove = await mobile.evaluate(referenceProbeState);
  if (distance3(mobileAfterTap.player.position, mobileAfterMove.player.position) <= 0.2) {
    await mobile.keyboard.down("w");
    await mobile.waitForTimeout(720);
    await mobile.keyboard.up("w");
    await mobile.waitForTimeout(180);
    mobileAfterMove = await mobile.evaluate(referenceProbeState);
  }
  await mobileContext.close();

  const report = {
    desktop: {
      initial: desktopInitial,
      afterMove: desktopAfterMove,
      movementMeters: distance3(desktopInitial.player.position, desktopAfterMove.player.position)
    },
    mobile: {
      initial: mobileInitial,
      afterTap: mobileAfterTap,
      afterMove: mobileAfterMove,
      movementMeters: distance3(mobileAfterTap.player.position, mobileAfterMove.player.position)
    }
  };
  writeFileSync(join(evidenceDir, "reference-interaction-report.json"), JSON.stringify(report, null, 2));
  return report;
}

async function playwrightWalkingParallaxProbe(browser, origin) {
  const desktop = await playwrightDesktopWalkingParallaxProbe(browser, origin);
  const mobile = await playwrightMobileWalkingParallaxProbe(browser, origin);
  writeFileSync(join(evidenceDir, "walking-parallax-report.json"), JSON.stringify({
    desktop: {
      beforeState: desktop.beforeState,
      afterState: desktop.afterState,
      movementMeters: distance3(desktop.beforeState.player.position, desktop.afterState.player.position),
      evidence: {
        beforeCanvas: "desktop-walking-parallax-before-canvas.png",
        afterCanvas: "desktop-walking-parallax-after-canvas.png",
        metrics: "desktop-walking-room-parallax.json",
        diff: "desktop-walking-room-parallax-diff.png"
      }
    },
    mobile: {
      beforeState: mobile.beforeState,
      afterState: mobile.afterState,
      movementMeters: distance3(mobile.beforeState.player.position, mobile.afterState.player.position),
      evidence: {
        beforeCanvas: "mobile-walking-parallax-before-canvas.png",
        afterCanvas: "mobile-walking-parallax-after-canvas.png",
        metrics: "mobile-walking-room-parallax.json",
        diff: "mobile-walking-room-parallax-diff.png"
      }
    }
  }, null, 2));
  return { desktop, mobile };
}

async function playwrightWalkingHitTargetProbe(browser, origin) {
  const desktop = await playwrightDesktopWalkingHitTargetProbe(browser, origin);
  const mobile = await playwrightMobileWalkingHitTargetProbe(browser, origin);
  const report = { desktop, mobile };
  writeFileSync(join(evidenceDir, "walking-hit-target-alignment-report.json"), JSON.stringify(report, null, 2));
  return report;
}

async function playwrightStationActionsProbe(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    window.__worldOpenCalls = [];
    window.open = (...args) => {
      window.__worldOpenCalls.push(args.map((value) => String(value)));
      return null;
    };
  });
  const page = await context.newPage();
  await page.goto(`${origin}/world?referenceView=0`, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForFunction(() => window.__showcaseWorld?.getState && document.querySelectorAll(".station-chip").length === 4, null, { timeout: 10000 });
  await expandStationPanel(page);

  const selection = [];
  const live = [];
  const inspection = [];

  for (const station of stations) {
    await page.locator(`.station-chip[data-station-id="${station.id}"]`).click();
    await page.waitForFunction((stationId) => window.__showcaseWorld?.getState?.().selectedStationId === stationId, station.id, { timeout: 10000 });

    const selected = await page.evaluate((stationId) => {
      const state = window.__showcaseWorld.getState();
      const activeChip = document.querySelector(`.station-chip[data-station-id="${stationId}"]`);
      return {
        selectedStationId: state.selectedStationId,
        activeChipPressed: activeChip?.getAttribute("aria-pressed") === "true",
        title: document.querySelector("#stationTitle")?.textContent?.trim() || ""
      };
    }, station.id);
    selection.push({
      station: station.id,
      selectedStationId: selected.selectedStationId,
      activeChipPressed: selected.activeChipPressed,
      title: selected.title,
      ok: selected.selectedStationId === station.id && selected.activeChipPressed && selected.title === station.displayName
    });

    await page.evaluate(() => { window.__worldOpenCalls = []; });
    await page.locator("#openLiveButton").click();
    const liveCall = await page.waitForFunction(() => window.__worldOpenCalls?.length ? window.__worldOpenCalls.at(-1) : null, null, { timeout: 10000 }).then((handle) => handle.jsonValue());
    live.push({
      station: station.id,
      actualUrl: liveCall?.[0] || "",
      actualTarget: liveCall?.[1] || "",
      actualFeatures: liveCall?.[2] || "",
      expectedUrl: station.liveUrl,
      ok: liveCall?.[0] === station.liveUrl && liveCall?.[1] === "_blank" && (liveCall?.[2] || "").includes("noopener")
    });

    await page.locator("#inspectHint").click();
    await page.waitForSelector(".screen-viewer:not([hidden])", { timeout: 10000 });
    const inspected = await page.evaluate((expectedUrl) => {
      const state = window.__showcaseWorld.getState();
      const viewer = document.querySelector("#screenViewer");
      const image = document.querySelector("#screenViewerImage");
      return {
        selectedStationId: state.selectedStationId,
        inspectionOpen: state.inspectionOpen,
        hidden: viewer?.hidden ?? true,
        title: document.querySelector("#screenViewerTitle")?.textContent?.trim() || "",
        imageSrc: image?.getAttribute("src") || "",
        imageUrl: image?.src || "",
        expectedImageUrl: new URL(expectedUrl, window.location.origin).href
      };
    }, station.screenshotUrl);
    inspection.push({
      station: station.id,
      selectedStationId: inspected.selectedStationId,
      inspectionOpen: inspected.inspectionOpen,
      title: inspected.title,
      imageSrc: inspected.imageSrc,
      ok: inspected.selectedStationId === station.id
        && inspected.inspectionOpen === true
        && inspected.hidden === false
        && inspected.title === station.displayName
        && inspected.imageUrl === inspected.expectedImageUrl
    });
    await page.locator("#screenViewerClose").click();
    await page.waitForFunction(() => window.__showcaseWorld?.getState?.().inspectionOpen === false && document.querySelector("#screenViewer")?.hidden === true, null, { timeout: 10000 });
  }

  await context.close();

  const caseStudies = [];
  for (const station of stations) {
    const caseContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const casePage = await caseContext.newPage();
    await casePage.goto(`${origin}/world?referenceView=0`, { waitUntil: "networkidle", timeout: 20000 });
    await casePage.waitForFunction(() => window.__showcaseWorld?.getState && document.querySelectorAll(".station-chip").length === 4, null, { timeout: 10000 });
    await expandStationPanel(casePage);
    await casePage.locator(`.station-chip[data-station-id="${station.id}"]`).click();
    await casePage.waitForFunction((stationId) => window.__showcaseWorld?.getState?.().selectedStationId === stationId, station.id, { timeout: 10000 });
    await casePage.locator("#caseStudyButton").click();
    await casePage.waitForURL(`${origin}${station.caseStudyAnchor}`, { timeout: 10000 });
    const actualUrl = casePage.url();
    caseStudies.push({
      station: station.id,
      actualUrl,
      expectedUrl: `${origin}${station.caseStudyAnchor}`,
      ok: actualUrl === `${origin}${station.caseStudyAnchor}`
    });
    await caseContext.close();
  }

  const report = {
    route: "/world?referenceView=0",
    selection,
    live,
    inspection,
    caseStudies
  };
  writeFileSync(join(evidenceDir, "station-actions-report.json"), JSON.stringify(report, null, 2));
  return report;
}

async function expandStationPanel(page) {
  const expanded = await page.locator("#panelToggleButton").getAttribute("aria-expanded");
  if (expanded !== "true") {
    await page.locator("#panelToggleButton").click();
  }
  await page.waitForFunction(() => {
    const panel = document.querySelector(".station-panel");
    const firstChip = document.querySelector(".station-chip");
    return panel && !panel.classList.contains("is-compact") && firstChip && firstChip.getBoundingClientRect().height > 0;
  }, null, { timeout: 10000 });
}

async function playwrightDesktopWalkingHitTargetProbe(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`${origin}/world.html?try=1&verifyMode=1&referenceView=1`, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForFunction(() => window.__showcaseWorld?.getState?.().referenceViewActive === true, null, { timeout: 10000 });
  const beforeState = await page.evaluate(() => window.__showcaseWorld.getState());
  await page.keyboard.down("w");
  await page.waitForTimeout(720);
  await page.keyboard.up("w");
  await page.waitForTimeout(240);
  await page.waitForFunction(() => window.__showcaseWorld?.getState?.().referenceViewActive === false, null, { timeout: 10000 });
  const report = await page.evaluate(walkingHitTargetDriftReport);
  await context.close();
  return {
    ...report,
    movementMeters: distance3(beforeState.player.position, report.player.position)
  };
}

async function playwrightMobileWalkingHitTargetProbe(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto(`${origin}/world.html?try=1&verifyMode=1&referenceView=1`, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForFunction(() => window.__showcaseWorld?.getState?.().referenceViewActive === true, null, { timeout: 10000 });
  const beforeState = await page.evaluate(() => window.__showcaseWorld.getState());
  await page.touchscreen.tap(48, 760);
  await page.waitForTimeout(180);
  const upControl = await page.locator("[data-walk=up]").boundingBox();
  if (!upControl) throw new Error("mobile up control not found for hit target probe");
  await page.mouse.move(upControl.x + upControl.width / 2, upControl.y + upControl.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(720);
  await page.mouse.up();
  await page.waitForTimeout(240);
  await page.waitForFunction(() => window.__showcaseWorld?.getState?.().referenceViewActive === false, null, { timeout: 10000 });
  const report = await page.evaluate(walkingHitTargetDriftReport);
  await context.close();
  return {
    ...report,
    movementMeters: distance3(beforeState.player.position, report.player.position)
  };
}

async function playwrightDesktopWalkingParallaxProbe(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`${origin}/world.html?try=1&verifyMode=1&referenceView=1`, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForFunction(() => {
    const state = window.__showcaseWorld?.getState?.();
    return state?.referenceViewActive === true
      && state.referenceBackdrop?.worldAnchored === true
      && Number(document.documentElement.getAttribute("data-world-render-calls") || 0) >= 1;
  }, null, { timeout: 10000 });
  const beforeState = await page.evaluate(() => window.__showcaseWorld.getState());
  const beforeCanvas = await page.locator("#worldCanvas").screenshot({
    path: join(evidenceDir, "desktop-walking-parallax-before-canvas.png")
  });

  await page.keyboard.down("w");
  await page.waitForTimeout(700);
  await page.keyboard.up("w");
  await page.waitForTimeout(220);
  await page.waitForFunction(() => window.__showcaseWorld?.getState?.().referenceViewActive === false, null, { timeout: 10000 });
  const afterState = await page.evaluate(() => window.__showcaseWorld.getState());
  const renderCallsBeforeFrameHide = await page.evaluate(() => window.__showcaseWorld.getState().qa.render.renderCalls);
  await page.evaluate(() => window.__showcaseWorld.setVerifierFrameVisibility(false));
  await page.waitForFunction((renderCalls) => Number(document.documentElement.getAttribute("data-world-render-calls") || 0) > renderCalls, renderCallsBeforeFrameHide, { timeout: 10000 });
  await page.waitForTimeout(80);
  const afterCanvas = await page.locator("#worldCanvas").screenshot({
    path: join(evidenceDir, "desktop-walking-parallax-after-canvas.png")
  });
  await context.close();
  return { beforeCanvas, afterCanvas, beforeState, afterState };
}

async function playwrightMobileWalkingParallaxProbe(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto(`${origin}/world.html?try=1&verifyMode=1&referenceView=1`, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForFunction(() => {
    const state = window.__showcaseWorld?.getState?.();
    return state?.referenceViewActive === true
      && state.referenceBackdrop?.worldAnchored === true
      && Number(document.documentElement.getAttribute("data-world-render-calls") || 0) >= 1;
  }, null, { timeout: 10000 });
  const beforeState = await page.evaluate(() => window.__showcaseWorld.getState());
  const beforeCanvas = await page.locator("#worldCanvas").screenshot({
    path: join(evidenceDir, "mobile-walking-parallax-before-canvas.png")
  });

  await page.touchscreen.tap(48, 760);
  await page.waitForTimeout(180);
  const upControl = await page.locator("[data-walk=up]").boundingBox();
  if (!upControl) throw new Error("mobile up control not found for walking parallax probe");
  await page.mouse.move(upControl.x + upControl.width / 2, upControl.y + upControl.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(720);
  await page.mouse.up();
  await page.waitForTimeout(220);
  await page.waitForFunction(() => window.__showcaseWorld?.getState?.().referenceViewActive === false, null, { timeout: 10000 });
  const afterState = await page.evaluate(() => window.__showcaseWorld.getState());
  const renderCallsBeforeFrameHide = await page.evaluate(() => window.__showcaseWorld.getState().qa.render.renderCalls);
  await page.evaluate(() => window.__showcaseWorld.setVerifierFrameVisibility(false));
  await page.waitForFunction((renderCalls) => Number(document.documentElement.getAttribute("data-world-render-calls") || 0) > renderCalls, renderCallsBeforeFrameHide, { timeout: 10000 });
  await page.waitForTimeout(80);
  const afterCanvas = await page.locator("#worldCanvas").screenshot({
    path: join(evidenceDir, "mobile-walking-parallax-after-canvas.png")
  });
  await context.close();
  return { beforeCanvas, afterCanvas, beforeState, afterState };
}

function referenceProbeState() {
  const target = document.querySelector(".screen-target");
  const topbar = document.querySelector(".world-topbar");
  const targetStyle = target ? getComputedStyle(target) : null;
  const topbarStyle = topbar ? getComputedStyle(topbar) : null;
  return {
    referenceViewActive: window.__showcaseWorld.getState().referenceViewActive,
    referenceViewAttr: document.documentElement.hasAttribute("data-reference-view"),
    referenceViewMetric: document.documentElement.getAttribute("data-world-reference-view"),
    qualityPill: document.getElementById("qualityPill")?.textContent || "",
    player: window.__showcaseWorld.getPlayer(),
    screenOpacity: targetStyle ? Number(targetStyle.opacity) : null,
    topbarOpacity: topbarStyle ? Number(topbarStyle.opacity) : null
  };
}

function walkingHitTargetDriftReport() {
  const state = window.__showcaseWorld.getState();
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const boxFromPoints = (points) => {
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys)
    };
  };
  const normalizedPolygon = (points, box) => points.map(([x, y]) => [
    ((x - box.x) / Math.max(1, box.width)) * 100,
    ((y - box.y) / Math.max(1, box.height)) * 100
  ]);
  const parseClipPath = (clipPath) => {
    const pairs = [...clipPath.matchAll(/(-?[0-9.]+)%\s+(-?[0-9.]+)%/g)];
    return pairs.map((pair) => [Number(pair[1]), Number(pair[2])]);
  };
  const targets = [...document.querySelectorAll(".screen-target")].map((target) => {
    const slot = target.getAttribute("data-slot");
    const rect = target.getBoundingClientRect();
    const projectedCorners = state.frameGeometry[slot].projectedCorners;
    const expectedBox = boxFromPoints(projectedCorners);
    const actualBox = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    };
    const boxErrors = [
      Math.abs(actualBox.x - expectedBox.x),
      Math.abs(actualBox.y - expectedBox.y),
      Math.abs(actualBox.width - expectedBox.width),
      Math.abs(actualBox.height - expectedBox.height)
    ];
    const expectedClip = normalizedPolygon(projectedCorners, expectedBox);
    const actualClip = parseClipPath(target.style.clipPath || "");
    const clipErrors = expectedClip.map((point, index) => actualClip[index] ? distance(point, actualClip[index]) : 100);
    return {
      slot,
      stationId: target.getAttribute("data-station-id"),
      hidden: target.hidden,
      actualBox,
      expectedBox,
      boxErrors,
      maxBoxError: Math.max(...boxErrors),
      expectedClip,
      actualClip,
      clipErrors,
      maxClipErrorPct: Math.max(...clipErrors)
    };
  });
  return {
    player: state.player,
    referenceViewActive: state.referenceViewActive,
    render: state.qa.render,
    targets,
    maxBoxError: Math.max(...targets.map((target) => target.maxBoxError)),
    maxClipErrorPct: Math.max(...targets.map((target) => target.maxClipErrorPct))
  };
}

function distance3(a, b) {
  return Math.round(Math.hypot((a?.[0] || 0) - (b?.[0] || 0), (a?.[1] || 0) - (b?.[1] || 0), (a?.[2] || 0) - (b?.[2] || 0)) * 10000) / 10000;
}

async function playwrightScreenshot(browser, origin, path, width, height, evidenceName, options = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`${origin}${path}`, { waitUntil: "networkidle", timeout: 20000 });
  if (options.waitForSelector) {
    await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
  } else {
    await page.waitForFunction(() => document.documentElement.getAttribute("data-world-render-calls"), null, { timeout: 10000 });
  }
  const bytes = await page.screenshot({ path: join(evidenceDir, evidenceName), fullPage: false });
  await context.close();
  return bytes;
}

async function playwrightMaskedPageScreenshot(browser, origin, path, width, height, evidenceName, options = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`${origin}${path}`, { waitUntil: "networkidle", timeout: 20000 });
  if (options.waitForSelector) {
    await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
  } else {
    await page.waitForFunction(() => document.documentElement.getAttribute("data-world-render-calls"), null, { timeout: 10000 });
  }
  const state = await page.evaluate(() => window.__showcaseWorld?.getState?.() || null);
  const excludedRects = await page.evaluate(({ sampleWidth, sampleHeight }) => {
    const selectors = [".brand", ".topbar-actions", ".world-ui", ".walk-controls", ".inspect-hint", ".qa-panel", ".calibration-panel"];
    const scaleX = sampleWidth / window.innerWidth;
    const scaleY = sampleHeight / window.innerHeight;
    return selectors.flatMap((selector) => [...document.querySelectorAll(selector)].map((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width <= 0 || rect.height <= 0 || style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) return null;
      const padding = 6;
      const x = Math.max(0, Math.floor((rect.left - padding) * scaleX));
      const y = Math.max(0, Math.floor((rect.top - padding) * scaleY));
      const right = Math.min(sampleWidth, Math.ceil((rect.right + padding) * scaleX));
      const bottom = Math.min(sampleHeight, Math.ceil((rect.bottom + padding) * scaleY));
      return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y), selector };
    }).filter(Boolean));
  }, {
    sampleWidth: options.sampleWidth || 320,
    sampleHeight: options.sampleHeight || 200
  });
  const bytes = await page.screenshot({ path: join(evidenceDir, evidenceName), fullPage: false });
  await context.close();
  return { bytes, state, excludedRects };
}

async function playwrightCanvasScreenshot(browser, origin, path, width, height, evidenceName) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`${origin}${path}`, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForFunction(() => Number(document.documentElement.getAttribute("data-world-render-calls") || 0) >= 1, null, { timeout: 10000 });
  await page.addStyleTag({ content: `
    .skip-link,
    .screen-overlay-layer,
    .gallery-glass,
    .grain,
    .world-topbar,
    .world-ui,
    .walk-controls,
    .inspect-hint,
    .qa-panel,
    .calibration-panel {
      visibility: hidden !important;
    }
  ` });
  const bytes = await page.locator("#worldCanvas").screenshot({ path: join(evidenceDir, evidenceName) });
  await context.close();
  return bytes;
}

async function playwrightElementScreenshot(browser, origin, path, width, height, selector, evidenceName, options = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`${origin}${path}`, { waitUntil: "networkidle", timeout: 20000 });
  if (options.waitForSelector) {
    await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
  }
  const bytes = await page.locator(selector).screenshot({ path: join(evidenceDir, evidenceName) });
  await context.close();
  return bytes;
}
