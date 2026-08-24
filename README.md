<div align="center">

<br />

```
 ██████╗ ██╗   ██╗ █████╗     ██╗    ██╗ █████╗ ████████╗ ██████╗██╗  ██╗
██╔═══██╗╚██╗ ██╔╝██╔══██╗    ██║    ██║██╔══██╗╚══██╔══╝██╔════╝██║  ██║
██║   ██║ ╚████╔╝ ███████║    ██║ █╗ ██║███████║   ██║   ██║     ███████║
██║   ██║  ╚██╔╝  ██╔══██║    ██║███╗██║██╔══██║   ██║   ██║     ██╔══██║
╚██████╔╝   ██║   ██║  ██║    ╚███╔███╔╝██║  ██║   ██║   ╚██████╗██║  ██║
 ╚═════╝    ╚═╝   ╚═╝  ╚═╝     ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝
```

**Stop scrolling. Start watching.**

Pick a mood. Swipe your pick. Watch on Netflix.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-oyawatch.vercel.app-E50914?style=for-the-badge&logo=vercel&logoColor=white)](https://oyawatch.vercel.app)
[![Tests](https://img.shields.io/badge/Tests-144%20passing-22c55e?style=for-the-badge)](#tests)
[![License](https://img.shields.io/badge/License-MIT-ffffff?style=for-the-badge)](LICENSE)
[![Netflix Only](https://img.shields.io/badge/Platform-Netflix%20Only-E50914?style=for-the-badge)](https://netflix.com)

<br />

</div>

---

## What it does

Netflix has 6,000+ titles. The average person spends **40 minutes** choosing before giving up and watching something bad anyway.

Oya Watch solves this in three taps:

1. **Pick a mood** — 8 moods for movies, 8 for TV shows
2. **Swipe** — swipe right to save, left to skip. One title at a time. No scrolling.
3. **Watch** — deep-link opens Netflix search directly

That's it.

---

## Features

### Mood-to-movie matching
Eight moods per content type, each mapped to specific TMDB genre combinations and tuned quality thresholds. The system prioritises titles actually available on Netflix in your region using TMDB's Watch Provider API.

| Movies | TV Shows |
|--------|----------|
| No Wahala (Feel-good) | Binge It (Crime sagas) |
| E Choke! (Intense drama) | Addicted (Twisty thrillers) |
| Chop Bfast (Romance) | Heartstrings (Romantic series) |
| Dey Play (Comedy) | Laugh Track (Comedy) |
| Vawulence (Thriller/Crime) | Whodunit (Mystery) |
| After Dark (Horror/Mystery) | Night Mode (Dark drama) |
| Lights Down (Cinematic) | Real Talk (Documentary) |
| Deep Feels (Drama) | Comfort TV (Feel-good series) |

### Swipe stack
Results are delivered as a physical card stack — not a list. Swipe right to save, left to skip. The gesture is handled in vanilla JS with pointer events, no libraries. Cards stack with perspective transform offsets (`translateY` + `scale`) to create depth.

### Long-press mood preview
Hold any mood card for 300ms to peek at example titles. Releases on `pointerup`. Built on a simple timer + CSS transition — no library.

### Ambient colour
When a result card loads, the poster image is drawn to a 1×1 `<canvas>`. The dominant pixel colour is extracted and applied as a radial gradient behind the card and as a top ambient glow on the results screen. Every pick has a unique visual atmosphere.

### Personal watchlist
Picks you swipe right on are saved to `localStorage`. The ♡ badge shows your count. Tap it to review your list, open each title on Netflix, or share the full list as a text message.

### "Rewatch score" copy
Instead of showing a raw numerical rating, Oya Watch translates TMDB vote averages into benefit-led copy:

| Score | Copy |
|-------|------|
| 9.0+ | "A film people rewatch." |
| 8.0–8.9 | "Stays with you." |
| 7.0–7.9 | "Worth the night." |
| < 7.0 | "A gamble. Could be good." |

### Similar title search
Type any movie or show you love. Oya Watch searches TMDB, fetches similar titles and recommendations, and delivers them as a swipe stack.

### Smart de-duplication
Seen titles are tracked in `localStorage` (up to 200 entries, FIFO). The same title won't appear on consecutive spins. Respin clears the delivery queue but maintains the seen list.

### Netflix provider verification
Each result is checked against TMDB's Watch Provider API for the user's detected region. Verified Netflix titles get a direct `Watch on Netflix →` button. Unverified titles link to TMDB's where-to-watch page.

### Haptic feedback
`navigator.vibrate()` fires on card select, successful swipe-right, and watchlist save. Progressive enhancement — silently ignored on iOS.

### Share
- Share individual picks via the native share sheet (title + score + Oya Watch link)
- Share your full watchlist as a formatted text message
- Passive share prompt appears 14 seconds after results load (once per session)

---

## Architecture

Single HTML file. No build step. No framework. No dependencies at runtime.

```
oyawatch/
├── index.html          # The entire app (~1,380 lines)
├── api/
│   └── tmdb.js         # Vercel serverless proxy (optional, for key hiding)
├── vercel.json         # SPA rewrite + security headers
├── netlify.toml        # Netlify fallback config
├── tests/
│   ├── run.js          # Test runner
│   ├── helpers.js      # JSDOM setup + mock fetch
│   ├── behavior.test.js
│   ├── flow.test.js
│   ├── edge.test.js
│   ├── onboarding.test.js
│   └── naija.test.js
└── package.json
```

### Key design decisions

**Single file.** The entire app is one `index.html`. CSS, JS, HTML — all inline. Zero build tooling means zero build failures and instant deploys.

**Vanilla JS only.** No React, no Vue, no Alpine. The swipe gesture, the card stack, the ambient colour extraction, the wheel animation — all native browser APIs.

**TMDB as the data layer.** The [TMDB API](https://developer.themoviedb.org/) provides discovery, search, providers, videos, and details. Results are cached in a `Map()` for the session duration.

**localStorage as the persistence layer.** Profile, seen titles, and watchlist — all stored client-side. No backend, no auth, no accounts.

---

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| UI | Vanilla HTML/CSS/JS | No build step, instant load |
| Fonts | Syne + Inter (Google Fonts) | Display + body pairing |
| Data | TMDB API | Free, comprehensive, fast |
| Providers | TMDB Watch Providers | Netflix availability by region |
| Hosting | Vercel | Edge CDN, auto-deploy from GitHub |
| Testing | JSDOM + Node.js | No browser needed in CI |

---

## Tests

144 tests across 5 suites. All run in Node.js via JSDOM — no browser, no Playwright, no Jest.

```bash
npm test
```

```
RESULT: 144 passed, 0 failed
```

### Test suites

| Suite | What it covers |
|-------|---------------|
| `onboarding.test.js` | 2-step onboard flow, name echo, progress dots, legacy migration |
| `behavior.test.js` | Verdict copy, swipe stack rendering, watchlist, provider verification, trailer open, peek titles |
| `flow.test.js` | Full happy path: onboard → mood → spin → skip → swipe → respin |
| `edge.test.js` | Empty results, network errors, all-done card, similar search, back button, reset |
| `naija.test.js` | Removed platforms, swipe replaces scroll, watchlist sheet, ambient glow |

---

## Local development

```bash
# Clone
git clone https://github.com/olowokayode/oyawatch.git
cd oyawatch

# Install test dependencies
npm install

# Run tests
npm test

# Serve locally
npx serve .
# → http://localhost:3000
```

No `.env` needed. The TMDB API key is public (read-only, rate-limited).

---

## Deploy

Oya Watch deploys automatically on push via Vercel's GitHub integration.

```bash
# Deploy to preview (dev branch)
git checkout -b dev
git push origin dev
# → Vercel creates a preview URL automatically

# Deploy to production (main branch)
git checkout main
git merge dev
git push origin main
# → oyawatch.vercel.app updates
```

The `vercel.json` configures SPA routing (all paths → `index.html`) and security headers.

---

## TMDB attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.

---

## License

MIT — do whatever you want with it.

---

<div align="center">

Built by [Olukayode Olowo](https://github.com/olowokayode) · Powered by [TMDB](https://www.themoviedb.org)

</div>
