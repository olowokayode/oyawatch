# Oya Watch

**Pick a mood, get movie & TV picks you can actually stream.** Oya Watch is a
fast, single-file web app that ends the nightly "what should we watch?" scroll.
Choose a mood (or search a title you love), and it surfaces highly-rated picks —
with honest "where to watch" availability, a clear 0–5 star rating, trailers, and
one-tap sharing. Powered by [TMDB](https://www.themoviedb.org/).

> Naija-flavoured moods, no wahala.

---

## Features

- **Three platforms, everywhere you'd expect them** — Netflix, Crunchyroll,
  and YouTube (for Naija Movies) are all real, selectable options in both
  onboarding and Settings, not just something hidden behind a mode toggle.
- **Mood-based discovery** — Movies, TV, Anime, and Naija Movies, each with its
  own set of moods.
- **Naija Movies** — Nollywood, filtered by Nigerian origin on TMDB and pointed
  at YouTube, since that's where most Nollywood movies actually live. Moods use
  the same plain genre words any streaming platform uses: Romance, Comedy,
  Drama, Family, Epic, Action, Crime, and Thriller.
- **Search "more like this"** — type a film or show you love and get similar picks.
- **Honest availability** — a title only says "Watch on Netflix" when it's actually
  there for your region; otherwise it links to a real "where to watch" page. No
  dead-end searches. Naija Movies picks always say "Watch on YouTube" and link to
  a real search there, since TMDB doesn't track free Nollywood uploads as a watch
  provider the way it does Netflix or Crunchyroll.
- **Clear 0–5 star ratings** — TMDB scores shown as fractional stars everyone
  understands (no confusing "IMDb" mislabels).
- **Expandable cards** — tap a pick for runtime, genres, tagline, and full synopsis.
- **iOS-safe trailers**, keyboard-accessible mood cards, pinch-zoom enabled.
- **Settings** — change name, platform, or content to avoid anytime (with a
  confirm-to-reset).
- **Works offline of any build step** — it's one `index.html`.

## Tech

No framework, no build. Vanilla HTML/CSS/JS in a single `index.html`, talking to
the TMDB REST API. Deploy configs for Vercel and Netlify are included, plus an
optional serverless proxy to keep the API key server-side.

## Run locally

Because the app calls the TMDB API over HTTPS, serve it over `http://` rather than
opening the file directly:

```bash
npx serve .
# then open the printed http://localhost:3000
```

Any static server works (`python3 -m http.server`, etc.).

## Deploy

**Vercel** — import the repo; framework preset "Other". `vercel.json` handles
SPA rewrites, security headers, and (optionally) the `/api/tmdb` proxy.

**Netlify** — connect the repo; publish directory is `.` (root). `netlify.toml`
handles redirects, headers, and the optional proxy function.

Both are static deploys — no build command required.

## TMDB API key (read this before going public)

The app ships with a TMDB **v3** key inline in `index.html` so it runs out of the
box. TMDB v3 keys are read-only and designed for client use, but **if you push
this to a public repo, that key is exposed** and could be rate-limited by abuse.

Two clean options:

1. **Keep the repo private**, or
2. **Move the key server-side.** Set `API_MODE = 'proxy'` near the top of the
   script in `index.html`, then set a `TMDB_KEY` environment variable in your
   Vercel/Netlify project (see `.env.example`). The included functions
   (`api/tmdb.js` for Vercel, `netlify/functions/tmdb.js` for Netlify) proxy
   requests so the key never reaches the browser. Then remove the inline key.

Rotate the key in your [TMDB account](https://www.themoviedb.org/settings/api)
if it was ever committed publicly.

## Project structure

```
.
├── index.html                  # the entire app (HTML + CSS + JS)
├── _headers                    # security headers (Netlify/Cloudflare)
├── vercel.json                 # Vercel rewrites + headers (+ proxy carve-out)
├── netlify.toml                # Netlify redirects + headers + proxy redirect
├── api/
│   └── tmdb.js                 # optional Vercel serverless TMDB proxy
├── netlify/functions/
│   └── tmdb.js                 # optional Netlify TMDB proxy
├── tests/                      # jsdom test suite (see below)
├── .env.example                # TMDB_KEY example for proxy mode
└── package.json
```

## Testing

The suite loads the real `index.html` into jsdom with a stubbed TMDB API and
drives the app's actual functions — covering star math, honest availability,
onboarding, the full spin→results flow, error paths, and more.

```bash
npm install
npm test
```

## Credits

This product uses the TMDB API but is not endorsed or certified by TMDB.
Movie and TV data © The Movie Database.

## License

[MIT](./LICENSE)
