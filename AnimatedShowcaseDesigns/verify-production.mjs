import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { stations } from "./world-data.js";

const origin = process.env.SHOWCASE_ORIGIN || "https://showcase-designs.com";
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

function get(path) {
  const url = new URL(path, origin);
  const request = url.protocol === "http:" ? httpRequest : httpsRequest;

  return new Promise((resolve, reject) => {
    const req = request(url, {
      headers: {
        "user-agent": "showcase-production-verifier/1.0"
      },
      timeout: 15000
    }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({
          path,
          url: url.href,
          status: res.statusCode || 0,
          headers: res.headers,
          body
        });
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error(`Timed out fetching ${url.href}`));
    });
    req.on("error", reject);
    req.end();
  });
}

function hasSecurityHeaders(response) {
  return response.headers["x-content-type-options"] === "nosniff"
    && response.headers["referrer-policy"] === "strict-origin-when-cross-origin"
    && response.headers["x-frame-options"] === "DENY"
    && String(response.headers["permissions-policy"] || "").includes("camera=()");
}

const [
  home,
  homeLite,
  world,
  worldLite,
  worldJs,
  worldLayout,
  worldCss,
  worldData,
  thanks,
  missing,
  robots,
  sitemap,
  favicon,
  ogImage
] = await Promise.all([
  get("/"),
  get("/?lite=1"),
  get("/world"),
  get("/world?lite=1"),
  get("/world.js"),
  get("/world-layout.js"),
  get("/world.css"),
  get("/world-data.js"),
  get("/thanks"),
  get("/not-a-real-page"),
  get("/robots.txt"),
  get("/sitemap.xml"),
  get("/favicon.svg"),
  get("/og-image.png")
]);

const renderedPlateAssets = await Promise.all([
  get("/img/world/gallery-room/gallery-room-master-desktop-empty.webp"),
  get("/img/world/gallery-room/gallery-room-master-mobile-empty.jpg"),
  get("/img/world/gallery-room/station-inspect-plate-empty.webp"),
  get("/img/world/gallery-room/traileranimated12-poster.jpg")
]);
const stationTextures = await Promise.all(stations.map((station) => get(station.screenshotUrl)));

assert("home returns 200", home.status === 200, `${home.status} ${home.url}`);
assert("home serves current static page", home.body.includes("Explore the studio") && home.body.includes("case-study-evenpath") && home.body.includes("js-world-link"));
assert("home excludes Three payload", !/(three\.module|threejs|three\.js|unpkg\.com\/three)/i.test(home.body));
assert("home has security headers", hasSecurityHeaders(home));

assert("home lite route returns 200", homeLite.status === 200, `${homeLite.status} ${homeLite.url}`);
assert("home lite route serves current static page", homeLite.body.includes("Explore the studio") && homeLite.body.includes("case-study-evenpath") && homeLite.body.includes("js-world-link"));
assert("home lite route excludes Three payload", !/(three\.module|threejs|three\.js|unpkg\.com\/three)/i.test(homeLite.body));
assert("home lite route has security headers", hasSecurityHeaders(homeLite));

assert("world returns 200", world.status === 200, `${world.status} ${world.url}`);
assert("world serves rendered plate gallery shell", world.body.includes("Client website stations") && world.body.includes("renderedWorld") && world.body.includes("world.js") && world.body.includes("world-layout.js"));
assert("world remains noindexed", world.body.includes('content="noindex,follow"'));
assert("world has security headers", hasSecurityHeaders(world));

assert("world lite route returns 200", worldLite.status === 200, `${worldLite.status} ${worldLite.url}`);
assert("world lite route has security headers", hasSecurityHeaders(worldLite));
assert("world script returns 200", worldJs.status === 200, `${worldJs.status} ${worldJs.url}`);
assert("world script is JavaScript", String(worldJs.headers["content-type"] || "").includes("javascript"));
assert("world script has security headers", hasSecurityHeaders(worldJs));
assert("world script contains lite redirect", worldJs.body.includes('params.get("lite") === "1"') && worldJs.body.includes("setModePreference(null)") && worldJs.body.includes("window.location.replace"));
assert("world script imports station data", worldJs.body.includes('from "./world-data.js'));
assert("world script uses rendered plate layout", worldJs.body.includes('from "./world-layout.js') && worldJs.body.includes("renderRoomScreens") && !/three\.module|THREE_URL|WebGLRenderer/.test(worldJs.body));

