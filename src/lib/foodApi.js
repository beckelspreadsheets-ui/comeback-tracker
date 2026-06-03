// Food database lookups: OpenFoodFacts (free, no key) + USDA FDC (optional key).

const OFF_SEARCH = 'https://world.openfoodfacts.org/api/v2/search';
const OFF_PRODUCT = 'https://world.openfoodfacts.org/api/v0/product';
const USDA_SEARCH = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const USDA_KEY = import.meta.env.VITE_USDA_API_KEY;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
};

// Per-gram values: 4 decimal precision (milligram-level).
const numPerGram = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round((n / 100) * 10000) / 10000 : 0;
};

// Normalise an OFF product to our entry shape. Uses per-serving data when
// available; otherwise stores per-gram macros with unit='gram'.
const mapOffProduct = (p) => {
  if (!p) return null;
  const n = p.nutriments || {};
  const hasServing = n['energy-kcal_serving'] != null || n.proteins_serving != null;
  if (hasServing) {
    return {
      source: 'off',
      name: p.product_name || p.generic_name || 'Unnamed',
      brand: p.brands || '',
      cal: num(n['energy-kcal_serving']),
      p: num(n.proteins_serving),
      c: num(n.carbohydrates_serving),
      f: num(n.fat_serving),
      unit: 'serving',
      servingDesc: p.serving_size || (p.serving_quantity ? `${p.serving_quantity}g` : '1 serving'),
      barcode: p.code || '',
    };
  }
  return {
    source: 'off',
    name: p.product_name || p.generic_name || 'Unnamed',
    brand: p.brands || '',
    cal: numPerGram(n['energy-kcal_100g']),
    p: numPerGram(n.proteins_100g),
    c: numPerGram(n.carbohydrates_100g),
    f: numPerGram(n.fat_100g),
    unit: 'gram',
    servingDesc: '1 g',
    barcode: p.code || '',
  };
};

const mapUsdaFood = (f) => {
  if (!f) return null;
  const getN = (id) => f.foodNutrients?.find((x) => x.nutrientId === id)?.value;
  // USDA: SR Legacy / Foundation per 100g → gram mode; Branded per serving.
  const isBranded = f.dataType === 'Branded';
  if (isBranded) {
    return {
      source: 'usda',
      name: f.description || 'Unnamed',
      brand: f.brandOwner || f.brandName || '',
      cal: num(getN(1008)),
      p: num(getN(1003)),
      c: num(getN(1005)),
      f: num(getN(1004)),
      unit: 'serving',
      servingDesc: f.servingSize
        ? `${f.servingSize}${f.servingSizeUnit || 'g'}`
        : '1 serving',
      barcode: f.gtinUpc || '',
    };
  }
  return {
    source: 'usda',
    name: f.description || 'Unnamed',
    brand: f.brandOwner || f.brandName || '',
    cal: numPerGram(getN(1008)),
    p: numPerGram(getN(1003)),
    c: numPerGram(getN(1005)),
    f: numPerGram(getN(1004)),
    unit: 'gram',
    servingDesc: '1 g',
    barcode: f.gtinUpc || '',
  };
};

export const isOnline = () =>
  typeof navigator === 'undefined' ? true : navigator.onLine !== false;

export const searchFoods = async (query, { signal } = {}) => {
  const q = query.trim();
  if (!q || q.length < 2) return [];
  if (!isOnline()) throw new Error('offline');
  const results = [];

  try {
    const params = new URLSearchParams({
      search_terms: q,
      fields: 'product_name,generic_name,brands,nutriments,code,serving_size,serving_quantity',
      page_size: '20',
    });
    const res = await fetch(`${OFF_SEARCH}?${params}`, { signal });
    if (res.ok) {
      const data = await res.json();
      for (const p of data.products || []) {
        const mapped = mapOffProduct(p);
        if (mapped && mapped.cal > 0) results.push(mapped);
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    // fall through — try USDA
  }

  if (USDA_KEY) {
    try {
      const params = new URLSearchParams({
        query: q,
        api_key: USDA_KEY,
        pageSize: '15',
      });
      const res = await fetch(`${USDA_SEARCH}?${params}`, { signal });
      if (res.ok) {
        const data = await res.json();
        for (const f of data.foods || []) {
          const mapped = mapUsdaFood(f);
          if (mapped && mapped.cal > 0) results.push(mapped);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') throw err;
    }
  }

  // Dedupe by lowercase name
  const seen = new Set();
  return results.filter((r) => {
    const k = (r.name + '|' + r.brand).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

export const lookupBarcode = async (barcode) => {
  if (!barcode) return null;
  if (!isOnline()) throw new Error('offline');
  const res = await fetch(`${OFF_PRODUCT}/${encodeURIComponent(barcode)}.json`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  const mapped = mapOffProduct(data.product);
  if (mapped) mapped.barcode = barcode;
  return mapped;
};

export const hasUsdaKey = () => !!USDA_KEY;
