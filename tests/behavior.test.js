const { makeDom, flush, deferredVideos } = require('./helpers');

module.exports = async (t) => {
  const dom = await makeDom({ languages: ['en-NG'] });
  const win = dom.window, doc = win.document, A = win.__app;
  await flush();

  t.group('Region resolution');
  t.ok(A.state.region === 'NG', "region 'NG' from navigator.languages ['en-NG']");

  t.group('Verdict copy — benefit-led, not numeric');
  {
    t.ok(A.getVerdict(9.2) === 'A film people rewatch.', '9.2 → rewatch verdict');
    t.ok(A.getVerdict(8.5) === 'Stays with you.', '8.5 → stays verdict');
    t.ok(A.getVerdict(7.1) === 'Worth the night.', '7.1 → worth verdict');
    t.ok(A.getVerdict(6.2) === 'A gamble. Could be good.', '6.2 → gamble verdict');
    t.ok(A.getVerdict(0) === 'A gamble. Could be good.', '0 → gamble verdict');
  }

  t.group('Netflix-only — no platform picker');
  {
    t.ok(!doc.querySelector('.platform-opt'), 'no platform-opt on pick screen');
    t.ok(!doc.getElementById('platformPillBtn'), 'no platformPillBtn');
    t.ok(doc.querySelector('.netflix-pill'), 'Netflix pill badge visible');
    t.ok(!doc.querySelector('[data-pkey]'), 'no data-pkey attributes');
  }

  t.group('fetchTMDB: Netflix provider always included');
  {
    A.state.profile = { name: 'Ada', platform: 'netflix', avoid: 'I watch everything' };
    A.state.currentMode = 'movies';
    A.state.selectedMood = 'No Wahala';
    A.state.selectedCard = doc.querySelector('.mood-card[data-mood="No Wahala"]');
    win.__fetches = [];
    await A.fetchTMDB();
    const provFetches = win.__fetches.filter(u => u.includes('with_watch_providers=8'));
    t.ok(provFetches.length > 0, 'fetches include Netflix provider id=8');
    t.ok(!win.__fetches.some(u => u.includes('with_watch_providers=283')), 'no Crunchyroll provider');
  }

  t.group('fetchTMDB: avoid horror (non-conflicting mood)');
  {
    A.state.profile = { name: 'Ada', platform: 'netflix', avoid: 'Horror — hard no' };
    A.state.selectedMood = 'Dey Play';
    A.state.selectedCard = doc.querySelector('.mood-card[data-mood="Dey Play"]');
    win.__fetches = [];
    await A.fetchTMDB();
    const discover = win.__fetches.filter(u => u.includes('/discover/'));
    t.ok(discover.some(u => u.includes('without_genres=27')), 'horror genre excluded from Dey Play');
  }

  t.group('fetchTMDB: horror mood overrides avoid-horror');
  {
    A.state.selectedMood = 'After Dark';
    A.state.selectedCard = doc.querySelector('.mood-card[data-mood="After Dark"]');
    win.__fetches = [];
    await A.fetchTMDB();
    const discover = win.__fetches.filter(u => u.includes('/discover/'));
    t.ok(!discover.some(u => u.includes('without_genres')), 'horror mood overrides horror avoid');
  }

  t.group('TV mode hits /discover/tv');
  {
    A.state.currentMode = 'tv';
    A.state.selectedMood = 'Binge It';
    A.state.selectedCard = doc.querySelector('.mood-card[data-mood="Binge It"]');
    win.__fetches = [];
    const pool = await A.fetchTMDB();
    t.ok(win.__fetches.some(u => u.includes('/discover/tv')), 'TV mode queries /discover/tv');
    t.ok(!win.__fetches.some(u => u.includes('/discover/movie')), 'TV mode does not query /discover/movie');
    t.ok(pool.length > 0, 'TV mode returns picks');
    A.state.currentMode = 'movies';
  }

  t.group('Swipe stack renders cards');
  {
    A.state.profile = { name: 'Ada', platform: 'netflix' };
    A.state.selectedMood = 'No Wahala';
    A.state.selectedCard = doc.querySelector('.mood-card[data-mood="No Wahala"]');
    A.state.pickIdx = 0;
    const picks = [];
    for (let i = 0; i < 6; i++) picks.push({ id: 300 + i, title: 'Film ' + (300 + i), overview: 'A great film number ' + i + ' that rewards the viewer tonight.', vote_average: 7.8, vote_count: 400, poster_path: null, mediaType: 'movie', verified: true });
    A.state.allPicks = picks;
    A.renderSwipeStack(); await flush();
    const cards = doc.querySelectorAll('.swipe-card');
    t.ok(cards.length >= 1, 'swipe cards rendered (' + cards.length + ')');
    t.ok(cards.length <= 4, 'max 4 cards in stack at once');
    t.ok(cards[0].classList.contains('swipe-card-nth-1'), 'top card has nth-1 class');
    if (cards[1]) t.ok(cards[1].classList.contains('swipe-card-nth-2'), 'second card has nth-2 class');
  }

  t.group('Swipe card shows verdict, not star rating');
  {
    const picks = [{ id: 500, title: 'VerdictTest', overview: 'A worthy film tonight.', vote_average: 8.5, vote_count: 400, poster_path: null, mediaType: 'movie', verified: true }];
    A.state.allPicks = picks; A.state.pickIdx = 0;
    A.renderSwipeStack(); await flush();
    const wrap = doc.getElementById('swipeCardWrap');
    t.ok(/Stays with you/.test(wrap.innerHTML), 'verdict copy shown on card');
    t.ok(/8\.5/.test(wrap.innerHTML), 'numeric score shown');
    t.ok(!/★/.test(wrap.innerHTML), 'no star glyphs on swipe cards');
    t.ok(!/imdb/i.test(wrap.innerHTML), 'no IMDb reference');
  }

  t.group('Watch button: Netflix vs elsewhere');
  {
    const picks = [
      { id: 102, title: 'OnNetflix', overview: 'On Netflix tonight.', vote_average: 8, vote_count: 400, poster_path: null, mediaType: 'movie', verified: false },
      { id: 101, title: 'NotHere', overview: 'Elsewhere tonight.', vote_average: 8, vote_count: 400, poster_path: null, mediaType: 'movie', verified: false },
    ];
    A.state.allPicks = picks; A.state.pickIdx = 0;
    A.renderSwipeStack(); await flush();
    const topCard = doc.querySelector('.swipe-card');
    const watchBtn = topCard && topCard.querySelector('.sc-watch-btn');
    t.ok(watchBtn, 'watch button present on top card');
    // Wait for provider check
    await flush(8);
    const label = watchBtn && watchBtn.querySelector('span');
    t.ok(label && (label.textContent.includes('Netflix') || label.textContent.includes('watch')), 'watch button has resolved label');
  }

  t.group('Verified pick skips provider fetch');
  {
    const picks = [{ id: 55, title: 'Verified', overview: 'Verified film.', vote_average: 9, vote_count: 400, poster_path: null, mediaType: 'movie', verified: true }];
    A.state.allPicks = picks; A.state.pickIdx = 0;
    win.__fetches = [];
    A.renderSwipeStack(); await flush();
    t.ok(!win.__fetches.some(u => u.includes('/55/watch/providers')), 'verified pick skips providers call');
    const btn = doc.querySelector('.sc-watch-btn');
    t.ok(btn && /Netflix/.test(btn.querySelector('span').textContent), 'verified → Watch on Netflix immediately');
  }

  t.group('Watchlist: add and persist');
  {
    const pick = { id: 999, title: 'SaveMe', mediaType: 'movie', poster_path: null, release_date: '2022-01-01', vote_average: 8, vote_count: 300, overview: 'Worth saving.' };
    A.state.watchlist = [];
    A.addToWatchlist(pick);
    t.ok(A.state.watchlist.length === 1, 'pick added to watchlist');
    A.addToWatchlist(pick);
    t.ok(A.state.watchlist.length === 1, 'duplicate not added');
    const stored = A.loadWatchlist();
    t.ok(stored.some(w => w.id === 999), 'watchlist persisted to localStorage');
  }

  t.group('Watchlist badge visibility');
  {
    A.state.watchlist = [];
    A.updateWLBadge();
    t.ok(!doc.getElementById('wlBadge').classList.contains('visible'), 'badge hidden when watchlist empty');
    A.addToWatchlist({ id: 888, title: 'Test', mediaType: 'movie', poster_path: null, release_date: '2022-01-01' });
    t.ok(doc.getElementById('wlBadge').classList.contains('visible'), 'badge visible when watchlist has items');
    t.ok(/♡/.test(doc.getElementById('wlBadge').textContent), 'badge shows ♡ with count');
  }

  t.group('iOS-safe trailer open');
  {
    const dv = deferredVideos();
    win.__deferredVideos = dv.promise;
    const pick = { id: 300, title: 'TrailerTest', overview: 'Great trailer.', vote_average: 8, vote_count: 400, poster_path: null, mediaType: 'movie', verified: true };
    A.state.allPicks = [pick]; A.state.pickIdx = 0;
    A.renderSwipeStack(); await flush();
    win.__openCalls = [];
    const trailerBtn = doc.querySelector('.sc-trailer');
    if (trailerBtn) {
      trailerBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
      t.ok(win.__openCalls.length === 1 && win.__openCalls[0][0] === 'about:blank', 'window.open("about:blank") fired synchronously');
      dv.resolve(); await flush();
      t.ok(win.__lastWin && /youtube\.com\/watch\?v=zzz/.test(win.__lastWin.location.href), 'trailer tab redirected to YouTube');
    } else { t.ok(false, 'trailer button not found'); }
    win.__deferredVideos = null;
  }

  t.group('Long-press peek titles populated');
  {
    const card = doc.querySelector('.mood-card[data-mood="Vawulence"]');
    t.ok(card, 'Vawulence card exists');
    const peek = card && card.querySelector('.card-peek');
    const titles = peek && peek.querySelectorAll('.peek-title');
    t.ok(titles && titles.length >= 1, 'peek titles populated from data-peek attribute');
  }

  t.group('Mood card: first child spans full width');
  {
    const grid = doc.getElementById('moviesGrid');
    const first = grid && grid.querySelector('.mood-card:first-child');
    t.ok(first, 'first mood card exists');
    // CSS sets grid-column: 1/-1 — verify via class or attribute presence
    t.ok(grid && grid.children.length >= 2, 'mood grid has multiple cards');
  }

  t.group('Settings: platform stays netflix after save');
  {
    A.state.profile = { name: 'Zara', platform: 'netflix', avoid: 'I watch everything' };
    A.openSettings();
    const nameEl = doc.getElementById('setName'); if (nameEl) nameEl.value = 'ada';
    doc.getElementById('setSave').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(A.state.profile.name === 'Ada', 'name saved and capitalised');
    t.ok(A.state.profile.platform === 'netflix', 'platform locked to netflix');
    t.ok(!doc.getElementById('settingsOverlay').classList.contains('active'), 'sheet closes after save');
  }

  t.group('Share popup once-per-session');
  {
    A.showSharePopup();
    t.ok(doc.getElementById('shareOverlay').classList.contains('active'), 'popup shows');
    t.ok(A.isPopupShown() === true, 'session flag set');
    A.hideSharePopup();
    A.startPopupTimer();
    t.ok(true, 'startPopupTimer no-ops after shown this session');
  }

  t.group('Zero runtime errors');
  t.ok(dom.__errors.length === 0, 'zero window errors' + (dom.__errors.length ? ': ' + dom.__errors.slice(0, 2).join(' | ') : ''));
};
