import { callFatSecret, jsonResponse } from './_shared.js';

export const onRequestGet = async ({ request, env }) => {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim();
  if (query.length < 2) return jsonResponse({ foods: { food: [] } });

  try {
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
    return jsonResponse(
      { error: err.message || 'fatsecret-search-failed' },
      { status: err.message === 'fatsecret-missing-credentials' ? 500 : 502 }
    );
  }
};
