// Netlify function proxy for TMDB — keeps the API key server-side.
// Enable by setting API_MODE='proxy' in index.html and a TMDB_KEY env var.
exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const { path = '', ...rest } = params;
  if (!path || !/^\/[A-Za-z0-9/_\-]*$/.test(path)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'invalid path' }) };
  }
  const key = process.env.TMDB_KEY;
  if (!key) return { statusCode: 500, body: JSON.stringify({ error: 'TMDB_KEY not configured' }) };

  const url = new URL('https://api.themoviedb.org/3' + path);
  for (const [k, v] of Object.entries(rest)) if (v != null) url.searchParams.set(k, v);
  url.searchParams.set('api_key', key);

  try {
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    const body = await r.text();
    return {
      statusCode: r.status,
      headers: { 'content-type': 'application/json', 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
      body,
    };
  } catch {
    return { statusCode: 502, body: JSON.stringify({ error: 'upstream error' }) };
  }
};
