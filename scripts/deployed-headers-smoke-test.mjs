import { execFileSync } from 'node:child_process';
import { createServer as createHttpServer } from 'node:http';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer as createNetServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
let port = Number(process.env.DEPLOYED_HEADERS_SMOKE_PORT || 5231);
const suppliedUrl = process.env.DEPLOYED_HEADERS_SMOKE_URL?.trim() || '';
const target = process.env.DEPLOYED_HEADERS_SMOKE_TARGET || (suppliedUrl ? 'external-url' : 'local-cloudflare-header-simulation');
let baseUrl = suppliedUrl ? suppliedUrl.replace(/\/+$/, '') : `http://127.0.0.1:${port}`;
const shouldCleanArtifacts = !process.env.DEPLOYED_HEADERS_SMOKE_ARTIFACT_DIR;
const artifactsDir = process.env.DEPLOYED_HEADERS_SMOKE_ARTIFACT_DIR
  ? path.resolve(root, process.env.DEPLOYED_HEADERS_SMOKE_ARTIFACT_DIR)
  : path.join(root, 'tmp', 'deployed-headers-smoke-test');
const distDir = path.join(root, 'dist');
const distIndexPath = path.join(distDir, 'index.html');
const publicHeadersPath = path.join(root, 'public', '_headers');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const fail = (message, detail = {}) => {
  const error = new Error(message);
  error.detail = detail;
  throw error;
};

const getGitMetadata = () => {
  try {
    return {
      branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim() || null,
      commit: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() || null,
      dirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()),
    };
  } catch {
    return { branch: null, commit: null, dirty: null };
  }
};

const parseHeaders = (source) => {
  const routes = {};
  let currentRoute = null;
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(rawLine)) {
      currentRoute = line.trim();
      routes[currentRoute] = routes[currentRoute] || {};
      continue;
    }
    if (!currentRoute) continue;
    const [name, ...rest] = line.trim().split(':');
    if (!name || !rest.length) continue;
    routes[currentRoute][name.toLowerCase()] = rest.join(':').trim();
  }
  return routes;
};

const headerSetForPath = (routes, pathname) => {
  const headers = { ...(routes['/*'] || {}) };
  for (const [routeName, routeHeaders] of Object.entries(routes)) {
    if (routeName === '/*') continue;
    if (routeName.endsWith('/*')) {
      const prefix = routeName.slice(0, -1);
      if (pathname.startsWith(prefix)) Object.assign(headers, routeHeaders);
      continue;
    }
    if (pathname === routeName) Object.assign(headers, routeHeaders);
  }
  return headers;
};

const canListenOnPort = (candidatePort) =>
  new Promise((resolve) => {
    const probe = createNetServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => {
      probe.close(() => resolve(true));
    });
    probe.listen(candidatePort, '127.0.0.1');
  });

const resolveLocalPort = async () => {
  if (process.env.DEPLOYED_HEADERS_SMOKE_PORT) {
    if (!(await canListenOnPort(port))) fail('Requested DEPLOYED_HEADERS_SMOKE_PORT is already in use', { port });
    return port;
  }
  for (let candidatePort = port; candidatePort < port + 50; candidatePort += 1) {
    if (await canListenOnPort(candidatePort)) return candidatePort;
  }
  fail('No available local deployed-header smoke port found', { startPort: port });
};

const ensureDist = async () => {
  for (const filePath of [distIndexPath, publicHeadersPath]) {
    await access(filePath).catch(() => {
      fail('Required header smoke artifact is missing; run npm run build first', { filePath });
    });
  }
};

