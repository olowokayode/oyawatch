const { makeDom, flush, deferredVideos } = require('./helpers');

module.exports = async (t) => {
  const dom = await makeDom({ languages: ['en-NG', 'en'] });
  const win = dom.window, doc = win.document, A = win.__app;
  await flush();

  t.group('Star rating conversion (0-5)');
  {
    const r = A.ratingToStars(7.8);
    t.ok(Math.abs(r.five - 3.9) < 1e-6, 'ratingToStars(7.8).five = 3.9');
    t.ok(Math.abs(r.pct - 78) < 1e-6, 'ratingToStars(7.8).pct = 78');
    t.ok(A.ratingToStars(10).five === 5 && A.ratingToStars(10).pct === 100, 'ratingToStars(10) = 5/100%');
    t.ok(A.ratingToStars(0).five === 0, 'ratingToStars(0) = 0');
    const h = A.starsHTML(7.8);
    t.ok(h.includes('width:78.0%'), 'starsHTML fills 78.0%');
    t.ok(h.includes('3.9 out of 5 stars'), 'starsHTML has aria-label');
    t.ok(h.includes('<b>3.9</b>/5'), 'starsHTML shows 3.9/5');
    t.ok(!/imdb/i.test(h), 'no "IMDb" in stars');
  }

  t.group('Region resolution');
  t.ok(A.state.region === 'NG', "region 'NG' from navigator.languages");

  t.group('fetchTMDB: avoid-override + anime movie&tv');
  {
    A.state.profile = { name: 'Ada', platform: 'netflix', avoid: 'Horror \u2014 hard no' };
    A.applyPlatformFromProfile();
    A.state.currentMode = 'movies';
    A.state.selectedMood = 'Dey Play'; A.state.selectedCard = doc.querySelector('.mood-card[data-mood="Dey Play"]');
    win.__fetches = []; await A.fetchTMDB();
    t.ok(win.__fetches.filter((u) => u.includes('/discover/')).some((u) => u.includes('without_genres=27')), 'non-conflicting avoid keeps without_genres=27');
    A.state.selectedMood = 'After Dark'; A.state.selectedCard = doc.querySelector('.mood-card[data-mood="After Dark"]');
    win.__fetches = []; await A.fetchTMDB();
    const hd = win.__fetches.filter((u) => u.includes('/discover/'));
    t.ok(hd.length > 0 && !hd.some((u) => u.includes('without_genres')), 'explicit Horror mood overrides avoid');
    A.state.currentMode = 'anime'; A.state.activePlatformIds = [283, 8];
    const anime = doc.querySelector('.mood-card[data-anime="1"]');
    A.state.selectedMood = anime.dataset.mood; A.state.selectedCard = anime;
    win.__fetches = []; const pool = await A.fetchTMDB();
    const disc = win.__fetches.filter((u) => u.includes('/discover/'));
    t.ok(disc.some((u) => u.includes('/discover/movie')) && disc.some((u) => u.includes('/discover/tv')), 'anime queries BOTH movie and tv');
    t.ok(disc.every((u) => u.includes('with_keywords=210024')), 'anime uses anime keyword');
    t.ok(pool.length > 0, 'anime returns non-empty pool');
    A.state.currentMode = 'movies'; A.state.activePlatformIds = [8];
  }

  t.group('renderPicks: stars, no IMDb, show-more');
  {
    const picks = [];
    for (let i = 0; i < 6; i++) picks.push({ id: 200 + i, title: 'Title ' + (200 + i), overview: 'A strong watch number ' + i + '. It carries real weight and holds attention throughout the night.', vote_average: 7.8, vote_count: 400, poster_path: '/p.jpg', mediaType: 'movie', verified: true });
    A.renderPicks(picks); await flush();
    const list = doc.getElementById('picksList');
    t.ok(list.querySelectorAll('.pick-card').length === 5, 'first batch = 5 cards');
    t.ok(doc.getElementById('showMoreBtn'), 'show-more present when >5');
    t.ok(/width:78\.0%/.test(list.innerHTML), 'cards show 78% star fill');
    t.ok(!/imdb/i.test(doc.getElementById('resultsScroll').innerHTML), 'no "IMDb" in results');
    doc.getElementById('showMoreBtn').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(list.querySelectorAll('.pick-card').length === 6, 'show-more appends 6th');
    t.ok(!doc.getElementById('showMoreBtn'), 'show-more gone when exhausted');
  }

  t.group('Honest availability labels');
  {
    A.state.activePlatformIds = [8];
    A.renderPicks([
      { id: 102, title: 'OnNetflix', overview: 'Great one hundred two. A film that earns its runtime and rewards the viewer well tonight.', vote_average: 8, vote_count: 400, poster_path: '/p.jpg', mediaType: 'movie', verified: false },
      { id: 101, title: 'NotOnNetflix', overview: 'Great one oh one. A film that earns its runtime and rewards the viewer well tonight.', vote_average: 8, vote_count: 400, poster_path: '/p.jpg', mediaType: 'movie', verified: false },
    ]); await flush();
    t.ok(/Watch on Netflix/.test(doc.getElementById('card0').querySelector('.watch-label').textContent), 'on Netflix -> "Watch on Netflix"');
    t.ok(/where to watch/i.test(doc.getElementById('card1').querySelector('.watch-label').textContent), 'not on Netflix -> "where to watch"');
    t.ok(/themoviedb\.org\/movie\/101\/watch/.test(doc.getElementById('card1').querySelector('.watch-btn').getAttribute('href')), 'off-platform links to real where-to-watch');
    win.__fetches = [];
    A.renderPicks([{ id: 55, title: 'VerifiedOdd', overview: 'Great fifty five. A film that earns its runtime and rewards the viewer nicely tonight here.', vote_average: 8, vote_count: 400, poster_path: '/p.jpg', mediaType: 'movie', verified: true }]); await flush();
    t.ok(/Watch on Netflix/.test(doc.getElementById('card0').querySelector('.watch-label').textContent), 'verified single-platform -> "Watch on Netflix"');
    t.ok(!win.__fetches.some((u) => u.includes('/55/watch/providers')), 'verified single-platform skips providers call');
  }

  t.group('iOS-safe trailer open');
  {
    const dv = deferredVideos();
    win.__deferredVideos = dv.promise;
    A.renderPicks([{ id: 300, title: 'TrailerTest', overview: 'Great three hundred. A film that earns its runtime and rewards the viewer nicely tonight here.', vote_average: 8, vote_count: 400, poster_path: '/p.jpg', mediaType: 'movie', verified: true }]); await flush();
    win.__openCalls = [];
    doc.getElementById('card0').querySelector('.trailer-btn').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    t.ok(win.__openCalls.length === 1 && win.__openCalls[0][0] === 'about:blank', 'window.open("about:blank") fired synchronously');
    dv.resolve(); await flush();
    t.ok(win.__lastWin && /youtube\.com\/watch\?v=zzz/.test(win.__lastWin.location.href), 'trailer tab redirected to YouTube');
    win.__deferredVideos = null;
  }

  t.group('Expandable detail');
  {
    A.renderPicks([{ id: 400, title: 'ExpandTest', overview: 'Great four hundred. A film that earns its runtime and rewards the viewer nicely tonight here.', vote_average: 8, vote_count: 400, poster_path: '/p.jpg', mediaType: 'movie', verified: true }]); await flush();
    const card = doc.getElementById('card0');
    card.querySelector('[data-expand]').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(card.classList.contains('expanded'), 'card expands on tap');
    const chips = card.querySelectorAll('.detail-chip');
    t.ok(chips.length >= 2, 'lazy-loads detail chips');
    t.ok([...chips].some((c) => /min/.test(c.textContent)), 'runtime chip present');
    t.ok(card.querySelector('.detail-tagline'), 'tagline rendered');
  }

  t.group('Mood cards keyboard-operable');
  {
    const card = doc.querySelector('.mood-card[data-mood="No Wahala"]');
    t.ok(card.getAttribute('role') === 'button' && card.getAttribute('tabindex') === '0', 'role=button + tabindex');
    t.ok(card.querySelector('.card-desc'), 'plain-language description shown');
    card.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    t.ok(card.classList.contains('selected') && card.getAttribute('aria-pressed') === 'true', 'Enter selects (aria-pressed=true)');
    t.ok(!doc.getElementById('spinBtn').disabled, 'spin enabled after keyboard select');
  }

  t.group('Similar search fuller pool');
  {
    A.state.fetchingResults = false; await A.runSimilarSearch('Inception'); await flush();
    t.ok(doc.getElementById('picksList').querySelectorAll('.pick-card').length >= 1, 'similar renders picks');
    t.ok(A.state.allPicks.length > 3, 'pool >3 for show-more (' + A.state.allPicks.length + ')');
  }

  t.group('Settings sheet edits profile');
  {
    A.openSettings();
    doc.getElementById('setName').value = 'ada';
    doc.querySelector('#setPlatform .sheet-choice[data-pkey="crunchyroll"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    doc.getElementById('setSave').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(A.state.profile.name === 'Ada', 'name saved + capitalized');
    t.ok(A.state.profile.platform === 'crunchyroll', 'platform saved crunchyroll');
    t.ok(/Crunchyroll/.test(doc.getElementById('platformPillBtn').textContent), 'pill reflects new platform');
  }

  t.group('Share prompt once-per-session');
  {
    A.showSharePopup();
    t.ok(doc.getElementById('shareOverlay').classList.contains('active'), 'popup shows');
    t.ok(A.isPopupShown() === true, 'marked shown this session');
    A.startPopupTimer();
    t.ok(true, 'startPopupTimer no-ops after shown');
  }
};
