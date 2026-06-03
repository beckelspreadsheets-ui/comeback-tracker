import { randomUUID, webcrypto } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { onRequestGet as fatSecretItemGet } from '../functions/api/fatsecret/item.js';
import { onRequestGet as fatSecretSearchGet } from '../functions/api/fatsecret/search.js';
import { onRequestGet as syncBackupsGet } from '../functions/api/sync/backups.js';
import { onRequestPost as syncBackupRestorePost } from '../functions/api/sync/backups/[id]/restore.js';
import { onRequestGet as syncMeGet } from '../functions/api/sync/me.js';
import {
  onRequestGet as syncStateGet,
  onRequestPut as syncStatePut,
} from '../functions/api/sync/state.js';
import { makeDefaultState, SCHEMA_VERSION } from '../src/hooks/usePersistedState.js';

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}
if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = randomUUID;
}
if (!globalThis.atob) {
  globalThis.atob = (value) => Buffer.from(value, 'base64').toString('binary');
}
if (!globalThis.btoa) {
  globalThis.btoa = (value) => Buffer.from(value, 'binary').toString('base64');
}

const issuer = 'https://access.example.test';
const audience = 'comeback-smoke-aud';
const keyId = 'comeback-smoke-key';
const textEncoder = new TextEncoder();
const deployedBaseUrl = process.env.API_DATA_SMOKE_URL?.trim().replace(/\/+$/, '') || '';
const deployedTarget = process.env.API_DATA_SMOKE_TARGET?.trim() || (deployedBaseUrl ? 'external-url' : 'local-mock');
const deployedJwt = process.env.API_DATA_SMOKE_JWT?.trim() || '';
const deployedUserId = process.env.API_DATA_SMOKE_USER_ID?.trim() || '';
const deployedFatSecretQuery = process.env.API_DATA_SMOKE_FATSECRET_LIVE_QUERY?.trim() || '';
const artifactsDir = process.env.API_DATA_SMOKE_ARTIFACT_DIR
  ? path.resolve(process.cwd(), process.env.API_DATA_SMOKE_ARTIFACT_DIR)
  : '';

const fail = (message, detail = {}) => {
  const error = new Error(message);
  error.detail = detail;
  throw error;
};

const assert = (condition, message, detail = {}) => {
  if (!condition) fail(message, detail);
};

const json = async (response) => ({
  body: await response.json(),
  cacheControl: response.headers.get('cache-control') || '',
  contentType: response.headers.get('content-type') || '',
  status: response.status,
});

const selectedHeaders = (headers) => {
  const result = {};
  for (const key of ['cache-control', 'cf-cache-status', 'content-type', 'server', 'x-content-type-options']) {
    const value = headers.get(key);
    if (value) result[key] = value;
  }
  return result;
};

const readResponseBody = async (response) => {
  const text = await response.text().catch(() => '');
  try {
    return { json: JSON.parse(text), textSnippet: text.slice(0, 5000) };
  } catch {
    return { json: null, textSnippet: text.slice(0, 5000) };
  }
};

const fetchDeployedProbe = async (label, route, { authorization = '', expectJson = false } = {}) => {
  const url = `${deployedBaseUrl}${route}`;
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      ...(authorization ? { 'cf-access-jwt-assertion': authorization } : {}),
    },
    redirect: 'manual',
  });
  const body = await readResponseBody(response);
  return {
    bodyJson: body.json,
    bodyTextSnippet: expectJson || !body.json ? body.textSnippet : '',
    headers: selectedHeaders(response.headers),
    label,
    ok: response.ok,
    status: response.status,
    url,
  };
};

const assertNoSecretLeak = (label, value) => {
  const serialized = JSON.stringify(value);
  const forbidden = [
    process.env.FATSECRET_CLIENT_SECRET,
    process.env.API_DATA_SMOKE_JWT,
    process.env.CF_ACCESS_AUD,
  ].filter(Boolean);
  const leaked = forbidden.filter((secret) => secret && serialized.includes(secret));
  assert(!leaked.length, 'Deployed API smoke response leaked a configured secret value', {
    label,
    leakedCount: leaked.length,
  });
};

