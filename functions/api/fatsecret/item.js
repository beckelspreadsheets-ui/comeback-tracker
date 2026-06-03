import { callFatSecret, jsonResponse } from './_shared.js';

export const onRequestGet = async ({ request, env }) => {
  const { searchParams } = new URL(request.url);
  const foodId = (searchParams.get('id') || '').trim();
  if (!foodId) return jsonResponse({ error: 'missing-id' }, { status: 400 });

  try {
    const data = await callFatSecret(
      'food.get',
      {
        food_id: foodId,
      },
      env
    );
    return jsonResponse(data);
  } catch (err) {
    return jsonResponse(
      { error: err.message || 'fatsecret-item-failed' },
      { status: err.message === 'fatsecret-missing-credentials' ? 500 : 502 }
    );
  }
};
