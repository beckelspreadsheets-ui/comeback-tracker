import { readFileSync } from "node:fs";

const RESULTS_FILE = "DEVICE_QA_RESULTS.md";
const REQUIRED_PLATFORMS = ["ios", "android"];

function fail(message) {
  console.error(`Device QA failed: ${message}`);
  process.exitCode = 1;
}

function detectPlatform(report) {
  const text = [
    report.platform,
    report.device,
    report.osBrowser,
    report.browser,
    report.userAgent,
    report.qa?.userAgent
  ].filter(Boolean).join(" ").toLowerCase();

  if (/\bios\b|iphone|ipad|safari/.test(text)) return "ios";
  if (/android|chrome/.test(text)) return "android";
  return "";
}

function manualText(report, key) {
  return String(report.manual?.[key] || report[key] || "").trim();
}

function hasBadManualSignal(value, pattern) {
  return !value || pattern.test(value);
}

function validateReport(report, platform) {
  const label = platform === "ios" ? "iOS Safari" : "Android Chrome";
  const qa = report.qa || report.report || report;
  const render = qa.render || report.render || {};
  const errors = [];

  if (String(report.result || "").toUpperCase() !== "PASS") {
    errors.push("result must be PASS");
  }
  if (!Number.isFinite(Number(qa.durationSeconds)) || Number(qa.durationSeconds) < 90) {
    errors.push("durationSeconds must be at least 90");
  }
  if (!Number.isFinite(Number(qa.minFps)) || Number(qa.minFps) < 30) {
    errors.push("minFps must be at least 30");
  }
  if (!Number.isFinite(Number(render.calls)) || Number(render.calls) > 200) {
    errors.push("render.calls must be present and <= 200");
  }
  if (hasBadManualSignal(manualText(report, "heat"), /fail|uncomfort|hot|warning|crash|reload|context/i)) {
    errors.push("manual.heat must be present and not indicate overheating or failure");
  }
  if (hasBadManualSignal(manualText(report, "interaction"), /fail|broken|blocked|unusable/i)) {
    errors.push("manual.interaction must be present and not indicate broken interaction");
  }
  if (hasBadManualSignal(manualText(report, "visualOverlap"), /fail|blocked|critical|unusable/i)) {
    errors.push("manual.visualOverlap must be present and not indicate critical overlap");
  }
  const webgl = manualText(report, "webglContextWarnings");
  if (!webgl || /crash|reload|context.?loss|warning|fail/i.test(webgl)) {
    errors.push("manual.webglContextWarnings must confirm no crash, reload, warning, or context loss");
  }

  if (errors.length) {
    fail(`${label}: ${errors.join("; ")}`);
    return;
  }

  console.log(`ok - ${label} real-device QA passed`);
}

let text = "";
try {
  text = readFileSync(RESULTS_FILE, "utf8");
} catch {
  fail(`${RESULTS_FILE} is missing`);
}

const reports = [];
for (const match of text.matchAll(/```json\s*([\s\S]*?)```/g)) {
  const body = match[1].trim();
  if (!body || body.includes("<paste")) continue;
  try {
    reports.push(JSON.parse(body));
  } catch (error) {
    fail(`invalid JSON report block: ${error.message}`);
  }
}

const byPlatform = new Map();
for (const report of reports) {
  const platform = detectPlatform(report);
  if (platform && !byPlatform.has(platform)) byPlatform.set(platform, report);
}

for (const platform of REQUIRED_PLATFORMS) {
  const report = byPlatform.get(platform);
  if (!report) {
    fail(`missing ${platform === "ios" ? "iOS Safari" : "Android Chrome"} report in ${RESULTS_FILE}`);
    continue;
  }
  validateReport(report, platform);
}

if (!process.exitCode) {
  console.log("2 device QA reports passed.");
}
