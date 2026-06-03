import { request } from "node:https";
import { readFileSync } from "node:fs";
import { stations } from "./world-data.js";

const index = readFileSync("index.html", "utf8");
const preview = readFileSync("v3-preview.html", "utf8");

const extraUrls = [
  { label: "FormSubmit endpoint", url: "https://formsubmit.co/hello@showcase-designs.com" }
];

const checks = [];

function pass(name) {
  checks.push({ name, ok: true });
  console.log(`ok - ${name}`);
}

function fail(name, message) {
  checks.push({ name, ok: false, message });
  console.error(`not ok - ${name}: ${message}`);
}

function assert(name, condition, message = "assertion failed") {
  if (!condition) {
    fail(name, message);
    return;
  }
  pass(name);
}

function head(url) {
  return new Promise((resolve) => {
    const req = request(url, {
      method: "HEAD",
      headers: { "user-agent": "showcase-outbound-verifier/1.0" },
      timeout: 20000
    }, (res) => {
      res.resume();
      res.on("end", () => {
        resolve({
          url,
          status: res.statusCode || 0,
          headers: res.headers
        });
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error(`Timed out fetching ${url}`));
    });
    req.on("error", (error) => {
      resolve({ url, status: 0, error: error.message });
    });
    req.end();
  });
}

function isAcceptableStatus(status) {
  return (status >= 200 && status < 400) || status === 405;
}

for (const station of stations) {
  assert(`${station.displayName} static URL matches station data`, index.includes(`href="${station.liveUrl}"`) && preview.includes(`href="${station.liveUrl}"`), station.liveUrl);
  const result = await head(station.liveUrl);
  assert(`${station.displayName} live URL responds`, isAcceptableStatus(result.status), `${result.status || "ERR"} ${station.liveUrl}${result.error ? ` (${result.error})` : ""}`);
}

for (const item of extraUrls) {
  const result = await head(item.url);
  assert(`${item.label} responds`, isAcceptableStatus(result.status), `${result.status || "ERR"} ${item.url}${result.error ? ` (${result.error})` : ""}`);
}

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  process.exitCode = 1;
  console.error(`\n${failed.length} outbound checks failed.`);
} else {
  console.log(`\n${checks.length} outbound checks passed.`);
}
