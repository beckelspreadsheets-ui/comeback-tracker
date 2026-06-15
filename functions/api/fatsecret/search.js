import { callFatSecret, jsonResponse } from './_shared.js';
import { handleSyncError, requireAuth } from '../sync/_shared.js';

export const onRequestGet = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();
    if (query.length < 2) return jsonResponse({ foods: { food: [] } });

    const data = await callFatSecret(
      'foods.search',
      {
        search_expression: query,
        max_results: '20',
        page_number: '0',
      },
      env
    );
    return jsonResponse(data);
  } catch (err) {
    if (err.status && err.code) return handleSyncError(err);
    return jsonResponse(
      { error: err.message || 'fatsecret-search-failed' },
      { status: err.message === 'fatsecret-missing-credentials' ? 500 : 502 }
    );
  }
};
