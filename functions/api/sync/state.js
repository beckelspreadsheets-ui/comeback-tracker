import {
  SyncError,
  assertCanView,
  assertOwnProfile,
  getStateRow,
  handleSyncError,
  jsonResponse,
  parseJsonBody,
  requireAuth,
  serializeStateRow,
  validateState,
} from './_shared.js';

const getRequestedUserId = (request) => {
  const { searchParams } = new URL(request.url);
  return String(searchParams.get('userId') || '').trim();
};

export const onRequestGet = async ({ request, env }) => {
  try {
    const { user, users } = await requireAuth(request, env);
    const userId = getRequestedUserId(request);
    if (!userId) throw new SyncError(400, 'sync-user-id-required');
    assertCanView(user, userId);

    const row = await getStateRow(env, userId);
    if (!row) {
      const mapped = users.byUserId.get(userId);
      return jsonResponse({
        userId,
        displayName: mapped?.displayName || userId,
        state: null,
        schemaVersion: null,
        rev: null,
        updatedAt: null,
        editable: userId === user.userId,
      });
    }

    return jsonResponse(serializeStateRow(row, userId === user.userId));
  } catch (err) {
    return handleSyncError(err);
  }
};

export const onRequestPut = async ({ request, env }) => {
  try {
    const { user } = await requireAuth(request, env);
    const body = await parseJsonBody(request);
    const state = body?.state;
    const baseRev = body?.baseRev ?? null;
    const force = body?.force === true;
    validateState(state);

    const stateJson = JSON.stringify(state);
    const now = Date.now();
    const current = await getStateRow(env, user.userId);

    if (!current) {
      try {
        await env.DB.prepare(
          `INSERT INTO user_states
            (user_id, display_name, state_json, schema_version, rev, updated_at, updated_by)
           VALUES (?, ?, ?, ?, 1, ?, ?)`
        )
          .bind(user.userId, user.displayName, stateJson, state.schemaVersion, now, user.userId)
          .run();
      } catch (err) {
        if (String(err?.message || err).includes('UNIQUE')) {
          throw new SyncError(409, 'sync-conflict', { currentRev: null });
        }
        throw err;
      }
      return jsonResponse({
        userId: user.userId,
        displayName: user.displayName,
        schemaVersion: state.schemaVersion,
        rev: 1,
        updatedAt: now,
      });
    }

    assertOwnProfile(user, current.user_id);
    if (!force && Number(baseRev) !== Number(current.rev)) {
      throw new SyncError(409, 'sync-conflict', {
        userId: user.userId,
        currentRev: current.rev,
        updatedAt: current.updated_at,
      });
    }

    const nextRev = Number(current.rev) + 1;
    const backupId = crypto.randomUUID();
    const batchResults = await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO state_backups
          (id, user_id, rev, state_json, schema_version, created_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        backupId,
        current.user_id,
        current.rev,
        current.state_json,
        current.schema_version,
        now,
        user.userId
      ),
      env.DB.prepare(
        `UPDATE user_states
         SET display_name = ?,
             state_json = ?,
             schema_version = ?,
             rev = ?,
             updated_at = ?,
             updated_by = ?
         WHERE user_id = ? AND rev = ?`
      ).bind(
        user.displayName,
        stateJson,
        state.schemaVersion,
        nextRev,
        now,
        user.userId,
        current.user_id,
        current.rev
      ),
    ]);

    const updateResult = batchResults?.[1];
    if (updateResult?.meta?.changes !== 1) {
      await env.DB.prepare('DELETE FROM state_backups WHERE id = ?').bind(backupId).run();
      throw new SyncError(409, 'sync-conflict', {
        userId: user.userId,
        currentRev: current.rev,
        updatedAt: current.updated_at,
      });
    }

    return jsonResponse({
      userId: user.userId,
      displayName: user.displayName,
      schemaVersion: state.schemaVersion,
      rev: nextRev,
      updatedAt: now,
    });
  } catch (err) {
    return handleSyncError(err);
  }
};
