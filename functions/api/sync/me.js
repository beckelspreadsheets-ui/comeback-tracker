import { getVisibleProfiles, handleSyncError, jsonResponse, requireAuth } from './_shared.js';

export const onRequestGet = async ({ request, env }) => {
  try {
    const { user, users } = await requireAuth(request, env);
    const profiles = await getVisibleProfiles(env, user.canView, users.byUserId);
    return jsonResponse({ user, profiles });
  } catch (err) {
    return handleSyncError(err);
  }
};