const startHeaderSimulationServer = async () => {
  const routes = parseHeaders(await readFile(publicHeadersPath, 'utf8'));
  const server = createHttpServer(async (request, response) => {
    const requestUrl = new URL(request.url || '/', baseUrl);
    const requestPathname = decodeURIComponent(requestUrl.pathname);
    let filePath = path.normalize(path.join(distDir, requestPathname === '/' ? '/index.html' : requestPathname));
    if (!filePath.startsWith(distDir)) filePath = distIndexPath;
    let body;
    try {
      body = await readFile(filePath);
    } catch {
      filePath = distIndexPath;
      body = await readFile(filePath);
    }
    const headers = {
      'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
      ...headerSetForPath(routes, requestPathname),
    };
    response.writeHead(200, headers);
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    response.end(body);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return server;
};

const waitForServer = async (url, timeoutMs = 30000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  fail('Header smoke target did not become ready', { url });
};

const normalizeUrl = (route) => {
  if (route.startsWith('http')) return route;
  return `${baseUrl}${route.startsWith('/') ? route : `/${route}`}`;
};

const selectedHeaders = (headers) => {
  const names = [
    'cache-control',
    'content-security-policy',
    'content-type',
    'permissions-policy',
    'referrer-policy',
    'x-content-type-options',
    'x-frame-options',
  ];
  const result = {};
  for (const name of names) {
    const value = headers.get(name);
    if (value) result[name] = value;
  }
  return result;
};

const fetchProbe = async (label, route) => {
  const url = normalizeUrl(route);
  const response = await fetch(url, { redirect: 'follow' });
  const body = await response.text();
  if (!response.ok) fail('Header smoke fetch failed', { label, status: response.status, url });
  return {
    bodySnippet: body.slice(0, 5000),
    headers: selectedHeaders(response.headers),
    label,
    status: response.status,
    url,
  };
};

const assetPathFromHtml = (html) => {
  const match = html.match(/(?:src|href)="([^"]*\/assets\/[^"]+\.(?:js|css))"/);
  return match?.[1] || null;
};

const expectedChecks = async ({ assetPath }) => {
  const expected = parseHeaders(await readFile(publicHeadersPath, 'utf8'));
  const root = await fetchProbe('root headers', '/');
  const manifest = await fetchProbe('manifest headers', '/manifest.webmanifest');
  const serviceWorker = await fetchProbe('service worker headers', '/sw.js');
  const registerWorker = await fetchProbe('register service worker headers', '/registerSW.js');
  const asset = assetPath ? await fetchProbe('hashed asset headers', assetPath) : null;
  const checks = [
    ['root content-security-policy', root.headers['content-security-policy'], expected['/*']?.['content-security-policy']],
    ['root permissions-policy', root.headers['permissions-policy'], expected['/*']?.['permissions-policy']],
    ['root referrer-policy', root.headers['referrer-policy'], expected['/*']?.['referrer-policy']],
    ['root x-content-type-options', root.headers['x-content-type-options'], expected['/*']?.['x-content-type-options']],
    ['root x-frame-options', root.headers['x-frame-options'], expected['/*']?.['x-frame-options']],
    ['manifest cache-control', manifest.headers['cache-control'], expected['/manifest.webmanifest']?.['cache-control']],
    ['service worker cache-control', serviceWorker.headers['cache-control'], expected['/sw.js']?.['cache-control']],
    ['register service worker cache-control', registerWorker.headers['cache-control'], expected['/registerSW.js']?.['cache-control']],
  ];
  if (asset) checks.push(['asset cache-control', asset.headers['cache-control'], expected['/assets/*']?.['cache-control']]);
  const failures = checks
    .filter(([, actual, expectedValue]) => actual !== expectedValue)
    .map(([label, actual, expectedValue]) => ({ actual: actual || null, expected: expectedValue || null, label }));
  if (failures.length) fail('Response headers do not match public/_headers policy', { failures });
  return {
    asset,
    checks: checks.map(([label, actual, expectedValue]) => ({ actual, expected: expectedValue, label })),
    manifest,
    registerWorker,
    root,
    serviceWorker,
  };
};

const run = async () => {
  if (shouldCleanArtifacts) await rm(artifactsDir, { force: true, recursive: true });
  await mkdir(artifactsDir, { recursive: true });
  await ensureDist();
  if (!suppliedUrl) {
    port = await resolveLocalPort();
    baseUrl = `http://127.0.0.1:${port}`;
  }

  let server = null;
  try {
    if (!suppliedUrl) server = await startHeaderSimulationServer();
    await waitForServer(baseUrl);
    const rootProbe = await fetchProbe('app root', '/');
    const assetPath = assetPathFromHtml(rootProbe.bodySnippet);
    const responseHeaders = await expectedChecks({ assetPath });
    const summary = {
      artifactsDir,
      baseUrl,
      capturedAt: new Date().toISOString(),
      gateStatus: suppliedUrl
        ? 'deployed-response-headers-pass-needs-release-signoff'
        : 'local-cloudflare-header-simulation-pass-not-deployed-evidence',
      git: getGitMetadata(),
      mode: target,
      note: suppliedUrl
        ? 'This checks a supplied URL response against public/_headers; release owner still needs to attach the URL/deployment evidence to the release record.'
        : 'This proves header policy and smoke harness behavior with a local Cloudflare-style _headers simulation. It is not preview or production deployed evidence.',
      responseHeaders,
      unresolved: suppliedUrl
        ? ['Release-owner deployment record and sign-off are still required.']
        : ['Preview or production URL deployed response-header evidence is still required.'],
    };
    await writeFile(path.join(artifactsDir, 'deployed-headers-smoke-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
  }
};

run().catch((error) => {
  console.error(error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  process.exit(1);
});