const base64UrlJson = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const base64UrlBytes = (value) => Buffer.from(value).toString('base64url');

const createJwtSigner = async () => {
  const keyPair = await crypto.subtle.generateKey(
    {
      hash: 'SHA-256',
      modulusLength: 2048,
      name: 'RSASSA-PKCS1-v1_5',
      publicExponent: new Uint8Array([1, 0, 1]),
    },
    true,
    ['sign', 'verify']
  );
  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const jwk = {
    ...publicJwk,
    alg: 'RS256',
    kid: keyId,
    use: 'sig',
  };

  const sign = async (email, overrides = {}) => {
    const now = Math.floor(Date.now() / 1000);
    const header = base64UrlJson({ alg: 'RS256', kid: keyId, typ: 'JWT' });
    const payload = base64UrlJson({
      aud: audience,
      email,
      exp: now + 300,
      iat: now,
      iss: issuer,
      nbf: now - 10,
      sub: email,
      ...overrides,
    });
    const input = `${header}.${payload}`;
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      keyPair.privateKey,
      textEncoder.encode(input)
    );
    return `${input}.${base64UrlBytes(new Uint8Array(signature))}`;
  };

  return { jwk, sign };
};

class MockStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql.replace(/\s+/g, ' ').trim();
    this.args = [];
  }

  bind(...args) {
    this.args = args;
    return this;
  }

  async first() {
    if (this.sql.includes('FROM state_backups') && this.sql.includes('WHERE id = ? AND user_id = ?')) {
      const [id, userId] = this.args;
      return this.db.backupRows.find((row) => row.id === id && row.user_id === userId) || null;
    }
    if (this.sql.includes('FROM user_states') && this.sql.includes('WHERE user_id = ?')) {
      return this.db.stateRows.get(this.args[0]) || null;
    }
    fail('Unhandled D1 first SQL', { sql: this.sql, args: this.args });
  }

  async all() {
    if (this.sql.includes('FROM user_states') && this.sql.includes('WHERE user_id IN')) {
      return {
        results: this.args.map((userId) => this.db.stateRows.get(userId)).filter(Boolean),
      };
    }
    if (this.sql.includes('FROM state_backups') && this.sql.includes('WHERE user_id = ?')) {
      const userId = this.args[0];
      return {
        results: this.db.backupRows
          .filter((row) => row.user_id === userId)
          .sort((a, b) => Number(b.created_at) - Number(a.created_at))
          .slice(0, 50),
      };
    }
    fail('Unhandled D1 all SQL', { sql: this.sql, args: this.args });
  }

  async run() {
    if (this.sql.startsWith('INSERT INTO user_states')) {
      const [userId, displayName, stateJson, schemaVersion, updatedAt, updatedBy] = this.args;
      if (this.db.stateRows.has(userId)) throw new Error('UNIQUE constraint failed: user_states.user_id');
      this.db.stateRows.set(userId, {
        display_name: displayName,
        rev: 1,
        schema_version: schemaVersion,
        state_json: stateJson,
        updated_at: updatedAt,
        updated_by: updatedBy,
        user_id: userId,
      });
      return { meta: { changes: 1 } };
    }

    if (this.sql.startsWith('INSERT INTO state_backups')) {
      const [id, userId, rev, stateJson, schemaVersion, createdAt, createdBy] = this.args;
      this.db.backupRows.push({
        created_at: createdAt,
        created_by: createdBy,
        id,
        rev,
        schema_version: schemaVersion,
        state_json: stateJson,
        user_id: userId,
      });
      return { meta: { changes: 1 } };
    }

    if (this.sql.startsWith('UPDATE user_states')) {
      const [displayName, stateJson, schemaVersion, nextRev, updatedAt, updatedBy, userId, expectedRev] = this.args;
      const current = this.db.stateRows.get(userId);
      if (!current || Number(current.rev) !== Number(expectedRev)) {
        return { meta: { changes: 0 } };
      }
      this.db.stateRows.set(userId, {
        ...current,
        display_name: displayName,
        rev: nextRev,
        schema_version: schemaVersion,
        state_json: stateJson,
        updated_at: updatedAt,
        updated_by: updatedBy,
      });
      return { meta: { changes: 1 } };
    }

    if (this.sql.startsWith('DELETE FROM state_backups')) {
      const before = this.db.backupRows.length;
      this.db.backupRows = this.db.backupRows.filter((row) => row.id !== this.args[0]);
      return { meta: { changes: before - this.db.backupRows.length } };
    }

    fail('Unhandled D1 run SQL', { sql: this.sql, args: this.args });
  }
}