assert("world layout returns 200", worldLayout.status === 200, `${worldLayout.status} ${worldLayout.url}`);
assert("world layout is JavaScript", String(worldLayout.headers["content-type"] || "").includes("javascript"));
assert("world layout contains rendered plate coordinates", worldLayout.body.includes("roomLayout") && worldLayout.body.includes("gallery-room-master-desktop-empty.webp") && worldLayout.body.includes("station-inspect-plate-empty.webp"));
assert("world layout has security headers", hasSecurityHeaders(worldLayout));

assert("world stylesheet returns 200", worldCss.status === 200, `${worldCss.status} ${worldCss.url}`);
assert("world stylesheet is CSS", String(worldCss.headers["content-type"] || "").includes("text/css"));
assert("world stylesheet contains panel styles", worldCss.body.includes(".station-panel") && worldCss.body.includes(".station-panel.is-compact"));
assert("world stylesheet contains rendered plate styles", worldCss.body.includes(".rendered-world") && worldCss.body.includes(".screen-target") && !worldCss.body.includes("photo-match-room-plate.webp"));
assert("world stylesheet has security headers", hasSecurityHeaders(worldCss));

assert("world data returns 200", worldData.status === 200, `${worldData.status} ${worldData.url}`);
assert("world data is JavaScript", String(worldData.headers["content-type"] || "").includes("javascript"));
assert("world data contains stations", worldData.body.includes("export const stations") && stations.every((station) => worldData.body.includes(station.screenshotUrl)));
assert("world data has security headers", hasSecurityHeaders(worldData));

assert("thanks returns 200", thanks.status === 200, `${thanks.status} ${thanks.url}`);
assert("thanks serves confirmation page", thanks.body.includes("Message received") && thanks.body.includes("Back to home"));
assert("thanks remains noindexed", thanks.body.includes('content="noindex,follow"'));
assert("thanks has security headers", hasSecurityHeaders(thanks));

assert("missing route returns 404", missing.status === 404, `${missing.status} ${missing.url}`);
assert("missing route serves branded 404", missing.body.includes("That page is not in the Showcase Designs build") && missing.body.includes("Back to home"));
assert("missing route remains noindexed", missing.body.includes('content="noindex,follow"'));
assert("missing route has security headers", hasSecurityHeaders(missing));

assert("robots returns 200", robots.status === 200, `${robots.status} ${robots.url}`);
assert("robots points at sitemap", robots.body.includes("Sitemap: https://showcase-designs.com/sitemap.xml"));
assert("robots has security headers", hasSecurityHeaders(robots));

assert("sitemap returns 200", sitemap.status === 200, `${sitemap.status} ${sitemap.url}`);
assert("sitemap includes canonical home only", sitemap.body.includes("<loc>https://showcase-designs.com/</loc>") && !sitemap.body.includes("/world"));
assert("sitemap has security headers", hasSecurityHeaders(sitemap));

assert("favicon returns 200", favicon.status === 200, `${favicon.status} ${favicon.url}`);
assert("favicon is SVG", String(favicon.headers["content-type"] || "").includes("image/svg+xml") || favicon.body.includes("<svg"));
assert("favicon has security headers", hasSecurityHeaders(favicon));

assert("Open Graph image returns 200", ogImage.status === 200, `${ogImage.status} ${ogImage.url}`);
assert("Open Graph image is PNG", String(ogImage.headers["content-type"] || "").includes("image/png"));
assert("Open Graph image has security headers", hasSecurityHeaders(ogImage));

renderedPlateAssets.forEach((asset) => {
  assert(`rendered plate asset returns 200 ${asset.path}`, asset.status === 200, `${asset.status} ${asset.url}`);
  assert(`rendered plate asset has expected media type ${asset.path}`, /image\/(webp|jpeg)/.test(String(asset.headers["content-type"] || "")), String(asset.headers["content-type"] || ""));
  assert(`rendered plate asset has security headers ${asset.path}`, hasSecurityHeaders(asset));
});

stationTextures.forEach((texture, index) => {
  const station = stations[index];
  assert(`${station.displayName} texture returns 200`, texture.status === 200, `${texture.status} ${texture.url}`);
  assert(`${station.displayName} texture is JPEG`, String(texture.headers["content-type"] || "").includes("image/jpeg"));
  assert(`${station.displayName} texture has security headers`, hasSecurityHeaders(texture));
});

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  process.exitCode = 1;
  console.error(`\n${failed.length} production checks failed for ${origin}.`);
} else {
  console.log(`\n${checks.length} production checks passed for ${origin}.`);
}
