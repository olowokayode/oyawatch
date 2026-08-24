const { makeDom, flush } = require('./helpers');

module.exports = async (t) => {
  t.group('Crunchyroll and YouTube removed from DOM');
  {
    const dom = await makeDom(); const doc = dom.window.document;
    t.ok(!/crunchyroll/i.test(doc.documentElement.innerHTML), 'no Crunchyroll reference');
    t.ok(!doc.querySelector('[data-pkey="crunchyroll"]'), 'no crunchyroll data attribute');
    t.ok(!doc.querySelector('[data-pkey="youtube"]'), 'no youtube data attribute');
  }

  t.group('Anime and naija modes removed');
  {
    const dom = await makeDom(); const doc = dom.window.document;
    t.ok(!doc.querySelector('[data-anime]'), 'no anime card attribute');
    t.ok(!doc.querySelector('[data-naija]'), 'no naija card attribute');
    const pickHTML = doc.getElementById('screen-pick').innerHTML;
    t.ok(!/\bnaija\b/i.test(pickHTML) || /data-mood="Naija"/i.test(pickHTML) === false, 'no naija mode cards');
  }

  t.group('Swipe stack — not vertical scroll list');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document, A = win.__app; await flush();
    A.state.profile = { name: 'Ada', platform: 'netflix' };
    A.state.currentMode = 'movies';
    A.state.selectedMood = 'No Wahala';
    A.state.selectedCard = doc.querySelector('.mood-card[data-mood="No Wahala"]');
    A.state.allPicks = [
      { id: 101, title: 'Film A', overview: 'Great.', vote_average: 8, vote_count: 300, poster_path: null, mediaType: 'movie', verified: true },
      { id: 102, title: 'Film B', overview: 'Also great.', vote_average: 7.5, vote_count: 250, poster_path: null, mediaType: 'movie', verified: true },
    ];
    A.state.pickIdx = 0;
    A.renderSwipeStack(); await flush();
    t.ok(doc.getElementById('swipeStage'), 'swipe-stage element exists');
    t.ok(doc.getElementById('swipeCardWrap'), 'swipe card wrap exists');
    t.ok(!doc.getElementById('picksList'), 'old picksList element gone');
    t.ok(!doc.getElementById('showMoreBtn'), 'no show-more button (replaced by swipe)');
    const cards = doc.querySelectorAll('.swipe-card');
    t.ok(cards.length >= 1, 'swipe cards present');
  }

  t.group('Long-press peek present on all mood cards');
  {
    const dom = await makeDom(); const doc = dom.window.document;
    const cards = doc.querySelectorAll('.mood-card');
    let allHavePeek = true;
    cards.forEach(c => { if (!c.querySelector('.card-peek')) allHavePeek = false; });
    t.ok(allHavePeek, 'every mood card has .card-peek element');
    const withTitles = [...cards].filter(c => c.querySelector('.peek-title'));
    t.ok(withTitles.length >= 6, 'at least 6 cards have peek titles populated');
  }

  t.group('Verdict copy — no star HTML');
  {
    const dom = await makeDom(); const win = dom.window, A = win.__app; await flush();
    A.state.profile = { name: 'Test', platform: 'netflix' };
    A.state.allPicks = [{ id: 200, title: 'Test', overview: 'A test.', vote_average: 9.1, vote_count: 500, poster_path: null, mediaType: 'movie', verified: true }];
    A.state.pickIdx = 0;
    A.renderSwipeStack(); await flush();
    const html = win.document.getElementById('swipeCardWrap').innerHTML;
    t.ok(!/★|☆/.test(html), 'no star glyphs in swipe cards');
    t.ok(/rewatch/i.test(html), 'rewatch verdict shown for 9.1');
  }

  t.group('Watchlist sheet accessible from badge');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document, A = win.__app; await flush();
    A.state.watchlist = [];
    A.addToWatchlist({ id: 777, title: 'Save This', mediaType: 'movie', poster_path: null, release_date: '2023-01-01' });
    t.ok(doc.getElementById('wlBadge').classList.contains('visible'), 'badge visible after save');
    doc.getElementById('wlBadge').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(doc.getElementById('wlOverlay').classList.contains('active'), 'watchlist sheet opens on badge click');
    t.ok(/Save This/.test(doc.getElementById('wlItems').innerHTML), 'saved title appears in watchlist sheet');
  }

  t.group('No runtime errors with TV swipe stack');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document, A = win.__app; await flush();
    A.state.profile = { name: 'Ada', platform: 'netflix' };
    A.state.currentMode = 'tv';
    const tvCard = doc.querySelector('#tvGrid .mood-card');
    t.ok(!!tvCard, 'TV mood card exists');
    A.state.selectedMood = tvCard.dataset.mood;
    A.state.selectedCard = tvCard;
    win.__fetches = [];
    const pool = await A.fetchTMDB();
    t.ok(pool.length > 0, 'TV fetchTMDB returns results');
    t.ok(win.__fetches.some(u => u.includes('/discover/tv')), 'TV mode queries /discover/tv');
    t.ok(dom.__errors.length === 0, 'no errors during TV fetch');
  }
};
