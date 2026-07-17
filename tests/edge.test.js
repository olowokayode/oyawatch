const { makeDom, flush } = require('./helpers');

module.exports = async (t) => {
  const dom = await makeDom({ languages: ['en-NG'] });
  const win = dom.window, doc = win.document, A = win.__app;
  await flush();

  const setMood = (sel) => { const c = doc.querySelector(sel); A.state.selectedMood = c.dataset.mood; A.state.selectedCard = c; A.state.currentMode = c.dataset.anime ? 'anime' : 'movies'; };

  t.group('tmdbGet session caching');
  {
    win.__fetches = []; await A.tmdbGet('/movie/424242'); await A.tmdbGet('/movie/424242');
    const n = win.__fetches.filter((u) => u.includes('/movie/424242')).length;
    t.ok(n === 1, 'identical tmdbGet call hits network once (' + n + ')');
  }

  t.group('Empty results -> graceful error');
  {
    A.state.profile = { name: 'Ada', platform: 'netflix' }; A.applyPlatformFromProfile();
    A.state.currentMode = 'movies'; setMood('#moviesGrid .mood-card[data-mood="Dey Play"]');
    win.__mode = 'empty'; A.state.fetchingResults = false;
    A.startFlow(); await flush(2);
    doc.getElementById('screen-wheel').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(/error-box/.test(doc.getElementById('resultsScroll').innerHTML), 'empty pool shows error box');
    t.ok(/Nothing matched/.test(doc.getElementById('resultsScroll').innerHTML), 'error copy is "Nothing matched"');
    win.__mode = 'normal';
  }

  t.group('Network reject during spin -> handled');
  {
    setMood('#moviesGrid .mood-card[data-mood="Dey Play"]');
    win.__mode = 'reject'; A.state.fetchingResults = false;
    A.startFlow(); await flush(2);
    doc.getElementById('screen-wheel').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(/error-box/.test(doc.getElementById('resultsScroll').innerHTML), 'network failure shows an error box (no crash)');
    win.__mode = 'normal'; A.state.fetchingResults = false;
  }

  t.group('Anime provider labelling (Crunchyroll + region fallback)');
  {
    A.state.activePlatformIds = [283, 8]; A.state.region = 'NG';
    A.renderPicks([
      { id: 112, title: 'AnimeCR', overview: 'Great one twelve. A series that earns its runtime and rewards the viewer nicely here now.', vote_average: 8, vote_count: 400, poster_path: '/p.jpg', mediaType: 'tv', verified: false },
      { id: 111, title: 'AnimeNF', overview: 'Great one eleven. A series that earns its runtime and rewards the viewer nicely here now ok.', vote_average: 8, vote_count: 400, poster_path: '/p.jpg', mediaType: 'tv', verified: false },
      { id: 9003, title: 'RegionFallback', overview: 'Great nine thousand three. A series that earns its runtime and rewards viewers here now.', vote_average: 8, vote_count: 400, poster_path: '/p.jpg', mediaType: 'tv', verified: false },
    ]); await flush();
    t.ok(/Watch on Crunchyroll/.test(doc.getElementById('card0').querySelector('.watch-label').textContent), 'on Crunchyroll -> "Watch on Crunchyroll"');
    t.ok(/Watch on Netflix/.test(doc.getElementById('card1').querySelector('.watch-label').textContent), 'on Netflix (anime mode) -> "Watch on Netflix"');
    t.ok(/Watch on Netflix/.test(doc.getElementById('card2').querySelector('.watch-label').textContent), 'region-only-US providers resolved via US fallback');
    A.state.activePlatformIds = [8];
  }

  t.group('Share + Copy actions');
  {
    A.renderPicks([{ id: 500, title: 'ShareMe', overview: 'Great five hundred. A film that earns its runtime and rewards the viewer nicely here now.', vote_average: 9, vote_count: 400, poster_path: '/p.jpg', mediaType: 'movie', verified: true }]); await flush();
    win.__shared = null;
    doc.getElementById('card0').querySelector('.btn-share').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(win.__shared && /ShareMe/.test(win.__shared.text), 'Share button invokes navigator.share with title');
    t.ok(/\/5 stars/.test(win.__shared.text), 'share text uses star rating, not IMDb');
    doc.getElementById('card0').querySelector('.btn-copy').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(doc.getElementById('toast').classList.contains('show'), 'Copy title shows a confirmation toast');
  }

  t.group('starsHTML with missing rating');
  {
    const h = A.starsHTML(undefined);
    t.ok(/Not yet rated/.test(h), 'undefined rating -> "Not yet rated" label');
    t.ok(/width:0\.0%/.test(h), 'undefined rating -> 0% fill');
    t.ok(h.includes('\u2014'), 'undefined rating shows dash');
  }

  t.group('Respin re-runs the flow');
  {
    setMood('#moviesGrid .mood-card[data-mood="Dey Play"]'); A.state.fetchingResults = false;
    A.startFlow(); await flush(2);
    doc.getElementById('screen-wheel').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(doc.getElementById('screen-results').classList.contains('active'), 'reached results');
    A.state.fetchingResults = false;
    doc.getElementById('btnRespin').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush(2);
    t.ok(doc.getElementById('screen-wheel').classList.contains('active'), '"Spin again" restarts the spin');
    doc.getElementById('screen-wheel').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(doc.getElementById('screen-results').classList.contains('active'), 'respin returns to results');
  }

  t.group('Back button behaviour (popstate)');
  {
    A.openSettings(); await flush();
    t.ok(doc.getElementById('settingsOverlay').classList.contains('active'), 'settings opened');
    win.dispatchEvent(new win.PopStateEvent('popstate')); await flush();
    t.ok(!doc.getElementById('settingsOverlay').classList.contains('active'), 'back closes settings sheet');
    doc.querySelectorAll('.screen').forEach((x) => x.classList.remove('active'));
    doc.getElementById('screen-results').classList.add('active');
    win.dispatchEvent(new win.PopStateEvent('popstate')); await flush();
    t.ok(doc.getElementById('screen-pick').classList.contains('active'), 'back from results returns to pick screen');
  }

  t.group('Settings reset (two-tap confirm)');
  {
    A.state.profile = { name: 'Ada', platform: 'netflix', avoid: 'I watch everything' };
    A.openSettings(); await flush();
    const rb = doc.getElementById('setReset');
    rb.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    t.ok(/Tap again/.test(rb.textContent), 'first reset tap asks for confirmation');
    t.ok(A.state.profile !== null, 'profile intact after first tap');
    rb.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(A.state.profile === null, 'second tap wipes the profile');
    t.ok(doc.getElementById('screen-onboard').classList.contains('active'), 'reset returns to onboarding');
  }

  t.group('No silent runtime errors');
  t.ok(dom.__errors.length === 0, 'zero window/console errors' + (dom.__errors.length ? ': ' + dom.__errors.slice(0, 3).join(' | ') : ''));
};
