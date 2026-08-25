const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function instrumentedHtml() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');
  const hook = `
<script>
window.__app = {
  state,
  resolveRegion, fetchTMDB, dedupe, runSimilarSearch,
  verifyWatch, tmdbGet, fetchProviders, startFlow,
  openSettings, closeSettings, openWL, closeWL,
  showSharePopup, hideSharePopup, startPopupTimer,
  initPickScreen, renderError, renderSwipeStack,
  addToWatchlist, updateWLBadge, getVerdict,
  buildSwipeCard, loadWatchlist, saveWatchlist,
  finishOnboard, resetMoodSelection, tc, getTimePeriod,
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
        results.push({ id, title: isTV ? undefined : 'Movie ' + id, name: isTV ? 'Show ' + id : undefined, overview: 'Compelling story ' + id + '. Worth your night entirely.', vote_average: 6 + ((id % 40) / 10), vote_count: 500, poster_path: '/p' + id + '.jpg', release_date: isTV ? undefined : '2020-01-01', first_air_date: isTV ? '2020-01-01' : undefined });
      }
      return Promise.resolve(mkRes({ results }));
    }
    if (u.includes('/watch/providers')) {
      const id = Number((p.match(/\/(movie|tv)\/(\d+)\/watch\/providers/) || [])[2]);
      const m = id % 3;
      const flat = m === 0 ? [{ provider_id: 8 }] : m === 1 ? [{ provider_id: 283 }] : [{ provider_id: 9 }];
      return Promise.resolve(mkRes({ results: { US: { flatrate: flat }, NG: { flatrate: flat } } }));
    }
    if (u.includes('/videos')) {
      return win.__deferredVideos || Promise.resolve(mkRes({ results: [{ site: 'YouTube', type: 'Trailer', key: 'abc' }] }));
    }
    if (u.includes('/search/multi')) {
      return Promise.resolve(mkRes({ results: [{ media_type: 'movie', id: 777, title: 'Found Movie' }] }));
    }
    if (u.includes('/similar') || u.includes('/recommendations')) {
      const rec = u.includes('/recommendations');
      return Promise.resolve(mkRes({ results: Array.from({ length: 8 }, (_, i) => ({ id: (rec ? 3000 : 4000) + i, title: (rec ? 'Rec ' : 'Sim ') + i, overview: 'Great watch ' + i, vote_average: 7 + (i % 3) * 0.5, vote_count: 200, poster_path: '/x' + i + '.jpg', release_date: '2019-01-01' })) }));
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
      const gradientProxy = new Proxy({}, { get: () => () => gradientProxy });
      win.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (_, prop) => prop === 'createRadialGradient' || prop === 'createLinearGradient' ? () => gradientProxy : () => {} });
      win.scrollTo = () => {};
      win.Element.prototype.scrollIntoView = () => {};
      win.__shared = null;
      win.navigator.share = (d) => { win.__shared = d; return Promise.resolve(); };
      win.navigator.clipboard = { writeText: () => Promise.resolve() };
      win.navigator.vibrate = () => true;
      win.addEventListener('error', (e) => errors.push(String(e.message || e.error)));
      if (opts.legacy) { try { win.localStorage.setItem('tmplug_v6', JSON.stringify(opts.legacy)); } catch (e) { win.__legacyErr = String(e); } }
    },
  });
  await new Promise((r) => setTimeout(r, 0));
  dom.__errors = errors.filter(e => !e.includes('renderOnboardStep') && !e.includes('Not implemented'));
  return dom;
}

const flush = async (n = 12) => { for (let i = 0; i < n; i++) { await Promise.resolve(); await new Promise((r) => setTimeout(r, 0)); } };

function deferredVideos() {
  let resolve;
  const promise = new Promise((res) => { resolve = () => res({ ok: true, status: 200, json: () => Promise.resolve({ results: [{ site: 'YouTube', type: 'Trailer', key: 'zzz' }] }) }); });
  return { promise, resolve };
}

module.exports = { makeDom, flush, deferredVideos };
