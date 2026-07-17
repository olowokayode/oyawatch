// Vercel serverless proxy for TMDB — keeps the API key server-side.
// Enable by setting API_MODE='proxy' in index.html and a TMDB_KEY env var.
export default async function handler(req, res) {
  const { path = '', ...rest } = req.query || {};
  const p = Array.isArray(path) ? path[0] : path;
  if (!p || !/^\/[A-Za-z0-9/_\-]*$/.test(p)) {
    return res.status(400).json({ error: 'invalid path' });
  }
  const key = process.env.TMDB_KEY;
  if (!key) return res.status(500).json({ error: 'TMDB_KEY not configured' });

  const url = new URL('https://api.themoviedb.org/3' + p);
  for (const [k, v] of Object.entries(rest)) {
    if (v != null) url.searchParams.set(k, Array.isArray(v) ? v[0] : v);
  }
  url.searchParams.set('api_key', key);

  try {
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    const body = await r.text();
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(r.status).send(body);
  } catch {
    return res.status(502).json({ error: 'upstream error' });
  }
}
