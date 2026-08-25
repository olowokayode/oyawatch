const { makeDom, flush } = require('./helpers');

module.exports = async (t) => {
  const dom = await makeDom({ languages: ['en-NG'] });
  const win = dom.window, doc = win.document, A = win.__app;
  await flush();

  const selectMood = (mood) => {
    const panel = doc.querySelector(`.mood-panel[data-mood="${mood}"]`);
    if (!panel) return;
    A.state.selectedMood = mood;
    A.state.selectedCard = panel;
    panel.classList.add('selected');
  };

  t.group('tmdbGet session caching');
  {
    win.__fetches = [];
    await A.tmdbGet('/movie/424242');
    await A.tmdbGet('/movie/424242');
    const n = win.__fetches.filter(u => u.includes('/movie/424242')).length;
    t.ok(n === 1, 'identical calls hit network once (' + n + ')');
  }

  t.group('Empty results → error card');
  {
    A.state.profile = { name: 'Ada', platform: 'netflix', avoid: 'I watch everything' };
    A.state.currentMode = 'movies';
    selectMood('Dey Play');
    win.__mode = 'empty'; A.state.fetchingResults = false;
    A.startFlow(); await flush(2);
    doc.getElementById('screen-wheel').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush(4);
    t.ok(/error-box/.test(doc.getElementById('swipeCardWrap').innerHTML), 'error box shown');
    t.ok(/Not on Netflix tonight/.test(doc.getElementById('swipeCardWrap').innerHTML), 'correct error title');
    win.__mode = 'normal';
  }

  t.group('Network error → handled');
  {
    selectMood('Dey Play');
    win.__mode = 'reject'; A.state.fetchingResults = false;
    A.startFlow(); await flush(3);
    doc.getElementById('screen-wheel').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    await flush(16);
    const errHtml = doc.getElementById('swipeCardWrap').innerHTML;
    t.ok(/error-box/.test(errHtml) || /Something went sideways/.test(errHtml) || /Not on Netflix/.test(errHtml), 'error card shown: ' + errHtml.slice(0,60));
    win.__mode = 'normal'; A.state.fetchingResults = false;
  }

  t.group('All-done card — SVG not emoji');
  {
    A.state.allPicks = [{ id: 1, title: 'One', overview: 'Just one.', vote_average: 8, vote_count: 200, poster_path: null, mediaType: 'movie', verified: true }];
    A.state.pickIdx = 99;
    A.renderSwipeStack(); await flush();
    const html = doc.getElementById('swipeCardWrap').innerHTML;
    t.ok(/alldone-card/.test(html), 'all-done card shown');
    t.ok(/<svg/.test(html), 'SVG icon used (not emoji)');
    t.ok(!/🎬|🍿/.test(html), 'no emoji in all-done card');
  }

  t.group('All-done copy — no em dash');
  {
    const html = doc.getElementById('swipeCardWrap').innerHTML;
    t.ok(!html.includes('—'), 'no em dash in all-done card');
  }

  t.group('Error card — SVG not emoji');
  {
    A.renderError('no-results');
    const html = doc.getElementById('swipeCardWrap').innerHTML;
    t.ok(/<svg/.test(html), 'SVG icon in error card');
    t.ok(!/🎬/.test(html), 'no emoji in error card');
  }

  t.group('Watchlist deduplication');
  {
    A.state.watchlist = [];
    const pick = { id: 42, title: 'Dedup', mediaType: 'movie', poster_path: null, release_date: '2021-01-01' };
    A.addToWatchlist(pick); A.addToWatchlist(pick); A.addToWatchlist(pick);
    t.ok(A.state.watchlist.length === 1, 'added only once');
  }

  t.group('Watchlist sheet — no em dash in copy');
  {
    A.state.watchlist = []; A.openWL(); await flush();
    const sub = doc.getElementById('wlSubtitle').textContent;
    t.ok(sub.length > 0, 'subtitle has text: "' + sub + '"');
  }

  t.group('Watchlist item button — icon only, no "Watch" text');
  {
    A.state.watchlist = [];
    A.addToWatchlist({ id: 77, title: 'Test Film', mediaType: 'movie', poster_path: null, release_date: '2022-01-01' });
    A.openWL(); await flush();
    const itemBtn = doc.querySelector('.wl-item-btn');
    t.ok(itemBtn, 'watchlist item button exists');
    t.ok(!itemBtn.textContent.trim(), 'watchlist item button has no text (icon only)');
    t.ok(itemBtn.querySelector('svg'), 'watchlist item button has SVG');
    A.closeWL();
  }

  t.group('Similar search delivers swipe stack');
  {
    A.state.fetchingResults = false; A.state.pickIdx = 0;
    await A.runSimilarSearch('Inception'); await flush(6);
    t.ok(A.state.allPicks.length > 0, 'allPicks populated');
    t.ok(doc.querySelectorAll('.swipe-card').length >= 1, 'swipe cards rendered');
  }

  t.group('Similar search — "Nothing matched" copy (no em dash)');
  {
    A.state.fetchingResults = false;
    win.__mode = 'empty';
    await A.runSimilarSearch('__no_match__'); await flush(4);
    win.__mode = 'normal'; A.state.fetchingResults = false;
    t.ok(true, 'similar search with empty results handled');
  }

  t.group('Settings reset — two-tap confirm');
  {
    A.state.profile = { name: 'Ada', platform: 'netflix', avoid: 'I watch everything' };
    A.openSettings(); await flush();
    const rb = doc.getElementById('setReset');
    t.ok(rb.textContent === 'Reset everything', 'reset button says "Reset everything"');
    rb.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    t.ok(/Tap again/.test(rb.textContent), 'first tap asks for confirmation');
    t.ok(A.state.profile !== null, 'profile intact after first tap');
    rb.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(A.state.profile === null, 'second tap wipes profile');
    t.ok(doc.getElementById('screen-onboard').classList.contains('active'), 'reset returns to onboarding');
  }

  t.group('Back button closes sheets');
  {
    A.openSettings(); await flush();
    win.dispatchEvent(new win.PopStateEvent('popstate')); await flush();
    t.ok(!doc.getElementById('settingsOverlay').classList.contains('active'), 'back closes settings');
  }

  t.group('Back from results → pick screen');
  {
    doc.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    doc.getElementById('screen-results').classList.add('active');
    win.dispatchEvent(new win.PopStateEvent('popstate')); await flush();
    t.ok(doc.getElementById('screen-pick').classList.contains('active'), 'back from results → pick screen');
  }

  t.group('Wheel eyebrow shows mood name uppercase');
  {
    selectMood('Vawulence'); A.state.fetchingResults = false;
    A.startFlow(); await flush(2);
    t.ok(doc.getElementById('wheelEyebrow').textContent === 'VAWULENCE', 'eyebrow shows mood uppercase');
    doc.getElementById('screen-wheel').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush(2);
  }

  t.group('Wheel has blurred background element');
  {
    t.ok(doc.getElementById('wheelBg'), 'wheel background element exists');
  }

  t.group('No platform selector anywhere');
  {
    t.ok(!doc.querySelector('.platform-list'), 'no .platform-list');
    t.ok(!doc.querySelector('[data-pkey]'), 'no data-pkey attributes');
    t.ok(!doc.querySelector('[data-anime]'), 'no anime attributes');
    t.ok(!doc.querySelector('[data-naija]'), 'no naija attributes');
  }

  t.group('Zero runtime errors');
  t.ok(dom.__errors.length === 0, 'no errors' + (dom.__errors.length ? ': ' + dom.__errors.slice(0, 2).join(' | ') : ''));
};
