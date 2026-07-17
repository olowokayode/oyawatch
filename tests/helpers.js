// Shared test helpers: load the real index.html into jsdom with a stubbed TMDB
// API so the app's actual functions run against deterministic data.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Read index.html and expose internals on window.__app for assertions.
function instrumentedHtml() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');
  const hook = `
<script>
window.__app = {
  ratingToStars, starsHTML, resolveRegion, fetchTMDB, renderPicks, runSimilarSearch,
  verifyWatch, tmdbGet, fetchProviders, startFlow, openSettings, closeSettings,
  showSharePopup, hideSharePopup, startPopupTimer, applyPlatformFromProfile,
  updatePlatformPill, renderOnboardStep, initPickScreen, state, PLATFORMS,
  isPopupShown: function () { return popupShownThisSession; }
};
</script>
</body>`;
  return src.replace('</body>', hook);
}

const mkRes = (obj) => ({
  ok: true, status: 200,
  json: () => Promise.resolve(obj),
  text: () => Promise.resolve(JSON.stringify(obj)),
});

// One fetch stub covering every endpoint the app calls, with a few modes.
function makeFetch(win) {
  return (url) => {
    const u = String(url);
    win.__fetches.push(u);
    const p = u.split('?')[0];
    if (win.__mode === 'reject') return Promise.reject(new Error('network down'));

    if (u.includes('/discover/')) {
      if (win.__mode === 'empty') return Promise.resolve(mkRes({ results: [] }));
      const isTV = u.includes('/discover/tv');
      const prov = u.includes('with_watch_providers');
      const page = (u.match(/[?&]page=(\d+)/) || [])[1] || '1';
      const base = (isTV ? 2000 : 1000) + (prov ? 0 : 500) + Number(page) * 10;
      const results = [];
      for (let i = 0; i < 8; i++) {
        const id = base + i;
        results.push({
          id,
          title: isTV ? undefined : ('Movie ' + id),
          name: isTV ? ('Show ' + id) : undefined,
          overview: 'Acclaimed story number ' + id + '. It follows compelling people through vivid events. Worth the night.',
          vote_average: 6 + ((id % 40) / 10),
          vote_count: 500,
          poster_path: '/p' + id + '.jpg',
          release_date: isTV ? undefined : '2020-01-01',
          first_air_date: isTV ? '2020-01-01' : undefined,
        });
      }
      return Promise.resolve(mkRes({ results }));
    }
    if (u.includes('/watch/providers')) {
      const id = Number((p.match(/\/(movie|tv)\/(\d+)\/watch\/providers/) || [])[2]);
      let flat; const m = id % 3;
      if (m === 1) flat = [{ provider_id: 283 }];
      else if (m === 0) flat = [{ provider_id: 8 }];
      else flat = [{ provider_id: 9 }];
      const region = { flatrate: flat };
      const results = { US: region };
      if (id < 9000) results.NG = region; // id>=9000 => US only (region fallback)
      return Promise.resolve(mkRes({ results }));
    }
    if (u.includes('/videos')) {
      return win.__deferredVideos || Promise.resolve(mkRes({ results: [{ site: 'YouTube', type: 'Trailer', key: 'abc' }] }));
    }
    if (u.includes('/search/multi')) {
      return Promise.resolve(mkRes({ results: [{ media_type: 'movie', id: 777, title: 'Found Movie' }] }));
    }
    if (u.includes('/similar') || u.includes('/recommendations')) {
      const rec = u.includes('/recommendations');
      const results = [];
      for (let i = 0; i < 8; i++) {
        const id = (rec ? 3000 : 4000) + i;
        results.push({ id, title: (rec ? 'Rec ' : 'Sim ') + id, overview: 'A fine watch ' + id + '. Truly worth the evening ahead of you.', vote_average: 7 + (i % 3) * 0.5, vote_count: 200, poster_path: '/x' + id + '.jpg', release_date: '2019-01-01' });
      }
      return Promise.resolve(mkRes({ results }));
    }
    if (/\/(movie|tv)\/\d+$/.test(p)) {
      const isTV = p.includes('/tv/');
      return Promise.resolve(mkRes({ runtime: isTV ? undefined : 128, episode_run_time: isTV ? [45] : undefined, number_of_seasons: isTV ? 3 : undefined, genres: [{ name: 'Drama' }, { name: 'Thriller' }], tagline: 'A gripping tale.', original_language: 'en' }));
    }
    return Promise.resolve(mkRes({ results: [] }));
  };
}

async function makeDom(opts = {}) {
  const errors = [];
  const dom = new JSDOM(instrumentedHtml(), {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://oyawatch.example/',
    beforeParse(win) {
      Object.defineProperty(win.navigator, 'languages', { value: opts.languages || ['en-US'], configurable: true });
      win.__mode = opts.mode || 'normal';
      win.__fetches = [];
      win.__deferredVideos = null;
      win.fetch = makeFetch(win);
      win.requestAnimationFrame = () => 0;
      win.cancelAnimationFrame = () => {};
      win.__openCalls = [];
      win.open = (u, t) => { win.__openCalls.push([u, t]); const w = { location: { href: u }, close() { w.__closed = true; } }; win.__lastWin = w; return w; };
      win.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => {} });
      win.scrollTo = () => {};
      win.__shared = null;
      win.navigator.share = (d) => { win.__shared = d; return Promise.resolve(); };
      win.navigator.clipboard = { writeText: () => Promise.resolve() };
      win.addEventListener('error', (e) => errors.push(String(e.message || e.error)));
      if (opts.legacy) { try { win.localStorage.setItem('tmplug_v6', JSON.stringify(opts.legacy)); } catch (e) { win.__legacyErr = String(e); } }
    },
  });
  await new Promise((r) => setTimeout(r, 0));
  dom.__errors = errors;
  return dom;
}

const flush = async (n = 10) => { for (let i = 0; i < n; i++) { await Promise.resolve(); await new Promise((r) => setTimeout(r, 0)); } };

function deferredVideos() {
  let resolve;
  const promise = new Promise((res) => { resolve = () => res(mkRes({ results: [{ site: 'YouTube', type: 'Trailer', key: 'zzz' }] })); });
  return { promise, resolve };
}

module.exports = { makeDom, flush, deferredVideos, instrumentedHtml };
