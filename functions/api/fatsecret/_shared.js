const TOKEN_URL = 'https://oauth.fatsecret.com/connect/token';
const API_URL = 'https://platform.fatsecret.com/rest/server.api';

let tokenCache = {
  accessToken: '',
  expiresAt: 0,
};

export const jsonResponse = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  });

const getCredentials = (env) => {
  const clientId = env.FATSECRET_CLIENT_ID;
  const clientSecret = env.FATSECRET_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('fatsecret-missing-credentials');
  }
  return { clientId, clientSecret, scope: env.FATSECRET_SCOPE || 'basic' };
};

const getAccessToken = async (env) => {
  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.accessToken;
  }

  const { clientId, clientSecret, scope } = getCredentials(env);
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope,
    }),
  });

  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(`fatsecret-token-${tokenRes.status}`);
  }

  const expiresIn = Number(tokenData.expires_in) || 86_400;
  tokenCache = {
    accessToken: tokenData.access_token,
    expiresAt: now + expiresIn * 1000,
  };
  return tokenCache.accessToken;
};

export const callFatSecret = async (method, params, env) => {
  const token = await getAccessToken(env);
  const body = new URLSearchParams({
    method,
    format: 'json',
    ...params,
  });

  const apiRes = await fetch(API_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await apiRes.json().catch(() => ({}));
  if (!apiRes.ok || data.error) {
    const code = data.error?.code || apiRes.status;
    throw new Error(`fatsecret-api-${code}`);
  }
  return data;
};
