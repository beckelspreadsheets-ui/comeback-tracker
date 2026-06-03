const FATSECRET_API = '/api/fatsecret';
const RESTAURANT_PROVIDER = import.meta.env.VITE_RESTAURANT_API;

export const hasRestaurantKey = () => RESTAURANT_PROVIDER === 'fatsecret';

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
};

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const extractMacro = (description, label) => {
  const match = description?.match(new RegExp(`${label}:\\s*([\\d.]+)`, 'i'));
  return match ? num(match[1]) : 0;
};

const extractServingDesc = (description) => {
  const match = description?.match(/^Per\s+(.+?)\s+-\s+Calories/i);
  return match?.[1]?.trim() || '1 serving';
};

const mapSearchHit = (food) => {
  const description = food.food_description || '';
  return {
    source: 'fatsecret',
    restaurantItemId: food.food_id,
    name: food.food_name,
    brand: food.brand_name || food.food_type || '',
    cal: extractMacro(description, 'Calories'),
    p: extractMacro(description, 'Protein'),
    c: extractMacro(description, 'Carbs'),
    f: extractMacro(description, 'Fat'),
    servingDesc: extractServingDesc(description),
    photo: null,
  };
};

const getDefaultServing = (food) => {
  const servings = asArray(food?.servings?.serving);
  return servings.find((serving) => String(serving.is_default) === '1') || servings[0] || null;
};

const mapItemDetails = (food) => {
  const serving = getDefaultServing(food);
  if (!food || !serving) return null;
  return {
    source: 'fatsecret',
    name: food.food_name,
    brand: food.brand_name || food.food_type || '',
    cal: num(serving.calories),
    p: num(serving.protein),
    c: num(serving.carbohydrate),
    f: num(serving.fat),
    servingDesc: serving.serving_description || '1 serving',
    unit: 'serving',
    barcode: '',
  };
};

const fetchJson = async (url, { signal } = {}) => {
  const res = await fetch(url, { signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `fatsecret-${res.status}`);
  return data;
};

export const searchRestaurants = async (query, { signal } = {}) => {
  if (!hasRestaurantKey()) throw new Error('no-key');
  const q = query.trim();
  if (!q || q.length < 2) return [];
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('offline');

  const params = new URLSearchParams({ q });
  const data = await fetchJson(`${FATSECRET_API}/search?${params}`, { signal });
  return asArray(data.foods?.food).map(mapSearchHit).filter((item) => item.restaurantItemId);
};

export const fetchItemDetails = async (restaurantItemId, { signal } = {}) => {
  if (!hasRestaurantKey()) throw new Error('no-key');
  const params = new URLSearchParams({ id: restaurantItemId });
  const data = await fetchJson(`${FATSECRET_API}/item?${params}`, { signal });
  return mapItemDetails(data.food);
};