class MockD1 {
  constructor() {
    this.stateRows = new Map();
    this.backupRows = [];
  }

  prepare(sql) {
    return new MockStatement(this, sql);
  }

  async batch(statements) {
    const results = [];
    for (const statement of statements) {
      results.push(await statement.run());
    }
    return results;
  }
}

const readRequestBody = async (body) => {
  if (!body) return '';
  if (typeof body === 'string') return body;
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof ArrayBuffer) return Buffer.from(body).toString('utf8');
  return String(body);
};

const installFetchMock = ({ jwk }) => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  let fatSecretMode = 'success';

  globalThis.fetch = async (url, init = {}) => {
    const href = String(url);
    calls.push({
      authorization: init.headers?.authorization || init.headers?.Authorization || '',
      body: await readRequestBody(init.body),
      method: init.method || 'GET',
      url: href,
    });

    if (href === `${issuer}/cdn-cgi/access/certs`) {
      return new Response(JSON.stringify({ keys: [jwk] }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    }

    if (href === 'https://oauth.fatsecret.com/connect/token') {
      if (fatSecretMode === 'token-error') {
        return new Response(JSON.stringify({ error: 'invalid_client' }), { status: 401 });
      }
      return new Response(JSON.stringify({ access_token: 'fatsecret-smoke-token', expires_in: 3600 }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    }

    if (href === 'https://platform.fatsecret.com/rest/server.api') {
      const params = new URLSearchParams(await readRequestBody(init.body));
      if (fatSecretMode === 'api-error') {
        return new Response(JSON.stringify({ error: { code: 14, message: 'auth failed' } }), {
          headers: { 'content-type': 'application/json' },
          status: 200,
        });
      }
      if (params.get('method') === 'food.get') {
        return new Response(
          JSON.stringify({
            food: {
              food_id: params.get('food_id'),
              food_name: 'Smoke Test Banana',
              servings: { serving: [{ calories: '105', metric_serving_amount: '118' }] },
            },
          }),
          { headers: { 'content-type': 'application/json' }, status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          foods: {
            food: [
              {
                food_description: 'Per 100g - Calories: 89kcal',
                food_id: 'banana-1',
                food_name: 'Banana smoke result',
              },
            ],
          },
        }),
        { headers: { 'content-type': 'application/json' }, status: 200 }
      );
    }

    return originalFetch(url, init);
  };

  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
    setFatSecretMode: (mode) => {
      fatSecretMode = mode;
    },
  };
};

const syncEnv = (DB) => ({
  CF_ACCESS_AUD: audience,
  CF_ACCESS_TEAM_DOMAIN: issuer,
  DB,
  SYNC_USERS_JSON: JSON.stringify({
    'alex@example.test': {
      canView: ['alex'],
      displayName: 'Alex Smoke',
      userId: 'alex',
    },
    'andrew@example.test': {
      canView: ['andrew', 'alex'],
      displayName: 'Andrew Smoke',
      userId: 'andrew',
    },
  }),
});

const requestWithJwt = async (url, sign, { body, email = 'andrew@example.test', method = 'GET' } = {}) =>
  new Request(url, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      'cf-access-jwt-assertion': await sign(email),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    method,
  });

const runSyncSmoke = async (sign) => {
  const DB = new MockD1();
  const env = syncEnv(DB);
  const validState = makeDefaultState();
  assert(validState.schemaVersion === SCHEMA_VERSION, 'Smoke state schema mismatch', {
    expected: SCHEMA_VERSION,
    received: validState.schemaVersion,
  });

  DB.stateRows.set('alex', {
    display_name: 'Alex Smoke',
    rev: 7,
    schema_version: SCHEMA_VERSION,
    state_json: JSON.stringify({ ...makeDefaultState(), currentWeek: 3 }),
    updated_at: 1_779_500_000_000,
    updated_by: 'alex',
    user_id: 'alex',
  });

  const missingAuth = await json(
    await syncMeGet({ env, request: new Request('https://app.example.test/api/sync/me') })
  );
  assert(missingAuth.status === 401 && missingAuth.body.error === 'sync-auth-required', 'Missing auth was not safe');

  const me = await json(
    await syncMeGet({
      env,
      request: await requestWithJwt('https://app.example.test/api/sync/me', sign),
    })
  );
  assert(me.status === 200, 'Sync /me failed', me);
  assert(me.cacheControl === 'no-store', 'Sync /me did not disable caching', me);
  assert(me.body.user.userId === 'andrew', 'Sync /me returned wrong user', me.body);
  assert(me.body.profiles.some((profile) => profile.userId === 'alex' && profile.hasState), 'Visible profile missing', me.body);

  const emptyOwn = await json(
    await syncStateGet({
      env,
      request: await requestWithJwt('https://app.example.test/api/sync/state?userId=andrew', sign),
    })
  );
  assert(emptyOwn.status === 200 && emptyOwn.body.state === null && emptyOwn.body.editable === true, 'Empty own state failed', emptyOwn);

  const readonly = await json(
    await syncStateGet({
      env,
      request: await requestWithJwt('https://app.example.test/api/sync/state?userId=alex', sign),
    })
  );
  assert(readonly.status === 200 && readonly.body.editable === false && readonly.body.rev === 7, 'Read-only visible state failed', readonly);

  const forbidden = await json(
    await syncStateGet({
      env,
      request: await requestWithJwt('https://app.example.test/api/sync/state?userId=unknown', sign),
    })
  );
  assert(forbidden.status === 403 && forbidden.body.error === 'sync-profile-forbidden', 'Forbidden profile did not fail safely', forbidden);

  const invalidSchema = await json(
    await syncStatePut({
      env,
      request: await requestWithJwt('https://app.example.test/api/sync/state', sign, {
        body: { state: { ...validState, schemaVersion: SCHEMA_VERSION - 1 } },
        method: 'PUT',
      }),
    })
  );
  assert(
    invalidSchema.status === 400 &&
      invalidSchema.body.error === 'sync-incompatible-schema' &&
      invalidSchema.body.details.expectedSchemaVersion === SCHEMA_VERSION,
    'Invalid schema did not fail safely',
    invalidSchema
  );

  const created = await json(
    await syncStatePut({
      env,
      request: await requestWithJwt('https://app.example.test/api/sync/state', sign, {
        body: { baseRev: null, state: validState },
        method: 'PUT',
      }),
    })
  );
  assert(created.status === 200 && created.body.rev === 1 && created.body.schemaVersion === SCHEMA_VERSION, 'Initial state PUT failed', created);

  const conflict = await json(
    await syncStatePut({
      env,
      request: await requestWithJwt('https://app.example.test/api/sync/state', sign, {
        body: { baseRev: 0, state: { ...validState, currentWeek: 2 } },
        method: 'PUT',
      }),
    })
  );
  assert(conflict.status === 409 && conflict.body.error === 'sync-conflict', 'Conflict did not fail safely', conflict);
  assert(!JSON.stringify(conflict.body).includes('state_json'), 'Conflict leaked raw state', conflict.body);

  const updated = await json(
    await syncStatePut({
      env,
      request: await requestWithJwt('https://app.example.test/api/sync/state', sign, {
        body: { baseRev: 1, state: { ...validState, currentWeek: 2 } },
        method: 'PUT',
      }),
    })
  );
  assert(updated.status === 200 && updated.body.rev === 2, 'State update failed', updated);

  const readBack = await json(
    await syncStateGet({
      env,
      request: await requestWithJwt('https://app.example.test/api/sync/state?userId=andrew', sign),
    })
  );
  assert(
    readBack.status === 200 &&
      readBack.body.state.currentWeek === 2 &&
      readBack.body.state.schemaVersion === SCHEMA_VERSION &&
      readBack.body.editable === true,
    'State readback failed',
    readBack
  );

  const backups = await json(
    await syncBackupsGet({
      env,
      request: await requestWithJwt('https://app.example.test/api/sync/backups?userId=andrew', sign),
    })
  );
  assert(backups.status === 200 && backups.body.backups.length === 1, 'Backup listing failed', backups);
  assert(backups.body.backups[0].rev === 1, 'Backup rev mismatch', backups);
  assert(!JSON.stringify(backups.body).includes('state_json'), 'Backup listing leaked raw state', backups.body);

  const staleRestore = await json(
    await syncBackupRestorePost({
      env,
      params: { id: backups.body.backups[0].id },
      request: await requestWithJwt(
        `https://app.example.test/api/sync/backups/${backups.body.backups[0].id}/restore`,
        sign,
        {
          body: { baseRev: 1 },
          method: 'POST',
        }
      ),
    })
  );
  assert(staleRestore.status === 409 && staleRestore.body.error === 'sync-conflict', 'Stale backup restore did not conflict safely', staleRestore);

  const restored = await json(
    await syncBackupRestorePost({
      env,
      params: { id: backups.body.backups[0].id },
      request: await requestWithJwt(
        `https://app.example.test/api/sync/backups/${backups.body.backups[0].id}/restore`,
        sign,
        {
          body: { baseRev: 2 },
          method: 'POST',
        }
      ),
    })
  );
  assert(
    restored.status === 200 &&
      restored.body.rev === 3 &&
      restored.body.restoredFrom.id === backups.body.backups[0].id &&
      restored.body.restoredFrom.rev === 1 &&
      restored.body.safetyBackup.rev === 2,
    'Backup restore did not create expected restored revision and safety backup',
    restored
  );
  assert(!JSON.stringify(restored.body).includes('state_json'), 'Backup restore leaked raw state', restored.body);

  const restoredReadBack = await json(
    await syncStateGet({
      env,
      request: await requestWithJwt('https://app.example.test/api/sync/state?userId=andrew', sign),
    })
  );
  assert(
    restoredReadBack.status === 200 &&
      restoredReadBack.body.rev === 3 &&
      restoredReadBack.body.state.currentWeek === validState.currentWeek &&
      restoredReadBack.body.state.schemaVersion === SCHEMA_VERSION,
    'Restored backup state did not read back safely',
    restoredReadBack
  );

  const backupsAfterRestore = await json(
    await syncBackupsGet({
      env,
      request: await requestWithJwt('https://app.example.test/api/sync/backups?userId=andrew', sign),
    })
  );
  assert(
    backupsAfterRestore.status === 200 &&
      backupsAfterRestore.body.backups.length === 2 &&
      backupsAfterRestore.body.backups.some((backup) => backup.rev === 2) &&
      backupsAfterRestore.body.backups.some((backup) => backup.rev === 1),
    'Backups after restore did not include restore safety backup',
    backupsAfterRestore
  );
  assert(!JSON.stringify(backupsAfterRestore.body).includes('state_json'), 'Post-restore backup listing leaked raw state', backupsAfterRestore.body);

  DB.backupRows.push({
    created_at: 1_779_500_000_001,
    created_by: 'alex',
    id: 'alex-backup-smoke',
    rev: 6,
    schema_version: SCHEMA_VERSION,
    state_json: JSON.stringify({ ...makeDefaultState(), currentWeek: 4 }),
    user_id: 'alex',
  });
  const otherUserRestore = await json(
    await syncBackupRestorePost({
      env,
      params: { id: 'alex-backup-smoke' },
      request: await requestWithJwt('https://app.example.test/api/sync/backups/alex-backup-smoke/restore', sign, {
        body: { baseRev: 3 },
        method: 'POST',
      }),
    })
  );
  assert(
    otherUserRestore.status === 404 && otherUserRestore.body.error === 'sync-backup-not-found',
    'Other-user backup restore did not hide backup existence safely',
    otherUserRestore
  );

  DB.backupRows.push({
    created_at: 1_779_500_000_002,
    created_by: 'andrew',
    id: 'old-schema-backup-smoke',
    rev: 2,
    schema_version: SCHEMA_VERSION - 1,
    state_json: JSON.stringify({ ...makeDefaultState(), schemaVersion: SCHEMA_VERSION - 1 }),
    user_id: 'andrew',
  });
  const oldSchemaRestore = await json(
    await syncBackupRestorePost({
      env,
      params: { id: 'old-schema-backup-smoke' },
      request: await requestWithJwt('https://app.example.test/api/sync/backups/old-schema-backup-smoke/restore', sign, {
        body: { baseRev: 3 },
        method: 'POST',
      }),
    })
  );
  assert(
    oldSchemaRestore.status === 400 &&
      oldSchemaRestore.body.error === 'sync-incompatible-schema' &&
      oldSchemaRestore.body.details.expectedSchemaVersion === SCHEMA_VERSION,
    'Old-schema backup restore did not fail safely',
    oldSchemaRestore
  );

  const readonlyBackup = await json(
    await syncBackupsGet({
      env,
      request: await requestWithJwt('https://app.example.test/api/sync/backups?userId=alex', sign),
    })
  );
  assert(readonlyBackup.status === 403 && readonlyBackup.body.error === 'sync-profile-read-only', 'Read-only backup access did not fail safely', readonlyBackup);

  return {
    backupCount: backups.body.backups.length,
    backupCountAfterRestore: backupsAfterRestore.body.backups.length,
    conflictStatus: conflict.status,
    createdRev: created.body.rev,
    invalidSchemaStatus: invalidSchema.status,
    oldSchemaRestoreStatus: oldSchemaRestore.status,
    readBackSchemaVersion: readBack.body.state.schemaVersion,
    restoredCurrentWeek: restoredReadBack.body.state.currentWeek,
    restoredRev: restored.body.rev,
    staleRestoreStatus: staleRestore.status,
    updatedRev: updated.body.rev,
    visibleProfiles: me.body.profiles.length,
  };
};

const runFatSecretSmoke = async (fetchMock) => {
  const shortQuery = await json(
    await fatSecretSearchGet({
      env: {},
      request: new Request('https://app.example.test/api/fatsecret/search?q=a'),
    })
  );
  assert(shortQuery.status === 200 && Array.isArray(shortQuery.body.foods.food), 'Short FatSecret query should return empty result', shortQuery);

  const missingCredentials = await json(
    await fatSecretSearchGet({
      env: {},
      request: new Request('https://app.example.test/api/fatsecret/search?q=banana'),
    })
  );
  assert(
    missingCredentials.status === 500 && missingCredentials.body.error === 'fatsecret-missing-credentials',
    'Missing FatSecret credentials did not fail safely',
    missingCredentials
  );

  const missingItemId = await json(
    await fatSecretItemGet({
      env: {},
      request: new Request('https://app.example.test/api/fatsecret/item'),
    })
  );
  assert(missingItemId.status === 400 && missingItemId.body.error === 'missing-id', 'Missing FatSecret item id did not fail safely', missingItemId);

  const fatEnv = {
    FATSECRET_CLIENT_ID: 'fat-client',
    FATSECRET_CLIENT_SECRET: 'fat-secret-value',
  };
  fetchMock.setFatSecretMode('success');
  const search = await json(
    await fatSecretSearchGet({
      env: fatEnv,
      request: new Request('https://app.example.test/api/fatsecret/search?q=banana'),
    })
  );
  assert(search.status === 200 && search.body.foods.food[0].food_id === 'banana-1', 'FatSecret search success failed', search);
  assert(!JSON.stringify(search.body).includes(fatEnv.FATSECRET_CLIENT_SECRET), 'FatSecret search leaked secret');

  const item = await json(
    await fatSecretItemGet({
      env: fatEnv,
      request: new Request('https://app.example.test/api/fatsecret/item?id=banana-1'),
    })
  );
  assert(item.status === 200 && item.body.food.food_id === 'banana-1', 'FatSecret item success failed', item);
  assert(!JSON.stringify(item.body).includes(fatEnv.FATSECRET_CLIENT_SECRET), 'FatSecret item leaked secret');

  fetchMock.setFatSecretMode('api-error');
  const apiError = await json(
    await fatSecretSearchGet({
      env: fatEnv,
      request: new Request('https://app.example.test/api/fatsecret/search?q=banana'),
    })
  );
  assert(apiError.status === 502 && apiError.body.error === 'fatsecret-api-14', 'FatSecret API error did not fail safely', apiError);
  assert(!JSON.stringify(apiError.body).includes(fatEnv.FATSECRET_CLIENT_SECRET), 'FatSecret error leaked secret');

  const tokenCall = fetchMock.calls.find((call) => call.url === 'https://oauth.fatsecret.com/connect/token');
  const apiCall = fetchMock.calls.find((call) => call.url === 'https://platform.fatsecret.com/rest/server.api');
  assert(tokenCall?.authorization?.startsWith('Basic '), 'FatSecret token request missing Basic auth', tokenCall);
  assert(apiCall?.authorization === 'Bearer fatsecret-smoke-token', 'FatSecret API request missing bearer token', apiCall);

  return {
    apiErrorStatus: apiError.status,
    itemStatus: item.status,
    missingCredentialsStatus: missingCredentials.status,
    searchResultCount: search.body.foods.food.length,
    shortQueryCount: shortQuery.body.foods.food.length,
  };
};

const assertSafeStatus = (probe, { allowHtmlAccessBlock = false, expectedStatuses, label }) => {
  if (!expectedStatuses.includes(probe.status)) {
    fail('Deployed API safe-status probe returned an unexpected status', {
      expectedStatuses,
      label,
      probe,
    });
  }
  if (probe.status >= 500) {
    fail('Deployed API safe-status probe returned a server error', { label, probe });
  }
  if (!allowHtmlAccessBlock && !probe.bodyJson) {
    fail('Deployed API safe-status probe did not return JSON', { label, probe });
  }
  assertNoSecretLeak(label, probe);
};

const runDeployedSafeStatusSmoke = async () => {
  if (!deployedBaseUrl) fail('API_DATA_SMOKE_URL is required for deployed API smoke mode');

  const probes = {
    fatSecretItemMissingId: await fetchDeployedProbe('fatsecret item missing id', '/api/fatsecret/item', {
      expectJson: true,
    }),
    fatSecretShortQuery: await fetchDeployedProbe('fatsecret short query', '/api/fatsecret/search?q=a', {
      expectJson: true,
    }),
    syncBackupsUnauthenticated: await fetchDeployedProbe(
      'sync backups unauthenticated',
      '/api/sync/backups?userId=andrew',
      { expectJson: true }
    ),
    syncMeUnauthenticated: await fetchDeployedProbe('sync me unauthenticated', '/api/sync/me', { expectJson: true }),
    syncStateUnauthenticated: await fetchDeployedProbe(
      'sync state unauthenticated',
      '/api/sync/state?userId=andrew',
      { expectJson: true }
    ),
  };

  assertSafeStatus(probes.fatSecretShortQuery, {
    expectedStatuses: [200],
    label: 'fatsecret short query',
  });
  assert(
    Array.isArray(probes.fatSecretShortQuery.bodyJson?.foods?.food),
    'Deployed FatSecret short query did not return the expected empty foods array',
    probes.fatSecretShortQuery
  );
  assertSafeStatus(probes.fatSecretItemMissingId, {
    expectedStatuses: [400],
    label: 'fatsecret item missing id',
  });
  assert(probes.fatSecretItemMissingId.bodyJson?.error === 'missing-id', 'Deployed FatSecret missing-item probe changed shape', {
    probe: probes.fatSecretItemMissingId,
  });

  for (const [key, probe] of Object.entries({
    syncBackupsUnauthenticated: probes.syncBackupsUnauthenticated,
    syncMeUnauthenticated: probes.syncMeUnauthenticated,
    syncStateUnauthenticated: probes.syncStateUnauthenticated,
  })) {
    assertSafeStatus(probe, {
      allowHtmlAccessBlock: true,
      expectedStatuses: [301, 302, 303, 307, 308, 401, 403],
      label: key,
    });
  }

  const authenticated = {};
  if (deployedJwt) {
    authenticated.syncMe = await fetchDeployedProbe('sync me authenticated', '/api/sync/me', {
      authorization: deployedJwt,
      expectJson: true,
    });
    assertSafeStatus(authenticated.syncMe, {
      expectedStatuses: [200],
      label: 'sync me authenticated',
    });
    assert(authenticated.syncMe.bodyJson?.user?.userId, 'Authenticated deployed sync /me did not return a user', {
      probe: authenticated.syncMe,
    });
    const userId = deployedUserId || authenticated.syncMe.bodyJson.user.userId;
    authenticated.syncState = await fetchDeployedProbe(
      'sync state authenticated',
      `/api/sync/state?userId=${encodeURIComponent(userId)}`,
      { authorization: deployedJwt, expectJson: true }
    );
    assertSafeStatus(authenticated.syncState, {
      expectedStatuses: [200],
      label: 'sync state authenticated',
    });
    assert(!JSON.stringify(authenticated.syncState.bodyJson).includes('state_json'), 'Authenticated state leaked raw D1 column name', {
      probe: authenticated.syncState,
    });
    authenticated.syncBackups = await fetchDeployedProbe(
      'sync backups authenticated',
      `/api/sync/backups?userId=${encodeURIComponent(userId)}`,
      { authorization: deployedJwt, expectJson: true }
    );
    assertSafeStatus(authenticated.syncBackups, {
      expectedStatuses: [200],
      label: 'sync backups authenticated',
    });
    assert(!JSON.stringify(authenticated.syncBackups.bodyJson).includes('state_json'), 'Authenticated backups leaked raw D1 column name', {
      probe: authenticated.syncBackups,
    });
  }

  const fatSecretLive = {};
  if (deployedFatSecretQuery) {
    fatSecretLive.search = await fetchDeployedProbe(
      'fatsecret live search',
      `/api/fatsecret/search?q=${encodeURIComponent(deployedFatSecretQuery)}`,
      { expectJson: true }
    );
    assertSafeStatus(fatSecretLive.search, {
      expectedStatuses: [200],
      label: 'fatsecret live search',
    });
    assert(
      Array.isArray(fatSecretLive.search.bodyJson?.foods?.food),
      'Deployed FatSecret live search did not return foods array',
      { probe: fatSecretLive.search }
    );
  }

  return {
    authenticated,
    baseUrl: deployedBaseUrl,
    fatSecretLive,
    gateStatus:
      deployedJwt && deployedFatSecretQuery
        ? 'deployed-api-read-smoke-proven-needs-owner-scope-signoff'
        : 'deployed-api-safe-status-proven-auth-or-live-fatsecret-not-supplied',
    probes,
    target: deployedTarget,
    unresolvedReleaseDecisions: [
      'Production scope for Cloudflare Functions, D1 sync/backups, FatSecret, barcode/camera, and privacy/log retention is not supplied.',
      'Authenticated sync read smoke requires API_DATA_SMOKE_JWT from the release owner.',
      'Live FatSecret binding smoke requires API_DATA_SMOKE_FATSECRET_LIVE_QUERY and owner approval to call the deployed external proxy.',
    ],
  };
};

const writeSummary = async (summary) => {
  if (!artifactsDir) return;
  await mkdir(artifactsDir, { recursive: true });
  await writeFile(path.join(artifactsDir, 'api-data-smoke-summary.json'), JSON.stringify(summary, null, 2));
};

const run = async () => {
  if (deployedBaseUrl) {
    const deployed = await runDeployedSafeStatusSmoke();
    const summary = {
      capturedAt: new Date().toISOString(),
      deployed,
      status: 'ok',
    };
    await writeSummary(summary);
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const signer = await createJwtSigner();
  const fetchMock = installFetchMock({ jwk: signer.jwk });
  try {
    const sync = await runSyncSmoke(signer.sign);
    const fatSecret = await runFatSecretSmoke(fetchMock);
    const summary = {
      capturedAt: new Date().toISOString(),
      d1MigrationTables: ['user_states', 'state_backups'],
      fatSecret,
      gateStatus: 'local-d1-backup-restore-proven-not-production-binding-evidence',
      status: 'ok',
      sync,
    };
    await writeSummary(summary);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    fetchMock.restore();
  }
};

run().catch((error) => {
  console.error(error.message);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  process.exit(1);
});
