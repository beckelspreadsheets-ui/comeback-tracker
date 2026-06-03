const SCHEMA_VERSION = 5;
const JWKS_CACHE_MS = 5 * 60 * 1000;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const jwksCache = new Map();

export class SyncError extends Error {
  constructor(status, code, details = undefined) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const jsonResponse = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  });

export const handleSyncError = (err) => {
  if (err instanceof SyncError) {
    return jsonResponse(
      { error: err.code, ...(err.details ? { details: err.details } : {}) },
      { status: err.status }
    );
  }
  return jsonResponse({ error: 'sync-unexpected-error' }, { status: 500 });
};

const base64UrlToBytes = (value) => {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const decodeJwtPart = (value) => JSON.parse(textDecoder.decode(base64UrlToBytes(value)));

const normalizeIssuer = (value) => {
  if (!value) return '';
  const trimmed = String(value).trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
};

const audienceMatches = (aud, expected) => {
  if (Array.isArray(aud)) return aud.includes(expected);
  return aud === expected;
};

const getExpectedIssuer = (env) => {
  const issuer = normalizeIssuer(env.CF_ACCESS_TEAM_DOMAIN || env.CF_ACCESS_ISSUER);
  if (!issuer) {
    throw new SyncError(500, 'sync-access-issuer-missing');
  }
  return issuer;
};

const getJwks = async (issuer) => {
  const cached = jwksCache.get(issuer);
  if (cached && cached.expiresAt > Date.now()) return cached.keys;

  const res = await fetch(`${issuer}/cdn-cgi/access/certs`, {
    headers: { accept: 'application/json' },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(body.keys)) {
    throw new SyncError(401, 'sync-access-certs-unavailable');
  }

  jwksCache.set(issuer, {
    keys: body.keys,
    expiresAt: Date.now() + JWKS_CACHE_MS,
  });
  return body.keys;
};

export const verifyAccessJwt = async (request, env) => {
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token) throw new SyncError(401, 'sync-auth-required');

  const expectedAud = String(env.CF_ACCESS_AUD || '').trim();
  if (!expectedAud) throw new SyncError(500, 'sync-access-aud-missing');

  const parts = token.split('.');
  if (parts.length !== 3) throw new SyncError(401, 'sync-auth-invalid');

  let header;
  let payload;
  try {
    header = decodeJwtPart(parts[0]);
    payload = decodeJwtPart(parts[1]);
  } catch {
    throw new SyncError(401, 'sync-auth-invalid');
  }

  if (header.alg !== 'RS256' || !header.kid) {
    throw new SyncError(401, 'sync-auth-invalid');
  }

  const expectedIssuer = getExpectedIssuer(env);
  if (normalizeIssuer(payload.iss) !== expectedIssuer) {
    throw new SyncError(401, 'sync-auth-invalid-issuer');
  }
  if (!audienceMatches(payload.aud, expectedAud)) {
    throw new SyncError(401, 'sync-auth-invalid-audience');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && Number(payload.exp) <= now) {
    throw new SyncError(401, 'sync-auth-expired');
  }
  if (payload.nbf && Number(payload.nbf) > now) {
    throw new SyncError(401, 'sync-auth-not-active');
  }

  const keys = await getJwks(expectedIssuer);
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new SyncError(401, 'sync-auth-key-not-found');

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const verified = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    base64UrlToBytes(parts[2]),
    textEncoder.encode(`${parts[0]}.${parts[1]}`)
  );

  if (!verified) throw new SyncError(401, 'sync-auth-invalid-signature');
  return payload;
};

const validateUserId = (value) => {
  const userId = String(value || '').trim();
  if (!/^[a-z0-9_-]{1,64}$/i.test(userId)) {
    throw new SyncError(500, 'sync-users-invalid');
  }
  return userId;
};

const parseUsers = (env) => {
  let parsed;
  try {
    parsed = JSON.parse(env.SYNC_USERS_JSON || '{}');
  } catch {
    throw new SyncError(500, 'sync-users-invalid-json');
  }

  const byEmail = new Map();
  const byUserId = new Map();
  for (const [rawEmail, rawUser] of Object.entries(parsed || {})) {
    const email = rawEmail.trim().toLowerCase();
    const userId = validateUserId(rawUser?.userId);
    const displayName = String(rawUser?.displayName || userId).trim();
    const canView = Array.isArray(rawUser?.canView)
      ? rawUser.canView.map(validateUserId)
      : [userId];
    if (!canView.includes(userId)) canView.unshift(userId);

    const user = { userId, displayName, canView: [...new Set(canView)] };
    byEmail.set(email, user);
    if (!byUserId.has(userId)) byUserId.set(userId, { userId, displayName });
  }
  return { byEmail, byUserId };
};

export const requireAuth = async (request, env) => {
  const payload = await verifyAccessJwt(request, env);
  if (!env.DB) throw new SyncError(500, 'sync-db-not-bound');

  const users = parseUsers(env);
  const email = String(payload.email || '').trim().toLowerCase();
  if (!email) throw new SyncError(403, 'sync-auth-email-missing');

  const user = users.byEmail.get(email);
  if (!user) throw new SyncError(403, 'sync-user-not-allowed');
  return { email, user, users };
};

export const assertCanView = (user, userId) => {
  if (!user.canView.includes(userId)) {
    throw new SyncError(403, 'sync-profile-forbidden');
  }
};

export const assertOwnProfile = (user, userId) => {
  if (user.userId !== userId) {
    throw new SyncError(403, 'sync-profile-read-only');
  }
};

export const parseJsonBody = async (request) => {
  try {
    return await request.json();
  } catch {
    throw new SyncError(400, 'sync-invalid-json');
  }
};

export const validateState = (state) => {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new SyncError(400, 'sync-invalid-state');
  }
  if (Number(state.schemaVersion) !== SCHEMA_VERSION) {
    throw new SyncError(400, 'sync-incompatible-schema', {
      expectedSchemaVersion: SCHEMA_VERSION,
      receivedSchemaVersion: state.schemaVersion ?? null,
    });
  }
};

export const getStateRow = (env, userId) =>
  env.DB.prepare(
    `SELECT user_id, display_name, state_json, schema_version, rev, updated_at, updated_by
     FROM user_states
     WHERE user_id = ?`
  )
    .bind(userId)
    .first();

export const getVisibleProfiles = async (env, canView, usersById) => {
  if (!canView.length) return [];
  const placeholders = canView.map(() => '?').join(', ');
  const { results } = await env.DB.prepare(
    `SELECT user_id, display_name, schema_version, rev, updated_at
     FROM user_states
     WHERE user_id IN (${placeholders})`
  )
    .bind(...canView)
    .all();

  const rowsById = new Map((results || []).map((row) => [row.user_id, row]));
  return canView.map((userId) => {
    const row = rowsById.get(userId);
    const mapped = usersById.get(userId);
    return {
      userId,
      displayName: row?.display_name || mapped?.displayName || userId,
      rev: row?.rev ?? null,
      updatedAt: row?.updated_at ?? null,
      hasState: Boolean(row),
    };
  });
};

export const serializeStateRow = (row, editable) => {
  if (!row) return null;
  return {
    userId: row.user_id,
    displayName: row.display_name,
    state: JSON.parse(row.state_json),
    schemaVersion: row.schema_version,
    rev: row.rev,
    updatedAt: row.updated_at,
    editable,
  };
};
