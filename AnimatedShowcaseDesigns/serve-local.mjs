import { createServer } from "node:http";
import { statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const root = readRoot();
const rootPrefix = root.endsWith("/") ? root : `${root}/`;
const port = readPort();

const rewrites = new Map([
  ["/", "/index.html"],
  ["/world", "/world.html"],
  ["/thanks", "/thanks.html"]
]);

const headers = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Frame-Options": "DENY"
};

function readPort() {
  const portIndex = process.argv.indexOf("--port");
  const raw = process.env.PORT || (portIndex >= 0 ? process.argv[portIndex + 1] : "") || "8765";
  const parsed = Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(`Invalid port: ${raw}`);
  }

  return parsed;
}

function readRoot() {
  const rootIndex = process.argv.indexOf("--root");
  const raw = process.env.SERVE_ROOT || (rootIndex >= 0 ? process.argv[rootIndex + 1] : "") || ".";
  const resolved = resolve(process.cwd(), raw);
  const stat = statSync(resolved, { throwIfNoEntry: false });

  if (!stat?.isDirectory()) {
    throw new Error(`Invalid root: ${raw}`);
  }

  return resolved;
}

function contentType(pathname) {
  const ext = extname(pathname).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js" || ext === ".mjs") return "text/javascript; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".avif") return "image/avif";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".glb") return "model/gltf-binary";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  if (ext === ".xml") return "application/xml; charset=utf-8";
  return "application/octet-stream";
}

async function readPublicFile(pathname) {
  const resolvedPath = resolve(root, `.${pathname}`);

  if (resolvedPath !== root && !resolvedPath.startsWith(rootPrefix)) {
    return { status: 403, body: "Forbidden", type: "text/plain; charset=utf-8" };
  }

  try {
    return {
      status: 200,
      body: await readFile(resolvedPath),
      type: contentType(resolvedPath)
    };
  } catch {
    return {
      status: 404,
      body: await readFile(resolve(root, "./404.html")),
      type: "text/html; charset=utf-8"
    };
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", "http://127.0.0.1");
  const pathname = rewrites.get(url.pathname) || url.pathname;
  const file = await readPublicFile(pathname);

  response.writeHead(file.status, {
    ...headers,
    "Content-Type": file.type
  });
  response.end(file.body);
});

server.listen(port, "127.0.0.1", () => {
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  console.log(`Showcase local preview: http://127.0.0.1:${actualPort}/`);
  console.log(`Studio route: http://127.0.0.1:${actualPort}/world`);
});
