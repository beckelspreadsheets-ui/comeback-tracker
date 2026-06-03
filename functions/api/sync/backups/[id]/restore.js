import {
  SyncError,
  getStateRow,
  handleSyncError,
  jsonResponse,
  parseJsonBody,
  requireAuth,
  validateState,
} from '../../_shared.js';

const getBackupRow = (env, userId, backupId) =>
  env.DB.prepare(
    `SELECT id, user_id, rev, state_json, schema_version, created_at, created_by
     FROM state_backups
     WHERE id = ? AND user_id = ?`
  )
    .bind(backupId, userId)
    .first();

export const onRequestPost = async ({ request, env, params }) => {
  try {
    const { user } = await requireAuth(request, env);
    const backupId = String(params?.id || '').trim();
    if (!backupId) throw new SyncError(400, 'sync-backup-id-required');

    const body = await parseJsonBody(request);
    const baseRev = body?.baseRev ?? null;
    const force = body?.force === true;
    const backup = await getBackupRow(env, user.userId, backupId);
    if (!backup) throw new SyncError(404, 'sync-backup-not-found');

    let restoredState;
    try {
      restoredState = JSON.parse(backup.state_json);
    } catch {
      throw new SyncError(400, 'sync-backup-state-invalid');
    }
    validateState(restoredState);

    const current = await getStateRow(env, user.userId);
    if (!current) throw new SyncError(409, 'sync-restore-current-missing');
    if (!force && Number(baseRev) !== Number(current.rev)) {
      throw new SyncError(409, 'sync-conflict', {
        userId: user.userId,
        currentRev: current.rev,
        updatedAt: current.updated_at,
      });
    }

    const now = Date.now();
    const nextRev = Number(current.rev) + 1;
    const safetyBackupId = crypto.randomUUID();
    const batchResults = await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO state_backups
          (id, user_id, rev, state_json, schema_version, created_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        safetyBackupId,
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
        JSON.stringify(restoredState),
        restoredState.schemaVersion,
        nextRev,
        now,
        user.userId,
        current.user_id,
        current.rev
      ),
    ]);

    const updateResult = batchResults?.[1];
    if (updateResult?.meta?.changes !== 1) {
      await env.DB.prepare('DELETE FROM state_backups WHERE id = ?').bind(safetyBackupId).run();
      throw new SyncError(409, 'sync-conflict', {
        userId: user.userId,
        currentRev: current.rev,
        updatedAt: current.updated_at,
      });
    }

    return jsonResponse({
      userId: user.userId,
      displayName: user.displayName,
      schemaVersion: restoredState.schemaVersion,
      rev: nextRev,
      updatedAt: now,
      restoredFrom: {
        id: backup.id,
        rev: backup.rev,
        schemaVersion: backup.schema_version,
        createdAt: backup.created_at,
      },
      safetyBackup: {
        id: safetyBackupId,
        rev: current.rev,
        schemaVersion: current.schema_version,
      },
    });
  } catch (err) {
    return handleSyncError(err);
  }
};
