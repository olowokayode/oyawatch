const { makeDom, flush } = require('./helpers');

module.exports = async (t) => {
  t.group('Removed platforms and modes');
  {
    const dom = await makeDom(); const doc = dom.window.document;
    t.ok(!/crunchyroll/i.test(doc.documentElement.innerHTML), 'no Crunchyroll');
    t.ok(!doc.querySelector('[data-pkey]'), 'no data-pkey attributes');
    t.ok(!doc.querySelector('[data-anime]'), 'no anime cards');
    t.ok(!doc.querySelector('[data-naija]'), 'no naija cards');
  }

  t.group('Mood reel replaces grid entirely');
  {
    const dom = await makeDom(); const doc = dom.window.document;
    t.ok(!doc.querySelector('.mood-grid'), 'no .mood-grid element');
    t.ok(!doc.querySelector('.mood-card'), 'no .mood-card elements (replaced by .mood-panel)');
    t.ok(doc.querySelector('.mood-panel'), '.mood-panel elements exist');
    t.ok(doc.querySelectorAll('.mood-panel').length >= 8, 'at least 8 mood panels');
  }

  t.group('Full-width panels — no border-radius or grid constraints');
  {
    const dom = await makeDom(); const doc = dom.window.document;
    const panel = doc.querySelector('.mood-panel');
    t.ok(panel, 'mood panel exists');
    t.ok(!doc.querySelector('.card-pill'), 'no frosted pill labels');
    t.ok(!doc.querySelector('.card-check'), 'no card check circles');
    t.ok(!doc.querySelector('.card-desc'), 'no 9px description text');
    t.ok(!doc.querySelector('.card-peek'), 'long-press peek fully removed');
    t.ok(!doc.querySelector('[data-peek]'), 'no data-peek attributes');
  }

  t.group('Type toggle says "Series" not "TV Shows"');
  {
    const dom = await makeDom(); const doc = dom.window.document;
    const btns = [...doc.querySelectorAll('.type-btn')];
    t.ok(btns.length === 2, 'exactly 2 type buttons');
    t.ok(btns.some(b => b.textContent === 'Movies'), 'Movies tab');
    t.ok(btns.some(b => b.textContent === 'Series'), 'Series tab');
    t.ok(!btns.some(b => b.textContent === 'TV Shows'), 'no "TV Shows"');
  }

  t.group('No "Or pick a mood" — no divider label');
  {
    const dom = await makeDom(); const doc = dom.window.document;
    t.ok(!doc.querySelector('.mood-label'), 'no .mood-label');
    t.ok(!doc.body.textContent.includes('Or pick a mood'), 'no "Or pick a mood" text');
  }

  t.group('Spin button hidden until mood selected');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document, A = win.__app; await flush();
    A.state.profile = { name: 'Test', platform: 'netflix' };
    A.initPickScreen(); await flush();
    t.ok(doc.getElementById('stickyCta').classList.contains('hidden'), 'CTA hidden at rest');
    doc.querySelector('.mood-panel').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    t.ok(!doc.getElementById('stickyCta').classList.contains('hidden'), 'CTA appears after selection');
  }

  t.group('Watchlist badge has heart icon not text');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document, A = win.__app; await flush();
    A.state.watchlist = [];
    A.addToWatchlist({ id: 1, title: 'Test', mediaType: 'movie', poster_path: null, release_date: '2022-01-01' });
    const badge = doc.getElementById('wlBadge');
    t.ok(badge.classList.contains('visible'), 'badge visible');
    t.ok(badge.querySelector('svg'), 'badge has heart SVG');
    t.ok(doc.getElementById('wlBadgeCount').textContent === '1', 'badge count = 1');
  }

  t.group('Share is bottom sheet not centred modal');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document, A = win.__app; await flush();
    A.showSharePopup();
    t.ok(doc.getElementById('shareOverlay').classList.contains('active'), 'share overlay active');
    t.ok(doc.querySelector('.share-sheet'), 'uses .share-sheet');
    t.ok(!doc.querySelector('.share-popup'), 'no .share-popup (modal removed)');
    t.ok(doc.getElementById('shareLinkCopy').textContent === 'Copy', '"Copy" title case');
    t.ok(!doc.getElementById('shareLinkCopy').textContent.includes('COPY'), 'not "COPY" uppercase');
    A.hideSharePopup();
  }

  t.group('Curtain message is name or "Ready." — no "picks are ready"');
  {
    const dom = await makeDom(); const doc = dom.window.document;
    t.ok(!doc.documentElement.innerHTML.includes('your picks are ready'), 'old curtain copy gone');
    t.ok(doc.getElementById('curtainMsg'), 'curtain msg element present');
  }

  t.group('Settings title is "Preferences"');
  {
    const dom = await makeDom(); const doc = dom.window.document;
    t.ok(doc.querySelector('.sheet-title') && doc.querySelector('.sheet-title').textContent === 'Preferences', 'settings title = Preferences');
    t.ok(!doc.body.innerHTML.includes('Your settings'), 'no "Your settings"');
  }

  t.group('No emoji as primary UI elements');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document, A = win.__app; await flush();
    A.state.allPicks = [{ id: 200, title: 'Test', overview: 'Test film.', vote_average: 9, vote_count: 400, poster_path: null, mediaType: 'movie', verified: true }];
    A.state.pickIdx = 99;
    A.renderSwipeStack(); await flush();
    A.renderError('network');
    const html = doc.getElementById('swipeCardWrap').innerHTML;
    t.ok(!/<div[^>]*(?:error-icon|alldone-icon)[^>]*>[^<]*(?:🎬|🍿|🎭)/.test(html), 'no emoji in error or all-done icons');
    t.ok(/<svg/.test(html), 'SVG used instead');
  }

  t.group('Zero runtime errors with TV picks');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document, A = win.__app; await flush();
    A.state.profile = { name: 'Ada', platform: 'netflix', avoid: 'I watch everything' };
    A.state.currentMode = 'tv';
    const tvPanel = doc.querySelector('#tvReel .mood-panel');
    t.ok(!!tvPanel, 'TV mood panel exists');
    A.state.selectedMood = tvPanel.dataset.mood;
    A.state.selectedCard = tvPanel;
    win.__fetches = [];
    const pool = await A.fetchTMDB();
    t.ok(pool.length > 0, 'TV mode returns results');
    t.ok(win.__fetches.some(u => u.includes('/discover/tv')), 'queries /discover/tv');
    t.ok(dom.__errors.length === 0, 'no errors');
  }
};
