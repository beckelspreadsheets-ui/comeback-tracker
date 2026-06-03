import {
  SyncError,
  assertOwnProfile,
  handleSyncError,
  jsonResponse,
  requireAuth,
} from './_shared.js';

export const onRequestGet = async ({ request, env }) => {
  try {
    const { user } = await requireAuth(request, env);
    const { searchParams } = new URL(request.url);
    const userId = String(searchParams.get('userId') || '').trim();
    if (!userId) throw new SyncError(400, 'sync-user-id-required');
    assertOwnProfile(user, userId);

    const { results } = await env.DB.prepare(
      `SELECT id, user_id, rev, schema_version, created_at, created_by
       FROM state_backups
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`
    )
      .bind(userId)
      .all();

    return jsonResponse({
      backups: (results || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        rev: row.rev,
        schemaVersion: row.schema_version,
        createdAt: row.created_at,
        createdBy: row.created_by,
      })),
    });
  } catch (err) {
    return handleSyncError(err);
  }
};
