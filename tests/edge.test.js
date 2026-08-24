const { makeDom, flush } = require('./helpers');

module.exports = async (t) => {
  const dom = await makeDom({ languages: ['en-NG'] });
  const win = dom.window, doc = win.document, A = win.__app;
  await flush();

  const setMood = (sel) => {
    const c = doc.querySelector(sel);
    if (!c) return;
    A.state.selectedMood = c.dataset.mood;
    A.state.selectedCard = c;
  };

  t.group('tmdbGet session caching');
  {
    win.__fetches = [];
    await A.tmdbGet('/movie/424242');
    await A.tmdbGet('/movie/424242');
    const n = win.__fetches.filter(u => u.includes('/movie/424242')).length;
    t.ok(n === 1, 'identical call hits network once (' + n + ')');
  }

  t.group('Empty results → graceful error card');
  {
    A.state.profile = { name: 'Ada', platform: 'netflix' };
    A.state.currentMode = 'movies';
    setMood('#moviesGrid .mood-card[data-mood="Dey Play"]');
    win.__mode = 'empty'; A.state.fetchingResults = false;
    A.startFlow(); await flush(2);
    doc.getElementById('screen-wheel').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush(4);
    t.ok(/error-box/.test(doc.getElementById('swipeCardWrap').innerHTML), 'empty pool shows error box');
    t.ok(/Nothing matched/.test(doc.getElementById('swipeCardWrap').innerHTML), 'error copy mentions nothing matched');
    win.__mode = 'normal';
  }

  t.group('Network error → handled gracefully');
  {
    setMood('#moviesGrid .mood-card[data-mood="Dey Play"]');
    win.__mode = 'reject'; A.state.fetchingResults = false;
    A.startFlow(); await flush(2);
    doc.getElementById('screen-wheel').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush(4);
    t.ok(/error-box/.test(doc.getElementById('swipeCardWrap').innerHTML), 'network failure shows error box');
    win.__mode = 'normal'; A.state.fetchingResults = false;
  }

  t.group('All-done card shows when stack exhausted');
  {
    A.state.allPicks = [{ id: 1, title: 'Only One', overview: 'Just one pick.', vote_average: 8, vote_count: 200, poster_path: null, mediaType: 'movie', verified: true }];
    A.state.pickIdx = 99;
    A.renderSwipeStack(); await flush();
    t.ok(/alldone-card/.test(doc.getElementById('swipeCardWrap').innerHTML), 'all-done card shown when stack exhausted');
  }

  t.group('Watchlist deduplication');
  {
    A.state.watchlist = [];
    const pick = { id: 42, title: 'Dedup', mediaType: 'movie', poster_path: null, release_date: '2021-01-01' };
    A.addToWatchlist(pick);
    A.addToWatchlist(pick);
    A.addToWatchlist(pick);
    t.ok(A.state.watchlist.length === 1, 'same pick added only once');
  }

  t.group('Similar search delivers swipe stack');
  {
    A.state.fetchingResults = false;
    A.state.pickIdx = 0;
    await A.runSimilarSearch('Inception'); await flush(6);
    t.ok(A.state.allPicks.length > 0, 'similar search populates allPicks');
    const cards = doc.querySelectorAll('.swipe-card');
    t.ok(cards.length >= 1, 'similar search renders swipe cards');
  }

  t.group('Settings reset: two-tap confirm');
  {
    A.state.profile = { name: 'Ada', platform: 'netflix', avoid: 'I watch everything' };
    A.openSettings(); await flush();
    const rb = doc.getElementById('setReset');
    rb.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    t.ok(/Tap again/.test(rb.textContent), 'first tap asks for confirmation');
    t.ok(A.state.profile !== null, 'profile intact after first tap');
    rb.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(A.state.profile === null, 'second tap wipes profile');
    t.ok(doc.getElementById('screen-onboard').classList.contains('active'), 'reset returns to onboarding');
  }

  t.group('Back button: settings sheet closes');
  {
    A.openSettings(); await flush();
    t.ok(doc.getElementById('settingsOverlay').classList.contains('active'), 'settings open');
    win.dispatchEvent(new win.PopStateEvent('popstate')); await flush();
    t.ok(!doc.getElementById('settingsOverlay').classList.contains('active'), 'back closes settings');
  }

  t.group('Back button: results → pick screen');
  {
    doc.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    doc.getElementById('screen-results').classList.add('active');
    win.dispatchEvent(new win.PopStateEvent('popstate')); await flush();
    t.ok(doc.getElementById('screen-pick').classList.contains('active'), 'back from results → pick screen');
  }

  t.group('No platform selector anywhere');
  {
    t.ok(!doc.querySelector('.platform-list'), 'no .platform-list element');
    t.ok(!doc.querySelector('.platform-opt'), 'no .platform-opt elements');
    t.ok(!doc.getElementById('platformPillBtn'), 'no platformPillBtn');
    t.ok(doc.querySelector('.netflix-pill'), 'Netflix pill present');
  }

  t.group('Ambient glow element present on results screen');
  {
    t.ok(doc.getElementById('resultsAmbient'), 'resultsAmbient div exists');
  }

  t.group('Type toggle: only movies and tv');
  {
    const btns = doc.querySelectorAll('.type-btn');
    t.ok(btns.length === 2, 'exactly 2 type toggle buttons');
    const modes = [...btns].map(b => b.dataset.mode);
    t.ok(modes.includes('movies') && modes.includes('tv'), 'movies + tv tabs present');
    t.ok(!modes.includes('anime') && !modes.includes('naija'), 'no anime or naija tabs');
  }

  t.group('Zero runtime errors');
  t.ok(dom.__errors.length === 0, 'no errors' + (dom.__errors.length ? ': ' + dom.__errors.slice(0, 2).join(' | ') : ''));
};
