import { callFatSecret, jsonResponse } from './_shared.js';
import { handleSyncError, requireAuth } from '../sync/_shared.js';

export const onRequestGet = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const { searchParams } = new URL(request.url);
    const foodId = (searchParams.get('id') || '').trim();
    if (!foodId) return jsonResponse({ error: 'missing-id' }, { status: 400 });

    const data = await callFatSecret(
      'food.get',
      {
        food_id: foodId,
      },
      env
    );
    return jsonResponse(data);
  } catch (err) {
    if (err.status && err.code) return handleSyncError(err);
    return jsonResponse(
      { error: err.message || 'fatsecret-item-failed' },
      { status: err.message === 'fatsecret-missing-credentials' ? 500 : 502 }
    );
  }
};
